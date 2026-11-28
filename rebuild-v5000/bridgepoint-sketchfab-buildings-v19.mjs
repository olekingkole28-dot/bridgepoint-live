/* Exact Sketchfab building geometry fitted to mapped building footprints.
 * The source GLB is CC-BY-4.0; geometry is cloned and sized to GIS footprint
 * dimensions/height. It does not claim that a generic source mesh is the real
 * identity of the building at that address.
 */
const T_URL = '/vendor/three.module.js?v=169-local';
const GL_URL = '/vendor/GLTFLoader.bundle.js?v=169-local';
const H_URL = '/vendor/bp-street-detail-v1.mjs?v=20261127-sketchfab-models';
const MODEL_URL = '/assets/street-detail-v1/buildings/glass-building-low-poly.glb.gz?v=20261127-glass-tower-material-fix-v2';
const CITY_CATALOG_URL = '/assets/street-detail-v1/buildings/mapped-city-buildings.glb.gz?v=20261127-city-building-variants-v2';
const CITY_MODELS = {
  BP_SquareTower: { x: 12.81, z: 12.57, y: 39.25 },
  BP_CornerOffice: { x: 10.95, z: 5.61, y: 17.84 },
  BP_NarrowTower: { x: 6.41, z: 12.73, y: 23.60 },
  BP_MidriseBlock: { x: 12.71, z: 6.54, y: 16.03 },
  BP_GlassTower: { x: 51.29, z: 35.98, y: 105.80 }
};
const LAYER = 'bp-sketchfab-building-models-v1';
const MIN_ZOOM=13.5;
export function buildingViewportBudget(z,mobile){return z>=18?{cap:mobile?160:320,radius:550,triangles:mobile?1600000:3600000,glass:mobile?3:8}:z>=16?{cap:mobile?220:480,radius:1000,triangles:mobile?1900000:4400000,glass:mobile?4:10}:{cap:mobile?160:360,radius:2400,triangles:mobile?1600000:3600000,glass:mobile?3:8};}
const D = Math.PI / 180;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function sourceSpecs(map) {
  const out = [], seen = new Set();
  for (const layer of map.getStyle()?.layers || []) {
    const src = layer.source, sl = layer['source-layer'];
    if (!['exact','ofm','bpBuildings','bpCityStructures'].includes(src) || (!sl&&src!=='exact') || (src!=='exact'&&!/building/i.test(sl)) || seen.has(src + ':' + (sl||''))) continue;
    seen.add(src + ':' + (sl||'')); out.push([src, sl||'']);
  }
  for (const pair of [['exact', ''], ['bpBuildings', 'buildings'], ['bpCityStructures', 'buildings'], ['ofm', 'building']]) {
    if (map.getSource(pair[0]) && !seen.has(pair[0] + ':' + pair[1])) { seen.add(pair[0] + ':' + pair[1]); out.push(pair); }
  }
  return out;
}

function footprint(feature) {
  const g = feature?.geometry;
  let ring = g?.type === 'Polygon' ? g.coordinates?.[0] : g?.type === 'MultiPolygon' ? g.coordinates?.[0]?.[0] : null;
  if (!Array.isArray(ring) || ring.length < 4) return null;
  ring = ring.filter(q => Array.isArray(q) && Number.isFinite(Number(q[0])) && Number.isFinite(Number(q[1])));
  if (ring.length < 4) return null;
  if (ring.length > 68) {
    const step = Math.ceil((ring.length - 1) / 63);
    ring = ring.filter((_, i) => i === 0 || i === ring.length - 1 || i % step === 0);
  }
  const lat = ring.reduce((s, q) => s + Number(q[1]), 0) / ring.length, cos = Math.max(.12, Math.cos(lat * D));
  const origin = ring[0], pts = ring.map(q => [(Number(q[0]) - origin[0]) * 111320 * cos, (Number(q[1]) - origin[1]) * 111132]);
  let best = null;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i], angle = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const c = Math.cos(angle), s = Math.sin(angle); let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of pts) { const x = p[0] * c + p[1] * s, y = -p[0] * s + p[1] * c; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    const w = maxX - minX, h = maxY - minY, area = w * h;
    if (!best || area < best.area) best = { w, h, area, angle, minX, maxX, minY, maxY, c, s };
  }
  if (!best || best.w < 1 || best.h < 1) return null;
  const cx = (best.minX + best.maxX) * .5, cy = (best.minY + best.maxY) * .5;
  const ex = cx * best.c - cy * best.s, ny = cx * best.s + cy * best.c;
  return { q: [Number(origin[0]) + ex / (111320 * cos), Number(origin[1]) + ny / 111132], width: best.w, depth: best.h, angle: best.angle, area: best.area, latitude: lat, ring };
}

