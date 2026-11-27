/* BridgePoint mapped roadwork and closure overlay.
 * Source: OpenStreetMap via Overpass API. Records are mapped reports, not a
 * complete live dispatch feed. Close-view barriers and cones use a filtered,
 * CC-BY-4.0 Sketchfab Traffic Cones asset with its source credit in the manifest.
 */
(() => {
  'use strict';
  if (window.__BP_ROADWORK_V1__) return;

  const VERSION = 1;
  const OVERPASS = 'https://overpass-api.de/api/interpreter';
  const THREE_URL = '/vendor/three.module.js?v=169-local';
  const GLTF_URL = '/vendor/GLTFLoader.bundle.js?v=169-local';
  const HELPERS_URL = '/vendor/bp-street-detail-v1.mjs?v=20261127-roadwork-models-v1';
  const ROADWORK_ASSETS_URL = '/assets/street-detail-v1/sketchfab/traffic-control-models.glb.gz?v=20261127-traffic-cones-v1';
  const SOURCE = 'bp-roadwork-v1-source';
  const LINE = 'bp-roadwork-v1-lines';
  const OUTLINE = 'bp-roadwork-v1-line-outline';
  const POINTS = 'bp-roadwork-v1-points';
  const EMPTY = { type: 'FeatureCollection', features: [] };
  const state = window.__BP_ROADWORK_V1__ = {
    version: VERSION, enabled: false, status: 'off', source: 'OpenStreetMap via Overpass API',
    mappedRecords: 0, closureWays: 0, modelsPlaced: 0, lastChecked: null, sourceTimestamp: null,
    error: null, mapReady: false, bbox: null
  };
  const safe = (v, n = 160) => String(v ?? '').replace(/[<>\u0000-\u001f]/g, '').slice(0, n);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rad = Math.PI / 180;
  const meters = (a, b) => {
    const lat = (Number(a[1]) + Number(b[1])) * .5 * rad;
    return Math.hypot((Number(b[0]) - Number(a[0])) * 111320 * Math.cos(lat), (Number(b[1]) - Number(a[1])) * 111132);
  };
  const toFeature = (el) => {
    const tags = el.tags || {};
    const isWay = el.type === 'way' && Array.isArray(el.geometry) && el.geometry.length > 1;
    const coords = isWay ? el.geometry.map(p => [Number(p.lon), Number(p.lat)]).filter(p => p.every(Number.isFinite)) :
      Number.isFinite(Number(el.lon)) && Number.isFinite(Number(el.lat)) ? [[Number(el.lon), Number(el.lat)]] : [];
    if (!coords.length) return null;
    const closed = isWay && (tags.highway === 'construction' || tags.highway === 'road_works' ||
      tags.construction || tags['construction:highway'] || tags.roadwork || tags.access === 'no' ||
      tags.motor_vehicle === 'no' || tags.vehicle === 'no');
    const type = closed ? 'Mapped road closure / construction' : 'Mapped roadwork barrier';
    const reason = tags.reason || tags.description || tags['construction:reason'] || tags.work ||
      tags.construction || tags['construction:highway'] || (tags.access === 'no' || tags.motor_vehicle === 'no' || tags.vehicle === 'no' ? 'Road access restricted' : '') ||
      (tags.highway === 'road_works' ? 'Road works reported' : 'Temporary roadwork / barrier mapped');
    const id = el.type + '/' + el.id;
    const coordsForLine = coords.length > 1 ? coords : null;
    let mid = coords[0];
    if (coords.length > 1) {
      let length = 0;
      for (let i = 1; i < coords.length; i++) length += meters(coords[i - 1], coords[i]);
      let target = length * .5, acc = 0;
      for (let i = 1; i < coords.length; i++) {
        const seg = meters(coords[i - 1], coords[i]);
        if (acc + seg >= target) {
          const t = seg ? (target - acc) / seg : 0;
          mid = [coords[i - 1][0] + (coords[i][0] - coords[i - 1][0]) * t, coords[i - 1][1] + (coords[i][1] - coords[i - 1][1]) * t];
          break;
        }
        acc += seg;
      }
    }
    const props = {
      id, osmType: el.type, osmId: String(el.id), title: safe(tags.name || tags.ref || (tags.highway === 'construction' ? 'Road construction' : type), 120),
      reason: safe(reason, 220), kind: closed ? 'closure' : 'barrier', closed: !!closed,
      highway: safe(tags.highway || tags['construction:highway'] || '', 40), access: safe(tags.access || tags.motor_vehicle || tags.vehicle || '', 40),
      start: safe(tags.start_date || tags.construction_start || '', 48), end: safe(tags.end_date || tags.construction_end || '', 48),
      source: 'OpenStreetMap', url: 'https://www.openstreetmap.org/' + id,
      tags: Object.entries(tags).slice(0, 24).map(pair => pair[0] + '=' + pair[1]).join(' · ')
    };
    const features = [];
    if (coordsForLine) features.push({ type: 'Feature', id: id + ':line', geometry: { type: 'LineString', coordinates: coords }, properties: props });
    features.push({ type: 'Feature', id: id + ':point', geometry: { type: 'Point', coordinates: mid }, properties: props });
    return { features, closure: closed && coordsForLine ? { id, coordinates: coords } : null };
  };

  function currentMap() {
    const candidates = [window.__BP_LANDING_WORLD__, window.__bpLandingWorldV5420, window.__BP_V5000_WORLD__, window.__BP_V5000_WORLD, window.__bpWorldV2300, window.__BP_WORLD_V2300__];
    for (const w of candidates) if (w?.map && typeof w.map.on === 'function') return w.map;
    return null;
  }

  let map = null, cache = new Map(), inflight = false, controller = null, requestTimer = 0, currentFeatures = [];
  let T = null, renderer = null, scene = null, camera = null, modelJob = null, modelRoot = null, barrierRoot = null, coneRoot = null;
  let modelGroup = null, anchor = null, anchorZ = 0, rafTimer = 0, disposed = false;
  const mobile = (() => { try { return matchMedia('(max-width: 760px), (pointer: coarse)').matches; } catch (_) { return innerWidth < 760; } })();

  function queryBox() {
    const c = map.getCenter(), zoom = Number(map.getZoom() || 0);
    let span = zoom >= 15 ? .028 : zoom >= 12 ? .08 : zoom >= 9 ? .18 : .42;
    try {
      const b = map.getBounds();
      const latSpan = Math.max(.004, Math.min(span, Math.abs(b.getNorth() - b.getSouth()) * .62));
      const lonSpan = Math.max(.004, Math.min(span / Math.max(.15, Math.cos(c.lat * rad)), Math.abs(b.getEast() - b.getWest()) * .62));
      span = Math.max(latSpan, Math.min(lonSpan, span / Math.max(.15, Math.cos(c.lat * rad))));
    } catch (_) {}
    const latSpan = Math.min(span, zoom >= 15 ? .025 : zoom >= 12 ? .075 : .16);
    const lonSpan = Math.min(span / Math.max(.15, Math.cos(c.lat * rad)), zoom >= 15 ? .035 : zoom >= 12 ? .12 : .35);
    const south = clamp(c.lat - latSpan, -84.8, 84.8), north = clamp(c.lat + latSpan, -84.8, 84.8);
    const west = clamp(c.lng - lonSpan, -179.8, 179.8), east = clamp(c.lng + lonSpan, -179.8, 179.8);
    return { south, west, north, east, key: [south, west, north, east].map(x => x.toFixed(3)).join(',') };
  }

  function queryText(b) {
    const box = '(' + b.south.toFixed(5) + ',' + b.west.toFixed(5) + ',' + b.north.toFixed(5) + ',' + b.east.toFixed(5) + ')';
    return '[out:json][timeout:18];(' +
      'way["highway"="construction"]' + box + ';' +
      'way["highway"="road_works"]' + box + ';' +
      'way["construction"]' + box + ';' +
      'way["construction:highway"]' + box + ';' +
      'way["roadwork"]' + box + ';' +
      'way["access"="no"]["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street|road)$"]' + box + ';' +
      'way["motor_vehicle"="no"]["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street|road)$"]' + box + ';' +
      'way["vehicle"="no"]["highway"~"^(motorway|trunk|primary|secondary|tertiary|unclassified|residential|service|living_street|road)$"]' + box + ';' +
      'node["highway"="road_works"]' + box + ';' +
      'node["barrier"~"^(road_barrier|construction|jersey_barrier)$"]' + box + ';' +
      ');out body geom;';
  }

  function installLayers() {
    if (!map?.getStyle?.()?.layers?.length) return false;
    try {
      if (!map.getSource(SOURCE)) map.addSource(SOURCE, { type: 'geojson', data: EMPTY, maxzoom: 18 });
      if (!map.getLayer(OUTLINE)) map.addLayer({ id: OUTLINE, type: 'line', source: SOURCE, filter: ['==', ['geometry-type'], 'LineString'], minzoom: 5,
        layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': '#ffad30', 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1.5, 14, 7, 18, 14], 'line-opacity': .95, 'line-blur': 1.3 } });
      if (!map.getLayer(LINE)) map.addLayer({ id: LINE, type: 'line', source: SOURCE, filter: ['==', ['geometry-type'], 'LineString'], minzoom: 5,
        layout: { 'line-cap': 'round', 'line-join': 'round' }, paint: { 'line-color': ['case', ['==', ['get', 'closed'], true], '#ff304d', '#ffb32f'], 'line-width': ['interpolate', ['linear'], ['zoom'], 5, 1, 14, 4.5, 18, 10], 'line-dasharray': [1.3, 1.1], 'line-opacity': .98 } });
      if (!map.getLayer(POINTS)) map.addLayer({ id: POINTS, type: 'circle', source: SOURCE, filter: ['==', ['geometry-type'], 'Point'], minzoom: 3,
        paint: { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 3, 4, 8, 6, 14, 9, 18, 12], 'circle-color': ['case', ['==', ['get', 'closed'], true], '#ef243d', '#ff9d1b'], 'circle-stroke-color': '#fff4df', 'circle-stroke-width': 1.6, 'circle-opacity': .98 } });
      for (const id of [OUTLINE, LINE, POINTS]) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', state.enabled ? 'visible' : 'none');
      state.mapReady = true;
      return true;
    } catch (e) { state.error = 'Layer setup: ' + String(e).slice(0, 140); return false; }
  }

  function showDetails(props) {
    let card = document.getElementById('bp-roadwork-detail-v1');
    if (!card) {
      card = document.createElement('aside'); card.id = 'bp-roadwork-detail-v1';
      card.style.cssText = 'position:fixed;z-index:10050;left:50%;bottom:92px;transform:translateX(-50%);width:min(420px,calc(100vw - 28px));max-height:38vh;overflow:auto;box-sizing:border-box;padding:14px 16px;border:1px solid rgba(255,179,79,.55);border-radius:14px;background:rgba(7,19,32,.97);box-shadow:0 12px 36px rgba(0,0,0,.48);color:#ecf9ff;font:13px/1.45 system-ui,sans-serif;';
      document.body.appendChild(card);
    }
    card.replaceChildren();
    const title = document.createElement('strong'); title.textContent = safe(props.title || 'Mapped roadwork', 120); title.style.cssText = 'display:block;color:#ffd093;font-size:15px;margin-bottom:5px'; card.appendChild(title);
    const reason = document.createElement('div'); reason.textContent = safe(props.reason || 'No reason was added to the map record.', 220); card.appendChild(reason);
    const meta = document.createElement('div'); meta.textContent = 'Status: ' + (props.closed ? 'road closure / restricted access' : 'mapped barrier') + (props.start || props.end ? ' · ' + (props.start || 'date not listed') + ' to ' + (props.end || 'date not listed') : ''); meta.style.cssText = 'margin-top:7px;color:#bdd0dc;font-size:11px'; card.appendChild(meta);
    if (props.tags) { const tags = document.createElement('div'); tags.textContent = safe(props.tags, 460); tags.style.cssText = 'margin-top:6px;color:#94aebe;font-size:10px'; card.appendChild(tags); }
    const link = document.createElement('a'); link.href = props.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = 'Open this OpenStreetMap record ↗'; link.style.cssText = 'display:block;margin-top:10px;color:#69dcff;font-weight:800'; card.appendChild(link);
    const close = document.createElement('button'); close.type = 'button'; close.textContent = 'Close'; close.style.cssText = 'position:absolute;right:10px;top:8px;color:#fff;background:transparent;border:0;font:inherit;cursor:pointer'; close.addEventListener('click', () => card.remove()); card.appendChild(close);
  }

  function onClick(e) {
    if (!state.enabled || !map) return;
    try {
      const features = map.queryRenderedFeatures(e.point, { layers: [POINTS, LINE] }) || [];
      if (features.length) showDetails(features[0].properties || {});
    } catch (_) {}
  }
  function onMove(e) {
    if (!state.enabled || !map) return;
    try { map.getCanvas().style.cursor = map.queryRenderedFeatures(e.point, { layers: [POINTS, LINE] }).length ? 'pointer' : ''; } catch (_) {}
  }

  function closedPaths(rows) { return rows.filter(x => x.closure).map(x => x.closure); }
  function publishData(json, b) {
    const rows = [], seen = new Set();
    for (const element of json?.elements || []) {
      const row = toFeature(element); if (!row || seen.has(row.features[0].properties.id)) continue;
      seen.add(row.features[0].properties.id); rows.push(row);
    }
    const features = rows.flatMap(x => x.features).slice(0, 700);
    currentFeatures = features;
    const closureList = closedPaths(rows).slice(0, 280);
    state.mappedRecords = rows.length; state.closureWays = closureList.length; state.lastChecked = new Date().toISOString();
    state.sourceTimestamp = json?.osm3s?.timestamp_osm_base || null; state.bbox = b.key; state.status = rows.length ? 'ready' : 'no-mapped-roadwork-in-visible-area'; state.error = null;
    map.__BP_ROADWORK_CLOSED_PATHS__ = closureList;
    map.getSource(SOURCE)?.setData({ type: 'FeatureCollection', features });
    if (window.__BP_TRANSPORTATION_V1__?.enabled) window.__BP_TRANSPORTATION_V1__.refresh?.();
    scheduleModels();
  }

  async function fetchBox(force = false) {
    if (!state.enabled || !map || inflight) return;
    const b = queryBox();
    const cached = cache.get(b.key);
    if (!force && cached && Date.now() - cached.at < 5 * 60 * 1000) { publishData(cached.json, b); return; }
    if (!force && Date.now() - (state.lastRequestAt || 0) < 5000) return;
    state.lastRequestAt = Date.now(); inflight = true; state.status = 'fetching-openstreetmap-roadwork'; state.error = null;
    controller = new AbortController(); const abortTimer = setTimeout(() => controller?.abort(), 22000);
    try {
      const body = 'data=' + encodeURIComponent(queryText(b));
      const res = await fetch(OVERPASS, { method: 'POST', mode: 'cors', cache: 'no-store', signal: controller.signal,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' }, body });
      if (!res.ok) throw Error('Overpass HTTP ' + res.status);
      const json = await res.json();
      if (!Array.isArray(json.elements)) throw Error('Overpass returned an invalid response');
      cache.set(b.key, { json, at: Date.now() }); while (cache.size > 40) cache.delete(cache.keys().next().value);
      publishData(json, b);
    } catch (e) {
      state.status = 'source-unavailable'; state.error = safe(e?.name === 'AbortError' ? 'Overpass query timed out; zoom closer or retry.' : e?.message || e, 200);
      if (!map.getSource(SOURCE)) installLayers();
    } finally { clearTimeout(abortTimer); controller = null; inflight = false; }
  }

  function scheduleFetch(force = false) {
    if (!state.enabled || requestTimer) return;
    requestTimer = setTimeout(() => { requestTimer = 0; void fetchBox(force); }, 700);
  }

  async function prepareModels() {
    if (modelJob) return modelJob;
    modelJob = (async () => {
      const [three, gl, helpers] = await Promise.all([import(THREE_URL), import(GLTF_URL), import(HELPERS_URL)]);
      T = three.default || three;
      const loader = new gl.GLTFLoader();
      const gltf = await helpers.loadStreetGLTF(loader, { url: ROADWORK_ASSETS_URL });
      const assetRoot = (gltf.scenes || [gltf.scene])[0];
      let barrierSource = null, coneSource = null;
      assetRoot?.traverse(o => { if (o.name === 'RoadworkBarrier') barrierSource = o; if (o.name === 'TrafficCone') coneSource = o; });
      const cleanRoot = r => {
        const root = r.clone(true); root.updateMatrixWorld(true);
        for (const o of [...root.children]) if (/^(Camera|Light|Cube)$/i.test(o.name)) root.remove(o);
        root.traverse(o => {
          if (!o.isMesh) return;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) { if (!m) continue; m.side = T.DoubleSide; m.needsUpdate = true; }
        });
        return root;
      };
      barrierRoot = cleanRoot(barrierSource); coneRoot = cleanRoot(coneSource);
      if (!barrierRoot || !coneRoot) throw Error('Sketchfab barrier/cone scenes missing');
      const normalize = (root, height) => {
        const bounds = helpers.normalizedBounds(T, root); const scale = height / bounds.size.y;
        root.scale.setScalar(scale); root.position.set(-bounds.base.x * scale, -bounds.box.min.y * scale, -bounds.base.z * scale); root.updateMatrixWorld(true);
        return root;
      };
      barrierRoot = normalize(barrierRoot, 1.0); coneRoot = normalize(coneRoot, .72);
      state.barrierModel = 'Traffic Cones · red/white barricade'; state.coneModel = 'Traffic Cones · reflective cone'; state.modelsLoaded = true;
      installCustomLayer(); scheduleModels();
    })().catch(e => { modelJob = null; state.modelError = safe(e?.message || e, 180); throw e; });
    return modelJob;
  }

  function installCustomLayer() {
    if (!map || map.getLayer('bp-roadwork-v1-models') || !T) return;
    const layer = {
      id: 'bp-roadwork-v1-models', type: 'custom', renderingMode: '3d',
      onAdd(m, gl) {
        renderer = new T.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: false, alpha: true });
        renderer.autoClear = false; renderer.info.autoReset = false; renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.NoToneMapping;
        camera = new T.Camera(); scene = new T.Scene(); scene.add(new T.HemisphereLight(0xeaf3ff, 0x4e463d, 1.9));
        const sun = new T.DirectionalLight(0xffefd7, 2.1); sun.position.set(-40, 75, 48); scene.add(sun);
      },
      render(gl, args) {
        if (!renderer || !scene || !modelGroup || !state.enabled || !anchor || map.getZoom() < 14 || document.hidden) return;
        const raw = map.transform?.getMatrixForModel?.(anchor, anchorZ), matrix = args?.defaultProjectionData?.mainMatrix;
        if (!raw || !matrix) return;
        camera.projectionMatrix.fromArray(matrix).multiply(new T.Matrix4().fromArray(raw));
        renderer.resetState(); renderer.info.reset(); renderer.render(scene, camera);
        state.modelDrawCalls = renderer.info.render.calls; state.modelTriangles = renderer.info.render.triangles;
      },
      onRemove() { clearModelGroup(); renderer?.dispose(); renderer = null; scene = null; }
    };
    const before = (map.getStyle()?.layers || []).find(l => l.type === 'symbol' && /label/.test(l.id))?.id;
    try { map.addLayer(layer, before); } catch (e) { state.modelError = safe(e?.message || e, 160); }
  }

  const localOffset = (q, center) => {
    const lat = Number(center[1]) * rad; let dx = Number(q[0]) - Number(center[0]);
    if (dx > 180) dx -= 360; if (dx < -180) dx += 360;
    return { x: dx * 111320 * Math.cos(lat), z: -(Number(q[1]) - Number(center[1])) * 111132 };
  };
  function clearModelGroup() { if (modelGroup && scene) scene.remove(modelGroup); modelGroup = null; state.modelsPlaced = 0; }
  function placeModel(source, q, yaw, positionY, anchorInv, anchorCenter) {
    const elevation = Number(map.queryTerrainElevation?.({ lng: q[0], lat: q[1] }, { exaggerated: true }) ?? 0);
    const raw = map.transform?.getMatrixForModel?.(q, elevation); if (!raw) return null;
    const base = new T.Matrix4().fromArray(raw).premultiply(anchorInv);
    const wrapper = new T.Group(); wrapper.matrixAutoUpdate = false;
    wrapper.matrix.copy(base).multiply(new T.Matrix4().makeRotationY(yaw)).multiply(new T.Matrix4().makeTranslation(0, positionY || 0, 0));
    wrapper.add(source.clone(true)); wrapper.traverse(o => { o.frustumCulled = false; });
    return wrapper;
  }

  function selectedClosures() {
    const canvas = map.getCanvas(), center = map.getCenter(), rows = [];
    for (const f of currentFeatures) {
      if (f.geometry?.type !== 'LineString') continue;
      const coords = f.geometry.coordinates || []; if (coords.length < 2) continue;
      const m = coords[Math.floor(coords.length / 2)], p = map.project({ lng: m[0], lat: m[1] });
      if (p.x < -80 || p.y < -80 || p.x > canvas.clientWidth + 80 || p.y > canvas.clientHeight + 80) continue;
      rows.push({ coords, dist: meters([center.lng, center.lat], m) });
    }
    return rows.sort((a, b) => a.dist - b.dist).slice(0, mobile ? 3 : 7);
  }

  function rebuildModels() {
    if (!state.enabled || !map || !T || !scene || map.isMoving?.() || map.getZoom() < 14) {
      clearModelGroup(); return;
    }
    const rows = selectedClosures();
    if (!rows.length) { clearModelGroup(); return; }
    const c = map.getCenter(), center = [c.lng, c.lat], z = Number(map.queryTerrainElevation?.({ lng: center[0], lat: center[1] }, { exaggerated: true }) ?? 0);
    const raw = map.transform?.getMatrixForModel?.(center, z); if (!raw) return;
    const inv = new T.Matrix4().fromArray(raw).invert(), next = new T.Group(); next.frustumCulled = false;
    const maxBarriers = mobile ? 42 : 98, maxCones = mobile ? 28 : 60; let barriers = 0, cones = 0;
    for (const row of rows) {
      const line = row.coords, a = line[0], b = line[Math.min(1, line.length - 1)];
      const bearing = Math.atan2((b[0] - a[0]) * Math.cos(a[1] * rad), b[1] - a[1]);
      const cross = bearing + Math.PI / 2;
      for (const end of [a, line[line.length - 1]]) {
        if (barriers >= maxBarriers) break;
        const mid = [end[0] + Math.sin(bearing) * .00002, end[1] + Math.cos(bearing) * .00002];
        for (const off of [-2.55, -1.7, -.85, 0, .85, 1.7, 2.55]) {
          if (barriers >= maxBarriers) break;
          const lat = mid[1] + Math.cos(cross) * off / 111132;
          const lon = mid[0] + Math.sin(cross) * off / (111320 * Math.max(.15, Math.cos(mid[1] * rad)));
          const obj = placeModel(barrierRoot, [lon, lat], cross, 0, inv, center); if (obj) { next.add(obj); barriers++; }
        }
        for (const off of [-2.8, 2.8]) {
          if (cones >= maxCones) break;
          const lat = mid[1] + Math.cos(cross) * off / 111132;
          const lon = mid[0] + Math.sin(cross) * off / (111320 * Math.max(.15, Math.cos(mid[1] * rad)));
          const obj = placeModel(coneRoot, [lon, lat], cross, 0, inv, center); if (obj) { next.add(obj); cones++; }
        }
      }
    }
    if (!next.children.length) return;
    clearModelGroup(); modelGroup = next; scene.add(modelGroup); anchor = center; anchorZ = z;
    state.modelsPlaced = barriers + cones; state.barriersPlaced = barriers; state.conesPlaced = cones; state.modelsStatus = 'ready'; map.triggerRepaint();
  }

  function scheduleModels() {
    if (!state.enabled || rafTimer) return;
    rafTimer = setTimeout(() => { rafTimer = 0; if (!T) void prepareModels().catch(() => {}); else rebuildModels(); }, 260);
  }

  function onMove() { if (state.enabled) { scheduleFetch(); scheduleModels(); } }
  function bind(m) {
    if (map === m) return true;
    if (map) { try { map.off('moveend', onMove); map.off('zoomend', onMove); map.off('click', onClick); } catch (_) {} }
    map = m;
    installLayers(); map.on('moveend', onMove); map.on('zoomend', onMove); map.on('click', onClick);
    map.on('style.load', () => { if (state.enabled) { installLayers(); scheduleFetch(true); scheduleModels(); } });
    map.once('remove', () => { disposed = true; clearTimeout(requestTimer); clearTimeout(rafTimer); controller?.abort(); clearModelGroup(); renderer?.dispose(); });
    state.mapReady = true; return true;
  }

  function findMap(tries = 0) {
    if (!state.enabled) return false;
    const m = currentMap();
    if (m) { bind(m); installLayers(); scheduleFetch(true); void prepareModels().catch(() => {}); return true; }
    if (tries < 40) setTimeout(() => findMap(tries + 1), 250);
    else { state.status = 'map-not-ready'; state.error = 'The globe map has not finished loading. Toggle Roadwork off and on to retry.'; }
    return false;
  }

  function enable() {
    state.enabled = true; state.status = 'loading-visible-area'; state.error = null;
    const m = currentMap(); if (m) { bind(m); installLayers(); scheduleFetch(true); void prepareModels().catch(() => {}); return true; }
    findMap(); return true;
  }
  function disable() {
    state.enabled = false; state.status = 'off'; clearTimeout(requestTimer); clearTimeout(rafTimer); controller?.abort();
    if (map) {
      map.__BP_ROADWORK_CLOSED_PATHS__ = [];
      try { installLayers(); map.getSource(SOURCE)?.setData(EMPTY); for (const id of [OUTLINE, LINE, POINTS]) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none'); } catch (_) {}
      if (window.__BP_TRANSPORTATION_V1__?.enabled) window.__BP_TRANSPORTATION_V1__.refresh?.();
      clearModelGroup(); map.triggerRepaint();
    }
    document.getElementById('bp-roadwork-detail-v1')?.remove();
    return true;
  }
  function toggle() { return state.enabled ? (disable(), false) : (enable(), true); }

  Object.assign(state, { enable, disable, toggle, refresh: () => scheduleFetch(true), diagnostics: () => ({ ...state, cacheEntries: cache.size }) });
})();
