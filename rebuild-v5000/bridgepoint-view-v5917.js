(()=>{
'use strict';
if(window.__BRIDGEPOINT_VIEW_V5917__)return;
window.__BRIDGEPOINT_VIEW_V5917__={version:5917,bootedAt:Date.now(),mode:'initializing'};
const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s));
const home=!!$('#previewMap')&&!$('#liveMap');
const mapHost=home?$('.preview'):document.querySelector('.map-surface.active')||$('.map-surface');
const appMap=$('#liveMap');
let map=null,idleTimer=0,moveUntil=0,selected={id:null,label:'',feature:null},activePanel='ai',metricsLoading=null,asking=false,searchVisible=true;
const SLOT_INFO={
 ai:['BRIDGEPOINT AI','Ask a question about this selected property.'],
 xray:['X-RAY + INTERIOR','Source-backed parts, floors and plans only. No fabricated rooms.'],
 underground:['UNDERGROUND + UTILITIES','Pipe and subsurface records appear only when a lawful source is linked to this property.'],
 street:['STREET-LEVEL VIEW','Street scene coverage is checked at this property; unavailable imagery stays clearly marked.'],
 aerial:['AERIAL + IMAGERY','Source-dated aerial context appears when permitted imagery is available.'],
 heartbeat:['PROPERTY HEARTBEAT','Latest evidence, change signals and source freshness when records exist.'],
 timeline:['PROPERTY TIMELINE','Property-linked weather, permits, imagery and change events when verified.'],
 roof:['ROOF + BUILDING PARTS','Roof and component geometry with source/confidence labels.'],
 provenance:['SOURCES + PROVENANCE','Source, observation time, rights scope and confidence for every exposed fact.']
};
function node(tag,cls,html){const n=document.createElement(tag);if(cls)n.className=cls;if(html!==undefined)n.innerHTML=html;return n}
function addClass(el,cls){if(el)el.classList.add(cls)}
function closePanel(){const p=$('#bpv-sidecar');if(p)p.hidden=true;document.body.classList.remove('bpv-panel-open')}
function openPanel(name){
 const p=$('#bpv-sidecar');if(!p)return;
 activePanel=name;
 p.hidden=false;document.body.classList.add('bpv-panel-open');
 p.dataset.panel=name;
 p.querySelectorAll('[data-bpv-panel]').forEach(b=>{const on=b.dataset.bpvPanel===name;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on?'true':'false')});
 p.querySelectorAll('[data-bpv-pane]').forEach(s=>{s.hidden=s.dataset.bpvPane!==name});
 if(name==='metrics')void loadMetrics();
 if(name==='property')refreshSlotLabels();
 if(name==='ai')setTimeout(()=>$('#bpv-ai-question')?.focus({preventScroll:true}),60);
}
function setMoving(){
 moveUntil=Date.now()+850;
 document.body.classList.add('bpv-globe-moving');
 clearTimeout(idleTimer);
 idleTimer=setTimeout(()=>{if(Date.now()>=moveUntil){document.body.classList.remove('bpv-globe-moving');return}setMoving()},900);
}
function stopMoving(){
 moveUntil=Date.now()+850;clearTimeout(idleTimer);
 idleTimer=setTimeout(()=>{if(Date.now()>=moveUntil)document.body.classList.remove('bpv-globe-moving')},900);
}
function attachMap(m){
 if(!m||map===m)return;map=m;
 const start=()=>setMoving(),end=()=>stopMoving();
 for(const e of ['movestart','zoomstart','rotatestart','pitchstart','dragstart'])try{m.on(e,start)}catch(_){}
 for(const e of ['moveend','zoomend','rotateend','pitchend','dragend'])try{m.on(e,end)}catch(_){}
 if(mapHost){
  mapHost.addEventListener('pointerdown',e=>{if(e.target.closest('button,a,input,textarea,form,[role="button"],.bpv-sidecar'))return;setMoving()},{passive:true,capture:true});
  mapHost.addEventListener('touchstart',e=>{if(e.target.closest('button,a,input,textarea,form,[role="button"],.bpv-sidecar'))return;setMoving()},{passive:true,capture:true});
  mapHost.addEventListener('wheel',()=>setMoving(),{passive:true,capture:true});
 }
 window.__BRIDGEPOINT_VIEW_V5917__={version:5917,mode:home?'WEBSITE_GLOBE':'APP_GLOBE',mapAttached:true,attachedAt:Date.now(),map,moving:false};
}
function findMap(){return home?(window.__BP_LANDING_WORLD__?.map||window.__bpLandingWorldV5420?.map||null):(window.__BP_V5000_WORLD__?.map||null)}
function installMapWatch(){const m=findMap();if(m){attachMap(m);return}let turns=0;const tick=()=>{if(map)return;const n=findMap();if(n){attachMap(n);return}if(++turns<300)setTimeout(tick,100)};setTimeout(tick,150)}
function makePanel(){
 const p=node('aside','bpv-sidecar bpv-map-chrome');p.id='bpv-sidecar';p.hidden=true;p.setAttribute('aria-label','BridgePoint View control deck');
 p.innerHTML=
  '<div class="bpv-sidecar-head"><div><span class="bpv-eyebrow">BRIDGEPOINT VIEW</span><b id="bpv-sidecar-title">BRIDGEPOINT AI</b></div><button id="bpv-panel-close" type="button" aria-label="Close BridgePoint panel">×</button></div>'+
  '<nav class="bpv-sidecar-tabs" aria-label="BridgePoint View panels">'+
  '<button type="button" data-bpv-panel="ai">BRIDGEPOINT AI</button>'+
  '<button type="button" data-bpv-panel="metrics">LIVE METRICS</button>'+
  '<button type="button" data-bpv-panel="property">PROPERTY</button>'+
  (home?'<button type="button" data-bpv-panel="explore">EXPLORE</button>':'')+
  '<button type="button" data-bpv-panel="controls">CONTROLS</button></nav>'+
  '<section data-bpv-pane="ai" hidden><div class="bpv-ai-intro"><span class="bpv-live-dot"></span><div><b>Ask BridgePoint AI</b><small>Answers use BridgePoint facts and authorized property intelligence. Unknown information is labeled—not guessed.</small></div></div>'+
  '<div class="bpv-ai-shortcuts"><button type="button" data-bpv-prompt="What is BridgePoint and what can it do?">ABOUT BRIDGEPOINT</button><button type="button" data-bpv-prompt="What global property coverage is live right now?">GLOBAL COVERAGE</button><button type="button" data-bpv-prompt="What intelligence is available for the selected property?">THIS PROPERTY</button></div>'+
  '<form id="bpv-ai-form"><label for="bpv-ai-question">YOUR QUESTION</label><textarea id="bpv-ai-question" maxlength="500" rows="3" placeholder="Ask BridgePoint anything about this property, coverage, data, tools or the platform…"></textarea><div class="bpv-ai-form-foot"><small>BridgePoint answers · source-aware</small><button type="submit" id="bpv-ai-submit">ASK BRIDGEPOINT</button></div></form>'+
  '<div id="bpv-ai-response" class="bpv-ai-response" aria-live="polite"><b>Ready when you are.</b><p>Ask about a property, global coverage, timeline evidence, packages or BridgePoint capabilities.</p></div>'+
  '<div id="bpv-ai-facts" class="bpv-ai-facts"></div><p class="bpv-data-note">Private owner operations and other users’ private data are not exposed by the public answer service.</p></section>'+
  '<section data-bpv-pane="metrics" hidden><div class="bpv-pane-title"><b>Global world counters</b><small>One live BridgePoint counter contract; refreshed on request.</small></div>'+
  '<div id="bpv-metric-grid" class="bpv-metric-grid"><div class="bpv-metric-card"><span>Canonical properties</span><b>CONNECTING</b></div></div>'+
  '<p id="bpv-metric-updated" class="bpv-data-note">Waiting for the live counter source.</p>'+
  (home?'<div id="bpv-home-copy-mount"></div>':'')+
  '</section>'+
  '<section data-bpv-pane="property" hidden><div class="bpv-pane-title"><b id="bpv-property-title">Selected property</b><small id="bpv-property-key">Choose a building on the globe to bind these intelligence slots to it.</small></div>'+
  '<div id="bpv-side-property-slots" class="bpv-slot-grid"></div><p class="bpv-data-note">Each slot stays attached to the selected BridgePoint building. An unavailable source is shown as unavailable rather than filled with a placeholder result.</p></section>'+
  '<section data-bpv-pane="controls" hidden><div class="bpv-pane-title"><b>BridgePoint Controls</b><small>Layers and map actions live here so the globe remains unobstructed.</small></div><div id="bpv-controls-mount"></div>'+
  '<button type="button" class="bpv-wide-action" id="bpv-whole-earth">RETURN TO WHOLE EARTH</button></section>'+
  (home?'<section data-bpv-pane="explore" hidden><div class="bpv-pane-title"><b>Explore BridgePoint</b><small>Supporting information, access, updates and platform details—behind the globe, not over it.</small></div><div id="bpv-explore-mount"></div></section>':'');
 document.body.appendChild(p);
 $('#bpv-panel-close').addEventListener('click',closePanel);
 p.querySelectorAll('[data-bpv-panel]').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.bpvPanel)));
 p.querySelectorAll('[data-bpv-prompt]').forEach(b=>b.addEventListener('click',()=>{$('#bpv-ai-question').value=b.dataset.bpvPrompt;openPanel('ai')}));
 $('#bpv-ai-form').addEventListener('submit',e=>{e.preventDefault();void askBridgePoint()});
 $('#bpv-whole-earth').addEventListener('click',wholeEarth);
 return p;
}
function makeTopBarAndDock(){
 if(!mapHost)return;
 const top=node('div','bpv-topbar bpv-map-chrome');
 top.innerHTML='<a class="bpv-brand" href="/" aria-label="BridgePoint View"><img src="/bridgepoint-mark.svg" alt=""><span><b>BRIDGEPOINT VIEW</b><small>GLOBAL SPATIAL INTELLIGENCE</small></span></a><div id="bpv-account-slot"></div>';
 const dock=node('div','bpv-dock bpv-map-chrome');dock.id='bpv-dock';
 dock.innerHTML='<div class="bpv-dock-label"><b>BRIDGEPOINT VIEW</b><span><i></i> WHOLE EARTH · LIVE</span></div><div id="bpv-search-slot" class="bpv-search-slot"></div><div id="bpv-dock-actions" class="bpv-dock-actions">'+
 '<button type="button" data-bpv-action="ai">BRIDGEPOINT AI</button>'+
 '<button type="button" data-bpv-action="metrics">COUNTERS</button>'+
 '<button type="button" data-bpv-action="controls">LAYERS + TOOLS</button>'+
 '<button type="button" data-bpv-action="property">PROPERTY SLOTS</button>'+
 (home?'<button type="button" data-bpv-action="explore">EXPLORE</button>':'')+
 '<button type="button" class="bpv-whole-earth-short" data-bpv-action="whole">WHOLE EARTH</button></div>';
 mapHost.append(top,dock);
 dock.querySelectorAll('[data-bpv-action]').forEach(b=>b.addEventListener('click',()=>{
  const a=b.dataset.bpvAction;
  if(a==='whole'){wholeEarth();return}
  if(a==='search'){toggleSearch();return}
  if(a==='premium'){document.querySelector('#landingFreePremiumTools,#appFreePremiumTools')?.click();return}
  openPanel(a)
 }));
 return{top,dock,searchSlot:$('#bpv-search-slot'),actions:$('#bpv-dock-actions')};
}
function makeSlots(container,kind){
 if(!container||container.dataset.bpvSlotsReady==='1')return;
 container.dataset.bpvSlotsReady='1';container.classList.add('bpv-slot-grid');
 for(const [key,info] of Object.entries(SLOT_INFO)){
  const card=node('article','bpv-slot-card');
  card.dataset.bpvSlot=key;
  const btn=node('button','bpv-slot-title');
  btn.type='button';btn.dataset.bpvSlotAction=key;
  btn.innerHTML='<span class="bpv-slot-icon">'+({ai:'AI',xray:'X·RAY',underground:'SUB',street:'ST',aerial:'AIR',heartbeat:'♥',timeline:'T+',roof:'ROOF',provenance:'SRC'}[key]||'BP')+'</span><span>'+info[0]+'</span><span class="bpv-slot-arrow">↗</span>';
  const status=node('small','bpv-slot-status');
  status.dataset.bpvSlotStatus=key;
  status.textContent=key==='ai'?'Ready':key==='xray'?'Checks source-backed parts and plans':key==='underground'?'Not yet verified for this property':key==='street'?'Coverage varies by property':key==='aerial'?'Source-backed imagery only':key==='heartbeat'?'Waiting for property evidence':key==='timeline'?'Waiting for linked history':'Source availability checked by property';
  const p=node('p','bpv-slot-note');p.textContent=info[1];
  card.append(btn,status,p);container.appendChild(card);
  btn.addEventListener('click',()=>activateSlot(key,kind));
 }
}
function selectProperty(id,label,feature){
 selected={id:id||null,label:label||'Selected building',feature:feature||null};
 const sTitle=$('#bpv-property-title'),sKey=$('#bpv-property-key'),titleText=selected.label||'Selected property',keyText=selected.id?'BridgePoint building ID · '+selected.id:'Selected BridgePoint structure · source ID pending';
 if(sTitle&&sTitle.textContent!==titleText)sTitle.textContent=titleText;
 if(sKey&&sKey.textContent!==keyText)sKey.textContent=keyText;
 refreshSlotLabels();
}
function refreshSlotLabels(){
 if(!selected.label&&!selected.id){
  const title=home?$('#previewTitle')?.textContent:$('#buildingTitle')?.textContent;
  const id=home?($('#previewTitle')?.textContent||'').match(/#(\d+)/)?.[1]:window.__BP_XRAY_STATE__?.buildingId;
  if(title&&title!=='Building'&&title!=='Selected Building')selected.label=title;
  if(id)selected.id=id;
 }
 const label=selected.label||'Selected property',id=selected.id||'pending';
 const sTitle=$('#bpv-property-title'),sKey=$('#bpv-property-key');
 if(sTitle)sTitle.textContent=label;
 if(sKey)sKey.textContent=selected.id?'BridgePoint building ID · '+selected.id:'BridgePoint building selection · source ID pending';
 const slotStatus=(key,text)=>$('[data-bpv-slot-status="'+key+'"]').forEach(el=>{if(el.textContent!==text)el.textContent=text});
 const props=selected.feature?.properties||{};
 const hasPart=Number(props.part_count||props.building_part_count||0)>0;
 const hasRoof=!!(props.roof_type||props.roof_geometry||props.roof_planes||props.roof_area_m2||props.roof_area_sqft);
 const height=props.height_m||props.render_height_m||props.height||props.render_height;
 slotStatus('ai','Ready · ask about '+label);
 slotStatus('xray',hasPart?'Source-backed building parts indicated · opening full property check':'Source-backed parts/plans checked in the app inspector');
 slotStatus('underground','Not yet verified for this property · no unverified pipes shown');
 slotStatus('street','Street-level coverage not yet verified for this property');
 slotStatus('aerial','Aerial coverage checked when the property is opened');
 slotStatus('heartbeat','Waiting for current property evidence');
 slotStatus('timeline','Property-linked event history may be available after source matching');
 slotStatus('roof',hasRoof?'Roof evidence indicated in mapped feature · verify source in property inspector':height?'Height present · roof geometry not confirmed':'Roof evidence not yet confirmed for this property');
 slotStatus('provenance',props.source?'Mapped geometry source · '+String(props.source):'Source and timestamp are checked in the property inspector');
 $$('[data-bpv-slot]').forEach(el=>{el.dataset.buildingId=String(id);el.dataset.buildingLabel=label});
}
function activateSlot(key,kind){
 refreshSlotLabels();
 if(key==='ai'){
  openPanel('ai');
  const id=selected.id?' Building ID '+selected.id+'.':'';
  const label=selected.label&&selected.label!=='Building'?(' Property: '+selected.label+'.'):'';
  $('#bpv-ai-question').value='What verified information can BridgePoint show for this selected property, including building parts, roof, underground utilities, imagery, heartbeat, timeline and source provenance?'+label+id;
  return;
 }
 if(key==='xray'){
  if(!home){const tabs=$$('[data-bp-tab],#bpInspectorTabs button,[data-inspector-tab]');const b=tabs.find(x=>/x.?ray|structure|building/i.test((x.textContent||'')+' '+(x.dataset.bpTab||'')));if(b){b.click();return}}
  openPanel('property');
  return;
 }
 if(key==='aerial'||key==='street'){
  openPanel('controls');
  const tools=$('#bp5507-tools');
  if(tools){const p=tools.querySelector('[data-tool="'+(key==='aerial'?'IMAGERY':'DRIVE')+'"]');if(p){p.click();return}}
  showSlotMessage(key,'This BridgePoint layer is not enabled for the selected location yet. The property slot stays attached; no external imagery is substituted.');
  return;
 }
 if(key==='timeline'){
  const api=window.__BP_WORLD_TIME_SLIDER_V5908__;
  if(api){try{api.setOpen?.(true);api.open?.();api.expand?.();}catch(_){}}
  openPanel('property');
  showSlotMessage(key,'The global BridgePoint timeline is available. A building-specific timeline will show only events explicitly linked to this property.');
  return;
 }
 openPanel('property');
 showSlotMessage(key,SLOT_INFO[key]?.[1]||'No verified property data is available for this slot yet.');
}
function showSlotMessage(key,message){
 const el=$('[data-bpv-slot="'+key+'"] .bpv-slot-note');if(el)el.textContent=message;
}
function installHomeSlots(){
 const card=$('#previewCard');
 if(card&&!card.querySelector('#bpv-home-property-slots')){
  const wrap=node('div','bpv-home-property-slots');wrap.id='bpv-home-property-slots';
  const title=node('div','bpv-slot-section-head','<b>BRIDGEPOINT PROPERTY INTELLIGENCE</b><small>Fixed slots for this selected building</small>');
  const slots=node('div','bpv-slot-grid');
  wrap.append(title,slots);
  const note=$('#previewCapabilityNote');
  if(note&&note.parentElement===card)note.insertAdjacentElement('afterend',wrap);else card.appendChild(wrap);
  makeSlots(slots,'home');
  const obs=new MutationObserver(()=>{if(!card.hidden){const t=$('#previewTitle')?.textContent||'Selected building';const m=t.match(/#(\d+)/);selectProperty(m?.[1]||null,t,selected.feature);}});
  obs.observe(card,{attributes:true,attributeFilter:['hidden']});
 }
}
function installAppSlots(){
 const panel=$('#buildingPanel');if(!panel||panel.querySelector('#bpv-app-property-slots'))return;
 const wrap=node('section','bpv-app-property-slots');wrap.id='bpv-app-property-slots';
 wrap.innerHTML='<div class="bpv-slot-section-head"><b>BRIDGEPOINT PROPERTY INTELLIGENCE</b><small>Property-linked data slots</small></div><p class="bpv-slot-footnote">Missing sources remain visible as unavailable; BridgePoint does not fill gaps with invented geometry or history.</p><div id="bpv-app-property-slots-grid" class="bpv-slot-grid"></div>';
 panel.appendChild(wrap);makeSlots($('#bpv-app-property-slots-grid'),'app');
 const update=()=>{const id=window.__BP_XRAY_STATE__?.buildingId||null;const title=$('#buildingTitle')?.textContent||'Selected building';selectProperty(id,title,window.__BP_SELECTED_BUILDING_FEATURE__||null)};
 const obs=new MutationObserver(update);
 obs.observe(panel,{attributes:true,attributeFilter:['hidden'],childList:true});
 const titleNode=$('#buildingTitle');if(titleNode)new MutationObserver(update).observe(titleNode,{childList:true,subtree:true,characterData:true});
 update();
}
async function rpc(name,args={},timeout=11000,token=null){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
 const headers={'apikey':KEY,'Content-Type':'application/json','Accept':'application/json','Cache-Control':'no-cache'};
 if(token)headers.Authorization='Bearer '+token;
 try{
  const r=await fetch(SUPA+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(args),signal:controller.signal,cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d?.message||d?.error||('BridgePoint request failed · HTTP '+r.status));
  return d;
 }finally{clearTimeout(timer)}
}
function sessionToken(){try{return JSON.parse(localStorage.getItem('bp_auth_v5045')||'null')?.access_token||null}catch(_){return null}}
function drawAnswer(d,mode,err){
 const root=$('#bpv-ai-response'),facts=$('#bpv-ai-facts'),submit=$('#bpv-ai-submit');
 if(submit){submit.disabled=false;submit.textContent='ASK BRIDGEPOINT'}
 if(!root)return;
 if(err){root.replaceChildren();const b=node('b','', 'BridgePoint AI could not reach its answer service.');const p=node('p','',String(err.message||err)+' Try again in a moment.');root.append(b,p);return}
 const answer=mode==='auth'?(d?.summary||d?.headline||d?.message||'BridgePoint has not returned an answer for this question.'): (d?.answer||d?.message||'BridgePoint has not returned an answer for this question.');
 const title=mode==='auth'?(d?.headline||'BridgePoint AI'):('BridgePoint Guide · '+(d?.mode||'public-safe answer'));
 const scope=d?.grounding_notice||d?.notice||d?.privacy_notice||'Answer supplied by BridgePoint.';
 root.replaceChildren();const b=node('b');b.textContent=title;const p=node('p');p.textContent=answer;const small=node('small');small.textContent=scope;root.append(b,p,small);
 if(facts){facts.replaceChildren();const rows=Array.isArray(d?.facts)?d.facts:[];for(const f of rows.slice(0,8)){const item=node('article','bpv-fact');const h=node('b');h.textContent=f.title||f.name||f.topic||'BridgePoint fact';const t=node('p');t.textContent=f.fact_text||f.summary||f.description||f.status||JSON.stringify(f);item.append(h,t);facts.appendChild(item)}}
}
async function askBridgePoint(){
 if(asking)return;
 const field=$('#bpv-ai-question'),q=String(field?.value||'').trim();if(q.length<2){if(field)field.focus();return}
 asking=true;const submit=$('#bpv-ai-submit'),root=$('#bpv-ai-response');
 if(submit){submit.disabled=true;submit.textContent='BRIDGEPOINT IS CHECKING…'}
 if(root){root.replaceChildren();root.append(node('b','','BridgePoint AI is checking its available knowledge…'),node('p','','Separating verified facts from unavailable information.'))}
 try{
  const token=sessionToken();let d,mode='public';
  if(token){
   try{d=await rpc('bridgepoint_ai_answer_ui_v322',{p_query:q},12000,token);mode='auth'}
   catch(authError){d=await rpc('bridgepoint_public_ai_ask_v1055',{p_message:q},12000);mode='public';if(root){const n=node('small','bpv-session-note','Signed-in answer service needs a refreshed session; showing the public-safe BridgePoint answer instead.');root.append(n)}}
  }else d=await rpc('bridgepoint_public_ai_ask_v1055',{p_message:q},12000);
  drawAnswer(d,mode,null);
 }catch(e){drawAnswer(null,'public',e)}
 finally{asking=false;if(submit){submit.disabled=false;submit.textContent='ASK BRIDGEPOINT'}}
}
function metricCard(label,value,caption){
 const x=node('article','bpv-metric-card'),a=node('span');a.textContent=label;const b=node('b');b.textContent=value;const c=node('small');c.textContent=caption||'LIVE · BRIDGEPOINT';x.append(a,b,c);return x;
}
async function loadMetrics(){
 if(metricsLoading)return metricsLoading;
 const grid=$('#bpv-metric-grid'),updated=$('#bpv-metric-updated');
 metricsLoading=(async()=>{
  try{
   const d=await rpc('bridgepoint_public_live_counters_v5902',{},8500);
   if(!grid)return d;
   const rows=[
    ['Global canonical properties',Number(d.worldwide_canonical_total||0).toLocaleString(),'Verified canonical counter'],
    ['U.S. public parcels',Number(d.us_public_parcels||0).toLocaleString(),'U.S. parcel scope'],
    ['Non-U.S. canonical properties',Number(d.global_non_us_canonical||0).toLocaleString(),'Global non-U.S. scope'],
    ['Materialized global boundaries',Number(d.materialized_global_boundaries||0).toLocaleString(),'Boundary records · not canonical properties'],
    ['Countries with active canonical data',Number(d.active_non_us_country_count||0).toLocaleString(),'Plus U.S. public parcel coverage']
   ];
   grid.replaceChildren(...rows.map(x=>metricCard(x[0],x[1],x[2])));
   if(updated)updated.textContent='Counter payload updated '+new Date(d.updated_at||Date.now()).toLocaleString()+' · BridgePoint live contract '+(d.version||'');
   window.__BRIDGEPOINT_VIEW_METRICS__={...d,viewUpdatedAt:Date.now()};
   return d;
  }catch(e){if(updated)updated.textContent='Live counter refresh failed. Existing displayed numbers are not re-labelled as current.';return null}
 })();
 try{return await metricsLoading}finally{metricsLoading=null}
}
function wholeEarth(){
 const m=map||findMap();if(!m)return;
 try{m.stop?.();m.easeTo({center:[0,20],zoom:home?(innerWidth<=620?1.05:1.25):(innerWidth<=760?1.05:1.25),pitch:0,bearing:0,duration:650,easing:t=>1-Math.pow(1-t,3)})}catch(_){try{m.jumpTo({center:[0,20],zoom:1.2,pitch:0,bearing:0})}catch(__){}}
}
function toggleSearch(){
 const input=home?$('#landingPropertySearchInput'):$('#publicSearchInput'),form=home?$('#landingPropertySearch'):$('#publicSearchForm');
 if(!form||!input)return;
 searchVisible=!!form.hidden;form.hidden=!searchVisible;
 if(searchVisible)setTimeout(()=>input.focus({preventScroll:true}),50);
}
function buildPropertyPanel(){
 const p=$('#bpv-side-property-slots');if(p&&!p.children.length)makeSlots(p,'panel');
}

window.addEventListener('bp:building-selected',e=>{const f=e.detail?.feature||null,p=f?.properties||{},id=p.building_id||f?.id||e.detail?.buildingId||window.__BP_XRAY_STATE__?.buildingId||null,label=p.full_address||p.address||p.display_name||p.name||(id?'Building #'+id:'Selected building');selectProperty(id,label,f)});
function buildUI(){
 if(!mapHost||$('#bpv-dock'))return;
 document.body.classList.add(home?'bpv-home':'bpv-app');
 const panel=makePanel(),ui=makeTopBarAndDock();
 if(home){
  const nav=$('.site-nav'),actions=nav?.querySelector('.actions'),copy=$('.hero .copy'),main=$('main');
  if(actions)$('#bpv-account-slot').append(actions);
  if(nav)nav.hidden=true;
  if(copy)$('#bpv-home-copy-mount').append(copy);
  const content=$('#bpv-explore-mount');
  if(main&&content){
   const sections=Array.from(main.children).filter(el=>el!==$('.hero'));
   sections.forEach(el=>content.appendChild(el));
   const footer=document.querySelector('body>footer');if(footer)content.appendChild(footer);
  }
  const form=$('#landingPropertySearch'),premium=$('#landingFreePremiumTools');
  if(form)ui.searchSlot.appendChild(form);
  if(premium)ui.actions.insertBefore(premium,ui.actions.querySelector('[data-bpv-action="ai"]'));
  if(premium){premium.classList.add('bpv-premium-button');premium.textContent='FREE PREMIUM TOOLS';}
  const copyPane=$('#bpv-home-copy-mount');if(copyPane)copyPane.querySelector('.copy')?.classList.add('bpv-moved-home-copy');
  const previewCard=$('#previewCard');if(previewCard){previewCard.classList.add('bpv-map-chrome');installHomeSlots();const ob=new MutationObserver(()=>{if(!previewCard.hidden){const t=$('#previewTitle')?.textContent||'Selected building';const id=(t.match(/#(\d+)/)||[])[1];selectProperty(id||null,t,selected.feature)}});ob.observe(previewCard,{attributes:true,attributeFilter:['hidden']})}
  const sb=$('.preview-chip');if(sb)sb.hidden=true;const sample=$('.preview-sample');if(sample)sample.hidden=true;
  makeSlots($('#bpv-side-property-slots'),'home-panel');
 }else{
  const root=document.querySelector('.map-surface.active')||mapHost;
  const top=$('.topbar');if(top)top.classList.add('bpv-map-chrome');
  const banner=$('#trialBanner');if(banner)banner.classList.add('bpv-map-chrome');
  const form=$('#publicSearchForm'),tools=$('.map-tools'),premium=$('#appFreePremiumTools');
  if(form)ui.searchSlot.appendChild(form);
  if(premium){ui.actions.insertBefore(premium,ui.actions.querySelector('[data-bpv-action="ai"]'));premium.classList.add('bpv-premium-button');premium.textContent='FREE PREMIUM TOOLS'}
  const controls=$('#bpv-controls-mount');
  if(tools&&controls)controls.appendChild(tools);
  const status=$('#mapStatus');if(status&&controls)controls.appendChild(status);
  const brand=$('.map-brand-card');if(brand)brand.hidden=true;
  ['#measureReadout','#mapResults'].forEach(sel=>{const el=$(sel);if(el)el.classList.add('bpv-map-chrome')});
  if(root&&panel.parentElement!==root)document.body.appendChild(panel);
  installAppSlots();
  const bp=$('#buildingPanel');
  if(bp){const ob=new MutationObserver(()=>{if(!bp.hidden){installAppSlots();selectProperty(window.__BP_XRAY_STATE__?.buildingId||null,$('#buildingTitle')?.textContent||'Selected building',window.__BP_SELECTED_BUILDING_FEATURE__||null)}});ob.observe(bp,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true,characterData:true})}
 }
 const mapToolsPanel=$('#bpv-controls-mount');
 if(mapToolsPanel){
  const whole=$('#bpv-whole-earth');whole.addEventListener('click',wholeEarth);
 }
 const searchButton=node('button','','SEARCH');
 searchButton.type='button';searchButton.dataset.bpvAction='search';searchButton.dataset.bpvBound='1';searchButton.addEventListener('click',toggleSearch);
 const premium=ui.actions.querySelector('#landingFreePremiumTools,#appFreePremiumTools');
 if(!premium){const b=node('button','','FREE PREMIUM TOOLS');b.type='button';b.dataset.bpvAction='premium';b.addEventListener('click',()=>document.querySelector('#landingFreePremiumTools,#appFreePremiumTools')?.click());ui.actions.insertBefore(b,ui.actions.querySelector('[data-bpv-action="ai"]'))}
 // Put search and account actions at rest; hide them together while the globe is moving.
 ui.actions.insertBefore(searchButton,ui.actions.querySelector('[data-bpv-action="ai"]'));
 const panelOpenButtons=ui.actions.querySelectorAll('[data-bpv-action]');
 panelOpenButtons.forEach(b=>{if(b.dataset.bpvBound)return;b.dataset.bpvBound='1';b.addEventListener('click',()=>{const a=b.dataset.bpvAction;if(a==='search'){toggleSearch();return}if(a==='whole'){wholeEarth();return}openPanel(a)})});
 // Initialize truthful counter slots; panel fetch is on-demand to keep the map light.
 buildPropertyPanel();
 document.body.classList.add('bpv-view-ready');
 window.__BRIDGEPOINT_VIEW_V5917__={version:5917,bootedAt:Date.now(),mode:home?'WEBSITE_GLOBE':'APP_GLOBE',ready:true,features:['globe-first','movement-auto-hide','bridgepoint-ai','live-global-counters','property-slot-contract','one-panel-at-a-time'],home};
 installMapWatch();
}
function init(){
 if(!mapHost)return;
 buildUI();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();