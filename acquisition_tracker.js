(()=>{
'use strict';
const SUPABASE='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const TRACK=SUPABASE+'/rest/v1/rpc/track_acquisition_event_v400';
const VERSION=5100;
const GENERATION='founder_access_2026_09_15';
const params=new URLSearchParams(location.search);
const path=location.pathname||'/';
const disabled=params.get('bp_verify')==='1'||params.get('verify_tracking')==='1'||params.has('verify_mobile_v683');
const newId=()=>globalThis.crypto&&crypto.randomUUID?crypto.randomUUID():'bp-'+Date.now()+'-'+Math.random().toString(36).slice(2);
const stored=(store,key)=>{try{let v=store.getItem(key);if(!v){v=newId();store.setItem(key,v)}return v}catch(_){return newId()}};
const visitorId=stored(localStorage,'bp_visitor_id_v421');
const sessionId=stored(sessionStorage,'bp_session_id_v421');
const referrerHost=(()=>{try{return document.referrer?new URL(document.referrer).hostname:null}catch(_){return null}})();
const surface=path.startsWith('/app/horizon')?'horizon':path.startsWith('/app')?'intelligence_app':'intelligence_public';
const onceKey='bp_current_acq_once_v5100';
const normalize=v=>String(v||'').replace(/\s+/g,' ').trim().toLowerCase();
function once(k){try{const m=JSON.parse(sessionStorage.getItem(onceKey)||'{}');if(m[k])return false;m[k]=1;sessionStorage.setItem(onceKey,JSON.stringify(m));return true}catch(_){return true}}
async function send(eventType,metadata){
  if(disabled)return false;
  const meta=Object.assign({
    capture_version:VERSION,
    frontend_generation:GENERATION,
    product_surface:surface,
    visibility:document.visibilityState
  },metadata||{});
  try{
    const r=await fetch(TRACK,{
      method:'POST',
      keepalive:true,
      cache:'no-store',
      credentials:'omit',
      headers:{apikey:KEY,'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({
        p_event_type:eventType,
        p_visitor_id:visitorId,
        p_session_id:sessionId,
        p_page_path:path.slice(0,256),
        p_platform:'WEB',
        p_referrer_host:referrerHost,
        p_utm_source:params.get('utm_source'),
        p_utm_medium:params.get('utm_medium'),
        p_utm_campaign:params.get('utm_campaign'),
        p_utm_content:params.get('utm_content'),
        p_referral_code:params.get('ref'),
        p_auth_error_code:null,
        p_metadata:meta
      })
    });
    return r.ok;
  }catch(_){return false}
}
function signupContext(){
  if(path==='/'&&document.querySelector('#account-form'))return true;
  const title=normalize(document.querySelector('#authTitle')?.textContent);
  const eyebrow=normalize(document.querySelector('#authEyebrow')?.textContent);
  const submit=normalize(document.querySelector('#authSubmit')?.textContent);
  return /create|start using|free account/.test(title+' '+eyebrow+' '+submit);
}
function initial(){
  let type='VALUE_VIEW',meta={surface:'public_or_app_page'};
  if(path==='/'){type='LANDING_VIEW';meta={surface:'intelligence_home'};}
  else if(path.startsWith('/app/horizon')){type='LANDING_VIEW';meta={surface:'horizon_home_or_lobby'};}
  else if(path.startsWith('/app/bridgepoint-world'))meta={surface:'intelligence_world'};
  else if(path.startsWith('/app'))meta={surface:'intelligence_app_entry'};
  send(type,meta);
}
function bind(){
  document.addEventListener('click',e=>{
    const t=e.target instanceof Element?e.target.closest('a,button'):null;
    if(!t)return;
    const text=normalize(t.textContent||t.getAttribute('aria-label')||'');
    const href=t instanceof HTMLAnchorElement?(t.getAttribute('href')||''):'';
    if(href==='#founder-access'||text.includes('request founder access')){
      send('CONTACT_REQUEST',{action:'founder_access_cta',control_id:t.id||null});
      return;
    }
    if(t.matches('[data-start-account],.auth-open[data-mode="signup"],#authCreate')||/create (free )?account|start free|start 7-day|activate free account/.test(text)){
      send('CREATE_ACCOUNT_CLICK',{action:'create_account_click',control_id:t.id||null});
      return;
    }
    if(t.id==='continue-account'){
      send('SIGNUP_VIEW',{action:'legal_to_signup'});
      return;
    }
    if(t.matches('#installTop,#installBottom,#installBtn,#installBannerBtn,.install-main')||text==='install'||text.includes('install app')){
      send('VALUE_VIEW',{action:'install_click'});
      return;
    }
    if(t.id==='playBtn'){
      send('VALUE_VIEW',{action:'horizon_play_click'});
      return;
    }
    if(t.matches('.mode[data-mode]')){
      send('VALUE_VIEW',{action:'horizon_mode_select',game_mode:t.getAttribute('data-mode')});
      return;
    }
    if(t.matches('#inviteBtn,#inviteTop')||text.includes('invite')){
      if(once('invite'))send('VALUE_VIEW',{action:'horizon_invite'});
      return;
    }
    if(t.matches('#load-b2b-world-v4246')||text.includes('load interactive world')){
      send('VALUE_VIEW',{action:'world_load'});
      return;
    }
    if(t.matches('#searchButton')){
      send('VALUE_VIEW',{action:'map_search'});
      return;
    }
    if(href.startsWith('/founder-access')){
      send('CONTACT_REQUEST',{action:'founder_access_click',product:'INTELLIGENCE'});
      return;
    }
    if(href.startsWith('/app/horizon')){
      send('VALUE_VIEW',{action:'cross_surface_horizon'});
      return;
    }
    if(href.startsWith('/app')&&surface==='intelligence_public'){
      send('VALUE_VIEW',{action:'open_intelligence_app'});
    }
  },{capture:true});
  document.addEventListener('input',e=>{
    const t=e.target;
    if(!(t instanceof HTMLInputElement||t instanceof HTMLSelectElement||t instanceof HTMLTextAreaElement))return;
    const form=t.closest('form');
    if(!form)return;
    if((form.id==='account-form'||form.id==='authForm')&&signupContext()&&once('signup_form_start')){
      send('SIGNUP_FORM_START',{surface:'current_account_form'});
    }
  },{capture:true});
  document.addEventListener('submit',e=>{
    const form=e.target instanceof HTMLFormElement?e.target:null;
    if(!form)return;
    if(form.matches('[data-founder-access-form]')){
      if(once('founder_form_start'))send('CONTACT_REQUEST',{action:'founder_access_form_start',product:form.dataset.product||'INTELLIGENCE'});
      return;
    }
    if(form.matches('[data-founder-access-form]')){
      send('CONTACT_REQUEST',{action:'founder_access_submit',product:form.dataset.product||'INTELLIGENCE'});
      return;
    }
    if(form.id==='teaser-form'){
      send('SAMPLE_REQUEST',{surface:'property_teaser'});
      return;
    }
    if((form.id==='account-form'||form.id==='authForm')&&signupContext()){
      send('SIGNUP_SUBMIT',{surface:'current_account_form'});
      return;
    }
    if(form.id==='signin-form'||form.id==='authForm'){
      send('VALUE_VIEW',{action:'signin_submit'});
    }
  },{capture:true});
}
window.BridgePointAcquisition={version:VERSION,generation:GENERATION,surface,send};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{initial();bind()},{once:true});
else{initial();bind();}
})();