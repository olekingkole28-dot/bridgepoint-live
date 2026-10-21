/* BridgePoint NYC exact-source LiDAR neighborhood materializer, v7002.
 * Uses actual NYC OTI / NYC OpenData 2017 LAS returns with NYS orthophoto texture.
 * Nine adjacent source tiles share the EPSG:2263 grid; each tile retains a local anchor.
 * Nadir photo is applied only to the measured top/ground surface; vertical planes are LiDAR-derived.
 */
(() => {
  'use strict';
  if (window.__BP_NYC_LIDAR_V7003_BOOTED__) return;
  window.__BP_NYC_LIDAR_V7003_BOOTED__ = true;

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
  const OVERLAY_STORAGE_KEY = 'bp-nyc-lidar-overlay-v7006';
  const JSON_CACHE = new Map();
  let threePromise = null;
  let attachedCount = 0;

  const BUILDING_LAYER_RE = /(?:building|roof|floor.line|facade|structure|reality|night.window|landmark3d)/i;
  // EPSG:2263 grid north at the center tile is 0.010581607° east of true north.
  // MapLibre's getMatrixForModel expects local +Z toward the south; the LAS grid is +Y north.
  // Flip northing into the MapLibre model frame, then rotate grid north back toward true north.
  const GRID_TO_TRUE_NORTH_RADIANS = -0.00018468388351200875;

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

  // The photo surface has its own adaptive LOD so it exists before the closest zoom.
  // Vertices are sampled from the measured 2 m mesh; the imagery always comes from the
  // registered NYS orthophoto. High zooms refine the same surface instead of replacing it
  // with an unrelated building model.
  const SURFACE_TIERS = [
    { minZoom: 12.0, stride: 16, textureSize: 512,  name: 'CITY_PREVIEW' },
    { minZoom: 14.0, stride: 8,  textureSize: 1024, name: 'BLOCK_PREVIEW' },
    { minZoom: 15.7, stride: 4,  textureSize: 1024, name: 'STREET_DETAIL' },
    { minZoom: 17.2, stride: 1,  textureSize: 2048, name: 'FULL_2M_DETAIL' }
  ];

  function wantedSurfaceLod(map, manifest) {
    if (!intersects(map, manifest)) return -1;
    const z = Number(map.getZoom());
    if (!Number.isFinite(z) || z < SURFACE_TIERS[0].minZoom) return -1;
    let level = 0;
    for (let i = 1; i < SURFACE_TIERS.length; i++) {
      if (z >= SURFACE_TIERS[i].minZoom) level = i;
    }
    return level;
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
    for (let i = 0; i < positions.length; i++) {
      const axis = i % 3;
      positions[i] = quantizedPositions[i] * positionScale * (axis === 2 ? -1 : 1);
    }
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

  function disposeRoofGroup(root, group) {
    if (!group) return;
    try { root?.remove(group); } catch (_) {}
    try {
      group.traverse?.(node => {
        try { node.geometry?.dispose?.(); } catch (_) {}
      });
    } catch (_) {}
  }

  function createSurfaceChunkGeometry(THREE, raw, part, scale, stride) {
    const vertices = Number(part.vertexCount);
    const indexCount = Number(part.indexCount);
    const expected = vertices * 10 + indexCount * 4;
    if (!Number.isInteger(vertices) || !Number.isInteger(indexCount) ||
        vertices < 4 || indexCount < 6 || raw.byteLength !== expected) {
      throw new Error('NYC_LIDAR_ROOF_CHUNK_SIZE_MISMATCH expected=' + expected + ' actual=' + raw.byteLength);
    }
    const sourcePositions = new Int16Array(raw, 0, vertices * 3);
    const sourceUvs = new Uint16Array(raw, vertices * 6, vertices * 2);
    let positions, uvs, indices;

    if (stride <= 1) {
      positions = new Float32Array(vertices * 3);
      for (let i = 0; i < positions.length; i++) {
        const axis = i % 3;
        positions[i] = sourcePositions[i] * scale * (axis === 2 ? -1 : 1);
      }
      uvs = sourceUvs.slice();
      const indicesOffset = vertices * 10;
      indices = new Uint32Array(raw.slice(indicesOffset, indicesOffset + indexCount * 4));
      // The local north axis was flipped to match MapLibre (+Z south), so every triangle
      // must reverse winding; otherwise FrontSide roof triangles are back-face culled.
      for (let i = 0; i < indices.length; i += 3) {
        const swap = indices[i + 1];
        indices[i + 1] = indices[i + 2];
        indices[i + 2] = swap;
      }
    } else {
      const gridWidth = Number(part.gridWidth);
      const gridRows = Number(part.gridRows);
      if (!Number.isInteger(gridWidth) || !Number.isInteger(gridRows) ||
          gridWidth < 1 || gridRows < 1 || gridWidth * gridRows * 4 !== vertices) {
        throw new Error('NYC_LIDAR_SURFACE_GRID_SHAPE_INVALID');
      }
      const coarseRows = Math.ceil(gridRows / stride);
      const coarseCols = Math.ceil(gridWidth / stride);
      const coarseCells = coarseRows * coarseCols;
      positions = new Float32Array(coarseCells * 12);
      uvs = new Uint16Array(coarseCells * 8);
      indices = new Uint32Array(coarseCells * 6);

      function copyCorner(sourceVertex, targetVertex) {
        const src3 = sourceVertex * 3, dst3 = targetVertex * 3;
        positions[dst3] = sourcePositions[src3] * scale;
        positions[dst3 + 1] = sourcePositions[src3 + 1] * scale;
        positions[dst3 + 2] = -sourcePositions[src3 + 2] * scale;
        const src2 = sourceVertex * 2, dst2 = targetVertex * 2;
        uvs[dst2] = sourceUvs[src2];
        uvs[dst2 + 1] = sourceUvs[src2 + 1];
      }

      let cellIndex = 0;
      for (let row = 0; row < gridRows; row += stride) {
        const rowEnd = Math.min(gridRows, row + stride) - 1;
        for (let col = 0; col < gridWidth; col += stride) {
          const colEnd = Math.min(gridWidth, col + stride) - 1;
          // Pull the outer corners from the real measured 2 m cells. This expands each
          // selected quad to the full coarse footprint while preserving correctly registered UVs.
          const sw = (row * gridWidth + col) * 4;
          const se = (row * gridWidth + colEnd) * 4 + 1;
          const nw = (rowEnd * gridWidth + col) * 4 + 2;
          const ne = (rowEnd * gridWidth + colEnd) * 4 + 3;
          const base = cellIndex * 4;
          copyCorner(sw, base);
          copyCorner(se, base + 1);
          copyCorner(nw, base + 2);
          copyCorner(ne, base + 3);
          const p = cellIndex * 6;
          // Winding is reversed because northing is represented as negative local Z.
          indices[p] = base;
          indices[p + 1] = base + 1;
          indices[p + 2] = base + 2;
          indices[p + 3] = base + 1;
          indices[p + 4] = base + 3;
          indices[p + 5] = base + 2;
          cellIndex++;
        }
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2, true));
    geometry.setIndex(new THREE.BufferAttribute(indices, 1));
    // MeshBasicMaterial is used for orthophoto roofs/ground, so vertex normals are
    // unnecessary. Skipping the full normals pass removes a large CPU stall on phones.
    return geometry;
  }

  async function loadScaledOrthophotoTexture(state, tile, THREE, requestedSize) {
    if (tile.surfaceTexture && Number(tile.surfaceTextureSize || 0) >= requestedSize) {
      return tile.surfaceTexture;
    }
    if (tile.surfaceTexturePromise) {
      await tile.surfaceTexturePromise;
      if (tile.surfaceTexture && Number(tile.surfaceTextureSize || 0) >= requestedSize) {
        return tile.surfaceTexture;
      }
    }

    const loadSize = Math.min(
      requestedSize,
      Number(state.renderer?.capabilities?.maxTextureSize || 4096),
      2048
    );
    const task = (async () => {
      const url = assetUrl(tile, tile.manifest.surfaceMesh.textureFile);
      const response = await fetch(url, { cache: 'force-cache' });
      if (!response.ok) throw new Error('NYC_LIDAR_TEXTURE_HTTP_' + response.status + ' ' + url);
      const blob = await response.blob();
      let source = null;
      let objectUrl = null;
      try {
        if (typeof createImageBitmap === 'function') {
          source = await createImageBitmap(blob);
        } else {
          objectUrl = URL.createObjectURL(blob);
          source = await new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('NYC_LIDAR_TEXTURE_DECODE_FAILED ' + tile.tileId));
            img.src = objectUrl;
          });
        }
        const canvas = document.createElement('canvas');
        canvas.width = loadSize;
        canvas.height = loadSize;
        const context = canvas.getContext('2d', { alpha: false, desynchronized: true });
        if (!context) throw new Error('NYC_LIDAR_TEXTURE_CANVAS_UNAVAILABLE');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(source, 0, 0, loadSize, loadSize);
        if (source && typeof source.close === 'function') source.close();
        source = null;
        const texture = new THREE.CanvasTexture(canvas);
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = true;
        texture.anisotropy = Math.min(2, state.renderer?.capabilities?.getMaxAnisotropy?.() || 1);
        texture.needsUpdate = true;
        const old = tile.surfaceTexture;
        tile.surfaceTexture = texture;
        tile.surfaceTextureSize = loadSize;
        if (tile.surfaceMaterial) {
          tile.surfaceMaterial.map = texture;
          tile.surfaceMaterial.needsUpdate = true;
        }
        if (old && old !== texture) {
          try { old.dispose(); } catch (_) {}
        }
        return texture;
      } finally {
        if (source && typeof source.close === 'function') {
          try { source.close(); } catch (_) {}
        }
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch (_) {}
        }
      }
    })();
    tile.surfaceTexturePromise = task;
    try {
      return await task;
    } finally {
      if (tile.surfaceTexturePromise === task) tile.surfaceTexturePromise = null;
    }
  }

  async function ensureWallMesh(state, tile, THREE) {
    if (tile.wallMesh || tile.wallPromise) return tile.wallPromise || tile.wallMesh;
    const meta = tile.manifest.surfaceMesh;
    tile.wallPromise = (async () => {
      const raw = await decodeGzipAsset(assetUrl(tile, meta.wallFile));
      const scale = Number(meta.positionScaleMeters || 0.02);
      const vertexCount = Number(meta.wallVertexCount);
      const indexCount = Number(meta.wallIndexCount);
      const expected = vertexCount * 9 + indexCount * 4;
      if (!Number.isInteger(vertexCount) || !Number.isInteger(indexCount) ||
          vertexCount < 4 || indexCount < 6 || raw.byteLength !== expected) {
        throw new Error('NYC_LIDAR_WALL_BINARY_SIZE_MISMATCH tile=' + tile.tileId + ' expected=' + expected + ' actual=' + raw.byteLength);
      }
      const q = new Int16Array(raw, 0, vertexCount * 3);
      const positions = new Float32Array(vertexCount * 3);
      for (let i = 0; i < positions.length; i++) {
        const axis = i % 3;
        positions[i] = q[i] * scale * (axis === 2 ? -1 : 1);
      }
      const colors = new Uint8Array(raw, vertexCount * 6, vertexCount * 3).slice();
      const indices = new Uint32Array(raw.slice(vertexCount * 9, vertexCount * 9 + indexCount * 4));
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3, true));
      geometry.setIndex(new THREE.BufferAttribute(indices, 1));
      // The neutral wall material is unlit too; no normal calculation required.
      const material = new THREE.MeshBasicMaterial({
        vertexColors: true, side: THREE.DoubleSide, depthTest: true, depthWrite: true,
        transparent: false, toneMapped: false
      });
      const walls = new THREE.Mesh(geometry, material);
      walls.name = 'NYC LiDAR-derived vertical walls · tile ' + tile.tileId + ' · no fake facade photo';
      walls.frustumCulled = false;
      walls.renderOrder = 11;
      walls.visible = !!(state.overlayEnabled && tile.surfaceGroup?.visible);
      tile.wallMesh = walls;
      tile.surfaceGroup?.add(walls);
      try { state.map?.triggerRepaint?.(); } catch (_) {}
      return walls;
    })().catch(error => {
      tile.wallPromise = null;
      throw error;
    });
    return tile.wallPromise;
  }

  function orderedSurfaceChunks(map, tile, chunks) {
    const bounds = tile.manifest.boundsWgs84;
    const centerLat = Number(map?.getCenter?.().lat);
    if (!Number.isFinite(centerLat) || !(bounds.north > bounds.south)) {
      return chunks.slice().sort((a, b) => Number(a.rowStart || 0) - Number(b.rowStart || 0));
    }
    const fraction = Math.max(0, Math.min(1, (centerLat - bounds.south) / (bounds.north - bounds.south)));
    const height = Number(tile.manifest.surfaceMesh.gridHeight || 1);
    return chunks.slice().sort((a, b) => {
      const af = (Number(a.rowStart || 0) + Number(a.gridRows || 0) / 2) / height;
      const bf = (Number(b.rowStart || 0) + Number(b.gridRows || 0) / 2) / height;
      return Math.abs(af - fraction) - Math.abs(bf - fraction);
    });
  }

  async function ensureSurfaceMesh(state, map, tile, level) {
    if (tile.surfaceReady && tile.surfaceLevel === level) return tile.surfaceGroup;
    const meta = tile.manifest.surfaceMesh;
    const chunks = Array.isArray(meta?.chunks) && meta.chunks.length ? meta.chunks : (meta?.file ? [meta] : []);
    if (!chunks.length || !meta?.wallFile || !meta?.textureFile) {
      throw new Error('NYC_LIDAR_ROOF_CHUNKS_WALL_OR_TEXTURE_MISSING ' + tile.tileId);
    }
    const tier = SURFACE_TIERS[level];
    const THREE = await loadThree();
    await loadScaledOrthophotoTexture(state, tile, THREE, tier.textureSize);

    if (!tile.surfaceGroup) {
      const root = new THREE.Group();
      root.name = 'NYC measured LiDAR tile ' + tile.tileId + ' · registered photo mesh + vertical walls';
      setOffset(root, tile);
      const material = new THREE.MeshBasicMaterial({
        map: tile.surfaceTexture, side: THREE.FrontSide, depthTest: true, depthWrite: true,
        transparent: false, toneMapped: false
      });
      tile.surfaceMaterial = material;
      tile.surfaceGroup = root;
      state.scene?.add(root);
    } else if (tile.surfaceMaterial && tile.surfaceMaterial.map !== tile.surfaceTexture) {
      tile.surfaceMaterial.map = tile.surfaceTexture;
      tile.surfaceMaterial.needsUpdate = true;
    }

    const root = tile.surfaceGroup;
    root.visible = !!state.overlayEnabled;
    ensureWallMesh(state, tile, THREE).catch(error => {
      tile.wallError = String(error && error.message || error);
      publish('surface-wall-load-error', { tileId: tile.tileId, error: tile.wallError });
    });

    const scale = Number(meta.positionScaleMeters || 0.02);
    const nextRoofGroup = new THREE.Group();
    nextRoofGroup.name = 'Registered ' + tier.name + ' photogrammetry/orthophoto surface · tile ' + tile.tileId;
    nextRoofGroup.visible = false;
    root.add(nextRoofGroup);
    let firstChunkAdded = false;
    const orderedChunks = orderedSurfaceChunks(map, tile, chunks);

    try {
      for (const part of orderedChunks) {
        // Camera moves and tier changes must not leave a stale mesh job competing with the
        // requested one. The next render pass will enqueue the latest tier.
        if (!state.overlayEnabled || tile.wantedSurfaceLevel !== level) {
          disposeRoofGroup(root, nextRoofGroup);
          if (tile.roofGroup) tile.roofGroup.visible = !!state.overlayEnabled;
          tile.surfaceReady = !!(tile.surfaceLevel >= 0 && tile.roofGroup);
          root.visible = !!state.overlayEnabled;
          try { map.triggerRepaint(); } catch (_) {}
          return null;
        }

        const raw = await decodeGzipAsset(assetUrl(tile, part.file));
        const geometry = createSurfaceChunkGeometry(THREE, raw, part, scale, tier.stride);
        const mesh = new THREE.Mesh(geometry, tile.surfaceMaterial);
        mesh.name = 'NYC registered orthophoto surface ' + tier.name + ' · chunk ' + part.part + ' · tile ' + tile.tileId;
        mesh.frustumCulled = false;
        mesh.renderOrder = 10;
        nextRoofGroup.add(mesh);

        if (!firstChunkAdded) {
          firstChunkAdded = true;
          if (tile.roofGroup) tile.roofGroup.visible = false;
          nextRoofGroup.visible = !!state.overlayEnabled;
          tile.pendingRoofGroup = nextRoofGroup;
          tile.surfaceReady = false;
          root.visible = !!state.overlayEnabled;
          try { reconcile(map, state); } catch (_) {}
        }
        // Progressive visible rows: do not wait for every chunk in the tile or every
        // neighboring tile before showing the photo drape.
        try { map.triggerRepaint(); } catch (_) {}
      }

      if (!firstChunkAdded) throw new Error('NYC_LIDAR_SURFACE_NO_CHUNKS_BUILT ' + tile.tileId);
      if (tile.wantedSurfaceLevel !== level || !state.overlayEnabled) {
        disposeRoofGroup(root, nextRoofGroup);
        if (tile.roofGroup) tile.roofGroup.visible = !!state.overlayEnabled;
        tile.surfaceReady = !!(tile.surfaceLevel >= 0 && tile.roofGroup);
        root.visible = !!state.overlayEnabled;
        return null;
      }

      if (tile.roofGroup && tile.roofGroup !== nextRoofGroup) {
        disposeRoofGroup(root, tile.roofGroup);
      }
      tile.roofGroup = nextRoofGroup;
      tile.pendingRoofGroup = null;
      tile.surfaceLevel = level;
      tile.surfaceReady = true;
      root.visible = !!state.overlayEnabled;
      nextRoofGroup.visible = !!state.overlayEnabled;
      if (tile.wallMesh) tile.wallMesh.visible = !!state.overlayEnabled;
      tile.surfaceTextureSize = Number(tile.surfaceTextureSize || tier.textureSize);
      tile.lastError = null;
      publish('orthophoto-roof-ground-and-lidar-walls-ready', {
        tileId: tile.tileId, surfaceLodName: tier.name, surfaceLod: level,
        surfaceStrideMetres: tier.stride * 2, surfaceVertices: nextRoofGroup.children.reduce((n, m) => n + Number(m.geometry?.attributes?.position?.count || 0), 0),
        surfaceChunkCount: nextRoofGroup.children.length, verticalWallQuads: Number(meta.wallQuadCount),
        verticalWallTriangles: Number(meta.wallTriangleCount), gridSpacingMetres: Number(meta.gridSpacingMetres),
        roofTextureSource: tile.manifest.imagery?.sourceProduct || 'NYS Latest Orthoimagery',
        roofTextureSize: tile.surfaceTextureSize, facadePhotoCoverage: false
      });
      try { map.triggerRepaint(); } catch (_) {}
      return root;
    } catch (error) {
      disposeRoofGroup(root, nextRoofGroup);
      if (tile.roofGroup) tile.roofGroup.visible = !!state.overlayEnabled;
      tile.pendingRoofGroup = null;
      tile.surfaceReady = !!(tile.surfaceLevel >= 0 && tile.roofGroup);
      root.visible = !!state.overlayEnabled;
      throw error;
    }
  }

  function surfaceTileDistance(map, tile) {
    try {
      const center = map.getCenter();
      const a = tile.manifest.anchor;
      const latScale = 111320;
      const lonScale = latScale * Math.max(0.1, Math.cos(Number(center.lat) * Math.PI / 180));
      const dx = (Number(a.longitude) - Number(center.lng)) * lonScale;
      const dy = (Number(a.latitude) - Number(center.lat)) * latScale;
      return Math.hypot(dx, dy);
    } catch (_) { return 0; }
  }

  function pumpSurfaceQueue(map, state) {
    while (state.surfaceWorkers < 2 && state.surfaceQueue.length) {
      const tile = state.surfaceQueue.shift();
      tile.surfaceQueued = false;
      const level = tile.wantedSurfaceLevel;
      if (!state.overlayEnabled || level < 0 ||
          (tile.surfaceReady && tile.surfaceLevel === level) ||
          tile.surfaceFailedLevel === level) continue;

      tile.surfaceTaskActive = true;
      state.surfaceWorkers++;
      const task = ensureSurfaceMesh(state, map, tile, level);
      tile.surfacePromise = task;
      task.catch(error => {
        tile.lastError = String(error && error.message || error);
        tile.surfaceFailedLevel = level;
        state.lastError = tile.tileId + ': ' + tile.lastError;
        publish('surface-mesh-load-error', { tileId: tile.tileId, surfaceLod: level, error: tile.lastError });
      }).finally(() => {
        if (tile.surfacePromise === task) tile.surfacePromise = null;
        tile.surfaceTaskActive = false;
        state.surfaceWorkers = Math.max(0, state.surfaceWorkers - 1);
        if (state.overlayEnabled && tile.wantedSurfaceLevel >= 0 &&
            !(tile.surfaceReady && tile.surfaceLevel === tile.wantedSurfaceLevel) &&
            tile.surfaceFailedLevel !== tile.wantedSurfaceLevel) {
          queueSurfaceMesh(map, state, tile, tile.wantedSurfaceLevel);
        }
        reconcile(map, state);
        pumpSurfaceQueue(map, state);
      });
    }
  }

  function queueSurfaceMesh(map, state, tile, level) {
    tile.wantedSurfaceLevel = level;
    if (level < 0 || !state.overlayEnabled ||
        (tile.surfaceReady && tile.surfaceLevel === level) ||
        tile.surfaceTaskActive || tile.surfaceQueued ||
        tile.surfaceFailedLevel === level) return;
    tile.surfaceQueued = true;
    state.surfaceQueue.push(tile);
    state.surfaceQueue.sort((a, b) => surfaceTileDistance(map, a) - surfaceTileDistance(map, b));
    pumpSurfaceQueue(map, state);
  }

  function activeCoveragePolygons(state) {
    return [...state.tiles.values()]
      .filter(tile => tile.surfaceReady && tile.surfaceLevel >= 0 && tile.surfaceGroup?.visible)
      .map(tile => {
        const ring = tile.manifest?.boundsWgs84?.polygon;
        if (!Array.isArray(ring) || ring.length < 4) return null;
        return { type: 'Polygon', coordinates: [ring] };
      })
      .filter(Boolean);
  }

  // Convert legacy MapLibre filters into expression syntax before combining them
  // with "within". Filters already using expression operators pass through unchanged.
  function asFilterExpression(filter) {
    if (!Array.isArray(filter) || typeof filter[0] !== 'string') return filter;
    const op = filter[0];
    if (op === 'all' || op === 'any') return [op, ...filter.slice(1).map(asFilterExpression)];
    if (op === 'none') return ['!', ['any', ...filter.slice(1).map(asFilterExpression)]];
    if (['==', '!=', '<', '<=', '>', '>='].includes(op) && typeof filter[1] === 'string') {
      const field = filter[1];
      const lhs = field === '$type' ? ['geometry-type'] : field === '$id' ? ['id'] : ['get', field];
      return [op, lhs, filter[2], ...filter.slice(3)];
    }
    if ((op === 'in' || op === '!in') && typeof filter[1] === 'string') {
      const field = filter[1];
      const lhs = field === '$type' ? ['geometry-type'] : field === '$id' ? ['id'] : ['get', field];
      const included = ['in', lhs, ['literal', filter.slice(2)]];
      return op === 'in' ? included : ['!', included];
    }
    if (op === '!has') return ['!', ['has', filter[1]]];
    return filter;
  }

  function restoreLayerState(map, id, previous) {
    if (!map.getLayer(id)) return;
    try { map.setLayoutProperty(id, 'visibility', previous.visibility || 'visible'); } catch (_) {}
    try { map.setLayerZoomRange(id, previous.minzoom ?? 0, previous.maxzoom ?? 24); } catch (_) {}
    try { map.setFilter(id, previous.hasFilter ? (previous.filter ?? null) : null); } catch (_) {}
  }

  function restoreSurfaceFilters(map, state) {
    for (const [id, previous] of state.savedFilters) restoreLayerState(map, id, previous);
    state.savedFilters.clear();
    state.maskActive = false;
    state.coverageFilterActive = false;
    state.coverageFilteredLayerIds = [];
  }

  function suppressLegacySurfaces(map, state, enabled, fullViewportCovered) {
    if (!enabled) {
      if (state.maskActive || state.coverageFilterActive || state.savedFilters.size) restoreSurfaceFilters(map, state);
      return;
    }

    const polygons = activeCoveragePolygons(state);
    if (!polygons.length) {
      if (state.maskActive || state.coverageFilterActive || state.savedFilters.size) restoreSurfaceFilters(map, state);
      return;
    }

    const exclusion = ['!', ['any', ...polygons.map(polygon => ['within', polygon])]];
    const filteredIds = [];
    const layers = map.getStyle()?.layers || [];
    for (const layer of layers) {
      const id = String(layer.id || '');
      if (!BUILDING_LAYER_RE.test(id) || id === LAYER_ID || layer.type === 'background') continue;
      if (!state.savedFilters.has(id)) {
        let filter = null, hasFilter = false, visibility = 'visible';
        try { filter = map.getFilter(id); hasFilter = true; } catch (_) {}
        try { visibility = map.getLayoutProperty(id, 'visibility') || 'visible'; } catch (_) {}
        state.savedFilters.set(id, {
          visibility, filter, hasFilter,
          minzoom: Number.isFinite(layer.minzoom) ? layer.minzoom : 0,
          maxzoom: Number.isFinite(layer.maxzoom) ? layer.maxzoom : 24,
          type: layer.type, source: layer.source || null
        });
      }
      const previous = state.savedFilters.get(id);

      // When the complete viewport is covered, suppress all duplicate building layers.
      if (fullViewportCovered) {
        try {
          if (previous.hasFilter) map.setFilter(id, previous.filter ?? null);
          else map.setFilter(id, null);
        } catch (_) {}
        try {
          map.setLayoutProperty(id, 'visibility', 'none');
        } catch (error) {
          try { map.setLayerZoomRange(id, 24, 25); }
          catch (fallbackError) {
            const message = String(fallbackError && fallbackError.message || error);
            if (!state.filterErrors.some(item => item.id === id && item.error === message)) state.filterErrors.push({ id, error: message });
          }
        }
        continue;
      }

      // Partial viewport coverage must not leave an entire city's Gold LOD layer over
      // the scan. Keep buildings outside the LiDAR footprint, but exclude features that
      // are fully inside active scan tiles so the measured textured mesh is visible alone.
      try { map.setLayoutProperty(id, 'visibility', previous.visibility || 'visible'); } catch (_) {}
      try { map.setLayerZoomRange(id, previous.minzoom ?? 0, previous.maxzoom ?? 24); } catch (_) {}

      // Custom GL layers cannot be clipped with feature filters; keep them visible until
      // the viewport is fully covered, when the safe whole-layer suppression above applies.
      if (!previous.source || previous.type === 'custom') {
        try { map.setFilter(id, previous.hasFilter ? (previous.filter ?? null) : null); } catch (_) {}
        continue;
      }

      try {
        const base = previous.hasFilter && previous.filter != null
          ? asFilterExpression(previous.filter)
          : true;
        const combined = base === true ? exclusion : ['all', base, exclusion];
        map.setFilter(id, combined);
        filteredIds.push(id);
      } catch (error) {
        // Preserve the original LOD rather than blanking a layer if this style's source
        // does not support geometry filtering. The exact source mesh continues rendering.
        try { map.setFilter(id, previous.hasFilter ? (previous.filter ?? null) : null); } catch (_) {}
        const message = String(error && error.message || error);
        if (!state.filterErrors.some(item => item.id === id && item.error === message)) state.filterErrors.push({ id, error: message });
      }
    }
    state.maskActive = !!fullViewportCovered && state.savedFilters.size > 0;
    state.coverageFilterActive = !fullViewportCovered && filteredIds.length > 0;
    state.coverageFilteredLayerIds = filteredIds.slice(0, 60);
  }

  function fullyCoveredByActiveTiles(map, state) {
    const catalog = state.tileCatalogRecords?.length ? state.tileCatalogRecords : [...state.tiles.values()].map(t => ({tileId:t.tileId,boundsWgs84:t.manifest.boundsWgs84}));
    const intersecting = catalog.filter(record => intersects(map, record));
    if (!intersecting.length) return false;
    const loaded = intersecting.map(record => state.tiles.get(String(record.tileId)));
    if (loaded.some(t => !t || !t.surfaceReady || t.surfaceLevel < 0 || !t.surfaceGroup?.visible)) return false;
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
    const surfaceVisibleTiles = [...state.tiles.values()].filter(t =>
      t.surfaceGroup?.visible && (t.surfaceReady || (t.pendingRoofGroup?.children?.length || 0) > 0));
    const surfaceTiles = surfaceVisibleTiles.filter(t => t.surfaceReady);
    const centerSurfaceTier = center?.surfaceLevel >= 0 ? SURFACE_TIERS[center.surfaceLevel] : null;
    publish(status, {
      attachedMaps: attachedCount, layerInstalled: !!map.getLayer(LAYER_ID),
      tileId: CENTER_TILE_ID,
      tileAnchor: center ? [center.manifest.anchor.longitude, center.manifest.anchor.latitude] : null,
      zoom: Number(map.getZoom()), requestedLod: center?.wantedLevel ?? -1,
      activeLod: level, activeLodName: lodMeta?.name || null,
      visiblePoints: level >= 0 ? lodMeta.pointCount : 0,
      sourcePointCount: center?.manifest.sourcePoints || 17523220,
      actualMeasuredPointsOnly: true, visible: activeTiles.length > 0 || surfaceVisibleTiles.length > 0,
      photorealisticSurfaceMesh: surfaceVisibleTiles.length > 0,
      surfaceMeshVisible: surfaceVisibleTiles.length > 0,
      surfaceMeshReady: surfaceTiles.length > 0,
      surfaceMeshReadyTileCount: surfaceTiles.length,
      surfaceMeshLoadingTileIds: [...state.tiles.values()].filter(t=>t.surfaceTaskActive || t.surfaceQueued).map(t=>t.tileId),
      surfaceLodName: centerSurfaceTier?.name || null,
      surfaceLodStrideMetres: centerSurfaceTier ? centerSurfaceTier.stride * 2 : null,
      surfaceTextureSize: center?.surfaceTextureSize || 0,
      verticalWallMeshVisible: [...state.tiles.values()].some(t=>!!t.wallMesh?.visible),
      verticalWallQuads: surfaceVisibleTiles.reduce((n,t)=>n+Number(t.manifest.surfaceMesh?.wallQuadCount||0),0),
      facadePhotoCoverage: false,
      duplicateBuildingPolicy: 'Gold LOD features are clipped inside fully streamed LiDAR tiles; photo surface remains progressive while chunks arrive',
      coverageFilterActive: state.coverageFilterActive,
      coverageFilteredLayerIds: state.coverageFilteredLayerIds.slice(0,60),
      hiddenLegacyLayerIds: [...state.savedFilters.keys()].slice(0,60),
      suppressedLegacyLayerCount: state.savedFilters.size,
      legacySuppressionErrors: state.filterErrors.slice(0,12),
      surfaceMeshGridSpacingMetres: center?.manifest.surfaceMesh?.gridSpacingMetres || null,
      aerialTextureSource: center?.manifest.imagery?.sourceProduct || 'NYS Latest Orthoimagery',
      tileCount: state.tiles.size,
      activeTileIds: activeTiles.map(t=>t.tileId),
      surfaceTileIds: surfaceVisibleTiles.map(t=>t.tileId),
      failedTileIds: [...state.tiles.values()].filter(t=>t.lastError).map(t=>({tileId:t.tileId,error:t.lastError})),
      lastError: state.lastError
    });
  }

  async function reconcileVisibleTiles(map, state) {
    if (!state.baseManifest || !state.scene || state.installing) return;
    const zoom = Number(map.getZoom());
    for (const tile of state.tiles.values()) {
      const level = state.overlayEnabled ? wantedLod(map, tile.manifest) : -1;
      const surfaceLevel = state.overlayEnabled ? wantedSurfaceLod(map, tile.manifest) : -1;
      tile.wantedLevel = level;
      tile.wantedSurfaceLevel = surfaceLevel;

      if (surfaceLevel < 0 && level < 0) {
        for (const mesh of tile.meshes.values()) mesh.visible = false;
        if (tile.surfaceGroup) tile.surfaceGroup.visible = false;
        if (tile.roofGroup) tile.roofGroup.visible = false;
        if (tile.pendingRoofGroup) tile.pendingRoofGroup.visible = false;
        if (tile.wallMesh) tile.wallMesh.visible = false;
        tile.activeLevel = -1;
        continue;
      }

      // Show an already-cached surface immediately; leave the point LOD visible only as a
      // fallback until all chunks for the currently displayed photo LOD have finished.
      if (tile.surfaceGroup) {
        tile.surfaceGroup.visible = !!state.overlayEnabled;
        if (tile.roofGroup) tile.roofGroup.visible = !!(state.overlayEnabled && tile.surfaceReady && surfaceLevel >= 0 && tile.surfaceLevel === surfaceLevel);
        if (tile.pendingRoofGroup) tile.pendingRoofGroup.visible = !!(state.overlayEnabled && !tile.surfaceReady);
        if (tile.wallMesh) tile.wallMesh.visible = !!state.overlayEnabled;
      }

      if (level >= 0) {
        const fallbackLevel = surfaceLevel >= 0 ? 0 : level;
        const visibleMesh = tile.meshes.get(level) ||
          (fallbackLevel < level ? tile.meshes.get(fallbackLevel) : null) ||
          [...tile.meshes.entries()].filter(([tier]) => tier < level).sort((a,b)=>b[0]-a[0])[0]?.[1] || null;
        const photoChunkAlreadyVisible = (tile.pendingRoofGroup?.children?.length || 0) > 0;
        for (const [tier, mesh] of tile.meshes) {
          mesh.visible = !!(state.overlayEnabled && !tile.surfaceReady && !photoChunkAlreadyVisible && mesh === visibleMesh);
        }
        if (!visibleMesh && !tile.loads.has(fallbackLevel) && !tile.loads.has(level)) {
          ensureLod(map, state, tile, fallbackLevel).then(() => reconcile(map, state)).catch(error => {
            tile.lastError = String(error && error.message || error);
            state.lastError = tile.tileId + ': ' + tile.lastError;
            publish('point-lod-load-error', { tileId: tile.tileId, lod: fallbackLevel, error: tile.lastError });
          });
        }
        tile.activeLevel = visibleMesh && visibleMesh.visible ? (tile.meshes.has(level) ? level : fallbackLevel) : -1;
      } else {
        for (const mesh of tile.meshes.values()) mesh.visible = false;
        tile.activeLevel = -1;
      }

      if (surfaceLevel >= 0 && !(tile.surfaceReady && tile.surfaceLevel === surfaceLevel)) {
        queueSurfaceMesh(map, state, tile, surfaceLevel);
      }
      if (surfaceLevel >= 0 && tile.surfaceReady && tile.surfaceLevel === surfaceLevel) {
        if (tile.roofGroup) tile.roofGroup.visible = !!state.overlayEnabled;
        if (tile.wallMesh) tile.wallMesh.visible = !!state.overlayEnabled;
        // A ready photo mesh replaces sampled points to prevent speckles/double geometry.
        for (const mesh of tile.meshes.values()) mesh.visible = false;
      } else if (tile.surfaceReady && tile.surfaceLevel >= 0 && surfaceLevel >= 0) {
        // Keep the existing photo LOD visible while a sharper/coarser replacement is built.
        if (tile.roofGroup) tile.roofGroup.visible = !!state.overlayEnabled;
      }
    }

    suppressLegacySurfaces(map, state, state.overlayEnabled, state.overlayEnabled && fullyCoveredByActiveTiles(map, state));
    map.triggerRepaint();
    updateStatus(map, state, 'rendering-source-lidar-neighborhood');
    if (zoom >= 12 && [...state.tiles.values()].some(t=>t.surfaceGroup?.visible)) {
      publish('rendering-source-lidar-neighborhood', {
        ...window.__BP_NYC_LIDAR_V7000__,
        fullViewportSurfaceCoverage: fullyCoveredByActiveTiles(map, state),
        surfaceLodNames: SURFACE_TIERS.map(t=>t.name)
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
        state.scene.rotation.y = GRID_TO_TRUE_NORTH_RADIANS;
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
          if (state.overlayEnabled) state.renderer.render(state.scene, state.camera);
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
      z:-(Number(anchor.projectedYFeet)-Number(baseAnchor.projectedYFeet))*FT_TO_M
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
      surfaceTexture:null, surfaceTextureSize:0, surfaceTexturePromise:null,
      surfaceMaterial:null, roofGroup:null, pendingRoofGroup:null, wallMesh:null, wallPromise:null,
      surfaceReady:false, surfaceLevel:-1, wantedSurfaceLevel:-1,
      surfaceQueued:false, surfaceTaskActive:false, surfaceFailedLevel:-1, lastError:null
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

  function addCoverageMarker(map) {
    if (!map || !map.addSource || !map.addLayer) return;
    const sourceId='bp-lidar-coverage-source-v7003',circleId='bp-lidar-coverage-marker-v7003',labelId='bp-lidar-coverage-label-v7003';
    try {
      if (!map.getSource(sourceId)) map.addSource(sourceId,{type:'geojson',data:{type:'FeatureCollection',features:[{type:'Feature',properties:{name:'New York City LiDAR / photo mesh',tileCount:9},geometry:{type:'Point',coordinates:[-73.99,40.75]}}]}});
      if (!map.getLayer(circleId)) map.addLayer({id:circleId,type:'circle',source:sourceId,minzoom:0,maxzoom:12,paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,4,5,6,10,9,12,11],'circle-color':'#43e7ff','circle-stroke-color':'#ffffff','circle-stroke-width':1.5,'circle-opacity':0.95,'circle-blur':0.08}});
      if (!map.getLayer(labelId)) map.addLayer({id:labelId,type:'symbol',source:sourceId,minzoom:0,maxzoom:5,layout:{'text-field':'NYC LiDAR','text-size':11,'text-offset':[0,1.4],'text-allow-overlap':true},paint:{'text-color':'#e8fbff','text-halo-color':'#06202a','text-halo-width':1.5}});
      if (!map.__bpLidarCoverageClickV7003) {map.__bpLidarCoverageClickV7003=true;map.on('click',circleId,()=>map.flyTo({center:[-73.99,40.75],zoom:15.5,pitch:55,duration:1800}));map.on('mouseenter',circleId,()=>{map.getCanvas().style.cursor='pointer'});map.on('mouseleave',circleId,()=>{map.getCanvas().style.cursor=''});}
    } catch (_) {}
  }
  function addOverlayControl(map,state) {
    const slot=document.getElementById('bpv-map-controls-slot');
    if (!slot || slot.querySelector('[data-bp-lidar-toggle-v7003]')) return;
    const wrap=document.createElement('div');wrap.dataset.bpLidarToggleV7003='true';
    wrap.style.cssText='display:flex;align-items:center;gap:10px;flex-wrap:wrap;width:100%;margin:8px 0 0;padding:10px 12px;border:1px solid rgba(67,231,255,.38);border-radius:10px;background:rgba(4,19,29,.94);color:#eafaff;font:700 12px/1.3 system-ui,sans-serif;box-sizing:border-box';
    const button=document.createElement('button');button.type='button';button.setAttribute('aria-pressed','false');
    button.style.cssText='flex:1;min-height:42px;border:1px solid rgba(67,231,255,.6);border-radius:8px;background:linear-gradient(135deg,#0a3542,#10212d);color:#c7f8ff;font:900 11px/1.25 system-ui,sans-serif;letter-spacing:.035em;padding:8px;cursor:pointer';
    const note=document.createElement('span');note.textContent='Verified NYC coverage only · source geometry';note.style.cssText='font-size:10px;color:#a4c9d3;flex:1 1 100%';
    const paint=()=>{button.setAttribute('aria-pressed',String(state.overlayEnabled));button.textContent='LiDAR / PHOTOGRAPH MESH OVERLAY: '+(state.overlayEnabled?'ON':'OFF');};
    button.addEventListener('click',()=>{state.overlayEnabled=!state.overlayEnabled;try{localStorage.setItem(OVERLAY_STORAGE_KEY,state.overlayEnabled?'1':'0')}catch(_){}if(state.overlayEnabled){for(const tile of state.tiles.values())tile.surfaceFailedLevel=-1;}try{if(map.getLayer(LAYER_ID))map.setLayoutProperty(LAYER_ID,'visibility',state.overlayEnabled?'visible':'none')}catch(_){}if(!state.overlayEnabled)suppressLegacySurfaces(map,state,false);paint();reconcile(map,state);publish(state.overlayEnabled?'overlay-enabled':'overlay-disabled',{overlayEnabled:state.overlayEnabled});});
    wrap.append(button,note);slot.append(wrap);paint();
  }

  function attach(map) {
    if (!map || MAPS.has(map)) return;
    const state = {
      map, baseManifest:null, baseAnchor:null, tiles:new Map(), catalogErrors:[],
      scene:null, camera:null, renderer:null, gl:null,
      installing:false, layerAdded:false, overlayEnabled:false, savedFilters:new Map(), maskActive:false,
      coverageFilterActive:false, coverageFilteredLayerIds:[],
      surfaceQueue:[], surfaceWorkers:0,
      filterErrors:[], lastError:null, reconciling:false, reconcilePending:false,
      eventsBound:false, autoFocused:false
    };
    MAPS.set(map, state);
    // Always start OFF on a fresh page load, even if an earlier build saved the toggle as ON.
    state.overlayEnabled = false;
    try { localStorage.removeItem(OVERLAY_STORAGE_KEY); } catch (_) {}
    addOverlayControl(map,state); addCoverageMarker(map); map.on('style.load',()=>{addCoverageMarker(map);addOverlayControl(map,state)});
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