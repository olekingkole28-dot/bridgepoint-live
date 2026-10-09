#!/usr/bin/env python3
"""China-only Overture building ingestion using GitHub-hosted DuckDB.

This runner never writes to the canonical parcel identity table. Its only stored
features are country-mask-qualified building footprints, and every progress
cursor follows the original Parquet row number after broad-bbox filtering.
"""
import argparse
import json
import os
import pathlib
import re
import time
import traceback

import duckdb
import requests

SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://xdfsjztwgsbmabshzsjw.supabase.co").rstrip("/")
BROKER = f"{SUPABASE_URL}/functions/v1/bridgepoint-china-building-broker-v1"
AUDIENCE = "bridgepoint-china-building-v1"
BATCH_SIZE = 75
TOKEN = {"value": None, "exp": 0}


def jwt_claims(token):
    try:
        import base64
        part = token.split(".")[1]
        part += "=" * ((4 - len(part) % 4) % 4)
        return json.loads(base64.urlsafe_b64decode(part.encode()))
    except Exception:
        return {}


def oidc_token():
    now = int(time.time())
    if TOKEN["value"] and TOKEN["exp"] > now + 60:
        return TOKEN["value"]
    url = os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]
    secret = os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]
    sep = "&" if "?" in url else "?"
    response = requests.get(
        f"{url}{sep}audience={AUDIENCE}",
        headers={"Authorization": f"bearer {secret}"},
        timeout=20,
    )
    response.raise_for_status()
    value = response.json()["value"]
    TOKEN["value"] = value
    TOKEN["exp"] = int(jwt_claims(value).get("exp", 0))
    return value


def broker(action, extra=None, timeout=180):
    payload = {"action": action, "oidc_token": oidc_token()}
    payload.update(extra or {})
    response = requests.post(
        BROKER, json=payload, headers={"content-type": "application/json"}, timeout=timeout
    )
    if not response.ok:
        raise RuntimeError(f"China broker {action} HTTP {response.status_code}: {response.text[:1800]}")
    data = response.json()
    if data.get("complete") is False:
        raise RuntimeError(f"China broker {action} failed: {data}")
    return data


def sql_quote(value):
    return "'" + str(value).replace("'", "''") + "'"


def clean_number(value, integer=False):
    if value is None:
        return None
    try:
        value = float(value)
        if not (value == value and abs(value) != float("inf")):
            return None
        return int(round(value)) if integer else value
    except (ValueError, TypeError, OverflowError):
        return None


def decode_batch(rows, item_id):
    payload = []
    last_row = -1
    seen = 0
    for row in rows:
        source_row = int(row[0])
        last_row = max(last_row, source_row)
        seen += 1
        source_record_id = row[1]
        geom_text = row[2]
        if not source_record_id or not geom_text:
            continue
        try:
            geometry = json.loads(geom_text) if isinstance(geom_text, str) else geom_text
        except (ValueError, TypeError):
            continue
        if not isinstance(geometry, dict) or geometry.get("type") not in ("Polygon", "MultiPolygon"):
            continue
        payload.append({
            "source_record_id": str(source_record_id),
            "geometry": geometry,
            "height_m": clean_number(row[3]),
            "min_height_m": clean_number(row[4]),
            "num_floors": clean_number(row[5], integer=True),
            "roof_height_m": clean_number(row[6]),
            "roof_direction": clean_number(row[7]),
            "roof_shape": row[8],
            "roof_material": row[9],
            "facade_material": row[10],
            "metadata": {
                "source_key": "OVERTURE_BUILDINGS_CHINA_20260923",
                "release": "2026-09-23.1",
                "license": "ODbL-1.0",
                "country_code": "CN",
                "feature_type": "building",
                "source_item_id": str(item_id),
            },
        })
    return payload, last_row, seen


