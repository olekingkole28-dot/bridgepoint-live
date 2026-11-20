#!/usr/bin/env python3
"""Source-attributed public weather snapshot for BridgePoint, no Supabase or paid service.

Official endpoints:
- NOAA NHC: active Atlantic / eastern Pacific tropical cyclone centers.
- NASA EONET: recently updated worldwide severe storm event centers/tracks.
- NOAA NWS: currently active U.S. tornado warning polygons, never funnel fixes.
- NOAA SPC: preliminary, time-bounded tornado report point locations.

An empty/failed source remains empty with diagnostics; no synthetic storm.
"""
from __future__ import annotations
import csv
import io
import json
import math
import os
import sys
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

UTC = timezone.utc
NOW = datetime.now(UTC)
NHC = "https://www.nhc.noaa.gov/CurrentStorms.json"
EONET = "https://eonet.gsfc.nasa.gov/api/v3/events?category=severeStorms&status=open&limit=300"
NWS = "https://api.weather.gov/alerts/active?event=Tornado%20Warning"
SPC = "https://www.spc.noaa.gov/climo/reports/today_torn.csv"
USER_AGENT = "BridgePointIntelligence/6504 (public weather visualization; contact via site)"

def iso(dt):
    return dt.astimezone(UTC).isoformat(timespec="seconds").replace("+00:00", "Z")

def date(value):
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).astimezone(UTC)
    except (ValueError, TypeError):
        return None

def num(value):
    try:
        v=float(value)
        return v if math.isfinite(v) else None
    except (ValueError, TypeError):
        return None

def coord(lon,lat):
    lo,la=num(lon),num(lat)
    return (lo,la) if lo is not None and la is not None and -180<=lo<=180 and -85<=la<=85 else None

def read(url,accept="application/json"):
    request=urllib.request.Request(url,headers={"User-Agent":USER_AGENT,"Accept":accept,"Cache-Control":"no-cache"})
    with urllib.request.urlopen(request, timeout=16) as response:
        data=response.read(6_000_000)
    return data.decode("utf-8",errors="replace")

def source_report(sources,name,url,ok,n,error=None):
    sources.append({"name":name,"url":url,"status":"available" if ok else "unavailable",
                    "records":n,"error":str(error)[:130] if error else None})

def from_nhc(payload):
    rows=payload.get("activeStorms",[]) if isinstance(payload,dict) else []
    if not isinstance(rows,list):
        raise ValueError("NHC activeStorms not a list")
    out=[]
    for p in rows:
        if not isinstance(p,dict):continue
        pos=coord(p.get("longitude_numeric",p.get("longitude")),p.get("latitude_numeric",p.get("latitude")))
        if not pos:continue
        observed=date(p.get("lastUpdate") or p.get("date") or p.get("lastUpdateTime") or p.get("issueTime"))
        if observed and (observed>NOW+timedelta(minutes=10) or NOW-observed>timedelta(hours=18)):
            continue
        name=str(p.get("name") or p.get("stormName") or "Named tropical cyclone")[:100]
        ident=str(p.get("id") or p.get("stormId") or name.lower().replace(" ","-"))[:100]
        category=str(p.get("classification") or "TC").upper()[:12]
        # Only officially reported numeric values; do not synthesize wind or tracks.
        wind=num(p.get("intensity_mph") or p.get("wind_mph") or p.get("windSpeedMph"))
        intensity=p.get("intensity")
        if wind is None and isinstance(intensity,str) and "mph" in intensity.lower():
            wind=num(intensity.lower().replace("mph","").strip())
        movement=num(p.get("movementSpeed"))
        heading=num(p.get("movementDir"))
        out.append({"id":"nhc:"+ident,"type":"HURRICANE" if category in ("HU","MH") else "TROPICAL_CYCLONE",
            "name":name,"classification":category,"lng":pos[0],"lat":pos[1],
            "wind_mph":wind,"movement_speed_mph":movement,"movement_heading_deg":heading,
            "pressure_mb":num(p.get("pressure")),"source":"NOAA/NHC",
            "observed_at":iso(observed) if observed else iso(NOW),
            "source_issued_at":iso(observed) if observed else None,
            "position_quality":"NHC active storm center; source timestamp missing" if not observed else "NHC active storm center",
            "advisory_url":(p.get("publicAdvisory") or {}).get("url") if isinstance(p.get("publicAdvisory"),dict) else None})
    return out

def from_eonet(payload):
    events=payload.get("events",[]) if isinstance(payload,dict) else []
    if not isinstance(events,list):raise ValueError("EONET events not a list")
    storms=[]
    for p in events:
        if not isinstance(p,dict):continue
        title=str(p.get("title",""))[:160]
        # EONET severeStorms includes non-tropical events; do not call them hurricanes.
        if not any(s in title.lower() for s in ("cyclone","hurricane","typhoon","tropical storm","tropical depression")):
            continue
        fixes=[]
        for point in p.get("geometry",[]):
            if not isinstance(point,dict):continue
            c=point.get("coordinates")
            if not isinstance(c,list) or len(c)<2:continue
            pos=coord(c[0],c[1])
            at=date(point.get("date"))
            if not pos or not at:continue
            fixes.append((at,pos))
        if not fixes:continue
        fixes.sort(key=lambda x:x[0])
        at,pos=fixes[-1]
        if at>NOW+timedelta(minutes=10) or NOW-at>timedelta(hours=18):continue
        history=[f[1] for f in fixes[-18:]]
        storms.append({"id":"eonet:"+str(p.get("id") or title)[:80],"type":"TROPICAL_CYCLONE",
            "name":title,"classification":"EONET","lng":pos[0],"lat":pos[1],
            "source":"NASA EONET","observed_at":iso(at),"source_issued_at":iso(at),
            "track_geometry":{"type":"LineString","coordinates":history} if len(history)>1 else None,
            "position_quality":"EONET latest reported fix; no implied live radar or future track",
            "source_url":p.get("link")})
    return storms

