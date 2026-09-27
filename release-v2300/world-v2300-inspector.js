import{VERSION,rpc,TIER}from'./world-v2300-config.js';

let threePromise=null;
function loadThree(){if(!threePromise)threePromise=Promise.all([import('./vendor/three.module.min.js'),import('./vendor/OrbitControls.js')]).then(([THREE,c])=>({THREE,OrbitControls:c.OrbitControls}));return threePromise}
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>Number.isFinite(+v)?'$'+Number(v).toLocaleString('en-US',{maximumFractionDigits:0}):'—';
function ringArea(r){let a=0;for(let i=0,j=r.length-1;i<r.length;j=i++)a+=(r[j][0]*r[i][1]-r[i][0]*r[j][1]);return Math.abs(a/2)}
function primaryRing(g){if(!g)return[];if(g.type==='Polygon')return g.coordinates?.[0]||[];if(g.type==='MultiPolygon'){let best=[];for(const p of g.coordinates||[]){const r=p?.[0]||[];if(ringArea(r)>ringArea(best))best=r}return best}return[]}
function originFor(r){if(!r.length)return[0,0];let x=0,y=0;for(const p of r){x+=p[0];y+=p[1]}return[x/r.length,y/r.length]}
function toMeters(p,o){const c=Math.cos(o[1]*Math.PI/180);return[(p[0]-o[0])*111320*c,(p[1]-o[1])*110540]}
function roofProfile(shape,x,z,b){const s=String(shape||'flat').toLowerCase(),nx=Math.abs((x-b.cx)/(b.hx||1)),nz=Math.abs((z-b.cz)/(b.hz||1));if(/gable/.test(s))return Math.max(0,1-nx);if(/hip|pyramid|mansard|gambrel|dome|onion/.test(s))return Math.max(0,1-Math.max(nx,nz));if(/shed|skillion/.test(s))return Math.max(0,Math.min(1,.5+(x-b.cx)/(2*(b.hx||1))));return 0}
function root(){let r=document.getElementById('bp2300Inspector');if(r)return r;r=document.createElement('div');r.id='bp2300Inspector';r.className='bp2300-inspector';r.hidden=true;r.innerHTML=`<div class="bp2300-card-shell"><button class="bp2300-close" type="button" aria-label="Close property viewer">×</button><div class="bp2300-card-head"><span>PROPERTY ISOLATE · SOURCE GEOMETRY</span><h3 id="bp2300Title">Building</h3><p id="bp2300Meta">Loading source-backed geometry…</p></div><div class="bp2300-card-grid"><div class="bp2300-three-wrap"><div id="bp2300ThreeHost" class="bp2300-three-host"></div><div class="bp2300-measure-readout" id="bp2300MeasureReadout">Measurement off</div><div class="bp2300-view-controls"><button id="bp2300Measure" type="button">Measure</button><button id="bp2300Xray" type="button">X-Ray Floors</button><button id="bp2300ResetView" type="button">Reset 3D</button></div></div><aside><div id="bp2300Facts" class="bp2300-facts"></div><div class="bp2300-truth"><b>Geometry truth</b><p id="bp2300Truth">BridgePoint renders the source footprint and available source height/roof attributes. Any visual fallback is labeled.</p></div><button id="bp2300OpenProperty" class="bp2300-open-property" type="button" hidden>Open full property workspace</button></aside></div></div>`;document.body.appendChild(r);return r}

