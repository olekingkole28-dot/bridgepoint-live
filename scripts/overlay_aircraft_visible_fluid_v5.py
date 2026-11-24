from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1]);name='bridgepoint-drone-awareness-v1.js';key='aircraft-visible-fluid-v20261124-v5'
allowed={name,'app/'+name,'index.html','app/index.html'}
def snapshot():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snapshot();s=(site/name).read_text()
def one(a,b):
 global s
 if s.count(a)!=1:raise SystemExit('ANCHOR '+str(s.count(a))+' '+a[:140])
 s=s.replace(a,b,1)
# Screen-visible simplified aircraft at long range, physical size in close view.
# Keep the original detailed geometry and materials entirely untouched.
one("let flightOrigin={x:0,y:0},flightEffects=null,flightModelAnimation=[],flightVisualStamp='',flightMoveTimer=0;","""let flightOrigin={x:0,y:0},flightEffects=null,flightModelAnimation=[],flightVisualStamp='',flightMoveTimer=0;
let flightProjection=null,flightProgressive=false,flightModelTimer=0,flightLastModelBuild=0,flightSummaryAt=0;
let flightLodStats={detail:0,locator:0,vertices:0},flightFilterStamp='';
function flightScreenPoint(p){
 if(!flightProjection||!droneThree||!map)return null;
 const v=new droneThree.Vector4(p.x-flightOrigin.x,p.y-flightOrigin.y,p.z,1).applyMatrix4(flightProjection);
 if(v.w<=0)return {visible:false,pixels:0};
 const c=map.getCanvas(),x=(v.x/v.w+1)*c.clientWidth*.5,y=(1-v.y/v.w)*c.clientHeight*.5;
 return {visible:x>=-220&&x<=c.clientWidth+220&&y>=-220&&y<=c.clientHeight+220,x,y};
}
function flightVisualScale(span,lat,zoom){
 const mpp=WORLD_CIRCUMFERENCE_M*Math.max(.12,Math.cos(lat*Math.PI/180))/(512*Math.pow(2,zoom));
 const px=span/Math.max(mpp,1e-6);
 return {px,display:Math.max(span,8*mpp)};
}
function queueFlightModels(){
 if(flightModelTimer||!enabled)return;
 flightModelTimer=setTimeout(()=>{
  flightModelTimer=0;if(!enabled||!droneScene)return;
  flightLastModelBuild=performance.now();
  setDroneModels(lastCurrentRecords);setAircraftModels(lastCurrentAircraftRecords);
 },Math.max(0,1300-(performance.now()-flightLastModelBuild)));
}
""")
one("layer.camera.projectionMatrixInverse.copy(layer.camera.projectionMatrix).invert();","layer.camera.projectionMatrixInverse.copy(layer.camera.projectionMatrix).invert();flightProjection=layer.camera.projectionMatrix.clone();")
# Skip hidden diagnostic DOM construction and redundant style updates.
one("function writeSummary(){","function writeSummary(){\n if(!pane||pane.hidden)return;")
one("function syncAircraftFilterVisibility(active=enabled){","function syncAircraftFilterVisibility(active=enabled){")
one("  for(const [id,show] of visibility)try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',show?'visible':'none')}catch(_){}","  for(const [id,show] of visibility)try{if(map.getLayer(id)&&map.getLayoutProperty(id,'visibility')!==(show?'visible':'none'))map.setLayoutProperty(id,'visibility',show?'visible':'none')}catch(_){}")
one("  for(const id of [AIRCRAFT_LAYER,AIRCRAFT_TRAIL_LAYER,AIRCRAFT_TRAIL_DOT_LAYER])try{if(map.getLayer(id))map.setFilter(id,filter)}catch(_){}","  const sig=JSON.stringify(filter);if(sig!==flightFilterStamp){flightFilterStamp=sig;for(const id of [AIRCRAFT_LAYER,AIRCRAFT_TRAIL_LAYER,AIRCRAFT_TRAIL_DOT_LAYER])try{if(map.getLayer(id))map.setFilter(id,filter)}catch(_){}}")
one("function ensureAircraftInstancedMesh(classKey,capacity,kind,variant='general'){","function ensureAircraftInstancedMesh(classKey,capacity,kind,variant='general',detail=true){")
one("if(entry){try{droneScene?.remove(entry.mesh);entry.geometry.dispose();entry.material.dispose()}catch(_){}aircraftTemplates.delete(classKey)}","""if(entry){
  const size=Math.max(8,2**Math.ceil(Math.log2(capacity))),old=entry.mesh;
  if(entry.rich)aircraftVisualModule.attachInstancedNight(droneThree,entry.geometry,size);
  const mesh=new droneThree.InstancedMesh(entry.geometry,entry.material,size);mesh.count=0;mesh.name=old.name;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(droneThree.DynamicDrawUsage);
  droneScene.remove(old);old.dispose?.();droneScene.add(mesh);entry.mesh=mesh;entry.capacity=size;return entry;
 }""")
