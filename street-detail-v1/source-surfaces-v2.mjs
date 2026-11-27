// Source-licensed surface textures draped over mapped road and sidewalk footprints.
import clipping from 'polygon-clipping';
import earcut from 'earcut';
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
// Triangulate real road footprints in the worker, subdividing long edges for terrain conformity.
export function roadTriangles(polys,center,maxTriangles=44000){
 const origin=xy(center),cos=Math.max(.1,Math.cos(center[1]*D)),out=[],stack=[];let nearest=null;
 for(const poly of polys){
  const flat=[],holes=[];for(const [i,r] of poly.entries()){if(i)holes.push(flat.length/2);for(const q of r.slice(0,-1)){const p=xy(q);flat.push((p[0]-origin[0])*cos,(p[1]-origin[1])*cos);}}
  const ids=earcut(flat,holes,2);
  for(let i=0;i<ids.length;i+=3){const t=ids.slice(i,i+3).map(k=>[flat[k*2],flat[k*2+1]]);stack.push(t);}
 }
 // Split longest edges, limiting both GPU cost and terrain interpolation error.
 const d2=(a,b)=>(a[0]-b[0])**2+(a[1]-b[1])**2;
 while(stack.length&&out.length/6<maxTriangles){
  const t=stack.pop(),lens=[d2(t[0],t[1]),d2(t[1],t[2]),d2(t[2],t[0])],i=lens.indexOf(Math.max(...lens));
  if(lens[i]>144&&out.length/6+stack.length+2<maxTriangles){const a=t[i],b=t[(i+1)%3],c=t[(i+2)%3],m=[(a[0]+b[0])/2,(a[1]+b[1])/2];stack.push([a,m,c],[m,b,c]);continue;}
  const p=[(t[0][0]+t[1][0]+t[2][0])/3,(t[0][1]+t[1][1]+t[2][1])/3],d=p[0]**2+p[1]**2;if(!nearest||d<nearest.d)nearest={d,p};
  for(const q of t)out.push(q[0],q[1]);
 }
 return {vertices:new Float32Array(out),nearest:nearest?ll([origin[0]+nearest.p[0]/cos,origin[1]+nearest.p[1]/cos]):null};
}
if(typeof WorkerGlobalScope!=='undefined'&&self instanceof WorkerGlobalScope)self.onmessage=e=>{try{const {features,center,radius,limit,seq}=e.data,polys=roadFootprints(features,center,radius,limit),mesh=roadTriangles(polys,center,limit<=500?36000:70000);self.postMessage({seq,polys,...mesh},[mesh.vertices.buffer]);}catch(e){self.postMessage({seq:e.data.seq,error:String(e)});}};
export async function attachSourceSurfaces(map){
 if(!map||map.__BP_SOURCE_SURFACES_V2__)return;
 const d=map.__BP_SOURCE_SURFACES_V2__={status:'loading',roadPolygons:0,source:'mapped street surfaces, sidewalks, curbs, and source-backed road markings'};window.__BP_SOURCE_SURFACES_V2__=d;
 let dead=false,timer=0,dirty=true,signature='',loaded=false,running=false,worker=null,seq=0;
 const images={'bp-scan-asphalt-v2':'asphalt.png','bp-street-concrete-v2':'concrete.png','bp-old-curb-v2':'curb.png','bp-street-asphalt-v2':'old-asphalt.png'};
 const imageData={};
 const MESH='bp-source-road-mesh-v5';
 let T,renderer,scene,camera,material,texture,roadMesh,meshAnchor,meshVersion=0,lastMeshCenter=null,lastMeshRadius=0,lastBuiltAt=0,lastRoadPolys=[];
 d.meshVisible=true;d.meshDrawCalls=0;d.meshFrames=0;d.meshTriangles=0;d.meshBuilds=0;
 d.markingsAboveMesh=false;d.markingLayers=[];
 const streetDetailLayerIds=['gta-road-center-gold-bp','gta-road-center-white-bp','gta-road-major-center-v2300','gta-road-edge-v2300','gta-crosswalk-v2300','gta-service-guide-v2300','gta-service-drive-v2300','gta-pedestrian-casing-v2300','gta-pedestrian-surface-v2300','gta-road-major-marking','gta-road-local-marking'];
 let streetOrderTimer=0;
 function keepStreetRenderOrder(){
  if(dead||!map.getLayer(MESH))return;
  try{
   let layers=map.getStyle()?.layers||[],symbol=layers.find(l=>l.type==='symbol')?.id||null;
   let meshIndex=layers.findIndex(l=>l.id===MESH),symbolIndex=symbol?layers.findIndex(l=>l.id===symbol):-1;
   if(meshIndex<0)return;
   if(symbolIndex>=0&&meshIndex>symbolIndex){map.moveLayer(MESH,symbol);layers=map.getStyle()?.layers||[];meshIndex=layers.findIndex(l=>l.id===MESH);}
   for(const id of streetDetailLayerIds){
    if(!map.getLayer(id))continue;
    layers=map.getStyle()?.layers||[];meshIndex=layers.findIndex(l=>l.id===MESH);
    const index=layers.findIndex(l=>l.id===id),labelIndex=symbol?layers.findIndex(l=>l.id===symbol):-1;
    if(index>=0&&meshIndex>=0&&(index<meshIndex||(labelIndex>=0&&index>labelIndex))){
     if(symbol)map.moveLayer(id,symbol);else map.moveLayer(id);
    }
   }
   layers=map.getStyle()?.layers||[];meshIndex=layers.findIndex(l=>l.id===MESH);
   d.markingLayers=streetDetailLayerIds.filter(id=>map.getLayer(id));
   d.markingsAboveMesh=d.markingLayers.length>0&&d.markingLayers.every(id=>layers.findIndex(l=>l.id===id)>meshIndex);
  }catch(e){d.layerOrderError=String(e).slice(0,160);}
 }
 function scheduleStreetRenderOrder(){
  if(dead||streetOrderTimer)return;
  streetOrderTimer=setTimeout(()=>{streetOrderTimer=0;keepStreetRenderOrder();},120);
 }
 function centerDistance(a,b){return Math.hypot((a[0]-b[0])*R*D*Math.cos(b[1]*D),(a[1]-b[1])*R*D);}
 function covered(p,z){if(!roadMesh||!lastMeshCenter||!lastRoadPolys.length||z<16.5)return false;const safe=Math.min(120,lastMeshRadius*.22);return centerDistance(p,lastMeshCenter)<safe;}
 function installMesh(){
  if(!T||map.getLayer(MESH))return;
  map.addLayer({id:MESH,type:'custom',renderingMode:'3d',onAdd(m,gl){
   renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false,alpha:true});renderer.autoClear=false;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;
   scene=new T.Scene();camera=new T.Camera();const img=imageData['bp-scan-asphalt-v2'];
   texture=new T.DataTexture(new Uint8Array(img.data.buffer.slice(0)),img.width,img.height,T.RGBAFormat);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;texture.magFilter=T.LinearFilter;texture.minFilter=T.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());texture.needsUpdate=true;
   material=new T.MeshBasicMaterial({map:texture,side:T.DoubleSide,transparent:false,depthTest:true,depthWrite:true,polygonOffset:true,polygonOffsetFactor:-2,polygonOffsetUnits:-3});
  },render(gl,args){
   if(!renderer||!scene||!roadMesh||!meshAnchor||map.getZoom()<14.6||document.hidden||!d.meshVisible)return;
   const raw=map.transform?.getMatrixForModel?.(meshAnchor.q,meshAnchor.z),matrix=args?.defaultProjectionData?.mainMatrix;if(!raw||!matrix)return;
   camera.projectionMatrix.fromArray(matrix).multiply(new T.Matrix4().fromArray(raw));renderer.resetState();renderer.render(scene,camera);d.meshDrawCalls=renderer.info.render.calls;d.meshFrames++;d.meshRenderedTriangles=renderer.info.render.triangles;d.meshZoom=map.getZoom();
  },onRemove(){roadMesh?.geometry.dispose();roadMesh=null;material?.dispose();texture?.dispose();renderer?.dispose();renderer=null;scene=null;meshAnchor=null;d.meshDrawCalls=0;d.meshTriangles=0;}});
 }
 async function makeRoadMesh(center,vertices,version){
  if(!scene||!vertices?.length)return false;
  const origin=xy(center),cos=Math.max(.1,Math.cos(center[1]*D)),hasTerrain=!!map.getTerrain?.();
  const elevation=q=>{try{return hasTerrain?map.queryTerrainElevation?.({lng:q[0],lat:q[1]},{exaggerated:true}):0;}catch(_){return null;}};
  const z=elevation(center);if(!Number.isFinite(z))return false;
  const qAt=(x,y)=>ll([origin[0]+x/cos,origin[1]+y/cos]);
  const raw=map.transform?.getMatrixForModel?.(center,z),east=map.transform?.getMatrixForModel?.(qAt(1,0),z),north=map.transform?.getMatrixForModel?.(qAt(0,1),z);if(!raw||!east||!north)return false;
  const inv=new T.Matrix4().fromArray(raw).invert(),ee=new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(east).premultiply(inv)),nn=new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(north).premultiply(inv)),positions=[],uvs=[],terrain=new Map(),grid=6;
  const at=(x,y)=>{const k=x+':'+y;if(!terrain.has(k))terrain.set(k,elevation(qAt(x*grid,y*grid)));return terrain.get(k);};
  const height=(x,y)=>{const ix=Math.floor(x/grid),iy=Math.floor(y/grid),u=x/grid-ix,v=y/grid-iy,a=at(ix,iy),b=at(ix+1,iy),c=at(ix,iy+1),e=at(ix+1,iy+1);return [a,b,c,e].every(Number.isFinite)?(a*(1-u)+b*u)*(1-v)+(c*(1-u)+e*u)*v:null;};
  const ux=(origin[0]*cos/2.4)%1,uy=(origin[1]*cos/2.4)%1;
  for(let i=0;i<vertices.length;i+=6){
   if(i%3000===0){await new Promise(r=>setTimeout(r,0));if(dead||meshVersion!==version||map.isMoving?.())return false;}
   const a=vertices[i],b=vertices[i+1],c=vertices[i+2],e=vertices[i+3],f=vertices[i+4],g=vertices[i+5],zs=[height(a,b),height(c,e),height(f,g)];
   if(!zs.every(Number.isFinite))continue;
   for(let k=0;k<3;k++){const x=vertices[i+2*k],y=vertices[i+2*k+1];positions.push(ee.x*x+nn.x*y,zs[k]-z+.20,ee.z*x+nn.z*y);uvs.push(ux+x/2.4,uy+y/2.4);}
  }
  if(!positions.length||dead||meshVersion!==version||map.isMoving?.())return false;
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uvs,2));geo.computeBoundingSphere();
  const next=new T.Mesh(geo,material);next.frustumCulled=false;if(roadMesh){scene.remove(roadMesh);roadMesh.geometry.dispose();}roadMesh=next;scene.add(next);meshAnchor={q:center,z};lastMeshCenter=center;d.meshTriangles=positions.length/9;d.meshTerrainSamples=terrain.size;d.meshGrounded=true;d.meshCenter=center;d.meshBuilds++;d.meshBuiltAtZoom=map.getZoom();lastBuiltAt=Date.now();map.triggerRepaint();return true;
 }
 await Promise.all(Object.entries(images).map(async([id,file])=>{const r=await fetch(base+file,{cache:'force-cache'});if(!r.ok)throw Error(file);const b=await createImageBitmap(await r.blob());const c=document.createElement('canvas');c.width=b.width;c.height=b.height;c.getContext('2d').drawImage(b,0,0);imageData[id]=c.getContext('2d').getImageData(0,0,c.width,c.height);b.close();}));
 T=await import('/vendor/three.module.js?v=169-local');
 if(dead)return;
 function install(){if(!map.getStyle()?.layers?.length)return false;
 for(const [id,img] of Object.entries(imageData))if(!map.hasImage(id))map.addImage(id,img,{pixelRatio:4});
 installMesh();
 if(!map.getSource(SRC))map.addSource(SRC,{type:'geojson',data:empty(),maxzoom:20});
 if(!map.getLayer(LAYER)){
  const before=['gta-road-major-marking','gta-road-local-marking','gta-context-building-footprints','gta-water-label'].find(x=>map.getLayer(x));
  map.addLayer({id:LAYER,type:'fill-extrusion',source:SRC,minzoom:15,layout:{visibility:'none'},paint:{'fill-extrusion-pattern':'bp-scan-asphalt-v2','fill-extrusion-base':0,'fill-extrusion-height':.035,'fill-extrusion-opacity':1,'fill-extrusion-vertical-gradient':false}},before);
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
 loaded=true;d.assets=Object.keys(imageData);scheduleStreetRenderOrder();return true;}
 function source(id,sl){try{return map.getSource(id)?map.querySourceFeatures(id,sl?{sourceLayer:sl}:{}):[]}catch(_){return []}}
 async function update(){if(dead||running||map.isMoving?.()||map.getZoom()<13.8)return;if(!install())return;
  const c=map.getCenter(),z=map.getZoom(),p=[c.lng,c.lat];
  // Existing geometry is geographically anchored, not tied to its original zoom. Never
  // discard or regenerate it merely because the camera zoomed into the covered streets.
  if(covered(p,z)){dirty=false;d.status='ready';d.meshReused=true;d.zoom=z;map.triggerRepaint();return;}
  const f=source('ofm','transportation'),supp=source('bpLivingWorld').filter(x=>width(x.properties||{}));let visible=[];try{const layers=['gta-road-major','gta-road-local','gta-road-supplement-bp','gta-sidewalk-road-probe-v1'].filter(id=>map.getLayer(id));if(layers.length)visible=map.queryRenderedFeatures({layers});}catch(_){}const fs=[...visible,...f,...supp],key=[c.lng.toFixed(4),c.lat.toFixed(4),Math.floor(z),fs.length].join(':');if(key===signature&&!dirty)return;dirty=false;running=true;
  try{const radius=z<16?1000:z<18?850:650,limit=innerWidth<900?480:1000;const version=++seq;worker ||= new Worker(import.meta.url,{type:'module'});const result=await new Promise((resolve,reject)=>{const t=setTimeout(()=>reject(Error('surface worker timeout')),12000);worker.onmessage=e=>{if(e.data.seq!==version)return;clearTimeout(t);e.data.error?reject(Error(e.data.error)):resolve(e.data)};worker.onerror=e=>{clearTimeout(t);reject(Error(e.message||'surface worker failed'))};worker.postMessage({seq:version,features:fs.map(f=>({geometry:f.geometry,properties:f.properties})),center:p,radius,limit});});const {polys,vertices,nearest}=result;if(dead||map.isMoving?.()){dirty=true;return;}if(!polys.length){d.status='waiting-for-mapped-roads';return;}
   const data={type:'FeatureCollection',features:polys.map((coordinates,i)=>({type:'Feature',id:i,geometry:{type:'Polygon',coordinates},properties:{kind:'asphalt'}}))};
   map.getSource(SRC)?.setData(data);map.__BP_SOURCE_ROAD_MASK_V2__={polys,center:p,radius};map.fire('bpsurfacemaskready');const mv=++meshVersion;const built=await makeRoadMesh(p,vertices,mv);if(built){d.nearestRoad=nearest;lastMeshRadius=radius;lastRoadPolys=polys;d.meshReused=false;d.meshBuiltAtZoom=z;signature=key;}else{dirty=true;}d.status=built?'ready':'waiting-for-terrain-mesh';d.roadPolygons=polys.length;d.roadFeatures=fs.length;d.renderedRoadFeatures=visible.length;d.opaqueRaisedDeck=true;d.zoom=z;map.triggerRepaint();
  }catch(e){d.error=String(e).slice(0,200);dirty=true;}finally{running=false;if(dirty)schedule();}}
 function schedule(){if(dead||timer||map.isMoving?.())return;timer=setTimeout(()=>{timer=0;update()},300);}
 function changed(e){if(['ofm','bpLivingWorld'].includes(e.sourceId)&&e.isSourceLoaded){const c=map.getCenter();if(covered([c.lng,c.lat],map.getZoom()))return;dirty=true;schedule();}}
 function moved(){const c=map.getCenter();if(covered([c.lng,c.lat],map.getZoom())){d.meshReused=true;d.status='ready';map.triggerRepaint();return;}dirty=true;schedule();}
 function style(){signature='';dirty=true;loaded=false;lastMeshCenter=null;lastRoadPolys=[];schedule();scheduleStreetRenderOrder();}
 map.on('moveend',moved);map.on('zoomend',moved);map.on('sourcedata',changed);map.on('style.load',style);map.on('styledata',scheduleStreetRenderOrder);map.once('remove',()=>{dead=true;clearTimeout(timer);clearTimeout(streetOrderTimer);worker?.terminate();map.off('moveend',moved);map.off('zoomend',moved);map.off('sourcedata',changed);map.off('style.load',style);map.off('styledata',scheduleStreetRenderOrder);});schedule();scheduleStreetRenderOrder();return d;
}
