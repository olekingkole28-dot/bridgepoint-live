#!/usr/bin/env python3
"""Single CelesTrak Starlink OMM snapshot for static BridgePoint EM/RF.

Fetch ONCE per publication, fail closed on any non-200; never fabricate or
silently publish stale orbit positions. Shared same-origin JSON avoids thousands
of client fetches hitting CelesTrak and respects its 2-hour update cadence.
"""
import datetime as dt
import json
import math
import sys
import urllib.error
import urllib.request
from pathlib import Path

SOURCE = "https://celestrak.org/NORAD/elements/gp.php?GROUP=STARLINK&FORMAT=JSON"
HEADERS = {"Accept": "application/json", "User-Agent": "BridgePointIntelligence/2.0 (orbital-source-cache; github.com/olekingkole28-dot/bridgepoint-live)"}
OUTPUT = Path(sys.argv[1] if len(sys.argv) > 1 else "starlink-orbits-v2.json")
def number(value):
    try:
        n = float(value)
        return n if math.isfinite(n) else None
    except (TypeError,ValueError):
        return None

def parse_epoch(value):
    if not isinstance(value,str): return None
    try:
        timestamp = dt.datetime.fromisoformat(value.replace("Z","+00:00"))
        if timestamp.tzinfo is None: timestamp=timestamp.replace(tzinfo=dt.timezone.utc)
        return int(timestamp.timestamp()*1000)
    except ValueError:
        return None

now=dt.datetime.now(dt.timezone.utc)
try:
    with urllib.request.urlopen(urllib.request.Request(SOURCE,headers=HEADERS),timeout=75) as response:
        if response.status != 200: raise RuntimeError("CelesTrak non-200 status: "+str(response.status))
        raw=response.read(9000000)
        if len(raw)>8500000: raise RuntimeError("Unexpectedly large orbital source payload")
    items=json.loads(raw)
except (urllib.error.URLError,ValueError,RuntimeError) as exc:
    raise SystemExit("STARLINK_SOURCE_UNAVAILABLE_STOP_WITHOUT_RETRY "+str(exc))
if not isinstance(items,list): raise SystemExit("STARLINK_SOURCE_WRONG_TYPE")
out=[];unique=set();recent=0
for item in items:
    if not isinstance(item,dict): continue
    name=str(item.get("OBJECT_NAME") or "")
    if not name.upper().startswith("STARLINK"): continue
    catalog=item.get("NORAD_CAT_ID")
    try: catalog=int(catalog)
    except (TypeError,ValueError): continue
    if catalog<=0 or catalog in unique: continue
    epoch=parse_epoch(item.get("EPOCH"))
    mean_motion=number(item.get("MEAN_MOTION"))
    e=number(item.get("ECCENTRICITY"))
    inc=number(item.get("INCLINATION"))
    raan=number(item.get("RA_OF_ASC_NODE"))
    arg=number(item.get("ARG_OF_PERICENTER"))
    anom=number(item.get("MEAN_ANOMALY"))
    if epoch is None or any(v is None for v in (mean_motion,e,inc,raan,arg,anom)): continue
    if not (.01<mean_motion<20 and 0<=e<.5 and 0<=inc<=180): continue
    hours=(now.timestamp()*1000-epoch)/3600000
    if hours>7*24 or hours< -6: continue
    recent+=hours<=72
    unique.add(catalog)
    out.append([catalog,name,epoch,mean_motion,e,inc,raan,arg,anom,str(item.get('OBJECT_ID') or '')])
if len(out)<2500 or recent<2000:
    raise SystemExit(f"STARLINK_CATALOG_INSPECT_BEFORE_PUBLISH total={len(out)} recent_72h={recent}")
payload={
    "version":2,"source":"CelesTrak Starlink OMM GP catalog",
    "source_url":SOURCE,"method":"public orbital elements; client-side approximate J2-adjusted Kepler propagation, not operator telemetry",
    "fetched_at":now.isoformat(timespec="seconds"),
    "record_count":len(out),"recent_72h":recent,"fields":["norad","name","epoch_ms","mean_motion_rev_day","eccentricity","inclination_deg","raan_deg","arg_perigee_deg","mean_anomaly_deg","international_designator"],
    "records":out
}
OUTPUT.parent.mkdir(parents=True,exist_ok=True)
OUTPUT.write_text(json.dumps(payload,separators=(",",":")),encoding="utf-8")
print(f"STARLINK_FIRST_PARTY_CATALOG_PASS {len(out)} positions recent={recent} bytes={OUTPUT.stat().st_size} source={SOURCE}")
