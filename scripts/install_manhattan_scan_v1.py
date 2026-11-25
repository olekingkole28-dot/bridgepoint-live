#!/usr/bin/env python3
"""Install exact truekit textured scan, with confidence-gated geographic registration."""
import sys, json, math, hashlib, struct, urllib.request, urllib.parse, collections
from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter, map_coordinates, maximum_filter
from scipy.optimize import differential_evolution, minimize
from PIL import Image, ImageDraw
site=Path(sys.argv[1]); source=Path(sys.argv[2]); uid='372bc495b3a941308f4a3198bc45e17b'
raw=(source/'manhattan.glb').read_bytes()
assert hashlib.sha256(raw).hexdigest()=='d38b5a3d490b71e21888eecd6cd5fc5a49cd3ec649efe00918303916d48d7cfc'
meta=json.loads((source/'metadata.json').read_text()); assert meta['uid']==uid and meta['user']['username']=='truekit' and meta['license']['slug']=='by'
jlen=struct.unpack_from('<I',raw,12)[0]; j=json.loads(raw[20:20+jlen]); b=memoryview(raw)[28+jlen:]
assert j['images'] and j['meshes']
asset='assets/manhattan-photogrammetry-v1/manhattan.glb'
cat='bridgepoint-public-scan-catalog-v1.json'; manifest='data/bp-auto-reality-v1.json'; renderer='bridgepoint-auto-reality-v1.js'
allowed={cat,manifest,renderer,'index.html','app/index.html',asset,'assets/manhattan-photogrammetry-v1/registration.json'}
def hashes():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=hashes()
def positions():
 out=[]
 for m in j['meshes']:
  for p in m['primitives']:
   a=j['accessors'][p['attributes']['POSITION']]; v=j['bufferViews'][a['bufferView']]
   assert a['componentType']==5126 and a['type']=='VEC3'
   q=np.ndarray((a['count'],3),dtype='<f4',buffer=b,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',12),4))
   out.append(q.copy())
 q=np.concatenate(out).astype(float)
 # The source root node rotates (x,y,z) to (x,z,-y).
 return q[:,[0,2,1]]*np.array([1,1,-1])
def register():
 pts=positions()
 print('MANHATTAN_SOURCE_BOUNDS',pts.min(0).tolist(),pts.max(0).tolist(),len(pts))
 # Max elevation in small local horizontal cells: match actual roof geometry rather
 # than relying on title, arbitrary bounds, or a guessed tower height.
 x,y,z=pts.T
 q=np.quantile(y,.40); hist,edges=np.histogram(y[y<=q],bins=150)
 ground=float((edges[np.argmax(hist)]+edges[np.argmax(hist)+1])/2)
 print('MANHATTAN_GROUND_ESTIMATE',ground)
 dx=.045; ix=np.floor((x-x.min())/dx).astype(int); iz=np.floor((z-z.min())/dx).astype(int)
 shape=(iz.max()+1,ix.max()+1); height=np.full(shape,-np.inf)
 np.maximum.at(height,(iz,ix),y-ground)
 rr,cc=np.where(np.isfinite(height)); h=height[rr,cc]; sx=x.min()+(cc+.5)*dx; sz=z.min()+(rr+.5)*dx
 # Include roof and low-ground samples, and hold out an independent spatial subset.
 mask=(h>.12)&(h<3.5); sx,sz,h=sx[mask],sz[mask],h[mask]
 rng=np.random.default_rng(372)
 sel=rng.choice(len(h),min(3600,len(h)),replace=False); sx,sz,h=sx[sel],sz[sel],h[sel]
 split=np.arange(len(h))%4!=0
 # City of New York public building footprints, in feet above local ground.
 lon0,lat0=-74.010,40.707; mx=111320*math.cos(math.radians(lat0)); my=111132
 url='https://data.cityofnewyork.us/resource/5zhs-2jue.json?'+urllib.parse.urlencode({'$select':'the_geom,height_roof,construction_year','$where':"intersects(the_geom, 'POLYGON((-74.025 40.694,-73.989 40.694,-73.989 40.723,-74.025 40.723,-74.025 40.694))')",'$limit':10000})
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'BridgePoint-registration/1.0'}),timeout=75) as r:features=json.load(r)
 assert isinstance(features,list) and 200<len(features)<10000
 step=4.; n=801; half=(n-1)/2
 im=Image.new('F',(n,n),0); draw=ImageDraw.Draw(im)
 for f in sorted(features,key=lambda f:float(f.get('height_roof') or 0)):
  if not f.get('the_geom'):continue
  ht=float(f.get('height_roof') or 0)*.3048
  if ht<3 or ht>650:continue
  for poly in f['the_geom']['coordinates']:
   ring=poly[0]; pix=[((a-lon0)*mx/step+half,(lat0-c)*my/step+half) for a,c in ring]
   draw.polygon(pix,fill=ht)
 ref=np.asarray(im).copy()
 # Broad search with softened roof footprints; finer optimization uses original alignment.
 soft=gaussian_filter(maximum_filter(ref,size=3),2.0)
 def transformed(v,mask):
  tx,tz,theta,k=v;c=np.cos(theta);s=np.sin(theta)
  xx=(tx+k*(c*sx[mask]+s*sz[mask]))/step+half;zz=(tz+k*(-s*sx[mask]+c*sz[mask]))/step+half
  return xx,zz,k*h[mask]
 def eval(v,mask,grid):
  xx,zz,hh=transformed(v,mask); yy=map_coordinates(grid,[zz,xx],order=1,mode='constant',cval=0)
  # Penalize height mismatch; high roof landmarks contribute more strongly.
  weight=np.minimum(hh/70,3)+.2
  err=np.average(np.minimum(np.abs(yy-hh)/(30+hh*.25),3),weights=weight)
  return float(err)
 bounds=[(-650,650),(-650,650),(-math.pi,math.pi),(65,230)]
 result=differential_evolution(lambda v:eval(v,split,soft),bounds,seed=372,popsize=28,maxiter=250,tol=.002,polish=False)
 refined=minimize(lambda v:eval(v,split,soft),result.x,method='Nelder-Mead',options={'maxiter':700,'xatol':.003})
 v=refined.x if refined.fun<result.fun else result.x
 tx,tz,theta,k=map(float,v)
 xx,zz,hh=transformed(v,~split); yy=map_coordinates(maximum_filter(ref,size=3),[zz,xx],order=1,mode='constant',cval=0)
 tall=hh>55; err=float(np.median(np.abs(yy[tall]-hh[tall]))) if tall.any() else 999.
 corr=float(np.corrcoef(hh[tall],yy[tall])[0,1]) if tall.sum()>20 else 0
 cover=float(np.mean(yy[tall]>25)) if tall.any() else 0
 score={'scaleMetresPerSourceUnit':k,'headingDeg':math.degrees(theta),'groundSourceY':ground,'coordinates':[lon0+tx/mx,lat0-tz/my],'holdoutTallRoofMedianErrorM':err,'holdoutTallRoofCorrelation':corr,'holdoutTallRoofCoverage':cover,'holdoutCount':int(tall.sum()),'objective':float(refined.fun),'reference':'https://data.cityofnewyork.us/resource/5zhs-2jue.json'}
 # Conservative acceptance, not survey-grade registration. Never remove unrelated
 # legacy geometry based only on an automatic match.
 score['accepted']=bool(65<=k<=230 and err<38 and corr>.58 and cover>.78 and tall.sum()>80 and abs(tx)<650 and abs(tz)<650)
 print('MANHATTAN_REGISTRATION',json.dumps(score))
 return score
