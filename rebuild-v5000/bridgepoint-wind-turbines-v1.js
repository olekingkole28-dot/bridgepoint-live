/* BridgePoint USGS Wind Turbines v1.
 * Independent opt-in layer for utility-scale U.S. wind turbines.
 * Positions and published engineering fields come from USWTDB; no dimensions are invented.
 */
const VERSION = 1;
const MAP_STATES = new WeakMap();
let threePromise = null;
const THREE_URL = '/vendor/three.module.js?v=169-local';
const API_URL = 'https://energy.usgs.gov/api/uswtdb/v1/turbines';
const SOURCE_URL = 'https://energy.usgs.gov/uswtdb/';
const VIEWER_URL = 'https://eerscmap.usgs.gov/uswtdb/viewer/';
const SOURCE_VERSION = '9.1 · 2026-09-28';
const PAGE_SIZE = 2500;
const MAX_ROWS = 100000;
const SOURCE_FIELDS = [
  'case_id','faa_ors','faa_asn','usgs_pr_id','eia_id',
  't_state','t_county','t_fips','p_name','p_year','p_tnum','p_cap',
  't_manu','t_model','t_cap','t_hh','t_rd','t_rsa','t_ttlh',
  't_retrofit','t_retro_yr','t_offshore','t_conf_atr','t_conf_loc',
  't_img_date','t_img_src','xlong','ylat'
].join(',');
const SOURCE_ID = 'bp-wind-turbines-source-v1';
const CLUSTER_ID = 'bp-wind-turbines-clusters-v1';
const CLUSTER_COUNT_ID = 'bp-wind-turbines-cluster-count-v1';
const HALO_ID = 'bp-wind-turbines-halo-v1';
const MARKER_ID = 'bp-wind-turbines-markers-v1';
const LABEL_ID = 'bp-wind-turbines-labels-v1';
const MODEL_ID = 'bp-wind-turbines-models-v1';
const MIN_MODEL_ZOOM = 11.6;
const MAX_MODELS = typeof window !== 'undefined' &&
  ((Number(window.innerWidth) || 1024) <= 820 ||
   (typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints) > 0)) ? 8 : 20;
