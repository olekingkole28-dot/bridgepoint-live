import * as THREE from '/vendor/three.module.js?v=169-local';

/* BridgePoint Near-Earth Object Watch v1. */
(() => {
  'use strict';

  if (window.__BP_NEO_WATCH_V1__) return;
  window.__BP_NEO_WATCH_V1__ = true;

  const BUTTON_ID = 'bpNeoWatchLaunchV1';
  const ROOT_ID = 'bpNeoWatchRootV1';
  const STYLE_ID = 'bpNeoWatchStyleV1';
  const CACHE_KEY = 'bp_neo_watch_cache_v1';
  const NASA_FEED = 'https://api.nasa.gov/neo/rest/v1/feed';
  const NASA_KEY = 'DEMO_KEY';
  const REFRESH_MS = 6 * 60 * 60 * 1000;
  const MANUAL_COOLDOWN_MS = 5 * 60 * 1000;
  const state = {
    items: [],
    selectedId: '',
    filter: 'all',
    checkedAt: 0,
    loading: false,
    error: '',
    open: false,
    frame: 0,
    lastDraw: 0,
    mapCamera: null,
    simulationPaused: false,
    simulationProgress: 0,
    simulationLastAt: 0,
  };
  const scene3d = { renderer: null, scene: null, camera: null, earth: null, asteroid: null, asteroidLight: null, path: null, glowPath: null, curve: null, currentId: '', width: 0, height: 0, failed: false };

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
    style.textContent = `
      #${BUTTON_ID}{position:fixed;z-index:2147482902;min-height:44px;padding:0 15px;border:1px solid #8cf6ff;border-radius:14px;background:linear-gradient(145deg,#d7fcff 0%,#49d9ee 38%,#176da3 100%);color:#06121e;font:950 14px/1 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.035em;box-shadow:0 7px 0 #104661,0 12px 26px #000a,0 0 28px #47d9ff44;cursor:pointer;touch-action:manipulation}
      #${BUTTON_ID}:hover{filter:brightness(1.08);transform:translateY(-1px)}#${BUTTON_ID}:active{transform:translateY(2px);box-shadow:0 4px 0 #104661,0 7px 18px #000a}#${BUTTON_ID}:focus-visible,#${ROOT_ID} button:focus-visible,#${ROOT_ID} a:focus-visible{outline:3px solid #f0feff;outline-offset:3px}
      #${BUTTON_ID}[hidden],#${ROOT_ID}[hidden]{display:none!important}
      #${ROOT_ID}{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:calc(env(safe-area-inset-top) + 10px) 10px calc(env(safe-area-inset-bottom) + 10px);background:rgba(1,7,15,.82);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);font:500 15px/1.45 system-ui,-apple-system,Segoe UI,sans-serif;color:#effbff}
      #${ROOT_ID} *{box-sizing:border-box}#${ROOT_ID}[hidden]{display:none!important}
      .bpNeoPanelV1{width:min(1120px,100%);height:min(860px,100%);display:grid;grid-template-rows:auto auto minmax(0,1fr) auto;overflow:hidden;border:1px solid #66dcec66;border-radius:24px;background:radial-gradient(95% 75% at 100% 0%,#133b58 0%,transparent 60%),linear-gradient(150deg,#0a1b2a,#06121e 72%,#071c26);box-shadow:0 30px 100px #000d,0 0 45px #36d5ee1e}
      .bpNeoHeadV1{display:flex;align-items:center;gap:15px;padding:17px 20px;border-bottom:1px solid #96e8f21c}.bpNeoBrandV1{min-width:0;flex:1}.bpNeoKickerV1{margin:0 0 4px;color:#79efff;font-size:12px;font-weight:950;letter-spacing:.16em}.bpNeoHeadV1 h2{margin:0;color:#f4fdff;font-size:clamp(21px,3vw,30px);line-height:1.1;letter-spacing:-.02em}.bpNeoSubheadV1{margin:6px 0 0;color:#a7c5d2;font-size:14px}.bpNeoCloseV1{width:44px;height:44px;border:1px solid #7ac8d54a;border-radius:13px;background:#102838;color:#e8fbff;font-size:28px;cursor:pointer}
      .bpNeoSummaryV1{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;padding:12px 16px;border-bottom:1px solid #96e8f21c}.bpNeoStatV1{min-width:0;padding:10px 12px;border:1px solid #3b718466;border-radius:14px;background:linear-gradient(135deg,#102d40,#0a1b29)}.bpNeoStatV1 small{display:block;color:#8fb4c2;font-size:12px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.bpNeoStatV1 strong{display:block;margin-top:3px;color:#e9fbff;font-size:20px;line-height:1.1;font-weight:950;overflow-wrap:anywhere}.bpNeoStatV1[data-tone="alert"] strong{color:#ffd08c}.bpNeoStatV1[data-tone="accent"] strong{color:#84f2ff}
      .bpNeoContentV1{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(330px,.85fr);gap:13px;min-height:0;padding:13px 16px}.bpNeoLeftV1,.bpNeoRightV1{display:flex;min-height:0;flex-direction:column;gap:11px}.bpNeoViewerV1{position:relative;min-height:225px;flex:0 0 min(39vh,340px);overflow:hidden;border:1px solid #3c8294;border-radius:17px;background:#030c15}.bpNeoViewerV1 #bpNeoStageV1{position:absolute;inset:0;display:block;width:100%;height:100%}.bpNeoViewerV1 #bpNeoStageV1 canvas{display:block;width:100%;height:100%}.bpNeoViewerBadgeV1{position:absolute;left:11px;top:10px;padding:6px 9px;border:1px solid #66d7ee5e;border-radius:99px;background:#061825d9;color:#b9f6ff;font-size:12px;font-weight:900;letter-spacing:.09em}.bpNeoViewerDistanceV1{position:absolute;right:11px;top:10px;padding:6px 9px;border:1px solid #5e829359;border-radius:99px;background:#061825d9;color:#eafaff;font-size:12px;font-weight:850}.bpNeoViewerFootV1{position:absolute;left:11px;right:11px;bottom:9px;color:#c0dce7;font-size:12px;line-height:1.35;text-shadow:0 1px 4px #000}
      .bpNeoDetailsV1{padding:13px;border:1px solid #3e6e7e;border-radius:16px;background:linear-gradient(145deg,#0c2535,#081823)}.bpNeoDetailsV1 h3{margin:0;color:#f2fdff;font-size:19px;line-height:1.2;overflow-wrap:anywhere}.bpNeoDesignationV1{margin:4px 0 11px;color:#87aab7;font-size:13px}.bpNeoFactsV1{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.bpNeoFactV1{min-width:0;padding:9px 10px;border:1px solid #ffffff14;border-radius:11px;background:#ffffff08}.bpNeoFactV1 small{display:block;color:#83a9b8;font-size:12px;font-weight:800;letter-spacing:.07em;text-transform:uppercase}.bpNeoFactV1 strong{display:block;margin-top:4px;color:#edfaff;font-size:14px;line-height:1.3;overflow-wrap:anywhere}.bpNeoObjectLinkV1{display:inline-flex;min-height:42px;align-items:center;margin-top:10px;padding:0 12px;border:1px solid #3e8297;border-radius:11px;background:#0a2231;color:#96f1ff;font-size:14px;font-weight:850;text-decoration:none}
      .bpNeoFilterV1{display:flex;gap:7px;flex-wrap:wrap}.bpNeoFilterV1 button,.bpNeoRefreshV1{min-height:42px;padding:0 12px;border:1px solid #3a6677;border-radius:11px;background:#091a27;color:#bbd2da;font:850 13px system-ui;letter-spacing:.025em;cursor:pointer}.bpNeoFilterV1 button[aria-pressed="true"]{border-color:#65e5f0;background:linear-gradient(130deg,#123d4e,#102b3d);color:#e8fdff;box-shadow:inset 0 0 20px #50dcee16}.bpNeoListHeadV1{display:flex;align-items:center;gap:9px}.bpNeoListHeadV1 h3{margin:0;color:#eaf9fd;font-size:15px;letter-spacing:.06em}.bpNeoListHeadV1 small{margin-left:auto;color:#82a7b4;font-size:12px}.bpNeoListV1{min-height:80px;flex:1;overflow:auto;overscroll-behavior:contain;padding-right:3px}.bpNeoRowV1{display:grid;width:100%;grid-template-columns:minmax(0,1fr) auto;gap:4px 10px;margin:0 0 7px;padding:11px 12px;border:1px solid #2c5262;border-radius:13px;background:linear-gradient(135deg,#0d2432,#091824);color:#e6f7fb;text-align:left;cursor:pointer}.bpNeoRowV1:hover,.bpNeoRowV1[aria-pressed="true"]{border-color:#58dce9;background:linear-gradient(135deg,#123749,#0b2130);box-shadow:0 0 20px #30d8e619}.bpNeoRowNameV1{min-width:0;overflow:hidden;font-size:14px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}.bpNeoRowDistanceV1{color:#8ff4ff;font-size:14px;font-weight:950;white-space:nowrap}.bpNeoRowMetaV1{grid-column:1/-1;color:#96b3bf;font-size:13px}.bpNeoFlagV1{display:inline-flex;min-height:24px;align-items:center;margin-left:6px;padding:0 7px;border:1px solid #a07739;border-radius:99px;background:#422f17;color:#ffd38d;font-size:11px;font-weight:950;letter-spacing:.05em;vertical-align:1px}.bpNeoStatusV1{min-height:42px;padding:10px 12px;border:1px solid #326175;border-radius:12px;background:#0b2231;color:#b9d7e1;font-size:13px;line-height:1.4}.bpNeoStatusV1[data-kind="error"]{border-color:#9f5964;color:#ffd0d3}.bpNeoStatusV1[data-kind="ok"]{border-color:#348879;color:#a6f0d8}.bpNeoEmptyV1{padding:17px;border:1px dashed #3b6475;border-radius:13px;color:#a9c1cb;font-size:14px;text-align:center}
      .bpNeoRiskNoteV1{padding:11px 12px;border:1px solid #9a743c66;border-radius:13px;background:linear-gradient(120deg,#352714,#201b16);color:#ecd8b6;font-size:13px;line-height:1.45}.bpNeoRiskNoteV1 strong{color:#ffdb9d}.bpNeoLinksV1{display:flex;gap:8px;flex-wrap:wrap}.bpNeoLinksV1 a{display:inline-flex;min-height:40px;align-items:center;padding:0 10px;border:1px solid #315c6e;border-radius:10px;background:#091a27;color:#8fe9f5;font-size:13px;font-weight:850;text-decoration:none}.bpNeoFootV1{padding:10px 16px;border-top:1px solid #96e8f21c;color:#809eaa;font-size:12px;line-height:1.45}.bpNeoFootV1 b{color:#b7dce7}.bpNeoRefreshV1{margin-left:auto;border-color:#5c8290;color:#c7e6ef}.bpNeoRefreshV1:disabled{opacity:.55;cursor:wait}
      @media(max-width:780px){.bpNeoPanelV1{height:min(900px,100%);grid-template-rows:auto auto minmax(0,1fr) auto}.bpNeoContentV1{grid-template-columns:1fr;grid-template-rows:auto minmax(180px,1fr);overflow:auto}.bpNeoLeftV1{display:contents}.bpNeoViewerV1{min-height:210px;flex-basis:210px}.bpNeoDetailsV1{order:2}.bpNeoRightV1{display:contents}.bpNeoFilterV1{order:3}.bpNeoListHeadV1{order:4}.bpNeoListV1{order:5;max-height:260px}.bpNeoStatusV1{order:6}.bpNeoRiskNoteV1{order:7}.bpNeoLinksV1{order:8}.bpNeoSummaryV1{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:520px){#${BUTTON_ID}{min-height:42px;padding:0 10px;font-size:13px}.bpNeoPanelV1{border-radius:18px}.bpNeoHeadV1{padding:12px}.bpNeoSummaryV1{gap:6px;padding:9px}.bpNeoStatV1{padding:8px}.bpNeoStatV1 strong{font-size:18px}.bpNeoContentV1{gap:9px;padding:9px}.bpNeoViewerV1{min-height:190px;flex-basis:190px}.bpNeoFactsV1{grid-template-columns:1fr 1fr}.bpNeoFootV1{padding:8px 10px}.bpNeoFilterV1 button{flex:1}}
      @media(prefers-reduced-motion:reduce){#${BUTTON_ID}:hover,#${BUTTON_ID}:active{transform:none}}
    `;
    style.textContent += `
      #${BUTTON_ID}{position:relative!important;inset:auto!important;z-index:auto!important;width:100%;min-height:45px;margin:0;padding:7px 11px;border-radius:12px;color:#eafcff;font-size:12px;letter-spacing:.04em;box-shadow:inset 0 0 0 1px #6cecf55a,0 0 18px #3ce5ff18;background:linear-gradient(135deg,#0b2d3d,#101f31 72%,#18223b);justify-content:flex-start}
      #${BUTTON_ID} .bpNeoButtonLabelV1{font:900 12px/1.15 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.05em}
      #${BUTTON_ID} .bpv-command-icon{color:#7af1ff;text-shadow:0 0 15px #21dbff99}
      #${ROOT_ID}{align-items:flex-start;justify-content:flex-end;padding:12px;background:transparent;pointer-events:none}
      #${ROOT_ID} .bpNeoPanelV1{width:min(510px,calc(100vw - 20px));height:min(850px,calc(100dvh - 24px));pointer-events:auto;border-color:#67ddec75;background:radial-gradient(110% 35% at 100% 0%,#17415aa8 0%,transparent 82%),linear-gradient(155deg,#061722f2,#06121ef5 72%,#061b25f2);box-shadow:0 22px 65px #0009,0 0 34px #36d5ee22}
      #${ROOT_ID} .bpNeoContentV1{display:flex;flex-direction:column;gap:9px;overflow:auto;overscroll-behavior:contain}
      #${ROOT_ID} .bpNeoLeftV1,#${ROOT_ID} .bpNeoRightV1{display:contents}
      #${ROOT_ID} .bpNeoViewerV1{flex:0 0 205px;min-height:205px}
      #${ROOT_ID} .bpNeoSummaryV1{grid-template-columns:repeat(2,minmax(0,1fr))}
      #${ROOT_ID} .bpNeoListV1{flex:1 0 120px;max-height:230px}
      @media(max-width:700px){
        #${ROOT_ID}{align-items:flex-end;justify-content:center;padding:6px 6px calc(env(safe-area-inset-bottom) + 6px)}
        #${ROOT_ID} .bpNeoPanelV1{width:100%;height:min(76dvh,760px);border-radius:20px 20px 16px 16px}
        #${ROOT_ID} .bpNeoContentV1{gap:8px;padding:9px}
        #${ROOT_ID} .bpNeoViewerV1{flex-basis:185px;min-height:185px}
        #${ROOT_ID} .bpNeoListV1{max-height:190px}
      }`;
    document.head.appendChild(style);
  }

  function installButton() {
    const dock = $('#bpv-dock-actions');
    const existingButton = $('#' + BUTTON_ID);
    if (!dock || !document.body) {
      if (existingButton) existingButton.hidden = true;
      return;
    }
    installCSS();
    let button = existingButton;
    if (!button) {
      button = text('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.className = 'bpv-v2-tool-button';
      button.dataset.bpvCommandSection = 'Explore';
      button.setAttribute('aria-label', 'Open the near-Earth object tracker');
      button.setAttribute('aria-haspopup', 'dialog');
      button.setAttribute('aria-expanded', 'false');
      const icon = text('span', 'bpv-command-icon bpv-v2-icon', '◉');
      icon.setAttribute('aria-hidden', 'true');
      const label = text('span', 'bpNeoButtonLabelV1', 'NEAR-EARTH OBJECTS');
      button.append(icon, label);
      button.addEventListener('click', () => state.open ? closePanel() : openPanel());
    }
    if (button.parentElement !== dock) dock.appendChild(button);
    button.hidden = false;
  }

  function getBridgePointMap() {
    const world = window.__bpWorldV2300 || window.__BP_LANDING_WORLD__ || window.__BP_WORLD__;
    const map = world && world.map;
    return map && typeof map.flyTo === 'function' ? map : null;
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
      } : null;
    }
    const minZoom = Number(map.getMinZoom?.() ?? 0);
    const maxZoom = Number(map.getMaxZoom?.() ?? 24);
    const globalZoom = clamp(0.65, minZoom, maxZoom);
    map.flyTo({
      center: [0, 15],
      zoom: globalZoom,
      pitch: 0,
      bearing: 0,
      duration: 1800,
      essential: true,
    });
    return true;
  }

  function restoreMapCamera() {
    const map = getBridgePointMap();
    const camera = state.mapCamera;
    state.mapCamera = null;
    if (!map || !camera?.center || !Number.isFinite(camera.zoom)) return;
    map.flyTo({ ...camera, duration: 1200, essential: true });
  }

  function ensurePanel() {
    if ($('#' + ROOT_ID)) return;
    const root = text('section');
    root.id = ROOT_ID;
    root.hidden = true;
    root.setAttribute('role', 'complementary');
    root.setAttribute('aria-modal', 'false');
    root.setAttribute('aria-labelledby', 'bpNeoTitleV1');
    root.innerHTML = `
      <div class="bpNeoPanelV1">
        <header class="bpNeoHeadV1">
          <div class="bpNeoBrandV1">
            <p class="bpNeoKickerV1">NASA · NEAR-EARTH OBJECT WATCH</p>
            <h2 id="bpNeoTitleV1">Close approaches, in motion</h2>
            <p class="bpNeoSubheadV1">Asteroid passes in the rolling 7-day NASA feed</p>
          </div>
          <button class="bpNeoCloseV1" type="button" data-neo-action="close" aria-label="Close near-Earth object tracker">×</button>
        </header>
        <div class="bpNeoSummaryV1" aria-label="Near-Earth object summary">
          <div class="bpNeoStatV1" data-tone="accent"><small>Tracked this week</small><strong data-neo-stat="total">—</strong></div>
          <div class="bpNeoStatV1" data-tone="alert"><small>Hazard flagged</small><strong data-neo-stat="hazardous">—</strong></div>
          <div class="bpNeoStatV1"><small>Closest pass</small><strong data-neo-stat="closest">—</strong></div>
          <div class="bpNeoStatV1"><small>Last checked (UTC)</small><strong data-neo-stat="checked">—</strong></div>
        </div>
        <main class="bpNeoContentV1">
          <section class="bpNeoLeftV1" aria-label="Selected asteroid close approach">
            <div class="bpNeoViewerV1">
              <span class="bpNeoViewerBadgeV1">3D ORBIT SCHEMATIC · NOT TO SCALE</span>
              <span class="bpNeoViewerDistanceV1" data-neo-distance>Loading…</span>
              <div id="bpNeoStageV1" role="img" aria-label="Animated three-dimensional schematic of an asteroid passing Earth. Path, orientation, and scale are illustrative; the closest-approach distance comes from NASA data."></div>
              <span class="bpNeoViewerFootV1">Trajectory shape and object scale are illustrative; reported flyby distance is shown in the data card.</span>
            </div>
            <div class="bpNeoDetailsV1" data-neo-details></div>
          </section>
          <section class="bpNeoRightV1" aria-label="Upcoming asteroid approaches">
            <div class="bpNeoListHeadV1"><h3>UPCOMING APPROACHES</h3><small data-neo-window>Connecting to NASA…</small><button class="bpNeoRefreshV1" type="button" data-neo-action="playpause" aria-pressed="false">PAUSE PATH</button>
              <button class="bpNeoRefreshV1" type="button" data-neo-action="refresh">REFRESH NASA FEED</button></div>
            <nav class="bpNeoFilterV1" aria-label="Filter asteroid list">
              <button type="button" data-neo-filter="all" aria-pressed="true">ALL OBJECTS</button>
              <button type="button" data-neo-filter="close" aria-pressed="false">UNDER 1 LUNAR DISTANCE</button>
              <button type="button" data-neo-filter="hazardous" aria-pressed="false">HAZARD FLAG</button>
            </nav>
            <div class="bpNeoListV1" data-neo-list aria-live="polite"></div>
            <div class="bpNeoStatusV1" data-neo-status role="status" aria-live="polite">Connecting to NASA’s near-Earth object feed…</div>
            <div class="bpNeoRiskNoteV1" data-neo-risk><strong>Impact status:</strong> this close-approach feed does not predict an Earth hit point. A potentially hazardous classification is a screening flag, not a collision forecast.</div>
            <div class="bpNeoLinksV1">
              <a href="https://cneos.jpl.nasa.gov/ca/" target="_blank" rel="noopener noreferrer">NASA/JPL close approaches</a>
              <a href="https://cneos.jpl.nasa.gov/sentry/" target="_blank" rel="noopener noreferrer">NASA/JPL impact-risk table</a>
            </div>
          </section>
        </main>
        <footer class="bpNeoFootV1"><b>NASA/JPL NeoWs:</b> reported estimated diameter ranges, miss distance, relative velocity, and approach time. This 3D encounter is an animated schematic; its trajectory, orientation, and scale are not predictions. The feed does not provide exact object coordinates or an impact location. Auto-refresh checks every 6 hours and keeps the last successful snapshot if the source is unavailable.</footer>
      </div>`;
    root.addEventListener('click', onPanelClick);
    root.addEventListener('keydown', event => {
      if (event.key === 'Escape') closePanel();
    });
    document.body.appendChild(root);
  }

  function openPanel() {
    installButton();
    ensurePanel();
    focusGlobalMap();
    const root = $('#' + ROOT_ID);
    root.hidden = false;
    state.open = true;
    $('#' + BUTTON_ID)?.setAttribute('aria-expanded', 'true');
    render();
    loadFeed(false);
    $('#' + ROOT_ID + ' .bpNeoCloseV1')?.focus();
    startAnimation();
  }

  function closePanel() {
    const root = $('#' + ROOT_ID);
    if (!root) return;
    root.hidden = true;
    state.open = false;
    $('#' + BUTTON_ID)?.setAttribute('aria-expanded', 'false');
    if (state.frame) cancelAnimationFrame(state.frame);
    state.frame = 0;
    restoreMapCamera();
    $('#' + BUTTON_ID)?.focus();
  }

  function onPanelClick(event) {
    const action = event.target.closest('[data-neo-action]')?.dataset.neoAction;
    if (action === 'close') {
      closePanel();
      return;
    }
    if (action === 'playpause') {
      state.simulationPaused = !state.simulationPaused;
      state.simulationLastAt = 0;
      render();
      return;
    }
    const filter = event.target.closest('[data-neo-filter]')?.dataset.neoFilter;
    if (filter) {
      state.filter = filter;
      render();
      return;
    }
    const refresh = event.target.closest('[data-neo-action="refresh"]');
    if (refresh) {
      loadFeed(true);
      return;
    }
    const row = event.target.closest('[data-neo-id]');
    if (row) {
      state.selectedId = row.dataset.neoId;
      state.simulationProgress = 0;
      state.simulationLastAt = 0;
      render();
    }
    if (event.target === $('#' + ROOT_ID)) closePanel();
  }

  function parseApproach(item) {
    const approaches = Array.isArray(item.close_approach_data) ? item.close_approach_data : [];
    const approach = approaches.find(value => value && String(value.orbiting_body || '').toLowerCase() === 'earth') || approaches[0];
    if (!approach) return null;
    const distanceKm = number(approach.miss_distance?.kilometers);
    const lunarDistance = number(approach.miss_distance?.lunar);
    const velocityKps = number(approach.relative_velocity?.kilometers_per_second);
    const epochMs = number(approach.epoch_date_close_approach);
    if (distanceKm === null) return null;
    return {
      date: String(approach.close_approach_date || ''),
      dateFull: String(approach.close_approach_date_full || ''),
      epochMs,
      distanceKm,
      lunarDistance,
      velocityKps,
      orbitingBody: String(approach.orbiting_body || 'Earth'),
    };
  }

  function normalizeFeed(payload) {
    const groups = payload && payload.near_earth_objects;
    if (!groups || typeof groups !== 'object') throw new Error('NASA feed format was not recognized.');
    const items = Object.values(groups).flatMap(group => Array.isArray(group) ? group : []).map(raw => {
      const approach = parseApproach(raw);
      if (!approach) return null;
      const diameter = raw.estimated_diameter?.kilometers || {};
      const diameterMinKm = number(diameter.estimated_diameter_min);
      const diameterMaxKm = number(diameter.estimated_diameter_max);
      return {
        id: String(raw.id || raw.neo_reference_id || ''),
        name: String(raw.name || raw.designation || 'Uncatalogued asteroid'),
        designation: String(raw.designation || raw.name || '—'),
        diameterMinKm,
        diameterMaxKm,
        distanceKm: approach.distanceKm,
        lunarDistance: approach.lunarDistance,
        velocityKps: approach.velocityKps,
        date: approach.date,
        dateFull: approach.dateFull,
        epochMs: approach.epochMs,
        hazardous: raw.is_potentially_hazardous_asteroid === true,
        absoluteMagnitude: number(raw.absolute_magnitude_h),
        nasaUrl: typeof raw.nasa_jpl_url === 'string' && raw.nasa_jpl_url.startsWith('https://') ? raw.nasa_jpl_url : '',
      };
    }).filter(item => item && item.id);
    items.sort((a, b) => a.distanceKm - b.distanceKm);
    return items;
  }

  function feedDates() {
    const start = new Date();
    const end = new Date(start.getTime() + 6 * 24 * 60 * 60 * 1000);
    return {
      start: start.toISOString().slice(0, 10),
      end: end.toISOString().slice(0, 10),
    };
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
    if (!cache) return false;
    state.items = cache.items;
    state.checkedAt = cache.checkedAt;
    state.selectedId = state.selectedId || state.items[0]?.id || '';
    return true;
  }

  function setStatus(message, kind = 'info') {
    const node = $('#' + ROOT_ID + ' [data-neo-window]');
    if (node) node.textContent = message;
    const status = $('#' + ROOT_ID + ' [data-neo-status]');
    if (status) {
      status.textContent = message;
      status.dataset.kind = kind;
      status.hidden = !message;
    }
  }

  function lastCheckedLabel() {
    if (!state.checkedAt) return '—';
    return new Date(state.checkedAt).toLocaleTimeString(undefined, { timeZone: 'UTC', hour: '2-digit', minute: '2-digit' });
  }

  function updateSummary() {
    const total = $('[data-neo-stat="total"]');
    const hazardous = $('[data-neo-stat="hazardous"]');
    const closest = $('[data-neo-stat="closest"]');
    const checked = $('[data-neo-stat="checked"]');
    if (total) total.textContent = state.items.length.toLocaleString();
    if (hazardous) hazardous.textContent = state.items.filter(item => item.hazardous).length.toLocaleString();
    if (closest) closest.textContent = state.items.length ? formatDistance(state.items[0].distanceKm) : '—';
    if (checked) checked.textContent = lastCheckedLabel();
  }

  async function loadFeed(force) {
    if (state.loading) return;
    const cache = readCache();
    const fresh = cache && Date.now() - cache.checkedAt < REFRESH_MS;
    if (!force && fresh) {
      useCache(cache);
      state.error = '';
      render();
      setStatus('NASA snapshot checked ' + lastCheckedLabel() + ' UTC · next automatic check within 6 hours', 'ok');
      return;
    }
    if (force && cache && Date.now() - cache.checkedAt < MANUAL_COOLDOWN_MS) {
      useCache(cache);
      state.error = '';
      render();
      setStatus('The NASA feed was checked recently. Automatic refresh remains on a 6-hour cycle.', 'ok');
      return;
    }
    if (cache) useCache(cache);
    state.loading = true;
    state.error = '';
    render();
    setStatus('Loading NASA close-approach data…');
    try {
      const dates = feedDates();
      const url = new URL(NASA_FEED);
      url.searchParams.set('start_date', dates.start);
      url.searchParams.set('end_date', dates.end);
      url.searchParams.set('api_key', NASA_KEY);
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 16000);
      let response;
      try {
        response = await fetch(url.toString(), {
          method: 'GET',
          mode: 'cors',
          credentials: 'omit',
          headers: { Accept: 'application/json' },
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeout);
      }
      if (!response.ok) throw new Error('NASA feed returned HTTP ' + response.status + '.');
      const payload = await response.json();
      const items = normalizeFeed(payload);
      const checkedAt = Date.now();
      state.items = items;
      state.checkedAt = checkedAt;
      state.selectedId = state.items.some(item => item.id === state.selectedId) ? state.selectedId : (state.items[0]?.id || '');
      try { localStorage.setItem(CACHE_KEY, JSON.stringify({ checkedAt, items })); } catch (_) { /* The live feed still works when browser storage is unavailable. */ }
      setStatus('NASA snapshot checked ' + lastCheckedLabel() + ' UTC · next automatic check within 6 hours', 'ok');
    } catch (error) {
      state.error = error && error.name === 'AbortError' ? 'NASA feed request timed out.' : String(error?.message || 'NASA feed is temporarily unavailable.');
      if (state.items.length) {
        setStatus('NASA feed is temporarily unavailable. Showing the last saved snapshot from ' + lastCheckedLabel() + ' UTC.', 'error');
      } else {
        setStatus('NASA feed is temporarily unavailable. Try again later or open the NASA/JPL close-approach table.', 'error');
      }
    } finally {
      state.loading = false;
      render();
    }
  }

  function selectedItem() {
    return state.items.find(item => item.id === state.selectedId) || state.items[0] || null;
  }

  function filteredItems() {
    if (state.filter === 'hazardous') return state.items.filter(item => item.hazardous);
    if (state.filter === 'close') return state.items.filter(item => item.lunarDistance !== null && item.lunarDistance < 1);
    return state.items;
  }

  function formatDistance(km) {
    const value = number(km);
    if (value === null) return '—';
    if (value >= 1000000) return (value / 1000000).toLocaleString(undefined, { maximumFractionDigits: 2 }) + 'M km';
    return Math.round(value).toLocaleString() + ' km';
  }

  function formatDiameter(minKm, maxKm) {
    if (minKm === null || maxKm === null) return 'Not reported';
    if (maxKm < 1) {
      return Math.round(minKm * 1000).toLocaleString() + '–' + Math.round(maxKm * 1000).toLocaleString() + ' m';
    }
    return minKm.toFixed(2) + '–' + maxKm.toFixed(2) + ' km';
  }

  function approachTime(item) {
    if (item.epochMs !== null) {
      return new Date(item.epochMs).toLocaleString(undefined, {
        timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }) + ' UTC';
    }
    return item.date || 'Time not reported';
  }

  function renderDetails(item) {
    const node = $('[data-neo-details]');
    const distance = $('[data-neo-distance]');
    if (!node) return;
    node.replaceChildren();
    if (!item) {
      const empty = text('div', 'bpNeoEmptyV1', state.loading ? 'Waiting for NASA’s close-approach feed…' : 'No asteroid approaches are listed in the current 7-day feed.');
      node.append(empty);
      if (distance) distance.textContent = 'No selection';
      return;
    }
    if (distance) distance.textContent = 'MISS ' + formatDistance(item.distanceKm);
    const title = text('h3', '', item.name);
    const subtitle = text('p', 'bpNeoDesignationV1', 'NASA designation ' + item.designation + ' · ' + approachTime(item));
    const facts = text('div', 'bpNeoFactsV1');
    const factData = [
      ['Estimated diameter range', formatDiameter(item.diameterMinKm, item.diameterMaxKm)],
      ['Closest approach', formatDistance(item.distanceKm)],
      ['Lunar distances', item.lunarDistance === null ? 'Not reported' : item.lunarDistance.toFixed(3) + ' LD'],
      ['Relative speed', item.velocityKps === null ? 'Not reported' : item.velocityKps.toFixed(2) + ' km/s'],
      ['NASA hazard flag', item.hazardous ? 'Potentially hazardous' : 'Not flagged'],
      ['Absolute magnitude', item.absoluteMagnitude === null ? 'Not reported' : item.absoluteMagnitude.toFixed(2) + ' H'],
    ];
    factData.forEach(([label, value]) => {
      const fact = text('div', 'bpNeoFactV1');
      fact.append(text('small', '', label), text('strong', '', value));
      facts.append(fact);
    });
    node.append(title, subtitle, facts);
    if (item.nasaUrl) {
      const link = text('a', 'bpNeoObjectLinkV1', 'OPEN NASA/JPL OBJECT RECORD');
      link.href = item.nasaUrl;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      node.append(link);
    }
  }

  function renderList() {
    const list = $('[data-neo-list]');
    if (!list) return;
    list.replaceChildren();
    const items = filteredItems();
    const windowLabel = $('[data-neo-window]');
    if (windowLabel) windowLabel.textContent = state.items.length ? 'NEXT 7 DAYS · CLOSEST FIRST' : 'ROLLING 7-DAY FEED';
    if (!items.length) {
      const message = state.loading ? 'Loading close approaches…' : (state.filter === 'hazardous' ? 'No hazard-flagged approaches appear in this feed window.' : state.filter === 'close' ? 'No listed approach is under one lunar distance in this feed window.' : 'No asteroid close approaches are listed in the current feed window.');
      list.append(text('div', 'bpNeoEmptyV1', message));
      return;
    }
    items.forEach(item => {
      const row = text('button', 'bpNeoRowV1');
      row.type = 'button';
      row.dataset.neoId = item.id;
      row.setAttribute('aria-pressed', String(item.id === (selectedItem()?.id || '')));
      const name = text('span', 'bpNeoRowNameV1', item.name);
      if (item.hazardous) name.append(text('span', 'bpNeoFlagV1', 'HAZARD FLAG'));
      const distance = text('span', 'bpNeoRowDistanceV1', formatDistance(item.distanceKm));
      const meta = text('span', 'bpNeoRowMetaV1', formatDiameter(item.diameterMinKm, item.diameterMaxKm) + ' · ' + approachTime(item));
      row.append(name, distance, meta);
      list.append(row);
    });
  }

  function render() {
    if (!state.open) return;
    ensurePanel();
    updateSummary();
    const selected = selectedItem();
    renderDetails(selected);
    renderList();
    $('#' + ROOT_ID)?.querySelectorAll('[data-neo-filter]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.neoFilter === state.filter));
    });
    const playPause = $('[data-neo-action="playpause"]');
    if (playPause) {
      playPause.setAttribute('aria-pressed', String(state.simulationPaused));
      playPause.textContent = state.simulationPaused ? 'PLAY PATH' : 'PAUSE PATH';
    }
    const refresh = $('[data-neo-action="refresh"]');
    if (refresh) {
      refresh.disabled = state.loading;
      refresh.textContent = state.loading ? 'LOADING…' : 'REFRESH NASA FEED';
    }
    if (selected) drawFrame(performance.now());
  }

  function hash(value) {
    let result = 2166136261;
    for (let i = 0; i < value.length; i += 1) result = Math.imul(result ^ value.charCodeAt(i), 16777619);
    return result >>> 0;
  }

  function makeEarthTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const ocean = ctx.createLinearGradient(0, 0, 0, 512);
    ocean.addColorStop(0, '#0d4c78'); ocean.addColorStop(.48, '#0a68a0'); ocean.addColorStop(1, '#052747');
    ctx.fillStyle = ocean; ctx.fillRect(0, 0, 1024, 512);
    const polygons = [
      [[.08,.21],[.14,.14],[.22,.15],[.28,.21],[.31,.30],[.27,.36],[.25,.44],[.20,.47],[.17,.41],[.12,.38],[.10,.30]],
      [[.27,.48],[.32,.46],[.37,.52],[.38,.62],[.36,.72],[.34,.83],[.31,.91],[.29,.79],[.28,.68],[.25,.57]],
      [[.44,.23],[.48,.19],[.52,.22],[.55,.29],[.54,.39],[.51,.45],[.49,.55],[.46,.68],[.43,.63],[.42,.50],[.40,.40],[.42,.31]],
      [[.46,.18],[.53,.14],[.61,.16],[.66,.19],[.72,.18],[.82,.24],[.88,.31],[.86,.40],[.81,.46],[.75,.42],[.70,.47],[.64,.42],[.59,.45],[.56,.38],[.52,.37],[.50,.29]],
      [[.76,.58],[.82,.56],[.87,.60],[.89,.67],[.86,.73],[.80,.74],[.77,.68]],
      [[.91,.40],[.94,.42],[.95,.48],[.92,.51],[.90,.47]],
      [[.06,.53],[.10,.51],[.13,.55],[.12,.59],[.08,.60]],
    ];
    polygons.forEach(points => {
      ctx.beginPath();
      points.forEach(([x, y], index) => index ? ctx.lineTo(x * 1024, y * 512) : ctx.moveTo(x * 1024, y * 512));
      ctx.closePath();
      ctx.fillStyle = '#5fba8e'; ctx.fill();
      ctx.strokeStyle = '#91e6b6'; ctx.lineWidth = 3; ctx.globalAlpha = .42; ctx.stroke(); ctx.globalAlpha = 1;
    });
    for (let i = 0; i < 110; i += 1) {
      const x = (i * 127 + 37) % 1024; const y = (i * 73 + 19) % 512;
      ctx.fillStyle = i % 3 ? 'rgba(78,197,223,.10)' : 'rgba(197,239,255,.13)';
      ctx.beginPath(); ctx.arc(x, y, (i % 4) + 1, 0, Math.PI * 2); ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, scene3d.renderer?.capabilities.getMaxAnisotropy?.() || 1);
    return texture;
  }

  function addGraticule(radius) {
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({ color: 0x9beaff, transparent: true, opacity: .17 });
    for (let latitude = -60; latitude <= 60; latitude += 30) {
      const lat = latitude * Math.PI / 180;
      const points = [];
      for (let step = 0; step <= 120; step += 1) {
        const lon = step / 120 * Math.PI * 2;
        points.push(new THREE.Vector3(radius * Math.cos(lat) * Math.sin(lon), radius * Math.sin(lat), radius * Math.cos(lat) * Math.cos(lon)));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    }
    for (let meridian = 0; meridian < 12; meridian += 1) {
      const lon = meridian / 12 * Math.PI * 2;
      const points = [];
      for (let step = 0; step <= 80; step += 1) {
        const lat = (step / 80 - .5) * Math.PI;
        points.push(new THREE.Vector3(radius * Math.cos(lat) * Math.sin(lon), radius * Math.sin(lat), radius * Math.cos(lat) * Math.cos(lon)));
      }
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
    }
    return group;
  }

  function init3DScene() {
    if (scene3d.renderer || scene3d.failed) return;
    const host = $('#bpNeoStageV1');
    if (!host) return;
    try {
      scene3d.scene = new THREE.Scene();
      scene3d.scene.background = new THREE.Color(0x030b13);
      scene3d.camera = new THREE.PerspectiveCamera(38, 1, .1, 80);
      scene3d.camera.position.set(0, 0, 8.4);
      scene3d.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power' });
      scene3d.renderer.setPixelRatio(Math.min(1.75, window.devicePixelRatio || 1));
      scene3d.renderer.outputColorSpace = THREE.SRGBColorSpace;
      scene3d.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      scene3d.renderer.toneMappingExposure = 1.15;
      host.replaceChildren(scene3d.renderer.domElement);
      scene3d.scene.add(new THREE.HemisphereLight(0x9eeeff, 0x07101c, 1.25));
      const sun = new THREE.DirectionalLight(0xc8f4ff, 2.35);
      sun.position.set(-3.5, 4.5, 6); scene3d.scene.add(sun);
      const fill = new THREE.PointLight(0x168aff, 15, 15, 2);
      fill.position.set(3, -1, 3); scene3d.scene.add(fill);

      const earthGroup = new THREE.Group();
      const earth = new THREE.Mesh(
        new THREE.SphereGeometry(1.22, 56, 40),
        new THREE.MeshStandardMaterial({ map: makeEarthTexture(), roughness: .84, metalness: .08, emissive: 0x06243a, emissiveIntensity: .32 })
      );
      earthGroup.add(earth);
      earthGroup.add(addGraticule(1.232));
      const atmosphere = new THREE.Mesh(
        new THREE.SphereGeometry(1.3, 48, 32),
        new THREE.MeshBasicMaterial({ color: 0x35bcff, transparent: true, opacity: .19, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false })
      );
      earthGroup.add(atmosphere);
      scene3d.scene.add(earthGroup);
      scene3d.earth = earthGroup;

      const starPositions = new Float32Array(900 * 3);
      let seed = 632018;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      for (let i = 0; i < starPositions.length; i += 3) {
        starPositions[i] = (random() - .5) * 18;
        starPositions[i + 1] = (random() - .5) * 11;
        starPositions[i + 2] = (random() - .5) * 9 - 1.5;
      }
      const starsGeometry = new THREE.BufferGeometry();
      starsGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      scene3d.scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xb7e5ff, size: .022, sizeAttenuation: true, transparent: true, opacity: .74 })));

      const asteroidGeometry = new THREE.IcosahedronGeometry(.115, 2);
      const positions = asteroidGeometry.attributes.position;
      for (let i = 0; i < positions.count; i += 1) {
        const v = new THREE.Vector3().fromBufferAttribute(positions, i);
        const wobble = 1 + .13 * Math.sin(i * 2.71) + .075 * Math.cos(i * 4.13);
        positions.setXYZ(i, v.x * wobble, v.y * wobble, v.z * wobble);
      }
      asteroidGeometry.computeVertexNormals();
      scene3d.asteroid = new THREE.Mesh(asteroidGeometry, new THREE.MeshStandardMaterial({ color: 0xe39b50, roughness: .94, metalness: .02, emissive: 0x5b210d, emissiveIntensity: .72 }));
      scene3d.scene.add(scene3d.asteroid);
      scene3d.asteroidLight = new THREE.PointLight(0xffa54d, 1.6, 2.1, 2);
      scene3d.scene.add(scene3d.asteroidLight);
      scene3d.failed = false;
    } catch (error) {
      scene3d.failed = true;
      host.replaceChildren();
      host.textContent = 'The 3D encounter view could not start in this browser.';
      host.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;padding:24px;color:#b9d7e1;text-align:center;font:600 14px system-ui';
    }
  }

  function setTrajectory(item) {
    if (!scene3d.scene || !item || scene3d.currentId === item.id) return;
    [scene3d.path, scene3d.glowPath].forEach(object => {
      if (object) { scene3d.scene.remove(object); object.geometry.dispose(); object.material.dispose(); }
    });
    const seed = hash(item.id);
    const angle = (seed % 10000) / 10000 * Math.PI * 2;
    const radial = new THREE.Vector3(Math.cos(angle), Math.sin(angle) * .65, Math.sin(angle * 1.7) * .75).normalize();
    let tangent = new THREE.Vector3(-radial.y, radial.x, 0);
    if (tangent.lengthSq() < .04) tangent.set(1, 0, 0);
    tangent.normalize();
    const normal = radial.clone().cross(tangent).normalize();
    const missScale = 1.48 + Math.min(1.75, Math.log10(1 + Math.max(0, item.distanceKm) / 6371) * .34);
    const closest = radial.clone().multiplyScalar(missScale);
    const points = [
      closest.clone().addScaledVector(tangent, -5.4).addScaledVector(normal, 2.7),
      closest.clone().addScaledVector(tangent, -2.4).addScaledVector(normal, .13),
      closest.clone(),
      closest.clone().addScaledVector(tangent, 2.4).addScaledVector(normal, .13),
      closest.clone().addScaledVector(tangent, 5.4).addScaledVector(normal, 2.7),
    ];
    scene3d.curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', .45);
    const warm = item.hazardous ? 0xffb45e : 0x68efff;
    scene3d.glowPath = new THREE.Mesh(new THREE.TubeGeometry(scene3d.curve, 160, .052, 7, false), new THREE.MeshBasicMaterial({ color: warm, transparent: true, opacity: .13, depthWrite: false }));
    scene3d.path = new THREE.Mesh(new THREE.TubeGeometry(scene3d.curve, 160, .009, 6, false), new THREE.MeshBasicMaterial({ color: warm, transparent: true, opacity: .9 }));
    scene3d.scene.add(scene3d.glowPath, scene3d.path);
    scene3d.currentId = item.id;
  }

  function drawFrame(now) {
    const item = selectedItem();
    if (!item) return;
    init3DScene();
    if (!scene3d.renderer || !scene3d.scene) return;
    setTrajectory(item);
    const host = $('#bpNeoStageV1');
    const rect = host?.getBoundingClientRect();
    if (!rect || rect.width < 2 || rect.height < 2) return;
    const width = Math.floor(rect.width); const height = Math.floor(rect.height);
    if (width !== scene3d.width || height !== scene3d.height) {
      scene3d.renderer.setSize(width, height, false);
      scene3d.width = width; scene3d.height = height;
      scene3d.camera.aspect = width / height;
      scene3d.camera.updateProjectionMatrix();
    }
    if (scene3d.earth) scene3d.earth.rotation.y = now * .000035;
    const reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!state.simulationLastAt) state.simulationLastAt = now;
    const elapsed = Math.min(250, Math.max(0, now - state.simulationLastAt));
    state.simulationLastAt = now;
    if (!state.simulationPaused && !reducedMotion) state.simulationProgress = (state.simulationProgress + elapsed * .000085) % 1;
    const t = reducedMotion ? .5 : state.simulationProgress;
    const position = scene3d.curve.getPoint(t);
    scene3d.asteroid.position.copy(position);
    scene3d.asteroid.rotation.set(now * .00024, now * .00031, now * .00019);
    scene3d.asteroidLight.position.copy(position);
    scene3d.renderer.render(scene3d.scene, scene3d.camera);
  }

  function startAnimation() {
    if (state.frame || !state.open) return;
    const tick = now => {
      state.frame = 0;
      if (!state.open) return;
      if (!document.hidden && now - state.lastDraw > 28) {
        state.lastDraw = now;
        drawFrame(now);
      }
      state.frame = requestAnimationFrame(tick);
    };
    state.frame = requestAnimationFrame(tick);
  }

  function boot() {
    installCSS();
    ensurePanel();
    installButton();
    window.setInterval(installButton, 1200);
    window.addEventListener('resize', installButton, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.frame) {
        cancelAnimationFrame(state.frame);
        state.frame = 0;
      } else if (!document.hidden) startAnimation();
    });
    window.setInterval(() => {
      if (state.open && !document.hidden && Date.now() - state.checkedAt >= REFRESH_MS) loadFeed(false);
    }, 60000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
