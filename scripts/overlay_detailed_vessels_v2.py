from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1]);key='vessel-marine-detail-v20261124-v2'
ship='bridgepoint-vessel-awareness-v1.js'
allowed={'index.html','app/index.html',ship,'app/'+ship}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def read(n):return (site/n).read_text(encoding='utf-8')
def write(n,s):(site/n).write_text(s,encoding='utf-8')
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('PATCH_ANCHOR '+str(s.count(a))+' '+a[:150])
 return s.replace(a,b,1)
s=read(ship)
s=one(s,'const VERSION=1;','const VERSION=2;')
s=one(s,"const MODEL_LAYER='bp-vessel-3d-models-v1';","""const MODEL_LAYER='bp-vessel-3d-models-v1';
const ICON_SOURCE='bp-vessel-persistent-positions-v2',ICON_LAYER='bp-vessel-class-icons-v2',CLUSTER_LAYER='bp-vessel-clusters-v2';
const retained=new Map(),nameMeshes=new Map();
let modelPlacements=[],iconSignature='',lastMotion=0,motionFrames=0,nameCount=0,visibleModels=0,iconCount=0;
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return(h>>>0)/4294967296};
const hullPalette={cargo:0x194e63,tanker:0x3d4251,passenger:0xf3f4f1,fishing:0x245b85,sail:0xe6e8eb,tug:0x334d59,highspeed:0xdfe8ee,other:0x405d70};""")
# Eight category silhouettes on high-contrast colored circular markers, with count clusters.
a=s.index('function addShipIcon(){');b=s.index('function installSourcesAndLayers(){',a)
s=s[:a]+"""function addShipIcon(){
 if(!map)return;
 for(const kind of Object.keys(colors)){
  const id='bp-vessel-icon-v2-'+kind;if(map.hasImage?.(id))continue;
  const cv=document.createElement('canvas');cv.width=cv.height=64;const c=cv.getContext('2d');if(!c)continue;
  c.lineJoin='round';c.lineCap='round';c.fillStyle='#071b2c';c.strokeStyle='#'+colors[kind].toString(16).padStart(6,'0');
  c.lineWidth=4;c.beginPath();c.arc(32,32,28,0,Math.PI*2);c.fill();c.stroke();
  c.translate(32,32);c.fillStyle='#'+colors[kind].toString(16).padStart(6,'0');c.strokeStyle='#ffffff';c.lineWidth=1.5;
  c.beginPath();
  if(kind==='sail'){c.moveTo(0,-19);c.lineTo(17,8);c.lineTo(-13,8);c.closePath();c.fill();c.stroke();c.fillRect(-18,11,36,4)}
  else{const w=kind==='tug'?13:kind==='highspeed'?7:11;c.moveTo(0,-21);c.quadraticCurveTo(w,-12,w,-2);c.lineTo(w,15);c.quadraticCurveTo(0,20,-w,15);c.lineTo(-w,-2);c.quadraticCurveTo(-w,-12,0,-21);c.closePath();c.fill();c.stroke();c.fillStyle='#112e41';
    if(kind==='cargo'){for(let y=-9;y<13;y+=7)for(let x=-7;x<6;x+=8)c.fillRect(x,y,6,5)}
    else if(kind==='tanker'){for(let y=-9;y<12;y+=8){c.beginPath();c.arc(0,y,4,0,Math.PI*2);c.fill()}}
    else if(kind==='passenger'){for(let y=-8;y<13;y+=5)c.fillRect(-7,y,14,2)}
    else{c.fillRect(-6,-7,12,9);c.fillRect(-3,6,6,5)}
  }
  try{map.addImage(id,c.getImageData(0,0,64,64),{pixelRatio:2})}catch(_){}
 }
}
function addPersistentIcons(){
 if(!map.getSource(ICON_SOURCE))map.addSource(ICON_SOURCE,{type:'geojson',data:EMPTY(),cluster:true,clusterRadius:30,clusterMaxZoom:17});
 if(!map.getLayer(CLUSTER_LAYER))map.addLayer({id:CLUSTER_LAYER,type:'symbol',source:ICON_SOURCE,filter:['has','point_count'],layout:{visibility:'none','icon-image':'bp-vessel-icon-v2-other','icon-size':1.18,'icon-allow-overlap':false,'text-field':['to-string',['get','point_count_abbreviated']],'text-size':11,'text-offset':[0,1.55],'text-allow-overlap':false,'text-font':['Open Sans Bold','Arial Unicode MS Bold'],'text-optional':true},paint:{'text-color':'#fff','text-halo-color':'#071b2c','text-halo-width':2}});
 if(!map.getLayer(ICON_LAYER))map.addLayer({id:ICON_LAYER,type:'symbol',source:ICON_SOURCE,filter:['!', ['has','point_count']],layout:{visibility:'none','icon-image':['get','icon'],'icon-size':['interpolate',['linear'],['zoom'],0,.70,6,.88,14,1.02,20,.78],'icon-rotate':['get','heading'],'icon-rotation-alignment':'map','icon-pitch-alignment':'viewport','icon-allow-overlap':false,'icon-ignore-placement':false,'icon-padding':3,'symbol-sort-key':['get','age_s']},paint:{'icon-opacity':['step',['get','age_s'],1,600,.88,3600,.68,86400,.4]}});
}
function updatePersistentIcons(records){
 const features=records.map(v=>({type:'Feature',id:v.mmsi,geometry:{type:'Point',coordinates:[v.lon,v.lat]},properties:{...v.properties,mmsi:v.mmsi,age_s:v.age,heading:v.heading,icon:'bp-vessel-icon-v2-'+vesselClass(v.type)}}));
 const signature=records.map(v=>v.mmsi+':'+v.lon+':'+v.lat+':'+v.heading+':'+Math.floor(v.age/60)).sort().join('|');
 if(signature!==iconSignature){map.getSource(ICON_SOURCE)?.setData({type:'FeatureCollection',features});iconSignature=signature;iconCount=features.length;}
}
"""+s[b:]
# Source-backed vector layers remain requested, but are invisible so they do not
# compete with the clustered icons or collide with every individual vessel.
s=one(s,"  bindInteractions();applyVisibility();return true;","""  addPersistentIcons();
  for(const id of [STILL_LAYER,MOVING_LAYER])if(map.getLayer(id)){
    map.setPaintProperty(id,id===STILL_LAYER?'circle-opacity':'icon-opacity',0);
    if(id===STILL_LAYER)map.setPaintProperty(id,'circle-stroke-opacity',0);
  }
  bindInteractions();applyVisibility();return true;""")
