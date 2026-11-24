from pathlib import Path
import sys, re, hashlib, shutil
site=Path(sys.argv[1]);key='public-living-ocean-v20261123-v4'
water='world-v2300-water.js';sensor='world-v2300-sensor-layers.js';world='world-v2300-map.js';space='bridgepoint-app-space-explorer-v1.js'
modules=['bp-ocean-relief-v4.mjs','bp-public-globe-v4.mjs']
allowed={'index.html','app/index.html','landing.js','app.js',space,'vendor/bp-ocean-mesh-v3.mjs'}|{'vendor/'+x for x in modules}|{p+n for p in ('','app/') for n in (water,sensor,world)}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('PATCH_ANCHOR '+str(s.count(a))+' '+a[:130])
 return s.replace(a,b,1)
def regex(s,p,r,required=True):
 s,n=re.subn(p,r,s,flags=re.S)
 if required and not n:raise SystemExit('REGEX_ANCHOR '+p[:150])
 return s
def write(rel,s): (site/rel).write_text(s,encoding='utf-8')
def read(rel):return (site/rel).read_text(encoding='utf-8')
def patch_water(s):
 s="import {installOceanRelief} from '/vendor/bp-ocean-relief-v4.mjs';\n"+s
 s=one(s,'const SURFACE_RENDER_REVISION = 6259;','const SURFACE_RENDER_REVISION = 6260;')
 s=one(s,"const amp = 2.35;","const amp = 3.35;")
 s=one(s,"maxOffsetM: 8.0","maxOffsetM: 11.5")
 s=one(s,"const flowCycles = detailCyclesPerWorld * 2.4;","const flowCycles = z<4 ? Math.max(38,detailCyclesPerWorld*4.3) : detailCyclesPerWorld*2.4;")
 # Bigger coherent animated global features, with gently transparent water revealing relief.
 s=one(s,"float t=u_time*0.32;","float t=u_time*0.62;")
 s=one(s,"vec3(0.012,0.075,0.145),vec3(0.045,0.30,0.48)","vec3(0.012,0.085,0.175),vec3(0.048,0.34,0.57)")
 s=one(s,"float alpha=mix(0.96+foamMask*0.03,0.05+foamMask*0.09,u_underwater);","float alpha=mix(0.37+foamMask*0.38,0.045+foamMask*0.12,u_underwater);")
 s=one(s,"color*=mix(0.22,1.0,directSun);","color*=mix(0.50,1.0,directSun);")
 s=one(s,"float shoreWash=shore*smoothstep(0.52,0.83,0.50+0.50*sin(rphase-t*1.1+n*2.0))*rfade;","float swash=sin(rphase-t*2.25+n*1.6-shore*5.4);float shoreWash=shore*smoothstep(0.28,0.78,0.50+0.50*swash)*rfade;")
 s=one(s,"float rollingWave=wave+0.20*sin(gerstnerPhaseC)+0.16*pow(max(0.0,sin(phaseA)),3.0);","float rollingWave=wave+0.31*sin(gerstnerPhaseC)+0.36*pow(max(0.0,sin(phaseA)),5.0)+shoaling*0.28*sin(phaseA*1.8-0.8);")
 s=one(s,"rollingWave * amplitude*(1.0+shoaling*0.38)","rollingWave * amplitude*(1.0+shoaling*0.65)")
 # Limited steep Gerstner crest displacement (no arbitrary world-scale horizontal motion).
 s=one(s,"'uniform float u_waveAmp;',","'uniform float u_waveAmp;',\n    'uniform float u_closeCurl;',")
 s=one(s,"'  vec2 displacedPosition = a_pos;',","""'  float curlEnvelope=shoaling*(0.45+0.55*pow(max(0.0,sin(phaseA)),3.0))*u_closeCurl;',
    '  vec2 curlOffset=rawGerstnerOffsetM*min(1.0,1.7/max(0.001,gerstnerOffsetLengthM))*curlEnvelope/(40075016.6856*cLat);',
    '  vec2 displacedPosition = a_pos+curlOffset;',""")
 s=one(s,"'u_flowPhaseDetail', 'u_sunDirScreen', 'u_sunElevation', 'u_underwater'];","'u_flowPhaseDetail', 'u_sunDirScreen', 'u_sunElevation', 'u_underwater', 'u_closeCurl'];")
 s=one(s,"if (u.u_waveAmp) gl.uniform1f(u.u_waveAmp, amp);","if (u.u_waveAmp) gl.uniform1f(u.u_waveAmp, amp);\n        if(u.u_closeCurl)gl.uniform1f(u.u_closeCurl,clamp((z-13)/4,0,1));")
 s=one(s,"step:Math.max(dx,dy)*.50","step:Math.max(dx,dy)*.28")
 s=one(s,"(api.low?18000:api.mobile?32000:60000)","(api.low?22000:api.mobile?40000:72000)")
 s=one(s,"if(!map.hasImage(OCEAN_PATTERN_ID))map.addImage(OCEAN_PATTERN_ID,oceanFallbackTexture());","if(!map.hasImage(OCEAN_PATTERN_ID))map.addImage(OCEAN_PATTERN_ID,oceanFallbackTexture(128,0));\n    try{installOceanRelief(map)}catch(e){api.reliefError=String(e?.message||e)}")
 s=one(s,"||Number(window.__BP_WATER_SUBMERGENCE_V2__||0)>0.02","")
 s=one(s,"'fill-pattern':OCEAN_PATTERN_ID,'fill-opacity':1","'fill-pattern':OCEAN_PATTERN_ID,'fill-opacity':.28")
 # Animated, vector-clipped floor/surface light pattern even where mesh LOD has not loaded.
 s=one(s,"const SOURCE_ANCHORS = [","""let lastOceanPattern=0;
  function animateOceanPattern(){
    if(!api.active||!api.enabled||document.hidden||!map.hasImage?.(OCEAN_PATTERN_ID)||!map.getLayer(OCEAN_COVER_ID))return;
    const now=performance.now();if(now-lastOceanPattern<190)return;lastOceanPattern=now;
    const wet=Number(window.__BP_WATER_SUBMERGENCE_V2__||0),target=wet>.02?.46:.28;
    try{if(map.getPaintProperty(OCEAN_COVER_ID,'fill-opacity')!==target)map.setPaintProperty(OCEAN_COVER_ID,'fill-opacity',target);
      map.updateImage(OCEAN_PATTERN_ID,oceanFallbackTexture(128,now/1000,wet));}catch(_){}
  }
  const oceanPatternTimer=setInterval(animateOceanPattern,210);
  map.once('remove',()=>clearInterval(oceanPatternTimer));
  const SOURCE_ANCHORS = [""")
 return s
