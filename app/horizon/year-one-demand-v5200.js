(()=>{
'use strict';
const SB='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const qs=new URLSearchParams(location.search);
const rid=()=>globalThis.crypto?.randomUUID?.()||'bp-'+Date.now()+'-'+Math.random().toString(36).slice(2);
let visitor='';
try{visitor=localStorage.getItem('bp_visitor_id_v421')||rid();localStorage.setItem('bp_visitor_id_v421',visitor)}catch{visitor=rid()}
const countEls=[...document.querySelectorAll('[data-year-one-demand-count]')];
const buttons=[...document.querySelectorAll('[data-year-one-demand-request]')];
const emailEls=[...document.querySelectorAll('[data-year-one-demand-email]')];
const fmt=n=>Number(n||0).toLocaleString();
async function refresh(){
 try{
  const r=await fetch(SB+'/rest/v1/rpc/bridgepoint_horizon_year_one_demand_v5200',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:'{}'});
  const d=await r.json();if(!r.ok)throw new Error(d?.message||'counter unavailable');
  countEls.forEach(el=>el.textContent=fmt(d.unique_requests)+' people have requested the 365-day Year One world');
 }catch{countEls.forEach(el=>el.textContent='Demand counter is reconnecting…')}
}
async function request(btn){
 if(btn.disabled)return;btn.disabled=true;const old=btn.textContent;btn.textContent='REQUESTING…';
 const email=(emailEls.find(el=>el.offsetParent!==null)?.value||'').trim()||null;
 try{
  const r=await fetch(SB+'/rest/v1/rpc/bridgepoint_horizon_request_year_one_v5200',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({
   p_visitor_id:visitor,p_email:email,p_page_path:location.pathname,p_utm_source:qs.get('utm_source'),p_utm_medium:qs.get('utm_medium'),p_utm_campaign:qs.get('utm_campaign')
  })});
  const d=await r.json();if(!r.ok||!d?.ok)throw new Error(d?.message||'request failed');
  countEls.forEach(el=>el.textContent=fmt(d.unique_requests)+' people have requested the 365-day Year One world');
  buttons.forEach(b=>{b.textContent=d.already_counted?'REQUEST COUNTED · STILL WANT IT':'REQUEST COUNTED';b.classList.add('requested')});
  window.BridgePointAcquisition?.send?.('CONTACT_REQUEST',{action:'horizon_year_one_365_demand',product:'HORIZON'});
 }catch{btn.textContent='TRY REQUEST AGAIN';btn.disabled=false;return}
 setTimeout(()=>buttons.forEach(b=>b.disabled=false),1200);
}
buttons.forEach(b=>b.addEventListener('click',()=>request(b)));refresh();setInterval(refresh,60000);
})();