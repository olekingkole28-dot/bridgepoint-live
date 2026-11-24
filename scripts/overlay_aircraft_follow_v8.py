from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1]);tracker='bridgepoint-drone-awareness-v1.js';visual='bridgepoint-aircraft-visuals-v2.js';key='aircraft-follow-ground-v20261124-v8'
allowed={tracker,'app/'+tracker,visual,'app/'+visual,'index.html','app/index.html'}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('AIRCRAFT_ANCHOR '+str(s.count(a))+' '+a[:160])
 return s.replace(a,b,1)
s=(site/tracker).read_text()
assert 'closeDetailVersion:7' in s and 'installPersistentFlightMarkers' in s
s=one(s,"function flightProjectedSpan(","""let flightFollow=null,flightFollowButton=null,flightFollowTimer=0,flightFollowPreviousClamp=null,flightFollowPreviousElevation=null,flightFollowFlying=false,flightFollowEpoch=0;
function flightIsGrounded(a){
 return a?.on_ground===true||a?.on_ground===1||a?.on_ground==='true'||a?.ground===true||[a?.alt_baro,a?.alt_geom].some(x=>typeof x==='string'&&x.trim().toLowerCase()==='ground');
}
function flightFollowRecord(){
 if(!flightFollow)return null;
 const k=flightFollow.key;
 return lastCurrentAircraftRecords.find(a=>a._trackKey===k)||lastCurrentRecords.find(a=>a._trackKey===k)||flightFollow.record;
}
function flightFollowRecords(records,drone){
 const list=Array.isArray(records)?records:[];
 if(!flightFollow||flightFollow.drone!==drone)return list;
 const r=flightFollowRecord();if(!r)return list;
 return [r,...list.filter(a=>a._trackKey!==flightFollow.key)];
}
function flightGround(lon,lat){
 const h=queryGroundElevation(lon,lat,'ground');
 if(Number.isFinite(h))return h;
 return null;
}
function flightTarget(r){
 if(!r)return null;const lon=Number(r.lon),lat=Number(r.lat);
 if(!Number.isFinite(lon)||!Number.isFinite(lat))return null;
 const a=aircraftAltitudeForRecord(r),ground=flightGround(lon,lat);
 if(flightIsGrounded(r))return {lon,lat,elevation:ground??0,grounded:true,terrainKnown:ground!==null};
 if(!a.projectable)return null;
 if(a.datum==='agl'&&ground===null)return null;
 return {lon,lat,elevation:a.meters+(a.datum==='agl'?ground:0),grounded:false,terrainKnown:ground!==null};
}
function stopFlightFollow(){
 const had=!!flightFollow;flightFollow=null;flightFollowFlying=false;flightFollowEpoch++;clearTimeout(flightFollowTimer);flightFollowTimer=0;
 flightFollowButton?.remove();flightFollowButton=null;
 if(had&&map){try{map.stop?.();map.setCenterClampedToGround?.(flightFollowPreviousClamp??true);const c=map.getCenter(),h=flightGround(c.lng,c.lat);map.setCenterElevation?.(flightFollowPreviousClamp===false?(flightFollowPreviousElevation??0):(h??0),{bpAircraftFollow:true})}catch(_){}}
 flightFollowPreviousClamp=null;flightFollowPreviousElevation=null;
}
function beginFlightFollow(properties,kind){
 const k=String(properties.track_key||properties.icao||'').trim().toLowerCase();if(!k||!map||!enabled)return;
 const r=lastCurrentAircraftRecords.find(a=>a._trackKey===k)||lastCurrentRecords.find(a=>a._trackKey===k);if(!r)return;
 const target=flightTarget(r);if(!target)return;
 if(flightFollow?.key===k&&flightFollowFlying)return;
 if(!flightFollow){flightFollowPreviousClamp=map.getCenterClampedToGround?.()??true;flightFollowPreviousElevation=map.getCenterElevation?.()??0;}
 flightFollow={key:k,record:r,drone:kind==='drone',target:null};flightFollowFlying=true;const epoch=++flightFollowEpoch;
 if(!flightFollowButton){const b=document.createElement('button');b.type='button';b.setAttribute('aria-label','Stop following aircraft');b.style.cssText='position:absolute;top:12px;left:50%;transform:translateX(-50%);z-index:1000;padding:8px 14px;border-radius:20px;border:1px solid #75dfff;background:#071c2aee;color:white;font:700 12px system-ui;pointer-events:auto';b.addEventListener('click',e=>{e.stopPropagation();stopFlightFollow()});map.getContainer().appendChild(b);flightFollowButton=b}
 flightFollowButton.textContent='Following '+String(properties.callsign||properties.registration||k).trim()+' · ×';
 map.stop?.();map.setCenterClampedToGround?.(false);
 const span=aircraftVisualModule?.airframeForRecord?.(kind,r)?.spanM||aircraftModelSpanMetersByKind(target.lat,18,kind);
 const zoom=Math.min(map.getMaxZoom?.()??22,Math.max(15,Math.log2(WORLD_CIRCUMFERENCE_M*Math.max(.12,Math.cos(target.lat*Math.PI/180))/(512*Math.max(.015,span/125)))));
 flightFollow.target=target;
 const complete=()=>{if(!flightFollow||epoch!==flightFollowEpoch)return;flightFollowFlying=false;
  const t=flightTarget(flightFollowRecord());if(t){flightFollow.target=t;map.setCenterClampedToGround?.(false);if(Math.abs((map.getCenterElevation?.()??0)-t.elevation)>.5)map.jumpTo({center:[t.lon,t.lat],elevation:t.elevation},{bpAircraftFollow:true});}
  queueFlightModels();
 };
 map.once?.('moveend',complete);
 try{map.flyTo({center:[target.lon,target.lat],elevation:target.elevation,zoom,pitch:Math.min(58,map.getMaxPitch?.()??85),bearing:map.getBearing(),duration:2200,essential:true},{bpAircraftFollow:true});}catch(e){flightFollowFlying=false;map.jumpTo({center:[target.lon,target.lat],elevation:target.elevation,zoom,pitch:45},{bpAircraftFollow:true});complete()}
 clearTimeout(flightFollowTimer);flightFollowTimer=setTimeout(complete,2700);
 queueFlightModels();
}
function tickFlightFollow(){
 if(!flightFollow||flightFollowFlying||!enabled||!map)return;
 const r=flightFollowRecord(),t=flightTarget(r);if(!t)return;
 const old=flightFollow.target;flightFollow.record=r;
 if(map.isMoving?.())return;
 const changed=!old||Math.abs(old.lon-t.lon)>1e-7||Math.abs(old.lat-t.lat)>1e-7||Math.abs(old.elevation-t.elevation)>.5;
 const center=map.getCenter(),elevation=map.getCenterElevation?.();
 const drift=Math.abs(center.lng-t.lon)>1e-6||Math.abs(center.lat-t.lat)>1e-6||(Number.isFinite(elevation)&&Math.abs(elevation-t.elevation)>.8);
 if(!changed&&!drift)return;
 flightFollow.target=t;map.setCenterClampedToGround?.(false);
 // Preserve the user's current orbit, pitch and zoom on every position update.
 if(changed)map.easeTo({center:[t.lon,t.lat],elevation:t.elevation,duration:650},{bpAircraftFollow:true});
 else map.jumpTo({center:[t.lon,t.lat],elevation:t.elevation},{bpAircraftFollow:true});
}
function flightProjectedSpan(""")
s=one(s," const title=String(properties.callsign||properties.registration||properties.icao||'Unknown aircraft');"," beginFlightFollow(properties,kind);\n const title=String(properties.callsign||properties.registration||properties.icao||'Unknown aircraft');")
# A backing circle and symbol can both fire for one tap: avoid duplicate flight and popup.
s=one(s,"function showAircraftDetails(event){","let lastFlightClick=null;\nfunction showAircraftDetails(event){\n if(event?.originalEvent&&event.originalEvent===lastFlightClick)return;lastFlightClick=event?.originalEvent||null;")
s=one(s," const altitude=altitudeForRecord(a);\n if(!altitude.projectable"," if(flightIsGrounded(a))return{known:true,projectable:true,value:0,meters:0,sourceValue:'ground',sourceField:'ground flag',sourceUnits:'',mapUnits:'m',datum:'ground',placementDatum:'terrain'};\n const altitude=altitudeForRecord(a);\n if(!altitude.projectable")
# Prioritize selected target and retain last reported position if one regional
# sample omits it. No invented observations or history.
s=one(s,"const sorted=(Array.isArray(records)?records:[]).slice().sort((a,b)=>{","const sorted=flightFollowRecords(records,false).slice().sort((a,b)=>{\n   if(a._trackKey===flightFollow?.key)return -1;if(b._trackKey===flightFollow?.key)return 1;")
s=one(s,"  const storedTrack=trackedAircraft.get(key),storedPoint=","  const grounded=flightIsGrounded(aircraft),selected=flightFollow?.key===key;\n  const storedTrack=trackedAircraft.get(key),storedPoint=")
s=one(s,"  let groundElevation=point.terrainElevationMeters??null;","  let groundElevation=grounded?flightGround(lon,lat):(point.terrainElevationMeters??null);")
s=one(s,"  const position=projectAircraft3DPoint(point,MC,groundElevation);","  const position=grounded?MC.fromLngLat({lng:lon,lat},groundElevation??0):projectAircraft3DPoint(point,MC,groundElevation);")
s=one(s,"  if(zoom<5){const rad=","  if(!selected&&zoom<5){const rad=")
s=one(s,"  }else{\n    const p=flightScreenPoint(position);","  }else if(!selected){\n    const p=flightScreenPoint(position);")
s=one(s,"const detail=(projectedPx>=8||zoom>=10)&&flightLodStats.detail<detailLimit;","const detail=selected||((projectedPx>=8||zoom>=10)&&flightLodStats.detail<detailLimit);")
s=one(s,"const modelKey=kind+'|'+(detail?design.variant:'locator')+'|'+(detail?'detail':'locator');","const modelKey=kind+'|'+(detail?design.variant:'locator')+'|'+(detail?'detail':'locator')+(grounded?'|parked':'')+(selected?'|follow':'');")
s=one(s,"  const ref=detail?widthReference:aircraftModelReferenceSpan(kind);","  const ref=detail?widthReference:aircraftModelReferenceSpan(kind);")
s=one(s,"const bucket=grouped.get(modelKey)||{kind,variant:design.variant,detail,items:[]};","const bucket=grouped.get(modelKey)||{kind,variant:design.variant,detail,grounded,selected,items:[]};")
s=one(s,"bucket.items.push({matrix,night,kind,scale,meterUnit,livery:","bucket.items.push({matrix,night,kind,scale,meterUnit,grounded,selected,livery:")
s=one(s,"longitude:lon,latitude:lat,physicalWingspanMeters:span,nightLightsOn:!!night","longitude:lon,latitude:lat,physicalWingspanMeters:span,nightLightsOn:!!night,grounded,selected,terrainElevationMeters:groundElevation")
s=one(s,"  addTether(tethers,kind,base,position);","  if(!grounded)addTether(tethers,kind,base,position);")
s=one(s,"if(detail&&kind==='jet'&&altitude.meters>=6500","if(!grounded&&detail&&kind==='jet'&&altitude.meters>=6500")
s=one(s,"function ensureAircraftInstancedMesh(classKey,capacity,kind,variant='general',detail=true){","function ensureAircraftInstancedMesh(classKey,capacity,kind,variant='general',detail=true,grounded=false){")
s=one(s,"aircraftVisualModule.buildDetailedAirframe(droneThree,kind,variant):makeAircraftGeometry","aircraftVisualModule.buildDetailedAirframe(droneThree,kind,variant,grounded):makeAircraftGeometry")
s=one(s,"const entry=ensureAircraftInstancedMesh(modelKey,bucket.items.length,bucket.kind,bucket.variant,bucket.detail);","const entry=ensureAircraftInstancedMesh(modelKey,bucket.items.length,bucket.kind,bucket.variant,bucket.detail,bucket.grounded);")
s=one(s,"   entry.mesh.setMatrixAt(i,item.matrix);","   if(item.grounded){if(!entry.geometry.boundingBox)entry.geometry.computeBoundingBox();item.matrix.elements[14]-=entry.geometry.boundingBox.min.z*item.scale;}\n   entry.mesh.setMatrixAt(i,item.matrix);")
s=one(s,"if(nightAttr){nightAttr.setX(i,item.night);","if(nightAttr){nightAttr.setX(i,item.night);entry.geometry.getAttribute('aBpParked')?.setX(i,item.grounded?1:0);")
s=one(s,"if(nightAttr){nightAttr.needsUpdate=true;","if(nightAttr){nightAttr.needsUpdate=true;const parked=entry.geometry.getAttribute('aBpParked');if(parked)parked.needsUpdate=true;")
s=one(s,"if(entry.rich)flightModelAnimation.push({entry,index:i,...item});","if(entry.rich&&!item.grounded)flightModelAnimation.push({entry,index:i,...item});")
# The selected airframe remains in the full-detail batch throughout orbit
# and extreme zoom. It is not rebuilt by each individual camera frame.
s=one(s," const visibleRecords=(Array.isArray(records)?records:[]).filter(a=>{"," const visibleRecords=flightFollowRecords(records,true).filter(a=>{if(a._trackKey===flightFollow?.key)return true;")
s=one(s,"  const point=DroneCore.createTrailPoint(a,Date.now(),a._bpSourceName||'ADSB.lol');","  const grounded=flightIsGrounded(a);\n  const point=DroneCore.createTrailPoint(a,Date.now(),a._bpSourceName||'ADSB.lol');")
s=one(s,"position=projectAircraft3DPoint(point,MC,groundElevation),meterUnit=","position=grounded?MC.fromLngLat({lng:lon,lat},groundElevation??0):projectAircraft3DPoint(point,MC,groundElevation),meterUnit=")
s=one(s,"  addTether(tethers,'drone',base,position);","  if(!grounded)addTether(tethers,'drone',base,position);")
s=one(s,"model.scale.setScalar(((zoom>=12?span:vs.display)/1.76)*meterUnit);","model.scale.setScalar(((zoom>=12||key===flightFollow?.key?span:vs.display)/1.76)*meterUnit);if(grounded)model.position.z+=.15*model.scale.z;")
s=one(s,"  model.userData.bpBaseZ=position.z;","  model.userData.bpGrounded=grounded;model.userData.bpBaseZ=model.position.z;")
s=one(s,"  for(const model of droneModels.values()){\n   model.traverse","  tickFlightFollow();\n  for(const model of droneModels.values()){\n   if(model.userData.bpGrounded)continue;\n   model.traverse")
s=one(s,"function clearTrackedAircraft(){\n","function clearTrackedAircraft(){\n stopFlightFollow();\n")
# Avoid a zero-length/behind-camera rod when its endpoint crosses the
# near plane. Clip the full segment in homogeneous camera coordinates.
s=one(s,"vec2 d=(q.xy/max(abs(q.w),0.000001)-p.xy/max(abs(p.w),0.000001))*uViewport;","float pn=p.z+p.w,qn=q.z+q.w;if(pn<.000001&&qn>.000001){p=mix(p,q,clamp((.000001-pn)/(qn-pn),0.,1.));}else if(qn<.000001&&pn>.000001){q=mix(q,p,clamp((.000001-qn)/(pn-qn),0.,1.));}vec2 d=(q.xy/max(abs(q.w),0.000001)-p.xy/max(abs(p.w),0.000001))*uViewport;")
# Keep selected target and terrain landing updated as tiles settle, but do
# not continuously rebuild unrelated aircraft or alter the shared camera.
s=one(s,"scheduleViewportRefresh()},80)});","scheduleViewportRefresh()},80)});\n   map.on?.('idle',()=>{if(flightFollow&&!flightFollowFlying)tickFlightFollow()});")
s=one(s,"closeDetailVersion:7,","closeDetailVersion:7,followGroundVersion:8,followTarget:flightFollow?{key:flightFollow.key,target:flightFollow.target,selectedModel:aircraftModels.get(flightFollow.key)||null}:null,")
s=one(s,"  toggle,\n  refresh:","  toggle,\n  stopAircraftFollow:stopFlightFollow,\n  refresh:")
s=one(s,"bridgepoint-aircraft-visuals-v2.js?v=aircraft-close-detail-v20261124-v7","bridgepoint-aircraft-visuals-v2.js?v="+key)
for rel in (tracker,'app/'+tracker):
 if (site/rel).exists():(site/rel).write_text(s)
