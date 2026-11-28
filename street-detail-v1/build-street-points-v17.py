"""Publish compact, source-backed NYC hydrant and marked crossing cells."""
import json, math, time, urllib.request, urllib.parse, sys
from collections import defaultdict
from pathlib import Path
out=Path(sys.argv[1]);out.mkdir(parents=True,exist_ok=True)
cells=defaultdict(list)
def fetch(url):
    for attempt in range(3):
        try:
            req=urllib.request.Request(url,headers={'User-Agent':'BridgePointIntelligence/17 (public GIS visualization)','Accept':'application/json'})
            with urllib.request.urlopen(req,timeout=65) as r:return json.load(r)
        except Exception:
            if attempt==2:raise
            time.sleep(2+attempt*2)
def point(f):
    g=f.get('geometry') or {};p=f.get('properties') or {}
    q=g.get('coordinates') if g.get('type')=='Point' else None
    if g.get('type')=='MultiPoint' and g.get('coordinates'):q=g['coordinates'][0]
    if not q:
        try:q=[float(p.get('x',p.get('longitude'))),float(p.get('y',p.get('latitude')))]
        except (TypeError,ValueError):return None
    if not isinstance(q,list) or len(q)<2:return None
    try:x,y=map(float,q[:2])
    except (ValueError,TypeError):return None
    if not(-74.30<x<-73.65 and 40.47<y<40.94):return None
    return [round(x,7),round(y,7)]
def load(dataset,kind):
    total=0;seen=set()
    for offset in range(0,300000,20000):
        url='https://data.cityofnewyork.us/resource/'+dataset+'.geojson?'+urllib.parse.urlencode({'$limit':20000,'$offset':offset,'$order':':id'})
        fs=fetch(url).get('features',[])
        for f in fs:
            q=point(f)
            if not q or tuple(q) in seen:continue
            seen.add(tuple(q));x,y=q
            k=f'{math.floor(x*100)}_{math.floor(y*100)}'
            cells[k].append([x,y,kind]);total+=1
        if len(fs)<20000:break
    print('NYC_STREET_SOURCE',dataset,kind,total,flush=True)
    return total
hydrants=load('5bgh-vtsn','h')
assert hydrants>50000, f'NYC DEP inventory incomplete: {hydrants}'
crossings=0
for dataset in ('6ax4-q5k4','uh2s-ftgh'):
    try:crossings+=load(dataset,'c')
    except Exception as e:print('OPTIONAL_NYC_CROSSING_SOURCE_UNAVAILABLE',dataset,str(e))
for k,rows in cells.items():
    (out/(k+'.json')).write_text(json.dumps(rows,separators=(',',':')))
(out/'manifest.json').write_text(json.dumps({'hydrants':hydrants,'crossings':crossings,'cells':len(cells),'sources':['https://data.cityofnewyork.us/Environment/Hydrants/5bgh-vtsn','https://data.cityofnewyork.us/Transportation/VZV-Enhanced-Crossings/6ax4-q5k4','https://data.cityofnewyork.us/Transportation/Raised-Crosswalk-Locations/uh2s-ftgh']}))
