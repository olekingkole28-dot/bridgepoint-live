/**
 * BridgePoint Named Earthquakes Layer V2
 *
 * Source: USGS ComCat public GeoJSON summary feed.
 * Representation: source-reported epicenter points only. Depth is displayed
 * as source metadata; this layer does not fabricate rupture planes or shaking.
 * Network activity is strictly opt-in and stops when the layer is turned off.
 */
export const SEISMIC_FEED_URL =
  'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_week.geojson';
export const SEISMIC_REFRESH_MS = 60_000;
export const SEISMIC_MAX_FEATURES = 1500;

const SOURCE_ID = 'bp-usgs-seismic-source-v1';
const GLOW_LAYER_ID = 'bp-usgs-seismic-glow-v1';
const POINT_LAYER_ID = 'bp-usgs-seismic-points-v1';
const EMPTY = Object.freeze({ type: 'FeatureCollection', features: [] });
const GLOBAL_KEY = '__BP_USGS_SEISMIC_LAYER_V1__';

function finiteNumber(value) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

/**
 * Validate and normalize the official feed without changing source locations,
 * event times, magnitudes, or depths. Only earthquake events at M2.5+ are kept.
 */
export function normalizeUSGSEarthquakeFeed(payload, maxFeatures = SEISMIC_MAX_FEATURES) {
  const input = Array.isArray(payload?.features) ? payload.features : [];
  const features = [];
  const seen = new Set();
  const cap = Math.max(0, Math.min(SEISMIC_MAX_FEATURES, Number(maxFeatures) || 0));

  for (const feature of input) {
    if (features.length >= cap) break;
    if (feature?.geometry?.type !== 'Point') continue;

    const coordinates = feature.geometry.coordinates;
    if (!Array.isArray(coordinates) || coordinates.length < 2) continue;
    const longitude = finiteNumber(coordinates[0]);
    const latitude = finiteNumber(coordinates[1]);
    const depth = coordinates.length > 2 ? finiteNumber(coordinates[2]) : null;
    if (longitude === null || latitude === null ||
        longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) continue;

    const properties = feature.properties || {};
    const type = String(properties.type || 'earthquake').trim().toLowerCase();
    if (type !== 'earthquake') continue;
    const magnitude = finiteNumber(properties.mag);
    const time = finiteNumber(properties.time);
    if (magnitude === null || magnitude < 2.5 || time === null || time <= 0) continue;

    const id = String(feature.id || properties.code || properties.ids || '').trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);

    const safeProperties = {
      ...properties,
      mag: magnitude,
      time,
      place: String(properties.place || properties.title || 'Location not supplied by source'),
      type: 'earthquake'
    };
    if (depth !== null) safeProperties.bp_depth_km = depth;

    features.push({
      type: 'Feature',
      id,
      geometry: {
        type: 'Point',
        coordinates: depth === null ? [longitude, latitude] : [longitude, latitude, depth]
      },
      properties: safeProperties
    });
  }

  const generated = finiteNumber(payload?.metadata?.generated);
  return {
    type: 'FeatureCollection',
    metadata: {
      source: 'USGS ComCat',
      generated: generated !== null && generated > 0 ? generated : null,
      feedCount: finiteNumber(payload?.metadata?.count),
      eventCount: features.length,
      feedTitle: String(payload?.metadata?.title || 'USGS Magnitude 2.5+ Earthquakes, Past Week')
    },
    features
  };
}

function setText(node, value) {
  if (node) node.textContent = String(value ?? '');
}

