from pathlib import Path
import sys,re,hashlib,shutil
site=Path(sys.argv[1]);vendor=Path(sys.argv[2])
key='liquid-seamless-ocean-v20261123-v3'
water='world-v2300-water.js';sensor='world-v2300-sensor-layers.js';world='world-v2300-map.js'
allowed={'index.html','app/index.html','landing.js','app.js','vendor/bp-earcut-v3.mjs','vendor/bp-ocean-mesh-v3.mjs'}|{p+n for p in ('','app/') for n in (water,sensor,world)}
def snap():
 return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('PATCH_ANCHOR '+str(s.count(a))+' '+a[:130])
 return s.replace(a,b,1)
def patch_water(s):
 s="import {buildOceanPolygonMesh,oceanFallbackTexture} from '/vendor/bp-ocean-mesh-v3.mjs';\n"+s
 s=one(s,'const SURFACE_RENDER_REVISION = 6258;','const SURFACE_RENDER_REVISION = 6259;')
 s=one(s,'function marineFeature(feature) {','function marineFeature(feature) {\n  if(feature.bpMarine===true)return true;')
 # Replace coarse solid fill with a smooth vector-clipped base. It covers the entire
 # native polygon even before a new 3D mesh is ready; no raster seafloor pixels leak.
 s=one(s,"const OCEAN_COVER_ID='bp-liquid-ocean-cover-v2';","const OCEAN_COVER_ID='bp-liquid-ocean-cover-v2',OCEAN_PATTERN_ID='bp-liquid-ocean-pattern-v3';")
 s=one(s,"if(!map.getLayer(OCEAN_COVER_ID)){","if(!map.hasImage(OCEAN_PATTERN_ID))map.addImage(OCEAN_PATTERN_ID,oceanFallbackTexture());\n    if(!map.getLayer(OCEAN_COVER_ID)){")
 s=one(s,"'fill-color':'#0b2b40','fill-opacity':1,'fill-antialias':true","'fill-pattern':OCEAN_PATTERN_ID,'fill-opacity':1,'fill-antialias':true")
 # Water geometry now tracks polygon outlines, not a coarse rectangular world grid.
 s=one(s,"const waterFeatures = sourceFeatures(map, 'water', waterFeatureLimit, bounds);","""const waterFeatures = sourceFeatures(map, 'water', waterFeatureLimit, bounds);
    if(z>=5&&typeof map.queryTerrainElevation==='function'){
      const c=map.getCenter();
      for(const f of waterFeatures){
        if(marineFeature(f))continue;
        const b=f.bbox,mid=[(b[0]+b[2])*.5,(b[1]+b[3])*.5];
        const candidates=[[c.lng,c.lat],mid];
        for(const ring of f.parts.slice(0,2).map(p=>p[0]||[])){
          if(ring.length>2){const i=Math.floor(ring.length*.25),j=Math.floor(ring.length*.65);candidates.push([(ring[i][0]+ring[j][0])*.5,(ring[i][1]+ring[j][1])*.5])}
        }
        for(const pt of candidates){if(!featureContains(f,pt[0],pt[1]))continue;try{const bed=map.queryTerrainElevation(pt,{exaggerated:false});if(Number.isFinite(bed)&&bed<-12){f.bpMarine=true;break}}catch(_){}}
      }
    }""")
 s=one(s,"    for (let j = 0; j < ny; j++) {","""    // Exact source marine rings (including holes) are triangulated and subdivided.
    // Keep the old bounded grid only for inland and explicitly reported flood water.
    const marineBudget=worldView?(api.low?10000:api.mobile?18000:26000):(api.low?18000:api.mobile?32000:60000);
    let marineVertices=0,marinePolygons=0,shoreSamples=0;
    const shoreAt=(lng,lat)=>{if(z<8||shoreSamples++>700)return 0;try{const bed=map.queryTerrainElevation([lng,lat],{exaggerated:false});return Number.isFinite(bed)&&bed<0?clamp(1+bed/35,0,1):0}catch(_){return 0}};
    for(const f of waterFeatures){
      if(!marineFeature(f)||marineVertices>=marineBudget)continue;
      const b=f.bbox,level=sceneLevelAt(scene,(b[0]+b[2])*.5,(b[1]+b[3])*.5);
      const h=Number.isFinite(level)&&Math.abs(level)<=MAX_VALID_MARINE_SURFACE_OFFSET_M?level:0;
      const dir=api.wind.direction*RAD,fx=Math.sin(dir),fy=-Math.cos(dir);
      const r=buildOceanPolygonMesh(f.parts,{maxVertices:marineBudget-marineVertices,step:Math.max(dx,dy)*.50,shoreAt},(x,y,shore)=>pushVertex(surface,x,y,h,3,fx,fy,-shore));
      marineVertices+=r.count;marinePolygons+=r.polygons;
    }
    api.exactMarineVertices=marineVertices;api.exactMarinePolygons=marinePolygons;
    for (let j = 0; j < ny; j++) {""")
 s=one(s,"let kind = waterFeature && marineFeature(waterFeature) ? 3 : 1;","let kind = waterFeature && marineFeature(waterFeature) ? 3 : 1;\n        if(kind===3)continue;")
 s=one(s,"api.waterPolygonCells = polygonCells;","api.waterPolygonCells = polygonCells+marinePolygons;")
 # Match native fallback to the approved shader, and preserve smooth physical crests.
 s=one(s,"vec3(0.008,0.065,0.145),vec3(0.025,0.35,0.54)","vec3(0.012,0.075,0.145),vec3(0.045,0.30,0.48)")
 # Less sampling-dependent moire at the horizon.
 s=one(s,"float foamMask=clamp(max(ribbon,filament)*0.18+foam*0.19+highlight*0.32+whitecap*0.86+shoreWash*0.87,0.0,1.0);","float foamMask=clamp(max(ribbon,filament)*0.12+foam*0.10+highlight*0.22+whitecap*0.94+shoreWash*0.87,0.0,1.0);")
 return s
