const NATURAL_EARTH_COUNTRIES='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const US_CODES=new Set(['US','USA','PR','PRI','GU','GUM','VI','VIR','AS','ASM','MP','MNP']);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function waitForViewer(){
  const started=Date.now();
  while(Date.now()-started<20000){
    const world=window.BridgePointWorldV2500;
    if(world?.viewer?.scene?.canvas)return world.viewer;
    await sleep(100);
  }
  throw new Error('BridgePoint renderer did not initialize');
}

function forceInteractive(viewer){
  const scene=viewer.scene;
  const controller=scene.screenSpaceCameraController;
  controller.enableInputs=true;
  controller.enableRotate=true;
  controller.enableTranslate=true;
  controller.enableZoom=true;
  controller.enableTilt=true;
  controller.enableLook=true;
  controller.minimumZoomDistance=1.6;
  controller.maximumZoomDistance=26000000;
  controller.enableCollisionDetection=true;

  scene.globe.show=true;
  scene.globe.baseColor=Cesium.Color.fromCssColorString('#173747');
  scene.globe.showGroundAtmosphere=true;
  scene.globe.enableLighting=true;
  if(scene.globe.translucency){
    scene.globe.translucency.enabled=false;
    scene.globe.translucency.frontFaceAlpha=1;
    scene.globe.translucency.backFaceAlpha=1;
  }
  if(scene.mode!==Cesium.SceneMode.SCENE3D)scene.morphTo3D(0);

  // Continuous rendering is intentional on the map-only mobile surface. It prevents
  // the request-render path from appearing frozen during touch gestures on PWAs.
  scene.requestRenderMode=false;
  viewer.useDefaultRenderLoop=true;
  viewer.targetFrameRate=/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)?30:45;

  const canvas=scene.canvas;
  canvas.style.pointerEvents='auto';
  canvas.style.touchAction='none';
  canvas.style.userSelect='none';
  canvas.style.webkitUserSelect='none';
  canvas.tabIndex=0;
  const container=document.getElementById('cesiumContainer');
  if(container){container.style.pointerEvents='auto';container.style.touchAction='none'}
  document.documentElement.style.touchAction='none';
  document.body.style.touchAction='none';
}

function cameraHitsEarth(viewer){
  try{
    const canvas=viewer.scene.canvas;
    const center=new Cesium.Cartesian2(canvas.clientWidth/2,canvas.clientHeight/2);
    return Boolean(viewer.camera.pickEllipsoid(center,Cesium.Ellipsoid.WGS84));
  }catch(_){return false}
}

function resetToUS(viewer,animate=false){
  const options={
    destination:Cesium.Cartesian3.fromDegrees(-98.35,39.5,5200000),
    orientation:{heading:0,pitch:Cesium.Math.toRadians(-88),roll:0}
  };
  if(animate)viewer.camera.flyTo({...options,duration:.65});
  else viewer.camera.setView(options);
  viewer.scene.requestRender();
}

function outerRings(g){
  if(g?.type==='Polygon')return g.coordinates?.[0]?[g.coordinates[0]]:[];
  if(g?.type==='MultiPolygon')return(g.coordinates||[]).map(p=>p?.[0]).filter(Boolean);
  return[];
}
function degrees(ring){const out=[];for(const p of ring||[])if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1]))out.push(+p[0],+p[1]);return out.length>=6?out:null}

async function addWideUSLand(viewer){
  try{
    if(viewer.dataSources.getByName('bp-wide-us-generated-land').length)return;
    const response=await fetch(NATURAL_EARTH_COUNTRIES,{cache:'force-cache',signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error(`Natural Earth ${response.status}`);
    const data=await response.json();
    const ds=new Cesium.CustomDataSource('bp-wide-us-generated-land');
    for(const feature of data.features||[]){
      const p=feature.properties||{};
      const a2=String(p.ISO_A2||p.ISO_A2_EH||'').toUpperCase();
      const a3=String(p.ADM0_A3||p.ISO_A3||'').toUpperCase();
      if(!US_CODES.has(a2)&&!US_CODES.has(a3))continue;
      for(const ring of outerRings(feature.geometry)){
        const coords=degrees(ring);if(!coords)continue;
        ds.entities.add({polygon:{
          hierarchy:Cesium.Cartesian3.fromDegreesArray(coords),
          height:0.2,
          material:Cesium.Color.fromCssColorString('#3f6846').withAlpha(.98),
          outline:true,
          outlineColor:Cesium.Color.fromCssColorString('#6d9271').withAlpha(.35),
          distanceDisplayCondition:new Cesium.DistanceDisplayCondition(120000,26000000)
        }});
      }
    }
    viewer.dataSources.add(ds);
    viewer.scene.requestRender();
  }catch(error){console.warn('Wide generated U.S. land unavailable',error)}
}

async function boot(){
  const viewer=await waitForViewer();
  forceInteractive(viewer);
  await addWideUSLand(viewer);

  // Let the old startup/geolocation routine finish. Only recover the camera when its
  // center ray still does not hit Earth, so a successful user-location fly is preserved.
  await sleep(7000);
  forceInteractive(viewer);
  if(!cameraHitsEarth(viewer))resetToUS(viewer,false);

  // Recover again after WebGL context restores or orientation/resize changes.
  const recover=()=>{
    forceInteractive(viewer);
    if(!cameraHitsEarth(viewer))resetToUS(viewer,false);
  };
  window.addEventListener('orientationchange',()=>setTimeout(recover,250),{passive:true});
  window.addEventListener('resize',()=>setTimeout(recover,120),{passive:true});
  viewer.scene.canvas.addEventListener('webglcontextrestored',recover,{passive:true});

  const us=document.getElementById('usButton');
  if(us)us.addEventListener('click',()=>resetToUS(viewer,true));
  const status=document.getElementById('status');
  if(status)status.textContent='BridgePoint Generated World · drag to move · pinch to zoom · two-finger tilt';

  window.BridgePointInteractionV2656={viewer,forceInteractive:()=>forceInteractive(viewer),resetToUS:()=>resetToUS(viewer,true),cameraHitsEarth:()=>cameraHitsEarth(viewer)};
  document.documentElement.dataset.bridgepointInteraction='2656';
}

boot().catch(error=>console.error('BridgePoint interaction recovery failed',error));
