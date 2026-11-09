#!/usr/bin/env python3
"""Apply the GitHub Pages size policy without removing the standard offline map."""
from __future__ import annotations
import json
import sys
from pathlib import Path

def main() -> None:
    site = Path(sys.argv[1] if len(sys.argv) > 1 else "site")
    assets = site / "assets/offline"
    z7 = assets / "protomaps-world-z7.pmtiles"
    if not z7.is_file() or z7.stat().st_size < 80_000_000:
        raise SystemExit("Expected the separately installable Global Max z7 archive before applying Pages size policy.")
    removed = z7.stat().st_size
    z7.unlink()
    (assets / "protomaps-world-z7.meta.json").unlink(missing_ok=True)
    # Keep the small package manifest so already-installed/offline pack metadata
    # continues to resolve on devices that have cached it. Only new catalog offers
    # are deferred until the site has a larger static-asset host.
    catalog_path = site / "offline-packs/catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    catalog["packages"] = [p for p in catalog.get("packages", []) if p.get("id") != "global-max-v1"]
    catalog["description"] = (
        "Download worldwide geographic foundations. The standard zoom 0–6 Global Basemap and "
        "Global Borders packs remain available. The optional zoom-7 Global Max archive is deferred "
        "from this GitHub Pages distribution to stay within the 1 GB hosting limit."
    )
    catalog_path.write_text(json.dumps(catalog, indent=2), encoding="utf-8")

    # Deliberately leave offline/offline-world.js unchanged: devices with a
    # previously installed GLOBAL MAX pack may continue reading their cached
    # z7 archive through the existing loader. New users see only supported packs.

    if not (assets / "protomaps-world-z6.pmtiles").is_file():
        raise SystemExit("The standard zoom 0–6 offline basemap was unexpectedly removed.")
    print(f"GLOBAL_MAX_DEFERRED bytes={removed}; GLOBAL_BASEMAP_Z6_PRESERVED=true", flush=True)

if __name__ == "__main__":
    main()
