// Source-backed street placement, V14. No invented hydrant/crossing records.
const D=Math.PI/180,R=6378137,clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const low=x=>String(x??'').toLowerCase();
const classes={motorway:22,trunk:17,primary:14,secondary:11,tertiary:9,minor:7,residential:7,unclassified:7,living_street:6,service:5,road:6};
const paths=new Set(['path','footway','pedestrian','cycleway','sidewalk','crossing','crosswalk','steps']);
const width=p=>{const w=parseFloat(p.width??p.width_m??p['width:carriageway']),n=parseInt(p.lanes);return w>=2.5&&w<=60?w:n>0&&n<=16?n*3.25:classes[low(p.class)]||0;};
const query=(map,id,sl)=>{try{return map.getSource(id)?map.querySourceFeatures(id,sl?{sourceLayer:sl}:{}):[]}catch(_){return []}};
const lines=g=>g?.type==='LineString'?[g.coordinates]:g?.type==='MultiLineString'?g.coordinates:[];
const polys=g=>g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
const pointIn=(p,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside}return inside;};
const distance=(p,a,b)=>{const dx=b[0]-a[0],dy=b[1]-a[1],s=dx*dx+dy*dy,t=s?clamp(((p[0]-a[0])*dx+(p[1]-a[1])*dy)/s,0,1):0,q=[a[0]+dx*t,a[1]+dy*t];return {d:Math.hypot(p[0]-q[0],p[1]-q[1]),q,dx,dy};};
export function placementIndex(map){
 const c=map.getCenter(),cos=Math.max(.12,Math.cos(c.lat*D)),xy=q=>[(q[0]-c.lng)*R*D*cos,(q[1]-c.lat)*R*D],ll=q=>[c.lng+q[0]/(R*D*cos),c.lat+q[1]/(R*D)];
 const grid=new Map(),size=64,roads=[],buildings=[],seen=new Set();
 const add=(obj,bb,pad)=>{const x0=Math.floor((bb[0]-pad)/size),x1=Math.floor((bb[2]+pad)/size),y0=Math.floor((bb[1]-pad)/size),y1=Math.floor((bb[3]+pad)/size);if((x1-x0+1)*(y1-y0+1)>20000)return;for(let x=x0;x<=x1;x++)for(let y=y0;y<=y1;y++){const k=x+':'+y;let bin=grid.get(k);if(!bin)grid.set(k,bin=[]);bin.push(obj)}};
 const bbox=ps=>ps.reduce((b,p)=>[Math.min(b[0],p[0]),Math.min(b[1],p[1]),Math.max(b[2],p[0]),Math.max(b[3],p[1])],[Infinity,Infinity,-Infinity,-Infinity]);
 const roadSource=query(map,'ofm','transportation'), fallback=query(map,'bpLivingWorld');
 for(const f of [...roadSource,...fallback]){const p=f.properties||{},w=width(p);if(!w||paths.has(low(p.subclass))||['bridge','tunnel'].includes(low(p.brunnel))||low(p.bridge)==='yes'||low(p.tunnel)==='yes')continue;
  for(const line of lines(f.geometry))for(let i=1;i<line.length;i++){const a=xy(line[i-1]),b=xy(line[i]);if(Math.hypot(b[0]-a[0],b[1]-a[1])<.1)continue;const key=[a,b].map(x=>x.map(v=>v.toFixed(1)).join(',')).sort().join('|');if(seen.has(key))continue;seen.add(key);const o={kind:'road',a,b,w,sidewalk:low(p.sidewalk)!=='no'&&!['motorway','trunk'].includes(low(p.class))};roads.push(o);add(o,bbox([a,b]),w/2+12);}}
 for(const [id,sl] of [['ofm','building'],['bpBuildings','buildings'],['bpCityStructures','buildings'],['exact',null],['bpLivingWorld',null]])for(const f of query(map,id,sl)){const p=f.properties||{};if(id==='bpLivingWorld'&&!p.building&&!/building/i.test(String(p.class||p.layer_key||'')))continue;for(const poly of polys(f.geometry)){const rings=poly.map(r=>r.map(xy));if(!rings[0]?.length)continue;const o={kind:'building',rings};buildings.push(o);add(o,bbox(rings[0]),8);}}
 const near=p=>grid.get(Math.floor(p[0]/size)+':'+Math.floor(p[1]/size))||[];
 const blocked=(p,margin=0,excludeRoad=null)=>near(p).some(o=>o.kind==='road'?o!==excludeRoad&&distance(p,o.a,o.b).d<o.w/2+margin:pointIn(p,o.rings[0])&&!o.rings.slice(1).some(r=>pointIn(p,r))||margin>0&&o.rings.some(r=>r.some((a,i)=>i>0&&distance(p,a,r[i-1]).d<margin)));
 const nearest=(p,max=12)=>{let best=null;for(const o of near(p))if(o.kind==='road'){const v=distance(p,o.a,o.b);if(v.d<=max&&(!best||v.d<best.d))best={...v,road:o}}return best};
 function hydrant(q){const p=xy(q),r=nearest(p,12);if(!r||!r.road.sidewalk)return null;const h=r.road.w/2,target=h+.75;
  if(r.d>=h+.2&&r.d<=h+1.7&&!blocked(p,.15))return q;
  const norm=Math.hypot(r.dx,r.dy),nx=-r.dy/norm,ny=r.dx/norm,side=(p[0]-r.q[0])*nx+(p[1]-r.q[1])*ny;if(Math.abs(side)<.15)return null;
  const dest=[r.q[0]+Math.sign(side)*nx*target,r.q[1]+Math.sign(side)*ny*target];if(Math.hypot(dest[0]-p[0],dest[1]-p[1])>3||blocked(dest,.15))return null;return ll(dest);}
 return {xy,ll,roads,buildings,roadSource,blocked,nearest,hydrant,treeAllowed:q=>!blocked(xy(q),.8)};
}
export function crossingQuads(index){
 const out=[],seen=new Set();
 function add(a,b){const len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<1||len>65)return;const key=[a,b].map(p=>p.map(v=>Math.round(v*2)).join(',')).sort().join('|');if(seen.has(key))return;seen.add(key);const ux=(b[0]-a[0])/len,uy=(b[1]-a[1])/len,nx=-uy*1.25,ny=ux*1.25;
  for(let t=.15;t+.45<len;t+=.95){const s=[a[0]+ux*t,a[1]+uy*t],e=[s[0]+ux*.45,s[1]+uy*.45];const mid=[(s[0]+e[0])/2,(s[1]+e[1])/2];if(!index.nearest(mid,35)||!index.blocked(mid,0))continue;out.push([[s[0]+nx,s[1]+ny],[e[0]+nx,e[1]+ny],[e[0]-nx,e[1]-ny],[s[0]-nx,s[1]-ny]]);}}
 for(const f of index.roadSource){const p=f.properties||{};if(!['crossing','crosswalk'].includes(low(p.subclass))&&!['crossing','crosswalk'].includes(low(p.footway))&&low(p.highway)!=='crossing')continue;if(['unmarked','no'].includes(low(p.crossing)))continue;
  if(f.geometry?.type==='Point'){const q=index.xy(f.geometry.coordinates),r=index.nearest(q,4);if(r){const n=Math.hypot(r.dx,r.dy),x=-r.dy/n*r.road.w/2,y=r.dx/n*r.road.w/2;add([r.q[0]-x,r.q[1]-y],[r.q[0]+x,r.q[1]+y]);}}
  else for(const l of lines(f.geometry))for(let i=1;i<l.length;i++)add(index.xy(l[i-1]),index.xy(l[i]));}
 return out;
}
export function attachStreetPlacement(map){
 if(map.__BP_STREET_PLACEMENT_V14__)return;const state=map.__BP_STREET_PLACEMENT_V14__={status:'loading',hydrants:0,crosswalkStripes:0};window.__BP_STREET_PLACEMENT_V14__=state;
 let T,scene,camera,renderer,parts,group,anchor,base,timer=0,dead=false,busy=false,again=false,signature='',job;
 const ID='bp-street-placement-v14';
 const sample=q=>{try{return map.getTerrain?.()?map.queryTerrainElevation(q,{exaggerated:true}):0}catch(_){return null}};
 function clear(){if(group){scene?.remove(group);group.traverse(o=>{if(o.userData.owned)o.geometry.dispose();if(o.isInstancedMesh)o.dispose?.()});group=null;}state.hydrants=state.crosswalkStripes=0;}
 let white;
 function install(){if(map.getLayer(ID))return;map.addLayer({id:ID,type:'custom',renderingMode:'3d',onAdd(m,gl){renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,alpha:true,antialias:false});renderer.autoClear=false;renderer.outputColorSpace=T.SRGBColorSpace;camera=new T.Camera();scene=new T.Scene();scene.add(new T.HemisphereLight(0xe8f0f5,0x625e50,1.8));const sun=new T.DirectionalLight(0xffefd8,2);sun.position.set(-35,60,45);scene.add(sun);white=new T.MeshBasicMaterial({color:0xf3f3ed,side:T.DoubleSide,depthTest:true,depthWrite:true,polygonOffset:true,polygonOffsetFactor:-3,polygonOffsetUnits:-5});},render(gl,args){if(!group||!renderer||map.getZoom()<12.5)return;const m=map.transform?.getMatrixForModel?.(anchor,base),proj=args?.defaultProjectionData?.mainMatrix;if(!m||!proj)return;camera.projectionMatrix.fromArray(proj).multiply(new T.Matrix4().fromArray(m));renderer.resetState();renderer.render(scene,camera);state.frames=(state.frames||0)+1;},onRemove(){clear();white?.dispose();renderer?.dispose();renderer=null;scene=null;}});}
 async function init(){if(!job)job=(async()=>{const [three,gltf,helpers]=await Promise.all([import('/vendor/three.module.js?v=169-local'),import('/vendor/GLTFLoader.bundle.js?v=169-local'),import('/vendor/bp-street-detail-v1.mjs')]);T=three;const asset=await helpers.loadStreetGLTF(new gltf.GLTFLoader(),{url:'/assets/street-detail-v1/hydrant.glb.gz'}),root=asset.scenes[0],b=helpers.normalizedBounds(T,root);parts=[];root.traverse(o=>{if(!o.isMesh||!o.geometry)return;const g=o.geometry.clone().applyMatrix4(o.matrixWorld);g.translate(-b.base.x,-b.box.min.y,-b.base.z);g.scale(.85/b.size.y,.85/b.size.y,.85/b.size.y);parts.push({g,m:o.material});});if(!parts.length)throw Error('HYDRANT_MESH_MISSING');})();return job;}
 async function refresh(){if(dead||map.getZoom()<12.5)return;if(busy){again=true;return;}busy=true;try{await init();if(dead)return;install();if(!scene)return;const index=placementIndex(map),c=map.getCenter(),center=[c.lng,c.lat],z=sample(center);if(!Number.isFinite(z))return;const mat=map.transform?.getMatrixForModel?.(center,z);if(!mat)return;const inv=new T.Matrix4().fromArray(mat).invert(),radius=map.getZoom()<15?1800:map.getZoom()<17?1000:500,cap=innerWidth<=700?100:240,records=[],seen=new Set();
  for(const [id,sl] of [['ofm','poi'],['ofm','transportation'],['bpLivingWorld',null]])for(const f of query(map,id,sl)){const p=f.properties||{};if(f.geometry?.type!=='Point'||![p.class,p.subclass,p.emergency,p.asset_kind,p.man_made].some(v=>['fire_hydrant','hydrant'].includes(low(v))))continue;const q=f.geometry.coordinates,d=Math.hypot(...index.xy(q));if(d>radius)continue;const k=q.map(v=>Number(v).toFixed(6)).join(',');if(seen.has(k))continue;seen.add(k);const at=index.hydrant(q);if(at)records.push({q:at,d});}
  records.sort((a,b)=>a.d-b.d);const quads=crossingQuads(index).filter(q=>Math.hypot(...q[0])<radius).slice(0,4000),selected=records.slice(0,cap),key=center.map(v=>v.toFixed(4)).join(',')+':'+selected.map(r=>r.q.join(',')).join('|')+':'+quads.map(q=>q[0].map(v=>v.toFixed(1)).join(',')).join('|');if(key===signature)return;
  const next=new T.Group(),matrices=[];for(const r of selected){const h=sample(r.q);if(!Number.isFinite(h))continue;const m=map.transform.getMatrixForModel(r.q,h+.47);if(m)matrices.push(new T.Matrix4().fromArray(m).premultiply(inv));}
  for(const part of parts){if(!matrices.length)break;const mesh=new T.InstancedMesh(part.g,part.m,matrices.length);mesh.frustumCulled=false;matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.instanceMatrix.needsUpdate=true;next.add(mesh);}
  const pos=[];let count=0;for(const quad of quads){const verts=quad.map(p=>{const q=index.ll(p),h=sample(q);if(!Number.isFinite(h))return null;const m=map.transform.getMatrixForModel(q,h+.38);return m?new T.Vector3().setFromMatrixPosition(new T.Matrix4().fromArray(m).premultiply(inv)):null});if(verts.some(v=>!v))continue;for(const i of [0,1,2,0,2,3])pos.push(verts[i].x,verts[i].y,verts[i].z);count++;}
  if(pos.length){const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));const mesh=new T.Mesh(g,white);mesh.frustumCulled=false;mesh.userData.owned=true;next.add(mesh);}
  clear();group=next;anchor=center;base=z;scene.add(group);signature=key;state.status='ready';state.hydrants=matrices.length;state.crosswalkStripes=count;state.heightMeters=.85;state.source='mapped hydrants and crossings';map.triggerRepaint();
 }catch(e){state.error=String(e).slice(0,200);state.status='retry';job=null;}finally{busy=false;if(again){again=false;schedule()}}}
 function schedule(){if(dead||timer)return;timer=setTimeout(()=>{timer=0;void refresh()},350)}
 map.on('move',schedule);map.on('moveend',schedule);map.on('zoomend',schedule);map.on('sourcedata',e=>{if(e.isSourceLoaded&&['ofm','bpLivingWorld','bpBuildings','bpCityStructures'].includes(e.sourceId))schedule()});map.on('style.load',()=>{signature='';schedule()});map.once('remove',()=>{dead=true;clearTimeout(timer);clear()});schedule();
}
