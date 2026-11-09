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
    (site / "offline-packs/global-max-v1.json").unlink(missing_ok=True)

    catalog_path = site / "offline-packs/catalog.json"
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    catalog["packages"] = [p for p in catalog.get("packages", []) if p.get("id") != "global-max-v1"]
    catalog["description"] = (
        "Download worldwide geographic foundations. The standard zoom 0–6 Global Basemap and "
        "Global Borders packs remain available. The optional zoom-7 Global Max archive is deferred "
        "from this GitHub Pages distribution to stay within the 1 GB hosting limit."
    )
    catalog_path.write_text(json.dumps(catalog, indent=2), encoding="utf-8")

    # Remove stale manifest dependencies from the two still-published packages.
    pack_dir = site / "offline-packs"
    for path in pack_dir.glob("*.json"):
        if path.name == "catalog.json":
            continue
        data = json.loads(path.read_text(encoding="utf-8"))
        resources = data.get("resources")
        if isinstance(resources, list):
            data["resources"] = [
                item for item in resources
                if "/offline-packs/global-max-v1.json" not in str(item.get("url", ""))
                and "protomaps-world-z7" not in str(item.get("url", ""))
            ]
            path.write_text(json.dumps(data, indent=2), encoding="utf-8")

    runtime = site / "offline/offline-world.js"
    text = runtime.read_text(encoding="utf-8")
    required = "const useMax=installedPacks.some(p=>p.id==='global-max-v1');"
    if text.count(required) != 1:
        raise SystemExit("Could not locate the offline global-max selection guard.")
    text = text.replace(required, "const useMax=false; // v6284 Pages size policy: keep the supported global z0–6 basemap.")
    cover = "function packageIsCovered(id,installedPacks){\n return id!=='global-max-v1'&&installedPacks.some(p=>p.id==='global-max-v1');\n}"
    if text.count(cover) != 1:
        raise SystemExit("Could not locate the offline package coverage helper.")
    text = text.replace(cover, "function packageIsCovered(){ return false; }")
    old_meta = """  const [z6,z7]=await Promise.all([
   readBuildMeta('/assets/offline/protomaps-world-z6.meta.json'),
   readBuildMeta('/assets/offline/protomaps-world-z7.meta.json')
  ]);
  const basemap=catalog.packages.find(p=>p.id==='global-basemap-z6-v1');
  const max=catalog.packages.find(p=>p.id==='global-max-v1');"""
    new_meta = """  const z6=await readBuildMeta('/assets/offline/protomaps-world-z6.meta.json');
  const basemap=catalog.packages.find(p=>p.id==='global-basemap-z6-v1');"""
    if text.count(old_meta) != 1:
        raise SystemExit("Could not locate the offline build metadata size calculator.")
    text = text.replace(old_meta, new_meta)
    old_max = """  if(z7?.sizeBytes&&max){
   max.estimatedBytes=z7.sizeBytes+maxSupport;
   max.sizeLabel='About '+size(max.estimatedBytes)+' total · zoom-7 archive '+size(z7.sizeBytes);
   max.buildDate=z7.sourceDate||null;
  }
"""
    if text.count(old_max) != 1:
        raise SystemExit("Could not locate Global Max runtime size block.")
    text = text.replace(old_max, "")
    runtime.write_text(text, encoding="utf-8")

    if not (assets / "protomaps-world-z6.pmtiles").is_file():
        raise SystemExit("The standard zoom 0–6 offline basemap was unexpectedly removed.")
    print(f"GLOBAL_MAX_DEFERRED bytes={removed}; GLOBAL_BASEMAP_Z6_PRESERVED=true", flush=True)

if __name__ == "__main__":
    main()
