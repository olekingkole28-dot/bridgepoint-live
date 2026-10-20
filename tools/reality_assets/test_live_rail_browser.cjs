#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');

const ORIGIN = process.env.BP_PUBLIC_ORIGIN || 'https://bridgepointintelligence.online/';
const CHROME_PATH = process.env.CHROME_PATH;
const WAIT_MS = 90000;
const SOURCE_WAIT_MS = 45000;

function worlds() {
  return [
    window.__BP_LANDING_WORLD__,
    window.__bpLandingWorldV5420,
    window.__BP_V5000_WORLD,
    window.__BP_V5000_WORLD__,
    window.__BP_WORLD
  ].filter(Boolean);
}

async function diagnostics(page) {
  return page.evaluate(() => {
    const rail = window.__BP_LIVE_RAIL_V5969__;
    const maps = [
      window.__BP_LANDING_WORLD__,
      window.__bpLandingWorldV5420,
      window.__BP_V5000_WORLD,
      window.__BP_V5000_WORLD__,
      window.__BP_WORLD
    ].filter(Boolean).map(w => w.map).filter(m => m && m.getContainer);
    return {
      url: location.href,
      version: rail?.version ?? null,
      states: rail?.getState?.() || [],
      controls: [...document.querySelectorAll('.bp-live-rail-toggle-v5969')].map(b => ({
        id: b.id,
        text: (b.textContent || '').trim(),
        rect: (() => { const r = b.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()
      })),
      panels: [...document.querySelectorAll('.bp-live-rail-panel-v5969')].map(p => ({
        id: p.id, hidden: p.hidden, text: (p.textContent || '').slice(0, 500)
      })),
      maps: maps.map(m => {
        const c = m.getCenter?.();
        let rendered = null;
        try {
          if (m.getLayer?.('bp-live-rail-points-v5969')) {
            rendered = m.queryRenderedFeatures({ layers: ['bp-live-rail-points-v5969'] }).length;
          }
        } catch (_) {}
        return {
          id: m.getContainer().id,
          center: c ? [c.lng, c.lat] : null,
          zoom: m.getZoom?.() ?? null,
          canvasCount: m.getContainer().querySelectorAll('canvas').length,
          layerPresent: !!m.getLayer?.('bp-live-rail-points-v5969'),
          sourcePresent: !!m.getSource?.('bp-live-rail-source-v5969'),
          rendered
        };
      })
    };
  });
}

(async () => {
  assert.ok(CHROME_PATH, 'CHROME_PATH is required');
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: CHROME_PATH,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--enable-webgl', '--ignore-gpu-blocklist', '--enable-unsafe-swiftshader']
  });
  let page;
  const consoleErrors = [];
  const failedMbta = [];
  const mbtaResponses = [];

  try {
    page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
    page.on('pageerror', e => consoleErrors.push(String(e?.message || e).slice(0, 300)));
    page.on('console', msg => {
      if (msg.type() === 'error') consoleErrors.push(String(msg.text()).slice(0, 300));
    });
    page.on('requestfailed', req => {
      if (req.url().includes('api-v3.mbta.com')) {
        failedMbta.push({ url: req.url(), error: req.failure()?.errorText || 'request failed' });
      }
    });
    page.on('response', res => {
      if (res.url().includes('api-v3.mbta.com/vehicles')) {
        mbtaResponses.push({ status: res.status(), url: res.url() });
      }
    });

    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: WAIT_MS });
    await page.waitForFunction(() => {
      const api = window.__BP_LIVE_RAIL_V5969__;
      return api?.version === 5969 && Array.isArray(api.getState?.()) && api.getState().length > 0;
    }, { timeout: WAIT_MS });

    const before = await diagnostics(page);
    assert.equal(before.version, 5969, 'cache-busted rail module did not initialize');
    const selected = await page.evaluate(() => {
      const visible = b => {
        const r = b.getBoundingClientRect(), s = getComputedStyle(b);
        return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
      };
      const b = [...document.querySelectorAll('.bp-live-rail-toggle-v5969')].find(visible);
      if (!b) return null;
      b.click();
      return { buttonId: b.id, mapId: b.parentElement?.id || '' };
    });
    assert.ok(selected, 'no visible LIVE RAIL control attached to a map');

    const safeId = selected.buttonId.replace('bp-live-rail-toggle-v5969-', '');
    const panelId = 'bp-live-rail-panel-v5969-' + safeId;
    await page.waitForFunction(id => {
      const p = document.getElementById(id);
      return !!p && !p.hidden && getComputedStyle(p).display !== 'none';
    }, { timeout: 10000 }, panelId);

    const panelInfo = await page.evaluate(id => {
      const p = document.getElementById(id);
      if (!p) return null;
      const focus = [...p.querySelectorAll('button')].find(b => (b.textContent || '').includes('Focus MBTA Coverage'));
      const checkbox = p.querySelector('input[type="checkbox"]');
      if (!focus || !checkbox) return null;
      focus.click();
      return { mapId: p.parentElement?.id || '', focusFound: true, checkboxFound: true };
    }, panelId);
    assert.ok(panelInfo, 'panel does not contain focus and enable controls');

    await page.waitForFunction(mapId => {
      const maps = [
        window.__BP_LANDING_WORLD__, window.__bpLandingWorldV5420,
        window.__BP_V5000_WORLD, window.__BP_V5000_WORLD__, window.__BP_WORLD
      ].filter(Boolean).map(w => w.map).filter(m => m && m.getContainer);
      const m = maps.find(map => map.getContainer().id === mapId);
      if (!m) return false;
      const c = m.getCenter();
      return Math.abs(c.lng + 71.0589) < 2 && Math.abs(c.lat - 42.3601) < 2;
    }, { timeout: 15000 }, panelInfo.mapId);

    const enabled = await page.evaluate(id => {
      const panel = document.getElementById(id);
      const checkbox = panel?.querySelector('input[type="checkbox"]');
      if (!checkbox) return false;
      if (!checkbox.checked) checkbox.click();
      return checkbox.checked;
    }, panelId);
    assert.ok(enabled, 'could not enable Show live MBTA rail vehicles');

    await page.waitForFunction(() => {
      const states = window.__BP_LIVE_RAIL_V5969__?.getState?.() || [];
      return states.some(s => s.enabled && s.lastSuccessAt && s.featureCount > 0);
    }, { timeout: SOURCE_WAIT_MS });

    const after = await diagnostics(page);
    const state = after.states.find(s => s.enabled && s.lastSuccessAt && s.featureCount > 0);
    assert.ok(state, 'MBTA endpoint did not yield fresh position features');
    const map = after.maps.find(m => m.id === panelInfo.mapId);
    assert.ok(map && map.layerPresent && map.sourcePresent, 'rail source/layer is missing on the focused map');
    assert.ok(map.canvasCount >= 1, 'base map canvas disappeared');
    assert.ok(Math.abs(map.center[0] + 71.0589) < 2 && Math.abs(map.center[1] - 42.3601) < 2,
      'Focus MBTA Coverage did not position the map over Boston');

    console.log('BP_LIVE_RAIL_PRODUCTION_PASS ' + JSON.stringify({
      origin: ORIGIN,
      control: selected,
      panel: panelInfo,
      status: state.status,
      freshPositionCount: state.featureCount,
      lastSuccessfulRequestAt: state.lastSuccessAt,
      newestSourceReportAt: state.newestSourceReportAt,
      map,
      mbtaResponses,
      failedMbta,
      consoleErrors: consoleErrors.slice(-8)
    }));
  } catch (error) {
    if (page) {
      console.error('BP_LIVE_RAIL_PRODUCTION_DIAGNOSTIC ' + JSON.stringify({
        error: String(error?.stack || error),
        diagnostics: await diagnostics(page).catch(e => ({ error: String(e) })),
        mbtaResponses,
        failedMbta,
        consoleErrors: consoleErrors.slice(-20)
      }));
      await page.screenshot({ path: '/tmp/bp-live-rail-smoke-failure.png', fullPage: false }).catch(() => {});
    }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
