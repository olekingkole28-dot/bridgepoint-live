#!/usr/bin/env python3
"""Convert the open CSIRO Jenolan Caves PLY into a compact hosted BridgePoint point cloud."""
from __future__ import annotations

import argparse
import gzip
import json
import math
import struct
from pathlib import Path

import numpy as np
from plyfile import PlyData

SOURCE_URL = "https://doi.org/10.4225/08/55911F74299DC"
SOURCE_FILENAME = "jenolan_2010_2014_V.ply"
LICENSE = "CC BY-SA 3.0"
SITE_ID = "jenolan-caves-system"
COORDINATES = [150.021444, -33.820556]


def field_names(vertex: np.ndarray) -> set[str]:
    return set(vertex.dtype.names or ())


def color_channels(vertex: np.ndarray, indices: np.ndarray) -> np.ndarray:
    names = field_names(vertex)
    choices = (("red", "green", "blue"), ("r", "g", "b"))
    rgb = next((triple for triple in choices if set(triple).issubset(names)), None)
    if rgb:
        raw = np.column_stack([vertex[name][indices] for name in rgb]).astype(np.float64)
        if raw.max(initial=0) <= 1.0:
            raw *= 255.0
        return np.clip(raw, 0, 255).astype(np.uint8)

    if "intensity" in names:
        intensity = np.asarray(vertex["intensity"][indices], dtype=np.float64)
        low, high = np.nanpercentile(intensity, [2, 98])
        scaled = np.clip((intensity - low) / max(high - low, 1e-9), 0, 1)
        gray = (55 + scaled * 170).astype(np.uint8)
        return np.column_stack((gray, np.clip(gray * 0.92, 0, 255), np.clip(gray * 0.78, 0, 255))).astype(np.uint8)

    # A restrained stone palette is used only if the source PLY has no color fields.
    return np.tile(np.array([188, 164, 128], dtype=np.uint8), (len(indices), 1))


