import{VERSION,rpc,EMPTY,MOBILE,TIER}from'./world-v2300-config.js';

let threePromise=null;
function loadThree(){
  if(!threePromise)threePromise=Promise.all([
    import('https://esm.sh/three@0.180.0'),
    import('https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js')
  ]).then(([THREE,c])=>({THREE,OrbitControls:c.OrbitControls}));
  return threePromise;
}
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function money(v){return Number.isFinite(+v)?'$'+Number(v).toLocaleString('en-US',{maximumFractionDigits:0}):'—'}
function ringArea(r){let a=0;for(let i=0,j=r.length-1;i<r.length;j=i++)a+=(r[j][0]*r[i][1]-r[i][0]*r[j][1]);return Math.abs(a/2)}
function primaryRing(g){
  if(!g)return[];if(g.type==='Polygon')return g.coordinates?.[0]||[];
  if(g.type==='MultiPolygon'){let best=[];for(const p of g.coordinates||[]){const r=p?.[0]||[];if(ringArea(r)>ringArea(best))best=r}return best}
  return[];
}
function originFor(r){if(!r.length)return[0,0];let x=0,y=0;for(const p of r){x+=p[0];y+=p[1]}return[x/r.length,y/r.length]}
function toMeters(p,o){const c=Math.cos(o[1]*Math.PI/180);return[(p[0]-o[0])*111320*c,(p[1]-o[1])*110540]}
function roofProfile(shape,x,z,b){
  const s=String(shape||'flat').toLowerCase(),nx=Math.abs((x-b.cx)/(b.hx||1)),nz=Math.abs((z-b.cz)/(b.hz||1));
  if(/gable/.test(s))return Math.max(0,1-nx);
  if(/hip|pyramid|mansard|gambrel|dome|onion/.test(s))return Math.max(0,1-Math.max(nx,nz));
  if(/shed|skillion/.test(s))return Math.max(0,Math.min(1,.5+(x-b.cx)/(2*(b.hx||1))));
  return 0;
}
function makeRoot(){
  let root=document.getElementById('bp2300Inspector');if(root)return root;
  root=document.createElement('div');root.id='bp2300Inspector';root.className='bp2300-inspector';root.hidden=true;
  root.innerHTML=`<div class="bp2300-card-shell"><button class="bp2300-close" type="button" aria-label="Close">×</button><div class="bp2300-card-head"><span>PROPERTY ISOLATE</span><h3 id="bp2300Title">Building</h3><p id="bp2300Meta">Loading source-backed geometry…</p></div><div class="bp2300-card-grid"><div class="bp2300-three-wrap"><canvas id="bp2300Three"></canvas><div class="bp2300-measure-readout" id="bp2300MeasureReadout">Measurement off</div><div class="bp2300-view-controls"><button id="bp2300Measure" type="button">Measure</button><button id="bp2300ResetView" type="button">Reset 3D</button></div></div><aside><div id="bp2300Facts" class="bp2300-facts"></div><div class="bp2300-truth"><b>Geometry truth</b><p id="bp2300Truth">BridgePoint renders the source footprint and available source height/roof attributes. Estimated visual roof form is labeled when source roof geometry is unavailable.</p></div><button id="bp2300OpenProperty" class="bp2300-open-property" type="button" hidden>Open full property workspace</button></aside></div></div>`;
  document.body.appendChild(root);return root;
}

