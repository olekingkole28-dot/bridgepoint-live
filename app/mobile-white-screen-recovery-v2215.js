(()=>{
'use strict';
if(window.__bridgepointMobileWhiteScreenRecoveryV2215)return;
window.__bridgepointMobileWhiteScreenRecoveryV2215=true;
const VERSION=2215;
const MOBILE=innerWidth<=900||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
let map=null,host=null,shell=null,observer=null,repairs=0,lastReason='waiting',quarantined=[];
const $=q=>document.querySelector(q);
function isMainMapCanvas(c){return !!(c?.classList?.contains('maplibregl-canvas')||c?.closest?.('.maplibregl-canvas-container'))}
function loseAndRemove(c,reason='gpu-budget'){
  if(!c||isMainMapCanvas(c)||c.id==='bp97WeatherCanvas'||c.id==='cosmos')return false;
  const id=c.id||'(secondary-webgl-canvas)';
  try{
    const gl=c.getContext?.('webgl2')||c.getContext?.('webgl');
    if(gl)gl.getExtension?.('WEBGL_lose_context')?.loseContext?.();
  }catch(_){}
  try{c.remove()}catch(_){}
  if(!quarantined.includes(id))quarantined.push(id);
  lastReason=reason;
  return true;
}
function enforceGpuBudget(reason='gpu-budget'){
  if(!MOBILE)return;
  try{window.BridgePointPrecipitationV2201?.disable?.()}catch(_){}
  const ids=['bp2200CloudDeck','bp2201Precipitation','bp2205FireGpu','bp2205WildfireGpu','bp2209PostFX'];
  for(const id of ids)loseAndRemove(document.getElementById(id),reason);
  const photo=document.getElementById('bp2163Cesium');
  if(photo){
    try{photo.style.display='none';const v=window.__bp2163Photorealistic?.viewer;if(v&&!v.isDestroyed?.())v.useDefaultRenderLoop=false}catch(_){}
    photo.querySelectorAll?.('canvas')?.forEach(c=>loseAndRemove(c,reason));
  }
  document.querySelectorAll?.('.map-shell canvas')?.forEach(c=>{
    if(isMainMapCanvas(c)||c.id==='bp97WeatherCanvas')return;
    let gl=null;try{gl=c.getContext?.('webgl2')||c.getContext?.('webgl')}catch(_){}
    if(gl)loseAndRemove(c,reason);
  });
  document.querySelectorAll?.('body>canvas:not(#cosmos)')?.forEach(c=>{
    if(c.id||c.width!==512||c.height!==512)return;
    let gl=null;try{gl=c.getContext?.('webgl2')||c.getContext?.('webgl')}catch(_){}
    if(gl)loseAndRemove(c,reason);
  });
}
function repair(reason='manual'){
  if(!MOBILE||!map||!host)return;
  lastReason=reason;
  enforceGpuBudget(reason);
  try{
    const r=host.getBoundingClientRect();
    if(r.width<40||r.height<40)return;
    map.resize?.();
    requestAnimationFrame(()=>{try{map.resize?.();map.triggerRepaint?.()}catch(_){}});
    setTimeout(()=>{try{map.resize?.();map.triggerRepaint?.()}catch(_){}},180);
    repairs++;
  }catch(e){console.warn('BP2215 mobile recovery',e)}
}
function bind(){
  if(observer||!shell)return;
  observer=new MutationObserver(()=>repair('mutation'));
  observer.observe(shell,{childList:true,subtree:true});
  addEventListener('resize',()=>repair('resize'),{passive:true});
  addEventListener('orientationchange',()=>setTimeout(()=>repair('orientation'),120),{passive:true});
  addEventListener('pageshow',()=>repair('pageshow'),{passive:true});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)repair('visible')},{passive:true});
  window.addEventListener('bp:map-open',()=>repair('map-open'));
}
function init(){
  const s=window.__bp97MapState;
  map=s?.map;host=$('#liveMap');shell=$('.map-shell');
  if(!MOBILE){lastReason='desktop-noop';return}
  if(!s?.ready||!map||!host||!shell){setTimeout(init,100);return}
  bind();repair('init');
  for(const ms of [120,300,700,1500,3000,6000])setTimeout(()=>repair(`boot-${ms}`),ms);
  console.info('BridgePoint Mobile Recovery V2215 GPU-priority mode ready');
}
window.BridgePointMobileWhiteScreenRecoveryV2215={version:VERSION,repair:()=>repair('api'),getState:()=>({version:VERSION,mobile:MOBILE,repairs,lastReason,quarantined:[...quarantined],mapGpuPriority:true,mainCanvasPreserved:true,nativeMapEffectsPreserved:true})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
