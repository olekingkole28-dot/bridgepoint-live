from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1])
tracker='bridgepoint-drone-awareness-v1.js'
visual='bridgepoint-aircraft-visuals-v2.js'
key='aircraft-close-detail-v20261124-v7'
allowed={tracker,'app/'+tracker,visual,'app/'+visual,'index.html','app/index.html'}
def snapshot():
 return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snapshot()
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('AIRCRAFT_ANCHOR '+str(s.count(a))+' '+a[:140])
 return s.replace(a,b,1)
s=(site/tracker).read_text()
assert 'installPersistentFlightMarkers' in s and 'flightLodStats' in s
# Project actual span into the same altitude-aware camera used to draw the
# models. A high-altitude close flyby is not equivalent to ground map zoom.
s=one(s,"function queueFlightModels(){",'''function flightProjectedSpan(position,meterUnit,span,estimate){
 const p=flightScreenPoint(position);if(!p||!Number.isFinite(p.x))return estimate;
 let best=0;for(const k of ['x','y','z']){
  const q=flightScreenPoint({...position,[k]:position[k]+meterUnit*span});
  if(q&&Number.isFinite(q.x))best=Math.max(best,Math.hypot(q.x-p.x,q.y-p.y));
 }
 return best>0?best:estimate;
}
function queueFlightModels(){''')
s=one(s,"detailLimit=mobile?5:12","detailLimit=mobile?7:16")
s=one(s,"const detail=visualScale.px>=20&&flightLodStats.detail<detailLimit;","const projectedPx=flightProjectedSpan(position,meterUnit,physicalSpan,visualScale.px);\n  const detail=(projectedPx>=8||zoom>=10)&&flightLodStats.detail<detailLimit;")
# Use true physical dimensions for all close detail and never switch a close
# model back to the enlarged locator merely because the ground zoom changed.
s=one(s,"const scale=((detail?span:visualScale.display)/ref)*meterUnit;","const scale=((detail||zoom>=12?span:visualScale.display)/ref)*meterUnit;")
s=one(s,"if(detail&&kind==='jet'&&altitude.meters>=7000&&zoom>=7&&effects.length<(mobile?4:10))","if(detail&&kind==='jet'&&altitude.meters>=6500&&(zoom>=7||projectedPx>=8)&&effects.length<(mobile?6:12))")
s=one(s,"const amp=item.kind==='balloon'?.6:item.kind==='helicopter'?.35:.16;","const amp=item.kind==='balloon'?1.5:item.kind==='helicopter'?.85:.35;")
s=one(s,".24*model.userData.bpMeterUnit",".65*model.userData.bpMeterUnit")
s=one(s,"model.scale.setScalar((vs.display/1.76)*meterUnit);","model.scale.setScalar(((zoom>=12?span:vs.display)/1.76)*meterUnit);")
# Screen-space thick rods: WebGL lineWidth is commonly clamped to one pixel.
# Batched quads keep both endpoints anchored in the original 3D coordinates.
a=s.index('  const xyz=[],progress=[];',s.index('function replaceTetherGroup'))
b=s.index("lines.name='Solid vertical ground-to-aircraft tether",a)
s=s[:a]+'''  const xyz=[],other=[],sides=[],progress=[],indices=[];
  for(let i=0;i<positions.length;i+=6){
   const a=[positions[i]-flightOrigin.x,positions[i+1]-flightOrigin.y,positions[i+2]],b=[positions[i+3]-flightOrigin.x,positions[i+4]-flightOrigin.y,positions[i+5]],o=xyz.length/3;
   xyz.push(...a,...a,...b,...b);other.push(...b,...b,...a,...a);sides.push(-1,1,1,-1);progress.push(0,0,1,1);indices.push(o,o+1,o+2,o+1,o+3,o+2);
  }
  const geometry=new droneThree.BufferGeometry();geometry.setAttribute('position',new droneThree.Float32BufferAttribute(xyz,3));geometry.setAttribute('aOther',new droneThree.Float32BufferAttribute(other,3));geometry.setAttribute('aSide',new droneThree.Float32BufferAttribute(sides,1));geometry.setAttribute('aProgress',new droneThree.Float32BufferAttribute(progress,1));geometry.setIndex(indices);
  const cv=map.getCanvas();
  const material=new droneThree.ShaderMaterial({transparent:true,side:droneThree.DoubleSide,depthTest:true,depthWrite:false,uniforms:{uTime:{value:0},uColor:{value:new droneThree.Color(aircraftColor(kind))},uViewport:{value:new droneThree.Vector2(cv.clientWidth||1,cv.clientHeight||1)}},vertexShader:'attribute vec3 aOther;attribute float aSide;attribute float aProgress;varying float vP;varying float vEdge;uniform vec2 uViewport;void main(){vP=aProgress;vEdge=aSide;vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.);vec4 q=projectionMatrix*modelViewMatrix*vec4(aOther,1.);vec2 d=(q.xy/max(abs(q.w),0.000001)-p.xy/max(abs(p.w),0.000001))*uViewport;vec2 n=vec2(-d.y,d.x)/max(length(d),0.000001);if(p.w>0.)p.xy+=n*aSide*4.0/uViewport*p.w;gl_Position=p;}',fragmentShader:'varying float vP;varying float vEdge;uniform float uTime;uniform vec3 uColor;void main(){float pulse=pow(max(0.,sin(6.2831853*(vP*5.-uTime*.85))),8.);float edge=1.-smoothstep(.65,1.,abs(vEdge));gl_FragColor=vec4(mix(uColor,vec3(.85,1.,1.),pulse),edge*(.72+.28*pulse));}'});
  const lines=new droneThree.Mesh(geometry,material);'''+s[b:]
