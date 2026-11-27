// BridgePoint source-model street detail. CC BY source credits in manifest/credits.html.
// Geographic points are source-backed; meshes are illustrative visual proxies.
const BASE='/assets/street-detail-v1/';
const THREE_URL='/vendor/three.module.js?v=169-local';
const LOADER_URL='/vendor/GLTFLoader.bundle.js?v=169-local';
const cache=new Map();
const hash=s=>{let h=2166136261;for(const c of String(s))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
const pick=(h,n)=>h%n;
export function selectTreeAsset(model,id,latitude=0,month=new Date().getUTCMonth()+1){
 const genus=(model?.knownGenera||[]).join(' ').toLowerCase(),name=String(id).toLowerCase(),family=String(model?.modelFamily||'').toLowerCase(),h=hash(id);
 const key=genus+' '+name;
 let pack=null,index=0;
 if(/\b(dead|snag)\b/.test(key)){pack='deadfir';index=pick(h,4);}
 else if(/quercus|oak/.test(key)){pack='oak';index=pick(h,4);}
 else if(/acer|maple/.test(key)){pack='maple';index=pick(h,4);}
 else if(/pinus|\bpine\b/.test(key)){pack='pine';index=pick(h,4);}
 else if(/abies|picea|fir|spruce/.test(key)||family==='conifer'){pack='fir';index=pick(h,4);}
 else if(/palm|arecaceae|phoenix|cocos|washingtonia/.test(key+' '+family)){pack='palm';index=pick(h,4);}
 else if(family.startsWith('broadleaf')||/tree_small_02/.test(name)){
   const effective=latitude<0?(month+5)%12+1:month;
   const autumn=Math.abs(latitude)>25&&effective>=9&&effective<=11;
   const spring=Math.abs(latitude)>25&&effective>=3&&effective<=5;
   if(/betula|birch|fagus|beech|platanus|plane|juglans|walnut|salix|willow|corylus|hazel/.test(key)){
    const species=/platanus|plane/.test(key)?0:/fagus|beech/.test(key)?1:/betula|birch/.test(key)?2:/juglans|walnut/.test(key)?3:/salix|willow/.test(key)?4:5;
    pack='rally';index=(autumn?14:spring?0:7)+species;
   }else if(h%5===0){pack='city';index=4;}
   else{pack='oak';index=pick(h,4);}
 }
 return pack?{pack,index,url:BASE+pack+'.glb.gz',level:'lod0',streetScene:index}:null;
}
export async function loadStreetGLTF(loader,file){
 const url=file.url;
 if(!cache.has(url)){
  const job=(async()=>{if(typeof DecompressionStream!=='function')throw Error('GZIP_UNAVAILABLE');
   const r=await fetch(url,{cache:'force-cache'});if(!r.ok||!r.body)throw Error('STREET_ASSET_HTTP_'+r.status);
   const data=await new Response(r.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer();
   if(data.byteLength>16*1024*1024||new DataView(data).getUint32(0,true)!==0x46546c67)throw Error('STREET_ASSET_INVALID');
   return loader.parseAsync(data,BASE);
  })().catch(e=>{cache.delete(url);throw e});cache.set(url,job);
 }
 return cache.get(url);
}
export function normalizedBounds(T,root){
 root.updateMatrixWorld(true);const box=new T.Box3().setFromObject(root,true),center=box.getCenter(new T.Vector3()),size=box.getSize(new T.Vector3());
 if(!Number.isFinite(size.y)||size.y<1e-7||size.y>1e8||!Number.isFinite(size.x+size.z))throw Error('STREET_MODEL_BOUNDS');
 const v=new T.Vector3(),bottom=new T.Box3(),threshold=box.min.y+size.y*.06;root.traverse(o=>{const p=o.geometry?.attributes?.position;if(!o.isMesh||!p)return;for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);if(v.y<=threshold)bottom.expandByPoint(v);}});const base=bottom.isEmpty()?center:bottom.getCenter(new T.Vector3());return {box,center,size,base};
}
export function sourceKind(p={}){
 const a=String(p.asset_kind||'').toLowerCase(),c=String(p.class||'').toLowerCase(),s=String(p.subclass||'').toLowerCase(),am=String(p.amenity||'').toLowerCase(),highway=String(p.highway||'').toLowerCase(),sign=String(p.traffic_sign||'').toLowerCase(),adv=String(p.advertising||'').toLowerCase(),manMade=String(p.man_made||'').toLowerCase(),power=String(p.power||'').toLowerCase(),barrier=String(p.barrier||'').toLowerCase(),utility=String(p.utility||'').toLowerCase(),drain=String(p.drain||p.drainage||'').toLowerCase(),waterway=String(p.waterway||'').toLowerCase(),sewer=String(p.sewer||'').toLowerCase();
 const tags=[a,c,s,am,highway,sign,adv,manMade,power,barrier,utility,drain,waterway,sewer];const has=(...v)=>v.some(x=>tags.includes(x));
 if(['cone','traffic_cone'].includes(barrier)||has('traffic_cone','trafficcone'))return 'cone';
 if(['street_cabinet','utility_pedestal','electric_box'].includes(manMade)||has('electricity_distribution_cabinet','power_transformer','utility_box')||['transformer','substation','minor_distribution'].includes(power)||(utility==='power'&&(c==='street_cabinet'||s==='street_cabinet')))return 'electricbox';
 if(['drain','storm_drain'].includes(manMade)||['storm_drain','stormwater_drain','surface_drainage'].includes(drain)||waterway==='drain'||sewer==='stormwater'||has('storm_drain','stormwater_drain'))return 'stormdrain';
 if(has('streetlight','street_lamp'))return 'light';
 if(has('bench'))return 'bench';if(has('fire_hydrant','hydrant')||p.emergency==='fire_hydrant')return 'hydrant';if(has('post_box'))return 'mailbox';if(has('mailbox')&&p.residential===true)return 'mailboxlow';if(has('bus_stop','bus_shelter','shelter')&&(['yes','true'].includes(String(p.shelter).toLowerCase())||p.shelter===true||has('bus_shelter')||p.shelter_type==='public_transport'))return 'busshelter';if(has('waste_basket','waste_bin','trash_bin','waste_disposal'))return 'bin';
 if(has('billboard'))return 'billboard';if(has('stop','stop_sign','us:r1-1'))return 'stop';if(has('give_way','yield','yield_sign','us:r1-2'))return 'yield';
 if(has('shipping_container','container'))return 'container';if(has('bollard','barrier','block','traffic_barrier'))return 'barrier';
 if(has('dead_fir')||(has('dead_tree')||String(p.denotation||'').toLowerCase()==='dead')&&/fir|abies|picea/.test(String(p.species||p.genus||'').toLowerCase()))return 'deadfir';
 if(has('shrub','bush'))return 'shrub';
 if(has('vehicle','car','parked_car')&&p.verified_vehicle===true)return 'vehicle';
 // Parking areas alone never establish a car's actual position.
 return null;
}
export function propAsset(kind,key){const h=hash(key);switch(kind){
 case'light':return {pack:h%5===0?'city':'lights',index:h%5===0?2:pick(h,8),height:8};
 case'bench':return{pack:h%2?'benchback':'props',index:0,height:0.9};case'hydrant':return{pack:'hydrant',index:0,height:0.85};case'mailbox':return{pack:'mailbox',index:0,height:1.1};case'mailboxlow':return{pack:'mailboxlow',index:0,height:1.1};case'busshelter':return{pack:'busshelter',index:0,height:2.4};case'bin':return{pack:h%2?'props':'city',index:h%2?1:3,height:1.1};
 case'billboard':return{pack:'billboard',index:0,height:6};case'stop':return{pack:'signs',index:0,height:2.4};case'yield':return{pack:'signs',index:1,height:2.4};
 case'container':return{pack:'city',index:pick(h,2),height:2.59};case'barrier':return{pack:'props',index:3,height:0.9};
 case'deadfir':return{pack:'deadfir',index:pick(h,4),height:8};case'shrub':return{pack:'city',index:5,height:0.9};
 case'cone':return{pack:'props',index:4,height:.75};case'electricbox':return{pack:'electricbox',index:0,height:1.35};case'stormdrain':return{pack:'storm_drain',index:0,height:.28};
 case'vehicle':return{pack:'vehicles',index:pick(h,11),length:4.5};default:return null;}}
