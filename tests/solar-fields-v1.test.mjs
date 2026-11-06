import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  normalizeUspvdbFeature,
  normalizeSolarOsmElement,
  normalizeSolarWorldSnapshot,
  solarFieldRenderModeForZoom,
  solarFieldPopupHtml
} from '../rebuild-v5000/bridgepoint-solar-fields-v1.js';

const polygon={
  type:'Feature',
  id:7,
  geometry:{type:'Polygon',coordinates:[[
    [-73.001,41.001],[-72.999,41.001],[-72.999,40.999],
    [-73.001,40.999],[-73.001,41.001]
  ]]},
  properties:{
    objectid:7,case_id:7001,p_sys_type:'ground',p_tech_pri:'PV',
    p_name:'Example Solar Farm',p_state:'Connecticut',p_county:'Middlesex',
    p_year:2024,p_cap_ac:4.2,p_cap_dc:5.1,p_area:24000,
    p_tilt:25,p_azimuth:180,p_dig_conf:4,p_img_date:20230615,
    p_axis:'single-axis',p_type:'greenfield',p_agrivolt:'non-agrivoltaic'
  }
};
const site=normalizeUspvdbFeature(polygon);
assert.ok(site);
assert.equal(site.id,'uspvdb:7001');
assert.equal(site.properties.name,'Example Solar Farm');
assert.equal(site.properties.systemType,'ground-mounted');
assert.equal(site.properties.method,'photovoltaic');
assert.equal(site.properties.capacityAcMW,4.2);
assert.equal(site.properties.capacityDcMW,5.1);
assert.equal(site.properties.areaM2,24000);
assert.equal(site.properties.tiltDeg,25);
assert.equal(site.properties.azimuthDeg,180);
assert.ok(site.properties.modelGeometry);
assert.ok(site.properties.modelDimensions.lengthM>200);
assert.ok(site.properties.modelDimensions.widthM>150);
assert.deepEqual(site.geometry.coordinates,[-73,41]);

assert.equal(normalizeUspvdbFeature({...polygon,properties:{...polygon.properties,p_sys_type:'roof'}}),null);
assert.equal(normalizeUspvdbFeature({...polygon,properties:{...polygon.properties,p_sys_type:'canopy'}}),null);
assert.equal(normalizeUspvdbFeature({...polygon,properties:{...polygon.properties,p_sys_type:'floating'}}),null);
assert.equal(normalizeUspvdbFeature({...polygon,properties:{...polygon.properties,p_tech_pri:'CSP'}}),null);
assert.equal(normalizeUspvdbFeature({...polygon,geometry:null}),null);

const osmNode=normalizeSolarOsmElement({
  type:'node',id:987,lat:41.25,lon:-72.75,
  tags:{'plant:source':'solar','plant:method':'photovoltaic',
    name:'OSM Solar Field',operator:'Example Energy',
    'plant:output:electricity':'15 MW',start_date:'2020'}
});
assert.ok(osmNode);
assert.equal(osmNode.id,'osm:node/987');
assert.equal(osmNode.properties.name,'OSM Solar Field');
assert.equal(osmNode.properties.capacityAcMW,15);
assert.equal(osmNode.properties.year,2020);
assert.equal(osmNode.properties.modelGeometry,null);
assert.match(osmNode.properties.locationAccuracy,/point\/center/);

const snapshotFeatures=normalizeSolarWorldSnapshot({
  typeLegend:['node','way','relation'],
  ids:[700,701],typeCodes:[1,2],
  lngs:[-72.75,14.25],lats:[41.25,50.5],
  tagNames:['plant:output:electricity','plant:method','name','operator','start_date'],
  tagValueTable:['18 MW','photovoltaic','Snapshot PV','Snapshot Energy','2018-05-01','solar thermal','Thermal Site'],
  tagIndexOffsets:[0,5,8],
  tagNameCodes:[0,1,2,3,4,1,2,4],
  tagValueCodes:[0,1,2,3,4,5,6,4]
});
assert.equal(snapshotFeatures.length,1);
assert.equal(snapshotFeatures[0].id,'osm:way/700');
assert.equal(snapshotFeatures[0].properties.name,'Snapshot PV');
assert.equal(snapshotFeatures[0].properties.capacityAcMW,18);
assert.equal(snapshotFeatures[0].properties.operator,'Snapshot Energy');
assert.equal(snapshotFeatures[0].properties.year,2018);
assert.equal(snapshotFeatures[0].geometry.coordinates[0],-72.75);
assert.equal(snapshotFeatures[0].properties.modelGeometry,null);
assert.throws(()=>normalizeSolarWorldSnapshot({ids:[1]}),/unsupported schema/);

const osmWay=normalizeSolarOsmElement({
  type:'way',id:988,
  geometry:[
    {lon:-73.001,lat:41.001},{lon:-72.999,lat:41.001},
    {lon:-72.999,lat:40.999},{lon:-73.001,lat:40.999}
  ],
  tags:{'plant:source':'solar','plant:method':'photovoltaic',name:'Mapped PV Boundary'}
});
assert.ok(osmWay);
assert.equal(osmWay.properties.modelSource,'OSM mapped plant polygon');
assert.ok(osmWay.properties.modelGeometry);
assert.ok(osmWay.properties.modelAreaM2>0);
assert.ok(osmWay.properties.modelDimensions.lengthM>200);
assert.ok(osmWay.properties.modelDimensions.widthM>150);

assert.equal(normalizeSolarOsmElement({
  type:'node',id:989,lat:41,lon:-73,tags:{'generator:source':'solar'}
}),null);
assert.equal(normalizeSolarOsmElement({
  type:'node',id:990,lat:41,lon:-73,tags:{'plant:source':'solar','plant:method':'solar thermal'}
}),null);
assert.equal(normalizeSolarOsmElement({
  type:'node',id:991,lat:91,lon:-73,tags:{'plant:source':'solar'}
}),null);

assert.equal(solarFieldRenderModeForZoom(1),'global-farm-clusters');
assert.equal(solarFieldRenderModeForZoom(8),'solar-field-icons-and-footprints');
assert.equal(solarFieldRenderModeForZoom(15),'ground-anchored-3d-solar-arrays');
const popup=solarFieldPopupHtml(site);
assert.match(popup,/Example Solar Farm/);
assert.match(popup,/4\.2 MW/);
assert.match(popup,/5\.1 MW/);
assert.match(popup,/24,000 m²/);
assert.match(popup,/USPVDB digitization confidence/);
assert.match(popup,/not source-reported/);
assert.match(solarFieldPopupHtml(osmNode),/Reported electrical output/);
assert.doesNotMatch(solarFieldPopupHtml(osmNode),/AC capacity/);

const source=await readFile(new URL('../rebuild-v5000/bridgepoint-solar-fields-v1.js',import.meta.url),'utf8');
assert.match(source,/id:MODEL_ID,type:'custom',renderingMode:'3d'/);
assert.match(source,/queryTerrainElevation/);
assert.match(source,/item\.root\.visible=false/);
assert.match(source,/plant:source/);
assert.doesNotMatch(source,/generator:source/);

console.log('solar fields v1: PASS');
