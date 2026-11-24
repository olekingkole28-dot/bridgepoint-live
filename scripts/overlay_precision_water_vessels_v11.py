from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1]);key='precision-water-vessels-v20261124-v11'
water='world-v2300-water.js';ship='bridgepoint-vessel-awareness-v1.js'
allowed={'index.html','app/index.html','landing.js','app.js',water,'app/'+water,ship,'app/'+ship}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def read(n):return (site/n).read_text(encoding='utf-8')
def write(n,s):(site/n).write_text(s,encoding='utf-8')
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('PATCH_ANCHOR '+str(s.count(a))+' '+a[:150])
 return s.replace(a,b,1)
s=read(water)
s=one(s,'const SURFACE_RENDER_REVISION = 6266;','const SURFACE_RENDER_REVISION = 6267;')
# Preserve the global surface, but store local high zoom vertices relative to an
# origin BEFORE converting the JavaScript double coordinates to GPU floats.
s=one(s,"    setGeometry(surfaceValues, flowValues) {\n      this.surfaceData = new Float32Array(surfaceValues);\n      this.flowData = new Float32Array(flowValues);","""    setGeometry(surfaceValues, flowValues) {
      const center=map.getCenter(),local=map.getZoom()>=10;
      this.meshOrigin=local?[mod1(mercX(center.lng)),mercY(center.lat)]:[0,0];
      const rebase=values=>{
        const out=new Float32Array(values.length),[ox,oy]=this.meshOrigin;
        for(let i=0;i<values.length;i+=7){
          let x=values[i]-ox;if(local)x-=Math.round(x);
          out[i]=x;out[i+1]=values[i+1]-oy;
          for(let k=2;k<7;k++)out[i+k]=values[i+k];
        }return out;
      };
      this.surfaceData=rebase(surfaceValues);
      this.flowData=rebase(flowValues);
      api.localPrecisionGeometry=local;""")
s=one(s,"    'in vec2 a_pos;',","""    'in vec2 a_pos;',
    'uniform vec2 u_meshOrigin;',
    'uniform vec2 u_meshToWaveOrigin;',
    'uniform mat4 u_localProjection;',
    'uniform float u_localProjectionEnabled;',""")
a=s.index("    'void main() {',",s.index("const vertexSource = ["));b=s.index("  const fragmentSource = [",a)
v=s[a:b].replace('a_pos','worldPos')
v=v.replace("'void main() {',","'void main() {',\n    '  vec2 worldPos=a_pos+u_meshOrigin;',\n    '  vec2 relativeToWave=a_pos+u_meshToWaveOrigin;',")
v=v.replace('(worldPos - u_waveOrigin)','relativeToWave').replace('v_coord = worldPos - u_waveOrigin','v_coord = relativeToWave')
v=v.replace("vec2 displacedPosition = worldPos+curlOffset;","vec2 displacedPosition = worldPos+curlOffset;")
anchor="'  gl_Position = globalOcean?projectTile(worldPos):projectTileFor3D(displacedPosition, a_height + offsetM);',"
if anchor not in v:raise SystemExit('missing projection branch')
v=v.replace(anchor,"""'  if(u_localProjectionEnabled>0.5){',
    '    vec2 delta=a_pos+curlOffset;',
    '    float h=a_height+offsetM;',
    '    gl_Position=u_localProjection*vec4(delta,h/(40075016.6856*cLat),1.0);',
    '  }else{gl_Position=globalOcean?projectTile(worldPos):projectTileFor3D(displacedPosition, a_height + offsetM);}',""")