def patch_world(s):
 # Satellite imagery cannot supply an underwater photograph. Do not leave
 # placeholder tiles covering the measured 3D relief after submersion.
 s=one(s,"const targetVisibility=blenderWorldEnabled?'none':'visible';","const targetVisibility=(blenderWorldEnabled||Number(window.__BP_WATER_SUBMERGENCE_V2__||0)>.02)?'none':'visible';")
 s=one(s,"   let oceanFill='unavailable';","""   try{
    const submerged=Number(window.__BP_WATER_SUBMERGENCE_V2__||0)>.02;
    if(map.getLayer('gta-bg')){
     if(submerged){if(!map.__bpPreDiveBackground)map.__bpPreDiveBackground=map.getPaintProperty('gta-bg','background-color')||'#040b12';if(map.getPaintProperty('gta-bg','background-color')!=='#294a58')map.setPaintProperty('gta-bg','background-color','#294a58')}
     else if(map.__bpPreDiveBackground){map.setPaintProperty('gta-bg','background-color',map.__bpPreDiveBackground);delete map.__bpPreDiveBackground}
    }
   }catch(_){}
   let oceanFill='unavailable';""")
 return s
def patch_sensor(s):
 s=one(s,"if(token!==bubbleToken||!state.diving||!diveFx?.classList.contains('active'))return;","if(token!==bubbleToken||!(state.diving||state.autoSubmerged)||!diveFx?.classList.contains('active'))return;")
 s=one(s,"if(!state.diving||!bubbleRenderer||!bubbleMesh)","if(!(state.diving||state.autoSubmerged)||!bubbleRenderer||!bubbleMesh)")
 a=s.index(' function updateSubmergence(){');b=s.index(' const pause=',a)
 s=s[:a]+""" let lastSubmergeCheck=0,autoDiveArmed=true,autoDivePending=false;
 function currentCameraBed(){
  try{const t=map.transform||map._transform;const point=t?.getCameraLngLat?.()||map.getCenter();return map.queryTerrainElevation?.(point,{exaggerated:false})}catch(_){return null}
 }
 function updateSubmergence(force=false){
  const now=performance.now();if(force!==true&&now-lastSubmergeCheck<80)return;lastSubmergeCheck=now;
  const altitude=cameraAltitude();if(altitude===null)return;
  const prev=Number(window.__BP_WATER_SUBMERGENCE_V2__||0);
  const bed=currentCameraBed(),ocean=Number.isFinite(bed)&&bed<-4;
  const wet=altitude<0&&(ocean||state.diving||(prev>0&&!Number.isFinite(bed)));
  if(!state.diving)state.autoSubmerged=wet;
  const depth=wet?Math.max(0,-altitude):0,q=Math.min(1,depth/6),amount=q*q*(3-2*q);
  window.__BP_WATER_SUBMERGENCE_V2__=amount;
  if(!state.diving)window.__BP_UNDERWATER_DIVE_ACTIVE__=wet;
  const cover='bp-liquid-ocean-cover-v2';
  if(map.getLayer(cover)){const vis=amount>.02?'none':'visible';if(map.getLayoutProperty(cover,'visibility')!==vis)map.setLayoutProperty(cover,'visibility',vis)}
  if(wet&&(!map.getLayer(B)||!state.surface)){state.surface=true;try{addDepth()}catch(_){}}
  if(map.getLayer(B)){const vis=wet?'visible':'none';if(map.getLayoutProperty(B,'visibility')!==vis)map.setLayoutProperty(B,'visibility',vis)}
  if(wet&&(!diveFx?.classList.contains('active')))startDiveEffects(true,depth);
  else if(wet&&diveFx)diveFx.style.setProperty('--bp-dive-depth',String(Math.min(1,depth/250)));
  else if(!wet&&diveFx?.classList.contains('active'))stopDiveEffects();
  if((prev>.02)!==(amount>.02))map.triggerRepaint?.();
 }
 function autoOceanDive(){
  updateSubmergence(true);
  if(diveBusy||liquidBusy||autoDivePending||dead)return;
  const z=map.getZoom(),alt=cameraAltitude(),bed=currentCameraBed();
  if(z<14||Number.isFinite(bed)&&bed>=-4)autoDiveArmed=true;
  // Pinch close to the sea surface over measured deep water to begin a continuous
  // descent; never do this over land or when depth data is unavailable.
  if(!state.diving&&!state.autoSubmerged&&autoDiveArmed&&z>=15.5&&alt!==null&&alt>=0&&alt<35&&Number.isFinite(bed)&&bed<-25){
   autoDiveArmed=false;autoDivePending=true;void setDive(true).finally(()=>{autoDivePending=false})
  }else if(state.diving&&alt!==null&&alt>8&&z<14&&!autoDivePending){void setDive(false)}
 }
"""+s[b:]
 s=one(s,"map.on('move',updateSubmergence);","map.on('move',updateSubmergence);map.on('moveend',autoOceanDive);map.on('sourcedata',onDiveTerrainData);")
 s=one(s," const onStyle=()=>"," const onDiveTerrainData=e=>{if(e?.sourceId===D||e?.sourceId==='dem')updateSubmergence()};\n const onStyle=()=>")
 s=one(s,"map.off('move',updateSubmergence);","map.off('move',updateSubmergence);map.off('moveend',autoOceanDive);map.off('sourcedata',onDiveTerrainData);")
 # Ensure the terrain is requested while zooming below sea level even if the old
 # optional water controller failed its startup race.
 s=one(s,"if(!state.surface){state.surface=true;sync()}","if(!state.surface){state.surface=true;sync()}")
 return s