class DetailViewer{
  constructor(canvas,readout){this.canvas=canvas;this.readout=readout;this.live=false;this.measure=false;this.points=[];this.raf=0;this.ro=null;this.resources=[]}
  async init(detail){
    this.destroy();const{THREE,OrbitControls}=await loadThree();this.THREE=THREE;this.OrbitControls=OrbitControls;this.live=true;
    const canvas=this.canvas,renderer=new THREE.WebGLRenderer({canvas,antialias:TIER!=='LOW',alpha:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,TIER==='LOW'?1.35:1.75));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=TIER==='HIGH';this.renderer=renderer;
    const scene=new THREE.Scene();scene.background=new THREE.Color(0x071017);this.scene=scene;
    const cam=new THREE.PerspectiveCamera(42,1,.05,5000);this.camera=cam;
    const controls=new OrbitControls(cam,canvas);controls.enableDamping=true;controls.dampingFactor=.09;controls.screenSpacePanning=true;controls.minDistance=3;controls.maxDistance=800;controls.maxPolarAngle=Math.PI*.49;this.controls=controls;
    scene.add(new THREE.HemisphereLight(0xd9f7ff,0x10151b,2.2));const sun=new THREE.DirectionalLight(0xffffff,2.7);sun.position.set(-30,80,35);sun.castShadow=TIER==='HIGH';scene.add(sun);
    const g=detail?.building?.geometry,ring=primaryRing(g);if(ring.length<4)throw new Error('No detailed building footprint available');const o=originFor(ring),pts=ring.slice(0,-1).map(p=>toMeters(p,o));
    const shape=new THREE.Shape();pts.forEach((p,i)=>i?shape.lineTo(p[0],-p[1]):shape.moveTo(p[0],-p[1]));shape.closePath();
    const height=Math.max(2,Number(detail.building.render_height_m||detail.building.height_m||8.5)),base=Math.max(0,Number(detail.building.base_height_m||0)),roofH=Math.max(.18,Number(detail.building.roof_height_m||.28));
    const bodyGeom=new THREE.ExtrudeGeometry(shape,{depth:height-base,bevelEnabled:false,curveSegments:1,steps:1});bodyGeom.rotateX(-Math.PI/2);bodyGeom.translate(0,base,0);bodyGeom.computeVertexNormals();
    const bodyMat=new THREE.MeshStandardMaterial({color:0xaab8bd,roughness:.72,metalness:.12,flatShading:true});const body=new THREE.Mesh(bodyGeom,bodyMat);body.castShadow=TIER==='HIGH';body.receiveShadow=true;scene.add(body);this.body=body;this.resources.push(bodyGeom,bodyMat);
    const sg=new THREE.ShapeGeometry(shape,1);const pos=sg.attributes.position,bb={minx:Infinity,maxx:-Infinity,minz:Infinity,maxz:-Infinity};for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=-pos.getY(i);bb.minx=Math.min(bb.minx,x);bb.maxx=Math.max(bb.maxx,x);bb.minz=Math.min(bb.minz,z);bb.maxz=Math.max(bb.maxz,z)}bb.cx=(bb.minx+bb.maxx)/2;bb.cz=(bb.minz+bb.maxz)/2;bb.hx=(bb.maxx-bb.minx)/2;bb.hz=(bb.maxz-bb.minz)/2;
    const arr=new Float32Array(pos.count*3),shapeName=detail.building.roof_shape||'flat';for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=-pos.getY(i),profile=roofProfile(shapeName,x,z,bb);arr[i*3]=x;arr[i*3+1]=height+roofH*(/flat/i.test(shapeName)?0:profile);arr[i*3+2]=z}const roofGeom=new THREE.BufferGeometry();roofGeom.setAttribute('position',new THREE.BufferAttribute(arr,3));if(sg.index)roofGeom.setIndex(sg.index.clone());roofGeom.computeVertexNormals();const roofColor=/metal/i.test(detail.building.roof_material||'')?0xc9d7dc:/tile/i.test(detail.building.roof_material||'')?0xb57661:/slate/i.test(detail.building.roof_material||'')?0x667580:0x8f8985;const roofMat=new THREE.MeshStandardMaterial({color:roofColor,roughness:.76,metalness:/metal/i.test(detail.building.roof_material||'')?.5:.08,side:THREE.DoubleSide,flatShading:true});const roof=new THREE.Mesh(roofGeom,roofMat);scene.add(roof);this.roof=roof;this.resources.push(sg,roofGeom,roofMat);
    const outlinePts=pts.map(p=>new THREE.Vector3(p[0],.08,-p[1]));outlinePts.push(outlinePts[0].clone());const lineGeom=new THREE.BufferGeometry().setFromPoints(outlinePts),lineMat=new THREE.LineBasicMaterial({color:0x58f3ff});scene.add(new THREE.Line(lineGeom,lineMat));this.resources.push(lineGeom,lineMat);
    const parcelRing=primaryRing(detail.parcel_geometry);if(parcelRing.length>3){const po=originFor(parcelRing),parcelPts=parcelRing.slice(0,-1).map(p=>{const m=toMeters(p,o);return new THREE.Vector3(m[0],.04,-m[1])});parcelPts.push(parcelPts[0].clone());const pg=new THREE.BufferGeometry().setFromPoints(parcelPts),pm=new THREE.LineBasicMaterial({color:0x8bffff,transparent:true,opacity:.88});scene.add(new THREE.Line(pg,pm));this.resources.push(pg,pm)}
    const size=Math.max(bb.maxx-bb.minx,bb.maxz-bb.minz,height,12);cam.position.set(size*.95,size*.85,size*1.25);controls.target.set(bb.cx,height*.35,bb.cz);controls.update();
    this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.click=e=>this.onMeasureClick(e);canvas.addEventListener('pointerup',this.click);
    this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(canvas.parentElement);this.resize();this.loop();
  }
  resize(){if(!this.renderer)return;const r=this.canvas.parentElement.getBoundingClientRect(),w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix()}
  loop(){if(!this.live)return;this.controls?.update();this.renderer?.render(this.scene,this.camera);this.raf=requestAnimationFrame(()=>this.loop())}
  toggleMeasure(){this.measure=!this.measure;this.points=[];this.clearMeasure();this.readout.textContent=this.measure?'Tap two points on the building':'Measurement off';return this.measure}
  onMeasureClick(e){if(!this.measure||!this.raycaster)return;const r=this.canvas.getBoundingClientRect();this.pointer.x=((e.clientX-r.left)/r.width)*2-1;this.pointer.y=-((e.clientY-r.top)/r.height)*2+1;this.raycaster.setFromCamera(this.pointer,this.camera);const hit=this.raycaster.intersectObjects([this.body,this.roof],false)[0];if(!hit)return;this.points.push(hit.point.clone());this.addMarker(hit.point);if(this.points.length===2){const d=this.points[0].distanceTo(this.points[1]);this.addMeasureLine(this.points[0],this.points[1]);this.readout.textContent=`${d.toFixed(2)} m · ${(d*3.28084).toFixed(2)} ft`;this.points=[]}}
  addMarker(p){const T=this.THREE,g=new T.SphereGeometry(.16,8,8),m=new T.MeshBasicMaterial({color:0x00fff0}),o=new T.Mesh(g,m);o.position.copy(p);this.scene.add(o);(this.measureObjects||(this.measureObjects=[])).push(o);this.resources.push(g,m)}
  addMeasureLine(a,b){const T=this.THREE,g=new T.BufferGeometry().setFromPoints([a,b]),m=new T.LineBasicMaterial({color:0xffe06a}),o=new T.Line(g,m);this.scene.add(o);(this.measureObjects||(this.measureObjects=[])).push(o);this.resources.push(g,m)}
  clearMeasure(){for(const o of this.measureObjects||[])this.scene?.remove(o);this.measureObjects=[]}
  resetView(){this.controls?.reset?.()}
  destroy(){this.live=false;cancelAnimationFrame(this.raf);this.ro?.disconnect();if(this.click)this.canvas?.removeEventListener('pointerup',this.click);this.clearMeasure();for(const r of this.resources||[])try{r.dispose?.()}catch(_){}this.resources=[];try{this.renderer?.dispose()}catch(_){}this.renderer=this.scene=this.camera=this.controls=null}
}

