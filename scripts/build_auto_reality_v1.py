#!/usr/bin/env python3
"""Build an additive, source-backed nearby scan registry from the preserved live artifact."""
import json, sys, hashlib, gzip, struct, math, collections
from pathlib import Path

site=Path(sys.argv[1])
allowed={'index.html','app/index.html','bridgepoint-auto-reality-v1.js','data/bp-auto-reality-v1.json'}
def hashes():
 return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=hashes()
catalog=site/'bridgepoint-public-scan-catalog-v1.json'
if not catalog.is_file(): catalog=Path('rebuild-v5000/bridgepoint-public-scan-catalog-v1.json')
data=json.loads(catalog.read_text())
assert isinstance(data['items'],list) and len(data['items'])>=312
# Existing source modules specify depth, scale and site-level coordinates. Source geometry
# without an established world transform is only placed approximately, never called surveyed.
cal={
 'hnlms-kxi':dict(datum='absolute',altitudeM=-40,targetLengthM=66.63),
 'robert-gaskin':dict(datum='absolute',altitudeM=74.64-19.8,targetLengthM=40.42,headingDeg=90),
 'hms-grafton':dict(datum='absolute',altitudeM=-19),
 'kanonvraget':dict(datum='absolute',altitudeM=-15),
 'cape-otway':dict(datum='absolute',altitudeM=-87,targetLengthM=60.10),
 'timaru':dict(datum='absolute',altitudeM=-50,targetLengthM=44.9),
 'hms-loo':dict(datum='absolute',altitudeM=-6.75),
 'f4u1-corsair-kwajalein':dict(datum='absolute',altitudeM=-33.5),
 'tokai-maru-apra-harbor':dict(datum='absolute',altitudeM=-12.8),
 'short-sunderland-ej138-munkholmen':dict(datum='absolute',altitudeM=-64),
 'bell-p39q-airacobra-lake-huron':dict(datum='absolute',altitudeM=166,precisionExtra='Nominal 176 m Lake Huron water elevation minus the published 10 m depth; actual water elevation varies.'),
 'messerschmitt-bf109-g6-planier':dict(datum='absolute',altitudeM=-45),
 'b29-over-exposed-bleaklow':dict(datum='terrain',offsetM=0,baseAligned=True),
 '734dd252ca9e42249d9a7de338031a8f':dict(datum='terrain',offsetM=46.94,baseAligned=True,targetHeightM=46.05,statue=True,coordinates=[-74.044643,40.689211]),
 'f4232f8f91e54b0a8aa92365d6ea7b7a':dict(datum='terrain',offsetM=-20),
}
items=[]; skipped=[]; seen=set()
def validxy(x):
 return isinstance(x,list) and len(x)==2 and all(isinstance(v,(int,float)) and math.isfinite(v) for v in x) and -180<=x[0]<=180 and -90<=x[1]<=90
def existing_asset(path):
 if not path or not path.startswith('/assets/') or '..' in path: return False
 p=site/path.lstrip('/')
 if not p.is_file():return False
 if path.endswith('.bin.gz'):
  with gzip.open(p,'rb') as f:return f.read(4)==b'BPC1'
 if path.endswith('.glb.gz'):
  with gzip.open(p,'rb') as f:return f.read(4)==b'glTF'
 if path.endswith('.glb'):
  with p.open('rb') as f:return f.read(4)==b'glTF'
 return False
def add(item):
 xy=item.get('coordinates'); id=str(item.get('id') or '')
 if not id or id in seen or not validxy(xy):return
 seen.add(id)
 row={k:item.get(k) for k in ('id','title','category','creator','license','source_url','viewer_url','precision','coordinates')}
 row.update(minZoom=13,reachM=180)
 key=id.rsplit(':',1)[-1]
 c=cal.get(key)
 asset=item.get('asset_url')
 if c and existing_asset(asset):
  row.update(c);row.update(asset=asset,minZoom=c.get('minZoom',12.2),reachM=c.get('reachM',max(180,float(c.get('targetLengthM',0))*1.5)))
  if c.get('precisionExtra'):row['precision']=(row.get('precision') or '')+' '+c['precisionExtra']
 elif asset:
  skipped.append({'id':id,'asset':asset,'reason':'asset missing or no defensible location/depth transform'})
  # The museum wreck has no measured room position; retain its existing viewer.
 items.append(row)
