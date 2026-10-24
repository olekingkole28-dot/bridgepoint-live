import{VERSION,EMPTY,MOBILE,LOW,TIER,edge,publicRpc,bbox,fc,clamp}from'./world-v2300-config.js?v=6091-public-weather-rpc';
import{initRainLayer}from'./world-v2300-rain.js?v=6131-close-zoom-rain-density';
import{initLightningLayer}from'./world-v2300-lightning.js?v=6134-cloud-illumination';

function retireLegacyScreenSpaceRain() {
  // V1997/V2081 draws source events into a viewport-sized canvas. That old layer
  // is the screen-locked precipitation users can still see sliding during camera moves.
  // Block its loader before it executes, then remove any canvas already attached.
  try { window.__bridgepointGpuWeatherRuntimeV2081 = true; } catch (_) {}
  let removed = false;
  try {
    const canvas = document.getElementById('bp2081WeatherCanvas');
    if (canvas) {
      try { canvas.style.display = 'none'; canvas.style.visibility = 'hidden'; } catch (_) {}
      try { canvas.remove(); removed = true; } catch (_) {}
    }
  } catch (_) {}
  const prior = window.__BP_SCREEN_SPACE_RAIN_RETIRE_V6063__;
  window.__BP_SCREEN_SPACE_RAIN_RETIRE_V6063__ = {
    version: 6063,
    legacyRuntimeBlocked: true,
    legacyRainCanvasRemoved: removed || !!prior?.legacyRainCanvasRemoved,
    renderer: 'geographically-anchored-v2300',
    updatedAt: Date.now()
  };
  return window.__BP_SCREEN_SPACE_RAIN_RETIRE_V6063__;
}

window.__BP_WEATHER_PERFORMANCE_V5822__={version:5822,stableRadarDrape:true,radarBelow3D:true,motionRepaintBudgeted:true,updatedAt:Date.now()};

const RADAR='https://mapservices.weather.noaa.gov/eventdriven/services/radar/radar_base_reflectivity_time/ImageServer/WMSServer?SERVICE=WMS&REQUEST=GetMap&VERSION=1.3.0&LAYERS=1&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&CRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256';
const SNOW_DEPTH='https://mapservices.weather.noaa.gov/raster/services/snow/NOHRSC_Snow_Analysis/MapServer/WMSServer?SERVICE=WMS&REQUEST=GetMap&VERSION=1.1.1&LAYERS=0&STYLES=&FORMAT=image/png&TRANSPARENT=TRUE&SRS=EPSG:3857&BBOX={bbox-epsg-3857}&WIDTH=256&HEIGHT=256';
const BUDGET={LOW:{precip:300,cloud:0,fire:44,smoke:54,storm:64,ash:18,max:760},MID:{precip:680,cloud:0,fire:110,smoke:135,storm:180,ash:44,max:1600},HIGH:{precip:1100,cloud:0,fire:210,smoke:250,storm:360,ash:80,max:2300}}[TIER];
const MAX_POINTS=BUDGET.max,STRIDE=7,DATA=new Float32Array(MAX_POINTS*STRIDE),RAD=Math.PI/180;
const EMPTY_SCENE={alerts:[],fires:[],earthquakes:[],storms:[],thermal:[],observations:[],lightning:[],burn_scars:[],water_levels:[],volcanoes:[],geysers:[],flood_depths:[],snow_depths:[],precipitation_accumulation:[],fog_fields:[]};
const hash=n=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x)},mod=(v,m)=>((v%m)+m)%m,text=v=>String(v??'').toLowerCase();

function add(map,l,before){try{if(!map.getLayer(l.id))map.addLayer(l,before&&map.getLayer(before)?before:undefined)}catch(e){console.warn('V2300 weather layer',l.id,e)}}
function setSource(map,id,data){try{map.getSource(id)?.setData(data)}catch(_){}}
function geom(g,p={}){return g?{type:'Feature',geometry:g,properties:p}:null}
function point(lng,lat,p={}){return Number.isFinite(+lng)&&Number.isFinite(+lat)?{type:'Feature',geometry:{type:'Point',coordinates:[+lng,+lat]},properties:p}:null}
function center(g){const a=[];const walk=v=>{if(!Array.isArray(v))return;if(v.length>=2&&typeof v[0]==='number'&&typeof v[1]==='number'){a.push(v);return}for(const x of v)walk(x)};walk(g?.coordinates);if(!a.length)return null;let x=0,y=0;for(const p of a){x+=p[0];y+=p[1]}return{lng:x/a.length,lat:y/a.length}}
function geometryOf(x){let g=x?.geometry??x?.geometry_geojson??x?.geojson??(x?.type&&x?.coordinates?x:null);if(typeof g==='string'){try{g=JSON.parse(g)}catch(_){return null}}if(g?.type==='Feature')g=g.geometry;return g?.type&&g?.coordinates?g:null}
function eventCenter(x){const g=geometryOf(x);if(g){if(g.type==='Point')return{lng:+g.coordinates[0],lat:+g.coordinates[1]};const c=center(g);if(c&&Number.isFinite(c.lng)&&Number.isFinite(c.lat))return c}const lng=Number(x?.lng??x?.longitude),lat=Number(x?.lat??x?.latitude);return Number.isFinite(lng)&&Number.isFinite(lat)?{lng,lat}:null}
function outerRing(g){const p=geometryOf(g);if(p?.type==='Polygon')return p.coordinates?.[0]||[];if(p?.type==='MultiPolygon'){let best=[];for(const poly of p.coordinates||[])if((poly?.[0]||[]).length>best.length)best=poly[0];return best}return[]}
function boundaryScreens(g,projectPoint){const r=outerRing(g);if(!r.length)return[];const count=Math.min(24,r.length),step=Math.max(1,Math.floor(r.length/count)),out=[];for(let i=0;i<r.length;i+=step){const q=r[i];if(!Array.isArray(q)||q.length<2)continue;const p=projectPoint?.({lng:+q[0],lat:+q[1]});if(p)out.push(p)}return out}
function depthOf(x,keys){const p=x?.properties||x||{};for(const k of keys){const v=Number(p[k]);if(Number.isFinite(v)&&v>0)return clamp(v,0,12)}return null}
function depthFeatures(items,keys,fallback){const out=[];for(const x of items||[]){const g=geometryOf(x),depth=depthOf(x,keys);if(!g||!['Polygon','MultiPolygon'].includes(g.type)||depth==null)continue;const p=x?.properties||x||{};out.push(geom(g,{depth_m:depth,source:p.source||p.provenance||fallback||'source-reported depth',event:p.event||p.name||''}))}return out}
function activeEruption(x){const p=x?.properties||x||{},s=text([p.status,p.event,p.alert_level,p.activity,p.description].filter(Boolean).join(' '));return p.erupting===true||p.is_erupting===true||p.active_eruption===true||/active eruption|ongoing eruption|erupting|lava flow/.test(s)}
function pointInRing(pt,ring){let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const xi=+ring[i][0],yi=+ring[i][1],xj=+ring[j][0],yj=+ring[j][1],hit=((yi>pt.lat)!=(yj>pt.lat))&&(pt.lng<(xj-xi)*(pt.lat-yi)/((yj-yi)||1e-12)+xi);if(hit)inside=!inside}return inside}
function pointInGeom(pt,g){if(!g||!pt)return false;const p=g.type==='Feature'?g.geometry:g;if(p?.type==='Polygon')return Array.isArray(p.coordinates?.[0])&&pointInRing(pt,p.coordinates[0]);if(p?.type==='MultiPolygon')return (p.coordinates||[]).some(poly=>Array.isArray(poly?.[0])&&pointInRing(pt,poly[0]));return false}
function distance2(a,b){const lat=((+a.lat+ +b.lat)*.5)*RAD,dx=(+a.lng- +b.lng)*Math.cos(lat),dy=(+a.lat- +b.lat);return dx*dx+dy*dy}
function ring(c,r,n=18,phase=0){const lm=111320,xm=Math.max(18000,lm*Math.cos(c.lat*RAD)),a=[];for(let i=0;i<=n;i++){const t=i/n*Math.PI*2+phase;a.push([c.lng+Math.cos(t)*r/xm,c.lat+Math.sin(t)*r/lm])}return a}
function polar(c,r,a){const lm=111320,xm=Math.max(18000,lm*Math.cos(c.lat*RAD));return[c.lng+Math.cos(a)*r/xm,c.lat+Math.sin(a)*r/lm]}
function strip(a,b,w){const lat=(a[1]+b[1])/2,lm=111320,xm=Math.max(18000,lm*Math.cos(lat*RAD)),dx=(b[0]-a[0])*xm,dy=(b[1]-a[1])*lm,L=Math.max(.001,Math.hypot(dx,dy)),nx=-dy/L*w/2,ny=dx/L*w/2,ox=nx/xm,oy=ny/lm;return[[a[0]+ox,a[1]+oy],[b[0]+ox,b[1]+oy],[b[0]-ox,b[1]-oy],[a[0]-ox,a[1]-oy],[a[0]+ox,a[1]+oy]]}
function alertText(a){const p=a?.properties||{};return text([p.phenom,p.event,p.prod_type,p.headline,p.description].filter(Boolean).join(' '))}
function flood(a){const ph=String(a?.properties?.phenom||'').toUpperCase();return['FF','FA','FL'].includes(ph)||/flood/.test(alertText(a))}
function ice(a){return/ice storm|freezing rain|freezing drizzle|winter storm|blizzard|heavy snow|snow squall/.test(alertText(a))}
function tornado(a){return String(a?.properties?.phenom||'').toUpperCase()==='TO'||/tornado/.test(alertText(a))}
function precip(o){const s=text([o?.weather,o?.present_weather,o?.weather_text,o?.wx,o?.condition,o?.conditions,o?.rawdata].filter(Boolean).join(' '));if(/\b(gr|gs)\b|hail|ice pellet|graupel/.test(s))return'hail';if(/\bsn\b|snow|flurr|blizzard/.test(s))return'snow';if(/\bra\b|\bdz\b|rain|drizzle|shower|thunderstorm|\bts\b/.test(s))return'rain';return'none'}

