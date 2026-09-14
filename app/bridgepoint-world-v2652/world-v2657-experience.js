import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase=createClient('https://xdfsjztwgsbmabshzsjw.supabase.co','sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25');
const NATURAL_EARTH='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const US_CODES=new Set(['US','USA','PRI','PR','GUM','GU','VIR','VI','ASM','AS','MNP','MP','UMI','UM']);
const $=id=>document.getElementById(id);
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

function css(){
  if($('bp-v2657-style'))return;
  const s=document.createElement('style');s.id='bp-v2657-style';s.textContent=`
  #bp-weather-key{position:fixed;z-index:19;left:10px;bottom:118px;max-width:min(720px,calc(100vw - 20px));display:flex;gap:5px;flex-wrap:wrap;padding:7px 8px;background:rgba(3,14,25,.88);border:1px solid rgba(72,225,255,.22);border-radius:12px;backdrop-filter:blur(12px);pointer-events:auto}
  #bp-weather-key .keyTitle{width:100%;font-size:8px;font-weight:900;letter-spacing:.09em;color:#b9d4e2;text-transform:uppercase}
  #bp-weather-key button{min-height:25px;padding:4px 7px;font-size:8px;border-radius:999px;display:flex;align-items:center;gap:5px}
  #bp-weather-key i{width:8px;height:8px;border-radius:50%;display:inline-block;box-shadow:0 0 9px currentColor}
  .bp-rich-card{margin-top:10px;padding-top:10px;border-top:1px solid rgba(255,255,255,.08)}
  .bp-rich-card h3{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#89dff0;margin:0 0 8px}
  .bp-media-strip{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:7px 0}.bp-media-strip img{width:100%;height:105px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,.1);background:#06121c}
  .bp-feature-chips{display:flex;gap:5px;flex-wrap:wrap}.bp-feature-chips span{font-size:8px;font-weight:850;padding:4px 6px;border-radius:999px;background:#10283d;color:#cdeefa;border:1px solid rgba(72,225,255,.14)}
  .bp-rich-actions{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin-top:8px}.bp-rich-actions button{min-height:34px}
  .bp-interior-note{font-size:9px;line-height:1.4;color:#a9bdcc;margin-top:6px}
  @media(max-width:760px){#bp-weather-key{left:8px;right:8px;bottom:112px;max-height:80px;overflow:auto}.bp-media-strip img{height:92px}}
  `;document.head.appendChild(s);
}

function configureGestures(viewer){
  const c=viewer.scene.screenSpaceCameraController;
  c.enableInputs=true;c.enableRotate=true;c.enableTranslate=false;c.enableZoom=true;c.enableTilt=false;c.enableLook=false;c.enableCollisionDetection=true;
  c.rotateEventTypes=[Cesium.CameraEventType.LEFT_DRAG];
  c.zoomEventTypes=[Cesium.CameraEventType.WHEEL,Cesium.CameraEventType.PINCH];
  c.tiltEventTypes=[];c.lookEventTypes=[];c.translateEventTypes=[];
  c.minimumZoomDistance=1.6;c.maximumZoomDistance=26000000;
  const canvas=viewer.scene.canvas;canvas.style.touchAction='none';canvas.style.pointerEvents='auto';
  let lastTap=0,lastX=0,lastY=0,downX=0,downY=0,downAt=0,moved=false;
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;downX=e.clientX;downY=e.clientY;downAt=performance.now();moved=false},{passive:true});
  canvas.addEventListener('pointermove',e=>{if(Math.hypot(e.clientX-downX,e.clientY-downY)>12)moved=true},{passive:true});
  canvas.addEventListener('pointerup',e=>{
    if(e.pointerType!=='touch'&&e.pointerType!=='pen')return;
    if(moved||performance.now()-downAt>350)return;
    const now=performance.now();const close=Math.hypot(e.clientX-lastX,e.clientY-lastY)<34;
    if(now-lastTap<360&&close){
      const h=viewer.camera.positionCartographic?.height||1000000;
      viewer.camera.zoomIn(Math.max(45,h*.46));viewer.scene.requestRender();lastTap=0;
    }else{lastTap=now;lastX=e.clientX;lastY=e.clientY}
  },{passive:true});
}

