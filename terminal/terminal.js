const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const RPC=SUPA+'/rest/v1/rpc/';
const H={'apikey':KEY,'Content-Type':'application/json','Accept':'application/json','Cache-Control':'no-cache'};
const $=id=>document.getElementById(id);
const fmt=n=>Number(n||0).toLocaleString();
async function rpc(name,args={},timeout=5000){const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);try{const r=await fetch(RPC+name,{method:'POST',headers:H,body:JSON.stringify(args),signal:c.signal,cache:'no-store'});const d=await r.json();if(!r.ok)throw new Error(d?.message||('HTTP '+r.status));return d}finally{clearTimeout(t)}}
function txt(id,v){const e=$(id);if(e)e.textContent=v??'—'}
function ago(x){if(!x)return'—';const d=new Date(x),s=Math.max(0,(Date.now()-d.getTime())/1000);if(s<90)return Math.round(s)+'s ago';if(s<5400)return Math.round(s/60)+'m ago';if(s<172800)return Math.round(s/3600)+'h ago';return Math.round(s/86400)+'d ago'}
function safe(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function severityClass(v){const s=String(v||'').toLowerCase();return s.includes('severe')?'severity-severe':s.includes('moderate')?'severity-moderate':s.includes('minor')?'severity-minor':''}
function hazardRows(items){const h=$('hazardRows');if(!h)return;h.innerHTML='';const rows=(items||[]).slice(0,40);if(!rows.length){h.innerHTML='<div class="hazard"><b>No fresh public hazard events returned</b><p>The terminal will retry automatically.</p></div>';return}for(const x of rows){const d=document.createElement('div');d.className='hazard';d.innerHTML='<div class="hazard-top"><div><div class="type">'+safe(x.type||'EVENT')+'</div><b>'+safe(x.name||x.type||'Weather event')+'</b></div><b class="'+severityClass(x.severity)+'">'+safe(x.severity||x.certainty||'SOURCE EVENT')+'</b></div><p>'+safe(x.source||'Source-labelled feed')+(x.observed?' · observed':'')+(x.observed_at?' · '+ago(x.observed_at):'')+'</p>';h.appendChild(d)}}
async function refresh(){
  let ok=false;
  try{
    const [s,d,w,c]=await Promise.all([
      rpc('bridgepoint_frontend_status_v5000',{},5500),
      rpc('bridgepoint_data_sprint_status_v5106',{},5500),
      rpc('bridgepoint_public_weather_bootstrap_v5004',{},5500),
      fetch('/claims-terminal/claims-lifecycle.json?ts='+Date.now(),{cache:'no-store'}).then(r=>r.json()).catch(()=>null)
    ]);
    ok=true;
    txt('p',fmt(s.canonical_properties));
    txt('addr',fmt(s.unique_addresses));
    txt('bldg',fmt(s.map_ready_buildings));
    txt('bound',fmt(d.stored_boundary_rows_estimate));
    txt('links',fmt(d.property_address_links_estimate));
    txt('events',fmt(w?.items?.length||s.weather_bootstrap_events));
    txt('freshJ',String(s.parcel_fresh_jurisdictions)+' / '+String(s.parcel_required_jurisdictions));
    txt('backendAge',ago(s.backend_updated_at));
    txt('roof',fmt(s.map_ready_buildings));
    txt('parts',fmt(s.materialized_part_geometries));
    txt('terrain',Number(s.terrain_coverage_pct||0).toFixed(2)+'%');
    txt('surface',Number(s.surface_coverage_pct||0).toFixed(2)+'%');
    txt('sources',String(s.live_context_sources_fresh||0)+' / '+String(s.live_context_sources_total||0));
    txt('claimsFamilies',fmt(c?.metrics?.source_families||32));
    txt('enabledSlots',fmt(c?.metrics?.enabled_source_slots||1828));
    txt('stageCount',fmt(c?.metrics?.lifecycle_stages||15));
    txt('generated',w?.generated_at?new Date(w.generated_at).toLocaleTimeString():'—');
    hazardRows(w?.fresh===true?w.items:[]);
    const dot=$('statusDot');dot?.classList.toggle('stale',w?.fresh!==true);
    txt('liveLabel',w?.fresh===true?'LIVE PUBLIC FEEDS':'FEEDS RETRYING');
    const tape=[
      '<b>'+fmt(s.canonical_properties)+'</b> canonical property identities',
      '<b>'+fmt(s.map_ready_buildings)+'</b> map-ready buildings',
      '<b>'+fmt(d.stored_boundary_rows_estimate)+'</b> stored boundary rows',
      '<b>'+fmt(w?.items?.length||0)+'</b> fresh hazard events',
      '<b>'+fmt(c?.metrics?.enabled_source_slots||0)+'</b> enabled claims-lifecycle source slots',
      '<b>'+String(s.parcel_fresh_jurisdictions)+'/'+String(s.parcel_required_jurisdictions)+'</b> fresh parcel jurisdictions'
    ];
    const doubled=[...tape,...tape].map(x=>'<span>'+x+'</span>').join('');
    $('tape').innerHTML=doubled;
  }catch(e){
    console.warn('terminal refresh',e);txt('liveLabel','BACKEND RETRYING');$('statusDot')?.classList.add('stale')
  }
  return ok
}
refresh();setInterval(refresh,60000);
