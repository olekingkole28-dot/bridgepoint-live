#!/usr/bin/env python3
from __future__ import annotations
import gzip, json, os, shutil, subprocess, sys, threading, time, urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

AGENT_VERSION = 941
AGENT_DIR = Path(r"C:\BridgePointRuntime\agent")
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))
import bridgepoint_agent as bp

POLL_SECONDS = 30
CONTROL_PAGE = 250
STORAGE_WORKERS = 2

def now():
    return bp.now()

def log(msg):
    p = AGENT_DIR / "onedrive-full-rescue-v941.log"
    p.parent.mkdir(parents=True, exist_ok=True)
    with p.open("a", encoding="utf-8") as f:
        f.write(f"{now()} {msg}\n")

def atomic_json(path, obj):
    path = Path(path); path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, indent=2, sort_keys=True), encoding="utf-8")
    os.replace(tmp, path)

def detect_onedrive():
    candidates = []
    for key in ("OneDriveCommercial", "OneDriveConsumer", "OneDrive"):
        v = os.environ.get(key)
        if v:
            candidates.append(Path(v))
    for p in sorted(Path.home().glob("OneDrive*")):
        candidates.append(p)
    seen = set()
    for p in candidates:
        try: q = p.resolve()
        except Exception: q = p
        k = str(q).lower()
        if k in seen: continue
        seen.add(k)
        if p.exists() and p.is_dir():
            return p
    raise RuntimeError("No signed-in OneDrive sync folder detected for this Windows user.")

def unpin(path):
    if os.name != "nt": return
    try:
        subprocess.run(["cmd","/c","attrib","+u","-p",str(path)], capture_output=True, text=True, timeout=30)
    except Exception as e:
        log(f"unpin warning {path}: {e}")

def unpin_tree(path):
    if os.name != "nt": return
    try:
        subprocess.run(["cmd","/c","attrib","+u","-p",str(Path(path) / "*"),"/s","/d"], capture_output=True, text=True, timeout=300)
    except Exception as e:
        log(f"unpin-tree warning {path}: {e}")

def file_complete(path, expected=0):
    p = Path(path)
    try:
        return p.exists() and p.is_file() and (not expected or p.stat().st_size == expected)
    except Exception:
        return False

def copy_file(src, dst):
    src, dst = Path(src), Path(dst)
    dst.parent.mkdir(parents=True, exist_ok=True)
    size = src.stat().st_size
    if file_complete(dst, size):
        return False
    tmp = dst.with_suffix(dst.suffix + ".bp-part")
    tmp.unlink(missing_ok=True)
    shutil.copy2(src, tmp)
    if tmp.stat().st_size != size:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"copy size mismatch: {src}")
    os.replace(tmp, dst)
    return True

def copy_runtime(cold):
    dst = cold / "runtime"
    changed = 0
    for src in (
        AGENT_DIR / "bridgepoint_agent.py",
        AGENT_DIR / "bridgepoint_onedrive_full_rescue_v941.py",
        Path(r"C:\BridgePointRuntime\release.json"),
    ):
        if src.exists() and src.is_file():
            if copy_file(src, dst / src.name):
                changed += 1
    return changed

