import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL='https://xdfsjztwgsbmabshzsjw.supabase.co';
const SUPABASE_KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const supabase=createClient(SUPABASE_URL,SUPABASE_KEY);
const FALLBACK_GROUND='#45613f';
const SURFACES=[
  {key:'CONUS_2025',url:'https://dmsdata.cr.usgs.gov/geoserver/mrlc_Land-Cover-Native_conus_year_data/wms',year:2025,rect:[-125,24,-66,50]},
  {key:'ALASKA_2016',url:'https://www.mrlc.gov/geoserver/mrlc_display/NLCD_2016_Land_Cover_AK/wms',year:2016,rect:[-180,50,-129,72]},
  {key:'HAWAII_2001',url:'https://www.mrlc.gov/geoserver/mrlc_display/NLCD_2001_Land_Cover_HI/wms',year:2001,rect:[-162,17,-153,24]},
  {key:'PUERTO_RICO_2001',url:'https://www.mrlc.gov/geoserver/mrlc_display/NLCD_2001_Land_Cover_PR/wms',year:2001,rect:[-69,17,-64,20]}
];
const waitForWorld=()=>new Promise((resolve,reject)=>{const s=Date.now();const t=()=>{const w=window.BridgePointWorldV2500;if(w?.viewer)return resolve(w);if(Date.now()-s>20000)return reject(new Error('BridgePoint base world unavailable'));setTimeout(t,100)};t()});
const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

