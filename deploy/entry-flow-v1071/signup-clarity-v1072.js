(()=>{
'use strict';
if(window.__bridgepointSignupClarityV1072)return;
window.__bridgepointSignupClarityV1072=true;

const PROJECT='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const AUTH=`${PROJECT}/auth/v1`;
const TRACK=`${PROJECT}/rest/v1/rpc/track_acquisition_event_v400`;
const params=new URLSearchParams(location.search);
const id=()=>globalThis.crypto?.randomUUID?.()||`bp-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const stored=(store,key)=>{try{let v=store.getItem(key);if(!v){v=id();store.setItem(key,v)}return v}catch(_){return id()}};
const visitorId=stored(localStorage,'bp_visitor_id_v421');
const sessionId=stored(sessionStorage,'bp_session_id_v421');
const referrerHost=(()=>{try{return document.referrer?new URL(document.referrer).hostname:null}catch(_){return null}})();
let signupViewTracked=false;
let formStartTracked=false;
let lastSignupEmail='';

function track(eventType,{errorCode=null,metadata={}}={}){
  try{
    fetch(TRACK,{method:'POST',keepalive:true,headers:{apikey:KEY,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({
      p_event_type:eventType,p_visitor_id:visitorId,p_session_id:sessionId,
      p_page_path:`${location.pathname}${location.search}`.slice(0,256),p_platform:'WEB',
      p_referrer_host:referrerHost,p_utm_source:params.get('utm_source'),p_utm_medium:params.get('utm_medium'),
      p_utm_campaign:params.get('utm_campaign'),p_utm_content:params.get('utm_content'),p_referral_code:params.get('ref'),
      p_auth_error_code:errorCode,p_metadata:{capture_version:1072,surface:'app_signup',...metadata}
    })}).catch(()=>{});
  }catch(_){ }
}
function errorCode(status,message){
  const s=String(message||'').toLowerCase();
  if(s.includes('already')||s.includes('registered'))return 'ALREADY_REGISTERED';
  if(s.includes('rate'))return 'RATE_LIMIT';
  if(s.includes('password'))return 'PASSWORD_REQUIREMENT';
  if(s.includes('legal'))return 'LEGAL_NOT_ACCEPTED';
  if(status===422)return 'INVALID_SIGNUP';
  if(status>=500)return 'AUTH_SERVER';
  return status?`HTTP_${status}`:'NETWORK';
}

const style=document.createElement('style');
style.id='bp1072-signup-style';
style.textContent=`
.bp1072-create-intro{margin:0 0 12px;padding:12px 13px;border:1px solid rgba(72,225,255,.24);border-radius:13px;background:rgba(72,225,255,.055)}.bp1072-create-intro b{display:block;font-size:13px;color:#fff}.bp1072-create-intro span{display:block;margin-top:4px;color:#b8c9d7;font-size:10.5px;line-height:1.5}.bp1072-create-intro em{font-style:normal;color:#72e9ff;font-weight:1000}.bp1072-confirm{display:grid;gap:13px;padding:7px 2px 2px}.bp1072-confirm[hidden]{display:none}.bp1072-check{width:54px;height:54px;border-radius:17px;display:grid;place-items:center;background:rgba(77,225,164,.12);border:1px solid rgba(77,225,164,.28);color:#71ecb5;font-size:28px;font-weight:1000}.bp1072-step{font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:#72e9ff;font-weight:1000}.bp1072-confirm h2{margin:0;font-size:25px;line-height:1.05}.bp1072-confirm p{margin:0;color:#a9bdcc;font-size:12px;line-height:1.55}.bp1072-email{display:block;margin-top:4px;color:#fff;word-break:break-word}.bp1072-steps{margin:0;padding:12px 12px 12px 30px;border:1px solid rgba(255,255,255,.08);border-radius:13px;background:#081726;color:#dbe7ef;font-size:11.5px;line-height:1.55}.bp1072-steps li+li{margin-top:6px}.bp1072-actions{display:grid;gap:8px}.bp1072-actions button{min-height:48px;border-radius:12px;padding:0 14px;font-weight:1000;cursor:pointer}.bp1072-resend{border:1px solid rgba(255,255,255,.14);background:#11243a;color:#fff}.bp1072-signin{border:0;background:linear-gradient(135deg,#48e1ff,#6c83ff);color:#031018}.bp1072-resend:disabled{opacity:.58;cursor:default}.bp1072-resend-state{min-height:16px;color:#82efbd;font-size:10.5px}.bp1054-legal-head b{font-size:12.5px!important}.bp1054-legal-head small{font-size:9.5px!important;line-height:1.45}.bp1054-legal{border-color:rgba(255,201,94,.28)!important;background:rgba(255,201,94,.06)!important}.bp1054-accept{padding:9px;border-radius:10px;background:rgba(255,255,255,.035)}
`;
document.head.appendChild(style);

function root(){return document.getElementById('bp1046-auth')}
function createActive(r=root()){return !!r?.querySelector('[data-mode="create"]')?.classList.contains('active')}
function enhance(){
  const r=root();if(!r)return;
  const active=createActive(r);
  const normal=r.querySelector('[data-normal]');
  if(normal&&!normal.querySelector('.bp1072-create-intro')){
    const intro=document.createElement('div');intro.className='bp1072-create-intro';intro.hidden=true;intro.innerHTML='<b>Two quick steps to activate BridgePoint</b><span><em>1.</em> Create your account and accept the required terms below. <em>2.</em> We email you a verification link. Open that email and confirm your address before signing in.</span>';
    const rec=normal.querySelector('[data-rec]');(rec?.parentElement||normal).insertBefore(intro,rec||normal.firstChild);
  }
  const intro=normal?.querySelector('.bp1072-create-intro');if(intro&&intro.hidden===active)intro.hidden=!active;
  const submit=r.querySelector('[data-submit]');
  const submitLabel='Create account & send verification email';
  if(submit&&active&&!submit.disabled&&submit.textContent!==submitLabel)submit.textContent=submitLabel;
  const gate=r.querySelector('.bp1054-legal');
  if(gate){
    const b=gate.querySelector('.bp1054-legal-head b'),small=gate.querySelector('.bp1054-legal-head small');
    const title='Required terms — one checkbox';
    const copy='Review the five BridgePoint disclosures below, then check the single box to accept them and continue. You can expand any item to read it here.';
    if(b&&b.textContent!==title)b.textContent=title;
    if(small&&small.textContent!==copy)small.textContent=copy;
  }
  if(active&&!signupViewTracked){signupViewTracked=true;track('SIGNUP_VIEW',{metadata:{variant:'two_step_email_confirmation_v1072'}})}
}

function confirmationPanel(r){
  let panel=r.querySelector('[data-bp1072-confirm]');if(panel)return panel;
  panel=document.createElement('section');panel.className='bp1072-confirm';panel.hidden=true;panel.dataset.bp1072Confirm='1';
  panel.innerHTML=`<div class="bp1072-check">✓</div><div class="bp1072-step">Step 2 of 2</div><h2>Check your email to finish.</h2><p>Your account was created. We sent a verification link to:<strong class="bp1072-email" data-bp1072-email></strong></p><ol class="bp1072-steps"><li>Open the verification email from BridgePoint.</li><li>Tap the confirmation link in that email.</li><li>Come back to BridgePoint and sign in with the password you just created.</li></ol><p>If you do not see it, check Spam, Junk, Promotions, or wait a minute before resending.</p><div class="bp1072-actions"><button class="bp1072-resend" type="button" data-bp1072-resend>Resend verification email</button><button class="bp1072-signin" type="button" data-bp1072-signin>I confirmed my email — sign in</button></div><div class="bp1072-resend-state" data-bp1072-resend-state></div>`;
  r.querySelector('.bp1046a-card')?.appendChild(panel);
  panel.querySelector('[data-bp1072-signin]').onclick=()=>{
    panel.hidden=true;
    r.querySelector('[data-normal]')?.classList.remove('hidden');
    r.querySelector('[data-mode="signin"]')?.click();
    const email=r.querySelector('[name=email]');if(email&&lastSignupEmail)email.value=lastSignupEmail;
    setTimeout(()=>email?.focus(),60);
  };
  panel.querySelector('[data-bp1072-resend]').onclick=()=>resend(panel);
  return panel;
}
function showConfirmation(email){
  const r=root();if(!r)return;
  lastSignupEmail=String(email||lastSignupEmail||'').trim();
  const panel=confirmationPanel(r);const emailEl=panel.querySelector('[data-bp1072-email]');if(emailEl)emailEl.textContent=lastSignupEmail||'the email address you entered';
  r.querySelector('[data-normal]')?.classList.add('hidden');
  r.querySelector('[data-recovery]')?.classList.remove('show');
  panel.hidden=false;r.classList.add('show');
  panel.querySelector('[data-bp1072-resend-state]').textContent='';
  panel.querySelector('[data-bp1072-signin]')?.focus();
}
async function resend(panel){
  const email=String(lastSignupEmail||root()?.querySelector('[name=email]')?.value||'').trim();
  const state=panel.querySelector('[data-bp1072-resend-state]'),button=panel.querySelector('[data-bp1072-resend]');
  if(!email){state.textContent='Enter your email on the Sign in screen first.';return;}
  button.disabled=true;button.textContent='Sending…';state.textContent='';
  track('VALUE_VIEW',{metadata:{action:'resend_signup_confirmation'}});
  try{
    const response=await baseFetch(`${AUTH}/resend`,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${KEY}`,'Content-Type':'application/json'},body:JSON.stringify({type:'signup',email}),cache:'no-store'});
    if(!response.ok){const d=await response.json().catch(()=>({}));throw new Error(d?.msg||d?.message||`HTTP ${response.status}`)}
    state.textContent='Verification email sent again. Check your inbox and spam folder.';button.textContent='Sent — resend again';
  }catch(_){state.textContent='Could not resend yet. Wait a moment and try again.';button.textContent='Resend verification email';}
  setTimeout(()=>{button.disabled=false},12000);
}

