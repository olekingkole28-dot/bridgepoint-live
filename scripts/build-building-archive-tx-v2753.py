#!/usr/bin/env python3
"""
BridgePoint TX building archive v2753.

Purpose:
- Finish the one remaining Overture building archive (TX/building) without a
  monolithic whole-state temporary file.
- Process the 11 source Parquet files one at a time.
- Exact-clip every feature to the authoritative BridgePoint Texas boundary.
- Validate every source-file slice before upload.
- Enforce Overture id uniqueness across the entire Texas archive.
- Upload deterministic contiguous shards through the existing OIDC broker.
- Reuse the v2710 archive manifest/part contract so the 111 completed archives
  are not changed.

This is data-only infrastructure. It does not deploy or modify the app.
"""
import datetime as dt
import hashlib
import json
import math
import os
import pathlib
import time

import duckdb
import requests

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
BROKER = f"{SUPABASE_URL}/functions/v1/bridgepoint-building-archive-broker-v2710"
AUDIENCE = "bridgepoint-building-v2710"
STATE = "TX"
KIND = "building"
TARGET_BYTES = 28 * 1024 * 1024
HARD_BYTES = 42 * 1024 * 1024
BOUNDARY_TOL = 1e-7


def post(payload, timeout=180):
    r = requests.post(
        BROKER,
        json=payload,
        headers={"content-type": "application/json"},
        timeout=timeout,
    )
    if not r.ok:
        raise RuntimeError(f"broker {r.status_code}: {r.text[:2000]}")
    return r.json()


def oidc():
    url = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL", "")
    tok = os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN", "")
    if not url or not tok:
        raise RuntimeError("GitHub renewable OIDC endpoint unavailable")
    sep = "&" if "?" in url else "?"
    r = requests.get(
        f"{url}{sep}audience={AUDIENCE}",
        headers={"Authorization": f"bearer {tok}"},
        timeout=30,
    )
    r.raise_for_status()
    return r.json()["value"]


def broker(action, extra=None, timeout=180):
    body = {
        "action": action,
        "oidc_token": oidc(),
        "state_code": STATE,
        "asset_kind": KIND,
    }
    body.update(extra or {})
    return post(body, timeout=timeout)


def q(value):
    return "'" + str(value).replace("'", "''") + "'"


