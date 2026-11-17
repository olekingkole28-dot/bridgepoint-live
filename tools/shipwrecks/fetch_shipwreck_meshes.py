#!/usr/bin/env python3
"""Fetch the openly licensed Robert Gaskin shipwreck photogrammetry GLB.

The Zenodo record is checked for the expected title, creator, CC BY 4.0 licence,
file name and MD5 before the scan is mirrored into BridgePoint.
"""
from __future__ import annotations
import argparse
import gzip
import hashlib
import json
import urllib.request
from pathlib import Path

RECORD_ID = "10288556"
EXPECTED_TITLE = "Robert Gaskin Wreck"
EXPECTED_FILE = "1916420a764c4e73b754755d7f2780ce.glb"
EXPECTED_MD5 = "cc6efdbaee28f622e7799089be99e099"
MAX_SOURCE_BYTES = 100 * 1024 * 1024
MAX_COMPRESSED_BYTES = 120 * 1024 * 1024


def fetch_json(url: str) -> dict:
    request = urllib.request.Request(url, headers={
        "Accept": "application/json",
        "User-Agent": "BridgePoint-Shipwrecks/2.0",
    })
    with urllib.request.urlopen(request, timeout=45) as response:
        value = json.loads(response.read().decode("utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError("Zenodo returned invalid record metadata")
    return value


def fetch_bytes(url: str) -> bytes:
    request = urllib.request.Request(url, headers={
        "User-Agent": "BridgePoint-Shipwrecks/2.0",
    })
    with urllib.request.urlopen(request, timeout=240) as response:
        length = response.headers.get("Content-Length")
        if length and int(length) > MAX_SOURCE_BYTES:
            raise SystemExit("Robert Gaskin GLB exceeds source-size limit")
        payload = response.read(MAX_SOURCE_BYTES + 1)
    if len(payload) > MAX_SOURCE_BYTES:
        raise SystemExit("Robert Gaskin GLB exceeds source-size limit")
    return payload


def materialize(output: Path) -> dict:
    record = fetch_json("https://zenodo.org/api/records/" + RECORD_ID)
    meta = record.get("metadata") or {}
    if meta.get("title") != EXPECTED_TITLE:
        raise SystemExit("Zenodo record title changed; refusing to mirror")
    creators = meta.get("creators") or []
    creator_names = {str(item.get("name", "")).lower() for item in creators}
    if "christian.remillard" not in creator_names:
        raise SystemExit("Zenodo creator attribution mismatch; refusing to mirror")
    license_data = meta.get("license") or {}
    license_id = license_data.get("id") if isinstance(license_data, dict) else str(license_data)
    if str(license_id).lower() != "cc-by-4.0":
        raise SystemExit("Robert Gaskin record is no longer CC BY 4.0; refusing to mirror")
    selected = next(
        (item for item in (record.get("files") or []) if item.get("key") == EXPECTED_FILE),
        None,
    )
    if not selected:
        raise SystemExit("Expected Robert Gaskin GLB is missing from the Zenodo record")
    checksum = str(selected.get("checksum") or "")
    if checksum.lower() != "md5:" + EXPECTED_MD5:
        raise SystemExit("Zenodo checksum metadata changed; refusing to mirror")
    url = (selected.get("links") or {}).get("self")
    if not url:
        raise SystemExit("Zenodo record has no public GLB download URL")

    raw = fetch_bytes(url)
    if len(raw) < 32 or raw[:4] != b"glTF":
        raise SystemExit("Zenodo file is not a valid binary glTF")
    actual_md5 = hashlib.md5(raw).hexdigest()
    if actual_md5 != EXPECTED_MD5:
        raise SystemExit("Robert Gaskin GLB MD5 check failed")

    output.mkdir(parents=True, exist_ok=True)
    target = output / "robert-gaskin-photogrammetry.glb.gz"
    with target.open("wb") as handle:
        with gzip.GzipFile(filename="", mode="wb", fileobj=handle, compresslevel=9, mtime=0) as packed:
            packed.write(raw)
    if target.stat().st_size > MAX_COMPRESSED_BYTES:
        target.unlink(missing_ok=True)
        raise SystemExit("Compressed Robert Gaskin mesh exceeds size limit")

    manifest = {
        "version": 1,
        "site": "Robert Gaskin wreck, St. Lawrence River near Brockville, Ontario, Canada",
        "model": {
            "id": "robert-gaskin-photogrammetry",
            "title": "Robert Gaskin — underwater photogrammetry scan",
            "creator": "Christian Rémillard",
            "license": "CC BY 4.0",
            "sourceUrl": "https://sketchfab.com/3d-models/robert-gaskin-wreck-1916420a764c4e73b754755d7f2780ce",
            "datasetUrl": "https://doi.org/10.5281/zenodo.10288556",
            "locationSourceUrl": "https://www.shipwreckworld.com/maps/robert-gaskin-barque-st-lawrence-river-shipwreck",
            "historySourceUrl": "https://www.hmdb.org/m.asp?m=141820",
            "assetUrl": "/assets/shipwrecks/robert-gaskin-photogrammetry.glb.gz",
            "coordinates": [-75.677083, 44.589317],
            "depthRangeM": [18.3, 21.3],
            "displayDepthM": 19.8,
            "lengthM": 40.42,
            "beamM": 8.02,
            "sourcePhotos": 49000,
            "triangles": 598600,
            "vertices": 322800,
            "sourceBytes": len(raw),
            "compressedBytes": target.stat().st_size,
            "sourceMd5": actual_md5,
            "assetSha256": hashlib.sha256(target.read_bytes()).hexdigest(),
            "locationPrecision": "Approximate wreck-site center; public dive references place the bow at about 18.3 m and stern at about 21.3 m. The GLB scan origin itself is not GPS-georeferenced.",
            "scalePrecision": "Calibrated to published historical length (132.6 ft) for visualization; not a survey-control scale certificate.",
            "orientationPrecision": "Approximate axis aligned with the reported bow-facing-inland description; not a survey-grade heading."
        }
    }
    (output / "catalog.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("BRIDGEPOINT_ROBERT_GASKIN_CC_BY_GLB_READY", len(raw), "source bytes", target.stat().st_size, "compressed bytes")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    materialize(args.output)


if __name__ == "__main__":
    main()
