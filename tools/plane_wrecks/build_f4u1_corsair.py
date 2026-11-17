#!/usr/bin/env python3
"""Build the BridgePoint-hosted F4U-1 Corsair underwater photogrammetry point cloud.

The source is Zenodo record 21824088 (CC BY 4.0). Only the KWAJ COLMAP
points3D.bin member is read from the 3 GB archive using HTTP byte ranges.
The output is a colorized GLB POINTS primitive, not a fabricated watertight mesh.
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
ARCHIVE_URL = f"https://zenodo.org/api/records/{RECORD_ID}/files/Abyssal.zip/content"
EXPECTED_TITLE = "Abyssal: A Large-scale Underwater 3D Reconstruction Dataset"
EXPECTED_LICENSE = "cc-by-4.0"
MEMBER = "KWAJ/train/sparse/0/points3D.bin"
MIN_SOURCE_POINTS = 500_000
MAX_COMPRESSED_ASSET = 32 * 1024 * 1024


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "BridgePoint-Plane-Wrecks/1.0",
    })
    with urllib.request.urlopen(request, timeout=45) as response:
        value = json.loads(response.read().decode("utf-8"))
    if not isinstance(value, dict):
        raise SystemExit("Zenodo returned invalid JSON metadata")
    return value


def fetch_range(url: str, start: int, end: int) -> tuple[bytes, int]:
    request = urllib.request.Request(url, headers={
        "User-Agent": "BridgePoint-Plane-Wrecks/1.0",
        "Range": f"bytes={start}-{end}",
        "Accept-Encoding": "identity",
    })
    with urllib.request.urlopen(request, timeout=180) as response:
        if response.status != 206:
            raise SystemExit(
                f"Zenodo did not honor byte-range request (HTTP {response.status}); "
                "refusing to download the complete archive"
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
        raise SystemExit("Short response while reading the source ZIP")
    return payload, total


class HttpRangeReader(io.RawIOBase):
    """Seekable ZIP reader backed by 8 MiB HTTP byte ranges."""
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
        pieces = []
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
            pieces.append(self.cache_data[offset:offset + count])
            self.position += count
            remaining -= count
        return b"".join(pieces)


def parse_colmap_points(payload: bytes) -> tuple[list[tuple[float, float, float]], list[tuple[int, int, int]], dict]:
    """Parse COLMAP's little-endian points3D.bin records."""
    if len(payload) < 8:
        raise SystemExit("COLMAP points3D.bin is truncated")
    point_count = struct.unpack_from("<Q", payload, 0)[0]
    if point_count < MIN_SOURCE_POINTS:
        raise SystemExit(f"Expected a substantial underwater reconstruction, got {point_count} points")
    offset = 8
    positions: list[tuple[float, float, float]] = []
    colors: list[tuple[int, int, int]] = []
    tracks_total = 0
    max_error = 0.0
    for index in range(point_count):
        if offset + 43 > len(payload):
            raise SystemExit(f"Truncated COLMAP point record {index}")
        _point_id = struct.unpack_from("<Q", payload, offset)[0]
        offset += 8
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
            raise SystemExit(f"Truncated COLMAP track at point {index}")
        offset += track_bytes
        if not all(math.isfinite(v) for v in (x, y, z, error)):
            continue
        # Keep the source's RGB and points seen from multiple images. A
        # moderately permissive error threshold preserves the wreck details.
        if track_length < 2 or error > 8.0:
            continue
        positions.append((x, y, z))
        colors.append((red, green, blue))
        tracks_total += track_length
        max_error = max(max_error, error)
    if offset != len(payload):
        raise SystemExit(f"Unexpected trailing bytes in COLMAP points file: {len(payload)-offset}")
    if len(positions) < MIN_SOURCE_POINTS // 2:
        raise SystemExit(f"Too few stable reconstructed points after filtering: {len(positions)}")
    return positions, colors, {
        "sourcePointCount": point_count,
        "renderedPointCount": len(positions),
        "meanTrackLength": tracks_total / max(1, len(positions)),
        "maximumReprojectionError": max_error,
        "trailingBytes": len(payload) - offset,
    }


def align4(data: bytes) -> bytes:
    return data + b"\0" * ((-len(data)) % 4)