function rings(g){if(g?.type==='Polygon')return g.coordinates?.[0]?[g.coordinates[0]]:[];if(g?.type==='MultiPolygon')return(g.coordinates||[]).map(p=>p?.[0]).filter(Boolean);return[]}
function flat(r){const a=[];for(const p of r||[])if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1]))a.push(+p[0],+p[1]);return a.length>=6?a:null}
function centerGeometry(g){
  if(g?.type==='Point')return g.coordinates;
  let a=null;if(g?.type==='LineString')a=g.coordinates;else if(g?.type==='MultiLineString')a=g.coordinates?.[0];else a=rings(g)[0];
  if(!a?.length)return null;let x=0,y=0,n=0;for(const p of a)if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1])){x+=+p[0];y+=+p[1];n++}return n?[x/n,y/n]:null;
}
function countryCode(p={}){return String(p.ISO_A2||p.ISO_A2_EH||p.ADM0_A3||p.ISO_A3||'').toUpperCase()}
function countryName(p={}){return String(p.NAME_EN||p.ADMIN||p.NAME||'Country')}
function pointSurface(g){const a=rings(g)[0];return a?centerGeometry({type:'LineString',coordinates:a}):null}

async function buildNavigation(viewer,bootstrap){
  for(const name of ['bp-country-locks','bp-wide-us-generated-land']){const old=viewer.dataSources.getByName(name)[0];if(old)old.show=false}
  const usDs=new Cesium.CustomDataSource('bp-v2657-us-built');
  for(const s of bootstrap?.states||[]){
    const g=s.geometry;for(const r of rings(g)){const d=flat(r);if(!d)continue;const e=usDs.entities.add({polygon:{hierarchy:Cesium.Cartesian3.fromDegreesArray(d),height:600,material:Cesium.Color.fromCssColorString('#35c86f').withAlpha(.12),outline:true,outlineColor:Cesium.Color.fromCssColorString('#4bf28d').withAlpha(.9),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(250000,26000000)}});e.bridgepointState=s}
    const lon=finite(s.label_lon),lat=finite(s.label_lat);if(lon!==null&&lat!==null)usDs.entities.add({position:Cesium.Cartesian3.fromDegrees(lon,lat,2200),label:{text:`${s.state_name}\n${s.state_code}`,font:'800 12px sans-serif',fillColor:Cesium.Color.fromCssColorString('#b9ffd2'),outlineColor:Cesium.Color.BLACK,outlineWidth:4,style:Cesium.LabelStyle.FILL_AND_OUTLINE,showBackground:true,backgroundColor:Cesium.Color.fromCssColorString('#062314').withAlpha(.72),backgroundPadding:new Cesium.Cartesian2(7,4),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(280000,8500000),disableDepthTestDistance:Number.POSITIVE_INFINITY}})
  }
  viewer.dataSources.add(usDs);

  try{
    const r=await fetch(NATURAL_EARTH,{cache:'force-cache',signal:AbortSignal.timeout(12000)});if(!r.ok)throw new Error(`countries ${r.status}`);const data=await r.json();const foreign=new Cesium.CustomDataSource('bp-v2657-foreign-locked');
    for(const f of data.features||[]){const p=f.properties||{},code=countryCode(p),name=countryName(p);if(US_CODES.has(code))continue;const c=pointSurface(f.geometry);for(const ring of rings(f.geometry)){const d=flat(ring);if(!d)continue;const e=foreign.entities.add({polygon:{hierarchy:Cesium.Cartesian3.fromDegreesArray(d),height:900,material:Cesium.Color.fromCssColorString('#d42132').withAlpha(.16),outline:true,outlineColor:Cesium.Color.fromCssColorString('#ff334c').withAlpha(.94),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(220000,26000000)}});e.bridgepointCountry={code,name,locked:true}}
      if(c) {const e=foreign.entities.add({position:Cesium.Cartesian3.fromDegrees(c[0],c[1],3000),label:{text:`🔒 ${name}`,font:'800 12px sans-serif',fillColor:Cesium.Color.fromCssColorString('#ff9ba8'),outlineColor:Cesium.Color.BLACK,outlineWidth:4,style:Cesium.LabelStyle.FILL_AND_OUTLINE,showBackground:true,backgroundColor:Cesium.Color.fromCssColorString('#2a070c').withAlpha(.72),backgroundPadding:new Cesium.Cartesian2(7,4),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(420000,17000000),disableDepthTestDistance:Number.POSITIVE_INFINITY}});e.bridgepointCountry={code,name,locked:true}}
    }
    viewer.dataSources.add(foreign);
  }catch(e){console.warn('Foreign lock geometry unavailable',e)}
  viewer.scene.requestRender();
}

