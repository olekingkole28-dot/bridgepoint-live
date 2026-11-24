from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1]);key='continuous-magnetic-ocean-v20261124-v9'
water='world-v2300-water.js'
allowed={'index.html','app/index.html','landing.js','app.js',water,'app/'+water}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def read(n):return (site/n).read_text(encoding='utf-8')
def write(n,s):(site/n).write_text(s,encoding='utf-8')
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('PATCH_ANCHOR '+str(s.count(a))+' '+a[:140])
 return s.replace(a,b,1)
s=read(water)
s=one(s,'const SURFACE_RENDER_REVISION = 6264;','const SURFACE_RENDER_REVISION = 6265;')
# The globe's native horizon-clipped projection is the correct compositing
# path for a sea-level surface at planetary scale, not terrain depth testing.
# Leave the actual local Gerstner projection untouched.
s=one(s,"'  float globeSeaClearance=(a_kind>3.1&&a_kind<3.4&&u_oceanZoom<3.5)?6000.0:0.0;',\n    '  gl_Position = projectTileFor3D(displacedPosition, a_height + offsetM + globeSeaClearance);',","""'  bool globalOcean=a_kind>3.1&&a_kind<3.4&&u_oceanZoom<3.5;',
    '  gl_Position = globalOcean?projectTile(a_pos):projectTileFor3D(displacedPosition, a_height + offsetM);',
    '  if(!globalOcean&&a_kind>2.5&&a_kind<3.5&&u_oceanZoom>=3.5){gl_Position.z=max(-gl_Position.w,gl_Position.z-gl_Position.w*0.000025);}',""")
# Same dense magnetic noise, with globe-only antialiasing tuned for the
# visible disk. The approved zoom>=5 expression is mathematically identical.
s=one(s,"float zoomScale=clamp(104.0*exp2(u_oceanZoom-0.6),104.0,32000000.0);","float globeDensity=mix(48.0,104.0,smoothstep(2.1,5.0,u_oceanZoom));float zoomScale=clamp(globeDensity*exp2(u_oceanZoom-0.6),globeDensity,32000000.0);")
# Isolate all temporary shared GL state, including horizon pass depth and culling.
s=one(s,"blend: gl.isEnabled(gl.BLEND), depthMask: param(gl.DEPTH_WRITEMASK),","blend: gl.isEnabled(gl.BLEND), depthMask: param(gl.DEPTH_WRITEMASK), depthTest:gl.isEnabled(gl.DEPTH_TEST), cullFace:gl.isEnabled(gl.CULL_FACE),")
s=one(s,"try { if (state.depthMask != null) gl.depthMask(state.depthMask); } catch (_) {}","""try { if (state.depthMask != null) gl.depthMask(state.depthMask); } catch (_) {}
  try { if(state.depthTest)gl.enable(gl.DEPTH_TEST);else gl.disable(gl.DEPTH_TEST); }catch(_){}
  try { if(state.cullFace)gl.enable(gl.CULL_FACE);else gl.disable(gl.CULL_FACE); }catch(_){}""")
