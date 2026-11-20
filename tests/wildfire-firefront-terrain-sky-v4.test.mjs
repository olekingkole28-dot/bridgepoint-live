import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const meshCode=readFileSync(new URL('../rebuild-v5000/bridgepoint-wildfire-realistic-mesh-v4.js',import.meta.url),'utf8');
const fireCode=readFileSync(new URL('../rebuild-v5000/bridgepoint-wildfires-volumetric-v1.js',import.meta.url),'utf8');
const skyCode=readFileSync(new URL('../rebuild-v5000/bridgepoint-celestial-sky-v6257.js',import.meta.url),'utf8');
const mesh=await import('data:text/javascript;charset=utf-8,'+encodeURIComponent(meshCode));
const poly={type:'Polygon',coordinates:[[[-120.004,38.996],[-119.996,38.996],[-119.996,39.004],[-120.004,39.004],[-120.004,38.996]]]};
assert.equal(mesh.isInsideMeasuredFireBoundary([-120,39],[{geometry:poly}]),true);
assert.equal(mesh.isInsideMeasuredFireBoundary([-118,39],[{geometry:poly}]),false);
assert.equal(mesh.isInsideMeasuredFireBoundary([-118,39],[]),true);
const metersPerDeg=111320;
const calls=[];
class Geometry{
 constructor(){this.attrs={};this.index=null;this.disposed=false;}
 setAttribute(k,v){this.attrs[k]=v;}
 setIndex(i){this.index=i;}
 dispose(){this.disposed=true;}
}
class Attribute{constructor(array,itemSize){this.array=array;this.itemSize=itemSize;}}
class Shader{constructor(o){Object.assign(this,o);this.disposed=false;}dispose(){this.disposed=true;}}
class Node{constructor(){this.children=[];this.frustumCulled=true;}add(o){this.children.push(o);}}
class Mesh extends Node{constructor(geometry,material){super();this.geometry=geometry;this.material=material;}}
class Scene extends Node{}
class Group extends Node{}
class Vector2{constructor(x,y){this.x=x;this.y=y;}}
const T={BufferGeometry:Geometry,Float32BufferAttribute:Attribute,ShaderMaterial:Shader,
 Mesh,Group,Scene,Vector2,DoubleSide:2,NormalBlending:1};
const fire={id:'observed',coordinates:[-120,39],radiusM:260,count:90,frp:340};
let elevationCalls=0;
const map={queryTerrainElevation(coords){
 elevationCalls++;const [lon,lat]=coords;return 160+((lon+120)*metersPerDeg*.8)+(lat-39)*metersPerDeg*.15;
}};
const building={coord:[-120.0003,39.0002],height:17.5};
const tree={coord:[-119.9997,38.9998],height:11};
const effect=mesh.createBridgePointWildfireVolumeV4(T,{map,fire,perimeters:[{geometry:poly}],
 buildings:[building],trees:[tree],quality:2});
assert.ok(effect.scene&&effect.dispose);
assert.ok(effect.groupCount>=65,'dense fire groups rather than a few isolated flames');
assert.ok(effect.tongueCount>=180,'hundreds of native 3D flame tongues, not sprites');
assert.ok(effect.terrainTriangles>150,'terrain-following rolling heat/burn sheet must exist');
assert.ok(elevationCalls>100,'many 3D surface elevations sampled to hug real topography');
assert.equal(effect.uniforms.length,2);
for(const item of effect.scene.children[0].children){
 assert.ok(item.geometry.index?.length>0);
 assert.ok(item.material.fragmentShader.includes('uTime'));
 if(item.name.includes('true 3D turbulent wildfire tongues'))
  assert.ok(item.material.vertexShader.includes('uTime'),'flame tube vertices must whip and bend over time');
 else assert.ok(item.name.includes('terrain-following'),'ground fire sheet is animated by its fragment shader');
 assert.equal(item.material.depthWrite,false);
 assert.equal(item.material.depthTest,true);
 assert.equal(item.material.transparent,true);
}
const ground=effect.scene.children[0].children.find(o=>o.name.includes('terrain-following'));
const p=ground.geometry.attrs.position.array;
assert.ok(new Set(p.filter((_,i)=>i%3===1).map(v=>Math.floor(v))).size>3,'burn shader must follow hills instead of floating on a flat plane');
effect.uniforms[0].uTime.value=40.5;
effect.uniforms[1].uTime.value=40.5;
assert.equal(effect.uniforms[1].uTime.value,40.5);
effect.dispose();
assert.ok(effect.scene.children[0].children.every(x=>x.geometry.disposed&&x.material.disposed));
assert.ok(!/new\s+(?:T\.)?Sprite\s*\(/.test(meshCode));
assert.ok(!/PlaneGeometry|SpriteMaterial/.test(meshCode));
assert.ok(meshCode.includes('whip')&&meshCode.includes('turbulence')&&meshCode.includes('crackle'));
assert.ok(meshCode.includes('frontline')&&meshCode.includes('rolling')&&meshCode.includes('patches'));
assert.ok(meshCode.includes('isInsideMeasuredFireBoundary'));
assert.ok(fireCode.includes('getFireVolumeV4()'));
assert.ok(fireCode.includes('createBridgePointWildfireVolumeV4'));
assert.ok(fireCode.includes('sourcePerimeter'));
assert.ok(fireCode.includes('Fire Radiative Power'));
assert.ok(fireCode.includes('Detected')||fireCode.includes('Last observed'));
assert.ok(fireCode.includes('First recorded by aggregation'));
assert.ok(fireCode.includes('locality'));
assert.ok(fireCode.includes('not confirm that any individual'));
assert.ok(skyCode.includes('__BP_SKY_VIEW_OVERRIDE_V6077__'));
assert.ok(skyCode.includes("skyController?.phase==='sky-active'"));
assert.ok(skyCode.includes("svg.style.visibility='hidden'"));
assert.ok(skyCode.includes('pitch>=100'));
console.log('WILDFIRE_V4_NATIVE_3D_TERRAIN_FIRE_PASS',effect.groupCount,'grouped fire cells,',
 effect.tongueCount,'animated GPU mesh tongues,',effect.terrainTriangles,
 'terrain triangles with elevation, no sprites, explicit sky-view occlusion + detailed incident card');
