/* BridgePoint FAA Obstruction & Tower Layer v1.
 * Coordinates and reported obstruction heights come from FAA Digital Obstacle File.
 * Tower geometry is a detailed illustrative model; FAA DOF does not supply CAD drawings.
 */
const VERSION = 1;
const MAP_STATES = new WeakMap();
let threePromise = null;
const THREE_URL = '/vendor/three.module.js?v=169-local';
const SNAPSHOT_URL = './data/bridgepoint-faa-obstructions-v1.json.gz';
const FAA_SOURCE_URL = 'https://www.faa.gov/air_traffic/flight_info/aeronav/digital_products/dailydof/';
const FAA_DOFDAY_URL = 'https://aeronav.faa.gov/Obst_Data/DAILY_DOF_CSV.ZIP';
const SOURCE_ID = 'bp-faa-obstructions-source-v1';
const CLUSTER_ID = 'bp-faa-obstructions-clusters-v1';
const CLUSTER_ICON_ID = 'bp-faa-obstructions-cluster-icons-v1';
const CLUSTER_COUNT_ID = 'bp-faa-obstructions-cluster-count-v1';
const HALO_ID = 'bp-faa-obstructions-halo-v1';
const MARKER_ID = 'bp-faa-obstructions-markers-v1';
const LABEL_ID = 'bp-faa-obstructions-labels-v1';
const HIT_ID = 'bp-faa-obstructions-hit-v1';
const MODEL_ID = 'bp-faa-obstructions-models-v1';
const MIN_MODEL_ZOOM = 11.4;
const MAX_MODELS = typeof window !== 'undefined' &&
  ((Number(window.innerWidth) || 1024) <= 820 ||
   (typeof navigator !== 'undefined' && Number(navigator.maxTouchPoints) > 0)) ? 7 : 16;
const RAD = Math.PI / 180;
const EMPTY = { type:'FeatureCollection', features:[] };

