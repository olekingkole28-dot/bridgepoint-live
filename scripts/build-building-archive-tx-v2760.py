#!/usr/bin/env python3
"""
BridgePoint TX building archive resumable row-group builder v2760.

Resumes the existing TX/building v2710 archive without deleting verified parts.
It processes only Overture row-group spans after the last fully reported source
item, exact-clips them to Texas, uploads verified shards, then runs a final
cross-part uniqueness audit before completing the existing national manifest.

Data only. No app/UI changes.
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

SUPABASE_URL=os.environ["SUPABASE_URL"].rstrip("/")
BROKER=f"{SUPABASE_URL}/functions/v1/bridgepoint-building-archive-broker-v2710"
AUDIENCE="bridgepoint-building-v2710"
STATE="TX"
KIND="building"
MAX_RAW_ROWS_PER_CHUNK=260_000
TARGET_BYTES=28*1024*1024
HARD_BYTES=42*1024*1024
BOUNDARY_TOL=1e-7
TOKEN={"value":None,"exp":0}


def jwt_exp(token):
    try:
        p=token.split(".")[1]
        p += "="*((4-len(p)%4)%4)
        import base64
        return int(json.loads(base64.urlsafe_b64decode(p.encode())).get("exp",0))
    except Exception:
        return 0


def oidc():
    now=int(time.time())
    if TOKEN["value"] and TOKEN["exp"]>now+45:
        return TOKEN["value"]
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
    TOKEN["value"]=value
    TOKEN["exp"]=jwt_exp(value)
    return value


def broker(action,extra=None,timeout=180):
    body={
        "action":action,
        "oidc_token":oidc(),
        "state_code":STATE,
        "asset_kind":KIND,
    }
    body.update(extra or {})
    r=requests.post(BROKER,json=body,headers={"content-type":"application/json"},timeout=timeout)
    if not r.ok:
        raise RuntimeError(f"broker {action} {r.status_code}: {r.text[:2500]}")
    data=r.json()
    if data.get("complete") is False:
        raise RuntimeError(f"broker {action} failed: {data}")
    return data


def q(v):
    return "'" + str(v).replace("'","''") + "'"


def sha256(path):
    h=hashlib.sha256()
    with open(path,"rb") as fh:
        for chunk in iter(lambda:fh.read(8*1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()


def db(boundary_geojson):
    con=duckdb.connect(":memory:")
    con.execute("SET threads=4")
    con.execute("SET memory_limit='7GB'")
    con.execute("SET preserve_insertion_order=false")
    con.execute("INSTALL httpfs; LOAD httpfs")
    con.execute("INSTALL spatial; LOAD spatial")
    con.execute(
        "CREATE TEMP TABLE bp_boundary AS SELECT ST_GeomFromGeoJSON(?) geom",
        [json.dumps(boundary_geojson,separators=(",",":"))],
    )
    return con


def make_chunks(groups):
    """Group only consecutive row groups, bounded by raw row count."""
    out=[]
    current=[]
    raw=0
    prev=None
    for g in sorted(groups,key=lambda x:int(x["row_group_id"])):
        rg=int(g["row_group_id"])
        rows=int(g["row_count"])
        must_break=(
            current and (
                prev is None or rg!=prev+1 or raw+rows>MAX_RAW_ROWS_PER_CHUNK
            )
        )
        if must_break:
            out.append(current)
            current=[]
            raw=0
        current.append(g)
        raw+=rows
        prev=rg
    if current:
        out.append(current)
    return out


def clip_chunk(con,url,item_id,chunk,west,south,east,north,out_path):
    first=chunk[0]
    last=chunk[-1]
    row_start=int(first["row_start"])
    row_end=int(last["row_start"])+int(last["row_count"])
    expected_raw=sum(int(x["row_count"]) for x in chunk)
    if row_end-row_start!=expected_raw:
        raise RuntimeError(
            f"non-contiguous row span item={item_id} rg={first['row_group_id']}-{last['row_group_id']}"
        )

    src=f"read_parquet({q(url)}, file_row_number=true)"
    out=q(str(out_path))

    raw_rows=int(con.execute(
        f"SELECT count(*)::BIGINT FROM {src} WHERE file_row_number>={row_start} AND file_row_number<{row_end}"
    ).fetchone()[0])
    if raw_rows!=expected_raw:
        raise RuntimeError(
            f"raw row reconciliation failed item={item_id} expected={expected_raw} actual={raw_rows}"
        )

    con.execute(f"""
      COPY (
        WITH candidate AS (
          SELECT * EXCLUDE(file_row_number,geometry), geometry AS _bp_geom
          FROM {src}
          WHERE file_row_number>={row_start}
            AND file_row_number<{row_end}
            AND bbox.xmin<={east}
            AND bbox.xmax>={west}
            AND bbox.ymin<={north}
            AND bbox.ymax>={south}
        ),
        clipped AS (
          SELECT
            candidate.* EXCLUDE(_bp_geom),
            ST_Intersection(_bp_geom,b.geom) AS _bp_clip
          FROM candidate
          CROSS JOIN bp_boundary b
          WHERE ST_Intersects(_bp_geom,b.geom)
        )
        SELECT
          clipped.* EXCLUDE(_bp_clip),
          ST_AsWKB(_bp_clip) AS geometry,
          '{STATE}'::VARCHAR AS _bp_jurisdiction,
          '{KIND}'::VARCHAR AS _bp_asset_kind,
          '2026-08-19.0'::VARCHAR AS _bp_source_release,
          'OVERTURE_BUILDINGS_20260819'::VARCHAR AS _bp_source_key,
          'ODbL-1.0'::VARCHAR AS _bp_source_license,
          {q(item_id)}::VARCHAR AS _bp_source_item_id
        FROM clipped
        WHERE NOT ST_IsEmpty(_bp_clip)
      )
      TO {out}
      (FORMAT PARQUET,COMPRESSION ZSTD,ROW_GROUP_SIZE 100000)
    """)

    size=out_path.stat().st_size
    desc=con.execute(f"DESCRIBE SELECT * FROM read_parquet({out})").fetchall()
    types={r[0]:str(r[1]).upper() for r in desc}
    geom_type=types.get("geometry","")
    geom_expr="ST_GeomFromWKB(geometry)" if "BLOB" in geom_type else "geometry"

    row=con.execute(f"""
      WITH x AS (
        SELECT *, CASE WHEN geometry IS NULL THEN NULL ELSE {geom_expr} END AS g
        FROM read_parquet({out})
      ),
      b AS (SELECT geom FROM bp_boundary),
      d AS (
        SELECT x.*,
               CASE WHEN g IS NULL THEN NULL ELSE ST_Difference(g,b.geom) END outside_geom
        FROM x CROSS JOIN b
      )
      SELECT
        count(*)::BIGINT,
        count(*) FILTER(WHERE geometry IS NULL)::BIGINT,
        count(*) FILTER(WHERE g IS NOT NULL AND ST_IsEmpty(g))::BIGINT,
        count(*) FILTER(
          WHERE g IS NOT NULL AND NOT ST_IsEmpty(g)
            AND outside_geom IS NOT NULL AND NOT ST_IsEmpty(outside_geom)
            AND ST_Length(outside_geom)>{BOUNDARY_TOL}
        )::BIGINT,
        (count(*)-count(DISTINCT id))::BIGINT,
        count(*) FILTER(
          WHERE g IS NOT NULL AND NOT ST_IsEmpty(g)
            AND outside_geom IS NOT NULL AND NOT ST_IsEmpty(outside_geom)
            AND ST_Length(outside_geom)<={BOUNDARY_TOL}
        )::BIGINT
      FROM d
    """).fetchone()

    validation={
        "null_geometry":int(row[1]),
        "empty_geometry":int(row[2]),
        "outside_geometry":int(row[3]),
        "duplicate_ids":int(row[4]),
        "precision_slivers":int(row[5]),
        "boundary_validation_tolerance_degrees":BOUNDARY_TOL,
        "source_item_id":item_id,
        "row_group_first":int(first["row_group_id"]),
        "row_group_last":int(last["row_group_id"]),
        "raw_rows":expected_raw,
    }
    if any(validation[k] for k in ("null_geometry","empty_geometry","outside_geometry","duplicate_ids")):
        raise RuntimeError(f"chunk validation failed {validation}")

    return int(row[0]),size,validation


def split_output(con,path,rows):
    size=path.stat().st_size
    if size<=HARD_BYTES:
        return [(path,rows,size)]
    n=max(2,math.ceil(size/TARGET_BYTES))
    src=q(str(path))
    while True:
        pieces=[]
        for old in path.parent.glob(path.stem+"-piece-*.parquet"):
            old.unlink()
        for i in range(n):
            p=path.parent/f"{path.stem}-piece-{i:03d}.parquet"
            con.execute(f"""
              COPY (
                SELECT * FROM read_parquet({src})
                WHERE hash(id)%{n}={i}
              )
              TO {q(str(p))}
              (FORMAT PARQUET,COMPRESSION ZSTD,ROW_GROUP_SIZE 100000)
            """)
            rr=con.execute(
                f"SELECT count(*)::BIGINT,(count(*)-count(DISTINCT id))::BIGINT FROM read_parquet({q(str(p))})"
            ).fetchone()
            nrows=int(rr[0])
            if int(rr[1]):
                raise RuntimeError(f"split duplicate ids piece={i}")
            if nrows==0:
                p.unlink(missing_ok=True)
                continue
            pieces.append((p,nrows,p.stat().st_size))
        if sum(x[1] for x in pieces)!=rows:
            raise RuntimeError("split row reconciliation failed")
        if pieces and max(x[2] for x in pieces)<=HARD_BYTES:
            return pieces
        n*=2


def upload(part_index,path,rows,validation,item_id,piece_index):
    digest=sha256(path)
    signed=broker("sign_part",{"part_index":part_index})
    err=None
    for attempt in range(1,4):
        try:
            with open(path,"rb") as fh:
                r=requests.put(
                    signed["signed_url"],
                    data=fh,
                    headers={
                        "content-type":"application/vnd.apache.parquet",
                        "x-upsert":"true",
                        "content-length":str(path.stat().st_size),
                    },
                    timeout=3600,
                )
            if r.ok:
                err=None
                break
            err=f"HTTP {r.status_code}: {r.text[:1000]}"
        except Exception as exc:
            err=str(exc)
        if attempt<3:
            time.sleep(attempt*5)
            signed=broker("sign_part",{"part_index":part_index})
    if err:
        raise RuntimeError(f"upload failed part={part_index}: {err}")

    meta={
        "builder":"PUBLIC_GITHUB_DUCKDB_TX_ROWGROUP_RESUME_V2760",
        "builder_version":2760,
        "generated_at":dt.datetime.now(dt.timezone.utc).isoformat(),
        "source_item_id":item_id,
        "source_file_piece_index":piece_index,
        "row_group_first":validation["row_group_first"],
        "row_group_last":validation["row_group_last"],
        "raw_rows":validation["raw_rows"],
        "source_release":"2026-08-19.0",
        "source_key":"OVERTURE_BUILDINGS_20260819",
        "source_license":"ODbL-1.0",
        "compression":"ZSTD",
    }
    broker("finalize_part",{
        "part_index":part_index,
        "row_count":rows,
        "file_bytes":path.stat().st_size,
        "sha256":digest,
        "validation":validation,
        "metadata":meta,
    })
    return {
        "part_index":part_index,
        "row_count":rows,
        "file_bytes":path.stat().st_size,
        "sha256":digest,
        "metadata":meta,
    }


def strict_global_id_audit(con,parts):
    urls=[]
    for p in sorted(parts,key=lambda x:int(x["part_index"])):
        signed=broker("download_part",{"part_index":int(p["part_index"])})
        urls.append(signed["signed_url"])
    if not urls:
        raise RuntimeError("no archive parts for global audit")
    src="read_parquet(["+",".join(q(u) for u in urls)+"], union_by_name=true)"
    row=con.execute(
        f"SELECT count(*)::BIGINT,count(DISTINCT id)::BIGINT,count(*)-count(DISTINCT id) FROM {src}"
    ).fetchone()
    return {
        "rows":int(row[0]),
        "distinct_ids":int(row[1]),
        "duplicate_ids":int(row[2]),
    }


def main():
    manifest=broker("item")
    if manifest.get("verified"):
        print(json.dumps({"complete":True,"skipped":True,"reason":"ALREADY_VERIFIED"}))
        return

    cat=broker("catalog")
    rgcat=broker("rowgroups")
    parts_doc=broker("parts")
    existing=[
        p for p in parts_doc.get("parts",[])
        if p.get("status")=="VERIFIED"
    ]
    existing.sort(key=lambda x:int(x["part_index"]))

    meta=manifest.get("metadata") or {}
    last_completed=str(meta.get("last_source_item_id") or "")
    next_part=(max([int(p["part_index"]) for p in existing])+1) if existing else 0

    files={str(f["item_id"]):f for f in cat.get("files",[])}
    groups_by_item={}
    for g in rgcat.get("rowgroups",[]):
        groups_by_item.setdefault(str(g["item_id"]),[]).append(g)

    remaining=[
        item_id for item_id in sorted(files)
        if not last_completed or item_id>last_completed
    ]
    if not remaining:
        print(json.dumps({"stage":"no_remaining_source_files","last_completed":last_completed}))

    outdir=pathlib.Path("tx-building-v2760")
    outdir.mkdir(parents=True,exist_ok=True)
    west,south,east,north=map(float,cat["bbox"])
    con=db(cat["state_geojson"])

    try:
        total_new_rows=0
        for item_pos,item_id in enumerate(remaining):
            url=files[item_id]["url"]
            groups=groups_by_item.get(item_id,[])
            chunks=make_chunks(groups)
            item_rows=0
            item_parts=0

            for ci,chunk in enumerate(chunks):
                p=outdir/f"tx-{item_id}-rg{int(chunk[0]['row_group_id']):03d}-{int(chunk[-1]['row_group_id']):03d}.parquet"
                p.unlink(missing_ok=True)
                started=time.time()
                rows,_,validation=clip_chunk(
                    con,url,item_id,chunk,west,south,east,north,p
                )
                if rows==0:
                    p.unlink(missing_ok=True)
                    print(json.dumps({
                        "stage":"chunk_complete","item_id":item_id,
                        "rg_first":validation["row_group_first"],
                        "rg_last":validation["row_group_last"],
                        "rows":0,
                        "elapsed_seconds":round(time.time()-started,2)
                    },separators=(",",":")))
                    continue

                pieces=split_output(con,p,rows)
                for piece_index,(piece,piece_rows,_) in enumerate(pieces):
                    rec=upload(
                        next_part,piece,piece_rows,validation,item_id,piece_index
                    )
                    next_part+=1
                    item_parts+=1
                    item_rows+=piece_rows
                    total_new_rows+=piece_rows
                    if piece!=p:
                        piece.unlink(missing_ok=True)
                p.unlink(missing_ok=True)

                print(json.dumps({
                    "stage":"chunk_complete","item_id":item_id,
                    "rg_first":validation["row_group_first"],
                    "rg_last":validation["row_group_last"],
                    "rows":rows,"total_new_rows":total_new_rows,
                    "next_part":next_part,
                    "elapsed_seconds":round(time.time()-started,2)
                },separators=(",",":")))

            broker("report",{
                "status":"BUILDING",
                "stage":"TX_SOURCE_ITEM_RESUMED_COMPLETE",
                "metadata":{
                    "builder_version":2760,
                    "strategy":"ROWGROUP_CHUNK_RESUME",
                    "last_source_item_id":item_id,
                    "source_item_position":item_pos,
                    "remaining_source_items":len(remaining),
                    "item_rows_uploaded":item_rows,
                    "item_parts_uploaded":item_parts,
                    "parts_uploaded_total":next_part,
                }
            })
            print(json.dumps({
                "stage":"source_item_complete","item_id":item_id,
                "item_rows":item_rows,"item_parts":item_parts,
                "parts_total":next_part
            },separators=(",",":")))

        final_parts_doc=broker("parts")
        final_parts=[
            p for p in final_parts_doc.get("parts",[])
            if p.get("status")=="VERIFIED"
        ]
        final_parts.sort(key=lambda x:int(x["part_index"]))
        indexes=[int(p["part_index"]) for p in final_parts]
        if indexes!=list(range(len(indexes))):
            raise RuntimeError(f"part index gap: {indexes[:10]} ... {indexes[-10:]}")

        total_rows=sum(int(p["row_count"]) for p in final_parts)
        total_bytes=sum(int(p["file_bytes"]) for p in final_parts)

        global_ids=strict_global_id_audit(con,final_parts)
        if global_ids["rows"]!=total_rows or global_ids["duplicate_ids"]!=0:
            raise RuntimeError(
                f"global id audit failed rows={global_ids['rows']} parts_rows={total_rows} dup={global_ids['duplicate_ids']}"
            )

        agg=hashlib.sha256()
        for p in final_parts:
            agg.update(
                f"{int(p['part_index'])}:{int(p['row_count'])}:{int(p['file_bytes'])}:{p['sha256']}\n".encode()
            )

        result=broker("complete_sharded",{
            "part_count":len(final_parts),
            "total_rows":total_rows,
            "total_bytes":total_bytes,
            "aggregate_sha256":agg.hexdigest(),
            "metadata":{
                "generated_at":dt.datetime.now(dt.timezone.utc).isoformat(),
                "builder":"PUBLIC_GITHUB_DUCKDB_TX_ROWGROUP_RESUME_V2760",
                "builder_version":2760,
                "source_files":len(files),
                "source_release":"2026-08-19.0",
                "source_key":"OVERTURE_BUILDINGS_20260819",
                "source_license":"ODbL-1.0",
                "validation":{
                    "null_geometry":0,
                    "empty_geometry":0,
                    "outside_geometry":0,
                    "duplicate_ids":0,
                    "global_archive_rows":global_ids["rows"],
                    "global_distinct_ids":global_ids["distinct_ids"],
                    "global_duplicate_ids":global_ids["duplicate_ids"],
                    "resume_preserved_verified_parts":len(existing),
                    "truth_rule":"EXACT_TEXAS_CLIP; VERIFIED_PARTS_PRESERVED; GLOBAL_OVERTURE_ID_UNIQUENESS_PROVED"
                }
            }
        })
        print(json.dumps({
            "complete":True,"state":"TX","kind":"building",
            "rows":total_rows,"parts":len(final_parts),
            "global_id_audit":global_ids,"final":result
        },separators=(",",":")))
    except Exception as exc:
        try:
            broker("report",{
                "status":"FAILED",
                "stage":"TX_ROWGROUP_RESUME_V2760",
                "message":str(exc),
                "metadata":{"builder_version":2760}
            })
        except Exception:
            pass
        raise
    finally:
        con.close()


if __name__=="__main__":
    main()