# Remove artificial close-view depth bias on the physical water plane, but
# preserve old regional behavior and never alter the globe horizon.
v=v.replace("&&u_oceanZoom>=3.5){gl_Position.z","&&u_oceanZoom>=3.5&&u_localProjectionEnabled<0.5){gl_Position.z")
# Shore marker is a dimensionless distance, not negative water elevation.
v=v.replace("+ a_flood;',","+ ((a_kind>2.5&&a_kind<3.5)?0.0:a_flood);',")
# Slow down coast-specific crests with locally variable fronts; offshore untouched.
v=v.replace("3.0*(1.0-shoaling)+u_time*0.58","3.0*(1.0-shoaling)+u_time*0.24+0.11*sin(ground.x*0.065+ground.y*0.071)")
s=s[:a]+v+s[b:]
# Stable CPU-generated magnetic phase offset and additional close-range frequency.
a=s.index('  const fragmentSource = [');b=s.index('  function compile(',a)
f=s[a:b]
f=f.replace("'uniform float u_oceanZoom;',","'uniform float u_oceanZoom;',\n    'uniform vec2 u_magneticOrigin;',")
old="float globeDensity=mix(48.0,104.0,smoothstep(2.1,5.0,u_oceanZoom));float zoomScale=clamp(globeDensity*exp2(u_oceanZoom-0.6),globeDensity,32000000.0);"
if old not in f:raise SystemExit('missing magnetic zoom scale')
f=f.replace(old,"float globeDensity=mix(48.0,104.0,smoothstep(2.1,5.0,u_oceanZoom));float zoomScale=clamp(globeDensity*exp2(u_oceanZoom-0.6),globeDensity,2100000000.0);")
f=f.replace('v_coord*zoomScale+mod(u_waveOrigin*zoomScale,256.0)','v_coord*zoomScale+u_magneticOrigin')
f=f.replace('3.0*(1.0-shore)+u_time*0.58','3.0*(1.0-shore)+u_time*0.24+0.11*sin(local.x*0.19+local.y*0.21)').replace('sin(u_time*3.6442475)','sin(u_time*1.5079645)')
s=s[:a]+f+s[b:]
s=one(s,"'u_underwater', 'u_closeCurl', 'u_oceanZoom'];","'u_underwater', 'u_closeCurl', 'u_oceanZoom', 'u_meshOrigin', 'u_meshToWaveOrigin', 'u_localProjection', 'u_localProjectionEnabled', 'u_magneticOrigin'];")
s=one(s,"if (u.u_waveOrigin) gl.uniform2f(u.u_waveOrigin, originX, originY);","""if (u.u_waveOrigin) gl.uniform2f(u.u_waveOrigin, originX, originY);
        const mo=this.meshOrigin||[0,0],deltaX=mo[0]-originX;
        const isLocal=!!api.localPrecisionGeometry;
        const projection=args.defaultProjectionData,planar=Number(projection?.projectionTransition||0)<.001&&!/\\\\bGLOBE\\\\b/.test(args.shaderData?.define||'');
        const useLocal=isLocal&&z>=9&&planar&&projection?.mainMatrix?.length===16;
        if(u.u_meshOrigin)gl.uniform2f(u.u_meshOrigin,mo[0],mo[1]);
        if(u.u_meshToWaveOrigin)gl.uniform2f(u.u_meshToWaveOrigin,isLocal?deltaX-Math.round(deltaX):deltaX,mo[1]-originY);
        if(u.u_localProjectionEnabled)gl.uniform1f(u.u_localProjectionEnabled,useLocal?1:0);
        if(useLocal&&u.u_localProjection){
          // Matrix translation is composed in JS double precision; only the
          // resulting camera-relative matrix is converted to float for WebGL.
          const m=Array.from(projection.mainMatrix),x=mo[0]+Math.round(originX-mo[0]);
          for(let i=0;i<4;i++)m[12+i]=m[12+i]+m[i]*x+m[4+i]*mo[1];
          gl.uniformMatrix4fv(u.u_localProjection,false,new Float32Array(m));
        }
        const dens=48+(104-48)*(()=>{const q=clamp((z-2.1)/(5-2.1),0,1);return q*q*(3-2*q)})();
        const opticalScale=clamp(dens*Math.pow(2,z-.6),dens,2100000000);
        if(u.u_magneticOrigin)gl.uniform2f(u.u_magneticOrigin,((originX*opticalScale%256)+256)%256,((originY*opticalScale%256)+256)%256);
        api.localPrecisionProjection=!!useLocal;
        // The vessel renderer reads the very same wave parameters used here.
        api.seaSurfaceFrame={time:waterAnimationTimeSeconds,originX,originY,centerCosLat,windX,windY,dirBX,dirBY,wavesPerWorld,amp,wind:api.wind.mph,pitchScale:pitchPolicy.scale,limit:pitchPolicy.maxOffsetM,storms:Array.from(api.stormUniforms)};
""")
# A CPU height sampler mirrors the existing marine vertex field. It is a visual
# wave estimate, not a live measured sea state.
s=one(s,"    frameDelay() {","""    sampleSeaSurface(lng,lat){
      const p=this.seaSurfaceFrame;if(!p)return 0;
      const x=mercX(lng),y=mercY(lat),c=Math.max(.12,Math.cos(lat*RAD)),dx=x-p.originX,dy=y-p.originY,gx=(dx-Math.round(dx))*EARTH_CIRCUMFERENCE_M*c,gy=dy*EARTH_CIRCUMFERENCE_M*c;
      const k=2*Math.PI*p.wavesPerWorld/EARTH_CIRCUMFERENCE_M,frac=n=>((n%1)+1)%1;
      const pa=2*Math.PI*frac(p.wavesPerWorld*p.centerCosLat*(p.originX*p.windX+p.originY*p.windY));
      const pb=2*Math.PI*frac(p.wavesPerWorld*.61*p.centerCosLat*(p.originX*p.dirBX+p.originY*p.dirBY));
      const a=(gx*p.windX+gy*p.windY)*k+pa-p.time*(.48+p.wind*.014),b=(gx*p.dirBX+gy*p.dirBY)*k*.61+pb+p.time*.33;
      const cx=p.windX-.43,cy=p.windY+.58,cn=Math.hypot(cx,cy)||1;
      const cc=(gx*cx+gy*cy)/cn*k*1.37+pa*.37+pb*.63-p.time*(.36+p.wind*.005);
      let storm=0,surge=0;for(let i=0;i<16;i+=4){if(!(p.storms[i+3]>0))continue;
        let sx=x-p.storms[i];sx-=Math.round(sx);const dist=Math.hypot(sx,y-p.storms[i+1])*EARTH_CIRCUMFERENCE_M*c;
        const influence=Math.exp(-dist/(Math.max(25000,p.storms[i+2])*1.8));storm=Math.max(storm,influence*p.storms[i+3]);surge=Math.max(surge,influence*Math.min(3.2,.55+p.storms[i+3]*1.65));}
      const wave=.63*Math.sin(a)+.25*Math.sin(a*1.91+.71)+.18*Math.sin(b)+.40*Math.sin(cc)+.48*Math.pow(Math.max(0,Math.sin(a)),5);
      const amp=p.amp*1.55*(.72+Math.min(.65,p.wind/80))*(1+storm*(.9+p.wind*.011));
      return clamp((wave*amp+surge)*p.pitchScale,-p.limit,p.limit);
    },
    frameDelay() {""")
