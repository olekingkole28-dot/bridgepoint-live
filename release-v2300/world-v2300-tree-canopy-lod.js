const VERSION = 1;
export const TREE_COVER_LAYER_ID = 'bp-tree-cover-regional-v1';
const SOURCE_ID = 'ofm';
const SOURCE_LAYER = 'landcover';
const INDIVIDUAL_TREE_HANDOFF_ZOOM = 12.6;

export function treeCoverLayerSpec({ geojson = false } = {}) {
  const spec = {
    id: TREE_COVER_LAYER_ID,
    type: 'fill',
    source: SOURCE_ID,
    ...(geojson ? {} : { 'source-layer': SOURCE_LAYER }),
    minzoom: 2,
    maxzoom: 13.15,
    filter: [
      'match',
      ['downcase', ['to-string', ['coalesce', ['get', 'class'], '']]],
      ['wood', 'forest'],
      true,
      false
    ],
    paint: {
      'fill-color': [
        'match',
        ['downcase', ['to-string', ['coalesce', ['get', 'class'], '']]],
        'forest', '#285b38',
        'wood', '#326743',
        '#285b38'
      ],
      // This is a low-opacity landcover canopy cue, not a fabricated tree mesh
      // or per-tree count. It fades away where source-backed individual points
      // and street-detail tree models take over.
      'fill-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        2, 0.055,
        4, 0.085,
        7, 0.105,
        9.5, 0.095,
        10.8, 0.075,
        11.35, 0.052,
        11.7, 0.055,
        12.2, 0.045,
        12.6, 0.022,
        13.0, 0
      ]
    }
  };
  return spec;
}

export function installRegionalTreeCoverLayer(map) {
  if (!map || typeof map.addLayer !== 'function') {
    throw new TypeError('A live MapLibre map is required.');
  }

  const state = {
    version: VERSION,
    layerId: TREE_COVER_LAYER_ID,
    source: SOURCE_ID,
    sourceLayer: SOURCE_LAYER,
    sourceTruth: 'OPENFREEMAP_LANDCOVER_FOREST_WOOD_POLYGONS',
    representation: 'REGIONAL_CANOPY_COVER_PROXY_NOT_INDIVIDUAL_TREE_LOCATIONS',
    individualTreeHandoffZoom: INDIVIDUAL_TREE_HANDOFF_ZOOM,
    status: 'waiting-for-map-style',
    updatedAt: Date.now()
  };
  window.__BP_TREE_CANOPY_LOD_V1__ = state;

  function install() {
    if (!map.getStyle?.() || !map.isStyleLoaded?.()) {
      state.status = 'waiting-for-map-style';
      state.updatedAt = Date.now();
      return false;
    }
    if (!map.getSource?.(SOURCE_ID)) {
      state.status = 'source-unavailable';
      state.updatedAt = Date.now();
      return false;
    }
    if (!map.getLayer?.(TREE_COVER_LAYER_ID)) {
      const before = map.getLayer?.('gta-landuse')
        ? 'gta-landuse'
        : (map.getLayer?.('gta-hillshade') ? 'gta-hillshade' : undefined);
      const source = map.getSource?.(SOURCE_ID);
      const sourceType = source?.type || source?._options?.type;
      map.addLayer(treeCoverLayerSpec({ geojson: sourceType === 'geojson' }), before);
    }
    state.status = map.getLayer?.(TREE_COVER_LAYER_ID) ? 'active' : 'install-failed';
    state.updatedAt = Date.now();
    return state.status === 'active';
  }

  if (!install()) {
    const retry = () => {
      if (install()) {
        map.off?.('styledata', retry);
        map.off?.('style.load', retry);
      }
    };
    map.on?.('styledata', retry);
    map.on?.('style.load', retry);
  }

  return state;
}

