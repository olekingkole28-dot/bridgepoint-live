#!/usr/bin/env python3
"""Download openly licensed Paris Catacombs LiDAR scans from public Zenodo records.

No Sketchfab token, authenticated request, or third-party runtime viewer is used.
Each source record and CC BY 4.0 license is checked before its GLB is redistributed.
"""
from __future__ import annotations
import argparse, gzip, hashlib, json, urllib.request
from pathlib import Path

MAX_SOURCE_BYTES = 300 * 1024 * 1024
MAX_TOTAL_COMPRESSED_BYTES = 150 * 1024 * 1024
SCANS = [
    {
        "record_id": "10287234",
        "expected_title": "paris catacombs - large gallery",
        "uid": "39e7050d272f4aac8493497621b86f39",
        "file_key": "39e7050d272f4aac8493497621b86f39.glb",
        "title": "Paris Catacombs — Large Gallery",
        "creator": "Emm (@edemaistre)",
        "license": "CC BY 4.0",
        "capture_method": "iPhone 12 Pro · Scaniverse LiDAR",
        "geometry_type": "LiDAR mesh",
        "published_vertices": 338500,
        "published_triangles": 668900,
        "source_url": "https://sketchfab.com/3d-models/paris-catacombs-large-gallery-39e7050d272f4aac8493497621b86f39",
        "dataset_url": "https://doi.org/10.5281/zenodo.10287234",
        "detail": "A scanned underground gallery section from the Paris Catacombs.",
    },
    {
        "record_id": "10232541",
        "expected_title": "paris catacombs - le bar des rats",
        "uid": "f4232f8f91e54b0a8aa92365d6ea7b7a",
        "file_key": "e565c4cfe1724b86a8b9373c3e5778cf.glb",
        "title": "Paris Catacombs — Le Bar des Rats",
        "creator": "Emm (@edemaistre)",
        "license": "CC BY 4.0",
        "capture_method": "iPhone 12 Pro · Scaniverse LiDAR point cloud",
        "geometry_type": "Dense LiDAR point cloud",
        "published_vertices": 9100000,
        "published_triangles": 0,
        "source_url": "https://sketchfab.com/3d-models/paris-catacombs-the-bar-of-the-rats-sitescape-f4232f8f91e54b0a8aa92365d6ea7b7a",
        "dataset_url": "https://doi.org/10.5281/zenodo.10232541",
        "detail": "A multi-chamber area called Le Bar des Rats in the northwestern part of the Catacombs network. The source creator describes this as an iPhone 12 Pro / Scaniverse scan with roughly 9.1 million point vertices.",
    },
]


def get_json(url: str) -> dict:
    req = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "BridgePoint-3D-Underground/4.0"},
    )
    with urllib.request.urlopen(req, timeout=45) as response:
        value = json.loads(response.read().decode("utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError("Zenodo returned invalid record metadata")
    return value


def download(url: str) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": "BridgePoint-3D-Underground/4.0"})
    with urllib.request.urlopen(req, timeout=180) as response:
        length = response.headers.get("Content-Length")
        if length and int(length) > MAX_SOURCE_BYTES:
            raise RuntimeError("Catacomb scan exceeds the configured source-size limit")
        raw = response.read(MAX_SOURCE_BYTES + 1)
    if len(raw) > MAX_SOURCE_BYTES:
        raise RuntimeError("Catacomb scan exceeded the configured source-size limit")
    return raw


def materialize_scan(scan: dict, output: Path) -> dict:
    record = get_json("https://zenodo.org/api/records/" + scan["record_id"])
    meta = record.get("metadata") or {}
    title = str(meta.get("title") or "").strip().lower()
    if title != scan["expected_title"]:
        raise SystemExit(f"Zenodo record title mismatch for {scan['record_id']}: {title!r}")
    license_data = meta.get("license") or {}
    license_id = license_data.get("id") if isinstance(license_data, dict) else str(license_data)
    if str(license_id).lower() not in {"cc-by-4.0", "cc-by"}:
        raise SystemExit(f"Record {scan['record_id']} is not CC BY 4.0; refusing redistribution")
    files = record.get("files") or []
    chosen = next((item for item in files if str(item.get("key", "")) == scan["file_key"]), None)
    if not chosen:
        raise SystemExit(f"Expected GLB {scan['file_key']} not present in Zenodo record {scan['record_id']}")
    links = chosen.get("links") or {}
    url = links.get("content") or links.get("download") or links.get("self")
    if not url:
        raise SystemExit(f"Zenodo GLB file has no public content link: {scan['record_id']}")
    raw = download(url)
    if len(raw) < 32 or raw[:4] != b"glTF":
        raise SystemExit(f"Record {scan['record_id']} did not provide a valid binary glTF")
    checksum = str(chosen.get("checksum") or "")
    if checksum.lower().startswith("md5:"):
        actual = hashlib.md5(raw).hexdigest()
        if actual.lower() != checksum.split(":", 1)[1].lower():
            raise SystemExit(f"Zenodo checksum mismatch for {scan['file_key']}")
    target = output / (scan["uid"] + ".glb.gz")
    with target.open("wb") as handle:
        with gzip.GzipFile(filename="", mode="wb", fileobj=handle, compresslevel=9, mtime=0) as packed:
            packed.write(raw)
    if target.stat().st_size > MAX_TOTAL_COMPRESSED_BYTES:
        target.unlink(missing_ok=True)
        raise SystemExit(f"Compressed scan exceeds size limit: {scan['title']}")
    row = {
        "uid": scan["uid"],
        "title": scan["title"],
        "creator": scan["creator"],
        "license": scan["license"],
        "captureMethod": scan["capture_method"],
        "geometryType": scan["geometry_type"],
        "publishedVertices": scan["published_vertices"],
        "publishedTriangles": scan["published_triangles"],
        "detail": scan["detail"],
        "sourceUrl": scan["source_url"],
        "datasetUrl": scan["dataset_url"],
        "asset": "/assets/underground-scan-scenes/" + target.name,
        "sourceBytes": len(raw),
        "compressedBytes": target.stat().st_size,
        "sha256": hashlib.sha256(target.read_bytes()).hexdigest(),
    }
    print("BRIDGEPOINT_UNDERGROUND_SCAN_READY", scan["title"], len(raw), "source bytes", target.stat().st_size, "compressed bytes")
    return row


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    args.output.mkdir(parents=True, exist_ok=True)
    models = [materialize_scan(scan, args.output) for scan in SCANS]
    total = sum(int(model["compressedBytes"]) for model in models)
    if total > MAX_TOTAL_COMPRESSED_BYTES:
        raise SystemExit("Combined underground GLBs exceed the configured size limit")
    manifest = {
        "version": 4,
        "site": "Paris Catacombs, Paris, France",
        "locationPrecision": "Regional anchor only; the published scan records do not contain survey-grade chamber coordinates or georeferenced scan origins.",
        "source": "Public Zenodo records with original Sketchfab creator attribution",
        "models": models,
    }
    (args.output / "catalog.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print("BRIDGEPOINT_3D_UNDERGROUND_CATALOG_READY", len(models), "scans", total, "compressed bytes")


if __name__ == "__main__":
    main()
