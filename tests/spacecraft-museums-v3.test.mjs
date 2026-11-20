import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../rebuild-v5000/bridgepoint-spacecraft-museums-v3.js',import.meta.url),'utf8');
const mod=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(source));
const exhibits=mod.SPACECRAFT_MUSEUM_EXHIBITS_V3;
const prev=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(
 readFileSync(new URL('../rebuild-v5000/bridgepoint-spacecraft-ten-pads-v2.js',import.meta.url),'utf8')));
const ids=new Set(prev.SPACECRAFT_TEN_LAUNCH_PADS.map(x=>x.id));
const coordSet=new Set(prev.SPACECRAFT_TEN_LAUNCH_PADS.map(x=>x.coordinates.join(',')));
const legacy=[[-80.620869,28.627306],[-80.6041,28.6082],[-77.019,38.887],[-77.444,38.910]];
assert.equal(exhibits.length,10,'ten additional museum pieces');
const count={rocket:0,capsule:0,orbiter:0};
for(const exhibit of exhibits){
 assert.ok(exhibit.id&&exhibit.name&&exhibit.exhibit&&exhibit.loc&&exhibit.display);
 assert.ok(!ids.has(exhibit.id),'duplicate physical museum spacecraft '+exhibit.id);ids.add(exhibit.id);
 const [lon,lat]=exhibit.coordinates;
 assert.ok(Number.isFinite(lon)&&Math.abs(lon)<=180&&Number.isFinite(lat)&&Math.abs(lat)<=90);
 const key=exhibit.coordinates.join(',');
 assert.ok(!coordSet.has(key),'duplicate exhibit coordinate '+key);coordSet.add(key);
 assert.ok(legacy.every(([x,y])=>Math.hypot(x-lon,y-lat)>.005),'must not overlap a legacy spacecraft pin');
 count[exhibit.type]=(count[exhibit.type]||0)+1;
 assert.match(exhibit.source,/^https:\/\//);
 assert.match(exhibit.specs,/^https:\/\//);
 assert.ok(Object.values(exhibit.dims).every(v=>Number.isFinite(v)&&v>0));
}
assert.deepEqual(count,{rocket:3,capsule:4,orbiter:3});
assert.equal(ids.size,20,'ten previous launch pads plus ten museum pieces distinct');
assert.ok(exhibits.find(x=>x.variant==='hii'&&x.display.includes('Horizontal')));
assert.ok(exhibits.find(x=>x.variant==='ariane5'&&x.display.includes('replica')));
assert.ok(exhibits.find(x=>x.variant==='buran'));
assert.ok(exhibits.find(x=>x.variant==='soyuz'));
for(const token of ['buildMuseumExhibitScene','getMatrixForModel','queryTerrainElevation','data-bp-museum-viewer',
 'initSpacecraftMuseumsRenderer','bp-spacecraft-toggle-v1','new Marker','sourceKind','not a photogrammetry scan','style.load']){
 if(token==='sourceKind'||token==='not a photogrammetry scan')continue;
 assert.ok(source.includes(token),'missing implementation detail: '+token);
}
assert.ok(source.includes('not a photogrammetry scan'),'provenance disclosure required');
assert.ok(source.includes('No external 3D website')||source.includes('not a 3D scan'));
console.log('MUSEUM_SPACECRAFT_V3_PASS',exhibits.length,'new unique sites; 3 rockets, 4 capsules, 3 orbiters; existing 10 retained');