v=(site/visual).read_text()
v=one(v,'export const AIRCRAFT_VISUAL_VERSION=7;','export const AIRCRAFT_VISUAL_VERSION=8;')
v=one(v,"export function buildDetailedAirframe(T,kind,variant='general'){","export function buildDetailedAirframe(T,kind,variant='general',grounded=false){")
# Extend only parked fixed-wing airframes with visible deployed gear.
v=one(v,"  if(kind==='glider'){\n   box(.34","""  if(grounded){
   const gear=(x,y,z,r)=>{rod([x,y,z+.18],[x,y,z],.018,palette.silver);part(new T.CylinderGeometry(r,r,.042,24),[x,y,z],[Math.PI/2,0,0],[1,1,1],palette.black);part(new T.CylinderGeometry(r*.42,r*.42,.046,16),[x,y,z],[Math.PI/2,0,0],[1,1,1],palette.silver);};
   if(kind==='glider')gear(0,0,-.19,.055);
   else{gear(long*.65,0,-.26,.075);for(const side of [-1,1])gear(-.11,side*(wide?.30:.23),-.29,wide?.12:.095);}
  }
  if(kind==='glider'){
   box(.34""")
v=one(v,"geom.userData.bpAirframeVersion=7;","geom.userData.bpAirframeVersion=8;geom.userData.bpParkedGeometry=grounded;")
v=one(v,r"attribute float aBpNight;\n",r"attribute float aBpNight;\nattribute float aBpParked;\n")
v=one(v,"if(aBpRotor>0.5){float a=","if(aBpRotor>0.5&&aBpParked<.5){float a=")
v=one(v,"geom.setAttribute('aBpNight',new T.InstancedBufferAttribute(new Float32Array(Math.max(1,capacity)),1));","geom.setAttribute('aBpNight',new T.InstancedBufferAttribute(new Float32Array(Math.max(1,capacity)),1));geom.setAttribute('aBpParked',new T.InstancedBufferAttribute(new Float32Array(Math.max(1,capacity)),1));")
v=one(v,"bp-airframe-colored-rotors-lights-v7","bp-airframe-colored-rotors-lights-v8")
for rel in (visual,'app/'+visual):
 if (site/rel).exists():(site/rel).write_text(v)
for rel in ('index.html','app/index.html'):
 p=site/rel;old=p.read_text();new,n=re.subn(r'('+re.escape(tracker)+r'\?[^"\s]+)',lambda m:m.group(1)+'&followair='+key,old)
 if not n:raise SystemExit('missing aircraft cache reference '+rel)
 p.write_text(new)
assert snap()==before,'unrelated production file changed'
print('AIRCRAFT_FOLLOW_GROUND_SCOPE_PASS',len(before),'unchanged production files')
