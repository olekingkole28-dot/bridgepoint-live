from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1]);key='global-dense-liquid-coverage-v20261124-v7'
water='world-v2300-water.js'
allowed={'index.html','app/index.html','landing.js','app.js',water,'app/'+water}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def read(n):return (site/n).read_text(encoding='utf-8')
def write(n,s):(site/n).write_text(s,encoding='utf-8')
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('PATCH_ANCHOR '+str(s.count(a))+' '+a[:120])
 return s.replace(a,b,1)
s=read(water);baseline=s
shader=lambda src:src[src.index('function buildShaders('):src.index('function captureWaterGLState(')]
oldshader=shader(s)
encoded=Path(sys.argv[2]).read_text(encoding='ascii').strip()
assert re.fullmatch(r'[A-Za-z0-9+/=]+',encoded)
s=one(s,'const SURFACE_RENDER_REVISION = 6262;','const SURFACE_RENDER_REVISION = 6263;')
s=one(s,"const LAYER_ID = 'bp-water-surface-gpu-v6123';","""const LAYER_ID = 'bp-water-surface-gpu-v6123';
// Natural Earth public-domain 1:50m ocean polygons, clipped and triangulated on
// a 64x64 global grid. Packed directly in this module: no tile or fetch race.
// Exactly the same magnetic liquid shader is used for this and local geometry.
const GLOBAL_OCEAN_MESH_B64='"""+encoded+"""';
let globalOceanGeometry=null;
function getGlobalOceanGeometry(){
 if(globalOceanGeometry)return globalOceanGeometry;
 const str=atob(GLOBAL_OCEAN_MESH_B64),raw=new Uint8Array(str.length);
 for(let i=0;i<str.length;i++)raw[i]=str.charCodeAt(i);
 const dv=new DataView(raw.buffer),count=raw.length/4,mesh=new Float32Array(count*7);
 for(let i=0;i<count;i++){
  const p=i*7,b=i*4;
  mesh[p]=dv.getUint16(b,true)/65535;mesh[p+1]=dv.getUint16(b+2,true)/65535;
  mesh[p+2]=0;mesh[p+3]=3;mesh[p+4]=1;mesh[p+5]=0;mesh[p+6]=0;
 }
 globalOceanGeometry=mesh;return mesh;
}
""")
# A static full-world mesh is resident for the complete globe, including areas
# with no loaded vector tiles. Existing regional/street mesh is kept intact.
s=one(s,"  const layerRef = createLayer(api, map);","""  let globalOceanInstalled=false;
  function installGlobalOcean(){
    if(!api.active||!api.enabled||!layer||map.getZoom()>=3.5)return false;
    if(globalOceanInstalled&&layer.surfaceVertexCount)return true;
    const mesh=getGlobalOceanGeometry();
    layer.setGeometry(mesh,[]);
    globalOceanInstalled=true;
    api.globalOceanCoverage=true;
    api.globalOceanVertices=mesh.length/7;
    api.surfaceVertexCount=mesh.length/7;
    api.surfaceDataBytes=mesh.byteLength;
    api.waterGridStepWorld=1/64;
    api.geometryBuilds++;
    api.lastBuildCompletedAt=Date.now();
    api.lastBuildReason='complete-prebuilt-global-ocean';
    map.triggerRepaint?.();
    return true;
  }
  const layerRef = createLayer(api, map);""")
s=one(s,"if (map.getLayer(LAYER_ID)) { if (!layer.gl) scheduleBuild(80); return; }","if (map.getLayer(LAYER_ID)) { installGlobalOcean(); if (!layer.gl) scheduleBuild(80); return; }")
s=one(s,"map.addLayer(layer, before);\n      scheduleBuild(120);","map.addLayer(layer, before);\n      installGlobalOcean();\n      scheduleBuild(120);")
s=one(s,"const worldView = z < 3.5;","const worldView = z < 3.5;\n    if(worldView)installGlobalOcean();")
# Global marine coverage no longer relies on tile order, feature caps, or
# polygon clipping. Inland and flood geometry still use their old rules.
s=one(s,"if(!marineFeature(f)||marineVertices>=marineBudget)continue;","if(worldView||!marineFeature(f)||marineVertices>=marineBudget)continue;")
s=one(s,"if (layer) layer.setGeometry(surface, flow);","""if(worldView){
      const ocean=getGlobalOceanGeometry(),merged=new Float32Array(ocean.length+surface.length);
      merged.set(ocean);merged.set(surface,ocean.length);
      if(layer)layer.setGeometry(merged,flow);
      globalOceanInstalled=true;api.globalOceanCoverage=true;api.globalOceanVertices=ocean.length/7;
      api.exactMarineVertices=ocean.length/7;api.waterGridStepWorld=1/64;
    }else{
      if(layer)layer.setGeometry(surface,flow);
      globalOceanInstalled=false;api.globalOceanCoverage=false;
    }""")
s=one(s,"api.surfaceVertexCount = Math.floor(surface.length / 7);\n    api.flowVertexCount","api.surfaceVertexCount = layer ? layer.surfaceVertexCount : Math.floor(surface.length / 7);\n    api.flowVertexCount")
s=one(s,"api.surfaceDataBytes = surface.length * 4;","api.surfaceDataBytes = layer ? layer.surfaceData.byteLength : surface.length * 4;")
s=one(s,"map.on('zoomend', () => scheduleBuild(650, 'camera'));","""map.on('zoom',()=>{if(map.getZoom()<3.5)installGlobalOcean()});
  map.on('zoomend', () => scheduleBuild(650, 'camera'));""")
# The globally resident geometry cannot be discarded by a temporary source
# gap, and its first upload happens before the first vector mesh build.
assert shader(s)==oldshader,'THE APPROVED SHADER MUST BE BYTE-IDENTICAL'
for rel in (water,'app/'+water):write(rel,s)
for rel in ('landing.js','app.js'):
 old=read(rel);new,n=re.subn(re.escape(water)+r'\?v=[^\s\x22\x27)]+',water+'?v='+key,old)
 if n<1:raise SystemExit('missing water import '+rel)
 write(rel,new)
for rel,stem in [('index.html','landing.js'),('app/index.html','app.js')]:
 old=read(rel);new,n=re.subn(r'('+re.escape(stem)+r'\?v=)[^&\s\x22\x27]+',lambda m:m.group(1)+key,old,count=1)
 if n!=1:raise SystemExit('missing entry cache key '+rel)
 write(rel,new)
if snap()!=before:raise SystemExit('UNRELATED PRODUCTION FILE CHANGED')
assert (site/water).read_bytes()==(site/'app'/water).read_bytes()
print('GLOBAL_DENSE_LIQUID_COVERAGE_SCOPE_PASS',len(before),'unchanged production files; approved shader identical')
