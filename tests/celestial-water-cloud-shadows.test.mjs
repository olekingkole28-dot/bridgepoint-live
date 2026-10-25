import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [water, map, space, clouds, weather, rain, lightning, app, landing, listingView, timeSlider, bootstrap, appHtml, landingHtml, globalWeather, appUpdate, serviceWorker] = await Promise.all([
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
  read('../rebuild-v5000/intelligence-global-v5507.js'),
  read('../rebuild-v5000/app-update-v5820.js'),
  read('../rebuild-v5000/sw.js')
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

test('clouds render as bright 3D volumes, not as a false-colour raster sheet', () => {
  assert.match(clouds, /id: LAYER_ID, type: 'custom', renderingMode: '3d'/);
  assert.match(clouds, /layout:\{visibility:'none'\}/);
  assert.match(clouds, /setLayoutProperty\(SATELLITE_CLOUD_LAYER_ID_V6150,'visibility','none'\)/);
  assert.match(clouds, /setLayoutProperty\(EUMETSAT_CLOUD_LAYER_ID_V6150,'visibility','none'\)/);
  assert.match(clouds, /vec3\(0\.70,0\.76,0\.84\)/);
  assert.match(clouds, /version: 6167, map, overlay/);
  assert.match(clouds, /coverageVersion: 6167/);
  assert.match(clouds, /Number\(satelliteMask\.probability\[idx\]\)<=32/);
  assert.match(clouds, /const satelliteMaxClouds = index32Supported \? \(MOBILE \? 1600 : 2800\) : \(MOBILE \? 480 : 760\)/);
  assert.match(clouds, /const CLOUD_VERTEX_LIMIT = MOBILE \? 145000 : 220000/);
  assert.match(clouds, /const CLOUD_STORM_VERTEX_RESERVE = MOBILE \? 24000 : 32000/);
  assert.match(clouds, /new Uint32Array\(indices\)/);
  assert.match(clouds, /indexData instanceof Uint32Array\?gl\.UNSIGNED_INT:gl\.UNSIGNED_SHORT/);
  assert.match(clouds, /SATELLITE_CLOUD_MASK_CACHE_KEY_V6150/);
  assert.match(clouds, /restoreCachedSatelliteCloudMaskV6150\(map\)/);
  assert.match(clouds, /persistSatelliteCloudMaskV6150\(mask\)/);
  assert.match(clouds, /const satellitePuffSlices = cloudLodBand === 'global' \? \(MOBILE \? 5 : 6\)/);
  assert.match(clouds, /lobeD = Math\.cos\(theta \* 7\.0/);
  assert.match(clouds, /cloudCavity=clamp/);
});

test('the 28k source height feed seeds rounded 3D cloud puffs and blends nearby heights', () => {
  assert.match(clouds, /CLOUD_HEIGHT_FEED_URL_V6162/);
  assert.match(clouds, /const heightCandidates = \[\]/);
  assert.match(clouds, /NOAA GOES cloud-top-height sample colocated with current satellite cloud footprint/);
  assert.match(clouds, /sourceHeightAnchorBudget=Math\.floor\(satelliteMaxClouds\*0\.25\)/);
  assert.match(clouds, /maxDirectHeightCandidates = MOBILE \? 5200 : 9000/);
  assert.match(clouds, /sourceHeightIndexCache\?\.key === heightIndexKey/);
  assert.match(clouds, /sourceHeightIndexCache = null/);
  assert.match(clouds, /weighted nearby observations/);
  assert.match(clouds, /cloudTopHeightNeighborCount/);
  assert.match(clouds, /satelliteCloudsWithDirectSourceHeight/);
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
    assert.match(source, /world-v2300-map\.js\?v=6180-globe-risk-retry-and-clipping/);
    assert.match(source, /world-v2300-water\.js\?v=6124-solar-ocean-swell/);
    assert.match(source, /world-v2300-clouds\.js\?v=6167-cloud-startup-performance/);
    assert.match(source, /world-v2300-weather\.js\?v=6138-cloud-linked-lightning/);
    assert.match(source, /world-v2300-time-slider\.js\?v=6167-cloud-startup-performance/);
  }
  assert.match(map, /world-v2300-space\.js\?v=6125-manual-globe-camera/);
  assert.match(timeSlider, /world-v2300-clouds\.js\?v=6167-cloud-startup-performance/);
  assert.match(bootstrap, /world-v2300-weather\.js\?v=6138-cloud-linked-lightning/);
  assert.match(appHtml, /app\.js\?v=6180-globe-risk-retry-and-clipping/);
  assert.match(landingHtml, /landing\.js\?v=6180-globe-risk-retry-and-clipping/);
  assert.match(appHtml, /intelligence-global-v5507\.js\?v=6170-imerg-nrt-timeline/);
  assert.match(landingHtml, /intelligence-global-v5507\.js\?v=6170-imerg-nrt-timeline/);
});

test('global opportunity markers render category glyphs and merge source-backed risk reviews', () => {
  assert.match(map, /rawKey=id\.replace\(\/\^bp-\(\?:opp\|poi\|listing\)-\//);
  assert.match(map, /if\(dot\)x\.restore\(\)/);
  assert.match(map, /eagerOpportunityIcons:keys\.length\*2/);
  assert.match(map, /id:'gta-opportunity-dots',type:'symbol',source:'bpOpportunities',minzoom:0,maxzoom:4\.5/);
  assert.match(map, /'EXPOSURE','bp-opp-exposure-dot'/);
  assert.match(app, /bridgepoint_public_global_risk_viewport_v6174/);
  assert.match(landing, /bridgepoint_public_global_risk_viewport_v6174/);
  assert.match(app, /global_risk_review:true/);
  assert.match(landing, /not a current weather watch/);
  assert.match(app, /zoom<3\?\{p_west:-180,p_south:-85,p_east:180,p_north:85\}/);
  assert.match(landing, /zoom<3\?\{p_west:-180,p_south:-85,p_east:180,p_north:85\}/);
  assert.match(app, /main opportunity feed unavailable; preserving global risk markers/);
  assert.match(landing, /main opportunity feed unavailable; preserving global risk markers/);
  assert.match(map, /id:'gta-opportunity-dot-fallback',type:'circle',source:'bpOpportunities',minzoom:0,maxzoom:4\.5/);
  assert.match(map, /0,1\.05,1,1\.18,2,1\.30,3\.5,1\.42,4\.5,1\.48/);
  assert.match(app, /mainFeedRequest=zoom<3/);
  assert.match(landing, /mainFeedRequest=zoom<3/);
  assert.match(app, /function syncGlobalOpportunityDomMarkersV6180/);
  assert.match(landing, /function syncGlobalOpportunityDomMarkersV6180/);
  assert.match(app, /window\.__BP_GLOBAL_OPPORTUNITY_DOM_MARKERS_V6180__/);
  assert.match(landing, /window\.__BP_GLOBAL_OPPORTUNITY_DOM_MARKERS_V6180__/);
  assert.match(app, /function bpGlobalOpportunityMarkerIsFrontV6180/);
  assert.match(landing, /function bpGlobalOpportunityMarkerIsFrontV6180/);
  assert.match(app, /__bpGlobalRiskFeedCacheV6180/);
  assert.match(landing, /__bpGlobalRiskFeedCacheV6180/);
  assert.match(app, /attempts=zoom<3\?3:1/);
  assert.match(landing, /attempts=zoom<3\?3:1/);
  assert.match(app, /map\.on\('move',state\.visibilityUpdate\)/);
  assert.match(landing, /map\.on\('move',state\.visibilityUpdate\)/);
  assert.match(app, /riskFeedRequest=zoom<3.*?bridgepoint_public_global_risk_viewport_v6174.*?7000/);
  assert.match(landing, /riskFeedRequest=zoom<3.*?bridgepoint_public_global_risk_viewport_v6174.*?7000/);
});

test('both entrypoints perform a real 6167 service-worker cutover before stale startup survives', () => {
  assert.match(landingHtml, /app-update-v5820\.js\?v=6167-cloud-startup-performance/);
  assert.match(appHtml, /app-update-v5820\.js\?v=6167-cloud-startup-performance/);
  assert.match(appUpdate, /const BUILD=6167/);
  assert.match(appUpdate, /CURRENT_CACHE='bp-intelligence-v6167-cloud-startup-performance'/);
  assert.match(appUpdate, /function reloadOnce\(reason\)/);
  assert.match(appUpdate, /location\.replace\(u\.href\)/);
  assert.match(appUpdate, /navigator\.serviceWorker\?\.addEventListener\('controllerchange'/);
  assert.match(serviceWorker, /const V='bp-intelligence-v6167-cloud-startup-performance'/);
  assert.match(clouds, /Number\(existingCloudController\.version\) >= 6167[\s\S]{0,180}Number\(existingState\?\.coverageVersion \|\| existingState\?\.version\) >= 6167/);
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
  assert.match(clouds, /coverageVersion: 6167/);
  assert.match(clouds, /sourceHeightMatchedCount/);
  assert.match(clouds, /satelliteCloudHeightFeedStatus/);
  assert.match(clouds, /alphaBase\*0\.82/);
  assert.match(clouds, /version: 6167, map, overlay/);
  assert.match(clouds, /bp6150-nasa-geostationary-cloud-context/);
  assert.match(clouds, /bp6150-nasa-geostationary-cloud-source/);
  assert.match(clouds, /GOES-East_ABI_Band13_Clean_Infrared/);
  assert.match(clouds, /Himawari_AHI_Band13_Clean_Infrared/);
  assert.match(clouds, /mtg_fd:rgb_geocolour/);
  assert.match(clouds, /initSatelliteCloudContextV6134/);
  assert.match(clouds, /refreshSatelliteCloudMaskV6150/);
  assert.match(clouds, /state\.maskTimer=setInterval/);
  assert.match(clouds, /window\.__BP_SATELLITE_CLOUD_MASK_V6150__/);
  assert.match(clouds, /bp2300:satellite-cloud-mask-updated/);
  assert.match(clouds, /satelliteMaskIndexV6150/);
  assert.match(clouds, /satelliteCloudAnchors/);
  assert.doesNotMatch(clouds, /global satellite cloud-mask feed not yet connected/);
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
  assert.match(app, /'raster-opacity':\['interpolate',\['linear'\],\['zoom'\],0,\.76,1\.5,\.80,3,\.86,5,\.91,8,\.94,12,\.95,18,\.95/);
  assert.match(landing, /'raster-opacity':\['interpolate',\['linear'\],\['zoom'\],0,\.76,1\.5,\.80,3,\.86,5,\.91,8,\.94,12,\.95,18,\.95/);
  assert.match(globalWeather, /'raster-opacity':\['interpolate',\['linear'\],\['zoom'\],0,\.78,1\.5,\.80,3,\.76,4\.5,\.65,6,\.44,6\.3,\.24,6\.8,0/);
  assert.match(lightning, /export function initLightningLayer/);
  assert.match(lightning, /durationMs:3200/);
  assert.match(rain, /if \(!enabled \|\| !cells\.length \|\| zoom < RAIN_START_ZOOM \|\| document\.hidden\)/);
  assert.match(rain, /RAIN_CELL_CONTEXT_GLOW/);
  assert.match(rain, /RAIN_CELL_CONTEXT_CORE/);
  assert.match(rain, /const limit = z < 3\.5 \? \(MOBILE \? 16 : 36\)/);
  assert.match(rain, /rainContextLayerAttached/);
  assert.match(rain, /globalRainLod: true/);
  assert.doesNotMatch(rain, /zoom < 10 \|\| document\.hidden/);
  assert.match(clouds, /window\.__BP_LIGHTNING_CLOUD_ANCHORS_V6135__/);
  assert.match(lightning, /window\.__BP_LIGHTNING_CLOUD_ANCHORS_V6135__/);
  assert.match(lightning, /cloudAnchorFound/);
  assert.match(lightning, /if\(!cloud\)\{cloudAnchorRejectedCount\+\+;continue;\}/);
  assert.doesNotMatch(lightning, /const cc=cloud\|\|\{/);
  assert.match(lightning, /map\.project\(\[anchor\.cloudLng\?\?anchor\.lng,anchor\.cloudLat\?\?anchor\.lat\]\)/);
  assert.match(lightning, /const top=\{x:clamp\(cloudScreen\.x\+jitter,0,bounds\.w\),y:Math\.max\(-12,cloudScreen\.y-height\)\}/);
  assert.match(lightning, /cloudAnchorRejectedCount/);
  assert.match(clouds, /satelliteLightningCloudAnchors/);
  assert.match(clouds, /satelliteCloudHeightsMeasured:\s*\(globalCloudGeometryCache\?\.sourceHeightMatchedCount \|\| 0\) > 0/);
  assert.match(clouds, /satelliteCloudHeightsMeasured:\s*sourceHeightMatchedCount > 0/);
  assert.match(lightning, /bp6135-ground-flash-gradient/);
  assert.match(lightning, /bp6130-ground-flash/);
  assert.match(lightning, /globalLodMarkers/);
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

test('NOAA radar is bright, source-detailed, pinned below 3D structures and animated at every zoom', () => {
  assert.ok(app.includes("maxzoom:18,attribution:'NOAA/NWS radar reflectivity'"));
  assert.ok(app.includes("'raster-opacity':['interpolate',['linear'],['zoom'],0,.76"));
  assert.ok(app.includes("'raster-saturation':.95,'raster-contrast':.48"));
  assert.ok(app.includes("window.__BP_RADAR_TIMELINE_V6170__"));
  assert.ok(app.includes("animationAllZoom:true"));
  assert.ok(app.includes("radarRefreshTimer=setInterval"));
  assert.ok(landing.includes("window.__BP_LANDING_GROUND_RADAR_DRAPE_V6170__"));
  assert.ok(landing.includes("animationAllZoom:true"));
  assert.ok(landing.includes("maxzoom:18,attribution:'NOAA/NWS radar reflectivity'"));
});

test('NASA IMERG uses time-stamped half-hourly NRT data and stays within native global-scale detail', () => {
  assert.ok(globalWeather.includes("IMERG_Precipitation_Rate_30min_v7_NRT"));
  assert.ok(globalWeather.includes("NRT_HALF_HOURLY_6H_LATENCY_GUARD"));
  assert.ok(globalWeather.includes("imergAnimationTimer"));
  assert.ok(globalWeather.includes("imergRefreshTimer"));
  assert.ok(globalWeather.includes("30*60*1000"));
  assert.ok(globalWeather.includes("'raster-opacity':['interpolate',['linear'],['zoom'],0,.78"));
  assert.ok(globalWeather.includes("animationZoomMax:6.3"));
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


test('homepage opportunities load on first globe view and use the deployed public RPC', () => {
  assert.match(landing, /rpc\('bridgepoint_public_opportunity_viewport_v5907'/);
  assert.doesNotMatch(landing, /bridgepoint_public_opportunity_viewport_v5906/);
  assert.match(landing, /window\.__BP_LANDING_WORLD__=world;\s*startLandingOpportunities\(world\);/);
  assert.match(map, /id:'gta-opportunity-dots',type:'symbol',source:'bpOpportunities',minzoom:0,maxzoom:4\.5/);
});

test('website and app start on the same cache-busted globe-first weather build', () => {
  assert.match(landingHtml, /bp-globe-only-first-frame-v6137/);
  assert.match(appHtml, /bp-app-globe-only-first-frame-v6137/);
  assert.ok(landingHtml.includes('landing.js?v=6180-globe-risk-retry-and-clipping'));
  assert.ok(appHtml.includes('app.js?v=6180-globe-risk-retry-and-clipping'));
  assert.ok(landingHtml.includes('intelligence-global-v5507.js?v=6170-imerg-nrt-timeline'));
  assert.ok(appHtml.includes('intelligence-global-v5507.js?v=6170-imerg-nrt-timeline'));
});