def write_restore_readme(cold):
    text = """BRIDGEPOINT EMERGENCY SUPABASE EXIT PACKAGE - V941

PURPOSE
This OneDrive folder is the cold rescue tier for BridgePoint. It is designed so a Supabase shutdown does not destroy the information needed to rebuild the local runtime.

IMPORTANT
- C:\\BridgePointData remains the hot local runtime/export location.
- V939 continues exporting there independently.
- This OneDrive package is not the live database.
- States completed by the cloud rescue lane may exist only here until restored locally.
- Files are intentionally made OneDrive Files-On-Demand / online-only after they are safely closed so they do not permanently consume the PC SSD.

FOLDERS
snapshots/              Complete state Parquet bundles written/mirrored to OneDrive.
archives/               Supabase living-world archive objects (buildings/transport/runtime archives).
storage/                Other Supabase Storage buckets and objects.
control-plane/schema/   Snapshot of schemas, relations, functions, policies, triggers, indexes, extensions, enums, cron jobs.
control-plane/tables/   Small/medium Supabase tables (auth, product/config, automation, security, storage metadata, etc.) in compressed JSONL pages.
runtime/                Local rescue/runtime scripts (never raw secrets).
source/                 Public deployment source archive and references to private source repositories.
manifests/              Rescue progress and verification metadata.

SOURCE CODE
The private repository olekingkole28-dot/bridgepoint_data_studio and public repository olekingkole28-dot/bridgepoint-live are hosted in GitHub, outside Supabase. They are not endangered by a Supabase shutdown. The deployed Edge Function name/version/JWT manifest is also included in the control-plane table snapshot.

SECRETS
Raw external-provider secret values are NOT copied to OneDrive. After local restore, secrets for providers such as Stripe/email/social services must be re-created from those providers. Supabase service-role secrets are not required for the local replacement and should not be preserved.

RESTORE ORDER AFTER SUPABASE
1. Ensure C:\\BridgePointData and C:\\BridgePointRuntime are available.
2. Download any OneDrive state snapshot folders that are not already under C:\\BridgePointData\\snapshots.
3. Restore archives/storage objects as required.
4. Rebuild the local DuckDB catalog over all Parquet files.
5. Use control-plane/schema and control-plane/tables to recreate operational database/auth/config state.
6. Repoint the web/app backend from Supabase to the local/self-hosted BridgePoint services.
7. Re-create external-provider secret values.
8. Run integrity/restore tests before deleting any rescue copy.
"""
    p = cold / "RESTORE-BRIDGEPOINT-FIRST.txt"
    p.write_text(text, encoding="utf-8")
    unpin(p)

def download_public_source(cold):
    dst = cold / "source" / "bridgepoint-live-live-artifact.zip"
    if not dst.exists():
        dst.parent.mkdir(parents=True, exist_ok=True)
        tmp = dst.with_suffix(".zip.part")
        url = "https://codeload.github.com/olekingkole28-dot/bridgepoint-live/zip/refs/heads/live-artifact"
        with urllib.request.urlopen(url, timeout=300) as r, tmp.open("wb") as f:
            shutil.copyfileobj(r, f, 8*1024*1024)
        os.replace(tmp, dst)
        unpin(dst)
    refs = {
        "captured_at": now(),
        "repositories": [
            {"name":"olekingkole28-dot/bridgepoint-live","visibility":"public","supabase_dependency":False},
            {"name":"olekingkole28-dot/bridgepoint_data_studio","visibility":"private","supabase_dependency":False,
             "note":"Authoritative private source repo remains in GitHub and is outside the Supabase shutdown boundary."}
        ]
    }
    atomic_json(cold / "source" / "SOURCE-REPOSITORIES.json", refs)
    unpin(cold / "source" / "SOURCE-REPOSITORIES.json")

def mirror_local_completed_states(hot, cold):
    srcroot = hot / "snapshots"
    if not srcroot.exists(): return []
    done = []
    for sd in sorted(srcroot.glob("state_code=*")):
        if not (sd/"COMPLETE.json").exists() or not (sd/"MANIFEST.json").exists():
            continue
        dst = cold / "snapshots" / sd.name
        changed = 0
        for src in sd.rglob("*"):
            if src.is_file() and not src.name.endswith(".bp-part"):
                if copy_file(src, dst / src.relative_to(sd)):
                    changed += 1
        unpin_tree(dst)
        done.append({"state":sd.name.split("=",1)[-1],"files_changed":changed})
    return done

def cloud_export_lane(c, cold):
    # One additional state lane directly into OneDrive. Database claim locking prevents
    # duplication with the two V939 local lanes.
    try:
        job = bp.api(c, "export_claim").get("job")
        if not job:
            return None
        result = bp.export_job(c, cold, job)
        state = str(job.get("scope_key") or "")
        if state:
            unpin_tree(cold / "snapshots" / f"state_code={state}")
        return {"state":state,"result":result}
    except Exception as e:
        log(f"cloud-state {type(e).__name__}: {e}")
        return {"error":f"{type(e).__name__}: {e}"}

