(()=>{
'use strict';
if(window.__bridgepointMobileRenderStabilityV2213)return;window.__bridgepointMobileRenderStabilityV2213=true;
const VERSION=2213,MOBILE=innerWidth<=900||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent),LOW=Number(navigator.deviceMemory||4)<=3||Number(navigator.hardwareConcurrency||4)<=4;
let map=null,state=null,host=null,shell=null,resizeTimer=0,checks=0,status='waiting',contextLost=false,removedPostFx=false,removedTree3D=false,lastSize=null;
const $=q=>document.querySelector(q);
function installCss(){if($('#bp2213MobileStabilityStyle'))return;const s=document.createElement('style');s.id='bp2213MobileStabilityStyle';s.textContent=`
@media(max-width:900px){
[data-surface="map"],.map-shell,#liveMap,.maplibregl-map,.maplibregl-canvas-container{width:100%!important;max-width:100%!important;min-width:0!important}
.map-shell,#liveMap,.maplibregl-map,.maplibregl-canvas-container,.maplibregl-canvas{box-sizing:border-box!important}
#liveMap,.maplibregl-map,.maplibregl-canvas-container{height:100%!important;max-height:100%!important}
.maplibregl-canvas-container{position:absolute!important;inset:0!important;overflow:hidden!important}
.maplibregl-canvas{display:block!important;left:0!important;top:0!important;max-width:none!important}
#bp2209PostFX{display:none!important;visibility:hidden!important;pointer-events:none!important}
}
`;document.head.appendChild(s)}
function loseSecondaryContext(canvas){if(!canvas)return;try{const gl=canvas.getContext('webgl')||canvas.getContext('webgl2');gl?.getExtension?.('WEBGL_lose_context')?.loseContext?.()}catch(_){}}
function shedSecondaryGpu(){if(!MOBILE)return;const fx=$('#bp2209PostFX');if(fx){loseSecondaryContext(fx);fx.remove();removedPostFx=true}
 try{if(map?.getLayer?.('bp2211-3d-trees')){map.removeLayer('bp2211-3d-trees');removedTree3D=true}}catch(e){console.warn('BP2213 tree fallback',e)}
 const photo=$('#bp2163Cesium');if(photo&&getComputedStyle(photo).display==='none'){try{const v=window.__bp2163Photorealistic?.viewer;if(v&&!v.isDestroyed?.())v.useDefaultRenderLoop=false}catch(_){}}
}
function normalizeCanvas(){if(!map||!host)return false;const r=host.getBoundingClientRect();if(r.width<40||r.height<40)return false;const cc=host.querySelector('.maplibregl-canvas-container'),c=map.getCanvas?.()||host.querySelector('.maplibregl-canvas');
 if(cc){cc.style.width=`${r.width}px`;cc.style.height=`${r.height}px`;cc.style.left='0px';cc.style.top='0px'}
 if(c){c.style.width=`${r.width}px`;c.style.height=`${r.height}px`;c.style.left='0px';c.style.top='0px';c.style.display='block'}
 lastSize={width:Math.round(r.width),height:Math.round(r.height),canvasWidth:c?Math.round(c.getBoundingClientRect().width):null,canvasHeight:c?Math.round(c.getBoundingClientRect().height):null};return true}
function doResize(reason='resize'){clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>{if(!map||!host)return;try{normalizeCanvas();map.resize?.();requestAnimationFrame(()=>{normalizeCanvas();map.resize?.();map.triggerRepaint?.()});status=contextLost?'recovering':`stable:${reason}`;checks++}catch(e){status='resize-error';console.warn('BP2213 resize',e)}},32)}
function bindCanvasRecovery(){const c=map?.getCanvas?.();if(!c||c.__bp2213Recovery)return;c.__bp2213Recovery=true;c.addEventListener('webglcontextlost',e=>{contextLost=true;status='context-lost';try{e.preventDefault()}catch(_){}shedSecondaryGpu();setTimeout(()=>doResize('context-lost'),80)},false);c.addEventListener('webglcontextrestored',()=>{contextLost=false;status='context-restored';doResize('context-restored')},false)}
function bindResize(){if(shell&&!shell.__bp2213RO&&window.ResizeObserver){shell.__bp2213RO=new ResizeObserver(()=>doResize('observer'));shell.__bp2213RO.observe(shell)}if(host&&!host.__bp2213RO&&window.ResizeObserver){host.__bp2213RO=new ResizeObserver(()=>doResize('host-observer'));host.__bp2213RO.observe(host)}
 addEventListener('resize',()=>doResize('window'),{passive:true});addEventListener('orientationchange',()=>{doResize('orientation');setTimeout(()=>doResize('orientation-settled'),350)},{passive:true});addEventListener('pageshow',()=>doResize('pageshow'),{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)doResize('visible')},{passive:true});
 try{visualViewport?.addEventListener('resize',()=>doResize('visual-viewport'),{passive:true})}catch(_){}
 window.addEventListener('bp:map-open',()=>{doResize('map-open');setTimeout(()=>doResize('map-open-settled'),180)})}
function enforceGpuBudget(){if(!MOBILE)return;shedSecondaryGpu();try{if(typeof map?.setPixelRatio==='function')map.setPixelRatio(LOW?1:Math.min(1.2,devicePixelRatio||1))}catch(_){}
 for(let i=1;i<=16;i++)setTimeout(()=>{shedSecondaryGpu();if(i===2||i===6||i===12)doResize('boot-guard')},i*250)}
function init(){installCss();state=window.__bp97MapState;map=state?.map;host=$('#liveMap');shell=$('.map-shell');if(!state?.ready||!map||!host||!shell){setTimeout(init,120);return}bindCanvasRecovery();bindResize();enforceGpuBudget();doResize('init');setTimeout(()=>doResize('settled'),500);status=MOBILE?'mobile-stabilized':'desktop-noop';console.info('BridgePoint Mobile Render Stability V2213 ready',MOBILE?'mobile':'desktop')}
window.BridgePointMobileRenderStabilityV2213={version:VERSION,repair:()=>{shedSecondaryGpu();doResize('manual')},getState:()=>({version:VERSION,mobile:MOBILE,lowTier:LOW,status,contextLost,removedPostFx,removedTree3D,checks,lastSize,canvasFullWidth:true,mobileGpuIsolation:MOBILE,buildingDetailPreserved:true,intelligenceColorPreserved:true,propertyCardPreserved:true})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