# More dense, complete offshore geometry in any close-view angle; coastal source
# polygons remain the authority close to land. Overscan keeps a valid mesh as the
# user moves before the next build. Avoid unrelated lake/river changes.
s=one(s,"const offshoreTilt=offshoreSafe&&Math.abs(map.getPitch())>=18;","const offshoreTilt=offshoreSafe&&(z>=10||Math.abs(map.getPitch())>=18);")
s=one(s,"const countX=api.low?44:api.mobile?56:72,countY=countX;","const countX=z>=10?(api.low?72:api.mobile?88:112):(api.low?44:api.mobile?56:72),countY=countX;")
s=one(s,"const fallbackCoast=!!(coastalMesh&&!worldView&&!offshoreSafe&&z>=11&&!waterFeatures.length);","const fallbackCoast=!!(coastalMesh&&!worldView&&!offshoreSafe&&z>=11&&!waterFeatures.some(f=>marineFeature(f)));")
# Fix the fallback count for close coastal triangles and prevent high zoom
# floating-point overflow from the global coordinates.
s=one(s,"step:Math.max(dx,dy)*.18","step:Math.max(dx,dy)*(z>=12?.09:.18)")
s=one(s,"map.on('pitchend',()=>scheduleBuild(120,'camera'));","map.on('pitchend',()=>scheduleBuild(80,'camera'));\n  map.on('zoomend',()=>{if(map.getZoom()>=10)scheduleBuild(80,'camera')});")
for rel in (water,'app/'+water):write(rel,s)

s=read(ship)
s=one(s,'const VERSION=2;','const VERSION=3;')
# Actual measured length and beam at every model zoom, never screen-sized hulls.
s=one(s,"const display=Math.max(length,Math.max(0,12-zoom*.85)*mpp),ratio=display/length;","const display=length,ratio=1;")
s=one(s,"const height=kind==='sail'?beam*1.2:kind==='passenger'?beam*.95:kind==='cargo'?beam*.83:kind==='tanker'?beam*.70:beam*.90;","const height=kind==='sail'?beam*1.0:kind==='passenger'?beam*.68:kind==='cargo'?beam*.61:kind==='tanker'?beam*.55:beam*.64;")
s=one(s,"if(!p||p.x< -160||p.y< -160||p.x>w+160||p.y>h+160)continue;","""const mpp=WORLD_CIRCUMFERENCE_M*Math.max(.12,Math.cos(v.lat*Math.PI/180))/(512*Math.pow(2,Math.max(0,zoom)));
  const margin=Math.max(180,(Number(v.length)||200)/Math.max(1e-5,mpp)*.9);
  if(!p||p.x< -margin||p.y< -margin||p.x>w+margin||p.y>h+margin)continue;""")
