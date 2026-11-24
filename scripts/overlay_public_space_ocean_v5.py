from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1]); key='public-space-ocean-recovery-v20261124-v5'
water='world-v2300-water.js';sensor='world-v2300-sensor-layers.js';space='bridgepoint-app-space-explorer-v1.js';entry='vendor/bp-public-globe-v4.mjs';mesh='vendor/bp-ocean-mesh-v3.mjs'
allowed={'index.html','app/index.html','landing.js','app.js',space,entry,mesh}|{pre+n for pre in ('','app/') for n in (water,sensor)}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def read(n):return (site/n).read_text(encoding='utf-8')
def write(n,s):(site/n).write_text(s,encoding='utf-8')
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('PATCH_ANCHOR '+str(s.count(a))+' '+a[:140])
 return s.replace(a,b,1)
def rx(s,p,r,required=True):
 s,n=re.subn(p,r,s,flags=re.S)
 if required and not n:raise SystemExit('REGEX_ANCHOR '+p[:140])
 return s
# Restore the full existing celestial scene, not CSS substitute spheres. In Earth
# overview only, cut a hole for the real map and let map gestures through it.
s=read(space)
s=one(s,"let open = false;","let open = false, publicOverview = false, opening = null;")
s=one(s,"function syncMapCanvas(distanceRatio, earthProjection) {","""function syncMapCanvas(distanceRatio, earthProjection) {
      if(publicOverview){
        const mapInstance=getMapInstance(),cv=mapInstance?.getCanvas?.();
        if(cv){cv.style.visibility='';cv.style.transform='';cv.style.willChange='';cv.dataset.bpSpaceTransform='';}
        return 1;
      }""")
# Actual solar system control stays visible and out of the existing map buttons.
s=one(s,"style.textContent = STYLE;","""style.textContent = STYLE + `
      #bpWelcomeGateV1.bp-public-earth-overview{z-index:4!important;pointer-events:none!important}
      #bpWelcomeGateV1.bp-public-earth-overview .bpw-space-renderer-canvas{pointer-events:none!important}
      #bpWelcomeGateV1.bp-public-earth-overview .bpw-space-controls{top:clamp(72px,13vh,112px)!important;right:12px!important;z-index:100!important;pointer-events:auto!important;opacity:1!important}
      #bpWelcomeGateV1.bp-public-earth-overview .bpw-space-controls select{pointer-events:auto!important;opacity:1!important}
      #bpWelcomeGateV1.bp-public-earth-overview [data-app-space-close]{display:none!important}
      #bpWelcomeGateV1.bp-public-earth-overview .bpw-celestial-system{pointer-events:none!important}
      #bpAppSpaceToggleV1{display:inline-flex!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
      @media(max-width:620px){#bpWelcomeGateV1.bp-public-earth-overview .bpw-space-controls{top:76px!important;right:7px!important;max-width:55vw!important}}
      `;""")
# Startup does NOT call focusGlobalMapForSpace or the distant solar-cosmos camera.
s=one(s,"async function openExplorer() {","""async function openExplorer(options={}) {
      publicOverview=options.publicOverview===true;""")
s=one(s,"if (open) return;\n      open = true;","if (open) return;\n      open = true;")
s=one(s,"target.hidden = false;","target.hidden = false;\n      target.classList.toggle('bp-public-earth-overview',publicOverview);")
s=one(s,"if (!landingMode) {\n          await focusGlobalMapForSpace();","if (!landingMode && !publicOverview) {\n          await focusGlobalMapForSpace();")
s=one(s,"if (!installCloseControl()) {","""if(publicOverview){void api.loadSolarCosmos?.().catch?.(()=>{});api.reset?.();}
        if (!installCloseControl()) {""")
