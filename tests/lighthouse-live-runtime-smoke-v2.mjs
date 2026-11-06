import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const origin = process.env.BP_ORIGIN || 'https://bridgepointintelligence.online';
const output = process.env.BP_SMOKE_OUTPUT || '/tmp/bp-lighthouse-smoke-v2';
fs.mkdirSync(output, { recursive: true });

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH,
  protocolTimeout: 120000,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--enable-unsafe-swiftshader',
    '--use-gl=angle',
    '--use-angle=swiftshader'
  ]
});

const summary = {
  origin,
  startedAt: new Date().toISOString(),
  route: '/',
  cameraTarget: { name: 'Saybrook Breakwater Light', coordinates: [-72.3428, 41.2633] },
  network: [],
  consoleErrors: [],
  pageErrors: [],
  diagnostics: {}
};

try {
  const page = await browser.newPage();
  page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 });
  page.setDefaultTimeout(90000);
  page.on('pageerror', error => summary.pageErrors.push(String(error?.stack || error)));
  page.on('console', message => {
    if (message.type() === 'error' && summary.consoleErrors.length < 40) {
      summary.consoleErrors.push(message.text());
    }
  });
  page.on('response', response => {
    const url = response.url();
    if (/overpass|bridgepoint-lighthouses|three\.module/i.test(url)) {
      summary.network.push({ type: 'response', status: response.status(), url });
    }
  });
  page.on('requestfailed', request => {
    const url = request.url();
    if (/overpass|bridgepoint-lighthouses|three\.module/i.test(url)) {
      summary.network.push({
        type: 'requestfailed',
        error: request.failure()?.errorText || 'unknown',
        url
      });
    }
  });

  await page.goto(`${origin}/?bp-lighthouse-runtime-v2=${Date.now()}`, {
    waitUntil: 'domcontentloaded',
    timeout: 90000
  });

  await page.waitForFunction(() => {
    const world = window.__BP_LANDING_WORLD__;
    return !!world?.map && typeof world.map.getZoom === 'function' &&
      !!document.querySelector('#previewMap canvas, #landingMap canvas, #liveMap canvas');
  }, { timeout: 120000 });

  await page.waitForFunction(() => !!(
    window.__BP_LIGHTHOUSES_V2__ || window.__BP_LIGHTHOUSES_V1__
  ), { timeout: 60000 });

  const target = [-72.3428, 41.2633];
  await page.evaluate((coordinates) => {
    const map = window.__BP_LANDING_WORLD__?.map;
    if (!map) throw new Error('HOMEPAGE_GLOBE_MAP_MISSING');
    map.stop?.();
    map.jumpTo({ center: coordinates, zoom: 6.2, pitch: 0, bearing: 0 });
  }, target);

  // Give the regional OpenStreetMap query time to return and the GeoJSON source
  // a full render cycle. Record diagnostics even when the underlying source fails.
  await new Promise(resolve => setTimeout(resolve, 45000));

  summary.diagnostics.regional = await page.evaluate((coordinates) => {
    const world = window.__BP_LANDING_WORLD__;
    const map = world?.map;
    const api = window.__BP_LIGHTHOUSES_V2__ || window.__BP_LIGHTHOUSES_V1__;
    const source = map?.getSource('bp-lighthouses-source-v1');
    const sourceFeatures = map?.querySourceFeatures('bp-lighthouses-source-v1') || [];
    const dataFeatures = source?._data?.features || [];
    const features = dataFeatures.length ? dataFeatures : sourceFeatures;
    const targetFeature = features.find(feature =>
      String(feature?.properties?.name || '').toLowerCase().includes('saybrook')
    );
    const layers = [
      'bp-lighthouses-beacon-halo-v2',
      'bp-lighthouses-markers-v1',
      'bp-lighthouses-beacon-v2',
      'bp-lighthouses-3d-v1'
    ];
    const projected = map?.project(coordinates);
    const queryLayers = layers.filter(id => map?.getLayer(id));
    const renderedAtTarget = projected && queryLayers.length
      ? map.queryRenderedFeatures(projected, { layers: queryLayers }).map(feature => ({
          layer: feature.layer.id,
          properties: feature.properties
        }))
      : [];
    return {
      zoom: map?.getZoom?.() ?? null,
      center: map?.getCenter?.() ? [map.getCenter().lng, map.getCenter().lat] : null,
      apiExists: !!api,
      apiVersion: api?.version ?? null,
      apiStatus: api?.status ?? null,
      apiFeatureCount: api?.features ?? null,
      apiStats: api?.stats ?? null,
      sourceExists: !!source,
      sourceFeatureCount: features.length,
      saybrookFeature: targetFeature ? {
        id: targetFeature.id,
        coordinates: targetFeature.geometry?.coordinates,
        properties: targetFeature.properties
      } : null,
      layers: Object.fromEntries(layers.map(id => [id, !!map?.getLayer(id)])),
      beaconImageRegistered: !!map?.hasImage?.('bp-lighthouse-rotating-beacon-v2'),
      renderedAtTarget,
      mapCanvasCount: map?.getContainer?.().querySelectorAll('canvas').length ?? null
    };
  }, target);

  await page.screenshot({
    path: path.join(output, 'saybrook-regional.png'),
    fullPage: false
  });

  // Test close zoom separately: a source record plus a ready custom layer and a
  // selected model are required; a static circle by itself is not a passing 3D test.
  await page.evaluate((coordinates) => {
    const map = window.__BP_LANDING_WORLD__?.map;
    map?.stop?.();
    map?.jumpTo({ center: coordinates, zoom: 15.2, pitch: 38, bearing: 0 });
  }, target);
  await new Promise(resolve => setTimeout(resolve, 8000));

  summary.diagnostics.closeZoom = await page.evaluate(() => {
    const world = window.__BP_LANDING_WORLD__;
    const map = world?.map;
    const api = window.__BP_LIGHTHOUSES_V2__ || window.__BP_LIGHTHOUSES_V1__;
    const sourceFeatures = map?.querySourceFeatures('bp-lighthouses-source-v1') || [];
    const dataFeatures = map?.getSource('bp-lighthouses-source-v1')?._data?.features || [];
    const features = dataFeatures.length ? dataFeatures : sourceFeatures;
    const saybrook = features.find(f =>
      String(f?.properties?.name || '').toLowerCase().includes('saybrook')
    );
    return {
      zoom: map?.getZoom?.() ?? null,
      center: map?.getCenter?.() ? [map.getCenter().lng, map.getCenter().lat] : null,
      apiStatus: api?.status ?? null,
      apiStats: api?.stats ?? null,
      sourceFeatureCount: features.length,
      saybrookFound: !!saybrook,
      modelLayerExists: !!map?.getLayer('bp-lighthouses-3d-v1'),
      customLayerReady: api?.stats?.layerReady === true,
      renderedModels: api?.stats?.renderedModels ?? 0
    };
  });
  await page.screenshot({
    path: path.join(output, 'saybrook-close-3d.png'),
    fullPage: false
  });

  summary.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'diagnostics.json'), JSON.stringify(summary, null, 2));

  console.log('BRIDGEPOINT_LIGHTHOUSE_V2_BROWSER_DIAGNOSTICS', JSON.stringify({
    regional: summary.diagnostics.regional,
    closeZoom: summary.diagnostics.closeZoom,
    network: summary.network,
    pageErrors: summary.pageErrors.slice(0, 12),
    consoleErrors: summary.consoleErrors.slice(0, 12)
  }));

  const regional = summary.diagnostics.regional;
  assert.equal(regional.apiExists, true, 'Lighthouse renderer never initialized on homepage map');
  assert.equal(regional.layers['bp-lighthouses-markers-v1'], true, 'Base lighthouse locator layer is missing');
  assert.equal(regional.layers['bp-lighthouses-beacon-v2'], true, 'Rotating lighthouse beacon layer is missing');
  assert.equal(regional.beaconImageRegistered, true, 'Rotating lighthouse beacon image is not registered');
  assert.ok(regional.sourceFeatureCount > 0, 'No lighthouse source features loaded in the Saybrook viewport');
  assert.ok(regional.saybrookFeature, 'Saybrook Breakwater Light was not loaded from the source');
  assert.ok(regional.renderedAtTarget.length > 0, 'No lighthouse marker/beacon is rendered at the Saybrook map coordinate');

  const close = summary.diagnostics.closeZoom;
  assert.equal(close.modelLayerExists, true, '3D lighthouse custom layer is missing');
  assert.equal(close.customLayerReady, true, '3D lighthouse custom WebGL layer did not become ready');
  assert.ok(close.renderedModels > 0, 'No 3D lighthouse model was selected at close zoom');

  console.log('BRIDGEPOINT_LIGHTHOUSE_V2_VISIBLE_RUNTIME_PASS');
} catch (error) {
  summary.failure = String(error?.stack || error);
  summary.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(output, 'diagnostics.json'), JSON.stringify(summary, null, 2));
  console.error('BRIDGEPOINT_LIGHTHOUSE_V2_BROWSER_SMOKE_FAILED', error);
  console.error('BRIDGEPOINT_LIGHTHOUSE_V2_BROWSER_DIAGNOSTICS', JSON.stringify(summary));
  process.exitCode = 1;
} finally {
  await browser.close();
}
