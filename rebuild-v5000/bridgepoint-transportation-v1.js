/* BridgePoint Transportation Simulation v2 · DOT-FIRST ADAPTIVE LOD.
 * Uses the existing OpenFreeMap road geometries and BridgePoint's existing 3D map.
 * Global vehicle dots appear first; low/high-detail 3D models upgrade as the user zooms in.
 * All moving civilian and emergency vehicles in this module are simulated.
 * No actual vehicle GPS, dispatch, patient, officer, home or private-property data is used.
 * No private-car GPS, police AVL, EMS AVL, fire dispatch or incident feed is used.
 */
(() => {
  'use strict';
  if (window.__BP_TRANSPORTATION_V1__) return;

  const VERSION = 2;
  const THREE_URL = '/vendor/three.module.js?v=169-local';
  const ROAD_SOURCE = 'ofm';
  const ROAD_SOURCE_LAYER = 'transportation';
  const MODEL_LAYER = 'bp-transportation-v1-models';
  const DOT_SOURCE = 'bp-transportation-v1-dot-source';
  const DOT_LAYER = 'bp-transportation-v1-dots';
  const MODEL_MIN_ZOOM = 10.5;
  const HIGH_DETAIL_ZOOM = 14.5;
  const MAX_ROAD_FEATURES = 220;
  const MAX_GLOBAL_ROADS = 180;
  const MAX_MODEL_ROADS = (() => { try { return matchMedia('(max-width: 760px), (pointer: coarse)').matches ? 14 : 26; } catch (_) { return 18; } })();
  const MAX_MODEL_POINTS = 16;
  const MAX_DOT_POINTS_PER_ROAD = 36;
  const DOT_UPDATE_MS = 380;
  const REBUILD_DEBOUNCE_MS = 520;
  const EMPTY = { type: 'FeatureCollection', features: [] };
  const MOBILE = (() => { try { return matchMedia('(max-width: 760px), (pointer: coarse)').matches; } catch (_) { return false; } })();
  const MAX_DOT_VEHICLES = MOBILE ? 64 : 120;
  const MAX_LOW_DETAIL_MODELS = MOBILE ? 7 : 18;
  const MAX_HIGH_DETAIL_MODELS = MOBILE ? 4 : 10;

  const state = {
    map: null, enabled: false, categories: { civilian: true, police: false, ambulance: false, fire: false },
    threePromise: null, THREE: null, renderer: null, scene: null, camera: null, customLayer: null,
    anchor: null, anchorElevation: null, paths: [], vehicles: [], lastDotAt: 0, lastFrameAt: 0,
    raf: 0, dotTimer: 0, waitTimer: 0, modelBuildTimer: 0, modelBuildToken: 0,
    rebuildTimer: 0, rebuilding: false, pendingRebuild: false, statusNode: null,
    modelLod: 'dots', button: null, options: null, checkboxes: {}, lastError: null,
    popup: null, lastRebuildAt: null, waitAttempts: 0,
    diagnostics: { roads: 0, roadLengthM: 0, vehicles: 0, dots: 0, skippedTerrain: 0, zoom: 0 }
  };

  const $ = selector => document.querySelector(selector);
  const el = (tag, cls, text) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
  const safe = (value, max = 120) => String(value ?? '').replace(/[<>]/g, '').slice(0, max);
  const emptyCollection = () => ({ type: 'FeatureCollection', features: [] });

  function metersApart(a, b) {
    const rad = value => value * Math.PI / 180;
    const lat = (a[1] + b[1]) * .5;
    const dx = (b[0] - a[0]) * 111320 * Math.cos(rad(lat));
    const dz = (b[1] - a[1]) * 111132;
    return Math.hypot(dx, dz);
  }

  function isRoadFeature(feature) {
    const p = feature?.properties || {};
    const cls = String(p.class || '').toLowerCase();
    const sub = String(p.subclass || '').toLowerCase();
    const railway = String(p.railway || '').toLowerCase();
    if (['rail', 'transit', 'ferry', 'aerialway'].includes(cls) ||
        ['rail', 'subway', 'tram', 'light_rail', 'monorail', 'ferry', 'pedestrian', 'footway', 'path', 'cycleway', 'steps', 'bridleway'].includes(sub) ||
        ['rail', 'subway', 'tram', 'light_rail', 'monorail'].includes(railway)) return false;
    return [
      'motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link',
      'secondary', 'secondary_link', 'tertiary', 'tertiary_link', 'minor',
      'residential', 'unclassified', 'service', 'living_street', 'road'
    ].includes(cls) ||
      ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential', 'service', 'road'].includes(sub);
  }

  function vehicleKindForRoad(roadClass, seed) {
    const r = String(roadClass || '').toLowerCase();
    const n = Math.abs(Number(seed) || 0) % 100;
    if (r.includes('motorway') || r.includes('trunk')) {
      if (n < 18) return 'semi-trailer';
      if (n < 28) return 'tractor-truck';
      if (n < 38) return 'box-truck';
      if (n < 48) return 'delivery-van';
    } else if (n < 10) return 'semi-trailer';
    if (n < 18) return 'pickup';
    if (n < 28) return 'suv';
    if (n < 38) return 'electric-sedan';
    if (n < 46) return 'jeep';
    if (n < 54) return 'sports-car';
    if (n < 63) return 'delivery-van';
    if (n < 69) return 'box-truck';
    if (n < 73) return 'city-bus';
    return 'sedan';
  }

  function localPoint(coordinate, anchor, elevationM, anchorElevationM) {
    let deltaLon = Number(coordinate[0]) - Number(anchor[0]);
    if (deltaLon > 180) deltaLon -= 360;
    if (deltaLon < -180) deltaLon += 360;
    const rad = Math.PI / 180;
    return {
      x: deltaLon * 111320 * Math.cos(Number(anchor[1]) * rad),
      y: Number(elevationM) - Number(anchorElevationM),
      z: -(Number(coordinate[1]) - Number(anchor[1])) * 111132
    };
  }

  function cleanLine(coordinates) {
    const result = [];
    for (const coordinate of coordinates || []) {
      if (!Array.isArray(coordinate) || coordinate.length < 2 ||
          !Number.isFinite(Number(coordinate[0])) || !Number.isFinite(Number(coordinate[1])) ||
          Number(coordinate[0]) < -180 || Number(coordinate[0]) > 180 ||
          Number(coordinate[1]) < -85.1 || Number(coordinate[1]) > 85.1) continue;
      const point = [Number(coordinate[0]), Number(coordinate[1])];
      if (!result.length || metersApart(result[result.length - 1], point) >= 3) result.push(point);
    }
    return result;
  }

  function interpolatePath(path, distance) {
    if (!path || !Array.isArray(path.points) || path.points.length < 2 || !(path.length > 0)) return null;
    const d = clamp(Number(distance) || 0, 0, path.length);
    let low = 1, high = path.points.length - 1;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (path.points[mid].distance < d) low = mid + 1;
      else high = mid;
    }
    const b = path.points[low], a = path.points[low - 1];
    const span = Math.max(.001, b.distance - a.distance);
    const t = clamp((d - a.distance) / span, 0, 1);
    return {
      coordinate: [a.coordinate[0] + (b.coordinate[0] - a.coordinate[0]) * t, a.coordinate[1] + (b.coordinate[1] - a.coordinate[1]) * t],
      local: { x: a.local.x + (b.local.x - a.local.x) * t, y: a.local.y + (b.local.y - a.local.y) * t, z: a.local.z + (b.local.z - a.local.z) * t },
      dx: b.local.x - a.local.x, dz: b.local.z - a.local.z,
      roadClass: path.roadClass, distance: d
    };
  }

  function currentMap() {
    const worlds = [
      window.__BP_LANDING_WORLD__, window.__bpLandingWorldV5420,
      window.__BP_V5000_WORLD__, window.__BP_V5000_WORLD,
      window.__bpWorldV2300, window.__BP_WORLD_V2300__
    ];
    for (const world of worlds) if (world?.map && typeof world.map.on === 'function') return world.map;
    return null;
  }

  function addStyle() {
    if ($('#bp-transportation-v1-style')) return;
    const style = el('style');
    style.id = 'bp-transportation-v1-style';
    style.textContent = [
      '.bp-transportation-v1-group{margin-top:10px}',
      '.bp-transportation-v1-group .bpv-command-grid{grid-template-columns:minmax(0,1fr)}',
      '.bp-transportation-v1-toggle{border-color:rgba(77,219,244,.6)!important;background:linear-gradient(135deg,rgba(9,61,78,.98),rgba(10,28,47,.98))!important;color:#effcff!important;font-weight:900!important}',
      '.bp-transportation-v1-toggle.active{border-color:rgba(91,255,197,.74)!important;box-shadow:0 0 18px rgba(57,224,192,.15)!important}',
      '.bp-transportation-v1-options{margin-top:8px;padding:10px;border:1px solid rgba(89,211,238,.24);border-radius:10px;background:rgba(3,14,23,.88);color:#eafaff;font:11px/1.4 system-ui,sans-serif}',
      '.bp-transportation-v1-options[hidden]{display:none!important}',
      '.bp-transportation-v1-options .bp-t-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:7px}',
      '.bp-transportation-v1-options .bp-t-kicker{font-size:9px;font-weight:950;letter-spacing:.13em;color:#77eaff}',
      '.bp-transportation-v1-options .bp-t-sim{font-size:8px;font-weight:900;letter-spacing:.08em;color:#ffd486;border:1px solid rgba(255,196,103,.32);border-radius:10px;padding:3px 6px;white-space:nowrap}',
      '.bp-transportation-v1-options label{display:flex;align-items:flex-start;gap:8px;padding:8px 2px;border-top:1px solid rgba(156,207,225,.11);cursor:pointer}',
      '.bp-transportation-v1-options input{accent-color:#65e9ff;margin:2px 0 0;flex:0 0 auto}',
      '.bp-transportation-v1-options b{display:block;font-size:11px;color:#f2fbff}',
      '.bp-transportation-v1-options small{display:block;color:#9db8c5;font-size:9px;margin-top:2px}',
      '.bp-transportation-v1-options .bp-t-dot{display:inline-block;width:7px;height:7px;border-radius:50%;margin:0 5px 1px 0;vertical-align:middle}',
      '.bp-transportation-v1-options .bp-t-status{margin-top:8px;padding-top:8px;border-top:1px solid rgba(156,207,225,.12);font-size:10px;color:#a8e7f2;min-height:15px;overflow-wrap:anywhere}',
      '.bp-transportation-v1-options .bp-t-foot{font-size:9px;color:#829eac;margin-top:7px;line-height:1.45}',
      '@media(max-width:520px){.bp-transportation-v1-options{padding:8px}.bp-transportation-v1-options label{padding:7px 1px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function setStatus(message, error = false) {
    if (state.statusNode) {
      state.statusNode.textContent = safe(message, 380);
      state.statusNode.dataset.error = error ? 'true' : 'false';
    }
    state.lastError = error ? safe(message, 380) : null;
  }

  function setButtonState() {
    if (!state.button) return;
    state.button.classList.toggle('active', state.enabled);
    state.button.setAttribute('aria-pressed', String(state.enabled));
    const label = state.button.querySelector('.bpv-command-label');
    if (label) label.textContent = state.enabled ? 'Transportation · ON' : 'Transportation';
    state.button.title = state.enabled ? 'Turn off simulated road traffic' : 'Show simulated traffic; dots appear globally and 3D vehicles upgrade as you zoom in';
  }

  function addOptions() {
    if (!state.options) return;
    const names = [
      ['civilian', 'Civilian vehicles', 'Cars, SUVs, pickups, sports cars, electric sedans, Jeeps, vans, buses and trucks.'],
      ['police', 'Police cars', 'SIMULATED police cruisers only · no officer or unit locations.'],
      ['ambulance', 'Ambulances', 'SIMULATED ambulances only · no patient, call or dispatch data.'],
      ['fire', 'Fire trucks', 'SIMULATED fire engines only · no real incident or response locations.']
    ];
    state.options.querySelectorAll('label[data-kind]').forEach(label => {
      const key = label.dataset.kind;
      const input = label.querySelector('input');
      if (input) input.checked = !!state.categories[key];
    });
    if (names.length && !state.options.dataset.ready) {
      state.options.dataset.ready = '1';
      for (const [key, title, note] of names) {
        const label = el('label');
        label.dataset.kind = key;
        const input = el('input');
        input.type = 'checkbox'; input.checked = !!state.categories[key];
        input.addEventListener('change', () => {
          state.categories[key] = input.checked;
          if (state.enabled) void rebuildFleet('filter');
        });
        const copy = el('span');
        const heading = el('b');
        heading.textContent = title;
        if (key === 'police' || key === 'ambulance' || key === 'fire') {
          const colors = { police: '#58aaff', ambulance: '#ffd56a', fire: '#ff5a4e' };
          const dot = el('i', 'bp-t-dot');
          dot.style.background = colors[key];
          heading.prepend(dot);
        }
        const detail = el('small');
        detail.textContent = note;
        copy.append(heading, detail);
        label.append(input, copy);
        state.options.append(label);
        state.checkboxes[key] = input;
      }
    }
  }

  function addUI() {
    addStyle();
    const dockActions = $('#bpv-dock-actions');
    if (!dockActions) return false;
    let group = $('.bp-transportation-v1-group');
    if (!group) {
      group = el('section', 'bpv-command-group bp-transportation-v1-group');
      group.dataset.bpvCommandSection = 'transportation';
      group.setAttribute('aria-label', 'Transportation simulation');
      const heading = el('div', 'bpv-command-heading');
      heading.append(
        el('span', 'bpv-command-heading-icon', '▰'),
        (() => { const wrap = el('span'); const bold = el('b', '', 'TRANSPORTATION'); const small = el('small', '', 'Road vehicles · 3D traffic simulation'); wrap.append(bold, small); return wrap; })()
      );
      const grid = el('div', 'bpv-command-grid');
      grid.dataset.bpvCommandGrid = 'transportation';
      const button = el('button', 'bpv-command-btn bp-transportation-v1-toggle');
      button.type = 'button';
      button.innerHTML = '<span class="bpv-command-icon" aria-hidden="true">▰</span><span class="bpv-command-label">Transportation</span>';
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', () => {
        if (state.enabled) disable();
        else enableSimulation();
      });
      state.button = button;
      grid.append(button);
      const options = el('div', 'bp-transportation-v1-options');
      options.hidden = true;
      options.innerHTML = '<div class="bp-t-head"><b class="bp-t-kicker">VEHICLE FILTERS</b><span class="bp-t-sim">SIMULATION · NOT LIVE GPS</span></div>';
      state.options = options;
      state.statusNode = el('div', 'bp-t-status', 'Transportation is off.');
      state.statusNode.setAttribute('role', 'status');
      const foot = el('p', 'bp-t-foot', 'Road alignment: existing OpenFreeMap / OpenStreetMap road vectors. Vehicle positions, traffic density and emergency activity are simulated for visual testing. No vehicle GPS, dispatch, patient, officer, home or private-property data is queried. Vehicles remain on mapped public road geometry.');
      options.append(state.statusNode, foot);
      group.append(heading, grid, options);
      const mapGroup = dockActions.querySelector('[data-bpv-command-section="map"]');
      if (mapGroup?.parentElement === dockActions) {
        if (mapGroup.nextSibling) dockActions.insertBefore(group, mapGroup.nextSibling);
        else dockActions.append(group);
      } else {
        dockActions.append(group);
      }
    } else {
      state.button = group.querySelector('.bp-transportation-v1-toggle');
      state.options = group.querySelector('.bp-transportation-v1-options');
      state.statusNode = group.querySelector('.bp-t-status');
      addOptions();
      setButtonState();
    }
    if (group.parentElement !== dockActions) dockActions.append(group);
    if (state.options) addOptions();
    setButtonState();
    return true;
  }

  function terrainElevation(map, coordinate) {
    try {
      if (typeof map.queryTerrainElevation !== 'function') return null;
      const elevation = map.queryTerrainElevation({ lng: coordinate[0], lat: coordinate[1] }, { exaggerated: false });
      return typeof elevation === 'number' && Number.isFinite(elevation) ? elevation : null;
    } catch (_) { return null; }
  }

  function featureLines(feature) {
    const geometry = feature?.geometry;
    if (!geometry) return [];
    if (geometry.type === 'LineString') return [geometry.coordinates || []];
    if (geometry.type === 'MultiLineString') return geometry.coordinates || [];
    return [];
  }

  function sourceRoadFeatures(map) {
    const style = map.getStyle?.();
    const sourceIds = [...new Set([
      ROAD_SOURCE,
      ...(style?.layers || []).filter(layer => layer['source-layer'] === ROAD_SOURCE_LAYER && layer.source).map(layer => layer.source)
    ])];
    const found = [];
    const seen = new Set();
    for (const sourceId of sourceIds) {
      if (!map.getSource?.(sourceId)) continue;
      let rows = [];
      try { rows = map.querySourceFeatures(sourceId, { sourceLayer: ROAD_SOURCE_LAYER }) || []; } catch (_) {}
      for (const feature of rows) {
        if (!feature?.geometry || !isRoadFeature(feature)) continue;
        for (const line of featureLines(feature)) {
          const clean = cleanLine(line);
          if (clean.length < 2) continue;
          const first = clean[0], last = clean[clean.length - 1];
          const key = [
            feature.id ?? feature.properties?.id ?? '',
            Math.round(first[0] * 100000), Math.round(first[1] * 100000),
            Math.round(last[0] * 100000), Math.round(last[1] * 100000), clean.length
          ].join(':');
          if (seen.has(key)) continue;
          seen.add(key);
          found.push({ coordinates: clean, roadClass: safe(feature.properties?.class || feature.properties?.subclass || 'road', 32), key });
          if (found.length >= MAX_ROAD_FEATURES) return found;
        }
      }
    }
    return found;
  }

  function buildFlatRoadPaths(source, anchor) {
    const paths = [];
    let totalLength = 0;
    const rows = (Array.isArray(source) ? source : []).slice(0, MAX_GLOBAL_ROADS);
    for (const road of rows) {
      const coordinates = road.coordinates || [];
      if (coordinates.length < 2) continue;
      const stride = Math.max(1, Math.ceil(coordinates.length / MAX_DOT_POINTS_PER_ROAD));
      const sampled = coordinates.filter((point, index) =>
        index === 0 || index === coordinates.length - 1 || index % stride === 0
      );
      const points = [];
      let distance = 0;
      for (const coordinate of sampled) {
        if (points.length) {
          const previous = points[points.length - 1];
          const segment = metersApart(previous.coordinate, coordinate);
          if (segment < 3) continue;
          distance += segment;
        }
        points.push({ coordinate, local: localPoint(coordinate, anchor, 0, 0), distance });
      }
      if (points.length < 2 || distance < 65) continue;
      paths.push({ points, length: distance, roadClass: road.roadClass, key: road.key + ':dot:' + paths.length });
      totalLength += distance;
    }
    return { paths, totalLength, sourceFeatures: rows.length, skippedTerrain: 0 };
  }

  function sampleRoadRows(source) {
    return (Array.isArray(source) ? source : []).slice(0, MAX_MODEL_ROADS).map(road => {
      const coordinates = road.coordinates || [];
      const stride = Math.max(1, Math.ceil(coordinates.length / MAX_MODEL_POINTS));
      return {
        ...road,
        coordinates: coordinates.filter((point, index) =>
          index === 0 || index === coordinates.length - 1 || index % stride === 0
        )
      };
    }).filter(road => road.coordinates.length >= 2);
  }

  function buildRoadPaths(map, anchor, anchorElevation, sourceOverride) {
    const source = Array.isArray(sourceOverride) ? sourceOverride : sourceRoadFeatures(map);
    const paths = [];
    let totalLength = 0, skippedTerrain = 0;
    for (const road of source) {
      if (paths.length >= MAX_MODEL_ROADS) break;
      let chunk = [];
      const flushChunk = () => {
        if (chunk.length < 2) { chunk = []; return; }
        let distance = 0;
        const points = [];
        for (const point of chunk) {
          if (points.length) {
            const previous = points[points.length - 1];
            const length = Math.hypot(point.local.x - previous.local.x, point.local.z - previous.local.z);
            if (length < 2) continue;
            distance += length;
          }
          points.push({ ...point, distance });
        }
        chunk = [];
        if (points.length < 2 || distance < 75 || paths.length >= MAX_MODEL_ROADS) return;
        paths.push({ points, length: distance, roadClass: road.roadClass, key: road.key + ':' + paths.length });
        totalLength += distance;
      };
      for (const coordinate of road.coordinates) {
        const elevation = terrainElevation(map, coordinate);
        if (elevation === null) {
          skippedTerrain++;
          flushChunk();
          continue;
        }
        const local = localPoint(coordinate, anchor, elevation, anchorElevation);
        chunk.push({ coordinate, local });
      }
      flushChunk();
    }
    return { paths, totalLength, sourceFeatures: source.length, skippedTerrain };
  }

  function addPart(T, parts, geometry, position, rotation, color) {
    parts.push({ geometry, position, rotation, color });
  }

  function mergeParts(T, parts) {
    const positions = [], normals = [], colors = [], indices = [];
    let offset = 0;
    for (const part of parts) {
      const geometry = part.geometry;
      const matrix = new T.Matrix4().compose(
        new T.Vector3(...part.position),
        new T.Quaternion().setFromEuler(new T.Euler(...part.rotation)),
        new T.Vector3(1, 1, 1)
      );
      geometry.applyMatrix4(matrix);
      geometry.computeVertexNormals?.();
      const pa = geometry.getAttribute('position'), na = geometry.getAttribute('normal');
      const color = new T.Color(part.color);
      for (let i = 0; i < pa.array.length; i++) positions.push(pa.array[i]);
      if (na) for (let i = 0; i < na.array.length; i++) normals.push(na.array[i]);
      for (let i = 0; i < pa.count; i++) colors.push(color.r, color.g, color.b);
      const index = geometry.index?.array;
      if (index) for (let i = 0; i < index.length; i++) indices.push(offset + index[i]);
      else for (let i = 0; i < pa.count; i++) indices.push(offset + i);
      offset += pa.count;
      geometry.dispose?.();
    }
    const merged = new T.BufferGeometry();
    merged.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
    merged.setAttribute('normal', new T.Float32BufferAttribute(normals, 3));
    merged.setAttribute('color', new T.Float32BufferAttribute(colors, 3));
    merged.setIndex(indices);
    merged.computeBoundingSphere();
    return merged;
  }

  function boxPart(T, list, width, height, length, x, y, z, color, rotation = [0, 0, 0]) {
    addPart(T, list, new T.BoxGeometry(width, height, length), [x, y, z], rotation, color);
  }

  const SPECS = {
    sedan: { length: 4.55, width: 1.82, height: 1.48, radius: .34 },
    suv: { length: 4.85, width: 1.96, height: 1.86, radius: .37 },
    pickup: { length: 5.75, width: 2.02, height: 1.92, radius: .38 },
    'sports-car': { length: 4.42, width: 1.96, height: 1.23, radius: .33 },
    'electric-sedan': { length: 4.72, width: 1.86, height: 1.43, radius: .34 },
    jeep: { length: 4.52, width: 1.91, height: 1.94, radius: .39 },
    'delivery-van': { length: 6.05, width: 2.04, height: 2.52, radius: .38 },
    'box-truck': { length: 8.2, width: 2.48, height: 3.35, radius: .43 },
    'tractor-truck': { length: 8.8, width: 2.58, height: 3.9, radius: .48 },
    'semi-trailer': { length: 17.2, width: 2.58, height: 4.0, radius: .48 },
    'city-bus': { length: 11.4, width: 2.55, height: 3.25, radius: .43 },
    police: { length: 4.82, width: 1.96, height: 1.82, radius: .36 },
    ambulance: { length: 6.55, width: 2.12, height: 2.82, radius: .39 },
    fire: { length: 9.25, width: 2.55, height: 3.35, radius: .43 }
  };

  function addVehicleShell(T, kind, spec, paint) {
    const body = [], glass = [], interior = [], detail = [];
    const W = spec.width, L = spec.length, R = spec.radius;
    const emergency = ['police', 'ambulance', 'fire'].includes(kind);
    const heavy = ['box-truck', 'tractor-truck', 'semi-trailer', 'city-bus', 'fire'].includes(kind);
    const box = (target, w, h, l, x, y, z, color, rot) => boxPart(T, target, w, h, l, x, y, z, color, rot || [0, 0, 0]);
    const cabinHeight = ['sedan', 'electric-sedan', 'sports-car', 'police'].includes(kind) ? .72 :
      ['suv', 'jeep', 'pickup'].includes(kind) ? .92 : 1.25;
    const baseY = R + .34;

    if (kind === 'semi-trailer') {
      // Full articulated tractor + long box trailer; all dimensions are metres.
      box(body, W * .9, .68, 4.2, 0, baseY, 4.6, paint);
      box(body, W * .84, 2.45, 2.55, 0, 1.75, 5.15, paint);
      box(body, W * .82, .12, 1.8, 0, 3.05, 5.15, 0x253642);
      box(body, W * .97, 3.38, 10.3, 0, 2.2, -2.25, paint);
      box(body, W * .92, .22, 10.5, 0, .58, -2.25, 0x283844);
      box(body, W * .86, .16, 10.5, 0, 3.94, -2.25, 0xcbd6dd);
      box(glass, W * .66, .86, .055, 0, 2.1, 6.44, 0x8bc9df);
      box(interior, .55, .45, .8, -.42, 1.55, 5.35, 0x182b32);
      box(interior, .55, .45, .8, .42, 1.55, 5.35, 0x182b32);
      box(interior, 1.55, .08, .28, 0, 1.38, 6.05, 0x182b32);
    } else if (kind === 'tractor-truck' || kind === 'box-truck' || kind === 'city-bus' || kind === 'fire') {
      const isFire = kind === 'fire';
      const isBus = kind === 'city-bus';
      const rearLength = isFire ? 4.85 : isBus ? 7.1 : kind === 'tractor-truck' ? 2.25 : 4.8;
      const cabLength = L - rearLength;
      box(body, W * .94, isBus ? 2.2 : isFire ? 1.95 : 1.6, rearLength, 0, baseY + (isBus ? .8 : isFire ? .65 : .45), -L * .5 + rearLength * .5, paint);
      box(body, W * .9, 1.0, cabLength, 0, baseY + .55, L * .5 - cabLength * .5, paint);
      box(body, W * .78, .12, L * .48, 0, spec.height - .12, 0, 0x253744);
      if (isBus) {
        for (let z = -L * .31; z <= L * .33; z += 1.45) box(glass, .045, .7, .92, -W * .475, 2.18, z, 0x88c5d9);
        for (let z = -L * .31; z <= L * .33; z += 1.45) box(glass, .045, .7, .92, W * .475, 2.18, z, 0x88c5d9);
      } else {
        box(glass, W * .68, .82, .055, 0, baseY + .95, L * .5 - .06, 0x8bc9df);
        box(glass, .045, .67, cabLength * .36, -W * .465, baseY + .95, L * .5 - cabLength * .5, 0x8bc9df);
        box(glass, .045, .67, cabLength * .36, W * .465, baseY + .95, L * .5 - cabLength * .5, 0x8bc9df);
      }
      box(interior, .58, .54, .68, -.43, baseY + .45, L * .5 - cabLength * .53, 0x233b45);
      box(interior, .58, .54, .68, .43, baseY + .45, L * .5 - cabLength * .53, 0x233b45);
      box(interior, 1.35, .12, .25, 0, baseY + .22, L * .5 - .43, 0x172b35);
      if (isFire) {
        box(body, .22, .12, 4.5, 0, spec.height + .18, -1.25, 0xe3c56a);
        box(body, .16, .12, 4.25, 0, spec.height + .34, -1.25, 0x303d49);
        for (const x of [-.58, .58]) box(detail, .18, .16, .18, x, spec.height + .1, 1.35, 0xffe18e);
      }
    } else if (kind === 'ambulance') {
      box(body, W * .96, 1.55, L * .78, 0, baseY + .52, -.02, paint);
      box(body, W * .9, .95, 2.0, 0, baseY + 1.05, .24, 0xf5f8f8);
      box(body, W * .84, .14, L * .75, 0, baseY + .03, -.02, 0xd9e0e3);
      box(body, .055, .3, L * .78, -W * .49, baseY + .2, -.02, 0xd92e35);
      box(body, .055, .3, L * .78, W * .49, baseY + .2, -.02, 0xd92e35);
      box(glass, W * .68, .76, .055, 0, baseY + 1.45, L * .46, 0x81c7dc);
      box(glass, .05, .66, 1.28, -W * .49, baseY + 1.35, .65, 0x81c7dc);
      box(glass, .05, .66, 1.28, W * .49, baseY + 1.35, .65, 0x81c7dc);
      box(interior, .55, .6, .68, -.42, baseY + .72, 1.08, 0x223943);
      box(interior, .55, .6, .68, .42, baseY + .72, 1.08, 0x223943);
      box(interior, 1.2, .12, .24, 0, baseY + .37, 1.58, 0x172b35);
      box(detail, .16, .22, .12, -W * .51, baseY + .35, 0, 0xe1f5ff);
      box(detail, .16, .22, .12, W * .51, baseY + .35, 0, 0xe1f5ff);
    } else if (kind === 'police') {
      box(body, W * .94, .55, L * .86, 0, baseY, 0, paint);
      box(body, W * .87, .3, L * .26, 0, baseY + .38, L * .28, 0xf7f8f8);
      box(body, W * .87, .3, L * .26, 0, baseY + .38, -L * .28, 0x101f32);
      box(body, W * .78, .16, L * .43, 0, spec.height - .08, -.03, 0x162c43);
      box(body, .08, .2, 2.4, -W * .49, baseY + .22, 0, 0x2c6fa5);
      box(body, .08, .2, 2.4, W * .49, baseY + .22, 0, 0x2c6fa5);
      box(glass, W * .7, .52, .055, 0, baseY + .8, L * .35, 0x8bc9df);
      box(glass, W * .7, .5, .055, 0, baseY + .8, -L * .35, 0x8bc9df);
      box(glass, .045, .46, L * .34, -W * .47, baseY + .79, 0, 0x8bc9df);
      box(glass, .045, .46, L * .34, W * .47, baseY + .79, 0, 0x8bc9df);
      box(interior, .52, .52, .65, -.42, baseY + .26, .42, 0x182b32);
      box(interior, .52, .52, .65, .42, baseY + .26, .42, 0x182b32);
      box(interior, .52, .52, .65, -.42, baseY + .26, -.6, 0x182b32);
      box(interior, .52, .52, .65, .42, baseY + .26, -.6, 0x182b32);
    } else {
      // Passenger cars, crossovers, 4x4s, pickups and EVs share one detailed chassis kit.
      const roofHeight = spec.height;
      const cabinLength = kind === 'sports-car' ? L * .4 : kind === 'pickup' ? L * .39 : L * .47;
      const cabinZ = kind === 'pickup' ? .12 : -.03;
      box(body, W * .94, .5, L * .86, 0, baseY, 0, paint);
      box(body, W * .84, .22, L * .24, 0, baseY + .34, L * .28, paint);
      box(body, W * .84, .22, L * .2, 0, baseY + .34, -L * .31, paint);
      box(body, W * .78, .14, cabinLength, 0, roofHeight - .12, cabinZ, kind === 'sports-car' ? 0x1d3444 : paint);
      const pillarHeight = Math.max(.34, roofHeight - baseY - .32);
      for (const x of [-W * .37, W * .37]) {
        for (const z of [cabinZ - cabinLength * .43, cabinZ + cabinLength * .43]) {
          box(body, .095, pillarHeight, .095, x, baseY + .32 + pillarHeight * .5, z, 0x273d4b);
        }
        box(glass, .045, pillarHeight * .72, cabinLength * .57, x * 1.02, baseY + .36 + pillarHeight * .48, cabinZ, 0x83bfd2);
      }
      box(glass, W * .68, pillarHeight * .74, .055, 0, baseY + .37 + pillarHeight * .48, cabinZ + cabinLength * .47, 0x8bc9df, [-.18, 0, 0]);
      box(glass, W * .64, pillarHeight * .66, .055, 0, baseY + .37 + pillarHeight * .48, cabinZ - cabinLength * .47, 0x8bc9df, [.18, 0, 0]);
      // A visible cockpit: dashboard, steering wheel, front/rear seats and centre console.
      box(interior, W * .72, .13, .28, 0, baseY + .4, cabinZ + cabinLength * .31, 0x182c36);
      box(interior, .13, .12, .58, -.43, baseY + .48, cabinZ + cabinLength * .2, 0xb7c6ca);
      box(interior, .13, .12, .58, .43, baseY + .48, cabinZ + cabinLength * .2, 0xb7c6ca);
      for (const x of [-.38, .38]) {
        box(interior, .48, .18, .46, x, baseY + .48, cabinZ - .05, 0x263b44);
        box(interior, .48, .42, .14, x, baseY + .77, cabinZ - .15, 0x1a303a);
        box(interior, .12, .12, .58, x, baseY + .51, cabinZ - cabinLength * .28, 0x263b44);
      }
      box(interior, .28, .1, .56, 0, baseY + .5, cabinZ + .05, 0x1e343d);
      const steering = new T.TorusGeometry(.17, .025, 8, 16);
      addPart(T, interior, steering, [-.38, baseY + .59, cabinZ + cabinLength * .27], [Math.PI / 2, 0, 0], 0xa9b8bd);
      if (kind === 'pickup') {
        box(body, W * .83, .12, L * .29, 0, baseY + .29, -L * .29, 0x263b43);
        for (const x of [-W * .4, W * .4]) box(body, .09, .33, L * .3, x, baseY + .46, -L * .29, paint);
      }
      if (kind === 'jeep') {
        box(body, W * .8, .1, cabinLength * .95, 0, roofHeight + .02, cabinZ, 0x303c43);
        // Rear-mounted spare tyre.
        const spare = new T.TorusGeometry(.31, .09, 8, 16);
        addPart(T, detail, spare, [0, baseY + .45, -L * .51], [Math.PI / 2, 0, 0], 0x20282d);
      }
      if (kind === 'sports-car') {
        box(body, W * .72, .08, .44, 0, baseY + .7, -L * .45, 0x263846);
        box(body, .06, .18, .1, -W * .3, baseY + .78, -L * .45, 0x263846);
        box(body, .06, .18, .1, W * .3, baseY + .78, -L * .45, 0x263846);
      }
      if (kind === 'electric-sedan') {
        box(body, W * .76, .12, .18, 0, baseY + .24, L * .45, 0x9dbac4);
        box(body, W * .76, .08, .3, 0, baseY - .04, 0, 0x1e3949);
      }
      if (kind === 'suv' || kind === 'jeep') {
        box(body, W * .86, .12, L * .5, 0, roofHeight - .02, cabinZ, paint);
      }
    }

    // Shared front/rear lighting and body details, with the emergency-specific roof bar.
    const headColor = 0xfff0c1, tailColor = 0xc9313b;
    box(detail, .22, .13, .055, -W * .31, R + .58, L * .48, headColor);
    box(detail, .22, .13, .055, W * .31, R + .58, L * .48, headColor);
    box(detail, .2, .14, .055, -W * .31, R + .58, -L * .48, tailColor);
    box(detail, .2, .14, .055, W * .31, R + .58, -L * .48, tailColor);
    if (emergency) {
      box(body, W * .64, .12, .32, 0, spec.height + .05, .08, 0x1d303e);
    }
    const bodyGeometry = mergeParts(T, body);
    const glassGeometry = mergeParts(T, glass);
    const interiorGeometry = mergeParts(T, interior);
    const detailGeometry = mergeParts(T, detail);
    return { bodyGeometry, glassGeometry, interiorGeometry, detailGeometry };
  }

  function makeVehicleLowLod(T, item) {
    const kind = item.kind;
    const spec = SPECS[kind] || SPECS.sedan;
    const group = new T.Group();
    const wheelPivots = [];
    const flashMeshes = [];
    const materials = [];
    let paint = 0x238eaf;
    if (kind === 'police') paint = 0xf2f4f5;
    if (kind === 'ambulance') paint = 0xf5f7f6;
    if (kind === 'fire') paint = 0xb9252d;
    const material = (color, roughness = .58, metalness = .16, emissive = 0x000000) => {
      const m = new T.MeshStandardMaterial({ color, roughness, metalness, emissive, emissiveIntensity: emissive ? .75 : 0 });
      materials.push(m);
      return m;
    };
    const box = (w, h, l, x, y, z, color) => {
      const mesh = new T.Mesh(new T.BoxGeometry(w, h, l), material(color));
      mesh.position.set(x, y, z);
      group.add(mesh);
      return mesh;
    };
    const L = spec.length, W = spec.width, H = spec.height, R = spec.radius;
    const heavy = ['semi-trailer', 'tractor-truck', 'box-truck', 'city-bus', 'fire'].includes(kind);
    box(W * .96, Math.max(.35, H * .24), L * .9, 0, H * .3, 0, paint);
    if (kind === 'semi-trailer') {
      box(W * .94, H * .62, L * .56, 0, H * .62, -L * .18, paint);
      box(W * .82, H * .52, L * .25, 0, H * .55, L * .32, paint);
    } else if (heavy) {
      box(W * .9, H * .58, L * .54, 0, H * .62, -L * .12, paint);
      box(W * .82, H * .48, L * .27, 0, H * .55, L * .31, paint);
    } else {
      box(W * .75, H * .4, L * .44, 0, H * .66, -.02, kind === 'sports-car' ? 0x243d50 : paint);
    }
    box(W * .62, Math.max(.24, H * .15), .07, 0, H * .68, L * .46, 0x8bc9df);
    box(W * .62, .07, .12, 0, H * .22, L * .47, 0xfff0c1);
    box(W * .62, .07, .12, 0, H * .22, -L * .47, 0xc9313b);

    const axlePositions = heavy ? [-L * .31, -L * .16, L * .3] : [-L * .3, L * .3];
    for (const z of axlePositions) {
      for (const x of [-W * .51, W * .51]) {
        const pivot = new T.Group();
        pivot.position.set(x, R, z);
        const tire = new T.Mesh(new T.CylinderGeometry(R, R, .16, 8), material(0x171b1e, .9, .02));
        tire.rotation.z = Math.PI / 2;
        pivot.add(tire);
        group.add(pivot);
        wheelPivots.push(pivot);
      }
    }
    if (['police', 'ambulance', 'fire'].includes(kind)) {
      box(W * .58, .08, .2, 0, H + .06, .02, 0x172a38);
      const colors = kind === 'fire' ? [0xff3a34, 0xffe5a3] : [0x2385ff, 0xff334b];
      colors.forEach((color, phase) => {
        const lampMaterial = material(color, .2, .12, color);
        const lamp = new T.Mesh(new T.BoxGeometry(W * .2, .1, .12), lampMaterial);
        lamp.position.set(phase ? W * .15 : -W * .15, H + .11, .02);
        group.add(lamp);
        flashMeshes.push({ mesh: lamp, material: lampMaterial, phase });
      });
    }
    return { group, wheelPivots, flashMeshes, spec, materials };
  }

  function makeVehicle(T, item) {
    const kind = item.kind;
    const spec = SPECS[kind] || SPECS.sedan;
    let paint = 0x258aa9;
    if (kind === 'police') paint = 0xf0f3f5;
    if (kind === 'ambulance') paint = 0xf4f6f5;
    if (kind === 'fire') paint = 0xb9252d;
    const shell = addVehicleShell(T, kind, spec, paint);
    const group = new T.Group();
    const bodyMaterial = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .48, metalness: .36 });
    const glassMaterial = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .16, metalness: .12, transparent: true, opacity: .52, depthWrite: false, side: T.DoubleSide });
    const interiorMaterial = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .82, metalness: .08 });
    const detailMaterial = new T.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: .38, metalness: .3, emissive: 0x121a20, emissiveIntensity: .12 });
    const meshes = [
      new T.Mesh(shell.bodyGeometry, bodyMaterial),
      new T.Mesh(shell.glassGeometry, glassMaterial),
      new T.Mesh(shell.interiorGeometry, interiorMaterial),
      new T.Mesh(shell.detailGeometry, detailMaterial)
    ];
    for (const mesh of meshes) { mesh.frustumCulled = false; group.add(mesh); }
    const radius = spec.radius;
    const tireMaterial = new T.MeshStandardMaterial({ color: 0x171b1e, roughness: .9, metalness: .05 });
    const hubMaterial = new T.MeshStandardMaterial({ color: 0x9ba8ae, roughness: .35, metalness: .8 });
    const wheelPivots = [];
    let wheelPositions;
    if (kind === 'semi-trailer') {
      wheelPositions = [];
      for (const z of [5.1, 3.65, .2, -4.9, -6.15]) {
        wheelPositions.push([-spec.width * .51, z], [spec.width * .51, z]);
      }
    } else if (kind === 'tractor-truck' || kind === 'box-truck' || kind === 'city-bus' || kind === 'fire') {
      wheelPositions = [];
      for (const z of [-spec.length * .32, -spec.length * .23, spec.length * .28]) wheelPositions.push([-spec.width * .51, z], [spec.width * .51, z]);
    } else {
      wheelPositions = [
        [-spec.width * .51, -spec.length * .3], [spec.width * .51, -spec.length * .3],
        [-spec.width * .51, spec.length * .3], [spec.width * .51, spec.length * .3]
      ];
    }
    for (const [x, z] of wheelPositions) {
      const pivot = new T.Group();
      pivot.position.set(x, radius, z);
      const tire = new T.Mesh(new T.CylinderGeometry(radius, radius, .2, 16), tireMaterial);
      tire.rotation.z = Math.PI / 2;
      const hub = new T.Mesh(new T.CylinderGeometry(radius * .47, radius * .47, .215, 12), hubMaterial);
      hub.rotation.z = Math.PI / 2;
      hub.position.x = x < 0 ? -.105 : .105;
      pivot.add(tire, hub);
      group.add(pivot);
      wheelPivots.push(pivot);
    }
    const flashMeshes = [];
    if (['police', 'ambulance', 'fire'].includes(kind)) {
      const bar = new T.Group();
      bar.position.set(0, spec.height + .12, .05);
      const housing = new T.Mesh(new T.BoxGeometry(spec.width * .56, .09, .24), new T.MeshStandardMaterial({ color: 0x151e2b, roughness: .38, metalness: .3 }));
      bar.add(housing);
      const colors = kind === 'police' ? [0x1e75ff, 0xff334b] : kind === 'ambulance' ? [0x1e75ff, 0xff334b] : [0xff2d2d, 0xffe3a1];
      for (let i = 0; i < 2; i++) {
        const material = new T.MeshStandardMaterial({ color: colors[i], emissive: colors[i], emissiveIntensity: 1.3, roughness: .18 });
        const lamp = new T.Mesh(new T.BoxGeometry(spec.width * .24, .11, .18), material);
        lamp.position.set(i ? spec.width * .14 : -spec.width * .14, .015, 0);
        bar.add(lamp); flashMeshes.push({ mesh: lamp, material, phase: i });
      }
      group.add(bar);
    }
    return { group, wheelPivots, flashMeshes, spec, materials: [bodyMaterial, glassMaterial, interiorMaterial, detailMaterial, tireMaterial, hubMaterial] };
  }

  function seedRandom(seed) {
    let value = (Math.abs(Number(seed) || 1) % 2147483646) + 1;
    return () => { value = (value * 48271) % 2147483647; return value / 2147483647; };
  }

  function roadSpeed(roadClass, random) {
    const cls = String(roadClass || '').toLowerCase();
    let base = cls.includes('motorway') ? 25 : cls.includes('trunk') ? 21 :
      cls.includes('primary') ? 17 : cls.includes('secondary') ? 14 :
      cls.includes('tertiary') ? 12 : cls.includes('service') ? 7 : 9;
    return clamp(base * (.65 + random() * .55), 4.5, 29);
  }

  function selectModelLod(zoom) {
    const z = Number(zoom) || 0;
    if (z < MODEL_MIN_ZOOM) return 'dots';
    return z < HIGH_DETAIL_ZOOM ? 'low' : 'high';
  }

  function buildFleet(paths, zoom, maxVehicles = MAX_DOT_VEHICLES) {
    const chosen = [];
    if (!paths.length) return chosen;
    const totalLength = paths.reduce((sum, path) => sum + path.length, 0);
    const max = Math.max(0, Number(maxVehicles) || 0);
    const spacing = zoom >= 15 ? 90 : zoom >= 13 ? 180 : zoom >= 10 ? 340 : 1800;
    const capacities = new Map(paths.map(path => [path, Math.max(1, Math.floor(path.length / Math.max(90, spacing * .9)))]));
    const capacityTotal = [...capacities.values()].reduce((sum, value) => sum + value, 0);
    const civilianCount = state.categories.civilian
      ? Math.min(max, capacityTotal, Math.max(1, Math.floor(totalLength / spacing)))
      : 0;
    const random = seedRandom(Math.floor((paths[0]?.length || 1) * 1000) + paths.length * 97);
    const used = new Map();
    const selectPathAndPosition = () => {
      const available = paths.filter(path => (used.get(path) || 0) < (capacities.get(path) || 0));
      if (!available.length) return null;
      const path = available[Math.floor(random() * available.length)];
      const slot = used.get(path) || 0;
      used.set(path, slot + 1);
      const slots = capacities.get(path) || 1;
      return { path, start: ((slot + .25 + random() * .5) / slots) * path.length };
    };
    for (let i = 0; i < civilianCount; i++) {
      const assignment = selectPathAndPosition();
      if (!assignment) break;
      const { path, start } = assignment;
      const kind = vehicleKindForRoad(path.roadClass, random() * 100);
      chosen.push({
        kind, category: 'civilian', path, distance: start,
        direction: random() > .5 ? 1 : -1,
        speed: roadSpeed(path.roadClass, random) * (.78 + random() * .42),
        id: 'SIM-C-' + String(i + 1).padStart(3, '0')
      });
    }
    const addEmergency = (enabled, kind, category, count) => {
      if (!enabled) return;
      const cap = MOBILE ? 1 : 3;
      const number = Math.min(cap, Math.max(1, Math.floor(Math.max(1, civilianCount) * .035)));
      for (let i = 0; i < number; i++) {
        const path = paths[Math.floor(random() * paths.length)];
        chosen.push({
          kind, category, path, distance: random() * path.length,
          direction: random() > .5 ? 1 : -1,
          speed: Math.min(roadSpeed(path.roadClass, random) * 1.18, 30),
          id: 'SIM-' + category.toUpperCase() + '-' + String(i + 1).padStart(2, '0')
        });
      }
    };
    addEmergency(state.categories.police, 'police', 'police');
    addEmergency(state.categories.ambulance, 'ambulance', 'ambulance');
    addEmergency(state.categories.fire, 'fire', 'fire');
    return chosen;
  }

  function disposeVehicleVisual(vehicle) {
    const visual = vehicle?.visual;
    if (!visual) return;
    try { state.scene?.remove(visual.group); } catch (_) {}
    const geometries = new Set(), materials = new Set();
    visual.group.traverse?.(node => {
      if (node.geometry) geometries.add(node.geometry);
      if (node.material) {
        const list = Array.isArray(node.material) ? node.material : [node.material];
        list.forEach(item => materials.add(item));
      }
    });
    geometries.forEach(item => item.dispose?.());
    materials.forEach(item => item.dispose?.());
    (visual.materials || []).forEach(item => { if (!materials.has(item)) item.dispose?.(); });
    delete vehicle.visual;
  }

  function clearVehicleModels() {
    if (state.modelBuildTimer) clearTimeout(state.modelBuildTimer);
    state.modelBuildTimer = 0;
    state.modelBuildToken++;
    for (const vehicle of state.vehicles) disposeVehicleVisual(vehicle);
    state.modelLod = 'dots';
  }

  function clearVehicleScene() {
    clearVehicleModels();
    state.vehicles = [];
  }

  function ensureLayers(map) {
    if (!map?.getStyle?.()) return false;
    try {
      if (!map.getSource(DOT_SOURCE)) map.addSource(DOT_SOURCE, { type: 'geojson', data: EMPTY });
      if (!map.getLayer(DOT_LAYER)) {
        const layer = {
          id: DOT_LAYER, type: 'circle', source: DOT_SOURCE, minzoom: 0,
          paint: {
            'circle-radius': ['interpolate', ['linear'], ['zoom'], 0, 2.2, 5, 3.2, 10, 3.8, 15, 4.8, 20, 5.8],
            'circle-color': ['match', ['get', 'category'], 'police', '#58aaff', 'ambulance', '#ffd56a', 'fire', '#ff5a4e', '#2ec2df'],
            'circle-stroke-color': '#061824', 'circle-stroke-width': 1.15, 'circle-opacity': .98,
            'circle-pitch-alignment': 'map'
          }
        };
        const before = map.getLayer('gta-road-label-major') ? 'gta-road-label-major' : undefined;
        map.addLayer(layer, before);
      }
      if (!map.__bpTransportationV1EventsBound) {
        map.__bpTransportationV1EventsBound = true;
        map.on('click', DOT_LAYER, event => showVehiclePopup(map, event));
        map.on('mouseenter', DOT_LAYER, () => { try { map.getCanvas().style.cursor = 'pointer'; } catch (_) {} });
        map.on('mouseleave', DOT_LAYER, () => { try { map.getCanvas().style.cursor = ''; } catch (_) {} });
      }
      return true;
    } catch (error) {
      console.warn('BridgePoint Transportation dot layer install', error);
      return false;
    }
  }

  function showVehiclePopup(map, event) {
    const feature = event?.features?.[0];
    if (!feature || !window.maplibregl?.Popup) return;
    const props = feature.properties || {};
    try { state.popup?.remove?.(); } catch (_) {}
    const content = el('div');
    Object.assign(content.style, { minWidth: '190px', maxWidth: '270px', color: '#07151d', font: '12px/1.45 system-ui,sans-serif' });
    const title = el('b', '', safe(props.model || 'Simulated vehicle', 80));
    Object.assign(title.style, { display: 'block', fontSize: '13px', marginBottom: '5px' });
    const rows = [
      'Category: ' + safe(props.categoryLabel || 'Civilian traffic'),
      'Road class: ' + safe(props.roadClass || 'road'),
      'Simulated speed: ' + (Number(props.speedMph) || 0).toFixed(0) + ' mph',
      props.emergency === 'true' ? 'Emergency lighting: simulated / active' : 'Vehicle: civilian traffic simulation',
      'Position source: generated on mapped road geometry'
    ];
    content.append(title);
    for (const value of rows) {
      const row = el('div', '', value);
      Object.assign(row.style, { marginTop: '4px', fontSize: '10px' });
      content.append(row);
    }
    const note = el('div', '', 'SIMULATED VEHICLE · NOT A LIVE TRACK. No driver, officer, patient, dispatch or private-address data is attached.');
    Object.assign(note.style, { marginTop: '9px', paddingTop: '7px', borderTop: '1px solid #cbd7dd', fontSize: '9px', color: '#536673' });
    content.append(note);
    try {
      state.popup = new window.maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '290px' })
        .setLngLat(event.lngLat)
        .setDOMContent(content)
        .addTo(map);
    } catch (error) { console.warn('BridgePoint Transportation popup', error); }
  }

  async function loadThree() {
    if (!state.threePromise) {
      state.threePromise = import(THREE_URL)
        .then(module => module.default || module)
        .then(THREE => { state.THREE = THREE; return THREE; })
        .catch(error => { state.threePromise = null; state.THREE = null; throw error; });
    }
    return state.threePromise;
  }

  function installModelLayer(map, THREE) {
    if (map.getLayer(MODEL_LAYER) && state.renderer && state.scene) return true;
    if (map.getLayer(MODEL_LAYER) && (!state.renderer || !state.scene)) {
      try { map.removeLayer(MODEL_LAYER); } catch (_) {}
    }
    const layer = {
      id: MODEL_LAYER, type: 'custom', renderingMode: '3d',
      onAdd(mapRef, gl) {
        const renderer = new THREE.WebGLRenderer({ canvas: mapRef.getCanvas(), context: gl, antialias: false, alpha: true, powerPreference: 'low-power' });
        renderer.autoClear = false;
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        const scene = new THREE.Scene();
        scene.add(new THREE.AmbientLight(0xffffff, 1.45));
        const key = new THREE.DirectionalLight(0xffffff, 2.0); key.position.set(-.65, -.7, 1.2); scene.add(key);
        const fill = new THREE.DirectionalLight(0x80cfff, .62); fill.position.set(.6, .4, .8); scene.add(fill);
        const rim = new THREE.DirectionalLight(0xffdfae, .35); rim.position.set(.2, .8, -.5); scene.add(rim);
        state.renderer = renderer; state.scene = scene; state.camera = new THREE.Camera(); state.customLayer = layer;
      },
      render(gl, args) {
        if (!state.enabled || !state.renderer || !state.scene || !state.anchor || !Number.isFinite(state.anchorElevation)) return;
        try {
          const rawProjection = args?.defaultProjectionData?.mainMatrix || args?.modelViewProjectionMatrix || args;
          if (!rawProjection || typeof rawProjection.length !== 'number' || rawProjection.length < 16) return;
          const projection = new THREE.Matrix4().fromArray(rawProjection);
          const modelArray = map.transform.getMatrixForModel(state.anchor, state.anchorElevation);
          const model = new THREE.Matrix4().fromArray(modelArray);
          state.camera.projectionMatrix = projection.multiply(model);
          state.renderer.resetState?.();
          state.renderer.render(state.scene, state.camera);
        } catch (error) {
          if (!state.lastError) { state.lastError = safe(error?.message || error, 180); setStatus('3D transportation rendering paused: ' + state.lastError, true); }
        }
      },
      onRemove() {
        clearVehicleModels();
        try { state.renderer?.dispose(); } catch (_) {}
        state.renderer = null; state.scene = null; state.camera = null; state.customLayer = null;
      }
    };
    try {
      const before = map.getLayer('gta-road-label-major') ? 'gta-road-label-major' : undefined;
      map.addLayer(layer, before);
      return !!state.renderer && !!state.scene;
    } catch (error) {
      console.warn('BridgePoint Transportation 3D layer install', error);
      return false;
    }
  }

  function makeVisualFleet(T, candidates, lod) {
    clearVehicleModels();
    if (!state.scene || !state.enabled) return;
    const limit = lod === 'high' ? MAX_HIGH_DETAIL_MODELS : MAX_LOW_DETAIL_MODELS;
    const selected = candidates.slice(0, limit);
    const token = ++state.modelBuildToken;
    state.modelLod = lod;
    let index = 0;
    stopDotAnimation();
    const addBatch = () => {
      state.modelBuildTimer = 0;
      if (!state.enabled || token !== state.modelBuildToken || !state.scene) return;
      const end = Math.min(index + 2, selected.length);
      for (; index < end; index++) {
        const item = selected[index];
        try {
          const visual = lod === 'high' ? makeVehicle(T, item) : makeVehicleLowLod(T, item);
          state.scene.add(visual.group);
          item.visual = visual;
          item.spin = 0;
        } catch (error) {
          console.warn('BridgePoint Transportation vehicle LOD', error);
        }
      }
      try { state.map?.triggerRepaint?.(); } catch (_) {}
      if (index < selected.length) state.modelBuildTimer = setTimeout(addBatch, 12);
      else startAnimation();
    };
    addBatch();
  }

  function updateVehiclePose(vehicle, deltaSeconds, now) {
    const path = vehicle.path;
    if (!path || path.length <= 1) return null;
    const movement = vehicle.speed * deltaSeconds * vehicle.direction;
    let next = vehicle.distance + movement;
    if (next > path.length) { next = path.length - (next - path.length); vehicle.direction = -1; }
    if (next < 0) { next = -next; vehicle.direction = 1; }
    vehicle.distance = clamp(next, 0, path.length);
    const point = interpolatePath(path, vehicle.distance);
    if (!point) return null;
    if (vehicle.visual) {
      const direction = vehicle.direction;
      const dx = point.dx * direction, dz = point.dz * direction;
      const yaw = Math.atan2(dx, dz);
      vehicle.visual.group.position.set(point.local.x, point.local.y + .035, point.local.z);
      vehicle.visual.group.rotation.set(0, yaw, 0);
      const spinDelta = (vehicle.speed * deltaSeconds / Math.max(.1, vehicle.visual.spec.radius));
      vehicle.spin += spinDelta * direction;
      for (const wheel of vehicle.visual.wheelPivots) wheel.rotation.x = vehicle.spin;
      for (const flash of vehicle.visual.flashMeshes) {
        const active = (Math.floor(now / 170) + flash.phase) % 2 === 0;
        flash.material.emissiveIntensity = active ? 2.8 : .12;
        flash.mesh.visible = true;
      }
    }
    return {
      type: 'Feature',
      geometry: { type: 'Point', coordinates: point.coordinate },
      properties: {
        id: vehicle.id, kind: vehicle.kind, category: vehicle.category,
        categoryLabel: vehicle.category === 'civilian' ? 'Civilian traffic' :
          vehicle.category === 'police' ? 'Simulated police' :
          vehicle.category === 'ambulance' ? 'Simulated ambulance' : 'Simulated fire truck',
        model: vehicle.kind.replace(/-/g, ' '),
        roadClass: path.roadClass, speedMph: vehicle.speed * 2.236936,
        emergency: ['police', 'ambulance', 'fire'].includes(vehicle.category) ? 'true' : 'false'
      }
    };
  }

  function updateDots(now, force = false) {
    if (!state.map || (!force && now - state.lastDotAt < DOT_UPDATE_MS)) return;
    state.lastDotAt = now;
    const features = [];
    for (const vehicle of state.vehicles) {
      const pose = interpolatePath(vehicle.path, vehicle.distance);
      if (!pose) continue;
      const category = vehicle.category;
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: pose.coordinate },
        properties: {
          id: vehicle.id, category,
          categoryLabel: category === 'civilian' ? 'Civilian traffic' : category === 'police' ? 'Simulated police' : category === 'ambulance' ? 'Simulated ambulance' : 'Simulated fire truck',
          model: vehicle.kind.replace(/-/g, ' '),
          roadClass: vehicle.path.roadClass,
          speedMph: vehicle.speed * 2.236936,
          emergency: ['police', 'ambulance', 'fire'].includes(category) ? 'true' : 'false'
        }
      });
    }
    try { state.map.getSource(DOT_SOURCE)?.setData({ type: 'FeatureCollection', features }); } catch (_) {}
    state.diagnostics.dots = features.length;
  }

  function dotAnimationTick() {
    state.dotTimer = 0;
    if (!state.enabled || document.visibilityState === 'hidden' || state.modelLod !== 'dots') return;
    const now = performance.now();
    for (const vehicle of state.vehicles) updateVehiclePose(vehicle, DOT_UPDATE_MS / 1000, now);
    updateDots(now, true);
    state.dotTimer = setTimeout(dotAnimationTick, DOT_UPDATE_MS);
  }

  function startDotAnimation() {
    if (state.dotTimer || !state.enabled || state.modelLod !== 'dots') return;
    state.dotTimer = setTimeout(dotAnimationTick, DOT_UPDATE_MS);
  }

  function animationFrame(now) {
    state.raf = 0;
    if (!state.enabled || document.visibilityState === 'hidden' || state.modelLod === 'dots') return;
    if (state.lastFrameAt && now - state.lastFrameAt < 33) {
      state.raf = requestAnimationFrame(animationFrame);
      return;
    }
    const elapsed = state.lastFrameAt ? Math.min(.08, Math.max(0, (now - state.lastFrameAt) / 1000)) : 0;
    state.lastFrameAt = now;
    for (const vehicle of state.vehicles) updateVehiclePose(vehicle, elapsed, now);
    updateDots(now);
    try { state.map?.triggerRepaint?.(); } catch (_) {}
    state.raf = requestAnimationFrame(animationFrame);
  }

  function startAnimation() {
    if (!state.enabled) return;
    if (state.modelLod === 'dots') { startDotAnimation(); return; }
    if (state.raf) return;
    if (state.dotTimer) { clearTimeout(state.dotTimer); state.dotTimer = 0; }
    state.lastFrameAt = 0;
    state.raf = requestAnimationFrame(animationFrame);
  }

  function stopDotAnimation() {
    if (state.dotTimer) clearTimeout(state.dotTimer);
    state.dotTimer = 0;
  }

  function stopAnimation() {
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    stopDotAnimation();
    state.lastFrameAt = 0;
  }

  async function rebuildFleet(reason = 'viewport') {
    if (!state.enabled) return false;
    if (state.rebuilding) { state.pendingRebuild = true; return false; }
    state.rebuilding = true;
    try {
      const map = state.map || currentMap();
      if (!map) {
        setStatus('Waiting for the BridgePoint globe to finish starting…');
        return false;
      }
      if (state.map !== map) attachMap(map);
      if (!map.getStyle?.() || !map.getSource?.(ROAD_SOURCE)) {
        setStatus('Transportation is on. Waiting for loaded road-vector tiles…');
        return false;
      }
      if (!ensureLayers(map)) {
        setStatus('Transportation is on. Preparing the lightweight vehicle-dot layer…');
        return false;
      }
      const zoom = Number(map.getZoom()) || 0;
      state.diagnostics.zoom = zoom;
      const center = map.getCenter?.();
      if (!center || !Number.isFinite(center.lng) || !Number.isFinite(center.lat)) {
        setStatus('Transportation is on. Waiting for the globe center…');
        return false;
      }
      const anchor = [center.lng, center.lat];
      const roads = sourceRoadFeatures(map);
      const flat = buildFlatRoadPaths(roads, anchor);
      if (!flat.paths.length) {
        clearVehicleScene();
        state.paths = [];
        state.diagnostics.roads = 0;
        state.diagnostics.vehicles = 0;
        state.diagnostics.dots = 0;
        try { map.getSource(DOT_SOURCE)?.setData(EMPTY); } catch (_) {}
        setStatus('Transportation is on. Waiting for road tiles in this view; the dot layer is ready and will populate as roads load.');
        return false;
      }

      const targetLod = selectModelLod(zoom);
      let chosen = flat;
      let elevation = null;
      if (targetLod !== 'dots') {
        elevation = terrainElevation(map, anchor);
        if (elevation !== null) {
          const modelRows = sampleRoadRows(roads);
          const terrainBuilt = buildRoadPaths(map, anchor, elevation, modelRows);
          if (terrainBuilt.paths.length) chosen = terrainBuilt;
        }
      }
      if (state.modelLod !== 'dots') clearVehicleModels();
      state.anchor = anchor;
      state.anchorElevation = elevation;
      state.paths = chosen.paths;
      state.vehicles = buildFleet(chosen.paths, zoom, MAX_DOT_VEHICLES);
      state.diagnostics.roads = chosen.paths.length;
      state.diagnostics.roadLengthM = Math.round(chosen.totalLength);
      state.diagnostics.skippedTerrain = chosen.skippedTerrain;
      state.diagnostics.vehicles = state.vehicles.length;
      state.lastRebuildAt = Date.now();
      state.lastError = null;
      state.lastDotAt = 0;
      updateDots(performance.now(), true);

      if (targetLod === 'dots' || elevation === null || chosen === flat) {
        if (map.getLayer(MODEL_LAYER)) {
          try { map.removeLayer(MODEL_LAYER); } catch (_) {}
        }
        clearVehicleModels();
        state.modelLod = 'dots';
        startDotAnimation();
        setStatus(
          'SIMULATED · ' + state.vehicles.length.toLocaleString() +
          ' moving vehicles. Global dots are active now; 3D vehicle detail upgrades automatically as you zoom in. Not live GPS.'
        );
        return true;
      }

      const token = ++state.modelBuildToken;
      setStatus(
        'SIMULATED · ' + state.vehicles.length.toLocaleString() +
        ' moving vehicles. Dots are live; preparing ' + (targetLod === 'high' ? 'high-detail' : 'lightweight 3D') +
        ' vehicle models in the background…'
      );
      try {
        const THREE = await loadThree();
        if (!state.enabled || state.map !== map || token !== state.modelBuildToken) return true;
        if (!installModelLayer(map, THREE)) throw new Error('The shared 3D vehicle layer could not be attached.');
        if (!state.enabled || token !== state.modelBuildToken) return true;
        makeVisualFleet(THREE, state.vehicles, targetLod);
        setStatus(
          'SIMULATED · ' + state.vehicles.length.toLocaleString() +
          ' moving vehicles on mapped roads. ' + targetLod.toUpperCase() +
          ' 3D LOD · remaining vehicles stay visible as dots. Not live GPS.'
        );
      } catch (error) {
        console.warn('BridgePoint Transportation 3D upgrade', error);
        clearVehicleModels();
        state.modelLod = 'dots';
        startDotAnimation();
        setStatus('SIMULATED · ' + state.vehicles.length.toLocaleString() +
          ' moving road-vehicle dots remain active. 3D models will retry after the next zoom change. ' +
          safe(error?.message || error, 120), true);
      }
      return true;
    } catch (error) {
      console.warn('BridgePoint Transportation simulation', error);
      setStatus('Transportation could not initialize: ' + safe(error?.message || error, 180), true);
      return false;
    } finally {
      state.rebuilding = false;
      if (state.pendingRebuild && state.enabled) {
        state.pendingRebuild = false;
        scheduleRebuild('queued');
      }
    }
  }

  function scheduleRebuild(reason = 'viewport') {
    if (!state.enabled) return;
    clearTimeout(state.rebuildTimer);
    state.rebuildTimer = setTimeout(() => { void rebuildFleet(reason); }, REBUILD_DEBOUNCE_MS);
  }

  function disable() {
    state.enabled = false;
    clearTimeout(state.rebuildTimer);
    clearTimeout(state.waitTimer);
    state.rebuildTimer = 0;
    state.waitTimer = 0;
    stopAnimation();
    clearVehicleScene();
    try {
      if (state.map?.getLayer(MODEL_LAYER)) state.map.removeLayer(MODEL_LAYER);
    } catch (_) {}
    try { state.map?.getSource(DOT_SOURCE)?.setData(EMPTY); } catch (_) {}
    if (state.options) state.options.hidden = true;
    setButtonState();
    state.diagnostics.vehicles = 0; state.diagnostics.dots = 0;
    setStatus('Transportation is off. The existing globe, roads, orbitals and all other layers remain unchanged.');
  }

  function attachMap(map) {
    if (!map || state.map === map) return;
    state.map = map;
    const onMove = () => scheduleRebuild('camera');
    const onZoom = () => scheduleRebuild('zoom');
    map.on?.('moveend', onMove);
    map.on?.('zoomend', onZoom);
    map.on?.('sourcedata', event => {
      if (event?.sourceId === ROAD_SOURCE && event.isSourceLoaded && state.diagnostics.dots === 0) {
        scheduleRebuild('road tiles');
      }
    });
    map.on?.('style.load', () => {
      if (!state.enabled) return;
      clearVehicleModels();
      state.scene = null; state.renderer = null; state.camera = null; state.customLayer = null;
      if (ensureLayers(map)) scheduleRebuild('style refresh');
    });
    window.__BP_TRANSPORTATION_V1__.mapReady = true;
  }

  function waitForMap() {
    if (!state.enabled || state.waitTimer) return;
    const attempt = () => {
      state.waitTimer = 0;
      if (!state.enabled) return;
      const map = currentMap();
      if (map) {
        attachMap(map);
        void rebuildFleet('map ready');
        return;
      }
      state.waitAttempts++;
      if (state.waitAttempts >= 36) {
        setStatus('Transportation is on, but the BridgePoint map is still unavailable. Press refresh after the globe finishes loading.', true);
        return;
      }
      state.waitTimer = setTimeout(attempt, 250);
    };
    state.waitTimer = setTimeout(attempt, 0);
  }

  function enableSimulation() {
    if (state.enabled) return true;
    state.enabled = true;
    state.waitAttempts = 0;
    if (state.options) state.options.hidden = false;
    addOptions();
    setButtonState();
    setStatus('SIMULATED · Turning on global vehicle dots now. 3D models upgrade automatically as you zoom in…');
    const map = currentMap();
    if (!map) {
      waitForMap();
      return true;
    }
    attachMap(map);
    void rebuildFleet('enable');
    startDotAnimation();
    return true;
  }

  function boot() {
    addUI();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') stopAnimation();
      else if (state.enabled) startAnimation();
    });
  }

  window.__BP_TRANSPORTATION_V1__ = {
    version: VERSION,
    simulationOnly: true,
    source: 'OpenFreeMap / OpenStreetMap road vector geometry',
    enabledByDefault: false,
    mapReady: false,
    enable: enableSimulation,
    disable,
    refresh: () => rebuildFleet('manual'),
    diagnostics: () => ({
      enabled: state.enabled, simulationOnly: true, mapReady: !!state.map,
      roadSegments: state.diagnostics.roads, roadLengthM: state.diagnostics.roadLengthM,
      vehicles: state.diagnostics.vehicles, dots: state.diagnostics.dots,
      modelLod: state.modelLod, skippedTerrainSamples: state.diagnostics.skippedTerrain,
      zoom: state.diagnostics.zoom, categories: { ...state.categories },
      lastRebuildAt: state.lastRebuildAt, lastError: state.lastError
    }),
    helpers: {
      isRoadFeature, vehicleKindForRoad, localPoint, interpolatePath, cleanLine,
      buildFlatRoadPaths, sampleRoadRows, buildFleet, selectModelLod
    }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();