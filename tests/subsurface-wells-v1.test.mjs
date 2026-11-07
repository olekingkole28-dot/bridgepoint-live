import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  parseSubsurfaceDepth,isSealedWellStatus,resolveWellGroundElevation,normalizeUsGsWell,normalizeBgsOffshoreWell,
  normalizeBgsBorehole,normalizeNoaaWell,normalizeWpdxWell,normalizeOsmWell,subsurfacePopupHtml
} from '../rebuild-v5000/bridgepoint-subsurface-wells-v1.js';

assert.equal(parseSubsurfaceDepth('100 ft'),30.48);
assert.equal(parseSubsurfaceDepth(100,'ft'),30.48);
assert.equal(parseSubsurfaceDepth('2.5 km'),2500);
assert.equal(parseSubsurfaceDepth('-10 m'),null);
assert.equal(parseSubsurfaceDepth('depth unknown'),null);
assert.equal(isSealedWellStatus('PLUGGED AND ABANDONED'),true);
assert.equal(isSealedWellStatus('Capped'),true);
assert.equal(isSealedWellStatus('In service'),false);
assert.equal(resolveWellGroundElevation(null,184),184,'missing source elevation must anchor to sampled terrain');
assert.equal(resolveWellGroundElevation(undefined,-110.64),-110.64,'negative seabed elevations must be preserved');
assert.equal(resolveWellGroundElevation(0,184),0,'a genuine zero-metre source elevation is valid');
assert.equal(resolveWellGroundElevation(32.5,184),32.5,'source-reported surface elevation takes precedence');
assert.equal(resolveWellGroundElevation(null,null),0,'sea-level fallback is used only when neither source nor DEM elevation is available');

const usgs=normalizeUsGsWell({id:'USGS-X',geometry:{type:'Point',coordinates:[-72.1,41.2]},properties:{
  id:'USGS-X',monitoring_location_number:'123456',monitoring_location_name:'Test well',
  site_type:'Well',country_name:'United States',state_name:'Connecticut',county_name:'Middlesex',
  hole_constructed_depth:300,well_constructed_depth:250,aquifer_code:'112GLCLU',
  national_aquifer_code:'S100NATLCP',aquifer_type_code:'C',altitude:100
}});
assert.ok(usgs);assert.equal(usgs.properties.depthM,91.44);
assert.equal(usgs.properties.depthType,'drilled hole depth');
assert.match(usgs.properties.aquifer,/112GLCLU/);
assert.equal(normalizeUsGsWell({geometry:{type:'Point',coordinates:[200,0]},properties:{}}),null);

const bgsOff=normalizeBgsOffshoreWell({id:8,geometry:{type:'Point',coordinates:[-1,58]},properties:{
  wellid:88,wellname:'Test-88',well_status:'PLUGGED AND ABANDONED',well_class:'APPRAISAL',
  well_flow_class:'Oil well',tvd_m:2773.84,td_m:2798.06,water_depth_m:110.64,
  well_deviation:'VERTICAL',details:'https://example.com/well/88'
}});
assert.ok(bgsOff);assert.equal(bgsOff.properties.depthM,2773.84);
assert.equal(bgsOff.properties.depthType,'true vertical depth (TVD)');
assert.equal(bgsOff.properties.sealed,true);assert.equal(bgsOff.properties.surfaceElevationM,-110.64);
assert.equal(normalizeBgsOffshoreWell({geometry:{type:'Point',coordinates:[0,0]},properties:{wellid:9,well_flow_class:'Gas well',td_m:900}}).properties.kind,'gas');

const bgsHole=normalizeBgsBorehole({id:1,geometry:{type:'Point',coordinates:[-3,53]},properties:{
  reference:'SD20NE1',name:'Formby 4',length:1182.62,water_well_ref:'SD20/3',year_known:'1950',
  scan_url:'https://example.com/scan/1',precision:'± METRE'
}});
assert.ok(bgsHole);assert.equal(bgsHole.properties.kind,'water');assert.equal(bgsHole.properties.depthM,1182.62);
assert.equal(normalizeBgsBorehole({geometry:{type:'Point',coordinates:[-3,53]},properties:{reference:'NO-DATA',length:-2}}).properties.depthKnown,false);

