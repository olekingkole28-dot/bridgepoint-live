(()=>{
'use strict';
if(window.__bridgepointHomeFlutterSeparationV998)return;
window.__bridgepointHomeFlutterSeparationV998=true;

const css=document.createElement('style');
css.id='bp998-home-flutter-separation-style';
css.textContent=`
  :root{--bp998-header:74px;--bp998-nav:88px}
  #bp998-web-header,#bp998-web-nav{display:none}
  html.bp998-home flutter-view,html.bp998-home flt-glass-pane{
    opacity:0!important;
    pointer-events:none!important;
  }
  html.bp998-home #bp998-web-header{display:flex}
  html.bp998-home #bp998-web-nav{display:grid}
  html.bp998-home #bp-live-home-v984{
    top:var(--bp998-header)!important;
    bottom:var(--bp998-nav)!important;
    z-index:2147483608!important;
  }
  html.bp998-home #bp988-home-hard-cover{display:none!important}
  html.bp998-home #bp974-cosmos{
    display:block!important;
    visibility:visible!important;
    z-index:2147483607!important;
    clip-path:inset(var(--bp998-header) 0 var(--bp998-nav) 0)!important;
    pointer-events:none!important;
  }
  html.bp998-flutter #bp-live-home-v984,
  html.bp998-flutter #bp974-cosmos,
  html.bp998-flutter #bp988-home-hard-cover{
    display:none!important;
    visibility:hidden!important;
    pointer-events:none!important;
  }
  html.bp998-flutter flutter-view,html.bp998-flutter flt-glass-pane{
    opacity:1!important;
    pointer-events:auto!important;
  }
  #bp998-web-header{
    position:fixed;z-index:2147483618;left:0;right:0;top:0;height:var(--bp998-header);
    padding:max(8px,env(safe-area-inset-top)) 16px 8px;box-sizing:border-box;
    align-items:flex-end;gap:10px;background:linear-gradient(180deg,#061524 0%,#081c2e 100%);
    border-bottom:1px solid rgba(72,225,255,.12);color:#fff;font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  }
  .bp998-brand{display:flex;align-items:center;gap:10px;min-width:0;flex:1}
  .bp998-brand img{width:40px;height:40px;border-radius:11px;box-shadow:0 0 20px rgba(72,225,255,.18)}
  .bp998-brand b{font-size:20px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.4px}
  .bp998-head-actions{display:flex;gap:9px;align-items:center}
  .bp998-head-chip{width:34px;height:34px;border:0;border-radius:11px;background:rgba(255,255,255,.035);color:#dce9f4;font-size:17px;display:grid;place-items:center}
  #bp998-web-nav{
    position:fixed;z-index:2147483619;left:0;right:0;bottom:0;height:var(--bp998-nav);
    grid-template-columns:repeat(5,1fr);padding:8px 8px max(8px,env(safe-area-inset-bottom));box-sizing:border-box;
    background:#071a2b;border-top:1px solid rgba(72,225,255,.10);box-shadow:0 -10px 34px rgba(0,0,0,.24);
    font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  }
  .bp998-tab{border:0;background:transparent;color:#aab8c8;display:grid;place-items:center;align-content:center;gap:5px;border-radius:16px;font-weight:850;font-size:11px;min-width:0}
  .bp998-tab .i{font-size:22px;line-height:1}.bp998-tab.active{color:#fff;background:linear-gradient(145deg,rgba(80,124,255,.28),rgba(32,91,177,.30))}.bp998-tab.active .i{color:#50ddff}
  @media(min-width:901px){:root{--bp998-header:72px;--bp998-nav:78px}#bp998-web-nav{max-width:760px;left:50%;transform:translateX(-50%);border-radius:22px 22px 0 0}}
`;
document.head.appendChild(css);

const header=document.createElement('header');
header.id='bp998-web-header';
header.innerHTML=`<div class="bp998-brand"><img src="icons/Icon-192.png" alt=""><b>BridgePoint Intelligence</b></div><div class="bp998-head-actions"><button class="bp998-head-chip" aria-label="Search">⌕</button><button class="bp998-head-chip" aria-label="Notifications">♢</button><button class="bp998-head-chip" aria-label="Intelligence">✦</button></div>`;
document.body.appendChild(header);

const nav=document.createElement('nav');
nav.id='bp998-web-nav';
nav.setAttribute('aria-label','BridgePoint navigation');
nav.innerHTML=`
<button class="bp998-tab active" data-tab="home"><span class="i">▦</span><span>Home</span></button>
<button class="bp998-tab" data-tab="map"><span class="i">◉</span><span>Map</span></button>
<button class="bp998-tab" data-tab="properties"><span class="i">⌂</span><span>Properties</span></button>
<button class="bp998-tab" data-tab="worth"><span class="i">⌁</span><span>Worth</span></button>
<button class="bp998-tab" data-tab="more"><span class="i">▦</span><span>More</span></button>`;
document.body.appendChild(nav);

let mode='home',transitioning=false;
function entryOpen(){return document.getElementById('bp984-entry')?.classList.contains('show')===true;}
function mapOpen(){return document.getElementById('bp974-map-dialog')?.classList.contains('show')===true;}
function activeButton(tab){for(const b of nav.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===tab);}
function setHome(reason='home'){
  mode='home';transitioning=false;
  document.documentElement.classList.add('bp998-home');
  document.documentElement.classList.remove('bp998-flutter');
  activeButton('home');
  window.__bridgepointActiveTabV990='home';
  window.dispatchEvent(new CustomEvent('bridgepoint-home-owned-v998',{detail:{reason}}));
}
function setFlutter(tab){
  mode=tab;transitioning=false;
  document.documentElement.classList.remove('bp998-home');
  document.documentElement.classList.add('bp998-flutter');
  activeButton(tab);
}
async function openMap(){
  setHome('map-base');activeButton('map');
  try{
    if(typeof window.BridgePointOpenMapV993==='function')await window.BridgePointOpenMapV993();
    else if(typeof window.BridgePointOpenIntelligenceMapV974==='function')window.BridgePointOpenIntelligenceMapV974();
  }catch(e){console.error(e);}
}
function navigateFlutter(tab){
  if(transitioning)return;transitioning=true;
  let tries=0;
  const go=()=>{
    tries++;
    let ok=false;
    try{ok=window.BridgePointNavigateFlutterTabV984?.(tab)===true;}catch(_){ }
    if(ok){setTimeout(()=>setFlutter(tab),70);return;}
    if(tries<25){setTimeout(go,100);return;}
    transitioning=false;
    setHome('navigation-failed');
  };
  go();
}
nav.addEventListener('click',e=>{
  const b=e.target.closest('[data-tab]');if(!b)return;
  const tab=b.dataset.tab;
  if(tab==='home'){setHome('web-nav');return;}
  if(tab==='map'){openMap();return;}
  navigateFlutter(tab);
});

for(const b of header.querySelectorAll('button'))b.addEventListener('click',e=>e.preventDefault());

addEventListener('bridgepoint-tab-v990',e=>{
  const tab=e?.detail?.tab;
  if(tab==='home')setHome('flutter-home');
  else if(tab==='map'){setHome('flutter-map-base');activeButton('map');}
  else if(['properties','worth','more'].includes(tab))setFlutter(tab);
});
addEventListener('bridgepoint-tab-v984',e=>{
  const raw=String(e?.detail?.tab||'').toLowerCase();
  const tab=raw==='investor'?'worth':raw==='work'||raw==='plans'?'more':raw;
  if(tab==='home')setHome('flutter-home-v984');
});

function syncChrome(){
  const hide=entryOpen()||mapOpen();
  header.style.setProperty('visibility',hide?'hidden':'visible','important');
  header.style.setProperty('pointer-events',hide?'none':'auto','important');
  nav.style.setProperty('visibility',hide?'hidden':'visible','important');
  nav.style.setProperty('pointer-events',hide?'none':'auto','important');
  if(mode==='home'){
    const fv=document.querySelector('flutter-view');
    if(fv){fv.style.setProperty('opacity','0','important');fv.style.setProperty('pointer-events','none','important');}
    const gp=document.querySelector('flt-glass-pane');
    if(gp){gp.style.setProperty('opacity','0','important');gp.style.setProperty('pointer-events','none','important');}
  }
}

setHome('startup');
syncChrome();
new MutationObserver(syncChrome).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style']});
setInterval(syncChrome,350);
})();
