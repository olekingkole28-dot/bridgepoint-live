import * as THREE from '/vendor/three.module.js?v=169-local';

/* BridgePoint Earth Protection layer v1. */
(() => {
  'use strict';

  const VERSION = '1.0.0';
  if (window.__BP_EARTH_PROTECTION_V1__?.version === VERSION) return;

  const BUTTON_ID = 'bpEarthProtectionLaunchV1';
  const ROOT_ID = 'bpEarthProtectionHudV1';
  const STYLE_ID = 'bpEarthProtectionStyleV1';
  const WIND_URL = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_wind_1m.json';
  const MAG_URL = 'https://services.swpc.noaa.gov/json/rtsw/rtsw_mag_1m.json';
  const OZONE_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
  const state = {
    open: false,
    paused: false,
    mode: 'magnetosphere',
    raf: 0,
    lastFrame: 0,
    time: 0,
    feedTimer: 0,
    feed: { density: 5, speed: 400, bz: 0, pressure: 1.34, r0: 10, live: false, checkedAt: 0, source: 'nominal model' },
    targetR0: 10,
    smoothR0: 10,
    dockState: null,
    closeControlState: null,
    openedExplorer: false,
    spaceApi: null,
    solarApi: null,
    scene: null,
    camera: null,
    earthMesh: null,
    root: null,
    magnetosphere: null,
    ozoneGroup: null,
    ozoneTexture: null,
    ozoneStatus: 'NASA daily ozone layer loading…',
    streamCurves: [],
    streamParticles: [],
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  const number = value => {
    const result = Number(value);
    return Number.isFinite(result) ? result : null;
  };

  function setStatus(message, tone = 'info') {
    const node = $('#' + ROOT_ID + ' [data-shield-status]');
    if (!node) return;
    node.textContent = message;
    node.dataset.tone = tone;
  }

  function injectStyle() {
    if ($('#' + STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .bpEarthProtectionButtonV1{white-space:nowrap}
      #${BUTTON_ID}[hidden],#${ROOT_ID}[hidden]{display:none!important}
      #${ROOT_ID}{position:fixed;inset:0;z-index:2147483600;pointer-events:none;color:#effcff;font:600 13px/1.4 system-ui,-apple-system,Segoe UI,sans-serif}
      #${ROOT_ID} *{box-sizing:border-box}
      .bpShieldHudCardV1{position:absolute;top:calc(env(safe-area-inset-top) + 12px);left:12px;width:min(570px,calc(100vw - 24px));padding:12px;border:1px solid #69e4f277;border-radius:17px;background:linear-gradient(135deg,#061a29ee,#0a2836dc);box-shadow:0 12px 32px #0009,0 0 24px #32dcef22;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);pointer-events:auto}
      .bpShieldTopLineV1{display:flex;align-items:flex-start;gap:12px}.bpShieldBrandV1{min-width:0;flex:1}.bpShieldKickerV1{margin:0 0 2px;color:#82f2ff;font-size:11px;font-weight:950;letter-spacing:.15em}.bpShieldTitleV1{margin:0;color:#effcff;font-size:clamp(16px,4vw,20px);font-weight:950;line-height:1.1;letter-spacing:.01em}.bpShieldDescriptionV1{margin:4px 0 0;color:#a6c4d0;font-size:12px;line-height:1.35}
      .bpShieldActionsV1{display:flex;flex-wrap:wrap;align-items:center;gap:7px;margin-top:10px}.bpShieldActionsV1 button{min-height:37px;padding:0 11px;border:1px solid #4a8393;border-radius:11px;background:#081c2b;color:#c8e8ef;font:900 11px/1 system-ui,-apple-system,Segoe UI,sans-serif;letter-spacing:.04em;cursor:pointer;touch-action:manipulation}.bpShieldActionsV1 button[data-selected="true"]{border-color:#80f3f4;background:linear-gradient(130deg,#155064,#0e3244);color:#f3ffff;box-shadow:inset 0 0 14px #67ecf22c,0 0 12px #2bdcec24}.bpShieldActionsV1 button[data-shield-action="exit"]{margin-left:auto;border-color:#795c65;color:#ffdddf}
      .bpShieldReadoutV1{margin:9px 0 0;padding-top:8px;border-top:1px solid #b6f4ff20;color:#bed7df;font-size:11px;line-height:1.4}.bpShieldReadoutV1 strong{color:#83efff;font-weight:900}.bpShieldStatusV1{display:block;margin-top:5px;color:#9fbcc8}.bpShieldStatusV1[data-tone="error"]{color:#ffc3c8}.bpShieldStatusV1[data-tone="ok"]{color:#a5f1d0}
      .bpShieldFootV1{position:absolute;left:12px;right:12px;bottom:calc(env(safe-area-inset-bottom) + 15px);width:min(700px,calc(100vw - 24px));margin:auto;padding:8px 11px;border:1px solid #4b8a9a77;border-radius:12px;background:#061724d9;color:#a8c5d0;font-size:10px;line-height:1.4;text-align:center;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);pointer-events:auto}
      @media(max-width:520px){.bpShieldHudCardV1{top:calc(env(safe-area-inset-top) + 8px);left:8px;width:calc(100vw - 16px);padding:10px;border-radius:14px}.bpShieldActionsV1{gap:6px}.bpShieldActionsV1 button{min-height:35px;padding:0 9px;font-size:10px}.bpShieldReadoutV1{font-size:10px}.bpShieldFootV1{left:8px;right:8px;width:calc(100vw - 16px);bottom:calc(env(safe-area-inset-bottom) + 8px);font-size:9px}}
      @media(prefers-reduced-motion:reduce){.bpShieldHudCardV1,.bpShieldFootV1{scroll-behavior:auto}}
    `;
    document.head.appendChild(style);
  }

  function installButton() {
    const dock = $('#bpv-dock-actions');
    if (!dock) return;
    injectStyle();
    let button = $('#' + BUTTON_ID);
    if (!button) {
      button = document.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.className = 'bpv-v2-tool-button bpEarthProtectionButtonV1';
      button.dataset.bpvCommandSection = 'Explore';
      button.textContent = '◉  EARTH SHIELD';
      button.setAttribute('aria-label', 'Show the moving 3D Earth protection layers');
      button.setAttribute('aria-pressed', 'false');
      button.addEventListener('click', openShield);
    }
    if (button.parentElement !== dock) dock.appendChild(button);
    button.hidden = false;
  }

  function ensureHud() {
    if ($('#' + ROOT_ID)) return;
    const root = document.createElement('section');
    root.id = ROOT_ID;
    root.hidden = true;
    root.setAttribute('aria-label', 'Earth protection layer controls');
    root.innerHTML = `
      <div class="bpShieldHudCardV1">
        <div class="bpShieldTopLineV1">
          <div class="bpShieldBrandV1">
            <p class="bpShieldKickerV1">BRIDGEPOINT · EARTH PROTECTION</p>
            <h2 class="bpShieldTitleV1">Moving shield layers</h2>
            <p class="bpShieldDescriptionV1">Earth-centered 3D view · zoom or pass through the transparent shell</p>
          </div>
        </div>
        <div class="bpShieldActionsV1">
          <button type="button" data-shield-mode="magnetosphere" data-selected="true">MAGNETOSPHERE</button>
          <button type="button" data-shield-mode="ozone" data-selected="false">OZONE LAYER</button>
          <button type="button" data-shield-action="pause">PAUSE</button>
          <button type="button" data-shield-action="exit">EXIT</button>
        </div>
        <div class="bpShieldReadoutV1" data-shield-readout></div>
        <span class="bpShieldStatusV1" data-shield-status role="status" aria-live="polite">Opening the shared 3D Earth scene…</span>
      </div>
      <div class="bpShieldFootV1" data-shield-note></div>`;
    root.addEventListener('click', onHudClick);
    root.addEventListener('keydown', event => { if (event.key === 'Escape') closeShield(); });
    document.body.appendChild(root);
  }

  function hideDock(hide) {
    const dock = $('#bpv-dock');
    if (!dock) return;
    if (hide) {
      if (state.dockState) return;
      state.dockState = {
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
    if (!state.dockState) return;
    const prior = state.dockState;
    if (prior.visibility) dock.style.setProperty('visibility', prior.visibility, prior.visibilityPriority);
    else dock.style.removeProperty('visibility');
    if (prior.pointerEvents) dock.style.setProperty('pointer-events', prior.pointerEvents, prior.pointerEventsPriority);
    else dock.style.removeProperty('pointer-events');
    if (prior.ariaHidden === null) dock.removeAttribute('aria-hidden');
    else dock.setAttribute('aria-hidden', prior.ariaHidden);
    state.dockState = null;
  }

  function hideSpaceCloseControl(hide) {
    const control = $('[data-app-space-close]');
    if (!control) return;
    if (hide) {
      if (!state.closeControlState) state.closeControlState = { hidden: control.hidden };
      control.hidden = true;
      return;
    }
    if (state.closeControlState) control.hidden = state.closeControlState.hidden;
    state.closeControlState = null;
  }

  async function waitFor(predicate, timeoutMs = 30000) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline && state.open) {
      const value = predicate();
      if (value) return value;
      await new Promise(resolve => window.setTimeout(resolve, 100));
    }
    return null;
  }

  async function openSharedScene() {
    const app = await waitFor(() => {
      const candidate = window.__BP_APP_SPACE_EXPLORER_V1__;
      return candidate && typeof candidate.open === 'function' ? candidate : null;
    });
    if (!app) throw new Error('The shared BridgePoint space viewer is not available.');
    state.openedExplorer = !app.state?.open;
    await app.open();
    const api = await waitFor(() => {
      const candidate = window.__BP_WELCOME_SPACE_V6257__;
      return candidate && typeof candidate.getScene === 'function' && typeof candidate.getCamera === 'function' ? candidate : null;
    });
    if (!api) throw new Error('The shared 3D globe did not finish loading.');
    await api.loadSolarCosmos?.();
    api.resume?.();
    api.setNearEarthOrbitMode?.(true);
    const solar = await waitFor(() => {
      const candidate = window.__BP_SOLAR_COSMOS_V6280__;
      const frame = candidate?.getFrame?.();
      return candidate && frame?.heliocentric ? candidate : null;
    });
    if (!solar) throw new Error('The Earth orbital scene did not finish loading.');
    const earthMesh = solar.getBody?.('earth')?.mesh;
    if (!earthMesh) throw new Error('The Earth model is not available in the shared scene.');
    state.spaceApi = api;
    state.solarApi = solar;
    state.scene = api.getScene();
    state.camera = api.getCamera();
    state.earthMesh = earthMesh;
    createLayerObjects();
    const center = solar.getEarthPosition?.() || earthMesh.getWorldPosition(new THREE.Vector3());
    const sunward = center.clone().negate();
    if (sunward.lengthSq() < 1e-12) sunward.set(1, 0, 0);
    api.focusSpacePoint?.(center, 1.2, sunward.normalize());
    solar.update?.();
    updateReadout();
    void loadOzoneTexture();
    void refreshSolarWind();
  }

  function createLayerObjects() {
    if (!state.scene || state.root) return;
    const root = new THREE.Group();
    root.name = 'BridgePoint live Earth protection visualization';
    root.frustumCulled = false;
    state.root = root;

    const shellGeometry = new THREE.SphereGeometry(1, 96, 64);
    const positions = shellGeometry.attributes.position;
    const local = new THREE.Vector3();
    for (let i = 0; i < positions.count; i += 1) {
      local.fromBufferAttribute(positions, i).normalize();
      const tail = Math.pow((1 - local.x) * 0.5, 1.65);
      const flare = 9.8 + 18.5 * tail;
      const lateral = 7.9 + 4.6 * clamp((-local.x + 0.18) / 1.18, 0, 1);
      positions.setXYZ(i, local.x * flare, local.y * lateral, local.z * lateral);
    }
    positions.needsUpdate = true;
    shellGeometry.computeVertexNormals();
    const shellMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthTest: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      toneMapped: false,
      uniforms: {
        uTime: { value: 0 },
        uStress: { value: 0.2 },
        uOpacity: { value: 0.30 },
      },
      vertexShader: `
        varying vec3 vLocal;
        varying vec3 vNormalView;
        varying vec3 vViewPosition;
        void main(){
          vLocal=position;
          vec4 mvPosition=modelViewMatrix*vec4(position,1.0);
          vViewPosition=-mvPosition.xyz;
          vNormalView=normalize(normalMatrix*normal);
          gl_Position=projectionMatrix*mvPosition;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uStress;
        uniform float uOpacity;
        varying vec3 vLocal;
        varying vec3 vNormalView;
        varying vec3 vViewPosition;
        void main(){
          vec3 viewDir=normalize(vViewPosition);
          float rim=pow(1.0-abs(dot(normalize(vNormalView),normalize(viewDir))),2.3);
          float nose=smoothstep(1.0,9.5,vLocal.x);
          float band=.5+.5*sin(vLocal.y*.72+vLocal.z*.42+uTime*.55);
          vec3 green=vec3(.08,.91,.63);
          vec3 cyan=vec3(.12,.78,1.0);
          vec3 amber=vec3(1.0,.69,.16);
          vec3 red=vec3(1.0,.20,.18);
          vec3 hue=mix(green,cyan,.58);
          hue=mix(hue,amber,nose*(.22+.44*uStress));
          hue=mix(hue,red,nose*max(0.0,uStress-.55)*.48);
          hue=mix(hue,vec3(.16,.93,.80),band*.08);
          float alpha=uOpacity*(.22+rim*.88)*(0.78+band*.22);
          gl_FragColor=vec4(hue,alpha);
        }
      `,
    });
    const shell = new THREE.Mesh(shellGeometry, shellMaterial);
    shell.name = 'Live-pressure-driven magnetopause shell';
    shell.renderOrder = 12;
    root.add(shell);

    const fieldGroup = new THREE.Group();
    fieldGroup.name = 'Modeled geomagnetic field lines';
    for (const L of [1.9, 2.5, 3.2, 4.1, 5.1, 6.4]) {
      for (let side = 0; side < 2; side += 1) {
        const phi = side * Math.PI * 0.5 + (L * 0.19);
        const points = [];
        for (let j = 0; j <= 84; j += 1) {
          const theta = 0.07 + (Math.PI - 0.14) * j / 84;
          const r = L * Math.pow(Math.sin(theta), 2);
          points.push(new THREE.Vector3(
            r * Math.sin(theta) * Math.cos(phi),
            r * Math.cos(theta),
            r * Math.sin(theta) * Math.sin(phi)
          ));
        }
        const line = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: side ? 0x63dbff : 0x7cf0ba, transparent: true, opacity: 0.30, depthTest: true, depthWrite: false, toneMapped: false })
        );
        line.renderOrder = 13;
        fieldGroup.add(line);
      }
    }
    root.add(fieldGroup);
    state.magnetosphere = new THREE.Group();
    state.magnetosphere.name = 'Magnetosphere mode';
    state.magnetosphere.add(shell, fieldGroup);
    state.magnetosphere.scale.setScalar(0.012);
    root.add(state.magnetosphere);

    const ozoneGroup = new THREE.Group();
    ozoneGroup.name = 'Daily total-column ozone layer';
    const ozoneGeometry = new THREE.SphereGeometry(1.04, 96, 64);
    const ozoneMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.56,
      side: THREE.DoubleSide,
      depthTest: true,
      depthWrite: false,
      toneMapped: false,
    });
    const ozone = new THREE.Mesh(ozoneGeometry, ozoneMaterial);
    ozone.name = 'NASA OMI daily ozone raster on a thin visible shell';
    ozone.renderOrder = 14;
    ozoneGroup.add(ozone);
    const ozoneRim = new THREE.Mesh(
      new THREE.SphereGeometry(1.048, 80, 56),
      new THREE.ShaderMaterial({
        transparent: true, depthTest: true, depthWrite: false, side: THREE.BackSide, toneMapped: false,
        uniforms: { uTime: { value: 0 } },
        vertexShader: 'varying vec3 vNormalView; varying vec3 vViewPosition; void main(){vec4 mvPosition=modelViewMatrix*vec4(position,1.0);vViewPosition=-mvPosition.xyz;vNormalView=normalize(normalMatrix*normal);gl_Position=projectionMatrix*mvPosition;}',
        fragmentShader: 'uniform float uTime; varying vec3 vNormalView; varying vec3 vViewPosition; void main(){float edge=pow(1.0-abs(dot(normalize(vNormalView),normalize(vViewPosition))),2.2);float sweep=.5+.5*sin(uTime*.7);vec3 c=mix(vec3(.10,.78,.95),vec3(.22,1.0,.68),sweep);gl_FragColor=vec4(c,edge*.34);}',
      })
    );
    ozoneRim.renderOrder = 15;
    ozoneGroup.add(ozoneRim);
    root.add(ozoneGroup);
    ozoneGroup.scale.setScalar(0.012);
    state.ozoneGroup = ozoneGroup;
    state.scene.add(root);
    state.ozoneGroup.visible = false;
    buildSolarWindParticles();
  }

  function buildSolarWindParticles() {
    if (!state.root) return;
    const colors = [0x69f4ff, 0x9ef6db, 0xffd66e];
    for (let lane = 0; lane < 3; lane += 1) {
      const sign = lane === 1 ? -1 : 1;
      const offset = lane === 2 ? 4 : 0;
      const points = [
        new THREE.Vector3(25, sign * (9 + offset), sign * (4 + offset * 0.4)),
        new THREE.Vector3(14, sign * (8.5 + offset), sign * (3 + offset * 0.5)),
        new THREE.Vector3(9, sign * (11 + offset), sign * (8 + offset * 0.5)),
        new THREE.Vector3(-1, sign * (15 + offset), sign * (10 + offset * 0.4)),
        new THREE.Vector3(-15, sign * (17 + offset), sign * (7 + offset * 0.5)),
        new THREE.Vector3(-29, sign * (15 + offset), sign * (4 + offset * 0.3)),
      ];
      const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal', 0.35);
      state.streamCurves.push(curve);
      const line = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(100)),
        new THREE.LineBasicMaterial({ color: colors[lane], transparent: true, opacity: 0.17, depthTest: true, depthWrite: false, toneMapped: false })
      );
      line.name = 'Solar-wind deflection guide';
      line.renderOrder = 11;
      state.magnetosphere.add(line);
      for (let i = 0; i < 8; i += 1) {
        const particle = new THREE.Mesh(
          new THREE.SphereGeometry(0.075, 8, 6),
          new THREE.MeshBasicMaterial({ color: colors[lane], transparent: true, opacity: 0.78, depthTest: true, depthWrite: false, toneMapped: false })
        );
        particle.name = 'Animated solar-wind stream particle';
        particle.userData.curveIndex = lane;
        particle.userData.phase = (i / 8 + lane * 0.13) % 1;
        particle.renderOrder = 16;
        state.magnetosphere.add(particle);
        state.streamParticles.push(particle);
      }
    }
  }

  function renderOzoneImage(time) {
    const url = new URL(OZONE_WMS);
    url.search = new URLSearchParams({
      service: 'WMS', request: 'GetMap', version: '1.1.1',
      layers: 'OMI_Ozone_DOAS_Total_Column', styles: '', format: 'image/png',
      transparent: 'true', width: '1024', height: '512', srs: 'EPSG:4326',
      bbox: '-180,-90,180,90', time,
    }).toString();
    return url.toString();
  }

  async function loadOzoneTexture() {
    if (!state.open || !state.ozoneGroup || state.ozoneTexture) return;
    state.ozoneStatus = 'Loading NASA OMI total-column ozone…';
    updateReadout();
    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    const base = new Date();
    base.setUTCHours(0, 0, 0, 0);
    let lastError = null;
    for (let day = 1; day <= 7 && state.open; day += 1) {
      const date = new Date(base.getTime() - day * 86400000).toISOString().slice(0, 10);
      try {
        const texture = await new Promise((resolve, reject) => loader.load(renderOzoneImage(date), resolve, undefined, reject));
        if (!state.open) { texture.dispose(); return; }
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.wrapS = THREE.RepeatWrapping;
        texture.anisotropy = 4;
        texture.needsUpdate = true;
        state.ozoneTexture = texture;
        const mesh = state.ozoneGroup.children.find(child => child.isMesh && child.name.startsWith('NASA OMI'));
        if (mesh?.material) mesh.material.map = texture;
        state.ozoneStatus = 'NASA OMI daily ozone raster · ' + date + ' UTC';
        updateReadout();
        return;
      } catch (error) { lastError = error; }
    }
    state.ozoneStatus = lastError ? 'NASA OMI raster unavailable · try again later' : 'NASA OMI raster unavailable';
    setStatus(state.ozoneStatus, 'error');
    updateReadout();
  }

  function latestRecord(payload) {
    if (!Array.isArray(payload)) return null;
    const rows = payload.filter(row => row && typeof row === 'object' && row.time_tag);
    const active = rows.filter(row => row.active === true || row.active === 'true' || row.active === 1 || row.active === '1');
    const candidates = active.length ? active : rows;
    candidates.sort((a, b) => String(b.time_tag).localeCompare(String(a.time_tag)));
    return candidates[0] || null;
  }

  function numericField(row, keys) {
    for (const key of keys) {
      const value = number(row?.[key]);
      if (value !== null) return value;
    }
    return null;
  }

  async function getJson(url) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 12000);
    try {
      const response = await fetch(url, { cache: 'no-store', mode: 'cors', credentials: 'omit', headers: { Accept: 'application/json' }, signal: controller.signal });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return await response.json();
    } finally { window.clearTimeout(timeout); }
  }

  async function refreshSolarWind() {
    if (!state.open) return;
    try {
      const [windData, magData] = await Promise.all([getJson(WIND_URL), getJson(MAG_URL)]);
      const wind = latestRecord(windData);
      const mag = latestRecord(magData);
      const density = numericField(wind, ['proton_density', 'density', 'protonDensity']);
      const speed = numericField(wind, ['proton_speed', 'speed', 'protonSpeed']);
      const bz = numericField(mag, ['bz_gsm', 'bz', 'Bz_GSM']);
      if (density === null || speed === null) throw new Error('No current active solar-wind sample');
      const dynamicPressure = Math.max(0.05, 1.6726219e-6 * density * speed * speed);
      const z = bz ?? 0;
      const noseRadius = clamp((10.22 + 1.29 * Math.tanh(0.184 * (z + 8.14))) * Math.pow(dynamicPressure, -1 / 6.6), 6, 14);
      const timestamp = String(wind?.time_tag || '');
      const ageMinutes = timestamp ? (Date.now() - Date.parse(timestamp + (timestamp.endsWith('Z') ? '' : 'Z'))) / 60000 : Infinity;
      const live = Number.isFinite(ageMinutes) && ageMinutes >= -2 && ageMinutes < 45;
      state.feed = {
        density, speed, bz: z, pressure: dynamicPressure, r0: noseRadius,
        live, checkedAt: Date.now(), source: live ? (wind?.active ? 'NOAA active L1 feed' : 'NOAA recent L1 feed') : 'NOAA feed stale',
      };
      state.targetR0 = noseRadius;
      setStatus(live ? 'NOAA solar-wind data connected · shell response updating' : 'NOAA data is delayed · showing the last sample', live ? 'ok' : 'info');
    } catch (error) {
      state.feed.live = false;
      state.feed.checkedAt = Date.now();
      state.feed.source = 'nominal model · NOAA unavailable';
      setStatus('NOAA solar-wind feed unavailable · using a gently moving nominal model', 'info');
    }
    updateReadout();
  }

  function updateReadout() {
    const readout = $('#' + ROOT_ID + ' [data-shield-readout]');
    const note = $('#' + ROOT_ID + ' [data-shield-note]');
    if (!readout || !note) return;
    if (state.mode === 'magnetosphere') {
      const f = state.feed;
      readout.innerHTML = '<strong>' + (f.live ? 'LIVE NOAA SOLAR WIND' : 'SOLAR-WIND MODEL') + '</strong> · ' + f.density.toFixed(1) + ' cm⁻³ · ' + Math.round(f.speed) + ' km/s · ' + f.pressure.toFixed(2) + ' nPa · nose ~' + state.smoothR0.toFixed(1) + ' R⊕';
      note.textContent = 'Magnetopause shape is a NOAA pressure-driven model; field lines and outer distance are enlarged for visibility. Animated particles show solar-wind flow bending around the shell.';
    } else {
      readout.innerHTML = '<strong>GLOBAL OZONE</strong> · ' + state.ozoneStatus;
      note.textContent = 'NASA OMI total-column ozone is a daily Dobson-unit measurement. The translucent shell altitude and rim shimmer are visual aids; they are not a live atmospheric forecast.';
    }
  }

  function setMode(mode) {
    state.mode = mode === 'ozone' ? 'ozone' : 'magnetosphere';
    if (state.magnetosphere) state.magnetosphere.visible = state.mode === 'magnetosphere';
    if (state.ozoneGroup) state.ozoneGroup.visible = state.mode === 'ozone';
    for (const button of document.querySelectorAll('#' + ROOT_ID + ' [data-shield-mode]')) {
      button.dataset.selected = String(button.dataset.shieldMode === state.mode);
      button.setAttribute('aria-pressed', String(button.dataset.shieldMode === state.mode));
    }
    updateReadout();
    if (state.mode === 'ozone' && !state.ozoneTexture) void loadOzoneTexture();
  }

  function onHudClick(event) {
    const modeButton = event.target.closest('[data-shield-mode]');
    if (modeButton) { setMode(modeButton.dataset.shieldMode); return; }
    const action = event.target.closest('[data-shield-action]')?.dataset.shieldAction;
    if (action === 'pause') {
      state.paused = !state.paused;
      const button = $('[data-shield-action="pause"]', $('#' + ROOT_ID));
      if (button) button.textContent = state.paused ? 'PLAY' : 'PAUSE';
      if (button) button.setAttribute('aria-pressed', String(state.paused));
      return;
    }
    if (action === 'exit') closeShield();
  }

  function animate(now) {
    state.raf = 0;
    if (!state.open) return;
    const delta = state.lastFrame ? clamp((now - state.lastFrame) / 1000, 0, 0.08) : 0.016;
    state.lastFrame = now;
    if (!document.hidden && state.root && state.camera && state.solarApi) {
      state.solarApi.update?.();
      const earthPosition = state.solarApi.getEarthPosition?.();
      const frame = state.solarApi.getFrame?.();
      if (earthPosition && frame) {
        state.root.position.copy(earthPosition);
        const sun = frame.sun?.isVector3 ? frame.sun : new THREE.Vector3(0, 0, 0);
        const sunward = sun.clone().sub(earthPosition);
        if (sunward.lengthSq() < 1e-12) sunward.set(1, 0, 0);
        state.root.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), sunward.normalize());
        const displayRadius = Number(state.earthMesh?.userData?.bpDisplayRadiusWorld)
          || Number(state.earthMesh?.userData?.bpPhysicalRadiusWorld)
          || state.earthMesh?.getWorldScale?.(new THREE.Vector3())?.x
          || 0.012;
        state.smoothR0 = THREE.MathUtils.damp(state.smoothR0, state.targetR0, 0.65, delta);
        const breathe = 1 + Math.sin(state.time * 0.72) * 0.012 + Math.sin(state.time * 0.24) * 0.007;
        const pressureScale = state.smoothR0 / 10;
        state.root.scale.setScalar(1);
        state.magnetosphere?.scale.setScalar(displayRadius * pressureScale * (state.paused ? 1 : breathe));
        state.ozoneGroup?.scale.setScalar(displayRadius);
        if (!state.paused) {
          state.time += delta;
          const shellMaterial = state.magnetosphere?.children?.find(child => child.name === 'Live-pressure-driven magnetopause shell')?.material;
          if (shellMaterial?.uniforms) {
            shellMaterial.uniforms.uTime.value = state.time;
            shellMaterial.uniforms.uStress.value = clamp((12.5 - state.smoothR0) / 6.5, 0, 1);
          }
          for (const particle of state.streamParticles) {
            const curve = state.streamCurves[particle.userData.curveIndex];
            if (!curve) continue;
            const phase = (particle.userData.phase + state.time * (0.045 + state.feed.speed / 25000)) % 1;
            particle.position.copy(curve.getPoint(phase));
            particle.material.opacity = 0.55 + 0.25 * Math.sin(state.time * 2.5 + particle.userData.phase * 20);
          }
          const rim = state.ozoneGroup?.children?.find(child => child.material?.uniforms?.uTime);
          if (rim?.material?.uniforms?.uTime) rim.material.uniforms.uTime.value = state.time;
        }
      }
      if (!state.paused && Math.floor(state.time * 2) !== Math.floor((state.time - delta) * 2)) updateReadout();
    }
    state.raf = requestAnimationFrame(animate);
  }

  async function openShield() {
    if (state.open) return;
    injectStyle();
    ensureHud();
    const root = $('#' + ROOT_ID);
    state.open = true;
    state.paused = false;
    state.mode = 'magnetosphere';
    root.hidden = false;
    $('#' + BUTTON_ID)?.setAttribute('aria-pressed', 'true');
    hideDock(true);
    hideSpaceCloseControl(true);
    setMode('magnetosphere');
    setStatus('Opening the shared 3D Earth scene…');
    const pauseButton = $('[data-shield-action="pause"]', root);
    if (pauseButton) { pauseButton.textContent = 'PAUSE'; pauseButton.setAttribute('aria-pressed', 'false'); }
    try {
      await openSharedScene();
      if (!state.open) return;
      window.clearInterval(state.feedTimer);
      state.feedTimer = window.setInterval(() => { if (state.open && !document.hidden) void refreshSolarWind(); }, 300000);
      setStatus(state.feed.live ? 'NOAA solar-wind data connected · shell response updating' : 'Earth-centered scene ready · loading live solar-wind data', state.feed.live ? 'ok' : 'info');
      startAnimation();
      $('[data-shield-action="exit"]', root)?.focus();
    } catch (error) {
      setStatus(String(error?.message || 'The Earth protection view could not be opened.'), 'error');
    }
  }

  function startAnimation() {
    if (!state.raf && state.open) state.raf = requestAnimationFrame(animate);
  }

  function disposeLayer() {
    if (!state.root) return;
    state.scene?.remove(state.root);
    state.root.traverse(object => {
      object.geometry?.dispose?.();
      if (Array.isArray(object.material)) object.material.forEach(material => material.dispose());
      else object.material?.dispose?.();
    });
    state.ozoneTexture?.dispose?.();
    state.ozoneTexture = null;
    state.root = null;
    state.magnetosphere = null;
    state.ozoneGroup = null;
    state.streamCurves = [];
    state.streamParticles = [];
  }

  function closeShield() {
    if (!state.open) return;
    state.open = false;
    state.paused = false;
    const root = $('#' + ROOT_ID);
    if (root) root.hidden = true;
    $('#' + BUTTON_ID)?.setAttribute('aria-pressed', 'false');
    if (state.raf) cancelAnimationFrame(state.raf);
    state.raf = 0;
    window.clearInterval(state.feedTimer);
    state.feedTimer = 0;
    disposeLayer();
    state.solarApi?.setNearEarthTrackingMode?.(false);
    if (state.openedExplorer) window.__BP_APP_SPACE_EXPLORER_V1__?.close?.();
    else state.spaceApi?.focusSpaceOverview?.(32);
    state.spaceApi = null;
    state.solarApi = null;
    state.scene = null;
    state.camera = null;
    state.earthMesh = null;
    state.openedExplorer = false;
    hideDock(false);
    hideSpaceCloseControl(false);
    $('#' + BUTTON_ID)?.focus();
  }

  function boot() {
    injectStyle();
    installButton();
    const observer = new MutationObserver(() => installButton());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 120000);
    window.setInterval(installButton, 1400);
    window.addEventListener('resize', () => {
      if (!state.open || !state.spaceApi) return;
      const center = state.solarApi?.getEarthPosition?.();
      if (center) state.spaceApi.focusSpacePoint?.(center, 1.2, center.clone().negate().normalize());
    }, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && state.raf) { cancelAnimationFrame(state.raf); state.raf = 0; }
      else if (!document.hidden) startAnimation();
    });
  }

  window.__BP_EARTH_PROTECTION_V1__ = { version: VERSION, open: openShield, close: closeShield, state };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, { once: true });
  else boot();
})();
