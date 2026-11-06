/* BridgePoint Global Subsurface Wells v1.
 * Isolated opt-in overlay: groundwater wells, boreholes, onshore water wells,
 * offshore hydrocarbon wells, and globally shared water-well records.
 * Source-reported depths are kept distinct from illustrative 3D casing geometry.
 */
const VERSION = 1;
const MAP_STATES = new WeakMap();
let threePromise = null;
const THREE_URL = '/vendor/three.module.js?v=169-local';
const SOURCE_ID = 'bp-subsurface-wells-source-v1';
const HALO_ID = 'bp-subsurface-wells-halo-v1';
const MARKER_ID = 'bp-subsurface-wells-markers-v1';
const ICON_ID = 'bp-subsurface-wells-icons-v1';
const DEPTH_LABEL_ID = 'bp-subsurface-wells-depth-labels-v1';
const MODEL_ID = 'bp-subsurface-wells-models-v1';
const MIN_MODEL_ZOOM = 11.6;
const MIN_DEPTH_LABEL_ZOOM = 10.0;
const MAX_MODELS = typeof window !== 'undefined' &&
  ((Number(window.innerWidth) || 1024) <= 820 || Number(navigator.maxTouchPoints) > 0) ? 6 : 18;
const RAD = Math.PI / 180;
const EMPTY = { type:'FeatureCollection', features:[] };
const USGS_ITEMS = 'https://api.waterdata.usgs.gov/ogcapi/v1/collections/monitoring-locations/items';
const USGS_COLLECTION = 'https://api.waterdata.usgs.gov/ogcapi/v1/collections/monitoring-locations';
const BGS_OFFSHORE_ITEMS = 'https://ogcapi.bgs.ac.uk/collections/offshore-hydrocarbon-wells/items';
const BGS_BOREHOLE_ITEMS = 'https://ogcapi.bgs.ac.uk/collections/onshoreboreholeindex/items';
const BGS_OFFSHORE_SOURCE = 'https://ogcapi.bgs.ac.uk/collections/offshore-hydrocarbon-wells';
const BGS_BOREHOLE_SOURCE = 'https://www.bgs.ac.uk/datasets/borehole-records/';
const NOAA_WELLS_QUERY = 'https://www.coast.noaa.gov/arcgis/rest/services/OceanReports/OilGasWells/MapServer/0/query';
const NOAA_WELLS_SOURCE = 'https://www.coast.noaa.gov/arcgis/rest/services/OceanReports/OilGasWells/MapServer/0';
const WPDX_ITEMS = 'https://data.waterpointdata.org/resource/jfkt-jmqa.json';
const WPDX_SOURCE = 'https://www.waterpointdata.org/access-data/';
const OSM_SOURCE = 'https://www.openstreetmap.org/copyright';

