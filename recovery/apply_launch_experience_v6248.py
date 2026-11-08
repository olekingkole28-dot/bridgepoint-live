from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BUILD = "v6253-mobile-celestial-visibility"
SW_URL = "/sw.js?v=6253-mobile-celestial-visibility"
OLD_SW_URL = "/sw.js?v=6247-universal-fresh-entry-sidewalk"
CACHE_NAME = "bp-intelligence-v6247-universal-fresh-entry-sidewalk"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise AssertionError(f"{label}: expected exactly one match, found {count}")
    return source.replace(old, new, 1)


def replace_prefix_once(source: str, pattern: str, replacement: str, label: str) -> str:
    source, count = re.subn(pattern, replacement, source, count=1)
    if count != 1:
        raise AssertionError(f"{label}: expected exactly one match, found {count}")
    return source


def patch_stars(source: str) -> str:
    pattern = re.compile(
        r"(?ms)^  function buildSpaceStars\(\)\{.*?^  \}\n  buildSpaceStars\(\);"
    )
    replacement = r"""  function buildSpaceStars(){
    const canvas=document.getElementById('bpwCelestialCanvasV6252');
    if(!canvas||canvas.dataset.built==='1')return;
    const scene=canvas.parentElement;
    let fallbackCanvas=null;
    const resize=()=>{
      const rect=scene.getBoundingClientRect();
      const ratio=Math.min(1.35,Math.max(1,window.devicePixelRatio||1));
      canvas.width=Math.max(1,Math.round((rect.width||window.innerWidth||390)*ratio));
      canvas.height=Math.max(1,Math.round((rect.height||window.innerHeight||780)*ratio));
      if(fallbackCanvas){fallbackCanvas.width=canvas.width;fallbackCanvas.height=canvas.height;}
    };
    resize();
    let state=0x6252a71;
    const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296};
    const lowPower=window.innerWidth<=620||(navigator.deviceMemory||4)<=3;
    const starCount=lowPower?4200:8200;
    const stars=new Float32Array(starCount*4);
    const galaxyAspect=(window.innerWidth||390)/Math.max(1,window.innerHeight||780);
    const galaxyBlend=Math.max(0,Math.min(1,(galaxyAspect-1.05)/.8));
    const galaxyOffset=.48-.46*galaxyBlend*galaxyBlend*(3-2*galaxyBlend);
    for(let i=0;i<starCount;i++){
      let x,y;
      if(random()<.58){
        x=random()*2-1;
        const spread=(random()+random()+random()-1.5)*.17;
        y=galaxyOffset+.15*Math.sin(x*2.5)+spread;
      }else{x=random()*2-1;y=random()*2-1}
      const shell=random();
      const z=shell<.20?.025+random()*.20:shell<.62?.23+random()*.38:.62+random()*.38;
      stars[i*4]=x;stars[i*4+1]=y;stars[i*4+2]=z;stars[i*4+3]=random();
    }
    const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,powerPreference:'low-power'});
    function celestialAlignment(width,height){
      try{
        const candidate=window.__BP_LANDING_WORLD__?.map||window.__bpLandingWorld__?.map||null;
        if(!candidate||typeof candidate.getCenter!=='function'||typeof candidate.project!=='function')return null;
        const center=candidate.getCenter(),rad=Math.PI/180,dayMs=86400000,jd=Date.now()/dayMs+2440587.5,n=jd-2451545.0,d=jd-2451543.5;
        const L=((280.46+.9856474*n)%360+360)%360,G=((357.528+.9856003*n)%360+360)%360;
        const lambda=(L+1.915*Math.sin(G*rad)+.02*Math.sin(2*G*rad))*rad,eps=(23.439-.0000004*n)*rad;
        const sunRA=Math.atan2(Math.cos(eps)*Math.sin(lambda),Math.cos(lambda)),sunDec=Math.asin(Math.sin(eps)*Math.sin(lambda));
        const gmst=((280.46061837+360.98564736629*n)%360+360)%360,deg=180/Math.PI;
        let sunLng=sunRA/rad-gmst;sunLng=((sunLng+540)%360+360)%360-180;
        const lat0=Number(center.lat)*rad,bearing=Number(candidate.getBearing?.()||0)*rad,pitch=Number(candidate.getPitch?.()||0)*rad;
        const screenVector=(lng,lat)=>{
          const phi=lat*rad,dlon=((lng-Number(center.lng)+540)%360-180)*rad;
          const east=Math.cos(phi)*Math.sin(dlon),north=Math.cos(lat0)*Math.sin(phi)-Math.sin(lat0)*Math.cos(phi)*Math.cos(dlon);
          const x=east*Math.cos(bearing)-north*Math.sin(bearing),y=(east*Math.sin(bearing)+north*Math.cos(bearing))*Math.cos(pitch),m=Math.hypot(x,y);
          return m>.008?{x:x/m,y:y/m}:null;
        };
        const sunDir=screenVector(sunLng,sunDec/rad);if(!sunDir)return null;
        const mapContainer=candidate.getContainer?.();if(!mapContainer)return null;
        const sceneRect=scene.getBoundingClientRect(),mapRect=mapContainer.getBoundingClientRect(),centerPoint=candidate.project([Number(center.lng),Number(center.lat)]);
        if(!centerPoint||!Number.isFinite(centerPoint.x)||!Number.isFinite(centerPoint.y))return null;
        const ratio=width/Math.max(1,canvas.clientWidth||sceneRect.width||1),unit=Math.max(1,Math.min(width,height));
        const centerX=(mapRect.left+centerPoint.x-sceneRect.left)*ratio,centerY=(mapRect.top+centerPoint.y-sceneRect.top)*ratio;
        const testLng=((Number(center.lng)+35+540)%360)-180,testPoint=candidate.project([testLng,Number(center.lat)]);
        const phi=Number(center.lat)*rad,dlon=35*rad,cosAngle=Math.max(-1,Math.min(1,Math.sin(phi)*Math.sin(phi)+Math.cos(phi)*Math.cos(phi)*Math.cos(dlon)));
        const angle=Math.acos(cosAngle),testDistance=testPoint&&Number.isFinite(testPoint.x)&&Number.isFinite(testPoint.y)?Math.hypot(testPoint.x-centerPoint.x,testPoint.y-centerPoint.y)*ratio:0;
        const fallbackRadius=unit*.405,earthRadiusPixels=testDistance>0&&Math.sin(angle)>.01?testDistance/Math.sin(angle):fallbackRadius;
        const earthRadius=Math.max(unit*.27,Math.min(unit*.49,earthRadiusPixels))/unit;
        const centerNX=(centerX-width*.5)/unit,centerNY=(height*.5-centerY)/unit,sunRadius=.071,moonRadius=.052;
        const sunDistance=earthRadius+sunRadius*2.08,moonDistance=earthRadius+moonRadius*1.78;
        const helio=o=>{
          const N=(o.n+o.nd*d)*rad,I=(o.i+o.id*d)*rad,W=(o.w+o.wd*d)*rad,Ecc=o.e+o.ed*d,M=((o.m+o.md*d)%360+360)%360*rad;
          let E=M+Ecc*Math.sin(M)*(1+Ecc*Math.cos(M));
          for(let j=0;j<5;j++)E-=(E-Ecc*Math.sin(E)-M)/(1-Ecc*Math.cos(E));
          const xv=o.a*(Math.cos(E)-Ecc),yv=o.a*Math.sqrt(Math.max(0,1-Ecc*Ecc))*Math.sin(E),v=Math.atan2(yv,xv),rr=Math.hypot(xv,yv);
          return{x:rr*(Math.cos(N)*Math.cos(v+W)-Math.sin(N)*Math.sin(v+W)*Math.cos(I)),y:rr*(Math.sin(N)*Math.cos(v+W)+Math.cos(N)*Math.sin(v+W)*Math.cos(I)),z:rr*Math.sin(v+W)*Math.sin(I)};
        };
        const earth=helio({n:0,nd:0,i:0,id:0,w:282.9404,wd:.0000470935,a:1,e:.016709,ed:-.000000001151,m:356.0470,md:.9856002585});
        const planetData=[
          {name:'Mercury',type:0,radius:.019,n:48.3313,nd:.0000324587,i:7.0047,id:.00000005,w:29.1241,wd:.0000101444,a:.387098,e:.205635,ed:.000000000559,m:168.6562,md:4.0923344368},
          {name:'Venus',type:1,radius:.024,n:76.6799,nd:.0000246590,i:3.3946,id:.0000000275,w:54.8910,wd:.0000138374,a:.723330,e:.006773,ed:-.000000001302,m:48.0052,md:1.6021302244},
          {name:'Mars',type:2,radius:.021,n:49.5574,nd:.0000211081,i:1.8497,id:-.0000000178,w:286.5016,wd:.0000292961,a:1.523688,e:.093405,ed:.000000002516,m:18.6021,md:.5240207766},
          {name:'Jupiter',type:3,radius:.038,n:100.4542,nd:.0000276854,i:1.3030,id:-.0000001557,w:273.8777,wd:.0000164505,a:5.20256,e:.048498,ed:.000000004469,m:19.8950,md:.0830853001},
          {name:'Saturn',type:4,radius:.035,n:113.6634,nd:.0000238980,i:2.4886,id:-.0000001081,w:339.3939,wd:.0000297661,a:9.55475,e:.055546,ed:-.000000009499,m:316.9670,md:.0334442282},
          {name:'Uranus',type:5,radius:.027,n:74.0005,nd:.000013978,i:.7733,id:.000000019,w:96.6612,wd:.000030565,a:19.18171,e:.047318,ed:.00000000745,m:142.5905,md:.011725806},
          {name:'Neptune',type:6,radius:.027,n:131.7806,nd:.000030173,i:1.7700,id:-.000000255,w:272.8461,wd:-.000006027,a:30.05826,e:.008606,ed:.00000000215,m:260.2471,md:.005995147}
        ];
        const planets=planetData.map(o=>{
          const hp=helio(o),x=hp.x-earth.x,y=hp.y-earth.y,z=hp.z-earth.z,ye=y*Math.cos(eps)-z*Math.sin(eps),ze=y*Math.sin(eps)+z*Math.cos(eps),range=Math.hypot(x,ye,ze);
          const ra=Math.atan2(ye,x),dec=Math.asin(Math.max(-1,Math.min(1,ze/Math.max(1e-9,range))));
          let lng=ra/rad-gmst;lng=((lng+540)%360+360)%360-180;
          const dir=screenVector(lng,dec/rad);if(!dir)return null;
          const distance=earthRadius+.12+o.radius*1.55;
          return{name:o.name,type:o.type,center:[centerNX+dir.x*distance,centerNY+dir.y*distance],radius:o.radius};
        }).filter(Boolean);
        return{center:[centerNX,centerNY],sun:[centerNX+sunDir.x*sunDistance,centerNY+sunDir.y*sunDistance],moon:[centerNX-sunDir.x*moonDistance,centerNY-sunDir.y*moonDistance],sunRadius,moonRadius,visible:1,subsolar:{lng:sunLng,lat:sunDec/rad},earthRadius,viewAngle:bearing,planets,direction:[sunDir.x,sunDir.y],updatedAt:Date.now()};
      }catch(_){return null}
    }
    const fallback=()=>{
      let target=canvas;
      if(gl){
        if(!fallbackCanvas){
          fallbackCanvas=document.createElement('canvas');
          fallbackCanvas.id='bpwCelestialFallbackCanvasV6253';
          fallbackCanvas.className='bpw-celestial-canvas bpw-celestial-fallback-canvas';
          scene.appendChild(fallbackCanvas);
        }
        fallbackCanvas.width=canvas.width;fallbackCanvas.height=canvas.height;
        canvas.style.display='none';
        target=fallbackCanvas;
      }
      const ctx=target.getContext('2d',{alpha:true});if(!ctx)return;
      const w=target.width,h=target.height,unit=Math.min(w,h),alignment=celestialAlignment(w,h);
      ctx.clearRect(0,0,w,h);
      ctx.save();ctx.translate(w*.5,h*.5);ctx.rotate(-.42);ctx.scale(1,.22);
      let haze=ctx.createRadialGradient(0,0,unit*.03,0,0,unit*1.12);
      haze.addColorStop(0,'rgba(157,176,226,.34)');haze.addColorStop(.22,'rgba(100,120,187,.27)');haze.addColorStop(.54,'rgba(73,89,150,.12)');haze.addColorStop(1,'rgba(28,36,75,0)');
      ctx.fillStyle=haze;ctx.beginPath();ctx.ellipse(0,0,unit*1.12,unit*.62,0,0,Math.PI*2);ctx.fill();
      ctx.globalCompositeOperation='screen';
      for(let i=0;i<8;i++){
        const x=(i-3.5)*unit*.17,y=Math.sin(i*1.7)*unit*.08,r=unit*(.10+(i%3)*.055),g=ctx.createRadialGradient(x,y,r*.05,x,y,r);
        g.addColorStop(0,'rgba(178,185,235,.20)');g.addColorStop(.55,'rgba(92,116,190,.09)');g.addColorStop(1,'rgba(62,80,150,0)');
        ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
      }
      ctx.globalCompositeOperation='source-over';
      ctx.strokeStyle='rgba(3,6,17,.52)';ctx.lineWidth=unit*.024;ctx.beginPath();ctx.moveTo(-unit,-unit*.04);ctx.bezierCurveTo(-unit*.35,-unit*.14,unit*.25,unit*.02,unit,unit*.09);ctx.stroke();
      ctx.restore();
      if(alignment){
        ctx.save();ctx.globalCompositeOperation='destination-out';
        ctx.beginPath();ctx.arc(w*.5+alignment.center[0]*unit,h*.5-alignment.center[1]*unit,alignment.earthRadius*unit*1.06,0,Math.PI*2);ctx.fill();ctx.restore();
      }
      for(let i=0;i<starCount;i++){
        const z=stars[i*4+2],depth=.72+z*2.0,x=w*.5+stars[i*4]*unit*.47/depth,y=h*.5-stars[i*4+1]*unit*.92/depth,r=Math.min(4.2,.35+(1/depth)*.72);
        if(alignment&&Math.hypot((x-w*.5)/unit-alignment.center[0],(h*.5-y)/unit-alignment.center[1])<alignment.earthRadius*1.06)continue;
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='rgba(205,226,255,'+(.16+(1-z)*.78)+')';ctx.fill();
      }
      if(!alignment)return;
      const point=v=>({x:w*.5+v[0]*unit,y:h*.5-v[1]*unit}),sun=point(alignment.sun),sr=alignment.sunRadius*unit,t=Date.now()*.001;
      const corona=ctx.createRadialGradient(sun.x,sun.y,sr*.35,sun.x,sun.y,sr*2.35);
      corona.addColorStop(0,'rgba(255,250,226,.99)');corona.addColorStop(.18,'rgba(255,211,111,.86)');corona.addColorStop(.55,'rgba(255,105,27,.28)');corona.addColorStop(1,'rgba(255,72,12,0)');
      ctx.fillStyle=corona;ctx.beginPath();ctx.arc(sun.x,sun.y,sr*2.35,0,Math.PI*2);ctx.fill();
      ctx.save();ctx.translate(sun.x,sun.y);ctx.globalCompositeOperation='lighter';
      for(let i=0;i<32;i++){const a=i*Math.PI*2/32+t*.075,reach=sr*(1.08+.32*(.5+.5*Math.sin(i*4.3+t*1.6)));ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(sr*.82,-sr*.09);ctx.quadraticCurveTo(reach*.8,-sr*.04,reach,0);ctx.quadraticCurveTo(reach*.75,sr*.06,sr*.82,sr*.09);ctx.fillStyle='rgba(255,139,34,.27)';ctx.fill();ctx.restore()}
      ctx.restore();
      let g=ctx.createRadialGradient(sun.x-sr*.32,sun.y-sr*.38,sr*.04,sun.x,sun.y,sr);
      g.addColorStop(0,'#fffef5');g.addColorStop(.25,'#fff1a9');g.addColorStop(.58,'#ff9c37');g.addColorStop(.83,'#e94d19');g.addColorStop(1,'#741d18');
      ctx.beginPath();ctx.arc(sun.x,sun.y,sr,0,Math.PI*2);ctx.fillStyle=g;ctx.shadowColor='rgba(255,132,34,.9)';ctx.shadowBlur=unit*.06;ctx.fill();ctx.shadowBlur=0;
      const moon=point(alignment.moon),mr=alignment.moonRadius*unit;g=ctx.createRadialGradient(moon.x-mr*.32,moon.y-mr*.36,mr*.03,moon.x,moon.y,mr);
      g.addColorStop(0,'#f5f5ef');g.addColorStop(.52,'#c7c9c6');g.addColorStop(1,'#303b47');
      ctx.beginPath();ctx.arc(moon.x,moon.y,mr,0,Math.PI*2);ctx.fillStyle=g;ctx.shadowColor='rgba(188,219,247,.34)';ctx.shadowBlur=unit*.02;ctx.fill();ctx.shadowBlur=0;
      ctx.save();ctx.beginPath();ctx.arc(moon.x,moon.y,mr,0,Math.PI*2);ctx.clip();
      for(let i=0;i<210;i++){const a=i*2.399963,dist=Math.sqrt((i+.5)/210)*mr*.92,cx=moon.x+Math.cos(a)*dist,cy=moon.y+Math.sin(a)*dist*.86,cr=mr*(.024+(i%7)*.016);ctx.beginPath();ctx.arc(cx,cy,cr,0,Math.PI*2);ctx.fillStyle='rgba(43,51,59,'+(.14+(i%5)*.035)+')';ctx.fill();ctx.beginPath();ctx.arc(cx-cr*.16,cy-cr*.22,cr*.68,0,Math.PI*2);ctx.strokeStyle='rgba(250,251,247,.24)';ctx.lineWidth=Math.max(.5,cr*.23);ctx.stroke()}
      ctx.restore();
      for(const body of alignment.planets||[]){const pc=point(body.center),r=body.radius*unit;ctx.beginPath();ctx.arc(pc.x,pc.y,r,0,Math.PI*2);ctx.fillStyle=body.type===3?'#d9b88a':body.type===2?'#c65334':body.type===1?'#decfa6':body.type===4?'#c3a47a':body.type===5?'#8bcad2':body.type===6?'#4c83c1':'#9a9d9b';ctx.fill();if(body.type===4){ctx.beginPath();ctx.ellipse(pc.x,pc.y,r*1.75,r*.48,-.16,0,Math.PI*2);ctx.strokeStyle='rgba(216,190,147,.72)';ctx.lineWidth=Math.max(1,r*.25);ctx.stroke()}}
    };
    if(!gl){fallback();canvas.dataset.built='1';window.addEventListener('resize',()=>{resize();fallback()},{passive:true});setInterval(()=>{if(!document.hidden)fallback()},5000);return}
    const compile=(type,code)=>{
      const shader=gl.createShader(type);gl.shaderSource(shader,code);gl.compileShader(shader);
      if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);return null}
      return shader;
    };
    const program=(vsCode,fsCode)=>{
      const vs=compile(gl.VERTEX_SHADER,vsCode),fs=compile(gl.FRAGMENT_SHADER,fsCode);
      if(!vs||!fs)return null;
      const p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);
      if(!gl.getProgramParameter(p,gl.LINK_STATUS)){gl.deleteProgram(p);return null}
      return p;
    };
    const starProgram=program(
      'attribute vec4 a_pos;uniform float u_time;uniform float u_aspect;uniform float u_viewAngle;varying float v_alpha;varying float v_tint;varying vec2 v_space;varying float v_bright;void main(){float z=mod(a_pos.z-u_time*0.000013+1.0,1.0);float depth=.72+z*2.0;vec2 p=vec2(a_pos.x*u_aspect*.47,a_pos.y*.92)/depth;float c=cos(u_viewAngle-.42),s=sin(u_viewAngle-.42);p=mat2(c,-s,s,c)*p;gl_Position=vec4(p.x*2.0/u_aspect,p.y*2.0,0.0,1.0);gl_PointSize=min(8.0,.34+(2.25/depth))*(.84+.16*sin(u_time*.0008+a_pos.w*17.0));v_alpha=clamp((1.28-z)*.88,.10,1.0);v_tint=a_pos.w;v_space=p;v_bright=step(.82,a_pos.w);}',
      'precision mediump float;uniform vec2 u_earthC;uniform float u_earthR;varying float v_alpha;varying float v_tint;varying vec2 v_space;varying float v_bright;void main(){if(u_earthR>0.0&&length(v_space-u_earthC)<u_earthR*1.055)discard;vec2 q=gl_PointCoord-vec2(.5);float d=length(q);float core=1.0-smoothstep(.015,.22,d);float halo=1.0-smoothstep(.08,.5,d);float spike=max(1.0-smoothstep(.0,.055,abs(q.x)),1.0-smoothstep(.0,.055,abs(q.y)))*v_bright*(1.0-smoothstep(.12,.48,d));vec3 c=mix(vec3(.50,.68,1.0),vec3(1.0,.89,.70),v_tint);c=mix(c,vec3(.82,.91,1.0),v_bright*.48);float a=(core*.88+halo*.24+spike*.42)*v_alpha;if(a<.008)discard;gl_FragColor=vec4(c,a);}'
    );
    const galaxyProgram=program(
      'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}',
      'precision mediump float;uniform vec2 u_resolution;uniform vec2 u_earthC;uniform float u_earthR;uniform float u_time;uniform float u_viewAngle;float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i),b=hash21(i+vec2(1.0,0.0)),c=hash21(i+vec2(0.0,1.0)),d=hash21(i+vec2(1.0,1.0));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}float fbm2(vec2 p){float v=0.0,a=.55;for(int i=0;i<3;i++){v+=a*noise2(p);p=p*2.03+vec2(13.1,7.7);a*=.48;}return v;}void main(){float unit=min(u_resolution.x,u_resolution.y);vec2 p=(gl_FragCoord.xy-.5*u_resolution)/unit;if(u_earthR>0.0&&length(p-u_earthC)<u_earthR*1.075)discard;float c=cos(u_viewAngle-.42),s=sin(u_viewAngle-.42);vec2 q=mat2(c,-s,s,c)*p;float aspect=u_resolution.x/u_resolution.y;float bandOffset=mix(.48,.02,smoothstep(1.05,1.85,aspect));float nebulaOffset=mix(.62,.34,smoothstep(1.05,1.85,aspect));float band=q.y-(bandOffset+.16*sin(q.x*2.5)+.018*sin(q.x*6.1));float cloud=fbm2(q*vec2(4.2,13.0)+vec2(u_time*.000004,0.0));float detail=fbm2(q*vec2(12.0,31.0)-vec2(u_time*.000002,0.0));float width=.105+.052*cloud;float core=exp(-pow(band/width,2.0));float dustLane=1.0-smoothstep(.006,.034,abs(band-.020*sin(q.x*5.2)));float density=core*(.15+.62*cloud+.32*detail)*(.38+.62*dustLane);float blueNeb=exp(-length((q-vec2(-.18,nebulaOffset))*vec2(1.7,3.4))*2.0)*detail;float violetNeb=exp(-length((q-vec2(.20,-nebulaOffset))*vec2(1.7,4.0))*2.0)*cloud;vec3 milky=mix(vec3(.16,.22,.48),vec3(.67,.63,.76),clamp(.25+cloud*.72,0.0,1.0));milky=mix(milky,vec3(.94,.72,.54),smoothstep(.63,.91,q.x)*.24);vec3 neb=vec3(.22,.40,.83)*blueNeb+vec3(.44,.22,.76)*violetNeb;vec3 color=milky*density+neb;float alpha=clamp(density*.62+blueNeb*.16+violetNeb*.17,0.0,.62);if(alpha<.008)discard;gl_FragColor=vec4(color,alpha);}'
    );
    const sphereProgram=program(
      'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}',
      'precision mediump float;uniform vec2 u_resolution;uniform float u_time;uniform vec2 u_sunC;uniform vec2 u_moonC;uniform float u_sunR;uniform float u_moonR;uniform float u_celestialVisible;float hash31(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash31(i),b=hash31(i+vec3(1,0,0)),c=hash31(i+vec3(0,1,0)),d=hash31(i+vec3(1,1,0)),e=hash31(i+vec3(0,0,1)),f1=hash31(i+vec3(1,0,1)),g=hash31(i+vec3(0,1,1)),h=hash31(i+vec3(1,1,1));return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,f1,f.x),mix(g,h,f.x),f.y),f.z);}float fbm(vec3 p){float v=0.0,a=0.5;for(int i=0;i<5;i++){v+=a*noise3(p);p=p*2.02+vec3(1.7,2.3,1.1);a*=0.5;}return v;}float craterRelief(vec2 uv,out float rims,out float shadows){vec2 grid=uv*vec2(19.0,12.0),cell=floor(grid),f=fract(grid);float bowls=0.0;rims=0.0;shadows=0.0;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 off=vec2(float(x),float(y)),id=cell+off;vec2 rnd=vec2(hash31(vec3(id,2.1)),hash31(vec3(id,7.3)));vec2 delta=off+vec2(.18)+rnd*.64-f;float dist=length(delta);float radius=.13+hash31(vec3(id,9.2))*.22;float bowl=1.0-smoothstep(radius*.24,radius*.88,dist);float rim=1.0-smoothstep(radius*.87,radius*1.08,dist);float shadow=1.0-smoothstep(radius*1.06,radius*1.62,dist);bowls=max(bowls,bowl);rims=max(rims,rim);shadows=max(shadows,shadow);}}vec2 bigGrid=uv*vec2(7.0,4.8),bigCell=floor(bigGrid),bigF=fract(bigGrid);for(int by=-1;by<=1;by++){for(int bx=-1;bx<=1;bx++){vec2 off=vec2(float(bx),float(by)),id=bigCell+off;vec2 rnd=vec2(hash31(vec3(id,19.1)),hash31(vec3(id,27.3)));vec2 delta=off+vec2(.18)+rnd*.64-bigF;float dist=length(delta);float radius=.20+hash31(vec3(id,29.2))*.24;float bowl=1.0-smoothstep(radius*.22,radius*.88,dist);float rim=1.0-smoothstep(radius*.86,radius*1.10,dist);float shadow=1.0-smoothstep(radius*1.06,radius*1.60,dist);bowls=max(bowls,bowl*.94);rims=max(rims,rim);shadows=max(shadows,shadow);}}return bowls;}void main(){float unit=min(u_resolution.x,u_resolution.y);vec2 p=(gl_FragCoord.xy-0.5*u_resolution)/unit;vec3 outColor=vec3(0.0);float outAlpha=0.0;if(u_celestialVisible>.5){vec2 sdv=(p-u_sunC)/u_sunR;float sr=length(sdv),sa=atan(sdv.y,sdv.x);if(sr<2.15){float solarTime=u_time*.00024;float plume=pow(max(0.0,.5+.5*sin(sa*6.0+solarTime*1.7+sin(sa*13.0-solarTime)*.55)),5.0);float coronaNoise=fbm(vec3(cos(sa)*4.0,sin(sa)*4.0,solarTime*.16));float flareReach=1.16+.23*plume+.11*(coronaNoise-.45);float corona=exp(-max(0.0,sr-1.0)*2.05);float flare=1.0-smoothstep(flareReach-.075,flareReach+.10,sr);float ray=pow(max(0.0,sin(sa*9.0+solarTime*1.2)),15.0)*(1.0-smoothstep(1.06,1.93,sr));float prominence=pow(max(0.0,sin(sa*3.0-solarTime*.55)),24.0)*(1.0-smoothstep(1.0,1.72,sr));float halo=1.0-smoothstep(1.28,2.05,sr);float solarAlpha=clamp(max(corona*.25,max(flare*.64,max(ray*.72,prominence*.68))),0.0,.94);outColor=mix(outColor,vec3(1.0,.26,.035),solarAlpha);outColor+=vec3(1.0,.42,.10)*(halo*.10+ray*.22+prominence*.26);outAlpha=max(outAlpha,solarAlpha*.85);}if(sr<1.0){vec2 q=sdv;float z=sqrt(max(0.0,1.0-dot(q,q)));vec3 n=normalize(vec3(q,z));float rot=u_time*.000018;n.xz=mat2(cos(rot),-sin(rot),sin(rot),cos(rot))*n.xz;float boiling=fbm(n*7.5+vec3(0.0,u_time*.000018,u_time*.000011));float granulation=fbm(n*18.0-vec3(u_time*.000026,0.0,u_time*.000009));float filament=fbm(n*31.0+vec3(3.0,u_time*.000014,8.0));float cells=fbm(n*47.0+vec3(0.0,u_time*.000009,0.0));float granule=fbm(n*78.0+vec3(u_time*.000011,9.0,3.0));vec3 deep=vec3(.62,.055,.012),orange=vec3(1.0,.26,.018),gold=vec3(1.0,.67,.13),hot=vec3(1.0,.96,.69);vec3 solar=mix(deep,orange,smoothstep(.12,.74,boiling));solar=mix(solar,gold,smoothstep(.35,.76,granulation)*.68);solar=mix(solar,hot,smoothstep(.62,.91,cells)*.58);solar=mix(solar,vec3(1.0,.99,.84),smoothstep(.68,.94,granule)*.28);solar+=vec3(.16,.035,.004)*(filament-.42);solar*=.76+.34*granulation;float sunspot=fbm(n*9.0+vec3(5.0,2.0,1.0));solar*=1.0-smoothstep(.15,.34,sunspot)*.24;float light=max(dot(n,normalize(vec3(-.34,.48,.81))),0.0);float limb=.38+.62*pow(max(n.z,0.0),.42);solar*=.42+.58*light;solar*=limb;solar+=hot*pow(max(n.z,0.0),8.0)*.26;outColor=mix(outColor,solar,1.0);outAlpha=1.0;}}if(u_celestialVisible>.5){vec2 mdv=(p-u_moonC)/u_moonR;float mr=length(mdv);if(mr<1.42){float glow=1.0-smoothstep(1.0,1.42,mr);outColor=mix(outColor,vec3(.42,.59,.78),glow*.13);outAlpha=max(outAlpha,glow*.16);}if(mr<1.0){vec2 q=mdv;float z=sqrt(max(0.0,1.0-dot(q,q)));vec3 n=normalize(vec3(q,z));float libration=sin(u_time*.00007)*.035;n.xy=mat2(cos(libration),-sin(libration),sin(libration),cos(libration))*n.xy;vec2 uv=vec2(atan(n.y,n.x)*.15915494+.5,asin(clamp(n.z,-1.0,1.0))*.31830989+.5);float rim,shadow;float bowls=craterRelief(uv,rim,shadow);float highlands=fbm(n*17.0);float fine=fbm(n*82.0+vec3(3.0,7.0,2.0));float micro=fbm(n*148.0+vec3(9.0,4.0,6.0));float mariaNoise=fbm(n*4.5+vec3(8.0,2.0,5.0));float maria=smoothstep(.48,.68,mariaNoise);float rayNoise=fbm(n*29.0+vec3(11.0,1.0,4.0));float albedo=.72+(highlands-.5)*.22+(fine-.5)*.16+(micro-.5)*.10-bowls*.34+rim*.27-shadow*.10-maria*.23;vec3 high=vec3(.72,.74,.73),low=vec3(.36,.40,.43);vec3 lunar=mix(low,high,clamp(albedo,0.0,1.0));lunar+=vec3(.15,.15,.13)*rim*.42;lunar*=.88+rayNoise*.18+micro*.08;vec2 toSun=normalize(u_sunC-u_moonC);vec3 lightDir=normalize(vec3(toSun.x,toSun.y,.82));float light=max(dot(n,lightDir),0.0);float limb=.20+.80*pow(max(n.z,0.0),.42);lunar*=.16+.84*light;lunar*=limb;lunar*=1.0-shadow*.19;lunar+=vec3(.08,.095,.11)*rim*.17;outColor=mix(outColor,lunar,1.0);outAlpha=1.0;}}gl_FragColor=vec4(outColor,outAlpha);}'
    );
    const planetProgram=program(
      'attribute vec2 a_pos;uniform vec2 u_resolution;uniform vec2 u_bodyC;uniform float u_bodyR;uniform float u_bodyType;void main(){float aspect=u_resolution.x/u_resolution.y;float scale=u_bodyType>6.5?1.94:1.0;vec2 p=u_bodyC+a_pos*u_bodyR*1.98*scale;gl_Position=vec4(p.x*2.0/aspect,p.y*2.0,0.0,1.0);}',
      'precision mediump float;uniform vec2 u_resolution;uniform vec2 u_bodyC;uniform float u_bodyR;uniform float u_bodyType;uniform float u_time;uniform vec2 u_lightDir;float hash31(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash31(i),b=hash31(i+vec3(1,0,0)),c=hash31(i+vec3(0,1,0)),d=hash31(i+vec3(1,1,0)),e=hash31(i+vec3(0,0,1)),f1=hash31(i+vec3(1,0,1)),g=hash31(i+vec3(0,1,1)),h=hash31(i+vec3(1,1,1));return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,f1,f.x),mix(g,h,f.x),f.y),f.z);}float fbm(vec3 p){float v=0.0,a=.56;for(int i=0;i<4;i++){v+=a*noise3(p);p=p*2.03+vec3(2.2,1.3,3.7);a*=.47;}return v;}void main(){float unit=min(u_resolution.x,u_resolution.y);vec2 p=(gl_FragCoord.xy-.5*u_resolution)/unit;vec2 q=(p-u_bodyC)/u_bodyR;float r=length(q);if(u_bodyType>6.5){float ringR=length(vec2(q.x,q.y/.34));if(ringR<1.05||ringR>1.88)discard;float bands=step(.5,fract(ringR*15.0+noise3(vec3(q*4.0,2.0))*.28));float shade=.60+.30*bands+.10*sin(ringR*85.0);vec3 ringColor=mix(vec3(.28,.22,.16),vec3(.85,.72,.53),shade);float gaps=smoothstep(1.08,1.15,ringR)*(1.0-smoothstep(1.60,1.73,ringR));gl_FragColor=vec4(ringColor*shade,(.78+.16*bands)*gaps);return;}if(r>1.0)discard;float z=sqrt(max(0.0,1.0-dot(q,q)));vec3 n=normalize(vec3(q,z));float spin=u_time*.000012;n.xz=mat2(cos(spin),-sin(spin),sin(spin),cos(spin))*n.xz;float broad=fbm(n*5.5),fine=fbm(n*21.0+vec3(4.0,2.0,1.0)),micro=fbm(n*58.0+vec3(7.0,3.0,5.0));vec3 base=vec3(.55,.56,.56);if(u_bodyType<.5){float craters=fbm(n*27.0);base=mix(vec3(.25,.28,.30),vec3(.72,.69,.63),smoothstep(.24,.74,broad));base*=.82+fine*.30;base*=1.0-smoothstep(.56,.76,craters)*.25;}else if(u_bodyType<1.5){float clouds=fbm(n*10.0+vec3(0.0,u_time*.000015,0.0));float streak=sin(n.y*27.0+clouds*4.0)*.5+.5;base=mix(vec3(.65,.47,.28),vec3(.94,.82,.61),smoothstep(.24,.78,clouds));base=mix(base,vec3(.99,.91,.74),streak*.17);}else if(u_bodyType<2.5){float terrain=fbm(n*15.0);float dark=fbm(n*31.0+vec3(3.0,1.0,8.0));base=mix(vec3(.28,.075,.045),vec3(.87,.31,.13),smoothstep(.24,.79,terrain));base=mix(base,vec3(.16,.10,.08),smoothstep(.61,.78,dark)*.34);float polar=smoothstep(.78,.96,abs(n.y));base=mix(base,vec3(.91,.86,.76),polar*.72);}else if(u_bodyType<3.5){float bands=sin((n.y+((broad-.5)*.09))*39.0+fine*2.6);float storm=1.0-smoothstep(.10,.34,length((n.xy-vec2(.27,.20))*vec2(1.0,1.8)));base=mix(vec3(.42,.29,.20),vec3(.88,.73,.55),smoothstep(-.48,.55,bands));base=mix(base,vec3(.71,.30,.16),storm*.95);base+=vec3(.10,.06,.035)*(micro-.45);}else if(u_bodyType<4.5){float bands=sin((n.y+(broad-.5)*.06)*31.0+fine*2.0);base=mix(vec3(.42,.30,.19),vec3(.88,.76,.57),smoothstep(-.55,.55,bands));base=mix(base,vec3(.69,.48,.32),smoothstep(.62,.79,fbm(n*8.0+vec3(5.0,2.0,1.0)))*.36);}else if(u_bodyType<5.5){base=mix(vec3(.12,.35,.44),vec3(.52,.82,.84),smoothstep(.22,.78,broad));base+=vec3(.04,.09,.12)*(fine-.5);}else{base=mix(vec3(.025,.10,.32),vec3(.10,.40,.78),smoothstep(.20,.78,broad));base+=vec3(.025,.07,.15)*(fine-.5);}vec3 light=normalize(vec3(u_lightDir,.88));float diffuse=max(dot(n,light),0.0);float limb=.22+.78*pow(max(n.z,0.0),.42);vec3 color=base*(.13+.87*diffuse)*limb;color+=base*pow(max(n.z,0.0),8.0)*.16;float atmosphere=1.0-smoothstep(.84,1.0,r);color+=vec3(.12,.24,.42)*atmosphere*.10;gl_FragColor=vec4(color,1.0);}'
    );
    if(!starProgram||!galaxyProgram||!sphereProgram||!planetProgram){fallback();canvas.dataset.built='1';window.addEventListener('resize',()=>{resize();fallback()},{passive:true});document.addEventListener('visibilitychange',()=>{if(!document.hidden)fallback()});setInterval(()=>{if(!document.hidden)fallback()},5000);return}
    const starBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);gl.bufferData(gl.ARRAY_BUFFER,stars,gl.STATIC_DRAW);
    const starPosition=gl.getAttribLocation(starProgram,'a_pos');
    const starTime=gl.getUniformLocation(starProgram,'u_time'),starAspect=gl.getUniformLocation(starProgram,'u_aspect'),starEarth=gl.getUniformLocation(starProgram,'u_earthC'),starEarthR=gl.getUniformLocation(starProgram,'u_earthR'),starAngle=gl.getUniformLocation(starProgram,'u_viewAngle');
    const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const quadPosition=gl.getAttribLocation(sphereProgram,'a_pos'),galaxyPosition=gl.getAttribLocation(galaxyProgram,'a_pos'),planetPosition=gl.getAttribLocation(planetProgram,'a_pos');
    const galaxyResolution=gl.getUniformLocation(galaxyProgram,'u_resolution'),galaxyEarth=gl.getUniformLocation(galaxyProgram,'u_earthC'),galaxyEarthR=gl.getUniformLocation(galaxyProgram,'u_earthR'),galaxyTime=gl.getUniformLocation(galaxyProgram,'u_time'),galaxyAngle=gl.getUniformLocation(galaxyProgram,'u_viewAngle');
    const sphereResolution=gl.getUniformLocation(sphereProgram,'u_resolution'),sphereTime=gl.getUniformLocation(sphereProgram,'u_time');
    const sphereSun=gl.getUniformLocation(sphereProgram,'u_sunC'),sphereMoon=gl.getUniformLocation(sphereProgram,'u_moonC');
    const sphereSunRadius=gl.getUniformLocation(sphereProgram,'u_sunR'),sphereMoonRadius=gl.getUniformLocation(sphereProgram,'u_moonR'),sphereVisible=gl.getUniformLocation(sphereProgram,'u_celestialVisible');
    const planetResolution=gl.getUniformLocation(planetProgram,'u_resolution'),planetCenter=gl.getUniformLocation(planetProgram,'u_bodyC'),planetRadius=gl.getUniformLocation(planetProgram,'u_bodyR'),planetType=gl.getUniformLocation(planetProgram,'u_bodyType'),planetTime=gl.getUniformLocation(planetProgram,'u_time'),planetLight=gl.getUniformLocation(planetProgram,'u_lightDir');
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    const renderPlanets=(celestial,now)=>{
      if(!celestial?.planets?.length)return;
      gl.useProgram(planetProgram);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(planetPosition);gl.vertexAttribPointer(planetPosition,2,gl.FLOAT,false,0,0);gl.uniform2f(planetResolution,canvas.width,canvas.height);gl.uniform1f(planetTime,now);
      for(const body of celestial.planets){
        const sunVec=[celestial.sun[0]-body.center[0],celestial.sun[1]-body.center[1]],lightLen=Math.max(.001,Math.hypot(sunVec[0],sunVec[1]));
        gl.uniform2f(planetCenter,body.center[0],body.center[1]);gl.uniform1f(planetRadius,body.radius);gl.uniform2f(planetLight,sunVec[0]/lightLen,sunVec[1]/lightLen);
        if(body.type===4){gl.uniform1f(planetType,7);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}
        gl.uniform1f(planetType,body.type);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      }
    };
    let frame=0,last=0,lastAlignment=0,activeMap=null,alignmentDirty=true,currentAlignment=null;
    const bindAlignmentMap=()=>{
      const m=window.__BP_LANDING_WORLD__?.map||window.__bpLandingWorld__?.map||null;
      if(!m||m===activeMap)return;activeMap=m;alignmentDirty=true;
      const dirty=()=>{alignmentDirty=true};for(const event of ['move','moveend','resize','rotate','pitch'])try{m.on(event,dirty)}catch(_){}
    };
    const readAlignment=now=>{
      bindAlignmentMap();if(!alignmentDirty&&now-lastAlignment<650)return currentAlignment;if(now-lastAlignment<110&&currentAlignment)return currentAlignment;
      lastAlignment=now;alignmentDirty=false;currentAlignment=celestialAlignment(canvas.width,canvas.height);
      window.__BP_CELESTIAL_ALIGNMENT_V6252__=currentAlignment?{...currentAlignment,mapBound:true}:{mapBound:false,waitingForGlobe:true,updatedAt:Date.now()};
      return currentAlignment;
    };
    const render=now=>{
      if(document.hidden){frame=0;return}
      if(now-last>28){
        last=now;gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        const celestial=readAlignment(now),earthC=celestial?.center||[0,0],earthR=celestial?.earthRadius||0,angle=celestial?.viewAngle||0;
        gl.useProgram(galaxyProgram);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(galaxyPosition);gl.vertexAttribPointer(galaxyPosition,2,gl.FLOAT,false,0,0);gl.uniform2f(galaxyResolution,canvas.width,canvas.height);gl.uniform2f(galaxyEarth,earthC[0],earthC[1]);gl.uniform1f(galaxyEarthR,earthR);gl.uniform1f(galaxyTime,now);gl.uniform1f(galaxyAngle,angle);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        gl.useProgram(starProgram);gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);gl.enableVertexAttribArray(starPosition);gl.vertexAttribPointer(starPosition,4,gl.FLOAT,false,0,0);gl.uniform1f(starTime,now);gl.uniform1f(starAspect,canvas.width/canvas.height);gl.uniform2f(starEarth,earthC[0],earthC[1]);gl.uniform1f(starEarthR,earthR);gl.uniform1f(starAngle,angle);gl.drawArrays(gl.POINTS,0,starCount);
        renderPlanets(celestial,now);
        gl.useProgram(sphereProgram);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(quadPosition);gl.vertexAttribPointer(quadPosition,2,gl.FLOAT,false,0,0);gl.uniform2f(sphereResolution,canvas.width,canvas.height);gl.uniform1f(sphereTime,now);
        gl.uniform2f(sphereSun,celestial?.sun?.[0]||0,celestial?.sun?.[1]||0);gl.uniform2f(sphereMoon,celestial?.moon?.[0]||0,celestial?.moon?.[1]||0);gl.uniform1f(sphereSunRadius,celestial?.sunRadius||.071);gl.uniform1f(sphereMoonRadius,celestial?.moonRadius||.052);gl.uniform1f(sphereVisible,celestial?.visible?1:0);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      }
      frame=requestAnimationFrame(render);
    };
    const redraw=()=>{
      resize();alignmentDirty=true;
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        const celestial=readAlignment(0),earthC=celestial?.center||[0,0],earthR=celestial?.earthRadius||0,angle=celestial?.viewAngle||0;
        gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(galaxyProgram);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(galaxyPosition);gl.vertexAttribPointer(galaxyPosition,2,gl.FLOAT,false,0,0);gl.uniform2f(galaxyResolution,canvas.width,canvas.height);gl.uniform2f(galaxyEarth,earthC[0],earthC[1]);gl.uniform1f(galaxyEarthR,earthR);gl.uniform1f(galaxyTime,0);gl.uniform1f(galaxyAngle,angle);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        gl.useProgram(starProgram);gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);gl.enableVertexAttribArray(starPosition);gl.vertexAttribPointer(starPosition,4,gl.FLOAT,false,0,0);gl.uniform1f(starTime,0);gl.uniform1f(starAspect,canvas.width/canvas.height);gl.uniform2f(starEarth,earthC[0],earthC[1]);gl.uniform1f(starEarthR,earthR);gl.uniform1f(starAngle,angle);gl.drawArrays(gl.POINTS,0,starCount);
        renderPlanets(celestial,0);
        gl.useProgram(sphereProgram);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(quadPosition);gl.vertexAttribPointer(quadPosition,2,gl.FLOAT,false,0,0);gl.uniform2f(sphereResolution,canvas.width,canvas.height);gl.uniform1f(sphereTime,0);gl.uniform2f(sphereSun,celestial?.sun?.[0]||0,celestial?.sun?.[1]||0);gl.uniform2f(sphereMoon,celestial?.moon?.[0]||0,celestial?.moon?.[1]||0);gl.uniform1f(sphereSunRadius,celestial?.sunRadius||.071);gl.uniform1f(sphereMoonRadius,celestial?.moonRadius||.052);gl.uniform1f(sphereVisible,celestial?.visible?1:0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      }else if(!frame)frame=requestAnimationFrame(render);
    };
    window.addEventListener('resize',redraw,{passive:true});
    document.addEventListener('visibilitychange',()=>{if(!document.hidden)redraw();else{cancelAnimationFrame(frame);frame=0}});
    canvas.dataset.built='1';redraw();
  }
  buildSpaceStars();"""
    source, count = pattern.subn(replacement, source, count=1)
    if count != 1:
        raise AssertionError(f"Starfield builder: expected one V5000 builder, found {count}")
    pattern = re.compile(r"(?ms)^  function buildWordmark\(\)\{.*?^  \}\n")
    replacement = """  function buildWordmark(){
    if(wordmark)wordmark.dataset.built='1';
    return 0;
  }
"""
    source, count = pattern.subn(replacement, source, count=1)
    if count != 1:
        raise AssertionError(f"Wordmark builder: expected one V5000 builder, found {count}")
    return source