const RAD = Math.PI / 180;
const TAU = Math.PI * 2;
const EMPTY = { type:'FeatureCollection', features:[] };

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function positive(value, max) {
  const n = finite(value);
  return n !== null && n > 0 && n <= max ? n : null;
}
function boolValue(value) {
  if (value === true || value === 1) return true;
  const s = String(value === null || value === undefined ? '' : value).trim().toLowerCase();
  return ['1','true','yes','y','offshore'].includes(s);
}
function textValue(value, fallback) {
  const s = String(value === null || value === undefined ? '' : value).trim();
  return s ? s.slice(0, 220) : (fallback || '');
}
function fmt(value, digits) {
  const n = finite(value);
  return n === null ? 'Not reported' : n.toLocaleString('en-US', {
    maximumFractionDigits: digits === undefined ? 1 : digits
  });
}
function fmtCapacity(value) {
  const kw = positive(value, 1000000);
  if (kw === null) return 'Not reported';
  return fmt(kw, 0) + ' kW (' + fmt(kw / 1000, 2) + ' MW)';
}
function safe(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

export function normalizeWindTurbine(row) {
  if (!row || typeof row !== 'object') return null;
  const longitude = finite(row.xlong);
  const latitude = finite(row.ylat);
  if (longitude === null || latitude === null ||
      longitude < -180 || longitude > 180 || latitude < -85 || latitude > 85) return null;
  const id = textValue(row.case_id || row.usgs_pr_id || row.eia_id ||
    (longitude.toFixed(6) + '/' + latitude.toFixed(6)));
  const hubHeightM = positive(row.t_hh, 400);
  const rotorDiameterM = positive(row.t_rd, 350);
  const totalTipHeightM = positive(row.t_ttlh, 600);
  const capacityKw = positive(row.t_cap, 30000);
  const sweptAreaM2 = positive(row.t_rsa, 200000);
  const projectCapacity = positive(row.p_cap, 1000000);
  const projectYear = finite(row.p_year);
  const projectTurbineCount = positive(row.p_tnum, 100000);
  const retrofitYear = finite(row.t_retro_yr);
  const offshore = boolValue(row.t_offshore);
  const hasMeasuredHub = hubHeightM !== null;
  const hasMeasuredRotor = rotorDiameterM !== null;
  const name = textValue(row.p_name, 'Unnamed wind project');
  const manufacturer = textValue(row.t_manu, 'Not reported');
  const model = textValue(row.t_model, 'Not reported');
  const state = textValue(row.t_state, '');
  const county = textValue(row.t_county, '');
  return {
    type:'Feature',
    id:id,
    geometry:{type:'Point',coordinates:[longitude,latitude]},
    properties:{
      key:id, caseId:id, name:name, manufacturer:manufacturer, model:model,
      hubHeightM:hubHeightM, rotorDiameterM:rotorDiameterM,
      totalTipHeightM:totalTipHeightM, capacityKw:capacityKw,
      sweptAreaM2:sweptAreaM2, projectCapacity:projectCapacity,
      projectYear:projectYear, projectTurbineCount:projectTurbineCount,
      state:state, county:county, fips:textValue(row.t_fips,''),
      offshore:offshore, retrofit:boolValue(row.t_retrofit),
      retrofitYear:retrofitYear, attributeConfidence:textValue(row.t_conf_atr,'Not reported'),
      locationConfidence:textValue(row.t_conf_loc,'Not reported'),
      imageDate:textValue(row.t_img_date,'Not reported'),
      imageSource:textValue(row.t_img_src,'Not reported'),
      faaOrs:textValue(row.faa_ors,''), faaAsn:textValue(row.faa_asn,''),
      usgsProjectId:textValue(row.usgs_pr_id,''), eiaId:textValue(row.eia_id,''),
      dimensionsKnown:hasMeasuredHub && hasMeasuredRotor,
      markerColor:offshore?'#67d6ff':'#f4cf72',
      sourceName:'U.S. Wind Turbine Database · USGS, LBNL and ACP',
      sourceVersion:SOURCE_VERSION
    }
  };
}

export function windTurbineRenderModeForZoom(value) {
  const zoom = Number(value) || 0;
  if (zoom < 5) return 'clustered-global-overview';
  if (zoom < MIN_MODEL_ZOOM) return 'ground-anchored-turbine-icons';
  return 'measured-dimension-3d-turbines';
}

export function windTurbinePopupHtml(feature) {
  const p = feature && feature.properties || {};
  const c = feature && feature.geometry && feature.geometry.coordinates || [0,0];
  const turbineTitle = [p.manufacturer, p.model].filter(x => x && x !== 'Not reported').join(' ') ||
    'Utility-scale wind turbine';
  const rows = [
    ['Project',p.name || 'Not reported'],
    ['Manufacturer',p.manufacturer || 'Not reported'],
    ['Turbine model',p.model || 'Not reported'],
    ['Turbine capacity',fmtCapacity(p.capacityKw)],
    ['Hub height',p.hubHeightM === null ? 'Not reported' : fmt(p.hubHeightM,2)+' m'],
    ['Rotor diameter',p.rotorDiameterM === null ? 'Not reported' : fmt(p.rotorDiameterM,2)+' m'],
    ['Total tip height',p.totalTipHeightM === null ? 'Not reported' : fmt(p.totalTipHeightM,2)+' m'],
    ['Rotor swept area',p.sweptAreaM2 === null ? 'Not reported' : fmt(p.sweptAreaM2,1)+' m²'],
    ['Project year',p.projectYear === null ? 'Not reported' : fmt(p.projectYear,0)],
    ['Project turbine count',p.projectTurbineCount === null ? 'Not reported' : fmt(p.projectTurbineCount,0)],
    ['Location',[p.county,p.state].filter(Boolean).join(', ') || 'Not reported'],
    ['Installation',p.offshore?'Offshore':'Onshore'],
    ['Retrofit',p.retrofit ? ('Yes'+(p.retrofitYear?' · '+fmt(p.retrofitYear,0):'')) : 'Not reported / not flagged'],
    ['USGS attribute confidence',p.attributeConfidence || 'Not reported'],
    ['USGS location confidence',p.locationConfidence || 'Not reported'],
    ['Database case ID',p.caseId || p.key],
    ['Coordinates',Number(c[1]).toFixed(6)+', '+Number(c[0]).toFixed(6)]
  ];
  const dimensionNote = p.dimensionsKnown
    ? 'Hub height and rotor diameter are source-reported USWTDB measurements. The animated blade rotation is a visual aid; it is not a live RPM or wind-speed reading.'
    : 'One or more engineering dimensions are absent from this source record. Any missing dimension used to draw the close-up model is schematic and is not presented as a measured specification.';
  const mapLink = '<a href="'+VIEWER_URL+'" target="_blank" rel="noopener noreferrer">Open USGS turbine map</a>';
  const sourceLink = '<a href="'+SOURCE_URL+'" target="_blank" rel="noopener noreferrer">USWTDB source and downloads</a>';
  return '<article class="bp-wind-popup-v1">'+
    '<div class="bp-wind-kicker-v1">BRIDGEPOINT WIND INFRASTRUCTURE · USGS USWTDB '+safe(SOURCE_VERSION)+'</div>'+
    '<h3>'+safe(turbineTitle)+'</h3>'+
    '<div class="bp-wind-grid-v1">'+rows.map(r=>'<span>'+safe(r[0])+'</span><b>'+safe(r[1])+'</b>').join('')+'</div>'+
    '<p class="bp-wind-note-v1">'+safe(dimensionNote)+'</p>'+
    '<p class="bp-wind-note-v1">The USWTDB is a United States inventory. The global globe view shows the database’s U.S. locations; it does not imply worldwide source coverage. Turbine support geometry is a representative 3D rendering, while the published dimensional fields above remain source values.</p>'+
    '<div class="bp-wind-links-v1">'+mapLink+' · '+sourceLink+'</div></article>';
}

function makeIcon() {
  const canvas = document.createElement('canvas');
  canvas.width = 96; canvas.height = 96;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Wind turbine icon canvas unavailable');
  ctx.clearRect(0,0,96,96);
  ctx.save(); ctx.translate(48,48);
  ctx.shadowColor = 'rgba(244,207,114,.82)'; ctx.shadowBlur = 12;
  ctx.strokeStyle = '#fff0bf'; ctx.fillStyle = '#f4cf72';
  ctx.lineWidth = 6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(48,15); ctx.lineTo(48,81); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(48,17); ctx.lineTo(22,6); ctx.lineTo(27,28); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(48,17); ctx.lineTo(71,31); ctx.lineTo(53,38); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(48,17); ctx.lineTo(39,43); ctx.lineTo(28,27); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.arc(48,17,7,0,TAU); ctx.fill();
  ctx.beginPath(); ctx.moveTo(35,83); ctx.lineTo(61,83); ctx.stroke();
  ctx.restore();
  return ctx.getImageData(0,0,96,96);
}

async function requestPage(offset) {
  const url = new URL(API_URL);
  url.searchParams.set('select',SOURCE_FIELDS);
  url.searchParams.set('limit',String(PAGE_SIZE));
  url.searchParams.set('offset',String(offset));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(url.toString(),{
      method:'GET',mode:'cors',credentials:'omit',cache:'no-store',
      headers:{'Accept':'application/json'},signal:controller.signal
    });
    if (!response.ok) throw new Error('USWTDB HTTP '+response.status);
    const data = await response.json();
    const rows = Array.isArray(data) ? data :
      (data && Array.isArray(data.features) ? data.features.map(f=>Object.assign({},f.properties||{},{
        xlong:f.geometry && f.geometry.coordinates && f.geometry.coordinates[0],
        ylat:f.geometry && f.geometry.coordinates && f.geometry.coordinates[1]
      })) : null);
    if (!rows) throw new Error('USWTDB returned an unexpected response shape');
    const range = response.headers && (response.headers.get('Content-Range') || response.headers.get('content-range'));
    const match = range && String(range).match(/\/\s*(\d+)\s*$/);
    return {rows:rows,total:match?Number(match[1]):null};
  } finally { clearTimeout(timer); }
}

