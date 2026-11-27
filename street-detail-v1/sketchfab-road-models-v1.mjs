// Places the user's CC-BY Sketchfab street-pack meshes on mapped street geometry.
// The meshes include the source pack's road, sidewalk, curb, and marking textures.
const BASE='/assets/street-detail-v1/surfaces-v2/';
const LAYER='bp-sketchfab-road-models-v1';
const RAD=Math.PI/180,R=6378137;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const lower=v=>String(v??'').toLowerCase();
const roadWidths={motorway:22,trunk:17,primary:14,secondary:11,tertiary:9,minor:7,residential:7,unclassified:7,living_street:6,service:5,road:6};
const roadClasses=new Set(Object.keys(roadWidths));
const skipSurface=new Set(['unpaved','gravel','dirt','ground','grass','sand','compacted']);
const toMerc=q=>[R*q[0]*RAD,R*Math.log(Math.tan(Math.PI/4+clamp(q[1],-85,85)*RAD/2))];
const fromMerc=p=>[p[0]/R/RAD,(2*Math.atan(Math.exp(p[1]/R))-Math.PI/2)/RAD];
function lineParts(g){return g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];}
function widthFor(p){const v=parseFloat(p.width??p.width_m??p['width:carriageway']),n=parseInt(p.lanes,10);if(v>=2.5&&v<=60)return v;if(n>0&&n<=16)return n*3.25;return roadWidths[lower(p.class)]||roadWidths[lower(p.subclass)]||0;}
function eligible(p){const c=lower(p.class),s=lower(p.subclass);return roadClasses.has(c)&&!['pedestrian','footway','path','cycleway','steps','sidewalk','crossing','crosswalk'].includes(s)&&!skipSurface.has(lower(p.surface))&&!['bridge','tunnel'].includes(lower(p.brunnel))&&lower(p.bridge)!=='yes'&&lower(p.tunnel)!=='yes'&&widthFor(p)>0;}
function atDistance(points,cumulative,d){let i=1;while(i<cumulative.length-1&&cumulative[i]<d)i++;const a=points[i-1],b=points[i],span=cumulative[i]-cumulative[i-1],t=span?(d-cumulative[i-1])/span:0;return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
function lineSignature(line,cls){const a=line[0],b=line[line.length-1];return cls+':'+[a,b].map(q=>q.map(v=>Number(v).toFixed(5)).join(',')).sort().join('|')+':'+line.length;}
function collectFeatures(map){const out=[],seen=new Set();const add=fs=>{for(const f of fs||[]){const p=f.properties||{};if(!eligible(p)||!f.geometry)continue;for(const line of lineParts(f.geometry)){if(!Array.isArray(line)||line.length<2)continue;const k=lineSignature(line,lower(p.class));if(seen.has(k))continue;seen.add(k);out.push({line,properties:p});}}};
 try{if(map.getSource('ofm'))add(map.querySourceFeatures('ofm',{sourceLayer:'transportation'}));}catch(_){}
 try{if(!out.length&&map.getSource('bpLivingWorld'))add(map.querySourceFeatures('bpLivingWorld'));}catch(_){}
 return out;
}
function collectRoadPieces(features,center,map,templates){
 const c=toMerc(center),cos=Math.max(.12,Math.cos(center[1]*RAD)),radius=map.getZoom()<15?1900:map.getZoom()<17?1050:650,canvas=map.getCanvas(),pieces=[],seenWays=new Set(),ends=new Map(),probes=[];
 const angleGap=(a,b)=>Math.abs(Math.atan2(Math.sin(a-b),Math.cos(a-b)));
 const addArm=(q,neighbor,width,cls)=>{
  const p=toMerc(q),n=toMerc(neighbor),bearing=Math.atan2(n[0]-p[0],n[1]-p[1]),key=q.map(v=>Number(v).toFixed(5)).join(':');
  let node=ends.get(key);if(!node){node={q,bearings:[],width:0,classes:new Set()};ends.set(key,node);}
  if(!node.bearings.some(x=>angleGap(x,bearing)<20*RAD))node.bearings.push(bearing);
  node.width=Math.max(node.width,width);node.classes.add(cls);
 };
 for(const {line,properties:p} of features){
  const cls=lower(p.class).replace(/_link$/,''),probe={class:cls,vertices:line.length,piecesAdded:0},wayKey=lineSignature(line,cls);
  probes.push(probe);if(seenWays.has(wayKey)){probe.skip='duplicate';continue;}seenWays.add(wayKey);
  const projected=line.map(toMerc),cum=[0];
  for(let i=1;i<projected.length;i++)cum.push(cum[i-1]+Math.hypot((projected[i][0]-projected[i-1][0])*cos,(projected[i][1]-projected[i-1][1])*cos));
  const total=cum[cum.length-1];probe.totalMeters=total;if(total<4){probe.skip='short-line';continue;}
  const carriage=widthFor(p),urban=!['motorway','trunk'].includes(cls)||String(p.sidewalk||'').toLowerCase()==='both',fullWidth=carriage+(urban&&String(p.sidewalk||'').toLowerCase()!=='no'?3.2:0);
  if(line.length>=2){addArm(line[0],line[1],fullWidth,cls);addArm(line[line.length-1],line[line.length-2],fullWidth,cls);}
  const asset=(p.oneway==='yes'||p.oneway===true||p.oneway==='-1')?'street2':(['motorway','trunk','primary','secondary'].includes(cls)?'street3':'street1');
  const t=templates[asset];probe.asset=asset;probe.templateSize=t?.size;
  if(!t){probe.skip='template-missing';continue;}
  const count=Math.min(5000,Math.max(1,Math.ceil(total/Math.max(6,t.size.z)))),chunk=total/count;
  probe.segmentCount=count;probe.chunkMeters=chunk;
  for(let i=0;i<count;i++){
   const a=atDistance(projected,cum,i*chunk),b=atDistance(projected,cum,(i+1)*chunk),dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx*cos,dy*cos);
   if(len<3){probe.skip='short-segment';continue;}
   const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],dist=Math.hypot((mid[0]-c[0])*cos,(mid[1]-c[1])*cos);
   if(dist>radius)continue;
   const q=fromMerc(mid),px=map.project(q);
   if(px.x< -80||px.y< -80||px.x>canvas.clientWidth+80||px.y>canvas.clientHeight+80)continue;
   pieces.push({q,dx,dy,len,width:fullWidth,asset,yaw:Math.atan2(dx,dy),dist});probe.piecesAdded++;
  }
 }
 const axisForFourWay=node=>{
  const arms=node.bearings;if(arms.length!==4)return null;
  const pairs=[];
  for(let i=0;i<arms.length;i++)for(let j=i+1;j<arms.length;j++){
   const gap=angleGap(arms[i],arms[j]);if(Math.abs(Math.PI-gap)<=28*RAD)pairs.push({i,j,error:Math.abs(Math.PI-gap)});
  }
  pairs.sort((a,b)=>a.error-b.error);
  for(const a of pairs)for(const b of pairs){
   if(a===b||a.i===b.i||a.i===b.j||a.j===b.i||a.j===b.j||a.error>24*RAD||b.error>24*RAD)continue;
   return {bearing:arms[a.i],span:Math.max(node.width*2.1,node.width+8)};
  }
  return null;
 };
 const junctions=[...ends.values()].map(node=>{
  const axis=axisForFourWay(node);if(!axis)return null;
  const p=toMerc(node.q);return {...node,...axis,dist:Math.hypot((p[0]-c[0])*cos,(p[1]-c[1])*cos)};
 }).filter(Boolean).filter(j=>j.dist<radius).sort((a,b)=>a.dist-b.dist).slice(0,120);
 for(const j of junctions){
  const px=map.project(j.q);if(px.x< -120||px.y< -120||px.x>canvas.clientWidth+120||px.y>canvas.clientHeight+120)continue;
  const t=templates.street4,scale=clamp(j.span/Math.max(t.size.x,t.size.z),.25,4);
  pieces.push({q:j.q,dx:Math.sin(j.bearing),dy:Math.cos(j.bearing),len:t.size.z*scale,width:t.size.x*scale,asset:'street4',yaw:j.bearing,dist:j.dist,intersection:true});
 }
 const collectionProbe={center,zoom:map.getZoom(),radiusMeters:radius,canvas:{width:canvas.clientWidth,height:canvas.clientHeight},features:probes};
 pieces.sort((a,b)=>a.dist-b.dist);
 return {pieces:pieces.slice(0,(innerWidth<=700?900:1600)),junctionCount:junctions.length,collectionProbe};
}
export function attachSketchfabRoadModels(map){
 if(!map||map.__BP_SKETCHFAB_ROAD_MODELS_V1__)return map?.__BP_SKETCHFAB_ROAD_MODELS_V1__;
 const state=map.__BP_SKETCHFAB_ROAD_MODELS_V1__={status:'loading',sourcePack:'Pack de Ruas LW3D v2',source:'mapped road centerlines',roadInstances:0,intersectionInstances:0,sidewalksAttached:true,curbsAttached:true,markings:'source pack textures',updatedAt:Date.now()};window.__BP_SKETCHFAB_ROAD_MODELS_V1__=state;
 let T,loader,helpers,renderer,camera,scene,group,layer,anchor,anchorZ,templates={},job,timer=0,seq=0,dead=false,lastKey='',oldVisibility={};
 function disableDuplicateFallback(){
   const d=map.__BP_SOURCE_SURFACES_V2__;
   if(d){
    if(!Object.prototype.hasOwnProperty.call(state,'previousSourceMeshVisible'))state.previousSourceMeshVisible=d.meshVisible;
    d.meshVisible=false;d.fallbackDisabledBySketchfab=true;
   }
   for(const id of ['gta-road3d-deck','gta-bp-sidewalk-slabs-v1','bp-source-road-asphalt-v2','bp-source-sidewalk-concrete-v2']){
    if(!map.getLayer(id))continue;
    try{if(!(id in oldVisibility))oldVisibility[id]=map.getLayoutProperty(id,'visibility');map.setLayoutProperty(id,'visibility','none');}catch(_){}
   }
   state.sourceSurfaceFallback=false;
  }
  function restoreDuplicateFallback(){
   const d=map.__BP_SOURCE_SURFACES_V2__;
   if(d&&Object.prototype.hasOwnProperty.call(state,'previousSourceMeshVisible'))d.meshVisible=state.previousSourceMeshVisible;
   for(const [id,v] of Object.entries(oldVisibility))if(map.getLayer(id))try{map.setLayoutProperty(id,'visibility',v||'visible');}catch(_){}
   oldVisibility={};state.sourceSurfaceFallback=true;
  }
  function install(){if(map.getLayer(LAYER))return;layer={id:LAYER,type:'custom',renderingMode:'3d',onAdd(m,gl){renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false,alpha:true});renderer.autoClear=false;renderer.info.autoReset=false;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;camera=new T.Camera();scene=new T.Scene();scene.add(new T.HemisphereLight(0xe8f0f5,0x625e50,1.8));const sun=new T.DirectionalLight(0xffefd8,2);sun.position.set(-35,60,45);scene.add(sun);},render(gl,args){if(!renderer||!scene||!group||!group.children.length||map.getZoom()<14.4||document.hidden)return;const raw=map.transform?.getMatrixForModel?.(anchor,anchorZ),matrix=args?.defaultProjectionData?.mainMatrix;if(!raw||!matrix)return;camera.projectionMatrix.fromArray(matrix).multiply(new T.Matrix4().fromArray(raw));renderer.resetState();renderer.info.reset();renderer.render(scene,camera);state.drawCalls=renderer.info.render.calls;state.triangles=renderer.info.render.triangles;state.frames++;},onRemove(){clearGroup();renderer?.dispose();renderer=null;scene=null;}};const before=['gta-road-label-major','gta-road-label-local','gta-context-building-footprints','gta-water-label'].find(id=>map.getLayer(id));map.addLayer(layer,before);}
 function clearGroup(){if(group&&scene){scene.remove(group);group.traverse(o=>{if(o.isInstancedMesh)o.dispose?.();});}group=null;state.roadInstances=0;state.intersectionInstances=0;}
 function materialGeometry(mesh,materialIndex){
   let g=mesh.geometry.clone().applyMatrix4(mesh.matrixWorld);
   const materials=Array.isArray(mesh.material)?mesh.material:[mesh.material];
   if(materials.length>1){
    const sourceGroups=(g.groups||[]).filter(group=>group.materialIndex===materialIndex);
    if(!sourceGroups.length){g.dispose();return null;}
    const expanded=g.index?g.toNonIndexed():g;
    if(expanded!==g)g.dispose();
    const subset=new T.BufferGeometry();
    for(const [name,attribute] of Object.entries(expanded.attributes)){
     const ranges=sourceGroups.map(group=>({start:Math.max(0,group.start),end:Math.min(attribute.count,group.start+group.count)})).filter(x=>x.end>x.start);
     const total=ranges.reduce((sum,x)=>sum+(x.end-x.start)*attribute.itemSize,0);
     const values=new (attribute.isInterleavedBufferAttribute?attribute.data.array.constructor:attribute.array.constructor)(total);
     const array=attribute.isInterleavedBufferAttribute?attribute.data.array:attribute.array;
     const stride=attribute.isInterleavedBufferAttribute?attribute.data.stride:attribute.itemSize;
     const offset=attribute.isInterleavedBufferAttribute?attribute.offset:0;let k=0;
     for(const range of ranges)for(let i=range.start;i<range.end;i++)for(let c=0;c<attribute.itemSize;c++)values[k++]=array[i*stride+offset+c];
     subset.setAttribute(name,new T.BufferAttribute(values,attribute.itemSize,attribute.normalized));
    }
    if(expanded!==g)expanded.dispose();else g.dispose();
    g=subset;
   }
   if(!g.attributes.normal)g.computeVertexNormals();
   return g;
  }
  function makeTemplates(root){
   root.updateMatrixWorld(true);
   for(const name of ['street1','street2','street3','street4']){
    const options=[];
    root.traverse(o=>{
     if(!o.isMesh||!o.geometry)return;
     const mats=Array.isArray(o.material)?o.material:[o.material],mi=mats.findIndex(m=>String(m?.name||'').toLowerCase()===name);
     if(mi<0)return;
     let g=materialGeometry(o,mi);if(!g)return;
     g.computeBoundingBox();let box=g.boundingBox,size={x:box.max.x-box.min.x,y:box.max.y-box.min.y,z:box.max.z-box.min.z};
     if(size.x<.1||size.z<.1||size.y>20||Math.max(size.x,size.z)>180){g.dispose();return;}
     if(name!=='street4'&&size.x>size.z*1.08){
      g.applyMatrix4(new T.Matrix4().makeRotationY(Math.PI/2));g.computeBoundingBox();box=g.boundingBox;size={x:box.max.x-box.min.x,y:box.max.y-box.min.y,z:box.max.z-box.min.z};
     }
     g.translate(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);g.computeBoundingBox();g.computeBoundingSphere();
     const material=mats[mi].clone();material.side=T.DoubleSide;material.needsUpdate=true;
     options.push({geometry:g,material,size,triangles:(g.index?.count||g.attributes.position.count)/3});
    });
    options.sort((a,b)=>b.triangles-a.triangles);
    const chosen=options.shift();for(const other of options)other.geometry.dispose();
    if(!chosen)throw Error('SKETCHFAB_ROAD_PACK_MATERIAL_GEOMETRY_MISSING:'+name);
    templates[name]=chosen;
   }
   state.sourceMeshes=Object.keys(templates);
   state.templateSizes=Object.fromEntries(Object.entries(templates).map(([name,t])=>[name,t.size]));
   state.templateTriangles=Object.fromEntries(Object.entries(templates).map(([name,t])=>[name,t.triangles]));
  }
  async function initialize(){if(job)return job;job=(async()=>{const mods=await Promise.all([import('/vendor/three.module.js?v=169-local'),import('/vendor/GLTFLoader.bundle.js?v=169-local'),import('/vendor/bp-street-detail-v1.mjs')]);T=mods[0].default||mods[0];loader=new mods[1].GLTFLoader();helpers=mods[2];const gltf=await helpers.loadStreetGLTF(loader,{url:BASE+'pack-de-ruas.glb.gz'});makeTemplates(gltf.scene);if(dead)return;install();state.status='models-ready';state.asset='Sketchfab Pack de Ruas LW3D v2';state.assetBytes='8.35 MB source GLB, gzip served';schedule();})().catch(e=>{job=null;state.status='asset-error';state.error=String(e).slice(0,180);});return job;}
 function createGroup(rows,center){const c=toMerc(center),cos=Math.max(.12,Math.cos(center[1]*RAD)),base=map.getTerrain?.()?map.queryTerrainElevation(center,{exaggerated:true}):0;if(!Number.isFinite(base)){state.transformProbe={finiteBase:false};return null;}const qAt=(x,y)=>fromMerc([c[0]+x/cos,c[1]+y/cos]),raw=map.transform?.getMatrixForModel?.(center,base),east=map.transform?.getMatrixForModel?.(qAt(1,0),base),north=map.transform?.getMatrixForModel?.(qAt(0,1),base);if(!raw||!east||!north){state.transformProbe={raw:!!raw,east:!!east,north:!!north,base};return null;}state.transformProbe={raw:true,east:true,north:true,base};const inv=new T.Matrix4().fromArray(raw).invert(),ee=new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(east).premultiply(inv)),nn=new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(north).premultiply(inv)),batches=new Map(),accepted={street1:[],street2:[],street3:[],street4:[]};
  for(const row of rows){const t=templates[row.asset];if(!t)continue;const mxy=toMerc(row.q),x=(mxy[0]-c[0])*cos,y=(mxy[1]-c[1])*cos,lx=ee.x*x+nn.x*y,lz=ee.z*x+nn.z*y;let z=base;try{if(map.getTerrain?.()){const e=map.queryTerrainElevation(row.q,{exaggerated:true});if(Number.isFinite(e))z=e;}}catch(_){}const widthScale=clamp(row.width/t.size.x,.02,8),lengthScale=clamp(row.len/t.size.z,.02,8),matrix=new T.Matrix4().makeTranslation(lx,z-base+.035,lz).multiply(new T.Matrix4().makeRotationY(row.yaw)).multiply(new T.Matrix4().makeScale(widthScale,1,lengthScale));accepted[row.asset].push(matrix);}
  const next=new T.Group();next.frustumCulled=false;let roadCount=0,intersectionCount=0,triangles=0;for(const name of Object.keys(accepted)){const matrices=accepted[name];if(!matrices.length)continue;const t=templates[name];const mesh=new T.InstancedMesh(t.geometry,t.material,matrices.length);mesh.frustumCulled=false;for(let i=0;i<matrices.length;i++)mesh.setMatrixAt(i,matrices[i]);mesh.instanceMatrix.needsUpdate=true;mesh.userData.sketchfabRoadAsset=true;next.add(mesh);triangles+=t.triangles*matrices.length;if(name==='street4')intersectionCount=matrices.length;else roadCount+=matrices.length;}
  state.acceptedModels=Object.fromEntries(Object.entries(accepted).map(([name,items])=>[name,items.length]));if(!next.children.length)return null;return{group:next,base,roadCount,intersectionCount,triangles};}
 async function refresh(){if(dead||map.isMoving?.()||map.getZoom()<14.4)return;if(!T){void initialize();return;}const center=[map.getCenter().lng,map.getCenter().lat],features=collectFeatures(map),rows=collectRoadPieces(features,center,map,templates);state.mappedRoadFeatures=features.length;state.collectionProbe=rows.collectionProbe;state.sourceCandidates=rows.pieces.length;state.junctionCandidates=rows.junctionCount;const key=center.map(v=>v.toFixed(4)).join(':')+':'+Math.floor(map.getZoom()*2)+':'+rows.pieces.map(x=>x.q.map(v=>v.toFixed(5)).join(',')+x.asset).join('|');if(key===lastKey)return;const run=++seq,built=createGroup(rows.pieces,center);if(dead||run!==seq||map.isMoving?.())return;if(!built){state.status='waiting-for-mapped-roads';return;}clearGroup();group=built.group;scene.add(group);anchor=center;anchorZ=built.base;lastKey=key;state.status='ready';state.roadInstances=built.roadCount;state.intersectionInstances=built.intersectionCount;state.junctions=rows.junctionCount;state.triangles=built.triangles;state.sourceCandidates=rows.pieces.length;state.terrainAnchored=true;state.sidewalksAttached=true;state.curbsAttached=true;state.model='Pack de Ruas LW3D v2';state.updatedAt=Date.now();
  // Keep mapped asphalt, sidewalks, curbs, and markings visible beneath viewport-local Sketchfab meshes.
  disableDuplicateFallback();map.triggerRepaint();}
 function schedule(){if(dead||timer)return;timer=setTimeout(()=>{timer=0;if(map.getZoom()<14.4){if(group)clearGroup();restoreDuplicateFallback();state.status='standby';return;}void refresh();},350);}
 map.on('moveend',schedule);map.on('zoomend',schedule);map.on('sourcedata',e=>{if(['ofm','bpLivingWorld'].includes(e.sourceId)&&e.isSourceLoaded)schedule();});map.on('bpsurfacemaskready',()=>{if(state.status==='ready')disableDuplicateFallback();});map.on('style.load',()=>{lastKey='';oldVisibility={};schedule();});map.once('remove',()=>{dead=true;seq++;clearTimeout(timer);map.off('moveend',schedule);map.off('zoomend',schedule);for(const [id,v] of Object.entries(oldVisibility))if(map.getLayer(id))try{map.setLayoutProperty(id,'visibility',v||'visible');}catch(_){}clearGroup();restoreDuplicateFallback();});void initialize();return state;
}