def export_schema_catalog(c, cold):
    root = cold / "control-plane" / "schema"
    root.mkdir(parents=True, exist_ok=True)
    progress = root / "progress.json"
    state = {"offset":0,"done":False}
    if progress.exists():
        try: state.update(json.loads(progress.read_text(encoding="utf-8")))
        except Exception: pass
    while not state.get("done"):
        offset = int(state.get("offset") or 0)
        page = bp.api(c, "bootstrap_schema_page", offset=offset, limit=250)
        rows = page.get("rows") or []
        part = root / f"part-{offset:08d}.jsonl.gz"
        if not part.exists():
            tmp = part.with_suffix(part.suffix + ".part")
            with gzip.open(tmp, "wt", encoding="utf-8") as gz:
                for row in rows:
                    gz.write(json.dumps(row, separators=(",",":"), ensure_ascii=False) + "\n")
            os.replace(tmp, part); unpin(part)
        state = {"offset":offset+len(rows),"done":bool(page.get("done")),"updated_at":now()}
        atomic_json(progress, state); unpin(progress)
        if not rows and not state["done"]:
            raise RuntimeError("empty non-final schema page")
    return state

def export_control_tables(c, cold):
    cat = bp.api(c, "bootstrap_catalog")
    tables = cat.get("tables") or []
    base = cold / "control-plane" / "tables"
    completed = 0
    for item in tables:
        schema, table = str(item["schema"]), str(item["table"])
        td = base / schema / table
        td.mkdir(parents=True, exist_ok=True)
        manifest = td / "manifest.json"
        st = {"offset":0,"done":False}
        if manifest.exists():
            try: st.update(json.loads(manifest.read_text(encoding="utf-8")))
            except Exception: pass
        while not st.get("done"):
            off = int(st.get("offset") or 0)
            limit = CONTROL_PAGE
            try:
                page = bp.api(c, "bootstrap_table_page", schema=schema, table=table, offset=off, limit=limit)
            except Exception:
                limit = 50
                page = bp.api(c, "bootstrap_table_page", schema=schema, table=table, offset=off, limit=limit)
            rows = page.get("rows") or []
            part = td / f"part-{off:012d}.jsonl.gz"
            if not part.exists():
                tmp = part.with_suffix(part.suffix + ".part")
                with gzip.open(tmp, "wt", encoding="utf-8") as gz:
                    for row in rows:
                        gz.write(json.dumps(row, separators=(",",":"), ensure_ascii=False) + "\n")
                os.replace(tmp, part); unpin(part)
            st = {
                "schema":schema,"table":table,"offset":off+len(rows),
                "done":bool(page.get("done")),"updated_at":now(),
                "source_total_bytes":item.get("total_bytes"),"source_heap_bytes":item.get("heap_bytes")
            }
            atomic_json(manifest, st); unpin(manifest)
            if not rows and not st["done"]:
                raise RuntimeError(f"{schema}.{table}: empty non-final page")
        completed += 1
        unpin_tree(td)
    return {"tables_total":len(tables),"tables_completed":completed,"schema_catalog_count":cat.get("schema_catalog_count")}

def storage_dest(cold, item):
    bucket = str(item.get("bucket_id") or "")
    name = str(item.get("name") or "")
    if bucket == "living-world-archives":
        return cold / "archives" / Path(name)
    return cold / "storage" / bucket / Path(name)

def download_storage_item(item, cold):
    url = item.get("signed_url")
    if not url: return {"status":"NO_URL","name":item.get("name")}
    dest = storage_dest(cold,item)
    meta = item.get("metadata") or {}
    expected = int(meta.get("size") or 0)
    dest.parent.mkdir(parents=True, exist_ok=True)
    if file_complete(dest, expected):
        return {"status":"EXISTS","bytes":expected}
    tmp = dest.with_suffix(dest.suffix + ".bp-part")
    tmp.unlink(missing_ok=True)
    size = 0
    with urllib.request.urlopen(url, timeout=600) as r, tmp.open("wb") as f:
        while True:
            b = r.read(8*1024*1024)
            if not b: break
            f.write(b); size += len(b)
    if expected and size != expected:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"storage size mismatch {item.get('bucket_id')}/{item.get('name')}")
    os.replace(tmp,dest); unpin(dest)
    return {"status":"DOWNLOADED","bytes":size}

