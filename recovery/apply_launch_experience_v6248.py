from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BUILD = "v6250-deep-space-3d"
SW_URL = "/sw.js?v=6249-volumetric-space"
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
    const canvas=document.getElementById('bpwCelestialCanvasV6250');
    if(!canvas||canvas.dataset.built==='1')return;
    const scene=canvas.parentElement;
    const resize=()=>{
      const rect=scene.getBoundingClientRect();
      const ratio=Math.min(1.35,Math.max(1,window.devicePixelRatio||1));
      canvas.width=Math.max(1,Math.round((rect.width||window.innerWidth||390)*ratio));
      canvas.height=Math.max(1,Math.round((rect.height||window.innerHeight||780)*ratio));
    };
    resize();
    let state=0x6250a71;
    const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296};
    const starCount=2200;
    const stars=new Float32Array(starCount*4);
    for(let i=0;i<starCount;i++){
      stars[i*4]=random()*2-1;
      stars[i*4+1]=random()*2-1;
      stars[i*4+2]=random();
      stars[i*4+3]=random();
    }
    const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,powerPreference:'low-power'});
    const fallback=()=>{
      const ctx=canvas.getContext('2d',{alpha:true});
      if(!ctx)return;
      const w=canvas.width,h=canvas.height,unit=Math.min(w,h);
      ctx.clearRect(0,0,w,h);
      for(let i=0;i<starCount;i++){
        const z=stars[i*4+2],depth=.25+z*1.2;
        const x=w*.5+stars[i*4]*unit*.55/depth;
        const y=h*.5-stars[i*4+1]*unit*.55/depth;
        const r=Math.min(3.2,.45+(1/depth)*.48);
        ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);
        ctx.fillStyle='rgba(210,229,255,'+(.2+(1-z)*.65)+')';ctx.fill();
      }
      const sunX=w*.5+Math.min(unit*.36,w*.36),sunY=h*.5-unit*.29,sr=unit*.073;
      let g=ctx.createRadialGradient(sunX-sr*.3,sunY-sr*.35,sr*.05,sunX,sunY,sr);
      g.addColorStop(0,'#fff8d5');g.addColorStop(.22,'#ffd17a');g.addColorStop(.55,'#f77b31');g.addColorStop(.86,'#a92b20');g.addColorStop(1,'#26101b');
      ctx.beginPath();ctx.arc(sunX,sunY,sr,0,Math.PI*2);ctx.fillStyle=g;ctx.shadowColor='rgba(255,132,48,.42)';ctx.shadowBlur=unit*.035;ctx.fill();ctx.shadowBlur=0;
      const t=Date.now()*.00011,rx=Math.min(unit*.43,w*.42),ry=unit*.24;
      ctx.beginPath();ctx.ellipse(w*.5,h*.5,rx,ry,0,0,Math.PI*2);ctx.strokeStyle='rgba(155,197,236,.2)';ctx.lineWidth=Math.max(1,unit*.001);ctx.stroke();
      const mx=w*.5+Math.cos(t)*rx,my=h*.5-Math.sin(t)*ry,mr=unit*.037;
      g=ctx.createRadialGradient(mx-mr*.34,my-mr*.35,mr*.04,mx,my,mr);
      g.addColorStop(0,'#f3f5f7');g.addColorStop(.38,'#c5cdd5');g.addColorStop(.76,'#778593');g.addColorStop(1,'#182637');
      ctx.beginPath();ctx.arc(mx,my,mr,0,Math.PI*2);ctx.fillStyle=g;ctx.shadowColor='rgba(160,207,242,.24)';ctx.shadowBlur=unit*.02;ctx.fill();ctx.shadowBlur=0;
      for(let i=0;i<38;i++){
        const a=i*2.39996,dist=Math.sqrt((i+.5)/38)*mr*.78,cx=mx+Math.cos(a)*dist,cy=my+Math.sin(a)*dist*.72,cr=mr*(.035+(i%5)*.012);
        ctx.beginPath();ctx.arc(cx,cy,cr,0,Math.PI*2);ctx.fillStyle='rgba(35,48,62,.23)';ctx.fill();
      }
    };
    if(!gl){fallback();canvas.dataset.built='1';window.addEventListener('resize',()=>{resize();fallback()},{passive:true});return}
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
      'attribute vec4 a_pos;uniform float u_time;uniform float u_aspect;varying float v_alpha;varying float v_tint;void main(){float z=mod(a_pos.z-u_time*0.000018+1.0,1.0);float depth=0.28+z*1.46;vec2 p=a_pos.xy*0.72/depth;gl_Position=vec4(p.x/u_aspect,p.y,0.0,1.0);gl_PointSize=min(6.5,0.62+(1.0/depth)*1.3)*(0.86+0.14*sin(u_time*0.001+a_pos.w*11.0));v_alpha=clamp((1.12-z)*0.82,0.12,0.94);v_tint=a_pos.w;}',
      'precision mediump float;varying float v_alpha;varying float v_tint;void main(){vec2 q=gl_PointCoord-vec2(0.5);float d=length(q);float core=1.0-smoothstep(0.06,0.25,d);float halo=1.0-smoothstep(0.12,0.5,d);vec3 c=mix(vec3(0.62,0.78,1.0),vec3(1.0,0.91,0.76),v_tint);float a=(core*0.86+halo*0.22)*v_alpha;if(a<0.01)discard;gl_FragColor=vec4(c,a);}'
    );
    const sphereProgram=program(
      'attribute vec2 a_pos;void main(){gl_Position=vec4(a_pos,0.0,1.0);}',
      'precision mediump float;uniform vec2 u_resolution;uniform float u_time;float hash31(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);float a=hash31(i),b=hash31(i+vec3(1,0,0)),c=hash31(i+vec3(0,1,0)),d=hash31(i+vec3(1,1,0)),e=hash31(i+vec3(0,0,1)),f1=hash31(i+vec3(1,0,1)),g=hash31(i+vec3(0,1,1)),h=hash31(i+vec3(1,1,1));return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,f1,f.x),mix(g,h,f.x),f.y),f.z);}float fbm(vec3 p){float v=0.0,a=0.5;for(int i=0;i<4;i++){v+=a*noise3(p);p=p*2.03+vec3(1.7,2.3,1.1);a*=0.5;}return v;}void main(){float unit=min(u_resolution.x,u_resolution.y);float aspect=u_resolution.x/u_resolution.y;vec2 p=(gl_FragCoord.xy-0.5*u_resolution)/unit;vec2 sunC=vec2(min(0.40,aspect*0.36),0.29);float sunR=0.073;vec2 moonC=vec2(cos(u_time*0.00011)*min(0.43,aspect*0.42),sin(u_time*0.00011)*0.24-0.07);float moonR=0.037;vec3 outColor=vec3(0.0);float outAlpha=0.0;float orbit=abs(length(vec2(p.x/min(0.43,aspect*0.42), (p.y+0.07)/0.24))-1.0);float ring=(1.0-smoothstep(0.002,0.006,orbit))*0.16;outColor=vec3(0.34,0.55,0.82);outAlpha=ring;float sd=length(p-sunC);float sunGlow=(1.0-smoothstep(sunR,sunR*1.72,sd));if(sunGlow>0.002){outColor+=vec3(1.0,0.29,0.075)*sunGlow*0.19;outAlpha=max(outAlpha,sunGlow*0.25);}if(sd<sunR+0.003){vec2 q=(p-sunC)/sunR;float z=sqrt(max(0.0,1.0-dot(q,q)));vec3 n=normalize(vec3(q,z));float rot=u_time*0.000018;n.xz=mat2(cos(rot),-sin(rot),sin(rot),cos(rot))*n.xz;float turbulence=fbm(n*5.8+vec3(0.0,u_time*0.000012,0.0));float granulation=fbm(n*15.0-vec3(u_time*0.000018,0.0,0.0));float filament=fbm(n*23.0+vec3(2.0,7.0,1.0));vec3 hot=vec3(1.0,0.79,0.40);vec3 orange=vec3(0.98,0.30,0.055);vec3 deep=vec3(0.36,0.045,0.025);vec3 solar=mix(deep,orange,smoothstep(0.13,0.72,turbulence));solar=mix(solar,hot,smoothstep(0.56,0.91,granulation)*0.68);solar+=vec3(0.22,0.085,0.018)*(filament-0.4);float light=max(dot(n,normalize(vec3(-0.48,0.58,0.78))),0.0);float limb=0.28+0.72*pow(max(n.z,0.0),0.42);solar*=0.26+0.74*light;solar*=limb;solar+=vec3(1.0,0.34,0.08)*pow(max(n.z,0.0),7.0)*0.2;float cover=1.0-smoothstep(sunR-0.002,sunR+0.002,sd);outColor=mix(outColor,solar,cover);outAlpha=max(outAlpha,cover);}float md=length(p-moonC);float moonGlow=1.0-smoothstep(moonR*1.02,moonR*1.42,md);if(moonGlow>0.002){outColor=mix(outColor,vec3(0.48,0.68,0.9),moonGlow*0.20);outAlpha=max(outAlpha,moonGlow*0.18);}if(md<moonR+0.002){vec2 q=(p-moonC)/moonR;vec3 n=normalize(vec3(q,sqrt(max(0.0,1.0-dot(q,q)))));float rot=u_time*0.000008; n.xy=mat2(cos(rot),-sin(rot),sin(rot),cos(rot))*n.xy;vec2 uv=vec2(atan(n.y,n.x)*0.1591549+0.5,asin(clamp(n.z,-1.0,1.0))*0.3183099+0.5);vec2 grid=uv*vec2(25.0,15.0),cell=floor(grid),f=fract(grid);float bowls=0.0,rims=0.0;for(int y=-1;y<=1;y++){for(int x=-1;x<=1;x++){vec2 off=vec2(float(x),float(y)),id=cell+off;vec2 rnd=vec2(hash31(vec3(id,2.1)),hash31(vec3(id,7.3)));vec2 delta=off+vec2(0.18)+rnd*0.64-f;float dist=length(delta);float radius=0.085+hash31(vec3(id,9.2))*0.095;float bowl=1.0-smoothstep(radius*0.34,radius,dist);float rim=1.0-smoothstep(radius*0.86,radius*1.14,dist);bowls=max(bowls,bowl);rims=max(rims,rim);}}float maria=smoothstep(0.53,0.77,fbm(n*5.0+vec3(2.0,3.0,1.0)));float albedo=0.68+(fbm(n*18.0)-0.5)*0.22-bowls*0.34+rims*0.19-maria*0.13;vec3 lunar=mix(vec3(0.59,0.64,0.69),vec3(0.77,0.80,0.82),albedo);float light=max(dot(n,normalize(vec3(-0.55,0.62,0.78))),0.0);float limb=0.18+0.82*pow(max(n.z,0.0),0.38);lunar*=0.12+0.88*light;lunar*=limb;lunar+=vec3(0.12,0.15,0.18)*rims*0.19;float cover=1.0-smoothstep(moonR-0.0018,moonR+0.0018,md);outColor=mix(outColor,lunar,cover);outAlpha=max(outAlpha,cover);}gl_FragColor=vec4(outColor,outAlpha);}'
    );
    if(!starProgram||!sphereProgram){fallback();canvas.dataset.built='1';return}
    const starBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);gl.bufferData(gl.ARRAY_BUFFER,stars,gl.STATIC_DRAW);
    const starPosition=gl.getAttribLocation(starProgram,'a_pos');
    const starTime=gl.getUniformLocation(starProgram,'u_time'),starAspect=gl.getUniformLocation(starProgram,'u_aspect');
    const quad=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);
    const quadPosition=gl.getAttribLocation(sphereProgram,'a_pos');
    const sphereResolution=gl.getUniformLocation(sphereProgram,'u_resolution'),sphereTime=gl.getUniformLocation(sphereProgram,'u_time');
    gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
    let frame=0,last=0;
    const render=now=>{
      if(document.hidden){frame=0;return}
      if(now-last>24){
        last=now;gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
        gl.useProgram(starProgram);gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);gl.enableVertexAttribArray(starPosition);gl.vertexAttribPointer(starPosition,4,gl.FLOAT,false,0,0);gl.uniform1f(starTime,now);gl.uniform1f(starAspect,canvas.width/canvas.height);gl.drawArrays(gl.POINTS,0,starCount);
        gl.useProgram(sphereProgram);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(quadPosition);gl.vertexAttribPointer(quadPosition,2,gl.FLOAT,false,0,0);gl.uniform2f(sphereResolution,canvas.width,canvas.height);gl.uniform1f(sphereTime,now);gl.drawArrays(gl.TRIANGLE_STRIP,0,4);
      }
      frame=requestAnimationFrame(render);
    };
    const redraw=()=>{
      resize();
      if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.useProgram(starProgram);gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);gl.enableVertexAttribArray(starPosition);gl.vertexAttribPointer(starPosition,4,gl.FLOAT,false,0,0);gl.uniform1f(starTime,0);gl.uniform1f(starAspect,canvas.width/canvas.height);gl.drawArrays(gl.POINTS,0,starCount);gl.useProgram(sphereProgram);gl.bindBuffer(gl.ARRAY_BUFFER,quad);gl.enableVertexAttribArray(quadPosition);gl.vertexAttribPointer(quadPosition,2,gl.FLOAT,false,0,0);gl.uniform2f(sphereResolution,canvas.width,canvas.height);gl.uniform1f(sphereTime,0);gl.drawArrays(gl.TRIANGLE_STRIP,0,4)}
      else if(!frame)frame=requestAnimationFrame(render);
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
    return r"""<style id="bpWelcomeGateStylesV6250">
#bpWelcomeGateV1{pointer-events:auto!important;background:radial-gradient(ellipse at 50% 50%,rgba(2,8,18,.015),rgba(0,2,7,.14) 72%,rgba(0,1,5,.30))!important}
html.bpw-entry-locked #previewMap{background:#00030a!important}
html.bpw-entry-locked #previewMap canvas{filter:contrast(1.17) saturate(1.10) brightness(1.025)}
#bpWelcomeGateV1 .bpw-globe-aura{display:none!important}
#bpWelcomeGateV1 .bpw-starfield{background:radial-gradient(ellipse at 16% 26%,rgba(36,79,151,.20),transparent 38%),radial-gradient(ellipse at 82% 70%,rgba(31,71,130,.18),transparent 42%),radial-gradient(ellipse at 52% 48%,rgba(4,13,29,.12),transparent 68%)}
#bpWelcomeGateV1 .bpw-starfield canvas{display:none!important}
#bpWelcomeGateV1 .bpw-celestial-system{position:absolute;inset:0;z-index:3;overflow:hidden;pointer-events:none;perspective:1200px}
#bpWelcomeGateV1 .bpw-celestial-canvas{position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none}
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
        '        <div class="bpw-wordmark bpw-wordmark-static" id="bpwWordmarkV3" role="img" aria-label="BridgePoint Intelligence" data-title="BridgePoint Intelligence">BridgePoint Intelligence</div>',
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
      <canvas class="bpw-celestial-canvas" id="bpwCelestialCanvasV6250"></canvas>
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
        '../manifest.webmanifest?v=6249-volumetric-space"',
        "bust the app manifest URL",
    )
    source = replace_prefix_once(
        source,
        r"(app\.js\?v=)6247-universal-fresh-entry",
        r"\g<1>6249-volumetric-space",
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
        "sw.js?v=6249-volumetric-space",
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
        "navigator.serviceWorker.register('/sw.js?v=6249-volumetric-space',{updateViaCache:'none'})",
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
        './manifest.webmanifest?v=6249-volumetric-space"',
        "bust the root manifest URL",
    )
    root = replace_prefix_once(
        root,
        r"(landing\.js\?v=)6247-universal-fresh-entry",
        r"\g<1>6249-volumetric-space",
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
        './manifest.webmanifest?v=6249-volumetric-space"',
        "bust the legacy app manifest URL",
    )
    required["legacy app index"].write_text(legacy, encoding="utf-8")
    patch_manifest(required["legacy app manifest"], "/app/intelligence-launch/")

    checks = {
        "root": [
            'class="bpw-wordmark bpw-wordmark-static"',
            ">BridgePoint Intelligence</div>",
            "bpw-celestial-system",
            "bpwCelestialCanvasV6250",
            "bpwCelestialCanvasV6250",
            "const starCount=2200",
            "vec3 lunar=mix",
            "bpWelcomeGateStylesV6250",
            'data-mode="signup"',
            'data-mode="signin"',
        ],
        "app index": [
            "/?return=",
            "app.js?v=6249-volumetric-space",
            "manifest.webmanifest?v=6249-volumetric-space",
        ],
        "landing bundle": [SW_URL],
        "app bundle": [SW_URL],
        "service worker": ["const V='" + CACHE_NAME + "';", "BRIDGEPOINT_LAUNCH_EXPERIENCE_BUILD='v6250-deep-space-3d'"],
        "legacy app index": ['content="0;url=/"', "location.replace('/')", "sw.js?v=6249-volumetric-space"],
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
    print("BRIDGEPOINT_LAUNCH_EXPERIENCE_V6249_PATCH_PASS")
    print("Website, current PWA and legacy PWA all route to the same root globe gate.")
    print("Only the launch HTML, app-entry handoff, PWA entry URLs and worker update marker are changed.")
    print("Existing offline cache key and authentication/session logic are preserved.")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: apply_launch_experience_v6249.py SITE_DIRECTORY")
    patch_site(Path(sys.argv[1]))


if __name__ == "__main__":
    main()
