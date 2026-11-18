#!/usr/bin/env python3
"""Download, licence-check and gzip the two additional BridgePoint aircraft photogrammetry meshes."""
from __future__ import annotations
import argparse, gzip, hashlib, json, os, struct, urllib.parse, urllib.request
from pathlib import Path

MODELS = [
    {
        "id": "b29-over-exposed-bleaklow",
        "record_id": "10318135",
        "record_title": "B-29 Over Exposed Fuselage",
        "file_key": "413af6535d214ff0bb3543114b7dd21a.glb",
        "file_md5": "607955bc56c6fdac7494bc5cab6d58ff",
        "output": "b29-over-exposed-bleaklow.glb.gz",
        "name": "Boeing RB-29A Superfortress “Over Exposed”",
        "aircraft": "Boeing RB-29A Superfortress",
        "location": "Higher Shelf Stones, Bleaklow, Peak District, England, United Kingdom",
        "coordinates": [-1.86542, 53.45091],
        "lost_date": "3 November 1948",
        "creator": "gentlegiantJGC",
        "photos": None,
        "representation": "Photogrammetry scan of surviving fuselage remains from the Bleaklow crash site; not a complete intact aircraft.",
        "source_url": "https://zenodo.org/records/10318135",
        "history_url": "https://www.peakdistrict.gov.uk/visiting/places-to-visit/bleaklow",
    },
    {
        "id": "mitsubishi-zero-a6m3-iwm-london",
        "record_id": "10264214",
        "record_title": "Zero Fighter Wreckage",
        "file_key": "5d169fd080d64552ae66ffee76daf675.glb",
        "file_md5": "d90fd77998c5a1587be92917dfde4b19",
        "output": "zero-fighter-a6m3-iwm-london.glb.gz",
        "name": "Mitsubishi A6M3 Zero Fighter Wreckage",
        "aircraft": "Mitsubishi A6M3 Zero",
        "location": "Imperial War Museum London, Lambeth Road, London SE1 6HZ, United Kingdom",
        "coordinates": [-0.108328, 51.496009],
        "lost_date": "Aircraft dated 1943; wreckage now held at IWM London",
        "creator": "artfletch",
        "photos": 148,
        "representation": "RealityCapture photogrammetry scan of museum-held Mitsubishi Zero wreckage, captured from 148 photographs in September 2020.",
        "source_url": "https://zenodo.org/records/10264214",
        "history_url": "https://www.iwm.org.uk/collections/item/object/70000201",
    },
    {
        "id": "short-sunderland-ej138-munkholmen",
        "record_id": "10327701",
        "record_title": "Short Sunderland",
        "file_key": "3be976d6c87d47129067be221053d4bf.glb",
        "file_md5": "90ca7dd1dc1f5045515cdd93df2b23cf",
        "output": "short-sunderland-ej138-munkholmen.glb.gz",
        "name": "Short Sunderland Mk V EJ138 WH-Y",
        "aircraft": "Short Sunderland Mk V flying boat",
        "location": "Wreck west of Munkholmen, Trondheim, Trøndelag, Norway",
        "coordinates": [10.373180, 63.452221],
        "lost_date": "7 November 1945 (deliberately sunk)",
        "creator": "Blueye Robotics",
        "photos": None,
        "representation": "Underwater photogrammetry mesh of the Short Sunderland wreck, published by Blueye Robotics and mirrored as a self-contained GLB on Zenodo.",
        "source_url": "https://zenodo.org/records/10327701",
        "history_url": "https://www.dykkepedia.com/wiki/Short_Sunderland",
    },
]
USER_AGENT = "BridgePoint-Plane-Wrecks/1.0 (+https://bridgepointintelligence.online)"
MAX_RAW_BYTES = 60 * 1024 * 1024
MAX_GZIP_BYTES = 64 * 1024 * 1024
UNSUPPORTED_REQUIRED = {
    "KHR_draco_mesh_compression",
    "EXT_meshopt_compression",
    "KHR_texture_basisu",
    "EXT_texture_webp",
    "EXT_texture_avif",
}