function modelMatrixFor(map,THREE,coordinate,altitude) {
  try {
    const raw = map.transform && typeof map.transform.getMatrixForModel === 'function'
      ? map.transform.getMatrixForModel([Number(coordinate[0]),Number(coordinate[1])],Number(altitude)||0) : null;
    if (raw && raw.length >= 16) return new THREE.Matrix4().fromArray(raw);
    const Mercator = window.maplibregl && window.maplibregl.MercatorCoordinate;
    if (!Mercator || typeof Mercator.fromLngLat !== 'function') return null;
    const mc = Mercator.fromLngLat([Number(coordinate[0]),Number(coordinate[1])],Number(altitude)||0);
    const metres = mc.meterInMercatorCoordinateUnits();
    if (![mc.x,mc.y,mc.z,metres].every(Number.isFinite) || metres <= 0) return null;
    return new THREE.Matrix4().set(
      metres,0,0,mc.x,
      0,0,metres,mc.y,
      0,metres,0,mc.z,
      0,0,0,1
    );
  } catch (_) { return null; }
}

function bladeGeometry(THREE,radius) {
  const r = Math.max(8,Number(radius)||50);
  const rootWidth = Math.max(2.8,r*0.075);
  const midWidth = Math.max(1.25,r*0.027);
  const tipWidth = Math.max(0.12,r*0.003);
  const shape = new THREE.Shape();
  shape.moveTo(-rootWidth*0.42,0);
  shape.bezierCurveTo(-rootWidth*0.8,r*0.10,-midWidth*1.25,r*0.35,-tipWidth,r);
  shape.lineTo(tipWidth,r);
  shape.bezierCurveTo(midWidth*1.15,r*0.53,rootWidth*0.88,r*0.18,rootWidth*0.42,0);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape,14);
  geometry.rotateY(Math.PI/2);
  return geometry;
}
function addTurbineModel(THREE,feature) {
  const p = feature.properties || {};
  const measuredHub = positive(p.hubHeightM,400);
  const measuredRotor = positive(p.rotorDiameterM,350);
  const radius = measuredRotor ? measuredRotor/2 : 55;
  const hubHeight = measuredHub || (positive(p.totalTipHeightM,600) ? Math.max(25,p.totalTipHeightM-radius) : 85);
  const root = new THREE.Group();
  root.name = 'BridgePoint wind turbine '+String(p.caseId||p.name||'');
  root.matrixAutoUpdate = false;
  const white = new THREE.MeshStandardMaterial({color:0xe8edf0,roughness:0.62,metalness:0.18,side:THREE.DoubleSide});
  const bladeMat = new THREE.MeshStandardMaterial({color:0xf4f6f6,roughness:0.52,metalness:0.12,side:THREE.DoubleSide});
  const dark = new THREE.MeshStandardMaterial({color:0x35414a,roughness:0.42,metalness:0.62});
  const base = new THREE.Mesh(new THREE.CylinderGeometry(3.1,4.0,2.2,18),dark);
  base.position.y = 1.1; base.frustumCulled = false; root.add(base);
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.55,3.1,hubHeight-1.0,24,2,false),white);
  tower.position.y = (hubHeight+1.0)/2; tower.frustumCulled = false; root.add(tower);
  const towerBand = new THREE.Mesh(new THREE.CylinderGeometry(1.62,1.75,1.1,20),dark);
  towerBand.position.y = hubHeight*0.72; root.add(towerBand);
  const nacelle = new THREE.Mesh(new THREE.BoxGeometry(13,5.2,4.6),white);
  nacelle.position.set(5.2,hubHeight,0); nacelle.frustumCulled = false; root.add(nacelle);
  const rotorCenter = -2.0;
  const rotorGroup = new THREE.Group();
  rotorGroup.position.set(rotorCenter,hubHeight,0);
  const blade = bladeGeometry(THREE,radius);
  for (let i=0;i<3;i++) {
    const mesh = new THREE.Mesh(blade,bladeMat);
    mesh.rotation.x = i*TAU/3;
    mesh.frustumCulled = false; rotorGroup.add(mesh);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(Math.max(1.5,radius*0.035),18,14),white);
  hub.frustumCulled = false; rotorGroup.add(hub);
  const spinner = new THREE.Mesh(new THREE.CylinderGeometry(Math.max(0.8,radius*0.018),Math.max(0.8,radius*0.018),4.5,16),dark);
  spinner.rotation.z = Math.PI/2; spinner.position.x = -1.7; rotorGroup.add(spinner);
  root.add(rotorGroup);
  const coordinate = feature.geometry.coordinates;
  return {
    root:root, rotor:rotorGroup, coordinate:coordinate,
    groundElevationM:null, hubHeightM:hubHeight, rotorDiameterM:radius*2,
    dimensionsKnown:measuredHub!==null && measuredRotor!==null
  };
}
function disposeObject(root) {
  if (!root) return;
  root.traverse(o=>{
    if (o.geometry && o.geometry.dispose) o.geometry.dispose();
    if (o.material) for (const m of Array.isArray(o.material)?o.material:[o.material]) {
      if (m && m.dispose) m.dispose();
    }
  });
}

