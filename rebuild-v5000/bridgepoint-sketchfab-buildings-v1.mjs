/* Exact Sketchfab building geometry fitted to mapped building footprints.
 * The source GLB is CC-BY-4.0; geometry is cloned and sized to GIS footprint
 * dimensions/height. It does not claim that a generic source mesh is the real
 * identity of the building at that address.
 */
const T_URL = '/vendor/three.module.js?v=169-local';
const GL_URL = '/vendor/GLTFLoader.bundle.js?v=169-local';
const H_URL = '/vendor/bp-street-detail-v1.mjs?v=20261127-sketchfab-models';
const MODEL_URL = '/assets/street-detail-v1/buildings/glass-building-low-poly.glb.gz?v=20261127-glass-tower-material-fix-v2';
const CITY_CATALOG_URL = '/assets/street-detail-v1/buildings/mapped-city-buildings.glb.gz?v=20261127-city-building-variants-v2';
const CITY_MODELS = {
  BP_SquareTower: { x: 12.81, z: 12.57, y: 39.25 },
  BP_CornerOffice: { x: 10.95, z: 5.61, y: 17.84 },
  BP_NarrowTower: { x: 6.41, z: 12.73, y: 23.60 },
  BP_MidriseBlock: { x: 12.71, z: 6.54, y: 16.03 },
  BP_GlassTower: { x: 51.29, z: 35.98, y: 105.80 }
};
const LAYER = 'bp-sketchfab-building-models-v1';
const D = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function sourceSpecs(map) {
  const out = [], seen = new Set();
  for (const layer of map.getStyle()?.layers || []) {
    const src = layer.source, sl = layer['source-layer'];
    if (!src || !sl || !/building/i.test(sl) || seen.has(src + ':' + sl)) continue;
    seen.add(src + ':' + sl); out.push([src, sl]);
  }
  for (const pair of [['bpBuildings', 'buildings'], ['bpCityStructures', 'buildings'], ['ofm', 'building']]) {
    if (map.getSource(pair[0]) && !seen.has(pair[0] + ':' + pair[1])) { seen.add(pair[0] + ':' + pair[1]); out.push(pair); }
  }
  return out;
}

function footprint(feature) {
  const g = feature?.geometry;
  let ring = g?.type === 'Polygon' ? g.coordinates?.[0] : g?.type === 'MultiPolygon' ? g.coordinates?.[0]?.[0] : null;
  if (!Array.isArray(ring) || ring.length < 4) return null;
  ring = ring.filter(q => Array.isArray(q) && Number.isFinite(Number(q[0])) && Number.isFinite(Number(q[1])));
  if (ring.length < 4) return null;
  if (ring.length > 68) {
    const step = Math.ceil((ring.length - 1) / 63);
    ring = ring.filter((_, i) => i === 0 || i === ring.length - 1 || i % step === 0);
  }
  const lat = ring.reduce((s, q) => s + Number(q[1]), 0) / ring.length, cos = Math.max(.12, Math.cos(lat * D));
  const origin = ring[0], pts = ring.map(q => [(Number(q[0]) - origin[0]) * 111320 * cos, (Number(q[1]) - origin[1]) * 111132]);
  let best = null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const c = Math.cos(angle), s = Math.sin(angle); let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) { const x = p[0] * c + p[1] * s, y = -p[0] * s + p[1] * c; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const w = maxX - minX, h = maxY - minY, area = w * h;
    if (!best || area < best.area) best = { w, h, area, angle, minX, maxX, minY, maxY, c, s };
  }
  if (!best || best.w < 1 || best.h < 1) return null;
  const cx = (best.minX + best.maxX) * .5, cy = (best.minY + best.maxY) * .5;
  const ex = cx * best.c - cy * best.s, ny = cx * best.s + cy * best.c;
  return { q: [Number(origin[0]) + ex / (111320 * cos), Number(origin[1]) + ny / 111132], width: best.w, depth: best.h, angle: best.angle, area: best.area, latitude: lat };
}

