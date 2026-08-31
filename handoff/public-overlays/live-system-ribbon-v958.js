(()=>{
  'use strict';
  if(window.__bridgepointLiveSystemV958) return;
  window.__bridgepointLiveSystemV958=true;

  const ID='bp-live-system-v958';
  const API='https://xdfsjztwgsbmabshzsjw.supabase.co/rest/v1/rpc/';
  const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
  const REFRESH_MS=3000;
  const nf=new Intl.NumberFormat('en-US');
  let lastPublic=null;
  let ownerLoaded=false;
  let publicLoading=false;
  let ownerLoading=false;

  const css=document.createElement('style');
  css.id=`${ID}-style`;
  css.textContent=`
    #${ID}{position:fixed;z-index:2147483570;left:50%;transform:translateX(-50%);top:max(58px,calc(env(safe-area-inset-top) + 58px));width:min(1180px,calc(100vw - 20px));min-height:42px;display:flex;align-items:center;gap:8px;padding:6px 8px;border:1px solid rgba(72,225,255,.25);border-radius:13px;background:rgba(5,16,29,.95);box-shadow:0 12px 34px rgba(0,0,0,.36);backdrop-filter:blur(16px);font:700 10px/1.15 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff;box-sizing:border-box;overflow-x:auto;overflow-y:hidden;scrollbar-width:none;pointer-events:none}
    #${ID}::-webkit-scrollbar{display:none}
    #${ID} .bp958-live{display:flex;align-items:center;gap:7px;flex:0 0 auto;padding:0 5px 0 2px;color:#b7c9da;font-weight:900;letter-spacing:.8px}
    #${ID} .bp958-dot{width:8px;height:8px;border-radius:50%;background:#45e6a6;box-shadow:0 0 12px rgba(69,230,166,.8);animation:bp958pulse 1.7s ease-in-out infinite}
    #${ID} .bp958-metric{flex:0 0 auto;display:flex;align-items:baseline;gap:5px;padding:7px 9px;border-radius:10px;background:rgba(16,36,58,.88);border:1px solid rgba(255,255,255,.055)}
    #${ID} .bp958-label{color:#8fa7bd;font-size:8.7px;font-weight:900;letter-spacing:.55px;text-transform:uppercase}
    #${ID} .bp958-value{font-size:12.2px;font-weight:950;color:#f5f8fc;white-space:nowrap}
    #${ID} .bp958-owner{display:none;align-items:center;gap:6px;flex:0 0 auto;margin-left:auto;padding-left:8px;border-left:1px solid rgba(255,201,94,.22)}
    #${ID}.bp958-owner-ready .bp958-owner{display:flex}
    #${ID} .bp958-owner .bp958-metric{border-color:rgba(255,201,94,.13)}
    #${ID} .bp958-owner .bp958-label{color:#d9bb68}
    @keyframes bp958pulse{0%,100%{opacity:.58;transform:scale(.84)}50%{opacity:1;transform:scale(1.12)}}
    @media(max-width:780px){#${ID}{top:max(55px,calc(env(safe-area-inset-top) + 55px));width:calc(100vw - 12px);min-height:38px;padding:4px 5px;border-radius:11px;gap:5px}#${ID} .bp958-live{padding-right:2px;font-size:9px}#${ID} .bp958-metric{padding:6px 7px;gap:4px}#${ID} .bp958-label{font-size:7.8px}#${ID} .bp958-value{font-size:11px}}
    @media print{#${ID}{display:none!important}}
  `;
  document.head.appendChild(css);

  const bar=document.createElement('aside');
  bar.id=ID;
  bar.setAttribute('role','status');
  bar.setAttribute('aria-live','polite');
  bar.innerHTML=`
    <div class="bp958-live"><span class="bp958-dot" aria-hidden="true"></span><span>LIVE BRIDGEPOINT</span></div>
    <div class="bp958-metric"><span class="bp958-label">U.S. parcels</span><span class="bp958-value" data-k="total_parcels">—</span></div>
    <div class="bp958-metric"><span class="bp958-label">Ingested</span><span class="bp958-value" data-k="ingested_source_records">—</span></div>
    <div class="bp958-metric"><span class="bp958-label">Scores</span><span class="bp958-value" data-k="scored_properties">—</span></div>
    <div class="bp958-metric"><span class="bp958-label">Patterns</span><span class="bp958-value" data-k="detected_patterns">—</span></div>
    <div class="bp958-metric"><span class="bp958-label">Signals</span><span class="bp958-value" data-k="signals">—</span></div>
    <div class="bp958-metric"><span class="bp958-label">Opportunities</span><span class="bp958-value" data-k="active_opportunities">—</span></div>
    <div class="bp958-metric"><span class="bp958-label">Sources</span><span class="bp958-value" data-k="registered_sources">—</span></div>
    <div class="bp958-owner">
      <div class="bp958-metric"><span class="bp958-label">Users</span><span class="bp958-value" data-owner="total_users">—</span></div>
      <div class="bp958-metric"><span class="bp958-label">Active 15m</span><span class="bp958-value" data-owner="active_users_15m">—</span></div>
      <div class="bp958-metric"><span class="bp958-label">Sign-ins 24h</span><span class="bp958-value" data-owner="signins_24h">—</span></div>
      <div class="bp958-metric"><span class="bp958-label">Coarse regions</span><span class="bp958-value" data-owner="regions">—</span></div>
    </div>`;

  const mount=()=>{
    if(!document.body) return false;
    if(!document.getElementById(ID)) document.body.appendChild(bar);
    return true;
  };
  if(!mount()) document.addEventListener('DOMContentLoaded',mount,{once:true});

  function compact(n){
    n=Number(n||0);
    if(n>=1e9) return `${(n/1e9).toFixed(n>=1e10?1:2)}B`;
    if(n>=1e6) return `${(n/1e6).toFixed(n>=1e7?1:2)}M`;
    if(n>=1e3) return `${(n/1e3).toFixed(n>=1e5?0:1)}K`;
    return nf.format(n);
  }

  function renderPublic(data){
    if(!data||data.available!==true) return;
    lastPublic=data;
    for(const el of bar.querySelectorAll('[data-k]')){
      const key=el.getAttribute('data-k');
      const raw=data[key];
      el.textContent=key==='registered_sources'||key==='active_opportunities'||key==='ingested_source_records'?nf.format(Number(raw||0)):compact(raw);
      el.title=nf.format(Number(raw||0));
    }
    bar.title=`Live production totals • ${nf.format(Number(data.total_parcels||0))} parcels across ${data.states_present||0} states/DC • refreshes every ${Math.round(REFRESH_MS/1000)}s`;
  }

  function findAccessToken(){
    const seen=new Set();
    const walk=(v)=>{
      if(v==null||seen.has(v)) return null;
      if(typeof v==='object'){
        seen.add(v);
        if(typeof v.access_token==='string'&&v.access_token.length>30) return v.access_token;
        for(const x of Object.values(v)){const hit=walk(x);if(hit)return hit;}
      }
      if(Array.isArray(v)){for(const x of v){const hit=walk(x);if(hit)return hit;}}
      return null;
    };
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i)||'';
        if(!/auth|supabase|sb-/i.test(k)) continue;
        const raw=localStorage.getItem(k);if(!raw)continue;
        try{const hit=walk(JSON.parse(raw));if(hit)return hit;}catch(_){ }
      }
    }catch(_){ }
    return null;
  }

  async function rpc(name,token){
    const headers={'apikey':KEY,'Content-Type':'application/json','Cache-Control':'no-cache'};
    headers.Authorization=`Bearer ${token||KEY}`;
    const res=await fetch(`${API}${name}?_=${Date.now()}`,{method:'POST',headers,body:'{}',cache:'no-store'});
    if(!res.ok) throw new Error(`${name}:${res.status}`);
    return await res.json();
  }

  async function refreshPublic(){
    if(publicLoading) return;
    publicLoading=true;
    try{renderPublic(await rpc('bridgepoint_public_system_pulse_v957'));}catch(_){ }
    finally{publicLoading=false;}
  }

  async function refreshOwner(){
    if(ownerLoading) return;
    const token=findAccessToken();
    if(!token) return;
    ownerLoading=true;
    try{
      const data=await rpc('bridgepoint_owner_live_activity_v958',token);
      if(!data||data.available!==true) return;
      for(const key of ['total_users','active_users_15m','signins_24h']){
        const el=bar.querySelector(`[data-owner="${key}"]`);if(el)el.textContent=nf.format(Number(data[key]||0));
      }
      const regions=(Array.isArray(data.signin_flow_regions_24h)?data.signin_flow_regions_24h:[])
        .filter(x=>x&&x.region_code&&x.region_code!=='UNKNOWN')
        .slice(0,4).map(x=>x.region_code).join(' • ');
      const regionEl=bar.querySelector('[data-owner="regions"]');if(regionEl)regionEl.textContent=regions||'—';
      bar.classList.add('bp958-owner-ready');
      ownerLoaded=true;
    }catch(_){
      if(ownerLoaded) bar.classList.remove('bp958-owner-ready');
    }finally{ownerLoading=false;}
  }

  refreshPublic();
  refreshOwner();
  setInterval(()=>{if(!document.hidden){refreshPublic();refreshOwner();}},REFRESH_MS);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshPublic();refreshOwner();}});
  window.addEventListener('focus',()=>{refreshPublic();refreshOwner()});
})();
