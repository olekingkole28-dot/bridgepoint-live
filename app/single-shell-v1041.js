(()=>{
'use strict';
if(window.__bridgepointSingleShellV1041)return;
window.__bridgepointSingleShellV1041=true;

let active='home',routing=false;
const de=document.documentElement;
de.style.setProperty('--bp1041-nav-height','84px');
de.style.setProperty('--bp1041-header-height','72px');
de.classList.add('bp1041-shell','bp1041-home');
const nativeSelected=typeof window.BridgePointSelectedTabV984==='function'?window.BridgePointSelectedTabV984:null;

const style=document.createElement('style');style.id='bp1041-shell-style';style.textContent=`
:root{--bp1041-nav-height:84px;--bp1041-header-height:72px}
#bp1036-commerce-tab,#bp1000-nav-wait,#bp1037-home-seam-guard,#bp984-home-mask,#bp988-home-hard-cover,#bp994-nav-seam-cover,#bp999-nav,#bp998-web-nav,#bp999-header,#bp998-web-header,#bp1040-nav,#bp1040-header,#bp1036-plans-dialog{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
#bp1041-header{position:fixed;z-index:2147483618;left:0;right:0;top:0;height:var(--bp1041-header-height);display:none;box-sizing:border-box;padding:max(8px,env(safe-area-inset-top)) 14px 8px;align-items:flex-end;gap:10px;background:linear-gradient(180deg,#06111f,#081a2b);border-bottom:1px solid rgba(72,225,255,.12);color:#fff;font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
html.bp1041-home #bp1041-header{display:flex}.bp1041-brand{display:flex;align-items:center;gap:10px;min-width:0;flex:1}.bp1041-brand img{width:40px;height:40px;border-radius:11px}.bp1041-brand b{font-size:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bp1041-live{display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid rgba(69,230,166,.18);border-radius:999px;background:rgba(69,230,166,.06);color:#8df2c5;font-size:9px;font-weight:1000}.bp1041-live i{width:7px;height:7px;border-radius:50%;background:#45e6a6;box-shadow:0 0 12px rgba(69,230,166,.7)}
#bp1041-nav{position:fixed;z-index:2147483635;left:0;right:0;bottom:0;height:calc(var(--bp1041-nav-height) + env(safe-area-inset-bottom));padding:7px 8px max(8px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;background:linear-gradient(180deg,#08182a,#071626);border-top:1px solid rgba(72,225,255,.15);box-shadow:0 -12px 36px rgba(0,0,0,.38);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.bp1041-tab{appearance:none;border:0;border-radius:14px;background:transparent;color:#aebed0;display:grid;place-items:center;align-content:center;gap:4px;font-weight:900;font-size:10.5px;min-width:0;cursor:pointer}.bp1041-tab .ico{width:39px;height:29px;border-radius:12px;display:grid;place-items:center;font-size:19px;color:#b6c8d8}.bp1041-tab.active{color:#fff}.bp1041-tab.active .ico{background:rgba(72,225,255,.14);color:#56e5ff;box-shadow:inset 0 0 0 1px rgba(72,225,255,.14)}.bp1041-tab[data-tab="plans"] .ico{color:#ffc95e}.bp1041-tab[data-tab="plans"].active .ico{background:rgba(255,201,94,.12);color:#ffd77e;box-shadow:inset 0 0 0 1px rgba(255,201,94,.2)}
html.bp1041-home flutter-view,html.bp1041-home flt-glass-pane,html.bp1041-plans flutter-view,html.bp1041-plans flt-glass-pane,html.bp1041-map flutter-view,html.bp1041-map flt-glass-pane{opacity:0!important;visibility:hidden!important;pointer-events:none!important;clip-path:none!important;-webkit-clip-path:none!important}
html.bp1041-home #bp-live-home-v984{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;top:var(--bp1041-header-height)!important;bottom:calc(var(--bp1041-nav-height) + env(safe-area-inset-bottom))!important;z-index:2147483605!important}
html.bp1041-home #bp974-cosmos{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:none!important;clip-path:inset(var(--bp1041-header-height) 0 calc(var(--bp1041-nav-height) + env(safe-area-inset-bottom)) 0)!important}
html.bp1041-flutter #bp-live-home-v984,html.bp1041-flutter #bp974-cosmos,html.bp1041-plans #bp-live-home-v984,html.bp1041-plans #bp974-cosmos,html.bp1041-map #bp-live-home-v984,html.bp1041-map #bp974-cosmos{display:none!important;visibility:hidden!important;pointer-events:none!important}
html.bp1041-flutter flutter-view,html.bp1041-flutter flt-glass-pane{opacity:1!important;visibility:visible!important;pointer-events:auto!important;clip-path:inset(0 0 calc(var(--bp1041-nav-height) + env(safe-area-inset-bottom)) 0)!important;-webkit-clip-path:inset(0 0 calc(var(--bp1041-nav-height) + env(safe-area-inset-bottom)) 0)!important}
#bp974-map-dialog{bottom:calc(var(--bp1041-nav-height) + env(safe-area-inset-bottom))!important;z-index:2147483632!important}
#bp1041-route-wait{position:fixed;z-index:2147483634;left:0;right:0;top:0;bottom:calc(var(--bp1041-nav-height) + env(safe-area-inset-bottom));display:none;place-items:center;background:#030811;color:#c9d8e5;font:850 13px/1.4 system-ui;pointer-events:auto}#bp1041-route-wait.show{display:grid}.bp1041-waitbox{display:grid;place-items:center;gap:10px}.bp1041-spinner{width:32px;height:32px;border-radius:50%;border:3px solid rgba(72,225,255,.16);border-top-color:#48e1ff;animation:bp1041spin .8s linear infinite}@keyframes bp1041spin{to{transform:rotate(360deg)}}
#bp1041-toast{position:fixed;z-index:2147483640;left:50%;bottom:calc(var(--bp1041-nav-height) + env(safe-area-inset-bottom) + 14px);transform:translateX(-50%);display:none;width:min(520px,calc(100% - 24px));padding:11px 13px;border:1px solid rgba(255,146,146,.28);border-radius:12px;background:#1a1016;color:#ffd3d3;font:800 11px/1.35 system-ui;box-shadow:0 14px 40px rgba(0,0,0,.4)}#bp1041-toast.show{display:block}
@media(min-width:901px){:root{--bp1041-nav-height:78px;--bp1041-header-height:70px}.bp1041-tab{font-size:11px}}
@media(prefers-reduced-motion:reduce){.bp1041-spinner{animation:none}}
`;document.head.appendChild(style);

const header=document.createElement('header');header.id='bp1041-header';header.innerHTML='<div class="bp1041-brand"><img src="icons/Icon-192.png?v=1041" alt=""><b>BridgePoint Intelligence</b></div><div class="bp1041-live"><i></i>LIVE</div>';document.body.appendChild(header);
const nav=document.createElement('nav');nav.id='bp1041-nav';nav.setAttribute('aria-label','Primary navigation');nav.innerHTML='<button class="bp1041-tab active" data-tab="home" type="button"><span class="ico">▦</span><span>Home</span></button><button class="bp1041-tab" data-tab="map" type="button"><span class="ico">◉</span><span>Map</span></button><button class="bp1041-tab" data-tab="plans" type="button"><span class="ico">★</span><span>Plans</span></button><button class="bp1041-tab" data-tab="properties" type="button"><span class="ico">⌂</span><span>Properties</span></button><button class="bp1041-tab" data-tab="more" type="button"><span class="ico">▦</span><span>More</span></button>';document.body.appendChild(nav);
const wait=document.createElement('div');wait.id='bp1041-route-wait';wait.innerHTML='<div class="bp1041-waitbox"><div class="bp1041-spinner"></div><div data-copy>Opening…</div></div>';document.body.appendChild(wait);
const toast=document.createElement('div');toast.id='bp1041-toast';document.body.appendChild(toast);

function clean(){for(const id of ['bp1036-commerce-tab','bp1000-nav-wait','bp1037-home-seam-guard','bp999-nav','bp998-web-nav','bp999-header','bp998-web-header','bp1040-nav','bp1040-header'])document.getElementById(id)?.remove();}
function setMode(tab){
  active=tab;for(const c of ['bp1041-home','bp1041-map','bp1041-plans','bp1041-flutter'])de.classList.remove(c);
  de.classList.add(tab==='home'?'bp1041-home':tab==='map'?'bp1041-map':tab==='plans'?'bp1041-plans':'bp1041-flutter');
  nav.querySelectorAll('.bp1041-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  window.__bridgepointActiveTabV1041=tab;window.dispatchEvent(new CustomEvent('bridgepoint-tab-v1041',{detail:{tab}}));
}
function showWait(label){wait.querySelector('[data-copy]').textContent=`Opening ${label}…`;wait.classList.add('show');}
function hideWait(){wait.classList.remove('show');}
let toastTimer=null;function showToast(msg){clearTimeout(toastTimer);toast.textContent=msg;toast.classList.add('show');toastTimer=setTimeout(()=>toast.classList.remove('show'),5000);}
function closeMap(){document.getElementById('bp974-map-dialog')?.classList.remove('show');}
function closePlans(){window.BridgePointClosePlansV1041?.();}
function semanticText(el){return `${el?.getAttribute?.('aria-label')||''} ${el?.textContent||''}`.replace(/\s+/g,' ').trim().toLowerCase();}
function semanticNodes(){return [...document.querySelectorAll('flt-semantics,[aria-label]')].filter(el=>el.closest?.('flutter-view,flt-glass-pane')||el.tagName?.toLowerCase()==='flt-semantics');}
function nativeTab(label){const want=String(label).toLowerCase();return semanticNodes().find(el=>{const s=semanticText(el),r=el.getBoundingClientRect?.();return r&&r.width>10&&r.height>10&&r.top>innerHeight*.58&&(s===want||s.startsWith(want+' '));})||null;}
function nativeCurrent(){try{return nativeSelected?.()||null;}catch(_){return null;}}
function clickNode(el){if(!el)return false;try{el.click?.();el.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true;}catch(_){return false;}}
function coordinateTap(index){
  const x=(index+.5)*(innerWidth/5),y=innerHeight-Math.min(46,Math.max(34,innerHeight*.035));
  const old=nav.style.pointerEvents;nav.style.pointerEvents='none';let target=null;try{target=document.elementFromPoint(x,y);}catch(_){}nav.style.pointerEvents=old;
  if(!target)return false;try{for(const type of ['pointerdown','mousedown','pointerup','mouseup','click'])target.dispatchEvent(type.startsWith('pointer')?new PointerEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,pointerId:1,pointerType:'touch',isPrimary:true}):new MouseEvent(type,{bubbles:true,cancelable:true,clientX:x,clientY:y,view:window}));return true;}catch(_){try{target.click?.();return true;}catch(__){return false;}}
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function navigateFlutter(labels,index){
  const wants=(Array.isArray(labels)?labels:[labels]).map(x=>String(x).toLowerCase());
  const deadline=Date.now()+30000;let lastGeometry=0;
  while(Date.now()<deadline){
    const fv=document.querySelector('flutter-view,flt-glass-pane');
    if(fv){
      const current=nativeCurrent();if(current&&wants.some(w=>current===w||current.startsWith(w)))return true;
      for(const w of wants){
        let ok=false;try{ok=window.BridgePointNavigateFlutterTabV984?.(w)===true;}catch(_){}
        if(!ok)ok=clickNode(nativeTab(w));
        if(ok){await sleep(180);const now=nativeCurrent();if(!now||wants.some(x=>now===x||now.startsWith(x)))return true;}
      }
      if(Date.now()-lastGeometry>900){lastGeometry=Date.now();coordinateTap(index);}
    }
    await sleep(180);
  }
  return false;
}

function home(){
  if(routing)return;closePlans();closeMap();hideWait();setMode('home');
  setTimeout(()=>{try{window.BridgePointNavigateFlutterTabV984?.('home');}catch(_){}},0);
}
async function map(){
  if(routing)return;closePlans();hideWait();setMode('map');
  try{if(typeof window.BridgePointOpenMapV993==='function')await window.BridgePointOpenMapV993();else await window.BridgePointOpenIntelligenceMapV974?.();}
  catch(e){console.error(e);setMode('home');showToast('The map could not open. Please tap Map again.');}
}
async function plans(){
  if(routing)return;closeMap();hideWait();setMode('plans');
  try{await window.BridgePointOpenPlansV1041?.();}catch(e){console.error(e);setMode('home');showToast('Plans could not open. Please tap Plans again.');}
}
async function flutterRoute(tab,labels,index){
  if(routing)return;routing=true;closePlans();closeMap();setMode(tab);showWait(tab==='properties'?'Properties':'More');
  try{
    const ok=await navigateFlutter(labels,index);
    if(!ok){setMode('home');showToast(`${tab==='properties'?'Properties':'More'} did not finish loading. BridgePoint kept you on Home instead of showing a blank screen.`);}
  }catch(e){console.error(e);setMode('home');showToast(`${tab==='properties'?'Properties':'More'} could not open. Please tap it again.`);}
  finally{hideWait();routing=false;}
}
function properties(){void flutterRoute('properties',['properties'],2);}
function more(){void flutterRoute('more',['more','work'],4);}

nav.querySelector('[data-tab="home"]').onclick=home;
nav.querySelector('[data-tab="map"]').onclick=map;
nav.querySelector('[data-tab="plans"]').onclick=plans;
nav.querySelector('[data-tab="properties"]').onclick=properties;
nav.querySelector('[data-tab="more"]').onclick=more;

window.addEventListener('bridgepoint-plans-close-v1041',()=>{if(active==='plans')home();});
const bodyObserver=new MutationObserver(()=>{
  clean();const d=document.getElementById('bp974-map-dialog');
  if(d&&!d.dataset.bp1041Watch){d.dataset.bp1041Watch='1';new MutationObserver(()=>{if(active==='map'&&!d.classList.contains('show'))home();}).observe(d,{attributes:true,attributeFilter:['class']});}
});
bodyObserver.observe(document.documentElement,{childList:true,subtree:true});
clean();setMode('home');
window.BridgePointSingleShellV1041={home,map,plans,properties,more,getActive:()=>active};
})();