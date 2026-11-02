"""Prepare reviewed Poly Haven tree models as normalized, wind-ready GLB LODs.

Run with Blender in background mode:
  blender -b --python tools/trees/prepare_tree_models_blender.py -- \
    --source-root /tmp/tree-source --output-root /tmp/tree-output \
    --catalog assets/trees/tree-model-catalog-v1.json

Models are normalized to one metre of local Y height. BridgePoint applies the
measured source-tree height at instance time; no geographic positions are made
or modified here. A second UV channel stores wind weight in TEXCOORD_1.x.
"""

from __future__ import annotations

import argparse
import json
import math
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Matrix


def parse_args():
    raw = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", required=True, type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--catalog", required=True, type=Path)
    return parser.parse_args(raw)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.meshes, bpy.data.curves, bpy.data.materials,
        bpy.data.images, bpy.data.cameras, bpy.data.lights,
    ):
        for block in list(datablocks):
            if block.users == 0:
                datablocks.remove(block)


def import_model(entrypoint: Path):
    if entrypoint.suffix.lower() == ".gltf":
        bpy.ops.import_scene.gltf(filepath=str(entrypoint))
    elif entrypoint.suffix.lower() == ".glb":
        bpy.ops.import_scene.gltf(filepath=str(entrypoint))
    else:
        raise RuntimeError(f"Unsupported source model format: {entrypoint.name}")

    mesh_objects = [
        obj for obj in bpy.context.scene.objects
        if obj.type == "MESH" and obj.data is not None
    ]
    if not mesh_objects:
        raise RuntimeError(f"No mesh geometry imported from {entrypoint}")

    # Bake object transforms into local mesh positions, preserving material and UV data.
    for obj in mesh_objects:
        obj.data.transform(obj.matrix_world.copy())
        obj.matrix_world = Matrix.Identity(4)
        obj.data.update()

    bpy.ops.object.select_all(action="DESELECT")
    for obj in mesh_objects:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = mesh_objects[0]
    if len(mesh_objects) > 1:
        bpy.ops.object.join()

    joined = bpy.context.view_layer.objects.active
    if joined is None or joined.type != "MESH":
        raise RuntimeError("Mesh consolidation failed.")
    return joined


def normalize_tree(obj):
    mesh = obj.data
    if not mesh.vertices:
        raise RuntimeError("Imported model has no vertices.")

    xs = [vertex.co.x for vertex in mesh.vertices]
    ys = [vertex.co.y for vertex in mesh.vertices]
    zs = [vertex.co.z for vertex in mesh.vertices]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    min_z, max_z = min(zs), max(zs)
    height = max_z - min_z
    if not math.isfinite(height) or height <= 0.05:
        raise RuntimeError(f"Expected a Z-up tree mesh; invalid height range {height}.")

    center_x = (min_x + max_x) * 0.5
    center_y = (min_y + max_y) * 0.5
    inv_height = 1.0 / height
    for vertex in mesh.vertices:
        vertex.co.x = (vertex.co.x - center_x) * inv_height
        vertex.co.y = (vertex.co.y - center_y) * inv_height
        vertex.co.z = (vertex.co.z - min_z) * inv_height
    mesh.update()

    # Preserve the source model's primary UV mapping, but reserve TEXCOORD_1 for
    # a continuous ground-to-crown wind-flex weight. All source textures use UV0.
    while len(mesh.uv_layers) > 1:
        mesh.uv_layers.remove(mesh.uv_layers[-1])
    if len(mesh.uv_layers) == 0:
        uv0 = mesh.uv_layers.new(name="UVMap")
        for item in uv0.data:
            item.uv = (0.0, 0.0)

    wind_uv = mesh.uv_layers.new(name="BP_WIND_WEIGHT")
    for loop in mesh.loops:
        height_weight = max(0.0, min(1.0, mesh.vertices[loop.vertex_index].co.z))
        # Lower trunk stays relatively stiff; outer crown/branch tips flex more.
        bend_weight = height_weight ** 1.65
        wind_uv.data[loop.index].uv = (bend_weight, height_weight)

    obj.name = "BP_TREE_MODEL"
    obj.data.name = "BP_TREE_GEOMETRY"
    return height, (max_x - min_x) / height, (max_y - min_y) / height


def triangle_count(mesh) -> int:
    return sum(max(1, len(poly.vertices) - 2) for poly in mesh.polygons)