s=one(s,"function closeExplorer() {\n      open = false;","function closeExplorer() {\n      open = false;publicOverview=false;overlay?.classList.remove('bp-public-earth-overview');")
s=one(s,"open: openExplorer,\n      close: closeExplorer,","""open: openExplorer,
      close: closeExplorer,
      async showPublicOverview(){
        if(opening)return opening;
        if(open&&publicOverview){overlay.hidden=false;getRenderer()?.resume?.();return true}
        if(open&&!publicOverview)return false;
        opening=openExplorer({publicOverview:true}).finally(()=>{opening=null});await opening;
        return open;
      },
      hidePublicOverview(){if(open&&publicOverview){overlay.hidden=true;getRenderer()?.pause?.();}},
      enterFullSpace(){if(open)closeExplorer();return openExplorer()},
      get publicOverview(){return publicOverview},
      get overviewVisible(){return !!(publicOverview&&open&&overlay&&!overlay.hidden)},
      syncPublicOverview(){
        if(!publicOverview||!open||!overlay||overlay.hidden)return;
        const m=getMapInstance(),cv=overlay.querySelector('.bpw-space-renderer-canvas');
        if(!m||!cv)return;
        const rect=m.getContainer().getBoundingClientRect(),z=m.getZoom();
        // Actual map globe disk is approximately 0.90 of nominal Mercator radius.
        // A conservative transparent hole prevents any stars being painted through Earth.
        const radius=Math.min(Math.min(rect.width,rect.height)*.49,512*Math.pow(2,z)/(Math.PI*2)*.96);
        const mask='radial-gradient(circle '+Math.ceil(radius)+'px at 50% 50%,transparent 98%,black 100%)';
        cv.style.maskImage=mask;cv.style.webkitMaskImage=mask;
        const renderer=getRenderer();const view=renderer?.state?.()?.viewState;
        if(view&&view!=='overview'){
          publicOverview=false;overlay.classList.remove('bp-public-earth-overview');
          cv.style.maskImage='';cv.style.webkitMaskImage='';
          // Explicit planet selection keeps all original 3D controls and gestures.
        }
      },""")
s=one(s,"open,\n          rendererReady:","open:open&&!publicOverview,\n          publicOverview,overviewVisible:!!(publicOverview&&open&&overlay&&!overlay.hidden),\n          rendererReady:")
s=one(s,"if (open) closeExplorer();\n      else void openExplorer();","if (open&&!publicOverview) closeExplorer();\n      else {if(open)closeExplorer();void openExplorer();}")
s=one(s,"if (overlay) overlay.hidden = true;","if (overlay) {overlay.hidden = true;const c=overlay.querySelector('.bpw-space-renderer-canvas');if(c){c.style.maskImage='';c.style.webkitMaskImage='';}}")
write(space,s)
# Replace just the new public controller. Keep the actual account form and all
# map chrome intact. Let idle rotation and water mesh work together.
s=read(entry)
s=rx(s,r" const sky=document\.createElement\('div'\);.*?sun\.onclick=.*?moon\.onclick=.*?;\n","",True)
s=one(s,"let timer=0,spinning=false,interacting=false,lastUser=performance.now(),hideTimer=0,closed=false,lastSky=0;","let timer=0,spinning=false,interacting=false,lastUser=performance.now(),hideTimer=0,closed=false,lastSky=0,spacePending=false,overviewAllowed=true;")
a=s.index(' function skyLayout(){');b=s.index(' function pause(){',a)
s=s[:a]+""" function skyLayout(){
  const t=performance.now();if(t-lastSky<150)return;lastSky=t;
  const sp=window.__BP_APP_SPACE_EXPLORER_V1__;
  if(!sp)return;
  if(!isGlobal()){sp.hidePublicOverview?.();return}
  if(!overviewAllowed||sp.state?.open)return;
  if(!sp.overviewVisible&&!spacePending){spacePending=true;void Promise.resolve(sp.showPublicOverview?.()).finally(()=>{spacePending=false;sp.syncPublicOverview?.()})}
  sp.syncPublicOverview?.();
 }
"""+s[b:]
s=one(s,"if(spinning){spinning=false;map.stop?.()}","if(spinning){spinning=false;window.__BP_PUBLIC_IDLE_SPIN_V5__=false;map.stop?.()}")
s=one(s,"const c=map.getCenter();spinning=true;map.easeTo({center:[c.lng+.48,c.lat],duration:2400,easing:t=>t,essential:true},{bpPublicIdleSpin:true});\n  schedule(2450);skyLayout();","""const c=map.getCenter();spinning=true;window.__BP_PUBLIC_IDLE_SPIN_V5__=true;
  // Leave a real settled interval for tile and feature work between very small rotations.
  map.easeTo({center:[c.lng+.23,c.lat],duration:750,easing:t=>t,essential:true},{bpPublicIdleSpin:true});
  schedule(1500);skyLayout();""")
