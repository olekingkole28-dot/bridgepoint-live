"""Build global regional ocean coverage and actual coastline segments.
Natural Earth 1:10m public-domain data; viewport-local runtime mesh."""
import sys,math,zipfile,io,base64,struct,json
from pathlib import Path
import shapefile,shapely
from shapely.geometry import shape,box,Point
from shapely.ops import transform
from shapely.strtree import STRtree
src,out=map(Path,sys.argv[1:3])
with zipfile.ZipFile(src) as z:
 def part(ext):return io.BytesIO(z.read(next(n for n in z.namelist() if n.lower().endswith(ext))))
 with shapefile.Reader(shp=part('.shp'),shx=part('.shx'),dbf=part('.dbf')) as r:polys=[shape(s.__geo_interface__) for s in r.shapes()]
def merc(lon,lat,z=None):return ((lon+180)/360,(1-math.asinh(math.tan(math.radians(max(-85.05112878,min(85.05112878,lat)))))/math.pi)/2)
ocean=shapely.make_valid(shapely.union_all(polys)).intersection(box(-180,-85.05112878,180,85.05112878))
ocean=shapely.make_valid(transform(merc,ocean)).intersection(box(0,0,1,1)).simplify(0.000003,preserve_topology=True)
def polygons(g):
 if g.is_empty:return
 if g.geom_type=='Polygon':yield g
 elif hasattr(g,'geoms'):
  for c in g.geoms:yield from polygons(c)
N=128;Q=2**30;raw=bytearray();coast=bytearray();offsets=[0];area=0;triangles=[]
def pack(buf,xy):
 for x,y in xy:buf.extend(struct.pack('<II',max(0,min(Q,round(x*Q))),max(0,min(Q,round(y*Q)))))
for p in polygons(ocean):
 for ring in [p.exterior,*p.interiors]:
  for a,b in zip(ring.coords,list(ring.coords)[1:]):
   if any(abs(a[k]-v)<1e-8 and abs(b[k]-v)<1e-8 for k in (0,1) for v in (0,1)):continue
   if a!=b and math.dist(a,b)<.12:pack(coast,[a,b])
for j in range(N):
 for i in range(N):
  clip=ocean.intersection(box(i/N,j/N,(i+1)/N,(j+1)/N))
  for poly in polygons(clip):
   if poly.area<1e-15:continue
   for tri in polygons(shapely.constrained_delaunay_triangles(poly)):
    if tri.area<1e-15:continue
    xy=list(tri.exterior.coords)[:3];pack(raw,xy);area+=tri.area;triangles.append(tri)
  offsets.append(len(raw)//24)
assert len(raw)%24==0 and 10000<len(raw)<16000000
assert len(coast)%16==0 and len(coast)>10000
assert area/ocean.area>.99999,(area,ocean.area)
tree=STRtree(triangles)
for lon,lat in [(-40,20),(-150,20),(160,-25),(80,-20),(0,-50),(-179,0),(179,0),(-11,39),(-19,15),(-125,37)]:
 p=Point(*merc(lon,lat));assert any(triangles[k].covers(p) for k in tree.query(p)),('missing water',lon,lat)
for lon,lat in [(-100,40),(-8,39),(-15,15),(-120,37),(20,10),(135,-25)]:
 p=Point(*merc(lon,lat));assert not any(triangles[k].covers(p) for k in tree.query(p)),('land coverage',lon,lat)
out.write_text("export const trianglesB64='"+base64.b64encode(raw).decode()+"';\nexport const coastB64='"+base64.b64encode(coast).decode()+"';\nexport const cellOffsets="+json.dumps(offsets,separators=(',',':'))+";\n",encoding='ascii')
print('COASTAL_OCEAN_SOURCE_PASS',json.dumps({'triangles':len(raw)//24,'coastSegments':len(coast)//16,'areaFraction':area/ocean.area,'bytes':len(raw)+len(coast)}))