a=s.index("        if (this.surfaceVertexCount) {\n          const first=z>=3.5")
b=s.index("        if (this.flowVertexCount)",a)
s=s[:a]+"""        if (this.surfaceVertexCount) {
          const globalCount=api.globalOceanCoverage?Math.min(this.surfaceVertexCount,Number(api.globalOceanVertices||0)):0;
          this.bindAttributes(gl,info.attributes,this.buffer);
          // Native globe projection clips at the horizon. No terrain depth
          // interference for this geographically clipped, sea-only pass.
          if(z<3.5&&globalCount){
            gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);
            gl.drawArrays(gl.TRIANGLES,0,globalCount);
            if(savedWaterState.depthTest)gl.enable(gl.DEPTH_TEST);else gl.disable(gl.DEPTH_TEST);
            if(savedWaterState.cullFace)gl.enable(gl.CULL_FACE);else gl.disable(gl.CULL_FACE);
            api.globalHorizonSurfaceFrames=(api.globalHorizonSurfaceFrames||0)+1;
          }
          if(this.surfaceVertexCount>globalCount)gl.drawArrays(gl.TRIANGLES,globalCount,this.surfaceVertexCount-globalCount);
        }
"""+s[b:]
# Use the embedded global ocean polygon mesh as a conservative interior
# classifier, independent of whichever vector tile the tilted camera loaded.
# A shoreline safety buffer keeps the fallback away from land.
s=one(s,"const EARTH_CIRCUMFERENCE_M = 40075016.68557849;","""let oceanInteriorIndex=null;
function oceanInteriorContains(x,y){
 if(y<=0||y>=1)return false;
 x=((x%1)+1)%1;
 const N=128;
 if(!oceanInteriorIndex){
  const mesh=getGlobalOceanGeometry();oceanInteriorIndex=Array.from({length:N*N},()=>[]);
  for(let i=0;i<mesh.length;i+=21){
   const ax=mesh[i],ay=mesh[i+1],bx=mesh[i+7],by=mesh[i+8],cx=mesh[i+14],cy=mesh[i+15];
   const x0=Math.max(0,Math.floor(Math.min(ax,bx,cx)*N)),x1=Math.min(N-1,Math.floor(Math.max(ax,bx,cx)*N));
   const y0=Math.max(0,Math.floor(Math.min(ay,by,cy)*N)),y1=Math.min(N-1,Math.floor(Math.max(ay,by,cy)*N));
   for(let j=y0;j<=y1;j++)for(let k=x0;k<=x1;k++)oceanInteriorIndex[j*N+k].push(i);
  }
 }
 const mesh=getGlobalOceanGeometry(),ids=oceanInteriorIndex[Math.min(N-1,Math.floor(y*N))*N+Math.min(N-1,Math.floor(x*N))];
 for(const i of ids){
   const ax=mesh[i],ay=mesh[i+1],bx=mesh[i+7],by=mesh[i+8],cx=mesh[i+14],cy=mesh[i+15];
   const a=(bx-ax)*(y-ay)-(by-ay)*(x-ax),b=(cx-bx)*(y-by)-(cy-by)*(x-bx),c=(ax-cx)*(y-cy)-(ay-cy)*(x-cx);
   if((a>=-1e-13&&b>=-1e-13&&c>=-1e-13)||(a<=1e-13&&b<=1e-13&&c<=1e-13))return true;
 }
 return false;
}
function safeOffshoreRect(b){
 // ~20 km of ocean on either side of the viewport sample, adjusted for
 // Mercator latitude. Never extend the approximation into a known coastline.
 const margin=0.00065;
 for(let j=0;j<=4;j++)for(let i=0;i<=4;i++){
  const x=b.x0+(b.x1-b.x0)*i/4,y=b.y0+(b.y1-b.y0)*j/4;
  for(const [dx,dy] of [[0,0],[-margin,0],[margin,0],[0,-margin],[0,margin],[-margin,-margin],[margin,margin],[-margin,margin],[margin,-margin]])if(!oceanInteriorContains(x+dx,y+dy))return false;
 }
 return true;
}
const EARTH_CIRCUMFERENCE_M = 40075016.68557849;""")
# A pitched view may see several tile extents farther than the centre.
# Fully offshore views get a single complete, overscanned, georeferenced
# mesh with a consistent tessellation; coastal and top-down paths stay intact.
s=one(s,"const waterFeatures = sourceFeatures(map, 'water', waterFeatureLimit, bounds);","""const waterFeatures = sourceFeatures(map, 'water', waterFeatureLimit, bounds);
    const offshoreTilt=z>=3.5&&Math.abs(map.getPitch())>=18&&safeOffshoreRect(bounds);
    api.continuousOffshoreTilt=offshoreTilt;""")
s=one(s,"if (!waterFeatures.length && !hasLandMask && !(z>=3.5&&Number(map.queryTerrainElevation?.(map.getCenter(),{exaggerated:false}))<-25)) {","if (!waterFeatures.length && !hasLandMask && !offshoreTilt && !(z>=3.5&&Number(map.queryTerrainElevation?.(map.getCenter(),{exaggerated:false}))<-25)) {")
s=one(s,"if(worldView||!marineFeature(f)||marineVertices>=marineBudget)continue;","if(worldView||offshoreTilt||!marineFeature(f)||marineVertices>=marineBudget)continue;")
s=one(s,"if(marineVertices===0&&z>=3.5&&typeof map.queryTerrainElevation==='function'){","""if(offshoreTilt){
      const countX=api.low?44:api.mobile?56:72,countY=countX;
      const sx=(bounds.x1-bounds.x0)/countX,sy=(bounds.y1-bounds.y0)/countY;
      const dir=api.wind.direction*RAD;let cells=0;
      const add=(x0,x1,y0,y1)=>{
        const q=[[x0,y0],[x1,y0],[x1,y1],[x0,y1]];
        for(const k of [0,1,2,0,2,3])pushVertex(surface,q[k][0],q[k][1],0,3,Math.sin(dir),-Math.cos(dir),0);
        cells++;
      };
      for(let j=0;j<countY;j++)for(let i=0;i<countX;i++){
        const x=bounds.x0+i*sx,y=bounds.y0+j*sy;if(y<0||y+sy>1)continue;
        const boundary=Math.floor(x)+1;
        if(x+sx>boundary){add(x,boundary-1e-8,y,y+sy);add(boundary,x+sx,y,y+sy)}
        else add(x,x+sx,y,y+sy);
      }
      api.verifiedOceanFallbackCells=cells;fallbackCells+=cells;
      api.waterGridStepWorld=Math.max(sx,sy);
    }else if(marineVertices===0&&z>=3.5&&typeof map.queryTerrainElevation==='function'){""")
s=one(s,"if(kind===3)continue;","if(kind===3||offshoreTilt&&kind===1)continue;")
s=one(s,"api.globalOceanCurvatureClearanceM=6000;","api.globalOceanCurvatureClearanceM=0;")
# Build at tilt completion even when the event doesn't involve a zoom change.
s=one(s,"map.on('zoomend', () => scheduleBuild(650, 'camera'));","map.on('zoomend', () => scheduleBuild(650, 'camera'));\n  map.on('pitchend',()=>scheduleBuild(120,'camera'));")
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
print('CONTINUOUS_MAGNETIC_OCEAN_SCOPE_PASS',len(before),'unchanged production files')