# Retain the original moving icon image for the transparent provider anchor.
s=one(s," if(!map)return;\n for(const kind of Object.keys(colors)){",""" if(!map)return;
 if(!map.hasImage?.('bp-vessel-arrow-v1')){
   const cv=document.createElement('canvas');cv.width=cv.height=48;const c=cv.getContext('2d');if(c){c.fillStyle='#fff';c.beginPath();c.moveTo(24,4);c.lineTo(42,43);c.lineTo(24,34);c.lineTo(6,43);c.closePath();c.fill();map.addImage('bp-vessel-arrow-v1',c.getImageData(0,0,48,48),{sdf:true})}
 }
 for(const kind of Object.keys(colors)){""")
s=one(s,"[STILL_LAYER,MOVING_LAYER,TRAIL_LAYER,TRAIL_DOT_LAYER,MODEL_LAYER]","[STILL_LAYER,MOVING_LAYER,TRAIL_LAYER,TRAIL_DOT_LAYER,MODEL_LAYER,ICON_LAYER,CLUSTER_LAYER]")
s=one(s," for(const id of [STILL_LAYER,MOVING_LAYER]){\n  map.on('click',id,showVesselDetails);"," for(const id of [ICON_LAYER]){\n  map.on('click',id,showVesselDetails);")
s=one(s," map.__bpVesselInteractionsV1=true;",""" map.on('click',CLUSTER_LAYER,async e=>{const f=e?.features?.[0];if(!f)return;try{const z=await map.getSource(ICON_SOURCE).getClusterExpansionZoom(f.properties.cluster_id);map.easeTo({center:f.geometry.coordinates,zoom:Math.min(20,z+.2)})}catch(_){}});
 map.__bpVesselInteractionsV1=true;""")
