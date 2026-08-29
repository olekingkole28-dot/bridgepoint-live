(()=>{
'use strict';
if(window.__bridgepointSingleShellV1040)return;
window.__bridgepointSingleShellV1040=true;
const PROJECT='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
let active='home',offer=null;
const de=document.documentElement;
de.style.setProperty('--bp1040-nav-height','88px');
de.style.setProperty('--bp1040-header-height','72px');
de.classList.add('bp1040-shell','bp1040-home');

const style=document.createElement('style');
style.id='bp1040-single-shell-style';
style.textContent=`
:root{--bp1040-nav-height:88px;--bp1040-header-height:72px}
#bp1036-commerce-tab,#bp1000-nav-wait,#bp1037-home-seam-guard,#bp984-home-mask,#bp988-home-hard-cover,#bp994-nav-seam-cover,#bp999-nav,#bp998-web-nav,#bp999-header,#bp998-web-header{display:none!important;visibility:hidden!important;opacity:0!important;pointer-events:none!important}
#bp1040-header{position:fixed;z-index:2147483618;left:0;right:0;top:0;height:var(--bp1040-header-height);display:none;box-sizing:border-box;padding:max(8px,env(safe-area-inset-top)) 14px 8px;align-items:flex-end;gap:10px;background:linear-gradient(180deg,#06111f,#081a2b);border-bottom:1px solid rgba(72,225,255,.12);color:#fff;font:800 14px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
html.bp1040-home #bp1040-header{display:flex}.bp1040-brand{display:flex;align-items:center;gap:10px;min-width:0;flex:1}.bp1040-brand img{width:40px;height:40px;border-radius:11px}.bp1040-brand b{font-size:19px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.bp1040-live{display:flex;align-items:center;gap:6px;padding:8px 10px;border:1px solid rgba(69,230,166,.18);border-radius:999px;background:rgba(69,230,166,.06);color:#8df2c5;font-size:9px;font-weight:1000}.bp1040-live i{width:7px;height:7px;border-radius:50%;background:#45e6a6;box-shadow:0 0 12px rgba(69,230,166,.7)}
#bp1040-nav{position:fixed;z-index:2147483635;left:0;right:0;bottom:0;height:calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom));padding:7px 8px max(8px,env(safe-area-inset-bottom));display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:4px;background:linear-gradient(180deg,#08182a,#071626);border-top:1px solid rgba(72,225,255,.15);box-shadow:0 -12px 36px rgba(0,0,0,.38);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
.bp1040-tab{appearance:none;border:0;border-radius:14px;background:transparent;color:#aebed0;display:grid;place-items:center;align-content:center;gap:4px;font-weight:900;font-size:11px;min-width:0;cursor:pointer}.bp1040-tab .ico{width:39px;height:30px;border-radius:12px;display:grid;place-items:center;font-size:20px;color:#b6c8d8}.bp1040-tab.active{color:#fff}.bp1040-tab.active .ico{background:rgba(72,225,255,.14);color:#56e5ff;box-shadow:inset 0 0 0 1px rgba(72,225,255,.14)}.bp1040-tab[data-tab="plans"] .ico{color:#ffc95e}.bp1040-tab[data-tab="plans"].active .ico{background:rgba(255,201,94,.12);color:#ffd77e;box-shadow:inset 0 0 0 1px rgba(255,201,94,.2)}
html.bp1040-home flutter-view,html.bp1040-home flt-glass-pane,html.bp1040-plans flutter-view,html.bp1040-plans flt-glass-pane,html.bp1040-map flutter-view,html.bp1040-map flt-glass-pane{opacity:0!important;pointer-events:none!important;clip-path:none!important;-webkit-clip-path:none!important}
html.bp1040-home #bp-live-home-v984{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important;top:var(--bp1040-header-height)!important;bottom:calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom))!important;z-index:2147483605!important}
html.bp1040-home #bp974-cosmos{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:none!important;clip-path:inset(var(--bp1040-header-height) 0 calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom)) 0)!important}
html.bp1040-flutter #bp-live-home-v984,html.bp1040-flutter #bp974-cosmos,html.bp1040-plans #bp-live-home-v984,html.bp1040-plans #bp974-cosmos,html.bp1040-map #bp-live-home-v984,html.bp1040-map #bp974-cosmos{display:none!important;visibility:hidden!important;pointer-events:none!important}
html.bp1040-flutter flutter-view,html.bp1040-flutter flt-glass-pane{opacity:1!important;visibility:visible!important;pointer-events:auto!important;clip-path:inset(0 0 calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom)) 0)!important;-webkit-clip-path:inset(0 0 calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom)) 0)!important}
#bp974-map-dialog{bottom:calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom))!important;z-index:2147483632!important}
#bp1036-plans-dialog{bottom:calc(var(--bp1040-nav-height) + env(safe-area-inset-bottom))!important;z-index:2147483631!important;background:#06101c!important}
#bp1036-plans-dialog .bp1036-shell{margin-bottom:18px!important}.bp1040-card-offer{margin:8px 0 10px;padding:8px 9px;border-radius:10px;border:1px solid rgba(255,201,94,.25);background:rgba(255,201,94,.08);color:#ffd77e;font-size:10px;font-weight:900;line-height:1.25}
@media(max-width:700px){:root{--bp1040-nav-height:84px}.bp1040-tab{font-size:10.5px}.bp1040-tab .ico{height:28px;font-size:19px}}
`;
document.head.appendChild(style);

const header=document.createElement('header');header.id='bp1040-header';header.innerHTML='<div class="bp1040-brand"><img src="icons/Icon-192.png?v=1040" alt=""><b>BridgePoint Intelligence</b></div><div class="bp1040-live"><i></i>LIVE</div>';document.body.appendChild(header);
const nav=document.createElement('nav');nav.id='bp1040-nav';nav.setAttribute('aria-label','Primary navigation');nav.innerHTML='<button class="bp1040-tab active" data-tab="home" type="button"><span class="ico">▦</span><span>Home</span></button><button class="bp1040-tab" data-tab="map" type="button"><span class="ico">◉</span><span>Map</span></button><button class="bp1040-tab" data-tab="plans" type="button"><span class="ico">★</span><span>Plans</span></button><button class="bp1040-tab" data-tab="properties" type="button"><span class="ico">⌂</span><span>Properties</span></button><button class="bp1040-tab" data-tab="more" type="button"><span class="ico">▦</span><span>More</span></button>';document.body.appendChild(nav);

function clean(){for(const id of ['bp1036-commerce-tab','bp1000-nav-wait','bp1037-home-seam-guard','bp999-nav','bp998-web-nav','bp999-header','bp998-web-header'])document.getElementById(id)?.remove();}
function setMode(tab){active=tab;for(const c of ['bp1040-home','bp1040-map','bp1040-plans','bp1040-flutter'])de.classList.remove(c);de.classList.add(tab==='home'?'bp1040-home':tab==='map'?'bp1040-map':tab==='plans'?'bp1040-plans':'bp1040-flutter');nav.querySelectorAll('.bp1040-tab').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));window.__bridgepointActiveTabV1040=tab;window.dispatchEvent(new CustomEvent('bridgepoint-tab-v1040',{detail:{tab}}));}
function closePlans(){document.getElementById('bp1036-plans-dialog')?.classList.remove('show')}function closeMap(){document.getElementById('bp974-map-dialog')?.classList.remove('show')}
function flutterNav(label,tries=0){let ok=false;try{ok=window.BridgePointNavigateFlutterTabV984?.(label)===true}catch(_){}if(!ok&&tries<24)setTimeout(()=>flutterNav(label,tries+1),120)}
function home(){closePlans();closeMap();setMode('home')}
async function map(){closePlans();setMode('map');try{if(typeof window.BridgePointOpenMapV993==='function')await window.BridgePointOpenMapV993();else await window.BridgePointOpenIntelligenceMapV974?.()}catch(e){console.error(e);home()}}
async function plans(){closeMap();setMode('plans');try{await window.BridgePointOpenPlansV1036?.()}catch(e){console.error(e)}setTimeout(syncOfferCards,60)}
function properties(){closePlans();closeMap();setMode('properties');flutterNav('properties')}
function more(){closePlans();closeMap();setMode('more');let ok=false;try{ok=window.BridgePointNavigateFlutterTabV984?.('more')===true}catch(_){}if(!ok)flutterNav('work')}
nav.querySelector('[data-tab="home"]').onclick=home;nav.querySelector('[data-tab="map"]').onclick=map;nav.querySelector('[data-tab="plans"]').onclick=plans;nav.querySelector('[data-tab="properties"]').onclick=properties;nav.querySelector('[data-tab="more"]').onclick=more;

