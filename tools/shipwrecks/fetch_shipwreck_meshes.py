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
            "waterSurfaceElevationM": 74.64,
            "verticalDatum": "IGLD 1985",
            "waterSurfaceReferenceDate": "2026-11-16",
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


def materialize_grafton(output: Path) -> dict:
    """Download and validate the DTU Aqua Grafton underwater reconstruction."""
    record = fetch_json("https://zenodo.org/api/records/19592377")
    meta = record.get("metadata") or {}
    if meta.get("title") != "Benthic 3D Models and Tiles":
        raise SystemExit("Grafton Zenodo record title changed; refusing to mirror")
    creator_text = " ".join(str(item.get("name", "")) for item in (meta.get("creators") or [])).lower()
    if "dtu aqua" not in creator_text or "mariani" not in creator_text or "fernandez" not in creator_text:
        raise SystemExit("Grafton creator attribution mismatch; refusing to mirror")
    # The NLM Dataset Catalog indexes this DOI as CC BY 4.0. If Zenodo later
    # publishes an explicit conflicting license, fail closed.
    license_data = meta.get("license") or {}
    license_id = license_data.get("id") if isinstance(license_data, dict) else str(license_data)
    if license_id and str(license_id).lower() not in {"cc-by-4.0", "ccby4.0"}:
        raise SystemExit("Grafton Zenodo record now declares a conflicting license")
    selected = next((item for item in (record.get("files") or []) if Path(str(item.get("key", ""))).name == "Grafton.glb"), None)
    if not selected:
        raise SystemExit("Expected Grafton.glb is missing from the Zenodo record")
    expected_md5 = "ed8cf639950ab31290daffce25401b1a"
    if str(selected.get("checksum") or "").lower() != "md5:" + expected_md5:
        raise SystemExit("Grafton source checksum metadata changed; refusing to mirror")
    url = (selected.get("links") or {}).get("self")
    if not url:
        raise SystemExit("Grafton record has no public GLB download URL")
    raw = fetch_bytes(url)
    if len(raw) < 32 or raw[:4] != b"glTF":
        raise SystemExit("Grafton file is not a valid binary glTF")
    actual_md5 = hashlib.md5(raw).hexdigest()
    if actual_md5 != expected_md5:
        raise SystemExit("Grafton GLB MD5 check failed")
    output.mkdir(parents=True, exist_ok=True)
    target = output / "hms-grafton-photogrammetry.glb.gz"
    with target.open("wb") as handle:
        with gzip.GzipFile(filename="", mode="wb", fileobj=handle, compresslevel=9, mtime=0) as packed:
            packed.write(raw)
    if target.stat().st_size > MAX_COMPRESSED_BYTES:
        target.unlink(missing_ok=True)
        raise SystemExit("Compressed Grafton GLB exceeds size limit")
    model = {
        "id": "hms-grafton-photogrammetry",
        "title": "HMS Grafton — underwater photogrammetry model",
        "creators": ["DTU Aqua, National Institute of Aquatic Resources, Technical University of Denmark", "Patrizio Mariani", "Fletcher Thompson", "Javier Alonso Fernández"],
        "license": "CC BY 4.0",
        "licenseSourceUrl": "https://datasetcatalog.nlm.nih.gov/dataset?q=0000776569",
        "sourceUrl": "https://zenodo.org/records/19592377",
        "datasetUrl": "https://doi.org/10.5281/zenodo.19592377",
        "assetUrl": "/assets/shipwrecks/hms-grafton-photogrammetry.glb.gz",
        "viewerUrl": "https://obstek.aqua.dtu.dk/demos/viewer/Grafton",
        "coordinates": [2.818383333333, 51.4071],
        "coordinateText": "51° 24.4260′ N, 2° 49.1030′ E",
        "scanDepthM": 19,
        "capturedAt": "2025-05-19",
        "locationSourceUrl": "https://publicaties.vlaanderen.be/view-file/83815",
        "historySourceUrl": "https://www.uboat.net/allies/warships/ship/4395.html",
        "sourceBytes": len(raw), "compressedBytes": target.stat().st_size,
        "sourceMd5": actual_md5, "assetSha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "locationPrecision": "The individual model has no published GPS origin or per-model geodetic transform; the BridgePoint map placement is approximate at the official wreck-site coordinate.",
        "verticalPrecision": "The dataset describes approximately 19 m capture depth. The model center is placed 19 m below the water surface for visualization; this is not a survey-controlled seabed elevation."
    }
    catalog_path = output / "catalog.json"
    manifest = json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.exists() else {"version": 1}
    manifest["grafton"] = model
    catalog_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("BRIDGEPOINT_HMS_GRAFTON_CC_BY_GLB_READY", len(raw), "source bytes", target.stat().st_size, "compressed bytes")
    return model



