from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1])
glob='bridgepoint-global-wind-rf-v1.js'
local='bridgepoint-volumetric-fields-v5978.js'
view='bridgepoint-view-v5917.js'
allowed={'index.html','app/index.html'}|{pre+n for pre in ('','app/') for n in (glob,local,view)}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def one(s,a,b):
 assert s.count(a)==1,('WIND_VISUAL_ANCHOR',a[:120],s.count(a))
 return s.replace(a,b,1)
block=r'''// Source-driven visual corridors, not measured jet boundaries.
export function jetTunnelDimensions(row){
 const speed=Number(row[4])||85;
 return {halfWidthM:clamp(24000+(speed-85)*170,24000,52000),halfHeightM:clamp(1800+(speed-85)*6,1800,3000),lengthDeg:clamp(15+speed*.065,20,31)};
}
export function jetSeverityColor(kmh){return kmh>=185?[1,.20,.12]:kmh>=130?[1,.83,.20]:[.24,1,.55];}
export function jetLocatorVisible(map,lon,lat){
 const tr=map.transform;
 if(typeof tr?.isLocationOccluded==='function'){
  try{if(tr.isLocationOccluded({lng:lon,lat}))return false;}catch(_){}
 }
 const projection=map.getProjection?.();
 if((projection?.type||projection?.name)==='globe'){
  const c=map.getCenter?.();
  if(c){const p=lat*R,q=c.lat*R,d=(lon-c.lng)*R;
   if(Math.sin(p)*Math.sin(q)+Math.cos(p)*Math.cos(q)*Math.cos(d)<=0)return false;
  }
 }
 return true;
}
export function streamGeometry(T,map,rows,kind,zoom){
 const positions=[],colors=[],progress=[],phase=[],indices=[],strength=[],cross=[],sway=[];
 const isJet=kind==='jet',mobile=typeof window!=='undefined'&&window.innerWidth<700;
 const selected=isJet?rows.filter(r=>r[4]>=85&&r[6]>5000):visibleSamples(map,rows,false,zoom);
 let built=0;
 const push=(v,c,t,p,k,u,offset)=>{
  positions.push(v.x,v.y,v.z);colors.push(...c);progress.push(t);phase.push(p);strength.push(k);cross.push(u);
  sway.push(offset?.x||0,offset?.y||0,offset?.z||0);
 };
 for(let i=0;i<selected.length;i++){
  const row=selected[i],[lat,lon,surfaceKmh,surfaceFrom,jetKmh,jetFrom,jetHeight]=row;
  const speed=isJet?jetKmh:surfaceKmh,heading=(isJet?jetFrom:surfaceFrom)+180;
  const color=isJet?jetSeverityColor(speed):windColor(speed),flow=clamp(speed/(isJet?190:65),.2,1.8);
  if(isJet){
   // Open elliptical cylindrical shell: no caps, no opaque core, fixed model height and radii.
   const d=jetTunnelDimensions(row),rings=mobile?64:88,sides=mobile?16:24,points=[];
   for(let k=0;k<=rings;k++){
    const t=k/rings,curve=3.4*Math.sin((t-.5)*Math.PI)*Math.sin(i*.77);
    const [p,l]=advance(lat,lon,heading+curve,(t-.5)*d.lengthDeg);
    const [p2,l2]=advance(lat,lon,heading+3.4*Math.sin((t+.001-.5)*Math.PI)*Math.sin(i*.77),(t-.5+.001)*d.lengthDeg);
    const dl=((l2-l+540)%360-180)*R;
    const tangent=Math.atan2(Math.sin(dl)*Math.cos(p2*R),Math.cos(p*R)*Math.sin(p2*R)-Math.sin(p*R)*Math.cos(p2*R)*Math.cos(dl))/R;
    const ring=[],taper=.84+.16*Math.sin(Math.PI*t);
    for(let j=0;j<=sides;j++){
     const a=j/sides*2*Math.PI,side=advance(p,l,tangent+90,Math.cos(a)*d.halfWidthM*taper/111200);
     const v=worldAt(T,map,side[1],side[0],jetHeight+Math.sin(a)*d.halfHeightM*taper);
     if(!v)break;ring.push(v);
    }
    if(ring.length!==sides+1)break;points.push(ring);
   }
   if(points.length!==rings+1)continue;
   const start=positions.length/3;built++;
   for(let k=0;k<=rings;k++)for(let j=0;j<=sides;j++)push(points[k][j],color,k/rings,i*.173,flow,j/sides,null);
   for(let k=0;k<rings;k++)for(let j=0;j<sides;j++){
    const b=start+k*(sides+1)+j,n=b+sides+1;indices.push(b,n,b+1,b+1,n,n+1);
   }
   continue;
  }
  const lanes=mobile?9:13,segments=mobile?24:36;
  const width=zoom<7?42000*clamp(Math.pow(2,3-zoom),.10,1):clamp(950*Math.pow(2,8-zoom),1.4,950);
  const travel=clamp(1.9*Math.pow(2,7-zoom)*(.82+speed/125),.0014,28);
  for(let lane=0;lane<lanes;lane++){
   const shift=(lane-(lanes-1)/2)/Math.max(1,lanes-1),lateral=(zoom<7?2.8:Math.min(.3,travel*.45))*shift,line=[];
   for(let k=0;k<=segments;k++){
    const t=k/segments,curl=Math.sin(t*8.3+i*1.4+lane*.9)*.42+Math.sin(t*17+lane)*.12;
    const [p,l]=advance(lat+lateral,lon,heading+curl*12,(t-.5)*travel);
    const ground=Number(map.queryTerrainElevation?.([l,p],{exaggerated:false}))||0,altitude=ground+10+8*Math.max(0,Math.sin(t*11+i+lane*.6));
    const c=worldAt(T,map,l,p,altitude);
    const a=advance(p,l,heading+90,width/111200),b=advance(p,l,heading+90,-width/111200);
    const edgeA=worldAt(T,map,a[1],a[0],altitude+3),edgeB=worldAt(T,map,b[1],b[0],altitude+3);
    if(!c||!edgeA||!edgeB)break;
    line.push([edgeB,c,edgeA,edgeA.clone().sub(edgeB).multiplyScalar(.32)]);
   }
   if(line.length!==segments+1)continue;
   const start=positions.length/3;
   for(let k=0;k<=segments;k++)for(let j=0;j<3;j++)push(line[k][j],color,k/segments,lane*.43+i*.17,flow,j/2,line[k][3]);
   for(let k=0;k<segments;k++)for(let j=0;j<2;j++){const b=start+k*3+j;indices.push(b,b+1,b+3,b+1,b+4,b+3);}
  }
 }
 const geo=new T.BufferGeometry();
 for(const [name,arr,n] of [['position',positions,3],['color',colors,3],['aProgress',progress,1],['aPhase',phase,1],['aStrength',strength,1],['aCross',cross,1],['aSway',sway,3]])geo.setAttribute(name,new T.Float32BufferAttribute(arr,n));
 geo.setIndex(indices);geo.userData.openTunnel=isJet;geo.userData.tunnelCount=isJet?built:0;return geo;
}
function ribbonMaterial(T,jet){
 return new T.ShaderMaterial({
  uniforms:{uTime:{value:0},uOpacity:{value:.72},uJet:{value:jet?1:0}},
  vertexShader:`attribute vec3 color,aSway;
  attribute float aProgress,aPhase,aStrength,aCross;
  uniform float uTime,uJet;
  varying vec3 vColor;varying float vProg,vPhase,vStrength,vCross;
  void main(){vColor=color;vProg=aProgress;vPhase=aPhase;vStrength=aStrength;vCross=aCross;
   float whip=sin(aProgress*28.0-uTime*2.9+aPhase*7.0)*.65+sin(aProgress*61.0-uTime*4.1+aPhase*3.0)*.25;
   vec3 p=position+aSway*whip*sin(aProgress*3.14159)*(1.0-uJet);
   gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
  fragmentShader:`uniform float uTime,uOpacity,uJet;
  varying vec3 vColor;varying float vProg,vPhase,vStrength,vCross;
  void main(){
   float t=uTime*(.16+.25*vStrength);
   float flow=fract(vProg*9.0-t+vPhase);
   float pulse=pow(max(0.0,1.0-abs(flow*2.0-1.0)),2.0);
   float ends=smoothstep(0.0,.10,vProg)*(1.0-smoothstep(.90,1.0,vProg));
   float alpha;
   if(uJet>.5){
    float helix=pow(.5+.5*cos(6.28318*(vCross*5.0-vProg*9.0+t*.8+vPhase)),10.0);
    float threads=pow(.5+.5*cos(6.28318*(vCross*11.0+sin(vProg*22.0-t*4.0)*.22)),12.0);
    float rim=1.0-smoothstep(.0,.021,min(vProg,1.0-vProg));
    float border=pow(.5+.5*cos(6.28318*vCross*4.0),18.0);
    alpha=.045+.26*helix+.17*threads*pulse+.14*border+.52*rim;
   }else{
    float soft=pow(max(0.0,1.0-abs(vCross*2.0-1.0)),2.0);
    float wisp=pow(.5+.5*sin(vProg*54.0-t*11.0+vPhase*18.0+sin(vProg*21.0-t*6.0)),2.0);
    alpha=soft*ends*(.10+.75*pulse)*(.35+.65*wisp);
   }
   gl_FragColor=vec4(vColor,clamp(uOpacity*alpha,0.0,.85));
  }`,
  vertexColors:false,transparent:true,depthTest:true,depthWrite:false,side:T.DoubleSide,blending:T.NormalBlending
 });
}
'''
for pre in ('','app/'):
 p=site/(pre+glob);s=p.read_text()
 a=s.index('function streamGeometry(');b=s.index('export function initBridgePointGlobalWindRfV1(',a)
 s=s[:a]+block+s[b:]
 s=one(s,"const on=visible&&Number.isFinite(x)","const on=visible&&jetLocatorVisible(map,obj.row[1],obj.row[0])&&Number.isFinite(x)")
 s=one(s,"button.hidden=!on;if(on)","button.hidden=!on;button.style.display=on?'flex':'none';button.style.pointerEvents=on?'auto':'none';if(on)")
 s=one(s,"for(const obj of st.jetMarkers){\n   const screen=", "for(const obj of st.jetMarkers){\n   if(!st.windOn||!jetLocatorVisible(map,obj.row[1],obj.row[0]))continue;\n   const screen=")
 s=one(s,"if(st.windMesh){st.windMesh.geometry.dispose();st.scene.remove(st.windMesh);}","if(st.windMesh){st.windMesh.geometry.dispose();st.windMesh.material.dispose();st.scene.remove(st.windMesh);}")
 s=one(s,"if(st.jetMesh){st.jetMesh.geometry.dispose();st.scene.remove(st.jetMesh);}","if(st.jetMesh){st.jetMesh.geometry.dispose();st.jetMesh.material.dispose();st.scene.remove(st.jetMesh);}")
 s=one(s,"jet.name='Pressure-height matched moving jet-stream ribbons'","jet.name='Open hollow pressure-height jet tunnels with colored moving boundaries'")
 s=one(s,"jet.visible=st.windOn&&zoom<=18;","jet.visible=st.windOn;")
 a=s.index('const iconRows=zoom>=7');b=s.index('  st.jetMarkers=',a)
 s=s[:a]+"""const iconRows=Array.from(fast.sort((a,b)=>b[4]-a[4]).reduce((buckets,row)=>{
      const key=Math.floor((row[0]+90)/14)+':'+Math.floor((row[1]+180)/24);
      if(!buckets.has(key))buckets.set(key,row);
      return buckets;
     },new Map()).values()).slice(0,80);
"""+s[b:]
 s=one(s,"['Location method',row[7]?", "['Illustrative tunnel dimensions',Math.round(jetTunnelDimensions(row).halfWidthM*2/1000)+' km wide × '+(jetTunnelDimensions(row).halfHeightM*2/1000).toFixed(1)+' km tall; modeled boundaries, not observed jet edges'],\n   ['Location method',row[7]?")
 s=one(s,"const strength=clamp(Number(row[4])/230,.25,1.6),materials=[];","const strength=clamp(Number(row[4])/230,.25,1.6),materials=[];const tint=new T.Color(...jetSeverityColor(row[4]));\n   const shell=new T.CylinderGeometry(.95,.95,7.6,32,32,true);shell.rotateZ(Math.PI/2);const sm=new T.MeshBasicMaterial({color:tint,transparent:true,opacity:.12,side:T.DoubleSide,depthWrite:false});group.add(new T.Mesh(shell,sm));resources.push(shell,sm);\n   for(const x of [-3.8,3.8]){const ring=new T.TorusGeometry(.95,.035,8,40);ring.rotateY(Math.PI/2);ring.translate(x,0,0);const rm=new T.MeshBasicMaterial({color:tint,transparent:true,opacity:.8});group.add(new T.Mesh(ring,rm));resources.push(ring,rm);}")
 s=one(s,"color:i%3===0?0xffb26d:i%3===1?0xff3929:0xff7058","color:tint")
 s=one(s,"jetMarkers:st.jetMarkers.length,error:","jetMarkers:st.jetMarkers.length,visibleJetMarkers:st.jetMarkerNodes.filter(b=>b&&!b.hidden&&b.style.display!=='none').length,tunnelCount:st.jetMesh?.geometry?.userData?.tunnelCount||0,openTunnels:!!st.jetMesh?.geometry?.userData?.openTunnel,error:")
 p.write_text(s)
 p=site/(pre+local);s=p.read_text()
 s=one(s,"opacity:.28,depthWrite:false,side:THREE.DoubleSide,toneMapped:false","opacity:.22,depthWrite:false,side:THREE.DoubleSide,toneMapped:false")
 s=one(s,"float gustWave=sin(aWindProgress*43.0-uWindTime*3.6+aWindPhase*4.0);","float gustWave=sin(aWindProgress*43.0-uWindTime*3.6+aWindPhase*4.0)+.35*sin(aWindProgress*87.0-uWindTime*5.2+aWindPhase*8.0);")
 s=one(s,"transformed.y+=wrapWave*.35;","transformed.y+=wrapWave*.48;")
 s,n=re.subn(r'(bridgepoint-global-wind-rf-v1\.js)\?v=[^\'"]+',r'\1?v=5-hollow-jet-tunnels-20261124',s);assert n==1
 p.write_text(s)
 p=site/(pre+view)
 if p.exists():
  s=p.read_text();s,n=re.subn(r'(bridgepoint-volumetric-fields-v5978\.js)\?v=[^\'"]+',r'\1?v=6003-hollow-jet-tunnels-20261124',s);assert n>=1
  p.write_text(s)
for rel in ('index.html','app/index.html'):
 p=site/rel;s=p.read_text()
 s,n=re.subn(r'((?:data-bp-deferred-src|src)=["\'][^"\']*bridgepoint-view-v5917\.js[^"\']*)(["\'])',lambda m:m[1]+('&' if '?' in m[1] else '?')+'windtunnel=20261124v1'+m[2],s);assert n>=1
 p.write_text(s)
assert before==snap(),'Unexpected unrelated file change'
print('WIND_TUNNEL_ONLY_BYTE_PRESERVATION_PASS',len(before))
