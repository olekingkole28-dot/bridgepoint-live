const VERSION=5910;
const ROOT_ID='bp-world-realism-v5910';
const STYLE_ID='bp-world-realism-style-v5910';
const ROOF_LAYERS=['gta-city-roofs','gta-context-roofs','gta-bp-roofs','gta-exact-roof','gta-city-building-roof-caps'];
const CSS=`
#liveMap #${ROOT_ID}{position:absolute;z-index:21;right:12px;top:56px;width:min(300px,calc(100% - 24px));box-sizing:border-box;color:#e9f7ff;font:12px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;pointer-events:none}
#liveMap #${ROOT_ID} *{box-sizing:border-box}
#liveMap #${ROOT_ID} button{pointer-events:auto;appearance:none;border:1px solid rgba(135,205,219,.35);border-radius:9px;background:rgba(4,18,27,.94);color:#eaf9ff;padding:8px 10px;min-height:34px;font:850 10px/1.1 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.035em;cursor:pointer}
#liveMap #${ROOT_ID} button:hover{border-color:#83efd1;background:rgba(9,53,55,.96)}
#liveMap #${ROOT_ID} .bpr-trigger{width:100%;text-align:left;display:flex;align-items:center;justify-content:space-between;gap:8px;box-shadow:0 8px 26px rgba(0,0,0,.34)}
#liveMap #${ROOT_ID} .bpr-trigger[aria-pressed=true]{background:linear-gradient(135deg,rgba(3,38,38,.97),rgba(8,74,61,.97));border-color:#75edc5;box-shadow:0 0 0 2px rgba(117,237,197,.13),0 8px 26px rgba(0,0,0,.34)}
#liveMap #${ROOT_ID} .bpr-dot{width:7px;height:7px;border-radius:50%;background:#72929c;box-shadow:0 0 0 3px rgba(114,146,156,.14);flex:0 0 auto}
#liveMap #${ROOT_ID} .bpr-trigger[aria-pressed=true] .bpr-dot{background:#7ef1c8;box-shadow:0 0 12px rgba(126,241,200,.8)}
#liveMap #${ROOT_ID} .bpr-panel{margin-top:7px;padding:11px;border:1px solid rgba(111,224,194,.32);border-radius:12px;background:linear-gradient(160deg,rgba(3,17,26,.97),rgba(4,35,38,.95));box-shadow:0 14px 36px rgba(0,0,0,.4);backdrop-filter:blur(12px) saturate(120%);-webkit-backdrop-filter:blur(12px) saturate(120%);pointer-events:auto}
#liveMap #${ROOT_ID} .bpr-panel[hidden]{display:none!important}
#liveMap #${ROOT_ID} .bpr-title{font-weight:950;color:#fff;letter-spacing:.04em;font-size:11px}
#liveMap #${ROOT_ID} .bpr-copy{font-size:10px;color:#b4ccd4;line-height:1.5;margin-top:6px}
#liveMap #${ROOT_ID} .bpr-state{font-size:10px;font-weight:800;color:#83edc9;margin-top:8px}
#liveMap #${ROOT_ID} .bpr-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:9px}
#liveMap #${ROOT_ID} .bpr-chip{border-radius:7px;background:rgba(15,52,59,.72);padding:7px 8px;font-size:9px;line-height:1.35;color:#d3e6e9}
#liveMap #${ROOT_ID} .bpr-note{font-size:9px;color:#91abb5;line-height:1.45;margin-top:9px;border-top:1px solid rgba(117,190,193,.18);padding-top:8px}
@media(max-width:700px){#liveMap #${ROOT_ID}{right:8px;top:50px;width:min(270px,calc(100% - 16px))}#liveMap #${ROOT_ID} .bpr-panel{padding:9px}#liveMap #${ROOT_ID} .bpr-copy{font-size:9px}}
`;
export function initRealismMode(target){
 const map=target?.map||target,container=map?.getContainer?.();
 if(!map||!container)return null;
 if(window.__BP_WORLD_REALISM_V5910__?.map===map)return window.__BP_WORLD_REALISM_V5910__;
 if(container.querySelector('#'+ROOT_ID))return window.__BP_WORLD_REALISM_V5910__||null;
 if(getComputedStyle(container).position==='static')container.style.position='relative';
 if(!document.getElementById(STYLE_ID)){const s=document.createElement('style');s.id=STYLE_ID;s.textContent=CSS;document.head.appendChild(s)}
 const root=document.createElement('section');root.id=ROOT_ID;root.setAttribute('aria-label','Real-world rendering controls');
 root.innerHTML=
  '<button class="bpr-trigger" type="button" data-toggle aria-pressed="false"><span>🌍 REAL-WORLD MODE</span><span class="bpr-dot" aria-hidden="true"></span></button>'+
  '<div class="bpr-panel" data-panel hidden><div class="bpr-title">SOURCE-AWARE WORLD MATERIALS</div>'+
  '<div class="bpr-copy">Adds available aerial/satellite basemaps, building-material patterns informed by published tags, close-range facade details, source geometry parts and light-aware shadows.</div>'+
  '<div class="bpr-state" data-state>REALISM MODE OFF</div>'+
  '<div class="bpr-grid"><div class="bpr-chip">Aerial/satellite underlay</div><div class="bpr-chip">Material-aware roofs</div><div class="bpr-chip">Textured facades at close zoom</div><div class="bpr-chip">Night windows when dark</div><div class="bpr-chip">Less neon floor detailing</div><div class="bpr-chip">Ground + source geometry retained</div></div>'+
  '<div class="bpr-note">Imagery coverage and building attributes vary by place. Facade/roof patterns are material-inspired approximations, not photographs of each building. Unknown roof geometry, exact facade texture and interior layouts are never invented as source facts.</div>'+
  '<button data-close type="button" style="width:100%;margin-top:8px">CLOSE</button></div>';
 container.appendChild(root);
 const $=s=>root.querySelector(s),button=$('[data-toggle]'),panel=$('[data-panel]'),stateLine=$('[data-state]');
 let enabled=false,previousBase='gta',disposed=false,applyFrame=0,previousRoofPaint=new Map(),patternsActive=false;
 const api={
  version:VERSION,map,root,
  get enabled(){return enabled},
  setEnabled(value){return setEnabled(Boolean(value))},
  toggle(){return setEnabled(!enabled)},
  get state(){return window.__BP_REAL_WORLD_MODE_V5910__||null},
  open(){panel.hidden=false},
  close(){panel.hidden=true},
  destroy(){disposed=true;cancelAnimationFrame(applyFrame);map.off('idle',onIdle);map.off('styledata',onStyle);root.remove();restoreRoofPatterns();if(enabled)setEnabled(false);},
 };
 window.__BP_WORLD_REALISM_V5910__=api;
 const report=()=>{window.__BP_REAL_WORLD_MODE_V5910__={
  version:VERSION,enabled,base:window.__BP_TECH_BASEMAP_V1116__?.activeBase||'gta',
  facadeMaterials:enabled,roofMaterials:enabled,sourceGeometryParts:enabled,nightWindows:enabled,
  patternKind:'SOURCE_TAG_AWARE_MATERIAL_INSPIRED_APPROXIMATION',
  photographicFacadeTextures:false,syntheticBuildingGeometry:false,updatedAt:Date.now()
 }};
 function storeRoofDefaults(){
  if(previousRoofPaint.size)return;
  for(const id of ROOF_LAYERS){
   if(!map.getLayer(id))continue;
   try{previousRoofPaint.set(id,{pattern:map.getPaintProperty(id,'fill-extrusion-pattern'),color:map.getPaintProperty(id,'fill-extrusion-color')})}catch(_){}
  }
 }
 function applyRoofPatterns(){
  if(!enabled||patternsActive||!map.isStyleLoaded?.())return;
  const expression=window.__BP_REALISM_ROOF_PATTERN_EXPR_V5910__;
  if(!expression)return;
  storeRoofDefaults();
  for(const id of ROOF_LAYERS){
   if(!map.getLayer(id))continue;
   try{map.setPaintProperty(id,'fill-extrusion-pattern',expression)}catch(e){console.warn('BridgePoint roof material layer',id,e?.message||e)}
  }
  patternsActive=true;
 }
 function restoreRoofPatterns(){
  if(!patternsActive)return;
  for(const [id,paint] of previousRoofPaint){
   if(!map.getLayer(id))continue;
   try{map.setPaintProperty(id,'fill-extrusion-pattern',paint.pattern??null);if(paint.color!==undefined)map.setPaintProperty(id,'fill-extrusion-color',paint.color)}catch(_){}
  }
  patternsActive=false;
 }
 function apply(){
  if(disposed)return;
  if(enabled)applyRoofPatterns();else restoreRoofPatterns();
  try{target?.refresh?.()}catch(_){}
  try{map.triggerRepaint()}catch(_){}
  report();
 }
 function schedule(){cancelAnimationFrame(applyFrame);applyFrame=requestAnimationFrame(apply)}
 function onIdle(){if(enabled&&!patternsActive)schedule()}
 function onStyle(){if(enabled&&!patternsActive)schedule()}
 function setEnabled(value){
  if(disposed)return false;
  if(value===enabled){panel.hidden=false;return enabled}
  if(value){
   previousBase=window.__BP_TECH_BASEMAP_V1116__?.activeBase==='satellite'?'satellite':'gta';
   enabled=true;
   window.__BP_REAL_WORLD_MODE_V5910__={version:VERSION,enabled:true,base:'satellite',updatedAt:Date.now()};
   try{target?.setBase?.('satellite')}catch(_){for(const id of ['gta-nasa','gta-usgs','gta-oam'])try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility','visible')}catch(__){}}
   button.setAttribute('aria-pressed','true');button.firstElementChild.textContent='🌍 REAL-WORLD MODE ON';
   stateLine.textContent='AERIAL BASE + MATERIAL DETAILS ACTIVE';panel.hidden=false;
   apply();setTimeout(schedule,120);setTimeout(schedule,650);
  }else{
   enabled=false;restoreRoofPatterns();
   try{target?.setBase?.(previousBase)}catch(_){for(const id of ['gta-nasa','gta-usgs','gta-oam'])try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility','none')}catch(__){}}
   button.setAttribute('aria-pressed','false');button.firstElementChild.textContent='🌍 REAL-WORLD MODE';
   stateLine.textContent='REALISM MODE OFF';
   window.__BP_REAL_WORLD_MODE_V5910__={version:VERSION,enabled:false,base:window.__BP_TECH_BASEMAP_V1116__?.activeBase||previousBase,updatedAt:Date.now()};
   apply();setTimeout(schedule,120);
  }
  return enabled;
 }
 button.addEventListener('click',()=>{if(panel.hidden){panel.hidden=false;if(!enabled)setEnabled(true)}else setEnabled(!enabled)});
 $('[data-close]').addEventListener('click',()=>{panel.hidden=true});
 map.on('idle',onIdle);map.on('styledata',onStyle);
 report();
 return api;
}
