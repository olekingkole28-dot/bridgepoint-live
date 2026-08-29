(()=>{
'use strict';
if(window.__bridgepointSingleShellV1044)return;
window.__bridgepointSingleShellV1044=true;
let active='home',mapWasOpen=false;
const de=document.documentElement;
de.style.setProperty('--bp1042-nav-height','84px');
de.style.setProperty('--bp1044-nav-height','84px');
de.style.setProperty('--bp1044-header-height','72px');
const style=document.createElement('style');style.id='bp1044-shell-style';style.textContent=`
:root{--bp1042-nav-height:84px;--bp1044-nav-height:84px;--bp1044-header-height:72px}
#bp1040-nav,#bp1040-header,#bp1041-nav,#bp1041-header,#bp1042-nav,#bp1042-header,#bp1043-nav,#bp1043-header,#bp1036-commerce-tab,#bp1036-plans-dialog,#bp1000-nav-wait,#bp1041-wait,#bp1037-home-seam-guard,#bp984-home-mask,#bp988-home-hard-cover,#bp994-nav-seam-cover,#bp999-nav,#bp998-web-nav,#bp999-header,#bp998-web-header{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
flutter-view,flt-glass-pane{opacity:0!important;visibility:hidden!important;pointer-events:none!important;clip-path:none!important;-webkit-clip-path:none!important}
#bp1044-header{position:fixed;z-index:2147483618;left:0;right:0;top:0;height:var(--bp1044-header-height);display:none;box-sizing:border-box;padding:max(8px,env(safe-area-inset-top)) 14px 8px;align-items:flex-end;gap:10px;background:linear-gradient(180deg,#06111f,#081a2b);border-bottom:1px solid rgba(72,225,255,.12);color:#fff;font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}html.bp1044-home #bp1044-header{display:flex}.bp1044-brand{display:flex;align-items:center;gap:10px;min-width:0;flex:1}.bp1044-brand img{width:40px;height:40px;border-radius:11px}.bp1044-brand b{font-size:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bp1044-live{display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid rgba(69,230,166,.18);border-radius:999px;background:rgba(69,230,166,.06);color:#8df2c5;font-size:9px;font-weight:1000}.bp1044-live i{width:7px;height:7px;border-radius:50%;background:#45e6a6;box-shadow:0 0 12px rgba(69,230,166,.7)}
#bp1044-nav{position:fixed;z-index:2147483635;left:0;right:0;bottom:0;height:calc(var(--bp1044-nav-height) + env(safe-area-inset-bottom));padding:7px 8px max(8px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;background:linear-gradient(180deg,#08182a,#071626);border-top:1px solid rgba(72,225,255,.15);box-shadow:0 -12px 36px rgba(0,0,0,.38);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.bp1044-tab{appearance:none;border:0;border-radius:14px;background:transparent;color:#aebed0;display:grid;place-items:center;align-content:center;gap:4px;font-weight:900;font-size:10.5px;min-width:0;cursor:pointer;touch-action:manipulation}.bp1044-tab .ico{width:39px;height:29px;border-radius:12px;display:grid;place-items:center;color:#b6c8d8}.bp1044-tab .ico svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.bp1044-tab.active{color:#fff}.bp1044-tab.active .ico{background:rgba(72,225,255,.14);color:#56e5ff;box-shadow:inset 0 0 0 1px rgba(72,225,255,.14)}.bp1044-tab[data-tab="plans"] .ico{color:#ffd77e}.bp1044-tab[data-tab="plans"].active .ico{background:rgba(255,201,94,.11);color:#ffe29c;box-shadow:inset 0 0 0 1px rgba(255,201,94,.18)}
html.bp1044-home #bp-live-home-v984{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;top:var(--bp1044-header-height)!important;bottom:calc(var(--bp1044-nav-height) + env(safe-area-inset-bottom))!important;z-index:2147483605!important}html:not(.bp1044-home) #bp-live-home-v984{display:none!important;visibility:hidden!important;pointer-events:none!important}html.bp1044-home #bp974-cosmos{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:none!important;clip-path:inset(var(--bp1044-header-height) 0 calc(var(--bp1044-nav-height) + env(safe-area-inset-bottom)) 0)!important}html:not(.bp1044-home) #bp974-cosmos{display:none!important;visibility:hidden!important}
#bp974-map-dialog{bottom:calc(var(--bp1044-nav-height) + env(safe-area-inset-bottom))!important;z-index:2147483632!important}
@media(max-width:700px){.bp1044-tab{font-size:10px}.bp1044-tab .ico{height:28px}.bp1044-tab .ico svg{width:20px;height:20px}}
`;document.head.appendChild(style);
const svg={
 home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/></svg>',
 map:'<svg viewBox="0 0 24 24"><path d="M9 18 3.8 20.4V6L9 3.6l6 2.4 5.2-2.4V18L15 20.4 9 18Z"/><path d="M9 3.6V18M15 6v14.4"/></svg>',
 plans:'<svg viewBox="0 0 24 24"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>',
 property:'<svg viewBox="0 0 24 24"><path d="M4 20V7l8-3 8 3v13"/><path d="M8 10h2M14 10h2M8 14h2M14 14h2M10 20v-3h4v3"/></svg>',
 more:'<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/></svg>'
};
const header=document.createElement('header');header.id='bp1044-header';header.innerHTML='<div class="bp1044-brand"><img src="icons/Icon-192.png?v=1044" alt=""><b>BridgePoint Intelligence</b></div><div class="bp1044-live"><i></i>LIVE</div>';document.body.appendChild(header);
const nav=document.createElement('nav');nav.id='bp1044-nav';nav.setAttribute('aria-label','Primary navigation');nav.innerHTML=`<button class="bp1044-tab active" data-tab="home"><span class="ico">${svg.home}</span><span>Home</span></button><button class="bp1044-tab" data-tab="map"><span class="ico">${svg.map}</span><span>Map</span></button><button class="bp1044-tab" data-tab="plans"><span class="ico">${svg.plans}</span><span>Plans</span></button><button class="bp1044-tab" data-tab="properties"><span class="ico">${svg.property}</span><span>Properties</span></button><button class="bp1044-tab" data-tab="more"><span class="ico">${svg.more}</span><span>More</span></button>`;document.body.appendChild(nav);
function removeOld(){for(const id of ['bp1040-nav','bp1040-header','bp1041-nav','bp1041-header','bp1042-nav','bp1042-header','bp1043-nav','bp1043-header','bp1036-commerce-tab','bp1000-nav-wait','bp1041-wait','bp1037-home-seam-guard','bp999-nav','bp998-web-nav','bp999-header','bp998-web-header'])document.getElementById(id)?.remove();}
function closeMap(){document.getElementById('bp974-map-dialog')?.classList.remove('show');mapWasOpen=false;}
function closeAll(){window.BridgePointClosePlansV1042?.();window.BridgePointClosePropertiesV1042?.();window.BridgePointCloseMoreV1042?.();closeMap();}
function setMode(tab){active=tab;for(const c of [...de.classList])if((c.startsWith('bp1044-')||c.startsWith('bp1043-')||c.startsWith('bp1042-'))&&c!=='bp1044-shell')de.classList.remove(c);de.classList.add('bp1044-shell',`bp1044-${tab}`);nav.querySelectorAll('.bp1044-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));window.__bridgepointActiveTabV1044=tab;window.dispatchEvent(new CustomEvent('bridgepoint-tab-v1044',{detail:{tab}}));try{window.BridgePointSyncRuntimeV984?.();}catch(_){}}
function home(){closeAll();setMode('home');}
async function map(){window.BridgePointClosePlansV1042?.();window.BridgePointClosePropertiesV1042?.();window.BridgePointCloseMoreV1042?.();setMode('map');try{if(typeof window.BridgePointOpenMapV993==='function')await window.BridgePointOpenMapV993();else await window.BridgePointOpenIntelligenceMapV974?.();mapWasOpen=document.getElementById('bp974-map-dialog')?.classList.contains('show')===true;if(!mapWasOpen)throw new Error('Map did not open');}catch(e){console.error(e);home();}}
function plans(){closeMap();window.BridgePointClosePropertiesV1042?.();window.BridgePointCloseMoreV1042?.();setMode('plans');window.BridgePointOpenPlansV1042?.();}
function properties(){closeMap();window.BridgePointClosePlansV1042?.();window.BridgePointCloseMoreV1042?.();setMode('properties');window.BridgePointOpenPropertiesV1042?.();}
function resetMoreWorkspace(){const box=document.querySelector('#bp1042-more [data-workspace]');if(box){box.hidden=true;box.innerHTML='';}}
function more(){closeMap();window.BridgePointClosePlansV1042?.();window.BridgePointClosePropertiesV1042?.();setMode('more');window.BridgePointOpenMoreV1042?.();resetMoreWorkspace();}
nav.querySelector('[data-tab="home"]').onclick=home;nav.querySelector('[data-tab="map"]').onclick=map;nav.querySelector('[data-tab="plans"]').onclick=plans;nav.querySelector('[data-tab="properties"]').onclick=properties;nav.querySelector('[data-tab="more"]').onclick=more;
const api={home,map,plans,properties,more,getActive:()=>active};
window.BridgePointSelectedTabV984=()=>active;
window.BridgePointSingleShellV1044=api;
window.BridgePointSingleShellV1043=api;
window.BridgePointSingleShellV1042=api;
new MutationObserver(removeOld).observe(document.documentElement,{childList:true,subtree:true});removeOld();
setInterval(()=>{removeOld();if(active==='map'&&mapWasOpen&&document.getElementById('bp974-map-dialog')?.classList.contains('show')!==true)home();},500);
home();
})();