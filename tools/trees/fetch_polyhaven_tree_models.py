#!/usr/bin/env python3
"""Fetch a small, explicitly licensed Poly Haven tree-model set for BridgePoint.

This script runs in CI, not in the production browser. It downloads only models
listed in assets/trees/tree-model-catalog-v1.json, records the original source,
and preserves the relative paths of glTF dependencies.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import urllib.parse
import urllib.request
from pathlib import Path, PurePosixPath

API = "https://api.polyhaven.com"
USER_AGENT = "BridgePoint-Tree-Asset-Pipeline/1.0"
MAX_DOWNLOAD_BYTES = 350 * 1024 * 1024
PREFERRED_RESOLUTIONS = ("2k", "1k", "4k", "8k", "16k")
SAFE_ID = re.compile(r"^[a-z0-9][a-z0-9_]{0,63}$")


def request_bytes(url: str, *, accept: str = "*/*") -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": USER_AGENT,
            "Accept": accept,
            "Cache-Control": "no-cache",
        },
    )
    with urllib.request.urlopen(request, timeout=90) as response:
        declared = response.headers.get("Content-Length")
        if declared and int(declared) > MAX_DOWNLOAD_BYTES:
            raise RuntimeError(f"Refusing oversized file ({declared} bytes): {url}")
        data = response.read(MAX_DOWNLOAD_BYTES + 1)
    if len(data) > MAX_DOWNLOAD_BYTES:
        raise RuntimeError(f"Refusing oversized file (>350 MiB): {url}")
    return data


def request_json(path: str) -> dict:
    raw = request_bytes(f"{API}/{path.lstrip('/')}", accept="application/json")
    value = json.loads(raw.decode("utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"Unexpected API response type for {path}")
    return value


def safe_relative_path(value: str) -> Path:
    normalized = str(value).replace("\\", "/").lstrip("/")
    path = PurePosixPath(normalized)
    if not normalized or any(part in ("", ".", "..") for part in path.parts):
        raise RuntimeError(f"Unsafe dependency path from Poly Haven: {value!r}")
    if path.is_absolute():
        raise RuntimeError(f"Absolute dependency path rejected: {value!r}")
    return Path(*path.parts)


def get_resolution_nodes(files: dict) -> dict:
    node = files.get("gltf")
    if isinstance(node, dict):
        return node
    model_files = files.get("modelFiles")
    if isinstance(model_files, dict) and isinstance(model_files.get("gltf"), dict):
        return model_files["gltf"]
    raise RuntimeError("Poly Haven did not return a glTF model format.")


def choose_package(files: dict) -> tuple[str, dict]:
    resolutions = get_resolution_nodes(files)
    available = [key for key, value in resolutions.items() if isinstance(value, dict)]
    if not available:
        raise RuntimeError("Poly Haven glTF package has no resolution variants.")
    chosen = next((key for key in PREFERRED_RESOLUTIONS if key in available), None)
    if chosen is None:
        # Choose the smallest available resolution rather than silently taking 8K.
        def rank(value: str) -> tuple[int, str]:
            match = re.search(r"(\d+)", value)
            return (int(match.group(1)) if match else 999999, value)
        chosen = sorted(available, key=rank)[0]
    node = resolutions[chosen]
    main = node.get("gltf")
    if not isinstance(main, dict) or not isinstance(main.get("url"), str):
        # Some API file trees wrap one extra level. Find the first glTF-like URL.
        candidates = []
        def walk(value):
            if isinstance(value, dict):
                if isinstance(value.get("url"), str):
                    candidates.append(value)
                else:
                    for nested in value.values():
                        walk(nested)
            elif isinstance(value, list):
                for nested in value:
                    walk(nested)
        walk(node)
        main = next((x for x in candidates if ".gltf" in x["url"].lower() or ".glb" in x["url"].lower()), None)
    if not isinstance(main, dict) or not isinstance(main.get("url"), str):
        raise RuntimeError(f"No glTF entry file found in the {chosen} package.")
    return chosen, main


def record_download(url: str, destination: Path, expected_md5: str | None) -> dict:
    data = request_bytes(url)
    checksum = hashlib.md5(data).hexdigest()
    if expected_md5 and checksum.lower() != str(expected_md5).lower():
        raise RuntimeError(f"MD5 mismatch for {url}: {checksum} != {expected_md5}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(data)
    return {"path": destination.as_posix(), "bytes": len(data), "md5": checksum}


def iter_includes(include_value, prefix: str = ""):
    if isinstance(include_value, dict):
        if isinstance(include_value.get("url"), str):
            if not prefix:
                raise RuntimeError("Poly Haven returned an included file without a relative path.")
            yield prefix, include_value
            return
        for key, nested in include_value.items():
            next_prefix = f"{prefix}/{key}" if prefix else str(key)
            yield from iter_includes(nested, next_prefix)
    elif isinstance(include_value, list):
        for index, nested in enumerate(include_value):
            yield from iter_includes(nested, f"{prefix}/{index}" if prefix else str(index))


def download_model(model: dict, output_root: Path) -> dict:
    asset_id = model["id"]
    if not SAFE_ID.fullmatch(asset_id):
        raise RuntimeError(f"Unsafe asset ID in catalog: {asset_id!r}")

    info = request_json(f"info/{asset_id}")
    if int(info.get("type", -1)) != 2:
        raise RuntimeError(f"{asset_id} is not a Poly Haven model asset.")
    files = request_json(f"files/{asset_id}")
    resolution, package = choose_package(files)

    model_root = output_root / asset_id
    model_root.mkdir(parents=True, exist_ok=True)
    filename = Path(urllib.parse.unquote(urllib.parse.urlparse(package["url"]).path)).name
    if not filename.lower().endswith((".gltf", ".glb")):
        raise RuntimeError(f"Unexpected glTF entry file extension: {filename}")
    main_record = record_download(package["url"], model_root / filename, package.get("md5"))

    dependencies = []
    for relative, record in iter_includes(package.get("include", {})):
        relative_path = safe_relative_path(relative)
        dependencies.append(
            record_download(
                record["url"],
                model_root / relative_path,
                record.get("md5"),
            )
        )

    source = {
        "id": asset_id,
        "displayName": info.get("name") or model["displayName"],
        "description": info.get("description"),
        "authors": info.get("authors") or {},
        "tags": info.get("tags") or [],
        "sourceUrl": model["sourceUrl"],
        "sourceApi": f"{API}/info/{asset_id}",
        "sourceFilesApi": f"{API}/files/{asset_id}",
        "license": "CC0-1.0",
        "licenseUrl": "https://polyhaven.com/license",
        "filesHash": info.get("files_hash"),
        "resolution": resolution,
        "polycount": info.get("polycount"),
        "gltfEntry": filename,
        "mainFile": main_record,
        "dependencies": dependencies,
        "modelFamily": model["modelFamily"],
        "botanicalMatch": model.get("botanicalMatch"),
        "leafType": model.get("leafType"),
        "leafCycle": model.get("leafCycle"),
    }
    (model_root / "source-manifest.json").write_text(
        json.dumps(source, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return source


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--catalog", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()

    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    if catalog.get("schemaVersion") != 1 or catalog.get("sourceProvider") != "Poly Haven":
        raise RuntimeError("Unsupported tree catalog schema/provider.")
    if catalog.get("license") != "CC0-1.0":
        raise RuntimeError("The POC downloader only accepts the reviewed CC0 catalog.")

    args.output.mkdir(parents=True, exist_ok=True)
    outputs = []
    for model in catalog.get("models", []):
        print(f"Fetching {model['id']} ({model['displayName']})", flush=True)
        outputs.append(download_model(model, args.output))

    manifest = {
        "schemaVersion": 1,
        "sourceProvider": "Poly Haven",
        "license": "CC0-1.0",
        "credit": catalog["credit"],
        "catalogId": catalog["catalogId"],
        "models": outputs,
    }
    (args.output / "source-manifest.json").write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(f"TREE_SOURCE_DOWNLOAD_PASS models={len(outputs)}", flush=True)
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"TREE_SOURCE_DOWNLOAD_FAILED: {error}", file=sys.stderr)
        raise
