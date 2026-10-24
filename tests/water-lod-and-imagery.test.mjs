import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const mapSource = await readFile(new URL('../release-v2300/world-v2300-map.js', import.meta.url), 'utf8');
const waterSource = await readFile(new URL('../release-v2300/world-v2300-water.js', import.meta.url), 'utf8');

assert.ok(mapSource.includes("esri:{type:'raster'"), 'global imagery source must be wired');
assert.ok(mapSource.includes("attribution:'Esri World Imagery · Sources: Esri, Vantor, Earthstar Geographics, and the GIS User Community'"),
  'world imagery attribution must be retained');
assert.ok(mapSource.includes("paint(map,'gta-water','fill-opacity',sat?1:.97)"),
  'satellite mode must fully mask raster imagery beneath source-water polygons');
assert.ok(mapSource.includes("map.moveLayer(id,'gta-water')"),
  'satellite rasters must render below water instead of painting across ocean');
assert.ok(mapSource.includes("setBase('satellite')"), 'land imagery drape must be enabled by default');
const mapLines = mapSource.split('\n');
const waterLine = mapLines.findIndex(line => line.includes("{id:'gta-water'"));
const esriLine = mapLines.findIndex(line => line.includes("{id:'gta-esri'"));
assert.ok(esriLine >= 0 && waterLine > esriLine, 'water fill must be declared after satellite imagery');
assert.ok(waterSource.includes('microPhaseA') && waterSource.includes('microPhaseB') && waterSource.includes('microPhaseC'),
  'GPU shader must include multiple fine-scale wave bands');
assert.ok(waterSource.includes('fwidth(microPhaseC)'), 'finest wave band must fade at screen-sampling limit');
assert.ok(waterSource.includes('surfaceMaskValidationAllZooms: true'), 'source-water masks must remain enabled at every zoom');
assert.ok(waterSource.includes("if (z >= 12) {\n    return { scale: 0, maxOffsetM: 0, guarded: true };"),
  'close-zoom vertex displacement guard must remain intact');
console.log('BRIDGEPOINT_WATER_LOD_AND_LAND_IMAGERY_TEST_PASS');
