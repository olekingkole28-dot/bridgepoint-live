#!/usr/bin/env python3
"""Match the native Manhattan scan to shoreline and independent tower locations."""
import sys, json, struct, urllib.request, urllib.parse, math
from pathlib import Path
import numpy as np
from PIL import Image,ImageDraw
from scipy.ndimage import maximum_filter,binary_fill_holes,binary_erosion,distance_transform_edt,map_coordinates,gaussian_filter
from scipy.spatial import cKDTree
from scipy.optimize import minimize
raw=Path(sys.argv[1]).read_bytes();jl=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+jl]);binary=memoryview(raw)[28+jl:]
pts=[]
for mesh in doc['meshes']:
 for p in mesh['primitives']:
  a=doc['accessors'][p['attributes']['POSITION']];v=doc['bufferViews'][a['bufferView']]
  q=np.ndarray((a['count'],3),dtype='<f4',buffer=binary,offset=v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',12),4))
  pts.append(q[:,[0,2,1]].copy()*[1,1,-1])
x,y,z=np.concatenate(pts).T
step=.04;ix=np.floor((x-x.min())/step).astype(int);iz=np.floor((z-z.min())/step).astype(int)
h=np.full((iz.max()+1,ix.max()+1),-3.);np.maximum.at(h,(iz,ix),y);h=maximum_filter(h,size=3)
valid=binary_fill_holes(h>-2);edge=valid&~binary_erosion(valid,iterations=2)
rr,cc=np.where(edge);edgepts=np.column_stack([x.min()+(cc+.5)*step,z.min()+(rr+.5)*step])
rr,cc=np.where(valid);rng=np.random.default_rng(372);sel=rng.choice(len(rr),min(2000,len(rr)),replace=False);landpts=np.column_stack([x.min()+(cc[sel]+.5)*step,z.min()+(rr[sel]+.5)*step])
peaks=np.argwhere((h==maximum_filter(h,size=17))&(h>-.3));unique=[]
for height,a,b in sorted([(float(h[i,j]),float(x.min()+(j+.5)*step),float(z.min()+(i+.5)*step)) for i,j in peaks],reverse=True):
 if all((a-p[0])**2+(b-p[1])**2>.18 for p in unique):unique.append((a,b,height))
src=np.array(unique[:28]);print('SOURCE_PEAKS',src.tolist())
lon0,lat0=-74.010,40.709;mx=111320*math.cos(math.radians(lat0));my=111132
def get(url,params):
 with urllib.request.urlopen(urllib.request.Request(url+'?'+urllib.parse.urlencode(params),headers={'User-Agent':'BridgePoint/3.0'}),timeout=100) as r:return json.load(r)
def metric(a,b):return ((a-lon0)*mx,(lat0-b)*my)
bb=get('https://services2.arcgis.com/IsDCghZ73NgoYoz5/ArcGIS/rest/services/nybb/FeatureServer/0/query',{'where':'1=1','outFields':'*','returnGeometry':'true','outSR':4326,'f':'geojson'})
assert bb.get('features')
g=5.;n=1201;half=(n-1)/2
land=Image.new('L',(n,n),0);draw=ImageDraw.Draw(land)
for f in bb['features']:
 geo=f['geometry'];polys=geo['coordinates'] if geo['type']=='MultiPolygon' else [geo['coordinates']]
 for p in polys:
  for i,ring in enumerate(p):
   draw.polygon([(a/g+half,b/g+half) for a,b in (metric(*q[:2]) for q in ring)],fill=1 if i==0 else 0)
land=np.asarray(land)>0
inside=distance_transform_edt(land)*g;outside=distance_transform_edt(~land)*g;coast=inside+outside
features=get('https://data.cityofnewyork.us/resource/5zhs-2jue.json',{'$select':'the_geom,height_roof,construction_year','$where':"intersects(the_geom, 'POLYGON((-74.025 40.695,-73.988 40.695,-73.988 40.729,-74.025 40.729,-74.025 40.695))')",'$limit':16000})
assert isinstance(features,list) and len(features)>200
roof=Image.new('F',(n,n),0);draw=ImageDraw.Draw(roof); refs=[]
for f in sorted(features,key=lambda f:float(f.get('height_roof') or 0)):
 ht=float(f.get('height_roof') or 0)*.3048
 if not f.get('the_geom') or ht<3 or ht>650:continue
 for p in f['the_geom']['coordinates']:
  poly=np.array([metric(*q[:2]) for q in p[0]])
  draw.polygon([(a/g+half,b/g+half) for a,b in poly],fill=ht)
  if ht>90:refs.append([*poly[:-1].mean(0),ht])
ref=np.asarray(roof).copy();refs=np.array(sorted(refs,key=lambda a:-a[2]))
assert len(refs)>25
# Discard coincident roof parts from peak list.
refpeaks=[]
for p in refs:
 if all(np.linalg.norm(p[:2]-q[:2])>35 for q in refpeaks):refpeaks.append(p)
refs=np.asarray(refpeaks[:100]);tree=cKDTree(refs[:,:2])
print('REFERENCE_TOWERS',len(refs),refs[:12].tolist())
def xy(v,p):
 tx,tz,th,k=v[:4];c,s=np.cos(th),np.sin(th)
 return np.column_stack((tx+k*(c*p[:,0]+s*p[:,1]),tz+k*(-s*p[:,0]+c*p[:,1])))
def gridval(grid,xy,cval=0):return map_coordinates(grid,[xy[:,1]/g+half,xy[:,0]/g+half],order=1,mode='constant',cval=cval)
def peakscore(v):
 loc=xy(v,src[:16]);dist,ind=tree.query(loc,k=3)
 hh=(src[:16,2]-v[4])*v[3]
 # score peak spatial distance and height; tolerates incomplete/changed towers.
 err=np.min(np.minimum(dist/75,3)+.55*np.minimum(abs(refs[ind,2]-hh[:,None])/(40+.2*hh[:,None]),3),axis=1)
 return np.mean(err)
# Generate candidate transforms from pairs of source peaks and real tower centers.
cands=[]
for i in range(5):
 for j in range(i+1,9):
  d=src[j,:2]-src[i,:2];dn=np.linalg.norm(d)
  if dn<.5:continue
  for a in refs[:35]:
   diff=refs[:55,:2]-a[:2];kn=np.linalg.norm(diff,axis=1)/dn
   for b,k in zip(refs[:55],kn):
    if not 150<k<400:continue
    th=np.arctan2(d[1],d[0])-np.arctan2(b[1]-a[1],b[0]-a[0]);c,s=np.cos(th),np.sin(th)
    tx,tz=a[:2]-k*np.array([c*src[i,0]+s*src[i,1],-s*src[i,0]+c*src[i,1]])
    if abs(tx)>1800 or abs(tz)>1900:continue
    ground=np.clip((src[i,2]-a[2]/k+src[j,2]-b[2]/k)/2,-1.3,-.8)
    v=[tx,tz,th,k,ground]
    cands.append((peakscore(v),v))
cands.sort(key=lambda a:a[0]);print('PEAK_CANDIDATES',len(cands),cands[:5]);assert cands
# Check the top several hundred fits against actual shoreline and holdout roofs.
def coastscore(v):
 out=gridval(outside,xy(v,landpts),3000);dist=gridval(coast,xy(v,edgepts),3000)
 # Partial scan edges may be cropped, but waterfront points should match shoreline.
 return np.mean(np.minimum(out/45,5))+.50*np.mean(np.minimum(np.sort(dist)[:max(1,len(dist)//3)]/35,5))
rr,cc=np.where(h>-2);sel=rng.choice(len(rr),min(6000,len(rr)),replace=False)
roofpts=np.column_stack([x.min()+(cc[sel]+.5)*step,z.min()+(rr[sel]+.5)*step,h[rr[sel],cc[sel]]]);train=np.arange(len(roofpts))%4!=0
soft=gaussian_filter(maximum_filter(ref,size=3),1.4)
def roofscore(v,training=True):
 p=roofpts[train if training else ~train];hh=(p[:,2]-v[4])*v[3];keep=(hh>40)&(hh<650);hh=hh[keep]
 if len(hh)<100:return 3.
 pred=gridval(soft,xy(v,p[keep,:2]))
 return np.mean(np.minimum(abs(pred-hh)/(35+.3*hh),3))
def objective(v):return .48*peakscore(v)+.75*coastscore(v)+.65*roofscore(v)
chosen=[];seen=set()
for _,v in cands[:1200]:
 key=(round(v[0]/60),round(v[1]/60),round((v[2]%(2*np.pi))/.12),round(v[3]/15))
 if key in seen:continue
 seen.add(key);chosen.append((objective(v),v))
chosen.sort(key=lambda a:a[0]);print('COAST_CANDIDATES',chosen[:10])
result=[]
for score,v in chosen[:12]:
 tx,tz,th,k,ground=v
 bounds=[(tx-100,tx+100),(tz-100,tz+100),(th-.15,th+.15),(max(145,k-30),min(415,k+30)),(-1.35,-.78)]
 r=minimize(objective,v,method='Powell',bounds=bounds,options={'maxiter':50,'xtol':.008,'ftol':.001})
 result.append((float(r.fun),r.x.tolist()))
result.sort(key=lambda a:a[0]);score,v=result[0]
tx,tz,th,k,ground=v;loc=xy(v,src[:16]);dist,ind=tree.query(loc);p=roofpts[~train];hh=(p[:,2]-ground)*k;mask=(hh>70)&(hh<650)
pred=gridval(maximum_filter(ref,size=3),xy(v,p[mask,:2]));hh=hh[mask]
median=float(np.median(abs(pred-hh)));corr=float(np.corrcoef(pred,hh)[0,1]);cover=float(np.mean(pred>25));out=gridval(outside,xy(v,landpts),3000);landfrac=float(np.mean(out<25));peakmedian=float(np.median(dist))
reg={'coordinates':[lon0+tx/mx,lat0-tz/my],'headingDeg':math.degrees(th),'scaleMetresPerSourceUnit':k,'groundSourceY':ground,'holdoutRoofMedianErrorM':median,'holdoutRoofCorrelation':corr,'holdoutRoofCoverage':cover,'landCoverage':landfrac,'peakMedianDistanceM':peakmedian,'objective':score,'surveyGrade':False}
reg['accepted']=bool(landfrac>.88 and peakmedian<80 and cover>.77 and corr>.45 and median<50 and len(hh)>70)
# Conservative footprint derived from sampled mesh, only covered legacy features.
from scipy.spatial import ConvexHull
p=xy(v,landpts);hull=p[ConvexHull(p).vertices];center=hull.mean(0);hull=center+.88*(hull-center);ring=[[lon0+a/mx,lat0-b/my] for a,b in hull];ring.append(ring[0]);reg['footprint']={'type':'Polygon','coordinates':[ring]}
print('MANHATTAN_V3_REGISTRATION',json.dumps(reg));print('MATCHED_PEAKS',[(src[i].tolist(),[lon0+a/mx,lat0-b/my],float(dist[i]),float(refs[ind[i],2])) for i,(a,b) in enumerate(loc)])
Path(sys.argv[2]).write_text(json.dumps(reg,indent=2))
