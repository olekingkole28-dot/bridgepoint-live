#!/usr/bin/env python3
"""Build the public NOAA P-39Q Airacobra wing scan as a BridgePoint-hosted GLB.

The NOAA photogrammetry page links the public Construkted Reality asset package.
This builder does not log in to, scrape private endpoints from, or embed Construkted.
It converts the publicly linked package to a self-contained GLB for BridgePoint Pages.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import io
import json
import shutil
import stat
import struct
import tempfile
import urllib.request
import zipfile
from pathlib import Path, PurePosixPath

SOURCE_PAGE = "https://oceanexplorer.noaa.gov/photogrammetry/p39q/"
CONSTRUKTED_PAGE = "https://construkted.com/asset/ah9tooshsxa/"
DOWNLOAD_URL = (
    "https://s3.us-east-2.wasabisys.com/construkted-uploads/"
    "archaeology-oceanexploration/"
    "ah9tooshsxa-P761_00003_PortHuron_Michigan_P39Q_Wing_04AUG2023.zip"
)
OUTPUT_NAME = "p39q-airacobra-wing-photogrammetry.glb.gz"
MANIFEST_NAME = "p39q-airacobra-wing.json"
USER_AGENT = "BridgePoint-Plane-Wrecks/1.0 (+https://bridgepointintelligence.online)"
MAX_ZIP_BYTES = 500 * 1024 * 1024
MAX_EXTRACTED_BYTES = 900 * 1024 * 1024
MAX_RAW_GLB_BYTES = 300 * 1024 * 1024
MAX_GZIP_BYTES = 180 * 1024 * 1024
GEOMETRY_EXTENSIONS = {".glb", ".gltf", ".obj", ".ply", ".stl", ".dae", ".off"}
EXTENSION_PRIORITY = {".obj": 0, ".ply": 1, ".glb": 2, ".gltf": 3, ".stl": 4, ".dae": 5, ".off": 6}


def download_source() -> bytes:
    request = urllib.request.Request(
        DOWNLOAD_URL,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": "application/zip,application/octet-stream,*/*",
            "Referer": CONSTRUKTED_PAGE,
            "Accept-Encoding": "identity",
        },
    )
    with urllib.request.urlopen(request, timeout=240) as response:
        if response.status != 200:
            raise SystemExit(f"NOAA P-39Q public model package returned HTTP {response.status}")
        data = response.read(MAX_ZIP_BYTES + 1)
    if len(data) > MAX_ZIP_BYTES:
        raise SystemExit(f"NOAA P-39Q ZIP exceeds the {MAX_ZIP_BYTES}-byte safety cap")
    if not zipfile.is_zipfile(io.BytesIO(data)):
        raise SystemExit("The public P-39Q wing download is not a valid ZIP archive")
    return data


def extract_safe_archive(data: bytes, root: Path) -> list[Path]:
    extracted: list[Path] = []
    total = 0
    with zipfile.ZipFile(io.BytesIO(data)) as archive:
        bad = archive.testzip()
        if bad:
            raise SystemExit(f"P-39Q source ZIP failed its CRC check at {bad!r}")
        for info in archive.infolist():
            if info.is_dir():
                continue
            path = PurePosixPath(info.filename.replace("\\", "/"))
            if path.is_absolute() or any(part in ("", ".", "..") for part in path.parts):
                raise SystemExit(f"Unsafe path in P-39Q source ZIP: {info.filename!r}")
            mode = (info.external_attr >> 16) & 0xFFFF
            if stat.S_ISLNK(mode):
                raise SystemExit(f"Refusing symbolic link in P-39Q source ZIP: {info.filename!r}")
            total += int(info.file_size)
            if total > MAX_EXTRACTED_BYTES:
                raise SystemExit("P-39Q source ZIP expands beyond the safe extraction limit")
            destination = root.joinpath(*path.parts)
            destination.parent.mkdir(parents=True, exist_ok=True)
            with archive.open(info, "r") as src, destination.open("wb") as dst:
                shutil.copyfileobj(src, dst, length=1024 * 1024)
            extracted.append(destination)
    candidates = [
        p for p in extracted
        if p.suffix.lower() in GEOMETRY_EXTENSIONS and p.stat().st_size > 1024
    ]
    candidates.sort(
        key=lambda p: (EXTENSION_PRIORITY.get(p.suffix.lower(), 99), -p.stat().st_size, str(p))
    )
    if not candidates:
        inventory = [p.relative_to(root).as_posix() for p in extracted[:80]]
        raise SystemExit("No supported mesh file found in NOAA P-39Q package: " + json.dumps(inventory))
    print(
        "BRIDGEPOINT_P39Q_SOURCE_ARCHIVE_FILES",
        json.dumps([
            {"path": p.relative_to(root).as_posix(), "bytes": p.stat().st_size}
            for p in extracted
        ]),
        flush=True,
    )
    return candidates


def glb_document(raw: bytes) -> dict:
    if len(raw) < 20 or raw[:4] != b"glTF":
        raise SystemExit("P-39Q conversion did not produce a binary glTF")
    version, declared_length = struct.unpack_from("<II", raw, 4)
    if version != 2 or declared_length != len(raw):
        raise SystemExit("P-39Q GLB header/version/length validation failed")
    json_length, json_type = struct.unpack_from("<II", raw, 12)
    if json_type != 0x4E4F534A or 20 + json_length > len(raw):
        raise SystemExit("P-39Q GLB has an invalid JSON chunk")
    try:
        doc = json.loads(raw[20:20 + json_length].decode("utf-8").rstrip(" \0"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise SystemExit(f"P-39Q GLB JSON chunk is invalid: {error}") from error
    for buffer in doc.get("buffers") or []:
        if buffer.get("uri"):
            raise SystemExit("P-39Q output GLB is not self-contained (external buffer URI)")
    for image in doc.get("images") or []:
        uri = image.get("uri")
        if uri and not str(uri).startswith("data:"):
            raise SystemExit("P-39Q output GLB is not self-contained (external image URI)")
    return doc


def geometry_stats(doc: dict) -> dict:
    accessors = doc.get("accessors") or []
    mesh_parts = triangles = vertices = point_primitives = 0
    for mesh in doc.get("meshes") or []:
        for primitive in mesh.get("primitives") or []:
            attributes = primitive.get("attributes") or {}
            position_index = attributes.get("POSITION")
            if position_index is None or int(position_index) >= len(accessors):
                continue
            vertex_count = int(accessors[int(position_index)].get("count") or 0)
            vertices += vertex_count
            mode = int(primitive.get("mode", 4))
            index_index = primitive.get("indices")
            index_count = (
                int(accessors[int(index_index)].get("count") or 0)
                if index_index is not None and int(index_index) < len(accessors)
                else vertex_count
            )
            if mode == 4:
                mesh_parts += 1
                triangles += index_count // 3
            elif mode == 0:
                point_primitives += 1
    return {
        "meshParts": mesh_parts,
        "triangles": triangles,
        "vertices": vertices,
        "pointPrimitives": point_primitives,
    }


def convert_mesh(candidates: list[Path]) -> bytes:
    try:
        import trimesh
    except ImportError as error:
        raise SystemExit("Install trimesh and Pillow before building the P-39Q mesh") from error

    errors = []
    for source in candidates:
        try:
            loaded = trimesh.load(source, force="scene", process=False)
            if isinstance(loaded, trimesh.Trimesh):
                scene = trimesh.Scene(loaded)
            elif isinstance(loaded, trimesh.Scene):
                scene = loaded
            else:
                raise ValueError(f"unsupported imported geometry type {type(loaded).__name__}")
            if not scene.geometry:
                raise ValueError("source contains no visible mesh or point geometry")
            raw = scene.export(file_type="glb")
            if not isinstance(raw, (bytes, bytearray)):
                raise ValueError("GLB exporter did not return binary data")
            raw = bytes(raw)
            if len(raw) > MAX_RAW_GLB_BYTES:
                raise ValueError(f"converted GLB exceeds {MAX_RAW_GLB_BYTES}-byte safety cap")
            doc = glb_document(raw)
            stats = geometry_stats(doc)
            if stats["triangles"] < 1000 and stats["vertices"] < 1000:
                raise ValueError("converted GLB does not contain a substantial photogrammetry model")
            print(
                "BRIDGEPOINT_P39Q_GEOMETRY_SELECTED",
                json.dumps({
                    "source": source.name,
                    "sourceBytes": source.stat().st_size,
                    **stats,
                    "glbBytes": len(raw),
                }),
                flush=True,
            )
            return raw
        except Exception as error:
            errors.append({"file": str(source), "error": str(error)})
            print("BRIDGEPOINT_P39Q_IMPORT_RETRY", json.dumps(errors[-1]), flush=True)
    raise SystemExit("Could not convert any geometry file in the public NOAA P-39Q package: " + json.dumps(errors))


def build(output: Path) -> dict:
    output.mkdir(parents=True, exist_ok=True)
    source_zip = download_source()
    source_sha256 = hashlib.sha256(source_zip).hexdigest()
    with tempfile.TemporaryDirectory(prefix="bridgepoint-p39q-") as temp:
        candidates = extract_safe_archive(source_zip, Path(temp))
        raw = convert_mesh(candidates)
    doc = glb_document(raw)
    stats = geometry_stats(doc)
    target = output / OUTPUT_NAME
    with target.open("wb") as handle:
        with gzip.GzipFile(filename="", mode="wb", fileobj=handle, compresslevel=6, mtime=0) as gz:
            gz.write(raw)
    if target.stat().st_size > MAX_GZIP_BYTES:
        target.unlink(missing_ok=True)
        raise SystemExit(f"Compressed P-39Q GLB exceeds {MAX_GZIP_BYTES}-byte safety cap")
    manifest = {
        "id": "bell-p39q-airacobra-lake-huron",
        "name": "Bell P-39Q Airacobra (#42-21226) — Wing Photogrammetry",
        "aircraft": "Bell P-39Q Airacobra",
        "component": "Wing scan",
        "location": "Lake Huron, approximately four miles north of Port Huron, Michigan, USA",
        "coordinates": [-82.425, 43.028],
        "siteDepthMeters": 10,
        "lossDate": "1944-04-11",
        "creator": "Raymond Phipps, NOAA Ocean Exploration explorer-in-training",
        "captureDate": "2023-08-04",
        "sourcePhotos": 438,
        "imageAlignmentPercent": 100,
        "tiePoints": 132360,
        "sourcePolygonCount": 1570000,
        "sourcePage": SOURCE_PAGE,
        "construktedPage": CONSTRUKTED_PAGE,
        "publicDownloadUrl": DOWNLOAD_URL,
        "license": "Public Domain (NOAA-created U.S. Government work; NOAA attribution required)",
        "attribution": "Model courtesy of NOAA Ocean Exploration. Photogrammetry developed by Raymond Phipps, NOAA Ocean Exploration explorer-in-training, August 4, 2023. Source package publicly distributed through Construkted Reality. BridgePoint conversion; no NOAA endorsement implied.",
        "representation": "BridgePoint-hosted self-contained GLB converted from NOAA's public P-39Q wing photogrammetry package.",
        "sourceZipBytes": len(source_zip),
        "sourceZipSha256": source_sha256,
        "glbBytes": len(raw),
        "compressedBytes": target.stat().st_size,
        "glbSha256": hashlib.sha256(raw).hexdigest(),
        "hostedAsset": f"/assets/plane-wrecks/extra/{OUTPUT_NAME}",
        **stats,
    }
    (output / MANIFEST_NAME).write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(
        "BRIDGEPOINT_P39Q_AIRACOBRA_ASSET_READY",
        json.dumps({
            "sourceZipBytes": len(source_zip),
            "glbBytes": len(raw),
            "compressedBytes": target.stat().st_size,
            **stats,
            "license": manifest["license"],
        }),
        flush=True,
    )
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("assets/plane-wrecks/extra"))
    args = parser.parse_args()
    build(args.output)


if __name__ == "__main__":
    main()