def materialize_cannon(output: Path) -> dict:
    """Download and checksum-check the DTU Aqua Cannon Shipwreck photogrammetry GLB."""
    record = fetch_json("https://zenodo.org/api/records/19592377")
    meta = record.get("metadata") or {}
    if meta.get("title") != "Benthic 3D Models and Tiles":
        raise SystemExit("Cannon Shipwreck Zenodo record title changed; refusing to mirror")
    creator_text = " ".join(str(item.get("name", "")) for item in (meta.get("creators") or [])).lower()
    if "dtu aqua" not in creator_text or "mariani" not in creator_text or "thompson" not in creator_text or "fernandez" not in creator_text:
        raise SystemExit("Cannon Shipwreck creator attribution mismatch; refusing to mirror")
    # NLM Dataset Catalog indexes this Zenodo DOI as CC BY 4.0. Fail closed
    # if Zenodo later publishes an explicit conflicting licence.
    license_data = meta.get("license") or {}
    license_id = license_data.get("id") if isinstance(license_data, dict) else str(license_data)
    if license_id and str(license_id).lower() not in {"cc-by-4.0", "ccby4.0"}:
        raise SystemExit("Cannon Shipwreck Zenodo record now declares a conflicting licence")
    expected_file = "Cannon.glb"
    expected_md5 = "83258bde7da60610bf534fff13162fca"
    selected = next((item for item in (record.get("files") or []) if Path(str(item.get("key", ""))).name == expected_file), None)
    if not selected:
        raise SystemExit("Expected Cannon.glb is missing from the Zenodo record")
    if str(selected.get("checksum") or "").lower() != "md5:" + expected_md5:
        raise SystemExit("Cannon Shipwreck source checksum metadata changed; refusing to mirror")
    url = (selected.get("links") or {}).get("self")
    if not url:
        raise SystemExit("Cannon Shipwreck record has no public GLB download URL")
    raw = fetch_bytes(url)
    if len(raw) < 32 or raw[:4] != b"glTF":
        raise SystemExit("Cannon Shipwreck file is not a valid binary glTF")
    actual_md5 = hashlib.md5(raw).hexdigest()
    if actual_md5 != expected_md5:
        raise SystemExit("Cannon Shipwreck GLB MD5 check failed")

    output.mkdir(parents=True, exist_ok=True)
    target = output / "cannon-photogrammetry.glb.gz"
    with target.open("wb") as handle:
        with gzip.GzipFile(filename="", mode="wb", fileobj=handle, compresslevel=9, mtime=0) as packed:
            packed.write(raw)
    if target.stat().st_size > MAX_COMPRESSED_BYTES:
        target.unlink(missing_ok=True)
        raise SystemExit("Compressed Cannon Shipwreck GLB exceeds size limit")
    model = {
        "id": "kanonvraget-cannon-photogrammetry",
        "title": "Kanonvraget — Cannon Shipwreck underwater photogrammetry scan",
        "creators": [
            "DTU Aqua, National Institute of Aquatic Resources, Technical University of Denmark",
            "Patrizio Mariani", "Fletcher Thompson", "Javier Alonso Fernández"
        ],
        "license": "CC BY 4.0",
        "licenseSourceUrl": "https://datasetcatalog.nlm.nih.gov/dataset?q=0000776569",
        "sourceUrl": "https://zenodo.org/records/19592377",
        "datasetUrl": "https://doi.org/10.5281/zenodo.19592377",
        "assetUrl": "/assets/shipwrecks/cannon-photogrammetry.glb.gz",
        "viewerUrl": "https://obstek.aqua.dtu.dk/demos/viewer/cannon",
        "coordinates": [12.8688, 55.6448],
        "coordinateText": "55.6448° N, 12.8688° E",
        "location": "East of Saltholm, Øresund, Denmark",
        "locationSourceUrl": "https://www.vragguiden.dk/vrag/4643",
        "coordinateSourceUrl": "https://www.vragguiden.dk/api/WreckPdf/4643",
        "depthRangeM": [14, 16],
        "displayDepthM": 15,
        "captureDepthM": 11,
        "capturedAt": "2025-06-12",
        "estimatedLengthM": 48,
        "cannonCount": 16,
        "cannonWeightPounds": [12, 14],
        "sourceBytes": len(raw),
        "compressedBytes": target.stat().st_size,
        "sourceMd5": actual_md5,
        "assetSha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "locationPrecision": "Verified WGS84 wreck-site position in the Danish wreck database. The source GLB itself does not publish a GPS origin or survey-control transform.",
        "scalePrecision": "Original source scale preserved. Approximately 48 m vessel length is a historical estimate, not a scale-control certificate.",
        "depthNote": "Danish wreck record gives 14–16 m top-to-bottom wreck depth; DTU scan record describes its capture at approximately 11 m. These are separate published measurements."
    }
    catalog_path = output / "catalog.json"
    manifest = json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.exists() else {"version": 1}
    manifest["cannon"] = model
    catalog_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("BRIDGEPOINT_KANONVRAGET_CANNON_CC_BY_GLB_READY", len(raw), "source bytes", target.stat().st_size, "compressed bytes")
    return model


