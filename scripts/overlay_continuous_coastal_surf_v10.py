from pathlib import Path
import sys,re,hashlib,shutil
site=Path(sys.argv[1]);key='continuous-coastal-surf-v20261124-v10'
water='world-v2300-water.js'
newfiles={'vendor/bp-coastal-mesh-v10.mjs','vendor/bp-coastal-data-v10.mjs'}
allowed={'index.html','app/index.html','landing.js','app.js',water,'app/'+water}|newfiles
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def read(n):return (site/n).read_text(encoding='utf-8')
def write(n,s):(site/n).write_text(s,encoding='utf-8')
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('PATCH_ANCHOR '+str(s.count(a))+' '+a[:140])
 return s.replace(a,b,1)
s=read(water)
s=one(s,'const SURFACE_RENDER_REVISION = 6265;','const SURFACE_RENDER_REVISION = 6266;')
s=one(s,"  let globalOceanInstalled=false;","""  let coastalMesh=null,coastalLoading=false,coastLegacyVisibility=new Map();
  function loadCoastalMesh(){
    if(coastalLoading||coastalMesh||destroyed)return;
    coastalLoading=true;
    void import('/vendor/bp-coastal-mesh-v10.mjs?v=continuous-coastal-surf-v20261124-v10').then(m=>{
      coastalMesh=m;api.coastalSourceReady=true;scheduleBuild(80,'camera');
    }).catch(e=>{api.coastalSourceError=String(e?.message||e).slice(0,160)}).finally(()=>{coastalLoading=false});
  }
  function syncCoastalLines(){
    // Replace only old decorative water outlines while the new surf is active.
    const active=!!(api.enabled&&api.coastalSurfaceActive);
    for(const id of ['gta-coast-foam','gta-coast-edge','gta-coast-shadow']){
      if(!map.getLayer(id))continue;
      if(active){
        if(!coastLegacyVisibility.has(id))coastLegacyVisibility.set(id,map.getLayoutProperty(id,'visibility')||'visible');
        if(map.getLayoutProperty(id,'visibility')!=='none')map.setLayoutProperty(id,'visibility','none');
      }else if(coastLegacyVisibility.has(id)){
        map.setLayoutProperty(id,'visibility',coastLegacyVisibility.get(id));coastLegacyVisibility.delete(id);
      }
    }
  }
  let globalOceanInstalled=false;""")
s=one(s,"map.addLayer(layer, before);\n      installGlobalOcean();","map.addLayer(layer, before);\n      installGlobalOcean();\n      loadCoastalMesh();")
# Also retry after installation and during coastal navigation.
s=one(s,"if (map.getLayer(LAYER_ID)) { installGlobalOcean();","if (map.getLayer(LAYER_ID)) { installGlobalOcean();loadCoastalMesh();")
s=one(s,"const offshoreTilt=z>=3.5&&Math.abs(map.getPitch())>=18&&safeOffshoreRect(bounds);\n    api.continuousOffshoreTilt=offshoreTilt;","""const offshoreSafe=z>=3.5&&safeOffshoreRect(bounds);
    const offshoreTilt=offshoreSafe&&Math.abs(map.getPitch())>=18;
    // A complete independent coastal mesh replaces the partial tile-local sea
    // at regional scales; offshore/top-down close rendering stays unchanged.
    const regionalCoast=!!(coastalMesh&&!worldView&&!offshoreSafe&&z<11);
    const fallbackCoast=!!(coastalMesh&&!worldView&&!offshoreSafe&&z>=11&&!waterFeatures.length);
    const useCoastalMesh=regionalCoast||fallbackCoast;
    api.continuousOffshoreTilt=offshoreTilt;""")
s=one(s,"&& !offshoreTilt && !(z>=3.5","&& !offshoreTilt && !useCoastalMesh && !(z>=3.5")
# Ensure the continuous geometry is emitted before other water geometry so its
# draw range can be isolated from the local terrain-tested pass.
s=one(s,"let marineVertices=0,marinePolygons=0,shoreSamples=0;","""let marineVertices=0,marinePolygons=0,shoreSamples=0,coastalVertices=0,coastalShoreVertices=0;
    if(useCoastalMesh){
      const dir=api.wind.direction*RAD;
      const result=coastalMesh.buildCoastalSurface(bounds,z,{latitude:map.getCenter().lat,maxVertices:api.low?80000:api.mobile?120000:180000},(x,y,shore)=>{
        pushVertex(surface,x,y,0,3.25,Math.sin(dir),-Math.cos(dir),-shore);
      });
      coastalVertices=result.count;coastalShoreVertices=result.shoreVertices;
      marineVertices=result.count;marinePolygons=result.baseTriangles;
      if(result.largestStep>0)api.waterGridStepWorld=Math.max(result.largestStep,1e-9);
    }
    api.coastalSurfaceVertices=coastalVertices;api.coastalShoreVertices=coastalShoreVertices;""")
# Exact source shoreline at higher zoom: keep existing bathymetry shoaling,
# supplement with real mapped shore-distance and do not lose shore detail.
s=one(s,"const shoreAt=(lng,lat)=>{if(z<8||shoreSamples++>700)return 0;try{const bed=map.queryTerrainElevation([lng,lat],{exaggerated:false});return Number.isFinite(bed)&&bed<0?clamp(1+bed/35,0,1):0}catch(_){return 0}};","""const shoreAt=(lng,lat)=>{
      const mapped=coastalMesh&&z>=7?coastalMesh.shoreStrength(mercX(lng),mercY(lat),coastalMesh.bandWorld(z,lat)):0;
      if(z<8||shoreSamples++>1800)return mapped;
      try{const bed=map.queryTerrainElevation([lng,lat],{exaggerated:false});return Math.max(mapped,Number.isFinite(bed)&&bed<0?clamp(1+bed/35,0,1):0)}catch(_){return mapped}
    };""")
