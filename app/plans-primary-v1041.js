(()=>{
'use strict';
if(window.__bridgepointPlansPrimaryV1041)return;
window.__bridgepointPlansPrimaryV1041=true;

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
let dialog=null,offer=null,plans=null,lastLoad=0;
const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=v=>Number.isFinite(Number(v))?`$${Number(v).toLocaleString('en-US',{maximumFractionDigits:0})}`:'';
function findToken(){
  const seen=new Set();
  const walk=v=>{if(v==null||seen.has(v))return null;if(typeof v==='object'){seen.add(v);if(typeof v.access_token==='string'&&v.access_token.length>30)return v.access_token;for(const x of Object.values(v)){const h=walk(x);if(h)return h;}}return null;};
  try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(!/auth|supabase|sb-/i.test(k))continue;const raw=localStorage.getItem(k);if(!raw)continue;try{const h=walk(JSON.parse(raw));if(h)return h;}catch(_){}}}catch(_){}
  return null;
}
async function fetchJson(url,opts={},timeout=6500){
  const ctl=new AbortController();const t=setTimeout(()=>ctl.abort(),timeout);
  try{const r=await fetch(url,{...opts,signal:ctl.signal,cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return await r.json();}
  finally{clearTimeout(t);}
}
async function rpc(name,body={}){return fetchJson(API+name,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify(body)},6500);}

const style=document.createElement('style');style.id='bp1041-plans-style';style.textContent=`
#bp1041-plans{position:fixed;z-index:2147483632;left:0;right:0;top:0;bottom:calc(var(--bp1041-nav-height,84px) + env(safe-area-inset-bottom));display:none;overflow:auto;background:#06101c;color:#fff;font:600 13px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:max(18px,env(safe-area-inset-top)) 14px 24px}#bp1041-plans.show{display:block}#bp1041-plans *{box-sizing:border-box}.bp1041-shell{width:min(1050px,100%);margin:auto}.bp1041-head{display:flex;gap:12px;align-items:flex-start}.bp1041-grow{flex:1}.bp1041-kicker{color:#ffc95e;font-size:10px;font-weight:1000;letter-spacing:.7px}.bp1041-title{font-size:27px;font-weight:1000;letter-spacing:-.55px;margin:4px 0}.bp1041-sub{color:#aebfd0;font-size:12px}.bp1041-close{width:44px;height:44px;border-radius:13px;border:1px solid rgba(255,255,255,.12);background:#102238;color:#fff;font-size:24px;font-weight:800;cursor:pointer}.bp1041-status{margin:18px 0;padding:16px;border:1px solid rgba(72,225,255,.16);border-radius:16px;background:#091a2a;color:#b8cad8;text-align:center}.bp1041-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px;margin-top:16px}.bp1041-card{padding:15px;border:1px solid rgba(72,225,255,.15);border-radius:18px;background:linear-gradient(145deg,#0a192a,#071421);box-shadow:0 18px 40px rgba(0,0,0,.18)}.bp1041-card h3{margin:0 0 4px;font-size:17px}.bp1041-price{font-size:25px;font-weight:1000;margin:8px 0 4px}.bp1041-desc{min-height:65px;color:#aebfd0;font-size:11.5px}.bp1041-offer{margin:9px 0;padding:8px 9px;border:1px solid rgba(255,201,94,.28);border-radius:11px;background:rgba(255,201,94,.08);color:#ffd77e;font-size:10px;font-weight:950}.bp1041-actions{display:flex;gap:7px;flex-wrap:wrap;margin-top:10px}.bp1041-btn{flex:1;min-width:115px;min-height:42px;border:0;border-radius:11px;background:#48e1ff;color:#021018;font-weight:1000;cursor:pointer}.bp1041-btn.alt{background:#12243a;color:#fff;border:1px solid rgba(255,255,255,.13)}.bp1041-btn:disabled{opacity:.5}.bp1041-msg{min-height:20px;margin:12px 2px;color:#75edff;font-size:11px;font-weight:850}.bp1041-foot{margin-top:13px;color:#7890a3;font-size:9.5px}
@media(max-width:820px){.bp1041-grid{grid-template-columns:1fr}.bp1041-title{font-size:23px}.bp1041-desc{min-height:0}#bp1041-plans{padding-left:10px;padding-right:10px}}
`;document.head.appendChild(style);

function ensureDialog(){
  if(dialog)return dialog;
  dialog=document.createElement('section');dialog.id='bp1041-plans';
  dialog.innerHTML=`<div class="bp1041-shell"><div class="bp1041-head"><div class="bp1041-grow"><div class="bp1041-kicker">PLANS • LIVE BACKEND PRICING</div><div class="bp1041-title">BridgePoint Plans & Access</div><div class="bp1041-sub">Live customer plans. Founding availability is shown directly on each eligible plan.</div></div><button class="bp1041-close" type="button" aria-label="Close">×</button></div><div data-status class="bp1041-status">Loading plans…</div><div data-grid class="bp1041-grid" hidden></div><div data-msg class="bp1041-msg"></div><div class="bp1041-foot">Checkout requires a signed-in BridgePoint account. Prices and founding availability refresh from the BridgePoint backend; the plan catalog has a local display fallback so this screen never hangs blank.</div></div>`;
  document.body.appendChild(dialog);
  dialog.querySelector('.bp1041-close').onclick=()=>closePlans();
  return dialog;
}
function closePlans(){dialog?.classList.remove('show');window.dispatchEvent(new CustomEvent('bridgepoint-plans-close-v1041'));}
function offerText(){
  if(!offer?.active)return '';
  const left=Math.max(0,Number(offer.remaining_spots||0));
  const pct=Number(offer.percent_off||50),months=Number(offer.duration_months||6),trial=Number(offer.trial_days||7);
  return left>0?`${left} founding spots left • ${pct}% off for ${months} paid months after the ${trial}-day free trial`:'Founding spots filled • standard pricing applies';
}
function rowsOf(data){return Array.isArray(data)?data:Array.isArray(data?.packages)?data.packages:[];}
function render(){
  ensureDialog();const status=dialog.querySelector('[data-status]'),grid=dialog.querySelector('[data-grid]');
  const rows=rowsOf(plans);if(!rows.length){status.hidden=false;status.textContent='Plans are temporarily unavailable. Please try again.';grid.hidden=true;return;}
  status.hidden=true;grid.hidden=false;const promo=offerText();
  grid.innerHTML=rows.map(p=>{
    const can=p.available_for_self_checkout!==false&&p.checkout_ready!==false;
    const m=money(p.monthly_price),y=money(p.yearly_price),trial=Number(p.trial_days||7);
    return `<article class="bp1041-card"><h3>${esc(p.package_name||p.package_key)}</h3><div class="bp1041-price">${m?`${m}/mo`:'Contact sales'}</div><div class="bp1041-desc">${esc(p.description||'BridgePoint property intelligence access.')}</div>${promo?`<div class="bp1041-offer">${esc(promo)}</div>`:''}<div class="bp1041-sub">${trial}-day free trial</div><div class="bp1041-actions">${can&&m?`<button class="bp1041-btn" data-buy="month" data-key="${esc(p.package_key)}">Start monthly</button>`:''}${can&&y?`<button class="bp1041-btn alt" data-buy="year" data-key="${esc(p.package_key)}">Annual • ${y}</button>`:''}${!can?`<button class="bp1041-btn alt" data-request="${esc(p.package_key)}">Request access</button>`:''}</div></article>`;
  }).join('');
  grid.querySelectorAll('[data-buy]').forEach(b=>b.onclick=()=>checkout(b.dataset.key,b.dataset.buy,b));
  grid.querySelectorAll('[data-request]').forEach(b=>b.onclick=()=>{location.href=`../contact/?plan=${encodeURIComponent(b.dataset.request)}&utm_source=app_plans&utm_medium=plan_card`;});
}
async function load(){
  ensureDialog();const status=dialog.querySelector('[data-status]');status.hidden=false;status.textContent='Loading plans…';
  let remote=null;
  try{[remote,offer]=await Promise.all([rpc('bridgepoint_public_customer_plans_v1041',{}),rpc('bridgepoint_public_launch_promotion_v1035',{})]);}catch(_){
    try{offer=await rpc('bridgepoint_public_launch_promotion_v1035',{});}catch(_){}
  }
  plans=rowsOf(remote).length?remote:{packages:FALLBACK};lastLoad=Date.now();render();
}
async function checkout(key,interval,button){
  const msg=dialog.querySelector('[data-msg]'),token=findToken();
  if(!token){msg.textContent='Sign in first; then BridgePoint will reopen Plans for checkout.';setTimeout(()=>{location.href='./?entry=1&mode=signin&utm_source=plans_primary&utm_medium=app&utm_campaign=checkout';},450);return;}
  const old=button.textContent;button.disabled=true;button.textContent='Opening checkout…';msg.textContent='';
  try{
    const data=await fetchJson(`${PROJECT}/functions/v1/bridgepoint-checkout-v67`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({package_key:key,interval})},10000);
    if(data?.complete!==true||!data?.url)throw new Error('Checkout unavailable');
    window.open(data.url,'_blank','noopener,noreferrer');msg.textContent='Secure checkout opened.';
  }catch(_){msg.textContent='Checkout could not open right now. Nothing was charged.';}
  finally{button.disabled=false;button.textContent=old;}
}
async function openPlans(){ensureDialog();dialog.classList.add('show');render();if(!plans||Date.now()-lastLoad>20000)await load();}
window.BridgePointOpenPlansV1041=openPlans;
window.BridgePointClosePlansV1041=closePlans;
window.BridgePointRefreshPlansV1041=load;
})();