def launch_styles() -> str:
    return r"""<style id="bpWelcomeGateStylesV6252">
#bpWelcomeGateV1{pointer-events:auto!important;background:radial-gradient(ellipse at 50% 50%,rgba(2,8,18,.015),rgba(0,2,7,.14) 72%,rgba(0,1,5,.30))!important}
html.bpw-entry-locked #previewMap{background:#00030a!important}
html.bpw-entry-locked #previewMap canvas{filter:contrast(1.17) saturate(1.10) brightness(1.025)}
#bpWelcomeGateV1 .bpw-globe-aura{display:none!important}
#bpWelcomeGateV1 .bpw-starfield{background:radial-gradient(ellipse at 16% 26%,rgba(36,79,151,.20),transparent 38%),radial-gradient(ellipse at 82% 70%,rgba(31,71,130,.18),transparent 42%),radial-gradient(ellipse at 52% 48%,rgba(4,13,29,.12),transparent 68%)}
#bpWelcomeGateV1 .bpw-starfield canvas{display:none!important}
#bpWelcomeGateV1 .bpw-celestial-system{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;z-index:9!important;overflow:hidden;pointer-events:none;perspective:1200px;isolation:isolate;opacity:1!important;visibility:visible!important}
#bpWelcomeGateV1 .bpw-celestial-canvas{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;display:block!important;opacity:1!important;visibility:visible!important;pointer-events:none;mix-blend-mode:screen}
#bpWelcomeGateV1 .bpw-celestial-fallback-canvas{z-index:1!important}
#bpWelcomeGateV1 .bpw-wordmark-wrap{top:calc(env(safe-area-inset-top,0px) + clamp(18px,3.2vh,38px))!important;left:0!important;right:0!important;transform:none!important;z-index:10!important;padding:0 12px!important}
#bpWelcomeGateV1 .bpw-wordmark-wrap:before,#bpWelcomeGateV1 .bpw-wordmark-wrap:after{content:"";position:absolute;top:50%;width:clamp(12px,8vw,110px);height:1px;background:linear-gradient(90deg,transparent,rgba(132,197,236,.66));box-shadow:0 0 9px rgba(102,184,235,.24)}
#bpWelcomeGateV1 .bpw-wordmark-wrap:before{right:calc(50% + clamp(112px,25vw,260px))}
#bpWelcomeGateV1 .bpw-wordmark-wrap:after{left:calc(50% + clamp(112px,25vw,260px));transform:scaleX(-1)}
#bpWelcomeGateV1 .bpw-wordmark-static{position:relative!important;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:clamp(2px,.7vh,7px);width:100%;max-width:100%;white-space:normal!important;text-align:center;font-family:"Orbitron","Eurostile","Bank Gothic",system-ui,sans-serif!important;font-weight:900!important;text-transform:uppercase!important;transform:perspective(1100px) rotateX(8deg)!important;transform-style:preserve-3d!important;filter:drop-shadow(0 9px 11px rgba(0,0,0,.72))!important}
#bpWelcomeGateV1 .bpw-wordmark-main{display:block;font-size:clamp(30px,7.1vw,78px);line-height:.94;letter-spacing:.105em;margin-right:-.105em;color:#f4fbff;-webkit-text-fill-color:#f4fbff;-webkit-text-stroke:.6px rgba(220,241,255,.78);text-shadow:0 1px 0 #d8e8f6,0 2px 0 #94b2cb,0 3px 0 #55738f,0 4px 0 #263f59,0 7px 0 #10253a,0 11px 20px rgba(0,0,0,.88),0 0 24px rgba(112,190,242,.28)}
#bpWelcomeGateV1 .bpw-wordmark-sub{display:block;font-size:clamp(12px,2.55vw,24px);line-height:1.15;letter-spacing:.43em;margin-right:-.43em;font-weight:700;color:#a9d5f1;-webkit-text-fill-color:#a9d5f1;-webkit-text-stroke:.25px rgba(223,242,255,.48);text-shadow:0 1px 0 #5d7892,0 3px 8px rgba(0,0,0,.86),0 0 15px rgba(90,179,236,.30)}
#bpWelcomeGateV1 .bpw-letter-frame,#bpWelcomeGateV1 .bpw-letter-face{animation:none!important;will-change:auto!important}
#bpWelcomeGateV1 .bpw-status,#bpWelcomeGateV1 .bpw-sound{display:none!important}
#bpWelcomeGateV1 .bpw-gate-panel{left:12px!important;right:12px!important;bottom:calc(env(safe-area-inset-bottom,0px) + clamp(20px,4vh,42px))!important;z-index:12!important;display:flex!important;gap:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;opacity:1!important;visibility:visible!important;transform:none!important;transition:none!important;pointer-events:auto!important}
#bpWelcomeGateV1 .bpw-explainer{display:none!important}
#bpWelcomeGateV1 .bpw-actions{display:flex!important;flex-wrap:wrap;justify-content:center;align-items:center;gap:12px;width:100%;margin:0!important}
#bpWelcomeGateV1 .bpw-actions button{min-width:min(230px,42vw);max-width:calc(100vw - 28px);margin:0!important;animation:none!important;transition:background .2s ease,border-color .2s ease!important;backdrop-filter:none!important;box-shadow:0 8px 24px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.24)!important}
@media(max-width:620px){
#bpWelcomeGateV1 .bpw-wordmark-wrap{padding:0 8px!important}
#bpWelcomeGateV1 .bpw-wordmark-wrap:before{right:calc(50% + 104px)}
#bpWelcomeGateV1 .bpw-wordmark-wrap:after{left:calc(50% + 104px)}
#bpWelcomeGateV1 .bpw-wordmark-main{font-size:clamp(27px,8.5vw,42px);letter-spacing:.065em;margin-right:-.065em}
#bpWelcomeGateV1 .bpw-wordmark-sub{font-size:clamp(11px,3.1vw,16px);letter-spacing:.36em;margin-right:-.36em}
#bpWelcomeGateV1 .bpw-gate-panel{left:10px!important;right:10px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 16px)!important}
#bpWelcomeGateV1 .bpw-actions{flex-direction:column;gap:9px}
#bpWelcomeGateV1 .bpw-actions button{width:min(100%,340px);min-width:0;padding:14px 16px}
}
@media(prefers-reduced-motion:reduce){#bpWelcomeGateV1 .bpw-wordmark-static{transform:none!important}}
</style>"""

