/* BridgePoint Solar Fields v1.
 * Independent, opt-in utility-scale PV field layer.
 * USPVDB supplies US ground-mounted PV array boundaries and engineering attributes.
 * OpenStreetMap plant:source=solar supplies worldwide plant-scale discovery records.
 * Panel-rack height is illustrative unless a source explicitly supplies it.
 */
const VERSION = 1;
const MAP_STATES = new WeakMap();
let threePromise = null;
const THREE_URL = '/vendor/three.module.js?v=169-local';
const USPVDB_QUERY = 'https://energy.usgs.gov/arcgis/rest/services/Hosted/uspvdbDyn/FeatureServer/0/query';
const USPVDB_SOURCE = 'https://energy.usgs.gov/uspvdb/';
const USPVDB_LAYER = 'https://energy.usgs.gov/arcgis/rest/services/Hosted/uspvdbDyn/FeatureServer/0';
const USPVDB_SOURCE_NOTE = 'USGS and Lawrence Berkeley National Laboratory · USPVDB v4.0 (April 2026)';
const SOLAR_SNAPSHOT_URL = 'https://solarworldmap.com/data/solar.json.gz';
const SOLAR_META_URL = 'https://solarworldmap.com/data/solar-meta.json';
const OSM_SOURCE = 'https://www.openstreetmap.org/copyright';
const OSM_EDIT_URL = 'https://www.openstreetmap.org/';
const OVERPASS_ENDPOINTS = [
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
  'https://overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
const SOURCE_ID = 'bp-solar-fields-source-v1';
const CLUSTER_ID = 'bp-solar-fields-clusters-v1';
const CLUSTER_ICON_ID = 'bp-solar-fields-cluster-icons-v1';
const CLUSTER_COUNT_ID = 'bp-solar-fields-cluster-count-v1';
const MARKER_ID = 'bp-solar-fields-markers-v1';
const HALO_ID = 'bp-solar-fields-halo-v1';
const FOOTPRINT_SOURCE_ID = 'bp-solar-fields-footprints-source-v1';
const FOOTPRINT_ID = 'bp-solar-fields-footprints-v1';
const FOOTPRINT_LINE_ID = 'bp-solar-fields-footprint-lines-v1';
const MODEL_ID = 'bp-solar-fields-models-v1';
const MIN_FOOTPRINT_ZOOM = 8.7;
const MIN_MODEL_ZOOM = 11.4;
const MAX_GLOBAL_OSM = 12000;
const MAX_LOCAL_OSM = 3000;
const MAX_MODEL_SITES = typeof window !== 'undefined' &&
  ((Number(window.innerWidth) || 1024) <= 820 ||
   (typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints) > 0)) ? 7 : 16;
const MAX_PANEL_TABLES = typeof window !== 'undefined' &&
  ((Number(window.innerWidth) || 1024) <= 820 ||
   (typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints) > 0)) ? 280 : 650;
const RAD = Math.PI / 180;
const EMPTY = { type:'FeatureCollection', features:[] };

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function positive(value, max = 1e12) {
  const n = finite(value);
  return n !== null && n > 0 && n <= max ? n : null;
}
function safe(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function textValue(value, fallback = '') {
  const s = String(value === null || value === undefined ? '' : value).trim();
  return s ? s.slice(0, 220) : fallback;
}
function formatNumber(value, digits = 1) {
  const n = finite(value);
  return n === null ? 'Not reported' : n.toLocaleString('en-US',{maximumFractionDigits:digits});
}
function parseCapacityMW(value) {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim().toLowerCase().replace(/,/g,'');
  if (!s || /^(yes|unknown|unspecified|n\/a)$/.test(s)) return null;
  const m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*(mw|kw|gw)?/);
  if (!m) return null;
  const n = Number(m[1]);
  const unit = m[2] || 'mw';
  const mw = unit === 'kw' ? n / 1000 : unit === 'gw' ? n * 1000 : n;
  return Number.isFinite(mw) && mw > 0 && mw <= 1000000 ? mw : null;
}
function normalizeMethod(value) {
  const s = String(value || '').trim().toLowerCase().replace(/[_-]+/g,' ');
  if (/thermal|concentrat|trough|tower|fresnel|csp/.test(s)) return 'solar-thermal';
  if (/photo.?voltaic|\bpv\b/.test(s)) return 'photovoltaic';
  return s ? s.slice(0,80) : 'not reported';
}
function ringIsClosed(ring) {
  if (!Array.isArray(ring) || ring.length < 4) return false;
  const a = ring[0], b = ring[ring.length-1];
  return Array.isArray(a) && Array.isArray(b) &&
    Math.abs(Number(a[0])-Number(b[0])) < 1e-8 &&
    Math.abs(Number(a[1])-Number(b[1])) < 1e-8;
}
function geometryRings(geometry) {
  if (!geometry || !geometry.coordinates) return [];
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] :
    geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
  const rings = [];
  for (const polygon of polygons) {
    const ring = polygon && polygon[0];
    if (!Array.isArray(ring) || ring.length < 4) continue;
    const clean = ring.map(c=>[Number(c[0]),Number(c[1])])
      .filter(c=>c.every(Number.isFinite) && Math.abs(c[0])<=180 && Math.abs(c[1])<=85);
    if (clean.length < 4) continue;
    if (!ringIsClosed(clean)) clean.push(clean[0].slice());
    rings.push(clean);
  }
  return rings;
}
function geometryCentroid(geometry) {
  const rings = geometryRings(geometry);
  if (!rings.length) return null;
  let x=0,y=0,n=0;
  for (const ring of rings) for (let i=0;i<ring.length-1;i++) {
    x+=ring[i][0];y+=ring[i][1];n++;
  }
  if (!n) return null;
  const point=[x/n,y/n];
  return point.every(Number.isFinite) ? point : null;
}
function geometryAreaM2(geometry) {
  const rings = geometryRings(geometry);
  if (!rings.length) return null;
  const center = geometryCentroid(geometry);
  const cos = Math.max(0.05,Math.cos(center[1]*RAD));
  let sum=0;
  for (const ring of rings) {
    let a=0;
    for (let i=0;i<ring.length-1;i++) {
      const x1=(ring[i][0]-center[0])*111320*cos;
      const z1=(ring[i][1]-center[1])*110540;
      const x2=(ring[i+1][0]-center[0])*111320*cos;
      const z2=(ring[i+1][1]-center[1])*110540;
      a+=x1*z2-x2*z1;
    }
    sum+=Math.abs(a)*0.5;
  }
  return sum>0 && Number.isFinite(sum) ? sum : null;
}
function geometryDimensionsM(geometry) {
  const rings=geometryRings(geometry),center=geometryCentroid(geometry);
  if (!rings.length || !center) return null;
  const cos=Math.max(0.05,Math.cos(center[1]*RAD));
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for (const ring of rings) for (const c of ring) {
    const x=(c[0]-center[0])*111320*cos;
    const z=(c[1]-center[1])*110540;
    minX=Math.min(minX,x);maxX=Math.max(maxX,x);minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
  }
  if (![minX,maxX,minZ,maxZ].every(Number.isFinite)) return null;
  return {lengthM:Math.max(maxX-minX,maxZ-minZ),widthM:Math.min(maxX-minX,maxZ-minZ),
    eastWestM:maxX-minX,northSouthM:maxZ-minZ};
}
function featureGeometry(feature) {
  return feature && feature.geometry &&
    (feature.geometry.type==='Polygon'||feature.geometry.type==='MultiPolygon')
      ? feature.geometry : null;
}

