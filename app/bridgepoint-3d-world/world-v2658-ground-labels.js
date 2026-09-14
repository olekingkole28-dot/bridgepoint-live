import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const supabase=createClient('https://xdfsjztwgsbmabshzsjw.supabase.co','sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25');
const NATURAL_EARTH='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const US_CODES=new Set(['US','USA','PRI','PR','GUM','GU','VIR','VI','ASM','AS','MNP','MP','UMI','UM']);
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
function flat(r){const a=[];for(const p of r||[])if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1]))a.push(+p[0],+p[1]);return a.length>=6?a:null}
function centerRing(r){let x=0,y=0,n=0;for(const p of r||[])if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1])){x+=+p[0];y+=+p[1];n++}return n?[x/n,y/n]:null}
function largestRing(g){let best=null,score=-1;for(const r of rings(g)){if(!r?.length)continue;let minX=180,minY=90,maxX=-180,maxY=-90;for(const p of r){minX=Math.min(minX,+p[0]);minY=Math.min(minY,+p[1]);maxX=Math.max(maxX,+p[0]);maxY=Math.max(maxY,+p[1])}const s=Math.abs((maxX-minX)*(maxY-minY));if(s>score){score=s;best=r}}return best}
function code(p={}){return String(p.ISO_A2||p.ISO_A2_EH||p.ADM0_A3||p.ISO_A3||'').toUpperCase()}
function name(p={}){return String(p.NAME_EN||p.ADMIN||p.NAME||'Country')}
function closeLock(){const card=document.getElementById('lockCard');if(card)card.classList.remove('open')}

function groundLabel(position,text,{fill='#ffffff',background='#07131d',near=0,far=26000000,font='800 11px sans-serif'}={}){
  return {
    position:Cesium.Cartesian3.fromDegrees(position[0],position[1],0),
    label:{
      text,font,
      fillColor:Cesium.Color.fromCssColorString(fill),
      outlineColor:Cesium.Color.BLACK,
      outlineWidth:4,
      style:Cesium.LabelStyle.FILL_AND_OUTLINE,
      showBackground:true,
      backgroundColor:Cesium.Color.fromCssColorString(background).withAlpha(.76),
      backgroundPadding:new Cesium.Cartesian2(6,3),
      heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,
      verticalOrigin:Cesium.VerticalOrigin.BOTTOM,
      distanceDisplayCondition:new Cesium.DistanceDisplayCondition(near,far),
      scaleByDistance:new Cesium.NearFarScalar(Math.max(near,1),1.0,far,.68),
      translucencyByDistance:new Cesium.NearFarScalar(Math.max(near,1),1.0,far,.72),
      disableDepthTestDistance:0
    }
  };
}