def patch_root_html(source: str) -> str:
    required = (
        '<div id="bpWelcomeGateV1"',
        'id="bpwStarsFarV4"',
        'id="bpwStarsNearV4"',
        'id="bpwWordmarkV3"',
        'class="bpw-globe-aura"',
        'data-mode="signup"',
        'data-mode="signin"',
        "function buildSpaceStars(){",
        "function buildWordmark(){",
    )
    for marker in required:
        if marker not in source:
            raise AssertionError(f"Root landing baseline is missing {marker}")

    source = replace_once(
        source,
        '    <div class="bpw-globe-aura" aria-hidden="true"></div>\n',
        "",
        "remove Earth aura element",
    )
    source = replace_once(
        source,
        '        <div class="bpw-wordmark" id="bpwWordmarkV3" role="img" aria-label="Welcome to BridgePoint Intelligence" data-title="WELCOME TO BRIDGEPOINT INTELLIGENCE"></div>',
        '        <div class="bpw-wordmark bpw-wordmark-static" id="bpwWordmarkV3" role="img" aria-label="BridgePoint Intelligence" data-title="BridgePoint Intelligence"><span class="bpw-wordmark-main">BRIDGEPOINT</span><span class="bpw-wordmark-sub">INTELLIGENCE</span></div>',
        "replace animated welcome text with static title",
    )
    source = replace_once(
        source,
        '      <p class="bpw-explainer"><strong>BridgePoint Intelligence</strong> brings properties, buildings, infrastructure, weather and real-world signals together in one live 3D globe.</p>\n',
        "",
        "remove extra welcome copy",
    )
    near_anchor = '    <div class="bpw-starfield bpw-stars-near" id="bpwStarsNearV4" aria-hidden="true"></div>\n'
    celestial = near_anchor + """    <div class="bpw-celestial-system" aria-hidden="true">
      <canvas class="bpw-celestial-canvas" id="bpwCelestialCanvasV6252"></canvas>
    </div>
"""
    source = replace_once(source, near_anchor, celestial, "insert Moon and Sun models")
    source = patch_stars(source)
    source = replace_once(source, "</head>", launch_styles() + "\n</head>", "install lightweight launch styling")
    if source.count('class="bpw-globe-aura"') != 0:
        raise AssertionError("Earth aura element remains in launch markup")
    if "WELCOME TO" in source:
        raise AssertionError("Animated WELCOME TO copy remains in launch HTML")
    return source