export function normalizeUspvdbFeature(feature) {
  if (!feature || feature.type!=='Feature') return null;
  const p=feature.properties||{};
  const system=String(p.p_sys_type||'').trim().toLowerCase();
  const technology=String(p.p_tech_pri||'').trim().toLowerCase();
  if (system!=='ground') return null;
  if (!(technology==='pv'||technology==='photovoltaic'||technology==='photovoltaics')) return null;
  const geometry=featureGeometry(feature);
  const sourceCenter=[finite(p.xlong),finite(p.ylat)];
  const center=sourceCenter.every(Number.isFinite)?sourceCenter:geometryCentroid(geometry);
  if (!center || center.length!==2 || !center.every(Number.isFinite) ||
      Math.abs(center[0])>180 || Math.abs(center[1])>85) return null;
  const id=textValue(p.case_id||p.objectid||feature.id,'');
  if (!id) return null;
  const areaM2=positive(p.p_area) || geometryAreaM2(geometry);
  const dims=geometryDimensionsM(geometry);
  const tilt=finite(p.p_tilt),azimuth=finite(p.p_azimuth);
  return {
    type:'Feature',id:'uspvdb:'+id,geometry:{type:'Point',coordinates:center},
    properties:{
      key:'uspvdb:'+id,source:'USPVDB',sourceName:USPVDB_SOURCE_NOTE,
      sourceUrl:USPVDB_SOURCE,recordId:id,name:textValue(p.p_name,'Unnamed ground-mounted PV facility'),
      operator:textValue(p.p_operator||p.operator,'Not reported'),
      method:'photovoltaic',methodLabel:'Photovoltaic (PV)',
      systemType:'ground-mounted',status:'USPVDB record; operating status not separately reported',year:finite(p.p_year),
      state:textValue(p.p_state,''),county:textValue(p.p_county,''),
      capacityAcMW:positive(p.p_cap_ac),capacityDcMW:positive(p.p_cap_dc),
      areaM2:areaM2,areaSource:positive(p.p_area)?'USPVDB reported area':'Calculated from mapped array boundary',
      tiltDeg:tilt!==null&&tilt>=0&&tilt<=90?tilt:null,
      azimuthDeg:azimuth!==null&&azimuth>=0&&azimuth<=360?azimuth:null,
      digitizationConfidence:finite(p.p_dig_conf),imageryDate:textValue(p.p_img_date,''),
      arrayAxis:textValue(p.p_axis,''),siteType:textValue(p.p_type,''),
      community:textValue(p.p_comm,''),agrivoltaic:textValue(p.p_agrivolt,''),
      locationAccuracy:'USPVDB array boundary digitized from imagery; confidence score supplied',
      modelGeometry:geometry,modelSource:'USPVDB polygon',
      modelAreaM2:areaM2,modelDimensions:dims,
      panelTiltSource:tilt!==null?'USPVDB reported':'Illustrative default',
      panelAzimuthSource:azimuth!==null?'USPVDB reported':'Illustrative default',
      rackHeightM:null,modelPhotovoltaic:true,markerColor:'#f3cf68'
    }
  };
}
export function normalizeSolarOsmElement(element) {
  if (!element || !element.tags) return null;
  const tags=element.tags;
  if (String(tags['plant:source']||'').trim().toLowerCase()!=='solar') return null;
  const method=normalizeMethod(tags['plant:method']||tags.method||'');
  if (method==='solar-thermal') return null;
  const type=String(element.type||'osm'),osmId=textValue(element.id,'');
  if (!osmId) return null;
  let modelGeometry=null,coordinate=null;
  const geometry=Array.isArray(element.geometry)?element.geometry:[];
  if (geometry.length>=4) {
    let ring=geometry.map(x=>[Number(x.lon),Number(x.lat)])
      .filter(x=>x.every(Number.isFinite)&&Math.abs(x[0])<=180&&Math.abs(x[1])<=85);
    if (ring.length>=4) {
      if (!ringIsClosed(ring)) ring.push(ring[0].slice());
      modelGeometry={type:'Polygon',coordinates:[ring]};
      coordinate=geometryCentroid(modelGeometry);
    }
  }
  if (!coordinate && Array.isArray(element.members)) {
    const member=element.members.find(m=>(!m.role||m.role==='outer')&&Array.isArray(m.geometry)&&m.geometry.length>=4);
    if (member) {
      let ring=member.geometry.map(x=>[Number(x.lon),Number(x.lat)])
        .filter(x=>x.every(Number.isFinite)&&Math.abs(x[0])<=180&&Math.abs(x[1])<=85);
      if (ring.length>=4) {
        if (!ringIsClosed(ring)) ring.push(ring[0].slice());
        modelGeometry={type:'Polygon',coordinates:[ring]};
        coordinate=geometryCentroid(modelGeometry);
      }
    }
  }
  if (!coordinate && Number.isFinite(Number(element.lon)) && Number.isFinite(Number(element.lat))) {
    coordinate=[Number(element.lon),Number(element.lat)];
  }
  if (!coordinate && element.center && Number.isFinite(Number(element.center.lon)) &&
      Number.isFinite(Number(element.center.lat))) coordinate=[Number(element.center.lon),Number(element.center.lat)];
  if (!coordinate || !coordinate.every(Number.isFinite) || Math.abs(coordinate[0])>180 || Math.abs(coordinate[1])>85) return null;
  const output=tags['plant:output:electricity']||tags['generator:output:electricity'];
  const start=textValue(tags.start_date||tags['plant:start_date'],'');
  const capacity=parseCapacityMW(output);
  const areaM2=geometryAreaM2(modelGeometry);
  const dims=geometryDimensionsM(modelGeometry);
  const name=textValue(tags.name||tags['name:en']||tags.operator,'Unnamed solar field');
  return {
    type:'Feature',id:'osm:'+type+'/'+osmId,geometry:{type:'Point',coordinates:coordinate},
    properties:{
      key:'osm:'+type+'/'+osmId,source:'OSM',sourceName:'OpenStreetMap contributors',
      sourceUrl:'https://www.openstreetmap.org/'+type+'/'+osmId,
      recordId:type+'/'+osmId,name:name,operator:textValue(tags.operator,'Not reported'),
      method:method==='photovoltaic'?'photovoltaic':'not reported',
      methodLabel:method==='photovoltaic'?'Photovoltaic (OSM tag)':'Solar plant · method not specified',
      systemType:'plant-scale solar field',status:textValue(tags.status||tags['plant:status'],'Not reported'),
      year:finite((start.match(/(?:19|20)\d{2}/)||[])[0]),
      capacityAcMW:capacity,capacityDcMW:null,areaM2:areaM2,
      areaSource:areaM2?'Calculated from OpenStreetMap plant boundary':'Not available',
      tiltDeg:finite(tags['plant:tilt']),azimuthDeg:finite(tags['plant:azimuth']),
      digitizationConfidence:null,imageryDate:'',arrayAxis:'',
      locationAccuracy:modelGeometry?'OSM mapped plant boundary; survey accuracy not stated':'OSM mapped plant point/center; boundary not yet returned',
      modelGeometry:modelGeometry,modelSource:modelGeometry?'OSM mapped plant polygon':'No mapped polygon available',
      modelAreaM2:areaM2,modelDimensions:dims,
      panelTiltSource:finite(tags['plant:tilt'])!==null?'OSM tagged':'Illustrative default',
      panelAzimuthSource:finite(tags['plant:azimuth'])!==null?'OSM tagged':'Illustrative default',
      rackHeightM:null,modelPhotovoltaic:method==='photovoltaic',markerColor:'#f1c967'
    }
  };
}
export function normalizeSolarWorldSnapshot(snapshot) {
  if (!snapshot || !Array.isArray(snapshot.ids) ||
      !Array.isArray(snapshot.typeCodes) || !Array.isArray(snapshot.lngs) ||
      !Array.isArray(snapshot.lats) || !Array.isArray(snapshot.tagIndexOffsets) ||
      !Array.isArray(snapshot.tagNameCodes) || !Array.isArray(snapshot.tagValueCodes) ||
      !Array.isArray(snapshot.tagNames) || !Array.isArray(snapshot.tagValueTable) ||
      !Array.isArray(snapshot.typeLegend)) {
    throw new TypeError('Global solar snapshot has an unsupported schema');
  }
  const count=snapshot.ids.length;
  if (snapshot.typeCodes.length!==count || snapshot.lngs.length!==count ||
      snapshot.lats.length!==count || snapshot.tagIndexOffsets.length!==count+1 ||
      snapshot.tagNameCodes.length!==snapshot.tagValueCodes.length ||
      snapshot.tagIndexOffsets[count]!==snapshot.tagNameCodes.length) {
    throw new TypeError('Global solar snapshot arrays have inconsistent lengths');
  }
  const features=[];
  for(let i=0;i<count;i++) {
    const tags={'plant:source':'solar'};
    const start=Number(snapshot.tagIndexOffsets[i]),end=Number(snapshot.tagIndexOffsets[i+1]);
    if(!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>snapshot.tagNameCodes.length)continue;
    for(let j=start;j<end;j++) {
      const key=snapshot.tagNames[Number(snapshot.tagNameCodes[j])];
      const value=snapshot.tagValueTable[Number(snapshot.tagValueCodes[j])];
      if(typeof key==='string'&&key&&value!==undefined&&value!==null)tags[key]=value;
    }
    const type=snapshot.typeLegend[Number(snapshot.typeCodes[i])];
    const feature=normalizeSolarOsmElement({
      type:type,id:snapshot.ids[i],lon:snapshot.lngs[i],lat:snapshot.lats[i],tags
    });
    if(feature)features.push(feature);
  }
  return features;
}

