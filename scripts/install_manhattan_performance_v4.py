#!/usr/bin/env python3
"""Manhattan-only mesh prefetch, covered legacy feature suppression and local water budget."""
import sys,json,hashlib,gzip,re,struct,math
from pathlib import Path
site=Path(sys.argv[1]);folder=site/'assets/manhattan-photogrammetry-v1'
asset='assets/manhattan-photogrammetry-v1/manhattan.glb'
packed='assets/manhattan-photogrammetry-v1/manhattan.glb.gz'
allowed={'index.html','app/index.html','bridgepoint-auto-reality-v1.js','data/bp-auto-reality-v1.json','world-v2300-water.js','app/world-v2300-water.js',packed}
def hashes():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=hashes()
raw=(site/asset).read_bytes()
assert hashlib.sha256(raw).hexdigest()=='d38b5a3d490b71e21888eecd6cd5fc5a49cd3ec649efe00918303916d48d7cfc'
(site/packed).write_bytes(gzip.compress(raw,compresslevel=6,mtime=0))
assert gzip.decompress((site/packed).read_bytes())==raw
p=site/'data/bp-auto-reality-v1.json';d=json.loads(p.read_text());row=next(x for x in d['items'] if x['id']=='city-photogrammetry:372bc495b3a941308f4a3198bc45e17b')
assert row['registrationAccepted'] and row['replacementFootprint']
transform={k:row[k] for k in ('coordinates','sourceScaleM','headingDeg','groundSourceY','offsetM')}
row.update(asset='/'+packed,mobileAsset='/'+packed,minZoom=12.2,preloadZoom=8,preloadReachM=55000,reachM=3200)
assert all(row[k]==v for k,v in transform.items())
p.write_text(json.dumps(d,separators=(',',':')))
p=site/'bridgepoint-auto-reality-v1.js';s=p.read_text()
def change(a,b):
 global s
 assert s.count(a)==1,(a[:100],s.count(a));s=s.replace(a,b,1)
