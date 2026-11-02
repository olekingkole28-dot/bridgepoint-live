#!/usr/bin/env python3
"""Validate BridgePoint's source, procedural tree bank and generated GLB assets."""

from __future__ import annotations

import ast
import json
import struct
import sys
from pathlib import Path
from urllib.parse import urlparse

REPO = Path(__file__).resolve().parents[1]
SOURCE_CATALOG_PATH = REPO / "assets" / "trees" / "tree-model-catalog-v1.json"
ARCHETYPE_PATH = REPO / "assets" / "trees" / "procedural-tree-archetypes-v1.json"


def validate_source_catalog() -> dict:
    catalog = json.loads(SOURCE_CATALOG_PATH.read_text(encoding="utf-8"))
    assert catalog["schemaVersion"] == 1
    assert catalog["sourceProvider"] == "Poly Haven"
    assert catalog["license"] == "CC0-1.0"
    assert "Poly Haven" in catalog["credit"]
    assert len(catalog["models"]) >= 3

    ids = set()
    for model in catalog["models"]:
        asset_id = model["id"]
        assert asset_id not in ids, f"duplicate source asset ID: {asset_id}"
        ids.add(asset_id)
        assert urlparse(model["sourceUrl"]).hostname == "polyhaven.com"
        assert model["modelFamily"] in {"conifer", "broadleaf", "palm", "desert_succulent"}
        assert model["leafType"] in {"needle", "broadleaf", "frond", "succulent"}
        assert model["botanicalMatch"]["confidence"]
        assert "speciesVerified" not in model, "asset tags are not field species verification"

    lods = catalog["lodTargets"]
    targets = [int(lods[name]["maxTriangles"]) for name in ("lod0", "lod1", "lod2")]
    assert targets[0] > targets[1] > targets[2] > 0
    assert targets[0] <= 150_000 and targets[2] <= 10_000
    return catalog


def validate_archetypes() -> dict:
    catalog = json.loads(ARCHETYPE_PATH.read_text(encoding="utf-8"))
    entries = catalog["entries"]
    assert catalog["schemaVersion"] == 1
    assert catalog["modelBaseCount"] == 48
    assert len(entries) == 48
    assert catalog["variantsPerArchetype"] == 64
    assert catalog["proceduralVariantCount"] == 3072

    ids = set()
    for entry in entries:
        assert entry["id"] not in ids
        ids.add(entry["id"])
        assert entry["modelFamily"] in {
            "broadleaf_deciduous", "broadleaf_evergreen", "conifer", "palm", "other"
        }
        assert entry["crownShape"]
        assert entry["foliageStyle"]
        assert entry["trunkStyle"]
        assert entry["modelTruth"] == "PROCEDURAL_MORPHOTYPE_PROXY"
        assert isinstance(entry["knownGenera"], list) and entry["knownGenera"]

    for level in ("lod0", "lod1", "lod2"):
        assert int(catalog["lodTargets"][level]["maxTriangles"]) > 0
    assert (
        catalog["lodTargets"]["lod0"]["maxTriangles"]
        > catalog["lodTargets"]["lod1"]["maxTriangles"]
        > catalog["lodTargets"]["lod2"]["maxTriangles"]
    )
    return catalog


def validate_source_scripts() -> None:
    for relative in (
        "tools/trees/fetch_polyhaven_tree_models.py",
        "tools/trees/prepare_tree_models_blender.py",
        "tools/trees/fetch_globalgeotree_taxonomy.py",
        "tools/trees/build_procedural_tree_variants.py",
        "tools/trees/generate_procedural_tree_bank.py",
    ):
        path = REPO / relative
        ast.parse(path.read_text(encoding="utf-8"), filename=relative)


def read_glb_json(path: Path) -> dict:
    raw = path.read_bytes()
    assert len(raw) >= 20, f"GLB too small: {path}"
    assert raw[:4] == b"glTF", f"Invalid GLB magic: {path}"
    version, length = struct.unpack_from("<II", raw, 4)
    assert version == 2 and length == len(raw), f"Invalid GLB header: {path}"
    chunk_length, chunk_type = struct.unpack_from("<II", raw, 12)
    assert chunk_type == 0x4E4F534A, f"GLB JSON chunk missing: {path}"
    return json.loads(raw[20:20 + chunk_length].decode("utf-8"))