def request_bytes(url: str, limit: int) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json,application/octet-stream"})
    with urllib.request.urlopen(req, timeout=180) as response:
        if response.status != 200:
            raise SystemExit(f"HTTP {response.status} downloading {url}")
        data = response.read(limit + 1)
    if len(data) > limit:
        raise SystemExit(f"Download exceeded {limit} byte safety cap: {url}")
    return data

def fetch_json(url: str) -> dict:
    value = json.loads(request_bytes(url, 8 * 1024 * 1024).decode("utf-8"))
    if not isinstance(value, dict):
        raise SystemExit(f"Zenodo returned invalid metadata for {url}")
    return value

def inspect_glb(raw: bytes, model: dict) -> dict:
    if len(raw) < 20 or raw[:4] != b"glTF" or struct.unpack_from("<I", raw, 8)[0] != len(raw):
        raise SystemExit(f"{model['record_id']}: source file is not a complete binary glTF")
    json_length = struct.unpack_from("<I", raw, 12)[0]
    if 20 + json_length > len(raw):
        raise SystemExit(f"{model['record_id']}: truncated glTF JSON chunk")
    doc = json.loads(raw[20:20 + json_length].decode("utf-8").rstrip(" \0"))
    required = set(doc.get("extensionsRequired") or [])
    unsupported = required & UNSUPPORTED_REQUIRED
    if unsupported:
        raise SystemExit(f"{model['record_id']}: local GLTFLoader has no decoder for required extensions: {sorted(unsupported)}")
    for buffer in doc.get("buffers") or []:
        if buffer.get("uri"):
            raise SystemExit(f"{model['record_id']}: GLB references an external buffer URI; refusing a non-self-contained viewer asset")
    for image in doc.get("images") or []:
        uri = image.get("uri")
        if uri and not uri.startswith("data:"):
            raise SystemExit(f"{model['record_id']}: GLB references an external image URI; refusing a viewer that depends on third-party hosting")
    meshes = doc.get("meshes") or []
    triangles = 0
    mesh_parts = 0
    for mesh in meshes:
        for primitive in mesh.get("primitives") or []:
            mode = primitive.get("mode", 4)
            if mode != 4:
                continue
            attributes = primitive.get("attributes") or {}
            position_index = attributes.get("POSITION")
            accessors = doc.get("accessors") or []
            if position_index is None or position_index >= len(accessors):
                continue
            vertex_count = int(accessors[position_index].get("count") or 0)
            index_index = primitive.get("indices")
            index_count = int(accessors[index_index].get("count") or 0) if index_index is not None and index_index < len(accessors) else vertex_count
            triangles += index_count // 3
            mesh_parts += 1
    if not mesh_parts or triangles < 1000:
        raise SystemExit(f"{model['record_id']}: source is not a substantial triangle mesh ({triangles} triangles)")
    return {
        "meshParts": mesh_parts,
        "triangles": triangles,
        "extensionsUsed": sorted(set(doc.get("extensionsUsed") or [])),
        "selfContained": True,
    }

