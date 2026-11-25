from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1])
tracker='bridgepoint-drone-awareness-v1.js'
visual='bridgepoint-aircraft-visuals-v2.js'
dock='bridgepoint-view-v5917.js'
key='aircraft-lights-cloudwake-v20261125-v10'
allowed={'index.html','app/index.html',tracker,'app/'+tracker,visual,'app/'+visual,dock,'app/'+dock}
def snap():
 return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('AIRCRAFT_V10_ANCHOR '+str(s.count(a))+' '+a[:160])
 return s.replace(a,b,1)
def patch_tracker(s):
 assert 'followGroundVersion:8' in s and 'installPersistentFlightMarkers' in s and 'aircraftrestore' not in s[:100], 'Wrong aircraft baseline'
 # Native source/marker recovery stays independent of Three.js.
 s=one(s,'function installLayer(){','''function repairAircraftMarkerLayers(){
  if(!enabled||!mapStyleReady())return false;
  const missing=[SOURCE,AIRCRAFT_SOURCE].some(id=>!map.getSource(id))||
   [LAYER,AIRCRAFT_LAYER,AIRCRAFT_MARKER_BACKING,DRONE_MARKER_BACKING].some(id=>!map.getLayer(id));
  if(missing){
   if(!installLayer())return false;
   flightFilterStamp='';
   const fc=(records,kind)=>({type:'FeatureCollection',features:records.map(a=>({type:'Feature',geometry:{type:'Point',coordinates:[a.lon,a.lat]},properties:aircraftFeatureProperties(a,kind==='drone'?'drone':DroneCore.aircraftKindForRecord(a))}))});
   try{map.getSource(SOURCE)?.setData(fc(lastCurrentRecords,'drone'));map.getSource(AIRCRAFT_SOURCE)?.setData(fc(lastCurrentAircraftRecords,'aircraft'))}catch(e){console.warn('Aircraft marker recovery',e)}
  }
  allowedCategories.add('drones');syncAircraftFilterVisibility(true);
  return true;
 }
 let bpAircraftRepairTimer=0;
 function startAircraftMarkerRecovery(){
  clearInterval(bpAircraftRepairTimer);
  bpAircraftRepairTimer=setInterval(()=>{
   if(!enabled||document.hidden)return;
   if(worldMap()!==map||!map)tryBoot();
   if(!mapStyleReady())return;
   repairAircraftMarkerLayers();
   if(activationQueued&&!activationPromise)void activateWhenStyleReady();
   if(!inFlight&&Date.now()-lastFetchAt>=REFRESH_MS)void refresh(false);
  },2500);
 }
 function installLayer(){''')
 # Preserve recent *observed* positions during partial regional batches, without inventing coordinates or extending observation history.
 for name in ('trackedUavs','trackedAircraft'):
  old='const accepted=[...'+name+'.entries()].filter(([key,track])=>active.has(key)&&track.current).map(([,track])=>track.current);'
  new='const accepted=[...'+name+'.entries()].filter(([key,track])=>track.current&&(active.has(key)||now-track.lastSeen<Math.max(60000,REFRESH_MS+60000))).map(([,track])=>track.current);'
  s=one(s,old,new)
 s=one(s,"async function fetchGlobalSamples(){","async function fetchGlobalSamples(){\n const bpSampleGeneration=activationGeneration;")
 s=one(s,"if(enabled&&batch.some(x=>x.ok)){","if(enabled&&bpSampleGeneration===activationGeneration&&batch.some(x=>x.ok)){")
 s=one(s,"const refreshGeneration=activationGeneration;const samples=await fetchGlobalSamples();","const samples=await fetchGlobalSamples();")
 s=one(s,"inFlight=true;lastFetchAt=Date.now();","const refreshGeneration=activationGeneration;inFlight=true;lastFetchAt=Date.now();")
 s=one(s,"if(!enabled)return;\n  diagnosticState.hasSuccessfulSource=","if(!enabled||refreshGeneration!==activationGeneration)return;\n  diagnosticState.hasSuccessfulSource=")
 s=one(s,"}finally{inFlight=false;if(refreshButton)refreshButton.disabled=false;if(enabled&&lastFetchAt===0)scheduleViewportRefresh()}","}finally{inFlight=false;if(refreshButton)refreshButton.disabled=false;if(enabled){repairAircraftMarkerLayers();if(refreshGeneration!==activationGeneration)lastFetchAt=0;if(lastFetchAt===0)scheduleViewportRefresh()}}")
 s=one(s,"lastFetchAt=0;allowedCategories.add('drones');diagnosticState.sourceStatus='waiting';","lastFetchAt=0;allowedCategories.add('drones');startAircraftMarkerRecovery();diagnosticState.sourceStatus='waiting';")
 s=one(s,"enabled=false;activationGeneration++;activationQueued=false;","enabled=false;clearInterval(bpAircraftRepairTimer);bpAircraftRepairTimer=0;activationGeneration++;activationQueued=false;")
 # Reinstall native positions before 3D loading after a style/context replacement.
 s=one(s,"if(!installLayer()){activationQueued=true;","if(!repairAircraftMarkerLayers()||!installLayer()){activationQueued=true;")
 # A true jet receives exhaust cloud wakes; unknown generic fixed-wing uses representative twinjet geometry.
 s=one(s,"if(!grounded&&detail&&kind==='jet'&&altitude.meters>=6500","if(!grounded&&detail&&(kind==='jet'||kind==='airplane')&&altitude.meters>=4500")
 s=one(s,"r=.095+.34*u+Math.sin(u*29+y)*.035*u","r=.12+.68*Math.pow(u,.65)+Math.sin(u*39+y)*.085*u")
 s=one(s,"p.push(-.24-u*55,y+Math.cos(a)*r,-.17+Math.sin(a)*r)","p.push(-.27-u*65,y+Math.cos(a)*r,-.17+Math.sin(a)*r)")
 s=one(s,"float n=.68+.22*sin(vUv.x*115.-uTime*2.+sin(vUv.y*25.))+.10*sin(vUv.x*239.+vUv.y*19.-uTime*3.);float a=smoothstep(0.,.035,vUv.x)*pow(1.-vUv.x,.65)*edge*n*.72;gl_FragColor=vec4(vec3(.86,.94,1.),a);","float n=.66+.20*sin(vUv.x*144.-uTime*3.4+sin(vUv.y*31.))+.14*sin(vUv.x*281.+vUv.y*23.-uTime*4.1);float billow=smoothstep(.12,.9,n);float a=smoothstep(0.,.012,vUv.x)*pow(1.-vUv.x,.48)*pow(edge,.62)*(.38+.62*billow)*.91;gl_FragColor=vec4(mix(vec3(.70,.77,.83),vec3(.99,.99,1.),billow),a);")
 s=one(s,"varying vec2 vUv;varying vec3 vN;varying vec3 vV;void main(){vUv=uv;vN=normalize(normalMatrix*normal);vec4 mv=modelViewMatrix*vec4(position,1.);","varying vec2 vUv;varying vec3 vN;varying vec3 vV;uniform float uTime;void main(){vUv=uv;vN=normalize(normalMatrix*normal);vec3 p=position;float wobble=sin(uv.x*51.-uTime*3.2+uv.y*6.283)*.10*uv.x;p.y+=wobble;p.z+=cos(uv.x*46.-uTime*2.8)*.15*uv.x;vec4 mv=modelViewMatrix*vec4(p,1.);")
 # Use one flashing LED per motor, all daylight conditions, independent of sun angle.
 s=one(s,"model.traverse(o=>{if(o.name==='bp-drone-night-led')o.visible=afterDark});","model.traverse(o=>{if(o.name==='bp-drone-night-led')o.visible=true});")
 s=one(s,"if(o.name==='bp-drone-rotor')o.rotation.z+=.38","if(o.name==='bp-drone-rotor')o.rotation.z+=.38;if(o.name==='bp-drone-night-led')o.visible=(now%1100)<180")
 s=one(s,"new THREE.SphereGeometry(.045,8,6),lampMat","new THREE.SphereGeometry(.066,10,8),lampMat")
 s=re.sub(r'(bridgepoint-aircraft-visuals-v2\.js\?v=)[^\'"]+',lambda m:m[1]+key,s,count=1)
 return s
