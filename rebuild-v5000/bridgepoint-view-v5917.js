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
let map=null,idleTimer=0,moveUntil=0,selected={id:null,label:'',feature:null,coordinates:null},activePanel='ai',metricsLoading=null,asking=false,searchVisible=true;
let listingLoading=null,listingSummaryCache=null,listingSummaryAt=0,listingFeaturesCache=[],listingOverlayOn=false,listingMapTimer=0,listingLastViewportAt=0,listingQueryValue='',listingSelectedId=null,listingRefreshTimer=0;
const SLOT_INFO={
 ai:['BRIDGEPOINT AI','Ask a question about this selected property.'],
 xray:['X-RAY + INTERIOR','Source-backed parts, floors and plans only. No fabricated rooms.'],
 underground:['UNDERGROUND + UTILITIES','Pipe and subsurface records appear only when a lawful source is linked to this property.'],
 street:['STREET-LEVEL VIEW','Street scene coverage is checked at this property; unavailable imagery stays clearly marked.'],
 aerial:['BRIDGEPOINT AERIAL VIEW','Source-dated aerial imagery appears when BridgePoint has a permitted source for this location.'],
 livecam:['BRIDGEPOINT LIVE CAMS','Live camera feeds appear only when a camera source is public or BridgePoint is authorized to display it; otherwise this slot shows coverage status.'],
 eye:['BRIDGEPOINT WORLD VIEW','God’s-eye globe view with building-bound aerial, street, subsurface and timeline slots. Availability is checked per selected building.'],
 heartbeat:['PROPERTY HEARTBEAT','Latest evidence, change signals and source freshness when records exist.'],
 timeline:['PROPERTY TIMELINE','Property-linked weather, permits, imagery and change events when verified.'],
 roof:['ROOF + BUILDING PARTS','Roof and component geometry with source/confidence labels.'],
 provenance:['SOURCES + PROVENANCE','Source, observation time, rights scope and confidence for every exposed fact.'],
 zoning:['LOT COVERAGE + ZONING','Compute the union of source-backed building footprints against the matched parcel; show a legal maximum only when an official current zoning rule is verified.']
};
function node(tag,cls,html){const n=document.createElement(tag);if(cls)n.className=cls;if(html!==undefined)n.innerHTML=html;return n}
function addClass(el,cls){if(el)el.classList.add(cls)}
function setDockMaximized(on){const d=$('#bpv-dock'),b=$('[data-bpv-dock-expand]');if(!d)return;d.classList.toggle('bpv-dock-maximized',!!on);if(b){b.textContent=on?'RESTORE ↘':'MAXIMIZE ↗';b.setAttribute('aria-pressed',String(!!on))}}
function showActionNotice(message){
 const info=$('#bpv-more-info');if(info)info.open=true;
 const slot=$('#bpv-status-panel-slot')||$('#bpv-external-tools-slot')||$('#bpv-dock-actions');
 if(!slot)return;
 let n=$('#bpv-action-feedback');
 if(!n){n=node('div','bpv-action-feedback');n.id='bpv-action-feedback';n.setAttribute('role','status');n.style.cssText='padding:10px 12px;margin:6px 0;border:1px solid rgba(255,174,112,.42);border-radius:10px;background:rgba(45,23,13,.82);color:#ffe2cc;font:600 11px/1.45 system-ui,sans-serif;overflow-wrap:anywhere';slot.prepend(n)}
 n.textContent=String(message||'BridgePoint could not complete that action.');n.hidden=false;
}
window.__BP_SHOW_ACTION_NOTICE__=showActionNotice;
function closePanel(){const p=$('#bpv-sidecar');if(p){p.hidden=true;p.removeAttribute('data-panel')}document.body.classList.remove('bpv-panel-open');const rail=$('#bpv-mapkey-rail');if(rail)rail.setAttribute('aria-expanded','false');setDockMaximized(false)}
function openPanel(name){
 const p=$('#bpv-sidecar');if(!p)return;
 if(home){const card=$('#previewCard');if(card&&!card.hidden&&name!=='mapkey')card.hidden=true}else if(name!=='mapkey'){const sys=$('#systemPanel'),building=$('#buildingPanel');if(sys)sys.hidden=true;if(building)building.hidden=true}
 activePanel=name;
 p.hidden=false;p.dataset.panel=name;document.body.classList.add('bpv-panel-open');setDockMaximized(name!=='mapkey');
 const rail=$('#bpv-mapkey-rail');if(rail)rail.setAttribute('aria-expanded',String(name==='mapkey'));
 const titles={ai:'BRIDGEPOINT AI',opportunities:'BRIDGEPOINT OPPORTUNITIES',listings:'BRIDGEPOINT LISTINGS',mapkey:'BRIDGEPOINT MAP KEY',metrics:'BRIDGEPOINT METRICS',property:'BRIDGEPOINT PROPERTY',controls:'BRIDGEPOINT CONTROLS',account:'ACCOUNT & BILLING',explore:'EXPLORE BRIDGEPOINT'};const title=$('#bpv-sidecar-title');if(title)title.textContent=titles[name]||'BRIDGEPOINT WORLD';
 p.querySelectorAll('[data-bpv-panel]').forEach(b=>{const on=b.dataset.bpvPanel===name;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on?'true':'false')});
 p.querySelectorAll('[data-bpv-pane]').forEach(s=>{s.hidden=s.dataset.bpvPane!==name});
 if(name==='metrics')void loadMetrics();
 if(name==='account')void loadAccountBilling();
 if(name==='listings')void loadListings(true);
 if(name==='opportunities'){void window.__BP_MAP_KEY_REFRESH_V5920__?.(true);void loadOpportunityBreakdown()}
 if(name==='mapkey')void window.__BP_MAP_KEY_REFRESH_V5920__?.(true);
 if(name==='property')refreshSlotLabels();
 if(name==='ai')setTimeout(()=>$('#bpv-ai-question')?.focus({preventScroll:true}),60);
 if(name!=='mapkey')requestAnimationFrame(()=>{try{p.scrollIntoView({block:'start',behavior:'smooth'})}catch(_){}});
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
 if(!m.__bpListingsEventsV5927){m.__bpListingsEventsV5927=true;m.on('moveend',()=>{if(!listingOverlayOn)return;clearTimeout(listingMapTimer);const wait=Math.max(700,3800-(Date.now()-listingLastViewportAt));listingMapTimer=setTimeout(()=>{listingLastViewportAt=Date.now();void loadListings(true,listingQueryValue)},wait)});m.on('styledata',()=>{if(listingOverlayOn)ensureListingLayers(m)});}
 if(listingOverlayOn){const prime=()=>{if(map!==m)return;ensureListingLayers(m);void loadListings(true,listingQueryValue)};if(m.isStyleLoaded?.())prime();else try{m.once('load',prime)}catch(_){}}
 const start=()=>setMoving(),end=()=>stopMoving();
 for(const e of ['movestart','zoomstart','rotatestart','pitchstart','dragstart'])try{m.on(e,start)}catch(_){}
 for(const e of ['moveend','zoomend','rotateend','pitchend','dragend'])try{m.on(e,end)}catch(_){}
 if(mapHost){
  mapHost.addEventListener('pointerdown',e=>{if(e.target.closest('button,a,input,textarea,form,[role="button"],.bpv-sidecar'))return;setMoving()},{passive:true,capture:true});
  mapHost.addEventListener('touchstart',e=>{if(e.target.closest('button,a,input,textarea,form,[role="button"],.bpv-sidecar'))return;setMoving()},{passive:true,capture:true});
  mapHost.addEventListener('wheel',e=>{if(e.target&&e.target.closest('#bpv-sidecar,.bpv-dock,#previewCard,.building-panel,.system-panel,.map-tools,[data-bpv-pane],.bpv-sidecar-tabs'))return;setMoving()},{passive:true,capture:true});
 }
 window.__BRIDGEPOINT_VIEW_V5917__={version:5917,mode:home?'WEBSITE_GLOBE':'APP_GLOBE',mapAttached:true,attachedAt:Date.now(),map,moving:false};
}
function findMap(){return home?(window.__BP_LANDING_WORLD__?.map||window.__bpLandingWorldV5420?.map||null):(window.__BP_V5000_WORLD__?.map||null)}
function installMapWatch(){const m=findMap();if(m){attachMap(m);return}let turns=0;const tick=()=>{if(map)return;const n=findMap();if(n){attachMap(n);return}if(++turns<300)setTimeout(tick,100)};setTimeout(tick,150)}
function makePanel(){
 const p=node('aside','bpv-sidecar bpv-map-chrome');p.id='bpv-sidecar';p.hidden=true;p.setAttribute('aria-label','BridgePoint World control deck');
 p.innerHTML=
  '<div class="bpv-sidecar-head"><div><span class="bpv-eyebrow">BRIDGEPOINT WORLD</span><b id="bpv-sidecar-title">BRIDGEPOINT AI</b></div><button id="bpv-panel-close" type="button" aria-label="Close BridgePoint panel">×</button></div>'+
  '<nav class="bpv-sidecar-tabs" aria-label="BridgePoint World panels">'+
  '<button type="button" data-bpv-panel="ai">BRIDGEPOINT AI</button>'+
  '<button type="button" data-bpv-panel="opportunities">OPPORTUNITIES</button>'+
  '<button type="button" data-bpv-panel="listings">LISTINGS</button>'+

  '<button type="button" data-bpv-panel="metrics">LIVE METRICS</button>'+
  '<button type="button" data-bpv-panel="property">PROPERTY</button>'+
  (home?'<button type="button" data-bpv-panel="explore">EXPLORE</button>':'')+
  '<button type="button" data-bpv-panel="controls">CONTROLS</button>'+
  '<button type="button" data-bpv-panel="account">ACCOUNT & BILLING</button></nav>'+
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
  '<section data-bpv-pane="listings" hidden><div class="bpv-pane-title"><b>BRIDGEPOINT · PROPERTY LISTINGS</b><small>View listing records and available BridgePoint-hosted images here. No outbound listing links.</small></div>'+
  '<form id="bpv-listings-search" class="bpv-listings-search"><input type="search" aria-label="Search BridgePoint listings" placeholder="Search address, city, rentals…"><button type="submit">SEARCH</button></form>'+
  '<div id="bpv-listings-summary" class="bpv-listings-summary">Loading materialized listing records…</div>'+
  '<button type="button" id="bpv-listings-overlay-toggle" class="bpv-wide-action" aria-pressed="true">LISTING MAP OVERLAY · ON</button>'+
  '<div id="bpv-listings-items" class="bpv-listings-items"></div>'+
  '<p id="bpv-listings-note" class="bpv-data-note">Only records currently materialized into BridgePoint are shown. Source freshness, photo provenance, and address accuracy stay visible.</p></section>'+
  '<section data-bpv-pane="controls" hidden><div class="bpv-pane-title"><b>BridgePoint Controls</b><small>Layers and map actions live here so the globe remains unobstructed.</small></div><div id="bpv-controls-mount"></div>'+
  '<button type="button" class="bpv-wide-action" id="bpv-whole-earth">RETURN TO WHOLE EARTH</button></section>'+
  '<section data-bpv-pane="account" hidden><div class="bpv-pane-title"><b>Account, payments & subscriptions</b><small>Your current plan, subscription dates, package choices, invoices and cancellation controls.</small></div>'+
  '<div class="bpv-account-header"><div><span class="bpv-account-eyebrow">SIGNED-IN ACCOUNT</span><b id="bpv-account-email">Checking account…</b><small id="bpv-account-state">Secure account details load only after sign-in.</small></div><a class="bpv-account-pricing-link" href="/pricing.html">PUBLIC PRICING ↗</a></div>'+
  '<div class="bpv-account-actions"><button type="button" id="bpv-account-open-portal" class="bpv-account-primary">MANAGE PAYMENTS / CHANGE OR CANCEL</button><button type="button" id="bpv-account-refresh" class="bpv-account-secondary">REFRESH ACCOUNT</button></div>'+
  '<div id="bpv-account-feedback" class="bpv-account-feedback" role="status" aria-live="polite" hidden></div>'+
  '<div id="bpv-account-summary" class="bpv-account-subscriptions"></div>'+
  '<div class="bpv-account-catalog-head"><b>AVAILABLE PACKAGES</b><small>Choose a package using BridgePoint’s live catalog. Checkout and payment changes are handled securely by Stripe.</small></div>'+
  '<div id="bpv-account-packages" class="bpv-account-packages"><p class="bpv-data-note">Sign in to load package options.</p></div>'+
  '</section>'+
  (home?'<section data-bpv-pane="explore" hidden><div class="bpv-pane-title"><b>Explore BridgePoint</b><small>Supporting information, access, updates and platform details—behind the globe, not over it.</small></div><div id="bpv-explore-mount"></div></section>':'');
 document.body.appendChild(p);
 $('#bpv-panel-close').addEventListener('click',closePanel);
 p.querySelectorAll('[data-bpv-panel]').forEach(b=>b.addEventListener('click',()=>openPanel(b.dataset.bpvPanel)));
 p.querySelectorAll('[data-bpv-prompt]').forEach(b=>b.addEventListener('click',()=>{$('#bpv-ai-question').value=b.dataset.bpvPrompt;openPanel('ai')}));
 $('#bpv-ai-form').addEventListener('submit',e=>{e.preventDefault();void askBridgePoint()});
 $('#bpv-listings-search')?.addEventListener('submit',e=>{e.preventDefault();listingQueryValue=$('#bpv-listings-search input')?.value?.trim()||'';void loadListings(true,listingQueryValue)});
 $('#bpv-listings-overlay-toggle')?.addEventListener('click',()=>{
  listingOverlayOn=!listingOverlayOn;
  window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('listings',listingOverlayOn);
  setListingOverlay(listingOverlayOn);
  const b=$('#bpv-listings-overlay-toggle');
  if(b){b.textContent='LISTING MAP OVERLAY · '+(listingOverlayOn?'ON':'OFF');b.setAttribute('aria-pressed',String(listingOverlayOn))}
  if(listingOverlayOn)void loadListings(true,listingQueryValue);
 });
 $('#bpv-whole-earth').addEventListener('click',wholeEarth);
 $('#bpv-account-open-portal')?.addEventListener('click',()=>void openAccountBillingPortal());
 $('#bpv-account-refresh')?.addEventListener('click',()=>void loadAccountBilling());
 return p;
}
function makeTopBarAndDock(){
 if(!mapHost)return;
 const top=node('div','bpv-topbar bpv-topbar-persistent');
 top.innerHTML='<a class="bpv-brand" href="/" aria-label="BridgePoint World"><img src="/bridgepoint-mark.svg" alt=""><span><b>BRIDGEPOINT WORLD</b><small>GLOBAL SPATIAL INTELLIGENCE</small></span></a><div class="bpv-topbar-right"><div id="bpv-language-slot" data-bp-language-mount="top" aria-label="BridgePoint language"></div><div id="bpv-account-slot"></div></div>';
 const dock=node('div','bpv-dock bpv-dock-persistent');dock.id='bpv-dock';dock.hidden=true;
 dock.innerHTML='<div class="bpv-dock-label"><div><b>BRIDGEPOINT WORLD</b><span><i></i> LIVE · GLOBAL WORLD</span></div><div class="bpv-dock-window-actions"><button type="button" data-bpv-dock-expand aria-label="Maximize BridgePoint map card" aria-pressed="false">MAXIMIZE ↗</button><button type="button" data-bpv-dock-hide aria-label="Minimize BridgePoint map card">MINIMIZE −</button></div></div>'+
 '<div id="bpv-dock-account-row" class="bpv-dock-account-row" aria-label="Account, language and refresh controls"></div>'+
 '<div id="bpv-map-controls-slot" class="bpv-map-controls-slot" aria-label="Map zoom and orientation controls"></div>'+
 '<div id="bpv-search-slot" class="bpv-search-slot"></div>'+
 '<div id="bpv-premium-tools-slot" class="bpv-premium-tools-slot" aria-label="Free premium tools"></div>'+

 '<div id="bpv-dock-actions" class="bpv-dock-actions bpv-command-groups">'+
  '<section class="bpv-command-group" data-bpv-command-section="environment" aria-label="Weather and environment tools">'+
   '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">☁</span><span><b>WEATHER & ENVIRONMENT</b><small>Storm effects, wind and signal fields</small></span></div>'+
   '<div class="bpv-command-grid" data-bpv-command-grid="environment">'+
    '<button type="button" class="bpv-command-btn bpv-weather-fx-btn" data-bpv-action="weatherfx" title="Open animated weather effects"><span class="bpv-command-icon" aria-hidden="true">☁</span><span class="bpv-command-label">Weather FX</span></button>'+
    '<button type="button" class="bpv-command-btn bpv-wind-voxels-btn" data-bpv-action="windfx" title="Explore wind flow and drone routes"><span class="bpv-command-icon" aria-hidden="true">≋</span><span class="bpv-command-label">Wind + Drone</span></button>'+
    '<button type="button" class="bpv-command-btn" data-bpv-action="volumetric" title="Open wind and RF field visualizations"><span class="bpv-command-icon" aria-hidden="true">⌁</span><span class="bpv-command-label">Wind / RF Fields</span></button>'+
   '</div><div class="bpv-command-inline-slot" id="bpv-world-activity-slot" aria-label="Weather timeline and world activity"></div>'+
  '</section>'+
  '<section class="bpv-command-group" data-bpv-command-section="property" aria-label="Property intelligence tools">'+
   '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">◈</span><span><b>PROPERTY INTELLIGENCE</b><small>Search properties, inspect records and explore opportunities</small></span></div>'+
   '<div class="bpv-command-grid" data-bpv-command-grid="property">'+
    '<button type="button" class="bpv-command-btn" data-bpv-action="ai" title="Ask BridgePoint AI"><span class="bpv-command-icon" aria-hidden="true">✧</span><span class="bpv-command-label">BridgePoint AI</span></button>'+
    '<button type="button" class="bpv-command-btn" data-bpv-action="listings" title="Browse materialized property listings"><span class="bpv-command-icon" aria-hidden="true">▤</span><span class="bpv-command-label">Listings</span></button>'+
    '<button type="button" class="bpv-command-btn" data-bpv-action="opportunities" title="Open qualified property opportunities"><span class="bpv-command-icon" aria-hidden="true">◉</span><span class="bpv-command-label">Opportunities</span></button>'+
    '<button type="button" class="bpv-command-btn" data-bpv-action="metrics" title="View live platform counters"><span class="bpv-command-icon" aria-hidden="true">▦</span><span class="bpv-command-label">Live Counters</span></button>'+
    '<button type="button" class="bpv-command-btn" data-bpv-action="property" title="Open intelligence slots for the selected property"><span class="bpv-command-icon" aria-hidden="true">⌂</span><span class="bpv-command-label">Property Slots</span></button>'+
    (home?'<button type="button" class="bpv-command-btn" data-bpv-action="explore" title="Explore platform details"><span class="bpv-command-icon" aria-hidden="true">◇</span><span class="bpv-command-label">Explore</span></button>':'')+
   '</div>'+
  '</section>'+
  '<section class="bpv-command-group" data-bpv-command-section="map" aria-label="Map and layer controls">'+
   '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">⌖</span><span><b>MAP & LAYERS</b><small>Boundaries, terrain, history and world navigation</small></span></div>'+
   '<div class="bpv-command-grid" data-bpv-command-grid="map">'+
    '<button type="button" class="bpv-command-btn" data-bpv-action="parcels" title="Toggle public parcel lines on the globe"><span class="bpv-command-icon" aria-hidden="true">⌗</span><span class="bpv-command-label">Parcel Lines</span></button>'+
    '<button type="button" class="bpv-command-btn" data-bpv-action="boundaryviewer" title="Open the Public Parcel Boundary Map Viewer"><span class="bpv-command-icon" aria-hidden="true">▧</span><span class="bpv-command-label">Public Parcel Viewer</span></button>'+
    '<button type="button" class="bpv-command-btn" data-bpv-action="worldchanges" title="Explore available 30-day world changes"><span class="bpv-command-icon" aria-hidden="true">↻</span><span class="bpv-command-label">30-Day History</span></button>'+
    '<button type="button" class="bpv-command-btn" data-bpv-action="controls" title="Open map layers and additional tools"><span class="bpv-command-icon" aria-hidden="true">☷</span><span class="bpv-command-label">Layers + Tools</span></button>'+
    '<button type="button" class="bpv-command-btn" data-bpv-action="motion" title="Open orbit and motion controls"><span class="bpv-command-icon" aria-hidden="true">⟳</span><span class="bpv-command-label">Orbit & Motion</span></button>'+
    '<button type="button" class="bpv-command-btn bpv-whole-earth-short" data-bpv-action="whole" title="Return to the whole Earth view"><span class="bpv-command-icon" aria-hidden="true">◎</span><span class="bpv-command-label">Whole Earth</span></button>'+
   '</div>'+
   '<div class="bpv-command-inline-slot" id="bpv-underground-slot" aria-label="Underground and infrastructure controls"></div>'+
   '<div class="bpv-command-inline-slot" id="bpv-satellite-slot" aria-label="Satellite imagery and color controls"></div>'+
  '</section>'+
  '<section class="bpv-command-group bpv-account-command-group" data-bpv-command-section="account" aria-label="Account and billing controls">'+
   '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">¤</span><span><b>ACCOUNT & BILLING</b><small>View your plan, renewal schedule, payments or cancel</small></span></div>'+
   '<div class="bpv-command-grid" data-bpv-command-grid="account"><button type="button" class="bpv-command-btn bpv-account-billing-btn" data-bpv-action="account" title="View packages, account and subscription billing"><span class="bpv-command-icon" aria-hidden="true">▣</span><span class="bpv-command-label">Account & Billing</span></button></div>'+
  '</section>'+
 '</div>'+
 '<div id="bpv-property-card-slot" class="bpv-property-card-slot" aria-label="Selected property card"></div>'+
 '<details id="bpv-more-info" class="bpv-more-info"><summary><span class="bpv-more-icon" aria-hidden="true">ⓘ</span><span class="bpv-more-copy"><b>MORE INFO</b><small>System status, data notes, source coverage and fine print</small></span><span class="bpv-more-chevron" aria-hidden="true">⌄</span></summary>'+
  '<div class="bpv-more-info-content"><p class="bpv-more-info-intro">BridgePoint keeps the map clear while you explore. Open this section when you need system status, data-source notes, coverage limitations or additional explanation.</p>'+
   '<div id="bpv-external-tools-slot" class="bpv-external-tools-slot" aria-label="Active tool controls and visualizations"></div>'+
   '<div id="bpv-status-panel-slot" class="bpv-status-panel-slot" aria-label="System status panel"></div>'+
   '<div class="bpv-more-info-note"><b>DATA & COVERAGE NOTES</b><p>Available layers depend on source coverage, zoom level, data freshness, and permitted display rights. A missing layer does not prove that a feature or hazard is absent. Weather and hazard overlays provide context and are not a property-damage determination.</p></div>'+
  '</div></details>'; mapHost.append(top,dock);
 // Keep account/refresh actions in the persistent top bar.
 // MapLibre zoom and navigation controls remain on the map surface; the separate
 // WORLD DETAIL (GOLD/SILVER/BRONZE) control stays in #bpv-map-controls-slot.

 const languageSlot=$('#bpv-language-slot');
 const existingLanguage=document.querySelector('[data-bp-language="1"]');
 if(languageSlot&&existingLanguage&&existingLanguage.parentElement!==languageSlot)languageSlot.appendChild(existingLanguage);
 const reopen=node('button','bpv-dock-reopen','BRIDGEPOINT WORLD · OPEN CARD');
 reopen.id='bpv-dock-reopen';reopen.type='button';reopen.hidden=false;
 reopen.addEventListener('click',()=>{dock.hidden=false;reopen.hidden=true;mapHost.classList.remove('bpv-dock-minimized');dock.scrollTop=0});
 mapHost.appendChild(reopen);
 dock.querySelector('[data-bpv-dock-expand]').addEventListener('click',()=>setDockMaximized(!dock.classList.contains('bpv-dock-maximized')));
 dock.querySelector('[data-bpv-dock-hide]').addEventListener('click',()=>{setDockMaximized(false);dock.hidden=true;reopen.hidden=false;mapHost.classList.add('bpv-dock-minimized')});
 const keyRail=node('button','bpv-mapkey-rail','MAP KEY');
 keyRail.id='bpv-mapkey-rail';keyRail.type='button';
 keyRail.title='Open or close the weather and map-symbol legend';
 keyRail.setAttribute('aria-label','Open map and weather legend');
 keyRail.setAttribute('aria-controls','bpv-sidecar');
 keyRail.setAttribute('aria-expanded','false');
 keyRail.addEventListener('click',()=>{
  const panel=$('#bpv-sidecar');
  if(panel&&!panel.hidden&&panel.dataset.panel==='mapkey'){closePanel();return}
  openPanel('mapkey');
  const showLegend=()=>{try{return window.__BP_OPEN_MAP_KEY_V5920__?.()===true}catch(_){return false}};
  if(!showLegend()){let tries=0;const retry=()=>{if(showLegend())return;if(++tries<30)setTimeout(retry,150)};setTimeout(retry,80)}
 });
 document.body.appendChild(keyRail);
 const removeLegacyMapKeys=()=>{
  document.querySelectorAll('.bpv-key-ribbon,#bpv-key-ribbon,[data-bpv-key-open]').forEach(el=>{if(el.id!=='bpv-mapkey-rail')el.remove()});
  document.querySelectorAll('button').forEach(btn=>{if(btn.id==='bpv-mapkey-rail')return;const label=String(btn.textContent||'').replace(/\s+/g,' ').trim().toUpperCase();if(label==='MAP KEY'||label==='FULL KEY ↗'||btn.matches('[data-bpv-panel="mapkey"],[data-bpv-action="mapkey"]'))btn.remove()});
 };
 removeLegacyMapKeys();
 const legacyKeyObserver=new MutationObserver(removeLegacyMapKeys);
 [mapHost,document.getElementById('bpv-sidecar'),document.querySelector('.map-tools')].filter(Boolean).forEach(target=>legacyKeyObserver.observe(target,{childList:true,subtree:true}));
 const auxiliarySlot=$('#bpv-external-tools-slot');
 const auxiliarySelectors=['#bp5507-tools','#bp5507-hud','#bp5507-key-panel','#bp-realworld-effects-v5927','#bpRoadDrive','.bp-rd-drive-controls','#bp-world-realism-v5910','.bp-reality-toggle-v5968','.bp-live-rail-toggle-v5969','#bp-reality-assets-v5968','[id^="bp-reality-assets-v5968-"]','.bp-live-rail-panel-v5969'];
 const placeAuxiliaryControls=()=>{
  if(!auxiliarySlot)return;
  for(const selector of auxiliarySelectors)document.querySelectorAll(selector).forEach(el=>{
   const dockableControlSelector='#bp-world-realism-v5910,.bp-reality-toggle-v5968,.bp-live-rail-toggle-v5969,#bp-reality-assets-v5968,[id^="bp-reality-assets-v5968-"],.bp-live-rail-panel-v5969';
   const dockableControl=!!el?.matches?.(dockableControlSelector);
   if(!el||(el.closest('#bpv-sidecar')&&!dockableControl)||el.closest('.maplibregl-popup')||auxiliarySlot.contains(el))return;
   auxiliarySlot.appendChild(el);el.classList.add('bpv-contained-control');
  });
  const activePanels=auxiliarySlot.querySelectorAll('#bp5507-tool-panel:not([hidden]),#bp5507-hud:not([hidden]),#bp5507-key-panel:not([hidden]),#bp-realworld-effects-v5927:not([hidden]),#bpRoadDrive:not([hidden]),.bp-rd-drive-controls:not([hidden]),#bp-world-realism-v5910 .bpr-panel:not([hidden]),#bp-reality-assets-v5968:not([hidden]),[id^="bp-reality-assets-v5968-"]:not([hidden]),.bp-live-rail-panel-v5969:not([hidden])');
  if(Array.from(activePanels).some(el=>getComputedStyle(el).display!=='none')){const info=$('#bpv-more-info');if(info)info.open=true;setDockMaximized(true);}
 };
 placeAuxiliaryControls();
 const auxiliaryObserver=new MutationObserver(placeAuxiliaryControls);
 auxiliaryObserver.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden']});
 dock.querySelectorAll('[data-bpv-action]').forEach(b=>{b.dataset.bpvBound='1';b.addEventListener('click',()=>{
  const a=b.dataset.bpvAction;
  if(a==='whole'){wholeEarth();return}
  if(a==='search'){toggleSearch();return}
  if(a==='premium'){document.querySelector('#landingFreePremiumTools,#appFreePremiumTools')?.click();return}
  if(a==='boundaryviewer'){
   const api=window.__BP_PARCEL_BOUNDARY_VIEWER_V5403__||window.__BP_PARCEL_BOUNDARY_VIEWER_V5404__||window.__BP_PARCEL_BOUNDARY_VIEWER_V5405__;
   if(api&&typeof api.open==='function')void Promise.resolve(api.open('public')).catch(e=>{console.warn('BridgePoint public parcel viewer unavailable',e);showActionNotice('Public Parcel Viewer failed to open: '+String(e?.message||e))});
   else showActionNotice('Public Parcel Viewer is still initializing. Wait for the map layers to load, then press the button again.');
   return;
  }
  if(a==='parcels'){toggleParcelBoundaries();return}
  if(a==='opportunities'){
   openPanel('opportunities');
   const fn=home?window.__BP_LANDING_TOGGLE_OPPORTUNITIES__:window.__BP_TOGGLE_OPPORTUNITIES__;
   if(typeof fn!=='function'){showActionNotice('Opportunity overlay control is still initializing. Press the button again after the globe finishes loading.');return}
   b.disabled=true;
   void Promise.resolve().then(()=>fn()).then(on=>{
    b.classList.toggle('active',!!on);b.setAttribute('aria-pressed',String(!!on));
    showActionNotice(on?'Opportunity markers are on. Press Opportunities again to turn them off.':'Opportunity markers are off.');
   }).catch(e=>{console.warn('BridgePoint opportunity overlay',e);showActionNotice('Opportunity overlay failed: '+String(e?.message||e))}).finally(()=>{b.disabled=false});
   return;
  }
  if(a==='listings'){openPanel('listings');return}
  if(a==='worldchanges'){setDockMaximized(true);void openWorldChanges().catch(e=>{console.warn('BridgePoint world history unavailable',e);showActionNotice('30-Day History could not open: '+String(e?.message||e))});return}
  if(a==='weatherfx'){
   setDockMaximized(true);
   const activate=async()=>{
    let on=false;
    if(home){
     const toggler=window.__BP_LANDING_TOGGLE_WEATHER__;
     if(typeof toggler==='function')on=await toggler();
     else if(typeof window.__BP_LANDING_ENABLE_WEATHER__==='function'){await window.__BP_LANDING_ENABLE_WEATHER__();on=true}
    }else{
     const toggler=window.__BP_TOGGLE_LIVE_WEATHER__;
     if(typeof toggler==='function')on=await toggler();
     else if(typeof window.__BP_ENABLE_LIVE_WEATHER__==='function'){await window.__BP_ENABLE_LIVE_WEATHER__();on=true}
    }
    if(on)await openRealWorldEffects(false);
    return on;
   };
   void activate().then(on=>{b.classList.toggle('active',!!on);b.setAttribute('aria-pressed',String(!!on));showActionNotice(on?'Weather data and effects are enabled. Press Weather FX again to turn weather data off.':'Weather data is off.')})
    .catch(e=>{console.warn('BridgePoint Weather FX unavailable',e);showActionNotice('Weather FX could not open: '+String(e?.message||e))});return;
  }
  if(a==='windfx'){
   setDockMaximized(true);
   void toggleWindAndDroneField().then(on=>{
    b.classList.toggle('active',!!on);b.setAttribute('aria-pressed',String(!!on));
    showActionNotice(on?'Wind flow is on. Drone controls remain in the Wind + Drone panel.':'Wind flow is off.');
   }).catch(e=>{console.warn('BridgePoint 3D wind unavailable',e);showActionNotice('Wind + Drone fields could not open: '+String(e?.message||e))});return;
  }
  if(a==='volumetric'){setDockMaximized(true);void openVolumetricFields().catch(e=>{console.warn('BridgePoint volumetric fields unavailable',e);showActionNotice('Wind / RF Fields could not open: '+String(e?.message||e))});return}
  if(a==='motion'){openPanel('controls');try{const motion=window.__BP_GLOBAL_MOTION_V5926__;if(typeof motion?.open==='function')motion.open();else showActionNotice('Orbit & Motion controls are not ready. Reload the world after the map has finished loading.')}catch(e){showActionNotice('Orbit & Motion failed: '+String(e?.message||e))}return}
  if(a==='satellite'){
   const current=window.__BP_SPECTRAL_IMAGERY_V5931__;
   if(current?.open){try{current.open();}catch(e){showActionNotice('Satellite imagery controls failed: '+String(e?.message||e))}return}
   const surfaceWorld=home?window.__BP_LANDING_WORLD__:window.__BP_V5000_WORLD__;
   void import('./world-v2300-spectral-imagery.js?v=5934-world-controls')
    .then(m=>{const api=window.__BP_SPECTRAL_IMAGERY_V5931__||m.initSpectralImagery(surfaceWorld);if(typeof api?.open!=='function')throw new Error('Satellite imagery controls are not ready');api.open()})
    .catch(e=>{console.warn('BridgePoint satellite filters unavailable',e);showActionNotice('Satellite imagery controls could not open: '+String(e?.message||e))});
   return;
  }
  openPanel(a)
  });
 });
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
  btn.innerHTML='<span class="bpv-slot-icon">'+({ai:'AI',xray:'X·RAY',underground:'SUB',street:'ST',aerial:'AIR',livecam:'LIVE',eye:'EYE',heartbeat:'♥',timeline:'T+',roof:'ROOF',provenance:'SRC',zoning:'LOT'}[key]||'BP')+'</span><span>'+info[0]+'</span><span class="bpv-slot-arrow">↗</span>';
  const status=node('small','bpv-slot-status');
  status.dataset.bpvSlotStatus=key;
  status.textContent=key==='ai'?'Ready':key==='xray'?'Checks source-backed parts and plans':key==='underground'?'Not yet verified for this property':key==='street'?'Coverage varies by property':key==='aerial'?'Source-backed imagery only':key==='livecam'?'Checking authorized live-camera coverage':key==='eye'?'BridgePoint World view ready; property coverage varies':key==='heartbeat'?'Waiting for property evidence':key==='timeline'?'Waiting for linked history':'Source availability checked by property';
  const p=node('p','bpv-slot-note');p.textContent=info[1];
  card.append(btn,status,p);container.appendChild(card);
  btn.addEventListener('click',()=>activateSlot(key,kind));
 }
}
function selectProperty(id,label,feature,coordinates=null){
 const nextId=id||null,props=feature?.properties||{};
 const raw=coordinates||{lng:props.longitude??props.lon??props.center_lon??props.lng,lat:props.latitude??props.center_lat};
 let lng=Number(raw?.lng??raw?.longitude??raw?.[0]),lat=Number(raw?.lat??raw?.latitude??raw?.[1]);
 const point=Number.isFinite(lng)&&Number.isFinite(lat)&&lng>=-180&&lng<=180&&lat>=-90&&lat<=90?{lng,lat}:null;
 const retained=selected.id===nextId?selected.coordinates:null;
 selected={id:nextId,label:label||'Selected building',feature:feature||null,coordinates:point||retained||null};
 const snapshot={id:selected.id,label:selected.label,feature:selected.feature,coordinates:selected.coordinates,updatedAt:Date.now()};
 window.__BP_SELECTED_PROPERTY_V1__=snapshot;
 try{window.dispatchEvent(new CustomEvent('bp:property-selection-v1',{detail:snapshot}))}catch(_){}
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
 const slotStatus=(key,text)=>$$('[data-bpv-slot-status="'+key+'"]').forEach(el=>{if(el.textContent!==text)el.textContent=text});
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
  slotStatus('zoning','Measured coverage is source-dependent; official maximum awaits a verified municipal rule');
 $$('[data-bpv-slot]').forEach(el=>{el.dataset.buildingId=String(id);el.dataset.buildingLabel=label});
}
function activateSlot(key,kind){
 refreshSlotLabels();
 if(key==='zoning'){
  openPanel('property');
  const run=()=>window.__BP_ZONING_COVERAGE_V1__?.open?.(window.__BP_SELECTED_PROPERTY_V1__||selected);
  if(window.__BP_ZONING_COVERAGE_V1__)run();else{let tries=0;const retry=()=>{if(window.__BP_ZONING_COVERAGE_V1__){run();return}if(++tries<20)setTimeout(retry,100);else showSlotMessage('zoning','Zoning calculation module is still loading. Close and reopen the slot to retry.');};setTimeout(retry,50)}
  return;
 }
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
function billingDate(value){if(!value)return 'not reported';const d=new Date(value);if(Number.isNaN(d.getTime()))return 'not reported';return new Intl.DateTimeFormat(undefined,{year:'numeric',month:'short',day:'numeric'}).format(d)}
function billingMoney(value){if(value===null||value===undefined||value==='')return 'Price on request';const n=Number(value);return Number.isFinite(n)?'$'+n.toLocaleString(undefined,{maximumFractionDigits:2}):String(value)}
function billingBool(value){return value===true||String(value??'').toLowerCase()==='true'}
function billingMessage(message,error=false){const el=$('#bpv-account-feedback');if(!el)return;el.textContent=String(message||'');el.classList.toggle('is-error',!!error);el.hidden=!message}
function billingLink(text,href,kind='bpv-account-secondary'){const a=node('a',kind,text);a.href=href;return a}
function renderAccountSignedOut(){
 const summary=$('#bpv-account-summary'),packages=$('#bpv-account-packages'),email=$('#bpv-account-email'),state=$('#bpv-account-state');
 if(email)email.textContent='Sign in to view your account';if(state)state.textContent='Subscription and payment records are private to the signed-in account.';
 if(summary){summary.replaceChildren();const card=node('article','bpv-account-empty');card.append(node('b','','Your account is not signed in'),node('p','','Sign in to check your subscription, trial end date, next renewal period and payment-management options.'));const actions=node('div','bpv-account-actions');actions.append(billingLink('SIGN IN','/?auth=signin'),billingLink('CREATE ACCOUNT','/?auth=signup'));card.append(actions);summary.append(card)}
 if(packages){packages.replaceChildren();const note=node('p','bpv-data-note','The live package catalog loads after sign-in. Browse the public pricing overview now.');packages.append(note,billingLink('VIEW PRICING','/pricing.html'))}
}
async function accountBillingFetchUser(token){const r=await fetch(SUPA+'/auth/v1/user',{method:'GET',headers:{apikey:KEY,Authorization:'Bearer '+token,Accept:'application/json'},cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d?.message||'Could not verify the signed-in account.');return d}
function renderAccountSubscriptions(user,payload){
 const summary=$('#bpv-account-summary'),email=$('#bpv-account-email'),state=$('#bpv-account-state');if(!summary)return;
 if(email)email.textContent=user?.email||'Verified BridgePoint account';if(state)state.textContent='Subscription records are shown for this signed-in account and eligible shared workspaces.';
 summary.replaceChildren();const rows=Array.isArray(payload?.purchases)?payload.purchases:[];
 const head=node('div','bpv-billing-section-title');head.append(node('b','','CURRENT SUBSCRIPTIONS & PURCHASES'),node('small','','Status and access are refreshed from BridgePoint billing records.'));summary.append(head);
 if(!rows.length){const empty=node('article','bpv-account-empty');empty.append(node('b','','No subscription is recorded yet'),node('p','','No paid package purchase was returned for this account. You can still explore available packages below.'));summary.append(empty);return}
 rows.forEach(row=>{
  const card=node('article','bpv-billing-subscription');const title=node('div','bpv-billing-subscription-title');const name=node('b','',row.package_name||row.package_key||'BridgePoint package');
  const status=node('span','bpv-billing-status',String(row.status||'status unavailable').replace(/_/g,' '));status.classList.toggle('is-active',billingBool(row.has_access));title.append(name,status);card.append(title);
  const meta=node('p','bpv-billing-subscription-meta',String(row.purchase_mode||'IMMEDIATE').replace(/_/g,' ')+' · '+(billingBool(row.has_access)?'access on':'access pending / off'));card.append(meta);
  const trialDate=billingDate(row.trial_ends_at),periodDate=billingDate(row.current_period_end),cancels=billingBool(row.cancel_at_period_end),statusText=String(row.status||'').toLowerCase();
  let schedule='Billing schedule: open the secure Stripe portal for invoice amount and payment status.';
  if(cancels)schedule='Cancellation scheduled'+(periodDate!=='not reported'?' · access expected through '+periodDate:' · period end not reported')+'. No further renewal is expected after cancellation takes effect.';
  else if((statusText.includes('trial')||row.trial_ends_at)&&trialDate!=='not reported')schedule='Trial ends: '+trialDate+'. The live checkout terms determine the first charge and billing interval.';
  else if(periodDate!=='not reported')schedule='Current period ends / next renewal date: '+periodDate+'. Confirm exact charge and invoice in Stripe.';
  card.append(node('p','bpv-billing-schedule',schedule));
  if(row.delivery_disclosure)card.append(node('p','bpv-billing-disclosure',String(row.delivery_disclosure)));
  summary.append(card);
 });
 const note=node('p','bpv-data-note','The secure Stripe portal shows exact invoice amounts, payment methods and receipts, and is where customers change or cancel a subscription.');summary.append(note)
}
function renderAccountPackageCatalog(payload){
 const root=$('#bpv-account-packages');if(!root)return;root.replaceChildren();
 const rows=Array.isArray(payload?.packages)?payload.packages:[];const live=rows.filter(p=>p&&p.package_key&&p.active!==false);
 if(!live.length){root.append(node('p','bpv-data-note','The live package catalog is temporarily unavailable. Refresh to try again.'),billingLink('VIEW PUBLIC PRICING','/pricing.html'));return}
 live.forEach(p=>{
  const config=p.configuration&&typeof p.configuration==='object'?p.configuration:{};const mode=String(config.purchase_mode||'IMMEDIATE').toUpperCase();const delivery=String(config.delivery_status||p.delivery_status||'').toUpperCase();
  const requestOnly=billingBool(config.owner_approval_required)||mode.includes('APPROVAL')||mode.includes('MANAGED');
  const selfCheckout=billingBool(config.available_for_self_checkout)||(billingBool(config.checkout_ready)&&mode==='IMMEDIATE');
  const canBuy=selfCheckout&&!requestOnly&&delivery!=='BUILDING'&&delivery!=='ROADMAP';
  const card=node('article','bpv-account-package');const head=node('div','bpv-account-package-head');head.append(node('b','',p.package_name||p.package_key));
  if(p.featured===true)head.append(node('span','bpv-account-featured','FEATURED'));card.append(head);
  if(p.description)card.append(node('p','bpv-account-package-description',String(p.description)));
  const price=node('div','bpv-account-package-prices');const month=p.monthly_price??p.price_monthly,year=p.yearly_price??p.annual_price??p.price_annual;
  price.append(node('span','',billingMoney(month)+' / month'),node('span','',billingMoney(year)+' / year'));card.append(price);
  const details=String(config.pricing_note||config.delivery_summary||config.delivery_note||config.customer_delivery_disclosure||'').trim();if(details)card.append(node('p','bpv-account-package-note',details));
  const actions=node('div','bpv-account-package-actions');
  if(canBuy){
   if(month!==null&&month!==undefined&&month!==''){const b=node('button','bpv-account-package-cta','CHOOSE MONTHLY');b.addEventListener('click',()=>void beginAccountCheckout(p,'month',b));actions.append(b)}
   if(year!==null&&year!==undefined&&year!==''){const b=node('button','bpv-account-package-cta bpv-account-package-cta-secondary','CHOOSE ANNUAL');b.addEventListener('click',()=>void beginAccountCheckout(p,'year',b));actions.append(b)}
  }else if(requestOnly){const b=node('button','bpv-account-package-cta','REQUEST ACCESS');b.addEventListener('click',()=>void requestAccountPackage(p,b));actions.append(b)}
  else {const b=billingLink(delivery==='BUILDING'?'IN DEVELOPMENT':delivery==='ROADMAP'?'ROADMAP / INTEREST':'PACKAGE DETAILS','/pricing.html','bpv-account-package-cta bpv-account-package-cta-secondary');actions.append(b)}
  card.append(actions);root.append(card)
 });
}
async function loadAccountBilling(){
 const summary=$('#bpv-account-summary'),packages=$('#bpv-account-packages');if(!summary||!packages)return;if(window.__BP_ACCOUNT_BILLING_LOADING__)return;
 const token=sessionToken();if(!token){renderAccountSignedOut();return}
 window.__BP_ACCOUNT_BILLING_LOADING__=true;billingMessage('Loading secure account, subscription and package records…');summary.replaceChildren(node('p','bpv-data-note','Loading subscriptions and billing schedule…'));packages.replaceChildren(node('p','bpv-data-note','Loading the live package catalog…'));
 try{
  const results=await Promise.allSettled([accountBillingFetchUser(token),rpc('bridgepoint_my_purchases_v223',{},12000,token),rpc('bridgepoint_flutter_packages',{},16000,token)]);
  const user=results[0].status==='fulfilled'?results[0].value:null;const purchases=results[1].status==='fulfilled'?results[1].value:null;const catalog=results[2].status==='fulfilled'?results[2].value:null;
  if(results[0].status==='rejected'){renderAccountSignedOut();billingMessage('Your sign-in session could not be verified. Sign in again to manage account billing.',true);return}
  renderAccountSubscriptions(user,purchases);renderAccountPackageCatalog(catalog);
  if(results[1].status==='rejected')billingMessage('Subscription records could not be loaded: '+String(results[1].reason?.message||results[1].reason),true);
  else if(results[2].status==='rejected')billingMessage('Your subscriptions loaded, but the live package catalog did not. Refresh to retry package options.',true);
  else billingMessage('Account billing refreshed. Use the secure Stripe portal for invoices, payment methods, plan changes and cancellation.');
 }catch(e){billingMessage('Could not load account billing: '+String(e?.message||e),true)}
 finally{window.__BP_ACCOUNT_BILLING_LOADING__=false}
}
async function openAccountBillingPortal(){
 const token=sessionToken();if(!token){location.assign('/?auth=signin');return}const button=$('#bpv-account-open-portal');if(button){button.disabled=true;button.textContent='OPENING SECURE STRIPE PORTAL…'}billingMessage('Opening your secure Stripe billing portal…');
 try{const r=await fetch(SUPA+'/functions/v1/bridgepoint-billing-portal-v66',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},body:'{}',cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok||d.complete!==true||!d.url){const raw=String(d.error||'Billing portal unavailable');if(/no stripe customer|no active billing profile/i.test(raw)){billingMessage('No Stripe billing profile is linked to this account yet. Choose an available package below to start a subscription.',true);return}throw new Error(raw)}const target=new URL(d.url);if(target.protocol!=='https:')throw new Error('The billing portal returned an unexpected secure URL.');location.assign(target.href)}catch(e){billingMessage('Could not open Stripe billing management: '+String(e?.message||e),true)}finally{if(button){button.disabled=false;button.textContent='MANAGE PAYMENTS / CHANGE OR CANCEL'}}
}
async function beginAccountCheckout(pkg,interval,button){
 const token=sessionToken();if(!token){location.assign('/?auth=signin');return}if(!pkg?.package_key||!['month','year'].includes(interval))return;
 const original=button.textContent;button.disabled=true;button.textContent='OPENING SECURE CHECKOUT…';billingMessage('Preparing Stripe checkout for '+String(pkg.package_name||pkg.package_key)+'…');
 try{const r=await fetch(SUPA+'/functions/v1/bridgepoint-checkout-v67',{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify({package_key:pkg.package_key,interval}),cache:'no-store'});const d=await r.json().catch(()=>({}));if(!r.ok||d.complete!==true||!d.url)throw new Error(String(d.error||'Checkout is not ready for this package.'));const target=new URL(d.url);if(target.protocol!=='https:')throw new Error('Checkout returned an unexpected URL.');location.assign(target.href)}catch(e){billingMessage('Checkout could not be opened: '+String(e?.message||e),true);button.disabled=false;button.textContent=original}
}
async function requestAccountPackage(pkg,button){
 const token=sessionToken();if(!token){location.assign('/?auth=signin');return}const original=button.textContent;button.disabled=true;button.textContent='SENDING REQUEST…';billingMessage('Submitting package request…');
 try{const result=await rpc('bridgepoint_request_owner_approved_package_v323',{p_package_key:pkg.package_key,p_note:'Requested from the Account & Billing panel on BridgePoint.'},12000,token);billingMessage(String(result?.message||'Your package request was submitted. BridgePoint will review the activation requirements.'));button.textContent='REQUEST SENT'}catch(e){billingMessage('Could not submit package request: '+String(e?.message||e),true);button.disabled=false;button.textContent=original}
}
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
const BP_LISTINGS_SOURCE_V5927='bp-v5927-listings-source';
const BP_LISTINGS_POINTS_V5927='bp-v5927-listings-points';
const BP_LISTINGS_LABELS_V5927='bp-v5927-listings-labels';
const BP_LISTINGS_MONEY_V6130='bp-v6130-listings-money-glyph';
const BP_EMPTY_FEATURES_V5927={type:'FeatureCollection',features:[]};
function ensureListingLayers(m=map){
 if(!m)return false;try{if(m.isStyleLoaded?.()!==true)return false;
  if(!m.getSource(BP_LISTINGS_SOURCE_V5927))m.addSource(BP_LISTINGS_SOURCE_V5927,{type:'geojson',data:{type:'FeatureCollection',features:listingFeaturesCache}});
  if(!m.getLayer(BP_LISTINGS_POINTS_V5927))m.addLayer({id:BP_LISTINGS_POINTS_V5927,type:'circle',source:BP_LISTINGS_SOURCE_V5927,minzoom:0,paint:{
   'circle-radius':['interpolate',['linear'],['zoom'],0,7,1.5,7.5,3,8,7,9,11,10,15,11],
   'circle-color':'#063d30','circle-opacity':.98,'circle-stroke-color':'#8cff66','circle-stroke-width':['interpolate',['linear'],['zoom'],0,1,5,1.4,12,1.8]
  }});
  if(!m.getLayer(BP_LISTINGS_MONEY_V6130))m.addLayer({id:BP_LISTINGS_MONEY_V6130,type:'symbol',source:BP_LISTINGS_SOURCE_V5927,minzoom:0,layout:{'text-field':'\u0024','text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],0,8.5,3,9.5,7,11,12,13],'text-anchor':'center','text-allow-overlap':true,'text-ignore-placement':true,'text-padding':0},paint:{'text-color':'#baff78','text-halo-color':'#02120b','text-halo-width':1.55,'text-opacity':.99}});
  if(!m.getLayer(BP_LISTINGS_LABELS_V5927))m.addLayer({id:BP_LISTINGS_LABELS_V5927,type:'symbol',source:BP_LISTINGS_SOURCE_V5927,minzoom:13,layout:{
   'text-field':['coalesce',['get','address'],['get','title'],'Listing'],
   'text-font':['Noto Sans Regular'],'text-size':['interpolate',['linear'],['zoom'],13,9,17,12],
   'text-offset':[0,1.15],'text-max-width':16,'text-allow-overlap':false,'text-ignore-placement':false
  },paint:{'text-color':'#eafaff','text-halo-color':'rgba(3,12,20,.92)','text-halo-width':1.4}});
  m.setLayoutProperty(BP_LISTINGS_POINTS_V5927,'visibility',listingOverlayOn?'visible':'none');
  m.setLayoutProperty(BP_LISTINGS_MONEY_V6130,'visibility',listingOverlayOn?'visible':'none');
  m.setLayoutProperty(BP_LISTINGS_LABELS_V5927,'visibility',listingOverlayOn?'visible':'none');
  if(!m.__bpListingsClickBoundV5927){
   m.__bpListingsClickBoundV5927=true;
   m.on('click',BP_LISTINGS_POINTS_V5927,e=>{const f=e.features?.[0];if(!f)return;listingSelectedId=String(f.properties?.listing_id||f.id||'');openPanel('listings');void loadListings(false,listingQueryValue,listingSelectedId)});
   m.on('mouseenter',BP_LISTINGS_POINTS_V5927,()=>{try{m.getCanvas().style.cursor='pointer'}catch(_){}});
   m.on('mouseleave',BP_LISTINGS_POINTS_V5927,()=>{try{m.getCanvas().style.cursor=''}catch(_){}});
  }
  return true;
 }catch(e){console.warn('BridgePoint listing map layer',e);return false}
}
function setListingOverlay(on){
 listingOverlayOn=!!on;ensureListingLayers(map);
 for(const id of [BP_LISTINGS_POINTS_V5927,BP_LISTINGS_MONEY_V6130,BP_LISTINGS_LABELS_V5927])try{if(map?.getLayer(id))map.setLayoutProperty(id,'visibility',listingOverlayOn?'visible':'none')}catch(_){}
}
function listingPhotoPath(raw){
 const v=typeof raw==='string'?raw:(raw?.storage_path||raw?.path||raw?.url||raw?.public_path||'');
 if(!v||typeof v!=='string')return null;
 if(v.startsWith('/storage/v1/object/public/bridgepoint-listing-media/'))return v;
 if(v.startsWith('/assets/bridgepoint-listings/'))return v;
 return null;
}
function renderListingCards(features,selectedId=null){
 const root=$('#bpv-listings-items');if(!root)return;
 const frag=document.createDocumentFragment();let count=0;
 for(const f of (features||[]).slice(0,35)){
  const p=f.properties||{},card=node('article','bpv-listing-card');
  card.dataset.listingId=String(p.listing_id||f.id||'');
  const title=node('b','bpv-listing-title',p.title||p.address||'BridgePoint listing');
  const address=node('div','bpv-listing-address',[p.address,p.city,p.state_code,p.postal_code].filter(Boolean).join(', ')||'Address not supplied by source');
  const meta=node('div','bpv-listing-meta',[(p.listing_type||'LISTING').replaceAll('_',' '),(p.listing_status||'STATUS UNKNOWN').replaceAll('_',' '),p.price_amount!=null?new Intl.NumberFormat(undefined,{style:'currency',currency:p.price_currency||'USD',maximumFractionDigits:0}).format(Number(p.price_amount)):'Price not source-confirmed'].join(' · '));
  const date=p.source_updated_at||p.source_checked_at;
  const source=node('small','bpv-listing-source','BridgePoint source record · '+String(p.source_key||'source key unavailable').replaceAll('_',' ')+(date?' · source updated '+new Date(date).toLocaleDateString():' · source timestamp unavailable'));
  const photoList=Array.isArray(p.bridgepoint_photo_assets)?p.bridgepoint_photo_assets:[];
  let imagePath=null;for(const item of photoList){imagePath=listingPhotoPath(item);if(imagePath)break}
  if(imagePath){const img=document.createElement('img');img.className='bpv-listing-photo';img.loading='lazy';img.src=imagePath;img.alt='BridgePoint-hosted listing photo';img.onerror=()=>{img.remove();card.classList.add('bpv-no-photo')};card.appendChild(img)}
  else{const badge=node('div','bpv-listing-photo-empty','IMAGE NOT MATERIALIZED IN BRIDGEPOINT');card.appendChild(badge)}
  card.append(title,address,meta,source);
  const note=node('p','bpv-listing-accuracy',p.accuracy_notice||'Listing status and address precision follow the source record; refresh source evidence before acting.');
  card.appendChild(note);
  const act=node('button','bpv-listing-focus','FOCUS ON GLOBE');act.type='button';act.addEventListener('click',()=>{
   const center=featureCenter(f);if(center&&map)try{map.flyTo({center,zoom:Math.max(map.getZoom()||0,15),pitch:Math.max(map.getPitch()||0,45),duration:700})}catch(_){}
   listingSelectedId=card.dataset.listingId;document.querySelectorAll('.bpv-listing-card').forEach(x=>x.classList.toggle('selected',x.dataset.listingId===listingSelectedId));
  });
  card.appendChild(act);if(String(p.listing_id||f.id||'')===String(selectedId||listingSelectedId||''))card.classList.add('selected');
  frag.appendChild(card);count++;
 }
 if(!count){const empty=node('div','bpv-listing-empty','No materialized listings match this map view and search. Clear the search or move the globe to another area.');frag.appendChild(empty)}
 root.replaceChildren(frag);
}
function featureCenter(f){
 const g=f?.geometry;if(!g)return null;if(g.type==='Point')return g.coordinates.slice(0,2);
 const pts=[];const walk=x=>{if(!Array.isArray(x))return;if(x.length>=2&&typeof x[0]==='number'&&typeof x[1]==='number'){pts.push([x[0],x[1]]);return}for(const n of x)walk(n)};walk(g.coordinates);if(!pts.length)return null;
 return [pts.reduce((a,p)=>a+p[0],0)/pts.length,pts.reduce((a,p)=>a+p[1],0)/pts.length];
}
async function loadListings(force=false,queryOverride,selectedId=null){
 const summary=$('#bpv-listings-summary'),note=$('#bpv-listings-note');
 const q=String(queryOverride??listingQueryValue??'').trim();listingQueryValue=q;
 if(listingLoading)return listingLoading;
 const current=map||findMap();if(!current){if(summary)summary.textContent='Waiting for the BridgePoint globe…';return null}
 listingLoading=(async()=>{
  try{
   if(!listingSummaryCache||Date.now()-listingSummaryAt>300000){listingSummaryCache=await rpc('bridgepoint_public_listing_summary_v5927',{},6500);listingSummaryAt=Date.now()}
   const b=current.getBounds?.();
   const args={p_west:b?.getWest?.()??-180,p_south:b?.getSouth?.()??-80,p_east:b?.getEast?.()??180,p_north:b?.getNorth?.()??80,p_limit:250,p_query:q};
   const data=await rpc('bridgepoint_public_listings_viewport_v5927',args,9000);
   const features=Array.isArray(data?.features)?data.features:(data?.geojson?.features||[]);
   listingFeaturesCache=features;
   const s=listingSummaryCache||{};
   document.querySelectorAll('[data-bpv-listings-total]').forEach(n=>n.textContent=Number(s.total_records||0).toLocaleString());
   document.querySelectorAll('[data-bpv-listings-rentals]').forEach(n=>n.textContent=Number(s.rent_records||0).toLocaleString());
   if(summary){
    summary.textContent=Number(s.total_records||0).toLocaleString()+' materialized listings · '+Number(s.rent_records||0).toLocaleString()+' rental/lease records · '+Number(s.sale_records||0).toLocaleString()+' for-sale records · '+Number(s.bridgepoint_photo_assets||0).toLocaleString()+' records with BridgePoint-hosted photo assets. '+Number(data?.matching_in_view||0).toLocaleString()+' match the current view/search.';
   }
   const src=ensureListingLayers(current)?current.getSource(BP_LISTINGS_SOURCE_V5927):null;
   if(src)src.setData(data?.geojson||{type:'FeatureCollection',features});
   setListingOverlay(listingOverlayOn);
   renderListingCards(features,selectedId);
   if(note)note.textContent=(data?.truth_note||'Listings are returned from BridgePoint-materialized source records.')+' Listing cards do not open external websites.';
   if(!data?.complete)throw new Error(data?.error||'Listing viewport is incomplete');
   return data;
  }catch(e){
   if(summary)summary.textContent='Listings could not refresh: '+String(e?.message||e);
   if(note)note.textContent='Existing BridgePoint data remains visible; refresh to retry.';
   console.warn('BridgePoint listing inventory',e);return null;
  }finally{listingLoading=null;if(listingQueryValue!==q)setTimeout(()=>void loadListings(true,listingQueryValue),120)}
 })();
 return listingLoading;
}
function toggleParcelBoundaries(){
 const m=map||findMap(),ids=['gta-parcel','gta-parcel-glow','gta-parcel-halo','bp-public-auto-parcel-line-v5933','bp-public-auto-parcel-glow-v5933'].filter(id=>m?.getLayer?.(id));
 if(ids.length){
  const currentlyOn=ids.some(id=>(m.getLayoutProperty(id,'visibility')||'visible')!=='none'),next=!currentlyOn;
  ids.forEach(id=>{try{m.setLayoutProperty(id,'visibility',next?'visible':'none')}catch(_){}});
  window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('parcels',next);
  window.__BP_PARCEL_LAYER_STATE_V5927__={enabled:next,layerIds:ids,updatedAt:Date.now()};
  $$('[data-bpv-action="parcels"]').forEach(b=>{b.classList.toggle('active',next);b.setAttribute('aria-pressed',String(next))});
  return;
 }
 showActionNotice('Public parcel lines are still initializing. Wait for parcel tiles to load, then press Parcel Lines again. Use Public Parcel Viewer for the full-screen boundary atlas.');
}
async function openWorldChanges(){
 const m=map||findMap(),world=home?window.__BP_LANDING_WORLD__:window.__BP_V5000_WORLD__;
 let api=window.__BP_WORLD_TIME_SLIDER_V5908__;
 if(!api||api.map!==m){const mod=await import('./world-v2300-time-slider.js?v=5981-bottom-dock-fix');api=mod.initWorldTimeSlider(world||{map:m},rpc);if(api)window.__BP_WORLD_TIME_SLIDER_V5908__=api}
 if(api?.open)api.open();else throw new Error('The 30-day timeline component did not initialize.');
}
async function openRealWorldEffects(initialWind=false){
 const world=home?window.__BP_LANDING_WORLD__:window.__BP_V5000_WORLD__;
 if(!world?.map)throw new Error('BridgePoint globe not ready');
 const mod=await import('./bridgepoint-realworld-effects-v5927.js?v=5981-weather-interactions');
 const api=mod.initBridgePointRealWorldEffects(world,rpc);if(typeof api?.open!=='function')throw new Error('Weather FX panel did not initialize');await api.open({initialWind});
}
async function openVolumetricFields(initialWind=false){
 const world=home?window.__BP_LANDING_WORLD__:window.__BP_V5000_WORLD__;
 if(!world?.map)throw new Error('BridgePoint globe not ready');
 const mod=await import('./bridgepoint-volumetric-fields-v5978.js?v=5992-expanded-field-panel');
 const api=mod.initBridgePointVolumetricFields(world);if(typeof api?.open!=='function')throw new Error('Volumetric field panel did not initialize');api.open();
 if(initialWind){if(typeof api?.setWind!=='function')throw new Error('Wind controls did not initialize');await api.setWind(true)}
}
async function toggleWindAndDroneField(){
 const world=home?window.__BP_LANDING_WORLD__:window.__BP_V5000_WORLD__;
 if(!world?.map)throw new Error('BridgePoint globe not ready');
 const mod=await import('./bridgepoint-volumetric-fields-v5978.js?v=5992-expanded-field-panel');
 let api=window.__BP_VOLUMETRIC_FIELDS_V5992__;
 if(!api||api.map!==world.map)api=mod.initBridgePointVolumetricFields(world);
 if(typeof api?.setWind!=='function')throw new Error('Wind controls did not initialize');
 if(typeof api?.open==='function')api.open();
 const on=!Boolean(api.state?.windOn);
 await api.setWind(on);
 return on;
}
function toggleSearch(){
 const input=home?$('#landingPropertySearchInput'):$('#publicSearchInput'),form=home?$('#landingPropertySearch'):$('#publicSearchForm');
 if(!form||!input){showActionNotice('Property search is not available in this view. Reload BridgePoint and try again.');return}
 form.hidden=false;searchVisible=true;
 try{input.focus({preventScroll:true})}catch(_){}
}
function buildPropertyPanel(){
 const p=$('#bpv-side-property-slots');if(p&&!p.children.length)makeSlots(p,'panel');
}

window.addEventListener('bp:building-selected',e=>{const f=e.detail?.feature||null,p=f?.properties||{},id=p.building_id||f?.id||e.detail?.buildingId||window.__BP_XRAY_STATE__?.buildingId||null,label=p.full_address||p.address||p.display_name||p.name||(id?'Building #'+id:'Selected building'),raw=e.detail?.lngLat||e.detail?.coordinates||null,coordinates=raw?{lng:raw.lng??raw.longitude??raw[0],lat:raw.lat??raw.latitude??raw[1]}:null;selectProperty(id,label,f,coordinates)});
function buildUI(){
 if(!mapHost||$('#bpv-dock'))return;
 document.body.classList.add(home?'bpv-home':'bpv-app');
 const panel=makePanel(),ui=makeTopBarAndDock();
 ui.dock.appendChild(panel);
 const moreInfo=$('#bpv-more-info');if(moreInfo)ui.dock.appendChild(moreInfo);
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
  const previewHead=$('.preview-head');if(previewHead)previewHead.hidden=true;
  if(form){let cap=ui.searchSlot.querySelector('.bpv-search-caption');if(!cap){cap=node('div','bpv-search-caption');cap.textContent='BRIDGEPOINT PROPERTY LOOKUP';cap.style.cssText='font:900 9px/1.3 system-ui,sans-serif;letter-spacing:.12em;color:#80b2c6;margin:0 0 6px;padding:0 1px';ui.searchSlot.appendChild(cap)}ui.searchSlot.appendChild(form);form.hidden=false;searchVisible=true;}
  const premiumSlot=$('#bpv-premium-tools-slot');if(premium&&premiumSlot&&premium.parentElement!==premiumSlot)premiumSlot.appendChild(premium);
  if(premium){premium.classList.add('bpv-premium-button');premium.textContent='FREE PREMIUM TOOLS';}
  const copyPane=$('#bpv-home-copy-mount');if(copyPane)copyPane.querySelector('.copy')?.classList.add('bpv-moved-home-copy');
  const previewCard=$('#previewCard');if(previewCard){previewCard.classList.add('bpv-map-chrome');const propertySlot=$('#bpv-property-card-slot');if(propertySlot&&previewCard.parentElement!==propertySlot)propertySlot.appendChild(previewCard);installHomeSlots();const ob=new MutationObserver(()=>{if(!previewCard.hidden){const t=$('#previewTitle')?.textContent||'Selected building';const id=(t.match(/#(\d+)/)||[])[1];selectProperty(id||null,t,selected.feature)}});ob.observe(previewCard,{attributes:true,attributeFilter:['hidden']})}
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
   else{p.hidden=false;p.style.display='block';const info=$('#bpv-more-info');if(info)info.open=true}
  };
  const form=$('#publicSearchForm'),tools=$('.map-tools'),premium=$('#appFreePremiumTools');
  if(form){let cap=ui.searchSlot.querySelector('.bpv-search-caption');if(!cap){cap=node('div','bpv-search-caption');cap.textContent='BRIDGEPOINT PROPERTY LOOKUP';cap.style.cssText='font:900 9px/1.3 system-ui,sans-serif;letter-spacing:.12em;color:#80b2c6;margin:0 0 6px;padding:0 1px';ui.searchSlot.appendChild(cap)}ui.searchSlot.appendChild(form);form.hidden=false;searchVisible=true;}
  if(premium){const premiumSlot=$('#bpv-premium-tools-slot');if(premium&&premiumSlot&&premium.parentElement!==premiumSlot)premiumSlot.appendChild(premium);premium.classList.add('bpv-premium-button');premium.textContent='FREE PREMIUM TOOLS'}
  const controls=$('#bpv-controls-mount');
  if(tools&&controls)controls.appendChild(tools);
  const status=$('#mapStatus');if(status&&controls)controls.appendChild(status);
  const brand=$('.map-brand-card');if(brand)brand.hidden=true;
  ['#measureReadout','#mapResults'].forEach(sel=>{const el=$(sel);if(el)el.classList.add('bpv-map-chrome')});
  if(root&&panel.parentElement!==ui.dock&&panel.parentElement!==root)ui.dock.appendChild(panel);
  installAppSlots();
  const statusPanel=$('#systemPanel'),statusSlot=$('#bpv-status-panel-slot');if(statusPanel&&statusSlot&&statusPanel.parentElement!==statusSlot)statusSlot.appendChild(statusPanel);
  const bp=$('#buildingPanel');
  const propertySlot=$('#bpv-property-card-slot');if(bp&&propertySlot&&bp.parentElement!==propertySlot)propertySlot.appendChild(bp);
  if(bp){const ob=new MutationObserver(()=>{if(!bp.hidden){installAppSlots();selectProperty(window.__BP_XRAY_STATE__?.buildingId||null,$('#buildingTitle')?.textContent||'Selected building',window.__BP_SELECTED_BUILDING_FEATURE__||null)}});ob.observe(bp,{attributes:true,attributeFilter:['hidden'],childList:true,subtree:true,characterData:true})}
 }
 const mapToolsPanel=$('#bpv-controls-mount');
 if(mapToolsPanel){
  const whole=$('#bpv-whole-earth');whole.addEventListener('click',wholeEarth);
 }
 const searchButton=node('button','bpv-command-btn','<span class="bpv-command-icon" aria-hidden="true">⌕</span><span class="bpv-command-label">Search</span>');
 searchButton.type='button';searchButton.title='Search addresses and properties';searchButton.setAttribute('aria-label','Search addresses and properties');searchButton.dataset.bpvAction='search';searchButton.dataset.bpvBound='1';searchButton.addEventListener('click',toggleSearch);
 const premium=document.querySelector('#landingFreePremiumTools,#appFreePremiumTools');
 const premiumSlot=$('#bpv-premium-tools-slot');
 if(premium&&premiumSlot&&premium.parentElement!==premiumSlot)premiumSlot.appendChild(premium);
 if(premium){premium.classList.add('bpv-premium-button');premium.textContent='FREE PREMIUM TOOLS';}
 if(!premium&&premiumSlot){const b=node('button','bpv-premium-button','FREE PREMIUM TOOLS');b.type='button';b.addEventListener('click',()=>document.querySelector('#bp5507-tools>button')?.click());premiumSlot.appendChild(b)}
 // Put search and account actions at rest; hide them together while the globe is moving.
 const propertyGrid=ui.dock.querySelector('[data-bpv-command-grid="property"]');if(propertyGrid)propertyGrid.prepend(searchButton);
 const panelOpenButtons=ui.actions.querySelectorAll('[data-bpv-action]');
 panelOpenButtons.forEach(b=>{if(b.dataset.bpvBound)return;b.dataset.bpvBound='1';b.addEventListener('click',()=>{const a=b.dataset.bpvAction;if(a==='search'){toggleSearch();return}if(a==='whole'){wholeEarth();return}if(a==='premium'){document.querySelector('#landingFreePremiumTools,#appFreePremiumTools')?.click();return}
if(a==='parcels'){toggleParcelBoundaries();return}
if(a==='listings'){openPanel('listings');return}
if(a==='worldchanges'){void openWorldChanges();return}
if(a==='weatherfx'){void openRealWorldEffects(false);return}
if(a==='windfx'){void openVolumetricFields(true).catch(e=>console.warn('BridgePoint 3D wind unavailable',e));return}
  if(a==='volumetric'){void openVolumetricFields().catch(e=>console.warn('BridgePoint volumetric fields unavailable',e));return}
if(a==='motion'){openPanel('controls');window.__BP_GLOBAL_MOTION_V5926__?.open?.();return}
if(a==='satellite'){
 const current=window.__BP_SPECTRAL_IMAGERY_V5931__;
 if(current?.open){current.open();return}
 const surfaceWorld=home?window.__BP_LANDING_WORLD__:window.__BP_V5000_WORLD__;
 void import('./world-v2300-spectral-imagery.js?v=5934-world-controls')
  .then(m=>{const api=window.__BP_SPECTRAL_IMAGERY_V5931__||m.initSpectralImagery(surfaceWorld);api?.open?.()})
  .catch(e=>console.warn('BridgePoint satellite filters unavailable',e));
 return;
}
openPanel(a)});});
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