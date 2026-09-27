#!/usr/bin/env python3
from __future__ import annotations
import gzip, json, os, shutil, subprocess, sys, threading, time, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

AGENT_VERSION=942
AGENT_DIR=Path(r"C:\BridgePointRuntime\agent")
if str(AGENT_DIR) not in sys.path: sys.path.insert(0,str(AGENT_DIR))
import bridgepoint_agent as bp

GiB=1024**3
HOT_WRITE_FLOOR_GB=220.0
CLOUD_STATE_START_FLOOR_GB=300.0
STORAGE_WORKERS=2

def now(): return bp.now()
def log(msg):
    p=AGENT_DIR/"onedrive-complete-rescue-v942.log"; p.parent.mkdir(parents=True,exist_ok=True)
    with p.open("a",encoding="utf-8") as f:f.write(f"{now()} {msg}\n")
def atomic_json(path,obj):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True);tmp=path.with_suffix(path.suffix+".tmp")
    tmp.write_text(json.dumps(obj,indent=2,sort_keys=True),encoding="utf-8");os.replace(tmp,path)
def detect_onedrive():
    c=[]
    for k in ("OneDriveCommercial","OneDriveConsumer","OneDrive"):
        if os.environ.get(k):c.append(Path(os.environ[k]))
    c.extend(sorted(Path.home().glob("OneDrive*")));seen=set()
    for p in c:
        try:q=p.resolve()
        except:q=p
        if str(q).lower() in seen:continue
        seen.add(str(q).lower())
        if p.exists() and p.is_dir():return p
    raise RuntimeError("No signed-in OneDrive folder detected.")
def unpin(p):
    if os.name!="nt":return
    try:subprocess.run(["cmd","/c","attrib","+u","-p",str(p)],capture_output=True,text=True,timeout=30)
    except Exception as e:log(f"unpin {p}: {e}")
def unpin_tree(p):
    if os.name!="nt":return
    try:subprocess.run(["cmd","/c","attrib","+u","-p",str(Path(p)/"*"),"/s","/d"],capture_output=True,text=True,timeout=300)
    except Exception as e:log(f"unpin-tree {p}: {e}")
def hot_free_gb(hot):return shutil.disk_usage(hot).free/GiB
def wait_headroom(hot,floor=HOT_WRITE_FLOOR_GB,stop=None):
    while hot_free_gb(hot)<floor:
        if stop and stop.is_set():return False
        time.sleep(20)
    return True
def copy_file(src,dst):
    src,dst=Path(src),Path(dst);dst.parent.mkdir(parents=True,exist_ok=True);n=src.stat().st_size
    if dst.exists() and dst.stat().st_size==n:return False
    tmp=dst.with_suffix(dst.suffix+".bp-part");tmp.unlink(missing_ok=True);shutil.copy2(src,tmp)
    if tmp.stat().st_size!=n:tmp.unlink(missing_ok=True);raise RuntimeError(f"copy mismatch {src}")
    os.replace(tmp,dst);unpin(dst);return True
def write_restore(cold):
    txt="""BRIDGEPOINT COMPLETE SUPABASE EXIT RESCUE - V942

This is a cold rescue set, not the live database. C:\\BridgePointData remains the hot runtime/export root.

RESTORE SOURCES
1. OneDrive/BridgePointRescue/snapshots: state Parquet bundles.
2. database-rows: compressed JSONL row preservation for non-state tables.
3. storage + archives: Supabase Storage object bytes.
4. control-plane/schema: roles, schema, columns, constraints, indexes, views, functions, RLS, triggers, extensions, enums, publications, sequence state, DB settings, FDW inventory, cron.
5. control-plane/tables: early small-table copies of auth/config/security/storage metadata.
6. source: source-repository references and available bundles.
7. manifests: progress/audit/checklists.

PRIORITY
P10 = all non-staging tables except the three giant tables handled by V939 state export.
P20 = additional staging tables except the giant geographic raw staging table.
P30 = geographic_source_records_v90 only; copy last and only while capacity/headroom remains.
Indexes are not copied as bytes; their definitions are preserved and they are rebuilt locally.

AUTH
auth.users/identities are preserved. Hosted JWT sessions do not survive new local signing keys; users reauthenticate.
Current identities are email based. Local JWT/API keys are generated fresh.

SECRETS
Do not paste secret values into chat. Raw hosted JWT/service-role secrets are not needed for the local replacement.
Vault/external-provider secret NAMES are preserved in the checklist. Re-enter values locally from the originating provider or rotate them.
Foreign-server options are intentionally redacted in schema metadata and should be recreated locally.

CUTOVER
After Supabase is unavailable, merge any OneDrive state folders not already under C:\\BridgePointData, build the local DuckDB/Postgres/Supabase-compatible services, restore operational tables/schema, re-enter local/provider secrets, repoint the website/app, and run restore verification before deleting any rescue copy.
"""
    p=cold/"RESTORE-BRIDGEPOINT-FIRST.txt";p.write_text(txt,encoding="utf-8");unpin(p)