class Viewer{
 constructor(canvas,readout){this.canvas=canvas;this.readout=readout;this.live=false;this.measure=false;this.xray=false;this.points=[];this.raf=0;this.resources=[];this.measureObjects=[];this.parts=[];this.floorSlabs=[];this.bodyMaterial=null;this.roofMaterial=null;this.partMaterial=null}
 async init(detail){this.destroy(false);const{THREE,OrbitControls}=await loadThree();this.T=THREE;this.live=true;const renderer=new THREE.WebGLRenderer({canvas:this.canvas,antialias:TIER!=='LOW',alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio||1,TIER==='LOW'?1.25:1.7));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.shadowMap.enabled=TIER==='HIGH';this.renderer=renderer;const scene=new THREE.Scene();scene.background=new THREE.Color(0x071017);this.scene=scene;const camera=new THREE.PerspectiveCamera(42,1,.05,5000);this.camera=camera;const controls=new OrbitControls(camera,this.canvas);controls.enableDamping=true;controls.dampingFactor=.08;controls.screenSpacePanning=true;controls.minDistance=2;controls.maxDistance=1000;controls.maxPolarAngle=Math.PI*.49;this.controls=controls;scene.add(new THREE.HemisphereLight(0xe3faff,0x10151b,2.25));const sun=new THREE.DirectionalLight(0xffffff,2.65);sun.position.set(-35,85,40);sun.castShadow=TIER==='HIGH';scene.add(sun);
  const b=detail?.building||{},ring=primaryRing(b.geometry);if(ring.length<4)throw new Error('No detailed building footprint available');const origin=originFor(ring),pts=ring.slice(0,-1).map(p=>toMeters(p,origin));const shape=new THREE.Shape();pts.forEach((p,i)=>i?shape.lineTo(p[0],-p[1]):shape.moveTo(p[0],-p[1]));shape.closePath();const height=Math.max(2,Number(b.render_height_m||b.height_m||8.5)),base=Math.max(0,Number(b.base_height_m||0)),roofH=Math.max(.18,Number(b.roof_height_m||.28));
  const bodyG=new THREE.ExtrudeGeometry(shape,{depth:height-base,bevelEnabled:false,curveSegments:1,steps:1});bodyG.rotateX(-Math.PI/2);bodyG.translate(0,base,0);bodyG.computeVertexNormals();const bodyM=new THREE.MeshStandardMaterial({color:0xaab8bd,roughness:.74,metalness:.1,flatShading:true});const body=new THREE.Mesh(bodyG,bodyM);body.castShadow=TIER==='HIGH';body.receiveShadow=true;scene.add(body);this.body=body;this.bodyMaterial=bodyM;this.resources.push(bodyG,bodyM);
  const resolvedFloors=Math.max(1,Math.min(80,Math.round(Number(b.num_floors||detail?.layout?.floors||1))));
  if(resolvedFloors>1){
    const floorStep=Math.max(.35,(height-base)/resolvedFloors);
    const floorLineM=new THREE.LineBasicMaterial({
      color:b.exact_layout_available?0x55ffb7:0x79d8ff,
      transparent:true,
      opacity:b.exact_layout_available?.82:.48
    });
    this.resources.push(floorLineM);
    const cap=Math.min(resolvedFloors-1,TIER==='LOW'?24:60);
    for(let fi=1;fi<=cap;fi++){
      const y=base+floorStep*fi;
      const linePts=pts.map(p=>new THREE.Vector3(p[0],y,-p[1]));
      linePts.push(linePts[0].clone());
      const fg=new THREE.BufferGeometry().setFromPoints(linePts);
      const fl=new THREE.Line(fg,floorLineM);
      scene.add(fl);this.resources.push(fg);
    }
    const slabG=new THREE.ShapeGeometry(shape,1);slabG.rotateX(-Math.PI/2);
    const slabM=new THREE.MeshBasicMaterial({color:b.exact_layout_available?0x58ffbd:0x6fd9ee,transparent:true,opacity:.30,side:THREE.DoubleSide,depthWrite:false});
    this.resources.push(slabG,slabM);
    const slabCap=Math.min(resolvedFloors-1,TIER==='LOW'?18:40);
    for(let fi=1;fi<=slabCap;fi++){
      const slab=new THREE.Mesh(slabG,slabM);slab.position.y=base+floorStep*fi;slab.visible=false;slab.renderOrder=5;scene.add(slab);this.floorSlabs.push(slab);
    }
  }
  const partFeatures=Array.isArray(detail?.building_parts)?detail.building_parts:[];
  if(partFeatures.length){
    const partM=new THREE.MeshStandardMaterial({color:0x64cfe0,roughness:.68,metalness:.08,transparent:true,opacity:.42,side:THREE.DoubleSide,depthWrite:false});
    const partLineM=new THREE.LineBasicMaterial({color:0xb8f6ff,transparent:true,opacity:.82});
    this.partMaterial=partM;this.resources.push(partM,partLineM);
    const maxParts=TIER==='LOW'?80:180;
    for(const pf of partFeatures.slice(0,maxParts)){
      const pg=primaryRing(pf?.geometry),pp=pf?.properties||{};
      if(pg.length<4)continue;
      const ppts=pg.slice(0,-1).map(x=>toMeters(x,origin));
      const pshape=new THREE.Shape();
      ppts.forEach((x,j)=>j?pshape.lineTo(x[0],-x[1]):pshape.moveTo(x[0],-x[1]));
      pshape.closePath();
      const underground=!!pp.is_underground;
      const pbase=Number.isFinite(+pp.min_height_m)?Math.max(0,+pp.min_height_m):0;
      let ptop=Number.isFinite(+pp.height_m)&&+pp.height_m>pbase?+pp.height_m:NaN;
      if(!Number.isFinite(ptop)&&Number.isFinite(+pp.num_floors)&&+pp.num_floors>0)ptop=pbase+(+pp.num_floors*3.2);
      if(!underground&&Number.isFinite(ptop)&&ptop>pbase+.1){
        const g=new THREE.ExtrudeGeometry(pshape,{depth:ptop-pbase,bevelEnabled:false,curveSegments:1,steps:1});
        g.rotateX(-Math.PI/2);g.translate(0,pbase,0);g.computeVertexNormals();
        const mesh=new THREE.Mesh(g,partM);mesh.renderOrder=3;scene.add(mesh);this.parts.push(mesh);this.resources.push(g);
      }
      const y=!underground&&Number.isFinite(ptop)?Math.min(ptop,height+roofH):base+.08;
      const lp=ppts.map(x=>new THREE.Vector3(x[0],y,-x[1]));lp.push(lp[0].clone());
      const lg=new THREE.BufferGeometry().setFromPoints(lp),line=new THREE.Line(lg,partLineM);line.renderOrder=4;scene.add(line);this.resources.push(lg);
    }
  }
  const sg=new THREE.ShapeGeometry(shape,1),pos=sg.attributes.position,bb={minx:Infinity,maxx:-Infinity,minz:Infinity,maxz:-Infinity};for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=-pos.getY(i);bb.minx=Math.min(bb.minx,x);bb.maxx=Math.max(bb.maxx,x);bb.minz=Math.min(bb.minz,z);bb.maxz=Math.max(bb.maxz,z)}bb.cx=(bb.minx+bb.maxx)/2;bb.cz=(bb.minz+bb.maxz)/2;bb.hx=(bb.maxx-bb.minx)/2;bb.hz=(bb.maxz-bb.minz)/2;const arr=new Float32Array(pos.count*3),shapeName=b.roof_shape||'flat';for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=-pos.getY(i),pr=roofProfile(shapeName,x,z,bb);arr[i*3]=x;arr[i*3+1]=height+roofH*(/flat/i.test(shapeName)?0:pr);arr[i*3+2]=z}const roofG=new THREE.BufferGeometry();roofG.setAttribute('position',new THREE.BufferAttribute(arr,3));if(sg.index)roofG.setIndex(sg.index.clone());roofG.computeVertexNormals();const rm=String(b.roof_material||''),roofColor=/metal/i.test(rm)?0xc9d7dc:/tile/i.test(rm)?0xb57661:/slate/i.test(rm)?0x667580:/concrete/i.test(rm)?0xaab0ae:0x8f8985;const roofM=new THREE.MeshStandardMaterial({color:roofColor,roughness:.76,metalness:/metal/i.test(rm)?.48:.08,side:THREE.DoubleSide,flatShading:true});const roof=new THREE.Mesh(roofG,roofM);scene.add(roof);this.roof=roof;this.roofMaterial=roofM;this.resources.push(sg,roofG,roofM);
  const outline=pts.map(p=>new THREE.Vector3(p[0],.06,-p[1]));outline.push(outline[0].clone());const og=new THREE.BufferGeometry().setFromPoints(outline),om=new THREE.LineBasicMaterial({color:0x58f3ff});scene.add(new THREE.Line(og,om));this.resources.push(og,om);
  const parcel=primaryRing(detail.parcel_geometry);if(parcel.length>3){const pp=parcel.slice(0,-1).map(p=>{const m=toMeters(p,origin);return new THREE.Vector3(m[0],.035,-m[1])});pp.push(pp[0].clone());const pg=new THREE.BufferGeometry().setFromPoints(pp),pm=new THREE.LineBasicMaterial({color:0x8bffff,transparent:true,opacity:.9});scene.add(new THREE.Line(pg,pm));this.resources.push(pg,pm)}
  const size=Math.max(bb.maxx-bb.minx,bb.maxz-bb.minz,height,12);camera.position.set(size*.95,size*.86,size*1.25);controls.target.set(bb.cx,height*.36,bb.cz);controls.saveState();controls.update();this.raycaster=new THREE.Raycaster();this.pointer=new THREE.Vector2();this.click=e=>this.measureClick(e);this.canvas.addEventListener('pointerup',this.click);this.ro=new ResizeObserver(()=>this.resize());this.ro.observe(this.canvas.parentElement);this.resize();this.loop()}
 resize(){if(!this.renderer)return;const r=this.canvas.parentElement.getBoundingClientRect(),w=Math.max(1,Math.floor(r.width)),h=Math.max(1,Math.floor(r.height));this.renderer.setSize(w,h,false);this.camera.aspect=w/h;this.camera.updateProjectionMatrix()}
 loop(){if(!this.live)return;this.controls?.update();this.renderer?.render(this.scene,this.camera);this.raf=requestAnimationFrame(()=>this.loop())}
 toggle(){this.measure=!this.measure;this.points=[];this.clearMeasure();this.readout.textContent=this.measure?'Tap two points on the detailed mesh':(this.xray?'X-ray floor plates visible · plates are not room partitions':'Measurement off');return this.measure}
 toggleXray(){this.xray=!this.xray;for(const slab of this.floorSlabs)slab.visible=this.xray;if(this.bodyMaterial){this.bodyMaterial.transparent=this.xray;this.bodyMaterial.opacity=this.xray?.16:1;this.bodyMaterial.depthWrite=!this.xray;this.bodyMaterial.needsUpdate=true}if(this.roofMaterial){this.roofMaterial.transparent=this.xray;this.roofMaterial.opacity=this.xray?.18:1;this.roofMaterial.depthWrite=!this.xray;this.roofMaterial.needsUpdate=true}if(this.partMaterial){this.partMaterial.opacity=this.xray?.70:.42;this.partMaterial.needsUpdate=true}this.readout.textContent=this.xray?'X-ray floor plates visible · plates are not room partitions':(this.measure?'Tap two points on the detailed mesh':'Measurement off');return this.xray}
 measureClick(e){if(!this.measure||!this.raycaster)return;const r=this.canvas.getBoundingClientRect();this.pointer.x=((e.clientX-r.left)/r.width)*2-1;this.pointer.y=-((e.clientY-r.top)/r.height)*2+1;this.raycaster.setFromCamera(this.pointer,this.camera);const hit=this.raycaster.intersectObjects([this.body,this.roof,...(this.parts||[])],false)[0];if(!hit)return;this.points.push(hit.point.clone());this.marker(hit.point);if(this.points.length===2){const a=this.points[0],b=this.points[1],d=a.distanceTo(b),vertical=Math.abs(a.y-b.y),horizontal=Math.hypot(a.x-b.x,a.z-b.z);this.line(a,b);this.readout.textContent=`3D ${d.toFixed(2)} m / ${(d*3.28084).toFixed(2)} ft · vertical ${vertical.toFixed(2)} m · horizontal ${horizontal.toFixed(2)} m`;this.points=[]}}
 marker(p){const T=this.T,g=new T.SphereGeometry(.16,8,8),m=new T.MeshBasicMaterial({color:0x00fff0}),o=new T.Mesh(g,m);o.position.copy(p);this.scene.add(o);this.measureObjects.push(o);this.resources.push(g,m)}
 line(a,b){const T=this.T,g=new T.BufferGeometry().setFromPoints([a,b]),m=new T.LineBasicMaterial({color:0xffe06a}),o=new T.Line(g,m);this.scene.add(o);this.measureObjects.push(o);this.resources.push(g,m)}
 clearMeasure(){for(const o of this.measureObjects)this.scene?.remove(o);this.measureObjects=[]}
 reset(){this.controls?.reset?.()}
 destroy(removeCanvas=false){this.live=false;cancelAnimationFrame(this.raf);this.ro?.disconnect();if(this.click)this.canvas?.removeEventListener('pointerup',this.click);this.clearMeasure();for(const r of this.resources)try{r.dispose?.()}catch(_){}this.resources=[];try{this.renderer?.dispose()}catch(_){};try{this.renderer?.forceContextLoss?.()}catch(_){}this.renderer=this.scene=this.camera=this.controls=this.body=this.roof=null;this.parts=[];this.floorSlabs=[];this.bodyMaterial=this.roofMaterial=this.partMaterial=null;this.xray=false;if(removeCanvas){try{this.canvas?.remove()}catch(_){}this.canvas=null}}
}

