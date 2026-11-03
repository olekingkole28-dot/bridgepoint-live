/* Lightweight BridgePoint Transportation launcher.
 * The 3D simulation bundle is requested only after the user presses this card button.
 */
(() => {
  'use strict';
  if (window.__BP_TRANSPORTATION_LOADER_V1__) return;

  const MODULE_SRC = '/bridgepoint-transportation-v1.js?v=2-dots-first-adaptive-lod';
  const control = window.__BP_TRANSPORTATION_LOADER_V1__ = {
    version: 1, loading: false, loaded: false
  };

  function mountButton() {
    const dock = document.querySelector('#bpv-dock-actions');
    if (!dock) return false;
    if (dock.querySelector('.bp-transportation-v1-launcher') ||
        dock.querySelector('.bp-transportation-v1-group')) return true;

    const group = document.createElement('section');
    group.className = 'bpv-command-group bp-transportation-v1-launcher';
    group.dataset.bpvCommandSection = 'transportation';
    group.setAttribute('aria-label', 'Transportation simulation');

    const heading = document.createElement('div');
    heading.className = 'bpv-command-heading';
    const headingIcon = document.createElement('span');
    headingIcon.className = 'bpv-command-heading-icon';
    headingIcon.textContent = '▰';
    const headingCopy = document.createElement('span');
    const title = document.createElement('b');
    title.textContent = 'TRANSPORTATION';
    const subtitle = document.createElement('small');
    subtitle.textContent = 'Road vehicles · 3D traffic simulation';
    headingCopy.append(title, subtitle);
    heading.append(headingIcon, headingCopy);

    const grid = document.createElement('div');
    grid.className = 'bpv-command-grid';
    grid.dataset.bpvCommandGrid = 'transportation';

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bpv-command-btn bp-transportation-v1-toggle';
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Load and show the simulated 3D road-vehicle traffic layer';
    const buttonIcon = document.createElement('span');
    buttonIcon.className = 'bpv-command-icon';
    buttonIcon.setAttribute('aria-hidden', 'true');
    buttonIcon.textContent = '▰';
    const label = document.createElement('span');
    label.className = 'bpv-command-label';
    label.textContent = 'Transportation';
    button.append(buttonIcon, label);

    button.addEventListener('click', () => {
      if (control.loading || window.__BP_TRANSPORTATION_V1__) return;
      control.loading = true;
      button.disabled = true;
      label.textContent = 'Loading transportation…';
      button.title = 'Loading the 3D transportation simulation';

      const script = document.createElement('script');
      script.async = true;
      script.src = MODULE_SRC;
      script.onload = () => {
        const startSimulation = () => {
          const api = window.__BP_TRANSPORTATION_V1__;
          if (!api || typeof api.enable !== 'function') {
            control.loading = false;
            button.disabled = false;
            label.textContent = 'Transportation · Retry';
            button.title = 'The simulation did not initialize. Press to retry.';
            return;
          }
          let started = false;
          try { started = api.enable() !== false; } catch (_) { started = false; }
          control.loading = false;
          if (!started) {
            button.disabled = false;
            label.textContent = 'Transportation · Retry';
            button.title = 'The simulation could not start. Press to retry.';
            return;
          }
          group.remove();
          control.loaded = true;
        };
        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', startSimulation, { once: true });
        } else {
          startSimulation();
        }
      };
      script.onerror = () => {
        control.loading = false;
        button.disabled = false;
        label.textContent = 'Transportation · Retry';
        button.title = 'The simulation could not be downloaded. Press to retry.';
      };
      document.head.appendChild(script);
    });

    grid.appendChild(button);
    group.append(heading, grid);
    const mapGroup = dock.querySelector('[data-bpv-command-section="map"]');
    if (mapGroup && mapGroup.parentElement === dock) dock.insertBefore(group, mapGroup.nextSibling);
    else dock.appendChild(group);
    return true;
  }

  if (!mountButton() && typeof MutationObserver !== 'undefined' && document.documentElement) {
    const observer = new MutationObserver(() => {
      if (mountButton()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
