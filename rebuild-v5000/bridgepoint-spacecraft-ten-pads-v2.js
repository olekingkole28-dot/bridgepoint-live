/* BridgePoint Spacecraft: ten additional launch-pad scenes.
 * Rocket heights in metres come from published vehicle specifications.
 * Pad coordinates are approximate. Launch towers, platforms and surface details
 * are original, dimension-based BridgePoint visualizations, NOT 3D scans or CAD.
 * No third-party model viewers, redirects, or non-spacecraft UI modifications.
 */
const THREE_URL='/vendor/three.module.js?v=169-local';
const TOGGLE_ID='bp-spacecraft-toggle-v1';
const LAYER_ID='bp-spacecraft-ten-launch-pads-native-v2';
const MARKER_CLASS='bp-spacecraft-ten-pad-marker-v2';
const STYLE_ID='bp-spacecraft-ten-pads-style-v2';
export const SPACECRAFT_TEN_LAUNCH_PADS=Object.freeze([
 {id:'ccsfs-slc40-falcon9',name:'Falcon 9 + SLC-40',rocket:'SpaceX Falcon 9',pad:'Space Launch Complex 40',location:'Cape Canaveral Space Force Station, Florida, USA',coordinates:[-80.5772,28.5620],rocketHeightM:70,rocketRadiusM:1.83,towerHeightM:83,padWidthM:60,boosters:0,color:0xf2eee6,accent:0x2e3439,tower:'strongback',source:'https://spaceportdb.com/pads/space-launch-complex-40/',vehicleSource:'https://www.spacex.com/vehicles/falcon-9/'},
 {id:'vandenberg-slc4e-falcon9',name:'Falcon 9 + SLC-4E',rocket:'SpaceX Falcon 9',pad:'Space Launch Complex 4 East',location:'Vandenberg Space Force Base, California, USA',coordinates:[-120.6107,34.6320],rocketHeightM:70,rocketRadiusM:1.83,towerHeightM:81,padWidthM:58,boosters:0,color:0xeae8e0,accent:0x34363c,tower:'strongback',source:'https://spaceportdb.com/pads/space-launch-complex-4e/',vehicleSource:'https://www.spacex.com/vehicles/falcon-9/'},
 {id:'starbase-pad2-starship',name:'Starship + Pad 2 Mechazilla',rocket:'SpaceX Starship / Super Heavy V3',pad:'Orbital Launch Pad 2 (Mount B)',location:'Starbase, Boca Chica, Texas, USA',coordinates:[-97.1580,25.9968],rocketHeightM:124.4,rocketRadiusM:4.5,towerHeightM:151,padWidthM:100,boosters:0,color:0xadb7bd,accent:0x212a31,tower:'catch',source:'https://spaceportdb.com/pads/orbital-launch-pad-2/',vehicleSource:'https://new.spacex.com/vehicles/starship'},
 {id:'ela4-ariane64',name:'Ariane 64 + ELA-4',rocket:'Ariane 6 (four-booster configuration)',pad:'Ensemble de Lancement Ariane 4 (ELA-4)',location:'Guiana Space Centre, Kourou, French Guiana, France',coordinates:[-52.786838,5.256319],rocketHeightM:62,rocketRadiusM:2.7,towerHeightM:87,padWidthM:75,boosters:4,color:0xf8f2dc,accent:0x345b82,tower:'service',source:'https://www.esa.int/ESA_Enabling_Support/Space_Transportation/Ariane/Ariane_6',vehicleSource:'https://www.esa.int/missions/about-us/directorates/space-transportation/ariane/ariane-6'},
 {id:'baikonur-31-soyuz2',name:'Soyuz-2 + Site 31/6',rocket:'Soyuz-2.1a launch configuration',pad:'Baikonur Site 31/6',location:'Baikonur Cosmodrome, Kazakhstan',coordinates:[63.5640,45.9960],rocketHeightM:46.3,rocketRadiusM:1.48,towerHeightM:60,padWidthM:54,boosters:4,color:0xe2ece1,accent:0x668b60,tower:'service',source:'https://spaceportdb.com/pads/31-6/',vehicleSource:'https://www.flightatlas.org/rockets/soyuz/soyuz-2-1a'},
 {id:'tanegashima-lp2-h3',name:'H3 + Yoshinobu LP-2',rocket:'JAXA H3 (long-fairing configuration)',pad:'Yoshinobu Launch Complex LP-2',location:'Tanegashima Space Center, Kagoshima, Japan',coordinates:[130.9756,30.4009],rocketHeightM:63,rocketRadiusM:2.6,towerHeightM:88,padWidthM:76,boosters:2,color:0xffffff,accent:0x244b92,tower:'service',source:'https://spaceportdb.com/pads/yoshinobu-launch-complex-lp-2/',vehicleSource:'https://www.mhi.com/business/products-services/space-defense/launch-service/launch-vehicles'},
 {id:'sriharikota-slp-lvm3',name:'LVM3 + Second Launch Pad',rocket:'ISRO Launch Vehicle Mark 3',pad:'Satish Dhawan Second Launch Pad',location:'Sriharikota, Andhra Pradesh, India',coordinates:[80.2304,13.7199],rocketHeightM:43.5,rocketRadiusM:2.0,towerHeightM:72,padWidthM:72,boosters:2,color:0xf2f0e3,accent:0xe08032,tower:'service',source:'https://www.isro.gov.in/ISRO_EN/launchservices.html',vehicleSource:'https://new1.isro.gov.in/GSLVmk3_CON.html'},
 {id:'mahia-lc1a-electron',name:'Electron + Launch Complex 1A',rocket:'Rocket Lab Electron',pad:'Rocket Lab LC-1 Pad A',location:'Māhia Peninsula, New Zealand',coordinates:[177.8645,-39.2628],rocketHeightM:18,rocketRadiusM:0.60,towerHeightM:24,padWidthM:29,boosters:0,color:0x293137,accent:0xc0dfe2,tower:'strongback',source:'https://spaceportdb.com/pads/rocket-lab-launch-complex-1a/',vehicleSource:'https://rocketlabcorp.com/launch/electron/'},
 {id:'wenchang-lc101-longmarch5',name:'Long March 5 + LC-101',rocket:'Long March 5 (CZ-5)',pad:'Wenchang Launch Complex 101',location:'Hainan, China',coordinates:[110.951011,19.614334],rocketHeightM:57,rocketRadiusM:2.5,towerHeightM:91,padWidthM:82,boosters:4,color:0xf5f5f0,accent:0x2774ae,tower:'service',source:'https://spaceportdb.com/',vehicleSource:'https://www.cnsa.gov.cn/english/n6465652/n6465653/c6809587/content.html'},
 {id:'naro-lc2-nuri',name:'Nuri + Naro LC-2',rocket:'KSLV-II Nuri',pad:'Naro Space Center Launch Complex 2',location:'Goheung, South Korea',coordinates:[127.535069,34.431867],rocketHeightM:47.2,rocketRadiusM:1.75,towerHeightM:68,padWidthM:61,boosters:0,color:0xf2f5f6,accent:0x31579f,tower:'service',source:'https://www.kari.re.kr/eng/contents/178',vehicleSource:'https://www.kari.re.kr/eng/contents/178'}
]);
const states=new WeakMap();
let threePromise;
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const mapOf=x=>x&&(x.map||x);
function getThree(){
 if(!threePromise)threePromise=import(THREE_URL).then(m=>{
  if(!m.WebGLRenderer||!m.Group)throw new Error('BridgePoint local 3D engine unavailable');
  return m;
 }).catch(e=>{threePromise=null;throw e;});
 return threePromise;
}
const mat=(T,color,metal=0.1)=>new T.MeshStandardMaterial({color,metalness:metal,roughness:0.61});
function box(T,root,w,h,d,x,y,z,material){
 const mesh=new T.Mesh(new T.BoxGeometry(w,h,d),material);
 mesh.position.set(x,y,z);root.add(mesh);return mesh;
}
function tube(T,root,top,bottom,h,x,y,z,material,segments=22){
 const mesh=new T.Mesh(new T.CylinderGeometry(top,bottom,h,segments),material);
 mesh.position.set(x,y,z);root.add(mesh);return mesh;
}
function brace(T,root,a,b,r,material){
 const delta=new T.Vector3().subVectors(new T.Vector3(...b),new T.Vector3(...a));
 const m=new T.Mesh(new T.CylinderGeometry(r,r,delta.length(),7),material);
 m.position.copy(new T.Vector3(...a)).addScaledVector(delta,0.5);
 m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());root.add(m);return m;
}
export function buildSpacecraftLaunchPadScene(T,site){
 if(!site||!Number.isFinite(site.rocketHeightM)||site.rocketHeightM<=0)throw new Error('Invalid rocket dimensions');
 const root=new T.Group();root.name='BridgePoint original 3D recreation: '+site.name;
 const concrete=mat(T,0x747e86),dark=mat(T,0x26313a,.35),steel=mat(T,0x96a5b0,.57),
       body=mat(T,site.color,.23),accent=mat(T,site.accent,.3),light=mat(T,0xd8e6ed,.18),gold=mat(T,0xd0a65a,.5);
 const W=site.padWidthM,H=site.rocketHeightM,R=site.rocketRadiusM,base=4;
 box(T,root,W,1.6,W,-3,0.8,0,concrete);
 box(T,root,W*0.45,2.1,W*0.42,-2,2.65,0,dark);
 box(T,root,Math.max(7,R*4),0.8,Math.max(7,R*4),0,3.45,0,steel);
 // Ground-side service buildings, railings, pipes, and pad support structure.
 box(T,root,W*0.20,9,W*0.18,-W*0.33,4.9,-W*0.31,dark);
 box(T,root,W*0.17,4,W*0.12,W*0.29,2.0,W*0.31,concrete);
 for(let i=-1;i<=1;i+=2){
  box(T,root,W*0.72,0.20,0.25,-3,2.75,i*W*0.38,steel);
  box(T,root,0.25,0.20,W*0.72,i*W*0.38,2.75,0,steel);
 }
 const coreHeight=H*0.755,secondHeight=H*0.158,noseHeight=H-coreHeight-secondHeight;
 tube(T,root,R,R,coreHeight,0,base+coreHeight/2,0,body,40);
 tube(T,root,R*0.88,R*0.88,secondHeight,0,base+coreHeight+secondHeight/2,0,site.id.includes('starbase')?accent:light,40);
 const nose=new T.Mesh(new T.ConeGeometry(R*0.88,noseHeight,40),body);
 nose.position.set(0,base+H-noseHeight/2,0);root.add(nose);
 for(const ratio of [0.16,0.34,0.62,0.76,0.89]){
  tube(T,root,R+0.04,R+0.04,Math.max(0.15,H*0.004),0,base+H*ratio,0,accent,40);
 }
 // Rocket configurations use the right number of representative strap-on boosters.
 for(let i=0;i<site.boosters;i++){
  const angle=2*Math.PI*i/site.boosters+Math.PI/4;
  const bx=Math.cos(angle)*R*1.85,bz=Math.sin(angle)*R*1.85;
  const br=site.boosters===2?R*0.49:R*0.56;
  const bh=site.id.includes('baikonur')?H*0.60:site.id.includes('sriharikota')?H*0.77:H*0.69;
  tube(T,root,br*0.76,br,bh*0.89,bx,base+bh*0.445,bz,body,24);
  const cone=new T.Mesh(new T.ConeGeometry(br*0.76,bh*0.11,24),body);
  cone.position.set(bx,base+bh-bh*0.055,bz);root.add(cone);
  tube(T,root,br*0.55,br*0.85,1.1,bx,base-0.55,bz,dark,20);
 }
 // Engine bell(s) and umbilical fittings.
 for(const [x,z] of [[0,0],[R*0.43,R*0.43],[-R*0.43,-R*0.43]]){
  tube(T,root,R*0.17,R*0.29,Math.min(2,R*0.65),x,base-0.40,z,steel,16);
 }
 // Open truss tower, assembled with properly scaled local-metre geometry.
 const towerH=site.towerHeightM, towerX=R*4.4+4.5, towerZ=1.5, span=Math.max(5,Math.min(11,R*3));
 const corners=[[-1,-1],[-1,1],[1,-1],[1,1]];
 for(const [sx,sz] of corners){
  box(T,root,.55,towerH,.55,towerX+sx*span/2,towerH/2,towerZ+sz*span/2,steel);
 }
 const pitch=site.id.includes('mahia')?4:8;
 for(let y=pitch;y<towerH;y+=pitch){
  for(const sz of [-1,1]){
   brace(T,root,[towerX-span/2,y-pitch,towerZ+sz*span/2],[towerX+span/2,y,towerZ+sz*span/2],.15,steel);
   box(T,root,span,.25,.30,towerX,y,towerZ+sz*span/2,steel);
  }
  for(const sx of [-1,1])box(T,root,.30,.24,span,towerX+sx*span/2,y,towerZ,steel);
  box(T,root,span,.16,span,towerX,y,towerZ,dark);
 }
 for(const k of [0.22,0.45,0.68,0.84]){
  const y=Math.min(towerH-3,H*k+base),length=Math.max(2.5,towerX-span/2-R*.7);
  box(T,root,length,.35,.43,towerX-span/2-length/2,y,towerZ,steel);
  box(T,root,1.7,1.1,1.4,R+1.5,y,towerZ,dark);
 }
 // Starship's vertical catch-tower arms and Falcon strongbacks stay visibly distinct.
 if(site.tower==='catch'){
  for(const z of [-4,4]){
   box(T,root,towerX-R-2,2.5,1.1,(towerX+R+2)/2,H*.66,z,gold);
   brace(T,root,[towerX,H*.63,z],[R+3,H*.66,z],.34,steel);
  }
 }else if(site.tower==='strongback'){
  brace(T,root,[R+2,base+H*.16,0],[towerX,towerH*.94,0],.85,dark);
 }
 // Pad-level feed lines and floodlights.
 for(const z of [-span/2,span/2]){
  brace(T,root,[towerX,2.6,z],[W*.38,2.6,z],.22,accent);
  box(T,root,1.8,.24,.5,towerX,towerH-1,z,gold);
 }
 root.userData={source:'BridgePoint-built procedural 3D; not a scan',rocketHeightM:H,padCenter:site.coordinates};
 root.traverse(obj=>{if(obj.isMesh){obj.frustumCulled=false;obj.receiveShadow=false;obj.castShadow=false;}});
 return root;
}
function matrixAt(map,T,coords,elevation){
 const local=map.transform?.getMatrixForModel?.(coords,elevation);
 if(local&&local.length>=16)return new T.Matrix4().fromArray(local);
 const C=window.maplibregl?.MercatorCoordinate;
 if(!C?.fromLngLat)return null;
 const p=C.fromLngLat(coords,elevation),m=p.meterInMercatorCoordinateUnits();
 if(!Number.isFinite(m)||m<=0)return null;
 return new T.Matrix4().set(m,0,0,p.x,0,0,m,p.y,0,m,0,p.z,0,0,0,1);
}
function inView(state,site){
 if(Number(state.map.getZoom?.()||0)<12)return false;
 try{return !!state.map.getBounds?.()?.contains(site.coordinates);}catch(_){return false;}
}
function selectVisible(state){
 if(!state.enabled)return null;
 if(state.selected&&inView(state,state.selected))return state.selected;
 return SPACECRAFT_TEN_LAUNCH_PADS.find(site=>inView(state,site))||null;
}
function activateScene(state,site){
 if(!site||!state.THREE||!state.mapScene)return;
 if(state.active?.id===site.id&&state.activeGroup)return;
 if(state.activeGroup)state.mapScene.remove(state.activeGroup);
 state.active=site;
 state.activeGroup=buildSpacecraftLaunchPadScene(state.THREE,site);
 state.mapScene.add(state.activeGroup);
 state.map.triggerRepaint?.();
}
function ensureLayer(state){
 if(!state.enabled||!state.THREE||!state.map?.getStyle?.())return;
 if(state.map.getLayer?.(LAYER_ID)&&state.mapRenderer)return;
 const T=state.THREE,map=state.map;
 const layer={id:LAYER_ID,type:'custom',renderingMode:'3d',
  onAdd(m,gl){
   state.mapRenderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
   state.mapRenderer.autoClear=false;state.mapRenderer.outputColorSpace=T.SRGBColorSpace;
   state.mapScene=new T.Scene();
   state.mapScene.add(new T.AmbientLight(0xffffff,2.0));
   const light=new T.DirectionalLight(0xffebcf,1.45);light.position.set(-30,110,75);state.mapScene.add(light);
   state.mapCamera=new T.Camera();
   state.active=null;state.activeGroup=null;
  },
  render(_gl,args){
   if(!state.enabled||!state.mapScene||!state.mapRenderer)return;
   const site=selectVisible(state);
   if(!site)return;
   activateScene(state,site);
   const raw=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);
   if(!raw||raw.length<16)return;
   let elevation=0;
   try{const value=map.queryTerrainElevation?.(site.coordinates,{exaggerated:false});if(value!=null&&Number.isFinite(+value))elevation=+value;}catch(_){}
   const model=matrixAt(map,T,site.coordinates,elevation);
   if(!model)return;
   state.mapCamera.projectionMatrix.copy(new T.Matrix4().fromArray(raw)).multiply(model);
   try{state.mapRenderer.resetState();state.mapRenderer.render(state.mapScene,state.mapCamera);}
   catch(e){if(!state.warned){state.warned=true;console.warn('BridgePoint 10 launch-pad renderer',e);}}
  },
  onRemove(){
   try{state.mapRenderer?.dispose();}catch(_){}
   state.mapRenderer=null;state.mapScene=null;state.mapCamera=null;state.activeGroup=null;state.active=null;
  }
 };
 try{map.addLayer(layer);}catch(e){state.layerError=String(e?.message||e);}
}
function maybeMaterialize(state){
 if(!state.enabled||!selectVisible(state))return;
 if(state.THREE){ensureLayer(state);return;}
 void getThree().then(T=>{if(!state.enabled||state.destroyed)return;state.THREE=T;ensureLayer(state);state.map.triggerRepaint?.();})
 .catch(e=>console.warn('BridgePoint launch-pad 3D unavailable',e));
}
function ensureMarkers(state){
 const Marker=window.maplibregl?.Marker;
 if(!Marker)return;
 for(const site of SPACECRAFT_TEN_LAUNCH_PADS){
  let entry=state.markers.get(site.id);
  if(!entry){
   const button=document.createElement('button');button.type='button';
   button.className=MARKER_CLASS;button.title=site.name+' · BridgePoint 3D card';
   button.setAttribute('aria-label','Open BridgePoint 3D spacecraft card for '+site.name);
   button.style.setProperty('--bp-spacecraft-ten-accent','#'+site.accent.toString(16).padStart(6,'0'));
   button.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M31 4L23 23v16L14 51l13-5h10l13 5-9-12V23L33 4Z" fill="currentColor" stroke="#f4e6bd" stroke-width="2"/><circle cx="32" cy="25" r="5" fill="#17334b"/><path d="M29 44l3 16 3-16" fill="#ee8536"/></svg>';
   button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(state.enabled)openCard(state,site);});
   const marker=new Marker({element:button,anchor:'center'}).setLngLat(site.coordinates).addTo(state.map);
   entry={marker,button};state.markers.set(site.id,entry);
  }
  entry.button.hidden=!state.enabled;entry.button.disabled=!state.enabled;
  entry.button.setAttribute('aria-hidden',String(!state.enabled));
 }
}
function openCard(state,site){
 if(!state.enabled||!window.maplibregl?.Popup)return;
 state.selected=site;state.popup?.remove();
 const html='<article class="bp-spacecraft-ten-card">'+
  '<div class="bp-spacecraft-ten-kicker">BRIDGEPOINT · SPACECRAFT / LAUNCH SITES</div>'+
  '<h3>'+safe(site.name)+'</h3><p>'+safe(site.location)+'</p>'+
  '<div class="bp-spacecraft-ten-viewer" data-spacecraft-ten-viewer><span>Loading BridgePoint 3D scene…</span></div>'+
  '<div class="bp-spacecraft-ten-buttons"><button data-spacecraft-ten-reset type="button">Reset 3D view</button><button data-spacecraft-ten-globe type="button">Show true-scale rocket on globe</button></div>'+
  '<div class="bp-spacecraft-ten-facts"><span><b>Rocket</b>'+safe(site.rocket)+'</span>'+
  '<span><b>Published stack height</b>'+site.rocketHeightM+' metres</span>'+
  '<span><b>Launch platform</b>'+safe(site.pad)+'</span>'+
  '<span><b>Pad coordinates</b>'+Math.abs(site.coordinates[1]).toFixed(5)+'° '+(site.coordinates[1]>=0?'N':'S')+', '+Math.abs(site.coordinates[0]).toFixed(5)+'° '+(site.coordinates[0]>=0?'E':'W')+'</span></div>'+
  '<p class="bp-spacecraft-ten-disclosure"><strong>Model provenance:</strong> The rocket, upright tower, support arms, and platform are a BridgePoint-hosted, original procedural 3D reconstruction. The rocket is drawn to its published overall height in world metres; finer rocket shapes, equipment, platform dimensions and tower height are illustrative, not a scan or surveyed CAD model. This is a representative launch configuration, not evidence of a rocket on the pad now.</p>'+
  '<p class="bp-spacecraft-ten-disclosure"><strong>World placement:</strong> The marker uses the approximate reported launch-pad coordinates; terrain elevation is sampled from the globe when available. The 3D footprint, heading, and tower-to-vehicle positions are visualization-grade, not survey-controlled.</p>'+
  '<div class="bp-spacecraft-ten-sources"><b>Source records</b><a href="'+safe(site.source)+'" target="_blank" rel="noopener noreferrer">Launch pad / site information</a><a href="'+safe(site.vehicleSource)+'" target="_blank" rel="noopener noreferrer">Rocket specifications / operator</a></div>'+
  '</article>';
 const popup=new window.maplibregl.Popup({closeButton:true,closeOnClick:true,maxWidth:'530px',className:'bp-spacecraft-ten-popup'}).setLngLat(site.coordinates).setHTML(html).addTo(state.map);
 state.popup=popup;
 popup.getElement?.()?.querySelector('[data-spacecraft-ten-globe]')?.addEventListener('click',()=>showOnGlobe(state,site));
 mountViewer(state,popup,site);
}
async function mountViewer(state,popup,site){
 const root=popup.getElement?.(),host=root?.querySelector('[data-spacecraft-ten-viewer]');
 if(!host)return;
 let disposed=false,renderer=null,scene=null,camera=null,frame=0,resizeObserver=null;
 const close=()=>{disposed=true;if(frame)cancelAnimationFrame(frame);resizeObserver?.disconnect();try{renderer?.dispose();}catch(_){}};popup.on('close',close);
 try{
  const T=await getThree();if(disposed||!host.isConnected)return;
  const canvas=document.createElement('canvas');canvas.style.touchAction='none';canvas.style.cursor='grab';host.replaceChildren(canvas);
  renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.4));renderer.outputColorSpace=T.SRGBColorSpace;
  scene=new T.Scene();scene.background=new T.Color(0x06131f);
  scene.add(new T.AmbientLight(0xffffff,2.1));
  const key=new T.DirectionalLight(0xffebd4,1.7);key.position.set(-40,130,95);scene.add(key);
  const fill=new T.DirectionalLight(0x8bc8e4,.72);fill.position.set(80,45,-40);scene.add(fill);
  const model=buildSpacecraftLaunchPadScene(T,site);scene.add(model);
  const bounds=new T.Box3().setFromObject(model),size=bounds.getSize(new T.Vector3()),target=bounds.getCenter(new T.Vector3()),span=Math.max(size.x,size.y,size.z);
  camera=new T.PerspectiveCamera(38,1,.1,2500);
  let distance=span*1.7,theta=.75,phi=1.1,dragging=false,x0=0,y0=0;
  const update=()=>{phi=Math.max(.10,Math.min(Math.PI-.10,phi));camera.position.set(target.x+distance*Math.sin(phi)*Math.sin(theta),target.y+distance*Math.cos(phi),target.z+distance*Math.sin(phi)*Math.cos(theta));camera.lookAt(target);};
  const reset=()=>{distance=span*1.7;theta=.75;phi=1.1;update();};
  const resize=()=>{if(disposed)return;const w=Math.max(1,host.clientWidth||320),h=Math.max(1,host.clientHeight||250);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  resize();if(typeof ResizeObserver!=='undefined'){resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);}
  canvas.addEventListener('pointerdown',e=>{dragging=true;x0=e.clientX;y0=e.clientY;canvas.setPointerCapture?.(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;theta-=(e.clientX-x0)*.009;phi+=(e.clientY-y0)*.009;x0=e.clientX;y0=e.clientY;update();});
  for(const kind of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(kind,()=>{dragging=false;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(span*.65,Math.min(span*8,distance*Math.exp(e.deltaY*.001)));update();},{passive:false});
  root.querySelector('[data-spacecraft-ten-reset]')?.addEventListener('click',reset);
  reset();let last=0;
  const draw=timestamp=>{if(disposed)return;if(timestamp-last>=32){renderer.render(scene,camera);last=timestamp;}frame=requestAnimationFrame(draw);};
  frame=requestAnimationFrame(draw);
 }catch(e){if(!disposed)host.textContent='BridgePoint 3D viewer unavailable: '+String(e?.message||e);}
}
function showOnGlobe(state,site){
 if(!state.enabled)return false;
 state.selected=site;
 try{state.map.flyTo?.({center:site.coordinates,zoom:17,pitch:68,bearing:22,duration:1200});}
 catch(_){state.map.jumpTo?.({center:site.coordinates,zoom:17,pitch:68});}
 void getThree().then(T=>{if(state.destroyed||!state.enabled)return;state.THREE=T;ensureLayer(state);state.map.triggerRepaint?.();});
 return true;
}
function addStyle(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement('style');s.id=STYLE_ID;
 s.textContent=
  '.'+MARKER_CLASS+'{display:grid;place-items:center;width:40px;height:40px;border-radius:50%;padding:7px;color:var(--bp-spacecraft-ten-accent,#f8c978);border:1px solid #f7d99a;background:radial-gradient(circle,#1b3647,#06121d);box-shadow:0 0 0 2px rgba(233,184,91,.2),0 2px 9px #000b;cursor:pointer;touch-action:manipulation;z-index:43}'+
  '.'+MARKER_CLASS+'[hidden]{display:none!important}.'+MARKER_CLASS+' svg{width:25px;height:25px;display:block}.'+MARKER_CLASS+':focus-visible{outline:3px solid white;outline-offset:3px}'+
  '.bp-spacecraft-ten-popup .maplibregl-popup-content{background:#06131f;color:#e8f5fb;border:1px solid #d6a957;border-radius:12px;padding:12px;width:min(495px,calc(100vw - 40px));max-height:82vh;overflow:auto;font:12px/1.45 system-ui,sans-serif}.bp-spacecraft-ten-popup .maplibregl-popup-tip{border-top-color:#06131f;border-bottom-color:#06131f}'+
  '.bp-spacecraft-ten-card h3{font-size:18px;margin:4px 0;color:#fff}.bp-spacecraft-ten-card p{margin:7px 0;color:#bdcdd5}.bp-spacecraft-ten-kicker{font-size:9px;color:#f1d195;font-weight:900;letter-spacing:.12em}'+
  '.bp-spacecraft-ten-viewer{height:270px;width:100%;background:#030c14;border:1px solid #8c7651;border-radius:8px;overflow:hidden;display:grid;place-items:center}.bp-spacecraft-ten-viewer canvas{height:100%;width:100%;display:block}.bp-spacecraft-ten-buttons{display:flex;gap:7px;margin:8px 0;flex-wrap:wrap}.bp-spacecraft-ten-buttons button{flex:1;border:1px solid #b58a4c;background:#372c21;color:#ffedcf;border-radius:7px;padding:8px;min-width:125px;font-size:11px}'+
  '.bp-spacecraft-ten-facts{display:grid;grid-template-columns:1fr 1fr;gap:6px}.bp-spacecraft-ten-facts span{padding:6px;border:1px solid #42607766;border-radius:6px;display:grid;gap:3px}.bp-spacecraft-ten-facts b{font-size:9px;color:#a6b5c2;text-transform:uppercase}'+
  '.bp-spacecraft-ten-card .bp-spacecraft-ten-disclosure{font-size:10px;line-height:1.5}.bp-spacecraft-ten-sources{display:grid;gap:5px;font-size:10px}.bp-spacecraft-ten-sources a{color:#f3d292;text-decoration:underline}'+
  '@media(max-width:480px){.bp-spacecraft-ten-viewer{height:235px}.bp-spacecraft-ten-popup .maplibregl-popup-content{padding:10px}}';
 document.head.appendChild(s);
}
function readToggle(state){
 const button=state.toggleButton||document.getElementById(TOGGLE_ID);
 const next=button?.getAttribute('aria-pressed')==='true';
 if(state.enabled===next&&state.markers.size===SPACECRAFT_TEN_LAUNCH_PADS.length)return;
 state.enabled=next;ensureMarkers(state);
 if(next)maybeMaterialize(state);
 if(!next){state.popup?.remove();state.selected=null;}
 state.map.triggerRepaint?.();
}
function attachToggle(state){
 const button=document.getElementById(TOGGLE_ID);
 if(!button||state.toggleButton===button)return;
 state.toggleButton=button;
 button.addEventListener('click',()=>queueMicrotask(()=>readToggle(state)));
 state.toggleObserver?.disconnect();
 state.toggleObserver=new MutationObserver(()=>readToggle(state));
 state.toggleObserver.observe(button,{attributes:true,attributeFilter:['aria-pressed']});readToggle(state);
}
export function initSpacecraftTenPadsRenderer(target){
 const map=mapOf(target);
 if(!map||typeof map.getBounds!=='function'||typeof map.addLayer!=='function')return null;
 if(states.has(map))return states.get(map).api;
 addStyle();
 const state={map,enabled:false,destroyed:false,markers:new Map(),selected:null,active:null,activeGroup:null,THREE:null,popup:null,toggleButton:null,toggleObserver:null,bodyObserver:null,mapRenderer:null,mapScene:null,mapCamera:null};
 const onMove=()=>{if(state.enabled){ensureMarkers(state);maybeMaterialize(state);state.map.triggerRepaint?.();}};
 state.onMove=onMove;
 for(const name of ['load','style.load','moveend','zoomend'])map.on?.(name,onMove);
 const api={
  version:2,sites:SPACECRAFT_TEN_LAUNCH_PADS,
  get enabled(){return state.enabled;},
  setEnabled(value){state.enabled=!!value;ensureMarkers(state);if(state.enabled)maybeMaterialize(state);else state.popup?.remove();map.triggerRepaint?.();return state.enabled;},
  openCard(id){const s=SPACECRAFT_TEN_LAUNCH_PADS.find(x=>x.id===id);if(s&&state.enabled)openCard(state,s);},
  showOnGlobe(id){const s=SPACECRAFT_TEN_LAUNCH_PADS.find(x=>x.id===id);return !!s&&showOnGlobe(state,s);},
  get stats(){return {count:state.markers.size,enabled:state.enabled,layerAttached:!!map.getLayer?.(LAYER_ID),active:state.active?.id||null};},
  destroy(){state.destroyed=true;state.enabled=false;state.popup?.remove();state.toggleObserver?.disconnect();state.bodyObserver?.disconnect();for(const x of state.markers.values())x.marker.remove();for(const name of ['load','style.load','moveend','zoomend'])map.off?.(name,onMove);if(map.getLayer?.(LAYER_ID))try{map.removeLayer(LAYER_ID);}catch(_){}states.delete(map);document.getElementById(STYLE_ID)?.remove();}
 };
 state.api=api;states.set(map,state);attachToggle(state);
 if(typeof MutationObserver!=='undefined'&&document.body){
  state.bodyObserver=new MutationObserver(()=>{if(!state.toggleButton?.isConnected)attachToggle(state);});
  state.bodyObserver.observe(document.body,{childList:true,subtree:true});
 }
 return api;
}