function formatSourceTime(value) {
  const date = new Date(Number(value));
  if (!Number.isFinite(date.getTime())) return 'source time unavailable';
  try {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch (_) {
    return date.toISOString();
  }
}

function popupContent(feature) {
  const properties = feature?.properties || {};
  const coordinates = feature?.geometry?.coordinates || [];
  const magnitude = finiteNumber(properties.mag);
  const depth = finiteNumber(coordinates[2] ?? properties.bp_depth_km);
  const occurred = finiteNumber(properties.time);
  const root = document.createElement('div');
  root.style.cssText = 'min-width:190px;max-width:260px;color:#101820;font:12px/1.45 system-ui,sans-serif';
  const heading = document.createElement('strong');
  heading.style.cssText = 'display:block;font-size:14px;margin-bottom:5px';
  heading.textContent = 'M ' + (magnitude === null ? '—' : magnitude.toFixed(1)) + ' earthquake';
  root.appendChild(heading);

  const addLine = (label, value) => {
    const line = document.createElement('div');
    line.textContent = label + ': ' + String(value);
    root.appendChild(line);
  };
  addLine('Location', properties.place || 'Not supplied');
  addLine('Depth', depth === null ? 'Not supplied' : depth.toFixed(1) + ' km');
  addLine('Origin time', occurred === null ? 'Not supplied' : new Date(occurred).toLocaleString());
  if (properties.status) addLine('Solution', properties.status);
  if (properties.alert) addLine('USGS alert', properties.alert);
  if (Number(properties.tsunami) === 1) addLine('Tsunami flag', 'USGS feed flag present');

  const url = String(properties.url || '');
  if (url.startsWith('https://earthquake.usgs.gov/earthquakes/eventpage/')) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open USGS event details';
    link.style.cssText = 'display:inline-block;margin-top:7px;color:#075b9a;font-weight:700';
    root.appendChild(link);
  }
  const attribution = document.createElement('small');
  attribution.style.cssText = 'display:block;margin-top:7px;color:#586570';
  attribution.textContent = 'Source: USGS ComCat';
  root.appendChild(attribution);
  return root;
}

function mapLayerSpecs() {
  const color = [
    'interpolate', ['linear'], ['get', 'mag'],
    2.5, '#7de3c4',
    3.5, '#f2df70',
    4.5, '#ffad5c',
    5.5, '#ff6374',
    7.5, '#d86cff'
  ];
  return {
    glow: {
      id: GLOW_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-color': color,
        'circle-radius': [
          'interpolate', ['linear'], ['get', 'mag'],
          2.5, 7, 4.5, 11, 6.5, 16, 8.5, 22
        ],
        'circle-blur': 0.72,
        'circle-opacity': 0.22
      }
    },
    points: {
      id: POINT_LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-color': color,
        'circle-radius': [
          'interpolate', ['linear'], ['get', 'mag'],
          2.5, 2.7, 4.5, 4.6, 6.5, 7.2, 8.5, 10
        ],
        'circle-stroke-color': '#07131d',
        'circle-stroke-width': 1.1,
        'circle-opacity': 0.96
      }
    }
  };
}

function ensureControlMount() {
  let slot = document.getElementById('bpv-seismic-slot');
  if (slot) return slot;

  const anchor = document.getElementById('bpv-underground-slot') ||
    document.getElementById('bpv-satellite-slot');
  if (!anchor?.parentNode) return null;

  slot = document.createElement('div');
  slot.id = 'bpv-seismic-slot';
  slot.className = 'bpv-command-inline-slot';
  slot.setAttribute('aria-label', 'USGS seismic activity layer control');
  anchor.insertAdjacentElement('afterend', slot);
  return slot;
}

