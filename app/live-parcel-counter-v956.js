(()=>{
  'use strict';
  if(window.__bridgepointParcelCounterV956) return;
  window.__bridgepointParcelCounterV956=true;

  const ID='bp-live-parcel-v956';
  const API='https://xdfsjztwgsbmabshzsjw.supabase.co/rest/v1/rpc/bridgepoint_public_parcel_progress_v956';
  const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
  const POLL_MS=3000;
  const nf=new Intl.NumberFormat('en-US');
  const pf=new Intl.NumberFormat('en-US',{maximumFractionDigits:1});
  let latest=null;
  let loading=false;

  const style=document.createElement('style');
  style.id=`${ID}-style`;
  style.textContent=`
    #${ID}{position:fixed;right:max(12px,env(safe-area-inset-right));bottom:max(86px,calc(env(safe-area-inset-bottom) + 86px));z-index:2147483575;display:flex;align-items:center;gap:9px;min-height:48px;padding:7px 12px 7px 10px;border:1px solid rgba(72,225,255,.34);border-radius:14px;background:rgba(6,18,31,.96);color:#fff;box-shadow:0 16px 50px rgba(0,0,0,.42);backdrop-filter:blur(16px);font:700 11px/1.15 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;box-sizing:border-box;max-width:min(360px,calc(100vw - 24px));text-align:left}
    #${ID}:hover{border-color:rgba(72,225,255,.68);transform:translateY(-1px)}
    #${ID} .bpv956-dot{width:9px;height:9px;border-radius:50%;flex:0 0 auto;background:#45e6a6;box-shadow:0 0 13px rgba(69,230,166,.8);animation:bpv956pulse 1.7s ease-in-out infinite}
    #${ID} .bpv956-copy{display:flex;flex-direction:column;gap:2px;min-width:0}
    #${ID} .bpv956-label{color:#91abc2;font-size:9.5px;font-weight:900;letter-spacing:.9px;white-space:nowrap}
    #${ID} .bpv956-value{font-size:15px;font-weight:950;letter-spacing:.2px;white-space:nowrap}
    #${ID} .bpv956-sub{color:#b5c6d9;font-size:9.5px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    #${ID}.bpv956-changed{animation:bpv956flash .65s ease-out}
    #bpv956-panel{position:fixed;inset:0;z-index:2147483595;display:none;place-items:center;padding:18px;background:rgba(1,7,13,.72);backdrop-filter:blur(10px);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}
    #bpv956-panel.show{display:grid}
    #bpv956-card{width:min(880px,100%);max-height:min(82vh,820px);overflow:hidden;display:flex;flex-direction:column;border:1px solid rgba(72,225,255,.28);border-radius:20px;background:#0a192a;box-shadow:0 28px 90px rgba(0,0,0,.58)}
    #bpv956-head{padding:18px 18px 13px;border-bottom:1px solid rgba(255,255,255,.08);display:flex;gap:12px;align-items:flex-start}
    #bpv956-head-copy{flex:1;min-width:0}#bpv956-title{font-size:19px;font-weight:950}#bpv956-meta{margin-top:4px;color:#9db1c4;font-size:11.5px;font-weight:650;line-height:1.45}
    #bpv956-close{border:0;background:transparent;color:#b5c6d9;font:900 26px/1 system-ui;cursor:pointer;padding:0 2px}
    #bpv956-summary{padding:12px 12px 0;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
    .bpv956-stat{padding:10px 11px;border-radius:12px;background:#0f2339;border:1px solid rgba(255,255,255,.06)}.bpv956-stat-label{color:#91abc2;font-size:9px;font-weight:900;letter-spacing:.6px;text-transform:uppercase}.bpv956-stat-value{margin-top:4px;font-size:15px;font-weight:950}.bpv956-stat-sub{margin-top:2px;color:#9db1c4;font-size:9px;font-weight:700}
    #bpv956-states{padding:12px;overflow:auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}
    .bpv956-state{padding:10px 11px;border-radius:12px;background:#0f2339;border:1px solid rgba(255,255,255,.06);font-size:11px}.bpv956-state-top{display:flex;justify-content:space-between;gap:8px}.bpv956-code{font-weight:950;color:#48e1ff}.bpv956-count{font-weight:850}.bpv956-state-sub{margin-top:4px;color:#9db1c4;font-size:9.5px;font-weight:700;line-height:1.35}
    @keyframes bpv956pulse{0%,100%{opacity:.65;transform:scale(.86)}50%{opacity:1;transform:scale(1.12)}}
    @keyframes bpv956flash{0%{box-shadow:0 0 0 0 rgba(69,230,166,.8),0 16px 50px rgba(0,0,0,.42)}100%{box-shadow:0 0 0 18px rgba(69,230,166,0),0 16px 50px rgba(0,0,0,.42)}}
    @media(max-width:760px){#${ID}{right:10px;bottom:max(82px,calc(env(safe-area-inset-bottom) + 82px));max-width:calc(100vw - 20px);min-height:43px;padding:6px 10px 6px 9px}#${ID} .bpv956-value{font-size:13.5px}#bpv956-summary{grid-template-columns:repeat(2,minmax(0,1fr))}#bpv956-states{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:430px){#${ID} .bpv956-sub{display:none}#bpv956-states{grid-template-columns:1fr}}
    @media print{#${ID},#bpv956-panel{display:none!important}}
  `;
  document.head.appendChild(style);

  const pulse=document.createElement('button');
  pulse.id=ID;
  pulse.type='button';
  pulse.setAttribute('aria-label','Open live U.S. parcel canonicalization progress');
  pulse.setAttribute('aria-live','polite');
  pulse.innerHTML='<span class="bpv956-dot" aria-hidden="true"></span><span class="bpv956-copy"><span class="bpv956-label">LIVE U.S. CANONICAL PARCELS</span><span class="bpv956-value">Loading…</span><span class="bpv956-sub">Canonicalization + backlog • refreshes every 3s</span></span>';

  const panel=document.createElement('div');
  panel.id='bpv956-panel';
  panel.setAttribute('role','dialog');
  panel.setAttribute('aria-modal','true');
  panel.innerHTML='<div id="bpv956-card"><div id="bpv956-head"><div id="bpv956-head-copy"><div id="bpv956-title">Live U.S. parcel canonicalization</div><div id="bpv956-meta">Loading national parcel progress…</div></div><button id="bpv956-close" type="button" aria-label="Close">×</button></div><div id="bpv956-summary"></div><div id="bpv956-states"></div></div>';

  const mount=()=>{
    if(!document.body) return false;
    if(!document.getElementById(ID)) document.body.appendChild(pulse);
    if(!document.getElementById('bpv956-panel')) document.body.appendChild(panel);
    return true;
  };
  if(!mount()) document.addEventListener('DOMContentLoaded',mount,{once:true});

  const valueEl=()=>pulse.querySelector('.bpv956-value');
  const subEl=()=>pulse.querySelector('.bpv956-sub');
  const metaEl=()=>panel.querySelector('#bpv956-meta');
  const summaryEl=()=>panel.querySelector('#bpv956-summary');
  const statesEl=()=>panel.querySelector('#bpv956-states');
  const num=v=>nf.format(Number(v||0));
  const pct=v=>`${pf.format(Number(v||0))}%`;

  function stat(label,value,sub=''){
    const el=document.createElement('div');el.className='bpv956-stat';
    const l=document.createElement('div');l.className='bpv956-stat-label';l.textContent=label;
    const v=document.createElement('div');v.className='bpv956-stat-value';v.textContent=value;
    el.append(l,v);
    if(sub){const s=document.createElement('div');s.className='bpv956-stat-sub';s.textContent=sub;el.appendChild(s)}
    return el;
  }

  function render(data){
    if(!data||data.available!==true) return;
    const oldTotal=latest?.total_parcels;
    latest=data;
    const total=Number(data.total_parcels||0);
    const backlog=Number(data.secured_unique_backlog_ceiling||0);
    const projected=Number(data.projected_after_secured_backlog||0);
    const targetPct=Number(data.canonical_pct_of_161m||0);
    const jurisdictions=Number(data.states_present||0);
    const v=valueEl();if(v)v.textContent=num(total);
    const s=subEl();if(s)s.textContent=`${pct(targetPct)} of 161M • secured backlog ≤ ${num(backlog)}`;
    if(oldTotal!=null&&Number(oldTotal)!==total){pulse.classList.remove('bpv956-changed');void pulse.offsetWidth;pulse.classList.add('bpv956-changed')}

    const when=data.updated_at?new Date(data.updated_at):null;
    const meta=metaEl();
    if(meta)meta.textContent=`${num(total)} canonical parcels across ${jurisdictions} states/D.C. • ${num(data.active_acquisition_remaining_rows)} raw rows still being acquired • ${Number(data.active_materializer_states||0)} states actively materializing. Secured backlog is capped by verified remaining state coverage and can dedupe lower.${when&&!Number.isNaN(when.valueOf())?` Last changed ${when.toLocaleString()}.`:''}`;

    const summary=summaryEl();
    if(summary){
      summary.replaceChildren(
        stat('Canonical now',num(total),`${pct(data.canonical_pct_of_verified_denominator)} of verified U.S. denominator`),
        stat('Secured backlog ceiling',num(backlog),'Maximum additional unique fill from approved sources'),
        stat('Projected after secured',num(projected),`${pct(data.projected_pct_of_161m)} of 161M target`),
        stat('Verified U.S. denominator',num(data.verified_denominator_total),`${num(data.remaining_verified_gap)} remaining gap`)
      );
    }

    const host=statesEl();
    if(host){
      host.replaceChildren();
      const rows=Array.isArray(data.states)?data.states:[];
      for(const row of rows){
        const item=document.createElement('div');item.className='bpv956-state';
        const top=document.createElement('div');top.className='bpv956-state-top';
        const code=document.createElement('span');code.className='bpv956-code';code.textContent=String(row.state_code||'—');
        const count=document.createElement('span');count.className='bpv956-count';count.textContent=num(row.parcel_count);
        top.append(code,count);
        const sub=document.createElement('div');sub.className='bpv956-state-sub';
        const projectedPct=Number(row.projected_pct||0);
        const backlogRows=Number(row.secured_unique_backlog_ceiling||0);
        sub.textContent=`${pct(row.canonical_pct)} canonical${backlogRows>0?` • backlog ≤ ${num(backlogRows)} • projected ${pct(projectedPct)}`:''}`;
        item.append(top,sub);host.appendChild(item);
      }
    }
  }

  async function refresh(){
    if(loading)return;
    loading=true;
    try{
      const res=await fetch(API,{method:'POST',headers:{'apikey':KEY,'Authorization':`Bearer ${KEY}`,'Content-Type':'application/json'},body:'{}',cache:'no-store'});
      if(!res.ok)throw new Error(`parcel progress ${res.status}`);
      render(await res.json());
    }catch(_){const s=subEl();if(s&&!latest)s.textContent='Live progress reconnecting…'}finally{loading=false}
  }

  pulse.addEventListener('click',()=>{panel.classList.add('show');if(latest)render(latest)});
  panel.querySelector('#bpv956-close')?.addEventListener('click',()=>panel.classList.remove('show'));
  panel.addEventListener('click',event=>{if(event.target===panel)panel.classList.remove('show')});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')panel.classList.remove('show')});
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});

  refresh();
  setInterval(()=>{if(!document.hidden)refresh()},POLL_MS);
})();
