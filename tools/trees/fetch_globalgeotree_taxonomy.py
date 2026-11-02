#!/usr/bin/env python3
"""Fetch the CC-BY GlobalGeoTree taxonomic catalogue (not its 1.13 GB samples)."""

from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import re
import urllib.request
from pathlib import Path

SOURCE_URL = (
    "https://huggingface.co/datasets/yann111/GlobalGeoTree/"
    "resolve/main/files/Tree_species_catalog.csv"
)
SOURCE_NAME = "GlobalGeoTree: A multi-granular vision-language dataset for global tree species classification"
ATTRIBUTION = (
    "Mu, Y. et al. (2026), GlobalGeoTree: A multi-granular vision-language "
    "dataset for global tree species classification, Earth System Science Data 18, 1379-2026."
)
LICENSE = "CC-BY-4.0"


def normal_header(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", value.strip().lower()).strip("_")


def pick(row: dict[str, str], candidates: tuple[str, ...]) -> str | None:
    normalized = {normal_header(k): (v or "").strip() for k, v in row.items() if k}
    for candidate in candidates:
        value = normalized.get(candidate)
        if value:
            return value
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--raw-csv", type=Path)
    parser.add_argument("--minimum-species", type=int, default=20000)
    args = parser.parse_args()

    request = urllib.request.Request(
        SOURCE_URL,
        headers={"User-Agent": "BridgePoint-Tree-Taxonomy-Pipeline/1.0"},
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        body = response.read()

    if len(body) < 100_000 or b"," not in body[:4096]:
        raise RuntimeError("GlobalGeoTree taxonomy download is empty or not a CSV.")

    digest = hashlib.sha256(body).hexdigest()
    text = body.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise RuntimeError("GlobalGeoTree taxonomy CSV has no header.")

    species: dict[str, dict[str, str | None]] = {}
    for row in reader:
        scientific_name = pick(
            row,
            ("level3_species", "scientific_name", "species", "species_name", "accepted_name", "taxon_name"),
        )
        genus = pick(row, ("level2_genus", "genus", "genus_name"))
        family = pick(row, ("level1_family", "family", "family_name"))
        functional_type = pick(row, ("level0", "functional_type", "functional_group", "tree_type"))
        key = pick(row, ("species_key", "species_id", "gbif_species_key", "taxon_key", "key"))
        if not scientific_name and genus and family:
            continue
        if not scientific_name:
            continue
        scientific_name = " ".join(scientific_name.split())
        stable_key = key or scientific_name.casefold()
        species[stable_key] = {
            "key": key,
            "scientificName": scientific_name,
            "genus": genus,
            "family": family,
            "functionalType": functional_type,
        }

    if len(species) < args.minimum_species:
        raise RuntimeError(
            f"Expected at least {args.minimum_species:,} taxonomic species rows; "
            f"found {len(species):,}. Header={reader.fieldnames!r}"
        )

    records = sorted(species.values(), key=lambda item: item["scientificName"].casefold())
    genera = {item["genus"] for item in records if item["genus"]}
    families = {item["family"] for item in records if item["family"]}
    output = {
        "schemaVersion": 1,
        "catalogId": "bridgepoint-global-tree-taxonomy-ccby-v1",
        "source": SOURCE_NAME,
        "sourceUrl": SOURCE_URL,
        "sourceSha256": digest,
        "license": LICENSE,
        "attribution": ATTRIBUTION,
        "counts": {
            "species": len(records),
            "genera": len(genera),
            "families": len(families),
        },
        "fields": {
            "species": "level3_species",
            "genus": "level2_genus",
            "family": "level1_family",
            "functionalType": "level0",
        },
        "scopeNote": (
            "Taxonomic identity reference only. This catalogue does not prove "
            "the species of a BridgePoint tree point and does not provide a 3D model."
        ),
        "species": records,
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, separators=(",", ":")) + "\n", encoding="utf-8")
    if args.raw_csv:
        args.raw_csv.parent.mkdir(parents=True, exist_ok=True)
        args.raw_csv.write_bytes(body)

    print(
        "BRIDGEPOINT_GLOBAL_TREE_TAXONOMY_PASS "
        f"species={len(records)} genera={len(genera)} families={len(families)} "
        f"sha256={digest}",
        flush=True,
    )


if __name__ == "__main__":
    main()