# Keep rod resolution and glass view direction synchronized with this layer's
# actual projection without modifying any shared WebGL renderer.
s=one(s,"flightProjection=layer.camera.projectionMatrix.clone();","""flightProjection=layer.camera.projectionMatrix.clone();
   const inv=layer.camera.projectionMatrixInverse;
   const near=new THREE.Vector3(0,0,-.75).applyMatrix4(inv),far=new THREE.Vector3(0,0,.75).applyMatrix4(inv);
   const view=near.sub(far).normalize();
   for(const entry of aircraftTemplates.values())if(entry.rich)aircraftVisualModule?.updateAircraftView?.(entry.material,view);
   for(const group of [aircraftTetherGroup,droneTetherGroup])for(const o of group?.children||[])o.material?.uniforms?.uViewport?.value.set(mapRef.getCanvas().clientWidth||1,mapRef.getCanvas().clientHeight||1);""".replace('mapRef.getCanvas()','map.getCanvas()'))
# Assign source-derived operator tint to the existing colored detail surfaces,
# not to glass, windows or navigation lights.
s=one(s,"bucket.items.push({matrix,night,kind,scale,meterUnit,phase:","bucket.items.push({matrix,night,kind,scale,meterUnit,livery:design.operator?.color??0x386ea9,phase:")
s=one(s,"if(nightAttr)nightAttr.setX(i,item.night);","if(nightAttr){nightAttr.setX(i,item.night);const c=new droneThree.Color(item.livery);entry.geometry.getAttribute('aBpLivery')?.setXYZ(i,c.r,c.g,c.b);}")
s=one(s,"if(nightAttr)nightAttr.needsUpdate=true;","if(nightAttr){nightAttr.needsUpdate=true;const a=entry.geometry.getAttribute('aBpLivery');if(a)a.needsUpdate=true;}")
# Keep contrails attached to the rendered engine position; increase visible
# density, without generating contrail history or claiming a measured wake.
s=one(s,"pow(1.-vUv.x,.65)*edge*n*.42","pow(1.-vUv.x,.65)*edge*n*.72")
s=one(s,"r=.075+.25*u+Math.sin(u*29+y)*.022*u","r=.095+.34*u+Math.sin(u*29+y)*.035*u")
s=one(s,"mesh.userData.aircraftKind='jet';flightEffects.add(mesh);","mesh.userData.aircraftKind='jet';mesh.userData.flightBase=item.matrix.clone();mesh.userData.flightPhase=((item.aircraft._trackKey?.charCodeAt(0)||0)+(item.aircraft._trackKey?.charCodeAt(1)||0))*.37;mesh.userData.flightMeter=window.maplibregl.MercatorCoordinate.fromLngLat([Number(item.aircraft.lon),Number(item.aircraft.lat)],0).meterInMercatorCoordinateUnits();flightEffects.add(mesh);")
s=one(s,"for(const group of [aircraftTetherGroup,droneTetherGroup,flightEffects])","for(const o of flightEffects?.children||[]){if(o.userData.flightBase){o.matrix.copy(o.userData.flightBase);o.matrix.elements[14]+=Math.sin(now*.0016+o.userData.flightPhase)*.35*o.userData.flightMeter;o.matrixWorldNeedsUpdate=true;}}\n  for(const group of [aircraftTetherGroup,droneTetherGroup,flightEffects])")
s=one(s,"bridgepoint-aircraft-visuals-v2.js?v=aircraft-detail-flight-v20261124-v3","bridgepoint-aircraft-visuals-v2.js?v="+key)
s=one(s,"farLocatorMinPixels:8,","farLocatorMinPixels:8,closeDetailVersion:7,richModuleVersion:aircraftVisualModule?.AIRCRAFT_VISUAL_VERSION||0,")
for rel in (tracker,'app/'+tracker):
 if (site/rel).exists():(site/rel).write_text(s)
