#!/usr/bin/env python3
"""Offline validation for BridgePoint's reviewed tree asset pipeline."""

from __future__ import annotations

import ast
import json
import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parent
CATALOG_PATH = REPO / "assets" / "trees" / "tree-model-catalog-v1.json"


def validate_catalog() -> dict:
    catalog = json.loads(CATALOG_PATH.read_text(encoding="utf-8"))
    assert catalog["schemaVersion"] == 1
    assert catalog["sourceProvider"] == "Poly Haven"
    assert catalog["license"] == "CC0-1.0"
    assert "Poly Haven" in catalog["credit"]
    assert len(catalog["models"]) >= 3

    ids = set()
    for model in catalog["models"]:
        asset_id = model["id"]
        assert asset_id not in ids, f"duplicate asset ID: {asset_id}"
        ids.add(asset_id)
        assert urlparse(model["sourceUrl"]).hostname == "polyhaven.com"
        assert model["modelFamily"] in {"conifer", "broadleaf", "palm", "desert_succulent"}
        assert model["leafType"] in {"needle", "broadleaf", "frond", "succulent"}
        assert model["botanicalMatch"]["confidence"], f"missing match confidence: {asset_id}"
        assert "speciesVerified" not in model, "do not treat a model label as field verification"

    lods = catalog["lodTargets"]
    targets = [int(lods[name]["maxTriangles"]) for name in ("lod0", "lod1", "lod2")]
    assert targets[0] > targets[1] > targets[2] > 0
    assert targets[0] <= 150_000 and targets[2] <= 10_000
    return catalog


def validate_source_scripts() -> None:
    for relative in (
        "tools/trees/fetch_polyhaven_tree_models.py",
        "tools/trees/prepare_tree_models_blender.py",
    ):
        path = REPO / relative
        ast.parse(path.read_text(encoding="utf-8"), filename=relative)


def validate_built_assets(output: Path, expected_ids: set[str], catalog: dict) -> None:
    manifest_path = output / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["schemaVersion"] == 1
    assert manifest["license"] == "CC0-1.0"
    assert manifest["wind"]["attribute"] == "TEXCOORD_1.x"
    assert manifest["wind"]["windShaderAttached"] is False
    models = {model["id"]: model for model in manifest["models"]}
    assert set(models) == expected_ids

    target_by_level = {
        name: int(catalog["lodTargets"][name]["maxTriangles"])
        for name in ("lod0", "lod1", "lod2")
    }
    for asset_id, model in models.items():
        assert model["normalizedHeightUnits"] == 1.0
        assert model["upAxis"] == "Y"
        assert model["windAttribute"] == "TEXCOORD_1.x"
        lods = {lod["level"]: lod for lod in model["lods"]}
        assert set(lods) == {"lod0", "lod1", "lod2"}
        for level, lod in lods.items():
            file_path = output / asset_id / f"{asset_id}.{level}.glb"
            assert file_path.is_file(), f"missing GLB: {file_path}"
            assert file_path.stat().st_size >= 1024
            assert file_path.stat().st_size <= 35 * 1024 * 1024, (
                f"GLB exceeds the initial single-asset budget: {file_path}"
            )
            assert lod["triangles"] <= target_by_level[level] * 1.25, (
                f"{asset_id}/{level} exceeded triangle budget"
            )
            assert lod["windAttribute"] == "TEXCOORD_1.x"
            assert lod["meshes"] >= 1
            assert lod["materials"] >= 1


def main() -> int:
    catalog = validate_catalog()
    validate_source_scripts()
    print("BRIDGEPOINT_TREE_CATALOG_STATIC_PASS")

    if "--built-assets" in sys.argv:
        index = sys.argv.index("--built-assets")
        if index + 1 >= len(sys.argv):
            raise SystemExit("--built-assets requires an output folder")
        validate_built_assets(Path(sys.argv[index + 1]), {m["id"] for m in catalog["models"]}, catalog)
        print("BRIDGEPOINT_TREE_GLB_ASSET_VALIDATION_PASS")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
