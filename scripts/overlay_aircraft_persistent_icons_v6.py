from pathlib import Path
import re,sys,hashlib
site=Path(sys.argv[1]);name='bridgepoint-drone-awareness-v1.js';key='aircraft-persistent-icons-v20261124-v6'
allowed={name,'app/'+name,'index.html','app/index.html'}
def snapshot():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snapshot();s=(site/name).read_text()
def one(a,b):
 global s
 if s.count(a)!=1:raise SystemExit('ANCHOR '+str(s.count(a))+' '+a[:140])
 s=s.replace(a,b,1)
# Native map markers are independent of the custom 3D layer. High contrast
# circle backing is a fallback if an image atlas is unavailable.
one("function installAircraftIcons(){","""const AIRCRAFT_MARKER_BACKING='bp-aircraft-awareness-persistent-marker-v6',DRONE_MARKER_BACKING='bp-drone-awareness-persistent-marker-v6';
function installPersistentFlightMarkers(){
 const specs=[[AIRCRAFT_MARKER_BACKING,AIRCRAFT_SOURCE,null],[DRONE_MARKER_BACKING,SOURCE,['!',['has','point_count']]]];
 for(const [id,source,filter] of specs){
  if(map.getLayer(id)||!map.getSource(source))continue;
  const layer={id,type:'circle',source,minzoom:0,layout:{visibility:'none'},paint:{
    'circle-radius':['interpolate',['linear'],['zoom'],0,4.2,7,5.2,15,6.2,22,5.2],
    'circle-color':['match',['get','aircraft_kind'],'jet','#dcefff','helicopter','#ffb477','glider','#c8a9ff','balloon','#ffd071','propeller','#8be6b5','drone','#4defff','#63dcff'],
    'circle-opacity':.94,'circle-stroke-width':1.4,'circle-stroke-color':'#071a2e','circle-pitch-alignment':'viewport','circle-pitch-scale':'viewport'
  }};
  if(filter)layer.filter=filter;
  const above=id===AIRCRAFT_MARKER_BACKING?AIRCRAFT_LAYER:LAYER;
  map.addLayer(layer,map.getLayer(above)?above:undefined);
 }
}
function installAircraftIcons(){""")
# Avoid collision suppression by unrelated basemap labels. The aircraft
# markers occupy a compact footprint and never suppress labels themselves.
for layer in ('AIRCRAFT_LAYER','LAYER'):
 pat=r"  if\(!map.getLayer\("+layer+r"\)\)map.addLayer\(\{[^\n]+\}\);"
 m=re.search(pat,s)
 if not m:raise SystemExit('marker layer missing '+layer)
 line=m.group(0).replace("'icon-allow-overlap':false","'icon-allow-overlap':true").replace("'icon-ignore-placement':false","'icon-ignore-placement':true").replace("'icon-size':['interpolate',['linear'],['zoom'],0,.66,7,.87,15,1.0,22,.82]","'icon-size':['interpolate',['linear'],['zoom'],0,.83,7,.93,15,1.0,22,.85]")
 s=s[:m.start()]+line+s[m.end():]
one("  bindAircraftInteractions();\n  return true;","  installPersistentFlightMarkers();\n  bindAircraftInteractions();\n  return true;")
one("[AIRCRAFT_LAYER,otherOn],[AIRCRAFT_TRAIL_LAYER,otherOn]","[AIRCRAFT_LAYER,otherOn],[AIRCRAFT_MARKER_BACKING,otherOn],[DRONE_MARKER_BACKING,dronesOn],[AIRCRAFT_TRAIL_LAYER,otherOn]")
one("for(const id of [AIRCRAFT_LAYER,AIRCRAFT_TRAIL_LAYER,AIRCRAFT_TRAIL_DOT_LAYER])","for(const id of [AIRCRAFT_LAYER,AIRCRAFT_MARKER_BACKING,AIRCRAFT_TRAIL_LAYER,AIRCRAFT_TRAIL_DOT_LAYER])")
one("for(const id of [LAYER,AIRCRAFT_LAYER]){","for(const id of [LAYER,AIRCRAFT_LAYER,AIRCRAFT_MARKER_BACKING,DRONE_MARKER_BACKING]){")
# Keep style changes local to the aircraft layer and avoid reapplying on idle.
one("  setLayerVisibility(true);scheduleDroneRefresh();void refresh(false);","""  flightFilterStamp='';
  for(const id of [AIRCRAFT_MARKER_BACKING,DRONE_MARKER_BACKING,CLUSTER_LAYER,CLUSTER_COUNT_LAYER,AIRCRAFT_LAYER,LAYER])try{if(map.getLayer(id))map.moveLayer(id)}catch(_){}
  setLayerVisibility(true);scheduleDroneRefresh();void refresh(false);""")
# A failure in custom meshes must never stop the native map position update.
one("  setDroneModels(lastCurrentRecords);setAircraftModels(lastCurrentAircraftRecords);\n },Math.max(0,1300-","  try{setDroneModels(lastCurrentRecords)}catch(e){console.warn('Drone model refresh',e)}\n  try{setAircraftModels(lastCurrentAircraftRecords)}catch(e){console.warn('Aircraft model refresh',e)}\n },Math.max(0,1300-")
one("flightProgressive=true;try{updateTrackedUavs(cumulative);updateTrackedAircraft(cumulative)}finally{flightProgressive=false}queueFlightModels();","flightProgressive=true;try{try{updateTrackedUavs(cumulative)}catch(e){console.warn('UAV feed update',e)}try{updateTrackedAircraft(cumulative)}catch(e){console.warn('Aircraft feed update',e)}}finally{flightProgressive=false}queueFlightModels();")
# Make current marker state inspectable; read-only diagnostic.
one("farLocatorMinPixels:8","farLocatorMinPixels:8,persistentMarkerReady:!!map?.getLayer(AIRCRAFT_MARKER_BACKING),persistentMarkerVisible:map?.getLayoutProperty(AIRCRAFT_MARKER_BACKING,'visibility')==='visible'")
for rel in (name,'app/'+name):
 if (site/rel).exists():(site/rel).write_text(s)
for rel in ('index.html','app/index.html'):
 p=site/rel;old=p.read_text();new,n=re.subn(r'('+re.escape(name)+r'\?[^"\s]+)',lambda m:m.group(1)+'&markers='+key,old)
 if not n:raise SystemExit('missing aircraft cache reference '+rel)
 p.write_text(new)
assert snapshot()==before,'unrelated production file changed'
print('AIRCRAFT_PERSISTENT_MARKERS_SCOPE_PASS',len(before),'unchanged files; 3D model and animation geometry untouched')
