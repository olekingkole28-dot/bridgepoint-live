#!/usr/bin/env python3
import argparse, base64, datetime as dt, hashlib, json, os, pathlib, time
import duckdb, requests

SUPABASE_URL=os.environ["SUPABASE_URL"].rstrip("/")
BROKER=f"{SUPABASE_URL}/functions/v1/bridgepoint-building-archive-broker-v2710"
AUDIENCE="bridgepoint-building-v2710"
STATE="TX"; KIND="building"; TOL=1e-7
TOKEN={"v":None,"exp":0}

def jwt_exp(t):
    try:
        p=t.split(".")[1]; p+="="*((4-len(p)%4)%4)
        return int(json.loads(base64.urlsafe_b64decode(p.encode())).get("exp",0))
    except Exception:return 0

def oidc():
    now=int(time.time())
    if TOKEN["v"] and TOKEN["exp"]>now+45:return TOKEN["v"]
    u=os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]; tok=os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]
    sep="&" if "?" in u else "?"
    r=requests.get(f"{u}{sep}audience={AUDIENCE}",headers={"Authorization":f"bearer {tok}"},timeout=30)
    r.raise_for_status(); v=r.json()["value"]; TOKEN["v"]=v; TOKEN["exp"]=jwt_exp(v); return v

def broker(action,extra=None,timeout=240):
    b={"action":action,"state_code":STATE,"asset_kind":KIND,"oidc_token":oidc()}; b.update(extra or {})
    r=requests.post(BROKER,json=b,headers={"content-type":"application/json"},timeout=timeout)
    if not r.ok: raise RuntimeError(f"{action} {r.status_code}: {r.text[:2000]}")
    d=r.json()
    if d.get("complete") is False: raise RuntimeError(f"{action} failed: {d}")
    return d

def q(v): return "'" + str(v).replace("'","''") + "'"

def digest(path):
    h=hashlib.sha256()
    with open(path,"rb") as f:
        for c in iter(lambda:f.read(8*1024*1024),b""): h.update(c)
    return h.hexdigest()

def setup(boundary):
    c=duckdb.connect(":memory:")
    c.execute("SET threads=4"); c.execute("SET memory_limit='7GB'"); c.execute("SET preserve_insertion_order=false")
    c.execute("INSTALL httpfs; LOAD httpfs"); c.execute("INSTALL spatial; LOAD spatial")
    c.execute("CREATE TEMP TABLE bp_boundary AS SELECT ST_GeomFromGeoJSON(?) geom",[json.dumps(boundary,separators=(",",":"))])
    return c

def process(con,rg,bbox,out):
    item=str(rg["item_id"]); rgi=int(rg["row_group_id"]); rs=int(rg["row_start"]); n=int(rg["row_count"]); re=rs+n
    west,south,east,north=bbox
    src=f"read_parquet({q(rg['url'])}, file_row_number=true)"
    raw=int(con.execute(f"select count(*) from {src} where file_row_number>={rs} and file_row_number<{re}").fetchone()[0])
    if raw!=n: raise RuntimeError(f"raw mismatch {item}/{rgi}: {raw}!={n}")
    con.execute(f"""
      COPY (
        WITH candidate AS (
          SELECT * EXCLUDE(file_row_number,geometry), geometry _g
          FROM {src}
          WHERE file_row_number>={rs} AND file_row_number<{re}
            AND bbox.xmin<={east} AND bbox.xmax>={west}
            AND bbox.ymin<={north} AND bbox.ymax>={south}
        ), clipped AS (
          SELECT candidate.* EXCLUDE(_g), ST_Intersection(_g,b.geom) _clip
          FROM candidate CROSS JOIN bp_boundary b
          WHERE ST_Intersects(_g,b.geom)
        )
        SELECT clipped.* EXCLUDE(_clip),
               ST_AsWKB(_clip) geometry,
               'TX'::VARCHAR _bp_jurisdiction,
               'building'::VARCHAR _bp_asset_kind,
               '2026-08-19.0'::VARCHAR _bp_source_release,
               'OVERTURE_BUILDINGS_20260819'::VARCHAR _bp_source_key,
               'ODbL-1.0'::VARCHAR _bp_source_license,
               {q(item)}::VARCHAR _bp_source_item_id
        FROM clipped WHERE NOT ST_IsEmpty(_clip)
      ) TO {q(str(out))} (FORMAT PARQUET,COMPRESSION ZSTD,ROW_GROUP_SIZE 100000)
    """)
    desc=con.execute(f"DESCRIBE SELECT * FROM read_parquet({q(str(out))})").fetchall()
    gt={x[0]:str(x[1]).upper() for x in desc}.get("geometry","")
    ge="geometry" if "GEOMETRY" in gt else "ST_GeomFromWKB(geometry)"
    row=con.execute(f"""
      WITH x AS (SELECT *,{ge} g FROM read_parquet({q(str(out))})),
      b AS (SELECT geom FROM bp_boundary),
      d AS (SELECT x.*,ST_Difference(g,b.geom) outside FROM x CROSS JOIN b)
      SELECT count(*)::BIGINT,
             count(*) FILTER(WHERE geometry IS NULL)::BIGINT,
             count(*) FILTER(WHERE ST_IsEmpty(g))::BIGINT,
             count(*) FILTER(WHERE NOT ST_IsEmpty(outside) AND ST_Length(outside)>{TOL})::BIGINT,
             (count(*)-count(DISTINCT id))::BIGINT
      FROM d
    """).fetchone()
    val={"null_geometry":int(row[1]),"empty_geometry":int(row[2]),"outside_geometry":int(row[3]),"duplicate_ids":int(row[4]),
         "source_item_id":item,"row_group_first":rgi,"row_group_last":rgi,"raw_rows":n,
         "boundary_validation_tolerance_degrees":TOL,"repair_version":2770}
    if any(val[k] for k in ("null_geometry","empty_geometry","outside_geometry","duplicate_ids")):
        raise RuntimeError(f"validation failed {item}/{rgi}: {val}")
    return int(row[0]),val

