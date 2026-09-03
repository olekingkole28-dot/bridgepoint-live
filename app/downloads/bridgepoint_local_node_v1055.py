#!/usr/bin/env python3
"""BridgePoint Local Node v1055.

Runs local Ollama reasoning and owner portable-export jobs through the protected
BridgePoint node gateway. No Supabase service-role key is stored on this PC.
"""
from __future__ import annotations
import argparse, gzip, json, os, platform, subprocess, sys, time, urllib.request, urllib.error
from pathlib import Path
from datetime import datetime, timezone

VERSION=1055
ENDPOINT="https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-local-reasoning-v584"
OLLAMA="http://127.0.0.1:11434/api/generate"
PRIMARY="qwen2.5:3b"
REVIEWER="deepseek-r1:1.5b"
DATASETS=["STATE_SUMMARY","PROPERTIES","SIGNALS","PATTERNS","SCORES","OPPORTUNITIES","EVIDENCE","MEDIA","SOURCES","PACKAGE_MAP"]
BASE=Path(os.environ.get("LOCALAPPDATA") or Path.home()/"AppData"/"Local")/"BridgePoint"
CONFIG=BASE/"node.json"
LOG=BASE/"bridgepoint-node.log"
EXPORTS=BASE/"exports"
BASE.mkdir(parents=True,exist_ok=True); EXPORTS.mkdir(parents=True,exist_ok=True)

def now(): return datetime.now(timezone.utc).isoformat()
def log(msg):
    line=f"[{now()}] {msg}"
    print(line,flush=True)
    try:
        with LOG.open("a",encoding="utf-8") as f:f.write(line+"\n")
    except Exception: pass

def read_config():
    if not CONFIG.exists(): return None
    try:return json.loads(CONFIG.read_text(encoding="utf-8"))
    except Exception:return None

def save_config(c):
    CONFIG.write_text(json.dumps(c,indent=2),encoding="utf-8")

def post(body, cfg=None, timeout=60):
    data=json.dumps(body).encode()
    headers={"Content-Type":"application/json","User-Agent":f"BridgePointLocalNode/{VERSION}"}
    if cfg and cfg.get("node_token"): headers["x-bridgepoint-node-token"]=cfg["node_token"]
    req=urllib.request.Request(ENDPOINT,data=data,headers=headers,method="POST")
    try:
        with urllib.request.urlopen(req,timeout=timeout) as r:return json.loads(r.read().decode())
    except urllib.error.HTTPError as e:
        detail=e.read().decode(errors="replace")
        raise RuntimeError(f"BridgePoint gateway HTTP {e.code}: {detail[:800]}")

def capabilities():
    return {"provider":"OLLAMA","agent_version":VERSION,"outbound_only":True,"primary_model":PRIMARY,"reviewer_model":REVIEWER,"execution_authority":False,"portable_export_authority":True,"backup_authority":False,"export_format":"JSONL_GZIP_DUCKDB"}

def hardware():
    return {"hostname":platform.node(),"os":platform.platform(),"python":sys.version.split()[0],"machine":platform.machine()}

def enroll(code, name=None):
    name=name or f"BridgePoint Owner PC - {platform.node()}"
    r=post({"action":"enroll","enrollment_code":code.strip(),"node_name":name,"capabilities":capabilities(),"hardware":hardware()},timeout=30)
    if not r.get("ok"):raise RuntimeError(str(r))
    cfg={"version":VERSION,"node_id":r["node_id"],"node_token":r["node_token"],"node_name":name,"primary_model":r.get("primary_model",PRIMARY),"reviewer_model":r.get("reviewer_model",REVIEWER),"enrolled_at":now()}
    save_config(cfg);log(f"Enrolled {name} as {cfg['node_id']}");return cfg

def ollama(prompt, model, timeout=420):
    body=json.dumps({"model":model,"prompt":prompt,"stream":False,"options":{"temperature":0.15}}).encode()
    req=urllib.request.Request(OLLAMA,data=body,headers={"Content-Type":"application/json"},method="POST")
    with urllib.request.urlopen(req,timeout=timeout) as r:
        d=json.loads(r.read().decode());return str(d.get("response") or "").strip()

def task_prompt(task):
    worker=task.get("worker") or {}; inp=task.get("input") or {}
    return f"""You are a local BridgePoint reasoning worker.\nMission: {worker.get('mission','Support BridgePoint.')}
Guardrails: {json.dumps(worker.get('guardrails') or {},ensure_ascii=False)}
Task type: {task.get('task_type')}
Task input: {json.dumps(inp,ensure_ascii=False,default=str)}
Return a concise, factual result as JSON-compatible reasoning text. Do not claim external actions occurred unless the task input contains evidence that they did. Do not expose secrets."""

