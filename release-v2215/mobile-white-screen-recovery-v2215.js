(()=>{
'use strict';
if(window.__bridgepointMobileWhiteScreenRecoveryV2215)return;window.__bridgepointMobileWhiteScreenRecoveryV2215=true;
const VERSION=2215,MOBILE=innerWidth<=900||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
let map=null,host=null,shell=null,observer=null,repairs=0,lastReason='waiting',hidden=[];
const $=q=>document.querySelector(q);
function installCss(){if($('#bp2215WhiteScreenRecoveryStyle'))return;const s=document.createElement('style');s.id='bp2215WhiteScreenRecoveryStyle';s.textContent=`
@media(max-width:900px){
.map-shell{overflow:hidden!important;background:#06111a!important;isolation:isolate!important}
.map-shell>canvas{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
#liveMap,.maplibregl-map,.maplibregl-canvas-container,.maplibregl-canvas{background:transparent!important}
#liveMap{position:relative!important;z-index:1!important;min-height:420px!important}
.maplibregl-map,.maplibregl-canvas-container{position:absolute!important;inset:0!important;width:100%!important;height:100%!important}
.maplibregl-canvas{display:block!important;visibility:visible!important;opacity:1!important;left:0!important;top:0!important;max-width:none!important;z-index:1!important}
#bp2200CloudDeck,#bp2201Precipitation,#bp2209PostFX{display:none!important;visibility:hidden!important;opacity:0!important}
}
`;document.head.appendChild(s)}
function isolateSecondaryCanvases(){if(!MOBILE||!shell)return;hidden=[];for(const c of [...shell.children]){if(c.tagName!=='CANVAS')continue;c.style.setProperty('display','none','important');c.style.setProperty('visibility','hidden','important');c.style.setProperty('opacity','0','important');c.style.setProperty('pointer-events','none','important');hidden.push(c.id||'(unnamed-canvas)')}}
function normalizeMainCanvas(){if(!map||!host)return false;const r=host.getBoundingClientRect();if(r.width<40||r.height<40)return false;const cc=host.querySelector('.maplibregl-canvas-container'),c=map.getCanvas?.()||host.querySelector('.maplibregl-canvas');if(cc){cc.style.setProperty('position','absolute','important');cc.style.setProperty('inset','0','important');cc.style.setProperty('width',`${r.width}px`,'important');cc.style.setProperty('height',`${r.height}px`,'important')}if(c){c.style.setProperty('display','block','important');c.style.setProperty('visibility','visible','important');c.style.setProperty('opacity','1','important');c.style.setProperty('width',`${r.width}px`,'important');c.style.setProperty('height',`${r.height}px`,'important');c.style.setProperty('left','0','important');c.style.setProperty('top','0','important')}try{map.resize?.();map.triggerRepaint?.()}catch(_){}return true}
function repair(reason='manual'){if(!MOBILE)return;lastReason=reason;isolateSecondaryCanvases();normalizeMainCanvas();requestAnimationFrame(()=>{isolateSecondaryCanvases();normalizeMainCanvas()});setTimeout(()=>{isolateSecondaryCanvases();normalizeMainCanvas()},180);repairs++}
function bind(){if(!MOBILE||!shell)return;if(!observer){observer=new MutationObserver(()=>repair('mutation'));observer.observe(shell,{childList:true})}addEventListener('resize',()=>repair('resize'),{passive:true});addEventListener('orientationchange',()=>setTimeout(()=>repair('orientation'),120),{passive:true});addEventListener('pageshow',()=>repair('pageshow'),{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)repair('visible')},{passive:true});window.addEventListener('bp:map-open',()=>repair('map-open'));try{visualViewport?.addEventListener('resize',()=>repair('visual-viewport'),{passive:true})}catch(_){}
const mapSurface=document.querySelector('[data-surface="map"]');if(mapSurface){new MutationObserver(()=>{if(mapSurface.classList.contains('active'))repair('surface-active')}).observe(mapSurface,{attributes:true,attributeFilter:['class']})}}
function init(){installCss();const s=window.__bp97MapState;map=s?.map;host=$('#liveMap');shell=$('.map-shell');if(!MOBILE){lastReason='desktop-noop';return}if(!s?.ready||!map||!host||!shell){setTimeout(init,100);return}bind();repair('init');for(const ms of [250,600,1200,2200,4000,7000])setTimeout(()=>repair(`boot-${ms}`),ms);console.info('BridgePoint Mobile White Screen Recovery V2215 ready')}
window.BridgePointMobileWhiteScreenRecoveryV2215={version:VERSION,repair:()=>repair('api'),getState:()=>({version:VERSION,mobile:MOBILE,repairs,lastReason,hiddenSecondaryCanvases:[...hidden],mapReady:!!map,hostReady:!!host,whiteOverlayGuard:true,mapNativeWeatherPreserved:true,buildingLayersPreserved:true})};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
