import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [water, map, space, clouds, weather, app, landing, timeSlider, bootstrap, appHtml, landingHtml] = await Promise.all([
  read('../release-v2300/world-v2300-water.js'),
  read('../release-v2300/world-v2300-map.js'),
  read('../release-v2300/world-v2300-space.js'),
  read('../release-v2300/world-v2300-clouds.js'),
  read('../release-v2300/world-v2300-weather.js'),
  read('../rebuild-v5000/app.js'),
  read('../rebuild-v5000/landing.js'),
  read('../release-v2300/world-v2300-time-slider.js'),
  read('../release-v2300/world-v2300-bootstrap.js'),
  read('../rebuild-v5000/app-index.html'),
  read('../rebuild-v5000/index.html')
]);

function test(name, fn) {
  try {
    fn();
    process.stdout.write('PASS ' + name + '\n');
  } catch (error) {
    process.stderr.write('FAIL ' + name + '\n' + (error?.stack || error) + '\n');
    process.exitCode = 1;
  }
}

test('water keeps protected close-zoom height and shoreline safety', () => {
  assert.match(water, /const VERSION = 6123;/);
  assert.match(water, /const SURFACE_RENDER_REVISION = 6124;/);
  assert.match(water, /if \(z >= 12\) \{\s*return \{ scale: 0, maxOffsetM: 0, guarded: true \};\s*\}/);
  assert.match(water, /surfaceMaskValidationAllZooms: true/);
  assert.match(water, /surfaceCellsRejectedInvalidTerrain/);
});

test('water gets long visible swell and a moving solar specular vector', () => {
  assert.match(water, /uniform vec2 u_sunDirScreen;/);
  assert.match(water, /uniform float u_sunElevation;/);
  assert.match(water, /float globalSwell/);
  assert.match(water, /vec3 sunDirection/);
  assert.match(water, /uniform1f\(u\.u_sunElevation/);
  assert.match(water, /u_flowCycles \* 0\.14/);
});

test('satellite land imagery remains default and coast foam works at global zoom', () => {
  assert.match(map, /defaultBase:'satellite'/);
  assert.match(map, /setBase\('satellite'\)/);
  assert.match(map, /gta-esri/);
  assert.match(map, /id:'gta-coast-foam'.{0,260}minzoom:2\.2/s);
  assert.match(map, /__BP_COAST_FOAM_TIMER__/);
  assert.match(map, /paint\(map,'gta-water','fill-opacity',sat\?1:\.97\)/);
});

test('space layer keeps globe interactive while drawing stable stars, Sun and Moon', () => {
  assert.match(space, /stableStars: true/);
  assert.match(space, /mapCanvasHidden: false/);
  assert.match(space, /cameraControlsDisabled: false/);
  assert.match(space, /autoRotation: 'disabled; camera motion remains user-driven'/);
  assert.doesNotMatch(space, /SIDEREAL_DEG_PER_SECOND/);
  assert.doesNotMatch(space, /map\.easeTo/);
  assert.doesNotMatch(space, /map\.stop/);
  assert.match(space, /function drawSun/);
  assert.match(space, /function drawMoon/);
  assert.match(map, /initSpace\(map,container,\{solarPosition\}\)/);
  assert.doesNotMatch(space, /mapCanvas\.style\.visibility\s*=\s*['"]hidden/);
  assert.doesNotMatch(space, /setInteractive\(false\)/);
});

test('cloud shadows update on the map and use available source winds', () => {
  assert.match(clouds, /bp-cloud-shadow-ground-v6124/);
  assert.match(clouds, /function refreshGroundShadows/);
  assert.match(clouds, /function cloudSolarPosition/);
  assert.match(clouds, /source-surface-wind-proxy/);
  assert.match(clouds, /cloudShadowFeatureCount/);
  assert.match(clouds, /updateGroundShadows\(global\.shadowAnchors \|\| \[\], formations\)/);
  assert.match(weather, /refresh\(false\),60000\)/);
});

test('entrypoints use fresh cache keys for updated map, water, clouds, weather and space', () => {
  for (const source of [app, landing]) {
    assert.match(source, /world-v2300-map\.js\?v=6125-manual-globe-camera/);
    assert.match(source, /world-v2300-water\.js\?v=6124-solar-ocean-swell/);
    assert.match(source, /world-v2300-clouds\.js\?v=6130-cloud-rain-lightning/);
    assert.match(source, /world-v2300-weather\.js\?v=6130-cloud-rain-lightning/);
    assert.match(source, /world-v2300-time-slider\.js\?v=6124-live-cloud-shadow-motion/);
  }
  assert.match(map, /world-v2300-space\.js\?v=6125-manual-globe-camera/);
  assert.match(timeSlider, /world-v2300-clouds\.js\?v=6130-cloud-rain-lightning/);
  assert.match(bootstrap, /world-v2300-weather\.js\?v=6130-cloud-rain-lightning/);
  assert.match(appHtml, /app\.js\?v=6130-cloud-rain-lightning-markers/);
  assert.match(landingHtml, /landing\.js\?v=6130-cloud-rain-lightning-markers/);
});

test('sky-view restoration returns to street with bounded cleanup waits', () => {
  assert.match(timeSlider, /async function restoreSkyStreetView\(restore\)/);
  assert.match(timeSlider, /waitSkyMapState\(\(\)=>map\.getPitch\(\)<90,1800,'safe pitch before projection restore'\)/);
  assert.match(timeSlider, /waitSkyMapState\(\(\)=>skyProjectionType\(\)===targetProjection,3000,'projection restore'\)/);
  assert.match(timeSlider, /'street camera restore'/);
  assert.match(timeSlider, /skyViewDiag\.phase='restoring-street'/);
  assert.doesNotMatch(timeSlider, /'ground clamp restore'/);
});

test('public cyclone fallback is fetched concurrently with edge weather', () => {
  assert.match(weather, /const \[edgeResult,publicCyclones\]=await Promise\.all\(\[/);
  assert.match(weather, /\.then\(value=>\(\{value,error:null\}\),error=>\(\{value:null,error\}\)\)/);
  assert.match(weather, /getPublicCyclones\(force\)/);
  assert.match(weather, /source:'NOAA\/NHC'/);
});