function baseLayers(map){
 for(const id of ['wx-alerts','wx-fires','wx-quakes','wx-storms','wx-thermal','wx-obs','wx-water'])if(!map.getSource(id))map.addSource(id,{type:'geojson',data:EMPTY});
 if(!map.getSource('wx-radar'))try{map.addSource('wx-radar',{type:'raster',tiles:[RADAR],tileSize:256,minzoom:2,maxzoom:14,attribution:'NOAA/NWS radar'})}catch(_){}
 if(!map.getSource('wx-snow-depth'))try{map.addSource('wx-snow-depth',{type:'raster',tiles:[SNOW_DEPTH],bounds:[-180,15,-50,75],tileSize:256,minzoom:4,maxzoom:12,attribution:'NOAA/NWS NOHRSC National Snow Analysis · modeled/assimilated 1-km snow depth'})}catch(_){}
 const before=map.getLayer('gta-exact-building')?'gta-exact-building':undefined;
 add(map,{id:'wx-snow-depth',type:'raster',source:'wx-snow-depth',minzoom:4,maxzoom:15,paint:{'raster-opacity':['interpolate',['linear'],['zoom'],4,.14,8,.2,13,.24,15,.18],'raster-saturation':-.18,'raster-contrast':.08,'raster-fade-duration':0}},before);
 add(map,{id:'wx-alert-fill',type:'fill',source:'wx-alerts',paint:{'fill-color':['match',['upcase',['coalesce',['get','phenom'],'']],'TO','#ff3c6e','SV','#ffb84a','FF','#34d7ff','FA','#34d7ff','HU','#d764ff','TR','#d764ff','#ff9a56'],'fill-opacity':.26}},before);
 add(map,{id:'wx-alert-line',type:'line',source:'wx-alerts',paint:{'line-color':['match',['upcase',['coalesce',['get','phenom'],'']],'TO','#ff3c6e','SV','#ffb84a','FF','#34d7ff','FA','#34d7ff','HU','#d764ff','TR','#d764ff','#ff9a56'],'line-width':['interpolate',['linear'],['zoom'],0,1.6,2,2,6,2.8,10,3.8,17,5],'line-opacity':.98}},before);
 add(map,{id:'wx-fire-fill',type:'fill',source:'wx-fires',paint:{'fill-color':'#ff4f29','fill-opacity':.23}},before);
 add(map,{id:'wx-fire-line',type:'line',source:'wx-fires',paint:{'line-color':'#ff7c3d','line-width':['interpolate',['linear'],['zoom'],0,1.5,4,2,10,3.2,17,5],'line-opacity':.98,'line-blur':.4}},before);
 add(map,{id:'wx-thermal',type:'heatmap',source:'wx-thermal',maxzoom:15,paint:{'heatmap-weight':['interpolate',['linear'],['coalesce',['get','frp'],0],0,.2,80,1],'heatmap-intensity':['interpolate',['linear'],['zoom'],4,.4,12,1.2],'heatmap-radius':['interpolate',['linear'],['zoom'],4,5,12,18],'heatmap-opacity':.78}},before);
 add(map,{id:'wx-quake-glow',type:'circle',source:'wx-quakes',paint:{'circle-radius':['interpolate',['linear'],['coalesce',['get','magnitude'],0],0,4,3,9,6,18],'circle-color':'#ff4fd6','circle-opacity':.28,'circle-blur':.7}},before);
 add(map,{id:'wx-quake',type:'circle',source:'wx-quakes',paint:{'circle-radius':['interpolate',['linear'],['coalesce',['get','magnitude'],0],0,2,3,5,6,11],'circle-color':'#fff0fa','circle-stroke-color':'#ff4fd6','circle-stroke-width':2,'circle-opacity':.95}},before);
 add(map,{id:'wx-storm-glow',type:'circle',source:'wx-storms',paint:{'circle-radius':['interpolate',['linear'],['coalesce',['get','wind_mph'],0],0,7,75,18,150,30],'circle-color':'#b555ff','circle-opacity':.28,'circle-blur':.75}},before);
 add(map,{id:'wx-storm',type:'circle',source:'wx-storms',paint:{'circle-radius':7,'circle-color':'#e8c9ff','circle-stroke-color':'#b555ff','circle-stroke-width':2}},before);
 add(map,{id:'wx-obs',type:'circle',source:'wx-obs',minzoom:2,paint:{'circle-radius':['interpolate',['linear'],['zoom'],2,2.2,6,3.2,12,5],'circle-color':['interpolate',['linear'],['coalesce',['get','temperature_f'],60],0,'#70b8ff',55,'#d4f7ff',80,'#ffcf7e',105,'#ff5c48'],'circle-opacity':.91,'circle-stroke-color':'#081621','circle-stroke-width':['interpolate',['linear'],['zoom'],2,.65,8,1.1,14,1.5]}},before);
 add(map,{id:'wx-water',type:'circle',source:'wx-water',minzoom:3,paint:{'circle-radius':['interpolate',['linear'],['zoom'],3,2.4,8,3.7,13,5.2],'circle-color':'#78e8ff','circle-stroke-color':'#0d5877','circle-stroke-width':['interpolate',['linear'],['zoom'],3,.9,13,1.6],'circle-opacity':.97}},before);
 add(map,{id:'wx-radar-haze',type:'raster',source:'wx-radar',minzoom:2,maxzoom:24,layout:{visibility:'none'},paint:{'raster-opacity':LOW?.14:.18,'raster-hue-rotate':185,'raster-saturation':-.28,'raster-contrast':-.08,'raster-brightness-max':.92,'raster-fade-duration':0,'raster-resampling':'linear'}},before);
 add(map,{id:'wx-radar',type:'raster',source:'wx-radar',minzoom:2,maxzoom:24,layout:{visibility:'none'},paint:{'raster-opacity':LOW?.54:.70,'raster-saturation':.22,'raster-contrast':.13,'raster-fade-duration':0,'raster-resampling':'linear'}},before);
 try{for(const id of ['wx-radar-haze','wx-radar'])if(before&&map.getLayer(id))map.moveLayer(id,before)}catch(_){}
}


const LEGACY_NATIVE_WEATHER_LAYERS=['wx-snow-depth','wx-alert-fill','wx-fire-fill','wx-thermal','wx-quake-glow','wx-storm-glow'];
function hideLegacyNativeWeatherLayers(map){
 for(const id of LEGACY_NATIVE_WEATHER_LAYERS)try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none')}catch(_){}
}
const CLOUDS_ONLY_PHASE=()=>window.__BP_CLOUDS_ONLY_PHASE_V6070__===true;
const CLOUD_PHASE_HIDDEN_LAYERS=['bp-radar-a','bp-radar-b','bp5510-global-imerg','wx-snow-depth','wx-alert-fill','wx-fire-fill','wx-thermal','wx-quake-glow','wx-storm-glow','wx-radar-haze','wx-radar','bp2300-weather-fx-gpu','bp2300-rain-world-volume-v6068','bp2300-fx-flood-fill','bp2300-fx-flood-line','bp2300-fx-ice-fill','bp2300-fx-ice-line','bp2300-fx-burn','bp2300-fx-containment','bp2300-fx-tornado','bp2300-fx-hurricane','bp2300-fx-flood-depth-volume','bp2300-fx-snow-depth-volume','bp2300-fx-wet-ground','bp2300-fx-lava-glow','bp2300-fx-lava-flow','bp-landing-radar-a','bp-landing-radar-b'];
function hideCloudPhaseVisuals(map){
 if(!CLOUDS_ONLY_PHASE()||!map)return;
 let hidden=0;
 for(const id of CLOUD_PHASE_HIDDEN_LAYERS)try{if(map.getLayer(id)&&(map.getLayoutProperty(id,'visibility')||'visible')!=='none'){map.setLayoutProperty(id,'visibility','none');hidden++}}catch(_){}
 for(const id of ['bp2081WeatherCanvas'])try{const el=document.getElementById(id);if(el){el.style.display='none';el.style.visibility='hidden'}}catch(_){}
 for(const sel of ['[data-layer="radar"]']){const b=document.querySelector(sel);if(b){b.classList.remove('active');b.setAttribute('aria-pressed','false')}}
 window.__BP_CLOUDS_ONLY_PHASE_STATE_V6070__={enabled:true,weatherFeedRetained:true,nonCloudVisualsHidden:true,hiddenLayerPasses:hidden,updatedAt:Date.now()};
}
function captureWeatherGLState(gl, locations, vaoExt = null, isolatedVao = false) {
  const enabled = name => { try { return gl.isEnabled(gl[name]); } catch (_) { return false; } };
  const parameter = name => { try { return gl.getParameter(gl[name]); } catch (_) { return null; } };
  let vaoMode = 'none', vaoBinding = null;
  try {
    if (typeof gl.bindVertexArray === 'function' && gl.VERTEX_ARRAY_BINDING != null) {
      vaoMode = 'native'; vaoBinding = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
    } else if (vaoExt?.bindVertexArrayOES && vaoExt.VERTEX_ARRAY_BINDING_OES != null) {
      vaoMode = 'extension'; vaoBinding = gl.getParameter(vaoExt.VERTEX_ARRAY_BINDING_OES);
    }
  } catch (_) {}
  const attributes = isolatedVao ? [] : locations.filter(a => a >= 0).map(location => {
    try {
      return {
        location,
        enabled: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_ENABLED),
        buffer: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING),
        size: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_SIZE),
        type: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_TYPE),
        normalized: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_NORMALIZED),
        stride: gl.getVertexAttrib(location, gl.VERTEX_ATTRIB_ARRAY_STRIDE),
        offset: gl.getVertexAttribOffset(location, gl.VERTEX_ATTRIB_ARRAY_POINTER)
      };
    } catch (_) { return null; }
  }).filter(Boolean);
  return {
    program: parameter('CURRENT_PROGRAM'), array: parameter('ARRAY_BUFFER_BINDING'),
    element: parameter('ELEMENT_ARRAY_BUFFER_BINDING'), depth: enabled('DEPTH_TEST'),
    blend: enabled('BLEND'), cull: enabled('CULL_FACE'), stencil: enabled('STENCIL_TEST'),
    scissor: enabled('SCISSOR_TEST'), depthMask: parameter('DEPTH_WRITEMASK'),
    colorMask: parameter('COLOR_WRITEMASK'), srcRgb: parameter('BLEND_SRC_RGB'),
    dstRgb: parameter('BLEND_DST_RGB'), srcA: parameter('BLEND_SRC_ALPHA'),
    dstA: parameter('BLEND_DST_ALPHA'), eqRgb: parameter('BLEND_EQUATION_RGB'),
    eqA: parameter('BLEND_EQUATION_ALPHA'), attributes, vaoMode, vaoBinding, vaoExt, isolatedVao
  };
}
function bindWeatherVertexArray(gl, vao, mode, vaoExt) {
  if (!vao) return;
  try {
    if (mode === 'native') gl.bindVertexArray(vao);
    else if (mode === 'extension') vaoExt?.bindVertexArrayOES?.(vao);
  } catch (_) {}
}
function restoreWeatherGLState(gl, state) {
  if (!state) return;
  const capability = (name, value) => { try { if (value) gl.enable(gl[name]); else gl.disable(gl[name]); } catch (_) {} };
  try {
    if (state.vaoMode === 'native') gl.bindVertexArray(state.vaoBinding);
    else if (state.vaoMode === 'extension') state.vaoExt?.bindVertexArrayOES?.(state.vaoBinding);
  } catch (_) {}
  if (!state.isolatedVao) {
    for (const a of state.attributes || []) {
      try {
        if (a.buffer) {
          gl.bindBuffer(gl.ARRAY_BUFFER, a.buffer);
          gl.vertexAttribPointer(a.location, a.size, a.type, !!a.normalized, a.stride, a.offset);
        }
        if (a.enabled) gl.enableVertexAttribArray(a.location); else gl.disableVertexAttribArray(a.location);
      } catch (_) {}
    }
  }
  try { if (state.depthMask != null) gl.depthMask(state.depthMask); } catch (_) {}
  try { if (state.colorMask) gl.colorMask(...Array.from(state.colorMask)); } catch (_) {}
  capability('DEPTH_TEST', state.depth); capability('BLEND', state.blend);
  capability('CULL_FACE', state.cull); capability('STENCIL_TEST', state.stencil);
  capability('SCISSOR_TEST', state.scissor);
  try { if ([state.srcRgb,state.dstRgb,state.srcA,state.dstA].every(v => v != null)) gl.blendFuncSeparate(state.srcRgb,state.dstRgb,state.srcA,state.dstA); } catch (_) {}
  try { if (state.eqRgb != null && state.eqA != null) gl.blendEquationSeparate(state.eqRgb,state.eqA); } catch (_) {}
  try { gl.useProgram(state.program); } catch (_) {}
  try { gl.bindBuffer(gl.ARRAY_BUFFER, state.array); } catch (_) {}
  try { gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, state.element); } catch (_) {}
}

