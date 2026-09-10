#!/usr/bin/env python3
"""
BridgePoint current authoritative building -> Overture crosswalk v2752.

Data-only job. No app or UI changes.

For one approved current-authoritative region (DC, LA, NY, PA):
1. Pull the exact BridgePoint-stored local footprints through the OIDC broker.
2. Read only the Overture Parquet files whose row groups overlap that extent.
3. Run exact polygon-overlap scoring equivalent to the PostGIS matcher.
4. Preserve every local footprint exactly once in the output.
5. Never force an uncertain merge.
6. Downgrade any Overture feature shared by >1 local authoritative footprint so
   it cannot collapse multiple authoritative buildings into one canonical id.
7. Write ZSTD Parquet shards and upload them through signed Storage URLs.
"""
import argparse
import base64
import datetime as dt
import hashlib
import json
import math
import os
import pathlib
import time

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq
import requests

SUPABASE_URL=os.environ["SUPABASE_URL"].rstrip("/")
BROKER=f"{SUPABASE_URL}/functions/v1/bridgepoint-building-crosswalk-broker-v2752"
AUDIENCE="bridgepoint-building-crosswalk-v2752"
TARGET_BYTES=28*1024*1024
HARD_BYTES=42*1024*1024
PAGE_SIZE=5000
TOKEN_CACHE={"token":None,"exp":0}


def _jwt_exp(token):
    try:
        p=token.split(".")[1]
        p += "="*((4-len(p)%4)%4)
        return int(json.loads(base64.urlsafe_b64decode(p.encode())).get("exp",0))
    except Exception:
        return 0


def oidc():
    now=int(time.time())
    if TOKEN_CACHE["token"] and TOKEN_CACHE["exp"]>now+45:
        return TOKEN_CACHE["token"]
    url=os.environ.get("ACTIONS_ID_TOKEN_REQUEST_URL","")
    tok=os.environ.get("ACTIONS_ID_TOKEN_REQUEST_TOKEN","")
    if not url or not tok:
        raise RuntimeError("GitHub renewable OIDC endpoint unavailable")
    sep="&" if "?" in url else "?"
    r=requests.get(
        f"{url}{sep}audience={AUDIENCE}",
        headers={"Authorization":f"bearer {tok}"},
        timeout=30,
    )
    r.raise_for_status()
    value=r.json()["value"]
    TOKEN_CACHE["token"]=value
    TOKEN_CACHE["exp"]=_jwt_exp(value)
    return value


def broker(action,state,extra=None,timeout=180):
    body={"action":action,"state_code":state,"oidc_token":oidc()}
    body.update(extra or {})
    r=requests.post(
        BROKER,
        json=body,
        headers={"content-type":"application/json"},
        timeout=timeout,
    )
    if not r.ok:
        raise RuntimeError(f"broker {r.status_code}: {r.text[:2500]}")
    data=r.json()
    if data.get("complete") is False:
        raise RuntimeError(f"broker action {action} failed: {data}")
    return data


def q(v):
    return "'" + str(v).replace("'","''") + "'"


