const NLCD_WMS='https://dmsdata.cr.usgs.gov/geoserver/mrlc_Land-Cover-Native_conus_year_data/wms';
const FALLBACK_GROUND='#45613f';
const waitForWorld=()=>new Promise((resolve,reject)=>{const s=Date.now();const t=()=>{const w=window.BridgePointWorldV2500;if(w?.viewer)return resolve(w);if(Date.now()-s>20000)return reject(new Error('BridgePoint base world unavailable'));setTimeout(t,100)};t()});

async function discoverWmsLayer(url){
  const q=`${url}?service=WMS&request=GetCapabilities&version=1.3.0`;
  const r=await fetch(q,{cache:'force-cache',signal:AbortSignal.timeout(12000)});
  if(!r.ok)throw new Error(`NLCD capabilities ${r.status}`);
  const xml=new DOMParser().parseFromString(await r.text(),'application/xml');
  const names=[...xml.querySelectorAll('Layer > Name')].map(n=>n.textContent?.trim()).filter(Boolean);
  return names.find(n=>/Land-Cover-Native_conus_year_data/i.test(n))||names.find(n=>/land.?cover/i.test(n))||names[0]||null;
}

function materialColor(v=''){
  const s=String(v).toLowerCase();
  if(/brick/.test(s))return'#9a6658';
  if(/wood|timber/.test(s))return'#9b8065';
  if(/metal|steel|aluminum/.test(s))return'#a6b0b5';
  if(/concrete|cement/.test(s))return'#aaa69d';
  if(/glass/.test(s))return'#6f9fac';
  if(/stone|masonry/.test(s))return'#8e8a80';
  return'#8a979b';
}
function roofColor(v=''){
  const s=String(v).toLowerCase();
  if(/metal/.test(s))return'#9da9ad';
  if(/tile|clay/.test(s))return'#9a5e43';
  if(/slate/.test(s))return'#59646c';
  if(/shingle|asphalt/.test(s))return'#4d5357';
  if(/wood/.test(s))return'#776557';
  return'#626a70';
}
function colorEntityCollection(ds,kind){
  if(!ds?.entities)return;
  for(const e of ds.entities.values){
    const row=e.bridgepoint||{};
    if(kind==='building'&&e.polygon){
      e.polygon.material=Cesium.Color.fromCssColorString(materialColor(row.facade_material)).withAlpha(.98);
      e.polygon.outlineColor=Cesium.Color.fromCssColorString('#d8edf2').withAlpha(.32);
    }else if(kind==='roof'&&e.polygon){
      e.polygon.material=Cesium.Color.fromCssColorString(roofColor(row.roof_material)).withAlpha(.98);
      e.polygon.outlineColor=Cesium.Color.fromCssColorString('#eef8fa').withAlpha(.25);
    }else if(kind==='road'&&e.polyline){
      const fam=String(row.feature_family||'');
      e.polyline.width=fam==='ROAD_PRIMARY'?7:fam==='ROAD_SECONDARY'?5:3;
      e.polyline.material=Cesium.Color.fromCssColorString('#34383b');
    }else if(kind==='rail'&&e.polyline){
      e.polyline.width=2.2;e.polyline.material=Cesium.Color.fromCssColorString('#57595b');
    }else if(kind==='water'&&e.polygon){
      e.polygon.material=Cesium.Color.fromCssColorString('#176f8e').withAlpha(.82);
      e.polygon.outlineColor=Cesium.Color.fromCssColorString('#43b9d9').withAlpha(.22);
    }else if(kind==='parking'&&e.polygon){
      e.polygon.material=Cesium.Color.fromCssColorString('#45484a').withAlpha(.96);
    }
  }
}
function promotePointTrees(viewer,ds){
  if(!ds?.entities||ds.__bp3dTrees)return;ds.__bp3dTrees=true;
  const derived=new Cesium.CustomDataSource('bp-derived-tree-meshes-v2653');viewer.dataSources.add(derived);
  const rebuild=()=>{derived.entities.removeAll();for(const e of ds.entities.values){const p=e.position?.getValue?.(Cesium.JulianDate.now());if(!p)continue;const row=e.bridgepoint||{},h=Math.max(4,Math.min(28,Number(row.height_m||row.tree_height_m||8))),dbh=Math.max(.12,Math.min(1.1,Number(row.dbh_m||row.trunk_diameter_m||h*.035)));derived.entities.add({position:p,cylinder:{length:h,bottomRadius:dbh/2,topRadius:dbh*.34,material:Cesium.Color.fromCssColorString('#6c4d35'),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,6500)}});const c=Cesium.Cartographic.fromCartesian(p),top=Cesium.Cartesian3.fromRadians(c.longitude,c.latitude,(c.height||0)+h*.78);derived.entities.add({position:top,ellipsoid:{radii:new Cesium.Cartesian3(h*.22,h*.22,h*.28),material:Cesium.Color.fromCssColorString('#4f7b43').withAlpha(.96),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,7000)}})}};
  ds.entities.collectionChanged.addEventListener(rebuild);rebuild();
}
function promoteStreetlights(viewer,ds){
  if(!ds?.entities||ds.__bp3dLights)return;ds.__bp3dLights=true;
  const derived=new Cesium.CustomDataSource('bp-derived-streetlight-meshes-v2653');viewer.dataSources.add(derived);
  const rebuild=()=>{derived.entities.removeAll();for(const e of ds.entities.values){const p=e.position?.getValue?.(Cesium.JulianDate.now());if(!p)continue;const row=e.bridgepoint||{},h=Math.max(5,Math.min(14,Number(row.height_m||9)));derived.entities.add({position:p,cylinder:{length:h,bottomRadius:.09,topRadius:.06,material:Cesium.Color.fromCssColorString('#6e767b'),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,5000)}});const c=Cesium.Cartographic.fromCartesian(p),top=Cesium.Cartesian3.fromRadians(c.longitude,c.latitude,(c.height||0)+h*.95);derived.entities.add({position:top,ellipsoid:{radii:new Cesium.Cartesian3(.24,.24,.18),material:Cesium.Color.fromCssColorString('#ffe0a0').withAlpha(.95),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,5000)}})}};
  ds.entities.collectionChanged.addEventListener(rebuild);rebuild();
}

