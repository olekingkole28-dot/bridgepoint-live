const COUNTRY_LOCAL='./countries-50m.geojson';
const COUNTRY_FALLBACK='https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_50m_admin_0_countries.geojson';
const STATES_LOCAL='./us-states.geojson';
const STATES_FALLBACK='https://raw.githubusercontent.com/PublicaMundi/MappingAPI/master/data/geojson/us-states.json';
const US_CODES=new Set(['US','USA','PRI','PR','GUM','GU','VIR','VI','ASM','AS','MNP','MP','UMI','UM']);
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function waitWorld(){
  const started=Date.now();
  while(Date.now()-started<12000){const w=window.BridgePointWorldV2500;if(w?.viewer?.scene?.canvas)return w;await sleep(12)}
  throw new Error('BridgePoint renderer unavailable for surface labels');
}
async function json(local,fallback){
  try{const r=await fetch(local,{cache:'force-cache'});if(r.ok)return await r.json()}catch(_){ }
  const r=await fetch(fallback,{cache:'force-cache'});if(!r.ok)throw new Error(`boundary source ${r.status}`);return r.json();
}
function rings(g){if(g?.type==='Polygon')return g.coordinates?.[0]?[g.coordinates[0]]:[];if(g?.type==='MultiPolygon')return(g.coordinates||[]).map(p=>p?.[0]).filter(Boolean);return[]}
function flat(r){const a=[];for(const p of r||[])if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1]))a.push(+p[0],+p[1]);return a.length>=6?a:null}
function bbox(r){let minX=180,minY=90,maxX=-180,maxY=-90;for(const p of r||[]){if(!Number.isFinite(+p?.[0])||!Number.isFinite(+p?.[1]))continue;minX=Math.min(minX,+p[0]);minY=Math.min(minY,+p[1]);maxX=Math.max(maxX,+p[0]);maxY=Math.max(maxY,+p[1])}return[minX,minY,maxX,maxY]}
function largestRing(g){let best=null,score=-1;for(const r of rings(g)){const b=bbox(r),s=Math.abs((b[2]-b[0])*(b[3]-b[1]));if(s>score){score=s;best=r}}return best}
function center(r){if(!r?.length)return null;let x=0,y=0,n=0;for(const p of r){if(Number.isFinite(+p?.[0])&&Number.isFinite(+p?.[1])){x+=+p[0];y+=+p[1];n++}}return n?[x/n,y/n]:null}
function countryCode(p={}){return String(p.ISO_A2||p.ISO_A2_EH||p.ADM0_A3||p.ISO_A3||'').toUpperCase()}
function countryName(p={}){return String(p.NAME_EN||p.ADMIN||p.NAME||'Country')}

const textureCache=new Map();
function textTexture(text,fill,stroke){
  const key=`${text}|${fill}|${stroke}`;if(textureCache.has(key))return textureCache.get(key);
  const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=256;const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 92px system-ui, sans-serif';ctx.lineJoin='round';ctx.lineWidth=18;ctx.strokeStyle=stroke;ctx.strokeText(text,512,128);ctx.fillStyle=fill;ctx.fillText(text,512,128);
  const url=canvas.toDataURL('image/png');textureCache.set(key,url);return url;
}
function surfaceText(ds,{lon,lat,text,widthDeg,heightDeg,fill,stroke,near,far,country,state}){
  const cos=Math.max(.28,Math.cos(Cesium.Math.toRadians(lat)));const halfLon=(widthDeg/cos)/2,halfLat=heightDeg/2;
  const e=ds.entities.add({rectangle:{coordinates:Cesium.Rectangle.fromDegrees(lon-halfLon,lat-halfLat,lon+halfLon,lat+halfLat),height:country?320:80,material:new Cesium.ImageMaterialProperty({image:textTexture(text,fill,stroke),transparent:true}),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(near,far),outline:false}});
  if(country)e.bridgepointCountry=country;if(state)e.bridgepointState=state;return e;
}
function removeLegacyCountryGraphics(viewer){
  for(const name of ['bp-v2658-surface-countries','bp-v2657-us-built','bp-v2657-foreign-locked','bp-country-locks']){
    const ds=viewer.dataSources.getByName(name)[0];if(ds)viewer.dataSources.remove(ds,true);
  }
}
function openCountry(country){
  window.BridgePointSelectedCountry=country;
  const card=document.getElementById('lockCard');if(!card)return;
  const title=document.getElementById('lockTitle'),text=document.getElementById('lockText'),button=document.getElementById('requestExpansionButton');
  if(title)title.textContent=`🔒 ${country.name} — BridgePoint Locked`;
  if(text)text.textContent='BridgePoint has not built this country yet. Request it to add this country to the expansion queue.';
  if(button)button.textContent=`Request BridgePoint in ${country.name}`;
  card.classList.add('open');
}

