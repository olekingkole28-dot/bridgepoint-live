#!/usr/bin/env python3
from __future__ import annotations
import argparse, base64, ctypes, ctypes.wintypes as wt, hashlib, json, os
from pathlib import Path
import shutil, socket, subprocess, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone

AGENT_VERSION=938
GATEWAY="https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-local-reasoning-v584"
OLLAMA="http://127.0.0.1:11434"
MIN_FREE_GB=600.0
PRIMARY="qwen2.5:3b"
REVIEWER="deepseek-r1:1.5b"
DATASETS=["PROPERTIES","SIGNALS","PATTERNS","SCORES","OPPORTUNITIES","MEDIA","SOURCES","EVIDENCE","STATE_SUMMARY","PACKAGE_MAP"]
STATES=["AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","AS","GU","MP","PR","VI"]
ARCHIVES=[
 ("buildings/v2710/{state}/building","archives/buildings/state_code={state}/building"),
 ("buildings/v2710/{state}/building_part","archives/buildings/state_code={state}/building_part"),
 ("transport/v2696/{state}/connector","archives/transport/state_code={state}/connector"),
 ("transport/v2696/{state}/segment","archives/transport/state_code={state}/segment")
]

def now(): return datetime.now(timezone.utc).isoformat()
def appdir(): return Path(os.environ.get("LOCALAPPDATA",str(Path.home()/".local"/"share")))/"BridgePoint"
def cfgfile(): return appdir()/"node.json"

class BLOB(ctypes.Structure):
    _fields_=[("cbData",wt.DWORD),("pbData",ctypes.POINTER(ctypes.c_byte))]
def blob(data):
    b=ctypes.create_string_buffer(data)
    return BLOB(len(data),ctypes.cast(b,ctypes.POINTER(ctypes.c_byte))),b
def protect(s):
    raw=s.encode()
    if os.name!="nt": return "plain:"+base64.b64encode(raw).decode()
    c,k=ctypes.windll.crypt32,ctypes.windll.kernel32; ib,_=blob(raw); ob=BLOB()
    if not c.CryptProtectData(ctypes.byref(ib),"BridgePoint",None,None,None,0,ctypes.byref(ob)): raise ctypes.WinError()
    try: return "dpapi:"+base64.b64encode(ctypes.string_at(ob.pbData,ob.cbData)).decode()
    finally: k.LocalFree(ob.pbData)
def unprotect(v):
    kind,b64=v.split(":",1); raw=base64.b64decode(b64)
    if kind=="plain": return raw.decode()
    c,k=ctypes.windll.crypt32,ctypes.windll.kernel32; ib,_=blob(raw); ob=BLOB()
    if not c.CryptUnprotectData(ctypes.byref(ib),None,None,None,None,0,ctypes.byref(ob)): raise ctypes.WinError()
    try: return ctypes.string_at(ob.pbData,ob.cbData).decode()
    finally: k.LocalFree(ob.pbData)

def load():
    c=json.loads(cfgfile().read_text(encoding="utf-8"))
    c["node_token"]=unprotect(c.pop("node_token_protected"))
    return c
def save(c):
    appdir().mkdir(parents=True,exist_ok=True); x=dict(c); x["node_token_protected"]=protect(x.pop("node_token"))
    t=cfgfile().with_suffix(".tmp"); t.write_text(json.dumps(x,indent=2),encoding="utf-8"); os.replace(t,cfgfile())

def post(url,payload,headers=None,timeout=90):
    req=urllib.request.Request(url,data=json.dumps(payload).encode(),headers={"content-type":"application/json",**(headers or {})},method="POST")
    with urllib.request.urlopen(req,timeout=timeout) as r: return json.loads(r.read().decode())
def api(c,action,**kw):
    return post(c["gateway"],{"action":action,"node_id":c.get("node_id"),**kw},{"x-bridgepoint-node-token":c["node_token"]})
def get(url,timeout=20):
    with urllib.request.urlopen(url,timeout=timeout) as r: return json.loads(r.read().decode())