def materialize_kxi(output: Path) -> dict:
    """Mirror the WreckSploration K XI GLB after a pinned Git object/hash check."""
    commit = "51c255e21c0709b46f4f1fe24d9de05bdd62822c"
    expected_size = 40440892
    expected_blob_sha = "39d1fabe4eb713340e689316044d230214e730ed"
    url = (
        "https://raw.githubusercontent.com/patrick-morrison/below-wrecksploration/"
        + commit + "/models/13%20HNLMSKXI.glb"
    )
    raw = fetch_bytes(url)
    if len(raw) != expected_size:
        raise SystemExit("HNLMS K XI GLB size changed; refusing to mirror")
    if len(raw) < 32 or raw[:4] != b"glTF":
        raise SystemExit("HNLMS K XI file is not a valid binary glTF")
    git_blob_sha = hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()
    if git_blob_sha != expected_blob_sha:
        raise SystemExit("HNLMS K XI source Git blob SHA changed; refusing to mirror")

    output.mkdir(parents=True, exist_ok=True)
    target = output / "hnlms-kxi-photogrammetry.glb.gz"
    with target.open("wb") as handle:
        with gzip.GzipFile(filename="", mode="wb", fileobj=handle, compresslevel=9, mtime=0) as packed:
            packed.write(raw)
    if target.stat().st_size > MAX_COMPRESSED_BYTES:
        target.unlink(missing_ok=True)
        raise SystemExit("Compressed HNLMS K XI GLB exceeds size limit")
    model = {
        "id": "hnlms-kxi-photogrammetry",
        "title": "HNLMS K XI — full-length underwater photogrammetry scan",
        "creator": "Western Australian Museum",
        "creators": ["Western Australian Museum", "WreckSploration: Andrew Oakeley, David Jackson and Patrick Morrison"],
        "license": "CC BY 4.0",
        "licenseSourceUrl": "https://creativecommons.org/licenses/by/4.0/",
        "sourceUrl": "https://sketchfab.com/3d-models/kxi-submarine-rottnest-deepwater-graveyard-7899b257a0274c93becf69676482531f",
        "datasetUrl": "https://museum.wa.gov.au/maritime-archaeology-db/maritime-reports/dutch-k-xi-submarine-1925-1946-discovered-wadjemup-rottnest-island-perth",
        "locationSourceUrl": "https://wrecksploration.au/projects/kxi/",
        "repositoryUrl": "https://github.com/patrick-morrison/below-wrecksploration/tree/" + commit + "/models",
        "sourceCommit": commit,
        "sourceGitBlobSha": git_blob_sha,
        "assetUrl": "/assets/shipwrecks/hnlms-kxi-photogrammetry.glb.gz",
        "coordinates": [115.499470, -32.150390],
        "coordinateText": "32° 09.0234′ S, 115° 29.9682′ E",
        "depthRangeM": [38, 40],
        "displayDepthM": 40,
        "lengthM": 66.63,
        "lengthUncertaintyM": 0.22,
        "sourcePhotos": 6733,
        "capturedAt": "2025-01-11",
        "discoveredAt": "2025-01-01",
        "decommissionedYear": 1946,
        "scuttledYear": 1949,
        "sourceBytes": len(raw),
        "compressedBytes": target.stat().st_size,
        "sourceMd5": hashlib.md5(raw).hexdigest(),
        "assetSha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "locationPrecision": "Published WGS84 wreck-site coordinate; source mesh does not include a verified GPS origin.",
        "scalePrecision": "Long axis calibrated to the published photogrammetry measurement of 66.63 ± 0.22 m.",
        "orientationPrecision": "Original GLB orientation preserved; a survey-grade true-north heading is not published."
    }
    catalog_path = output / "catalog.json"
    manifest = json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.exists() else {"version": 1}
    manifest["kxi"] = model
    catalog_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("BRIDGEPOINT_HNLMS_KXI_CC_BY_GLB_READY", len(raw), "source bytes", target.stat().st_size, "compressed bytes")
    return model