async function boot(){
  const world=await waitForWorld(),viewer=world.viewer;
  // Satellite/aerial is evidence only. It is not the default BridgePoint world skin.
  viewer.imageryLayers.removeAll(true);
  viewer.scene.globe.baseColor=Cesium.Color.fromCssColorString(FALLBACK_GROUND);
  viewer.scene.globe.enableLighting=true;
  viewer.scene.globe.dynamicAtmosphereLighting=true;
  viewer.scene.globe.dynamicAtmosphereLightingFromSun=true;
  viewer.scene.fog.enabled=true;
  viewer.scene.fog.density=.00012;

  let nlcdLayer=null;
  try{
    const layerName=await discoverWmsLayer(NLCD_WMS);
    if(layerName){
      const provider=new Cesium.WebMapServiceImageryProvider({url:NLCD_WMS,layers:layerName,parameters:{transparent:false,format:'image/png',time:'2025-01-01T00:00:00Z'},credit:new Cesium.Credit('BridgePoint surface classification input: USGS Annual NLCD 2025')});
      nlcdLayer=viewer.imageryLayers.addImageryProvider(provider);
      nlcdLayer.alpha=.78;nlcdLayer.brightness=.82;nlcdLayer.contrast=1.08;nlcdLayer.saturation=.72;nlcdLayer.gamma=1.08;
    }
  }catch(e){console.warn('NLCD material surface unavailable',e)}

  const find=name=>viewer.dataSources.getByName(name)?.[0]||null;
  const restyle=()=>{
    colorEntityCollection(find('bp-buildings'),'building');
    colorEntityCollection(find('bp-roofs'),'roof');
    colorEntityCollection(find('bp-roads'),'road');
    colorEntityCollection(find('bp-rails'),'rail');
    colorEntityCollection(find('bp-water'),'water');
    colorEntityCollection(find('bp-parking'),'parking');
    promotePointTrees(viewer,find('bp-vegetation'));
    promoteStreetlights(viewer,find('bp-streetlights'));
    viewer.scene.requestRender();
  };
  for(const name of ['bp-buildings','bp-roofs','bp-roads','bp-rails','bp-water','bp-parking']){
    const ds=find(name);if(ds?.entities&&!ds.__bpSurfaceStyled){ds.__bpSurfaceStyled=true;ds.entities.collectionChanged.addEventListener(restyle)}
  }
  restyle();
  setInterval(restyle,5000);

  // Keep close-up camera genuinely 3D rather than an overhead satellite-style view.
  let firstClose=true;
  viewer.camera.moveEnd.addEventListener(()=>{
    const h=viewer.camera.positionCartographic?.height||1e6;
    if(firstClose&&h<12000&&viewer.camera.pitch<Cesium.Math.toRadians(-72)){
      firstClose=false;
      const c=viewer.camera.positionCartographic;
      viewer.camera.flyTo({destination:Cesium.Cartesian3.fromRadians(c.longitude,c.latitude,Math.max(700,h)),orientation:{heading:viewer.camera.heading,pitch:Cesium.Math.toRadians(-48),roll:0},duration:.7});
    }
  });

  window.BridgePointSurfaceV2653={version:2653,mode:'BRIDGEPOINT_DERIVED_SURFACE',satelliteDefault:false,nlcd:Boolean(nlcdLayer),viewer};
  document.documentElement.dataset.bridgepointSurface='2653';
  const s=document.getElementById('sceneStatus');if(s)s.textContent='SURFACE · BridgePoint-derived world · satellite/aerial default OFF · 3DEP + land cover + source-backed 3D objects';
}
boot().catch(e=>console.error('BridgePoint Surface V2653 failed',e));
