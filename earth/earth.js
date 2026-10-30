import { rpc, edge, headers, EDGE, RPC, LOW, MOBILE, TIER, clamp } from '../world-v2300-config.js';

async function waitForCesium() {
  const started=Date.now();
  while(!window.Cesium && Date.now()-started<15000) await new Promise(resolve=>setTimeout(resolve,50));
  if(!window.Cesium) throw new Error('The Earth renderer library did not load.');
}
await waitForCesium();
const Cesium=window.Cesium;
const earthParams=new URLSearchParams(location.search);
if(earthParams.has('embed')) document.body.classList.add('embed');
if(earthParams.has('app')) document.body.classList.add('app-mode');

const $ = id => document.getElementById(id);
const mobile = Boolean(MOBILE || /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent));
const deviceLow = Boolean(LOW);
const state = {
  ready:false, dataSeq:0, surfaceSeq:0, lastKey:'', buildingCount:0, parcelCount:0,
  weatherCount:0, livingCount:0, placeCount:0, catalog:null, waterPrimitive:null, surfaceTiles:new Set(),
  vectorReady:false, lastWeather:0, lastLiving:0
};
let VectorTile = null, Pbf = null;
try {
  const vt = await import('https://cdn.jsdelivr.net/npm/@mapbox/vector-tile@2.0.3/+esm');
  const pb = await import('https://cdn.jsdelivr.net/npm/pbf@4.0.1/+esm');
  VectorTile = vt.VectorTile || vt.default?.VectorTile || null;
  Pbf = pb.default || pb.Pbf || null;
} catch (error) {
  console.warn('Open vector-tile decoder unavailable; BridgePoint RPC layers remain active.', error);
}

async function requestEarthRpc(name,args={},timeout=4800) {
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  try {
    const response=await fetch(RPC+name,{
      method:'POST',
      headers:headers({'Content-Type':'application/json','Cache-Control':'no-cache'}),
      body:JSON.stringify(args),signal:controller.signal,cache:'no-store'
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data?.message||data?.error||data?.hint||'HTTP '+response.status);
    return data;
  } finally {clearTimeout(timer)}
}

function status(message, mode='normal') {
  const el = $('world-status');
  if (el) el.textContent = String(message).toUpperCase().slice(0,72);
  const root = $('earth-viewport');
  if (root) root.dataset.state = mode;
}
function cameraHeight() {
  return viewer.camera.positionCartographic?.height || 1e9;
}
function currentBounds() {
  try {
    const r = viewer.camera.computeViewRectangle(viewer.scene.globe.ellipsoid);
    if (!r) return null;
    let west = Cesium.Math.toDegrees(r.west), east = Cesium.Math.toDegrees(r.east);
    let south = Cesium.Math.toDegrees(r.south), north = Cesium.Math.toDegrees(r.north);
    if (east < west) east += 360;
    south = clamp(south,-84.9,84.9); north = clamp(north,-84.9,84.9);
    if (![west,east,south,north].every(Number.isFinite) || east-west < 0.0001 || north-south < 0.0001) return null;
    return {west,south,east,north};
  } catch (_) { return null; }
}
function pointInView() {
  const p = viewer.camera.positionCartographic;
  return {lon:Cesium.Math.toDegrees(p.longitude),lat:Cesium.Math.toDegrees(p.latitude),height:p.height};
}
function tileXY(lon,lat,z) {
  const n = 2 ** z;
  const x = Math.floor((lon+180)/360*n);
  const r = Cesium.Math.toRadians(clamp(lat,-85.05112878,85.05112878));
  const y = Math.floor((1-Math.asinh(Math.tan(r))/Math.PI)/2*n);
  return {x:clamp(x,0,n-1),y:clamp(y,0,n-1)};
}
function tileZoomForHeight(height) {
  return clamp(Math.floor(13 - Math.log2(Math.max(1,height)/10000)),4,12);
}
function buildingZoomForHeight(height) {
  return clamp(Math.round(19 - Math.log2(Math.max(1000,height)/1000)),10,16);
}
function ringsOf(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'Polygon') return [geometry.coordinates || []];
  if (geometry.type === 'MultiPolygon') return geometry.coordinates || [];
  return [];
}
function lineArrays(geometry) {
  if (!geometry) return [];
  if (geometry.type === 'LineString') return [geometry.coordinates || []];
  if (geometry.type === 'MultiLineString') return geometry.coordinates || [];
  return [];
}
function polygonHierarchy(rings) {
  if (!Array.isArray(rings) || !rings.length || !Array.isArray(rings[0])) return null;
  const positions = ring => Cesium.Cartesian3.fromDegreesArray((ring || []).flatMap(p => [Number(p[0]),Number(p[1])]).filter(Number.isFinite));
  const outer = positions(rings[0]);
  if (outer.length < 3) return null;
  const holes = [];
  for (const ring of rings.slice(1)) {
    const hole = positions(ring);
    if (hole.length >= 3) holes.push(new Cesium.PolygonHierarchy(hole));
  }
  return new Cesium.PolygonHierarchy(outer,holes);
}
function colorForMaterial(value) {
  const s = String(value || '').toLowerCase();
  if (s.includes('brick')) return '#a56f5d';
  if (s.includes('wood') || s.includes('timber')) return '#8d765d';
  if (s.includes('metal') || s.includes('steel')) return '#83939b';
  if (s.includes('concrete') || s.includes('cement')) return '#9d9f9a';
  if (s.includes('glass')) return '#6f9dad';
  if (s.includes('stone') || s.includes('masonry')) return '#88857b';
  return '#7e9197';
}
function roofColor(value) {
  const s=String(value||'').toLowerCase();
  if (s.includes('metal')) return '#b1c3c8';
  if (s.includes('tile') || s.includes('clay')) return '#a9684e';
  if (s.includes('slate')) return '#616e78';
  if (s.includes('shingle') || s.includes('asphalt')) return '#4b555c';
  return '#7a858a';
}
function entityFeature(entity, props, kind) {
  entity.bridgepoint = props || {};
  entity.bridgepointKind = kind || 'FEATURE';
  entity.properties = new Cesium.PropertyBag({
    source: props?.source || props?.source_name || props?.source_key || 'BridgePoint',
    truth: props?.truth_class || props?.height_truth || props?.truth || 'SOURCE_BACKED',
    address: props?.full_address || props?.address || props?.name || '',
    id: props?.building_id || props?.property_id || props?.feature_id || props?.id || ''
  });
  return entity;
}
function addPolygonEntities(dataSource, geometry, style, props, kind) {
  let count=0;
  for (const polygon of ringsOf(geometry)) {
    const hierarchy=polygonHierarchy(polygon);
    if (!hierarchy) continue;
    const e=dataSource.entities.add({
      polygon:{
        hierarchy,height:style.height ?? 0,extrudedHeight:style.extrudedHeight,
        heightReference:style.heightReference ?? Cesium.HeightReference.CLAMP_TO_GROUND,
        extrudedHeightReference:style.extrudedHeightReference ?? Cesium.HeightReference.RELATIVE_TO_GROUND,
        material:style.material,outline:style.outline ?? false,
        outlineColor:style.outlineColor || Cesium.Color.WHITE.withAlpha(.18),
        closeTop:true,closeBottom:true
      }
    });
    entityFeature(e,props,kind); count++;
  }
  return count;
}
function addPolylineEntities(dataSource, geometry, style, props, kind) {
  let count=0;
  for (const line of lineArrays(geometry)) {
    const positions=Cesium.Cartesian3.fromDegreesArray((line||[]).flatMap(p=>[Number(p[0]),Number(p[1])]).filter(Number.isFinite));
    if (positions.length<2) continue;
    const e=dataSource.entities.add({polyline:{positions,width:style.width || 1.3,material:style.material,clampToGround:true}});
    entityFeature(e,props,kind);count++;
  }
  return count;
}
function attachGeometry(dataSource, geometry, style, props, kind) {
  if (!geometry) return 0;
  if (geometry.type==='Point' && Array.isArray(geometry.coordinates)) {
    const c=geometry.coordinates;
    const e=dataSource.entities.add({position:Cesium.Cartesian3.fromDegrees(Number(c[0]),Number(c[1]),Number(c[2]||0)),point:{pixelSize:style.pixelSize||7,color:style.material||Cesium.Color.CYAN,outlineColor:Cesium.Color.BLACK.withAlpha(.7),outlineWidth:1,disableDepthTestDistance:0}});
    entityFeature(e,props,kind);return 1;
  }
  return addPolygonEntities(dataSource,geometry,style,props,kind)+addPolylineEntities(dataSource,geometry,style,props,kind);
}