function showLockedCountry(country){
  window.BridgePointSelectedCountry=country;
  const card=$('lockCard');if(!card)return;
  $('lockTitle').textContent=`🔒 ${country.name} — BridgePoint Locked`;
  $('lockText').textContent='BridgePoint has not built this country yet. Detailed zoom, generated geometry and live intelligence stay locked until its source, legal, geometry and quality gates are completed.';
  const b=$('requestExpansionButton');if(b){b.textContent=`Request BridgePoint in ${country.name}`;b.disabled=false}
  card.classList.add('open');
}

function wirePicking(viewer,world){
  const handler=new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(m=>{
    const picked=viewer.scene.pick(m.position),entity=picked?.id;
    if(entity?.bridgepointCountry?.locked){showLockedCountry(entity.bridgepointCountry);return}
    if(entity?.bridgepointState){const s=entity.bridgepointState;const status=$('status');if(status)status.textContent=`${s.state_name} · BridgePoint built U.S. jurisdiction · zoom for generated detail`;return}
    if(entity?.bridgepoint&&String(entity.id||'').startsWith('building-')){
      window.BridgePointSelectedBuilding=entity.bridgepoint;
      setTimeout(()=>enrichBuildingCard(world,entity.bridgepoint),80);
    }
  },Cesium.ScreenSpaceEventType.LEFT_CLICK);
}

function weatherLegend(bootstrap,world){
  let host=$('bp-weather-key');if(!host){host=document.createElement('div');host.id='bp-weather-key';document.body.appendChild(host)}
  host.innerHTML='<div class="keyTitle">Live weather / hazards · source-shaped · refresh ≤ 5 min</div>';
  const radar=document.createElement('button');radar.innerHTML='<i style="background:#40d6ff;color:#40d6ff"></i>Radar';radar.onclick=()=>document.getElementById('radarButton')?.click();host.appendChild(radar);
  for(const item of bootstrap?.weather_key||[]){const b=document.createElement('button');b.dataset.kind=item.key;b.innerHTML=`<i style="background:${item.color};color:${item.color}"></i>${item.label}`;b.onclick=()=>{const target=document.querySelector(`[data-weather="${item.key}"]`);if(target)target.click()};host.appendChild(b)}
  const refresh=()=>{try{world.refreshRadar?.();world.loadWeather?.(true)}catch(_){}};refresh();setInterval(refresh,300000);
}

function rowGeometry(row={}){return row.geometry||row.geometry_geojson||row.geom_geojson||row.footprint||null}
function rowCenter(row={}){const lon=finite(row.longitude??row.lng??row.lon),lat=finite(row.latitude??row.lat);if(lon!==null&&lat!==null)return[lon,lat];return centerGeometry(rowGeometry(row))}
function labelText(kind,row={}){
  const first=(...v)=>v.find(x=>x!==null&&x!==undefined&&String(x).trim());
  if(kind==='buildings')return first(row.full_address,row.address,row.site_address,'Building');
  if(kind==='parcels')return first(row.parcel_id,row.apn,row.parcel_number)?`Parcel ${first(row.parcel_id,row.apn,row.parcel_number)}`:'Parcel';
  if(kind==='roads')return first(row.name,row.road_name,row.route_name,row.route,'Road');
  if(kind==='rails')return first(row.name,row.operator,row.route_name,'Rail');
  if(kind==='water')return first(row.name,row.water_name,row.class,'Water');
  if(kind==='parking')return first(row.name,row.surface,'Parking');
  if(kind==='streetlights')return first(row.name,row.asset_kind,'Streetlight');
  if(kind==='vegetation')return first(row.species,row.common_name,row.class,'Tree / vegetation');
  return first(row.name,row.title,kind);
}
function rebuildObjectLabels(viewer){
  const old=viewer.dataSources.getByName('bp-v2657-object-labels')[0];if(old)viewer.dataSources.remove(old,true);
  const h=viewer.camera.positionCartographic?.height||1e6;if(h>18000)return;
  const ds=new Cesium.CustomDataSource('bp-v2657-object-labels');
  const rules=[['buildings','bp-buildings',h<4500?90:30,12000],['parcels','bp-parcels',h<2200?70:0,7000],['roads','bp-roads',60,22000],['rails','bp-rails',35,22000],['water','bp-water',35,22000],['parking','bp-parking',h<1800?30:0,5000],['streetlights','bp-streetlights',h<900?35:0,2500],['vegetation','bp-vegetation',h<700?30:0,1800]];
  for(const [kind,name,limit,maxDist] of rules){if(!limit)continue;const src=viewer.dataSources.getByName(name)[0];if(!src)continue;let n=0;for(const entity of src.entities.values){if(n>=limit)break;const row=entity.bridgepoint||{},p=rowCenter(row);if(!p)continue;const text=labelText(kind,row);if(!text)continue;ds.entities.add({position:Cesium.Cartesian3.fromDegrees(+p[0],+p[1],kind==='buildings'?Math.max(4,finite(row.height_m)||8):3),label:{text:String(text).slice(0,70),font:kind==='buildings'?'800 11px sans-serif':'700 9px sans-serif',fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK,outlineWidth:4,style:Cesium.LabelStyle.FILL_AND_OUTLINE,showBackground:true,backgroundColor:Cesium.Color.fromCssColorString('#03101a').withAlpha(.7),backgroundPadding:new Cesium.Cartesian2(5,3),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,maxDist),disableDepthTestDistance:800}});n++}}
  viewer.dataSources.add(ds);viewer.scene.requestRender();
}

