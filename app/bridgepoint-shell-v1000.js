(()=>{
'use strict';
if(window.__bridgepointShellV1000)return;
window.__bridgepointShellV1000=true;

const TABS=['home','map','properties','worth','more'];
const FLUTTER_TABS=['properties','worth','more'];
let mode='home';
let mapWasOpen=false;

for(const id of ['bp999-header','bp999-nav','bp999-toast','bp998-web-header','bp998-web-nav','bp988-home-hard-cover','bp994-nav-seam-cover']){
  document.getElementById(id)?.remove();
}
for(const id of ['bp999-shell-style','bp990-tab-handoff-style','bp997-nav-boundary-style','bp998-home-flutter-separation-style','bp988-home-hard-cover-style','bp994-nav-seam-cover-style']){
  document.getElementById(id)?.remove();
}

const style=document.createElement('style');
style.id='bp1000-shell-style';
style.textContent=`
:root{--bp1000-header:72px;--bp1000-native-nav:100px}
#bp984-home-mask,#bp988-home-hard-cover,#bp994-nav-seam-cover,#bp999-header,#bp999-nav,#bp999-toast{display:none!important;visibility:hidden!important;pointer-events:none!important}
#bp1000-header{display:none}
html.bp1000-home #bp1000-header{display:flex}
html.bp1000-home flutter-view{
  opacity:1!important;visibility:visible!important;pointer-events:auto!important;
  clip-path:inset(calc(100% - var(--bp1000-native-nav)) 0 0 0)!important;
  -webkit-clip-path:inset(calc(100% - var(--bp1000-native-nav)) 0 0 0)!important;
}
html.bp1000-home #bp-live-home-v984{
  display:block!important;visibility:visible!important;pointer-events:auto!important;
  top:var(--bp1000-header)!important;bottom:var(--bp1000-native-nav)!important;
  z-index:2147483605!important;
}
html.bp1000-home #bp974-cosmos{
  display:block!important;visibility:visible!important;opacity:1!important;pointer-events:none!important;
  z-index:2147483604!important;clip-path:inset(var(--bp1000-header) 0 var(--bp1000-native-nav) 0)!important;
}
html.bp1000-map flutter-view,html.bp1000-map flt-glass-pane{
  opacity:0!important;visibility:hidden!important;pointer-events:none!important;clip-path:none!important;-webkit-clip-path:none!important;
}
html.bp1000-map #bp-live-home-v984,html.bp1000-map #bp974-cosmos,
html.bp1000-flutter #bp-live-home-v984,html.bp1000-flutter #bp974-cosmos,
html.bp1000-flutter #bp1000-header{
  display:none!important;visibility:hidden!important;pointer-events:none!important;
}
html.bp1000-flutter flutter-view,html.bp1000-flutter flt-glass-pane{
  opacity:1!important;visibility:visible!important;pointer-events:auto!important;clip-path:none!important;-webkit-clip-path:none!important;
}
#bp1000-header{
  position:fixed;z-index:2147483618;left:0;right:0;top:0;height:var(--bp1000-header);
  box-sizing:border-box;padding:max(8px,env(safe-area-inset-top)) 14px 8px;
  align-items:flex-end;gap:10px;background:linear-gradient(180deg,#06111f 0%,#081a2b 100%);
  border-bottom:1px solid rgba(72,225,255,.12);color:#fff;
  font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
.bp1000-brand{display:flex;align-items:center;gap:10px;min-width:0;flex:1}.bp1000-brand img{width:40px;height:40px;border-radius:11px;box-shadow:0 0 20px rgba(72,225,255,.18)}.bp1000-brand b{font-size:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.35px}.bp1000-live{display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid rgba(69,230,166,.18);border-radius:999px;background:rgba(69,230,166,.06);color:#8df2c5;font-size:9px;font-weight:1000;letter-spacing:.45px}.bp1000-live i{width:7px;height:7px;border-radius:50%;background:#45e6a6;box-shadow:0 0 12px rgba(69,230,166,.7)}
#bp1000-nav-wait{position:fixed;z-index:2147483617;left:0;right:0;bottom:0;height:var(--bp1000-native-nav);display:none;place-items:center;background:#071a2b;border-top:1px solid rgba(72,225,255,.11);color:#8aa0b3;font:800 10px/1 system-ui;pointer-events:none}
html.bp1000-home.bp1000-waiting-flutter #bp1000-nav-wait{display:grid}
@media(min-width:901px){:root{--bp1000-header:70px;--bp1000-native-nav:86px}}
`;
document.head.appendChild(style);

const header=document.createElement('header');
header.id='bp1000-header';
header.innerHTML='<div class="bp1000-brand"><img src="icons/Icon-192.png?v=1000" alt=""><b>BridgePoint Intelligence</b></div><div class="bp1000-live"><i></i>LIVE</div>';
document.body.appendChild(header);
const navWait=document.createElement('div');
navWait.id='bp1000-nav-wait';
navWait.textContent='Loading app navigation…';
document.body.appendChild(navWait);

function nativeNavPx(){return innerWidth<=900?Math.min(116,Math.max(92,Math.round(innerHeight*.105))):86;}
function syncNavCss(){document.documentElement.style.setProperty('--bp1000-native-nav',`${nativeNavPx()}px`);}
function flutterReady(){return !!document.querySelector('flutter-view');}
function syncFlutterReady(){document.documentElement.classList.toggle('bp1000-waiting-flutter',mode==='home'&&!flutterReady());}
function publish(next,reason){
  mode=next;
  const de=document.documentElement;
  de.classList.toggle('bp1000-home',next==='home');
  de.classList.toggle('bp1000-map',next==='map');
  de.classList.toggle('bp1000-flutter',FLUTTER_TABS.includes(next));
  window.__bridgepointActiveTabV1000=next;
  window.dispatchEvent(new CustomEvent('bridgepoint-shell-tab-v1000',{detail:{tab:next,reason}}));
  window.dispatchEvent(new CustomEvent('bridgepoint-shell-tab-v999',{detail:{tab:next,reason:'v1000-'+reason}}));
  window.dispatchEvent(new CustomEvent('bridgepoint-tab-v990',{detail:{tab:next,reason:'v1000-'+reason}}));
  syncFlutterReady();
}
function home(reason='home'){publish('home',reason);}
async function openMap(reason='native-nav'){
  publish('map',reason);
  try{
    if(typeof window.BridgePointOpenMapV993==='function')await window.BridgePointOpenMapV993();
    else if(typeof window.BridgePointOpenIntelligenceMapV974==='function')await window.BridgePointOpenIntelligenceMapV974();
    else throw new Error('map runtime unavailable');
  }catch(e){console.error(e);home('map-failed');}
}
function applyNativeTab(tab,reason='native-nav'){
  if(!TABS.includes(tab))return;
  if(tab==='home'){home(reason);return;}
  if(tab==='map'){void openMap(reason);return;}
  publish(tab,reason);
}
function tabFromBottomPoint(x,y){
  const h=nativeNavPx();
  if(!Number.isFinite(x)||!Number.isFinite(y)||y<innerHeight-h)return null;
  if(innerWidth<=900){
    const i=Math.max(0,Math.min(4,Math.floor(x/(innerWidth/5))));
    return TABS[i];
  }
  const w=Math.min(760,innerWidth),left=(innerWidth-w)/2;
  if(x<left||x>left+w)return null;
  const i=Math.max(0,Math.min(4,Math.floor((x-left)/(w/5))));
  return TABS[i];
}

document.addEventListener('pointerup',e=>{
  if(mode==='map')return;
  const tab=tabFromBottomPoint(e.clientX,e.clientY);
  if(!tab)return;
  setTimeout(()=>applyNativeTab(tab,'native-bottom-nav'),0);
},true);

function watchMapDialog(){
  const d=document.getElementById('bp974-map-dialog');
  if(!d||d.dataset.bp1000Watched)return;
  d.dataset.bp1000Watched='1';
  mapWasOpen=d.classList.contains('show');
  new MutationObserver(()=>{
    const open=d.classList.contains('show');
    if(mapWasOpen&&!open&&mode==='map')home('map-close');
    mapWasOpen=open;
  }).observe(d,{attributes:true,attributeFilter:['class']});
}
const bodyObserver=new MutationObserver(()=>{syncFlutterReady();watchMapDialog();});
bodyObserver.observe(document.body,{childList:true,subtree:false});
addEventListener('resize',()=>{syncNavCss();syncFlutterReady();},{passive:true});

syncNavCss();
window.BridgePointSelectedTabV984=()=>mode;
window.BridgePointShellV1000={home,openMap,applyNativeTab,getMode:()=>mode};
home('startup');
watchMapDialog();
})();