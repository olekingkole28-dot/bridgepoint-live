#!/usr/bin/env python3
import argparse, base64, datetime as dt, hashlib, json, os, pathlib, time
import duckdb, requests

SUPABASE_URL=os.environ["SUPABASE_URL"].rstrip("/")
BROKER=f"{SUPABASE_URL}/functions/v1/bridgepoint-building-archive-broker-v2710"
AUDIENCE="bridgepoint-building-v2710"
STATE="TX"; KIND="building"
MAX_RAW_ROWS_PER_CHUNK=120_000
HARD_BYTES=42*1024*1024
BOUNDARY_TOL=1e-7
TOKEN={"value":None,"exp":0}

def jwt_exp(token):
    try:
        p=token.split(".")[1]; p+="="*((4-len(p)%4)%4)
        return int(json.loads(base64.urlsafe_b64decode(p.encode())).get("exp",0))
    except Exception: return 0

def oidc():
    now=int(time.time())
    if TOKEN["value"] and TOKEN["exp"]>now+45: return TOKEN["value"]
    url=os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]; tok=os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]
    sep="&" if "?" in url else "?"
    r=requests.get(f"{url}{sep}audience={AUDIENCE}",headers={"Authorization":f"bearer {tok}"},timeout=30)
    r.raise_for_status(); v=r.json()["value"]; TOKEN["value"]=v; TOKEN["exp"]=jwt_exp(v); return v

def broker(action,extra=None,timeout=180):
    body={"action":action,"oidc_token":oidc(),"state_code":STATE,"asset_kind":KIND}
    body.update(extra or {})
    r=requests.post(BROKER,json=body,headers={"content-type":"application/json"},timeout=timeout)
    if not r.ok: raise RuntimeError(f"broker {action} {r.status_code}: {r.text[:2000]}")
    d=r.json()
    if d.get("complete") is False: raise RuntimeError(f"broker {action} failed: {d}")
    return d

def q(v): return "'" + str(v).replace("'","''") + "'"
def sha256(path):
    h=hashlib.sha256()
    with open(path,"rb") as f:
        for c in iter(lambda:f.read(8*1024*1024),b""): h.update(c)
    return h.hexdigest()

def setup(boundary):
    con=duckdb.connect(":memory:")
    con.execute("SET threads=4"); con.execute("SET memory_limit='7GB'"); con.execute("SET preserve_insertion_order=false")
    con.execute("INSTALL httpfs; LOAD httpfs"); con.execute("INSTALL spatial; LOAD spatial")
    con.execute("CREATE TEMP TABLE bp_boundary AS SELECT ST_GeomFromGeoJSON(?) geom",[json.dumps(boundary,separators=(",",":"))])
    return con

def chunks(groups):
    out=[]; cur=[]; rows=0; prev=None
    for g in sorted(groups,key=lambda x:int(x["row_group_id"])):
        rg=int(g["row_group_id"]); n=int(g["row_count"])
        if cur and (rg!=prev+1 or rows+n>MAX_RAW_ROWS_PER_CHUNK):
            out.append(cur); cur=[]; rows=0
        cur.append(g); rows+=n; prev=rg
    if cur: out.append(cur)
    return out

def clip(con,url,item_id,chunk,bbox,path):
    west,south,east,north=bbox
    rs=int(chunk[0]["row_start"]); re=int(chunk[-1]["row_start"])+int(chunk[-1]["row_count"])
    expected=sum(int(x["row_count"]) for x in chunk)
    if re-rs!=expected: raise RuntimeError("non-contiguous row span")
    src=f"read_parquet({q(url)}, file_row_number=true)"
    raw=int(con.execute(f"select count(*) from {src} where file_row_number>={rs} and file_row_number<{re}").fetchone()[0])
    if raw!=expected: raise RuntimeError(f"raw mismatch {raw}!={expected}")
    out=q(str(path))
    con.execute(f"""
      COPY (
        WITH candidate AS (
          SELECT * EXCLUDE(file_row_number,geometry), geometry AS _bp_geom
          FROM {src}
          WHERE file_row_number>={rs} AND file_row_number<{re}
            AND bbox.xmin<={east} AND bbox.xmax>={west}
            AND bbox.ymin<={north} AND bbox.ymax>={south}
        ), clipped AS (
          SELECT candidate.* EXCLUDE(_bp_geom), ST_Intersection(_bp_geom,b.geom) AS _bp_clip
          FROM candidate CROSS JOIN bp_boundary b
          WHERE ST_Intersects(_bp_geom,b.geom)
        )
        SELECT clipped.* EXCLUDE(_bp_clip),
               ST_AsWKB(_bp_clip) AS geometry,
               'TX'::VARCHAR AS _bp_jurisdiction,
               'building'::VARCHAR AS _bp_asset_kind,
               '2026-08-19.0'::VARCHAR AS _bp_source_release,
               'OVERTURE_BUILDINGS_20260819'::VARCHAR AS _bp_source_key,
               'ODbL-1.0'::VARCHAR AS _bp_source_license,
               {q(item_id)}::VARCHAR AS _bp_source_item_id
        FROM clipped WHERE NOT ST_IsEmpty(_bp_clip)
      ) TO {out} (FORMAT PARQUET,COMPRESSION ZSTD,ROW_GROUP_SIZE 100000)
    """)
    if path.stat().st_size>HARD_BYTES: raise RuntimeError(f"chunk output too large: {path.stat().st_size}")
    desc=con.execute(f"DESCRIBE SELECT * FROM read_parquet({out})").fetchall()
    geom_type={r[0]:str(r[1]).upper() for r in desc}.get("geometry","")
    geom_expr="geometry" if "GEOMETRY" in geom_type else "ST_GeomFromWKB(geometry)"
    row=con.execute(f"""
      WITH x AS (
        SELECT *, {geom_expr} g FROM read_parquet({out})
      ), b AS (SELECT geom FROM bp_boundary), d AS (
        SELECT x.*, ST_Difference(g,b.geom) outside_geom FROM x CROSS JOIN b
      )
      SELECT count(*)::BIGINT,
             count(*) FILTER(WHERE geometry IS NULL)::BIGINT,
             count(*) FILTER(WHERE ST_IsEmpty(g))::BIGINT,
             count(*) FILTER(WHERE NOT ST_IsEmpty(outside_geom) AND ST_Length(outside_geom)>{BOUNDARY_TOL})::BIGINT,
             (count(*)-count(DISTINCT id))::BIGINT
      FROM d
    """).fetchone()
    val={"null_geometry":int(row[1]),"empty_geometry":int(row[2]),"outside_geometry":int(row[3]),"duplicate_ids":int(row[4]),
         "row_group_first":int(chunk[0]["row_group_id"]),"row_group_last":int(chunk[-1]["row_group_id"]),"raw_rows":expected,
         "source_item_id":item_id,"boundary_validation_tolerance_degrees":BOUNDARY_TOL}
    if any(val[k] for k in ("null_geometry","empty_geometry","outside_geometry","duplicate_ids")): raise RuntimeError(f"validation failed {val}")
    return int(row[0]),val