def patch_sensor(s):
 # Use one high-resolution DEM across land and sea, never switch the whole world to a
 # lower-resolution duplicate DEM. Existing terrain stays active through close zoom.
 a=s.index(' function addDepth(){');b=s.index(' function removeDepth(){',a)
 s=s[:a]+""" function addDepth(){
  if(!state.surface||dead||!map.getSource('dem'))return false;
  try{if(!map.getLayer(B)){
   const beforeId=before(['bp-liquid-ocean-cover-v2','gta-coast-shadow','gta-context-buildings','gta-water-label']);
   const l={id:B,type:'hillshade',source:'dem',layout:{visibility:'none'},paint:{'hillshade-exaggeration':.80,'hillshade-shadow-color':'#1c4962','hillshade-highlight-color':'#e1fcff','hillshade-accent-color':'#7cbcca'}};
   if(beforeId)map.addLayer(l,beforeId);else map.addLayer(l);
  }
  const visibility=Number(window.__BP_WATER_SUBMERGENCE_V2__||0)>0?'visible':'none';
  if(map.getLayoutProperty(B,'visibility')!==visibility)map.setLayoutProperty(B,'visibility',visibility);
  window.__BP_TERRAIN_SOURCE_OVERRIDE__='dem';const terrain=map.getTerrain?.();
  if(!terrain||terrain.source!=='dem'||Number(terrain.exaggeration)!==1)map.setTerrain({source:'dem',exaggeration:1});
  return true}catch(e){return false}
 }
"""+s[b:]
 s=s.replace("map.getSource(D)&&map.getLayer(B)","map.getSource('dem')&&map.getLayer(B)")
 s=s.replace("if(map.getSource(D))map.removeSource(D)","if(map.getSource(D)&&D!=='dem')map.removeSource(D)")
 s=s.replace("if(window.__BP_TERRAIN_SOURCE_OVERRIDE__===D)delete window.__BP_TERRAIN_SOURCE_OVERRIDE__","if(window.__BP_TERRAIN_SOURCE_OVERRIDE__==='dem')delete window.__BP_TERRAIN_SOURCE_OVERRIDE__")
 s=one(s,"const vis=amount>.02?'none':'visible';","const vis='visible';")
 s=s.replace("const depth=Math.max(0,-altitude)","const depth=Math.max(0,-altitude)")
 s=one(s,"const q=Math.min(1,depth/6)","const q=Math.min(1,depth/3)") if "const q=Math.min(1,depth/6)" in s else s.replace("q=Math.min(1,depth/6)","q=Math.min(1,depth/3)")
 # Lightweight transparent underwater turbulence using two moving optical layers.
 s=one(s,"rgba(12,87,110,calc(.10 + var(--bp-dive-depth,.3)*.14))","rgba(73,158,182,calc(.10 + var(--bp-dive-depth,.3)*.10))")
 s=one(s,"rgba(4,76,100,calc(.10 + var(--bp-dive-depth,.3)*.22))","rgba(27,111,151,calc(.08 + var(--bp-dive-depth,.3)*.12))")
 s=one(s,"rgba(1,19,43,calc(.16 + var(--bp-dive-depth,.3)*.34))","rgba(12,65,99,calc(.10 + var(--bp-dive-depth,.3)*.18))")
 s=one(s,".caustics{position:absolute;inset:-18%;opacity:.28;mix-blend-mode:screen;filter:blur(5px);",".caustics{position:absolute;inset:-18%;opacity:.44;mix-blend-mode:screen;filter:blur(2px);")
 # Ensure automatic detection works during two-finger tilt and close zoom; avoid
 # instant involuntary dives on land. Existing measured-bed and camera safeguards remain.
 s=s.replace("z>=15.5&&alt!==null&&alt>=0&&alt<35","z>=14.5&&alt!==null&&alt>=0&&alt<55")
 return s
