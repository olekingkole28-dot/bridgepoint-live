#!/usr/bin/env python3
"""Split the standalone Manhattan Blender scene into geographically anchored GLB tiles.

Package version: 1.0.0

Run inside Blender with NumPy and pyproj available:
  blender -b scene.blend --python package_manhattan_city_tiles.py -- \
    --source-manifest source-manifest.json --output-dir web-tiles --tile-size-m 2500
"""
from __future__ import annotations
import argparse
import json
import math
import sys
import time
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector
from pyproj import Transformer

FT_TO_M = 0.3048006096012192


def mesh_objects():
    excluded = bpy.data.collections.get("04_TERRAIN_AND_GROUND")
    blocked = set()
    if excluded:
        def collect(col):
            for obj in col.objects:
                blocked.add(obj.name)
            for child in col.children:
                collect(child)
        collect(excluded)
    result = []
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH" or obj.name in blocked or not obj.data.polygons:
            continue
        result.append(obj)
    return result


def object_bounds(obj):
    pts = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return (min(p.x for p in pts), min(p.y for p in pts),
            max(p.x for p in pts), max(p.y for p in pts))


def make_tile_object(source, tile_collection, x0, y0, tile_size, counters):
    mesh = source.data
    poly_count = len(mesh.polygons)
    centers = np.empty(poly_count * 3, dtype=np.float64)
    mesh.polygons.foreach_get("center", centers)
    centers = centers.reshape((-1, 3))

    matrix = np.array(source.matrix_world, dtype=np.float64)
    if not np.allclose(matrix, np.eye(4), atol=1e-10):
        ones = np.ones((len(centers), 1), dtype=np.float64)
        hom = np.concatenate((centers, ones), axis=1) @ matrix.T
        centers = hom[:, :3]

    mask = ((centers[:, 0] >= x0) & (centers[:, 0] < x0 + tile_size) &
            (centers[:, 1] >= y0) & (centers[:, 1] < y0 + tile_size))
    selected = np.flatnonzero(mask)
    if selected.size == 0:
        return None

    source_vertices = np.empty(len(mesh.vertices) * 3, dtype=np.float64)
    mesh.vertices.foreach_get("co", source_vertices)
    source_vertices = source_vertices.reshape((-1, 3))
    if not np.allclose(matrix, np.eye(4), atol=1e-10):
        ones = np.ones((len(source_vertices), 1), dtype=np.float64)
        hom = np.concatenate((source_vertices, ones), axis=1) @ matrix.T
        source_vertices = hom[:, :3]

    uv_layer = mesh.uv_layers.active
    out_vertices = []
    out_faces = []
    out_materials = []
    out_uvs = []

    x_center = x0 + tile_size * 0.5
    y_center = y0 + tile_size * 0.5

    for poly_index in selected:
        poly = mesh.polygons[int(poly_index)]
        vertex_indices = list(poly.vertices)
        if len(vertex_indices) < 3:
            continue
        start = len(out_vertices)
        for vertex_index in vertex_indices:
            x, y, z = source_vertices[vertex_index]
            out_vertices.append((float(x - x_center), float(y - y_center), float(z)))
        out_faces.append(tuple(range(start, start + len(vertex_indices))))
        out_materials.append(int(poly.material_index))
        if uv_layer:
            out_uvs.append([tuple(float(v) for v in uv_layer.data[loop_index].uv)
                            for loop_index in poly.loop_indices])

    if not out_faces:
        return None

    new_mesh = bpy.data.meshes.new(source.name + "_tile")
    new_mesh.from_pydata(out_vertices, [], out_faces)
    new_mesh.update(calc_edges=True)
    for material in mesh.materials:
        if material:
            new_mesh.materials.append(material)
    for poly, material_id in zip(new_mesh.polygons, out_materials):
        poly.material_index = min(material_id, max(0, len(new_mesh.materials) - 1))
    if uv_layer and len(out_uvs) == len(new_mesh.polygons):
        new_uv = new_mesh.uv_layers.new(name="UVMap")
        for poly, uv_face in zip(new_mesh.polygons, out_uvs):
            for loop_index, uv in zip(poly.loop_indices, uv_face):
                new_uv.data[loop_index].uv = uv

    obj = bpy.data.objects.new(source.name, new_mesh)
    tile_collection.objects.link(obj)
    counters["faces"] += len(out_faces)
    counters["vertices"] += len(out_vertices)
    return obj


