import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const moduleSource=readFileSync(new URL('../rebuild-v5000/bridgepoint-wildfires-volumetric-v1.js',import.meta.url),'utf8');
const buttonSource=readFileSync(new URL('../rebuild-v5000/bridgepoint-view-v5917.js',import.meta.url),'utf8');
const mod=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(moduleSource));
const now=Date.parse('2026-11-19T18:00:00Z');
const data={data:[
 {lon:-112.34,lat:33.25,n:4,ultimo:'2026-11-19 17:52:00',frp_max:32,evento:'desert-mesa-2026',evento_fuente:'perimetro',nombre:'Reported Fire',pais:'US'},
 {lon:-112.34,lat:33.25,n:9,ultimo:'2026-11-19 17:59:00'},
 {lon:15.25,lat:-5.25,n:3,ultimo:'2026-11-19 17:41:00',nombre:'Other fire'},
 {lon:11.2,lat:33.3,n:200,ultimo:'2026-11-15 12:00:00'},
 {lon:200,lat:32,n:2,ultimo:'2026-11-19 17:52:00'},
 {lon:12,lat:40,n:2,ultimo:'2026-11-19 17:52:00',static:true},
 {lon:1,lat:2,n:4,ultimo:'2026-11-19 17:52:00',evento:'../../attack',evento_fuente:'perimetro'}]};
const observed=mod.normalizeActiveFireRecords(data,now);
assert.equal(observed.length,3,'current, valid, de-duped observations only');
assert.equal(observed[0].perimeterSlug,'desert-mesa-2026');
assert.equal(observed[2].perimeterSlug,null,'external perimeter links never interpolate untrusted slugs');
assert.equal(observed[0].coordinates[0],-112.34);
assert.deepEqual(mod.normalizeActiveFireRecords({data:[]},now),[]);
const poly={type:'Polygon',coordinates:[[
 [-112.4,33.2],[-112.2,33.2],[-112.2,33.4],[-112.4,33.4],[-112.4,33.2]
 ]]};
assert.equal(mod.parseFirePerimeter(poly).length,1);
assert.equal(mod.parseFirePerimeter({type:'FeatureCollection',features:[{type:'Feature',geometry:poly}]}).length,1);
assert.deepEqual(mod.parseFirePerimeter({type:'Point',coordinates:[-112.34,33.25]}),[],'point cannot become a surveyed perimeter');
assert.equal(mod.pointWithinFireGeometry([-112.3,33.3],poly),true);
assert.equal(mod.pointWithinFireGeometry([-113.3,34.3],poly),false);
const hole={type:'Polygon',coordinates:[poly.coordinates[0],[
 [-112.35,33.25],[-112.25,33.25],[-112.25,33.35],[-112.35,33.35],[-112.35,33.25]
 ]]};
assert.equal(mod.pointWithinFireGeometry([-112.30,33.30],hole),false);
const eonet=mod.normalizeEonetFires({events:[
 {id:'a',closed:null,title:'Fire',geometry:[{date:'2026-11-19T14:00:00Z',type:'Point',coordinates:[2.3,45.1]}]},
 {id:'b',closed:'2026-11-18T14:00:00Z',geometry:[{date:'2026-11-19T14:00:00Z',type:'Point',coordinates:[2.3,45.1]}]},
 {id:'c',closed:null,title:'Old',geometry:[{date:'2026-10-19T14:00:00Z',type:'Point',coordinates:[2.3,45.1]}]}
]},now);
assert.equal(eonet.length,1,'NASA tracked active dated events only');
assert.equal(eonet[0].source,'NASA EONET');
assert.match(buttonSource,/if\(a==='wildfire'\)\{[\s\S]*?bridgepoint-wildfires-volumetric-v1\.js/);
assert.match(buttonSource,/__BP_LIVE_WILDFIRES_V1__/);
assert.doesNotMatch(buttonSource,/setWildfiresVisible/,'broken weather module wildfire method removed');
for(const name of ['initLiveWildfireRenderer','flameTongue','MeshBasicMaterial','BufferGeometry',
 'queryTerrainElevation','queryRenderedFeatures','pointWithinFireGeometry','worldMatrix',
 'Source-mapped burned area','NASA FIRMS','EONET','setInterval','perimeterSlug','style.load']){
 assert.ok(moduleSource.includes(name),'required renderer feature: '+name);
}
assert.doesNotMatch(moduleSource,/new\s+(?:T\.)?Sprite\s*\(/,'flame FX must be volumetric geometry, not sprites');
assert.doesNotMatch(moduleSource,/new\s+(?:T\.)?PlaneGeometry\s*\(/,'flame FX must not be billboard quads');
console.log('BRIDGEPOINT_LIVE_WILDFIRE_TESTS_PASS',observed.length,'fresh source records; true vs approximate perimeters; native 3D flames, structures and trees');