def validate_built_assets(output: Path, archetypes: dict) -> None:
    manifest_path = output / "manifest.json"
    variants_path = output / "procedural-variants.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    variants = json.loads(variants_path.read_text(encoding="utf-8"))

    expected_model_ids = {"proc_" + item["id"] for item in archetypes["entries"]}
    models = {model["id"]: model for model in manifest["models"]}
    assert set(models) == expected_model_ids
    assert manifest["schemaVersion"] == 1
    assert manifest["license"] == "MIXED_PER_ASSET"
    assert manifest["proceduralModelCount"] == 48
    assert manifest["proceduralVariantCount"] == 3072
    assert manifest["treeModelCount"] == 48
    assert manifest["wind"]["attribute"] == "TEXCOORD_1.x"
    assert manifest["wind"]["windShaderAttached"] is False

    assert variants["schemaVersion"] == 1
    assert variants["variantCount"] == 3072
    assert len(variants["variants"]) == 3072
    variant_ids = {item["id"] for item in variants["variants"]}
    assert len(variant_ids) == 3072
    per_archetype: dict[str, int] = {}
    for variant in variants["variants"]:
        per_archetype[variant["archetypeId"]] = per_archetype.get(variant["archetypeId"], 0) + 1
        for parameter in (
            "crownSpread", "crownDepth", "crownOffset", "trunkLeanX",
            "trunkLeanZ", "branchAsymmetry", "leafScale", "foliageDensity", "windPhase"
        ):
            assert parameter in variant["parameters"]
    assert len(per_archetype) == 48 and set(per_archetype.values()) == {64}

    taxonomy = output / "global-tree-taxonomy.json"
    if taxonomy.is_file():
        taxonomy_doc = json.loads(taxonomy.read_text(encoding="utf-8"))
        assert taxonomy_doc["license"] == "CC-BY-4.0"
        assert taxonomy_doc["counts"]["species"] >= 20_000
        assert taxonomy_doc["attribution"]

    target_by_level = {
        name: int(archetypes["lodTargets"][name]["maxTriangles"])
        for name in ("lod0", "lod1", "lod2")
    }
    for asset_id, model in models.items():
        archetype_id = asset_id.removeprefix("proc_")
        source_entry = next(item for item in archetypes["entries"] if item["id"] == archetype_id)
        assert model["modelType"] == "PROCEDURAL_ARCHETYPE"
        assert model["license"] == "Apache-2.0"
        assert model["morphologyTruth"] == "PROCEDURAL_MORPHOTYPE_PROXY"
        assert model["knownGenera"] == source_entry["knownGenera"]
        assert model["normalizedHeightUnits"] == 1.0
        assert model["upAxis"] == "Y"
        assert model["windAttribute"] == "TEXCOORD_1.x"
        lods = {lod["level"]: lod for lod in model["lods"]}
        assert set(lods) == {"lod0", "lod1", "lod2"}
        for level, lod in lods.items():
            file_path = output / "procedural" / archetype_id / f"{archetype_id}.{level}.glb"
            assert file_path.is_file(), f"missing procedural GLB: {file_path}"
            assert 1024 <= file_path.stat().st_size <= 12 * 1024 * 1024, (
                f"procedural GLB outside file budget: {file_path} ({file_path.stat().st_size})"
            )
            assert lod["triangles"] <= target_by_level[level] * 1.25, (
                f"{asset_id}/{level} exceeded triangle budget: {lod['triangles']}"
            )
            assert lod["windAttribute"] == "TEXCOORD_1.x"
            document = read_glb_json(file_path)
            primitives = [
                primitive
                for mesh in document.get("meshes", [])
                for primitive in mesh.get("primitives", [])
            ]
            assert primitives, f"no drawable mesh primitives in {file_path}"
            assert all(
                "TEXCOORD_1" in primitive.get("attributes", {})
                for primitive in primitives
            ), f"wind attribute missing from {file_path}"


def main() -> int:
    validate_source_catalog()
    archetypes = validate_archetypes()
    validate_source_scripts()
    print(
        "BRIDGEPOINT_TREE_CATALOG_STATIC_PASS "
        f"archetypes={archetypes['modelBaseCount']} "
        f"variantTargets={archetypes['proceduralVariantCount']}"
    )

    if "--built-assets" in sys.argv:
        index = sys.argv.index("--built-assets")
        if index + 1 >= len(sys.argv):
            raise SystemExit("--built-assets requires an output folder")
        validate_built_assets(Path(sys.argv[index + 1]), archetypes)
        print("BRIDGEPOINT_PROCEDURAL_TREE_GLB_VALIDATION_PASS")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