def patch_world(s):
 # The same open DEM, including its negative elevations, is continuously active.
 s=one(s,"const z=map.getZoom(),should=z>=2,ex=LOW?.82:TIER==='HIGH'?1.08:1,src=String(window.__BP_TERRAIN_SOURCE_OVERRIDE__||'dem'),terrainEx=src==='dem'?ex:1","const z=map.getZoom(),should=true,ex=1,src=String(window.__BP_TERRAIN_SOURCE_OVERRIDE__||'dem'),terrainEx=1")
 a=s.index('async function startForViewer(opts={}){');b=s.index(' const api={version:VERSION,map,state,space',a)
 s=s[:a]+"""async function startForViewer(opts={}){
  guardAttribution();const state={mode:'GLOBAL_PUBLIC',primaryOwner:opts.primaryOwner===true,center:map.getCenter(),zoom:map.getZoom(),cameraPreserved:true,updatedAt:Date.now()};window.__BP_VIEWER_START__=state;return state;
 }
"""+s[b:]
 s=s.replace("center:[-98.5,39.5],zoom:MOBILE?2.75:3.35,pitch:0,bearing:0,duration:LOW?220:480","center:[0,20],zoom:Math.max(.6,Math.min(1.25,Math.log2(Math.min(container.clientWidth,container.clientHeight)*.80*Math.PI/512))),pitch:0,bearing:0,duration:LOW?220:480")
 return s
def patch_app(s):
 s="import {attachPublicGlobe} from '/vendor/bp-public-globe-v4.mjs';\n"+s
 s=one(s,"const appMap=world.map;","const appMap=world.map;\n attachPublicGlobe(world);")
 s=regex(s,r"try\{world\.map\.jumpTo\(\{center:\[0,20\],zoom:BP_MOBILE\?1\.05:1\.25,pitch:0,bearing:0\}\);window\.__BP_GLOBAL_START__=\{[^}]+\}\}catch\(_\)\{\}","window.__BP_GLOBAL_START__={cameraPreserved:true,projection:'globe',zoom:world.map.getZoom(),at:Date.now()};",False)
 s=regex(s,r"center:\[0,20\],zoom:window\.innerWidth<=620\?1\.05:1\.25,pitch:0,bearing:0,projection:'globe'","center:[0,20],zoom:Math.max(.6,Math.min(1.25,Math.log2(Math.min(window.innerWidth,window.innerHeight)*.80*Math.PI/512))),pitch:0,bearing:0,projection:'globe'")
 s=one(s,"function openAuth(message=''){","""window.__BP_PUBLIC_OPEN_AUTH_V4__=mode=>{openAuth(mode==='signup'?'Create your optional BridgePoint account.':'');const el=$('authEmail');if(el)setTimeout(()=>el.focus(),80);};
 function openAuth(message=''){""")
 # Public tools stay unlocked; private workspaces and owner RPCs retain their auth.
 return s
