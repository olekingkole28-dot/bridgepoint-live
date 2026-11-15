/* BridgePoint Intelligence — app-mounted 3D celestial explorer.
 * Reuses the same Three.js welcome-space scene, Gaia catalogue, Saturn system,
 * Mars system, and locally hosted terrain/texture assets used by the homepage.
 * The overlay is opt-in so ordinary property-map gestures are never intercepted.
 */
(() => {
  'use strict';
  const BUILD = 'v1-restored-celestial-system';
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
  `;
  function addStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE;
    document.head.appendChild(style);
  }

  function init() {
    const map = document.getElementById('liveMap');
    const tools = document.querySelector('.map-tools');
    if (!map || !tools) return false;
    if (document.getElementById('bpAppSpaceToggleV1')) return true;
    addStyles();

    const toggle = document.createElement('button');
    toggle.id = 'bpAppSpaceToggleV1';
    toggle.type = 'button';
    toggle.textContent = 'SPACE 3D';
    toggle.title = 'Open the interactive 3D Sun, Moon and planetary systems';
    toggle.setAttribute('aria-pressed', 'false');
    tools.appendChild(toggle);

    let overlay = null;
    let loading = null;
    let open = false;

    function ensureOverlay() {
      if (overlay?.isConnected) return overlay;
      overlay = document.createElement('div');
      overlay.id = 'bpWelcomeGateV1';
      overlay.className = 'bp-app-space-explorer';
      overlay.hidden = true;
      overlay.setAttribute('role', 'region');
      overlay.setAttribute('aria-label', 'Interactive 3D celestial system');
      const host = document.createElement('div');
      host.className = 'bpw-celestial-system';
      host.setAttribute('aria-hidden', 'true');
      overlay.appendChild(host);
      map.appendChild(overlay);
      return overlay;
    }

    function closeExplorer() {
      open = false;
      if (overlay) overlay.hidden = true;
      try { window.__BP_WELCOME_SPACE_V6257__?.pause?.(); } catch (_) {}
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
      close.setAttribute('aria-label', 'Close 3D celestial explorer and return to property map');
      close.addEventListener('click', closeExplorer);
      controls.appendChild(close);
      return true;
    }

    async function loadRenderer() {
      const current = window.__BP_WELCOME_SPACE_V6257__;
      if (current) return current;
      if (!loading) {
        loading = import('/bridgepoint-welcome-space-v6260.js?v=6292-mars-night-side-shading')
          .then(() => {
            const api = window.__BP_WELCOME_SPACE_V6257__;
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
      ensureOverlay().hidden = false;
      toggle.disabled = true;
      toggle.textContent = 'LOADING SPACE…';
      toggle.setAttribute('aria-pressed', 'true');
      try {
        const api = await loadRenderer();
        if (!open) { api.pause?.(); return; }
        api.resume?.();
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
          rendererReady: !!window.__BP_WELCOME_SPACE_V6257__,
          solarCosmos: window.__BP_SOLAR_COSMOS_V6280__?.state?.status || 'loading'
        };
      }
    };
    return true;
  }

  if (!init()) {
    const retry = () => {
      if (init()) document.removeEventListener('DOMContentLoaded', retry);
    };
    document.addEventListener('DOMContentLoaded', retry, { once: true });
  }
})();
