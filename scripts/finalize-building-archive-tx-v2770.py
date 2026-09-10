#!/usr/bin/env python3
import base64, hashlib, json, os, time
import duckdb, requests

SUPABASE_URL=os.environ["SUPABASE_URL"].rstrip("/")
BROKER=f"{SUPABASE_URL}/functions/v1/bridgepoint-building-archive-broker-v2710"
AUDIENCE="bridgepoint-building-v2710"
STATE="TX"; KIND="building"; TOKEN={"v":None,"exp":0}

def jwt_exp(t):
    try:
        p=t.split(".")[1]; p+="="*((4-len(p)%4)%4)
        return int(json.loads(base64.urlsafe_b64decode(p.encode())).get("exp",0))
    except Exception:return 0

def oidc():
    now=int(time.time())
    if TOKEN["v"] and TOKEN["exp"]>now+45:return TOKEN["v"]
    u=os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]; tok=os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]; sep="&" if "?" in u else "?"
    r=requests.get(f"{u}{sep}audience={AUDIENCE}",headers={"Authorization":f"bearer {tok}"},timeout=30); r.raise_for_status()
    v=r.json()["value"]; TOKEN["v"]=v; TOKEN["exp"]=jwt_exp(v); return v

def broker(action,extra=None,timeout=240):
    b={"action":action,"state_code":STATE,"asset_kind":KIND,"oidc_token":oidc()}; b.update(extra or {})
    r=requests.post(BROKER,json=b,headers={"content-type":"application/json"},timeout=timeout)
    if not r.ok: raise RuntimeError(f"{action} {r.status_code}: {r.text[:2500]}")
    d=r.json()
    if d.get("complete") is False: raise RuntimeError(f"{action} failed: {d}")
    return d

def q(v): return "'" + str(v).replace("'","''") + "'"

def main():
    miss=broker("missing_rowgroups")
    if int(miss.get("missing_count",0))!=0:
        raise RuntimeError(f"Texas gaps remain: {miss.get('missing_count')} rowgroups / {miss.get('missing_raw_rows')} raw rows")

    partsdoc=broker("parts")
    parts=[p for p in partsdoc.get("parts",[]) if p.get("status")=="VERIFIED"]
    if not parts: raise RuntimeError("no verified TX parts")

    bad=[]
    for p in parts:
        v=p.get("validation") or {}
        for key in ("null_geometry","empty_geometry","outside_geometry","duplicate_ids"):
            if int(v.get(key,0) or 0)!=0: bad.append([p.get("part_index"),key,v.get(key)])
    if bad: raise RuntimeError(f"bad verified parts: {bad[:20]}")

    signed=[]
    for p in sorted(parts,key=lambda x:int(x["part_index"])):
        signed.append(broker("download_part",{"part_index":int(p["part_index"])})["signed_url"])

    con=duckdb.connect(":memory:")
    con.execute("SET threads=4"); con.execute("SET memory_limit='7GB'"); con.execute("SET preserve_insertion_order=false")
    con.execute("INSTALL httpfs; LOAD httpfs")
    src="read_parquet(["+",".join(q(x) for x in signed)+"], union_by_name=true)"
    total,distinct_ids=con.execute(f"select count(*)::bigint,count(distinct id)::bigint from {src}").fetchone()
    con.close()
    total=int(total); distinct_ids=int(distinct_ids)
    if total!=distinct_ids: raise RuntimeError(f"global duplicate building ids={total-distinct_ids}")

    declared_rows=sum(int(p.get("row_count",0)) for p in parts)
    declared_bytes=sum(int(p.get("file_bytes",0)) for p in parts)
    if declared_rows!=total: raise RuntimeError(f"row sum mismatch declared={declared_rows} scanned={total}")

    zeros=broker("zero_coverage")
    zero_groups=list(zeros.get("rowgroups",[]))

    agg=hashlib.sha256()
    for p in sorted(parts,key=lambda x:int(x["part_index"])):
        agg.update(f"{int(p['part_index'])}:{int(p['row_count'])}:{int(p['file_bytes'])}:{p['sha256']}\n".encode())

    result=broker("complete_sharded",{
      "part_count":len(parts),"total_rows":total,"total_bytes":declared_bytes,"aggregate_sha256":agg.hexdigest(),
      "metadata":{
        "builder":"TX_DETERMINISTIC_GAP_FINALIZER_V2770","builder_version":2770,
        "source_release":"2026-08-19.0","source_key":"OVERTURE_BUILDINGS_20260819","source_license":"ODbL-1.0",
        "validation":{"missing_rowgroups":0,"zero_result_rowgroups":len(zero_groups),"global_rows":total,
        "global_distinct_ids":distinct_ids,"global_duplicate_ids":0,"bad_verified_parts":0,
        "truth_rule":"EVERY TEXAS-INTERSECTING SOURCE ROWGROUP IS EITHER REPRESENTED BY VERIFIED EXACT-CLIPPED PARQUET OR VERIFIED EXACT-CLIP ZERO COVERAGE"}
      }
    })
    print(json.dumps({"complete":True,"parts":len(parts),"rows":total,"zero_rowgroups":len(zero_groups),"result":result},separators=(",",":")))

if __name__=="__main__": main()
