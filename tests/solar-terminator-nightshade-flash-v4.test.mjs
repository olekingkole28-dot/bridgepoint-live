import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=readFileSync(new URL('../release-v2300/world-v2300-map.js',import.meta.url),'utf8');
const start=source.indexOf(' function solarNightGeometry(sun){');
const end=source.indexOf('\n function updateWorldLight(){',start);
assert.ok(start>=0&&end>start,'Earth-fixed solar mask exists');
const code=source.slice(start,end);
assert.ok(!code.includes('Math.atan2(-cosDec'),'a winter sun must not put the terminator in the wrong atan2 quadrant');
assert.ok(code.includes('Math.atan(-cosDec*cosHour/sinDec)'),'terminator uses the physical atan [-90,90] branch');
assert.ok(code.includes("segments=180"),'night shading uses bounded, individually triangulable strips');
const geometry=Function('clamp',code+';return solarNightGeometry;')((value,min,max)=>Math.max(min,Math.min(max,value)));
const rad=Math.PI/180;
function pointInPolygon(lon,lat,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const [a,b]=ring[i],[c,d]=ring[j];
  if(((b>lat)!==(d>lat))&&(lon<(c-a)*(lat-b)/(d-b)+a))inside=!inside;
 }
 return inside;
}
function shaded(lon,lat,features){
 return features.some(f=>pointInPolygon(lon,lat,f.geometry.coordinates[0]));
}
function check(dec,solarLon){
 const geo=geometry({lat:dec,lng:solarLon});
 assert.equal(geo.type,'FeatureCollection');
 assert.ok(geo.features.length>0&&geo.features.length<=180);
 for(const f of geo.features){
  assert.equal(f.geometry.type,'Polygon');
  const r=f.geometry.coordinates[0];
  assert.equal(r.length,5);
  assert.deepEqual(r[0],r[4]);
  for(const pt of r)assert.ok(pt.every(Number.isFinite));
 }
 let checked=0,wrong=0,first=null;
 for(let lon=-175;lon<180;lon+=10)for(let lat=-75;lat<=75;lat+=10){
  const dot=Math.cos(lat*rad)*Math.cos(dec*rad)*Math.cos((lon-solarLon)*rad)+Math.sin(lat*rad)*Math.sin(dec*rad);
  if(Math.abs(dot)<0.08)continue;
  checked++;
  const actual=shaded(lon,lat,geo.features),expected=dot<0;
  if(actual!==expected){wrong++;first=first||{dec,solarLon,lon,lat,dot,expected,actual}}
 }
 assert.ok(wrong===0,'night mask should match solar geometry within 2°: '+JSON.stringify({checked,wrong,first}));
 return {checked,strips:geo.features.length};
}
const results=[];
for(const dec of [-23.44,-20,-5,0,5,20,23.44])for(const lon of [-160,-65,0,60,135])results.push(check(dec,lon));
for(const dec of [-23.44,-20,-5,5,20,23.44]){
 const g=geometry({lat:dec,lng:-60}).features;
 assert.equal(shaded(-60,40,g),dec<0&&40>70?true:false,'direct sunlight near North America never blacked out by wrong quadrant for this location');
}
assert.match(source,/id:'gta-solar-night-shade',type:'fill',source:'bpSolarNight'/);
assert.match(source,/'fill-opacity':\.48/,'preserve intended 48% night tint rather than removing night/day appearance');
assert.match(source,/nightSource\.setData\(solarNightGeometry\(subsolar\)\)/);
assert.match(source,/solarTimer=setInterval\(updateWorldLight,300000\)/);
for(const id of ['gta-nasa','gta-esri','gta-usgs','gta-oam'])assert.ok(source.includes("id:'"+id+"'"));
console.log('BRIDGEPOINT_SOLAR_NIGHT_GEOMETRY_REAL_WORLD_PASS',results.length,'hemisphere tests',results.reduce((s,r)=>s+r.checked,0),'point classifications');
