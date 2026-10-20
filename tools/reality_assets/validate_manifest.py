#!/usr/bin/env python3
"""Validate BridgePoint's reviewed, same-origin photogrammetry GLB catalog.

No third-party packages are required. Empty catalogs are valid (they mean no meshes
are published), while every non-empty item must point to a real, bounded, valid GLB.
"""
from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import struct
from pathlib import Path, PurePosixPath
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = ROOT / "rebuild-v5000" / "assets" / "reality-assets" / "manifest.json"
ASSET_URL_PREFIX = "/assets/reality-assets/"
MAX_ASSETS = 40
MAX_GLB_BYTES = 35 * 1024 * 1024


def fail(message: str) -> None:
    raise ValueError(message)


def finite_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def validate_iso_date(value: object, label: str) -> None:
    if not isinstance(value, str) or not value.strip():
        fail(f"{label} must be an ISO-8601 date or timestamp.")
    try:
        parsed = dt.datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError as exc:
        raise ValueError(f"{label} is not a valid ISO-8601 date/timestamp.") from exc
    if "T" in value and parsed.tzinfo is None:
        fail(f"{label} timestamps must include a timezone.")


def validate_glb(path: Path) -> None:
    try:
        size = path.stat().st_size
    except OSError as exc:
        raise ValueError(f"GLB file cannot be read: {path.name}") from exc
    if size < 20:
        fail(f"{path.name}: file is too short to be a GLB.")
    if size > MAX_GLB_BYTES:
        fail(f"{path.name}: exceeds the 35 MiB single-mesh limit.")
    with path.open("rb") as handle:
        header = handle.read(12)
        magic, version, declared_size = struct.unpack("<4sII", header)
        if magic != b"glTF" or version != 2:
            fail(f"{path.name}: expected a binary glTF 2.0 (GLB).")
        if declared_size != size:
            fail(f"{path.name}: GLB header length does not match file size.")
        chunk_header = handle.read(8)
        if len(chunk_header) != 8:
            fail(f"{path.name}: missing JSON chunk header.")
        chunk_length, chunk_type = struct.unpack("<II", chunk_header)
        if chunk_type != 0x4E4F534A:
            fail(f"{path.name}: first GLB chunk must be JSON.")
        if chunk_length <= 0 or chunk_length > size - 20:
            fail(f"{path.name}: JSON chunk length is invalid.")
        raw_json = handle.read(chunk_length)
    try:
        gltf = json.loads(raw_json.decode("utf-8").rstrip(" \t\r\n\x00"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ValueError(f"{path.name}: GLB JSON chunk is invalid.") from exc
    if gltf.get("asset", {}).get("version") != "2.0":
        fail(f"{path.name}: asset.version must be 2.0.")
    if not gltf.get("meshes") or not gltf.get("nodes") or not gltf.get("scenes"):
        fail(f"{path.name}: expected meshes, nodes and scenes.")
    if not isinstance(gltf.get("scene", 0), int) or gltf.get("scene", 0) < 0:
        fail(f"{path.name}: scene index is invalid.")
    # Embedded GLBs must not reach outside the reviewed file for imagery or buffers.
    for group in ("buffers", "images"):
        for item in gltf.get(group, []):
            uri = item.get("uri")
            if uri and not uri.startswith("data:"):
                fail(f"{path.name}: external {group} URI is not allowed; embed textures/buffers in the GLB.")
    # If the first JSON chunk is valid, it still must end before the file ends.
    if 20 + chunk_length > size:
        fail(f"{path.name}: truncated JSON chunk.")


def validate_manifest_data(data: object, asset_root: Path) -> int:
    if not isinstance(data, dict) or data.get("schemaVersion") != 1:
        fail("Manifest must be a JSON object with schemaVersion=1.")
    assets = data.get("assets")
    if not isinstance(assets, list):
        fail("Manifest assets must be an array.")
    if len(assets) > MAX_ASSETS:
        fail(f"Manifest exceeds the {MAX_ASSETS}-asset cap.")

    seen: set[str] = set()
    root = asset_root.resolve()
    for index, item in enumerate(assets, start=1):
        label = f"assets[{index - 1}]"
        if not isinstance(item, dict):
            fail(f"{label} must be an object.")
        asset_id = item.get("id")
        if not isinstance(asset_id, str) or not __import__("re").fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", asset_id):
            fail(f"{label}.id must be a lowercase letter/number/hyphen identifier.")
        if asset_id in seen:
            fail(f"{label}.id duplicates {asset_id}.")
        seen.add(asset_id)

        for key in ("title", "source", "license", "attribution"):
            if not isinstance(item.get(key), str) or not item[key].strip():
                fail(f"{label}.{key} is required.")
        source_url = item.get("sourceUrl")
        parsed_source = urlparse(source_url) if isinstance(source_url, str) else None
        if not parsed_source or parsed_source.scheme not in ("https", "http") or not parsed_source.netloc:
            fail(f"{label}.sourceUrl must be an http(s) source/licence record URL.")

        model_url = item.get("modelUrl")
        if not isinstance(model_url, str) or not model_url.startswith(ASSET_URL_PREFIX):
            fail(f"{label}.modelUrl must be below {ASSET_URL_PREFIX}.")
        parsed_model = urlparse(model_url)
        if parsed_model.query or parsed_model.fragment or parsed_model.scheme or parsed_model.netloc:
            fail(f"{label}.modelUrl must be a plain same-origin path, without query/hash.")
        relative = PurePosixPath(model_url[len(ASSET_URL_PREFIX):])
        if not relative.parts or any(part in ("", ".", "..") for part in relative.parts) or len(relative.parts) != 1:
            fail(f"{label}.modelUrl must name a single file; directories/traversal are rejected.")
        if relative.suffix.lower() != ".glb":
            fail(f"{label}.modelUrl must end in .glb.")
        candidate = (root / relative.name).resolve()
        if not candidate.is_relative_to(root):
            fail(f"{label}.modelUrl escapes the reviewed asset directory.")
        validate_glb(candidate)

        bounds = item.get("boundsWgs84")
        if not isinstance(bounds, list) or len(bounds) != 4 or not all(finite_number(n) for n in bounds):
            fail(f"{label}.boundsWgs84 must be [west, south, east, north].")
        west, south, east, north = map(float, bounds)
        if not (-180 <= west < east <= 180 and -90 <= south < north <= 90):
            fail(f"{label}.boundsWgs84 is outside valid WGS84 bounds.")
        if east - west > 5 or north - south > 5:
            fail(f"{label}.boundsWgs84 is too large for a single localized capture (max 5 degrees).")
        lng, lat = item.get("longitude"), item.get("latitude")
        if not finite_number(lng) or not finite_number(lat) or not (west <= float(lng) <= east and south <= float(lat) <= north):
            fail(f"{label} anchor must be valid and fall inside boundsWgs84.")

        height = item.get("targetHeightMeters")
        if not finite_number(height) or not 0.2 <= float(height) <= 5000:
            fail(f"{label}.targetHeightMeters must be 0.2–5000 metres.")
        zoom = item.get("minZoom")
        if not finite_number(zoom) or not 12 <= float(zoom) <= 21:
            fail(f"{label}.minZoom must be between 12 and 21.")
        if item.get("upAxis") not in ("Y", "Z"):
            fail(f"{label}.upAxis must be Y or Z.")
        for key, limit in (("rotationDegrees", 360000), ("groundOffsetMeters", 100)):
            value = item.get(key, 0)
            if not finite_number(value) or abs(float(value)) > limit:
                fail(f"{label}.{key} must be a finite number within ±{limit}.")
        validate_iso_date(item.get("capturedAt"), f"{label}.capturedAt")
    return len(assets)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--asset-root", type=Path, default=None,
                        help="Folder containing the GLB files, defaults to the manifest folder.")
    args = parser.parse_args()
    manifest_path = args.manifest.resolve()
    asset_root = args.asset_root.resolve() if args.asset_root else manifest_path.parent
    try:
        data = json.loads(manifest_path.read_text(encoding="utf-8"))
        count = validate_manifest_data(data, asset_root)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"REALITY ASSET VALIDATION FAILED: {exc}")
        return 1
    print(f"REALITY ASSET VALIDATION PASSED: {count} mesh(es) in {manifest_path}")
    if count == 0:
        print("Catalog is intentionally empty; no photogrammetry mesh will be presented as available.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
