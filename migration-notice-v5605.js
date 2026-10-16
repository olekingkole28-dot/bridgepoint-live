(() => {
  'use strict';
  const DEFAULT_BASE='https://xdfsjztwgsbmabshzsjw.supabase.co';
  const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
  const BASE=window.__BP_API_BASE__||DEFAULT_BASE;
  const RPC=BASE+'/rest/v1/rpc/bridgepoint_public_migration_notice_v5605';
  let failures=0;

  function ensureBanner(){
    let el=document.getElementById('bpMigrationNoticeV5605');
    if(el)return el;
    const style=document.createElement('style');
    style.textContent='.bp-migration-notice-v5605{position:relative;z-index:99999;display:flex;gap:10px;align-items:flex-start;padding:9px 14px;background:#10283a;color:#eaf8ff;border-bottom:1px solid rgba(85,221,248,.24);font:700 12px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.bp-migration-notice-v5605[hidden]{display:none}.bp-migration-notice-v5605 b{color:#55ddf8}.bp-migration-notice-v5605 small{display:block;color:#aac1cf;font-weight:600;margin-top:2px}.bp-migration-notice-v5605 button{margin-left:auto;border:0;background:transparent;color:#aac1cf;font-size:18px;cursor:pointer}@media(max-width:640px){.bp-migration-notice-v5605{font-size:11px;padding:8px 10px}}';
    document.head.appendChild(style);
    el=document.createElement('div');
    el.id='bpMigrationNoticeV5605';
    el.className='bp-migration-notice-v5605';
    el.hidden=true;
    el.innerHTML='<div>⚙️</div><div><b id="bpMigrationTitleV5605">Infrastructure migration in progress</b><small id="bpMigrationTextV5605"></small></div><button type="button" aria-label="Dismiss migration notice">×</button>';
    el.querySelector('button').onclick=()=>{el.hidden=true;sessionStorage.setItem('bp_migration_notice_dismissed_v5605','1')};
    document.body.insertBefore(el,document.body.firstChild);
    return el;
  }

  function show(title,message){
    if(sessionStorage.getItem('bp_migration_notice_dismissed_v5605')==='1')return;
    const el=ensureBanner();
    const t=document.getElementById('bpMigrationTitleV5605');
    const m=document.getElementById('bpMigrationTextV5605');
    if(t)t.textContent=title;
    if(m)m.textContent=message;
    el.hidden=false;
  }

  async function refresh(){
    try{
      const r=await fetch(RPC,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json','Accept':'application/json'},body:'{}',cache:'no-store'});
      if(!r.ok)throw new Error('HTTP '+r.status);
      const d=await r.json();
      failures=0;
      const el=ensureBanner();
      if(d?.show_notice===true){
        show(d.title||'Infrastructure migration in progress',d.message||'Some live features may briefly retry while BridgePoint moves infrastructure.');
      }else{
        el.hidden=true;
        sessionStorage.removeItem('bp_migration_notice_dismissed_v5605');
      }
    }catch(_){
      failures++;
      if(failures>=2){
        show('BridgePoint maintenance in progress','Our infrastructure migration is still underway. Some live map or account features may be temporarily unavailable; please retry shortly.');
      }
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{ensureBanner();refresh();setInterval(refresh,30000)},{once:true});
  else{ensureBanner();refresh();setInterval(refresh,30000)}
})();