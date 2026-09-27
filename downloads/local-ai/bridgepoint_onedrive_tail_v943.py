#!/usr/bin/env python3
from __future__ import annotations
import hashlib, json, os, shutil, subprocess, sys, time
from datetime import datetime, timezone
from pathlib import Path
import pyarrow as pa
import pyarrow.parquet as pq

AGENT_VERSION=943
PURPOSE="COLD_PRIMARY_TAIL_V943"
AGENT_DIR=Path(r"C:\BridgePointRuntime\agent")
if str(AGENT_DIR) not in sys.path: sys.path.insert(0,str(AGENT_DIR))
import bridgepoint_agent as bp

BASELINE_HINT="2026-09-23T09:23:58.184879Z"
PAGE_LIMIT=500
POLL_SECONDS=45
MIN_LOCAL_FREE_GB=12.0
GiB=1024**3
STATE_ROOT=AGENT_DIR/"v943-state"
STATE_ROOT.mkdir(parents=True,exist_ok=True)
SPECIALIZED_STREAMS={
 ("core","global_property_identities_v953"),
 ("analytics","global_property_boundary_link_v953"),
 ("automation","global_parcel_boundary_provenance_v953"),
 ("automation","parcel_boundary_provenance_v1831"),
 ("analytics","universal_building_geometry_v918"),
 ("analytics","unified_roof_truth_v2603"),
 ("analytics","intelligence_building_layout_v3210"),
}

def now(): return bp.now()
def norm_ts(v):
    s=str(v or "")
    try:return datetime.fromisoformat(s.replace("Z","+00:00")).astimezone(timezone.utc)
    except Exception:return None
def log(msg):
    p=AGENT_DIR/"onedrive-tail-v943.log";p.parent.mkdir(parents=True,exist_ok=True)
    with p.open("a",encoding="utf-8") as f:f.write(f"{now()} {msg}\n")
def detect_onedrive():
    c=[]
    for k in ("OneDriveCommercial","OneDriveConsumer","OneDrive"):
        if os.environ.get(k): c.append(Path(os.environ[k]))
    c.extend(sorted(Path.home().glob("OneDrive*")));seen=set()
    for p in c:
        try:q=p.resolve()
        except:q=p
        k=str(q).lower()
        if k in seen:continue
        seen.add(k)
        if p.exists() and p.is_dir():return p
    raise RuntimeError("No signed-in OneDrive folder detected.")
def unpin(p):
    if os.name!="nt":return
    try:subprocess.run(["cmd","/c","attrib","+u","-p",str(p)],capture_output=True,text=True,timeout=30)
    except Exception as e:log(f"unpin {p}: {e}")
def free_local_gb():
    root=Path(os.environ.get("SystemDrive","C:")+"\\")
    return shutil.disk_usage(root).free/GiB
def atomic_json(path,obj,unpin_after=False):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    data=json.dumps(obj,indent=2,sort_keys=True)
    last=None
    if unpin_after and path.exists():
        try:
            path.write_text(data,encoding="utf-8")
            unpin(path)
            return True
        except PermissionError as e:
            last=e
    for i in range(8):
        tmp=path.with_suffix(path.suffix+f".{os.getpid()}.{i}.tmp")
        try:
            tmp.write_text(data,encoding="utf-8")
            os.replace(tmp,path)
            if unpin_after: unpin(path)
            return True
        except PermissionError as e:
            last=e
            try: tmp.unlink(missing_ok=True)
            except Exception: pass
            time.sleep(.25*(i+1))
    if str(path).lower().startswith(str(STATE_ROOT).lower()):
        for i in range(8):
            try:
                path.write_text(data,encoding="utf-8")
                return True
            except PermissionError as e:
                last=e;time.sleep(.35*(i+1))
    if not unpin_after:
        try:
            path.write_text(data,encoding="utf-8")
            return True
        except Exception as e:
            last=e
    log(f"MANIFEST_WRITE_FAILED {path} {last}")
    return False
def sha256_file(path):
    h=hashlib.sha256()
    with Path(path).open("rb") as f:
        for b in iter(lambda:f.read(8*1024*1024),b""):h.update(b)
    return h.hexdigest()
def safe(s): return "".join(ch if ch.isalnum() or ch in "._-" else "_" for ch in str(s))
def table_manifest(cold,schema,table):
    return cold/"deltas"/safe(schema)/safe(table)/"TAIL-MANIFEST.json"
def state_dir(schema,table):
    return STATE_ROOT/safe(schema)/safe(table)