v=(site/visual).read_text()
v=one(v,'export const AIRCRAFT_VISUAL_VERSION=3;','export const AIRCRAFT_VISUAL_VERSION=7;')
v=one(v,"geom.userData.bpAirframeVersion=3;","geom.userData.bpAirframeVersion=7;")
v=one(v,"glass=new Float32Array(total),","glass=new Float32Array(total),trim=new Float32Array(total),")
v=one(v,"glass[j]=p.color.equals(new T.Color(palette.glass))?1:0;","glass[j]=p.color.equals(new T.Color(palette.glass))?1:0;trim[j]=p.color.equals(new T.Color(palette.blue))?1:0;")
v=one(v,"geom.setAttribute('aBpGlass',new T.BufferAttribute(glass,1));","geom.setAttribute('aBpGlass',new T.BufferAttribute(glass,1));geom.setAttribute('aBpTrim',new T.BufferAttribute(trim,1));")
v=one(v,"shader.uniforms.bpFlightTime={value:0};","shader.uniforms.bpFlightTime={value:0};shader.uniforms.bpViewDir={value:new T.Vector3(0,-1,1).normalize()};shader.uniforms.bpMapView={value:0};")
v=one(v,r"attribute float aBpGlass;\nvarying float vBpGlass;",r"attribute float aBpGlass;\nattribute float aBpTrim;\nattribute vec3 aBpLivery;\nvarying float vBpGlass;\nvarying float vBpTrim;\nvarying vec3 vBpLivery;")
v=one(v,"vBpGlass=aBpGlass;","vBpGlass=aBpGlass;vBpTrim=aBpTrim;vBpLivery=aBpLivery;")
v=one(v,r"varying float vBpGlass;\nuniform float bpFlightTime;');",r"varying float vBpGlass;\nvarying float vBpTrim;\nvarying vec3 vBpLivery;\nuniform vec3 bpViewDir;\nuniform float bpMapView;\nuniform float bpFlightTime;');")
v=one(v," shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',"," shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\\ndiffuseColor.rgb=mix(diffuseColor.rgb,vBpLivery,vBpTrim*.90);');\n shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',")
v=one(v,"'if(vBpBeacon>0.5){vec3 lamp=","'vec3 bpV=normalize(mix(normalize(vViewPosition),bpViewDir,bpMapView));float bpF=pow(1.-abs(dot(normalize(normal),bpV)),2.);float bpSpec=pow(max(0.,dot(reflect(-normalize(vec3(-.45,-.2,1.)),normalize(normal)),bpV)),20.);totalEmissiveRadiance+=vBpGlass*(vec3(.25,.62,.88)*(.18+bpF*.8)+vec3(1.,.98,.88)*bpSpec*1.6);'+\n   'if(vBpBeacon>0.5){vec3 lamp=")
v=one(v,"bp-airframe-colored-rotors-lights-v3","bp-airframe-colored-rotors-lights-v7")
v=one(v,"geom.setAttribute('aBpNight',new T.InstancedBufferAttribute(new Float32Array(Math.max(1,capacity)),1));","geom.setAttribute('aBpNight',new T.InstancedBufferAttribute(new Float32Array(Math.max(1,capacity)),1));const c=new T.Color(0x386ea9),livery=new Float32Array(Math.max(1,capacity)*3);for(let i=0;i<livery.length;i+=3){livery[i]=c.r;livery[i+1]=c.g;livery[i+2]=c.b;}geom.setAttribute('aBpLivery',new T.InstancedBufferAttribute(livery,3));")
v=one(v,"export function updateAircraftShader(material,seconds){","export function updateAircraftView(material,view){const u=material?.userData?.bpFlightShader?.uniforms;if(u?.bpViewDir){u.bpViewDir.value.copy(view);u.bpMapView.value=1;}}\nexport function updateAircraftShader(material,seconds){")
for rel in (visual,'app/'+visual):
 if (site/rel).exists():(site/rel).write_text(v)
for rel in ('index.html','app/index.html'):
 p=site/rel;old=p.read_text();new,n=re.subn(r'('+re.escape(tracker)+r'\?[^"\s]+)',lambda m:m.group(1)+'&closeair='+key,old)
 if not n:raise SystemExit('missing aircraft cache reference '+rel)
 p.write_text(new)
assert snapshot()==before,'unrelated production file changed'
print('AIRCRAFT_CLOSE_DETAIL_SCOPE_PASS',len(before),'unchanged production files; existing markers untouched')
