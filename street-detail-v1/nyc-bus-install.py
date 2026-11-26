import sys, json, csv, io, zipfile, math, urllib.request, urllib.parse, re, hashlib, concurrent.futures
from pathlib import Path
site=Path(sys.argv[1]); dest=site/'data/bp-nyc-bus-v1';dest.mkdir(parents=True,exist_ok=True)
def fetch(url):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'BridgePoint source-backed mapping/1.0'}),timeout=120) as f: return f.read()
        except Exception:
            if i==2: raise
def feat(x,y,p):
    return {'type':'Feature','geometry':{'type':'Point','coordinates':[x,y]},'properties':p}
def fc(fs): return {'type':'FeatureCollection','features':fs}
def inside(x,y): return -74.27<=x<=-73.68 and 40.47<=y<=40.95
feeds={b:'https://web.mta.info/developers/data/nyct/bus/google_transit_'+b+'.zip' for b in ['bronx','brooklyn','manhattan','queens','staten_island']}
feeds['busco']='https://web.mta.info/developers/data/busco/google_transit.zip'
def readfeed(item):
    b,u=item
    z=zipfile.ZipFile(io.BytesIO(fetch(u)))
    rows=list(csv.DictReader(io.StringIO(z.read('stops.txt').decode('utf-8-sig'))))
    out=[]
    for p in rows:
        if p.get('location_type','') not in ('','0'):continue
        x,y=float(p['stop_lon']),float(p['stop_lat'])
        if inside(x,y):out.append((p['stop_id'],x,y,p.get('stop_name',''),b))
    assert len(out)>100,(b,len(out))
    print('MTA_FEED',b,len(out))
    return out
stops={}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as ex:
    for group in ex.map(readfeed,feeds.items()):
        for ident,x,y,name,b in group:
            k=(ident,round(x,6),round(y,6))
            if k not in stops:stops[k]=feat(x,y,{'stop_id':ident,'name':name,'feed':b,'class':'bus_stop','source':'MTA GTFS'})
assert len(stops)>10000,len(stops)
shelters=[]; offset=0;seen=set()
while True:
    u='https://data.cityofnewyork.us/resource/t4f2-8md7.geojson?'+urllib.parse.urlencode({'$limit':1000,'$offset':offset,'$order':':id'})
    fs=json.loads(fetch(u))['features']
    for f in fs:
        g=f.get('geometry') or {};coords=g.get('coordinates') or []
        if g.get('type')=='MultiPoint': pts=coords
        elif g.get('type')=='Point': pts=[coords]
        else: continue
        for q in pts:
            x,y=q[:2]
            if not inside(x,y):continue
            k=(round(x,7),round(y,7))
            if k in seen:continue
            seen.add(k); shelters.append(feat(x,y,{'class':'bus_shelter','shelter':True,'name':'NYC DOT bus shelter','source':'NYC DOT t4f2-8md7'}))
    if len(fs)<1000:break
    offset+=len(fs)
    assert offset<20000
assert len(shelters)>2000,len(shelters)
def write(name,v): (dest/name).write_text(json.dumps(v,separators=(',',':')))
write('stops.geojson',fc(list(stops.values())));write('shelters.geojson',fc(shelters));write('manifest.json',{'stops':len(stops),'shelters':len(shelters),'feeds':feeds,'shelter_source':'https://data.cityofnewyork.us/d/t4f2-8md7','shelter_height_m':2.4,'dimensions':'Representative model dimensions; not individually surveyed'})
print('NYC_BUS_DATA_PASS',len(stops),len(shelters))
# Only edit the current live street renderer, preserving all other models.
p=site/'vendor/bp-street-detail-v1.mjs';s=p.read_text()
a="const sources=[['bpLivingWorld',null]"
assert s.count(a)==1
s=s.replace(a,"const sources=[['bpNYCBusShelters',null],['bpLivingWorld',null]")
a="if(!kind)continue;"
assert s.count(a)==1
s=s.replace(a,a+"if(kind==='busshelter'&&id!=='bpNYCBusShelters'&&map.getSource('bpNYCBusShelters')&&f.geometry.coordinates[0]>=-74.27&&f.geometry.coordinates[0]<=-73.68&&f.geometry.coordinates[1]>=40.47&&f.geometry.coordinates[1]<=40.95)continue;")
s=s.replace("['bpLivingWorld','ofm','bp-global-streetlights-overture-source-v2'].includes(e.sourceId)","['bpNYCBusShelters','bpLivingWorld','ofm','bp-global-streetlights-overture-source-v2'].includes(e.sourceId)")
p.write_text(s)
(site/'vendor/bp-nyc-bus-v1.mjs').write_bytes(Path('street-detail-v1/nyc-bus.mjs').read_bytes())
for base in (site,site/'app'):
    p=base/'world-v2300-map.js';s=p.read_text()
    a="map.on('zoomend',bpAttachTreeRendererFromViewport);"
    assert s.count(a)==1
    s=s.replace(a,a+"\n import('/vendor/bp-nyc-bus-v1.mjs').then(m=>m.attachNYCBusStops(map)).catch(e=>console.warn('NYC bus stops',e));")
    s=s.replace("/vendor/bp-street-detail-v1.mjs'","/vendor/bp-street-detail-v1.mjs?v=nycbus1'")
    p.write_text(s)
    for f in ('index.html','landing.js','app.js'):
        p=base/f
        if p.exists():
            s=p.read_text();n=re.sub(r'world-v2300-map\\.js\\?v=[^\\s\\x22\\x27<>]+','world-v2300-map.js?v=20261126-nycbus1',s)
            if n!=s:p.write_text(n)