function mountControl(state) {
  const slot = ensureControlMount();
  if (!slot) return false;
  if (slot.querySelector('[data-bp-seismic-toggle]')) {
    state.button = slot.querySelector('[data-bp-seismic-toggle]');
    state.labelNode = slot.querySelector('[data-bp-seismic-label]');
    state.statusNode = slot.querySelector('[data-bp-seismic-status]');
    return true;
  }

  const wrapper = document.createElement('div');
  wrapper.style.cssText = 'display:flex;flex-direction:column;gap:4px;width:100%;margin-top:6px';
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bpv-command-btn bp-seismic-toggle';
  button.dataset.bpSeismicToggle = '1';
  button.dataset.bpvAction = 'earthquakes';
  button.dataset.bpLayerToggle = '1';
  button.setAttribute('aria-pressed', 'false');
  button.title = 'Show named earthquakes reported by USGS ComCat during the latest seven days';
  const icon = document.createElement('span');
  icon.className = 'bpv-command-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.textContent = '〰';
  const label = document.createElement('span');
  label.className = 'bpv-command-label';
  label.dataset.bpSeismicLabel = '1';
  label.textContent = 'Named earthquakes · OFF';
  button.append(icon, label);

  const status = document.createElement('small');
  status.dataset.bpSeismicStatus = '1';
  status.style.cssText = 'display:block;padding:0 4px 3px;color:#8da6b3;font:700 8px/1.45 system-ui,sans-serif;letter-spacing:.055em';
  status.textContent = 'M2.5+ · PAST 7 DAYS · SOURCE OFF';
  wrapper.append(button, status);
  slot.appendChild(wrapper);

  button.addEventListener('click', () => {
    void state.setEnabled(!state.enabled);
  });
  state.button = button;
  state.labelNode = label;
  state.statusNode = status;
  state.wrapper = wrapper;
  return true;
}

function syncControl(state) {
  if (!state.button) mountControl(state);
  if (state.button) {
    state.button.setAttribute('aria-pressed', String(!!state.enabled));
    state.button.classList.toggle('active', !!state.enabled);
    if (state.labelNode) {
      setText(state.labelNode, 'Named earthquakes · ' + (state.enabled ? 'ON' : 'OFF'));
    }
    state.button.disabled = !!state.busyToggle;
  }
  if (state.statusNode) setText(state.statusNode, state.statusText);
}

