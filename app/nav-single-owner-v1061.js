(()=>{
'use strict';
if(window.__bridgepointNavSingleOwnerV1061)return;window.__bridgepointNavSingleOwnerV1061=true;
const de=document.documentElement;let active='home',lastTapAt=0,lastTapTab='';
const svg={
 home:'<svg viewBox="0 0 24 24"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/></svg>',
 map:'<svg viewBox="0 0 24 24"><path d="M9 18 3.8 20.4V6L9 3.6l6 2.4 5.2-2.4V18L15 20.4 9 18Z"/><path d="M9 3.6V18M15 6v14.4"/></svg>',
 properties:'<svg viewBox="0 0 24 24"><path d="M4 20V7l8-3 8 3v13"/><path d="M8 10h2M14 10h2M8 14h2M14 14h2M10 20v-3h4v3"/></svg>',
 work:'<svg viewBox="0 0 24 24"><path d="M5 7h14v13H5z"/><path d="M9 7V4h6v3M5 12h14M10 12v2h4v-2"/></svg>',
 more:'<svg viewBox="0 0 24 24"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>'
};
const style=document.createElement('style');style.id='bp1061-nav-style';style.textContent=`
#bp1055-nav,#bp1055-more-button{display:none!important;visibility:hidden!important;pointer-events:none!important}
#bp1061-nav{position:fixed!important;z-index:2147483647!important;left:0!important;right:0!important;bottom:0!important;height:calc(84px + env(safe-area-inset-bottom))!important;padding:7px 8px max(8px,env(safe-area-inset-bottom))!important;display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;gap:4px!important;box-sizing:border-box!important;background:linear-gradient(180deg,rgba(8,24,42,.985),rgba(5,16,29,.999))!important;backdrop-filter:blur(22px)!important;border-top:1px solid rgba(102,232,255,.22)!important;box-shadow:0 -12px 36px rgba(0,0,0,.45)!important;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;pointer-events:auto!important;isolation:isolate!important}
#bp1061-nav .bp1061-tab{appearance:none!important;border:0!important;border-radius:14px!important;background:transparent!important;color:#aebed0!important;display:grid!important;place-items:center!important;align-content:center!important;gap:4px!important;font-weight:900!important;font-size:10px!important;min-width:0!important;min-height:64px!important;cursor:pointer!important;touch-action:manipulation!important;-webkit-tap-highlight-color:transparent!important;pointer-events:auto!important;position:relative!important}
#bp1061-nav .bp1061-tab .ico{width:39px;height:29px;border-radius:12px;display:grid;place-items:center;color:#b6c8d8;pointer-events:none}#bp1061-nav .bp1061-tab .ico svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}#bp1061-nav .bp1061-tab>span:last-child{pointer-events:none}
#bp1061-nav .bp1061-tab.active{color:#fff!important}#bp1061-nav .bp1061-tab.active .ico{background:rgba(102,232,255,.14);color:#66e8ff;box-shadow:inset 0 0 0 1px rgba(102,232,255,.15),0 0 22px rgba(72,225,255,.06)}#bp1061-nav .bp1061-tab.active:after{content:"";position:absolute;bottom:1px;left:28%;right:28%;height:2px;border-radius:999px;background:#66e8ff;box-shadow:0 0 12px rgba(102,232,255,.8)}#bp1061-nav .bp1061-tab:active{transform:scale(.96)}
html.bp1060-preapp-active #bp1061-nav,html.bp1060-auth-active #bp1061-nav,html.bp1059-legal-pending #bp1061-nav{display:none!important;visibility:hidden!important;pointer-events:none!important}
#bp974-map-dialog{bottom:calc(84px + env(safe-area-inset-bottom))!important}#bp1042-properties,#bp1042-more,#bp1054-work{bottom:calc(84px + env(safe-area-inset-bottom))!important}
`;document.head.appendChild(style);
de.style.setProperty('--bp1042-nav-height','84px');de.style.setProperty('--bp1054-nav-height','84px');de.style.setProperty('--bp1055-nav-height','84px');
function removeOld(){document.getElementById('bp1055-nav')?.remove();document.getElementById('bp1055-more-button')?.remove();}
function forceShow(id){const el=document.getElementById(id);if(!el)return false;el.classList.add('show');el.style.removeProperty('display');el.style.removeProperty('visibility');el.style.removeProperty('opacity');el.style.removeProperty('pointer-events');return true;}
function forceHide(id){const el=document.getElementById(id);if(!el)return;el.classList.remove('show');}
function closeMap(){document.getElementById('bp974-map-dialog')?.classList.remove('show');document.getElementById('bp1055-map-wait')?.classList.remove('show');}
function closeAll(except=''){
 if(except!=='properties'){window.BridgePointClosePropertiesV1042?.();forceHide('bp1042-properties');}
 if(except!=='work'){window.BridgePointWorkHubV1054?.close?.();forceHide('bp1054-work');}
 if(except!=='more'){window.BridgePointCloseMoreV1042?.();forceHide('bp1042-more');}
 if(except!=='plans')window.BridgePointClosePlansV1042?.();
 window.BridgePointProperty360V1046?.close?.();
 if(except!=='map')closeMap();
}
function setMode(tab){active=tab;for(const c of [...de.classList])if(/^bp10(42|43|44|54|55|60|61)-/.test(c)&&!['bp1055-shell','bp1060-preapp-active','bp1060-auth-active'].includes(c))de.classList.remove(c);de.classList.add('bp1055-shell',`bp1055-${tab}`,`bp1061-${tab}`);document.querySelectorAll('#bp1061-nav [data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));window.__bridgepointActiveTabV1055=tab;window.__bridgepointActiveTabV1061=tab;window.dispatchEvent(new CustomEvent('bridgepoint-tab-v1055',{detail:{tab}}));}
function trialLocked(tab){if(!['map','properties','work'].includes(tab))return false;const t=window.BridgePointTrialV1055;if(t?.isLocked?.()){t.showGate?.();return true}return false;}
async function go(tab){
 if(trialLocked(tab))return;
 if(tab==='home'){closeAll();setMode('home');return;}
 if(tab==='properties'){closeAll('properties');setMode('properties');window.BridgePointOpenPropertiesV1042?.();for(const ms of [0,60,180,420])setTimeout(()=>forceShow('bp1042-properties'),ms);return;}
 if(tab==='work'){closeAll('work');setMode('work');window.BridgePointWorkHubV1054?.open?.('overview');for(const ms of [0,60,180,420])setTimeout(()=>forceShow('bp1054-work'),ms);return;}
 if(tab==='more'){closeAll('more');setMode('more');window.BridgePointOpenMoreV1042?.();for(const ms of [0,60,180,420])setTimeout(()=>forceShow('bp1042-more'),ms);return;}
 if(tab==='map'){closeAll('map');setMode('map');const wait=document.getElementById('bp1055-map-wait');wait?.classList.add('show');try{const open=window.BridgePointOpenMapV993||window.BridgePointOpenIntelligenceMapV974;if(typeof open!=='function')throw new Error('Map runtime unavailable');await open();wait?.classList.remove('show');setTimeout(()=>window.BridgePointMapUIV1060?.apply?.(),40);}catch(e){console.error(e);wait?.classList.remove('show');setMode('home');}}
}
function makeNav(){removeOld();let nav=document.getElementById('bp1061-nav');if(nav)return nav;nav=document.createElement('nav');nav.id='bp1061-nav';nav.setAttribute('aria-label','Primary navigation');nav.innerHTML=`<button type="button" class="bp1061-tab active" data-tab="home"><span class="ico">${svg.home}</span><span>Home</span></button><button type="button" class="bp1061-tab" data-tab="map"><span class="ico">${svg.map}</span><span>Map</span></button><button type="button" class="bp1061-tab" data-tab="properties"><span class="ico">${svg.properties}</span><span>Properties</span></button><button type="button" class="bp1061-tab" data-tab="work"><span class="ico">${svg.work}</span><span>Work</span></button><button type="button" class="bp1061-tab" data-tab="more"><span class="ico">${svg.more}</span><span>More</span></button>`;document.body.appendChild(nav);nav.querySelectorAll('[data-tab]').forEach(b=>{const fire=e=>{e.preventDefault();e.stopPropagation();const now=Date.now(),tab=b.dataset.tab;if(tab===lastTapTab&&now-lastTapAt<350)return;lastTapTab=tab;lastTapAt=now;void go(tab);};b.addEventListener('pointerup',fire,{passive:false});b.addEventListener('click',fire,{passive:false});});return nav;}
const api={home:()=>go('home'),map:()=>go('map'),properties:()=>go('properties'),work:()=>go('work'),more:()=>go('more'),plans:()=>window.BridgePointOpenPlansV1042?.(),getActive:()=>active,__bp1061:true};
function install(){makeNav();window.BridgePointSingleShellV1061=api;window.BridgePointSingleShellV1055=api;window.BridgePointSelectedTabV984=()=>active;setMode(active);}
install();for(const ms of [80,220,500,1000,1800])setTimeout(()=>{removeOld();makeNav();},ms);window.addEventListener('pageshow',()=>{removeOld();makeNav();});
window.BridgePointNavV1061={go,install,getActive:()=>active};
})();