function addFeatures(state,rows) {
  let added = 0;
  for (const row of rows || []) {
    const feature = row && row.type === 'Feature' ? row : normalizeWindTurbine(row);
    if (!feature || !feature.id) continue;
    const key = String(feature.id);
    if (!state.featureCache.has(key)) added++;
    state.featureCache.set(key,feature);
  }
  if (added || (rows && rows.length)) {
    state.collection = {type:'FeatureCollection',features:[...state.featureCache.values()]};
    const source = state.map.getSource(SOURCE_ID);
    if (source && source.setData) source.setData(state.collection);
    state.stats.total = state.collection.features.length;
    state.stats.measuredHubHeights = state.collection.features.filter(f=>f.properties.hubHeightM!==null).length;
    state.stats.measuredRotorDiameters = state.collection.features.filter(f=>f.properties.rotorDiameterM!==null).length;
    rebuildModels(state);
    if (state.renderer) state.map.triggerRepaint && state.map.triggerRepaint();
  }
}

function installLayers(state) {
  const map = state.map;
  if (!map || !map.getStyle || !map.getStyle()) return false;
  try {
    if (!map.getSource(SOURCE_ID)) map.addSource(SOURCE_ID,{
      type:'geojson',data:state.collection,cluster:true,clusterRadius:42,clusterMaxZoom:4,
      attribution:'U.S. Wind Turbine Database · USGS, Lawrence Berkeley National Laboratory and ACP'
    });
    if (!map.hasImage || !map.hasImage('bp-wind-turbine-icon-v1')) {
      map.addImage('bp-wind-turbine-icon-v1',makeIcon(),{pixelRatio:2});
    }
    const add = (id,layer)=>{if(!map.getLayer(id))map.addLayer(layer)};
    add(CLUSTER_ID,{
      id:CLUSTER_ID,type:'circle',source:SOURCE_ID,filter:['has','point_count'],
      paint:{
        'circle-color':['step',['get','point_count'],'#d5b25b',25,'#dfa63d',150,'#cb8135',600,'#a85836'],
        'circle-radius':['step',['get','point_count'],11,10,14,50,19,200,25,1000,31],
        'circle-stroke-color':'#fff0bc','circle-stroke-width':1.25,'circle-opacity':0.96
      }
    });
    add(CLUSTER_COUNT_ID,{
      id:CLUSTER_COUNT_ID,type:'symbol',source:SOURCE_ID,filter:['has','point_count'],
      layout:{'text-field':['get','point_count_abbreviated'],'text-font':['Open Sans Bold','Arial Unicode MS Bold'],
        'text-size':['interpolate',['linear'],['zoom'],0,8,4,12],
        'text-allow-overlap':true,'text-ignore-placement':true},
      paint:{'text-color':'#101720','text-halo-color':'#fff2c8','text-halo-width':0.45}
    });
    add(HALO_ID,{
      id:HALO_ID,type:'circle',source:SOURCE_ID,filter:['!',['has','point_count']],
      minzoom:4,maxzoom:12,
      paint:{'circle-radius':['interpolate',['linear'],['zoom'],4,3.5,8,6,11.5,8],
        'circle-color':['get','markerColor'],'circle-opacity':0.32,'circle-blur':0.55}
    });
    add(MARKER_ID,{
      id:MARKER_ID,type:'symbol',source:SOURCE_ID,filter:['!',['has','point_count']],
      minzoom:4,maxzoom:MIN_MODEL_ZOOM+0.2,
      layout:{
        'icon-image':'bp-wind-turbine-icon-v1',
        'icon-size':['interpolate',['linear'],['zoom'],4,0.15,7,0.24,10,0.42,11.6,0.56],
        'icon-anchor':'bottom','icon-pitch-alignment':'map','icon-rotation-alignment':'map',
        'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-padding':0
      },
      paint:{'icon-opacity':1}
    });
    add(LABEL_ID,{
      id:LABEL_ID,type:'symbol',source:SOURCE_ID,filter:['!',['has','point_count']],
      minzoom:13,maxzoom:24,
      layout:{'text-field':['coalesce',['get','model'],['get','name'],'Wind turbine'],
        'text-font':['Open Sans Semibold','Arial Unicode MS Bold'],
        'text-size':['interpolate',['linear'],['zoom'],13,9,16,12,19,14],
        'text-offset':[0,1.2],'text-anchor':'top','text-optional':true,
        'text-allow-overlap':false,'text-ignore-placement':false},
      paint:{'text-color':'#f7fbff','text-halo-color':'#071522','text-halo-width':1.5}
    });
    if (state.THREE) installModelLayer(state);
    setVisibility(state,state.enabled);
    return true;
  } catch (error) {
    state.stats.lastError = String(error && error.message || error);
    console.warn('BridgePoint wind turbine map layers unavailable',error);
    return false;
  }
}
function setVisibility(state,on) {
  for (const id of [CLUSTER_ID,CLUSTER_COUNT_ID,HALO_ID,MARKER_ID,LABEL_ID,MODEL_ID]) {
    try {if (state.map.getLayer(id)) state.map.setLayoutProperty(id,'visibility',on?'visible':'none');} catch (_) {}
  }
}