def download_public_source(cold):
    dst=cold/"source"/"bridgepoint-live-live-artifact.zip";dst.parent.mkdir(parents=True,exist_ok=True)
    if not dst.exists():
        tmp=dst.with_suffix(".zip.part")
        with urllib.request.urlopen("https://codeload.github.com/olekingkole28-dot/bridgepoint-live/zip/refs/heads/live-artifact",timeout=300) as r,tmp.open("wb") as f:shutil.copyfileobj(r,f,8*1024*1024)
        os.replace(tmp,dst);unpin(dst)
    atomic_json(cold/"source"/"SOURCE-REPOSITORIES.json",{
      "captured_at":now(),
      "repositories":[
        {"name":"olekingkole28-dot/bridgepoint-live","visibility":"public","branch":"live-artifact"},
        {"name":"olekingkole28-dot/bridgepoint_data_studio","visibility":"private","emergency_branch":"supabase-emergency-snapshot-20260922",
         "note":"Private GitHub repository is outside Supabase. Emergency branch contains deployed Edge Function snapshots."}
      ]})
    unpin(cold/"source"/"SOURCE-REPOSITORIES.json")
def private_repo_bundle_if_possible(cold):
    git=shutil.which("git")
    if not git:return {"status":"SKIPPED","reason":"git not installed"}
    tmp=Path(r"C:\BridgePointRuntime\private-repo-rescue.git");env=dict(os.environ);env["GIT_TERMINAL_PROMPT"]="0"
    try:
        if not tmp.exists():
            p=subprocess.run([git,"clone","--mirror","https://github.com/olekingkole28-dot/bridgepoint_data_studio.git",str(tmp)],env=env,capture_output=True,text=True,timeout=900)
            if p.returncode:return {"status":"SKIPPED","reason":"private GitHub credentials unavailable on PC"}
        else:
            subprocess.run([git,"-C",str(tmp),"fetch","--all","--prune"],env=env,capture_output=True,text=True,timeout=900)
        dst=cold/"source"/"bridgepoint_data_studio.bundle";dst.parent.mkdir(parents=True,exist_ok=True);part=dst.with_suffix(".bundle.part");part.unlink(missing_ok=True)
        p=subprocess.run([git,"-C",str(tmp),"bundle","create",str(part),"--all"],env=env,capture_output=True,text=True,timeout=1800)
        if p.returncode:raise RuntimeError(p.stderr[-1000:])
        os.replace(part,dst);unpin(dst);return {"status":"OK","bytes":dst.stat().st_size}
    except Exception as e:return {"status":"ERROR","reason":f"{type(e).__name__}: {e}"}
def copy_runtime(cold):
    dst=cold/"runtime";changed=0
    for src in (AGENT_DIR/"bridgepoint_agent.py",AGENT_DIR/"bridgepoint_onedrive_complete_rescue_v942.py",Path(r"C:\BridgePointRuntime\release.json")):
        if src.exists() and src.is_file():
            if copy_file(src,dst/src.name):changed+=1
    return changed
def mirror_completed_states(hot,cold):
    root=hot/"snapshots";out=[]
    if not root.exists():return out
    for sd in sorted(root.glob("state_code=*")):
        if not (sd/"COMPLETE.json").exists() or not (sd/"MANIFEST.json").exists():continue
        dst=cold/"snapshots"/sd.name;changed=0
        for src in sd.rglob("*"):
            if src.is_file() and not src.name.endswith(".part") and not src.name.endswith(".bp-part"):
                if copy_file(src,dst/src.relative_to(sd)):changed+=1
        unpin_tree(dst);out.append({"state":sd.name.split("=",1)[-1],"files_changed":changed})
    return out
