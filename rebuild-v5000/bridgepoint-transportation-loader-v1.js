/* Lightweight BridgePoint Transportation launcher.
 * The 3D simulation bundle is requested only after the user presses this card button.
 */
(() => {
  'use strict';
  const control = window.__BP_TRANSPORTATION_LOADER_V1__ || (window.__BP_TRANSPORTATION_LOADER_V1__ = {});

  const MODULE_SRC = '/bridgepoint-transportation-v1.js?v=20261127-roadwork-closure-routing-v7';
  const ROADWORK_SRC = '/bridgepoint-roadwork-v1.js?v=20261127-roadwork-visible-area-v1';
  control.version = 2; control.loading = !!control.loading; control.loaded = !!control.loaded;

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

  function mountRoadworkButton() {
    const dock = document.querySelector('#bpv-dock-actions');
    if (!dock) return false;
    if (dock.querySelector('.bp-roadwork-v1-launcher')) return true;
    const group = document.createElement('section');
    group.className = 'bpv-command-group bp-roadwork-v1-launcher';
    group.dataset.bpvCommandSection = 'roadwork';
    group.setAttribute('aria-label', 'Mapped roadwork and road closures');
    const heading = document.createElement('div');
    heading.className = 'bpv-command-heading';
    const icon = document.createElement('span');
    icon.className = 'bpv-command-heading-icon';
    icon.textContent = '⚠';
    const copy = document.createElement('span');
    const title = document.createElement('b');
    title.textContent = 'ROADWORK';
    const subtitle = document.createElement('small');
    subtitle.textContent = 'Mapped closures · 3D barriers at street zoom';
    copy.append(title, subtitle); heading.append(icon, copy);
    const grid = document.createElement('div');
    grid.className = 'bpv-command-grid';
    grid.dataset.bpvCommandGrid = 'roadwork';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bpv-command-btn bp-roadwork-v1-toggle';
    button.setAttribute('aria-pressed', 'false');
    button.title = 'Show mapped construction and road closures for the visible area';
    const buttonIcon = document.createElement('span');
    buttonIcon.className = 'bpv-command-icon'; buttonIcon.setAttribute('aria-hidden', 'true'); buttonIcon.textContent = '⚠';
    const label = document.createElement('span');
    label.className = 'bpv-command-label'; label.textContent = 'Roadwork';
    button.append(buttonIcon, label);
    const setActive = on => {
      button.classList.toggle('active', !!on);
      button.setAttribute('aria-pressed', String(!!on));
      label.textContent = on ? 'Roadwork · ON' : 'Roadwork';
      button.title = on ? 'Hide mapped roadwork and closures' : 'Show mapped roadwork and closures for the visible area';
    };
    button.addEventListener('click', () => {
      const current = window.__BP_ROADWORK_V1__;
      if (current && typeof current.toggle === 'function') { setActive(current.toggle()); return; }
      button.disabled = true; label.textContent = 'Loading roadwork…';
      const script = document.createElement('script');
      script.async = true; script.src = ROADWORK_SRC;
      script.onload = () => {
        const api = window.__BP_ROADWORK_V1__;
        if (!api || typeof api.enable !== 'function') {
          button.disabled = false; label.textContent = 'Roadwork · Retry';
          button.title = 'The roadwork layer did not initialize. Press to retry.'; return;
        }
        api.enable(); setActive(true); button.disabled = false;
      };
      script.onerror = () => {
        button.disabled = false; label.textContent = 'Roadwork · Retry';
        button.title = 'The roadwork module could not be downloaded. Press to retry.';
      };
      document.head.appendChild(script);
    });
    grid.appendChild(button); group.append(heading, grid);
    const transport = dock.querySelector('.bp-transportation-v1-launcher,.bp-transportation-v1-group');
    if (transport && transport.parentElement === dock) dock.insertBefore(group, transport.nextSibling);
    else dock.appendChild(group);
    return true;
  }
  function mountAll() { const a = mountButton(); const b = mountRoadworkButton(); return a && b; }

  if (!mountAll() && typeof MutationObserver !== 'undefined' && document.documentElement) {
    const observer = new MutationObserver(() => {
      if (mountAll()) observer.disconnect();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
