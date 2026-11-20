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
const MAX_BEAMS=4200,MIN_RECORDS=2500;
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
function instancedStarlinkParts(T,variant,max){
 const v15=variant==='v1.5',busLength=v15?2.8:4.1,busWidth=v15?1.3:2.7,panelLength=v15?8.1:12.8,panelWidth=v15?2.8:4.1;
 const busGeo=new T.BoxGeometry(busLength,v15?.28:.42,busWidth);
 const panelGeo=new T.BoxGeometry(panelLength,.075,panelWidth);
 panelGeo.translate(busLength*.5+panelLength*.5,.34,0);
 const antennaGeo=new T.BoxGeometry(busLength*.55,.13,busWidth*.42);
 antennaGeo.translate(0,-.32,0);
 const bus=emptyInstance(T,busGeo,new T.MeshStandardMaterial({color:0xaab7c7,metalness:.57,roughness:.35}),max);
 const panel=emptyInstance(T,panelGeo,new T.MeshStandardMaterial({color:0x183b81,metalness:.31,roughness:.42,emissive:0x040c20}),max);
 const antennas=emptyInstance(T,antennaGeo,new T.MeshStandardMaterial({color:0xd1dbe3,metalness:.45,roughness:.28}),max);
 bus.name='Starlink '+variant+' published dimension bus';
 panel.name='Starlink '+variant+' dimension-scaled deployed solar array';
 antennas.name='Starlink '+variant+' illustrative phased-array antennas';
 return {bus,panel,antennas,parts:[bus,panel,antennas],count:0};
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
  scene:null,camera:null,lastPaint:0,sourceError:null,beams:null,variantParts:null,modelBoost:1,
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
    state.camera.projectionMatrix.copy(new T.Matrix4().fromArray(projection));
    state.beams.material.uniforms.u_time.value=now*.001;
    try{state.renderer.resetState();state.renderer.render(state.scene,state.camera);}
    catch(e){if(!state.renderError){state.renderError=true;console.warn('BridgePoint Starlink instanced beam renderer',e);}}
    // Other BridgePoint atmosphere layers can drive repaint; when static use
    // slow re-render rather than running thousands of per-frame JS transforms.
   },
   onRemove(){
    for(const obj of [beams,...v1.parts,...v2.parts]){
     obj.geometry?.dispose?.();obj.material?.dispose?.();
    }
    try{state.renderer?.dispose();}catch(_){}
    state.renderer=null;state.layer=null;state.beams=null;state.variantParts=null;state.scene=null;state.camera=null;
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
  const boost=z<3?6800:z<5?4200:z<8?1250:z<11?170:1;
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
  map.triggerRepaint?.();
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
   const sample=selectStarlinkCatalogV2(doc.records,MAX_BEAMS);
   const now=Date.now();
   const next=sample.map(row=>propagateStarlinkOmmV2(row,now)).filter(Boolean);
   if(next.length<2000)throw Error('Too few fresh catalog objects for a representative global constellation');
   applyPositions(next);
  }catch(e){
   if(!state.enabled)return;
   setStatus('Starlink OMM catalog unavailable; existing EM/RF sources remain accessible',{error:String(e?.message||e)});
  }finally{state.updateBusy=false;}
 }
 function handleStyle(){if(state.enabled){installLayer();state.recompute=true;}}
 function onView(){if(state.enabled&&state.layer){state.recompute=true;map.triggerRepaint?.();}}
 map.on?.('style.load',handleStyle);map.on?.('moveend',onView);map.on?.('zoomend',onView);
 const api={
  map,version:2,
  get state(){return {enabled:state.enabled,beamCount:state.positions.length,
   catalogCount:state.catalog?.record_count||0,orbitSnapshotAt:state.catalog?.fetched_at||null,
   modelVisibilityScale:state.modelBoost,sourceError:state.sourceError,
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
    const next=selectStarlinkCatalogV2(state.catalog.records,MAX_BEAMS)
      .map(row=>propagateStarlinkOmmV2(row,now)).filter(Boolean);
    if(next.length>=2000)applyPositions(next);
   },20000);
   return true;
  },
  disable(){
   state.enabled=false;if(state.orbitTimer){clearInterval(state.orbitTimer);state.orbitTimer=0;}
   removeLayer();setStatus('Global Starlink modeled RF layer OFF');return false;
  },
  refresh(){if(!state.enabled)return;void loadCatalog();},
  destroy(){
   api.disable();state.disposed=true;
   map.off?.('style.load',handleStyle);map.off?.('moveend',onView);map.off?.('zoomend',onView);
   if(window.__BP_EMRF_STARLINK_BEAMS_V2__===api)window.__BP_EMRF_STARLINK_BEAMS_V2__=null;
  }
 };
 window.__BP_EMRF_STARLINK_BEAMS_V2__=api;
 return api;
}
