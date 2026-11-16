#!/usr/bin/env python3
"""Materialize the single Paris Catacombs LiDAR GLB from its public Zenodo record.

The Zenodo record is checked for its title and CC BY 4.0 license before the GLB is downloaded.
No Sketchfab account token or runtime third-party viewer is used.
"""
from __future__ import annotations
import argparse, gzip, hashlib, json, urllib.request
from pathlib import Path
RECORD_ID = "10287234"
MODEL_UID = "39e7050d272f4aac8493497621b86f39"
SOURCE_URL = "https://sketchfab.com/3d-models/paris-catacombs-large-gallery-39e7050d272f4aac8493497621b86f39"
DATASET_URL = "https://doi.org/10.5281/zenodo.10287234"
MAX_SOURCE_BYTES = 300 * 1024 * 1024

def get_json(url):
    req=urllib.request.Request(url,headers={"Accept":"application/json","User-Agent":"BridgePoint-Paris-Catacombs/3.0"})
    with urllib.request.urlopen(req,timeout=45) as response:
        value=json.loads(response.read().decode("utf-8"))
    if not isinstance(value,dict):
        raise RuntimeError("Zenodo returned invalid record metadata")
    return value

def download(url):
    req=urllib.request.Request(url,headers={"User-Agent":"BridgePoint-Paris-Catacombs/3.0"})
    with urllib.request.urlopen(req,timeout=180) as response:
        length=response.headers.get("Content-Length")
        if length and int(length)>MAX_SOURCE_BYTES:
            raise RuntimeError("Catacomb scan exceeds the configured source-size limit")
        raw=response.read(MAX_SOURCE_BYTES+1)
    if len(raw)>MAX_SOURCE_BYTES:
        raise RuntimeError("Catacomb scan exceeded the configured source-size limit")
    return raw

def main():
    parser=argparse.ArgumentParser()
    parser.add_argument("--output",required=True,type=Path)
    args=parser.parse_args()
    record=get_json("https://zenodo.org/api/records/"+RECORD_ID)
    meta=record.get("metadata") or {}
    title=str(meta.get("title") or "").lower()
    if "paris catacombs" not in title or "large gallery" not in title:
        raise SystemExit("Zenodo record title did not match the Paris Catacombs Large Gallery scan")
    license_data=meta.get("license") or {}
    license_id=license_data.get("id") if isinstance(license_data,dict) else str(license_data)
    if str(license_id).lower() not in {"cc-by-4.0","cc-by"}:
        raise SystemExit("Paris Catacombs record is not CC BY 4.0; refusing to redistribute")
    files=record.get("files") or []
    glbs=[f for f in files if str(f.get("key","")).lower().endswith(".glb")]
    if not glbs:
        raise SystemExit("Zenodo record does not contain a downloadable GLB mesh")
    exact=[f for f in glbs if MODEL_UID in str(f.get("key",""))]
    chosen=exact[0] if exact else (glbs[0] if len(glbs)==1 else None)
    if chosen is None:
        raise SystemExit("Zenodo record contains multiple GLBs and none has the expected scan identifier")
    links=chosen.get("links") or {}
    url=links.get("content") or links.get("download") or links.get("self")
    if not url:
        raise SystemExit("Zenodo GLB file has no public content link")
    raw=download(url)
    if len(raw)<32 or raw[:4]!=b"glTF":
        raise SystemExit("Downloaded Paris Catacombs file is not a valid binary glTF (GLB)")
    args.output.mkdir(parents=True,exist_ok=True)
    target=args.output/(MODEL_UID+".glb.gz")
    with target.open("wb") as handle:
        with gzip.GzipFile(filename="",mode="wb",fileobj=handle,compresslevel=9,mtime=0) as packed:
            packed.write(raw)
    if target.stat().st_size>150*1024*1024:
        target.unlink(missing_ok=True)
        raise SystemExit("Compressed Paris Catacombs asset exceeds the safe Pages headroom cap")
    manifest={
      "version":3,"site":"Paris Catacombs, Paris, France",
      "source":"Zenodo record 10287234 / Sketchfab model",
      "creator":"Emm (@edemaistre)","license":"CC BY 4.0",
      "licenseRecord":"https://datasetcatalog.nlm.nih.gov/dataset?q=0001904517",
      "sourceUrl":SOURCE_URL,"datasetUrl":DATASET_URL,
      "locationPrecision":"Approximate site-region anchor; source scan is not georeferenced to a surveyed chamber.",
      "models":[{
        "uid":MODEL_UID,"title":"Paris Catacombs — Large Gallery",
        "creator":"Emm (@edemaistre)","license":"CC BY 4.0",
        "captureMethod":"iPhone 12 Pro · Scaniverse LiDAR",
        "sourceUrl":SOURCE_URL,"datasetUrl":DATASET_URL,
        "asset":"/assets/underground-scan-scenes/"+target.name,
        "sourceBytes":len(raw),"compressedBytes":target.stat().st_size,
        "sha256":hashlib.sha256(target.read_bytes()).hexdigest()
      }]
    }
    (args.output/"catalog.json").write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
    print("BRIDGEPOINT_PARIS_CATACOMBS_GLB_READY",len(raw),"source bytes",target.stat().st_size,"compressed bytes")
if __name__=="__main__":
    main()
