#!/usr/bin/env python3
"""Build BridgePoint's hosted Tokai Maru / ISRO photogrammetry point cloud.

Only the ISRO COLMAP points3D.bin member and its small depth calibration file
are extracted from Zenodo's 3 GB Abyssal ZIP via HTTP byte ranges. The depth_any
maps are counted and retained as source provenance; the BridgePoint GLB renders
the colorized multi-view COLMAP reconstruction as native 3D points.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import math
import re
import struct
import urllib.request
import zipfile
from pathlib import Path

RECORD_ID = "21824088"
RECORD_TITLE = "Abyssal: A Large-scale Underwater 3D Reconstruction Dataset"
ARCHIVE_URL = f"https://zenodo.org/api/records/{RECORD_ID}/files/Abyssal.zip/content"
POINTS_MEMBER = "ISRO/train/sparse/0/points3D.bin"
DEPTH_PARAMS_MEMBER = "ISRO/train/sparse/0/depth_params.json"
DEPTH_PREFIX = "ISRO/train/depth_any/"
IMAGE_PREFIXES = ("ISRO/train/images/", "ISRO/val/images/")
MIN_SOURCE_POINTS = 200_000
MAX_POINTS_MEMBER = 180 * 1024 * 1024
MAX_COMPRESSED_ASSET = 64 * 1024 * 1024
USER_AGENT = "BridgePoint-Plane-Wrecks/1.0 (+https://bridgepointintelligence.online)"


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": USER_AGENT,
    })
    with urllib.request.urlopen(request, timeout=45) as response:
        value = json.loads(response.read().decode("utf-8"))
    if not isinstance(value, dict):
        raise SystemExit("Zenodo returned invalid dataset metadata")
    return value


def fetch_range(url: str, start: int, end: int) -> tuple[bytes, int]:
    request = urllib.request.Request(url, headers={
        "User-Agent": USER_AGENT,
        "Range": f"bytes={start}-{end}",
        "Accept-Encoding": "identity",
    })
    with urllib.request.urlopen(request, timeout=180) as response:
        if response.status != 206:
            raise SystemExit(
                f"Zenodo did not honor the byte-range request (HTTP {response.status}); "
                "refusing to download the complete 3 GB archive"
            )
        match = re.fullmatch(
            r"bytes (\d+)-(\d+)/(\d+)",
            response.headers.get("Content-Range", ""),
        )
        if not match:
            raise SystemExit("Zenodo returned an invalid Content-Range header")
        actual_start, actual_end, total = map(int, match.groups())
        if actual_start != start or actual_end < end or actual_end >= total:
            raise SystemExit(f"Unexpected Content-Range: {response.headers.get('Content-Range')}")
        payload = response.read(end - start + 2)
    if len(payload) != end - start + 1:
        raise SystemExit("Short response while reading the Zenodo archive")
    return payload, total


class HttpRangeReader(io.RawIOBase):
    """Seekable ZIP reader backed by bounded 8 MiB HTTP ranges."""
    def __init__(self, url: str, block_size: int = 8 * 1024 * 1024):
        self.url = url
        self.block_size = block_size
        self.position = 0
        self.cache_start = -1
        self.cache_data = b""
        _, self.total_size = fetch_range(url, 0, 0)

    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.position

    def seek(self, offset, whence=io.SEEK_SET):
        if whence == io.SEEK_SET:
            new = offset
        elif whence == io.SEEK_CUR:
            new = self.position + offset
        elif whence == io.SEEK_END:
            new = self.total_size + offset
        else:
            raise ValueError("invalid seek origin")
        if new < 0:
            raise ValueError("negative seek")
        self.position = new
        return new

    def read(self, size=-1):
        if size is None or size < 0:
            size = self.total_size - self.position
        size = min(size, self.total_size - self.position)
        if size <= 0:
            return b""
        parts = []
        remaining = size
        while remaining:
            cache_end = self.cache_start + len(self.cache_data)
            if not (self.cache_start <= self.position < cache_end):
                start = (self.position // self.block_size) * self.block_size
                end = min(self.total_size, start + self.block_size) - 1
                self.cache_data, _ = fetch_range(self.url, start, end)
                self.cache_start = start
            offset = self.position - self.cache_start
            count = min(remaining, len(self.cache_data) - offset)
            if count <= 0:
                break
            parts.append(self.cache_data[offset:offset + count])
            self.position += count
            remaining -= count
        return b"".join(parts)


def parse_colmap_points(payload: bytes):
    """Parse COLMAP's little-endian points3D.bin and retain stable multi-view points."""
    if len(payload) < 8:
        raise SystemExit("ISRO COLMAP point file is truncated")
    point_count = struct.unpack_from("<Q", payload, 0)[0]
    if point_count < MIN_SOURCE_POINTS:
        raise SystemExit(f"ISRO reconstruction is unexpectedly small ({point_count} points)")
    offset = 8
    positions = []
    colors = []
    tracks_total = 0
    maximum_error = 0.0
    for index in range(point_count):
        if offset + 51 > len(payload):
            raise SystemExit(f"Truncated ISRO COLMAP point record {index}")
        offset += 8  # point3D_id
        x, y, z = struct.unpack_from("<ddd", payload, offset)
        offset += 24
        red, green, blue = struct.unpack_from("<BBB", payload, offset)
        offset += 3
        error = struct.unpack_from("<d", payload, offset)[0]
        offset += 8
        track_length = struct.unpack_from("<Q", payload, offset)[0]
        offset += 8
        track_bytes = track_length * 8
        if offset + track_bytes > len(payload):
            raise SystemExit(f"Truncated ISRO COLMAP track at point {index}")
        offset += track_bytes
        if not all(math.isfinite(v) for v in (x, y, z, error)):
            continue
        # Retain points supported by multiple photographs and low reprojection error.
        if track_length < 2 or error > 8.0:
            continue
        positions.append((x, y, z))
        colors.append((red, green, blue))
        tracks_total += track_length
        maximum_error = max(maximum_error, error)
    if offset != len(payload):
        raise SystemExit(f"Unexpected trailing bytes in ISRO point file: {len(payload)-offset}")
    if len(positions) < MIN_SOURCE_POINTS:
        raise SystemExit(f"Too few stable ISRO reconstruction points remain ({len(positions)})")
    return positions, colors, {
        "sourcePointCount": point_count,
        "renderedPointCount": len(positions),
        "meanTrackLength": tracks_total / max(1, len(positions)),
        "maximumReprojectionError": maximum_error,
    }


