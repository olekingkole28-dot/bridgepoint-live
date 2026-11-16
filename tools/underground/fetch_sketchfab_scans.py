#!/usr/bin/env python3
"""Fetch individually approved Sketchfab scans into BridgePoint local GLB assets.

Requires SKETCHFAB_API_TOKEN in the environment (GitHub Actions secret).
Only Creative Commons Attribution (CC BY) licenses are accepted for the commercial build.
Temporary Download API URLs are never written to disk or logged.
"""
from __future__ import annotations
import argparse, gzip, hashlib, json, os, shutil, subprocess, tempfile, urllib.request, zipfile
from pathlib import Path, PurePosixPath

MODELS=[
 {"uid":"39e7050d272f4aac8493497621b86f39","site_id":"paris-catacombs","title":"Paris catacombs — Large gallery"},
 {"uid":"27ae0d6041c54e2eab6638d197985842","site_id":"paris-catacombs","title":"Paris catacombs — Level 1 to Level 2"},
 {"uid":"c63534cc8b97437bb933b8eba87ffb0d","site_id":"paris-catacombs","title":"Paris catacombs — Our Lady of the Catacombs"},
 {"uid":"d407fb1ba0414482a99ccd6567b29512","site_id":"paris-catacombs","title":"Paris catacombs — Salle Z (portion)"},
 {"uid":"ca80de4ccfdd45d4a5b44dad31cb0da2","site_id":"paris-catacombs","title":"Paris catacombs — The Flag Room"},
 {"uid":"e78831639a3a4000b2130457badfc34b","site_id":"paris-catacombs","title":"Paris catacombs — Bureau du Centre"},
 {"uid":"befe33ccb4cf4005a6f26c83629a9be6","site_id":"paris-catacombs","title":"Paris catacombs — German bunker passage"},
 {"uid":"2bff1e25b797418caea81927f394fa9d","site_id":"vrlovka-cave","title":"Stalagnate within Vrlovka Cave — highest LOD"},
 {"uid":"fe5da7d5202a4bfaa6b48e0096d4c6fd","site_id":"om-jaettestue","title":"Øm Jættestue passage grave"}
]
ALLOWED_LICENSES={"by","cc-by","cc-by-4.0","cc-attribution"}
MAX_ARCHIVE_BYTES=250*1024*1024

def request_json(url, authorization):
    req=urllib.request.Request(url,headers={"Authorization":authorization,"Accept":"application/json"})
    with urllib.request.urlopen(req,timeout=45) as response:
        data=json.loads(response.read().decode("utf-8"))
    if not isinstance(data,dict):
        raise RuntimeError("Sketchfab returned a non-object API response")
    return data

def download_bytes(url,maximum):
    req=urllib.request.Request(url,headers={"User-Agent":"BridgePoint-Underground-Scan-Importer/2"})
    with urllib.request.urlopen(req,timeout=120) as response:
        length=response.headers.get("Content-Length")
        if length and int(length)>maximum:
            raise RuntimeError("Model archive exceeds configured size cap")
        data=response.read(maximum+1)
    if len(data)>maximum:
        raise RuntimeError("Model archive exceeded configured size cap")
    return data

def safe_extract(archive_bytes,destination):
    with tempfile.NamedTemporaryFile(suffix=".zip",delete=False) as temp:
        temp.write(archive_bytes)
        zip_path=Path(temp.name)
    try:
        with zipfile.ZipFile(zip_path) as archive:
            for item in archive.infolist():
                member=PurePosixPath(item.filename)
                if member.is_absolute() or ".." in member.parts:
                    raise RuntimeError("Sketchfab archive contains unsafe path")
                target=(destination/Path(*member.parts)).resolve()
                if destination.resolve() not in target.parents and target!=destination.resolve():
                    raise RuntimeError("Archive path escapes extraction directory")
            archive.extractall(destination)
    finally:
        zip_path.unlink(missing_ok=True)

