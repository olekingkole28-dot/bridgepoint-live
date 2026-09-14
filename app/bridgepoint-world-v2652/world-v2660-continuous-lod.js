const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const finite=v=>Number.isFinite(Number(v))?Number(v):null;

async function waitWorld(){
  const started=Date.now();
  while(Date.now()-started<20000){
    const w=window.BridgePointWorldV2500;
    if(w?.viewer?.scene?.canvas)return w;
    await sleep(80);
  }
  throw new Error('BridgePoint renderer unavailable');
}
function rings(g){if(g?.type==='Polygon')return g.coordinates?.[0]?[g.coordinates[0]]:[];if(g?.type==='MultiPolygon')return(g.coordinates||[]).map(p=>p?.[0]).filter(Boolean);return[]}
function lines(g){if(g?.type==='LineString')return[g.coordinates||[]];if(g?.type==='MultiLineString')return g.coordinates||[];if(g?.type==='Polygon')return g.coordinates?.[0]?[g.coordinates[0]]:[];if(g?.type==='MultiPolygon')return(g.coordinates||[]).map(p=>p?.[0]).filter(Boolean);return[]}
function flat(a){const o=[];for(const p of a||[])if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1]))o.push(+p[0],+p[1]);return o.length>=4?o:null}
function rowGeometry(r={}){return r.geometry||r.geometry_geojson||r.geom_geojson||r.footprint||null}
function stableId(kind,row,i){return `${kind}:${row.building_id||row.property_id||row.roof_truth_id||row.feature_id||row.source_record_id||row.id||i}`}
function lodFar(kind,lod){
  const l=Number.isFinite(+lod)?+lod:4;
  if(kind==='buildings')return [8000000,3200000,900000,220000,70000][l]||70000;
  if(kind==='parcels')return [1800000,700000,260000,80000,30000][l]||30000;
  if(kind==='roofs')return [1000000,450000,160000,55000,22000][l]||22000;
  return 250000;
}
function kindColor(kind){if(kind==='buildings')return'#728d98';if(kind==='parcels')return'#46d7ff';if(kind==='roofs')return'#69757b';return'#ffffff'}
function cloneGeometry(ds,kind,row,i){
  const g=rowGeometry(row),lod=Number(row.lod_level??4),far=lodFar(kind,lod),id=stableId(kind,row,i);if(!g)return null;
  const old=ds.entities.getById(id);if(old)ds.entities.remove(old);
  if(kind==='parcels'){
    let first=null,n=0;for(const ring of rings(g)){const d=flat(ring);if(!d)continue;const e=ds.entities.add({id:n?`${id}:${n}`:id,polyline:{positions:Cesium.Cartesian3.fromDegreesArray(d),width:1.05,material:Cesium.Color.fromCssColorString(kindColor(kind)).withAlpha(.28),clampToGround:true,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,far)}});if(!first)first=e;n++}return first;
  }
  let first=null,n=0;for(const ring of rings(g)){const d=flat(ring);if(!d)continue;const base=finite(row.ground_elevation_m)||0;const h=kind==='buildings'?Math.max(3,finite(row.render_height_m??row.height_m)||8.5):Math.max(base+.5,finite(row.roof_height_m)||base+1.2);const e=ds.entities.add({id:n?`${id}:${n}`:id,polygon:{hierarchy:Cesium.Cartesian3.fromDegreesArray(d),height:base,extrudedHeight:kind==='buildings'?base+h:undefined,material:Cesium.Color.fromCssColorString(kindColor(kind)).withAlpha(kind==='buildings'?.34:.26),outline:true,outlineColor:Cesium.Color.fromCssColorString('#d8edf2').withAlpha(.18),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,far)}});e.bridgepoint={...row,continuity_cache:true};if(!first)first=e;n++}return first;
}
function midpoint(g){
  if(g?.type==='Point')return g.coordinates;
  const a=lines(g)[0]||rings(g)[0];if(!a?.length)return null;const p=a[Math.floor(a.length/2)];return p&&Number.isFinite(+p[0])&&Number.isFinite(+p[1])?[+p[0],+p[1]]:null;
}
function featureName(row={}){return row.name||row.full_address||row.address||row.road_name||row.water_name||row.route_name||null}