async function buildSurfaceMap(viewer){
  for(const name of ['bp-v2661-boundaries','bp-v2661-map-text']){const old=viewer.dataSources.getByName(name)[0];if(old)viewer.dataSources.remove(old,true)}
  const boundaries=new Cesium.CustomDataSource('bp-v2661-boundaries');const labels=new Cesium.CustomDataSource('bp-v2661-map-text');viewer.dataSources.add(boundaries);viewer.dataSources.add(labels);
  const [countries,states]=await Promise.all([json(COUNTRY_LOCAL,COUNTRY_FALLBACK),json(STATES_LOCAL,STATES_FALLBACK)]);

  for(const feature of countries.features||[]){
    const props=feature.properties||{},code=countryCode(props),name=countryName(props),isUs=US_CODES.has(code);
    for(const ring of rings(feature.geometry)){const d=flat(ring);if(!d)continue;const entity=boundaries.entities.add({polygon:{hierarchy:Cesium.Cartesian3.fromDegreesArray(d),material:Cesium.Color.fromCssColorString(isUs?'#1ca55a':'#d11931').withAlpha(isUs ? 0.10 : 0.105),outline:true,outlineColor:Cesium.Color.fromCssColorString(isUs?'#55f39a':'#ff334d').withAlpha(.96),height:0,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,26000000)}});if(!isUs)entity.bridgepointCountry={code,name,locked:true}}
    const r=largestRing(feature.geometry),c=r?center(r):null,b=r?bbox(r):null;if(!c||!b)continue;
    const width=Math.max(2.4,Math.min(16,(b[2]-b[0])*.6)),height=Math.max(.6,Math.min(3.2,(b[3]-b[1])*.17));
    if(isUs){if(code==='US'||code==='USA')surfaceText(labels,{lon:c[0],lat:c[1],text:'UNITED STATES',widthDeg:11,heightDeg:1.8,fill:'#d4ffe4',stroke:'#06371e',near:900000,far:18000000})}
    else surfaceText(labels,{lon:c[0],lat:c[1],text:`🔒 ${name.toUpperCase()}`,widthDeg:width,heightDeg:height,fill:'#ff9baa',stroke:'#3d050e',near:750000,far:21000000,country:{code,name,locked:true}});
  }

  for(const feature of states.features||[]){
    const props=feature.properties||{},name=String(props.name||props.NAME||props.State||'State'),r=largestRing(feature.geometry);if(!r)continue;const d=flat(r);if(!d)continue;const b=bbox(r),c=center(r);if(!c)continue;
    boundaries.entities.add({polyline:{positions:Cesium.Cartesian3.fromDegreesArray(d),width:1.35,material:Cesium.Color.fromCssColorString('#62f0a3').withAlpha(.88),clampToGround:true,distanceDisplayCondition:new Cesium.DistanceDisplayCondition(100000,9000000)}});
    const width=Math.max(.75,Math.min(4.6,(b[2]-b[0])*.52)),height=Math.max(.22,Math.min(.9,(b[3]-b[1])*.15));
    surfaceText(labels,{lon:c[0],lat:c[1],text:name.toUpperCase(),widthDeg:width,heightDeg:height,fill:'#caffdc',stroke:'#07361f',near:120000,far:5200000,state:{name}});
  }
  removeLegacyCountryGraphics(viewer);viewer.scene.requestRender();

  const handler=new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
  handler.setInputAction(m=>{const picked=viewer.scene.pick(m.position),entity=picked?.id;if(entity?.bridgepointCountry?.locked)openCountry(entity.bridgepointCountry)},Cesium.ScreenSpaceEventType.LEFT_CLICK);
  viewer.camera.moveStart.addEventListener(()=>document.getElementById('lockCard')?.classList.remove('open'));

  // V2658 can finish a slower remote bootstrap after V2661. Remove its screen-facing country/state layer if it appears later.
  let passes=0;const suppress=setInterval(()=>{removeLegacyCountryGraphics(viewer);if(++passes>80)clearInterval(suppress)},500);
  window.BridgePointSurfaceMapV2661={viewer,boundaries,labels,rebuild:()=>buildSurfaceMap(viewer)};
  document.documentElement.dataset.bridgepointSurfaceLabels='2661';
}

waitWorld().then(w=>buildSurfaceMap(w.viewer)).catch(error=>console.error('BridgePoint V2661 surface labels failed',error));
