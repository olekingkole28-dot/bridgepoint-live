/* BridgePoint NYC exact-source LiDAR neighborhood materializer, v7002.
 * Uses actual NYC OTI / NYC OpenData 2017 LAS returns with NYS orthophoto texture.
 * Nine adjacent source tiles share the EPSG:2263 grid; each tile retains a local anchor.
 * Nadir photo is applied only to the measured top/ground surface; vertical planes are LiDAR-derived.
 */
(() => {
  'use strict';
  if (window.__BP_NYC_LIDAR_V7002_BOOTED__) return;
  window.__BP_NYC_LIDAR_V7002_BOOTED__ = true;

  const VERSION = 7002;
  const CENTER_TILE_ID = '987210';
  const CENTER_MANIFEST_URL = '/assets/nyc-lidar/manifest.json';
  const TILE_INDEX_URL = '/assets/nyc-lidar/tiles-index.json';
  const LAYER_ID = 'bp-nyc-exact-lidar-v7000';
  const SOURCE_URL = 'https://data.cityofnewyork.us/City-Government/Topobathymetric-LiDAR-Data-2017-/7sc8-jtbz';
  const DATASET_DOC = 'https://github.com/CityOfNewYork/nyc-geo-metadata/blob/main/Metadata/Metadata_TopobathymetricClassifiedPointCloud.md';
  const FT_TO_M = 0.3048006096012192;
  const MAP_REFS = [
    () => window.__BP_LANDING_WORLD__,
    () => window.__bpLandingWorldV5420,
    () => window.__BP_V5000_WORLD,
    () => window.__BP_V5000_WORLD__
  ];
  const MAPS = new WeakMap();
  const JSON_CACHE = new Map();
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

  function loadJson(url) {
    if (!JSON_CACHE.has(url)) {
      const promise = fetch(url, { cache: 'no-store' }).then(r => {
        if (!r.ok) throw new Error('NYC_LIDAR_JSON_HTTP_' + r.status + ' ' + url);
        return r.json();
      }).catch(error => {
        JSON_CACHE.delete(url);
        throw error;
      });
      JSON_CACHE.set(url, promise);
    }
    return JSON_CACHE.get(url);
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

  function intersects(map, manifest) {
    try {
      const b = map.getBounds(), a = manifest.boundsWgs84;
      return b.getEast() >= a.west && b.getWest() <= a.east &&
        b.getNorth() >= a.south && b.getSouth() <= a.north;
    } catch (_) { return false; }
  }

  function wantedLod(map, manifest) {
    if (!intersects(map, manifest)) return -1;
    const z = Number(map.getZoom());
    if (!Number.isFinite(z) || z < 14.0) return -1;
    if (z < 16.0) return 0;
    if (z < 17.2) return 1;
    return 2;
  }

  async function decodeGzipAsset(url) {
    const response = await fetch(url, { cache: 'force-cache' });
    if (!response.ok) throw new Error('NYC_LIDAR_ASSET_HTTP_' + response.status + ' ' + url);
    let bytes = await response.arrayBuffer();
    const magic = new Uint8Array(bytes, 0, Math.min(2, bytes.byteLength));
    if (magic.length === 2 && magic[0] === 0x1f && magic[1] === 0x8b) {
      if (typeof DecompressionStream !== 'function') throw new Error('GZIP_DECOMPRESSION_UNAVAILABLE');
      bytes = await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
    }
    return bytes;
  }

  function assetUrl(tile, filename) {
    return tile.assetBase + String(filename || '').replace(/^\/+/, '');
  }

  function setOffset(object, tile) {
    if (!object || !tile) return;
    object.position.set(tile.offset.x, tile.offset.y, tile.offset.z);
  }

  function createPointObject(THREE, raw, meta) {
    const count = Number(meta.pointCount);
    const expectedBytes = count * 9;
    if (!Number.isInteger(count) || count < 1 || raw.byteLength !== expectedBytes) {
      throw new Error('NYC_LIDAR_BINARY_SIZE_MISMATCH expected=' + expectedBytes + ' actual=' + raw.byteLength);
    }
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
      size: 0.82, sizeAttenuation: true, vertexColors: true, transparent: false,
      opacity: 1, depthTest: true, depthWrite: true, blending: THREE.NormalBlending
    });
    const points = new THREE.Points(geometry, material);
    points.name = 'NYC measured LiDAR returns · ' + meta.name + ' · LOD ' + meta.level;
    points.frustumCulled = false;
    points.renderOrder = 20;
    return points;
  }

  async function ensureLod(map, state, tile, level) {
    if (tile.meshes.has(level)) return tile.meshes.get(level);
    if (tile.loads.has(level)) return tile.loads.get(level);
    const task = (async () => {
      const meta = tile.manifest.lods[level];
      const url = assetUrl(tile, meta.file);
      publish('loading-measured-lidar-tile', {
        tileId: tile.tileId, requestedLod: level, requestedPointCount: meta.pointCount,
        currentZoom: map.getZoom(), loadedTileCount: state.tiles.size
      });
      const [THREE, raw] = await Promise.all([loadThree(), decodeGzipAsset(url)]);
      const points = createPointObject(THREE, raw, meta);
      setOffset(points, tile);
      tile.meshes.set(level, points);
      state.scene?.add(points);
      points.visible = false;
      publish('measured-lidar-tier-ready', {
        tileId: tile.tileId, readyLod: level, readyPointCount: meta.pointCount,
        assetBytes: raw.byteLength, sourceTileSha256: tile.manifest.source?.tileSha256 || null
      });
      return points;
    })().finally(() => tile.loads.delete(level));
    tile.loads.set(level, task);
    return task;
  }

  async function ensureSurfaceMesh(state, tile) {
    if (tile.surfaceGroup) return tile.surfaceGroup;
    if (tile.surfacePromise) return tile.surfacePromise;
    const meta = tile.manifest.surfaceMesh;
    const chunks = Array.isArray(meta?.chunks) && meta.chunks.length ? meta.chunks : (meta?.file ? [meta] : []);
    if (!chunks.length || !meta?.wallFile || !meta?.textureFile) {
      throw new Error('NYC_LIDAR_ROOF_CHUNKS_WALL_OR_TEXTURE_MISSING ' + tile.tileId);
    }
    tile.surfacePromise = (async () => {
      const [THREE, rawChunks, wallRaw] = await Promise.all([
        loadThree(),
        Promise.all(chunks.map(c => decodeGzipAsset(assetUrl(tile, c.file)))),
        decodeGzipAsset(assetUrl(tile, meta.wallFile))
      ]);
      const texture = await new Promise((resolve, reject) => {
        new THREE.TextureLoader().load(assetUrl(tile, meta.textureFile), resolve, undefined, reject);
      });
      const scale = Number(meta.positionScaleMeters || 0.02);
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.flipY = true;
      texture.anisotropy = Math.min(4, state.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
      texture.needsUpdate = true;
      const root = new THREE.Group();
      root.name = 'NYC measured LiDAR tile ' + tile.tileId + ' · registered roof/ground photo mesh + vertical walls';
      setOffset(root, tile);
      const roofGroup = new THREE.Group();
      roofGroup.name = 'Measured 2m roof and street-surface chunks · tile ' + tile.tileId;
      const roofMaterial = new THREE.MeshBasicMaterial({
        map: texture, side: THREE.FrontSide, depthTest: true, depthWrite: true,
        transparent: false, toneMapped: false
      });
      let roofVerticesTotal = 0, roofTrianglesTotal = 0;
      for (let n = 0; n < chunks.length; n++) {
        const part = chunks[n], raw = rawChunks[n];
        const vertices = Number(part.vertexCount), indexCount = Number(part.indexCount);
        const expected = vertices * 10 + indexCount * 4;
        if (!Number.isInteger(vertices) || !Number.isInteger(indexCount) || raw.byteLength !== expected) {
          throw new Error('NYC_LIDAR_ROOF_CHUNK_SIZE_MISMATCH tile=' + tile.tileId + ' part=' + n + ' expected=' + expected + ' actual=' + raw.byteLength);
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
        mesh.name = 'NYC LiDAR aerial roof/ground row chunk ' + n + ' · tile ' + tile.tileId;
        mesh.frustumCulled = false;
        mesh.renderOrder = 10;
        roofGroup.add(mesh);
        roofVerticesTotal += vertices;
        roofTrianglesTotal += Number(part.triangleCount || indexCount / 3);
      }

      const wallVertices = Number(meta.wallVertexCount), wallIndexCount = Number(meta.wallIndexCount);
      const wallExpected = wallVertices * 9 + wallIndexCount * 4;
      if (!Number.isInteger(wallVertices) || !Number.isInteger(wallIndexCount) || wallVertices < 4 || wallRaw.byteLength !== wallExpected) {
        throw new Error('NYC_LIDAR_WALL_BINARY_SIZE_MISMATCH tile=' + tile.tileId + ' expected=' + wallExpected + ' actual=' + wallRaw.byteLength);
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
      const wallMaterial = new THREE.MeshBasicMaterial({
        vertexColors: true, side: THREE.DoubleSide, depthTest: true, depthWrite: true,
        transparent: false, toneMapped: false
      });
      const walls = new THREE.Mesh(wallGeometry, wallMaterial);
      walls.name = 'NYC LiDAR-derived vertical walls · tile ' + tile.tileId + ' · no fake facade photo';
      walls.frustumCulled = false;
      walls.renderOrder = 11;
      roofGroup.visible = false;
      walls.visible = false;
      root.add(roofGroup);
      root.add(walls);
      root.visible = false;
      state.scene?.add(root);
      tile.surfaceTexture = texture;
      tile.surfaceMaterial = roofMaterial;
      tile.surfaceGroup = root;
      tile.roofGroup = roofGroup;
      tile.wallMesh = walls;
      publish('orthophoto-roof-ground-and-lidar-walls-ready', {
        tileId: tile.tileId, surfaceVertices: roofVerticesTotal, surfaceTriangles: roofTrianglesTotal,
        surfaceChunkCount: chunks.length, verticalWallQuads: Number(meta.wallQuadCount),
        verticalWallTriangles: Number(meta.wallTriangleCount), gridSpacingMetres: Number(meta.gridSpacingMetres),
        roofTextureSource: tile.manifest.imagery?.sourceProduct || 'NYS Latest Orthoimagery',
        roofTextureFile: meta.textureFile, facadePhotoCoverage: false
      });
      return root;
    })().catch(error => {
      tile.surfacePromise = null;
      throw error;
    });
    return tile.surfacePromise;
  }

  function restoreSurfaceFilters(map, state) {
    for (const [id, previous] of state.savedFilters) {
      if (!map.getLayer(id)) continue;
      try {
        map.setLayoutProperty(id, 'visibility', previous.visibility || 'visible');
      } catch (error) {
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
        try { map.setLayerZoomRange(id, 24, 25); }
        catch (fallbackError) {
          state.filterErrors.push({id, error: String(fallbackError && fallbackError.message || error)});
        }
      }
    }
    state.maskActive = state.savedFilters.size > 0;
  }

  function fullyCoveredByActiveTiles(map, state) {
    const catalog = state.tileCatalogRecords?.length ? state.tileCatalogRecords : [...state.tiles.values()].map(t => ({tileId:t.tileId,boundsWgs84:t.manifest.boundsWgs84}));
    const intersecting = catalog.filter(record => intersects(map, record));
    if (!intersecting.length) return false;
    const loaded = intersecting.map(record => state.tiles.get(String(record.tileId)));
    if (loaded.some(t => !t || t.activeLevel !== 2 || !t.surfaceGroup?.visible)) return false;
    try {
      const bounds = map.getBounds();
      const extent = intersecting.reduce((a, record) => {
        const b = record.boundsWgs84;
        return {west:Math.min(a.west,b.west),south:Math.min(a.south,b.south),east:Math.max(a.east,b.east),north:Math.max(a.north,b.north)};
      }, {west:Infinity,south:Infinity,east:-Infinity,north:-Infinity});
      // A small safety inset stops whole-layer suppression when even a sliver of the viewport
      // falls beyond measured LiDAR coverage; those areas keep the original map buildings.
      const insetLon = 0.000015, insetLat = 0.000015;
      return bounds.getWest() >= extent.west + insetLon &&
        bounds.getEast() <= extent.east - insetLon &&
        bounds.getSouth() >= extent.south + insetLat &&
        bounds.getNorth() <= extent.north - insetLat;
    } catch (_) { return false; }
  }

  function updateStatus(map, state, status) {
    const center = state.tiles.get(CENTER_TILE_ID);
    const level = center?.activeLevel ?? -1;
    const lodMeta = level >= 0 ? center.manifest.lods[level] : null;
    const activeTiles = [...state.tiles.values()].filter(t => t.activeLevel >= 0);
    const surfaceTiles = [...state.tiles.values()].filter(t => t.activeLevel === 2 && t.surfaceGroup?.visible);
    publish(status, {
      attachedMaps: attachedCount, layerInstalled: !!map.getLayer(LAYER_ID),
      tileId: CENTER_TILE_ID,
      tileAnchor: center ? [center.manifest.anchor.longitude, center.manifest.anchor.latitude] : null,
      zoom: Number(map.getZoom()), requestedLod: center?.wantedLevel ?? -1,
      activeLod: level, activeLodName: lodMeta?.name || null,
      visiblePoints: level >= 0 ? lodMeta.pointCount : 0,
      sourcePointCount: center?.manifest.sourcePoints || 17523220,
      actualMeasuredPointsOnly: true, visible: activeTiles.length > 0,
      photorealisticSurfaceMesh: surfaceTiles.length > 0,
      surfaceMeshVisible: !!center?.surfaceGroup?.visible,
      verticalWallMeshVisible: !!center?.wallMesh?.visible,
      verticalWallQuads: surfaceTiles.reduce((n,t)=>n+Number(t.manifest.surfaceMesh?.wallQuadCount||0),0),
      facadePhotoCoverage: false,
      duplicateBuildingPolicy: 'existing building/roof layers are hidden only while loaded LiDAR surfaces cover the full viewport',
      hiddenLegacyLayerIds: [...state.savedFilters.keys()].slice(0,60),
      suppressedLegacyLayerCount: state.savedFilters.size,
      legacySuppressionErrors: state.filterErrors.slice(0,12),
      surfaceMeshGridSpacingMetres: center?.manifest.surfaceMesh?.gridSpacingMetres || null,
      aerialTextureSource: center?.manifest.imagery?.sourceProduct || 'NYS Latest Orthoimagery',
      tileCount: state.tiles.size,
      activeTileIds: activeTiles.map(t=>t.tileId),
      surfaceTileIds: surfaceTiles.map(t=>t.tileId),
      failedTileIds: [...state.tiles.values()].filter(t=>t.lastError).map(t=>({tileId:t.tileId,error:t.lastError})),
      lastError: state.lastError
    });
  }

  async function reconcileVisibleTiles(map, state) {
    if (!state.baseManifest || !state.scene || state.installing) return;
    const zoom = Number(map.getZoom());
    for (const tile of state.tiles.values()) {
      const level = wantedLod(map, tile.manifest);
      tile.wantedLevel = level;
      if (level < 0) {
        for (const mesh of tile.meshes.values()) mesh.visible = false;
        if (tile.surfaceGroup) tile.surfaceGroup.visible = false;
        tile.activeLevel = -1;
        continue;
      }
      try {
        await ensureLod(map, state, tile, level);
        if (level === 2) await ensureSurfaceMesh(state, tile);
        // Camera can move during a download. Apply the latest choice, not the stale one.
        const latest = wantedLod(map, tile.manifest);
        if (latest !== level) {
          state.reconcilePending = true;
          continue;
        }
        for (const [tier, mesh] of tile.meshes) mesh.visible = tier === level;
        if (tile.surfaceGroup) {
          tile.surfaceGroup.visible = level === 2;
          if (tile.roofGroup) tile.roofGroup.visible = level === 2;
          if (tile.wallMesh) tile.wallMesh.visible = level === 2;
        }
        tile.activeLevel = level;
        tile.lastError = null;
      } catch (error) {
        tile.lastError = String(error && error.message || error);
        state.lastError = tile.tileId + ': ' + tile.lastError;
        const fallback = tile.meshes.has(level) ? level : (level > 0 && tile.meshes.has(level - 1) ? level - 1 : -1);
        for (const [tier, mesh] of tile.meshes) mesh.visible = tier === fallback;
        if (tile.surfaceGroup) tile.surfaceGroup.visible = false;
        if (tile.roofGroup) tile.roofGroup.visible = false;
        if (tile.wallMesh) tile.wallMesh.visible = false;
        tile.activeLevel = fallback;
      }
    }
    suppressLegacySurfaces(map, state, fullyCoveredByActiveTiles(map, state));
    map.triggerRepaint();
    updateStatus(map, state, 'rendering-source-lidar-neighborhood');
    if (zoom >= 17.2 && [...state.tiles.values()].some(t=>t.activeLevel===2 && t.surfaceGroup?.visible)) {
      publish('rendering-source-lidar-neighborhood', {
        ...window.__BP_NYC_LIDAR_V7000__,
        fullViewportSurfaceCoverage: fullyCoveredByActiveTiles(map, state)
      });
    }
  }

  function reconcile(map, state) {
    if (!state.baseManifest || !state.scene || state.installing) return;
    if (state.reconciling) {
      state.reconcilePending = true;
      return;
    }
    state.reconciling = true;
    (async () => {
      try {
        do {
          state.reconcilePending = false;
          await reconcileVisibleTiles(map, state);
        } while (state.reconcilePending);
      } finally {
        state.reconciling = false;
        if (state.reconcilePending) reconcile(map, state);
      }
    })();
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
          canvas: mapRef.getCanvas(), context: gl, antialias: false, alpha: true,
          powerPreference: 'low-power'
        });
        state.renderer.autoClear = false;
        state.renderer.setPixelRatio(1);
        state.renderer.outputColorSpace = THREE.SRGBColorSpace;
        for (const tile of state.tiles.values()) {
          for (const mesh of tile.meshes.values()) {
            state.scene.add(mesh);
            mesh.visible = false;
          }
          if (tile.surfaceGroup) {
            setOffset(tile.surfaceGroup, tile);
            state.scene.add(tile.surfaceGroup);
            tile.surfaceGroup.visible = false;
          }
        }
        state.scene.updateMatrixWorld(true);
        state.layerAdded = true;
        state.installing = false;
        reconcile(mapRef, state);
      },
      render(gl, args) {
        if (!state.scene || !state.renderer || !state.camera) return;
        const a = state.baseAnchor;
        try {
          const model = new THREE.Matrix4().fromArray(
            state.map.transform.getMatrixForModel([a.longitude, a.latitude], a.verticalOriginFeet * FT_TO_M)
          );
          const projection = new THREE.Matrix4().fromArray(args.defaultProjectionData.mainMatrix);
          state.camera.projectionMatrix.copy(projection).multiply(model);
          state.camera.position.set(0,0,0);
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
          publish('render-error', {error:state.lastError,tileId:CENTER_TILE_ID});
        }
      },
      onRemove() {
        suppressLegacySurfaces(state.map, state, false);
        try { state.renderer?.dispose?.(); } catch (_) {}
        state.renderer = null;
        state.scene = null;
        state.camera = null;
        state.gl = null;
        state.layerAdded = false;
        for (const tile of state.tiles.values()) {
          for (const mesh of tile.meshes.values()) mesh.visible = false;
          if (tile.surfaceGroup) tile.surfaceGroup.visible = false;
        }
      }
    };
  }

  function offsetFor(anchor, baseAnchor) {
    return {
      x:(Number(anchor.projectedXFeet)-Number(baseAnchor.projectedXFeet))*FT_TO_M,
      y:(Number(anchor.verticalOriginFeet)-Number(baseAnchor.verticalOriginFeet))*FT_TO_M,
      z:(Number(anchor.projectedYFeet)-Number(baseAnchor.projectedYFeet))*FT_TO_M
    };
  }

  function addTileState(state, record, manifest) {
    if (!manifest?.anchor || !manifest?.boundsWgs84 || !Array.isArray(manifest.lods) || manifest.lods.length !== 3) {
      throw new Error('NYC_LIDAR_TILE_MANIFEST_INVALID ' + record.tileId);
    }
    const tile = {
      tileId:String(record.tileId || manifest.tileId),
      manifest,
      assetBase:String(record.assetBase || '/assets/nyc-lidar/'),
      offset:offsetFor(manifest.anchor, state.baseAnchor),
      meshes:new Map(), loads:new Map(), surfaceGroup:null, surfacePromise:null,
      surfaceTexture:null, surfaceMaterial:null, roofGroup:null, wallMesh:null,
      activeLevel:-1, wantedLevel:-1, lastError:null
    };
    state.tiles.set(tile.tileId, tile);
    return tile;
  }

  async function loadTileCatalog(state, centerManifest) {
    state.baseManifest = centerManifest;
    state.baseAnchor = centerManifest.anchor;
    state.tiles.clear();
    addTileState(state, {
      tileId:CENTER_TILE_ID, assetBase:'/assets/nyc-lidar/', manifest:'manifest.json'
    }, centerManifest);
    try {
      const index = await loadJson(TILE_INDEX_URL);
      if (index.version !== VERSION || !Array.isArray(index.tiles)) {
        throw new Error('NYC_LIDAR_TILE_INDEX_INVALID');
      }
      state.tileCatalogRecords = index.tiles;
      const others = index.tiles.filter(r => String(r.tileId) !== CENTER_TILE_ID);
      const results = await Promise.allSettled(others.map(async record => {
        const url = record.manifest.startsWith('/')
          ? record.manifest
          : '/assets/nyc-lidar/' + record.manifest;
        const manifest = await loadJson(url);
        addTileState(state, record, manifest);
      }));
      for (let i=0; i<results.length; i++) {
        if (results[i].status === 'rejected') {
          state.catalogErrors.push({tileId:others[i].tileId,error:String(results[i].reason)});
        }
      }
      publish('nyc-lidar-neighborhood-index-loaded', {
        tileCount:state.tiles.size, expectedTileCount:index.tiles.length,
        catalogErrors:state.catalogErrors.slice(0,12),
        availableTileIds:[...state.tiles.keys()]
      });
    } catch (error) {
      state.tileCatalogRecords = [...state.tiles.values()].map(t => ({tileId:t.tileId,boundsWgs84:t.manifest.boundsWgs84}));
      state.catalogErrors.push({tileId:'catalog',error:String(error && error.message || error)});
      publish('center-lidar-only-catalog-fallback', {
        tileCount:state.tiles.size, catalogErrors:state.catalogErrors.slice(0,12)
      });
    }
  }

  function attach(map) {
    if (!map || MAPS.has(map)) return;
    const state = {
      map, baseManifest:null, baseAnchor:null, tiles:new Map(), catalogErrors:[],
      scene:null, camera:null, renderer:null, gl:null,
      installing:false, layerAdded:false, savedFilters:new Map(), maskActive:false,
      filterErrors:[], lastError:null, reconciling:false, reconcilePending:false,
      eventsBound:false, autoFocused:false
    };
    MAPS.set(map, state);
    attachedCount++;
    publish('attaching-map', {attachedMaps:attachedCount});
    loadJson(CENTER_MANIFEST_URL).then(async manifest => {
      if (!Array.isArray(manifest.lods) || manifest.lods.length !== 3) throw new Error('NYC_LIDAR_CENTER_MANIFEST_INVALID');
      await loadTileCatalog(state, manifest);
      const THREE = await loadThree();
      const install = () => {
        if (state.installing || !map.getStyle || !map.getStyle()) return;
        state.installing = true;
        try {
          if (!map.getLayer(LAYER_ID)) map.addLayer(customLayer(map,state,THREE));
          state.layerAdded = !!map.getLayer(LAYER_ID);
          state.installing = false;
          bindEvents(map,state);
          reconcile(map,state);
        } catch (error) {
          state.installing = false;
          state.lastError = String(error && error.message || error);
          publish('layer-install-error', {error:state.lastError,attachedMaps:attachedCount});
        }
      };
      map.on('style.load', () => {
        state.savedFilters.clear();
        state.maskActive = false;
        install();
      });
      map.on('load', install);
      if (map.isStyleLoaded && map.isStyleLoaded()) install();
      else publish('waiting-for-map-style', {
        tileId:CENTER_TILE_ID, boundsWgs84:manifest.boundsWgs84,
        tileCount:state.tiles.size, availableTileIds:[...state.tiles.keys()]
      });
    }).catch(error => {
      publish('manifest-load-error', {error:String(error && error.message || error),attachedMaps:attachedCount});
    });
  }

  function bindEvents(map,state) {
    if (state.eventsBound) return;
    state.eventsBound = true;
    const update = () => reconcile(map,state);
    map.on('moveend',update);
    map.on('zoomend',update);
    map.on('style.load',() => {
      state.savedFilters.clear();
      state.maskActive = false;
      update();
    });
    map.on('bp:world-map-ready-v5940',update);
    const params = new URLSearchParams(window.location.search);
    if (!state.autoFocused && ['nyc','new-york','newyork'].includes(String(params.get('lidar')||'').toLowerCase())) {
      state.autoFocused = true;
      const a = state.baseManifest.anchor;
      map.stop();
      map.flyTo({
        center:[a.longitude,a.latitude],zoom:17.8,pitch:58,bearing:0,
        duration:1800,essential:true
      });
    }
  }

  function discover() {
    for (const map of discoverMaps()) attach(map);
    if (discover.tries < 120) {
      discover.tries++;
      setTimeout(discover,500);
    }
  }
  discover.tries = 0;
  window.addEventListener('bp:world-map-ready-v5940',event => {
    const map = event?.detail?.map;
    if (map && typeof map.on === 'function') attach(map);
  });
  window.addEventListener('load',discover,{once:true});
  publish('booting');
  discover();
})();