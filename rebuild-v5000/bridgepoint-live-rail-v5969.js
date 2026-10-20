/* BridgePoint Live Rail Pilot v5969
 * First source-backed rail/transit pilot: MBTA V3 API.
 * No vehicle locations are invented. Position markers are only shown when the source
 * provides valid coordinates and a timestamp no older than three minutes.
 */
(() => {
  'use strict';
  if (window.__BP_LIVE_RAIL_V5969__) return;

  const VERSION = 5969;
  const API_URL = 'https://api-v3.mbta.com/vehicles';
  const ATTRIBUTION = 'MassDOT / MBTA V3 API';
  const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
  const MAX_VEHICLES = 200;
  const REQUEST_TIMEOUT_MS = 12000;
  const REFRESH_INTERVAL_MS = 60000;
  const FRESHNESS_LIMIT_MS = 180000;
  const EMPTY = { type: 'FeatureCollection', features: [] };
  const SOURCE_ID = 'bp-live-rail-source-v5969';
  const GLOW_ID = 'bp-live-rail-glow-v5969';
  const POINT_ID = 'bp-live-rail-points-v5969';
  const HIT_ID = 'bp-live-rail-hit-v5969';
  const LABEL_ID = 'bp-live-rail-labels-v5969';

  const MAPS = new Set();
  const MAP_STATE = new WeakMap();
  let popup = null;
  let globalObserver = null;

  const $ = id => document.getElementById(id);
  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = String(text);
    return node;
  };
  const safeText = (value, max = 180) => String(value ?? '').replace(/[<>]/g, '').slice(0, max);
  const fmt = value => Number(value || 0).toLocaleString();
  const timeText = value => {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isFinite(date.getTime()) ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : 'time unavailable';
  };

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

  function routeColor(raw, routeId) {
    const c = String(raw || '').replace(/^#/, '').toUpperCase();
    if (/^[0-9A-F]{6}$/.test(c)) return '#' + c;
    const fallback = {
      Red: '#DA291C', Orange: '#ED8B00', Blue: '#003DA5',
      'Green-B': '#00843D', 'Green-C': '#00843D', 'Green-D': '#00843D',
      'Green-E': '#00843D', Mattapan: '#DA291C', 'Silver Line': '#7C878E'
    };
    return fallback[String(routeId)] || '#35D7F5';
  }

  function buildEndpoint() {
    const url = new URL(API_URL);
    const fields = {
      'filter[route_type]': '0,1,2',
      'page[limit]': String(MAX_VEHICLES),
      include: 'route,trip',
      'fields[vehicle]': 'label,latitude,longitude,bearing,speed,current_status,updated_at',
      'fields[route]': 'long_name,short_name,color,type',
      'fields[trip]': 'headsign,direction_id'
    };
    Object.entries(fields).forEach(([key, value]) => url.searchParams.set(key, value));
    return url.toString();
  }
  const ENDPOINT = buildEndpoint();

  function parseSnapshot(payload, fetchedAt = Date.now()) {
    if (!payload || !Array.isArray(payload.data) || !Array.isArray(payload.included || [])) {
      throw new Error('MBTA response does not match the expected JSON:API vehicle format.');
    }
    if (payload.data.length > MAX_VEHICLES) {
      throw new Error('MBTA returned more vehicles than the configured limit.');
    }

    const included = new Map();
    for (const item of payload.included || []) {
      if (item && item.type && item.id) included.set(item.type + ':' + item.id, item);
    }

    const features = [];
    let newestReportMs = 0;
    let ignoredStale = 0;

    for (const vehicle of payload.data) {
      const a = vehicle && vehicle.attributes || {};
      const longitude = a.longitude, latitude = a.latitude;
      const reportedMs = Date.parse(a.updated_at || '');
      // Do not coerce null/empty/missing coordinates into 0,0.
      if (typeof longitude !== 'number' || typeof latitude !== 'number' ||
          !Number.isFinite(longitude) || !Number.isFinite(latitude) ||
          longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90 ||
          !Number.isFinite(reportedMs)) continue;
      const ageMs = fetchedAt - reportedMs;
      if (ageMs < -120000 || ageMs > FRESHNESS_LIMIT_MS) {
        ignoredStale++;
        continue;
      }

      const routeId = vehicle.relationships?.route?.data?.id || '';
      const tripId = vehicle.relationships?.trip?.data?.id || '';
      const route = included.get('route:' + routeId);
      const trip = included.get('trip:' + tripId);
      const ra = route?.attributes || {};
      const ta = trip?.attributes || {};
      const label = safeText(a.label || vehicle.id || 'Rail vehicle', 48);
      const routeName = safeText(ra.long_name || ra.short_name || routeId || 'MBTA rail', 100);
      const headsign = safeText(ta.headsign || '', 100);
      const bearing = typeof a.bearing === 'number' && Number.isFinite(a.bearing) ? a.bearing : null;
      const speed = typeof a.speed === 'number' && Number.isFinite(a.speed) && a.speed >= 0 ? a.speed : null;

      newestReportMs = Math.max(newestReportMs, reportedMs);
      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [longitude, latitude] },
        properties: {
          vehicleId: safeText(vehicle.id || '', 64),
          label,
          routeId: safeText(routeId, 50),
          routeName,
          routeShortName: safeText(ra.short_name || routeId || 'Rail', 40),
          headsign,
          routeColor: routeColor(ra.color, routeId),
          routeType: Number(ra.type),
          carCount: Number.isInteger(Number(a.car_count || a.cars || vehicle.attributes?.car_count)) && Number(a.car_count || a.cars || vehicle.attributes?.car_count) > 0
            ? Math.min(12, Number(a.car_count || a.cars || vehicle.attributes?.car_count)) : null,
          bearing: Number.isFinite(bearing) ? bearing : null,
          speedMps: Number.isFinite(speed) && speed >= 0 ? speed : null,
          currentStatus: safeText(a.current_status || 'STATUS UNAVAILABLE', 40),
          updatedAt: new Date(reportedMs).toISOString(),
          ageSeconds: Math.max(0, Math.floor(ageMs / 1000)),
          source: 'MBTA_V3_API'
        }
      });
    }

    return {
      type: 'FeatureCollection',
      features,
      fetchedAt,
      newestReportMs,
      ignoredStale,
      sourceCount: payload.data.length
    };
  }

  function css() {
    if ($('bp-live-rail-style-v5969')) return;
    const style = el('style');
    style.id = 'bp-live-rail-style-v5969';
    style.textContent = [
      '.bp-live-rail-panel-v5969{position:absolute;z-index:41;top:max(76px,calc(env(safe-area-inset-top) + 72px));right:10px;width:min(360px,calc(100% - 20px));max-height:min(58dvh,480px);overflow:auto;box-sizing:border-box;padding:12px;border:1px solid rgba(104,225,255,.36);border-radius:13px;background:linear-gradient(150deg,rgba(5,19,28,.98),rgba(3,10,17,.98));box-shadow:0 15px 42px rgba(0,0,0,.4);color:#e7f8ff;font:12px/1.45 system-ui,sans-serif}',
      '.bp-live-rail-panel-v5969[hidden]{display:none!important}',
      '.bp-live-rail-panel-v5969 *{box-sizing:border-box}',
      '.bp-live-rail-panel-v5969 .bp-lr-head{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}',
      '.bp-live-rail-panel-v5969 .bp-lr-kicker{font-size:9px;letter-spacing:.14em;color:#7ce9ff;font-weight:950}',
      '.bp-live-rail-panel-v5969 .bp-lr-title{font-size:14px;font-weight:950;color:#fff;margin-top:2px}',
      '.bp-live-rail-panel-v5969 .bp-lr-sub,.bp-live-rail-panel-v5969 .bp-lr-note{font-size:10px;color:#9fbac8;margin-top:6px}',
      '.bp-live-rail-panel-v5969 .bp-lr-close,.bp-live-rail-panel-v5969 .bp-lr-refresh{border:1px solid rgba(130,200,218,.35);background:#102630;color:#e7faff;border-radius:8px;padding:5px 9px;min-height:30px;cursor:pointer;font:750 10px system-ui,sans-serif}',
      '.bp-live-rail-panel-v5969 .bp-lr-enable{display:flex;align-items:flex-start;gap:8px;padding:10px 2px;margin-top:7px;border-top:1px solid rgba(147,207,225,.16);cursor:pointer}',
      '.bp-live-rail-panel-v5969 .bp-lr-enable input{accent-color:#63e9ff;margin:3px 0 0}',
      '.bp-live-rail-panel-v5969 .bp-lr-status{font-size:10px;color:#8feaff;min-height:16px;margin:8px 0;overflow-wrap:anywhere}',
      '.bp-live-rail-panel-v5969 .bp-lr-status[data-error=true]{color:#ffb5a5}',
      '.bp-live-rail-panel-v5969 .bp-lr-stat{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:9px 0}',
      '.bp-live-rail-panel-v5969 .bp-lr-card{padding:8px;border:1px solid rgba(147,207,225,.16);border-radius:8px;background:rgba(255,255,255,.025)}',
      '.bp-live-rail-panel-v5969 .bp-lr-card strong{display:block;font-size:16px;color:#fff}',
      '.bp-live-rail-panel-v5969 .bp-lr-card small{display:block;font-size:10px;color:#a8c5d1;margin-top:3px}',
      '.bp-live-rail-panel-v5969 .bp-lr-attr{color:#8ceaff;font-size:10px;text-decoration:underline}',
      '.bp-live-rail-toggle-v5969{border:1px solid rgba(104,225,255,.42)!important;background:#0c2632!important;color:#e7faff!important;font-weight:850!important}',
      '@media(max-width:520px){.bp-live-rail-panel-v5969{right:8px;width:calc(100% - 16px);max-height:48dvh;padding:10px}.bp-live-rail-panel-v5969 .bp-lr-title{font-size:13px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function setStatus(state, message, isError = false) {
    state.status = safeText(message, 350);
    state.error = isError ? state.status : null;
    const node = state.statusNode;
    if (node) {
      node.textContent = state.status;
      node.dataset.error = isError ? 'true' : 'false';
    }
  }

  function addLayer(map, layer) {
    try {
      if (!map.getLayer(layer.id)) map.addLayer(layer);
    } catch (error) {
      console.warn('BridgePoint live rail layer ' + layer.id, error);
    }
  }

  function ensureLayers(map, state) {
    let ready = false;
    try {
      // BridgePoint's live style can report not-fully-loaded while its authoritative
      // OpenFreeMap source is already installed. Use the same source-backed readiness
      // gate as the existing V2300 renderer, with a guarded style-layer fallback.
      ready = map.isStyleLoaded?.() === true || !!map.getSource?.('ofm');
      if (!ready) {
        const style = map.getStyle?.();
        ready = Array.isArray(style?.layers) && style.layers.length > 0;
      }
    } catch (_) {}
    if (!ready) return false;

    try {
      if (!map.getSource(SOURCE_ID)) map.addSource(SOURCE_ID, { type: 'geojson', data: EMPTY });
      addLayer(map, {
        id: GLOW_ID, type: 'circle', source: SOURCE_ID, minzoom: 4.5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4.5, 4.5, 8, 6.5, 12, 8, 17, 10],
          'circle-color': ['coalesce', ['get', 'routeColor'], '#35D7F5'],
          'circle-opacity': 0.24, 'circle-blur': 0.6
        }
      });
      addLayer(map, {
        id: POINT_ID, type: 'circle', source: SOURCE_ID, minzoom: 4.5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4.5, 2.6, 8, 3.6, 12, 4.7, 17, 5.8],
          'circle-color': ['coalesce', ['get', 'routeColor'], '#35D7F5'],
          'circle-opacity': 0.98, 'circle-stroke-color': '#F4FDFF', 'circle-stroke-width': 1.1,
          'circle-pitch-alignment': 'map'
        }
      });
      addLayer(map, {
        id: HIT_ID, type: 'circle', source: SOURCE_ID, minzoom: 4.5,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 4.5, 9, 8, 12, 12, 15, 17, 18],
          'circle-color': '#ffffff',
          'circle-opacity': 0.001,
          'circle-stroke-opacity': 0,
          'circle-pitch-alignment': 'map'
        }
      });
      addLayer(map, {
        id: LABEL_ID, type: 'symbol', source: SOURCE_ID, minzoom: 12,
        layout: {
          'text-field': ['coalesce', ['get', 'routeShortName'], ['get', 'routeName']],
          'text-size': ['interpolate', ['linear'], ['zoom'], 12, 9, 16, 11],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Regular'],
          'text-offset': [0.8, 0], 'text-anchor': 'left', 'text-allow-overlap': false,
          'text-ignore-placement': false
        },
        paint: { 'text-color': '#F4FDFF', 'text-halo-color': '#08141C', 'text-halo-width': 1.2 }
      });
      const normalVisible = state.enabled && !state.meshMode;
      const hitVisible = state.enabled && !!state.meshMode;
      for (const id of [GLOW_ID, POINT_ID, LABEL_ID]) {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', normalVisible ? 'visible' : 'none');
      }
      if (map.getLayer(HIT_ID)) map.setLayoutProperty(HIT_ID, 'visibility', hitVisible ? 'visible' : 'none');
      if (!state.layerInteractionsBound) {
        map.on('click', POINT_ID, event => showPopup(map, event));
        map.on('click', HIT_ID, event => showPopup(map, event));
        map.on('mouseenter', POINT_ID, () => { try { map.getCanvas().style.cursor = 'pointer'; } catch (_) {} });
        map.on('mouseleave', POINT_ID, () => { try { map.getCanvas().style.cursor = ''; } catch (_) {} });
        state.layerInteractionsBound = true;
      }
      state.layersReady = true;
      return true;
    } catch (error) {
      console.warn('BridgePoint live rail layer install', error);
      return false;
    }
  }

  function showPopup(map, event) {
    const feature = event?.features?.[0];
    if (!feature || !window.maplibregl?.Popup) return;
    try { popup?.remove?.(); } catch (_) {}
    const p = feature.properties || {};
    const content = el('div');
    Object.assign(content.style, { minWidth: '180px', maxWidth: '260px', color: '#081720', font: '12px/1.4 system-ui,sans-serif' });
    const title = el('b', '', p.routeName || 'MBTA rail');
    Object.assign(title.style, { display: 'block', fontSize: '13px' });
    const vehicle = el('div', '', 'Vehicle ' + (p.label || 'label unavailable'));
    const destination = el('div', '', p.headsign ? 'Destination: ' + p.headsign : 'Destination unavailable in source');
    const report = el('div', '', 'Reported: ' + timeText(p.updatedAt));
    const status = el('div', '', 'Status: ' + (p.currentStatus || 'unavailable'));
    const sourceSpeed = typeof p.speedMph === 'number' && Number.isFinite(p.speedMph)
      ? p.speedMph.toFixed(1) + ' mph' : 'not reported / not inferable yet';
    const speed = el('div', '', 'Speed: ' + sourceSpeed + (p.speedSource ? ' · ' + String(p.speedSource).replace(/_/g, ' ').toLowerCase() : ''));
    const facing = typeof p.effectiveBearingDegrees === 'number' && Number.isFinite(p.effectiveBearingDegrees)
      ? Math.round(p.effectiveBearingDegrees) + '° from north'
      : 'direction unavailable';
    const heading = el('div', '', 'Heading: ' + facing);
    const freshness = el('div', '', 'Source age: ' + fmt(p.ageSeconds) + ' seconds');
    [vehicle, destination, report, status, speed, heading, freshness].forEach(node => {
      Object.assign(node.style, { display: 'block', marginTop: '4px', fontSize: '10px' });
    });
    content.append(title, vehicle, destination, report, status, speed, heading, freshness);

    const actions = el('div');
    Object.assign(actions.style, { display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '10px' });
    const followButton = el('button', '', 'FOLLOW THIS TRAIN');
    followButton.type = 'button';
    Object.assign(followButton.style, {
      border: '1px solid #8ad8e8', borderRadius: '7px', padding: '6px 9px',
      background: '#123543', color: '#ecfbff', font: '800 10px system-ui,sans-serif', cursor: 'pointer'
    });
    followButton.addEventListener('click', () => {
      const state = MAP_STATE.get(map);
      if (!state || !p.vehicleId) return;
      if (state.followVehicleId === p.vehicleId) {
        state.followVehicleId = null;
        followButton.textContent = 'FOLLOW THIS TRAIN';
        setStatus(state, 'Train follow stopped.');
        return;
      }
      state.followVehicleId = p.vehicleId;
      followButton.textContent = 'STOP FOLLOWING';
      followButton.style.background = '#174b39';
      const coords = feature.geometry?.coordinates || event.lngLat.toArray();
      map.easeTo({
        center: coords,
        zoom: Math.max(Number(map.getZoom()) || 0, 14),
        pitch: Math.max(Number(map.getPitch()) || 0, 48),
        bearing: typeof p.effectiveBearingDegrees === 'number' ? p.effectiveBearingDegrees : map.getBearing(),
        duration: 900,
        essential: true
      });
      setStatus(state, 'Following ' + (p.routeName || 'rail') + ' vehicle ' + p.label + ' · camera updates when the source reports a new position.');
    });
    actions.appendChild(followButton);
    content.appendChild(actions);
    try {
      popup = new window.maplibregl.Popup({ closeButton: true, closeOnClick: true, maxWidth: '290px' })
        .setLngLat(event.lngLat)
        .setDOMContent(content)
        .addTo(map);
    } catch (error) {
      console.warn('BridgePoint live rail popup', error);
    }
  }

  function buildUI(map, state) {
    css();
    const container = map.getContainer();
    if (!container) return false;
    const safeId = (container.id || 'map').replace(/[^a-zA-Z0-9_-]/g, '-');
    const buttonId = 'bp-live-rail-toggle-v5969-' + safeId;
    const panelId = 'bp-live-rail-panel-v5969-' + safeId;
    let button = $(buttonId);
    if (!button) {
      button = el('button', 'bp-live-rail-toggle-v5969', 'LIVE RAIL');
      button.id = buttonId;
      button.type = 'button';
      button.title = 'Show source-backed MBTA rail vehicle positions';
      const tools = document.querySelector('.map-tools');
      if (container.id === 'liveMap' && tools) tools.appendChild(button);
      else {
        Object.assign(button.style, {
          position: 'absolute', zIndex: '42', right: '12px',
          top: 'max(112px,calc(env(safe-area-inset-top) + 108px))',
          minHeight: '34px', borderRadius: '8px', padding: '7px 9px',
          cursor: 'pointer', font: '800 10px system-ui,sans-serif'
        });
        container.appendChild(button);
      }
      button.addEventListener('click', () => {
        const panel = $(panelId);
        if (!panel) return;
        panel.hidden = !panel.hidden;
        if (!panel.hidden) setStatus(state, state.enabled ? 'Live rail layer is enabled.' : 'Live rail is off; enable it to request positions.');
      });
    }

    let panel = $(panelId);
    if (!panel) {
      panel = el('section', 'bp-live-rail-panel-v5969');
      panel.id = panelId;
      panel.hidden = true;
      const head = el('div', 'bp-lr-head');
      const titleWrap = el('div');
      titleWrap.append(el('div', 'bp-lr-kicker', 'BRIDGEPOINT · LIVE TRANSIT'), el('div', 'bp-lr-title', 'Boston-area rail positions'));
      const close = el('button', 'bp-lr-close', '×');
      close.type = 'button';
      close.setAttribute('aria-label', 'Close live rail panel');
      close.addEventListener('click', () => { panel.hidden = true; });
      head.append(titleWrap, close);

      const sub = el('p', 'bp-lr-sub', 'Source-reported MBTA subway, light-rail and rail vehicles. Positions are shown only when their timestamp is within three minutes.');
      const enableLabel = el('label', 'bp-lr-enable');
      const checkbox = el('input');
      checkbox.type = 'checkbox';
      checkbox.checked = state.enabled;
      checkbox.addEventListener('change', () => { void setEnabled(map, state, checkbox.checked); });
      const enableText = el('span');
      enableText.append(el('b', '', 'Show live MBTA rail vehicles'), el('small', 'bp-lr-sub', 'Requests start only when enabled; one refresh per minute while this panel is enabled and the page is visible.'));
      enableLabel.append(checkbox, enableText);

      const stats = el('div', 'bp-lr-stat');
      const currentCard = el('div', 'bp-lr-card');
      currentCard.append(el('strong', '', '—'), el('small', '', 'Fresh positions'));
      currentCard.dataset.metric = 'count';
      const updateCard = el('div', 'bp-lr-card');
      updateCard.append(el('strong', '', '—'), el('small', '', 'Newest source report'));
      updateCard.dataset.metric = 'updated';
      stats.append(currentCard, updateCard);

      const status = el('div', 'bp-lr-status', 'Live rail is off; no external request has been made.');
      status.setAttribute('role', 'status');
      const refresh = el('button', 'bp-lr-refresh', 'Refresh now');
      refresh.type = 'button';
      refresh.disabled = true;
      refresh.addEventListener('click', () => { void fetchVehicles(map, state, true); });
      const refreshWrap = el('div');
      refreshWrap.style.display = 'flex';
      refreshWrap.style.justifyContent = 'flex-end';
      refreshWrap.style.flexWrap = 'wrap';
      refreshWrap.style.gap = '6px';
      const focus = el('button', 'bp-lr-refresh', 'Focus MBTA Coverage');
      focus.type = 'button';
      focus.title = 'Move the map to the MBTA rail network in Boston';
      focus.addEventListener('click', () => {
        try {
          map.easeTo({ center: [-71.0589, 42.3601], zoom: Math.max(Math.min(Number(map.getZoom()) || 0, 14), 12.2), pitch: Math.max(Number(map.getPitch()) || 0, 32), duration: 850, essential: true });
          setStatus(state, state.enabled ? 'Focusing on the MBTA network · source updates remain enabled.' : 'Focused on Boston · enable live rail to request MBTA positions.');
        } catch (_) {
          setStatus(state, 'Could not move the map to the MBTA coverage area.', true);
        }
      });
      refreshWrap.append(focus, refresh);

      const note = el('p', 'bp-lr-note', 'Coverage is limited to the MBTA network. Positions are not universal U.S. or global train coverage, and a reported position can be delayed. A blank feed is never replaced by a simulated vehicle.');
      const attribution = document.createElement('a');
      attribution.className = 'bp-lr-attr';
      attribution.href = 'https://api-v3.mbta.com/';
      attribution.target = '_blank';
      attribution.rel = 'noopener noreferrer';
      attribution.textContent = 'Data: MassDOT / MBTA V3 API ↗';

      panel.append(head, sub, enableLabel, stats, status, refreshWrap, note, attribution);
      container.appendChild(panel);
      state.checkbox = checkbox;
      state.currentCard = currentCard;
      state.updateCard = updateCard;
      state.statusNode = status;
      state.refreshButton = refresh;
    } else {
      state.panel = panel;
      state.checkbox = panel.querySelector('input[type=checkbox]');
      state.statusNode = panel.querySelector('.bp-lr-status');
      state.refreshButton = panel.querySelector('.bp-lr-refresh');
      state.currentCard = panel.querySelector('[data-metric=count]');
      state.updateCard = panel.querySelector('[data-metric=updated]');
    }
    state.button = button;
    state.panel = panel;
    return true;
  }

  function renderState(state, snapshot = state.snapshot) {
    if (!state.currentCard || !state.updateCard) return;
    const count = state.currentCard.querySelector('strong');
    const updated = state.updateCard.querySelector('strong');
    if (count) count.textContent = fmt(snapshot?.features?.length ?? 0);
    if (updated) updated.textContent = snapshot?.newestReportMs ? timeText(snapshot.newestReportMs) : '—';
    if (state.checkbox) state.checkbox.checked = state.enabled;
    if (state.refreshButton) state.refreshButton.disabled = !state.enabled || state.loading;
    const button = state.button;
    if (button) {
      button.textContent = state.enabled ? 'LIVE RAIL ✓' : 'LIVE RAIL';
      button.setAttribute('aria-pressed', String(state.enabled));
    }
  }

  function setVisibility(map, enabled) {
    const state = MAP_STATE.get(map);
    const normalVisible = !!enabled && !state?.meshMode;
    const hitVisible = !!enabled && !!state?.meshMode;
    for (const id of [GLOW_ID, POINT_ID, LABEL_ID]) {
      try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', normalVisible ? 'visible' : 'none'); } catch (_) {}
    }
    try { if (map.getLayer(HIT_ID)) map.setLayoutProperty(HIT_ID, 'visibility', hitVisible ? 'visible' : 'none'); } catch (_) {}
  }

  function scheduleNext(map, state) {
    clearTimeout(state.timer);
    if (!state.enabled) return;
    state.timer = setTimeout(() => {
      if (!state.enabled) return;
      if (document.visibilityState === 'hidden') {
        scheduleNext(map, state);
        return;
      }
      void fetchVehicles(map, state, false);
    }, REFRESH_INTERVAL_MS);
  }

  function pruneExpiredFeatures(map, state) {
    const now = Date.now();
    const prior = state.snapshot?.features || [];
    const features = prior.filter(feature => {
      const timestamp = Date.parse(feature?.properties?.updatedAt || '');
      return Number.isFinite(timestamp) && timestamp <= now + 120000 && now - timestamp <= FRESHNESS_LIMIT_MS;
    });
    if (features.length !== prior.length) {
      const newestReportMs = features.reduce((latest, feature) => Math.max(latest, Date.parse(feature.properties.updatedAt)), 0);
      state.snapshot = { ...(state.snapshot || {}), features, newestReportMs };
      try { map.getSource(SOURCE_ID)?.setData({ type: 'FeatureCollection', features }); } catch (_) {}
      renderState(state, state.snapshot);
    }
    return features.length;
  }

  function scheduleStyleRetry(map, state) {
    if (!state.enabled || state.loading) return;
    if (state.readinessRetries >= 30) {
      setStatus(state, 'The map style is still initializing. The layer will retry on the next style event; use Focus MBTA Coverage or toggle LIVE RAIL off and on later.', true);
      return;
    }
    clearTimeout(state.readinessTimer);
    state.readinessRetries++;
    state.readinessTimer = setTimeout(() => {
      state.readinessTimer = null;
      if (!state.enabled || state.loading) return;
      if (ensureLayers(map, state)) {
        state.readinessRetries = 0;
        setVisibility(map, true);
        setStatus(state, 'Map style ready · requesting source-backed MBTA rail positions…');
        void fetchVehicles(map, state, false);
      } else {
        scheduleStyleRetry(map, state);
      }
    }, 800);
  }

  async function fetchVehicles(map, state, forced) {
    if (!state.enabled || state.loading) return;
    if (!ensureLayers(map, state)) {
      setStatus(state, 'Map style is not ready; retrying layer setup without requesting the feed yet.');
      scheduleStyleRetry(map, state);
      return;
    }
    clearTimeout(state.readinessTimer);
    state.readinessTimer = null;
    state.readinessRetries = 0;
    state.loading = true;
    renderState(state);
    setStatus(state, 'Requesting the MBTA source feed…');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(ENDPOINT, {
        method: 'GET',
        headers: { Accept: 'application/vnd.api+json, application/json' },
        cache: 'no-store',
        credentials: 'omit',
        signal: controller.signal
      });
      if (!response.ok) throw new Error('MBTA API HTTP ' + response.status);
      const contentLength = Number(response.headers.get('content-length') || 0);
      if (contentLength > MAX_RESPONSE_BYTES) throw new Error('MBTA response exceeded the 2 MiB safety limit.');
      const raw = await response.text();
      if (raw.length > MAX_RESPONSE_BYTES) throw new Error('MBTA response exceeded the 2 MiB safety limit.');
      let payload;
      try { payload = JSON.parse(raw); } catch (_) { throw new Error('MBTA response was not valid JSON.'); }
      const snapshot = parseSnapshot(payload, Date.now());
      enrichVehicleMotion(snapshot, state);
      state.snapshot = snapshot;
      state.lastSuccessAt = Date.now();
      state.lastSourceReportMs = snapshot.newestReportMs || null;
      state.consecutiveFailures = 0;
      state.lastNetworkFailureAt = null;
      clearTimeout(state.retryTimer);
      state.retryTimer = null;
      try { map.getSource(SOURCE_ID)?.setData({ type: 'FeatureCollection', features: snapshot.features }); } catch (_) {}
      if (!snapshot.features.length) {
        const extra = snapshot.ignoredStale ? ' ' + fmt(snapshot.ignoredStale) + ' stale reports were dropped.' : '';
        setStatus(state, 'MBTA responded, but no fresh rail positions were usable at this moment.' + extra);
      } else {
        const age = snapshot.newestReportMs ? Math.max(0, Math.floor((Date.now() - snapshot.newestReportMs) / 1000)) : null;
        setStatus(state, 'SOURCE LIVE · ' + fmt(snapshot.features.length) + ' rail vehicle positions within the 3-minute freshness limit · newest source report ' + (age == null ? 'time unavailable' : age + ' sec old') + '. ' + (forced ? 'Manual refresh complete.' : 'Automatic refresh enabled.'));
      }
      renderState(state, snapshot);
      followLatestPosition(map, state);
    } catch (error) {
      const stillFresh = pruneExpiredFeatures(map, state);
      const reason = error?.name === 'AbortError' ? 'request timed out after 12 seconds' : safeText(error?.message || error, 150);
      state.consecutiveFailures = (state.consecutiveFailures || 0) + 1;
      state.lastNetworkFailureAt = Date.now();
      const last = state.lastSuccessAt ? ' Last successful request: ' + timeText(state.lastSuccessAt) + '; ' + fmt(stillFresh) + ' prior position(s) remain within the 3-minute freshness limit.' : ' No previous source positions are available.';
      if (state.enabled && state.consecutiveFailures <= 2 && !state.retryTimer) {
        const delay = state.consecutiveFailures === 1 ? 4000 : 10000;
        setStatus(state, 'MBTA feed temporarily unavailable: ' + reason + '. Retrying once in ' + Math.round(delay / 1000) + ' seconds.' + last, true);
        state.retryTimer = setTimeout(() => {
          state.retryTimer = null;
          if (state.enabled && document.visibilityState !== 'hidden') void fetchVehicles(map, state, false);
          else if (state.enabled) scheduleNext(map, state);
        }, delay);
      } else {
        setStatus(state, 'MBTA feed unavailable: ' + reason + '. Automatic polling will retry in up to 60 seconds.' + last, true);
      }
      console.warn('BridgePoint MBTA live rail feed', error);
    } finally {
      clearTimeout(timeout);
      state.loading = false;
      renderState(state);
      scheduleNext(map, state);
    }
  }

  function haversineMeters(a, b) {
    const rad = n => n * Math.PI / 180;
    const lat1 = rad(a[1]), lat2 = rad(b[1]);
    const dLat = lat2 - lat1, dLon = rad(b[0] - a[0]);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
    return 6371008.8 * 2 * Math.atan2(Math.sqrt(Math.max(0, h)), Math.sqrt(Math.max(0, 1 - h)));
  }

  function bearingBetween(a, b) {
    const rad = n => n * Math.PI / 180;
    return (Math.atan2(
      Math.sin(rad(b[0] - a[0])) * Math.cos(rad(b[1])),
      Math.cos(rad(a[1])) * Math.sin(rad(b[1])) -
        Math.sin(rad(a[1])) * Math.cos(rad(b[1])) * Math.cos(rad(b[0] - a[0]))
    ) * 180 / Math.PI + 360) % 360;
  }

  function enrichVehicleMotion(snapshot, state) {
    if (!state.motionHistory) state.motionHistory = new Map();
    const history = state.motionHistory;
    for (const feature of snapshot.features || []) {
      const p = feature.properties || {};
      const id = String(p.vehicleId || '');
      const coords = feature.geometry?.coordinates;
      const reportedAt = Date.parse(p.updatedAt || '');
      if (!id || !Array.isArray(coords) || coords.length < 2 ||
          !coords.every(Number.isFinite) || !Number.isFinite(reportedAt)) continue;
      const prior = history.get(id);
      let inferredSpeedMps = null, inferredBearing = null;
      if (prior && reportedAt > prior.reportedAt && Array.isArray(prior.coordinates)) {
        const seconds = (reportedAt - prior.reportedAt) / 1000;
        const distance = haversineMeters(prior.coordinates, coords);
        const speed = seconds > 0 ? distance / seconds : NaN;
        if (seconds >= 1 && seconds <= 600 && Number.isFinite(speed) && speed <= 70) {
          inferredSpeedMps = speed;
          if (distance >= 1.5) inferredBearing = bearingBetween(prior.coordinates, coords);
        }
      }
      const sourceSpeed = typeof p.speedMps === 'number' && Number.isFinite(p.speedMps) && p.speedMps >= 0
        ? p.speedMps : null;
      const previousDisplaySpeed = prior?.displaySpeedMps ?? null;
      const selectedSpeed = sourceSpeed !== null ? sourceSpeed
        : inferredSpeedMps !== null ? inferredSpeedMps
        : reportedAt === prior?.reportedAt ? previousDisplaySpeed : null;
      const sourceBearing = typeof p.bearing === 'number' && Number.isFinite(p.bearing) ? p.bearing : null;
      const effectiveBearing = sourceBearing !== null ? sourceBearing
        : inferredBearing !== null ? inferredBearing
        : (reportedAt === prior?.reportedAt ? (prior?.effectiveBearing ?? null) : null);

      p.speedMps = selectedSpeed;
      p.speedMph = selectedSpeed === null ? null : selectedSpeed * 2.2369362921;
      p.speedSource = sourceSpeed !== null ? 'MBTA_REPORTED'
        : inferredSpeedMps !== null ? 'OBSERVED_BETWEEN_SOURCE_REPORTS'
        : (reportedAt === prior?.reportedAt && previousDisplaySpeed !== null)
          ? 'RECENT_OBSERVATION' : 'UNAVAILABLE';
      p.effectiveBearingDegrees = effectiveBearing;
      p.bearingSource = sourceBearing !== null ? 'MBTA_REPORTED'
        : inferredBearing !== null ? 'OBSERVED_BETWEEN_SOURCE_REPORTS'
        : (reportedAt === prior?.reportedAt && effectiveBearing !== null)
          ? 'RECENT_OBSERVATION' : 'UNAVAILABLE';

      const next = reportedAt > (prior?.reportedAt ?? -Infinity)
        ? { coordinates: [coords[0], coords[1]], reportedAt, displaySpeedMps: selectedSpeed, effectiveBearing }
        : prior || { coordinates: [coords[0], coords[1]], reportedAt, displaySpeedMps: selectedSpeed, effectiveBearing };
      if (prior && reportedAt === prior.reportedAt) {
        next.displaySpeedMps = selectedSpeed;
        next.effectiveBearing = effectiveBearing;
      }
      history.set(id, next);
    }
    if (history.size > 800) {
      const oldest = [...history.entries()].sort((a, b) => a[1].reportedAt - b[1].reportedAt).slice(0, history.size - 500);
      for (const [id] of oldest) history.delete(id);
    }
  }

  function followLatestPosition(map, state) {
    if (!state?.followVehicleId || !state.snapshot?.features) return;
    const feature = state.snapshot.features.find(item => item.properties?.vehicleId === state.followVehicleId);
    if (!feature) {
      setStatus(state, 'Following vehicle is temporarily absent from the latest feed; camera lock is retained for its next valid report.');
      return;
    }
    const coords = feature.geometry?.coordinates;
    if (!Array.isArray(coords) || !coords.every(Number.isFinite)) return;
    const p = feature.properties || {};
    const center = map.getCenter?.();
    const movedMeters = center ? haversineMeters([center.lng, center.lat], coords) : Infinity;
    if (movedMeters < 12) return;
    try {
      map.easeTo({
        center: coords,
        zoom: Math.max(Number(map.getZoom()) || 0, 14),
        pitch: Math.max(Number(map.getPitch()) || 0, 48),
        bearing: typeof p.effectiveBearingDegrees === 'number' ? p.effectiveBearingDegrees : map.getBearing(),
        duration: 900,
        essential: true
      });
    } catch (_) {}
  }

  async function setEnabled(map, state, enabled) {
    state.enabled = !!enabled;
    if (state.checkbox) state.checkbox.checked = state.enabled;
    if (!ensureLayers(map, state)) {
      setStatus(state, 'Map style is initializing; the layer will retry automatically when ready.');
      scheduleStyleRetry(map, state);
      renderState(state);
      return;
    }
    clearTimeout(state.readinessTimer);
    state.readinessTimer = null;
    state.readinessRetries = 0;
    setVisibility(map, state.enabled);
    if (state.enabled) {
      if (state.refreshButton) state.refreshButton.disabled = false;
      await fetchVehicles(map, state, true);
    } else {
      clearTimeout(state.timer);
      clearTimeout(state.readinessTimer);
      clearTimeout(state.retryTimer);
      state.readinessTimer = null;
      state.retryTimer = null;
      state.readinessRetries = 0;
      state.consecutiveFailures = 0;
      state.snapshot = state.snapshot || { features: [], newestReportMs: 0 };
      setStatus(state, 'Live rail paused. No additional feed requests will be made until enabled again.');
      if (state.refreshButton) state.refreshButton.disabled = true;
    }
    renderState(state);
  }

  function attachMap(map) {
    if (!map || MAPS.has(map) || typeof map.getContainer !== 'function') return;
    const container = map.getContainer();
    if (!container) return;
    MAPS.add(map);
    const safeId = (container.id || 'map').replace(/[^a-zA-Z0-9_-]/g, '-');
    const state = {
      version: VERSION, map, container, safeId, enabled: false, loading: false,
      layersReady: false, layerInteractionsBound: false, timer: null,
      readinessTimer: null, readinessRetries: 0, retryTimer: null, consecutiveFailures: 0,
      lastNetworkFailureAt: null,
      snapshot: { features: [], newestReportMs: 0 }, status: 'Live rail is off.', error: null,
      lastSuccessAt: null, lastSourceReportMs: null, observerRetries: 0,
      motionHistory: new Map(), followVehicleId: null, meshMode: false
    };
    MAP_STATE.set(map, state);
    buildUI(map, state);

    const ready = () => {
      if (ensureLayers(map, state)) {
        clearTimeout(state.readinessTimer);
        state.readinessTimer = null;
        state.readinessRetries = 0;
        setVisibility(map, state.enabled);
        if (state.enabled && !state.loading) void fetchVehicles(map, state, false);
      } else if (state.enabled) {
        scheduleStyleRetry(map, state);
      }
    };
    map.on('style.load', ready);
    map.on('load', ready);
    if (map.isStyleLoaded?.()) ready();
    map.on('remove', () => {
      clearTimeout(state.timer);
      clearTimeout(state.readinessTimer);
      clearTimeout(state.retryTimer);
      if (popup) { try { popup.remove(); } catch (_) {} popup = null; }
      setVisibility(map, false);
    });
  }

  function discoverMaps() {
    for (const map of currentMaps()) if (!MAPS.has(map)) attachMap(map);
  }

  const api = {
    version: VERSION,
    endpoint: ENDPOINT,
    source: ATTRIBUTION,
    refreshIntervalMs: REFRESH_INTERVAL_MS,
    freshnessLimitMs: FRESHNESS_LIMIT_MS,
    enabledByDefault: false,
    getState() {
      return [...MAPS].map(map => {
        const state = MAP_STATE.get(map);
        return {
          mapId: state?.container?.id || '',
          enabled: !!state?.enabled,
          loading: !!state?.loading,
          status: state?.status || '',
          featureCount: state?.snapshot?.features?.length || 0,
          lastSuccessAt: state?.lastSuccessAt || null,
          newestSourceReportAt: state?.lastSourceReportMs || null,
          followingVehicleId: state?.followVehicleId || null,
          displayMode: state?.meshMode ? 'mesh' : 'map',
          consecutiveFailures: state?.consecutiveFailures || 0,
          retryScheduled: !!state?.retryTimer,
          lastNetworkFailureAt: state?.lastNetworkFailureAt || null
        };
      });
    },
    getFeatures(mapId = '') {
      const entry = [...MAPS].map(map => ({ map, state: MAP_STATE.get(map) }))
        .find(({ state }) => state && (!mapId || state.container?.id === mapId));
      return entry ? (entry.state.snapshot?.features || []).map(feature => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [...feature.geometry.coordinates] },
        properties: { ...feature.properties }
      })) : [];
    },
    setDisplayMode(mapId, mode = 'map') {
      const entry = [...MAPS].map(map => ({ map, state: MAP_STATE.get(map) }))
        .find(({ state }) => state && state.container?.id === mapId);
      if (!entry) return false;
      entry.state.meshMode = mode === 'mesh';
      setVisibility(entry.map, entry.state.enabled);
      return entry.state.meshMode;
    },
    enrichVehicleMotion,
    haversineMeters,
    bearingBetween,
    parseSnapshot
  };
  window.__BP_LIVE_RAIL_V5969__ = api;

  window.addEventListener('load', discoverMaps, { once: true });
  window.addEventListener('bp:world-map-ready-v5940', discoverMaps);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', discoverMaps, { once: true });
  else discoverMaps();
  const startDiscovery = () => {
    if (globalObserver || !document.documentElement) return;
    globalObserver = new MutationObserver(discoverMaps);
    globalObserver.observe(document.documentElement, { childList: true, subtree: true });
  };
  startDiscovery();
  let attempts = 0;
  const retry = () => {
    discoverMaps();
    attempts++;
    if (MAPS.size === 0 && attempts < 120) setTimeout(retry, 500);
  };
  retry();
})();