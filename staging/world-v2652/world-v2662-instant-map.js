const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const STATES='./us-states.geojson';
const COUNTRIES='./countries-50m.geojson';
const US_CODES=new Set(['US','USA','PRI','PR','GUM','GU','VIR','VI','ASM','AS','MNP','MP','UMI','UM']);
const LEGACY_LABEL_SOURCES=new Set(['bp-country-locks','bp-v2657-us-built','bp-v2657-foreign-locked','bp-v2658-surface-countries','bp-v2661-boundaries','bp-v2661-map-text']);
const WEATHER_CACHE_KEY='bridgepoint-weather-us-v2662';

async function waitWorld(){
  const started=Date.now();
  while(Date.now()-started<12000){
    const world=window.BridgePointWorldV2500;
    if(world?.viewer?.scene?.canvas)return world;
    await sleep(8);
  }
  throw new Error('BridgePoint renderer unavailable');
}

function forceUs(viewer){
  viewer.scene.mode=Cesium.SceneMode.SCENE3D;
  viewer.scene.globe.show=true;
  viewer.scene.globe.translucency.enabled=false;
  viewer.scene.globe.baseColor=Cesium.Color.fromCssColorString('#0a4a6f');
  const controller=viewer.scene.screenSpaceCameraController;
  controller.enableInputs=true;controller.enableRotate=true;controller.enableZoom=true;controller.enableTranslate=false;controller.enableTilt=false;controller.enableLook=false;
  controller.rotateEventTypes=[Cesium.CameraEventType.LEFT_DRAG];
  controller.zoomEventTypes=[Cesium.CameraEventType.WHEEL,Cesium.CameraEventType.PINCH];
  viewer.camera.setView({destination:Cesium.Cartesian3.fromDegrees(-98.35,39.35,5550000),orientation:{heading:0,pitch:Cesium.Math.toRadians(-88.5),roll:0}});
  viewer.scene.requestRender();
}

function rings(g){if(g?.type==='Polygon')return g.coordinates?.[0]?[g.coordinates[0]]:[];if(g?.type==='MultiPolygon')return(g.coordinates||[]).map(p=>p?.[0]).filter(Boolean);return[]}
function flat(r,height=0){const a=[];for(const p of r||[])if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1]))a.push(+p[0],+p[1],height);return a.length>=9?a:null}
function bbox(r){let minX=180,minY=90,maxX=-180,maxY=-90;for(const p of r||[]){if(!Number.isFinite(+p?.[0])||!Number.isFinite(+p?.[1]))continue;minX=Math.min(minX,+p[0]);minY=Math.min(minY,+p[1]);maxX=Math.max(maxX,+p[0]);maxY=Math.max(maxY,+p[1])}return[minX,minY,maxX,maxY]}
function center(r){if(!r?.length)return null;let x=0,y=0,n=0;for(const p of r){if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1])){x+=+p[0];y+=+p[1];n++}}return n?[x/n,y/n]:null}
function largestRing(g){let best=null,score=-1;for(const r of rings(g)){const b=bbox(r),s=Math.abs((b[2]-b[0])*(b[3]-b[1]));if(s>score){score=s;best=r}}return best}
function countryCode(p={}){return String(p.ISO_A2||p.ISO_A2_EH||p.ADM0_A3||p.ISO_A3||'').toUpperCase()}
function countryName(p={}){return String(p.NAME_EN||p.ADMIN||p.NAME||'Country')}

const textureCache=new Map();
function textTexture(text,fill,stroke,fontSize=90){
  const key=`${text}|${fill}|${stroke}|${fontSize}`;if(textureCache.has(key))return textureCache.get(key);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,1024,256);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`900 ${fontSize}px system-ui,sans-serif`;ctx.lineJoin='round';ctx.lineWidth=18;ctx.strokeStyle=stroke;ctx.strokeText(text,512,128);ctx.fillStyle=fill;ctx.fillText(text,512,128);
  const url=canvas.toDataURL('image/png');textureCache.set(key,url);return url;
}
function surfaceLabel(ds,{lon,lat,text,widthDeg,heightDeg,fill,stroke,near,far,meta}){
  const cos=Math.max(.25,Math.cos(Cesium.Math.toRadians(lat)));const halfLon=(widthDeg/cos)/2,halfLat=heightDeg/2;
  const e=ds.entities.add({rectangle:{coordinates:Cesium.Rectangle.fromDegrees(lon-halfLon,lat-halfLat,lon+halfLon,lat+halfLat),height:900,material:new Cesium.ImageMaterialProperty({image:textTexture(text,fill,stroke),transparent:true}),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(near,far),outline:false}});
  if(meta?.country)e.bridgepointCountry=meta.country;if(meta?.state)e.bridgepointState=meta.state;return e;
}
function purgeLegacy(viewer){
  for(const name of LEGACY_LABEL_SOURCES){const ds=viewer.dataSources.getByName(name)[0];if(ds)viewer.dataSources.remove(ds,true)}
}
function guardLegacy(viewer){
  purgeLegacy(viewer);
  viewer.dataSources.dataSourceAdded.addEventListener((collection,ds)=>{if(LEGACY_LABEL_SOURCES.has(ds?.name))setTimeout(()=>{try{collection.remove(ds,true)}catch(_){}},0)});
}
function openCountry(country){
  window.BridgePointSelectedCountry=country;
  const card=document.getElementById('lockCard');if(!card)return;
  const title=document.getElementById('lockTitle'),text=document.getElementById('lockText'),button=document.getElementById('requestExpansionButton');
  if(title)title.textContent=`${country.name} — Locked`;
  if(text)text.textContent='BridgePoint has not built this country yet. Request it to add this country to the expansion queue.';
  if(button)button.textContent=`Request BridgePoint in ${country.name}`;
  card.classList.add('open');
}