# Detailed hull cross-sections: a real tapered bow/stern and a rounded,
# below-water keel with a separate anti-fouling paint and freeboard.
a=s.index(' const hullShape=new T.Shape();');b=s.index(' const mast=',a)
s=s[:a]+""" const hullColor=hullPalette[kind]||hullPalette.other,accent=colors[kind]||colors.other;
 const wide=x=>{const t=clamp((x+.79)/1.58,0,1);return .195*(t<.19?.62+.38*Math.sin(t/.19*Math.PI/2):t>.72?Math.pow(Math.max(0,(1-t)/.28),.75):1)};
 const cross=(x,z)=>wide(x)*(z<0?Math.sqrt(Math.max(.002,1-Math.pow(z/.18,2))):1+.06*z/.105);
 const strips=[[-.18,-.105,0x7f292c],[-.105,-.018,0x9b3831],[-.018,.005,0x263039],[.005,.098,hullColor],[.098,.105,0xe0e5e5]];
 const makeHullStrip=(z0,z1,color)=>{
  const g=new T.BufferGeometry(),p=[],idx=[],nx=48,nz=4;
  for(let j=0;j<=nz;j++)for(let i=0;i<=nx;i++){
   const x=-.79+1.58*i/nx,z=z0+(z1-z0)*j/nz;
   p.push(x,cross(x,z),z);
  }
  for(let j=0;j<nz;j++)for(let i=0;i<nx;i++){const a=j*(nx+1)+i,b=a+nx+1;idx.push(a,b,a+1,a+1,b,b+1)}
  g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(idx);g.computeVertexNormals();
  add(g,[0,0,0],[0,0,0],[1,1,1],color);
  const other=g.clone();other.scale(1,-1,1);add(other,[0,0,0],[0,0,0],[1,1,1],color);
 };
 for(const [lo,hi,c] of strips)makeHullStrip(lo,hi,c);
 const deckShape=new T.Shape();deckShape.moveTo(-.79,0);
 for(let i=0;i<=48;i++){const x=-.79+1.58*i/48;deckShape.lineTo(x,cross(x,.105))}
 for(let i=48;i>=0;i--){const x=-.79+1.58*i/48;deckShape.lineTo(x,-cross(x,.105))}
 deckShape.closePath();
 const deck=new T.ShapeGeometry(deckShape,24);deck.translate(0,0,.105);add(deck,[0,0,0],[0,0,0],[1,1,1],kind==='sail'?0xc6a378:0x88999e);
 const stern=new T.Shape();stern.moveTo(-.11,-.175);stern.lineTo(.11,-.175);stern.lineTo(.123,.105);stern.lineTo(-.123,.105);stern.closePath();
 const sternCap=new T.ShapeGeometry(stern);sternCap.rotateY(Math.PI/2);sternCap.rotateX(Math.PI/2);sternCap.translate(-.79,0,0);add(sternCap,[0,0,0],[0,0,0],[1,1,1],hullColor);
 const hull=new T.ExtrudeGeometry(deckShape,{depth:.10,bevelEnabled:false});hull.translate(0,0,-.06);
 const rail=(x,y,z)=>add(cyl(.0035,.067,7),[x,y,z+.033],[Math.PI/2,0,0],[1,1,1],0xd6dde0);
 for(const side of [-1,1]){
  for(let i=0;i<26;i++){
   const x=-.70+i*.056,y=side*cross(x,.105);rail(x,y,.105);
   if(i<25){const xn=x+.056,yn=side*cross(xn,.105),len=Math.hypot(xn-x,yn-y);add(box(len+.003,.005,.006),[(x+xn)/2,(y+yn)/2,.170],[0,0,Math.atan2(yn-y,xn-x)],[1,1,1],0xdde4e5)}
  }
  for(const x of [-.67,.54]){add(cyl(.015,.025,12),[x,side*.115,.119],[Math.PI/2,0,0],[1,1,1],0x26383d)}
  add(box(.13,.005,.013),[-.52,side*.192,.025],[0,0,0],[1,1,1],0xcfd5d6);
  add(box(.10,.012,.032),[.59,side*.07,.123],[0,0,0],[1,1,1],0x2b3d48);
 }
 add(cyl(.023,.03,16),[.57,0,.125],[Math.PI/2,0,0],[1,1,1],0x45565d);
 add(box(.12,.058,.025),[.60,0,.123],[0,0,0],[1,1,1],0x59666b);
"""+s[b:]
# Raise the original deck-mounted equipment above the actual new deck.
s=one(s,"const parts=[],add=(g,p=[0,0,0],r=[0,0,0],s=[1,1,1],color=colors[kind]||colors.other)=>parts.push({g,p,r,s,color});","const parts=[],add=(g,p=[0,0,0],r=[0,0,0],s=[1,1,1],color=colors[kind]||colors.other)=>parts.push({g,p,r,s,color});")
s=one(s," const mast=(x,y,z,height=.28"," const deckDetailStart=parts.length;\n const mast=(x,y,z,height=.28")
# Add real window panes and frames, deck ventilation, access details, and running lights.
s=one(s,"add(box(length*.84,.012,Math.max(.018,height*.16)),[x,side*(width/2+.006),z+height*.54],[0,0,0],[1,1,1],0x18374a);","""for(let i=0;i<Math.max(3,Math.round(length*15));i++){
    const count=Math.max(3,Math.round(length*15)),w=length*.82/count;
    add(box(w*.82,.009,Math.max(.018,height*.22)),[x-length*.41+(i+.5)*w,side*(width/2+.006),z+height*.65],[0,0,0],[1,1,1],0x18374a);
   }""")