def apply_lod(obj, target_triangles: int):
    current = triangle_count(obj.data)
    if current > target_triangles and current > 0:
        ratio = max(0.0001, min(1.0, target_triangles / float(current)))
        modifier = obj.modifiers.new(name="BP_TREE_LOD_DECIMATE", type="DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = ratio
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    obj.data.update()
    return triangle_count(obj.data)


def glb_json(filepath: Path) -> dict:
    data = filepath.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF":
        raise RuntimeError(f"Invalid GLB header: {filepath}")
    version, total_length = struct.unpack_from("<II", data, 4)
    if version != 2 or total_length != len(data):
        raise RuntimeError(f"Invalid GLB version/length: {filepath}")
    chunk_length, chunk_type = struct.unpack_from("<II", data, 12)
    if chunk_type != 0x4E4F534A:
        raise RuntimeError(f"GLB JSON chunk missing: {filepath}")
    return json.loads(data[20:20 + chunk_length].decode("utf-8"))


def export_lod(obj, target: Path):
    target.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.export_scene.gltf(
        filepath=str(target),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_yup=True,
        export_cameras=False,
        export_lights=False,
    )
    if not target.is_file() or target.stat().st_size < 1024:
        raise RuntimeError(f"GLB export did not produce a usable file: {target}")

    document = glb_json(target)
    primitives = [
        primitive
        for mesh in document.get("meshes", [])
        for primitive in mesh.get("primitives", [])
    ]
    if not primitives:
        raise RuntimeError(f"Exported GLB contains no mesh primitives: {target}")
    if not all("TEXCOORD_1" in primitive.get("attributes", {}) for primitive in primitives):
        raise RuntimeError(f"Wind-weight TEXCOORD_1 missing from one or more meshes: {target}")
    return document, target.stat().st_size


def main():
    args = parse_args()
    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    source_manifest_path = args.source_root / "source-manifest.json"
    source_manifest = json.loads(source_manifest_path.read_text(encoding="utf-8"))
    source_by_id = {model["id"]: model for model in source_manifest.get("models", [])}
    levels = catalog.get("lodTargets", {})
    expected_levels = ("lod0", "lod1", "lod2")
    for level in expected_levels:
        if level not in levels or int(levels[level]["maxTriangles"]) < 100:
            raise RuntimeError(f"Missing/invalid triangle target for {level}")

    output_models = []
    for catalog_model in catalog.get("models", []):
        asset_id = catalog_model["id"]
        source_model = source_by_id.get(asset_id)
        if not source_model:
            raise RuntimeError(f"Downloaded source manifest is missing {asset_id}")
        model_root = args.source_root / asset_id
        entrypoint = model_root / source_model["gltfEntry"]
        if not entrypoint.is_file():
            raise RuntimeError(f"Downloaded glTF entrypoint is missing: {entrypoint}")

        prepared_lods = []
        for level in expected_levels:
            clear_scene()
            obj = import_model(entrypoint)
            source_height, width_ratio, depth_ratio = normalize_tree(obj)
            target_triangles = int(levels[level]["maxTriangles"])
            final_triangles = apply_lod(obj, target_triangles)
            output_path = args.output_root / asset_id / f"{asset_id}.{level}.glb"
            document, byte_count = export_lod(obj, output_path)
            prepared_lods.append({
                "level": level,
                "url": f"/assets/trees/{asset_id}/{output_path.name}",
                "bytes": byte_count,
                "triangles": final_triangles,
                "sourceHeightUnits": source_height,
                "normalizedHeightUnits": 1.0,
                "sourceWidthToHeight": width_ratio,
                "sourceDepthToHeight": depth_ratio,
                "windAttribute": "TEXCOORD_1.x",
                "materials": len(document.get("materials", [])),
                "textures": len(document.get("textures", [])),
                "meshes": len(document.get("meshes", [])),
            })
            print(
                f"TREE_MODEL_LOD_PASS asset={asset_id} level={level} "
                f"triangles={final_triangles} bytes={byte_count}",
                flush=True,
            )

        output_models.append({
            "id": asset_id,
            "displayName": catalog_model["displayName"],
            "modelFamily": catalog_model["modelFamily"],
            "botanicalMatch": catalog_model.get("botanicalMatch"),
            "leafType": catalog_model.get("leafType"),
            "leafCycle": catalog_model.get("leafCycle"),
            "sourceUrl": source_model["sourceUrl"],
            "license": source_model["license"],
            "authors": source_model.get("authors", {}),
            "sourceFilesHash": source_model.get("filesHash"),
            "upAxis": "Y",
            "normalizedHeightUnits": 1.0,
            "windAttribute": "TEXCOORD_1.x",
            "lods": prepared_lods,
        })

    args.output_root.mkdir(parents=True, exist_ok=True)
    final_manifest = {
        "schemaVersion": 1,
        "catalogId": catalog.get("catalogId"),
        "sourceProvider": "Poly Haven",
        "license": "CC0-1.0",
        "credit": catalog.get("credit"),
        "placementRule": "All geographic positions and real heights are provided by BridgePoint source tree records.",
        "wind": {
            "attribute": "TEXCOORD_1.x",
            "meaning": "0 at ground/base, increasing toward flexible branch and leaf tips",
            "windShaderAttached": False,
        },
        "models": output_models,
    }
    (args.output_root / "manifest.json").write_text(
        json.dumps(final_manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"TREE_MODEL_PREPARE_PASS models={len(output_models)}", flush=True)


if __name__ == "__main__":
    main()