s=one(s,"if(e?.bpPublicIdleSpin===true){spinning=false;return}","if(e?.bpPublicIdleSpin===true||spinning){spinning=false;window.__BP_PUBLIC_IDLE_SPIN_V5__=false;return}")
s=one(s,"auth.remove();sky.remove();","auth.remove();")
s=one(s,"const q=new URLSearchParams(location.search)","const spaceWatch=setInterval(skyLayout,800);map.once('remove',()=>clearInterval(spaceWatch));\n const q=new URLSearchParams(location.search)")
# Existing account buttons had inherited opacity from moving-camera events. Only real
# user input hides them; give them a readable standalone surface.
s=one(s,"function userEnd(){interacting=false;","function userEnd(){if(!interacting)return;interacting=false;")
s=one(s,"function end(e){","function end(e){")
s=one(s,"opacity:0;pointer-events:none;transform:translate(-50%,-12px)","opacity:0;pointer-events:none;transform:translate(-50%,-12px)")
s=one(s,"background:#051522dc;color:#e7faff","background:#071a2a;color:#fff")
s=one(s,"z-index:1200;transition:opacity","z-index:2147482000;transition:opacity")
s=one(s,"if(e?.bpPublicIdleSpin!==true&&e?.originalEvent){","if(e?.bpPublicIdleSpin!==true&&!spinning&&e?.originalEvent){")
write(entry,s)
# Actual liquid surface: eliminate the repeating criss-cross pattern entirely.
s=read(water)
s=one(s,"const SURFACE_RENDER_REVISION = 6260;","const SURFACE_RENDER_REVISION = 6261;")
s=one(s,"if (moving) {\n      api.buildDeferredDuringMotion = true;","if (moving && !window.__BP_PUBLIC_IDLE_SPIN_V5__) {\n      api.buildDeferredDuringMotion = true;")
s=one(s,"if (moving || map.isMoving?.()) {","if ((moving || map.isMoving?.()) && !window.__BP_PUBLIC_IDLE_SPIN_V5__) {")
s=one(s,"map.on('movestart', () => { moving = true; });","map.on('movestart', e => { moving = !e?.bpPublicIdleSpin; });")
s=one(s,"map.on('moveend', () => { moving = false; scheduleBuild(650, 'camera'); });","map.on('moveend', e => { moving = false; scheduleBuild(e?.bpPublicIdleSpin?180:420,e?.bpPublicIdleSpin?'background':'camera'); });")
# Do not let the native repeated pattern dominate surface. It only contributes
# subtle caustics under water; the above-water fallback is uniform transparent blue.
s=one(s,"'fill-pattern':OCEAN_PATTERN_ID,'fill-opacity':.28","'fill-color':'#0b3859','fill-opacity':.16")
a=s.index('  function animateOceanPattern(){');b=s.index('  const oceanPatternTimer=',a)
s=s[:a]+"""  function animateOceanPattern(){
    if(!api.active||!api.enabled||document.hidden||!map.getLayer(OCEAN_COVER_ID))return;
    const now=performance.now();if(now-lastOceanPattern<240)return;lastOceanPattern=now;
    const wet=Number(window.__BP_WATER_SUBMERGENCE_V2__||0);
    try{
      const target=wet>.02?.32:.16;
      if(map.getPaintProperty(OCEAN_COVER_ID,'fill-opacity')!==target)map.setPaintProperty(OCEAN_COVER_ID,'fill-opacity',target);
      const pattern=map.getPaintProperty(OCEAN_COVER_ID,'fill-pattern');
      if(wet>.02){if(pattern!==OCEAN_PATTERN_ID)map.setPaintProperty(OCEAN_COVER_ID,'fill-pattern',OCEAN_PATTERN_ID);map.updateImage(OCEAN_PATTERN_ID,oceanFallbackTexture(128,now/1000,wet))}
      else if(pattern)map.setPaintProperty(OCEAN_COVER_ID,'fill-pattern',null);
    }catch(_){}
  }
"""+s[b:]
# Use terrain-verified deep ocean as a fallback even when vector tile source
# produces zero marine polygons. Every cell's 9 test locations must be below sea.
# Exact coastline polygon mesh stays authoritative where it exists.
s=one(s,"api.exactMarineVertices=marineVertices;api.exactMarinePolygons=marinePolygons;","""api.exactMarineVertices=marineVertices;api.exactMarinePolygons=marinePolygons;
    // If the vector tile source temporarily lacks offshore polygons, materialize a
    // bounded terrain-verified open-sea grid; never extend this onto unknown land.
    if(marineVertices===0&&z>=3.5&&typeof map.queryTerrainElevation==='function'){
      const countX=Math.min(api.mobile?34:48,Math.max(18,nx*2)),countY=Math.min(api.mobile?30:42,Math.max(14,ny*2));
      const sx=(bounds.x1-bounds.x0)/countX,sy=(bounds.y1-bounds.y0)/countY,cache=new Map();
      function depth(i,j){const key=i+':'+j;if(cache.has(key))return cache.get(key);
        let val=null;try{val=map.queryTerrainElevation([wrapLon((bounds.x0+i*sx)*360-180),unmercY(bounds.y0+j*sy)],{exaggerated:false})}catch(_){}
        cache.set(key,val);return val;}
      let count=0;const dir=api.wind.direction*RAD;
      for(let j=0;j<countY;j++)for(let i=0;i<countX;i++){
        const x=bounds.x0+i*sx,y=bounds.y0+j*sy;if(y<0||y+sy>1||Math.floor(x)!==Math.floor(x+sx))continue;
        const samples=[[0,0],[1,0],[0,1],[1,1],[.5,.5],[.5,0],[.5,1],[0,.5],[1,.5]];
        if(!samples.every(([a,b])=>{const d=depth(i+a,j+b);return Number.isFinite(d)&&d<-25}))continue;
        const quad=[[x,y],[x+sx,y],[x+sx,y+sy],[x,y+sy]];
        for(const k of [0,1,2,0,2,3])pushVertex(surface,quad[k][0],quad[k][1],0,3,Math.sin(dir),-Math.cos(dir),0);
        count++;
      }
      api.verifiedOceanFallbackCells=count;fallbackCells+=count;
    }else api.verifiedOceanFallbackCells=0;""")