async function loadTerrariumSourceTile(z,x,y) {
  const key=z+'/'+x+'/'+y;
  if (terrainCache.has(key)) return terrainCache.get(key);
  const promise=(async()=>{
    const url='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/'+key+'.png';
    const response=await fetch(url,{mode:'cors',cache:'force-cache'});
    if (!response.ok) throw new Error('Elevation tile '+response.status);
    const bitmap=await createImageBitmap(await response.blob());
    const canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(256,256):document.createElement('canvas');
    canvas.width=256;canvas.height=256;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(bitmap,0,0,256,256);bitmap.close?.();
    const pixels=ctx.getImageData(0,0,256,256).data;
    const heights=new Float32Array(256*256);
    for(let i=0,j=0;i<heights.length;i++,j+=4) heights[i]=pixels[j]*256+pixels[j+1]+pixels[j+2]/256-32768;
    return heights;
  })();
  terrainCache.set(key,promise);
  if(terrainCache.size>48) terrainCache.delete(terrainCache.keys().next().value);
  try{return await promise}catch(error){terrainCache.delete(key);throw error}
}
const terrainCache=new Map();
async function terrainHeights(x,y,level) {
  try {
    const sourceLevel=Math.min(level,15),scale=2**(level-sourceLevel);
    const parentX=Math.floor(x/scale),parentY=Math.floor(y/scale);
    const source=await loadTerrariumSourceTile(sourceLevel,parentX,parentY);
    if(scale===1)return source;
    const offsetX=x-parentX*scale,offsetY=y-parentY*scale;
    const out=new Float32Array(256*256);
    for(let row=0;row<256;row++){
      const sy=Math.min(255,Math.floor((offsetY+((row+.5)/256))/scale*256));
      for(let col=0;col<256;col++){
        const sx=Math.min(255,Math.floor((offsetX+((col+.5)/256))/scale*256));
        out[row*256+col]=source[sy*256+sx];
      }
    }
    return out;
  } catch(error) {
    if(!state.terrainWarned){state.terrainWarned=true;console.warn('Open elevation tile unavailable; using ellipsoid fallback for missing tile.',error)}
    return new Float32Array(256*256);
  }
}
const terrainProvider = new Cesium.CustomHeightmapTerrainProvider({
  width:256,height:256,tilingScheme:new Cesium.WebMercatorTilingScheme(),
  credit:'Elevation: Mapzen Terrarium · AWS Open Data',
  callback:terrainHeights
});

