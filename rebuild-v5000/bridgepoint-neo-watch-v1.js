import * as THREE from '/vendor/three.module.js?v=169-local';

/* BridgePoint Near-Earth Object Space View v3. */
(() => {
  'use strict';

  if (window.__BP_NEO_WATCH_V3__) return;
  window.__BP_NEO_WATCH_V3__ = true;

  const BUTTON_ID = 'bpNeoWatchLaunchV1';
  const ROOT_ID = 'bpNeoSpaceRootV2';
  const STYLE_ID = 'bpNeoSpaceStyleV2';
  const CACHE_KEY = 'bp_neo_watch_cache_v2';
  const NASA_FEED = 'https://api.nasa.gov/neo/rest/v1/feed';
  const NASA_KEY = 'DEMO_KEY';
  const MPC_FILE = '/nea_extended.json.gz';
  const REFRESH_MS = 6 * 60 * 60 * 1000;
  const DAY_MS = 86400000;
  const AU_KM = 149597870.7;
  const EARTH_RADIUS_KM = 6371.0;
  const AU_TO_EARTH_RADII = AU_KM / EARTH_RADIUS_KM;
  const SIDEREAL_DAY_MS = 86164090.5;
  const SIM_MS_PER_REAL_MS = 3600;
  const state = {
    items: [], selectedId: '', checkedAt: 0, loading: false, open: false,
    simulationPaused: false, simulationTime: Date.now(), simulationLastAt: 0,
    orbitCatalog: null, orbitEpoch: null, unmatched: 0, mapCamera: null, mapInteractions: null,
    dataLoading: false, dockVisualState: null,
    mapSpinStartTime: 0, mapSpinStartBearing: 0,
  };
  const scene3d = {
    scene: null, camera: null, root: null, spaceApi: null, solarFrame: null,
    earthReferenceAU: null, objects: new Map(), frame: 0, lastDraw: 0,
    lastFocusedId: null, failed: false,
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const number = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };
  const text = (tag, className, value) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (value !== undefined) node.textContent = String(value);
    return node;
  };

  function installCSS() {
    if ($('#' + STYLE_ID)) return;
    const style = text('style');
    style.id = STYLE_ID;
    style.textContent = [
      '#' + BUTTON_ID + '{position:relative!important;inset:auto!important;z-index:auto!important;width:100%;min-height:45px;margin:0;padding:7px 11px;border:1px solid #50dce98a;border-radius:12px;background:linear-gradient(135deg,#0a3042,#101d30 72%,#18233c);color:#eafcff;font:900 12px/1.15 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.055em;box-shadow:inset 0 0 0 1px #6cecf533,0 0 18px #3ce5ff16;justify-content:flex-start;cursor:pointer}',
      '#' + BUTTON_ID + ' .bpv-command-icon{color:#82f4ff;text-shadow:0 0 14px #21dbff99}',
      '#' + ROOT_ID + '[hidden]{display:none!important}',
      '#' + ROOT_ID + '{position:fixed;inset:0;z-index:2147483000;overflow:hidden;background:transparent;color:#effbff;font:500 14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;pointer-events:none}',
      '#' + ROOT_ID + ' *{box-sizing:border-box}',
      '.bpNeoStageV2{position:absolute;inset:0;pointer-events:none}',
      '.bpNeoIconLayerV2{position:absolute;inset:0;pointer-events:none}',
      '.bpNeoMarkerV2{position:absolute;left:0;top:0;display:flex;align-items:center;justify-content:center;width:34px;height:34px;padding:0;border:1px solid var(--bp-neo-orbit-color,#9cf7ff);border-radius:50%;background:radial-gradient(circle at 36% 30%,#78f6ff,#167aa0 62%,#062235);color:#fff;font:950 12px/1 system-ui;box-shadow:0 0 9px var(--bp-neo-orbit-color,#52e7ff),0 0 22px var(--bp-neo-orbit-color,#32d8ff88);transform:translate(-50%,-50%);cursor:pointer;pointer-events:auto;touch-action:manipulation;animation:bpNeoPulseV2 2.4s ease-in-out infinite}',
      '.bpNeoMarkerV2[data-hazard="true"]{border-color:#ffd194;background:radial-gradient(circle at 36% 30%,#ffd194,#b95c2d 62%,#351416);box-shadow:0 0 9px #ffc675,0 0 22px #ff794f88}',
      '.bpNeoMarkerV2[aria-pressed="true"]{width:42px;height:42px;border:2px solid #fff;box-shadow:0 0 0 7px #53eaff44,0 0 24px #51f1ff}',
      '.bpNeoMarkerV2:focus-visible,#' + ROOT_ID + ' button:focus-visible{outline:3px solid #fff;outline-offset:4px}',
      '@keyframes bpNeoPulseV2{0%,100%{filter:brightness(1);box-shadow:0 0 8px #52e7ff,0 0 16px #32d8ff77}50%{filter:brightness(1.3);box-shadow:0 0 13px #52e7ff,0 0 28px #32d8ffbb}}',
      '.bpNeoHudV2{position:absolute;left:12px;top:max(12px,env(safe-area-inset-top));display:flex;align-items:flex-start;gap:10px;max-width:min(560px,calc(100vw - 24px));pointer-events:auto}',
      '.bpNeoHudCardV2{padding:10px 13px;border:1px solid #5ee4f677;border-radius:14px;background:linear-gradient(135deg,#071a29e8,#0b2636dc);box-shadow:0 8px 24px #0008,0 0 22px #35d8ef18;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}',
      '.bpNeoHudTitleV2{display:flex;align-items:center;gap:8px;color:#eaffff;font-weight:950;font-size:14px;letter-spacing:.07em}',
      '.bpNeoLiveDotV2{width:8px;height:8px;flex:none;border-radius:50%;background:#63f0df;box-shadow:0 0 12px #63f0df;animation:bpNeoPulseV2 1.8s infinite}',
      '.bpNeoHudMetaV2{display:flex;gap:8px;align-items:center;margin-top:4px;color:#9fc7d4;font-size:12px}',
      '.bpNeoHudMetaV2 strong{color:#86f3ff;font-size:13px}',
      '.bpNeoHudHintV2{margin-top:4px;color:#86a9b7;font-size:11px}',
      '.bpNeoHudControlsV2{display:flex;gap:6px;pointer-events:auto}',
      '.bpNeoHudControlsV2 button{min-height:42px;padding:0 11px;border:1px solid #5daab7a6;border-radius:12px;background:linear-gradient(135deg,#0d3043eb,#0b1d30eb);color:#e9fbff;font:900 12px system-ui;letter-spacing:.04em;box-shadow:0 6px 18px #0007;cursor:pointer;touch-action:manipulation}',
      '.bpNeoHudControlsV2 button[data-active="true"]{border-color:#77f2ff;background:linear-gradient(135deg,#155369,#10283d);color:#a6f8ff}',
      '.bpNeoStatusV2{position:absolute;left:12px;bottom:calc(178px + env(safe-area-inset-bottom));max-width:min(450px,calc(100vw - 24px));padding:8px 11px;border:1px solid #4c859277;border-radius:11px;background:#061624d9;color:#c5e6ed;font-size:12px;box-shadow:0 6px 16px #0007;pointer-events:none}',
      '.bpNeoStatusV2[data-kind="error"]{border-color:#ba6d69;color:#ffd3d0}',
      '.bpNeoStatusV2[data-kind="ok"]{border-color:#3c9a86;color:#b5f3db}',
      '.bpNeoDetailV2[hidden]{display:none!important}',
      '.bpNeoDetailV2{position:absolute;right:12px;top:calc(82px + env(safe-area-inset-top));width:min(360px,calc(100vw - 24px));max-height:min(55vh,560px);overflow:auto;overscroll-behavior:contain;padding:14px;border:1px solid #6ce7f68c;border-radius:17px;background:radial-gradient(100% 55% at 100% 0%,#164158dd,transparent 80%),linear-gradient(155deg,#071a29f2,#071621f4 75%,#0c1d29f4);box-shadow:0 18px 55px #000b,0 0 28px #43dfef28;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);pointer-events:auto}',
      '.bpNeoDetailHeadV2{display:flex;align-items:flex-start;gap:10px}',
      '.bpNeoDetailBrandV2{min-width:0;flex:1}',
      '.bpNeoDetailKickerV2{margin:0 0 3px;color:#7ceeff;font-size:11px;font-weight:950;letter-spacing:.14em}',
      '.bpNeoDetailV2 h2{margin:0;color:#f4fdff;font-size:22px;line-height:1.1;overflow-wrap:anywhere}',
      '.bpNeoDetailSubV2{margin:5px 0 10px;color:#a7c7d2;font-size:13px}',
      '.bpNeoDetailCloseV2{flex:none;width:39px;height:39px;border:1px solid #6ba7b577;border-radius:11px;background:#102b3be8;color:#e9fbff;font-size:24px;cursor:pointer}',
      '.bpNeoModelBadgeV2{margin:0 0 10px;padding:7px 9px;border:1px solid #93764077;border-radius:10px;background:#392d19aa;color:#f2d9ab;font-size:11px;line-height:1.35}',
      '.bpNeoFactsV2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}',
      '.bpNeoFactV2{min-width:0;padding:8px 9px;border:1px solid #ffffff16;border-radius:10px;background:#ffffff08}',
      '.bpNeoFactV2 small{display:block;color:#8fb1bd;font-size:10px;font-weight:850;letter-spacing:.07em;text-transform:uppercase}',
      '.bpNeoFactV2 strong{display:block;margin-top:3px;color:#edfaff;font-size:13px;line-height:1.25;overflow-wrap:anywhere}',
      '.bpNeoLinkV2{display:inline-flex;min-height:39px;align-items:center;margin-top:10px;padding:0 10px;border:1px solid #3c8194;border-radius:10px;background:#0b2637;color:#99f1ff;font-size:12px;font-weight:900;text-decoration:none}',
      '.bpNeoDetailNoteV2{margin:9px 0 0;color:#90aeb9;font-size:11px;line-height:1.4}',
      '#' + ROOT_ID + '[data-neo-selected="true"] .bpNeoStatusV2{display:none}',
      '@media(max-width:700px){.bpNeoHudV2{left:7px;right:7px;top:max(7px,env(safe-area-inset-top));max-width:none;gap:5px;flex-direction:column;align-items:stretch}.bpNeoHudCardV2{padding:8px 9px}.bpNeoHudControlsV2{justify-content:flex-end}.bpNeoHudTitleV2{font-size:11px}.bpNeoHudMetaV2{font-size:10px}.bpNeoHudHintV2{font-size:10px}.bpNeoHudControlsV2{gap:4px}.bpNeoHudControlsV2 button{min-height:38px;padding:0 8px;font-size:10px}.bpNeoMarkerV2{width:30px;height:30px;font-size:11px}.bpNeoMarkerV2[aria-pressed=\"true\"]{width:38px;height:38px}.bpNeoStatusV2{left:7px;bottom:calc(162px + env(safe-area-inset-bottom));font-size:11px}.bpNeoDetailV2{right:7px;top:auto;bottom:calc(14px + env(safe-area-inset-bottom));width:min(330px,calc(100vw - 14px));max-height:36vh;padding:11px}.bpNeoDetailV2 h2{font-size:19px}.bpNeoFactsV2{gap:5px}.bpNeoFactV2{padding:7px}.bpNeoFactV2 strong{font-size:12px}}',
      '@media(prefers-reduced-motion:reduce){.bpNeoMarkerV2,.bpNeoLiveDotV2{animation:none}}'
    ].join('');
    document.head.appendChild(style);
  }

  function installButton() {
    const dock = $('#bpv-dock-actions');
    const existing = $('#' + BUTTON_ID);
    if (!dock || !document.body) {
      if (existing) existing.hidden = true;
      return;
    }
    installCSS();
    let button = existing;
    if (!button) {
      button = text('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.className = 'bpv-v2-tool-button';
      button.dataset.bpvCommandSection = 'Explore';
      button.setAttribute('aria-label', 'Enter near-Earth object space view');
      button.setAttribute('aria-expanded', 'false');
      const icon = text('span', 'bpv-command-icon bpv-v2-icon', '◉');
      icon.setAttribute('aria-hidden', 'true');
      button.append(icon, text('span', 'bpNeoButtonLabelV2', 'NEAR-EARTH OBJECTS'));
      button.addEventListener('click', () => state.open ? closePanel() : openPanel());
    }
    if (button.parentElement !== dock) dock.appendChild(button);
    button.hidden = false;
  }

  function getBridgePointMap() {
    const activeElement = document.getElementById('liveMap') || document.getElementById('previewMap');
    const candidates = [
      window.__BP_V5000_WORLD__?.map,
      window.__bpWorldV2300?.map,
      window.__BP_LANDING_WORLD__?.map,
      window.__BP_WORLD__?.map,
    ].filter((candidate, index, list) => candidate && list.indexOf(candidate) === index);
    if (activeElement) {
      const activeMap = candidates.find(candidate => {
        const container = candidate.getContainer?.();
        return container && (container === activeElement || activeElement.contains(container) || container.contains(activeElement));
      });
      if (activeMap && typeof activeMap.flyTo === 'function') return activeMap;
    }
    const map = candidates[0];
    return map && typeof map.flyTo === 'function' ? map : null;
  }

  function setSpaceCloseControlHidden(hidden) {
    const button = $('[data-app-space-close]');
    if (button) button.hidden = Boolean(hidden);
  }

  function setDockSuppressed(suppressed) {
    const dock = $('#bpv-dock');
    if (!dock) return;
    if (suppressed) {
      if (state.dockVisualState) return;
      state.dockVisualState = {
        visibility: dock.style.getPropertyValue('visibility'),
        visibilityPriority: dock.style.getPropertyPriority('visibility'),
        pointerEvents: dock.style.getPropertyValue('pointer-events'),
        pointerEventsPriority: dock.style.getPropertyPriority('pointer-events'),
        ariaHidden: dock.getAttribute('aria-hidden'),
      };
      dock.style.setProperty('visibility', 'hidden', 'important');
      dock.style.setProperty('pointer-events', 'none', 'important');
      dock.setAttribute('aria-hidden', 'true');
      return;
    }
    if (!state.dockVisualState) return;
    const prior = state.dockVisualState;
    if (prior.visibility) dock.style.setProperty('visibility', prior.visibility, prior.visibilityPriority);
    else dock.style.removeProperty('visibility');
    if (prior.pointerEvents) dock.style.setProperty('pointer-events', prior.pointerEvents, prior.pointerEventsPriority);
    else dock.style.removeProperty('pointer-events');
    if (prior.ariaHidden === null) dock.removeAttribute('aria-hidden');
    else dock.setAttribute('aria-hidden', prior.ariaHidden);
    state.dockVisualState = null;
  }

  const MAP_INTERACTIONS = ['scrollZoom', 'boxZoom', 'dragRotate', 'dragPan', 'keyboard', 'doubleClickZoom', 'touchZoomRotate', 'touchPitch'];

  function lockMapInteractions(map) {
    if (state.mapInteractions) return;
    state.mapInteractions = {};
    for (const name of MAP_INTERACTIONS) {
      const handler = map[name];
      if (!handler || typeof handler.disable !== 'function') {
        state.mapInteractions[name] = null;
        continue;
      }
      const wasEnabled = typeof handler.isEnabled === 'function' ? handler.isEnabled() : true;
      state.mapInteractions[name] = wasEnabled;
      if (wasEnabled) handler.disable();
    }
  }

  function restoreMapInteractions(map) {
    const saved = state.mapInteractions;
    state.mapInteractions = null;
    if (!map || !saved) return;
    for (const [name, wasEnabled] of Object.entries(saved)) {
      const handler = map[name];
      if (!handler) continue;
      if (wasEnabled === true) handler.enable?.();
      else if (wasEnabled === false) handler.disable?.();
    }
  }

  function fullGlobeZoom() {
    const shortestSide = Math.min(window.innerWidth || 390, window.innerHeight || 780);
    const fittedZoom = Math.max(0.75, Math.min(2.7, Math.log2((shortestSide * 0.80) / (512 / Math.PI))));
    return fittedZoom - 0.12;
  }

  function focusGlobalMap() {
    const map = getBridgePointMap();
    if (!map) return false;
    if (!state.mapCamera) {
      const center = map.getCenter?.();
      state.mapCamera = center ? {
        center: [center.lng, center.lat],
        zoom: map.getZoom?.(),
        pitch: map.getPitch?.(),
        bearing: map.getBearing?.(),
        minZoom: map.getMinZoom?.(),
        maxZoom: map.getMaxZoom?.(),
      } : null;
    }
    const fittedZoom = fullGlobeZoom();
    const currentZoom = Number(map.getZoom?.());
    const targetZoom = Number.isFinite(currentZoom) ? Math.min(currentZoom, fittedZoom) : fittedZoom;
    map.stop?.();
    map.resize?.();
    lockMapInteractions(map);
    map.setMinZoom?.(targetZoom);
    map.setMaxZoom?.(targetZoom);
    const view = { center: [0, 18], zoom: targetZoom, pitch: 0, bearing: 0, essential: true };
    if (typeof map.jumpTo === 'function') map.jumpTo(view);
    else map.flyTo({ ...view, duration: 0 });
    return true;
  }

  function restoreMapCamera() {
    const map = getBridgePointMap();
    const camera = state.mapCamera;
    state.mapCamera = null;
    if (!map) {
      state.mapInteractions = null;
      return;
    }
    map.stop?.();
    if (Number.isFinite(camera?.maxZoom)) map.setMaxZoom?.(camera.maxZoom);
    if (Number.isFinite(camera?.minZoom)) map.setMinZoom?.(camera.minZoom);
    restoreMapInteractions(map);
    if (!camera?.center || !Number.isFinite(camera.zoom)) return;
    map.flyTo({
      center: camera.center,
      zoom: camera.zoom,
      pitch: camera.pitch,
      bearing: camera.bearing,
      duration: 1300,
      essential: true,
    });
  }

  function ensurePanel() {
    if ($('#' + ROOT_ID)) return;
    const root = text('section');
    root.id = ROOT_ID;
    root.hidden = true;
    root.setAttribute('role', 'region');
    root.setAttribute('aria-label', 'Near-Earth object space view');
    root.innerHTML = [
      '<div class="bpNeoStageV2" aria-hidden="true"></div>',
      '<div class="bpNeoIconLayerV2" data-neo-icons aria-label="Tracked object markers"></div>',
      '<div class="bpNeoHudV2">',
      '<div class="bpNeoHudCardV2">',
      '<div class="bpNeoHudTitleV2"><span class="bpNeoLiveDotV2"></span>SPACE OBJECT TRACKING</div>',
      '<div class="bpNeoHudMetaV2"><strong data-neo-stat="total">—</strong><span>objects in the next 7 days</span></div>',
      '<div class="bpNeoHudHintV2">Tap an icon · Sun-centered view · Earth spins on its orbit · full 3D nominal paths</div>',
      '</div>',
      '<div class="bpNeoHudControlsV2">',
      '<button type="button" data-neo-action="playpause" aria-pressed="false">PAUSE</button>',
      '<button type="button" data-neo-action="reset-view">ALL OBJECTS</button>',
      '<button type="button" data-neo-action="close">EXIT</button>',
      '</div>',
      '</div>',
      '<div class="bpNeoStatusV2" data-neo-status role="status" aria-live="polite">Connecting to NASA approach data and the MPC orbit catalogue…</div>',
      '<aside class="bpNeoDetailV2" data-neo-detail hidden>',
      '<div class="bpNeoDetailHeadV2"><div class="bpNeoDetailBrandV2"><p class="bpNeoDetailKickerV2">OBJECT CLOSE APPROACH</p><h2 data-neo-title></h2><p class="bpNeoDetailSubV2" data-neo-subtitle></p></div><button class="bpNeoDetailCloseV2" type="button" data-neo-action="close-detail" aria-label="Close object details">×</button></div>',
      '<div class="bpNeoModelBadgeV2">Solid faceted proxy body · selected model enlarged · each colored 3D rod traces the full nominal orbit · the marker follows its predicted motion.</div>',
      '<div class="bpNeoFactsV2" data-neo-details></div>',
      '<div class="bpNeoDetailNoteV2">Long rods show the full nominal MPC orbital path in BridgePoint’s shared solar-system frame; the moving marker follows the orbit. NASA close-approach data does not predict an Earth impact location. Shape and spin are modeled proxies where measurements are unavailable.</div>',
      '</aside>',
    ].join('');
    root.addEventListener('click', onPanelClick);
    root.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        if (state.selectedId) closeDetails();
        else closePanel();
      }
    });
    document.body.appendChild(root);
  }

  function openPanel() {
    installButton();
    ensurePanel();
    setDockSuppressed(true);
    setSpaceCloseControlHidden(true);
    focusGlobalMap();
    const root = $('#' + ROOT_ID);
    root.hidden = false;
    state.open = true;
    state.selectedId = '';
    state.simulationPaused = false;
    state.simulationTime = Date.now();
    window.__BP_NEO_SIMULATION_TIME_V1__ = state.simulationTime;
    state.mapSpinStartTime = state.simulationTime;
    state.mapSpinStartBearing = Number(getBridgePointMap()?.getBearing?.()) || 0;
    state.simulationLastAt = 0;
    state.lastDraw = 0;
    scene3d.lastFocusedId = null;
    root.dataset.neoSelected = 'false';
    $('#' + BUTTON_ID)?.setAttribute('aria-expanded', 'true');
    setStatus('Opening the shared solar-system scene and nominal orbit tracks…');
    render();
    startAnimation();
    void (async () => {
      try {
        const api = await ensureSharedSpace();
        if (!api || !state.open) return;
        setSpaceCloseControlHidden(true);
        scene3d.root.visible = true;
        api.setNearEarthOrbitMode?.(true);
        api.focusHeliocentricOverview?.(32);
        await refreshSpaceData(false);
      } catch (error) {
        setStatus(String(error?.message || 'The shared 3D solar-system scene could not be opened.'), 'error');
      }
    })();
  }

  function closePanel() {
    const root = $('#' + ROOT_ID);
    if (!root) return;
    root.hidden = true;
    state.open = false;
    state.selectedId = '';
    window.__BP_NEO_SIMULATION_TIME_V1__ = null;
    scene3d.spaceApi?.setNearEarthOrbitMode?.(false);
    scene3d.spaceApi?.focusSpaceOverview?.(32);
    state.mapSpinStartTime = 0;
    state.mapSpinStartBearing = 0;
    if (scene3d.root) scene3d.root.visible = false;
    scene3d.lastFocusedId = null;
    $('#' + BUTTON_ID)?.setAttribute('aria-expanded', 'false');
    if (scene3d.frame) cancelAnimationFrame(scene3d.frame);
    scene3d.frame = 0;
    restoreMapCamera();
    setDockSuppressed(false);
    setSpaceCloseControlHidden(false);
    $('#' + BUTTON_ID)?.focus();
  }

  function closeDetails() {
    state.selectedId = '';
    scene3d.lastFocusedId = null;
    const panel = $('[data-neo-detail]');
    if (panel) panel.hidden = true;
    const root = $('#' + ROOT_ID);
    if (root) root.dataset.neoSelected = 'false';
    if (state.open) scene3d.spaceApi?.focusSpaceOverview?.(32);
    renderMarkers();
  }

  function onPanelClick(event) {
    const action = event.target.closest('[data-neo-action]')?.dataset.neoAction;
    if (action === 'close') {
      closePanel();
      return;
    }
    if (action === 'close-detail') {
      closeDetails();
      return;
    }
    if (action === 'playpause') {
      state.simulationPaused = !state.simulationPaused;
      state.simulationLastAt = 0;
      render();
      return;
    }
    if (action === 'reset-view') {
      closeDetails();
      focusGlobalMap();
      scene3d.spaceApi?.focusSpaceOverview?.(32);
      render();
      return;
    }
    const marker = event.target.closest('[data-neo-id]');
    if (marker) {
      state.selectedId = marker.dataset.neoId;
      state.simulationLastAt = 0;
      scene3d.lastFocusedId = null;
      render();
      renderDetails(state.items.find(item => item.id === state.selectedId));
    }
  }

  function parseApproach(item) {
    const approaches = Array.isArray(item.close_approach_data) ? item.close_approach_data : [];
    const approach = approaches.find(value => value && String(value.orbiting_body || '').toLowerCase() === 'earth') || approaches[0];
    if (!approach) return null;
    const distanceKm = number(approach.miss_distance?.kilometers);
    const lunarDistance = number(approach.miss_distance?.lunar);
    const velocityKps = number(approach.relative_velocity?.kilometers_per_second);
    const epochMs = number(approach.epoch_date_close_approach);
    return {
      distanceKm, lunarDistance, velocityKps,
      date: String(approach.close_approach_date || ''),
      dateFull: String(approach.close_approach_date_full || ''),
      epochMs,
    };
  }

  function normalizeFeed(payload) {
    const groups = payload && payload.near_earth_objects;
    if (!groups || typeof groups !== 'object') throw new Error('NASA feed format was not recognized.');
    const items = Object.values(groups).flatMap(group => Array.isArray(group) ? group : []).map(raw => {
      const approach = parseApproach(raw);
      if (!approach) return null;
      const diameter = raw.estimated_diameter?.kilometers || {};
      return {
        id: String(raw.id || raw.neo_reference_id || ''),
        name: String(raw.name || raw.designation || 'Uncatalogued asteroid'),
        designation: String(raw.designation || raw.name || '—'),
        diameterMinKm: number(diameter.estimated_diameter_min),
        diameterMaxKm: number(diameter.estimated_diameter_max),
        distanceKm: approach.distanceKm,
        lunarDistance: approach.lunarDistance,
        velocityKps: approach.velocityKps,
        date: approach.date,
        dateFull: approach.dateFull,
        epochMs: approach.epochMs,
        hazardous: raw.is_potentially_hazardous_asteroid === true,
        absoluteMagnitude: number(raw.absolute_magnitude_h),
        nasaUrl: typeof raw.nasa_jpl_url === 'string' && raw.nasa_jpl_url.startsWith('https://') ? raw.nasa_jpl_url : '',
        orbit: null,
      };
    }).filter(item => item && item.id);
    items.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    return items;
  }

  function feedDates() {
    const start = new Date();
    const end = new Date(start.getTime() + 6 * DAY_MS);
    return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
  }

  function readCache() {
    try {
      const value = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (!value || !Array.isArray(value.items) || !number(value.checkedAt)) return null;
      return value;
    } catch (_) {
      return null;
    }
  }

  function useCache(cache) {
    state.items = cache.items.map(item => ({ ...item, orbit: null }));
    state.checkedAt = cache.checkedAt;
    if (!state.items.some(item => item.id === state.selectedId)) state.selectedId = '';
  }

  function setStatus(message, kind = 'info') {
    const node = $('[data-neo-status]');
    if (!node) return;
    node.textContent = message;
    node.dataset.kind = kind;
  }

  function lastCheckedLabel() {
    if (!state.checkedAt) return '—';
    return new Date(state.checkedAt).toLocaleTimeString(undefined, {
      timeZone: 'UTC', hour: '2-digit', minute: '2-digit',
    }) + ' UTC';
  }

  function formatDistance(km) {
    const value = number(km);
    if (value === null) return 'Not reported';
    if (value >= 1000000) return (value / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M km';
    return Math.round(value).toLocaleString() + ' km';
  }

  function formatDiameter(minKm, maxKm) {
    if (minKm === null || maxKm === null) return 'Not reported';
    if (maxKm < 1) return Math.round(minKm * 1000).toLocaleString() + '–' + Math.round(maxKm * 1000).toLocaleString() + ' m';
    return minKm.toFixed(3) + '–' + maxKm.toFixed(3) + ' km';
  }

  function approachTime(item) {
    if (item.epochMs !== null) {
      return new Date(item.epochMs).toLocaleString(undefined, {
        timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }) + ' UTC';
    }
    return item.date || 'Time not reported';
  }

  function objectAliases(record) {
    const values = [];
    const num = record.Number ?? record.number ?? '';
    const name = record.Name ?? record.name ?? '';
    const designation = record.Principal_desig ?? record.Principal_Desig ??
      record.Designation ?? record.designation ?? record.principal_desig ?? '';
    const alternates = record.Other_desigs ?? record.other_desigs ?? [];
    if (num !== '') values.push(String(num));
    if (name) values.push(String(name));
    if (designation) values.push(String(designation));
    if (num !== '' && name) values.push(String(num) + ' ' + String(name));
    if (Array.isArray(alternates)) values.push(...alternates.map(String));
    else if (alternates) values.push(String(alternates));
    return values;
  }

  function normalizeDesignation(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function makeOrbitIndex(records) {
    const index = new Map();
    for (const record of records) {
      for (const alias of objectAliases(record)) {
        const key = normalizeDesignation(alias);
        if (key) index.set(key, record);
      }
    }
    return index;
  }

  function matchOrbit(item, index) {
    const variants = [item.designation, item.name];
    const numberName = String(item.name).replace(/^\s*\(?(\d+)\)?\s*/, '$1 ');
    variants.push(numberName);
    for (const variant of variants) {
      const key = normalizeDesignation(variant);
      if (key && index.has(key)) return index.get(key);
    }
    return null;
  }

  function orbitFromRecord(record) {
    if (!record) return null;
    const read = (...keys) => {
      for (const key of keys) {
        const value = number(record[key]);
        if (value !== null) return value;
      }
      return null;
    };
    const orbit = {
      a: read('a', 'A'), e: read('e', 'E'),
      i: read('i', 'I'), node: read('Node', 'node', 'Omega', 'omega_node'),
      peri: read('Peri', 'peri', 'Perihelion', 'ArgumentOfPerihelion'),
      mean: read('M', 'm', 'MeanAnomaly', 'mean_anomaly'),
      epoch: read('Epoch', 'epoch', 'epoch_jd'),
      orbitClass: String(record.Class ?? record.class ?? ''),
      sourceName: String(record.Name ?? record.name ?? ''),
      spinHours: read('Spin', 'spin_period', 'rotation_period'),
    };
    if (orbit.epoch !== null && orbit.epoch < 100000) orbit.epoch += 2400000.5;
    if (orbit.a === null || orbit.e === null || orbit.i === null || orbit.node === null || orbit.peri === null || orbit.mean === null || orbit.epoch === null) return null;
    if (orbit.a <= 0 || orbit.e < 0 || orbit.e >= 1) return null;
    return orbit;
  }

  async function loadOrbitCatalog() {
    if (Array.isArray(state.orbitCatalog)) return state.orbitCatalog;
    const version = new Date().toISOString().slice(0, 10);
    const url = new URL(MPC_FILE, location.origin);
    url.searchParams.set('day', version);
    const response = await fetch(url.toString(), { method: 'GET', cache: 'no-store', credentials: 'same-origin' });
    if (!response.ok) throw new Error('MPC orbit catalogue returned HTTP ' + response.status + '.');
    if (typeof DecompressionStream !== 'function') throw new Error('This browser cannot decode the compressed orbit catalogue.');
    const stream = response.body.pipeThrough(new DecompressionStream('gzip'));
    const records = await new Response(stream).json();
    if (!Array.isArray(records) || records.length < 1000) throw new Error('The MPC orbit catalogue format was not recognized.');
    state.orbitCatalog = records;
    state.orbitEpoch = number(records[0]?.Epoch ?? records[0]?.epoch);
    return records;
  }

  function keplerPosition(elements, jd) {
    const radians = Math.PI / 180;
    const a = elements.a, e = elements.e;
    const inclination = elements.i * radians;
    const node = elements.node * radians;
    const peri = elements.peri * radians;
    const elapsedDays = jd - elements.epoch;
    const mu = 0.00029591220828559104;
    const meanMotion = Math.sqrt(mu / (a * a * a));
    let mean = (elements.mean * radians + meanMotion * elapsedDays) % (Math.PI * 2);
    if (mean < 0) mean += Math.PI * 2;
    let eccentric = mean;
    for (let count = 0; count < 12; count += 1) {
      const delta = (eccentric - e * Math.sin(eccentric) - mean) / (1 - e * Math.cos(eccentric));
      eccentric -= delta;
      if (Math.abs(delta) < 1e-11) break;
    }
    const x = a * (Math.cos(eccentric) - e);
    const y = a * Math.sqrt(1 - e * e) * Math.sin(eccentric);
    const cosN = Math.cos(node), sinN = Math.sin(node);
    const cosI = Math.cos(inclination), sinI = Math.sin(inclination);
    const cosP = Math.cos(peri), sinP = Math.sin(peri);
    return new THREE.Vector3(
      (cosN * cosP - sinN * sinP * cosI) * x + (-cosN * sinP - sinN * cosP * cosI) * y,
      (sinN * cosP + cosN * sinP * cosI) * x + (-sinN * sinP + cosN * cosP * cosI) * y,
      (sinP * sinI) * x + (cosP * sinI) * y
    );
  }

  function earthPositionAU(jd) {
    const t = (jd - 2451545.0) / 36525;
    const a = 1.00000018 - 0.00000003 * t;
    const e = 0.01673163 - 0.00003661 * t;
    const inc = -0.00054346 - 0.01337178 * t;
    const meanLongitude = 100.46691572 + 35999.37306329 * t;
    const longitudePerihelion = 102.93005885 + 0.31795260 * t;
    const ascendingNode = -5.11260389 - 0.24123856 * t;
    const orbit = {
      a, e, i: inc,
      node: ascendingNode,
      peri: longitudePerihelion - ascendingNode,
      mean: meanLongitude - longitudePerihelion,
      epoch: 2451545.0,
    };
    return keplerPosition(orbit, jd);
  }

  function rawRelativePositionAU(item, timeMs) {
    const jd = timeMs / DAY_MS + 2440587.5;
    const frame = scene3d.solarFrame;
    const toGalactic = frame?.eclipticJ2000ToGalactic;
    const orbitPosition = keplerPosition(item.orbit, jd);
    const objectHeliocentric = typeof toGalactic === 'function' ? toGalactic(orbitPosition) : orbitPosition;
    const earthFallback = earthPositionAU(jd);
    const earthReference = scene3d.earthReferenceAU
      || (typeof toGalactic === 'function' ? toGalactic(earthFallback) : earthFallback);
    return frame?.heliocentric ? objectHeliocentric : objectHeliocentric.sub(earthReference);
  }

  function displayPosition(relativeAU) {
    const frame = scene3d.solarFrame;
    if (!frame?.orientation || !Number.isFinite(frame.auScale)) return relativeAU.clone();
    return relativeAU.clone().applyQuaternion(frame.orientation).multiplyScalar(frame.auScale);
  }

  function asteroidGeometry(id) {
    const phi = (1 + Math.sqrt(5)) / 2;
    const vertices = [
      [-1, phi, 0], [1, phi, 0], [-1, -phi, 0], [1, -phi, 0],
      [0, -1, phi], [0, 1, phi], [0, -1, -phi], [0, 1, -phi],
      [phi, 0, -1], [phi, 0, 1], [-phi, 0, -1], [-phi, 0, 1],
    ].map(values => new THREE.Vector3(...values).normalize());
    let faces = [
      [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
      [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
      [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
      [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
    ];
    for (let level = 0; level < 2; level += 1) {
      const cache = new Map();
      const midpoint = (a, b) => {
        const key = a < b ? a + ':' + b : b + ':' + a;
        if (cache.has(key)) return cache.get(key);
        const point = vertices[a].clone().add(vertices[b]).normalize();
        const index = vertices.length;
        vertices.push(point);
        cache.set(key, index);
        return index;
      };
      const subdivided = [];
      for (const [a, b, c] of faces) {
        const ab = midpoint(a, b), bc = midpoint(b, c), ca = midpoint(c, a);
        subdivided.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
      }
      faces = subdivided;
    }
    const seed = hash(id) || 1;
    const rand = index => {
      let value = (seed ^ Math.imul(index + 1, 0x45d9f3b)) >>> 0;
      value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
      value = Math.imul(value ^ (value >>> 16), 0x45d9f3b) >>> 0;
      return (value ^ (value >>> 16)) / 4294967295;
    };
    const positions = [];
    for (let i = 0; i < vertices.length; i += 1) {
      const vertex = vertices[i];
      const radius = 0.90 + rand(i) * 0.20;
      positions.push(vertex.x * radius, vertex.y * radius, vertex.z * radius);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(faces.flat());
    geometry.computeVertexNormals();
    return geometry;
  }

  function init3DScene(spaceApi) {
    if (scene3d.root && scene3d.spaceApi === spaceApi) {
      scene3d.root.visible = true;
      return true;
    }
    const sharedScene = spaceApi?.getScene?.();
    const sharedCamera = spaceApi?.getCamera?.();
    const frame = window.__BP_SOLAR_COSMOS_V6280__?.getFrame?.();
    if (!sharedScene || !sharedCamera || !frame?.orientation || !Number.isFinite(frame.auScale) || frame.auScale <= 0) {
      throw new Error('The shared solar-system coordinate frame is not ready yet.');
    }
    if (scene3d.root?.parent) scene3d.root.parent.remove(scene3d.root);
    scene3d.scene = sharedScene;
    scene3d.camera = sharedCamera;
    scene3d.spaceApi = spaceApi;
    scene3d.solarFrame = frame;
    scene3d.earthReferenceAU = frame.sun.clone().negate().applyQuaternion(frame.orientation.clone().invert()).divideScalar(frame.auScale);
    scene3d.root = new THREE.Group();
    scene3d.root.name = 'BridgePoint near-Earth objects and full nominal orbital paths';
    scene3d.root.visible = true;
    sharedScene.add(scene3d.root);
    scene3d.lastFocusedId = null;
    scene3d.failed = false;
    return true;
  }

  async function ensureSharedSpace() {
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline && state.open) {
      const app = window.__BP_APP_SPACE_EXPLORER_V1__;
      if (app && typeof app.open === 'function') { await app.open(); break; }
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }
    let api = null;
    while (Date.now() < deadline && state.open) {
      api = window.__BP_WELCOME_SPACE_V6257__;
      if (api && typeof api.getScene === 'function' && typeof api.getCamera === 'function') break;
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }
    if (!state.open) return null;
    if (!api || typeof api.getScene !== 'function') throw new Error('The shared BridgePoint 3D space renderer did not become ready.');
    if (typeof api.loadSolarCosmos === 'function') await api.loadSolarCosmos();
    api.setNearEarthOrbitMode?.(true);
    window.__BP_NEO_SIMULATION_TIME_V1__ = state.simulationTime;
    let solar = window.__BP_SOLAR_COSMOS_V6280__;
    while (Date.now() < deadline && state.open && (!solar?.getFrame || !solar.getFrame()?.orientation)) {
      await new Promise(resolve => window.setTimeout(resolve, 100));
      solar = window.__BP_SOLAR_COSMOS_V6280__;
    }
    if (!state.open) return null;
    if (!solar?.getFrame) throw new Error('The planetary orbital frame did not become ready.');
    init3DScene(api);
    api.focusHeliocentricOverview?.(32);
    return api;
  }

  function orbitColor(item) {
    if (item.hazardous) return 0xffb45e;
    const colors = [0x55e8ff, 0x9b8cff, 0xff80d1, 0xa8ee83, 0x78b8ff, 0xffd46e, 0x67f0c5];
    return colors[hash(item.id) % colors.length];
  }

  function buildSpaceObjects() {
    if (!scene3d.scene || !scene3d.root || !scene3d.solarFrame) return;
    for (const obj of scene3d.objects.values()) {
      scene3d.root.remove(obj.group);
      obj.group.traverse(child => {
        child.geometry?.dispose?.();
        if (Array.isArray(child.material)) child.material.forEach(material => material.dispose());
        else child.material?.dispose?.();
      });
      obj.marker?.remove();
    }
    scene3d.objects.clear();
    const icons = $('[data-neo-icons]');
    if (icons) icons.replaceChildren();
    let plotted = 0;
    const gravitationalParameter = 0.00029591220828559104; // AU^3/day^2
    for (const item of state.items) {
      item.orbit = orbitFromRecord(item._orbitRecord);
      if (!item.orbit) continue;
      plotted += 1;
      const group = new THREE.Group();
      const periodDays = Math.PI * 2 * Math.sqrt(item.orbit.a ** 3 / gravitationalParameter);
      const orbitStart = (item.orbit.epoch - 2440587.5) * DAY_MS;
      const pathPoints = [];
      const pathSamples = 240;
      for (let i = 0; i <= pathSamples; i += 1) {
        const time = orbitStart + periodDays * DAY_MS * i / pathSamples;
        pathPoints.push(displayPosition(rawRelativePositionAU(item, time)));
      }
      const orbitCurve = new THREE.CatmullRomCurve3(pathPoints, true, 'centripetal', 0.22);
      const color = orbitColor(item);
      const orbitGlow = new THREE.Mesh(
        new THREE.TubeGeometry(orbitCurve, 320, 0.050, 6, true),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.14, depthWrite: false, toneMapped: false })
      );
      orbitGlow.renderOrder = 1;
      const orbitLine = new THREE.Mesh(
        new THREE.TubeGeometry(orbitCurve, 320, 0.013, 5, true),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.82, depthWrite: false, toneMapped: false })
      );
      orbitLine.renderOrder = 2;
      const tracer = new THREE.Mesh(
        new THREE.SphereGeometry(0.030, 10, 8),
        new THREE.MeshBasicMaterial({ color: 0xf0ffff, toneMapped: false })
      );
      tracer.renderOrder = 8;
      const arrow = new THREE.Mesh(
        new THREE.ConeGeometry(0.040, 0.18, 7),
        new THREE.MeshBasicMaterial({ color, toneMapped: false })
      );
      arrow.renderOrder = 8;
      group.add(orbitGlow, orbitLine, tracer, arrow);
      const radiusKm = item.diameterMinKm !== null && item.diameterMaxKm !== null
        ? (item.diameterMinKm + item.diameterMaxKm) * 0.25
        : 0.025;
      const physicalRadius = Math.max(0.000004, radiusKm / EARTH_RADIUS_KM * 1.42);
      const body = new THREE.Mesh(
        asteroidGeometry(item.id),
        new THREE.MeshStandardMaterial({
          color: 0x99948b,
          roughness: 0.80,
          metalness: 0.06,
          emissive: 0x182126,
          emissiveIntensity: 0.18,
          flatShading: true,
        })
      );
      body.scale.setScalar(physicalRadius);
      body.renderOrder = 9;
      group.add(body);
      scene3d.root.add(group);
      const marker = text('button', 'bpNeoMarkerV2', '✦');
      marker.type = 'button';
      marker.dataset.neoId = item.id;
      marker.dataset.hazard = String(item.hazardous);
      marker.style.setProperty('--bp-neo-orbit-color', '#' + color.toString(16).padStart(6, '0'));
      marker.title = item.name + ' · nominal orbital path · closest approach ' + formatDistance(item.distanceKm);
      marker.setAttribute('aria-label', 'Focus ' + item.name + ', nominal orbit and closest approach ' + formatDistance(item.distanceKm));
      marker.setAttribute('aria-pressed', String(item.id === state.selectedId));
      icons?.appendChild(marker);
      scene3d.objects.set(item.id, {
        item, group, body, marker, physicalRadius, pos: new THREE.Vector3(),
        orbitCurve, orbitGlow, orbitLine, tracer, arrow, periodDays,
      });
    }
    state.unmatched = Math.max(0, state.items.length - plotted);
    const label = state.items.length.toLocaleString() + ' tracked · ' + plotted.toLocaleString() + ' plotted';
    if (plotted) {
      const epoch = state.orbitEpoch ? new Date((state.orbitEpoch - 2440587.5) * DAY_MS).toLocaleDateString() : 'daily';
      setStatus(label + ' · full 3D nominal orbits · MPC elements ' + epoch + ' · close-approach distances are NASA values', state.unmatched ? 'info' : 'ok');
    } else if (state.items.length) {
      setStatus('The approach feed loaded, but no matching orbit records were found in the MPC catalogue.', 'error');
    }
    renderMarkers();
  }

  async function loadFeed(force) {
    if (state.loading) return;
    const cache = readCache();
    const fresh = cache && Date.now() - cache.checkedAt < REFRESH_MS;
    if (!force && fresh) {
      useCache(cache);
      state.loading = false;
      updateSummary();
      return;
    }
    if (cache) useCache(cache);
    state.loading = true;
    updateSummary();
    setStatus('Loading NASA close-approach data…');
    try {
      const dates = feedDates();
      const url = new URL(NASA_FEED);
      url.searchParams.set('start_date', dates.start);
      url.searchParams.set('end_date', dates.end);
      url.searchParams.set('api_key', NASA_KEY);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 18000);
      let response;
      try {
        response = await fetch(url.toString(), {
          method: 'GET', mode: 'cors', credentials: 'omit',
          headers: { Accept: 'application/json' }, signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeout);
      }
      if (!response.ok) throw new Error('NASA feed returned HTTP ' + response.status + '.');
      const payload = await response.json();
      state.items = normalizeFeed(payload);
      state.checkedAt = Date.now();
      state.selectedId = '';
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ checkedAt: state.checkedAt, items: state.items }));
      } catch (_) { /* Fresh NASA data still works if browser storage is unavailable. */ }
    } catch (error) {
      const message = error?.name === 'AbortError' ? 'NASA approach feed timed out.' : String(error?.message || 'NASA approach feed is unavailable.');
      if (state.items.length) setStatus(message + ' Showing the last saved snapshot from ' + lastCheckedLabel() + '.', 'error');
      else setStatus(message, 'error');
    } finally {
      state.loading = false;
      updateSummary();
      if (state.open && Array.isArray(state.orbitCatalog)) {
        attachOrbitRecords();
        buildSpaceObjects();
      }
    }
  }

  function attachOrbitRecords() {
    if (!state.orbitCatalog) return;
    const index = makeOrbitIndex(state.orbitCatalog);
    for (const item of state.items) {
      item._orbitRecord = matchOrbit(item, index);
      item.orbit = orbitFromRecord(item._orbitRecord);
    }
  }

  function selectedItem() {
    return state.items.find(item => item.id === state.selectedId) || null;
  }

  function renderDetails(item) {
    const panel = $('[data-neo-detail]');
    const node = $('[data-neo-details]');
    if (!panel || !node) return;
    if (!item) {
      panel.hidden = true;
      node.replaceChildren();
      return;
    }
    panel.hidden = false;
    $('[data-neo-title]').textContent = item.name;
    $('[data-neo-subtitle]').textContent = 'NASA designation ' + item.designation + ' · ' + approachTime(item);
    node.replaceChildren();
    const facts = [
      ['Current 3D position', item.orbit ? 'Orbit-derived · nominal' : 'Not available'],
      ['Estimated diameter', formatDiameter(item.diameterMinKm, item.diameterMaxKm)],
      ['Closest approach', formatDistance(item.distanceKm)],
      ['Distance in lunar units', item.lunarDistance === null ? 'Not reported' : item.lunarDistance.toFixed(3) + ' LD'],
      ['Relative speed', item.velocityKps === null ? 'Not reported' : item.velocityKps.toFixed(2) + ' km/s'],
      ['Approach time', approachTime(item)],
      ['NASA hazard flag', item.hazardous ? 'Potentially hazardous' : 'Not flagged'],
      ['Absolute magnitude', item.absoluteMagnitude === null ? 'Not reported' : item.absoluteMagnitude.toFixed(2) + ' H'],
      ['Orbit data', item.orbit ? 'MPC nominal elements · daily catalogue' : 'Not available'],
      ['Spin period', item.orbit?.spinHours ? item.orbit.spinHours + ' h' : 'Unknown; turn is illustrative'],
      ['Shape and surface', 'Procedural proxy; no measured 3D model'],
    ];
    for (const [label, value] of facts) {
      const fact = text('div', 'bpNeoFactV2');
      fact.append(text('small', '', label), text('strong', '', value));
      node.appendChild(fact);
    }
    if (item.nasaUrl) {
      const link = text('a', 'bpNeoLinkV2', 'OPEN NASA/JPL OBJECT RECORD');
      link.href = item.nasaUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      node.appendChild(link);
    }
  }

  function updateSummary() {
    const total = $('[data-neo-stat="total"]');
    if (total) total.textContent = (state.items.length || 0).toLocaleString();
    const play = $('[data-neo-action="playpause"]');
    if (play) {
      play.textContent = state.simulationPaused ? 'PLAY' : 'PAUSE';
      play.setAttribute('aria-pressed', String(state.simulationPaused));
    }
  }

  function renderMarkers() {
    if (!state.open || !scene3d.camera) return;
    scene3d.camera.updateMatrixWorld();
    for (const obj of scene3d.objects.values()) {
      const point = obj.pos.clone().project(scene3d.camera);
      const visible = point.z > -1 && point.z < 1 && Math.abs(point.x) < 1.05 && Math.abs(point.y) < 1.05;
      obj.marker.hidden = !visible;
      if (!visible) continue;
      obj.marker.style.left = ((point.x + 1) * 50) + '%';
      obj.marker.style.top = ((1 - point.y) * 50) + '%';
      obj.marker.setAttribute('aria-pressed', String(obj.item.id === state.selectedId));
    }
  }

  function render() {
    if (!state.open) return;
    ensurePanel();
    updateSummary();
    const root = $('#' + ROOT_ID);
    const selected = Boolean(selectedItem());
    if (root) root.dataset.neoSelected = String(selected);
    renderDetails(selectedItem());
    renderMarkers();
  }

  function hash(value) {
    let result = 2166136261;
    for (let i = 0; i < value.length; i += 1) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
    return result >>> 0;
  }

  function drawFrame(now) {
    if (!state.open || !scene3d.root || !scene3d.camera || !scene3d.spaceApi) return;
    const delta = scene3d.lastDraw ? Math.min(100, Math.max(0, now - scene3d.lastDraw)) : 16;
    scene3d.lastDraw = now;
    if (!state.simulationPaused) state.simulationTime += delta * SIM_MS_PER_REAL_MS;
    window.__BP_NEO_SIMULATION_TIME_V1__ = state.simulationTime;
    const currentFrame = window.__BP_SOLAR_COSMOS_V6280__?.getFrame?.();
    if (currentFrame?.heliocentric && currentFrame.orientation && Number.isFinite(currentFrame.auScale)) scene3d.solarFrame = currentFrame;
    const loopStart = Date.now() - 3 * DAY_MS;
    const loopEnd = Date.now() + 9 * DAY_MS;
    if (state.simulationTime > loopEnd) state.simulationTime = loopStart;
    const map = getBridgePointMap();
    if (map && state.mapSpinStartTime) {
      const rotation = ((state.simulationTime - state.mapSpinStartTime) / SIDEREAL_DAY_MS * 360) % 360;
      const bearing = ((state.mapSpinStartBearing + rotation) % 360 + 360) % 360;
      if (Math.abs((((bearing - (Number(map.getBearing?.()) || 0)) + 540) % 360) - 180) > 0.04) map.setBearing?.(bearing);
    }
    for (const obj of scene3d.objects.values()) {
      obj.pos.copy(displayPosition(rawRelativePositionAU(obj.item, state.simulationTime)));
      obj.body.position.copy(obj.pos);
      const selected = obj.item.id === state.selectedId;
      const targetRadius = selected ? 0.11 : obj.physicalRadius;
      obj.body.scale.setScalar(THREE.MathUtils.damp(obj.body.scale.x, targetRadius, 7, Math.max(0.001, delta / 1000)));
      const spinSeconds = now / 1000;
      const rotationRate = obj.item.orbit?.spinHours ? Math.PI * 2 / (obj.item.orbit.spinHours * 3600) : 0.035;
      obj.body.rotation.set(spinSeconds * rotationRate * 0.5, spinSeconds * rotationRate, spinSeconds * rotationRate * 0.3);
      const nextTime = state.simulationTime + 15 * 60 * 1000;
      const nextPosition = displayPosition(rawRelativePositionAU(obj.item, nextTime));
      const tangent = nextPosition.sub(obj.pos);
      if (tangent.lengthSq() > 1e-12) {
        tangent.normalize();
        obj.tracer.position.copy(obj.pos);
        obj.arrow.position.copy(obj.pos);
        obj.arrow.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
      }
      obj.orbitGlow.material.opacity = selected ? 0.30 : 0.14;
      obj.orbitLine.material.opacity = selected ? 1.0 : 0.82;
    }
    if (scene3d.lastFocusedId !== state.selectedId) {
      scene3d.lastFocusedId = state.selectedId;
      const selected = scene3d.objects.get(state.selectedId);
      if (selected) scene3d.spaceApi.focusSpacePoint?.(selected.pos, THREE.MathUtils.clamp(selected.pos.length() * 0.28, 0.8, 4.5));
      else scene3d.spaceApi.focusHeliocentricOverview?.(32);
    }
    scene3d.camera.updateMatrixWorld();
    renderMarkers();
  }

  function startAnimation() {
    if (scene3d.frame || !state.open) return;
    const tick = now => {
      scene3d.frame = 0;
      if (!state.open) return;
      if (!document.hidden && now - scene3d.lastDraw > 28) drawFrame(now);
      scene3d.frame = requestAnimationFrame(tick);
    };
    scene3d.frame = requestAnimationFrame(tick);
  }

  async function refreshSpaceData(force) {
    if (state.dataLoading) return;
    state.dataLoading = true;
    try {
      await loadFeed(force);
      if (!state.open) return;
      if (!state.orbitCatalog) {
        setStatus('Loading the daily MPC near-Earth orbit catalogue…');
        await loadOrbitCatalog();
      }
      attachOrbitRecords();
      buildSpaceObjects();
    } catch (error) {
      setStatus(String(error?.message || 'Orbit data could not be loaded.'), 'error');
    } finally {
      state.dataLoading = false;
      updateSummary();
    }
  }

  function boot() {
    installCSS();
    installButton();
    window.setInterval(installButton, 1200);
    window.addEventListener('resize', () => {
      if (!state.open) return;
      focusGlobalMap();
      window.setTimeout(() => {
        if (!state.open) return;
        const frame = window.__BP_SOLAR_COSMOS_V6280__?.getFrame?.();
        if (frame?.orientation && Number.isFinite(frame.auScale)) {
          scene3d.solarFrame = frame;
          scene3d.earthReferenceAU = frame.sun.clone().negate().applyQuaternion(frame.orientation.clone().invert()).divideScalar(frame.auScale);
          buildSpaceObjects();
        }
        scene3d.spaceApi?.focusHeliocentricOverview?.(32);
        renderMarkers();
      }, 180);
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && scene3d.frame) {
        cancelAnimationFrame(scene3d.frame);
        scene3d.frame = 0;
      } else if (!document.hidden) startAnimation();
    });
    window.setInterval(() => {
      if (state.open && !document.hidden && Date.now() - state.checkedAt >= REFRESH_MS) void refreshSpaceData(false);
    }, 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
