from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1]);key='fluid-navigation-v20261124-v12'
water='world-v2300-water.js';ship='bridgepoint-vessel-awareness-v1.js'
allowed={'index.html','app/index.html','landing.js','app.js',water,'app/'+water,ship,'app/'+ship}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def read(n):return (site/n).read_text(encoding='utf-8')
def write(n,s):(site/n).write_text(s,encoding='utf-8')
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('PATCH_ANCHOR '+str(s.count(a))+' '+a[:140])
 return s.replace(a,b,1)
s=read(water)
def shaders(s):return s[s.index('function buildShaders('):s.index('  function compile(',s.index('function buildShaders('))]
original_shader=shaders(s)
s=one(s,'const SURFACE_RENDER_REVISION = 6267;','const SURFACE_RENDER_REVISION = 6268;')
# Close geometry jobs yield to input and animation every ~5 ms. Old geometry
# is never cleared while a replacement is being assembled.
s=one(s,"  function scheduleBuild(delay = 220, reason = 'background') {","""  let activeWaterJob=null,waterJobEpoch=0,waterBuildPending=null,lastInteractiveBuild=0;
  function abortWaterJob(){
    waterJobEpoch++;
    if(activeWaterJob){activeWaterJob=null;api.interruptedMeshJobs=(api.interruptedMeshJobs||0)+1;}
  }
  function waterCameraStamp(){
    const c=map.getCenter();return {x:mercX(c.lng),y:mercY(c.lat),z:map.getZoom(),pitch:map.getPitch(),bearing:map.getBearing()};
  }
  function compatibleWaterCamera(a,b){
    const units=512*Math.pow(2,Math.min(a.z,b.z)),dx=a.x-b.x;
    return Math.abs(a.z-b.z)<.12&&Math.abs(a.pitch-b.pitch)<3&&Math.abs(a.bearing-b.bearing)<4&&Math.hypot(dx-Math.round(dx),a.y-b.y)*units<55;
  }
  function scheduleBuild(delay = 220, reason = 'background') {""")
s=one(s,"    if (moving && !window.__BP_PUBLIC_IDLE_SPIN_V5__) {\n      api.buildDeferredDuringMotion = true;\n      return;\n    }","""    const interactive=map.getZoom()>=10&&reason==='interactive';
    if (moving && !window.__BP_PUBLIC_IDLE_SPIN_V5__&&!interactive) {
      api.buildDeferredDuringMotion = true;
      if(activeWaterJob)waterBuildPending=reason;
      return;
    }
    if(activeWaterJob){
      // Keep a single replacement in flight. A source-data burst cannot start
      // competing builds or reset the display buffers.
      waterBuildPending=reason;return;
    }""")
