#!/usr/bin/env python3
"""Inspect the public LIS Potree viewer for the real Planier Messerschmitt point-cloud source."""
import re
import urllib.request
import urllib.parse

BASE = "https://septentrion.lis-lab.fr/3D/Messerschmitt/"

def get(url, limit=4*1024*1024):
    request = urllib.request.Request(url, headers={"User-Agent": "BridgePoint-Plane-Wrecks/1.0"})
    with urllib.request.urlopen(request, timeout=45) as response:
        data = response.read(limit)
        return response.status, response.headers, data

status, headers, raw = get(BASE)
html = raw.decode("utf-8", "replace")
print("BRIDGEPOINT_MESSERSCHMITT_PAGE", status, headers.get("Content-Type"), len(raw))\nprint("BRIDGEPOINT_MESSERSCHMITT_HTML_SOURCE", html)
scripts = re.findall(r'<script[^>]+src="([^"]+)"', html, re.I)
print("BRIDGEPOINT_MESSERSCHMITT_SCRIPTS", scripts)
for match in re.findall(r'Potree\\.loadPointCloud\\s*\\((.{0,700}?)\\)', html, re.I | re.S):
    print("BRIDGEPOINT_MESSERSCHMITT_LOAD_CALL", match[:700])
for match in re.findall(r'(?:cloud\\.js|metadata\\.json|hierarchy\\.bin|octree\\.bin|pointclouds?[/\\][^"\\s<>]+)', html, re.I):
    print("BRIDGEPOINT_MESSERSCHMITT_INLINE_DATA_REF", match)
for rel in ("cloud.js", "metadata.json", "pointclouds/Messerschmitt/cloud.js", "pointclouds/Messerschmitt/metadata.json"):
    url = urllib.parse.urljoin(BASE, rel)
    try:
        st, hdr, data = get(url, 2048)
        print("BRIDGEPOINT_MESSERSCHMITT_PROBE", rel, st, hdr.get("Content-Type"), hdr.get("Content-Length"), data[:240].decode("utf-8", "replace"))
    except Exception as exc:
        print("BRIDGEPOINT_MESSERSCHMITT_PROBE", rel, type(exc).__name__, str(exc)[:200])
for src in scripts:
    url = urllib.parse.urljoin(BASE, src)
    if "septentrion.lis-lab.fr" not in url:
        continue
    try:
        st, hdr, data = get(url, 2*1024*1024)
        script = data.decode("utf-8", "replace")
        print("BRIDGEPOINT_MESSERSCHMITT_SCRIPT", url, st, len(data))
        for match in re.findall(r'Potree\\.loadPointCloud\\s*\\((.{0,700}?)\\)', script, re.I | re.S):
            print("BRIDGEPOINT_MESSERSCHMITT_SCRIPT_LOAD_CALL", url, match[:700])
        for match in re.findall(r'(?:cloud\\.js|metadata\\.json|hierarchy\\.bin|octree\\.bin|pointclouds?[/\\][^"\\s<>]+)', script, re.I):
            print("BRIDGEPOINT_MESSERSCHMITT_SCRIPT_DATA_REF", url, match)
    except Exception as exc:
        print("BRIDGEPOINT_MESSERSCHMITT_SCRIPT_ERROR", url, type(exc).__name__, str(exc)[:200])
