#!/usr/bin/env python3
"""Inspect public Sketchfab API/download routes for real underwater aircraft scans."""
import urllib.error
import urllib.request

MODELS = {
    "messerschmitt-bf109": "49655a05cbe346808d810ad88f86066e",
    "beechcraft-king-air": "bcb169db484f4737a65aa7d465f9888a",
}
HEADERS = {"User-Agent": "BridgePoint-Plane-Wrecks/1.0", "Accept": "application/json"}

def probe(label, url, max_bytes=5000):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=18) as r:
            data=r.read(max_bytes)
            print("BRIDGEPOINT_PLANE_SOURCE", label, r.status, r.geturl(), r.headers.get("Content-Type"), r.headers.get("Content-Length"), data[:max_bytes].decode("utf-8","replace"))
    except urllib.error.HTTPError as e:
        print("BRIDGEPOINT_PLANE_SOURCE_ERROR", label, e.code, e.read(1200).decode("utf-8","replace"))
    except Exception as e:
        print("BRIDGEPOINT_PLANE_SOURCE_ERROR", label, type(e).__name__, str(e)[:400])

for name, uid in MODELS.items():
    probe(name + "-metadata", "https://api.sketchfab.com/v3/models/" + uid + "/")
    probe(name + "-download-api", "https://api.sketchfab.com/v3/models/" + uid + "/download")
    slug = "messerschmitt-" if name.startswith("messerschmitt") else "beechcraft-king-air-plane-rockingham-dive-trail-"
    probe(name + "-download-page", "https://sketchfab.com/3d-models/" + slug + uid + "/download", 2000)
