(()=>{
'use strict';
if(window.__bridgepointShellV999)return;
window.__bridgepointShellV999=true;

const TABS=['home','map','properties','worth','more'];
const FLUTTER_TABS=['properties','worth','more'];
const staleIds=['bp998-web-header','bp998-web-nav','bp988-home-hard-cover','bp994-nav-seam-cover'];
const staleStyles=['bp990-tab-handoff-style','bp997-nav-boundary-style','bp998-home-flutter-separation-style','bp988-home-hard-cover-style','bp994-nav-seam-cover-style'];
for(const id of staleIds)document.getElementById(id)?.remove();
for(const id of staleStyles)document.getElementById(id)?.remove();

const style=document.createElement('style');
style.id='bp999-shell-style';
style.textContent=`
:root{--bp999-header:72px;--bp999-nav:84px}
#bp984-home-mask,#bp988-home-hard-cover,#bp994-nav-seam-cover{display:none!important;visibility:hidden!important;pointer-events:none!important}
#bp999-header,#bp999-nav{display:none}
html.bp999-home flutter-view,html.bp999-home flt-glass-pane,
html.bp999-map flutter-view,html.bp999-map flt-glass-pane{
  opacity:0!important;pointer-events:none!important;
}
html.bp999-home #bp999-header{display:flex}
html.bp999-home #bp999-nav{display:grid}
html.bp999-home #bp-live-home-v984{
  display:block!important;visibility:visible!important;pointer-events:auto!important;
  top:var(--bp999-header)!important;bottom:var(--bp999-nav)!important;
  z-index:2147483605!important;
}
html.bp999-home #bp974-cosmos{
  display:block!important;visibility:visible!important;opacity:1!important;pointer-events:none!important;
  z-index:2147483604!important;clip-path:inset(var(--bp999-header) 0 var(--bp999-nav) 0)!important;
}
html.bp999-map #bp-live-home-v984,
html.bp999-map #bp974-cosmos,
html.bp999-flutter #bp-live-home-v984,
html.bp999-flutter #bp974-cosmos{
  display:none!important;visibility:hidden!important;pointer-events:none!important;
}
html.bp999-flutter flutter-view,html.bp999-flutter flt-glass-pane{
  opacity:1!important;pointer-events:auto!important;
}
#bp999-header{
  position:fixed;z-index:2147483618;left:0;right:0;top:0;height:var(--bp999-header);
  box-sizing:border-box;padding:max(8px,env(safe-area-inset-top)) 14px 8px;
  align-items:flex-end;gap:10px;background:linear-gradient(180deg,#06111f 0%,#081a2b 100%);
  border-bottom:1px solid rgba(72,225,255,.12);color:#fff;
  font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
.bp999-brand{display:flex;align-items:center;gap:10px;min-width:0;flex:1}.bp999-brand img{width:40px;height:40px;border-radius:11px;box-shadow:0 0 20px rgba(72,225,255,.18)}.bp999-brand b{font-size:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;letter-spacing:-.35px}.bp999-live{display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid rgba(69,230,166,.18);border-radius:999px;background:rgba(69,230,166,.06);color:#8df2c5;font-size:9px;font-weight:1000;letter-spacing:.45px}.bp999-live i{width:7px;height:7px;border-radius:50%;background:#45e6a6;box-shadow:0 0 12px rgba(69,230,166,.7)}
#bp999-nav{
  position:fixed;z-index:2147483619;left:0;right:0;bottom:0;height:var(--bp999-nav);
  grid-template-columns:repeat(5,minmax(0,1fr));box-sizing:border-box;
  padding:7px 7px max(8px,env(safe-area-inset-bottom));
  background:#071a2b;border-top:1px solid rgba(72,225,255,.11);box-shadow:0 -10px 34px rgba(0,0,0,.28);
  font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
}
.bp999-tab{appearance:none;border:0;background:transparent;color:#93a7b9;display:grid;place-items:center;align-content:center;gap:4px;border-radius:15px;font-weight:850;font-size:10.5px;min-width:0;touch-action:manipulation;cursor:pointer}.bp999-tab svg{width:22px;height:22px;display:block}.bp999-tab.active{color:#fff;background:linear-gradient(145deg,rgba(80,124,255,.26),rgba(32,91,177,.28))}.bp999-tab.active svg{color:#54dcff}.bp999-tab:active{transform:scale(.97)}
#bp999-toast{position:fixed;z-index:2147483622;left:50%;bottom:calc(var(--bp999-nav) + 12px);transform:translateX(-50%) translateY(8px);opacity:0;pointer-events:none;transition:.18s ease;padding:9px 12px;border:1px solid rgba(72,225,255,.18);border-radius:11px;background:rgba(5,18,32,.96);color:#dceaf5;font:800 10px/1.2 system-ui;box-shadow:0 12px 36px rgba(0,0,0,.35);white-space:nowrap}#bp999-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
@media(min-width:901px){:root{--bp999-header:70px;--bp999-nav:78px}#bp999-nav{max-width:760px;left:50%;right:auto;width:min(760px,100%);transform:translateX(-50%);border-radius:22px 22px 0 0}}
`;
document.head.appendChild(style);

const icon=(name)=>({
 home:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></svg>',
 map:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 6.5 8.5 4 15.5 6.5 21 4v13.5L15.5 20l-7-2.5L3 20z"/><path d="M8.5 4v13.5M15.5 6.5V20"/></svg>',
 properties:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m3 11 9-7 9 7"/><path d="M5.5 9.5V20h13V9.5M9.5 20v-6h5v6"/></svg>',
 worth:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 18V9M10 18V5M16 18v-7M22 18V3"/><path d="M2 20h20"/></svg>',
 more:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>'
}[name]);

const header=document.createElement('header');
header.id='bp999-header';
header.innerHTML='<div class="bp999-brand"><img src="icons/Icon-192.png" alt=""><b>BridgePoint Intelligence</b></div><div class="bp999-live"><i></i>LIVE</div>';
document.body.appendChild(header);

const nav=document.createElement('nav');
nav.id='bp999-nav';
nav.setAttribute('aria-label','BridgePoint navigation');
nav.innerHTML=TABS.map(t=>`<button class="bp999-tab${t==='home'?' active':''}" type="button" data-tab="${t}" aria-label="${t[0].toUpperCase()+t.slice(1)}">${icon(t)}<span>${t[0].toUpperCase()+t.slice(1)}</span></button>`).join('');
document.body.appendChild(nav);
const toast=document.createElement('div');toast.id='bp999-toast';document.body.appendChild(toast);

let mode='home';
let transitionToken=0;
let toastTimer=null;
const normalize=(s)=>{s=String(s||'').toLowerCase().trim();if(s.startsWith('home'))return'home';if(s.startsWith('map'))return'map';if(s.startsWith('propert'))return'properties';if(s.startsWith('worth')||s.startsWith('investor'))return'worth';if(s.startsWith('more')||s.startsWith('work')||s.startsWith('plans'))return'more';return null;};
const semanticText=(el)=>`${el?.getAttribute?.('aria-label')||''} ${el?.textContent||''}`.replace(/\s+/g,' ').trim().toLowerCase();
const flutterNodes=()=>[...document.querySelectorAll('flt-semantics,[aria-label]')].filter(el=>el.closest?.('flutter-view,flt-glass-pane')||el.tagName?.toLowerCase()==='flt-semantics');
function showToast(msg,ms=1600){toast.textContent=msg;toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove('show'),ms);}
function setClasses(next){
  const de=document.documentElement;
  de.classList.toggle('bp999-home',next==='home');
  de.classList.toggle('bp999-map',next==='map');
  de.classList.toggle('bp999-flutter',FLUTTER_TABS.includes(next));
  for(const b of nav.querySelectorAll('[data-tab]'))b.classList.toggle('active',b.dataset.tab===next);
}
function publish(next,reason){
  mode=next;
  window.__bridgepointActiveTabV999=next;
  setClasses(next);
  window.dispatchEvent(new CustomEvent('bridgepoint-shell-tab-v999',{detail:{tab:next,reason}}));
  window.dispatchEvent(new CustomEvent('bridgepoint-tab-v990',{detail:{tab:next,reason:'v999-'+reason}}));
}
function home(reason='home'){
  transitionToken++;
  publish('home',reason);
}
function semanticFor(tab){
  const aliases=tab==='worth'?['worth','investor']:tab==='more'?['more','work','plans']:[tab];
  const matches=[];
  for(const el of flutterNodes()){
    const name=normalize(semanticText(el));
    if(!name||!aliases.some(a=>name===normalize(a)))continue;
    const r=el.getBoundingClientRect?.();
    const score=(r&&Number.isFinite(r.top)?r.top:0)+(r&&r.bottom>=innerHeight*.80?5000:0);
    matches.push({el,score});
  }
  matches.sort((a,b)=>b.score-a.score);
  return matches[0]?.el||null;
}
async function navigateFlutter(tab){
  const token=++transitionToken;
  showToast(`Opening ${tab[0].toUpperCase()+tab.slice(1)}…`,1200);
  for(let i=0;i<24&&token===transitionToken;i++){
    let ok=false;
    try{ok=window.BridgePointNavigateFlutterTabV984?.(tab)===true;}catch(_){ }
    if(!ok){
      const el=semanticFor(tab);
      if(el){try{el.click?.();ok=true;}catch(_){ }}
    }
    if(ok){
      await new Promise(r=>setTimeout(r,110));
      if(token!==transitionToken)return;
      publish(tab,'web-nav');
      return;
    }
    await new Promise(r=>setTimeout(r,70));
  }
  if(token===transitionToken){
    showToast(`Could not open ${tab}. Try again.`,2200);
    home('navigation-failed');
  }
}
async function openMap(reason='web-nav'){
  const token=++transitionToken;
  publish('map',reason);
  showToast('Opening live intelligence map…',1200);
  try{
    if(typeof window.BridgePointOpenMapV993==='function')await window.BridgePointOpenMapV993();
    else if(typeof window.BridgePointOpenIntelligenceMapV974==='function')window.BridgePointOpenIntelligenceMapV974();
    else throw new Error('map runtime unavailable');
  }catch(e){
    console.error(e);
    if(token===transitionToken){showToast('Map could not open. Home restored.',2200);home('map-failed');}
  }
}

nav.addEventListener('click',e=>{
  const b=e.target.closest('[data-tab]');if(!b)return;
  const tab=b.dataset.tab;
  if(tab==='home')home('web-nav');
  else if(tab==='map')openMap('web-nav');
  else navigateFlutter(tab);
});

function selectedFromMutation(target){
  if(!(target instanceof Element))return null;
  if(target.getAttribute('aria-selected')!=='true'&&target.getAttribute('aria-current')!=='page')return null;
  return normalize(semanticText(target));
}
const semanticObserver=new MutationObserver(records=>{
  if(mode==='home'||mode==='map')return;
  for(const rec of records){
    const tab=selectedFromMutation(rec.target);
    if(!tab)continue;
    if(tab==='home'){home('flutter-nav');return;}
    if(tab==='map'){openMap('flutter-nav');return;}
    if(FLUTTER_TABS.includes(tab)&&tab!==mode){publish(tab,'flutter-nav');return;}
  }
});
semanticObserver.observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['aria-selected','aria-current']});