const viewer = new Cesium.Viewer('earth-canvas',{
  animation:false,timeline:false,baseLayerPicker:false,geocoder:false,homeButton:false,
  sceneModePicker:false,navigationHelpButton:false,fullscreenButton:false,
  infoBox:false,selectionIndicator:false,baseLayer:false,terrainProvider,
  requestRenderMode:true,maximumRenderTimeChange:Infinity,shouldAnimate:false
});
const scene=viewer.scene,globe=scene.globe;
viewer.resolutionScale=Math.min(window.devicePixelRatio||1,mobile?0.85:(deviceLow?0.92:1.08));
viewer.targetFrameRate=mobile?30:(deviceLow?30:42);
globe.enableLighting=true;
globe.dynamicAtmosphereLighting=true;
globe.dynamicAtmosphereLightingFromSun=true;
globe.showGroundAtmosphere=true;
globe.depthTestAgainstTerrain=true;
globe.baseColor=Cesium.Color.fromCssColorString('#0a2c40');
globe.maximumScreenSpaceError=deviceLow?3.5:(mobile?3.0:2.1);
globe.tileCacheSize=mobile?96:(deviceLow?128:220);
scene.skyAtmosphere.show=true;
scene.backgroundColor=Cesium.Color.fromCssColorString('#020812');
scene.fog.enabled=true;
scene.fog.density=0.00007;
scene.fog.minimumBrightness=0.035;
scene.screenSpaceCameraController.minimumZoomDistance=45;
scene.screenSpaceCameraController.maximumZoomDistance=50000000;
try{scene.postProcessStages.fxaa.enabled=true}catch(_){}
try{scene.light=new Cesium.SunLight({intensity:1.35})}catch(_){}
viewer.camera.setView({
  destination:Cesium.Cartesian3.fromDegrees(-18,27,17800000),
  orientation:{heading:0,pitch:Cesium.Math.toRadians(-72),roll:0}
});

const blueMarble=new Cesium.UrlTemplateImageryProvider({
  // Geographic tiles cover the full -90..90 latitude range. Web Mercator stops
  // at the polar cutoff and daily MODIS JPEGs can contain opaque swath gaps.
  url:'https://gibs.earthdata.nasa.gov/wmts/epsg4326/best/BlueMarble_NextGeneration/default/500m/{z}/{y}/{x}.jpeg',
  tilingScheme:new Cesium.GeographicTilingScheme(),minimumLevel:0,maximumLevel:7,
  credit:'NASA EOSDIS GIBS · Blue Marble Next Generation'
});
viewer.imageryLayers.addImageryProvider(blueMarble);
blueMarble.errorEvent.addEventListener(error=>{
  console.warn('NASA global Blue Marble tile unavailable.',error);
  const e=$('imagery-state');if(e)e.textContent='NASA GLOBAL · RETRYING';
});
$('imagery-state').textContent='NASA / POLE-TO-POLE';