s=one(s,"if(worldView||offshoreTilt||!marineFeature(f)||marineVertices>=marineBudget)continue;","if(worldView||offshoreTilt||useCoastalMesh||!marineFeature(f)||marineVertices>=marineBudget)continue;")
s=one(s,"if(offshoreTilt){\n      const countX","if(useCoastalMesh&&coastalVertices){api.verifiedOceanFallbackCells=0;}\n    else if(offshoreTilt){\n      const countX")
s=one(s,"if(kind===3||offshoreTilt&&kind===1)continue;","if(kind===3||offshoreTilt&&kind===1)continue;\n        if(useCoastalMesh&&kind===1&&coastalMesh.contains(mod1(xCenterRaw),yCenter))continue;")
# When the new coast mesh is active, it occupies the first vertex range;
# global-only and local water modes preserve their original buffers.
s=one(s,"if(worldView){\n      const ocean=getGlobalOceanGeometry(),merged=","""if(worldView){
      api.coastalSurfaceActive=false;api.coastalSurfaceVertices=0;syncCoastalLines();
      const ocean=getGlobalOceanGeometry(),merged=""")
s=one(s,"globalOceanInstalled=false;api.globalOceanCoverage=false;\n    }","""globalOceanInstalled=false;api.globalOceanCoverage=false;
      api.coastalSurfaceActive=coastalVertices>0||marineVertices>0&&z>=11&&!offshoreTilt;
      api.coastalSurfaceVertices=coastalVertices;syncCoastalLines();
    }""")
s=one(s,"api.globalOceanCoverage=true;\n    api.globalOceanVertices=mesh.length/7;","api.globalOceanCoverage=true;\n    api.coastalSurfaceActive=false;api.coastalSurfaceVertices=0;syncCoastalLines();\n    api.globalOceanVertices=mesh.length/7;")
# The regional sea is explicitly shoreline-clipped, so it can use the same
# isolated horizon-safe pass as the global mesh when viewed from far away.
s=one(s,"'  bool globalOcean=a_kind>3.1&&a_kind<3.4&&u_oceanZoom<3.5;',","'  bool globalOcean=a_kind>3.1&&a_kind<3.4&&u_oceanZoom<7.0;',")
s=one(s,"if(this.surfaceVertexCount>globalCount)gl.drawArrays(gl.TRIANGLES,globalCount,this.surfaceVertexCount-globalCount);","""const coastCount=!globalCount?Math.min(this.surfaceVertexCount,Number(api.coastalSurfaceVertices||0)):0;
          if(coastCount){
            const wet=Number(window.__BP_WATER_SUBMERGENCE_V2__||0);
            if(z<11&&wet<.02){gl.disable(gl.DEPTH_TEST);gl.disable(gl.CULL_FACE);}
            gl.drawArrays(gl.TRIANGLES,0,coastCount);
            if(savedWaterState.depthTest)gl.enable(gl.DEPTH_TEST);else gl.disable(gl.DEPTH_TEST);
            if(savedWaterState.cullFace)gl.enable(gl.CULL_FACE);else gl.disable(gl.CULL_FACE);
            api.coastalSurfaceFrames=(api.coastalSurfaceFrames||0)+1;
          }
          const first=globalCount+coastCount;
          if(this.surfaceVertexCount>first)gl.drawArrays(gl.TRIANGLES,first,this.surfaceVertexCount-first);""")
# Surf phase is a function of actual coastline distance, not arbitrary tile
# edges. Positive time advances the crest towards decreasing distance.
s=one(s,"'  float rollingWave=wave+0.40*sin(gerstnerPhaseC)+0.48*pow(max(0.0,sin(phaseA)),5.0)+shoaling*0.28*sin(phaseA*1.8-0.8);',","""'  float shoreTravel=6.2831853*(3.0*(1.0-shoaling)+u_time*0.58);',
    '  float shoreCrest=pow(max(0.0,sin(shoreTravel)),4.0);',
    '  float rollingWave=wave+0.40*sin(gerstnerPhaseC)+0.48*pow(max(0.0,sin(phaseA)),5.0)+shoaling*(0.28*sin(phaseA*1.8-0.8)+0.58*shoreCrest);',""")
s=one(s,"'    float shoreWash=shore*smoothstep(0.28,0.78,0.50+0.50*swash);',","""'    float shorePhase=6.2831853*(3.0*(1.0-shore)+u_time*0.58);',
    '    float surfCrest=waterMagRidge(shorePhase+0.20*sin(local.x+local.y),5.0);',
    '    float runup=0.5+0.5*sin(u_time*3.6442475);',
    '    float beachWash=shore*smoothstep(0.68,0.99,shore+0.20*runup)*smoothstep(0.12,0.74,runup);',
    '    float shoreWash=max(shore*smoothstep(0.28,0.78,0.50+0.50*swash),clamp(pow(shore,0.48)*surfCrest*0.94+beachWash*0.64,0.0,1.0));',""")
# New coastal effects are zero offshore; preserve the dense optical field.
s=one(s,"if (layer) layer.enabled = this.enabled;","if (layer) layer.enabled = this.enabled;\n      try{syncCoastalLines()}catch(_){}")
for rel in (water,'app/'+water):write(rel,s)
for n in newfiles:shutil.copyfile(Path(sys.argv[2])/Path(n).name,site/n)
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
print('CONTINUOUS_COASTAL_SURF_SCOPE_PASS',len(before),'unchanged production files')
