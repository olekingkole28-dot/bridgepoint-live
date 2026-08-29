(()=>{
'use strict';
if(window.__bridgepointCustomerHomeV1043)return;
window.__bridgepointCustomerHomeV1043=true;

const style=document.createElement('style');
style.id='bp1043-customer-home-style';
style.textContent=`
#bp1043-customer-start{margin-bottom:14px;padding:16px 17px;border:1px solid rgba(72,225,255,.18);border-radius:20px;background:linear-gradient(145deg,rgba(7,20,35,.94),rgba(5,13,25,.82));box-shadow:0 20px 54px rgba(0,0,0,.26),inset 0 1px rgba(255,255,255,.025);backdrop-filter:blur(16px);position:relative;overflow:hidden}
#bp1043-customer-start:before{content:"";position:absolute;inset:-90px auto auto -80px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(72,225,255,.16),transparent 68%);pointer-events:none}
.bp1043-start-head{position:relative;display:flex;gap:12px;align-items:flex-start}.bp1043-start-copy{flex:1}.bp1043-eyebrow{color:#45e6a6;font-size:10px;font-weight:1000;letter-spacing:.72px;text-transform:uppercase}.bp1043-start-head h1{margin:5px 0 4px;font-size:24px;line-height:1.08;letter-spacing:-.5px}.bp1043-start-head p{margin:0;color:#a9bdd0;font-size:12px;max-width:760px}.bp1043-network{min-height:39px;border:1px solid rgba(72,225,255,.18);border-radius:11px;background:rgba(72,225,255,.07);color:#8defff;padding:0 11px;font-weight:950;cursor:pointer;white-space:nowrap}
.bp1043-actions{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin-top:14px;position:relative}.bp1043-action{min-height:112px;border:1px solid rgba(255,255,255,.09);border-radius:16px;background:linear-gradient(145deg,rgba(10,27,45,.94),rgba(7,18,31,.92));color:#fff;padding:13px;text-align:left;cursor:pointer;transition:transform .14s ease,border-color .14s ease,background .14s ease}.bp1043-action:hover{transform:translateY(-1px);border-color:rgba(72,225,255,.34);background:linear-gradient(145deg,rgba(12,31,51,.98),rgba(8,22,37,.96))}.bp1043-action-icon{width:36px;height:36px;border-radius:11px;display:grid;place-items:center;background:rgba(72,225,255,.09);border:1px solid rgba(72,225,255,.12);color:#67e8ff}.bp1043-action-icon svg{width:21px;height:21px;fill:none;stroke:currentColor;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}.bp1043-action b{display:block;margin-top:9px;font-size:14px}.bp1043-action span{display:block;margin-top:3px;color:#95adbf;font-size:10.5px;line-height:1.35}.bp1043-action.saved .bp1043-action-icon{color:#ffd77e;background:rgba(255,201,94,.08);border-color:rgba(255,201,94,.14)}.bp1043-action.claims .bp1043-action-icon{color:#9e9cff;background:rgba(108,131,255,.09);border-color:rgba(108,131,255,.16)}
.bp1043-today-strip{position:relative;display:flex;gap:8px;align-items:center;margin-top:10px;padding:9px 10px;border-radius:12px;background:rgba(69,230,166,.055);border:1px solid rgba(69,230,166,.11);color:#9fc0b2;font-size:10.5px}.bp1043-today-dot{width:7px;height:7px;border-radius:50%;background:#45e6a6;box-shadow:0 0 11px rgba(69,230,166,.65);flex:0 0 auto}.bp1043-today-strip b{color:#d9f6e8}.bp1043-today-strip span{color:#8fa8b9}
#bp1042-more [data-bp1043-plans]{border-color:rgba(255,201,94,.18)}#bp1042-more [data-bp1043-plans] .icon{color:#ffd77e}
@media(max-width:900px){.bp1043-actions{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:560px){#bp1043-customer-start{padding:14px}.bp1043-start-head{display:block}.bp1043-network{margin-top:10px;width:100%}.bp1043-actions{grid-template-columns:1fr}.bp1043-action{min-height:90px}.bp1043-start-head h1{font-size:21px}.bp1043-start-head p{font-size:12px}.bp1043-action span{font-size:11px}.bp984h-label,.bp984h-actname,.bp984h-actstatus,.bp984h-actsub,.bp984h-detail,.bp984h-head p,.bp984h-note{font-size:10px!important}.bp1042-muted,.bp1042-meta,.bp1042-pill,.bp1042-more-card p,.bp1042-item small{font-size:11px!important}}
`;
document.head.appendChild(style);

const icon={
  property:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10.5V20h13v-9.5"/><path d="M9.5 20v-5h5v5"/></svg>',
  map:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18 3.8 20.4V6L9 3.6l6 2.4 5.2-2.4V18L15 20.4 9 18Z"/><path d="M9 3.6V18M15 6v14.4"/></svg>',
  saved:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3l-5.6 2.9 1.1-6.2L3 9.6l6.2-.9L12 3Z"/></svg>',
  claims:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 19 6v5c0 4.4-2.9 8-7 10-4.1-2-7-5.6-7-10V6l7-3Z"/><path d="m8.7 12 2.1 2.1 4.5-4.5"/></svg>'
};

function shell(){return window.BridgePointSingleShellV1043||window.BridgePointSingleShellV1042||null;}
function openSaved(){const s=shell();s?.saved?.();if(!s?.saved){s?.more?.();setTimeout(()=>document.querySelector('#bp1042-more [data-module="saved"]')?.click(),80);}}
function openClaims(){const s=shell();s?.more?.();setTimeout(()=>document.querySelector('#bp1042-more [data-module="claims"]')?.click(),80);}
function openCalendar(){const s=shell();s?.more?.();setTimeout(()=>document.querySelector('#bp1042-more [data-module="calendar"]')?.click(),80);}
function mountHome(){
  const wrap=document.querySelector('#bp-live-home-v984 .bp984h-wrap');
  if(!wrap||document.getElementById('bp1043-customer-start'))return false;
  const section=document.createElement('section');
  section.id='bp1043-customer-start';
  section.innerHTML=`<div class="bp1043-start-head"><div class="bp1043-start-copy"><div class="bp1043-eyebrow">YOUR BRIDGEPOINT WORKSPACE</div><h1>What do you want to work on?</h1><p>Start with a property, open the intelligence map, pick up a saved opportunity, or continue a claims workflow. The nationwide data engine keeps updating underneath your workspace.</p></div><button class="bp1043-network" type="button" data-action="network">Network status ↓</button></div><div class="bp1043-actions"><button class="bp1043-action" type="button" data-action="properties"><div class="bp1043-action-icon">${icon.property}</div><b>Find a property</b><span>Search by address, parcel, municipality or ZIP and open its intelligence profile.</span></button><button class="bp1043-action" type="button" data-action="map"><div class="bp1043-action-icon">${icon.map}</div><b>Intelligence map</b><span>See qualified property intelligence geographically and move into the strongest areas.</span></button><button class="bp1043-action saved" type="button" data-action="saved"><div class="bp1043-action-icon">${icon.saved}</div><b>Saved opportunities</b><span>Return to properties you already marked for follow-up and next action.</span></button><button class="bp1043-action claims" type="button" data-action="claims"><div class="bp1043-action-icon">${icon.claims}</div><b>Claims & follow-ups</b><span>Open your authorized claims workspace, then continue into calendar tasks and follow-ups.</span></button></div><div class="bp1043-today-strip"><span class="bp1043-today-dot"></span><b>Live workspace</b><span>BridgePoint continues refreshing property, matching, scoring and intelligence data while you work.</span></div>`;
  wrap.insertBefore(section,wrap.firstChild);
  section.querySelector('[data-action="properties"]').onclick=()=>shell()?.properties?.();
  section.querySelector('[data-action="map"]').onclick=()=>shell()?.map?.();
  section.querySelector('[data-action="saved"]').onclick=openSaved;
  section.querySelector('[data-action="claims"]').onclick=openClaims;
  section.querySelector('[data-action="network"]').onclick=()=>wrap.querySelector('.bp984h-head')?.scrollIntoView({behavior:'smooth',block:'start'});
  const oldHero=wrap.querySelector('.bp984h-hero');
  const h=oldHero?.querySelector('h1'),p=oldHero?.querySelector('p');
  if(h)h.textContent='Nationwide intelligence is updating behind your workspace.';
  if(p)p.textContent='Coverage, matching, scoring and production activity remain visible below for transparency without getting in the way of customer work.';
  return true;
}
function mountMore(){
  const grid=document.querySelector('#bp1042-more .bp1042-more-grid');
  if(!grid||grid.querySelector('[data-bp1043-plans]'))return false;
  const b=document.createElement('button');
  b.className='bp1042-more-card';b.type='button';b.setAttribute('data-bp1043-plans','1');
  b.innerHTML='<div class="icon">★</div><h3>Plans & Billing</h3><p>Review your BridgePoint plan, trial access, billing options and available upgrades.</p>';
  b.onclick=()=>window.BridgePointOpenPlansV1042?.();
  grid.appendChild(b);
  const account=grid.querySelector('[data-module="account"]');if(account)grid.appendChild(account);
  return true;
}
function mount(){mountHome();mountMore();}
new MutationObserver(mount).observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('bridgepoint-tab-v1043',()=>setTimeout(mount,0));
window.addEventListener('bridgepoint-tab-v1042',()=>setTimeout(mount,0));
setInterval(mount,900);
mount();

window.BridgePointCustomerHomeV1043={mount,openSaved,openClaims,openCalendar};
})();