async function boot(){
  const world=await waitWorld(),viewer=world.viewer;
  const continuity=new Cesium.CustomDataSource('bp-v2660-continuity-cache');viewer.dataSources.add(continuity);
  const labels=new Cesium.CustomDataSource('bp-v2660-high-lod-labels');viewer.dataSources.add(labels);
  const seen=new Map();const maxEntries=9000;
  function remember(kind,src){
    if(!src?.entities)return;
    let i=0;for(const e of src.entities.values){const row=e.bridgepoint||{};const key=stableId(kind,row,i++);const lod=Number(row.lod_level??4),prior=seen.get(key);if(prior&&prior.lod>lod)continue;cloneGeometry(continuity,kind,row,i);seen.set(key,{lod,at:Date.now()});}
    if(seen.size>maxEntries){const ordered=[...seen.entries()].sort((a,b)=>a[1].at-b[1].at).slice(0,seen.size-maxEntries);for(const [k] of ordered){for(const e of continuity.entities.values.filter(x=>String(x.id).startsWith(k)))continuity.entities.remove(e);seen.delete(k)}}
  }
  function stretchDistances(){
    const configs=[['bp-buildings',8000000],['bp-parcels',1800000],['bp-roofs',1000000],['bp-rails',1800000],['bp-water',8000000],['bp-parking',180000],['bp-streetlights',45000],['bp-vegetation',50000]];
    for(const [name,far] of configs){const ds=viewer.dataSources.getByName(name)[0];if(!ds)continue;for(const e of ds.entities.values){if(e.polygon)e.polygon.distanceDisplayCondition=new Cesium.DistanceDisplayCondition(0,far);if(e.polyline)e.polyline.distanceDisplayCondition=new Cesium.DistanceDisplayCondition(0,far);if(e.point)e.point.distanceDisplayCondition=new Cesium.DistanceDisplayCondition(0,far);if(e.billboard)e.billboard.distanceDisplayCondition=new Cesium.DistanceDisplayCondition(0,far)}}
    const roads=viewer.dataSources.getByName('bp-v2659-road-surfaces')[0];if(roads)for(const e of roads.entities.values){const fam=String(e.properties?.source_family?.getValue?.(Cesium.JulianDate.now())||'');const far=fam.includes('PRIMARY')?2800000:fam.includes('SECONDARY')?1200000:240000;if(e.corridor)e.corridor.distanceDisplayCondition=new Cesium.DistanceDisplayCondition(0,far)}
    const rails=viewer.dataSources.getByName('bp-v2659-rail-surfaces')[0];if(rails)for(const e of rails.entities.values)if(e.corridor)e.corridor.distanceDisplayCondition=new Cesium.DistanceDisplayCondition(0,1600000);
  }
  function rebuildHighLabels(){
    labels.entities.removeAll();const h=viewer.camera.positionCartographic?.height||1e9;if(h<22000||h>2500000)return;
    const rules=h>600000?[['bp-roads',35,2200000],['bp-water',35,2500000],['bp-rails',18,1800000]]:h>120000?[['bp-roads',70,1100000],['bp-water',60,1300000],['bp-rails',35,900000],['bp-buildings',25,350000]]:[['bp-roads',110,420000],['bp-water',90,500000],['bp-rails',50,420000],['bp-buildings',50,180000]];
    for(const [sourceName,limit,far] of rules){const src=viewer.dataSources.getByName(sourceName)[0];if(!src)continue;let n=0;for(const e of src.entities.values){if(n>=limit)break;const row=e.bridgepoint||{},name=featureName(row);if(!name)continue;const p=midpoint(rowGeometry(row));if(!p)continue;labels.entities.add({position:Cesium.Cartesian3.fromDegrees(p[0],p[1],2),label:{text:String(name).slice(0,54),font:'700 10px sans-serif',fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK,outlineWidth:4,style:Cesium.LabelStyle.FILL_AND_OUTLINE,showBackground:true,backgroundColor:Cesium.Color.fromCssColorString('#03101a').withAlpha(.56),heightReference:Cesium.HeightReference.RELATIVE_TO_GROUND,verticalOrigin:Cesium.VerticalOrigin.BOTTOM,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,far),scaleByDistance:new Cesium.NearFarScalar(1000,1,far,.58),disableDepthTestDistance:0}});n++}}
    viewer.scene.requestRender();
  }
  function captureAll(){
    remember('buildings',viewer.dataSources.getByName('bp-buildings')[0]);
    remember('parcels',viewer.dataSources.getByName('bp-parcels')[0]);
    remember('roofs',viewer.dataSources.getByName('bp-roofs')[0]);
    stretchDistances();rebuildHighLabels();viewer.scene.requestRender();
  }
  for(const [kind,name] of [['buildings','bp-buildings'],['parcels','bp-parcels'],['roofs','bp-roofs']]){
    const ds=viewer.dataSources.getByName(name)[0];if(ds?.entities)ds.entities.collectionChanged.addEventListener(()=>{remember(kind,ds);stretchDistances()});
  }
  let moveTimer=0,endTimer=0;
  viewer.camera.percentageChanged=.003;
  viewer.camera.moveStart.addEventListener(()=>{try{viewer.scene.requestRenderMode=false}catch(_){ }});
  viewer.camera.changed.addEventListener(()=>{clearTimeout(moveTimer);moveTimer=setTimeout(()=>{world.streamViewport?.(true);window.BridgePointWorldV2652?.refresh?.(true);stretchDistances();rebuildHighLabels()},55)});
  viewer.camera.moveEnd.addEventListener(()=>{clearTimeout(endTimer);world.streamViewport?.(true);window.BridgePointWorldV2652?.refresh?.(true);setTimeout(captureAll,100);setTimeout(()=>{world.streamViewport?.(true);window.BridgePointWorldV2652?.refresh?.(true);captureAll()},320);endTimer=setTimeout(()=>{try{viewer.scene.requestRenderMode=true}catch(_){ }viewer.scene.requestRender()},700)});
  setInterval(()=>{captureAll();const cutoff=Date.now()-180000;for(const [k,v] of seen)if(v.at<cutoff)seen.delete(k)},8000);
  captureAll();
  window.BridgePointContinuousLOD2660={viewer,captureAll,continuity,labels};document.documentElement.dataset.bridgepointLod='2660';
}
boot().catch(e=>console.error('BridgePoint V2660 continuous LOD failed',e));