function createFx(map){
 if(window.__bpWeatherFXV2300?.map===map)return window.__bpWeatherFXV2300;
 let scene={...EMPTY_SCENE},enabled=!CLOUDS_ONLY_PHASE(),moving=false,quality=1,fps=60,bad=0,good=0,lastFrame=0,lastWater=0,timer=0,shaderReady=false,activeParticles=0,program=null,buffer=null,attrs=null,weatherVao=null,weatherVaoExt=null,weatherVaoMode='none',generatedAt=null,monitorRaf=0,nearestObsCache=null,nearestObsCacheAt=0,nearestObsCacheValid=false,animationCheckAt=0,animationCheckCached=false,waterPulse=false;let particleLayerRetryAt=0;let schedulerMode='uninitialized';
 function publishSchedulerState(mode){if(mode===schedulerMode)return;schedulerMode=mode;window.__BP_WEATHER_RENDER_SCHEDULER_V6040__={version:6040,mode,enabled,moving,waterHazardAnimation:waterPulse,visibleAnimatedEffects:animationCheckCached,estimatedFps:+fps.toFixed(1),qualityScale:+quality.toFixed(2),activeParticles,maxPoints:MAX_POINTS,counts:{fires:scene.fires.length,storms:scene.storms.length,observations:scene.observations.length,alerts:scene.alerts.length},updatedAt:Date.now()}}
 const ids=['bp2300-fx-flood','bp2300-fx-ice','bp2300-fx-burn','bp2300-fx-containment','bp2300-fx-tornado-src','bp2300-fx-hurricane-src','bp2300-fx-flood-depth-src','bp2300-fx-snow-depth-src','bp2300-fx-lava-src','bp2300-fx-wet-ground-src'];
 function ensureNative(){
  for(const id of ids)if(!map.getSource(id))try{map.addSource(id,{type:'geojson',data:EMPTY})}catch(_){}
  const before=map.getLayer('gta-selected-body')?'gta-selected-body':undefined;
  add(map,{id:'bp2300-fx-flood-fill',type:'fill',source:'bp2300-fx-flood',paint:{'fill-color':'#1fb8ff','fill-opacity':.13}},before);add(map,{id:'bp2300-fx-flood-line',type:'line',source:'bp2300-fx-flood',paint:{'line-color':'#75e5ff','line-width':['interpolate',['linear'],['zoom'],4,1.2,16,4],'line-opacity':.82}},before);
  add(map,{id:'bp2300-fx-ice-fill',type:'fill',source:'bp2300-fx-ice',paint:{'fill-color':'#e8fbff','fill-opacity':.1}},before);add(map,{id:'bp2300-fx-ice-line',type:'line',source:'bp2300-fx-ice',paint:{'line-color':'#caf7ff','line-width':['interpolate',['linear'],['zoom'],4,.8,16,2.6],'line-opacity':.82,'line-dasharray':[2,1.5]}},before);
  add(map,{id:'bp2300-fx-burn',type:'fill',source:'bp2300-fx-burn',paint:{'fill-color':'#160d0c','fill-opacity':.43}},before);add(map,{id:'bp2300-fx-containment',type:'line',source:'bp2300-fx-containment',paint:{'line-color':['interpolate',['linear'],['coalesce',['to-number',['get','contained_pct']],0],0,'#ff3b1f',50,'#ffb02d',100,'#75ff8a'],'line-width':['interpolate',['linear'],['zoom'],5,1.4,15,4.5,19,6],'line-opacity':.96}},before);
  add(map,{id:'bp2300-fx-tornado',type:'fill-extrusion',source:'bp2300-fx-tornado-src',paint:{'fill-extrusion-base':['get','base'],'fill-extrusion-height':['get','top'],'fill-extrusion-color':['interpolate',['linear'],['get','u'],0,'#33393d',1,'#b8c2c5'],'fill-extrusion-opacity':.34,'fill-extrusion-vertical-gradient':true}},before);
  add(map,{id:'bp2300-fx-hurricane',type:'fill-extrusion',source:'bp2300-fx-hurricane-src',paint:{'fill-extrusion-base':['get','base'],'fill-extrusion-height':['get','top'],'fill-extrusion-color':['interpolate',['linear'],['get','u'],0,'#8099a5',.55,'#c6dbe4',1,'#f0fbff'],'fill-extrusion-opacity':.12,'fill-extrusion-vertical-gradient':true}},before);
  const belowLabels=map.getStyle?.()?.layers?.find(l=>l.type==='symbol')?.id;
  add(map,{id:'bp2300-fx-flood-depth-volume',type:'fill-extrusion',source:'bp2300-fx-flood-depth-src',paint:{'fill-extrusion-base':0,'fill-extrusion-height':['get','depth_m'],'fill-extrusion-color':'#2bafff','fill-extrusion-opacity':['interpolate',['linear'],['get','depth_m'],0,.12,.5,.28,2,.42,6,.52],'fill-extrusion-vertical-gradient':true}},belowLabels);
  add(map,{id:'bp2300-fx-snow-depth-volume',type:'fill-extrusion',source:'bp2300-fx-snow-depth-src',paint:{'fill-extrusion-base':0,'fill-extrusion-height':['get','depth_m'],'fill-extrusion-color':'#e9f8ff','fill-extrusion-opacity':['interpolate',['linear'],['get','depth_m'],0,.08,.1,.18,.5,.30,2,.4],'fill-extrusion-vertical-gradient':true}},belowLabels);
  add(map,{id:'bp2300-fx-wet-ground',type:'fill',source:'bp2300-fx-wet-ground-src',paint:{'fill-color':'#17678b','fill-opacity':['interpolate',['linear'],['get','accumulation_mm'],0,.04,5,.12,20,.22,80,.32]}},before);
  add(map,{id:'bp2300-fx-lava-glow',type:'line',source:'bp2300-fx-lava-src',paint:{'line-color':'#ff3b08','line-width':['interpolate',['linear'],['zoom'],4,1.3,10,5,16,13],'line-blur':2.4,'line-opacity':.72}},belowLabels);
  add(map,{id:'bp2300-fx-lava-flow',type:'line',source:'bp2300-fx-lava-src',paint:{'line-color':'#ffb13b','line-width':['interpolate',['linear'],['zoom'],4,.6,10,2,16,4.5],'line-opacity':.98}},belowLabels);
 }
 function tornadoGeo(){const fs=[],a=scene.alerts.filter(tornado).slice(0,LOW?3:MOBILE?5:8),levels=LOW?5:8;for(const x of a){const c=center(x.geometry);if(!c)continue;for(let i=0;i<levels;i++){const u=i/(levels-1),r=45+u*210,base=u*800;fs.push({type:'Feature',geometry:{type:'Polygon',coordinates:[ring(c,r,LOW?12:18,i*.32)]},properties:{base,top:base+145,u}})}}return fc(fs)}
 function hurricaneGeo(){const fs=[],a=scene.storms.filter(s=>Number.isFinite(+s.lng)&&Number.isFinite(+s.lat)).slice(0,LOW?2:MOBILE?3:5),arms=LOW?3:5,segs=LOW?5:8;for(const s of a){const c={lng:+s.lng,lat:+s.lat},wind=clamp(+s.wind_mph||70,30,190),eye=clamp((+s.eye_radius_mi||12)*1609,4500,60000),outer=clamp(80000+wind*900,100000,250000);for(let a0=0;a0<arms;a0++)for(let i=0;i<segs;i++){const u0=i/segs,u1=(i+1)/segs,r0=eye+u0*(outer-eye),r1=eye+u1*(outer-eye),p0=polar(c,r0,a0*Math.PI*2/arms+u0*6.2),p1=polar(c,r1,a0*Math.PI*2/arms+u1*6.2),base=600+u1*400;fs.push({type:'Feature',geometry:{type:'Polygon',coordinates:[strip(p0,p1,8000+u1*15000)]},properties:{base,top:base+1000+wind*7+u1*900,u:u1}})}}return fc(fs)}
 function native(){ensureNative();setSource(map,'bp2300-fx-flood',fc(scene.alerts.filter(flood).map(x=>geom(x.geometry,{source:x.properties?.source||'NOAA/NWS'}))));setSource(map,'bp2300-fx-ice',fc(scene.alerts.filter(ice).map(x=>geom(x.geometry,{source:x.properties?.source||'NOAA/NWS'}))));setSource(map,'bp2300-fx-burn',fc(scene.burn_scars.map(x=>geom(x.geometry||x,{source:x.source||'authoritative burn-scar source'}))));setSource(map,'bp2300-fx-containment',fc(scene.fires.map(x=>geom(x.geometry,{contained_pct:+x.contained_pct||0,name:x.name||'',source:x.source||''}))));setSource(map,'bp2300-fx-tornado-src',tornadoGeo());setSource(map,'bp2300-fx-hurricane-src',hurricaneGeo());
 const floodItems=[...(scene.flood_depths||[]),...(scene.alerts||[]).filter(flood)];
 setSource(map,'bp2300-fx-flood-depth-src',fc(depthFeatures(floodItems,['flood_depth_m','water_depth_m','inundation_depth_m','depth_m'],'measured flood/inundation depth')));
 setSource(map,'bp2300-fx-snow-depth-src',fc(depthFeatures(scene.snow_depths||[],['snow_depth_m','depth_m'],'source-reported snow depth')));
 setSource(map,'bp2300-fx-wet-ground-src',fc((scene.precipitation_accumulation||[]).map(x=>{const g=geometryOf(x),p=x?.properties||x||{},mm=Number(p.accumulation_mm??p.rain_accumulation_mm??p.precipitation_mm);return g&&['Polygon','MultiPolygon'].includes(g.type)&&Number.isFinite(mm)&&mm>0?geom(g,{accumulation_mm:clamp(mm,0,500),source:p.source||p.provenance||'source-reported precipitation accumulation'}):null}).filter(Boolean)));
 setSource(map,'bp2300-fx-lava-src',fc((scene.volcanoes||[]).filter(activeEruption).map(x=>{const p=x?.properties||x||{},g=geometryOf(p.lava_flow_geometry||p.lava_geometry||p.flow_geometry||p.lava_flow);return g&&['LineString','MultiLineString'].includes(g.type)?geom(g,{source:p.source||p.provenance||'source-reported volcanic lava flow',name:p.name||''}):null}).filter(Boolean)))
}
 function nearestObs(){const now=performance.now();if(nearestObsCacheValid&&now-nearestObsCacheAt<500)return nearestObsCache;const c=map.getCenter();let best=null,d0=Infinity;for(const o of scene.observations){if(!Number.isFinite(+o.lng)||!Number.isFinite(+o.lat))continue;const d=(+o.lng-c.lng)**2+(+o.lat-c.lat)**2;if(d<d0){d0=d;best=o}}nearestObsCache=best;nearestObsCacheAt=now;nearestObsCacheValid=true;return best}
 function wind(o){const mph=Number(o?.wind_speed_mph??(Number.isFinite(+o?.wind_speed_kt)?+o.wind_speed_kt*1.15078:0))||0,dir=Number(o?.wind_dir_deg)||0,a=(dir+180-(map.getBearing?.()||0))*RAD,k=clamp(mph/55,0,2.4);return{x:Math.sin(a)*k,y:-Math.cos(a)*k,mph}}
 function project(c){try{const p=map.project([c.lng,c.lat]),cv=map.getCanvas(),w=cv.clientWidth||1,h=cv.clientHeight||1;if(!Number.isFinite(p.x)||!Number.isFinite(p.y)||p.x<-160||p.x>w+160||p.y<-160||p.y>h+160)return null;return{x:p.x,y:p.y,w,h}}catch{return null}}
 function radiusPx(c,miles){try{const p=project(c);if(!p)return 0;const q=map.project([c.lng+miles/(69.17*Math.max(.18,Math.cos(c.lat*RAD))),c.lat]);return Math.abs(q.x-p.x)}catch{return 0}}
 function push(n,x,y,size,kind,alpha,phase,aux,w,h){if(n>=MAX_POINTS||x<-size||x>w+size||y<-size||y>h+size)return n;const o=n*STRIDE;DATA[o]=x/w*2-1;DATA[o+1]=1-y/h*2;DATA[o+2]=size;DATA[o+3]=kind;DATA[o+4]=alpha;DATA[o+5]=phase;DATA[o+6]=aux;return n+1}
 function particles(t){
  if(!enabled||document.hidden){activeParticles=0;return 0}
  const cv=map.getCanvas(),w=cv.clientWidth||1,h=cv.clientHeight||1,z=map.getZoom(),q=clamp(quality*(moving?(MOBILE?.30:.42):1),MOBILE?.28:.22,1),o=nearestObs(),wv=wind(o),TAU=Math.PI*2;let n=0;
  // Globe and local precipitation use a small set of source-backed observation cells.
  // Weather cells remain geolocated; the global view only gets tiny, sparse sprites.
  const globalView=z<3,obsLimit=LOW?120:MOBILE?220:360,precipCandidates=(scene.observations||[]).slice(0,obsLimit)
   .map(o=>({o,kind:precip(o),c:eventCenter(o)})).filter(x=>x.kind!=='none'&&x.c)
   .map(x=>({...x,p:project(x.c)})).filter(x=>x.p);
  let precipCells=[];
  if(globalView){
   const bins=new Map();
   for(const cell of precipCandidates){
    const gx=clamp(Math.floor(cell.p.x/Math.max(1,w)*4),0,3),gy=clamp(Math.floor(cell.p.y/Math.max(1,h)*3),0,2),key=gx+':'+gy;
    if(!bins.has(key))bins.set(key,cell);
   }
   precipCells=[...bins.values()].slice(0,LOW?2:MOBILE?5:8);
  }else{
   precipCandidates.sort((a,b)=>Math.hypot(a.p.x-w*.5,a.p.y-h*.5)-Math.hypot(b.p.x-w*.5,b.p.y-h*.5));
   precipCells=precipCandidates.slice(0,LOW?2:MOBILE?4:6);
  }
  if(precipCells.length){
   const total=Math.max(24,Math.floor(BUDGET.precip*q)),perCell=globalView?Math.min(30,Math.max(8,Math.floor(total/precipCells.length))):Math.max(16,Math.floor(total/precipCells.length));
   precipCells.forEach((cell,ci)=>{
    const {o:obs,kind:pr,c:precipCenter,p:precipPoint}=cell,kind=pr==='rain'?0:pr==='snow'?1:2,sp=pr==='snow'?.000055:pr==='hail'?.00034:.00023;
    if(pr==='rain')return;
    const miles=Number(obs.precipitation_radius_mi??obs.rain_radius_mi??(pr==='hail'?18:pr==='snow'?42:32)),rawRadius=radiusPx(precipCenter,Number.isFinite(miles)&&miles>0?miles:32);
    const radius=globalView?clamp(rawRadius,4,10):z<5?clamp(rawRadius,8,22):clamp(rawRadius,18,z>=8?180:125);
    const particleCount=Math.min(perCell,MAX_POINTS),flutterScale=globalView?1.1:Math.min(3,radius*.035);
    for(let i=0;i<particleCount;i++){
     const ph=hash(i+501+ci*137),u=mod(hash(i+931+ci*71)+t*sp*(.55+ph*.85),1),a=hash(i+13+ci*29)*TAU,rr=Math.sqrt(hash(i+15+ci*43))*radius,flutter=pr==='snow'?Math.sin(t*.0014+ph*19)*flutterScale:0;
     const x=precipPoint.x+Math.cos(a)*rr+wv.x*(t/1000)*(globalView?1.4:4)+flutter,y=precipPoint.y-radius+u*radius*2;
     const size=globalView?(pr==='rain'?.8+ph*.5:pr==='snow'?.7+ph*.7:.72+ph*.48):(pr==='rain'?clamp(1.35+wv.mph*.012,1.35,2.45):pr==='snow'?1.05+ph*1.45:1+ph*.78);
     n=push(n,x,y,size,kind,pr==='rain'?.62:pr==='snow'?.78:.82,ph,clamp(wv.x*.3,-.7,.7),w,h)
    }
   })
  }
  const fireLimit=LOW?3:MOBILE?6:10,fires=scene.fires.slice(0,fireLimit*3).map(x=>({x,c:eventCenter(x),edge:boundaryScreens(x.geometry,project)})).filter(x=>x.c).map(x=>({...x,p:project(x.c)})).filter(x=>x.p).slice(0,fireLimit);
  if(fires.length){const fe=Math.max(6,Math.floor(BUDGET.fire*q/fires.length)),se=Math.max(7,Math.floor(BUDGET.smoke*q/fires.length)),ae=z>=8?Math.max(0,Math.floor(BUDGET.ash*q/fires.length)):0;fires.forEach(({x,p,edge},fi)=>{const rawR=7+Math.log10(Math.max(1,+x.acres||1)+1)*8+(z-5)*1.3,r=globalView?clamp(rawR*clamp((z-.8)/3.5,.22,.65),2.4,18):clamp(rawR,7,58);for(let i=0;i<fe;i++){const ph=hash(i+fi*173+9),rise=mod(ph+t*.0005*(.7+hash(i+77)),1),a=hash(i+31)*TAU,rr=r*Math.sqrt(hash(i+91))*(1-rise*.45),anchor=edge.length&&hash(i+fi*509+27)<.72?edge[Math.floor(hash(i+fi*353+91)*edge.length)]:p;n=push(n,anchor.x+Math.cos(a)*rr+wv.x*rise*3,anchor.y-Math.sin(a)*rr*.28-rise*r*1.2,clamp(1.8+r*(.06+.10*(1-rise)),1.8,7),3,.9*(1-rise*.48),ph,0,w,h)}for(let i=0;i<se;i++){const ph=hash(i+fi*211+500),rise=mod(ph+t*.000105*(.65+hash(i+130)),1),a=hash(i+611)*TAU,rr=r*(.2+rise*.7)*hash(i+701);n=push(n,p.x+Math.cos(a)*rr+wv.x*rise*r*.9,p.y-r*.8-rise*r*2.2+Math.sin(a)*rr*.3,clamp(9+r*(.20+.32*rise),9,48),4,.22*(1-rise*.58),ph,0,w,h)}for(let i=0;i<ae;i++){const ph=hash(i+fi*97+1200),rise=mod(ph+t*.00008,1);n=push(n,p.x+(hash(i+73)-.5)*r*2+wv.x*rise*r,p.y-rise*r*2+(hash(i+17)-.5)*r,.8+hash(i+3)*1.6,7,.4*(1-rise*.5),ph,0,w,h)}})}
  const stormLimit=LOW?2:MOBILE?3:5,storms=scene.storms.slice(0,stormLimit*4).filter(s=>Number.isFinite(+s.lng)&&Number.isFinite(+s.lat)).map(s=>({s,c:{lng:+s.lng,lat:+s.lat}})).map(x=>({...x,p:project(x.c)})).filter(x=>x.p).slice(0,stormLimit);
  if(storms.length){const each=globalView?clamp(Math.floor(BUDGET.storm*q/storms.length),10,24):Math.max(16,Math.floor(BUDGET.storm*q/storms.length));storms.forEach(({s,c,p},si)=>{const windMph=clamp(+s.wind_mph||70,30,190),spin=c.lat>=0?-1:1,eye=Math.max(6,radiusPx(c,clamp(+s.eye_radius_mi||12,3,45))),outer=clamp(radiusPx(c,clamp(65+windMph*.55,70,170)),globalView?10:42,globalView?34:210);for(let i=0;i<each;i++){const u=.08+hash(i+si*311)*.92,a=spin*t*.00016+(i%5)*TAU/5+u*6.7,r=eye+u*(outer-eye);n=push(n,p.x+Math.cos(a)*r,p.y+Math.sin(a)*r*.62,1.15+u*1.5,6,.14+.19*u,hash(i+99),0,w,h)}})}
  if(z>=1){const tornadoLimit=LOW?1:MOBILE?2:4,tornadoes=(scene.alerts||[]).filter(tornado).slice(0,tornadoLimit).map(a=>({a,c:eventCenter(a)})).filter(x=>x.c).map(x=>({...x,p:project(x.c)})).filter(x=>x.p);tornadoes.forEach(({a,c,p},ti)=>{const spin=c.lat>=0?-1:1,height=globalView?clamp(14+(z-1)*12,14,38):clamp(58+(z-5.5)*18,58,230),outer=globalView?clamp(3+(z-1)*3.5,3,10):clamp(10+(z-5)*5.2,10,58),count=globalView?Math.max(6,Math.floor((LOW?10:MOBILE?16:24)*q)):Math.floor((LOW?14:MOBILE?25:46)*q);for(let i=0;i<count;i++){const phase=hash(i+ti*431),u=mod(phase+t*.00032*(.7+hash(i+ti*37)),1),ang=spin*t*.00125+i*2.399+u*TAU*3.4,rad=outer*(.08+.92*u);n=push(n,p.x+Math.cos(ang)*rad,p.y-u*height+Math.sin(ang)*rad*.12,1+hash(i+17)*1.2,6,.22+.18*u,phase,0,w,h)}const debris=globalView?Math.max(2,Math.floor((LOW?5:MOBILE?8:12)*q)):Math.floor((LOW?5:MOBILE?9:16)*q);for(let i=0;i<debris;i++){const ang=hash(i+ti*819)*TAU+t*.0007,rad=outer*(.25+.9*hash(i+52));n=push(n,p.x+Math.cos(ang)*rad,p.y+Math.sin(ang)*rad*.28,2+hash(i+73)*1.2,4,.25,hash(i+13),0,w,h)}})}
  for(let i=0;i<Math.min(scene.lightning.length,LOW?6:18);i++){const s=scene.lightning[i],c=eventCenter(s),p=c?project(c):null;if(!p)continue;const raw=s.time||s.observed_at||s.timestamp||generatedAt||'',stamp=Date.parse(raw),age=Number.isFinite(stamp)?Math.max(0,Date.now()-stamp):0,pulse=age<150?1-age/150:age<420?.18*(1-(age-150)/270):0;if(pulse>0){n=push(n,p.x,p.y,globalView?16+hash(i+107)*8:58+hash(i+107)*30,9,pulse*.5,hash(i+19),0,w,h);n=push(n,p.x,p.y-(globalView?3:7),globalView?9+hash(i+7)*5:25+hash(i+7)*13,8,pulse,hash(i+19),0,w,h)}}
  const convective=(scene.alerts||[]).filter(a=>/thunderstorm|lightning|tornado|hurricane|tropical storm|cyclone/.test(alertText(a))).slice(0,LOW?1:MOBILE?2:4),bucket=Math.floor(t/1100),flashAge=t-bucket*1100;
  if(flashAge<150)convective.forEach((a,i)=>{const c=eventCenter(a),p=c?project(c):null;if(!p||hash(i*913+bucket*109+71)<.68)return;const radius=clamp(radiusPx(c,10),14,70),dx=(hash(i+bucket*19)-.5)*radius,dy=(hash(i+bucket*31)-.5)*radius*.5,fade=1-flashAge/150;n=push(n,p.x+dx,p.y+dy,globalView?18+hash(i+bucket*47)*8:62+hash(i+bucket*47)*42,9,.48*fade,hash(i+bucket*53),0,w,h);n=push(n,p.x+dx,p.y+dy-(globalView?3:9),globalView?10+hash(i+bucket*59)*5:29+hash(i+bucket*59)*13,8,.96*fade,hash(i+bucket*67),0,w,h)});
  const quakeLimit=LOW?3:MOBILE?5:10;(scene.earthquakes||[]).slice(0,quakeLimit).forEach((e,ei)=>{const c=eventCenter(e),p=c?project(c):null;if(!p)return;const raw=e.time||e.observed_at||e.origin_time||e.timestamp||generatedAt||'',stamp=Date.parse(raw);if(!Number.isFinite(stamp))return;const age=Date.now()-stamp;if(age<0||age>90000)return;const mag=clamp(Number(e.magnitude??e.mag)||2,1,9),maxRadius=clamp(radiusPx(c,clamp(mag*2,3,22)),12,185),phase=clamp(age/90000,0,1);for(let j=0;j<3;j++){const rp=clamp(phase-j*.23,0,1);if(rp<=.015)continue;n=push(n,p.x,p.y,maxRadius*2,.0+10,.52*(1-rp),rp,0,w,h)}});
  const activeVolcanoes=(scene.volcanoes||[]).filter(activeEruption).slice(0,LOW?1:MOBILE?2:4);activeVolcanoes.forEach((v,vi)=>{const c=eventCenter(v),p=c?project(c):null;if(!p)return;const count=globalView?Math.max(4,Math.floor((LOW?6:MOBILE?10:16)*q)):Math.floor((LOW?8:MOBILE?15:26)*q),volcanoHeight=globalView?clamp(16+(z-1)*8,16,32):clamp(48+(z-4)*16,48,150);n=push(n,p.x,p.y,globalView?12+hash(vi+31)*6:34+hash(vi+31)*20,11,.28,hash(vi+47),0,w,h);for(let i=0;i<count;i++){const ph=hash(i+vi*307),rise=mod(ph+t*.00029,1),x=p.x+(hash(i+13)-.5)*(globalView?3+rise*7:5+rise*17),y=p.y-rise*volcanoHeight;n=push(n,x,y,1.1+hash(i+71)*1.4,3,.84*(1-rise*.6),ph,0,w,h);if(i%3===0)n=push(n,x+(hash(i+19)-.5)*7,y-2,3+rise*4,4,.16*(1-rise),ph,0,w,h)}});
  (scene.geysers||[]).filter(g=>g?.active!==false&&g?.is_active!==false).slice(0,LOW?1:MOBILE?2:4).forEach((g,gi)=>{const c=eventCenter(g),p=c?project(c):null;if(!p)return;const count=Math.floor((LOW?8:MOBILE?14:24)*q),height=clamp(34+(z-5)*13,34,125);for(let i=0;i<count;i++){const ph=hash(i+gi*227),u=mod(ph+t*.00048*(.8+hash(i+31)),1),x=p.x+(hash(i+67)-.5)*(3+u*13),y=p.y-u*height;n=push(n,x,y,1+hash(i+73)*1.25,1,.82*(1-u*.25),ph,0,w,h)}});
  if(z>=1){const fogs=(scene.observations||[]).filter(x=>{const v=Number(x.visibility_mi??x.visibility_miles),raw=text([x.weather,x.present_weather,x.weather_text,x.rawdata].filter(Boolean).join(' '));return(Number.isFinite(v)&&v>0&&v<1)||/\bfz\b|\bfg\b|fog|mist/.test(raw)}).slice(0,LOW?1:MOBILE?2:4);fogs.forEach((f,fi)=>{const c=eventCenter(f),p=c?project(c):null;if(!p)return;const count=globalView?Math.max(3,Math.floor((LOW?4:MOBILE?6:10)*q)):Math.floor((LOW?5:MOBILE?9:16)*q),r=globalView?clamp(radiusPx(c,8),5,12):clamp(radiusPx(c,8),22,90);for(let i=0;i<count;i++){const ph=hash(i+fi*151),a=hash(i+fi*19)*TAU,rr=Math.sqrt(hash(i+fi*31))*r+Math.sin(t*.00012+ph*TAU)*3;n=push(n,p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr*.35,globalView?3+hash(i+63)*5:11+hash(i+63)*16,5,.08,ph,0,w,h)}})}
  activeParticles=n;return n
 }
 function compile(gl,type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(s)||'shader compile');return s}
 function initGl(gl){const v2=typeof WebGL2RenderingContext!=='undefined'&&gl instanceof WebGL2RenderingContext,head=v2?'#version 300 es\n':'',vin=v2?'in':'attribute',vout=v2?'out':'varying',fin=v2?'in':'varying',fout=v2?'out vec4 outColor;':'',write=v2?'outColor':'gl_FragColor';const vs=`${head}precision mediump float;${vin} vec2 a_pos;${vin} float a_size;${vin} float a_kind;${vin} float a_alpha;${vin} float a_phase;${vin} float a_aux;uniform float u_dpr;${vout} float v_kind;${vout} float v_alpha;${vout} float v_phase;${vout} float v_aux;void main(){gl_Position=vec4(a_pos,0.,1.);gl_PointSize=max(1.,a_size*u_dpr);v_kind=a_kind;v_alpha=a_alpha;v_phase=a_phase;v_aux=a_aux;}`;const fs=`${head}precision mediump float;${fin} float v_kind;${fin} float v_alpha;${fin} float v_phase;${fin} float v_aux;${fout}void main(){vec2 q=gl_PointCoord-vec2(.5);float a=0.;vec3 c=vec3(1.);if(v_kind<.5){float x=q.x+v_aux*q.y;a=(1.-smoothstep(.035,.11,abs(x)))*(1.-smoothstep(.17,.5,abs(q.y)));c=vec3(.48,.72,.84);}else if(v_kind<1.5){float d=length(q);a=1.-smoothstep(.28,.49,d);c=vec3(.96,.99,1.);}else if(v_kind<2.5){float d=length(q);a=1.-smoothstep(.28,.49,d);c=vec3(.82,.95,1.);}else if(v_kind<3.5){float d=length(vec2(q.x*.82,q.y));a=1.-smoothstep(.18,.5,d);float y=clamp(gl_PointCoord.y,0.,1.);c=mix(vec3(1.,.12,.02),mix(vec3(1.,.48,.03),vec3(1.,.98,.78),y),smoothstep(.12,.88,y));}else if(v_kind<4.5){float d=length(q);a=(1.-smoothstep(.12,.5,d))*.76;c=mix(vec3(.16,.18,.19),vec3(.48,.51,.52),v_phase);}else if(v_kind<5.5){float d=length(vec2(q.x,q.y*.72));a=(1.-smoothstep(.08,.5,d))*.72;c=vec3(.72,.78,.80);}else if(v_kind<6.5){float x=abs(q.x+sin(q.y*10.+v_phase*6.28)*.11);a=(1.-smoothstep(.008,.085,x))*(1.-smoothstep(.38,.5,abs(q.y)));c=vec3(.72,.87,.94);}else if(v_kind<7.5){float d=length(vec2(q.x*.45,q.y));a=1.-smoothstep(.2,.5,d);c=vec3(.08,.07,.065);}else if(v_kind<8.5){float x=abs(q.x+sin(q.y*15.+v_phase*6.28)*.065);float mainBolt=(1.-smoothstep(.012,.075,x))*(1.-smoothstep(.43,.5,abs(q.y)));float bx1=abs(q.x-(.12+(q.y+.10)*.72+sin(q.y*31.+v_phase)*.02));float branch1=(1.-smoothstep(.008,.055,bx1))*step(-.15,q.y)*(1.-step(.16,q.y));float bx2=abs(q.x-(-.10-(q.y-.02)*.62+sin(q.y*27.+v_phase*2.)*.02));float branch2=(1.-smoothstep(.008,.05,bx2))*step(.02,q.y)*(1.-step(.28,q.y));a=max(mainBolt,max(branch1,branch2));c=vec3(.92,.98,1.);}else if(v_kind<9.5){float d=length(q);a=(1.-smoothstep(.04,.5,d))*.52;c=vec3(.78,.88,1.);}else if(v_kind<10.5){float d=length(q);float rr=v_phase*.47;a=(1.-smoothstep(.006,.028,abs(d-rr)))*(1.-v_phase);c=vec3(1.,.29,.63);}else{float d=length(q);a=(1.-smoothstep(.05,.49,d))*.66;c=mix(vec3(1.,.08,.01),vec3(1.,.7,.08),smoothstep(.12,.46,gl_PointCoord.y));}a*=v_alpha;if(a<.008)discard;${write}=vec4(c,a);}`;program=gl.createProgram();gl.attachShader(program,compile(gl,gl.VERTEX_SHADER,vs));gl.attachShader(program,compile(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(program)||'shader link');buffer=gl.createBuffer();attrs={pos:gl.getAttribLocation(program,'a_pos'),size:gl.getAttribLocation(program,'a_size'),kind:gl.getAttribLocation(program,'a_kind'),alpha:gl.getAttribLocation(program,'a_alpha'),phase:gl.getAttribLocation(program,'a_phase'),aux:gl.getAttribLocation(program,'a_aux'),dpr:gl.getUniformLocation(program,'u_dpr')};shaderReady=true}
 const custom={
   id:'bp2300-weather-fx-gpu',type:'custom',renderingMode:'2d',
   onAdd(_m,gl){try{initGl(gl);weatherVao=null;weatherVaoExt=null;weatherVaoMode='none';try{if(typeof gl.createVertexArray==='function'&&typeof gl.bindVertexArray==='function'){weatherVao=gl.createVertexArray();if(weatherVao)weatherVaoMode='native'}else{weatherVaoExt=gl.getExtension?.('OES_vertex_array_object')||null;if(weatherVaoExt){weatherVao=weatherVaoExt.createVertexArrayOES();if(weatherVao)weatherVaoMode='extension'}}}catch(_){weatherVao=null;weatherVaoMode='none'}}catch(e){shaderReady=false;console.warn('V2300 weather GPU',e)}},
   onRemove(_m,gl){try{if(weatherVao&&weatherVaoMode==='native')gl.deleteVertexArray(weatherVao);else if(weatherVao&&weatherVaoMode==='extension')weatherVaoExt?.deleteVertexArrayOES?.(weatherVao);if(buffer)gl.deleteBuffer(buffer);if(program)gl.deleteProgram(program)}catch(_){}weatherVao=null;weatherVaoExt=null;weatherVaoMode='none';shaderReady=false},
   render(gl){
    const diagnostic=window.__BP_WEATHER_FX_DIAGNOSTIC_V6050__||(window.__BP_WEATHER_FX_DIAGNOSTIC_V6050__={renderCalls:0,skippedCalls:0,particleErrors:0,updatedAt:0});
    const animationNeeded=particleAnimationNeeded();
    diagnostic.renderCalls++;diagnostic.enabled=enabled;diagnostic.shaderReady=shaderReady;diagnostic.animationNeeded=animationNeeded;diagnostic.updatedAt=Date.now();
    if(!enabled||!shaderReady||!animationNeeded){diagnostic.skippedCalls++;diagnostic.lastSkip=!enabled?'disabled':!shaderReady?'shader-not-ready':'animation-gate';return}
    let n=0;
    try{n=particles(performance.now());diagnostic.particleCount=n;diagnostic.particlesUpdatedAt=Date.now()}
    catch(e){diagnostic.particleErrors++;diagnostic.lastParticleError=String(e?.stack||e);console.warn('V2300 weather particle update',e);return}
    if(!n){diagnostic.lastZeroParticlesAt=Date.now();return}
    let saved=null;
    try{
     saved=captureWeatherGLState(gl,[attrs.pos,attrs.size,attrs.kind,attrs.alpha,attrs.phase,attrs.aux],weatherVaoExt,!!weatherVao);
     bindWeatherVertexArray(gl,weatherVao,weatherVaoMode,weatherVaoExt);
     gl.useProgram(program);gl.bindBuffer(gl.ARRAY_BUFFER,buffer);
     gl.bufferData(gl.ARRAY_BUFFER,DATA.subarray(0,n*STRIDE),gl.DYNAMIC_DRAW);
     const stride=STRIDE*4;
     for(const [loc,size,off] of [[attrs.pos,2,0],[attrs.size,1,2],[attrs.kind,1,3],[attrs.alpha,1,4],[attrs.phase,1,5],[attrs.aux,1,6]]){
      if(loc<0)continue;gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,size,gl.FLOAT,false,stride,off*4)
     }
     gl.uniform1f(attrs.dpr,Math.max(1,gl.drawingBufferWidth/Math.max(1,map.getCanvas().clientWidth)));
     gl.disable(gl.DEPTH_TEST);gl.depthMask(false);gl.enable(gl.BLEND);
     gl.blendFuncSeparate(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA,gl.ONE,gl.ONE_MINUS_SRC_ALPHA);
     gl.drawArrays(gl.POINTS,0,n);
    }catch(e){console.warn('V2300 weather GPU draw',e)}
    finally{restoreWeatherGLState(gl,saved)}
   }
  };
 function install(){ensureNative()}
 function installParticleLayer(){if(map.getLayer(custom.id))return true;const now=performance.now();if(now<particleLayerRetryAt)return false;try{map.addLayer(custom);return !!map.getLayer(custom.id)}catch(e){particleLayerRetryAt=now+1200;console.warn('V2300 weather custom layer deferred',e);return false}}
 const recoverParticleLayer=()=>{if(enabled&&!map.getLayer(custom.id))installParticleLayer()};
 map.on('styledata',recoverParticleLayer);map.on('load',recoverParticleLayer);map.on('idle',recoverParticleLayer);
 function water(t){if(t-lastWater<850)return;lastWater=t;const hazard=waterPulse;try{if(map.getLayer('gta-water')){map.setPaintProperty('gta-water','fill-color',hazard?'#0b3a53':'#082d44');map.setPaintProperty('gta-water','fill-opacity',hazard?.955+.025*Math.sin(t*.003):.98)}}catch(_){}}
 function renderSurfaceActive(){try{const c=map.getContainer?.(),s=c?.closest?.('[data-surface]');return !s||(s.hidden!==true&&s.classList.contains('active'))}catch{return true}}
 function particleAnimationNeeded(force=false){const now=performance.now();if(!force&&now-animationCheckAt<240)return animationCheckCached;animationCheckAt=now;if(!enabled||document.hidden||!renderSurfaceActive()){animationCheckCached=false;return false}const z=map.getZoom(),sampleLimit=LOW?100:MOBILE?180:300;let active=(scene.observations||[]).slice(0,sampleLimit).some(o=>{const kind=precip(o);if(kind==='none'||kind==='rain')return false;const c=eventCenter(o);return !!(c&&project(c))});
  if(!active&&z>=1){for(const a of (scene.alerts||[]).filter(tornado).slice(0,LOW?1:MOBILE?2:4)){const c=eventCenter(a);if(c&&project(c)){active=true;break}}}
  if(!active&&z>=1){for(const e of (scene.earthquakes||[]).slice(0,LOW?3:MOBILE?5:10)){const raw=e.time||e.observed_at||e.origin_time||e.timestamp||generatedAt||'',stamp=Date.parse(raw),age=Date.now()-stamp,c=eventCenter(e);if(c&&Number.isFinite(stamp)&&age>=0&&age<=90000&&project(c)){active=true;break}}}
  if(!active){for(const v of (scene.volcanoes||[]).filter(activeEruption).slice(0,LOW?1:MOBILE?2:4)){const c=eventCenter(v);if(c&&project(c)){active=true;break}}}
  if(!active){for(const g of (scene.geysers||[]).filter(x=>x?.active!==false&&x?.is_active!==false).slice(0,LOW?1:MOBILE?2:4)){const c=eventCenter(g);if(c&&project(c)){active=true;break}}}
  if(!active&&z>=1){for(const o of (scene.observations||[])){const visibility=Number(o.visibility_mi??o.visibility_miles),raw=text([o.weather,o.present_weather,o.weather_text,o.rawdata].filter(Boolean).join(' ')),c=eventCenter(o);if(c&&project(c)&&((Number.isFinite(visibility)&&visibility>0&&visibility<1)||/\bfz\b|\bfg\b|fog|mist/.test(raw))){active=true;break}}}
  if(!active&&z>=1){const limit=LOW?3:MOBILE?6:10;for(const f of scene.fires.slice(0,limit*3)){const c=center(f.geometry);if(c&&project(c)){active=true;break}}}if(!active){const limit=LOW?2:MOBILE?3:5;for(const s of scene.storms.slice(0,limit*4)){const c={lng:+s.lng,lat:+s.lat};if(Number.isFinite(c.lng)&&Number.isFinite(c.lat)&&project(c)){active=true;break}}}if(!active){const limit=LOW?6:18,nowMs=Date.now();for(let i=0;i<Math.min(scene.lightning.length,limit);i++){const s=scene.lightning[i],at=Date.parse(s.time||s.observed_at||s.timestamp||generatedAt||'');if(Number.isFinite(at)&&nowMs-at>=0&&nowMs-at<5000){const c={lng:+(s.lng??s.longitude),lat:+(s.lat??s.latitude)};if(Number.isFinite(c.lng)&&Number.isFinite(c.lat)&&project(c)){active=true;break}}}}animationCheckCached=active;return active}
 function schedule(){clearTimeout(timer);timer=0;if(!enabled){publishSchedulerState('disabled');return}if(document.hidden){publishSchedulerState('hidden');return}if(!renderSurfaceActive()){publishSchedulerState('offscreen');return}const animated=particleAnimationNeeded();if(!map.getLayer(custom.id))installParticleLayer();if(!animated&&!waterPulse){publishSchedulerState('idle');return}publishSchedulerState(animated?'animated':'water-hazard');if(animated&&!monitorRaf)monitorRaf=requestAnimationFrame(monitor);const delay=animated?(moving?(MOBILE?140:100):(LOW?66:MOBILE?66:TIER==='HIGH'?35:45)):850;timer=setTimeout(()=>{timer=0;if(!enabled||document.hidden||!renderSurfaceActive())return;if(particleAnimationNeeded(true))map.triggerRepaint();if(waterPulse)water(performance.now());schedule()},delay)}
 function monitor(t){monitorRaf=0;if(!renderSurfaceActive()||document.hidden||!particleAnimationNeeded()){lastFrame=0;return}if(lastFrame){const f=1000/Math.max(5,t-lastFrame);fps=fps*.92+Math.min(60,f)*.08;if(fps<(MOBILE?40:48)){bad++;good=0}else if(fps>54){good++;bad=Math.max(0,bad-2)}else{bad=Math.max(0,bad-1);good=Math.max(0,good-1)}if(bad>65){quality=clamp(quality*.8,.28,1);bad=0}else if(good>300&&quality<1){quality=clamp(quality+.06,.28,1);good=0}}lastFrame=t;monitorRaf=requestAnimationFrame(monitor)}
 function setScene(x={},meta={}){scene={...EMPTY_SCENE,...x};generatedAt=meta.generated_at||x.generated_at||generatedAt||new Date().toISOString();nearestObsCacheValid=false;animationCheckAt=0;waterPulse=scene.alerts.some(flood)||scene.storms.length>0;native();if(CLOUDS_ONLY_PHASE())setEnabled(false);water(performance.now());schedule();return api.state}
 function setEnabled(v){enabled=CLOUDS_ONLY_PHASE()?false:!!v;for(const id of ['bp2300-fx-flood-fill','bp2300-fx-flood-line','bp2300-fx-ice-fill','bp2300-fx-ice-line','bp2300-fx-burn','bp2300-fx-containment','bp2300-fx-tornado','bp2300-fx-hurricane','bp2300-fx-flood-depth-volume','bp2300-fx-snow-depth-volume','bp2300-fx-wet-ground','bp2300-fx-lava-glow','bp2300-fx-lava-flow'])try{map.setLayoutProperty(id,'visibility',enabled?'visible':'none')}catch(_){}animationCheckAt=0;if(enabled)schedule();else{clearTimeout(timer);timer=0;if(monitorRaf)cancelAnimationFrame(monitorRaf);monitorRaf=0;activeParticles=0;animationCheckCached=false;publishSchedulerState('disabled')}}
 map.on('movestart',()=>{moving=true});map.on('moveend',()=>{moving=false;nearestObsCacheValid=false;animationCheckAt=0;if(MOBILE){clearTimeout(timer);timer=setTimeout(schedule,450)}else schedule()});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearTimeout(timer);timer=0;if(monitorRaf)cancelAnimationFrame(monitorRaf);monitorRaf=0}else{nearestObsCacheValid=false;animationCheckAt=0;schedule()}});install();schedule();
 function localConditions(lng,lat){
  const pt={lng:Number(lng),lat:Number(lat)};if(!Number.isFinite(pt.lng)||!Number.isFinite(pt.lat))return null;
  let obs=null,d0=Infinity;for(const o of scene.observations||[]){if(!Number.isFinite(+o.lng)||!Number.isFinite(+o.lat))continue;const d=distance2(pt,{lng:+o.lng,lat:+o.lat});if(d<d0){d0=d;obs=o}}
  const wx=precip(obs),raw=text([obs?.weather,obs?.present_weather,obs?.weather_text,obs?.wx,obs?.condition,obs?.conditions,obs?.rawdata].filter(Boolean).join(' ')),visibility=Number(obs?.visibility_mi??10),fog=visibility<1||/\bfg\b|fog|mist/.test(raw),storm=/\bts\b|thunder|storm|squall/.test(raw);
  const fires=(scene.fires||[]).filter(f=>pointInGeom(pt,f.geometry||f)).slice(0,8),alerts=(scene.alerts||[]).filter(a=>pointInGeom(pt,a.geometry||a)).slice(0,12);
  const wildfire=fires.length>0,fire=wildfire?fires[0]:null,smoke=wildfire||alerts.some(a=>/smoke|air quality|wildfire/.test(alertText(a)));
  const hail=wx==='hail'||alerts.some(a=>/hail/.test(alertText(a))),snow=wx==='snow'||alerts.some(a=>/snow|blizzard/.test(alertText(a))),rain=wx==='rain'||alerts.some(a=>/rain|thunderstorm|shower/.test(alertText(a)));
  const lightning=(scene.lightning||[]).some(s=>{const slng=+(s.lng??s.longitude),slat=+(s.lat??s.latitude);return Number.isFinite(slng)&&Number.isFinite(slat)&&distance2(pt,{lng:slng,lat:slat})<.015});
  const w=wind(obs);
  return{lng:pt.lng,lat:pt.lat,precip:hail?'hail':snow?'snow':rain?'rain':'none',rain,snow,hail,fog,storm,lightning,wildfire,smoke,fire:{name:fire?.name||'',acres:+fire?.acres||0,contained_pct:+fire?.contained_pct||0},wind_mph:w.mph,wind_x:w.x,temperature_f:Number(obs?.temperature_f),visibility_mi:Number.isFinite(visibility)?visibility:null,observation:obs||null,alerts:alerts.map(a=>({event:a?.properties?.event||a?.properties?.phenom||'',headline:a?.properties?.headline||''})),generatedAt}
 }
 const api={version:VERSION,map,setScene,setEnabled,refreshNative:native,localConditions,get scene(){return scene},get state(){return{enabled,moving,tier:TIER,mobile:MOBILE,low:LOW,qualityScale:+quality.toFixed(2),fps:+fps.toFixed(1),shaderReady,activeParticles,secondaryCanvases:0,sharedMapLibreWebGLContext:true,budgets:{...BUDGET,maxPoints:MAX_POINTS},capabilities:{atmosphereFogClouds:true,rainSnowHail:true,precipitationParticlesSmall:true,precipitationWeatherCellAnchored:true,noaaSnowDepthAnalysis:true,snowDepthVolumeSourceGated:true,radarEchoHaze:true,radarCrispTopLayer:true,tornadoCone:true,rotatingTornadoVortex:true,hurricaneSpiralEye:true,hemisphereAwareStormRotation:true,lightning:true,lightningCloudFlash:true,forkedLightningBolts:true,earthquakeLayer:true,seismicRippleRings:true,floodIce:true,floodDepthVolumeSourceGated:true,wildfireFlameParticles:true,firePerimeterAnchored:true,smoke:true,ash:true,authoritativeBurnScarOnly:true,thermalContainment:true,dynamicWater:true,wetGroundAccumulationSourceGated:true,volcanicLavaFlowSourceGated:true,geyserJetsSourceGated:true,localizedFogSourceGated:true,adaptiveLOD:true,viewportCulling:true},generatedAt}}};window.__bpWeatherFXV2300=api;return api
}

