"""Generate an original BridgePoint procedural tree model bank in Blender.

Creates 48 distinctive parametric tree morphotypes at 3 geometry LODs each.
A separate deterministic catalog expands these into 3,072 source-stable model
variants by applying per-instance shape parameters in the WebGL renderer.

Run:
  blender --background --factory-startup \
    --python tools/trees/generate_procedural_tree_bank.py -- \
    --archetypes assets/trees/procedural-tree-archetypes-v1.json \
    --variants /tmp/bridgepoint-tree-assets/procedural-variants.json \
    --output-root /tmp/bridgepoint-tree-assets

Geometry is procedural and original BridgePoint code. Morphotypes are not
claimed to be exact botanical models for all named species.
"""

from __future__ import annotations

import argparse
import json
import math
import random
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector


LOD_QUALITY = {
    "lod0": {"branch": 1.0, "leaves": 0.86, "twig_depth": 0},
    "lod1": {"branch": 0.64, "leaves": 0.48, "twig_depth": 1},
    "lod2": {"branch": 0.30, "leaves": 0.16, "twig_depth": 2},
}


def parse_args():
    raw = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--archetypes", required=True, type=Path)
    parser.add_argument("--variants", required=True, type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    return parser.parse_args(raw)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (bpy.data.meshes, bpy.data.curves, bpy.data.materials):
        for item in list(collection):
            if item.users == 0:
                collection.remove(item)


def make_material(name, color, roughness=0.86):
    material = bpy.data.materials.new(name=name)
    material.diffuse_color = (*color, 1.0)
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    if principled:
        principled.inputs["Base Color"].default_value = (*color, 1.0)
        principled.inputs["Roughness"].default_value = roughness
    material.use_backface_culling = False
    return material


def material_palette(entry):
    seed = sum(ord(c) for c in entry["id"])
    rng = random.Random(seed)
    bark = (
        rng.uniform(0.17, 0.29),
        rng.uniform(0.105, 0.19),
        rng.uniform(0.055, 0.12),
    )
    if entry["modelFamily"] == "conifer":
        green = (0.045, 0.16, 0.075)
    elif entry["modelFamily"] == "palm":
        green = (0.12, 0.32, 0.13)
    elif entry["modelFamily"] == "broadleaf_evergreen":
        green = (0.075, 0.25, 0.105)
    else:
        green = (0.11, 0.29, 0.12)
    light = tuple(min(0.72, c * rng.uniform(1.22, 1.46)) for c in green)
    dark = tuple(max(0.018, c * 0.62) for c in green)
    tip = tuple(min(0.85, c * 1.55) for c in green)
    return [
        make_material("BP_Bark", bark),
        make_material("BP_Foliage_Dark", dark),
        make_material("BP_Foliage_Main", green),
        make_material("BP_Foliage_Light", light),
        make_material("BP_Foliage_Tips", tip),
    ]


def append_tube(geometry, points, radii, sides=6, material=0, wind_floor=0.0):
    verts, faces, face_materials, wind = geometry
    points = [Vector(p) for p in points]
    if len(points) < 2:
        return
    rings = []
    for i, point in enumerate(points):
        before = points[max(0, i - 1)]
        after = points[min(len(points) - 1, i + 1)]
        tangent = (after - before).normalized()
        reference = Vector((0.0, 0.0, 1.0))
        if abs(tangent.dot(reference)) > 0.94:
            reference = Vector((0.0, 1.0, 0.0))
        side = tangent.cross(reference).normalized()
        normal = tangent.cross(side).normalized()
        ring = []
        radius = max(0.0005, radii[min(i, len(radii) - 1)])
        height = max(0.0, min(1.0, point.z))
        weight = max(wind_floor, height ** 1.65)
        for j in range(sides):
            angle = 2.0 * math.pi * j / sides
            vertex = point + (side * math.cos(angle) + normal * math.sin(angle)) * radius
            ring.append(len(verts))
            verts.append((vertex.x, vertex.y, vertex.z))
            wind.append(weight)
        rings.append(ring)
    for ring_index in range(len(rings) - 1):
        a, b = rings[ring_index], rings[ring_index + 1]
        for j in range(sides):
            nxt = (j + 1) % sides
            faces.append((a[j], a[nxt], b[nxt], b[j]))
            face_materials.append(material)
    faces.append(tuple(reversed(rings[0])))
    face_materials.append(material)
    faces.append(tuple(rings[-1]))
    face_materials.append(material)


def append_leaf_card(geometry, anchor, direction, length, width, rng, material=2):
    verts, faces, face_materials, wind = geometry
    center = Vector(anchor)
    forward = Vector(direction).normalized()
    up = Vector((0.0, 0.0, 1.0))
    side = forward.cross(up)
    if side.length < 0.001:
        side = Vector((1.0, 0.0, 0.0))
    side.normalize()
    normal = forward.cross(side).normalized()
    roll = rng.uniform(-0.75, 0.75)
    side = side * math.cos(roll) + normal * math.sin(roll)
    tip = center + forward * length
    base = center - forward * (length * 0.13)
    left_mid = center + forward * (length * 0.36) - side * (width * 0.52)
    right_mid = center + forward * (length * 0.36) + side * (width * 0.52)
    tip_left = tip - side * (width * 0.05)
    tip_right = tip + side * (width * 0.05)
    start = len(verts)
    points = [base, left_mid, tip, right_mid, center + normal * (length * 0.045)]
    height = max(0.0, min(1.0, center.z))
    weight = max(0.1, height ** 1.8)
    for point in points:
        verts.append((point.x, point.y, point.z))
        wind.append(weight)
    faces.extend([
        (start, start + 1, start + 4),
        (start + 1, start + 2, start + 4),
        (start + 2, start + 3, start + 4),
        (start + 3, start, start + 4),
    ])
    face_materials.extend([material] * 4)


def leaf_cluster(geometry, anchor, direction, entry, rng, quality, index):
    style = entry["foliageStyle"]
    scale = 0.7 + quality["leaves"] * 0.3
    if style in ("needle", "scale"):
        count = max(3, int((7 if style == "needle" else 5) * scale))
        for i in range(count):
            angle = (2 * math.pi * i / count) + rng.uniform(-0.22, 0.22)
            axis = Vector((math.cos(angle), math.sin(angle), rng.uniform(0.12, 0.82)))
            axis = (Vector(direction).normalized() * 0.25 + axis * 0.75).normalized()
            length = rng.uniform(0.035, 0.09) * (1.2 if style == "needle" else 1.0)
            width = length * (0.085 if style == "needle" else 0.22)
            append_leaf_card(
                geometry, anchor, axis, length, width, rng,
                material=1 + (index % 3),
            )
        return

    if style in ("frond", "fan", "pinnate"):
        count = max(2, int(4 * scale))
        for i in range(count):
            angle = 2 * math.pi * i / count + rng.uniform(-0.25, 0.25)
            side = Vector((math.cos(angle), math.sin(angle), rng.uniform(-0.1, 0.45)))
            axis = (Vector(direction).normalized() * 0.52 + side * 0.48).normalized()
            append_leaf_card(
                geometry, anchor, axis,
                rng.uniform(0.12, 0.23), rng.uniform(0.012, 0.028),
                rng, material=2 + (i % 2),
            )
        return

    count = max(1, int(rng.randint(3, 7) * scale))
    base_direction = Vector(direction).normalized()
    for i in range(count):
        angle = (i * 2.399963) + rng.uniform(-0.35, 0.35)
        side = Vector((math.cos(angle), math.sin(angle), rng.uniform(-0.35, 0.55)))
        axis = (base_direction * 0.55 + side * 0.45).normalized()
        length = rng.uniform(0.055, 0.13) * (1.12 if style == "flowering" else 1.0)
        width = length * rng.uniform(0.28, 0.52)
        mat = 1 + rng.randrange(4)
        append_leaf_card(geometry, anchor, axis, length, width, rng, material=mat)


def crown_radius(entry, height_fraction, rng):
    width = float(entry.get("crownWidthRatio", 0.6))
    shape = entry["crownShape"]
    t = max(0.0, min(1.0, height_fraction))
    if shape in ("columnar", "open_column"):
        factor = 0.76 + 0.18 * math.sin(t * math.pi)
    elif shape in ("conical", "dense_conical", "open_conical", "tall_conical",
                   "tapered_conical", "pyramidal", "conical"):
        factor = max(0.16, (1.02 - t) ** 0.72)
    elif shape in ("umbrella", "flat_umbrella"):
        factor = 0.7 + 0.34 * math.sin(t * math.pi * 0.72)
    elif shape in ("weeping", "drooping_conical"):
        factor = 0.7 + 0.3 * math.sin(t * math.pi)
    elif shape in ("bottle", "candelabra"):
        factor = 0.54 + 0.25 * t
    elif shape == "compact":
        factor = 0.7 + 0.22 * math.sin(t * math.pi)
    else:
        factor = 0.68 + 0.34 * math.sin(t * math.pi * 0.85)
    return max(0.08, width * 0.5 * factor * rng.uniform(0.84, 1.15))


def grow_branch(geometry, start, direction, length, radius, depth, entry, rng, quality, branch_index):
    start = Vector(start)
    direction = Vector(direction).normalized()
    drift = Vector((rng.uniform(-0.14, 0.14), rng.uniform(-0.14, 0.14),
                    rng.uniform(-0.04, 0.12)))
    end = start + direction * length + drift * length
    mid = start.lerp(end, rng.uniform(0.40, 0.62))
    mid.z += length * rng.uniform(-0.05, 0.12)
    append_tube(
        geometry,
        [start, mid, end],
        [radius, radius * 0.63, max(0.001, radius * 0.15)],
        sides=5 if radius < 0.035 else 6,
        material=0,
        wind_floor=0.12 + depth * 0.07,
    )

    if depth > 0:
        child_count = 2 if depth == 1 else 3
        for child in range(child_count):
            t = rng.uniform(0.38, 0.82)
            anchor = start.lerp(end, t)
            angle = (2.399963 * (branch_index + child + 1)) + rng.uniform(-0.42, 0.42)
            radial = Vector((math.cos(angle), math.sin(angle), 0.0))
            shape = entry["crownShape"]
            slope = 0.34
            if shape in ("weeping", "drooping_conical"):
                slope = -0.24 - (t * 0.2)
            elif shape in ("umbrella", "flat_umbrella"):
                slope = 0.1 - t * 0.25
            elif shape in ("columnar", "open_column"):
                slope = 0.48
            elif entry["modelFamily"] == "conifer":
                slope = 0.4
            child_dir = (direction * 0.34 + radial * 0.72 + Vector((0, 0, slope))).normalized()
            child_length = length * rng.uniform(0.42, 0.66)
            child_radius = radius * rng.uniform(0.42, 0.62)
            grow_branch(
                geometry, anchor, child_dir, child_length, child_radius,
                depth - 1, entry, rng, quality, branch_index * 3 + child + 1,
            )
    else:
        cluster_count = max(1, int(4 * quality["leaves"]))
        for cluster in range(cluster_count):
            t = 0.65 + 0.35 * (cluster / max(1, cluster_count - 1))
            anchor = start.lerp(end, t)
            leaf_cluster(
                geometry, anchor, direction + Vector((rng.uniform(-0.4, 0.4),
                rng.uniform(-0.4, 0.4), rng.uniform(-0.2, 0.55))),
                entry, rng, quality, branch_index + cluster,
            )


def generate_bamboo(geometry, entry, rng, quality):
    stems = max(4, int(entry["primaryBranches"] * quality["branch"]))
    for stem in range(stems):
        angle = stem * 2.399963 + rng.uniform(-0.35, 0.35)
        radius = rng.uniform(0.12, 0.42)
        base = Vector((math.cos(angle) * radius, math.sin(angle) * radius, 0))
        height = rng.uniform(0.72, 1.0)
        points = [
            base,
            base + Vector((rng.uniform(-0.025, 0.025), rng.uniform(-0.025, 0.025), height * 0.52)),
            base + Vector((rng.uniform(-0.04, 0.04), rng.uniform(-0.04, 0.04), height)),
        ]
        append_tube(geometry, points, [0.024, 0.017, 0.006], sides=5, material=0, wind_floor=0.12)
        for node in range(2, 8):
            fraction = node / 9
            anchor = points[0].lerp(points[-1], fraction)
            direction = Vector((math.cos(angle + node), math.sin(angle + node), 0.35)).normalized()
            grow_branch(geometry, anchor, direction, 0.11, 0.009, 0,
                        entry, rng, quality, stem * 20 + node)


def generate_palm(geometry, entry, rng, quality):
    trunk_height = rng.uniform(0.55, 0.72)
    trunk_radius = rng.uniform(0.035, 0.055)
    curve = [
        Vector((0, 0, 0)),
        Vector((rng.uniform(-0.02, 0.02), rng.uniform(-0.02, 0.02), trunk_height * 0.52)),
        Vector((rng.uniform(-0.04, 0.04), rng.uniform(-0.04, 0.04), trunk_height)),
    ]
    append_tube(geometry, curve, [trunk_radius * 1.65, trunk_radius, trunk_radius * 0.62],
                sides=9, material=0, wind_floor=0.06)
    fronds = max(8, int(entry["primaryBranches"] * quality["branch"]))
    for frond in range(fronds):
        angle = 2 * math.pi * frond / fronds + rng.uniform(-0.18, 0.18)
        horizontal = Vector((math.cos(angle), math.sin(angle), 0))
        fan = entry["foliageStyle"] == "fan"
        reach = rng.uniform(0.28, 0.46)
        droop = rng.uniform(0.18, 0.42)
        end = curve[-1] + horizontal * reach + Vector((0, 0, -droop))
        mid = curve[-1].lerp(end, 0.55) + Vector((0, 0, 0.08))
        append_tube(geometry, [curve[-1], mid, end], [0.011, 0.007, 0.002],
                    sides=4, material=0, wind_floor=0.76)
        leaflet_count = max(6, int(22 * quality["leaves"]))
        for leaf in range(leaflet_count):
            t = 0.18 + 0.78 * leaf / leaflet_count
            anchor = curve[-1].lerp(end, t)
            leaf_dir = horizontal * (0.35 if fan else 0.7) + Vector((0, 0, -0.15 - t * 0.2))
            side_angle = (leaf % 2) * 2 - 1
            side_dir = Vector((-horizontal.y, horizontal.x, 0)) * side_angle
            leaf_dir = (leaf_dir + side_dir * (0.32 if fan else 0.16)).normalized()
            append_leaf_card(
                geometry, anchor, leaf_dir,
                rng.uniform(0.09, 0.16), rng.uniform(0.012, 0.026), rng,
                material=2 + (leaf % 2),
            )


def generate_tree(entry, quality, seed):
    rng = random.Random(seed)
    geometry = ([], [], [], [])
    verts, faces, face_materials, wind = geometry

    if entry["id"] == "bamboo_grove":
        generate_bamboo(geometry, entry, rng, quality)
        return geometry
    if entry["modelFamily"] == "palm" or entry["id"] == "tree_fern":
        generate_palm(geometry, entry, rng, quality)
        return geometry

    trunk_height = rng.uniform(0.58, 0.78)
    if entry["id"] == "baobab_bottle":
        trunk_radius = rng.uniform(0.13, 0.19)
    elif entry["trunkStyle"] == "multi":
        trunk_radius = rng.uniform(0.045, 0.075)
    else:
        trunk_radius = rng.uniform(0.055, 0.09)

    lean_x = rng.uniform(-0.025, 0.025)
    lean_y = rng.uniform(-0.025, 0.025)
    trunk = [
        Vector((0, 0, 0)),
        Vector((lean_x * 0.3, lean_y * 0.3, trunk_height * 0.48)),
        Vector((lean_x, lean_y, trunk_height)),
    ]
    append_tube(geometry, trunk,
                [trunk_radius * 1.55, trunk_radius * 0.93, trunk_radius * 0.42],
                sides=10, material=0, wind_floor=0.04)

    stems = 1
    if entry["trunkStyle"] == "multi":
        stems = rng.randint(2, 4)
    for stem in range(1, stems):
        angle = 2 * math.pi * stem / stems + rng.uniform(-0.3, 0.3)
        base = Vector((math.cos(angle) * 0.045, math.sin(angle) * 0.045, 0.0))
        top = base + Vector((math.cos(angle) * 0.05, math.sin(angle) * 0.05, trunk_height * rng.uniform(0.72, 0.94)))
        append_tube(geometry, [base, base.lerp(top, 0.5), top],
                    [trunk_radius * 0.75, trunk_radius * 0.5, trunk_radius * 0.22],
                    sides=7, material=0, wind_floor=0.06)

    primary_count = max(3, int(entry["primaryBranches"] * quality["branch"]))
    depth = max(0, int(entry["branchLevels"]) - int(quality["twig_depth"]))
    if entry["id"] in ("baobab_bottle", "dragon_blood_tree"):
        depth = max(0, depth - 1)

    for branch in range(primary_count):
        azimuth = 2 * math.pi * branch / primary_count + rng.uniform(-0.22, 0.22)
        start_fraction = rng.uniform(0.30, 0.84)
        start = Vector((lean_x * start_fraction, lean_y * start_fraction,
                        trunk_height * start_fraction))
        radial = Vector((math.cos(azimuth), math.sin(azimuth), 0.0))
        fraction = start_fraction
        radius_ratio = crown_radius(entry, fraction, rng)
        length = max(0.09, radius_ratio * rng.uniform(0.72, 1.08))
        slope = rng.uniform(0.24, 0.52)
        if entry["crownShape"] in ("weeping", "drooping_conical"):
            slope = rng.uniform(-0.42, -0.18)
        elif entry["crownShape"] in ("umbrella", "flat_umbrella"):
            slope = rng.uniform(-0.12, 0.24)
        elif entry["crownShape"] == "columnar":
            slope = rng.uniform(0.48, 0.76)
        direction = (radial * 0.82 + Vector((0, 0, slope))).normalized()
        if entry["modelFamily"] == "conifer":
            direction.z = max(0.22, direction.z)
            direction.normalize()
        grow_branch(
            geometry, start, direction, length,
            trunk_radius * rng.uniform(0.18, 0.34),
            depth, entry, rng, quality, branch,
        )

    if entry["modelFamily"] == "conifer":
        # Dense needle clusters are distributed along the primary crown tiers.
        for branch in range(primary_count):
            azimuth = 2 * math.pi * branch / primary_count
            for level in range(max(3, int(8 * quality["branch"]))):
                t = 0.32 + 0.62 * level / max(1, int(8 * quality["branch"]) - 1)
                radius = crown_radius(entry, t, rng)
                anchor = Vector((math.cos(azimuth) * radius,
                                 math.sin(azimuth) * radius,
                                 trunk_height * t))
                direction = Vector((math.cos(azimuth), math.sin(azimuth), 0.48)).normalized()
                leaf_cluster(geometry, anchor, direction, entry, rng, quality, branch + level)

    return geometry


def create_mesh_object(entry, geometry):
    verts, faces, face_materials, wind = geometry
    if not verts:
        raise RuntimeError(f"Procedural tree has no vertices: {entry['id']}")
    min_x = min(point[0] for point in verts)
    max_x = max(point[0] for point in verts)
    min_y = min(point[1] for point in verts)
    max_y = max(point[1] for point in verts)
    min_z = min(point[2] for point in verts)
    max_z = max(point[2] for point in verts)
    source_height = max_z - min_z
    if not math.isfinite(source_height) or source_height <= 0.05:
        raise RuntimeError(f"Invalid procedural tree height: {entry['id']} {source_height}")
    center_x = (min_x + max_x) * 0.5
    center_y = (min_y + max_y) * 0.5
    verts = [
        ((x - center_x) / source_height,
         (y - center_y) / source_height,
         (z - min_z) / source_height)
        for x, y, z in verts
    ]
    mesh = bpy.data.meshes.new(entry["id"] + "_mesh")
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(entry["id"], mesh)
    bpy.context.collection.objects.link(obj)

    for material in material_palette(entry):
        mesh.materials.append(material)
    for polygon, material_index in zip(mesh.polygons, face_materials):
        polygon.material_index = max(0, min(len(mesh.materials) - 1, material_index))
        polygon.use_smooth = material_index == 0

    uv0 = mesh.uv_layers.new(name="UVMap")
    uv1 = mesh.uv_layers.new(name="BP_WIND_WEIGHT")
    for loop in mesh.loops:
        vertex = mesh.vertices[loop.vertex_index].co
        uv0.data[loop.index].uv = (vertex.x + 0.5, vertex.z)
        weight = wind[loop.vertex_index] if loop.vertex_index < len(wind) else max(0.0, vertex.z) ** 1.6
        uv1.data[loop.index].uv = (max(0.0, min(1.0, weight)), max(0.0, min(1.0, vertex.z)))
    return obj


def validate_glb(path: Path):
    data = path.read_bytes()
    if len(data) < 20 or data[:4] != b"glTF":
        raise RuntimeError(f"Invalid GLB: {path}")
    version, total = struct.unpack_from("<II", data, 4)
    if version != 2 or total != len(data):
        raise RuntimeError(f"Invalid GLB version/length: {path}")
    chunk_length, chunk_type = struct.unpack_from("<II", data, 12)
    if chunk_type != 0x4E4F534A:
        raise RuntimeError(f"GLB JSON chunk missing: {path}")
    doc = json.loads(data[20:20 + chunk_length].decode("utf-8"))
    primitives = [
        primitive for mesh in doc.get("meshes", [])
        for primitive in mesh.get("primitives", [])
    ]
    if not primitives or not all(
        "TEXCOORD_1" in item.get("attributes", {}) for item in primitives
    ):
        raise RuntimeError(f"Tree GLB missing wind-weight TEXCOORD_1: {path}")
    return doc


def export_glb(obj, target: Path):
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    target.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.export_scene.gltf(
        filepath=str(target),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_colors=True,
        export_materials="EXPORT",
        export_image_format="AUTO",
        export_yup=True,
        export_cameras=False,
        export_lights=False,
    )
    document = validate_glb(target)
    triangles = sum(
        len(mesh.get("primitives", [])) for mesh in document.get("meshes", [])
    )
    return target.stat().st_size, triangles


def main():
    args = parse_args()
    archetype_doc = json.loads(args.archetypes.read_text(encoding="utf-8"))
    variant_doc = json.loads(args.variants.read_text(encoding="utf-8"))
    variant_count = int(variant_doc.get("variantCount", 0))
    expected = int(archetype_doc.get("modelBaseCount", 0)) * int(
        archetype_doc.get("variantsPerArchetype", 0)
    )
    if variant_count != expected or variant_count < 2000:
        raise RuntimeError(f"Procedural variant count mismatch: {variant_count} != {expected}")

    args.output_root.mkdir(parents=True, exist_ok=True)
    manifest_path = args.output_root / "manifest.json"
    if manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    else:
        manifest = {
            "schemaVersion": 1,
            "catalogId": "bridgepoint-procedural-tree-bank-v1",
            "sourceProvider": "BridgePoint procedural geometry",
            "license": "MIXED_PER_ASSET",
            "credit": "Original BridgePoint procedural tree geometry; GlobalGeoTree taxonomy reference is CC BY 4.0.",
            "wind": {"attribute": "TEXCOORD_1.x", "windShaderAttached": False},
            "models": [],
        }
    procedural_models = []

    for entry in archetype_doc.get("entries", []):
        model_lods = []
        for lod, quality in LOD_QUALITY.items():
            clear_scene()
            seed = sum(ord(c) for c in (entry["id"] + lod))
            geometry = generate_tree(entry, quality, seed)
            if len(geometry[0]) < 20 or len(geometry[1]) < 10:
                raise RuntimeError(f"Procedural tree geometry is empty: {entry['id']} {lod}")
            obj = create_mesh_object(entry, geometry)
            target = args.output_root / "procedural" / entry["id"] / f"{entry['id']}.{lod}.glb"
            size, primitive_count = export_glb(obj, target)
            triangles = sum(max(1, len(poly.vertices) - 2) for poly in obj.data.polygons)
            model_lods.append({
                "level": lod,
                "url": f"/assets/trees/procedural/{entry['id']}/{target.name}",
                "bytes": size,
                "triangles": triangles,
                "meshes": 1,
                "windAttribute": "TEXCOORD_1.x",
                "variantParameters": True,
            })
            print(
                f"TREE_PROCEDURAL_MODEL_PASS id={entry['id']} lod={lod} "
                f"vertices={len(obj.data.vertices)} triangles={triangles} bytes={size}",
                flush=True,
            )

        procedural_models.append({
            "id": "proc_" + entry["id"],
            "displayName": entry["displayName"],
            "modelFamily": entry["modelFamily"],
            "modelType": "PROCEDURAL_ARCHETYPE",
            "crownShape": entry["crownShape"],
            "crownWidthRatio": entry.get("crownWidthRatio"),
            "crownHeightRatio": entry.get("crownHeightRatio"),
            "foliageStyle": entry.get("foliageStyle"),
            "trunkStyle": entry.get("trunkStyle"),
            "leafType": entry["leafType"],
            "leafCycle": entry["leafCycle"],
            "knownGenera": entry.get("knownGenera", []),
            "morphologyTruth": "PROCEDURAL_MORPHOTYPE_PROXY",
            "license": "Apache-2.0",
            "sourceUrl": "https://github.com/olekingkole28-dot/bridgepoint-live",
            "normalizedHeightUnits": 1.0,
            "upAxis": "Y",
            "windAttribute": "TEXCOORD_1.x",
            "lods": model_lods,
        })

    current = {item["id"]: item for item in manifest.get("models", [])}
    for model in procedural_models:
        current[model["id"]] = model
    manifest["models"] = list(current.values())
    manifest["license"] = "MIXED_PER_ASSET"
    manifest["proceduralModelCount"] = len(procedural_models)
    manifest["proceduralVariantCount"] = variant_count
    manifest["proceduralVariantCatalog"] = "/assets/trees/procedural-variants.json"
    manifest["treeModelCount"] = len(manifest["models"])
    manifest["lodTargets"] = archetype_doc.get("lodTargets", {})
    manifest["assetBankTruth"] = (
        "GLB entries are archetype geometry. Procedural variant IDs are distinct "
        "instance morph profiles applied by the renderer; neither is an exact "
        "species model unless source metadata independently verifies that match."
    )
    manifest["taxonomyReference"] = variant_doc.get("taxonomyReference")
    manifest_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")

    variant_path = args.output_root / "procedural-variants.json"
    if variant_path.resolve() != args.variants.resolve():
        variant_path.write_text(
            args.variants.read_text(encoding="utf-8"), encoding="utf-8"
        )

    print(
        f"BRIDGEPOINT_PROCEDURAL_TREE_BANK_PASS "
        f"archetypes={len(procedural_models)} variants={variant_count} "
        f"totalModels={len(manifest['models'])}",
        flush=True,
    )


if __name__ == "__main__":
    main()
