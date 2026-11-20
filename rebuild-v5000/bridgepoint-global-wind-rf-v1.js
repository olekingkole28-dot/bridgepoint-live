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
 // Warm renderer code alongside the forecast snapshot before the user opens the layer.
 void getThree().catch(()=>{});
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
// Source samples remain attached to their model coordinates globally. At street
// zoom, viewport anchors interpolate the NEAREST grid forecast for illustrative
// flow only; the existing obstacle-aware local renderer supplies the fine detail.
function visibleSamples(map,rows,jet,zoom){
 const candidates=jet?rows.filter(r=>r[4]>=85):rows;
 if(zoom<7||!candidates.length)return candidates;
 const b=map.getBounds?.();
 if(!b||!Number.isFinite(b.getWest?.())||!Number.isFinite(b.getSouth?.()))return candidates;
 let west=b.getWest(),east=b.getEast(),south=b.getSouth(),north=b.getNorth();
 if(east<west)east+=360;
 const dx=clamp(east-west,.002,12),dy=clamp(north-south,.002,12);
 const out=[],nx=jet?5:9,ny=jet?4:7;
 for(let y=0;y<ny;y++)for(let x=0;x<nx;x++){
  const lat=clamp(south+dy*(y+.5)/ny,-85,85);
  const lon=((west+dx*(x+.5)/nx+540)%360)-180;
  let chosen=null,best=Infinity;
  for(const row of candidates){
   const dlon=Math.abs(((lon-row[1]+540)%360)-180)*Math.max(.15,Math.cos(lat*R));
   const distance=(lat-row[0])**2+dlon**2;
   if(distance<best){best=distance;chosen=row;}
  }
  if(chosen)out.push([lat,lon,...chosen.slice(2)]);
 }
 return out;
}
function streamGeometry(T,map,rows,kind,zoom){
 const positions=[],colors=[],progress=[],phase=[],indices=[],strength=[];
 const isJet=kind==='jet',mobile=typeof window!=='undefined'&&window.innerWidth<700;
 const selected=visibleSamples(map,rows,isJet,zoom);
 const budget=mobile?(isJet?105:170):(isJet?170:280);
 const count=Math.min(selected.length,budget);
 const linesPerSample=isJet?(mobile?4:5):mobile?7:10;
 const segments=mobile?16:20;
 const baseWidth=zoom<7?(isJet?85000:110000)*clamp(Math.pow(2,3-zoom),.125,1):clamp(2200*Math.pow(2,8-zoom),3,2200);
 for(let i=0;i<count;i++){
  const row=selected[Math.floor(i*selected.length/count)];
  const [lat,lon,surfaceKmh,surfaceFrom,jetKmh,jetFrom,jetHeight]=row;
  const speed=isJet?jetKmh:surfaceKmh,heading=(isJet?jetFrom:surfaceFrom)+180;
  // Global winds: green / yellow / red by source speed. Elevated jets are
  // cyan / blue / violet, bright enough to see through translucent wisps.
  const color=isJet?[1,.035,.025]:windColor(speed);
  const travel=clamp(1.9*Math.pow(2,7-zoom)*(.82+speed/(isJet?240:125)),.0014,isJet?34:28);
  for(let lane=0;lane<linesPerSample;lane++){
   const shift=(lane-(linesPerSample-1)/2)/Math.max(1,linesPerSample-1);
   const lateral=(zoom<7?(isJet?2.3:2.8):Math.min(.3,travel*.45))*shift;
   const idx=positions.length/3;
   let valid=true;
   const linePoints=[];
   for(let k=0;k<=segments;k++){
    const t=k/segments;
    const curl=Math.sin(t*8.3+i*1.4+lane*.9)*(.18+.1*t);
    const [p,lambda]=advance(lat+lateral,lon,heading+curl*12,(t-.5)*travel);
    // 250 hPa stays at the model's geopotential height above MSL. 10 m
    // wind follows the available ground elevation; waves are visual only.
    const elev=(!isJet&&typeof map.queryTerrainElevation==='function')
      ?Number(map.queryTerrainElevation([lambda,p],{exaggerated:false}))||0:0;
    const a=isJet?jetHeight:elev+10+6*Math.max(0,Math.sin(t*11+i+lane*.6));
    const v=worldAt(T,map,lambda,p,a);
    if(!v){valid=false;break;}
    const side=advance(p,lambda,heading+90,baseWidth*(isJet?.7:.52)/111200);
    const edge=worldAt(T,map,side[1],side[0],a+(isJet?350:zoom<7?45:12));
    if(!edge){valid=false;break;}
    linePoints.push([v,edge]);
   }
   if(!valid)continue;
   const start=positions.length/3;
   for(let k=0;k<linePoints.length;k++){
    const [c,e]=linePoints[k],t=k/segments;
    for(const v of [c,e]){
     positions.push(v.x,v.y,v.z);colors.push(...color);
     progress.push(t);phase.push(lane*.43+i*.17);strength.push(isJet?clamp(jetKmh/220,.35,1.6):clamp(surfaceKmh/65,.25,1.6));
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
  uniforms:{uTime:{value:0},uOpacity:{value:jet?.48:.58}},
  vertexShader:`attribute vec3 color;
  attribute float aProgress,aPhase,aStrength;
  varying vec3 vColor;varying float vProg,vPhase,vStrength;
  void main(){vColor=color;vProg=aProgress;vPhase=aPhase;vStrength=aStrength;
   gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
  fragmentShader:`uniform float uTime,uOpacity;
  varying vec3 vColor;varying float vProg,vPhase,vStrength;
  void main(){
    float current=fract(vProg*5.8-uTime*(0.23+0.18*vStrength)+vPhase);
    float wisp=pow(max(0.0,1.0-abs(current*2.0-1.0)),2.0);
    float shimmer=.65+.35*sin(vProg*29.0+vPhase*17.0-uTime*(1.8+vStrength));
    float edge=smoothstep(0.0,.09,vProg)*(1.0-smoothstep(.88,1.0,vProg));
    float alpha=uOpacity*edge*(.18+.82*wisp)*shimmer;
    gl_FragColor=vec4(vColor,alpha);
  }`,
  vertexColors:true,transparent:true,depthTest:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1,side:T.DoubleSide,blending:T.NormalBlending
 });
}
export function initBridgePointGlobalWindRfV1(target){
 const map=target?.map||target;
 if(!map?.addLayer||!map.getStyle)return null;
 const previous=window.__BP_WIND_RF_GLOBAL_V1__;
 if(previous?.map===map)return previous;
 const st={map,enabled:false,windOn:true,rfOn:true,rfMode:'both',disposed:false,data:null,THREE:null,scene:null,renderer:null,camera:null,
  layer:null,windMesh:null,jetMesh:null,rf4:null,rf5:null,rfDots4:null,rfDots5:null,towers:null,jetPins:null,orbitRAF:0,projection:null,
  zoomAt:-1,dirty:true,jetMarkers:[],jetMarkerNodes:[],iconRoot:null,details:null,sourceError:null,modelAt:null};
 function cleanLayer(){try{if(map.getLayer?.(LAYER))map.removeLayer(LAYER);}catch(_){}st.iconRoot?.remove();st.iconRoot=null;st.jetMarkerNodes=[];}
 function ensureJetIconRoot(){
  if(st.iconRoot?.isConnected)return st.iconRoot;
  const container=map.getContainer?.();if(!container)return null;
  if(getComputedStyle(container).position==='static')container.style.position='relative';
  const root=document.createElement('div');root.setAttribute('aria-label','Jet stream forecast markers');
  root.style.cssText='position:absolute;inset:0;z-index:30;pointer-events:none;overflow:hidden';
  container.appendChild(root);st.iconRoot=root;return root;
 }
 function jetIconButton(row){
  const root=ensureJetIconRoot();if(!root)return null;
  const b=document.createElement('button');b.type='button';
  b.setAttribute('aria-label','Jet stream '+Math.round(row[4])+' km/h at '+row[0].toFixed(1)+' degrees latitude, '+row[1].toFixed(1)+' degrees longitude. Tap for details.');
  b.title='Jet stream · '+Math.round(row[4])+' km/h · tap for details';
  b.style.cssText='position:absolute;left:0;top:0;transform:translate(-50%,-50%);display:flex;align-items:center;justify-content:center;width:30px;height:24px;padding:2px;border:1px solid #ffb0a5;border-radius:8px;background:rgba(67,8,8,.94);box-shadow:0 0 10px #ff2d1d,0 0 22px #ff382966;color:#fff;pointer-events:auto;touch-action:manipulation;cursor:pointer';
  b.innerHTML='<svg viewBox="0 0 32 20" width="24" height="16" aria-hidden="true"><path d="M2 5h18l-4-3m4 3-4 3M1 10h25l-4-3m4 3-4 3M4 15h17l-4-3m4 3-4 3" fill="none" stroke="#ff4a39" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><path d="m26 7 4 3-4 3" fill="none" stroke="#fff4ef" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();showJet(row)});
  root.appendChild(b);return b;
 }
 function drawJetIcons(){
  const root=ensureJetIconRoot(),canvas=map.getCanvas?.();if(!root||!canvas||!st.projection)return;
  const w=canvas.clientWidth,h=canvas.clientHeight,zoom=Number(map.getZoom?.()||0),visible=st.enabled&&st.windOn&&zoom<=18;
  if(st.jetMarkerNodes.length!==st.jetMarkers.length){root.replaceChildren();st.jetMarkerNodes=st.jetMarkers.map(x=>jetIconButton(x.row));}
  for(let i=0;i<st.jetMarkers.length;i++){
   const button=st.jetMarkerNodes[i],obj=st.jetMarkers[i];if(!button)continue;
   const p=obj.point.clone().applyMatrix4(st.projection);
   const x=(p.x*.5+.5)*w,y=(.5-p.y*.5)*h;
   const on=visible&&p.z>=-1&&p.z<=1&&p.w>0&&x>=-18&&x<=w+18&&y>=-18&&y<=h+18;
   button.hidden=!on;if(on)button.style.transform='translate('+x+'px,'+y+'px) translate(-50%,-50%)';
  }
 }
 function status(msg){try{document.dispatchEvent(new CustomEvent('bp:wind-rf-global-status',{detail:{active:st.enabled,message:msg,winds:st.data?.winds?.length||0,sites:st.data?.sites?.length||0,sourceAt:st.data?.fetched_at||null,error:st.sourceError}}));}catch(_){}}
 function towerMatrix(T,site,offset,scale){
  const [lon,lat,height]=site;
  const m=map.transform?.getMatrixForModel?.([lon,lat],0);
  if(!m)return null;
  const ground=Number(map.queryTerrainElevation?.([lon,lat],{exaggerated:false}))||0;
  return new T.Matrix4().fromArray(m).multiply(new T.Matrix4().makeTranslation(0,ground+offset,0)).multiply(new T.Matrix4().makeScale(...scale));
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
  wind.visible=st.windOn&&zoom<=18;
  jet.visible=st.windOn&&zoom<=18;
  // ALWAYS use nominal physical planning radii: never inflate kilometre
  // envelopes into continent-scale spheres. Tiny screen-space dots keep
  // registered FCC structures discoverable at full-Earth zoom.
  const boost=1;
  let n=0;
  const dotPositions=[];
  const max=Math.min(st.data.sites.length,st.rf4.instanceMatrix.count);
  for(let i=0;i<max;i++){
   const item=st.data.sites[i];
   const mk4=towerMatrix(T,item,450,[900*boost,450*boost,900*boost]);
   const mk5=towerMatrix(T,item,225,[450*boost,225*boost,450*boost]);
   const h=clamp(Number(item[2])||38,7,340);
   const mast=towerMatrix(T,item,h*.5,[1,h,1]);
   if(!mk4||!mk5||!mast)continue;
   st.rf4.setMatrixAt(n,mk4);st.rf5.setMatrixAt(n,mk5);st.towers.setMatrixAt(n,mast);
   const pt=worldAt(T,map,item[0],item[1],(Number(map.queryTerrainElevation?.([item[0],item[1]],{exaggerated:false}))||0)+h);
   if(pt)dotPositions.push(pt.x,pt.y,pt.z);
   n++;
  }
  for(const mesh of [st.rf4,st.rf5,st.towers]){mesh.count=n;mesh.instanceMatrix.needsUpdate=true;}
  for(const dots of [st.rfDots4,st.rfDots5]){
   dots.geometry.dispose();dots.geometry=new T.BufferGeometry();
   dots.geometry.setAttribute('position',new T.Float32BufferAttribute(dotPositions,3));
  }
  st.rf4.visible=st.rfOn&&(st.rfMode==='4G'||st.rfMode==='both')&&zoom<11;
  st.rf5.visible=st.rfOn&&(st.rfMode==='5G'||st.rfMode==='both')&&zoom<11;
  st.towers.visible=st.rfOn&&zoom>=7&&zoom<13;
  st.rfDots4.visible=st.rfOn&&(st.rfMode==='4G'||st.rfMode==='both')&&zoom<7;
  st.rfDots5.visible=st.rfOn&&(st.rfMode==='5G'||st.rfMode==='both')&&zoom<7;
  st.jetMarkers=st.data.winds.filter(row=>row[4]>=115&&row[6]>5000)
   .sort((a,b)=>b[4]-a[4]).slice(0,25).map(row=>({row,point:worldAt(T,map,row[1],row[0],row[6])})).filter(x=>x.point);
  const size=zoom<3?45000:zoom<6?15000:zoom<9?3400:850;
  let icons=0;
  for(const item of st.jetMarkers){
   const row=item.row,m=map.transform?.getMatrixForModel?.([row[1],row[0]],0);
   if(!m)continue;
   st.jetPins.setMatrixAt(icons++,new T.Matrix4().fromArray(m)
    .multiply(new T.Matrix4().makeTranslation(0,row[6]+Math.min(800,size*.12),0))
    .multiply(new T.Matrix4().makeScale(size,size,size)));
  }
  st.jetPins.count=icons;st.jetPins.instanceMatrix.needsUpdate=true;
  st.jetPins.visible=false; // UI jet markers are drawn at the projected 250 hPa coordinates.
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
  const rfDots4=new T.Points(new T.BufferGeometry(),new T.PointsMaterial({color:0x3de3ed,size:5,sizeAttenuation:false,transparent:true,opacity:.78,depthTest:true,depthWrite:false}));
  const rfDots5=new T.Points(new T.BufferGeometry(),new T.PointsMaterial({color:0xd482ff,size:3,sizeAttenuation:false,transparent:true,opacity:.95,depthTest:true,depthWrite:false}));
  rfDots4.frustumCulled=rfDots5.frustumCulled=false;
  const jetPins=new T.InstancedMesh(new T.OctahedronGeometry(1,0),new T.MeshBasicMaterial({color:0xffba5a,transparent:true,opacity:.88,depthTest:true}),30);
  jetPins.count=0;jetPins.frustumCulled=false;jetPins.name='Click for jet-stream aviation hazard information';
  scene.add(new T.AmbientLight(0xffffff,1.5),rf4,rf5,rfDots4,rfDots5,towers,jetPins);
  const layer={id:LAYER,type:'custom',renderingMode:'3d',
   onAdd(m,gl){
    st.scene=scene;st.camera=camera;st.rf4=rf4;st.rf5=rf5;st.rfDots4=rfDots4;st.rfDots5=rfDots5;st.towers=towers;st.jetPins=jetPins;st.layer=layer;
    st.renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,alpha:true,antialias:false,powerPreference:'low-power'});
    st.renderer.autoClear=false;st.dirty=true;
   },
   render(gl,args){
    if(!st.enabled||!st.renderer)return;
    const raw=args?.defaultProjectionData?.mainMatrix||args?.modelViewProjectionMatrix;
    if(!raw||raw.length<16)return;
    st.projection=new T.Matrix4().fromArray(raw);
    if(st.dirty)rebuild();
    drawJetIcons();
    camera.projectionMatrix.copy(st.projection);
    const secs=performance.now()*.001;
    if(st.windMesh)st.windMesh.material.uniforms.uTime.value=secs;
    if(st.jetMesh)st.jetMesh.material.uniforms.uTime.value=secs;
    try{st.renderer.resetState();st.renderer.render(scene,camera);}
    catch(e){if(!st.warned){st.warned=true;console.warn('BridgePoint global wind renderer',e);}}
   },
   onRemove(){
    for(const obj of [st.windMesh,st.jetMesh,rf4,rf5,rfDots4,rfDots5,towers,jetPins]){
     obj?.geometry?.dispose?.();obj?.material?.dispose?.();
    }
    try{st.renderer?.dispose();}catch(_){}
    st.renderer=null;st.layer=null;st.scene=null;st.camera=null;st.windMesh=null;st.jetMesh=null;st.jetPins=null;st.rfDots4=null;st.rfDots5=null;
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
    const T=await getThree();
    if(st.enabled&&!st.disposed)addLayer();
    const data=await prefetchWindRfGlobalV1();
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