function modelCandidates(state) {
  if (Number(state.map.getZoom()||0) < MIN_MODEL_ZOOM) return [];
  const bounds = state.map.getBounds && state.map.getBounds();
  const center = state.map.getCenter && state.map.getCenter();
  if (!bounds || !center) return [];
  const rows = [];
  for (const f of state.collection.features) {
    const c = f.geometry.coordinates;
    try {if (!bounds.contains(c)) continue;} catch (_) {continue;}
    const cos = Math.max(0.12,Math.cos(c[1]*RAD));
    const dx = (c[0]-center.lng)*111320*cos;
    const dy = (c[1]-center.lat)*110540;
    rows.push({feature:f,distance:dx*dx+dy*dy});
  }
  rows.sort((a,b)=>a.distance-b.distance);
  return rows.slice(0,MAX_MODELS).map(x=>x.feature);
}
function rebuildModels(state) {
  if (!state.THREE || !state.scene || state.dead) return;
  const rows = modelCandidates(state);
  const signature = rows.map(f=>f.id).join('|');
  if (signature === state.modelSignature) return;
  for (const item of state.models) {
    state.scene.remove(item.root);
    disposeObject(item.root);
  }
  state.models = []; state.modelSignature = signature;
  for (const feature of rows) {
    try {
      const item = addTurbineModel(state.THREE,feature);
      state.scene.add(item.root); state.models.push(item);
    } catch (error) {console.warn('BridgePoint turbine model skipped',feature.id,error);}
  }
  state.stats.models = state.models.length;
}
function installModelLayer(state) {
  const map = state.map;
  if (map.getLayer(MODEL_ID) || state.layerInstalling) return;
  state.layerInstalling = true;
  const THREE = state.THREE;
  const layer = {
    id:MODEL_ID,type:'custom',renderingMode:'3d',
    onAdd(mapRef,gl) {
      if (state.renderer) return;
      const renderer = new THREE.WebGLRenderer({
        canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'
      });
      renderer.autoClear = false;
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      state.renderer = renderer; state.camera = new THREE.Camera(); state.scene = new THREE.Scene();
      state.scene.add(new THREE.AmbientLight(0xffffff,1.28));
      const key = new THREE.DirectionalLight(0xfff5df,1.42);
      key.position.set(-0.6,1.6,0.85); state.scene.add(key);
      state.stats.layerReady = true; rebuildModels(state);
    },
    render(gl,args) {
      if (!state.enabled || !state.renderer || !state.scene || !state.camera) return;
      const raw = args && (args.defaultProjectionData && args.defaultProjectionData.mainMatrix || args.modelViewProjectionMatrix);
      if (!raw || raw.length < 16) return;
      const projection = new THREE.Matrix4().fromArray(raw);
      const now = Date.now();
      const zoom = Number(map.getZoom()||0);
      let animated = false;
      for (const item of state.models) item.root.visible = false;
      if (zoom >= MIN_MODEL_ZOOM) for (const item of state.models) {
        if (item.groundElevationM === null) {
          try {
            const terrain = map.queryTerrainElevation &&
              map.queryTerrainElevation({lng:item.coordinate[0],lat:item.coordinate[1]},{exaggerated:false});
            if (Number.isFinite(terrain)) item.groundElevationM = terrain;
          } catch (_) {}
        }
        const altitude = Number.isFinite(item.groundElevationM) ? item.groundElevationM : 0;
        const matrix = modelMatrixFor(map,THREE,item.coordinate,altitude);
        if (!matrix) continue;
        item.rotor.rotation.x = ((now/1000)*0.52)%TAU;
        item.root.visible = true;
        state.camera.projectionMatrix.copy(projection).multiply(matrix);
        try {
          state.renderer.resetState();
          state.renderer.render(state.scene,state.camera);
          animated = true;
        } catch (error) {
          if (!state.renderWarned) {
            state.renderWarned = true;
            console.warn('BridgePoint wind turbine 3D renderer',error);
          }
        } finally {item.root.visible = false;}
      }
      if (animated && !state.animationTimer && !document.hidden) {
        state.animationTimer = setTimeout(()=>{
          state.animationTimer = 0;
          if (!state.dead && state.enabled && !document.hidden && map.triggerRepaint) map.triggerRepaint();
        },80);
      }
    },
    onRemove() {
      try {if (state.renderer) state.renderer.dispose();} catch (_) {}
      state.renderer = null; state.camera = null; state.scene = null;
      state.stats.layerReady = false; state.layerInstalling = false;
    }
  };
  try {
    map.addLayer(layer);
    state.stats.layerReady = !!map.getLayer(MODEL_ID);
  } catch (error) {
    state.stats.lastError = String(error && error.message || error);
    console.warn('BridgePoint turbine 3D layer could not attach',error);
  } finally {state.layerInstalling = false;}
}
function loadThree() {
  if (!threePromise) threePromise = import(THREE_URL).then(m=>m.default||m);
  return threePromise;
}