def align4(data: bytes) -> bytes:
    return data + b"\0" * ((-len(data)) % 4)


def create_points_glb(positions, colors) -> bytes:
    if not positions or len(positions) != len(colors):
        raise SystemExit("Tokai Maru point-cloud attributes are empty or mismatched")
    minima = [min(point[axis] for point in positions) for axis in range(3)]
    maxima = [max(point[axis] for point in positions) for axis in range(3)]
    center = [(minima[i] + maxima[i]) / 2 for i in range(3)]
    centered = [
        (point[0] - center[0], point[1] - center[1], point[2] - center[2])
        for point in positions
    ]
    centered_min = [min(point[axis] for point in centered) for axis in range(3)]
    centered_max = [max(point[axis] for point in centered) for axis in range(3)]

    position_bytes = bytearray()
    for point in centered:
        position_bytes.extend(struct.pack("<fff", *point))
    color_bytes = bytearray()
    for color in colors:
        color_bytes.extend(struct.pack("<BBB", *color))
    binary = align4(bytes(position_bytes)) + align4(bytes(color_bytes))
    color_offset = len(align4(bytes(position_bytes)))
    document = {
        "asset": {
            "version": "2.0",
            "generator": "BridgePoint Tokai Maru ISRO COLMAP photogrammetry conversion",
            "copyright": "Haoran Wang, Nantheera Anantrasirichai and Brett Seymour; CC BY 4.0",
            "extras": {
                "sourceRecord": f"https://zenodo.org/records/{RECORD_ID}",
                "sourceMember": POINTS_MEMBER,
                "depthMaps": "ISRO/train/depth_any/*.png",
                "representation": "colorized COLMAP photogrammetry point cloud; not a closed textured hull mesh",
            },
        },
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "Tokai Maru underwater photogrammetry points"}],
        "meshes": [{
            "name": "Tokai Maru ISRO COLMAP reconstruction point cloud",
            "primitives": [{
                "attributes": {"POSITION": 0, "COLOR_0": 1},
                "material": 0,
                "mode": 0,
            }],
        }],
        "materials": [{
            "name": "Source RGB photogrammetry points",
            "pbrMetallicRoughness": {
                "baseColorFactor": [1.0, 1.0, 1.0, 1.0],
                "metallicFactor": 0.0,
                "roughnessFactor": 1.0,
            },
            "doubleSided": True,
        }],
        "buffers": [{"byteLength": len(binary)}],
        "bufferViews": [
            {"buffer": 0, "byteOffset": 0, "byteLength": len(position_bytes), "target": 34962},
            {"buffer": 0, "byteOffset": color_offset, "byteLength": len(color_bytes), "target": 34962},
        ],
        "accessors": [
            {
                "bufferView": 0, "byteOffset": 0, "componentType": 5126,
                "count": len(centered), "type": "VEC3",
                "min": centered_min, "max": centered_max,
            },
            {
                "bufferView": 1, "byteOffset": 0, "componentType": 5121,
                "count": len(colors), "type": "VEC3", "normalized": True,
            },
        ],
    }
    json_chunk = json.dumps(document, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    json_chunk += b" " * ((-len(json_chunk)) % 4)
    binary_chunk = align4(binary)
    total_length = 12 + 8 + len(json_chunk) + 8 + len(binary_chunk)
    return (
        struct.pack("<4sII", b"glTF", 2, total_length)
        + struct.pack("<I4s", len(json_chunk), b"JSON") + json_chunk
        + struct.pack("<I4s", len(binary_chunk), b"BIN\0") + binary_chunk
    )


def build(output: Path) -> dict:
    record = fetch_json(f"https://zenodo.org/api/records/{RECORD_ID}")
    metadata = record.get("metadata") or {}
    if metadata.get("title") != RECORD_TITLE:
        raise SystemExit("Zenodo Abyssal dataset title changed; refusing to mirror")
    license_data = metadata.get("license") or {}
    license_id = license_data.get("id") if isinstance(license_data, dict) else str(license_data)
    if str(license_id).lower() != "cc-by-4.0":
        raise SystemExit(f"Tokai Maru source licence is not CC BY 4.0: {license_id!r}")
    archive_entry = next(
        (item for item in (record.get("files") or []) if item.get("key") == "Abyssal.zip"),
        None,
    )
    if not archive_entry:
        raise SystemExit("Zenodo Abyssal.zip archive is missing")
    creators = [item.get("name") for item in metadata.get("creators") or [] if item.get("name")]

    with HttpRangeReader(ARCHIVE_URL) as remote:
        with zipfile.ZipFile(remote) as archive:
            info = archive.getinfo(POINTS_MEMBER)
            if info.file_size <= 0 or info.file_size > MAX_POINTS_MEMBER:
                raise SystemExit("ISRO COLMAP points member is outside the approved extraction limit")
            params_info = archive.getinfo(DEPTH_PARAMS_MEMBER)
            params = json.loads(archive.read(params_info.filename).decode("utf-8"))
            if not isinstance(params, dict):
                raise SystemExit("ISRO depth calibration metadata is not a JSON object")
            depth_map_count = sum(1 for item in archive.infolist() if item.filename.startswith(DEPTH_PREFIX) and item.filename.lower().endswith(".png"))
            if depth_map_count < 1000:
                raise SystemExit(f"ISRO Depth Anything companion data is incomplete ({depth_map_count} maps)")
            photo_count = sum(
                1 for item in archive.infolist()
                if item.filename.startswith(IMAGE_PREFIXES) and Path(item.filename).suffix.lower() in {".jpg", ".jpeg", ".png"}
            )
            source = archive.read(POINTS_MEMBER)
    if len(source) != info.file_size:
        raise SystemExit("ISRO COLMAP points member size mismatch")
    positions, colors, statistics = parse_colmap_points(source)
    raw_glb = create_points_glb(positions, colors)
    if raw_glb[:4] != b"glTF" or struct.unpack_from("<I", raw_glb, 8)[0] != len(raw_glb):
        raise SystemExit("Tokai Maru GLB failed binary glTF validation")

    output.mkdir(parents=True, exist_ok=True)
    target = output / "tokai-maru-apra-harbor-photogrammetry.glb.gz"
    with target.open("wb") as handle:
        with gzip.GzipFile(filename="", mode="wb", fileobj=handle, compresslevel=9, mtime=0) as packed:
            packed.write(raw_glb)
    if target.stat().st_size > MAX_COMPRESSED_ASSET:
        target.unlink(missing_ok=True)
        raise SystemExit(f"Tokai Maru compressed GLB exceeds {MAX_COMPRESSED_ASSET} bytes")
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    manifest = {
        "version": 1,
        "id": "tokai-maru-apra-harbor",
        "name": "Tokai Maru — Apra Harbor, Guam",
        "vessel": "Japanese passenger-cargo freighter",
        "location": "Apra Harbor, Guam, United States",
        "coordinates": [144.65596, 13.45905],
        "approximateDepthM": 12.8,
        "lostDate": "1943-08-27",
        "sourcePhotos": photo_count,
        "depthMapCount": depth_map_count,
        "sourcePointCount": statistics["sourcePointCount"],
        "renderedPointCount": statistics["renderedPointCount"],
        "meanTrackLength": statistics["meanTrackLength"],
        "maximumReprojectionError": statistics["maximumReprojectionError"],
        "sourceBytes": len(source),
        "glbBytes": len(raw_glb),
        "compressedBytes": target.stat().st_size,
        "sourceMember": POINTS_MEMBER,
        "depthParamsMember": DEPTH_PARAMS_MEMBER,
        "sourceDataset": RECORD_TITLE,
        "datasetUrl": f"https://zenodo.org/records/{RECORD_ID}",
        "doi": f"10.5281/zenodo.{RECORD_ID}",
        "license": "CC BY 4.0",
        "creators": creators,
        "assetUrl": "/assets/plane-wrecks/extra/tokai-maru-apra-harbor-photogrammetry.glb.gz",
        "assetSha256": digest,
        "representation": "BridgePoint-hosted colorized COLMAP photogrammetry point cloud; not a closed textured hull mesh",
        "companionDepthMaps": "ISRO/train/depth_any/*.png",
        "depthCalibration": "ISRO/train/sparse/0/depth_params.json",
    }
    (output / "tokai-maru-apra-harbor.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print("BRIDGEPOINT_TOKAI_MARU_READY", json.dumps({
        key: manifest[key] for key in (
            "sourcePhotos", "depthMapCount", "sourcePointCount",
            "renderedPointCount", "compressedBytes", "license", "assetSha256",
        )
    }))
    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("assets/plane-wrecks/extra"))
    args = parser.parse_args()
    build(args.output)


if __name__ == "__main__":
    main()