function imageUrls(value,out=new Set(),depth=0){
  if(depth>6||value==null)return out;
  if(typeof value==='string'){if(/^https:\/\//i.test(value)&&(/\.(png|jpe?g|webp)(\?|$)/i.test(value)||/image|photo|street|aerial|media/i.test(value)))out.add(value);return out}
  if(Array.isArray(value)){for(const v of value)imageUrls(v,out,depth+1);return out}
  if(typeof value==='object')for(const [k,v] of Object.entries(value)){if(typeof v==='string'&&/^https:\/\//i.test(v)&&/url|image|photo|thumb|media|aerial|street/i.test(k))out.add(v);imageUrls(v,out,depth+1)}
  return out;
}
function evidence(bundle,terms){const text=JSON.stringify(bundle||{}).toLowerCase();return terms.some(t=>text.includes(t))}
async function enrichBuildingCard(world,row){
  const card=$('propertyCard');if(!card?.classList.contains('open'))return;
  const propertyId=row.property_id||null,buildingId=Number.isFinite(Number(row.building_id))?Number(row.building_id):null,p=rowCenter(row);
  const key=`${propertyId||''}:${buildingId||''}:${p?.join(',')||''}`;if(card.dataset.richKey===key)return;card.dataset.richKey=key;
  let holder=$('bp-rich-2657');if(holder)holder.remove();holder=document.createElement('div');holder.id='bp-rich-2657';holder.className='bp-rich-card';holder.innerHTML='<h3>BridgePoint property twin</h3><div class="loadingRow"><i class="spinner"></i>Loading geometry, parcel, media and source-backed physical detail…</div>';card.appendChild(holder);
  try{
    const {data,error}=await supabase.rpc('bridgepoint_property_card_bundle_v2657',{p_property_id:propertyId,p_building_id:buildingId,p_lng:p?.[0]??null,p_lat:p?.[1]??null});if(error)throw error;
    const study=data?.study||{},building=study.building||{},prop=study.property||{},urls=[...imageUrls(data)].slice(0,4);
    const chips=[];
    if(building.height_m!=null)chips.push(`Height ${Number(building.height_m).toFixed(1)} m`);
    if(building.floors!=null)chips.push(`${building.floors} floors`);
    if(building.roof_shape)chips.push(`Roof ${building.roof_shape}`);
    if(building.roof_material)chips.push(`Roof ${building.roof_material}`);
    if(building.facade_material)chips.push(`Facade ${building.facade_material}`);
    if(evidence(data,['solar','photovoltaic','pv_panel']))chips.push('Solar evidence');
    if(evidence(data,['pool','swimming']))chips.push('Pool evidence');
    if(evidence(data,['barn','shed','garage','carport','outbuilding']))chips.push('Property improvements');
    const interior=evidence(data,['interior','floor_plan','floorplan','room_geometry','stairs','stairway','indoor']);
    const media=urls.length?`<div class="bp-media-strip">${urls.slice(0,2).map(u=>`<img loading="eager" referrerpolicy="no-referrer" src="${u.replace(/"/g,'&quot;')}" alt="Source-backed property imagery">`).join('')}</div>`:'<div class="bp-interior-note">No source-backed property photograph is being fabricated. Imagery appears here when BridgePoint has a lawful media record.</div>';
    holder.innerHTML=`<h3>BridgePoint property twin</h3>${media}<div class="bp-feature-chips">${chips.map(x=>`<span>${x}</span>`).join('')||'<span>Source geometry loaded</span>'}</div><div class="bp-interior-note"><b>${prop.full_address||'Selected structure'}</b><br>Parcel boundary, structure geometry and roof truth feed the 3D lab. ${interior?'Source-backed interior/floor architecture evidence is present and can be exposed in x-ray mode.':'No exact interior layout is currently source-backed here, so BridgePoint will not invent rooms or stairs.'}</div><div class="bp-rich-actions"><button id="bp-open-geometry" class="gold">3D geometry + measure</button><button id="bp-open-xray">X-ray ${interior?'interior':'structure'}</button></div>`;
    $('bp-open-geometry').onclick=()=>world.openLabForCurrent?.();
    $('bp-open-xray').onclick=async()=>{await world.openLabForCurrent?.();setTimeout(()=>$('labXray')?.click(),350)};
  }catch(e){holder.innerHTML=`<h3>BridgePoint property twin</h3><div class="errorNote">Property twin bundle is still loading/unavailable: ${String(e?.message||e).slice(0,180)}</div>`}
}

function aggressivePrefetch(viewer,world){
  let timer=0,last='';
  const run=()=>{
    timer=0;const h=viewer.camera.positionCartographic?.height||1e6;if(h>240000)return;
    const c=viewer.camera.positionCartographic;const key=`${Math.round(Cesium.Math.toDegrees(c.longitude)*80)}:${Math.round(Cesium.Math.toDegrees(c.latitude)*80)}:${Math.round(Math.log10(Math.max(h,2))*8)}`;if(key===last)return;last=key;
    world.streamViewport?.(true);window.BridgePointWorldV2652?.refresh?.(true);
    setTimeout(()=>rebuildObjectLabels(viewer),120);
  };
  viewer.camera.changed.addEventListener(()=>{if(timer)clearTimeout(timer);timer=setTimeout(run,110)});
  viewer.camera.moveEnd.addEventListener(()=>{run();setTimeout(()=>rebuildObjectLabels(viewer),250)});
}

async function boot(){
  css();const world=await waitWorld(),viewer=world.viewer;
  configureGestures(viewer);
  let userMoved=false;viewer.scene.canvas.addEventListener('pointerdown',()=>userMoved=true,{passive:true,once:true});
  const {data:bootstrap,error}=await supabase.rpc('bridgepoint_world_navigation_bootstrap_v2657');if(error)console.warn(error);
  const start=bootstrap?.start_camera||{lon:-98.35,lat:39.5,height_m:5200000,pitch_deg:-88};
  const startUS=()=>{viewer.camera.setView({destination:Cesium.Cartesian3.fromDegrees(start.lon,start.lat,start.height_m),orientation:{heading:0,pitch:Cesium.Math.toRadians(start.pitch_deg),roll:0}});viewer.scene.requestRender()};
  startUS();setTimeout(()=>{if(!userMoved)startUS()},1600);setTimeout(()=>{if(!userMoved)startUS()},7000);
  await buildNavigation(viewer,bootstrap||{});weatherLegend(bootstrap||{},world);wirePicking(viewer,world);aggressivePrefetch(viewer,world);
  world.loadWeather?.(true);world.refreshRadar?.();
  const status=$('status');if(status)status.textContent='BridgePoint Generated World · drag moves · pinch zooms · double-tap zooms · tap buildings for the property twin';
  window.BridgePointExperienceV2657={viewer,bootstrap,startUS,rebuildLabels:()=>rebuildObjectLabels(viewer)};
  document.documentElement.dataset.bridgepointExperience='2657';
}
boot().catch(e=>console.error('BridgePoint experience V2657 failed',e));
