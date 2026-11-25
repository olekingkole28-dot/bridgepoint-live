#!/usr/bin/env python3
"""Register truekit Manhattan using a coarse-to-fine geographic roof-height match.
Only suppress covered legacy structures after registration and successful native rendering."""
import sys,json,math,hashlib,struct,urllib.request,urllib.parse
from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter, maximum_filter, map_coordinates
from scipy.signal import fftconvolve
from scipy.optimize import minimize
from scipy.spatial import ConvexHull
from PIL import Image,ImageDraw
site=Path(sys.argv[1]); folder=site/'assets/manhattan-photogrammetry-v1'; uid='372bc495b3a941308f4a3198bc45e17b'
raw=(folder/'manhattan.glb').read_bytes();assert hashlib.sha256(raw).hexdigest()=='d38b5a3d490b71e21888eecd6cd5fc5a49cd3ec649efe00918303916d48d7cfc'
jl=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jl]);binary=memoryview(raw)[28+jl:]
allowed={'index.html','app/index.html','data/bp-auto-reality-v1.json','bridgepoint-public-scan-catalog-v1.json','bridgepoint-auto-reality-v1.js','assets/manhattan-photogrammetry-v1/registration.json'}
def hashes():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=hashes()
points=[]
for mesh in doc['meshes']:
 for p in mesh['primitives']:
  a=doc['accessors'][p['attributes']['POSITION']]; v=doc['bufferViews'][a['bufferView']]
  assert a['componentType']==5126
  q=np.ndarray((a['count'],3),dtype='<f4',buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',12),4))
  points.append(q[:,[0,2,1]].copy()*[1,1,-1])
pts=np.concatenate(points);x,y,z=pts.T
dx=.035;ix=np.floor((x-x.min())/dx).astype(int);iz=np.floor((z-z.min())/dx).astype(int)
shape=(iz.max()+1,ix.max()+1); height=np.full(shape,-np.inf);np.maximum.at(height,(iz,ix),y)
rr,cc=np.where(np.isfinite(height)); sy=height[rr,cc];sx=x.min()+(cc+.5)*dx;sz=z.min()+(rr+.5)*dx
lon0,lat0=-74.010,40.708;mx=111320*math.cos(math.radians(lat0));my=111132
url='https://data.cityofnewyork.us/resource/5zhs-2jue.json?'+urllib.parse.urlencode({'$select':'the_geom,height_roof,construction_year','$where':"intersects(the_geom, 'POLYGON((-74.033 40.690,-73.975 40.690,-73.975 40.736,-74.033 40.736,-74.033 40.690))')",'$limit':20000})
with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'BridgePoint-registration/2.0'}),timeout=120) as r:features=json.load(r)
assert isinstance(features,list) and 200<len(features)<20000
def reference(step,n):
 half=(n-1)/2; im=Image.new('F',(n,n),0);draw=ImageDraw.Draw(im)
 for f in sorted(features,key=lambda f:float(f.get('height_roof') or 0)):
  ht=float(f.get('height_roof') or 0)*.3048
  if not f.get('the_geom') or ht<3 or ht>650:continue
  for poly in f['the_geom']['coordinates']:
   draw.polygon([((a-lon0)*mx/step+half,(lat0-c)*my/step+half) for a,c in poly[0]],fill=ht)
 return np.asarray(im).copy()
# Broad search over scale and heading, with translation computed by FFT, not local
# minimization from a guessed center. High roofs are matched independently of ground.
step=16.;n=321;half=(n-1)/2
ref=reference(step,n); target=gaussian_filter(np.sqrt(maximum_filter(ref,size=3)),.85)
ref2=target*target
best=[]
for ground in [-1.18,-1.02,-.90]:
 for k in range(110,351,20):
  h=np.maximum(sy-ground,0)*k; mask=(h>25)&(h<650)
  if mask.sum()<100:continue
  a,b,hs=sx[mask],sz[mask],h[mask]
  for deg in range(0,360,8):
   th=math.radians(deg);c,s=math.cos(th),math.sin(th)
   u=np.rint(k*(c*a+s*b)/step).astype(int);v=np.rint(k*(-s*a+c*b)/step).astype(int)
   # odd dimensions centered at origin
   m=max(abs(u).max(),abs(v).max())+2
   if m>135:continue
   patch=np.zeros((2*m+1,2*m+1),np.float32)
   np.maximum.at(patch,(v+m,u+m),np.sqrt(hs))
   kernel=(patch>0).astype(np.float32)
   energy=float(np.sum(patch**2))
   if energy<=0:continue
   cross=fftconvolve(target,patch[::-1,::-1],mode='same')
   tenergy=fftconvolve(ref2,kernel[::-1,::-1],mode='same')
   # Match both spatial pattern and metric heights; exclude tiny partial matches.
   score=(2*cross)/(energy+np.maximum(tenergy,0)+1e-6)
   score[:35]=0;score[-35:]=0;score[:,:35]=0;score[:,-35:]=0
   iy,ix=np.unravel_index(np.argmax(score),score.shape)
   best.append((float(score[iy,ix]),(ix-half)*step,(iy-half)*step,th,k,ground))