def export_schema(c,cold):
    root=cold/"control-plane"/"schema";root.mkdir(parents=True,exist_ok=True);mf=root/"progress.json";st={"offset":0,"done":False}
    if mf.exists():
        try:st.update(json.loads(mf.read_text(encoding="utf-8")))
        except:pass
    while not st["done"]:
        off=int(st["offset"]);page=bp.api(c,"bootstrap_schema_page",offset=off,limit=250);rows=page.get("rows") or []
        part=root/f"part-{off:08d}.jsonl.gz"
        if not part.exists():
            tmp=part.with_suffix(".gz.part")
            with gzip.open(tmp,"wt",encoding="utf-8",compresslevel=1) as g:
                for row in rows:g.write(json.dumps(row,separators=(",",":"),ensure_ascii=False)+"\n")
            os.replace(tmp,part);unpin(part)
        st={"offset":off+len(rows),"done":bool(page.get("done")),"updated_at":now()};atomic_json(mf,st);unpin(mf)
        if not rows and not st["done"]:raise RuntimeError("schema empty non-final")
    return st
def export_early_control(c,cold):
    cat=bp.api(c,"bootstrap_catalog");base=cold/"control-plane"/"tables";done=0
    for item in cat.get("tables") or []:
        schema,table=str(item["schema"]),str(item["table"]);td=base/schema/table;td.mkdir(parents=True,exist_ok=True);mf=td/"manifest.json";st={"offset":0,"done":False}
        if mf.exists():
            try:st.update(json.loads(mf.read_text(encoding="utf-8")))
            except:pass
        while not st["done"]:
            off=int(st["offset"])
            try:page=bp.api(c,"bootstrap_table_page",schema=schema,table=table,offset=off,limit=250)
            except:page=bp.api(c,"bootstrap_table_page",schema=schema,table=table,offset=off,limit=25)
            rows=page.get("rows") or [];part=td/f"part-{off:012d}.jsonl.gz"
            if not part.exists():
                tmp=part.with_suffix(".gz.part")
                with gzip.open(tmp,"wt",encoding="utf-8",compresslevel=1) as g:
                    for row in rows:g.write(json.dumps(row,separators=(",",":"),ensure_ascii=False)+"\n")
                os.replace(tmp,part);unpin(part)
            st={"offset":off+len(rows),"done":bool(page.get("done")),"updated_at":now()};atomic_json(mf,st);unpin(mf)
            if not rows and not st["done"]:raise RuntimeError(f"{schema}.{table} empty non-final")
        done+=1;unpin_tree(td)
    return {"tables_total":len(cat.get("tables") or []),"tables_completed":done}
def generic_table(c,hot,cold,item):
    schema,table=str(item["schema"]),str(item["table"]);prio=int(item["priority"]);td=cold/"database-rows"/f"P{prio:02d}"/schema/table;td.mkdir(parents=True,exist_ok=True)
    mf=td/"manifest.json";st={"cursor":None,"done":False,"parts":0,"rows":0}
    if mf.exists():
        try:st.update(json.loads(mf.read_text(encoding="utf-8")))
        except:pass
    while not st.get("done"):
        if not wait_headroom(hot,HOT_WRITE_FLOOR_GB):return
        limit=100
        last=None
        for lim in (100,25,5,1):
            try:last=bp.api(c,"bootstrap_table_page_v942",schema=schema,table=table,cursor=st.get("cursor"),limit=lim);break
            except Exception as e:
                if lim==1:raise
        rows=last.get("rows") or [];partno=int(st.get("parts") or 0);part=td/f"part-{partno:08d}.jsonl.gz";tmp=part.with_suffix(".gz.part")
        with gzip.open(tmp,"wt",encoding="utf-8",compresslevel=1) as g:
            for row in rows:g.write(json.dumps(row,separators=(",",":"),ensure_ascii=False)+"\n")
        os.replace(tmp,part);unpin(part)
        st.update({"cursor":last.get("next_cursor"),"done":bool(last.get("done")),"parts":partno+1,"rows":int(st.get("rows") or 0)+len(rows),"updated_at":now(),
                   "source_data_bytes":item.get("data_bytes"),"source_approx_rows":item.get("approx_rows"),"priority":prio})
        atomic_json(mf,st);unpin(mf)
        if not rows and not st["done"]:raise RuntimeError(f"{schema}.{table} empty non-final")
    unpin_tree(td)