export function initInspector(map){
  if(window.__bpInspectorV2300)return window.__bpInspectorV2300;const root=makeRoot(),title=root.querySelector('#bp2300Title'),meta=root.querySelector('#bp2300Meta'),facts=root.querySelector('#bp2300Facts'),truth=root.querySelector('#bp2300Truth'),canvas=root.querySelector('#bp2300Three'),readout=root.querySelector('#bp2300MeasureReadout'),measureBtn=root.querySelector('#bp2300Measure'),openBtn=root.querySelector('#bp2300OpenProperty');const viewer=new DetailViewer(canvas,readout);let detail=null,busy=0;
  function close(){root.hidden=true;viewer.destroy()}
  root.querySelector('.bp2300-close').onclick=close;root.addEventListener('click',e=>{if(e.target===root)close()});root.querySelector('#bp2300ResetView').onclick=()=>viewer.controls?.reset?.();measureBtn.onclick=()=>{const on=viewer.toggleMeasure();measureBtn.classList.toggle('active',on)};
  openBtn.onclick=()=>{const pid=detail?.property?.property_id;if(!pid)return;const u=new URL(location.href);u.searchParams.set('surface','property');u.searchParams.set('property',pid);location.href=u.pathname+u.search};
  async function open(lng,lat){const id=++busy;root.hidden=false;title.textContent='Loading building…';meta.textContent='Resolving exact footprint, roof and property…';facts.innerHTML='<div class="bp2300-skeleton"></div>';openBtn.hidden=true;viewer.destroy();try{const d=await rpc('bridgepoint_building_detail_v2300',{p_lng:lng,p_lat:lat,p_radius_m:100},7000);if(id!==busy)return;detail=d;if(!d?.resolved||!d?.building?.geometry)throw new Error('No source-backed building geometry resolved at this click');const p=d.property||{},b=d.building||{},e=d.elevation||{};title.textContent=p.display_address||`Building ${b.building_id}`;meta.textContent=[p.municipality,p.state_code,b.source_key].filter(Boolean).join(' · ');facts.innerHTML=`<div><span>Height</span><b>${Number(b.render_height_m||0).toFixed(1)} m</b></div><div><span>Roof</span><b>${esc(b.roof_shape||'visual cap')}</b></div><div><span>Roof material</span><b>${esc(b.roof_material||'unknown')}</b></div><div><span>Floors</span><b>${esc(b.num_floors||'—')}</b></div><div><span>Assessed value</span><b>${money(p.assessed_total_value)}</b></div><div><span>Parcel</span><b>${esc(p.parcel_number||'—')}</b></div><div><span>Elevation</span><b>${e.elevation_m!=null?Number(e.elevation_m).toFixed(1)+' m':'—'}</b></div><div><span>Source confidence</span><b>${b.source_confidence!=null?Math.round(Number(b.source_confidence)*100)+'%':'—'}</b></div>`;truth.textContent=d.measurement_notice||'Source-backed geometry; verify survey/engineering decisions independently.';openBtn.hidden=!p.property_id;await viewer.init(d)}catch(e){if(id!==busy)return;title.textContent='Building detail unavailable';meta.textContent=e.message;facts.innerHTML='<p>The main map remains usable. Tap another building or zoom closer.</p>'}}
  window.addEventListener('bp2300:building-click',e=>{const ll=e.detail?.lngLat;if(ll)open(ll.lng,ll.lat)});
  const api={version:VERSION,open,close,get detail(){return detail}};window.__bpInspectorV2300=api;return api;
}
