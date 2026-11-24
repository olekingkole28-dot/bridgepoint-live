"""Build the complete, camera-independent Natural Earth 1:50m ocean mesh.
Natural Earth public domain. No live tile service required at app startup."""
from pathlib import Path
import sys, math, zipfile, base64, struct, json
import shapefile
import shapely
from shapely.geometry import shape,box,Point
from shapely.ops import transform
from shapely.strtree import STRtree
src,out=map(Path,sys.argv[1:3])
with zipfile.ZipFile(src) as z:
    def item(ext):
        import io
        name=next(n for n in z.namelist() if n.lower().endswith(ext))
        return io.BytesIO(z.read(name))
    with shapefile.Reader(shp=item('.shp'),shx=item('.shx'),dbf=item('.dbf')) as reader:
        polys=[shape(s.__geo_interface__) for s in reader.shapes()]
def merc(lon,lat,z=None):
    return ((lon+180)/360,(1-math.asinh(math.tan(math.radians(max(-85.05112878,min(85.05112878,lat)))))/math.pi)/2)
ocean=shapely.make_valid(shapely.union_all(polys)).intersection(box(-180,-85.05112878,180,85.05112878))
ocean=shapely.make_valid(transform(merc,ocean)).intersection(box(0,0,1,1)).simplify(0.000035,preserve_topology=True)
def polygons(g):
    if g.is_empty:return
    if g.geom_type=='Polygon':yield g
    elif hasattr(g,'geoms'):
        for c in g.geoms:yield from polygons(c)
# Short triangles track the curved globe instead of crossing the far hemisphere.
# Each geographic cell is clipped to the complete ocean polygon, including islands.
N=64
raw=bytearray(); triangles=[]; area=0
for j in range(N):
    for i in range(N):
        clipped=ocean.intersection(box(i/N,j/N,(i+1)/N,(j+1)/N))
        for poly in polygons(clipped):
            if poly.area<1e-13:continue
            mesh=shapely.constrained_delaunay_triangles(poly)
            for tri in polygons(mesh):
                if tri.area<1e-13:continue
                xy=list(tri.exterior.coords)[:3]
                q=[(min(65534,max(0,round(x*65535))),min(65535,max(0,round(y*65535)))) for x,y in xy]
                if len(set(q))!=3:continue
                if (q[1][0]-q[0][0])*(q[2][1]-q[0][1])==(q[1][1]-q[0][1])*(q[2][0]-q[0][0]):continue
                for x,y in q:raw.extend(struct.pack('<HH',x,y))
                triangles.append(tri);area+=tri.area
assert len(raw)%12==0 and 10000<len(raw)<1800000,len(raw)
assert area/ocean.area>.999,('coverage area',area/ocean.area)
tree=STRtree(triangles)
for lon,lat in [(-40,20),(-150,20),(150,-25),(80,-20),(0,-50),(-100,-50),(175,55),(-175,55),(30,80),(0,0),(-179,0),(179,0),(60,-55),(-130,45)]:
    p=Point(*merc(lon,lat))
    assert any(triangles[k].covers(p) for k in tree.query(p)),('missing ocean sample',lon,lat)
for lon,lat in [(-100,40),(-55,-10),(20,10),(90,45),(135,-25),(15,50)]:
    p=Point(*merc(lon,lat))
    assert not any(triangles[k].covers(p) for k in tree.query(p)),('land erroneously painted',lon,lat)
out.write_text(base64.b64encode(raw).decode('ascii'),encoding='ascii')
print('GLOBAL_OCEAN_COMPLETE_MESH_PASS',json.dumps({'source':'Natural Earth 50m ocean','cells_per_axis':N,'triangles':len(raw)//12,'bytes':len(raw),'area_fraction':area/ocean.area,'ocean_samples':14,'land_samples':6}))
