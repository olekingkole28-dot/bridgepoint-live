
const $=id=>document.getElementById(id), fmt=n=>Number(n||0).toLocaleString(), money=n=>new Intl.NumberFormat(undefined,{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n||0));
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const arr=v=>Array.isArray(v)?v:[], when=v=>{if(!v)return '—';const d=new Date(v);return Number.isFinite(d.getTime())?d.toLocaleString():'—'};
const pill=v=>{const s=String(v??'—'),k=/COMPLETE|DONE|PASS|HEALTHY|ACTIVE|ONLINE|LIVE|SUCCEEDED|VERIFIED|READY/i.test(s)?'good':/FAIL|ERROR|CRITICAL|BLOCK|DEGRADED|OFFLINE|EXPIRED/i.test(s)?'bad':'warn';return '<span class="owner-pill '+k+'">'+esc(s.replaceAll('_',' '))+'</span>'};
let hub=null, refreshTimer=null, loading=false, backendLoading=false, lastBackendLoad=0, currentPreset='24h';
const rpc=(name,args={},timeout=20000)=>{if(typeof window.__BP_OWNER_AUTH_RPC__!=='function')throw new Error('Owner session bridge unavailable');return window.__BP_OWNER_AUTH_RPC__(name,args,timeout)};
function ownerAllowed(){return window.__BP_ACCESS_STATE__?.platform_owner===true}
function syncVisibility(){const card=$('ownerEverythingCard');if(card)card.hidden=!ownerAllowed();if(!ownerAllowed()&&document.querySelector('[data-surface="owner-everything"]')?.hidden===false)window.__BP_SET_ACTIVE_SURFACE__?.('more')}
function dates(){const until=new Date(),since=new Date();if(currentPreset==='today'){since.setHours(0,0,0,0)}else if(currentPreset==='7d'){since.setDate(since.getDate()-7)}else if(currentPreset==='30d'){since.setDate(since.getDate()-30)}else if(currentPreset==='custom'){const a=$('ownerSince')?.value,b=$('ownerUntil')?.value;return {p_since:a?new Date(a).toISOString():new Date(Date.now()-86400000).toISOString(),p_until:b?new Date(b).toISOString():until.toISOString()}}else since.setTime(Date.now()-86400000);return {p_since:since.toISOString(),p_until:until.toISOString()}}
function table(headers,rows){return rows.length?'<div class="owner-tablewrap"><table class="owner-table"><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>':'<div class="owner-empty">No rows in this window.</div>'}
function pick(o,...keys){for(const k of keys)if(o&&o[k]!=null)return o[k];return null}
function setStatus(msg){const e=$('ownerActionStatus');if(e)e.textContent=msg}
function renderKPIs(){
 const a=hub?.acquisition||{},t=a.totals||{},la=hub?.live_activity||{},on=hub?.online||{},ev=hub?.everything||{};
 const online=arr(on.online_users).length||Number(la.active_users_15m||0), workers=arr(ev.worker_tasks), running=workers.filter(x=>['RUNNING','ACTIVE','WORKING'].includes(String(x.status).toUpperCase())).length;
 const vals=[
  ['Visitors',pick(t,'unique_visitors','visitors','visitor_count')||0,'selected window'],
  ['Events',pick(t,'events','event_count','total_events')||0,'selected window'],
  ['Accounts',la.total_users||0,'registered'],
  ['Online',online,'recent session activity'],
  ['Workers running',running,'backend queue'],
  ['Open failures',workers.filter(x=>/FAIL|ERROR|BLOCK/i.test(String(x.status))).length,'worker tasks']
 ];
 $('ownerKpis').innerHTML=vals.map(([a,b,c])=>'<div class="owner-kpi"><span>'+esc(a)+'</span><b>'+fmt(b)+'</b><small>'+esc(c)+'</small></div>').join('');
}
function renderAcquisition(){
 const a=hub?.acquisition||{}, states=arr(a.states||a.state_sources), sources=arr(a.sources), pages=arr(a.pages), funnel=arr(a.funnel), online=arr(hub?.online?.online_users);
 $('ownerOnline').innerHTML=table(['Account','Latest page','Source','Region','Last active'],online.map(x=>'<tr><td><b>'+esc(x.email||x.user_id||'signed-in')+'</b></td><td>'+esc(x.latest_page||'—')+'</td><td>'+esc(x.source||'—')+'</td><td>'+esc([x.country_code,x.region_code].filter(Boolean).join(' / ')||'—')+'</td><td>'+esc(when(x.last_active_at||x.latest_event_at))+'</td></tr>'));
 $('ownerGeo').innerHTML=table(['Geography','Visitors','Events','Last seen'],states.slice(0,80).map(x=>'<tr><td><b>'+esc([x.country_code,x.state_code||x.region_code,x.state_name].filter(Boolean).join(' · ')||x.key||'Unknown')+'</b></td><td>'+fmt(x.unique_visitors??x.visitors??0)+'</td><td>'+fmt(x.events??x.event_count??0)+'</td><td>'+esc(when(x.last_seen_at||x.last_event_at||x.latest_at))+'</td></tr>'));
 $('ownerSources').innerHTML=table(['Source / referrer','Visitors','Events','Conversion'],sources.slice(0,80).map(x=>'<tr><td><b>'+esc(x.source||x.utm_source||x.referrer_host||x.key||'direct/unknown')+'</b></td><td>'+fmt(x.unique_visitors??x.visitors??0)+'</td><td>'+fmt(x.events??x.event_count??0)+'</td><td>'+esc(x.conversion_rate!=null?Number(x.conversion_rate).toFixed(1)+'%':'—')+'</td></tr>'));
 $('ownerPages').innerHTML=table(['Page','Visitors','Views / events','Last seen'],pages.slice(0,100).map(x=>'<tr><td><b>'+esc(x.page_path||x.path||'/')+'</b></td><td>'+fmt(x.unique_visitors??x.visitors??0)+'</td><td>'+fmt(x.views??x.events??x.event_count??0)+'</td><td>'+esc(when(x.last_seen_at||x.last_event_at))+'</td></tr>'));
 $('ownerFunnel').innerHTML=table(['Stage','Visitors / count','Rate'],funnel.map(x=>'<tr><td><b>'+esc(x.label||x.event_type||x.stage||x.step||x.key||'Stage')+'</b></td><td>'+fmt(x.unique_visitors??x.visitors??x.count??x.events??0)+'</td><td>'+esc((x.conversion_from_prior_pct??x.rate)!=null?Number(x.conversion_from_prior_pct??x.rate).toFixed(1)+'%':'—')+'</td></tr>'));
}
function renderValuation(){
 const w=hub?.valuation||{},v=w.current||w.valuation||w.model||w, drivers=arr(v.drivers), m=v.metrics||{};
 $('ownerValuation').innerHTML='<div class="owner-valuation"><div class="owner-value-main"><span>'+esc(v.label||'MODELED PRE-MONEY ESTIMATE')+'</span><strong>'+money(v.modeled_pre_money_usd||0)+'</strong><div class="owner-value-range">'+money(v.low_usd||0)+' low · '+money(v.high_usd||0)+' high · '+esc(v.confidence_score??'—')+' confidence</div><p class="owner-sub">'+esc(v.disclaimer||'Internal operating model, not a certified appraisal.')+'</p></div><div><h3>Live metrics backing the model</h3>'+Object.entries(m).slice(0,16).map(([k,x])=>'<div class="owner-driver"><div>'+esc(k.replaceAll('_',' '))+'</div><b>'+fmt(x)+'</b></div>').join('')+'</div></div><h3>Why it is valued there</h3>'+drivers.map(d=>'<div class="owner-driver"><div><b>'+esc(d.label||d.key)+'</b><small>'+esc(d.why||[d.metric!=null?'metric '+d.metric:null,d.live_states!=null?'live states '+d.live_states:null].filter(Boolean).join(' · '))+'</small></div><b>'+money(d.value_usd||0)+'</b></div>').join('');
 const hist=arr(w.history||w.snapshots||w.hourly_snapshots);if($('ownerValuationHistory'))$('ownerValuationHistory').innerHTML=table(['Captured','Modeled','Low','High','Confidence'],hist.slice(0,168).map(x=>'<tr><td>'+esc(when(x.captured_at||x.generated_at))+'</td><td><b>'+money(x.modeled_pre_money_usd||0)+'</b></td><td>'+money(x.low_usd||0)+'</td><td>'+money(x.high_usd||0)+'</td><td>'+esc(x.confidence_score??'—')+'</td></tr>'));
}
function renderBackend(){
 const e=hub?.everything||{},workers=arr(e.worker_tasks),states=arr(e.states),sources=arr(e.sources),crons=arr(e.cron_jobs),ledger=arr(e.master_ledger),sys=arr(e.system_incidents),geo=arr(e.expansion_incidents);
 $('ownerWorkers').innerHTML=table(['Worker / task','Status','AI','Attempts','Updated'],workers.slice(0,250).map(x=>'<tr><td><b>'+esc(x.worker_name||x.worker_key||x.task_type||x.task_key||'worker')+'</b><br>'+esc(x.task_name||x.description||x.payload?.task||'')+'</td><td>'+pill(x.status)+'</td><td>'+esc(x.requires_ai===true?'YES':x.requires_ai===false?'NO':'—')+'</td><td>'+fmt(x.attempts||x.attempt_count||x.attempt||0)+'</td><td>'+esc(when(x.updated_at||x.last_activity_at||x.created_at))+'</td></tr>'));
 $('ownerStates').innerHTML=table(['Jurisdiction','Phase','Overall','Properties','Sources','Tasks Q/R/F','Updated'],states.map(x=>'<tr><td><b>'+esc(x.state_code||x.jurisdiction_key||'—')+'</b> '+esc(x.state_name||x.jurisdiction_name||'')+'</td><td>'+pill(x.phase||x.current_phase||x.status)+'</td><td>'+esc((x.overall_pct??x.overall_progress_pct)!=null?Number(x.overall_pct??x.overall_progress_pct).toFixed(1)+'%':'—')+'</td><td>'+fmt(x.properties||x.canonical_properties||x.canonical_property_count||0)+'</td><td>'+fmt(x.sources_accepted||x.accepted_sources||0)+' / '+fmt(x.sources_discovered||x.discovered_sources||0)+'</td><td>'+fmt(x.source_tasks_queued||0)+' / '+fmt(x.source_tasks_running||0)+' / '+fmt(x.source_tasks_failed||0)+'</td><td>'+esc(when(x.last_activity_at||x.updated_at))+'</td></tr>'));
 $('ownerSourceRegistry').innerHTML=table(['Source','Jurisdiction','Category','Health','Rows / records','Checked'],sources.slice(0,250).map(x=>'<tr><td><b>'+esc(x.source_name||x.source_key||x.name||'source')+'</b></td><td>'+esc(x.state_code||x.jurisdiction_key||'—')+'</td><td>'+esc(x.category||x.source_type||x.source_category||'—')+'</td><td>'+pill(x.health||x.health_status||x.status||'—')+'</td><td>'+fmt(x.rows||x.record_count||x.records||x.total_records_ingested||0)+'</td><td>'+esc(when(x.last_checked_at||x.updated_at))+'</td></tr>'));
 $('ownerCrons').innerHTML=table(['Job','Active','Schedule','Last status','Last run'],crons.map(x=>'<tr><td><b>'+esc(x.jobname||x.job_name||x.command_name||x.jobid||'job')+'</b></td><td>'+pill(x.active===true?'ACTIVE':x.active===false?'PAUSED':'—')+'</td><td>'+esc(x.schedule||'—')+'</td><td>'+pill(x.last_status||x.status||'—')+'</td><td>'+esc(when(x.last_run_at||x.last_start_time||x.updated_at))+'</td></tr>'));
 $('ownerLedger').innerHTML=table(['Priority','Category','Status','Requirement','Updated'],ledger.slice(0,300).map(x=>'<tr><td>'+esc(x.priority??'—')+'</td><td>'+esc(x.category||'—')+'</td><td>'+pill(x.status)+'</td><td><b>'+esc(x.requirement||x.req_key||'requirement')+'</b></td><td>'+esc(when(x.updated_at))+'</td></tr>'));
 const inc=[...sys.map(x=>({...x,_scope:'SYSTEM'})),...geo.map(x=>({...x,_scope:'EXPANSION'}))];$('ownerIncidents').innerHTML=table(['Scope','Severity','Status','Issue','Updated'],inc.slice(0,200).map(x=>'<tr><td>'+esc(x._scope)+'</td><td>'+pill(x.severity||'INFO')+'</td><td>'+pill(x.status||'OPEN')+'</td><td><b>'+esc(x.incident_key||x.code||x.incident_code||'incident')+'</b><br>'+esc(x.summary||x.internal_summary||x.message||x.public_message||'')+'</td><td>'+esc(when(x.updated_at||x.created_at))+'</td></tr>'));
}
function renderExpansion(){
 const x=hub?.expansion||{},j=x.jurisdictions||{},req=arr(hub?.expansion_requests),jobs=arr(hub?.export_jobs);
 $('ownerExpansionStatus').innerHTML='<div class="owner-kpis">'+[['Jurisdictions',j.total||0,'known'],['Live',j.live||0,'live'],['Queued/building',j.queued_or_building||0,'in progress'],['Countries',j.countries||0,'country scopes'],['US subdivisions',j.us_subdivisions||0,'U.S.'],['Parity rules',x.parity_requirements||0,'requirements']].map(([a,b,c])=>'<div class="owner-kpi"><span>'+a+'</span><b>'+fmt(b)+'</b><small>'+c+'</small></div>').join('')+'</div>'+table(['Jurisdiction','Request','Build','Discovery','Compliance','Priority','Activity'],req.slice(0,100).map(r=>'<tr><td><b>'+esc(r.jurisdiction_name||r.jurisdiction_key)+'</b><br>'+esc([r.country_code,r.region_code].filter(Boolean).join('-'))+'</td><td>'+pill(r.request_status)+'</td><td>'+pill(r.build_status)+'</td><td>'+pill(r.discovery_status)+'</td><td>'+pill([r.licensing_status,r.privacy_status,r.local_law_status].filter(Boolean).join(' / '))+'</td><td>'+esc(r.priority??'—')+'</td><td>'+esc(when(r.last_activity_at||r.requested_at))+'</td></tr>'));
 $('ownerExportJobs').innerHTML=table(['Scope','Status','Format','Requested','Updated'],jobs.map(r=>'<tr><td><b>'+esc((r.scope_kind||'')+' '+(r.scope_key||''))+'</b></td><td>'+pill(r.status)+'</td><td>'+esc(r.requested_format||'—')+'</td><td>'+esc(when(r.requested_at))+'</td><td>'+esc(when(r.updated_at||r.completed_at))+'</td></tr>'));
}
function renderFast(){if(!hub)return;renderKPIs();renderAcquisition();renderValuation();renderExpansion();$('ownerUpdated').textContent='Updated '+new Date(hub.generated_at||Date.now()).toLocaleString();window.__BP_OWNER_HUB__=hub}
function renderAll(){if(!hub)return;renderFast();renderBackend()}
async function loadBackendSections(force=false){
 if(backendLoading||!ownerAllowed())return;
 if(!force&&Date.now()-lastBackendLoad<45000)return;
 backendLoading=true;
 hub=hub||{};hub.everything=hub.everything||{};
 const specs=[
  ['states','states'],
  ['workers','worker_tasks'],
  ['sources','sources'],
  ['cron','cron_jobs'],
  ['ledger','master_ledger'],
  ['incidents','incidents']
 ];
 let ok=0,fail=0;
 try{
  await Promise.all(specs.map(async([section,key])=>{
   try{
    const r=await rpc('bridgepoint_owner_backend_section_v5402',{p_section:section,p_limit:section==='workers'?250:300},9000);
    if(section==='incidents'){
      hub.everything.system_incidents=arr(r?.data?.system);
      hub.everything.expansion_incidents=arr(r?.data?.expansion);
    }else hub.everything[key]=arr(r?.data);
    ok++;renderBackend();renderKPIs();
   }catch(e){fail++;console.warn('owner backend section',section,e)}
  }));
  lastBackendLoad=Date.now();
  if(fail) setStatus('Live owner numbers loaded. '+ok+' backend sections live; '+fail+' section'+(fail===1?' is':'s are')+' retrying independently.');
  else setStatus('Live owner backend connected. Numbers refresh every 30 seconds; backend tables refresh every 45 seconds.');
 }finally{backendLoading=false}
}
async function loadHub(force=false){
 if(loading&&!force)return;if(!ownerAllowed())return;
 loading=true;hub=hub||{};hub.generated_at=new Date().toISOString();
 setStatus('Loading live owner numbers…');
 const d=dates();
 const specs=[
  ['acquisition','bridgepoint_owner_acquisition_v5400',d,9000],
  ['valuation','bridgepoint_owner_investor_valuation_v314',{},9000],
  ['online','bridgepoint_owner_online_user_activity_v1054',{},8000],
  ['live_activity','bridgepoint_owner_live_activity_v958',{},8000],
  ['backend_status','bridgepoint_frontend_status_v5000',{},8000],
  ['expansion_snapshot','bridgepoint_owner_expansion_snapshot_v5402',{},8000]
 ];
 let ok=0,fail=0;
 try{
  await Promise.all(specs.map(async([key,name,args,timeout])=>{
   try{
    const r=await rpc(name,args,timeout);
    if(key==='expansion_snapshot'){
      hub.expansion=r?.expansion||{};
      hub.expansion_requests=arr(r?.expansion_requests);
      hub.export_jobs=arr(r?.export_jobs);
    }else hub[key]=r;
    hub.generated_at=new Date().toISOString();
    ok++;renderFast();
   }catch(e){
    fail++;console.warn('owner live module',key,e);
   }
  }));
  if(ok===0)setStatus('Owner live modules are retrying independently. The page will stay open instead of timing out as one block.');
  else if(fail)setStatus(ok+' live owner modules loaded; '+fail+' module'+(fail===1?' is':'s are')+' retrying independently.');
  else setStatus('Live owner numbers connected. Loading backend worker/source tables…');
 }finally{
  loading=false;
  void loadBackendSections(force);
 }
}
async function ownerDocument(doc){
 if(!ownerAllowed())return;
 const popup=window.open('about:blank','_blank');
 try{
  setStatus('Opening owner document…');
  const r=await rpc('bridgepoint_owner_document_v5401',{p_doc:doc},20000);
  const raw=atob(String(r?.data_base64||'')),bytes=new Uint8Array(raw.length);
  for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
  const url=URL.createObjectURL(new Blob([bytes],{type:r?.mime||'application/pdf'}));
  if(popup)popup.location.href=url;
  else{const a=document.createElement('a');a.href=url;a.download=r?.filename||'BridgePoint.pdf';document.body.appendChild(a);a.click();a.remove()}
  setStatus('Owner document opened securely.');
  setTimeout(()=>URL.revokeObjectURL(url),120000);
 }catch(e){try{popup?.close()}catch(_){ }setStatus('Document failed · '+String(e.message||e))}
}
async function action(action,payload={},confirmText=''){if(!ownerAllowed())return;if(confirmText&&!confirm(confirmText))return;try{setStatus('Running '+action.replaceAll('_',' ')+'…');const r=await rpc('bridgepoint_owner_action_v5401',{p_action:action,p_payload:payload},30000);setStatus(JSON.stringify(r,null,2));await loadHub(true)}catch(e){setStatus('Action failed · '+String(e.message||e))}}
function bind(){
 $('moreOwnerEverything')?.addEventListener('click',()=>{if(!ownerAllowed())return;window.__BP_SET_ACTIVE_SURFACE__?.('owner-everything');loadHub(true)});
 $('ownerBack')?.addEventListener('click',()=>window.__BP_SET_ACTIVE_SURFACE__?.('more'));
 $('ownerRefresh')?.addEventListener('click',()=>loadHub(true));
 document.querySelectorAll('[data-owner-range]').forEach(b=>b.addEventListener('click',()=>{currentPreset=b.dataset.ownerRange;document.querySelectorAll('[data-owner-range]').forEach(x=>x.classList.toggle('active',x===b));loadHub(true)}));
 $('ownerApplyDates')?.addEventListener('click',()=>{currentPreset='custom';loadHub(true)});
 $('ownerStartUS')?.addEventListener('click',()=>action('START_US_ALL',{},'Start/continue the full U.S. expansion queue now?'));
 $('ownerStartWorld')?.addEventListener('click',()=>action('START_WORLD_DISCOVERY',{},'Start world discovery across BridgePoint now? This can queue substantial backend work.'));
 $('ownerStartCountry')?.addEventListener('click',()=>action('START_COUNTRY',{country_code:$('ownerCountryCode').value.trim(),name:$('ownerCountryName').value.trim()},'Start this country expansion?'));
 $('ownerStartJurisdiction')?.addEventListener('click',()=>action('START_JURISDICTION',{country_code:$('ownerCountryCode').value.trim(),region_code:$('ownerRegionCode').value.trim(),name:$('ownerCountryName').value.trim()},'Start this jurisdiction expansion?'));
 $('ownerSetMode')?.addEventListener('click',()=>action('SET_MODE',{mode:$('ownerMode').value},'Change BridgePoint infrastructure mode to '+$('ownerMode').value+'?'));
 $('ownerQueueExport')?.addEventListener('click',()=>action('QUEUE_US_EXPORT',{},'Queue the full U.S. portable export now? This will create governed state export jobs.'));
 $('ownerWorldManifest')?.addEventListener('click',()=>action('WORLD_EXPORT_MANIFEST',{},'Generate the current world export manifest?'));
 document.querySelectorAll('[data-owner-doc]').forEach(b=>b.addEventListener('click',()=>ownerDocument(b.dataset.ownerDoc)));
 setInterval(syncVisibility,700);syncVisibility();clearInterval(refreshTimer);refreshTimer=setInterval(()=>{if(ownerAllowed()&&document.querySelector('[data-surface="owner-everything"]')?.hidden===false){loadHub();void loadBackendSections()}},30000)
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind);else bind();
