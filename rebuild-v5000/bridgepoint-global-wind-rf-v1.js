/* BridgePoint Wind + RF / Jet Streams source-anchored global renderer v1.
 * Field colors are wind SPEED from cached Open-Meteo forecasts, not measured
 * CFD. Geopotential height of the 250-hPa forecast level anchors each jet.
 * FCC ASR registrations are towers, not confirmed active 4G/5G transmitters.
 * Coverage bubbles are distance-planning illustrations, not measured RSSI.
 */
const DATA='/wind-rf-global-v1.json',THREE_URL='/vendor/three.module.js?v=169-local';
const LAYER='bp-wind-rf-global-jetstream-v1',R=Math.PI/180;
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
let dataPromise=null,threePromise=null;
export function prefetchWindRfGlobalV1(){
 if(!dataPromise)dataPromise=fetch(DATA,{cache:'default',headers:{Accept:'application/json'}})
  .then(async r=>{if(!r.ok)throw Error('Wind/RF cache HTTP '+r.status);return r.json()})
  .then(d=>{if(d.version!==1||!Array.isArray(d.winds)||d.winds.length<100||!Array.isArray(d.sites)||d.sites.length<60)throw Error('Wind/RF first-party source snapshot incomplete');
   return d;
  }).catch(e=>{dataPromise=null;throw e});
 return dataPromise;
}
function getThree(){if(!threePromise)threePromise=import(THREE_URL).then(m=>m.default||m).catch(e=>{threePromise=null;throw e});return threePromise;}
function worldAt(T,map,lon,lat,height=0){
 try{
  const src=map.transform?.getMatrixForModel?.([lon,lat],0);
  if(!src)return null;
  return new T.Vector3(0,height,0).applyMatrix4(new T.Matrix4().fromArray(src));
 }catch(_){return null;}
}
function advance(lat,lon,bearing,degrees){
 const dist=degrees*R,p=lat*R,l=lon*R,b=bearing*R;
 const p2=Math.asin(clamp(Math.sin(p)*Math.cos(dist)+Math.cos(p)*Math.sin(dist)*Math.cos(b),-1,1));
 const l2=l+Math.atan2(Math.sin(b)*Math.sin(dist)*Math.cos(p),Math.cos(dist)-Math.sin(p)*Math.sin(p2));
 return [p2/R,((l2/R+540)%360)-180];
}
function windColor(kmh){
 return kmh>=62?[1,.22,.13]:kmh>=32?[1,.84,.23]:[.25,1,.55];
}
// Ribbons are translucent 3D strips with volumetric-looking moving veils;
// no fake world coordinates or particle points are generated.
function streamGeometry(T,map,rows,kind,zoom){
 const positions=[],colors=[],progress=[],phase=[],indices=[],strength=[];
 const isJet=kind==='jet',mobile=typeof window!=='undefined'&&window.innerWidth<700;
 const selected=isJet?rows.filter(r=>r[4]>=95):rows;
 const budget=mobile?(isJet?85:120):(isJet?140:120);
 const count=Math.min(selected.length,budget);
 const linesPerSample=isJet?2:mobile?4:7;
 const segments=isJet?12:13;
 const baseWidth=(isJet?21000:34000)*clamp(Math.pow(2,3-zoom),.5,3);
 for(let i=0;i<count;i++){
  const row=selected[Math.floor(i*selected.length/count)];
  const [lat,lon,surfaceKmh,surfaceFrom,jetKmh,jetFrom,jetHeight]=row;
  const speed=isJet?jetKmh:surfaceKmh,heading=(isJet?jetFrom:surfaceFrom)+180;
  const color=isJet?[.12,.26,.35]:windColor(speed);
  const travel=isJet?clamp(5.8+jetKmh/60,6,13):clamp(4.6+surfaceKmh/24,5,9.5);
  for(let lane=0;lane<linesPerSample;lane++){
   const shift=(lane-(linesPerSample-1)/2)/Math.max(1,linesPerSample);
   const laneWidth=baseWidth*(isJet?.95:.62);
   const offsetX=shift*(isJet?.8:1.4);
   const idx=positions.length/3;
   let valid=true;
   const linePoints=[];
   for(let k=0;k<=segments;k++){
    const t=k/segments;
    const swirl=Math.sin(t*8+i*1.1+lane*.7)*(.18+.14*t);
    const traveled=(t-.5)*travel+offsetX*.3;
    const [p,lambda]=advance(lat+offsetX*.55,lon,heading+swirl*22,traveled);
    const a=isJet?jetHeight:Math.max(28,140+85*Math.sin(t*12+i+lane));
    const v=worldAt(T,map,lambda,p,a);
    if(!v){valid=false;break;}
    // The ribbons have a lateral thickness and a gentle vertical turn.
    const side=advance(p,lambda,heading+90,Math.max(.002,laneWidth/111200));
    const edge=worldAt(T,map,side[1],side[0],a+(isJet?1300:520));
    if(!edge){valid=false;break;}
    linePoints.push([v,edge]);
   }
   if(!valid)continue;
   const start=positions.length/3;
   for(let k=0;k<linePoints.length;k++){
    const [c,e]=linePoints[k],t=k/segments;
    for(const v of [c,e]){
     positions.push(v.x,v.y,v.z);colors.push(...color);
     progress.push(t);phase.push(lane*.39+i*.11);strength.push(isJet?clamp(jetKmh/230,.4,1.4):clamp(surfaceKmh/70,.25,1.4));
    }
   }
   for(let k=0;k<segments;k++){const b=start+k*2;indices.push(b,b+1,b+2,b+2,b+1,b+3);}
  }
 }
 const geo=new T.BufferGeometry();
 geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 geo.setAttribute('color',new T.Float32BufferAttribute(colors,3));
 geo.setAttribute('aProgress',new T.Float32BufferAttribute(progress,1));
 geo.setAttribute('aPhase',new T.Float32BufferAttribute(phase,1));
 geo.setAttribute('aStrength',new T.Float32BufferAttribute(strength,1));
 geo.setIndex(indices);
 return geo;
}
function ribbonMaterial(T,jet){
 return new T.ShaderMaterial({
  uniforms:{uTime:{value:0},uOpacity:{value:jet?.19:.24}},
  vertexShader:`attribute float aProgress,aPhase,aStrength;
  varying vec3 vColor;varying float vProg,vPhase,vStrength;
  void main(){vColor=color;vProg=aProgress;vPhase=aPhase;vStrength=aStrength;
   gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform float uTime,uOpacity;
  varying vec3 vColor;varying float vProg,vPhase,vStrength;
  void main(){
    float current=fract(vProg*3.5-uTime*(0.29+0.17*vStrength)+vPhase);
    float wisp=pow(max(0.0,1.0-abs(current*2.0-1.0)),3.0);
    float vein=.24+.76*wisp;
    float edge=smoothstep(0.0,.13,vProg)*(1.0-smoothstep(.84,1.0,vProg));
    float alpha=uOpacity*edge*vein;
    gl_FragColor=vec4(vColor,alpha);
  }`,
  vertexColors:true,transparent:true,depthTest:true,depthWrite:false,side:T.DoubleSide,blending:T.NormalBlending
 });
}
export function initBridgePointGlobalWindRfV1(target){
 const map=target?.map||target;
 if(!map?.addLayer||!map.getStyle)return null;
 const previous=window.__BP_WIND_RF_GLOBAL_V1__;
 if(previous?.map===map)return previous;
 const st={map,enabled:false,windOn:true,rfOn:true,rfMode:'both',disposed:false,data:null,THREE:null,scene:null,renderer:null,camera:null,
  layer:null,windMesh:null,jetMesh:null,rf4:null,rf5:null,towers:null,jetPins:null,orbitRAF:0,projection:null,
  zoomAt:-1,dirty:true,jetMarkers:[],details:null,sourceError:null,modelAt:null};
 function cleanLayer(){try{if(map.getLayer?.(LAYER))map.removeLayer(LAYER);}catch(_){}}
 function status(msg){try{document.dispatchEvent(new CustomEvent('bp:wind-rf-global-status',{detail:{active:st.enabled,message:msg,winds:st.data?.winds?.length||0,sites:st.data?.sites?.length||0,sourceAt:st.data?.fetched_at||null,error:st.sourceError}}));}catch(_){}}
 function towerMatrix(T,site,offset,scale){
  const [lon,lat,height]=site;
  const m=map.transform?.getMatrixForModel?.([lon,lat],0);
  if(!m)return null;
  return new T.Matrix4().fromArray(m).multiply(new T.Matrix4().makeTranslation(0,offset,0)).multiply(new T.Matrix4().makeScale(...scale));
 }
 function rebuild(){
  if(!st.enabled||!st.THREE||!st.data||!st.layer)return;
  const T=st.THREE,zoom=Number(map.getZoom?.()||0);
  if(st.windMesh){st.windMesh.geometry.dispose();st.scene.remove(st.windMesh);}
  if(st.jetMesh){st.jetMesh.geometry.dispose();st.scene.remove(st.jetMesh);}
  const wind=new T.Mesh(streamGeometry(T,map,st.data.winds,'wind',zoom),ribbonMaterial(T,false));
  wind.frustumCulled=false;wind.name='Global moving colored 10m forecast wind veils';
  const jet=new T.Mesh(streamGeometry(T,map,st.data.winds,'jet',zoom),ribbonMaterial(T,true));
  jet.frustumCulled=false;jet.name='Pressure-height matched moving jet-stream ribbons';
  st.windMesh=wind;st.jetMesh=jet;st.scene.add(wind,jet);
  wind.visible=jet.visible=st.windOn&&zoom<8;
  // Real FCC ASR positions. Nominal planning radii are visually inflated ONLY
  // at world scale, so a 900 m radius can be seen on a phone-size globe.
  const boost=zoom<4?Math.pow(2,5-zoom)*42:zoom<8?Math.pow(2,8-zoom)*2:1;
  let n=0;
  const max=Math.min(st.data.sites.length,st.rf4.instanceMatrix.count);
  for(let i=0;i<max;i++){
   const item=st.data.sites[i];
   const mk4=towerMatrix(T,item,450,[900*boost,450*boost,900*boost]);
   const mk5=towerMatrix(T,item,225,[450*boost,225*boost,450*boost]);
   const h=clamp(Number(item[2])||38,7,340);
   const mast=towerMatrix(T,item,h*.5,[1,h,1]);
   if(!mk4||!mk5||!mast)continue;
   st.rf4.setMatrixAt(n,mk4);st.rf5.setMatrixAt(n,mk5);st.towers.setMatrixAt(n,mast);
   n++;
  }
  for(const mesh of [st.rf4,st.rf5,st.towers]){mesh.count=n;mesh.instanceMatrix.needsUpdate=true;}
  st.rf4.visible=st.rfOn&&(st.rfMode==='4G'||st.rfMode==='both')&&zoom<11;
  st.rf5.visible=st.rfOn&&(st.rfMode==='5G'||st.rfMode==='both')&&zoom<11;
  st.towers.visible=st.rfOn&&zoom>=7&&zoom<13;
  st.jetMarkers=st.data.winds.filter(row=>row[4]>=115&&row[6]>5000)
   .sort((a,b)=>b[4]-a[4]).slice(0,25).map(row=>({row,point:worldAt(T,map,row[1],row[0],row[6])})).filter(x=>x.point);
  const size=zoom<3?165000:zoom<6?55000:zoom<9?7500:800;
  let icons=0;
  for(const item of st.jetMarkers){
   const row=item.row,m=map.transform?.getMatrixForModel?.([row[1],row[0]],0);
   if(!m)continue;
   st.jetPins.setMatrixAt(icons++,new T.Matrix4().fromArray(m)
    .multiply(new T.Matrix4().makeTranslation(0,row[6]+size*.45,0))
    .multiply(new T.Matrix4().makeScale(size,size,size)));
  }
  st.jetPins.count=icons;st.jetPins.instanceMatrix.needsUpdate=true;
  st.jetPins.visible=st.windOn&&zoom<9;
  st.zoomAt=zoom;st.dirty=false;map.triggerRepaint?.();
 }
 function showJet(row){
  st.details?.remove();
  const el=document.createElement('aside');st.details=el;el.className='bp-wind-jet-card-v1';
  el.style.cssText='position:absolute;z-index:45;right:70px;top:70px;width:min(315px,70vw);padding:12px;border:1px solid #6ebad1;border-radius:12px;background:rgba(4,19,32,.97);color:#eaf8ff;font:12px/1.5 system-ui,sans-serif;box-shadow:0 15px 30px #0009;pointer-events:auto';
  const title=document.createElement('b');title.textContent='JET STREAM · 250 hPa MODEL';title.style.cssText='font-size:14px;letter-spacing:.03em';
  const close=document.createElement('button');close.type='button';close.textContent='×';close.setAttribute('aria-label','Close jet stream information');close.style.cssText='float:right;font-size:22px;color:white;background:none;border:0';close.onclick=()=>el.remove();
  const body=document.createElement('div');body.style.marginTop='8px';
  const values=[['Forecast location',row[0].toFixed(1)+'°, '+row[1].toFixed(1)+'°'],
   ['250 hPa wind',Math.round(row[4])+' km/h ('+Math.round(row[4]*.621371)+' mph)'],
   ['Direction from',Math.round(row[5])+'°'],
   ['Model geopotential height',Math.round(row[6]).toLocaleString()+' m above mean sea level'],
   ['Forecast source','Open-Meteo global weather forecast · cached '+new Date(st.data.fetched_at).toUTCString()],
   ['Possible hazards','Strong upper-level winds, aviation turbulence near jet boundaries, rapid weather-system movement, and wind shear. This visualization is not an aviation warning, forecast of turbulence at this exact point, or flight-planning information.']];
  values.forEach(([label,value])=>{const p=document.createElement('p');p.style.cssText='margin:6px 0;border-top:1px solid #ffffff22;padding-top:4px';const strong=document.createElement('strong');strong.textContent=label+': ';p.append(strong,document.createTextNode(value));body.append(p);});
  el.append(title,close,body);map.getContainer().appendChild(el);
 }
 function clickJet(e){
  if(!st.enabled||!st.projection||!e?.point)return;
  const T=st.THREE,canvas=map.getCanvas?.(),w=canvas?.clientWidth||0,h=canvas?.clientHeight||0;
  if(!w||!h)return;
  let best=null,dist=28*28;
  for(const obj of st.jetMarkers){
   const screen=obj.point.clone().applyMatrix4(st.projection);
   if(screen.z< -1||screen.z>1)continue;
   const dx=(screen.x*.5+.5)*w-e.point.x,dy=(.5-screen.y*.5)*h-e.point.y,d=dx*dx+dy*dy;
   if(d<dist){best=obj;dist=d;}
  }
  if(best)showJet(best.row);
 }
 function addLayer(){
  if(!st.enabled||!st.THREE||!map.getStyle?.()||map.getLayer?.(LAYER))return;
  const T=st.THREE,scene=new T.Scene(),camera=new T.Camera();
  const sites=st.data?.sites?.length||0;
  const make=(geo,mat)=>{const m=new T.InstancedMesh(geo,mat,Math.max(1,sites));m.count=0;m.frustumCulled=false;m.instanceMatrix.setUsage(T.DynamicDrawUsage);return m;};
  const rf4=make(new T.SphereGeometry(1,10,7),new T.MeshBasicMaterial({color:0x3de3ed,transparent:true,opacity:.16,wireframe:true,depthTest:true,depthWrite:false}));
  const rf5=make(new T.SphereGeometry(1,10,7),new T.MeshBasicMaterial({color:0xd482ff,transparent:true,opacity:.21,wireframe:true,depthTest:true,depthWrite:false}));
  const towers=make(new T.CylinderGeometry(.18,.44,1,7),new T.MeshStandardMaterial({color:0xb3bfcb,metalness:.5,roughness:.5}));
  const jetPins=new T.InstancedMesh(new T.OctahedronGeometry(1,0),new T.MeshBasicMaterial({color:0xffba5a,transparent:true,opacity:.88,depthTest:true}),30);
  jetPins.count=0;jetPins.frustumCulled=false;jetPins.name='Click for jet-stream aviation hazard information';
  scene.add(new T.AmbientLight(0xffffff,1.5),rf4,rf5,towers,jetPins);
  const layer={id:LAYER,type:'custom',renderingMode:'3d',
   onAdd(m,gl){
    st.scene=scene;st.camera=camera;st.rf4=rf4;st.rf5=rf5;st.towers=towers;st.jetPins=jetPins;st.layer=layer;
    st.renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,alpha:true,antialias:false,powerPreference:'low-power'});
    st.renderer.autoClear=false;st.dirty=true;
   },
   render(gl,args){
    if(!st.enabled||!st.renderer)return;
    const raw=args?.defaultProjectionData?.mainMatrix||args?.modelViewProjectionMatrix;
    if(!raw||raw.length<16)return;
    st.projection=new T.Matrix4().fromArray(raw);
    if(st.dirty)rebuild();
    camera.projectionMatrix.copy(st.projection);
    const secs=performance.now()*.001;
    if(st.windMesh)st.windMesh.material.uniforms.uTime.value=secs;
    if(st.jetMesh)st.jetMesh.material.uniforms.uTime.value=secs;
    try{st.renderer.resetState();st.renderer.render(scene,camera);}
    catch(e){if(!st.warned){st.warned=true;console.warn('BridgePoint global wind renderer',e);}}
   },
   onRemove(){
    for(const obj of [st.windMesh,st.jetMesh,rf4,rf5,towers,jetPins]){
     obj?.geometry?.dispose?.();obj?.material?.dispose?.();
    }
    try{st.renderer?.dispose();}catch(_){}
    st.renderer=null;st.layer=null;st.scene=null;st.camera=null;st.windMesh=null;st.jetMesh=null;st.jetPins=null;
   }
  };
  try{map.addLayer(layer);}catch(e){st.sourceError=String(e.message||e);status('Global wind style not ready; retrying');}
 }
 function animate(){
  if(st.orbitRAF||!st.enabled||document.hidden)return;
  let previous=0;
  const frame=t=>{
   st.orbitRAF=0;
   if(!st.enabled||document.hidden)return;
   if(t-previous>41){previous=t;map.triggerRepaint?.();}
   st.orbitRAF=requestAnimationFrame(frame);
  };
  st.orbitRAF=requestAnimationFrame(frame);
 }
 function onStyle(){if(st.enabled){st.dirty=true;addLayer();}}
 function onMove(){if(st.enabled){st.dirty=true;map.triggerRepaint?.();}}
 const api={version:1,map,
  get state(){return{enabled:st.enabled,windOn:st.windOn,rfOn:st.rfOn,rfMode:st.rfMode,gridSamples:st.data?.winds?.length||0,registeredStructures:st.data?.sites?.length||0,sourceAt:st.data?.fetched_at||null,jetMarkers:st.jetMarkers.length,error:st.sourceError}},
  async enable(){
   if(st.disposed)return false;
   st.enabled=true;
   if(st.data&&st.THREE){addLayer();st.dirty=true;animate();map.triggerRepaint?.();return true;}
   try{
    const [T,data]=await Promise.all([getThree(),prefetchWindRfGlobalV1()]);
    if(!st.enabled||st.disposed)return false;
    st.THREE=T;st.data=data;st.sourceError=null;
    addLayer();st.dirty=true;animate();
    status('Global colored wind veils, pressure-height jet streams and both modeled 4G/5G source tower envelopes ON');
   }catch(e){st.sourceError=String(e.message||e);status('Wind/RF global forecast cache unavailable; local source-backed layers remain independent');}
   return st.enabled;
  },
  setWind(enabled){st.windOn=!!enabled;st.dirty=true;map.triggerRepaint?.();},
  setRf(enabled,mode='both'){st.rfOn=!!enabled;st.rfMode=mode;st.dirty=true;map.triggerRepaint?.();},
  disable(){
   st.enabled=false;st.details?.remove();st.details=null;
   if(st.orbitRAF)cancelAnimationFrame(st.orbitRAF);st.orbitRAF=0;
   cleanLayer();status('Global wind, jet and RF source-backed overview OFF');return false;
  },
  refresh(){if(st.enabled){st.dirty=true;map.triggerRepaint?.();}},
  destroy(){api.disable();st.disposed=true;map.off?.('style.load',onStyle);map.off?.('moveend',onMove);map.off?.('zoomend',onMove);map.off?.('click',clickJet);if(window.__BP_WIND_RF_GLOBAL_V1__===api)window.__BP_WIND_RF_GLOBAL_V1__=null;}
 };
 map.on?.('style.load',onStyle);map.on?.('moveend',onMove);map.on?.('zoomend',onMove);map.on?.('click',clickJet);
 window.__BP_WIND_RF_GLOBAL_V1__=api;return api;
}
