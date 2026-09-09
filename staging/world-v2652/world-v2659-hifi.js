const mobile=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

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
function lines(g){if(g?.type==='LineString')return[g.coordinates||[]];if(g?.type==='MultiLineString')return g.coordinates||[];return[]}
function rowGeometry(row={}){return row.geometry||row.geometry_geojson||row.geom_geojson||row.footprint||null}
function flat(r){const a=[];for(const p of r||[])if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1]))a.push(+p[0],+p[1]);return a.length>=4?a:null}
function css(){
  if(document.getElementById('bp-hifi-style'))return;
  const s=document.createElement('style');s.id='bp-hifi-style';s.textContent=`
  .controlStack{display:none!important}
  #bp-nav{position:fixed;z-index:27;top:max(58px,calc(env(safe-area-inset-top) + 52px));right:10px;display:flex;flex-direction:column;gap:7px;padding:7px;background:rgba(2,12,22,.9);border:1px solid rgba(72,225,255,.24);border-radius:14px;backdrop-filter:blur(12px);box-shadow:0 10px 30px rgba(0,0,0,.28)}
  #bp-nav button{min-width:112px;min-height:38px;padding:8px 11px;border-radius:10px;border:1px solid rgba(72,225,255,.22);background:#0c2941;color:#e9fbff;font:800 10px system-ui;letter-spacing:.01em;text-align:left;box-shadow:inset 0 0 18px rgba(72,225,255,.04)}
  #bp-nav button:active{transform:scale(.98);background:#123854}
  #bp-nav button b{display:inline-block;width:21px;color:#61e8ff;font-size:14px;text-align:center;margin-right:5px}
  #bp-weather-key .keyTitle{font-size:9px!important;color:#dff7ff!important;letter-spacing:.08em!important}
  @media(max-width:760px){#bp-nav{right:7px;top:max(54px,calc(env(safe-area-inset-top) + 48px));gap:5px;padding:5px}#bp-nav button{min-width:104px;min-height:34px;padding:6px 8px;font-size:9px}}
  `;document.head.appendChild(s);
}
function configureQuality(viewer){
  const scene=viewer.scene,globe=scene.globe;
  viewer.resolutionScale=Math.min(window.devicePixelRatio||1,mobile?1.15:1.5);
  viewer.targetFrameRate=mobile?45:60;
  scene.backgroundColor=Cesium.Color.fromCssColorString('#020711');
  globe.baseColor=Cesium.Color.fromCssColorString('#0b4566');
  globe.enableLighting=true;
  globe.dynamicAtmosphereLighting=true;
  globe.dynamicAtmosphereLightingFromSun=true;
  globe.showGroundAtmosphere=true;
  globe.depthTestAgainstTerrain=true;
  globe.maximumScreenSpaceError=mobile?1.65:1.0;
  globe.preloadAncestors=true;
  globe.preloadSiblings=true;
  scene.fog.enabled=true;scene.fog.density=.000105;
  if(scene.skyAtmosphere)scene.skyAtmosphere.show=true;
  try{scene.postProcessStages.fxaa.enabled=true}catch(_){ }
  try{scene.highDynamicRange=true}catch(_){ }
  try{scene.msaaSamples=mobile?2:4}catch(_){ }
  try{scene.light=new Cesium.SunLight({intensity:1.55})}catch(_){ }
  try{viewer.shadows=true;viewer.shadowMap.maximumDistance=18000;viewer.shadowMap.size=mobile?1024:2048}catch(_){ }
}
function styleBuildings(viewer){
  const buildings=viewer.dataSources.getByName('bp-buildings')[0],roofs=viewer.dataSources.getByName('bp-roofs')[0];
  if(buildings?.entities)for(const e of buildings.entities.values){if(!e.polygon)continue;try{e.polygon.shadows=Cesium.ShadowMode.ENABLED;e.polygon.outlineWidth=1}catch(_){}}
  if(roofs?.entities)for(const e of roofs.entities.values){if(!e.polygon)continue;try{e.polygon.shadows=Cesium.ShadowMode.ENABLED}catch(_){}}
}
function buildRoadSurfaces(viewer){
  const old=viewer.dataSources.getByName('bp-v2659-road-surfaces')[0];if(old)viewer.dataSources.remove(old,true);
  const src=viewer.dataSources.getByName('bp-roads')[0];if(!src)return;
  const ds=new Cesium.CustomDataSource('bp-v2659-road-surfaces');let n=0;
  for(const e of src.entities.values){if(n>900)break;const row=e.bridgepoint||{},g=rowGeometry(row);for(const line of lines(g)){const d=flat(line);if(!d)continue;const family=String(row.feature_family||row.mtfcc||'').toUpperCase();const width=family.includes('PRIMARY')?22:family.includes('SECONDARY')?14:8;ds.entities.add({corridor:{positions:Cesium.Cartesian3.fromDegreesArray(d),width,heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,material:Cesium.Color.fromCssColorString('#34383b'),outline:true,outlineColor:Cesium.Color.fromCssColorString('#555b5f').withAlpha(.55),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,50000)},properties:{truth:'DERIVED_WIDTH_FROM_SOURCE_ROAD_CLASS',source_family:family}});n++}}
  viewer.dataSources.add(ds);viewer.scene.requestRender();
}
function buildRailSurfaces(viewer){
  const old=viewer.dataSources.getByName('bp-v2659-rail-surfaces')[0];if(old)viewer.dataSources.remove(old,true);
  const src=viewer.dataSources.getByName('bp-rails')[0];if(!src)return;
  const ds=new Cesium.CustomDataSource('bp-v2659-rail-surfaces');let n=0;
  for(const e of src.entities.values){if(n>500)break;const row=e.bridgepoint||{},g=rowGeometry(row);for(const line of lines(g)){const d=flat(line);if(!d)continue;ds.entities.add({corridor:{positions:Cesium.Cartesian3.fromDegreesArray(d),width:5.2,heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,material:Cesium.Color.fromCssColorString('#665f56'),outline:true,outlineColor:Cesium.Color.fromCssColorString('#b9b5aa').withAlpha(.55),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,35000)},properties:{truth:'DERIVED_RAIL_BED_FROM_SOURCE_CENTERLINE'}});n++}}
  viewer.dataSources.add(ds);viewer.scene.requestRender();
}
function buildWater(viewer){
  const old=viewer.scene.primitives._primitives?.find?.(p=>p&&p.__bpV2659Water);if(old){try{viewer.scene.primitives.remove(old);old.destroy?.()}catch(_){}}
  const src=viewer.dataSources.getByName('bp-water')[0];if(!src)return;
  const instances=[];let n=0;
  for(const e of src.entities.values){if(n>180)break;const row=e.bridgepoint||{},g=rowGeometry(row);for(const ring of rings(g)){const d=flat(ring);if(!d||d.length<6)continue;instances.push(new Cesium.GeometryInstance({geometry:new Cesium.PolygonGeometry({polygonHierarchy:new Cesium.PolygonHierarchy(Cesium.Cartesian3.fromDegreesArray(d)),vertexFormat:Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT})}));n++}}
  if(!instances.length)return;
  let normalMap;try{normalMap=Cesium.buildModuleUrl('Assets/Textures/waterNormals.jpg')}catch(_){normalMap=undefined}
  const uniforms={baseWaterColor:new Cesium.Color(.025,.19,.29,.86),blendColor:new Cesium.Color(.03,.25,.38,.72),frequency:700,animationSpeed:.018,amplitude:2.4,specularIntensity:.72};if(normalMap)uniforms.normalMap=normalMap;
  const material=new Cesium.Material({fabric:{type:'Water',uniforms}});
  const primitive=new Cesium.Primitive({geometryInstances:instances,appearance:new Cesium.EllipsoidSurfaceAppearance({aboveGround:false,material}),asynchronous:true,show:true});primitive.__bpV2659Water=true;viewer.scene.primitives.add(primitive);
  if(src)src.show=false;viewer.scene.requestRender();
}
async function geolocate(){return new Promise((resolve,reject)=>navigator.geolocation?navigator.geolocation.getCurrentPosition(p=>resolve({lon:p.coords.longitude,lat:p.coords.latitude}),reject,{enableHighAccuracy:true,timeout:7000,maximumAge:60000}):reject(new Error('Location unavailable')))}
async function terrainHeight(viewer,lon,lat){
  const c=Cesium.Cartographic.fromDegrees(lon,lat);try{const provider=viewer.terrainProvider;if(provider&&!(provider instanceof Cesium.EllipsoidTerrainProvider)){const r=await Cesium.sampleTerrainMostDetailed(provider,[c]);if(Number.isFinite(r?.[0]?.height))return r[0].height}}catch(_){ }
  try{const h=viewer.scene.globe.getHeight(c);if(Number.isFinite(h))return h}catch(_){ }
  return 0;
}
function nav(viewer){
  let host=document.getElementById('bp-nav');if(host)host.remove();host=document.createElement('div');host.id='bp-nav';host.innerHTML='<button id="bp-my-location"><b>◎</b>My Location</button><button id="bp-full-us"><b>◉</b>Full U.S.</button><button id="bp-ground-view"><b>⌂</b>Ground View</button>';document.body.appendChild(host);
  let lastLocation=null;
  document.getElementById('bp-my-location').onclick=async()=>{try{lastLocation=await geolocate();viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(lastLocation.lon,lastLocation.lat,12000),orientation:{heading:0,pitch:Cesium.Math.toRadians(-58),roll:0},duration:.8})}catch(e){const s=document.getElementById('status');if(s)s.textContent='Location permission is required for My Location.'}};
  document.getElementById('bp-full-us').onclick=()=>viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(-98.35,39.5,5600000),orientation:{heading:0,pitch:Cesium.Math.toRadians(-88),roll:0},duration:.75});
  document.getElementById('bp-ground-view').onclick=async()=>{try{lastLocation=lastLocation||await geolocate();const h=await terrainHeight(viewer,lastLocation.lon,lastLocation.lat);viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(lastLocation.lon,lastLocation.lat,h+24),orientation:{heading:0,pitch:Cesium.Math.toRadians(-9),roll:0},duration:.9})}catch(e){const center=viewer.camera.pickEllipsoid(new Cesium.Cartesian2(viewer.canvas.clientWidth/2,viewer.canvas.clientHeight/2));if(center){const c=Cesium.Cartographic.fromCartesian(center),lon=Cesium.Math.toDegrees(c.longitude),lat=Cesium.Math.toDegrees(c.latitude),h=await terrainHeight(viewer,lon,lat);viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(lon,lat,h+24),orientation:{heading:viewer.camera.heading,pitch:Cesium.Math.toRadians(-9),roll:0},duration:.8})}};
}
function weatherKey(){const key=document.getElementById('bp-weather-key');if(!key)return;const title=key.querySelector('.keyTitle');if(title)title.textContent='LIVE WEATHER KEY · source-backed / forecast context · refresh ≤ 5 min'}
async function boot(){
  css();const world=await waitWorld(),viewer=world.viewer;configureQuality(viewer);nav(viewer);weatherKey();
  let timer=0;const rebuild=()=>{clearTimeout(timer);timer=setTimeout(()=>{styleBuildings(viewer);buildRoadSurfaces(viewer);buildRailSurfaces(viewer);buildWater(viewer);weatherKey()},160)};
  viewer.camera.moveEnd.addEventListener(rebuild);
  for(const name of ['bp-buildings','bp-roofs','bp-roads','bp-rails','bp-water']){const ds=viewer.dataSources.getByName(name)[0];if(ds?.entities)ds.entities.collectionChanged.addEventListener(rebuild)}
  rebuild();setInterval(()=>{if(!document.hidden)rebuild()},12000);
  window.BridgePointHiFiV2659={viewer,rebuild,groundView:()=>document.getElementById('bp-ground-view')?.click()};document.documentElement.dataset.bridgepointHiFi='2659';
}
boot().catch(e=>console.error('BridgePoint V2659 high-fidelity renderer failed',e));