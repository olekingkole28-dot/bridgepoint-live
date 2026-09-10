#!/usr/bin/env python3
import argparse, base64, hashlib, json, os, time, requests

SUPABASE_URL=os.environ["SUPABASE_URL"].rstrip("/")
BROKER=f"{SUPABASE_URL}/functions/v1/bridgepoint-building-crosswalk-broker-v2752"
AUDIENCE="bridgepoint-building-crosswalk-v2752"
TOKEN={"v":None,"exp":0}

def exp(t):
    try:
        p=t.split(".")[1];p+="="*((4-len(p)%4)%4)
        return int(json.loads(base64.urlsafe_b64decode(p.encode())).get("exp",0))
    except Exception:return 0

def oidc():
    n=int(time.time())
    if TOKEN["v"] and TOKEN["exp"]>n+45:return TOKEN["v"]
    u=os.environ["ACTIONS_ID_TOKEN_REQUEST_URL"]; k=os.environ["ACTIONS_ID_TOKEN_REQUEST_TOKEN"]; sep="&" if "?" in u else "?"
    r=requests.get(f"{u}{sep}audience={AUDIENCE}",headers={"Authorization":f"bearer {k}"},timeout=30);r.raise_for_status()
    v=r.json()["value"];TOKEN["v"]=v;TOKEN["exp"]=exp(v);return v

def broker(action,state,extra=None,timeout=240):
    b={"action":action,"state_code":state,"oidc_token":oidc()};b.update(extra or {})
    r=requests.post(BROKER,json=b,headers={"content-type":"application/json"},timeout=timeout)
    if not r.ok:raise RuntimeError(f"{action} {state} {r.status_code}: {r.text[:2000]}")
    d=r.json()
    if d.get("complete") is False:raise RuntimeError(str(d))
    return d

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--mode",required=True,choices=["prepare","finalize"])
    ap.add_argument("--state",choices=["LA","NY","PA"])
    ap.add_argument("--lanes",type=int)
    a=ap.parse_args()
    if a.mode=="prepare":
        out={}
        for s in ("LA","NY","PA"):
            out[s]=broker("prepare_parallel",s)
        print(json.dumps({"complete":True,"version":2772,"prepared":out},separators=(",",":")))
        return
    if not a.state or not a.lanes:raise RuntimeError("state and lanes required")
    parts_doc=broker("parts",a.state)
    parts=sorted(parts_doc.get("parts",[]),key=lambda p:int(p["part_index"]))
    if len(parts)!=a.lanes:raise RuntimeError(f"part count {len(parts)} != lanes {a.lanes}")
    if [int(p["part_index"]) for p in parts]!=list(range(a.lanes)):raise RuntimeError("part indexes not contiguous")
    agg=hashlib.sha256()
    for p in parts:
        if p.get("status")!="VERIFIED":raise RuntimeError("unverified part")
        if str((p.get("metadata") or {}).get("imported_to_analytics","false")).lower()!="true":
            raise RuntimeError(f"part {p['part_index']} not imported")
        agg.update(f"{int(p['part_index'])}:{int(p['row_count'])}:{int(p['file_bytes'])}:{p['sha256']}\n".encode())
    runs=broker("source_runs",a.state)
    source_files=len(set(str(x["item_id"]) for x in runs.get("runs",[])))
    result=broker("complete_parallel",a.state,{
        "lane_count":a.lanes,
        "source_files":source_files,
        "aggregate_sha256":agg.hexdigest(),
        "metadata":{
            "builder":"CURRENT_BUILDING_CROSSWALK_FIXED_LANE_V2772",
            "parallel_version":2772,
            "lane_count":a.lanes,
            "targeted_raw_rows":runs.get("raw_rows")
        }
    },timeout=300)
    print(json.dumps(result,separators=(",",":")))

if __name__=="__main__":
    main()