try: reg=register()
except Exception as e:
 reg={'accepted':False,'error':str(e)};print('MANHATTAN_REGISTRATION_UNAVAILABLE',repr(e))
target=site/asset;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(raw)
(target.parent/'registration.json').write_text(json.dumps(reg,indent=2))
data=json.loads((site/cat).read_text()); ident='city-photogrammetry:'+uid
assert not any(x['id']==ident for x in data['items'])
anchor=reg.get('coordinates') if reg.get('accepted') else [-74.011,40.705]
precision=('Automatically matched to NYC public roof footprints; approximate registration, not survey-grade. Existing legacy buildings retained pending visual verification.' if reg.get('accepted') else 'Lower Manhattan site reference only; source GLB lacks survey coordinates. Native viewer available; automatic globe placement withheld pending reliable alignment.')
item={'id':ident,'title':'New York City. Manhattan — truekit photogrammetry','location':'Lower Manhattan, New York City, USA','category':'City & neighborhood photogrammetry','method':'Textured photogrammetry · 336,600 source faces · 148,707 source vertices','description':'Original truekit city mesh from the 2020 published scan, including Battery Park, streets, buildings, trees and waterfront. Original photographic texture and source GLB retained.','creator':'truekit','license':'CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/','source_url':meta['viewerUrl'],'viewer_url':meta['embedUrl'],'asset_url':'/'+asset,'coordinates':anchor,'precision':precision,'model_id':uid,'hosting':'BridgePoint-hosted model'}
data['items'].append(item);data['total']=len(data['items']); loc=collections.Counter(x['location'] for x in data['items']);data['locations']=[{'name':k,'count':v} for k,v in sorted(loc.items())];data['locationCount']=len(loc);data['hostingCounts']={'bridgepoint':sum(bool(x.get('asset_url')) for x in data['items']),'creator':sum(not bool(x.get('asset_url')) for x in data['items'])}
(site/cat).write_text(json.dumps(data,separators=(',',':'),ensure_ascii=True))
d=json.loads((site/manifest).read_text());row={k:item[k] for k in ('id','title','category','creator','license','source_url','viewer_url','coordinates','precision')}
row.update(minZoom=13,reachM=1600)
if reg.get('accepted'):
 row.update(asset='/'+asset,minZoom=12.5,datum='terrain',sourceScaleM=reg['scaleMetresPerSourceUnit'],headingDeg=reg['headingDeg'],groundSourceY=reg['groundSourceY'],keepOrigin=True,offsetM=0)
