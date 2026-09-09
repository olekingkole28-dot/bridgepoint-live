import{TIER}from'./world-v2300-config.js';

const EMPTY={type:'FeatureCollection',features:[]};
const has=(m,id)=>{try{return!!m.getLayer(id)}catch(_){return false}};
const add=(m,l,before)=>{try{if(!has(m,l.id))m.addLayer(l,before&&has(m,before)?before:undefined)}catch(e){console.warn('V2300 rail 3D layer',l.id,e)}};
const cap=TIER==='LOW'?260:TIER==='HIGH'?900:520;
const mLon=lat=>111320*Math.max(.12,Math.cos(lat*Math.PI/180));
const mLat=110540;
function toLocal(p,o){return[(p[0]-o[0])*mLon(o[1]),(p[1]-o[1])*mLat]}
function toLngLat(p,o){return[o[0]+p[0]/mLon(o[1]),o[1]+p[1]/mLat]}
function segFrame(a,b){const o=[(a[0]+b[0])/2,(a[1]+b[1])/2],A=toLocal(a,o),B=toLocal(b,o),dx=B[0]-A[0],dy=B[1]-A[1],len=Math.hypot(dx,dy);if(len<.35)return null;const ux=dx/len,uy=dy/len,nx=-uy,ny=ux;return{o,A,B,ux,uy,nx,ny,len}}
function ribbon(a,b,halfWidth,offset=0){const f=segFrame(a,b);if(!f)return null;const{A,B,nx,ny,o}=f;const c1=[A[0]+nx*(offset+halfWidth),A[1]+ny*(offset+halfWidth)],c2=[B[0]+nx*(offset+halfWidth),B[1]+ny*(offset+halfWidth)],c3=[B[0]+nx*(offset-halfWidth),B[1]+ny*(offset-halfWidth)],c4=[A[0]+nx*(offset-halfWidth),A[1]+ny*(offset-halfWidth)];return[toLngLat(c1,o),toLngLat(c2,o),toLngLat(c3,o),toLngLat(c4,o),toLngLat(c1,o)]}
function tie(a,b){const f=segFrame(a,b);if(!f)return null;const{o,ux,uy,nx,ny}=f,c=[0,0],halfL=1.48,halfW=.11;const pts=[[c[0]+nx*halfL+ux*halfW,c[1]+ny*halfL+uy*halfW],[c[0]+nx*halfL-ux*halfW,c[1]+ny*halfL-uy*halfW],[c[0]-nx*halfL-ux*halfW,c[1]-ny*halfL-uy*halfW],[c[0]-nx*halfL+ux*halfW,c[1]-ny*halfL+uy*halfW]];pts.push(pts[0]);return pts.map(p=>toLngLat(p,o))}
function feature(ring,part,sourceClass){return{type:'Feature',geometry:{type:'Polygon',coordinates:[ring]},properties:{part,source_class:sourceClass||'rail'}}}

export function initRail3D(map){
 if(!map)return null;if(window.__bpRail3DV2300?.map===map)return window.__bpRail3DV2300;let installed=false,segments=0,polygons=0,timer=0;
 function install(){
  let ready=false;try{ready=map.isStyleLoaded?.()===true||!!map.getSource?.('ofm')}catch(_){}if(!ready)return;
  try{if(!map.getSource('bp-rail3d-v2300'))map.addSource('bp-rail3d-v2300',{type:'geojson',data:EMPTY})}catch(e){console.warn('V2300 rail 3D source',e)}
  add(map,{id:'gta-rail3d-bed',type:'fill-extrusion',source:'bp-rail3d-v2300',minzoom:16.0,filter:['==',['get','part'],'bed'],paint:{'fill-extrusion-color':'#2e2d29','fill-extrusion-base':.015,'fill-extrusion-height':.095,'fill-extrusion-opacity':.98,'fill-extrusion-vertical-gradient':false}},'gta-context-buildings');
  add(map,{id:'gta-rail3d-ties',type:'fill-extrusion',source:'bp-rail3d-v2300',minzoom:16.2,filter:['==',['get','part'],'tie'],paint:{'fill-extrusion-color':'#8a643d','fill-extrusion-base':.09,'fill-extrusion-height':.155,'fill-extrusion-opacity':.99,'fill-extrusion-vertical-gradient':false}},'gta-context-buildings');
  add(map,{id:'gta-rail3d-steel',type:'fill-extrusion',source:'bp-rail3d-v2300',minzoom:16.0,filter:['==',['get','part'],'steel'],paint:{'fill-extrusion-color':'#d9e2e4','fill-extrusion-base':.15,'fill-extrusion-height':.255,'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':true}},'gta-context-buildings');
  installed=true;
 }
 function rebuild(){
  clearTimeout(timer);timer=setTimeout(()=>{
    if(map.getZoom()<16){segments=0;polygons=0;try{map.getSource('bp-rail3d-v2300')?.setData(EMPTY)}catch(_){}return}
    if(!has(map,'gta-rail-ballast'))return;let fs=[];try{fs=map.queryRenderedFeatures({layers:['gta-rail-ballast']})||[]}catch(_){return}
    const out=[],seen=new Set();let used=0;
    outer:for(const f of fs){const br=String(f.properties?.brunnel||'').toLowerCase();if(br==='tunnel'||br==='bridge')continue;const g=f.geometry,lines=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];for(const line of lines){for(let i=0;i<line.length-1;i++){if(used>=cap)break outer;const a=line[i],b=line[i+1],key=`${a[0].toFixed(5)}:${a[1].toFixed(5)}:${b[0].toFixed(5)}:${b[1].toFixed(5)}`;if(seen.has(key))continue;seen.add(key);const frame=segFrame(a,b);if(!frame||frame.len>.5e4)continue;const bed=ribbon(a,b,1.55,0),left=ribbon(a,b,.065,-.72),right=ribbon(a,b,.065,.72),t=tie(a,b);if(!bed||!left||!right)continue;out.push(feature(bed,'bed',f.properties?.class),feature(left,'steel',f.properties?.class),feature(right,'steel',f.properties?.class));if(t&&used%2===0)out.push(feature(t,'tie',f.properties?.class));used++}}}
    segments=used;polygons=out.length;try{map.getSource('bp-rail3d-v2300')?.setData({type:'FeatureCollection',features:out});map.triggerRepaint()}catch(_){}
  },TIER==='LOW'?260:150)
 }
 install();map.on('styledata',()=>{install();rebuild()});map.on('moveend',rebuild);map.on('zoomend',rebuild);for(const ms of [120,500,1500,3500])setTimeout(()=>{install();rebuild()},ms);
 const api={version:2300,map,requirementKey:'v2300_3d_rail_tracks_v1',rebuild,get state(){return{installed,segments,polygons,sourceAlignment:'OpenFreeMap/OpenStreetMap transportation rail',terrainRelativeMapLibreExtrusions:true,bedTiesAndDualSteel:true,visualGaugeMeters:1.44,surveyGaugeClaim:false,bridgeAndTunnelSegmentsUseExistingFallback:true,closeZoomMin:16,existingRailFallbackPreserved:true,secondaryCanvases:0}}};window.__bpRail3DV2300=api;return api;
}
