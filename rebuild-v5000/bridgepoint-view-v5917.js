(()=>{
'use strict';
if(window.__BRIDGEPOINT_VIEW_V5917__)return;
window.__BRIDGEPOINT_VIEW_V5917__={version:5920,bootedAt:Date.now(),mode:'initializing'};
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
 aerial:['BRIDGEPOINT AERIAL VIEW','Source-dated aerial imagery appears when BridgePoint has a permitted source for this location.'],
 livecam:['BRIDGEPOINT LIVE CAMS','Live camera feeds appear only when a camera source is public or BridgePoint is authorized to display it; otherwise this slot shows coverage status.'],
 eye:['BRIDGEPOINT EYE VIEW','God’s-eye globe view with building-bound aerial, street, subsurface and timeline slots. Availability is checked per selected building.'],
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
 if(home){const card=$('#previewCard');if(card&&!card.hidden)card.hidden=true}else{const sys=$('#systemPanel'),building=$('#buildingPanel');if(sys)sys.hidden=true;if(building)building.hidden=true}
 activePanel=name;
 p.hidden=false;document.body.classList.add('bpv-panel-open');
 p.dataset.panel=name;
 const titles={ai:'BRIDGEPOINT AI',opportunities:'BRIDGEPOINT OPPORTUNITIES',mapkey:'BRIDGEPOINT MAP KEY',metrics:'BRIDGEPOINT METRICS',property:'BRIDGEPOINT PROPERTY',controls:'BRIDGEPOINT CONTROLS',explore:'EXPLORE BRIDGEPOINT'};const title=$('#bpv-sidecar-title');if(title)title.textContent=titles[name]||'BRIDGEPOINT VIEW';
 p.querySelectorAll('[data-bpv-panel]').forEach(b=>{const on=b.dataset.bpvPanel===name;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on?'true':'false')});
 p.querySelectorAll('[data-bpv-pane]').forEach(s=>{s.hidden=s.dataset.bpvPane!==name});
 if(name==='metrics')void loadMetrics();
 if(name==='opportunities'){void window.__BP_MAP_KEY_REFRESH_V5920__?.(true);void loadOpportunityBreakdown()}
 if(name==='mapkey')void window.__BP_MAP_KEY_REFRESH_V5920__?.(true);
 if(name==='property')refreshSlotLabels();
 if(name==='ai')setTimeout(()=>$('#bpv-ai-question')?.focus({preventScroll:true}),60);
}
function setMoving(){
 moveUntil=Date.now()+850;
 document.body.classList.add('bpv-map-moving');
 clearTimeout(idleTimer);
 idleTimer=setTimeout(()=>{if(Date.now()>=moveUntil){document.body.classList.remove('bpv-map-moving');return}setMoving()},900);
}
function stopMoving(){
 moveUntil=Date.now()+850;clearTimeout(idleTimer);
 idleTimer=setTimeout(()=>{if(Date.now()>=moveUntil)document.body.classList.remove('bpv-map-moving')},900);
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
  '<button type="button" data-bpv-panel="opportunities">OPPORTUNITIES</button>'+
  '<button type="button" data-bpv-panel="mapkey">MAP KEY</button>'+
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
  '<section data-bpv-pane="opportunities" hidden>'+
  '<div class="bpv-pane-title"><b>BridgePoint opportunity inventory</b><small>Main map inventory and separate customer-ready / international risk-review cohorts are counted independently.</small></div>'+
  '<div id="bpv-opportunity-summary" class="bpv-metric-grid"><div class="bpv-metric-card"><span>Separate cohort records</span><b>CONNECTING</b><small>Refreshing customer-ready + risk-review cohorts</small></div></div>'+
  '<div class="bpv-opportunity-section"><div class="bpv-opportunity-section-head"><b>U.S. CUSTOMER-READY COHORT BY TYPE</b><small>Current READY cache generation; properties can appear in multiple types. This is not the full map inventory.</small></div><div id="bpv-opportunity-customer-types" class="bpv-opportunity-list"></div></div>'+
  '<div class="bpv-opportunity-section"><div class="bpv-opportunity-section-head"><b>INTERNATIONAL RISK-REVIEW COHORT BY TYPE</b><small>Exposure/resilience reviews, not proof of property damage or commercial intent.</small></div><div id="bpv-opportunity-global-types" class="bpv-opportunity-list"></div></div>'+
  '<div class="bpv-opportunity-section"><div class="bpv-opportunity-section-head"><b>U.S. CUSTOMER-READY COHORT BY STATE</b><small>These state counts do not represent every main-map record.</small></div><div id="bpv-opportunity-states" class="bpv-opportunity-list"></div></div>'+
  '<div class="bpv-opportunity-section"><div class="bpv-opportunity-section-head"><b>INTERNATIONAL RISK-REVIEW COHORT BY COUNTRY</b><small>These country totals are not the complete main-map country distribution.</small></div><div id="bpv-opportunity-countries" class="bpv-opportunity-list"></div></div>'+
  '<div class="bpv-opportunity-section"><div class="bpv-opportunity-section-head"><b>SEPARATE PUBLIC LISTING INVENTORY</b><small>Active HUD/FHA REO for-sale listings are separate from the opportunity-record total.</small></div><div id="bpv-opportunity-listing-summary" class="bpv-metric-grid"></div><details id="bpv-opportunity-listing-details" class="bpv-opportunity-details"><summary>VIEW ACTIVE LISTINGS BY STATE</summary><div id="bpv-opportunity-listing-states" class="bpv-opportunity-list"></div></details></div>'+
  '<p id="bpv-opportunity-updated" class="bpv-data-note">Waiting for the live BridgePoint opportunity breakdown.</p>'+
  '<p class="bpv-data-note">Buildings and 3D models are geometry inventory, not opportunity records. Main map records, customer-ready records, global risk reviews and public listings are separate inventories and are not added together.</p></section>'+
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
 '<button type="button" data-bpv-action="opportunities">OPPORTUNITIES</button>'+
 '<button type="button" data-bpv-action="metrics">COUNTERS</button>'+
 '<button type="button" data-bpv-action="controls">LAYERS + TOOLS</button>'+
  '<button type="button" data-bpv-action="satellite">SATELLITE FILTERS</button>'+
 '<button type="button" data-bpv-action="property">PROPERTY SLOTS</button>'+
 (home?'<button type="button" data-bpv-action="explore">EXPLORE</button>':'')+
 '<button type="button" class="bpv-whole-earth-short" data-bpv-action="whole">WHOLE EARTH</button></div>';
 mapHost.append(top,dock);
 dock.querySelectorAll('[data-bpv-action]').forEach(b=>b.addEventListener('click',()=>{
  const a=b.dataset.bpvAction;
  if(a==='whole'){wholeEarth();return}
  if(a==='search'){toggleSearch();return}
  if(a==='premium'){document.querySelector('#landingFreePremiumTools,#appFreePremiumTools')?.click();return}
  if(a==='satellite'){
   const current=window.__BP_SPECTRAL_IMAGERY_V5909__;
   if(current?.open){current.open();return}
   const surfaceWorld=home?window.__BP_LANDING_WORLD__:window.__BP_V5000_WORLD__;
   void import('./world-v2300-spectral-imagery.js?v=5926-landsat-six-combinations')
    .then(m=>{const api=window.__BP_SPECTRAL_IMAGERY_V5909__||m.initSpectralImagery(surfaceWorld);api?.open?.()})
    .catch(e=>console.warn('BridgePoint satellite filters unavailable',e));
   return;
  }
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
  btn.innerHTML='<span class="bpv-slot-icon">'+({ai:'AI',xray:'X·RAY',underground:'SUB',street:'ST',aerial:'AIR',livecam:'LIVE',eye:'EYE',heartbeat:'♥',timeline:'T+',roof:'ROOF',provenance:'SRC'}[key]||'BP')+'</span><span>'+info[0]+'</span><span class="bpv-slot-arrow">↗</span>';
  const status=node('small','bpv-slot-status');
  status.dataset.bpvSlotStatus=key;
  status.textContent=key==='ai'?'Ready':key==='xray'?'Checks source-backed parts and plans':key==='underground'?'Not yet verified for this property':key==='street'?'Coverage varies by property':key==='aerial'?'Source-backed imagery only':key==='livecam'?'Checking authorized live-camera coverage':key==='eye'?'BridgePoint Eye view ready; property coverage varies':key==='heartbeat'?'Waiting for property evidence':key==='timeline'?'Waiting for linked history':'Source availability checked by property';
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
 if(key==='aerial'||key==='street'||key==='livecam'||key==='eye'){
  openPanel('controls');
  const tools=$('#bp5507-tools');
  if(tools){const toolKey=key==='aerial'||key==='eye'?'IMAGERY':key==='livecam'?'CAMERAS':'DRIVE';const p=tools.querySelector('[data-tool="'+toolKey+'"]');if(p){p.click();return}}
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
 const title=mode==='auth'?(d?.headline||'BridgePoint AI'):('BridgePoint AI · '+(d?.mode||'public-safe answer'));
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
function metricCard(label,value,caption,key=''){
 const x=node('article','bpv-metric-card'),a=node('span');a.textContent=label;
 const b=node('b');b.textContent=String(value??'—');if(key)b.dataset.bpvMetricKey=key;
 const d=node('small');d.textContent=caption||'BRIDGEPOINT VERIFIED SCOPE';x.append(a,b,d);return x;
}
function parseMetric(value){
 if(value===null||value===undefined||value==='')return null;
 const n=typeof value==='number'?value:Number(String(value).replace(/[,\s]/g,''));
 return Number.isFinite(n)?n:null;
}
function metricFormat(value){const n=parseMetric(value);return n===null?'—':Math.round(n).toLocaleString()}
function globalMetricRows(live,headline){
 const raw=[
  ['Worldwide canonical properties',live?.worldwide_canonical_total,'One verified total: U.S. public parcels + non-U.S. canonical properties','worldwide_canonical_total'],
  ['U.S. public parcels',live?.us_public_parcels,'U.S. public-parcel scope only','us_public_parcels'],
  ['Non-U.S. canonical properties',live?.global_non_us_canonical,'Non-U.S. scope; U.S. territories are not added twice','global_non_us_canonical'],
  ['Active non-U.S. canonical countries',live?.active_non_us_country_count,'Countries with active non-U.S. canonical records','active_non_us_country_count'],
  ['Worldwide map-ready building geometries',headline?.map_ready_buildings,'Building geometry count; not a property count','map_ready_buildings'],
  ['Worldwide address records',headline?.world_address_records??headline?.address_records,'Global address index','world_address_records'],
  ['Worldwide stored boundary total',headline?.world_stored_boundaries,'U.S. stored-boundary estimate + materialized non-U.S. rows; not canonical properties','world_stored_boundaries'],
  ['U.S. stored-boundary estimate',headline?.us_stored_boundaries,'Estimated U.S. stored boundary count','us_stored_boundaries'],
  ['Non-U.S. materialized boundary rows',live?.materialized_global_boundaries,'Materialized row count, kept separate from canonical properties','materialized_global_boundaries'],
  ['Global 3D building models',headline?.global_3d_building_models,'Indexed 3D models; not every building has a model','global_3d_building_models'],
  ['Global roof-shell buildings',headline?.global_roof_shell_buildings,'Roof-shell coverage; not exact roof-plane count','global_roof_shell_buildings'],
  ['Global exact roof-plane records',headline?.global_exact_roof_plane_records,'Exact/source-backed roof-plane records','global_exact_roof_plane_records'],
  ['Global transport source rows',headline?.global_transport_rows,'Transport source rows; not unique route count','global_transport_rows'],
  ['Global live weather events',headline?.weather_events,'Current public event-feed count','weather_events'],
  ['Worldwide active opportunities',headline?.opportunities_total,'Active U.S. + non-U.S. opportunity rows','opportunities_total'],
  ['Unique opportunity properties',headline?.opportunity_properties,'Properties represented in the active opportunity set','opportunity_properties'],
  ['Active opportunity jurisdictions',headline?.opportunity_jurisdictions,'States and countries with active opportunities','opportunity_jurisdictions'],
  ['Countries represented in coverage',headline?.world_country_count,'Coverage register can include footholds/backlog; not all are active canonical','world_country_count']
 ];
 return raw.filter(x=>x[1]!==null&&x[1]!==undefined&&x[1]!=='').map(x=>({label:x[0],value:metricFormat(x[1]),numeric:parseMetric(x[1]),caption:x[2],key:x[3]}));
}
function animateGlobalMetric(el,start,end,duration=900){
 if(!el||!Number.isFinite(start)||start<=0||!Number.isFinite(end)||end<=start||matchMedia('(prefers-reduced-motion: reduce)').matches){if(el)el.textContent=metricFormat(end);return}
 const started=performance.now();
 const draw=now=>{
  const p=Math.min(1,(now-started)/duration),eased=1-Math.pow(1-p,3);
  el.textContent=Math.round(start+(end-start)*eased).toLocaleString();
  if(p<1)requestAnimationFrame(draw);else el.textContent=metricFormat(end);
 };
 requestAnimationFrame(draw);
}
async function loadMetrics(){
 if(metricsLoading)return metricsLoading;
 const grid=$('#bpv-metric-grid'),updated=$('#bpv-metric-updated');
 const knownLive=home?(window.__BP_LIVE_COUNTRY_COUNTERS__||{}):(window.__BP_GLOBAL_PROPERTY_V957__?.liveData||window.__BP_LIVE_COUNTRY_COUNTERS__||{});
 const knownHeadline=window.__BP_HEADLINE_V5822__||window.__BRIDGEPOINT_VIEW_METRICS__||{};
 const knownRows=globalMetricRows(knownLive,knownHeadline);
 const initialWorld=parseMetric(window.__BRIDGEPOINT_VIEW_METRICS__?.worldwide_canonical_total??knownLive.worldwide_canonical_total??(home?$('#landingGlobalProperties')?.textContent:null));
 const initialHeadlineAt=knownHeadline.computed_at||knownHeadline.updated_at||null;
 if(grid&&knownRows.length)grid.replaceChildren(...knownRows.map(x=>metricCard(x.label,x.value,x.caption,x.key)));
 else if(grid)grid.replaceChildren(metricCard('Worldwide canonical properties','CONNECTING','Refreshing the verified BridgePoint global counter','worldwide_canonical_total'));
 if(updated&&initialHeadlineAt)updated.textContent='Last known global metric snapshot · '+new Date(initialHeadlineAt).toLocaleString()+' · refreshing now';
 metricsLoading=(async()=>{
  try{
   const [live,headline]=await Promise.all([
    rpc('bridgepoint_public_live_counters_v5902',{},8500),
    rpc('bridgepoint_public_headline_v5822',{},8500).catch(e=>{console.warn('BridgePoint global headline unavailable',e);return null})
   ]);
   if(!grid)return {live,headline};
   const rows=globalMetricRows(live,headline||knownHeadline);
   const currentWorld=parseMetric(live.worldwide_canonical_total);
   grid.replaceChildren(...rows.map(x=>metricCard(x.label,x.value,x.caption,x.key)));
   const valueEl=grid.querySelector('[data-bpv-metric-key="worldwide_canonical_total"]');
   if(valueEl&&initialWorld!==null&&currentWorld!==null&&currentWorld>initialWorld)animateGlobalMetric(valueEl,initialWorld,currentWorld);
   if(updated)updated.textContent='Verified BridgePoint counters updated '+new Date(live.updated_at||headline?.computed_at||Date.now()).toLocaleString()+' · live counter contract '+(live.version||'')+(headline?' · headline cache '+new Date(headline.computed_at||headline.cache_updated_at||Date.now()).toLocaleTimeString():' · headline metrics temporarily unavailable');
   window.__BRIDGEPOINT_VIEW_METRICS__={...(headline||{}),...live,viewUpdatedAt:Date.now()};
   return {live,headline};
  }catch(e){
   if(updated)updated.textContent='Live counter refresh failed. Existing values remain labelled as last known, not current.';
   return null;
  }
 })();
 try{return await metricsLoading}finally{metricsLoading=null}
}

let opportunityDashboardLoading=null,opportunityDashboardLast=null,opportunityDashboardLastAt=0;
const OPPORTUNITY_TYPE_LABELS={roofing:'Roofing opportunities',property_investment:'Investor / acquisition',general_contracting:'General contracting / construction',restoration:'Restoration opportunities',public_adjusting:'Public adjusting / claims',development:'Development / redevelopment',PRECIPITATION_EXPOSURE_REVIEW:'Precipitation exposure review',FLOOD_RESILIENCE_REVIEW:'Flood resilience review',MULTI_HAZARD_RESILIENCE_REVIEW:'Multi-hazard resilience review'};
const OPPORTUNITY_FAMILY_LABELS={property_damage:'Property damage',acquisition:'Acquisition',construction:'Construction',claims:'Claims',redevelopment:'Redevelopment',GLOBAL_PROPERTY_RISK:'Global property-risk review'};
const OPPORTUNITY_STATE_NAMES={AK:'Alaska',AL:'Alabama',AR:'Arkansas',AZ:'Arizona',CA:'California',CO:'Colorado',CT:'Connecticut',DC:'District of Columbia',DE:'Delaware',FL:'Florida',GA:'Georgia',HI:'Hawaii',IA:'Iowa',ID:'Idaho',IL:'Illinois',IN:'Indiana',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',MA:'Massachusetts',MD:'Maryland',ME:'Maine',MI:'Michigan',MN:'Minnesota',MO:'Missouri',MS:'Mississippi',MT:'Montana',NC:'North Carolina',ND:'North Dakota',NE:'Nebraska',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NV:'Nevada',NY:'New York',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',PR:'Puerto Rico',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VA:'Virginia',VT:'Vermont',WA:'Washington',WI:'Wisconsin',WV:'West Virginia',WY:'Wyoming'};
const OPPORTUNITY_COUNTRY_NAMES={CO:'Colombia',PA:'Panama'};
function opportunityLabel(key){const k=String(key||'');return OPPORTUNITY_TYPE_LABELS[k]||OPPORTUNITY_TYPE_LABELS[k.toUpperCase()]||k.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,m=>m.toUpperCase())}
function opportunityFamilyLabel(key){const k=String(key||'');return OPPORTUNITY_FAMILY_LABELS[k]||k.replaceAll('_',' ').toLowerCase().replace(/\b\w/g,m=>m.toUpperCase())}
function opportunityDate(value){if(!value)return'not reported';const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString()}
function opportunityLocationLabel(code,kind){const c=String(code||'').toUpperCase();return kind==='country'?(OPPORTUNITY_COUNTRY_NAMES[c]||c):((OPPORTUNITY_STATE_NAMES[c]||c)+' · '+c)}
function opportunityTextNode(tag,cls,value){const el=node(tag,cls);el.textContent=String(value??'');return el}
function opportunityRow(title,count,meta,chips){
 const row=node('article','bpv-opportunity-row'),info=node('div','bpv-opportunity-row-info');
 const name=opportunityTextNode('b','',title),detail=opportunityTextNode('small','',meta||''),value=opportunityTextNode('strong','bpv-opportunity-value',metricFormat(count));
 info.append(name,detail);row.append(info,value);
 if(Array.isArray(chips)&&chips.length){const group=node('div','bpv-opportunity-chips');chips.forEach(t=>group.appendChild(opportunityTextNode('span','bpv-opportunity-chip',t)));row.appendChild(group)}
 return row;
}
function setOpportunityRows(id,rows){const target=$('#'+id);if(!target)return;target.replaceChildren();if(!rows?.length){target.appendChild(opportunityTextNode('div','bpv-opportunity-empty','No records in this cohort.'));return}rows.forEach(r=>target.appendChild(r))}
function setOpportunityCards(counts){
 const target=$('#bpv-opportunity-summary');if(!target)return;
 const cards=[
  ['All opportunity records',counts.total_opportunities,metricFormat(counts.customer_ready_opportunities)+' U.S. customer-ready + '+metricFormat(counts.global_risk_opportunities)+' global risk-review records'],
  ['Unique properties',counts.total_unique_properties,'Distinct properties in the two separate opportunity cohorts'],
  ['Active jurisdictions',counts.active_jurisdictions,'15 U.S. states + 2 countries'],
  ['U.S. customer-ready',counts.customer_ready_opportunities,'Current READY cache generation'],
  ['Global risk reviews',counts.global_risk_opportunities,'Exposure/resilience review records, not confirmed damage'],
  ['Active public REO listings',counts.active_reo_for_sale_listings,'Separate for-sale inventory; not added to opportunity total']
 ];
 target.replaceChildren(...cards.map(c=>metricCard(c[0],metricFormat(c[1]),c[2])));
 const list=$('#bpv-opportunity-listing-summary');if(list)list.replaceChildren(
  metricCard('Active HUD/FHA REO listings',metricFormat(counts.active_reo_for_sale_listings),'Public for-sale inventory snapshot'),
  metricCard('States / jurisdictions with listings',metricFormat(counts.active_reo_states),'Separate listing footprint')
 );
}
function renderOpportunityBreakdown(d){
 const c=d?.counts||{};setOpportunityCards(c);
 const customerTypes=Array.isArray(d.customer_ready_by_type)?d.customer_ready_by_type:[];
 setOpportunityRows('bpv-opportunity-customer-types',customerTypes.map(t=>opportunityRow(opportunityLabel(t.vertical_key),t.opportunity_count,opportunityFamilyLabel(t.opportunity_family)+' · '+metricFormat(t.unique_properties)+' type-matched properties · '+metricFormat(t.state_count)+' states')));
 const globalTypes=Array.isArray(d.global_risk_by_type)?d.global_risk_by_type:[];
 setOpportunityRows('bpv-opportunity-global-types',globalTypes.map(t=>opportunityRow(opportunityLabel(t.opportunity_key),t.opportunity_count,opportunityLocationLabel(t.country_code,'country')+' · '+metricFormat(t.unique_properties)+' type-matched properties · evidence through '+opportunityDate(t.latest_evidence_at))));
 const states=Array.isArray(d.customer_ready_by_state)?d.customer_ready_by_state:[];
 setOpportunityRows('bpv-opportunity-states',states.map(s=>{
  const types=Object.entries(s.by_type||{}).sort((a,b)=>Number(b[1])-Number(a[1])).map(([k,v])=>opportunityLabel(k)+' '+metricFormat(v));
  return opportunityRow(opportunityLocationLabel(s.state_code,'state'),s.opportunity_count,metricFormat(s.unique_properties)+' distinct properties',types);
 }));
 const countries=Array.isArray(d.global_risk_by_country)?d.global_risk_by_country:[];
 setOpportunityRows('bpv-opportunity-countries',countries.map(ct=>{
  const types=Object.entries(ct.by_type||{}).sort((a,b)=>Number(b[1])-Number(a[1])).map(([k,v])=>opportunityLabel(k)+' '+metricFormat(v));
  return opportunityRow(opportunityLocationLabel(ct.country_code,'country'),ct.opportunity_count,metricFormat(ct.unique_properties)+' distinct properties · '+metricFormat(ct.type_count)+' risk-review types',types);
 }));
 const listingStates=Array.isArray(d.active_reo_by_state)?d.active_reo_by_state:[];
 setOpportunityRows('bpv-opportunity-listing-states',listingStates.map(st=>opportunityRow(opportunityLocationLabel(st.state_code,'state'),st.listing_count,'Active public HUD/FHA REO for-sale listings')));
 const f=d.freshness||{},up=$('#bpv-opportunity-updated');
 if(up)up.textContent='Dashboard generated '+opportunityDate(d.generated_at)+' · U.S. cache refreshed '+opportunityDate(f.customer_cache_refreshed_at)+' · global risk rows updated '+opportunityDate(f.global_risk_updated_at)+' · REO source checked '+opportunityDate(f.active_reo_source_checked_at);
 window.__BRIDGEPOINT_OPPORTUNITY_DASHBOARD_V5919__={version:5919,generatedAt:d.generated_at,counts:c,updatedAt:Date.now()};
}
async function loadOpportunityBreakdown(){
 if(opportunityDashboardLoading)return opportunityDashboardLoading;
 if(opportunityDashboardLast&&Date.now()-opportunityDashboardLastAt<30000){renderOpportunityBreakdown(opportunityDashboardLast);return opportunityDashboardLast}
 const summary=$('#bpv-opportunity-summary'),updated=$('#bpv-opportunity-updated');
 if(summary&&!opportunityDashboardLast)summary.replaceChildren(metricCard('Opportunity records','CONNECTING','Refreshing current BridgePoint cohorts'));
 opportunityDashboardLoading=(async()=>{
  try{
   const d=await rpc('bridgepoint_public_opportunity_breakdown_v5919',{},11000);
   if(!d||d.complete!==true||Number(d.version)!==5919||!d.counts)throw new Error('Opportunity count contract is incomplete');
   renderOpportunityBreakdown(d);opportunityDashboardLast=d;opportunityDashboardLastAt=Date.now();return d;
  }catch(e){
   if(updated)updated.textContent='Opportunity counts could not be refreshed. '+String(e?.message||e);
   if(summary&&!opportunityDashboardLast)summary.replaceChildren(metricCard('Opportunity records','UNAVAILABLE','No current count is shown until BridgePoint refresh succeeds'));
   return null;
  }finally{opportunityDashboardLoading=null}
 })();
 return opportunityDashboardLoading;
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
  const top=$('.topbar');
  if(top){
   const nativeActions=top.querySelector('.topbar-actions');
   if(nativeActions){nativeActions.classList.add('actions');$('#bpv-account-slot')?.appendChild(nativeActions)}
   top.hidden=true;
  }
  const banner=$('#trialBanner');if(banner)banner.classList.add('bpv-map-chrome');
  const systemToggle=$('#togglePanel');
  if(systemToggle)systemToggle.onclick=()=>{
   closePanel();
   const p=$('#systemPanel');if(!p)return;
   const visible=!p.hidden&&getComputedStyle(p).display!=='none';
   if(visible){p.hidden=true;p.style.display='none'}
   else{p.hidden=false;p.style.display='block'}
  };
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
 panelOpenButtons.forEach(b=>{if(b.dataset.bpvBound)return;b.dataset.bpvBound='1';b.addEventListener('click',()=>{const a=b.dataset.bpvAction;if(a==='search'){toggleSearch();return}if(a==='whole'){wholeEarth();return}if(a==='premium'){document.querySelector('#landingFreePremiumTools,#appFreePremiumTools')?.click();return}openPanel(a)})});
 // Initialize truthful counter slots; panel fetch is on-demand to keep the map light.
 buildPropertyPanel();
 document.body.classList.add('bpv-view-ready');
 window.__BRIDGEPOINT_VIEW_V5917__={version:5919,bootedAt:Date.now(),mode:home?'WEBSITE_GLOBE':'APP_GLOBE',ready:true,features:['globe-first','movement-auto-hide','bridgepoint-ai','live-global-counters','live-opportunity-breakdown','property-slot-contract','one-panel-at-a-time'],home};
 installMapWatch();
}
function init(){
 if(!mapHost)return;
 buildUI();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();