const landSource=new Cesium.CustomDataSource('earth-open-landcover');
const waterSource=new Cesium.CustomDataSource('earth-open-waterways-and-roads');
const placeSource=new Cesium.CustomDataSource('earth-open-place-labels');
const buildingSource=new Cesium.CustomDataSource('bridgepoint-source-backed-buildings');
const parcelSource=new Cesium.CustomDataSource('bridgepoint-source-backed-parcels');
const livingSource=new Cesium.CustomDataSource('bridgepoint-living-world');
const weatherSource=new Cesium.CustomDataSource('bridgepoint-live-weather');
for (const ds of [landSource,waterSource,placeSource,buildingSource,parcelSource,livingSource,weatherSource]) viewer.dataSources.add(ds);
const waterPrimitives=[];
const fallbackColor=Cesium.Color.fromCssColorString('#254d39').withAlpha(.34);
function landcoverStyle(props={}) {
  const s=String(props.class||props.subclass||'').toLowerCase();
  if(/forest|wood|orchard/.test(s))return Cesium.Color.fromCssColorString('#315f43').withAlpha(.45);
  if(/grass|meadow|scrub|heath/.test(s))return Cesium.Color.fromCssColorString('#70834b').withAlpha(.3);
  if(/farm|crop/.test(s))return Cesium.Color.fromCssColorString('#9a8550').withAlpha(.25);
  if(/sand|beach|dune/.test(s))return Cesium.Color.fromCssColorString('#b39b69').withAlpha(.27);
  if(/snow|ice|glacier/.test(s))return Cesium.Color.fromCssColorString('#d4e0e5').withAlpha(.24);
  if(/wetland|marsh/.test(s))return Cesium.Color.fromCssColorString('#3d7774').withAlpha(.36);
  return fallbackColor;
}
function geoTileCoordinates(lon,lat,z) {return tileXY(lon,lat,z)}
const vectorTileCache=new Map();
async function fetchVectorTile(z,x,y) {
  if(!VectorTile||!Pbf)return null;
  const key=z+'/'+x+'/'+y;
  if(!vectorTileCache.has(key)){
    const promise=(async()=>{
      const response=await fetch('https://tiles.openfreemap.org/planet/latest/'+key+'.pbf',{mode:'cors',cache:'force-cache'});
      if(!response.ok)throw new Error('OpenFreeMap tile '+response.status);
      return new VectorTile(new Pbf(new Uint8Array(await response.arrayBuffer())));
    })();
    vectorTileCache.set(key,promise);
    if(vectorTileCache.size>36)vectorTileCache.delete(vectorTileCache.keys().next().value);
  }
  try{return {x,y,z,tile:await vectorTileCache.get(key)}}
  catch(error){vectorTileCache.delete(key);throw error}
}
function tileFeatureGeometry(feature,x,y,z) {
  try{return feature.toGeoJSON(x,y,z)?.geometry||null}catch(_){return null}
}
function waterMaterial() {
  return new Cesium.Material({fabric:{type:'Water',uniforms:{
    baseWaterColor:new Cesium.Color(.018,.13,.2,.91),
    blendColor:new Cesium.Color(.025,.26,.37,.74),
    frequency:220,animationSpeed:0,amplitude:0.8,specularIntensity:.45
  }}});
}
function addWaterPrimitive(polygons) {
  if(!polygons.length)return;
  try {
    const instances=[];
    for(const rings of polygons){
      const hierarchy=polygonHierarchy(rings);if(!hierarchy)continue;
      const geometry=new Cesium.PolygonGeometry({
        polygonHierarchy:hierarchy,height:0,
        vertexFormat:Cesium.EllipsoidSurfaceAppearance.VERTEX_FORMAT
      });
      instances.push(new Cesium.GeometryInstance({geometry}));
    }
    if(!instances.length)return;
    const primitive=new Cesium.Primitive({
      geometryInstances:instances,
      appearance:new Cesium.EllipsoidSurfaceAppearance({aboveGround:false,material:waterMaterial()}),
      asynchronous:true,releaseGeometryInstances:true
    });
    scene.primitives.add(primitive);waterPrimitives.push(primitive);
  } catch(error) {
    console.warn('Animated water material fallback',error);
    for(const rings of polygons){
      const hierarchy=polygonHierarchy(rings);if(!hierarchy)continue;
      const entity=waterSource.entities.add({polygon:{hierarchy,height:0,material:Cesium.Color.fromCssColorString('#0a5476').withAlpha(.78),outline:true,outlineColor:Cesium.Color.fromCssColorString('#73ccdf').withAlpha(.25)}});
      entityFeature(entity,{source:'OpenFreeMap / OpenStreetMap','truth_class':'OPEN_DATA_WATER_GEOMETRY'},'WATER');
    }
  }
}
function addPlaceLabel(geometry,props={},kind='PLACE_LABEL') {
  if(geometry?.type!=='Point'||!Array.isArray(geometry.coordinates))return 0;
  const name=String(props.name_en||props.name||props.name_int||'').trim();
  if(!name)return 0;
  const cls=String(props.class||props.place||'').toLowerCase();
  if(!/city|town|village|hamlet|suburb|island|state|country|neighbourhood/.test(cls))return 0;
  const priority=/city|state|country/.test(cls),pos=geometry.coordinates;
  const entity=placeSource.entities.add({
    position:Cesium.Cartesian3.fromDegrees(Number(pos[0]),Number(pos[1]),priority?420:180),
    label:{
      text:name,font:priority?'600 13px system-ui':'500 10px system-ui',
      fillColor:Cesium.Color.fromCssColorString('#e5f5f5'),
      outlineColor:Cesium.Color.fromCssColorString('#06121a').withAlpha(.96),
      outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,
      pixelOffset:new Cesium.Cartesian2(0,-3),
      distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,priority?6500000:1800000),
      scaleByDistance:new Cesium.NearFarScalar(50000,1,2500000,.34)
    }
  });
  entityFeature(entity,{...props,name,source:'OpenFreeMap / OpenStreetMap',truth_class:'OPEN_MAP_LABEL'},kind);
  return 1;
}
function addWaterwayLabel(geometry,props={}) {
  const name=String(props.name_en||props.name||'').trim();
  if(!name)return 0;
  const line=lineArrays(geometry).sort((a,b)=>b.length-a.length)[0];
  if(!line||line.length<6)return 0;
  const p=line[Math.floor(line.length/2)];
  const entity=placeSource.entities.add({
    position:Cesium.Cartesian3.fromDegrees(Number(p[0]),Number(p[1]),260),
    label:{
      text:name,font:'italic 10px system-ui',
      fillColor:Cesium.Color.fromCssColorString('#8fd4ed'),
      outlineColor:Cesium.Color.fromCssColorString('#06121a').withAlpha(.96),
      outlineWidth:3,style:Cesium.LabelStyle.FILL_AND_OUTLINE,
      distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,850000),
      scaleByDistance:new Cesium.NearFarScalar(20000,1,600000,.35)
    }
  });
  entityFeature(entity,{...props,name,source:'OpenFreeMap / OpenStreetMap',truth_class:'OPEN_MAP_WATERWAY_LABEL'},'RIVER_LABEL');
  return 1;
}
async function refreshSurface() {
  if(!VectorTile||!Pbf){state.vectorReady=false;return}
  const height=cameraHeight(),seq=++state.surfaceSeq;
  if(height>6500000){
    state.surfaceTiles.clear();
    landSource.entities.removeAll();waterSource.entities.removeAll();placeSource.entities.removeAll();
    for(const primitive of waterPrimitives.splice(0))try{scene.primitives.remove(primitive)}catch(_){}
    state.vectorReady=false;state.placeCount=0;scene.requestRender();return;
  }
  const center=pointInView(),z=tileZoomForHeight(height),t=geoTileCoordinates(center.lon,center.lat,z);
  const offsets=[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  const selected=offsets.slice(0,9).map(([dx,dy])=>{
    const n=2**z;return{x:(t.x+dx+n)%n,y:clamp(t.y+dy,0,n-1),z}
  });
  const landFeatures=[],waterwayFeatures=[],roadFeatures=[],placeLabels=[],waterwayLabels=[];
  const waterPolygons=[],seenLabels=new Set();
  let loadedTiles=0,waterPointCount=0;
  for(let i=0;i<selected.length;i+=3){
    const batch=await Promise.allSettled(selected.slice(i,i+3).map(ti=>fetchVectorTile(ti.z,ti.x,ti.y)));
    if(seq!==state.surfaceSeq)return;
    for(const result of batch){
      if(result.status!=='fulfilled'||!result.value)continue;
      loadedTiles++;
      const item=result.value,layers=item.tile.layers||{};
      const lc=layers.landcover;
      if(height<750000&&lc){
        for(let k=0;k<Math.min(lc.length,5);k++){
          const feature=lc.feature(k),geometry=tileFeatureGeometry(feature,item.x,item.y,item.z);
          if(!geometry)continue;
          const props=feature.properties||{};
          landFeatures.push({geometry,props,material:landcoverStyle(props)});
        }
      }
      const water=layers.water;
      if(water){
        for(let k=0;k<Math.min(water.length,12)&&waterPolygons.length<30;k++){
          const feature=water.feature(k),geometry=tileFeatureGeometry(feature,item.x,item.y,item.z);
          for(const poly of ringsOf(geometry)){
            const points=poly.reduce((sum,ring)=>sum+(ring?.length||0),0);
            if(poly.length&&points<1800&&waterPointCount+points<18000){waterPolygons.push(poly);waterPointCount+=points}
          }
        }
      }
      const waterways=layers.waterway;
      if(waterways){
        for(let k=0;k<Math.min(waterways.length,mobile?12:18);k++){
          const feature=waterways.feature(k),geometry=tileFeatureGeometry(feature,item.x,item.y,item.z),props=feature.properties||{};
          if(!geometry)continue;
          waterwayFeatures.push({geometry,props});
          if(waterwayLabels.length<(mobile?5:9)&&props.name)waterwayLabels.push({geometry,props});
        }
      }
      const places=layers.place;
      if(places){
        for(let k=0;k<Math.min(places.length,mobile?20:28);k++){
          const feature=places.feature(k),geometry=tileFeatureGeometry(feature,item.x,item.y,item.z),props=feature.properties||{};
          if(!geometry||geometry.type!=='Point')continue;
          const name=String(props.name_en||props.name||props.name_int||'').trim();
          if(!name)continue;
          const pos=geometry.coordinates,key=name.toLowerCase()+':'+Number(pos[0]).toFixed(2)+':'+Number(pos[1]).toFixed(2);
          if(seenLabels.has(key))continue;
          seenLabels.add(key);placeLabels.push({geometry,props});
        }
      }
      if(height<420000){
        const roads=layers.transportation;
        if(roads){
          for(let k=0;k<Math.min(roads.length,mobile?16:24);k++){
            const feature=roads.feature(k),geometry=tileFeatureGeometry(feature,item.x,item.y,item.z),props=feature.properties||{};
            const cls=String(props.class||props.classification||'').toLowerCase();
            if(!geometry||!/(motorway|trunk|primary|secondary)/.test(cls))continue;
            roadFeatures.push({geometry,props,cls});
          }
        }
      }
    }
  }
  if(seq!==state.surfaceSeq)return;
  if(!loadedTiles)return;
  // Keep the currently rendered geography visible while the next view's tiles load.
  landSource.entities.removeAll();waterSource.entities.removeAll();placeSource.entities.removeAll();
  for(const primitive of waterPrimitives.splice(0))try{scene.primitives.remove(primitive)}catch(_){}
  for(const row of landFeatures){
    addPolygonEntities(landSource,row.geometry,{height:0,heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,material:row.material,outline:false},
      {...row.props,source:'OpenFreeMap / OpenStreetMap',truth_class:'OPEN_DATA_LANDCOVER'},'LANDCOVER');
  }
  for(const row of waterwayFeatures){
    addPolylineEntities(waterSource,row.geometry,{width:1.45,material:Cesium.Color.fromCssColorString('#55b3d2').withAlpha(.72)},
      {...row.props,source:'OpenFreeMap / OpenStreetMap',truth_class:'OPEN_DATA_WATERWAY'},'WATERWAY');
  }
  for(const row of roadFeatures){
    const width=row.cls==='motorway'||row.cls==='trunk'?1.5:1.05;
    addPolylineEntities(waterSource,row.geometry,{width,material:Cesium.Color.fromCssColorString('#d6c39b').withAlpha(.55)},
      {...row.props,source:'OpenFreeMap / OpenStreetMap',truth_class:'OPEN_DATA_ROAD'},'ROAD');
  }
  for(const row of placeLabels)addPlaceLabel(row.geometry,row.props);
  for(const row of waterwayLabels)addWaterwayLabel(row.geometry,row.props);
  addWaterPrimitive(waterPolygons);
  state.placeCount=placeSource.entities.values.length;
  state.vectorReady=true;
  $('terrain-state').textContent='TERRAIN · RIVERS · LABELS';
  scene.requestRender();
}

function addBuilding(feature) {
  const geometry=feature?.geometry||feature?.geometry_geojson||feature?.geom_geojson;
  if(!geometry)return 0;
  const p=feature.properties||feature;
  const base=clamp(Number(p.base_height_m??p.ground_elevation_m??0)||0,0,5000);
  const height=clamp(Number(p.render_height_m??p.height_m??p.height??p.building_height_m??9)||9,3,1000);
  const roofHeight=clamp(Number(p.roof_height_m??.35)||.35,.15,80);
  const facade=Cesium.Color.fromCssColorString(colorForMaterial(p.facade_material||p.building_material));
  const roof=Cesium.Color.fromCssColorString(roofColor(p.roof_material));
  const bodyCount=addPolygonEntities(buildingSource,geometry,{
    height:base,extrudedHeight:base+height,
    heightReference:Cesium.HeightReference.CLAMP_TO_GROUND,
    extrudedHeightReference:Cesium.HeightReference.RELATIVE_TO_GROUND,
    material:facade.withAlpha(.96),outline:true,outlineColor:Cesium.Color.fromCssColorString('#d8edf2').withAlpha(.22)
  },p,'BUILDING');
  if(bodyCount) {
    for(const polygon of ringsOf(geometry)){
      const hierarchy=polygonHierarchy(polygon);if(!hierarchy)continue;
      const cap=buildingSource.entities.add({polygon:{
        hierarchy,height:base+height,extrudedHeight:base+height+roofHeight,
        heightReference:Cesium.HeightReference.RELATIVE_TO_GROUND,
        extrudedHeightReference:Cesium.HeightReference.RELATIVE_TO_GROUND,
        material:roof.withAlpha(.98),outline:false
      }});
      entityFeature(cap,p,'ROOF');
    }
  }
  return bodyCount;
}
function addPublicTileFeatures(tile,sourceLayer,x,y,z) {
  const layer=tile?.layers?.[sourceLayer];if(!layer)return 0;
  let count=0;
  for(let i=0;i<Math.min(layer.length,180);i++){
    const feature=layer.feature(i),geometry=tileFeatureGeometry(feature,x,y,z);
    if(!geometry)continue;
    count+=addBuilding({geometry,properties:feature.properties||{}});
    if(count>=130)break;
  }
  return count;
}
async function loadPublicBuildings(bounds,height) {
  if(!VectorTile||!Pbf)return 0;
  const c=pointInView(),z=buildingZoomForHeight(height),center=tileXY(c.lon,c.lat,z),n=2**z;
  const offsets=mobile?[[0,0],[1,0],[-1,0],[0,1],[0,-1]]:[[0,0],[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1]];
  let total=0;
  for(let i=0;i<offsets.length;i+=2){
    const batch=await Promise.allSettled(offsets.slice(i,i+2).map(async([dx,dy])=>{
      const x=(center.x+dx+n)%n,y=clamp(center.y+dy,0,n-1);
      const url=EDGE+'bridgepoint-public-building-tile-v5019?z='+z+'&x='+x+'&y='+y+'&limit='+(mobile?450:850);
      const response=await fetch(url,{headers:headers(),cache:'no-store'});
      if(!response.ok)throw new Error('BridgePoint building tile '+response.status);
      const tile=new VectorTile(new Pbf(new Uint8Array(await response.arrayBuffer())));
      return {tile,x,y,z};
    }));
    for(const item of batch){
      if(item.status!=='fulfilled')continue;
      total+=addPublicTileFeatures(item.value.tile,'buildings',item.value.x,item.value.y,item.value.z);
    }
  }
  if(!total){
    const cUrl=EDGE+'bridgepoint-public-city-structures-v5375?z='+z+'&x='+center.x+'&y='+center.y+'&limit='+(mobile?300:500);
    try{
      const response=await fetch(cUrl,{headers:headers(),cache:'no-store'});
      if(response.ok){
        const tile=new VectorTile(new Pbf(new Uint8Array(await response.arrayBuffer())));
        total+=addPublicTileFeatures(tile,'buildings',center.x,center.y,z);
      }
    }catch(error){console.warn('BridgePoint city-structure fallback',error)}
  }
  return total;
}
async function loadBuildings(bounds,height,seq) {
  if(height>1200000){buildingSource.entities.removeAll();return 0}
  let features=[];
  try{
    const data=await requestEarthRpc('bridgepoint_building_viewport_v2300',{
      p_min_lat:bounds.south,p_max_lat:bounds.north,
      p_min_lng:bounds.west,p_max_lng:bounds.east,
      p_limit:mobile?420:850
    },4800);
    if(seq!==state.dataSeq)return 0;
    features=Array.isArray(data?.features)?data.features:[];
  }catch(error){console.info('BridgePoint viewport request timed out or unavailable; switching to public building tiles.',error?.message||error)}
  if(seq!==state.dataSeq)return 0;
  buildingSource.entities.removeAll();
  let count=0;
  for(const feature of features.slice(0,mobile?420:850))count+=addBuilding(feature);
  if(count)return count;
  try{return await loadPublicBuildings(bounds,height)}catch(error){console.warn('BridgePoint public building stream unavailable.',error);return 0}
}
async function loadParcels(bounds,height,seq) {
  parcelSource.entities.removeAll();
  if(height>90000)return 0;
  try{
    const zoom=clamp(19-Math.log2(Math.max(1000,height)/1000),7,19);
    const data=await rpc('bridgepoint_public_global_parcels_bbox_v957',{
      p_min_lng:bounds.west,p_min_lat:bounds.south,p_max_lng:bounds.east,p_max_lat:bounds.north,
      p_zoom:zoom,p_limit:mobile?550:1100
    },8000);
    if(seq!==state.dataSeq)return 0;
    const features=Array.isArray(data?.features)?data.features:[];
    let count=0;
    for(const f of features.slice(0,mobile?550:1100)){
      const geometry=f.geometry||f.geometry_geojson;
      const props=f.properties||{};
      for(const polygon of ringsOf(geometry)){
        const hierarchy=polygonHierarchy(polygon);if(!hierarchy)continue;
        const e=parcelSource.entities.add({polyline:{positions:hierarchy.positions,width:1.3,material:Cesium.Color.fromCssColorString('#70edce').withAlpha(.9),clampToGround:true}});
        entityFeature(e,props,'PARCEL');
        count++;
      }
    }
    return count;
  }catch(error){console.warn('BridgePoint parcel viewport unavailable.',error);return 0}
}
async function loadLivingCatalog() {
  if(state.catalog)return state.catalog;
  try{state.catalog=await rpc('bridgepoint_living_world_catalog_v2652',{},9000);return state.catalog}
  catch(error){console.info('Signed-in living-world catalog not available in this session.',error?.message||error);return null}
}
async function loadLivingWorld(bounds,height,seq) {
  livingSource.entities.removeAll();
  if(height>260000)return 0;
  const catalog=await loadLivingCatalog();
  if(seq!==state.dataSeq)return 0;
  if(!catalog||catalog.locked)return 0;
  const preferred=new Set([
    'BASE_INFRASTRUCTURE','TRANSPORT_NETWORK_DETAIL','SURFACE_MATERIAL_FINE',
    'TREE_OBJECTS_3D','ROCKS_BOULDERS_CLIFFS','BARRIERS_WALLS_FENCES',
    'POOLS_PROPERTY_WATER','ROOFTOP_SOLAR_DETAIL','PROPERTY_IMPROVEMENTS_FINE',
    'LANDMARK_OBJECTS_FINE','TUNNELS_UNDERPASSES','TRANSIT_LIVE',
    'LIGHTNING','EARTHQUAKES','FIRE_ACTIVE','SMOKE_PLUMES'
  ]);
  const layers=(catalog.layers||[]).filter(layer=>preferred.has(layer.layer_key)&&(!layer.restricted||layer.owner_access)).map(layer=>layer.layer_key);
  if(!layers.length)return 0;
  try{
    const result=await rpc('bridgepoint_living_world_scene_v2652',{
      p_west:bounds.west,p_south:bounds.south,p_east:bounds.east,p_north:bounds.north,
      p_layer_keys:layers,p_at:new Date().toISOString(),p_limit:mobile?350:800
    },12000);
    if(seq!==state.dataSeq)return 0;
    if(result?.locked)return 0;
    let count=0;
    for(const row of result?.assets||[]){
      if(count>350)break;
      const geometry=row.geometry_geojson||row.geometry||null;
      const key=String(row.layer_key||'');
      const color=key.includes('TREE')?'#4d8b50':(key.includes('WATER')?'#48bfe0':(key.includes('SOLAR')?'#d5c06a':'#7ad7d1'));
      if(key==='TREE_OBJECTS_3D'&&geometry?.type==='Point'){
        const c=geometry.coordinates,h=clamp(Number(row.height_m||row.properties?.height_m||8),3,35);
        const trunk=livingSource.entities.add({position:Cesium.Cartesian3.fromDegrees(c[0],c[1],h/2),cylinder:{length:h,bottomRadius:.14,topRadius:.08,material:Cesium.Color.fromCssColorString('#70513a'),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,9000)}});
        entityFeature(trunk,{...row,truth_class:row.truth_class||'SOURCE_BACKED'},'TREE');
        const crown=livingSource.entities.add({position:Cesium.Cartesian3.fromDegrees(c[0],c[1],h*.84),ellipsoid:{radii:new Cesium.Cartesian3(h*.2,h*.2,h*.24),material:Cesium.Color.fromCssColorString(color).withAlpha(.95),distanceDisplayCondition:new Cesium.DistanceDisplayCondition(0,9000)}});
        entityFeature(crown,row,'TREE');count+=2;
      }else{
        count+=attachGeometry(livingSource,geometry,{material:Cesium.Color.fromCssColorString(color).withAlpha(.75),width:2,pixelSize:8,height:0},row,key||'LIVING_WORLD');
      }
    }
    for(const row of result?.observations||[]){
      if(row.temporal_status!=='CURRENT')continue;
      const geometry=row.geometry_geojson||row.geometry;
      count+=attachGeometry(livingSource,geometry,{material:Cesium.Color.fromCssColorString('#ffe18a'),width:2,pixelSize:9},row,'CURRENT_OBSERVATION');
    }
    return count;
  }catch(error){console.warn('BridgePoint living-world stream unavailable.',error);return 0}
}
function weatherColor(kind) {
  const k=String(kind||'').toLowerCase();
  if(k.includes('tornado'))return '#c28aff';
  if(k.includes('hurricane')||k.includes('storm'))return '#7f9cff';
  if(k.includes('fire')||k.includes('wildfire'))return '#ff714b';
  if(k.includes('flood')||k.includes('water'))return '#62c8ff';
  if(k.includes('snow')||k.includes('ice'))return '#d7f5ff';
  if(k.includes('lightning')||k.includes('hail'))return '#ffe07e';
  return '#80dff1';
}
async function loadWeather(bounds,height,seq) {
  weatherSource.entities.removeAll();
  if(height>6500000)return 0;
  try{
    const data=await edge('bridgepoint-world-effects-v2190',{
      west:bounds.west,south:bounds.south,east:bounds.east,north:bounds.north,
      zoom:clamp(16-Math.log2(Math.max(1000,height)/1000),1,18),modes:['all']
    },14500);
    if(seq!==state.dataSeq)return 0;
    let count=0;
    for(const group of ['alerts','fires','burn_scars']){
      for(const row of (data?.[group]||[]).slice(0,60)){
        const geometry=row.geometry||row.geojson||row.geometry_geojson;
        if(!geometry)continue;
        const props=row.properties||row;
        const color=Cesium.Color.fromCssColorString(weatherColor(props.event||props.kind||group));
        count+=addPolygonEntities(weatherSource,geometry,{height:40,material:color.withAlpha(.22),outline:true,outlineColor:color.withAlpha(.9),heightReference:Cesium.HeightReference.RELATIVE_TO_GROUND,extrudedHeightReference:Cesium.HeightReference.RELATIVE_TO_GROUND}, {...props,source:props.source||'BridgePoint live source'},'WEATHER_SHAPE');
        count+=addPolylineEntities(weatherSource,geometry,{width:2.1,material:color.withAlpha(.95)},props,'WEATHER_BOUNDARY');
      }
    }
    const pointGroups=['earthquakes','storms','thermal','observations','lightning','water_levels'];
    for(const group of pointGroups){
      for(const row of (data?.[group]||[]).slice(0,70)){
        const lon=Number(row.lng??row.longitude),lat=Number(row.lat??row.latitude);
        if(!Number.isFinite(lon)||!Number.isFinite(lat))continue;
        const color=Cesium.Color.fromCssColorString(weatherColor(row.kind||row.event||group));
        const e=weatherSource.entities.add({
          position:Cesium.Cartesian3.fromDegrees(lon,lat,Math.max(0,Number(row.altitude_m||0))),
          point:{pixelSize:group==='storms'?11:8,color,outlineColor:Cesium.Color.fromCssColorString('#07131c'),outlineWidth:2,disableDepthTestDistance:30000}
        });
        entityFeature(e,{...row,source:row.source||'BridgePoint live source'},'LIVE_'+group.toUpperCase());count++;
      }
    }
    return count;
  }catch(error){console.warn('BridgePoint live weather stream unavailable.',error);return 0}
}
function displayCounts() {
  const count=state.buildingCount+state.parcelCount+state.livingCount+state.weatherCount;
  $('data-state').textContent=count?count.toLocaleString()+' FEATURES':'LIVE / ZOOM TO DETAIL';
  $('terrain-state').textContent=state.vectorReady?'TERRAIN · RIVERS · LABELS':'OPEN ELEVATION';
  $('imagery-state').textContent='NASA / POLE-TO-POLE';
}
async function refreshIntelligence(force=false) {
  const bounds=currentBounds();if(!bounds)return;
  const height=cameraHeight(),center=pointInView();
  const key=[center.lon,center.lat,height].map(x=>Number(x).toFixed(2)).join(':')+
    ':'+[bounds.west,bounds.south,bounds.east,bounds.north].map(x=>Number(x).toFixed(3)).join(':');
  if(!force&&key===state.lastKey)return;
  state.lastKey=key;const seq=++state.dataSeq;
  status(height>1200000?'GLOBAL EARTH · LOCAL DATA READY':'SYNCING BRIDGEPOINT SOURCES','normal');
  if(height<=1200000){
    const [buildings,parcels,living]=await Promise.all([
      loadBuildings(bounds,height,seq),loadParcels(bounds,height,seq),loadLivingWorld(bounds,height,seq)
    ]);
    if(seq!==state.dataSeq)return;
    state.buildingCount=buildings;state.parcelCount=parcels;state.livingCount=living;
  }else{
    buildingSource.entities.removeAll();parcelSource.entities.removeAll();livingSource.entities.removeAll();
    state.buildingCount=0;state.parcelCount=0;state.livingCount=0;
  }
  if(height<=6500000){
    const wx=await loadWeather(bounds,height,seq);
    if(seq!==state.dataSeq)return;
    state.weatherCount=wx;state.lastWeather=Date.now();
  }else{weatherSource.entities.removeAll();state.weatherCount=0}
  displayCounts();
  status(height<=1200000?'BRIDGEPOINT DATA SYNCHRONIZED':'EARTH ONLINE · DATA STREAMS RESOLVE ON ZOOM');
  scene.requestRender();
}
function showFeature(feature) {
  if(!feature)return;
  const props=feature.bridgepoint||{};
  const kind=feature.bridgepointKind||'EARTH FEATURE';
  const title=props.full_address||props.address||props.name||props.display_name||props.event||kind.replaceAll('_',' ');
  $('feature-type').textContent=kind.replaceAll('_',' ')+' / SOURCE-AWARE';
  $('feature-title').textContent=String(title||'Selected feature');
  $('feature-summary').textContent=String(props.description||props.explanation||props.event||props.classification||'Selected geographic feature from a connected world source.');
  const meta=$('feature-meta');meta.replaceChildren();
  const rows=[
    ['Source',props.source||props.source_name||props.source_key||'BridgePoint'],
    ['Truth class',props.truth_class||props.height_truth||props.truth||'SOURCE_BACKED'],
    ['Feature ID',props.building_id||props.property_id||props.feature_id||props.id||'—'],
    ['Height',props.render_height_m||props.height_m?String(props.render_height_m||props.height_m)+' m':'—'],
    ['Updated',props.observed_at||props.updated_at||props.generated_at||'—']
  ];
  for(const [label,value] of rows){
    const dt=document.createElement('dt'),dd=document.createElement('dd');
    dt.textContent=label;dd.textContent=String(value);meta.append(dt,dd);
  }
  $('feature-card').hidden=false;
  const lng=Number(props.longitude??props.lng),lat=Number(props.latitude??props.lat);
  if(Number.isFinite(lng)&&Number.isFinite(lat)) void loadPublicPropertyDetail(lng,lat);
}
async function loadPublicPropertyDetail(lon,lat) {
  try{
    const detail=await requestEarthRpc('bridgepoint_public_global_property_detail_v957',{p_lng:lon,p_lat:lat,p_radius_m:140},4200);
    if(!detail||$('feature-card').hidden)return;
    const meta=$('feature-meta');
    for(const [label,value] of [['Matched properties',detail.property_count??detail.total_properties],['Direct source records',detail.direct_source_count],['Signals',detail.signal_count]]){
      if(value===undefined||value===null)continue;
      const dt=document.createElement('dt'),dd=document.createElement('dd');
      dt.textContent=label;dd.textContent=String(value);meta.append(dt,dd);
    }
  }catch(_){}
}
viewer.screenSpaceEventHandler.setInputAction(movement=>{
  const picked=scene.pick(movement.position);
  const entity=picked?.id;
  if(entity?.bridgepoint)showFeature(entity);
},Cesium.ScreenSpaceEventType.LEFT_CLICK);
$('feature-close').addEventListener('click',()=>$('feature-card').hidden=true);
$('zoom-in').addEventListener('click',()=>viewer.camera.zoomIn(Math.max(120,cameraHeight()*.28)));
$('zoom-out').addEventListener('click',()=>viewer.camera.zoomOut(Math.max(120,cameraHeight()*.32)));
$('home-view').addEventListener('click',()=>viewer.camera.flyTo({
  destination:Cesium.Cartesian3.fromDegrees(-18,27,17800000),
  orientation:{heading:0,pitch:Cesium.Math.toRadians(-72),roll:0},duration:1.1
}));
$('my-location').addEventListener('click',()=>{
  if(!navigator.geolocation){status('LOCATION NOT AVAILABLE','warn');return}
  navigator.geolocation.getCurrentPosition(position=>{
    viewer.camera.flyTo({destination:Cesium.Cartesian3.fromDegrees(position.coords.longitude,position.coords.latitude,18000),
      orientation:{heading:0,pitch:Cesium.Math.toRadians(-58),roll:0},duration:1.2});
  },()=>status('LOCATION PERMISSION NOT GRANTED','warn'),{enableHighAccuracy:true,timeout:9000,maximumAge:60000});
});
const cameraChanged=()=>{clearTimeout(dataTimer);clearTimeout(surfaceTimer);dataTimer=setTimeout(()=>void refreshIntelligence(false),420);surfaceTimer=setTimeout(()=>void refreshSurface(),650)};
let dataTimer=0,surfaceTimer=0;
viewer.camera.moveEnd.addEventListener(cameraChanged);
viewer.scene.globe.tileLoadProgressEvent.addEventListener(remaining=>{
  if(remaining===0){
    const loading=$('earth-loading');
    if(loading)loading.classList.add('done');
  }
});
setTimeout(()=>{$('earth-loading')?.classList.add('done');status('EARTH ONLINE · SOURCE STREAMS READY')},2600);
setTimeout(()=>{void refreshSurface();void refreshIntelligence(true)},700);
setInterval(()=>{if(!document.hidden){state.lastKey='';void refreshIntelligence(true)}},90000);
window.addEventListener('resize',()=>{try{viewer.resize()}catch(_){}});
window.__BP_EARTH_READY__=true;
window.__BP_EARTH_WORLD__={
  version:2,viewer,terrain:'OPEN_TERRARIUM_HEIGHTMAP',imagery:'NASA_GIBS_BLUE_MARBLE_EPSG4326',
  dataSources:{buildings:buildingSource,parcels:parcelSource,living:livingSource,weather:weatherSource,places:placeSource,waterways:waterSource},
  refresh:()=>refreshIntelligence(true),refreshSurface
};
state.ready=true;
displayCounts();
