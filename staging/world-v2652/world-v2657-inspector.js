import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase=createClient('https://xdfsjztwgsbmabshzsjw.supabase.co','sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25');
let threePromise;
const esc=v=>String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const num=v=>Number.isFinite(Number(v))?Number(v):null;

async function loadThree(){
  if(!threePromise)threePromise=Promise.all([
    import('https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js'),
    import('https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/controls/OrbitControls.js')
  ]).then(([THREE,controls])=>({THREE,OrbitControls:controls.OrbitControls}));
  return threePromise;
}
function outerRings(g){if(!g)return[];if(g.type==='Polygon')return g.coordinates?.[0]?[g.coordinates[0]]:[];if(g.type==='MultiPolygon')return(g.coordinates||[]).map(p=>p?.[0]).filter(Boolean);return[]}
function lineStrings(g){if(!g)return[];if(g.type==='LineString')return[g.coordinates||[]];if(g.type==='MultiLineString')return g.coordinates||[];if(g.type==='Polygon')return g.coordinates?.[0]?[g.coordinates[0]]:[];if(g.type==='MultiPolygon')return(g.coordinates||[]).map(p=>p?.[0]).filter(Boolean);return[]}
function detailBuilding(d={}){return d.building||d.structure||d}
function detailProperty(d={}){return d.property||d.property_detail||{}}
function geometryFromDetail(d={}){const b=detailBuilding(d);return b.geometry||b.geometry_geojson||b.footprint_geometry||d.building_geometry||d.footprint||null}
function parcelGeometry(d={}){const p=detailProperty(d);return d.parcel_geometry||p.parcel_geometry||p.geometry||d.property_geometry||null}
function roofGeometry(d={}){const b=detailBuilding(d),p=detailProperty(d);return b.roof_geometry||b.roof_geometry_geojson||p.roof_geometry||d.roof_geometry||null}
function heightTruth(d={}){const b=detailBuilding(d),source=num(b.height_m??b.source_height_m??d.height_m),render=num(b.render_height_m??d.render_height_m),sh=source!==null&&source>0?source:null,rh=render!==null&&render>0?render:null;return{height:sh??rh??0,sourceBacked:sh!==null,label:sh!==null?'source height':rh!==null?'BridgePoint visual estimate':'height unavailable · source footprint only'}}
function localProjector(rings){const pts=rings.flat();if(!pts.length)return null;const lon0=pts.reduce((s,p)=>s+Number(p[0]),0)/pts.length,lat0=pts.reduce((s,p)=>s+Number(p[1]),0)/pts.length,mx=111320*Math.max(.12,Math.cos(lat0*Math.PI/180)),my=110540;return{lon0,lat0,point:p=>({x:(Number(p[0])-lon0)*mx,y:(Number(p[1])-lat0)*my})}}
function shapeFromRing(THREE,ring,project){const shape=new THREE.Shape();let started=false;for(const p of ring||[]){if(!Array.isArray(p)||p.length<2)continue;const q=project(p);if(!started){shape.moveTo(q.x,q.y);started=true}else shape.lineTo(q.x,q.y)}return started?shape:null}
function addParcelOutline(THREE,scene,g,projector){for(const ring of outerRings(g)){const pts=[];for(const p of ring){const q=projector.point(p);pts.push(new THREE.Vector3(q.x,q.y,.08))}if(pts.length>1)scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0x48e1ff,transparent:true,opacity:.98})))}}
function boundsOfGeometry(g){const pts=outerRings(g).flat();if(!pts.length)return null;let west=180,south=90,east=-180,north=-90;for(const p of pts){west=Math.min(west,+p[0]);south=Math.min(south,+p[1]);east=Math.max(east,+p[0]);north=Math.max(north,+p[1])}return{west,south,east,north}}

