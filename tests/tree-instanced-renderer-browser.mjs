import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';

const root = path.resolve(process.env.BP_TREE_BROWSER_ROOT || '/tmp/bridgepoint-tree-browser');
const require = createRequire(path.join(process.env.PUPPETE_ROOT || '/tmp/bp-puppeteer', 'package.json'));
const puppeteer = require('puppeteer-core');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.glb': 'model/gltf-binary'
};

const sampleTrees = [
  {
    type: 'Feature', id: 'browser-fir-1',
    geometry: { type: 'Point', coordinates: [-72.6500, 41.5600] },
    properties: {
      source_key: 'bridgepoint-tree-browser-test',
      source_record_id: 'browser-fir-1',
      species: 'Abies alba',
      common_name: 'European silver fir',
      leaf_cycle: 'evergreen',
      leaf_type: 'needle',
      height_m: 19.2,
      height_truth: 'SOURCE_MEASURED',
      position_truth: 'SOURCE_POSITION'
    }
  },
  {
    type: 'Feature', id: 'browser-oak-2',
    geometry: { type: 'Point', coordinates: [-72.65025, 41.56025] },
    properties: {
      source_key: 'bridgepoint-tree-browser-test',
      source_record_id: 'browser-oak-2',
      species: 'Quercus robur',
      common_name: 'English oak',
      leaf_cycle: 'deciduous',
      height_m: 14.4,
      height_truth: 'SOURCE_DECLARED',
      position_truth: 'SOURCE_POSITION'
    }
  },
  {
    type: 'Feature', id: 'browser-jacaranda-3',
    geometry: { type: 'Point', coordinates: [-72.65045, 41.5598] },
    properties: {
      source_key: 'bridgepoint-tree-browser-test',
      source_record_id: 'browser-jacaranda-3',
      species: 'Jacaranda mimosifolia',
      common_name: 'Jacaranda',
      leaf_cycle: 'deciduous',
      height_m: 9.8,
      height_truth: 'SOURCE_MEASURED',
      position_truth: 'SOURCE_POSITION'
    }
  }
];

const html = [
  '<!doctype html>',
  '<html lang="en"><head><meta charset="utf-8">',
  '<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">',
  '<link rel="stylesheet" href="/vendor/maplibre-gl.css">',
  '<style>html,body,#map{margin:0;width:100%;height:100%;overflow:hidden;background:#10231b}</style>',
  '</head><body><div id="map"></div>',
  '<script src="/vendor/maplibre-gl.js"></script>',
  '<script type="module">',
  "import { attachTreeInstancedRenderer } from '/world-v2300-tree-instanced.js';",
  "const empty={type:'FeatureCollection',features:[]};",
  "const forestData={type:'FeatureCollection',features:[{type:'Feature',id:'forest-test-polygon',geometry:{type:'Polygon',coordinates:[[[-72.652,41.558],[-72.648,41.558],[-72.648,41.562],[-72.652,41.562],[-72.652,41.558]]]},properties:{class:'wood'}}]};",
  "const style={version:8,sources:{fallback:{type:'geojson',data:empty},ofm:{type:'geojson',data:forestData}},layers:[",
  "{id:'bp-background',type:'background',paint:{'background-color':'#16301f'}},",
  "{id:'gta-bp-tree3d-trunk',type:'circle',source:'fallback',paint:{'circle-radius':2,'circle-color':'#6b4b32'}},",
  "{id:'gta-bp-tree3d-canopy',type:'circle',source:'fallback',paint:{'circle-radius':3,'circle-color':'#2f7140'}},",
  "{id:'gta-bp-tree-trunks',type:'circle',source:'fallback',paint:{'circle-radius':2,'circle-color':'#6b4b32'}},",
  "{id:'gta-bp-tree-crowns',type:'circle',source:'fallback',paint:{'circle-radius':3,'circle-color':'#2f7140'}}]};",
  "const map=new maplibregl.Map({container:'map',style:style,center:[-72.6502,41.56],zoom:10.4,pitch:56,bearing:12,projection:'globe',attributionControl:false,antialias:false,maxPitch:85});",
  "window.__BP_TREE_BROWSER_MAP__=map;",
  "map.once('load',async()=>{",
  "map.__BP_LIVING_TILE_CACHE_V6017__={trees:" + JSON.stringify(sampleTrees) + "};",
  "try{await attachTreeInstancedRenderer(map,{manifestUrl:'/assets/trees/manifest.json',maxInstances:100,mobile:matchMedia('(max-width: 760px)').matches,lowMemory:false,highTier:true});window.__BP_TREE_BROWSER_ATTACH__='resolved';}",
  "catch(error){window.__BP_TREE_BROWSER_ATTACH__=String(error&&error.stack||error);}",
  "});",
  '</script></body></html>'
].join('\n');