def create_points_glb(
    positions: list[tuple[float, float, float]],
    colors: list[tuple[int, int, int]],
) -> bytes:
    if not positions or len(positions) != len(colors):
        raise SystemExit("Point-cloud attributes are empty or mismatched")
    minima = [min(point[axis] for point in positions) for axis in range(3)]
    maxima = [max(point[axis] for point in positions) for axis in range(3)]
    center = [(minima[i] + maxima[i]) / 2 for i in range(3)]
    centered = [(p[0] - center[0], p[1] - center[1], p[2] - center[2]) for p in positions]
    centered_min = [min(p[i] for p in centered) for i in range(3)]
    centered_max = [max(p[i] for p in centered) for i in range(3)]

    position_bytes = bytearray()
    for point in centered:
        position_bytes.extend(struct.pack("<fff", *point))
    color_bytes = bytearray()
    for color in colors:
        color_bytes.extend(struct.pack("<BBB", *color))

    position_offset = 0
    position_length = len(position_bytes)
    color_offset = len(align4(position_bytes))
    binary = align4(bytes(position_bytes)) + align4(bytes(color_bytes))
    color_length = len(color_bytes)

    document = {
        "asset": {
            "version": "2.0",
            "generator": "BridgePoint F4U-1 Corsair COLMAP photogrammetry conversion",
            "copyright": "Haoran Wang, Nantheera Anantrasirichai and Brett Seymour; CC BY 4.0",
            "extras": {
                "sourceRecord": "https://zenodo.org/records/21824088",
                "sourceMember": MEMBER,
                "representation": "colorized COLMAP sparse photogrammetry point cloud; not a watertight mesh",
            },
        },
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "F4U-1 Corsair underwater photogrammetry points"}],
        "meshes": [{
            "name": "KWAJ F4U-1 Corsair photogrammetry point cloud",
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
            {"buffer": 0, "byteOffset": position_offset, "byteLength": position_length, "target": 34962},
            {"buffer": 0, "byteOffset": color_offset, "byteLength": color_length, "target": 34962},
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
    json_chunk = json_chunk + b" " * ((-len(json_chunk)) % 4)
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
    if metadata.get("title") != EXPECTED_TITLE:
        raise SystemExit("Zenodo dataset title changed; refusing to mirror")
    license_data = metadata.get("license") or {}
    license_id = license_data.get("id") if isinstance(license_data, dict) else str(license_data)
    if str(license_id).lower() != EXPECTED_LICENSE:
        raise SystemExit("The Abyssal dataset is no longer explicitly CC BY 4.0; refusing to mirror")
    file_entry = next(
        (item for item in (record.get("files") or []) if item.get("key") == "Abyssal.zip"),
        None,
    )
    if not file_entry:
        raise SystemExit("The expected Abyssal source archive is missing")
    with HttpRangeReader(ARCHIVE_URL) as remote:
        with zipfile.ZipFile(remote) as archive:
            member_info = archive.getinfo(MEMBER)
            compressed_size = member_info.compress_size
            if compressed_size > 60 * 1024 * 1024:
                raise SystemExit("The source point file exceeds the 60 MiB compressed-member limit")
            source = archive.read(MEMBER)
    if len(source) != member_info.file_size:
        raise SystemExit("COLMAP point-cloud member size mismatch")
    positions, colors, statistics = parse_colmap_points(source)
    raw_glb = create_points_glb(positions, colors)
    if raw_glb[:4] != b"glTF" or struct.unpack_from("<I", raw_glb, 8)[0] != len(raw_glb):
        raise SystemExit("Generated GLB failed its binary glTF header/length check")
    output.mkdir(parents=True, exist_ok=True)
    target = output / "f4u1-corsair-kwajalein-photogrammetry.glb.gz"
    with target.open("wb") as handle:
        with gzip.GzipFile(filename="", mode="wb", fileobj=handle, compresslevel=9, mtime=0) as packed:
            packed.write(raw_glb)
    if target.stat().st_size > MAX_COMPRESSED_ASSET:
        target.unlink(missing_ok=True)
        raise SystemExit("Compressed Corsair point-cloud GLB exceeds the BridgePoint Pages size limit")
    asset_sha = hashlib.sha256(target.read_bytes()).hexdigest()
    manifest = {
        "version": 1,
        "id": "f4u1-corsair-kwajalein",
        "name": "F4U-1 Corsair — BuNo 56267",
        "aircraft": "Chance Vought F4U-1 Corsair",
        "location": "Aircraft graveyard off Mellu Island, Kwajalein Atoll, Republic of the Marshall Islands",
        "coordinates": [167.4270, 9.3442],
        "coordinateText": "Approximate position off Mellu Island, Kwajalein Atoll",
        "depthM": 33.5,
        "lostDate": "1945-06-30",
        "builtYear": 1943,
        "sourcePhotos": 1294,
        "sourcePointCount": statistics["sourcePointCount"],
        "renderedPointCount": statistics["renderedPointCount"],
        "meanTrackLength": statistics["meanTrackLength"],
        "maximumReprojectionError": statistics["maximumReprojectionError"],
        "sourceBytes": len(source),
        "glbBytes": len(raw_glb),
        "compressedBytes": target.stat().st_size,
        "sourceMember": MEMBER,
        "sourceDataset": "Abyssal: A Large-scale Underwater 3D Reconstruction Dataset",
        "datasetUrl": "https://zenodo.org/records/21824088",
        "sourceUrl": "https://www.nps.gov/articles/000/kwajalein-atoll-underwater-aircraft-graveyard.htm",
        "locationSourceUrl": "https://www.pacificwrecks.com/aircraft/f4u/56267.html",
        "license": "CC BY 4.0",
        "creators": ["Haoran Wang", "Nantheera Anantrasirichai", "Brett Seymour"],
        "assetUrl": "/assets/plane-wrecks/f4u1-corsair-kwajalein-photogrammetry.glb.gz",
        "assetSha256": asset_sha,
        "representation": "BridgePoint-hosted colorized COLMAP photogrammetry point cloud, generated from the source 3D reconstruction. It is not a watertight or textured aircraft mesh.",
        "locationPrecision": "Approximate wreck-site placement off Mellu Island. The source point cloud has no published GPS origin or survey-grade geodetic transform.",
        "scalePrecision": "The source COLMAP reconstruction does not publish a metric scale certificate. Original local reconstruction units are preserved; apparent size is for visualization.",
        "depthPrecision": "Published source reports the wreck at approximately 110 ft (33.5 m) depth; BridgePoint places its visual center at that approximate depth.",
        "wreckCondition": "The aircraft lies nose-down. Published wreck documentation reports the rudder, elevators and landing gear missing.",
    }
    (output / "catalog.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(
        "BRIDGEPOINT_F4U1_CORSAIR_CC_BY_POINT_GLB_READY",
        json.dumps({
            "sourcePoints": statistics["sourcePointCount"],
            "renderedPoints": statistics["renderedPointCount"],
            "glbBytes": len(raw_glb),
            "compressedBytes": target.stat().st_size,
            "sha256": asset_sha,
            "license": "CC BY 4.0",
        }),
    )
    return manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("assets/plane-wrecks"))
    args = parser.parse_args()
    build(args.output)


if __name__ == "__main__":
    main()