export function initUSGSSeismicLayer(world) {
  const map = world?.map || world;
  if (!map || typeof map.addSource !== 'function' || typeof map.addLayer !== 'function') {
    return null;
  }

  const existing = window[GLOBAL_KEY];
  if (existing?.map === map) return existing;

  const state = {
    version: 1,
    map,
    source: 'USGS_COMCAT_GEOJSON_M2_5_PAST_7_DAYS',
    feedUrl: SEISMIC_FEED_URL,
    minMagnitude: 2.5,
    periodDays: 7,
    refreshIntervalMs: SEISMIC_REFRESH_MS,
    enabled: false,
    status: 'off',
    statusText: 'M2.5+ · PAST 7 DAYS · SOURCE OFF',
    eventCount: 0,
    feedGeneratedAt: null,
    lastSuccessAt: null,
    lastError: null,
    lastGoodGeojson: null,
    inFlight: false,
    busyToggle: false,
    interactionsBound: false,
    errorCount: 0,
    nextRetryAt: 0,
    timer: null,
    retryTimer: null,
    mountObserver: null,
    disposed: false,
    requestSequence: 0,
    activeController: null,
    button: null,
    labelNode: null,
    statusNode: null,
    setEnabled: null,
    refresh: null
  };
  window[GLOBAL_KEY] = state;

  const updateStatus = (status, message) => {
    state.status = status;
    state.statusText = message;
    syncControl(state);
    window[GLOBAL_KEY] = state;
  };

  const setVisibility = visible => {
    for (const id of [GLOW_LAYER_ID, POINT_LAYER_ID]) {
      if (!map.getLayer?.(id)) continue;
      try { map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none'); } catch (_) {}
    }
  };

  const addMapLayers = () => {
    if (!map.getStyle?.()) throw new Error('MAP_STYLE_NOT_READY');

    if (!map.getSource?.(SOURCE_ID)) {
      map.addSource(SOURCE_ID, {
        type: 'geojson',
        data: state.lastGoodGeojson || EMPTY,
        maxzoom: 14,
        buffer: 64,
        tolerance: 0.375
      });
    }
    const specs = mapLayerSpecs();
    if (!map.getLayer?.(GLOW_LAYER_ID)) map.addLayer(specs.glow);
    if (!map.getLayer?.(POINT_LAYER_ID)) map.addLayer(specs.points);
    setVisibility(!!state.enabled);
    // MapLibre validates layer-scoped event listeners immediately. Bind only
    // after the opt-in source/layers have actually been installed.
    if (!state.interactionsBound) {
      map.on?.('click', POINT_LAYER_ID, showPopup);
      map.on?.('mouseenter', POINT_LAYER_ID, onPointerEnter);
      map.on?.('mouseleave', POINT_LAYER_ID, onPointerLeave);
      state.interactionsBound = true;
    }
  };

  const showPopup = event => {
    const feature = event?.features?.[0];
    if (!feature) return;
    const Popup = window.maplibregl?.Popup;
    if (typeof Popup !== 'function') return;
    try {
      new Popup({ closeButton: true, closeOnClick: true, maxWidth: '290px' })
        .setLngLat(event.lngLat)
        .setDOMContent(popupContent(feature))
        .addTo(map);
    } catch (error) {
      console.warn('BridgePoint seismic event popup unavailable', error);
    }
  };
  const onPointerEnter = () => {
    try { map.getCanvas().style.cursor = 'pointer'; } catch (_) {}
  };
  const onPointerLeave = () => {
    try { map.getCanvas().style.cursor = ''; } catch (_) {}
  };
  const onStyleData = () => {
    if (!state.enabled || state.disposed || state.installing) return;
    if (map.getSource?.(SOURCE_ID) && map.getLayer?.(GLOW_LAYER_ID) && map.getLayer?.(POINT_LAYER_ID)) return;
    state.installing = true;
    try {
      addMapLayers();
      if (state.lastGoodGeojson) map.getSource(SOURCE_ID)?.setData(state.lastGoodGeojson);
    } catch (_) {
      // The next style event or timed retry will try again.
    } finally {
      state.installing = false;
    }
  };

  map.on?.('styledata', onStyleData);

  const refresh = async ({ manual = false } = {}) => {
    if (!state.enabled || state.disposed || state.inFlight || document.hidden) return false;
    if (!manual && Date.now() < state.nextRetryAt) return false;
    state.inFlight = true;
    const sequence = ++state.requestSequence;
    const controller = new AbortController();
    state.activeController = controller;
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(SEISMIC_FEED_URL, {
        method: 'GET',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        headers: { Accept: 'application/geo+json, application/json' },
        signal: controller.signal
      });
      if (!response.ok) throw new Error('USGS_HTTP_' + response.status);
      const payload = await response.json();
      const geojson = normalizeUSGSEarthquakeFeed(payload);
      if (!state.enabled || state.disposed || sequence !== state.requestSequence) return false;

      const source = map.getSource?.(SOURCE_ID);
      if (!source?.setData) throw new Error('SEISMIC_MAP_SOURCE_NOT_READY');
      source.setData(geojson);
      state.lastGoodGeojson = geojson;
      state.eventCount = geojson.features.length;
      state.feedGeneratedAt = geojson.metadata.generated;
      state.lastSuccessAt = Date.now();
      state.lastError = null;
      state.errorCount = 0;
      state.nextRetryAt = 0;
      const timeLabel = formatSourceTime(state.feedGeneratedAt || state.lastSuccessAt);
      updateStatus('live', state.eventCount + ' EVENTS · USGS FEED ' + timeLabel);
      return true;
    } catch (error) {
      if (!state.enabled || state.disposed || sequence !== state.requestSequence) return false;
      state.lastError = String(error?.message || error).slice(0, 180);
      state.errorCount += 1;
      const backoff = Math.min(300_000, 30_000 * Math.pow(2, Math.min(4, state.errorCount - 1)));
      state.nextRetryAt = Date.now() + backoff;
      if (state.lastGoodGeojson) {
        updateStatus('stale', 'SOURCE DELAY · KEEPING ' + state.eventCount + ' LAST VALID EVENTS');
      } else {
        updateStatus('unavailable', 'USGS FEED UNAVAILABLE · RETRYING');
      }
      console.warn('BridgePoint USGS seismic feed unavailable', state.lastError);
      return false;
    } finally {
      window.clearTimeout(timeout);
      if (state.activeController === controller) state.activeController = null;
      state.inFlight = false;
    }
  };

  const scheduleStyleRetry = () => {
    if (state.retryTimer || state.disposed || !state.enabled) return;
    state.retryTimer = window.setTimeout(() => {
      state.retryTimer = null;
      if (!state.enabled || state.disposed) return;
      try {
        addMapLayers();
        if (state.lastGoodGeojson) map.getSource(SOURCE_ID)?.setData(state.lastGoodGeojson);
        void refresh({ manual: true });
      } catch (_) {
        scheduleStyleRetry();
      }
    }, 1400);
  };

  const setEnabled = async nextValue => {
    const next = !!nextValue;
    if (state.disposed || state.enabled === next || state.busyToggle) return state.enabled;
    state.busyToggle = true;
    state.enabled = next;
    state.requestSequence += 1;
    syncControl(state);

    if (!next) {
      try { state.activeController?.abort(); } catch (_) {}
      state.activeController = null;
      if (state.timer) window.clearInterval(state.timer);
      if (state.retryTimer) window.clearTimeout(state.retryTimer);
      state.timer = null;
      state.retryTimer = null;
      setVisibility(false);
      updateStatus('off', 'M2.5+ · PAST 7 DAYS · SOURCE OFF');
      state.busyToggle = false;
      syncControl(state);
      return false;
    }

    state.nextRetryAt = 0;
    updateStatus('loading', 'CONNECTING TO USGS COMCAT…');
    try {
      addMapLayers();
      if (state.lastGoodGeojson) map.getSource(SOURCE_ID)?.setData(state.lastGoodGeojson);
      setVisibility(true);
      state.timer = window.setInterval(() => { void refresh(); }, SEISMIC_REFRESH_MS);
      state.busyToggle = false;
      syncControl(state);
      void refresh({ manual: true });
      return true;
    } catch (error) {
      state.busyToggle = false;
      state.status = 'waiting-for-map';
      updateStatus('waiting-for-map', 'WAITING FOR MAP STYLE · WILL RETRY');
      scheduleStyleRetry();
      syncControl(state);
      return false;
    }
  };

  state.setEnabled = setEnabled;
  state.refresh = refresh;
  state.mountPending = !mountControl(state);
  if (state.mountPending && typeof MutationObserver === 'function') {
    state.mountObserver = new MutationObserver(() => {
      if (mountControl(state)) {
        state.mountObserver?.disconnect();
        state.mountObserver = null;
        state.mountPending = false;
        syncControl(state);
      }
    });
    try {
      state.mountObserver.observe(document.body, { childList: true, subtree: true });
      window.setTimeout(() => {
        state.mountObserver?.disconnect();
        state.mountObserver = null;
        state.mountPending = false;
      }, 20_000);
    } catch (_) {}
  }

  const onVisibilityChange = () => {
    if (!document.hidden && state.enabled) void refresh({ manual: true });
  };
  document.addEventListener('visibilitychange', onVisibilityChange, { passive: true });

  map.on?.('remove', () => {
    state.disposed = true;
    state.enabled = false;
    state.requestSequence += 1;
    if (state.timer) window.clearInterval(state.timer);
    if (state.retryTimer) window.clearTimeout(state.retryTimer);
    try { state.activeController?.abort(); } catch (_) {}
    state.mountObserver?.disconnect();
    document.removeEventListener('visibilitychange', onVisibilityChange);
    if (state.interactionsBound) {
      map.off?.('click', POINT_LAYER_ID, showPopup);
      map.off?.('mouseenter', POINT_LAYER_ID, onPointerEnter);
      map.off?.('mouseleave', POINT_LAYER_ID, onPointerLeave);
      state.interactionsBound = false;
    }
    map.off?.('styledata', onStyleData);
    if (window[GLOBAL_KEY] === state) window[GLOBAL_KEY] = null;
  });

  updateStatus('off', 'M2.5+ · PAST 7 DAYS · SOURCE OFF');
  return state;
}
