(()=>{
'use strict';
if(window.__bridgepointCustomerPriorityV1036)return;
window.__bridgepointCustomerPriorityV1036=true;

const PROJECT='https://xdfsjztwgsbmabshzsjw.supabase.co';
const RPC=`${PROJECT}/rest/v1/rpc/`;
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const MAP_RPC_REWRITES={
  bridgepoint_flutter_property_map_viewport_v838:'bridgepoint_flutter_property_map_viewport_v1035',
  bridgepoint_flutter_opportunities_state_v341:'bridgepoint_flutter_opportunities_state_v1036',
  bridgepoint_flutter_signal_map_v80:'bridgepoint_flutter_signal_map_v1036'
};

// Install before the map runtime lazy-loads so property-level pins can only use the
// strict site-address RPCs. This intentionally does not invent/geocode addresses client-side.
const nativeFetch=window.fetch.bind(window);
window.fetch=function(input,init){
  try{
    const raw=typeof input==='string'?input:(input instanceof URL?input.href:input?.url);
    if(raw){
      let next=raw;
      for(const [from,to] of Object.entries(MAP_RPC_REWRITES)){
        next=next.replace(`/rpc/${from}`,`/rpc/${to}`);
      }
      if(next!==raw){
        if(input instanceof Request) input=new Request(next,input);
        else input=next;
      }
    }
  }catch(_){}
  return nativeFetch(input,init);
};

function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function findToken(){
  const seen=new Set();
  const walk=v=>{
    if(v==null||seen.has(v))return null;
    if(typeof v==='object'){
      seen.add(v);
      if(typeof v.access_token==='string'&&v.access_token.length>30)return v.access_token;
      for(const x of Object.values(v)){const hit=walk(x);if(hit)return hit;}
    }
    return null;
  };
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||'';
      if(!/auth|supabase|sb-/i.test(k))continue;
      const raw=localStorage.getItem(k);if(!raw)continue;
      try{const hit=walk(JSON.parse(raw));if(hit)return hit;}catch(_){}
    }
  }catch(_){}
  return null;
}
async function rpc(name,body={},token=null){
  const r=await nativeFetch(RPC+name,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${token||KEY}`,'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body),cache:'no-store'});
  if(!r.ok)throw new Error(`${name}:${r.status}`);
  return r.json();
}

const style=document.createElement('style');
style.id='bp1036-customer-priority-style';
style.textContent=`
#bp1036-commerce-tab{position:fixed;z-index:2147483624;right:10px;bottom:calc(max(96px,env(safe-area-inset-bottom) + 86px));display:flex;align-items:center;gap:8px;min-height:46px;padding:7px 11px;border-radius:15px;border:1px solid rgba(255,201,94,.55);background:linear-gradient(135deg,rgba(35,27,7,.98),rgba(8,20,34,.98));box-shadow:0 14px 40px rgba(0,0,0,.45),0 0 22px rgba(255,201,94,.10);color:#fff;font:900 12px/1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;backdrop-filter:blur(14px)}
#bp1036-commerce-tab .icon{width:32px;height:32px;border-radius:10px;display:grid;place-items:center;background:rgba(255,201,94,.13);color:#ffc95e;font-size:18px}#bp1036-commerce-tab .copy{display:grid;gap:4px;text-align:left}#bp1036-commerce-tab .main{font-size:12px;letter-spacing:.15px}#bp1036-commerce-tab .promo{font-size:9px;color:#ffc95e;letter-spacing:.35px;white-space:nowrap}#bp1036-commerce-tab[data-soldout="1"]{border-color:rgba(181,198,217,.28)}#bp1036-commerce-tab[data-soldout="1"] .promo{color:#b5c6d9}
#bp1036-plans-dialog{position:fixed;z-index:2147483642;inset:0;display:none;background:rgba(2,7,13,.82);backdrop-filter:blur(12px);color:#fff;font:500 14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:auto}#bp1036-plans-dialog.show{display:block}#bp1036-plans-dialog *{box-sizing:border-box}.bp1036-shell{width:min(1040px,calc(100% - 20px));margin:max(16px,env(safe-area-inset-top)) auto 28px;padding:18px;border:1px solid rgba(72,225,255,.18);border-radius:22px;background:linear-gradient(145deg,#081625,#06101c);box-shadow:0 28px 90px rgba(0,0,0,.55)}.bp1036-head{display:flex;align-items:flex-start;gap:12px}.bp1036-grow{flex:1}.bp1036-kicker{color:#ffc95e;font-size:10px;font-weight:1000;letter-spacing:.9px}.bp1036-title{margin:4px 0 3px;font-size:26px;font-weight:1000;letter-spacing:-.5px}.bp1036-sub{color:#b5c6d9;font-size:12px}.bp1036-close{width:42px;height:42px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#102238;color:#fff;font-size:23px;cursor:pointer}.bp1036-offer{margin-top:14px;padding:14px 15px;border:1px solid rgba(255,201,94,.34);border-radius:16px;background:linear-gradient(135deg,rgba(255,201,94,.10),rgba(72,225,255,.035));display:flex;gap:14px;align-items:center;flex-wrap:wrap}.bp1036-offer b{font-size:17px}.bp1036-offer .left{flex:1;min-width:210px}.bp1036-offer .spots{font-size:24px;font-weight:1000;color:#ffc95e}.bp1036-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:14px}.bp1036-card{padding:15px;border:1px solid rgba(72,225,255,.15);border-radius:17px;background:#0a192a}.bp1036-card h3{margin:0 0 5px;font-size:16px}.bp1036-card .price{font-size:25px;font-weight:1000;margin:8px 0}.bp1036-card p{color:#b5c6d9;font-size:11.5px;min-height:48px}.bp1036-actions{display:flex;gap:7px;flex-wrap:wrap}.bp1036-btn{flex:1;min-width:110px;min-height:42px;border:0;border-radius:11px;background:#48e1ff;color:#021018;font-weight:1000;cursor:pointer}.bp1036-btn.alt{background:#12243a;color:#fff;border:1px solid rgba(255,255,255,.13)}.bp1036-btn:disabled{opacity:.45;cursor:not-allowed}.bp1036-message{margin-top:12px;color:#75edff;font-weight:800;font-size:11px}.bp1036-auth{margin-top:16px;padding:17px;border:1px solid rgba(72,225,255,.17);border-radius:16px;background:#0a192a}.bp1036-auth button{margin-top:10px}.bp1036-foot{margin-top:14px;color:#8fa5b9;font-size:9.5px}.bp1036-loading{padding:26px;text-align:center;color:#b5c6d9}
@media(max-width:820px){#bp1036-commerce-tab{right:8px;bottom:calc(max(100px,env(safe-area-inset-bottom) + 92px));min-height:43px;padding:6px 9px}#bp1036-commerce-tab .icon{width:29px;height:29px}.bp1036-shell{padding:14px}.bp1036-title{font-size:22px}.bp1036-grid{grid-template-columns:1fr}.bp1036-card p{min-height:0}}
`;
document.head.appendChild(style);

const tab=document.createElement('button');
tab.id='bp1036-commerce-tab';
tab.type='button';
tab.setAttribute('aria-label','Plans and founding offer');
tab.innerHTML='<span class="icon">★</span><span class="copy"><span class="main">Plans & Access</span><span class="promo">LIVE OFFER</span></span>';
// v1040: floating founding-offer control disabled; Plans is primary navigation.

const dialog=document.createElement('div');
dialog.id='bp1036-plans-dialog';
dialog.innerHTML=`<div class="bp1036-shell"><div class="bp1036-head"><div class="bp1036-grow"><div class="bp1036-kicker">PLANS • LIVE BACKEND PRICING</div><div class="bp1036-title">BridgePoint Plans & Access</div><div class="bp1036-sub">Choose a customer-ready plan without digging through More. Pricing and founding-customer availability refresh from BridgePoint's backend.</div></div><button class="bp1036-close" type="button" aria-label="Close">×</button></div><div class="bp1036-offer" data-offer><div class="left"><b>Founding customer offer</b><div class="bp1036-sub">Checking live availability…</div></div><div class="spots">—</div></div><div data-content class="bp1036-loading">Loading customer-ready plans…</div><div class="bp1036-message" data-message></div><div class="bp1036-foot">Offer availability is reserved by backend checkout state. Expired, revoked and founder-only reservations do not consume customer spots. Property-map address display is independently restricted to verified site-address records.</div></div>`;
document.body.appendChild(dialog);

dialog.querySelector('.bp1036-close').onclick=()=>dialog.classList.remove('show');
dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.classList.remove('show');});
document.addEventListener('keydown',e=>{if(e.key==='Escape')dialog.classList.remove('show');});

let offer=null,offerTimer=null;
function offerMarkup(data){
  if(!data?.active)return '<div class="left"><b>Founding customer offer</b><div class="bp1036-sub">The launch offer is not currently active.</div></div><div class="spots">—</div>';
  const left=Math.max(0,Number(data.remaining_spots||0));
  const max=Math.max(left,Number(data.max_spots||10));
  return `<div class="left"><b>${esc(data.percent_off)}% off for ${esc(data.duration_months)} paid months</b><div class="bp1036-sub">After the ${esc(data.trial_days)}-day free trial • first ${max} eligible customers</div></div><div><div class="spots">${left} left</div><div class="bp1036-sub">of ${max} founding spots</div></div>`;
}
async function refreshOffer(){
  try{
    const data=await rpc('bridgepoint_public_launch_promotion_v1035',{});
    offer=data||null;
    const left=Math.max(0,Number(data?.remaining_spots||0));
    const active=data?.active===true;
    tab.dataset.soldout=active&&left<=0?'1':'0';
    tab.querySelector('.promo').textContent=active?(left>0?`${left} FOUNDING SPOTS LEFT`:'FOUNDING SPOTS FILLED'):'VIEW PLANS';
    dialog.querySelector('[data-offer]').innerHTML=offerMarkup(data);
  }catch(_){
    tab.querySelector('.promo').textContent='VIEW PLANS';
  }
}
function money(v){const n=Number(v);return Number.isFinite(n)?`$${Number.isInteger(n)?n:n.toFixed(2)}`:'';}
function planRows(v){if(Array.isArray(v))return v;if(v&&Array.isArray(v.packages))return v.packages;return [];}
async function loadPlans(){
  const content=dialog.querySelector('[data-content]');
  const msg=dialog.querySelector('[data-message]');
  msg.textContent='';
  const token=findToken();
  if(!token){
    content.className='bp1036-auth';
    content.innerHTML='<b>Sign in or create an account to choose a plan.</b><div class="bp1036-sub">The live founding-offer counter is public, but checkout stays tied to an authenticated BridgePoint account.</div><button class="bp1036-btn" type="button" data-entry>Open sign in / create account</button>';
    content.querySelector('[data-entry]').onclick=()=>{dialog.classList.remove('show');location.href='./?entry=1&mode=signup&utm_source=plans_primary&utm_medium=app&utm_campaign=founding_offer';};
    return;
  }
  content.className='bp1036-loading';content.textContent='Loading customer-ready plans…';
  try{
    const data=await rpc('bridgepoint_customer_plans_v944',{},token);
    const rows=planRows(data);
    if(!rows.length)throw new Error('no plans');
    content.className='bp1036-grid';
    content.innerHTML=rows.map((p,i)=>{
      const key=esc(p.package_key||'');
      const name=esc(p.package_name||p.name||p.package_key||'BridgePoint');
      const desc=esc(p.description||'BridgePoint property intelligence access.');
      const monthly=money(p.monthly_price);
      const yearly=money(p.yearly_price);
      const trial=Number(p.trial_days||7);
      return `<div class="bp1036-card" data-plan="${key}"><h3>${name}</h3><div class="price">${monthly?`${monthly}/mo`:'Contact sales'}</div><p>${desc}</p><div class="bp1036-sub">${trial}-day free trial${offer?.active?' • founding offer applies while spots remain':''}</div><div class="bp1036-actions">${monthly?`<button class="bp1036-btn" data-buy="month" data-key="${key}">Start monthly</button>`:''}${yearly?`<button class="bp1036-btn alt" data-buy="year" data-key="${key}">Annual • ${yearly}</button>`:''}</div></div>`;
    }).join('');
    content.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>checkout(b.dataset.key,b.dataset.buy,token,b));
  }catch(_){
    content.className='bp1036-auth';content.innerHTML='<b>Plans could not load right now.</b><div class="bp1036-sub">Please close this panel and try again. Your account and billing state were not changed.</div>';
  }
}
async function checkout(key,interval,token,button){
  const msg=dialog.querySelector('[data-message]');
  const old=button.textContent;button.disabled=true;button.textContent='Opening checkout…';msg.textContent='';
  try{
    const r=await nativeFetch(`${PROJECT}/functions/v1/bridgepoint-checkout-v67`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({package_key:key,interval})});
    const data=await r.json().catch(()=>({}));
    if(!r.ok||data?.complete!==true||!data?.url)throw new Error('checkout');
    window.open(data.url,'_blank','noopener,noreferrer');
    msg.textContent='Secure checkout opened. Founding-offer availability will refresh automatically.';
    setTimeout(refreshOffer,1200);
  }catch(_){msg.textContent='Checkout could not open right now. Nothing was charged.';}
  finally{button.disabled=false;button.textContent=old;}
}
async function openPlans(){dialog.classList.add('show');await refreshOffer();await loadPlans();}
tab.onclick=openPlans;
window.BridgePointOpenPlansV1036=openPlans;
window.BridgePointRefreshLaunchOfferV1036=refreshOffer;

refreshOffer();
offerTimer=setInterval(refreshOffer,20000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshOffer();});
window.addEventListener('focus',refreshOffer,{passive:true});
})();