def load_manifest(local_dir,cloud_path,baseline):
    st={"version":943,"after_ts":baseline,"after_key":"","files":[],"rows":0,"caught_up_at":None}
    local_dir=Path(local_dir);sources=[]
    if local_dir.exists():
        sources.extend(sorted(local_dir.glob("checkpoint-*.json"),reverse=True))
        legacy=local_dir/"STATE.json"
        if legacy.exists(): sources.append(legacy)
    if cloud_path.exists(): sources.append(cloud_path)
    for src in sources:
        try:
            st.update(json.loads(src.read_text(encoding="utf-8")));break
        except Exception: pass
    uniq=[];seen=set()
    for rec in list(st.get("files") or []):
        p=str(rec.get("path") or "")
        if not p or p in seen: continue
        seen.add(p);uniq.append(rec)
    st["files"]=uniq
    if uniq: st["rows"]=sum(int(x.get("rows") or 0) for x in uniq)
    if not isinstance(st.get("after_ids"),list):
        raw=str(st.get("after_key") or "")
        if raw and st.get("cursor_encoding")=="HEX_UTF8_V943":
            try: raw=bytes.fromhex(raw).decode("utf-8")
            except Exception: pass
        st["after_ids"]=raw.split(chr(31)) if raw else []
    st["cursor_mode"]="ID_TUPLE_V943"
    return st
def save_manifest(local_dir,cloud_path,st):
    local_dir=Path(local_dir);local_dir.mkdir(parents=True,exist_ok=True)
    data=json.dumps(st,indent=2,sort_keys=True)
    wrote=False
    for i in range(8):
        cp=local_dir/f"checkpoint-{time.time_ns()}-{os.getpid()}-{i}.json"
        try:
            cp.write_text(data,encoding="utf-8");wrote=True;break
        except PermissionError:
            time.sleep(.2*(i+1))
    if not wrote:
        raise RuntimeError(f"LOCAL_CHECKPOINT_WRITE_FAILED {local_dir}")
    try:
        old=sorted(local_dir.glob("checkpoint-*.json"),reverse=True)
        for p in old[4:]:
            try:p.unlink()
            except Exception:pass
    except Exception:pass
    atomic_json(cloud_path,st,True)
def page_id(schema,table,start_ts,start_key,end_ts,end_key):
    s="|".join(map(str,[schema,table,start_ts,start_key,end_ts,end_key]))
    return hashlib.sha256(s.encode("utf-8")).hexdigest()[:24]
def write_page(cold,schema,table,rows,start_ts,start_key,next_cursor):
    end_ts=str(next_cursor.get("after_ts") or start_ts);end_key=str(next_cursor.get("after_key") or start_key)
    pid=page_id(schema,table,start_ts,start_key,end_ts,end_key)
    day=(end_ts[:10] if len(end_ts)>=10 else "unknown")
    out=cold/"deltas"/safe(schema)/safe(table)/f"date={day}"/f"part-{pid}.parquet"
    out.parent.mkdir(parents=True,exist_ok=True)
    if out.exists() and out.stat().st_size>0:
        return {"path":str(out.relative_to(cold)),"rows":len(rows),"bytes":out.stat().st_size,"sha256":sha256_file(out),"status":"EXISTS"}
    records=[]
    for x in rows:
        records.append({
          "_bp_change_at":str(x.get("change_at") or ""),
          "_bp_row_key":str(x.get("row_key") or ""),
          "_bp_schema":schema,
          "_bp_table":table,
          "row_json":json.dumps(x.get("row_data"),separators=(",",":"),ensure_ascii=False)
        })
    tab=pa.Table.from_pylist(records)
    tmp=out.with_suffix(".parquet.bp-part");tmp.unlink(missing_ok=True)
    pq.write_table(tab,tmp,compression="zstd",compression_level=9,use_dictionary=True,row_group_size=min(max(len(records),1),500))
    os.replace(tmp,out);h=sha256_file(out);n=out.stat().st_size;unpin(out)
    return {"path":str(out.relative_to(cold)),"rows":len(rows),"bytes":n,"sha256":h,"status":"WRITTEN"}