function heightOf(p) {
  const read = v => { const n = parseFloat(String(v ?? '').replace(/[^0-9.+-]/g, '')); return Number.isFinite(n) ? n : 0; };
  const m = read(p.render_height_m || p.render_height || p.height || p.height_m || p['building:height']);
  if (m > 0&&m<=1200) return m;
  const levels = read(p['building:levels'] || p.building_levels || p.levels || p.num_floors || p.floor_count);
  return levels > 0 ? levels * 3.2 : 0;
}

function stableHash(value){let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function aliasOf(f,p,geo){
 const id=f.id??p.building_id??p.osm_id??p.id??null;
 return {legacyFeatureId:id,legacyIdField:f.id!=null?'feature':p.building_id!=null?'building_id':p.osm_id!=null?'osm_id':p.id!=null?'id':null,source:String(p.__bpSource||''),sourceLayer:String(p.__bpSourceLayer||''),ring:geo.ring,refs:Object.fromEntries(['building_id','osm_id','id'].filter(k=>p[k]!=null).map(k=>[k,p[k]]))};
}
export function selectBuildingCandidates(features,center,cap=160,options={}){
 const cos=Math.max(.12,Math.cos(Number(center?.[1]||0)*D)),found=[],seen=new Set(),catalog=options.catalog||CITY_MODELS,radius=options.radius||2400;
 const rank=x=>x==='exact'?0:x==='bpCityStructures'?1:x==='bpBuildings'?2:3;
 const ordered=[...(features||[])].sort((a,b)=>rank(a.properties?.__bpSource)-rank(b.properties?.__bpSource));
 const grid=new Map(),cell=10;
 for(const f of ordered){
  const p=f.properties||{},first=f.geometry?.type==='Polygon'?f.geometry.coordinates?.[0]?.[0]:f.geometry?.type==='MultiPolygon'?f.geometry.coordinates?.[0]?.[0]?.[0]:null;if(!first||Math.hypot((Number(first[0])-center[0])*111320*cos,(Number(first[1])-center[1])*111132)>radius+350)continue;const geo=footprint(f);if(!geo)continue;
  if(Number(p.base_height_m||p.render_min_height||p.min_height||0)>1)continue;
  const width=Math.max(geo.width,geo.depth),depth=Math.min(geo.width,geo.depth),aspect=width/depth,recorded=heightOf(p),height=recorded||Math.max(5,Math.min(12,depth*.85));
  if(geo.area<30||depth<3.8||width>160||depth>100||height<4||height>450||aspect>4.2)continue;
  const dx=(geo.q[0]-center[0])*111320*cos,dy=(geo.q[1]-center[1])*111132,distance=Math.hypot(dx,dy);if(distance>radius)continue;
  const alias=aliasOf(f,p,geo),id=String(alias.legacyFeatureId??geo.q.map(v=>v.toFixed(6)).join(':')),sourceKey=alias.source+':'+alias.sourceLayer+':'+id;
  if(seen.has(sourceKey))continue;seen.add(sourceKey);
  const gx=Math.floor(dx/cell),gy=Math.floor(dy/cell);let duplicate;
  for(let x=gx-1;x<=gx+1&&!duplicate;x++)for(let y=gy-1;y<=gy+1&&!duplicate;y++)for(const o of grid.get(x+':'+y)||[]){
   if(Math.hypot(dx-o.dx,dy-o.dy)<=Math.max(1.5,Math.min(depth,o.depth)*.32)&&Math.max(width/o.width,o.width/width)<1.6&&Math.max(depth/o.depth,o.depth/depth)<1.6){duplicate=o;break;}
  }
  if(duplicate){duplicate.aliases.push(alias);continue;}
  const candidates=Object.entries(catalog).flatMap(([model,m])=>{
   const mw=Math.max(m.x,m.z),md=Math.min(m.x,m.z),sx=width/mw,sz=depth/md,sy=height/m.y;
   if(sx<.26||sz<.26||sy<.25||sx>3.5||sz>3.5||sy>4||Math.max(sx/sz,sz/sx)>2.2)return[];
   if(model==='BP_GlassTower'&&(height<50||width<17||depth<13))return[];
   const score=Math.abs(Math.log(aspect/(mw/md)))*2.1+Math.abs(Math.log(sy))*.8+Math.abs(Math.log(sx))*.4+Math.abs(Math.log(sz))*.4;
   return [{model,score}];
  }).sort((a,b)=>a.score-b.score);
  if(!candidates.length)continue;
  const hash=stableHash(geo.q.map(v=>v.toFixed(5)).join(':')),similar=candidates.filter(x=>x.score<=candidates[0].score+.55),model=similar[hash%similar.length].model;
  const yaw=geo.width>=geo.depth?geo.angle:geo.angle+Math.PI/2;
  let visible=true;if(options.map&&options.map.getZoom()>=16){try{const px=options.map.project(geo.q),canvas=options.map.getCanvas(),margin=220;visible=px.x>=-margin&&px.y>=-margin&&px.x<=canvas.clientWidth+margin&&px.y<=canvas.clientHeight+margin;}catch(_){}}
  const item={...alias,id,aliases:[alias],q:geo.q,ring:geo.ring,width,depth,height,heightEstimated:!recorded,yaw,area:geo.area,model,distance,dx,dy,visible,choices:candidates.map(x=>x.model)};
  found.push(item);const key=gx+':'+gy;if(!grid.has(key))grid.set(key,[]);grid.get(key).push(item);
 }
 return found.filter(x=>!options.map||options.map.getZoom()<18||x.visible).sort((a,b)=>Number(b.visible)-Number(a.visible)||a.distance-b.distance).slice(0,cap);
}

export function attachSketchfabBuildings(map, options = {}) {
  if (!map || map.__BP_SKETCHFAB_BUILDINGS_V1__) return map?.__BP_SKETCHFAB_BUILDINGS_V1__;
  const mobile = (() => { try { return matchMedia('(max-width: 760px), (pointer: coarse)').matches; } catch (_) { return innerWidth < 760; } })();
  const catalog={...CITY_MODELS};
  const status = map.__BP_SKETCHFAB_BUILDINGS_V1__ = { status: 'loading-models', version: 1, model: 'Full Gameready City Buildings + Glass Building', sourceGeometryCloned: true,
    source: 'https://sketchfab.com/3d-models/full-gameready-city-buildings-retextured-5fad2351e34f4c069a2eec45cce0824c', license: 'CC-BY-4.0', mappedFootprintPlacement: true,
    sources: ['Full Gameready City Buildings [retextured] · CC BY 4.0', 'Glass Building (low poly) · CC BY 4.0'], placementMode: 'source mesh variants fitted to mapped footprint dimensions and recorded heights',
    modelsPlaced: 0, candidates: 0, triangleCount: 0, tiles: 0, zoom: map.getZoom() };
  window.__BP_SKETCHFAB_BUILDINGS_V1__ = status;
  let T, renderer, camera, scene, group = null, anchor = null, anchorZ = 0, busy = false, dead = false, timer = 0, lastKey = '', layersInstalled = false,lastMotion=0,activeItems=[],filterStamp='',terrainRevision=0;
  const templates = new Map();
  // Exclusive street-level visual ownership. Keep vector sources alive for GIS
  // queries; never allow native shell, roof or facade layers to cover a source mesh.
  const nativeVisibility=new Map(),keepers=new Set();
  let exclusive=false,guarding=false;
  const nativeSources=new Set(['ofm','bpBuildings','bpCityStructures','exact','exactRoof','bpCityRoofs']);
  function legacyLayer(l){
    if(!l||l.id.startsWith('bp-sketchfab-')||!nativeSources.has(l.source))return false;
    return l.type==='fill-extrusion'&&(l['source-layer']==='building'||l['source-layer']==='buildings'||l.source==='exact'||l.source==='exactRoof'||l.source==='bpCityRoofs'||/building|roof|facade|floor-lines|night-windows/i.test(l.id));
  }
  const setLayout=map.setLayoutProperty.bind(map);
  const setLayoutGuard=function(id,key,value,...args){
    if(exclusive&&!guarding&&key==='visibility'&&legacyLayer(map.getLayer(id))){
      nativeVisibility.set(id,value??'visible');
      return setLayout(id,key,'none',...args);
    }
    return setLayout(id,key,value,...args);
  };
  map.setLayoutProperty=setLayoutGuard;
  function ensureKeepers(layers){
    const sources=new Map();
    for(const l of layers){const sl=l['source-layer']||'';if(l.source==='exactRoof'||l.source==='bpCityRoofs')continue;const k=l.source+':'+sl;if(!sources.has(k))sources.set(k,l);}
    for(const [k,l] of sources){const id='bp-sketchfab-source-keeper-'+k.replace(/[^a-zA-Z0-9_-]/g,'-');if(map.getLayer(id))continue;
      const spec={id,type:'fill',source:l.source,minzoom:MIN_ZOOM,paint:{'fill-color':'#000000','fill-opacity':0,'fill-outline-color':'rgba(0,0,0,0)'}};
      if(l['source-layer'])spec['source-layer']=l['source-layer'];
      try{map.addLayer(spec);keepers.add(id);}catch(e){status.keeperError=String(e).slice(0,140);}
    }
  }
  function enforceExclusive(){
    if(!exclusive||guarding||dead)return;
    guarding=true;
    try{const layers=(map.getStyle()?.layers||[]).filter(legacyLayer);ensureKeepers(layers);let hidden=0;
      for(const l of layers){if(!map.getLayer(l.id))continue;const current=map.getLayoutProperty(l.id,'visibility')||'visible';
        if(!nativeVisibility.has(l.id)||current!=='none')nativeVisibility.set(l.id,current);
        if(current!=='none')setLayout(l.id,'visibility','none');
        hidden++;
      }
      status.exclusiveSourceMeshes=true;status.legacyBuildingLayersFiltered=hidden;status.legacyBuildingFeaturesHidden=activeItems.length;status.legacyHiddenLayerIds=layers.map(l=>l.id);status.sourceKeepers=keepers.size;
    }finally{guarding=false;}
  }
  function restoreLegacyBuildingFilters(){
    exclusive=false;guarding=true;
    try{for(const [id,value] of nativeVisibility)if(map.getLayer(id))try{setLayout(id,'visibility',value);}catch(_){}nativeVisibility.clear();
      for(const id of keepers)if(map.getLayer(id))try{map.removeLayer(id);}catch(_){}keepers.clear();
    }finally{guarding=false;}
    status.exclusiveSourceMeshes=false;status.legacyBuildingFeaturesHidden=0;status.legacyBuildingLayersFiltered=0;status.legacyHiddenLayerIds=[];
  }
  function suppressLegacyBuildingFeatures(items){if(!items?.length)return;exclusive=true;enforceExclusive();}
  const emptyGroup=()=>{restoreLegacyBuildingFilters();filterStamp='';activeItems=[];if(group&&scene){scene.remove(group);group.traverse(o=>{if(o.isInstancedMesh)o.dispose?.();});}group=null;status.modelsPlaced=0;};
  function collect(){
    const out=[],seen=new Set();for(const [source,sourceLayer] of sourceSpecs(map)){
      let rows=[];try{rows=map.querySourceFeatures(source,sourceLayer?{sourceLayer}:{})||[];}catch(_){}
      for(const f of rows){const p=f.properties||{},id=String(f.id??p.building_id??p.osm_id??p.id??'');const coords=f.geometry?.coordinates?.[0]?.[0]||[];const key=source+':'+sourceLayer+':'+id+':'+JSON.stringify(coords);if(seen.has(key))continue;seen.add(key);out.push({type:'Feature',id:f.id,geometry:f.geometry,properties:{...p,__bpSource:source,__bpSourceLayer:sourceLayer}});}
    }
    return out;
  }
  function installLayer() {
    if (layersInstalled || map.getLayer(LAYER) || !T) return;
    const layer = {
      id: LAYER, type: 'custom', renderingMode: '3d',
      onAdd(m, gl) {
        renderer = new T.WebGLRenderer({ canvas: m.getCanvas(), context: gl, antialias: false, alpha: true });
        renderer.autoClear = false; renderer.info.autoReset = false; renderer.outputColorSpace = T.SRGBColorSpace; renderer.toneMapping = T.ACESFilmicToneMapping;
        camera = new T.Camera(); scene = new T.Scene(); scene.add(new T.HemisphereLight(0xeaf4ff, 0x524b43, 2.25));
        const sun = new T.DirectionalLight(0xfff2de, 2.6); sun.position.set(-45, 95, 52); scene.add(sun);
        const env = new Uint8Array(256 * 128 * 4);
        for (let y = 0; y < 128; y++) for (let x = 0; x < 256; x++) {
          const k = (y * 256 + x) * 4, up = y / 127;
          const band = Math.exp(-Math.pow((up - .50) / .075, 2));
          const ground = clamp((up - .55) / .45, 0, 1), sky = clamp((.55 - up) / .55, 0, 1);
          env[k] = Math.round(20 + sky * 90 + band * 135 + ground * 24);
          env[k + 1] = Math.round(32 + sky * 120 + band * 145 + ground * 25);
          env[k + 2] = Math.round(48 + sky * 154 + band * 150 + ground * 28); env[k + 3] = 255;
        }
        const texture = new T.DataTexture(env, 256, 128, T.RGBAFormat); texture.mapping = T.EquirectangularReflectionMapping; texture.colorSpace = T.SRGBColorSpace; texture.needsUpdate = true;
        scene.environment = texture; scene.environmentIntensity = .85; status.reflectionEnvironment = 'procedural sky/urban horizon';
      },
      render(gl, args) {
        if (!renderer || !scene || !group || map.getZoom() < MIN_ZOOM || document.hidden) return;
        const raw = map.transform?.getMatrixForModel?.(anchor, anchorZ), matrix = args?.defaultProjectionData?.mainMatrix;
        if (!raw || !matrix) return;
        camera.projectionMatrix.fromArray(matrix).multiply(new T.Matrix4().fromArray(raw));
        renderer.resetState(); renderer.info.reset(); renderer.render(scene, camera);
        status.drawCalls = renderer.info.render.calls; status.triangles = renderer.info.render.triangles;
      },
      onRemove() { emptyGroup(); renderer?.dispose(); renderer = null; scene = null; }
    };
    const before = (map.getStyle()?.layers || []).find(l => l.type === 'symbol' && /label/.test(l.id))?.id;
    try { map.addLayer(layer, before); layersInstalled = true; } catch (e) { status.error = String(e).slice(0, 160); }
  }
  function build(){
    if(dead||busy)return;const zoom=Number(map.getZoom());status.zoom=zoom;
    if(zoom<MIN_ZOOM){emptyGroup();lastKey='';status.status='standby';return;}
    if(!templates.size||!scene)return;busy=true;
    try{
      const c=map.getCenter(),center=[c.lng,c.lat],budget=buildingViewportBudget(zoom,mobile),all=collect();
      const chosen=selectBuildingCandidates(all,center,options.maxModels||budget.cap,{catalog,radius:budget.radius,map});
      status.candidates=all.length;status.viewportBudget=budget;
      const key=terrainRevision+':'+budget.cap+':'+chosen.map(i=>i.id+':'+i.model+':'+i.q.map(v=>v.toFixed(6)).join(',')+':'+[i.width,i.depth,i.height,i.yaw].map(v=>v.toFixed(3)).join(',')+':'+i.aliases.map(a=>a.source+':'+a.legacyFeatureId).join(',')).join('|');
      if(key===lastKey&&group){suppressLegacyBuildingFeatures(activeItems);return;}
      if(!chosen.length){if(anchor&&Math.hypot((anchor[0]-center[0])*111320*Math.cos(center[1]*D),(anchor[1]-center[1])*111132)>budget.radius){emptyGroup();lastKey='';}status.status='waiting-for-matching-mapped-footprints';return;}
      const terrain=q=>{if(!map.getTerrain?.())return 0;const z=map.queryTerrainElevation?.({lng:q[0],lat:q[1]},{exaggerated:true});return Number.isFinite(z)?z:null;};
      const z=terrain(center);if(z===null)return;const baseRaw=map.transform?.getMatrixForModel?.(center,z);if(!baseRaw)return;
      const inv=new T.Matrix4().fromArray(baseRaw).invert(),next=new T.Group(),batches=new Map(),accepted=[];
      let tris=0,glassCount=0;
      for(const item of chosen){
        const ground=terrain(item.q);if(ground===null)continue;const raw=map.transform?.getMatrixForModel?.(item.q,ground);if(!raw)continue;
        const preferred=[item.model,...item.choices.filter(x=>x!==item.model)];
        const name=preferred.find(n=>{const t=templates.get(n);return t&&tris+t.triangles<=budget.triangles&&(n!=='BP_GlassTower'||glassCount<budget.glass);});if(!name)continue;
        const source=templates.get(name),bounds=source.bounds,longX=bounds.size.x>=bounds.size.z,sx=(longX?item.width:item.depth)/bounds.size.x,sz=(longX?item.depth:item.width)/bounds.size.z,sy=item.height/bounds.size.y;
        const transform=new T.Matrix4().fromArray(raw).premultiply(inv).multiply(new T.Matrix4().makeRotationY(item.yaw+(longX?0:Math.PI/2))).multiply(new T.Matrix4().makeScale(sx,sy,sz)).multiply(new T.Matrix4().makeTranslation(-bounds.center.x,-bounds.box.min.y,-bounds.center.z));
        if(source.transparent){
          const object=new T.Group();object.matrixAutoUpdate=false;object.matrix.copy(transform);object.add(source.root.clone(true));object.traverse(o=>{o.frustumCulled=false;});next.add(object);
        }else{
          if(!batches.has(name))batches.set(name,[]);batches.get(name).push(transform);
        }
        accepted.push({...item,model:name});tris+=source.triangles;if(name==='BP_GlassTower')glassCount++;
      }
      for(const [name,matrices] of batches){const source=templates.get(name);for(const part of source.parts){
        const mesh=new T.InstancedMesh(part.geometry,part.material,matrices.length);mesh.frustumCulled=false;for(let i=0;i<matrices.length;i++)mesh.setMatrixAt(i,matrices[i].clone().multiply(part.matrix));mesh.instanceMatrix.needsUpdate=true;next.add(mesh);
      }}
      if(!accepted.length||!next.children.length)return;
      const prior=group;group=next;scene.add(group);anchor=center;anchorZ=z;activeItems=accepted;lastKey=key;
      suppressLegacyBuildingFeatures(accepted);if(prior){scene.remove(prior);prior.traverse(o=>{if(o.isInstancedMesh)o.dispose?.();});}
      status.modelsPlaced=accepted.length;status.selected=accepted.map(i=>({id:i.id,q:i.q,model:i.model,size:[i.width,i.depth,i.height],heightEstimated:i.heightEstimated}));status.triangleCount=tris;status.status='ready';status.exactSourceGeometry=true;status.terrainAnchored=true;status.instanced=true;status.glassTowers=glassCount;status.representativePlacement=true;map.triggerRepaint();
    }catch(e){status.status='error';status.error=String(e?.message||e).slice(0,180);}finally{busy=false;}
  }
  function schedule(){if(dead||timer)return;timer=setTimeout(()=>{timer=0;build();},110);}
  function prepare(name,root,helper){
    root.updateMatrixWorld(true);const bounds=helper.normalizedBounds(T,root),parts=[];let triangles=0,transparent=false;
    root.traverse(o=>{if(!o.isMesh||!o.geometry)return;const materials=Array.isArray(o.material)?o.material:[o.material];if(materials.some(m=>m&&(m.transparent||m.transmission>0)))transparent=true;
      for(const m of materials)if(m)for(const k of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap'])if(m[k]){m[k].anisotropy=8;m[k].needsUpdate=true;}
      parts.push({geometry:o.geometry,material:o.material,matrix:o.matrixWorld.clone()});triangles+=(o.geometry.index?.count||o.geometry.attributes.position?.count||0)/3;
    });if(parts.length){templates.set(name,{root,bounds,parts,triangles,transparent});catalog[name]={x:bounds.size.x,y:bounds.size.y,z:bounds.size.z};}
  }
  async function init() {
    const [three, gl, helper] = await Promise.all([import(T_URL), import(GL_URL), import(H_URL)]);
    T = three.default || three;
    const loader = new gl.GLTFLoader();
    const [city, glass] = await Promise.all([
      helper.loadStreetGLTF(loader, { url: CITY_CATALOG_URL }),
      helper.loadStreetGLTF(loader, { url: MODEL_URL })
    ]);
    const cityRoot = city.scene || city.scenes?.[0], cityNodes = new Map();
    cityRoot?.traverse(o => { if (CITY_MODELS[o.name]) cityNodes.set(o.name, o); });
    for (const name of Object.keys(CITY_MODELS).filter(x => x !== 'BP_GlassTower')) {
      const source = cityNodes.get(name); if (!source) throw Error('Mapped city building source missing: ' + name);
      const root = source.clone(true); root.updateMatrixWorld(true); root.traverse(o => { if (o.isMesh) { const mats = Array.isArray(o.material) ? o.material : [o.material]; for (const m of mats) if (m) { m.side = T.DoubleSide; m.needsUpdate = true; } } });
      prepare(name,root,helper);
    }
    const root = (glass.scene || glass.scenes?.[0])?.clone(true); if (!root) throw Error('Sketchfab glass building model scene missing');
    const discard = []; root.traverse(o => { if(o.isCamera||o.isLight) discard.push(o); });
    for (const o of discard) o.parent?.remove(o);
    root.traverse(o => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) {
        if (!m) continue;
        m.side = T.DoubleSide;
        if (/glass/i.test(String(m.name || ''))) {
          m.transparent = true; m.opacity = .38; m.roughness = .09; m.metalness = .12;
          m.transmission = .62; m.ior = 1.45; m.depthWrite = false;
          if (m.color) m.color.set('#9ec8d8');
        }
        m.needsUpdate = true;
      }
    });
    prepare('BP_GlassTower',root,helper);
    status.templateModels=[...templates.keys()];status.templateTriangles=Object.fromEntries([...templates].map(([name,t])=>[name,t.triangles]));installLayer();
  }
  map.on('move',()=>{const now=Date.now();if(now-lastMotion>350){lastMotion=now;schedule();}});map.on('moveend',schedule);map.on('zoomend',schedule);map.on('sourcedata',e=>{const id=String(e.sourceId||'');if(['ofm','exact','bpBuildings','bpCityStructures','bpCityRoofs','exactRoof'].includes(id)&&(e.isSourceLoaded||e.sourceDataType==='content'))schedule();else if(e.isSourceLoaded&&/terrain|dem/i.test(id)){terrainRevision++;schedule();}});
  map.on('styledata',()=>{if(exclusive&&!guarding)enforceExclusive();});
  map.on('style.load',()=>{layersInstalled=false;nativeVisibility.clear();keepers.clear();filterStamp='';installLayer();lastKey='';schedule();});
  map.once('remove', () => { dead = true; clearTimeout(timer); emptyGroup();if(map.setLayoutProperty===setLayoutGuard)map.setLayoutProperty=setLayout;renderer?.dispose(); });
  init().then(schedule).catch(e => { status.status = 'asset-error'; status.error = String(e?.message || e).slice(0, 180); });
  return status;
}
