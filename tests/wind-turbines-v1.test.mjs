import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  normalizeWindTurbine,windTurbineRenderModeForZoom,windTurbinePopupHtml
} from '../rebuild-v5000/bridgepoint-wind-turbines-v1.js';

const sourceRow={
  case_id:101,faa_ors:'12-345678',faa_asn:'2024-ANM-1234',usgs_pr_id:44,eia_id:5001,
  t_state:'Connecticut',t_county:'Middlesex',t_fips:'09007',
  p_name:'Example Wind Project',p_year:2023,p_tnum:12,p_cap:36,
  t_manu:'Example Turbine Co.',t_model:'ET-3.0',t_cap:3000,
  t_hh:110,t_rd:136,t_rsa:14526,t_ttlh:178,
  t_retrofit:0,t_retro_yr:null,t_offshore:0,t_conf_atr:1,t_conf_loc:2,
  t_img_date:'2025-06-01',t_img_src:'USGS imagery review',
  xlong:-72.6,ylat:41.5
};
const turbine=normalizeWindTurbine(sourceRow);
assert.ok(turbine);
assert.equal(turbine.id,'101');
assert.deepEqual(turbine.geometry.coordinates,[-72.6,41.5]);
assert.equal(turbine.properties.hubHeightM,110);
assert.equal(turbine.properties.rotorDiameterM,136);
assert.equal(turbine.properties.totalTipHeightM,178);
assert.equal(turbine.properties.capacityKw,3000);
assert.equal(turbine.properties.sweptAreaM2,14526);
assert.equal(turbine.properties.dimensionsKnown,true);
assert.equal(turbine.properties.state,'Connecticut');
assert.equal(turbine.properties.offshore,false);
assert.equal(turbine.properties.attributeConfidence,'1');
assert.equal(turbine.properties.locationConfidence,'2');

const offshore=normalizeWindTurbine({...sourceRow,case_id:102,t_offshore:'1'});
assert.equal(offshore.properties.offshore,true);

const incomplete=normalizeWindTurbine({...sourceRow,case_id:103,t_hh:null,t_rd:null,t_ttlh:null});
assert.ok(incomplete);
assert.equal(incomplete.properties.hubHeightM,null);
assert.equal(incomplete.properties.rotorDiameterM,null);
assert.equal(incomplete.properties.totalTipHeightM,null);
assert.equal(incomplete.properties.dimensionsKnown,false);

assert.equal(normalizeWindTurbine({...sourceRow,xlong:181}),null);
assert.equal(normalizeWindTurbine({...sourceRow,ylat:91}),null);
assert.equal(normalizeWindTurbine({...sourceRow,xlong:null}),null);
assert.equal(windTurbineRenderModeForZoom(1),'clustered-global-overview');
assert.equal(windTurbineRenderModeForZoom(8),'ground-anchored-turbine-icons');
assert.equal(windTurbineRenderModeForZoom(16),'measured-dimension-3d-turbines');

const popup=windTurbinePopupHtml(turbine);
assert.match(popup,/Example Turbine Co\./);
assert.match(popup,/110 m/);
assert.match(popup,/136 m/);
assert.match(popup,/178 m/);
assert.match(popup,/Project year<\/span><b>2023/);
assert.match(popup,/Full confidence \(complete, consistent source details\)/);
assert.match(popup,/USGS turbine map/);
assert.match(windTurbinePopupHtml(incomplete),/dimensions are absent/);
assert.match(windTurbinePopupHtml(incomplete),/Not reported/);
assert.match(windTurbinePopupHtml(turbine),/United States inventory/);

const [moduleSource,landing,app,home,appHome,builder,deploy]=await Promise.all([
  readFile(new URL('../rebuild-v5000/bridgepoint-wind-turbines-v1.js',import.meta.url),'utf8'),
  readFile(new URL('../rebuild-v5000/landing.js',import.meta.url),'utf8'),
  readFile(new URL('../rebuild-v5000/app.js',import.meta.url),'utf8'),
  readFile(new URL('../rebuild-v5000/index.html',import.meta.url),'utf8'),
  readFile(new URL('../rebuild-v5000/app-index.html',import.meta.url),'utf8'),
  readFile(new URL('../tools/fetch_uswtdb_turbine_snapshot.mjs',import.meta.url),'utf8'),
  readFile(new URL('../.github/workflows/deploy-intelligence-rebuild-v5000.yml',import.meta.url),'utf8')
]);
assert.ok(moduleSource.includes("const SNAPSHOT_URL = '/data/bridgepoint-uswtdb-turbines-v9_1.json'"));
assert.equal(moduleSource.includes('energy.usgs.gov/api/uswtdb/v1/turbines'),false);
assert.ok(builder.includes("const API_URL = 'https://energy.usgs.gov/api/uswtdb/v1/turbines'"));
assert.ok(builder.includes("'Prefer':'count=exact'"));
assert.ok(builder.includes('USWTDB_V9_1_20260928'));
assert.ok(builder.includes('recordCount:records.length'));

assert.ok(moduleSource.includes('t_hh'));
assert.ok(moduleSource.includes('t_rd'));
assert.ok(moduleSource.includes('clusterMaxZoom:4'));
assert.ok(moduleSource.includes('queryTerrainElevation'));
assert.ok(moduleSource.includes('HIT_ID'));
assert.ok(moduleSource.includes('confidenceLabel'));
assert.ok(moduleSource.includes('±10 m positional tolerance'));
assert.ok(moduleSource.includes('renderer.render(state.scene,state.camera)'));
assert.ok(landing.includes("import('./bridgepoint-wind-turbines-v1.js?v=1-uswtdb-3d-ground-anchored')"));
assert.ok(app.includes("import('./bridgepoint-wind-turbines-v1.js?v=1-uswtdb-3d-ground-anchored')"));
assert.ok(home.includes('landing.js?v=6247-uswtdb-wind-turbines'));
assert.ok(appHome.includes('app.js?v=6247-uswtdb-wind-turbines'));
assert.ok(deploy.includes('node --check rebuild-v5000/bridgepoint-wind-turbines-v1.js'));
assert.ok(deploy.includes('node --check tools/fetch_uswtdb_turbine_snapshot.mjs'));
assert.ok(deploy.includes('node tools/fetch_uswtdb_turbine_snapshot.mjs --output site/data/bridgepoint-uswtdb-turbines-v9_1.json'));
assert.ok(deploy.includes('node tests/wind-turbines-v1.test.mjs'));
assert.ok(deploy.includes('cp rebuild-v5000/bridgepoint-wind-turbines-v1.js site/bridgepoint-wind-turbines-v1.js'));
assert.ok(deploy.includes('cp rebuild-v5000/bridgepoint-wind-turbines-v1.js site/app/bridgepoint-wind-turbines-v1.js'));
console.log('BRIDGEPOINT_WIND_TURBINES_V1_PASS');
