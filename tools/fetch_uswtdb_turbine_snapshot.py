#!/usr/bin/env python3
"""Build a same-origin JSON snapshot from the official USWTDB public ZIP."""
import argparse
import csv
import io
import json
import os
from pathlib import Path
import sys
import tempfile
import time
import urllib.request
import zipfile
from datetime import datetime, timezone

ARCHIVE_URL = "https://energy.usgs.gov/uswtdb/assets/data/uswtdbCSV.zip"
SOURCE_URL = "https://energy.usgs.gov/uswtdb/"
SOURCE_VERSION = "USWTDB v9.1 · 2026-09-28"
VERSION_ID = "USWTDB_V9_1_20260928"
CSV_NAME = "uswtdb_V9_1_20260928.csv"
EXPECTED_HEADER = [
    "case_id", "faa_ors", "faa_asn", "usgs_pr_id", "eia_id",
    "t_state", "t_county", "t_fips", "p_name", "p_year", "p_tnum", "p_cap",
    "t_manu", "t_model", "t_cap", "t_hh", "t_rd", "t_rsa", "t_ttlh",
    "t_retrofit", "t_retro_yr", "t_offshore", "t_conf_atr", "t_conf_loc",
    "t_img_date", "t_img_src", "xlong", "ylat"
]
MAX_ROWS = 150000


def download_archive():
    last_error = None
    for attempt in range(4):
        request = urllib.request.Request(
            ARCHIVE_URL,
            headers={"User-Agent": "BridgePoint-Intelligence/1.0"}
        )
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                if response.status != 200:
                    raise RuntimeError("USGS archive HTTP %s" % response.status)
                data = response.read()
                if len(data) < 100000:
                    raise RuntimeError("USGS archive download is unexpectedly small")
                return data
        except Exception as error:
            last_error = error
            if attempt < 3:
                time.sleep(attempt + 1)
    raise RuntimeError("USGS archive unavailable: %s" % last_error)


def build_snapshot():
    archive = download_archive()
    with zipfile.ZipFile(io.BytesIO(archive), "r") as bundle:
        names = set(bundle.namelist())
        if CSV_NAME not in names:
            raise RuntimeError("Expected v9.1 CSV is missing from the official USGS archive")
        with bundle.open(CSV_NAME, "r") as raw:
            text = io.TextIOWrapper(raw, encoding="utf-8-sig", newline="")
            reader = csv.DictReader(text)
            if reader.fieldnames != EXPECTED_HEADER:
                raise RuntimeError("USWTDB CSV schema/header changed; refusing unsafe snapshot")
            records = []
            seen = set()
            for row in reader:
                case_id = str(row.get("case_id", "")).strip()
                if not case_id:
                    raise RuntimeError("USWTDB record has no case_id")
                if case_id in seen:
                    raise RuntimeError("Duplicate USWTDB case_id: %s" % case_id)
                seen.add(case_id)
                try:
                    longitude = float(row["xlong"])
                    latitude = float(row["ylat"])
                except (TypeError, ValueError):
                    raise RuntimeError("USWTDB record %s has invalid coordinates" % case_id)
                if not (-180 <= longitude <= 180 and -85 <= latitude <= 85):
                    raise RuntimeError("USWTDB record %s is outside valid map coordinates" % case_id)
                # Preserve the full published values as strings. The renderer alone
                # interprets units and handles source sentinel / missing-value codes.
                records.append({field: row.get(field, "") for field in EXPECTED_HEADER})
                if len(records) > MAX_ROWS:
                    raise RuntimeError("USWTDB snapshot exceeded the safety row cap")
    if len(records) < 10000:
        raise RuntimeError("USWTDB snapshot is unexpectedly small: %s" % len(records))
    generated = datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    return {
        "metadata": {
            "dataset": "United States Wind Turbine Database",
            "sourceVersion": SOURCE_VERSION,
            "version": VERSION_ID,
            "generatedAtUtc": generated,
            "recordCount": len(records),
            "coordinateToleranceM": 10,
            "sourceUrl": SOURCE_URL,
            "archiveUrl": ARCHIVE_URL,
            "csvFile": CSV_NAME,
            "sourceFields": EXPECTED_HEADER,
            "license": "USGS public domain"
        },
        "records": records
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="site/data/bridgepoint-uswtdb-turbines-v9_1.json")
    args = parser.parse_args()
    output = Path(args.output).resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    temporary = None
    try:
        snapshot = build_snapshot()
        descriptor, temp_name = tempfile.mkstemp(
            prefix=output.name + ".", suffix=".tmp", dir=str(output.parent)
        )
        temporary = Path(temp_name)
        with os.fdopen(descriptor, "w", encoding="utf-8", newline="\n") as handle:
            json.dump(snapshot, handle, ensure_ascii=False, separators=(",", ":"))
        os.replace(str(temporary), str(output))
        size = output.stat().st_size
        print("BRIDGEPOINT_USWTDB_SNAPSHOT_READY " + json.dumps({
            "output": str(output),
            "records": snapshot["metadata"]["recordCount"],
            "bytes": size,
            "version": snapshot["metadata"]["version"],
            "generatedAtUtc": snapshot["metadata"]["generatedAtUtc"]
        }))
    except Exception as error:
        if temporary and temporary.exists():
            temporary.unlink()
        if output.is_file() and output.stat().st_size > 100000:
            print(
                "USWTDB refresh failed; preserving previous published snapshot: %s" % error,
                file=sys.stderr
            )
            return
        raise


if __name__ == "__main__":
    main()
