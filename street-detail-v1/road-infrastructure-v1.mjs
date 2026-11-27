// BridgePoint real-source lane markings and utility access covers.
// OSM/ODbL, NYC DEP public catch basin inventory. Never synthesize utility coordinates.
const R=6378137,D=Math.PI/180,MIN=12.7,DETAIL=16,ASSET='/assets/street-detail-v1/storm_drain.glb.gz';
const merc=q=>[R*q[0]*D,R*Math.asinh(Math.tan(Math.max(-85,Math.min(85,q[1]))*D))];
const ll=p=>[p[0]/R/D,Math.atan(Math.sinh(p[1]/R))/D];
const low=v=>String(v??'').toLowerCase(),clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const widths={motorway:22,trunk:17,primary:14,secondary:11,tertiary:9,minor:7,residential:7,unclassified:7,living_street:6,service:5,road:6};
const classes=Object.keys(widths);
const LAYER='bp-mapped-road-infrastructure-v1',UNDER='bp-continuous-road-underlay-v1';
export function utilityKind(p={}){
 if(low(p.manhole)==='drain'||['grate','kerb_grate','kerb_opening'].includes(low(p.inlet))||['storm_drain','catch_basin','stormwater_drain','drain'].includes(low(p.man_made))||['storm_drain','catch_basin'].includes(low(p.asset_kind)))return 'drain';
 if(low(p.man_made)==='manhole'||(p.manhole&&low(p.manhole)!=='no'))return 'manhole';
 return null;
}
export function laneSpecs(p={}){
 const n=parseInt(p.lanes,10),one=['yes','true','1','-1'].includes(low(p.oneway)),reverse=low(p.oneway)==='-1';
 const result=[];
 function add(value,dir,count){if(typeof value!=='string'||!value)return;const tags=value.split('|');if(count&&count!==tags.length)return;tags.forEach((t,i)=>{const turns=t.split(';').map(low).filter(x=>['left','slight_left','through','right','slight_right','reverse','merge_to_left','merge_to_right'].includes(x));if(turns.length)result.push({dir,index:i,count:tags.length,turns});});}
 if(one)add(p['turn:lanes']||p['turn:lanes:forward'],reverse?-1:1,n);
 else{add(p['turn:lanes:forward'],1,parseInt(p['lanes:forward'],10));add(p['turn:lanes:backward'],-1,parseInt(p['lanes:backward'],10));}
 return {count:Number.isFinite(n)&&n>=1&&n<=16?n:0,one,reverse,arrows:result};
}
const cache=new Map();
async function getJson(url,opts={}){
 const r=await fetch(url,{...opts,signal:AbortSignal.timeout(14000)});if(!r.ok)throw Error('HTTP '+r.status);return r.json();
}
async function loadCell(c){
 const x=Math.floor(c[0]*100)/100,y=Math.floor(c[1]*100)/100,key=x+':'+y;
 if(cache.has(key))return cache.get(key);
 const box=[y-.002,x-.002,y+.012,x+.012].map(v=>v.toFixed(5)).join(',');
 const query='[out:json][timeout:12];(node["man_made"="manhole"]('+box+');node["manhole"]('+box+');node["inlet"]('+box+');node["man_made"="storm_drain"]('+box+');way["highway"]["lanes"]('+box+');way["highway"]["turn:lanes"]('+box+');way["highway"]["turn:lanes:forward"]('+box+');way["highway"]["turn:lanes:backward"]('+box+'););out geom;';
 const job=(async()=>{
  const jobs=[getJson('https://overpass-api.de/api/interpreter?data='+encodeURIComponent(query))];
  const nyc=x>-74.28&&x<-73.68&&y>40.45&&y<40.94;
  if(nyc){const params=new URLSearchParams({'$select':'the_geom','$where':'within_box(the_geom,'+[y+.012,x-.002,y-.002,x+.012].join(',')+')','$limit':'5000'});jobs.push(getJson('https://data.cityofnewyork.us/resource/2w2g-fk3i.json?'+params));}
  const [osm,dep]=await Promise.allSettled(jobs);const points=[],ways=[];
  if(osm.status==='fulfilled')for(const e of osm.value.elements||[]){
   if(e.type==='node'){const kind=utilityKind(e.tags);if(kind&&Number.isFinite(e.lon)&&Number.isFinite(e.lat))points.push({q:[e.lon,e.lat],kind,source:'OpenStreetMap',id:'osm:'+e.id});}
   if(e.type==='way'&&e.geometry?.length>1){const p=e.tags||{},spec=laneSpecs(p);if(spec.count||spec.arrows.length)ways.push({line:e.geometry.map(v=>[v.lon,v.lat]),p,spec,id:e.id});}
  }
  if(dep?.status==='fulfilled')for(const e of dep.value||[]){const q=e.the_geom?.coordinates;if(q?.length===2&&q.every(Number.isFinite))points.push({q,kind:'drain',source:'NYC DEP citywide catch basins',id:'dep:'+q.join(':')});}
  if(osm.status==='rejected'&&(!dep||dep.status==='rejected'))throw Error('Mapped infrastructure sources unavailable');
  return {points,ways,osm:osm.status,dep:dep?.status||'outside NYC'};
 })();cache.set(key,job);try{return await job;}catch(e){cache.delete(key);throw e;}
}
function lineWidthExpression(){return ['interpolate',['exponential',2],['zoom'],9,['*',.004,['match',['get','class'],'motorway',22,'trunk',17,'primary',14,'secondary',11,'tertiary',9,7]],22,['*',26.8,['match',['get','class'],'motorway',22,'trunk',17,'primary',14,'secondary',11,'tertiary',9,7]]];}
function suppressCrosswalks(map){for(const l of map.getStyle()?.layers||[])if(l.type==='line'&&/crosswalk|crossing[-_].*marking/i.test(l.id))try{map.setLayoutProperty(l.id,'visibility','none');}catch(_){}}
function underlay(map){
 suppressCrosswalks(map);if(!map.getSource('ofm')||map.getLayer(UNDER))return;
 const transport=(map.getStyle()?.layers||[]).find(l=>l.source==='ofm'&&l['source-layer']==='transportation');if(!transport)return;
 const before=(map.getStyle()?.layers||[]).find(l=>l.type==='fill-extrusion'&&/building/i.test(l.id))?.id||(map.getStyle()?.layers||[]).find(l=>l.type==='symbol')?.id;
 try{map.addLayer({id:UNDER,type:'line',source:'ofm','source-layer':'transportation',minzoom:10.5,filter:['all',['in',['get','class'],['literal',classes]],['!', ['in',['get','subclass'],['literal',['crossing','crosswalk','footway','path','cycleway','steps','sidewalk','pedestrian']]]],['!', ['in',['get','brunnel'],['literal',['bridge','tunnel']]]]],layout:{'line-cap':'round','line-join':'round'},paint:{'line-color':'#54575a','line-width':lineWidthExpression(),'line-opacity':1}},before);}catch(e){console.warn('BP road continuity',e);}
}
function nearestRoad(q,roads,max=12){
 const a=merc(q),cos=Math.max(.12,Math.cos(q[1]*D));let best=null;
 for(const road of roads){const A=merc(road.a),B=merc(road.b),dx=B[0]-A[0],dy=B[1]-A[1],sq=dx*dx+dy*dy;if(!sq)continue;const t=clamp(((a[0]-A[0])*dx+(a[1]-A[1])*dy)/sq,0,1),p=[A[0]+dx*t,A[1]+dy*t],d=Math.hypot(a[0]-p[0],a[1]-p[1])*cos;
 if(d<max&&(!best||d<best.d))best={d,p,dx,dy,road,cos};}
 return best;
}
export function attachRoadInfrastructure(map,{network=true}={}){
 if(map.__BP_ROAD_INFRASTRUCTURE_V1__)return map.__BP_ROAD_INFRASTRUCTURE_V1__;
 const state=map.__BP_ROAD_INFRASTRUCTURE_V1__={status:'starting',verifiedUtilityOnly:true,source:'OSM + NYC DEP',drains:0,manholes:0,arrows:0,laneLines:0};window.__BP_ROAD_INFRASTRUCTURE_V1__=state;
 let T,scene,renderer,camera,objects=[],timer=0,dead=false,busy=false,dirty=true,lastKey='',lastFetch=0,records={ways:[],points:[]},drainTemplate=null,cover=null,roads=[];
 function clear(){for(const o of objects){scene?.remove(o);if(o.userData.disposeGeometry)o.geometry.dispose();o.dispose?.();}objects=[];}
 function getRoads(){const out=[];try{for(const f of map.querySourceFeatures('ofm',{sourceLayer:'transportation'})){const p=f.properties||{};if(!classes.includes(low(p.class))||['bridge','tunnel'].includes(low(p.brunnel)))continue;const lines=f.geometry?.type==='LineString'?[f.geometry.coordinates]:f.geometry?.type==='MultiLineString'?f.geometry.coordinates:[];for(const l of lines)for(let i=1;i<l.length;i++)out.push({a:l[i-1],b:l[i],p});}}catch(_){}return out.slice(0,8000);}
 function nativePoints(){const out=[];for(const [id,sl] of [['ofm','poi'],['bpLivingWorld',null],['ofm','transportation']])try{for(const f of map.querySourceFeatures(id,sl?{sourceLayer:sl}:{})){const kind=utilityKind(f.properties);if(kind&&f.geometry?.type==='Point')out.push({kind,q:f.geometry.coordinates,id:id+':'+f.id,source:id});}}catch(_){}return out;}
 function metalCover(){
  const g=new T.CylinderGeometry(.31,.31,.025,48,1),canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#424448';ctx.fillRect(0,0,256,256);ctx.strokeStyle='#686a6c';ctx.lineWidth=4;for(let r=36;r<120;r+=18){ctx.beginPath();ctx.arc(128,128,r,0,Math.PI*2);ctx.stroke();}
  for(let i=0;i<18;i++){const a=i*Math.PI/9;ctx.fillStyle='#27292b';ctx.fillRect(128+Math.cos(a)*95-3,128+Math.sin(a)*95-3,6,6);}
  ctx.fillStyle='#242628';ctx.font='bold 32px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('BP INTEL',128,128);
  const tex=new T.CanvasTexture(canvas);tex.colorSpace=T.SRGBColorSpace;tex.anisotropy=4;
  const top=new T.MeshStandardMaterial({map:tex,color:0xffffff,metalness:.65,roughness:.68});const rim=new T.MeshStandardMaterial({color:0x45474a,metalness:.7,roughness:.72});
  // Actual recessed, extruded letter grooves: dark shallow linework below rim level.
  const grooves=new T.Group(),glyphs={B:[[[0,0],[0,1],[.65,1],[.85,.78],[.65,.53],[0,.53]],[[.65,.53],[.85,.25],[.65,0],[0,0]]],P:[[[0,0],[0,1],[.65,1],[.85,.78],[.65,.53],[0,.53]]],I:[[[.42,0],[.42,1]]],N:[[[0,0],[0,1],[.85,0],[.85,1]]],T:[[[0,1],[.85,1]],[[.425,1],[.425,0]]],E:[[[.85,1],[0,1],[0,0],[.85,0]],[[0,.5],[.65,.5]]],L:[[[0,1],[0,0],[.85,0]]]};
  const lineMat=new T.MeshBasicMaterial({color:0x25272a});
  let x=-.217;for(const ch of 'BP INTEL'){if(ch===' '){x+=.037;continue;}for(const path of glyphs[ch]||[])for(let i=1;i<path.length;i++){const a=path[i-1],b=path[i],dx=(b[0]-a[0])*.057,dz=(b[1]-a[1])*.075,mesh=new T.Mesh(new T.BoxGeometry(Math.hypot(dx,dz),.001,.003),lineMat);mesh.position.set(x+(a[0]+b[0])*.0285,.013,(1-(a[1]+b[1]))*.0375);mesh.rotation.y=-Math.atan2(-dz,dx);grooves.add(mesh);}x+=.057;}
  return {geometry:g,material:[rim,top,rim],grooves};
 }
 function install(){if(map.getLayer(LAYER))return;const before=(map.getStyle()?.layers||[]).find(l=>l.type==='symbol')?.id;
  map.addLayer({id:LAYER,type:'custom',renderingMode:'3d',onAdd(m,gl){renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,alpha:true,antialias:false});renderer.autoClear=false;renderer.outputColorSpace=T.SRGBColorSpace;camera=new T.Camera();scene=new T.Scene();scene.add(new T.HemisphereLight(0xe6f0ff,0x6b645d,2.2));const sun=new T.DirectionalLight(0xffffff,2);sun.position.set(10,40,20);scene.add(sun);},render(gl,args){if(!renderer||!scene||map.getZoom()<DETAIL||document.hidden)return;const m=args?.defaultProjectionData?.mainMatrix;if(!m)return;camera.projectionMatrix.fromArray(m);renderer.resetState();renderer.render(scene,camera);},onRemove(){clear();renderer?.dispose();renderer=null;scene=null;}},before);
 }
 async function init(){const [three,gl,h]=await Promise.all([import('/vendor/three.module.js?v=169-local'),import('/vendor/GLTFLoader.bundle.js?v=169-local'),import('/vendor/bp-street-detail-v1.mjs')]);T=three.default||three;cover=metalCover();try{const asset=await h.loadStreetGLTF(new gl.GLTFLoader(),{url:ASSET}),root=asset.scene||asset.scenes[0];root.updateMatrixWorld(true);const b=h.normalizedBounds(T,root);drainTemplate={parts:[],size:b.size};root.traverse(o=>{if(o.isMesh&&o.geometry){const g=o.geometry.clone().applyMatrix4(o.matrixWorld);g.translate(-b.center.x,-b.box.max.y,-b.center.z);drainTemplate.parts.push({g,m:o.material});}});}catch(e){state.drainAssetError=String(e);}install();}
 function elevation(q){try{const z=map.getTerrain?.()?map.queryTerrainElevation({lng:q[0],lat:q[1]},{exaggerated:true}):0;return Number.isFinite(z)?z:null;}catch{return null;}}
 function matrix(q,offset){const z=elevation(q);if(z===null)return null;const m=map.transform?.getMatrixForModel?.(q,z+offset);return m?new T.Matrix4().fromArray(m):null;}
 function inst(g,m,matrices){if(!matrices.length)return;const o=new T.InstancedMesh(g,m,matrices.length);o.frustumCulled=false;matrices.forEach((v,i)=>o.setMatrixAt(i,v));o.instanceMatrix.needsUpdate=true;scene.add(o);objects.push(o);}
 function rebuild(){
  if(!scene)return;clear();roads=getRoads();const c=map.getCenter(),center=[c.lng,c.lat],origin=merc(center),cos=Math.cos(c.lat*D),radius=map.getZoom()<17?900:450,near=q=>Math.hypot(merc(q)[0]-origin[0],merc(q)[1]-origin[1])*cos<radius;
  const drains=[],covers=[],seen=new Map();
  for(const f of [...records.points,...nativePoints()].filter(f=>f.q?.every(Number.isFinite)&&near(f.q)).sort((a,b)=>Math.hypot(a.q[0]-c.lng,a.q[1]-c.lat)-Math.hypot(b.q[0]-c.lng,b.q[1]-c.lat)).slice(0,500)){
   const q=f.q,k=f.kind+':'+q.map(v=>v.toFixed(5)).join(',');if(seen.has(k))continue;seen.set(k,true);
   const match=nearestRoad(q,roads);if(!match)continue;
   const a=merc(q),side=Math.sign(match.dx*(a[1]-match.p[1])-match.dy*(a[0]-match.p[0]))||1;
   const angle=Math.atan2(match.dx,match.dy);let at=q;
   if(f.kind==='drain'){const len=Math.hypot(match.dx,match.dy),w=parseFloat(match.road.p.width)||widths[low(match.road.p.class)]||7,edge=w/2/match.cos;const snapped=ll([match.p[0]-side*match.dy/len*edge,match.p[1]+side*match.dx/len*edge]);if(Math.hypot(...merc(snapped).map((v,i)=>v-a[i]))*match.cos<=3)at=snapped;}
   const mat=matrix(at,f.kind==='drain'?.47:.475);if(!mat)continue;mat.multiply(new T.Matrix4().makeRotationY(angle));if(f.kind==='drain')drains.push(mat);else covers.push(mat);
  }
  if(drainTemplate){const scale=.65/Math.max(drainTemplate.size.x,drainTemplate.size.z);for(const p of drainTemplate.parts)inst(p.g,p.m,drains.map(m=>m.clone().multiply(new T.Matrix4().makeScale(scale,Math.min(scale,.12/drainTemplate.size.y),scale))));}
  inst(cover.geometry,cover.material,covers);
  if(map.getZoom()>=19)for(const g of cover.grooves.children) {g.updateMatrix();inst(g.geometry,g.material,covers.map(m=>m.clone().multiply(g.matrix)));}
  state.drains=drainTemplate?drains.length:0;state.manholes=covers.length;
  // Lane counts and arrows use recorded OSM tags, not fictitious turn movements.
  const white=[],yellow=[],arrow=[];
  const stripe=(a,b,w,dest)=>{const A=merc(a),B=merc(b),dx=B[0]-A[0],dy=B[1]-A[1],span=Math.hypot(dx,dy),cc=Math.cos(a[1]*D);if(span*cc<.15)return;const mid=ll([(A[0]+B[0])/2,(A[1]+B[1])/2]),m=matrix(mid,.485);if(!m)return;dest.push(m.multiply(new T.Matrix4().makeRotationY(Math.atan2(dx,dy))).multiply(new T.Matrix4().makeScale(w,.003,span*cc)));};
  for(const way of records.ways){const {spec,p,line}=way;if(!spec.count||line.length<2)continue;const width=parseFloat(p.width)||spec.count*3.2;
   for(let i=1;i<line.length;i++){const a=line[i-1],b=line[i];if(!near(a)&&!near(b))continue;const A=merc(a),B=merc(b),dx=B[0]-A[0],dy=B[1]-A[1],len=Math.hypot(dx,dy),cc=Math.cos(a[1]*D);if(len*cc<1)continue;const pt=(f,off)=>ll([A[0]+f*dx-dy/len*off/cc,A[1]+f*dy+dx/len*off/cc]);
    for(let l=1;l<spec.count;l++){const off=width*(l/spec.count-.5),opp=!spec.one&&l===(parseInt(p['lanes:backward'])||Math.floor(spec.count/2));const dash=opp?len*cc:3,step=opp?len*cc:7;for(let t=0;t<len*cc;t+=step)stripe(pt(t/(len*cc),off),pt(Math.min(1,(t+dash)/(len*cc)),off),.105,opp?yellow:white);}
   }
   for(const ar of spec.arrows){const end=ar.dir===1?line.length-1:0,start=ar.dir===1?end-1:1,A=merc(line[start]),B=merc(line[end]),dx=B[0]-A[0],dy=B[1]-A[1],len=Math.hypot(dx,dy),cc=Math.cos(line[end][1]*D);if(len*cc<2)continue;const f=Math.max(.1,1-7/(len*cc)),laneWidth=width/spec.count,off=spec.one?width*((ar.index+.5)/ar.count-.5):(ar.index+.5)*laneWidth;const q=ll([A[0]+dx*f+dy/len*off/cc,A[1]+dy*f-dx/len*off/cc]);if(!near(q))continue;const m=matrix(q,.487);if(!m)continue;m.multiply(new T.Matrix4().makeRotationY(Math.atan2(dx,dy)));arrow.push({m,turns:ar.turns});}
  }
  inst(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0xf5f5f2}),white);inst(new T.BoxGeometry(1,1,1),new T.MeshBasicMaterial({color:0xe5b34f}),yellow);
  const mat=new T.MeshBasicMaterial({color:0xffffff,side:T.DoubleSide});for(const turn of ['through','left','right','slight_left','slight_right','reverse','merge_to_left','merge_to_right']){const list=arrow.filter(a=>a.turns.includes(turn)).map(a=>a.m);if(!list.length)continue;const side=turn.includes('left')?-1:turn.includes('right')?1:0;const shape=new T.Shape();shape.moveTo(-.08,-1.2);shape.lineTo(.08,-1.2);shape.lineTo(.08,.25);if(side){shape.lineTo(side*.55,.25);shape.lineTo(side*.55,.03);shape.lineTo(side*.95,.4);shape.lineTo(side*.55,.78);shape.lineTo(side*.55,.56);shape.lineTo(-.08,.56);}else{shape.lineTo(.08,.55);shape.lineTo(.35,.55);shape.lineTo(0,1.15);shape.lineTo(-.35,.55);shape.lineTo(-.08,.55);}shape.closePath();const g=new T.ShapeGeometry(shape);g.rotateX(-Math.PI/2);inst(g,mat,list);}
  state.laneLines=white.length+yellow.length;state.arrows=arrow.length;state.status='ready';state.sourceStatus={osm:records.osm,nyc:records.dep};map.triggerRepaint();
 }
 async function update(){if(dead||busy||map.isMoving?.())return;underlay(map);if(map.getZoom()<DETAIL){state.status='overview';return;}busy=true;try{if(!T)await init();if(!map.getLayer(LAYER))install();const c=map.getCenter(),key=Math.floor(c.lng*100)+':'+Math.floor(c.lat*100);if(network&&key!==lastKey&&Date.now()-lastFetch>25000){lastFetch=Date.now();try{records=await loadCell([c.lng,c.lat]);lastKey=key;}catch(e){state.sourceError=String(e);}}if(!dead&&!map.isMoving?.())rebuild();}catch(e){state.error=String(e);state.status='error';}finally{busy=false;}}
 function schedule(){if(dead||timer)return;timer=setTimeout(()=>{timer=0;void update();},500);}
 map.on('moveend',schedule);map.on('zoomend',schedule);map.on('style.load',()=>{underlay(map);schedule();});map.on('sourcedata',e=>{if(e.isSourceLoaded&&['ofm','bpLivingWorld','dem'].includes(e.sourceId))schedule();});map.once('remove',()=>{dead=true;clearTimeout(timer);clear();});underlay(map);schedule();return state;
}