s=one(s,"const cameraPriority = reason === 'camera' || reason === 'resume' || reason === 'install-recovery';","const cameraPriority = reason === 'camera' || reason === 'resume' || reason === 'install-recovery'||interactive;")
s=one(s,"const interval = cameraPriority ? MIN_CAMERA_BUILD_INTERVAL_MS : MIN_BACKGROUND_BUILD_INTERVAL_MS;","const interval = map.getZoom()>=10&&cameraPriority?(interactive?180:100):cameraPriority?MIN_CAMERA_BUILD_INTERVAL_MS:MIN_BACKGROUND_BUILD_INTERVAL_MS;")
s=one(s,"if ((moving || map.isMoving?.()) && !window.__BP_PUBLIC_IDLE_SPIN_V5__) {","if ((moving || map.isMoving?.()) && !window.__BP_PUBLIC_IDLE_SPIN_V5__&&buildReason!=='interactive') {")
a=s.index("      try {\n        buildGeometry();");b=s.index("  function buildGeometry() {",a)
s=s[:a]+"""      const stamp=waterCameraStamp(),token=++waterJobEpoch;
      const iter=buildGeometry(stamp);
      const job={token,iter,stamp,work:0,maxSlice:0};
      activeWaterJob=job;
      function finish(error=null){
        if(activeWaterJob!==job)return;
        activeWaterJob=null;
        api.buildError=error?String(error?.message||error).slice(0,220):null;
        api.lastBuildDurationMs=Math.round(job.work*10)/10;
        api.lastBuildMaxSliceMs=Math.round(job.maxSlice*10)/10;
        if(api.geometryBuilds>previousBuildCount){
          api.lastBuildCompletedAt=Date.now();api.lastBuildReason=buildReason;api.lastBuildSkippedReason=null;
          api.incrementalMeshCommits=(api.incrementalMeshCommits||0)+1;
        }
        const next=waterBuildPending;waterBuildPending=null;
        if(next)scheduleBuild(100,next);
      }
      function slice(){
        if(activeWaterJob!==job||token!==waterJobEpoch||!api.active||destroyed)return;
        if(stamp.z>=10&&!compatibleWaterCamera(stamp,waterCameraStamp())){
          abortWaterJob();scheduleBuild(0,map.isMoving?.()?'interactive':'camera');return;
        }
        const tick=performance.now();
        try{
          let result;
          do{result=iter.next()}while(!result.done&&performance.now()-tick<5);
          const spent=performance.now()-tick;job.work+=spent;job.maxSlice=Math.max(job.maxSlice,spent);
          if(result.done){finish();return;}
          api.incrementalMeshYields=(api.incrementalMeshYields||0)+1;
          requestAnimationFrame(slice);
        }catch(error){finish(error)}
      }
      slice();
    }, wait);
  }
"""+s[b:]
s=one(s,"  function buildGeometry() {","  function* buildGeometry(stamp) {")
a=s.index("  function* buildGeometry(");b=s.index("  const layerRef = createLayer",a)
g=s[a:b]
# Preserve camera snapshot and approved LOD density. Frequent cooperative
# checkpoints are cheap; the runner only yields to the browser at its budget.
g=g.replace("const z = map.getZoom(), canvas = map.getCanvas();","const z = stamp.z, canvas = map.getCanvas();")
for anchor in [
 "const waterFeatures = sourceFeatures(map, 'water', waterFeatureLimit, bounds);",
 "const landCoverFeatures = sourceFeatures(map, 'landcover', landFeatureLimit, bounds);",
 "const landUseFeatures = sourceFeatures(map, 'landuse', landFeatureLimit, bounds);",
 "const flowFeatures = flowRaw;",
 "const surface = [], flow = [];",
]:
 if anchor not in g:raise SystemExit('missing incremental checkpoint '+anchor)
 g=g.replace(anchor,anchor+"\n    if(z>=10)yield;",1)
g=g.replace("for(let j=0;j<countY;j++)for(let i=0;i<countX;i++){","for(let j=0;j<countY;j++)for(let i=0;i<countX;i++){\n        if(z>=10&&(i%16===0))yield;")
g=g.replace("for (let j = 0; j < ny; j++) {","for (let j = 0; j < ny; j++) {\n      if(z>=10)yield;")
g=g.replace("for (let i = 0; i < nx; i++) {","for (let i = 0; i < nx; i++) {\n        if(z>=10&&(i%8===0))yield;")
# Marine polygon builder is deterministic; yield between each source polygon.
g,n=re.subn(r"(for\s*\(const f of waterFeatures\)\s*\{)",r"\1\n      if(z>=10)yield;",g,count=1)
if n!=1:raise SystemExit('missing marine polygon loop')
g=g.replace("const flowCount = makeRibbon(","if(z>=10)yield;\n    const flowCount = makeRibbon(",1)
# All mesh swaps happen on one frame, using the same origin and shader as before.
g=g.replace("if(worldView){\n      api.coastalSurfaceActive=false;","if(z>=10)yield;\n    if(worldView){\n      api.coastalSurfaceActive=false;",1)
s=s[:a]+g+s[b:]
# Start loading replacements during close zoom rather than waiting a full
# second after a gesture. Cancel only jobs whose camera footprint is stale.
s=one(s,"map.on('movestart', e => { moving = !e?.bpPublicIdleSpin; });","""map.on('movestart', e => { moving = !e?.bpPublicIdleSpin;if(moving&&activeWaterJob&&map.getZoom()>=10)abortWaterJob(); });
  map.on('move',()=>{
    if(!api.active||!api.enabled||map.getZoom()<10||!moving)return;
    const now=performance.now();if(now-lastInteractiveBuild<150)return;
    lastInteractiveBuild=now;
    if(activeWaterJob&&!compatibleWaterCamera(activeWaterJob.stamp,waterCameraStamp()))abortWaterJob();
    scheduleBuild(0,'interactive');
  });""")
