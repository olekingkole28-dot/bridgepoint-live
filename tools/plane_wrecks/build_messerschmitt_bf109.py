#!/usr/bin/env python3
"""Convert Septentrion/LIS's public Potree 2.0 Messerschmitt Bf 109 scan to a BridgePoint GLB.

The source remains the original public LIS point-cloud service. This builder uses
HTTP byte ranges against its published metadata/hierarchy/octree files; it never
uses Sketchfab downloads, credentials, or an external viewer embed.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import re
import struct
import urllib.request
from pathlib import Path

import numpy as np

BASE_URL = "https://septentrion.lis-lab.fr/3D/Messerschmitt/pointclouds"
METADATA_URL = f"{BASE_URL}/metadata.json"
HIERARCHY_URL = f"{BASE_URL}/hierarchy.bin"
OCTREE_URL = f"{BASE_URL}/octree.bin"
SOURCE_VIEWER_URL = "https://septentrion.lis-lab.fr/3D/Messerschmitt/"
SOURCE_PROJECT_URL = "https://septentrion-env.com/en/projet/landscape-scale-photogrammetry-wrecks/"
LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/"
SOURCE_NAME = "Messerschmitt_278M"
EXPECTED_SOURCE_POINTS = 278_909_422
ATTR_STRIDE = 28
HIERARCHY_RECORD_SIZE = 22
MAX_TREE_DEPTH = 5
MAX_SOURCE_POINTS = 8_000_000
MAX_RENDERED_POINTS = 1_200_000
MAX_RANGE_BYTES = 16 * 1024 * 1024
MAX_TOTAL_DOWNLOAD_BYTES = 256 * 1024 * 1024
MAX_GZIP_BYTES = 64 * 1024 * 1024
USER_AGENT = "BridgePoint-Plane-Wrecks/1.0 (+https://bridgepointintelligence.online)"

POINT_DTYPE = np.dtype({
    "names": ["x", "y", "z", "intensity", "return_number", "number_of_returns",
              "classification", "scan_angle_rank", "user_data", "point_source_id",
              "r", "g", "b", "confidence"],
    "formats": ["<i4", "<i4", "<i4", "<u2", "u1", "u1", "u1", "u1",
                "u1", "<u2", "<u2", "<u2", "<u2", "u1"],
    "offsets": [0, 4, 8, 12, 14, 15, 16, 17, 18, 19, 21, 23, 25, 27],
    "itemsize": ATTR_STRIDE,
})


def request_bytes(url: str, limit: int, byte_range: tuple[int, int] | None = None) -> bytes:
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "application/json,application/octet-stream",
        "Accept-Encoding": "identity",
    }
    if byte_range is not None:
        headers["Range"] = f"bytes={byte_range[0]}-{byte_range[1]}"
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=180) as response:
        status = response.status
        payload = response.read(limit + 1)
        content_range = response.headers.get("Content-Range", "")
    if len(payload) > limit:
        raise SystemExit(f"Response exceeded the {limit:,}-byte safety limit: {url}")
    if byte_range is not None:
        start, end = byte_range
        expected = end - start + 1
        if status == 206:
            match = re.fullmatch(r"bytes (\d+)-(\d+)/(\d+|\*)", content_range)
            if not match or int(match.group(1)) != start or int(match.group(2)) != end:
                raise SystemExit(f"Unexpected Content-Range for {url}: {content_range!r}")
            if len(payload) != expected:
                raise SystemExit(f"Short HTTP range response for {url}: {len(payload)} != {expected}")
        elif status == 200 and len(payload) == expected:
            # A small hierarchy file may be served whole despite a Range header.
            pass
        else:
            raise SystemExit(
                f"Source did not honor bounded HTTP range {start}-{end} "
                f"(status={status}, bytes={len(payload)}, Content-Range={content_range!r})"
            )
    elif status != 200:
        raise SystemExit(f"Unexpected HTTP status {status} for {url}")
    return payload


def fetch_json(url: str) -> dict:
    value = json.loads(request_bytes(url, 2 * 1024 * 1024).decode("utf-8"))
    if not isinstance(value, dict):
        raise SystemExit("LIS returned invalid Potree metadata")
    return value


def parse_hierarchy_chunk(data: bytes, root_name: str, root_depth: int) -> tuple[list[dict], list[dict]]:
    if not data or len(data) % HIERARCHY_RECORD_SIZE:
        raise SystemExit(
            f"Invalid Potree hierarchy chunk size {len(data)} bytes; "
            f"expected a multiple of {HIERARCHY_RECORD_SIZE}"
        )
    record_count = len(data) // HIERARCHY_RECORD_SIZE
    queue = [(root_name, root_depth)]
    nodes: list[dict] = []
    proxies: list[dict] = []
    for index in range(record_count):
        if index >= len(queue):
            raise SystemExit("Potree hierarchy BFS has more records than its child masks describe")
        name, depth = queue[index]
        offset = index * HIERARCHY_RECORD_SIZE
        node_type, child_mask, point_count, byte_offset, byte_size = struct.unpack_from("<BBIQQ", data, offset)
        node = {
            "name": name,
            "depth": depth,
            "type": node_type,
            "numPoints": int(point_count),
            "byteOffset": int(byte_offset),
            "byteSize": int(byte_size),
        }
        nodes.append(node)
        if node_type == 2:
            if depth < MAX_TREE_DEPTH and byte_size > 0:
                proxies.append({
                    "name": name,
                    "depth": depth,
                    "byteOffset": int(byte_offset),
                    "byteSize": int(byte_size),
                })
            # Proxy children are represented by the referenced hierarchy chunk.
            continue
        for child in range(8):
            if child_mask & (1 << child):
                queue.append((name + str(child), depth + 1))
    if len(queue) != record_count:
        raise SystemExit(
            f"Potree hierarchy chunk is incomplete: parsed {record_count} records, "
            f"child masks describe {len(queue)}"
        )
    return nodes, proxies


def collect_hierarchy(metadata: dict) -> list[dict]:
    hierarchy = metadata.get("hierarchy") or {}
    first_size = int(hierarchy.get("firstChunkSize") or 0)
    step_size = int(hierarchy.get("stepSize") or 0)
    if first_size < HIERARCHY_RECORD_SIZE or first_size % HIERARCHY_RECORD_SIZE or step_size < 1:
        raise SystemExit("LIS Potree hierarchy settings are missing or invalid")
    pending = [{"name": "r", "depth": 0, "byteOffset": 0, "byteSize": first_size}]
    visited_chunks: set[tuple[int, int]] = set()
    all_nodes: list[dict] = []
    while pending:
        chunk = pending.pop(0)
        key = (chunk["byteOffset"], chunk["byteSize"])
        if key in visited_chunks:
            continue
        visited_chunks.add(key)
        if chunk["byteSize"] > MAX_RANGE_BYTES:
            raise SystemExit("Potree hierarchy subchunk exceeds the safe per-request size")
        raw = request_bytes(
            HIERARCHY_URL,
            MAX_RANGE_BYTES,
            (chunk["byteOffset"], chunk["byteOffset"] + chunk["byteSize"] - 1),
        )
        nodes, proxies = parse_hierarchy_chunk(raw, chunk["name"], chunk["depth"])
        all_nodes.extend(nodes)
        pending.extend(proxies)
        if len(all_nodes) > 100_000:
            raise SystemExit("Potree hierarchy traversal exceeded the 100,000-node safety limit")
    return all_nodes


def choose_point_nodes(nodes: list[dict], stride: int) -> list[dict]:
    candidates = [
        n for n in nodes
        if n["type"] in (0, 1) and 0 < n["depth"] <= MAX_TREE_DEPTH
        and n["numPoints"] > 0 and n["byteSize"] > 0
    ]
    for node in candidates:
        expected = node["numPoints"] * stride
        if node["byteSize"] != expected:
            raise SystemExit(
                f"Potree node {node['name']} byte size {node['byteSize']} "
                f"does not match {node['numPoints']} points × {stride} bytes"
            )
    # Keep the broadest detail level that fits the fixed source-transfer budget.
    for depth_limit in (4, 3, 2, 1):
        subset = [n for n in candidates if n["depth"] <= depth_limit]
        total = sum(n["numPoints"] for n in subset)
        if subset and 0 < total <= MAX_SOURCE_POINTS:
            return subset
    raise SystemExit("No Potree hierarchy level fits the bounded point-cloud conversion budget")


def grouped_ranges(nodes: list[dict]) -> list[tuple[int, int, list[dict]]]:
    ordered = sorted(nodes, key=lambda n: n["byteOffset"])
    groups: list[tuple[int, int, list[dict]]] = []
    current_nodes: list[dict] = []
    group_start = group_end = -1
    for node in ordered:
        start = node["byteOffset"]
        end = start + node["byteSize"] - 1
        if end < start:
            raise SystemExit(f"Invalid Potree octree block bounds for {node['name']}")
        can_merge = (
            current_nodes
            and start <= group_end + 64 * 1024
            and end - group_start + 1 <= MAX_RANGE_BYTES
        )
        if not can_merge:
            if current_nodes:
                groups.append((group_start, group_end, current_nodes))
            group_start, group_end, current_nodes = start, end, [node]
        else:
            group_end = max(group_end, end)
            current_nodes.append(node)
    if current_nodes:
        groups.append((group_start, group_end, current_nodes))
    return groups


def extract_point_samples(metadata: dict, nodes: list[dict]) -> tuple[np.ndarray, np.ndarray, dict]:
    offset = np.asarray(metadata["offset"], dtype=np.float64)
    scale = np.asarray(metadata["scale"], dtype=np.float64)
    if offset.shape != (3,) or scale.shape != (3,) or not np.all(np.isfinite(offset)) or not np.all(np.isfinite(scale)):
        raise SystemExit("Potree point-cloud offset/scale are invalid")
    total_source = sum(n["numPoints"] for n in nodes)
    if total_source <= 0:
        raise SystemExit("No point records found in selected Potree nodes")
    downloaded = sum(end - start + 1 for start, end, _ in grouped_ranges(nodes))
    if downloaded > MAX_TOTAL_DOWNLOAD_BYTES:
        raise SystemExit(
            f"Selected Potree hierarchy would transfer {downloaded:,} bytes, "
            f"above the {MAX_TOTAL_DOWNLOAD_BYTES:,}-byte budget"
        )
    positions_parts: list[np.ndarray] = []
    colors_parts: list[np.ndarray] = []
    rendered = 0
    for start, end, group_nodes in grouped_ranges(nodes):
        block = request_bytes(OCTREE_URL, MAX_RANGE_BYTES, (start, end))
        for node in group_nodes:
            local_start = node["byteOffset"] - start
            local_end = local_start + node["byteSize"]
            node_bytes = block[local_start:local_end]
            expected = node["numPoints"] * ATTR_STRIDE
            if len(node_bytes) != expected:
                raise SystemExit(f"Truncated Potree point block for {node['name']}")
            remaining = MAX_RENDERED_POINTS - rendered
            if remaining <= 0:
                break
            # A stratified sample preserves coverage while keeping the hosted viewer lightweight.
            take = min(node["numPoints"], max(1, round(node["numPoints"] * MAX_RENDERED_POINTS / total_source)))
            take = min(take, remaining)
            raw_points = np.frombuffer(node_bytes, dtype=POINT_DTYPE, count=node["numPoints"])
            sample_indices = np.linspace(0, node["numPoints"] - 1, num=take, dtype=np.int64)
            sampled = raw_points[sample_indices]
            xyz = np.column_stack((sampled["x"], sampled["y"], sampled["z"])).astype(np.float64)
            xyz = (xyz * scale) + offset
            rgb = np.column_stack((sampled["r"], sampled["g"], sampled["b"]))
            # Potree 2.0 stores RGB in uint16; glTF normalized RGB8 retains its appearance.
            rgb = np.right_shift(rgb, 8).astype(np.uint8)
            positions_parts.append(xyz.astype("<f4"))
            colors_parts.append(rgb)
            rendered += take
        if rendered >= MAX_RENDERED_POINTS:
            break
    if rendered < 100_000:
        raise SystemExit(f"Only {rendered:,} usable photogrammetry points were extracted")
    positions = np.concatenate(positions_parts, axis=0)
    colors = np.concatenate(colors_parts, axis=0)
    if positions.shape[0] != colors.shape[0] or not np.all(np.isfinite(positions)):
        raise SystemExit("Extracted position and color arrays failed validation")
    return positions, colors, {
        "sourcePointCount": EXPECTED_SOURCE_POINTS,
        "hierarchySelectedPointCount": total_source,
        "renderedPointCount": int(positions.shape[0]),
        "sourceNodeCount": len(nodes),
        "maximumHierarchyDepth": max(n["depth"] for n in nodes),
        "downloadedPointDataBytes": downloaded,
    }


def align4(data: bytes) -> bytes:
    return data + b"\0" * ((-len(data)) % 4)


def create_points_glb(positions: np.ndarray, colors: np.ndarray) -> bytes:
    if positions.ndim != 2 or positions.shape[1] != 3 or colors.shape != positions.shape:
        raise SystemExit("Messerschmitt GLB point attributes are mismatched")
    minima = positions.min(axis=0)
    maxima = positions.max(axis=0)
    center = (minima + maxima) / 2.0
    centered = (positions - center).astype("<f4")
    position_bytes = centered.tobytes(order="C")
    color_bytes = colors.astype("u1").tobytes(order="C")
    position_aligned = align4(position_bytes)
    color_offset = len(position_aligned)
    binary = position_aligned + align4(color_bytes)
    point_count = int(positions.shape[0])
    doc = {
        "asset": {
            "version": "2.0",
            "generator": "BridgePoint conversion of Septentrion / LIS Potree 2.0 point cloud",
            "copyright": "Septentrion Environnement and LIS / Aix-Marseille Université, UMR CNRS 7020; CC BY 4.0",
            "extras": {
                "source": SOURCE_VIEWER_URL,
                "sourceProject": SOURCE_PROJECT_URL,
                "sourcePointCount": EXPECTED_SOURCE_POINTS,
                "representation": "RGB photogrammetry point cloud, sampled from the original Potree 2.0 hierarchy; not a watertight triangle mesh",
                "license": "CC BY 4.0",
                "licenseUrl": LICENSE_URL,
            },
        },
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0, "name": "Messerschmitt Bf 109 G-6 underwater photogrammetry points"}],
        "meshes": [{
            "name": "Messerschmitt Bf 109 G-6 · RGB photogrammetry",
            "primitives": [{
                "attributes": {"POSITION": 0, "COLOR_0": 1},
                "material": 0,
                "mode": 0,
            }],
        }],
        "materials": [{
            "name": "Original photogrammetry RGB",
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
                "count": point_count, "type": "VEC3",
                "min": (centered.min(axis=0)).tolist(),
                "max": (centered.max(axis=0)).tolist(),
            },
            {
                "bufferView": 1, "byteOffset": 0, "componentType": 5121,
                "count": point_count, "type": "VEC3", "normalized": True,
            },
        ],
    }
    json_chunk = json.dumps(doc, separators=(",", ":"), ensure_ascii=True).encode("utf-8")
    json_chunk += b" " * ((-len(json_chunk)) % 4)
    binary_chunk = align4(binary)
    total_length = 12 + 8 + len(json_chunk) + 8 + len(binary_chunk)
    return (
        struct.pack("<4sII", b"glTF", 2, total_length)
        + struct.pack("<I4s", len(json_chunk), b"JSON") + json_chunk
        + struct.pack("<I4s", len(binary_chunk), b"BIN\0") + binary_chunk
    )


def build(output: Path) -> dict:
    metadata = fetch_json(METADATA_URL)
    if metadata.get("version") != "2.0" or metadata.get("name") != SOURCE_NAME:
        raise SystemExit("LIS Potree source metadata changed; refusing to mirror an unexpected scan")
    if int(metadata.get("points") or 0) != EXPECTED_SOURCE_POINTS:
        raise SystemExit("LIS Messerschmitt source point count changed; review provenance before updating")
    if metadata.get("encoding") != "DEFAULT":
        raise SystemExit(f"Unsupported Potree encoding: {metadata.get('encoding')!r}")
    attributes = metadata.get("attributes") or []
    stride = sum(int(attr.get("size") or 0) for attr in attributes)
    if stride != ATTR_STRIDE:
        raise SystemExit(f"Unexpected Potree attribute stride {stride}; expected {ATTR_STRIDE}")
    names = [attr.get("name") for attr in attributes]
    if not all(name in names for name in ("position", "rgb")):
        raise SystemExit("Potree source is missing required position or RGB attributes")

    hierarchy_nodes = collect_hierarchy(metadata)
    point_nodes = choose_point_nodes(hierarchy_nodes, stride)
    positions, colors, stats = extract_point_samples(metadata, point_nodes)
    glb = create_points_glb(positions, colors)
    if len(glb) < 20 or glb[:4] != b"glTF" or struct.unpack_from("<I", glb, 8)[0] != len(glb):
        raise SystemExit("Converted Messerschmitt GLB failed binary glTF validation")

    output.mkdir(parents=True, exist_ok=True)
    asset_name = "messerschmitt-bf109-g6-planier.glb.gz"
    target = output / asset_name
    with target.open("wb") as handle:
        with gzip.GzipFile(filename="", mode="wb", fileobj=handle, compresslevel=6, mtime=0) as packed:
            packed.write(glb)
    if target.stat().st_size > MAX_GZIP_BYTES:
        target.unlink(missing_ok=True)
        raise SystemExit(f"Compressed Messerschmitt GLB exceeds {MAX_GZIP_BYTES:,} bytes")
    digest = hashlib.sha256(target.read_bytes()).hexdigest()
    manifest = {
        "id": "messerschmitt-bf109-g6-planier",
        "name": "Messerschmitt Bf 109 G-6 — Planier Islet, Marseille",
        "aircraft": "Messerschmitt Bf 109 G-6",
        "location": "Seafloor near Planier Islet, Marseille, Provence-Alpes-Côte d’Azur, France",
        "coordinates": [5.23021, 43.1996],
        "approximateDepthM": 45,
        "lostDate": "1944 (exact loss date not independently verified)",
        "creator": "Septentrion Environnement and LIS / Aix-Marseille Université, UMR CNRS 7020",
        "sourcePointCount": stats["sourcePointCount"],
        "hierarchySelectedPointCount": stats["hierarchySelectedPointCount"],
        "renderedPointCount": stats["renderedPointCount"],
        "sourceNodeCount": stats["sourceNodeCount"],
        "maximumHierarchyDepth": stats["maximumHierarchyDepth"],
        "downloadedPointDataBytes": stats["downloadedPointDataBytes"],
        "sourceMetadata": METADATA_URL,
        "sourceViewer": SOURCE_VIEWER_URL,
        "sourceProject": SOURCE_PROJECT_URL,
        "originalModelRecord": "https://sketchfab.com/3d-models/messerschmitt-49655a05cbe346808d810ad88f86066e",
        "license": "CC BY 4.0",
        "licenseUrl": LICENSE_URL,
        "representation": "BridgePoint-hosted RGB Potree 2.0 photogrammetry point cloud converted to a self-contained GLB; stratified sample of the 278,909,422-point source, not a watertight triangle mesh",
        "assetUrl": f"/assets/plane-wrecks/extra/{asset_name}",
        "sourceGlbBytes": len(glb),
        "compressedBytes": target.stat().st_size,
        "sha256": digest,
    }
    catalog_path = output / "catalog.json"
    if catalog_path.exists():
        catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
        if not isinstance(catalog, dict) or not isinstance(catalog.get("models"), list):
            raise SystemExit("Existing BridgePoint Plane Wrecks extra catalog is malformed")
    else:
        catalog = {
            "version": 1,
            "representation": "BridgePoint-hosted, self-contained photogrammetry meshes and point clouds",
            "models": [],
        }
    catalog["models"] = [m for m in catalog["models"] if m.get("id") != manifest["id"]]
    catalog["models"].append(manifest)
    catalog_path.write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    print("BRIDGEPOINT_MESSERSCHMITT_READY", json.dumps({
        "sourcePointCount": manifest["sourcePointCount"],
        "renderedPointCount": manifest["renderedPointCount"],
        "license": manifest["license"],
        "compressedBytes": manifest["compressedBytes"],
        "sha256": manifest["sha256"],
    }))
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("assets/plane-wrecks/extra"))
    args = parser.parse_args()
    build(args.output)


if __name__ == "__main__":
    main()