async function addTerrain(THREE,scene,detail,projector){
  const g=parcelGeometry(detail)||geometryFromDetail(detail),b=boundsOfGeometry(g);if(!b)return{mode:'none',baseElevation:0};
  const padLon=Math.max((b.east-b.west)*.12,.00005),padLat=Math.max((b.north-b.south)*.12,.00005),box={west:b.west-padLon,south:b.south-padLat,east:b.east+padLon,north:b.north+padLat};
  const width=13,height=13;
  try{
    const {data,error}=await supabase.functions.invoke('bridgepoint-world-terrain-v2500',{body:{...box,width,height,level:14,x:0,y:0}});if(error||!data?.complete||!Array.isArray(data.heights_m)||data.heights_m.length!==width*height)throw error||new Error('terrain sample incomplete');
    const values=data.heights_m.map(Number),centerIndex=Math.floor(height/2)*width+Math.floor(width/2),base=Number.isFinite(values[centerIndex])?values[centerIndex]:values.filter(Number.isFinite).reduce((a,v)=>a+v,0)/Math.max(1,values.filter(Number.isFinite).length);
    const vertices=[],indices=[];
    for(let y=0;y<height;y++)for(let x=0;x<width;x++){
      const lon=box.west+(box.east-box.west)*x/(width-1),lat=box.north-(box.north-box.south)*y/(height-1),q=projector.point([lon,lat]),z=Number.isFinite(values[y*width+x])?values[y*width+x]-base:0;vertices.push(q.x,q.y,z-.12)
    }
    for(let y=0;y<height-1;y++)for(let x=0;x<width-1;x++){const a=y*width+x,b1=a+1,c=a+width,d=c+1;indices.push(a,c,b1,b1,c,d)}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();
    const mat=new THREE.MeshStandardMaterial({color:0x355b38,roughness:.96,metalness:0,side:THREE.DoubleSide});scene.add(new THREE.Mesh(geo,mat));return{mode:'3DEP sampled terrain',baseElevation:base}
  }catch(_){
    for(const ring of outerRings(g)){const shape=shapeFromRing(THREE,ring,projector.point);if(!shape)continue;const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:0x29492f,roughness:1,side:THREE.DoubleSide}));mesh.position.z=-.12;scene.add(mesh)}return{mode:'parcel ground fallback',baseElevation:0}
  }
}

function contextMatchesInterior(path=''){return/(interior|floor.?plan|room|corridor|stair|door|wall|indoor|level)/i.test(path)}
function collectInterior(obj,path='',out=[],depth=0){
  if(depth>7||obj==null)return out;
  if(typeof obj==='object'&&!Array.isArray(obj)&&typeof obj.type==='string'&&obj.coordinates&&contextMatchesInterior(path)){out.push({geometry:obj,path});return out}
  if(Array.isArray(obj)){for(let i=0;i<obj.length;i++)collectInterior(obj[i],`${path}[${i}]`,out,depth+1);return out}
  if(typeof obj==='object')for(const [k,v] of Object.entries(obj))collectInterior(v,path?`${path}.${k}`:k,out,depth+1);
  return out;
}
function addInteriorGeometry(THREE,group,items,projector,height){
  let rendered=0;for(const item of items){const levelMatch=item.path.match(/(?:level|floor)[^0-9-]*(-?\d+)/i),level=levelMatch?Number(levelMatch[1]):0,z=Math.max(.25,Math.min(height||20,level*3.1+.45));for(const line of lineStrings(item.geometry)){const pts=[];for(const p of line){const q=projector.point(p);pts.push(new THREE.Vector3(q.x,q.y,z))}if(pts.length>1){group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:0xffd15c,transparent:true,opacity:.95})));rendered++}}for(const ring of outerRings(item.geometry)){const shape=shapeFromRing(THREE,ring,projector.point);if(!shape)continue;const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:0xffd15c,transparent:true,opacity:.12,side:THREE.DoubleSide}));mesh.position.z=z;group.add(mesh);rendered++}}return rendered
}
function addRoofCue(THREE,scene,h,detail,projector){for(const ring of outerRings(roofGeometry(detail))){const shape=shapeFromRing(THREE,ring,projector.point);if(!shape)continue;const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshStandardMaterial({color:0xd7e3e9,roughness:.72,side:THREE.DoubleSide}));mesh.position.z=Math.max(0,h)+.02;scene.add(mesh)}}
function facts(detail,terrainMode,interiorCount){const b=detailBuilding(detail),p=detailProperty(detail),ht=heightTruth(detail);return[['Height',ht.height>0?`${ht.height.toFixed(1)} m · ${ht.label}`:ht.label],['Floors',b.floors??b.floor_count??p.floors],['Roof shape',b.roof_shape??b.roof_type??p.roof_shape],['Roof material',b.roof_material??p.roof_material],['Roof pitch',b.roof_pitch??p.roof_pitch],['Facade',b.facade_material],['Parcel',p.parcel_id??p.apn??p.parcel_number??b.parcel_id],['Elevation',b.ground_elevation_m??p.elevation_m??detail.elevation?.elevation_m],['Terrain',terrainMode],['Interior geometries',interiorCount?`${interiorCount} source-backed element${interiorCount===1?'':'s'}`:'none source-backed'],['Geometry source',b.source_name??b.source_key??detail.source_name],['Confidence',b.confidence??b.source_confidence??detail.confidence]].filter(([,v])=>v!==null&&v!==undefined&&String(v).trim()!=='')}