async function discoverWmsLayer(url){
  const q=`${url}?service=WMS&request=GetCapabilities&version=1.1.1`;
  const r=await fetch(q,{cache:'force-cache',signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Error(`NLCD capabilities ${r.status}`);
  const xml=new DOMParser().parseFromString(await r.text(),'application/xml');
  const names=[...xml.querySelectorAll('Layer > Name')].map(n=>n.textContent?.trim()).filter(Boolean);
  return names.find(n=>/Land.?Cover/i.test(n)&&!/mrlc_display$/i.test(n))||names[names.length-1]||names[0]||null;
}
async function addMaterialSurface(viewer,source){
  try{
    const layerName=await discoverWmsLayer(source.url);if(!layerName)return null;
    const provider=new Cesium.WebMapServiceImageryProvider({
      url:source.url,layers:layerName,rectangle:Cesium.Rectangle.fromDegrees(...source.rect),
      parameters:{transparent:false,format:'image/png',...(source.year>=2020?{time:`${source.year}-01-01T00:00:00Z`}:{})},
      credit:new Cesium.Credit(`BridgePoint material input: USGS/MRLC NLCD ${source.year}`)
    });
    const layer=viewer.imageryLayers.addImageryProvider(provider);
    layer.alpha=.82;layer.brightness=.78;layer.contrast=1.08;layer.saturation=.66;layer.gamma=1.08;
    return layer;
  }catch(e){console.warn(`${source.key} material surface unavailable`,e);return null}
}
function materialColor(v=''){
  const s=String(v).toLowerCase();
  if(/brick/.test(s))return'#9a6658';if(/wood|timber/.test(s))return'#9b8065';if(/metal|steel|aluminum/.test(s))return'#a6b0b5';if(/concrete|cement/.test(s))return'#aaa69d';if(/glass/.test(s))return'#6f9fac';if(/stone|masonry/.test(s))return'#8e8a80';return'#8a979b';
}
function roofColor(v=''){
  const s=String(v).toLowerCase();if(/metal/.test(s))return'#9da9ad';if(/tile|clay/.test(s))return'#9a5e43';if(/slate/.test(s))return'#59646c';if(/shingle|asphalt/.test(s))return'#4d5357';if(/wood/.test(s))return'#776557';return'#626a70';
}
function colorEntityCollection(ds,kind){
  if(!ds?.entities)return;
  for(const e of ds.entities.values){const row=e.bridgepoint||{};
    if(kind==='building'&&e.polygon){e.polygon.material=Cesium.Color.fromCssColorString(materialColor(row.facade_material)).withAlpha(.98);e.polygon.outlineColor=Cesium.Color.fromCssColorString('#d8edf2').withAlpha(.32)}
    else if(kind==='roof'&&e.polygon){e.polygon.material=Cesium.Color.fromCssColorString(roofColor(row.roof_material)).withAlpha(.98);e.polygon.outlineColor=Cesium.Color.fromCssColorString('#eef8fa').withAlpha(.25)}
    else if(kind==='road'&&e.polyline){const fam=String(row.feature_family||'');e.polyline.width=fam==='ROAD_PRIMARY'?7:fam==='ROAD_SECONDARY'?5:3;e.polyline.material=Cesium.Color.fromCssColorString('#34383b')}
    else if(kind==='rail'&&e.polyline){e.polyline.width=2.2;e.polyline.material=Cesium.Color.fromCssColorString('#57595b')}
    else if(kind==='water'&&e.polygon){e.polygon.material=Cesium.Color.fromCssColorString('#176f8e').withAlpha(.82);e.polygon.outlineColor=Cesium.Color.fromCssColorString('#43b9d9').withAlpha(.22)}
    else if(kind==='parking'&&e.polygon){e.polygon.material=Cesium.Color.fromCssColorString('#45484a').withAlpha(.96)}
  }
}
function promotePointTrees(viewer,ds){
  if(!ds?.entities||ds.__bp3dTrees)return;ds.__bp3dTrees=true;
  const derived=new Cesium.CustomDataSource('bp-exact-or-inventory-tree-meshes-v2653');viewer.dataSources.add(derived);
  const rebuild=()=>{derived.entities.removeAll();for(const e of ds.entities.values){const p=e.position?.getValue?.(Cesium.JulianDate.now());if(!p)continue;const row=e.bridgepoint||{},h=Math.max(4,Math.min(32,Number(row.height_m||row.tree_height_m||8))),dbh=Math.max(.12,Math.min(1.2,Number(row.dbh_m||row.trunk_diameter_m||h*.035)));derived.entities.add({position:p,cylinder:{length:h,bottomRadius:dbh/2,topRadius:dbh*.34,material:Cesium.Color.fromCssColorString('#6c4d35'),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,6500)},properties:{truth:row.truth_class||'SOURCE_BACKED_TREE'}});const c=Cesium.Cartographic.fromCartesian(p),top=Cesium.Cartesian3.fromRadians(c.longitude,c.latitude,(c.height||0)+h*.78);derived.entities.add({position:top,ellipsoid:{radii:new Cesium.Cartesian3(h*.22,h*.22,h*.28),material:Cesium.Color.fromCssColorString('#4f7b43').withAlpha(.96),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,7000)}})}};
  ds.entities.collectionChanged.addEventListener(rebuild);rebuild();
}
function promoteStreetlights(viewer,ds){
  if(!ds?.entities||ds.__bp3dLights)return;ds.__bp3dLights=true;
  const derived=new Cesium.CustomDataSource('bp-derived-streetlight-meshes-v2653');viewer.dataSources.add(derived);
  const rebuild=()=>{derived.entities.removeAll();for(const e of ds.entities.values){const p=e.position?.getValue?.(Cesium.JulianDate.now());if(!p)continue;const row=e.bridgepoint||{},h=Math.max(5,Math.min(14,Number(row.height_m||9)));derived.entities.add({position:p,cylinder:{length:h,bottomRadius:.09,topRadius:.06,material:Cesium.Color.fromCssColorString('#6e767b'),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,5000)},properties:{truth:row.truth_class||'SOURCE_OR_DERIVED_STREETLIGHT'}});const c=Cesium.Cartographic.fromCartesian(p),top=Cesium.Cartesian3.fromRadians(c.longitude,c.latitude,(c.height||0)+h*.95);derived.entities.add({position:top,ellipsoid:{radii:new Cesium.Cartesian3(.24,.24,.18),material:Cesium.Color.fromCssColorString('#ffe0a0').withAlpha(.95),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,5000)}})}};
  ds.entities.collectionChanged.addEventListener(rebuild);rebuild();
}
function viewRectangle(viewer){const r=viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid);if(!r)return null;return{west:Cesium.Math.toDegrees(r.west),south:Cesium.Math.toDegrees(r.south),east:Cesium.Math.toDegrees(r.east),north:Cesium.Math.toDegrees(r.north)}}
function hash32(a,b,c){let h=(Math.imul(Math.floor((a+180)*10000),73856093)^Math.imul(Math.floor((b+90)*10000),19349663)^Math.imul(c,83492791))>>>0;h^=h>>>13;h=Math.imul(h,1274126177)>>>0;return h}
function forestStyle(code){if(code===42)return{h:17,color:'#315f35',rx:.18,rz:.3};if(code===41)return{h:13,color:'#537c45',rx:.22,rz:.26};return{h:15,color:'#466c3c',rx:.2,rz:.28}}