async function fetchSolarSnapshot() {
  if(typeof DecompressionStream!=='function')throw new Error('This browser does not support gzip snapshot decompression');
  const response=await fetch(SOLAR_SNAPSHOT_URL,{
    mode:'cors',credentials:'omit',cache:'default'
  });
  if(!response.ok)throw new Error('Global solar snapshot HTTP '+response.status);
  if(!response.body)throw new Error('Global solar snapshot returned no response body');
  const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
  const snapshot=await new Response(stream).json();
  const features=normalizeSolarWorldSnapshot(snapshot);
  let meta=null;
  try {
    const metaResponse=await fetch(SOLAR_META_URL,{mode:'cors',credentials:'omit',cache:'no-cache'});
    if(metaResponse.ok)meta=await metaResponse.json();
  } catch(_) {}
  return {features,meta,source:'OpenStreetMap daily global snapshot'};
}

async function fetchGlobalSolarRecords() {
  try {
    return await fetchSolarSnapshot();
  } catch(snapshotError) {
    const rows=await fetchOverpass(globalSolarOverpassQuery());
    const features=rows.map(normalizeSolarOsmElement).filter(Boolean);
    return {features,meta:null,source:'Overpass API fallback',snapshotError:String(snapshotError&&snapshotError.message||snapshotError)};
  }
}