def build(source: Path, output: Path, max_points: int) -> dict:
    if not source.is_file() or source.stat().st_size < 1_000_000:
        raise SystemExit(f"Source PLY is missing or unexpectedly small: {source}")
    with source.open("rb") as stream:
        ply = PlyData.read(stream, mmap=True)
    if "vertex" not in ply:
        raise SystemExit("Source PLY does not contain a vertex element")

    vertex = ply["vertex"].data
    names = field_names(vertex)
    if not {"x", "y", "z"}.issubset(names):
        raise SystemExit(f"PLY vertex fields do not include x/y/z: {sorted(names)}")

    source_count = int(len(vertex))
    if source_count < 1000 or source_count > 0xFFFFFFFF:
        raise SystemExit(f"Source point count is outside the binary format range: {source_count}")

    x_all = np.asarray(vertex["x"], dtype=np.float64)
    y_all = np.asarray(vertex["y"], dtype=np.float64)
    z_all = np.asarray(vertex["z"], dtype=np.float64)
    finite = np.isfinite(x_all) & np.isfinite(y_all) & np.isfinite(z_all)
    valid_indices = np.flatnonzero(finite)
    if len(valid_indices) < 1000:
        raise SystemExit("Source PLY has too few finite XYZ points")

    # Sample across the entire source inventory, not just its beginning.
    rng = np.random.default_rng(20261116)
    selected_count = min(int(max_points), len(valid_indices))
    pick = np.sort(rng.choice(valid_indices, size=selected_count, replace=False))
    x = x_all[pick]
    y = y_all[pick]
    z = z_all[pick]

    # Center the locally registered scan and map its axes into BridgePoint's ENU basis:
    # east -> x, up -> y, south -> z. Coordinates remain source-local, not GNSS-registered.
    mins = np.array([np.nanmin(x_all[finite]), np.nanmin(z_all[finite]), -np.nanmax(y_all[finite])], dtype=np.float64)
    maxs = np.array([np.nanmax(x_all[finite]), np.nanmax(z_all[finite]), -np.nanmin(y_all[finite])], dtype=np.float64)
    center = (mins + maxs) * 0.5
    positions = np.column_stack((x - center[0], z - center[1], -y - center[2])).astype("<f4")
    if not np.isfinite(positions).all():
        raise SystemExit("Generated point positions contain non-finite values")
    span = maxs - mins
    if not np.isfinite(span).all() or float(span.max()) < 1 or float(span.max()) > 100_000:
        raise SystemExit(f"Unexpected model-space dimensions (source units may not be metres): {span.tolist()}")

    colors = color_channels(vertex, pick)
    if positions.shape != (selected_count, 3) or colors.shape != (selected_count, 3):
        raise SystemExit("Point-cloud array dimensions are invalid")

    payload = struct.pack("<4sIII", b"BPC1", selected_count, source_count, 1)
    payload += positions.tobytes(order="C")
    payload += colors.tobytes(order="C")
    output.mkdir(parents=True, exist_ok=True)
    cloud_path = output / "pointcloud.bin.gz"
    with cloud_path.open("wb") as raw_file:
        with gzip.GzipFile(fileobj=raw_file, mode="wb", compresslevel=6, mtime=0) as compressed:
            compressed.write(payload)

    manifest = {
        "siteId": SITE_ID,
        "name": "Jenolan Caves — 3D LiDAR system",
        "sourceDataset": "Jenolan Caves: 3D Data Collection",
        "sourceFile": SOURCE_FILENAME,
        "sourceFileId": "48134791",
        "sourceBytes": int(source.stat().st_size),
        "sourcePointCount": source_count,
        "finiteSourcePointCount": int(len(valid_indices)),
        "materializedPointCount": selected_count,
        "geometryType": "LiDAR point cloud",
        "license": LICENSE,
        "creator": "Robert Zlot and Michael Bosse, CSIRO",
        "sourceUrl": SOURCE_URL,
        "paperUrl": "https://doi.org/10.1007/s10021-014-9771-3",
        "caveTraverseKm": 17.1,
        "collectionTrajectoryKm": 28.4,
        "publishedCollectionPointCountApprox": 2_300_000_000,
        "coordinates": COORDINATES,
        "depthBelowSurfaceM": 8,
        "coordinateSystem": "Source-local Cartesian scan coordinates; collection-level WGS84 marker only",
        "localBounds": {
            "min": [float(v) for v in mins - center],
            "max": [float(v) for v in maxs - center],
            "dimensionsMetres": [float(v) for v in span],
        },
        "coordinateNote": (
            "The marker uses the CSIRO collection-level WGS84 coordinate. "
            "The source PLY contains locally registered cave geometry and is not point-by-point GNSS-georeferenced. "
            "The below-terrain placement is an anchored visualization, not a survey-grade absolute alignment."
        ),
        "compression": "gzip",
        "binaryFormat": "BPC1 | uint32 point count | uint32 source point count | uint32 version | float32 XYZ (ENU metres) | uint8 RGB",
        "sampleMethod": "Deterministic uniform sample without replacement across the full source PLY",
    }
    (output / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    # Read-back validation catches truncation, header drift and compression errors before deploy.
    with gzip.open(cloud_path, "rb") as compressed:
        header = compressed.read(16)
    magic, count, original_count, version = struct.unpack("<4sIII", header)
    if (magic, count, original_count, version) != (b"BPC1", selected_count, source_count, 1):
        raise SystemExit("Materialized point-cloud header failed read-back validation")
    expected_bytes = 16 + selected_count * 15
    if len(payload) != expected_bytes:
        raise SystemExit("Materialized point-cloud payload length failed validation")
    print("JENOLAN_CAVES_POINT_CLOUD_PASS", json.dumps({
        "sourcePoints": source_count,
        "materializedPoints": selected_count,
        "dimensionsMetres": [round(float(v), 2) for v in span],
        "sourceBytes": source.stat().st_size,
        "packedBytes": cloud_path.stat().st_size,
    }))
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--max-points", type=int, default=2_500_000)
    args = parser.parse_args()
    if args.max_points < 1000 or args.max_points > 20_000_000:
        raise SystemExit("--max-points must be between 1,000 and 20,000,000")
    build(args.source, args.output, args.max_points)


if __name__ == "__main__":
    main()
