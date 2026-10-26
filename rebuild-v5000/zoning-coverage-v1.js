(()=>{
'use strict';
if(window.__BP_ZONING_COVERAGE_V1__)return;
const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const RPC=SUPA+'/rest/v1/rpc/bridgepoint_public_zoning_coverage_v1';
let currentSelection=null,active=false,requestSeq=0;
const $=s=>document.querySelector(s);
const num=v=>Number.isFinite(Number(v))?Number(v):null;
function coordsFromFeature(feature){
 const p=feature?.properties||{};
 const candidates=[
  {lng:p.longitude??p.lon??p.center_lon??p.lng,lat:p.latitude??p.lat??p.center_lat},
  {lng:p.centroid_lon,lat:p.centroid_lat}
 ];
 for(const c of candidates){const lng=num(c.lng),lat=num(c.lat);if(lng!==null&&lat!==null&&lng>=-180&&lng<=180&&lat>=-90&&lat<=90)return{lng,lat}}
 const g=feature?.geometry;if(!g?.coordinates)return null;
 const polygon=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
 const rings=polygon.map(poly=>poly?.[0]).filter(r=>Array.isArray(r)&&r.length>2);
 if(!rings.length)return null;
 const ring=rings.sort((a,b)=>b.length-a.length)[0];
 let sx=0,sy=0,n=0;for(const xy of ring){const lng=num(xy?.[0]),lat=num(xy?.[1]);if(lng===null||lat===null)continue;sx+=lng;sy+=lat;n++}
 if(!n)return null;const lng=sx/n,lat=sy/n;
 return lng>=-180&&lng<=180&&lat>=-90&&lat<=90?{lng,lat}:null;
}
function resolveCoords(selection){
 const c=selection?.coordinates||{};
 let lng=num(c.lng??c.longitude),lat=num(c.lat??c.latitude);
 if(lng!==null&&lat!==null&&lng>=-180&&lng<=180&&lat>=-90&&lat<=90)return{lng,lat};
 return coordsFromFeature(selection?.feature);
}
function addStyles(){
 if($('#bp-zoning-coverage-styles-v1'))return;
 const s=document.createElement('style');s.id='bp-zoning-coverage-styles-v1';
 s.textContent=`
 .bpv-zoning-result{margin-top:10px;padding:12px;border:1px solid rgba(44,243,163,.22);border-radius:12px;background:rgba(4,19,25,.92);color:#e8f5f5;font:12px/1.5 Inter,system-ui,sans-serif}
 .bpv-zoning-result h4{margin:0 0 8px;font-size:11px;letter-spacing:.08em;color:#7be8c1}
 .bpv-zoning-result .bpzr-status{margin:5px 0 10px;color:#b5c7cc}
 .bpv-zoning-result .bpzr-grid{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:5px 12px}
 .bpv-zoning-result .bpzr-grid span{color:#a4b7bd}
 .bpv-zoning-result .bpzr-grid b{text-align:right;color:#fff;font-variant-numeric:tabular-nums}
 .bpv-zoning-result .bpzr-block{margin-top:11px;padding-top:9px;border-top:1px solid rgba(170,205,214,.14)}
 .bpv-zoning-result .bpzr-links{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
 .bpv-zoning-result a{color:#7be8c1;text-decoration:underline;overflow-wrap:anywhere}
 .bpv-zoning-result .bpzr-note{margin:9px 0 0;color:#9aadb4;font-size:10px}
 .bpv-zoning-result .bpzr-error{color:#ffc8b6}
 `;
 document.head.appendChild(s);
}
function slot(){
 return document.querySelector('#bpv-side-property-slots [data-bpv-slot="zoning"]')
  || document.querySelector('#bpv-property-card-slot [data-bpv-slot="zoning"]')
  || document.querySelector('.bpv-slot-card[data-bpv-slot="zoning"]');
}
function ensureResult(){
 addStyles();const card=slot();if(!card)return null;
 let panel=card.querySelector('.bpv-zoning-result');
 if(!panel){panel=document.createElement('div');panel.className='bpv-zoning-result';panel.setAttribute('aria-live','polite');card.appendChild(panel)}
 return panel;
}
function textEl(tag,cls,txt){
 const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=txt==null?'':String(txt);return e;
}
function line(grid,label,value){
 grid.append(textEl('span','',label),textEl('b','',value==null?'Not available':value));
}
function fmt(n,decimals=2){
 const x=num(n);if(x===null)return'Not available';
 return x.toLocaleString(undefined,{minimumFractionDigits:0,maximumFractionDigits:decimals});
}
function safeLink(container,url,label){
 try{
  const u=new URL(String(url||''));if(!['http:','https:'].includes(u.protocol))return;
  const a=document.createElement('a');a.href=u.href;a.target='_blank';a.rel='noopener noreferrer';a.textContent=label;container.appendChild(a);
 }catch(_){}
}
function renderMessage(panel,title,message,error=false){
 panel.replaceChildren(textEl('h4','',title),textEl('p',error?'bpzr-status bpzr-error':'bpzr-status',message));
}
function renderResult(panel,d){
 panel.replaceChildren();
 panel.appendChild(textEl('h4','','LOT COVERAGE + ZONING CROSS-REFERENCE'));
 const parcel=d?.parcel||{},building=d?.building_footprints||{},zone=d?.zoning||{};
 const status=d?.status||'RESULT_RETURNED';
 const desc={
  MEASURED_SOURCE_COVERED_FOOTPRINTS:'Measured from source-backed building footprint polygons intersecting the matched parcel.',
  BUILDING_FEATURE_CAP_REACHED:'The analysis reached its safety cap. No coverage percentage is reported as exact.',
  BUILDING_FOOTPRINT_COVERAGE_UNAVAILABLE:'Parcel matched, but no eligible source-backed building footprints could be measured here.',
  PARCEL_AREA_UNAVAILABLE:'The parcel source did not supply a usable area for calculation.',
  PUBLIC_PARCEL_GEOMETRY_UNAVAILABLE:'No parcel geometry cleared for public analysis was found at these coordinates.'
 }[status]||'Source-backed parcel and zoning lookup completed.';
 panel.appendChild(textEl('p','bpzr-status',desc));
 const grid=document.createElement('div');grid.className='bpzr-grid';
 line(grid,'Parcel area',parcel.area_m2!=null?fmt(parcel.area_m2)+' m²':null);
 line(grid,'Building footprint union',building.union_footprint_area_m2!=null?fmt(building.union_footprint_area_m2)+' m²':null);
 line(grid,'Measured lot coverage',building.measured_lot_coverage_pct!=null?fmt(building.measured_lot_coverage_pct)+'%':null);
 line(grid,'Source footprint features',building.source_feature_count!=null?fmt(building.source_feature_count,0):null);
 line(grid,'Coverage completeness',building.completeness==='SOURCE_COVERAGE_NOT_PROVEN_COMPLETE'?'Not proven complete':'Needs review');
 panel.appendChild(grid);
 const zblock=document.createElement('div');zblock.className='bpzr-block';
 zblock.appendChild(textEl('h4','','OFFICIAL ZONING RULE'));
 const zg=document.createElement('div');zg.className='bpzr-grid';
 line(zg,'Zone',zone.zone_code?(zone.zone_code+(zone.zone_name?' · '+zone.zone_name:'')):null);
 line(zg,'Allowed maximum',zone.allowed_max_coverage_pct!=null?fmt(zone.allowed_max_coverage_pct)+'%':'Not verified');
 line(zg,'Code section',zone.code_section||null);
 line(zg,'Rule verification',zone.status==='VERIFIED_OFFICIAL_RULE_MATCH'?'Verified official rule':zone.status==='OFFICIAL_DISTRICT_NOT_MATERIALIZED'?'Official zoning district not yet mapped':'Official maximum not yet verified');
 zblock.appendChild(zg);
 if(zone.allowed_max_coverage_pct==null){
  zblock.appendChild(textEl('p','bpzr-note','BridgePoint will not guess the legal maximum. An official zoning district and a current, verified ordinance rule must both be available for this location.'));
 }
 const links=document.createElement('div');links.className='bpzr-links';
 safeLink(links,zone.rule_source_url,'Open ordinance / rule source');
 safeLink(links,zone.district_source_url,'Open zoning district source');
 if(parcel.source_url)safeLink(links,parcel.source_url,'Open parcel source');
 for(const s of (building.sources||[])){
  if(s.source_key)safeLink(links,sourceUrlFor(s.source_key),'Source: '+s.provider+' · '+s.source_key);
 }
 if(links.childElementCount)zblock.appendChild(links);
 panel.appendChild(zblock);
 panel.appendChild(textEl('p','bpzr-note',d?.truth_notice||'Geometry-derived coverage is not a legal determination. Source coverage, legal exceptions, exclusions and current zoning code must be independently verified.'));
 const src=d?.source_attribution?.building_sources||[];
 if(src.length){
  const attribution=textEl('p','bpzr-note','Building footprint attribution: '+src.map(x=>[x.provider,x.license,x.source_key].filter(Boolean).join(' · ')).join(' | '));
  panel.appendChild(attribution);
 }
}
function sourceUrlFor(key){
 if(key==='MICROSOFT_GLOBALML_BUILDINGS')return'https://github.com/microsoft/GlobalMLBuildingFootprints';
 if(String(key||'').startsWith('OVERTURE'))return'https://docs.overturemaps.org/';
 return'';
}
async function open(selection){
 currentSelection=selection||window.__BP_SELECTED_PROPERTY_V1__||currentSelection||null;
 active=true;const panel=ensureResult();if(!panel)return;
 const pt=resolveCoords(currentSelection);
 if(!pt){renderMessage(panel,'LOT COVERAGE + ZONING CROSS-REFERENCE','Select a mapped building with usable coordinates. BridgePoint will not substitute the map center or estimate a parcel.',true);return}
 const seq=++requestSeq;
 renderMessage(panel,'LOT COVERAGE + ZONING CROSS-REFERENCE','Resolving the source-cleared parcel, intersecting eligible building footprints, and checking official zoning data…');
 try{
  const r=await fetch(RPC,{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json','Accept':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({p_lng:pt.lng,p_lat:pt.lat}),cache:'no-store'});
  const d=await r.json().catch(()=>({}));
  if(!r.ok)throw new Error(d?.message||d?.error||('HTTP '+r.status));
  if(seq!==requestSeq||!active)return;
  renderResult(panel,d);
 }catch(e){
  if(seq!==requestSeq||!active)return;
  renderMessage(panel,'LOT COVERAGE + ZONING CROSS-REFERENCE','Could not retrieve the source-backed analysis: '+String(e?.message||e),true);
 }
}
function syncSelection(e){
 currentSelection=e?.detail||window.__BP_SELECTED_PROPERTY_V1__||currentSelection;
 if(active)void open(currentSelection);
}
window.addEventListener('bp:property-selection-v1',syncSelection);
window.__BP_ZONING_COVERAGE_V1__={version:1,open,close(){active=false;requestSeq++},get selection(){return currentSelection}};
})();