# Smooth and solid hull at close distance. Keep category equipment and name UVs.
s=one(s,"p=[],idx=[],nx=48,nz=4;","p=[],idx=[],nx=96,nz=12;")
s=one(s,"const deckShape=new T.Shape();deckShape.moveTo(-.79,0);","const deckShape=new T.Shape();deckShape.moveTo(-.79,0);")
s=s.replace("for(let i=0;i<=48;i++){const x=-.79+1.58*i/48;deckShape.lineTo","for(let i=0;i<=96;i++){const x=-.79+1.58*i/96;deckShape.lineTo")
s=s.replace("for(let i=48;i>=0;i--){const x=-.79+1.58*i/48;deckShape.lineTo","for(let i=96;i>=0;i--){const x=-.79+1.58*i/96;deckShape.lineTo")
# Animate from the same water height field rather than floating at a separate
# oscillation. Physical hull remains below the local surface.
s=one(s,"const heave=clamp(beam*.045,.10,1.20)*factor*(.72*Math.sin(time*.86+phase)+.28*Math.sin(time*1.43+phase*.7));","""const sample=water?.sampleSeaSurface?.(v.lon,v.lat),visualBob=clamp(beam*.025,.06,.6)*factor*Math.sin(time*.86+phase);
 const heave=Number.isFinite(sample)?sample+visualBob:visualBob;""")
# Use relative model coordinates plus a CPU-rebased camera matrix, matching
# the precision path used by the water. This eliminates large translations in
# the per-instance GPU matrix, while retaining true meter scales.
s=one(s,"function animateModels(t,args){","function animateModels(t,args,localOrigin=null){")
s=one(s,"const useNativeModel=typeof map.transform?.getMatrixForModel==='function'&&Number(proj?.projectionTransition||0)>.001;","const useNativeModel=!localOrigin&&typeof map.transform?.getMatrixForModel==='function'&&Number(proj?.projectionTransition||0)>.001;")
s=one(s,"const scale=new THREE.Vector3(display/1.58,beam*ratio/.40,Math.max(2,height)*ratio/.40);","const scale=new THREE.Vector3(length/1.58,beam/.40,Math.max(.8,height)/.40);")
s=one(s,"if(!matrix){scale.multiplyScalar(unit);matrix=new THREE.Matrix4().compose(new THREE.Vector3(pos.x,pos.y,pos.z),q,scale)}","""if(!matrix){
    scale.multiplyScalar(unit);
    let x=pos.x,y=pos.y;if(localOrigin){x-=localOrigin.x;x-=Math.round(x);y-=localOrigin.y}
    matrix=new THREE.Matrix4().compose(new THREE.Vector3(x,y,pos.z),q,scale);
  }""")
s=one(s,"if(p.name&&named<namesMax){","""const mpp=WORLD_CIRCUMFERENCE_M*Math.max(.12,Math.cos(v.lat*Math.PI/180))/(512*Math.pow(2,Math.max(0,zoom)));
  if(zoom>=10&&length/mpp>=16&&named<namesMax){""")
s=one(s,"camera.projectionMatrix.fromArray(matrix);","""const pd=args?.defaultProjectionData,planar=Number(pd?.projectionTransition||0)<.001&&!/\\\\bGLOBE\\\\b/.test(args?.shaderData?.define||'');
   const MC=window.maplibregl?.MercatorCoordinate;
   const localOrigin=planar&&MC?MC.fromLngLat(map.getCenter(),0):null;
   camera.projectionMatrix.fromArray(matrix);
   if(localOrigin)camera.projectionMatrix.multiply(new THREE.Matrix4().makeTranslation(localOrigin.x,localOrigin.y,0));
   camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();""")
# The origin changes with camera movement; update transforms in the same frame,
# not just once every 40ms, so the models never jump when zooming.
s=one(s,"if(performance.now()-lastMotion>40){lastMotion=performance.now();animateModels(lastMotion/1000,args)}","lastMotion=performance.now();animateModels(lastMotion/1000,args,localOrigin);")
# Report actual physical dimensions, with clear fallback for absent AIS data.
s=one(s,"waterRendererModified:false","physicalScale:true,localPrecisionModels:true,waterSurfaceCoupled:true")
s=s.replace('Model families are based on the transmitted AIS ship-type code','Model families are based on the transmitted AIS ship-type code')
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
print('PRECISION_WATER_VESSELS_SCOPE_PASS',len(before),'unchanged production files')