def export_storage(c, cold):
    md = cold / "manifests"; md.mkdir(parents=True, exist_ok=True)
    pf = md / "storage-progress.json"
    st = {"cursor":None,"done":False,"objects_completed":0,"bytes_completed":0}
    if pf.exists():
        try: st.update(json.loads(pf.read_text(encoding="utf-8")))
        except Exception: pass
    while not st.get("done"):
        page = bp.api(c, "storage_rescue_page", cursor=st.get("cursor"), limit=100)
        rows = page.get("rows") or []
        with ThreadPoolExecutor(max_workers=STORAGE_WORKERS) as pool:
            futs = [pool.submit(download_storage_item,x,cold) for x in rows]
            results = [f.result() for f in as_completed(futs)]
        st["objects_completed"] = int(st.get("objects_completed") or 0) + len(rows)
        st["bytes_completed"] = int(st.get("bytes_completed") or 0) + sum(int(x.get("bytes") or 0) for x in results if x.get("status")=="DOWNLOADED")
        st["cursor"] = page.get("next_cursor")
        st["done"] = bool(page.get("done"))
        st["updated_at"] = now()
        atomic_json(pf, st); unpin(pf)
        if not rows and not st["done"]:
            raise RuntimeError("empty non-final storage page")
    return st

def control_plane_worker(c, cold, stop):
    while not stop.is_set():
        try:
            write_restore_readme(cold)
            download_public_source(cold)
            copy_runtime(cold)
            schema = export_schema_catalog(c,cold)
            tables = export_control_tables(c,cold)
            atomic_json(cold/"manifests"/"control-plane-complete.json",
                        {"completed_at":now(),"agent_version":AGENT_VERSION,"schema":schema,"tables":tables})
            unpin(cold/"manifests"/"control-plane-complete.json")
            # A complete control-plane pass is enough for the emergency window.
            return
        except Exception as e:
            log(f"control-plane {type(e).__name__}: {e}")
            stop.wait(15)

def storage_worker(c, cold, stop):
    while not stop.is_set():
        try:
            st = export_storage(c,cold)
            if st.get("done"): return
        except Exception as e:
            log(f"storage {type(e).__name__}: {e}")
            stop.wait(15)

def heartbeat_status(cold, hot):
    status = {
        "updated_at":now(),"agent_version":AGENT_VERSION,
        "hot_root":str(hot),"cold_root":str(cold),
        "purpose":"SUPABASE_EXIT_FULL_RESCUE",
        "v939_untouched":True,
        "cloud_state_lanes":1,
        "includes":["STATE_SNAPSHOTS","ALL_STORAGE_OBJECTS","SCHEMA_CATALOG","AUTH_AND_CONTROL_TABLES","DEPLOYED_FUNCTION_MANIFEST","MIGRATION_MANIFEST","LOCAL_RUNTIME","PUBLIC_LIVE_SOURCE","RESTORE_GUIDE"],
        "raw_supabase_secrets_exported":False
    }
    atomic_json(cold/"RESCUE-STATUS.json",status); unpin(cold/"RESCUE-STATUS.json")

def main():
    c = bp.load()
    hot = Path(c["data_root"])
    od = detect_onedrive()
    cold = od / "BridgePointRescue"
    cold.mkdir(parents=True, exist_ok=True)
    stop = threading.Event()
    write_restore_readme(cold)
    log(f"START v941 onedrive={od} hot={hot} cold={cold}")
    threading.Thread(target=control_plane_worker,args=(c,cold,stop),daemon=True,name="bp-control-plane").start()
    threading.Thread(target=storage_worker,args=(c,cold,stop),daemon=True,name="bp-storage-rescue").start()
    last_mirror = 0.0
    while True:
        try:
            t = time.monotonic()
            heartbeat_status(cold,hot)
            if t-last_mirror >= 300:
                mirror_local_completed_states(hot,cold)
                copy_runtime(cold)
                last_mirror=t
            # One direct-to-OneDrive state lane in addition to V939's local lanes.
            cloud_export_lane(c,cold)
            time.sleep(POLL_SECONDS)
        except KeyboardInterrupt:
            stop.set(); return
        except Exception as e:
            log(f"main {type(e).__name__}: {e}")
            time.sleep(15)

if __name__ == "__main__":
    main()
