from pathlib import Path
import re, hashlib, sys
site=Path(sys.argv[1])
key='liquid-whitewater-bubbles-v20261123-v2'
watername='world-v2300-water.js'
sensorname='world-v2300-sensor-layers.js'
allowed={'index.html','app/index.html','landing.js','app.js',watername,sensorname,'app/'+watername,'app/'+sensorname}
def snapshot():
    return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snapshot()
def once(s,a,b):
    if s.count(a)!=1: raise SystemExit('Patch anchor not unique: '+a[:110]+' count='+str(s.count(a)))
    return s.replace(a,b,1)
def water(s):
    s=once(s,'const SURFACE_RENDER_REVISION = 6257;','const SURFACE_RENDER_REVISION = 6258;')
    # Keep bounded geographic displacement, strengthen the actual vertical rolling wave.
    s=once(s,"const amp = 1.15;","const amp = 2.35;")
    s=once(s,"'  float dynamicOffsetM = (wave * amplitude + stormSurge * marineSurgeMask) * u_pitchWaveScale;',","""    '  float shoaling=clamp(-a_flood,0.0,1.0)*marineSurgeMask;',
    '  float rollingWave=wave+0.20*sin(gerstnerPhaseC)+0.16*pow(max(0.0,sin(phaseA)),3.0);',
    '  float dynamicOffsetM = (rollingWave * amplitude*(1.0+shoaling*0.38) + stormSurge * marineSurgeMask) * u_pitchWaveScale;',""")
    s=once(s,"+ a_flood;',","+ max(0.0,a_flood);',")
    s=once(s,"'  v_wave = clamp(0.5 + wave * 0.34, 0.0, 1.0);',","'  v_wave = clamp(0.5 + rollingWave * 0.43, 0.0, 1.0);',")
    # Apply the approved blue visual to all standing water, including small clipped marine tiles
    # with generic water classes. Streams and reported flood water still return earlier.
    s=once(s,"'  if (v_kind < 0.5 || (v_kind > 2.5 && v_kind < 3.5)) {',","'  if (v_kind < 1.5 || (v_kind > 2.5 && v_kind < 3.5)) {',")
    s=once(s,"'    float foamMask=clamp(max(ribbon,filament)*0.22+foam*0.38+highlight*0.55+glint*0.08,0.0,0.85);',","""    '    float shore=clamp(-v_flood,0.0,1.0);',
    '    float breaker=smoothstep(0.72,0.93,v_wave+globalSwell*0.14+microWave*0.08);',
    '    float whitecap=breaker*clamp(0.30+v_storm*0.45+u_windSpeed/65.0+shore*0.75,0.0,1.0);',
    '    float shoreWash=shore*smoothstep(0.52,0.83,0.50+0.50*sin(rphase-t*1.1+n*2.0))*rfade;',
    '    float foamMask=clamp(max(ribbon,filament)*0.18+foam*0.19+highlight*0.32+whitecap*0.86+shoreWash*0.87,0.0,1.0);',""")
    s=once(s,"vec3(0.60,0.90,0.98),foamMask","vec3(0.94,0.985,1.0),foamMask")
    s=once(s,"0.76+motion*0.14+foamMask*0.07,0.12+foamMask*0.16","0.96+foamMask*0.03,0.05+foamMask*0.09")
    s=once(s,"clamp(alpha,0.10,0.97)","clamp(alpha,0.05,0.99)")
    s=once(s,"window.__BP_UNDERWATER_DIVE_ACTIVE__ === true ? 1 : 0","Number(window.__BP_WATER_SUBMERGENCE_V2__ || 0)")
    # Keep exact vector polygon fill beneath the animated mesh, above the old satellite
    # bathymetry pixels; this does not alter the land imagery or radar.
    s=once(s,"const SOURCE_ANCHORS = [","""const OCEAN_COVER_ID='bp-liquid-ocean-cover-v2';
  function syncOceanCover(){
    if(!map.getSource('ofm')||!map.getLayer('gta-coast-edge'))return;
    const hidden=!api.enabled||window.__BP_BLENDER_WORLD_MODE__?.enabled===true||Number(window.__BP_WATER_SUBMERGENCE_V2__||0)>0.02;
    const visibility=hidden?'none':'visible';
    if(!map.getLayer(OCEAN_COVER_ID)){
      map.addLayer({id:OCEAN_COVER_ID,type:'fill',source:'ofm','source-layer':'water',layout:{visibility},paint:{'fill-color':'#0b2b40','fill-opacity':1,'fill-antialias':true}},map.getLayer(LAYER_ID)?LAYER_ID:'gta-coast-edge');
    }else if(map.getLayoutProperty(OCEAN_COVER_ID,'visibility')!==visibility)map.setLayoutProperty(OCEAN_COVER_ID,'visibility',visibility);
  }
  const SOURCE_ANCHORS = [""")
    s=once(s,"if (!ensureSourceAnchors()) return;","if (!ensureSourceAnchors()) return;\n      syncOceanCover();")
    s=once(s,"const before = map.getLayer('gta-coast-shadow') ? 'gta-coast-shadow' :\n        (map.getLayer('gta-landcover') ? 'gta-landcover' : undefined);","const before = map.getLayer('gta-coast-edge') ? 'gta-coast-edge' :\n        (map.getLayer('gta-landcover') ? 'gta-landcover' : undefined);")
    s=once(s,"if (layer) layer.enabled = this.enabled;","if (layer) layer.enabled = this.enabled;\n      try{syncOceanCover()}catch(_){}")
    s=once(s,"for (const spec of SOURCE_ANCHORS) { try","try { if(map.getLayer(OCEAN_COVER_ID))map.removeLayer(OCEAN_COVER_ID); }catch(_){}\n      for (const spec of SOURCE_ANCHORS) { try")
    s=once(s,"map.on('idle', ensureInstalled);","map.on('idle', ensureInstalled);\n  map.on('move',()=>{try{syncOceanCover()}catch(_){}});")
    # Overscan and increase bounded close-view grid coverage. Keep strict corner masks.
    s=once(s,"const dx = (bounds.x1 - bounds.x0) / nx;","const padX=(bounds.x1-bounds.x0)*0.18,padY=(bounds.y1-bounds.y0)*0.18;\n    bounds.x0-=padX; bounds.x1+=padX; bounds.y0=Math.max(0,bounds.y0-padY);bounds.y1=Math.min(1,bounds.y1+padY);\n    const dx = (bounds.x1 - bounds.x0) / nx;")
    s=once(s,"(api.low ? 320 : api.mobile ? 560 : 1200)","(api.low ? 520 : api.mobile ? 950 : 1800)")
    s=once(s,"let targetPx = api.low ? 38 : api.mobile ? 32 : 27;","let targetPx = api.low ? 30 : api.mobile ? 23 : 19;")
    s=once(s,"if (z >= 12) targetPx = api.low ? 42 : api.mobile ? 36 : 30;","if (z >= 12) targetPx = api.low ? 26 : api.mobile ? 20 : 17;")
    s=once(s,"if (z > 15) targetPx = api.low ? 44 : api.mobile ? 38 : 32;","if (z > 15) targetPx = api.low ? 28 : api.mobile ? 22 : 18;")
    s=once(s,"const waterFeatureLimit = worldView ? 120 : z < 7.5 ? 260 : api.low ? 220 : api.mobile ? 340 : 560;","const waterFeatureLimit = worldView ? 200 : z < 7.5 ? 440 : api.low ? 300 : api.mobile ? 480 : 700;")
    # Source-backed shallow ocean terrain drives the breaker strength, not fake shore geometry.
    s=once(s,"const flowDir = api.wind.direction * RAD;\n        const fx","""const shoreStrength=(kind===3||kind===0)&&z>=8?points.map(pt=>{
          const c=pointFromGridVertex(pt);
          try{const bed=map.queryTerrainElevation?.([c.lng,c.lat],{exaggerated:false});return Number.isFinite(bed)&&bed<0?clamp(1+bed/35,0,1):0}catch(_){return 0}
        }):[0,0,0,0];
        const flowDir = api.wind.direction * RAD;
        const fx""")
    s=once(s,"kind === 4 ? flood : 0);","kind === 4 ? flood : -shoreStrength[k]);")
    return s
