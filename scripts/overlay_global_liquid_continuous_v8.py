from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1]);key='global-liquid-continuous-v20261124-v8'
water='world-v2300-water.js'
allowed={'index.html','app/index.html','landing.js','app.js',water,'app/'+water}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def read(n):return (site/n).read_text(encoding='utf-8')
def write(n,s):(site/n).write_text(s,encoding='utf-8')
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('PATCH_ANCHOR '+str(s.count(a))+' '+a[:120])
 return s.replace(a,b,1)
s=read(water)
fragment=lambda v:v[v.index('const fragmentSource = ['):v.index("].join(",v.index('const fragmentSource = ['))]
oldfrag=fragment(s)
s=one(s,'const SURFACE_RENDER_REVISION = 6263;','const SURFACE_RENDER_REVISION = 6264;')
encoded=Path(sys.argv[2]).read_text(encoding='ascii').strip()
assert re.fullmatch(r'[A-Za-z0-9+/=]+',encoded)
s,n=re.subn(r"const GLOBAL_OCEAN_MESH_B64='[A-Za-z0-9+/=]+';","const GLOBAL_OCEAN_MESH_B64='"+encoded+"';",s,count=1)
assert n==1
s=one(s,'a 64x64 global grid','a 128x128 global grid')
s=one(s,'mesh[p+2]=0;mesh[p+3]=3;','mesh[p+2]=0;mesh[p+3]=3.25;')
s=s.replace('api.waterGridStepWorld=1/64','api.waterGridStepWorld=1/128')
# Global-only visual depth clearance. This is less than one tenth of one percent
# of Earth's radius; physical sea level and bathymetry are not changed.
# At street/region zoom all original local geometry and optical code are unchanged.
s=one(s,"'uniform float u_closeCurl;',","'uniform float u_closeCurl;',\n    'uniform float u_oceanZoom;',")
s=one(s,"'  gl_Position = projectTileFor3D(displacedPosition, a_height + offsetM);',","""'  float globeSeaClearance=(a_kind>3.1&&a_kind<3.4&&u_oceanZoom<3.5)?6000.0:0.0;',
    '  gl_Position = projectTileFor3D(displacedPosition, a_height + offsetM + globeSeaClearance);',""")
# Never draw the far coarser global mesh over a close view waiting for local data.
# The native bathymetry remains visible until the original close mesh is ready.
s=one(s,"if (this.surfaceVertexCount) {\n          this.bindAttributes(gl, info.attributes, this.buffer);\n          gl.drawArrays(gl.TRIANGLES, 0, this.surfaceVertexCount);\n        }","""if (this.surfaceVertexCount) {
          const first=z>=3.5&&api.globalOceanCoverage?Math.min(this.surfaceVertexCount,Number(api.globalOceanVertices||0)):0;
          if(this.surfaceVertexCount>first){
            this.bindAttributes(gl, info.attributes, this.buffer);
            gl.drawArrays(gl.TRIANGLES, first, this.surfaceVertexCount-first);
          }
        }""")
s=one(s,"api.globalOceanVertices=mesh.length/7;","api.globalOceanVertices=mesh.length/7;\n    api.globalOceanCurvatureClearanceM=6000;\n    api.globalOceanGridResolution=128;")
assert fragment(s)==oldfrag,'approved fragment shader changed'
# Both root and app versions, and only entry cache references, are updated.
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
print('GLOBAL_LIQUID_CONTINUOUS_SCOPE_PASS',len(before),'unchanged production files; approved optical shader identical')
