from pathlib import Path
import hashlib,re,sys
site=Path(sys.argv[1]);name='bridgepoint-drone-awareness-v1.js';key='aircraft-one-tap-v20261124-v4'
allowed={name,'app/'+name,'index.html','app/index.html'}
def snapshot():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snapshot()
s=(site/name).read_text()
def one(a,b):
 global s
 if s.count(a)!=1:raise SystemExit('ANCHOR '+str(s.count(a))+' '+a[:140])
 s=s.replace(a,b,1)
# Direct toggle: no diagnostics panel, no dock maximization. All aircraft
# categories start enabled; actual aircraft details remain clickable on-map.
one("async function toggle(){\n openDronePanel();","""async function toggle(){
 if(pane)pane.hidden=true;
 const side=$('#bpv-sidecar');
 if(side?.dataset.panel==='drones'){
   side.hidden=true;side.removeAttribute('data-panel');document.body.classList.remove('bpv-panel-open');
 }
""")
one("if(!enabled){enabled=true;activationGeneration++;activationQueued=true;","if(!enabled){selectedAircraftGroups=new Set(AIRCRAFT_FILTER_GROUPS.map(x=>x.key));updateAircraftFilterControls();enabled=true;activationGeneration++;activationQueued=true;lastFetchAt=0;")
one("b.addEventListener('click',toggle);grid.append(b);","b.dataset.bpvBound='1';grid.append(b);")
one("button=b;updateButton();","button=b;b.dataset.bpvBound='1';updateButton();")
one("function bindStartMode(){","""function bindStartMode(){
 // Capture only our own command, before the generic dock panel router.
 // One click = one toggle, even when the responsive dock moves the button.
 window.addEventListener('click',event=>{
   const target=event.target?.closest?.('[data-bp-drone-awareness-button="1"]');
   if(!target)return;
   event.preventDefault();event.stopImmediatePropagation();
   void toggle().catch(error=>{console.warn('Aircraft activation',error);showStatus(String(error?.message||error),'error')});
 },true);
""")
one("s.textContent+='.bp-aircraft-popup","s.textContent+=' .bp-drone-pane[hidden]{display:none!important}';\n s.textContent+='.bp-aircraft-popup")
# Robust resolved image expression rather than a concatenated image name.
one("['concat','bp-aircraft-detail-icon-',['coalesce',['get','aircraft_kind'],'airplane']]","['match',['get','aircraft_kind'],'jet','bp-aircraft-detail-icon-jet','helicopter','bp-aircraft-detail-icon-helicopter','glider','bp-aircraft-detail-icon-glider','balloon','bp-aircraft-detail-icon-balloon','propeller','bp-aircraft-detail-icon-propeller','bp-aircraft-detail-icon-airplane']")
# Request data immediately instead of waiting for Three to load.
one("  setLayerVisibility(true);\n  try{const THREE=await loadDroneThree();","  setLayerVisibility(true);scheduleDroneRefresh();void refresh(false);\n  try{const THREE=await loadDroneThree();")
one("window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('drones',true);scheduleDroneRefresh();void refresh(false);return true;","window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('drones',true);return true;")
# Only retry an unfinished activation; perpetual idle events must not
# reset model geometry, trigger repeated network batches or steal the UI.
one("()=>{if(enabled){activationQueued=true;void activateWhenStyleReady()}else installLayer()}","()=>{if(enabled){if(activationQueued||!map.getLayer(AIRCRAFT_LAYER)||!map.getLayer(DRONE_3D_LAYER)){activationQueued=true;void activateWhenStyleReady()}}else installLayer()}")
# Publish cumulative real reports progressively. Existing positions remain
# visible on transient network errors; no invented aircraft.
one("  writeSummary();showStatus('Regional live-source requests:","""  if(enabled&&batch.some(x=>x.ok)){
    const cumulative=results.filter(x=>x.ok).flatMap(x=>x.records);
    if(cumulative.length){
      diagnosticState.hasSuccessfulSource=true;diagnosticState.aircraftRecordsReceived=cumulative.length;
      updateTrackedUavs(cumulative);updateTrackedAircraft(cumulative);
      setLayerVisibility(true);
    }
  }
  writeSummary();showStatus('Regional live-source requests:""")
one("const samples=await fetchGlobalSamples();if(!enabled)return;","const refreshGeneration=activationGeneration;const samples=await fetchGlobalSamples();if(!enabled||refreshGeneration!==activationGeneration)return;")
one("const result=updateTrackedUavs(records),aircraftResult=updateTrackedAircraft(records),failed=","const result=diagnosticState.hasSuccessfulSource?updateTrackedUavs(records):{positions:lastCurrentRecords.length,models:droneModels.size},aircraftResult=diagnosticState.hasSuccessfulSource?updateTrackedAircraft(records):{positions:lastCurrentAircraftRecords.length,models:aircraftModels.size,trailPoints:diagnosticState.aircraftTrailPoints,trails:diagnosticState.aircraftTrailsRendered},failed=")
# Expose state to read-only QA; all existing model/effect constructors unchanged.
for rel in (name,'app/'+name):
 if (site/rel).exists():(site/rel).write_text(s)
for rel in ('index.html','app/index.html'):
 p=site/rel;old=p.read_text();new,n=re.subn(r'('+re.escape(name)+r'\?[^"\s]+)',lambda m:m.group(1)+'&onetap='+key,old)
 if not n:raise SystemExit('missing aircraft cache reference '+rel)
 p.write_text(new)
assert snapshot()==before,'unrelated site file changed'
print('AIRCRAFT_ONE_TAP_SCOPE_PASS',len(before),'unchanged files; only aircraft activation and icon routing modified')
