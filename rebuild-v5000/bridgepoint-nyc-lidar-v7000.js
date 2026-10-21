/* BridgePoint NYC exact-source LiDAR point materialization, v7000.
 * Source points: NYC OTI / NYC OpenData 2017 classified LAZ tile 987210.laz.
 * Three display tiers are decimated directly from the source tile; no procedural buildings.
 * Source CRS: EPSG:2263 (US survey feet) + NAVD88 Geoid 12B (US survey feet).
 */
(() => {
  'use strict';
  if (window.__BP_NYC_LIDAR_V7001_BOOTED__) return;
  window.__BP_NYC_LIDAR_V7001_BOOTED__ = true;

  const VERSION = 7001;
  const MANIFEST_URL = '/assets/nyc-lidar/manifest.json';
  const LAYER_ID = 'bp-nyc-exact-lidar-v7000';
  const SOURCE_URL = 'https://data.cityofnewyork.us/City-Government/Topobathymetric-LiDAR-Data-2017-/7sc8-jtbz';
  const DATASET_DOC = 'https://github.com/CityOfNewYork/nyc-geo-metadata/blob/main/Metadata/Metadata_TopobathymetricClassifiedPointCloud.md';
  const MAP_REFS = [
    () => window.__BP_LANDING_WORLD__,
    () => window.__bpLandingWorldV5420,
    () => window.__BP_V5000_WORLD,
    () => window.__BP_V5000_WORLD__
  ];
  const MAPS = new WeakMap();
  let manifestPromise = null;
  let threePromise = null;
  let attachedCount = 0;

  const BUILDING_LAYER_RE = /(?:building|roof|floor.line|facade|structure|reality|night.window|landmark3d)/i;

  function publish(status, extra = {}) {
    window.__BP_NYC_LIDAR_V7000__ = Object.assign({
      version: VERSION,
      status,
      provider: 'NYC Office of Technology and Innovation / NYC OpenData',
      dataset: 'Topobathymetric LiDAR Data (2017)',
      datasetUrl: SOURCE_URL,
      sourceDocumentation: DATASET_DOC,
      archiveMember: 'TopoBathymetric_Classified_LAZ/987210.laz',
      sourcePoints: 17523220,
      displayedSampleIsDecimated: true,
      syntheticBuildingGeometryUsed: false,
      sourceCrs: 'EPSG:2263 + NAVD88 Geoid 12B; US survey feet',
      attachedMaps: attachedCount,
      updatedAt: Date.now()
    }, extra);
  }

  function loadManifest() {
    if (!manifestPromise) {
      manifestPromise = fetch(MANIFEST_URL, { cache: 'force-cache' }).then(r => {
        if (!r.ok) throw new Error('NYC_LIDAR_MANIFEST_HTTP_' + r.status);
        return r.json();
      }).then(data => {
        if (data.version !== VERSION || !Array.isArray(data.lods) || data.lods.length !== 3) {
          throw new Error('NYC_LIDAR_MANIFEST_INVALID');
        }
        return data;
      }).catch(error => {
        manifestPromise = null;
        publish('manifest-error', { error: String(error && error.message || error) });
        throw error;
      });
    }
    return manifestPromise;
  }

  function loadThree() {
    if (!threePromise) {
      threePromise = import('/vendor/three.module.js').catch(error => {
        threePromise = null;
        throw new Error('THREE_MODULE_LOAD_FAILED ' + String(error && error.message || error));
      });
    }
    return threePromise;
  }

  function discoverMaps() {
    const result = [];
    for (const get of MAP_REFS) {
      try {
        const m = get();
        const map = m && m.map;
        if (map && typeof map.on === 'function' && !result.includes(map)) result.push(map);
      } catch (_) {}
    }
    const pending = window.__BP_PENDING_LANDMARK_MAP_V5940__;
    if (pending && typeof pending.on === 'function' && !result.includes(pending)) result.push(pending);
    return result;
  }

  function viewportIntersects(map, manifest) {
    try {
      const b = map.getBounds(), a = manifest.boundsWgs84;
      return b.getEast() >= a.west && b.getWest() <= a.east &&
        b.getNorth() >= a.south && b.getSouth() <= a.north;
    } catch (_) { return false; }
  }

  function wantedLod(map, manifest) {
    if (!viewportIntersects(map, manifest)) return -1;
    const z = Number(map.getZoom());
    if (!Number.isFinite(z) || z < 14.0) return -1;
    if (z < 16.0) return 0;
    if (z < 17.2) return 1;
    return 2;
  }

  async function decodeGzipAsset(url) {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error('NYC_LIDAR_TILE_HTTP_' + response.status + ' ' + url);
    let bytes = await response.arrayBuffer();
    // Some static hosts auto-decompress .gz responses; inspect the magic bytes before decoding.
    const magic = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
    if (magic.length === 2 && magic[0] === 0x1f && magic[1] === 0x8b) {
      if (typeof DecompressionStream !== 'function') throw new Error('GZIP_DECOMPRESSION_UNAVAILABLE');
      bytes = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }
    return bytes;
  }

  function createPointObject(THREE, raw, meta) {
    const count = Number(meta.pointCount);
    const expectedBytes = count * 9;
    if (!Number.isInteger(count) || count < 1 || raw.byteLength !== expectedBytes) {
      throw new Error('NYC_LIDAR_BINARY_SIZE_MISMATCH expected=' + expectedBytes + ' actual=' + raw.byteLength);
    }
    // Compact int16 positions preserve centimetre-scale measured structure with much smaller transfer assets.
    const quantizedPositions = new Int16Array(raw, 0, count * 3);
    const positions = new Float32Array(count * 3);
    const positionScale = Number(meta.positionScaleMeters || 0.02);
    for (let i = 0; i < positions.length; i++) positions[i] = quantizedPositions[i] * positionScale;
    const colors = new Uint8Array(raw, count * 6, count * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
    geometry.computeBoundingSphere();
    const material = new THREE.PointsMaterial({
      size: 0.82,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: false,
      opacity: 1,
      depthTest: true,
      depthWrite: true,
      blending: THREE.NormalBlending
    });
    const points = new THREE.Points(geometry, material);
    points.name = 'NYC measured LiDAR returns · LOD ' + meta.level;
    points.frustumCulled = false;
    points.renderOrder = 20;
    return points;
  }

  async function ensureLod(map, state, level) {
    if (state.meshes.has(level)) return state.meshes.get(level);
    if (state.loads.has(level)) return state.loads.get(level);
    const p = (async () => {
      const manifest = state.manifest;
      const meta = manifest.lods[level];
      const url = '/assets/nyc-lidar/' + meta.file;
      publish('materializing-display-tier', {
        requestedLod: level, requestedPointCount: meta.pointCount,
        currentZoom: map.getZoom(), tileId: manifest.tileId
      });
      const [THREE, raw] = await Promise.all([loadThree(), decodeGzipAsset(url)]);
      const mesh = createPointObject(THREE, raw, meta);
      state.meshes.set(level, mesh);
      state.scene?.add(mesh);
      mesh.visible = false;
      publish('display-tier-ready', {
        readyLod: level, readyPointCount: meta.pointCount, assetBytes: raw.byteLength,
        tileId: manifest.tileId, sourceTileSha256: manifest.source.tileSha256
      });
      return mesh;
    })().finally(() => state.loads.delete(level));
    state.loads.set(level, p);
    return p;
  }

  async function ensureSurfaceMesh(map, state) {
    if (state.surfaceMesh && state.wallMesh) return state.surfaceMesh;
    if (state.surfacePromise) return state.surfacePromise;
    const meta = state.manifest.surfaceMesh;
    const chunks = Array.isArray(meta?.chunks) && meta.chunks.length ? meta.chunks : (meta?.file ? [meta] : []);
    if (!chunks.length || !meta?.wallFile) throw new Error('NYC_LIDAR_ROOF_CHUNKS_OR_WALL_ASSET_MISSING');
    state.surfacePromise = (async () => {
      const [THREE, rawChunks, wallRaw] = await Promise.all([
        loadThree(),
        Promise.all(chunks.map(c => decodeGzipAsset('/assets/nyc-lidar/' + c.file))),
        decodeGzipAsset('/assets/nyc-lidar/' + meta.wallFile)
      ]);
      const texture = await new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load('/assets/nyc-lidar/' + meta.textureFile, resolve, undefined, reject);
      });
      const scale = Number(meta.positionScaleMeters || 0.02);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = true;
      texture.anisotropy = Math.min(4, state.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
      texture.needsUpdate = true;
      // Each roof/ground row chunk is independent but shares one real aerial texture and one
      // material. Cell-local vertices keep sharp roof edges; independent gzip chunks deploy safely.
      const roofGroup = new THREE.Group();
      roofGroup.name = 'NYC measured LiDAR roof/ground photomesh chunks';
      let roofVerticesTotal = 0, roofTrianglesTotal = 0;
      const roofMaterial = new THREE.MeshBasicMaterial({
        map: texture, side: THREE.FrontSide, depthTest: true, depthWrite: true,
        transparent: false, toneMapped: false
      });
      for (let n = 0; n < chunks.length; n++) {
        const part = chunks[n];
        const raw = rawChunks[n];
        const vertices = Number(part.vertexCount);
        const indexCount = Number(part.indexCount);
        const expected = vertices * 10 + indexCount * 4;
        if (!Number.isInteger(vertices) || !Number.isInteger(indexCount) || raw.byteLength !== expected) {
          roofMaterial.dispose?.();
          texture.dispose?.();
          throw new Error('NYC_LIDAR_ROOF_CHUNK_SIZE_MISMATCH part=' + n + ' expected=' + expected + ' actual=' + raw.byteLength);
        }
        const q = new Int16Array(raw, 0, vertices * 3);
        const positions = new Float32Array(vertices * 3);
        for (let i = 0; i < positions.length; i++) positions[i] = q[i] * scale;
        const uv = new Uint16Array(raw, vertices * 6, vertices * 2);
        const indices = new Uint32Array(raw.slice(vertices * 10, vertices * 10 + indexCount * 4));
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2, true));
        geometry.setIndex(new THREE.BufferAttribute(indices, 1));
        geometry.computeVertexNormals();
        const mesh = new THREE.Mesh(geometry, roofMaterial);
        mesh.name = 'NYC LiDAR aerial roof/ground surface row chunk ' + n;
        mesh.frustumCulled = false;
        mesh.renderOrder = 10;
        roofGroup.add(mesh);
        roofVerticesTotal += vertices;
        roofTrianglesTotal += Number(part.triangleCount || indexCount / 3);
      }
      roofGroup.visible = false;

      const wallVertices = Number(meta.wallVertexCount);
      const wallIndexCount = Number(meta.wallIndexCount);
      const wallExpected = wallVertices * 9 + wallIndexCount * 4;
      if (!Number.isInteger(wallVertices) || !Number.isInteger(wallIndexCount) || wallVertices < 4 || wallRaw.byteLength !== wallExpected) {
        roofGroup.traverse(o => { try { o.geometry?.dispose?.(); } catch (_) {} });
        roofMaterial.dispose?.();
        texture.dispose?.();
        throw new Error('NYC_LIDAR_WALL_BINARY_SIZE_MISMATCH expected=' + wallExpected + ' actual=' + wallRaw.byteLength);
      }
      const wq = new Int16Array(wallRaw, 0, wallVertices * 3);
      const wallPositions = new Float32Array(wallVertices * 3);
      for (let i = 0; i < wallPositions.length; i++) wallPositions[i] = wq[i] * scale;
      const wallColors = new Uint8Array(wallRaw, wallVertices * 6, wallVertices * 3);
      const wallIndices = new Uint32Array(wallRaw.slice(wallVertices * 9, wallVertices * 9 + wallIndexCount * 4));
      const wallGeometry = new THREE.BufferGeometry();
      wallGeometry.setAttribute('position', new THREE.BufferAttribute(wallPositions, 3));
      wallGeometry.setAttribute('color', new THREE.BufferAttribute(wallColors, 3, true));
      wallGeometry.setIndex(new THREE.BufferAttribute(wallIndices, 1));
      wallGeometry.computeVertexNormals();
      // The aerial ortho is nadir-only. Facades use separate LiDAR-derived vertical planes,
      // shaded from neutral colors rather than stretching rooftop imagery down the sides.
      const wallMaterial = new THREE.MeshBasicMaterial({
        vertexColors: true, side: THREE.DoubleSide, depthTest: true, depthWrite: true,
        transparent: false, toneMapped: false
      });
      const walls = new THREE.Mesh(wallGeometry, wallMaterial);
      walls.name = 'NYC LiDAR-derived vertical building walls · neutral shaded, no false facade photo';
      walls.frustumCulled = false;
      walls.renderOrder = 11;
      walls.visible = false;
      state.scene?.add(roofGroup);
      state.scene?.add(walls);
      state.surfaceTexture = texture;
      state.surfaceMaterial = roofMaterial;
      state.surfaceMesh = roofGroup;
      state.wallMesh = walls;
      publish('roof-drape-and-vertical-walls-ready', {
        tileId: state.manifest.tileId,
        surfaceVertices: roofVerticesTotal,
        surfaceTriangles: roofTrianglesTotal,
        surfaceChunkCount: chunks.length,
        verticalWallQuads: Number(meta.wallQuadCount),
        verticalWallTriangles: Number(meta.wallTriangleCount),
        gridSpacingMetres: Number(meta.gridSpacingMetres),
        roofTextureSource: 'NYS Latest Orthoimagery 2022–2025',
        roofTextureFile: meta.textureFile,
        facadePhotoCoverage: false,
        facadeGeometrySource: 'Measured LiDAR height discontinuities'
      });
      return roofGroup;
    })().catch(error => {
      state.surfacePromise = null;
      throw error;
    });
    return state.surfacePromise;
  }

  function restoreSurfaceFilters(map, state) {
    for (const [id, previous] of state.savedFilters) {
      if (!map.getLayer(id)) continue;
      try {
        map.setLayoutProperty(id, 'visibility', previous.visibility || 'visible');
      } catch (_) {
        try { map.setLayerZoomRange(id, previous.minzoom ?? 0, previous.maxzoom ?? 24); } catch (_) {}
      }
      if (previous.hasFilter) {
        try { map.setFilter(id, previous.filter ?? null); } catch (_) {}
      }
    }
    state.savedFilters.clear();
    state.maskActive = false;
  }

  function suppressLegacySurfaces(map, state, active) {
    if (!active) {
      if (state.maskActive || state.savedFilters.size) restoreSurfaceFilters(map, state);
      return;
    }
    // The LiDAR/photomesh is the single source of visible structure geometry in this close view.
    // Hide, rather than spatially filtering, all legacy building/roof layers: vector-tile clipping
    // can make spatial within-tile filters keep misaligned footprints that must be replaced.
    const layers = map.getStyle()?.layers || [];
    for (const layer of layers) {
      const id = String(layer.id || '');
      if (!BUILDING_LAYER_RE.test(id) || id === LAYER_ID || layer.type === 'background') continue;
      if (state.savedFilters.has(id)) continue;
      const minzoom = Number.isFinite(layer.minzoom) ? layer.minzoom : 0;
      const maxzoom = Number.isFinite(layer.maxzoom) ? layer.maxzoom : 24;
      let filter = null, hasFilter = false, visibility = 'visible';
      try { filter = map.getFilter(id); hasFilter = true; } catch (_) {}
      try { visibility = map.getLayoutProperty(id, 'visibility') || 'visible'; } catch (_) {}
      state.savedFilters.set(id, { visibility, filter, hasFilter, minzoom, maxzoom, type: layer.type });
      try {
        map.setLayoutProperty(id, 'visibility', 'none');
      } catch (error) {
        // Fallback for custom render layers that do not expose layout visibility in this style.
        try { map.setLayerZoomRange(id, 24, 25); }
        catch (fallbackError) {
          state.filterErrors.push({
            id,
            error: String(fallbackError && fallbackError.message || error)
          });
        }
      }
    }
    state.maskActive = state.savedFilters.size > 0;
  }

  function updateStatus(map, state, status) {
    const level = state.activeLevel;
    const lodMeta = level >= 0 ? state.manifest.lods[level] : null;
    publish(status, {
      attachedMaps: attachedCount,
      layerInstalled: !!map.getLayer(LAYER_ID),
      tileId: state.manifest.tileId,
      tileAnchor: [state.manifest.anchor.longitude, state.manifest.anchor.latitude],
      zoom: Number(map.getZoom()),
      requestedLod: state.wantedLevel,
      activeLod: level,
      activeLodName: lodMeta?.name || null,
      visiblePoints: level >= 0 ? lodMeta.pointCount : 0,
      suppressedLegacyLayerCount: state.savedFilters.size,
      legacySuppressionErrors: state.filterErrors.slice(0, 12),
      sourcePointCount: state.manifest.sourcePoints,
      actualMeasuredPointsOnly: true,
      visible: level >= 0,
      photorealisticSurfaceMesh: !!state.surfaceMesh,
      surfaceMeshVisible: !!state.surfaceMesh && state.surfaceMesh.visible,
      verticalWallMeshVisible: !!state.wallMesh && state.wallMesh.visible,
      verticalWallQuads: state.manifest.surfaceMesh?.wallQuadCount || 0,
      facadePhotoCoverage: false,
      duplicateBuildingPolicy: 'legacy building and roof layers hidden while detailed NYC LiDAR tier is active',
      hiddenLegacyLayerIds: [...state.savedFilters.keys()].slice(0, 60),
      surfaceMeshGridSpacingMetres: state.manifest.surfaceMesh?.gridSpacingMetres || null,
      aerialTextureSource: state.manifest.imagery?.sourceProduct || null
    });
  }

  async function reconcile(map, state) {
    if (!state.manifest || !state.scene || state.installing) return;
    const level = wantedLod(map, state.manifest);
    state.wantedLevel = level;
    if (level < 0) {
      for (const mesh of state.meshes.values()) mesh.visible = false;
      if (state.surfaceMesh) state.surfaceMesh.visible = false;
      if (state.wallMesh) state.wallMesh.visible = false;
      state.activeLevel = -1;
      suppressLegacySurfaces(map, state, false);
      updateStatus(map, state, 'waiting-for-nyc-tile-viewport');
      return;
    }
    try {
      await ensureLod(map, state, level);
      if (level === 2 && state.manifest.surfaceMesh) await ensureSurfaceMesh(map, state);
      // View may have moved while the tile was being decoded; always respect the latest camera tier.
      if (state.wantedLevel !== level) return reconcile(map, state);
      for (const [tier, mesh] of state.meshes) mesh.visible = tier === level;
      if (state.surfaceMesh) state.surfaceMesh.visible = level === 2;
      if (state.wallMesh) state.wallMesh.visible = level === 2;
      state.activeLevel = level;
      suppressLegacySurfaces(map, state, level === 2 && Number(map.getZoom()) >= 17.2);
      map.triggerRepaint();
      updateStatus(map, state, 'rendering-source-lidar-points');
    } catch (error) {
      state.lastError = String(error && error.message || error);
      const fallback = level > 0 && state.meshes.has(level - 1) ? level - 1 : -1;
      if (fallback >= 0) {
        for (const [tier, mesh] of state.meshes) mesh.visible = tier === fallback;
        if (state.surfaceMesh) state.surfaceMesh.visible = fallback === 2;
        if (state.wallMesh) state.wallMesh.visible = fallback === 2;
        state.activeLevel = fallback;
        suppressLegacySurfaces(map, state, false);
        updateStatus(map, state, 'rendering-fallback-lod');
      } else {
        for (const mesh of state.meshes.values()) mesh.visible = false;
        if (state.surfaceMesh) state.surfaceMesh.visible = false;
        if (state.wallMesh) state.wallMesh.visible = false;
        state.activeLevel = -1;
        suppressLegacySurfaces(map, state, false);
        publish('tile-load-error', {
          error: state.lastError, requestedLod: level, tileId: state.manifest.tileId,
          sourceUrl: SOURCE_URL, sourceTileSha256: state.manifest.source.tileSha256
        });
      }
    }
  }

  function customLayer(map, state, THREE) {
    return {
      id: LAYER_ID,
      type: 'custom',
      renderingMode: '3d',
      onAdd(mapRef, gl) {
        state.map = mapRef;
        state.gl = gl;
        state.scene = new THREE.Scene();
        state.camera = new THREE.PerspectiveCamera(45, 1, 0.01, 1e12);
        state.renderer = new THREE.WebGLRenderer({
          canvas: mapRef.getCanvas(),
          context: gl,
          antialias: false,
          alpha: true,
          powerPreference: 'low-power'
        });
        state.renderer.autoClear = false;
        state.renderer.setPixelRatio(1);
        state.renderer.outputColorSpace = THREE.SRGBColorSpace;
        for (const [tier, mesh] of state.meshes) {
          state.scene.add(mesh);
          mesh.visible = false;
        }
        state.scene.updateMatrixWorld(true);
        state.layerAdded = true;
        state.installing = false;
        reconcile(mapRef, state);
      },
      render(gl, args) {
        if (!state.scene || !state.renderer || !state.camera || state.activeLevel < 0) return;
        const a = state.manifest.anchor;
        try {
          const model = new THREE.Matrix4().fromArray(
            state.map.transform.getMatrixForModel([a.longitude, a.latitude], a.verticalOriginFeet * 0.3048006096012192)
          );
          const projection = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
          state.camera.projectionMatrix.copy(projection).multiply(model);
          state.camera.position.set(0, 0, 0);
          state.camera.matrixWorld.identity();
          state.camera.matrixWorldInverse.identity();
          state.camera.near = 0.01;
          state.camera.far = 1e12;
          state.scene.updateMatrixWorld(true);
          state.renderer.resetState();
          state.renderer.render(state.scene, state.camera);
          state.renderer.resetState();
        } catch (error) {
          state.lastError = String(error && error.message || error);
          publish('render-error', { error: state.lastError, tileId: state.manifest.tileId, activeLod: state.activeLevel });
        }
      },
      onRemove() {
        suppressLegacySurfaces(state.map, state, false);
        try { state.renderer?.dispose?.(); } catch (_) {}
        try { state.surfaceMesh?.traverse?.(object => object.geometry?.dispose?.()); } catch (_) {}
        try { state.surfaceMaterial?.dispose?.(); } catch (_) {}
        try { state.surfaceTexture?.dispose?.(); } catch (_) {}
        try { state.wallMesh?.geometry?.dispose?.(); state.wallMesh?.material?.dispose?.(); } catch (_) {}
        state.surfaceMesh = null;
        state.surfaceMaterial = null;
        state.wallMesh = null;
        state.surfaceTexture = null;
        state.surfacePromise = null;
        state.renderer = null;
        state.scene = null;
        state.camera = null;
        state.gl = null;
        state.layerAdded = false;
        for (const mesh of state.meshes.values()) mesh.visible = false;
      }
    };
  }

  function attach(map) {
    if (!map || MAPS.has(map)) return;
    const state = {
      map, manifest: null, scene: null, camera: null, renderer: null, gl: null,
      installing: false, layerAdded: false, activeLevel: -1, wantedLevel: -1,
      meshes: new Map(), loads: new Map(), surfaceMesh: null, surfaceMaterial: null, wallMesh: null, surfaceTexture: null, surfacePromise: null, savedFilters: new Map(), maskActive: false,
      filterErrors: [], lastError: null, tilePolygon: null, moveTimer: null, autoFocused: false
    };
    MAPS.set(map, state);
    attachedCount++;
    publish('attaching-map', { attachedMaps: attachedCount });
    loadManifest().then(async manifest => {
      state.manifest = manifest;
      state.tilePolygon = { type: 'Polygon', coordinates: [manifest.boundsWgs84.polygon] };
      const THREE = await loadThree();
      const install = async () => {
        if (state.installing || !map.getStyle || !map.getStyle()) return;
        state.installing = true;
        try {
          if (!map.getLayer(LAYER_ID)) map.addLayer(customLayer(map, state, THREE));
          state.layerAdded = !!map.getLayer(LAYER_ID);
          state.installing = false;
          bindEvents(map, state);
          await reconcile(map, state);
        } catch (error) {
          state.installing = false;
          state.lastError = String(error && error.message || error);
          publish('layer-install-error', { error: state.lastError, attachedMaps: attachedCount });
        }
      };
      map.on('style.load', () => {
        state.savedFilters.clear();
        state.maskActive = false;
        install();
      });
      map.on('load', install);
      if (map.isStyleLoaded && map.isStyleLoaded()) install();
      else publish('waiting-for-map-style', { tileId: manifest.tileId, boundsWgs84: manifest.boundsWgs84 });
    }).catch(error => {
      publish('manifest-load-error', { error: String(error && error.message || error), attachedMaps: attachedCount });
    });
  }

  function bindEvents(map, state) {
    if (state.eventsBound) return;
    state.eventsBound = true;
    const update = () => reconcile(map, state);
    map.on('moveend', update);
    map.on('zoomend', update);
    map.on('idle', update);
    map.on('style.load', () => {
      state.savedFilters.clear();
      state.maskActive = false;
      update();
    });
    map.on('bp:world-map-ready-v5940', update);
    const params = new URLSearchParams(window.location.search);
    if (!state.autoFocused && ['nyc', 'new-york', 'newyork'].includes(String(params.get('lidar') || '').toLowerCase())) {
      state.autoFocused = true;
      const m = state.manifest;
      map.stop();
      map.flyTo({
        center: [m.anchor.longitude, m.anchor.latitude],
        zoom: 17.8,
        pitch: 58,
        bearing: 0,
        duration: 1800,
        essential: true
      });
    }
  }

  function discover() {
    for (const map of discoverMaps()) attach(map);
    if (discover.tries < 120) {
      discover.tries++;
      setTimeout(discover, 500);
    }
  }
  discover.tries = 0;
  window.addEventListener('bp:world-map-ready-v5940', event => {
    const map = event?.detail?.map;
    if (map && typeof map.on === 'function') attach(map);
  });
  window.addEventListener('load', discover, { once: true });
  publish('booting');
  discover();
})();