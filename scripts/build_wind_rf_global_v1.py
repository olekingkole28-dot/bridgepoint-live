#!/usr/bin/env python3
"""BridgePoint cache: genuine Open-Meteo global winds/250-hPa heights and FCC ASR structure anchors.
Source columns: [lat,lon,10m wind km/h,10m wind-from deg,250hPa wind km/h,250hPa from deg,250hPa height m].
FCC registrations are structural locations, NOT proof of any 4G/5G service.
"""
from __future__ import annotations
import datetime as dt
import json
import os
import sys
import time
import urllib.parse
import urllib.request

UA='BridgePointIntelligence/1.0 (public modeled-wind source cache)'
API='https://api.open-meteo.com/v1/forecast'
FCC='https://services.arcgis.com/XG15cJAlne2vxtgt/ArcGIS/rest/services/Antenna_Structure_Registrate1/FeatureServer/45/query'
FIELDS='wind_speed_10m,wind_direction_10m,wind_speed_250hPa,wind_direction_250hPa,geopotential_height_250hPa'
def request(url, params, attempts=2):
    full=url+'?'+urllib.parse.urlencode(params)
    last=None
    for n in range(attempts):
        try:
            req=urllib.request.Request(full,headers={'Accept':'application/json','User-Agent':UA})
            with urllib.request.urlopen(req,timeout=22) as response:
                doc=json.load(response)
                if not isinstance(doc,(list,dict)):raise ValueError('invalid JSON response shape')
                if isinstance(doc,dict) and doc.get('error'):raise RuntimeError(str(doc.get('reason') or doc.get('message') or doc.get('error')))
                return doc
        except Exception as e:
            last=e
            time.sleep((n+1)*3)
    raise RuntimeError(str(last))

def wind_grid():
    points=[(lat,lon) for lat in (-65,-50,-35,-20,-5,10,25,40,55,70) for lon in range(-165,166,30)]
    rows=[]
    for start in range(0,len(points),5):
        batch=points[start:start+5]
        args={'latitude':','.join(str(a) for a,_ in batch),
              'longitude':','.join(str(b) for _,b in batch),
              'current':FIELDS,'timezone':'UTC','wind_speed_unit':'kmh'}
        response=request(API,args)
        docs=response if isinstance(response,list) else [response]
        if len(docs)!=len(batch):raise RuntimeError('global pressure-level wind batch size mismatch')
        for (lat,lon),doc in zip(batch,docs):
            cur=doc.get('current') or {}
            try:
                values=[float(cur[x]) for x in FIELDS.split(',')]
            except (KeyError,ValueError,TypeError) as e:
                raise RuntimeError('missing current 250hPa wind or geopotential height') from e
            speed10,dir10,speed250,dir250,height=values
            if not (0<=speed10<450 and 0<=speed250<650 and 4000<=height<=17000 and 0<=dir10<=360 and 0<=dir250<=360):
                raise RuntimeError('invalid model speed/direction/pressure height')
            rows.append([lat,lon,round(speed10,2),round(dir10,2),round(speed250,2),round(dir250,2),round(height,1)])
        print('validated modeled global wind grid:',len(rows),flush=True)
        time.sleep(.25)
    if len(rows)<100:raise RuntimeError('insufficient global wind observations')
    return rows

def structure_grid():
    rows=[]
    seen=set()
    for w,e in [(-126,-113),(-113,-102),(-102,-91),(-91,-80),(-80,-65)]:
        for s,n in [(23,36),(36,51)]:
            args={'where':'1=1','geometry':f'{w},{s},{e},{n}','geometryType':'esriGeometryEnvelope',
                  'inSR':'4326','spatialRel':'esriSpatialRelIntersects','returnGeometry':'true',
                  'outFields':'OBJECTID,RegNum,Strucht,Entity','outSR':'4326',
                  'resultRecordCount':120,'f':'geojson'}
            doc=request(FCC,args)
            for item in doc.get('features') or []:
                g=item.get('geometry') or {};p=item.get('properties') or {}
                if g.get('type')!='Point':continue
                coords=g.get('coordinates') or []
                if len(coords)<2:continue
                try:
                    lon=float(coords[0]);lat=float(coords[1])
                    raw=p.get('Strucht')
                    height=float(raw) if raw not in ('',None) else None
                except (ValueError,TypeError):continue
                if not(-180<=lon<=180 and -90<=lat<=90):continue
                key=str(p.get('RegNum') or p.get('OBJECTID') or f'{lon:.5f},{lat:.5f}')
                if key in seen:continue
                seen.add(key)
                rows.append([round(lon,6),round(lat,6),round(height,1) if height is not None and 2<height<650 else None,key])
            print('FCC registrations sampled',w,s,len(rows),flush=True)
            time.sleep(.5)
    if len(rows)<60:raise RuntimeError('insufficient FCC source records: no fabricated tower anchors')
    return rows

def main():
    path=sys.argv[1] if len(sys.argv)>1 else 'wind-rf-global-v1.json'
    doc={'version':1,'fetched_at':dt.datetime.now(dt.timezone.utc).isoformat(),
         'wind_source':'Open-Meteo forecast model current 10m and 250hPa; source grid is sparse and interpolated only for illustration',
         'tower_source':'FCC Antenna Structure Registration; RF circles are assumed planning envelopes, never proof of a 4G/5G transmitter',
         'winds':wind_grid(),'sites':structure_grid()}
    from pathlib import Path
    dest=Path(path);dest.parent.mkdir(parents=True,exist_ok=True)
    tmp=dest.with_suffix(dest.suffix+'.tmp');tmp.write_text(json.dumps(doc,separators=(',',':')),encoding='utf-8');os.replace(tmp,dest)
    print('WIND_RF_GLOBAL_REAL_SOURCE_CACHE_PASS',len(doc['winds']),len(doc['sites']),dest,flush=True)

if __name__=='__main__':main()