d['items'].append(row);d['catalogCount']=len(d['items']);d['nativeCount']=sum(bool(x.get('asset')) for x in d['items']);d['viewerOnlyCount']=d['catalogCount']-d['nativeCount']
(site/manifest).write_text(json.dumps(d,separators=(',',':'),ensure_ascii=True))
# Add source-space transform only for this registered model.
p=site/renderer;s=p.read_text();old="if(row.targetHeightM)root.scale.multiplyScalar(row.targetHeightM/size.y);";assert s.count(old)==1
s=s.replace(old,"if(finite(row.sourceScaleM)&&row.sourceScaleM>0){root.scale.multiplyScalar(row.sourceScaleM);root.position.y-=row.groundSourceY*row.sourceScaleM;}else "+old)
s=s.replace("fetch('/data/bp-auto-reality-v1.json',{cache:'force-cache'})","fetch('/data/bp-auto-reality-v1.json?v=20261125manhattan1',{cache:'force-cache'})")
p.write_text(s)
for rel in ('index.html','app/index.html'):
 p=site/rel; s=p.read_text();assert 'bridgepoint-auto-reality-v1.js?v=20261125v1' in s;s=s.replace('bridgepoint-auto-reality-v1.js?v=20261125v1','bridgepoint-auto-reality-v1.js?v=20261125manhattan1');p.write_text(s)
assert hashes()==before
print('MANHATTAN_ONLY_BYTE_PRESERVATION_PASS',len(before))
print('MANHATTAN_NATIVE_VIEWER_READY',len(raw),'AUTO_PLACEMENT',bool(reg.get('accepted')),'CATALOG_TOTAL',data['total'],'NATIVE_TOTAL',d['nativeCount'])