async function rebuildCountrySurfaceLabels(viewer){
  for(const n of ['bp-v2657-us-built','bp-v2657-foreign-locked','bp-country-locks','bp-wide-us-generated-land','bp-v2658-surface-countries']){
    const ds=viewer.dataSources.getByName(n)[0];if(ds)n==='bp-v2658-surface-countries'?viewer.dataSources.remove(ds,true):ds.show=false;
  }
  const ds=new Cesium.CustomDataSource('bp-v2658-surface-countries');
  const bootstrap=window.BridgePointExperienceV2657?.bootstrap;
  for(const s of bootstrap?.states||[]){
    for(const r of rings(s.geometry)){const d=flat(r);if(!d)continue;const e=ds.entities.add({polygon:{hierarchy:Cesium.Cartesian3.fromDegreesArray(d),material:Cesium.Color.fromCssColorString('#28b967').withAlpha(.115),outline:true,outlineColor:Cesium.Color.fromCssColorString('#4bf28d').withAlpha(.9),heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(120000,26000000)}});e.bridgepointState=s}
    const lon=finite(s.label_lon),lat=finite(s.label_lat);if(lon!==null&&lat!==null){const e=ds.entities.add(groundLabel([lon,lat],`${s.state_name}\n${s.state_code}`,{fill:'#c7ffda',background:'#052314',near:120000,far:7200000,font:'800 11px sans-serif'}));e.bridgepointState=s}
  }
  try{
    const response=await fetch(NATURAL_EARTH,{cache:'force-cache',signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error(`Natural Earth ${response.status}`);const geo=await response.json();
    for(const f of geo.features||[]){const p=f.properties||{},cc=code(p),cn=name(p);if(US_CODES.has(cc))continue;
      for(const r of rings(f.geometry)){const d=flat(r);if(!d)continue;const e=ds.entities.add({polygon:{hierarchy:Cesium.Cartesian3.fromDegreesArray(d),material:Cesium.Color.fromCssColorString('#c8172d').withAlpha(.14),outline:true,outlineColor:Cesium.Color.fromCssColorString('#ff3048').withAlpha(.93),heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(230000,26000000)}});e.bridgepointCountry={code:cc,name:cn,locked:true}}
      const r=largestRing(f.geometry),c=r?centerRing(r):null;if(c){const e=ds.entities.add(groundLabel(c,`🔒 ${cn}`,{fill:'#ff9cab',background:'#2a050b',near:900000,far:21000000,font:'800 11px sans-serif'}));e.bridgepointCountry={code:cc,name:cn,locked:true}}
    }
  }catch(error){console.warn('Country surface labels unavailable',error)}
  viewer.dataSources.add(ds);viewer.scene.requestRender();
}

function rowGeometry(row={}){return row.geometry||row.geometry_geojson||row.geom_geojson||row.footprint||null}
function rowCenter(row={}){const lon=finite(row.longitude??row.lng??row.lon),lat=finite(row.latitude??row.lat);if(lon!==null&&lat!==null)return[lon,lat];const r=largestRing(rowGeometry(row));return r?centerRing(r):null}
function labelFor(kind,row={}){const first=(...v)=>v.find(x=>x!==undefined&&x!==null&&String(x).trim());if(kind==='buildings')return first(row.full_address,row.address,row.site_address,row.name,'Building');if(kind==='parcels')return first(row.parcel_number,row.parcel_id,row.apn)?`Parcel ${first(row.parcel_number,row.parcel_id,row.apn)}`:'Parcel';if(kind==='roads')return first(row.name,row.road_name,row.route_name,row.route,'Road');if(kind==='rails')return first(row.name,row.operator,row.route_name,'Rail');if(kind==='water')return first(row.name,row.water_name,row.class,'Water');if(kind==='parking')return first(row.name,row.surface,'Parking');if(kind==='streetlights')return first(row.name,row.asset_kind,'Streetlight');if(kind==='vegetation')return first(row.species,row.common_name,row.class,'Tree / vegetation');return first(row.name,row.title,kind)}
function rebuildDenseLabels(viewer){
  for(const n of ['bp-v2657-object-labels','bp-v2658-object-labels']){const old=viewer.dataSources.getByName(n)[0];if(old)viewer.dataSources.remove(old,true)}
  const h=viewer.camera.positionCartographic?.height||1e6;if(h>24000)return;
  const ds=new Cesium.CustomDataSource('bp-v2658-object-labels');
  const rules=h<1200?
    [['buildings','bp-buildings',260,7000],['parcels','bp-parcels',140,4500],['roads','bp-roads',180,12000],['rails','bp-rails',80,14000],['water','bp-water',80,15000],['parking','bp-parking',80,3500],['streetlights','bp-streetlights',120,1800],['vegetation','bp-vegetation',120,1400]]:
    h<5000?
      [['buildings','bp-buildings',160,12000],['parcels','bp-parcels',80,7000],['roads','bp-roads',120,22000],['rails','bp-rails',60,22000],['water','bp-water',60,22000],['parking','bp-parking',40,6000],['streetlights','bp-streetlights',40,2800],['vegetation','bp-vegetation',40,2200]]:
      [['buildings','bp-buildings',70,18000],['roads','bp-roads',90,26000],['rails','bp-rails',35,26000],['water','bp-water',35,26000]];
  for(const [kind,sourceName,limit,far] of rules){const src=viewer.dataSources.getByName(sourceName)[0];if(!src)continue;let count=0;for(const entity of src.entities.values){if(count>=limit)break;const row=entity.bridgepoint||{},p=rowCenter(row);if(!p)continue;const text=labelFor(kind,row);if(!text)continue;const offset=kind==='buildings'?Math.max(2,finite(row.height_m??row.render_height_m)||7):.4;ds.entities.add({position:Cesium.Cartesian3.fromDegrees(p[0],p[1],offset),label:{text:String(text).slice(0,72),font:kind==='buildings'?'800 10px sans-serif':'700 9px sans-serif',fillColor:Cesium.Color.WHITE,outlineColor:Cesium.Color.BLACK,outlineWidth:4,style:Cesium.LabelStyle.FILL_AND_OUTLINE,showBackground:true,backgroundColor:Cesium.Color.fromCssColorString('#03101a').withAlpha(.68),backgroundPadding:new Cesium.Cartesian2(4,2),heightReference:Cesium.HeightReference.RELATIVE_TO_GROUND,verticalOrigin:Cesium.VerticalOrigin.BOTTOM,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,far),scaleByDistance:new Cesium.NearFarScalar(25,1.05,far,.58),disableDepthTestDistance:0}});count++}}
  viewer.dataSources.add(ds);viewer.scene.requestRender();
}

function wireLockPicking(viewer){
  const handler=new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(m=>{const picked=viewer.scene.pick(m.position),e=picked?.id;if(e?.bridgepointCountry?.locked){window.BridgePointSelectedCountry=e.bridgepointCountry;const card=document.getElementById('lockCard');if(card){document.getElementById('lockTitle').textContent=`🔒 ${e.bridgepointCountry.name} — BridgePoint Locked`;document.getElementById('lockText').textContent='BridgePoint has not built this country yet. Tap Request to add it to the expansion queue.';const b=document.getElementById('requestExpansionButton');if(b)b.textContent=`Request BridgePoint in ${e.bridgepointCountry.name}`;card.classList.add('open')}}},Cesium.ScreenSpaceEventType.LEFT_CLICK);
  viewer.camera.moveStart.addEventListener(closeLock);
}

function activateEverything(viewer,world){
  viewer.camera.percentageChanged=.008;
  let enabled=false,moveTimer=0,labelTimer=0;
  const tryEnable=()=>{if(enabled)return;const all=document.getElementById('allLivingButton');if(all){all.click();enabled=true;window.BridgePointWorldV2652?.refresh?.(true)}};
  const populate=()=>{
    const h=viewer.camera.positionCartographic?.height||1e6;
    if(h<120000)tryEnable();
    world.streamViewport?.(true);
    window.BridgePointWorldV2652?.refresh?.(true);
    clearTimeout(labelTimer);labelTimer=setTimeout(()=>rebuildDenseLabels(viewer),110);
  };
  viewer.camera.changed.addEventListener(()=>{clearTimeout(moveTimer);moveTimer=setTimeout(populate,75)});
  viewer.camera.moveEnd.addEventListener(()=>{populate();setTimeout(()=>rebuildDenseLabels(viewer),220)});
  const poll=setInterval(()=>{tryEnable();if(enabled)clearInterval(poll)},700);
  setTimeout(populate,500);
}

async function boot(){
  const world=await waitWorld(),viewer=world.viewer;
  await rebuildCountrySurfaceLabels(viewer);
  wireLockPicking(viewer);
  activateEverything(viewer,world);
  closeLock();
  window.BridgePointGroundLabelsV2658={viewer,rebuildCountries:()=>rebuildCountrySurfaceLabels(viewer),rebuildObjects:()=>rebuildDenseLabels(viewer)};
  document.documentElement.dataset.bridgepointGroundLabels='2658';
}
boot().catch(error=>console.error('BridgePoint V2658 ground-label/population layer failed',error));