def process_item(claim, worker):
    item_id = str(claim["item_id"])
    lease = str(claim["lease_token"])
    start = max(0, int(claim.get("row_start") or 0))
    advertised = clean_number(claim.get("num_rows"), integer=True)
    source_url = str(claim["parquet_url"])
    safe_id = re.sub(r"[^A-Za-z0-9_.-]", "_", item_id)
    temp_dir = pathlib.Path(os.environ.get("RUNNER_TEMP", "/tmp")) / "bridgepoint-china"
    temp_dir.mkdir(parents=True, exist_ok=True)
    candidate_path = temp_dir / f"{safe_id}-from-{start}.parquet"
    candidate_path.unlink(missing_ok=True)

    con = duckdb.connect(":memory:")
    con.execute("SET threads=4")
    con.execute("SET memory_limit='8GB'")
    con.execute("SET preserve_insertion_order=false")
    con.execute("INSTALL httpfs; LOAD httpfs")
    con.execute("INSTALL spatial; LOAD spatial")

    last_cursor = start
    cumulative_seen = 0
    cumulative_china = 0
    cumulative_inserted = 0
    try:
        src = f"read_parquet({sql_quote(source_url)}, file_row_number=true)"
        out = sql_quote(candidate_path.as_posix())
        # The rectangle is a coarse prefilter only. PostGIS applies the exact
        # stored China multipolygon before a footprint may be inserted.
        con.execute(f"""
            COPY (
              SELECT
                file_row_number::BIGINT AS source_row,
                CAST(id AS VARCHAR) AS source_record_id,
                ST_AsGeoJSON(geometry) AS geometry_json,
                try_cast(height AS DOUBLE) AS height_m,
                try_cast(min_height AS DOUBLE) AS min_height_m,
                try_cast(num_floors AS DOUBLE) AS num_floors,
                try_cast(roof_height AS DOUBLE) AS roof_height_m,
                try_cast(roof_direction AS DOUBLE) AS roof_direction,
                CAST(roof_shape AS VARCHAR) AS roof_shape,
                CAST(roof_material AS VARCHAR) AS roof_material,
                CAST(facade_material AS VARCHAR) AS facade_material
              FROM {src}
              WHERE file_row_number >= {start}
                AND bbox.xmin <= 137 AND bbox.xmax >= 72
                AND bbox.ymin <= 56 AND bbox.ymax >= 16
                AND id IS NOT NULL
            ) TO {out}
            (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 50000)
        """)
        candidate_count = int(con.execute(
            f"SELECT count(*) FROM read_parquet({sql_quote(candidate_path.as_posix())})"
        ).fetchone()[0])
        print(json.dumps({
            "stage": "china_bbox_prefilter_complete", "worker": worker, "item_id": item_id,
            "row_start": start, "advertised_tile_rows": advertised,
            "bbox_candidate_rows": candidate_count,
        }, separators=(",", ":")), flush=True)

        query = f"""
          SELECT source_row,source_record_id,geometry_json,height_m,min_height_m,
                 num_floors,roof_height_m,roof_direction,roof_shape,roof_material,facade_material
          FROM read_parquet({sql_quote(candidate_path.as_posix())})
          ORDER BY source_row
        """
        cursor = con.execute(query)
        while True:
            raw = cursor.fetchmany(BATCH_SIZE)
            if not raw:
                break
            payload, max_row, seen = decode_batch(raw, item_id)
            if max_row < 0:
                continue
            result = {"persisted": 0, "china_features": 0}
            if payload:
                result = broker("persist", {"rows": payload}, timeout=240)
            inserted = int(result.get("persisted", 0) or 0)
            china_features = int(result.get("china_features", 0) or 0)
            next_cursor = max(last_cursor, max_row + 1)
            broker("progress", {
                "item_id": item_id, "lease_token": lease, "row_end": next_cursor,
                "seen": seen, "in_china": inserted, "persisted": inserted,
                "done": False,
            }, timeout=60)
            last_cursor = next_cursor
            cumulative_seen += seen
            cumulative_china += china_features
            cumulative_inserted += inserted
            print(json.dumps({
                "stage": "china_batch_persisted", "worker": worker, "item_id": item_id,
                "source_row_end": last_cursor, "batch_seen": seen,
                "batch_geojson_payload": len(payload), "batch_eligible_china": china_features,
                "batch_new_unique_inserts": inserted, "cumulative_new_unique_inserts": cumulative_inserted,
            }, separators=(",", ":")), flush=True)

        final_cursor = int(advertised) if advertised is not None and advertised >= start else max(start, last_cursor)
        broker("progress", {
            "item_id": item_id, "lease_token": lease, "row_end": final_cursor,
            "seen": 0, "in_china": 0, "persisted": 0, "done": True,
        }, timeout=60)
        print(json.dumps({
            "complete": True, "worker": worker, "item_id": item_id,
            "advertised_tile_rows": advertised, "bbox_candidate_rows": candidate_count,
            "batch_rows_seen": cumulative_seen, "eligible_china_features": cumulative_china,
            "new_unique_rows_persisted": cumulative_inserted, "completed_cursor": final_cursor,
        }, separators=(",", ":")), flush=True)
    except Exception as exc:
        try:
            broker("progress", {
                "item_id": item_id, "lease_token": lease, "row_end": last_cursor,
                "seen": 0, "in_china": 0, "persisted": 0, "done": False,
                "error": str(exc)[:1600],
            }, timeout=60)
        except Exception as progress_exc:
            print(f"Progress recovery also failed for {item_id}: {progress_exc}", flush=True)
        raise
    finally:
        con.close()
        candidate_path.unlink(missing_ok=True)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--worker", type=int, default=0)
    parser.add_argument("--batch-size", type=int, default=BATCH_SIZE)
    args = parser.parse_args()
    if not 0 <= args.worker <= 15:
        raise SystemExit("worker must be between 0 and 15")
    # A small batch avoids HTTP payload/CPU spikes; the long-running compute is
    # on the GitHub hosted runner, not the 2-second Supabase Edge CPU budget.
    global BATCH_SIZE
    BATCH_SIZE = max(25, min(100, args.batch_size))
    claim = broker("claim", {"batch_size": BATCH_SIZE}, timeout=60)
    if not claim.get("claimed"):
        status = broker("status", timeout=60)
        print(json.dumps({
            "complete": True, "worker": args.worker, "claimed": False,
            "reason": claim.get("reason", "NO_ITEM"), "china_status": status,
        }, separators=(",", ":")), flush=True)
        return
    process_item(claim, args.worker)
    status = broker("status", timeout=60)
    print(json.dumps({"stage": "china_live_status", "worker": args.worker, "status": status}, separators=(",", ":")), flush=True)


if __name__ == "__main__":
    main()
