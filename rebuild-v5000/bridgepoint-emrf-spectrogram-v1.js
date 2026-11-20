'use strict';
// BridgePoint global EM/RF signal spectrogram v1 + immediate global Starlink v2 overlay.
// Satellite positions are propagated public TLE/OMM estimates; beam cones are illustrative models,
// never SpaceX beam-steering telemetry. Cell radii are planning envelopes, not measured RSSI.
const VERSION = 1;
const ROOT = 'bp-emrf-spectrogram-v1';
const THREE_URL = '/vendor/three.module.js?v=169-local';
const DRAP_URL = 'https://services.swpc.noaa.gov/text/drap_global_frequencies.txt';
const OSM_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter'
];
const FCC_URL = 'https://services.arcgis.com/XG15cJAlne2vxtgt/ArcGIS/rest/services/Antenna_Structure_Registrate1/FeatureServer/45/query';
const IDS = {
  drapSource: 'bp-emrf-drap-source-v1',
  drapFill: 'bp-emrf-drap-fill-v1',
  drapLine: 'bp-emrf-drap-line-v1',
  siteSource: 'bp-emrf-sites-source-v1',
  heat: 'bp-emrf-sites-heat-v1',
  sites: 'bp-emrf-sites-points-v1',
  fourSource: 'bp-emrf-4g-source-v1',
  fourFill: 'bp-emrf-4g-fill-v1',
  fourLine: 'bp-emrf-4g-line-v1',
  fiveSource: 'bp-emrf-5g-source-v1',
  fiveFill: 'bp-emrf-5g-fill-v1',
  fiveLine: 'bp-emrf-5g-line-v1',
  footprintSource: 'bp-emrf-starlink-footprint-source-v1',
  footprintFill: 'bp-emrf-starlink-footprint-fill-v1',
  footprintLine: 'bp-emrf-starlink-footprint-line-v1',
  beamLayer: 'bp-emrf-starlink-beam-cones-v1',
  groundSource: 'bp-emrf-starlink-global-ground-v3',
  groundHeat: 'bp-emrf-starlink-global-ground-heat-v3'
};
const EMPTY = {type:'FeatureCollection',features:[]};
const RAD = Math.PI / 180;
const EARTH_M = 6371008.8;
const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
const fmt = v => Number(v || 0).toLocaleString();
const normalizeLon = v => ((v + 540) % 360) - 180;
const safeHeight = (raw,fallback=null) => {
  if(raw===undefined||raw===null||raw==='')return fallback;
  const m=String(raw).trim().toLowerCase().match(/^(\d+(?:\.\d+)?)\s*(m|metres|meters|ft|feet|')?$/);
  if(!m)return fallback;
  const n=Number(m[1])*((m[2]==='ft'||m[2]==='feet'||m[2]==="'")?.3048:1);
  return n>1&&n<650?n:fallback;
};

function installStyle() {
  if (document.getElementById(ROOT + '-style')) return;
  const style = document.createElement('style');
  style.id = ROOT + '-style';
  style.textContent =
    '#' + ROOT + '{position:relative;z-index:2;width:100%;margin:7px 0 0;padding:9px;border:1px solid rgba(96,226,255,.38);border-radius:12px;background:linear-gradient(145deg,rgba(3,14,25,.97),rgba(12,21,49,.96));color:#edfbff;font:11px/1.42 system-ui,sans-serif;box-shadow:0 12px 35px #0005;}' +
    '#' + ROOT + '[hidden]{display:none!important}' +
    '#' + ROOT + ' *{box-sizing:border-box;min-width:0}' +
    '#' + ROOT + ' [data-head]{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}' +
    '#' + ROOT + ' [data-head] b{display:block;letter-spacing:.07em;font-size:10px;color:#dffaff}' +
    '#' + ROOT + ' [data-head] small{display:block;margin-top:3px;color:#a7c7d7;font-size:9px;line-height:1.4}' +
    '#' + ROOT + ' [data-close]{flex:0 0 28px;width:28px;height:28px;border:1px solid #426274;border-radius:7px;background:#0c2839;color:#fff;font-size:17px}' +
    '#' + ROOT + ' [data-stats]{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;margin-top:8px}' +
    '#' + ROOT + ' [data-stat]{padding:6px;border:1px solid #ffffff20;border-radius:8px;background:#ffffff08}' +
    '#' + ROOT + ' [data-stat] b{display:block;font-size:14px;color:#fff;font-variant-numeric:tabular-nums}' +
    '#' + ROOT + ' [data-stat] small{display:block;color:#abc5d0;font-size:8px;line-height:1.3}' +
    '#' + ROOT + ' [data-status]{margin-top:8px;padding:7px 8px;border-radius:8px;background:#071c2b;color:#aeeaff;font-size:9px;line-height:1.45;overflow-wrap:anywhere}' +
    '#' + ROOT + ' [data-legend]{display:flex;flex-wrap:wrap;gap:6px 11px;margin-top:7px;color:#bdd0db;font-size:8px}' +
    '#' + ROOT + ' [data-legend] i{display:inline-block;width:8px;height:8px;margin-right:4px;border-radius:50%;vertical-align:middle;background:#49dcff}' +
    '#' + ROOT + ' [data-legend] .four{background:#48e7ff}' +
    '#' + ROOT + ' [data-legend] .five{background:#bc7aff}' +
    '#' + ROOT + ' [data-legend] .iono{background:#ff5bc8}' +
    '#' + ROOT + ' [data-note]{margin:7px 1px 0;color:#8faebc;font-size:8px;line-height:1.45}' +
    '@media(max-width:640px){#' + ROOT + '{padding:7px;margin-top:6px}#' + ROOT + ' [data-stat] b{font-size:12px}#' + ROOT + ' [data-stats]{gap:4px}}';
  document.head.appendChild(style);
}

function asFeatureCollection(features) {
  return {type:'FeatureCollection',features:Array.isArray(features) ? features : []};
}

function geodesicRing(lon,lat,radiusM,steps=20) {
  const out = [];
  const angular = radiusM / EARTH_M;
  const p1 = lat * RAD, l1 = lon * RAD;
  for (let i=0;i<steps;i++) {
    const bearing = 2 * Math.PI * i / steps;
    const p2 = Math.asin(Math.sin(p1)*Math.cos(angular) + Math.cos(p1)*Math.sin(angular)*Math.cos(bearing));
    const l2 = l1 + Math.atan2(Math.sin(bearing)*Math.sin(angular)*Math.cos(p1), Math.cos(angular)-Math.sin(p1)*Math.sin(p2));
    out.push([normalizeLon(l2/RAD),p2/RAD]);
  }
  out.push(out[0].slice());
  return out;
}

function buildDrapFeatures(raw) {
  const lines = String(raw || '').split(/\r?\n/);
  const headerIndex = lines.findIndex(line => {
    const t = line.trim().split(/\s+/);
    return t.length > 50 && t.includes('-178') && t.includes('178');
  });
  if (headerIndex < 0) throw new Error('NOAA D-RAP longitude header missing');
  const longitudes = lines[headerIndex].trim().split(/\s+/).map(Number);
  if (longitudes.length < 80 || !longitudes.every(Number.isFinite)) throw new Error('NOAA D-RAP longitude grid invalid');
  const features = [];
  let validAt = null;
  const validLine = lines.find(x => x.includes('Product Valid At :'));
  if (validLine) validAt = validLine.split(':').slice(1).join(':').trim();
  for (let i=headerIndex+1;i<lines.length;i++) {
    const parts = lines[i].split('|');
    if (parts.length < 2) continue;
    const lat = Number(parts[0].trim());
    if (!Number.isFinite(lat) || Math.abs(lat) > 90) continue;
    const values = parts[1].trim().split(/\s+/).map(Number);
    for (let j=0;j<Math.min(longitudes.length,values.length);j++) {
      const freq = values[j];
      if (!Number.isFinite(freq) || freq <= 0) continue;
      const lon = longitudes[j];
      if (!Number.isFinite(lon)) continue;
      const west = lon-2, east = lon+2, south = Math.max(-90,lat-1), north = Math.min(90,lat+1);
      features.push({
        type:'Feature',
        geometry:{type:'Polygon',coordinates:[[[west,south],[east,south],[east,north],[west,north],[west,south]]]},
        properties:{frequency_mhz:freq,latitude:lat,longitude:lon,source:'NOAA SWPC D-RAP',valid_at:validAt || ''}
      });
    }
  }
  return {collection:asFeatureCollection(features),validAt,gridCells:features.length};
}

function classifyRadio(tags) {
  const raw = [
    tags['communication:mobile_phone'] || '',
    tags['communication:mobile_phone:4g'] || '',
    tags['communication:mobile_phone:5g'] || '',
    tags['mobile_phone'] || '',
    tags['telecom'] || ''
  ].join(' ').toLowerCase();
  const known4 = /(^|[^a-z0-9])(4g|lte|umts|gsm)([^a-z0-9]|$)/.test(raw) || String(tags['communication:mobile_phone:4g'] || '').toLowerCase() === 'yes';
  const known5 = /(^|[^a-z0-9])5g([^a-z0-9]|$)/.test(raw) || String(tags['communication:mobile_phone:5g'] || '').toLowerCase() === 'yes';
  return {known4,known5,unknown:!known4&&!known5};
}

function buildOverpassQuery(bounds) {
  const w = clamp(bounds[0],-180,180), s = clamp(bounds[1],-80,80), e = clamp(bounds[2],-180,180), n = clamp(bounds[3],-80,80);
  if (w >= e || s >= n) return '';
  const box = '(' + s.toFixed(4) + ',' + w.toFixed(4) + ',' + n.toFixed(4) + ',' + e.toFixed(4) + ')';
  return '[out:json][timeout:22];(' +
    'nwr["telecom"="cell_site"]' + box + ';' +
    'nwr["communication:mobile_phone"="yes"]' + box + ';' +
    'nwr["tower:type"="communication"]' + box + ';' +
    'nwr["man_made"="communications_tower"]' + box + ';' +
    ');out center 900;';
}

function elementPoint(item) {
  if (Number.isFinite(Number(item.lat)) && Number.isFinite(Number(item.lon))) return {lat:Number(item.lat),lon:Number(item.lon)};
  if (Number.isFinite(Number(item.center?.lat)) && Number.isFinite(Number(item.center?.lon))) return {lat:Number(item.center.lat),lon:Number(item.center.lon)};
  return null;
}

function dedupeSites(elements) {
  const seen = new Set(), out = [];
  for (const item of elements || []) {
    const tags = item.tags || {};
    const p = elementPoint(item);
    if (!p || p.lat < -85 || p.lat > 85 || p.lon < -180 || p.lon > 180) continue;
    const key = String(item.type) + ':' + String(item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    const radio = classifyRadio(tags);
    out.push({
      lon:p.lon,lat:p.lat,id:key,source:'OpenStreetMap',kind:'mapped mobile-network structure',
      label:String(tags.name || tags.operator || tags['operator:wikidata'] || 'Mapped mobile-network site').slice(0,100),
      known4:radio.known4,known5:radio.known5,unknown:radio.unknown,
      heightM:safeHeight(tags.height??tags['tower:height']??tags['height:roof']),
      towerKind:String(tags['tower:construction']||tags['tower:type']||tags.man_made||'unknown').slice(0,64)
    });
  }
  return out;
}

function buildSiteData(sites) {
  const points=[],four=[],five=[],unknown=[];
  for (const site of sites) {
    const point = {
      type:'Feature',
      geometry:{type:'Point',coordinates:[site.lon,site.lat]},
      properties:{id:site.id,source:site.source,label:site.label,known4:site.known4,known5:site.known5}
    };
    points.push(point);
    // Reuse existing Wind / RF Fields nominal 4G 900 m / 5G 450 m planning radii; not measured service cells.
    if (site.known4 || site.unknown) {
      four.push({type:'Feature',geometry:{type:'Polygon',coordinates:[geodesicRing(site.lon,site.lat,900)]},
        properties:{id:site.id,source:site.source,nominal_radius_m:900,radio_band:'4G planning envelope'}});
    }
    if (site.known5 || site.unknown) {
      five.push({type:'Feature',geometry:{type:'Polygon',coordinates:[geodesicRing(site.lon,site.lat,450)]},
        properties:{id:site.id,source:site.source,nominal_radius_m:450,radio_band:'5G planning envelope'}});
    }
    if (site.unknown) unknown.push(point);
  }
  return {points:asFeatureCollection(points),four:asFeatureCollection(four),five:asFeatureCollection(five),unknown:asFeatureCollection(unknown)};
}

function sourceBounds(map) {
  const b = map.getBounds();
  return [Number(b.getWest()),Number(b.getSouth()),Number(b.getEast()),Number(b.getNorth())];
}

export function initBridgePointEmrfSpectrogram(target) {
  const map = target?.map || target;
  if (!map || typeof map.getCenter !== 'function' || typeof fetch !== 'function') return null;
  if (window.__BP_EMRF_SPECTROGRAM_V1__?.map === map) return window.__BP_EMRF_SPECTROGRAM_V1__;
  installStyle();
  const dock = document.getElementById('bpv-dock');
  const root = document.createElement('section');
  root.id = ROOT;
  root.hidden = true;
  root.setAttribute('aria-label','Global electromagnetic and radio-frequency spectrogram');
  root.innerHTML =
    '<div data-head><div><b>GLOBAL ELECTROMAGNETIC / RF SPECTROGRAM</b><small>Satellite link footprints · mapped mobile sites · ionospheric HF propagation</small></div><button data-close type="button" aria-label="Close panel">×</button></div>' +
    '<div data-stats><div data-stat><b data-beams>0</b><small>Starlink beams · modeled (public orbital elements)</small></div><div data-stat><b data-sites>0</b><small>Mapped telecom structures</small></div><div data-stat><b data-drap>—</b><small>NOAA D-RAP valid time (UTC)</small></div></div>' +
    '<div data-status aria-live="polite">Preparing the global RF field…</div>' +
    '<div data-legend><span><i style="background:#58e6ff"></i>4G nominal range</span><span><i class="five"></i>5G nominal range</span><span><i class="iono"></i>HF absorption</span><span><i style="background:#ffda85"></i>Starlink modeled beam</span></div>' +
    '<p data-note>Starlink positions derive from CelesTrak OMM records propagated with J2-adjusted approximate mechanics; thousands of 8° cones are illustrative coverage, NOT live SpaceX beam telemetry. Satellite 3D models use publicly reported exterior dimensions for V1.5 and V2 Mini, NOT original SpaceX CAD. Models are enlarged for visibility at global zoom. Ground colors visualize modeled Starlink footprint density, not measured EM/RF intensity. Mobile-site envelopes are nominal planning radii, not measured carrier coverage or live signal strength. FCC antenna registrations may include broadcast and other non-cellular structures, and are not proof of an active mobile radio. OpenStreetMap tower tags are incomplete. Structure-aware glows are illustrative occlusion and multipath cues based on visible map geometry, not calibrated radio propagation. Tower height is source-mapped when available; other tower shapes and dimensions are representative, not exact CAD. NOAA D-RAP describes HF ionospheric absorption, not 4G/5G or Starlink-band attenuation. Data coverage varies by source and region.</p>';
  if (dock) dock.insertBefore(root,dock.querySelector('#bpv-dock-actions'));
  else map.getContainer().appendChild(root);
  const $ = selector => root.querySelector(selector);
  const say = value => { const el = $('[data-status]'); if (el) el.textContent = String(value || ''); };
  const st = {
    version:VERSION,map,root,active:false,closing:false,three:null,threePromise:null,beamLayer:null,beamMesh:null,beamMaterial:null,
    beams:[],sites:[],groundFootprints:[],interactionDirty:true,drap:{validAt:null,gridCells:0},drapPromise:null,sitesPromise:null,siteCache:null,siteCacheKey:'',
    moveTimer:0,beamTimer:0,drapTimer:0,sitesTimer:0,orbitTimer:0,req:0,styleBound:false,lastError:null,starlinkV2:null,starlinkPromise:null
  };

  function addSource(id,data) {
    if (!map.getSource(id)) map.addSource(id,{type:'geojson',data:data || EMPTY});
  }
  function addLayer(layer) {
    if (!map.getLayer(layer.id)) map.addLayer(layer);
  }
  function ensureMapLayers() {
    if (!map.getStyle?.()) return false;
    try {
      addSource(IDS.drapSource,EMPTY);
      addSource(IDS.siteSource,EMPTY);
      addSource(IDS.fourSource,EMPTY);
      addSource(IDS.fiveSource,EMPTY);
      addSource(IDS.footprintSource,EMPTY);
      addSource(IDS.groundSource,EMPTY);
      addLayer({id:IDS.drapFill,type:'fill',source:IDS.drapSource,paint:{
        'fill-color':['interpolate',['linear'],['get','frequency_mhz'],0,'#26366c',3,'#3265dc',8,'#8c4fe4',15,'#ed4cbf',25,'#ff764b',30,'#fff08b'],
        'fill-opacity':['interpolate',['linear'],['get','frequency_mhz'],0,0,2,.08,5,.15,15,.24,30,.34],
        'fill-antialias':true
      }});
      addLayer({id:IDS.drapLine,type:'line',source:IDS.drapSource,paint:{
        'line-color':'#ff73d0','line-opacity':['interpolate',['linear'],['get','frequency_mhz'],0,0,3,.16,15,.46,30,.72],
        'line-width':['interpolate',['linear'],['zoom'],0,.15,4,.55,9,1.05]
      }});
      addLayer({id:IDS.fourFill,type:'fill',source:IDS.fourSource,paint:{'fill-color':'#48dfff','fill-opacity':.11}});
      addLayer({id:IDS.fourLine,type:'line',source:IDS.fourSource,paint:{'line-color':'#5deaff','line-opacity':.34,'line-width':['interpolate',['linear'],['zoom'],0,.3,6,.85,12,1.35]}});
      addLayer({id:IDS.fiveFill,type:'fill',source:IDS.fiveSource,paint:{'fill-color':'#a86cff','fill-opacity':.18}});
      addLayer({id:IDS.fiveLine,type:'line',source:IDS.fiveSource,paint:{'line-color':'#cf91ff','line-opacity':.6,'line-width':['interpolate',['linear'],['zoom'],0,.45,6,1.1,12,1.8]}});
      addLayer({id:IDS.heat,type:'heatmap',source:IDS.siteSource,maxzoom:8,paint:{
        'heatmap-weight':1,
        'heatmap-intensity':['interpolate',['linear'],['zoom'],0,.5,6,1.25],
        'heatmap-radius':['interpolate',['linear'],['zoom'],0,7,5,20,8,30],
        'heatmap-opacity':['interpolate',['linear'],['zoom'],0,.72,7,.32],
        'heatmap-color':['interpolate',['linear'],['heatmap-density'],0,'rgba(4,12,40,0)',.16,'#204dcb',.38,'#16d8f4',.64,'#9958ec',.88,'#ed55bf',1,'#fff09a']
      }});
      addLayer({id:IDS.sites,type:'circle',source:IDS.siteSource,paint:{
        'circle-radius':['interpolate',['linear'],['zoom'],0,1.4,4,2.3,8,3.8,13,5.3],
        'circle-color':['case',['==',['get','known5'],true],'#bd80ff',['==',['get','known4'],true],'#5deaff','#f7d98f'],
        'circle-opacity':.95,'circle-stroke-color':'rgba(5,13,29,.9)','circle-stroke-width':.8
      }});
      addLayer({id:IDS.groundHeat,type:'heatmap',source:IDS.groundSource,maxzoom:14,paint:{
        'heatmap-weight':1,'heatmap-intensity':['interpolate',['linear'],['zoom'],0,.8,5,1.35,10,1.7],
        'heatmap-radius':['interpolate',['linear'],['zoom'],0,13,3,22,7,32,12,42],
        'heatmap-opacity':['interpolate',['linear'],['zoom'],0,.78,7,.57,13,.12],
        'heatmap-color':['interpolate',['linear'],['heatmap-density'],0,'rgba(0,12,45,0)',.07,'#154abf',.25,'#00e5ff',.43,'#384bff',.63,'#ac39df',.8,'#f9e46e',1,'#ff733e']
      }});
      addLayer({id:IDS.footprintFill,type:'fill',source:IDS.footprintSource,paint:{'fill-color':'#ffd36f','fill-opacity':.12}});
      addLayer({id:IDS.footprintLine,type:'line',source:IDS.footprintSource,paint:{'line-color':'#ffe29b','line-opacity':.72,'line-width':['interpolate',['linear'],['zoom'],0,.4,6,1,12,1.7],'line-dasharray':[2,1]}});
      setVisibility(true);
      return true;
    } catch (error) {
      console.warn('BridgePoint EM/RF style layers',error);
      st.lastError = String(error?.message || error);
      return false;
    }
  }

  function setVisibility(on) {
    for (const id of [IDS.drapFill,IDS.drapLine,IDS.fourFill,IDS.fourLine,IDS.fiveFill,IDS.fiveLine,IDS.heat,IDS.sites,IDS.groundHeat,IDS.footprintFill,IDS.footprintLine]) {
      try { if (map.getLayer(id)) map.setLayoutProperty(id,'visibility',on?'visible':'none'); } catch (_) {}
    }
    if (st.beamLayer) st.beamLayer.visible = !!on;
    try { map.triggerRepaint?.(); } catch (_) {}
  }

  async function loadDrap(force=false) {
    if (st.drapPromise) return st.drapPromise;
    st.drapPromise = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(()=>controller.abort(),12000);
      try {
        const response = await fetch(DRAP_URL,{headers:{Accept:'text/plain'},cache:force?'no-store':'default',signal:controller.signal});
        if (!response.ok) throw new Error('NOAA SWPC D-RAP HTTP '+response.status);
        const parsed = buildDrapFeatures(await response.text());
        st.drap = {validAt:parsed.validAt,gridCells:parsed.gridCells,updatedAt:Date.now()};
        if (!map.getSource(IDS.drapSource)) ensureMapLayers();
        map.getSource(IDS.drapSource)?.setData(parsed.collection);
        $('[data-drap]').textContent = parsed.validAt ? parsed.validAt.replace(' UTC','') : 'current';
        say(parsed.gridCells
          ? 'NOAA D-RAP grid loaded · '+fmt(parsed.gridCells)+' cells show non-zero modeled HF absorption · valid '+(parsed.validAt || 'time unavailable')+' UTC.'
          : 'NOAA D-RAP is at normal background across the current global grid: no non-zero 1 dB HF absorption cells were returned.');
        return parsed;
      } catch (error) {
        if (error?.name !== 'AbortError') {
          st.lastError = String(error?.message || error);
          say('NOAA D-RAP unavailable: '+st.lastError+'. Satellite and mapped-site layers remain available.');
        }
        return null;
      } finally {
        clearTimeout(timer);
        st.drapPromise = null;
      }
    })();
    return st.drapPromise;
  }

  async function fetchOverpass(bounds) {
    const query = buildOverpassQuery(bounds);
    if (!query) return [];
    const controller = new AbortController();
    const timer = setTimeout(()=>controller.abort(),26000);
    let lastError = null;
    try {
      for (const endpoint of OSM_URLS) {
        try {
          const response = await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded','Accept':'application/json'},body:'data='+encodeURIComponent(query),cache:'no-store',signal:controller.signal});
          if (!response.ok) throw new Error('OpenStreetMap Overpass HTTP '+response.status);
          const data = await response.json();
          if (!Array.isArray(data.elements)) throw new Error('Overpass response omitted elements');
          return dedupeSites(data.elements);
        } catch (error) {
          if (error?.name === 'AbortError') throw error;
          lastError = error;
        }
      }
      throw lastError || new Error('No Overpass endpoint responded');
    } finally {
      clearTimeout(timer);
    }
  }

  async function fetchFccStructures(bounds) {
    // FCC antenna registration is U.S.-only and does not prove an active cellular radio.
    const w=Math.max(-125,bounds[0]),s=Math.max(24,bounds[1]),e=Math.min(-66,bounds[2]),n=Math.min(50,bounds[3]);
    if (w>=e || s>=n) return [];
    const params = new URLSearchParams({
      where:'1=1',geometry:[w,s,e,n].join(','),geometryType:'esriGeometryEnvelope',inSR:'4326',
      spatialRel:'esriSpatialRelIntersects',outFields:'OBJECTID,RegNum,Entity,Strucht,LocCity,LocState',
      returnGeometry:'true',outSR:'4326',resultRecordCount:'450',returnExceededLimitFeatures:'true',f:'geojson'
    });
    const controller = new AbortController(), timer=setTimeout(()=>controller.abort(),10000);
    try {
      const response = await fetch(FCC_URL+'?'+params.toString(),{headers:{Accept:'application/geo+json,application/json'},cache:'default',signal:controller.signal});
      if (!response.ok) throw new Error('FCC antenna registry HTTP '+response.status);
      const data=await response.json();
      return (data.features||[]).map(feature=>{
        let coords=null;
        if (feature.geometry?.type==='Point') coords=feature.geometry.coordinates;
        else if (feature.geometry?.type==='Polygon') {
          const points=feature.geometry.coordinates?.[0]||[];
          if (points.length) coords=[points.reduce((a,p)=>a+Number(p[0]),0)/points.length,points.reduce((a,p)=>a+Number(p[1]),0)/points.length];
        }
        if (!coords || !Number.isFinite(Number(coords[0])) || !Number.isFinite(Number(coords[1]))) return null;
        const p=feature.properties||{};
        return {lon:Number(coords[0]),lat:Number(coords[1]),id:'FCC:'+String(p.RegNum||p.OBJECTID||''),source:'FCC Antenna Structure Registration',kind:'registered antenna structure',label:String(p.Entity||'FCC registered antenna structure').slice(0,100),known4:false,known5:false,unknown:true,heightM:safeHeight(p.Strucht),towerKind:'registered-structure'};
      }).filter(Boolean);
    } finally { clearTimeout(timer); }
  }

  async function loadSites(force=false) {
    if (st.sitesPromise) return st.sitesPromise;
    const bounds=sourceBounds(map);
    const key=bounds.map(v=>Number(v).toFixed(1)).join(',');
    if (!force && st.siteCache && st.siteCacheKey===key && Date.now()-st.siteCache.at<600000) {
      paintSites(st.siteCache.sites);
      return st.siteCache.sites;
    }
    st.sitesPromise=(async()=>{
      const seq=++st.req;
      say('Loading mapped mobile-network sites and FCC antenna structures for the visible global extent…');
      try {
        const jobs=[fetchOverpass(bounds).catch(error=>{console.warn('BridgePoint OpenStreetMap telecom query',error);return [];}),fetchFccStructures(bounds).catch(error=>{console.warn('BridgePoint FCC structure query',error);return [];})];
        const [osm,fcc]=await Promise.all(jobs);
        if (seq!==st.req) return st.sites;
        const combined=[],seen=new Set();
        for (const site of [...osm,...fcc]) {
          const key=site.id || (site.lon.toFixed(5)+','+site.lat.toFixed(5));
          if (seen.has(key)) continue;seen.add(key);combined.push(site);
        }
        st.sites=combined;
        st.siteCache={sites:combined,at:Date.now()};st.siteCacheKey=key;
        paintSites(combined);
        return combined;
      } catch (error) {
        st.lastError=String(error?.message||error);
        say('Mapped tower sources unavailable: '+st.lastError+'. Existing map and satellite layers are unchanged.');
        return [];
      } finally { st.sitesPromise=null; }
    })();
    return st.sitesPromise;
  }

  function paintSites(sites) {
    st.interactionDirty=true;
    const data=buildSiteData(sites);
    if (!map.getSource(IDS.siteSource)) ensureMapLayers();
    map.getSource(IDS.siteSource)?.setData(data.points);
    map.getSource(IDS.fourSource)?.setData(data.four);
    map.getSource(IDS.fiveSource)?.setData(data.five);
    $('[data-sites]').textContent=fmt(sites.length);
    if(st.active&&sites.length){void updateBeams();scheduleInteraction();}
  }
  function paintGlobalGround(){
    const sampled=st.starlinkV2?.getFootprints?.(1000)||[];
    st.groundFootprints=sampled;
    if(!map.getSource(IDS.groundSource))ensureMapLayers();
    const features=sampled.map(p=>({type:'Feature',geometry:{type:'Point',coordinates:[p.lon,p.lat]},properties:{
      id:p.id,nominal_radius_m:p.radiusM,truth_class:'MODELED_STARLINK_FOOTPRINT_NOT_MEASURED_EMRF'
    }}));
    map.getSource(IDS.groundSource)?.setData(asFeatureCollection(features));
    st.interactionDirty=true;
    scheduleInteraction();map.triggerRepaint?.();
  }

  function getOrbitPositions() {
    const api=window.__BP_GLOBAL_MOTION_V5926__;
    const positions=api?.state?.orbitPositions;
    if (!Array.isArray(positions)) return [];
    const starlink=positions.filter(item=>{
      const name=String(item?.item?.object_name || item?.item?.omm?.OBJECT_NAME || '').toUpperCase();
      return name.includes('STARLINK') && Number.isFinite(Number(item.lon)) && Number.isFinite(Number(item.lat));
    });
    const picked=[];
    const count=Math.min(28,starlink.length);
    if (count===0) return picked;
    for (let i=0;i<count;i++) {
      const index=Math.floor(i*starlink.length/count);
      const item=starlink[index];
      const alt=clamp(Number(item.alt||550),300,1600);
      const height=alt*1000;
      const radius=clamp(height*Math.tan(8*RAD),35000,155000);
      picked.push({lon:Number(item.lon),lat:Number(item.lat),altitudeM:height,radiusM:radius,id:String(item.item?.norad_cat_id||item.item?.object_name||i),name:String(item.item?.object_name||'Starlink')});
    }
    return picked;
  }

  function makeFootprints(beams) {
    const features=[];
    for (const beam of beams) {
      const ring=geodesicRing(beam.lon,beam.lat,beam.radiusM,24);
      features.push({type:'Feature',geometry:{type:'Polygon',coordinates:[ring]},properties:{
        norad_id:beam.id,name:beam.name,altitude_km:Math.round(beam.altitudeM/1000),radius_km:Math.round(beam.radiusM/1000),
        model:'illustrative 8-degree nadir footprint',truth_class:'MODELED_BEAM_FOOTPRINT_NOT_OPERATOR_TELEMETRY'
      }});
    }
    return asFeatureCollection(features);
  }

  async function ensureBeamLayer() {
    if (st.beamLayer && st.beamLayer.map===map) return st.beamLayer;
    const THREE=await loadThree();
    // Do not stall for 8 seconds waiting for unrelated radar source tiles.
    if (map.getLayer(IDS.beamLayer)) throw new Error('Starlink beam layer handle was lost during a style replacement');

    // Instanced meshes keep the global view to three WebGL draws per frame,
    // rather than issuing one render pass for every satellite and tower site.
    const beamGeometry=new THREE.CylinderGeometry(0,1,1,18,1,true);
    const beamMaterial=new THREE.ShaderMaterial({
      uniforms:{u_time:{value:0},u_opacity:{value:.28}},
      vertexShader:
        '#include <common>\nvarying float v_height; void main(){v_height=position.y+0.5;vec4 localPosition=vec4(position,1.0);\n#ifdef USE_INSTANCING\nlocalPosition=instanceMatrix*localPosition;\n#endif\ngl_Position=projectionMatrix*modelViewMatrix*localPosition;}',
      fragmentShader:
        'uniform float u_time; uniform float u_opacity; varying float v_height; void main(){float edge=smoothstep(0.0,0.13,v_height)*(1.0-smoothstep(0.87,1.0,v_height));float pulse=0.68+0.32*sin(u_time*2.2+v_height*21.0);float ribs=0.74+0.26*cos(v_height*72.0-u_time*4.2);float a=u_opacity*edge*pulse*ribs;gl_FragColor=vec4(vec3(1.0,0.83,0.49)*(0.82+0.18*pulse),a);}',
      transparent:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending
    });
    const mesh=new THREE.InstancedMesh(beamGeometry,beamMaterial,64);
    mesh.count=0;mesh.frustumCulled=false;

    const sphereGeometry=new THREE.SphereGeometry(1,12,8);
    const sphere4Material=new THREE.MeshBasicMaterial({color:'#4edfff',transparent:true,opacity:.14,wireframe:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    const sphere5Material=new THREE.MeshBasicMaterial({color:'#b982ff',transparent:true,opacity:.20,wireframe:true,depthWrite:false,depthTest:true,side:THREE.DoubleSide,blending:THREE.AdditiveBlending});
    const sphere4Mesh=new THREE.InstancedMesh(sphereGeometry,sphere4Material,96);
    const sphere5Mesh=new THREE.InstancedMesh(sphereGeometry,sphere5Material,96);
    sphere4Mesh.count=0;sphere5Mesh.count=0;
    sphere4Mesh.frustumCulled=false;sphere5Mesh.frustumCulled=false;

    // Grounded, polygonal tower components; heights use source tags when available.
    // Lattice/frame details are representative since FCC/OSM do not supply CAD.
    const towerMax=96;
    const towerMat=new THREE.MeshStandardMaterial({color:0x9baeb6,metalness:.73,roughness:.36});
    const towerMetal=new THREE.MeshStandardMaterial({color:0xe7ebef,metalness:.66,roughness:.33});
    function towerPart(geometry,material,name){
      const mesh=new THREE.InstancedMesh(geometry,material,towerMax);
      mesh.count=0;mesh.name=name;mesh.frustumCulled=false;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      return mesh;
    }
    const towerShaft=towerPart(new THREE.CylinderGeometry(.22,.43,1,8),towerMat,'3D anchored telecom tower steel shaft');
    const legGeo=new THREE.CylinderGeometry(.07,.12,1,6);
    const towerLegs=[0,1,2,3].map(i=>towerPart(legGeo,towerMat,'polygon steel lattice leg '+(i+1)));
    const towerAntenna=towerPart(new THREE.BoxGeometry(.65,2,.5),towerMetal,'tower radio antenna panel');
    const towerPlatform=towerPart(new THREE.BoxGeometry(2.8,.20,2.8),towerMat,'tower upper radio equipment platform');
    const towerBase=towerPart(new THREE.BoxGeometry(2.25,.7,2.25),towerMetal,'terrain rooted base plinth');
    const towerMeshes=[towerShaft,...towerLegs,towerAntenna,towerPlatform,towerBase];
    const surfaceMaterial=new THREE.MeshBasicMaterial({color:0x3a95ef,transparent:true,opacity:.105,depthWrite:false,depthTest:true,side:THREE.DoubleSide});
    const groundSpheres=new THREE.InstancedMesh(new THREE.SphereGeometry(1,14,9),surfaceMaterial,192);
    groundSpheres.count=0;groundSpheres.frustumCulled=false;groundSpheres.name='Modeled Starlink 3D downlink envelopes over Earth';
    const scatterLines=new THREE.LineSegments(new THREE.BufferGeometry(),new THREE.LineBasicMaterial({color:0x9be8ff,transparent:true,opacity:.62,depthWrite:false,depthTest:true,blending:THREE.AdditiveBlending}));
    scatterLines.frustumCulled=false;scatterLines.name='Illustrative structure-occluded RF multipath, not calibrated ray tracing';
    function siteTerrain(site){
      try{const v=map.queryTerrainElevation?.([site.lon,site.lat]);return Number.isFinite(v)?v:0;}catch(_){return 0;}
    }
    function mappedWorld(lon,lat,elevation=0){
      try{
        const arr=map.transform?.getMatrixForModel?.([lon,lat],elevation);
        return arr?new THREE.Matrix4().fromArray(arr):null;
      }catch(_){return null;}
    }
    function recalcInteractions(){
      const coords=[],zoom=Number(map.getZoom?.()||0);
      if(st.active&&zoom>=15&&typeof map.queryRenderedFeatures==='function'){
        try{
          const canvas=map.getCanvas(),w=canvas.clientWidth,h=canvas.clientHeight;
          const ids=(map.getStyle()?.layers||[]).filter(l=>
            l.type==='fill-extrusion'&&/building|structure|extrusion/i.test(l.id)).map(l=>l.id).slice(0,8);
          const features=ids.length?map.queryRenderedFeatures([[w*.22,h*.18],[w*.78,h*.80]],{layers:ids}):[];
          const satelliteCoverage=st.starlinkV2?.getFootprints?.(3000)||[];
          const distanceM=(a,b)=>Math.hypot((a.lon-b.lon)*111320*Math.cos(a.lat*RAD),(a.lat-b.lat)*111320);
          let drawn=0;
          for(const feature of features){
            if(drawn>=28)break;
            const polygon=feature.geometry?.type==='Polygon'?feature.geometry.coordinates?.[0]:
               feature.geometry?.type==='MultiPolygon'?feature.geometry.coordinates?.[0]?.[0]:null;
            if(!Array.isArray(polygon)||polygon.length<3)continue;
            const ring=polygon.slice(0,Math.min(32,polygon.length));
            const lon=ring.reduce((a,p)=>a+Number(p[0]||0),0)/ring.length;
            const lat=ring.reduce((a,p)=>a+Number(p[1]||0),0)/ring.length;
            if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;
            const height=safeHeight(feature.properties?.render_height??feature.properties?.height??(
              Number.isFinite(Number(feature.properties?.['building:levels']))?Number(feature.properties['building:levels'])*3:null
            ));
            if(!height)continue;
            const place={lon,lat};
            const tower=st.sites.find(site=>distanceM(place,site)<(site.known5?450:900));
            const covered=!!tower||satelliteCoverage.some(p=>distanceM(place,p)<p.radiusM);
            if(!covered)continue;
            const world=mappedWorld(lon,lat,siteTerrain(place));if(!world)continue;
            const dir=tower?Math.atan2(lat-tower.lat,(lon-tower.lon)*Math.cos(lat*RAD)):Math.PI/4;
            const sx=Math.cos(dir),sz=Math.sin(dir);
            const p0=new THREE.Vector3(-sx*16,height+7,-sz*16).applyMatrix4(world);
            const contact=new THREE.Vector3(0,height,0).applyMatrix4(world);
            const p1=new THREE.Vector3(sx*23,height*.64,sz*23).applyMatrix4(world);
            const p2=new THREE.Vector3(-sz*14,height*.46,sx*14).applyMatrix4(world);
            for(const p of [p0,contact,contact,p1,contact,p2])coords.push(p.x,p.y,p.z);
            drawn++;
          }
        }catch(e){if(!st.warnedScatter){st.warnedScatter=true;console.warn('BridgePoint EM/RF obstruction visualization',e);}}
      }
      const geometry=new THREE.BufferGeometry();
      geometry.setAttribute('position',new THREE.Float32BufferAttribute(coords,3));
      scatterLines.geometry?.dispose?.();scatterLines.geometry=geometry;
      map.triggerRepaint?.();
    }
    const localMatrix=(y,sx,sy,sz)=>new THREE.Matrix4().compose(
      new THREE.Vector3(0,y,0),new THREE.Quaternion(),new THREE.Vector3(sx,sy,sz)
    );
    const layer={
      id:IDS.beamLayer,type:'custom',renderingMode:'3d',visible:false,map,
      onAdd:(m,gl)=>{
        layer.renderer=new THREE.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
        layer.renderer.autoClear=false;
        layer.camera=new THREE.Camera();
        layer.scene=new THREE.Scene();
        layer.mesh=mesh;
        layer.sphere4Mesh=sphere4Mesh;
        layer.sphere5Mesh=sphere5Mesh;
        layer.scene.add(mesh,sphere4Mesh,sphere5Mesh,groundSpheres,scatterLines,...towerMeshes);
        layer.rebuildInteractions=recalcInteractions;
      },
      render:(gl,args)=>{
        if (!layer.visible || !layer.renderer || !layer.mesh || !st.active) return;
        const matrix=args?.defaultProjectionData?.mainMatrix || args?.modelViewProjectionMatrix;
        if (!matrix || typeof matrix.length!=='number' || matrix.length<16) return;
        const projection=new THREE.Matrix4().fromArray(matrix);
        const now=Date.now()*.001;
        layer.camera.projectionMatrix.copy(projection);
        layer.mesh.material.uniforms.u_time.value=now;

        const beamCount=st.starlinkV2?.state?.beamCount?0:Math.min(64,st.beams.length);
        const colorMatrix=new THREE.Matrix4();
        let renderedBeams=0;
        for(let i=0;i<beamCount;i++){
          const beam=st.beams[i];
          let modelMatrix;
          try { modelMatrix=map.transform.getMatrixForModel([beam.lon,beam.lat],0); } catch (_) { continue; }
          if(!modelMatrix)continue;
          colorMatrix.fromArray(modelMatrix).multiply(localMatrix(beam.altitudeM*.5,beam.radiusM,beam.altitudeM,beam.radiusM));
          layer.mesh.setMatrixAt(renderedBeams++,colorMatrix);
        }
        layer.mesh.count=renderedBeams;
        layer.mesh.instanceMatrix.needsUpdate=true;

        // Reuse the globe-anchored instanced meshes for 4G/5G nominal RF bubbles.
        // Reuse the existing Wind / RF Fields nominal 4G 900 m / 5G 450 m planning radii, not carrier-measured cells.
        const zoom=Number(map.getZoom?.()||0);
        const maxSpheres=zoom<3?28:zoom<6?56:96;
        const sites=st.sites;
        const count=Math.min(maxSpheres,sites.length);
        const matrix4=new THREE.Matrix4(),matrix5=new THREE.Matrix4();
        const terrestrialWorld=(site)=>mappedWorld(site.lon,site.lat,siteTerrain(site));
        let renderedSites=0;
        for(let i=0;i<count;i++){
          const site=sites[Math.floor(i*sites.length/count)];
          let modelMatrix;
          try { modelMatrix=map.transform.getMatrixForModel([site.lon,site.lat],siteTerrain(site)); } catch (_) { continue; }
          if(!modelMatrix)continue;
          matrix4.fromArray(modelMatrix).multiply(localMatrix(450,900,450,900));
          matrix5.fromArray(modelMatrix).multiply(localMatrix(225,450,225,450));
          layer.sphere4Mesh.setMatrixAt(renderedSites,matrix4);
          layer.sphere5Mesh.setMatrixAt(renderedSites,matrix5);
          renderedSites++;
        }
        layer.sphere4Mesh.count=renderedSites;
        layer.sphere5Mesh.count=renderedSites;
        layer.sphere4Mesh.instanceMatrix.needsUpdate=true;
        layer.sphere5Mesh.instanceMatrix.needsUpdate=true;
        // True metre heights and terrain anchors for nearby structures;
        // untagged heights use a disclosed generic 38 m visual stand-in.
        let towerCount=0,latticeCount=0;
        if(zoom>=9)for(const site of sites){
          if(towerCount>=towerMax)break;
          const world=terrestrialWorld(site);if(!world)continue;
          const h=clamp(Number(site.heightM)||38,9,340);
          const mast=/mast|monopole|pole/i.test(site.towerKind||'');
          const translate=new THREE.Matrix4(),scale=new THREE.Matrix4();
          towerShaft.setMatrixAt(towerCount,new THREE.Matrix4().copy(world)
            .multiply(translate.makeTranslation(0,h*.5,0)).multiply(scale.makeScale(1,h,1)));
          towerBase.setMatrixAt(towerCount,new THREE.Matrix4().copy(world)
            .multiply(translate.makeTranslation(0,.35,0)));
          towerPlatform.setMatrixAt(towerCount,new THREE.Matrix4().copy(world)
            .multiply(translate.makeTranslation(0,h*.82,0)));
          towerAntenna.setMatrixAt(towerCount,new THREE.Matrix4().copy(world)
            .multiply(translate.makeTranslation(0,h+1.1,0)));
          if(!mast){
            for(let j=0;j<4;j++){
              const x=(j%2?1:-1)*1.35,z=(j>=2?1:-1)*1.35;
              towerLegs[j].setMatrixAt(latticeCount,new THREE.Matrix4().copy(world)
                .multiply(translate.makeTranslation(x,h*.5,z)).multiply(scale.makeScale(1,h,1)));
            }
            latticeCount++;
          }
          towerCount++;
        }
        for(const item of [towerShaft,towerBase,towerPlatform,towerAntenna]){item.count=towerCount;item.instanceMatrix.needsUpdate=true;}
        for(const item of towerLegs){item.count=latticeCount;item.instanceMatrix.needsUpdate=true;}
        // Sparse globe-wide, satellite-derived 3D domes, overlaid with the
        // 2D ground-heat ramp. Coverage is model geometry, not measured signal.
        const footprints=st.groundFootprints;
        const groundCount=Math.min(192,footprints.length);
        let domes=0;
        for(let i=0;i<groundCount;i++){
          const p=footprints[Math.floor(i*footprints.length/groundCount)];
          const world=mappedWorld(p.lon,p.lat,0);if(!world)continue;
          groundSpheres.setMatrixAt(domes++,new THREE.Matrix4().copy(world)
            .multiply(new THREE.Matrix4().makeTranslation(0,p.radiusM*.2,0))
            .multiply(new THREE.Matrix4().makeScale(p.radiusM,p.radiusM*.76,p.radiusM)));
        }
        groundSpheres.count=domes;groundSpheres.instanceMatrix.needsUpdate=true;
        try {
          layer.renderer.resetState?.();
          layer.renderer.render(layer.scene,layer.camera);
        } catch(error) {
          if(!layer.warned){layer.warned=true;console.warn('BridgePoint EM/RF instanced rendering',error);}
        }
      },
      onRemove:()=>{
        for(const o of [...towerMeshes,groundSpheres,scatterLines]){
          o.geometry?.dispose?.();o.material?.dispose?.();
        }
        try { layer.renderer?.dispose?.(); } catch (_) {}
        st.beamLayer=null;
      }
    };
    try { map.addLayer(layer);st.beamLayer=layer;return layer; }
    catch (error) { beamGeometry.dispose();beamMaterial.dispose();sphereGeometry.dispose();sphere4Material.dispose();sphere5Material.dispose();throw error; }
  }

  async function loadThree() {
    if (st.three) return st.three;
    if (!st.threePromise) st.threePromise=import(THREE_URL).then(m=>m.default||m).catch(error=>{st.threePromise=null;throw error;});
    st.three=await st.threePromise;
    return st.three;
  }

  async function updateBeams() {
    if (!st.active) return;
    const beams=getOrbitPositions();
    st.beams=beams;
    if (!map.getSource(IDS.footprintSource)) ensureMapLayers();
    map.getSource(IDS.footprintSource)?.setData(makeFootprints(beams));
    $('[data-beams]').textContent=fmt(st.starlinkV2?.state?.beamCount||beams.length);
    if (beams.length || st.sites.length || st.starlinkV2?.state?.beamCount) {
      try {
        const layer=await ensureBeamLayer();
        layer.visible=true;
      } catch (error) {
        console.warn('BridgePoint Starlink 3D beams unavailable',error);
        say('3D EM/RF volume renderer did not initialize: '+String(error?.message||error));
      }
    } else if (st.beamLayer) {
      st.beamLayer.visible=false;
    }
    if (st.active){scheduleInteraction();map.triggerRepaint?.();}
  }

  function scheduleSites(force=false) {
    clearTimeout(st.moveTimer);
    st.moveTimer=setTimeout(()=>{if(st.active)void loadSites(force);},950);
  }

  async function enable() {
    if(st.active){root.hidden=false;return true;}
    st.active=true;root.hidden=false;
    // Never await NOAA/Overpass/FCC/style idle before revealing modeled satellite beams.
    ensureMapLayers();setVisibility(true);
    say('GLOBAL EM/RF ON · loading thousands of modeled Starlink downlink cones from first-party CelesTrak OMM orbital data. NOAA and mapped towers load independently.');
    void enableStarlinkThousandsV2();
    void loadDrap(false);
    if(Number(map.getZoom?.()||0)>=7)void loadSites(false);
    clearInterval(st.beamTimer);st.beamTimer=setInterval(()=>{if(st.active&&!document.hidden)void updateBeams();},18000);
    clearInterval(st.drapTimer);st.drapTimer=setInterval(()=>{if(st.active&&!document.hidden)void loadDrap(false);},120000);
    clearInterval(st.sitesTimer);st.sitesTimer=setInterval(()=>{if(st.active&&!document.hidden&&Number(map.getZoom?.()||0)>=7)void loadSites(false);},900000);
    map.triggerRepaint?.();
    return true;
  }

  async function enableStarlinkThousandsV2(){
    if(!st.active)return;
    if(st.starlinkPromise)return st.starlinkPromise;
    st.starlinkPromise=(async()=>{
      try{
        const mod=await import('./bridgepoint-emrf-starlink-global-v2.js?v=2-global-4200-omm-satellites');
        if(!st.active)return;
        let api=window.__BP_EMRF_STARLINK_BEAMS_V2__;
        if(api?.map!==map)api=mod.initBridgePointStarlinkBeamV2(map);
        if(!api?.enable)throw Error('Starlink globe beam renderer unavailable');
        st.starlinkV2=api;
        await api.enable();
        if(!st.active)api.disable();
      }catch(e){
        st.lastError=String(e?.message||e);
        say('Modeled Starlink beams unavailable: '+st.lastError+'. NOAA and mapped cellular RF remain independent.');
        console.warn('BridgePoint Starlink thousands instanced renderer',e);
      }
    })().finally(()=>{st.starlinkPromise=null});
    return st.starlinkPromise;
  }
  const onStarlinkV2Status=event=>{
    if(!st.active)return;
    const d=event.detail||{};
    if(Number.isFinite(d.count)&&d.count>0){
      paintGlobalGround();
      if(!st.beamLayer)void updateBeams();
      scheduleInteraction();
      $('[data-beams]').textContent=fmt(d.count);
      say(fmt(d.count)+' source-orbit satellites · 3D modeled Starlink coverage beams active · '+fmt(d.catalogCount||0)+' public orbital records · exterior satellite dimensions published, not original CAD. RF footprints illustrative, not live transmissions.');
    }else if(d.error){
      say('Starlink orbital source unavailable: '+String(d.error)+'. Existing NOAA / terrestrial RF unaffected.');
    }else if(d.message)say(d.message);
  };
  document.addEventListener('bp:emrf-starlink-status',onStarlinkV2Status);
  function disable() {
    if (!st.active) return false;
    st.active=false;
    st.starlinkV2?.disable?.();
    clearInterval(st.beamTimer);st.beamTimer=0;
    clearInterval(st.drapTimer);st.drapTimer=0;
    clearInterval(st.sitesTimer);st.sitesTimer=0;
    clearInterval(st.orbitTimer);st.orbitTimer=0;
    clearTimeout(st.moveTimer);st.moveTimer=0;
    clearTimeout(st.interactionTimer);st.interactionTimer=0;
    setVisibility(false);
    root.hidden=true;
    return false;
  }

  function openPanel() { root.hidden=false; }
  function closePanel() { root.hidden=true; }
  function onStyle() {
    if (!st.active) return;
    setTimeout(()=>{
      if (!st.active) return;
      if (ensureMapLayers()) {
        setVisibility(true);
        scheduleInteraction();
        if (st.beams.length) void updateBeams();
        paintSites(st.sites);
        paintGlobalGround();
      }
      if(st.starlinkV2?.state?.enabled)map.triggerRepaint?.();
    },0);
  }
  function scheduleInteraction(){
    clearTimeout(st.interactionTimer);
    if(!st.active)return;
    st.interactionTimer=setTimeout(()=>{if(st.active)st.beamLayer?.rebuildInteractions?.();},340);
  }
  const onMove=()=>{st.interactionDirty=true;scheduleInteraction();if(st.active&&Number(map.getZoom?.()||0)>=7)scheduleSites(false);};
  const onVisibility=()=>{if(!st.active)return;if(document.hidden){return;}void updateBeams();};
  const closeButton=$('[data-close]');
  if (closeButton) closeButton.addEventListener('click',closePanel);
  map.on?.('moveend',onMove);map.on?.('zoomend',onMove);map.on?.('style.load',onStyle);
  document.addEventListener('visibilitychange',onVisibility);

  const api={
    version:VERSION,map,root,enable,disable,open:openPanel,close:closePanel,
    refresh:()=>Promise.allSettled([loadDrap(true),loadSites(true),updateBeams()]),
    get active(){return st.active;},
    get state(){return {version:VERSION,active:st.active,starlinkBeamCones:st.starlinkV2?.state?.beamCount||st.beams.length,starlinkCatalogCount:st.starlinkV2?.state?.catalogCount||0,starlinkSourceError:st.starlinkV2?.state?.sourceError||null,mappedTelecomStructures:st.sites.length,drapValidAt:st.drap.validAt,drapGridCells:st.drap.gridCells,lastError:st.lastError,siteSources:['OpenStreetMap telecom tags','FCC Antenna Structure Registration (U.S.)'],atmosphereSource:'NOAA SWPC D-RAP HF absorption grid',beamMethod:'propagated public TLE/OMM positions + illustrative 8-degree nadir cone',cellMethod:'existing Wind / RF Fields nominal 4G 900 m / 5G 450 m planning envelopes; not measured RF coverage'};},
    destroy(){
      disable();map.off?.('moveend',onMove);map.off?.('zoomend',onMove);map.off?.('style.load',onStyle);
      document.removeEventListener('visibilitychange',onVisibility);
      document.removeEventListener('bp:emrf-starlink-status',onStarlinkV2Status);
      st.starlinkV2?.destroy?.();
      if(st.beamLayer&&map.getLayer(IDS.beamLayer)){try{map.removeLayer(IDS.beamLayer);}catch(_){}}
      for(const id of [IDS.drapFill,IDS.drapLine,IDS.fourFill,IDS.fourLine,IDS.fiveFill,IDS.fiveLine,IDS.heat,IDS.sites,IDS.groundHeat,IDS.footprintFill,IDS.footprintLine])try{if(map.getLayer(id))map.removeLayer(id);}catch(_){}
      for(const id of [IDS.drapSource,IDS.siteSource,IDS.fourSource,IDS.fiveSource,IDS.footprintSource,IDS.groundSource])try{if(map.getSource(id))map.removeSource(id);}catch(_){}
      root.remove();if(window.__BP_EMRF_SPECTROGRAM_V1__===api)window.__BP_EMRF_SPECTROGRAM_V1__=null;
    }
  };
  window.__BP_EMRF_SPECTROGRAM_V1__=api;
  return api;
}