def build(output: Path) -> dict:
    output.mkdir(parents=True, exist_ok=True)
    catalog = {"version": 1, "representation": "BridgePoint-hosted, self-contained textured photogrammetry triangle meshes", "models": []}
    for model in MODELS:
        record = fetch_json(f"https://zenodo.org/api/records/{model['record_id']}")
        metadata = record.get("metadata") or {}
        if metadata.get("title") != model["record_title"]:
            raise SystemExit(f"{model['record_id']}: Zenodo title changed; refusing to mirror")
        rights = metadata.get("license") or {}
        license_id = rights.get("id") if isinstance(rights, dict) else str(rights)
        license_id = str(license_id or "").lower()
        if license_id not in {"cc-by-4.0", "cc0-1.0"}:
            raise SystemExit(f"{model['record_id']}: model reuse licence is not approved for BridgePoint hosting: {license_id!r}")
        entries = record.get("files") or []
        entry = next((f for f in entries if f.get("key") == model["file_key"]), None)
        if not entry:
            raise SystemExit(f"{model['record_id']}: expected GLB file missing from Zenodo")
        if int(entry.get("size") or 0) <= 0 or int(entry.get("size") or 0) > MAX_RAW_BYTES:
            raise SystemExit(f"{model['record_id']}: source GLB size is outside the allowed bound")
        links = entry.get("links") or {}
        download_url = links.get("content") or links.get("download")
        if not download_url:
            encoded = urllib.parse.quote(model["file_key"], safe="")
            download_url = f"https://zenodo.org/records/{model['record_id']}/files/{encoded}?download=1"
        parsed = urllib.parse.urlparse(download_url)
        if parsed.scheme != "https" or parsed.hostname not in {"zenodo.org", "www.zenodo.org"}:
            raise SystemExit(f"{model['record_id']}: unexpected Zenodo asset host {download_url}")
        raw = request_bytes(download_url, MAX_RAW_BYTES)
        if len(raw) != int(entry["size"]):
            raise SystemExit(f"{model['record_id']}: downloaded GLB size mismatch")
        checksum = str(entry.get("checksum") or "")
        if checksum.startswith("md5:") and hashlib.md5(raw).hexdigest().lower() != checksum[4:].lower():
            raise SystemExit(f"{model['record_id']}: Zenodo source checksum mismatch")
        if hashlib.md5(raw).hexdigest().lower() != model["file_md5"]:
            raise SystemExit(f"{model['record_id']}: pinned model checksum mismatch; source changed")
        model_stats = inspect_glb(raw, model)
        target = output / model["output"]
        with target.open("wb") as handle:
            with gzip.GzipFile(filename="", mode="wb", fileobj=handle, compresslevel=6, mtime=0) as gz:
                gz.write(raw)
        if target.stat().st_size > MAX_GZIP_BYTES:
            target.unlink(missing_ok=True)
            raise SystemExit(f"{model['record_id']}: compressed hosted model exceeds {MAX_GZIP_BYTES} bytes")
        creator_names = [c.get("name") for c in metadata.get("creators") or [] if c.get("name")]
        item = {
            "id": model["id"],
            "name": model["name"],
            "aircraft": model["aircraft"],
            "location": model["location"],
            "coordinates": model["coordinates"],
            "date": model["lost_date"],
            "creator": model["creator"],
            "sourceCreators": creator_names,
            "sourcePhotos": model["photos"],
            "recordId": model["record_id"],
            "doi": f"10.5281/zenodo.{model['record_id']}",
            "sourceUrl": model["source_url"],
            "historyUrl": model["history_url"],
            "license": "CC BY 4.0" if license_id == "cc-by-4.0" else "CC0 1.0",
            "sourceBytes": len(raw),
            "compressedBytes": target.stat().st_size,
            "sha256": hashlib.sha256(raw).hexdigest(),
            "hostedAsset": f"/assets/plane-wrecks/extra/{model['output']}",
            "representation": model["representation"],
            "meshParts": model_stats["meshParts"],
            "triangles": model_stats["triangles"],
            "extensionsUsed": model_stats["extensionsUsed"],
            "selfContained": model_stats["selfContained"],
        }
        catalog["models"].append(item)
        print("BRIDGEPOINT_EXTRA_PLANE_MODEL_READY", json.dumps({k:item[k] for k in ("id","recordId","license","sourceBytes","compressedBytes","meshParts","triangles")}))
    (output / "catalog.json").write_text(json.dumps(catalog, indent=2) + "\n", encoding="utf-8")
    return catalog

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=Path("assets/plane-wrecks/extra"))
    args = parser.parse_args()
    build(args.output)

if __name__ == "__main__":
    main()
