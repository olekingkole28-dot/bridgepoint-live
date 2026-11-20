import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const wildfireSource=readFileSync(new URL('../rebuild-v5000/bridgepoint-wildfires-volumetric-v1.js',import.meta.url),'utf8');
const cardSource=readFileSync(new URL('../rebuild-v5000/bridgepoint-view-v5917.js',import.meta.url),'utf8');
assert.match(cardSource,/__BP_WILDFIRE_STATUS_UI_BOUND_V3__/);
assert.match(cardSource,/bp:wildfire-state/);
assert.match(cardSource,/initLiveWildfireRenderer\(activeMap\)/);
assert.match(cardSource,/data-bpv-action\]:not\(\[data-bpv-action="wildfire"\]\)/);
assert.ok(wildfireSource.includes('refreshPersistentMarkers(state)'));
assert.ok(wildfireSource.includes("const step=zoom<2?6"));
assert.ok(wildfireSource.includes('function flameTongue(T,height,radius,colorIndex,seed)'));
assert.ok(wildfireSource.includes('queryTerrainElevation'));
assert.ok(wildfireSource.includes('WorldFires'));
assert.ok(wildfireSource.includes('pointWithinFireGeometry'));

let created=0,removed=0,primaryRequests=0,secondaryRequests=0;
const markers=new Set();
class Marker{
 constructor(o){this.element=o.element;}
 setLngLat(coordinates){this.coordinates=coordinates;return this;}
 addTo(map){this.map=map;created++;markers.add(this);return this;}
 remove(){if(markers.delete(this))removed++;}
}
globalThis.window={maplibregl:{Marker}};
const createElement=tag=>({
 style:{cssText:''},dataset:{},innerHTML:'',hidden:false,
 title:'',type:'button',className:'',setAttribute(){},getContext(){return null},
 addEventListener(){},
});
globalThis.document={
 getElementById(){return null;},
 head:{appendChild(){}},
 createElement,
 dispatchEvent(){},
};
const status=[];
globalThis.CustomEvent=class{constructor(type,opts){this.type=type;this.detail=opts.detail;}};
document.dispatchEvent=e=>{if(e.type==='bp:wildfire-state')status.push(e.detail);};
let secondaryReject=()=>{};
globalThis.fetch=async (url,{signal}={})=>{
 if(url.includes('worldfires.org')){
  primaryRequests++;
  const last=new Date(Date.now()-5*60*1000).toISOString();
  return {ok:true,json:async()=>({data:[
   {lat:12.3,lon:40.2,n:5,ultimo:last,frp_max:40,nombre:'Observed one'},
   {lat:20.1,lon:51.2,n:2,ultimo:last,frp_max:33,nombre:'Observed two'},
   {lat:-14.1,lon:102.2,n:7,ultimo:last,frp_max:68,nombre:'Observed three'},
  ]})};
 }
 secondaryRequests++;
 return new Promise((resolve,reject)=>{
  secondaryReject=reject;
  if(signal)signal.addEventListener('abort',()=>reject(new Error('cancelled')),{once:true});
 });
};
const map={
 on(){},off(){},getStyle(){return {};},
 getBounds(){return {contains(){return true;}};},
 getZoom(){return 2;},getCenter(){return {lng:40,lat:12};},
 getLayer(){return null;},getSource(){return null;},
 hasImage(){return false;},getCanvas(){return {style:{}};},
 addSource(){throw Error('radar style continuously loading');},
 addLayer(){throw Error('radar style continuously loading');},
 triggerRepaint(){},
};
const src='data:text/javascript;charset=utf-8,'+encodeURIComponent(wildfireSource);
const api=(await import(src)).initLiveWildfireRenderer(map);
assert.ok(api&&api.setEnabled,'real map must initialize the fire layer');
api.setEnabled(true);
await new Promise(resolve=>setTimeout(resolve,120));
assert.equal(primaryRequests,1,'fetch primary detections once');
assert.equal(api.state.fireCount,3,'render primary observations without waiting for secondary NASA response');
assert.equal(api.state.markerCount,3,'persistent HTML map markers survive unavailable map style');
assert.equal(created,3);
assert.equal(secondaryRequests,1,'NASA is only optional enrichment');
assert.ok(status.some(s=>s.fireCount===3&&s.markerCount===3),
 'mobile button must receive truthful number of visible fire markers');
api.setEnabled(false);
assert.equal(api.state.markerCount,0,'disable removes wildfire-only markers');
assert.equal(markers.size,0,'no marker leaks');
assert.equal(removed,3);
api.destroy();
console.log('WILDFIRE_V3_IMMEDIATE_PERSISTENT_MARKERS_TEST_PASS: fire icons show before slow NASA enrichment even when base map style is busy; toggle cleanup passed');