s=one(s,"map.on('moveend', e => { moving = false; scheduleBuild(e?.bpPublicIdleSpin?180:420,e?.bpPublicIdleSpin?'background':'camera'); });","map.on('moveend', e => { moving = false; scheduleBuild(e?.bpPublicIdleSpin?180:map.getZoom()>=10?40:420,e?.bpPublicIdleSpin?'background':'camera'); });")
# Don't reread style and repeatedly schedule installs on each idle callback.
# The existing renderer already owns the complete validated buffer.
s=one(s,"if (!api.active || destroyed || installing || !mapCanHostWater()) return;","if (!api.active || destroyed || installing) return;\n    if(layer?.gl&&map.getLayer(LAYER_ID)&&api.sourceAnchorLayersPresent===4)return;\n    if(!mapCanHostWater())return;")
assert shaders(s)==original_shader,'approved water shaders changed'
for rel in (water,'app/'+water):write(rel,s)
s=read(ship)
s=one(s,'const VERSION=3;','const VERSION=4;')
# Preserve exact existing hull generation, name geometry, glass shader, motion
# and meter-scale transforms. Optimize only scheduling and allocations.
a=s.index('function makeShipGeometry(');b=s.index('function ensureMesh(',a);hull=s[a:b]
a=s.index('function hullNameGeometry(');b=s.index('function updateModels(',a);namesmotion=s[a:b]
s=one(s,"let modelPlacements=[],iconSignature='',lastMotion=0,motionFrames=0,nameCount=0,visibleModels=0,iconCount=0;","""let modelPlacements=[],iconSignature='',lastMotion=0,motionFrames=0,nameCount=0,visibleModels=0,iconCount=0;
let lastDataRefresh=0,lastCameraRefresh=0,trackSignature='',pendingData=false,updateTimer=0,placementRevision=0,lastAnimatedRevision=-1,lastAnimationOrigin='',vesselDataReads=0,trackUploads=0;
""")
# Track buffers are unchanged when no new AIS position has arrived.
s=one(s,"try{map.getSource(TRAIL_SOURCE)?.setData({type:'FeatureCollection',features:lines});map.getSource(TRAIL_DOT_SOURCE)?.setData({type:'FeatureCollection',features:dots})}catch(_){}","""const signature=lines.map(f=>f.id+':'+f.geometry.coordinates.map(p=>p.join(',')).join(';')).join('|');
 if(signature!==trackSignature){try{map.getSource(TRAIL_SOURCE)?.setData({type:'FeatureCollection',features:lines});map.getSource(TRAIL_DOT_SOURCE)?.setData({type:'FeatureCollection',features:dots});trackSignature=signature;trackUploads++}catch(_){}}""")
# Reallocate instance storage only on geometric capacity growth, retaining
# the expensive hull geometry and material rather than rebuilding it.
s=one(s,"if(entry){try{scene?.remove(entry.mesh);entry.geometry.dispose();entry.material.dispose()}catch(_){}templates.delete(kind)}","""if(entry){
  const size=Math.max(8,2**Math.ceil(Math.log2(capacity)));
  const old=entry.mesh,mesh=new THREE.InstancedMesh(entry.geometry,entry.material,size);
  mesh.name=old.name;mesh.count=0;mesh.frustumCulled=false;mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.remove(old);old.dispose?.();scene.add(mesh);entry.mesh=mesh;entry.capacity=size;return entry;
 }""")
s=one(s,"visibleModels=modelPlacements.length;return visibleModels;","visibleModels=modelPlacements.length;placementRevision++;return visibleModels;")
# A stable geographic origin retains full numerical precision and prevents
# rebuilding every vessel transform for tiny camera movements.
s=one(s,"const localOrigin=planar&&MC?MC.fromLngLat(map.getCenter(),0):null;","""const c=planar&&MC?MC.fromLngLat(map.getCenter(),0):null;
   const localOrigin=c?{x:Math.round(c.x*8192)/8192,y:Math.round(c.y*8192)/8192}:null;""")
s=one(s,"lastMotion=performance.now();animateModels(lastMotion/1000,args,localOrigin);","""const now=performance.now(),originKey=localOrigin?localOrigin.x+':'+localOrigin.y:'globe';
   if(now-lastMotion>=32||placementRevision!==lastAnimatedRevision||originKey!==lastAnimationOrigin){
     lastMotion=now;animateModels(now/1000,args,localOrigin);
     lastAnimatedRevision=placementRevision;lastAnimationOrigin=originKey;
   }""")
