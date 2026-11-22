/* BridgePoint Intelligence — signed-in 3D celestial explorer.
 * Reuses the same Three.js Earth/Moon/Sun scene, Gaia star catalogue,
 * Saturn and Mars systems, and local terrain/texture assets on either globe.
 */
(() => {
  'use strict';
  const BUILD = 'v6310-physical-heliocentric-scale-cloud-off';
  if (window.__BP_APP_SPACE_EXPLORER_V1__?.build === BUILD) return;

  const STYLE_ID = 'bpAppSpaceExplorerStylesV1';
  const STYLE = `
    #liveMap{position:relative!important}
    #bpWelcomeGateV1.bp-app-space-explorer{
      position:absolute!important;inset:0!important;z-index:40!important;
      display:block!important;overflow:hidden!important;isolation:isolate!important;
      background:transparent!important;pointer-events:none!important;
    }
    #bpWelcomeGateV1.bp-app-space-explorer[hidden]{display:none!important}
    #bpWelcomeGateV1.bp-app-space-explorer:before,
    #bpWelcomeGateV1.bp-app-space-explorer:after{content:none!important;display:none!important}
    #bpWelcomeGateV1.bp-app-space-explorer .bpw-celestial-system{
      position:absolute!important;inset:0!important;z-index:1!important;
      overflow:hidden!important;pointer-events:none!important;
    }
    #bpWelcomeGateV1.bp-app-space-explorer .bpw-space-renderer-canvas{
      position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
      display:block!important;pointer-events:auto!important;touch-action:none!important;
    }
    #bpWelcomeGateV1.bp-app-space-explorer .bpw-space-controls{
      position:absolute!important;top:12px!important;right:12px!important;
      z-index:100!important;pointer-events:auto!important;
    }
    #bpWelcomeGateV1.bp-app-space-explorer [data-app-space-close]{
      appearance:none!important;border:1px solid rgba(160,205,238,.50)!important;
      border-radius:999px!important;padding:8px 11px!important;
      background:rgba(5,15,29,.88)!important;color:#eaf7ff!important;
      font:800 10px/1.1 system-ui,sans-serif!important;letter-spacing:.07em!important;
      box-shadow:0 4px 16px rgba(0,0,0,.35)!important;pointer-events:auto!important;
    }
    #bpAppSpaceToggleV1[aria-pressed="true"]{border-color:#8fd8ff!important;color:#bdeaff!important}
    .preview-head-actions #bpAppSpaceToggleV1{
      flex:none;min-height:28px;padding:6px 9px;border:1px solid rgba(160,205,238,.50);
      border-radius:9px;background:rgba(5,15,29,.86);color:#eaf7ff;
      font:900 8px/1.1 Inter,system-ui,sans-serif;letter-spacing:.055em;
      white-space:nowrap;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.22);
    }
    .preview-head-actions #bpAppSpaceToggleV1[aria-pressed="true"]{
      border-color:rgba(87,220,255,.85);background:rgba(5,45,64,.94);color:#fff;
    }
    @media(max-width:620px){
      .preview-head-actions #bpAppSpaceToggleV1{min-height:26px;padding:5px 7px;font-size:7px}
    }
  `;
  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.appendChild(style);
  }

  function init() {
    const appMap = document.getElementById('liveMap');
    const landingMap = document.getElementById('previewMap');
    const landingMode = !appMap && !!landingMap;
    const map = appMap || landingMap;
    const tools = landingMode
      ? document.querySelector('.preview-head-actions')
      : document.querySelector('.map-tools');
    if (!map || !tools) return false;
    if (document.getElementById('bpAppSpaceToggleV1')) return true;
    addStyles();

    const toggle = document.createElement('button');
    toggle.id = 'bpAppSpaceToggleV1';
    toggle.type = 'button';
    toggle.textContent = 'SPACE 3D';
    toggle.title = 'Open the interactive 3D Sun, Moon, Saturn, Mars and their moons';
    toggle.setAttribute('aria-pressed', 'false');
    tools.appendChild(toggle);

    let overlay = null;
    let loading = null;
    let open = false;

    function getRenderer() {
      const api = window.__BP_WELCOME_SPACE_V6257__;
      return api && typeof api === 'object' && typeof api.mountTo === 'function' ? api : null;
    }

    function getMapInstance() {
      const activeElement = document.getElementById('liveMap') || document.getElementById('previewMap');
      const candidates = [
        window.__BP_V5000_WORLD__?.map,
        window.__bpWorldV2300?.map,
        window.__BP_LANDING_WORLD__?.map,
        window.__BP_WORLD__?.map,
      ].filter((candidate, index, list) => candidate && list.indexOf(candidate) === index);
      if (activeElement) {
        const active = candidates.find(candidate => {
          const container = candidate.getContainer?.();
          return container && (container === activeElement || activeElement.contains(container) || container.contains(activeElement));
        });
        if (active) return active;
      }
      return candidates[0] || null;
    }

    function syncMapCanvas(distanceRatio, earthProjection) {
      const mapInstance = getMapInstance();
      const mapCanvas = mapInstance?.getCanvas?.() || map.querySelector('canvas.maplibregl-canvas');
      if (!mapCanvas) return null;
      if (mapCanvas.dataset.bpSpaceVisibilitySaved !== '1') {
        mapCanvas.dataset.bpSpacePriorVisibility = mapCanvas.style.visibility || '';
        mapCanvas.dataset.bpSpaceVisibilitySaved = '1';
      }
      const host = overlay?.querySelector('.bpw-celestial-system');
      const hostRect = host?.getBoundingClientRect?.();
      const mapRect = mapInstance?.getContainer?.()?.getBoundingClientRect?.();
      let scale;
      let transform;
      if (earthProjection && Number.isFinite(earthProjection.x) && Number.isFinite(earthProjection.y) && Number.isFinite(earthProjection.radiusPx)) {
        if (earthProjection.visible === false) {
          mapCanvas.style.visibility = 'hidden';
          return 0;
        }
        mapCanvas.style.visibility = mapCanvas.dataset.bpSpacePriorVisibility;
        const originX = hostRect && mapRect ? hostRect.left - mapRect.left : 0;
        const originY = hostRect && mapRect ? hostRect.top - mapRect.top : 0;
        const targetX = originX + earthProjection.x;
        const targetY = originY + earthProjection.y;
        const baseRadius = Math.max(1, 512 * Math.pow(2, Number(mapInstance?.getZoom?.()) || 0) / (Math.PI * 2));
        scale = Math.max(0.000001, Math.min(8, earthProjection.radiusPx / baseRadius));
        const dx = targetX - (mapRect?.width || window.innerWidth) / 2;
        const dy = targetY - (mapRect?.height || window.innerHeight) / 2;
        transform = 'translate3d(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px,0) scale(' + scale.toFixed(8) + ')';
      } else {
        mapCanvas.style.visibility = mapCanvas.dataset.bpSpacePriorVisibility;
        const ratio = Number(distanceRatio);
        const safeRatio = Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
        scale = Math.max(0.000001, Math.min(1, 1 / safeRatio));
        transform = scale < 0.999999 ? 'scale(' + scale.toFixed(8) + ')' : '';
      }
      if (mapCanvas.dataset.bpSpaceTransform !== transform) {
        mapCanvas.style.transformOrigin = '50% 50%';
        mapCanvas.style.transform = transform;
        mapCanvas.style.willChange = transform ? 'transform' : '';
        mapCanvas.dataset.bpSpaceScale = String(scale);
        mapCanvas.dataset.bpSpaceTransform = transform;
      }
      return scale;
    }

    async function focusGlobalMapForSpace() {
      const deadline = Date.now() + 15000;
      let mapInstance = null;
      while (Date.now() < deadline) {
        const candidate = getMapInstance();
        if (candidate && (typeof candidate.jumpTo === 'function' || typeof candidate.flyTo === 'function')) { mapInstance = candidate; break; }
        await new Promise(resolve => window.setTimeout(resolve, 100));
      }
      if (!mapInstance) return false;
      const shortestSide = Math.min(window.innerWidth || 390, window.innerHeight || 780);
      const fittedZoom = Math.max(0.75, Math.min(2.7, Math.log2((shortestSide * 0.80) / (512 / Math.PI)))) - 0.12;
      const currentZoom = Number(mapInstance.getZoom?.());
      const zoom = Number.isFinite(currentZoom) ? Math.min(currentZoom, fittedZoom) : fittedZoom;
      const view = { center: [0, 18], zoom, pitch: 0, bearing: 0, essential: true };
      mapInstance.stop?.();
      if (typeof mapInstance.jumpTo === 'function') mapInstance.jumpTo(view);
      else mapInstance.flyTo({ ...view, duration: 0 });
      return true;
    }

    function ensureOverlay() {
      if (overlay?.isConnected) return overlay;
      overlay = document.createElement('div');
      overlay.id = 'bpWelcomeGateV1';
      overlay.className = 'bp-app-space-explorer';
      overlay.hidden = true;
      overlay.setAttribute('role', 'region');
      overlay.setAttribute('aria-label', 'Interactive 3D celestial system');
      if (!getRenderer()) {
        const host = document.createElement('div');
        host.className = 'bpw-celestial-system';
        host.setAttribute('aria-hidden', 'true');
        overlay.appendChild(host);
      }
      const activeMapElement = document.getElementById('liveMap') || document.getElementById('previewMap') || map;
      activeMapElement.appendChild(overlay);
      return overlay;
    }

    function closeExplorer() {
      open = false;
      if (overlay) overlay.hidden = true;
      try { getRenderer()?.pause?.(); } catch (_) {}
      syncMapCanvas(1);
      toggle.setAttribute('aria-pressed', 'false');
      toggle.textContent = 'SPACE 3D';
      toggle.disabled = false;
    }

    function installCloseControl() {
      const controls = overlay?.querySelector('.bpw-space-controls');
      if (!controls) return false;
      if (controls.querySelector('[data-app-space-close]')) return true;
      const close = document.createElement('button');
      close.type = 'button';
      close.dataset.appSpaceClose = '1';
      close.textContent = 'CLOSE SPACE';
      close.setAttribute('aria-label', 'Close 3D celestial explorer and return to the property map');
      close.addEventListener('click', closeExplorer);
      controls.appendChild(close);
      return true;
    }

    async function loadRenderer() {
      const current = getRenderer();
      if (current) return current;
      if (!loading) {
        loading = import('/bridgepoint-welcome-space-v6260.js?v=v6410-physical-heliocentric-scale-cloud-off&space=app-explorer-v1')
          .then(() => {
            const api = getRenderer();
            if (!api) throw new Error('The 3D celestial scene did not register its renderer');
            return api;
          })
          .finally(() => { loading = null; });
      }
      return loading;
    }

    async function openExplorer() {
      if (open) return;
      open = true;
      const target = ensureOverlay();
      target.hidden = false;
      toggle.disabled = true;
      toggle.textContent = 'LOADING SPACE…';
      toggle.setAttribute('aria-pressed', 'true');
      try {
        window.__BP_WELCOME_SYNC_SPACE_ZOOM_V1__ = syncMapCanvas;
        const api = await loadRenderer();
        if (!open) { api.pause?.(); syncMapCanvas(1); return; }
        if (!api.mountTo(overlay)) throw new Error('The 3D celestial scene could not attach to this globe');
        api.resume?.();
        if (!landingMode) {
          await focusGlobalMapForSpace();
          await api.loadSolarCosmos?.();
          api.focusSpaceOverview?.(32);
        }
        if (!installCloseControl()) {
          throw new Error('The 3D scene loaded without its space controls');
        }
        toggle.textContent = 'SPACE OPEN';
        toggle.disabled = false;
      } catch (error) {
        console.error('[BridgePoint app space explorer] Unable to open the 3D celestial scene:', error);
        closeExplorer();
        toggle.textContent = 'SPACE RETRY';
        toggle.title = 'The 3D celestial scene could not be loaded. Tap to retry.';
      }
    }

    toggle.addEventListener('click', () => {
      if (open) closeExplorer();
      else void openExplorer();
    });

    window.__BP_APP_SPACE_EXPLORER_V1__ = {
      build: BUILD,
      open: openExplorer,
      close: closeExplorer,
      get state() {
        return {
          open,
          rendererReady: !!getRenderer(),
          solarCosmos: window.__BP_SOLAR_COSMOS_V6280__?.state?.status || 'loading',
          entry: landingMode ? 'homepage-globe' : 'signed-in-app-globe'
        };
      }
    };
    if (!landingMode) window.setTimeout(() => { if (!open) void openExplorer(); }, 650);
    return true;
  }

  function bootWhenMapIsReady() {
    if (init()) return;
    const observer = new MutationObserver(() => {
      if (init()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 120000);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootWhenMapIsReady, { once: true });
  } else {
    bootWhenMapIsReady();
  }
})();
