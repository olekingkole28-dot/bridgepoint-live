import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [water, map, space, clouds, weather, rain, lightning, app, landing, listingView, timeSlider, bootstrap, appHtml, landingHtml, globalWeather] = await Promise.all([
  read('../release-v2300/world-v2300-water.js'),
  read('../release-v2300/world-v2300-map.js'),
  read('../release-v2300/world-v2300-space.js'),
  read('../release-v2300/world-v2300-clouds.js'),
  read('../release-v2300/world-v2300-weather.js'),
  read('../release-v2300/world-v2300-rain.js'),
  read('../release-v2300/world-v2300-lightning.js'),
  read('../rebuild-v5000/app.js'),
  read('../rebuild-v5000/landing.js'),
  read('../rebuild-v5000/bridgepoint-view-v5917.js'),
  read('../release-v2300/world-v2300-time-slider.js'),
  read('../release-v2300/world-v2300-bootstrap.js'),
  read('../rebuild-v5000/app-index.html'),
  read('../rebuild-v5000/index.html'),
  read('../rebuild-v5000/intelligence-global-v5507.js')
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
    assert.match(source, /world-v2300-clouds\.js\?v=6134-source-satellite-clouds/);
    assert.match(source, /world-v2300-weather\.js\?v=6134-first-frame-weather/);
    assert.match(source, /world-v2300-time-slider\.js\?v=6134-source-satellite-clouds/);
  }
  assert.match(map, /world-v2300-space\.js\?v=6125-manual-globe-camera/);
  assert.match(timeSlider, /world-v2300-clouds\.js\?v=6134-source-satellite-clouds/);
  assert.match(bootstrap, /world-v2300-weather\.js\?v=6134-first-frame-weather/);
  assert.match(appHtml, /app\.js\?v=6134-first-frame-weather/);
  assert.match(landingHtml, /landing\.js\?v=6134-first-frame-weather/);
  assert.match(appHtml, /intelligence-global-v5507\.js\?v=6134-global-precip-lod/);
  assert.match(landingHtml, /intelligence-global-v5507\.js\?v=6134-global-precip-lod/);
});

test('new rain/lightning and global source markers stay separate from legacy effects', () => {
  assert.match(weather, /active=!!v;/);
  assert.match(weather, /const LEGACY_NATIVE_WEATHER_LAYERS=\['wx-snow-depth','wx-alert-fill','wx-fire-fill','wx-thermal','wx-quake-glow','wx-storm-glow'\]/);
  assert.match(weather, /for\(const id of \['wx-alert-line','wx-fire-line','wx-quake','wx-storm','wx-obs','wx-water'\]\)/);
  assert.match(app, /id:'bp-v5004-weather-shape-fill'.{0,500}layout:\{visibility:'visible'\}/);
  assert.match(landing, /bp-landing-weather-fill/);
  assert.match(landing, /id:'bp-landing-weather-fill'.{0,400}layout:\{visibility:'visible'\},paint:\{'fill-color':landingWeatherColorExpr\(\),'fill-opacity':\['interpolate'/);
  assert.doesNotMatch(weather, /active=CLOUDS_ONLY_PHASE\(\)\?true:!!v/);
  assert.match(weather, /initLightningLayer/);
  assert.doesNotMatch(weather, /'bp2300-rain-wet-ground-v6068','bp2300-rain-puddle-fill-v6068/);
  assert.match(rain, /const RAIN_START_ZOOM = MOBILE \? 8 : 7;/);
  assert.match(rain, /source_anchor_kind: 'warning'/);
  assert.match(rain, /windFields\(p, c, true\)/);
  assert.match(clouds, /sourceRainAnchors/);
  assert.match(clouds, /coverageVersion: 6130/);
  assert.match(clouds, /bp6133-noaa-geocolor-cloud-context/);
  assert.match(clouds, /MERGEDGC_current\/ImageServer\/exportImage/);
  assert.match(clouds, /initSatelliteCloudContextV6134/);
  assert.match(clouds, /placedBelowBuildings/);
  assert.match(clouds, /rainAnchorObservations\.slice\(0, overviewClouds \? \(MOBILE \? 2 : 4\)/);
  assert.match(lightning, /bp6130-cloud-expansion/);
  assert.match(lightning, /bp6130-cloud-flash-gradient/);
  assert.doesNotMatch(app, /window\.__BP_CLOUDS_ONLY_PHASE_V6070__=true;/);
  assert.doesNotMatch(landing, /window\.__BP_CLOUDS_ONLY_PHASE_V6070__=true;/);
  assert.match(app, /BP_SOURCE_WEATHER_CACHE_KEY_V6134/);
  assert.match(app, /restoreCachedLiveWeatherFirstFrameV6134/);
  assert.match(app, /warmLiveWeatherFirstFrameV6134/);
  assert.match(landing, /BP_SOURCE_WEATHER_CACHE_KEY_V6134/);
  assert.match(landing, /restoreLandingWeatherFirstFrameV6134/);
  assert.match(landing, /void startLandingNationalWeather\(world\)/);
  assert.match(app, /'raster-opacity':\['interpolate',\['linear'\],\['zoom'\],0,\.50,1\.5,\.50,3,\.53,5,\.59,8,\.63,12,\.66,18,\.66/);
  assert.match(landing, /'raster-opacity':\['interpolate',\['linear'\],\['zoom'\],0,\.50,1\.5,\.50,3,\.53,5,\.59,8,\.63,12,\.66,18,\.66/);
  assert.match(globalWeather, /'raster-opacity':\['interpolate',\['linear'\],\['zoom'\],0,\.50,1\.5,\.48,3,\.40,4\.5,\.25,6,\.15,7,\.09,8,\.035,8\.5,0/);
  assert.match(lightning, /export function initLightningLayer/);
  assert.match(lightning, /durationMs:2450/);
  assert.match(lightning, /overlayConnected/);
  assert.match(app, /BP_WEATHER_ICON_CATALOG_V6132/);
  assert.match(app, /bp-v6132-weather-icons/);
  assert.match(app, /bp-v6132-ground-radar/);
  assert.match(app, /initialFetchRequested:true/);
  assert.match(landing, /BP_LANDING_WEATHER_ICON_CATALOG_V6132/);
  assert.match(landing, /bp-landing-v6132-weather-icons/);
  assert.match(landing, /bp-landing-v6132-ground-radar/);
  assert.match(landing, /groundDraped:true/);
  assert.match(app, /sourceWeatherOverlaysPreserved:true/);
  assert.match(landing, /legacyCinematicFxDisabled:true/);
  assert.match(listingView, /BP_LISTINGS_MONEY_V6130/);
  assert.match(listingView, /listingOverlayOn=true/);
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