def materialize_cape_otway(output: Path) -> dict:
    """Mirror WreckSploration's openly licensed SS Cape Otway photogrammetry GLB.

    The upstream file is pinned to an immutable repository commit and Git blob
    SHA so the public mirror cannot silently switch to a different model.
    """
    commit = "51c255e21c0709b46f4f1fe24d9de05bdd62822c"
    expected_size = 32058028
    expected_blob_sha = "eee4d55e7391e55ea0bd8bc0c8aaf82e04f800b1"
    url = (
        "https://raw.githubusercontent.com/patrick-morrison/below-wrecksploration/"
        + commit + "/models/02%20Otway.glb"
    )
    raw = fetch_bytes(url)
    if len(raw) != expected_size:
        raise SystemExit("SS Cape Otway GLB size changed; refusing to mirror")
    if len(raw) < 32 or raw[:4] != b"glTF":
        raise SystemExit("SS Cape Otway file is not a valid binary glTF")
    git_blob_sha = hashlib.sha1(
        b"blob " + str(len(raw)).encode("ascii") + b"\0" + raw
    ).hexdigest()
    if git_blob_sha != expected_blob_sha:
        raise SystemExit("SS Cape Otway source Git blob SHA changed; refusing to mirror")

    output.mkdir(parents=True, exist_ok=True)
    target = output / "cape-otway-photogrammetry.glb.gz"
    with target.open("wb") as handle:
        with gzip.GzipFile(filename="", mode="wb", fileobj=handle, compresslevel=9, mtime=0) as packed:
            packed.write(raw)
    if target.stat().st_size > MAX_COMPRESSED_BYTES:
        target.unlink(missing_ok=True)
        raise SystemExit("Compressed SS Cape Otway GLB exceeds size limit")

    model = {
        "id": "cape-otway-photogrammetry",
        "title": "SS Cape Otway — underwater photogrammetry scan",
        "creator": "WreckSploration",
        "creators": [
            "WreckSploration",
            "Andrew Oakeley",
            "David Jackson",
            "Patrick Morrison"
        ],
        "license": "CC BY 4.0",
        "licenseSourceUrl": "https://creativecommons.org/licenses/by/4.0/",
        "sourceUrl": "https://sketchfab.com/3d-models/cape-otway-d5520c55462148f58b16a176f97d50cf",
        "datasetUrl": "https://wrecksploration.au/projects/capeotway/",
        "locationSourceUrl": "https://museum.wa.gov.au/maritime-archaeology-db/wrecks/id-682",
        "repositoryUrl": "https://github.com/patrick-morrison/below-wrecksploration/tree/" + commit + "/models/02%20Otway.glb",
        "sourceCommit": commit,
        "sourceGitBlobSha": git_blob_sha,
        "assetUrl": "/assets/shipwrecks/cape-otway-photogrammetry.glb.gz",
        "coordinates": [115.372533, -32.059833],
        "coordinateText": "32.059833° S, 115.372533° E",
        "displayDepthM": 87,
        "lengthM": 60.10,
        "beamM": 10.40,
        "draftM": 4.60,
        "triangles": 200000,
        "vertices": 100600,
        "capturedAt": "2023-01-20",
        "scuttledDate": "1968-09-07",
        "sourceBytes": len(raw),
        "compressedBytes": target.stat().st_size,
        "sourceMd5": hashlib.md5(raw).hexdigest(),
        "assetSha256": hashlib.sha256(target.read_bytes()).hexdigest(),
        "locationPrecision": "WGS84 wreck-site position published by the Western Australian Museum. The source GLB does not publish a geodetic origin or survey-control transform.",
        "scalePrecision": "Calibrated to the Museum's published 60.10 m vessel length for visualization; not a survey-control scale certificate.",
        "orientationPrecision": "WreckSploration records the bow facing north. The individual source GLB does not publish a GPS transform or survey-grade heading.",
        "depthPrecision": "The wreck-site depth is approximately 87 m. BridgePoint centers the model 87 m below the water surface for visualization; this is not a survey-controlled bathymetric registration."
    }
    catalog_path = output / "catalog.json"
    manifest = json.loads(catalog_path.read_text(encoding="utf-8")) if catalog_path.exists() else {"version": 1}
    manifest["capeOtway"] = model
    catalog_path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print("BRIDGEPOINT_SS_CAPE_OTWAY_CC_BY_ASSET_PASS", len(raw), "source bytes", target.stat().st_size, "compressed bytes")
    return model


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    materialize(args.output)
    materialize_grafton(args.output)
    materialize_cannon(args.output)
    materialize_kxi(args.output)
    materialize_cape_otway(args.output)


if __name__ == "__main__":
    main()