def patch_space(s):
 # Remove only automatic full-screen space opening; deliberate exploration remains.
 s=regex(s,r"if\s*\(!landingMode\)\s*window\.setTimeout\(\(\)\s*=>\s*\{\s*if\s*\(!open\)\s*void openExplorer\(\);\s*\},\s*\d+\);","/* Full celestial explorer opens only by deliberate action. */",False)
 return s
for name,fn in [(water,patch_water),(sensor,patch_sensor),(world,patch_world)]:
 result=fn(read(name))
 for rel in (name,'app/'+name):
  if not (site/rel).is_file():raise SystemExit('missing module '+rel)
  write(rel,result)
for name in modules:shutil.copyfile(Path('scripts')/name,site/'vendor'/name)
# Retain earcut geometry; replace the procedural fallback with a continuously moving
# tile-seam-free light field. Alpha is controlled by the native vector fill.
meshpath='vendor/bp-ocean-mesh-v3.mjs';s=read(meshpath)
s=s[:s.index('export function oceanFallbackTexture')]+"""export function oceanFallbackTexture(size=128,time=0,wet=0){
 const data=new Uint8Array(size*size*4),TAU=Math.PI*2,t=time*.65;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const a=x/size*TAU,b=y/size*TAU;
  const u=a*2+b+Math.sin(b*3+t*.44)*.85-t,v=b*2-a*3+Math.sin(a*2-t*.35)*.70+t*.78;
  const ridge=Math.pow(Math.max(0,.5+.5*Math.sin(u)),7),r2=Math.pow(Math.max(0,.5+.5*Math.sin(v)),9),n=.5+.5*(Math.sin(u)*.55+Math.sin(v)*.45),light=Math.min(1,(ridge+r2)*.68);
  const i=(y*size+x)*4;
  data[i]=Math.round(7+20*n+light*(wet>.02?170:61));data[i+1]=Math.round(39+49*n+light*(wet>.02?120:68));data[i+2]=Math.round(75+53*n+light*(wet>.02?105:62));data[i+3]=255;
 }return {width:size,height:size,data};
}
"""
write(meshpath,s)
write('app.js',patch_app(read('app.js')))
write(space,patch_space(read(space)))
for rel in ('landing.js','app.js'):
 s=read(rel)
 for name in (water,sensor,world):
  s,n=re.subn(re.escape(name)+r'\?v=[^\s\x22\x27)]+',name+'?v='+key,s)
  if name!=sensor and n<1:raise SystemExit('missing module import '+rel+' '+name)
 write(rel,s)
# Public homepage routes directly to the full app, with query params preserved.
# Legacy auth URLs are forwarded to the optional account form, not a gate.
s=read('index.html')
s=one(s,'<head>',"""<head><script id="bp-public-home-v4">(()=>{const url=new URL('/app/',location.origin);url.search=location.search;url.hash=location.hash;location.replace(url.href)})();</script>""")
s=regex(s,r'(landing\.js\?v=)[^&\s\x22\x27]+',lambda m:m.group(1)+key)
write('index.html',s)
s=read('app/index.html')
# Remove the entry-level authentication redirect, while preserving server auth.
s,n=re.subn(r'<script\b[^>]*\bid=["\x27]bp-app-entry-gate[^"\x27]*["\x27][^>]*>.*?</script>','<script id="bp-app-public-entry-v4">window.__BP_PUBLIC_ENTRY_V4__=true;</script>',s,flags=re.S)
if n<1:
 # Some preserved versions rename the gate, but keep these exact redirect literals.
 s,n=re.subn(r'<script\b[^>]*>(?:(?!</script>).)*?location\.replace\([^\n]*?auth=signin(?:(?!</script>).)*?</script>','<script id="bp-app-public-entry-v4">window.__BP_PUBLIC_ENTRY_V4__=true;</script>',s,flags=re.S)
if n<1:raise SystemExit('No known app gate found; refuse ambiguous public entry patch')
# Remove other inline fresh-login-only entry checks (not auth form).
s=regex(s,r'<script\b[^>]*>(?:(?!</script>).)*?bp_fresh_signin_v1(?:(?!</script>).)*?location\.replace\((?:(?!</script>).)*?</script>','',False)
for name in ('app.js',world,space):
 s=regex(s,r'('+re.escape(name)+r'\?v=)[^&\s\x22\x27]+',lambda m:m.group(1)+key, name=='app.js')
write('app/index.html',s)
if snap()!=before:raise SystemExit('unrelated production assets changed')
for name in (water,sensor,world):assert (site/name).read_bytes()==(site/'app'/name).read_bytes()
print('PUBLIC_LIVING_OCEAN_SCOPE_PASS',len(before),'unrelated files preserved')