async function buildStates(viewer){
  const old=viewer.dataSources.getByName('bp-v2662-us-instant')[0];if(old)viewer.dataSources.remove(old,true);
  const ds=new Cesium.CustomDataSource('bp-v2662-us-instant');viewer.dataSources.add(ds);
  const r=await fetch(STATES,{cache:'force-cache'});if(!r.ok)throw new Error(`states ${r.status}`);const geo=await r.json();
  for(const f of geo.features||[]){
    const p=f.properties||{},name=String(p.name||p.NAME||p.State||'State'),ring=largestRing(f.geometry);if(!ring)continue;
    for(const rr of rings(f.geometry)){
      const d=flat(rr,1200);if(!d)continue;
      const e=ds.entities.add({polyline:{positions:Cesium.Cartesian3.fromDegreesArrayHeights(d),width:1.8,material:Cesium.Color.fromCssColorString('#5cff9d').withAlpha(.95),arcType:Cesium.ArcType.GEODESIC,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(80000,26000000)}});e.bridgepointState={name};
    }
    const c=center(ring),b=bbox(ring);if(!c)continue;
    const width=Math.max(.8,Math.min(4.7,(b[2]-b[0])*.55)),height=Math.max(.2,Math.min(.9,(b[3]-b[1])*.16));
    surfaceLabel(ds,{lon:c[0],lat:c[1],text:name.toUpperCase(),widthDeg:width,heightDeg:height,fill:'#d1ffe0',stroke:'#05351d',near:260000,far:6200000,meta:{state:{name}}});
  }
  viewer.scene.requestRender();
  return ds;
}

async function buildCountries(viewer){
  const old=viewer.dataSources.getByName('bp-v2662-country-map')[0];if(old)viewer.dataSources.remove(old,true);
  const ds=new Cesium.CustomDataSource('bp-v2662-country-map');viewer.dataSources.add(ds);
  const r=await fetch(COUNTRIES,{cache:'force-cache'});if(!r.ok)throw new Error(`countries ${r.status}`);const geo=await r.json();
  for(const f of geo.features||[]){
    const p=f.properties||{},code=countryCode(p),name=countryName(p),isUs=US_CODES.has(code),ring=largestRing(f.geometry);if(!ring)continue;
    for(const rr of rings(f.geometry)){
      const d=flat(rr,700);if(!d)continue;
      const e=ds.entities.add({polyline:{positions:Cesium.Cartesian3.fromDegreesArrayHeights(d),width:isUs?2.2:1.4,material:Cesium.Color.fromCssColorString(isUs?'#5cff9d':'#ff3d55').withAlpha(isUs?.98:.92),arcType:Cesium.ArcType.GEODESIC,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(300000,26000000)}});if(!isUs)e.bridgepointCountry={code,name,locked:true};
    }
    if(isUs)continue;
    const c=center(ring),b=bbox(ring);if(!c)continue;
    const width=Math.max(2.2,Math.min(13,(b[2]-b[0])*.48)),height=Math.max(.48,Math.min(2.4,(b[3]-b[1])*.13));
    surfaceLabel(ds,{lon:c[0],lat:c[1],text:`LOCKED · ${name.toUpperCase()}`,widthDeg:width,heightDeg:height,fill:'#ff9baa',stroke:'#43060f',near:1600000,far:18500000,meta:{country:{code,name,locked:true}}});
  }
  viewer.scene.requestRender();
  return ds;
}