# Separate source/track refresh from camera placement. Eliminate the idle ->
# setData -> idle loop. Camera updates reuse cached AIS points.
a=s.index('function scheduleUpdate(){');b=s.index('function refreshTiles(',a)
s=s[:a]+"""function scheduleUpdate(reason='data'){
 if(!enabled||!map)return;
 const isCamera=reason==='camera';
 if(!isCamera)pendingData=true;
 if(updateTimer)return;
 const now=performance.now(),delay=isCamera?Math.max(0,100-(now-lastCameraRefresh)):Math.max(0,650-(now-lastDataRefresh));
 updateTimer=setTimeout(()=>{
  updateTimer=0;if(!enabled||!map)return;
  const now=performance.now(),moving=!!map.isMoving?.();
  let readData=pendingData&&(!moving||!lastRecords.length)&&now-lastDataRefresh>=600;
  if(readData){
    pendingData=false;lastDataRefresh=now;vesselDataReads++;
    const records=recordsFromTiles();lastRecords=records;updateTracks(records);updatePersistentIcons(records);
  }
  let models=visibleModels;
  if(readData||now-lastCameraRefresh>=95){
    lastCameraRefresh=now;
    try{models=updateModels(lastRecords)}catch(error){console.warn('BridgePoint vessel placement deferred',error)}
  }
  if(readData){
    refreshSummary(lastRecords,models);
    if(lastRecords.length){sourceReady=true;showStatus('Live AIS vessel tiles loaded · '+lastRecords.length.toLocaleString()+' vessels · '+models.toLocaleString()+' 3D models in view.','ok')}
    else if(!sourceReady)showStatus('Vessel layer is enabled. Waiting for public AIS vector tiles.','info');
  }
  if(pendingData&&!moving)scheduleUpdate('data');
 },delay);
}
"""+s[b:]
s=one(s,"map.on?.('sourcedata',onSource);map.on?.('idle',scheduleUpdate);map.on?.('moveend',scheduleUpdate);map.on?.('zoomend',scheduleUpdate);","""map.on?.('sourcedata',onSource);
  map.on?.('move',()=>scheduleUpdate('camera'));
  map.on?.('moveend',()=>{scheduleUpdate('camera');if(pendingData)scheduleUpdate('data')});
  map.on?.('idle',()=>{if(enabled&&pendingData)scheduleUpdate('data')});""")
# Do not invalidate all provider tiles twice on every periodic refresh.
s=one(s,"const s=map.getSource(SOURCE);if(s&&typeof s.setTiles==='function'&&s.tiles?.length)s.setTiles(s.tiles);","const s=map.getSource(SOURCE);if(typeof map.refreshTiles!=='function'&&force&&s&&typeof s.setTiles==='function'&&s.tiles?.length)s.setTiles(s.tiles);")
s=one(s,"physicalScale:true,localPrecisionModels:true,waterSurfaceCoupled:true","physicalScale:true,localPrecisionModels:true,waterSurfaceCoupled:true,vesselDataReads,trackUploads,placementRevision")
assert s[s.index('function makeShipGeometry('):s.index('function ensureMesh(')]==hull
assert s[s.index('function hullNameGeometry('):s.index('function updateModels(')]==namesmotion
for rel in (ship,'app/'+ship):
 if (site/rel).is_file():write(rel,s)
for rel in ('landing.js','app.js'):
 old=read(rel);new,n=re.subn(re.escape(water)+r'\?v=[^\s\x22\x27)]+',water+'?v='+key,old)
 if n<1:raise SystemExit('missing water import '+rel)
 write(rel,new)
for rel,stem in [('index.html','landing.js'),('app/index.html','app.js')]:
 old=read(rel);new,n=re.subn(r'('+re.escape(stem)+r'\?v=)[^&\s\x22\x27]+',lambda m:m.group(1)+key,old,count=1)
 if n!=1:raise SystemExit('missing entry cache key '+rel)
 new,n=re.subn(re.escape(ship)+r'\?v=[^&\s\x22\x27]+',ship+'?v='+key,new)
 if n<1:raise SystemExit('missing vessel import '+rel)
 write(rel,new)
if snap()!=before:raise SystemExit('UNRELATED PRODUCTION FILE CHANGED')
assert (site/water).read_bytes()==(site/'app'/water).read_bytes()
print('FLUID_NAVIGATION_SCOPE_PASS',len(before),'unchanged files; water shaders, hulls, names and motion functions byte-identical')