function updateStatus(state,message) {
  state.status = message;
  const status = document.getElementById('bp-wind-turbines-status-v1');
  if (status) status.textContent = message;
  const count = document.getElementById('bp-wind-turbines-count-v1');
  if (count) count.textContent = state.stats.total.toLocaleString('en-US')+' USGS turbine records loaded';
}
function refreshStatusUi(state) {
  updateStatus(state,state.status);
  const count = document.getElementById('bp-wind-turbines-count-v1');
  if (count) count.textContent = state.stats.total.toLocaleString('en-US')+
    ' turbines · '+state.stats.measuredHubHeights.toLocaleString('en-US')+' hub heights · '+
    state.stats.measuredRotorDiameters.toLocaleString('en-US')+' rotor diameters';
  const button = document.getElementById('bp-wind-turbines-toggle-v1');
  if (button) {
    button.setAttribute('aria-pressed',String(state.enabled));
    button.classList.toggle('is-active',state.enabled);
  }
}
function addControlGroup(state) {
  const dock = document.getElementById('bpv-dock-actions');
  if (!dock) return false;
  if (document.getElementById('bp-wind-turbines-control-v1')) return true;
  const group = document.createElement('section');
  group.id = 'bp-wind-turbines-control-v1';
  group.className = 'bpv-command-group';
  group.setAttribute('data-bpv-command-section','wind-turbines');
  group.setAttribute('aria-label','USGS utility-scale wind turbines');
  group.innerHTML =
    '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">🌬️</span>'+
    '<span><b>WIND TURBINES</b><small>USGS utility-scale turbine locations and measured engineering dimensions · U.S. coverage</small></span></div>'+
    '<div class="bpv-command-grid"><button id="bp-wind-turbines-toggle-v1" type="button" class="bpv-command-btn" aria-pressed="false" title="Show U.S. wind turbine locations and animated 3D turbine models">'+
    '<span class="bpv-command-icon" aria-hidden="true">🌀</span><span class="bpv-command-label">Wind Turbines</span></button></div>'+
    '<div id="bp-wind-turbines-count-v1" class="bpv-data-note">Not loaded · select to load USGS turbine inventory</div>'+
    '<div id="bp-wind-turbines-status-v1" class="bpv-data-note">Layer off · all existing BridgePoint layers remain unchanged</div>'+
    '<style id="bp-wind-turbines-style-v1">'+
    '#bp-wind-turbines-control-v1 .bpv-data-note{font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere}'+
    '#bp-wind-turbines-toggle-v1.is-active{border-color:rgba(244,207,114,.78);background:rgba(91,70,28,.56);box-shadow:inset 0 0 0 1px rgba(244,207,114,.22)}'+
    '.bp-wind-popup-wrap-v1 .maplibregl-popup-content{background:#071522;color:#e6f6fb;border:1px solid rgba(244,207,114,.42);border-radius:12px;padding:13px;font:12px/1.45 system-ui,sans-serif;max-height:min(72vh,620px);overflow:auto}'+
    '.bp-wind-popup-v1 h3{font-size:16px;margin:3px 0 10px;color:#fff}.bp-wind-kicker-v1{font-size:9px;letter-spacing:.1em;color:#f4cf72;font-weight:800}'+
    '.bp-wind-grid-v1{display:grid;grid-template-columns:142px minmax(0,1fr);gap:5px 9px}.bp-wind-grid-v1 span{color:#91adbb}.bp-wind-grid-v1 b{overflow-wrap:anywhere;color:#f3fbff}'+
    '.bp-wind-note-v1,.bp-wind-links-v1{border-top:1px solid rgba(160,210,225,.16);padding-top:8px;margin:9px 0 0;color:#b6ccd6}.bp-wind-links-v1 a{color:#f4cf72;text-decoration:underline;margin-right:3px}'+
    '</style>';
  const wells = document.getElementById('bp-subsurface-wells-control-v1');
  const offshore = document.getElementById('bp-offshore-energy-control-v1');
  if (wells && wells.parentNode === dock) wells.after(group);
  else if (offshore && offshore.parentNode === dock) offshore.after(group);
  else dock.appendChild(group);
  group.querySelector('#bp-wind-turbines-toggle-v1')
    .addEventListener('click',()=>{void setEnabled(state,!state.enabled);});
  refreshStatusUi(state);
  return true;
}

