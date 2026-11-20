/* BridgePoint EM/RF global Starlink field v2.
 * Public CelesTrak OMM element-set snapshot => approximate orbit propagation.
 * Thousands of globe-grounded 3D modeled nadir beams, never operator telemetry.
 * Satellite geometry uses V1.5 / V2 Mini published OUTER dimensions with
 * representative bus, solar panel and antennas; NOT original SpaceX CAD.
 * Cached same-origin catalog is shared by all site users, never per-user scraping.
 */
const OMM='/starlink-orbits-v2.json';
const THREE_URL='/vendor/three.module.js?v=169-local';
const LAYER='bp-emrf-thousands-starlink-beams-v2';
const MAX_BEAMS=4200,MAX_MOBILE_BEAMS=2800,MIN_RECORDS=2500;
const runtimeBeamBudget=()=>typeof window!=='undefined'&&window.innerWidth<700?MAX_MOBILE_BEAMS:MAX_BEAMS;
const RAD=Math.PI/180,EARTH_KM=6378.137,MU=398600.4418,J2=1.08262668e-3;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
let catalogPromise=null,threePromise=null;
export function prefetchStarlinkOmmV2(){
 if(!catalogPromise)catalogPromise=fetch(OMM,{cache:'default',headers:{Accept:'application/json'}})
 .then(async r=>{if(!r.ok)throw Error('Published Starlink catalog HTTP '+r.status);return r.json();})
 .then(doc=>{
  if(!Array.isArray(doc.records)||doc.records.length<MIN_RECORDS||doc.version!==2)
    throw Error('Starlink catalog missing real orbital records');
  const at=Date.parse(doc.fetched_at);
  if(!Number.isFinite(at)||Date.now()-at>7*86400000)
    throw Error('Published Starlink OMM catalog older than 7 days: needs refreshed verified source');
  return doc;
 }).catch(e=>{catalogPromise=null;throw e});
 return catalogPromise;
}
function getThree(){
 if(!threePromise)threePromise=import(THREE_URL).then(m=>m.default||m)
 .catch(e=>{threePromise=null;throw e});
 return threePromise;
}
const wrapLongitude=d=>((d+540)%360)-180;
const finite=v=>Number.isFinite(v);
export function propagateStarlinkOmmV2(row,timeMs=Date.now()){
 if(!Array.isArray(row)||row.length<9)return null;
 const [id,name,epochMs,revPerDay,e,inc,raan,arg,mean]=row;
 if(![epochMs,revPerDay,e,inc,raan,arg,mean,timeMs].every(v=>typeof v==='number'&&finite(v)))return null;
 if(!finite(id)||revPerDay<1||revPerDay>19||e<0||e>=.2)return null;
 const days=(timeMs-epochMs)/86400000;
 if(Math.abs(days)>9)return null;
 const n=revPerDay*2*Math.PI/86400,a=Math.cbrt(MU/(n*n)),p=a*(1-e*e),ii=inc*RAD;
 if(!finite(a)||a<EARTH_KM+90||a>EARTH_KM+2500)return null;
 const cosI=Math.cos(ii),factor=J2*n*Math.pow(EARTH_KM/p,2);
 const deltaT=days*86400;
 const omegaNode=raan*RAD-1.5*factor*cosI*deltaT;
 const peri=arg*RAD+.75*factor*(5*cosI*cosI-1)*deltaT;
 let anomaly=mean*RAD+(n+.75*factor*Math.sqrt(1-e*e)*(3*cosI*cosI-1))*deltaT;
 anomaly=((anomaly+Math.PI)%(2*Math.PI)+2*Math.PI)%(2*Math.PI)-Math.PI;
 let E=anomaly;
 for(let k=0;k<5;k++)E-=(E-e*Math.sin(E)-anomaly)/(1-e*Math.cos(E));
 const radius=a*(1-e*Math.cos(E));
 const nu=Math.atan2(Math.sqrt(1-e*e)*Math.sin(E),Math.cos(E)-e);
 const u=peri+nu,sinU=Math.sin(u),cosU=Math.cos(u);
 const x=radius*(Math.cos(omegaNode)*cosU-Math.sin(omegaNode)*sinU*cosI);
 const y=radius*(Math.sin(omegaNode)*cosU+Math.cos(omegaNode)*sinU*cosI);
 const z=radius*sinU*Math.sin(ii);
 const jd=timeMs/86400000+2440587.5,t=(jd-2451545)/36525;
 const gmst=((280.46061837+360.98564736629*(jd-2451545)+.000387933*t*t-t*t*t/38710000)%360)*RAD;
 const lon=wrapLongitude((Math.atan2(y,x)-gmst)/RAD);
 const lat=Math.atan2(z,Math.hypot(x,y))/RAD;
 const altitudeM=(radius-EARTH_KM)*1000;
 if(![lat,lon,altitudeM].every(finite)||Math.abs(lat)>90||altitudeM<90000||altitudeM>2500000)return null;
 return {id:String(id),name:String(name),lon,lat,altitudeM,
  modelVariant:row[9]&&String(row[9]).startsWith('2019')||/^(20(19|20|21|22))-/.test(String(row[9]||''))?'v1.5':'v2-mini',
  epochMs,source:'CelesTrak OMM; J2-adjusted analytical orbit estimate'};
}
export function selectStarlinkCatalogV2(rows,max=MAX_BEAMS){
 if(!Array.isArray(rows))return [];
 const count=Math.min(Math.max(0,max),rows.length);
 if(count===rows.length)return rows;
 // Choose deterministic, evenly spaced real orbital records instead of cloning
 // or inventing satellites to reach the beam budget.
 const selected=[];
 for(let k=0;k<count;k++)selected.push(rows[Math.floor(k*rows.length/count)]);
 return selected;
}
function emptyInstance(T,geometry,material,max){
 const mesh=new T.InstancedMesh(geometry,material,max);
 mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
 return mesh;
}
// High resolution reusable decals for instanced, dimension-informed Starlink models.
function starlinkDecal(T,type){
 const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;
 const c=canvas.getContext('2d');if(!c)return null;
 if(type==='brand'){
  c.fillStyle='#071421';c.fillRect(0,0,1024,256);c.strokeStyle='#81ddff';
  c.lineWidth=10;c.strokeRect(8,8,1008,240);c.fillStyle='#f5fbff';
  c.font='bold 160px Arial, sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText('STARLINK',512,135);
 }else{
  c.fillStyle='#071329';c.fillRect(0,0,1024,256);
  for(let x=8;x<1024;x+=64)for(let y=8;y<256;y+=48){
   c.fillStyle=(x+y)%3?'#163a79':'#205296';c.fillRect(x,y,56,40);
   c.strokeStyle='#5ba1d9';c.lineWidth=1.5;c.strokeRect(x,y,56,40);
   c.fillStyle='rgba(131,204,255,.24)';c.fillRect(x+3,y+3,50,3);
  }
 }
 const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace||tex.colorSpace;tex.anisotropy=2;return tex;
}
function instancedStarlinkParts(T,variant,max){
 const v15=variant==='v1.5',busLength=v15?2.8:4.1,busWidth=v15?1.3:2.7,panelLength=v15?8.1:12.8,panelWidth=v15?2.8:4.1;
 const parts=[],add=(geo,mat,name)=>{const mesh=emptyInstance(T,geo,mat,max);mesh.name='STARLINK '+variant+' '+name;parts.push(mesh);return mesh;};
 add(new T.BoxGeometry(busLength,v15?.31:.48,busWidth),new T.MeshStandardMaterial({color:0xb9c4cc,metalness:.72,roughness:.31}),'metallic chassis');
 const top=new T.BoxGeometry(busLength*.96,.035,busWidth*.91);top.translate(0,v15?.18:.26,0);
 add(top,new T.MeshStandardMaterial({color:0x637785,metalness:.81,roughness:.29}),'thermal panel');
 const solar=new T.BoxGeometry(panelLength,.065,panelWidth);solar.translate(busLength*.5+panelLength*.5,.30,0);
 add(solar,new T.MeshStandardMaterial({color:0x173970,metalness:.55,roughness:.32,map:starlinkDecal(T,'solar'),side:T.DoubleSide}),'textured solar-cell array');
 const frame=new T.BoxGeometry(panelLength,.095,.075);frame.translate(busLength*.5+panelLength*.5,.34,panelWidth*.5);
 add(frame,new T.MeshStandardMaterial({color:0xb6c4cf,metalness:.8,roughness:.27}),'solar frame rail');
 const underside=new T.BoxGeometry(busLength*.71,.15,busWidth*.72);underside.translate(-busLength*.05,-.30,0);
 add(underside,new T.MeshStandardMaterial({color:0xdbe0de,metalness:.39,roughness:.45}),'phased-array underside');
 const antenna=new T.CylinderGeometry(.17,.24,.22,10);antenna.rotateX(Math.PI/2);antenna.translate(-busLength*.23,-.30,busWidth*.34);
 add(antenna,new T.MeshStandardMaterial({color:0xe4e9e7,metalness:.56,roughness:.33}),'communications antenna');
 const pod=new T.CylinderGeometry(.11,.17,.45,12);pod.rotateZ(Math.PI/2);pod.translate(-busLength*.28,.02,-busWidth*.45);
 add(pod,new T.MeshStandardMaterial({color:0xbfcbd2,metalness:.64,roughness:.26}),'orientation and RF hardware');
 const brand=new T.PlaneGeometry(busLength*1.35,busWidth*.64);brand.rotateX(-Math.PI/2);brand.translate(0,v15?.21:.30,0);
 add(brand,new T.MeshBasicMaterial({map:starlinkDecal(T,'brand'),transparent:true,side:T.DoubleSide,depthWrite:false}),'STARLINK hull marking');
 const badge=new T.PlaneGeometry(busLength*1.75,busWidth*.64);badge.translate(0,v15?.7:.92,-busWidth*.52);
 add(badge,new T.MeshBasicMaterial({map:starlinkDecal(T,'brand'),transparent:true,side:T.DoubleSide,depthWrite:false}),'STARLINK visible identification panel');
 return {parts,count:0};
}
function makeBeam(T,count){
 const geom=new T.CylinderGeometry(0,1,1,9,1,true);
 const material=new T.ShaderMaterial({
  uniforms:{u_time:{value:0},u_opacity:{value:.22}},
  vertexShader:[
   '#include <common>',
   'varying float vHeight;',
   'void main(){',
   'vHeight=position.y+.5;',
   'vec4 p=vec4(position,1.0);',
   '#ifdef USE_INSTANCING',
   'p=instanceMatrix*p;',
   '#endif',
   'gl_Position=projectionMatrix*modelViewMatrix*p;',
   '}'
  ].join('\n'),
  fragmentShader:[
   'uniform float u_time,u_opacity;',
   'varying float vHeight;',
   'void main(){',
   'float edge=smoothstep(0.0,.09,vHeight)*(1.0-smoothstep(.94,1.0,vHeight));',
   'float pulse=.72+.28*sin(u_time*1.8+vHeight*36.0);',
   'float ribs=.73+.27*cos(vHeight*80.0-u_time*4.2);',
   'float colorBias=clamp(vHeight,0.0,1.0);',
   'vec3 tint=mix(vec3(.18,.67,1.0),vec3(.79,.91,1.0),colorBias);',
   'gl_FragColor=vec4(tint,u_opacity*edge*pulse*ribs);',
   '}'
  ].join('\n'),
  transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,blending:T.AdditiveBlending
 });
 const mesh=emptyInstance(T,geom,material,count);mesh.name='CelesTrak-based Starlink modeled RF coverage beams · not actual transmissions';
 return mesh;
}
function modelMatrix(T,map,position){
 try{
  const matrix=map.transform?.getMatrixForModel?.([position.lon,position.lat],0);
  if(matrix?.length>=16)return new T.Matrix4().fromArray(matrix);
  const Merc=window.maplibregl?.MercatorCoordinate;
  if(!Merc)return null;
  const p=Merc.fromLngLat([position.lon,position.lat],0),m=p.meterInMercatorCoordinateUnits();
  return new T.Matrix4().set(m,0,0,p.x,0,0,m,p.y,0,m,0,p.z,0,0,0,1);
 }catch(_){return null;}
}
export function initBridgePointStarlinkBeamV2(target){
 const map=target?.map||target;
 if(!map?.addLayer||!map.getStyle)return null;
 const prior=window.__BP_EMRF_STARLINK_BEAMS_V2__;
 if(prior?.map===map)return prior;
 const state={map,enabled:false,THREE:null,renderer:null,layer:null,positions:[],catalog:null,
  scene:null,camera:null,lastPaint:0,sourceError:null,beams:null,variantParts:null,modelBoost:1,orbitPaths:null,lastOrbitAt:0,lastOrbitZoom:-1,lastProjection:null,detailsCard:null,
  updateBusy:false,origin:[],styleReady:false,disposed:false,lastPositionAt:0};
 function setStatus(message,extra={}){
  state.sourceError=extra.error||null;
  try{document.dispatchEvent(new CustomEvent('bp:emrf-starlink-status',{detail:{
   active:state.enabled,count:state.positions.length,catalogCount:state.catalog?.record_count||0,
   origin:state.catalog?.fetched_at||null,message,error:state.sourceError,model:'dimension-scaled V1.5 / V2 Mini representations; not SpaceX CAD',
   beamsAreModeled:true,...extra}}));}catch(_){}
 }
 function removeLayer(){
  if(map.getLayer?.(LAYER))try{map.removeLayer(LAYER);}catch(_){}
 }
 function installLayer(){
  if(!state.enabled||state.disposed||!state.THREE||!map.getStyle?.()||map.getLayer?.(LAYER))return;
  const T=state.THREE,scene=new T.Scene(),camera=new T.Camera();
  scene.add(new T.AmbientLight(0xffffff,1.8));
  const light=new T.DirectionalLight(0xd4edff,1.5);light.position.set(50,130,60);scene.add(light);
  const beams=makeBeam(T,MAX_BEAMS);
  const v1=instancedStarlinkParts(T,'v1.5',MAX_BEAMS),v2=instancedStarlinkParts(T,'v2-mini',MAX_BEAMS);
  scene.add(beams,...v1.parts,...v2.parts);
  const orbitPaths=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:0x88d9ff,transparent:true,opacity:.17,depthWrite:false,depthTest:true}));
  orbitPaths.frustumCulled=false;orbitPaths.name='Faint estimated Starlink orbital arcs';scene.add(orbitPaths);state.orbitPaths=orbitPaths;
  const layer={id:LAYER,type:'custom',renderingMode:'3d',
   onAdd(m,gl){
    state.renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
    state.renderer.autoClear=false;
    state.scene=scene;state.camera=camera;state.beams=beams;state.variantParts={v1,v2};
    state.lastPaint=0;
   },
   render(gl,args){
    if(!state.enabled||!state.renderer||!state.scene)return;
    const projection=args?.defaultProjectionData?.mainMatrix||args?.modelViewProjectionMatrix;
    if(!projection||projection.length<16)return;
    const now=performance.now();
    if(now-state.lastPaint>15000||state.recompute){state.recompute=false;updateMatrices();state.lastPaint=now;}
    if(!state.beams.count)return;
    state.lastProjection=new T.Matrix4().fromArray(projection);state.camera.projectionMatrix.copy(state.lastProjection);
    state.beams.material.uniforms.u_time.value=now*.001;
    try{state.renderer.resetState();state.renderer.render(state.scene,state.camera);}
    catch(e){if(!state.renderError){state.renderError=true;console.warn('BridgePoint Starlink instanced beam renderer',e);}}
    // Other BridgePoint atmosphere layers can drive repaint; when static use
    // slow re-render rather than running thousands of per-frame JS transforms.
   },
   onRemove(){
    orbitPaths.geometry?.dispose?.();orbitPaths.material?.dispose?.();
    for(const obj of [beams,...v1.parts,...v2.parts]){
     obj.geometry?.dispose?.();obj.material?.map?.dispose?.();obj.material?.dispose?.();
    }
    try{state.renderer?.dispose();}catch(_){}
    state.renderer=null;state.layer=null;state.beams=null;state.variantParts=null;state.scene=null;state.camera=null;state.orbitPaths=null;state.lastProjection=null;
   }
  };
  try{map.addLayer(layer);state.layer=layer;state.recompute=true;}
  catch(e){setStatus('EM/RF global map style pending; retrying on style.load',{error:String(e?.message||e)});}
 }
 function updateMatrices(){
  const beam=state.beams,variants=state.variantParts,T=state.THREE;
  if(!beam||!variants||!T||!state.enabled)return;
  const z=Number(map.getZoom?.()||1);
  // Explicitly visual-boost satellite body size at whole-Earth zoom. The
  // source dimensions are true metres only in inspection / close orbit view.
  // Continuous size scaling avoids pop-in between zoom thresholds; physical size at inspection scale.
  const boost=clamp(8400*Math.pow(2,2.5-z),1,14000);
  state.modelBoost=boost;
  const translation=new T.Matrix4(),scale=new T.Matrix4();
  let beamCount=0,c1=0,c2=0;
  for(const position of state.positions){
   const world=modelMatrix(T,map,position);if(!world)continue;
   const alt=position.altitudeM;
   const radius=clamp(alt*Math.tan(8*RAD),18000,200000);
   const mid=new T.Matrix4().copy(world)
    .multiply(translation.makeTranslation(0,alt*.5,0))
    .multiply(scale.makeScale(radius,alt,radius));
   beam.setMatrixAt(beamCount++,mid);
   const craft=new T.Matrix4().copy(world).multiply(translation.makeTranslation(0,alt,0))
    .multiply(scale.makeScale(boost,boost,boost));
   const variant=position.modelVariant==='v1.5'?variants.v1:variants.v2;
   const index=variant===variants.v1?c1++:c2++;
   for(const part of variant.parts)part.setMatrixAt(index,craft);
  }
  beam.count=beamCount;beam.instanceMatrix.needsUpdate=true;
  for(const [variant,n] of [[variants.v1,c1],[variants.v2,c2]])
   for(const part of variant.parts){part.count=n;part.instanceMatrix.needsUpdate=true;}
  if(state.catalog?.records&&state.orbitPaths&&(Date.now()-state.lastOrbitAt>30000||Math.abs(z-state.lastOrbitZoom)>.7))rebuildOrbitPaths(z);
  map.triggerRepaint?.();
 }
 // Estimated 3D paths stay at orbital altitude rather than painted on the Earth.
 function rebuildOrbitPaths(zoom){
  const T=state.THREE,all=state.catalog?.records||[],lines=[];
  if(!T||!state.orbitPaths||!all.length)return;
  const budget=runtimeBeamBudget()===MAX_MOBILE_BEAMS?120:210,count=Math.min(budget,all.length),now=Date.now();
  for(let i=0;i<count;i++){
   const row=all[Math.floor(i*all.length/count)];let previous=null;
   for(let k=0;k<=12;k++){
    const p=propagateStarlinkOmmV2(row,now+(k-6)*4*60000);
    if(!p){previous=null;continue;}
    const world=modelMatrix(T,map,p);
    const point=world?new T.Vector3(0,p.altitudeM,0).applyMatrix4(world):null;
    if(point&&previous)lines.push(previous.x,previous.y,previous.z,point.x,point.y,point.z);
    previous=point;
   }
  }
  const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(lines,3));
  state.orbitPaths.geometry?.dispose?.();state.orbitPaths.geometry=geo;
  state.lastOrbitAt=now;state.lastOrbitZoom=zoom;
 }
 function applyPositions(next){
  if(!state.enabled||state.disposed)return;
  state.positions=next.slice(0,MAX_BEAMS);
  state.recompute=true;state.lastPositionAt=Date.now();
  setStatus(state.positions.length.toLocaleString()+' real orbital estimates · modeled Starlink RF beams ready');
  installLayer();
  if(state.layer)map.triggerRepaint?.();
 }
 async function loadCatalog(){
  if(!state.enabled||state.updateBusy)return;
  state.updateBusy=true;
  try{
   const doc=await prefetchStarlinkOmmV2();
   if(!state.enabled||state.disposed)return;
   state.catalog=doc;
   const sample=selectStarlinkCatalogV2(doc.records,runtimeBeamBudget());
   const now=Date.now();
   const next=sample.map(row=>propagateStarlinkOmmV2(row,now)).filter(Boolean);
   if(next.length<2000)throw Error('Too few fresh catalog objects for a representative global constellation');
   applyPositions(next);
  }catch(e){
   if(!state.enabled)return;
   setStatus('Starlink OMM catalog unavailable; existing EM/RF sources remain accessible',{error:String(e?.message||e)});
  }finally{state.updateBusy=false;}
 }
 function handleStyle(){if(state.enabled){installLayer();state.recompute=true;state.lastOrbitAt=0;}}
 function onView(){if(state.enabled&&state.layer){state.recompute=true;state.lastOrbitAt=0;map.triggerRepaint?.();}}
 // Pick custom WebGL satellite meshes using geocentric projected 3D coordinates.
 function onSatelliteClick(ev){
  if(!state.enabled||!state.THREE||!state.lastProjection||!state.positions.length||!ev?.point)return;
  const T=state.THREE,canvas=map.getCanvas?.(),w=canvas?.clientWidth,h=canvas?.clientHeight;
  if(!w||!h)return;
  let best=null,distance=34*34;
  for(const p of state.positions){
   const world=modelMatrix(T,map,p);if(!world)continue;
   const ndc=new T.Vector3(0,p.altitudeM,0).applyMatrix4(world).applyMatrix4(state.lastProjection);
   if(!Number.isFinite(ndc.x)||!Number.isFinite(ndc.y)||ndc.z< -1.5||ndc.z>1.5)continue;
   const dx=(ndc.x*.5+.5)*w-ev.point.x,dy=(.5-ndc.y*.5)*h-ev.point.y,d=dx*dx+dy*dy;
   if(d<distance){distance=d;best=p;}
  }
  if(!best)return;
  state.detailsCard?.remove();
  const card=document.createElement('aside');card.className='bp-emrf-satellite-details';
  card.style.cssText='position:absolute;right:75px;top:64px;max-width:min(295px,62vw);z-index:45;background:rgba(4,19,33,.97);border:1px solid #6bc9fa;border-radius:12px;color:#edfaff;padding:12px;box-shadow:0 10px 30px #0009;font:12px/1.5 system-ui,sans-serif;pointer-events:auto';
  const heading=document.createElement('div');heading.style.cssText='font-weight:900;letter-spacing:.08em;font-size:15px;padding-right:25px';heading.textContent=best.name;
  const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close satellite details');close.style.cssText='position:absolute;right:8px;top:5px;color:#fff;background:none;border:0;font-size:23px';close.onclick=()=>{card.remove();state.detailsCard=null;};
  const info=document.createElement('div');info.style.marginTop='8px';
  const satelliteType=best.modelVariant==='v1.5'?'V1.5 representative':'V2 Mini representative',specs=best.modelVariant==='v1.5'?'Bus 2.8 × 1.3 m; panel 8.1 m':'Bus 4.1 × 2.7 m; panel 12.8 m';
  const rows=[['NORAD catalog ID',best.id],['Modeled spacecraft',satelliteType],['Exterior-size reference',specs],['Estimated altitude',(best.altitudeM/1000).toFixed(1)+' km'],['Estimated latitude / longitude',best.lat.toFixed(3)+'°, '+best.lon.toFixed(3)+'°'],['Orbital elements epoch',new Date(best.epochMs).toISOString().replace('T',' ').slice(0,19)+' UTC'],['Position source',best.source],['RF view','Illustrative 8° nadir beam and orbit path; not live operator telemetry'],['3D geometry','Enhanced dimension-based visualization; not a scanned or SpaceX-issued CAD model']];
  rows.forEach(([key,value])=>{const div=document.createElement('div');div.style.cssText='margin:5px 0;border-top:1px solid #ffffff18;padding-top:4px';const b=document.createElement('b');b.textContent=key+': ';div.append(b,document.createTextNode(value));info.appendChild(div);});
  card.append(heading,close,info);map.getContainer().appendChild(card);state.detailsCard=card;
 }
 map.on?.('click',onSatelliteClick);
 map.on?.('style.load',handleStyle);map.on?.('moveend',onView);map.on?.('zoomend',onView);
 const api={
  map,version:2,
  getFootprints(max=1200){
   if(!state.enabled)return [];
   const n=Math.min(Math.max(0,Math.floor(max)),state.positions.length);
   const out=[];
   for(let i=0;i<n;i++){
    const p=state.positions[Math.floor(i*state.positions.length/n)];
    out.push({lon:p.lon,lat:p.lat,id:p.id,name:p.name,altitudeM:p.altitudeM,radiusM:clamp(p.altitudeM*Math.tan(8*RAD),18000,200000)});
   }
   return out;
  },
  get state(){return {enabled:state.enabled,beamCount:state.positions.length,
   catalogCount:state.catalog?.record_count||0,orbitSnapshotAt:state.catalog?.fetched_at||null,
   modelVisibilityScale:state.modelBoost,orbitTracks:'estimated source-based 3D orbital arcs',satellitePickCards:true,sourceError:state.sourceError,
   beamTruth:'modeled 8 degree nadir cone, not live SpaceX beam telemetry',
   modelTruth:'dimension-scaled illustrative geometry based on public V1.5/V2 Mini exterior measurements, not operator CAD'};},
  async enable(){
   if(state.disposed)return false;
   state.enabled=true;
   setStatus('Global Starlink beam layer ON · loading first-party public OMM snapshot');
   try{state.THREE=await getThree();}catch(e){setStatus('3D renderer unavailable',{error:String(e?.message||e)});}
   if(state.THREE)installLayer();
   if(state.catalog&&state.positions.length){state.recompute=true;map.triggerRepaint?.();}
   else void loadCatalog();
   if(!state.orbitTimer)state.orbitTimer=setInterval(()=>{
    if(!state.enabled||document.hidden||!state.catalog)return;
    const now=Date.now();
    const next=selectStarlinkCatalogV2(state.catalog.records,runtimeBeamBudget())
      .map(row=>propagateStarlinkOmmV2(row,now)).filter(Boolean);
    if(next.length>=2000)applyPositions(next);
   },20000);
   return true;
  },
  disable(){
   state.enabled=false;if(state.orbitTimer){clearInterval(state.orbitTimer);state.orbitTimer=0;}
   removeLayer();state.detailsCard?.remove();state.detailsCard=null;setStatus('Global Starlink modeled RF layer OFF');return false;
  },
  refresh(){if(!state.enabled)return;void loadCatalog();},
  destroy(){
   api.disable();state.disposed=true;
   map.off?.('style.load',handleStyle);map.off?.('moveend',onView);map.off?.('zoomend',onView);map.off?.('click',onSatelliteClick);
   if(window.__BP_EMRF_STARLINK_BEAMS_V2__===api)window.__BP_EMRF_STARLINK_BEAMS_V2__=null;
  }
 };
 window.__BP_EMRF_STARLINK_BEAMS_V2__=api;
 return api;
}
