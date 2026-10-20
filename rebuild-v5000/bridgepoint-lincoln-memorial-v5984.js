/* BridgePoint Lincoln Memorial survey gateway v5984.
 * Authoritative source: CyArk / DJS Associates terrestrial LiDAR survey, 2014-04-28 to 2014-05-01.
 * Dataset DOI 10.26301/90yg-1054; 11.36 GB; source license CC BY-NC-SA 4.0.
 * The licensed survey is hosted by Open Heritage 3D. This module links out to the original hosted
 * point-cloud explorer instead of copying/repackaging the non-commercial ShareAlike dataset.
 * The explorer covers the memorial's interior and seated Lincoln statue.
 */
(() => {
  'use strict';
  if (window.__BP_LINCOLN_MEMORIAL_V5984_BOOTED__) return;
  window.__BP_LINCOLN_MEMORIAL_V5984_BOOTED__ = true;

  const VERSION = 5984;
  const LOCATION = [-77.0502, 38.8893]; // longitude, latitude; Lincoln Memorial, National Mall
  const VIEWER_URL = 'https://pointcloud.ucsd.edu/archive_temp/oh3d_store/oh3d-vis/base_potree_template/?vtype=oh3d&doi=90yg-1054';
  const DATASET_URL = 'https://openheritage3d.org/project.php?id=90yg-1054';
  const CYARK_URL = 'https://www.cyark.org/projects/lincoln-memorial';
  const LICENSE = 'CC BY-NC-SA 4.0 — source data terms apply; source-hosted viewer opened externally';
  const MAPS = new Set();
  const STATES = new WeakMap();
  const BOUNDS = [-77.0530, 38.8872, -77.0473, 38.8913];
  const SOURCE_ID = 'bp-lincoln-memorial-point-v5984';
  const LAYER_ID = 'bp-lincoln-memorial-label-v5984';

  const css = document.createElement('style');
  css.id = 'bp-lincoln-memorial-v5984-style';
  css.textContent = [
    '.bp-lincoln-scan-chip-v5984{position:absolute;z-index:1103;left:50%;bottom:max(18px,calc(env(safe-area-inset-bottom) + 18px));transform:translateX(-50%);display:flex;max-width:calc(100% - 24px);padding:9px 12px;border:1px solid rgba(255,220,150,.55);border-radius:14px;background:rgba(8,18,27,.96);box-shadow:0 8px 24px rgba(0,0,0,.4);color:#fff4dc;font:700 11px/1.35 system-ui,sans-serif;text-align:left;gap:10px;align-items:center}',
    '.bp-lincoln-scan-chip-v5984[data-show="true"]{display:flex}',
    '.bp-lincoln-scan-chip-v5984 small{display:block;color:#bed1dc;font-size:9px;font-weight:500;margin-top:2px}',
    '.bp-lincoln-scan-chip-v5984 a{display:inline-block;flex:0 0 auto;padding:9px 11px;border-radius:9px;background:#f3ca83;color:#20180e;text-decoration:none;font-weight:800;white-space:nowrap}',
    '.bp-lincoln-scan-chip-v5984 button{display:inline-block;flex:0 0 auto;padding:9px 11px;border:1px solid rgba(255,230,180,.35);border-radius:9px;background:rgba(35,65,82,.95);color:#fff1dc;font:800 10px/1.2 system-ui,sans-serif;white-space:nowrap;cursor:pointer}',
    '@media(max-width:460px){.bp-lincoln-scan-chip-v5984{width:calc(100% - 20px);max-width:none;left:10px;right:10px;transform:none;justify-content:space-between;gap:7px;padding:8px}.bp-lincoln-scan-chip-v5984 span{min-width:0;flex:1 1 auto}.bp-lincoln-scan-chip-v5984 small{max-width:170px}.bp-lincoln-scan-chip-v5984 button,.bp-lincoln-scan-chip-v5984 a{white-space:normal;max-width:105px;text-align:center;padding:8px 7px;font-size:9px}}',
    '.bp-lincoln-popup-v5984{font:12px/1.45 system-ui,sans-serif;color:#1a222a;min-width:210px;max-width:270px}',
    '.bp-lincoln-popup-v5984 strong{display:block;font-size:14px;margin-bottom:5px}',
    '.bp-lincoln-popup-v5984 p{margin:5px 0;color:#4a5660}',
    '.bp-lincoln-popup-v5984 a{display:block;margin-top:8px;padding:9px 10px;border-radius:8px;text-align:center;text-decoration:none;font-weight:800;background:#173c51;color:#fff}'
  ].join('');
  document.head.appendChild(css);

  function foundMaps() {
    const worlds = [
      window.__BP_LANDING_WORLD__, window.__bpLandingWorldV5420,
      window.__BP_V5000_WORLD, window.__BP_V5000_WORLD__
    ];
    const result = [];
    for (const world of worlds) {
      const map = world && world.map;
      if (map && typeof map.on === 'function' && !result.includes(map)) result.push(map);
    }
    const pending = window.__BP_PENDING_LANDMARK_MAP_V5940__;
    if (pending && typeof pending.on === 'function' && !result.includes(pending)) result.push(pending);
    return result;
  }

  function boundsContain(bounds, point) {
    return point[0] >= bounds[0] && point[0] <= bounds[2] &&
      point[1] >= bounds[1] && point[1] <= bounds[3];
  }

  function isNear(map, minZoom = 12.4) {
    try {
      const b = map.getBounds();
      return Number(map.getZoom()) >= minZoom &&
        boundsContain([b.getWest(), b.getSouth(), b.getEast(), b.getNorth()], LOCATION);
    } catch (_) { return false; }
  }

  function feature() {
    return {
      type: 'Feature',
      properties: {
        name: 'LINCOLN MEMORIAL',
        scan: 'CyArk + DJS Associates terrestrial LiDAR',
        dataset_doi: '10.26301/90yg-1054',
        source_url: DATASET_URL,
        scan_url: VIEWER_URL,
        license: LICENSE
      },
      geometry: { type: 'Point', coordinates: LOCATION }
    };
  }

  function ensureSourceAndLayer(map) {
    if (!map.getSource(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [feature()] }
      });
    }
    if (!map.getLayer(LAYER_ID)) {
      map.addLayer({
        id: LAYER_ID,
        type: 'symbol',
        source: SOURCE_ID,
        minzoom: 6.4,
        layout: {
          'text-field': ['get', 'name'],
          'text-size': ['interpolate', ['linear'], ['zoom'], 6.4, 9, 10, 12, 14, 14],
          'text-anchor': 'top',
          'text-offset': [0, 1.3],
          'text-max-width': 15,
          'text-allow-overlap': false
        },
        paint: {
          'text-color': '#ffe6b4',
          'text-halo-color': 'rgba(10,18,25,0.96)',
          'text-halo-width': 1.6
        }
      });
    }
  }

  function ensureChip(map, state) {
    const container = map.getContainer && map.getContainer();
    if (!container) return;
    let chip = container.querySelector('.bp-lincoln-scan-chip-v5984');
    if (!chip || !chip.querySelector('.bp-lincoln-focus-v5984')) {
      if (chip) chip.remove();
      chip = document.createElement('div');
      chip.className = 'bp-lincoln-scan-chip-v5984';
      chip.innerHTML =
        '<span><b>LINCOLN MEMORIAL · ORIGINAL LiDAR</b><small>CyArk / DJS Associates · 665.7M source points · CC BY-NC-SA 4.0 · rendered on this globe</small></span>' +
        '<button type="button" class="bp-lincoln-focus-v5984">FOCUS SCAN</button>';
      container.appendChild(chip);
    }
    const focusButton = chip.querySelector('.bp-lincoln-focus-v5984');
    if (focusButton && focusButton.dataset.bound !== 'true') {
      focusButton.dataset.bound = 'true';
      focusButton.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        try {
          map.stop();
          map.flyTo({ center: LOCATION, zoom: 14.2, pitch: 42, bearing: 0, duration: 1800, essential: true });
          publish('flying-to-landmark', { target: LOCATION.slice(), zoom: 14.2 });
        } catch (error) {
          publish('focus-error', { detail: String(error && error.message || error) });
        }
      });
    }

    state.chip = chip;
  }

  function popup(map) {
    if (!window.maplibregl || !window.maplibregl.Popup) {
      window.open(VIEWER_URL, '_blank', 'noopener');
      return;
    }
    const root = document.createElement('div');
    root.className = 'bp-lincoln-popup-v5984';
    const title = document.createElement('strong');
    title.textContent = 'Lincoln Memorial — actual survey data';
    const info = document.createElement('p');
    info.textContent = 'CyArk and DJS Associates terrestrial LiDAR, captured April 28–May 1, 2014. The source-hosted point cloud includes the interior chamber and seated Lincoln statue.';
    const license = document.createElement('p');
    license.textContent = 'Open Heritage 3D · 11.36 GB source dataset · CC BY-NC-SA 4.0.';
    const focus = document.createElement('button');
    focus.type = 'button';
    focus.textContent = 'FOCUS ORIGINAL LiDAR ON THE GLOBE';
    focus.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      try {
        map.stop();
        map.flyTo({ center: LOCATION, zoom: 15.3, pitch: 48, bearing: 0, duration: 1500, essential: true });
      } catch (error) {
        publish('focus-error', { detail: String(error && error.message || error) });
      }
    });
    root.append(title, info, license, focus);
    new window.maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '300px' })
      .setLngLat(LOCATION).setDOMContent(root).addTo(map);
  }

  function update(map, state) {
    if (!map || !map.getStyle || !map.getStyle()) return;
    try { ensureSourceAndLayer(map); } catch (error) {
      console.warn('BridgePoint Lincoln Memorial layer', error);
      publish('map-layer-error', { detail: String(error && error.message || error) });
      return;
    }
    const near = isNear(map);
    if (state.chip) state.chip.dataset.show = near ? 'true' : 'false';
    if (near) publish('ready-near-landmark', { mapZoom: map.getZoom(), promptVisible: !!state.chip });
  }

  function publish(status, extra = {}) {
    window.__BP_LINCOLN_MEMORIAL_V5984__ = Object.assign({
      version: VERSION, status, coordinates: LOCATION.slice(), coordinatesCrs: 'EPSG:4326',
      source: 'CyArk and DJS Associates terrestrial LiDAR survey',
      collectionDate: '2014-04-28 to 2014-05-01', datasetDoi: '10.26301/90yg-1054',
      datasetPage: DATASET_URL, originalViewer: VIEWER_URL, CyArkProject: CYARK_URL,
      datasetSize: '11.36 GB', license: LICENSE,
      targetContent: 'Lincoln Memorial interior + seated Abraham Lincoln point cloud',
      sourceDataEmbeddedOrRedistributed: false, updatedAt: Date.now()
    }, extra);
  }

  function attach(map) {
    if (!map || STATES.has(map)) return;
    MAPS.add(map);
    const state = { chip: null, listeners: false };
    STATES.set(map, state);
    const ready = () => {
      try {
        ensureSourceAndLayer(map);
        ensureChip(map, state);
        if (!state.listeners) {
          state.listeners = true;
          map.on('moveend', () => update(map, state));
          map.on('zoomend', () => update(map, state));
          map.on('click', LAYER_ID, () => popup(map));
          map.on('mouseenter', LAYER_ID, () => { try { map.getCanvas().style.cursor = 'pointer'; } catch (_) {} });
          map.on('mouseleave', LAYER_ID, () => { try { map.getCanvas().style.cursor = ''; } catch (_) {} });
        }
        update(map, state);
        publish('attached', { attachedMaps: MAPS.size, markerLayer: !!map.getLayer(LAYER_ID) });
        const wantsLincolnFocus = (() => {
          try {
            const params = new URLSearchParams(window.location.search);
            return params.get('landmark') === 'lincoln' || params.get('focus') === 'lincoln';
          } catch (_) { return false; }
        })();
        if (wantsLincolnFocus && !state.autoFocused) {
          state.autoFocused = true;
          map.stop();
          map.flyTo({ center: LOCATION, zoom: 15.2, pitch: 48, bearing: 0, duration: 1600, essential: true });
          publish('autofocus-lincoln-memorial', { target: LOCATION.slice(), zoom: 15.2, pitch: 48 });
        }
      } catch (error) {
        publish('attach-error', { detail: String(error && error.message || error) });
      }
    };
    map.on('style.load', ready);
    map.on('load', ready);
    if (map.isStyleLoaded && map.isStyleLoaded()) ready();
  }

  function discover() {
    for (const map of foundMaps()) attach(map);
    if (MAPS.size < 1 && discover.tries < 100) {
      discover.tries++;
      setTimeout(discover, 500);
    }
  }
  discover.tries = 0;
  window.addEventListener('bp:world-map-ready-v5940', event => {
    const map = event && event.detail && event.detail.map;
    if (map && typeof map.on === 'function') attach(map);
  });
  discover();
  window.addEventListener('load', discover, { once: true });
  publish('booting');
})();
