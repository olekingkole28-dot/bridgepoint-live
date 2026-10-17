(()=>{
'use strict';
if(window.__BP_MAP_KEY_V5920__)return;
const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const fmt=n=>Number(n||0).toLocaleString();
let summary=null,loading=null;
const verticalNames={public_adjusting:'Public adjusting / claims',restoration:'Restoration',roofing:'Roofing',property_investment:'Property investment / acquisition',general_contracting:'General contracting / construction',development:'Development / redevelopment',solar:'Solar / property improvements'};
const familyNames={property_damage:'Property damage',claims:'Claims',acquisition:'Acquisition',construction:'Construction',redevelopment:'Redevelopment',property_improvement:'Property improvements'};
const mapColors=[
 {key:'CLAIMS',name:'Public adjusting / claims',color:'#a98cff',desc:'Public adjuster / claims opportunity.'},
 {key:'RESTORATION',name:'Restoration / property damage',color:'#ff4ea3',desc:'Restoration opportunity.'},
 {key:'CONSTRUCTION',name:'General contracting / construction',color:'#ffb34a',desc:'General contractor / construction opportunity.'},
 {key:'ROOF',name:'Roofing / shingles',color:'#fff200',desc:'Roof or shingle opportunity match.'},
 {key:'STORM',name:'Storm / wind / hail',color:'#b026ff',desc:'Storm, wind, hail or weather opportunity match.'},
 {key:'FIRE',name:'Fire / burn / smoke',color:'#ff3b19',desc:'Fire-related opportunity match.'},
 {key:'WATER',name:'Flood / water / drainage',color:'#00a8ff',desc:'Flood, water, drain or sewer opportunity match.'},
 {key:'SOLAR',name:'Solar / photovoltaics',color:'#ffe600',desc:'Solar opportunity match.'},
 {key:'DEVELOPMENT',name:'Development / permits / construction',color:'#00f0ff',desc:'Development, permits, construction or redevelopment match.'},
 {key:'INVESTMENT',name:'Investment / acquisition / ownership',color:'#39ff88',desc:'Investment, sale, commercial, transfer or ownership match.'},
 {key:'COMPLIANCE',name:'Code / violations / blight',color:'#ff8a00',desc:'Compliance-related opportunity match.'},
 {key:'GENERAL',name:'General property intelligence',color:'#ff2bd6',desc:'Qualified record with no more-specific color match.'}
];
function el(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n}
function typeName(k){return verticalNames[String(k||'').toLowerCase()]||String(k||'Other').replaceAll('_',' ')}
async function callSummary(){
 if(loading)return loading;
 loading=(async()=>{
  const r=await fetch(SUPA+'/rest/v1/rpc/bridgepoint_public_map_opportunity_summary_v5920',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json','Accept':'application/json'},body:'{}',cache:'no-store'});
  const d=await r.json().catch(()=>null);if(!r.ok)throw new Error(d?.message||'HTTP '+r.status);
  if(!d||d.complete!==true||Number(d.version)!==5920||!d.counts||!Array.isArray(d.by_type)||!Array.isArray(d.by_map_color))throw new Error('Incomplete main-map snapshot');
  summary=d;window.__BP_MAP_OPPORTUNITY_SUMMARY_V5920__=d;renderSummary(d);return d;
 })().catch(e=>{const n=document.getElementById('bpv-map-opportunity-updated');if(n)n.textContent='BridgePoint main-map summary could not refresh: '+String(e?.message||e);console.warn('BridgePoint map opportunity snapshot',e);return null}).finally(()=>{loading=null});
 return loading;
}
function renderSummary(d){
 const c=d.counts||{},byColor=new Map((d.by_map_color||[]).map(x=>[String(x.map_color_key||'').toUpperCase(),x]));
 const grid=document.getElementById('bpv-map-opportunity-summary');
 if(grid){grid.replaceChildren(
  metric('Main map opportunity records',fmt(c.map_opportunity_records),'Qualified active records powering the colored building overlay.'),
  metric('Distinct properties',fmt(c.map_unique_properties),'Unique property IDs; type counts overlap.'),
  metric('Corroborated records',fmt(c.corroborated_map_records),'At least two sources and at least two matched patterns.')
 )}
 const typeList=document.getElementById('bpv-map-opportunity-types');
 if(typeList){typeList.replaceChildren();for(const t of (d.by_type||[])){
  const row=el('article','bpv-opportunity-row'),info=el('div','bpv-opportunity-row-info');
  info.append(el('b','',typeName(t.vertical_key)),el('small','',(familyNames[t.opportunity_family]||t.opportunity_family||'Other')+' · '+fmt(t.unique_properties)+' type-matched properties · '+fmt(t.corroborated_records)+' corroborated records'));
  row.append(info,el('strong','bpv-opportunity-value',fmt(t.opportunity_count)));typeList.append(row);
 }}
 document.querySelectorAll('[data-bpv-map-color-count]').forEach(n=>{const x=byColor.get(String(n.dataset.bpvMapColorCount||'').toUpperCase());n.textContent=fmt(x?.opportunity_count||0)+' records · '+fmt(x?.corroborated_records||0)+' corroborated'});
 const ev=c.latest_evidence_at?new Date(c.latest_evidence_at):null,note=document.getElementById('bpv-map-opportunity-updated');
 if(note)note.textContent='Snapshot generated '+new Date(d.generated_at||d.freshness?.snapshot_generated_at||Date.now()).toLocaleString()+' · aggregate refresh hourly · latest evidence timestamp '+(ev&&!Number.isNaN(ev.getTime())?ev.toLocaleString():'not reported')+'. Per-record evidence freshness varies.';
 for(const [id,value] of [['landingOpportunityTotal',c.map_opportunity_records],['landingOpportunityTotalHero',c.map_opportunity_records],['landingOpportunityHeroStat',c.map_opportunity_records],['landingOpportunityProperties',c.map_unique_properties]]){
  const n=document.getElementById(id);if(n&&value!==null&&value!==undefined)n.textContent=fmt(value);
 }
 const publicNote=document.getElementById('bpv-map-opportunity-public-note');
 if(publicNote)publicNote.textContent='Main-map inventory: '+fmt(c.map_opportunity_records)+' qualified opportunity records across '+fmt(c.map_unique_properties)+' distinct properties. Types overlap, and evidence freshness varies.';
 updateMetricPanel(c);
 window.__BP_MAP_OPPORTUNITY_SUMMARY_AT_V5920__=Date.now();
}
function metric(label,value,desc){const x=el('article','bpv-metric-card');x.append(el('span','',label),el('b','',value),el('small','',desc));return x}
function updateMetricPanel(c){
 const grid=document.getElementById('bpv-metric-grid');if(!grid)return;
 for(const card of grid.querySelectorAll('.bpv-metric-card')){
  const label=card.querySelector('span')?.textContent||'',value=card.querySelector('b'),detail=card.querySelector('small');if(!value)continue;
  if(/Worldwide active opportunit/i.test(label)){card.querySelector('span').textContent='Worldwide main-map opportunity records';value.textContent=fmt(c.map_opportunity_records);if(detail)detail.textContent='Qualified active records behind colored buildings; refreshed hourly.'}
  else if(/Unique opportunity properties/i.test(label)){value.textContent=fmt(c.map_unique_properties);if(detail)detail.textContent='Distinct property IDs in the main map inventory; categories overlap.'}
 }
}
function addInventory(){
 const pane=document.querySelector('[data-bpv-pane="opportunities"]');if(!pane||pane.querySelector('#bpv-map-opportunity-summary'))return;
 const box=el('section','bpv-opportunity-section bpv-map-opportunity-main'),head=el('div','bpv-opportunity-section-head');
 head.append(el('b','','MAIN MAP OPPORTUNITY INVENTORY'),el('small','','Qualified active records behind the colored building overlay.'));
 const grid=el('div','bpv-metric-grid');grid.id='bpv-map-opportunity-summary';grid.append(metric('Main map opportunity records','CONNECTING','Reading BridgePoint snapshot.'));
 const sub=el('div','bpv-opportunity-section-head');sub.append(el('b','','MAIN MAP RECORDS BY OPPORTUNITY TYPE'),el('small','','Record counts overlap across types; property counts are not additive.'));
 const list=el('div','bpv-opportunity-list');list.id='bpv-map-opportunity-types';
 const note=el('p','bpv-data-note');note.id='bpv-map-opportunity-updated';note.textContent='Waiting for main-map snapshot.';
 box.append(head,grid,sub,list,note);
 const oldHead=pane.querySelector('.bpv-pane-title');if(oldHead?.nextSibling)pane.insertBefore(box,oldHead.nextSibling);else pane.prepend(box);
}
function addMapKey(panel){
 if(!panel||panel.querySelector('[data-bpv-pane="mapkey"]'))return;
 const pane=el('section','');pane.dataset.bpvPane='mapkey';pane.hidden=true;
 const head=el('div','bpv-pane-title');head.append(el('b','','BRIDGEPOINT MAP KEY'),el('small','','Opportunity colors, 3D materials, terrain, weather and transport shaders used on this map.'));
 const content=el('div','bpv-map-key-content');
 function section(title,description,rows){
  const sec=el('section','bpv-mapkey-section');sec.append(el('h3','',title));if(description)sec.append(el('p','',description));
  for(const r of rows){const row=el('div','bpv-mapkey-row'),sw=el('i','bpv-mapkey-swatch'+(r.cls?' '+r.cls:'')),copy=el('div','');
   if(r.color)sw.style.background=r.color;copy.append(el('b','',r.label),el('small','',r.desc));row.append(sw,copy);
   if(r.count){const count=el('strong','','Loading record count…');count.dataset.bpvMapColorCount=r.count;row.append(count)}sec.append(row);
  }content.append(sec);
 }
 section('OPPORTUNITY-COLORED BUILDINGS','Bright colors classify qualified BridgePoint opportunity records. Tap a colored building in the app to inspect the specific opportunity name, type and evidence.',mapColors.map(x=>({label:x.key+' · '+x.name,color:x.color,desc:x.color.toUpperCase()+' · '+x.desc,count:x.key})));
 content.lastElementChild.append(el('p','bpv-mapkey-note','Color is a category code, not a damage verdict, buyer intent or guarantee of work. Counts are records, not unique buildings; one property can qualify for multiple types.'));
 section('BUILDINGS, ROOFS + 3D SHADERS','Physical geometry/shaders describe buildings and surfaces, not opportunities.',[
  {label:'Physical building shell',cls:'bpv-mapkey-swatch-building',desc:'Source facade colors where available; fallback gradient #7F878B. Gray is not an opportunity category.'},
  {label:'Roof shell / roof cap',cls:'bpv-mapkey-swatch-roof',desc:'Physical shell shader; a textured cap is not proof of an exact roof plane.'},
  {label:'Source-backed roof / plane outlines',color:'#f3df66',desc:'Gold outlines mark source-reported shape evidence; cyan outlines mark sourced roof-plane polygons. They remain georeferenced while panning/zooming; coverage varies and a full 3D pitched roof mesh is not available for every building.'},
  {label:'Below-ground route overlay',color:'#ff648f',desc:'Pink dashed lines identify mapped tunnels/underpasses and eligible public subsurface records. Unverified buried utilities are not drawn.'},
  {label:'Building outline / geometry edge',cls:'bpv-mapkey-swatch-outline',desc:'Pale cyan #88AEB7 to #D5E5E7 at close zoom.'},
  {label:'Floor-band shader',cls:'bpv-mapkey-swatch-floor',desc:'Optional bands derived from height/level attributes; not a verified interior plan.'},
  {label:'Night-window shader',cls:'bpv-mapkey-swatch-night',desc:'Warm/cool/mixed textures at supported night/high zoom; not live occupancy.'},
  {label:'3D terrain / hill relief',cls:'bpv-mapkey-swatch-terrain',desc:'DEM elevation with light/shadow shading describes landform, not parcel value or hazard level.'}
 ]);
 section('PARCELS, ROADS + BRIDGES','',[
  {label:'Parcel boundaries',color:'#b9ffe3',desc:'Mint #B9FFE3 with green glow #2CF3A3; selected parcel #58E3A4.'},
  {label:'Major roads',color:'#53717c',desc:'Blue-gray #53717C; yellow dashed marking #F2C94C.'},
  {label:'3D road / bridge decks, rails and piers',cls:'bpv-mapkey-swatch-bridge',desc:'Charcoal deck #111315, yellow stripe #F2C94C, pale rails, gray piers #7F817D.'},
  {label:'Waterways / mapped water',color:'#2bc5ff',desc:'Cyan #2BC5FF; mapped water is not itself a flood warning.'}
 ]);
 section('TREES + PROPERTY OBJECTS','',[
  {label:'3D trees / vegetation',cls:'bpv-mapkey-swatch-tree',desc:'Evergreen canopy #285837, deciduous #397344, trunk #5B412D.'},
  {label:'Rooftop solar detail',color:'#37e6ff',desc:'Cyan geometry for source-mapped rooftop solar features; individual panel rows are not implied.'},
  {label:'Utility-scale solar site boundary',color:'#b6ff6b',desc:'Lime polygon from the public-domain USGS/Lawrence Berkeley National Laboratory photovoltaic database; facility boundary, not field survey or individual panel geometry.'},
  {label:'Pools / mapped property water',color:'#258fff',desc:'Blue source-backed pool geometry; not flood status.'},
  {label:'Streetlights / lamps',color:'#ffe8a8',desc:'Warm pale-yellow #FFE8A8 lamps over gray poles.'},
  {label:'Landmarks / masonry',color:'#817a6d',desc:'Stone-gray / earth-toned physical shaders, not opportunities.'}
 ]);
 section('IMAGERY, RADAR + WEATHER / HAZARDS','',[
  {label:'Satellite / aerial imagery',cls:'bpv-mapkey-swatch-imagery',desc:'NASA Blue Marble globe imagery; USGS orthophoto in supported U.S. coverage; OpenAerialMap close-zoom imagery where available.'},
  {label:'NOAA radar reflectivity',color:'#2c7cff',desc:'Blue #2C7CFF family when radar is enabled.'},
  {label:'Wildfire',color:'#ff744f',desc:'#FF744F · fire point / boundary.'},
  {label:'Storm / severe weather',color:'#7b8cff',desc:'#7B8CFF · reports and warnings.'},
  {label:'Flood hazard',color:'#4ca7ff',desc:'#4CA7FF · separate from blue WATER opportunity markers.'},
  {label:'Tornado',color:'#d596ff',desc:'#D596FF · warning / track.'},
  {label:'Lightning',color:'#ffe16d',desc:'#FFE16D · lightning activity.'},
  {label:'Hurricane / cyclone',color:'#65e6ff',desc:'#65E6FF · track / cone.'},
  {label:'Earthquake',color:'#ffc45b',desc:'#FFC45B · event symbols.'}
 ]);
 content.lastElementChild.append(el('p','bpv-mapkey-note','Layers render where source coverage, zoom and toggles support them. Geometry, opportunities, listings, imagery and hazard events are separate inventories.'));
 pane.append(head,content);panel.append(pane);
 const nav=panel.querySelector('.bpv-sidecar-tabs');
 if(nav){let b=nav.querySelector('[data-bpv-panel="mapkey"]');if(!b){b=el('button','','MAP KEY');b.type='button';b.dataset.bpvPanel='mapkey';nav.append(b)}
  if(!b.dataset.bpvMapKeyBound){b.dataset.bpvMapKeyBound='1';b.addEventListener('click',()=>{panel.hidden=false;panel.dataset.panel='mapkey';document.body.classList.add('bpv-panel-open');const t=panel.querySelector('#bpv-sidecar-title');if(t)t.textContent='BRIDGEPOINT MAP KEY';panel.querySelectorAll('[data-bpv-panel]').forEach(x=>{const on=x===b;x.classList.toggle('active',on);x.setAttribute('aria-pressed',String(on))});panel.querySelectorAll('[data-bpv-pane]').forEach(x=>{x.hidden=x!==pane});void callSummary()})}
 }
}
function popup(map,feature,lngLat){
 if(!map||!feature||!window.maplibregl?.Popup)return;const p=feature.properties||{},root=el('div','bpv-opportunity-popup');
 const title=el('strong','bpv-opportunity-popup-title',p.specific_opportunity||p.label||'BridgePoint opportunity'),badge=el('span','bpv-opportunity-popup-badge',p.map_color_label||p.icon_key||'General');badge.style.background=String(p.color||'#ff2bd6');
 const type=el('small','bpv-opportunity-popup-type',[p.vertical_key?typeName(p.vertical_key):'',p.opportunity_family||'',p.opportunity_key?String(p.opportunity_key).replaceAll('_',' '):''].filter(Boolean).join(' · '));
 const age=Number.isFinite(Number(p.evidence_age_days))?Math.max(0,Math.round(Number(p.evidence_age_days))):null,fresh=String(p.freshness||'UNKNOWN');
 const meta=el('p','bpv-opportunity-popup-meta',fmt(p.opportunity_count||1)+' related signals · '+fmt(p.source_count||0)+' sources · '+fmt(p.matched_pattern_count||0)+' matched patterns · evidence '+fresh.toLowerCase()+(age!==null?' ('+age+' days old)':''));
 const note=el('small','bpv-opportunity-popup-note',(p.corroborated?'Multiple source patterns corroborate this record. ':'')+((fresh==='STALE'||fresh==='AGING')?'Evidence may be aging; verify timestamps. ':'')+'Opportunity does not guarantee damage, buyer intent or paid work.');
 root.append(title,badge,type,meta,note);try{new window.maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'340px'}).setLngLat(lngLat||map.getCenter()).setDOMContent(root).addTo(map)}catch(e){console.warn('BridgePoint opportunity popup',e)}
}
function bindPopup(map){
 if(!map||map.__bpOpportunityPopupV5920)return;
 const bind=()=>{if(map.__bpOpportunityPopupV5920)return true;if(!map.getLayer('gta-opportunity-buildings')&&!map.getLayer('gta-opportunity-label'))return false;map.__bpOpportunityPopupV5920=true;
  map.on('click',e=>{try{const ids=['gta-opportunity-buildings','gta-opportunity-label'].filter(id=>map.getLayer(id)&&(map.getLayoutProperty(id,'visibility')||'visible')!=='none');if(!ids.length)return;const hits=map.queryRenderedFeatures(e.point,{layers:ids})||[];const f=hits.find(x=>x?.properties?.specific_opportunity||x?.properties?.icon_key);if(f)popup(map,f,e.lngLat)}catch(err){console.warn('BridgePoint opportunity click',err)}});return true};
 if(bind())return;map.on('styledata',bind);[200,700,1600,3500].forEach(ms=>setTimeout(bind,ms));
}
function mount(){
 window.__BP_MAP_KEY_REFRESH_V5920__=callSummary;
 const panel=document.getElementById('bpv-sidecar'),nav=panel?.querySelector('.bpv-sidecar-tabs'),opp=panel?.querySelector('[data-bpv-pane="opportunities"]');
 if(!panel||!nav||!opp)return false;
 addInventory();addMapKey(panel);
 const map=window.__BP_LANDING_WORLD__?.map||window.__bpLandingWorldV5420?.map||window.__BP_V5000_WORLD?.map||window.__BP_V5000_WORLD__?.map;
 if(map)bindPopup(map);
 if(!window.__BP_MAP_POPUP_BIND_LOOP_V5920__)window.__BP_MAP_POPUP_BIND_LOOP_V5920__=setInterval(()=>{const m=window.__BP_LANDING_WORLD__?.map||window.__bpLandingWorldV5420?.map||window.__BP_V5000_WORLD?.map||window.__BP_V5000_WORLD__?.map;if(m){bindPopup(m);if(m.__bpOpportunityPopupV5920)clearInterval(window.__BP_MAP_POPUP_BIND_LOOP_V5920__)}},250);
 if(!window.__BP_MAP_KEY_INIT__){window.__BP_MAP_KEY_INIT__=true;void callSummary();setInterval(()=>{if(!document.hidden)void callSummary()},5*60*1000);const observer=new MutationObserver(()=>{if(summary)updateMetricPanel(summary.counts||{})});const metricGrid=document.getElementById('bpv-metric-grid');if(metricGrid)observer.observe(metricGrid,{childList:true,subtree:true})}
 return true;
}
let attempts=0;function boot(){if(mount()||++attempts>=100)return;setTimeout(boot,150)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('load',boot,{once:true});
})();