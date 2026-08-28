(()=>{
  'use strict';
  if(window.__bridgepointLiveHomeV972)return;
  window.__bridgepointLiveHomeV972=true;

  const API='https://xdfsjztwgsbmabshzsjw.supabase.co';
  const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
  const RPC=`${API}/rest/v1/rpc/`;
  const ID='bp-live-home-v972';
  const nf=new Intl.NumberFormat('en-US');
  const C=2*Math.PI*46;
  let previous=null;
  let token=null;
  let signedIn=false;
  let ownerVisible=false;
  let homeWanted=true;

  const fmt=n=>nf.format(Number(n||0));
  const pct=n=>`${Number(n||0).toFixed(Number(n||0)>=10?1:2)}%`;
  const delta=(next,key)=>previous?Number(next?.[key]||0)-Number(previous?.[key]||0):0;

  function findAccessToken(){
    const seen=new Set();
    const walk=v=>{
      if(v==null||seen.has(v))return null;
      if(typeof v==='object'){
        seen.add(v);
        if(typeof v.access_token==='string'&&v.access_token.length>30)return v.access_token;
        for(const x of Object.values(v)){const hit=walk(x);if(hit)return hit;}
      }
      return null;
    };
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i)||'';
        if(!/auth|supabase|sb-/i.test(k))continue;
        const raw=localStorage.getItem(k);if(!raw)continue;
        try{const hit=walk(JSON.parse(raw));if(hit)return hit;}catch(_){ }
      }
    }catch(_){ }
    return null;
  }

  async function validateSession(t){
    if(!t)return false;
    try{
      const r=await fetch(`${API}/auth/v1/user`,{headers:{apikey:KEY,Authorization:`Bearer ${t}`},cache:'no-store'});
      return r.ok;
    }catch(_){return false;}
  }

  async function rpc(name,t){
    const headers={apikey:KEY,Authorization:`Bearer ${t||KEY}`,'Content-Type':'application/json','Cache-Control':'no-cache'};
    const r=await fetch(`${RPC}${name}`,{method:'POST',headers,body:'{}',cache:'no-store'});
    if(!r.ok)throw new Error(`${name}:${r.status}`);
    return await r.json();
  }

  const css=document.createElement('style');
  css.id=`${ID}-style`;
  css.textContent=`
  #${ID}{position:fixed;z-index:2147483200;left:0;right:0;top:max(66px,env(safe-area-inset-top));bottom:max(78px,env(safe-area-inset-bottom));display:none;overflow:auto;overscroll-behavior:contain;background:radial-gradient(circle at 12% 8%,rgba(72,225,255,.09),transparent 29%),radial-gradient(circle at 92% 28%,rgba(108,131,255,.08),transparent 34%),#06111e;color:#f5f8fc;font:600 13px/1.38 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;box-sizing:border-box;padding:14px 14px 24px;scrollbar-width:none}
  #${ID}::-webkit-scrollbar{display:none}#${ID}.show{display:block}
  #${ID} *{box-sizing:border-box}#${ID} .bp-wrap{width:min(1180px,100%);margin:0 auto}
  #${ID} .bp-card{border:1px solid rgba(72,225,255,.14);border-radius:18px;background:rgba(10,25,42,.92);box-shadow:0 16px 40px rgba(0,0,0,.2)}
  #${ID} .bp-intro{padding:16px 17px;background:linear-gradient(135deg,rgba(10,25,42,.97),rgba(10,33,54,.96),rgba(16,24,46,.95));display:flex;gap:12px;align-items:flex-start}
  #${ID} .bp-intro p{margin:0;flex:1;font-size:14px;line-height:1.5;font-weight:760}#${ID} .bp-live{display:flex;align-items:center;gap:5px;flex:0 0 auto;padding:6px 8px;border-radius:999px;border:1px solid rgba(69,230,166,.24);background:rgba(69,230,166,.08);color:#45e6a6;font-size:9px;font-weight:950;letter-spacing:.6px}#${ID} .bp-dot{width:7px;height:7px;border-radius:50%;background:#45e6a6;box-shadow:0 0 12px rgba(69,230,166,.8);animation:bppulse 1.45s ease-in-out infinite}
  #${ID} .bp-head{display:flex;align-items:end;gap:10px;margin:14px 2px 9px}#${ID} .bp-head h2{font-size:18px;margin:0;font-weight:950;letter-spacing:.5px}#${ID} .bp-head p{margin:2px 0 0;color:#b5c6d9;font-size:10.5px}#${ID} .bp-head .bp-updated{margin-left:auto;color:#45e6a6;font-size:9.5px;font-weight:900;white-space:nowrap}
  #${ID} .bp-completion{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}#${ID} .bp-complete{padding:13px;display:grid;grid-template-columns:92px 1fr;gap:10px;align-items:center}#${ID} .bp-donut{width:88px;height:88px;position:relative}#${ID} .bp-donut svg{width:88px;height:88px;transform:rotate(-90deg)}#${ID} .bp-donut circle{fill:none;stroke-width:9}#${ID} .bp-donut .bg{stroke:rgba(255,255,255,.06)}#${ID} .bp-donut .fg{stroke-linecap:round;stroke-dasharray:${C};stroke-dashoffset:${C};transition:stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1)}#${ID} .cyan .fg{stroke:#48e1ff}#${ID} .green .fg{stroke:#45e6a6}#${ID} .blue .fg{stroke:#6c83ff}#${ID} .bp-center{position:absolute;inset:0;display:grid;place-content:center;text-align:center;font-size:16px;font-weight:950}#${ID} .bp-center small{display:block;color:#b5c6d9;font-size:7px;letter-spacing:.55px;margin-top:1px}
  #${ID} .bp-label{color:#b5c6d9;font-size:9px;font-weight:950;letter-spacing:.55px}#${ID} .bp-value{font-size:21px;font-weight:950;margin-top:3px;white-space:nowrap}#${ID} .bp-change{min-height:14px;color:#45e6a6;font-size:9px;font-weight:950;margin-top:2px}#${ID} .bp-detail{color:#b5c6d9;font-size:9.8px;margin-top:6px;line-height:1.3}#${ID} .bp-bar{height:7px;border-radius:999px;background:rgba(255,255,255,.06);overflow:hidden;margin-top:8px}#${ID} .bp-bar i{display:block;width:0;height:100%;border-radius:inherit;transition:width .8s cubic-bezier(.2,.8,.2,1)}#${ID} .cyan .bp-bar i{background:#48e1ff}#${ID} .green .bp-bar i{background:#45e6a6}#${ID} .blue .bp-bar i{background:#6c83ff}
  #${ID} .bp-counters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}#${ID} .bp-counter{padding:12px}#${ID} .bp-counter .bp-value{font-size:19px}#${ID} .bp-counter[data-color="cyan"]{border-color:rgba(72,225,255,.13)}#${ID} .bp-counter[data-color="purple"]{border-color:rgba(176,116,255,.14)}#${ID} .bp-counter[data-color="green"]{border-color:rgba(69,230,166,.13)}#${ID} .bp-counter[data-color="gold"]{border-color:rgba(255,201,94,.13)}
  #${ID} .bp-livefeed{padding:13px 14px;margin-top:9px}#${ID} .bp-feedrow{display:flex;align-items:center;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.035)}#${ID} .bp-feedrow:last-child{border-bottom:0}#${ID} .bp-feedname{flex:1;font-weight:850}#${ID} .bp-feeddelta{font-weight:950;color:#45e6a6}#${ID} .bp-watch{color:#8fa7bd;font-size:10px}
  #${ID} .bp-owner{display:none;margin-top:10px;padding:14px;border-color:rgba(255,201,94,.17)}#${ID}.owner .bp-owner{display:block}#${ID} .bp-owner h3{margin:0;font-size:16px}#${ID} .bp-owner-sub{color:#b5c6d9;font-size:10px;margin:2px 0 10px}#${ID} .bp-ownerstats{display:flex;flex-wrap:wrap;gap:6px}#${ID} .bp-ownerstat{padding:7px 9px;border:1px solid rgba(255,201,94,.13);border-radius:10px;background:rgba(255,201,94,.05)}#${ID} .bp-ownerstat b{display:block;color:#ffc95e;font-size:8px;letter-spacing:.45px}#${ID} .bp-ownerstat span{display:block;font-size:16px;font-weight:950;margin-top:2px}#${ID} .bp-ownerlabel{margin-top:10px;color:#ffc95e;font-size:8.5px;font-weight:950;letter-spacing:.5px}#${ID} .bp-chips{display:flex;flex-wrap:wrap;gap:5px;margin-top:5px}#${ID} .bp-chip{padding:5px 7px;border:1px solid rgba(255,255,255,.08);border-radius:999px;background:#10243a;font-size:10px}#${ID} .bp-signin{display:flex;gap:8px;padding:5px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:10px}#${ID} .bp-signin b{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#${ID} .bp-signin span{color:#b5c6d9;white-space:nowrap}
  #${ID} .bp-note{margin-top:10px;text-align:center;color:#8fa7bd;font-size:9.5px;line-height:1.4;padding:0 6px}
  @keyframes bppulse{0%,100%{opacity:.55;transform:scale(.85)}50%{opacity:1;transform:scale(1.13)}}
  @media(max-width:760px){#${ID}{padding:10px 10px 20px;top:max(66px,env(safe-area-inset-top));bottom:max(82px,env(safe-area-inset-bottom))}#${ID} .bp-intro{padding:14px}#${ID} .bp-intro p{font-size:12.4px}#${ID} .bp-completion{grid-template-columns:1fr}#${ID} .bp-complete{grid-template-columns:88px 1fr;padding:12px}#${ID} .bp-counters{grid-template-columns:repeat(2,minmax(0,1fr))}#${ID} .bp-value{font-size:19px}#${ID} .bp-head h2{font-size:16px}}
  `;
  document.head.appendChild(css);

  const root=document.createElement('section');
  root.id=ID;
  root.innerHTML=`<div class="bp-wrap">
    <div class="bp-card bp-intro"><p>BridgePoint is building the U.S. property intelligence network live. These are real production totals from Supabase—not demo numbers. Keep Home open and watch parcels, matching, scoring, signals, patterns and opportunities change as the system works.</p><div class="bp-live"><span class="bp-dot"></span>LIVE • 3 SEC</div></div>
    <div class="bp-head"><div><h2>Live national completion</h2><p>Production progress, updating while you watch.</p></div><div class="bp-updated" data-updated>connecting…</div></div>
    <div class="bp-completion">
      <div class="bp-card bp-complete cyan" data-complete="parcel"><div class="bp-donut"><svg viewBox="0 0 110 110"><circle class="bg" cx="55" cy="55" r="46"></circle><circle class="fg" cx="55" cy="55" r="46"></circle></svg><div class="bp-center"><span data-pct>—</span><small>COMPLETE</small></div></div><div><div class="bp-label">PARCEL INGESTION</div><div class="bp-value" data-value>—</div><div class="bp-change" data-delta></div><div class="bp-bar"><i></i></div><div class="bp-detail" data-detail>—</div></div></div>
      <div class="bp-card bp-complete green" data-complete="matching"><div class="bp-donut"><svg viewBox="0 0 110 110"><circle class="bg" cx="55" cy="55" r="46"></circle><circle class="fg" cx="55" cy="55" r="46"></circle></svg><div class="bp-center"><span data-pct>—</span><small>COMPLETE</small></div></div><div><div class="bp-label">MATCHING</div><div class="bp-value" data-value>—</div><div class="bp-change" data-delta></div><div class="bp-bar"><i></i></div><div class="bp-detail" data-detail>—</div></div></div>
      <div class="bp-card bp-complete blue" data-complete="scoring"><div class="bp-donut"><svg viewBox="0 0 110 110"><circle class="bg" cx="55" cy="55" r="46"></circle><circle class="fg" cx="55" cy="55" r="46"></circle></svg><div class="bp-center"><span data-pct>—</span><small>COMPLETE</small></div></div><div><div class="bp-label">SCORING COVERAGE</div><div class="bp-value" data-value>—</div><div class="bp-change" data-delta></div><div class="bp-bar"><i></i></div><div class="bp-detail" data-detail>—</div></div></div>
    </div>
    <div class="bp-head"><div><h2>Live intelligence output</h2><p>These counters move when production changes.</p></div></div>
    <div class="bp-counters">
      <div class="bp-card bp-counter" data-counter="signals" data-color="cyan"><div class="bp-label">SIGNALS</div><div class="bp-value">—</div><div class="bp-change"></div></div>
      <div class="bp-card bp-counter" data-counter="patterns" data-color="purple"><div class="bp-label">PATTERNS</div><div class="bp-value">—</div><div class="bp-change"></div></div>
      <div class="bp-card bp-counter" data-counter="opportunities" data-color="green"><div class="bp-label">OPPORTUNITIES</div><div class="bp-value">—</div><div class="bp-change"></div></div>
      <div class="bp-card bp-counter" data-counter="sources" data-color="gold"><div class="bp-label">REGISTERED SOURCES</div><div class="bp-value">—</div><div class="bp-change">live source registry</div></div>
    </div>
    <div class="bp-card bp-livefeed"><div class="bp-label" style="margin-bottom:5px">WHAT CHANGED THIS REFRESH</div><div data-feed></div></div>
    <div class="bp-card bp-owner" data-ownerbox><h3>Owner-only activity</h3><div class="bp-owner-sub">Private sign-in and account activity. Normal customers never receive this section.</div><div class="bp-ownerstats" data-ownerstats></div><div class="bp-ownerlabel">COARSE SIGN-IN REGIONS</div><div class="bp-chips" data-regions></div><div class="bp-ownerlabel">RECENT SIGN-INS</div><div data-signins></div><div class="bp-note" style="text-align:left;padding:0">Location is coarse browser-region telemetry around account/sign-in flows, not precise GPS location.</div></div>
    <div class="bp-note">Live production totals show what BridgePoint has actually ingested or produced. Coverage depth varies while the national build continues.</div>
  </div>`;

  const mount=()=>{if(document.body&&!document.getElementById(ID)){document.body.appendChild(root);return true}return false};
  if(!mount())document.addEventListener('DOMContentLoaded',mount,{once:true});

  function animateNumber(el,to){
    const from=Number(el.dataset.n||0),target=Number(to||0);el.dataset.n=String(target);
    if(!Number.isFinite(target)){el.textContent='—';return}
    const start=performance.now(),dur=650;
    const tick=now=>{const t=Math.min(1,(now-start)/dur),e=1-Math.pow(1-t,3);el.textContent=fmt(Math.round(from+(target-from)*e));if(t<1)requestAnimationFrame(tick)};
    requestAnimationFrame(tick);
  }
  function setProgress(name,percent,value,detail,d){
    const card=root.querySelector(`[data-complete="${name}"]`);if(!card)return;
    const p=Math.max(0,Math.min(100,Number(percent||0)));
    card.querySelector('[data-pct]').textContent=pct(p);
    const val=card.querySelector('[data-value]');
    if(typeof value==='number')animateNumber(val,value);else val.textContent=value;
    card.querySelector('.fg').style.strokeDashoffset=String(C*(1-p/100));
    card.querySelector('.bp-bar i').style.width=`${p}%`;
    card.querySelector('[data-detail]').textContent=detail;
    card.querySelector('[data-delta]').textContent=d>0?`+${fmt(d)} in the last 3 sec`:'LIVE PRODUCTION';
  }
  function setCounter(name,value,d){const card=root.querySelector(`[data-counter="${name}"]`);if(!card)return;animateNumber(card.querySelector('.bp-value'),value);const c=card.querySelector('.bp-change');if(name!=='sources')c.textContent=d>0?`+${fmt(d)} / 3 sec`:'live';}
  function renderFeed(data){
    const items=[['Parcels',delta(data,'total_parcels')],['Signals',delta(data,'signals')],['Scores',delta(data,'scored_properties')],['Patterns',delta(data,'detected_patterns')],['Opportunities',delta(data,'active_opportunities')]];
    root.querySelector('[data-feed]').innerHTML=items.map(([name,d])=>`<div class="bp-feedrow"><span class="bp-dot" style="width:6px;height:6px"></span><span class="bp-feedname">${name}</span>${d>0?`<span class="bp-feeddelta">+${fmt(d)}</span>`:`<span class="bp-watch">watching</span>`}</div>`).join('');
  }
  function renderPublic(data){
    if(!data||data.available!==true)return;
    setProgress('parcel',data.parcel_completion_pct,Number(data.total_parcels||0),`${fmt(data.total_parcels)} of ${fmt(data.national_target_parcels)} strict U.S. parcel floor`,delta(data,'total_parcels'));
    setProgress('matching',data.matching_completion_pct,`${fmt(data.matching_states_complete)} / ${fmt(data.matching_states_total)}`,'Jurisdictions through the normalize + match quality gate',delta(data,'matching_states_complete'));
    setProgress('scoring',data.scoring_coverage_pct,Number(data.scored_properties||0),'Scored properties as a share of currently ingested parcels',delta(data,'scored_properties'));
    setCounter('signals',data.signals,delta(data,'signals'));setCounter('patterns',data.detected_patterns,delta(data,'detected_patterns'));setCounter('opportunities',data.active_opportunities,delta(data,'active_opportunities'));setCounter('sources',data.registered_sources,0);
    renderFeed(data);
    root.querySelector('[data-updated]').textContent=`updated ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'})}`;
    previous=data;
  }
  function renderOwner(data){
    if(!data||data.available!==true){root.classList.remove('owner');ownerVisible=false;return}
    ownerVisible=true;root.classList.add('owner');
    const stats=[['USERS',data.total_users],['ACTIVE 15M',data.active_users_15m],['SIGN-INS 24H',data.signins_24h],['SIGNUPS 24H',data.signups_24h]];
    root.querySelector('[data-ownerstats]').innerHTML=stats.map(([k,v])=>`<div class="bp-ownerstat"><b>${k}</b><span>${fmt(v)}</span></div>`).join('');
    const regions=(Array.isArray(data.signin_flow_regions_24h)?data.signin_flow_regions_24h:[]).filter(x=>x&&x.region_code&&x.region_code!=='UNKNOWN').slice(0,10);
    root.querySelector('[data-regions]').innerHTML=regions.length?regions.map(x=>`<span class="bp-chip">${String(x.region_code)} • ${fmt(x.visitors)}</span>`).join(''):'<span class="bp-watch">No coarse region telemetry yet.</span>';
    const signins=(Array.isArray(data.recent_signins)?data.recent_signins:[]).slice(0,5);
    root.querySelector('[data-signins]').innerHTML=signins.length?signins.map(x=>`<div class="bp-signin"><b>${String(x.email||'Account').replace(/</g,'&lt;')}</b><span>${x.last_sign_in_at?new Date(x.last_sign_in_at).toLocaleString([], {month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'}):'—'}</span></div>`).join(''):'<div class="bp-watch">No recent authenticated sign-ins returned.</div>';
  }

  function setVisible(v){homeWanted=!!v;root.classList.toggle('show',signedIn&&homeWanted)}
  function semanticHome(){
    try{
      const els=[...document.querySelectorAll('[aria-selected="true"],[aria-current="page"],[aria-label]')];
      for(const e of els){const s=`${e.getAttribute('aria-label')||''} ${e.textContent||''}`.trim().toLowerCase();if(!s)continue;if(/\bhome\b/.test(s)&&(e.getAttribute('aria-selected')==='true'||e.getAttribute('aria-current')==='page'))return true;if(/\b(map|properties|worth|more|work|plans|search|opportunities)\b/.test(s)&&(e.getAttribute('aria-selected')==='true'||e.getAttribute('aria-current')==='page'))return false;}
    }catch(_){ }
    return null;
  }
  document.addEventListener('pointerup',e=>{
    if(innerWidth<900&&e.clientY>innerHeight-125){const i=Math.max(0,Math.min(4,Math.floor(e.clientX/(innerWidth/5))));setTimeout(()=>setVisible(i===0),80);}
  },true);
  setInterval(()=>{const s=semanticHome();if(s!==null)setVisible(s)},900);

  async function refresh(){
    if(!signedIn||!homeWanted)return;
    try{renderPublic(await rpc('bridgepoint_public_system_pulse_v957'))}catch(_){ }
    if(token){try{renderOwner(await rpc('bridgepoint_owner_live_activity_v958',token))}catch(_){if(ownerVisible){root.classList.remove('owner');ownerVisible=false}}}
  }
  async function boot(){
    token=findAccessToken();signedIn=await validateSession(token);setVisible(true);if(!signedIn)return;await refresh();setInterval(()=>{if(!document.hidden)refresh()},3000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
  }
  setTimeout(boot,700);
})();