s=one(s," const pipe=(x,y,z,height=.10",""" const glassCabin=cabin;
 const pipe=(x,y,z,height=.10""")
# Forward windshield panels, common detail parts; use the original family-specific cabins.
s=one(s," const positions=[],normals=[],vertexColors=[],indices=[];let offset=0;",""" for(let i=deckDetailStart;i<parts.length;i++)parts[i].p=[parts[i].p[0],parts[i].p[1],parts[i].p[2]+.105];
 const cabinX=kind==='cargo'||kind==='tanker'?-.49:kind==='passenger'?.47:kind==='highspeed'?.43:kind==='tug'?-.19:-.05;
 const cabinZ=kind==='cargo'||kind==='tanker'?.31:kind==='passenger'?.35:kind==='highspeed'?.30:kind==='tug'?.31:.30;
 for(let i=0;i<5;i++)add(box(.006,.037,.051),[cabinX,-.09+i*.045,cabinZ],[0,0,0],[1,1,1],0x18374a);
 add(box(.028,.029,.021),[-.22,-.17,.194],[0,0,0],[1,1,1],0xef4543);
 add(box(.028,.029,.021),[-.22,.17,.194],[0,0,0],[1,1,1],0x25ec8a);
 for(const x of [-.66,.67]){add(cyl(.012,.028,12),[x,0,.12],[Math.PI/2,0,0],[1,1,1],0xcad8da)}
 const positions=[],normals=[],vertexColors=[],glassMask=[],indices=[];let offset=0;""")
s=one(s,"for(let i=0;i<pa.count;i++)vertexColors.push(color.r,color.g,color.b);","for(let i=0;i<pa.count;i++){vertexColors.push(color.r,color.g,color.b);glassMask.push([0x18374a,0x123c55,0x19435a,0x18384c].includes(part.color)?1:0)}")
s=one(s,"merged.setAttribute('color',new T.Float32BufferAttribute(vertexColors,3));","merged.setAttribute('color',new T.Float32BufferAttribute(vertexColors,3));\n merged.setAttribute('shipGlass',new T.Float32BufferAttribute(glassMask,1));")
s=one(s,"const mesh=new THREE.InstancedMesh(geometry,material,Math.max(1,capacity));","""const viewUniform={value:new THREE.Vector3(0,0,1)};
 material.onBeforeCompile=shader=>{
  shader.uniforms.bpShipView=viewUniform;
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\\nattribute float shipGlass;varying float vShipGlass;varying vec3 vShipFacing;').replace('#include <begin_vertex>','#include <begin_vertex>\\nvShipGlass=shipGlass;vShipFacing=normalize(mat3(instanceMatrix)*normal);');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\\nvarying float vShipGlass;varying vec3 vShipFacing;uniform vec3 bpShipView;').replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\\nroughnessFactor=mix(roughnessFactor,0.12,vShipGlass);').replace('#include <dithering_fragment>','float glassReflect=pow(1.0-abs(dot(normalize(vShipFacing),normalize(bpShipView))),2.0);float glint=pow(max(0.0,dot(reflect(-normalize(vec3(-0.5,-0.6,1.0)),normalize(vShipFacing)),normalize(bpShipView))),18.0);gl_FragColor.rgb=mix(gl_FragColor.rgb,vec3(0.30,0.65,0.82),vShipGlass*(0.22+0.42*glassReflect))+vShipGlass*glint*vec3(0.76,0.92,1.0);\\n#include <dithering_fragment>');
 };
 material.customProgramCacheKey=()=> 'bp-vessel-window-glare-v2';
 const mesh=new THREE.InstancedMesh(geometry,material,Math.max(1,capacity));""")