async function boot(){
  const world=await waitForWorld(),viewer=world.viewer;
  viewer.imageryLayers.removeAll(true);
  viewer.scene.globe.baseColor=Cesium.Color.fromCssColorString(FALLBACK_GROUND);
  viewer.scene.globe.enableLighting=true;viewer.scene.globe.dynamicAtmosphereLighting=true;viewer.scene.globe.dynamicAtmosphereLightingFromSun=true;viewer.scene.fog.enabled=true;viewer.scene.fog.density=.00012;
  const materialLayers=(await Promise.all(SURFACES.map(s=>addMaterialSurface(viewer,s)))).filter(Boolean);

  const find=name=>viewer.dataSources.getByName(name)?.[0]||null;
  const restyle=()=>{colorEntityCollection(find('bp-buildings'),'building');colorEntityCollection(find('bp-roofs'),'roof');colorEntityCollection(find('bp-roads'),'road');colorEntityCollection(find('bp-rails'),'rail');colorEntityCollection(find('bp-water'),'water');colorEntityCollection(find('bp-parking'),'parking');promotePointTrees(viewer,find('bp-vegetation'));promoteStreetlights(viewer,find('bp-streetlights'));viewer.scene.requestRender()};
  for(const name of ['bp-buildings','bp-roofs','bp-roads','bp-rails','bp-water','bp-parking']){const ds=find(name);if(ds?.entities&&!ds.__bpSurfaceStyled){ds.__bpSurfaceStyled=true;ds.entities.collectionChanged.addEventListener(restyle)}}
  restyle();setInterval(restyle,5000);

  const procedural=new Cesium.CustomDataSource('bp-nlcd-derived-vegetation-v2654');viewer.dataSources.add(procedural);
  let sampleBusy=false,samplePending=false,lastSampleKey='';
  async function refreshDerivedVegetation(force=false){
    if(sampleBusy){samplePending=true;return}const h=viewer.camera.positionCartographic?.height||1e6;if(h>7000){procedural.entities.removeAll();return}const v=viewRectangle(viewer);if(!v||v.east<=v.west||v.east-v.west>5||v.north-v.south>5)return;const key=[v.west,v.south,v.east,v.north].map(x=>x.toFixed(h<1500?3:2)).join(':');if(!force&&key===lastSampleKey)return;lastSampleKey=key;sampleBusy=true;
    try{const {data:{session}}=await supabase.auth.getSession();if(!session)return;const grid=mobile?18:28;const {data,error}=await supabase.functions.invoke('bridgepoint-surface-sample-v2654',{body:{west:v.west,south:v.south,east:v.east,north:v.north,width:grid,height:grid}});if(error||!data?.complete||!data?.available||!Array.isArray(data.classes))return;procedural.entities.removeAll();const dx=(v.east-v.west)/data.width,dy=(v.north-v.south)/data.height,maxTrees=mobile?110:240;let trees=0;
      for(let y=0;y<data.height&&trees<maxTrees;y++)for(let x=0;x<data.width&&trees<maxTrees;x++){const code=Number(data.classes[y*data.width+x]);if(code!==41&&code!==42&&code!==43)continue;const lat=v.north-(y+.5)*dy,lon=v.west+(x+.5)*dx,hsh=hash32(lon,lat,code);if((hsh%100)>58)continue;const ox=(((hsh>>>8)%1000)/1000-.5)*dx*.72,oy=(((hsh>>>18)%1000)/1000-.5)*dy*.72,style=forestStyle(code),height=style.h*(.72+((hsh%37)/100)),dbh=Math.max(.16,height*.035),treeLon=lon+ox,treeLat=lat+oy;const trunk=Cesium.Cartesian3.fromDegrees(treeLon,treeLat,height*.5);procedural.entities.add({position:trunk,cylinder:{length:height,bottomRadius:dbh/2,topRadius:dbh*.32,material:Cesium.Color.fromCssColorString('#684a33'),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,4500)},properties:{truth:'MODELLED_FROM_NLCD_CLASS',source_class:code,source_year:data.year}});procedural.entities.add({position:Cesium.Cartesian3.fromDegrees(treeLon,treeLat,height*.83),ellipsoid:{radii:new Cesium.Cartesian3(height*style.rx,height*style.rx,height*style.rz),material:Cesium.Color.fromCssColorString(style.color).withAlpha(.95),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,4800)},properties:{truth:'MODELLED_FROM_NLCD_CLASS',source_class:code,source_year:data.year}});trees++}
      }
      viewer.scene.requestRender();const s=document.getElementById('sceneStatus');if(s)s.textContent=`SURFACE · BridgePoint-generated world · ${trees} NLCD-derived tree meshes nearby · satellite/aerial default OFF`;
    }catch(e){console.warn('derived vegetation unavailable',e)}finally{sampleBusy=false;if(samplePending){samplePending=false;queueMicrotask(()=>refreshDerivedVegetation(true))}}
  }
  viewer.camera.moveEnd.addEventListener(()=>refreshDerivedVegetation(false));setInterval(()=>{if(!document.hidden)refreshDerivedVegetation(false)},30000);

  let firstClose=true;viewer.camera.moveEnd.addEventListener(()=>{const h=viewer.camera.positionCartographic?.height||1e6;if(firstClose&&h<12000&&viewer.camera.pitch<Cesium.Math.toRadians(-72)){firstClose=false;const c=viewer.camera.positionCartographic;viewer.camera.flyTo({destination:Cesium.Cartesian3.fromRadians(c.longitude,c.latitude,Math.max(700,h)),orientation:{heading:viewer.camera.heading,pitch:Cesium.Math.toRadians(-48),roll:0},duration:.7})}});
  await refreshDerivedVegetation(true);
  window.BridgePointSurfaceV2653={version:2654,mode:'BRIDGEPOINT_DERIVED_SURFACE',satelliteDefault:false,materialLayers:materialLayers.length,viewer,refreshDerivedVegetation};document.documentElement.dataset.bridgepointSurface='2654';const s=document.getElementById('sceneStatus');if(s&&!s.textContent.includes('tree'))s.textContent='SURFACE · BridgePoint-generated world · satellite/aerial default OFF · 3DEP + land cover + source-backed/derived 3D objects';
}
boot().catch(e=>console.error('BridgePoint Surface V2654 failed',e));
