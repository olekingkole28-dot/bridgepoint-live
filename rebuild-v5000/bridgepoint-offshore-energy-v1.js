/* BridgePoint Offshore Energy v1.
 * Additive offshore platform and explicit offshore-well layer.
 * NOAA US platform locations + NOAA OceanReports status when spatially joinable,
 * global OpenStreetMap offshore structures, and HIFLD/BSEE provenance links.
 * Approximate model dimensions/depths are explicitly identified as estimates.
 */
const VERSION = 2;
const MAP_STATES = new WeakMap();
let threePromise = null;
const THREE_URL = '/vendor/three.module.js?v=169-local';
const SOURCE_ID = 'bp-offshore-energy-source-v1';
const MARKER_HALO_ID = 'bp-offshore-energy-halo-v1';
const MARKER_ID = 'bp-offshore-energy-markers-v1';
const FOOTPRINT_ID = 'bp-offshore-energy-footprint-v1';
const FOOTPRINT_LINE_ID = 'bp-offshore-energy-footprint-line-v1';
const ICON_ID = 'bp-offshore-energy-icons-v1';
const MODEL_ID = 'bp-offshore-energy-models-v1';
const MIN_MARKER_ZOOM = 0;
const MIN_ICON_ZOOM = 2.2;
const MAX_MARKER_ZOOM = 14.2;
const MIN_FOOTPRINT_ZOOM = 8.2;
const MIN_MODEL_ZOOM = 12.2;
const MAX_GLOBAL_FEATURES = 14000;
const MAX_MODELS = typeof window !== 'undefined' &&
  ((Number(window.innerWidth) || 1024) <= 820 || Number(navigator.maxTouchPoints) > 0) ? 7 : 22;
const RAD = Math.PI / 180;
const TAU = Math.PI * 2;
const EMPTY = { type: 'FeatureCollection', features: [] };
const NOAA_PLATFORM_QUERY =
  'https://maps2.coast.noaa.gov/arcgis/rest/services/Hosted/OffshoreOilGasPlatforms/FeatureServer/0/query';
const NOAA_STATUS_QUERY =
  'https://www.coast.noaa.gov/arcgis/rest/services/OceanReports/OilGasPlatforms/MapServer/0/query';
const NOAA_PLATFORM_SOURCE = 'https://coast.noaa.gov/arcgis/rest/services/Hosted/OffshoreOilGasPlatforms/FeatureServer/0';
const NOAA_STATUS_SOURCE = 'https://www.coast.noaa.gov/arcgis/rest/services/OceanReports/OilGasPlatforms/MapServer/0';
const HIFLD_SOURCE = 'https://catalog.data.gov/dataset/oil-and-natural-gas-platforms';
const HIFLD_WELLS_SOURCE = 'https://catalog.data.gov/dataset/oil-and-natural-gas-wells';
const BSEE_SOURCE = 'https://www.data.bsee.gov/Main/Platform.aspx';
const OSM_SOURCE = 'https://www.openstreetmap.org/copyright';
export function offshoreIconImageData(ctx) {
  if (!ctx || typeof ctx.getImageData !== 'function') throw new TypeError('Offshore icon canvas context unavailable');
  return ctx.getImageData(0, 0, 96, 96);
}
export function overpassRequestUrl(endpoint, query) {
  const url = new URL(endpoint);
  url.searchParams.set('data', String(query || ''));
  return url.toString();
}