async function loadInitialData(state) {
  if (state.loading || state.dead || state.globalLoaded || !state.enabled) return;
  state.loading = true;
  updateStatus(state,'Connecting to USGS USWTDB v'+SOURCE_VERSION+'…');
  let offset = 0;
  let total = null;
  let added = 0;
  try {
    while (offset < MAX_ROWS && !state.dead) {
      const page = await requestPage(offset);
      if (total === null && Number.isFinite(page.total)) total = page.total;
      if (!page.rows.length) break;
      const features = page.rows.map(normalizeWindTurbine).filter(Boolean);
      addFeatures(state,features);
      added += features.length;
      offset += page.rows.length;
      const totalLabel = total ? ' / '+total.toLocaleString('en-US') : '';
      updateStatus(state,'Loading USGS turbines · '+offset.toLocaleString('en-US')+totalLabel+' source rows scanned · '+added.toLocaleString('en-US')+' mapped');
      if (total !== null && offset >= total) break;
      if (page.rows.length < PAGE_SIZE && total === null) {
        // Continue one more page to handle servers that enforce a lower page-size cap.
        const next = await requestPage(offset);
        if (!next.rows.length) break;
        const nextFeatures = next.rows.map(normalizeWindTurbine).filter(Boolean);
        addFeatures(state,nextFeatures);
        added += nextFeatures.length;
        offset += next.rows.length;
        if (Number.isFinite(next.total)) total = next.total;
        if (total !== null && offset >= total) break;
        if (next.rows.length < PAGE_SIZE && total === null) break;
      }
    }
    if (state.dead) return;
    state.globalLoaded = offset > 0;
    state.lastUpdated = Date.now();
    if (!state.globalLoaded) throw new Error('The USGS turbine API returned no turbine rows');
    updateStatus(state,state.stats.total.toLocaleString('en-US')+' USGS turbine locations loaded · source coverage: United States only · '+SOURCE_VERSION);
  } catch (error) {
    state.stats.lastError = String(error && error.message || error);
    updateStatus(state,(state.stats.total ? 'Partial inventory: '+state.stats.total.toLocaleString('en-US')+' records · ' : '')+
      'USGS data request failed: '+state.stats.lastError);
    console.warn('BridgePoint USWTDB load failed',error);
  } finally {
    state.loading = false;
    refreshStatusUi(state);
  }
}
async function setEnabled(state,on) {
  state.enabled = !!on;
  setVisibility(state,state.enabled);
  if (state.enabled) {
    installLayers(state);
    bindInteractions(state);
    refreshStatusUi(state);
    if (state.THREE) installModelLayer(state);
    else if (!state.threeLoading) {
      state.threeLoading = true;
      loadThree().then(THREE=>{
        if (state.dead) return;
        state.THREE = THREE; state.threeLoading = false;
        if (state.enabled && state.map.getStyle && state.map.getStyle()) installModelLayer(state);
        rebuildModels(state);
        if (state.map.triggerRepaint) state.map.triggerRepaint();
      }).catch(error=>{
        state.threeLoading = false;
        updateStatus(state,'3D turbine renderer unavailable: '+String(error && error.message || error));
        console.warn('BridgePoint turbine Three.js unavailable',error);
      });
    }
    void loadInitialData(state);
  } else {
    if (state.popup) {state.popup.remove();state.popup = null;}
    for (const item of state.models) item.root.visible = false;
    updateStatus(state,'Layer off · every other BridgePoint layer remains unchanged');
    if (state.renderer && state.map.triggerRepaint) state.map.triggerRepaint();
  }
  refreshStatusUi(state);
  return state.enabled;
}
function bindInteractions(state) {
  if (state.interactionsBound) return;
  state.interactionsBound = true;
  const map = state.map;
  map.on('click',e=>{
    if (!state.enabled) return;
    const layers = [CLUSTER_ID,MARKER_ID,HALO_ID,LABEL_ID].filter(id=>map.getLayer(id));
    const hits = map.queryRenderedFeatures ? map.queryRenderedFeatures(e.point,{layers:layers}) : [];
    const hit = hits && hits[0];
    if (!hit) return;
    if (hit.properties && hit.properties.cluster) {
      const source = map.getSource(SOURCE_ID);
      if (source && source.getClusterExpansionZoom) {
        source.getClusterExpansionZoom(hit.properties.cluster_id,(error,zoom)=>{
          if (!error) map.easeTo({center:hit.geometry.coordinates,zoom:zoom});
        });
      }
      return;
    }
    const feature = hit;
    if (state.popup) state.popup.remove();
    const Popup = window.maplibregl && window.maplibregl.Popup;
    if (Popup) state.popup = new Popup({
      closeButton:true,closeOnClick:true,maxWidth:'410px',className:'bp-wind-popup-wrap-v1'
    }).setLngLat(feature.geometry.coordinates || e.lngLat)
      .setHTML(windTurbinePopupHtml(feature)).addTo(map);
  });
  map.on('moveend',()=>{
    if (!state.enabled) return;
    rebuildModels(state);
    if (state.renderer && map.triggerRepaint) map.triggerRepaint();
  });
  map.on('zoomend',()=>{
    if (!state.enabled) return;
    rebuildModels(state);
    if (state.renderer && map.triggerRepaint) map.triggerRepaint();
  });
}
function install(map,state) {
  if (!map || !map.getStyle || !map.getStyle()) return;
  if (!installLayers(state)) return;
  bindInteractions(state);
  if (state.enabled) {
    if (state.THREE) installModelLayer(state);
    if (!state.globalLoaded) void loadInitialData(state);
  }
}
export function initWindTurbinesRenderer(target) {
  const map = target && (target.map || target);
  if (!map || typeof map.getBounds !== 'function' || typeof map.addSource !== 'function') return null;
  const existing = MAP_STATES.get(map);
  if (existing) return existing.api;
  const state = {
    map:map,enabled:false,dead:false,loading:false,globalLoaded:false,
    THREE:null,threeLoading:false,layerInstalling:false,scene:null,camera:null,renderer:null,
    models:[],modelSignature:'',featureCache:new Map(),collection:EMPTY,popup:null,
    interactionsBound:false,animationTimer:0,lastUpdated:null,status:'off',
    stats:{version:VERSION,sourceVersion:SOURCE_VERSION,total:0,models:0,
      measuredHubHeights:0,measuredRotorDiameters:0,layerReady:false,lastError:null},
    renderWarned:false
  };
  const api = {
    version:VERSION,
    get enabled(){return state.enabled;},
    get status(){return state.status;},
    get stats(){return Object.assign({},state.stats);},
    get features(){return state.collection.features.length;},
    get displayMode(){return windTurbineRenderModeForZoom(state.map.getZoom());},
    toggle(){return setEnabled(state,!state.enabled);},
    setEnabled(on){return setEnabled(state,on);},
    refresh(){state.globalLoaded=false;state.stats.lastError=null;return loadInitialData(state);},
    destroy(){
      state.dead=true;
      if (state.animationTimer) clearTimeout(state.animationTimer);
      if (state.popup) state.popup.remove();
      for (const item of state.models) {
        if (state.scene) state.scene.remove(item.root);
        disposeObject(item.root);
      }
      state.models=[];
    }
  };
  state.api=api; MAP_STATES.set(map,state);
  window.__BP_WIND_TURBINES_V1__=api;
  const ready=()=>install(map,state);
  map.on('style.load',ready); map.on('load',ready);
  if (map.isStyleLoaded && map.isStyleLoaded()) ready();
  const observeDock=()=>{
    if (state.dead) return;
    if (addControlGroup(state)) return;
    setTimeout(observeDock,500);
  };
  observeDock();
  const observer=new MutationObserver(()=>{
    if (!document.getElementById('bp-wind-turbines-control-v1')) addControlGroup(state);
  });
  if (document.body) observer.observe(document.body,{childList:true,subtree:true});
  return api;
}