one("const rich=!!aircraftVisualModule?.buildDetailedAirframe;","const rich=detail&&!!aircraftVisualModule?.buildDetailedAirframe;")
one("new droneThree.MeshStandardMaterial({color:aircraftColor(kind),metalness:.42,roughness:.38,emissive:aircraftColor(kind),emissiveIntensity:.10});","new droneThree.MeshBasicMaterial({color:aircraftColor(kind),side:droneThree.DoubleSide,depthTest:false,depthWrite:false});")
one("mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(droneThree.DynamicDrawUsage);droneScene.add(mesh);","mesh.count=0;mesh.frustumCulled=false;mesh.renderOrder=detail?12:1001;mesh.instanceMatrix.setUsage(droneThree.DynamicDrawUsage);droneScene.add(mesh);")
# Build only nearby visible high detail objects. All other reported aircraft
# get a small recognizable three-dimensional locator at their reported height.
one(" const branded=[],effects=[];flightModelAnimation=[];"," const branded=[],effects=[];flightModelAnimation=[];flightLodStats={detail:0,locator:0,vertices:0};")
one(" for(const aircraft of Array.isArray(records)?records:[]){",""" const center=map.getCenter(),mobile=matchMedia('(max-width: 760px)').matches,detailLimit=mobile?5:12;
 const sorted=(Array.isArray(records)?records:[]).slice().sort((a,b)=>{
   const d=r=>Math.hypot((Number(r.lon)-center.lng)*Math.cos(center.lat*Math.PI/180),Number(r.lat)-center.lat);
   return d(a)-d(b);
 });
 for(const aircraft of sorted){""")
one("  if(zoom>=7){let visible=true;try{const p=map.project([lon,lat]),cv=map.getCanvas(),pad=600;visible=p.x>=-pad&&p.x<=cv.clientWidth+pad&&p.y>=-pad&&p.y<=cv.clientHeight+pad}catch(_){}if(!visible)continue;}","""  if(zoom<5){const rad=Math.PI/180,cl=center.lat*rad,pl=lat*rad;
    if(Math.sin(cl)*Math.sin(pl)+Math.cos(cl)*Math.cos(pl)*Math.cos((lon-center.lng)*rad)<-.08)continue;
  }else{
    const p=flightScreenPoint(position);
    // The altitude projection, not the ground marker, determines visibility.
    if(p&&!p.visible){
      let groundVisible=false;try{const q=map.project([lon,lat]),cv=map.getCanvas();groundVisible=q.x>=-300&&q.x<=cv.clientWidth+300&&q.y>=-300&&q.y<=cv.clientHeight+300}catch(_){}
      if(!groundVisible)continue;
    }
  }""")
one("  const modelKey=kind+'|'+design.variant;","  const physicalSpan=Number(design.spanM)||aircraftModelSpanMetersByKind(lat,zoom,kind),visualScale=flightVisualScale(physicalSpan,lat,zoom);\n  const detail=visualScale.px>=20&&flightLodStats.detail<detailLimit;\n  const modelKey=kind+'|'+(detail?design.variant:'locator')+'|'+(detail?'detail':'locator');")
one("  const span=Number(design.spanM)||aircraftModelSpanMetersByKind(lat,zoom,kind);\n  const scale=(span/widthReference)*meterUnit;","""  const span=physicalSpan;
  const ref=detail?widthReference:aircraftModelReferenceSpan(kind);
  const scale=((detail?span:visualScale.display)/ref)*meterUnit;
  if(detail)flightLodStats.detail++;else flightLodStats.locator++;""")
