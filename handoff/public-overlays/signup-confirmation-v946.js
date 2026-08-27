(()=>{
  'use strict';
  const ID='bp-signup-help-v946';
  const DISMISSED='bp-signup-help-v946-dismissed';
  const authPresent=()=>{
    try{
      for(let i=0;i<localStorage.length;i++){
        const key=localStorage.key(i)||'';
        const value=localStorage.getItem(key)||'';
        if((/supabase|auth/i.test(key)||/access_token/.test(value))&&/access_token|refresh_token|expires_at/.test(value)) return true;
      }
    }catch(_){ }
    return false;
  };
  if(authPresent()||sessionStorage.getItem(DISMISSED)==='1') return;

  const show=()=>{
    if(authPresent()||document.getElementById(ID)) return;
    const note=document.createElement('aside');
    note.id=ID;
    note.setAttribute('role','status');
    note.innerHTML=`<div class="bp946-dot" aria-hidden="true"></div><div class="bp946-copy"><strong>Creating a BridgePoint account?</strong><span>After you create it, check your email and confirm the account before signing in. If the email is still arriving, give it a moment before requesting another.</span></div><button type="button" aria-label="Dismiss account guidance">×</button>`;
    const style=document.createElement('style');
    style.id=`${ID}-style`;
    style.textContent=`#${ID}{position:fixed;right:max(14px,env(safe-area-inset-right));top:max(14px,env(safe-area-inset-top));z-index:2147483590;width:min(430px,calc(100vw - 28px));display:flex;align-items:flex-start;gap:10px;padding:13px 14px;border:1px solid rgba(72,225,255,.34);border-radius:14px;background:rgba(7,20,35,.97);color:#f5f8fc;box-shadow:0 18px 55px rgba(0,0,0,.42);backdrop-filter:blur(16px);font:600 12px/1.4 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box}#${ID} .bp946-dot{width:9px;height:9px;border-radius:50%;margin-top:4px;flex:0 0 auto;background:#48e1ff;box-shadow:0 0 14px rgba(72,225,255,.6)}#${ID} .bp946-copy{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}#${ID} strong{font-size:12.5px}#${ID} span{color:#b5c6d9;font-weight:550}#${ID} button{border:0;background:transparent;color:#b5c6d9;font:800 22px/1 system-ui;cursor:pointer;padding:0 0 3px 6px}@media(max-width:620px){#${ID}{top:auto;right:12px;left:12px;bottom:max(12px,env(safe-area-inset-bottom));width:auto}}`;
    document.head.appendChild(style);
    document.body.appendChild(note);
    const dismiss=()=>{sessionStorage.setItem(DISMISSED,'1');note.remove();style.remove();};
    note.querySelector('button')?.addEventListener('click',dismiss);
    const watch=setInterval(()=>{if(authPresent()){clearInterval(watch);dismiss();}},1500);
    setTimeout(()=>{clearInterval(watch);if(document.getElementById(ID)) dismiss();},45000);
  };

  const arm=()=>setTimeout(show,250);
  document.addEventListener('click',event=>{
    const target=event.target instanceof Element?event.target.closest('.bp941-enter,#bp941-enter'):null;
    if(target) arm();
  },true);
})();
