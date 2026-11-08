from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BUILD = "v6249-volumetric-space"
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
    const make=(id,count,seed,near)=>{
      const field=document.getElementById(id);
      if(!field||field.dataset.built==='1')return;
      const rect=field.getBoundingClientRect();
      const width=Math.max(1,rect.width||window.innerWidth||390);
      const height=Math.max(1,rect.height||window.innerHeight||780);
      const pixelRatio=Math.min(1.5,Math.max(1,window.devicePixelRatio||1));
      const canvas=document.createElement('canvas');
      canvas.setAttribute('aria-hidden','true');
      canvas.width=Math.max(1,Math.ceil(width*pixelRatio));
      canvas.height=Math.max(1,Math.ceil(height*pixelRatio));
      canvas.style.cssText='position:absolute;inset:0;width:100%;height:100%;display:block';
      field.appendChild(canvas);
      let state=seed>>>0;
      const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296};
      const points=new Float32Array(count*3);
      for(let i=0;i<count;i++){points[i*3]=random()*2-1;points[i*3+1]=random()*2-1;points[i*3+2]=random()}
      const gl=canvas.getContext('webgl',{alpha:true,antialias:false,powerPreference:'low-power'});
      if(gl){
        const vertex='attribute vec3 a_pos;uniform float u_time;uniform float u_aspect;uniform float u_near;varying float v_alpha;void main(){float z=a_pos.z;float perspective=0.42+z*1.62;vec2 p=a_pos.xy/perspective;p.x/=u_aspect;float drift=sin(u_time*0.000035+z*8.0)*0.008;gl_Position=vec4(p.x+drift,p.y,0.55-z*0.9,1.0);gl_PointSize=(0.8+(1.0-z)*2.8+u_near*0.8)*(0.8+0.2*sin(u_time*0.001+z*19.0));v_alpha=(0.34+0.62*(1.0-z))*(0.82+0.18*sin(u_time*0.0013+z*23.0));}';
        const fragment='precision mediump float;varying float v_alpha;void main(){vec2 q=gl_PointCoord-vec2(0.5);float d=length(q);float core=1.0-smoothstep(0.08,0.28,d);float glow=1.0-smoothstep(0.16,0.5,d);float a=(core*0.88+glow*0.25)*v_alpha;if(a<0.015)discard;gl_FragColor=vec4(0.72,0.84,1.0,a);}';
        const compile=(type,src)=>{const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);return gl.getShaderParameter(sh,gl.COMPILE_STATUS)?sh:null};
        const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
        if(vs&&fs){
          const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
          if(gl.getProgramParameter(program,gl.LINK_STATUS)){
            gl.useProgram(program);
            const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,points,gl.STATIC_DRAW);
            const loc=gl.getAttribLocation(program,'a_pos');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,3,gl.FLOAT,false,0,0);
            const timeLoc=gl.getUniformLocation(program,'u_time'),aspectLoc=gl.getUniformLocation(program,'u_aspect'),nearLoc=gl.getUniformLocation(program,'u_near');
            gl.uniform1f(aspectLoc,width/height);gl.uniform1f(nearLoc,near?1:0);
            let frame=0,last=0;
            const render=now=>{if(document.hidden){frame=0;return}if(now-last>30){last=now;gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(timeLoc,now);gl.drawArrays(gl.POINTS,0,count)}frame=requestAnimationFrame(render)};
            if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches)frame=requestAnimationFrame(render);
            else{gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);gl.uniform1f(timeLoc,0);gl.drawArrays(gl.POINTS,0,count)}
            document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!frame&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches)frame=requestAnimationFrame(render)});
            field.dataset.built='1';return;
          }
        }
      }
      const ctx=canvas.getContext('2d',{alpha:true});
      if(ctx){ctx.scale(pixelRatio,pixelRatio);for(let i=0;i<count;i++){const z=points[i*3+2],x=(points[i*3]+1)*width/2,y=(points[i*3+1]+1)*height/2,r=(near?0.65:0.4)+(1-z)*(near?1.5:1.0);ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle='rgba(215,232,255,'+(.28+(1-z)*.65).toFixed(2)+')';ctx.fill()}}
      field.dataset.built='1';
    };
    make('bpwStarsFarV4',456,90419,false);
    make('bpwStarsNearV4',228,59173,true);
  }
  buildSpaceStars();"""
    source, count = pattern.subn(replacement, source, count=1)
    if count != 1:
        raise AssertionError(f"Starfield builder: expected one V5000 builder, found {count}")
    # Replace the staggered per-character DOM construction with a zero-work static-wordmark handoff.
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
    return r"""<style id="bpWelcomeGateStylesV6249">