change("let current=null,manifestPromise=null,libsPromise=null;","let current=null,manifestPromise=null,libsPromise=null,cityBytesPromise=null;")
change("const b=await bytes(row.cityScan&&row.mobileAsset&&(innerWidth<850||(navigator.deviceMemory&&navigator.deviceMemory<=4))?row.mobileAsset:row.asset);","const b=await (row.cityScan?(cityBytesPromise ||= bytes(row.asset).catch(e=>{cityBytesPromise=null;throw e})):bytes(row.asset));")
# Warm the one city model, not all global assets. Retain through close zoom and
# never evict it while the footprint remains near the camera.
change("const native=state.rows.filter(r=>r.asset&&near(map,r,1.4)).sort((a,b)=>distance(a.coordinates,xy)-distance(b.coordinates,xy));state.wanted=native.slice(0,mobile?2:4);","const city=state.rows.find(r=>r.cityScan&&r.registrationAccepted&&r.asset);const warm=city&&z>=city.preloadZoom&&distance(xy,city.coordinates)<=city.preloadReachM;if(warm&&!cityBytesPromise)cityBytesPromise=bytes(city.asset).catch(e=>{cityBytesPromise=null;return null});const native=state.rows.filter(r=>r.asset&&near(map,r,1.4)).sort((a,b)=>(Number(!!b.cityScan)-Number(!!a.cityScan))||distance(a.coordinates,xy)-distance(b.coordinates,xy));state.wanted=native.slice(0,mobile?2:4);const prepare=warm&&z>=10&&distance(xy,city.coordinates)<12000&&!state.cache.has(city.id);const loadRows=prepare?[city,...state.wanted.filter(r=>r!==city)]:state.wanted;")
change("if(state.wanted.length&&!state.libs&&!state.libLoading)","if(loadRows.length&&!state.libs&&!state.libLoading)")
change("const next=state.wanted.find(r=>!state.cache.has(r.id)","const next=loadRows.find(r=>!state.cache.has(r.id)")
change("if(!chosen.has(id)&&!near(map,r,3))","if(!chosen.has(id)&&!(r.cityScan&&warm)&&!near(map,r,3))")
# Avoid stale failed prefetch promise.
change("const b=await (row.cityScan?(cityBytesPromise ||= bytes(row.asset).catch(e=>{cityBytesPromise=null;throw e})):bytes(row.asset));","let b=await (row.cityScan?(cityBytesPromise ||= bytes(row.asset).catch(e=>{cityBytesPromise=null;throw e})):bytes(row.asset));if(!b&&row.cityScan){cityBytesPromise=null;b=await bytes(row.asset)}")
# MapLibre 'within' does not support polygon feature evaluation. Query the
# loaded geometry once per source/layer and exclude only stable identities of
# wholly contained polygons. For line/point geometry use within directly.
a=s.index('const CITY_LEGACY=');b=s.index('function update(state){',a)
s=s[:a]+r"""const CITY_LEGACY=/^gta-(?:context-(?:building|floor-lines|roofs|facade-detail|night-windows)|bp-(?:building|floor-lines|roofs|facade-detail|night-windows|tree|sidewalk|shrub|hedge|streetlight3d)|city-(?:buildings|floor-lines|building-roof-caps|roofs)|exact-(?:building|floor-lines|facade-detail|roof|night-windows)|building-outline|landcover|landuse|road3d-(?:curb|deck)|road-(?:major|local|supplement)|global-sidewalk|sidewalk-road-probe|streetlights)/;
function cityInside(p,ring){let ok=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])ok=!ok}return ok}
function cityCovered(g,ring){let n=0;function walk(c){if(!Array.isArray(c))return false;if(typeof c[0]==='number'){n++;return cityInside(c,ring)}return c.length>0&&c.every(walk)}return !!g&&walk(g.coordinates)&&n>0}
function syncCityReplacement(state){
 const map=state.map,row=state.wanted.find(r=>r.cityScan&&r.registrationAccepted&&r.replacementFootprint&&api.active.includes(r.id));
 state.cityFilters ||= new Map();
 if(!row){for(const [id,f] of state.cityFilters){try{if(map.getLayer(id)&&JSON.stringify(map.getFilter(id))===JSON.stringify(f.applied))map.setFilter(id,f.original||null)}catch(_){}}state.cityFilters.clear();state.cityMaskAt=0;api.cityReplacement={active:false};return}
 const now=performance.now();if(now-(state.cityMaskAt||0)<650&&state.cityFilters.size)return;state.cityMaskAt=now;
 const ring=row.replacementFootprint.coordinates[0],sources=new Map(),mask=['!', ['within',row.replacementFootprint]];
 let count=0,layers=0;
 for(const layer of map.getStyle()?.layers||[]){if(!CITY_LEGACY.test(layer.id)||!['fill-extrusion','fill','line','circle'].includes(layer.type)||!layer.source)continue;try{
  const cur=map.getFilter(layer.id),prev=state.cityFilters.get(layer.id),original=prev&&JSON.stringify(cur)===JSON.stringify(prev.applied)?prev.original:cur;
  const key=layer.source+'|'+(layer['source-layer']||'');let info=sources.get(key);
  if(!info){const fs=map.querySourceFeatures(layer.source,layer['source-layer']?{sourceLayer:layer['source-layer']}:{})||[];
   const ids=new Set(),props=new Map(),keys=['building_id','global_building_id','structure_id','feature_id','osm_id','id','bin'];
   for(const f of fs){if(!cityCovered(f.geometry,ring))continue;if(f.id!=null)ids.add(String(f.id));else for(const k of keys){const v=f.properties?.[k];if(v!=null&&String(v).length){if(!props.has(k))props.set(k,new Set());props.get(k).add(String(v));break}}}
   const deny=[];if(ids.size)deny.push(['in',['to-string',['id']],['literal',[...ids].sort().slice(0,5000)]]);
   for(const [k,vs] of props)deny.push(['all',['has',k],['in',['to-string',['get',k]],['literal',[...vs].sort().slice(0,5000)]]]);
   info={deny,ids:ids.size+[...props.values()].reduce((n,x)=>n+x.size,0)};sources.set(key,info);count+=info.ids;
  }
  const filters=[mask];if(info.deny.length)filters.push(['!', ['any',...info.deny]]);
  const applied=['all',...(original?[original]:[]),...filters];
  if(JSON.stringify(cur)!==JSON.stringify(applied))map.setFilter(layer.id,applied);
  state.cityFilters.set(layer.id,{original,applied});layers++;
 }catch(e){api.errors.cityReplacement=String(e.message||e)}}
 api.cityReplacement={active:true,layers,coveredFeatureIds:count};
}
"""+s[b:]
# Re-evaluate when vector tiles arrive, without running a source query every frame.
change("s.event=()=>schedule(s);s.click=e=>popup(s,e);","s.event=()=>schedule(s);s.click=e=>popup(s,e);s.cityData=e=>{if(e.isSourceLoaded&&s.wanted.some(r=>r.cityScan)&&!s.cityDataTimer)s.cityDataTimer=setTimeout(()=>{s.cityDataTimer=0;s.cityMaskAt=0;schedule(s)},850)};map.on('sourcedata',s.cityData);")
change("current.map.off('click',current.click)","current.map.off('click',current.click);current.map.off('sourcedata',current.cityData);clearTimeout(current.cityDataTimer)")
change("bp-auto-reality-v1.json?v=20261125manhattancoast3","bp-auto-reality-v1.json?v=20261125manhattan4")
p.write_text(s)
# Localized water quality budget; keep shader appearance and source-clipped surface.
water_changes=[]
for rel in ('world-v2300-water.js','app/world-v2300-water.js'):
 p=site/rel
 if not p.is_file():continue
 s=p.read_text()
 def w(a,b):
  global s
  assert s.count(a)==1,(rel,a,s.count(a));s=s.replace(a,b,1)
 marker='    frameDelay() {'
 w(marker,marker+"\n      if (bpManhattanWaterBudget(map)) return map.isMoving?.()?120:160;")
 # Function declaration at module scope.
 s+="\nfunction bpManhattanWaterBudget(map){const c=map.getCenter();return map.getZoom()>=12&&Math.abs(c.lng+74.00828)<.045&&Math.abs(c.lat-40.70574)<.036;}\n"
 # Limit expensive tessellation only in the dense city viewport.
 for name,cap in [('inlandBudget',7500),('marineBudget',14000),('coastalBudget',18000),('maxSegs',24),('maxCells',320)]:
  pattern=r'(\bconst\s+'+name+r'\s*=\s*)([^;]+);'
  s,n=re.subn(pattern,lambda m:m[1]+'(bpManhattanWaterBudget(map)?Math.min('+str(cap)+',('+m[2]+')):('+m[2]+'));',s,count=1)
  if n:water_changes.append(rel+':'+name)
 if 'if(z>=15&&coastalMesh&&!offshoreTilt)' in s:
  w('if(z>=15&&coastalMesh&&!offshoreTilt)','if(z>=15&&coastalMesh&&!offshoreTilt&&!bpManhattanWaterBudget(map))')
  water_changes.append(rel+':surf-barrel-budget')
 assert any(x.startswith(rel+':') for x in water_changes)
 p.write_text(s)
for rel in ('index.html','app/index.html'):
 p=site/rel;s=p.read_text();assert 'bridgepoint-auto-reality-v1.js?v=20261125manhattancoast3' in s;p.write_text(s.replace('bridgepoint-auto-reality-v1.js?v=20261125manhattancoast3','bridgepoint-auto-reality-v1.js?v=20261125manhattan4'))
assert hashes()==before
print('MANHATTAN_TRANSFORM_UNCHANGED',json.dumps(transform))
print('MANHATTAN_TRANSFER_BYTES',len(raw),(site/packed).stat().st_size)
print('MANHATTAN_WATER_LOCAL_BUDGET',water_changes)
print('MANHATTAN_V4_ONLY_PASS',len(before))