def from_nws(payload):
    features=payload.get("features",[]) if isinstance(payload,dict) else []
    if not isinstance(features,list):raise ValueError("NWS alert features not a list")
    alerts=[]
    for feature in features[:250]:
        if not isinstance(feature,dict):continue
        p=feature.get("properties") or {}
        if not isinstance(p,dict) or "tornado warning" not in str(p.get("event","")).lower():continue
        end=date(p.get("expires") or p.get("ends"))
        if end and end<NOW:continue
        geo=feature.get("geometry")
        if not isinstance(geo,dict) or geo.get("type") not in ("Polygon","MultiPolygon"):continue
        alerts.append({"type":"Feature","geometry":geo,
            "properties":{"id":str(p.get("id") or feature.get("id") or "")[:160],
            "phenom":"TO","event":"Tornado Warning","name":"Tornado Warning",
            "headline":str(p.get("headline") or "Tornado Warning")[:220],
            "description":str(p.get("description") or "")[:1200],
            "issued":p.get("sent"),"expires":p.get("expires"),
            "source":"NOAA/NWS","is_warning_not_tornado_location":True}})
    return alerts

def from_spc_csv(body):
    records=[]
    reader=csv.DictReader(io.StringIO(body))
    if not reader.fieldnames or not any("Lat" in x for x in reader.fieldnames):
        raise ValueError("SPC preliminary tornado report CSV schema missing")
    for p in reader:
        pos=coord(p.get("Lon") or p.get("Longitude"),p.get("Lat") or p.get("Latitude"))
        hhmm=str(p.get("Time") or "").zfill(4)
        if not pos or not hhmm.isdigit() or len(hhmm)!=4:continue
        h,m=int(hhmm[:2]),int(hhmm[2:])
        if h>23 or m>59:continue
        alternatives=[NOW.replace(hour=h,minute=m,second=0,microsecond=0)+timedelta(days=delta) for delta in (-1,0)]
        recent=[at for at in alternatives if timedelta(0)<=NOW-at<=timedelta(minutes=90)]
        if not recent:continue
        at=max(recent)
        place=str(p.get("Location") or "")[:90]
        rid=f"{iso(at)}:{pos[0]:.4f}:{pos[1]:.4f}"
        records.append({"id":"spc:"+rid,"type":"Tornado","classification":"PRELIMINARY",
            "name":"Preliminary tornado report"+(" — "+place if place else ""),
            "lat":pos[1],"lng":pos[0],"observed":True,
            "observed_at":iso(at),"source":"NOAA/SPC preliminary storm reports",
            "position_quality":"Preliminary reported coordinate; not a continuously tracked active funnel",
            "warning_not_confirmed":False})
    return records

def deduplicate(storms):
    # Prefer NHC if NASA EONET has the same recent center.
    out=[]
    for s in sorted(storms,key=lambda p:(p.get("source")!="NOAA/NHC")):
        if any(abs(s["lat"]-r["lat"])<1.0 and abs(s["lng"]-r["lng"])<1.5 for r in out):continue
        out.append(s)
    return out[:100]

def main(output):
    sources=[];storms=[];tornadoes=[];alerts=[]
    for name,url,reader,collector in (
        ("NOAA NHC",NHC,lambda:json.loads(read(NHC)),storms),
        ("NASA EONET",EONET,lambda:json.loads(read(EONET)),storms),
        ("NOAA NWS",NWS,lambda:json.loads(read(NWS)),alerts),
        ("NOAA SPC",SPC,lambda:read(SPC,"text/csv"),tornadoes),
    ):
        try:
            payload=reader()
            rows=(from_nhc(payload) if name=="NOAA NHC" else
                  from_eonet(payload) if name=="NASA EONET" else
                  from_nws(payload) if name=="NOAA NWS" else from_spc_csv(payload))
            collector.extend(rows)
            source_report(sources,name,url,True,len(rows))
        except Exception as error:
            source_report(sources,name,url,False,0,error)
    if all(src["status"]=="unavailable" for src in sources):
        raise RuntimeError("No public storm feed is available; do not overwrite healthy last data")
    storms=deduplicate(storms)
    result={"schema_version":1,"generated_at":iso(NOW),"sources":sources,
       "storms":storms,"tornadoes":tornadoes[:100],"alerts":alerts,
       "policy":"No synthetic storms; alert polygons are not tornado locations; sample cloud shapes illustrative.",
       "counts":{"storms":len(storms),"tornadoes":len(tornadoes),"warnings":len(alerts)}}
    path=Path(output);path.parent.mkdir(parents=True,exist_ok=True)
    path.write_text(json.dumps(result,separators=(",",":"),ensure_ascii=False),encoding="utf-8")
    print("BRIDGEPOINT_PUBLIC_STORM_DATA",json.dumps({"counts":result["counts"],"sources":sources}))
    return 0

if __name__=="__main__":
    raise SystemExit(main(sys.argv[1] if len(sys.argv)>1 else os.environ.get("WEATHER_OUTPUT","/tmp/bridgepoint-weather-current.json")))