#bpWelcomeGateV1{pointer-events:auto!important;background:radial-gradient(ellipse at 50% 50%,rgba(2,8,18,.02),rgba(0,2,7,.12) 74%,rgba(0,1,5,.24))!important}
html.bpw-entry-locked #previewMap{background:#00030a!important}
html.bpw-entry-locked #previewMap canvas{filter:contrast(1.17) saturate(1.10) brightness(1.025)}
#bpWelcomeGateV1 .bpw-globe-aura{display:none!important}
#bpWelcomeGateV1 .bpw-starfield canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
#bpWelcomeGateV1 .bpw-stars-far{opacity:.98;background:radial-gradient(ellipse at 18% 30%,rgba(39,87,178,.16),transparent 34%),radial-gradient(ellipse at 82% 68%,rgba(50,95,170,.14),transparent 36%)}
#bpWelcomeGateV1 .bpw-stars-near{opacity:.92}
#bpWelcomeGateV1 .bpw-wordmark-wrap{top:calc(env(safe-area-inset-top,0px) + clamp(17px,2.8vh,30px))!important;left:0!important;right:0!important;transform:none!important;z-index:10!important;padding:0 14px!important}
#bpWelcomeGateV1 .bpw-wordmark-static{display:block!important;width:100%;max-width:100%;white-space:normal!important;text-align:center;font-family:"Eurostile","Bank Gothic","Arial Black",system-ui,sans-serif;font-size:clamp(20px,4.2vw,47px);font-weight:950;line-height:1.08;letter-spacing:.035em;text-transform:none;color:#f5faff;background:linear-gradient(180deg,#ffffff 0%,#e8f2fa 30%,#a9bfd1 52%,#f8fcff 67%,#718ca5 100%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;-webkit-text-stroke:.48px rgba(239,249,255,.68);text-shadow:0 1px 0 #d9e8f4,0 2px 0 #91a9bf,0 3px 0 #536d84,0 4px 0 #21384e,0 7px 12px rgba(0,0,0,.82),0 0 20px rgba(118,194,242,.26);transform:perspective(900px) rotateX(9deg);filter:none}
#bpWelcomeGateV1 .bpw-letter-frame,#bpWelcomeGateV1 .bpw-letter-face{animation:none!important;will-change:auto!important}
#bpWelcomeGateV1 .bpw-status,#bpWelcomeGateV1 .bpw-sound{display:none!important}
#bpWelcomeGateV1 .bpw-gate-panel{left:12px!important;right:12px!important;bottom:calc(env(safe-area-inset-bottom,0px) + clamp(20px,4vh,42px))!important;z-index:12!important;display:flex!important;gap:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;opacity:1!important;visibility:visible!important;transform:none!important;transition:none!important;pointer-events:auto!important}
#bpWelcomeGateV1 .bpw-explainer{display:none!important}
#bpWelcomeGateV1 .bpw-actions{display:flex!important;flex-wrap:wrap;justify-content:center;align-items:center;gap:12px;width:100%;margin:0!important}
#bpWelcomeGateV1 .bpw-actions button{min-width:min(230px,42vw);max-width:calc(100vw - 28px);margin:0!important;animation:none!important;transition:background .2s ease,border-color .2s ease!important;backdrop-filter:none!important;box-shadow:0 8px 24px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.24)!important}
#bpWelcomeGateV1 .bpw-celestial-system{position:absolute;inset:0;z-index:3;overflow:hidden;pointer-events:none;perspective:1200px}
#bpWelcomeGateV1 .bpw-sun-model{position:absolute;top:17%;right:clamp(24px,8vw,128px);width:clamp(58px,9vw,118px);aspect-ratio:1;z-index:2;animation:bpw-sun-drift-v6249 150s ease-in-out infinite alternate}
#bpWelcomeGateV1 .bpw-sun-sphere{position:absolute;inset:0;overflow:hidden;border-radius:50%;background:radial-gradient(circle at 34% 31%,#fff9d9 0%,#fff0a1 8%,#ffc45c 19%,#fa7c2c 43%,#be3e20 70%,#35101c 100%);box-shadow:inset -13px -12px 24px rgba(21,4,12,.78),inset 4px 4px 13px rgba(255,255,255,.55),0 0 18px 4px rgba(255,166,69,.30),0 0 48px 14px rgba(255,107,32,.16)}
#bpWelcomeGateV1 .bpw-sun-sphere:before{content:"";position:absolute;inset:-8%;border-radius:50%;background:repeating-radial-gradient(ellipse at 42% 45%,rgba(255,237,174,.18) 0 2px,rgba(192,57,24,.08) 3px 6px,transparent 7px 11px),radial-gradient(ellipse at 64% 30%,rgba(255,255,205,.55),transparent 37%);mix-blend-mode:screen;opacity:.62;animation:bpw-sun-surface-v6249 56s linear infinite}
#bpWelcomeGateV1 .bpw-sun-sphere:after{content:"";position:absolute;inset:12%;border-radius:50%;background:radial-gradient(ellipse at 26% 36%,rgba(116,28,19,.48) 0 4%,transparent 5%),radial-gradient(ellipse at 63% 67%,rgba(108,25,16,.37) 0 5%,transparent 6%),radial-gradient(ellipse at 72% 25%,rgba(255,237,184,.32),transparent 16%);filter:blur(1px)}
#bpWelcomeGateV1 .bpw-moon-orbit{position:absolute;left:50%;top:51%;width:min(108vw,102vh,1160px);height:min(66vw,64vh,660px);border:1px solid rgba(187,213,239,.18);border-radius:50%;transform:translate(-50%,-50%) rotateX(66deg) rotateZ(-17deg);transform-style:preserve-3d;z-index:4;box-shadow:0 0 18px rgba(122,180,227,.035),inset 0 0 14px rgba(122,180,227,.025)}
#bpWelcomeGateV1 .bpw-moon-runner{position:absolute;inset:0;border-radius:50%;transform-origin:50% 50%;transform-style:preserve-3d;animation:bpw-moon-orbit-v6249 34s linear infinite}
#bpWelcomeGateV1 .bpw-moon-sphere{position:absolute;left:100%;top:50%;width:clamp(32px,4.8vw,58px);aspect-ratio:1;transform:translate(-50%,-50%) rotateX(-66deg) rotateZ(17deg);border-radius:50%;background:radial-gradient(circle at 28% 25%,rgba(255,255,255,.88),transparent 20%),radial-gradient(circle at 68% 62%,rgba(27,39,56,.5) 0 5%,transparent 6%),radial-gradient(circle at 40% 65%,rgba(28,37,50,.48) 0 8%,transparent 9%),radial-gradient(circle at 62% 31%,rgba(34,44,58,.32) 0 6%,transparent 7%),radial-gradient(circle at 38% 35%,#e4e8eb 0%,#b9c4ce 38%,#788797 70%,#293646 100%);box-shadow:inset -12px -10px 19px rgba(4,10,19,.78),inset 3px 4px 10px rgba(255,255,255,.72),0 0 13px rgba(167,207,239,.32)}
@keyframes bpw-moon-orbit-v6249{to{transform:rotate(360deg)}}
@keyframes bpw-sun-surface-v6249{to{transform:rotate(360deg)}}
@keyframes bpw-sun-drift-v6249{0%{transform:translate3d(0,0,0)}50%{transform:translate3d(-5px,3px,0)}100%{transform:translate3d(3px,-4px,0)}}
@media(max-width:620px){#bpWelcomeGateV1 .bpw-wordmark-wrap{padding:0 12px!important}#bpWelcomeGateV1 .bpw-wordmark-static{font-size:clamp(19px,5.1vw,27px);letter-spacing:.02em}#bpWelcomeGateV1 .bpw-gate-panel{left:10px!important;right:10px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 16px)!important}#bpWelcomeGateV1 .bpw-actions{flex-direction:column;gap:9px}#bpWelcomeGateV1 .bpw-actions button{width:min(100%,340px);min-width:0;padding:14px 16px}.bpw-sun-model{top:19%;right:8%}}
@media(prefers-reduced-motion:reduce){#bpWelcomeGateV1 .bpw-stars-far,#bpWelcomeGateV1 .bpw-stars-near,#bpWelcomeGateV1 .bpw-moon-runner,#bpWelcomeGateV1 .bpw-sun-model,#bpWelcomeGateV1 .bpw-sun-sphere:before{animation:none!important}}

#bpWelcomeGateV1 .bpw-wordmark-static{position:relative!important;font-family:"Orbitron","Eurostile","Bank Gothic",system-ui,sans-serif!important;font-weight:900!important;letter-spacing:.075em!important;text-transform:uppercase!important;transform:perspective(900px) rotateX(17deg) rotateY(-4deg) translateZ(18px)!important;transform-style:preserve-3d!important;text-shadow:0 1px 0 #dceeff,0 2px 0 #9db7cf,0 3px 0 #6e8ca8,0 4px 0 #45627e,0 5px 0 #263f59,0 7px 0 #12263d,0 10px 18px rgba(0,0,0,.9),0 0 24px rgba(98,190,255,.42)!important;filter:drop-shadow(0 10px 10px rgba(0,0,0,.58))!important}
#bpWelcomeGateV1 .bpw-wordmark-static:before{content:attr(data-title);position:absolute;inset:0;z-index:-1;color:#17344f;-webkit-text-fill-color:#17344f;-webkit-text-stroke:1px rgba(113,189,241,.8);transform:translate3d(0,7px,-9px);text-shadow:0 2px 0 #071321,0 5px 0 #020812,0 9px 15px rgba(0,0,0,.95)}
#bpWelcomeGateV1 .bpw-wordmark-static:after{content:attr(data-title);position:absolute;inset:0;z-index:1;background:linear-gradient(180deg,rgba(255,255,255,.9),rgba(190,224,250,.18) 38%,transparent 56%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;pointer-events:none}
#bpWelcomeGateV1 .bpw-celestial-system{perspective:1500px;transform-style:preserve-3d}
#bpWelcomeGateV1 .bpw-sun-model{transform-style:preserve-3d;filter:drop-shadow(0 16px 24px rgba(0,0,0,.72))}
#bpWelcomeGateV1 .bpw-sun-model:before{content:"";position:absolute;inset:-12%;border-radius:50%;border:1px solid rgba(255,191,112,.2);box-shadow:0 0 16px rgba(255,153,67,.12),inset 0 0 12px rgba(255,203,133,.08);transform:translateZ(-12px) rotateX(72deg)}
#bpWelcomeGateV1 .bpw-sun-sphere{transform-style:preserve-3d;background:radial-gradient(circle at 30% 26%,#fffce8 0%,#fff0b1 5%,#ffc76a 15%,#f47730 39%,#bb3d22 67%,#240d1b 100%);box-shadow:inset -20px -16px 28px rgba(13,3,13,.86),inset 6px 5px 15px rgba(255,255,255,.72),0 0 30px 9px rgba(255,161,69,.2)}
#bpWelcomeGateV1 .bpw-sun-sphere:before{background:repeating-radial-gradient(ellipse at 38% 42%,rgba(255,245,192,.24) 0 1px,rgba(183,48,20,.12) 2px 5px,transparent 6px 9px),radial-gradient(ellipse at 64% 28%,rgba(255,255,220,.65),transparent 34%),conic-gradient(from 10deg,rgba(255,215,137,.16),rgba(176,41,20,.18),rgba(255,235,169,.22),rgba(175,37,19,.15),rgba(255,215,137,.16));mix-blend-mode:screen;opacity:.86;animation:bpw-sun-surface-v6249 34s linear infinite}
#bpWelcomeGateV1 .bpw-sun-sphere:after{background:radial-gradient(ellipse at 25% 42%,rgba(111,27,17,.62) 0 5%,transparent 6%),radial-gradient(ellipse at 62% 66%,rgba(101,22,13,.54) 0 7%,transparent 8%),radial-gradient(ellipse at 73% 26%,rgba(255,245,195,.42),transparent 18%),radial-gradient(ellipse at 40% 72%,rgba(255,190,93,.28),transparent 23%);transform:translateZ(2px)}
#bpWelcomeGateV1 .bpw-moon-orbit{transform-style:preserve-3d;filter:drop-shadow(0 8px 16px rgba(0,0,0,.38))}
#bpWelcomeGateV1 .bpw-moon-sphere{transform-style:preserve-3d;overflow:hidden;background:radial-gradient(circle at 29% 23%,#f8fbff 0%,#dbe2e8 13%,#aebbc7 39%,#687786 70%,#182635 100%);box-shadow:inset -16px -12px 22px rgba(2,8,17,.88),inset 5px 5px 12px rgba(255,255,255,.78),0 0 18px rgba(180,218,248,.25);animation:bpw-moon-spin-v6249 48s linear infinite}
#bpWelcomeGateV1 .bpw-moon-sphere:before{content:"";position:absolute;inset:0;border-radius:50%;background:radial-gradient(ellipse at 27% 32%,rgba(35,47,60,.52) 0 5%,rgba(223,230,236,.18) 6%,transparent 10%),radial-gradient(ellipse at 65% 24%,rgba(32,44,57,.42) 0 8%,rgba(223,230,236,.16) 9%,transparent 14%),radial-gradient(ellipse at 57% 65%,rgba(24,36,50,.52) 0 11%,rgba(224,232,239,.12) 12%,transparent 18%),radial-gradient(ellipse at 28% 72%,rgba(38,50,63,.36) 0 6%,transparent 10%),radial-gradient(ellipse at 78% 78%,rgba(27,40,53,.4) 0 4%,transparent 8%);box-shadow:inset -12px -7px 15px rgba(0,0,0,.42)}
#bpWelcomeGateV1 .bpw-moon-sphere:after{content:"";position:absolute;inset:-1%;border-radius:50%;background:linear-gradient(90deg,rgba(0,0,0,.62),transparent 43%,rgba(255,255,255,.1) 72%,transparent);transform:translateZ(3px)}
@keyframes bpw-sun-surface-v6249{to{transform:rotate(360deg)}}
@keyframes bpw-moon-spin-v6249{to{transform:translate(-50%,-50%) rotateY(360deg)}}
@media(max-width:620px){#bpWelcomeGateV1 .bpw-wordmark-static{font-size:clamp(19px,5vw,27px);letter-spacing:.035em!important}}
@media(prefers-reduced-motion:reduce){#bpWelcomeGateV1 .bpw-moon-sphere,#bpWelcomeGateV1 .bpw-sun-sphere:before{animation:none!important}}
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
      <div class="bpw-sun-model"><div class="bpw-sun-sphere"></div></div>
      <div class="bpw-moon-orbit"><div class="bpw-moon-runner"><div class="bpw-moon-sphere"></div></div></div>
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
            "bpw-moon-sphere",
            "bpw-sun-sphere",
            "make('bpwStarsFarV4',456",
            "make('bpwStarsNearV4',228",
            "bpWelcomeGateStylesV6249",
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
        "service worker": ["const V='" + CACHE_NAME + "';", "BRIDGEPOINT_LAUNCH_EXPERIENCE_BUILD='v6249-volumetric-space'"],
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
