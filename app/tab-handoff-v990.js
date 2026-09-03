(()=>{
'use strict';
if(window.__bridgepointTabHandoffV990)return;
window.__bridgepointTabHandoffV990=true;

const TABS=['home','map','properties','worth','more'];
let active='home';
let mapWasOpen=false;
const originalSelected=window.BridgePointSelectedTabV984;

const css=document.createElement('style');
css.id='bp990-tab-handoff-style';
css.textContent=`
  html.bp990-home #bp-live-home-v984{display:block!important}
  html.bp990-home #bp988-home-hard-cover{display:block!important}
  html.bp990-home #bp974-cosmos{display:block!important;visibility:visible!important}
  html.bp990-nonhome #bp-live-home-v984{display:none!important;visibility:hidden!important;pointer-events:none!important}
  html.bp990-nonhome #bp988-home-hard-cover{display:none!important;visibility:hidden!important}
  html.bp990-nonhome #bp974-cosmos{display:none!important;visibility:hidden!important;pointer-events:none!important}
`;
document.head.appendChild(css);

function semanticText(el){
  return `${el?.getAttribute?.('aria-label')||''} ${el?.textContent||''}`.replace(/\s+/g,' ').trim().toLowerCase();
}
function normalize(s){
  s=String(s||'').toLowerCase().trim();
  if(s.startsWith('home'))return'home';
  if(s.startsWith('map'))return'map';
  if(s.startsWith('properties')||s.startsWith('property'))return'properties';
  if(s.startsWith('worth')||s.startsWith('investor'))return'worth';
  if(s.startsWith('more')||s.startsWith('plans')||s.startsWith('work'))return'more';
  return null;
}
function tabAtPoint(x,y){
  if(!Number.isFinite(x)||!Number.isFinite(y))return null;
  const nodes=[...document.querySelectorAll('flt-semantics,[aria-label]')];
  for(const el of nodes){
    const r=el.getBoundingClientRect?.();
    if(!r||r.width<12||r.height<12||r.top<innerHeight*.68)continue;
    if(x<r.left||x>r.right||y<r.top||y>r.bottom)continue;
    const hit=normalize(semanticText(el));
    if(hit)return hit;
  }
  // Mobile fallback: BridgePoint uses five equal bottom-nav destinations.
  if(innerWidth<=900&&y>innerHeight-170){
    const i=Math.max(0,Math.min(4,Math.floor(x/(innerWidth/5))));
    return TABS[i];
  }
  return null;
}
function apply(tab,reason='unknown'){
  tab=normalize(tab)||tab;
  if(!TABS.includes(tab))return;
  active=tab;
  window.__bridgepointActiveTabV990=tab;
  document.documentElement.classList.toggle('bp990-home',tab==='home');
  document.documentElement.classList.toggle('bp990-nonhome',tab!=='home');
  window.dispatchEvent(new CustomEvent('bridgepoint-tab-v990',{detail:{tab,reason}}));

  if(tab==='map'){
    setTimeout(()=>{
      if(active!=='map')return;
      if(typeof window.BridgePointOpenIntelligenceMapV974==='function'){
        window.BridgePointOpenIntelligenceMapV974();
      }
    },90);
  }
}

// Make the existing live Home read this explicit tab state instead of unreliable Flutter aria-selected state.
window.BridgePointSelectedTabV984=()=>window.__bridgepointActiveTabV990||(typeof originalSelected==='function'?originalSelected():null);
window.BridgePointApplyTabV990=apply;

function handlePointer(e){
  const tab=tabAtPoint(e.clientX,e.clientY);
  if(!tab)return;
  // Never cancel or stop the Flutter tap. Let Flutter switch normally first.
  setTimeout(()=>apply(tab,'bottom-nav-tap'),0);
}
document.addEventListener('pointerup',handlePointer,true);
document.addEventListener('click',e=>{
  if(e.detail===0)return;
  const tab=tabAtPoint(e.clientX,e.clientY);
  if(tab)setTimeout(()=>apply(tab,'bottom-nav-click'),0);
},true);

// If semantics do expose a selected destination, use it as a secondary signal only.
function pollSelected(){
  const nodes=[...document.querySelectorAll('flt-semantics,[aria-label]')];
  for(const el of nodes){
    const r=el.getBoundingClientRect?.();
    if(!r||r.top<innerHeight*.68)continue;
    if(el.getAttribute('aria-selected')!=='true'&&el.getAttribute('aria-current')!=='page')continue;
    const tab=normalize(semanticText(el));
    if(tab&&tab!==active){apply(tab,'semantic-selected');return;}
  }
}

// Closing the full-screen radar map returns to Home instead of exposing the old compiled map underneath.
function watchMap(){
  const d=document.getElementById('bp974-map-dialog');
  const open=d?.classList.contains('show')===true;
  if(mapWasOpen&&!open&&active==='map'){
    try{window.BridgePointNavigateFlutterTabV984?.('home');}catch(_){ }
    apply('home','map-close');
  }
  mapWasOpen=open;
}

apply('home','startup');
setInterval(()=>{pollSelected();watchMap();},180);
})();
