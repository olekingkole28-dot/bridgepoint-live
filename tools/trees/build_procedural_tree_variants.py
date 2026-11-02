#!/usr/bin/env python3
"""Create deterministic, source-safe per-tree model variation profiles."""

from __future__ import annotations

import argparse
import hashlib
import json
import random
from pathlib import Path


def stable_int(value: str) -> int:
    return int(hashlib.sha256(value.encode("utf-8")).hexdigest()[:16], 16)


def build_variants(archetypes: dict, count_per_archetype: int) -> list[dict]:
    output = []
    for archetype in archetypes.get("entries", []):
        for index in range(count_per_archetype):
            variant_id = f"{archetype['id']}-v{index:03d}"
            rng = random.Random(stable_int(variant_id))
            params = {
                "crownSpread": round(rng.uniform(0.82, 1.22), 4),
                "crownDepth": round(rng.uniform(0.82, 1.20), 4),
                "crownOffset": round(rng.uniform(-0.055, 0.055), 4),
                "trunkLeanX": round(rng.uniform(-0.045, 0.045), 4),
                "trunkLeanZ": round(rng.uniform(-0.045, 0.045), 4),
                "branchAsymmetry": round(rng.uniform(-0.20, 0.20), 4),
                "leafScale": round(rng.uniform(0.84, 1.18), 4),
                "foliageDensity": round(rng.uniform(0.82, 1.18), 4),
                "windPhase": round(rng.uniform(0.0, 6.283185), 4),
            }
            output.append({
                "id": variant_id,
                "archetypeId": archetype["id"],
                "variantIndex": index,
                "seed": stable_int(variant_id) & 0xFFFFFFFF,
                "parameters": params,
                "truth": "PROCEDURAL_MORPHOTYPE_VARIANT",
            })
    return output


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--archetypes", type=Path, required=True)
    parser.add_argument("--taxonomy", type=Path)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--variants-per-archetype", type=int, default=64)
    args = parser.parse_args()

    archetypes = json.loads(args.archetypes.read_text(encoding="utf-8"))
    variants = build_variants(archetypes, args.variants_per_archetype)
    taxonomy = None
    if args.taxonomy and args.taxonomy.is_file():
        taxonomy = json.loads(args.taxonomy.read_text(encoding="utf-8"))

    result = {
        "schemaVersion": 1,
        "catalogId": "bridgepoint-procedural-tree-variants-v1",
        "modelType": "PROCEDURAL_MODEL_VARIANTS_NOT_EXACT_SPECIES_MESHES",
        "archetypeCount": len(archetypes.get("entries", [])),
        "variantsPerArchetype": args.variants_per_archetype,
        "variantCount": len(variants),
        "taxonomyReference": {
            "catalogId": taxonomy.get("catalogId"),
            "license": taxonomy.get("license"),
            "counts": taxonomy.get("counts"),
            "attribution": taxonomy.get("attribution"),
        } if taxonomy else None,
        "variantSelection": (
            "SHA256(source_tree_identity|archetype_id) modulo variants_per_archetype; "
            "stable for the same source record."
        ),
        "variants": variants,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, separators=(",", ":")) + "\n", encoding="utf-8")
    print(
        f"BRIDGEPOINT_PROCEDURAL_VARIANT_CATALOG_PASS "
        f"archetypes={result['archetypeCount']} variants={result['variantCount']}",
        flush=True,
    )


if __name__ == "__main__":
    main()
