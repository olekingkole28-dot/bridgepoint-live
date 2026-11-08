from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BUILD = "v6254-realistic-solar-scene"
SW_URL = "/sw.js?v=6254-realistic-solar-scene"
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
    const canvas=document.getElementById('bpwCelestialCanvasV6254');
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
    let state=0x6254a71;
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
        const centerNX=(centerX-width*.5)/unit,centerNY=(height*.5-centerY)/unit,sunRadius=Math.min(earthRadius*.47,Math.max(.075,Math.min(.16,height/(2*unit)*.20))),moonRadius=earthRadius*.136;
        const helio=o=>{
          const N=(o.n+o.nd*d)*rad,I=(o.i+o.id*d)*rad,W=(o.w+o.wd*d)*rad,Ecc=o.e+o.ed*d,M=((o.m+o.md*d)%360+360)%360*rad;
          let E=M+Ecc*Math.sin(M)*(1+Ecc*Math.cos(M));
          for(let j=0;j<5;j++)E-=(E-Ecc*Math.sin(E)-M)/(1-Ecc*Math.cos(E));
          const xv=o.a*(Math.cos(E)-Ecc),yv=o.a*Math.sqrt(Math.max(0,1-Ecc*Ecc))*Math.sin(E),v=Math.atan2(yv,xv),rr=Math.hypot(xv,yv);
          return{x:rr*(Math.cos(N)*Math.cos(v+W)-Math.sin(N)*Math.sin(v+W)*Math.cos(I)),y:rr*(Math.sin(N)*Math.cos(v+W)+Math.cos(N)*Math.sin(v+W)*Math.cos(I)),z:rr*Math.sin(v+W)*Math.sin(I)};
        };
        const earth=helio({n:0,nd:0,i:0,id:0,w:282.9404,wd:.0000470935,a:1,e:.016709,ed:-.000000001151,m:356.0470,md:.9856002585});
        const planetData=[
          {name:'Mercury',type:0,radius:earthRadius*.032,n:48.3313,nd:.0000324587,i:7.0047,id:.00000005,w:29.1241,wd:.0000101444,a:.387098,e:.205635,ed:.000000000559,m:168.6562,md:4.0923344368},
          {name:'Venus',type:1,radius:earthRadius*.049,n:76.6799,nd:.0000246590,i:3.3946,id:.0000000275,w:54.8910,wd:.0000138374,a:.723330,e:.006773,ed:-.000000001302,m:48.0052,md:1.6021302244},
          {name:'Mars',type:2,radius:earthRadius*.037,n:49.5574,nd:.0000211081,i:1.8497,id:-.0000000178,w:286.5016,wd:.0000292961,a:1.523688,e:.093405,ed:.000000002516,m:18.6021,md:.5240207766},
          {name:'Jupiter',type:3,radius:earthRadius*.168,n:100.4542,nd:.0000276854,i:1.3030,id:-.0000001557,w:273.8777,wd:.0000164505,a:5.20256,e:.048498,ed:.000000004469,m:19.8950,md:.0830853001},
          {name:'Saturn',type:4,radius:earthRadius*.154,n:113.6634,nd:.0000238980,i:2.4886,id:-.0000001081,w:339.3939,wd:.0000297661,a:9.55475,e:.055546,ed:-.000000009499,m:316.9670,md:.0334442282},
          {name:'Uranus',type:5,radius:earthRadius*.101,n:74.0005,nd:.000013978,i:.7733,id:.000000019,w:96.6612,wd:.000030565,a:19.18171,e:.047318,ed:.00000000745,m:142.5905,md:.011725806},
          {name:'Neptune',type:6,radius:earthRadius*.099,n:131.7806,nd:.000030173,i:1.7700,id:-.000000255,w:272.8461,wd:-.000006027,a:30.05826,e:.008606,ed:.00000000215,m:260.2471,md:.005995147}
        ];
        const planets=planetData.map(o=>{
          const hp=helio(o),x=hp.x-earth.x,y=hp.y-earth.y,z=hp.z-earth.z,ye=y*Math.cos(eps)-z*Math.sin(eps),ze=y*Math.sin(eps)+z*Math.cos(eps),range=Math.hypot(x,ye,ze);
          const ra=Math.atan2(ye,x),dec=Math.asin(Math.max(-1,Math.min(1,ze/Math.max(1e-9,range))));
          let lng=ra/rad-gmst;lng=((lng+540)%360+360)%360-180;
          const dir=screenVector(lng,dec/rad);if(!dir)return null;
          const distance=earthRadius+.12+Math.log1p(range)*.12;
          return{name:o.name,type:o.type,center:[centerNX+dir.x*distance,centerNY+dir.y*distance],radius:o.radius};
        }).filter(Boolean);
        const verticalHalf=height/(2*unit),sunY=Math.min(earthRadius+sunRadius*.24,verticalHalf-sunRadius*.62),sun=[centerNX,centerNY+sunY],orbitPhase=Date.now()*.000085;
        const moon=[centerNX+Math.cos(orbitPhase)*earthRadius*.95,centerNY+(-1.48+Math.sin(orbitPhase)*.34)*earthRadius];
        return{center:[centerNX,centerNY],sun,moon,sunRadius,moonRadius,visible:1,subsolar:{lng:sunLng,lat:sunDec/rad},earthRadius,viewAngle:bearing,planets,direction:[0,1],sunlightDirection:[0,.92,.40],orbitPhase,planetsScale:'compressed-relative',updatedAt:Date.now()};
      }catch(_){return null}
    }
    const fallback=()=>{
      let target=canvas;
      if(gl){
        if(!fallbackCanvas){
          fallbackCanvas=document.createElement('canvas');
          fallbackCanvas.id='bpwCelestialFallbackCanvasV6254';
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
      ctx.save();ctx.translate(sun.x,sun.y);ctx.rotate(t*.018);ctx.beginPath();ctx.arc(0,0,sr*.985,0,Math.PI*2);ctx.clip();
      for(let i=0;i<95;i++){const a=i*2.399963,dist=Math.sqrt((i+.5)/95)*sr*.91,x=Math.cos(a)*dist,y=Math.sin(a)*dist,r=sr*(.012+(i%5)*.009);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='rgba(255,247,188,'+(.025+(i%4)*.018)+')';ctx.fill()}
      for(const spot of [[-.31,.16,.10],[.28,-.18,.075],[-.04,-.42,.052]]){const x=spot[0]*sr,y=spot[1]*sr,r=spot[2]*sr,pg=ctx.createRadialGradient(x,y,r*.12,x,y,r*1.7);pg.addColorStop(0,'rgba(52,12,5,.92)');pg.addColorStop(.42,'rgba(105,25,6,.76)');pg.addColorStop(1,'rgba(160,55,8,0)');ctx.fillStyle=pg;ctx.beginPath();ctx.ellipse(x,y,r*1.8,r,0,0,Math.PI*2);ctx.fill()}
      ctx.restore();
      const phase=Date.now()*.000085,moon=point([alignment.center[0]+Math.cos(phase)*alignment.earthRadius*.95,alignment.center[1]+(-1.48+Math.sin(phase)*.34)*alignment.earthRadius]),mr=alignment.moonRadius*unit;
      ctx.save();ctx.translate(w*.5+alignment.center[0]*unit,h*.5-alignment.center[1]*unit);ctx.beginPath();ctx.ellipse(0,alignment.earthRadius*unit*1.48,alignment.earthRadius*unit*.95,alignment.earthRadius*unit*.34,0,0,Math.PI*2);ctx.strokeStyle='rgba(127,177,224,.42)';ctx.lineWidth=Math.max(1,unit*.0025);ctx.setLineDash([unit*.012,unit*.018]);ctx.stroke();ctx.setLineDash([]);ctx.restore();
      g=ctx.createRadialGradient(moon.x-mr*.32,moon.y-mr*.36,mr*.03,moon.x,moon.y,mr);
      g.addColorStop(0,'#f5f5ef');g.addColorStop(.52,'#c7c9c6');g.addColorStop(1,'#303b47');
      ctx.beginPath();ctx.arc(moon.x,moon.y,mr,0,Math.PI*2);ctx.fillStyle=g;ctx.shadowColor='rgba(188,219,247,.34)';ctx.shadowBlur=unit*.02;ctx.fill();ctx.shadowBlur=0;
      ctx.save();ctx.translate(moon.x,moon.y);ctx.rotate(phase);ctx.beginPath();ctx.arc(0,0,mr,0,Math.PI*2);ctx.clip();
      for(let i=0;i<320;i++){const a=i*2.399963,dist=Math.sqrt((i+.5)/320)*mr*.92,cx=Math.cos(a)*dist,cy=Math.sin(a)*dist*.86,cr=mr*(.018+(i%9)*.014);ctx.beginPath();ctx.arc(cx,cy,cr,0,Math.PI*2);ctx.fillStyle='rgba(43,51,59,'+(.14+(i%5)*.035)+')';ctx.fill();ctx.beginPath();ctx.arc(cx-cr*.16,cy-cr*.22,cr*.68,0,Math.PI*2);ctx.strokeStyle='rgba(250,251,247,.24)';ctx.lineWidth=Math.max(.5,cr*.23);ctx.stroke()}
      ctx.restore();
      for(const body of alignment.planets||[]){const pc=point(body.center),r=body.radius*unit;ctx.beginPath();ctx.arc(pc.x,pc.y,r,0,Math.PI*2);ctx.fillStyle=body.type===3?'#d9b88a':body.type===2?'#c65334':body.type===1?'#decfa6':body.type===4?'#c3a47a':body.type===5?'#8bcad2':body.type===6?'#4c83c1':'#9a9d9b';ctx.fill();if(body.type===4){ctx.beginPath();ctx.ellipse(pc.x,pc.y,r*1.75,r*.48,-.16,0,Math.PI*2);ctx.strokeStyle='rgba(216,190,147,.72)';ctx.lineWidth=Math.max(1,r*.25);ctx.stroke()}}
      const earthX=w*.5+alignment.center[0]*unit,earthY=h*.5-alignment.center[1]*unit,er=alignment.earthRadius*unit;
      ctx.save();ctx.globalCompositeOperation='destination-out';ctx.beginPath();ctx.arc(earthX,earthY,er*1.008,0,Math.PI*2);ctx.fill();ctx.restore();
      ctx.save();ctx.beginPath();ctx.arc(earthX,earthY,er*.998,0,Math.PI*2);ctx.clip();
      const nightShade=ctx.createLinearGradient(earthX,earthY-er,earthX,earthY+er);
      nightShade.addColorStop(0,'rgba(0,0,0,0)');nightShade.addColorStop(.36,'rgba(0,0,0,0)');nightShade.addColorStop(.49,'rgba(1,5,16,.16)');nightShade.addColorStop(.62,'rgba(0,5,18,.48)');nightShade.addColorStop(.82,'rgba(0,4,18,.76)');nightShade.addColorStop(1,'rgba(0,4,16,.84)');
      ctx.fillStyle=nightShade;ctx.fillRect(earthX-er,earthY-er,er*2,er*2);
      ctx.strokeStyle='rgba(103,171,236,.38)';ctx.lineWidth=Math.max(1,unit*.0032);ctx.beginPath();ctx.arc(earthX,earthY,er*.991,0,Math.PI*2);ctx.stroke();ctx.restore();
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
      'precision mediump float;uniform vec2 u_resolution;uniform vec2 u_earthC;uniform float u_earthR;uniform float u_time;uniform float u_viewAngle;float hash21(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash21(i),b=hash21(i+vec2(1.0,0.0)),c=hash21(i+vec2(0.0,1.0)),d=hash21(i+vec2(1.0,1.0));return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);}float fbm2(vec2 p){float v=0.0,a=.55;for(int i=0;i<5;i++){v+=a*noise2(p);p=p*2.03+vec2(13.1,7.7);a*=.47;}return v;}void main(){float unit=min(u_resolution.x,u_resolution.y);vec2 p=(gl_FragCoord.xy-.5*u_resolution)/unit;if(u_earthR>0.0&&length(p-u_earthC)<u_earthR*1.075)discard;float c=cos(u_viewAngle-.42),s=sin(u_viewAngle-.42);vec2 q=mat2(c,-s,s,c)*p;float aspect=u_resolution.x/u_resolution.y;float bandOffset=mix(.48,.02,smoothstep(1.05,1.85,aspect));float nebulaOffset=mix(.62,.34,smoothstep(1.05,1.85,aspect));float curve=.16*sin(q.x*2.5)+.025*sin(q.x*6.1)+.012*sin(q.x*13.0);float band=q.y-(bandOffset+curve);float cloud=fbm2(q*vec2(3.4,10.0)+vec2(u_time*.000003,0.0));float detail=fbm2(q*vec2(9.0,27.0)-vec2(u_time*.0000018,0.0));float fine=fbm2(q*vec2(22.0,58.0)+vec2(7.0,-u_time*.000001));float width=.082+.078*cloud;float core=exp(-pow(band/width,2.0));float outer=exp(-pow(band/(width*2.75),2.0));float laneA=1.0-smoothstep(.006,.034,abs(band-.024*sin(q.x*5.3)));float laneB=1.0-smoothstep(.004,.021,abs(band+.052+.016*sin(q.x*8.0)));float laneC=1.0-smoothstep(.006,.028,abs(band-.078+.010*cos(q.x*11.0)));float dust=clamp(laneA*.76+laneB*.40+laneC*.24,0.0,1.0);float clump=fbm2(q*vec2(6.5,19.0)+vec2(3.0,11.0));float density=core*(.12+.62*cloud+.34*detail+.18*fine)*(.48+.52*dust);density+=outer*clump*.12;float galacticBulge=exp(-length((q-vec2(-.08,bandOffset))*vec2(1.1,3.1))*2.35)*(.35+.65*detail);float blueNeb=exp(-length((q-vec2(-.22,nebulaOffset))*vec2(1.7,3.4))*2.0)*fbm2(q*vec2(8.0,20.0)+vec2(12.0,2.0));float violetNeb=exp(-length((q-vec2(.24,-nebulaOffset))*vec2(1.9,4.2))*2.0)*fbm2(q*vec2(7.0,18.0)+vec2(4.0,17.0));float roseNeb=exp(-length((q-vec2(.54,bandOffset-.22))*vec2(2.4,5.0))*2.0)*detail;vec3 milky=mix(vec3(.12,.16,.34),vec3(.58,.56,.65),clamp(.20+cloud*.78,0.0,1.0));milky=mix(milky,vec3(.97,.72,.45),smoothstep(.28,.84,q.x)*.38);vec3 warm=vec3(1.0,.61,.34)*galacticBulge;vec3 neb=vec3(.20,.43,.90)*blueNeb+vec3(.47,.24,.82)*violetNeb+vec3(.72,.28,.39)*roseNeb;float dustShadow=(1.0-smoothstep(.25,.84,fbm2(q*vec2(15.0,38.0)+vec2(2.0,8.0))))*core;vec3 color=milky*density+warm*.34+neb*.43;color*=1.0-dustShadow*.32;float granule=hash21(floor(q*vec2(210.0,420.0)));float pinStars=step(.996,granule)*outer*(.28+.72*fine);color+=vec3(.72,.81,1.0)*pinStars*.75;float alpha=clamp(density*.86+galacticBulge*.20+blueNeb*.24+violetNeb*.23+roseNeb*.20+pinStars*.26,0.0,.78);if(alpha<.006)discard;gl_FragColor=vec4(color,alpha);}'
    );
    const sphereProgram=program(
      'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}',
      'precision mediump float;uniform vec2 u_resolution;uniform float u_time;uniform vec2 u_sunC;uniform vec2 u_moonC;uniform vec2 u_earthC;uniform float u_sunR;uniform float u_moonR;uniform float u_earthR;uniform float u_celestialVisible;uniform float u_moonSpin;float hash31(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash31(i),b=hash31(i+vec3(1,0,0)),c=hash31(i+vec3(0,1,0)),d=hash31(i+vec3(1,1,0)),e=hash31(i+vec3(0,0,1)),f1=hash31(i+vec3(1,0,1)),g=hash31(i+vec3(0,1,1)),h=hash31(i+vec3(1,1,1));return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,f1,f.x),mix(g,h,f.x),f.y),f.z);}float fbm(vec3 p){float v=0.0,a=.52;for(int i=0;i<5;i++){v+=a*noise3(p);p=p*2.03+vec3(1.7,2.3,1.1);a*=.49;}return v;}float craterRelief(vec2 uv,out float rims,out float shadows){vec2 grid=uv*vec2(27.0,17.0),cell=floor(grid),f=fract(grid);float bowls=0.0;rims=0.0;shadows=0.0;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 off=vec2(float(x),float(y)),id=cell+off;vec2 rnd=vec2(hash31(vec3(id,2.1)),hash31(vec3(id,7.3)));vec2 delta=off+vec2(.18)+rnd*.64-f;float dist=length(delta);float radius=.11+hash31(vec3(id,9.2))*.22;float bowl=1.0-smoothstep(radius*.24,radius*.88,dist);float rim=1.0-smoothstep(radius*.82,radius*1.08,dist);float shadow=1.0-smoothstep(radius*1.03,radius*1.70,dist);bowls=max(bowls,bowl);rims=max(rims,rim);shadows=max(shadows,shadow);}}vec2 bigGrid=uv*vec2(7.0,4.8),bigCell=floor(bigGrid),bigF=fract(bigGrid);for(int by=-1;by<=1;by++){for(int bx=-1;bx<=1;bx++){vec2 off=vec2(float(bx),float(by)),id=bigCell+off;vec2 rnd=vec2(hash31(vec3(id,19.1)),hash31(vec3(id,27.3)));vec2 delta=off+vec2(.18)+rnd*.64-bigF;float dist=length(delta);float radius=.20+hash31(vec3(id,29.2))*.26;float bowl=1.0-smoothstep(radius*.22,radius*.88,dist);float rim=1.0-smoothstep(radius*.84,radius*1.10,dist);float shadow=1.0-smoothstep(radius*1.04,radius*1.70,dist);bowls=max(bowls,bowl*.96);rims=max(rims,rim);shadows=max(shadows,shadow);}}return bowls;}void main(){float unit=min(u_resolution.x,u_resolution.y);vec2 p=(gl_FragCoord.xy-.5*u_resolution)/unit;vec3 outColor=vec3(0.0);float outAlpha=0.0;if(u_earthR>0.0){vec2 eq=(p-u_earthC)/u_earthR;float er=length(eq);if(er<1.025){float ez=sqrt(max(0.0,1.0-dot(eq,eq)));vec3 en=normalize(vec3(eq,ez));vec3 sunDir=normalize(vec3(0.0,.92,.40));float incidence=dot(en,sunDir);float night=1.0-smoothstep(-.16,.15,incidence);float twilight=exp(-abs(incidence)*24.0);vec3 nightColor=vec3(.003,.009,.028)+vec3(.012,.035,.075)*fbm(vec3(eq*4.0,1.7));outColor=mix(outColor,nightColor,night*.76);outColor+=vec3(.035,.10,.18)*twilight*.26;float air=pow(max(0.0,1.0-ez),2.0);outColor+=vec3(.12,.29,.53)*air*.38;outAlpha=max(outAlpha,night*.61);outAlpha=max(outAlpha,air*.17);}}if(u_earthR>0.0){vec2 oq=(p-u_earthC)/u_earthR;float orbitRadius=length(vec2(oq.x/.95,(oq.y+1.48)/.34));float orbitLine=1.0-smoothstep(.010,.028,abs(orbitRadius-1.0));float orbitVisible=orbitLine*step(1.018,length(oq))*step(oq.y,-.10);outColor+=vec3(.27,.48,.72)*orbitVisible*.56;outAlpha=max(outAlpha,orbitVisible*.52);}if(u_celestialVisible>.5){vec2 sdv=(p-u_sunC)/u_sunR;float sr=length(sdv),sa=atan(sdv.y,sdv.x);float sunBehindEarth=u_earthR>0.0&&length(p-u_earthC)<u_earthR*1.008?1.0:0.0;if(sr<2.65&&sunBehindEarth<.5){float solarTime=u_time*.000055;float plume=pow(max(0.0,.5+.5*sin(sa*7.0+solarTime*1.7+sin(sa*15.0-solarTime)*.55)),5.0);float coronaNoise=fbm(vec3(cos(sa)*5.0,sin(sa)*5.0,solarTime*.14));float towardEarth=exp(-pow((sa+1.5708)/.38,2.0));float flareReach=1.20+.23*plume+.12*(coronaNoise-.45)+.76*towardEarth;float corona=exp(-max(0.0,sr-1.0)*1.72);float flare=1.0-smoothstep(flareReach-.09,flareReach+.14,sr);float ray=pow(max(0.0,sin(sa*13.0+solarTime*1.2)),18.0)*(1.0-smoothstep(1.02,2.40,sr));float prominenceBand=1.0-smoothstep(.025,.11,abs(sr-(1.18+.28*plume+.24*towardEarth)));float halo=1.0-smoothstep(1.38,2.55,sr);float solarAlpha=clamp(max(corona*.24,max(flare*.72,max(ray*.82,prominenceBand*.44))),0.0,.96);outColor=mix(outColor,vec3(1.0,.23,.025),solarAlpha);outColor+=vec3(1.0,.43,.12)*(halo*.15+ray*.28+prominenceBand*.23);outAlpha=max(outAlpha,solarAlpha*.88);}if(sr<1.0){vec3 q=vec3(sdv,sqrt(max(0.0,1.0-dot(sdv,sdv))));vec3 n=normalize(q);float spin=u_time*.000035;n.xz=mat2(cos(spin),-sin(spin),sin(spin),cos(spin))*n.xz;float convection=fbm(n*7.5+vec3(0.0,u_time*.000006,u_time*.000004));float granulation=fbm(n*23.0-vec3(u_time*.000012,0.0,u_time*.000007));float cells=fbm(n*54.0+vec3(4.0,2.0,u_time*.000004));float micro=fbm(n*112.0+vec3(u_time*.000009,9.0,3.0));float filaments=fbm(n*34.0+vec3(7.0,u_time*.000008,2.0));float brightCells=pow(max(0.0,cells-.42),1.45);vec3 deep=vec3(.34,.018,.004),orange=vec3(.92,.16,.012),gold=vec3(1.0,.48,.055),hot=vec3(1.0,.88,.55),white=vec3(1.0,.985,.83);vec3 solar=mix(deep,orange,smoothstep(.10,.75,convection));solar=mix(solar,gold,smoothstep(.28,.73,granulation)*.72);solar=mix(solar,hot,smoothstep(.37,.79,cells)*.66);solar=mix(solar,white,brightCells*.42);solar+=vec3(.16,.045,.008)*(filaments-.43);solar*=.78+.34*granulation;float spot1=length((n.xy-vec2(-.32,.18))*vec2(1.0,1.65));float spot2=length((n.xy-vec2(.27,-.19))*vec2(1.25,1.6));float spot3=length((n.xy-vec2(-.03,-.48))*vec2(1.4,1.8));float penumbra=max(1.0-smoothstep(.055,.14,spot1),max(1.0-smoothstep(.045,.11,spot2),1.0-smoothstep(.035,.09,spot3)));float umbra=max(1.0-smoothstep(.018,.060,spot1),max(1.0-smoothstep(.015,.047,spot2),1.0-smoothstep(.012,.038,spot3)));solar=mix(solar,vec3(.42,.075,.012),penumbra*.66);solar=mix(solar,vec3(.075,.009,.002),umbra*.92);float facula=pow(max(0.0,filaments-.58),2.0)*.5;solar+=vec3(.26,.105,.018)*facula;float limb=.42+.58*pow(max(n.z,0.0),.38);solar*=limb;solar*=.56+.44*max(dot(n,normalize(vec3(0.0,.92,.40))),0.0);solar+=white*pow(max(n.z,0.0),10.0)*.24;outColor=mix(outColor,solar,1.0);outAlpha=1.0;}}if(u_celestialVisible>.5){vec2 mdv=(p-u_moonC)/u_moonR;float mr=length(mdv);float overEarth=u_earthR>0.0?step(length(p-u_earthC),u_earthR*1.012):0.0;if(mr<1.28&&overEarth<.5){float glow=1.0-smoothstep(1.0,1.28,mr);outColor=mix(outColor,vec3(.43,.62,.84),glow*.20);outAlpha=max(outAlpha,glow*.22);}if(mr<1.0&&overEarth<.5){vec2 q=mdv;float z=sqrt(max(0.0,1.0-dot(q,q)));vec3 n=normalize(vec3(q,z));n.xz=mat2(cos(u_moonSpin),-sin(u_moonSpin),sin(u_moonSpin),cos(u_moonSpin))*n.xz;float libration=sin(u_moonSpin*.08)*.018;n.xy=mat2(cos(libration),-sin(libration),sin(libration),cos(libration))*n.xy;vec2 uv=vec2(atan(n.y,n.x)*.15915494+.5,asin(clamp(n.z,-1.0,1.0))*.31830989+.5);float rim,shadow;float bowls=craterRelief(uv,rim,shadow);float highlands=fbm(n*17.0);float fine=fbm(n*88.0+vec3(3.0,7.0,2.0));float micro=fbm(n*156.0+vec3(9.0,4.0,6.0));float mariaNoise=fbm(n*4.5+vec3(8.0,2.0,5.0));float maria=smoothstep(.45,.68,mariaNoise);float rayNoise=fbm(n*29.0+vec3(11.0,1.0,4.0));float ejecta=pow(max(0.0,fbm(n*38.0+vec3(2.0,9.0,3.0))-.62),2.0);float albedo=.73+(highlands-.5)*.22+(fine-.5)*.15+(micro-.5)*.10-bowls*.42+rim*.30-shadow*.14-maria*.24;vec3 high=vec3(.73,.75,.75),low=vec3(.32,.36,.39);vec3 lunar=mix(low,high,clamp(albedo,0.0,1.0));lunar+=vec3(.17,.17,.15)*rim*.46;lunar*=.88+rayNoise*.17+micro*.09;lunar+=vec3(.12,.13,.14)*ejecta;vec2 toSun=normalize(u_sunC-u_moonC);vec3 lightDir=normalize(vec3(toSun.x,toSun.y,.40));float light=max(dot(n,lightDir),0.0);float limb=.18+.82*pow(max(n.z,0.0),.42);lunar*=.10+.90*light;lunar*=limb;lunar*=1.0-shadow*.22;lunar+=vec3(.11,.13,.15)*rim*.15;outColor=mix(outColor,lunar,1.0);outAlpha=1.0;}}gl_FragColor=vec4(outColor,outAlpha);}'
    );
    const planetProgram=program(
      'attribute vec2 a_pos;uniform vec2 u_resolution;uniform vec2 u_bodyC;uniform float u_bodyR;uniform float u_bodyType;void main(){float aspect=u_resolution.x/u_resolution.y;float scale=u_bodyType>6.5?2.20:1.0;vec2 p=u_bodyC+a_pos*u_bodyR*1.98*scale;gl_Position=vec4(p.x*2.0/aspect,p.y*2.0,0.0,1.0);}',
      'precision mediump float;uniform vec2 u_resolution;uniform vec2 u_bodyC;uniform float u_bodyR;uniform float u_bodyType;uniform float u_time;uniform vec2 u_lightDir;float hash31(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash31(i),b=hash31(i+vec3(1,0,0)),c=hash31(i+vec3(0,1,0)),d=hash31(i+vec3(1,1,0)),e=hash31(i+vec3(0,0,1)),f1=hash31(i+vec3(1,0,1)),g=hash31(i+vec3(0,1,1)),h=hash31(i+vec3(1,1,1));return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,f1,f.x),mix(g,h,f.x),f.y),f.z);}float fbm(vec3 p){float v=0.0,a=.56;for(int i=0;i<4;i++){v+=a*noise3(p);p=p*2.03+vec3(2.2,1.3,3.7);a*=.47;}return v;}void main(){float unit=min(u_resolution.x,u_resolution.y);vec2 p=(gl_FragCoord.xy-.5*u_resolution)/unit;vec2 q=(p-u_bodyC)/u_bodyR;float r=length(q);if(u_bodyType>6.5){float ringR=length(vec2(q.x,(q.y-.045*q.x)/.46));if(ringR<1.02||ringR>2.12)discard;float theta=atan(q.y,q.x);float radialNoise=fbm(vec3(ringR*37.0,theta*2.1,4.0));float fineDust=fbm(vec3(ringR*118.0,theta*5.0,8.0));float ringBands=.5+.5*sin(ringR*108.0+radialNoise*7.0);float ringDust=.5+.5*sin(ringR*340.0+fineDust*4.0);float cassini=1.0-smoothstep(.008,.034,abs(ringR-1.52));float encke=1.0-smoothstep(.006,.018,abs(ringR-1.91));float innerFade=smoothstep(1.02,1.10,ringR);float outerFade=1.0-smoothstep(2.02,2.12,ringR);float opacity=innerFade*outerFade*(.64+.23*ringBands+.13*ringDust)*(1.0-cassini*.94)*(1.0-encke*.44);vec3 ice=mix(vec3(.29,.25,.20),vec3(.91,.84,.72),.32+.48*ringBands+.20*radialNoise);ice=mix(ice,vec3(.72,.67,.58),fineDust*.22);float ringLight=.66+.34*max(dot(normalize(vec3(u_lightDir,.58)),vec3(0.0,.18,1.0)),0.0);gl_FragColor=vec4(ice*ringLight,opacity);return;}if(r>1.0)discard;float z=sqrt(max(0.0,1.0-dot(q,q)));vec3 n=normalize(vec3(q,z));float spin=u_time*.000014;n.xz=mat2(cos(spin),-sin(spin),sin(spin),cos(spin))*n.xz;float broad=fbm(n*5.5),fine=fbm(n*24.0+vec3(4.0,2.0,1.0)),micro=fbm(n*72.0+vec3(7.0,3.0,5.0));vec3 base=vec3(.55,.56,.56);if(u_bodyType<.5){float craters=fbm(n*28.0),basins=fbm(n*8.0+vec3(5.0,1.0,3.0)),rays=pow(max(0.0,fbm(n*55.0+vec3(8.0,2.0,4.0))-.68),2.0);base=mix(vec3(.19,.20,.21),vec3(.76,.73,.67),smoothstep(.22,.76,broad));base=mix(base,vec3(.30,.31,.30),smoothstep(.49,.71,basins)*.28);base*=.76+fine*.34;base*=1.0-smoothstep(.53,.75,craters)*.32;base+=vec3(.11,.105,.09)*rays*.55;}else if(u_bodyType<1.5){vec3 cloudDir=n;cloudDir.xz=mat2(cos(u_time*.000006),-sin(u_time*.000006),sin(u_time*.000006),cos(u_time*.000006))*cloudDir.xz;float clouds=fbm(cloudDir*12.0+vec3(0.0,u_time*.000006,0.0));float bands=sin(n.y*22.0+clouds*5.5+fine*2.1)*.5+.5;float highCloud=fbm(cloudDir*42.0+vec3(4.0,2.0,7.0));base=mix(vec3(.63,.43,.25),vec3(.94,.82,.62),smoothstep(.22,.78,clouds));base=mix(base,vec3(1.0,.94,.81),bands*.20+highCloud*.12);}else if(u_bodyType<2.5){float terrain=fbm(n*16.0),dark=fbm(n*34.0+vec3(3.0,1.0,8.0)),dust=fbm(n*68.0+vec3(4.0,8.0,2.0));float canyon=1.0-smoothstep(.02,.09,abs(n.y-.14*sin(n.x*8.0)-.04));base=mix(vec3(.22,.055,.033),vec3(.84,.27,.105),smoothstep(.20,.80,terrain));base=mix(base,vec3(.11,.075,.058),smoothstep(.60,.80,dark)*.40);base=mix(base,vec3(.44,.17,.075),canyon*.24);base+=vec3(.12,.07,.035)*(dust-.5);float polar=smoothstep(.80,.97,abs(n.y));base=mix(base,vec3(.91,.85,.74),polar*.72);}else if(u_bodyType<3.5){float bands=sin((n.y+((broad-.5)*.09))*42.0+fine*3.1+micro*.85);float dx=(n.x-.27)*1.25,dy=(n.y-.20)*1.9,dist=length(vec2(dx,dy)),angle=atan(dy,dx);float vortex=exp(-dist*dist*16.0);float swirl=.5+.5*sin(angle*6.0+dist*44.0+fine*4.5+u_time*.000012);float eddies=fbm(n*48.0+vec3(2.0,u_time*.000005,7.0));base=mix(vec3(.37,.25,.18),vec3(.91,.78,.61),smoothstep(-.50,.55,bands));vec3 spot=mix(vec3(.40,.085,.035),vec3(.91,.38,.17),swirl);spot=mix(spot,vec3(.73,.47,.29),eddies*.34);base=mix(base,spot,vortex*.97);base+=vec3(.11,.075,.045)*(micro-.45);}else if(u_bodyType<4.5){float bands=sin((n.y+(broad-.5)*.055)*37.0+fine*2.4);float haze=fbm(n*29.0+vec3(6.0,2.0,4.0));base=mix(vec3(.38,.29,.20),vec3(.91,.81,.65),smoothstep(-.56,.55,bands));base=mix(base,vec3(.70,.53,.36),smoothstep(.54,.82,haze)*.31);float ringShadow=exp(-pow((n.y-.18)/.095,2.0))*smoothstep(.02,.55,n.z);base*=1.0-ringShadow*.32;}else if(u_bodyType<5.5){float bands=sin(n.y*23.0+fine*2.5+broad*1.8);float clouds=fbm(n*37.0+vec3(0.0,u_time*.000005,3.0));base=mix(vec3(.10,.30,.38),vec3(.67,.89,.88),smoothstep(.18,.82,broad));base=mix(base,vec3(.79,.91,.88),smoothstep(-.45,.72,bands)*.19+clouds*.13);base+=vec3(.035,.075,.10)*(fine-.5);}else{float bands=sin(n.y*29.0+fine*3.0+broad*2.1);float cloud=fbm(n*43.0+vec3(3.0,u_time*.000004,8.0));float storm=1.0-smoothstep(.12,.48,length((n.xy-vec2(-.28,.18))*vec2(1.0,1.7)));base=mix(vec3(.018,.055,.20),vec3(.08,.31,.72),smoothstep(.15,.80,broad));base=mix(base,vec3(.20,.51,.80),smoothstep(-.38,.68,bands)*.28+cloud*.17);base=mix(base,vec3(.015,.035,.11),storm*.40);base+=vec3(.02,.06,.14)*(fine-.5);}vec3 light=normalize(vec3(u_lightDir,.88));float diffuse=max(dot(n,light),0.0);float limb=.22+.78*pow(max(n.z,0.0),.42);vec3 color=base*(.13+.87*diffuse)*limb;color+=base*pow(max(n.z,0.0),8.0)*.16;float atmosphere=1.0-smoothstep(.84,1.0,r);color+=vec3(.12,.24,.42)*atmosphere*.10;gl_FragColor=vec4(color,1.0);}'
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
    const sphereEarth=gl.getUniformLocation(sphereProgram,'u_earthC'),sphereEarthRadius=gl.getUniformLocation(sphereProgram,'u_earthR'),sphereMoonSpin=gl.getUniformLocation(sphereProgram,'u_moonSpin');
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
      window.__BP_CELESTIAL_ALIGNMENT_V6254__=currentAlignment?{...currentAlignment,mapBound:true}:{mapBound:false,waitingForGlobe:true,updatedAt:Date.now()};
      return currentAlignment;
    };
    const render=now=>{
      if(document.hidden){frame=0;return}
      if(now-last>28){
        last=now;gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        const celestial=readAlignment(now),earthC=celestial?.center||[0,0],earthR=celestial?.earthRadius||0,angle=celestial?.viewAngle||0,moonPhase=now*.000085,moonCenter=[earthC[0]+Math.cos(moonPhase)*earthR*.95,earthC[1]+(-1.48+Math.sin(moonPhase)*.34)*earthR];
        gl.useProgram(galaxyProgram);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(galaxyPosition);gl.vertexAttribPointer(galaxyPosition,2,gl.FLOAT,false,0,0);gl.uniform2f(galaxyResolution,canvas.width,canvas.height);gl.uniform2f(galaxyEarth,earthC[0],earthC[1]);gl.uniform1f(galaxyEarthR,earthR);gl.uniform1f(galaxyTime,now);gl.uniform1f(galaxyAngle,angle);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        gl.useProgram(starProgram);gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);gl.enableVertexAttribArray(starPosition);gl.vertexAttribPointer(starPosition,4,gl.FLOAT,false,0,0);gl.uniform1f(starTime,now);gl.uniform1f(starAspect,canvas.width/canvas.height);gl.uniform2f(starEarth,earthC[0],earthC[1]);gl.uniform1f(starEarthR,earthR);gl.uniform1f(starAngle,angle);gl.drawArrays(gl.POINTS,0,starCount);
        renderPlanets(celestial,now);
        gl.useProgram(sphereProgram);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(quadPosition);gl.vertexAttribPointer(quadPosition,2,gl.FLOAT,false,0,0);gl.uniform2f(sphereResolution,canvas.width,canvas.height);gl.uniform1f(sphereTime,now);
        gl.uniform2f(sphereSun,celestial?.sun?.[0]||0,celestial?.sun?.[1]||0);gl.uniform2f(sphereMoon,moonCenter[0],moonCenter[1]);gl.uniform1f(sphereSunRadius,celestial?.sunRadius||.19);gl.uniform1f(sphereMoonRadius,celestial?.moonRadius||.055);gl.uniform1f(sphereVisible,celestial?.visible?1:0);gl.uniform2f(sphereEarth,earthC[0],earthC[1]);gl.uniform1f(sphereEarthRadius,earthR);gl.uniform1f(sphereMoonSpin,moonPhase);
        gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      }
      frame=requestAnimationFrame(render);
    };
    const redraw=()=>{
      resize();alignmentDirty=true;
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){
        const celestial=readAlignment(0),earthC=celestial?.center||[0,0],earthR=celestial?.earthRadius||0,angle=celestial?.viewAngle||0,moonCenter=[earthC[0]+earthR*.95,earthC[1]-earthR*1.48];
        gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(galaxyProgram);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(galaxyPosition);gl.vertexAttribPointer(galaxyPosition,2,gl.FLOAT,false,0,0);gl.uniform2f(galaxyResolution,canvas.width,canvas.height);gl.uniform2f(galaxyEarth,earthC[0],earthC[1]);gl.uniform1f(galaxyEarthR,earthR);gl.uniform1f(galaxyTime,0);gl.uniform1f(galaxyAngle,angle);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
        gl.useProgram(starProgram);gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);gl.enableVertexAttribArray(starPosition);gl.vertexAttribPointer(starPosition,4,gl.FLOAT,false,0,0);gl.uniform1f(starTime,0);gl.uniform1f(starAspect,canvas.width/canvas.height);gl.uniform2f(starEarth,earthC[0],earthC[1]);gl.uniform1f(starEarthR,earthR);gl.uniform1f(starAngle,angle);gl.drawArrays(gl.POINTS,0,starCount);
        renderPlanets(celestial,0);
        gl.useProgram(sphereProgram);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(quadPosition);gl.vertexAttribPointer(quadPosition,2,gl.FLOAT,false,0,0);gl.uniform2f(sphereResolution,canvas.width,canvas.height);gl.uniform1f(sphereTime,0);gl.uniform2f(sphereSun,celestial?.sun?.[0]||0,celestial?.sun?.[1]||0);gl.uniform2f(sphereMoon,moonCenter[0],moonCenter[1]);gl.uniform1f(sphereSunRadius,celestial?.sunRadius||.19);gl.uniform1f(sphereMoonRadius,celestial?.moonRadius||.055);gl.uniform1f(sphereVisible,celestial?.visible?1:0);gl.uniform2f(sphereEarth,earthC[0],earthC[1]);gl.uniform1f(sphereEarthRadius,earthR);gl.uniform1f(sphereMoonSpin,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
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
    return r"""<style id="bpWelcomeGateStylesV6254">
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
      <canvas class="bpw-celestial-canvas" id="bpwCelestialCanvasV6254"></canvas>
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
        '../manifest.webmanifest?v=6254-realistic-solar-scene"',
        "bust the app manifest URL",
    )
    source = replace_prefix_once(
        source,
        r"(app\.js\?v=)6247-universal-fresh-entry",
        r"\g<1>6254-realistic-solar-scene",
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
        "sw.js?v=6254-realistic-solar-scene",
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
        "navigator.serviceWorker.register('/sw.js?v=6254-realistic-solar-scene',{updateViaCache:'none'})",
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
        './manifest.webmanifest?v=6254-realistic-solar-scene"',
        "bust the root manifest URL",
    )
    root = replace_prefix_once(
        root,
        r"(landing\.js\?v=)6247-universal-fresh-entry",
        r"\g<1>6254-realistic-solar-scene",
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
        './manifest.webmanifest?v=6254-realistic-solar-scene"',
        "bust the legacy app manifest URL",
    )
    required["legacy app index"].write_text(legacy, encoding="utf-8")
    patch_manifest(required["legacy app manifest"], "/app/intelligence-launch/")

    checks = {
        "root": [
            'class="bpw-wordmark bpw-wordmark-static"',
            ">INTELLIGENCE</span></div>",
            "bpw-celestial-system",
            "bpwCelestialCanvasV6254",
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
            "bpWelcomeGateStylesV6254",
            'data-mode="signup"',
            'data-mode="signin"',
        ],
        "app index": [
            "/?return=",
            "app.js?v=6254-realistic-solar-scene",
            "manifest.webmanifest?v=6254-realistic-solar-scene",
        ],
        "landing bundle": [SW_URL],
        "app bundle": [SW_URL],
        "service worker": ["const V='" + CACHE_NAME + "';", "BRIDGEPOINT_LAUNCH_EXPERIENCE_BUILD='v6254-realistic-solar-scene'"],
        "legacy app index": ['content="0;url=/"', "location.replace('/')", "sw.js?v=6254-realistic-solar-scene"],
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
    print("BRIDGEPOINT_LAUNCH_EXPERIENCE_V6254_PATCH_PASS")
    print("Website, current PWA and legacy PWA all route to the same root globe gate.")
    print("Only the launch HTML, app-entry handoff, PWA entry URLs and worker update marker are changed.")
    print("Existing offline cache key and authentication/session logic are preserved.")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: apply_launch_experience_v6254.py SITE_DIRECTORY")
    patch_site(Path(sys.argv[1]))


if __name__ == "__main__":
    main()
