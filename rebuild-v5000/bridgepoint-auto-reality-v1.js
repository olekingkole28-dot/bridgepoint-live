/* BridgePoint automatic geographically anchored native scan discoveries.
 * No remote viewer is represented as a native mesh. No invented geometry.
 * Existing scan catalog and licensing are preserved. */
(()=>{'use strict';
if(window.__BP_AUTO_REALITY_V1__)return;
const SOURCE='bp-discovery-site-v1',DOT='bp-discovery-dot-v1',LAYER='bp-discovery-native-v1';
const api=window.__BP_AUTO_REALITY_V1__={version:1,status:'waiting for globe',catalogCount:0,nativeCount:0,loaded:[],errors:{},active:[]};
let current=null,manifestPromise=null,libsPromise=null;
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const coords=x=>Array.isArray(x)&&x.length===2&&x.every(finite)&&Math.abs(x[0])<=180&&Math.abs(x[1])<=90;
const distance=(a,b)=>{const rad=Math.PI/180,dy=(a[1]-b[1])*rad,dx=(a[0]-b[0])*rad;const h=Math.sin(dy/2)**2+Math.cos(a[1]*rad)*Math.cos(b[1]*rad)*Math.sin(dx/2)**2;return 12742000*Math.asin(Math.min(1,Math.sqrt(h)))};
const manifest=()=>manifestPromise||=fetch('/data/bp-auto-reality-v1.json',{cache:'force-cache'}).then(r=>{if(!r.ok)throw Error('Scan manifest HTTP '+r.status);return r.json()}).catch(e=>{manifestPromise=null;throw e});
const libs=()=>libsPromise||=Promise.all([import('/vendor/three.module.js?v=169-local'),import('/vendor/GLTFLoader.bundle.js?v=169-local'),import('/vendor/DRACOLoader.bundle.js?v=169-draco-v1'),import('/vendor/KTX2Loader.bundle.js?v=169-ktx2-v1')]).then(([T,G,D,K])=>({T,GLTFLoader:G.GLTFLoader,DRACOLoader:D.DRACOLoader,KTX2Loader:K.KTX2Loader})).catch(e=>{libsPromise=null;throw e});
function mapOf(){return window.__BP_PUBLIC_GLOBE_V4__?.map||window.__BP_LANDING_WORLD__?.map||window.__BP_WORLD_V2300__?.map||window.__BP_APP_WORLD__?.map||window.__BP_MAP__}
function near(map,row,extra=1){const z=Number(map.getZoom());if(z<row.minZoom)return false;const c=map.getCenter(),center=[c.lng,c.lat];if(!coords(center))return false;const radius=Math.max(row.reachM||100,Math.min(20000,2200*Math.pow(2,15-z)))*extra;return distance(center,row.coordinates)<=radius}
function assetAllowed(path){return typeof path==='string'&&/^\/assets\/[a-z0-9_./-]+\.(?:glb(?:\.gz)?|bin\.gz)$/i.test(path)&&!path.includes('..')}
function safeUrl(value){try{const u=new URL(value,location.origin);return u.protocol==='https:'?u.href:null}catch(_){return null}}
async function bytes(path){if(!assetAllowed(path))throw Error('Unsupported asset path');const r=await fetch(path,{cache:'force-cache'});if(!r.ok)throw Error('Model HTTP '+r.status);let b=await r.arrayBuffer();if(new Uint8Array(b)[0]===31&&new Uint8Array(b)[1]===139){if(typeof DecompressionStream!=='function')throw Error('Gzip unavailable');b=await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer()}return b}
function matrix(map,T,xy,alt){try{const m=map.transform?.getMatrixForModel?.(xy,alt);if(m?.length>=16)return new T.Matrix4().fromArray(m);const MC=window.maplibregl?.MercatorCoordinate;if(!MC)return null;const p=MC.fromLngLat(xy,alt),u=p.meterInMercatorCoordinateUnits();return new T.Matrix4().set(u,0,0,p.x,0,0,u,p.y,0,u,0,p.z,0,0,0,1)}catch(_){return null}}
function altitude(map,row,entry){if(row.datum==='absolute')return row.altitudeM;let g;try{g=map.queryTerrainElevation?.({lng:row.coordinates[0],lat:row.coordinates[1]},{exaggerated:false})}catch(_){}if(!finite(g))return null;return g+(row.offsetM||0)-(row.topAligned?entry.maxY||0:0)}
function oldNativeActive(map,row){if(row.asset.includes('statue-of-liberty'))return !!(map.getLayer('bp-v5940-statue-scan')&&window.__BP_STATUE_SCAN_V5940__?.rendered);return false}
function release(entry){const mats=new Set(),geos=new Set(),textures=new Set();entry.root?.traverse(o=>{if(o.geometry)geos.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){mats.add(m);for(const v of Object.values(m))if(v?.isTexture)textures.add(v)}});for(const x of textures)x.dispose();for(const x of mats)x.dispose();for(const x of geos)x.dispose()}
function install(state){const {map}=state;if(!map.getStyle?.())return;
 try{if(!map.getSource(SOURCE))map.addSource(SOURCE,{type:'geojson',data:{type:'FeatureCollection',features:[]}});if(!map.getLayer(DOT))map.addLayer({id:DOT,type:'circle',source:SOURCE,minzoom:14,paint:{'circle-radius':5,'circle-color':'#72e8de','circle-stroke-color':'#fff','circle-stroke-width':1.5,'circle-opacity':.78}})}catch(e){api.errors.discovery=String(e.message||e)}
 if(!state.libs||map.getLayer(LAYER))return;
 const {T,GLTFLoader,DRACOLoader,KTX2Loader}=state.libs;
 try{map.addLayer({id:LAYER,type:'custom',renderingMode:'3d',onAdd(m,gl){
 const renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false,alpha:true,powerPreference:'low-power'});renderer.autoClear=false;renderer.outputColorSpace=T.SRGBColorSpace;
 state.renderer=renderer;state.camera=new T.Camera();
 state.draco=new DRACOLoader();state.draco.setDecoderPath('/vendor/draco/');state.draco.setWorkerLimit(1);
 state.ktx=new KTX2Loader();state.ktx.setTranscoderPath('/vendor/basis/');state.ktx.setWorkerLimit(1);state.ktx.detectSupport(renderer);
 state.loader=new GLTFLoader();state.loader.setDRACOLoader(state.draco);state.loader.setKTX2Loader(state.ktx);
 },render(gl,args){
 const raw=args?.defaultProjectionData?.mainMatrix||args?.modelViewProjectionMatrix||((args?.length===16)?args:null);if(!raw||!state.renderer)return;
 const base=new T.Matrix4().fromArray(raw);const ids=[];
 for(const row of state.wanted){const entry=state.cache.get(row.id);if(!entry||oldNativeActive(map,row))continue;
 const alt=altitude(map,row,entry);if(!finite(alt))continue;const mat=matrix(map,T,row.coordinates,alt);if(!mat)continue;
 try{state.camera.projectionMatrix.copy(base).multiply(mat);state.camera.projectionMatrixInverse.copy(state.camera.projectionMatrix).invert();state.renderer.resetState();state.renderer.render(entry.scene,state.camera);ids.push(row.id)}catch(e){api.errors[row.id]=String(e.message||e)}
 }api.active=ids;
 },onRemove(){state.draco?.dispose();state.ktx?.dispose();state.renderer?.dispose();state.renderer=null;state.loader=null;}});
 }catch(e){api.errors.layer=String(e.message||e)}
}
async function load(state,row){if(!state.loader||state.cache.has(row.id)||state.loading.has(row.id)||state.dead)return;const last=state.failed.get(row.id);if(last&&Date.now()-last<60000)return;state.loading.add(row.id);let root;
 try{const {T}=state.libs;const b=await bytes(row.asset);
 if(row.format==='bpc1'){const v=new DataView(b);if(v.getUint32(0,false)!==0x42504331||v.getUint32(12,true)!==1)throw Error('Invalid point cloud');const count=v.getUint32(4,true);if(count<1||count>20000000||b.byteLength<16+count*15)throw Error('Invalid cloud bounds');const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(new Float32Array(b,16,count*3),3));geo.setAttribute('color',new T.BufferAttribute(new Uint8Array(b,16+count*12,count*3),3,true));root=new T.Points(geo,new T.PointsMaterial({size:.13,sizeAttenuation:true,vertexColors:true,depthWrite:true}));}
 else {if(new DataView(b).getUint32(0,true)!==0x46546c67)throw Error('Invalid GLB');const gltf=await state.loader.parseAsync(b,'');root=gltf.scene;if(!root)throw Error('No mesh scene')}
 root.updateMatrixWorld(true);let box=new T.Box3().setFromObject(root),size=box.getSize(new T.Vector3());if(box.isEmpty()||![size.x,size.y,size.z].every(finite)||Math.max(size.x,size.y,size.z)<=0)throw Error('Invalid source dimensions');
 if(row.statue){if(size.z>size.y&&size.z>=size.x)root.rotation.x=-Math.PI/2;else if(size.x>size.y&&size.x>=size.z)root.rotation.z=Math.PI/2;root.updateMatrixWorld(true);box=new T.Box3().setFromObject(root);size=box.getSize(new T.Vector3());}
 if(row.targetHeightM)root.scale.multiplyScalar(row.targetHeightM/size.y);else if(row.targetLengthM)root.scale.multiplyScalar(row.targetLengthM/Math.max(size.x,size.z));
 if(row.headingDeg!=null&&!row.statue)root.rotation.y+=row.headingDeg*Math.PI/180;
 root.updateMatrixWorld(true);box=new T.Box3().setFromObject(root);const center=box.getCenter(new T.Vector3());
 if(!row.keepOrigin){root.position.x-=center.x;root.position.z-=center.z;root.position.y-=row.baseAligned?box.min.y:center.y;}
 const wrap=new T.Group();wrap.add(root);if(row.statue)wrap.rotation.y=135*Math.PI/180;
 root.traverse(o=>{if(!o.isMesh&&!o.isPoints)return;o.frustumCulled=false;for(const m of Array.isArray(o.material)?o.material:[o.material])if(m){m.side=T.DoubleSide;m.depthTest=true;m.depthWrite=true;m.needsUpdate=true;}});
 const scene=new T.Scene();scene.add(new T.HemisphereLight(0xeaf4ff,0x57606a,1.65));const light=new T.DirectionalLight(0xffffff,1.9);light.position.set(-10,20,12);scene.add(light,wrap);wrap.updateMatrixWorld(true);const finalBox=new T.Box3().setFromObject(wrap);
 if(state.dead){release({root:wrap});return}
 state.cache.set(row.id,{root:wrap,scene,maxY:finalBox.max.y});api.loaded=[...state.cache.keys()];delete api.errors[row.id];state.map.triggerRepaint();
 }catch(e){if(root)release({root});state.failed.set(row.id,Date.now());api.errors[row.id]=String(e.message||e)}finally{state.loading.delete(row.id);schedule(state)}
}
function popup(state,event){if(!state.map.getLayer(DOT))return;let hit;try{hit=state.map.queryRenderedFeatures(event.point,{layers:[DOT]})[0]}catch(_){}if(!hit)return;const row=state.byId.get(hit.properties.id);if(!row)return;const card=document.createElement('div');card.style.cssText='max-width:260px;color:#15313f;font:13px/1.45 system-ui';const h=document.createElement('strong');h.textContent=row.title;card.append(h);const p=document.createElement('p');p.textContent=(row.asset?'Native source scan · placement is approximate unless surveyed.':'Creator-hosted 3D experience · discoverable here, not a native globe mesh.')+(row.creator?' · '+row.creator:'');card.append(p);if(row.precision){const x=document.createElement('p');x.textContent=row.precision;card.append(x)}const u=safeUrl(row.viewer_url||row.source_url);if(u){const a=document.createElement('a');a.href=u;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Open original interactive 3D scan';card.append(a)}state.popup?.remove();state.popup=new window.maplibregl.Popup({maxWidth:'300px'}).setLngLat(row.coordinates).setDOMContent(card).addTo(state.map);}
function update(state){if(state.dead||!state.rows)return;const map=state.map;if(!map.getStyle?.())return;install(state);const center=map.getCenter(),xy=[center.lng,center.lat],z=map.getZoom(),mobile=innerWidth<850;const native=state.rows.filter(r=>r.asset&&near(map,r,1.4)).sort((a,b)=>distance(a.coordinates,xy)-distance(b.coordinates,xy));state.wanted=native.slice(0,mobile?2:4);
 const chosen=new Set(state.wanted.map(r=>r.id));
 // Keep nearby loaded scans through camera motion, with a bounded GPU cache.
 for(const [id,e] of state.cache){const r=state.byId.get(id);if(!chosen.has(id)&&!near(map,r,3)){release(e);state.cache.delete(id)}}
 api.loaded=[...state.cache.keys()];
 if(state.wanted.length&&!state.libs&&!state.libLoading){state.libLoading=true;libs().then(l=>{if(!state.dead){state.libs=l;install(state);schedule(state)}}).catch(e=>api.errors.libs=String(e.message||e)).finally(()=>{state.libLoading=false})}
 if(state.loader&&state.loading.size<1){const next=state.wanted.find(r=>!state.cache.has(r.id)&&!state.loading.has(r.id)&&(!state.failed.has(r.id)||Date.now()-state.failed.get(r.id)>60000));if(next)void load(state,next);}
 const discoveries=z>=14?state.rows.filter(r=>near(map,{...r,minZoom:14,reachM:Math.max(100,r.reachM||100)},.65)).sort((a,b)=>distance(a.coordinates,xy)-distance(b.coordinates,xy)).slice(0,24):[];
 const data={type:'FeatureCollection',features:discoveries.map(r=>({type:'Feature',id:r.id,geometry:{type:'Point',coordinates:r.coordinates},properties:{id:r.id}}))};
 const sig=discoveries.map(r=>r.id).join('|');if(state.signature!==sig||state.source!==map.getSource(SOURCE)){state.signature=sig;state.source=map.getSource(SOURCE);state.source?.setData(data)}
 if(state.wanted.length)map.triggerRepaint();api.status='ready';
}
function schedule(state){if(state.dead||state.timer)return;state.timer=setTimeout(()=>{state.timer=0;try{update(state)}catch(e){api.errors.update=String(e.message||e)}},100)}
async function attach(map){if(!map?.getBounds||!map?.addLayer||current?.map===map)return;if(current){current.dead=true;clearTimeout(current.timer);for(const e of current.cache.values())release(e);try{current.map.off('moveend',current.event);current.map.off('style.load',current.event);current.map.off('zoomend',current.event);current.map.off('move',current.event);current.map.off('click',current.click)}catch(_){}}
 const s=current={map,rows:null,byId:new Map(),wanted:[],cache:new Map(),loading:new Set(),failed:new Map(),timer:0,dead:false};s.event=()=>schedule(s);s.click=e=>popup(s,e);
 for(const e of ['move','moveend','zoomend','style.load','load'])map.on(e,s.event);map.on('click',s.click);
 try{const d=await manifest();if(s.dead)return;s.rows=d.items.filter(r=>coords(r.coordinates));s.byId=new Map(s.rows.map(r=>[r.id,r]));api.catalogCount=s.rows.length;api.nativeCount=s.rows.filter(r=>r.asset).length;api.status='catalog loaded';schedule(s)}catch(e){api.status=String(e.message||e)}
}
function boot(){const m=mapOf();if(m&&m!==current?.map)void attach(m)}
setInterval(boot,1500);boot();api.refresh=()=>{if(current)schedule(current)};api.diagnostics=()=>({status:api.status,catalogCount:api.catalogCount,nativeCount:api.nativeCount,loaded:[...api.loaded],active:[...api.active],errors:{...api.errors}});
})();