def sensor(s):
    # Real sphere geometry in its own, dive-only Three.js renderer. Never mutate shared globe GL.
    a=s.index(' function resizeDiveEffects(){')
    b=s.index(' const pause=',a)
    s=s[:a]+""" let bubbleScene=null,bubbleRenderer=null,bubbleCamera=null,bubbleMesh=null,bubbleGeometry=null,bubbleMaterial=null,bubbleLoading=false,bubbleToken=0,bubbleDummy=null;
 function resizeDiveEffects(){if(!bubbleRenderer||!bubbleCamera)return;const w=container.clientWidth||1,h=container.clientHeight||1;bubbleCamera.aspect=w/h;bubbleCamera.updateProjectionMatrix();bubbleRenderer.setSize(w,h,false)}
 function seedDiveParticles(){const count=window.innerWidth<=700?48:80;diveParticles=Array.from({length:count},()=>({x:(Math.random()-.5)*18,y:(Math.random()-.5)*15,z:3+Math.random()*17,r:.07+Math.random()*.15,speed:.8+Math.random()*1.6,drift:Math.random()*.7,phase:Math.random()*Math.PI*2}))}
 async function createBubbleScene(){
  if(bubbleRenderer||bubbleLoading)return;const token=++bubbleToken;bubbleLoading=true;
  try{
   const T=await import('/vendor/three.module.js?v=169-local');
   if(token!==bubbleToken||!state.diving||!diveFx?.classList.contains('active'))return;
   bubbleRenderer=new T.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
   bubbleRenderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));bubbleRenderer.setClearColor(0x000000,0);
   bubbleRenderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:.94';
   diveFx.appendChild(bubbleRenderer.domElement);
   bubbleScene=new T.Scene();bubbleCamera=new T.PerspectiveCamera(57,1,.1,35);
   bubbleGeometry=new T.SphereGeometry(1,12,8);
   bubbleMaterial=new T.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{},vertexShader:'varying vec3 vN;varying vec3 vEye;void main(){vec4 mv=modelViewMatrix*instanceMatrix*vec4(position,1.);vN=normalize(normalMatrix*mat3(instanceMatrix)*normal);vEye=-mv.xyz;gl_Position=projectionMatrix*mv;}',fragmentShader:'varying vec3 vN;varying vec3 vEye;void main(){vec3 n=normalize(vN),v=normalize(vEye);float rim=pow(1.-max(0.,dot(n,v)),2.1);float glint=pow(max(0.,dot(n,normalize(vec3(-.45,.75,.5)))),24.);vec3 c=mix(vec3(.12,.48,.64),vec3(.87,.99,1.),clamp(rim*.83+glint,0.,1.));gl_FragColor=vec4(c,.035+rim*.58+glint*.39);}'});
   seedDiveParticles();bubbleMesh=new T.InstancedMesh(bubbleGeometry,bubbleMaterial,diveParticles.length);bubbleMesh.frustumCulled=false;bubbleMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);bubbleScene.add(bubbleMesh);bubbleDummy=new T.Object3D();resizeDiveEffects();
   diveLastFrame=0;if(!diveRaf)diveRaf=requestAnimationFrame(drawDiveParticles);
  }catch(e){console.warn('BridgePoint 3D underwater bubbles unavailable',e)}finally{bubbleLoading=false}
 }
 function drawDiveParticles(time){
  if(!state.diving||!bubbleRenderer||!bubbleMesh){diveRaf=0;return}
  const dt=diveLastFrame?Math.min(.05,(time-diveLastFrame)/1000):.016;diveLastFrame=time;
  if(!document.hidden){const aspect=bubbleCamera.aspect;
   for(let i=0;i<diveParticles.length;i++){const p=diveParticles[i],halfY=Math.tan(57*Math.PI/360)*p.z,halfX=halfY*aspect;
    p.y+=p.speed*dt;p.x+=Math.sin(time*.002+p.phase)*p.drift*dt;
    if(p.y>halfY+1||Math.abs(p.x)>halfX+1){p.y=-halfY-Math.random()*2;p.x=(Math.random()*2-1)*halfX;p.z=3+Math.random()*17}
    bubbleDummy.position.set(p.x,p.y,-p.z);bubbleDummy.scale.set(p.r,p.r*1.05,p.r);bubbleDummy.updateMatrix();bubbleMesh.setMatrixAt(i,bubbleDummy.matrix)
   }bubbleMesh.instanceMatrix.needsUpdate=true;bubbleRenderer.render(bubbleScene,bubbleCamera)
  }diveRaf=requestAnimationFrame(drawDiveParticles)
 }
 function startDiveEffects(impact=false,depthMeters=35){if(!ensureDiveEffects())return;diveFx.style.setProperty('--bp-dive-depth',String(Math.min(1,Math.max(0,Number(depthMeters)||0)/250)));diveFx.classList.add('active');if(impact){diveFx.classList.remove('impact');void diveFx.offsetWidth;diveFx.classList.add('impact');setTimeout(()=>diveFx?.classList.remove('impact'),1350)}void createBubbleScene()}
 function stopDiveEffects(){bubbleToken++;if(diveRaf)cancelAnimationFrame(diveRaf);diveRaf=0;diveParticles=[];diveLastFrame=0;bubbleGeometry?.dispose();bubbleMaterial?.dispose();if(bubbleRenderer){bubbleRenderer.domElement.remove();bubbleRenderer.dispose();bubbleRenderer.forceContextLoss()}bubbleRenderer=bubbleCamera=bubbleScene=bubbleMesh=bubbleGeometry=bubbleMaterial=bubbleDummy=null;diveFx?.classList.remove('active','impact')}
 function cameraAltitude(){try{const t=map.transform||map._transform;const v=t?.getCameraAltitude?.()??t?.getCameraPosition?.()?.altitude;return Number.isFinite(v)?v:null}catch(_){return null}}
 function updateSubmergence(){
  if(!state.diving)return;
  const altitude=cameraAltitude();if(altitude===null)return;
  const depth=Math.max(0,-altitude),previous=Number(window.__BP_WATER_SUBMERGENCE_V2__||0);
  const q=Math.min(1,depth/6),amount=q*q*(3-2*q);
  window.__BP_WATER_SUBMERGENCE_V2__=amount;
  const cover='bp-liquid-ocean-cover-v2';
  if(map.getLayer(cover)){const vis=amount>.02?'none':'visible';if(map.getLayoutProperty(cover,'visibility')!==vis)map.setLayoutProperty(cover,'visibility',vis)}
  if(map.getLayer(B)){const vis=depth>0?'visible':'none';if(map.getLayoutProperty(B,'visibility')!==vis)map.setLayoutProperty(B,'visibility',vis)}
  if(depth>0&&previous===0)startDiveEffects(true,depth);
  else if(depth>0&&diveFx)diveFx.style.setProperty('--bp-dive-depth',String(Math.min(1,depth/250)));
  else if(depth===0&&previous>0)stopDiveEffects();
 }
"""+s[b:]
    s=once(s,"diveCanvas=diveFx.querySelector('canvas');try{diveCtx=diveCanvas?.getContext('2d',{alpha:true})||null}catch(_){diveCtx=null}","diveCanvas=diveFx.querySelector('canvas');diveCanvas?.remove();diveCanvas=null;diveCtx=null")
    # The bathymetric shading layer is normally hidden and revealed at the actual water crossing.
    s=once(s,"layout:{visibility:state.diving?'visible':'none'}","layout:{visibility:Number(window.__BP_WATER_SUBMERGENCE_V2__||0)>0?'visible':'none'}")
    s=once(s,"const visibility=state.diving?'visible':'none';","const visibility=Number(window.__BP_WATER_SUBMERGENCE_V2__||0)>0?'visible':'none';")
    s=once(s,"'hillshade-exaggeration':.62,'hillshade-shadow-color':'#071c30','hillshade-highlight-color':'#a0c3c8','hillshade-accent-color':'#183c4e'","'hillshade-exaggeration':.85,'hillshade-shadow-color':'#10263b','hillshade-highlight-color':'#d0e9df','hillshade-accent-color':'#4d818d'")
    s=once(s,"map.easeTo(targetView);","""window.__BP_WATER_SUBMERGENCE_V2__=0;
    const startAltitude=Math.max(8,Math.min(400,Math.abs(targetAltitude)*.15));
    const entry=map.calculateCameraOptionsFromCameraLngLatAltRotation?.(point,startAltitude,saved.bearing,58);
    if(entry?.center&&Number.isFinite(entry.zoom)&&Number.isFinite(entry.elevation)){
      map.easeTo({...entry,duration:800,essential:true});
      await waitForMapMove(1400);
    }
    map.easeTo({...targetView,duration:2300,essential:true,easing:t=>t*t*(3-2*t)});""")
    s=once(s,"await waitForMapMove(2400);","await waitForMapMove(3300);")
    s=once(s,"startDiveEffects(true,Math.abs(targetAltitude));map.triggerRepaint?.();","window.__BP_WATER_SUBMERGENCE_V2__=1;startDiveEffects(!diveFx?.classList.contains('active'),Math.abs(targetAltitude));if(map.getLayer(B))map.setLayoutProperty(B,'visibility','visible');map.triggerRepaint?.();")
    s=once(s,"map.on('zoomend',onZoom);","map.on('zoomend',onZoom);map.on('move',updateSubmergence);")
    s=once(s,"map.off('zoomend',onZoom);","map.off('zoomend',onZoom);map.off('move',updateSubmergence);")
    s=s.replace("window.__BP_UNDERWATER_DIVE_ACTIVE__=false;","window.__BP_UNDERWATER_DIVE_ACTIVE__=false;window.__BP_WATER_SUBMERGENCE_V2__=0;")
    # Use a translucent, depth-dependent dark blue haze instead of an opaque blue wash.
    s=once(s,".34)));mix-blend-mode:screen}',",".34)));mix-blend-mode:normal}',")
    return s
