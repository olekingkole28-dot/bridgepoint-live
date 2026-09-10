#!/usr/bin/env python3
import base64, hashlib, json, os, time
import duckdb, requests

SUPABASE_URL=os.environ["SUPABASE_URL"].rstrip("/")
BROKER=f"{SUPABASE_URL}/functions/v1/bridgepoint-building-archive-broker-v2710"
AUDIENCE="bridgepoint-building-v2710"
STATE="TX"; KIND="building"
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

def broker(action,extra=None,timeout=240):
    body={"action":action,"oidc_token":oidc(),"state_code":STATE,"asset_kind":KIND}
    body.update(extra or {})
    r=requests.post(BROKER,json=body,headers={"content-type":"application/json"},timeout=timeout)
    if not r.ok: raise RuntimeError(f"broker {action} {r.status_code}: {r.text[:2500]}")
    d=r.json()
    if d.get("complete") is False: raise RuntimeError(f"broker {action} failed: {d}")
    return d

def q(v): return "'" + str(v).replace("'","''") + "'"

def main():
    rgcat=broker("rowgroups")
    partsdoc=broker("parts")
    expected={}
    for g in rgcat.get("rowgroups",[]):
        expected.setdefault(str(g["item_id"]),set()).add(int(g["row_group_id"]))

    parts=[p for p in partsdoc.get("parts",[]) if p.get("status")=="VERIFIED"]
    if not parts: raise RuntimeError("no verified TX parts")

    coverage={k:{} for k in expected}
    for p in parts:
        meta=p.get("metadata") or {}
        item=str(meta.get("source_item_id") or "")
        if not item or item not in expected: continue
        a=meta.get("row_group_first"); b=meta.get("row_group_last")
        if a is None or b is None:
            for rg in expected[item]:
                coverage[item][rg]=coverage[item].get(rg,0)+1
        else:
            for rg in range(int(a),int(b)+1):
                if rg in expected[item]:
                    coverage[item][rg]=coverage[item].get(rg,0)+1

    missing=[]; duplicate_coverage=[]
    for item,rgs in expected.items():
        for rg in sorted(rgs):
            n=coverage[item].get(rg,0)
            if n==0: missing.append([item,rg])
            elif n>1: duplicate_coverage.append([item,rg,n])
    if missing: raise RuntimeError(f"TX row-group coverage incomplete count={len(missing)} sample={missing[:20]}")
    if duplicate_coverage: raise RuntimeError(f"TX row-group duplicate coverage count={len(duplicate_coverage)} sample={duplicate_coverage[:20]}")

    bad_parts=[]
    for p in parts:
        v=p.get("validation") or {}
        for key in ("null_geometry","empty_geometry","outside_geometry","duplicate_ids"):
            if int(v.get(key,0) or 0)!=0:
                bad_parts.append([p.get("part_index"),key,v.get(key)])
    if bad_parts: raise RuntimeError(f"TX part validation failure {bad_parts[:20]}")

    signed=[]
    for p in sorted(parts,key=lambda x:int(x["part_index"])):
        d=broker("download_part",{"part_index":int(p["part_index"])})
        signed.append(d["signed_url"])

    con=duckdb.connect(":memory:")
    con.execute("SET threads=4"); con.execute("SET memory_limit='7GB'"); con.execute("SET preserve_insertion_order=false")
    con.execute("INSTALL httpfs; LOAD httpfs")
    src="read_parquet(["+",".join(q(x) for x in signed)+"], union_by_name=true)"
    row=con.execute(f"select count(*)::bigint,count(distinct id)::bigint from {src}").fetchone()
    total_rows=int(row[0]); distinct_ids=int(row[1]); duplicate_ids=total_rows-distinct_ids
    con.close()
    if duplicate_ids!=0: raise RuntimeError(f"TX global duplicate ids={duplicate_ids}")

    declared_rows=sum(int(p.get("row_count",0)) for p in parts)
    declared_bytes=sum(int(p.get("file_bytes",0)) for p in parts)
    if declared_rows!=total_rows: raise RuntimeError(f"TX stored row sum {declared_rows} != scanned {total_rows}")

    agg=hashlib.sha256()
    for p in sorted(parts,key=lambda x:int(x["part_index"])):
        agg.update(f"{int(p['part_index'])}:{int(p['row_count'])}:{int(p['file_bytes'])}:{p['sha256']}\n".encode())

    result=broker("complete_sharded",{
      "part_count":len(parts),
      "total_rows":total_rows,
      "total_bytes":declared_bytes,
      "aggregate_sha256":agg.hexdigest(),
      "metadata":{
        "builder":"PUBLIC_GITHUB_DUCKDB_TX_PARALLEL_FINALIZER_V2765",
        "builder_version":2765,
        "source_release":"2026-08-19.0",
        "source_key":"OVERTURE_BUILDINGS_20260819",
        "source_license":"ODbL-1.0",
        "validation":{
          "tx_relevant_rowgroups":sum(len(x) for x in expected.values()),
          "missing_rowgroups":0,
          "duplicate_rowgroup_coverage":0,
          "bad_verified_parts":0,
          "global_rows":total_rows,
          "global_distinct_ids":distinct_ids,
          "global_duplicate_ids":duplicate_ids
        }
      }
    })
    print(json.dumps({"complete":True,"parts":len(parts),"rows":total_rows,"distinct_ids":distinct_ids,"result":result},separators=(",",":")))

if __name__=="__main__": main()
