#!/usr/bin/env python3
"""Check the public Sketchfab metadata/download route for the CC BY Beechcraft wreck scan."""
import json
import urllib.error
import urllib.request

UID = "bcb169db484f4737a65aa7d465f9888a"
HEADERS = {
    "User-Agent": "BridgePoint-Plane-Wrecks/1.0",
    "Accept": "application/json",
}

def probe(url, limit=8192):
    req = urllib.request.Request(url, headers=HEADERS)
    try:
        with urllib.request.urlopen(req, timeout=25) as r:
            data = r.read(limit)
            print("BRIDGEPOINT_SKETCHFAB_PROBE", r.status, r.geturl(), r.headers.get("Content-Type"), r.headers.get("Content-Length"), data[:1500].decode("utf-8","replace"))
    except urllib.error.HTTPError as e:
        body = e.read(1000).decode("utf-8","replace")
        print("BRIDGEPOINT_SKETCHFAB_PROBE_ERROR", url, e.code, body)
    except Exception as e:
        print("BRIDGEPOINT_SKETCHFAB_PROBE_ERROR", url, type(e).__name__, str(e)[:500])

probe("https://api.sketchfab.com/v3/models/" + UID + "/")
probe("https://api.sketchfab.com/v3/models/" + UID + "/download")
probe("https://sketchfab.com/3d-models/beechcraft-king-air-plane-rockingham-dive-trail-" + UID + "/download")