def file_sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(8 * 1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def new_duckdb(boundary_geojson):
    con = duckdb.connect(":memory:")
    con.execute("SET threads=4")
    con.execute("SET memory_limit='7GB'")
    con.execute("SET preserve_insertion_order=false")
    con.execute("INSTALL httpfs; LOAD httpfs")
    con.execute("INSTALL spatial; LOAD spatial")
    con.execute(
        "CREATE TEMP TABLE bp_boundary AS SELECT ST_GeomFromGeoJSON(?) geom",
        [json.dumps(boundary_geojson, separators=(",", ":"))],
    )
    con.execute("CREATE TEMP TABLE seen_ids(id VARCHAR PRIMARY KEY)")
    return con


def clip_source_file(con, url, item_id, west, south, east, north, out_path):
    src = f"read_parquet({q(url)})"
    out = q(str(out_path))
    con.execute(
        f"""
        COPY (
          WITH candidate AS (
            SELECT *, geometry AS _bp_geom
            FROM {src}
            WHERE bbox.xmin <= {east}
              AND bbox.xmax >= {west}
              AND bbox.ymin <= {north}
              AND bbox.ymax >= {south}
          ),
          clipped AS (
            SELECT
              candidate.* EXCLUDE(geometry, _bp_geom),
              ST_Intersection(_bp_geom, b.geom) AS _bp_clip
            FROM candidate
            CROSS JOIN bp_boundary b
            WHERE ST_Intersects(_bp_geom, b.geom)
          )
          SELECT
            clipped.* EXCLUDE(_bp_clip),
            ST_AsWKB(_bp_clip) AS geometry,
            {q(STATE)}::VARCHAR AS _bp_jurisdiction,
            {q(KIND)}::VARCHAR AS _bp_asset_kind,
            '2026-08-19.0'::VARCHAR AS _bp_source_release,
            'OVERTURE_BUILDINGS_20260819'::VARCHAR AS _bp_source_key,
            'ODbL-1.0'::VARCHAR AS _bp_source_license,
            {q(item_id)}::VARCHAR AS _bp_source_item_id
          FROM clipped
          WHERE NOT ST_IsEmpty(_bp_clip)
        )
        TO {out}
        (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 100000)
        """
    )

    desc_rows = con.execute(
        f"DESCRIBE SELECT * FROM read_parquet({out})"
    ).fetchall()
    cols = [r[0] for r in desc_rows]
    types = {r[0]: str(r[1]).upper() for r in desc_rows}
    geom_type = types.get("geometry", "")
    if "BLOB" in geom_type:
        geom_expr = "ST_GeomFromWKB(geometry)"
    elif "GEOMETRY" in geom_type:
        geom_expr = "geometry"
    else:
        raise RuntimeError(
            f"Unexpected archived geometry type {geom_type!r} for item {item_id}"
        )

    row = con.execute(
        f"""
        WITH x AS (
          SELECT *,
                 CASE WHEN geometry IS NULL THEN NULL ELSE {geom_expr} END AS g
          FROM read_parquet({out})
        ),
        b AS (SELECT geom FROM bp_boundary),
        d AS (
          SELECT x.*,
                 CASE WHEN g IS NULL THEN NULL ELSE ST_Difference(g,b.geom) END AS outside_geom
          FROM x CROSS JOIN b
        )
        SELECT
          count(*)::BIGINT,
          count(*) FILTER (WHERE geometry IS NULL)::BIGINT,
          count(*) FILTER (WHERE g IS NOT NULL AND ST_IsEmpty(g))::BIGINT,
          count(*) FILTER (
            WHERE g IS NOT NULL
              AND NOT ST_IsEmpty(g)
              AND outside_geom IS NOT NULL
              AND NOT ST_IsEmpty(outside_geom)
              AND ST_Length(outside_geom) > {BOUNDARY_TOL}
          )::BIGINT,
          (count(*) - count(DISTINCT id))::BIGINT,
          count(*) FILTER (
            WHERE g IS NOT NULL
              AND NOT ST_IsEmpty(g)
              AND outside_geom IS NOT NULL
              AND NOT ST_IsEmpty(outside_geom)
              AND ST_Length(outside_geom) <= {BOUNDARY_TOL}
          )::BIGINT,
          coalesce(
            max(ST_Length(outside_geom))
            FILTER (WHERE outside_geom IS NOT NULL AND NOT ST_IsEmpty(outside_geom)),
            0
          )::DOUBLE
        FROM d
        """
    ).fetchone()

    rows = int(row[0])
    validation = {
        "null_geometry": int(row[1]),
        "empty_geometry": int(row[2]),
        "outside_geometry": int(row[3]),
        "duplicate_ids": int(row[4]),
        "precision_slivers": int(row[5]),
        "max_outside_length_degrees": float(row[6]),
        "boundary_validation_tolerance_degrees": BOUNDARY_TOL,
        "archived_geometry_type": geom_type,
        "source_item_id": item_id,
    }
    if any(
        validation[k]
        for k in ("null_geometry", "empty_geometry", "outside_geometry", "duplicate_ids")
    ):
        raise RuntimeError(f"Validation failed TX/building item {item_id}: {validation}")

    # Cross-file uniqueness is checked before the ids are admitted to seen_ids.
    duplicate_across = int(
        con.execute(
            f"""
            SELECT count(*)::BIGINT
            FROM read_parquet({out}) p
            JOIN seen_ids s USING(id)
            """
        ).fetchone()[0]
    )
    if duplicate_across:
        raise RuntimeError(
            f"Cross-file duplicate Overture ids in item {item_id}: {duplicate_across}"
        )
    con.execute(
        f"INSERT INTO seen_ids SELECT id::VARCHAR FROM read_parquet({out})"
    )

    stats = {"rows": rows}
    for col in ("height", "num_floors", "min_height", "min_floor"):
        if col in cols:
            stats[f"{col}_source_values"] = int(
                con.execute(
                    f"SELECT count(*) FILTER(WHERE {col} IS NOT NULL) "
                    f"FROM read_parquet({out})"
                ).fetchone()[0]
            )
    for col in ("roof", "facade_color", "roof_color"):
        if col in cols:
            stats[f"{col}_source_values"] = int(
                con.execute(
                    f"SELECT count(*) FILTER(WHERE {col} IS NOT NULL) "
                    f"FROM read_parquet({out})"
                ).fetchone()[0]
            )

    return rows, validation, stats


def split_file(con, base_path, rows):
    size = base_path.stat().st_size
    if size <= HARD_BYTES:
        return [(base_path, rows, size)]

    n = max(2, math.ceil(size / TARGET_BYTES))
    src = q(str(base_path))
    while True:
        pieces = []
        for old in base_path.parent.glob(base_path.stem + "-piece-*.parquet"):
            old.unlink()
        for idx in range(n):
            p = base_path.parent / f"{base_path.stem}-piece-{idx:04d}.parquet"
            con.execute(
                f"""
                COPY (
                  SELECT *
                  FROM read_parquet({src})
                  WHERE hash(id) % {n} = {idx}
                )
                TO {q(str(p))}
                (FORMAT PARQUET, COMPRESSION ZSTD, ROW_GROUP_SIZE 100000)
                """
            )
            rr = con.execute(
                f"""
                SELECT count(*)::BIGINT,
                       (count(*)-count(DISTINCT id))::BIGINT
                FROM read_parquet({q(str(p))})
                """
            ).fetchone()
            part_rows = int(rr[0])
            if int(rr[1]):
                raise RuntimeError(f"Duplicate ids in local split {idx}")
            if part_rows == 0:
                p.unlink(missing_ok=True)
                continue
            pieces.append((p, part_rows, p.stat().st_size))
        if sum(x[1] for x in pieces) != rows:
            raise RuntimeError(
                f"Local split row accounting failed: {sum(x[1] for x in pieces)} != {rows}"
            )
        if pieces and max(x[2] for x in pieces) <= HARD_BYTES:
            return pieces
        n *= 2


def upload_piece(part_index, path, rows, validation, item_id, file_piece_index):
    digest = file_sha256(path)
    signed = broker("sign_part", {"part_index": part_index})
    err = None
    for attempt in range(1, 4):
        try:
            with open(path, "rb") as fh:
                r = requests.put(
                    signed["signed_url"],
                    data=fh,
                    headers={
                        "content-type": "application/vnd.apache.parquet",
                        "x-upsert": "true",
                        "content-length": str(path.stat().st_size),
                    },
                    timeout=3600,
                )
            if r.ok:
                err = None
                break
            err = f"HTTP {r.status_code}: {r.text[:1000]}"
        except Exception as exc:
            err = str(exc)
        if attempt < 3:
            time.sleep(attempt * 5)
            signed = broker("sign_part", {"part_index": part_index})
    if err:
        raise RuntimeError(f"Part upload failed {part_index}: {err}")

    meta = {
        "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "source_item_id": item_id,
        "source_file_piece_index": file_piece_index,
        "builder": "PUBLIC_GITHUB_DUCKDB_TX_STREAMING_V2753",
        "compression": "ZSTD",
        "source_release": "2026-08-19.0",
        "source_key": "OVERTURE_BUILDINGS_20260819",
        "source_license": "ODbL-1.0",
    }
    broker(
        "finalize_part",
        {
            "part_index": part_index,
            "row_count": rows,
            "file_bytes": path.stat().st_size,
            "sha256": digest,
            "validation": validation,
            "metadata": meta,
        },
    )
    return {
        "part_index": part_index,
        "rows": rows,
        "bytes": path.stat().st_size,
        "sha256": digest,
        "source_item_id": item_id,
    }


def main():
    existing = broker("item")
    if existing.get("verified"):
        print(json.dumps({"complete": True, "skipped": True, "reason": "ALREADY_VERIFIED"}))
        return

    cat = broker("catalog")
    files = sorted(cat.get("files", []), key=lambda x: x["item_id"])
    if not files:
        raise RuntimeError("Texas catalog has zero Overture files; refusing false-empty archive")

    reset = broker("reset_parts")
    print(json.dumps({"stage": "reset", "result": reset}, separators=(",", ":")))

    broker(
        "report",
        {
            "status": "BUILDING",
            "stage": "TX_STREAMING_STARTED",
            "metadata": {
                "builder_version": 2753,
                "source_files": len(files),
                "strategy": "ONE_OVERTURE_FILE_AT_A_TIME",
            },
        },
    )

    outdir = pathlib.Path("tx-building-v2753")
    outdir.mkdir(parents=True, exist_ok=True)
    west, south, east, north = map(float, cat["bbox"])
    con = new_duckdb(cat["state_geojson"])

    receipts = []
    total_rows = 0
    aggregate_stats = {}
    part_index = 0

    try:
        for file_index, item in enumerate(files):
            item_id = str(item["item_id"])
            base = outdir / f"tx-{item_id}.parquet"
            if base.exists():
                base.unlink()

            started = time.time()
            rows, validation, stats = clip_source_file(
                con,
                item["url"],
                item_id,
                west,
                south,
                east,
                north,
                base,
            )
            for k, v in stats.items():
                aggregate_stats[k] = aggregate_stats.get(k, 0) + int(v)

            if rows == 0:
                base.unlink(missing_ok=True)
                print(
                    json.dumps(
                        {
                            "stage": "source_file_complete",
                            "item_id": item_id,
                            "rows": 0,
                            "file_index": file_index,
                            "source_files": len(files),
                            "elapsed_seconds": round(time.time() - started, 2),
                        },
                        separators=(",", ":"),
                    )
                )
                continue

            pieces = split_file(con, base, rows)
            for piece_idx, (piece, piece_rows, _) in enumerate(pieces):
                receipt = upload_piece(
                    part_index,
                    piece,
                    piece_rows,
                    validation,
                    item_id,
                    piece_idx,
                )
                receipts.append(receipt)
                total_rows += piece_rows
                part_index += 1
                if piece != base:
                    piece.unlink(missing_ok=True)

            base.unlink(missing_ok=True)

            broker(
                "report",
                {
                    "status": "BUILDING",
                    "stage": "TX_SOURCE_FILE_UPLOADED",
                    "metadata": {
                        "builder_version": 2753,
                        "last_source_item_id": item_id,
                        "source_file_index": file_index,
                        "source_files_total": len(files),
                        "rows_uploaded_so_far": total_rows,
                        "parts_uploaded_so_far": part_index,
                    },
                },
            )
            print(
                json.dumps(
                    {
                        "stage": "source_file_complete",
                        "item_id": item_id,
                        "rows": rows,
                        "parts_total": part_index,
                        "rows_total": total_rows,
                        "file_index": file_index,
                        "source_files": len(files),
                        "elapsed_seconds": round(time.time() - started, 2),
                    },
                    separators=(",", ":"),
                )
            )

        seen_rows = int(con.execute("SELECT count(*)::BIGINT FROM seen_ids").fetchone()[0])
        if seen_rows != total_rows:
            raise RuntimeError(
                f"Global id reconciliation failed: seen={seen_rows} uploaded={total_rows}"
            )

        aggregate = hashlib.sha256()
        for r in receipts:
            aggregate.update(
                f"{r['part_index']}:{r['rows']}:{r['bytes']}:{r['sha256']}\n".encode()
            )

        global_validation = {
            "null_geometry": 0,
            "empty_geometry": 0,
            "outside_geometry": 0,
            "duplicate_ids": 0,
            "cross_file_duplicate_ids": 0,
            "source_files_cataloged": len(files),
            "source_files_processed": len(files),
            "seen_unique_ids": seen_rows,
            "boundary_validation_tolerance_degrees": BOUNDARY_TOL,
        }
        final = broker(
            "complete_sharded",
            {
                "part_count": len(receipts),
                "total_rows": total_rows,
                "total_bytes": sum(r["bytes"] for r in receipts),
                "aggregate_sha256": aggregate.hexdigest(),
                "metadata": {
                    "generated_at": dt.datetime.now(dt.timezone.utc).isoformat(),
                    "builder": "PUBLIC_GITHUB_DUCKDB_TX_STREAMING_V2753",
                    "builder_version": 2753,
                    "source_files": len(files),
                    "validation": global_validation,
                    "attribute_stats": aggregate_stats,
                    "source_release": "2026-08-19.0",
                    "source_key": "OVERTURE_BUILDINGS_20260819",
                    "source_license": "ODbL-1.0",
                },
            },
        )
        print(
            json.dumps(
                {
                    "complete": True,
                    "state": STATE,
                    "kind": KIND,
                    "rows": total_rows,
                    "parts": len(receipts),
                    "source_files": len(files),
                    "validation": global_validation,
                    "attribute_stats": aggregate_stats,
                    "final": final,
                },
                separators=(",", ":"),
            )
        )
    except Exception as exc:
        try:
            broker(
                "report",
                {
                    "status": "FAILED",
                    "stage": "TX_STREAMING_BUILD_OR_UPLOAD",
                    "message": str(exc),
                    "metadata": {
                        "builder_version": 2753,
                        "rows_uploaded_before_failure": total_rows,
                        "parts_uploaded_before_failure": part_index,
                    },
                },
            )
        except Exception:
            pass
        raise
    finally:
        con.close()


if __name__ == "__main__":
    main()
