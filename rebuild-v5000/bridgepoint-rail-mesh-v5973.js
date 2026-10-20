/* BridgePoint Rail Mesh / Source-Driven Rolling Stock v5973
 * Materializes source-mapped railway centre-lines into lightweight, terrain-sampled
 * rails and sleepers, then renders source-positioned rolling-stock meshes.
 * MapLibre + Three.js are reused; meshes are region/viewport driven and user opt-in.
 * Current live vehicle feed is the MBTA pilot, not worldwide live train coverage.
 */
(() => {
  'use strict';
  if (window.__BP_RAIL_MESH_V5973__) return;

  const VERSION = 5973;
  const THREE_URL = '/vendor/three.module.js?v=169-local';
  const RAIL_SOURCE = 'ofm';
  const RAIL_SOURCE_LAYER = 'transportation';
  const LIVE_API_KEY = '__BP_LIVE_RAIL_V5969__';
  const LIVE_SOURCE_ID = 'bp-live-rail-source-v5969';
  const LIVE_POINT_LAYER = 'bp-live-rail-points-v5969';
  const MESH_LAYER_ID = 'bp-rail-meshes-v5973';
  const RAIL_MESH_MIN_ZOOM = 11.35;
  const MAX_TRACK_FEATURES = 320;
  const MAX_TRACK_POINTS = 2600;
  const MAX_RAIL_SEGMENTS = 3500;
  const MAX_SLEEPERS = 1800;
  const MAX_TRAIN_CARS = 240;
  const SLEEPER_SPACING = 5.5;
  const MOBILE = matchMedia('(max-width: 760px), (pointer: coarse)').matches;

  let threePromise = null;
  const MAPS = new Set();
  const STATES = new WeakMap();
  const EMPTY = { type: 'FeatureCollection', features: [] };

  const $ = id => document.getElementById(id);
  const safe = (v, max = 240) => String(v ?? '').replace(/[<>]/g, '').slice(0, max);
  const fmt = n => Number(n || 0).toLocaleString();

  function currentMaps() {
    const worlds = [
      window.__BP_LANDING_WORLD__,
      window.__bpLandingWorldV5420,
      window.__BP_V5000_WORLD,
      window.__BP_V5000_WORLD__,
      window.__BP_WORLD
    ];
    const found = [];
    for (const world of worlds) {
      const map = world && world.map;
      if (map && typeof map.on === 'function' && !found.includes(map)) found.push(map);
    }
    return found;
  }

  function css() {
    if ($('bp-rail-mesh-style-v5973')) return;
    const style = document.createElement('style');
    style.id = 'bp-rail-mesh-style-v5973';
    style.textContent = [
      '.bp-rail-mesh-toggle-v5973{border:1px solid rgba(180,219,235,.5)!important;background:linear-gradient(135deg,#2d3941,#111c22)!important;color:#effaff!important;font-weight:900!important;letter-spacing:.02em!important}',
      '.bp-rail-mesh-panel-v5973{position:absolute;z-index:43;top:max(196px,calc(env(safe-area-inset-top) + 190px));right:10px;width:min(365px,calc(100% - 20px));max-height:min(46dvh,390px);overflow:auto;box-sizing:border-box;padding:12px;border:1px solid rgba(190,225,240,.28);border-radius:12px;background:linear-gradient(150deg,rgba(12,23,30,.98),rgba(4,12,17,.98));box-shadow:0 16px 40px rgba(0,0,0,.42);color:#ebf8fc;font:12px/1.45 system-ui,sans-serif}',
      '.bp-rail-mesh-panel-v5973[hidden]{display:none!important}',
      '.bp-rail-mesh-panel-v5973 *{box-sizing:border-box}',
      '.bp-rail-mesh-panel-v5973 .bp-rm-title{font-size:13px;font-weight:950;color:#fff}',
      '.bp-rail-mesh-panel-v5973 .bp-rm-kicker{font-size:9px;font-weight:900;letter-spacing:.14em;color:#a8dce9}',
      '.bp-rail-mesh-panel-v5973 .bp-rm-status{margin:8px 0;min-height:18px;color:#a7ebf7;font-size:10px;overflow-wrap:anywhere}',
      '.bp-rail-mesh-panel-v5973 .bp-rm-status[data-error=true]{color:#ffb4a4}',
      '.bp-rail-mesh-panel-v5973 .bp-rm-statgrid{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:8px 0}',
      '.bp-rail-mesh-panel-v5973 .bp-rm-stat{border:1px solid rgba(190,225,240,.13);border-radius:8px;padding:8px;background:rgba(255,255,255,.025)}',
      '.bp-rail-mesh-panel-v5973 .bp-rm-stat strong{display:block;font-size:16px;color:#fff}',
      '.bp-rail-mesh-panel-v5973 .bp-rm-stat small{display:block;font-size:9px;color:#a7bec8;margin-top:3px}',
      '.bp-rail-mesh-panel-v5973 .bp-rm-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}',
      '.bp-rail-mesh-panel-v5973 .bp-rm-btn{border:1px solid rgba(172,218,232,.3);border-radius:7px;padding:7px 9px;background:#1b2c35;color:#f0fbff;cursor:pointer;font:800 10px system-ui,sans-serif}',
      '.bp-rail-mesh-panel-v5973 .bp-rm-foot{color:#96aeb9;font-size:9px;margin-top:8px}',
      '@media(max-width:520px){.bp-rail-mesh-panel-v5973{right:8px;width:calc(100% - 16px);max-height:42dvh;padding:10px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function status(state, message, isError = false) {
    state.status = safe(message, 380);
    state.error = isError ? state.status : null;
    if (state.statusNode) {
      state.statusNode.textContent = state.status;
      state.statusNode.dataset.error = isError ? 'true' : 'false';
    }
  }

  function terrainElevation(map, coordinate) {
    try {
      if (typeof map.queryTerrainElevation !== 'function') return null;
      const elevation = map.queryTerrainElevation({ lng: coordinate[0], lat: coordinate[1] });
      return typeof elevation === 'number' && Number.isFinite(elevation) ? elevation : null;
    } catch (_) { return null; }
  }

  function metersApart(a, b) {
    const rad = value => value * Math.PI / 180;
    const lat = (a[1] + b[1]) * 0.5;
    const dx = (b[0] - a[0]) * 111320 * Math.cos(rad(lat));
    const dz = (b[1] - a[1]) * 111132;
    return Math.hypot(dx, dz);
  }

  function localPoint(coordinate, anchor, terrainM, anchorTerrainM) {
    const rad = Math.PI / 180;
    const x = (coordinate[0] - anchor[0]) * 111320 * Math.cos(anchor[1] * rad);
    const z = -(coordinate[1] - anchor[1]) * 111132;
    return { x, y: terrainM - anchorTerrainM, z, groundM: terrainM };
  }

  function isRailFeature(feature) {
    const p = feature?.properties || {};
    const cls = String(p.class || '').toLowerCase();
    const sub = String(p.subclass || '').toLowerCase();
    const railway = String(p.railway || '').toLowerCase();
    return cls === 'rail' || cls === 'transit' ||
      ['rail', 'subway', 'light_rail', 'tram', 'monorail', 'narrow_gauge', 'funicular', 'preserved'].includes(sub) ||
      ['rail', 'subway', 'light_rail', 'tram', 'monorail', 'narrow_gauge', 'funicular'].includes(railway);
  }

  function sourceRailFeatures(map) {
    let features = [];
    try {
      if (map.getSource(RAIL_SOURCE)) {
        features = map.querySourceFeatures(RAIL_SOURCE, { sourceLayer: RAIL_SOURCE_LAYER, validate: false }) || [];
      }
    } catch (_) {}
    if (!features.length) {
      // Some map skins use a different vector-source ID. Discover it from the live style.
      let style;
      try { style = map.getStyle?.(); } catch (_) {}
      const sourceIds = [...new Set((style?.layers || [])
        .filter(layer => layer['source-layer'] === RAIL_SOURCE_LAYER && layer.source)
        .map(layer => layer.source))];
      for (const sourceId of sourceIds) {
        try {
          const next = map.querySourceFeatures(sourceId, { sourceLayer: RAIL_SOURCE_LAYER, validate: false }) || [];
          if (next.length) { features = next; break; }
        } catch (_) {}
      }
    }
    const unique = new Map();
    for (const feature of features) {
      if (!isRailFeature(feature) || !feature.geometry) continue;
      const geom = feature.geometry;
      if (geom.type !== 'LineString' && geom.type !== 'MultiLineString') continue;
      const lines = geom.type === 'LineString' ? [geom.coordinates] : geom.coordinates;
      for (const line of lines) {
        if (!Array.isArray(line) || line.length < 2) continue;
        const first = line[0], last = line[line.length - 1];
        if (!Array.isArray(first) || !Array.isArray(last)) continue;
        const key = [
          feature.id ?? feature.properties?.id ?? '',
          Math.round(first[0] * 100000), Math.round(first[1] * 100000),
          Math.round(last[0] * 100000), Math.round(last[1] * 100000),
          line.length
        ].join(':');
        if (!unique.has(key)) unique.set(key, {
          id: key,
          coordinates: line,
          properties: feature.properties || {}
        });
        if (unique.size >= MAX_TRACK_FEATURES) break;
      }
      if (unique.size >= MAX_TRACK_FEATURES) break;
    }
    return [...unique.values()];
  }

  function simplifyLine(coords, maxPoints) {
    const clean = [];
    for (const p of coords || []) {
      if (!Array.isArray(p) || p.length < 2 ||
          !Number.isFinite(p[0]) || !Number.isFinite(p[1]) ||
          p[0] < -180 || p[0] > 180 || p[1] < -90 || p[1] > 90) continue;
      if (!clean.length || metersApart(clean[clean.length - 1], p) >= 2.2) clean.push([p[0], p[1]]);
    }
    if (clean.length > 2 && metersApart(clean[clean.length - 1], clean[clean.length - 2]) < 1.2) clean.pop();
    if (clean.length <= maxPoints) return clean;
    const stride = Math.ceil((clean.length - 1) / Math.max(1, maxPoints - 1));
    const out = [];
    for (let i = 0; i < clean.length - 1; i += stride) out.push(clean[i]);
    out.push(clean[clean.length - 1]);
    return out;
  }

  function triangle(target, a, b, c) {
    target.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  }

  function quad(target, a, b, c, d) {
    triangle(target, a, b, c);
    triangle(target, a, c, d);
  }

  function addRailPrism(target, a, b, offsetM, halfWidthM, bottomOffsetM, topOffsetM, anchorTerrainM) {
    const dx = b.x - a.x, dz = b.z - a.z;
    const length = Math.hypot(dx, dz);
    if (length < 0.05) return false;
    const nx = -dz / length, nz = dx / length;
    const point = (p, lateral, yOffset) => ({
      x: p.x + nx * lateral,
      y: p.y + (p.groundM - anchorTerrainM) * 0 + yOffset,
      z: p.z + nz * lateral
    });
    // a.y/b.y already contain terrain relative to the anchor; set ground-relative rail height.
    const aBase = { ...a, y: a.y + bottomOffsetM }, bBase = { ...b, y: b.y + bottomOffsetM };
    const aTop = { ...a, y: a.y + topOffsetM }, bTop = { ...b, y: b.y + topOffsetM };
    const aL = point(aBase, offsetM - halfWidthM, 0), aR = point(aBase, offsetM + halfWidthM, 0);
    const bL = point(bBase, offsetM - halfWidthM, 0), bR = point(bBase, offsetM + halfWidthM, 0);
    const aLT = point(aTop, offsetM - halfWidthM, 0), aRT = point(aTop, offsetM + halfWidthM, 0);
    const bLT = point(bTop, offsetM - halfWidthM, 0), bRT = point(bTop, offsetM + halfWidthM, 0);
    quad(target, aLT, bLT, bRT, aRT);
    quad(target, aL, aR, bR, bL);
    quad(target, aL, bL, bLT, aLT);
    quad(target, aR, aRT, bRT, bR);
    quad(target, aL, aLT, aRT, aR);
    quad(target, bL, bR, bRT, bLT);
    return true;
  }

  function addSleeperPrism(target, center, tangent, widthM, thicknessM, bottomOffsetM, topOffsetM) {
    const length = Math.hypot(tangent.x, tangent.z);
    if (length < 0.05) return;
    const tx = tangent.x / length, tz = tangent.z / length;
    const nx = -tz, nz = tx;
    const a = { x: center.x - tx * thicknessM / 2 - nx * widthM / 2, z: center.z - tz * thicknessM / 2 - nz * widthM / 2 };
    const b = { x: center.x - tx * thicknessM / 2 + nx * widthM / 2, z: center.z - tz * thicknessM / 2 + nz * widthM / 2 };
    const c = { x: center.x + tx * thicknessM / 2 + nx * widthM / 2, z: center.z + tz * thicknessM / 2 + nz * widthM / 2 };
    const d = { x: center.x + tx * thicknessM / 2 - nx * widthM / 2, z: center.z + tz * thicknessM / 2 - nz * widthM / 2 };
    const bottom = [a, b, c, d].map(p => ({ x: p.x, y: center.y + bottomOffsetM, z: p.z }));
    const top = [a, b, c, d].map(p => ({ x: p.x, y: center.y + topOffsetM, z: p.z }));
    quad(target, top[0], top[1], top[2], top[3]);
    quad(target, bottom[3], bottom[2], bottom[1], bottom[0]);
    for (let i = 0; i < 4; i++) {
      const j = (i + 1) % 4;
      quad(target, bottom[i], bottom[j], top[j], top[i]);
    }
  }

  function buildTrackGeometry(map, anchor, anchorTerrainM, state) {
    const sourceFeatures = sourceRailFeatures(map);
    const rails = [], sleepers = [], bearingSegments = [];
    let pointCount = 0, railSegments = 0, sleeperCount = 0, missingElevation = 0;
    const pointCap = MOBILE ? 760 : MAX_TRACK_POINTS;
    const segmentCap = MOBILE ? 1100 : MAX_RAIL_SEGMENTS;
    const sleeperCap = MOBILE ? 520 : MAX_SLEEPERS;
    const spacing = map.getZoom() >= 15 ? 3.8 : (map.getZoom() >= 13 ? 5.5 : 7.5);

    for (const feature of sourceFeatures) {
      const line = simplifyLine(feature.coordinates, 80);
      if (line.length < 2) continue;
      const valid = [];
      for (const coordinate of line) {
        if (pointCount >= pointCap) break;
        const elevation = terrainElevation(map, coordinate);
        if (elevation === null) {
          valid.push(null);
          missingElevation++;
          continue;
        }
        valid.push(localPoint(coordinate, anchor, elevation, anchorTerrainM));
        pointCount++;
      }
      for (let i = 1; i < valid.length && railSegments < segmentCap; i++) {
        const a = valid[i - 1], b = valid[i];
        if (!a || !b) continue;
        const length = Math.hypot(b.x - a.x, b.z - a.z);
        if (length < 0.25) continue;
        addRailPrism(rails, a, b, -0.7175, 0.045, 0.11, 0.26, anchorTerrainM);
        addRailPrism(rails, a, b, 0.7175, 0.045, 0.11, 0.26, anchorTerrainM);
        railSegments += 2;
        bearingSegments.push({ a, b });

        if (sleeperCount < sleeperCap) {
          const steps = Math.max(1, Math.ceil(length / spacing));
          for (let step = 0; step <= steps && sleeperCount < sleeperCap; step++) {
            const t = step / steps;
            const center = {
              x: a.x + (b.x - a.x) * t,
              y: a.y + (b.y - a.y) * t,
              z: a.z + (b.z - a.z) * t
            };
            addSleeperPrism(sleepers, center, { x: b.x - a.x, z: b.z - a.z }, 2.55, 0.24, 0.015, 0.13);
            sleeperCount++;
          }
        }
      }
      if (railSegments >= segmentCap || pointCount >= pointCap) break;
    }
    return {
      railPositions: rails,
      sleeperPositions: sleepers,
      lineFeatureCount: sourceFeatures.length,
      sampledPoints: pointCount,
      railSegments,
      sleepers: sleeperCount,
      missingElevation,
      trackDirections: bearingSegments
    };
  }

  function makeGeometry(THREE, positions) {
    if (!positions.length) return null;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return geometry;
  }

  function makeTrainGroup(THREE, map, anchor, anchorTerrainM, state) {
    const api = window[LIVE_API_KEY];
    const all = typeof api?.getFeatures === 'function' ? api.getFeatures(state.container.id) : [];
    if (!Array.isArray(all) || !all.length) return { group: new THREE.Group(), vehicles: 0, skippedNoTerrain: 0, featureCount: all?.length || 0 };

    const bounds = map.getBounds?.();
    const boundsData = bounds ? {
      west: bounds.getWest(), east: bounds.getEast(), south: bounds.getSouth(), north: bounds.getNorth()
    } : null;
    const visible = all.filter(feature => {
      const p = feature.geometry?.coordinates;
      if (!Array.isArray(p) || !p.every(Number.isFinite)) return false;
      if (!boundsData) return true;
      // Keep a small margin around the camera footprint so trains can move naturally into view.
      const width = boundsData.east - boundsData.west, height = boundsData.north - boundsData.south;
      return p[0] >= boundsData.west - width * 0.18 && p[0] <= boundsData.east + width * 0.18 &&
        p[1] >= boundsData.south - height * 0.18 && p[1] <= boundsData.north + height * 0.18;
    }).slice(0, Math.min(MAX_TRAIN_CARS, MOBILE ? 100 : 180));

    const prepared = [];
    let skippedNoTerrain = 0;
    for (const feature of visible) {
      const c = feature.geometry.coordinates;
      const elevation = terrainElevation(map, c);
      if (elevation === null) { skippedNoTerrain++; continue; }
      const p = feature.properties || {};
      const routeType = Number(p.routeType);
      const kind = routeType === 2 ? 'commuter-rail' : routeType === 0 ? 'light-rail' : 'rapid-transit';
      const length = kind === 'commuter-rail' ? 26.4 : kind === 'light-rail' ? 24.0 : 18.4;
      const width = kind === 'commuter-rail' ? 3.05 : kind === 'light-rail' ? 2.78 : 2.72;
      const height = kind === 'commuter-rail' ? 3.7 : kind === 'light-rail' ? 3.45 : 3.35;
      const bearing = typeof p.effectiveBearingDegrees === 'number' && Number.isFinite(p.effectiveBearingDegrees)
        ? p.effectiveBearingDegrees
        : typeof p.bearing === 'number' && Number.isFinite(p.bearing) ? p.bearing : null;
      prepared.push({
        id: safe(p.vehicleId || p.label, 64),
        label: safe(p.label || p.vehicleId, 48),
        routeName: safe(p.routeName || 'MBTA rail', 100),
        routeType,
        coordinates: c,
        local: localPoint(c, anchor, elevation, anchorTerrainM),
        bearing,
        speedMph: typeof p.speedMph === 'number' && Number.isFinite(p.speedMph) ? p.speedMph : null,
        updatedAt: p.updatedAt,
        currentStatus: p.currentStatus,
        length, width, height, kind,
        routeColor: typeof p.routeColor === 'string' && /^#[0-9A-Fa-f]{6}$/.test(p.routeColor) ? p.routeColor : '#7cb8c6'
      });
    }

    const group = new THREE.Group();
    if (!prepared.length) return { group, vehicles: 0, skippedNoTerrain, featureCount: all.length };
    const max = prepared.length;
    const bodyGeometry = new THREE.BoxGeometry(3.05, 3.1, 26.4);
    bodyGeometry.translate(0, 1.94, 0);
    const roofGeometry = new THREE.BoxGeometry(2.48, 0.24, 24.7);
    roofGeometry.translate(0, 3.62, 0);
    const underGeometry = new THREE.BoxGeometry(2.44, 0.5, 21.4);
    underGeometry.translate(0, 0.45, 0);
    const windowLeftGeometry = new THREE.BoxGeometry(0.045, 0.58, 18.5);
    windowLeftGeometry.translate(-1.49, 2.55, 0);
    const windowRightGeometry = new THREE.BoxGeometry(0.045, 0.58, 18.5);
    windowRightGeometry.translate(1.49, 2.55, 0);
    const stripeLeftGeometry = new THREE.BoxGeometry(0.065, 0.15, 24.2);
    stripeLeftGeometry.translate(-1.52, 1.47, 0);
    const stripeRightGeometry = new THREE.BoxGeometry(0.065, 0.15, 24.2);
    stripeRightGeometry.translate(1.52, 1.47, 0);
    const wheelGeometry = new THREE.CylinderGeometry(0.36, 0.36, 0.19, 10);
    wheelGeometry.rotateZ(Math.PI / 2);
    const lampGeometry = new THREE.BoxGeometry(0.13, 0.11, 0.12);
    /* instance matrices place the pair of lamps at the actual train ends */

    const materials = {
      body: new THREE.MeshStandardMaterial({ color: '#d9e1e4', roughness: 0.58, metalness: 0.24 }),
      roof: new THREE.MeshStandardMaterial({ color: '#7e8c92', roughness: 0.72, metalness: 0.3 }),
      under: new THREE.MeshStandardMaterial({ color: '#293239', roughness: 0.8, metalness: 0.28 }),
      glass: new THREE.MeshStandardMaterial({ color: '#15252f', roughness: 0.22, metalness: 0.25 }),
      stripe: new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.55, metalness: 0.15 }),
      wheel: new THREE.MeshStandardMaterial({ color: '#34383b', roughness: 0.78, metalness: 0.72 }),
      lamp: new THREE.MeshStandardMaterial({ color: '#fff0be', emissive: '#ffe4a3', emissiveIntensity: 0.8, roughness: 0.25, metalness: 0.1 })
    };

    const instanced = [];
    const createInstances = (geometry, material, count, setColor = false) => {
      const mesh = new THREE.InstancedMesh(geometry, material, Math.max(1, count));
      mesh.frustumCulled = false;
      mesh.count = 0;
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      group.add(mesh);
      instanced.push(mesh);
      if (setColor) mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(1, count) * 3), 3);
      return mesh;
    };

    const body = createInstances(bodyGeometry, materials.body, max);
    const roof = createInstances(roofGeometry, materials.roof, max);
    const under = createInstances(underGeometry, materials.under, max);
    const glassL = createInstances(windowLeftGeometry, materials.glass, max);
    const glassR = createInstances(windowRightGeometry, materials.glass, max);
    const stripeL = createInstances(stripeLeftGeometry, materials.stripe, max, true);
    const stripeR = createInstances(stripeRightGeometry, materials.stripe, max, true);
    const wheels = createInstances(wheelGeometry, materials.wheel, max * 8);
    const lamps = createInstances(lampGeometry, materials.lamp, max * 2);

    const localPosition = (train, lx, ly, lz, q, scale) => {
      const local = new THREE.Vector3(lx * scale.x, ly * scale.y, lz * scale.z).applyQuaternion(q);
      return new THREE.Vector3(train.local.x + local.x, train.local.y + 0.22 + local.y, train.local.z + local.z);
    };

    let wheelIndex = 0, lampIndex = 0;
    prepared.forEach((train, index) => {
      const angle = train.bearing === null ? 0 : Math.PI - train.bearing * Math.PI / 180;
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, 0));
      const scale = new THREE.Vector3(train.width / 3.05, train.height / 3.7, train.length / 26.4);
      const position = new THREE.Vector3(train.local.x, train.local.y + 0.22, train.local.z);
      const matrix = new THREE.Matrix4().compose(position, q, scale);
      for (const mesh of [body, roof, under, glassL, glassR, stripeL, stripeR]) {
        mesh.setMatrixAt(index, matrix);
      }
      const routeColor = new THREE.Color(train.routeColor);
      stripeL.setColorAt(index, routeColor);
      stripeR.setColorAt(index, routeColor);

      for (const side of [-1, 1]) {
        for (const z of [-7.7, -6.5, 6.5, 7.7]) {
          const wheelPos = localPosition(train, side * 1.26, 0.35, z, q, scale);
          const wheelMatrix = new THREE.Matrix4().compose(wheelPos, q, scale);
          wheels.setMatrixAt(wheelIndex++, wheelMatrix);
        }
      }
      for (const z of [-1, 1]) {
        const local = new THREE.Vector3(0, 2.05 * scale.y, z * (train.length * 0.5 - 0.18)).applyQuaternion(q);
        const lampPos = new THREE.Vector3(train.local.x + local.x, train.local.y + 0.22 + local.y, train.local.z + local.z);
        lamps.setMatrixAt(lampIndex++, new THREE.Matrix4().compose(lampPos, q, new THREE.Vector3(1, 1, 1)));
      }
    });
    body.count = roof.count = under.count = glassL.count = glassR.count = stripeL.count = stripeR.count = prepared.length;
    wheels.count = wheelIndex;
    lamps.count = lampIndex;
    for (const mesh of instanced) {
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    }
    group.userData.vehicleMeshes = instanced;
    return {
      group, vehicles: prepared.length, skippedNoTerrain,
      featureCount: all.length,
      trains: prepared.map(t => ({
        id: t.id, label: t.label, routeName: t.routeName, routeType: t.routeType,
        coordinates: t.coordinates, bearing: t.bearing, speedMph: t.speedMph, kind: t.kind
      }))
    };
  }

  function disposeGroup(group) {
    if (!group) return;
    try {
      group.traverse(object => {
        if (object.geometry?.dispose) object.geometry.dispose();
        const list = Array.isArray(object.material) ? object.material : (object.material ? [object.material] : []);
        for (const material of list) {
          if (material?.dispose) material.dispose();
        }
      });
      group.clear();
    } catch (_) {}
  }

  function addStatusCard(map, state) {
    css();
    const container = state.container;
    const safeId = state.safeId;
    const buttonId = 'bp-rail-mesh-toggle-v5973-' + safeId;
    const panelId = 'bp-rail-mesh-panel-v5973-' + safeId;
    let button = $(buttonId);
    if (!button) {
      button = document.createElement('button');
      button.id = buttonId;
      button.type = 'button';
      button.className = 'bp-rail-mesh-toggle-v5973';
      button.textContent = '3D RAIL + TRAINS';
      button.title = 'Materialize source-mapped railway track geometry and 3D rolling stock (MBTA live feed pilot)';
      const tools = document.querySelector('.map-tools');
      if (container.id === 'liveMap' && tools) {
        tools.appendChild(button);
      } else {
        Object.assign(button.style, {
          position: 'absolute', zIndex: '44', right: '12px',
          top: 'max(156px,calc(env(safe-area-inset-top) + 152px))',
          minHeight: '34px', borderRadius: '8px', padding: '7px 9px',
          cursor: 'pointer', font: '850 10px system-ui,sans-serif'
        });
        container.appendChild(button);
      }
      button.addEventListener('click', () => { void toggleMeshMode(map, state); });
    }

    let panel = $(panelId);
    if (!panel) {
      panel = document.createElement('section');
      panel.id = panelId;
      panel.className = 'bp-rail-mesh-panel-v5973';
      panel.hidden = true;
      const head = document.createElement('div');
      head.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:10px';
      const title = document.createElement('div');
      title.appendChild(document.createElement('div'));
      title.firstChild.className = 'bp-rm-kicker';
      title.firstChild.textContent = 'BRIDGEPOINT · MATERIALIZED RAIL';
      const h = document.createElement('div');
      h.className = 'bp-rm-title';
      h.textContent = '3D track + rolling stock';
      title.appendChild(h);
      const close = document.createElement('button');
      close.className = 'bp-rm-btn';
      close.type = 'button';
      close.textContent = '×';
      close.setAttribute('aria-label', 'Close 3D rail panel');
      close.addEventListener('click', () => { panel.hidden = true; });
      head.append(title, close);

      const desc = document.createElement('div');
      desc.className = 'bp-rm-foot';
      desc.textContent = 'Source-mapped railway vectors become raised steel rails, sleepers and solid 3D vehicle bodies. Terrain samples control placement; if terrain is unavailable, meshes wait instead of floating. Live vehicle coverage currently uses the MBTA pilot.';
      const stats = document.createElement('div');
      stats.className = 'bp-rm-statgrid';
      for (const [key, val, label] of [
        ['trains', '—', '3D vehicles in view'],
        ['rails', '—', '3D rail segments'],
        ['sleepers', '—', 'Solid sleepers'],
        ['live', '—', 'Source reports']
      ]) {
        const card = document.createElement('div');
        card.className = 'bp-rm-stat';
        const strong = document.createElement('strong');
        strong.textContent = val;
        const small = document.createElement('small');
        small.textContent = label;
        card.dataset.metric = key;
        card.append(strong, small);
        stats.appendChild(card);
      }
      const statusNode = document.createElement('div');
      statusNode.className = 'bp-rm-status';
      statusNode.setAttribute('role', 'status');
      statusNode.textContent = 'Off · no new track meshes are being materialized.';
      const actions = document.createElement('div');
      actions.className = 'bp-rm-actions';
      const focus = document.createElement('button');
      focus.className = 'bp-rm-btn';
      focus.textContent = 'Focus Boston live feed';
      focus.type = 'button';
      focus.addEventListener('click', () => {
        try {
          map.easeTo({ center: [-71.0589, 42.3601], zoom: Math.max(Math.min(Number(map.getZoom()) || 0, 14), 12.2), pitch: Math.max(Number(map.getPitch()) || 0, 42), duration: 850, essential: true });
          status(state, state.active ? 'Focusing on source-backed MBTA vehicles.' : 'Boston focused · turn 3D RAIL + TRAINS on to materialize geometry.');
        } catch (_) {}
      });
      const stopFollow = document.createElement('button');
      stopFollow.className = 'bp-rm-btn';
      stopFollow.textContent = 'Stop train follow';
      stopFollow.type = 'button';
      stopFollow.addEventListener('click', () => {
        const api = window[LIVE_API_KEY];
        const railState = api?.getState?.().find(s => s.mapId === state.container.id);
        if (!railState?.followingVehicleId) return;
        const followButtons = [...document.querySelectorAll('.maplibregl-popup button')].filter(b => /STOP FOLLOWING/.test(b.textContent || ''));
        for (const b of followButtons) b.click();
      });
      actions.append(focus, stopFollow);

      const source = document.createElement('a');
      source.href = 'https://www.openstreetmap.org/copyright';
      source.target = '_blank';
      source.rel = 'noopener noreferrer';
      source.textContent = 'Track data: OpenStreetMap contributors ↗';
      source.style.cssText = 'display:block;color:#a7e3ef;font-size:10px;margin-top:9px';
      const noPretend = document.createElement('div');
      noPretend.className = 'bp-rm-foot';
      noPretend.textContent = 'This pass is a low-polygon procedural rolling-stock mesh, not a drone scan of the vehicle. Operator-specific licensed GLB/photogrammetry assets can replace the mesh later. Route-color stripes describe the feed route; they are not a claim about verified vehicle livery.';
      panel.append(head, desc, stats, statusNode, actions, source, noPretend);
      container.appendChild(panel);
      state.statusNode = statusNode;
      state.metrics = Object.fromEntries(['trains', 'rails', 'sleepers', 'live'].map(key =>
        [key, panel.querySelector('[data-metric="' + key + '"] strong')]));
    } else {
      state.panel = panel;
      state.statusNode = panel.querySelector('.bp-rm-status');
      state.metrics = Object.fromEntries(['trains', 'rails', 'sleepers', 'live'].map(key =>
        [key, panel.querySelector('[data-metric="' + key + '"] strong')]));
    }
    state.button = button;
    state.panel = panel;
  }

  function renderMetrics(state) {
    const stats = state.stats || {};
    if (state.metrics?.trains) state.metrics.trains.textContent = fmt(stats.trains || 0);
    if (state.metrics?.rails) state.metrics.rails.textContent = fmt(stats.railSegments || 0);
    if (state.metrics?.sleepers) state.metrics.sleepers.textContent = fmt(stats.sleepers || 0);
    if (state.metrics?.live) state.metrics.live.textContent = fmt(stats.liveSourceReports || 0);
    if (state.button) {
      state.button.textContent = state.active ? '3D RAIL + TRAINS ✓' : '3D RAIL + TRAINS';
      state.button.setAttribute('aria-pressed', String(state.active));
    }
  }

  function triggerLiveRail(map, state) {
    const container = state.container;
    let panel = [...document.querySelectorAll('.bp-live-rail-panel-v5969')]
      .find(element => element.parentElement === container);
    if (!panel) {
      const safeId = state.safeId;
      const toggle = $('bp-live-rail-toggle-v5969-' + safeId);
      if (toggle) {
        toggle.click();
        panel = [...document.querySelectorAll('.bp-live-rail-panel-v5969')]
          .find(element => element.parentElement === container);
      }
    }
    if (panel) {
      const checkbox = panel.querySelector('input[type="checkbox"]');
      if (checkbox && !checkbox.checked) checkbox.click();
    }
    try {
      map.easeTo({
        center: [-71.0589, 42.3601],
        zoom: Math.max(Math.min(Number(map.getZoom()) || 0, 14), 12.2),
        pitch: Math.max(Number(map.getPitch()) || 0, 42),
        duration: 850,
        essential: true
      });
    } catch (_) {}
    status(state, 'Live rail requested · focusing on MBTA coverage; terrain and track tiles are loading.');
  }

  function installLayer(map, state) {
    if (map.getLayer(MESH_LAYER_ID)) {
      state.layerAdded = true;
      return true;
    }
    try {
      const style = map.getStyle?.();
      const railSourceReady = !!map.getSource(RAIL_SOURCE) ||
        (style?.layers || []).some(layer => layer['source-layer'] === RAIL_SOURCE_LAYER && layer.source);
      if (!railSourceReady) return false;
      const before = map.getLayer('gta-road-label-major') ? 'gta-road-label-major' :
        map.getLayer('gta-rail') ? 'gta-rail' : undefined;
      map.addLayer({
        id: MESH_LAYER_ID,
        type: 'custom',
        renderingMode: '3d',
        onAdd(mapRef, gl) {
          this.map = mapRef;
          this.THREE = null;
          this.camera = null;
          this.renderer = null;
          this.scene = new THREE_NS.Scene();
          this.camera = new THREE_NS.Camera();
          this.renderer = new THREE_NS.WebGLRenderer({
            canvas: mapRef.getCanvas(), context: gl, antialias: false,
            alpha: true, powerPreference: 'low-power'
          });
          this.renderer.autoClear = false;
          state.customLayer = this;
        },
        render(gl, args) {
          if (!state.active || !this.scene || !state.anchor || !Number.isFinite(state.anchorElevationM) ||
              Number(map.getZoom()) < RAIL_MESH_MIN_ZOOM || state.loading) return;
          try {
            const projection = new THREE_NS.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
            const modelArray = map.transform.getMatrixForModel(state.anchor, state.anchorElevationM);
            const model = new THREE_NS.Matrix4().fromArray(modelArray);
            this.camera.projectionMatrix = projection.multiply(model);
            this.renderer.resetState();
            this.renderer.render(this.scene, this.camera);
          } catch (error) {
            if (!state.renderWarned) {
              state.renderWarned = true;
              status(state, '3D rail render paused: ' + safe(error?.message || error, 160), true);
              console.warn('BridgePoint rail mesh render', error);
            }
          }
        },
        onRemove() {
          try { disposeGroup(this.scene); } catch (_) {}
          try { this.scene?.clear(); } catch (_) {}
          try { this.renderer?.dispose(); } catch (_) {}
          state.customLayer = null;
          state.layerAdded = false;
        }
      }, before);
      state.layerAdded = true;
      return true;
    } catch (error) {
      console.warn('BridgePoint 3D rail layer install', error);
      return false;
    }
  }

  let THREE_NS = null;
  function loadThree() {
    if (!threePromise) {
      threePromise = import(THREE_URL).then(module => module.default || module)
        .then(THREE => { THREE_NS = THREE; return THREE; })
        .catch(error => { threePromise = null; THREE_NS = null; throw error; });
    }
    return threePromise;
  }

  function restore2DRail(state) {
    const map = state.map;
    try {
      if (map.getLayer('gta-rail')) map.setLayoutProperty('gta-rail', 'visibility', state.previousRailVisibility ?? 'visible');
    } catch (_) {}
    state.previousRailVisibility = null;
  }

  function hide2DRail(state) {
    const map = state.map;
    try {
      if (map.getLayer('gta-rail')) {
        state.previousRailVisibility = map.getLayoutProperty('gta-rail', 'visibility') || 'visible';
        map.setLayoutProperty('gta-rail', 'visibility', 'none');
      }
    } catch (_) {}
  }

  function disposeRendered(state) {
    if (!state.customLayer?.scene) return;
    disposeGroup(state.trackGroup);
    disposeGroup(state.trainGroup);
    state.trackGroup = new THREE_NS.Group();
    state.trainGroup = new THREE_NS.Group();
    state.customLayer.scene.clear();
    state.customLayer.scene.add(state.trackGroup, state.trainGroup);
    state.stats = {
      lineFeatureCount: 0, sampledPoints: 0, railSegments: 0,
      sleepers: 0, trains: 0, skippedNoTerrain: 0, liveSourceReports: 0
    };
    renderMetrics(state);
  }

  async function rebuild(map, state, reason = 'viewport') {
    if (!state.active || state.loading || !THREE_NS) return;
    if (Number(map.getZoom()) < RAIL_MESH_MIN_ZOOM) {
      if (state.customLayer?.scene) {
        disposeRendered(state);
        status(state, 'Zoom in to 11.4+ to materialize real rail paths; layer stays active but idle at global zoom.');
      }
      return;
    }
    if (!installLayer(map, state)) {
      status(state, 'Waiting for the existing OpenFreeMap transport source and map style.');
      return;
    }
    const anchor = map.getCenter();
    const anchorCoord = [anchor.lng, anchor.lat];
    const anchorElev = terrainElevation(map, anchorCoord);
    if (anchorElev === null) {
      status(state, 'Waiting for a real terrain DEM sample at the map anchor. No floating mesh is drawn.');
      if (state.customLayer?.scene) disposeRendered(state);
      return;
    }

    state.loading = true;
    const priorTrackGroup = state.trackGroup, priorTrainGroup = state.trainGroup;
    try {
      const track = buildTrackGeometry(map, anchorCoord, anchorElev, state);
      const railsGeo = makeGeometry(THREE_NS, track.railPositions);
      const sleepersGeo = makeGeometry(THREE_NS, track.sleeperPositions);
      const trackGroup = new THREE_NS.Group();
      if (sleepersGeo) {
        const mesh = new THREE_NS.Mesh(sleepersGeo, new THREE_NS.MeshStandardMaterial({
          color: '#55493d', roughness: 0.96, metalness: 0.03, side: THREE_NS.DoubleSide
        }));
        mesh.frustumCulled = false;
        trackGroup.add(mesh);
      }
      if (railsGeo) {
        const mesh = new THREE_NS.Mesh(railsGeo, new THREE_NS.MeshStandardMaterial({
          color: '#8d9a9d', roughness: 0.31, metalness: 0.82, side: THREE_NS.DoubleSide
        }));
        mesh.frustumCulled = false;
        trackGroup.add(mesh);
      }
      const trainData = makeTrainGroup(THREE_NS, map, anchorCoord, anchorElev, state);
      state.trackGroup = trackGroup;
      state.trainGroup = trainData.group;
      state.customLayer.scene.clear();
      const ambient = new THREE_NS.AmbientLight(0xffffff, 1.25);
      const keyLight = new THREE_NS.DirectionalLight(0xffffff, 1.75);
      keyLight.position.set(90, 145, 80);
      const fillLight = new THREE_NS.DirectionalLight(0xbedce6, 0.48);
      fillLight.position.set(-65, 35, -50);
      state.customLayer.scene.add(ambient, keyLight, fillLight, trackGroup, trainData.group);
      state.anchor = anchorCoord;
      state.anchorElevationM = anchorElev;
      state.stats = {
        lineFeatureCount: track.lineFeatureCount,
        sampledPoints: track.sampledPoints,
        railSegments: track.railSegments,
        sleepers: track.sleepers,
        trains: trainData.vehicles,
        skippedNoTerrain: track.missingElevation + trainData.skippedNoTerrain,
        liveSourceReports: trainData.featureCount
      };
      state.trains = trainData.trains || [];
      state.trackDirections = track.trackDirections;
      renderMetrics(state);

      disposeGroup(priorTrackGroup);
      disposeGroup(priorTrainGroup);
      try { state.customLayer?.map?.triggerRepaint(); } catch (_) {}

      if (!trainData.vehicles && !track.railSegments) {
        status(state, 'No 3D meshes emitted: waiting for visible railway tiles, fresh MBTA reports, and terrain samples.');
      } else if (!track.railSegments) {
        status(state, 'Solid 3D trains ready (' + fmt(trainData.vehicles) + ') · railway vector geometry has not loaded in this viewport yet.');
      } else if (!trainData.vehicles) {
        status(state, fmt(track.railSegments) + ' raised rail sections + ' + fmt(track.sleepers) + ' sleepers materialized; waiting for fresh live vehicles in this view.');
      } else {
        status(state, 'MATERIALIZED · ' + fmt(trainData.vehicles) + ' solid 3D train meshes · ' +
          fmt(track.railSegments) + ' raised steel rail sections · ' + fmt(track.sleepers) +
          ' sleepers · ' + fmt(trainData.featureCount) + ' fresh/source-filtered vehicle records.');
      }

      // Report when source-data shapes could not safely conform to terrain.
      if (state.stats.skippedNoTerrain > 0 && track.sampledPoints === 0) {
        status(state, 'Track data is present, but terrain elevations have not arrived for those line vertices; 3D placement is waiting rather than drawing floating tracks.');
      }
    } catch (error) {
      status(state, '3D track/vehicle mesh build failed: ' + safe(error?.message || error, 180), true);
      console.warn('BridgePoint rail mesh build', error);
    } finally {
      state.loading = false;
    }
  }

  function scheduleRebuild(map, state, delay = 250) {
    clearTimeout(state.rebuildTimer);
    state.rebuildTimer = setTimeout(() => {
      state.rebuildTimer = null;
      void rebuild(map, state, 'viewport');
    }, delay);
  }

  async function toggleMeshMode(map, state) {
    if (state.busy) return;
    state.busy = true;
    try {
      if (state.active) {
        state.active = false;
        clearTimeout(state.pollTimer);
        clearTimeout(state.rebuildTimer);
        restore2DRail(state);
        if (state.customLayer?.scene) disposeRendered(state);
        status(state, '3D rail meshes off · source data is unchanged; map-native rail styling restored.');
        renderMetrics(state);
        return;
      }
      state.active = true;
      state.panel.hidden = false;
      status(state, 'Loading Three.js mesh renderer and focusing the live MBTA rail area…');
      hide2DRail(state);
      triggerLiveRail(map, state);
      const THREE = await loadThree();
      state.THREE = THREE;
      if (!installLayer(map, state)) scheduleRebuild(map, state, 500);
      else scheduleRebuild(map, state, 550);
      clearTimeout(state.pollTimer);
      const poll = () => {
        if (!state.active || document.visibilityState === 'hidden') {
          if (state.active) state.pollTimer = setTimeout(poll, 5000);
          return;
        }
        const api = window[LIVE_API_KEY];
        const all = typeof api?.getFeatures === 'function' ? api.getFeatures(state.container.id) : [];
        const signature = Array.isArray(all) ? all.map(f => {
          const p = f.properties || {}, c = f.geometry?.coordinates || [];
          return [p.vehicleId, c[0]?.toFixed?.(5), c[1]?.toFixed?.(5), p.updatedAt].join(':');
        }).join('|') : '';
        if (signature !== state.lastVehicleSignature) {
          state.lastVehicleSignature = signature;
          scheduleRebuild(map, state, 80);
        }
        state.pollTimer = setTimeout(poll, MOBILE ? 2800 : 1800);
      };
      poll();
      renderMetrics(state);
    } catch (error) {
      state.active = false;
      restore2DRail(state);
      status(state, 'The 3D rail renderer could not initialize: ' + safe(error?.message || error, 180), true);
      console.warn('BridgePoint rail mesh activation', error);
    } finally {
      state.busy = false;
    }
  }

  function attachMap(map) {
    if (!map || MAPS.has(map) || typeof map.getContainer !== 'function') return;
    const container = map.getContainer();
    if (!container) return;
    MAPS.add(map);
    const safeId = (container.id || 'map').replace(/[^a-zA-Z0-9_-]/g, '-');
    const state = {
      version: VERSION, map, container, safeId, active: false, busy: false, loading: false,
      layerAdded: false, customLayer: null, trackGroup: null, trainGroup: null,
      anchor: null, anchorElevationM: null, status: 'off', error: null, statusNode: null,
      metrics: null, stats: {}, trains: [], trackDirections: [], rebuildTimer: null,
      pollTimer: null, lastVehicleSignature: '', renderWarned: false, previousRailVisibility: null
    };
    STATES.set(map, state);
    addStatusCard(map, state);
    const onMoveEnd = () => { if (state.active) scheduleRebuild(map, state, 100); };
    const onSourceData = event => {
      if (state.active && event?.sourceId === RAIL_SOURCE && event.isSourceLoaded) scheduleRebuild(map, state, 180);
    };
    map.on('moveend', onMoveEnd);
    map.on('zoomend', onMoveEnd);
    map.on('sourcedata', onSourceData);
    map.on('style.load', () => {
      if (!state.active) return;
      state.layerAdded = false;
      hide2DRail(state);
      scheduleRebuild(map, state, 450);
    });
    map.on('remove', () => {
      clearTimeout(state.rebuildTimer);
      clearTimeout(state.pollTimer);
      restore2DRail(state);
      if (state.customLayer?.scene) disposeRendered(state);
    });
  }

  function discoverMaps() {
    for (const map of currentMaps()) if (!MAPS.has(map)) attachMap(map);
  }

  const api = {
    version: VERSION,
    enabledByDefault: false,
    railSource: 'OpenFreeMap/OpenMapTiles transportation rail geometry',
    liveVehicleSource: 'MBTA V3 API (regional pilot)',
    liveSourceId: LIVE_SOURCE_ID,
    customLayerId: MESH_LAYER_ID,
    getState() {
      return [...MAPS].map(map => {
        const state = STATES.get(map);
        return {
          mapId: state.container.id,
          active: !!state.active,
          status: state.status,
          error: state.error,
          layerAdded: !!(state.layerAdded && map.getLayer?.(MESH_LAYER_ID)),
          vehicles: state.stats.trains || 0,
          railSegments: state.stats.railSegments || 0,
          sleepers: state.stats.sleepers || 0,
          lineFeatureCount: state.stats.lineFeatureCount || 0,
          liveSourceReports: state.stats.liveSourceReports || 0,
          skippedNoTerrain: state.stats.skippedNoTerrain || 0,
          updatedAt: Date.now()
        };
      });
    },
    isRailFeature,
    metersApart,
    localPoint
  };
  window.__BP_RAIL_MESH_V5973__ = api;

  window.addEventListener('load', discoverMaps, { once: true });
  window.addEventListener('bp:world-map-ready-v5940', discoverMaps);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', discoverMaps, { once: true });
  else discoverMaps();
  let attempts = 0;
  const retry = () => {
    discoverMaps();
    attempts++;
    if (MAPS.size === 0 && attempts < 120) setTimeout(retry, 500);
  };
  retry();
  const observer = new MutationObserver(discoverMaps);
  if (document.documentElement) observer.observe(document.documentElement, { childList: true, subtree: true });
})();