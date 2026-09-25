#!/usr/bin/env python3
from __future__ import annotations
import json, os, shutil, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

AGENT_DIR = Path(r"C:\BridgePointRuntime\agent")
if str(AGENT_DIR) not in sys.path:
    sys.path.insert(0, str(AGENT_DIR))
import bridgepoint_agent as bp

POLL_SECONDS = 60
ARCHIVE_WORKERS = 2

def log(msg):
    p = AGENT_DIR / "onedrive-rescue.log"
    with p.open("a", encoding="utf-8") as f:
        f.write(f"{bp.now()} {msg}\n")

def detect_onedrive():
    candidates = []
    for key in ("OneDriveCommercial","OneDriveConsumer","OneDrive"):
        v = os.environ.get(key)
        if v:
            candidates.append(Path(v))
    home = Path.home()
    for p in sorted(home.glob("OneDrive*")):
        candidates.append(p)
    seen = set()
    for p in candidates:
        try:
            q = p.resolve()
        except Exception:
            q = p
        k = str(q).lower()
        if k in seen:
            continue
        seen.add(k)
        if p.exists() and p.is_dir():
            return p
    raise RuntimeError("No signed-in OneDrive sync folder was detected for this Windows user.")

def same_file(src, dst):
    return dst.exists() and dst.is_file() and src.stat().st_size == dst.stat().st_size

def copy_file(src, dst):
    dst.parent.mkdir(parents=True, exist_ok=True)
    if same_file(src, dst):
        return False
    tmp = dst.with_suffix(dst.suffix + ".bp-part")
    if tmp.exists():
        tmp.unlink()
    shutil.copy2(src, tmp)
    if tmp.stat().st_size != src.stat().st_size:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"copy size mismatch: {src}")
    os.replace(tmp, dst)
    return True

def unpin(path):
    if os.name != "nt":
        return
    try:
        subprocess.run(["cmd","/c","attrib","+u","-p",str(path)], capture_output=True, text=True, timeout=30)
    except Exception as e:
        log(f"unpin warning {path}: {e}")

def unpin_tree(path):
    if os.name != "nt":
        return
    try:
        subprocess.run(["cmd","/c","attrib","+u","-p",str(path / "*"),"/s","/d"], capture_output=True, text=True, timeout=120)
    except Exception as e:
        log(f"unpin tree warning {path}: {e}")

def mirror_completed_states(hot, cold):
    srcroot = hot / "snapshots"
    dstroot = cold / "snapshots"
    mirrored = []
    if not srcroot.exists():
        return mirrored
    for state_dir in sorted(srcroot.glob("state_code=*")):
        complete = state_dir / "COMPLETE.json"
        manifest = state_dir / "MANIFEST.json"
        if not complete.exists() or not manifest.exists():
            continue
        dst = dstroot / state_dir.name
        changed = 0
        for src in state_dir.rglob("*"):
            if not src.is_file() or src.name.endswith(".bp-part"):
                continue
            rel = src.relative_to(state_dir)
            if copy_file(src, dst / rel):
                changed += 1
        # OneDrive Files On-Demand: make the cloud mirror unpinned after the copy.
        unpin_tree(dst)
        mirrored.append({"state":state_dir.name.split("=",1)[-1],"files_changed":changed})
    return mirrored

def download_archive_item(item, dest):
    result = bp.download(item, dest)
    unpin(dest)
    return result

def sync_archives_direct(c, cold):
    status = bp.api(c, "status")
    if not status.get("portable_export_authority"):
        return {"count":0,"bytes":0,"status":"SKIPPED"}
    records = []
    for state in bp.STATES:
        for remote_t, local_t in bp.ARCHIVES:
            prefix = remote_t.format(state=state)
            off = 0
            while True:
                page = bp.api(c, "archive_list", prefix=prefix, offset=off, limit=100)
                files = [x for x in (page.get("files") or []) if x.get("signed_url")]
                with ThreadPoolExecutor(max_workers=ARCHIVE_WORKERS) as pool:
                    futs = []
                    for x in files:
                        dest = cold / local_t.format(state=state) / Path(x["path"]).name
                        futs.append(pool.submit(download_archive_item, x, dest))
                    for fut in as_completed(futs):
                        records.append(fut.result())
                if not page.get("has_more"):
                    break
                off += 100
    return {"count":len(records),"bytes":sum(int(x.get("bytes") or 0) for x in records),"status":"OK"}

def mirror_manifests(hot, cold):
    changed = 0
    src = hot / "manifests"
    dst = cold / "manifests"
    if src.exists():
        for p in src.rglob("*"):
            if p.is_file() and copy_file(p, dst / p.relative_to(src)):
                changed += 1
    cat = hot / "catalog" / "bridgepoint.duckdb"
    if cat.exists():
        copy_file(cat, cold / "catalog" / "bridgepoint.duckdb")
        changed += 1
    return changed

def write_status(cold, payload):
    p = cold / "onedrive-rescue-status.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    tmp = p.with_suffix(".tmp")
    tmp.write_text(json.dumps(payload, indent=2, sort_keys=True), encoding="utf-8")
    os.replace(tmp, p)
    unpin(p)

def main():
    c = bp.load()
    hot = Path(c["data_root"])
    od = detect_onedrive()
    cold = od / "BridgePointRescue"
    cold.mkdir(parents=True, exist_ok=True)
    log(f"START oneDrive={od} cold={cold} hot={hot}")
    last_archives = 0.0
    while True:
        try:
            mirrored = mirror_completed_states(hot, cold)
            manifest_changes = mirror_manifests(hot, cold)
            archive_result = None
            t = time.monotonic()
            if t - last_archives >= 1800:
                archive_result = sync_archives_direct(c, cold)
                last_archives = t
            payload = {
                "updated_at": bp.now(),
                "agent_version": 940,
                "hot_root": str(hot),
                "onedrive_root": str(od),
                "cold_root": str(cold),
                "mirrored_states": mirrored,
                "manifest_changes": manifest_changes,
                "archive_result": archive_result,
                "files_on_demand_unpinned": True,
            }
            write_status(cold, payload)
            time.sleep(POLL_SECONDS)
        except KeyboardInterrupt:
            return
        except Exception as e:
            log(f"ERROR {type(e).__name__}: {e}")
            time.sleep(30)

if __name__ == "__main__":
    main()