def generic_worker(c,hot,cold,large,stop):
    while not stop.is_set():
        try:
            plan=bp.api(c,"bootstrap_plan_v942").get("tables") or []
            p10=[x for x in plan if x.get("export_mode")=="GENERIC_JSONL_GZIP" and int(x.get("priority") or 99)==10 and ((int(x.get("data_bytes") or 0)>250*1024*1024)==large)]
            p10.sort(key=lambda x:int(x.get("data_bytes") or 0),reverse=large)
            for item in p10:
                if stop.is_set():return
                generic_table(c,hot,cold,item)
            return
        except Exception as e:log(f"generic-{'large' if large else 'small'} {type(e).__name__}: {e}");stop.wait(10)
def staging_worker(c,hot,cold,stop):
    # Never start staging until all P10 generic manifests are complete.
    while not stop.is_set():
        try:
            plan=bp.api(c,"bootstrap_plan_v942").get("tables") or []
            p10=[x for x in plan if x.get("export_mode")=="GENERIC_JSONL_GZIP" and int(x.get("priority") or 99)==10]
            incomplete=[]
            for x in p10:
                mf=cold/"database-rows"/"P10"/str(x["schema"])/str(x["table"])/"manifest.json"
                try:ok=mf.exists() and bool(json.loads(mf.read_text(encoding="utf-8")).get("done"))
                except:ok=False
                if not ok:incomplete.append(x)
            if incomplete:stop.wait(60);continue
            for prio in (20,30):
                items=[x for x in plan if x.get("export_mode")=="GENERIC_JSONL_GZIP" and int(x.get("priority") or 99)==prio]
                items.sort(key=lambda x:int(x.get("data_bytes") or 0))
                for item in items:
                    if stop.is_set():return
                    # P30 is last-resort raw staging. Preserve extra local safety margin while OneDrive sync catches up.
                    if prio==30 and hot_free_gb(hot)<300:stop.wait(60);continue
                    generic_table(c,hot,cold,item)
            return
        except Exception as e:log(f"staging {type(e).__name__}: {e}");stop.wait(30)
def storage_dest(cold,x):
    b=str(x.get("bucket_id") or "");n=str(x.get("name") or "")
    return (cold/"archives"/Path(n)) if b=="living-world-archives" else (cold/"storage"/b/Path(n))
def storage_one(x,cold):
    if not x.get("signed_url"):return {"status":"NO_URL","bytes":0}
    d=storage_dest(cold,x);d.parent.mkdir(parents=True,exist_ok=True);expected=int((x.get("metadata") or {}).get("size") or 0)
    if d.exists() and (not expected or d.stat().st_size==expected):return {"status":"EXISTS","bytes":0}
    tmp=d.with_suffix(d.suffix+".bp-part");tmp.unlink(missing_ok=True);n=0
    with urllib.request.urlopen(x["signed_url"],timeout=600) as r,tmp.open("wb") as f:
        while True:
            b=r.read(8*1024*1024)
            if not b:break
            f.write(b);n+=len(b)
    if expected and n!=expected:tmp.unlink(missing_ok=True);raise RuntimeError(f"storage size mismatch {x.get('bucket_id')}/{x.get('name')}")
    os.replace(tmp,d);unpin(d);return {"status":"DOWNLOADED","bytes":n}
def storage_worker(c,hot,cold,stop):
    mf=cold/"manifests"/"storage-progress.json";st={"cursor":None,"done":False,"objects":0,"downloaded_bytes":0}
    if mf.exists():
        try:st.update(json.loads(mf.read_text(encoding="utf-8")))
        except:pass
    while not stop.is_set() and not st["done"]:
        try:
            wait_headroom(hot,HOT_WRITE_FLOOR_GB,stop);page=bp.api(c,"storage_rescue_page",cursor=st.get("cursor"),limit=100);rows=page.get("rows") or []
            with ThreadPoolExecutor(max_workers=STORAGE_WORKERS) as pool:res=[f.result() for f in as_completed([pool.submit(storage_one,x,cold) for x in rows])]
            st.update({"cursor":page.get("next_cursor"),"done":bool(page.get("done")),"objects":int(st.get("objects") or 0)+len(rows),
                       "downloaded_bytes":int(st.get("downloaded_bytes") or 0)+sum(int(x.get("bytes") or 0) for x in res),"updated_at":now()})
            atomic_json(mf,st);unpin(mf)
            if not rows and not st["done"]:raise RuntimeError("storage empty non-final")
        except Exception as e:log(f"storage {type(e).__name__}: {e}");stop.wait(10)