def patch_visual(v):
 v=one(v,'export const AIRCRAFT_VISUAL_VERSION=8;','export const AIRCRAFT_VISUAL_VERSION=10;')
 v=one(v,"geom.userData.bpAirframeVersion=8;","geom.userData.bpAirframeVersion=10;")
 v=one(v,"if(kind==='jet'){\n   const engines=","if(kind==='jet'||kind==='airplane'){\n   const engines=")
 v=one(v,"}else if(kind==='propeller'||kind==='airplane'){","}else if(kind==='propeller'){")
 # The actual turbine fan pivot remains in each annular underwing nacelle.
 v=one(v,"for(let i=0;i<16;i++){\n     const phi=i*Math.PI*2/16;","for(let i=0;i<24;i++){\n     const phi=i*Math.PI*2/24;")
 v=one(v,".010,palette.silver,3,pivot);",".008,palette.silver,3,pivot);")
 v=one(v,"new T.SphereGeometry(.041,9,6)","new T.SphereGeometry(mode>=5?.052:.041,12,8)")
 v=one(v,"lamp(-long*.85,0,.18,palette.white,3);","""lamp(-long*.85,0,.18,palette.white,3);
  lamp(.02,0,fat+.025,palette.red,5);
  lamp(.05,0,-fat-.02,palette.red,5);
  for(const side of [-1,1]){
   lamp(-.27,side*ws*.98,-.045,palette.white,6);
   lamp(.32,side*.32,-.095,palette.white,7);
  }
  lamp(long*.85,0,-fat*.58,palette.white,7);""")
 v=one(v,"lamp(-.92,0,.20,palette.white,3);","""lamp(-.92,0,.20,palette.white,3);
  lamp(-.20,0,.44,palette.red,5);
  lamp(-.18,0,-.32,palette.red,5);
  lamp(.25,.31,.035,palette.white,6);
  lamp(.25,-.31,.035,palette.white,6);
  lamp(.76,0,-.21,palette.white,7);""")
 v=one(v,"sphere(.23,0,.03,.09,.10,.08,palette.glass,10);","sphere(.23,0,.03,.09,.10,.08,palette.glass,10);lamp(.08,0,.22,palette.white,6);")
 # Separate steady navigation, red anti-collision, double white strobe, night-only landing lamps and cabin/burner.
 a=v.index("'if(vBpBeacon>0.5){vec3 lamp=")
 b=v.index(";}');",a)+2
 v=v[:a]+"""'if(vBpBeacon>0.5){float mode=vBpBeacon;float phase=fract(bpFlightTime*.92);float strobe=1.-smoothstep(.065,.105,phase);strobe=max(strobe,(smoothstep(.15,.17,phase)*(1.-smoothstep(.22,.26,phase))));float redPulse=1.-smoothstep(.10,.17,fract(bpFlightTime*.79));vec3 lamp=mode<1.5?vec3(1.,.025,.01):mode<2.5?vec3(.05,1.,.20):mode<3.5?vec3(1.,1.,.92):mode<4.5?vec3(1.,.55,.12):mode<5.5?vec3(1.,.025,.012):vec3(1.,.98,.90);float power=mode<3.5?(.85+2.4*vBpDark):mode<4.5?2.3:mode<5.5?redPulse*7.:mode<6.5?strobe*9.:vBpDark*7.;totalEmissiveRadiance+=lamp*power;}'"""+v[b+1:]
 # Preserve existing shader/glare and instance attributes; change cache key only.
 v=one(v,'bp-airframe-colored-rotors-lights-v8','bp-airframe-colored-rotors-lights-v10')
 return v