function finite(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, finite(value, min)));
}
export function parseMetres(value, max = 10000) {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 && value <= max ? value : null;
  const match = String(value).trim().replace(',', '.')
    .match(/^([0-9]+(?:\.[0-9]+)?)\s*(m|metres?|meters?|ft|feet|foot|')?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = String(match[2] || 'm').toLowerCase();
  const metres = ['ft','feet','foot',"'"].includes(unit) ? amount * 0.3048 : amount;
  return metres > 0 && metres <= max ? metres : null;
}
export function offshoreIconFor(kind) {
  if (kind === 'gas') return 'gas';
  if (kind === 'oil') return 'oil';
  if (kind === 'water') return 'water';
  return 'platform';
}
export function offshoreRenderModeForZoom(value) {
  const zoom = Number(value) || 0;
  if (zoom < MIN_MARKER_ZOOM) return 'hidden';
  if (zoom < MIN_FOOTPRINT_ZOOM) return 'global-icons';
  if (zoom < MIN_MODEL_ZOOM) return 'polygon-footprint';
  return '3d-platform';
}
function coordinateFromGeometry(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'Point' && Array.isArray(geometry.coordinates)) {
    const c = [Number(geometry.coordinates[0]), Number(geometry.coordinates[1])];
    return c.every(Number.isFinite) && Math.abs(c[0]) <= 180 && Math.abs(c[1]) <= 85 ? c : null;
  }
  return null;
}
function normalizeStatus(value) {
  const s = String(value || '').trim();
  return s ? s.slice(0, 80) : null;
}
function buildFeature(id, coordinate, props) {
  if (!coordinate || !coordinate.every(Number.isFinite)) return null;
  if (coordinate[0] < -180 || coordinate[0] > 180 || coordinate[1] < -85 || coordinate[1] > 85) return null;
  const kind = ['oil','gas','water'].includes(props.kind) ? props.kind : 'platform';
  const lengthM = parseMetres(props.lengthM ?? props.length, 3000);
  const widthM = parseMetres(props.widthM ?? props.width, 2000);
  const heightM = parseMetres(props.heightM ?? props.height, 1000);
  const waterDepthM = parseMetres(props.waterDepthM ?? props.water_depth ?? props.depth, 5000);
  const measuredLength = lengthM !== null;
  const measuredWidth = widthM !== null;
  const measuredHeight = heightM !== null;
  const measuredDepth = waterDepthM !== null;
  const platform = kind === 'platform';
  const length = lengthM || (platform ? 54 : 5);
  const width = widthM || (platform ? 42 : 5);
  const height = heightM || (platform ? 32 : 4);
  const depth = waterDepthM || (platform ? 38 : 35);
  const status = normalizeStatus(props.status);
  const sourceName = String(props.sourceName || 'OpenStreetMap contributors');
  const sourceUrl = String(props.sourceUrl || OSM_SOURCE);
  return {
    type: 'Feature',
    id: String(id),
    geometry: { type: 'Point', coordinates: coordinate },
    properties: {
      key: String(id), name: String(props.name || (platform ? 'Offshore platform' : kind.toUpperCase() + ' well')).slice(0, 120),
      kind, modelType:String(props.modelType || (props.isWell ? 'well' : 'platform')),
      assetIcon: offshoreIconFor(kind),
      platformType: String(props.platformType || (platform ? 'Offshore fixed platform / type not specified' : kind.toUpperCase() + ' well')).slice(0, 90),
      operator: String(props.operator || '').slice(0, 100),
      jurisdiction: String(props.jurisdiction || '').slice(0, 60),
      platformId: String(props.platformId || '').slice(0, 60),
      sourceRecord: String(props.sourceRecord || '').slice(0, 120),
      sourceName, sourceUrl, status, statusSource: String(props.statusSource || ''),
      statusAsOf: String(props.statusAsOf || ''),
      lengthM: length, widthM: width, heightM: height, waterDepthM: depth,
      measuredLength, measuredWidth, measuredHeight, measuredDepth,
      dimensionsNote: measuredLength || measuredWidth || measuredHeight || measuredDepth
        ? 'One or more physical dimensions are source-reported; unmeasured dimensions remain estimated.'
        : 'Platform size and seabed depth are visual engineering estimates, not surveyed dimensions.',
      markerColor: kind === 'gas' ? '#ff9b50' : kind === 'oil' ? '#e7c45d' : kind === 'water' ? '#57dfff' : '#d8e8ed',
      footprint: [length, width]
    }
  };
}
export function normalizeNoaaPlatform(feature) {
  if (!feature || feature.type !== 'Feature') return null;
  const c = coordinateFromGeometry(feature.geometry);
  const p = feature.properties || {};
  const id = p.platformid || p.OBJECTID || p.objectid;
  if (id === undefined || id === null) return null;
  const typeText = String(p.platformtype || '').toLowerCase();
  const recordText = String(p.sourcerecord || '').toLowerCase();
  const kind = /gas/.test(typeText + ' ' + recordText) ? 'gas' :
    /oil/.test(typeText + ' ' + recordText) ? 'oil' : 'platform';
  return buildFeature('noaa-platform/' + id, c, {
    kind, modelType:'platform', name: p.platformname || 'Platform ' + id,
    platformType: p.platformtype, operator: p.operator, jurisdiction: p.jurisdiction,
    platformId: id, sourceRecord: p.sourcerecord, sourceName: 'NOAA Office for Coastal Management',
    sourceUrl: NOAA_PLATFORM_SOURCE
  });
}
function isExplicitOffshoreWell(tags) {
  const offshore = String(tags.offshore || '').toLowerCase() === 'yes';
  const location = String(tags.location || '').toLowerCase();
  return offshore || /^(sea|seabed|offshore|underwater)$/.test(location);
}
export function normalizeOffshoreOsmElement(element) {
  if (!element || !element.tags) return null;
  const tags = element.tags;
  const manMade = String(tags.man_made || '').toLowerCase();
  const industrial = String(tags.industrial || '').toLowerCase();
  const seamark = String(tags['seamark:type'] || '').toLowerCase();
  const isPlatform = manMade === 'offshore_platform' ||
    industrial === 'offshore_oil_platform' || seamark === 'platform';
  const wellType = /^(oil_well|petroleum_well|gas_well)$/.test(manMade) ||
    (manMade === 'well' && isExplicitOffshoreWell(tags));
  if (!isPlatform && !wellType) return null;
  if (wellType && !isExplicitOffshoreWell(tags)) return null;
  let coordinate = null;
  if (Number.isFinite(Number(element.lat)) && Number.isFinite(Number(element.lon))) {
    coordinate = [Number(element.lon), Number(element.lat)];
  } else if (element.center && Number.isFinite(Number(element.center.lon)) &&
      Number.isFinite(Number(element.center.lat))) {
    coordinate = [Number(element.center.lon), Number(element.center.lat)];
  }
  const kind = /gas/.test(manMade + ' ' + String(tags.product || tags.resource || '')) ? 'gas' :
    /oil|petroleum/.test(manMade + ' ' + String(tags.product || tags.resource || '')) ? 'oil' :
    wellType ? 'water' : 'platform';
  const id = String(element.type || 'osm') + '/' + String(element.id ?? coordinate?.join('/') ?? '');
  const props = buildFeature('osm-offshore/' + id, coordinate, {
    kind, modelType:wellType?'well':'platform', name: tags.name || tags['seamark:name'] || tags.operator || null,
    platformType: tags['offshore:structure'] || tags.structure || tags.platform_type || null,
    operator: tags.operator || tags['operator:name'] || '',
    status: tags.status || tags['offshore:status'] || '',
    length: tags.length || tags['platform:length'], width: tags.width || tags['platform:width'],
    height: tags.height || tags['platform:height'],
    water_depth: tags.water_depth || tags.depth || tags['seamark:platform:depth'],
    sourceName: 'OpenStreetMap contributors', sourceUrl: OSM_SOURCE
  });
  return props;
}
function createFootprint(feature) {
  const [lon,lat] = feature.geometry.coordinates;
  const p = feature.properties;
  const len = p.lengthM / 2;
  const wid = p.widthM / 2;
  const cos = Math.max(0.12, Math.cos(lat * RAD));
  const dx = len / (111320 * cos);
  const dy = wid / 110540;
  const ring = [
    [lon-dx,lat-dy],[lon+dx,lat-dy],[lon+dx,lat+dy],
    [lon-dx,lat+dy],[lon-dx,lat-dy]
  ];
  return {
    type:'Feature', id:feature.id,
    geometry:{type:'Polygon',coordinates:[ring]},
    properties:Object.assign({},p,{assetId:feature.id})
  };
}
async function requestJson(url, timeout = 28000) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeout);
  try {
    const response = await fetch(url, { mode:'cors', credentials:'omit', cache:'no-store', signal:ctl.signal });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return await response.json();
  } finally { clearTimeout(timer); }
}
async function fetchNoaaPlatforms() {
  const rows = [];
  for (let offset=0; offset<10000; offset+=2000) {
    const url = NOAA_PLATFORM_QUERY + '?where=1%3D1&outFields=*&returnGeometry=true&outSR=4326&resultRecordCount=2000&resultOffset=' + offset + '&f=geojson';
    const data = await requestJson(url, 32000);
    if (!Array.isArray(data.features)) throw new Error('NOAA platform GeoJSON has no feature list');
    rows.push(...data.features);
    if (data.exceededTransferLimit !== true || data.features.length === 0) break;
  }
  return rows;
}
async function fetchNoaaStatuses() {
  const url = NOAA_STATUS_QUERY + '?where=1%3D1&outFields=status,type,source&returnGeometry=true&outSR=4326&resultRecordCount=2000&f=geojson';
  const data = await requestJson(url, 26000);
  return Array.isArray(data.features) ? data.features : [];
}
function pointDistanceMeters(a,b) {
  const lat = (a[1]+b[1])*0.5*RAD;
  const dx = (a[0]-b[0])*111320*Math.cos(lat);
  const dy = (a[1]-b[1])*110540;
  return Math.sqrt(dx*dx+dy*dy);
}
function applyNoaaStatuses(platforms, statusFeatures) {
  const candidates = [];
  for (const f of statusFeatures || []) {
    const c = coordinateFromGeometry(f.geometry);
    const p = f.properties || {};
    if (c && (p.status || p.type)) candidates.push({c,p});
  }
  if (!candidates.length) return;
  for (const feature of platforms) {
    if (feature.properties.sourceName.indexOf('NOAA') !== 0) continue;
    const c = feature.geometry.coordinates;
    let best=null, distance=Infinity;
    for (const item of candidates) {
      const d=pointDistanceMeters(c,item.c);
      if (d<distance) {distance=d;best=item}
    }
    if (best && distance<=250) {
      feature.properties.status=normalizeStatus(best.p.status);
      feature.properties.statusSource='NOAA OceanReports Oil and Gas Platforms';
      feature.properties.statusAsOf='Source timestamp not exposed by this layer response';
      if (best.p.type && feature.properties.kind==='platform') {
        const t=String(best.p.type).toLowerCase();
        if (/gas/.test(t)) {feature.properties.kind='gas';feature.properties.assetIcon='gas';feature.properties.markerColor='#ff9b50'}
        else if (/oil/.test(t)) {feature.properties.kind='oil';feature.properties.assetIcon='oil';feature.properties.markerColor='#e7c45d'}
      }
    }
  }
}
function globalOverpassQuery() {
  return '[out:json][timeout:35];(' +
    'nwr["man_made"="offshore_platform"];' +
    'nwr["industrial"="offshore_oil_platform"];' +
    'nwr["seamark:type"="platform"];' +
    'nwr["man_made"~"^(oil_well|petroleum_well|gas_well)$"]["offshore"="yes"];' +
    'nwr["man_made"~"^(oil_well|petroleum_well|gas_well)$"]["location"~"^(sea|seabed|offshore|underwater)$"];' +
    'nwr["man_made"="well"]["offshore"="yes"];' +
    ');out center tags 12000;';
}
async function fetchOverpass(query) {
  const endpoints=['https://overpass-api.de/api/interpreter','https://overpass.kumi.systems/api/interpreter'];
  let lastError=null;
  for(const endpoint of endpoints) {
    const ctl=new AbortController(),timer=setTimeout(()=>ctl.abort(),42000);
    try {
      const url=overpassRequestUrl(endpoint,query);
      const r=await fetch(url,{method:'GET',mode:'cors',credentials:'omit',cache:'no-store',signal:ctl.signal});
      if(!r.ok)throw new Error('Overpass HTTP '+r.status);
      const d=await r.json();
      if(!Array.isArray(d.elements))throw new Error('Overpass returned no elements');
      return d.elements;
    } catch(e){lastError=e}
    finally{clearTimeout(timer)}
  }
  throw lastError||new Error('Global offshore OSM source unavailable');
}
function mergeCollection(state, features) {
  for(const f of features) if(f && f.id) state.featureCache.set(String(f.id),f);
  const rows=[...state.featureCache.values()].slice(0,MAX_GLOBAL_FEATURES);
  const footprints=rows.map(createFootprint);
  state.collection={type:'FeatureCollection',features:rows};
  state.footprints={type:'FeatureCollection',features:footprints};
  const src=state.map.getSource(SOURCE_ID);
  if(src)src.setData(state.collection);
  const poly=state.map.getSource(SOURCE_ID+'-footprints');
  if(poly)poly.setData(state.footprints);
  state.stats.sourceFeatures=rows.length;
  state.stats.noaaFeatures=rows.filter(f=>f.properties.sourceName.indexOf('NOAA')===0).length;
  state.stats.osmFeatures=rows.filter(f=>f.properties.sourceName.indexOf('OpenStreetMap')===0).length;
  state.stats.models=state.models.length;
  rebuildModels(state);
}
function makeIcon(kind) {
  const canvas=document.createElement('canvas');
  canvas.width=96;canvas.height=96;
  const ctx=canvas.getContext('2d');
  if(!ctx)throw new Error('Offshore icon canvas unavailable');
  ctx.clearRect(0,0,96,96);
  ctx.save();ctx.translate(48,48);
  const color=kind==='gas'?'#ff9b50':kind==='oil'?'#e7c45d':kind==='water'?'#57dfff':'#d8e8ed';
  ctx.shadowColor=color;ctx.shadowBlur=10;ctx.fillStyle=color;ctx.strokeStyle='#10222e';ctx.lineWidth=4;
  if(kind==='oil'||kind==='water') {
    ctx.beginPath();ctx.moveTo(0,-34);ctx.bezierCurveTo(8,-19,25,2,25,15);
    ctx.bezierCurveTo(25,31,14,39,0,39);ctx.bezierCurveTo(-14,39,-25,31,-25,15);
    ctx.bezierCurveTo(-25,2,-8,-19,0,-34);ctx.closePath();ctx.fill();ctx.stroke();
    if(kind==='water'){ctx.shadowBlur=0;ctx.fillStyle='#e9fbff';ctx.beginPath();ctx.ellipse(-6,12,5,10,-0.4,0,TAU);ctx.fill()}
  } else if(kind==='gas') {
    ctx.beginPath();ctx.moveTo(0,-40);ctx.bezierCurveTo(7,-21,24,-12,23,8);
    ctx.bezierCurveTo(22,26,10,39,-3,37);ctx.bezierCurveTo(-23,35,-29,16,-19,0);
    ctx.bezierCurveTo(-16,-9,-7,-15,-8,-27);ctx.bezierCurveTo(2,-20,3,-12,2,-6);
    ctx.bezierCurveTo(11,-17,7,-29,0,-40);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.shadowBlur=0;ctx.fillStyle='#fff0c9';ctx.beginPath();ctx.moveTo(1,5);ctx.bezierCurveTo(13,16,7,29,-2,30);
    ctx.bezierCurveTo(-10,29,-13,18,-6,10);ctx.bezierCurveTo(-5,17,0,15,1,5);ctx.fill();
  } else {
    ctx.lineCap='round';ctx.lineJoin='round';ctx.lineWidth=8;
    ctx.beginPath();ctx.moveTo(-25,30);ctx.lineTo(0,-32);ctx.lineTo(25,30);ctx.stroke();
    ctx.beginPath();ctx.moveTo(-18,10);ctx.lineTo(18,10);ctx.moveTo(-10,-12);ctx.lineTo(10,-12);
    ctx.moveTo(-24,30);ctx.lineTo(24,30);ctx.stroke();
    ctx.fillStyle='#fff3c4';ctx.beginPath();ctx.arc(0,-32,5,0,TAU);ctx.fill();
  }
  ctx.restore();return offshoreIconImageData(ctx);
}
function addIconImage(map,id,kind) {
  if(map.hasImage?.(id))return;
  const imageData=makeIcon(kind);map.addImage(id,imageData,{pixelRatio:2});
}
function setVisibility(state,on) {
  const map=state.map;
  [MARKER_HALO_ID,MARKER_ID,FOOTPRINT_ID,FOOTPRINT_LINE_ID,ICON_ID,MODEL_ID].forEach(id=>{
    try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}
  });
}
function installLayers(state) {
  const map=state.map;
  if(!map||!map.getStyle?.())return false;
  try {
    if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{type:'geojson',data:state.collection,buffer:64,maxzoom:15,
      attribution:'NOAA Office for Coastal Management · HIFLD · OpenStreetMap contributors'});
    if(!map.getSource(SOURCE_ID+'-footprints'))map.addSource(SOURCE_ID+'-footprints',{type:'geojson',data:state.footprints,buffer:16,maxzoom:15});
    const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer)};
    add(MARKER_HALO_ID,{id:MARKER_HALO_ID,type:'circle',source:SOURCE_ID,minzoom:MIN_MARKER_ZOOM,maxzoom:MAX_MARKER_ZOOM,
      paint:{'circle-radius':['interpolate',['linear'],['zoom'],2.2,3.5,5,5.5,9,7,13.5,8],
        'circle-color':['get','markerColor'],'circle-opacity':0.42,'circle-blur':0.75}});
    add(MARKER_ID,{id:MARKER_ID,type:'circle',source:SOURCE_ID,minzoom:MIN_MARKER_ZOOM,maxzoom:MAX_MARKER_ZOOM,
      paint:{'circle-radius':['interpolate',['linear'],['zoom'],2.2,2.1,6,3.1,12,4.4],
        'circle-color':['get','markerColor'],'circle-stroke-color':'#081722','circle-stroke-width':1.2,'circle-opacity':0.98}});
    add(FOOTPRINT_ID,{id:FOOTPRINT_ID,type:'fill',source:SOURCE_ID+'-footprints',
      minzoom:MIN_FOOTPRINT_ZOOM,maxzoom:15,paint:{'fill-color':['get','markerColor'],'fill-opacity':0.2}});
    add(FOOTPRINT_LINE_ID,{id:FOOTPRINT_LINE_ID,type:'line',source:SOURCE_ID+'-footprints',
      minzoom:MIN_FOOTPRINT_ZOOM,maxzoom:15,paint:{'line-color':['get','markerColor'],
        'line-width':['interpolate',['linear'],['zoom'],8.2,1.1,11,2.2,14,3.4],'line-opacity':0.98}});
    [ ['oil','bp-offshore-icon-oil-v1'],['gas','bp-offshore-icon-gas-v1'],
      ['water','bp-offshore-icon-water-v1'],['platform','bp-offshore-icon-platform-v1'] ]
      .forEach(([kind,id])=>addIconImage(map,id,kind));
    add(ICON_ID,{id:ICON_ID,type:'symbol',source:SOURCE_ID,minzoom:MIN_ICON_ZOOM,maxzoom:MAX_MARKER_ZOOM,
      layout:{'icon-image':['match',['get','assetIcon'],'oil','bp-offshore-icon-oil-v1',
        'gas','bp-offshore-icon-gas-v1','water','bp-offshore-icon-water-v1','bp-offshore-icon-platform-v1'],
        'icon-size':['interpolate',['linear'],['zoom'],2.2,0.28,5,0.4,9,0.58,13.5,0.66],
        'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport',
        'icon-anchor':'center','icon-allow-overlap':true,'icon-ignore-placement':true,'icon-padding':0},
      paint:{'icon-opacity':1}});
    if(state.THREE)installModelLayer(state);
    setVisibility(state,state.enabled);
    return true;
  } catch(e) {
    state.stats.lastError=String(e?.message||e);
    console.warn('BridgePoint offshore energy layer setup',e);return false;
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
function addBox(THREE,root,material,x,y,z,sx,sy,sz) {
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(sx,sy,sz),material);
  mesh.position.set(x,y,z);mesh.frustumCulled=false;root.add(mesh);return mesh;
}
function addRod(THREE,root,material,a,b,radius=0.3,segments=8) {
  const start=new THREE.Vector3(a[0],a[1],a[2]),end=new THREE.Vector3(b[0],b[1],b[2]);
  const direction=new THREE.Vector3().subVectors(end,start);
  const length=direction.length();if(length<0.05)return null;
  const mesh=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,segments),material);
  mesh.position.copy(start.add(end).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  mesh.frustumCulled=false;root.add(mesh);return mesh;
}
function addPlatformModel(THREE,feature) {
  const p=feature.properties,platform=p.kind==='platform';
  const length=clamp(p.lengthM,24,180),width=clamp(p.widthM,18,140);
  const topHeight=clamp(p.heightM,14,110),depth=clamp(p.waterDepthM,12,1200);
  const L=length/2,W=width/2;
  const root=new THREE.Group();root.name='BridgePoint offshore '+p.kind+' '+p.name;
  const steel=new THREE.MeshStandardMaterial({color:'#8d999d',roughness:0.55,metalness:0.72});
  const darkSteel=new THREE.MeshStandardMaterial({color:'#39484e',roughness:0.7,metalness:0.55});
  const deck=new THREE.MeshStandardMaterial({color:'#aeb9b7',roughness:0.82,metalness:0.16});
  const deckDark=new THREE.MeshStandardMaterial({color:'#58686b',roughness:0.8,metalness:0.28});
  const safety=new THREE.MeshStandardMaterial({color:'#e8b83e',roughness:0.58,metalness:0.22});
  const module=new THREE.MeshStandardMaterial({color:'#e1e3dc',roughness:0.72,metalness:0.13});
  const moduleBlue=new THREE.MeshStandardMaterial({color:'#78939c',roughness:0.62,metalness:0.2});
  const red=new THREE.MeshStandardMaterial({color:'#bd563b',roughness:0.7,metalness:0.18});
  const pipe=new THREE.MeshStandardMaterial({color:'#c77e43',roughness:0.5,metalness:0.64});
  const glass=new THREE.MeshStandardMaterial({color:'#9bc2ca',roughness:0.12,metalness:0.15,transparent:true,opacity:0.42});
  const flame=new THREE.MeshStandardMaterial({color:'#ff7c24',emissive:'#ff4b12',emissiveIntensity:1.15,roughness:0.3});
  const seabed=-depth;
  // Four-point jacket, braced down to a modeled seabed footing.
  const cornerX=[-L*0.78,L*0.78],cornerZ=[-W*0.78,W*0.78];
  const lowerY=seabed-7,deckY=topHeight*0.24;
  addBox(THREE,root,darkSteel,0,lowerY-0.8,0,length*0.94,1.2,width*0.94);
  for(const x of cornerX)for(const z of cornerZ) {
    addRod(THREE,root,steel,[x*1.15,seabed+1,z*1.15],[x,deckY,z],Math.max(0.42,width*0.018),10);
    addBox(THREE,root,darkSteel,x*1.15,lowerY-0.3,z*1.15,2.1,1.0,2.1);
    for(const y of [seabed+depth*0.27,seabed+depth*0.52,seabed+depth*0.77]) {
      const t=(y-seabed)/Math.max(1,deckY-seabed);
      addRod(THREE,root,darkSteel,[x*1.15,y,z*1.15],[x*(1.15-0.15*t),y+1,z*(1.15-0.15*t)],0.22,7);
    }
  }
  // Cross-bracing on both long and short faces.
  const levels=[seabed+depth*0.2,seabed+depth*0.42,seabed+depth*0.64,seabed+depth*0.83];
  for(let i=0;i<levels.length;i++) {
    const y=levels[i],t=(y-seabed)/Math.max(1,depth);
    const sx=L*(1.15-0.15*t),sz=W*(1.15-0.15*t);
    addRod(THREE,root,darkSteel,[-sx,y,-sz],[sx,y,sz],0.24,7);
    addRod(THREE,root,darkSteel,[-sx,y,sz],[sx,y,-sz],0.24,7);
    addRod(THREE,root,steel,[-sx,y,-sz],[sx,y,-sz],0.28,7);
    addRod(THREE,root,steel,[-sx,y,sz],[sx,y,sz],0.28,7);
  }
  // Main cellar, production deck, mezzanine and upper utility deck.
  addBox(THREE,root,deck,0,deckY+1.2,0,length*0.97,2.4,width*0.96);
  addBox(THREE,root,deckDark,0,deckY+2.55,0,length*0.94,0.55,width*0.93);
  addBox(THREE,root,deck,0,deckY+5.4,0,length*0.86,0.7,width*0.78);
  for(const x of [-L*0.9,L*0.9])for(const z of [-W*0.87,W*0.87]) {
    addBox(THREE,root,safety,x,deckY+3.0,z,0.38,1.2,0.38);
  }
  // Production separators, pump modules, generators and living quarters.
  addBox(THREE,root,module,-L*0.25,deckY+4.9,-W*0.16,length*0.28,4.4,width*0.42);
  addBox(THREE,root,moduleBlue,L*0.2,deckY+4.6,-W*0.2,length*0.25,3.8,width*0.36);
  addBox(THREE,root,module,L*0.32,deckY+4.8,W*0.22,length*0.24,4.0,width*0.32);
  addBox(THREE,root,glass,L*0.32,deckY+5.1,W*0.22,length*0.19,2.4,width*0.28);
  for(let i=0;i<4;i++) {
    const x=-L*0.56+i*L*0.37;
    addBox(THREE,root,pipe,x,deckY+3.0,W*0.36,1.4,2.0,1.4);
    addRod(THREE,root,pipe,[x-1,deckY+3.9,W*0.36],[x+1.5,deckY+3.9,W*0.36],0.24,8);
  }
  // Drilling derrick, mast, crown block and braced legs.
  const mastX=-L*0.25,mastZ=-W*0.48,mastBase=deckY+6.0,mastTop=mastBase+topHeight*0.74;
  const mastW=Math.max(3.2,width*0.12);
  const mastCorners=[[-mastW/2,-mastW/2],[mastW/2,-mastW/2],[mastW/2,mastW/2],[-mastW/2,mastW/2]];
  for(let i=0;i<4;i++) {
    const [x,z]=mastCorners[i], [nx,nz]=mastCorners[(i+1)%4];
    addRod(THREE,root,red,[mastX+x,mastBase,mastZ+z],[mastX+x*0.28,mastTop,mastZ+z*0.28],0.32,8);
    addRod(THREE,root,safety,[mastX+x,mastBase,mastZ+z],[mastX+nx*0.28,mastTop,mastZ+nz*0.28],0.16,6);
  }
  addBox(THREE,root,darkSteel,mastX,mastTop,mastZ,mastW*0.65,1.2,mastW*0.65);
  addRod(THREE,root,steel,[mastX,mastTop,mastZ],[mastX,mastTop+5,mastZ],0.38,8);
  // Helipad cantilever and painted perimeter.
  const helix=L*0.57,heliz=W*0.54,helipadY=deckY+4.0;
  const pad=new THREE.Mesh(new THREE.CylinderGeometry(7.2,7.2,0.7,32),deckDark);
  pad.position.set(helix,helipadY,heliz);root.add(pad);
  const padRing=new THREE.Mesh(new THREE.TorusGeometry(6.85,0.25,8,36),safety);
  padRing.rotation.x=Math.PI/2;padRing.position.set(helix,helipadY+0.42,heliz);root.add(padRing);
  addBox(THREE,root,steel,helix-1.0,deckY+2.7,heliz,2.0,2.8,2.0);
  // Crane pedestal, vertical mast and long lattice boom.
  const craneX=L*0.57,craneZ=-W*0.45,craneY=deckY+5.0;
  addBox(THREE,root,safety,craneX,craneY,craneZ,2.0,2.8,2.0);
  addRod(THREE,root,steel,[craneX,craneY+1,craneZ],[craneX,craneY+12,craneZ],0.75,10);
  addRod(THREE,root,safety,[craneX,craneY+11,craneZ],[craneX+L*0.5,craneY+11,craneZ],0.5,8);
  addRod(THREE,root,darkSteel,[craneX+L*0.5,craneY+11,craneZ],[craneX+L*0.5,craneY+3,craneZ],0.12,6);
  // Flare boom and stack; its small flame is a model cue, not a live flaring report.
  const flareX=-L*0.59,flareZ=W*0.48;
  addRod(THREE,root,steel,[flareX,deckY+3.0,flareZ],[flareX-5,deckY+15,flareZ],0.45,8);
  addRod(THREE,root,red,[flareX-5,deckY+15,flareZ],[flareX-5,deckY+24,flareZ],0.65,10);
  const fire=new THREE.Mesh(new THREE.ConeGeometry(1.0,3.8,10),flame);
  fire.position.set(flareX-5,deckY+26,flareZ);root.add(fire);
  // Manifold and well conductors continue below the ocean surface into the jacket/seabed.
  const conductorCount=platform?6:2;
  for(let i=0;i<conductorCount;i++) {
    const x=-L*0.43+(i%3)*L*0.43;
    const z=platform?W*0.30+(Math.floor(i/3)-0.5)*W*0.35:0;
    addRod(THREE,root,pipe,[x,seabed-13,z],[x,deckY+1.2,z],platform?0.34:0.55,8);
    addRod(THREE,root,safety,[x,deckY+1.2,z],[x,deckY+3.2,z],0.42,8);
  }
  addRod(THREE,root,pipe,[-L*0.7,seabed+2,0],[L*0.7,seabed+2,0],0.42,8);
  // Small service pipe rack along the deck perimeter.
  for(let i=0;i<5;i++) {
    const z=-W*0.65+i*W*0.32;
    addRod(THREE,root,pipe,[-L*0.7,deckY+3.3,z],[L*0.7,deckY+3.3,z],0.16,7);
  }
  return {root,coordinate:feature.geometry.coordinates,groundElevationM:0,kind:p.kind};
}
function addWellModel(THREE,feature) {
  const p=feature.properties,root=new THREE.Group();
  const steel=new THREE.MeshStandardMaterial({color:'#647b83',roughness:0.45,metalness:0.72});
  const yellow=new THREE.MeshStandardMaterial({color:'#e7bd4d',roughness:0.58,metalness:0.2});
  const pipe=new THREE.MeshStandardMaterial({color:'#bd7f4d',roughness:0.5,metalness:0.7});
  const depth=clamp(p.waterDepthM,10,1000);
  addBox(THREE,root,steel,0,-depth-4,0,5,1.5,5);
  addRod(THREE,root,pipe,[0,-depth-4,0],[0,4,0],0.55,10);
  addBox(THREE,root,steel,0,2,0,3.8,2.2,3.8);
  addBox(THREE,root,yellow,0,3.45,0,3.4,0.6,3.4);
  for(const x of [-1.2,1.2])for(const z of [-1.2,1.2]) {
    addRod(THREE,root,steel,[x,0,z],[x*1.25,-depth,z*1.25],0.18,7);
  }
  for(let i=0;i<3;i++)addRod(THREE,root,pipe,[-1.1+i*1.1,2.9,0],[1.1+i*1.1,2.9,0],0.12,7);
  return {root,coordinate:feature.geometry.coordinates,groundElevationM:0,kind:p.kind};
}
function disposeObject(root) {
  if(!root)return;
  root.traverse(o=>{
    if(o.geometry?.dispose)o.geometry.dispose();
    if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m?.dispose)m.dispose();
  });
}
function withinBounds(bounds,coord) {
  try{return bounds&&bounds.contains(coord)}catch(_){return false}
}
function modelCandidates(state) {
  const map=state.map;
  if(Number(map.getZoom()||0)<MIN_MODEL_ZOOM)return [];
  const bounds=map.getBounds?.(),center=map.getCenter?.();
  if(!bounds||!center)return [];
  const rows=[];
  for(const f of state.collection.features) {
    const c=f.geometry.coordinates;if(!withinBounds(bounds,c))continue;
    const cos=Math.max(0.12,Math.cos(c[1]*RAD));
    const dx=(c[0]-center.lng)*111320*cos,dy=(c[1]-center.lat)*110540;
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
    try {
      const item=f.properties.modelType==='platform'?addPlatformModel(state.THREE,f):addWellModel(state.THREE,f);
      state.scene.add(item.root);state.models.push(item);
    } catch(e){console.warn('BridgePoint offshore model skipped',f.id,e)}
  }
  state.stats.renderedModels=state.models.length;
}
function installModelLayer(state) {
  const map=state.map;
  if(map.getLayer(MODEL_ID)||state.layerInstalling)return;
  state.layerInstalling=true;
  const THREE=state.THREE;
  const layer={
    id:MODEL_ID,type:'custom',renderingMode:'3d',
    onAdd(mapRef,gl) {
      if(state.renderer)return;
      const renderer=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
      renderer.autoClear=false;renderer.outputColorSpace=THREE.SRGBColorSpace;
      state.renderer=renderer;state.camera=new THREE.Camera();state.scene=new THREE.Scene();
      state.scene.add(new THREE.AmbientLight(0xffffff,1.35));
      const key=new THREE.DirectionalLight(0xfff1d5,1.35);key.position.set(-0.6,1.5,0.9);state.scene.add(key);
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
        const matrix=modelMatrixFor(map,THREE,item.coordinate,item.groundElevationM);
        if(!matrix)continue;
        item.root.visible=true;
        state.camera.projectionMatrix.copy(projection).multiply(matrix);
        try{state.renderer.resetState();state.renderer.render(state.scene,state.camera)}
        catch(e){if(!state.renderWarned){state.renderWarned=true;console.warn('BridgePoint offshore model renderer',e)}}
        finally{item.root.visible=false}
      }
    }
  };
  try {map.addLayer(layer);state.stats.layerReady=!!map.getLayer(MODEL_ID)}
  catch(e){state.stats.lastError=String(e?.message||e);console.warn('BridgePoint offshore custom layer',e)}
  finally{state.layerInstalling=false}
}
function loadThree() {
  if(!threePromise)threePromise=import(THREE_URL).then(m=>m.default||m);
  return threePromise;
}
function setStatus(state,message) {
  state.status=message;state.stats.lastError=message.indexOf('unavailable')>=0?message:null;
  const el=document.getElementById('bp-offshore-energy-status-v1');
  if(el)el.textContent=message;
  const count=document.getElementById('bp-offshore-energy-count-v1');
  if(count)count.textContent=state.stats.sourceFeatures.toLocaleString()+' mapped assets';
}
function refreshStatusUi(state) {
  const el=document.getElementById('bp-offshore-energy-status-v1');
  if(el)el.textContent=state.status;
  const count=document.getElementById('bp-offshore-energy-count-v1');
  if(count)count.textContent=state.stats.sourceFeatures.toLocaleString()+' mapped assets';
  const b=document.getElementById('bp-offshore-energy-toggle-v1');
  if(b){b.setAttribute('aria-pressed',String(state.enabled));b.classList.toggle('is-active',state.enabled)}
}
function safe(value) {
  return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function sourceLink(label,url) {
  return '<a href="'+safe(url)+'" target="_blank" rel="noopener noreferrer">'+safe(label)+'</a>';
}
function popupHtml(feature) {
  const p=feature.properties||{},c=feature.geometry.coordinates;
  const operational=p.status
    ? safe(p.status)+' <small>('+safe(p.statusSource||'source-reported status')+')</small>'
    : 'Not independently confirmed from the location record';
  const dimensions=[
    'Deck length: '+(p.measuredLength?'source value ':'estimated ')+p.lengthM.toFixed(1)+' m',
    'Deck width: '+(p.measuredWidth?'source value ':'estimated ')+p.widthM.toFixed(1)+' m',
    'Above-water height: '+(p.measuredHeight?'source value ':'estimated ')+p.heightM.toFixed(1)+' m',
    'Water depth: '+(p.measuredDepth?'source value ':'illustrative ')+p.waterDepthM.toFixed(1)+' m'
  ];
  const provenance='<div class="bp-offshore-sources-v1">'+
    sourceLink('NOAA platform location layer',NOAA_PLATFORM_SOURCE)+' · '+
    sourceLink('NOAA OceanReports status layer',NOAA_STATUS_SOURCE)+' · '+
    sourceLink('HIFLD platform inventory',HIFLD_SOURCE)+' · '+
    sourceLink('HIFLD wells inventory',HIFLD_WELLS_SOURCE)+' · '+
    sourceLink('BSEE platform / rig status',BSEE_SOURCE)+' · '+
    sourceLink('OpenStreetMap attribution',OSM_SOURCE)+'</div>';
  return '<article class="bp-offshore-popup-v1">'+
    '<div class="bp-offshore-kicker-v1">BRIDGEPOINT OFFSHORE ENERGY · '+safe(p.kind||'platform').toUpperCase()+'</div>'+
    '<h3>'+safe(p.name||'Offshore asset')+'</h3>'+
    '<div class="bp-offshore-grid-v1"><span>Asset class</span><b>'+safe(p.platformType||p.kind)+'</b>'+
    '<span>Operator</span><b>'+safe(p.operator||'Not supplied')+'</b>'+
    '<span>Platform ID</span><b>'+safe(p.platformId||'Not supplied')+'</b>'+
    '<span>Jurisdiction</span><b>'+safe(p.jurisdiction||'Not supplied')+'</b>'+
    '<span>Operational status</span><b>'+operational+'</b>'+
    '<span>Coordinates</span><b>'+c[1].toFixed(6)+', '+c[0].toFixed(6)+'</b></div>'+
    '<p class="bp-offshore-dimensions-v1"><b>3D model scale / geometry</b><br>'+dimensions.map(safe).join('<br>')+
    '<br>'+safe(p.dimensionsNote||'Dimensions are estimates unless identified as source values.')+'</p>'+
    '<p class="bp-offshore-status-note-v1">'+
    (p.status?'The status above is reproduced from the matched NOAA OceanReports feature. It is not a real-time sensor feed.':
    'The NOAA location dataset includes known active producers and platforms whose production status could not be verified. It does not separate those states. BSEE is the official operational-status reference; check its current platform record before treating an asset as active.')+
    '</p><p class="bp-offshore-provenance-v1">Location source: '+safe(p.sourceName||'Not recorded')+
    (p.sourceRecord?' · source record '+safe(p.sourceRecord):'')+'</p>'+provenance+'</article>';
}
function bindInteractions(state) {
  if(state.interactionsBound)return;
  state.interactionsBound=true;
  const map=state.map;
  const click=e=>{
    if(!state.enabled)return;
    const layers=[ICON_ID,FOOTPRINT_LINE_ID,FOOTPRINT_ID,MARKER_ID];
    const hits=map.queryRenderedFeatures?.(e.point,{layers:layers.filter(id=>map.getLayer(id))})||[];
    const f=hits.find(x=>x.properties?.key);
    if(!f)return;
    const lib=window.maplibregl;
    if(lib?.Popup) {
      if(state.popup)state.popup.remove();
      state.popup=new lib.Popup({closeButton:true,closeOnClick:true,maxWidth:'360px',className:'bp-offshore-popup-wrap-v1'})
        .setLngLat(f.geometry?.type==='Point'?f.geometry.coordinates:e.lngLat)
        .setHTML(popupHtml(f)).addTo(map);
    } else if(window.__BP_SHOW_ACTION_NOTICE__)window.__BP_SHOW_ACTION_NOTICE__(popupHtml(f).replace(/<[^>]+>/g,' '));
  };
  map.on('click',click);
  map.on('moveend',()=>{if(state.enabled){rebuildModels(state);if(state.renderer)map.triggerRepaint?.()}});
  map.on('zoomend',()=>{if(state.enabled){rebuildModels(state);if(state.renderer)map.triggerRepaint?.()}});
}
function addControlGroup(state) {
  const dock=document.getElementById('bpv-dock-actions');
  if(!dock)return false;
  let group=document.getElementById('bp-offshore-energy-control-v1');
  if(group)return true;
  group=document.createElement('section');
  group.id='bp-offshore-energy-control-v1';
  group.className='bpv-command-group';
  group.setAttribute('data-bpv-command-section','offshore-energy');
  group.setAttribute('aria-label','Offshore oil and gas infrastructure');
  group.innerHTML=
    '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">⚓</span>'+
    '<span><b>OFFSHORE ENERGY</b><small>Oil and gas platforms, subsea wells and marine structures</small></span></div>'+
    '<div class="bpv-command-grid"><button id="bp-offshore-energy-toggle-v1" type="button" class="bpv-command-btn" aria-pressed="false" title="Toggle offshore oil and gas platforms and wells">'+
    '<span class="bpv-command-icon" aria-hidden="true">🛢️</span><span class="bpv-command-label">Offshore Oil & Gas</span></button></div>'+
    '<div id="bp-offshore-energy-count-v1" class="bpv-data-note">Not loaded · toggle on to load global assets</div>'+
    '<div id="bp-offshore-energy-status-v1" class="bpv-data-note">Layer off · existing globe layers are unchanged</div>'+
    '<style id="bp-offshore-energy-style-v1">'+
    '#bp-offshore-energy-control-v1 .bpv-data-note{font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere}'+
    '#bp-offshore-energy-toggle-v1.is-active{border-color:rgba(82,219,255,.7);background:rgba(22,78,94,.55);box-shadow:inset 0 0 0 1px rgba(82,219,255,.25)}'+
    '.bp-offshore-popup-wrap-v1 .maplibregl-popup-content{background:#071522;color:#e6f6fb;border:1px solid rgba(100,220,245,.35);border-radius:12px;padding:13px;font:12px/1.45 system-ui,sans-serif;max-height:min(72vh,620px);overflow:auto}'+
    '.bp-offshore-popup-v1 h3{font-size:16px;margin:3px 0 10px;color:#fff}.bp-offshore-kicker-v1{font-size:9px;letter-spacing:.12em;color:#6edcf4;font-weight:800}'+
    '.bp-offshore-grid-v1{display:grid;grid-template-columns:105px minmax(0,1fr);gap:5px 9px}.bp-offshore-grid-v1 span{color:#91adbb}.bp-offshore-grid-v1 b{overflow-wrap:anywhere;color:#f3fbff}'+
    '.bp-offshore-dimensions-v1,.bp-offshore-status-note-v1,.bp-offshore-provenance-v1{border-top:1px solid rgba(160,210,225,.16);padding-top:8px;margin:9px 0 0;color:#b6ccd6}'+
    '.bp-offshore-sources-v1{border-top:1px solid rgba(160,210,225,.16);padding-top:8px;margin-top:9px;font-size:10px}.bp-offshore-sources-v1 a{color:#63d9f4;text-decoration:underline;margin-right:3px}'+
    '</style>';
  const environment=dock.querySelector('[data-bpv-command-section="environment"]');
  if(environment&&environment.parentNode===dock)environment.after(group);else dock.appendChild(group);
  group.querySelector('#bp-offshore-energy-toggle-v1').addEventListener('click',()=>{
    void setEnabled(state,!state.enabled);
  });
  refreshStatusUi(state);
  return true;
}
async function loadAllData(state,force=false) {
  if(state.loading||state.dead||(!state.enabled&&!force)|| (state.globalLoaded&&!force))return;
  state.loading=true;setStatus(state,'Loading NOAA and global offshore platform/well records…');
  const tasks=await Promise.allSettled([fetchNoaaPlatforms(),fetchOverpass(globalOverpassQuery())]);
  if(state.dead){state.loading=false;return}
  const features=[];
  if(tasks[0].status==='fulfilled')for(const row of tasks[0].value) {
    const f=normalizeNoaaPlatform(row);if(f)features.push(f);
  }
  if(tasks[1].status==='fulfilled')for(const row of tasks[1].value) {
    const f=normalizeOffshoreOsmElement(row);
    if(f)features.push(f);
  }
  const noaaCount=features.filter(f=>f.properties.sourceName.indexOf('NOAA')===0).length;
  const osmCount=features.filter(f=>f.properties.sourceName.indexOf('OpenStreetMap')===0).length;
  if(noaaCount) {
    try {
      const statuses=await fetchNoaaStatuses();
      applyNoaaStatuses(features.filter(f=>f.properties.sourceName.indexOf('NOAA')===0),statuses);
      state.stats.statusRecords=statuses.length;
    } catch(e) {console.warn('BridgePoint offshore NOAA operational-status join unavailable',e)}
  }
  if(features.length) {
    mergeCollection(state,features);state.globalLoaded=true;state.lastUpdated=Date.now();
    const errors=[];
    if(tasks[0].status!=='fulfilled')errors.push('NOAA location service unavailable');
    if(tasks[1].status!=='fulfilled')errors.push('global OSM offshore features unavailable');
    setStatus(state,features.length.toLocaleString()+' offshore assets loaded · NOAA '+noaaCount.toLocaleString()+
      ' · global OSM '+osmCount.toLocaleString()+(errors.length?' · partial coverage: '+errors.join('; '):''));
    rebuildModels(state);if(state.renderer)state.map.triggerRepaint?.();
  } else {
    const reasons=tasks.map(x=>x.status==='rejected'?String(x.reason?.message||x.reason):'');
    setStatus(state,'Offshore sources unavailable. Toggle off/on to retry. '+reasons.filter(Boolean).join(' · '));
  }
  state.loading=false;refreshStatusUi(state);
}
async function setEnabled(state,on) {
  state.enabled=!!on;setVisibility(state,state.enabled);
  if(state.enabled) {
    installLayers(state);refreshStatusUi(state);
    if(state.THREE)installModelLayer(state);
    else if(!state.threeLoading) {
      state.threeLoading=true;
      loadThree().then(THREE=>{if(state.dead)return;state.THREE=THREE;state.threeLoading=false;if(state.enabled&&state.map.getStyle?.())installModelLayer(state);rebuildModels(state);state.map.triggerRepaint?.()})
        .catch(e=>{state.threeLoading=false;state.stats.lastError=String(e?.message||e);console.warn('BridgePoint offshore Three.js unavailable',e) });
    }
    void loadAllData(state);
    if(state.renderer)state.map.triggerRepaint?.();
  } else {
    if(state.popup){state.popup.remove();state.popup=null}
    state.models.forEach(x=>{x.root.visible=false});
    setStatus(state,'Layer off · all other BridgePoint layers remain unchanged');
    if(state.renderer)state.map.triggerRepaint?.();
  }
  refreshStatusUi(state);return state.enabled;
}
function install(map,state) {
  if(!map?.getStyle?.())return;
  if(!installLayers(state))return;
  bindInteractions(state);
  if(state.enabled) {
    if(state.THREE)installModelLayer(state);
    if(!state.globalLoaded)void loadAllData(state);
  }
}
export function initOffshoreEnergyRenderer(target) {
  const map=target&&(target.map||target);
  if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
  const existing=MAP_STATES.get(map);if(existing)return existing.api;
  const state={
    map,enabled:false,dead:false,loading:false,globalLoaded:false,installed:false,layerInstalling:false,
    THREE:null,threeLoading:false,scene:null,camera:null,renderer:null,models:[],modelSignature:'',
    featureCache:new Map(),collection:EMPTY,footprints:EMPTY,popup:null,interactionsBound:false,
    status:'off',lastUpdated:null,refreshTimer:0,
    stats:{version:VERSION,sourceFeatures:0,noaaFeatures:0,osmFeatures:0,statusRecords:0,renderedModels:0,layerReady:false,lastError:null}
  };
  const api={
    version:VERSION,
    get enabled(){return state.enabled},
    get status(){return state.status},
    get stats(){return Object.assign({},state.stats)},
    get features(){return state.collection.features.length},
    get displayMode(){return offshoreRenderModeForZoom(map.getZoom())},
    toggle(){return setEnabled(state,!state.enabled)},
    setEnabled(on){return setEnabled(state,on)},
    refresh(){state.globalLoaded=false;return loadAllData(state,true)},
    destroy(){state.dead=true;if(state.refreshTimer)clearTimeout(state.refreshTimer);if(state.popup)state.popup.remove();
      for(const item of state.models){state.scene?.remove(item.root);disposeObject(item.root)}state.models=[]}
  };
  state.api=api;MAP_STATES.set(map,state);window.__BP_OFFSHORE_ENERGY_V1__=api;
  const ready=()=>install(map,state);
  map.on('style.load',ready);map.on('load',ready);
  if(map.isStyleLoaded?.())ready();
  if(!state.refreshTimer)state.refreshTimer=setInterval(()=>{
    if(state.enabled&&!document.hidden&&Date.now()-(state.lastUpdated||0)>30*60*1000) {
      state.globalLoaded=false;void loadAllData(state);
    }
  },60*1000);
  const observeDock=()=>{if(addControlGroup(state))return;setTimeout(observeDock,500)};
  observeDock();
  const dockObserver=new MutationObserver(()=>{if(!document.getElementById('bp-offshore-energy-control-v1'))addControlGroup(state)});
  if(document.body)dockObserver.observe(document.body,{childList:true,subtree:true});
  return api;
}