export function initInspector(map){if(window.__bpInspectorV2300)return window.__bpInspectorV2300;const r=root(),title=r.querySelector('#bp2300Title'),meta=r.querySelector('#bp2300Meta'),facts=r.querySelector('#bp2300Facts'),truth=r.querySelector('#bp2300Truth'),host=r.querySelector('#bp2300ThreeHost'),readout=r.querySelector('#bp2300MeasureReadout'),measure=r.querySelector('#bp2300Measure'),xray=r.querySelector('#bp2300Xray'),openBtn=r.querySelector('#bp2300OpenProperty');let viewer=null,detail=null,seq=0;
 function destroyViewer(){if(viewer){viewer.destroy(true);viewer=null}host.replaceChildren();readout.textContent='Measurement off';xray?.classList.remove('active')}
 function createViewer(){destroyViewer();const canvas=document.createElement('canvas');canvas.id='bp2300Three';canvas.setAttribute('aria-label','Interactive isolated building model');host.appendChild(canvas);viewer=new Viewer(canvas,readout);return viewer}
 function close(){r.hidden=true;destroyViewer();measure.classList.remove('active')}
 r.querySelector('.bp2300-close').onclick=close;r.addEventListener('click',e=>{if(e.target===r)close()});r.querySelector('#bp2300ResetView').onclick=()=>viewer?.reset();measure.onclick=()=>{if(!viewer)return;measure.classList.toggle('active',viewer.toggle())};xray.onclick=()=>{if(!viewer)return;xray.classList.toggle('active',viewer.toggleXray())};openBtn.onclick=()=>{const pid=detail?.property?.property_id;if(!pid)return;const u=new URL(location.href);u.searchParams.set('surface','property');u.searchParams.set('property',pid);location.href=u.pathname+u.search};
 async function open(lng,lat){const id=++seq;r.hidden=false;title.textContent='Loading building…';meta.textContent='Resolving exact footprint, roof and property…';facts.innerHTML='<div class="bp2300-skeleton"></div>';truth.textContent='Loading geometry provenance…';openBtn.hidden=true;destroyViewer();try{const d=await rpc('bridgepoint_building_detail_v2300',{p_lng:lng,p_lat:lat,p_radius_m:110},7500);if(id!==seq)return;detail=d;if(!d?.resolved||!d?.building?.geometry)throw new Error('No source-backed building geometry resolved at this click');const p=d.property||{},b=d.building||{},e=d.elevation||{};
const expectedParts=Number(d.layout?.building_part_count??b.building_part_count??0);
if(expectedParts>0&&Number.isFinite(Number(b.building_id))){
  try{
    const pd=await rpc('bridgepoint_building_parts_v3217',{p_building_id:Number(b.building_id),p_limit:TIER==='LOW'?80:180},5500);
    if(id!==seq)return;
    d.building_parts=Array.isArray(pd?.features)?pd.features:[];
    d.building_parts_meta=pd||null;
  }catch(_){d.building_parts=[]}
}
title.textContent=p.display_address||`Building ${b.building_id}`;meta.textContent=[p.municipality,p.state_code,b.source_key].filter(Boolean).join(' · ');const layout=d.layout||{},tier=String(layout.tier||b.layout_tier||'FOOTPRINT_SHELL'),floorMethod=String(layout.floor_count_method||b.floor_count_method||'SHELL_DEFAULT_ONE'),exact=!!(layout.exact_layout_available??b.exact_layout_available),exactCurrent=!!(layout.exact_layout_current??b.exact_layout_current),parts=Number(layout.building_part_count??b.building_part_count??0),ug=Number(layout.underground_part_count??b.underground_part_count??0),layoutLabel=exact?(exactCurrent?'Exact current public':'Exact historic public'):tier==='SOURCE_BACKED_VERTICAL'?'Source-backed structure':tier==='HEIGHT_DERIVED_VERTICAL'?'Height-derived structure':'Footprint shell only',floorTruth=/SOURCE_|OVERTURE_/.test(floorMethod)?'source-backed':/HEIGHT_/.test(floorMethod)?'estimated from height':'shell fallback';facts.innerHTML=`<div><span>Height</span><b>${Number(b.render_height_m||0).toFixed(1)} m</b></div><div><span>Height truth</span><b>${esc(b.height_truth||'visual estimate')}</b></div><div><span>Floors</span><b>${esc(b.num_floors||layout.floors||'—')}</b></div><div><span>Floor truth</span><b>${esc(floorTruth)}</b></div><div><span>Layout tier</span><b>${esc(layoutLabel)}</b></div><div><span>Building parts</span><b>${parts.toLocaleString()}</b></div><div><span>Parts rendered</span><b>${(d.building_parts?.length||0).toLocaleString()}</b></div><div><span>Underground parts</span><b>${ug.toLocaleString()}</b></div><div><span>Exact plan</span><b>${exact?(exactCurrent?'current':'historic'):'not matched'}</b></div><div><span>Roof</span><b>${esc(b.roof_shape||'visual cap')}</b></div><div><span>Roof material</span><b>${esc(b.roof_material||'unknown')}</b></div><div><span>Assessed value</span><b>${money(p.assessed_total_value)}</b></div><div><span>Parcel</span><b>${esc(p.parcel_number||'—')}</b></div><div><span>Elevation</span><b>${e.elevation_m!=null?Number(e.elevation_m).toFixed(1)+' m':'—'}</b></div><div><span>Geometry source</span><b>${esc(b.source_key||'BridgePoint')}</b></div><div><span>Confidence</span><b>${b.source_confidence!=null?Math.round(Number(b.source_confidence)*100)+'%':'—'}</b></div>`;truth.textContent=(d.measurement_notice||'Measurements are computed from the rendered source geometry.')+' · Layout tier: '+(d.layout?.tier||b.layout_tier||'FOOTPRINT_SHELL')+'. '+(d.layout?.exact_layout_available?'A lawful matched plan is available.':'X-ray floor plates use the source footprint plus the resolved floor count; room-by-room geometry is not represented as exact unless a lawful plan source is matched.');openBtn.hidden=!p.property_id;await createViewer().init(d)}catch(e){if(id!==seq)return;destroyViewer();title.textContent='Building detail unavailable';meta.textContent=e.message;facts.innerHTML='<p>The main globe remains available. Tap another building or zoom closer.</p>';truth.textContent='BridgePoint does not invent a detailed property mesh when a source footprint cannot be resolved.'}}
 window.addEventListener('bp2300:building-click',e=>{const ll=e.detail?.lngLat;if(ll)open(ll.lng,ll.lat)});const api={version:3222,baseVersion:VERSION,layoutInspector:true,floorBandVisualization:true,xrayFloorPlates:true,buildingPartVisualization:true,open,close,get detail(){return detail},get active(){return!r.hidden},get canvasActive(){return!!viewer?.canvas},get xrayActive(){return!!viewer?.xray},localThree:true,lazyThreeCanvas:true,destroysThreeCanvasOnClose:true,raycastMeasurement:true};window.__bpInspectorV2300=api;return api}