def sha256(path):
    h=hashlib.sha256()
    with open(path,"rb") as fh:
        for chunk in iter(lambda:fh.read(8*1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()


def fetch_local(state,out_path,expected):
    schema=pa.schema([
        ("building_geometry_id",pa.int64()),
        ("source_record_id",pa.string()),
        ("geometry_wkb",pa.binary()),
    ])
    writer=pq.ParquetWriter(
        out_path,
        schema,
        compression="zstd",
        use_dictionary=True,
        write_statistics=True,
    )
    after=0
    total=0
    try:
        while True:
            page=broker(
                "local_page",
                state,
                {"after_id":after,"limit":PAGE_SIZE},
                timeout=180,
            )
            rows=page.get("rows",[])
            count=int(page.get("count",len(rows)))
            if count!=len(rows):
                raise RuntimeError(f"Page count mismatch {count}!={len(rows)}")
            if not rows:
                if total!=expected:
                    raise RuntimeError(
                        f"Local export ended early state={state} expected={expected} got={total}"
                    )
                break
            ids=[]
            source_ids=[]
            wkbs=[]
            for row in rows:
                bid=int(row["building_geometry_id"])
                ids.append(bid)
                source_ids.append(str(row["source_record_id"]))
                wkbs.append(base64.b64decode(row["geometry_wkb_b64"]))
            writer.write_table(pa.Table.from_arrays(
                [
                    pa.array(ids,type=pa.int64()),
                    pa.array(source_ids,type=pa.string()),
                    pa.array(wkbs,type=pa.binary()),
                ],
                schema=schema,
            ))
            total+=len(rows)
            nxt=int(page["next_after_id"])
            if nxt<=after:
                raise RuntimeError(f"Non-monotonic local page cursor {after}->{nxt}")
            after=nxt
            if total>expected:
                raise RuntimeError(f"Local export exceeded expected rows {total}>{expected}")
            if total%50000==0 or bool(page.get("done")):
                print(json.dumps({
                    "stage":"local_export",
                    "state":state,
                    "rows":total,
                    "expected":expected,
                    "cursor":after,
                },separators=(",",":")))
            if bool(page.get("done")):
                if total!=expected:
                    raise RuntimeError(
                        f"Local export reconciliation failed state={state} expected={expected} got={total}"
                    )
                break
    finally:
        writer.close()
    return total


def setup_duckdb():
    con=duckdb.connect(":memory:")
    con.execute("SET threads=4")
    con.execute("SET memory_limit='7GB'")
    con.execute("SET preserve_insertion_order=false")
    con.execute("INSTALL httpfs; LOAD httpfs")
    con.execute("INSTALL spatial; LOAD spatial")
    return con


def build_crosswalk(con,state,cat,local_path,out_path):
    expected=int(cat["expected_local_rows"])
    west,south,east,north=map(float,cat["bbox"])
    urls=[x["url"] for x in cat.get("files",[])]
    if not urls:
        raise RuntimeError(f"No Overture files cataloged for {state}")

    local_src=q(str(local_path))
    out=q(str(out_path))
    remote=f"read_parquet([{','.join(q(u) for u in urls)}], union_by_name=true)"

    local_validation=con.execute(f"""
      WITH x AS (
        SELECT building_geometry_id,source_record_id,
               CASE WHEN geometry_wkb IS NULL THEN NULL ELSE ST_GeomFromWKB(geometry_wkb) END g
        FROM read_parquet({local_src})
      )
      SELECT
        count(*)::BIGINT,
        (count(*)-count(DISTINCT building_geometry_id))::BIGINT,
        (count(*)-count(DISTINCT source_record_id))::BIGINT,
        count(*) FILTER(WHERE g IS NULL)::BIGINT,
        count(*) FILTER(WHERE g IS NOT NULL AND NOT ST_IsValid(g))::BIGINT
      FROM x
    """).fetchone()
    if int(local_validation[0])!=expected:
        raise RuntimeError(f"Stored local row reconciliation failed {local_validation[0]}!={expected}")
    if any(int(local_validation[i]) for i in range(1,5)):
        raise RuntimeError(f"Stored local validation failed: {local_validation}")

    con.execute(f"""
      CREATE TEMP TABLE local AS
      SELECT
        building_geometry_id::BIGINT building_geometry_id,
        source_record_id::VARCHAR source_record_id,
        ST_MakeValid(ST_GeomFromWKB(geometry_wkb)) geom
      FROM read_parquet({local_src})
    """)

    con.execute(f"""
      CREATE TEMP TABLE overture AS
      SELECT
        id::VARCHAR id,
        ST_MakeValid(geometry) geom
      FROM {remote}
      WHERE id IS NOT NULL
        AND geometry IS NOT NULL
        AND bbox.xmin <= {east}
        AND bbox.xmax >= {west}
        AND bbox.ymin <= {north}
        AND bbox.ymax >= {south}
    """)
    overture_rows=int(con.execute("SELECT count(*)::BIGINT FROM overture").fetchone()[0])
    overture_dups=int(con.execute(
        "SELECT count(*)-count(DISTINCT id) FROM overture"
    ).fetchone()[0])
    if overture_dups:
        raise RuntimeError(f"Overture bbox candidate id duplicates: {overture_dups}")

    # DuckDB spatial joins can use the RTREE index where beneficial. The build
    # remains correct if the optimizer elects a spatial join without the index.
    try:
        con.execute("CREATE INDEX local_geom_rtree ON local USING RTREE (geom)")
        con.execute("CREATE INDEX overture_geom_rtree ON overture USING RTREE (geom)")
    except Exception as exc:
        print(json.dumps({"stage":"rtree_optional","state":state,"message":str(exc)[:300]}))

    candidate_id=str(cat["candidate_id"])
    legal_status=str(cat.get("legal_status") or "")
    legal_basis=str(cat.get("legal_basis") or "")
    source_id_rule=str(cat.get("source_record_id_rule") or "")

    con.execute(f"""
      COPY (
        WITH pairs0 AS MATERIALIZED (
          SELECT
            l.building_geometry_id,
            l.source_record_id local_source_record_id,
            o.id overture_building_id,
            ST_Area(l.geom) local_area,
            ST_Area(o.geom) overture_area,
            ST_Area(ST_Intersection(l.geom,o.geom)) intersection_area
          FROM local l
          JOIN overture o
            ON ST_Intersects(l.geom,o.geom)
          WHERE l.geom IS NOT NULL
            AND o.geom IS NOT NULL
            AND NOT ST_IsEmpty(l.geom)
            AND NOT ST_IsEmpty(o.geom)
        ),
        scored AS MATERIALIZED (
          SELECT *,
            CASE WHEN local_area>0 THEN intersection_area/local_area ELSE 0 END local_cov,
            CASE WHEN overture_area>0 THEN intersection_area/overture_area ELSE 0 END overture_cov,
            CASE WHEN LEAST(local_area,overture_area)>0
                 THEN intersection_area/LEAST(local_area,overture_area) ELSE 0 END overlap_ratio
          FROM pairs0
          WHERE intersection_area>0
        ),
        eligible AS MATERIALIZED (
          SELECT *,
            (0.50*overlap_ratio + 0.25*local_cov + 0.25*overture_cov) score
          FROM scored
          WHERE overlap_ratio>=0.45
        ),
        ranked AS MATERIALIZED (
          SELECT *,
            row_number() OVER(
              PARTITION BY building_geometry_id
              ORDER BY score DESC,overture_building_id
            ) rn
          FROM eligible
        ),
        best0 AS MATERIALIZED (
          SELECT
            building_geometry_id,local_source_record_id,overture_building_id,
            overlap_ratio,local_cov,overture_cov,score,local_area,overture_area,
            CASE
              WHEN LEAST(local_cov,overture_cov)>=0.55 AND overlap_ratio>=0.65 THEN 'CONFIRMED'
              WHEN overlap_ratio>=0.80
               AND GREATEST(local_area,overture_area)/NULLIF(LEAST(local_area,overture_area),0)<=1.80
                THEN 'CONFIRMED'
              ELSE 'CANDIDATE'
            END base_status
          FROM ranked
          WHERE rn=1
        ),
        best AS MATERIALIZED (
          SELECT *,
            count(*) OVER(PARTITION BY overture_building_id)::INTEGER overture_local_count
          FROM best0
        )
        SELECT
          l.building_geometry_id,
          {q(candidate_id)}::VARCHAR candidate_id,
          {q(state)}::VARCHAR state_code,
          l.source_record_id local_source_record_id,
          b.overture_building_id,
          round(b.overlap_ratio,6) overlap_ratio,
          round(b.local_cov,6) local_coverage_ratio,
          round(b.overture_cov,6) overture_coverage_ratio,
          round(b.score,6) match_score,
          CASE
            WHEN b.overture_building_id IS NULL THEN 'UNMATCHED'
            WHEN b.overture_local_count>1 THEN 'CANDIDATE_SHARED_OVERTURE'
            ELSE b.base_status
          END match_status,
          CASE
            WHEN b.overture_building_id IS NULL THEN 'NO_MATCH_ABOVE_OVERLAP_GATE'
            WHEN b.overture_local_count>1 THEN 'SPATIAL_OVERLAP_SHARED_OVERTURE_NO_COLLAPSE'
            ELSE 'SPATIAL_FOOTPRINT_OVERLAP_EXACT'
          END match_method,
          coalesce(b.overture_local_count,0)::INTEGER overture_local_count,
          '2026-08-19.0'::VARCHAR overture_release,
          'ODbL-1.0'::VARCHAR overture_license,
          {q(source_id_rule)}::VARCHAR local_source_record_id_rule,
          {q(legal_status)}::VARCHAR local_legal_status,
          {q(legal_basis)}::VARCHAR local_legal_basis,
          2752::INTEGER matcher_version
        FROM local l
        LEFT JOIN best b USING(building_geometry_id)
        ORDER BY l.building_geometry_id
      )
      TO {out}
      (FORMAT PARQUET,COMPRESSION ZSTD,ROW_GROUP_SIZE 100000)
    """)

    val=con.execute(f"""
      SELECT
        count(*)::BIGINT output_rows,
        (count(*)-count(DISTINCT building_geometry_id))::BIGINT duplicate_output_local_ids,
        count(*) FILTER(WHERE match_status IS NULL OR match_status='')::BIGINT missing_status,
        count(*) FILTER(WHERE match_status='CONFIRMED')::BIGINT confirmed_rows,
        count(*) FILTER(WHERE match_status LIKE 'CANDIDATE%')::BIGINT candidate_rows,
        count(*) FILTER(WHERE match_status='UNMATCHED')::BIGINT unmatched_rows,
        (
          count(*) FILTER(WHERE match_status='CONFIRMED' AND overture_building_id IS NOT NULL)
          -
          count(DISTINCT overture_building_id) FILTER(WHERE match_status='CONFIRMED' AND overture_building_id IS NOT NULL)
        )::BIGINT duplicate_confirmed_overture_ids,
        count(*) FILTER(WHERE match_status='CANDIDATE_SHARED_OVERTURE')::BIGINT shared_overture_rows
      FROM read_parquet({out})
    """).fetchone()

    validation={
        "input_local_rows":int(local_validation[0]),
        "duplicate_local_building_ids":int(local_validation[1]),
        "duplicate_local_source_ids":int(local_validation[2]),
        "null_local_geometry":int(local_validation[3]),
        "invalid_local_geometry":int(local_validation[4]),
        "overture_bbox_candidates":overture_rows,
        "overture_bbox_duplicate_ids":overture_dups,
        "output_rows":int(val[0]),
        "duplicate_output_local_ids":int(val[1]),
        "missing_status":int(val[2]),
        "confirmed_rows":int(val[3]),
        "candidate_rows":int(val[4]),
        "unmatched_rows":int(val[5]),
        "duplicate_confirmed_overture_ids":int(val[6]),
        "shared_overture_rows":int(val[7]),
        "truth_rule":"NO_FORCED_MERGE_BELOW_CONFIDENCE_GATE; SHARED_OVERTURE_DOWNGRADED_TO_CANDIDATE",
        "matcher_version":2752,
    }
    if validation["output_rows"]!=expected:
        raise RuntimeError(f"Output row reconciliation failed {validation}")
    for key in (
        "duplicate_local_building_ids",
        "duplicate_local_source_ids",
        "null_local_geometry",
        "invalid_local_geometry",
        "duplicate_output_local_ids",
        "missing_status",
        "duplicate_confirmed_overture_ids",
    ):
        if validation[key]:
            raise RuntimeError(f"Crosswalk validation failed {key}={validation[key]}")

    return validation


def split_output(con,out_path,total_rows):
    size=out_path.stat().st_size
    if size<=HARD_BYTES:
        return [(out_path,total_rows,size)]
    n=max(2,math.ceil(size/TARGET_BYTES))
    src=q(str(out_path))
    while True:
        for old in out_path.parent.glob(out_path.stem+"-part-*.parquet"):
            old.unlink()
        parts=[]
        for i in range(n):
            p=out_path.parent/f"{out_path.stem}-part-{i:04d}.parquet"
            con.execute(f"""
              COPY (
                SELECT * FROM read_parquet({src})
                WHERE hash(building_geometry_id)%{n}={i}
              )
              TO {q(str(p))}
              (FORMAT PARQUET,COMPRESSION ZSTD,ROW_GROUP_SIZE 100000)
            """)
            row=con.execute(f"""
              SELECT
                count(*)::BIGINT,
                count(*) FILTER(WHERE match_status='CONFIRMED')::BIGINT,
                count(*) FILTER(WHERE match_status LIKE 'CANDIDATE%')::BIGINT,
                count(*) FILTER(WHERE match_status='UNMATCHED')::BIGINT,
                (count(*)-count(DISTINCT building_geometry_id))::BIGINT,
                count(*) FILTER(WHERE match_status IS NULL OR match_status='')::BIGINT
              FROM read_parquet({q(str(p))})
            """).fetchone()
            rows=int(row[0])
            if rows==0:
                p.unlink(missing_ok=True)
                continue
            parts.append({
                "path":p,
                "rows":rows,
                "confirmed":int(row[1]),
                "candidate":int(row[2]),
                "unmatched":int(row[3]),
                "duplicate_output_local_ids":int(row[4]),
                "missing_status":int(row[5]),
                "bytes":p.stat().st_size,
            })
        if sum(x["rows"] for x in parts)!=total_rows:
            raise RuntimeError("Crosswalk shard row totals do not reconcile")
        if parts and max(x["bytes"] for x in parts)<=HARD_BYTES:
            return parts
        n*=2


def upload_parts(state,con,out_path,validation,source_files,cat):
    parts=split_output(con,out_path,validation["output_rows"])
    receipts=[]
    for idx,p in enumerate(parts):
        digest=sha256(p["path"])
        signed=broker("sign_part",state,{"part_index":idx})
        err=None
        for attempt in range(1,4):
            try:
                with open(p["path"],"rb") as fh:
                    rr=requests.put(
                        signed["signed_url"],
                        data=fh,
                        headers={
                            "content-type":"application/vnd.apache.parquet",
                            "x-upsert":"true",
                            "content-length":str(p["bytes"]),
                        },
                        timeout=3600,
                    )
                if rr.ok:
                    err=None
                    break
                err=f"HTTP {rr.status_code}: {rr.text[:1000]}"
            except Exception as exc:
                err=str(exc)
            if attempt<3:
                time.sleep(attempt*5)
                signed=broker("sign_part",state,{"part_index":idx})
        if err:
            raise RuntimeError(f"Crosswalk part upload failed {idx}: {err}")

        part_validation={
            "duplicate_output_local_ids":p["duplicate_output_local_ids"],
            "missing_status":p["missing_status"],
        }
        final=broker("finalize_part",state,{
            "part_index":idx,
            "object_path":signed["path"],
            "row_count":p["rows"],
            "confirmed_rows":p["confirmed"],
            "candidate_rows":p["candidate"],
            "unmatched_rows":p["unmatched"],
            "file_bytes":p["bytes"],
            "sha256":digest,
            "validation":part_validation,
            "metadata":{
                "builder":"PUBLIC_GITHUB_DUCKDB_CURRENT_CROSSWALK_V2752",
                "candidate_id":cat["candidate_id"],
                "local_source_record_id_rule":cat["source_record_id_rule"],
                "overture_release":"2026-08-19.0",
                "overture_license":"ODbL-1.0",
            },
        })
        receipts.append({
            "index":idx,"rows":p["rows"],"bytes":p["bytes"],"sha256":digest
        })
        print(json.dumps({
            "stage":"part_verified","state":state,"part":idx,
            "rows":p["rows"],"bytes":p["bytes"],"broker":final
        },separators=(",",":")))

    agg=hashlib.sha256()
    for r in receipts:
        agg.update(f"{r['index']}:{r['rows']}:{r['bytes']}:{r['sha256']}\n".encode())

    return broker("complete_sharded",state,{
        "part_count":len(receipts),
        "source_files":source_files,
        "aggregate_sha256":agg.hexdigest(),
        "validation":validation,
        "metadata":{
            "generated_at":dt.datetime.now(dt.timezone.utc).isoformat(),
            "builder":"PUBLIC_GITHUB_DUCKDB_CURRENT_CROSSWALK_V2752",
            "candidate_id":cat["candidate_id"],
            "source_url":cat["source_url"],
            "access_method":cat["access_method"],
            "local_source_record_id_rule":cat["source_record_id_rule"],
            "legal_status":cat["legal_status"],
            "legal_basis":cat.get("legal_basis"),
            "legal_evidence_url":cat.get("legal_evidence_url"),
            "overture_release":"2026-08-19.0",
            "overture_license":"ODbL-1.0",
        },
    })


def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--state",required=True,choices=["DC","LA","NY","PA"])
    ap.add_argument("--out-dir",default="crosswalk-v2752")
    args=ap.parse_args()
    state=args.state.upper()
    outdir=pathlib.Path(args.out_dir)/state
    outdir.mkdir(parents=True,exist_ok=True)

    reset=broker("reset_parts",state)
    if reset.get("skipped") and reset.get("reason")=="ALREADY_VERIFIED":
        print(json.dumps({"complete":True,"state":state,"skipped":True,"reason":"ALREADY_VERIFIED"}))
        return

    cat=broker("catalog",state)
    expected=int(cat["expected_local_rows"])
    source_files=len(cat.get("files",[]))
    broker("report",state,{
        "status":"BUILDING",
        "metadata":{
            "builder_version":2752,
            "expected_local_rows":expected,
            "overture_files":source_files,
            "strategy":"EXACT_STORED_WKB_PLUS_DIRECT_DUCKDB_OVERTURE",
        },
    })

    local_path=outdir/"local-authoritative.parquet"
    output_path=outdir/"crosswalk.parquet"
    try:
        fetch_local(state,local_path,expected)
        con=setup_duckdb()
        try:
            started=time.time()
            validation=build_crosswalk(con,state,cat,local_path,output_path)
            print(json.dumps({
                "stage":"crosswalk_built","state":state,
                "elapsed_seconds":round(time.time()-started,2),
                "validation":validation,
                "file_bytes":output_path.stat().st_size,
            },separators=(",",":")))
            final=upload_parts(state,con,output_path,validation,source_files,cat)
        finally:
            con.close()

        print(json.dumps({
            "complete":True,
            "state":state,
            "expected_local_rows":expected,
            "source_files":source_files,
            "validation":validation,
            "final":final,
        },separators=(",",":")))
    except Exception as exc:
        try:
            broker("report",state,{
                "status":"FAILED",
                "metadata":{"builder_version":2752,"error":str(exc)[:1800]},
            })
        except Exception:
            pass
        raise


if __name__=="__main__":
    main()