export function solarFieldRenderModeForZoom(value) {
  const zoom=Number(value)||0;
  if (zoom<5.2) return 'global-farm-clusters';
  if (zoom<MIN_MODEL_ZOOM) return 'solar-field-icons-and-footprints';
  return 'ground-anchored-3d-solar-arrays';
}
export function solarFieldPopupHtml(feature) {
  const p=feature&&feature.properties||{};
  const c=feature&&feature.geometry&&feature.geometry.coordinates||[0,0];
  const area=positive(p.areaM2);
  const dims=p.modelDimensions||geometryDimensionsM(p.modelGeometry);
  const capacity=positive(p.capacityAcMW);
  const confidenceCode=finite(p.digitizationConfidence);
  const confidence=confidenceCode===4?'4 · High-confidence polygon':
    confidenceCode===3?'3 · Partial boundary (poor imagery)':
    confidenceCode===2?'2 · Multiple polygons; facility attributes uncertain':
    confidenceCode===1?'1 · Multiple facilities represented by one polygon':
    'Not reported';
  const position=formatNumber(c[1],6)+'°, '+formatNumber(c[0],6)+'°';
  const rows=[
    ['Facility',p.name||'Unnamed solar field'],
    ['Operator',p.operator||'Not reported'],
    ['System',p.systemType||'Plant-scale photovoltaic field'],
    ['Technology',p.methodLabel||'Photovoltaic / solar method not reported'],
    ['Status',p.status||'Not reported'],
    ['Commissioned',p.year?String(p.year):'Not reported'],
    [p.source==='USPVDB'?'AC capacity':'Reported electrical output',capacity?formatNumber(capacity,2)+' MW':'Not reported'],
    ...(p.source==='USPVDB'?[['DC capacity',positive(p.capacityDcMW)?formatNumber(p.capacityDcMW,2)+' MW':'Not reported']]:[]),
    ['Array area',area?formatNumber(area,0)+' m² ('+formatNumber(area/4046.856,2)+' acres) · '+(p.areaSource||'source/calculated'):'Not reported'],
    ['Mapped boundary dimensions',dims?formatNumber(dims.lengthM,1)+' × '+formatNumber(dims.widthM,1)+' m (polygon bounding dimensions)':'No facility polygon available'],
    ['Panel tilt',finite(p.tiltDeg)!==null?formatNumber(p.tiltDeg,1)+'°':'Not reported'],
    ['Panel azimuth',finite(p.azimuthDeg)!==null?formatNumber(p.azimuthDeg,1)+'°':'Not reported'],
    ['Source-measured panel/rack height','Not reported'],
    ['3D table footprint','14 × 3.8 m · illustrative rack/table geometry, not individual module dimensions'],
    ['3D rack center height','2.05 m above modeled ground · illustrative visual dimension, not surveyed'],

    ['3D panel-model eligibility',p.modelPhotovoltaic===false?'Not rendered · source method is not confirmed as photovoltaic':'Photovoltaic panel-table model'],
    ['Position',position],
    ['Location quality',p.locationAccuracy||'Not reported'],
    ['USPVDB digitization confidence',confidence],
    ['Imagery date',p.imageryDate||'Not reported'],
    ['State / county',[p.state,p.county].filter(Boolean).join(' · ')||'Not reported']
  ];
  const source=p.source==='USPVDB'
    ?'<a href="'+safe(USPVDB_SOURCE)+'" target="_blank" rel="noopener noreferrer">USGS / LBNL USPVDB source</a>'
    :'<a href="'+safe(p.sourceUrl||OSM_SOURCE)+'" target="_blank" rel="noopener noreferrer">OpenStreetMap source record</a>';
  const provenance=p.source==='USPVDB'
    ?'U.S. ground-mounted PV boundary. The mapped polygon is from the USGS/LBNL database; confidence and imagery date are shown when reported.'
    :'Plant-scale OpenStreetMap feature tagged plant:source=solar. It is not an individual rooftop array; tags and positional precision depend on the mapped record.';
  return '<div class="bp-solar-popup-v1">'+
    '<div class="bp-solar-kicker-v1">BRIDGEPOINT · SOLAR FIELD</div>'+
    '<h3>'+safe(p.name||'Solar field')+'</h3>'+
    '<div class="bp-solar-grid-v1">'+rows.map(r=>'<div><span>'+safe(r[0])+'</span><b>'+safe(r[1])+'</b></div>').join('')+'</div>'+
    '<p class="bp-solar-note-v1">'+safe(provenance)+'</p>'+
    (p.modelPhotovoltaic===false?'<p class="bp-solar-note-v1">3D panel tables are intentionally not drawn because this source record does not identify the technology as photovoltaic.</p>':'')+
    '<p class="bp-solar-note-v1">The measured facility boundary, source coordinates, area, capacity and orientation are shown where the source reports them. Individual panel-module sizes and actual rack heights are not published in these records; the 3D table geometry is a consistently scaled visual representation anchored to the mapped ground boundary.</p>'+
    '<div class="bp-solar-source-v1">Source: '+source+'</div>'+
    '<div class="bp-solar-coords-v1">'+safe(p.sourceName||'')+' · '+safe(p.recordId||'')+'</div>'+
    '</div>';
}
function sourceLink(url,label) {
  return '<a href="'+safe(url)+'" target="_blank" rel="noopener noreferrer">'+safe(label)+'</a>';
}
function overpassRequestUrl(endpoint,query) {
  const url=new URL(endpoint);
  url.searchParams.set('data',String(query||''));
  return url.toString();
}
function globalSolarOverpassQuery() {
  return '[out:json][timeout:40];(nwr["plant:source"="solar"];);out center tags '+MAX_GLOBAL_OSM+';';
}
function localSolarOverpassQuery(bounds) {
  const south=Math.max(-85,bounds.getSouth()),north=Math.min(85,bounds.getNorth());
  const west=Math.max(-180,bounds.getWest()),east=Math.min(180,bounds.getEast());
  return '[out:json][timeout:35];(nwr["plant:source"="solar"]('+south.toFixed(5)+','+west.toFixed(5)+','+north.toFixed(5)+','+east.toFixed(5)+'););out geom tags '+MAX_LOCAL_OSM+';';
}
async function requestJson(url,timeout=35000) {
  const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),timeout);
  try {
    const response=await fetch(url,{mode:'cors',credentials:'omit',cache:'no-store',signal:ctl.signal});
    if (!response.ok) throw new Error('HTTP '+response.status);
    return await response.json();
  } finally { clearTimeout(timer); }
}
async function fetchOverpass(query) {
  let lastError=null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),44000);
    try {
      const response=await fetch(overpassRequestUrl(endpoint,query),{
        method:'GET',mode:'cors',credentials:'omit',cache:'no-store',signal:ctl.signal
      });
      if (!response.ok) throw new Error('Overpass HTTP '+response.status);
      const data=await response.json();
      if (!Array.isArray(data.elements)) throw new Error('Overpass returned no feature list');
      if (data.remark) throw new Error(String(data.remark).slice(0,180));
      return data.elements;
    } catch(error) { lastError=error; }
    finally { clearTimeout(timer); }
  }
  throw lastError||new Error('OpenStreetMap Overpass source unavailable');
}
async function fetchUspvdb() {
  const rows=[];
  for (let offset=0;offset<12000;offset+=2000) {
    const url=new URL(USPVDB_QUERY);
    url.searchParams.set('where',"p_sys_type='ground' AND p_tech_pri='PV'");
    url.searchParams.set('outFields','*');
    url.searchParams.set('returnGeometry','true');
    url.searchParams.set('outSR','4326');
    url.searchParams.set('resultRecordCount','2000');
    url.searchParams.set('resultOffset',String(offset));
    url.searchParams.set('orderByFields','objectid');
    url.searchParams.set('f','geojson');
    const data=await requestJson(url.toString(),40000);
    if (!Array.isArray(data.features)) throw new Error('USPVDB query did not return a GeoJSON feature list');
    rows.push(...data.features);
    const hasMore=data.exceededTransferLimit===true || data.properties?.exceededTransferLimit===true;
    if (data.features.length<2000 || !hasMore) break;
  }
  return rows;
}
function mapMarkerFeature(feature) {
  const p=feature.properties||{};
  return {type:'Feature',id:String(feature.id),geometry:feature.geometry,properties:{
    key:String(feature.id),name:p.name||'Solar field',source:p.source||'',
    markerColor:p.markerColor||'#f1c967',modelAvailable:!!p.modelGeometry
  }};
}
function mapFootprintFeature(feature) {
  const p=feature.properties||{};
  return {type:'Feature',id:String(feature.id),geometry:p.modelGeometry,properties:{
    key:String(feature.id),name:p.name||'Solar field',markerColor:p.markerColor||'#f1c967'
  }};
}
function mergeFeature(state,feature) {
  if (!feature||!feature.id||!feature.geometry||!feature.properties) return false;
  const key=String(feature.id),old=state.featureCache.get(key);
  if (old && old.properties && old.properties.modelGeometry && !feature.properties.modelGeometry) return false;
  const isNew=!old;
  state.featureCache.set(key,feature);
  return isNew;
}
function syncCollections(state) {
  const features=[...state.featureCache.values()];
  state.collection={type:'FeatureCollection',features:features.map(mapMarkerFeature)};
  state.footprints={type:'FeatureCollection',features:features.filter(f=>f.properties.modelGeometry).map(mapFootprintFeature)};
  const source=state.map.getSource(SOURCE_ID);
  if (source) source.setData(state.collection);
  const footprintSource=state.map.getSource(FOOTPRINT_SOURCE_ID);
  if (footprintSource) footprintSource.setData(state.footprints);
  state.stats.total=features.length;
  state.stats.uspvdb=features.filter(f=>f.properties.source==='USPVDB').length;
  state.stats.osm=features.filter(f=>f.properties.source==='OSM').length;
  state.stats.withBoundaries=features.filter(f=>!!f.properties.modelGeometry).length;
  if (state.THREE&&state.scene) rebuildModels(state);
  refreshStatusUi(state);
}
function makeSolarIcon(kind='field') {
  const canvas=document.createElement('canvas');canvas.width=96;canvas.height=96;
  const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Solar field icon canvas unavailable');
  ctx.clearRect(0,0,96,96);ctx.save();ctx.translate(48,48);
  ctx.shadowColor='#ffd56d';ctx.shadowBlur=14;
  ctx.fillStyle=kind==='cluster'?'#e8b54c':'#f2d27a';
  ctx.strokeStyle='#122433';ctx.lineWidth=5;ctx.lineJoin='round';
  ctx.beginPath();ctx.moveTo(-31,8);ctx.lineTo(31,8);ctx.lineTo(23,31);ctx.lineTo(-23,31);ctx.closePath();ctx.fill();ctx.stroke();
  ctx.shadowBlur=0;ctx.strokeStyle='#203c50';ctx.lineWidth=2.5;
  for(let x=-17;x<=17;x+=11){ctx.beginPath();ctx.moveTo(x,10);ctx.lineTo(x*0.78,29);ctx.stroke()}
  ctx.beginPath();ctx.moveTo(-26,19);ctx.lineTo(26,19);ctx.stroke();
  ctx.strokeStyle='#f7e6a7';ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,-16,16,Math.PI*1.08,Math.PI*1.92);ctx.stroke();
  ctx.fillStyle='#fff1bb';ctx.beginPath();ctx.arc(0,-16,5.5,0,Math.PI*2);ctx.fill();
  ctx.restore();return ctx.getImageData(0,0,96,96);
}
function setVisibility(state,on) {
  const ids=[CLUSTER_ID,CLUSTER_ICON_ID,CLUSTER_COUNT_ID,MARKER_ID,HALO_ID,FOOTPRINT_ID,FOOTPRINT_LINE_ID];
  for (const id of ids) {try{if(state.map.getLayer(id))state.map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}}
}
function installModelLayer(state) {
  const map=state.map,THREE=state.THREE;
  if (!THREE||map.getLayer(MODEL_ID)||state.layerInstalling) return;
  state.layerInstalling=true;
  const layer={
    id:MODEL_ID,type:'custom',renderingMode:'3d',
    onAdd(mapRef,gl) {
      if (state.renderer) return;
      const renderer=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
      renderer.autoClear=false;renderer.outputColorSpace=THREE.SRGBColorSpace;
      state.renderer=renderer;state.camera=new THREE.Camera();state.scene=new THREE.Scene();
      state.scene.add(new THREE.AmbientLight(0xffffff,1.65));
      const key=new THREE.DirectionalLight(0xfff2cf,1.35);key.position.set(-0.55,1.6,0.9);state.scene.add(key);
      const fill=new THREE.DirectionalLight(0x8ab8e8,0.42);fill.position.set(0.8,0.6,-0.9);state.scene.add(fill);
      state.stats.layerReady=true;rebuildModels(state);
    },
    render(gl,args) {
      if (!state.enabled||!state.renderer||!state.scene||!state.camera) return;
      const raw=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);
      if (!raw||raw.length<16) return;
      const projection=new THREE.Matrix4().fromArray(raw);
      const zoom=Number(map.getZoom()||0);
      for (const item of state.models) item.root.visible=false;
      if(zoom>=MIN_MODEL_ZOOM)for (const item of state.models) {
        if(item.groundElevationM===null) {
          try {
            const terrain=map.queryTerrainElevation&&
              map.queryTerrainElevation({lng:item.coordinate[0],lat:item.coordinate[1]},{exaggerated:false});
            if(Number.isFinite(terrain))item.groundElevationM=terrain;
          } catch(_) {}
        }
        const altitude=Number.isFinite(item.groundElevationM)?item.groundElevationM:0;
        const matrix=modelMatrixFor(map,THREE,item.coordinate,altitude);
        if(!matrix)continue;
        item.root.visible=true;
        state.camera.projectionMatrix.copy(projection).multiply(matrix);
        try {
          state.renderer.resetState();
          state.renderer.render(state.scene,state.camera);
        } catch(error) {
          if(!state.renderWarned){state.renderWarned=true;console.warn('BridgePoint solar field render',error);}
        } finally {item.root.visible=false;}
      }
    },
    onRemove() {
      try {if(state.renderer)state.renderer.dispose();} catch(_) {}
      for(const item of state.models)disposeObject(item.root);
      state.models=[];state.modelSignature='';
      state.renderer=null;state.camera=null;state.scene=null;
      state.stats.layerReady=false;state.layerInstalling=false;
    }
  };
  try {map.addLayer(layer);state.stats.layerReady=!!map.getLayer(MODEL_ID);}
  catch(error){state.stats.lastError=String(error&&error.message||error);console.warn('BridgePoint solar custom layer install',error);}
  finally {state.layerInstalling=false;}
}
function modelMatrixFor(map,THREE,coordinate,altitude) {
  try {
    const raw=map.transform&&typeof map.transform.getMatrixForModel==='function'
      ?map.transform.getMatrixForModel([Number(coordinate[0]),Number(coordinate[1])],Number(altitude)||0):null;
    if (raw&&raw.length>=16) return new THREE.Matrix4().fromArray(raw);
    const Mercator=window.maplibregl&&window.maplibregl.MercatorCoordinate;
    if (!Mercator||typeof Mercator.fromLngLat!=='function') return null;
    const mc=Mercator.fromLngLat([Number(coordinate[0]),Number(coordinate[1])],Number(altitude)||0);
    const metres=mc.meterInMercatorCoordinateUnits();
    if (![mc.x,mc.y,mc.z,metres].every(Number.isFinite)||metres<=0) return null;
    return new THREE.Matrix4().set(metres,0,0,mc.x,0,0,metres,mc.y,0,metres,0,mc.z,0,0,0,1);
  } catch(_) {return null;}
}
function localRingsFor(feature) {
  const geometry=feature.properties&&feature.properties.modelGeometry;
  const rings=geometryRings(geometry),center=feature.geometry.coordinates;
  if (!rings.length||!center) return [];
  const cos=Math.max(0.05,Math.cos(center[1]*RAD));
  return rings.map(ring=>ring.map(c=>[(c[0]-center[0])*111320*cos,(c[1]-center[1])*110540]));
}
function pointInRing(x,z,ring) {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {
    const xi=ring[i][0],zi=ring[i][1],xj=ring[j][0],zj=ring[j][1];
    const crosses=((zi>z)!==(zj>z))&&(x<(xj-xi)*(z-zi)/((zj-zi)||1e-12)+xi);
    if(crosses)inside=!inside;
  }
  return inside;
}
function pointInRings(x,z,rings) {
  return rings.some(r=>pointInRing(x,z,r));
}
function addSolarFieldModel(THREE,feature,map) {
  const rings=localRingsFor(feature);
  if (!rings.length) return null;
  let minX=Infinity,maxX=-Infinity,minZ=Infinity,maxZ=-Infinity;
  for (const ring of rings) for (const c of ring) {
    minX=Math.min(minX,c[0]);maxX=Math.max(maxX,c[0]);
    minZ=Math.min(minZ,c[1]);maxZ=Math.max(maxZ,c[1]);
  }
  if (![minX,maxX,minZ,maxZ].every(Number.isFinite) ||
      maxX-minX<8 || maxZ-minZ<8) return null;
  const p=feature.properties||{};
  const tilt=Math.max(0,Math.min(45,finite(p.tiltDeg)!==null?p.tiltDeg:22))*RAD;
  const azimuth=(finite(p.azimuthDeg)!==null?p.azimuthDeg:180)*RAD;
  let stepX=23,stepZ=10.5;
  const countCandidates=(sx,sz)=>{
    let n=0;
    for(let z=minZ+sz*0.5;z<maxZ;z+=sz)for(let x=minX+sx*0.5;x<maxX;x+=sx)
      if(pointInRings(x,z,rings))n++;
    return n;
  };
  const estimate=Math.max(1,Math.ceil((maxX-minX)/stepX)*Math.ceil((maxZ-minZ)/stepZ));
  if(estimate>MAX_PANEL_TABLES*1.35) {
    const factor=Math.sqrt(estimate/(MAX_PANEL_TABLES*1.15));
    stepX*=factor;stepZ*=factor;
  }
  let count=countCandidates(stepX,stepZ);
  if(!count)return null;
  if(count>MAX_PANEL_TABLES) {
    const factor=Math.sqrt(count/MAX_PANEL_TABLES);
    stepX*=factor;stepZ*=factor;count=countCandidates(stepX,stepZ);
  }
  const placements=[];
  outer: for(let z=minZ+stepZ*0.5;z<maxZ;z+=stepZ)for(let x=minX+stepX*0.5;x<maxX;x+=stepX) {
    if(pointInRings(x,z,rings))placements.push([x,z]);
    if(placements.length>=MAX_PANEL_TABLES)break outer;
  }
  if(!placements.length)return null;
  const root=new THREE.Group();root.name='BridgePoint Solar Field '+String(p.name||p.recordId||feature.id);
  root.matrixAutoUpdate=false;
  const panelMaterial=new THREE.MeshStandardMaterial({color:0x102c49,roughness:0.27,metalness:0.3,side:THREE.DoubleSide});
  const frameMaterial=new THREE.MeshStandardMaterial({color:0xb2bdc7,roughness:0.52,metalness:0.78});
  const supportMaterial=new THREE.MeshStandardMaterial({color:0x687b89,roughness:0.63,metalness:0.72});
  const tableGeometry=new THREE.PlaneGeometry(14,3.8);
  const panels=new THREE.InstancedMesh(tableGeometry,panelMaterial,placements.length);
  const postGeometry=new THREE.CylinderGeometry(0.055,0.08,1,6);
  const posts=new THREE.InstancedMesh(postGeometry,supportMaterial,placements.length*4);
  const dummy=new THREE.Object3D(),rotation=new THREE.Euler(-Math.PI/2+tilt,azimuth,0,'XYZ');
  const gridPositions=[];
  let postIndex=0;
  const cAz=Math.cos(azimuth),sAz=Math.sin(azimuth),cTilt=Math.cos(tilt),sTilt=Math.sin(tilt);
  const pushLine=(x1,y1,z1,x2,y2,z2,matrix)=>{
    const a=new THREE.Vector3(x1,y1,z1).applyMatrix4(matrix);
    const b=new THREE.Vector3(x2,y2,z2).applyMatrix4(matrix);
    gridPositions.push(a.x,a.y,a.z,b.x,b.y,b.z);
  };
  for(let i=0;i<placements.length;i++) {
    const [x,z]=placements[i];
    dummy.position.set(x,2.05,z);dummy.rotation.copy(rotation);dummy.scale.set(1,1,1);dummy.updateMatrix();
    panels.setMatrixAt(i,dummy.matrix);
    const m=dummy.matrix;
    // Fine cell seams and table rails are transformed with each panel plane so they never drift.
    for(let gx=-6;gx<=6;gx+=2)pushLine(gx,-1.85,0.035,gx,1.85,0.035,m);
    for(const gy of [-1.85,-0.92,0,0.92,1.85])pushLine(-7,gy,0.035,7,gy,0.035,m);
    // Four rack legs rise from the ground plane to the tilted table's underside.
    for(const sideX of [-1,1])for(const sideZ of [-1,1]) {
      const localX=sideX*6.55,localZ=sideZ*1.62*cTilt;
      const topY=2.05+sideZ*1.62*sTilt;
      const dx=localX*cAz+localZ*sAz,dz=-localX*sAz+localZ*cAz;
      const height=Math.max(0.65,topY-0.12);
      dummy.position.set(x+dx,0.12+height/2,z+dz);
      dummy.rotation.set(0,0,0);dummy.scale.set(1,height,1);dummy.updateMatrix();
      posts.setMatrixAt(postIndex++,dummy.matrix);
    }
  }
  panels.instanceMatrix.needsUpdate=true;posts.instanceMatrix.needsUpdate=true;
  root.add(panels);root.add(posts);
  const gridGeometry=new THREE.BufferGeometry();
  gridGeometry.setAttribute('position',new THREE.Float32BufferAttribute(gridPositions,3));
  const grid=new THREE.LineSegments(gridGeometry,frameMaterial);grid.frustumCulled=false;root.add(grid);
  panels.frustumCulled=false;posts.frustumCulled=false;
  return {root,coordinate:feature.geometry.coordinates,groundElevationM:groundElevationFor(map,feature),featureId:String(feature.id)};
}
function groundElevationFor(map,feature) {
  try {
    const coordinate=feature&&feature.geometry&&feature.geometry.coordinates;
    if(!coordinate||typeof map.queryTerrainElevation!=='function')return null;
    const elevation=map.queryTerrainElevation({lng:coordinate[0],lat:coordinate[1]},{exaggerated:false});
    return Number.isFinite(elevation)?elevation:null;
  } catch(_) {return null;}
}
function disposeObject(root) {
  if (!root) return;
  root.traverse(o=>{
    if(o.geometry&&o.geometry.dispose)o.geometry.dispose();
    if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&m.dispose)m.dispose();
  });
}
function modelCandidates(state) {
  const map=state.map;
  if(Number(map.getZoom()||0)<MIN_MODEL_ZOOM)return [];
  const bounds=map.getBounds?.(),center=map.getCenter?.();
  if(!bounds||!center)return [];
  const rows=[];
  for(const f of state.featureCache.values()) {
    if(!f.properties?.modelGeometry||f.properties.modelPhotovoltaic===false)continue;
    const rings=geometryRings(f.properties.modelGeometry);
    if(!rings.length)continue;
    let west=Infinity,east=-Infinity,south=Infinity,north=-Infinity;
    for(const ring of rings)for(const point of ring){
      west=Math.min(west,point[0]);east=Math.max(east,point[0]);
      south=Math.min(south,point[1]);north=Math.max(north,point[1]);
    }
    if(east<bounds.getWest()||west>bounds.getEast()||north<bounds.getSouth()||south>bounds.getNorth())continue;
    const c=f.geometry.coordinates;
    const dx=(c[0]-center.lng)*111320*Math.max(0.1,Math.cos(c[1]*RAD));
    const dy=(c[1]-center.lat)*110540;
    rows.push({feature:f,d:dx*dx+dy*dy});
  }
  rows.sort((a,b)=>a.d-b.d);
  return rows.slice(0,MAX_MODEL_SITES).map(x=>x.feature);
}
function rebuildModels(state) {
  if(!state.THREE||!state.scene||state.dead)return;
  const rows=modelCandidates(state),signature=rows.map(x=>x.id).join('|');
  if(signature===state.modelSignature)return;
  for(const item of state.models){state.scene.remove(item.root);disposeObject(item.root);}
  state.models=[];state.modelSignature=signature;
  for(const feature of rows) {
    try {
      const item=addSolarFieldModel(state.THREE,feature,state.map);
      if(item){item.root.visible=false;state.scene.add(item.root);state.models.push(item);}
    } catch(error){console.warn('BridgePoint solar field model skipped',feature.id,error);}
  }
  state.stats.models=state.models.length;
}
function loadThree() {
  if(!threePromise)threePromise=import(THREE_URL).then(m=>m.default||m);
  return threePromise;
}
function updateStatus(state,message) {
  state.status=message;
  const el=document.getElementById('bp-solar-fields-status-v1');
  if(el)el.textContent=message;
  refreshCounts(state);
}
function refreshCounts(state) {
  const el=document.getElementById('bp-solar-fields-count-v1');
  if(el)el.textContent=state.stats.total.toLocaleString('en-US')+' mapped solar-field records · '+state.stats.withBoundaries.toLocaleString('en-US')+' with array boundaries';
  const button=document.getElementById('bp-solar-fields-toggle-v1');
  if(button){button.setAttribute('aria-pressed',String(state.enabled));button.classList.toggle('is-active',state.enabled);}
}
function refreshStatusUi(state) {
  const el=document.getElementById('bp-solar-fields-status-v1');
  if(el)el.textContent=state.status;
  refreshCounts(state);
}
function addControlGroup(state) {
  const dock=document.getElementById('bpv-dock-actions');
  if(!dock)return false;
  if(document.getElementById('bp-solar-fields-control-v1'))return true;
  const group=document.createElement('section');
  group.id='bp-solar-fields-control-v1';group.className='bpv-command-group';
  group.setAttribute('data-bpv-command-section','solar-fields');
  group.setAttribute('aria-label','Global utility-scale solar fields');
  group.innerHTML=
    '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">☀️</span>'+
    '<span><b>SOLAR FIELDS</b><small>Global plant-scale photovoltaic sites · ground-mounted 3D arrays</small></span></div>'+
    '<div class="bpv-command-grid"><button id="bp-solar-fields-toggle-v1" type="button" class="bpv-command-btn" aria-pressed="false" title="Show global utility-scale solar-field locations and ground-anchored 3D array models">'+
    '<span class="bpv-command-icon" aria-hidden="true">▦</span><span class="bpv-command-label">Solar Fields</span></button></div>'+
    '<div id="bp-solar-fields-count-v1" class="bpv-data-note">Not loaded · select to discover global solar fields</div>'+
    '<div id="bp-solar-fields-status-v1" class="bpv-data-note">Layer off · all other BridgePoint layers remain unchanged</div>'+
    '<div class="bpv-data-note">OSM: plant:source=solar only · individual rooftop arrays excluded. USPVDB: ground-mounted PV only.</div>'+
    '<style id="bp-solar-fields-style-v1">'+
    '#bp-solar-fields-control-v1 .bpv-data-note{font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere}'+
    '#bp-solar-fields-toggle-v1.is-active{border-color:rgba(244,207,114,.82);background:rgba(91,70,28,.56);box-shadow:inset 0 0 0 1px rgba(244,207,114,.24)}'+
    '.bp-solar-popup-wrap-v1 .maplibregl-popup-content{background:#071522;color:#e6f6fb;border:1px solid rgba(244,207,114,.45);border-radius:12px;padding:13px;font:12px/1.45 system-ui,sans-serif;max-height:min(74vh,650px);overflow:auto}'+
    '.bp-solar-popup-v1 h3{font-size:16px;margin:3px 0 10px;color:#fff}.bp-solar-kicker-v1{font-size:9px;letter-spacing:.12em;color:#f4cf72;font-weight:800}'+
    '.bp-solar-grid-v1{display:grid;grid-template-columns:minmax(100px,.8fr) minmax(130px,1.2fr);gap:6px 10px}'+
    '.bp-solar-grid-v1>div{display:contents}.bp-solar-grid-v1 span{color:#8ca9b9}.bp-solar-grid-v1 b{color:#e9f5fa;font-weight:650;overflow-wrap:anywhere}'+
    '.bp-solar-note-v1{color:#a8c0cd;border-top:1px solid rgba(143,182,201,.14);padding-top:8px;margin:10px 0 0}'+
    '.bp-solar-source-v1{margin-top:10px;color:#e4c678}.bp-solar-source-v1 a{color:#f5d88c}.bp-solar-coords-v1{font-size:10px;color:#8198a6;margin-top:5px}'+
    '</style>';
  dock.appendChild(group);
  group.querySelector('#bp-solar-fields-toggle-v1').addEventListener('click',()=>{void setEnabled(state,!state.enabled);});
  refreshStatusUi(state);
  return true;
}
function installLayers(state) {
  const map=state.map;
  if(!map||!map.getStyle?.())return false;
  try {
    if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'geojson',data:state.collection,
      cluster:true,clusterRadius:54,clusterMaxZoom:8,maxzoom:16,
      attribution:'USGS and Lawrence Berkeley National Laboratory · OpenStreetMap contributors'});
    if(!map.getSource(FOOTPRINT_SOURCE_ID))map.addSource(FOOTPRINT_SOURCE_ID,{
      type:'geojson',data:state.footprints,maxzoom:15,
      attribution:'USGS and Lawrence Berkeley National Laboratory · OpenStreetMap contributors'});
    const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer);};
    if(!map.hasImage?.('bp-solar-field-icon-v1'))map.addImage('bp-solar-field-icon-v1',makeSolarIcon('field'),{pixelRatio:2});
    if(!map.hasImage?.('bp-solar-field-cluster-icon-v1'))map.addImage('bp-solar-field-cluster-icon-v1',makeSolarIcon('cluster'),{pixelRatio:2});
    add(CLUSTER_ID,{id:CLUSTER_ID,type:'circle',source:SOURCE_ID,filter:['has','point_count'],minzoom:0,maxzoom:8.6,
      paint:{'circle-color':['step',['get','point_count'],'#e8c76e',25,'#dba84c',120,'#c9823e',500,'#a95d37'],
        'circle-radius':['step',['get','point_count'],11,10,14,50,19,200,25,1000,31],
        'circle-stroke-color':'#fff0bc','circle-stroke-width':1.25,'circle-opacity':0.97}});
    add(CLUSTER_ICON_ID,{id:CLUSTER_ICON_ID,type:'symbol',source:SOURCE_ID,filter:['has','point_count'],minzoom:0,maxzoom:8.3,
      layout:{'icon-image':'bp-solar-field-cluster-icon-v1',
        'icon-size':['interpolate',['linear'],['zoom'],0,0.3,2.5,0.42,5,0.52],
        'icon-anchor':'center','icon-allow-overlap':true,'icon-ignore-placement':true,'icon-padding':0},
      paint:{'icon-opacity':1}});
    add(CLUSTER_COUNT_ID,{id:CLUSTER_COUNT_ID,type:'symbol',source:SOURCE_ID,filter:['has','point_count'],minzoom:0,maxzoom:8.6,
      layout:{'text-field':['get','point_count_abbreviated'],'text-font':['Open Sans Bold','Arial Unicode MS Bold'],
        'text-size':['interpolate',['linear'],['zoom'],0,8,5.5,12],
        'text-allow-overlap':true,'text-ignore-placement':true},
      paint:{'text-color':'#111923','text-halo-color':'#fff2c8','text-halo-width':0.45}});
    add(HALO_ID,{id:HALO_ID,type:'circle',source:SOURCE_ID,minzoom:0,maxzoom:16,filter:['!',['has','point_count']],
      paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,3,5,5,10,7,15,9],
        'circle-color':['get','markerColor'],'circle-opacity':0.35,'circle-blur':0.68}});
    add(MARKER_ID,{id:MARKER_ID,type:'symbol',source:SOURCE_ID,minzoom:0,maxzoom:18,filter:['!',['has','point_count']],
      layout:{'icon-image':'bp-solar-field-icon-v1',
        'icon-size':['interpolate',['linear'],['zoom'],0,0.21,3,0.3,7,0.43,11,0.54,16,0.62],
        'icon-anchor':'center','icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport',
        'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-padding':0},
      paint:{'icon-opacity':1}});
    add(FOOTPRINT_ID,{id:FOOTPRINT_ID,type:'fill',source:FOOTPRINT_SOURCE_ID,minzoom:MIN_FOOTPRINT_ZOOM,
      paint:{'fill-color':['get','markerColor'],'fill-opacity':0.17}});
    add(FOOTPRINT_LINE_ID,{id:FOOTPRINT_LINE_ID,type:'line',source:FOOTPRINT_SOURCE_ID,minzoom:MIN_FOOTPRINT_ZOOM,
      paint:{'line-color':'#f5d16f','line-width':['interpolate',['linear'],['zoom'],8.5,1,12,2,17,3.5],
        'line-opacity':0.92}});
    if(state.THREE)installModelLayer(state);
    setVisibility(state,state.enabled);
    return true;
  } catch(error) {
    state.stats.lastError=String(error&&error.message||error);
    console.warn('BridgePoint solar-field layers unavailable',error);return false;
  }
}
function bindInteractions(state) {
  if(state.interactionsBound)return;
  state.interactionsBound=true;
  const map=state.map;
  map.on('click',event=>{
    if(!state.enabled)return;
    const layers=[CLUSTER_ID,CLUSTER_ICON_ID,CLUSTER_COUNT_ID,MARKER_ID,HALO_ID,FOOTPRINT_LINE_ID,FOOTPRINT_ID]
      .filter(id=>map.getLayer(id));
    const hits=map.queryRenderedFeatures?.(event.point,{layers})||[];
    const hit=hits.find(x=>x.properties&&x.properties.key||x.properties&&x.properties.cluster);
    if(!hit)return;
    if(hit.properties&&hit.properties.cluster) {
      const source=map.getSource(SOURCE_ID);
      source?.getClusterExpansionZoom?.(Number(hit.properties.cluster_id),(error,zoom)=>{
        if(!error)map.easeTo({center:hit.geometry.coordinates,zoom});
      });
      return;
    }
    const key=String(hit.properties.key||'');
    const feature=state.featureCache.get(key);
    if(!feature)return;
    if(state.popup)state.popup.remove();
    const Popup=window.maplibregl&&window.maplibregl.Popup;
    if(Popup)state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'420px',className:'bp-solar-popup-wrap-v1'})
      .setLngLat(feature.geometry.coordinates||event.lngLat)
      .setHTML(solarFieldPopupHtml(feature)).addTo(map);
  });
  const changed=()=> {
    if(!state.enabled)return;
    rebuildModels(state);
    if(state.renderer)map.triggerRepaint?.();
    queueLocalOsm(state);
  };
  map.on('moveend',changed);map.on('zoomend',changed);
}
async function loadInitialData(state) {
  if(state.loading||state.dead||state.globalLoaded||!state.enabled)return;
  state.loading=true;state.stats.lastError=null;
  updateStatus(state,'Loading USGS ground-mounted PV boundaries and the complete global OSM solar-plant snapshot…');
  const tasks=await Promise.allSettled([fetchUspvdb(),fetchGlobalSolarRecords()]);
  if(state.dead){state.loading=false;return;}
  let usgsRows=[],osmFeatures=[],errors=[],osmMeta=null,osmSource='OpenStreetMap';
  if(tasks[0].status==='fulfilled')usgsRows=tasks[0].value||[];
  else errors.push('USPVDB source unavailable: '+String(tasks[0].reason&&tasks[0].reason.message||tasks[0].reason));
  if(tasks[1].status==='fulfilled') {
    const bundle=tasks[1].value||{};
    osmFeatures=bundle.features||[];osmMeta=bundle.meta||null;osmSource=bundle.source||osmSource;
    if(bundle.snapshotError)errors.push('Global snapshot fallback: '+bundle.snapshotError);
  } else errors.push('Global OSM source unavailable: '+String(tasks[1].reason&&tasks[1].reason.message||tasks[1].reason));
  for(const row of usgsRows)mergeFeature(state,normalizeUspvdbFeature(row));
  for(const feature of osmFeatures)mergeFeature(state,feature);
  state.globalLoaded=state.featureCache.size>0;
  state.lastUpdated=Date.now();
  state.stats.uspvdbSourceRows=usgsRows.length;state.stats.osmSourceRows=osmFeatures.length;
  state.stats.osmSnapshotCount=Number(osmMeta&&osmMeta.count)||osmFeatures.length;
  state.stats.osmSnapshotUpdated=textValue(osmMeta&&osmMeta.generatedAt,'');
  state.stats.globalOsmSource=osmSource;
  syncCollections(state);
  if(state.globalLoaded) {
    const details=[];
    if(state.stats.uspvdb)details.push(state.stats.uspvdb.toLocaleString()+' USPVDB ground PV sites');
    if(state.stats.osm)details.push(state.stats.osm.toLocaleString()+' global OSM plant-scale sites');
    const refreshed=state.stats.osmSnapshotUpdated?' · OSM snapshot '+state.stats.osmSnapshotUpdated.slice(0,10):'';
    updateStatus(state,details.join(' · ')+refreshed+' · '+osmSource+(errors.length?' · partial source coverage: '+errors.join('; '):' · select a marker for facility details'));
  } else {
    state.stats.lastError=errors.join('; ')||'Both solar-field sources returned no usable records';
    updateStatus(state,'Solar field inventory unavailable · '+state.stats.lastError);
  }
  state.loading=false;refreshStatusUi(state);
  if(state.THREE)rebuildModels(state);
  if(state.renderer)state.map.triggerRepaint?.();
}
async function loadLocalOsm(state) {
  if(state.localLoading||state.dead||!state.enabled||Number(state.map.getZoom()||0)<7.8)return;
  const bounds=state.map.getBounds?.();if(!bounds)return;
  const key=[bounds.getWest(),bounds.getSouth(),bounds.getEast(),bounds.getNorth()]
    .map(n=>Math.round(n*4)/4).join(':');
  if(state.queriedBoxes.has(key))return;
  if(bounds.getEast()-bounds.getWest()>20||bounds.getNorth()-bounds.getSouth()>14)return;
  state.queriedBoxes.add(key);state.localLoading=true;
  try {
    const rows=await fetchOverpass(localSolarOverpassQuery(bounds));
    if(state.dead)return;
    let added=0,withGeometry=0;
    for(const row of rows) {
      const f=normalizeSolarOsmElement(row);
      if(f&&mergeFeature(state,f)){added++;if(f.properties.modelGeometry)withGeometry++;}
      else if(f&&f.properties.modelGeometry){withGeometry++;}
    }
    if(added)syncCollections(state);
    if(added||withGeometry) {
      state.stats.localGeometryRecords+=withGeometry;
      updateStatus(state,state.status+' · '+withGeometry.toLocaleString()+' local OSM array geometries');
    }
  } catch(error) {
    state.stats.localQueryErrors++;
    console.warn('BridgePoint local solar-field boundary query unavailable',error);
  } finally {
    state.localLoading=false;
    rebuildModels(state);
    if(state.renderer)state.map.triggerRepaint?.();
  }
}
function queueLocalOsm(state) {
  if(!state.enabled||Number(state.map.getZoom()||0)<7.8)return;
  if(state.localTimer)clearTimeout(state.localTimer);
  state.localTimer=setTimeout(()=>{state.localTimer=0;void loadLocalOsm(state);},650);
}
async function setEnabled(state,on) {
  state.enabled=!!on;
  if(state.enabled) {
    installLayers(state);bindInteractions(state);
    if(!state.THREE&&!state.threeLoading) {
      state.threeLoading=true;
      loadThree().then(THREE=>{
        if(state.dead)return;
        state.THREE=THREE;state.threeLoading=false;
        if(state.enabled&&state.map.getStyle?.())installModelLayer(state);
        rebuildModels(state);state.map.triggerRepaint?.();
      }).catch(error=>{
        state.threeLoading=false;updateStatus(state,'3D solar renderer unavailable: '+String(error&&error.message||error));
        console.warn('BridgePoint solar Three.js load failed',error);
      });
    }
    if(!state.globalLoaded)void loadInitialData(state);
    else queueLocalOsm(state);
    updateStatus(state,state.globalLoaded?state.status:'Loading global solar-field inventory…');
  } else {
    if(state.popup){state.popup.remove();state.popup=null;}
    for(const item of state.models)item.root.visible=false;
    updateStatus(state,'Layer off · all existing BridgePoint features remain unchanged');
    if(state.renderer)state.map.triggerRepaint?.();
  }
  setVisibility(state,state.enabled);refreshStatusUi(state);
  return state.enabled;
}
function install(map,state) {
  if(!map||!map.getStyle?.())return;
  if(!installLayers(state))return;
  bindInteractions(state);
  if(state.enabled) {
    if(state.THREE)installModelLayer(state);
    if(!state.globalLoaded)void loadInitialData(state);
  }
}
export function initSolarFieldsRenderer(target) {
  const map=target&&(target.map||target);
  if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
  const existing=MAP_STATES.get(map);if(existing)return existing.api;
  const state={
    map,enabled:false,dead:false,loading:false,globalLoaded:false,localLoading:false,localTimer:0,
    threeLoading:false,layerInstalling:false,THREE:null,scene:null,camera:null,renderer:null,
    models:[],modelSignature:'',featureCache:new Map(),collection:EMPTY,footprints:EMPTY,popup:null,
    interactionsBound:false,queriedBoxes:new Set(),status:'Layer off',lastUpdated:null,renderWarned:false,
    stats:{version:VERSION,total:0,uspvdb:0,osm:0,withBoundaries:0,models:0,
      uspvdbSourceRows:0,osmSourceRows:0,osmSnapshotCount:0,osmSnapshotUpdated:'',globalOsmSource:'',localGeometryRecords:0,localQueryErrors:0,
      layerReady:false,lastError:null}
  };
  const api={
    version:VERSION,
    get enabled(){return state.enabled;},
    get status(){return state.status;},
    get stats(){return Object.assign({},state.stats);},
    get features(){return state.featureCache.size;},
    get displayMode(){return solarFieldRenderModeForZoom(map.getZoom());},
    toggle(){return setEnabled(state,!state.enabled);},
    setEnabled(on){return setEnabled(state,on);},
    refresh(){state.globalLoaded=false;state.queriedBoxes.clear();state.stats.lastError=null;return loadInitialData(state);},
    destroy(){
      state.dead=true;if(state.localTimer)clearTimeout(state.localTimer);
      if(state.popup)state.popup.remove();
      for(const item of state.models){state.scene?.remove(item.root);disposeObject(item.root);}
      state.models=[];
    }
  };
  state.api=api;MAP_STATES.set(map,state);window.__BP_SOLAR_FIELDS_V1__=api;
  const ready=()=>install(map,state);
  map.on('style.load',ready);map.on('load',ready);
  if(map.isStyleLoaded?.())ready();
  const observeDock=()=>{if(addControlGroup(state))return;setTimeout(observeDock,500);};
  observeDock();
  const dockObserver=new MutationObserver(()=>{
    if(!document.getElementById('bp-solar-fields-control-v1'))addControlGroup(state);
  });
  if(document.body)dockObserver.observe(document.body,{childList:true,subtree:true});
  return api;
}