def upload(item,rgi,path,rows,val):
    idx=int(item)*1000+rgi
    sha=digest(path); signed=broker("sign_part",{"part_index":idx})
    err=None
    for attempt in range(1,4):
        try:
            with open(path,"rb") as f:
                r=requests.put(signed["signed_url"],data=f,headers={"content-type":"application/vnd.apache.parquet","x-upsert":"true","content-length":str(path.stat().st_size)},timeout=1800)
            if r.ok: err=None; break
            err=f"HTTP {r.status_code}: {r.text[:1000]}"
        except Exception as e: err=str(e)
        if attempt<3:
            time.sleep(3*attempt); signed=broker("sign_part",{"part_index":idx})
    if err: raise RuntimeError(f"upload {idx}: {err}")
    broker("finalize_part",{"part_index":idx,"row_count":rows,"file_bytes":path.stat().st_size,"sha256":sha,"validation":val,
      "metadata":{"builder":"TX_DETERMINISTIC_GAP_REPAIR_V2770","builder_version":2770,"source_item_id":item,
      "row_group_first":rgi,"row_group_last":rgi,"raw_rows":val["raw_rows"],"source_release":"2026-08-19.0",
      "source_key":"OVERTURE_BUILDINGS_20260819","source_license":"ODbL-1.0","generated_at":dt.datetime.now(dt.timezone.utc).isoformat()}})
    return idx

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("--lane",type=int,required=True); ap.add_argument("--lanes",type=int,required=True)
    a=ap.parse_args()
    if a.lanes<1 or not 0<=a.lane<a.lanes: raise RuntimeError("invalid lane")
    cat=broker("catalog"); miss=broker("missing_rowgroups")
    rows=list(miss.get("rowgroups",[]))
    mine=[g for g in rows if ((int(g["item_id"])*257+int(g["row_group_id"]))%a.lanes)==a.lane]
    con=setup(cat["state_geojson"]); bbox=list(map(float,cat["bbox"]))
    outdir=pathlib.Path("tx-gap-repair")/f"lane-{a.lane:02d}"; outdir.mkdir(parents=True,exist_ok=True)
    uploaded=0; zeros=0; features=0
    try:
        for g in mine:
            item=str(g["item_id"]); rgi=int(g["row_group_id"]); p=outdir/f"{item}-{rgi:03d}.parquet"; p.unlink(missing_ok=True)
            n,val=process(con,g,bbox,p)
            if n==0:
                broker("mark_zero_rowgroup",{"item_id":item,"row_group_id":rgi,"proof_run_id":int(os.environ.get("GITHUB_RUN_ID","0") or 0),
                  "proof_job_label":f"lane-{a.lane}-of-{a.lanes}","metadata":{"raw_rows":int(g["row_count"]),"stable_lane":a.lane,"stable_lanes":a.lanes}})
                zeros+=1
            else:
                idx=upload(item,rgi,p,n,val); uploaded+=1; features+=n
                print(json.dumps({"stage":"verified","lane":a.lane,"item":item,"rg":rgi,"part":idx,"rows":n},separators=(",",":")))
            p.unlink(missing_ok=True)
        print(json.dumps({"complete":True,"lane":a.lane,"lanes":a.lanes,"assigned":len(mine),"uploaded_parts":uploaded,"zero_rowgroups":zeros,"features":features},separators=(",",":")))
    finally: con.close()

if __name__=="__main__": main()
