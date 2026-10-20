#!/usr/bin/env node
'use strict';

const assert = require('node:assert/strict');
const puppeteer = require('puppeteer-core');

const ORIGIN = process.env.BP_PUBLIC_ORIGIN || 'https://bridgepointintelligence.online/';
const CHROME_PATH = process.env.CHROME_PATH;
const WAIT_MS = 90000;
const SOURCE_WAIT_MS = 65000;

async function diagnostics(page) {
  return page.evaluate(() => {
    const rail = window.__BP_LIVE_RAIL_V5969__;
    const mesh = window.__BP_RAIL_MESH_V5973__;
    const worlds = [
      window.__BP_LANDING_WORLD__,
      window.__bpLandingWorldV5420,
      window.__BP_V5000_WORLD,
      window.__BP_V5000_WORLD__,
      window.__BP_WORLD
    ].filter(Boolean);
    const maps = worlds.map(w => w.map).filter(m => m && m.getContainer);
    return {
      url: location.href,
      railVersion: rail?.version ?? null,
      meshVersion: mesh?.version ?? null,
      railStates: rail?.getState?.() || [],
      meshStates: mesh?.getState?.() || [],
      meshControls: [...document.querySelectorAll('.bp-rail-mesh-toggle-v5973')].map(b => ({
        id: b.id, text: (b.textContent || '').trim(),
        rect: (() => { const r = b.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; })()
      })),
      meshPanels: [...document.querySelectorAll('.bp-rail-mesh-panel-v5973')].map(p => ({
        id: p.id, hidden: p.hidden, text: (p.textContent || '').slice(0, 650)
      })),
      maps: maps.map(m => {
        const center = m.getCenter?.(), bounds = m.getBounds?.();
        let visible3DCount = null;
        try { visible3DCount = mesh?.getState?.().find(s => s.mapId === m.getContainer().id)?.vehicles ?? 0; } catch (_) {}
        return {
          id: m.getContainer().id,
          center: center ? [center.lng, center.lat] : null,
          zoom: m.getZoom?.() ?? null,
          bounds: bounds ? [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()] : null,
          canvasCount: m.getContainer().querySelectorAll('canvas').length,
          railLayerPresent: !!m.getLayer?.('bp-live-rail-points-v5969'),
          railPointVisibility: (() => { try { return m.getLayoutProperty('bp-live-rail-points-v5969', 'visibility') || 'visible'; } catch (_) { return 'missing'; } })(),
          railSourcePresent: !!m.getSource?.('bp-live-rail-source-v5969'),
          meshLayerPresent: !!m.getLayer?.('bp-rail-meshes-v5973'),
          visible3DCount
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
  const moduleResponses = [];

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
      if (res.url().includes('bridgepoint-rail-mesh-v5973.js')) {
        moduleResponses.push({ status: res.status(), url: res.url() });
      }
    });

    await page.goto(ORIGIN, { waitUntil: 'domcontentloaded', timeout: WAIT_MS });
    await page.waitForFunction(() => {
      const rail = window.__BP_LIVE_RAIL_V5969__;
      const mesh = window.__BP_RAIL_MESH_V5973__;
      return rail?.version === 5969 && mesh?.version === 5973 &&
        Array.isArray(rail.getState?.()) && rail.getState().length > 0 &&
        Array.isArray(mesh.getState?.()) && mesh.getState().length > 0;
    }, { timeout: WAIT_MS });

    const before = await diagnostics(page);
    assert.equal(before.railVersion, 5969, 'cache-busted live rail module did not initialize');
    assert.equal(before.meshVersion, 5973, '3D rail mesh module did not initialize');
    const selected = await page.evaluate(() => {
      const visible = b => {
        const r = b.getBoundingClientRect(), s = getComputedStyle(b);
        return r.width > 0 && r.height > 0 && s.display !== 'none' && s.visibility !== 'hidden';
      };
      const button = [...document.querySelectorAll('.bp-rail-mesh-toggle-v5973')].find(visible);
      if (!button) return null;
      button.click();
      return { buttonId: button.id, mapId: button.parentElement?.id || '', text: (button.textContent || '').trim() };
    });
    assert.ok(selected, 'no visible 3D RAIL + TRAINS control attached to the map');

    // This explicit user-style interaction must automatically focus MBTA coverage
    // and enable the live source. It is not allowed to turn on for general visitors.
    await page.waitForFunction(mapId => {
      const meshStates = window.__BP_RAIL_MESH_V5973__?.getState?.() || [];
      const railStates = window.__BP_LIVE_RAIL_V5969__?.getState?.() || [];
      const mesh = meshStates.find(s => s.mapId === mapId);
      const rail = railStates.find(s => s.mapId === mapId);
      return !!mesh?.active && !!rail?.enabled;
    }, { timeout: 20000 }, selected.mapId);

    await page.waitForFunction(mapId => {
      const states = window.__BP_LIVE_RAIL_V5969__?.getState?.() || [];
      return states.some(s => s.mapId === mapId && s.enabled && s.lastSuccessAt && s.featureCount > 0);
    }, { timeout: SOURCE_WAIT_MS }, selected.mapId);

    // Require actual Three.js rolling-stock instances AND real railway line geometry,
    // not just point markers or a successful API response.
    await page.waitForFunction(mapId => {
      const mesh = (window.__BP_RAIL_MESH_V5973__?.getState?.() || []).find(s => s.mapId === mapId);
      return !!mesh && mesh.active && mesh.layerAdded &&
        mesh.vehicles > 0 && mesh.railSegments > 0 && mesh.sleepers > 0 &&
        mesh.lineFeatureCount > 0 && mesh.liveSourceReports > 0;
    }, { timeout: SOURCE_WAIT_MS, polling: 750 }, selected.mapId);

    const after = await diagnostics(page);
    const railState = after.railStates.find(s => s.mapId === selected.mapId && s.enabled && s.featureCount > 0);
    const meshState = after.meshStates.find(s => s.mapId === selected.mapId && s.active && s.layerAdded);
    const map = after.maps.find(m => m.id === selected.mapId);
    assert.ok(railState, 'MBTA endpoint did not yield fresh source positions');
    assert.ok(meshState, '3D rail custom layer was not installed');
    assert.ok(meshState.vehicles > 0, 'no materialized 3D rolling-stock models were produced');
    assert.ok(meshState.railSegments > 0, 'no raised rail geometry was produced from the railway source');
    assert.ok(meshState.sleepers > 0, 'no solid track sleepers were produced');
    assert.ok(map && map.meshLayerPresent, '3D mesh layer is missing on the focused map');
    assert.equal(map.railPointVisibility, 'none', 'flat vehicle markers must be hidden while 3D trains are materialized');
    assert.ok(map.canvasCount >= 1, 'base map canvas disappeared');
    assert.ok(Math.abs(map.center[0] + 71.0589) < 2 && Math.abs(map.center[1] - 42.3601) < 2,
      '3D rail control did not position the map over the Boston MBTA coverage area');
    assert.ok(mbtaResponses.some(r => r.status === 200), 'no successful MBTA source response was observed');
    assert.deepEqual(failedMbta, [], 'MBTA API requests failed at the network layer');

    console.log('BP_LIVE_RAIL_MESH_PRODUCTION_PASS ' + JSON.stringify({
      origin: ORIGIN,
      control: selected,
      railStatus: railState.status,
      freshSourceVehicles: railState.featureCount,
      lastSuccessfulRequestAt: railState.lastSuccessAt,
      newestSourceReportAt: railState.newestSourceReportAt,
      meshStatus: meshState.status,
      materialized3DTrains: meshState.vehicles,
      sourceMappedRailFeatures: meshState.lineFeatureCount,
      raisedRailSegments: meshState.railSegments,
      solidSleepers: meshState.sleepers,
      terrainSkippedGeometry: meshState.skippedNoTerrain,
      map,
      moduleResponses,
      mbtaResponses,
      failedMbta,
      consoleErrors: consoleErrors.slice(-10)
    }));
  } catch (error) {
    if (page) {
      console.error('BP_LIVE_RAIL_MESH_PRODUCTION_DIAGNOSTIC ' + JSON.stringify({
        error: String(error?.stack || error),
        diagnostics: await diagnostics(page).catch(e => ({ error: String(e) })),
        moduleResponses,
        mbtaResponses,
        failedMbta,
        consoleErrors: consoleErrors.slice(-25)
      }));
      await page.screenshot({ path: '/tmp/bp-live-rail-smoke-failure.png', fullPage: false }).catch(() => {});
    }
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
})();