def patch_app_index(source: str) -> str:
    if 'id="bp-app-entry-gate-v6247"' not in source:
        raise AssertionError("V6247 app entry gate baseline is missing")
    source = source.replace("/?auth=signin&return=", "/?return=")
    if source.count("/?return=") != 2:
        raise AssertionError("Both app launch redirects must preserve the return route without auto-opening a modal")
    if "/?auth=signin&return=" in source:
        raise AssertionError("An app launch redirect still bypasses the two-button gate")
    source = replace_once(
        source,
        '../manifest.webmanifest"',
        '../manifest.webmanifest?v=6253-mobile-celestial-visibility"',
        "bust the app manifest URL",
    )
    source = replace_prefix_once(
        source,
        r"(app\.js\?v=)6247-universal-fresh-entry",
        r"\g<1>6253-mobile-celestial-visibility",
        "bust the app bundle URL",
    )
    return source


def patch_legacy_app(source: str) -> str:
    source = replace_once(
        source,
        'content="4;url=/app/?migrated=legacy-intelligence-v5820"',
        'content="0;url=/"',
        "make legacy installed app route immediately to the canonical gate",
    )
    source = replace_once(
        source,
        'href="/app/" style="color:#4ad9ff"',
        'href="/" style="color:#4ad9ff"',
        "legacy app fallback link",
    )
    source = replace_once(
        source,
        "sw.js?v=6218-tree-viewport-renderer-refresh",
        "sw.js?v=6253-mobile-celestial-visibility",
        "refresh legacy app service worker",
    )
    source = replace_once(
        source,
        "k.startsWith('bp-intelligence-')&&k!=='bp-intelligence-v5820'",
        "k.startsWith('bp-intelligence-')&&k!=='bp-intelligence-v6247-universal-fresh-entry-sidewalk'",
        "preserve the existing offline cache during legacy-app migration",
    )
    source = replace_once(
        source,
        "location.replace('/app/?migrated=legacy-intelligence-v5820')",
        "location.replace('/')",
        "legacy app final route",
    )
    return source