def patch_dock(s):
 pat=r'<button\b[^>]*data-bp-horizon-gate="1"[^>]*>[\s\S]*?</button>'
 def lock(m):
  b=m[0]
  b=re.sub(r'\s(?:aria-disabled|title|data-bpv-action|style)="[^"]*"','',b)
  b=re.sub(r'\sdisabled(?:="[^"]*")?(?=\s|>)','',b)
  b=b.replace('data-bp-horizon-gate="1"','data-bp-horizon-gate="1" disabled aria-disabled="true" title="Horizon locked for development" style="position:relative"')
  b=re.sub(r'<small[^>]*class="bpv-horizon-launch-state"[^>]*>[\s\S]*?</small>','',b)
  return b.replace('</button>','<span aria-hidden="true" style="position:absolute;inset:0;display:grid;place-items:center;font-size:20px;opacity:1;pointer-events:none;text-shadow:0 1px 5px #000">🔒</span></button>')
 s,n=re.subn(pat,lock,s)
 assert n==1,('Horizon lock',n)
 # Keep the entire game and launch code intact, but the disabled control has no active route.
 s=re.sub(r"\n dock\.querySelector\('\[data-bp-horizon-gate=\"1\"\]'\)\.addEventListener\('click',\(\)=>location\.assign\('/app/horizon/survival/'\)\);",'',s)
 s=s.replace('Free browser survival preview','Horizon locked for development')
 return s
for name,patch in [(tracker,patch_tracker),(visual,patch_visual),(dock,patch_dock)]:
 for rel in (name,'app/'+name):
  p=site/rel
  if p.exists():p.write_text(patch(p.read_text()))
for rel in ('index.html','app/index.html'):
 p=site/rel;s=p.read_text()
 for name in (tracker,dock):
  s,n=re.subn(r'('+re.escape(name)+r'\?[^"\'\s<>]+)',lambda m:m[1]+'&aircraftlock='+key,s)
  assert n>=1,(rel,name)
 p.write_text(s)
assert before==snap(),'Unexpected non-aircraft/Horizon-lock file changed'
print('AIRCRAFT_V10_HORIZON_LOCK_BYTE_PRESERVATION_PASS',len(before))