export function initWeather(map,opts={}){retireLegacyScreenSpaceRain();
 if(window.__bpWeatherV2300&&window.__bpWeatherV2300.map===map)return window.__bpWeatherV2300;baseLayers(map);hideLegacyNativeWeatherLayers(map);const fx=createFx(map);let active=opts?.deferActivation!==true,radar=false,last=0,seq=0,timer=0,radarMotionTimer=0,radarPhase=0,scene={...EMPTY_SCENE},publicCycloneCacheAt=0,publicCycloneCache=[],publicCycloneSnapshot=null;const rain=initRainLayer(map,()=>scene);const lightning=initLightningLayer(map,()=>scene);if(!active){fx.setEnabled(false);rain.setEnabled(false);lightning?.setEnabled?.(false);}if(CLOUDS_ONLY_PHASE()){fx.setEnabled(false);hideCloudPhaseVisuals(map)}
 function nearest(a){if(!a.length)return null;const c=map.getCenter();let b=null,d0=Infinity;for(const o of a){if(!Number.isFinite(+o.lng)||!Number.isFinite(+o.lat))continue;const d=(+o.lng-c.lng)**2+(+o.lat-c.lat)**2;if(d<d0){d0=d;b=o}}return b}
 function atmosphere(a){const o=nearest(a);if(!o||CLOUDS_ONLY_PHASE())return;const visibility=clamp(Number(o.visibility_mi??10),.05,50),cond=text([o.weather,o.rawdata].filter(Boolean).join(' ')),storm=/\bts\b|thunder|storm|squall|tornado|hurricane/.test(cond),fog=visibility<1;try{map.setSky({'sky-color':storm?'#26313b':fog?'#68777c':'#102d3e','horizon-color':storm?'#53606a':fog?'#849196':'#31515e','fog-color':storm?'#69747d':fog?'#9aa4a6':'#718a92','sky-horizon-blend':fog?.035:.18,'horizon-fog-blend':fog?.25:.04,'fog-ground-blend':fog?.08:0,'atmosphere-blend':['interpolate',['linear'],['zoom'],0,.5,6,.22,10,fog?.08:0]});map.setLight({anchor:'map',color:storm?'#9faab2':fog?'#c4cccd':'#e5f7ff',intensity:storm?.27:fog?.34:.48,position:[1.2,205,38]})}catch(_){}}
 
const STORM_TRACK_SOURCE_ID='bp2300-storm-track-source-v6093';let stormTrackFeatureCount=0;
function stormTrackLine(g){if(typeof g==='string'){try{g=JSON.parse(g)}catch(_){return null}}if(g?.type==='Feature')g=g.geometry;return g?.type==='LineString'&&Array.isArray(g.coordinates)&&g.coordinates.length>=2?g:null}
function stormTrackFeatures(storms=[]){
 const out=[],push=(g,kind,name,source,official=false)=>{if(g)out.push({type:'Feature',geometry:g,properties:{kind,name,source,official_forecast:official}})};
 for(const row of Array.isArray(storms)?storms:[]){
  const p=row?.properties||row||{},name=String(p.name||p.event||'Cyclone track'),src=String(p.source||p.provenance||'Source-backed cyclone track');
  let history=stormTrackLine(row?.track_geometry??p.track_geometry??row?.historical_track_geometry??p.historical_track_geometry);
  const raw=stormTrackLine(row?.geometry??p.geometry??row?.geometry_geojson??p.geometry_geojson),forecast=stormTrackLine(row?.forecast_geometry??p.forecast_geometry??row?.forecast_track_geometry??p.forecast_track_geometry);
  if(!history&&raw&&!forecast)history=raw;push(history,'history',name,src);
  if(forecast)push(forecast,'forecast',name,src,p.is_official_forecast===true||p.official_forecast===true);
  else{const lng=Number(row?.lng??p.lng??row?.longitude??p.longitude),lat=Number(row?.lat??p.lat??row?.latitude??p.latitude),head=Number(p.movement_heading_deg??p.movement_dir??p.movementDirectionDeg??p.heading_deg);
   const sp=Number.isFinite(Number(p.movement_speed_mps))?Number(p.movement_speed_mps):Number.isFinite(Number(p.movement_speed_kt))?Number(p.movement_speed_kt)*0.514444:Number.isFinite(Number(p.movement_speed_mph))?Number(p.movement_speed_mph)*0.44704:NaN;
   if([lng,lat,head,sp].every(Number.isFinite)&&sp>0&&sp<100&&Math.abs(lat)<=85){const d=sp*43200,b=head*Math.PI/180,mid=lat+Math.cos(b)*d/111320/2,endLat=clamp(lat+Math.cos(b)*d/111320,-85,85),endLng=((((lng+Math.sin(b)*d/(111320*Math.max(.12,Math.cos(mid*RAD)))+540)%360)+360)%360)-180;push({type:'LineString',coordinates:[[lng,lat],[endLng,endLat]]},'projected',name,src)}
  }
 }return out;
}
function ensureStormTrackLayers(storms=[]){
 try{if(!map.getSource(STORM_TRACK_SOURCE_ID))map.addSource(STORM_TRACK_SOURCE_ID,{type:'geojson',data:EMPTY})}catch(_){}
 add(map,{id:'bp2300-storm-track-history-outline-v6093',type:'line',source:STORM_TRACK_SOURCE_ID,filter:['==',['get','kind'],'history'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#041321','line-width':['interpolate',['linear'],['zoom'],0,3,3,4,8,5.2],'line-opacity':.96}});
 add(map,{id:'bp2300-storm-track-history-v6093',type:'line',source:STORM_TRACK_SOURCE_ID,filter:['==',['get','kind'],'history'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#5fe8ff','line-width':['interpolate',['linear'],['zoom'],0,1.2,3,1.8,8,2.4],'line-opacity':.98}});
 add(map,{id:'bp2300-storm-track-forecast-outline-v6093',type:'line',source:STORM_TRACK_SOURCE_ID,filter:['==',['get','kind'],'forecast'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#1e1b14','line-width':['interpolate',['linear'],['zoom'],0,3.2,3,4.2,8,5.4],'line-opacity':.96,'line-dasharray':[2.6,1.5]}});
 add(map,{id:'bp2300-storm-track-forecast-v6093',type:'line',source:STORM_TRACK_SOURCE_ID,filter:['==',['get','kind'],'forecast'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#ffd56a','line-width':['interpolate',['linear'],['zoom'],0,1.45,3,2,8,2.7],'line-opacity':.99,'line-dasharray':[2.6,1.5]}});
 add(map,{id:'bp2300-storm-track-projection-outline-v6093',type:'line',source:STORM_TRACK_SOURCE_ID,filter:['==',['get','kind'],'projected'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#171327','line-width':['interpolate',['linear'],['zoom'],0,2.8,3,3.7,8,4.7],'line-opacity':.9,'line-dasharray':[1.3,1.4]}});
 add(map,{id:'bp2300-storm-track-projection-v6093',type:'line',source:STORM_TRACK_SOURCE_ID,filter:['==',['get','kind'],'projected'],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#c3a7ff','line-width':['interpolate',['linear'],['zoom'],0,1.1,3,1.6,8,2.1],'line-opacity':.95,'line-dasharray':[1.3,1.4]}});
 const f=stormTrackFeatures(storms);stormTrackFeatureCount=f.length;setSource(map,STORM_TRACK_SOURCE_ID,fc(f));return stormTrackFeatureCount;
}

function layers(){ensureStormTrackLayers(scene.storms);setSource(map,'wx-alerts',fc(scene.alerts.map(x=>geom(x.geometry,{...(x.properties||{}),source:x.properties?.source||'NOAA/NWS'}))));setSource(map,'wx-fires',fc(scene.fires.map(x=>geom(x.geometry,{id:x.id,name:x.name,acres:x.acres,contained_pct:x.contained_pct,source:x.source}))));setSource(map,'wx-quakes',fc(scene.earthquakes.map(x=>point(x.lng,x.lat,x))));setSource(map,'wx-storms',fc(scene.storms.map(x=>point(x.lng,x.lat,x))));setSource(map,'wx-thermal',fc(scene.thermal.map(x=>point(x.lng,x.lat,x))));setSource(map,'wx-obs',fc(scene.observations.map(x=>point(x.lng,x.lat,x))));setSource(map,'wx-water',fc(scene.water_levels.map(x=>point(x.lng,x.lat,x))))}
 
const JOSEPHINE_NHC_FINAL_ADVISORY=Object.freeze({issuedAt:'2026-10-22T21:00:00Z',dissipatesAt:'2026-10-25T18:00:00Z',lastObserved:{lng:-66.8,lat:39.5},positions:[
{at:'2026-10-22T21:00:00Z',lng:-65.8,lat:40.0,wind_mph:65},{at:'2026-10-23T06:00:00Z',lng:-62.7,lat:41.3,wind_mph:75},{at:'2026-10-23T18:00:00Z',lng:-58.6,lat:42.9,wind_mph:70},{at:'2026-10-24T06:00:00Z',lng:-55.9,lat:43.5,wind_mph:65},{at:'2026-10-24T18:00:00Z',lng:-52.6,lat:43.8,wind_mph:60},{at:'2026-10-25T06:00:00Z',lng:-48.0,lat:43.6,wind_mph:50}]});
function archivedJosephineForecast(now=Date.now()){
 const a=JOSEPHINE_NHC_FINAL_ADVISORY,issued=Date.parse(a.issuedAt),stops=Date.parse(a.dissipatesAt);
 if(window.__BP_TEST_DISABLE_ARCHIVED_JOSEPHINE_FALLBACK__===true||!Number.isFinite(now)||now<issued||now>=stops)return null;
 const fixes=a.positions.map(p=>({...p,ms:Date.parse(p.at)}));let i=0;while(i<fixes.length-2&&now>fixes[i+1].ms)i++;
 const p=fixes[i],q=fixes[i+1],span=Math.max(1,q.ms-p.ms),t=(now-p.ms)/span,lng=p.lng+(q.lng-p.lng)*t,lat=p.lat+(q.lat-p.lat)*t,wind=clamp(p.wind_mph+(q.wind_mph-p.wind_mph)*t,0,180);
 const east=(q.lng-p.lng)*111320*Math.cos((p.lat+q.lat)*0.5*RAD),north=(q.lat-p.lat)*111320,speed=Math.hypot(east,north)/(span/1000),heading=(Math.atan2(east,north)*180/Math.PI+360)%360;
 const future=fixes.filter(x=>x.ms>now).map(x=>[x.lng,x.lat]);if(now>=fixes[fixes.length-1].ms){const z=fixes[fixes.length-1],y=fixes[fixes.length-2],u=(stops-z.ms)/Math.max(1,z.ms-y.ms);future.push([z.lng+(z.lng-y.lng)*u,z.lat+(z.lat-y.lat)*u])}
 const history={type:'LineString',coordinates:[[a.lastObserved.lng,a.lastObserved.lat],[-65.8,40.0]]},path=[[lng,lat],...future].filter((x,j,all)=>!j||Math.hypot(x[0]-all[j-1][0],x[1]-all[j-1][1])>0.001);if(path.length<2)return null;
 const forecast={type:'LineString',coordinates:path};
 return {id:'nhc-final-forecast:al102026:josephine',name:'Post-Tropical Cyclone Josephine',event:'Post-Tropical Cyclone Josephine',type:'POST_TROPICAL_CYCLONE',classification:'PTC',official_classification:'post-tropical cyclone',lng,lat,longitude:lng,latitude:lat,wind_mph:wind,wind_kt:wind/1.15078,cloud_shield_radius_mi:415,cloud_shield_radius_km:668,wind_radius_mi:415,movement_heading_deg:heading,movement_dir:heading,movement_speed_mps:speed,movement_speed_mph:speed*2.236936,movement_speed_kt:speed/0.514444,geometry:forecast,track_geometry:history,forecast_geometry:forecast,source:'NOAA/NHC',source_detail:'National Hurricane Center final advisory #5; official forecast interpolation',source_issued_at:a.issuedAt,observed_at:a.issuedAt,forecast_valid_at:new Date(now).toISOString(),is_official_forecast:true,is_post_tropical:true,center_source:'official forecast interpolation, not a live observation',forecast_tail_estimated:now>=fixes[fixes.length-1].ms,ends_at:a.dissipatesAt};
}
function ensureJosephineForecast(storms=[],now=Date.now()){
 const out=Array.isArray(storms)?storms.slice():[],j=archivedJosephineForecast(now);
 if(!j){const retired=out.findIndex(x=>String((x?.properties||x)?.id||'')==='nhc-final-forecast:al102026:josephine');if(retired>=0)out.splice(retired,1);return out;}
 const i=out.findIndex(x=>/josephine/i.test(String((x?.properties||x)?.name||(x?.properties||x)?.event||(x?.properties||x)?.id||'')));
 if(i<0){out.push(j);return out}const p=out[i]?.properties||out[i]||{},at=Date.parse(p.observed_at||p.updated_at||p.timestamp||'');
 if(p.is_official_forecast===true||!Number.isFinite(at)||at<=Date.parse(j.source_issued_at))out[i]=j;return out;
}

function currentBootstrapCyclones(payload){
  const now=Date.now(),items=Array.isArray(payload?.items)?payload.items:[];
  return items.filter(item=>{
    const type=String(item?.type||'').trim().toUpperCase(),g=item?.geometry;
    if(!['HURRICANE','TYPHOON','TROPICAL_CYCLONE','SUBTROPICAL_STORM','POST_TROPICAL_CYCLONE','POSTTROPICAL_CYCLONE','EXTRATROPICAL_CYCLONE'].includes(type)||g?.type!=='LineString'||!Array.isArray(g.coordinates)||g.coordinates.length<2)return false;
    const label=String([item?.name,item?.event,item?.source].filter(Boolean).join(' ')).toLowerCase();
    if(!/hurricane|typhoon|tropical cyclone|tropical storm|tropical depression|cyclone/.test(label))return false;
    if(/warning|watch|forecast cone|hurricane.force gust/.test(label))return false;
    const observed=Date.parse(item?.observed_at||'');
    if(!Number.isFinite(observed)||observed>now+5*60*1000||now-observed>18*60*60*1000)return false;
    const lastPoint=g.coordinates[g.coordinates.length-1];
    const lng=Number(item?.lon??item?.longitude??lastPoint?.[0]),lat=Number(item?.lat??item?.latitude??lastPoint?.[1]);
    return Number.isFinite(lng)&&Number.isFinite(lat)&&Math.abs(lng)<=180&&Math.abs(lat)<=85;
  }).map(item=>{
    const line=item.geometry.coordinates,lastPoint=line[line.length-1];
    const lng=Number(item?.lon??item?.longitude??lastPoint[0]),lat=Number(item?.lat??item?.latitude??lastPoint[1]);
    const sourceType=String(item?.type||'').trim().toUpperCase(),name=String(item.name||'Tropical Cyclone'),label=String([sourceType,item.event,item.source,name].filter(Boolean).join(' ')),postTropical=/post[\s-]?tropical|extra[\s-]?tropical/i.test(label);
    return {...item,id:'public-track:'+String(item.source||'source')+':'+name.toLowerCase(),name,
      type:postTropical?'POST_TROPICAL_CYCLONE':'HURRICANE',classification:postTropical?'PTC':/typhoon/i.test(label)?'TY':/hurricane/i.test(label)?'HU':/subtropical/i.test(label)?'STS':'TC',
      lng,lat,longitude:lng,latitude:lat,source:item.source||'public source-backed cyclone track',
      track_geometry:item.geometry,center_source:'latest point from source track',observed_at:item.observed_at};
  });
 }
 function currentBootstrapTornadoPoints(payload){
  const now=Date.now(),items=Array.isArray(payload?.items)?payload.items:[];
  return items.filter(item=>{
    const type=String(item?.type||'').trim().toUpperCase(),g=item?.geometry;
    if(!['TORNADO','WATERSPOUT'].includes(type)||g?.type!=='Point'||!Array.isArray(g.coordinates)||g.coordinates.length<2)return false;
    if(item?.observed!==true)return false;
    const label=String([item?.name,item?.event].filter(Boolean).join(' ')).toLowerCase();
    if(!/tornado|waterspout/.test(label)||/warning|watch|forecast/.test(label))return false;
    const observed=Date.parse(item?.observed_at||'');
    if(!Number.isFinite(observed)||observed>now+5*60*1000||now-observed>90*60*1000)return false;
    const lng=Number(item?.lon??item?.longitude??g.coordinates[0]),lat=Number(item?.lat??item?.latitude??g.coordinates[1]);
    return Number.isFinite(lng)&&Number.isFinite(lat)&&Math.abs(lng)<=180&&Math.abs(lat)<=85;
  }).map(item=>{
    const p=item.geometry.coordinates,lng=Number(item?.lon??item?.longitude??p[0]),lat=Number(item?.lat??item?.latitude??p[1]);
    return {...item,id:'public-point:'+String(item.source||'source')+':'+String(item.name||'observed tornado').toLowerCase(),
      name:String(item.name||'Observed Tornado'),type:'Tornado',classification:'TO',event:'Observed Tornado',
      lng,lat,longitude:lng,latitude:lat,source:item.source||'official observed tornado point',
      center_source:'source-published observed point',observed_at:item.observed_at};
  });
 }
 function mergeReportedTornadoPoints(primary=[],tornadoes=[]){
  const out=Array.isArray(primary)?primary.slice():[];
  for(const row of tornadoes||[]){
   const lng=Number(row.lng??row.longitude),lat=Number(row.lat??row.latitude);
   const duplicate=out.some(x=>{
    const p=x?.properties||x,label=String([p.name,p.type,p.event,p.classification].filter(Boolean).join(' ')).toLowerCase();
    if(!/tornado|waterspout/.test(label))return false;
    const xLng=Number(x.lng??x.longitude??p.lng??p.longitude),xLat=Number(x.lat??x.latitude??p.lat??p.latitude);
    return Number.isFinite(xLng)&&Number.isFinite(xLat)&&Math.hypot((lng-xLng)*Math.cos(lat*Math.PI/180),lat-xLat)<0.05;
   });
   if(!duplicate)out.push(row);
  }
  return out;
 }
 async function getPublicCyclones(force=false){
  if(!force&&publicCycloneSnapshot&&Date.now()-publicCycloneCacheAt<240000){publicCycloneSnapshot={...publicCycloneSnapshot,storms:ensureJosephineForecast(publicCycloneSnapshot.storms)};return publicCycloneSnapshot;}
  try{
   const d=await publicRpc('bridgepoint_public_weather_bootstrap_v5823',{},9000);
   const storms=currentBootstrapCyclones(d),tornadoes=currentBootstrapTornadoPoints(d);
   publicCycloneSnapshot={storms:ensureJosephineForecast(storms),tornadoes,generated_at:d?.generated_at||null,source_counts:d?.counts||{},fresh:d?.fresh===true};
   publicCycloneCacheAt=Date.now();return publicCycloneSnapshot;
  }catch(error){
   if(publicCycloneSnapshot&&Date.now()-publicCycloneCacheAt<900000){publicCycloneSnapshot={...publicCycloneSnapshot,storms:ensureJosephineForecast(publicCycloneSnapshot.storms)};return publicCycloneSnapshot;}
   publicCycloneCacheAt=Date.now();return {storms:ensureJosephineForecast([]),tornadoes:[],generated_at:null,source_counts:{},fresh:false,error:String(error?.message||error).slice(0,120)};
  }
 }
 function canonicalCycloneName(row){const p=row?.properties||row||{};return String(p.name||p.event||p.id||'').toLowerCase().replace(/\b(post[\s-]?tropical|extra[\s-]?tropical|tropical|cyclone|storm|hurricane|typhoon|depression|subtropical)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim()}
function mergeCycloneCenters(primary=[],supplemental=[]){
 const out=Array.isArray(primary)?primary.slice():[];
 for(const row of supplemental||[]){const p=row?.properties||row||{},name=canonicalCycloneName(row),same=name?out.findIndex(x=>canonicalCycloneName(x)===name):-1;
  if(same>=0){if(p.is_official_forecast===true||p.official_forecast===true){const old=out[same]?.properties||out[same]||{},at=Date.parse(old.observed_at||old.updated_at||old.timestamp||''),issued=Date.parse(p.source_issued_at||'');if(old.is_official_forecast===true||!Number.isFinite(at)||!Number.isFinite(issued)||at<=issued)out[same]=row}continue}
  const lng=Number(row?.lng??row?.longitude??p.lng??p.longitude),lat=Number(row?.lat??row?.latitude??p.lat??p.latitude);
  const near=out.some(x=>{const q=x?.properties||x,xLng=Number(x?.lng??x?.longitude??q.lng??q.longitude),xLat=Number(x?.lat??x?.latitude??q.lat??q.latitude);return Number.isFinite(lng)&&Number.isFinite(lat)&&Number.isFinite(xLng)&&Number.isFinite(xLat)&&Math.hypot((lng-xLng)*Math.cos(lat*Math.PI/180),lat-xLat)<.7});
  if(!near)out.push(row);
 }return out;
}
 async function refresh(force=false){
  if(!active)return;const now=Date.now();if(!force&&now-last<45000)return;last=now;const id=++seq,b=bbox(map,.12);
  const [edgeResult,publicCyclones]=await Promise.all([
   edge('bridgepoint-world-effects-v2190',{west:b.west,south:b.south,east:b.east,north:b.north,zoom:map.getZoom(),modes:['all']},14500)
    .then(value=>({value,error:null}),error=>({value:null,error})),
   getPublicCyclones(force)
  ]);
  let d=edgeResult.value;const edgeError=edgeResult.error;if(id!==seq)return;
  if(!d&&publicCyclones.storms.length===0){console.warn('V2300 weather: storm feeds unavailable',String(edgeError?.message||edgeError||publicCyclones.error||'no public cyclone centers'));return}
  d=d||{};
  const edgeStorms=Array.isArray(d.storms)?d.storms:[];
  const mergedCyclones=mergeCycloneCenters(edgeStorms,publicCyclones.storms);
  const mergedStorms=mergeReportedTornadoPoints(mergedCyclones,publicCyclones.tornadoes);
  const eventTime=d.generated_at||publicCyclones.generated_at||new Date().toISOString();
  scene={alerts:Array.isArray(d.alerts)?d.alerts:[],fires:Array.isArray(d.fires)?d.fires:[],earthquakes:Array.isArray(d.earthquakes)?d.earthquakes:[],storms:mergedStorms,thermal:Array.isArray(d.thermal)?d.thermal:[],observations:Array.isArray(d.observations)?d.observations:[],lightning:Array.isArray(d.lightning)?d.lightning:Array.isArray(d.lightning_activity)?d.lightning_activity:Array.isArray(d.strikes)?d.strikes:[],burn_scars:Array.isArray(d.burn_scars)?d.burn_scars:Array.isArray(d.burnScars)?d.burnScars:[],water_levels:Array.isArray(d.water_levels)?d.water_levels:[],volcanoes:Array.isArray(d.volcanoes)?d.volcanoes:Array.isArray(d.active_volcanoes)?d.active_volcanoes:[],geysers:Array.isArray(d.geysers)?d.geysers:[],flood_depths:Array.isArray(d.flood_depths)?d.flood_depths:Array.isArray(d.inundation_depths)?d.inundation_depths:[],snow_depths:Array.isArray(d.snow_depths)?d.snow_depths:Array.isArray(d.snow_depth_polygons)?d.snow_depth_polygons:[],precipitation_accumulation:Array.isArray(d.precipitation_accumulation)?d.precipitation_accumulation:Array.isArray(d.precipitation_accumulations)?d.precipitation_accumulations:[],fog_fields:Array.isArray(d.fog_fields)?d.fog_fields:[],generated_at:eventTime,sources:[...(Array.isArray(d.sources)?d.sources:[]),...(publicCyclones.storms.length?['public weather bootstrap cyclone centers']:[])]};
  layers();if(CLOUDS_ONLY_PHASE())hideCloudPhaseVisuals(map);atmosphere(scene.observations);fx.setScene(scene,{generated_at:eventTime});rain.setScene(scene);lightning?.setScene?.(scene);if(CLOUDS_ONLY_PHASE())hideCloudPhaseVisuals(map);
  window.__BP_PUBLIC_CYCLONE_CENTER_FALLBACK__={version:6093,edgeAvailable:!edgeError,edgeError:edgeError?String(edgeError.message||edgeError).slice(0,100):null,publicFresh:publicCyclones.fresh,publicStormCount:publicCyclones.storms.length,publicTornadoPointCount:(publicCyclones.tornadoes||[]).length,mergedStormCount:mergedStorms.length,stormNames:mergedStorms.map(x=>x.name).slice(0,8),stormTrackFeatureCount,trackLayerPresent:!!map.getLayer('bp2300-storm-track-forecast-v6093'),josephine:(()=>{const j=mergedStorms.find(x=>/josephine/i.test(String(x.name||x.event||'')));return j?{name:j.name||j.event,lng:j.lng??j.longitude,lat:j.lat??j.latitude,officialForecast:j.is_official_forecast===true,centerSource:j.center_source||null,forecastValidAt:j.forecast_valid_at||null,sourceIssuedAt:j.source_issued_at||null,classification:j.official_classification||j.classification||null,source:j.source||null}:null})(),updatedAt:Date.now()};
  window.dispatchEvent(new CustomEvent('bp2300:weather-updated',{detail:{generated_at:eventTime,sources:scene.sources,counts:{alerts:scene.alerts.length,fires:scene.fires.length,quakes:scene.earthquakes.length,storms:scene.storms.length,thermal:scene.thermal.length,observations:scene.observations.length,lightning:scene.lightning.length,burnScars:scene.burn_scars.length},fx:fx.state}}));
 }
 function keepWeatherReferenceLinesOnTop(){for(const id of ['wx-alert-line','wx-fire-line','wx-quake','wx-storm','wx-obs','wx-water','gta-coast-shadow','gta-coast-edge','gta-country','gta-state','bp-v5004-weather-shape-fill','bp-v5004-weather-shape-line','bp-v5004-weather-point-glow','bp-v5004-weather-points','bp-landing-weather-line','bp-landing-weather-points','bp2300-storm-track-history-outline-v6093','bp2300-storm-track-history-v6093','bp2300-storm-track-forecast-outline-v6093','bp2300-storm-track-forecast-v6093','bp2300-storm-track-projection-outline-v6093','bp2300-storm-track-projection-v6093'])try{if(map.getLayer(id))map.moveLayer(id)}catch(_){}}
 function stopRadarMotion(){if(radarMotionTimer){clearInterval(radarMotionTimer);radarMotionTimer=0}}
 function startRadarMotion(){stopRadarMotion();if(!radar||document.hidden)return;try{if(map.getLayer('wx-radar')){map.setPaintProperty('wx-radar','raster-opacity',LOW?.54:.70);map.setPaintProperty('wx-radar','raster-brightness-max',1)}if(map.getLayer('wx-radar-haze'))map.setPaintProperty('wx-radar-haze','raster-opacity',LOW?.14:.18);keepWeatherReferenceLinesOnTop();window.__BP_RADAR_RENDER_V5822__={version:5822,stableGroundDrape:true,below3D:true,sourceMaxZoom:14,animatedPaint:false,maxDisplayZoom:24,updatedAt:Date.now()}}catch(_){}}
 function setRadar(v){radar=CLOUDS_ONLY_PHASE()?false:!!v;for(const id of ['wx-radar-haze','wx-radar'])try{map.setLayoutProperty(id,'visibility',radar?'visible':'none')}catch(_){}if(radar)startRadarMotion();else stopRadarMotion();keepWeatherReferenceLinesOnTop();document.querySelector('[data-layer="radar"]')?.classList.toggle('active',radar)}
 function setActive(v){
  active=!!v;
  hideLegacyNativeWeatherLayers(map);
  // Keep the legacy particle bundle disabled. New rain and cloud-to-ground lightning are separate renderers.
  fx.setEnabled(false);
  rain.setEnabled(active);
  lightning?.setEnabled?.(active);
  for(const id of ['wx-alert-line','wx-fire-line','wx-quake','wx-storm','wx-obs','wx-water'])try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',active?'visible':'none')}catch(_){}
  const signalsButton=document.querySelector('[data-layer="signals"]');if(signalsButton){signalsButton.classList.toggle('active',active);signalsButton.setAttribute('aria-pressed',String(active))}
  if(CLOUDS_ONLY_PHASE())hideCloudPhaseVisuals(map);
  if(active)refresh(true);
 }
 document.addEventListener('visibilitychange',()=>{if(document.hidden)stopRadarMotion();else if(radar)startRadarMotion()});
 map.on('moveend',()=>{clearTimeout(timer);timer=setTimeout(()=>refresh(false),MOBILE?450:(LOW?500:280))});map.on('zoomend',()=>{if(!MOBILE)refresh(false)});document.querySelector('[data-layer="radar"]')?.addEventListener('click',e=>setRadar(e.currentTarget.classList.contains('active')));document.querySelector('[data-layer="signals"]')?.addEventListener('click',e=>setActive(e.currentTarget.classList.contains('active')));if(CLOUDS_ONLY_PHASE()){map.on('styledata',()=>hideCloudPhaseVisuals(map));map.on('load',()=>hideCloudPhaseVisuals(map));hideCloudPhaseVisuals(map)}refresh(true);setInterval(()=>document.querySelector('[data-surface="map"]')?.classList.contains('active')&&refresh(false),60000);
 const api={version:VERSION,map,refresh,setRadar,setActive,fx,rain,lightning,getScene:()=>scene,localConditions:(lng,lat)=>fx.localConditions(lng,lat),get state(){return{active,radar,last,fx:fx.state,counts:{alerts:scene.alerts.length,fires:scene.fires.length,storms:scene.storms.length,observations:scene.observations.length,lightning:scene.lightning.length,water:scene.water_levels.length}}}};
 const graphicsDiag=window.__BP_WEATHER_GL_HEALTH_V6057__={version:6057,contextLosses:0,contextRestores:0,lastContextLossAt:null,lastContextRestoreAt:null,updatedAt:Date.now()};
 try{const canvas=map.getCanvas();if(canvas&&!canvas.__bpWeatherGlDiag6057){canvas.__bpWeatherGlDiag6057=true;canvas.addEventListener('webglcontextlost',()=>{graphicsDiag.contextLosses++;graphicsDiag.lastContextLossAt=Date.now();graphicsDiag.updatedAt=Date.now()});canvas.addEventListener('webglcontextrestored',()=>{graphicsDiag.contextRestores++;graphicsDiag.lastContextRestoreAt=Date.now();graphicsDiag.updatedAt=Date.now()})}}catch(_){}
 window.__BP_CINEMATIC_WEATHER_RUNTIME__={version:6057,renderer:'isolated-webgl-particle-layer',defaultOn:true,map,get enabled(){return active},get effectsEnabled(){return fx.state.enabled===true},get rainEnabled(){return rain.state.enabled===true},get lightningEnabled(){return lightning?.state?.enabled===true},get cloudsOnlyPhase(){return CLOUDS_ONLY_PHASE()},get layerAttached(){try{return !!map.getLayer('bp2300-weather-fx-gpu')}catch(_){return false}},get shaderReady(){return fx.state.shaderReady===true},get particleCount(){return fx.state.activeParticles||0},get canvasCount(){try{return map.getContainer().querySelectorAll('canvas').length}catch(_){return 0}},get contextLosses(){return Number(graphicsDiag.contextLosses)||0},get sceneCounts(){return{alerts:scene.alerts.length,fires:scene.fires.length,storms:scene.storms.length,observations:scene.observations.length,lightning:scene.lightning.length}},get legacyOverlaysHidden(){return LEGACY_NATIVE_WEATHER_LAYERS.every(id=>{try{return !map.getLayer(id)||(map.getLayoutProperty(id,'visibility')||'visible')==='none'}catch(_){return false}})}};
 window.__bpWeatherV2300=api;return api
}