best.sort(reverse=True);print('MANHATTAN_COARSE_CANDIDATES',best[:8])
assert best
# Validate on independently held-out tall roof samples. Keep fit within a
# physically plausible range and use a bounded local optimizer.
step=5.;n=961;half=(n-1)/2
ref=reference(step,n);soft=gaussian_filter(maximum_filter(ref,size=3),1.7); strict=maximum_filter(ref,size=3)
rng=np.random.default_rng(372); keep=rng.choice(len(sy),min(len(sy),12000),replace=False)
a,b,h0=sx[keep],sz[keep],sy[keep];split=np.arange(len(keep))%4!=0
def sample(v,train,grid):
 tx,tz,th,k,ground=v;c=np.cos(th);s=np.sin(th);h=(h0-ground)*k
 mask=(h>35)&(h<650)&(split if train else ~split)
 u=(tx+k*(c*a[mask]+s*b[mask]))/step+half;w=(tz+k*(-s*a[mask]+c*b[mask]))/step+half
 pred=map_coordinates(grid,[w,u],order=1,mode='constant',cval=0)
 return h[mask],pred
def objective(v):
 h,p=sample(v,True,soft)
 if len(h)<500:return 10
 weights=np.minimum(h/90,3)+.2
 return float(np.average(np.minimum(np.abs(p-h)/(35+h*.28),3),weights=weights))
candidates=[]
for q,tx,tz,th,k,ground in best[:12]:
 v=[tx,tz,th,k,ground]
 bounds=[(tx-100,tx+100),(tz-100,tz+100),(th-.16,th+.16),(max(100,k-25),min(365,k+25)),(max(-1.35,ground-.12),min(-.78,ground+.12))]
 r=minimize(objective,v,method='Powell',bounds=bounds,options={'maxiter':45,'xtol':.01,'ftol':.001})
 candidates.append((float(r.fun),r.x.tolist(),q))
candidates.sort(key=lambda c:c[0]);err,v,coarse=candidates[0];tx,tz,th,k,ground=v
h,p=sample(v,False,strict);tall=h>70
median=float(np.median(np.abs(p[tall]-h[tall]))) if tall.any() else 999
corr=float(np.corrcoef(h[tall],p[tall])[0,1]) if tall.sum()>20 else 0
cover=float(np.mean(p[tall]>25)) if tall.any() else 0
anchor=[lon0+tx/mx,lat0-tz/my]
accepted=bool(tall.sum()>70 and median<38 and corr>.52 and cover>.76 and coarse>.55)
# Source footprint, reduced inward so only fully covered features are suppressed.
c,s=math.cos(th),math.sin(th); east=k*(c*sx+s*sz); south=k*(-s*sx+c*sz)
xy=np.column_stack((east,south)); hull=xy[ConvexHull(xy).vertices]
cent=hull.mean(0); hull=cent+(hull-cent)*.90
ring=[[anchor[0]+u/mx,anchor[1]-w/my] for u,w in hull];ring.append(ring[0])
reg={'accepted':accepted,'coordinates':anchor,'scaleMetresPerSourceUnit':k,'headingDeg':math.degrees(th),'groundSourceY':ground,'holdoutTallRoofMedianErrorM':median,'holdoutTallRoofCorrelation':corr,'holdoutTallRoofCoverage':cover,'holdoutCount':int(tall.sum()),'coarseScore':coarse,'objective':err,'reference':'NYC Open Data Building Footprints','footprint':{'type':'Polygon','coordinates':[ring]},'surveyGrade':False}
print('MANHATTAN_GLOBE_REGISTRATION_V2',json.dumps(reg))
(folder/'registration.json').write_text(json.dumps(reg,indent=2))
# Always expose a clearly identified preview of the best supported transform.
# Do not remove any buildings if the independent validation did not pass.
p=site/'data/bp-auto-reality-v1.json';d=json.loads(p.read_text());row=next(x for x in d['items'] if x['id']=='city-photogrammetry:'+uid)
row.update(asset='/assets/manhattan-photogrammetry-v1/manhattan.glb',mobileAsset='/assets/manhattan-photogrammetry-v1/manhattan-mobile.glb',coordinates=anchor,minZoom=14.0,reachM=2500,datum='terrain',sourceScaleM=k,headingDeg=math.degrees(th),groundSourceY=ground,keepOrigin=True,offsetM=1.0,cityScan=True,registrationAccepted=accepted)
if accepted:row['replacementFootprint']=reg['footprint']
row['precision']='Approximate automatic roof-footprint registration; not survey-grade. '+('Covered legacy building features may be hidden only while native scan is rendered.' if accepted else 'Experimental alignment; legacy buildings retained because registration confidence is insufficient.')
d['nativeCount']=sum(bool(x.get('asset')) for x in d['items']);d['viewerOnlyCount']=len(d['items'])-d['nativeCount'];p.write_text(json.dumps(d,separators=(',',':')))
p=site/'bridgepoint-public-scan-catalog-v1.json';d=json.loads(p.read_text());item=next(x for x in d['items'] if x['id']==row['id']);item['coordinates']=anchor;item['precision']=row['precision'];p.write_text(json.dumps(d,separators=(',',':')))
p=site/'bridgepoint-auto-reality-v1.js';s=p.read_text()
def change(a,b):
 global s
 assert s.count(a)==1,(a[:100],s.count(a));s=s.replace(a,b,1)
