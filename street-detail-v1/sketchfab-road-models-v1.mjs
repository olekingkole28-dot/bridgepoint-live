// Places the user's CC-BY Sketchfab street-pack meshes on mapped street geometry.
// The meshes include the source pack's road, sidewalk, curb, and marking textures.
import {attachRoadInfrastructure} from '/vendor/bp-road-infrastructure-v1.mjs?v=1';
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
 const segmentKeys=new Set(),c=toMerc(center),cos=Math.max(.12,Math.cos(center[1]*RAD)),radius=map.getZoom()<14?3200:map.getZoom()<15?1900:map.getZoom()<17?1050:650,canvas=map.getCanvas(),pieces=[],seenWays=new Set(),probes=[];
 for(const {line,properties:p} of features){
  const cls=lower(p.class).replace(/_link$/,''),probe={class:cls,vertices:line.length,piecesAdded:0},wayKey=lineSignature(line,cls);
  probes.push(probe);if(seenWays.has(wayKey)){probe.skip='duplicate';continue;}seenWays.add(wayKey);
  const projected=line.map(toMerc),cum=[0];
  for(let i=1;i<projected.length;i++)cum.push(cum[i-1]+Math.hypot((projected[i][0]-projected[i-1][0])*cos,(projected[i][1]-projected[i-1][1])*cos));
  const total=cum[cum.length-1];probe.totalMeters=total;if(total<4){probe.skip='short-line';continue;}
  const carriage=widthFor(p),urban=!['motorway','trunk'].includes(cls)||String(p.sidewalk||'').toLowerCase()==='both',fullWidth=carriage+(urban&&String(p.sidewalk||'').toLowerCase()!=='no'?3.2:0);
  const asset=(p.oneway==='yes'||p.oneway===true||p.oneway==='-1')?'street2':'street1',t=templates[asset];
  probe.asset=asset;probe.templateSize=t?.size;
  if(!t){probe.skip='template-missing';continue;}
  // Subdivide actual mapped polyline edges instead of cutting across bends.
  const nominal=Math.max(6,t.size.z)*(map.getZoom()<14.5?1.8:1),countLimit=5000;
  probe.segmentCount=0;probe.intersectionMethod='mapped polyline edges, source street cross-section';
  for(let edge=1;edge<projected.length&&probe.segmentCount<countLimit;edge++){
   const first=projected[edge-1],last=projected[edge],ex=last[0]-first[0],ey=last[1]-first[1],edgeLen=Math.hypot(ex*cos,ey*cos);
   if(edgeLen<.12)continue;
   const count=Math.ceil(edgeLen/nominal);
   for(let i=0;i<count&&probe.segmentCount<countLimit;i++){
    probe.segmentCount++;
    const a=[first[0]+ex*i/count,first[1]+ey*i/count],b=[first[0]+ex*(i+1)/count,first[1]+ey*(i+1)/count];
    const mid=[(a[0]+b[0])/2,(a[1]+b[1])/2],dist=Math.hypot((mid[0]-c[0])*cos,(mid[1]-c[1])*cos);
    if(dist>radius)continue;
    const q=fromMerc(mid),px=map.project(q);
    if(px.x< -120||px.y< -120||px.x>canvas.clientWidth+120||px.y>canvas.clientHeight+120)continue;
    const qa=fromMerc(a),qb=fromMerc(b),key=[qa,qb].map(v=>v.map(n=>n.toFixed(6)).join(',')).sort().join('|');
    if(segmentKeys.has(key))continue;segmentKeys.add(key);
    pieces.push({q,a:qa,b:qb,len:edgeLen/count,width:carriage*t.size.x/7,asset,dist});probe.piecesAdded++;
   }
  }
 }
 const collectionProbe={center,zoom:map.getZoom(),radiusMeters:radius,canvas:{width:canvas.clientWidth,height:canvas.clientHeight},features:probes};
 pieces.sort((a,b)=>a.dist-b.dist);
 return {pieces:pieces.slice(0,(innerWidth<=700?900:1600)),junctionCount:0,collectionProbe};
}
export function attachSketchfabRoadModels(map,options={}){
 if(!map||map.__BP_SKETCHFAB_ROAD_MODELS_V1__)return map?.__BP_SKETCHFAB_ROAD_MODELS_V1__;
 if(!options.terrainSampler)attachRoadInfrastructure(map);
 const state=map.__BP_SKETCHFAB_ROAD_MODELS_V1__={status:'loading',sourcePack:'Pack de Ruas LW3D v2',source:'mapped road centerlines',roadInstances:0,intersectionInstances:0,frames:0,sidewalksAttached:true,curbsAttached:true,markings:'source pack textures',updatedAt:Date.now()};window.__BP_SKETCHFAB_ROAD_MODELS_V1__=state;
 let T,loader,helpers,renderer,camera,scene,group,layer,anchor,anchorZ,templates={},job,timer=0,seq=0,dead=false,lastKey='',oldVisibility={},terrainRevision=0,refreshing=false,rerun=false;
 function disableDuplicateFallback(){
   const d=map.__BP_SOURCE_SURFACES_V2__;
   if(d){
    if(!Object.prototype.hasOwnProperty.call(state,'previousSourceMeshVisible'))state.previousSourceMeshVisible=d.meshVisible;
    d.meshVisible=false;d.fallbackDisabledBySketchfab=true;
   }
   for(const id of ['gta-road3d-deck','gta-bp-sidewalk-slabs-v1','bp-source-road-asphalt-v2','bp-source-sidewalk-concrete-v2']){
    if(!map.getLayer(id))continue;
    try{if(!(id in oldVisibility))oldVisibility[id]=map.getLayoutProperty(id,'visibility');map.setLayoutProperty(id,'visibility',id==='bp-source-road-asphalt-v2'&&map.getLayer(id)?.type==='fill-extrusion'?'visible':'none');}catch(_){}
   }
   state.duplicateSurfaceSuppressed=true;
   state.suppressedFallbackLayers=Object.keys(oldVisibility);
   state.sourceSurfaceFallback=false;
   state.nativeAsphaltUnderlay=map.getLayer('bp-source-road-asphalt-v2')?.type==='fill-extrusion'&&map.getLayoutProperty('bp-source-road-asphalt-v2','visibility')==='visible';
  }
  function restoreDuplicateFallback(){
   const d=map.__BP_SOURCE_SURFACES_V2__;
   if(d&&Object.prototype.hasOwnProperty.call(state,'previousSourceMeshVisible')){d.meshVisible=state.previousSourceMeshVisible;d.fallbackDisabledBySketchfab=false;}
   for(const [id,v] of Object.entries(oldVisibility))if(map.getLayer(id))try{map.setLayoutProperty(id,'visibility',v||'visible');}catch(_){}
   oldVisibility={};state.nativeAsphaltUnderlay=false;state.duplicateSurfaceSuppressed=false;state.suppressedFallbackLayers=[];state.sourceSurfaceFallback=true;
  }
  function install(){if(map.getLayer(LAYER))return;layer={id:LAYER,type:'custom',renderingMode:'3d',onAdd(m,gl){renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false,alpha:true});renderer.autoClear=false;renderer.info.autoReset=false;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;camera=new T.Camera();scene=new T.Scene();scene.add(new T.HemisphereLight(0xe8f0f5,0x625e50,1.8));const sun=new T.DirectionalLight(0xffefd8,2);sun.position.set(-35,60,45);scene.add(sun);},render(gl,args){if(!renderer||!scene||!group||!group.children.length||map.getZoom()<12.7||document.hidden)return;const raw=map.transform?.getMatrixForModel?.(anchor,anchorZ),matrix=args?.defaultProjectionData?.mainMatrix;if(!raw||!matrix)return;camera.projectionMatrix.fromArray(matrix).multiply(new T.Matrix4().fromArray(raw));renderer.resetState();renderer.info.reset();renderer.render(scene,camera);state.drawCalls=renderer.info.render.calls;state.triangles=renderer.info.render.triangles;state.frames=(state.frames||0)+1;},onRemove(){clearGroup();renderer?.dispose();renderer=null;scene=null;}};const before=['gta-road-label-major','gta-road-label-local','gta-context-building-footprints','gta-water-label'].find(id=>map.getLayer(id));map.addLayer(layer,before);}
 function clearGroup(){if(group&&scene){scene.remove(group);group.traverse(o=>{if(o.userData?.bpTerrainRoadBatch)o.geometry?.dispose();else if(o.isInstancedMesh)o.dispose?.();});}group=null;state.roadInstances=0;state.intersectionInstances=0;}
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
  // street1 is a merged mesh with a separate irregular road section.
  // Extract the original contiguous straight piece, including its curbs and UVs.
  function isolateStraightStreet(g){
    const flat=g.index?g.toNonIndexed():g, pos=flat.attributes.position, keep=[];
    for(let i=0;i<pos.count;i+=3)if(Math.max(pos.getZ(i),pos.getZ(i+1),pos.getZ(i+2))<5)keep.push(i,i+1,i+2);
    const clean=new T.BufferGeometry();
    for(const [name,a] of Object.entries(flat.attributes)){
      const array=new (a.isInterleavedBufferAttribute?a.data.array.constructor:a.array.constructor)(keep.length*a.itemSize);
      const src=a.isInterleavedBufferAttribute?a.data.array:a.array,stride=a.isInterleavedBufferAttribute?a.data.stride:a.itemSize,offset=a.isInterleavedBufferAttribute?a.offset:0;
      let k=0;for(const i of keep)for(let c=0;c<a.itemSize;c++)array[k++]=src[i*stride+offset+c];
      clean.setAttribute(name,new T.BufferAttribute(array,a.itemSize,a.normalized));
    }
    if(flat!==g)flat.dispose();g.dispose();
    clean.computeBoundingBox();const size=clean.boundingBox.getSize(new T.Vector3());
    if(keep.length!==30||Math.abs(size.z-14.44555)>.05||Math.abs(size.x-9.42126)>.05){clean.dispose();throw Error('SOURCE_STRAIGHT_STREET_GEOMETRY_MISMATCH');}
    return clean;
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
     if(name==='street1')g=isolateStraightStreet(g);
     g.computeBoundingBox();let box=g.boundingBox,size={x:box.max.x-box.min.x,y:box.max.y-box.min.y,z:box.max.z-box.min.z};
     if(size.x<.1||size.z<.1||size.y>20||Math.max(size.x,size.z)>180){g.dispose();return;}
     if(name!=='street4'&&size.x>size.z*1.08){
      g.applyMatrix4(new T.Matrix4().makeRotationY(Math.PI/2));g.computeBoundingBox();box=g.boundingBox;size={x:box.max.x-box.min.x,y:box.max.y-box.min.y,z:box.max.z-box.min.z};
     }
     g.translate(-(box.min.x+box.max.x)/2,-box.min.y,-(box.min.z+box.max.z)/2);g.computeBoundingBox();g.computeBoundingSphere();
     const material=mats[mi].clone();material.side=T.DoubleSide;material.transparent=false;material.depthTest=true;material.depthWrite=true;material.polygonOffset=true;material.polygonOffsetFactor=-2;material.polygonOffsetUnits=-4;material.needsUpdate=true;
     options.push({geometry:g,material,size,triangles:(g.index?.count||g.attributes.position.count)/3});
    });
    options.sort((a,b)=>b.triangles-a.triangles);
    const chosen=options.shift();for(const other of options)other.geometry.dispose();
    if(!chosen)throw Error('SKETCHFAB_ROAD_PACK_MATERIAL_GEOMETRY_MISSING:'+name);
    templates[name]=chosen;
   }
   state.sourceMeshes=Object.keys(templates);state.sourceStraightSectionIsolated=true;
   state.templateSizes=Object.fromEntries(Object.entries(templates).map(([name,t])=>[name,t.size]));
   state.templateTriangles=Object.fromEntries(Object.entries(templates).map(([name,t])=>[name,t.triangles]));
  }
  async function initialize(){if(job)return job;job=(async()=>{const mods=await Promise.all([import('/vendor/three.module.js?v=169-local'),import('/vendor/GLTFLoader.bundle.js?v=169-local'),import('/vendor/bp-street-detail-v1.mjs')]);T=mods[0].default||mods[0];loader=new mods[1].GLTFLoader();helpers=mods[2];const gltf=await helpers.loadStreetGLTF(loader,{url:BASE+'pack-de-ruas.glb.gz'});makeTemplates(gltf.scene);if(dead)return;install();state.status='models-ready';state.asset='Sketchfab Pack de Ruas LW3D v2';state.assetBytes='8.35 MB source GLB, gzip served';schedule();})().catch(e=>{job=null;restoreDuplicateFallback();state.status='asset-error';state.error=String(e).slice(0,180);});return job;}
 // Preserve the source cross-section, UVs and 15 cm curb. Subdivide its
 // triangles in road-local space before sampling the terrain at every vertex.
 const ROAD_CLEARANCE=.32,MAX_EDGE_METERS=3.5;
 const midpoint=(a,b)=>a.map((v,i)=>(v+b[i])*.5);
 function subdivide(a,b,c,sx,sz,out,depth=0){
  const length=(p,q)=>Math.hypot((p[0]-q[0])*sx,(p[2]-q[2])*sz),ab=length(a,b),bc=length(b,c),ca=length(c,a),max=Math.max(ab,bc,ca);
  if(max<=MAX_EDGE_METERS||depth>=8){out.push(a,b,c);return;}
  if(max===ab){const m=midpoint(a,b);subdivide(a,m,c,sx,sz,out,depth+1);subdivide(m,b,c,sx,sz,out,depth+1);}
  else if(max===bc){const m=midpoint(b,c);subdivide(a,b,m,sx,sz,out,depth+1);subdivide(a,m,c,sx,sz,out,depth+1);}
  else{const m=midpoint(c,a);subdivide(a,b,m,sx,sz,out,depth+1);subdivide(m,b,c,sx,sz,out,depth+1);}
 }
 async function createGroup(rows,center){
  const hasTerrain=!!map.getTerrain?.(),sample=typeof options.terrainSampler==='function'?options.terrainSampler:q=>hasTerrain?map.queryTerrainElevation({lng:q[0],lat:q[1]},{exaggerated:true}):0;
  const base=sample(center);if(!Number.isFinite(base)){state.transformProbe={finiteBase:false};return null;}
  const raw=map.transform?.getMatrixForModel?.(center,base);if(!raw){state.transformProbe={raw:false,base};return null;}
  const inv=new T.Matrix4().fromArray(raw).invert(),accepted={street1:0,street2:0,street3:0,street4:0},batches=new Map(),cache=new Map();
  let maxEndpointError=0,minClearance=Infinity,minHeight=Infinity,maxHeight=-Infinity,missing=0,vertexCount=0,terrainConformedRows=0;
  function samplePoint(q,sourceY){
   const k=q.map(v=>v.toFixed(8)).join(',');
   let entry=cache.get(k);
   if(!entry){const h=sample(q);if(!Number.isFinite(h))return null;entry={h,positions:new Map()};cache.set(k,entry);}
   const ykey=sourceY.toFixed(5);let point=entry.positions.get(ykey);
   if(!point){const m=map.transform?.getMatrixForModel?.(q,entry.h+ROAD_CLEARANCE+sourceY);if(!m)return null;
    point=new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(m).premultiply(inv));if(!Number.isFinite(point.x+point.y+point.z))return null;entry.positions.set(ykey,point);}
   minHeight=Math.min(minHeight,entry.h);maxHeight=Math.max(maxHeight,entry.h);minClearance=Math.min(minClearance,ROAD_CLEARANCE+sourceY);
   return point;
  }
  for(let ri=0;ri<rows.length;ri++){
   if(ri%12===0){await new Promise(resolve=>setTimeout(resolve,0));if(dead||map.isMoving?.())return null;}
   const row=rows[ri],t=templates[row.asset];if(!t)continue;
   const A=toMerc(row.a),B=toMerc(row.b),dx=B[0]-A[0],dy=B[1]-A[1],span=Math.hypot(dx,dy),cos=Math.max(.12,Math.cos(row.q[1]*RAD));
   if(span<.05)continue;
   const sx=row.width/t.size.x,sz=span*cos/t.size.z,rx=-dy/span,ry=dx/span;
   const coord=(x,z)=>{const f=z/t.size.z+.5,offset=x*sx/cos;return fromMerc([A[0]+dx*f+rx*offset,A[1]+dy*f+ry*offset]);};
   const pa=samplePoint(coord(0,-t.size.z*.5),0),pb=samplePoint(coord(0,t.size.z*.5),0),qa=samplePoint(row.a,0),qb=samplePoint(row.b,0);
   if(!pa||!pb||!qa||!qb){missing++;continue;}maxEndpointError=Math.max(maxEndpointError,pa.distanceTo(qa),pb.distanceTo(qb));
   const g=t.geometry,attr=g.attributes.position,uv=g.attributes.uv,index=g.index,triangles=[];
   const get=i=>[attr.getX(i),attr.getY(i),attr.getZ(i),uv?.getX(i)||0,uv?.getY(i)||0];
   for(let i=0;i<(index?.count||attr.count);i+=3){const ix=j=>index?index.getX(i+j):i+j;subdivide(get(ix(0)),get(ix(1)),get(ix(2)),sx,sz,triangles);}
   const pos=[],uvs=[];let valid=true;
   for(const v of triangles){const q=coord(v[0],v[2]),point=samplePoint(q,v[1]);if(!point){valid=false;break;}pos.push(point.x,point.y,point.z);uvs.push(v[3],v[4]);}
   if(!valid){missing++;continue;}
   let batch=batches.get(row.asset);if(!batch){batch={pos:[],uvs:[]};batches.set(row.asset,batch);}
   for(const v of pos)batch.pos.push(v);for(const v of uvs)batch.uvs.push(v);
   accepted[row.asset]++;terrainConformedRows++;vertexCount+=pos.length/3;
  }
  const next=new T.Group();next.frustumCulled=false;let roadCount=0,intersectionCount=0,triangles=0;
  for(const [name,batch] of batches){const t=templates[name],g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(batch.pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(batch.uvs,2));g.computeVertexNormals();g.computeBoundingSphere();
   const mesh=new T.Mesh(g,t.material);mesh.frustumCulled=false;mesh.userData.bpTerrainRoadBatch=true;mesh.userData.sketchfabRoadAsset=true;next.add(mesh);triangles+=batch.pos.length/9;if(name==='street4')intersectionCount+=accepted[name];else roadCount+=accepted[name];}
  state.acceptedModels=accepted;state.transformProbe={raw:true,base,alignment:'terrain-conforming source mesh',maxEndpointError};
  state.maxEndpointError=maxEndpointError;state.terrainConforming=true;state.terrainVertexCount=vertexCount;state.terrainSamples=cache.size;state.terrainConformedRows=terrainConformedRows;state.missingTerrainRows=missing;state.minTerrainClearance=Number.isFinite(minClearance)?minClearance:null;state.terrainHeightRange=Number.isFinite(minHeight)?maxHeight-minHeight:0;state.sourceUVPreserved=true;state.maxSubdivisionEdgeMeters=MAX_EDGE_METERS;
  if(!next.children.length)return null;return{group:next,base,roadCount,intersectionCount,triangles};
 }
 async function refresh(){if(refreshing){rerun=true;return;}if(dead||map.isMoving?.()||map.getZoom()<12.7)return;if(!T){void initialize();return;}const center=[map.getCenter().lng,map.getCenter().lat],features=collectFeatures(map),rows=collectRoadPieces(features,center,map,templates);state.mappedRoadFeatures=features.length;state.collectionProbe=rows.collectionProbe;state.sourceCandidates=rows.pieces.length;state.junctionCandidates=rows.junctionCount;const key=center.map(v=>v.toFixed(4)).join(':')+':'+Math.floor(map.getZoom()*2)+':'+terrainRevision+':'+rows.pieces.map(x=>[...x.a,...x.b].map(v=>v.toFixed(6)).join(',')+x.asset).join('|');if(key===lastKey)return;const run=++seq;refreshing=true;let built;try{built=await createGroup(rows.pieces,center);}catch(e){state.error=String(e).slice(0,180);restoreDuplicateFallback();}finally{refreshing=false;if(rerun){rerun=false;schedule();}}if(dead||run!==seq||map.isMoving?.()||map.getZoom()<12.7){built?.group.traverse(o=>{if(o.userData?.bpTerrainRoadBatch)o.geometry?.dispose();});return;}if(!built){clearGroup();lastKey='';restoreDuplicateFallback();state.status='waiting-for-mapped-roads';return;}clearGroup();group=built.group;scene.add(group);anchor=center;anchorZ=built.base;lastKey=key;state.status='ready';state.roadInstances=built.roadCount;state.intersectionInstances=built.intersectionCount;state.junctions=rows.junctionCount;state.triangles=built.triangles;state.sourceCandidates=rows.pieces.length;state.terrainAnchored=true;state.sidewalksAttached=true;state.curbsAttached=true;state.model='Pack de Ruas LW3D v2 · continuous mapped centerlines';state.updatedAt=Date.now();
  // One geometry owner per surface: source asphalt/sidewalk overlays create the floating
  // duplicate slabs visible beneath the Sketchfab modules, so keep them suppressed here.
  disableDuplicateFallback();state.intersectionStrategy='terrain-conforming source sections with native asphalt underlay at gaps';map.triggerRepaint();}
 function schedule(){if(dead||timer)return;timer=setTimeout(()=>{timer=0;if(map.getZoom()<12.7){seq++;if(group)clearGroup();restoreDuplicateFallback();state.status='standby';return;}void refresh();},350);}
 map.on('moveend',schedule);map.on('zoomend',schedule);map.on('sourcedata',e=>{if(['ofm','bpLivingWorld'].includes(e.sourceId)&&e.isSourceLoaded)schedule();else if(e.isSourceLoaded&&/dem|terrain/i.test(String(e.sourceId||''))){terrainRevision++;schedule();}});map.on('bpsurfacemaskready',()=>{if(state.status==='ready')disableDuplicateFallback();});map.on('style.load',()=>{lastKey='';if(state.status==='ready')disableDuplicateFallback();schedule();});map.once('remove',()=>{dead=true;seq++;clearTimeout(timer);map.off('moveend',schedule);map.off('zoomend',schedule);for(const [id,v] of Object.entries(oldVisibility))if(map.getLayer(id))try{map.setLayoutProperty(id,'visibility',v||'visible');}catch(_){}clearGroup();restoreDuplicateFallback();});void initialize();return state;
}