def control_worker(c,cold,stop):
    while not stop.is_set():
        try:
            write_restore(cold);download_public_source(cold);copy_runtime(cold);s=export_schema(c,cold);t=export_early_control(c,cold)
            atomic_json(cold/"manifests"/"control-plane-complete.json",{"completed_at":now(),"schema":s,"tables":t,"agent_version":AGENT_VERSION});unpin(cold/"manifests"/"control-plane-complete.json")
            return
        except Exception as e:log(f"control {type(e).__name__}: {e}");stop.wait(10)
def source_worker(cold,stop):
    while not stop.is_set():
        r=private_repo_bundle_if_possible(cold);atomic_json(cold/"source"/"PRIVATE-REPO-BUNDLE-STATUS.json",{"updated_at":now(),**r});unpin(cold/"source"/"PRIVATE-REPO-BUNDLE-STATUS.json")
        stop.wait(1800)
def cloud_state_lane(c,hot,cold,stop):
    while not stop.is_set():
        try:
            if hot_free_gb(hot)<CLOUD_STATE_START_FLOOR_GB:stop.wait(30);continue
            job=bp.api(c,"export_claim").get("job")
            if not job:stop.wait(15);continue
            state=str(job.get("scope_key") or "");bp.export_job(c,cold,job)
            if state:unpin_tree(cold/"snapshots"/f"state_code={state}")
        except Exception as e:log(f"cloud-state {type(e).__name__}: {e}");stop.wait(5)
def status_file(cold,hot):
    manifests=list((cold/"database-rows").glob("P*/*/*/manifest.json")) if (cold/"database-rows").exists() else []
    done=0
    for p in manifests:
        try:
            if json.loads(p.read_text(encoding="utf-8")).get("done"):done+=1
        except:pass
    atomic_json(cold/"RESCUE-STATUS.json",{"updated_at":now(),"agent_version":AGENT_VERSION,"purpose":"COMPLETE_SUPABASE_EXIT_RESCUE",
      "hot_root":str(hot),"cold_root":str(cold),"hot_free_gb":round(hot_free_gb(hot),2),"generic_tables_complete":done,
      "v939_untouched":True,"cloud_state_lanes":1,"secrets_exported_to_chat":False,
      "priorities":{"P10":"all non-staging not handled by giant state tables","P20":"additional staging","P30":"geographic raw staging last"}});unpin(cold/"RESCUE-STATUS.json")
def main():
    c=bp.load();hot=Path(c["data_root"]);od=detect_onedrive();cold=od/"BridgePointRescue";cold.mkdir(parents=True,exist_ok=True);stop=threading.Event()
    write_restore(cold);download_public_source(cold);copy_runtime(cold);log(f"START V942 OneDrive={od} hot={hot} cold={cold}")
    threads=[
      threading.Thread(target=control_worker,args=(c,cold,stop),daemon=True,name="bp-control"),
      threading.Thread(target=storage_worker,args=(c,hot,cold,stop),daemon=True,name="bp-storage"),
      threading.Thread(target=generic_worker,args=(c,hot,cold,True,stop),daemon=True,name="bp-db-large"),
      threading.Thread(target=generic_worker,args=(c,hot,cold,False,stop),daemon=True,name="bp-db-small"),
      threading.Thread(target=staging_worker,args=(c,hot,cold,stop),daemon=True,name="bp-staging"),
      threading.Thread(target=source_worker,args=(cold,stop),daemon=True,name="bp-source"),
      threading.Thread(target=cloud_state_lane,args=(c,hot,cold,stop),daemon=True,name="bp-cloud-state")
    ]
    for t in threads:t.start()
    while True:
        try:
            mirror_completed_states(hot,cold);copy_runtime(cold);status_file(cold,hot);time.sleep(60)
        except KeyboardInterrupt:stop.set();return
        except Exception as e:log(f"main {type(e).__name__}: {e}");time.sleep(10)
if __name__=="__main__":main()
