(()=>{
'use strict';
if(window.__bridgepointSingleShellV1040)return;
window.__bridgepointSingleShellV1040=true;

const PROJECT='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const NAVH=88;
let active='home';
let offer=null;
let offerTimer=null;

const de=document.documentElement;
de.style.setProperty('--bp1040-nav-height',`${NAVH}px`);
de.classList.add('bp1040-shell','bp1040-home');

const style=document.createElement('style');
style.id='bp1040-single-shell-style';
style.textContent=`
:root{--bp1040-nav-height:88px}
#bp1036-commerce-tab,#bp1000-nav-wait,#bp1037-home-seam-guard,#bp984-home-mask,#bp988-home-hard-cover,#bp994-nav-seam-cover,#bp999-nav,#bp998-web-nav{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
#bp1040-nav{position:fixed;z-index:2147483635;left:0;right:0;bottom:0;height:calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom));padding:7px 8px max(8px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;background:linear-gradient(180deg,#08182a 0%,#071626 100%);border-top:1px solid rgba(72,225,255,.15);box-shadow:0 -12px 36px rgba(0,0,0,.38);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.bp1040-tab{appearance:none;border:0;border-radius:14px;background:transparent;color:#aebed0;display:grid;place-items:center;align-content:center;gap:4px;font-weight:900;font-size:11px;min-width:0;cursor:pointer}.bp1040-tab .ico{width:39px;height:30px;border-radius:12px;display:grid;place-items:center;font-size:20px;color:#b6c8d8}.bp1040-tab.active{color:#fff}.bp1040-tab.active .ico{background:rgba(72,225,255,.14);color:#56e5ff;box-shadow:inset 0 0 0 1px rgba(72,225,255,.14)}.bp1040-tab[data-tab="plans"] .ico{color:#ffc95e}.bp1040-tab[data-tab="plans"].active .ico{background:rgba(255,201,94,.12);color:#ffd77e;box-shadow:inset 0 0 0 1px rgba(255,201,94,.2)}
html.bp1040-home flutter-view,html.bp1040-home flt-glass-pane,html.bp1040-plans flutter-view,html.bp1040-plans flt-glass-pane,html.bp1040-map flutter-view,html.bp1040-map flt-glass-pane{opacity:0!important;pointer-events:none!important;clip-path:none!important;-webkit-clip-path:none!important}
html.bp1040-home #bp-live-home-v984{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;top:var(--bp1000-header,72px)!important;bottom:calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom))!important;z-index:2147483605!important}
html.bp1040-home #bp974-cosmos{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:none!important;clip-path:inset(var(--bp1000-header,72px) 0 calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom)) 0)!important}
html.bp1040-flutter #bp-live-home-v984,html.bp1040-flutter #bp974-cosmos,html.bp1040-plans #bp-live-home-v984,html.bp1040-plans #bp974-cosmos,html.bp1040-map #bp-live-home-v984,html.bp1040-map #bp974-cosmos{display:none!important;visibility:hidden!important;pointer-events:none!important}
html.bp1040-flutter flutter-view,html.bp1040-flutter flt-glass-pane{opacity:1!important;visibility:visible!important;pointer-events:auto!important;clip-path:inset(0 0 calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom)) 0)!important;-webkit-clip-path:inset(0 0 calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom)) 0)!important}
#bp974-map-dialog{bottom:calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom))!important;z-index:2147483632!important}
#bp1036-plans-dialog{bottom:calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom))!important;z-index:2147483631!important;background:#06101c!important}
#bp1036-plans-dialog .bp1036-shell{margin-bottom:18px!important}
.bp1040-card-offer{margin:8px 0 10px;padding:8px 9px;border-radius:10px;border:1px solid rgba(255,201,94,.25);background:rgba(255,201,94,.08);color:#ffd77e;font-size:10px;font-weight:900;line-height:1.25}
@media(max-width:700px){:root{--bp1040-nav-height:84px}.bp1040-tab{font-size:10.5px}.bp1040-tab .ico{height:28px;font-size:19px}}
`;
document.head.appendChild(style);

const nav=document.createElement('nav');
nav.id='bp1040-nav';
nav.setAttribute('aria-label','Primary navigation');
nav.innerHTML=`
<button class="bp1040-tab active" data-tab="home" type="button"><span class="ico">▦</span><span>Home</span></button>
<button class="bp1040-tab" data-tab="map" type="button"><span class="ico">◉</span><span>Map</span></button>
<button class="bp1040-tab" data-tab="plans" type="button"><span class="ico">★</span><span>Plans</span></button>
<button class="bp1040-tab" data-tab="properties" type="button"><span class="ico">⌂</span><span>Properties</span></button>
<button class="bp1040-tab" data-tab="more" type="button"><span class="ico">▦</span><span>More</span></button>`;
document.body.appendChild(nav);

function removeLegacyControls(){
  document.getElementById('bp1036-commerce-tab')?.remove();
  document.getElementById('bp1000-nav-wait')?.remove();
  document.getElementById('bp1037-home-seam-guard')?.remove();
}

function setClasses(tab){
  active=tab;
  for(const c of ['bp1040-home','bp1040-map','bp1040-plans','bp1040-flutter'])de.classList.remove(c);
  if(tab==='home')de.classList.add('bp1040-home');
  else if(tab==='map')de.classList.add('bp1040-map');
  else if(tab==='plans')de.classList.add('bp1040-plans');
  else de.classList.add('bp1040-flutter');
  nav.querySelectorAll('.bp1040-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));
  window.__bridgepointActiveTabV1040=tab;
  window.dispatchEvent(new CustomEvent('bridgepoint-tab-v1040',{detail:{tab}}));
}

function closePlans(){document.getElementById('bp1036-plans-dialog')?.classList.remove('show');}
function closeMap(){document.getElementById('bp974-map-dialog')?.classList.remove('show');}
function showHome(){closePlans();closeMap();setClasses('home');try{window.BridgePointShellV1000?.home?.('v1040-home');}catch(_){} }

function flutterNav(label,tries=0){
  let ok=false;
  try{ok=window.BridgePointNavigateFlutterTabV984?.(label)===true;}catch(_){}
  if(ok)return;
  if(tries<20)setTimeout(()=>flutterNav(label,tries+1),120);
}

async function showMap(){closePlans();setClasses('map');try{if(typeof window.BridgePointOpenMapV993==='function')await window.BridgePointOpenMapV993();else await window.BridgePointOpenIntelligenceMapV974?.();}catch(e){console.error(e);showHome();}}
async function showPlans(){closeMap();setClasses('plans');try{await window.BridgePointOpenPlansV1036?.();}catch(e){console.error(e);}setTimeout(syncOfferCards,40);}
function showProperties(){closePlans();closeMap();setClasses('properties');flutterNav('properties');}
function showMore(){closePlans();closeMap();setClasses('more');let ok=false;try{ok=window.BridgePointNavigateFlutterTabV984?.('more')===true;}catch(_){}if(!ok)flutterNav('work');}

nav.querySelector('[data-tab="home"]').onclick=showHome;
nav.querySelector('[data-tab="map"]').onclick=showMap;
nav.querySelector('[data-tab="plans"]').onclick=showPlans;
nav.querySelector('[data-tab="properties"]').onclick=showProperties;
nav.querySelector('[data-tab="more"]').onclick=showMore;

async function loadOffer(){
  try{
    const r=await fetch(`${PROJECT}/rest/v1/rpc/bridgepoint_public_launch_promotion_v1035`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json','Cache-Control':'no-cache'},body:'{}',cache:'no-store'});
    if(r.ok)offer=await r.json();
  }catch(_){}
  syncOfferCards();
}
function syncOfferCards(){
  removeLegacyControls();
  const cards=[...document.querySelectorAll('#bp1036-plans-dialog .bp1036-card')];
  for(const card of cards){
    let badge=card.querySelector('.bp1040-card-offer');
    if(!badge){badge=document.createElement('div');badge.className='bp1040-card-offer';const price=card.querySelector('.price');price?.insertAdjacentElement('afterend',badge);}
    if(offer?.active){
      const left=Math.max(0,Number(offer.remaining_spots||0));
      const pct=Number(offer.percent_off||50);
      const months=Number(offer.duration_months||6);
      const trial=Number(offer.trial_days||7);
      badge.textContent=left>0?`${left} founding spots left • ${pct}% off for ${months} paid months after the ${trial}-day trial`:`Founding spots filled • standard pricing applies`;
      badge.style.display='block';
    }else badge.style.display='none';
  }
}

const observer=new MutationObserver(()=>{removeLegacyControls();syncOfferCards();});
observer.observe(document.documentElement,{childList:true,subtree:true});
removeLegacyControls();
loadOffer();
offerTimer=setInterval(loadOffer,20000);
window.addEventListener('focus',loadOffer,{passive:true});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadOffer();});

// Make Home visibility logic read the single shell state, not stale Flutter selection.
window.BridgePointSelectedTabV984=()=>active;
window.BridgePointSingleShellV1040={showHome,showMap,showPlans,showProperties,showMore,getActive:()=>active};
showHome();
})();
