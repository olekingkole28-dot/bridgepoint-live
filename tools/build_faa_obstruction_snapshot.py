#!/usr/bin/env python3
"""Build a compact, source-faithful FAA Digital Obstacle File tower snapshot."""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import gzip
import io
import json
import math
import urllib.request
import zipfile
from collections import Counter
from pathlib import Path

SOURCE_URL = "https://aeronav.faa.gov/Obst_Data/DAILY_DOF_CSV.ZIP"
SOURCE_PAGE = "https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/dailydof/"
TARGET_TYPES = {"TOWER", "T-L TWR", "T-L TOWER", "ANTENNA", "BLDG-TWR", "CTRL TWR", "CRANE"}
SCHEMA = [
    "OAS", "COUNTRY", "STATE", "CITY", "LATDEC", "LONDEC", "TYPE",
    "QUANTITY", "AGL", "AMSL", "VERIFIED STATUS", "LIGHTING", "ACCURACY",
    "MARKING", "FAA STUDY", "ACTION", "JDATE",
]


def clean(value: object) -> str:
    return str(value if value is not None else "").strip()


def number(value: object) -> float | None:
    text = clean(value).replace(",", "")
    if not text:
        return None
    try:
        result = float(text)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def compact_record(row: dict[str, str]) -> list[object] | None:
    kind = clean(row.get("TYPE")).upper()
    action = clean(row.get("ACTION")).upper()
    if kind not in TARGET_TYPES or action == "D":
        return None
    latitude = number(row.get("LATDEC"))
    longitude = number(row.get("LONDEC"))
    agl = number(row.get("AGL"))
    if latitude is None or longitude is None or agl is None:
        return None
    if not (-85 <= latitude <= 85 and -180 <= longitude <= 180 and 0 < agl <= 100000):
        return None
    identifier = clean(row.get("OAS"))
    if not identifier:
        return None
    quantity = number(row.get("QUANTITY"))
    amsl = number(row.get("AMSL"))
    return [
        identifier,
        clean(row.get("COUNTRY")) or "US",
        clean(row.get("STATE")),
        clean(row.get("CITY")),
        latitude,
        longitude,
        kind,
        int(quantity) if quantity is not None and quantity > 0 else 1,
        int(agl),
        int(amsl) if amsl is not None and amsl > 0 else None,
        clean(row.get("VERIFIED STATUS")).upper() or "U",
        clean(row.get("LIGHTING")),
        clean(row.get("ACCURACY")),
        clean(row.get("MARKING")),
        clean(row.get("FAA STUDY")),
        action,
        clean(row.get("JDATE")),
    ]


def build_snapshot(csv_stream: io.TextIOBase, output: Path) -> dict[str, object]:
    reader = csv.DictReader(csv_stream)
    if not reader.fieldnames or not set(SCHEMA).issubset(set(reader.fieldnames)):
        raise ValueError("FAA DOF CSV header does not match the expected schema")
    rows: list[list[object]] = []
    type_counts: Counter[str] = Counter()
    country_counts: Counter[str] = Counter()
    verification_counts: Counter[str] = Counter()
    source_count = 0
    for raw in reader:
        source_count += 1
        record = compact_record(raw)
        if record is None:
            continue
        rows.append(record)
        type_counts[str(record[6])] += 1
        country_counts[str(record[1])] += 1
        verification_counts[str(record[10])] += 1
    if not rows:
        raise ValueError("FAA DOF download contained no usable tower/antenna records")
    metadata = {
        "schemaVersion": 1,
        "builtAtUtc": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z"),
        "source": "FAA Daily Digital Obstacle File (DDOF)",
        "sourceUrl": SOURCE_URL,
        "sourcePage": SOURCE_PAGE,
        "sourceRecordCount": source_count,
        "filteredRecordCount": len(rows),
        "fields": [
            "faaId", "country", "state", "city", "latitude", "longitude", "type",
            "quantity", "aglFeet", "amslFeet", "verification", "lighting",
            "accuracy", "marking", "faaStudy", "action", "julianDate",
        ],
        "includedTypes": sorted(TARGET_TYPES),
        "excludedAction": ["D"],
        "typeCounts": dict(sorted(type_counts.items())),
        "countryCounts": dict(sorted(country_counts.items())),
        "verificationCounts": dict(sorted(verification_counts.items())),
        "coverageNote": "United States with limited surrounding-region coverage; not a global or exhaustive obstruction registry.",
        "geometryNote": "FAA DOF supplies obstacle point coordinates and reported heights, not structural CAD drawings.",
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(output, "wt", encoding="utf-8", compresslevel=9, newline="") as target:
        json.dump({"metadata": metadata, "rows": rows}, target, ensure_ascii=False, separators=(",", ":"))
    return metadata


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--zip", type=Path, help="Use a previously downloaded FAA ZIP instead of downloading")
    args = parser.parse_args()
    archive_path = args.zip
    if archive_path is None:
        request = urllib.request.Request(SOURCE_URL, headers={"User-Agent": "BridgePoint-FAA-DOF-Snapshot/1.0"})
        with urllib.request.urlopen(request, timeout=180) as response:
            payload = response.read()
        archive_path = args.output.with_suffix(".source.zip")
        archive_path.parent.mkdir(parents=True, exist_ok=True)
        archive_path.write_bytes(payload)
    with zipfile.ZipFile(archive_path) as archive:
        csv_names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if len(csv_names) != 1:
            raise ValueError(f"Expected one CSV in FAA ZIP; found {csv_names}")
        with archive.open(csv_names[0]) as binary:
            with io.TextIOWrapper(binary, encoding="utf-8-sig", newline="") as stream:
                metadata = build_snapshot(stream, args.output)
    if args.zip is None:
        archive_path.unlink(missing_ok=True)
    print(json.dumps({
        "output": str(args.output),
        "bytes": args.output.stat().st_size,
        "records": metadata["filteredRecordCount"],
        "sourceRecords": metadata["sourceRecordCount"],
        "types": metadata["typeCounts"],
        "countries": len(metadata["countryCounts"]),
        "verification": metadata["verificationCounts"],
        "builtAtUtc": metadata["builtAtUtc"],
    }, sort_keys=True))


if __name__ == "__main__":
    main()