// One non-blocking pointer observer is used only while Flutter is visible. It never prevents the native tap.
document.addEventListener('pointerup',e=>{
  if(!FLUTTER_TABS.includes(mode))return;
  const path=e.composedPath?.()||[];
  for(const el of path){
    if(!(el instanceof Element))continue;
    const tab=normalize(semanticText(el));
    if(!tab)continue;
    if(tab==='home'){setTimeout(()=>home('flutter-pointer'),0);return;}
    if(tab==='map'){setTimeout(()=>openMap('flutter-pointer'),0);return;}
    if(FLUTTER_TABS.includes(tab)){setTimeout(()=>publish(tab,'flutter-pointer'),0);return;}
  }
},true);

function watchMapDialog(){
  const d=document.getElementById('bp974-map-dialog');
  if(!d||d.dataset.bp999Watched)return;
  d.dataset.bp999Watched='1';
  let wasOpen=d.classList.contains('show');
  new MutationObserver(()=>{
    const open=d.classList.contains('show');
    if(wasOpen&&!open&&mode==='map')home('map-close');
    wasOpen=open;
  }).observe(d,{attributes:true,attributeFilter:['class']});
}
const bodyObserver=new MutationObserver(watchMapDialog);
bodyObserver.observe(document.body,{childList:true,subtree:false});
watchMapDialog();

window.BridgePointSelectedTabV984=()=>mode;
window.BridgePointShellV999={home,openMap,navigateFlutter,getMode:()=>mode};
home('startup');
})();
