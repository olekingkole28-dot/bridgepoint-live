// BridgePoint social signup v5602 — isolated from export/runtime workers.
(() => {
  'use strict';
  const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';
  const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
  const STORE='bp_auth_v5045';
  const REMEMBER='bp_auth_remember_v1';
  const PENDING='bp_oauth_pending_v5602';
  const $=id=>document.getElementById(id);

  function setMessage(message){
    const el=$('authMessage');
    if(el) el.textContent=message||'';
  }

  function captureOAuthHash(){
    if(!location.hash || !location.hash.includes('access_token=')) return false;
    const h=new URLSearchParams(location.hash.replace(/^#/,''));
    const access=h.get('access_token');
    if(!access) return false;
    const session={
      access_token:access,
      refresh_token:h.get('refresh_token')||'',
      expires_in:Number(h.get('expires_in')||3600),
      expires_at:Math.floor(Date.now()/1000)+Number(h.get('expires_in')||3600),
      token_type:h.get('token_type')||'bearer'
    };
    const remember=document.getElementById('authRemember')?.checked ?? (localStorage.getItem(REMEMBER)!=='false');
    const keep=remember?localStorage:sessionStorage,drop=remember?sessionStorage:localStorage;
    keep.setItem(STORE,JSON.stringify(session));
    drop.removeItem(STORE);
    history.replaceState(null,'',location.pathname+location.search);
    try{
      const p=JSON.parse(localStorage.getItem(PENDING)||'null');
      if(p?.provider){
        window.BridgePointAcquisition?.send?.('SOCIAL_AUTH_SUCCESS',{
          auth_surface: location.pathname.startsWith('/app')?'app':'landing',
          provider:p.provider
        });
      }
      localStorage.removeItem(PENDING);
    }catch(_){}
    return true;
  }

  function acceptedLegal(){
    const box=$('authLegalAccept');
    if(!box?.checked){
      setMessage('Accept the Terms of Use and Privacy Notice before continuing.');
      box?.focus();
      return false;
    }
    return true;
  }

  async function start(provider){
    if(!acceptedLegal()) return;
    const button=provider==='google'?$('authGoogle'):$('authApple');
    if(button) button.disabled=true;
    setMessage('Opening '+(provider==='google'?'Google':'Apple')+'…');
    const acceptedAt=new Date().toISOString();
    const remember=document.getElementById('authRemember')?.checked ?? true;
    localStorage.setItem(REMEMBER,String(remember));
    localStorage.setItem(PENDING,JSON.stringify({
      provider,remember,
      accepted_at:acceptedAt,
      terms_version:'2026-09-19',
      return_to: location.pathname.startsWith('/app')?'/app/':'/app/'
    }));
    window.BridgePointAcquisition?.send?.('SOCIAL_AUTH_START',{
      auth_surface: location.pathname.startsWith('/app')?'app':'landing',
      provider
    });
    const redirect=location.origin+(location.pathname.startsWith('/app')?'/app/':'/');
    const url=SUPA+'/auth/v1/authorize?provider='+encodeURIComponent(provider)+'&redirect_to='+encodeURIComponent(redirect);
    location.assign(url);
  }

  async function loadProviders(){
    const group=$('authSocial');
    if(!group) return;
    try{
      const r=await fetch(SUPA+'/auth/v1/settings',{headers:{apikey:KEY,Accept:'application/json'},cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      const ext=d?.external||{};
      const google=ext.google===true;
      const apple=ext.apple===true;
      const gb=$('authGoogle'),ab=$('authApple');
      if(gb){gb.hidden=!google;gb.disabled=false;}
      if(ab){ab.hidden=!apple;ab.disabled=false;}
      group.hidden=!(google||apple);
      group.dataset.providersReady=(google||apple)?'true':'false';
    }catch(_){
      group.hidden=true;
    }
  }

  function bind(){
    captureOAuthHash();
    $('authGoogle')?.addEventListener('click',()=>start('google'));
    $('authApple')?.addEventListener('click',()=>start('apple'));
    void loadProviders();
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
})();