def metrics(root):
    import psutil
    du=shutil.disk_usage(root); vm=psutil.virtual_memory()
    gpu=None
    try:
        p=subprocess.run(["nvidia-smi","--query-gpu=name,memory.total,memory.free,utilization.gpu","--format=csv,noheader,nounits"],capture_output=True,text=True,timeout=5)
        if p.returncode==0 and p.stdout.strip(): gpu=p.stdout.strip().splitlines()[0]
    except Exception: pass
    return {"computer":socket.gethostname(),"os":sys.platform,"cpu_count":os.cpu_count(),"cpu_percent":psutil.cpu_percent(.4),
            "memory_total_gb":round(vm.total/1024**3,2),"memory_available_gb":round(vm.available/1024**3,2),
            "free_disk_gb":round(du.free/1024**3,2),"total_disk_gb":round(du.total/1024**3,2),"gpu":gpu,"data_root":str(root)}
def storage_ok(root,m):
    od=os.environ.get("OneDrive","").lower(); p=str(root).lower()
    return m["free_disk_gb"]>=MIN_FREE_GB and "onedrive" not in p and not (od and p.startswith(od))
def disk_benchmark(root):
    f=root/".bp-bench"; chunk=b"0"*(8*1024*1024); total=64*1024*1024; t=time.perf_counter()
    try:
        with f.open("wb",buffering=0) as h:
            for _ in range(total//len(chunk)): h.write(chunk)
        return round((total/1024**2)/max(time.perf_counter()-t,.01),1)
    finally: f.unlink(missing_ok=True)
def limit_for(m,disk,latency):
    if m["cpu_percent"]>=90 or m["memory_available_gb"]<4 or latency>90: return 0
    if m["cpu_percent"]<50 and m["memory_available_gb"]>=16 and disk>=150 and latency<20: return 4
    if m["cpu_percent"]<70 and m["memory_available_gb"]>=8: return 2
    return 1

def ensure_models(c):
    try: names={x.get("name") for x in get(c["ollama"]+"/api/tags").get("models",[])}
    except Exception: names=set()
    for model in (c["primary_model"],c["reviewer_model"]):
        if model not in names: subprocess.run(["ollama","pull",model],check=True)
def ollama(c,model,prompt):
    r=post(c["ollama"]+"/api/generate",{"model":model,"prompt":prompt,"stream":False,"format":"json","options":{"temperature":.1,"num_ctx":8192}},timeout=600)
    try: return json.loads(r.get("response","{}"))
    except Exception: return {"summary":r.get("response","")[:12000],"unparsed":True}

def heartbeat(c,root,disk,lim):
    m=metrics(root)
    caps={"provider":"OLLAMA","agent_version":AGENT_VERSION,"outbound_only":True,"primary_model":c["primary_model"],"reviewer_model":c["reviewer_model"],
          "storage_verified":storage_ok(root,m),"adaptive_claim_limit":lim,"disk_benchmark_mbps":disk,
          "local_governor":"HEADROOM_V938","compact_runtime":"PARQUET_ZSTD_DUCKDB_V5604"}
    return api(c,"heartbeat",capabilities=caps,hardware=m)

def reason(c,lim):
    if lim<=0: return 0,0
    t=time.perf_counter(); tasks=(api(c,"claim",limit=lim).get("tasks") or [])
    for task in tasks:
        tid=task.get("task_id"); worker=task.get("worker") or {}
        prompt=json.dumps({"mission":worker.get("mission"),"guardrails":worker.get("guardrails"),"permissions":worker.get("permissions"),"task_type":task.get("task_type"),"input":task.get("input"),
                           "instruction":"Return strict JSON with summary, proposed_actions, evidence_needed, risks, confidence_0_to_1. Never claim external actions. Preserve legal provenance, security, truth, and no-regression constraints."})
        try:
            primary=ollama(c,c["primary_model"],prompt)
            review=ollama(c,c["reviewer_model"],json.dumps({"task":task.get("task_type"),"primary":primary,"instruction":"Audit strictly. Return JSON with approved, issues, required_changes, confidence_0_to_1. Reject fabrication, unsafe side effects, missing provenance, or regressions."}))
            api(c,"submit",task_id=tid,primary=primary,reviewer=review,models={"primary":c["primary_model"],"reviewer":c["reviewer_model"],"agent_version":AGENT_VERSION})
        except Exception as e:
            try: api(c,"fail",task_id=tid,error=f"{type(e).__name__}: {e}")
            except Exception: pass
    return len(tasks),time.perf_counter()-t

def download(item,dest):
    dest.parent.mkdir(parents=True,exist_ok=True); expected=int(item.get("size") or 0)
    if dest.exists() and expected and dest.stat().st_size==expected: return {"path":str(dest),"bytes":expected,"status":"EXISTS"}
    tmp=dest.with_suffix(dest.suffix+".part"); sha=hashlib.sha256(); size=0
    with urllib.request.urlopen(item["signed_url"],timeout=300) as r,tmp.open("wb") as f:
        while True:
            b=r.read(8*1024*1024)
            if not b: break
            f.write(b); sha.update(b); size+=len(b)
    if expected and size!=expected: tmp.unlink(missing_ok=True); raise RuntimeError("archive size mismatch")
    os.replace(tmp,dest); return {"path":str(dest),"bytes":size,"sha256":sha.hexdigest(),"status":"DOWNLOADED"}
def sync_archives(c,root,workers=2):
    status=api(c,"status")
    if not status.get("portable_export_authority"):
        return {"generated_at":now(),"agent_version":AGENT_VERSION,"count":0,"bytes":0,"files":[],"status":"SKIPPED","reason":"PORTABLE_EXPORT_AUTHORITY_NOT_SERVER_GRANTED"}
    records=[]
    for state in STATES:
        for remote_t,local_t in ARCHIVES:
            prefix=remote_t.format(state=state); off=0
            while True:
                page=api(c,"archive_list",prefix=prefix,offset=off,limit=100); files=[x for x in page.get("files",[]) if x.get("signed_url")]
                with ThreadPoolExecutor(max_workers=max(1,workers)) as pool:
                    fut=[pool.submit(download,x,root/local_t.format(state=state)/Path(x["path"]).name) for x in files]
                    for f in as_completed(fut): records.append(f.result())
                if not page.get("has_more"): break
                off+=100
    md=root/"manifests"; md.mkdir(parents=True,exist_ok=True)
    out={"generated_at":now(),"agent_version":AGENT_VERSION,"count":len(records),"bytes":sum(x["bytes"] for x in records),"files":records}
    (md/"archive-copy-manifest.json").write_text(json.dumps(out,indent=2),encoding="utf-8"); return out

def export_job(c,root,job):
    import pyarrow as pa, pyarrow.parquet as pq
    rid,state=job["request_id"],job["scope_key"]; sr=root/"snapshots"/f"state_code={state}"; sr.mkdir(parents=True,exist_ok=True)
    resume_file=sr/f"{rid}.resume.json"; resume=json.loads(resume_file.read_text()) if resume_file.exists() else {"datasets":{},"started_at":now()}; totals={}
    try:
        for ds in DATASETS:
            d=sr/ds.lower(); d.mkdir(parents=True,exist_ok=True); s=resume["datasets"].setdefault(ds,{"cursor":None,"done":False,"part":0,"rows":0}); buf=[]
            while not s["done"]:
                p=api(c,"export_page",request_id=rid,dataset=ds,cursor=s["cursor"],limit=1000); rows=p.get("rows") or []
                buf.extend(rows); s["cursor"]=p.get("next_cursor"); s["done"]=bool(p.get("done")); s["rows"]+=len(rows)
                if len(buf)>=100000 or s["done"]:
                    if buf:
                        pq.write_table(pa.Table.from_pylist(buf),d/f"part-{s['part']:05d}.parquet",compression="zstd",row_group_size=250000,use_dictionary=True); s["part"]+=1; buf=[]
                    resume_file.write_text(json.dumps(resume,indent=2),encoding="utf-8")
                if not rows and not s["done"]: raise RuntimeError("empty non-final export page")
            totals[ds]=s["rows"]
        result={"completed_at":now(),"state_code":state,"datasets":totals,"format":"PARQUET_ZSTD","agent_version":AGENT_VERSION}
        api(c,"export_complete",request_id=rid,result=result); (sr/"COMPLETE.json").write_text(json.dumps(result,indent=2),encoding="utf-8"); return result
    except Exception as e:
        api(c,"export_fail",request_id=rid,error=f"{type(e).__name__}: {e}",result={"state_code":state,"failed_at":now(),"resume":resume}); raise
def export_once(c,root):
    if not storage_ok(root,metrics(root)): return None
    job=api(c,"export_claim").get("job")
    return export_job(c,root,job) if job else None

def catalog(root):
    import duckdb
    d=root/"catalog"; d.mkdir(parents=True,exist_ok=True); db=duckdb.connect(str(d/"bridgepoint.duckdb"))
    try:
        patterns={"properties":"snapshots/state_code=*/properties/*.parquet","signals":"snapshots/state_code=*/signals/*.parquet","patterns":"snapshots/state_code=*/patterns/*.parquet",
                  "scores":"snapshots/state_code=*/scores/*.parquet","opportunities":"snapshots/state_code=*/opportunities/*.parquet","media":"snapshots/state_code=*/media/*.parquet",
                  "buildings":"archives/buildings/state_code=*/building/*.parquet","building_parts":"archives/buildings/state_code=*/building_part/*.parquet",
                  "transport_segments":"archives/transport/state_code=*/segment/*.parquet","transport_connectors":"archives/transport/state_code=*/connector/*.parquet"}
        for name,rel in patterns.items():
            if list(root.glob(rel)):
                g=str(root/rel).replace("\\","/").replace("'","''")
                db.execute(f"create or replace view {name} as select * from read_parquet('{g}',union_by_name=true,hive_partitioning=true)")
    finally: db.close()

def configure(a):
    code=a.enrollment_code
    if not code: raise RuntimeError("Enrollment code required")
    root=Path(a.data_root).resolve(); root.mkdir(parents=True,exist_ok=True); m=metrics(root)
    if not storage_ok(root,m): raise RuntimeError(f"Need at least {MIN_FREE_GB:.0f} GB free on non-OneDrive hot storage")
    r=post(a.gateway,{"action":"enroll","enrollment_code":code,"node_name":a.node_name or f"BridgePoint Owner PC - {socket.gethostname()}",
                      "capabilities":{"provider":"OLLAMA","agent_version":AGENT_VERSION,"outbound_only":True,"primary_model":a.primary_model,"reviewer_model":a.reviewer_model,"storage_verified":True},"hardware":m})
    if not r.get("ok"): raise RuntimeError(r)
    save({"gateway":a.gateway,"ollama":a.ollama,"node_id":r["node_id"],"node_token":r["node_token"],"primary_model":r.get("primary_model",a.primary_model),"reviewer_model":r.get("reviewer_model",a.reviewer_model),"data_root":str(root),"agent_version":AGENT_VERSION,"enrolled_at":now()})
    print(json.dumps({"ok":True,"node_id":r["node_id"],"data_root":str(root)},indent=2))

def run():
    c=load(); root=Path(c["data_root"]); root.mkdir(parents=True,exist_ok=True); disk=disk_benchmark(root); ensure_models(c)
    hb=cat=arc=models=lat=0.0; failures=0
    while True:
        try:
            m=metrics(root); lim=limit_for(m,disk,lat); t=time.monotonic()
            if t-hb>=45: heartbeat(c,root,disk,lim); hb=t
            if t-models>=3600: ensure_models(c); models=t
            n,elapsed=reason(c,lim); lat=(elapsed/max(n,1)) if n else lat
            if lim>0 and storage_ok(root,m): export_once(c,root)
            if t-arc>=21600 and storage_ok(root,m): sync_archives(c,root,max(1,min(3,lim or 1))); arc=t
            if t-cat>=900: catalog(root); cat=t
            failures=0; time.sleep(5 if n else 15)
        except KeyboardInterrupt: raise
        except Exception as e:
            failures+=1; p=appdir()/"logs"; p.mkdir(parents=True,exist_ok=True)
            with (p/"agent.log").open("a",encoding="utf-8") as f: f.write(f"{now()} {type(e).__name__}: {e}\n")
            time.sleep(min(300,5*(2**min(failures,6))))

def main():
    p=argparse.ArgumentParser(); s=p.add_subparsers(dest="cmd",required=True); c=s.add_parser("configure")
    c.add_argument("--enrollment-code",default=os.environ.get("BRIDGEPOINT_ENROLLMENT_CODE")); c.add_argument("--node-name"); c.add_argument("--gateway",default=GATEWAY); c.add_argument("--ollama",default=OLLAMA)
    c.add_argument("--primary-model",default=PRIMARY); c.add_argument("--reviewer-model",default=REVIEWER); c.add_argument("--data-root",default=os.environ.get("BRIDGEPOINT_DATA_ROOT",r"C:\BridgePointData"))
    for name in ("run","status","sync-archives","export-once"): s.add_parser(name)
    a=p.parse_args()
    if a.cmd=="configure": configure(a); return
    c=load(); root=Path(c["data_root"])
    if a.cmd=="run": run()
    elif a.cmd=="status": print(json.dumps(api(c,"status"),indent=2))
    elif a.cmd=="sync-archives": print(json.dumps(sync_archives(c,root),indent=2)); catalog(root)
    elif a.cmd=="export-once": print(json.dumps(export_once(c,root),indent=2)); catalog(root)
if __name__=="__main__": main()
