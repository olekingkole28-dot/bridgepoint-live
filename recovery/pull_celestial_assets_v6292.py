#!/usr/bin/env python3
"""Mirror the exact currently-live Mars and Saturn runtime assets into a fresh Pages build.

The planetary binary products were already built and verified for the live v6292
release. Reuse those exact published bytes instead of reprocessing NASA/PDS source
rasters or inventing replacement geometry during an unrelated entry-startup fix.
"""
from __future__ import annotations

import hashlib
import json
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

ORIGIN = "https://bridgepointintelligence.online"
SYSTEMS = ("saturn", "mars")


def fetch(url: str, *, timeout: int = 180) -> bytes:
    last_error: Exception | None = None
    for attempt in range(5):
        try:
            req = Request(url, headers={
                "User-Agent": "BridgePoint-Intelligence-Pages-Rebuild/1.0",
                "Cache-Control": "no-cache",
            })
            with urlopen(req, timeout=timeout) as response:
                if response.status != 200:
                    raise RuntimeError(f"HTTP {response.status}: {url}")
                return response.read()
        except (HTTPError, URLError, TimeoutError, OSError, RuntimeError) as exc:
            last_error = exc
            if attempt < 4:
                time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Could not fetch {url}: {last_error}")


def local_relative(raw: str, system: str, folder: str | None = None) -> str:
    value = str(raw).replace("\\", "/").lstrip("/")
    if value.startswith("site/"):
        value = value[5:]
    if value.startswith("assets/"):
        return value
    if folder:
        return f"assets/{system}/v1/{folder}/{value}"
    return f"assets/{system}/v1/{value}"


def collect_assets(system: str, manifest: dict) -> list[tuple[str, dict]]:
    assets: list[tuple[str, dict]] = []

    def add(record: dict | None, folder: str | None = None) -> None:
        if not isinstance(record, dict) or not record.get("file"):
            return
        assets.append((local_relative(record["file"], system, folder), record))

    if system == "saturn":
        for record in manifest.get("textures", {}).values():
            add(record, "textures")
        add(manifest.get("titan_dem"), "height")
        for record in manifest.get("shape_meshes", {}).values():
            add(record, "meshes")
        ephemeris = manifest.get("ephemeris_file")
        if ephemeris:
            assets.append((local_relative(ephemeris, system), {}))
    else:
        add(manifest.get("global_height"))
        add(manifest.get("global_color"))
        for body in manifest.get("moons", {}).values():
            add(body.get("mesh"))
            add(body.get("texture"))
        for record in manifest.get("localized_terrain", {}).values():
            add(record)

    unique: dict[str, dict] = {}
    for relative, record in assets:
        if relative in unique:
            raise AssertionError(f"Duplicate planetary asset path: {relative}")
        unique[relative] = record
    return list(unique.items())


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: pull_celestial_assets_v6292.py SITE_DIRECTORY")
    site = Path(sys.argv[1]).resolve()
    total_bytes = 0
    total_files = 0

    for system in SYSTEMS:
        manifest_rel = f"assets/{system}/v1/manifest.json"
        manifest_url = f"{ORIGIN}/{manifest_rel}"
        raw_manifest = fetch(manifest_url)
        manifest = json.loads(raw_manifest)
        if system == "saturn" and manifest.get("version") != "saturn-system-v6282":
            raise AssertionError(f"Unexpected live Saturn manifest: {manifest.get('version')}")
        if system == "mars" and manifest.get("version") != 6291:
            raise AssertionError(f"Unexpected live Mars manifest: {manifest.get('version')}")

        manifest_path = site / manifest_rel
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_bytes(raw_manifest)
        total_bytes += len(raw_manifest)
        total_files += 1

        for relative, metadata in collect_assets(system, manifest):
            data = fetch(f"{ORIGIN}/{relative}")
            expected_bytes = metadata.get("bytes", metadata.get("bytes_gzip"))
            if expected_bytes is not None and len(data) != int(expected_bytes):
                raise AssertionError(
                    f"{relative}: expected {expected_bytes} bytes, received {len(data)}"
                )
            expected_hash = metadata.get("sha256")
            if expected_hash and hashlib.sha256(data).hexdigest() != expected_hash:
                raise AssertionError(f"{relative}: SHA-256 does not match the live manifest")
            destination = site / relative
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(data)
            total_bytes += len(data)
            total_files += 1
            print(f"CELESTIAL_ASSET_OK {relative} {len(data)}", flush=True)

        print(
            f"CELESTIAL_MANIFEST_OK {system} "
            f"assets={len(collect_assets(system, manifest))}",
            flush=True,
        )

    if not (site / "assets/saturn/v1/ephemerides.json").is_file():
        raise FileNotFoundError("The Saturn ephemeris payload was not restored")
    if not (site / "assets/mars/v1/height/mola-global-bpmh.bin.gz").is_file():
        raise FileNotFoundError("The global Mars elevation payload was not restored")
    print(f"CELESTIAL_ASSET_RESTORE_PASS files={total_files} bytes={total_bytes}")


if __name__ == "__main__":
    main()