def sync_table(c,cold,item,baseline):
    schema=str(item["schema_name"]);table=str(item["table_name"]);mf=table_manifest(cold,schema,table);sm=state_dir(schema,table);st=load_manifest(sm,mf,baseline)
    pages=0
    while pages<40:
        if free_local_gb()<MIN_LOCAL_FREE_GB:
            st["storage_pause_at"]=now();st["local_free_gb"]=round(free_local_gb(),2);save_manifest(sm,mf,st)
            return {"table":f"{schema}.{table}","status":"LOCAL_HEADROOM_PAUSE","free_gb":round(free_local_gb(),2)}
        start_ts=str(st.get("after_ts") or baseline);start_ids=[str(x) for x in (st.get("after_ids") or [])]
        p=bp.api(c,"delta_page_v943",schema=schema,table=table,after_ts=start_ts,after_ids=start_ids,limit=PAGE_LIMIT)
        rows=p.get("rows") or [];nxt=p.get("next") or {"after_ts":start_ts,"after_ids":start_ids}
        if rows:
            next_ts=str(nxt.get("after_ts") or start_ts);next_ids=[str(x) for x in (nxt.get("after_ids") or start_ids)]
            cur_dt,next_dt=norm_ts(start_ts),norm_ts(next_ts)
            backwards=(cur_dt is not None and next_dt is not None and next_dt<cur_dt) or (cur_dt is None and next_dt is None and next_ts<start_ts)
            same_time=(cur_dt is not None and next_dt is not None and next_dt==cur_dt) or (cur_dt is None and next_dt is None and next_ts==start_ts)
            if backwards or (same_time and tuple(next_ids)<=tuple(start_ids)):
                raise RuntimeError(f"NON_ADVANCING_CURSOR current={(start_ts,start_ids)!r} next={(next_ts,next_ids)!r}")
            start_key=json.dumps(start_ids,separators=(",",":"));next_key=json.dumps(next_ids,separators=(",",":"))
            rec=write_page(cold,schema,table,rows,start_ts,start_key,{"after_ts":next_ts,"after_key":next_key})
            files=list(st.get("files") or [])
            if not any(str(x.get("path") or "")==str(rec.get("path") or "") for x in files):
                files.append(rec)
            if len(files)>250: files=files[-250:]
            st.update({"after_ts":next_ts,"after_ids":next_ids,"after_key":next_key,"cursor_mode":"ID_TUPLE_V943",
                       "rows":sum(int(x.get("rows") or 0) for x in files),"files":files,"last_page_at":now(),
                       "priority":item.get("priority"),"export_mode":item.get("export_mode"),"caught_up_at":None})
            save_manifest(sm,mf,st)
        if bool(p.get("done")):
            st["caught_up_at"]=now();st["local_free_gb"]=round(free_local_gb(),2);save_manifest(sm,mf,st)
            return {"table":f"{schema}.{table}","status":"CAUGHT_UP","rows_total":st["rows"],"cursor":st["after_ts"]}
        pages+=1
    return {"table":f"{schema}.{table}","status":"BATCH_LIMIT","rows_total":st["rows"],"cursor":st["after_ts"]}
def status(cold,items,results):
    total_files=0;total_rows=0;caught=0
    for x in items:
        sm=state_dir(x["schema_name"],x["table_name"])
        if not sm.exists():continue
        try:
            st=load_manifest(sm,table_manifest(cold,x["schema_name"],x["table_name"]),BASELINE_HINT)
            total_files+=len(st.get("files") or []);total_rows+=int(st.get("rows") or 0)
            if st.get("caught_up_at"):caught+=1
        except Exception:pass
    payload={
      "version":943,"purpose":PURPOSE,"updated_at":now(),"baseline_hint":BASELINE_HINT,
      "tables_registered":len(items)+len(SPECIALIZED_STREAMS),"generic_tables":len(items),"specialized_tables":len(SPECIALIZED_STREAMS),"tables_caught_up":caught,"tail_rows_written":total_rows,
      "recent_files_tracked":total_files,"local_free_gb":round(free_local_gb(),2),
      "cold_root":str(cold),"format":"PARQUET_ZSTD_ROW_JSON_WITH_GEOMETRY_EWKB","full_state_claims_required":False,
      "last_results":results[-20:]
    }
    atomic_json(STATE_ROOT/"DELTA-TAIL-V943-STATUS.json",payload,False)
    atomic_json(cold/"manifests"/"DELTA-TAIL-V943-STATUS.json",payload,True)
def main():
    c=bp.load();od=detect_onedrive();cold=od/"BridgePointRescue";cold.mkdir(parents=True,exist_ok=True)
    log(f"START {PURPOSE} OneDrive={od} cold={cold}")
    while True:
        try:
            reg=bp.api(c,"delta_registry_v943");all_items=reg.get("tables") or [];baseline=str(reg.get("baseline_hint") or BASELINE_HINT)
            items=[x for x in all_items if (str(x.get("schema_name")),str(x.get("table_name"))) not in SPECIALIZED_STREAMS]
            results=[{"table":f"{s}.{t}","status":"SPECIALIZED_EXTERNAL_TAIL"} for s,t in sorted(SPECIALIZED_STREAMS)]
            for item in items:
                try:results.append(sync_table(c,cold,item,baseline))
                except Exception as e:
                    results.append({"table":f"{item.get('schema_name')}.{item.get('table_name')}","status":"ERROR","error":f"{type(e).__name__}: {e}"})
                    log(f"{item.get('schema_name')}.{item.get('table_name')} {type(e).__name__}: {e}")
            status(cold,items,results);time.sleep(POLL_SECONDS)
        except KeyboardInterrupt:return
        except Exception as e:log(f"main {type(e).__name__}: {e}");time.sleep(15)
if __name__=="__main__":main()