function heightOf(p) {
  const read = v => { const n = parseFloat(String(v ?? '').replace(/[^0-9.+-]/g, '')); return Number.isFinite(n) ? n : 0; };
  const m = read(p.render_height || p.height || p.height_m || p['building:height']);
  if (m > 0) return m > 1000 ? m / 1000 : m;
  const levels = read(p['building:levels'] || p.building_levels || p.levels);
  return levels > 0 ? levels * 3.2 : 0;
}

export function selectBuildingCandidates(features, center, cap = 4) {
  const cLat = Number(center?.[1] || 0), cos = Math.max(.12, Math.cos(cLat * D)), found = [], seen = new Set();
  for (const f of features || []) {
    const p = f?.properties || {}, geo = footprint(f); if (!geo) continue;
    const width = Math.max(geo.width, geo.depth), depth = Math.min(geo.width, geo.depth), height = heightOf(p), aspect = width / Math.max(1, depth);
    if (geo.area < 220 || width < 9 || width > 82 || depth < 8 || depth > 66 || height < 15 || height > 360 || aspect < .95 || aspect > 2.8) continue;
    const model = height >= 90 ? 'BP_GlassTower' : Object.keys(CITY_MODELS).filter(x => x !== 'BP_GlassTower').map(id => {
      const m = CITY_MODELS[id], sourceAspect = Math.max(m.x, m.z) / Math.min(m.x, m.z);
      return { id, score: Math.abs(Math.log(aspect / sourceAspect)) * 1.8 + Math.abs(Math.log(height / m.y)) * .35 };
    }).sort((a, b) => a.score - b.score)[0].id;
    const legacyFeatureId = f.id ?? p.building_id ?? p.osm_id ?? p.id ?? null;
    const legacyIdField = f.id != null ? 'feature' : p.building_id != null ? 'building_id' : p.osm_id != null ? 'osm_id' : p.id != null ? 'id' : null;
    const id = String(legacyFeatureId ?? [geo.q[0].toFixed(5), geo.q[1].toFixed(5)].join(':'));
    if (seen.has(id)) continue; seen.add(id);
    const dx = (geo.q[0] - Number(center[0])) * 111320 * cos, dy = (geo.q[1] - Number(center[1])) * 111132;
    const source = CITY_MODELS[model], sourceAspect = Math.max(source.x, source.z) / Math.min(source.x, source.z);
    const footprintFit = Math.abs(Math.log(Math.max(.01, aspect / sourceAspect)));
    const heightFit = Math.abs(Math.log(height / source.y));
    const longAxisYaw = geo.width >= geo.depth ? geo.angle : geo.angle + Math.PI / 2;
    found.push({ id, legacyFeatureId, legacyIdField, source: String(p.__bpSource || ''), sourceLayer: String(p.__bpSourceLayer || ''), q: geo.q, width, depth, height, yaw: longAxisYaw, area: geo.area, model,
      distance: Math.hypot(dx, dy), score: footprintFit * 2.2 + heightFit * .45 + Math.hypot(dx, dy) / 1800, name: String(p.name || p['addr:housenumber'] || ''), properties: p });
  }
  return found.sort((a, b) => a.score - b.score).slice(0, cap);
}

