#!/usr/bin/env python3
"""Surgical Wind/RF v2 production overlay onto LAST VERIFIED complete auth site.

Never reconstruct the site from repository folders: preserve everything already
published, including bootstrapped auth, spacecraft, wrecks, caves and all buttons.
"""
from __future__ import annotations
import hashlib
import re
import sys
from pathlib import Path

OLD_IMPORT = "./bridgepoint-global-wind-rf-v1.js?v=1-wind-jet-streams-all-on"
NEW_IMPORT = "./bridgepoint-global-wind-rf-v1.js?v=2-height-true-rf-wind"
TOKEN = "&windrfvisual=v2"

def digest(root: Path):
    return {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob("*") if p.is_file()}

def overlay(site: Path, sources: Path):
    before = digest(site)
    required = {
        "index.html", "app/index.html", "landing.js", "app.js",
        "bridgepoint-view-v5917.js", "bridgepoint-volumetric-fields-v5978.js",
        "bridgepoint-global-wind-rf-v1.js", "app/bridgepoint-global-wind-rf-v1.js",
        "wind-rf-global-v1.json", "bridgepoint-emrf-starlink-global-v2.js",
        "bridgepoint-celestial-sky-v6257.js", "bridgepoint-spacecraft-museums-v3.js",
        "bridgepoint-shipwrecks-v1.js", "bridgepoint-plane-wrecks-v1.js",
    }
    if missing := required - before.keys():
        raise RuntimeError("REFUSE_PUBLISH_INCOMPLETE_AUTH_PRODUCTION " + str(sorted(missing)))
    src = (sources / "bridgepoint-global-wind-rf-v1.js").read_text(encoding="utf-8")
    if not all(token in src for token in
        ("const boost=1;", "visibleSamples(map,rows,jet,zoom)", "attribute vec3 color;",
         "queryTerrainElevation", "row[6]+Math.min(800,size*.12)", "clickJet")):
        raise RuntimeError("REFUSE_PUBLISH_RENDERER_NOT_VERIFIED")
    changed = set()
    for rel in ("bridgepoint-global-wind-rf-v1.js", "app/bridgepoint-global-wind-rf-v1.js"):
        p = site / rel
        p.write_text(src, encoding="utf-8")
        changed.add(rel)
    for rel in ("bridgepoint-volumetric-fields-v5978.js", "app/bridgepoint-volumetric-fields-v5978.js",
                "bridgepoint-view-v5917.js", "app/bridgepoint-view-v5917.js"):
        if rel not in before:
            continue
        p = site / rel
        contents = p.read_text(encoding="utf-8")
        if contents.count(OLD_IMPORT) != 1 or NEW_IMPORT in contents:
            raise RuntimeError("REFUSE_PUBLISH_WIND_IMPORT_CACHE_MISMATCH " + rel)
        p.write_text(contents.replace(OLD_IMPORT, NEW_IMPORT), encoding="utf-8")
        changed.add(rel)
    pattern = r'(data-bp-deferred-src="/bridgepoint-view-v5917\.js[^"]*)(")'
    for rel in ("index.html", "app/index.html"):
        p = site / rel
        contents = p.read_text(encoding="utf-8")
        if "authorigin=20261120r1" not in contents or "windrfjets=v1" not in contents:
            raise RuntimeError("REFUSE_PUBLISH_AUTH_OR_WIND_BASELINE_MISMATCH " + rel)
        if TOKEN in contents:
            raise RuntimeError("REFUSE_PUBLISH_DUPLICATE_WIND_TOKEN " + rel)
        replacement, n = re.subn(pattern, lambda m: m.group(1) + TOKEN + m.group(2), contents)
        if n != 1:
            raise RuntimeError("REFUSE_PUBLISH_VIEW_ENTRY_CACHE_NOT_UNIQUE " + rel + " count=" + str(n))
        p.write_text(replacement, encoding="utf-8")
        changed.add(rel)
    after = digest(site)
    actual = {key for key in before if before[key] != after.get(key)}
    if actual != changed or set(before) != set(after):
        raise RuntimeError("REFUSE_PUBLISH_OTHER_SITE_CHANGE " +
                           str((sorted(actual ^ changed), sorted(set(before) ^ set(after)))))
    for protected in ("landing.js", "app.js", "bridgepoint-emrf-starlink-global-v2.js",
                      "bridgepoint-spacecraft-museums-v3.js", "bridgepoint-shipwrecks-v1.js",
                      "bridgepoint-plane-wrecks-v1.js", "wind-rf-global-v1.json"):
        if before[protected] != after[protected]:
            raise RuntimeError("REFUSE_PUBLISH_PROTECTED_FILE_CHANGED " + protected)
    print("WIND_RF_V2_SURGICAL_OVERLAY_PASS", len(before)-len(changed),
          "entire existing files retained; changed only", sorted(changed), flush=True)

if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: overlay_wind_rf_visual_v2.py <verified-prod-site> <rebuild-v5000>")
    overlay(Path(sys.argv[1]), Path(sys.argv[2]))