change("const b=await bytes(row.asset);","const b=await bytes(row.cityScan&&row.mobileAsset&&(innerWidth<850||(navigator.deviceMemory&&navigator.deviceMemory<=4))?row.mobileAsset:row.asset);")
change(" root.traverse(o=>{if(!o.isMesh&&!o.isPoints)return;", " if(row.cityScan){const materials=new Map();root.traverse(o=>{if(!o.isMesh||!o.material)return;const convert=m=>{if(!m.map)return m;if(!materials.has(m))materials.set(m,new T.MeshBasicMaterial({map:m.map,color:m.color||0xffffff,side:T.FrontSide,vertexColors:m.vertexColors,transparent:m.transparent,opacity:m.opacity,alphaTest:m.alphaTest}));return materials.get(m)};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material)});for(const m of materials.keys())m.dispose();}\n root.traverse(o=>{if(!o.isMesh&&!o.isPoints)return;")
change("m.side=T.DoubleSide;m.depthTest=true;","m.side=row.cityScan?T.FrontSide:T.DoubleSide;m.depthTest=true;")
change("}api.active=ids;","}api.active=ids;")
# Only apply within filters to known legacy building layers; preserve original
# filters and restore them when the native mesh is no longer successfully drawn.
helper=r"""const CITY_LEGACY=/^gta-(?:context-(?:building|floor-lines|roofs|facade-detail|night-windows)|bp-(?:building|floor-lines|roofs|facade-detail|night-windows)|city-(?:buildings|floor-lines|building-roof-caps|roofs)|exact-(?:building|floor-lines|facade-detail|roof|night-windows)|building-outline)/;
function syncCityReplacement(state){
 const map=state.map,row=state.wanted.find(r=>r.cityScan&&r.registrationAccepted&&r.replacementFootprint&&api.active.includes(r.id));
 const mask=row?['!', ['within',row.replacementFootprint]]:null;
 state.cityFilters ||= new Map();
 if(!mask){for(const [id,f] of state.cityFilters){try{if(map.getLayer(id)&&JSON.stringify(map.getFilter(id))===JSON.stringify(f.applied))map.setFilter(id,f.original||null)}catch(_){}}state.cityFilters.clear();return}
 for(const layer of map.getStyle()?.layers||[]){if(!CITY_LEGACY.test(layer.id)||!['fill-extrusion','fill','line'].includes(layer.type))continue;try{
  const original=map.getFilter(layer.id), prev=state.cityFilters.get(layer.id);
  if(prev&&JSON.stringify(original)===JSON.stringify(prev.applied))continue;
  const applied=original?['all',original,mask]:mask;
  map.setFilter(layer.id,applied);state.cityFilters.set(layer.id,{original,applied});
 }catch(e){api.errors.cityReplacement=String(e.message||e)}}
}"""
change("function update(state){",helper+"\nfunction update(state){")
change("const chosen=new Set(state.wanted.map(r=>r.id));","const chosen=new Set(state.wanted.map(r=>r.id));syncCityReplacement(state);")
# Schedule one pass after rendering status changes, not continuous animation.
change("}api.active=ids;","}const prev=api.active.join('|');api.active=ids;if(ids.join('|')!==prev)schedule(state);")
change("if(current){current.dead=true;","if(current){current.wanted=[];syncCityReplacement(current);current.dead=true;")
change("bp-auto-reality-v1.json?v=20261125manhattan1","bp-auto-reality-v1.json?v=20261125manhattanglobe2")
p.write_text(s)
for rel in ('index.html','app/index.html'):
 p=site/rel;s=p.read_text();assert 'bridgepoint-auto-reality-v1.js?v=20261125manhattan1' in s;p.write_text(s.replace('bridgepoint-auto-reality-v1.js?v=20261125manhattan1','bridgepoint-auto-reality-v1.js?v=20261125manhattanglobe2'))
assert hashes()==before
print('MANHATTAN_GLOBE_ONLY_PASS',len(before),'REPLACEMENT_ENABLED',accepted)