one("const bucket=grouped.get(modelKey)||{kind,variant:design.variant,items:[]};","const bucket=grouped.get(modelKey)||{kind,variant:design.variant,detail,items:[]};")
one("if(kind==='jet'&&altitude.meters>=7000&&zoom>=7&&effects.length<40)","if(detail&&kind==='jet'&&altitude.meters>=7000&&zoom>=7&&effects.length<(mobile?4:10))")
one("if((design.operator||aircraft.flight||aircraft.r)&&zoom>=10&&branded.length<28)","if(detail&&(design.operator||aircraft.flight||aircraft.r)&&zoom>=10&&branded.length<detailLimit)")
one("const entry=ensureAircraftInstancedMesh(modelKey,bucket.items.length,bucket.kind,bucket.variant);","const entry=ensureAircraftInstancedMesh(modelKey,bucket.items.length,bucket.kind,bucket.variant,bucket.detail);\n  flightLodStats.vertices+=entry.geometry.getAttribute('position').count*bucket.items.length;")
one("flightModelAnimation.push({entry,index:i,...item});","if(entry.rich)flightModelAnimation.push({entry,index:i,...item});")
one("  try{entry.mesh.computeBoundingSphere()}catch(_){}","  // Frustum culling is disabled; no per-refresh bounding sphere scan.")
# The small drones also need a recognizable distant locator. Exact 0.8 m
# model scale is restored when close enough; no physical position is altered.
one("const span=modelSpanMeters(lat,zoom);model.position.set(position.x-flightOrigin.x,position.y-flightOrigin.y,position.z);model.scale.setScalar((span/1.76)*meterUnit);","const span=modelSpanMeters(lat,zoom),vs=flightVisualScale(span,lat,zoom);model.position.set(position.x-flightOrigin.x,position.y-flightOrigin.y,position.z);model.scale.setScalar((vs.display/1.76)*meterUnit);")
# Progressive source updates only upload points, not repeated heavy model,
# trail, and contrail rebuilds. Debounce the final geometry work.
one("updateTrackedUavs(cumulative);updateTrackedAircraft(cumulative);","flightProgressive=true;try{updateTrackedUavs(cumulative);updateTrackedAircraft(cumulative)}finally{flightProgressive=false}queueFlightModels();")
one("const models=setDroneModels(accepted),trailState=rebuildDroneTrails();","const models=flightProgressive?droneModels.size:setDroneModels(accepted),trailState=flightProgressive?{trails:diagnosticState.trailsRendered}:rebuildDroneTrails();")
one("const models=setAircraftModels(accepted),trailState=rebuildAircraftTrails();","const models=flightProgressive?aircraftModels.size:setAircraftModels(accepted),trailState=flightProgressive?{trails:diagnosticState.aircraftTrailsRendered,knownPoints:diagnosticState.aircraftTrailPoints}:rebuildAircraftTrails();")
one("if(now-lastDroneAnimationAt>=40){","if(now-lastDroneAnimationAt>=(map?.isMoving?.()?100:50)){")
# Preserve source-backed trails, but don't regenerate them for every move
# unless the local coordinate origin actually changed.
one("flightOriginForView();setDroneModels(lastCurrentRecords);rebuildDroneTrails();setAircraftModels(lastCurrentAircraftRecords);rebuildAircraftTrails();scheduleViewportRefresh()","const prior=flightOrigin;flightOriginForView();flightProjection=null;setDroneModels(lastCurrentRecords);setAircraftModels(lastCurrentAircraftRecords);if(prior.x!==flightOrigin.x||prior.y!==flightOrigin.y){rebuildDroneTrails();rebuildAircraftTrails()}scheduleViewportRefresh()")
one("function clearTrackedAircraft(){\n disposeFlightEffects();flightModelAnimation=[];","function clearTrackedAircraft(){\n clearTimeout(flightModelTimer);flightModelTimer=0;flightLodStats={detail:0,locator:0,vertices:0};disposeFlightEffects();flightModelAnimation=[];")
one("diagnostics:()=>JSON.parse(JSON.stringify(diagnosticState)),","diagnostics:()=>JSON.parse(JSON.stringify({...diagnosticState,flightLodStats,physicalScaleClose:true,farLocatorMinPixels:8})),")
# Keep aircraft icon and rod tip visible as data arrives; no changes to any
# model asset, water, vessels or shared renderers.
for rel in (name,'app/'+name):
 if (site/rel).exists():(site/rel).write_text(s)
for rel in ('index.html','app/index.html'):
 p=site/rel;old=p.read_text();new,n=re.subn(r'('+re.escape(name)+r'\?[^"\s]+)',lambda m:m.group(1)+'&fluidair='+key,old)
 if not n:raise SystemExit('missing aircraft cache reference '+rel)
 p.write_text(new)
assert snapshot()==before,'unrelated production file changed'
print('AIRCRAFT_VISIBLE_FLUID_SCOPE_PASS',len(before),'unchanged files including all detailed model assets, water and vessels')
