const VERSION=5910;
const ROOT_ID='bp-gis-core-v5910';
const STYLE_ID='bp-gis-core-style-v5910';
const ACTIVITY_SOURCE='bp-world-activity-source-v5908';
const CAPABILITIES={
 SATELLITE_ANALYSIS:{label:'Satellite imagery & spectral analysis',status:'READY_WITH_LIMITS',pluginLogic:['STAC API Browser','Google Earth Engine','Point Sampling Tool','Value Tool'],services:['USGS/NASA Landsat Collection 2 Level-2','Microsoft Planetary Computer STAC'],notes:'Real Landsat scene query, false-color raster tiles, and preview export are connected. Landsat optical pixel size is about 30 m; this is not roof-level aerial imagery.'},
 PROPERTY_GROUND_TRUTH:{label:'Property/building ground truth',status:'PARTIAL',pluginLogic:['Get WKT','Coordinates Converter','Discovery','GeoParquet Downloader','Data-Driven Input Mask'],services:['OpenFreeMap / OpenStreetMap building context','BridgePoint public building tiles','building inspector'],notes:'Can select rendered buildings and use source-backed inspector facts available for that location. Exact parcel/roof/permit coverage varies by jurisdiction.'},
 WEATHER_HAZARDS:{label:'Weather and hazard observations',status:'PARTIAL',pluginLogic:['TUFLOW','UMEP','Terrain Shading','WhiteboxTools'],services:['BridgePoint public world activity feed','existing NOAA/NASA weather layers','DEM terrain layer'],notes:'Current source observations and map context are available. TUFLOW hydraulic simulation, UMEP microclimate modeling, and Whitebox batch analysis are not claimed unless separately configured and run.'},
 GEOMETRY_PROCESSING:{label:'Geometry and coordinate processing',status:'PARTIAL',pluginLogic:['Get WKT','Coordinates Converter','Coordinate Capture','Geometry Paster','Buffer by Percentage'],services:['GeoJSON/WKT conversion','MapLibre map projection'],notes:'GeoJSON-to-WKT, coordinate display and current map interactions are implemented in this browser route. CRS transformations requiring PROJ are not inferred.'},
 FIELD_INGEST:{label:'Field capture and ingestion',status:'NOT_CONFIGURED',pluginLogic:['Batch GPS Importer','QRealTime','GeoCoding','GarminCustomMap','GeoDataFarm'],services:[],notes:'No field server connection or ingestion credentials are assumed. Add an approved endpoint and schema before importing field records.'},
 ROUTING_ANALYSIS:{label:'Routing and service areas',status:'NOT_CONFIGURED',pluginLogic:['ORS Tools'],services:[],notes:'An OpenRouteService server-side key and request budget have not been configured; no route or isochrone is fabricated.'},
 EVIDENCE_AUDIT:{label:'Evidence provenance and report outputs',status:'PARTIAL',pluginLogic:['Layout Loader','Maps Printer','autoSaver','Bivariate Legend'],services:['append-only authenticated GIS event log','hash-linked audit events','source metadata'],notes:'The authenticated processing-event log is tamper-evident for app roles. It is not cryptographically immutable against privileged database administrators.'},
 REAL_WORLD_RENDERING:{label:'Real-world map and 3D materials',status:'READY_WITH_LIMITS',pluginLogic:['Globe Builder','HCMGIS','QuickOSM','Georeferencer Extension'],services:['USGS imagery','OpenAerialMap','NASA Blue Marble','source-tagged facade and roof material patterns'],notes:'Aerial availability varies by area. Patterned roofs/facades are material-inspired approximations, not photographs or verified building textures.'}
};
const TASK_CATALOG={
 SATELLITE_ANALYSIS:{capability:'SATELLITE_ANALYSIS',required_inputs:['bbox or current map viewport','composite (optional)','date window (optional)'],source_policy:'Return source item, acquisition date, scene cloud cover, RGB mapping and source attribution.'},
 PROPERTY_GROUND_TRUTH:{capability:'PROPERTY_GROUND_TRUTH',required_inputs:['coordinates or current map center'],source_policy:'Only report facts and geometry from current rendered/source-backed features. Missing parcel or roof truth remains missing.'},
 HAZARD_INTERSECTION:{capability:'WEATHER_HAZARDS',required_inputs:['GeoJSON geometry (recommended)','current viewport / selected time window'],source_policy:'Only intersect source-returned events currently loaded in the map. Result is not proof of physical damage.'},
 TERRAIN_ANALYSIS:{capability:'WEATHER_HAZARDS',required_inputs:['current map view','analysis mode'],source_policy:'Current task executes terrain/context checks only. Advanced hydrology/modeling is reported as not configured.'},
 GEOMETRY_WKT:{capability:'GEOMETRY_PROCESSING',required_inputs:['valid GeoJSON geometry','optional caller-supplied CRS'],source_policy:'WKT preserves supplied coordinates; it does not transform or validate the source CRS.'},
 COORDINATE_CONVERSION:{capability:'GEOMETRY_PROCESSING',required_inputs:['coordinates and format'],source_policy:'Decimal-degree and DMS conversion are supported. UTM transformation is not returned without a verified projection engine.'},
 FIELD_INGEST:{capability:'FIELD_INGEST',required_inputs:['input file/data','source type','approved connection reference'],source_policy:'Blocked until the remote ingestion endpoint and access policy are configured.'},
 ROUTING_ANALYSIS:{capability:'ROUTING_ANALYSIS',required_inputs:['origin','destination or service-area parameters','server-side provider configuration'],source_policy:'Blocked until a supported routing provider is configured. No synthetic route is drawn.'},
 EVIDENCE_EXPORT:{capability:'EVIDENCE_AUDIT',required_inputs:['source result or selected imagery','output format'],source_policy:'Image exports use the currently loaded satellite scene. A map screenshot is not an evidentiary source substitute.'},
 REAL_WORLD_RENDERING:{capability:'REAL_WORLD_RENDERING',required_inputs:[],source_policy:'Turns on published imagery layers and source-aware material-inspired 3D styling.'}
};
const CSS=`
#liveMap #${ROOT_ID}{position:absolute;z-index:23;left:12px;top:56px;width:min(342px,calc(100% - 24px));box-sizing:border-box;color:#eaf7ff;font:12px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;pointer-events:none}
#liveMap #${ROOT_ID} *{box-sizing:border-box}
#liveMap #${ROOT_ID} button,#liveMap #${ROOT_ID} select,#liveMap #${ROOT_ID} textarea{font:inherit;pointer-events:auto}
#liveMap #${ROOT_ID} button{border:1px solid rgba(104,208,240,.3);border-radius:8px;background:rgba(5,24,36,.96);color:#edfbff;padding:8px 10px;min-height:31px;font-weight:850;font-size:10px;cursor:pointer}
#liveMap #${ROOT_ID} button:hover{background:rgba(13,63,80,.97);border-color:#7de8ff}
#liveMap #${ROOT_ID} .bpg-trigger{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;text-align:left;box-shadow:0 8px 26px rgba(0,0,0,.35)}
#liveMap #${ROOT_ID} .bpg-trigger[aria-expanded=true]{border-color:#70e8ff;box-shadow:0 0 0 2px rgba(112,232,255,.12),0 8px 26px rgba(0,0,0,.35)}
#liveMap #${ROOT_ID} .bpg-panel{margin-top:7px;padding:11px;border:1px solid rgba(93,195,232,.35);border-radius:12px;background:linear-gradient(160deg,rgba(3,17,29,.98),rgba(4,30,43,.96));box-shadow:0 14px 38px rgba(0,0,0,.43);backdrop-filter:blur(13px) saturate(125%);-webkit-backdrop-filter:blur(13px) saturate(125%);pointer-events:auto}
#liveMap #${ROOT_ID} .bpg-panel[hidden]{display:none!important}
#liveMap #${ROOT_ID} .bpg-head{display:flex;justify-content:space-between;align-items:center;gap:8px}
#liveMap #${ROOT_ID} .bpg-kicker{font-size:9px;letter-spacing:.13em;color:#83e9ff;font-weight:950}
#liveMap #${ROOT_ID} .bpg-status{font-size:10px;font-weight:850;color:#9deccf;margin:7px 0}
#liveMap #${ROOT_ID} .bpg-status[data-error=true]{color:#ffc0a9}
#liveMap #${ROOT_ID} label{display:block;font-size:9px;letter-spacing:.07em;color:#a4c5d7;font-weight:850;margin:8px 0 4px}
#liveMap #${ROOT_ID} select,#liveMap #${ROOT_ID} textarea{width:100%;border:1px solid rgba(132,190,210,.32);border-radius:8px;background:#061e2d;color:#e9f8ff;padding:8px;box-sizing:border-box}
#liveMap #${ROOT_ID} textarea{min-height:75px;resize:vertical;font:10px/1.35 ui-monospace,SFMono-Regular,Consolas,monospace}
#liveMap #${ROOT_ID} .bpg-actions{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
#liveMap #${ROOT_ID} .bpg-actions button{flex:1 1 118px}
#liveMap #${ROOT_ID} .bpg-out{margin-top:8px;padding:8px;border-radius:8px;background:rgba(1,10,18,.68);max-height:155px;overflow:auto;white-space:pre-wrap;overflow-wrap:anywhere;font:9px/1.4 ui-monospace,SFMono-Regular,Consolas,monospace;color:#c6e4ef}
#liveMap #${ROOT_ID} .bpg-note{font-size:9px;line-height:1.45;color:#90afbd;margin-top:8px;border-top:1px solid rgba(126,189,211,.16);padding-top:7px}
@media(max-width:700px){#liveMap #${ROOT_ID}{left:8px;top:52px;width:min(305px,calc(100% - 16px))}#liveMap #${ROOT_ID} .bpg-panel{padding:9px}#liveMap #${ROOT_ID} .bpg-out{max-height:115px}}
`;
const esc=s=>String(s??'').replace(/[&<>"]/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
const uuid=()=>{try{return crypto.randomUUID()}catch(_){return 'bp-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,14)}};
function finitePair(value){return Array.isArray(value)&&value.length===2&&Number.isFinite(Number(value[0]))&&Number.isFinite(Number(value[1]))&&Math.abs(Number(value[0]))<=180&&Math.abs(Number(value[1]))<=90}
function wktNumber(n){const v=Number(n);if(!Number.isFinite(v))throw new Error('Coordinates must be finite numbers');return Object.is(v,-0)?'0':String(v)}
function pairWkt(p){if(!Array.isArray(p)||p.length<2)throw new Error('Invalid coordinate pair');return p.map(wktNumber).join(' ')}
function wktCoords(coords,type){
 if(type==='Point')return '('+pairWkt(coords)+')';
 if(type==='LineString')return '('+coords.map(pairWkt).join(', ')+')';
 if(type==='Polygon')return '('+coords.map(r=>'('+r.map(pairWkt).join(', ')+')').join(', ')+')';
 if(type==='MultiPoint')return '('+coords.map(p=>'('+pairWkt(p)+')').join(', ')+')';
 if(type==='MultiLineString')return '('+coords.map(l=>'('+l.map(pairWkt).join(', ')+')').join(', ')+')';
 if(type==='MultiPolygon')return '('+coords.map(poly=>'('+poly.map(r=>'('+r.map(pairWkt).join(', ')+')').join(', ')+')').join(', ')+')';
 if(type==='GeometryCollection')throw new Error('GeometryCollection WKT requires separately typed members; provide a single GeoJSON geometry.');
 throw new Error('Unsupported GeoJSON geometry type: '+type);
}
function geometryToWkt(geometry,crs){
 if(!geometry||typeof geometry!=='object'||!geometry.type)throw new Error('Provide a GeoJSON geometry object.');
 const body=wktCoords(geometry.coordinates,geometry.type);
 const sridMatch=String(crs||'').match(/(?:EPSG:)?(\d+)/i);
 return {wkt:geometry.type.toUpperCase().startsWith('MULTI')?geometry.type.toUpperCase()+' '+body:geometry.type.toUpperCase()+' '+body,ewkt:sridMatch?'SRID='+Number(sridMatch[1])+';'+geometry.type.toUpperCase()+' '+body:null,crs:crs||null,transformed:false,note:crs?'CRS is caller-supplied; coordinates were not transformed.':'No CRS supplied; coordinates preserved as received.'};
}
function toDms(value,isLat){
 const n=Number(value),abs=Math.abs(n),deg=Math.floor(abs),mf=(abs-deg)*60,min=Math.floor(mf),sec=(mf-min)*60,dir=isLat?(n<0?'S':'N'):(n<0?'W':'E');
 return {degrees:deg,minutes:min,seconds:Number(sec.toFixed(4)),hemisphere:dir,formatted:deg+'° '+min+'′ '+sec.toFixed(2)+'″ '+dir};
}
function dmsToDecimal(v,isLat){
 if(typeof v==='number'&&Number.isFinite(v))return v;
 if(typeof v==='object'&&v){
  const deg=Number(v.degrees??v.deg??0),min=Number(v.minutes??v.min??0),sec=Number(v.seconds??v.sec??0),h=String(v.hemisphere??v.direction??'').toUpperCase();
  if(![deg,min,sec].every(Number.isFinite)||min<0||min>=60||sec<0||sec>=60)throw new Error('Invalid DMS fields.');
  const out=(Math.abs(deg)+min/60+sec/3600)*((deg<0||['S','W'].includes(h))?-1:1);
  if(Math.abs(out)>(isLat?90:180))throw new Error('Converted coordinate is out of range.');
  return out;
 }
 if(typeof v==='string'){
  const m=v.trim().match(/^(-?\d+(?:\.\d+)?)\s*(?:°|d| )?\s*(?:(\d+(?:\.\d+)?)\s*(?:′|['m ])\s*)?(?:(\d+(?:\.\d+)?)\s*(?:″|["s])\s*)?([NSEW])?$/i);
  if(!m)throw new Error('DMS text is not recognized.');
  return dmsToDecimal({degrees:Number(m[1]),minutes:Number(m[2]||0),seconds:Number(m[3]||0),hemisphere:m[4]||''},isLat);
 }
 throw new Error('Provide numeric decimal degrees or DMS.');
}
function scrubJson(value,maxBytes=12000){
 try{
  const safe=value==null?{}:JSON.parse(JSON.stringify(value));
  const text=JSON.stringify(safe);
  return text.length<=maxBytes?safe:{truncated:true,original_chars:text.length,preview:text.slice(0,maxBytes-80)};
 }catch(_){return {omitted:'payload was not JSON serializable'}}
}
function pointInRing(point,ring){
 if(!Array.isArray(ring)||ring.length<3)return false;
 const x=Number(point[0]),y=Number(point[1]);let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const xi=+ring[i][0],yi=+ring[i][1],xj=+ring[j][0],yj=+ring[j][1];
  const cross=(x-xi)*(yj-yi)-(y-yi)*(xj-xi);
  if(Math.abs(cross)<1e-10&&x>=Math.min(xi,xj)-1e-10&&x<=Math.max(xi,xj)+1e-10&&y>=Math.min(yi,yj)-1e-10&&y<=Math.max(yi,yj)+1e-10)return true;
  const intersects=((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi||1e-30)+xi);
  if(intersects)inside=!inside;
 }
 return inside;
}
function pointInPolygon(point,poly){
 if(!Array.isArray(poly)||!poly.length||!pointInRing(point,poly[0]))return false;
 for(let i=1;i<poly.length;i++)if(pointInRing(point,poly[i]))return false;
 return true;
}
function pointInGeometry(point,g){
 if(!g)return false;
 if(g.type==='Polygon')return pointInPolygon(point,g.coordinates);
 if(g.type==='MultiPolygon')return (g.coordinates||[]).some(poly=>pointInPolygon(point,poly));
 if(g.type==='Point')return Math.abs(point[0]-g.coordinates[0])<1e-8&&Math.abs(point[1]-g.coordinates[1])<1e-8;
 if(g.type==='MultiPoint')return (g.coordinates||[]).some(p=>Math.abs(point[0]-p[0])<1e-8&&Math.abs(point[1]-p[1])<1e-8);
 return false;
}
function segmentsIntersect(a,b,c,d){
 const orient=(p,q,r)=>(q[0]-p[0])*(r[1]-p[1])-(q[1]-p[1])*(r[0]-p[0]);
 const on=(p,q,r)=>Math.abs(orient(p,q,r))<1e-10&&q[0]>=Math.min(p[0],r[0])-1e-10&&q[0]<=Math.max(p[0],r[0])+1e-10&&q[1]>=Math.min(p[1],r[1])-1e-10&&q[1]<=Math.max(p[1],r[1])+1e-10;
 const o1=orient(a,b,c),o2=orient(a,b,d),o3=orient(c,d,a),o4=orient(c,d,b);
 if(((o1>0&&o2<0)||(o1<0&&o2>0))&&((o3>0&&o4<0)||(o3<0&&o4>0)))return true;
 return on(a,c,b)||on(a,d,b)||on(c,a,d)||on(c,b,d);
}
function ringsIntersect(a,b){
 if(!Array.isArray(a)||!Array.isArray(b))return false;
 for(let i=0;i<a.length-1;i++)for(let j=0;j<b.length-1;j++)if(segmentsIntersect(a[i],a[i+1],b[j],b[j+1]))return true;
 return false;
}
function polygonsIntersect(a,b){
 const ar=a?.[0]||[],br=b?.[0]||[];
 if(ar.some(p=>pointInPolygon(p,b)))return true;
 if(br.some(p=>pointInPolygon(p,a)))return true;
 return ar.length>1&&br.length>1&&ringsIntersect(ar,br);
}
function spatialHit(targetGeom,eventGeom){
 if(!targetGeom||!eventGeom)return false;
 if(eventGeom.type==='Point')return pointInGeometry(eventGeom.coordinates,targetGeom);
 if(eventGeom.type==='MultiPoint')return eventGeom.coordinates.some(p=>pointInGeometry(p,targetGeom));
 if(['Polygon','MultiPolygon'].includes(targetGeom.type)&&['Polygon','MultiPolygon'].includes(eventGeom.type)){
  const targets=targetGeom.type==='Polygon'?[targetGeom.coordinates]:targetGeom.coordinates;
  const events=eventGeom.type==='Polygon'?[eventGeom.coordinates]:eventGeom.coordinates;
  return targets.some(a=>events.some(b=>polygonsIntersect(a,b)));
 }
 if(['Polygon','MultiPolygon'].includes(eventGeom.type)&&['Point','MultiPoint'].includes(targetGeom.type)){
  const points=targetGeom.type==='Point'?[targetGeom.coordinates]:targetGeom.coordinates;
  return points.some(p=>pointInGeometry(p,eventGeom));
 }
 if(eventGeom.type==='LineString'&&['Polygon','MultiPolygon'].includes(targetGeom.type)){
  const polys=targetGeom.type==='Polygon'?[targetGeom.coordinates]:targetGeom.coordinates;
  return polys.some(poly=>eventGeom.coordinates.some((p,i,arr)=>i>0&&ringsIntersect([arr[i-1],p],[...poly[0],poly[0][0]])));
 }
 return false;
}
export function initGisCore(target,rpc){
 const map=target?.map||target,container=map?.getContainer?.();
 if(!map||!container)return null;
 if(window.__BP_GIS_CORE_V5910__?.map===map)return window.__BP_GIS_CORE_V5910__;
 if(container.querySelector('#'+ROOT_ID))return window.__BP_GIS_CORE_V5910__||null;
 if(getComputedStyle(container).position==='static')container.style.position='relative';
 if(!document.getElementById(STYLE_ID)){const st=document.createElement('style');st.id=STYLE_ID;st.textContent=CSS;document.head.appendChild(st)}
 const root=document.createElement('section');root.id=ROOT_ID;root.setAttribute('aria-label','BridgePoint GIS Core Orchestration Engine');
 root.innerHTML=
  '<button class="bpg-trigger" type="button" data-toggle aria-expanded="false"><span>⌘ GIS CORE · TASK ROUTER</span><span data-indicator>READY</span></button>'+
  '<div class="bpg-panel" data-panel hidden><div class="bpg-head"><span class="bpg-kicker">BRIDGEPOINT GIS CORE · V5910</span><button type="button" data-close aria-label="Collapse GIS Core">×</button></div>'+
  '<label for="bp-gis-task-v5910">TASK TYPE</label><select id="bp-gis-task-v5910" data-task>'+
  '<option value="SATELLITE_ANALYSIS">Satellite / false-color imagery</option><option value="PROPERTY_GROUND_TRUTH">Property / building ground truth</option><option value="HAZARD_INTERSECTION">Hazard ↔ property intersection</option><option value="TERRAIN_ANALYSIS">Terrain / elevation context</option><option value="GEOMETRY_WKT">GeoJSON → WKT / EWKT</option><option value="COORDINATE_CONVERSION">Decimal degrees ↔ DMS</option><option value="FIELD_INGEST">GPS / field ingestion</option><option value="ROUTING_ANALYSIS">Routing / isochrones</option><option value="EVIDENCE_EXPORT">Evidence / imagery export</option><option value="REAL_WORLD_RENDERING">Real-world 3D realism</option></select>'+
  '<label for="bp-gis-input-v5910">TASK INPUT JSON</label><textarea id="bp-gis-input-v5910" data-input spellcheck="false">{}</textarea>'+
  '<div class="bpg-actions"><button type="button" data-run>ROUTE TASK</button><button type="button" data-caps>CAPABILITY STATUS</button><button type="button" data-history>MY AUDIT HISTORY</button></div>'+
  '<div class="bpg-status" data-status>Waiting for a task.</div><pre class="bpg-out" data-output>Command output will appear here.</pre>'+
  '<div class="bpg-note">Only implemented operations run. Missing data/providers return explicit blocked or partial states. Signed-in users can write hash-linked audit events; public-only sessions cannot write an authenticated audit record.</div></div>';
 container.appendChild(root);
 const $=s=>root.querySelector(s),toggle=$('[data-toggle]'),panel=$('[data-panel]'),task=$('[data-task]'),input=$('[data-input]'),status=$('[data-status]'),output=$('[data-output]'),indicator=$('[data-indicator]');
 const authRpc=()=>typeof window.__BP_OWNER_AUTH_RPC_V5910__==='function'?window.__BP_OWNER_AUTH_RPC_V5910__:(typeof window.__BP_OWNER_AUTH_RPC__==='function'?window.__BP_OWNER_AUTH_RPC__:null);
 let activeRun=null,disposed=false;
 const api={version:VERSION,map,catalog:CAPABILITIES,tasks:TASK_CATALOG,route,capabilities:()=>capabilityReport(),readAuditHistory,destroy(){disposed=true;root.remove()}};
 window.__BP_GIS_CORE_V5910__=api;
 function showResult(result,error=false){
  status.textContent=(result.status||'UNKNOWN').replaceAll('_',' ')+(result.audit?.recorded?' · AUDIT HASHED':'');
  status.dataset.error=error?'true':'false';indicator.textContent=error?'CHECK':'READY';
  output.textContent=JSON.stringify(result,null,2);
 }
 function capabilityReport(){
  return {engine:'BridgePoint GIS Core Orchestration Engine',version:VERSION,mode:'source-verified / explicitly capability-gated',
   capabilities:Object.entries(CAPABILITIES).map(([key,v])=>({key,...v,active:activeCapability(key)})),
   task_types:Object.keys(TASK_CATALOG),audit:{appendOnlyForClientRoles:true,hashLinked:true,authenticatedOnly:true,cryptographicallyImmutableAgainstPrivilegedDatabaseActors:false},
   updated_at:new Date().toISOString()};
 }
 function activeCapability(key){
  if(key==='SATELLITE_ANALYSIS')return !!window.__BP_SPECTRAL_IMAGERY_V5909__?.available;
  if(key==='PROPERTY_GROUND_TRUTH')return !!target?.selectBuildingAtPoint;
  if(key==='WEATHER_HAZARDS')return !!window.__BP_WORLD_TIME_SLIDER_V5908__&&!!window.__BP_WORLD_ACTIVITY_SLIDER_STATE_V5908__;
  if(key==='GEOMETRY_PROCESSING')return true;
  if(key==='REAL_WORLD_RENDERING')return !!window.__BP_WORLD_REALISM_V5910__;
  if(key==='EVIDENCE_AUDIT')return !!authRpc();
  return false;
 }
 function parseInput(raw){
  try{const v=JSON.parse(raw||'{}');if(!v||typeof v!=='object'||Array.isArray(v))throw new Error('Task input must be a JSON object.');return v}
  catch(e){throw new Error('Invalid JSON: '+(e?.message||e))}
 }
 async function recordAudit(result,taskType,payload,sourceRefs){
  const call=authRpc();
  if(!call)return {recorded:false,reason:'Authenticated audit RPC unavailable'};
  try{
   const safeInput=scrubJson(payload,8000);
   const safeResult=scrubJson({status:result.status,message:result.message,operation:result.operation,source_count:sourceRefs.length,metrics:result.metrics||{}},8000);
   const recorded=await call('bridgepoint_gis_record_processing_event_v5910',{
    p_run_id:result.run_id,p_operation_key:taskType,p_status:String(result.status||'partial').toLowerCase(),
    p_input_manifest:safeInput,p_result_manifest:safeResult,p_source_refs:sourceRefs.slice(0,40)
   },4500);
   return {recorded:true,event_id:recorded?.event_id||recorded?.id||null,event_hash:recorded?.event_hash||null,previous_hash:recorded?.previous_hash||null};
  }catch(e){return {recorded:false,reason:String(e?.message||e).slice(0,220)}}
 }
 async function readAuditHistory(limit=20){
  const call=authRpc();
  if(!call)throw new Error('Sign in to read your private GIS processing audit history.');
  return await call('bridgepoint_gis_processing_history_v5910',{p_limit:Math.max(1,Math.min(100,Number(limit)||20))},5000);
 }
 async function route(command){
  const type=String(command?.task_type||command?.operation_key||'').toUpperCase();
  const payload=command?.payload&&typeof command.payload==='object'?command.payload:{};
  const spec=TASK_CATALOG[type];
  const runId=String(command?.run_id||uuid()),start=performance.now();
  if(!spec){
   const result={engine:'BridgePoint GIS Core',version:VERSION,run_id:runId,operation:type||null,status:'blocked',message:'Unknown task type; no operation was executed.',supported_task_types:Object.keys(TASK_CATALOG),updated_at:new Date().toISOString()};
   return result;
  }
  const sourceRefs=[],warnings=[],metrics={};let statusValue='completed',message='',data={};
  try{
   switch(type){
    case 'SATELLITE_ANALYSIS':{
     const sat=window.__BP_SPECTRAL_IMAGERY_V5909__;
     if(!sat?.available||typeof sat.load!=='function')throw Object.assign(new Error('Satellite module is not ready; wait for the map to finish loading.'),{routeStatus:'blocked'});
     if(payload.composite&&['earth','water','vegetation'].includes(payload.composite)&&sat.root?.querySelector('[data-combo]'))sat.root.querySelector('[data-combo]').value=payload.composite;
     data=await sat.load();
     if(!data&&window.__BP_SPECTRAL_IMAGERY_V5909__?.loading)message='Satellite scene search started; check the satellite panel for source-reported status.';
     else message='Requested a real Landsat scene for the current map viewport.';
     sourceRefs.push({source_key:'LANDSAT_C2_L2',url:'https://planetarycomputer.microsoft.com/api/stac/v1/search',observed_at:window.__BP_SPECTRAL_IMAGERY_V5909__?.selectedAt||null});
     break;
    }
    case 'PROPERTY_GROUND_TRUTH':{
     let coords=payload.coordinates||payload.coordinate;
     if(!coords){const p=map.getCenter();coords=[p.lng,p.lat]}
     if(!finitePair(coords))throw new Error('Provide coordinates as [longitude, latitude], or omit them to use the current map center.');
     coords=[Number(coords[0]),Number(coords[1])];
     const zoom=Number(payload.zoom||16.8);
     if(map.getZoom()<Math.max(15.5,zoom-0.2)||Math.abs(map.getCenter().lng-coords[0])>0.03||Math.abs(map.getCenter().lat-coords[1])>0.03){
      map.easeTo({center:coords,zoom:Math.max(15.5,Math.min(19.2,zoom)),pitch:Math.max(40,Math.min(68,map.getPitch()||58)),duration:450});
      await new Promise(resolve=>{let done=false;const fin=()=>{if(done)return;done=true;map.off('idle',fin);resolve()};map.once('idle',fin);setTimeout(fin,1600)});
     }
     const point=map.project(coords),ids=['gta-exact-building','gta-bp-buildings','gta-city-buildings','gta-context-buildings'].filter(id=>map.getLayer(id)&&(map.getLayoutProperty(id,'visibility')||'visible')!=='none');
     let found=[];try{found=map.queryRenderedFeatures(point,{layers:ids})||[]}catch(_){}
     if(!found.length)throw Object.assign(new Error('No rendered building was found at that coordinate. Move closer, allow tiles to load, or select a visible building manually.'),{routeStatus:'partial'});
     const clicked=target.selectBuildingAtPoint?.(point);
     const f=found[0],props=f.properties||{};
     data={selected:!!clicked,coordinate:coords,layer:f.layer?.id||null,source_layer:f.sourceLayer||null,source_id:f.source||null,feature_id:f.id??null,available_attributes:Object.keys(props).filter(k=>props[k]!=null).slice(0,60),truth_note:'These are rendered/source attributes only. Selection does not establish ownership, damage, parcel truth, or exact roof truth.'};
     sourceRefs.push({source_key:String(f.source||'MAP_BUILDING_FEATURE'),layer:String(f.layer?.id||''),feature_id:f.id==null?null:String(f.id),source_layer:f.sourceLayer||null});
     message='Selected a currently rendered building and opened the available inspector. Attributes listed are not a claim that every property record is verified.';
     statusValue='partial';
     break;
    }
    case 'HAZARD_INTERSECTION':{
     const geom=payload.geometry||(finitePair(payload.coordinates)?{type:'Point',coordinates:payload.coordinates}:null);
     if(!geom)throw Object.assign(new Error('Provide a GeoJSON geometry or coordinates. A polygon is best for parcel exposure; coordinates tests point exposure.'),{routeStatus:'blocked'});
     const feed=window.__BP_WORLD_TIME_SLIDER_V5908__;
     if(feed?.refresh)await feed.refresh();
     let feats=[];try{feats=map.querySourceFeatures(ACTIVITY_SOURCE)||[]}catch(_){}
     const unique=new Map();for(const f of feats){const id=String(f.id??f.properties?.event_id??f.properties?.event_key??JSON.stringify(f.geometry));if(!unique.has(id))unique.set(id,f)}
     const matches=[...unique.values()].filter(f=>spatialHit(geom,f.geometry));
     data={geometry_type:geom.type,source_events_checked:unique.size,intersecting_events:matches.length,events:matches.slice(0,100).map(f=>({id:f.id??f.properties?.event_id??null,event_type:f.properties?.event_type_key||f.properties?.family_key||null,observed_at:f.properties?.observed_at||f.properties?.event_time||f.properties?.valid_time||null,source_url:f.properties?.source_url||f.properties?.source_url_safe||null,geometry_type:f.geometry?.type||null})),observation_window:window.__BP_WORLD_ACTIVITY_SLIDER_STATE_V5908__?.selectedAt||null};
     if(!unique.size){statusValue='partial';message='No source activity features were queryable in the current view/time window; no exposure conclusion is drawn.';warnings.push('Try refresh after the event layer is visible, or navigate to the asset.')}
     else{message='Checked only currently loaded source-reported activity geometries using local geometry intersection. This is not proof of damage; pagination outside the loaded viewport is not included.';sourceRefs.push({source_key:'BRIDGEPOINT_WORLD_ACTIVITY_V5908',url:'BridgePoint public world-activity API',viewport:window.__BP_WORLD_ACTIVITY_SLIDER_STATE_V5908__?.viewport||null});}
     break;
    }
    case 'TERRAIN_ANALYSIS':{
     const terrainState=window.__BP_TERRAIN_VISUAL_STATE__||null;
     const mode=String(payload.mode||'context').toLowerCase();
     if(!['context','hillshade','elevation'].includes(mode))throw Object.assign(new Error('Supported local modes: context, hillshade, elevation. Hydrology simulation is not configured.'),{routeStatus:'blocked'});
     if(mode==='hillshade'&&map.getLayer('gta-hillshade'))map.setLayoutProperty('gta-hillshade','visibility','visible');
     data={mode,terrain:terrainState,demSource:!!map.getSource('dem'),hillshadeLayer:!!map.getLayer('gta-hillshade'),modelExecuted:false};
     statusValue='partial';message='Returned current DEM/terrain visualization state. This task did not run TUFLOW, UMEP, WhiteboxTools, or a flood-depth simulation.';
     sourceRefs.push({source_key:'TERRARIUM_DEM',url:'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'});
     warnings.push('Hydrological outputs require defined model inputs and a configured solver.');
     break;
    }
    case 'GEOMETRY_WKT':{
     data=geometryToWkt(payload.geometry,payload.crs);
     message='Converted the supplied GeoJSON coordinates to WKT; no reprojection was performed.';
     break;
    }
    case 'COORDINATE_CONVERSION':{
     const lat=dmsToDecimal(payload.latitude??payload.lat,true),lon=dmsToDecimal(payload.longitude??payload.lon,false);
     if(Math.abs(lat)>90||Math.abs(lon)>180)throw new Error('Latitude/longitude out of range.');
     data={decimal_degrees:{latitude:lat,longitude:lon},dms:{latitude:toDms(lat,true),longitude:toDms(lon,false)},utm:{status:'not_computed',reason:'A verified PROJ/UTM transformer is not connected to this browser route.'}};
     message='Converted between decimal degrees and DMS. UTM conversion is explicitly not computed.';
     break;
    }
    case 'FIELD_INGEST':
     statusValue='blocked';message='Field data ingestion is not configured. No GPX/ODK/Kobo/Mergin connection was contacted.';data={required_configuration:['approved endpoint','server-side credential reference','expected schema','consent/retention policy'],pluginLogic:CAPABILITIES.FIELD_INGEST.pluginLogic};warnings.push('Do not put credentials in the task JSON.');break;
    case 'ROUTING_ANALYSIS':
     statusValue='blocked';message='Routing/isochrone provider is not configured. No route has been fabricated.';data={required_configuration:['server-side OpenRouteService credential','origin/destination or isochrone parameters','request budget']};warnings.push('Provider secrets must stay server-side.');break;
    case 'EVIDENCE_EXPORT':{
     const format=String(payload.format||'png').toLowerCase();
     if(!['png','tif'].includes(format))throw new Error('Export format must be png or tif.');
     const sat=window.__BP_SPECTRAL_IMAGERY_V5909__;
     if(!sat?.scene)throw Object.assign(new Error('Load a real satellite scene before exporting. The map view alone is not a source imagery file.'),{routeStatus:'blocked'});
     data=await sat.export(format);
     message='Requested a georeferenced satellite scene preview export, with source scene metadata preserved by the imagery module.';
     sourceRefs.push({source_key:'LANDSAT_C2_L2',item_id:sat.scene.id,acquired_at:sat.scene.properties?.datetime||null,url:'https://planetarycomputer.microsoft.com/api/stac/v1'});
     break;
    }
    case 'REAL_WORLD_RENDERING':{
     const realism=window.__BP_WORLD_REALISM_V5910__;
     if(!realism?.setEnabled)throw Object.assign(new Error('Real-world mode has not finished loading.'),{routeStatus:'blocked'});
     data={enabled:realism.setEnabled(payload.enabled!==false),state:realism.state};
     message='Toggled aerial/satellite context and source-tag-aware, material-inspired 3D roof/facade styling.';
     sourceRefs.push({source_key:'USGS_IMAGERY',url:'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}'},{source_key:'OPEN_AERIAL_MAP',url:'https://global.imagery.hotosm.org/{z}/{x}/{y}.png'});
     break;
    }
   }
  }catch(e){
   statusValue=e?.routeStatus||'failed';message=String(e?.message||e);
   if(statusValue==='failed')warnings.push('No unsupported operation should be inferred from a failed route.');
  }
  const result={engine:'BridgePoint GIS Core Orchestration Engine',version:VERSION,run_id:runId,task_type:type,capability:spec.capability,plugin_logic:CAPABILITIES[spec.capability]?.pluginLogic||[],status:statusValue,message,data,metrics:{elapsed_ms:Math.round(performance.now()-start),map_zoom:Math.round(map.getZoom()*100)/100},source_refs:sourceRefs,required_inputs:spec.required_inputs,warnings,source_policy:spec.source_policy,updated_at:new Date().toISOString()};
  result.audit=await recordAudit(result,type,payload,sourceRefs);
  if(result.audit?.recorded)result.audit.integrity='hash-linked event recorded; verify event_hash against independent storage for stronger assurance';
  window.__BP_GIS_CORE_LAST_RESULT_V5910__=result;
  return result;
 }
 function renderCapabilities(){showResult({engine:'BridgePoint GIS Core Orchestration Engine',version:VERSION,status:'partial',message:'Capability registry reports what is connected versus source-gated or not configured.',...capabilityReport()},false)}
 async function runFromUi(){
  let payload;
  try{payload=parseInput(input.value)}catch(e){showResult({status:'blocked',message:e.message},true);return}
  const type=task.value;status.textContent='Routing '+type+'…';status.dataset.error='false';indicator.textContent='RUNNING';
  const result=await route({task_type:type,payload});
  showResult(result,result.status==='failed'||result.status==='blocked');
 }
 async function historyFromUi(){
  status.textContent='Reading authenticated audit history…';
  try{const rows=await readAuditHistory(20);showResult({status:'completed',message:'Authenticated audit events for the current user only.',events:rows},false)}
  catch(e){showResult({status:'blocked',message:String(e?.message||e),note:'Public map actions can run without sign-in; persistent per-user audit history requires an authenticated session.'},true)}
 }
 toggle.addEventListener('click',()=>{panel.hidden=!panel.hidden;toggle.setAttribute('aria-expanded',String(!panel.hidden))});
 $('[data-close]').addEventListener('click',()=>{panel.hidden=true;toggle.setAttribute('aria-expanded','false')});
 $('[data-run]').addEventListener('click',()=>void runFromUi());
 $('[data-caps]').addEventListener('click',renderCapabilities);
 $('[data-history]').addEventListener('click',()=>void historyFromUi());
 const onBuilding=()=>{indicator.textContent='READY'};
 window.addEventListener('bp2300:building-click',onBuilding);
 api.destroy=()=>{disposed=true;window.removeEventListener('bp2300:building-click',onBuilding);root.remove()};
 window.__BP_GIS_CORE_V5910__=api;
 return api;
}