for item in data['items']:add(item)
# Additional native sources shipped before the current public gallery snapshot.
extra=[
 {'id':'caves-underground-scans:39e7050d272f4aac8493497621b86f39','title':'Paris Catacombs — Large Gallery','category':'Caves & underground scans','creator':'Emm (@edemaistre)','license':'CC BY 4.0','coordinates':[2.3324,48.8336],'source_url':'https://doi.org/10.5281/zenodo.10287234','viewer_url':'https://sketchfab.com/models/39e7050d272f4aac8493497621b86f39/embed','precision':'Regional reference only; source LiDAR origin not GPS-georeferenced. Approximate 16 m below surface.','asset_url':'/assets/underground-scan-scenes/39e7050d272f4aac8493497621b86f39.glb.gz'},
 {'id':'caves-underground-scans:jenolan-caves-system','title':'Jenolan Caves — CSIRO 3D LiDAR','category':'Caves & underground scans','creator':'Robert Zlot and Michael Bosse · CSIRO','license':'CC BY-SA 3.0','coordinates':[150.021444,-33.820556],'source_url':'https://doi.org/10.4225/08/55911F74299DC','precision':'Collection-level anchor; locally registered point cloud, not GNSS-georeferenced. Original cave scan scale retained.','asset_url':'/assets/underground/jenolan-caves-v1/pointcloud.bin.gz'}]
cal['39e7050d272f4aac8493497621b86f39']=dict(datum='terrain',offsetM=-16)
cal['jenolan-caves-system']=dict(datum='terrain',offsetM=-8,topAligned=True,keepOrigin=True,format='bpc1',minZoom=10.8,reachM=5000)
for item in extra:
 if item['id'] in seen:
  # Upgrade the matching viewer-only item only when the exact local asset exists.
  old=next(x for x in items if x['id']==item['id']); k=item['id'].rsplit(':',1)[-1]
  if existing_asset(item['asset_url']):old.update(cal[k],asset=item['asset_url'])
 else:add(item)
# Add newly indexed Eiffel and other wonders from the exact deployed registry when absent
# from the public library. Parse only its literal entries; never evaluate arbitrary scripts.
import re
p=site/'bridgepoint-iconic-wonders-v1.js'
if p.is_file():
 for m in re.finditer(r"\{\s*id:'([^']+)',\s*name:(?:'([^']+)'|\"([^\"]+)\"),\s*country:'([^']+)',\s*coordinates:\[([-\d.]+),\s*([-\d.]+)\],\s*modelId:'([0-9a-f]{32})'",p.read_text()):
  ident,title1,title2,country,lon,lat,uid=m.groups()
  if any(uid in str(x.get('id')) or uid in str(x.get('viewer_url')) for x in items):continue
  add(dict(id='wonder:'+uid,title=title1 or title2,category='Landmark scans',coordinates=[float(lon),float(lat)],viewer_url='https://sketchfab.com/models/'+uid+'/embed?autostart=1&preload=1',source_url='https://sketchfab.com/models/'+uid,precision='Published site anchor; creator-hosted viewer, native geometry not available.'))
native=[x for x in items if x.get('asset')]
assert len(native)>=7, 'Native scan assets unexpectedly absent from baseline'
assert len(items)>=sum(1 for x in data['items'] if validxy(x.get('coordinates'))) and len({x['id'] for x in items})==len(items)
print('UNLOCATED_CATALOG_ITEMS',[(x['title'],x.get('coordinates')) for x in data['items'] if not validxy(x.get('coordinates'))])
out=site/'data/bp-auto-reality-v1.json';out.parent.mkdir(parents=True,exist_ok=True)
out.write_text(json.dumps({'schemaVersion':1,'items':items,'nativeCount':len(native),'catalogCount':len(items),'viewerOnlyCount':len(items)-len(native),'unplacedAssets':skipped},separators=(',',':'),ensure_ascii=True))
print('AUTO_REALITY_CATALOG',len(items),'NATIVE',len(native),'VIEWER_ONLY',len(items)-len(native))
print('AUTO_REALITY_NATIVE',[(x['title'],x['asset']) for x in native])
print('AUTO_REALITY_UNPLACED',skipped)

# Only the additive script tag, renderer, and discovery manifest are changed.
tag=b'<script defer src="/bridgepoint-auto-reality-v1.js?v=20261125v1"></script>\n'
for rel in ('index.html','app/index.html'):
 p=site/rel; old=p.read_bytes()
 assert old.count(b'</body>')==1 and tag not in old
 new=old.replace(b'</body>',tag+b'</body>',1)
 assert new.replace(tag,b'',1)==old
 p.write_bytes(new)
(site/'bridgepoint-auto-reality-v1.js').write_bytes(Path('rebuild-v5000/bridgepoint-auto-reality-v1.js').read_bytes())
assert hashes()==before, 'Unrelated production files changed'
print('AUTO_REALITY_ONLY_BYTE_PRESERVATION_PASS',len(before))