async function loadOffer(){try{const r=await fetch(`${PROJECT}/rest/v1/rpc/bridgepoint_public_launch_promotion_v1035`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json','Cache-Control':'no-cache'},body:'{}',cache:'no-store'});if(r.ok)offer=await r.json()}catch(_){}syncOfferCards()}
function syncOfferCards(){clean();for(const card of document.querySelectorAll('#bp1036-plans-dialog .bp1036-card')){let badge=card.querySelector('.bp1040-card-offer');if(!badge){badge=document.createElement('div');badge.className='bp1040-card-offer';card.querySelector('.price')?.insertAdjacentElement('afterend',badge)}if(offer?.active){const left=Math.max(0,Number(offer.remaining_spots||0)),pct=Number(offer.percent_off||50),months=Number(offer.duration_months||6),trial=Number(offer.trial_days||7);badge.textContent=left>0?`${left} founding spots left • ${pct}% off for ${months} paid months after the ${trial}-day trial`:'Founding spots filled • standard pricing applies';badge.style.display='block'}else badge.style.display='none'}}
new MutationObserver(()=>{clean();syncOfferCards()}).observe(document.documentElement,{childList:true,subtree:true});clean();loadOffer();setInterval(loadOffer,20000);addEventListener('focus',loadOffer,{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadOffer()});
window.BridgePointSelectedTabV984=()=>active;window.BridgePointSingleShellV1040={home,map,plans,properties,more,getActive:()=>active};home();
})();
