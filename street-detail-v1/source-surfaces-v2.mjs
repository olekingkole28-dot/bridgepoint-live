// Source-licensed surface textures draped over mapped road and sidewalk footprints.
import clipping from 'polygon-clipping';
const R=6378137,D=Math.PI/180,SRC='bp-source-road-surfaces-v2',LAYER='bp-source-road-asphalt-v2',WALK='bp-source-sidewalk-concrete-v2';
const base='/assets/street-detail-v1/surfaces-v2/';
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),low=v=>String(v||'').toLowerCase();
const xy=p=>[R*p[0]*D,R*Math.asinh(Math.tan(clamp(p[1],-85,85)*D))],ll=p=>[p[0]/R/D,Math.atan(Math.sinh(p[1]/R))/D];
const empty=()=>({type:'FeatureCollection',features:[]});
const widths={motorway:22,trunk:17,primary:14,secondary:11,tertiary:9,minor:7,residential:7,unclassified:7,living_street:6,service:5,road:6};
const width=p=>{const v=parseFloat(p.width??p.width_m??p['width:carriageway']),n=parseInt(p.lanes);return v>=2.5&&v<=45?v:n>0&&n<=12?n*3.25:widths[low(p.class)]||widths[low(p.subclass)]||0;};
function ringContains(r,p){let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])c=!c;}return c;}
export function contains(p,polys){return polys.some(r=>ringContains(r[0],p)&&!r.slice(1).some(h=>ringContains(h,p)));}
function ribbon(a,b,half){const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy);if(len<.15)return null;const nx=-dy/len*half,ny=dx/len*half,ex=dx/len*Math.min(half,3),ey=dy/len*Math.min(half,3);const r=[[a[0]-ex+nx,a[1]-ey+ny],[b[0]+ex+nx,b[1]+ey+ny],[b[0]+ex-nx,b[1]+ey-ny],[a[0]-ex-nx,a[1]-ey-ny]];return [[...r,r[0]]];}
export function roadFootprints(features,center,radius=600,limit=500){
 const origin=xy(center),cos=Math.max(.1,Math.cos(center[1]*D)),rad=radius/cos,seen=new Set(),polys=[];
 for(const f of features){const p=f.properties||{},g=f.geometry,w=width(p);if(!w||['bridge','tunnel'].includes(low(p.brunnel))||low(p.bridge)==='yes'||low(p.tunnel)==='yes'||['unpaved','gravel','dirt','ground','grass','sand','compacted'].includes(low(p.surface)))continue;
 const lines=g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];
 for(const line of lines)for(let i=1;i<line.length;i++){const a=xy(line[i-1]),b=xy(line[i]);if(Math.max(a[0],b[0])<origin[0]-rad||Math.min(a[0],b[0])>origin[0]+rad||Math.max(a[1],b[1])<origin[1]-rad||Math.min(a[1],b[1])>origin[1]+rad)continue;
 const k=[a.map(Math.round).join(','),b.map(Math.round).join(',')].sort().join('|');if(seen.has(k))continue;seen.add(k);
 const poly=ribbon(a,b,w/(2*cos));if(poly)polys.push({poly,dist:Math.hypot((a[0]+b[0])/2-origin[0],(a[1]+b[1])/2-origin[1])});}}
 polys.sort((a,b)=>a.dist-b.dist);
 const chosen=polys.slice(0,limit).map(x=>x.poly);if(!chosen.length)return [];
 // Union in modest batches; overlapping segment ends avoid visible joins.
 let merged=[];try{for(let i=0;i<chosen.length;i+=40)merged=clipping.union(...merged,...chosen.slice(i,i+40));}catch(_){merged=chosen;}
 const window=[[[origin[0]-rad,origin[1]-rad],[origin[0]+rad,origin[1]-rad],[origin[0]+rad,origin[1]+rad],[origin[0]-rad,origin[1]+rad],[origin[0]-rad,origin[1]-rad]]];
 try{merged=clipping.intersection(merged,window);}catch(_){}
 return merged.map(p=>p.map(r=>r.map(ll)));
}
if(typeof WorkerGlobalScope!=='undefined'&&self instanceof WorkerGlobalScope)self.onmessage=e=>{try{const {features,center,radius,limit,seq}=e.data;self.postMessage({seq,polys:roadFootprints(features,center,radius,limit)});}catch(e){self.postMessage({seq:e.data.seq,error:String(e)});}};
export async function attachSourceSurfaces(map){
 if(!map||map.__BP_SOURCE_SURFACES_V2__)return;
 const d=map.__BP_SOURCE_SURFACES_V2__={status:'loading',roadPolygons:0,source:'Sketchfab asphalt scan and street material packs, mapped road centerlines'};window.__BP_SOURCE_SURFACES_V2__=d;
 let dead=false,timer=0,dirty=true,signature='',loaded=false,running=false,worker=null,seq=0;
 const images={'bp-scan-asphalt-v2':'asphalt.png','bp-street-concrete-v2':'concrete.png','bp-old-curb-v2':'curb.png','bp-street-asphalt-v2':'old-asphalt.png'};
 const imageData={};
 await Promise.all(Object.entries(images).map(async([id,file])=>{const r=await fetch(base+file,{cache:'force-cache'});if(!r.ok)throw Error(file);const b=await createImageBitmap(await r.blob());const c=document.createElement('canvas');c.width=b.width;c.height=b.height;c.getContext('2d').drawImage(b,0,0);imageData[id]=c.getContext('2d').getImageData(0,0,c.width,c.height);b.close();}));
 if(dead)return;
 function install(){if(!map.getStyle()?.layers?.length)return false;
 for(const [id,img] of Object.entries(imageData))if(!map.hasImage(id))map.addImage(id,img,{pixelRatio:4});
 if(!map.getSource(SRC))map.addSource(SRC,{type:'geojson',data:empty(),maxzoom:20});
 if(!map.getLayer(LAYER)){
  const before=['gta-road-major-marking','gta-road-local-marking','gta-context-building-footprints','gta-water-label'].find(x=>map.getLayer(x));
  map.addLayer({id:LAYER,type:'fill-extrusion',source:SRC,minzoom:15,paint:{'fill-extrusion-pattern':'bp-scan-asphalt-v2','fill-extrusion-base':0,'fill-extrusion-height':.035,'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':false}},before);
 }
 // Preserve existing authoritative sidewalk polygons and heights; replace only surface materials.
 for(const [id,prop,value] of [['gta-bp-sidewalk-slabs-v1','fill-extrusion-pattern',['match',['get','surface_material'],'asphalt','bp-street-asphalt-v2','brick','bp-sidewalk-brick-v1','paving_stones','bp-sidewalk-pavers-v1','bp-street-concrete-v2']],['gta-bp-sidewalk-curbs-v1','fill-extrusion-pattern','bp-old-curb-v2'],['gta-road3d-deck','fill-extrusion-pattern','bp-scan-asphalt-v2']]){
  if(map.getLayer(id)){try{map.setPaintProperty(id,prop,value);}catch(e){d.paintError=String(e).slice(0,160);}}
 }
 if(map.getSource('bpSidewalk3D')&&!map.getLayer(WALK)){
  const before=map.getLayer('gta-bp-sidewalk-curbs-v1')?'gta-bp-sidewalk-curbs-v1':undefined;
  map.addLayer({id:WALK,type:'fill-extrusion',source:'bpSidewalk3D',minzoom:15,filter:['==',['get','part'],'sidewalk_slab'],paint:{'fill-extrusion-pattern':['match',['get','surface_material'],'asphalt','bp-street-asphalt-v2','brick','bp-sidewalk-brick-v1','paving_stones','bp-sidewalk-pavers-v1','bp-street-concrete-v2'],'fill-extrusion-base':['to-number',['get','base_m'],0],'fill-extrusion-height':['to-number',['get','top_m'],.145],'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':false}},before);
  // A single geometry owner prevents overlapping/z-fighting sidewalk surfaces.
  if(map.getLayer('gta-bp-sidewalk-slabs-v1'))map.setLayoutProperty('gta-bp-sidewalk-slabs-v1','visibility','none');
 }
 loaded=true;d.assets=Object.keys(imageData);return true;}
 function source(id,sl){try{return map.getSource(id)?map.querySourceFeatures(id,sl?{sourceLayer:sl}:{}):[]}catch(_){return []}}
 async function update(){if(dead||running||map.isMoving?.()||map.getZoom()<13.8)return;if(!install())return;
  const c=map.getCenter(),z=map.getZoom(),p=[c.lng,c.lat],f=source('ofm','transportation'),supp=source('bpLivingWorld').filter(x=>width(x.properties||{}));let visible=[];try{const layers=['gta-road-major','gta-road-local','gta-road-supplement-bp','gta-sidewalk-road-probe-v1'].filter(id=>map.getLayer(id));if(layers.length)visible=map.queryRenderedFeatures({layers});}catch(_){}const fs=[...visible,...f,...supp],key=[c.lng.toFixed(4),c.lat.toFixed(4),Math.floor(z),fs.length].join(':');if(key===signature&&!dirty)return;dirty=false;running=true;
  try{const radius=z<16?1000:z<18?850:650,limit=innerWidth<900?480:1000;const version=++seq;worker ||= new Worker(import.meta.url,{type:'module'});const polys=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('surface worker timeout')),12000);worker.onmessage=e=>{if(e.data.seq!==version)return;clearTimeout(t);e.data.error?reject(Error(e.data.error)):resolve(e.data.polys)};worker.onerror=e=>{clearTimeout(t);reject(Error(e.message||'surface worker failed'))};worker.postMessage({seq:version,features:fs.map(f=>({geometry:f.geometry,properties:f.properties})),center:p,radius,limit});});if(dead||map.isMoving?.()){dirty=true;return;}if(!polys.length){d.status='waiting-for-mapped-roads';return;}
   const data={type:'FeatureCollection',features:polys.map((coordinates,i)=>({type:'Feature',id:i,geometry:{type:'Polygon',coordinates},properties:{kind:'asphalt'}}))};
   map.getSource(SRC)?.setData(data);map.__BP_SOURCE_ROAD_MASK_V2__={polys,center:p,radius};map.fire('bpsurfacemaskready');signature=key;d.status='ready';d.roadPolygons=polys.length;d.roadFeatures=fs.length;d.renderedRoadFeatures=visible.length;d.opaqueRaisedDeck=true;d.zoom=z;map.triggerRepaint();
  }catch(e){d.error=String(e).slice(0,200);dirty=true;}finally{running=false;if(dirty)schedule();}}
 function schedule(){if(dead||timer||map.isMoving?.())return;timer=setTimeout(()=>{timer=0;update()},300);}
 function changed(e){if(['ofm','bpLivingWorld','bpSidewalk3D'].includes(e.sourceId)&&(e.isSourceLoaded||e.sourceDataType==='content')){dirty=true;schedule();}}
 function moved(){dirty=true;schedule();}
 function style(){signature='';dirty=true;loaded=false;schedule();}
 map.on('moveend',moved);map.on('zoomend',moved);map.on('sourcedata',changed);map.on('style.load',style);map.once('remove',()=>{dead=true;clearTimeout(timer);worker?.terminate();map.off('moveend',moved);map.off('zoomend',moved);map.off('sourcedata',changed);map.off('style.load',style);});schedule();return d;
}