s=one(s,"entry={kind,geometry,material,mesh,capacity:Math.max(1,capacity)};","entry={kind,geometry,material,mesh,viewUniform,capacity:Math.max(1,capacity)};")
# Hull name: a two-sided UV mesh follows the same freeboard curve and is not a
# screen billboard. Text uses the reported name, never an invented name.
a=s.index('function updateModels(records){');b=s.index('function recordsFromTiles(){',a)
s=s[:a]+"""function hullNameGeometry(T){
 const pos=[],uv=[],idx=[],n=24;
 for(const side of [-1,1]){
  const off=pos.length/3;
  for(let j=0;j<2;j++)for(let i=0;i<=n;i++){
   const x=-.47+.89*i/n,z=j?.087:.019,t=clamp((x+.79)/1.58,0,1);
   const w=.195*(t<.19?.62+.38*Math.sin(t/.19*Math.PI/2):t>.72?Math.pow(Math.max(0,(1-t)/.28),.75):1)*(1+.06*z/.105);
   pos.push(x,side*(w+.0015),z);uv.push(side===1?1-i/n:i/n,j);
  }
  for(let i=0;i<n;i++){const a=off+i,b=a+n+1;idx.push(a,a+1,b,a+1,b+1,b)}
 }
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(idx);g.computeVertexNormals();return g;
}
function nameMesh(v,kind){
 const label=String(v.properties?.name||'').trim().toUpperCase().slice(0,80);if(!label)return null;
 let o=nameMeshes.get(v.mmsi);
 if(o&&o.label===label&&o.kind===kind)return o;
 if(o){scene.remove(o.mesh);o.mesh.geometry.dispose();o.mesh.material.map.dispose();o.mesh.material.dispose();nameMeshes.delete(v.mmsi)}
 const c=document.createElement('canvas');c.width=1024;c.height=128;const ctx=c.getContext('2d');if(!ctx)return null;
 ctx.textBaseline='middle';ctx.textAlign='center';ctx.font='900 108px Arial, sans-serif';const width=ctx.measureText(label).width;
 if(width>980)ctx.font='900 '+Math.max(16,Math.floor(108*980/width))+'px Arial, sans-serif';
 ctx.strokeStyle=['passenger','sail','highspeed'].includes(kind)?'#e8f2f7':'#16262e';ctx.fillStyle=['passenger','sail','highspeed'].includes(kind)?'#142d40':'#ffffff';ctx.lineWidth=4;ctx.strokeText(label,512,64);ctx.fillText(label,512,64);
 const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;
 const material=new THREE.MeshBasicMaterial({map:tex,transparent:true,alphaTest:.15,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2});
 const mesh=new THREE.Mesh(hullNameGeometry(THREE),material);mesh.matrixAutoUpdate=false;mesh.frustumCulled=false;mesh.renderOrder=4;scene.add(mesh);
 o={label,kind,mesh};nameMeshes.set(v.mmsi,o);return o;
}
function motionFor(v,t,beam,length){
 // Animation is visual only: AIS geographic positions are never advanced.
 // Read the existing liquid renderer's time/wind/mesh frequency, without
 // writing any water state or modifying its rendering.
 const water=window.__BP_WATER_ENGINE_APP_V6123__||window.__BP_WATER_ENGINE_V6123__;
 const time=Number.isFinite(water?.animationTimeSeconds)?water.animationTimeSeconds:t;
 const wind=clamp(Number(water?.wind?.mph)||12,0,100),phase=hash(v.mmsi)*Math.PI*2;
 const factor=clamp((wind+12)/40,.35,1.5);
 const heave=clamp(beam*.045,.10,1.20)*factor*(.72*Math.sin(time*.86+phase)+.28*Math.sin(time*1.43+phase*.7));
 const roll=(clamp(9/Math.sqrt(Math.max(1,beam)),.8,5)*Math.PI/180)*factor*Math.sin(time*.72+phase);
 const pitch=(clamp(10/Math.sqrt(Math.max(1,length)),.45,3)*Math.PI/180)*factor*Math.sin(time*.91+phase+1);
 return {heave,roll,pitch};
}
function updateModels(records){
 if(!scene||!THREE||!map)return 0;
 const zoom=Number(map.getZoom?.()||0),canvas=map.getCanvas(),w=canvas.clientWidth||canvas.width,h=canvas.clientHeight||canvas.height;
 // Global icons provide the persistent map representation. Detail geometry
 // begins when its true position can be shown in the local projected view.
 const candidates=[];
 for(const v of records){
  let p;try{p=map.project([v.lon,v.lat])}catch(_){continue}
  if(!p||p.x< -160||p.y< -160||p.x>w+160||p.y>h+160)continue;
  candidates.push({v,dist:Math.hypot(p.x-w/2,p.y-h/2)});
 }
 candidates.sort((a,b)=>a.dist-b.dist);
 const max=zoom<5?0:zoom<8?180:matchMedia('(max-width: 760px)').matches?220:480;
 modelPlacements=candidates.slice(0,max).map(({v,dist})=>{
  const kind=vesselClass(v.type),mpp=WORLD_CIRCUMFERENCE_M*Math.max(.12,Math.cos(v.lat*Math.PI/180))/(512*Math.pow(2,Math.max(0,zoom)));
  const defaults={cargo:[175,27],tanker:[205,33],passenger:[130,24],fishing:[25,7],sail:[13,4],tug:[28,9],highspeed:[35,9],other:[45,10]}[kind];
  const length=clamp(Number(v.length)||defaults[0],4,500),beam=clamp(Number(v.beam)||defaults[1],1.5,Math.max(4,length*.65));
  const display=Math.max(length,Math.max(0,12-zoom*.85)*mpp),ratio=display/length;
  const height=kind==='sail'?beam*1.2:kind==='passenger'?beam*.95:kind==='cargo'?beam*.83:kind==='tanker'?beam*.70:beam*.90;
  return {v,kind,length,beam,display,ratio,height,dist,name:zoom>=11&&length/mpp>=16};
 });
 visibleModels=modelPlacements.length;return visibleModels;
}
function animateModels(t,args){
 if(!THREE||!scene||!map)return;
 const MC=window.maplibregl?.MercatorCoordinate||window.MapLibreGL?.MercatorCoordinate;if(!MC?.fromLngLat)return;
 const groups=new Map(),activeNames=new Set(),zoom=map.getZoom(),bearing=map.getBearing()*Math.PI/180,pitch=map.getPitch()*Math.PI/180;
 const view=new THREE.Vector3(Math.sin(bearing)*Math.sin(pitch),Math.cos(bearing)*Math.sin(pitch),Math.cos(pitch));
 const proj=args?.defaultProjectionData;
 const useNativeModel=typeof map.transform?.getMatrixForModel==='function'&&Number(proj?.projectionTransition||0)>.001;
 const namesMax=matchMedia('(max-width: 760px)').matches?36:90;
 let named=0;
 for(const p of modelPlacements){
  const {v,kind,length,beam,display,ratio,height}=p,m=motionFor(v,t,beam,length);
  const yaw=(v.heading||0)*Math.PI/180-Math.PI/2;
  const pos=MC.fromLngLat({lng:v.lon,lat:v.lat},WATERLINE_METERS+m.heave);
  const unit=pos.meterInMercatorCoordinateUnits?.()||0;if(!Number.isFinite(unit)||unit<=0)continue;
  const scale=new THREE.Vector3(display/1.58,beam*ratio/.40,Math.max(2,height)*ratio/.40);
  const q=new THREE.Quaternion().setFromEuler(new THREE.Euler(m.roll,m.pitch,yaw,'ZYX'));
  let matrix;
  if(useNativeModel){
    try{
      const native=map.transform.getMatrixForModel(new window.maplibregl.LngLat(v.lon,v.lat),WATERLINE_METERS+m.heave);
      // MapLibre's model frame is x east, y up, z south. Ship geometry is x east,
      // y south, z up; rotate to the model frame before applying vessel motion.
      matrix=new THREE.Matrix4().fromArray(native).multiply(new THREE.Matrix4().makeRotationX(-Math.PI/2)).multiply(new THREE.Matrix4().compose(new THREE.Vector3(),q,scale));
    }catch(_){matrix=null}
  }
  if(!matrix){scale.multiplyScalar(unit);matrix=new THREE.Matrix4().compose(new THREE.Vector3(pos.x,pos.y,pos.z),q,scale)}
  const list=groups.get(kind)||[];list.push(matrix);groups.set(kind,list);
  if(p.name&&named<namesMax){
   const o=nameMesh(v,kind);if(o){o.mesh.matrix.copy(matrix);o.mesh.matrixWorldNeedsUpdate=true;o.mesh.visible=true;activeNames.add(v.mmsi);named++}
  }
 }
 for(const [kind,matrices] of groups){
  const entry=ensureMesh(kind,matrices.length);entry.viewUniform.value.copy(view);
  for(let i=0;i<matrices.length;i++)entry.mesh.setMatrixAt(i,matrices[i]);
  entry.mesh.count=matrices.length;entry.mesh.instanceMatrix.needsUpdate=true;
 }
 for(const [kind,entry] of templates)if(!groups.has(kind)){entry.mesh.count=0;entry.mesh.instanceMatrix.needsUpdate=true}
 for(const [id,o] of nameMeshes)if(!activeNames.has(id)){scene.remove(o.mesh);o.mesh.geometry.dispose();o.mesh.material.map.dispose();o.mesh.material.dispose();nameMeshes.delete(id)}
 nameCount=named;motionFrames++;
}
"""+s[b:]
# Cache last observed source positions across tile replacements; expire by age,
# no extrapolation. Track only newly reported positions, never animation poses.
a=s.index('function recordsFromTiles(){');b=s.index('function refreshSummary',a)
s=s[:a]+"""function recordsFromTiles(){
 if(!map||!map.getSource(SOURCE))return[];
 let features=[];try{features=map.querySourceFeatures(SOURCE,{sourceLayer:'vessels'})||[]}catch(_){}
 const byId=new Map(),now=Date.now();
 for(const feature of features){const v=normalizeFeature(feature);if(!v)continue;const old=byId.get(v.mmsi);if(!old||v.age<old.age)byId.set(v.mmsi,v)}
 for(const v of byId.values())retained.set(v.mmsi,{v,seen:now,reported:now-v.age*1000});
 for(const [id,r] of retained)if(now-r.seen>15*60*1000||retained.size>24000&&!byId.has(id))retained.delete(id);
 return [...retained.values()].map(r=>({...r.v,age:Math.max(r.v.age,(now-r.reported)/1000)}));
}
"""+s[b:]
s=one(s,"const records=recordsFromTiles();lastRecords=records;updateTracks(records);","const records=recordsFromTiles();lastRecords=records;updateTracks(records);updatePersistentIcons(records);")
# Animate only while the vessel feature is enabled; never clear the shared map.
s=one(s,"   if(!renderer||!scene||!camera)return;\n   const matrix=","   if(!enabled||!renderer||!scene||!camera)return;\n   const matrix=")
s=one(s,"   renderer.render(scene,camera);","""   if(performance.now()-lastMotion>40){lastMotion=performance.now();animateModels(lastMotion/1000,args)}
   renderer.render(scene,camera);
   if(enabled&&modelPlacements.length&&!document.hidden)map.triggerRepaint?.();""")