def process_ai(cfg):
    r=post({"action":"claim","node_id":cfg["node_id"],"limit":2,"capabilities":capabilities()},cfg,60)
    tasks=r.get("tasks") or []
    for task in tasks:
        tid=task.get("task_id")
        try:
            primary=ollama(task_prompt(task),cfg.get("primary_model") or PRIMARY)
            review_prompt=f"Review the following BridgePoint worker result for factual caution, safety and unsupported claims. Return a short review and whether it is acceptable.\n\nRESULT:\n{primary}"
            reviewer=ollama(review_prompt,cfg.get("reviewer_model") or REVIEWER)
            post({"action":"submit","node_id":cfg["node_id"],"task_id":tid,"primary":{"text":primary},"reviewer":{"text":reviewer},"models":{"primary":cfg.get('primary_model') or PRIMARY,"reviewer":cfg.get('reviewer_model') or REVIEWER,"agent_version":VERSION}},cfg,60)
            log(f"Completed local AI task {tid}")
        except Exception as e:
            log(f"AI task {tid} failed: {e}")
            try:post({"action":"fail","node_id":cfg["node_id"],"task_id":tid,"error":str(e)[:1600]},cfg,30)
            except Exception:pass

def build_duckdb(folder, files):
    try:import duckdb
    except Exception as e:return {"created":False,"reason":f"duckdb unavailable: {e}"}
    dbpath=folder/"bridgepoint.duckdb"; con=duckdb.connect(str(dbpath))
    try:
        for ds,path in files.items():
            table=ds.lower()
            p=str(path).replace("'","''")
            con.execute(f"create or replace table {table} as select * from read_json_auto('{p}', format='newline_delimited', compression='gzip', maximum_object_size=67108864)")
        con.execute("create or replace view bridgepoint_bundle_tables as select table_name from information_schema.tables where table_schema='main' order by table_name")
    finally:con.close()
    return {"created":True,"path":str(dbpath)}

def process_export(cfg):
    claim=post({"action":"export_claim","node_id":cfg["node_id"]},cfg,30); job=claim.get("job")
    if not job:return False
    rid=job["request_id"]; state=job["scope_key"]
    folder=EXPORTS/state/rid;folder.mkdir(parents=True,exist_ok=True)
    files={};counts={};manifest={"bridgepoint_export_version":VERSION,"request_id":rid,"state_code":state,"started_at":now(),"datasets":{},"format":"gzip newline-delimited JSON + DuckDB"}
    try:
        for ds in DATASETS:
            path=folder/f"{ds.lower()}.jsonl.gz";cursor=None;count=0
            with gzip.open(path,"wt",encoding="utf-8") as out:
                while True:
                    page=post({"action":"export_page","node_id":cfg["node_id"],"request_id":rid,"dataset":ds,"cursor":cursor,"limit":500},cfg,120)
                    rows=page.get("rows") or []
                    for row in rows:out.write(json.dumps(row,ensure_ascii=False,default=str,separators=(",",":"))+"\n")
                    count+=len(rows);cursor=page.get("next_cursor")
                    if page.get("done") or not cursor:break
            files[ds]=path;counts[ds]=count;manifest["datasets"][ds]={"rows":count,"file":path.name};log(f"Export {state} {ds}: {count:,} rows")
        duck=build_duckdb(folder,files);manifest["duckdb"]=duck;manifest["completed_at"]=now();(folder/"manifest.json").write_text(json.dumps(manifest,indent=2),encoding="utf-8")
        result={"agent_version":VERSION,"state_code":state,"local_path":str(folder),"datasets":counts,"duckdb":duck,"manifest":str(folder/"manifest.json")}
        post({"action":"export_complete","node_id":cfg["node_id"],"request_id":rid,"result":result},cfg,60);log(f"Portable export {state} completed at {folder}");return True
    except Exception as e:
        log(f"Portable export {state} failed: {e}")
        try:post({"action":"export_fail","node_id":cfg["node_id"],"request_id":rid,"error":str(e)[:1600],"result":{"agent_version":VERSION,"state_code":state,"local_path":str(folder)}},cfg,30)
        except Exception:pass
        return True

def heartbeat(cfg):
    return post({"action":"heartbeat","node_id":cfg["node_id"],"capabilities":capabilities(),"hardware":hardware()},cfg,30)

def once(cfg):
    heartbeat(cfg);process_ai(cfg);process_export(cfg)

def run(cfg):
    log(f"BridgePoint Local Node v{VERSION} starting. Data: {BASE}")
    failures=0
    while True:
        try:once(cfg);failures=0;time.sleep(25)
        except KeyboardInterrupt:break
        except Exception as e:
            failures+=1;log(f"Loop error: {e}");time.sleep(min(180,15*(2**min(failures,3))))

def main():
    ap=argparse.ArgumentParser();ap.add_argument("--enroll");ap.add_argument("--node-name");ap.add_argument("--once",action="store_true");ap.add_argument("--status",action="store_true");ap.add_argument("--run",action="store_true");args=ap.parse_args()
    cfg=read_config()
    if args.enroll:cfg=enroll(args.enroll,args.node_name)
    if not cfg:
        print(f"No BridgePoint node configuration at {CONFIG}. Generate an enrollment code from Owner > Everything > Exports & Local Node, then run this installer again.");return 2
    if args.status:
        print(json.dumps(post({"action":"status","node_id":cfg["node_id"]},cfg,30),indent=2));return 0
    if args.once:once(cfg);return 0
    run(cfg);return 0
if __name__=="__main__":raise SystemExit(main())