const LAYER='bp-source-street-details-v1';
export function attachStreetDetail(map){
 if(!map||map.__BP_STREET_DETAIL_V1__)return;const d=map.__BP_STREET_DETAIL_V1__={version:1,status:'standby',objects:0,drawCalls:0,triangles:0,frames:0,sourceBacked:true,proxyModels:true};window.__BP_STREET_DETAIL_V1__=d;
 const mobile=matchMedia('(max-width: 700px)').matches||navigator.deviceMemory<=4,cap=mobile?24:64;let disposed=false,timer=0,seq=0,T,loader,scene,camera,renderer,layer,last='',paverPending=false,paverReady=false;
 const templates=new Map(),groups=[];
 function clear(){for(const g of groups.splice(0)){scene?.remove(g);g.dispose?.();}d.objects=0;d.drawCalls=0;d.triangles=0;map.triggerRepaint?.();}
 function schedule(){clearTimeout(timer);timer=setTimeout(()=>refresh().catch(e=>{d.status='fallback';d.error=String(e).slice(0,180)}),650);}
 function credit(){const box=map.getContainer?.().querySelector('.maplibregl-ctrl-attrib-inner');if(box&&!box.querySelector('[data-bp-street-credit]')){const a=document.createElement('a');a.dataset.bpStreetCredit='1';a.href=BASE+'credits.html';a.target='_blank';a.rel='noopener noreferrer';a.textContent=' · Street model credits';box.append(a);}}
 async function paving(){if(paverPending||paverReady)return;const id='bp-source-paving-stone-v1',target='gta-bp-sidewalk-slabs-v1';if(!map.getLayer(target))return;
  paverPending=true;try{const r=await fetch(BASE+'pavers.png');if(!r.ok)throw Error('PAVER_HTTP');const img=await createImageBitmap(await r.blob());if(disposed){img.close();return}if(!map.hasImage(id))map.addImage(id,img,{pixelRatio:2});img.close();
   // Only existing mapped paving-stone slabs change; concrete, brick, road and terrain are unchanged.
   const original=map.getPaintProperty(target,'fill-extrusion-pattern');if(!Array.isArray(original)||!JSON.stringify(original).includes('bp-sidewalk-pavers-v1'))return;
   const replacement=JSON.parse(JSON.stringify(original).replaceAll('bp-sidewalk-pavers-v1',id));map.setPaintProperty(target,'fill-extrusion-pattern',replacement);paverReady=true;d.paving=true;credit();
  }catch(e){d.paverError=String(e).slice(0,150)}finally{paverPending=false;}}
 function points(){const c=map.getCenter(),all=[],seen=new Set();const sources=[['bpLivingWorld',null],['ofm','poi'],['bp-global-streetlights-overture-source-v2','infrastructure']];
  for(const [id,sl] of sources){if(!map.getSource(id))continue;let fs=[];try{fs=map.querySourceFeatures(id,sl?{sourceLayer:sl}:{})}catch(_){}
   for(const f of fs.slice(0,6000)){if(f.geometry?.type!=='Point')continue;const p=f.properties||{},kind=sourceKind(p);if(!kind)continue;
    // Existing full streetlight renderer and tree renderer keep authority when active.
    if(kind==='light'&&map.getLayer('bp-global-streetlights-3d-v1'))continue;
    const q=f.geometry.coordinates;if(!q||!q.slice(0,2).every(Number.isFinite))continue;const x=(q[0]-c.lng)*111195*Math.cos(c.lat*Math.PI/180),y=(q[1]-c.lat)*111195,dist=Math.hypot(x,y);if(dist>(mobile?180:320))continue;
    const id2=kind+':'+q[0].toFixed(6)+':'+q[1].toFixed(6);if(seen.has(id2))continue;seen.add(id2);
    const px=map.project(q);const canvas=map.getCanvas();if(px.x< -60||px.y< -60||px.x>canvas.clientWidth+60||px.y>canvas.clientHeight+60)continue;
    let z=0;try{if(map.getTerrain?.()){z=map.queryTerrainElevation(q,{exaggerated:true});if(!Number.isFinite(z))continue}}catch(_){continue}
    const spec=propAsset(kind,id2);if(!spec)continue;const height=Number(p.height_m||p.render_height_m||p.pole_height_m);if(kind==='light'&&height>=3&&height<=35)spec.height=height;
    const bearing=Number(p.bearing??p.direction??p.azimuth);all.push({key:id2,q,z,kind,spec,dist,yaw:Number.isFinite(bearing)?(90-bearing)*Math.PI/180:0});
   }
  }return all.sort((a,b)=>a.dist-b.dist).slice(0,cap);}
 async function template(spec){const key=spec.pack+'|'+spec.index;if(!templates.has(key)){const job=(async()=>{const gltf=await loadStreetGLTF(loader,{url:BASE+spec.pack+'.glb.gz'}),root=gltf.scenes[spec.index];if(!root)throw Error('MISSING_SCENE');const bounds=normalizedBounds(T,root),parts=[];let triangles=0;
   root.traverse(o=>{if(!o.isMesh||!o.geometry)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld);g.translate(-bounds.base.x,-bounds.box.min.y,-bounds.base.z);g.computeBoundingSphere();triangles+=(g.index?.count||g.attributes.position.count)/3;parts.push({g,m:o.material});});if(!parts.length||triangles>180000)throw Error('STREET_MESH_BUDGET');return{parts,size:bounds.size,triangles};})().catch(e=>{templates.delete(key);throw e});templates.set(key,job);}return templates.get(key);}
 function install(){if(map.getLayer(LAYER))return;layer={id:LAYER,type:'custom',renderingMode:'3d',onAdd(m,gl){renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false,alpha:true});renderer.autoClear=false;renderer.info.autoReset=false;renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.NoToneMapping;camera=new T.Camera();scene=new T.Scene();scene.add(new T.HemisphereLight(0xdfefff,0x676757,2));const light=new T.DirectionalLight(0xffecd7,2);light.position.set(-40,60,45);scene.add(light);},render(gl,args){if(!renderer||!scene||!groups.length||map.getZoom()<16.5||document.hidden)return;const m=args?.defaultProjectionData?.mainMatrix;if(!m)return;camera.projectionMatrix.fromArray(m);renderer.resetState();renderer.info.reset();renderer.render(scene,camera);d.drawCalls=renderer.info.render.calls;d.triangles=renderer.info.render.triangles;d.frames++;},onRemove(){clear();renderer?.dispose();renderer=null;scene=null;}};map.addLayer(layer,map.getLayer('gta-water-label')?'gta-water-label':undefined);}
 async function refresh(){if(disposed)return;if(map.getZoom()<16.5){if(groups.length)clear();last='';d.status='standby';return;}if(map.isMoving?.())return;
  await paving();const candidates=points(),key=candidates.map(x=>x.key).join('|');if(key===last&&map.getLayer(LAYER))return;const run=++seq;if(!candidates.length){if(groups.length)clear();d.status='waiting-for-source';last='';return;}
  if(!T){const mods=await Promise.all([import(THREE_URL),import(LOADER_URL)]);T=mods[0];loader=new mods[1].GLTFLoader();}if(disposed||run!==seq||map.getZoom()<16.5)return;
  if(!map.getLayer(LAYER))install();if(!scene)return;
  const batches=new Map();for(const x of candidates){const k=x.spec.pack+'|'+x.spec.index;if(!batches.has(k))batches.set(k,[]);batches.get(k).push(x)}
  const loaded=await Promise.allSettled([...batches.values()].map(async xs=>({xs,t:await template(xs[0].spec)})));if(disposed||run!==seq||map.getZoom()<16.5||map.isMoving?.()||!scene)return;
  const next=[];let count=0,triangleBudget=mobile?160000:480000;for(const a of loaded){if(a.status!=='fulfilled')continue;const {xs,t}=a.value;const use=[];for(const x of xs){if(t.triangles>triangleBudget)break;const ma=map.transform?.getMatrixForModel?.(x.q,x.z);if(!ma)continue;const scale=x.spec.length?x.spec.length/Math.max(t.size.x,t.size.z):x.spec.height/t.size.y;if(!Number.isFinite(scale)||scale<=0)continue;use.push(new T.Matrix4().fromArray(ma).multiply(new T.Matrix4().makeRotationY(x.yaw)).multiply(new T.Matrix4().makeScale(scale,scale,scale)));triangleBudget-=t.triangles;}
   if(!use.length)continue;for(const part of t.parts){const mesh=new T.InstancedMesh(part.g,part.m,use.length);mesh.frustumCulled=false;for(let i=0;i<use.length;i++)mesh.setMatrixAt(i,use[i]);mesh.instanceMatrix.needsUpdate=true;next.push(mesh);}count+=use.length;}
  clear();for(const mesh of next){groups.push(mesh);scene.add(mesh)}d.objects=count;d.status=count?'ready':'source-fallback';d.sourceCandidates=candidates.length;d.loadedPacks=[...new Set(candidates.map(x=>x.spec.pack))];last=key;credit();map.triggerRepaint();}
 map.on('moveend',schedule);map.on('zoomend',schedule);map.on('style.load',()=>{last='';paverReady=false;schedule()});map.on('sourcedata',e=>{if(['bpLivingWorld','ofm','bp-global-streetlights-overture-source-v2'].includes(e.sourceId)&&map.getZoom()>=16.5&&!map.isMoving?.())schedule()});map.on('remove',()=>{disposed=true;seq++;clearTimeout(timer);clear()});schedule();
}

