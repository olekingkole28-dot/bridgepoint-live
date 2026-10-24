// BridgePoint global celestial backdrop v6124.
// This is a transparent space backdrop only. The interactive Earth globe remains the map renderer.
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const wrapLng = value => ((((value + 180) % 360) + 360) % 360) - 180;
const RAD = Math.PI / 180;
const SIDEREAL_DEG_PER_SECOND = 360 / 86164.0905;
const PHASE_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14);
const SYNODIC_MONTH_MS = 29.530588853 * 86400000;

function initSpace(map, container, options = {}) {
  if (!map || !container) return null;
  const host = container.parentElement || container;
  if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
  const id = 'bp-space-canvas-v6124';
  let canvas = host.querySelector('#' + id);
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = id;
    canvas.setAttribute('aria-hidden', 'true');
    Object.assign(canvas.style, {
      position: 'absolute', inset: '0', width: '100%', height: '100%',
      zIndex: '1', pointerEvents: 'none', opacity: '0', transition: 'opacity 280ms ease',
      contain: 'strict'
    });
    host.appendChild(canvas);
  }
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return null;

  // Stable star coordinates: no randomization or twinkling on each frame.
  let seed = 6124;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const stars = Array.from({ length: 520 }, (_, i) => ({
    x: random(), y: random(), radius: 0.25 + random() * 0.9,
    alpha: 0.26 + random() * 0.62, hue: random() < 0.16 ? 205 : random() < 0.55 ? 215 : 0,
    phase: i
  }));
  let raf = 0, destroyed = false, pausedUntil = Date.now() + 4000, lastSpinAt = Date.now();
  let lastSize = '', lastDrawAt = 0, spinTimer = 0, solarTimer = 0;
  const listeners = [];

  function onMap(event, handler) {
    map.on?.(event, handler);
    listeners.push([event, handler]);
  }
  function pauseSpin(event) {
    if (event && event.originalEvent === undefined && event.type !== 'pointerdown' && event.type !== 'touchstart') return;
    pausedUntil = Date.now() + 25000;
    try { map.stop?.(); } catch (_) {}
    lastSpinAt = Date.now();
  }
  function viewportSize() {
    const rect = host.getBoundingClientRect();
    const dpr = Math.min(1.5, Math.max(1, window.devicePixelRatio || 1));
    const w = Math.max(1, Math.round(rect.width * dpr));
    const h = Math.max(1, Math.round(rect.height * dpr));
    const key = w + ':' + h;
    if (key !== lastSize) {
      canvas.width = w; canvas.height = h; lastSize = key;
    }
    return { w, h, dpr };
  }
  function moonPhase(date) {
    const phase = (((date.getTime() - PHASE_EPOCH_MS) / SYNODIC_MONTH_MS) % 1 + 1) % 1;
    return { phase, illumination: (1 - Math.cos(phase * Math.PI * 2)) * 0.5 };
  }
  function drawSun(x, y, radius, dpr) {
    const halo = ctx.createRadialGradient(x, y, radius * 0.18, x, y, radius * 3.6);
    halo.addColorStop(0, 'rgba(255,247,212,0.98)');
    halo.addColorStop(0.16, 'rgba(255,204,117,0.73)');
    halo.addColorStop(0.48, 'rgba(255,145,58,0.16)');
    halo.addColorStop(1, 'rgba(255,126,48,0)');
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(x, y, radius * 3.6, 0, Math.PI * 2); ctx.fill();
    const disk = ctx.createRadialGradient(x - radius * 0.24, y - radius * 0.24, radius * 0.04, x, y, radius);
    disk.addColorStop(0, '#fffef1');
    disk.addColorStop(0.45, '#ffedb8');
    disk.addColorStop(0.83, '#ffc15f');
    disk.addColorStop(1, '#f58b3d');
    ctx.fillStyle = disk;
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,232,168,0.32)';
    ctx.lineWidth = Math.max(0.55, dpr * 0.7);
    ctx.beginPath(); ctx.arc(x, y, radius * 1.24, 0, Math.PI * 2); ctx.stroke();
  }
  function drawMoon(x, y, radius, illumination, phase, dpr) {
    if (illumination < 0.012) return;
    const glow = ctx.createRadialGradient(x, y, radius * 0.15, x, y, radius * 2.6);
    glow.addColorStop(0, 'rgba(195,222,255,0.22)');
    glow.addColorStop(1, 'rgba(125,172,235,0)');
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, radius * 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#172534';
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    ctx.save();
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#dce9f4';
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    // Approximate phase terminator with a stable ellipse; phase is tied to the synodic month.
    ctx.globalCompositeOperation = 'destination-out';
    const waxing = phase < 0.5;
    const limb = Math.abs(Math.cos(phase * Math.PI * 2));
    ctx.beginPath();
    ctx.ellipse(x + (waxing ? 1 : -1) * radius * (1 - limb), y, Math.max(0.1, radius * limb), radius * 1.08, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = 'rgba(231,242,255,0.55)';
    ctx.lineWidth = Math.max(0.45, dpr * 0.6);
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.stroke();
  }
  function render(force = false) {
    if (destroyed || !ctx || document.hidden) return;
    const now = Date.now();
    if (!force && now - lastDrawAt < 80) return;
    lastDrawAt = now;
    const { w, h, dpr } = viewportSize();
    ctx.clearRect(0, 0, w, h);
    const zoom = Number(map.getZoom?.() ?? 10);
    const blend = clamp((2.35 - zoom) / 0.60, 0, 1);
    canvas.style.opacity = String(blend);
    if (blend <= 0 || zoom > 2.35) {
      canvas.dataset.active = 'false';
      publishState(zoom, 0, false);
      return;
    }
    canvas.dataset.active = 'true';
    const minDim = Math.min(w, h), cx = w * 0.5, cy = h * 0.5;
    const earthR = minDim * 0.465;
    // Paint the dark sky and fixed starfield, then make the Earth disk transparent.
    const bg = ctx.createRadialGradient(cx, cy, earthR * 0.85, cx, cy, minDim * 0.95);
    bg.addColorStop(0, 'rgba(2,7,16,0.04)');
    bg.addColorStop(0.45, 'rgba(2,7,16,0.68)');
    bg.addColorStop(1, 'rgba(0,2,8,0.96)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);
    const starAlpha = blend;
    for (const star of stars) {
      const x = star.x * w, y = star.y * h;
      const radius = star.radius * dpr;
      ctx.fillStyle = star.hue === 0
        ? 'rgba(255,235,205,' + (star.alpha * starAlpha) + ')'
        : 'rgba(190,220,255,' + (star.alpha * starAlpha) + ')';
      ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
    }

    const center = map.getCenter?.() || { lat: 0, lng: 0 };
    const date = new Date(now);
    let sun = null;
    try { sun = typeof options.solarPosition === 'function' ? options.solarPosition(date, center.lat, center.lng) : null; } catch (_) {}
    const sunAlt = Number.isFinite(Number(sun?.alt)) ? Number(sun.alt) : 0;
    const sunAz = Number.isFinite(Number(sun?.az)) ? Number(sun.az) : 135;
    const screenAngle = (sunAz - Number(map.getBearing?.() || 0)) * Math.PI / 180;
    const skyRadius = earthR + minDim * 0.105;
    const sunX = cx + Math.sin(screenAngle) * skyRadius;
    const sunY = cy - Math.cos(screenAngle) * skyRadius;
    drawSun(sunX, sunY, Math.max(6, minDim * 0.024), dpr);

    const moon = moonPhase(date);
    const moonAngle = screenAngle + Math.PI * (0.24 + moon.phase * 1.52);
    const moonRadius = earthR + minDim * 0.12;
    const moonX = cx + Math.sin(moonAngle) * moonRadius;
    const moonY = cy - Math.cos(moonAngle) * moonRadius;
    const moonAlpha = clamp((10 - sunAlt) / 18, 0.16, 0.98);
    if (moonAlpha > 0) {
      ctx.globalAlpha = moonAlpha * blend;
      drawMoon(moonX, moonY, Math.max(4, minDim * 0.012), moon.illumination, moon.phase, dpr);
      ctx.globalAlpha = 1;
    }

    // Reveal the original interactive globe through a clear aperture; controls and gestures stay live.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath(); ctx.arc(cx, cy, earthR + minDim * 0.006, 0, Math.PI * 2); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    publishState(zoom, starAlpha, true, sunAlt);
  }
  function requestDraw() {
    if (raf || destroyed) return;
    raf = requestAnimationFrame(() => { raf = 0; render(false); });
  }
  function publishState(zoom = Number(map.getZoom?.() ?? 10), starAlpha = 0, active = false, sunAltitude = null) {
    const state = {
      version: 6124, active, zoom, starCount: stars.length, stableStars: true,
      stationarySpaceBackdrop: true, transparentEarthAperture: true,
      mapCanvasHidden: false, cameraControlsDisabled: false,
      autoRotation: 'global-only sidereal-like drift; pauses for direct user input',
      sunAltitude, updatedAt: Date.now()
    };
    window.__BP_SPACE_V6124__ = state;
    return state;
  }
  const pointerPause = event => {
    pausedUntil = Date.now() + 25000;
    lastSpinAt = Date.now();
    try { map.stop?.(); } catch (_) {}
    requestDraw();
  };
  for (const eventName of ['pointerdown', 'touchstart', 'wheel', 'mousedown']) {
    host.addEventListener(eventName, pointerPause, { passive: true });
  }
  for (const eventName of ['move', 'zoom', 'rotate', 'pitch', 'resize', 'moveend', 'zoomend', 'rotateend']) {
    onMap(eventName, requestDraw);
  }
  const onVisibility = () => { if (document.hidden) { if (raf) cancelAnimationFrame(raf); raf = 0; } else requestDraw(); };
  document.addEventListener('visibilitychange', onVisibility);
  const spinTick = () => {
    if (destroyed || document.hidden) return;
    const now = Date.now(), delta = clamp((now - lastSpinAt) / 1000, 0, 3);
    lastSpinAt = now;
    const zoom = Number(map.getZoom?.() ?? 10);
    if (zoom <= 2.1 && now >= pausedUntil && !map.isMoving?.()) {
      const center = map.getCenter?.();
      if (center && delta > 0) {
        const shift = SIDEREAL_DEG_PER_SECOND * delta;
        try { map.easeTo({ center: [wrapLng(center.lng + shift), center.lat], duration: 1000, easing: t => t, essential: false }); } catch (_) {}
      }
    }
    requestDraw();
  };
  spinTimer = setInterval(spinTick, 1000);
  solarTimer = setInterval(requestDraw, 30000);
  render(true);

  const api = {
    version: 6124, map, canvas, render: () => render(true),
    get state() { return window.__BP_SPACE_V6124__ || null; },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearInterval(spinTimer); clearInterval(solarTimer);
      if (raf) cancelAnimationFrame(raf);
      for (const [event, handler] of listeners) map.off?.(event, handler);
      for (const eventName of ['pointerdown', 'touchstart', 'wheel', 'mousedown']) host.removeEventListener(eventName, pointerPause);
      document.removeEventListener('visibilitychange', onVisibility);
      canvas.remove();
      if (window.__BP_SPACE_V6124__?.map === map) delete window.__BP_SPACE_V6124__;
    }
  };
  window.__BP_SPACE_CONTROLLER_V6124__ = api;
  return api;
}

export { initSpace };