for name,patch in [(watername,water),(sensorname,sensor)]:
    root=site/name
    result=patch(root.read_text(encoding='utf-8'))
    for rel in (name,'app/'+name):
        path=site/rel
        if not path.is_file(): raise SystemExit('missing production module '+rel)
        path.write_text(result,encoding='utf-8')
for rel in ('landing.js','app.js'):
    path=site/rel;s=path.read_text(encoding='utf-8')
    for name in (watername,sensorname):
        s,n=re.subn(re.escape(name)+r'\?v=[^\s\x22\x27)]+',name+'?v='+key,s)
        if name==watername and n<1: raise SystemExit('missing water import '+rel)
    path.write_text(s,encoding='utf-8')
for rel,stem in [('index.html','landing.js'),('app/index.html','app.js')]:
    path=site/rel;s=path.read_text(encoding='utf-8')
    s,n=re.subn(r'('+re.escape(stem)+r'\?v=)[^&\s\x22\x27]+',lambda m:m.group(1)+key,s,count=1)
    if n!=1: raise SystemExit('missing entry cache key '+rel)
    path.write_text(s,encoding='utf-8')
if snapshot()!=before: raise SystemExit('unrelated production assets changed')
for name in (watername,sensorname):
    assert (site/name).read_bytes()==(site/'app'/name).read_bytes()
print('LIQUID_WHITEWATER_BUBBLES_SCOPE_PASS',len(before),'unrelated files preserved')