def main():
    raw = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--tile-size-m", type=float, default=2500.0)
    parser.add_argument("--min-zoom", type=float, default=7.5)
    args = parser.parse_args(raw)
    if not args.source_manifest.is_file():
        raise SystemExit("Source manifest is missing.")
    if args.tile_size_m < 500 or args.tile_size_m > 10000:
        raise SystemExit("Tile size must be between 500 m and 10,000 m.")
    args.output_dir.mkdir(parents=True, exist_ok=True)

    source_manifest = json.loads(args.source_manifest.read_text(encoding="utf-8"))
    origin = source_manifest["localOrigin"]
    origin_x_m = float(origin["projectedXFeet"]) * FT_TO_M
    origin_y_m = float(origin["projectedYFeet"]) * FT_TO_M
    transformer = Transformer.from_crs("EPSG:2263", "EPSG:4326", always_xy=True)

    sources = mesh_objects()
    if not sources:
        raise SystemExit("No city mesh objects found in the Blender scene.")
    bounds = [object_bounds(obj) for obj in sources]
    min_x = min(b[0] for b in bounds)
    min_y = min(b[1] for b in bounds)
    max_x = max(b[2] for b in bounds)
    max_y = max(b[3] for b in bounds)
    tile_size = float(args.tile_size_m)
    base_x = math.floor(min_x / tile_size) * tile_size
    base_y = math.floor(min_y / tile_size) * tile_size
    ix_min = 0
    iy_min = 0
    ix_max = int(math.floor((max_x - base_x) / tile_size))
    iy_max = int(math.floor((max_y - base_y) / tile_size))

    tiles = []
    total_bytes = 0
    scene = bpy.context.scene
    for iy in range(iy_min, iy_max + 1):
        for ix in range(ix_min, ix_max + 1):
            x0 = base_x + ix * tile_size
            y0 = base_y + iy * tile_size
            x1, y1 = x0 + tile_size, y0 + tile_size
            # Skip empty grid squares quickly using object bounds.
            candidates = [obj for obj, b in zip(sources, bounds)
                          if b[2] >= x0 and b[0] <= x1 and b[3] >= y0 and b[1] <= y1]
            if not candidates:
                continue

            cx, cy = x0 + tile_size * 0.5, y0 + tile_size * 0.5
            projected_x = origin_x_m + cx
            projected_y = origin_y_m + cy
            lon, lat = transformer.transform(projected_x / FT_TO_M, projected_y / FT_TO_M)
            corners = [
                transformer.transform((origin_x_m + xx) / FT_TO_M, (origin_y_m + yy) / FT_TO_M)
                for xx, yy in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))
            ]
            bounds_wgs84 = [
                min(p[0] for p in corners), min(p[1] for p in corners),
                max(p[0] for p in corners), max(p[1] for p in corners)
            ]

            tile_id = f"manhattan-{ix:02d}-{iy:02d}"
            tile_collection = bpy.data.collections.new("BP_WEB_TILE_" + tile_id)
            scene.collection.children.link(tile_collection)
            counters = {"faces": 0, "vertices": 0}
            for source in candidates:
                make_tile_object(source, tile_collection, x0, y0, tile_size, counters)

            if counters["faces"] == 0:
                bpy.data.collections.remove(tile_collection)
                continue

            filename = tile_id + ".glb"
            filepath = args.output_dir / filename
            bpy.ops.object.select_all(action="DESELECT")
            for obj in tile_collection.objects:
                obj.select_set(True)
            bpy.context.view_layer.objects.active = next(iter(tile_collection.objects), None)
            bpy.ops.export_scene.gltf(
                filepath=str(filepath), export_format="GLB", use_selection=True,
                export_apply=True, export_texcoords=True, export_normals=True,
                export_materials="EXPORT", export_image_format="AUTO", export_yup=True,
                export_cameras=False, export_lights=False
            )
            if not filepath.is_file() or filepath.stat().st_size < 100:
                raise RuntimeError("GLB export did not produce a valid tile: " + tile_id)
            size_bytes = filepath.stat().st_size
            total_bytes += size_bytes
            tiles.append({
                "id": tile_id,
                "cityId": "manhattan",
                "url": filename,
                "bytes": size_bytes,
                "longitude": lon,
                "latitude": lat,
                "boundsWgs84": bounds_wgs84,
                "localOriginMeters": [cx, cy],
                "minZoom": args.min_zoom,
                "faceCount": counters["faces"],
                "vertexCount": counters["vertices"]
            })
            print("MANHATTAN_TILE_EXPORTED", tile_id, size_bytes,
                  counters["faces"], counters["vertices"], flush=True)

            for obj in list(tile_collection.objects):
                bpy.data.objects.remove(obj, do_unlink=True)
            bpy.data.collections.remove(tile_collection)
            bpy.ops.object.select_all(action="DESELECT")

    if not tiles:
        raise SystemExit("No non-empty Manhattan tiles were exported.")
    manifest = {
        "schemaVersion": 1,
        "buildRevision": "manhattan-v1",
        "id": "bridgepoint-blender-world-v1",
        "cities": [{"id": "manhattan", "title": "Manhattan, New York City", "tileCount": len(tiles)}],
        "name": "BridgePoint Blender World — Manhattan",
        "generatedAtUtc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "source": "NYC Open Data / NYC OTI / NYC Parks ForMS 2.0 plus existing BridgePoint NYC OTI LiDAR assets",
        "sourceManifest": "source-manifest.json",
        "coordinateReference": "EPSG:2263 tile-local metres, converted back to WGS84 using pyproj for tile anchors",
        "localOriginWgs84": [origin["longitude"], origin["latitude"]],
        "tileSizeMeters": tile_size,
        "minZoom": args.min_zoom,
        "boundsWgs84": [
            source_manifest["bboxWgs84"]["west"],
            source_manifest["bboxWgs84"]["south"],
            source_manifest["bboxWgs84"]["east"],
            source_manifest["bboxWgs84"]["north"]
        ],
        "tiles": tiles,
        "tileCount": len(tiles),
        "totalBytes": total_bytes,
        "terrainPolicy": "Keep BridgePoint MapLibre globe DEM terrain; city preview terrain mesh is excluded from web tiles.",
        "axisPolicy": "GLB is exported Y-up; tile-local X is east, local Z is north before glTF Y-up conversion; model anchors use WGS84.",
        "detailTruth": "Building footprints and available roof heights are sourced; facade materials, windows, parapets, rooftop props and tree meshes are procedural visual detail."
    }
    (args.output_dir / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    (args.output_dir / "source-manifest.json").write_text(
        json.dumps(source_manifest, indent=2), encoding="utf-8")
    print("MANHATTAN_TILE_PACKAGE_COMPLETE", json.dumps({
        "tileCount": len(tiles), "totalBytes": total_bytes,
        "tileSizeMeters": tile_size, "manifest": str(args.output_dir / "manifest.json")
    }), flush=True)


if __name__ == "__main__":
    main()