def upload(item_id,rg_first,path,rows,val):
    part_index=int(item_id)*1000+int(rg_first)
    digest=sha256(path)
    signed=broker("sign_part",{"part_index":part_index})
    with open(path,"rb") as f:
        r=requests.put(signed["signed_url"],data=f,headers={"content-type":"application/vnd.apache.parquet","x-upsert":"true","content-length":str(path.stat().st_size)},timeout=3600)
    if not r.ok: raise RuntimeError(f"upload {r.status_code}: {r.text[:1000]}")
    broker("finalize_part",{
      "part_index":part_index,"row_count":rows,"file_bytes":path.stat().st_size,"sha256":digest,"validation":val,
      "metadata":{"builder":"PUBLIC_GITHUB_DUCKDB_TX_ITEM_PARALLEL_V2765","builder_version":2765,
                  "source_item_id":item_id,"row_group_first":val["row_group_first"],"row_group_last":val["row_group_last"],
                  "raw_rows":val["raw_rows"],"generated_at":dt.datetime.now(dt.timezone.utc).isoformat(),
                  "source_release":"2026-08-19.0","source_key":"OVERTURE_BUILDINGS_20260819","source_license":"ODbL-1.0"}
    })
    return part_index

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--item",required=True)
    ap.add_argument("--lane",type=int,default=0)
    ap.add_argument("--lanes",type=int,default=1)
    args=ap.parse_args()
    item=args.item
    if args.lanes<1 or args.lane<0 or args.lane>=args.lanes:
        raise RuntimeError(f"invalid lane {args.lane}/{args.lanes}")
    cat=broker("catalog"); rgcat=broker("rowgroups"); parts=broker("parts")
    files={str(x["item_id"]):x for x in cat.get("files",[])}
    if item not in files: raise RuntimeError(f"item {item} not in TX catalog")
    allg=[g for g in rgcat.get("rowgroups",[]) if str(g["item_id"])==item]
    if not allg:
        print(json.dumps({"complete":True,"item":item,"skipped":"NO_TX_ROWGROUPS"})); return
    existing=[p for p in parts.get("parts",[]) if p.get("status")=="VERIFIED" and str((p.get("metadata") or {}).get("source_item_id") or "")==item]
    if any((p.get("metadata") or {}).get("row_group_first") is None for p in existing):
        print(json.dumps({"complete":True,"item":item,"skipped":"FULL_ITEM_ALREADY_VERIFIED"})); return
    covered=set()
    for p in existing:
        m=p.get("metadata") or {}
        if m.get("row_group_first") is not None:
            covered.update(range(int(m["row_group_first"]),int(m["row_group_last"])+1))
    remain=[g for g in allg if int(g["row_group_id"]) not in covered]
    con=setup(cat["state_geojson"]); outdir=pathlib.Path("tx-parallel")/item; outdir.mkdir(parents=True,exist_ok=True)
    bbox=list(map(float,cat["bbox"]))
    done_rows=0; done_parts=0
    try:
        planned=chunks(remain)
        lane_chunks=[ch for i,ch in enumerate(planned) if i % args.lanes == args.lane]
        for ch in lane_chunks:
            first=int(ch[0]["row_group_id"]); last=int(ch[-1]["row_group_id"])
            path=outdir/f"{item}-rg{first:03d}-{last:03d}.parquet"; path.unlink(missing_ok=True)
            rows,val=clip(con,files[item]["url"],item,ch,bbox,path)
            if rows:
                idx=upload(item,first,path,rows,val); done_rows+=rows; done_parts+=1
                print(json.dumps({"stage":"verified_chunk","item":item,"part_index":idx,"rg_first":first,"rg_last":last,"rows":rows},separators=(",",":")))
            path.unlink(missing_ok=True)
        broker("report",{"status":"BUILDING","stage":"TX_PARALLEL_ITEM_LANE_COMPLETE","metadata":{"builder_version":2765,"parallel_item":item,"parallel_lane":args.lane,"parallel_lanes":args.lanes,"item_rows_uploaded":done_rows,"item_parts_uploaded":done_parts}})
        print(json.dumps({"complete":True,"item":item,"lane":args.lane,"lanes":args.lanes,"rows_uploaded":done_rows,"parts_uploaded":done_parts},separators=(",",":")))
    finally:
        con.close()
if __name__=="__main__": main()
