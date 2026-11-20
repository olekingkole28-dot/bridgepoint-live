/* BridgePoint ten museum spacecraft exhibits v3. Additive, on-globe, same-origin 3D.
 * Distinct physical exhibits at real museums with published vehicle dimensions.
 * BridgePoint procedural models: NOT 3D scans, surveyed models or exact room placements.
 */
const THREE_URL='/vendor/three.module.js?v=169-local';
const TOGGLE_ID='bp-spacecraft-toggle-v1', LAYER_ID='bp-museum-spacecraft-native-v3';
const STYLE_ID='bp-museum-spacecraft-style-v3', ICON_CLASS='bp-museum-spacecraft-icon-v3';
export const SPACECRAFT_MUSEUM_EXHIBITS_V3=Object.freeze([
 {id:'atlantis-ov104-ksc',name:'Space Shuttle Atlantis (OV-104)',type:'orbiter',variant:'shuttle',
  loc:'Kennedy Space Center Visitor Complex, Florida, USA',exhibit:'Space Shuttle Atlantis exhibit',
  coordinates:[-80.6817,28.5228],dims:{length:37.24,span:23.79,height:17.25},color:0xe3e8ee,accent:0xe0ab50,
  display:'Suspended indoors',description:'Flown NASA orbiter preserved at the Kennedy Space Center Visitor Complex.',
  source:'https://www.kennedyspacecenter.com/explore-attractions/space-shuttle-atlantis',specs:'https://www.nasa.gov/reference/the-space-shuttle/'},
 {id:'enterprise-ov101-intrepid',name:'Space Shuttle Enterprise (OV-101)',type:'orbiter',variant:'shuttle',
  loc:'Intrepid Museum, New York City, New York, USA',exhibit:'Space Shuttle Pavilion, Pier 86',
  coordinates:[-74.00018,40.76464],dims:{length:37.24,span:23.79,height:17.25},color:0xe2eef2,accent:0x61c1d1,
  display:'Indoors',description:'NASA prototype orbiter used for approach and landing tests; it did not fly in space.',
  source:'https://intrepidmuseum.org/exhibitions/permanent-exhibitions/space-shuttle-pavilion',specs:'https://www.nasa.gov/reference/the-space-shuttle/'},
 {id:'buran-ok-gli-speyer',name:'Buran OK-GLI Test Spaceplane',type:'orbiter',variant:'buran',
  loc:'Technik Museum Speyer, Germany',exhibit:'Space exhibition hall',
  coordinates:[8.44639,49.31250],dims:{length:36.37,span:23.92,height:16.5},color:0xe9e9e3,accent:0x82c4ee,
  display:'Indoors',description:'Soviet atmospheric test spaceplane with jet engines. This particular Buran test article never orbited Earth.',
  source:'https://www.technik-museum.de/en/discover/exhibits/space-shuttle-buran/',specs:'https://buran.space/buran/'},
 {id:'soyuz-tma19m-london',name:'Soyuz TMA-19M Descent Capsule',type:'capsule',variant:'soyuz',
  loc:'Science Museum, London, United Kingdom',exhibit:'Space gallery',
  coordinates:[-0.17649,51.49730],dims:{height:2.2,diameter:2.2},color:0xb7a98b,accent:0xe0ad63,
  display:'Indoors',description:'Flown Soyuz descent module from the mission carrying Tim Peake, Yuri Malenchenko and Tim Kopra.',
  source:'https://collection.sciencemuseumgroup.org.uk/objects/co8593265',specs:'https://www.esa.int/Science_Exploration/Human_and_Robotic_Exploration/Principia'},
 {id:'apollo13-odyssey-hutchinson',name:'Apollo 13 Odyssey Command Module',type:'capsule',variant:'apollo',
  loc:'Cosmosphere, Hutchinson, Kansas, USA',exhibit:'Hall of Space',
  coordinates:[-97.92134,38.06530],dims:{height:3.2,diameter:3.9},color:0xb07d50,accent:0xeabd7b,
  display:'Indoors',description:'The recovered Apollo 13 command module Odyssey, returned to Earth in April 1970.',
  source:'https://cosmo.org/about/spaceworks/restoration-and-replication/',specs:'https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloloc.html'},
 {id:'apollo16-casper-huntsville',name:'Apollo 16 Casper Command Module',type:'capsule',variant:'apollo',
  loc:'U.S. Space & Rocket Center, Huntsville, Alabama, USA',exhibit:'Davidson Center for Space Exploration',
  coordinates:[-86.65549,34.71035],dims:{height:3.2,diameter:3.9},color:0x947863,accent:0xe9bd71,
  display:'Indoors',description:'Apollo 16 flown command module Casper, preserved in Huntsville.',
  source:'https://rocketcenter.com/aboutus/',specs:'https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloloc.html'},
 {id:'apollo15-endeavour-dayton',name:'Apollo 15 Endeavour Command Module',type:'capsule',variant:'apollo',
  loc:'National Museum of the U.S. Air Force, Dayton, Ohio, USA',exhibit:'Space Gallery',
  coordinates:[-84.10957,39.78079],dims:{height:3.2,diameter:3.9},color:0x957d66,accent:0xd4af60,
  display:'Indoors',description:'Apollo 15 flown command module Endeavour on display in the museum Space Gallery.',
  source:'https://www.nationalmuseum.af.mil/Visit/Museum-Exhibits/Fact-Sheets/Display/Article/197685/apollo-15-command-module/',specs:'https://nssdc.gsfc.nasa.gov/planetary/lunar/apolloloc.html'},
 {id:'ariane5-replica-toulouse',name:'Ariane 5 Full-Scale Display',type:'rocket',variant:'ariane5',
  loc:"Cité de l'espace, Toulouse, France",exhibit:'Outdoor full-scale replica',
  coordinates:[1.49370,43.58571],dims:{length:53,diameter:5.4},color:0xf4f4ed,accent:0x3e8bd9,
  display:'Upright replica',description:'Full-size museum replica of Ariane 5. It is not a flown launch vehicle.',
  source:'https://metropole.toulouse.fr/annuaire/cite-de-lespace',specs:'https://www.esa.int/Enabling_Support/Space_Transportation/Ariane/Ariane_5_Generic'},
 {id:'vostok-k-vdnkh-moscow',name:'Vostok-K Rocket Monument',type:'rocket',variant:'vostok',
  loc:'VDNKh Cosmos Pavilion, Moscow, Russia',exhibit:'Vostok 8K72K outdoor display',
  coordinates:[37.622986,55.834323],dims:{length:38.4,diameter:2.68},color:0xe4ebde,accent:0xc95846,
  display:'Upright outdoor exhibition rocket',description:'Vostok-class carrier-rocket display adjacent to the historic Cosmos Pavilion.',
  source:'https://commons.wikimedia.org/wiki/File:Vostok_8K72K_in_VDNKh_(1).jpg',specs:'https://mos-radius.ru/en/kak-mehanizacija-na-vdnh-stala-kosmosom-istorija-pavilona-34/'},
 {id:'hii-rocket-tsukuba',name:'H-II Rocket at Rocket Square',type:'rocket',variant:'hii',
  loc:'JAXA Tsukuba Space Center, Ibaraki, Japan',exhibit:'Rocket Square',
  coordinates:[140.12939,36.06813],dims:{length:50,diameter:4},color:0xf1f5f3,accent:0x3d87ca,
  display:'Horizontally displayed',description:'Full-size H-II rocket exhibit outdoors at the entrance to JAXA Tsukuba.',
  source:'https://www.japan.travel/en/spot/1453/',specs:'https://global.jaxa.jp/projects/rockets/h2/index.html'}
]);
const states=new WeakMap();
let threePromise=null;
const safe=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function getThree(){
 if(!threePromise)threePromise=import(THREE_URL).then(T=>{
  if(!T.WebGLRenderer||!T.Group)throw Error('BridgePoint local Three.js unavailable');
  return T;
 }).catch(e=>{threePromise=null;throw e;});
 return threePromise;
}
function mat(T,c,metalness=.16){return new T.MeshStandardMaterial({color:c,metalness,roughness:.65,side:T.DoubleSide});}
function box(T,g,w,h,d,x,y,z,m){
 const o=new T.Mesh(new T.BoxGeometry(w,h,d),m);o.position.set(x,y,z);g.add(o);return o;
}
function cylinder(T,g,top,bottom,h,x,y,z,m,seg=36){
 const o=new T.Mesh(new T.CylinderGeometry(top,bottom,h,seg),m);o.position.set(x,y,z);g.add(o);return o;
}
function cone(T,g,r,h,x,y,z,m,seg=36){
 const o=new T.Mesh(new T.ConeGeometry(r,h,seg),m);o.position.set(x,y,z);g.add(o);return o;
}
function brace(T,g,a,b,r,m){
 const v=new T.Vector3(...b).sub(new T.Vector3(...a));
 const o=new T.Mesh(new T.CylinderGeometry(r,r,v.length(),7),m);
 o.position.copy(new T.Vector3(...a)).addScaledVector(v,.5);
 o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());g.add(o);return o;
}
function plinth(T,g,w,d){
 const base=mat(T,0x59616c,.3),trim=mat(T,0xc8a46b,.4);
 box(T,g,w,.30,d,0,.15,0,base);
 box(T,g,w,.12,.18,0,.40,-d/2,trim);
 box(T,g,w,.12,.18,0,.40,d/2,trim);
}
function makeApollo(T,site){
 const g=new T.Group(),H=site.dims.height,D=site.dims.diameter;
 const hull=mat(T,site.color,.33),rim=mat(T,0x302b2c,.15),detail=mat(T,0xe5cdab,.28),glass=mat(T,0x193242,.32);
 plinth(T,g,7,7);box(T,g,4,.7,4,0,.70,0,rim);
 cylinder(T,g,D*.22,D/2,H*.83,0,1.17+H*.415,0,hull,56);
 cylinder(T,g,D/2,D/2,.15,0,1.16,0,rim,56);
 cylinder(T,g,D*.22,D*.23,H*.17,0,1.17+H*.915,0,detail,42);
 cylinder(T,g,.48,.50,.17,0,1.17+H,0,rim,32);
 for(const a of [-.55,.55]){
  const pane=box(T,g,.58,.36,.07,Math.sin(a)*D*.28,1.17+H*.64,-Math.cos(a)*D*.28,glass);
  pane.rotation.y=a;
 }
 for(let i=0;i<12;i++){
  const a=i*Math.PI/6;
  box(T,g,.13,.23,.13,Math.cos(a)*D*.47,1.2,Math.sin(a)*D*.47,detail);
 }
 return g;
}
function makeSoyuz(T,site){
 const g=new T.Group(),D=site.dims.diameter,H=site.dims.height;
 const hull=mat(T,site.color,.21),heat=mat(T,0x2e3034,.29),shell=mat(T,0xad947a,.2);
 plinth(T,g,5,5);box(T,g,2.7,.65,2.7,0,.65,0,heat);
 cylinder(T,g,D*.40,D*.50,H*.58,0,1.03+H*.29,0,hull);
 const dome=new T.Mesh(new T.SphereGeometry(D*.47,30,15,0,Math.PI*2,0,Math.PI*.53),shell);
 dome.scale.y=.52;dome.position.y=1.02+H*.59;g.add(dome);
 cylinder(T,g,D*.52,D*.52,.16,0,1.04,0,heat);
 cylinder(T,g,.40,.40,.12,0,1.03+H*.78,0,heat);
 box(T,g,.59,.32,.07,.24,1.03+H*.4,-D*.48,heat).rotation.y=-.16;
 for(let i=0;i<8;i++){
  const a=i*Math.PI/4;
  brace(T,g,[Math.cos(a)*D*.43,.85,Math.sin(a)*D*.43],
             [Math.cos(a)*D*.43,1.6,Math.sin(a)*D*.43],.045,heat);
 }
 return g;
}
function makeOrbiter(T,site){
 const g=new T.Group(),L=site.dims.length,W=site.dims.span,H=site.dims.height;
 const white=mat(T,site.color,.25),dark=mat(T,0x24282d,.15),glass=mat(T,0x203b50,.32),
       silver=mat(T,0xb0b9bb,.29),gold=mat(T,site.accent,.23);
 plinth(T,g,Math.max(W+5,32),Math.max(L+5,43));
 box(T,g,5.5,.72,L*.42,0,.73,0,dark);
 const body=cylinder(T,g,2.3,2.5,L*.72,0,4.15,L*.10,white,48);
 body.rotation.x=Math.PI/2;
 cone(T,g,2.3,L*.20,0,4.15,-L*.39,white,48).rotation.x=-Math.PI/2;
 cone(T,g,2.45,L*.10,0,4.15,L*.44,white,48).rotation.x=Math.PI/2;
 const pts=[[-2.5,-L*.29],[-W*.5,L*.135],[-W*.5,L*.24],[-3.5,L*.14],
            [3.5,L*.14],[W*.5,L*.24],[W*.5,L*.135],[2.5,-L*.29]];
 const shape=new T.Shape();pts.forEach(([x,z],i)=>i===0?shape.moveTo(x,-z):shape.lineTo(x,-z));shape.closePath();
 const wing=new T.Mesh(new T.ShapeGeometry(shape),white);
 wing.rotation.x=-Math.PI/2;wing.position.y=3.78;g.add(wing);
 const under=wing.clone();under.position.y=3.54;under.material=dark;g.add(under);
 const geom=new T.BufferGeometry();
 geom.setAttribute('position',new T.Float32BufferAttribute([0,3.55,L*.2,0,3.55,L*.44,0,H,L*.4],3));
 geom.computeVertexNormals();g.add(new T.Mesh(geom,white));
 for(let side of [-1,1]){
  box(T,g,W*.13,.14,L*.085,side*W*.25,3.8,L*.18,gold);
  box(T,g,.62,.20,L*.37,side*1.8,6.5,0,silver);
  box(T,g,.95,.4,.09,side*1.08,6.06,-L*.28,glass).rotation.y=side*.29;
 }
 for(let i=-1;i<=1;i++)cylinder(T,g,.73,.91,1.6,i*1.35,4.2,L*.45,dark,24).rotation.x=Math.PI/2;
 for(let x of [-2.3,2.3])box(T,g,.48,3.8,.48,x,1.9,L*.015,silver);
 if(site.variant==='buran'){
  for(let side of [-1,1])
   cylinder(T,g,.65,.79,3.4,side*2.6,6.0,L*.37,dark,24).rotation.x=Math.PI/2;
 }
 return g;
}
function buildRocket(T,site){
 const H=site.dims.length,D=site.dims.diameter;
 const r=new T.Group(),white=mat(T,site.color,.2),metal=mat(T,0x9ba5a9,.55),
       dark=mat(T,0x22313c,.32),accent=mat(T,site.accent,.22);
 const core=H*.68,upper=H*.19,tip=H-core-upper;
 cylinder(T,r,D*.5,D*.5,core,0,core/2,0,white,44);
 cylinder(T,r,D*.38,D*.38,upper,0,core+upper/2,0,accent,36);
 cone(T,r,D*.38,tip,0,H-tip/2,0,white,36);
 for(const k of [.13,.32,.57,.71,.86])
  cylinder(T,r,D*.51,D*.51,Math.max(.10,H*.005),0,H*k,0,accent,36);
 for(let i=0;i<(site.variant==='vostok'?4:2);i++){
  const n=site.variant==='vostok'?4:2,phi=i*2*Math.PI/n+Math.PI/4;
  const x=Math.cos(phi)*D*.82,z=Math.sin(phi)*D*.82,bh=H*(n===4?.60:.55),br=D*(n===4?.20:.27);
  cylinder(T,r,br*.67,br,bh*.85,x,bh*.425,z,white,22);
  cone(T,r,br*.67,bh*.15,x,bh*.925,z,white,22);
  cylinder(T,r,br*.57,br*.65,H*.025,x,-.1,z,dark,16);
 }
 cylinder(T,r,D*.25,D*.35,.9,0,-.2,0,metal,26);
 const out=new T.Group();
 if(site.variant==='hii'){
  // The real Tsukuba exhibit is horizontal. Keep rocket length 50 metres in +X.
  r.rotation.z=-Math.PI/2;r.position.set(-H/2,5.5,0);
  plinth(T,out,H+8,10);out.add(r);
  for(const x of [-H*.29,H*.28]){
   box(T,out,3,3.1,4,x,1.9,0,metal);
   box(T,out,4,.6,6,x,3.85,0,dark);
  }
 }else{
  plinth(T,out,Math.max(12,D*4),Math.max(12,D*4));
  r.position.y=.55;out.add(r);
  for(let i=0;i<6;i++){
   const p=i*Math.PI/3,t=Math.max(D*1.4,4);
   box(T,out,.28,2,.28,Math.cos(p)*t,1.0,Math.sin(p)*t,metal);
  }
  if(site.variant==='ariane5')for(const side of [-1,1]){
   brace(T,out,[side*D*1.7,.5,0],[side*D*.75,H*.22,0],.18,metal);
  }
 }
 return out;
}
export function buildMuseumExhibitScene(T,site){
 if(!site?.dims||!['rocket','capsule','orbiter'].includes(site.type))throw Error('Invalid spacecraft exhibit');
 const group=site.type==='orbiter'?makeOrbiter(T,site):
  site.type==='rocket'?buildRocket(T,site):
  site.variant==='soyuz'?makeSoyuz(T,site):makeApollo(T,site);
 group.name='BridgePoint spacecraft museum reconstruction: '+site.name;
 group.userData={source:'BridgePoint original procedural visualization, not a 3D scan',dimensionsM:site.dims};
 group.traverse(o=>{if(o.isMesh){o.frustumCulled=false;o.castShadow=false;o.receiveShadow=false;}});
 return group;
}
function worldMatrix(map,T,coords,elev){
 try{
  const raw=map.transform?.getMatrixForModel?.(coords,elev);
  if(raw&&raw.length>=16)return new T.Matrix4().fromArray(raw);
  const C=window.maplibregl?.MercatorCoordinate;
  if(!C?.fromLngLat)return null;
  const p=C.fromLngLat(coords,elev),u=p.meterInMercatorCoordinateUnits();
  if(!Number.isFinite(u)||u<=0)return null;
  return new T.Matrix4().set(u,0,0,p.x,0,0,u,p.y,0,u,0,p.z,0,0,0,1);
 }catch(_){return null;}
}
function visibleSite(state,site){
 if(Number(state.map.getZoom?.()||0)<11.5)return false;
 try{return !!state.map.getBounds?.()?.contains(site.coordinates);}catch(_){return false;}
}
function selectedSite(state){
 if(!state.enabled)return null;
 if(state.selected&&visibleSite(state,state.selected))return state.selected;
 return SPACECRAFT_MUSEUM_EXHIBITS_V3.find(s=>visibleSite(state,s))||null;
}
function ensureLayer(state){
 if(!state.enabled||!state.THREE||!state.map?.getStyle?.())return false;
 if(state.map.getLayer?.(LAYER_ID)&&state.renderer)return true;
 const T=state.THREE,map=state.map;
 const layer={id:LAYER_ID,type:'custom',renderingMode:'3d',
  onAdd(m,gl){
   state.renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
   state.renderer.autoClear=false;state.renderer.outputColorSpace=T.SRGBColorSpace;
   state.scene=new T.Scene();state.scene.add(new T.AmbientLight(0xffffff,2.1));
   const key=new T.DirectionalLight(0xffe7d0,1.5);key.position.set(-35,90,75);state.scene.add(key);
   state.camera=new T.Camera();state.model=null;state.activeId=null;
  },
  render(_gl,args){
   if(!state.enabled||!state.renderer||!state.scene||!state.camera)return;
   const site=selectedSite(state);if(!site)return;
   if(state.activeId!==site.id){
    if(state.model)state.scene.remove(state.model);
    state.model=buildMuseumExhibitScene(T,site);
    state.scene.add(state.model);state.activeId=site.id;
   }
   const projection=args&&(args.defaultProjectionData?.mainMatrix||args.modelViewProjectionMatrix);
   if(!projection||projection.length<16)return;
   let altitude=0;
   try{const z=map.queryTerrainElevation?.(site.coordinates,{exaggerated:false});
       if(z!==null&&z!==undefined&&Number.isFinite(+z))altitude=+z;}catch(_){}
   const matrix=worldMatrix(map,T,site.coordinates,altitude);
   if(!matrix)return;
   state.camera.projectionMatrix.copy(new T.Matrix4().fromArray(projection)).multiply(matrix);
   try{state.renderer.resetState();state.renderer.render(state.scene,state.camera);}
   catch(e){if(!state.warned){state.warned=true;console.warn('BridgePoint museum spacecraft native renderer',e);}}
  },
  onRemove(){try{state.renderer?.dispose();}catch(_){}
   state.renderer=null;state.scene=null;state.camera=null;state.model=null;state.activeId=null;}
 };
 try{map.addLayer(layer);return true;}catch(e){state.layerError=String(e?.message||e);return false;}
}
function maybeLoadGlobe(state){
 if(!state.enabled||!selectedSite(state))return;
 if(state.THREE){ensureLayer(state);return;}
 void getThree().then(T=>{if(!state.destroyed&&state.enabled){state.THREE=T;ensureLayer(state);state.map.triggerRepaint?.();}})
  .catch(e=>console.warn('BridgePoint museum spacecraft geometry unavailable',e));
}
function ensureMarkers(state){
 const Marker=window.maplibregl?.Marker;if(typeof Marker!=='function')return;
 for(const site of SPACECRAFT_MUSEUM_EXHIBITS_V3){
  let entry=state.markers.get(site.id);
  if(!entry){
   const button=document.createElement('button');button.type='button';button.className=ICON_CLASS;
   button.title=site.name+' · BridgePoint 3D model';
   button.setAttribute('aria-label','Open BridgePoint 3D model of '+site.name);
   button.style.setProperty('--bp-museum-accent','#'+site.accent.toString(16).padStart(6,'0'));
   button.innerHTML=site.type==='capsule'?
    '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M16 42 23 16l7-6 7 6 7 26-14 8Z" fill="currentColor" stroke="#ffeac8" stroke-width="2"/><rect x="25" y="25" width="10" height="7" rx="2" fill="#1c3849"/></svg>':
    site.type==='orbiter'?
    '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 5 35 29 53 42v6l-19-6-2 12h-4l-2-12-19 6v-6l18-13Z" fill="currentColor" stroke="#ffeac8" stroke-width="2"/></svg>':
    '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 5 22 23v17L13 50l12-5h10l12 5-9-10V23Z" fill="currentColor" stroke="#ffeac8" stroke-width="2"/><circle cx="30" cy="24" r="4" fill="#143c52"/></svg>';
   button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();if(state.enabled)openCard(state,site);});
   const marker=new Marker({element:button,anchor:'center'}).setLngLat(site.coordinates).addTo(state.map);
   entry={marker,button};state.markers.set(site.id,entry);
  }
  entry.button.hidden=!state.enabled;entry.button.disabled=!state.enabled;
  entry.button.setAttribute('aria-hidden',String(!state.enabled));
 }
}
function showOnGlobe(state,site){
 if(!state.enabled)return false;
 state.selected=site;
 const zoom=site.type==='capsule'?19:17.5;
 try{state.map.flyTo?.({center:site.coordinates,zoom,pitch:68,bearing:24,duration:1100});}
 catch(_){state.map.jumpTo?.({center:site.coordinates,zoom,pitch:68});}
 void getThree().then(T=>{if(state.destroyed||!state.enabled)return;state.THREE=T;ensureLayer(state);state.map.triggerRepaint?.();});
 return true;
}
function openCard(state,site){
 if(!state.enabled||!window.maplibregl?.Popup)return;
 state.popup?.remove();state.selected=site;
 const d=site.dims;
 const specs=site.type==='orbiter'?d.length+' m length · '+d.span+' m wingspan · '+d.height+' m type envelope':
  site.type==='capsule'?d.height+' m height · '+d.diameter+' m diameter':
  d.length+' m full length · '+d.diameter+' m core diameter';
 const html='<article class="bp-museum-card">'+
  '<div class="bp-museum-kicker">BRIDGEPOINT · SPACECRAFT / MUSEUM COLLECTION</div>'+
  '<h3>'+safe(site.name)+'</h3><p>'+safe(site.loc)+'</p>'+
  '<div class="bp-museum-viewer" data-bp-museum-viewer role="group" aria-label="BridgePoint-hosted interactive 3D model of '+safe(site.name)+'">Loading local 3D museum model…</div>'+
  '<div class="bp-museum-buttons"><button type="button" data-bp-museum-reset>Reset 3D view</button><button type="button" data-bp-museum-globe>Show 3D model on Earth</button></div>'+
  '<div class="bp-museum-facts"><span><b>Exhibit</b>'+safe(site.exhibit)+'</span><span><b>Vehicle dimensions</b>'+safe(specs)+'</span>'+
  '<span><b>Display attitude</b>'+safe(site.display)+'</span>'+
  '<span><b>Museum coordinates</b>'+Math.abs(site.coordinates[1]).toFixed(5)+'° '+(site.coordinates[1]>=0?'N':'S')+', '+Math.abs(site.coordinates[0]).toFixed(5)+'° '+(site.coordinates[0]>=0?'E':'W')+'</span></div>'+
  '<p class="bp-museum-description">'+safe(site.description)+'</p>'+
  '<p class="bp-museum-disclosure"><strong>Model provenance:</strong> This is an original BridgePoint-hosted dimensional 3D illustration, not a photogrammetry scan or original manufacturer CAD. Overall vehicle dimensions follow published specifications; surfaces, small parts, markings, support stands and details are illustrative.</p>'+
  '<p class="bp-museum-disclosure"><strong>Globe placement:</strong> The persistent icon is at the approximate real museum location. The model is rendered locally in world metres at terrain elevation, but its relative heading, physical footprint within an indoor gallery, and display mount are not survey-aligned. An object in an indoor museum is shown beside the globe terrain for visibility, not claimed to be physically outside.</p>'+
  '<div class="bp-museum-sources"><b>Exhibit and dimensions</b><a href="'+safe(site.source)+'" target="_blank" rel="noopener noreferrer">Museum exhibit source (external)</a><a href="'+safe(site.specs)+'" target="_blank" rel="noopener noreferrer">Published vehicle specifications (external)</a></div></article>';
 const Popup=window.maplibregl.Popup;
 const popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'520px',className:'bp-museum-popup'}).setLngLat(site.coordinates).setHTML(html).addTo(state.map);
 state.popup=popup;
 popup.getElement?.()?.querySelector('[data-bp-museum-globe]')?.addEventListener('click',()=>showOnGlobe(state,site));
 void mountViewer(popup,site);
}
async function mountViewer(popup,site){
 const root=popup.getElement?.(),host=root?.querySelector('[data-bp-museum-viewer]');if(!host)return;
 let disposed=false,renderer=null,frame=0,observer=null;
 popup.on?.('close',()=>{disposed=true;if(frame)cancelAnimationFrame(frame);observer?.disconnect();try{renderer?.dispose();}catch(_){}});
 try{
  const T=await getThree();if(disposed||!host.isConnected)return;
  const canvas=document.createElement('canvas');canvas.style.touchAction='none';
  canvas.setAttribute('aria-label','Drag to rotate spacecraft; scroll or pinch to zoom');
  host.replaceChildren(canvas);
  renderer=new T.WebGLRenderer({canvas,antialias:false,powerPreference:'low-power'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
  renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene();scene.background=new T.Color(0x061421);
  scene.add(new T.AmbientLight(0xffffff,2.05));
  const key=new T.DirectionalLight(0xffefdb,1.55);key.position.set(-32,85,64);scene.add(key);
  const fill=new T.DirectionalLight(0x8abbdb,.7);fill.position.set(55,20,-48);scene.add(fill);
  const model=buildMuseumExhibitScene(T,site);scene.add(model);
  const b=new T.Box3().setFromObject(model),size=b.getSize(new T.Vector3()),target=b.getCenter(new T.Vector3()),span=Math.max(size.x,size.y,size.z);
  const camera=new T.PerspectiveCamera(38,1,.05,3000);
  let distance=span*1.75,theta=.73,phi=1.12,drag=false,lastX=0,lastY=0,pinchDistance=null;
  const update=()=>{phi=Math.max(.08,Math.min(Math.PI-.08,phi));camera.position.set(
   target.x+distance*Math.sin(phi)*Math.sin(theta),target.y+distance*Math.cos(phi),
   target.z+distance*Math.sin(phi)*Math.cos(theta));camera.lookAt(target);};
  const resize=()=>{if(disposed)return;const w=Math.max(1,host.clientWidth||320),h=Math.max(1,host.clientHeight||250);
   renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};
  const reset=()=>{distance=span*1.75;theta=.73;phi=1.12;update();};
  resize();if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(resize);observer.observe(host);}
  canvas.addEventListener('pointerdown',e=>{drag=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!drag)return;theta-=(e.clientX-lastX)*.009;phi+=(e.clientY-lastY)*.009;lastX=e.clientX;lastY=e.clientY;update();});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{drag=false;pinchDistance=null;});
  canvas.addEventListener('wheel',e=>{e.preventDefault();distance=Math.max(span*.62,Math.min(span*8,distance*Math.exp(e.deltaY*.001)));update();},{passive:false});
  root.querySelector('[data-bp-museum-reset]')?.addEventListener('click',reset);
  reset();let previous=0;
  const draw=t=>{if(disposed)return;if(t-previous>=32){renderer.render(scene,camera);previous=t;}frame=requestAnimationFrame(draw);};
  frame=requestAnimationFrame(draw);
 }catch(e){if(!disposed)host.textContent='BridgePoint local 3D viewer unavailable: '+String(e?.message||e);}
}
function addStyles(){
 if(document.getElementById(STYLE_ID))return;
 const s=document.createElement('style');s.id=STYLE_ID;
 s.textContent='.'+ICON_CLASS+'{display:grid;place-items:center;width:39px;height:39px;border-radius:50%;padding:6px;border:1px solid #ffe3b4;background:radial-gradient(circle,#1b3446,#071523);color:var(--bp-museum-accent,#ecc681);box-shadow:0 0 0 2px #d2b47533,0 2px 10px #000a;cursor:pointer;touch-action:manipulation;z-index:44}'+
  '.'+ICON_CLASS+'[hidden]{display:none!important}.'+ICON_CLASS+' svg{width:26px;height:26px;display:block}.'+ICON_CLASS+':focus-visible{outline:3px solid white;outline-offset:2px}'+
  '.bp-museum-popup .maplibregl-popup-content{background:#06131f;color:#e4f0f9;border:1px solid #dab677;border-radius:12px;padding:12px;width:min(490px,calc(100vw - 38px));max-height:82vh;overflow:auto;font:12px/1.5 system-ui,sans-serif}.bp-museum-popup .maplibregl-popup-tip{border-top-color:#06131f;border-bottom-color:#06131f}'+
  '.bp-museum-card h3{font-size:18px;color:#fff;margin:4px 0}.bp-museum-card p{margin:7px 0;color:#bfcdd6}.bp-museum-kicker{color:#f2d399;font-size:9px;font-weight:900;letter-spacing:.1em}'+
  '.bp-museum-viewer{width:100%;height:255px;display:grid;place-items:center;overflow:hidden;background:#030b15;border:1px solid #746449;border-radius:8px}.bp-museum-viewer canvas{display:block;width:100%;height:100%}'+
  '.bp-museum-buttons{display:flex;gap:7px;flex-wrap:wrap;margin:8px 0}.bp-museum-buttons button{flex:1;min-width:120px;border:1px solid #b79a64;background:#362a22;color:#fff0d1;border-radius:7px;padding:8px;font-size:11px}'+
  '.bp-museum-facts{display:grid;grid-template-columns:1fr 1fr;gap:6px}.bp-museum-facts span{display:grid;gap:3px;padding:7px;border:1px solid #42627870;border-radius:6px}.bp-museum-facts b{font-size:9px;text-transform:uppercase;color:#a8bac8}'+
  '.bp-museum-card .bp-museum-disclosure{font-size:10px;line-height:1.5}.bp-museum-sources{display:grid;gap:5px;font-size:10px}.bp-museum-sources a{color:#f4d1a0;text-decoration:underline}'+
  '@media(max-width:480px){.bp-museum-viewer{height:228px}.bp-museum-popup .maplibregl-popup-content{padding:9px}}';
 document.head.appendChild(s);
}
function readToggle(state){
 const next=state.toggle?.getAttribute('aria-pressed')==='true';
 if(state.enabled===next&&state.markers.size===SPACECRAFT_MUSEUM_EXHIBITS_V3.length)return;
 state.enabled=next;ensureMarkers(state);
 if(next)maybeLoadGlobe(state);else{state.popup?.remove();state.selected=null;}
 state.map.triggerRepaint?.();
}
function bindToggle(state){
 const toggle=document.getElementById(TOGGLE_ID);
 if(!toggle||state.toggle===toggle)return;
 state.toggle=toggle;toggle.addEventListener('click',()=>queueMicrotask(()=>readToggle(state)));
 state.toggleObserver?.disconnect();
 state.toggleObserver=new MutationObserver(()=>readToggle(state));
 state.toggleObserver.observe(toggle,{attributes:true,attributeFilter:['aria-pressed']});readToggle(state);
}
export function initSpacecraftMuseumsRenderer(target){
 const map=target&&(target.map||target);
 if(!map||typeof map.getBounds!=='function'||typeof map.addLayer!=='function')return null;
 if(states.has(map))return states.get(map).api;
 addStyles();
 const state={map,enabled:false,destroyed:false,markers:new Map(),selected:null,model:null,activeId:null,THREE:null,popup:null,toggle:null,toggleObserver:null,bodyObserver:null,renderer:null,scene:null,camera:null};
 const handle=()=>{if(state.enabled){ensureMarkers(state);maybeLoadGlobe(state);map.triggerRepaint?.();}};
 for(const event of ['load','style.load','moveend','zoomend'])map.on?.(event,handle);
 const api={version:3,sites:SPACECRAFT_MUSEUM_EXHIBITS_V3,
  get enabled(){return state.enabled;},
  get stats(){return {count:state.markers.size,enabled:state.enabled,active:state.activeId,layerReady:!!map.getLayer?.(LAYER_ID)};},
  setEnabled(on){state.enabled=!!on;ensureMarkers(state);if(state.enabled)maybeLoadGlobe(state);else{state.selected=null;state.popup?.remove();}map.triggerRepaint?.();return state.enabled;},
  openCard(id){const site=SPACECRAFT_MUSEUM_EXHIBITS_V3.find(s=>s.id===id);if(site&&state.enabled)openCard(state,site);},
  showOnGlobe(id){const site=SPACECRAFT_MUSEUM_EXHIBITS_V3.find(s=>s.id===id);return !!site&&showOnGlobe(state,site);},
  destroy(){state.destroyed=true;state.enabled=false;state.popup?.remove();state.toggleObserver?.disconnect();state.bodyObserver?.disconnect();
   for(const entry of state.markers.values())entry.marker.remove();
   for(const event of ['load','style.load','moveend','zoomend'])map.off?.(event,handle);
   if(map.getLayer?.(LAYER_ID))try{map.removeLayer(LAYER_ID);}catch(_){}
   states.delete(map);document.getElementById(STYLE_ID)?.remove();}
 };
 state.api=api;states.set(map,state);bindToggle(state);
 if(typeof MutationObserver!=='undefined'&&document.body){
  state.bodyObserver=new MutationObserver(()=>{if(!state.toggle?.isConnected)bindToggle(state);});
  state.bodyObserver.observe(document.body,{childList:true,subtree:true});
 }
 return api;
}