await writeFile(path.join(root, 'index.html'), html, 'utf8');

const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
    const file = path.resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + path.sep)) {
      response.writeHead(403);
      response.end('Forbidden');
      return;
    }
    const info = await stat(file);
    const target = info.isDirectory() ? path.join(file, 'index.html') : file;
    const data = await readFile(target);
    response.writeHead(200, {
      'Content-Type': mime[path.extname(target).toLowerCase()] || 'application/octet-stream',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    });
    response.end(data);
  } catch (_) {
    response.writeHead(404);
    response.end('Not found');
  }
});

await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const origin = 'http://127.0.0.1:' + server.address().port;

const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.CHROME_PATH,
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

try {
  for (const viewport of [
    { name: 'desktop', width: 1280, height: 800, mobile: false },
    { name: 'phone', width: 390, height: 844, mobile: true }
  ]) {
    const page = await browser.newPage();
    const pageErrors = [];
    const browserConsole = [];
    const requestFailures = [];
    page.on('pageerror', error => pageErrors.push(String(error && error.stack || error)));
    page.on('console', message => {
      browserConsole.push('[' + message.type() + '] ' + message.text());
    });
    page.on('requestfailed', request => {
      requestFailures.push(request.url() + ' :: ' + String(request.failure()?.errorText || 'request failed'));
    });
    await page.setUserAgent(viewport.mobile
      ? 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 Chrome/130 Mobile Safari/537.36'
      : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130 Safari/537.36');
    await page.setViewport({
      width: viewport.width,
      height: viewport.height,
      deviceScaleFactor: viewport.mobile ? 2 : 1,
      isMobile: viewport.mobile,
      hasTouch: viewport.mobile
    });
    await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForFunction(
      () => window.__BP_TREE_BROWSER_ATTACH__ === 'resolved' &&
        window.__BP_TREE_INSTANCE_RENDERER_V1__ &&
        window.__BP_TREE_INSTANCE_RENDERER_V1__.status === 'render-ready' &&
        window.__BP_TREE_INSTANCE_RENDERER_V1__.instanceCount === 3 &&
        window.__BP_TREE_INSTANCE_RENDERER_V1__.firstFrameAt,
      { timeout: 90000 }
    ).catch(async error => {
      const diagnostics = await page.evaluate(() => ({
        attach: window.__BP_TREE_BROWSER_ATTACH__,
        state: window.__BP_TREE_INSTANCE_RENDERER_V1__ ? { ...window.__BP_TREE_INSTANCE_RENDERER_V1__ } : null,
        layers: window.__BP_TREE_BROWSER_MAP__ ? [
          'gta-bp-tree3d-trunk',
          'gta-bp-tree3d-canopy',
          'gta-bp-tree-trunks',
          'gta-bp-tree-crowns'
        ].map(id => ({
          id,
          visibility: window.__BP_TREE_BROWSER_MAP__.getLayoutProperty(id, 'visibility') || 'visible'
        })) : []
      }));
      throw new Error(
        viewport.name + ': wait for real first-frame draw failed: ' + error.message +
        '\nDIAGNOSTICS=' + JSON.stringify(diagnostics) +
        '\nCONSOLE=' + browserConsole.join('\n') +
        '\nREQUEST_FAILURES=' + requestFailures.join('\n')
      );
    });

    const diagnostics = await page.evaluate(() => {
      const map = window.__BP_TREE_BROWSER_MAP__;
      const state = window.__BP_TREE_INSTANCE_RENDERER_V1__;
      return {
        state: { ...state },
        canvasCount: map.getContainer().querySelectorAll('canvas').length,
        legacyVisibility: [
          'gta-bp-tree3d-trunk',
          'gta-bp-tree3d-canopy',
          'gta-bp-tree-trunks',
          'gta-bp-tree-crowns'
        ].map(id => ({ id, visibility: map.getLayoutProperty(id, 'visibility') || 'visible' })),
        geographicMatrixAvailable: typeof map.transform.getMatrixForModel === 'function',
        canopyLayer: map.getLayer('bp-tree-cover-regional-v1') || null,
        canopyMaxZoom: map.getLayer('bp-tree-cover-regional-v1')?.maxzoom ?? null,
        canopyOpacityExpression: map.getPaintProperty('bp-tree-cover-regional-v1','fill-opacity') || null
      };
    });

    assert.equal(diagnostics.state.modelCount, 48,
      viewport.name + ': the complete procedural archetype bank should load');
    assert.equal(diagnostics.state.proceduralModelCount, 48,
      viewport.name + ': all 48 procedural base meshes should be catalogued');
    assert.equal(diagnostics.state.proceduralVariantCount, 3072,
      viewport.name + ': all 3,072 deterministic model variants should be available');
    assert.ok(diagnostics.state.taxonomySpeciesCount >= 20000,
      viewport.name + ': the 21,001-species taxonomy index should be loaded');
    assert.ok(diagnostics.state.taxonomyMatches >= 2,
      viewport.name + ': source species names should match the taxonomic catalogue');
    assert.ok(diagnostics.state.variantCountUsed >= 2,
      viewport.name + ': the visible source trees should use distinct procedural variants');
    assert.equal(diagnostics.state.regionalCanopyStatus, 'active',
      viewport.name + ': regional forest canopy handoff should be installed');
    assert.ok(diagnostics.canopyLayer,
      viewport.name + ': source-backed forest polygon layer should be present');
    assert.equal(diagnostics.canopyMaxZoom, 12.35,
      viewport.name + ': the regional canopy proxy should fade out before individual point trees');
    assert.ok(Array.isArray(diagnostics.canopyOpacityExpression),
      viewport.name + ': regional canopy cover should use a zoom fade expression');
    assert.equal(diagnostics.state.instanceCount, 3,
      viewport.name + ': all source tree locations should become instances');
    assert.ok(diagnostics.state.gpuDrawCalls > 0,
      viewport.name + ': renderer must issue real GPU draw calls; state=' +
      JSON.stringify(diagnostics.state) + '; console=' + browserConsole.join(' | '));
    assert.ok(diagnostics.state.gpuTriangles > 0,
      viewport.name + ': renderer must draw actual model geometry');
    assert.ok(diagnostics.state.legacyLayersHidden,
      viewport.name + ': legacy layers should hide after complete model handoff');
    assert.ok(diagnostics.legacyVisibility.every(layer => layer.visibility === 'none'),
      viewport.name + ': every old simplified tree layer should be hidden');
    assert.ok(diagnostics.geographicMatrixAvailable,
      viewport.name + ': MapLibre geographic model transform must be available');
    assert.equal(diagnostics.canvasCount, 1,
      viewport.name + ': tree layer must share the existing map canvas');
    assert.deepEqual(pageErrors, [],
      viewport.name + ': browser JavaScript errors: ' + pageErrors.join('\n'));
    assert.deepEqual(requestFailures, [],
      viewport.name + ': failed browser requests: ' + requestFailures.join('\n'));
    const glWarnings = browserConsole.filter(line =>
      /shader|webgl|GL_INVALID|THREE\.WebGLProgram|failed to compile/i.test(line)
    );
    assert.deepEqual(glWarnings, [],
      viewport.name + ': WebGL / shader warnings: ' + glWarnings.join('\n'));

    console.log('BRIDGEPOINT_TREE_WEBGL_BROWSER_PASS_' + viewport.name.toUpperCase(),
      JSON.stringify({
        models: diagnostics.state.modelCount,
        modelVariantsAvailable: diagnostics.state.proceduralVariantCount,
        taxonomySpecies: diagnostics.state.taxonomySpeciesCount,
        taxonomyMatches: diagnostics.state.taxonomyMatches,
        variantsUsed: diagnostics.state.variantCountUsed,
        instances: diagnostics.state.instanceCount,
        lod: diagnostics.state.lod,
        gpuDrawCalls: diagnostics.state.gpuDrawCalls,
        gpuTriangles: diagnostics.state.gpuTriangles,
        legacyHidden: diagnostics.state.legacyLayersHidden,
        canvases: diagnostics.canvasCount
      })
    );
    // Exercise the full zoom transition: regional canopy (LOD2), neighborhood
    // point trees (LOD1), then close-up street models (LOD0).
    const transitions = [
      { zoom: 10.4, lod: 'lod2' },
      { zoom: 15.1, lod: 'lod1' },
      { zoom: 18, lod: 'lod0' }
    ];
    for (const transition of transitions) {
      await page.evaluate(zoom => {
        window.__BP_TREE_BROWSER_MAP__.jumpTo({ zoom });
      }, transition.zoom);
      await page.waitForFunction(
        lod => window.__BP_TREE_INSTANCE_RENDERER_V1__?.status === 'render-ready' &&
          window.__BP_TREE_INSTANCE_RENDERER_V1__?.lod === lod &&
          window.__BP_TREE_INSTANCE_RENDERER_V1__?.firstFrameAt &&
          window.__BP_TREE_INSTANCE_RENDERER_V1__?.gpuDrawCalls > 0 &&
          window.__BP_TREE_INSTANCE_RENDERER_V1__?.gpuTriangles > 0,
        { timeout: 30000 },
        transition.lod
      );
    }
    await page.close();
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