# The old early empty-source guard blocked the terrain-verified offshore fallback.
s=one(s,"if (!waterFeatures.length && !hasLandMask) {","if (!waterFeatures.length && !hasLandMask && !(z>=3.5&&Number(map.queryTerrainElevation?.(map.getCenter(),{exaggerated:false}))<-25)) {")
# Preserve dateline endpoints instead of mapping +180 degrees to -180.
s=one(s,"target.push(mod1(x), clamp(y, 0, 1)","target.push(x===1?0.99999994:mod1(x), clamp(y, 0, 1)")
# For global scale use broad advected filaments with contrast. At regional/close
# zoom, use LOCAL coordinates to avoid collapsed floating-point noise.
s=one(s,"'uniform float u_underwater;',","'uniform float u_underwater;',\n    'uniform float u_oceanZoom;',")
s=one(s,"'u_underwater', 'u_closeCurl'];","'u_underwater', 'u_closeCurl', 'u_oceanZoom'];")
s=one(s,"if(u.u_closeCurl)gl.uniform1f(u.u_closeCurl,clamp((z-13)/4,0,1));","if(u.u_closeCurl)gl.uniform1f(u.u_closeCurl,clamp((z-13)/4,0,1));\n        if(u.u_oceanZoom)gl.uniform1f(u.u_oceanZoom,z);")
s=one(s,"vec2 p=(v_coord+u_waveOrigin)*clamp(u_flowCycles*0.55,12.0,2400.0);","float scale=clamp(20.0*exp2(u_oceanZoom*0.83),26.0,220000.0);vec2 p=v_coord*scale+fract(u_waveOrigin*scale);")
s=one(s,"float motion=clamp(billow*0.64+max(ribbon,filament)*0.30+v_wave*0.14+globalSwell*0.15+microWave*0.10,0.0,1.0);","float swell=0.5+0.5*sin(rphase*0.42+sin(q.y*0.63+t)*1.7);float motion=clamp(billow*0.55+swell*0.32+max(ribbon,filament)*0.23+v_wave*0.12+globalSwell*0.15+microWave*0.10,0.0,1.0);")
s=one(s,"vec3(0.012,0.085,0.175),vec3(0.048,0.34,0.57)","vec3(0.006,0.045,0.115),vec3(0.035,0.37,0.57)")
s=one(s,"float alpha=mix(0.37+foamMask*0.38,0.045+foamMask*0.12,u_underwater);","float alpha=mix(0.56+foamMask*0.35,0.045+foamMask*0.12,u_underwater);")
s=one(s,"const amp = 3.35;","const amp = 4.25;")
# Stop broad tiled sea triangles from being split too sparsely; the independent
# optical shader continues to carry waves below the geometric mesh resolution.
s=one(s,"step:Math.max(dx,dy)*.28","step:Math.max(dx,dy)*.18")
# Preserve the shared GL restoration and the existing source-backed ocean relief.
for rel in (water,'app/'+water):write(rel,s)
# The old optional queue is starved while rotating. Mount sensor/dive promptly
# after water initialization, leaving other features in their original queue.
s=read('app.js')
s=one(s,"attachPublicGlobe(world);","""attachPublicGlobe(world);
 void import('./world-v2300-sensor-layers.js?v=public-space-ocean-recovery-v20261124-v5').then(m=>{
   const sensors=m.initSensorLayers(world);if(sensors)window.__BP_SENSOR_LAYERS_V5945__=sensors;
 }).catch(e=>console.warn('BridgePoint public dive startup',e));""")
write('app.js',s)
# Keep existing surface depth and bubble system. Only remove redundant style
# switching and preserve the shared terrain for all camera angles.
for rel in ('landing.js','app.js'):
 s=read(rel)
 for name in (water,sensor):
  s,n=re.subn(re.escape(name)+r'\?v=[^\s\x22\x27)]+',name+'?v='+key,s)
  if name==water and n<1:raise SystemExit('missing water loader '+rel)
 write(rel,s)
# Refresh all changed asset imports, including the .mjs module to avoid cache.
s=read('app.js');s=one(s,"'/vendor/bp-public-globe-v4.mjs'","'/vendor/bp-public-globe-v4.mjs?v="+key+"'");write('app.js',s)
for rel in ('index.html','app/index.html'):
 s=read(rel)
 for name in ('landing.js','app.js',space):
  s=re.sub(r'('+re.escape(name)+r'\?v=)[^&\s\x22\x27]+',lambda m:m.group(1)+key,s)
 write(rel,s)
if snap()!=before:raise SystemExit('unrelated production files changed')
assert (site/water).read_bytes()==(site/'app'/water).read_bytes()
print('PUBLIC_SPACE_OCEAN_RECOVERY_SCOPE_PASS',len(before))
