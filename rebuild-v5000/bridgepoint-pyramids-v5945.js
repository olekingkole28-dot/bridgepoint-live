/* BridgePoint georeferenced Giza pyramids v5945.
 * Center positions are from OpenStreetMap-derived feature centroids (OSM way IDs
 * recorded below); the 3D footprint and present-day silhouette use published
 * surveyed dimensions. Geometry is procedural, source-measured dimensions are
 * metadata, and unsupported sub-metre surface detail is not represented as survey.
 * Heavy Three.js code loads only when the view is close to the Giza Plateau.
 */
(() => {
  'use strict';
  if (window.__BP_PYRAMIDS_V5945__) return;

  const VERSION = 5945;
  const THREE_URL = 'https://esm.sh/three@0.169.0';
  const GIZA_BOUNDS = [31.116, 29.960, 31.149, 29.992];
  const RENDER_ZOOM = 13.1;
  const LABEL_ZOOM = 11.2;
  const EMPTY = { type: 'FeatureCollection', features: [] };
  const PYRAMIDS = [
    {
      id: 'khufu', name: 'Great Pyramid of Khufu', short: 'KHUFU',
      coordinates: [31.13421, 29.97917], osmWay: 4420397,
      baseWidthM: 230.33, baseDepthM: 230.33,
      currentHeightM: 138.5, originalHeightM: 146.6,
      slopeDegrees: 51.84, topCasing: false, graniteBaseM: 0,
      coreMaterial: 'local limestone and mortar',
      casingMaterial: 'Tura limestone casing; mostly removed',
      finish: 'weathered limestone courses; truncated present-day summit',
      sourceDimensions: 'published survey dimensions; current height from published reference',
      color: '#c9af81'
    },
    {
      id: 'khafre', name: 'Pyramid of Khafre', short: 'KHAFRE',
      coordinates: [31.13074, 29.97599], osmWay: 4420396,
      baseWidthM: 215.25, baseDepthM: 215.25,
      currentHeightM: 136.4, originalHeightM: 143.5,
      slopeDegrees: 53.13, topCasing: true, graniteBaseM: 1.5,
      coreMaterial: 'local limestone blocks',
      casingMaterial: 'polished Tura limestone casing preserved on the upper portion; pink granite at the bottom course',
      finish: 'weathered limestone courses with surviving upper casing',
      sourceDimensions: 'published survey dimensions; present and original heights published separately',
      color: '#d5bc8e'
    },
    {
      id: 'menkaure', name: 'Pyramid of Menkaure', short: 'MENKAURE',
      coordinates: [31.12826, 29.97251], osmWay: 4420398,
      baseWidthM: 102.2, baseDepthM: 104.6,
      currentHeightM: 61.0, originalHeightM: 65.5,
      slopeDegrees: 51.34, topCasing: false, graniteBaseM: 20.0,
      coreMaterial: 'local limestone core',
      casingMaterial: 'red Aswan granite on lower casing (about 20 m); limestone above',
      finish: 'weathered limestone courses with documented lower granite casing',
      sourceDimensions: 'original base dimensions and present height vary slightly among published references',
      color: '#c8aa7c'
    }
  ];

  let threePromise = null;
  const MAPS = new Set();
  const STATES = new WeakMap();
  const textureRefs = new Set();

  const css = document.createElement('style');
  css.id = 'bp-pyramids-v5945-style';
  css.textContent =
    '.bp-pyramid-popup-v5945{font:12px/1.45 system-ui,sans-serif;color:#16212a;min-width:220px;max-width:290px}' +
    '.bp-pyramid-popup-v5945 b{display:block;font-size:14px;margin-bottom:5px;color:#3e2e1d}' +
    '.bp-pyramid-popup-v5945 dl{display:grid;grid-template-columns:1fr auto;gap:3px 12px;margin:8px 0}' +
    '.bp-pyramid-popup-v5945 dt{color:#59636c}.bp-pyramid-popup-v5945 dd{margin:0;text-align:right;font-weight:700}' +
    '.bp-pyramid-popup-v5945 small{display:block;margin-top:8px;color:#5e666d}';
  document.head.appendChild(css);

  function getMaps() {
    const worlds = [
      window.__BP_LANDING_WORLD__, window.__bpLandingWorldV5420,
      window.__BP_V5000_WORLD, window.__BP_V5000_WORLD__
    ];
    const found = [];
    for (const world of worlds) {
      const map = world && world.map;
      if (map && typeof map.on === 'function' && !found.includes(map)) found.push(map);
    }
    const pending = window.__BP_PENDING_LANDMARK_MAP_V5940__;
    if (pending && typeof pending.on === 'function' && !found.includes(pending)) found.push(pending);
    return found;
  }

  function inBounds(a, b) {
    return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1];
  }

  function viewBounds(map, pad = 0) {
    const b = map.getBounds();
    return [b.getWest() - pad, b.getSouth() - pad, b.getEast() + pad, b.getNorth() + pad];
  }

  function inGizaView(map, minZoom = LABEL_ZOOM) {
    try {
      return Number(map.getZoom()) >= minZoom && inBounds(viewBounds(map, 0.001), GIZA_BOUNDS);
    } catch (_) { return false; }
  }

  function localToLngLat(item, eastM, northM) {
    const latRad = item.coordinates[1] * Math.PI / 180;
    return [
      item.coordinates[0] + eastM / (111320 * Math.max(0.12, Math.cos(latRad))),
      item.coordinates[1] + northM / 110540
    ];
  }

  function footprint(item) {
    const angle = 0; // cardinal alignment; no unsourced alignment offset is invented
    const r = angle * Math.PI / 180, c = Math.cos(r), s = Math.sin(r);
    const x = item.baseWidthM / 2, z = item.baseDepthM / 2;
    const corners = [[-x, -z], [x, -z], [x, z], [-x, z]].map(([east, north]) => {
      const e = east * c + north * s, n = -east * s + north * c;
      return localToLngLat(item, e, n);
    });
    corners.push(corners[0]);
    return {
      type: 'Feature',
      properties: {
        id: item.id, name: item.name, short: item.short,
        current_height_m: item.currentHeightM, original_height_m: item.originalHeightM,
        base_width_m: item.baseWidthM, base_depth_m: item.baseDepthM,
        base_area_m2: Math.round(item.baseWidthM * item.baseDepthM),
        slope_degrees: item.slopeDegrees, core_material: item.coreMaterial,
        casing_material: item.casingMaterial, osm_way: item.osmWay,
        coordinate_source: 'OpenStreetMap building feature centroid',
        source_dimensions: item.sourceDimensions
      },
      geometry: { type: 'Polygon', coordinates: [corners] }
    };
  }

  function setData(map, id, data) {
    try { const s = map.getSource(id); if (s && s.setData) s.setData(data); } catch (_) {}
  }

  function ensureSource(map, id, data) {
    if (!map.getSource(id)) map.addSource(id, { type: 'geojson', data, maxzoom: 16, tolerance: 0 });
  }

  function ensureLayer(map, layer, before) {
    if (map.getLayer(layer.id)) return;
    if (before && map.getLayer(before)) map.addLayer(layer, before);
    else map.addLayer(layer);
  }

  function installStyle(map, state) {
    if (!map || state.installing || !map.getStyle || !map.getStyle()) return;
    state.installing = true;
    try {
      ensureSource(map, 'bp-v5945-pyramid-footprints', EMPTY);
      const fillBefore = map.getLayer('gta-context-buildings') ? 'gta-context-buildings' : undefined;
      ensureLayer(map, {
        id: 'bp-v5945-pyramid-hit', type: 'fill', source: 'bp-v5945-pyramid-footprints',
        minzoom: 10.6,
        paint: { 'fill-color': '#efd4a0', 'fill-opacity': 0.012, 'fill-antialias': true }
      }, fillBefore);
      ensureLayer(map, {
        id: 'bp-v5945-pyramid-outline', type: 'line', source: 'bp-v5945-pyramid-footprints',
        minzoom: 11.2, layout: { 'line-join': 'round' },
        paint: {
          'line-color': '#e4c38b', 'line-opacity': 0.92,
          'line-width': ['interpolate', ['linear'], ['zoom'], 11, 0.8, 14, 1.5, 17, 2.2]
        }
      }, fillBefore);
      ensureLayer(map, {
        id: 'bp-v5945-pyramid-labels', type: 'symbol', source: 'bp-v5945-pyramid-footprints',
        minzoom: 11.2,
        layout: {
          'text-field': ['concat', ['get', 'short'], '\n', ['to-string', ['get', 'current_height_m']], ' m'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 11.2, 9, 14, 12, 17, 13],
          'text-offset': [0, 0], 'text-anchor': 'center',
          'text-allow-overlap': false, 'text-ignore-placement': false
        },
        paint: { 'text-color': '#fff0cd', 'text-halo-color': 'rgba(30,22,12,0.96)', 'text-halo-width': 1.6 }
      }, map.getLayer('gta-road-label-major') ? 'gta-road-label-major' : undefined);

      state.styleReady = true;
      if (!state.listeners) {
        state.listeners = true;
        map.on('moveend', () => schedule(map, state));
        map.on('zoomend', () => schedule(map, state));
        map.on('style.load', () => { state.styleReady = false; schedule(map, state, true); });
        map.on('click', event => {
          if (!inGizaView(map, 10.6)) return;
          let hits = [];
          try { hits = map.queryRenderedFeatures(event.point, { layers: ['bp-v5945-pyramid-hit'] }) || []; } catch (_) {}
          const f = hits[0];
          if (!f) return;
          const item = PYRAMIDS.find(p => p.id === f.properties.id);
          if (item) showDetails(map, item);
        });
        map.on('mousemove', event => {
          let hit = false;
          try { hit = !!(inGizaView(map, 10.6) && map.queryRenderedFeatures(event.point, { layers: ['bp-v5945-pyramid-hit'] }).length); } catch (_) {}
          try { map.getCanvas().style.cursor = hit ? 'pointer' : ''; } catch (_) {}
        });
      }

      setData(map, 'bp-v5945-pyramid-footprints', {
        type: 'FeatureCollection', features: PYRAMIDS.map(footprint)
      });
      schedule(map, state, true);
      publishState('footprints-ready', map);
    } catch (e) {
      state.status = 'install-error';
      state.detail = String(e && e.message || e);
      console.warn('BridgePoint pyramid footprint install', e);
    } finally { state.installing = false; }
  }

  function showDetails(map, item) {
    const M = window.maplibregl || window.mapboxgl;
    if (!M || !M.Popup) return;
    const elevation = terrainAt(map, item);
    const popup = new M.Popup({ closeButton: true, closeOnClick: true, maxWidth: '320px', className: 'bp-pyramid-popup-wrap-v5945' });
    const root = document.createElement('div');
    root.className = 'bp-pyramid-popup-v5945';
    const title = document.createElement('b'); title.textContent = item.name; root.appendChild(title);
    const intro = document.createElement('div'); intro.textContent = 'Procedural 3D monument · surveyed dimensions · georeferenced footprint'; root.appendChild(intro);
    const dl = document.createElement('dl');
    const facts = [
      ['Present height', item.currentHeightM.toFixed(1) + ' m'],
      ['Original height', item.originalHeightM.toFixed(1) + ' m'],
      ['Base footprint', item.baseWidthM.toFixed(2) + ' × ' + item.baseDepthM.toFixed(2) + ' m'],
      ['Base area', Math.round(item.baseWidthM * item.baseDepthM).toLocaleString() + ' m²'],
      ['Slope reference', item.slopeDegrees.toFixed(2) + '°'],
      ['Ground elevation', elevation == null ? 'terrain unavailable' : Math.round(elevation) + ' m above sea level'],
      ['Core', item.coreMaterial],
      ['Casing', item.casingMaterial]
    ];
    for (const [label, value] of facts) {
      const dt = document.createElement('dt'); dt.textContent = label;
      const dd = document.createElement('dd'); dd.textContent = value;
      dl.append(dt, dd);
    }
    root.appendChild(dl);
    const note = document.createElement('small');
    note.textContent = 'Footprint centroid: OSM way ' + item.osmWay + '. The sides are cardinal-aligned in the model. Published dimensions differ slightly between references; values shown here are recorded in the layer metadata. This is a procedural present-day silhouette, not a laser scan or reconstruction of every stone.';
    root.appendChild(note);
    popup.setLngLat(item.coordinates).setDOMContent(root).addTo(map);
  }

  function terrainAt(map, item) {
    try {
      if (map.queryTerrainElevation) {
        const n = map.queryTerrainElevation({ lng: item.coordinates[0], lat: item.coordinates[1] }, { exaggerated: false });
        return Number.isFinite(n) ? n : null;
      }
    } catch (_) {}
    return null;
  }

  function loadThree() {
    if (!threePromise) {
      threePromise = import(THREE_URL).then(module => module.default || module)
        .catch(error => { threePromise = null; throw error; });
    }
    return threePromise;
  }

  function seededRandom(seed) {
    let n = seed >>> 0;
    return () => {
      n = (n * 1664525 + 1013904223) >>> 0;
      return n / 4294967296;
    };
  }

  function stoneTexture(THREE, item, granite = false) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    const rng = seededRandom(item.id.split('').reduce((a, c) => a + c.charCodeAt(0), 0) + (granite ? 711 : 0));
    const base = granite ? [132, 76, 57] : [197, 171, 126];
    ctx.fillStyle = 'rgb(' + base.join(',') + ')'; ctx.fillRect(0, 0, 1024, 1024);
    const cols = granite ? 44 : 66, rows = Math.max(48, Math.round(item.currentHeightM / (granite ? 0.8 : 1.1)));
    const cw = 1024 / cols, ch = 1024 / rows;
    for (let row = 0; row < rows; row++) {
      let x = row % 2 ? -cw * 0.5 : 0;
      let col = 0;
      while (x < 1024) {
        const width = cw * (0.68 + rng() * 0.5);
        const y = row * ch;
        const variation = granite ? 16 : 20;
        const delta = Math.round((rng() - 0.5) * variation);
        const r = Math.max(0, Math.min(255, base[0] + delta));
        const g = Math.max(0, Math.min(255, base[1] + delta));
        const b = Math.max(0, Math.min(255, base[2] + delta));
        ctx.fillStyle = 'rgb(' + r + ',' + g + ',' + b + ')';
        ctx.fillRect(x + 1.6, y + 1.4, width - 2.4, ch - 2.2);
        if (granite) {
          for (let i = 0; i < 16; i++) {
            const px = x + rng() * width, py = y + rng() * ch;
            ctx.fillStyle = rng() > 0.5 ? 'rgba(235,198,166,0.26)' : 'rgba(40,29,24,0.2)';
            ctx.fillRect(px, py, 1.2, 1.2);
          }
        }
        x += width; col++;
        if (col > cols * 3) break;
      }
    }
    ctx.strokeStyle = granite ? 'rgba(50,28,24,0.6)' : 'rgba(95,70,42,0.58)';
    ctx.lineWidth = granite ? 2.5 : 2.0;
    for (let row = 0; row <= rows; row++) {
      const y = row * ch;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1024, y); ctx.stroke();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 2;
    textureRefs.add(texture);
    return texture;
  }

  function sideGeometry(THREE, item, face) {
    const positions = [], uvs = [];
    const h = item.currentHeightM;
    const course = item.id === 'menkaure' ? 0.85 : 1.15;
    const rows = Math.max(2, Math.ceil(h / course));
    const hx0 = item.baseWidthM / 2, hz0 = item.baseDepthM / 2;
    const hx1 = Math.max(2.5, hx0 * (1 - h / item.originalHeightM));
    const hz1 = Math.max(2.5, hz0 * (1 - h / item.originalHeightM));
    const vertex = (u, y) => {
      const t = y / h, hx = hx0 * (1 - t) + hx1 * t, hz = hz0 * (1 - t) + hz1 * t;
      if (face === 'north') return [-hx + 2*hx*u, y, -hz];
      if (face === 'south') return [hx - 2*hx*u, y, hz];
      if (face === 'east') return [hx, y, -hz + 2*hz*u];
      return [-hx, y, hz - 2*hz*u];
    };
    const pushTriangle = (a, b, c, ua, ub, uc) => {
      positions.push(...a, ...b, ...c);
      uvs.push(...ua, ...ub, ...uc);
    };
    const pushQuad = (a, b, c, d, u0, u1, v0, v1) => {
      pushTriangle(a, b, c, [u0,v0], [u1,v0], [u1,v1]);
      pushTriangle(a, c, d, [u0,v0], [u1,v1], [u0,v1]);
    };
    for (let row = 0; row < rows; row++) {
      const y0 = h * row / rows, y1 = h * (row + 1) / rows;
      // Separate material bands where actual casing material is documented.
      const mid = (y0 + y1) * 0.5;
      let materialIndex = 0; // rough local limestone core
      if (item.topCasing && mid >= h * 0.67) materialIndex = 1; // surviving upper Tura limestone casing
      if (item.id === 'menkaure' && mid <= item.graniteBaseM) materialIndex = 2;
      if (item.id === 'khafre' && mid <= item.graniteBaseM) materialIndex = 2;
      const a = vertex(0, y0), b = vertex(1, y0), c = vertex(1, y1), d = vertex(0, y1);
      const start = positions.length / 3;
      pushQuad(a, b, c, d, 0, 1, y0 / h, y1 / h);
      // record a material band as non-overlapping, six-vertex triangles
      sideGeometry._groups.push({ start, count: 6, materialIndex });
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    for (const group of sideGeometry._groups) g.addGroup(group.start, group.count, group.materialIndex);
    g.computeVertexNormals();
    return g;
  }

  function makeSideGeometry(THREE, item, face) {
    sideGeometry._groups = [];
    return sideGeometry(THREE, item, face);
  }

  function makeCapGeometry(THREE, item) {
    const h = item.currentHeightM;
    const factor = Math.max(0.025, 1 - h / item.originalHeightM);
    const w = Math.max(5, item.baseWidthM * factor), d = Math.max(5, item.baseDepthM * factor);
    const p = [
      -w/2,h,-d/2,  w/2,h,-d/2,  w/2,h,d/2,
      -w/2,h,-d/2,  w/2,h,d/2, -w/2,h,d/2
    ];
    const uv = [0,0, 1,0, 1,1, 0,0, 1,1, 0,1];
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p,3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv,2));
    g.computeVertexNormals();
    return g;
  }

  function makeScene(THREE, item) {
    const scene = new THREE.Scene();
    scene.add(new THREE.AmbientLight(0xffffff, 1.18));
    const sun = new THREE.DirectionalLight(0xffffff, 1.55);
    sun.position.set(-80, 140, 70); scene.add(sun);
    const bounce = new THREE.DirectionalLight(0xffdfac, 0.35);
    bounce.position.set(40, 25, -90); scene.add(bounce);

    const coreTex = stoneTexture(THREE, item, false);
    const graniteTex = stoneTexture(THREE, item, true);
    const casingTex = stoneTexture(THREE, item, false);
    const core = new THREE.MeshStandardMaterial({ color: item.color, map: coreTex, roughness: 0.98, metalness: 0, flatShading: true });
    const casing = new THREE.MeshStandardMaterial({ color: '#e6d8b4', map: casingTex, roughness: 0.9, metalness: 0, flatShading: true });
    const granite = new THREE.MeshStandardMaterial({ color: '#b68068', map: graniteTex, roughness: 0.9, metalness: 0.02, flatShading: true });
    const materials = [core, casing, granite];
    for (const face of ['north', 'east', 'south', 'west']) {
      const mesh = new THREE.Mesh(makeSideGeometry(THREE, item, face), materials);
      mesh.frustumCulled = false;
      scene.add(mesh);
    }
    const capMat = item.topCasing ? casing : core;
    const cap = new THREE.Mesh(makeCapGeometry(THREE, item), capMat);
    cap.frustumCulled = false; scene.add(cap);
    return { scene, coreTex, graniteTex, casingTex, materials, h: item.currentHeightM };
  }

  function disposeScenes(layer) {
    try {
      for (const model of layer.models || []) {
        model.scene.traverse(object => {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            const mats = Array.isArray(object.material) ? object.material : [object.material];
            for (const mat of mats) mat.dispose();
          }
        });
        for (const texture of [model.coreTex, model.graniteTex, model.casingTex]) {
          try { texture.dispose(); } catch (_) {}
          textureRefs.delete(texture);
        }
      }
      if (layer.renderer) layer.renderer.dispose();
    } catch (_) {}
  }

  function addPyramidLayer(map, state) {
    if (state.layerRequested || !inGizaView(map, RENDER_ZOOM)) return;
    state.layerRequested = true;
    publishState('loading-three-dimensional-models', map);
    loadThree().then(THREE => {
      if (!state.styleReady || !map.getStyle || !map.getStyle() || !inGizaView(map, RENDER_ZOOM)) {
        state.layerRequested = false;
        return;
      }
      if (map.getLayer('bp-v5945-pyramids-3d')) return;
      const layer = {
        id: 'bp-v5945-pyramids-3d', type: 'custom', renderingMode: '3d',
        onAdd(mapRef, gl) {
          this.map = mapRef; this.THREE = THREE;
          this.camera = new THREE.Camera();
          this.renderer = new THREE.WebGLRenderer({
            canvas: mapRef.getCanvas(), context: gl, antialias: false,
            alpha: true, powerPreference: 'low-power'
          });
          this.renderer.autoClear = false;
          this.models = PYRAMIDS.map(item => Object.assign({ item }, makeScene(THREE, item)));
          state.modelReady = true;
          publishState('three-dimensional-models-ready', mapRef);
          mapRef.triggerRepaint();
        },
        render(gl, args) {
          if (!inGizaView(this.map, LABEL_ZOOM) || !this.models) return;
          try {
            const projection = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
            this.renderer.resetState();
            for (const model of this.models) {
              const elevation = terrainAt(this.map, model.item);
              const transform = this.map.transform.getMatrixForModel(model.item.coordinates, elevation == null ? 0 : elevation);
              this.camera.projectionMatrix = projection.clone().multiply(new THREE.Matrix4().fromArray(transform));
              this.renderer.render(model.scene, this.camera);
              const record = window.__BP_PYRAMIDS_V5945__;
              const meta = record && record.pyramids && record.pyramids[model.item.id];
              if (meta) { meta.rendered = true; meta.renderedAt = Date.now(); }
            }
          } catch (e) {
            state.renderError = String(e && e.message || e);
            publishState('render-error', this.map);
            if (!state.warned) { state.warned = true; console.warn('BridgePoint 3D pyramids render', e); }
          }
        },
        onRemove() {
          disposeScenes(this);
          state.modelReady = false;
        }
      };
      const before = map.getLayer('gta-road-label-major') ? 'gta-road-label-major' : undefined;
      map.addLayer(layer, before);
      state.layerAdded = true;
      publishState('three-dimensional-layer-added', map);
    }).catch(error => {
      state.layerRequested = false;
      state.detail = String(error && error.message || error);
      publishState('three-import-failed', map);
      console.warn('BridgePoint pyramid 3D module', error);
    });
  }

  function publishState(status, map) {
    const pyramids = {};
    for (const p of PYRAMIDS) {
      pyramids[p.id] = {
        id: p.id, name: p.name, coordinates: p.coordinates.slice(),
        osmWay: p.osmWay, baseWidthM: p.baseWidthM, baseDepthM: p.baseDepthM,
        currentHeightM: p.currentHeightM, originalHeightM: p.originalHeightM,
        slopeDegrees: p.slopeDegrees, coreMaterial: p.coreMaterial,
        casingMaterial: p.casingMaterial, presentDaySilhouette: true,
        rendered: false
      };
    }
    const existing = window.__BP_PYRAMIDS_V5945__;
    if (existing && existing.pyramids) {
      for (const key of Object.keys(pyramids)) {
        if (existing.pyramids[key] && existing.pyramids[key].rendered) {
          pyramids[key].rendered = true; pyramids[key].renderedAt = existing.pyramids[key].renderedAt;
        }
      }
    }
    window.__BP_PYRAMIDS_V5945__ = {
      version: VERSION, status, coordinatesCrs: 'EPSG:4326', geometry: 'procedural Three.js 3D pyramid meshes',
      loadedOnDemand: true, gizaBounds: GIZA_BOUNDS, modelReady: !!(STATES.get(map || null)?.modelReady),
      footprintLayer: !!(map && map.getLayer && map.getLayer('bp-v5945-pyramid-hit')),
      layerAdded: !!(map && map.getLayer && map.getLayer('bp-v5945-pyramids-3d')),
      rendered: PYRAMIDS.some(p => pyramids[p.id].rendered), source: 'OpenStreetMap feature centroids + published architectural dimensions',
      pyramids, updatedAt: Date.now()
    };
  }

  function update(map, state) {
    if (!map || !map.getStyle || !map.getStyle()) return;
    if (!state.styleReady || !map.getSource('bp-v5945-pyramid-footprints')) installStyle(map, state);
    if (!state.styleReady) return;
    const local = inGizaView(map, LABEL_ZOOM);
    setData(map, 'bp-v5945-pyramid-footprints', local ? { type: 'FeatureCollection', features: PYRAMIDS.map(footprint) } : EMPTY);
    if (inGizaView(map, RENDER_ZOOM)) addPyramidLayer(map, state);
    if (local) publishState(state.modelReady ? 'three-dimensional-models-visible' : 'giza-footprints-visible', map);
  }

  function schedule(map, state, immediate = false) {
    if (state.timer) clearTimeout(state.timer);
    state.timer = setTimeout(() => {
      state.timer = 0;
      update(map, state);
    }, immediate ? 60 : 180);
  }

  function attachMap(map) {
    if (!map || STATES.has(map)) return;
    MAPS.add(map);
    const state = {
      styleReady: false, installing: false, listeners: false, timer: 0,
      layerRequested: false, layerAdded: false, modelReady: false,
      status: 'waiting-for-map-style', warned: false
    };
    STATES.set(map, state);
    const ready = () => installStyle(map, state);
    map.on('style.load', ready);
    map.on('load', ready);
    if (map.isStyleLoaded && map.isStyleLoaded()) ready();
  }

  const pending = window.__BP_PENDING_LANDMARK_MAP_V5940__;
  if (pending && typeof pending.on === 'function') attachMap(pending);
  window.addEventListener('bp:world-map-ready-v5940', event => {
    const map = event && event.detail && event.detail.map;
    if (map && typeof map.on === 'function') attachMap(map);
  });
  function discover() {
    const maps = getMaps();
    for (const map of maps) attachMap(map);
    if (MAPS.size < 1 && discover.attempts < 80) {
      discover.attempts += 1; setTimeout(discover, 600);
    }
  }
  discover.attempts = 0;
  discover();
  window.addEventListener('load', discover, { once: true });
  window.__BP_PYRAMIDS_V5945__ = {
    version: VERSION, status: 'booting', loadedOnDemand: true, geometry: 'procedural Three.js 3D pyramid meshes',
    coordinatesCrs: 'EPSG:4326', source: 'OpenStreetMap feature centroids + published architectural dimensions',
    pyramids: {}, attachedMaps: 0, updatedAt: Date.now()
  };
})();