const baseFetch=window.fetch.bind(window);
window.fetch=async function(input,init={}){
  let url='';try{url=typeof input==='string'?input:input?.url||''}catch(_){}
  const signup=/\/auth\/v1\/signup(?:\?|$)/.test(url);
  if(!signup)return baseFetch(input,init);
  const r=root();lastSignupEmail=String(r?.querySelector('[name=email]')?.value||'').trim();
  track('SIGNUP_SUBMIT',{metadata:{variant:'two_step_email_confirmation_v1072'}});
  try{
    const response=await baseFetch(input,init);
    const copy=response.clone();const data=await copy.json().catch(()=>({}));
    if(response.ok){
      const verificationRequired=!data?.access_token;
      track('SIGNUP_SUCCESS',{metadata:{verification_required:verificationRequired,variant:'two_step_email_confirmation_v1072'}});
      if(verificationRequired)setTimeout(()=>showConfirmation(lastSignupEmail),0);
    }else{
      const message=data?.msg||data?.message||data?.error_description||'';
      track('SIGNUP_ERROR',{errorCode:errorCode(response.status,message),metadata:{http_status:response.status,variant:'two_step_email_confirmation_v1072'}});
    }
    return response;
  }catch(e){track('SIGNUP_ERROR',{errorCode:'NETWORK',metadata:{variant:'two_step_email_confirmation_v1072'}});throw e;}
};

document.addEventListener('input',e=>{
  const r=root();if(!r||!r.contains(e.target)||!createActive(r)||formStartTracked)return;
  if(!(e.target instanceof HTMLInputElement))return;
  formStartTracked=true;track('SIGNUP_FORM_START',{metadata:{variant:'two_step_email_confirmation_v1072',field_type:e.target.type||'input'}});
},{capture:true});
document.addEventListener('click',e=>{if(e.target instanceof Element&&e.target.closest('#bp1046-auth [data-mode]'))setTimeout(enhance,0)},true);
const mo=new MutationObserver(enhance);mo.observe(document.documentElement,{childList:true,subtree:true});
setTimeout(enhance,80);
})();
