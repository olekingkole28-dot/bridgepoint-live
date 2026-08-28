(()=>{
  'use strict';
  if(window.__bridgepointLiveSystemV961) return;
  window.__bridgepointLiveSystemV961=true;

  const ID='bp-live-system-v961';
  const API='https://xdfsjztwgsbmabshzsjw.supabase.co/rest/v1/rpc/';
  const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
  const nf=new Intl.NumberFormat('en-US');
  let ownerLoaded=false;
  let lastPublic=null;

  const definitions={
    total_parcels:['U.S. parcels','Canonical U.S. property/parcel records currently loaded into BridgePoint. Coverage depth varies by state and source.'],
    ingested_source_records:['Ingested','Source records processed by BridgePoint ingestion. This is not the same as unique properties.'],
    scored_properties:['Scores','Properties with BridgePoint scoring output available in the production scoring system.'],
    detected_patterns:['Patterns','Cross-signal patterns BridgePoint has detected from linked evidence. A pattern is not proof of an outcome.'],
    signals:['Signals','Source-linked intelligence observations connected to properties or geographic context.'],
    active_opportunities:['Opportunities','Properties currently prioritized by evidence gates for review. An opportunity is not a guaranteed job, loss, sale or claim.'],
    registered_sources:['Sources','Data sources registered with BridgePoint. Source freshness and geographic depth vary.'],
  };

  const css=document.createElement('style');
  css.id=`${ID}-style`;
  css.textContent=`
    #${ID}{position:fixed;z-index:2147483570;left:50%;transform:translateX(-50%);top:max(58px,calc(env(safe-area-inset-top) + 58px));width:min(1220px,calc(100vw - 20px));min-height:42px;display:flex;align-items:center;gap:7px;padding:6px 8px;border:1px solid rgba(72,225,255,.25);border-radius:13px;background:rgba(5,16,29,.955);box-shadow:0 12px 34px rgba(0,0,0,.36);backdrop-filter:blur(16px);font:700 10px/1.15 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff;box-sizing:border-box;overflow-x:auto;overflow-y:hidden;scrollbar-width:none}
    #${ID}::-webkit-scrollbar{display:none}
    #${ID} .bp961-live{display:flex;align-items:center;gap:7px;flex:0 0 auto;padding:0 5px 0 2px;color:#b7c9da;font-weight:900;letter-spacing:.8px}
    #${ID} .bp961-dot{width:8px;height:8px;border-radius:50%;background:#45e6a6;box-shadow:0 0 12px rgba(69,230,166,.8);animation:bp961pulse 1.7s ease-in-out infinite}
    #${ID} .bp961-metric{flex:0 0 auto;display:flex;align-items:baseline;gap:5px;padding:7px 9px;border-radius:10px;background:rgba(16,36,58,.88);border:1px solid rgba(255,255,255,.055);cursor:pointer;color:inherit;font:inherit}
    #${ID} .bp961-metric:hover,#${ID} .bp961-metric:focus-visible{border-color:rgba(72,225,255,.35);outline:none;background:rgba(20,45,70,.96)}
    #${ID} .bp961-label{color:#8fa7bd;font-size:8.7px;font-weight:900;letter-spacing:.55px;text-transform:uppercase}
    #${ID} .bp961-value{font-size:12.2px;font-weight:950;color:#f5f8fc;white-space:nowrap}
    #${ID} .bp961-depth{border-color:rgba(72,225,255,.14)}
    #${ID} .bp961-owner{display:none;align-items:center;gap:6px;flex:0 0 auto;margin-left:auto;padding-left:8px;border-left:1px solid rgba(255,201,94,.22)}
    #${ID}.bp961-owner-ready .bp961-owner{display:flex}
    #${ID} .bp961-owner .bp961-metric{border-color:rgba(255,201,94,.13)}
    #${ID} .bp961-owner .bp961-label{color:#d9bb68}
    #bp961-dialog{position:fixed;z-index:2147483600;inset:0;display:none;place-items:center;padding:18px;background:rgba(2,8,14,.76);backdrop-filter:blur(10px);font:500 13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
    #bp961-dialog.show{display:grid}
    #bp961-dialog .bp961-card{width:min(760px,100%);max-height:min(76vh,720px);overflow:auto;border-radius:18px;border:1px solid rgba(72,225,255,.23);background:#0b1929;box-shadow:0 28px 80px rgba(0,0,0,.55);padding:18px;box-sizing:border-box}
    #bp961-dialog .bp961-title{font-size:19px;font-weight:950}.bp961-copy{margin-top:7px;color:#b5c6d9;line-height:1.5}.bp961-state-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(118px,1fr));gap:7px;margin-top:14px}.bp961-state{padding:10px;border-radius:11px;background:#10243a;border:1px solid rgba(72,225,255,.09)}.bp961-state b{display:block;color:#48e1ff;font-size:11px}.bp961-state span{display:block;margin-top:3px;font-size:14px;font-weight:900}.bp961-actions{display:flex;justify-content:flex-end;margin-top:16px}.bp961-actions button{min-height:42px;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#12243a;color:#fff;padding:0 14px;font-weight:850;cursor:pointer}
    @keyframes bp961pulse{0%,100%{opacity:.58;transform:scale(.84)}50%{opacity:1;transform:scale(1.12)}}
    @media(max-width:780px){#${ID}{top:max(55px,calc(env(safe-area-inset-top) + 55px));width:calc(100vw - 12px);min-height:38px;padding:4px 5px;border-radius:11px;gap:5px}#${ID} .bp961-live{padding-right:2px;font-size:9px}#${ID} .bp961-metric{padding:6px 7px;gap:4px}#${ID} .bp961-label{font-size:7.8px}#${ID} .bp961-value{font-size:11px}#bp961-dialog{padding:10px}#bp961-dialog .bp961-card{padding:15px}}
    @media print{#${ID},#bp961-dialog{display:none!important}}
  `;
  document.head.appendChild(css);

  const bar=document.createElement('aside');
  bar.id=ID;
  bar.setAttribute('role','status');
  bar.setAttribute('aria-live','polite');
  bar.innerHTML=`
    <div class="bp961-live"><span class="bp961-dot" aria-hidden="true"></span><span>LIVE BRIDGEPOINT</span></div>
    ${Object.keys(definitions).map(k=>`<button type="button" class="bp961-metric" data-k="${k}"><span class="bp961-label">${definitions[k][0]}</span><span class="bp961-value">—</span></button>`).join('')}
    <button type="button" class="bp961-metric bp961-depth" data-depth><span class="bp961-label">U.S. depth</span><span class="bp961-value" data-depth-value>—</span></button>
    <div class="bp961-owner">
      <button type="button" class="bp961-metric" data-owner-help="users"><span class="bp961-label">Users</span><span class="bp961-value" data-owner="total_users">—</span></button>
      <button type="button" class="bp961-metric" data-owner-help="signups"><span class="bp961-label">Signups 24h</span><span class="bp961-value" data-owner="signups_24h">—</span></button>
      <button type="button" class="bp961-metric" data-owner-help="active"><span class="bp961-label">Active 15m</span><span class="bp961-value" data-owner="active_users_15m">—</span></button>
      <button type="button" class="bp961-metric" data-owner-help="signins"><span class="bp961-label">Sign-ins 24h</span><span class="bp961-value" data-owner="signins_24h">—</span></button>
      <button type="button" class="bp961-metric" data-owner-help="regions"><span class="bp961-label">Coarse regions</span><span class="bp961-value" data-owner="regions">—</span></button>
    </div>`;

  const dialog=document.createElement('div');
  dialog.id='bp961-dialog';
  dialog.innerHTML='<div class="bp961-card"><div class="bp961-title" data-title></div><div class="bp961-copy" data-copy></div><div class="bp961-state-grid" data-states></div><div class="bp961-actions"><button type="button" data-close>Close</button></div></div>';

  const mount=()=>{
    if(!document.body) return false;
    if(!document.getElementById(ID)) document.body.appendChild(bar);
    if(!document.getElementById('bp961-dialog')) document.body.appendChild(dialog);
    return true;
  };
  if(!mount()) document.addEventListener('DOMContentLoaded',mount,{once:true});

  const compact=n=>{
    n=Number(n||0);
    if(n>=1e9) return `${(n/1e9).toFixed(n>=1e10?1:2)}B`;
    if(n>=1e6) return `${(n/1e6).toFixed(n>=1e7?1:2)}M`;
    if(n>=1e3) return `${(n/1e3).toFixed(n>=1e5?0:1)}K`;
    return nf.format(n);
  };

  function openInfo(title,copy,states){
    dialog.querySelector('[data-title]').textContent=title;
    dialog.querySelector('[data-copy]').textContent=copy;
    const grid=dialog.querySelector('[data-states]');
    grid.replaceChildren();
    if(Array.isArray(states)&&states.length){
      const sorted=[...states].sort((a,b)=>String(a.state_code||'').localeCompare(String(b.state_code||'')));
      for(const row of sorted){
        const el=document.createElement('div');el.className='bp961-state';
        const code=document.createElement('b');code.textContent=String(row.state_code||'—');
        const count=document.createElement('span');count.textContent=nf.format(Number(row.parcel_count||0));
        el.append(code,count);grid.appendChild(el);
      }
    }
    dialog.classList.add('show');
  }

  dialog.querySelector('[data-close]').addEventListener('click',()=>dialog.classList.remove('show'));
  dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.classList.remove('show')});
  bar.addEventListener('click',e=>{
    const metric=e.target.closest('[data-k]');
    if(metric){const k=metric.getAttribute('data-k');const d=definitions[k];if(d)openInfo(d[0],d[1]);return;}
    if(e.target.closest('[data-depth]')){
      openInfo('U.S. parcel depth','These are live canonical parcel/property counts by state or D.C. They show what BridgePoint currently has loaded, not a claim that every state is complete.',lastPublic?.parcel_states||[]);return;
    }
    const owner=e.target.closest('[data-owner-help]');
    if(owner){
      const key=owner.getAttribute('data-owner-help');
      const text={users:'Registered BridgePoint accounts. This owner-only metric is never exposed to normal customers.',signups:'New accounts created during the last 24 hours.',active:'Distinct authenticated users with recent session activity in the last 15 minutes.',signins:'Successful sign-in/session activity during the last 24 hours.',regions:'Coarse state/region telemetry associated with recent sign-in/account flow. It is not precise GPS location.'}[key]||'';
      openInfo('Owner activity',text);
    }
  });

  function renderPublic(data){
    if(!data||data.available!==true) return;
    lastPublic=data;
    for(const el of bar.querySelectorAll('[data-k]')){
      const key=el.getAttribute('data-k');
      const value=el.querySelector('.bp961-value');
      if(value) value.textContent=compact(data[key]);
      el.title=`${definitions[key][0]}: ${nf.format(Number(data[key]||0))}`;
    }
    const depth=bar.querySelector('[data-depth-value]');
    if(depth) depth.textContent=`${Number(data.states_present||0)} states/DC`;
    bar.title=`Live production totals • refresh target ${data.refresh_hint_seconds||5}s`;
  }

  function findAccessToken(){
    const seen=new Set();
    const walk=v=>{
      if(v==null||seen.has(v)) return null;
      if(typeof v==='object'){
        seen.add(v);
        if(typeof v.access_token==='string'&&v.access_token.length>30) return v.access_token;
        for(const x of Object.values(v)){const hit=walk(x);if(hit)return hit;}
      }
      return null;
    };
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i)||'';if(!/auth|supabase|sb-/i.test(k))continue;
        const raw=localStorage.getItem(k);if(!raw)continue;
        try{const hit=walk(JSON.parse(raw));if(hit)return hit;}catch(_){ }
      }
    }catch(_){ }
    return null;
  }

  async function rpc(name,token){
    const headers={'apikey':KEY,'Content-Type':'application/json','Cache-Control':'no-cache'};
    headers.Authorization=`Bearer ${token||KEY}`;
    const res=await fetch(`${API}${name}`,{method:'POST',headers,body:'{}',cache:'no-store'});
    if(!res.ok) throw new Error(`${name}:${res.status}`);
    return await res.json();
  }

  async function refreshPublic(){try{renderPublic(await rpc('bridgepoint_public_system_pulse_v957'));}catch(_){ }}
  async function refreshOwner(){
    const token=findAccessToken();if(!token)return;
    try{
      const data=await rpc('bridgepoint_owner_live_activity_v958',token);
      if(!data||data.available!==true)return;
      for(const key of ['total_users','signups_24h','active_users_15m','signins_24h']){
        const el=bar.querySelector(`[data-owner="${key}"]`);if(el)el.textContent=nf.format(Number(data[key]||0));
      }
      const regions=(Array.isArray(data.signin_flow_regions_24h)?data.signin_flow_regions_24h:[])
        .filter(x=>x&&x.region_code&&x.region_code!=='UNKNOWN').slice(0,5).map(x=>x.region_code).join(' • ');
      const regionEl=bar.querySelector('[data-owner="regions"]');if(regionEl)regionEl.textContent=regions||'—';
      bar.classList.add('bp961-owner-ready');ownerLoaded=true;
    }catch(_){if(ownerLoaded)bar.classList.remove('bp961-owner-ready');}
  }

  refreshPublic();refreshOwner();
  setInterval(()=>{if(!document.hidden){refreshPublic();refreshOwner();}},5000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden){refreshPublic();refreshOwner();}});
})();