const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function waitWorld(){
  const started=Date.now();
  while(Date.now()-started<12000){
    const world=window.BridgePointWorldV2500;
    if(world?.viewer?.scene?.canvas)return world;
    await sleep(12);
  }
  throw new Error('BridgePoint renderer unavailable for first frame');
}

function setUsFirstFrame(viewer){
  viewer.scene.mode=Cesium.SceneMode.SCENE3D;
  viewer.scene.globe.show=true;
  viewer.scene.globe.translucency.enabled=false;
  viewer.scene.globe.baseColor=Cesium.Color.fromCssColorString('#0b4566');
  viewer.camera.setView({
    destination:Cesium.Cartesian3.fromDegrees(-98.35,39.35,5600000),
    orientation:{heading:0,pitch:Cesium.Math.toRadians(-88),roll:0}
  });
  viewer.scene.requestRender();
}

function makeWeatherKey(){
  let host=document.getElementById('bp-weather-key');
  if(!host){
    host=document.createElement('div');
    host.id='bp-weather-key';
    document.body.appendChild(host);
  }
  host.innerHTML=`<div class="keyTitle">LIVE U.S. WEATHER · loading now</div><div class="keyGrid">
    <span><i style="background:#ff5f42"></i>Tornado / severe</span><span><i style="background:#ff9d40"></i>Hurricane / tropical</span>
    <span><i style="background:#ff704d"></i>Wildfire / fire</span><span><i style="background:#62b8ff"></i>Flood / surge</span>
    <span><i style="background:#d7f4ff"></i>Snow / ice</span><span><i style="background:#ffd45e"></i>Lightning / hail</span>
    <span><i style="background:#62d6ff"></i>Rain / radar</span><span><i style="background:#c5d4df"></i>Wind</span>
  </div>`;
  if(!document.getElementById('bp-v2661-first-style')){
    const style=document.createElement('style');style.id='bp-v2661-first-style';style.textContent=`
      #bp-weather-key{position:fixed;z-index:25;left:10px;bottom:max(10px,env(safe-area-inset-bottom));padding:8px 10px;max-width:min(390px,calc(100vw - 20px));border:1px solid rgba(72,225,255,.24);border-radius:12px;background:rgba(2,12,22,.88);backdrop-filter:blur(12px);pointer-events:none;box-shadow:0 10px 30px rgba(0,0,0,.28)}
      #bp-weather-key .keyTitle{font:900 9px system-ui;color:#e7fbff;letter-spacing:.08em;margin-bottom:6px}
      #bp-weather-key .keyGrid{display:grid;grid-template-columns:1fr 1fr;gap:4px 10px;font:700 8px system-ui;color:#c8dbe7}
      #bp-weather-key span{display:flex;align-items:center;gap:5px;white-space:nowrap}#bp-weather-key i{width:8px;height:8px;border-radius:50%;box-shadow:0 0 7px currentColor}
      @media(max-width:600px){#bp-weather-key{padding:6px 8px;max-width:270px}#bp-weather-key .keyGrid{font-size:7px;gap:3px 7px}}
    `;document.head.appendChild(style);
  }
}

function keepWeatherVisible(viewer){
  const ds=viewer.dataSources.getByName('bp-weather')[0];if(!ds?.entities)return;
  const apply=()=>{
    for(const e of ds.entities.values){
      const far=new Cesium.DistanceDisplayCondition(0,26000000);
      if(e.polygon)e.polygon.distanceDisplayCondition=far;
      if(e.polyline)e.polyline.distanceDisplayCondition=far;
      if(e.point){e.point.distanceDisplayCondition=far;try{e.point.pixelSize=Math.max(8,Number(e.point.pixelSize?.getValue?.(Cesium.JulianDate.now())||8))}catch(_){}}
      if(e.billboard)e.billboard.distanceDisplayCondition=far;
      if(e.label)e.label.distanceDisplayCondition=new Cesium.DistanceDisplayCondition(0,8000000);
    }
    viewer.scene.requestRender();
    const key=document.querySelector('#bp-weather-key .keyTitle');if(key)key.textContent=`LIVE U.S. WEATHER · ${ds.entities.values.length.toLocaleString()} mapped states/events`;
  };
  ds.entities.collectionChanged.addEventListener(apply);apply();
}

async function boot(){
  makeWeatherKey();
  const world=await waitWorld(),viewer=world.viewer;
  let touched=false;
  const stop=()=>{touched=true};
  viewer.scene.canvas.addEventListener('pointerdown',stop,{passive:true,once:true});
  setUsFirstFrame(viewer);

  // The legacy boot previously waits for country data + GPS before these. Start them now, in parallel.
  world.refreshRadar?.();
  world.loadWeather?.(true);
  keepWeatherVisible(viewer);

  // The legacy module may still complete an earlier asynchronous startup path. Until the user interacts,
  // keep the requested first view over the U.S.; My Location remains explicit through its labeled button.
  const started=Date.now();
  const guard=setInterval(()=>{
    if(touched||Date.now()-started>6500){clearInterval(guard);return}
    const h=viewer.camera.positionCartographic?.height||0;
    const c=viewer.camera.positionCartographic;
    const lon=c?Cesium.Math.toDegrees(c.longitude):0,lat=c?Cesium.Math.toDegrees(c.latitude):0;
    if(h<2500000||h>9000000||lon<-135||lon>-60||lat<15||lat>60)setUsFirstFrame(viewer);
  },90);

  setTimeout(()=>{world.refreshRadar?.();world.loadWeather?.(true);keepWeatherVisible(viewer)},500);
  setTimeout(()=>{world.streamViewport?.(true);window.BridgePointWorldV2652?.refresh?.(true)},750);
  setInterval(()=>{if(!document.hidden){world.loadWeather?.(true);world.refreshRadar?.()}},300000);
  window.BridgePointFirstFrameV2661={viewer,setUsView:()=>setUsFirstFrame(viewer),refreshWeather:()=>{world.loadWeather?.(true);world.refreshRadar?.()}};
  document.documentElement.dataset.bridgepointFirstFrame='2661';
}

boot().catch(error=>console.error('BridgePoint V2661 first-frame failed',error));
