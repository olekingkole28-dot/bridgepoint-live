(()=>{
  'use strict';
  if(window.__BP_FULL_REFRESH_V5535__)return;
  const VERSION=5535;
  const PERIOD_MS=5*60*1000;
  const BUSY_RETRY_MS=30*1000;
  const STORE_KEY='bridgepoint_full_refresh_state_v5535';
  let timer=0;
  let reloading=false;

  const api=window.__BP_FULL_REFRESH_V5535__={
    version:VERSION,
    periodMs:PERIOD_MS,
    busyRetryMs:BUSY_RETRY_MS,
    nextAt:Date.now()+PERIOD_MS,
    lastReason:null,
    reload:null
  };

  function currentMap(){
    return window.__BP_V5000_WORLD__?.map||window.__BP_LANDING_WORLD__?.map||null;
  }

  function activeFormBusy(){
    const a=document.activeElement;
    if(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&!a.disabled&&!a.readOnly)return true;
    const authIds=['authModal','authPanel'];
    return authIds.some(id=>{
      const el=document.getElementById(id);
      if(!el||el.hidden)return false;
      try{return getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'}catch(_){return false}
    });
  }

  function captureState(){
    const state={at:Date.now(),pathname:location.pathname,scrollY:window.scrollY||0,map:null,surface:null};
    try{
      const map=currentMap();
      if(map){
        const c=map.getCenter?.();
        if(c)state.map={lng:Number(c.lng),lat:Number(c.lat),zoom:Number(map.getZoom?.()||0),pitch:Number(map.getPitch?.()||0),bearing:Number(map.getBearing?.()||0)};
      }
      const active=document.querySelector('.map-surface.active[data-surface],.app-page[data-surface]:not([hidden])');
      if(active?.dataset?.surface)state.surface=active.dataset.surface;
      sessionStorage.setItem(STORE_KEY,JSON.stringify(state));
    }catch(_){}
  }

  function doReload(reason){
    if(reloading)return;
    reloading=true;
    api.lastReason=reason;
    captureState();
    try{
      navigator.serviceWorker?.getRegistration?.().then(r=>r?.update?.()).catch(()=>{});
    }catch(_){}
    location.reload();
  }

  function scheduledAttempt(){
    if(activeFormBusy()){
      api.nextAt=Date.now()+BUSY_RETRY_MS;
      timer=setTimeout(scheduledAttempt,BUSY_RETRY_MS);
      return;
    }
    doReload('interval');
  }

  function schedule(){
    clearTimeout(timer);
    api.nextAt=Date.now()+PERIOD_MS;
    timer=setTimeout(scheduledAttempt,PERIOD_MS);
  }

  function makeButton(surface){
    const b=document.createElement('button');
    b.type='button';
    b.className=(surface==='landing'?'ghost ':'icon-button ')+'bp-full-refresh-button';
    b.setAttribute('aria-label','Refresh BridgePoint now');
    b.title='Refresh BridgePoint now';
    b.innerHTML='<span class="bp-refresh-glyph" aria-hidden="true">↻</span><span class="bp-refresh-label">REFRESH</span>';
    b.addEventListener('click',()=>doReload('manual'));
    return b;
  }

  function addStyles(){
    if(document.getElementById('bp-full-refresh-v5535-style'))return;
    const s=document.createElement('style');
    s.id='bp-full-refresh-v5535-style';
    s.textContent='.bp-full-refresh-button{display:inline-flex!important;align-items:center;justify-content:center;gap:5px;white-space:nowrap}.bp-refresh-glyph{font-size:15px;line-height:1}.bp-refresh-label{font-size:inherit}@media(max-width:680px){.bp-full-refresh-button .bp-refresh-label{display:none}.topbar-actions .bp-full-refresh-button{min-width:32px;padding:8px 7px}.site-nav .bp-full-refresh-button{min-width:32px;padding:9px 8px}}';
    document.head.appendChild(s);
  }

  function mountButton(){
    addStyles();
    if(document.querySelector('.bp-full-refresh-button'))return;
    const landing=document.querySelector('.site-nav .actions');
    if(landing){landing.insertBefore(makeButton('landing'),landing.firstChild);return}
    const app=document.querySelector('.topbar-actions');
    if(app){
      const account=document.getElementById('accountButton');
      app.insertBefore(makeButton('app'),account||app.firstChild);
    }
  }

  function restoreState(){
    let state=null;
    try{
      state=JSON.parse(sessionStorage.getItem(STORE_KEY)||'null');
      sessionStorage.removeItem(STORE_KEY);
    }catch(_){state=null}
    if(!state||state.pathname!==location.pathname||Date.now()-Number(state.at||0)>120000)return;
    if(Number.isFinite(Number(state.scrollY)))setTimeout(()=>scrollTo(0,Number(state.scrollY)||0),250);
    if(state.surface&&state.surface!=='map'){
      setTimeout(()=>document.querySelector('[data-nav="'+CSS.escape(state.surface)+'"]')?.click(),1000);
    }
    if(state.map){
      const started=Date.now();
      const apply=()=>{
        const map=currentMap();
        if(map&&map.loaded?.()){
          try{map.jumpTo({center:[state.map.lng,state.map.lat],zoom:state.map.zoom,pitch:state.map.pitch,bearing:state.map.bearing})}catch(_){ }
          return;
        }
        if(Date.now()-started<30000)setTimeout(apply,250);
      };
      setTimeout(apply,500);
    }
  }

  api.reload=()=>doReload('api');
  const boot=()=>{mountButton();restoreState();schedule()};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