(site/'vendor').mkdir(exist_ok=True)
shutil.copyfile(vendor/'bp-earcut-v3.mjs',site/'vendor/bp-earcut-v3.mjs')
shutil.copyfile(vendor/'bp-ocean-mesh-v3.mjs',site/'vendor/bp-ocean-mesh-v3.mjs')
for name,fn in [(water,patch_water),(sensor,patch_sensor),(world,patch_world)]:
 result=fn((site/name).read_text(encoding='utf-8'))
 for rel in (name,'app/'+name):
  path=site/rel
  if not path.is_file():raise SystemExit('missing module '+rel)
  path.write_text(result,encoding='utf-8')
for rel in ('landing.js','app.js'):
 path=site/rel;s=path.read_text(encoding='utf-8')
 for name in (water,sensor,world):
  s,n=re.subn(re.escape(name)+r'\?v=[^\s\x22\x27)]+',name+'?v='+key,s)
  if name!=sensor and n<1:raise SystemExit('missing module import '+rel+' '+name)
 path.write_text(s,encoding='utf-8')
for rel,stem in [('index.html','landing.js'),('app/index.html','app.js')]:
 path=site/rel;s=path.read_text(encoding='utf-8')
 s,n=re.subn(r'('+re.escape(stem)+r'\?v=)[^&\s\x22\x27]+',lambda m:m.group(1)+key,s,count=1)
 if n!=1:raise SystemExit('missing entry cache key '+rel)
 s=re.subn(re.escape(world)+r'\?v=[^&\s\x22\x27]+',world+'?v='+key,s)[0]
 path.write_text(s,encoding='utf-8')
if snap()!=before:raise SystemExit('unrelated production assets changed')
for name in (water,sensor,world):assert (site/name).read_bytes()==(site/'app'/name).read_bytes()
print('SEAMLESS_OCEAN_SCOPE_PASS',len(before),'unrelated files preserved')