s=one(s," templates.clear();renderer=null;scene=null;camera=null;customLayer=null;THREE=null;",""" for(const o of nameMeshes.values()){try{scene?.remove(o.mesh);o.mesh.geometry.dispose();o.mesh.material.map.dispose();o.mesh.material.dispose()}catch(_){}}
 nameMeshes.clear();modelPlacements=[];templates.clear();renderer=null;scene=null;camera=null;customLayer=null;THREE=null;""")
s=one(s,"sourceError}),","sourceError,iconCount,visibleModels,nameCount,motionFrames,modelDetail:'type-specific procedural hulls with glass and UV hull names',waterRendererModified:false}),")
s=s.replace("Vessel models sit at sea level and orient from reported heading/course. Model families are based on the transmitted AIS ship-type code; they are not claims of an exact ship identity or exact 3D hull.","Vessel models have submerged hulls, animated rocking and reflective windows, with reported names and dimensions when available. The ship-type models are detailed representations, not verified vessel-specific scans. Movement is visual; AIS positions are never extrapolated.")
# Ensure all existing data provider contracts remain, and no other file changes.
for rel in (ship,'app/'+ship):
 if (site/rel).is_file():write(rel,s)
for rel in ('index.html','app/index.html'):
 old=read(rel);new,n=re.subn(re.escape(ship)+r'\?v=[^&\s\x22\x27]+',ship+'?v='+key,old)
 if n<1:raise SystemExit('missing vessel import '+rel)
 write(rel,new)
if snap()!=before:raise SystemExit('UNRELATED PRODUCTION FILE CHANGED')
print('VESSEL_ONLY_SCOPE_PASS',len(before),'unchanged production files including all water modules')