export async function createStructureLab({root,canvasHost,infoHost,measurementHost,detail,onClose}){
  if(!root||!canvasHost||!detail)throw new Error('Structure lab requires root, canvasHost and building detail.');
  const {THREE,OrbitControls}=await loadThree(),geometry=geometryFromDetail(detail),rings=outerRings(geometry);if(!rings.length){infoHost.innerHTML='<b>Structure geometry unavailable</b><small>BridgePoint will not fabricate an exact 3D footprint when source geometry is missing.</small>';root.classList.add('open');return{destroy:()=>root.classList.remove('open')}}
  const projector=localProjector(rings);if(!projector)throw new Error('Could not project structure geometry.');
  const ht=heightTruth(detail),scene=new THREE.Scene();scene.background=new THREE.Color(0x020711);scene.fog=new THREE.FogExp2(0x020711,.00135);const camera=new THREE.PerspectiveCamera(48,1,.05,6000),renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.65));renderer.outputColorSpace=THREE.SRGBColorSpace;canvasHost.replaceChildren(renderer.domElement);
  const terrain=await addTerrain(THREE,scene,detail,projector);
  const shapes=rings.map(r=>shapeFromRing(THREE,r,projector.point)).filter(Boolean),buildingMeshes=[];
  for(const shape of shapes){const geo=ht.height>0?new THREE.ExtrudeGeometry(shape,{depth:ht.height,bevelEnabled:false,steps:1}):new THREE.ShapeGeometry(shape),mat=new THREE.MeshStandardMaterial({color:0x36bed7,roughness:.68,metalness:.08,side:THREE.DoubleSide}),mesh=new THREE.Mesh(geo,mat);scene.add(mesh);buildingMeshes.push(mesh);scene.add(new THREE.LineSegments(new THREE.EdgesGeometry(geo,28),new THREE.LineBasicMaterial({color:0xa6f5ff,transparent:true,opacity:.7})))}
  addRoofCue(THREE,scene,ht.height,detail,projector);addParcelOutline(THREE,scene,parcelGeometry(detail),projector);
  const interiorGroup=new THREE.Group();scene.add(interiorGroup);const interiorCount=addInteriorGeometry(THREE,interiorGroup,collectInterior(detail),projector,ht.height);interiorGroup.visible=false;
  scene.add(new THREE.HemisphereLight(0xcdefff,0x061019,1.5));const sun=new THREE.DirectionalLight(0xffffff,1.7);sun.position.set(80,-110,180);scene.add(sun);
  const bounds=new THREE.Box3();for(const m of buildingMeshes)bounds.expandByObject(m);const size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3()),span=Math.max(size.x,size.y,size.z,15);camera.position.set(center.x+span*1.25,center.y-span*1.5,center.z+span*.95);
  const controls=new OrbitControls(camera,renderer.domElement);controls.target.copy(center);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=Math.max(3,span*.18);controls.maxDistance=span*8;controls.enablePan=true;controls.touches={ONE:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};controls.update();
  const p=detailProperty(detail),b=detailBuilding(detail);infoHost.innerHTML=`<b>${esc(p.full_address||p.address||b.address||'Structure + Parcel Lab')}</b><small>${esc(b.source_name||b.source_key||'BridgePoint source geometry')} · ${esc(ht.label)} · ${esc(terrain.mode)}</small>`;
  const factPanel=document.createElement('div');factPanel.className='measurement panel';factPanel.style.right='10px';factPanel.style.left='auto';factPanel.style.maxHeight='42vh';factPanel.style.overflow='auto';factPanel.innerHTML=facts(detail,terrain.mode,interiorCount).map(([k,v])=>`<div><b>${esc(k)}:</b> ${esc(v)}</div>`).join('');root.appendChild(factPanel);
  const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2(),measurePts=[],measureVisuals=[];let measuring=false,xray=false;
  function clearMeasurement(){measurePts.length=0;for(const o of measureVisuals.splice(0)){scene.remove(o);o.geometry?.dispose?.();o.material?.dispose?.()}measurementHost.textContent='Measure: tap Measure, then choose two points on the source-backed structure.'}
  function setMeasure(on){measuring=on;clearMeasurement();measurementHost.textContent=on?'Choose point 1 on the structure.':'Measurement off.'}
  function onPointer(ev){if(!measuring)return;const rect=renderer.domElement.getBoundingClientRect();pointer.x=((ev.clientX-rect.left)/rect.width)*2-1;pointer.y=-((ev.clientY-rect.top)/rect.height)*2+1;raycaster.setFromCamera(pointer,camera);const hit=raycaster.intersectObjects(buildingMeshes,false)[0];if(!hit)return;measurePts.push(hit.point.clone());const dot=new THREE.Mesh(new THREE.SphereGeometry(Math.max(.08,span*.006),12,8),new THREE.MeshBasicMaterial({color:0xffd15c}));dot.position.copy(hit.point);scene.add(dot);measureVisuals.push(dot);if(measurePts.length===1)measurementHost.textContent='Choose point 2 on the structure.';if(measurePts.length===2){const line=new THREE.Line(new THREE.BufferGeometry().setFromPoints(measurePts),new THREE.LineBasicMaterial({color:0xffd15c}));scene.add(line);measureVisuals.push(line);const d=measurePts[0].distanceTo(measurePts[1]);measurementHost.textContent=`3D point-to-point distance: ${d.toFixed(d<10?2:1)} m. Measurement is on rendered source geometry.`;measuring=false}}
  renderer.domElement.addEventListener('pointerdown',onPointer);
  const resize=()=>{const w=Math.max(1,canvasHost.clientWidth),h=Math.max(1,canvasHost.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()},ro=new ResizeObserver(resize);ro.observe(canvasHost);resize();let raf=0,stopped=false;const loop=()=>{if(stopped)return;controls.update();renderer.render(scene,camera);raf=requestAnimationFrame(loop)};loop();
  const api={reset(){camera.position.set(center.x+span*1.25,center.y-span*1.5,center.z+span*.95);controls.target.copy(center);controls.update()},measure(){setMeasure(!measuring)},xray(){xray=!xray;for(const m of buildingMeshes){m.material.transparent=xray;m.material.opacity=xray?.18:1;m.material.needsUpdate=true}interiorGroup.visible=xray&&interiorCount>0;measurementHost.textContent=xray?(interiorCount?`X-ray active · ${interiorCount} source-backed interior/floor geometry elements shown.`:'X-ray active · exterior shell transparent. No exact interior layout is source-backed here, so rooms/stairs are not invented.'):'X-ray off.';return xray},destroy(){stopped=true;cancelAnimationFrame(raf);ro.disconnect();renderer.domElement.removeEventListener('pointerdown',onPointer);controls.dispose();scene.traverse(o=>{o.geometry?.dispose?.();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose?.());else o.material?.dispose?.()});renderer.dispose();renderer.forceContextLoss?.();renderer.domElement.remove();factPanel.remove();clearMeasurement();root.classList.remove('open');onClose?.()}};
  root.classList.add('open');return api;
}
