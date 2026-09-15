(()=>{
'use strict';
const SB='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const RPC=SB+'/rest/v1/rpc/bridgepoint_reserve_founder_access_v5100';
const qs=new URLSearchParams(location.search);
const newId=()=>globalThis.crypto?.randomUUID?.()||'bp-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const stored=(store,key)=>{try{let v=store.getItem(key);if(!v){v=newId();store.setItem(key,v)}return v}catch{return newId()}};
const visitor=stored(localStorage,'bp_visitor_id_v421'),session=stored(sessionStorage,'bp_session_id_v421');
let globalPrefill={};
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]));
function render(host){
  if(host.dataset.mounted==='1')return;host.dataset.mounted='1';
  const product=(host.dataset.product||'INTELLIGENCE').toUpperCase(),vertical=(host.dataset.vertical||qs.get('vertical')||'').toUpperCase(),state=(host.dataset.state||qs.get('state')||'').toUpperCase(),territory=host.dataset.territory||qs.get('territory')||'';
  host.innerHTML=`<div class="bp-founder"><span class="bp-founder-badge">FOUNDER ACCESS · NO CHARGE TODAY</span><h2>Put your territory in front of BridgePoint.</h2><p>Tell us what you need. High-urgency business requests are automatically prioritized. Billing is not connected and this form cannot charge you.</p><form data-founder-access-form data-product="${esc(product)}">
  <div class="bp-founder-grid"><div class="bp-founder-field"><label>Name</label><input name="full_name" autocomplete="name" maxlength="120" required></div><div class="bp-founder-field"><label>Work email</label><input name="email" type="email" autocomplete="email" maxlength="254" required></div></div>
  <div class="bp-founder-grid"><div class="bp-founder-field"><label>Company</label><input name="company_name" autocomplete="organization" maxlength="180"></div><div class="bp-founder-field"><label>Role</label><input name="role_title" autocomplete="organization-title" maxlength="120" placeholder="Owner, estimator, sales manager…"></div></div>
  <div class="bp-founder-grid"><div class="bp-founder-field"><label>Business type</label><select name="vertical"><option value="ROOFING">Roofing</option><option value="SOLAR">Solar</option><option value="PUBLIC_ADJUSTER">Public adjusting</option><option value="RESTORATION">Restoration / mitigation</option><option value="PROPERTY_MANAGEMENT">Property management</option><option value="INSURANCE">Insurance</option><option value="REAL_ESTATE">Real estate / investing</option><option value="OTHER">Other</option></select></div><div class="bp-founder-field"><label>State</label><input name="state_code" maxlength="2" value="${esc(state)}" placeholder="CT"></div></div>
  <div class="bp-founder-field"><label>Territory</label><input name="territory" maxlength="180" value="${esc(territory)}" placeholder="Town, county, ZIP group or statewide"></div>
  <div class="bp-founder-field"><label>What would make BridgePoint worth paying for?</label><textarea name="use_case" maxlength="1500" required placeholder="Example: rank roofs in my sales territory, verify property context before a site visit, triage storm-exposed properties…"></textarea></div>
  <div class="bp-founder-grid"><div class="bp-founder-field"><label>Team size</label><select name="team_size"><option value="1">Just me</option><option value="2-5">2–5</option><option value="6-10">6–10</option><option value="11-25">11–25</option><option value="26-50">26–50</option><option value="51-100">51–100</option><option value="100+">100+</option></select></div><div class="bp-founder-field"><label>How soon?</label><select name="urgency"><option value="NOW">Now</option><option value="THIS_WEEK">This week</option><option value="THIS_MONTH">This month</option><option value="LATER">Later / researching</option></select></div></div>
  <div class="bp-founder-field"><label>Likely monthly/annual budget if it solves the problem</label><select name="budget_range"><option value="">Prefer not to say</option><option value="$99-$299">$99–$299/mo</option><option value="$300-$999">$300–$999/mo</option><option value="$1000+">$1,000+/mo or annual pilot</option><option value="$5000+">$5,000+ strategic/enterprise</option></select></div>
  <div class="bp-founder-hp"><input name="website" tabindex="-1" autocomplete="off"></div>
  <button type="submit">REQUEST FOUNDER ACCESS</button><div class="bp-founder-status"></div>
  <p class="bp-founder-fine">Submitting is a business-access request, not a purchase. BridgePoint uses public-source intelligence for decision support; field verification is still required.</p></form></div>`;
  const form=host.querySelector('form'),vsel=form.elements.vertical;if(vertical&&[...vsel.options].some(o=>o.value===vertical))vsel.value=vertical;
  const applyPrefill=()=>{for(const [k,v] of Object.entries(globalPrefill||{})){if(v!=null&&form.elements[k])form.elements[k].value=String(v)}};applyPrefill();
  let started=false;form.addEventListener('input',()=>{if(started)return;started=true;window.BridgePointAcquisition?.send?.('CONTACT_REQUEST',{action:'founder_access_form_start',product,vertical:form.elements.vertical.value})},{once:true});
  form.addEventListener('submit',async e=>{e.preventDefault();const b=form.querySelector('button[type=submit]'),status=form.querySelector('.bp-founder-status'),fd=new FormData(form);b.disabled=true;b.textContent='SENDING…';status.className='bp-founder-status';status.textContent='';
    const body={p_email:fd.get('email'),p_full_name:fd.get('full_name'),p_company_name:fd.get('company_name'),p_role_title:fd.get('role_title'),p_vertical:fd.get('vertical'),p_use_case:fd.get('use_case'),p_state_code:fd.get('state_code'),p_territory:fd.get('territory'),p_team_size:fd.get('team_size'),p_urgency:fd.get('urgency'),p_budget_range:fd.get('budget_range'),p_product_key:product,p_visitor_id:visitor,p_session_id:session,p_page_path:location.pathname,p_utm_source:qs.get('utm_source'),p_utm_medium:qs.get('utm_medium'),p_utm_campaign:qs.get('utm_campaign'),p_referral_code:qs.get('ref')||qs.get('referral_code'),p_website:fd.get('website')};
    try{const r=await fetch(RPC,{method:'POST',credentials:'omit',headers:{apikey:KEY,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(body)}),d=await r.json();if(!r.ok||!d?.ok)throw new Error(d?.message||'Request failed');status.className='bp-founder-status ok';status.textContent=d.priority==='HOT'?'Request received and prioritized. No payment was attempted.':'Request received. No payment was attempted.';b.textContent='REQUEST RECEIVED';window.BridgePointAcquisition?.send?.('CONTACT_REQUEST',{action:'founder_access_success',product,vertical:fd.get('vertical'),priority:d.priority||null})}
    catch(err){status.className='bp-founder-status err';status.textContent='Could not save your request. Please try again.';b.disabled=false;b.textContent='REQUEST FOUNDER ACCESS'}
  });
  host._bpApplyPrefill=applyPrefill;
}
function mount(){document.querySelectorAll('[data-founder-access]').forEach(render)}
window.BPFounderAccess={version:5100,prefill(v={}){globalPrefill={...globalPrefill,...v};document.querySelectorAll('[data-founder-access]').forEach(h=>h._bpApplyPrefill?.())},mount};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();