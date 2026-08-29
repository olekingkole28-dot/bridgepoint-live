(()=>{
'use strict';
if(window.__bridgepointPlansPrimaryV1042)return;
window.__bridgepointPlansPrimaryV1042=true;

const PROJECT='https://xdfsjztwgsbmabshzsjw.supabase.co';
const API=`${PROJECT}/rest/v1/rpc/`;
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const FALLBACK=[
  {package_key:'homeowner',package_name:'BridgePoint Homeowner',description:'Personal intelligence for one home: live risk context, property and claim timeline, weather alerts, saved evidence, and plain-language next steps.',monthly_price:19,yearly_price:190,trial_days:7,checkout_ready:true,available_for_self_checkout:true},
  {package_key:'home',package_name:'BridgePoint Home',description:'Residential property intelligence for home-service and property opportunity use cases.',monthly_price:99,yearly_price:990,trial_days:7,checkout_ready:true,available_for_self_checkout:true},
  {package_key:'commercial',package_name:'BridgePoint Commercial',description:'Commercial property, business and development intelligence.',monthly_price:249,yearly_price:2490,trial_days:7,checkout_ready:true,available_for_self_checkout:true},
  {package_key:'investor',package_name:'BridgePoint Investor',description:'Acquisition, distress, redevelopment and market intelligence.',monthly_price:199,yearly_price:1990,trial_days:7,checkout_ready:true,available_for_self_checkout:true},
  {package_key:'company',package_name:'BridgePoint Company',description:'A shared All Intelligence workspace for roofing, contracting, building, restoration, and property teams. Includes five seats, manager controls, shared opportunities, notes, routes, and follow-up visibility.',monthly_price:699,yearly_price:6990,trial_days:7,checkout_ready:true,available_for_self_checkout:true},
  {package_key:'all_intelligence',package_name:'BridgePoint Intelligence Suite',description:'Broad customer-facing BridgePoint intelligence bundle. Does not include owner-only administration, backend internals, proprietary technology internals, or unrestricted platform access.',monthly_price:499,yearly_price:4990,trial_days:7,checkout_ready:false,available_for_self_checkout:false}
];
let dialog=null,offer=null,plans={packages:FALLBACK},refreshing=false,lastLoad=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>Number.isFinite(Number(v))?`$${Number(v).toLocaleString('en-US',{maximumFractionDigits:0})}`:'';
function findToken(){
  const seen=new Set();
  const walk=v=>{if(v==null||seen.has(v))return null;if(typeof v==='object'){seen.add(v);if(typeof v.access_token==='string'&&v.access_token.length>30)return v.access_token;for(const x of Object.values(v)){const h=walk(x);if(h)return h;}}return null;};
  try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(!/auth|supabase|sb-/i.test(k))continue;const raw=localStorage.getItem(k);if(!raw)continue;try{const h=walk(JSON.parse(raw));if(h)return h;}catch(_){}}}catch(_){}
  return null;
}
async function fetchJson(url,opts={},timeout=5000){
  const ctl=new AbortController(),t=setTimeout(()=>ctl.abort(),timeout);
  try{const r=await fetch(url,{...opts,signal:ctl.signal,cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}
  finally{clearTimeout(t);}
}
async function rpc(name,body={}){return fetchJson(API+name,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body)},5000);}

const style=document.createElement('style');style.id='bp1042-plans-style';style.textContent=`
#bp1042-plans{position:fixed;z-index:2147483632;left:0;right:0;top:0;bottom:calc(var(--bp1042-nav-height,84px) + env(safe-area-inset-bottom));display:none;overflow:auto;background:#06101c;color:#fff;font:600 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:max(18px,env(safe-area-inset-top)) 14px 24px}#bp1042-plans.show{display:block}#bp1042-plans *{box-sizing:border-box}.bp1042-shell{width:min(1050px,100%);margin:auto}.bp1042-head{display:flex;gap:12px;align-items:flex-start}.bp1042-grow{flex:1}.bp1042-kicker{color:#ffc95e;font-size:10px;font-weight:1000;letter-spacing:.7px}.bp1042-title{font-size:27px;font-weight:1000;letter-spacing:-.55px;margin:4px 0}.bp1042-sub{color:#aebfd0;font-size:12px}.bp1042-close{width:44px;height:44px;border-radius:13px;border:1px solid rgba(255,255,255,.12);background:#102238;color:#fff;font-size:24px;font-weight:800;cursor:pointer}.bp1042-livebar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:14px 0 2px;color:#91a9bc;font-size:10px}.bp1042-dot{width:7px;height:7px;border-radius:50%;background:#45e6a6;box-shadow:0 0 11px rgba(69,230,166,.65)}.bp1042-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin-top:14px}.bp1042-card{padding:15px;border:1px solid rgba(72,225,255,.15);border-radius:18px;background:linear-gradient(145deg,#0a192a,#071421);box-shadow:0 18px 40px rgba(0,0,0,.18)}.bp1042-card h3{margin:0 0 4px;font-size:17px}.bp1042-price{font-size:25px;font-weight:1000;margin:8px 0 4px}.bp1042-desc{min-height:65px;color:#aebfd0;font-size:11.5px}.bp1042-offer{margin:9px 0;padding:8px 9px;border:1px solid rgba(255,201,94,.28);border-radius:11px;background:rgba(255,201,94,.08);color:#ffd77e;font-size:10px;font-weight:950}.bp1042-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.bp1042-btn{flex:1;min-width:115px;min-height:42px;border:0;border-radius:11px;background:#48e1ff;color:#021018;font-weight:1000;cursor:pointer}.bp1042-btn.alt{background:#12243a;color:#fff;border:1px solid rgba(255,255,255,.13)}.bp1042-btn:disabled{opacity:.5}.bp1042-msg{min-height:20px;margin:12px 2px;color:#75edff;font-size:11px;font-weight:850}.bp1042-foot{margin-top:13px;color:#7890a3;font-size:9.5px}
@media(max-width:820px){.bp1042-grid{grid-template-columns:1fr}.bp1042-title{font-size:23px}.bp1042-desc{min-height:0}#bp1042-plans{padding-left:10px;padding-right:10px}}
`;document.head.appendChild(style);