const noaa=normalizeNoaaWell({id:1,geometry:{type:'Point',coordinates:[-119.5,34.3]},properties:{
  OBJECTID:1,wellStatus:'Permanently abandoned',wellType:'Development',sourceRecord:'California'
}});
assert.ok(noaa);assert.equal(noaa.properties.depthKnown,false);assert.equal(noaa.properties.sealed,true);
assert.equal(noaa.properties.kind,'drillhole','NOAA wellType is not a commodity, do not infer oil or gas');

const wpdx=normalizeWpdxWell({row_id:'30',lat_deg:'11.7424',lon_deg:'38.1324',
  water_source_category:'Well',water_tech:'Hand Dug Well',country_name:'Ethiopia',
  status_clean:'Non-Functional',data_lnk:{url:'https://example.com/source'}});
assert.ok(wpdx);assert.equal(wpdx.properties.kind,'water');assert.equal(wpdx.properties.depthKnown,false);
assert.equal(normalizeWpdxWell({row_id:'not-well',lat_deg:'1',lon_deg:'1',water_source_category:'Kiosk',water_tech:'Tapstand'}),null);

const osm=normalizeOsmWell({type:'node',id:5,lat:30,lon:-90,tags:{
  man_made:'gas_well',name:'Gas-5','well:depth':'120 ft',status:'plugged',operator:'Example'
}});
assert.ok(osm);assert.equal(osm.properties.kind,'gas');assert.equal(osm.properties.depthM,36.576);
assert.equal(osm.properties.sealed,true);

const popup=subsurfacePopupHtml(usgs);
assert.match(popup,/91.44 m/);assert.match(popup,/diameter is intentionally exaggerated/);
assert.match(subsurfacePopupHtml(wpdx),/Not reported by this source/);

const [moduleSource,landing,app,home,appHome,deploy,utility] = await Promise.all([
  readFile(new URL('../rebuild-v5000/bridgepoint-subsurface-wells-v1.js',import.meta.url),'utf8'),
  readFile(new URL('../rebuild-v5000/landing.js',import.meta.url),'utf8'),
  readFile(new URL('../rebuild-v5000/app.js',import.meta.url),'utf8'),
  readFile(new URL('../rebuild-v5000/index.html',import.meta.url),'utf8'),
  readFile(new URL('../rebuild-v5000/app-index.html',import.meta.url),'utf8'),
  readFile(new URL('../.github/workflows/deploy-intelligence-rebuild-v5000.yml',import.meta.url),'utf8'),
  readFile(new URL('../.github/workflows/publish-utility-solid-wires-v9.yml',import.meta.url),'utf8')
]);
assert.ok(moduleSource.includes('m.depthTest=false'));
assert.ok(moduleSource.includes('if(!Number.isFinite(item.groundElevationM))'), 'null source elevation must trigger a terrain sample instead of coercing to sea level');
assert.ok(moduleSource.includes('resolveWellGroundElevation(item.groundElevationM,terrainElevation)'));
assert.ok(moduleSource.includes('maxzoom:24'));
assert.ok(moduleSource.includes('const cap=50000'));
assert.ok(moduleSource.includes("[bbox[1],bbox[0],bbox[3],bbox[2]].join(',')"), 'regional WPdx enrichment uses south/west/north/east bounds');
assert.ok(landing.includes("import('./bridgepoint-subsurface-wells-v1.js?v=1-global-wells-depth-casing')"));
assert.ok(app.includes("import('./bridgepoint-subsurface-wells-v1.js?v=1-global-wells-depth-casing')"));
assert.ok(home.includes('landing.js?v=6246-offshore-energy-v2&sidewalk=6223-sidewalk-3d-global&bp=5970-globe-model-matrices&sw=1'));
assert.ok(appHome.includes('app.js?v=6246-offshore-energy-v2&sidewalk=6223-sidewalk-3d-global&bp=5970-globe-model-matrices&sw=1'));
assert.ok(deploy.includes('cp rebuild-v5000/bridgepoint-subsurface-wells-v1.js site/bridgepoint-subsurface-wells-v1.js'));
assert.ok(deploy.includes('cp rebuild-v5000/bridgepoint-subsurface-wells-v1.js site/app/bridgepoint-subsurface-wells-v1.js'));
assert.ok(deploy.includes('node tests/subsurface-wells-v1.test.mjs'));
assert.ok(utility.includes('landing.js?v=6246-offshore-energy-v2'));
assert.ok(utility.includes('app.js?v=6246-offshore-energy-v2'));
console.log('BRIDGEPOINT_SUBSURFACE_WELLS_V1_PASS');