export function attachSketchfabBuildings(map, options = {}) {
  if (!map || map.__BP_SKETCHFAB_BUILDINGS_V1__) return map?.__BP_SKETCHFAB_BUILDINGS_V1__;
  const mobile = (() => { try { return matchMedia('(max-width: 760px), (pointer: coarse)').matches; } catch (_) { return innerWidth < 760; } })();
  const cap = options.maxModels || (mobile ? 16 : 36);
  const status = map.__BP_SKETCHFAB_BUILDINGS_V1__ = { status: 'loading-models', version: 1, model: 'Full Gameready City Buildings + Glass Building', sourceGeometryCloned: true,
    source: 'https://sketchfab.com/3d-models/full-gameready-city-buildings-retextured-5fad2351e34f4c069a2eec45cce0824c', license: 'CC-BY-4.0', mappedFootprintPlacement: true,
    sources: ['Full Gameready City Buildings [retextured] · CC BY 4.0', 'Glass Building (low poly) · CC BY 4.0'], placementMode: 'source mesh variants fitted to mapped footprint dimensions and recorded heights',
    modelsPlaced: 0, candidates: 0, triangleCount: 0, tiles: 0, zoom: map.getZoom() };
  window.__BP_SKETCHFAB_BUILDINGS_V1__ = status;
  let T, renderer, camera, scene, group = null, anchor = null, anchorZ = 0, busy = false, dead = false, timer = 0, lastKey = '', layersInstalled = false;
  const templates = new Map();
  const previousBuildingFilters = new Map();
  function restoreLegacyBuildingFilters() {
    for (const [id, filter] of previousBuildingFilters) {
      if (!map.getLayer(id)) continue;
      try { map.setFilter(id, filter); } catch (_) {}
    }
    previousBuildingFilters.clear();
    status.legacyBuildingFeaturesHidden = 0;
  }
  function suppressLegacyBuildingFeatures(items) {
    restoreLegacyBuildingFilters();
    const layers = (map.getStyle()?.layers || []).filter(l =>
      l.type === 'fill-extrusion' && l.source && l['source-layer'] &&
      /building/i.test(String(l['source-layer']) + ' ' + String(l.id)));
    const byLayer = new Map();
    for (const item of items || []) {
      if (item.legacyFeatureId == null || !item.source || !item.sourceLayer || !item.legacyIdField) continue;
      const expression = item.legacyIdField === 'feature' ? ['id'] : ['get', item.legacyIdField];
      for (const layer of layers) {
        if (layer.source !== item.source || layer['source-layer'] !== item.sourceLayer) continue;
        let row = byLayer.get(layer.id);
        if (!row) byLayer.set(layer.id, row = { expression, ids: [] });
        row.ids.push(item.legacyFeatureId);
      }
    }
    let hidden = 0;
    for (const [id, row] of byLayer) {
      const ids = [...new Set(row.ids)];
      if (!ids.length || !map.getLayer(id)) continue;
      const original = map.getFilter(id) ?? null;
      previousBuildingFilters.set(id, original);
      const exclude = ['!', ['in', row.expression, ['literal', ids]]];
      try {
        map.setFilter(id, original ? ['all', original, exclude] : exclude);
        hidden += ids.length;
      } catch (e) {
        previousBuildingFilters.delete(id);
        status.filterError = String(e?.message || e).slice(0, 140);
      }
    }
    status.legacyBuildingFeaturesHidden = hidden;
    status.legacyBuildingLayersFiltered = byLayer.size;
  }

  const emptyGroup = () => { restoreLegacyBuildingFilters(); if (group && scene) scene.remove(group); group = null; status.modelsPlaced = 0; };
  function collect() {
    const out = [], seen = new Set();
    for (const [source, sourceLayer] of sourceSpecs(map)) {
      let rows = [];
      try { rows = map.querySourceFeatures(source, { sourceLayer }) || []; } catch (_) {}
      for (const f of rows) {
        const p = f.properties || {}, id = String(f.id ?? p.building_id ?? p.osm_id ?? p.id ?? '');
        const key = source + ':' + sourceLayer + ':' + id + ':' + JSON.stringify(f.geometry?.coordinates?.[0]?.[0] || f.geometry?.coordinates?.[0] || []);
        if (seen.has(key)) continue; seen.add(key);
        out.push({ ...f, properties: { ...p, __bpSource: source, __bpSourceLayer: sourceLayer } });
        if (out.length > 2400) return out;
      }
    }
    return out;
  }
  function installLayer() {
    if (layersInstalled || map.getLayer(LAYER) || !T) return;
    const layer = {
      id: LAYER, type: 'custom', renderingMode: '3d',
      onAdd(m, gl) {
        renderer = new T.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: false, alpha: true });
        renderer.autoClear = false; renderer.info.autoReset = false; renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
        camera = new T.Camera(); scene = new T.Scene(); scene.add(new T.HemisphereLight(0xeaf4ff, 0x524b43, 2.25));
        const sun = new T.DirectionalLight(0xfff2de, 2.6); sun.position.set(-45, 95, 52); scene.add(sun);
        const env = new Uint8Array(256 * 128 * 4);
        for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) {
          const k = (y * 256 + x) * 4, up = y / 127;
          const band = Math.exp(-Math.pow((up - .50) / .075, 2));
          const ground = clamp((up - .55) / .45, 0, 1), sky = clamp((.55 - up) / .55, 0, 1);
          env[k] = Math.round(20 + sky * 90 + band * 135 + ground * 24);
          env[k + 1] = Math.round(32 + sky * 120 + band * 145 + ground * 25);
          env[k + 2] = Math.round(48 + sky * 154 + band * 150 + ground * 28); env[k + 3] = 255;
        }
        const texture = new T.DataTexture(env, 256, 128, T.RGBAFormat); texture.mapping = T.EquirectangularReflectionMapping; texture.colorSpace = T.SRGBColorSpace; texture.needsUpdate = true;
        scene.environment = texture; scene.environmentIntensity = .85; status.reflectionEnvironment = 'procedural sky/urban horizon';
      },
      render(gl, args) {
        if (!renderer || !scene || !group || map.getZoom() < 14.35 || document.hidden) return;
        const raw = map.transform?.getMatrixForModel?.(anchor, anchorZ), matrix = args?.defaultProjectionData?.mainMatrix;
        if (!raw || !matrix) return;
        camera.projectionMatrix.fromArray(matrix).multiply(new T.Matrix4().fromArray(raw));
        renderer.resetState(); renderer.info.reset(); renderer.render(scene, camera);
        status.drawCalls = renderer.info.render.calls; status.triangles = renderer.info.render.triangles;
      },
      onRemove() { emptyGroup(); renderer?.dispose(); renderer = null; scene = null; }
    };
    const before = (map.getStyle()?.layers || []).find(l => l.type === 'symbol' && /label/.test(l.id))?.id;
    try { map.addLayer(layer, before); layersInstalled = true; } catch (e) { status.error = String(e).slice(0, 160); }
  }
  function build() {
    if (dead || busy || map.isMoving?.()) return;
    const zoom = Number(map.getZoom()); status.zoom = zoom;
    if (zoom < 14.35) { emptyGroup(); status.status = 'standby'; return; }
    if (!templates.size || !scene || !map.getStyle()?.layers?.length) return;
    busy = true;
    try {
      const c = map.getCenter(), center = [c.lng, c.lat], all = collect(), chosen = selectBuildingCandidates(all, center, cap);
      status.candidates = all.length; status.selected = chosen.map(x => ({ id: x.id, name: x.name, q: x.q, model: x.model, size: [x.width, x.depth, x.height] }));
      const key = chosen.map(x => x.id + ':' + x.model + ':' + x.q.map(y => Number(y).toFixed(5)).join(',')).join('|') + ':' + Math.floor(zoom * 2);
      if (key === lastKey && group) { busy = false; return; }
      if (!chosen.length) { emptyGroup(); lastKey = key; status.status = 'waiting-for-matching-mapped-footprints'; busy = false; return; }
      const z = Number(map.queryTerrainElevation?.({ lng: c.lng, lat: c.lat }, { exaggerated: true }) ?? 0), baseRaw = map.transform?.getMatrixForModel?.(center, z);
      if (!baseRaw) { busy = false; return; }
      const inv = new T.Matrix4().fromArray(baseRaw).invert(), next = new T.Group(); next.frustumCulled = false;
      let tris = 0;
      for (const item of chosen) {
        const groundZ = Number(map.queryTerrainElevation?.({ lng: item.q[0], lat: item.q[1] }, { exaggerated: true }) ?? z);
        const raw = map.transform?.getMatrixForModel?.(item.q, groundZ); if (!raw) continue;
        const source = templates.get(item.model); if (!source) continue;
        const root = source.root.clone(true), bounds = source.bounds, h = item.height || 108;
        const modelLongAxisX = bounds.size.x >= bounds.size.z;
        const targetX = modelLongAxisX ? item.width : item.depth;
        const targetZ = modelLongAxisX ? item.depth : item.width;
        const scaleX = clamp(targetX / bounds.size.x, .08, 4), scaleZ = clamp(targetZ / bounds.size.z, .08, 4), scaleY = clamp(h / bounds.size.y, .1, 5);
        root.scale.set(scaleX, scaleY, scaleZ);
        root.position.set(-bounds.base.x * scaleX, -bounds.box.min.y * scaleY, -bounds.base.z * scaleZ);
        const local = new T.Matrix4().fromArray(raw).premultiply(inv);
        const sourceAxisOffset = modelLongAxisX ? 0 : Math.PI / 2;
        const rotation = new T.Matrix4().makeRotationY(item.yaw + sourceAxisOffset);
        const object = new T.Group(); object.matrixAutoUpdate = false;
        object.matrix.copy(local).multiply(rotation); object.add(root); object.traverse(o => { o.frustumCulled = false; }); next.add(object);
        root.traverse(o => { if (o.isMesh && o.geometry) tris += (o.geometry.index?.count || o.geometry.attributes.position?.count || 0) / 3; });
      }
      if (!next.children.length) { status.status = 'waiting-for-mapped-footprints'; busy = false; return; }
      emptyGroup(); group = next; scene.add(group); anchor = center; anchorZ = z; lastKey = key;
      status.modelsPlaced = next.children.length; status.triangleCount = tris; status.status = 'ready'; status.exactSourceGeometry = true; status.terrainAnchored = true; suppressLegacyBuildingFeatures(chosen);
      map.triggerRepaint();
    } catch (e) { status.status = 'error'; status.error = String(e?.message || e).slice(0, 180); } finally { busy = false; }
  }
  function schedule() { if (dead || timer) return; timer = setTimeout(() => { timer = 0; build(); }, 240); }
  async function init() {
    const [three, gl, helper] = await Promise.all([import(T_URL), import(GL_URL), import(H_URL)]);
    T = three.default || three;
    const loader = new gl.GLTFLoader();
    const [city, glass] = await Promise.all([
      helper.loadStreetGLTF(loader, { url: CITY_CATALOG_URL }),
      helper.loadStreetGLTF(loader, { url: MODEL_URL })
    ]);
    const cityRoot = city.scene || city.scenes?.[0], cityNodes = new Map();
    cityRoot?.traverse(o => { if (CITY_MODELS[o.name]) cityNodes.set(o.name, o); });
    for (const name of Object.keys(CITY_MODELS).filter(x => x !== 'BP_GlassTower')) {
      const source = cityNodes.get(name); if (!source) throw Error('Mapped city building source missing: ' + name);
      const root = source.clone(true); root.updateMatrixWorld(true); root.traverse(o => { if (o.isMesh) { const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const m of mats) if (m) { m.side = T.DoubleSide; m.needsUpdate = true; } } });
      templates.set(name, { root, bounds: helper.normalizedBounds(T, root) });
    }
    const root = (glass.scene || glass.scenes?.[0])?.clone(true); if (!root) throw Error('Sketchfab glass building model scene missing');
    const discard = []; root.traverse(o => { if (/^(Camera|Light|Cube)$/i.test(o.name)) discard.push(o); });
    for (const o of discard) o.parent?.remove(o);
    root.traverse(o => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        m.side = T.DoubleSide;
        if (/glass/i.test(String(m.name || ''))) {
          m.transparent = true; m.opacity = .38; m.roughness = .09; m.metalness = .12;
          m.transmission = .62; m.ior = 1.45; m.depthWrite = false;
          if (m.color) m.color.set('#9ec8d8');
        }
        m.needsUpdate = true;
      }
    });
    root.updateMatrixWorld(true); templates.set('BP_GlassTower', { root, bounds: helper.normalizedBounds(T, root) });
    status.templateModels = [...templates.keys()]; installLayer();
  }
  map.on('moveend', schedule); map.on('zoomend', schedule); map.on('sourcedata', e => { if (/building/i.test(String(e.sourceId || ''))) schedule(); });
  map.on('style.load', () => { layersInstalled = false; installLayer(); lastKey = ''; schedule(); });
  map.once('remove', () => { dead = true; clearTimeout(timer); emptyGroup(); renderer?.dispose(); });
  init().then(schedule).catch(e => { status.status = 'asset-error'; status.error = String(e?.message || e).slice(0, 180); });
  return status;
}
