// Source-backed, meter-anchored traffic furniture. Original CC-BY Sketchfab assets.
// Traffic control points are mapped by OSM; pole offsets, hardware style and light phases are visual estimates.
const ID='bp-traffic-furniture-v1',BASE='/assets/street-detail-v1/',DATA='/data/bp-traffic-furniture-v1/',R=6378137,rad=Math.PI/180,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=b=>(b%360+360)%360,angleDiff=(a,b)=>Math.abs(((a-b+540)%360)-180);
const meters=(a,b)=>[(b[0]-a[0])*rad*R*Math.cos(a[1]*rad),(b[1]-a[1])*rad*R];
const dist=(a,b)=>Math.hypot(...meters(a,b)),bearing=(a,b)=>wrap(Math.atan2(...meters(a,b))/rad);
const offset=(p,a,m)=>[p[0]+Math.sin(a*rad)*m/(R*rad*Math.max(.01,Math.cos(p[1]*rad))),p[1]+Math.cos(a*rad)*m/(R*rad)];
const coords=n=>[n.lon,n.lat];
const parseDirection=x=>{if(x==null||x==='')return null;if(Number.isFinite(Number(x)))return wrap(Number(x));return ({N:0,NE:45,E:90,SE:135,S:180,SW:225,W:270,NW:315})[String(x).toUpperCase()]??null};
const rank=t=>({motorway:7,trunk:6,primary:5,secondary:4,tertiary:3,unclassified:2,residential:2,living_street:1,service:1})[String(t.highway||'').replace('_link','')]||0;
const motor=w=>rank(w.tags||{})>0;
const roadWidth=t=>{const n=parseFloat(t.width);if(Number.isFinite(n)&&n>=2.5&&n<50)return n;const lanes=clamp(parseInt(t.lanes)||(/^(motorway|trunk)/.test(t.highway)?3:t.oneway==='yes'?1:2),1,10);return lanes*3.15;};
const isPed=t=>t.crossing==='traffic_signals'||t['crossing:signals']==='yes'||['pedestrian','pedestrian_crossing','pedestrian_signals'].includes(t.traffic_signals);
const isVehicle=t=>t.highway==='traffic_signals'&&!['pedestrian','pedestrian_signals'].includes(t.traffic_signals);
export function signKind(t={}){
 const h=t.highway||'',s=String(t.traffic_sign||'').toLowerCase().split(';');
 if(h==='stop'||s.some(x=>/^(stop|stop_sign|us:r1-1|de:206|gb:601\.1|au:r1-1)$/.test(x)))return 'stop';
 if(h==='give_way'||s.some(x=>/^(give_way|yield|yield_sign|us:r1-2|de:205|gb:602|au:r1-2)$/.test(x)))return 'yield';
 if(s.some(x=>/^(one_way|oneway|us:r6-1|us:r6-2|de:220)$/.test(x)))return 'oneway';
 if(s.some(x=>/^(parking|parking_lot|us:d4-1|de:314)$/.test(x)))return 'parking';
 if(s.some(x=>/^(pedestrian_crossing|pedestrian_crossing_ahead|us:w11-2|de:133)$/.test(x)))return 'warning';
 return null;
}
function insideRing(p,ring){let yes=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])yes=!yes;}return yes;}
function leftDriving(p,tag,polys){if(tag==='left')return true;if(tag==='right')return false;return (polys||[]).some(r=>insideRing(p,r[0])&&!r.slice(1).some(h=>insideRing(p,h)));}
function approaches(n,ways,wantPed=false){
 const p=coords(n),all=[];
 for(const w of ways){
   if(wantPed?motor(w):!motor(w))continue;
   const i=w.nodes?.indexOf(n.id)??-1,g=w.geometry||[],t=w.tags||{};if(i<0||!g[i])continue;
   const one=['yes','1','true'].includes(t.oneway)||t.junction==='roundabout',reverse=t.oneway==='-1';
   const add=(step,dir)=>{for(let j=i+step;j>=0&&j<g.length;j+=step){const q=g[j];if(!q||dist(p,coords(q))<.3)continue;all.push({face:bearing(p,coords(q)),dir,step,i,w,width:roadWidth(t),rank:rank(t)});break;}};
   if(!reverse||wantPed)add(-1,'forward');if(!one||wantPed)add(1,'backward');
 }
 return all.filter((x,i)=>all.findIndex(y=>angleDiff(x.face,y.face)<15)===i);
}
function nearestRoad(p,ways){
 let best=null;
 for(const w of ways){if(!motor(w))continue;const g=w.geometry||[],t=w.tags||{};for(let i=1;i<g.length;i++){
   if(!g[i-1]||!g[i])continue;const a=coords(g[i-1]),b=coords(g[i]),u=meters(p,a),v=meters(a,b),den=v[0]**2+v[1]**2;if(den<.1)continue;
   const f=clamp(-(u[0]*v[0]+u[1]*v[1])/den,0,1),x=u[0]+v[0]*f,y=u[1]+v[1]*f,d=Math.hypot(x,y);
   if(d>22||(best&&d>=best.d))continue;const q=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];best={d,q,forward:bearing(a,b),w,width:roadWidth(t),rank:rank(t)};
 }}return best;
}
function approachToJunction(a,counts,p){let d=0,prev=p;for(let j=a.i-a.step;j>=0&&j<a.w.nodes.length;j-=a.step){const q=a.w.geometry[j];if(!q)break;const ll=coords(q);d+=dist(prev,ll);if(d>75)break;if((counts.get(a.w.nodes[j])||0)>1)return d;prev=ll;}return Infinity;}
export function layout(elements,polys=[]){
 const ways=elements.filter(x=>x.type==='way'&&x.tags?.highway&&x.geometry?.length),nodes=elements.filter(x=>x.type==='node'&&Number.isFinite(x.lat)&&Number.isFinite(x.lon)),out=[],counts=new Map();
 for(const w of ways)if(motor(w))for(const id of new Set(w.nodes||[]))counts.set(id,(counts.get(id)||0)+1);
 for(const n of nodes){
  const t=n.tags||{},p=coords(n),kind=signKind(t),veh=isVehicle(t),ped=isPed(t);if(!kind&&!veh&&!ped)continue;
  const a=approaches(n,ways),near=a.length?null:nearestRoad(p,ways),side=leftDriving(p,t.driving_side||a[0]?.w.tags?.driving_side||near?.w.tags?.driving_side,polys)?-1:1;
  const raw=t['traffic_sign:direction']??t['stop:direction']??t['traffic_signals:direction']??t.direction,absolute=parseDirection(raw);
  let chosen=a.filter(x=>!['forward','backward'].includes(raw)||x.dir===raw);
  if(absolute!==null){
    const face=wrap(absolute+180);const close=a.slice().sort((x,y)=>angleDiff(x.face,face)-angleDiff(y.face,face))[0];
    chosen=[{...(close||near||{}),face,width:close?.width||near?.width||6.3}];
  }else if(!a.length&&near){
    const one=near.w.tags.oneway,roadside=bearing(near.q,p);
    let face=wrap(near.forward+180);
    if(one==='-1')face=near.forward;
    else if(one!=='yes'&&angleDiff(wrap(face-90*side),roadside)>90)face=wrap(face+180);
    chosen=[{...near,face}];
  }
  if(kind){
   let signs=chosen;
   const tagged=!!t.traffic_sign,physical=!a.length&&tagged;
   if(kind==='stop'||kind==='yield'){
    const stopDir=String(t.stop||'').split(';').map(parseDirection).filter(x=>x!==null);
    if(stopDir.length)signs=signs.filter(x=>stopDir.some(y=>angleDiff(x.face,y)<35));
    else if(t.stop==='minor'&&signs.length>2){const min=Math.min(...signs.map(x=>x.rank||0));signs=signs.filter(x=>x.rank===min);}
    else if(t.stop!=='all'&&raw!=='both'&&absolute===null&&!['forward','backward'].includes(raw)&&signs.length>1){
      // A mapped approach control is not proof that every leg has a stop sign.
      const ordered=signs.map(x=>({x,d:approachToJunction(x,counts,p)})).sort((x,y)=>x.d-y.d);
      if(Number.isFinite(ordered[0].d)&&(ordered[1]?.d??Infinity)>ordered[0].d+3)signs=[ordered[0].x];
      else if(signs.length>2)signs=[];else if(signs.length===2&&angleDiff(signs[0].face,signs[1].face)<100)signs=[signs[0]];
      else if(!tagged)signs=[];else signs=signs.slice(0,1);
    }
   }else if(signs.length>1&&raw!=='both')signs=signs.slice(0,1);
   for(const [i,x] of signs.entries()){
    const q=physical?p:offset(offset(p,x.face,.6),wrap(x.face-90*side),clamp(x.width/2+.85,2,18));
    out.push({id:n.id+'-s-'+i,node:n.id,kind,q,face:x.face,side,height:2.6,source:p,estimated:!physical||absolute===null});
   }
  }
  if(veh){
   for(const [i,x] of chosen.entries()){
    const half=clamp(x.width/2,2.1,16),physical=!a.length&&absolute!==null;
    const q=physical?p:offset(offset(p,wrap(x.face+180),a.length>2?half+1:2),wrap(x.face-90*side),half+1);
    out.push({id:n.id+'-v-'+i,node:n.id,kind:'vehicle',q,face:x.face,side,arm:half+1.7,source:p,estimated:!physical||!t['traffic_signals:mount']});
   }
  }
  if(ped){
   let a2=approaches(n,ways,true);if(!a2.length&&chosen.length){const f=chosen[0].face;a2=[{face:wrap(f+90)},{face:wrap(f-90)}];}
   // Install only on a mapped controlled crossing. Heads face the opposite curb.
   for(const [i,x] of a2.slice(0,4).entries()){
    const width=clamp((chosen[0]?.width||near?.width||6.3)/2+1,2.7,18),q=offset(p,x.face,width);
    out.push({id:n.id+'-p-'+i,node:n.id,kind:'pedestrian',q,face:wrap(x.face+180),side,height:2.8,source:p,estimated:true});
   }
  }
 }
 return out;
}
const TZ=14,N=2**TZ;
function tile(p){return [((Math.floor((p.lng+180)/360*N)%N)+N)%N,clamp(Math.floor((1-Math.asinh(Math.tan(clamp(p.lat,-85,85)*rad))/Math.PI)/2*N),0,N-1)];}
const corner=(x,y)=>[x/N*360-180,Math.atan(Math.sinh(Math.PI*(1-2*y/N)))/rad];
export function tileBBox(x,y){const nw=corner(x,y),se=corner(x+1,y+1);return [se[1],nw[0],nw[1],se[0]].map(v=>v.toFixed(6)).join(',');}
export function overpassQuery(x,y){const bb=tileBBox(x,y);return '[out:json][timeout:20];(node["highway"~"^(traffic_signals|stop|give_way)$"]('+bb+');node["traffic_sign"]('+bb+');node["crossing"="traffic_signals"]('+bb+');node["crossing:signals"="yes"]('+bb+');)->.controls;.controls out body;(way(bn.controls)["highway"];way(around.controls:20)["highway"];);out body geom;';}
let polysJob;
async function polys(){if(!polysJob)polysJob=fetch(DATA+'left-driving.json',{cache:'force-cache'}).then(r=>r.ok?r.json():[]).catch(()=>[]);return polysJob;}
async function fetchTile(x,y){
 const key=DATA+'cache/'+x+'-'+y+'.json';let store;
 try{store=await caches.open('bp-traffic-furniture-v1');const cached=await store.match(key);if(cached){const j=await cached.json();if(Date.now()-j.at<7*86400000)return j.rows;}}catch(_){}
 const query=overpassQuery(x,y);let source=null;
 try{const r=await fetch(DATA+'tiles/'+x+'-'+y+'.json',{cache:'force-cache'});if(r.ok){const j=await r.json();if(Array.isArray(j.elements))source=j;}}catch(_){}
 if(!source)for(const endpoint of ['https://overpass-api.de/api/interpreter','https://overpass.private.coffee/api/interpreter']){
   try{const r=await fetch(endpoint+'?data='+encodeURIComponent(query),{signal:AbortSignal.timeout(27000)});if(!r.ok)continue;const j=await r.json();if(Array.isArray(j.elements)&&!j.remark){source=j;break;}}catch(_){}
 }
 if(!source)throw Error('MAPPED_TRAFFIC_TILE_UNAVAILABLE');
 const rows=layout(source.elements,await polys());
 if(store)try{await store.put(key,new Response(JSON.stringify({at:Date.now(),rows}),{headers:{'Content-Type':'application/json'}}));const keys=await store.keys();for(const k of keys.slice(0,Math.max(0,keys.length-80)))await store.delete(k);}catch(_){}
 return rows;
}
if(typeof WorkerGlobalScope!=='undefined'&&self instanceof WorkerGlobalScope){
 self.onmessage=async e=>{const {x,y,id}=e.data;try{const rows=await fetchTile(x,y);self.postMessage({id,rows});}catch(e){self.postMessage({id,error:String(e)});}};
}
const signIndices={stop:0,yield:1,parking:2,oneway:3,warning:4};
const nodeNames=(a,b)=>Array.from({length:(b-a)/2+1},(_,i)=>'Object_'+(a+i*2));
export function attachTrafficFurniture(map,{provider}={}){
 if(!map||map.__BP_TRAFFIC_FURNITURE_V1__)return;
 const st=map.__BP_TRAFFIC_FURNITURE_V1__={status:'standby',objects:0,frames:0,drawCalls:0,triangleCount:0,source:'OpenStreetMap control nodes',models:'Original CC-BY Sketchfab meshes',signalState:'illustrative simulation, not live',minRenderZoom:14,sourceCoverage:'mapped locations; hardware and unmeasured offsets estimated'};window.__BP_TRAFFIC_FURNITURE_V1__=st;
 const mobile=Math.min(innerWidth,screen.width||innerWidth)<900||matchMedia('(pointer:coarse)').matches,cap=mobile?110:300,triCap=mobile?260000:750000;
 let T,loader,scene,camera,renderer,group,anchor,job,worker,waiting=null,timer=0,closed=false,dirty=true,busy=false,last='',lastFetch=0;
 const cache=new Map(),inflight=new Map(),templates=new Map();
 const getTile=(x,y)=>{const key=x+'-'+y;if(provider)return Promise.resolve(provider({x,y})).then(j=>Array.isArray(j)?layout(j):layout(j.elements||[]));if(!worker){worker=new Worker(import.meta.url,{type:'module'});worker.onmessage=e=>{const p=inflight.get(e.data.id);if(!p)return;inflight.delete(e.data.id);e.data.error?p.reject(Error(e.data.error)):p.resolve(e.data.rows);};}return new Promise((resolve,reject)=>{inflight.set(key,{resolve,reject});worker.postMessage({x,y,id:key});});};
 function wanted(){
  const c=map.getCenter(),[x,y]=tile(c),b=map.getBounds(),[west,north]=tile({lng:b.getWest(),lat:b.getNorth()}),[east,south]=tile({lng:b.getEast(),lat:b.getSouth()}),arr=[];
  for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const tx=(x+dx+N)%N,ty=y+dy;if(ty<0||ty>=N)continue;arr.push({x:tx,y:ty,key:tx+'-'+ty,priority:Math.abs(dx)+Math.abs(dy),visible:ty>=north&&ty<=south&&(west<=east?tx>=west&&tx<=east:tx>=west||tx<=east)});}
  return arr.sort((a,b)=>Number(b.priority===0)-Number(a.priority===0)||Number(b.visible)-Number(a.visible)||a.priority-b.priority);
 }
 function part(root,name,center,scales=[1,1,1],translation=[0,0,0]){
  const o=root.getObjectByName(name);if(!o?.isMesh||!o.geometry)throw Error('SOURCE_SIGNAL_MESH_MISSING:'+name);
  const g=o.geometry.clone().applyMatrix4(o.matrixWorld);g.translate(-center[0],-center[1],-center[2]);g.scale(...scales);g.translate(...translation);g.computeBoundingSphere();
  const material=(Array.isArray(o.material)?o.material[0]:o.material).clone(),mn=material.name||'';
  if(/(?:_ON|^PEDSIG)/.test(mn)&&material.map){material.emissive?.set(0xffffff);material.emissiveMap=material.map;material.emissiveIntensity=.85;}
  return {g,m:material,tri:(g.index?.count||g.attributes.position.count)/3,name};
 }
 function mirror(p){const g=p.g.clone().scale(-1,1,1),ix=g.index?Array.from(g.index.array):Array.from({length:g.attributes.position.count},(_,i)=>i);for(let i=0;i+2<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];g.setIndex(ix);g.computeBoundingSphere();return {...p,g};}
 async function init(){
  if(job)return job;
  job=(async()=>{
   const [three,gl,helpers]=await Promise.all([import('/vendor/three.module.js?v=169-local'),import('/vendor/GLTFLoader.bundle.js?v=169-local'),import('/vendor/bp-street-detail-v1.mjs')]);T=three;loader=new gl.GLTFLoader();
   const [signal,signs]=await Promise.all([helpers.loadStreetGLTF(loader,{url:BASE+'retro-traffic-signals.glb.gz'}),helpers.loadStreetGLTF(loader,{url:BASE+'signs.glb.gz'})]);
   const r=signal.scene;r.updateMatrixWorld(true);
   templates.set('pole',[part(r,'Object_38',[-.0115,0,-5.4958],[2.0,2.02,2.0])]);
   const arm=part(r,'Object_40',[.0408,1.7467,-5.4969],[1/5.8199,1.15,2],[0,5.25,0]);
   templates.set('arm-right',[arm]);templates.set('arm-left',[mirror(arm)]);
   for(const [phase,start,end,cx] of [['red',245,261,1.4754],['amber',263,279,1.976],['green',281,297,2.476]]){
    templates.set('head-'+phase,nodeNames(start,end).map(n=>part(r,n,[cx,.0123,-9.352],[2.1,2.1,2.1],[0,5.64,0])));
   }
   templates.set('ped-pole',[part(r,'Object_230',[.6675,0,-9.5052],[1.9,3.12,1.9])]);
   templates.set('ped-walk',['Object_353','Object_354'].map(n=>part(r,n,[5.1901,-.0047,-9.4182],[2.15,2.15,2.15],[0,2.41,0])));
   templates.set('ped-stop',['Object_356','Object_357'].map(n=>part(r,n,[5.5668,-.0047,-9.4182],[2.15,2.15,2.15],[0,2.41,0])));
   for(const [kind,index] of Object.entries(signIndices)){
    const root=signs.scenes[index];if(!root)throw Error('SOURCE_SIGN_SCENE_MISSING:'+kind);const b=helpers.normalizedBounds(T,root),parts=[],scale=2.6/b.size.y;
    root.traverse(o=>{if(o.isMesh&&o.geometry){const g=o.geometry.clone().applyMatrix4(o.matrixWorld);g.translate(-b.base.x,-b.box.min.y,-b.base.z);g.scale(scale,scale,scale);g.computeBoundingSphere();parts.push({g,m:o.material,tri:(g.index?.count||g.attributes.position.count)/3,name:o.name});}});
    if(!parts.length)throw Error('SOURCE_SIGN_EMPTY:'+kind);templates.set(kind,parts);
   }
   st.sourceTemplates=templates.size;st.originalPedestrianDisplays=['PEDSIG1','PEDSIG2'];st.originalSignalPhases=['red','amber','green'];
   if(closed)return;
   if(!map.getLayer(ID))map.addLayer({id:ID,type:'custom',renderingMode:'3d',onAdd(m,gl){renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,antialias:false});renderer.autoClear=false;renderer.outputColorSpace=T.SRGBColorSpace;camera=new T.Camera();scene=new T.Scene();scene.add(new T.HemisphereLight(0xe5f2ff,0x4b4b43,2));const sun=new T.DirectionalLight(0xffefd6,2);sun.position.set(-40,70,35);scene.add(sun);},render(gl,args){if(!renderer||!group||!anchor||map.getZoom()<14||document.hidden)return;const raw=map.transform?.getMatrixForModel?.(anchor.q,anchor.z);if(!raw||!args?.defaultProjectionData?.mainMatrix)return;camera.projectionMatrix.fromArray(args.defaultProjectionData.mainMatrix).multiply(new T.Matrix4().fromArray(raw));const tick=Math.floor(Date.now()/1000)%48;for(const g of group.children){const p=g.userData.phase;if(!p)continue;const t=(tick+(g.userData.axis?24:0))%48;g.visible=p==='walk'?t>=24&&t<42:p==='stop'?!(t>=24&&t<42):p==='green'?t<19:p==='amber'?t>=19&&t<23:t>=23;}renderer.resetState();renderer.render(scene,camera);st.drawCalls=renderer.info.render.calls;st.frames++;},onRemove(){release();renderer?.dispose();scene=null;renderer=null;}});
   st.status='models-ready';dirty=true;schedule(80);
  })().catch(e=>{job=null;st.status='model-error';st.error=String(e).slice(0,200);});
  return job;
 }
 function release(){if(group){scene?.remove(group);group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});group=null;}anchor=null;st.objects=0;st.drawCalls=0;last='';}
 function select(){
  const c=map.getCenter(),p=[c.lng,c.lat],canvas=map.getCanvas(),seen=new Set(),rows=[];
  for(const t of wanted()){const cached=cache.get(t.key);if(!cached?.rows)continue;for(const x of cached.rows){if(seen.has(x.id))continue;seen.add(x.id);const v=map.project(x.q);if(v.x< -120||v.y< -120||v.x>canvas.clientWidth+120||v.y>canvas.clientHeight+120)continue;rows.push({...x,d:dist(p,x.q)});}}
  return rows.sort((a,b)=>a.d-b.d||a.id.localeCompare(b.id)).slice(0,cap);
 }
 function refresh(){
  if(closed||!scene||!dirty||map.isMoving?.()||map.getZoom()<14)return;dirty=false;
  const rows=select(),key=rows.map(x=>x.id).join('|');if(key===last&&group)return;if(!rows.length){if(group)release();st.status='waiting-for-mapped-controls';return;}
  const c=map.getCenter(),q=[c.lng,c.lat],z=Number(map.queryTerrainElevation?.(q,{exaggerated:true})??0),raw=map.transform?.getMatrixForModel?.(q,z);if(!raw)return;
  const inv=new T.Matrix4().fromArray(raw).invert(),next=new T.Group(),batches=new Map(),types={},claims=[],accepted=[];let triangles=0;
  const add=(name,m,phase=null,axis=0)=>{const k=name+'|'+(phase||'')+'|'+axis;if(!batches.has(k))batches.set(k,{name,phase,axis,matrices:[]});batches.get(k).matrices.push(m);};
  const cost=name=>templates.get(name).reduce((n,p)=>n+p.tri,0);
  for(const x of rows){
   const altitude=map.queryTerrainElevation?.(x.q,{exaggerated:true});if(map.getTerrain?.()&&!Number.isFinite(altitude))continue;
   const m0=map.transform?.getMatrixForModel?.(x.q,Number.isFinite(altitude)?altitude:0);if(!m0)continue;
   const base=new T.Matrix4().fromArray(m0).premultiply(inv),axis=Math.abs(Math.cos(x.face*rad))<.707?1:0;
   const m=base.clone().multiply(new T.Matrix4().makeRotationY(-x.face*rad));
   let need=0;
   if(x.kind==='vehicle'){
     const arm=x.side===-1?'arm-left':'arm-right';need=cost('pole')+cost(arm)+Math.max(...['red','amber','green'].map(p=>cost('head-'+p)));
     if(triangles+need>triCap)continue;add('pole',m);add(arm,m.clone().multiply(new T.Matrix4().makeScale(x.arm,1,1)));
     const head=m.clone().multiply(new T.Matrix4().makeTranslation(x.side*x.arm,0,0));for(const p of ['red','amber','green'])add('head-'+p,head,p,axis);
   }else if(x.kind==='pedestrian'){
     need=cost('ped-pole')+Math.max(cost('ped-walk'),cost('ped-stop'));if(triangles+need>triCap)continue;add('ped-pole',m);add('ped-walk',m,'walk',axis);add('ped-stop',m,'stop',axis);
   }else{
     need=cost(x.kind);if(triangles+need>triCap)continue;add(x.kind,base.clone().multiply(new T.Matrix4().makeRotationY((180-x.face)*rad)));claims.push(x.source);
   }
   triangles+=need;types[x.kind]=(types[x.kind]||0)+1;accepted.push(x);
  }
  if(!accepted.length)return;
  for(const {name,phase,axis,matrices} of batches.values()){
   const g=new T.Group();g.userData={phase,axis};for(const p of templates.get(name)){const mesh=new T.InstancedMesh(p.g,p.m,matrices.length);mesh.frustumCulled=false;for(let i=0;i<matrices.length;i++)mesh.setMatrixAt(i,matrices[i]);mesh.instanceMatrix.needsUpdate=true;g.add(mesh);}next.add(g);
  }
  if(group){scene.remove(group);group.traverse(o=>{if(o.isInstancedMesh)o.dispose();});}group=next;scene.add(group);anchor={q,z};last=key;
  Object.assign(st,{status:'ready',objects:accepted.length,counts:types,triangleCount:triangles,triangleBudget:triCap,originalModels:true,localMeterAnchors:true,zoom:map.getZoom(),claimedSignLocations:claims,examples:accepted.slice(0,8).map(({kind,q,face,source,side,estimated})=>({kind,q,face,source,side,estimated}))});
  map.triggerRepaint();
 }
 function schedule(delay=450){if(closed||timer||map.isMoving?.())return;timer=setTimeout(()=>{timer=0;void pump();},delay);}
 async function pump(){
  if(closed||map.isMoving?.()||map.getZoom()<12.7)return;
  void init();if(map.getZoom()>=14)refresh();
  if(busy||Date.now()-lastFetch<4000)return schedule(4200);
  const wantedTiles=wanted(),t=wantedTiles.find(x=>!cache.has(x.key)||Date.now()-cache.get(x.key).at>(cache.get(x.key).rows?86400000:60000));
  if(!t)return;busy=true;lastFetch=Date.now();st.status=group?'ready':'fetching-mapped-controls';
  try{const rows=await getTile(t.x,t.y);cache.set(t.key,{rows,at:Date.now()});while(cache.size>45)cache.delete(cache.keys().next().value);st.cachedTiles=cache.size;dirty=true;}
  catch(e){cache.set(t.key,{rows:null,at:Date.now()});st.sourceError=String(e).slice(0,140);}
  finally{busy=false;if(!closed&&!map.isMoving?.())schedule(200);}
 }
 function moved(){dirty=true;schedule(250);}
 function started(){clearTimeout(timer);timer=0;}
 for(const ev of ['moveend','zoomend','idle'])map.on(ev,moved);map.on('movestart',started);
 const phases=setInterval(()=>{if(group&&map.getZoom()>=14&&!map.isMoving?.())map.triggerRepaint();},1000);
 map.once('remove',()=>{closed=true;clearInterval(phases);clearTimeout(timer);worker?.terminate();for(const ev of ['moveend','zoomend','idle'])map.off(ev,moved);map.off('movestart',started);release();});
 schedule(100);return st;
}