function ensureDialog(){
  if(dialog)return dialog;
  dialog=document.createElement('section');dialog.id='bp1042-plans';
  dialog.innerHTML=`<div class="bp1042-shell"><div class="bp1042-head"><div class="bp1042-grow"><div class="bp1042-kicker">PLANS • CUSTOMER PRICING</div><div class="bp1042-title">BridgePoint Plans & Access</div><div class="bp1042-sub">Plan cards render immediately. Backend pricing and founding availability refresh in place without blocking this screen.</div></div><button class="bp1042-close" type="button" aria-label="Close">×</button></div><div class="bp1042-livebar"><span class="bp1042-dot"></span><span data-livecopy>Showing current BridgePoint plan catalog</span></div><div data-grid class="bp1042-grid"></div><div data-msg class="bp1042-msg"></div><div class="bp1042-foot">Checkout requires a signed-in BridgePoint account. If the pricing service is briefly unavailable, the last known customer catalog remains visible instead of leaving this page on a loading spinner.</div></div>`;
  document.body.appendChild(dialog);dialog.querySelector('.bp1042-close').onclick=closePlans;return dialog;
}
function closePlans(){dialog?.classList.remove('show');window.dispatchEvent(new CustomEvent('bridgepoint-plans-close-v1042'));}
function rowsOf(data){return Array.isArray(data)?data:Array.isArray(data?.packages)?data.packages:[];}
function offerText(){
  if(!offer?.active)return '';
  const left=Math.max(0,Number(offer.remaining_spots||0)),pct=Number(offer.percent_off||50),months=Number(offer.duration_months||6),trial=Number(offer.trial_days||7);
  return left>0?`${left} founding spots left • ${pct}% off for ${months} paid months after the ${trial}-day free trial`:'Founding spots filled • standard pricing applies';
}
function render(){
  ensureDialog();const grid=dialog.querySelector('[data-grid]'),rows=rowsOf(plans).length?rowsOf(plans):FALLBACK,promo=offerText();
  grid.innerHTML=rows.map(p=>{
    const can=p.available_for_self_checkout!==false&&p.checkout_ready!==false,m=money(p.monthly_price),y=money(p.yearly_price),trial=Number(p.trial_days||7);
    return `<article class="bp1042-card"><h3>${esc(p.package_name||p.package_key)}</h3><div class="bp1042-price">${m?`${m}/mo`:'Contact sales'}</div><div class="bp1042-desc">${esc(p.description||'BridgePoint property intelligence access.')}</div>${promo?`<div class="bp1042-offer">${esc(promo)}</div>`:''}<div class="bp1042-sub">${trial}-day free trial</div><div class="bp1042-actions">${can&&m?`<button class="bp1042-btn" data-buy="month" data-key="${esc(p.package_key)}">Start monthly</button>`:''}${can&&y?`<button class="bp1042-btn alt" data-buy="year" data-key="${esc(p.package_key)}">Annual • ${y}</button>`:''}${!can?`<button class="bp1042-btn alt" data-request="${esc(p.package_key)}">Request access</button>`:''}</div></article>`;
  }).join('');
  grid.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>checkout(b.dataset.key,b.dataset.buy,b));
  grid.querySelectorAll('[data-request]').forEach(b=>b.onclick=()=>{location.href=`../contact/?plan=${encodeURIComponent(b.dataset.request)}&utm_source=app_plans&utm_medium=plan_card`;});
}
async function refresh(){
  if(refreshing)return;refreshing=true;ensureDialog();
  try{
    const [remote,promo]=await Promise.allSettled([rpc('bridgepoint_public_customer_plans_v1041',{}),rpc('bridgepoint_public_launch_promotion_v1035',{})]);
    if(remote.status==='fulfilled'&&rowsOf(remote.value).length)plans=remote.value;
    if(promo.status==='fulfilled')offer=promo.value;
    lastLoad=Date.now();dialog.querySelector('[data-livecopy]').textContent='Live backend pricing and promotion availability updated';render();
  }catch(_){}
  finally{refreshing=false;}
}
async function checkout(key,interval,button){
  const msg=dialog.querySelector('[data-msg]'),token=findToken();
  if(!token){msg.textContent='Sign in first; BridgePoint will return you to Plans for checkout.';setTimeout(()=>{location.href='./?entry=1&mode=signin&utm_source=plans_primary&utm_medium=app&utm_campaign=checkout';},450);return;}
  const old=button.textContent;button.disabled=true;button.textContent='Opening checkout…';msg.textContent='';
  try{const data=await fetchJson(`${PROJECT}/functions/v1/bridgepoint-checkout-v67`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({package_key:key,interval})},10000);if(data?.complete!==true||!data?.url)throw new Error('Checkout unavailable');window.open(data.url,'_blank','noopener,noreferrer');msg.textContent='Secure checkout opened.';}
  catch(_){msg.textContent='Checkout could not open right now. Nothing was charged.';}
  finally{button.disabled=false;button.textContent=old;}
}
function openPlans(){ensureDialog();render();dialog.classList.add('show');if(Date.now()-lastLoad>15000)void refresh();}
window.BridgePointOpenPlansV1042=openPlans;window.BridgePointClosePlansV1042=closePlans;window.BridgePointRefreshPlansV1042=refresh;
ensureDialog();render();setTimeout(refresh,400);
})();