function weatherColor(kind){return{tornado:'#a67cff',hurricane:'#789bff',wildfire:'#ff6538',fire:'#ff7048',hail:'#b9f3ff',snow:'#eef8ff',flood:'#42bfff',wind:'#c5d5e5',lightning:'#ffd15c',outage:'#ffe070',rain:'#6c83ff',other:'#48e1ff'}[kind]||'#48e1ff'}
function restoreWeatherCache(viewer){
  const raw=localStorage.getItem(WEATHER_CACHE_KEY);if(!raw)return null;
  try{
    const payload=JSON.parse(raw);if(!payload?.saved_at||Date.now()-payload.saved_at>20*60*1000||!Array.isArray(payload.rows))return null;
    const ds=new Cesium.CustomDataSource('bp-weather-instant-cache');viewer.dataSources.add(ds);
    for(const row of payload.rows){const ring=row.ring;if(!Array.isArray(ring)||ring.length<3)continue;const d=[];for(const p of ring)if(Array.isArray(p)&&Number.isFinite(+p[0])&&Number.isFinite(+p[1]))d.push(+p[0],+p[1]);if(d.length<6)continue;const c=weatherColor(row.kind);ds.entities.add({polygon:{hierarchy:Cesium.Cartesian3.fromDegreesArray(d),height:1500,material:Cesium.Color.fromCssColorString(c).withAlpha(row.observed?.16:.07),outline:true,outlineColor:Cesium.Color.fromCssColorString(c).withAlpha(.82),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,26000000)}})}
    viewer.scene.requestRender();return ds;
  }catch(_){return null}
}
function saveWeatherCache(viewer){
  const src=viewer.dataSources.getByName('bp-weather')[0];if(!src?.entities?.values?.length)return;
  const jd=Cesium.JulianDate.now(),rows=[];
  for(const e of src.entities.values){if(rows.length>=160)break;const hierarchy=e.polygon?.hierarchy?.getValue?.(jd),positions=hierarchy?.positions;if(!positions?.length)continue;const ring=[];const step=Math.max(1,Math.ceil(positions.length/90));for(let i=0;i<positions.length;i+=step){const q=Cesium.Cartographic.fromCartesian(positions[i]);ring.push([+Cesium.Math.toDegrees(q.longitude).toFixed(4),+Cesium.Math.toDegrees(q.latitude).toFixed(4)])}if(ring.length<3)continue;const props=e.properties,kind=props?.kind?.getValue?.(jd)||'other',observed=Boolean(props?.observed?.getValue?.(jd));rows.push({kind,observed,ring})}
  if(!rows.length)return;
  try{localStorage.setItem(WEATHER_CACHE_KEY,JSON.stringify({saved_at:Date.now(),rows}))}catch(_){}
}
function wireWeatherCache(viewer,world){
  let cached=restoreWeatherCache(viewer);
  const src=viewer.dataSources.getByName('bp-weather')[0];if(!src)return;
  let timer=0;
  const changed=()=>{clearTimeout(timer);timer=setTimeout(()=>{if(src.entities.values.length){saveWeatherCache(viewer);if(cached){viewer.dataSources.remove(cached,true);cached=null}const title=document.querySelector('#bp-weather-key .keyTitle');if(title)title.textContent=`LIVE U.S. WEATHER · ${src.entities.values.length.toLocaleString()} source-shaped events`;viewer.scene.requestRender()}},80)};
  src.entities.collectionChanged.addEventListener(changed);changed();
  world.loadWeather?.(true);world.refreshRadar?.();
}

function fastPrefetch(viewer,world){
  viewer.camera.percentageChanged=.004;
  let timer=0;
  const kick=()=>{world.streamViewport?.(true);window.BridgePointWorldV2652?.refresh?.(true);viewer.scene.requestRender()};
  viewer.camera.changed.addEventListener(()=>{clearTimeout(timer);timer=setTimeout(kick,38)});
  viewer.camera.moveEnd.addEventListener(()=>{kick();setTimeout(kick,110);setTimeout(kick,360)});
  setTimeout(kick,80);setTimeout(kick,250);setTimeout(kick,700);
}

async function boot(){
  const world=await waitWorld(),viewer=world.viewer;
  forceUs(viewer);
  guardLegacy(viewer);
  wireWeatherCache(viewer,world);
  fastPrefetch(viewer,world);

  // U.S. political lines are first-priority and do not wait for the 3 MB world-country file.
  buildStates(viewer).catch(e=>console.warn('instant state map failed',e));
  const loadCountriesLater=()=>buildCountries(viewer).catch(e=>console.warn('country map failed',e));
  if('requestIdleCallback' in window)requestIdleCallback(loadCountriesLater,{timeout:1200});else setTimeout(loadCountriesLater,420);

  const handler=new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(m=>{const picked=viewer.scene.pick(m.position),e=picked?.id;if(e?.bridgepointCountry?.locked)openCountry(e.bridgepointCountry)},Cesium.ScreenSpaceEventType.LEFT_CLICK);
  viewer.camera.moveStart.addEventListener(()=>document.getElementById('lockCard')?.classList.remove('open'));

  // Keep the initial view stable until the user actually touches the globe.
  let touched=false;viewer.scene.canvas.addEventListener('pointerdown',()=>{touched=true},{once:true,passive:true});const started=Date.now();const guard=setInterval(()=>{if(touched||Date.now()-started>3200){clearInterval(guard);return}const c=viewer.camera.positionCartographic,h=c?.height||0,lon=c?Cesium.Math.toDegrees(c.longitude):0,lat=c?Cesium.Math.toDegrees(c.latitude):0;if(h<3000000||h>8000000||lon<-132||lon>-65||lat<20||lat>58)forceUs(viewer)},70);

  window.BridgePointInstantMapV2662={viewer,setUs:()=>forceUs(viewer),rebuildStates:()=>buildStates(viewer),rebuildCountries:()=>buildCountries(viewer),refreshWeather:()=>{world.loadWeather?.(true);world.refreshRadar?.()}};
  document.documentElement.dataset.bridgepointInstantMap='2662';
}

boot().catch(error=>console.error('BridgePoint V2662 instant map failed',error));