function finite(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
function positive(value, maximum = 1000000) {
  const n = finite(value);
  return n !== null && n > 0 && n <= maximum ? n : null;
}
function safe(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function textValue(value, fallback = '') {
  const s = String(value === null || value === undefined ? '' : value).trim();
  return s ? s.slice(0, 180) : fallback;
}
function formatNumber(value, digits = 1) {
  const n = finite(value);
  return n === null ? 'Not reported' : n.toLocaleString('en-US',{maximumFractionDigits:digits});
}
function classifyType(value) {
  const type = String(value || '').trim().toUpperCase().replace(/\s+/g,' ');
  if (type === 'T-L TWR' || type === 'T-L TOWER' || type === 'TRANSMISSION TOWER') return 'transmission';
  if (type === 'ANTENNA') return 'antenna';
  if (type === 'CRANE') return 'crane';
  if (type === 'BLDG-TWR' || type === 'BUILDING TOWER') return 'building-lattice';
  if (type === 'CTRL TWR' || type === 'CONTROL TOWER') return 'control-tower';
  if (type === 'TOWER') return 'lattice';
  return 'other';
}
function towerTypeLabel(value) {
  const key = String(value || '').trim().toUpperCase();
  const labels = {
    'TOWER':'Tower / mast',
    'T-L TWR':'Transmission-line tower',
    'T-L TOWER':'Transmission-line tower',
    'ANTENNA':'Antenna structure',
    'CRANE':'Construction crane',
    'BLDG-TWR':'Building-mounted tower',
    'CTRL TWR':'Airport control tower'
  };
  return labels[key] || textValue(value,'FAA obstruction');
}
export function normalizeFAAObstructionRow(row) {
  if (!row) return null;
  const v = Array.isArray(row) ? {
    id:row[0],country:row[1],state:row[2],city:row[3],lat:row[4],lon:row[5],
    type:row[6],quantity:row[7],aglFt:row[8],amslFt:row[9],verification:row[10],
    lighting:row[11],accuracy:row[12],marking:row[13],study:row[14],action:row[15],julianDate:row[16]
  } : row;
  const lat = finite(v.lat), lon = finite(v.lon), aglFt = positive(v.aglFt,100000);
  const category = classifyType(v.type);
  if (lat === null || lon === null || Math.abs(lat) > 85 || Math.abs(lon) > 180 ||
      aglFt === null || category === 'other') return null;
  const aglM = aglFt * 0.3048;
  const amslFt = positive(v.amslFt,100000);
  const id = textValue(v.id,'');
  if (!id) return null;
  const verification = String(v.verification || 'U').trim().toUpperCase() === 'O' ? 'O' : 'U';
  const markerColor = verification === 'O' ? '#65d8e8' : '#f4c66e';
  return {
    type:'Feature',
    id:'faa:'+id,
    geometry:{type:'Point',coordinates:[lon,lat]},
    properties:{
      key:'faa:'+id, faaId:id, country:textValue(v.country,'US'), state:textValue(v.state,''),
      city:textValue(v.city,'Not reported'), type:textValue(v.type,'TOWER'),
      typeLabel:towerTypeLabel(v.type), category:category,
      quantity:positive(v.quantity,100000) || 1,
      aglFt:aglFt, aglM:aglM, amslFt:amslFt, amslM:amslFt === null ? null : amslFt*0.3048,
      verification:verification, verificationLabel:verification === 'O' ? 'Verified by FAA' : 'Unverified FAA record',
      lighting:textValue(v.lighting,'Not reported'),
      accuracy:textValue(v.accuracy,'Not reported'),
      marking:textValue(v.marking,'Not reported'), faaStudy:textValue(v.study,'Not reported'),
      action:textValue(v.action,'Not reported'), julianDate:textValue(v.julianDate,'Not reported'),
      source:'FAA Daily Digital Obstacle File', sourceUrl:FAA_SOURCE_URL,
      geometryNote:'Detailed illustrative 3D tower model; FAA obstruction file provides point coordinates and reported heights, not structural CAD geometry.',
      markerColor:markerColor
    }
  };
}
export function faaObstructionRenderModeForZoom(value) {
  const zoom = Number(value) || 0;
  if (zoom < 5.5) return 'global-tower-clusters';
  if (zoom < MIN_MODEL_ZOOM) return 'ground-positioned-faa-tower-icons';
  return 'reported-height-3d-towers';
}
export function faaObstructionPopupHtml(feature) {
  const p = feature && feature.properties || {};
  const c = feature && feature.geometry && feature.geometry.coordinates || [0,0];
  const verified = p.verification === 'O';
  const rows = [
    ['FAA record',p.faaId || 'Not reported'],
    ['Structure type',p.typeLabel || p.type || 'Not reported'],
    ['Reported height AGL',formatNumber(p.aglFt,0)+' ft · '+formatNumber(p.aglM,1)+' m'],
    ['Elevation AMSL',p.amslFt === null ? 'Not reported' : formatNumber(p.amslFt,0)+' ft · '+formatNumber(p.amslM,1)+' m'],
    ['Quantity',formatNumber(p.quantity,0)],
    ['Location',[p.city,p.state,p.country].filter(Boolean).join(', ')],
    ['FAA verification',p.verificationLabel || 'Not reported'],
    ['Lighting',p.lighting || 'Not reported'],
    ['Marking',p.marking || 'Not reported'],
    ['FAA accuracy',p.accuracy || 'Not reported'],
    ['FAA study',p.faaStudy || 'Not reported'],
    ['FAA action',p.action || 'Not reported'],
    ['Record date (Julian)',p.julianDate || 'Not reported'],
    ['Coordinates',formatNumber(c[1],6)+'°, '+formatNumber(c[0],6)+'°']
  ];
  return '<div class="bp-faa-popup-v1">'+
    '<div class="bp-faa-kicker-v1">FAA DIGITAL OBSTACLE FILE</div>'+
    '<h3>'+safe(p.typeLabel || p.type || 'FAA obstruction')+'</h3>'+
    '<div class="bp-faa-status-v1 '+(verified?'verified':'unverified')+'">'+
      safe(p.verificationLabel || 'Verification not reported')+'</div>'+
    '<div class="bp-faa-grid-v1">'+rows.map(r=>'<div><span>'+safe(r[0])+'</span><b>'+safe(r[1])+'</b></div>').join('')+'</div>'+
    '<p class="bp-faa-note-v1">The FAA file contains known obstacles relevant to aviation charting, not every tower or obstruction. Unverified records may have unreliable position or height. The 3D lattice shape is illustrative; the displayed AGL height and mapped point are the FAA record values.</p>'+
    '<p class="bp-faa-source-v1"><a href="'+FAA_SOURCE_URL+'" target="_blank" rel="noopener noreferrer">FAA DOF source and coverage notes</a></p>'+
    '</div>';
}
function makeTowerIcon() {
  const canvas = document.createElement('canvas');
  canvas.width = 64; canvas.height = 64;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0,0,64,64);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(32,5); ctx.lineTo(10,58);
  ctx.moveTo(32,5); ctx.lineTo(54,58);
  ctx.moveTo(17,42); ctx.lineTo(47,42);
  ctx.moveTo(22,29); ctx.lineTo(42,29);
  ctx.moveTo(26,18); ctx.lineTo(38,18);
  ctx.moveTo(13,52); ctx.lineTo(51,52);
  ctx.moveTo(10,58); ctx.lineTo(54,58);
  ctx.moveTo(17,42); ctx.lineTo(42,29);
  ctx.moveTo(47,42); ctx.lineTo(22,29);
  ctx.moveTo(22,29); ctx.lineTo(38,18);
  ctx.moveTo(42,29); ctx.lineTo(26,18);
  ctx.stroke();
  ctx.beginPath(); ctx.arc(32,5,3.2,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  return ctx.getImageData(0,0,64,64);
}
function modelMatrixFor(map,THREE,coordinate,altitude) {
  try {
    const raw = map.transform && typeof map.transform.getMatrixForModel === 'function'
      ? map.transform.getMatrixForModel([Number(coordinate[0]),Number(coordinate[1])],Number(altitude)||0) : null;
    if (raw && raw.length >= 16) return new THREE.Matrix4().fromArray(raw);
    const Mercator = window.maplibregl && window.maplibregl.MercatorCoordinate;
    if (!Mercator || typeof Mercator.fromLngLat !== 'function') return null;
    const mc = Mercator.fromLngLat([Number(coordinate[0]),Number(coordinate[1])],Number(altitude)||0);
    const metres = mc.meterInMercatorCoordinateUnits();
    if (![mc.x,mc.y,mc.z,metres].every(Number.isFinite) || metres <= 0) return null;
    return new THREE.Matrix4().set(
      metres,0,0,mc.x,
      0,0,metres,mc.y,
      0,metres,0,mc.z,
      0,0,0,1
    );
  } catch (_) { return null; }
}
function addBeam(THREE,parent,a,b,radius,material,segments=7) {
  const start = new THREE.Vector3(a[0],a[1],a[2]);
  const end = new THREE.Vector3(b[0],b[1],b[2]);
  const direction = new THREE.Vector3().subVectors(end,start);
  const length = direction.length();
  if (!Number.isFinite(length) || length < 0.01) return null;
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,segments,1,false),material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  mesh.frustumCulled = false;
  parent.add(mesh);
  return mesh;
}
function addBox(THREE,parent,w,h,d,position,material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(position[0],position[1],position[2]);
  mesh.frustumCulled = false;
  parent.add(mesh);
  return mesh;
}
function addLadder(THREE,root,height,width,material,accent) {
  const faceZ = -width*0.55;
  const x1 = -width*0.22, x2 = width*0.22;
  const top = height*0.79, bottom = Math.min(2.5,height*0.05);
  addBeam(THREE,root,[x1,bottom,faceZ],[x1*0.56,top,faceZ*0.56],0.105,material);
  addBeam(THREE,root,[x2,bottom,faceZ],[x2*0.56,top,faceZ*0.56],0.105,material);
  const rungs = Math.max(4,Math.floor((top-bottom)/1.55));
  for(let i=0;i<=rungs;i++) {
    const t=i/rungs,y=bottom+(top-bottom)*t,w=width*(0.22*(1-t)+0.12*t);
    const z=faceZ*(1-t)+faceZ*0.56*t;
    addBeam(THREE,root,[-w,y,z],[w,y,z],0.075,accent);
  }
  for(let i=0;i<4;i++) {
    const y=top-2.7+i*0.85;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(width*0.28,0.075,5,20),material);
    ring.rotation.x=Math.PI/2;
    ring.position.set(0,y,-width*0.04);
    ring.frustumCulled=false;
    root.add(ring);
  }
}
function addPlatform(THREE,root,y,width,material,accent) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(width*0.40,0.12,6,28),material);
  ring.rotation.x=Math.PI/2; ring.position.y=y; ring.frustumCulled=false; root.add(ring);
  const railY=y+1.05;
  const rail = new THREE.Mesh(new THREE.TorusGeometry(width*0.42,0.055,5,28),accent);
  rail.rotation.x=Math.PI/2; rail.position.y=railY; rail.frustumCulled=false; root.add(rail);
  for(let i=0;i<8;i++) {
    const a=i*Math.PI/4,x=Math.cos(a)*width*0.42,z=Math.sin(a)*width*0.42;
    addBeam(THREE,root,[x,y,z],[x,railY,z],0.055,accent);
  }
}
function buildLatticeTower(THREE,feature) {
  const p=feature.properties||{};
  const height=Math.max(6,Math.min(5000,Number(p.aglM)||30));
  const isTransmission=p.category==='transmission';
  const isCrane=p.category==='crane';
  const baseWidth=Math.max(2.6,Math.min(isTransmission?28:18,height*(isTransmission?0.19:0.145)));
  const topWidth=Math.max(0.72,Math.min(4.2,height*0.022));
  const rail=Math.max(0.12,Math.min(0.82,height*0.0065));
  const root=new THREE.Group();
  root.name='FAA '+String(p.type||'TOWER')+' '+String(p.faaId||'');
  root.matrixAutoUpdate=false;
  const steel=new THREE.MeshStandardMaterial({color:0xabb9bf,roughness:0.62,metalness:0.78,side:THREE.DoubleSide});
  const dark=new THREE.MeshStandardMaterial({color:0x53646c,roughness:0.55,metalness:0.7});
  const light=new THREE.MeshStandardMaterial({color:0xe4edf0,roughness:0.46,metalness:0.55});
  const red=new THREE.MeshStandardMaterial({color:0xf13f42,roughness:0.45,metalness:0.12,emissive:0x7e1013,emissiveIntensity:0.85});
  addBox(THREE,root,baseWidth*0.84,0.75,baseWidth*0.84,[0,0.36,0],dark);
  const feet=[];
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
  const levels=Math.max(5,Math.min(11,Math.ceil(height/18)));
  for(let i=0;i<=levels;i++) {
    const t=i/levels,y=height*t;
    const width=baseWidth*(1-t)+topWidth*t;
    feet.push(corners.map(c=>[c[0]*width*0.5,y,c[1]*width*0.5]));
  }
  for(let side=0;side<4;side++) {
    for(let i=0;i<levels;i++) addBeam(THREE,root,feet[i][side],feet[i+1][side],rail*1.5,steel,8);
    for(let i=0;i<levels;i++) {
      const a=feet[i][side],b=feet[i][(side+1)%4],c=feet[i+1][(side+1)%4],d=feet[i+1][side];
      addBeam(THREE,root,a,b,rail,dark);
      addBeam(THREE,root,d,c,rail,dark);
      addBeam(THREE,root,a,c,rail*0.78,light);
      addBeam(THREE,root,b,d,rail*0.78,light);
    }
  }
  for(let i=0;i<=levels;i+=2) {
    const row=feet[i];
    for(let side=0;side<4;side++) addBeam(THREE,root,row[side],row[(side+1)%4],rail*0.9,steel);
  }
  addLadder(THREE,root,height,baseWidth,steel,dark);
  if(height>32) addPlatform(THREE,root,height*0.70,baseWidth*(0.30),steel,dark);
  if(height>55) addPlatform(THREE,root,height*0.88,baseWidth*(0.20),steel,dark);
  if(isTransmission) {
    for(const y of [height*0.58,height*0.72,height*0.84]) {
      const armWidth=baseWidth*(y/height)*1.25;
      addBeam(THREE,root,[-armWidth,y,0],[armWidth,y,0],rail*2.4,steel,8);
      addBeam(THREE,root,[0,y,0],[0,y+Math.min(4,height*0.07),0],rail*1.4,dark,8);
      for(const side of [-1,1]) for(let j=0;j<3;j++) {
        const x=side*armWidth*(0.48+j*0.22);
        addBeam(THREE,root,[x,y,-0.35],[x,y-2.3,-0.35],0.105,dark);
        addBox(THREE,root,0.34,1.25,0.34,[x,y-1.0,-0.35],light);
      }
    }
  } else if(isCrane) {
    const jibY=height*0.925;
    const mainBoom=Math.max(baseWidth*2.8,height*0.44);
    const counterBoom=mainBoom*0.38;
    const boomDepth=Math.max(1.1,baseWidth*0.12);
    addBox(THREE,root,baseWidth*0.72,height*0.07,baseWidth*0.72,[0,height*0.87,0],dark);
    addBeam(THREE,root,[-counterBoom,jibY-1.0,0],[mainBoom,jibY-1.0,0],rail*2.3,steel,8);
    addBeam(THREE,root,[-counterBoom,jibY+0.5,0],[mainBoom,jibY+0.5,0],rail*1.8,steel,8);
    addBeam(THREE,root,[-counterBoom,jibY-1.0,-boomDepth],[mainBoom,jibY-1.0,-boomDepth],rail,dark,8);
    addBeam(THREE,root,[-counterBoom,jibY-1.0,boomDepth],[mainBoom,jibY-1.0,boomDepth],rail,dark,8);
    for(let i=0;i<10;i++) {
      const t=i/10,x=-counterBoom+(mainBoom+counterBoom)*t;
      const nextX=-counterBoom+(mainBoom+counterBoom)*(t+0.1);
      const y0=jibY-1.0,y1=jibY+0.5;
      addBeam(THREE,root,[x,y0,-boomDepth],[nextX,y1,-boomDepth],rail*0.72,light);
      addBeam(THREE,root,[x,y1,boomDepth],[nextX,y0,boomDepth],rail*0.72,light);
    }
    addBeam(THREE,root,[0,jibY+0.5,0],[0,height,0],rail*1.8,dark);
    addBeam(THREE,root,[-counterBoom,jibY+0.5,0],[-counterBoom*0.7,jibY+height*0.055,0],rail,dark);
    addBox(THREE,root,counterBoom*0.65,1.7,boomDepth*2.5,[-counterBoom*0.72,jibY-0.9,0],dark);
    const trolley=addBox(THREE,root,2.8,1.5,boomDepth*2.8,[mainBoom*0.72,jibY-0.25,0],light);
    addBeam(THREE,root,[mainBoom*0.72,jibY-0.9,0],[mainBoom*0.72,jibY-Math.min(height*0.35,24),0],0.095,dark);
    addBeam(THREE,root,[mainBoom*0.72-0.65,jibY-Math.min(height*0.35,24),0],
      [mainBoom*0.72+0.65,jibY-Math.min(height*0.35,24),0],0.18,dark);
    addBeam(THREE,root,[mainBoom*0.72,jibY-0.25,0],[mainBoom*0.72,jibY+0.4,0],0.11,light);
  } else {
    const antennaY=height*0.86;
    addBeam(THREE,root,[0,antennaY,0],[0,height,0],0.14,light,8);
    for(let j=0;j<4;j++) {
      const y=height*(0.68+j*0.055);
      for(let side=0;side<4;side++) {
        const angle=side*Math.PI/2;
        const x=Math.cos(angle)*(topWidth*1.3),z=Math.sin(angle)*(topWidth*1.3);
        const panel=addBox(THREE,root,0.42,Math.max(1.7,height*0.028),0.20,[x,y,z],light);
        panel.rotation.y=angle;
        addBeam(THREE,root,[0,y-0.5,0],[x,y,z],0.075,dark);
      }
    }
    for(const side of [-1,1]) {
      const dishY=height*0.63;
      const dish= new THREE.Mesh(new THREE.CylinderGeometry(1.05,1.05,0.10,24),light);
      dish.rotation.x=Math.PI/2;
      dish.position.set(side*topWidth*1.6,dishY,-topWidth*0.65);
      dish.frustumCulled=false;root.add(dish);
      addBeam(THREE,root,[side*topWidth*1.1,dishY,-topWidth*0.25],[side*topWidth*1.6,dishY,-topWidth*0.65],0.09,dark);
    }
  }
  if(String(p.lighting||'').toUpperCase()!=='N' && String(p.lighting||'').toUpperCase()!=='NOT REPORTED') {
    for(const y of [height*0.45,height*0.78,height]) {
      const lamp=new THREE.Mesh(new THREE.SphereGeometry(Math.max(0.28,height*0.006),10,8),red);
      lamp.position.set(0,y,0);lamp.frustumCulled=false;root.add(lamp);
    }
  }
  return {root,coordinate:feature.geometry.coordinates,groundElevationM:null,heightM:height,feature};
}
function buildControlTower(THREE,feature) {
  const p=feature.properties||{},height=Math.max(8,Math.min(600,Number(p.aglM)||40));
  const root=new THREE.Group();root.name='FAA control tower '+String(p.faaId||'');root.matrixAutoUpdate=false;
  const concrete=new THREE.MeshStandardMaterial({color:0x8d999f,roughness:0.86});
  const glass=new THREE.MeshStandardMaterial({color:0x3d879b,roughness:0.22,metalness:0.32,emissive:0x12323c});
  const dark=new THREE.MeshStandardMaterial({color:0x49565e,roughness:0.72,metalness:0.38});
  addBox(THREE,root,8,1.2,8,[0,0.6,0],dark);
  const shaft=new THREE.Mesh(new THREE.BoxGeometry(4.6,height*0.75,4.6),concrete);
  shaft.position.y=height*0.39+1;shaft.frustumCulled=false;root.add(shaft);
  addBox(THREE,root,7,height*0.12,7,[0,height*0.82,0],dark);
  const cab=addBox(THREE,root,8.8,height*0.10,8.8,[0,height*0.93,0],glass);
  addBox(THREE,root,9.2,Math.max(0.18,height*0.02),9.2,[0,height*0.99,0],dark);
  for(let i=0;i<4;i++) {
    const a=i*Math.PI/2;
    addBeam(THREE,root,[Math.cos(a)*4.3,height*0.88,Math.sin(a)*4.3],
      [Math.cos(a)*4.3,height*0.98,Math.sin(a)*4.3],0.10,dark);
  }
  return {root,coordinate:feature.geometry.coordinates,groundElevationM:null,heightM:height,feature};
}
function buildTowerModel(THREE,feature) {
  return feature.properties.category==='control-tower'
    ? buildControlTower(THREE,feature) : buildLatticeTower(THREE,feature);
}
function disposeObject(root) {
  if(!root)return;
  root.traverse(o=>{
    if(o.geometry&&o.geometry.dispose)o.geometry.dispose();
    if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])if(m&&m.dispose)m.dispose();
  });
}
async function loadSnapshot() {
  if(typeof DecompressionStream!=='function')throw new Error('Browser gzip decompression is unavailable');
  const url=new URL(SNAPSHOT_URL,import.meta.url);
  const response=await fetch(url.href,{mode:'cors',credentials:'omit',cache:'no-cache'});
  if(!response.ok)throw new Error('FAA obstruction snapshot HTTP '+response.status);
  if(!response.body)throw new Error('FAA obstruction snapshot returned an empty body');
  const stream=response.body.pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).json();
}
function updateStatus(state,message) {
  state.status=message;
  const el=document.getElementById('bp-faa-obstructions-status-v1');
  if(el)el.textContent=message;
  refreshCounts(state);
}
function refreshCounts(state) {
  const count=document.getElementById('bp-faa-obstructions-count-v1');
  if(count)count.textContent=state.stats.total.toLocaleString('en-US')+' FAA tower/antenna obstructions · '+state.stats.verified.toLocaleString('en-US')+' verified · '+state.stats.unverified.toLocaleString('en-US')+' unverified';
  const button=document.getElementById('bp-faa-obstructions-toggle-v1');
  if(button) {
    button.setAttribute('aria-pressed',String(state.enabled));
    button.classList.toggle('is-active',state.enabled);
  }
}
function refreshStatusUi(state) {
  updateStatus(state,state.status);
}
function addControlGroup(state) {
  const dock=document.getElementById('bpv-dock-actions');
  if(!dock)return false;
  if(document.getElementById('bp-faa-obstructions-control-v1'))return true;
  const group=document.createElement('section');
  group.id='bp-faa-obstructions-control-v1';
  group.className='bpv-command-group';
  group.setAttribute('data-bpv-command-section','faa-obstructions');
  group.setAttribute('aria-label','FAA obstruction and tower inventory');
  group.innerHTML=
    '<div class="bpv-command-heading"><span class="bpv-command-heading-icon" aria-hidden="true">🗼</span>'+
    '<span><b>FAA OBSTRUCTIONS &amp; TOWERS</b><small>FAA-listed cranes, cell/radio towers, antennas and transmission structures · U.S. plus limited surrounding coverage</small></span></div>'+
    '<div class="bpv-command-grid"><button id="bp-faa-obstructions-toggle-v1" type="button" class="bpv-command-btn" aria-pressed="false" title="Show FAA obstruction locations and detailed ground-anchored 3D tower models">'+
    '<span class="bpv-command-icon" aria-hidden="true">🗼</span><span class="bpv-command-label">FAA Towers</span></button></div>'+
    '<div id="bp-faa-obstructions-count-v1" class="bpv-data-note">Not loaded · select to load the FAA Daily Digital Obstacle File</div>'+
    '<div id="bp-faa-obstructions-status-v1" class="bpv-data-note">Layer off · all other BridgePoint layers remain unchanged</div>'+
    '<div class="bpv-data-note">FAA DOF coverage is not global or exhaustive. Verified and unverified records are distinguished. Tower lattice geometry is illustrative; reported FAA heights are preserved.</div>'+
    '<style id="bp-faa-obstructions-style-v1">'+
    '#bp-faa-obstructions-control-v1 .bpv-data-note{font:600 10px/1.45 system-ui,sans-serif;color:#9bb7c6;margin:5px 2px;overflow-wrap:anywhere}'+
    '#bp-faa-obstructions-toggle-v1.is-active{border-color:rgba(101,216,232,.82);background:rgba(24,92,109,.48);box-shadow:inset 0 0 0 1px rgba(101,216,232,.22)}'+
    '.bp-faa-popup-wrap-v1 .maplibregl-popup-content{background:#071522;color:#e6f6fb;border:1px solid rgba(101,216,232,.44);border-radius:12px;padding:13px;font:12px/1.45 system-ui,sans-serif;max-height:min(76vh,680px);overflow:auto}'+
    '.bp-faa-popup-v1 h3{font-size:16px;margin:3px 0 9px;color:#fff}.bp-faa-kicker-v1{font-size:9px;letter-spacing:.12em;color:#65d8e8;font-weight:800}'+
    '.bp-faa-grid-v1{display:grid;grid-template-columns:minmax(118px,.8fr) minmax(130px,1.2fr);gap:6px 10px}.bp-faa-grid-v1>div{display:contents}.bp-faa-grid-v1 span{color:#8ca9b9}.bp-faa-grid-v1 b{color:#e9f5fa;font-weight:650;overflow-wrap:anywhere}'+
    '.bp-faa-note-v1{color:#a8c0cd;border-top:1px solid rgba(143,182,201,.14);padding-top:8px;margin:10px 0 0}.bp-faa-source-v1{margin-top:9px}.bp-faa-source-v1 a{color:#8de2ed}.bp-faa-status-v1{font-weight:800;padding:5px 7px;border-radius:6px;margin:5px 0 9px;background:rgba(255,255,255,.06)}.bp-faa-status-v1.verified{color:#8de2ed}.bp-faa-status-v1.unverified{color:#ffca71}'+
    '</style>';
  const solar=document.getElementById('bp-solar-fields-control-v1');
  const wind=document.getElementById('bp-wind-turbines-control-v1');
  if(solar&&solar.parentNode===dock)solar.after(group);
  else if(wind&&wind.parentNode===dock)wind.after(group);
  else dock.appendChild(group);
  group.querySelector('#bp-faa-obstructions-toggle-v1')
    .addEventListener('click',()=>{void setEnabled(state,!state.enabled);});
  refreshStatusUi(state);
  return true;
}
function installLayers(state) {
  const map=state.map;
  if(!map||!map.getStyle?.())return false;
  try {
    if(!map.getSource(SOURCE_ID))map.addSource(SOURCE_ID,{
      type:'geojson',data:state.collection,cluster:true,clusterRadius:28,clusterMaxZoom:6,maxzoom:12,
      attribution:'Federal Aviation Administration · Daily Digital Obstacle File'
    });
    const add=(id,layer)=>{if(!map.getLayer(id))map.addLayer(layer);};
    if(!map.hasImage?.('bp-faa-tower-icon-v1'))map.addImage('bp-faa-tower-icon-v1',makeTowerIcon(),{pixelRatio:2,sdf:true});
    add(CLUSTER_ID,{id:CLUSTER_ID,type:'circle',source:SOURCE_ID,filter:['has','point_count'],minzoom:0,maxzoom:6.5,
      paint:{'circle-color':'#1f6272','circle-radius':['step',['get','point_count'],12,25,16,120,22,500,28,2000,34],
        'circle-stroke-color':'#c4f5fa','circle-stroke-width':1.35,'circle-opacity':0.96}});
    add(CLUSTER_ICON_ID,{id:CLUSTER_ICON_ID,type:'symbol',source:SOURCE_ID,filter:['has','point_count'],minzoom:0,maxzoom:6.1,
      layout:{'icon-image':'bp-faa-tower-icon-v1','icon-size':['interpolate',['linear'],['zoom'],0,0.25,2.5,0.39,5.5,0.56],
        'icon-anchor':'center','icon-allow-overlap':true,'icon-ignore-placement':true,'icon-padding':0},
      paint:{'icon-color':'#e3fbff','icon-opacity':1}});
    add(CLUSTER_COUNT_ID,{id:CLUSTER_COUNT_ID,type:'symbol',source:SOURCE_ID,filter:['has','point_count'],minzoom:0,maxzoom:6.5,
      layout:{'text-field':['get','point_count_abbreviated'],'text-font':['Open Sans Bold','Arial Unicode MS Bold'],
        'text-size':['interpolate',['linear'],['zoom'],0,8,5.5,12],'text-allow-overlap':true,'text-ignore-placement':true},
      paint:{'text-color':'#07161d','text-halo-color':'#d9f9fb','text-halo-width':0.5}});
    add(HALO_ID,{id:HALO_ID,type:'circle',source:SOURCE_ID,filter:['!',['has','point_count']],minzoom:5.4,maxzoom:13,
      paint:{'circle-radius':['interpolate',['linear'],['zoom'],5.4,4,9,7,12.8,11],
        'circle-color':['get','markerColor'],'circle-opacity':0.46,'circle-blur':0.35}});
    add(MARKER_ID,{id:MARKER_ID,type:'symbol',source:SOURCE_ID,filter:['!',['has','point_count']],minzoom:5.2,maxzoom:12.4,
      layout:{'icon-image':'bp-faa-tower-icon-v1',
        'icon-size':['interpolate',['linear'],['zoom'],5.2,0.28,8,0.48,11.5,0.73,12.4,0.84],
        'icon-anchor':'bottom','icon-pitch-alignment':'map','icon-rotation-alignment':'map',
        'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-padding':0},
      paint:{'icon-color':['get','markerColor'],'icon-opacity':1}});
    add(LABEL_ID,{id:LABEL_ID,type:'symbol',source:SOURCE_ID,filter:['!',['has','point_count']],minzoom:14,maxzoom:24,
      layout:{'text-field':['concat',['get','type'],' · ',['get','aglFt'],' ft'],
        'text-font':['Open Sans Semibold','Arial Unicode MS Bold'],
        'text-size':['interpolate',['linear'],['zoom'],14,9,17,12,20,14],
        'text-offset':[0,1.1],'text-anchor':'top','text-optional':true,
        'text-allow-overlap':false,'text-ignore-placement':false},
      paint:{'text-color':'#f4fbfd','text-halo-color':'#071522','text-halo-width':1.6}});
    add(HIT_ID,{id:HIT_ID,type:'circle',source:SOURCE_ID,filter:['!',['has','point_count']],minzoom:10.5,maxzoom:24,
      paint:{'circle-radius':19,'circle-color':'#ffffff','circle-opacity':0.001,'circle-stroke-width':0}});
    if(state.THREE)installModelLayer(state);
    setVisibility(state,state.enabled);
    return true;
  } catch(error) {
    state.stats.lastError=String(error&&error.message||error);
    console.warn('BridgePoint FAA obstruction map layers unavailable',error);
    return false;
  }
}
function setVisibility(state,on) {
  for(const id of [CLUSTER_ID,CLUSTER_ICON_ID,CLUSTER_COUNT_ID,HALO_ID,MARKER_ID,LABEL_ID,HIT_ID,MODEL_ID]) {
    try {if(state.map.getLayer(id))state.map.setLayoutProperty(id,'visibility',on?'visible':'none');} catch (_) {}
  }
}
function modelCandidates(state) {
  if(Number(state.map.getZoom()||0)<MIN_MODEL_ZOOM)return [];
  const bounds=state.map.getBounds&&state.map.getBounds();
  const center=state.map.getCenter&&state.map.getCenter();
  if(!bounds||!center)return [];
  const rows=[];
  for(const feature of state.collection.features) {
    const c=feature.geometry.coordinates;
    try {if(!bounds.contains(c))continue;} catch (_) {continue;}
    const cos=Math.max(0.12,Math.cos(c[1]*RAD));
    const dx=(c[0]-center.lng)*111320*cos,dy=(c[1]-center.lat)*110540;
    const height=Number(feature.properties.aglM)||10;
    rows.push({feature,score:(dx*dx+dy*dy)/(1+Math.min(500,height)*0.004)});
  }
  rows.sort((a,b)=>a.score-b.score);
  return rows.slice(0,MAX_MODELS).map(x=>x.feature);
}
function rebuildModels(state) {
  if(!state.THREE||!state.scene||state.dead)return;
  const rows=modelCandidates(state),signature=rows.map(f=>f.id).join('|');
  if(signature===state.modelSignature)return;
  for(const item of state.models){state.scene.remove(item.root);disposeObject(item.root);}
  state.models=[];state.modelSignature=signature;
  for(const feature of rows) {
    try {const item=buildTowerModel(state.THREE,feature);state.scene.add(item.root);state.models.push(item);}
    catch(error){console.warn('BridgePoint FAA tower model skipped',feature.id,error);}
  }
  state.stats.models=state.models.length;
}
function installModelLayer(state) {
  const map=state.map;
  if(map.getLayer(MODEL_ID)||state.layerInstalling)return;
  state.layerInstalling=true;
  const THREE=state.THREE;
  const layer={
    id:MODEL_ID,type:'custom',renderingMode:'3d',
    onAdd(mapRef,gl) {
      if(state.renderer)return;
      const renderer=new THREE.WebGLRenderer({canvas:mapRef.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});
      renderer.autoClear=false;renderer.outputColorSpace=THREE.SRGBColorSpace;
      state.renderer=renderer;state.camera=new THREE.Camera();state.scene=new THREE.Scene();
      state.scene.add(new THREE.AmbientLight(0xffffff,1.25));
      const key=new THREE.DirectionalLight(0xf1fbff,1.55);key.position.set(-0.75,1.9,0.8);state.scene.add(key);
      const fill=new THREE.DirectionalLight(0x8cd8e5,0.55);fill.position.set(0.7,0.9,-0.8);state.scene.add(fill);
      state.stats.layerReady=true;rebuildModels(state);
    },
    render(gl,args) {
      if(!state.enabled||!state.renderer||!state.scene||!state.camera)return;
      const raw=args&&(args.defaultProjectionData&&args.defaultProjectionData.mainMatrix||args.modelViewProjectionMatrix);
      if(!raw||raw.length<16)return;
      const projection=new THREE.Matrix4().fromArray(raw);
      let drew=false;
      for(const item of state.models)item.root.visible=false;
      if(Number(map.getZoom()||0)>=MIN_MODEL_ZOOM)for(const item of state.models) {
        if(item.groundElevationM===null) {
          try {
            const terrain=map.queryTerrainElevation&&map.queryTerrainElevation(
              {lng:item.coordinate[0],lat:item.coordinate[1]},{exaggerated:false});
            if(Number.isFinite(terrain))item.groundElevationM=terrain;
          } catch (_) {}
          if(item.groundElevationM===null)item.groundElevationM=0;
        }
        const matrix=modelMatrixFor(map,THREE,item.coordinate,item.groundElevationM);
        if(!matrix)continue;
        item.root.visible=true;
        state.camera.projectionMatrix.copy(projection).multiply(matrix);
        try {state.renderer.resetState();state.renderer.render(state.scene,state.camera);drew=true;}
        catch(error) {
          if(!state.renderWarned){state.renderWarned=true;console.warn('BridgePoint FAA tower 3D renderer',error);}
        } finally {item.root.visible=false;}
      }
      if(drew&&!state.repaintTimer&&!document.hidden) {
        state.repaintTimer=setTimeout(()=>{state.repaintTimer=0;if(!state.dead&&state.enabled&&!document.hidden)map.triggerRepaint?.();},100);
      }
    },
    onRemove() {
      try {if(state.renderer)state.renderer.dispose();} catch (_) {}
      state.renderer=null;state.camera=null;state.scene=null;
      state.stats.layerReady=false;state.layerInstalling=false;
    }
  };
  try {map.addLayer(layer);state.stats.layerReady=!!map.getLayer(MODEL_ID);}
  catch(error){state.stats.lastError=String(error&&error.message||error);console.warn('BridgePoint FAA tower model layer attach failed',error);}
  finally {state.layerInstalling=false;}
}
function loadThree() {
  if(!threePromise)threePromise=import(THREE_URL).then(m=>m.default||m);
  return threePromise;
}
function bindInteractions(state) {
  if(state.interactionsBound)return;
  state.interactionsBound=true;
  const map=state.map;
  map.on('click',event=>{
    if(!state.enabled)return;
    const layers=[CLUSTER_ID,CLUSTER_ICON_ID,CLUSTER_COUNT_ID,MARKER_ID,HALO_ID,LABEL_ID,HIT_ID].filter(id=>map.getLayer(id));
    const hits=map.queryRenderedFeatures?.(event.point,{layers})||[];
    const hit=hits.find(x=>x.properties&&(x.properties.key||x.properties.cluster));
    if(!hit)return;
    if(hit.properties.cluster) {
      map.getSource(SOURCE_ID)?.getClusterExpansionZoom?.(Number(hit.properties.cluster_id),(error,zoom)=>{
        if(!error)map.easeTo({center:hit.geometry.coordinates,zoom});
      });
      return;
    }
    const feature=state.featureCache.get(String(hit.properties.key||''));
    if(!feature)return;
    if(state.popup)state.popup.remove();
    const Popup=window.maplibregl&&window.maplibregl.Popup;
    if(Popup)state.popup=new Popup({closeButton:true,closeOnClick:true,maxWidth:'440px',className:'bp-faa-popup-wrap-v1'})
      .setLngLat(feature.geometry.coordinates||event.lngLat).setHTML(faaObstructionPopupHtml(feature)).addTo(map);
  });
  const changed=()=>{
    if(!state.enabled)return;
    rebuildModels(state);
    if(state.renderer)map.triggerRepaint?.();
  };
  map.on('moveend',changed);map.on('zoomend',changed);
}
async function loadInitialData(state) {
  if(state.loading||state.dead||state.globalLoaded||!state.enabled)return;
  state.loading=true;state.stats.lastError=null;
  updateStatus(state,'Loading FAA Digital Obstacle File tower and antenna inventory…');
  try {
    const snapshot=await loadSnapshot();
    if(state.dead)return;
    if(!snapshot||!Array.isArray(snapshot.rows))throw new Error('FAA snapshot schema is missing rows');
    const features=snapshot.rows.map(normalizeFAAObstructionRow).filter(Boolean);
    if(!features.length)throw new Error('FAA snapshot contains no usable tower or antenna records');
    state.collection={type:'FeatureCollection',features};
    state.featureCache=new Map(features.map(f=>[f.properties.key,f]));
    state.globalLoaded=true;state.lastUpdated=snapshot.metadata&&snapshot.metadata.builtAtUtc||null;
    state.stats.total=features.length;
    state.stats.verified=features.filter(f=>f.properties.verification==='O').length;
    state.stats.unverified=features.length-state.stats.verified;
    state.stats.sourceRecordCount=Number(snapshot.metadata&&snapshot.metadata.sourceRecordCount)||null;
    state.stats.sourceUpdated=snapshot.metadata&&snapshot.metadata.builtAtUtc||'Not reported';
    const sourceDate=state.stats.sourceUpdated&&state.stats.sourceUpdated!=='Not reported'
      ? ' · snapshot '+String(state.stats.sourceUpdated).slice(0,10) : '';
    state.loadedStatus=features.length.toLocaleString('en-US')+' FAA-listed obstructions loaded'+sourceDate+' · tap a tower for source heights and record details';
    updateStatus(state,state.loadedStatus);
    const source=state.map.getSource(SOURCE_ID);if(source)source.setData(state.collection);
    rebuildModels(state);
    if(state.renderer)state.map.triggerRepaint?.();
  } catch(error) {
    state.stats.lastError=String(error&&error.message||error);
    updateStatus(state,'FAA obstruction inventory unavailable · '+state.stats.lastError);
    console.warn('BridgePoint FAA obstruction data load failed',error);
  } finally {state.loading=false;refreshCounts(state);}
}
async function setEnabled(state,on) {
  state.enabled=!!on;
  if(state.enabled) {
    installLayers(state);bindInteractions(state);
    if(!state.THREE&&!state.threeLoading) {
      state.threeLoading=true;
      loadThree().then(THREE=>{
        if(state.dead)return;
        state.THREE=THREE;state.threeLoading=false;
        if(state.enabled&&state.map.getStyle?.())installModelLayer(state);
        rebuildModels(state);state.map.triggerRepaint?.();
      }).catch(error=>{
        state.threeLoading=false;
        updateStatus(state,'3D FAA tower renderer unavailable: '+String(error&&error.message||error));
        console.warn('BridgePoint FAA tower Three.js unavailable',error);
      });
    }
    if(!state.globalLoaded)void loadInitialData(state);
    updateStatus(state,state.globalLoaded?state.loadedStatus:'Loading global FAA tower/antenna inventory…');
  } else {
    if(state.popup){state.popup.remove();state.popup=null;}
    for(const item of state.models)item.root.visible=false;
    updateStatus(state,'Layer off · all other BridgePoint layers remain unchanged');
    if(state.renderer)state.map.triggerRepaint?.();
  }
  setVisibility(state,state.enabled);refreshCounts(state);
  return state.enabled;
}
function install(map,state) {
  if(!map||!map.getStyle?.())return;
  if(!installLayers(state))return;
  bindInteractions(state);
  if(state.enabled) {
    if(state.THREE)installModelLayer(state);
    if(!state.globalLoaded)void loadInitialData(state);
  }
}
export function initFAAObstructionTowerRenderer(target) {
  const map=target&&(target.map||target);
  if(!map||typeof map.getBounds!=='function'||typeof map.addSource!=='function')return null;
  const existing=MAP_STATES.get(map);if(existing)return existing.api;
  const state={
    map,enabled:false,dead:false,loading:false,globalLoaded:false,threeLoading:false,layerInstalling:false,
    THREE:null,scene:null,camera:null,renderer:null,models:[],modelSignature:'',featureCache:new Map(),
    collection:EMPTY,popup:null,interactionsBound:false,status:'Layer off',loadedStatus:'',lastUpdated:null,renderWarned:false,
    repaintTimer:0,
    stats:{version:VERSION,total:0,verified:0,unverified:0,models:0,sourceRecordCount:null,
      sourceUpdated:null,layerReady:false,lastError:null}
  };
  const api={
    version:VERSION,
    get enabled(){return state.enabled;},
    get status(){return state.status;},
    get stats(){return Object.assign({},state.stats);},
    get features(){return state.featureCache.size;},
    get displayMode(){return faaObstructionRenderModeForZoom(map.getZoom());},
    toggle(){return setEnabled(state,!state.enabled);},
    setEnabled(on){return setEnabled(state,on);},
    refresh(){state.globalLoaded=false;state.stats.lastError=null;return loadInitialData(state);},
    destroy(){
      state.dead=true;
      if(state.repaintTimer)clearTimeout(state.repaintTimer);
      if(state.popup)state.popup.remove();
      for(const item of state.models){state.scene?.remove(item.root);disposeObject(item.root);}
      state.models=[];
    }
  };
  state.api=api;MAP_STATES.set(map,state);window.__BP_FAA_OBSTRUCTIONS_V1__=api;
  const ready=()=>install(map,state);
  map.on('style.load',ready);map.on('load',ready);
  if(map.isStyleLoaded?.())ready();
  const observeDock=()=>{if(addControlGroup(state))return;setTimeout(observeDock,500);};
  observeDock();
  const dockObserver=new MutationObserver(()=>{
    if(!document.getElementById('bp-faa-obstructions-control-v1'))addControlGroup(state);
  });
  if(document.body)dockObserver.observe(document.body,{childList:true,subtree:true});
  return api;
}