function finite(value, fallback = null) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, finite(value, min)));
}
export function parseSubsurfaceDepth(value, defaultUnit = 'm', max = 50000) {
  if (value === null || value === undefined || value === '') return null;
  let amount = null, unit = String(defaultUnit || 'm').toLowerCase();
  if (typeof value === 'number') amount = value;
  else {
    const m = String(value).trim().replace(/,/g, '').match(/^([0-9]+(?:\.[0-9]+)?)\s*(m|metres?|meters?|km|kilomet(?:er|re)s?|ft|feet|foot|')?$/i);
    if (!m) return null;
    amount = Number(m[1]);
    if (m[2]) unit = m[2].toLowerCase();
  }
  if (!Number.isFinite(amount) || amount <= 0) return null;
  let metres = amount;
  if (['ft','feet','foot',"'"].includes(unit)) metres *= 0.3048;
  else if (['km','kilometer','kilometers','kilometre','kilometres'].includes(unit)) metres *= 1000;
  return Number.isFinite(metres) && metres > 0 && metres <= max ? metres : null;
}
export function isSealedWellStatus(value) {
  return /\b(plugged|abandoned|sealed|capped|decommissioned|closed|grouted|permanently\s+abandoned)\b/i.test(String(value || ''));
}
export function resolveWellGroundElevation(sourceElevationM, terrainElevationM) {
  if (typeof sourceElevationM === 'number' && Number.isFinite(sourceElevationM)) return sourceElevationM;
  if (typeof terrainElevationM === 'number' && Number.isFinite(terrainElevationM)) return terrainElevationM;
  return 0;
}
function validCoordinate(c) {
  return Array.isArray(c) && Number.isFinite(Number(c[0])) && Number.isFinite(Number(c[1])) &&
    Math.abs(Number(c[0])) <= 180 && Math.abs(Number(c[1])) <= 85;
}
function depthLabel(depthM, depthType) {
  if (!Number.isFinite(depthM) || depthM <= 0) return '';
  return depthM.toLocaleString('en-US',{maximumFractionDigits:2})+' m '+String(depthType||'depth');
}
function markerColor(kind, sealed) {
  if (sealed) return '#d3d7df';
  return kind==='gas'?'#ff9b50':kind==='oil'?'#e7c45d':
    kind==='water'?'#50cfff':kind==='geothermal'?'#c58bff':'#79d5ba';
}
function makeFeature(id, coordinate, p) {
  if (!validCoordinate(coordinate)) return null;
  const kind = ['water','oil','gas','geothermal','drillhole'].includes(p.kind) ? p.kind : 'drillhole';
  const d = Number.isFinite(p.depthM) && p.depthM > 0 ? p.depthM : null;
  const status = String(p.status || '').trim().slice(0,160);
  const sealed = isSealedWellStatus(status);
  const sourceName = String(p.sourceName || 'Source not identified').slice(0,100);
  return {
    type:'Feature', id:String(id),
    geometry:{type:'Point',coordinates:[Number(coordinate[0]),Number(coordinate[1])]},
    properties:{
      key:String(id), name:String(p.name || (kind==='water'?'Water well':kind==='oil'?'Oil well':kind==='gas'?'Gas well':'Borehole')).slice(0,140),
      kind, assetIcon:kind, markerColor:markerColor(kind,sealed),
      status:status || 'Not reported', sealed,
      depthM:d, depthKnown:d!==null, depthType:String(p.depthType||'depth'),
      depthLabel:depthLabel(d,p.depthType),
      depthNote:d===null?'Depth is not published in this source record.':String(p.depthNote||'Depth value reproduced from the cited source record.'),
      aquifer:String(p.aquifer||'').slice(0,140), aquiferType:String(p.aquiferType||'').slice(0,80),
      operator:String(p.operator||'').slice(0,120), owner:String(p.owner||'').slice(0,120),
      country:String(p.country||'').slice(0,80), region:String(p.region||'').slice(0,100),
      recordClass:String(p.recordClass||'').slice(0,100), recordId:String(p.recordId||id).slice(0,120),
      year:String(p.year||'').slice(0,24), installDate:String(p.installDate||'').slice(0,40),
      surfaceElevationM:Number.isFinite(p.surfaceElevationM)?p.surfaceElevationM:null,
      waterDepthM:Number.isFinite(p.waterDepthM)?p.waterDepthM:null,
      deviation:String(p.deviation||'').slice(0,80),
      lithologyNote:String(p.lithologyNote||'').slice(0,220),
      sourceName, sourceUrl:String(p.sourceUrl||'').slice(0,500),
      detailsUrl:String(p.detailsUrl||'').slice(0,500),
      sourceRecord:String(p.sourceRecord||'').slice(0,180),
      locationPrecision:String(p.locationPrecision||'').slice(0,80),
      modelNote:'Borehole/casing diameter and casing color are illustrative. Vertical depth is source-reported only where a numeric depth is shown.'
    }
  };
}
export function normalizeUsGsWell(feature) {
  if (!feature || !feature.geometry || !validCoordinate(feature.geometry.coordinates)) return null;
  const p=feature.properties||{};
  const hole=parseSubsurfaceDepth(p.hole_constructed_depth,'ft');
  const well=parseSubsurfaceDepth(p.well_constructed_depth,'ft');
  const d=hole||well;
  const dType=hole?'drilled hole depth':well?'finished well depth':'depth';
  const altitudeFeet=finite(p.altitude);
  const elevation=altitudeFeet===null?null:altitudeFeet*0.3048;
  return makeFeature('usgs/'+String(p.id||p.monitoring_location_number||feature.id||''),feature.geometry.coordinates,{
    kind:'water',name:p.monitoring_location_name||p.monitoring_location_number||'USGS groundwater well',
    depthM:d,depthType:dType,depthNote:'USGS monitoring-location field; source values are reported in feet and converted to metres for display.',
    aquifer:[p.aquifer_code,p.national_aquifer_code].filter(Boolean).join(' · '),
    aquiferType:p.aquifer_type_code||'',country:p.country_name||'United States',
    region:[p.state_name,p.county_name].filter(Boolean).join(' · '),
    recordClass:p.site_type||'Groundwater monitoring location',recordId:p.monitoring_location_number||p.id,
    year:p.construction_date||'',surfaceElevationM:elevation,
    sourceName:'U.S. Geological Survey · Water Data',sourceUrl:USGS_COLLECTION,
    detailsUrl:USGS_ITEMS+'?f=json&monitoring_location_number='+encodeURIComponent(p.monitoring_location_number||''),
    sourceRecord:p.monitoring_location_number||p.id||'',locationPrecision:p.horizontal_positional_accuracy||''
  });
}
export function normalizeBgsOffshoreWell(feature) {
  if (!feature || !feature.geometry || !validCoordinate(feature.geometry.coordinates)) return null;
  const p=feature.properties||{};
  const tvd=parseSubsurfaceDepth(p.tvd_m,'m'),td=parseSubsurfaceDepth(p.td_m,'m');
  const d=tvd||td, dType=tvd?'true vertical depth (TVD)':td?'total depth (TD)':'depth';
  const typeText=[p.well_flow_type,p.well_flow_class,p.wellname,p.well_class].filter(Boolean).join(' ').toLowerCase();
  const kind=/gas/.test(typeText)?'gas':/oil|petroleum/.test(typeText)?'oil':'drillhole';
  const recordId=p.wellid||feature.id||'';
  return makeFeature('bgs-offshore/'+recordId,feature.geometry.coordinates,{
    kind,name:p.wellname||('BGS offshore well '+recordId),depthM:d,depthType:dType,
    depthNote:tvd?'BGS/NSTA source-reported TVD.':td?'BGS/NSTA total depth; for deviated wells this can differ from true vertical depth.':'No numeric drilled depth in this source record.',
    status:p.well_status||'',operator:p.original_operator||p.current_owner||'',
    owner:p.current_owner||'',country:'United Kingdom',region:'UK Continental Shelf',
    recordClass:p.well_class||'',recordId,year:p.spud_date||'',
    surfaceElevationM:Number.isFinite(Number(p.water_depth_m))?-Math.abs(Number(p.water_depth_m)):null,
    waterDepthM:finite(p.water_depth_m),deviation:p.well_deviation||'',
    lithologyNote:p.well_flow_class||'Lithology log not exposed in this summary record.',
    sourceName:'British Geological Survey / North Sea Transition Authority',
    sourceUrl:BGS_OFFSHORE_SOURCE,detailsUrl:p.details||BGS_OFFSHORE_SOURCE,
    sourceRecord:p.den_number||p.licence||'',locationPrecision:'Source OGC point'
  });
}
export function normalizeBgsBorehole(feature) {
  if (!feature || !feature.geometry || !validCoordinate(feature.geometry.coordinates)) return null;
  const p=feature.properties||{};
  const d=parseSubsurfaceDepth(p.length,'m');
  const waterRef=String(p.water_well_ref||'').trim();
  const kind=waterRef && waterRef.toUpperCase()!=='N/A'?'water':'drillhole';
  const id=p.reference||p.bgs_id||p.id||feature.id||'';
  return makeFeature('bgs-onshore/'+id,feature.geometry.coordinates,{
    kind,name:p.name||p.reference||'BGS borehole',
    depthM:d,depthType:'borehole length',
    depthNote:'BGS SOBI borehole length in metres; this is the published borehole length, not a reconstructed lithology interval.',
    status:'',country:'United Kingdom',region:'Great Britain',
    recordClass:kind==='water'?'Water well borehole':'Onshore borehole',
    recordId:id,year:p.year_known||'',
    lithologyNote:'Geological log/scan may be available through the linked source record.',
    sourceName:'British Geological Survey · Single Onshore Borehole Index',
    sourceUrl:BGS_BOREHOLE_SOURCE,
    detailsUrl:p.scan_url||p.ags_log_url||BGS_BOREHOLE_SOURCE,
    sourceRecord:waterRef && waterRef.toUpperCase()!=='N/A'?waterRef:id,
    locationPrecision:p.precision||''
  });
}
export function normalizeNoaaWell(feature) {
  if (!feature || !feature.geometry || !validCoordinate(feature.geometry.coordinates)) return null;
  const p=feature.properties||{},id=p.OBJECTID||feature.id||'';
  const status=p.wellStatus||'';
  return makeFeature('noaa-well/'+id,feature.geometry.coordinates,{
    kind:'drillhole',name:'NOAA '+String(p.wellType||'oil and gas well')+' · '+id,
    status,recordClass:p.wellType||'Oil and gas well',recordId:id,
    country:'United States',region:'U.S. coastal / territorial waters',
    sourceName:'NOAA OceanReports · Oil and Gas Wells',
    sourceUrl:NOAA_WELLS_SOURCE,detailsUrl:NOAA_WELLS_SOURCE,
    sourceRecord:p.sourceRecord||'',depthNote:'NOAA location/status layer does not publish a drilled depth for this record.'
  });
}
export function normalizeWpdxWell(row) {
  if (!row) return null;
  const lon=finite(row.lon_deg),lat=finite(row.lat_deg);
  if (lon===null||lat===null) return null;
  const category=String(row.water_source_category||row.water_source_clean||row.water_source||'').toLowerCase();
  const technology=String(row.water_tech||row.water_tech_clean||'').toLowerCase();
  if (!/well|borehole|tubewell/.test(category+' '+technology)) return null;
  const id=row.row_id||row.activity_id||row.scheme_id;
  if (!id) return null;
  const url=row.data_lnk?.url||row.public_data_source||WPDX_SOURCE;
  return makeFeature('wpdx/'+id,[lon,lat],{
    kind:'water',name:String(row.water_source||row.water_tech||'Reported water well').slice(0,120),
    status:row.status_clean||row.status_id||'Not reported',
    recordClass:row.water_tech||row.water_source_category||'Reported water well',
    recordId:id,country:row.clean_country_name||row.country_name||'',
    region:[row.clean_adm1||row.adm1,row.clean_adm2||row.adm2].filter(Boolean).join(' · '),
    year:row.install_year||'',installDate:row.report_date||'',
    sourceName:'Water Point Data Exchange · WPdx-Basic',
    sourceUrl:WPDX_SOURCE,detailsUrl:url,sourceRecord:row.source||row.dataset_title||'',
    depthNote:'WPdx is a reported water-point inventory. This record does not publish a drilled depth; the 3D stub is schematic only.'
  });
}
export function normalizeOsmWell(element) {
  if (!element?.tags) return null;
  const t=element.tags,man=String(t.man_made||'').toLowerCase();
  if (!/^(water_well|petroleum_well|oil_well|gas_well|well|borehole|geothermal_well)$/.test(man)) return null;
  let c=null;
  if (Number.isFinite(Number(element.lon))&&Number.isFinite(Number(element.lat))) c=[Number(element.lon),Number(element.lat)];
  else if (element.center&&Number.isFinite(Number(element.center.lon))&&Number.isFinite(Number(element.center.lat))) c=[Number(element.center.lon),Number(element.center.lat)];
  if (!validCoordinate(c)) return null;
  const text=[man,t.substance,t.resource,t.product,t.name,t['well:type'],t.borehole].filter(Boolean).join(' ').toLowerCase();
  const kind=/gas/.test(text)?'gas':/oil|petroleum/.test(text)?'oil':/geothermal/.test(text)?'geothermal':'water';
  const rawDepth=t['well:depth']||t['borehole:depth']||t['drill:depth']||t.depth||'';
  const depth=parseSubsurfaceDepth(rawDepth,'m',30000);
  const status=t.status||t['well:status']||(t.abandoned==='yes'?'abandoned':t.disused==='yes'?'disused':t.sealing||'');
  const id=String(element.type||'node')+'/'+String(element.id||c.join('/'));
  return makeFeature('osm-well/'+id,c,{
    kind,name:t.name||t.operator||(kind.toUpperCase()+' well / borehole'),
    depthM:depth,depthType:'tagged drilled depth',
    depthNote:depth?'Depth taken from OpenStreetMap depth tag; tag unit parsed as published.':'No depth tag is published for this OpenStreetMap feature.',
    status,operator:t.operator||'',country:t['addr:country']||'',region:t['addr:state']||t['addr:region']||'',
    recordClass:man,recordId:id,year:t.start_date||t['construction:date']||'',
    aquifer:t.aquifer||'',lithologyNote:t.geology||t.lithology||'No lithology interval log in this map feature.',
    sourceName:'OpenStreetMap contributors',sourceUrl:OSM_SOURCE,
    detailsUrl:'https://www.openstreetmap.org/'+(element.type==='way'?'way':element.type==='relation'?'relation':'node')+'/'+encodeURIComponent(element.id||''),
    sourceRecord:element.id||''
  });
}
async function requestJson(url,timeout=30000) {
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
  try {
    const r=await fetch(url,{mode:'cors',credentials:'omit',cache:'no-store',signal:ctl.signal});
    if(!r.ok)throw new Error('HTTP '+r.status);
    return await r.json();
  } finally {clearTimeout(timer)}
}
function appendParams(base,params) {
  const u=new URL(base);
  for(const [k,v] of Object.entries(params)) if(v!==null&&v!==undefined)u.searchParams.set(k,String(v));
  return u.toString();
}
async function fetchUsGsWells(bbox='-180,-85,180,85',limit=2500) {
  const data=await requestJson(appendParams(USGS_ITEMS,{f:'json',limit, bbox,site_type_code:'GW'}),35000);
  return Array.isArray(data.features)?data.features.map(normalizeUsGsWell).filter(Boolean):[];
}
async function fetchBgsOffshoreWells() {
  const rows=[];let next=appendParams(BGS_OFFSHORE_ITEMS,{f:'json',limit:1000,bbox:'-180,-85,180,85'});
  for(let page=0;page<12&&next;page++){
    const data=await requestJson(next,35000);
    if(Array.isArray(data.features))rows.push(...data.features.map(normalizeBgsOffshoreWell).filter(Boolean));
    const link=(data.links||[]).find(x=>x.rel==='next'&&x.href);
    next=link?new URL(link.href,BGS_OFFSHORE_ITEMS).toString():null;
  }
  return rows;
}
async function fetchNoaaWells() {
  const rows=[];const field='OBJECTID,wellStatus,wellType,sourceRecord';
  for(let offset=0;offset<10000;offset+=2000){
    const url=appendParams(NOAA_WELLS_QUERY,{where:'1=1',outFields:field,returnGeometry:'true',outSR:4326,resultRecordCount:2000,resultOffset:offset,f:'geojson'});
    const data=await requestJson(url,35000);
    if(Array.isArray(data.features))rows.push(...data.features.map(normalizeNoaaWell).filter(Boolean));
    if(data.exceededTransferLimit!==true||!data.features?.length)break;
  }
  return rows;
}
function wpdxWhere() {
  return "water_source_category = 'Well' OR water_source_category = 'Borehole' OR water_tech_category like '%Well%' OR water_tech like '%Well%' OR water_source like '%borehole%'";
}
async function fetchWpdxWells(limit=10000,bbox=null) {
  const params={
    '$limit':limit,'$order':'row_id ASC',
    '$where':bbox
      ?'('+wpdxWhere()+') AND within_box(geocoded_column,'+[bbox[1],bbox[0],bbox[3],bbox[2]].join(',')+')'
      :wpdxWhere()
  };
  const rows=await requestJson(appendParams(WPDX_ITEMS,params),45000);
  return Array.isArray(rows)?rows.map(normalizeWpdxWell).filter(Boolean):[];
}
function overpassRequestUrl(endpoint,query) {
  const u=new URL(endpoint);u.searchParams.set('data',String(query||''));return u.toString();
}
function overpassQuery(bbox=null) {
  const box=bbox?'('+[bbox[1],bbox[0],bbox[3],bbox[2]].join(',')+')':'';
  const selector='nwr["man_made"~"^(water_well|petroleum_well|oil_well|gas_well|well|borehole|geothermal_well)$"]'+box+';';
  return '[out:json][timeout:35];('+selector+');out center tags 12000;';
}
async function fetchOsmWells(bbox=null) {
  const q=overpassQuery(bbox);
  let last=null;
  for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter']){
    try {
      const data=await requestJson(overpassRequestUrl(endpoint,q),42000);
      if(!Array.isArray(data.elements))throw new Error('Overpass returned no elements');
      return data.elements.map(normalizeOsmWell).filter(Boolean);
    } catch(e){last=e}
  }
  throw last||new Error('Global OSM borehole inventory unavailable');
}
async function fetchBgsOnshoreBoreholes(bbox) {
  const data=await requestJson(appendParams(BGS_BOREHOLE_ITEMS,{f:'json',limit:1600,bbox:bbox.join(',')}),35000);
  return Array.isArray(data.features)?data.features.map(normalizeBgsBorehole).filter(Boolean):[];
}
function isGreatBritainBounds(b) {
  return b[0]<3.5&&b[2]>-8.5&&b[1]<61.5&&b[3]>49.0;
}
function isUsBounds(b) {
  return b[0]<-60&&b[2]>-130&&b[1]<52&&b[3]>22;
}
function addFeatures(state,features) {
  let added=0;
  for(const f of features||[]) {
    if(!f||!f.id)continue;
    const key=String(f.id);
    if(!state.featureCache.has(key))added++;
    state.featureCache.set(key,f);
  }
  if(added||features?.length) {
    const cap=50000,all=[...state.featureCache.values()];
    if(all.length>cap) {
      const keep=all.slice(0,cap);
      state.featureCache.clear();for(const f of keep)state.featureCache.set(String(f.id),f);
    }
    state.collection={type:'FeatureCollection',features:[...state.featureCache.values()]};
    const source=state.map.getSource(SOURCE_ID);if(source)source.setData(state.collection);
    state.stats.total=state.collection.features.length;
    state.stats.water=state.collection.features.filter(f=>f.properties.kind==='water').length;
    state.stats.oil=state.collection.features.filter(f=>f.properties.kind==='oil').length;
    state.stats.gas=state.collection.features.filter(f=>f.properties.kind==='gas').length;
    state.stats.drillholes=state.collection.features.filter(f=>f.properties.kind==='drillhole'||f.properties.kind==='geothermal').length;
    rebuildModels(state);if(state.renderer)state.map.triggerRepaint?.();
  }
}
function makeIcon(kind) {
  const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Subsurface icon canvas unavailable');
  const color=markerColor(kind,false);ctx.clearRect(0,0,96,96);ctx.save();ctx.translate(48,48);
  ctx.shadowColor=color;ctx.shadowBlur=10;ctx.fillStyle=color;ctx.strokeStyle='#0a1b28';ctx.lineWidth=5;
  if(kind==='water') {
    ctx.beginPath();ctx.moveTo(0,-39);ctx.bezierCurveTo(10,-21,27,4,27,17);ctx.bezierCurveTo(27,33,15,40,0,40);ctx.bezierCurveTo(-15,40,-27,33,-27,17);ctx.bezierCurveTo(-27,4,-10,-21,0,-39);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.shadowBlur=0;ctx.fillStyle='#e8fbff';ctx.beginPath();ctx.ellipse(-7,14,5,11,-0.3,0,Math.PI*2);ctx.fill();
  } else if(kind==='oil') {
    ctx.beginPath();ctx.moveTo(0,-39);ctx.bezierCurveTo(10,-21,27,4,27,17);ctx.bezierCurveTo(27,33,15,40,0,40);ctx.bezierCurveTo(-15,40,-27,33,-27,17);ctx.bezierCurveTo(-27,4,-10,-21,0,-39);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.shadowBlur=0;ctx.strokeStyle='#fff1c9';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-10,19);ctx.lineTo(10,19);ctx.stroke();
  } else if(kind==='gas') {
    ctx.beginPath();ctx.moveTo(0,-42);ctx.bezierCurveTo(8,-20,26,-10,23,11);ctx.bezierCurveTo(21,31,8,41,-5,38);ctx.bezierCurveTo(-25,34,-30,15,-18,-3);ctx.bezierCurveTo(-15,-12,-7,-19,-8,-30);ctx.bezierCurveTo(2,-20,3,-12,2,-6);ctx.bezierCurveTo(11,-18,7,-31,0,-42);ctx.closePath();ctx.fill();ctx.stroke();
  } else {
    ctx.lineCap='round';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(0,-35);ctx.lineTo(0,31);ctx.moveTo(-24,-23);ctx.lineTo(24,-23);ctx.moveTo(-20,4);ctx.lineTo(20,4);ctx.moveTo(-25,31);ctx.lineTo(25,31);ctx.stroke();
    ctx.beginPath();ctx.arc(0,-35,6,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();return ctx.getImageData(0,0,96,96);
}
function installLayers(state) {
  const map=state.map;if(!map?.getStyle?.())return false;
  try {
    if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'geojson',data:state.collection,buffer:64,maxzoom:14,
      attribution:'USGS · BGS/NSTA · NOAA · WPdx · OpenStreetMap contributors'});
    const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer)};
    add(HALO_ID,{id:HALO_ID,type:'circle',source:SOURCE_ID,minzoom:0,maxzoom:15,
      paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,2.3,3,4,7,6.5,12,8],
        'circle-color':['get','markerColor'],'circle-opacity':0.34,'circle-blur':0.65}});
    add(MARKER_ID,{id:MARKER_ID,type:'circle',source:SOURCE_ID,minzoom:0,maxzoom:24,
      paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,1.3,3,2.5,7,3.8,12,5],
        'circle-color':['get','markerColor'],'circle-stroke-color':['case',['get','sealed'],'#f5f7fa','#08202a'],
        'circle-stroke-width':['case',['get','sealed'],2,1.15],'circle-opacity':0.98}});
    for(const kind of ['water','oil','gas','geothermal','drillhole']){
      const id='bp-subsurface-icon-'+kind+'-v1';
      if(!map.hasImage?.(id))map.addImage(id,makeIcon(kind),{pixelRatio:2});
    }
    add(ICON_ID,{id:ICON_ID,type:'symbol',source:SOURCE_ID,minzoom:0,maxzoom:24,
      layout:{'icon-image':['match',['get','assetIcon'],'water','bp-subsurface-icon-water-v1',
        'oil','bp-subsurface-icon-oil-v1','gas','bp-subsurface-icon-gas-v1',
        'geothermal','bp-subsurface-icon-geothermal-v1','bp-subsurface-icon-drillhole-v1'],
        'icon-size':['interpolate',['linear'],['zoom'],0,0.14,2,0.24,5,0.42,9,0.57,13,0.66],
        'icon-anchor':'center','icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport',
        'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-padding':0},
      paint:{'icon-opacity':1}});
    add(DEPTH_LABEL_ID,{id:DEPTH_LABEL_ID,type:'symbol',source:SOURCE_ID,minzoom:MIN_DEPTH_LABEL_ZOOM,maxzoom:24,
      filter:['all',['has','depthLabel'],['!=',['get','depthLabel'],'']],
      layout:{'text-field':['get','depthLabel'],'text-font':['Open Sans Semibold','Arial Unicode MS Bold'],
        'text-size':['interpolate',['linear'],['zoom'],10,9,13,11,16,13],
        'text-offset':[0,1.6],'text-anchor':'top','text-allow-overlap':false,'text-ignore-placement':false},
      paint:{'text-color':'#f1fbff','text-halo-color':'#071522','text-halo-width':1.5,'text-halo-blur':0.2}});
    if(state.THREE)installModelLayer(state);
    setVisibility(state,state.enabled);return true;
  } catch(e){state.stats.lastError=String(e?.message||e);console.warn('BridgePoint subsurface layers unavailable',e);return false}
}
function setVisibility(state,on) {
  for(const id of [HALO_ID,MARKER_ID,ICON_ID,DEPTH_LABEL_ID,MODEL_ID]) {
    try{if(state.map.getLayer(id))state.map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}
  }
}
function modelMatrixFor(map,THREE,coordinate,altitude) {
  try {
    const raw=map.transform&&typeof map.transform.getMatrixForModel==='function'
      ?map.transform.getMatrixForModel([Number(coordinate[0]),Number(coordinate[1])],Number(altitude)||0):null;
    if(raw&&raw.length>=16)return new THREE.Matrix4().fromArray(raw);
    const Mercator=window.maplibregl&&window.maplibregl.MercatorCoordinate;
    if(!Mercator?.fromLngLat)return null;
    const mc=Mercator.fromLngLat([Number(coordinate[0]),Number(coordinate[1])],Number(altitude)||0);
    const metres=mc.meterInMercatorCoordinateUnits();
    if(![mc.x,mc.y,mc.z,metres].every(Number.isFinite)||metres<=0)return null;
    return new THREE.Matrix4().set(metres,0,0,mc.x,0,0,metres,mc.y,0,metres,0,mc.z,0,0,0,1);
  } catch(_){return null}
}
function addWellModel(THREE,feature) {
  const p=feature.properties||{};
  const exact=p.depthKnown?clamp(p.depthM,1,50000):null;
  const depth=exact||18;
  const root=new THREE.Group();root.name='BridgePoint subsurface '+p.kind+' '+p.name;
  const color=p.kind==='oil'?0xd9a74c:p.kind==='gas'?0xf28a45:p.kind==='water'?0x35b8e8:p.kind==='geothermal'?0xb18be8:0x7acdb2;
  const casing=new THREE.MeshStandardMaterial({color,roughness:0.42,metalness:0.68});
  const inner=new THREE.MeshStandardMaterial({color:0x172e3a,roughness:0.72,metalness:0.36});
  const collar=new THREE.MeshStandardMaterial({color:0xc9d9df,roughness:0.48,metalness:0.58});
  const cap=new THREE.MeshStandardMaterial({color:0xe2e6eb,roughness:0.45,metalness:0.68});
  const shaft=new THREE.Mesh(new THREE.CylinderGeometry(0.95,0.95,depth,10,1,true),casing);
  shaft.position.y=-depth/2;shaft.frustumCulled=false;root.add(shaft);
  const bore=new THREE.Mesh(new THREE.CylinderGeometry(0.42,0.42,Math.max(1,depth-0.3),8,1,true),inner);
  bore.position.y=-depth/2;bore.frustumCulled=false;root.add(bore);
  const top=new THREE.Mesh(new THREE.CylinderGeometry(1.55,1.55,1.1,12),collar);
  top.position.y=0.35;root.add(top);
  const flange=new THREE.Mesh(new THREE.CylinderGeometry(2.0,2.0,0.22,16),collar);
  flange.position.y=1.0;root.add(flange);
  if(p.sealed) {
    const plug=new THREE.Mesh(new THREE.CylinderGeometry(1.35,1.35,1.3,12),cap);
    plug.position.y=1.7;root.add(plug);
    const seal=new THREE.Mesh(new THREE.BoxGeometry(4.6,0.24,0.5),cap);
    seal.position.y=2.45;root.add(seal);
  } else {
    const valve=new THREE.Mesh(new THREE.TorusGeometry(0.9,0.14,7,18),collar);
    valve.rotation.x=Math.PI/2;valve.position.y=1.68;root.add(valve);
  }
  for(let y=-Math.min(depth,300);y>-depth;y-=Math.max(80,Math.min(600,depth/5))) {
    const band=new THREE.Mesh(new THREE.TorusGeometry(0.98,0.08,5,12),collar);
    band.rotation.x=Math.PI/2;band.position.y=y;root.add(band);
  }
  // Underground geometry intentionally renders through the terrain surface so the bore path remains inspectable at every camera pitch.
  // The bore/casing sections are visual collars only; they are not asserted lithology boundaries.
  root.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.renderOrder=1000;for(const m of Array.isArray(o.material)?o.material:[o.material]){m.depthTest=false;m.depthWrite=false}}});
  return {root,coordinate:feature.geometry.coordinates,groundElevationM:p.surfaceElevationM,kind:p.kind};
}
function disposeObject(root) {
  if(!root)return;root.traverse(o=>{
    o.geometry?.dispose?.();
    if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose?.();
  });
}
function withinBounds(bounds,coord) {
  try{return bounds&&bounds.contains(coord)}catch(_){return false}
}
function modelCandidates(state) {
  if(Number(state.map.getZoom()||0)<MIN_MODEL_ZOOM)return [];
  const bounds=state.map.getBounds?.(),center=state.map.getCenter?.();
  if(!bounds||!center)return [];
  const rows=[];
  for(const f of state.collection.features) {
    if(!withinBounds(bounds,f.geometry.coordinates))continue;
    const p=f.properties||{};
    const cos=Math.max(0.12,Math.cos(f.geometry.coordinates[1]*RAD));
    const dx=(f.geometry.coordinates[0]-center.lng)*111320*cos;
    const dy=(f.geometry.coordinates[1]-center.lat)*110540;
    rows.push({f,d:dx*dx+dy*dy});
  }
  rows.sort((a,b)=>a.d-b.d);
  return rows.slice(0,MAX_MODELS).map(x=>x.f);
}
function rebuildModels(state) {
  if(!state.THREE||!state.scene||state.dead)return;
  const rows=modelCandidates(state),signature=rows.map(x=>x.id).join('|');
  if(signature===state.modelSignature)return;
  for(const item of state.models){state.scene.remove(item.root);disposeObject(item.root)}
  state.models=[];state.modelSignature=signature;
  for(const f of rows) {
    try {const item=addWellModel(state.THREE,f);state.scene.add(item.root);state.models.push(item)}
    catch(e){console.warn('BridgePoint subsurface model skipped',f.id,e)}
  }
  state.stats.models=state.models.length;
}
function installModelLayer(state) {
  const map=state.map;if(map.getLayer(MODEL_ID)||state.layerInstalling)return;
  state.layerInstalling=true;const THREE=state.THREE;
  const layer={
    id:MODEL_ID,type:'custom',renderingMode:'3d',
    onAdd(mapRef,gl) {
      if(state.renderer)return;
      const renderer=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
      renderer.autoClear=false;renderer.outputColorSpace=THREE.SRGBColorSpace;
      state.renderer=renderer;state.camera=new THREE.Camera();state.scene=new THREE.Scene();
      state.scene.add(new THREE.AmbientLight(0xffffff,1.45));
      const key=new THREE.DirectionalLight(0xfff3da,1.25);key.position.set(-0.6,1.5,0.9);state.scene.add(key);
      state.stats.layerReady=true;rebuildModels(state);
    },
    render(gl,args) {
      if(!state.enabled||!state.renderer||!state.scene||!state.camera)return;
      const raw=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);
      if(!raw||raw.length<16)return;
      const projection=new THREE.Matrix4().fromArray(raw);
      const zoom=Number(map.getZoom()||0);
      for(const item of state.models)item.root.visible=false;
      if(zoom>=MIN_MODEL_ZOOM)for(const item of state.models) {
        let terrainElevation=null;
        if(!Number.isFinite(item.groundElevationM)) {
          try {
            const terrain=map.queryTerrainElevation?.({lng:item.coordinate[0],lat:item.coordinate[1]},{exaggerated:false});
            terrainElevation=Number.isFinite(terrain)?terrain:null;
            if(terrainElevation!==null)item.groundElevationM=terrainElevation;
          } catch(_){}
        }
        const altitude=resolveWellGroundElevation(item.groundElevationM,terrainElevation);
        const matrix=modelMatrixFor(map,THREE,item.coordinate,altitude);
        if(!matrix)continue;
        item.root.visible=true;state.camera.projectionMatrix.copy(projection).multiply(matrix);
        try{state.renderer.resetState();state.renderer.render(state.scene,state.camera)}
        catch(e){if(!state.renderWarned){state.renderWarned=true;console.warn('BridgePoint subsurface 3D renderer',e)}}
        finally{item.root.visible=false}
      }
    }
  };
  try{map.addLayer(layer);state.stats.layerReady=!!map.getLayer(MODEL_ID)}
  catch(e){state.stats.lastError=String(e?.message||e);console.warn('BridgePoint subsurface model layer',e)}
  finally{state.layerInstalling=false}
}
function loadThree() {
  if(!threePromise)threePromise=import(THREE_URL).then(m=>m.default||m);
  return threePromise;
}
function safe(value) {
  return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function link(label,url) {
  return url?'<a href="'+safe(url)+'" target="_blank" rel="noopener noreferrer">'+safe(label)+'</a>':safe(label);
}
export function subsurfacePopupHtml(feature) {
  const p=feature.properties||{},c=feature.geometry.coordinates;
  const depth=p.depthKnown?safe(p.depthM.toLocaleString('en-US',{maximumFractionDigits:2})+' m · '+p.depthType):'Not reported by this source';
  const status=p.sealed?'SEALED / CAPPED / ABANDONED':safe(p.status||'Not reported');
  const rows=[
    ['Asset type',p.kind],['Well / borehole',p.recordClass||'Not classified'],
    ['Source-reported depth',depth],['Status',status],['Aquifer / formation',p.aquifer||p.lithologyNote||'Not included in the summary record'],
    ['Operator / owner',p.operator||p.owner||'Not supplied'],['Country / region',[p.country,p.region].filter(Boolean).join(' · ')||'Not supplied'],
    ['Record ID',p.recordId||p.key],['Date',p.year||p.installDate||'Not supplied'],
    ['Coordinates',c[1].toFixed(6)+', '+c[0].toFixed(6)],['Source',p.sourceName||'Not identified']
  ];
  return '<article class="bp-subsurface-popup-v1"><div class="bp-subsurface-kicker-v1">BRIDGEPOINT SUBSURFACE INTELLIGENCE · '+safe(p.kind||'well').toUpperCase()+'</div>'+
    '<h3>'+safe(p.name||'Subsurface record')+'</h3><div class="bp-subsurface-grid-v1">'+rows.map(r=>'<span>'+safe(r[0])+'</span><b>'+safe(r[1])+'</b>').join('')+'</div>'+
    '<p class="bp-subsurface-note-v1">'+safe(p.depthNote||'Depth is source-reported only when a numeric value is shown.')+'</p>'+
    '<p class="bp-subsurface-note-v1">The 3D casing/bore diameter is intentionally exaggerated for visibility and is not a surveyed diameter. Vertical shaft length follows the source-reported numeric depth when available. A short schematic stub is used when depth is not reported.</p>'+
    '<div class="bp-subsurface-links-v1">'+link('Open source collection',p.sourceUrl)+' · '+link('Open source record / log',p.detailsUrl)+'</div></article>';
}
function setStatus(state,message) {
  state.status=message;
  const status=document.getElementById('bp-subsurface-wells-status-v1');if(status)status.textContent=message;
  const count=document.getElementById('bp-subsurface-wells-count-v1');
  if(count)count.textContent=state.stats.total.toLocaleString()+' records · '+state.stats.water.toLocaleString()+' water · '+state.stats.oil.toLocaleString()+' oil · '+state.stats.gas.toLocaleString()+' gas';
}
function refreshStatusUi(state) {
  const status=document.getElementById('bp-subsurface-wells-status-v1');if(status)status.textContent=state.status;
  const count=document.getElementById('bp-subsurface-wells-count-v1');
  if(count)count.textContent=state.stats.total.toLocaleString()+' records · '+state.stats.water.toLocaleString()+' water · '+state.stats.oil.toLocaleString()+' oil · '+state.stats.gas.toLocaleString()+' gas';
  const b=document.getElementById('bp-subsurface-wells-toggle-v1');
  if(b){b.setAttribute('aria-pressed',String(state.enabled));b.classList.toggle('is-active',state.enabled)}
}
function bindInteractions(state) {
  if(state.interactionsBound)return;state.interactionsBound=true;
  const map=state.map;
  map.on('click',e=>{
    if(!state.enabled)return;
    const ids=[DEPTH_LABEL_ID,ICON_ID,MARKER_ID].filter(id=>map.getLayer(id));
    const hits=map.queryRenderedFeatures?.(e.point,{layers:ids})||[];
    const feature=hits.find(f=>f.properties?.key);
    if(!feature)return;
    if(state.popup)state.popup.remove();
    const Popup=window.maplibregl?.Popup;
    if(Popup)state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'380px',className:'bp-subsurface-popup-wrap-v1'})
      .setLngLat(feature.geometry.coordinates||e.lngLat).setHTML(subsurfacePopupHtml(feature)).addTo(map);
  });
  map.on('moveend',()=>{
    if(!state.enabled)return;
    rebuildModels(state);if(state.renderer)map.triggerRepaint?.();
    void loadRegionalData(state);
  });
  map.on('zoomend',()=>{if(state.enabled){rebuildModels(state);if(state.renderer)map.triggerRepaint?.()}});
}
function addControlGroup(state) {
  const dock=document.getElementById('bpv-dock-actions');if(!dock)return false;
  if(document.getElementById('bp-subsurface-wells-control-v1'))return true;
  const group=document.createElement('section');
  group.id='bp-subsurface-wells-control-v1';group.className='bpv-command-group';
  group.setAttribute('data-bpv-command-section','subsurface-wells');
  group.setAttribute('aria-label','Global subsurface wells, boreholes and aquifers');
  group.innerHTML=
    '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">⛏️</span>'+
    '<span><b>SUBSURFACE WELLS</b><small>Global water wells, aquifers, lithology boreholes, oil and gas drill holes</small></span></div>'+
    '<div class="bpv-command-grid"><button id="bp-subsurface-wells-toggle-v1" type="button" class="bpv-command-btn" aria-pressed="false" title="Toggle global subsurface wells and 3D boreholes">'+
    '<span class="bpv-command-icon" aria-hidden="true">🕳️</span><span class="bpv-command-label">Subsurface Wells</span></button></div>'+
    '<div id="bp-subsurface-wells-count-v1" class="bpv-data-note">Not loaded · toggle on to load global records</div>'+
    '<div id="bp-subsurface-wells-status-v1" class="bpv-data-note">Layer off · all existing BridgePoint layers remain unchanged</div>'+
    '<style id="bp-subsurface-wells-style-v1">'+
    '#bp-subsurface-wells-control-v1 .bpv-data-note{font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere}'+
    '#bp-subsurface-wells-toggle-v1.is-active{border-color:rgba(90,220,240,.72);background:rgba(17,79,91,.56);box-shadow:inset 0 0 0 1px rgba(90,220,240,.2)}'+
    '.bp-subsurface-popup-wrap-v1 .maplibregl-popup-content{background:#071522;color:#e6f6fb;border:1px solid rgba(100,220,245,.35);border-radius:12px;padding:13px;font:12px/1.45 system-ui,sans-serif;max-height:min(72vh,620px);overflow:auto}'+
    '.bp-subsurface-popup-v1 h3{font-size:16px;margin:3px 0 10px;color:#fff}.bp-subsurface-kicker-v1{font-size:9px;letter-spacing:.12em;color:#6edcf4;font-weight:800}'+
    '.bp-subsurface-grid-v1{display:grid;grid-template-columns:112px minmax(0,1fr);gap:5px 9px}.bp-subsurface-grid-v1 span{color:#91adbb}.bp-subsurface-grid-v1 b{overflow-wrap:anywhere;color:#f3fbff}'+
    '.bp-subsurface-note-v1,.bp-subsurface-links-v1{border-top:1px solid rgba(160,210,225,.16);padding-top:8px;margin:9px 0 0;color:#b6ccd6}.bp-subsurface-links-v1 a{color:#63d9f4;text-decoration:underline;margin-right:3px}'+
    '</style>';
  const offshore=document.getElementById('bp-offshore-energy-control-v1');
  if(offshore&&offshore.parentNode===dock)offshore.after(group);else dock.appendChild(group);
  group.querySelector('#bp-subsurface-wells-toggle-v1').addEventListener('click',()=>{void setEnabled(state,!state.enabled)});
  refreshStatusUi(state);return true;
}
async function loadInitialData(state) {
  if(state.loading||state.dead||state.globalLoaded||!state.enabled)return;
  state.loading=true;setStatus(state,'Loading USGS, BGS, NOAA, WPdx and global mapped borehole records…');
  const tasks=await Promise.allSettled([
    fetchUsGsWells(),fetchBgsOffshoreWells(),fetchNoaaWells(),fetchWpdxWells(10000),fetchOsmWells()
  ]);
  if(state.dead){state.loading=false;return}
  const labels=['USGS groundwater','BGS offshore wells','NOAA oil/gas wells','WPdx global water wells','OpenStreetMap global wells'];
  const counts={};
  const features=[];
  for(let i=0;i<tasks.length;i++){
    const t=tasks[i];
    if(t.status==='fulfilled'){features.push(...t.value);counts[labels[i]]=t.value.length}
    else {counts[labels[i]]=0;console.warn('BridgePoint subsurface source unavailable: '+labels[i],t.reason)}
  }
  addFeatures(state,features);
  state.globalLoaded=true;state.lastUpdated=Date.now();state.loading=false;
  const active=Object.entries(counts).filter(x=>x[1]>0).map(x=>x[0]+' '+x[1].toLocaleString());
  const failed=Object.entries(counts).filter(x=>x[1]===0).map(x=>x[0]);
  setStatus(state,state.stats.total.toLocaleString()+' global well records loaded · '+active.join(' · ')+(failed.length?' · unavailable: '+failed.join(', '):''));
  refreshStatusUi(state);
  void loadRegionalData(state);
}
async function loadRegionalData(state) {
  if(state.regionalLoading||!state.enabled||state.dead||Number(state.map.getZoom()||0)<3.2)return;
  const b=state.map.getBounds?.();if(!b)return;
  const bbox=[b.getWest(),b.getSouth(),b.getEast(),b.getNorth()].map((x,i)=>Number(clamp(x,i===0?-180:i===1?-85:i===2?-180:-85,i===0?180:i===1?85:i===2?180:85).toFixed(3)));
  if(!bbox.every(Number.isFinite)||bbox[0]>=bbox[2]||bbox[1]>=bbox[3])return;
  const key=bbox.map(x=>x.toFixed(1)).join(',');
  if(state.loadedRegions.has(key))return;
  state.loadedRegions.add(key);state.regionalLoading=true;
  const tasks=[];
  if(isUsBounds(bbox))tasks.push(fetchUsGsWells(bbox.join(','),1800));
  if(isGreatBritainBounds(bbox))tasks.push(fetchBgsOnshoreBoreholes(bbox));
  tasks.push(fetchWpdxWells(2500,bbox).catch(e=>{throw e}));
  const results=await Promise.allSettled(tasks);
  if(state.dead){state.regionalLoading=false;return}
  const rows=results.filter(x=>x.status==='fulfilled').flatMap(x=>x.value);
  if(rows.length){addFeatures(state,rows);setStatus(state,state.status+' · local area enriched '+rows.length.toLocaleString())}
  state.regionalLoading=false;refreshStatusUi(state);
}
async function setEnabled(state,on) {
  state.enabled=!!on;setVisibility(state,state.enabled);
  if(state.enabled){
    installLayers(state);bindInteractions(state);refreshStatusUi(state);
    if(state.THREE)installModelLayer(state);
    else if(!state.threeLoading){
      state.threeLoading=true;
      loadThree().then(THREE=>{if(state.dead)return;state.THREE=THREE;state.threeLoading=false;if(state.enabled&&state.map.getStyle?.())installModelLayer(state);rebuildModels(state);state.map.triggerRepaint?.()})
        .catch(e=>{state.threeLoading=false;setStatus(state,'3D borehole renderer unavailable: '+String(e?.message||e));console.warn('BridgePoint subsurface Three.js unavailable',e)});
    }
    void loadInitialData(state);
  } else {
    if(state.popup){state.popup.remove();state.popup=null}
    for(const item of state.models)item.root.visible=false;
    setStatus(state,'Layer off · every other BridgePoint layer remains unchanged');
    if(state.renderer)state.map.triggerRepaint?.();
  }
  refreshStatusUi(state);return state.enabled;
}
function install(map,state) {
  if(!map?.getStyle?.())return;
  if(!installLayers(state))return;
  if(state.enabled){bindInteractions(state);if(!state.globalLoaded)void loadInitialData(state)}
  else bindInteractions(state);
}
export function initSubsurfaceWellsRenderer(target) {
  const map=target&&(target.map||target);
  if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
  const existing=MAP_STATES.get(map);if(existing)return existing.api;
  const state={
    map,enabled:false,dead:false,loading:false,globalLoaded:false,regionalLoading:false,
    THREE:null,threeLoading:false,layerInstalling:false,scene:null,camera:null,renderer:null,models:[],modelSignature:'',
    featureCache:new Map(),collection:EMPTY,popup:null,interactionsBound:false,loadedRegions:new Set(),
    status:'off',lastUpdated:null,stats:{version:VERSION,total:0,water:0,oil:0,gas:0,drillholes:0,models:0,layerReady:false,lastError:null}
  };
  const api={
    version:VERSION,get enabled(){return state.enabled},get status(){return state.status},
    get stats(){return Object.assign({},state.stats)},get features(){return state.collection.features.length},
    get displayMode(){return Number(map.getZoom()||0)>=MIN_MODEL_ZOOM?'3d-boreholes':'global-source-icons'},
    toggle(){return setEnabled(state,!state.enabled)},setEnabled(on){return setEnabled(state,on)},
    refresh(){state.globalLoaded=false;state.loadedRegions.clear();return loadInitialData(state)},
    destroy(){state.dead=true;if(state.popup)state.popup.remove();for(const item of state.models){state.scene?.remove(item.root);disposeObject(item.root)}state.models=[]}
  };
  state.api=api;MAP_STATES.set(map,state);window.__BP_SUBSURFACE_WELLS_V1__=api;
  const ready=()=>install(map,state);map.on('style.load',ready);map.on('load',ready);if(map.isStyleLoaded?.())ready();
  const observeDock=()=>{if(addControlGroup(state))return;setTimeout(observeDock,500)};
  observeDock();
  const observer=new MutationObserver(()=>{if(!document.getElementById('bp-subsurface-wells-control-v1'))addControlGroup(state)});
  if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  return api;
}