def convert_to_glb(extracted,output):
    glbs=list(extracted.rglob("*.glb"))+list(extracted.rglob("*.GLB"))
    if glbs:
        shutil.copy2(glbs[0],output)
        return
    gltfs=list(extracted.rglob("*.gltf"))+list(extracted.rglob("*.GLTF"))
    if not gltfs:
        raise RuntimeError("Sketchfab archive contains neither GLB nor glTF scene")
    subprocess.run(["gltf-pipeline","-i",str(gltfs[0]),"-o",str(output)],check=True,timeout=180,cwd=gltfs[0].parent)

def fetch_one(model,authorization,output_dir):
    uid=model["uid"]
    metadata=request_json("https://api.sketchfab.com/v3/models/"+uid,authorization)
    if metadata.get("isDownloadable") is not True:
        raise RuntimeError(uid+" is not currently marked downloadable")
    license_slug=str(metadata.get("license") or "").lower()
    if license_slug not in ALLOWED_LICENSES:
        raise RuntimeError(uid+" has license outside CC BY allow-list: "+(license_slug or "unknown"))
    user=metadata.get("user") or {}
    creator=user.get("username") or user.get("displayName")
    if not creator:
        raise RuntimeError(uid+" has no verified creator metadata")
    info=request_json("https://api.sketchfab.com/v3/models/"+uid+"/download",authorization)
    archive=info.get("gltf")
    if not isinstance(archive,dict) or not archive.get("url"):
        raise RuntimeError(uid+" has no downloadable glTF archive")
    archive_bytes=download_bytes(str(archive["url"]),MAX_ARCHIVE_BYTES)
    with tempfile.TemporaryDirectory(prefix="bp-sketchfab-") as temp_name:
        temp=Path(temp_name)
        extracted=temp/"extracted"
        extracted.mkdir()
        safe_extract(archive_bytes,extracted)
        glb=temp/(uid+".glb")
        convert_to_glb(extracted,glb)
        if glb.stat().st_size<32 or glb.read_bytes()[:4]!=b"glTF":
            raise RuntimeError(uid+" did not convert to a valid GLB mesh")
        target=output_dir/(uid+".glb.gz")
        with glb.open("rb") as source,target.open("wb") as raw:
            with gzip.GzipFile(filename="",mode="wb",fileobj=raw,compresslevel=9,mtime=0) as packed:
                shutil.copyfileobj(source,packed)
    return {
        "uid":uid,"siteId":model["site_id"],
        "title":str(metadata.get("name") or model["title"]),
        "creator":creator,"license":license_slug,
        "sourceUrl":"https://sketchfab.com/3d-models/"+uid,
        "asset":"/assets/underground-scan-scenes/"+uid+".glb.gz",
        "bytes":target.stat().st_size,
        "sha256":hashlib.sha256(target.read_bytes()).hexdigest()
    }

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",required=True,type=Path)
    args=parser.parse_args()
    token=os.environ.get("SKETCHFAB_API_TOKEN","").strip()
    if not token:
        raise SystemExit("SKETCHFAB_API_TOKEN is required; no model files were downloaded or published.")
    authorization=token if token.startswith(("Token ","Bearer ")) else "Token "+token
    args.output.mkdir(parents=True,exist_ok=True)
    for old in args.output.glob("*.glb.gz"):
        old.unlink()
    manifest={"version":2,"source":"Sketchfab Download API","licensePolicy":"CC BY only","models":[]}
    for index,model in enumerate(MODELS,1):
        print(f"[{index}/{len(MODELS)}] Checking downloadable CC BY scan {model['uid']} …")
        manifest["models"].append(fetch_one(model,authorization,args.output))
    total_bytes=sum(m["bytes"] for m in manifest["models"])
    if total_bytes > 150*1024*1024:
        raise SystemExit(f"Compressed cave scans exceed the safe Pages headroom cap: {total_bytes:,} bytes (150 MiB)")
    (args.output/"catalog.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"
",encoding="utf-8")
    print("BRIDGEPOINT_UNDERGROUND_GLBS_READY",len(manifest["models"]),"models ·",total_bytes,"compressed bytes")

if __name__=="__main__":
    main()