def patch_manifest(path: Path, expected_id: str) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("id") != expected_id:
        raise AssertionError(f"{path}: unexpected installed-app identity {data.get('id')!r}")
    if data.get("start_url") not in ("/app/", "/"):
        raise AssertionError(f"{path}: unexpected previous start_url {data.get('start_url')!r}")
    data["start_url"] = "/"
    path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")


def patch_bundle(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    source = replace_once(
        source,
        "navigator.serviceWorker.register('/sw.js?v=6247-universal-fresh-entry-sidewalk',{updateViaCache:'none'})",
        "navigator.serviceWorker.register('/sw.js?v=6253-mobile-celestial-visibility',{updateViaCache:'none'})",
        f"{path.name} service-worker refresh",
    )
    path.write_text(source, encoding="utf-8")


def patch_worker(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    source = replace_once(
        source,
        "const V='" + CACHE_NAME + "';",
        "const V='" + CACHE_NAME + "';\nconst BRIDGEPOINT_LAUNCH_EXPERIENCE_BUILD='" + BUILD + "';",
        "bump worker script while preserving the existing offline cache name",
    )
    path.write_text(source, encoding="utf-8")


def patch_site(site: Path) -> None:
    required = {
        "root": site / "index.html",
        "app index": site / "app" / "index.html",
        "landing bundle": site / "landing.js",
        "app bundle": site / "app.js",
        "service worker": site / "sw.js",
        "root manifest": site / "manifest.webmanifest",
        "legacy app index": site / "app" / "intelligence-launch" / "index.html",
        "legacy app manifest": site / "app" / "intelligence-launch" / "manifest.webmanifest",
    }
    for label, path in required.items():
        if not path.is_file():
            raise FileNotFoundError(f"Production Pages artifact is missing {label}: {path}")

    root = required["root"].read_text(encoding="utf-8")
    root = patch_root_html(root)
    root = replace_once(
        root,
        './manifest.webmanifest"',
        './manifest.webmanifest?v=6253-mobile-celestial-visibility"',
        "bust the root manifest URL",
    )
    root = replace_prefix_once(
        root,
        r"(landing\.js\?v=)6247-universal-fresh-entry",
        r"\g<1>6253-mobile-celestial-visibility",
        "bust the landing bundle URL",
    )
    required["root"].write_text(root, encoding="utf-8")

    app_index = patch_app_index(required["app index"].read_text(encoding="utf-8"))
    required["app index"].write_text(app_index, encoding="utf-8")
    patch_bundle(required["landing bundle"])
    patch_bundle(required["app bundle"])
    patch_worker(required["service worker"])

    patch_manifest(required["root manifest"], "/bridgepoint-intelligence-v5050")
    legacy = patch_legacy_app(required["legacy app index"].read_text(encoding="utf-8"))
    legacy = replace_once(
        legacy,
        './manifest.webmanifest"',
        './manifest.webmanifest?v=6253-mobile-celestial-visibility"',
        "bust the legacy app manifest URL",
    )
    required["legacy app index"].write_text(legacy, encoding="utf-8")
    patch_manifest(required["legacy app manifest"], "/app/intelligence-launch/")

    checks = {
        "root": [
            'class="bpw-wordmark bpw-wordmark-static"',
            ">INTELLIGENCE</span></div>",
            "bpw-celestial-system",
            "bpwCelestialCanvasV6252",
            "bpw-wordmark-main",
            "const starCount=lowPower?4200:8200",
            "vec3 lunar=mix",
            "const galaxyProgram=program(",
            "const planetProgram=program(",
            "float dustLane=1.0-smoothstep",
            "name:'Neptune'",
            "ringR=length(vec2(q.x,q.y/.34))",
            "renderPlanets(celestial,now)",
            "depth=.72+z*2.0",
            "bpWelcomeGateStylesV6252",
            'data-mode="signup"',
            'data-mode="signin"',
        ],
        "app index": [
            "/?return=",
            "app.js?v=6253-mobile-celestial-visibility",
            "manifest.webmanifest?v=6253-mobile-celestial-visibility",
        ],
        "landing bundle": [SW_URL],
        "app bundle": [SW_URL],
        "service worker": ["const V='" + CACHE_NAME + "';", "BRIDGEPOINT_LAUNCH_EXPERIENCE_BUILD='v6253-mobile-celestial-visibility'"],
        "legacy app index": ['content="0;url=/"', "location.replace('/')", "sw.js?v=6253-mobile-celestial-visibility"],
    }
    for label, markers in checks.items():
        content = required[label].read_text(encoding="utf-8")
        for marker in markers:
            if marker not in content:
                raise AssertionError(f"{label}: missing required launch marker {marker}")

    root_manifest = json.loads(required["root manifest"].read_text(encoding="utf-8"))
    legacy_manifest = json.loads(required["legacy app manifest"].read_text(encoding="utf-8"))
    if root_manifest.get("start_url") != "/" or legacy_manifest.get("start_url") != "/":
        raise AssertionError("Installed app manifests must both launch at the canonical globe gate")
    if root_manifest.get("id") != "/bridgepoint-intelligence-v5050":
        raise AssertionError("The current installed-app identity changed")
    if legacy_manifest.get("id") != "/app/intelligence-launch/":
        raise AssertionError("The legacy installed-app identity changed")
    print("BRIDGEPOINT_LAUNCH_EXPERIENCE_V6253_PATCH_PASS")
    print("Website, current PWA and legacy PWA all route to the same root globe gate.")
    print("Only the launch HTML, app-entry handoff, PWA entry URLs and worker update marker are changed.")
    print("Existing offline cache key and authentication/session logic are preserved.")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: apply_launch_experience_v6253.py SITE_DIRECTORY")
    patch_site(Path(sys.argv[1]))


if __name__ == "__main__":
    main()
