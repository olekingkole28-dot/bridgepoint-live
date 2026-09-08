(()=>{
'use strict';
if(window.__bridgepointCinematicWeatherV2080)return;
window.__bridgepointCinematicWeatherV2080=true;

const VERSION=2080;
const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const RPC=`${SUPA}/rest/v1/rpc/bridgepoint_live_map_weather_scene_v1997`;
const AUTH_KEYS=['sb-xdfsjztwgsbmabshzsjw-auth-token','bp-homepage-auth-v1990','bp-homepage-auth-v1992'];
const $=(s,r=document)=>r.querySelector(s);
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const TAU=Math.PI*2;

const KINDS=[
 ['all','All'],
 ['hail','Hail'],['wind','Wind'],['rain','Rain'],['flood','Flood'],
 ['tornado','Tornado'],['hurricane','Hurricane'],['fire','Wildfire'],
 ['snow','Snow'],['ice','Ice'],['lightning','Lightning'],
 ['fireweather','Fire weather'],['outage','Grid outages'],
 ['fog','Fog'],['dust','Dust'],['heat','Heat'],['cold','Cold'],['avalanche','Avalanche']
];

const COLORS={
 hail:'#baf6ff',wind:'#6fe7d0',rain:'#59adff',flood:'#54baff',
 tornado:'#d6b5ff',hurricane:'#edf7ff',fire:'#ff765a',snow:'#f1fdff',
 ice:'#9ee6ff',lightning:'#fff4a6',fireweather:'#ffae72',outage:'#ff7488',
 fog:'#d9e4ee',dust:'#e8b476',heat:'#ff8c63',cold:'#8dd9ff',avalanche:'#f7ffff',
 severe:'#d5b7ff'
};

const state={
 map:null,ready:false,busy:false,seq:0,timer:0,events:[],features:[],
 filter:'all',enabled:true,canvas:null,gl:null,ctx2d:null,maskCanvas:null,maskCtx:null,
 program:null,posBuf:null,maskTex:null,uniforms:{},raf:0,lastFrame:0,lastLoad:0,
 gpuMode:'none',quality:1,reduceMotion:false,deviceMemory:Number(navigator.deviceMemory||4),
 fpsTarget:45,diagnostics:{}
};

function deepSession(v,seen=new Set()){
 if(!v||seen.has(v))return null;
 if(typeof v==='object'){
  seen.add(v);
  if(typeof v.access_token==='string')return v;
  for(const x of Object.values(v)){const f=deepSession(x,seen);if(f)return f}
 }
 return null;
}
function session(){
 for(const k of AUTH_KEYS){
  try{const s=deepSession(JSON.parse(localStorage.getItem(k)||'null'));if(s?.access_token)return s}catch(_){}
 }
 return null;
}
function upper(v){return String(v||'').toUpperCase()}
function geo(v){if(!v)return null;if(typeof v==='string'){try{return JSON.parse(v)}catch(_){return null}}return v?.type?v:null}
function props(e){return e&&typeof e.properties==='object'&&e.properties?e.properties:{}}
function meta(e){return e&&typeof e.render_metadata==='object'&&e.render_metadata?e.render_metadata:{}}
function eventGeom(e){
 const g=geo(e.geometry_geojson);if(g)return g;
 const x=Number(e.longitude),y=Number(e.latitude);
 return Number.isFinite(x)&&Number.isFinite(y)?{type:'Point',coordinates:[x,y]}:null;
}
function kind(e){
 const h=upper(`${e.hazard_type||''} ${e.event_name||''} ${e.headline||''}`);
 if(/HURRICANE_TRACK/.test(h))return'hurricane_track';
 if(/HURRICANE_CONE/.test(h))return'hurricane_cone';
 if(/HURRICANE|TROPICAL|CYCLONE|TYPHOON/.test(h))return'hurricane';
 if(/TORNADO|FUNNEL/.test(h))return'tornado';
 if(/WILDFIRE/.test(h))return'fire';
 if(/FIRE WEATHER|FIRE_WEATHER|RED FLAG/.test(h))return'fireweather';
 if(/HAIL/.test(h))return'hail';
 if(/LIGHTNING|GLM/.test(h))return'lightning';
 if(/SNOW|BLIZZARD|LAKE EFFECT|WINTER STORM|WINTER WEATHER/.test(h))return'snow';
 if(/ICE|FREEZING RAIN|FREEZING_DRIZZLE|FREEZING DRIZZLE|SLEET/.test(h))return'ice';
 if(/FLASH_FLOOD|COASTAL_FLOOD|FLOOD|INUNDATION|RIVER_STAGE/.test(h))return'flood';
 if(/POWER_OUTAGE|GRID_OUTAGE|OUTAGE/.test(h))return'outage';
 if(/FOG/.test(h))return'fog';
 if(/DUST/.test(h))return'dust';
 if(/EXCESSIVE HEAT|HEAT ADVISORY|EXTREME HEAT|HEAT/.test(h))return'heat';
 if(/EXTREME COLD|WIND CHILL|COLD WEATHER|HARD FREEZE|FREEZE WARNING|FROST/.test(h))return'cold';
 if(/AVALANCHE/.test(h))return'avalanche';
 if(/RAIN/.test(h))return'rain';
 if(/WIND/.test(h))return'wind';
 return'severe';
}
function observed(e){
 const k=upper(e.observation_kind),m=upper(e.effect_mode);
 return m.startsWith('OBSERVED_')||['OBSERVED','OBSERVED_INCIDENT','OBSERVED_RADAR','OBSERVED_REPORT','CURRENT_STORM','SATELLITE_DETECTION'].includes(k);
}
function recent(e){
 const raw=e.observed_at||e.source_updated_at||e.last_seen_at||e.starts_at;
 const t=raw?new Date(raw).getTime():NaN;
 if(!Number.isFinite(t))return false;
 const k=kind(e);
 const max=k==='fire'?12*3600e3:k==='hurricane'?6*3600e3:100*60e3;
 return Date.now()-t<max;
}
function physical(e){
 const k=kind(e);
 if(k==='hurricane')return upper(e.observation_kind)==='CURRENT_STORM'||observed(e);
 if(k==='fire')return observed(e);
 if(['rain','hail','snow','ice','wind','lightning','flood','tornado'].includes(k))return observed(e)&&recent(e);
 return false;
}
function flattenCoords(g,out=[]){
 if(!g)return out;
 const walk=v=>{
  if(Array.isArray(v)&&v.length>=2&&typeof v[0]==='number'&&typeof v[1]==='number')out.push([v[0],v[1]]);
  else if(Array.isArray(v))for(const x of v)walk(x);
 };
 walk(g.coordinates);return out;
}
function center(g){
 if(!g)return null;
 if(g.type==='Point')return g.coordinates;
 const a=flattenCoords(g);if(!a.length)return null;
 let x=0,y=0;for(const p of a){x+=p[0];y+=p[1]}return[x/a.length,y/a.length];
}
function bbox(g){
 const a=flattenCoords(g);if(!a.length)return null;
 let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity;
 for(const p of a){minX=Math.min(minX,p[0]);maxX=Math.max(maxX,p[0]);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1])}
 return{minX,minY,maxX,maxY};
}
function feature(e){
 const g=eventGeom(e);if(!g)return null;
 const k=kind(e),p=props(e),m=meta(e);
 const waterDepth=Number(p.water_depth_m??p.depth_m??p.inundation_depth_m??m.water_depth_m??m.depth_m??NaN);
 return{type:'Feature',geometry:g,properties:{
  id:e.hazard_event_id||'',kind:k,observed:observed(e)?1:0,physical:physical(e)?1:0,
  headline:e.headline||e.event_name||'',severity:e.severity||'',observation_kind:e.observation_kind||'',
  movement_dir:Number(p.movementDir??p.movement_dir??p.direction??NaN),
  movement_speed:Number(p.movementSpeed??p.movement_speed??NaN),
  intensity:Number(p.intensity??NaN),prob_hail:Number(p.prob_hail??NaN),mesh_in:Number(p.mesh_in??NaN),
  water_depth_m:Number.isFinite(waterDepth)?waterDepth:0,truth_rule:e.truth_rule||'',source_url:e.source_url||''
 }};
}

function addSource(id){if(!state.map.getSource(id))state.map.addSource(id,{type:'geojson',data:{type:'FeatureCollection',features:[]}})}
function addLayer(x){if(!state.map.getLayer(x.id))state.map.addLayer(x)}
function colorExpr(){return['match',['get','kind'],...Object.entries(COLORS).flat(),'#bfd0dc']}
function installMapLayers(){
 addSource('bp2080-weather');
 addLayer({id:'bp2080-area-fill',type:'fill',source:'bp2080-weather',
  filter:['in',['geometry-type'],['literal',['Polygon','MultiPolygon']]],
  paint:{'fill-color':colorExpr(),'fill-opacity':['interpolate',['linear'],['zoom'],2.5,.018,7,.026,10,.045,14,.065]}});
 addLayer({id:'bp2080-area-line',type:'line',source:'bp2080-weather',
  paint:{'line-color':colorExpr(),'line-width':['interpolate',['linear'],['zoom'],2.5,.55,7,.9,11,1.35,16,1.85],
  'line-opacity':['case',['==',['get','observed'],1],.84,.52]}});
 try{if(state.map.getLayer('labels'))state.map.moveLayer('labels')}catch(_){}
 for(const id of ['bp2070-weather-fill','bp2070-weather-line','bp2070-motion-line']){
  try{if(state.map.getLayer(id))state.map.setLayoutProperty(id,'visibility','none')}catch(_){}
 }
}

function installStyle(){
 if($('#bp2080Style'))return;
 const s=document.createElement('style');s.id='bp2080Style';
 s.textContent=`
 #bp97WeatherCanvas,#bp2055FxCanvas,#bp2060AtmosphereCanvas,#bp2070WeatherCanvas{display:none!important}
 #bp2080WeatherCanvas{position:absolute;inset:0;z-index:5;pointer-events:none;opacity:.92}
 .bp2080-filter{white-space:nowrap}
 `;
 document.head.appendChild(s);
}
function installFilters(){
 const row=$('.peril-scroll');if(!row)return;
 row.innerHTML='';
 for(const [k,label] of KINDS){
  const b=document.createElement('button');
  b.className='peril bp2080-filter'+(k==='all'?' active':'');
  b.dataset.bp2080Peril=k;b.textContent=label;
  b.onclick=()=>{
   state.filter=k;
   row.querySelectorAll('[data-bp2080-peril]').forEach(x=>x.classList.toggle('active',x===b));
   applyFilter();
  };
  row.appendChild(b);
 }
 const fx=$('#bp97WeatherFx');
 if(fx){
  fx.textContent='Cinematic weather';
  fx.classList.add('active');
  fx.onclick=()=>{
   state.enabled=!state.enabled;fx.classList.toggle('active',state.enabled);
   if(state.canvas)state.canvas.style.display=state.enabled?'block':'none';
   applyFilter();
  };
 }
}
function filterKinds(){
 if(state.filter==='all')return null;
 if(state.filter==='hurricane')return['hurricane','hurricane_track','hurricane_cone'];
 return[state.filter];
}
function applies(k){
 const f=filterKinds();return !f||f.includes(k);
}
function applyFilter(){
 const f=filterKinds();
 const filter=f?['in',['get','kind'],['literal',f]]:null;
 try{if(state.map.getLayer('bp2080-area-fill'))state.map.setFilter('bp2080-area-fill',filter)}catch(_){}
 try{if(state.map.getLayer('bp2080-area-line'))state.map.setFilter('bp2080-area-line',filter)}catch(_){}
}

function compile(gl,type,src){
 const sh=gl.createShader(type);gl.shaderSource(sh,src);gl.compileShader(sh);
 if(!gl.getShaderParameter(sh,gl.COMPILE_STATUS)){const e=gl.getShaderInfoLog(sh);gl.deleteShader(sh);throw new Error(e||'shader compile failed')}
 return sh;
}
function initGL(){
 const shell=$('.map-shell');if(!shell)return false;
 const c=document.createElement('canvas');c.id='bp2080WeatherCanvas';shell.appendChild(c);state.canvas=c;
 const opts={alpha:true,antialias:false,premultipliedAlpha:true,preserveDrawingBuffer:false,desynchronized:true};
 const gl=c.getContext('webgl2',opts);
 if(!gl){state.ctx2d=c.getContext('2d');state.gpuMode='canvas2d';resize();return false}
 state.gl=gl;state.gpuMode='webgl2';
 const vs=`#version 300 es
 in vec2 aPos;out vec2 vUv;
 void main(){vUv=aPos*.5+.5;gl_Position=vec4(aPos,0.,1.);}
 `;
 const fs=`#version 300 es
 precision highp float;
 in vec2 vUv;out vec4 outColor;
 uniform sampler2D uMask;
 uniform vec2 uRes;
 uniform float uTime;
 uniform float uZoom;
 uniform float uIntensity;
 uniform float uDirection;
 uniform int uKind;
 uniform vec2 uCenter;
 uniform vec3 uColor;

 float hash21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
 float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash21(i),hash21(i+vec2(1,0)),f.x),mix(hash21(i+vec2(0,1)),hash21(i+vec2(1,1)),f.x),f.y);}
 float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+17.1;a*=.5;}return v;}

 void main(){
  vec2 uv=vUv;
  float mask=texture(uMask,uv).r;
  if(mask<.002){outColor=vec4(0);return;}
  vec2 p=uv*uRes/min(uRes.x,uRes.y);
  float t=uTime;
  float a=0.;
  vec3 col=uColor;

  if(uKind==1){
   vec2 q=p*vec2(52.,24.);q.x+=t*4.5;q.y-=t*16.;
   vec2 id=floor(q),f=fract(q);float r=hash21(id);
   float drop=(1.-smoothstep(.025,.075,abs(f.x-r)))*smoothstep(.06,.0,abs(f.y-fract(r*7.1)));
   a=drop*.38*mask;
  }else if(uKind==2){
   vec2 q=p*vec2(34.,24.);q.y-=t*11.;vec2 id=floor(q),f=fract(q);
   vec2 c=vec2(hash21(id),hash21(id+9.7));float d=length(f-c);
   float ball=1.-smoothstep(.055,.11,d);float glow=1.-smoothstep(.11,.25,d);
   a=(ball*.58+glow*.13)*mask;col=mix(col,vec3(1),ball*.75);
  }else if(uKind==3){
   vec2 q=p*18.;q.y-=t*2.4;q.x+=sin(q.y*.3+t)*.4;vec2 id=floor(q),f=fract(q);
   vec2 c=vec2(hash21(id),hash21(id+4.2));float d=length(f-c);
   a=(1.-smoothstep(.035,.12,d))*.42*mask;
  }else if(uKind==4){
   float n=fbm(p*18.+vec2(t*.05,-t*.03));
   float crystal=pow(max(0.,sin((p.x+p.y)*90.+n*8.)),18.);
   a=(.025+.12*crystal)*mask;col=mix(col,vec3(1),crystal*.7);
  }else if(uKind==5){
   vec2 q=p;float n=fbm(vec2(q.x*8.,q.y*7.-t*2.2));
   float flame=smoothstep(.48,.82,n+sin(q.x*38.+t*3.)*.08);
   float smoke=smoothstep(.42,.72,fbm(q*5.+vec2(0,-t*.4)));
   a=(flame*.38+smoke*.10)*mask;col=mix(vec3(.18,.19,.22),col,clamp(flame*1.5,0.,1.));
  }else if(uKind==6){
   float ang=radians(uDirection);vec2 dir=vec2(sin(ang),-cos(ang));vec2 q=p*16.-dir*t*4.;
   float lane=abs(fract(q.y+sin(q.x*.7)*.12)-.5);
   float dash=step(.58,fract(q.x*1.5));
   a=(1.-smoothstep(.025,.10,lane))*dash*.22*mask;
  }else if(uKind==7){
   float n=sin((p.x*34.+t*1.7)+sin(p.y*19.-t)*1.5);
   float n2=sin(p.y*27.-t*1.2);
   a=(.055+.055*(n*.5+.5)+.035*(n2*.5+.5))*mask;
  }else if(uKind==8){
   float pulse=step(.965,fract(sin(floor(t*3.4)*91.7)*43758.5));
   float x=.5+.18*sin(p.y*15.+floor(t*3.)*2.3);
   float bolt=1.-smoothstep(.004,.018,abs(p.x-x));
   a=bolt*pulse*.78*mask;col=vec3(1.,.98,.72);
  }else if(uKind==9){
   vec2 d=(uv-uCenter)*vec2(uRes.x/uRes.y,1.);float r=length(d);
   float ang=atan(d.y,d.x);
   float eye=smoothstep(.018,.045,r);
   float outer=1.-smoothstep(.10+.03*uIntensity,.42+.08*uIntensity,r);
   float bands=.5+.5*sin(ang*5.-r*68.-t*1.2);
   float cloud=smoothstep(.34,.79,fbm(vec2(ang*2.2+r*17.,r*20.-t*.13))+bands*.25);
   a=outer*eye*cloud*.24*max(mask,.35);
   col=mix(vec3(.56,.72,.83),vec3(.95,.99,1.),cloud);
  }else if(uKind==10){
   vec2 d=uv-uCenter;float y=(d.y+.085);float h=clamp(1.-y/.19,0.,1.);
   float halfw=mix(.010,.070,pow(h,.75));
   float swirl=sin((d.y*220.)-t*10.)*.008*h;
   float body=1.-smoothstep(halfw,halfw+.012,abs(d.x+swirl));
   float fade=smoothstep(.01,.04,h)*smoothstep(.02,.15,.19-y);
   float dust=(1.-smoothstep(.035,.11,length(vec2(d.x,d.y+.086))))*.25;
   a=(body*.24*fade+dust)*mask;
   col=mix(vec3(.26,.29,.31),vec3(.72,.73,.75),h);
  }else if(uKind==11){
   float n=fbm(p*4.+vec2(t*.05,0));a=(.035+.08*n)*mask;col=vec3(.85,.9,.94);
  }else if(uKind==12){
   float n=fbm(p*6.+vec2(t*.18,t*.02));a=(.04+.12*n)*mask;col=vec3(.78,.58,.33);
  }else if(uKind==13){
   float s=sin((p.y+t*.3)*80.+noise(p*8.)*4.);a=(.015+.025*(s*.5+.5))*mask;col=vec3(1.,.46,.28);
  }else if(uKind==14){
   float s=pow(max(0.,sin((p.x-p.y)*70.+t*.5)),10.);a=(.02+.05*s)*mask;col=vec3(.58,.86,1.);
  }else if(uKind==15){
   float n=fbm(p*10.+vec2(0,-t*.9));a=.10*n*mask;col=vec3(.95,.99,1.);
  }

  a*=clamp(uIntensity,.25,1.35);
  outColor=vec4(col,a);
 }`;
 const prog=gl.createProgram();gl.attachShader(prog,compile(gl,gl.VERTEX_SHADER,vs));gl.attachShader(prog,compile(gl,gl.FRAGMENT_SHADER,fs));gl.linkProgram(prog);
 if(!gl.getProgramParameter(prog,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(prog)||'program link failed');
 state.program=prog;state.posBuf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,state.posBuf);
 gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
 const loc=gl.getAttribLocation(prog,'aPos');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
 for(const n of ['uMask','uRes','uTime','uZoom','uIntensity','uDirection','uKind','uCenter','uColor'])state.uniforms[n]=gl.getUniformLocation(prog,n);
 state.maskTex=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,state.maskTex);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
 gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
 gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);
 state.maskCanvas=document.createElement('canvas');state.maskCtx=state.maskCanvas.getContext('2d',{alpha:true});
 resize();return true;
}
function resize(){
 if(!state.canvas)return;
 const shell=$('.map-shell');if(!shell)return;
 const r=shell.getBoundingClientRect();
 let d=Math.min(devicePixelRatio||1,state.deviceMemory<=2?1:state.deviceMemory<4?1.2:1.55);
 if(innerWidth<520)d=Math.min(d,1.25);
 state.quality=d;
 state.canvas.width=Math.max(2,Math.round(r.width*d));state.canvas.height=Math.max(2,Math.round(r.height*d));
 state.canvas.style.width=r.width+'px';state.canvas.style.height=r.height+'px';
 if(state.gl)state.gl.viewport(0,0,state.canvas.width,state.canvas.height);
 if(state.ctx2d)state.ctx2d.setTransform(d,0,0,d,0,0);
 if(state.maskCanvas){state.maskCanvas.width=state.canvas.width;state.maskCanvas.height=state.canvas.height;state.maskCtx.setTransform(d,0,0,d,0,0);}
}
function project(c){try{return state.map.project(c)}catch(_){return null}}
function projectedGeometryPath(ctx,g){
 if(!g)return false;let drawn=false;
 const ring=r=>{if(!Array.isArray(r)||r.length<3)return;let first=true;for(const c of r){const p=project(c);if(!p)continue;if(first){ctx.moveTo(p.x,p.y);first=false}else ctx.lineTo(p.x,p.y)}ctx.closePath();drawn=true};
 if(g.type==='Polygon'){for(const r of g.coordinates||[])ring(r)}
 else if(g.type==='MultiPolygon'){for(const poly of g.coordinates||[])for(const r of poly||[])ring(r)}
 return drawn;
}
function maskForEvent(e){
 const ctx=state.maskCtx;if(!ctx)return null;
 const w=state.canvas.clientWidth,h=state.canvas.clientHeight;
 ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.beginPath();
 const g=eventGeom(e);
 if(g?.type==='Polygon'||g?.type==='MultiPolygon'){projectedGeometryPath(ctx,g);ctx.fill('evenodd')}
 else{
  const c=center(g);const p=c?project(c):null;if(!p)return null;
  const k=kind(e),z=state.map.getZoom();
  let radius=k==='hurricane'?clamp(95+(z-5)*18,100,300):k==='tornado'?70:k==='lightning'?85:65;
  ctx.arc(p.x,p.y,radius,0,TAU);ctx.fill();
 }
 return state.maskCanvas;
}
function rgb(hex){
 const s=hex.replace('#','');return[parseInt(s.slice(0,2),16)/255,parseInt(s.slice(2,4),16)/255,parseInt(s.slice(4,6),16)/255];
}
const SHADER_KIND={rain:1,hail:2,snow:3,ice:4,fire:5,wind:6,flood:7,lightning:8,hurricane:9,tornado:10,fog:11,dust:12,heat:13,cold:14,avalanche:15};
function intensityOf(e){
 const p=props(e),k=kind(e);
 if(k==='hail'){const mesh=Number(p.mesh_in??0),prob=Number(p.prob_hail??0);return clamp(.45+mesh*.18+prob/180,.45,1.25)}
 if(k==='hurricane'){const kt=Number(p.intensity??0);return clamp(.45+kt/160,.5,1.2)}
 if(k==='wind'){const s=Number(p.wind_speed_mph??p.wind_speed??p.movementSpeed??0);return clamp(.45+s/110,.45,1.2)}
 return 1;
}
function directionOf(e){
 const p=props(e);const d=Number(p.wind_direction_deg??p.movementDir??p.movement_dir??p.direction??0);return Number.isFinite(d)?d:0;
}
function renderPass(e,t){
 const gl=state.gl;if(!gl||!state.program)return;
 const k=kind(e),ki=SHADER_KIND[k];if(!ki)return;
 const mask=maskForEvent(e);if(!mask)return;
 gl.useProgram(state.program);gl.bindBuffer(gl.ARRAY_BUFFER,state.posBuf);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,state.maskTex);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
 gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mask);
 gl.uniform1i(state.uniforms.uMask,0);
 gl.uniform2f(state.uniforms.uRes,state.canvas.width,state.canvas.height);
 gl.uniform1f(state.uniforms.uTime,t);gl.uniform1f(state.uniforms.uZoom,state.map.getZoom());
 gl.uniform1f(state.uniforms.uIntensity,intensityOf(e));gl.uniform1f(state.uniforms.uDirection,directionOf(e));
 gl.uniform1i(state.uniforms.uKind,ki);
 const c=center(eventGeom(e)),p=c?project(c):null;
 const cx=p?clamp(p.x/state.canvas.clientWidth,0,1):.5,cy=p?clamp(1-p.y/state.canvas.clientHeight,0,1):.5;
 gl.uniform2f(state.uniforms.uCenter,cx,cy);
 const cc=rgb(COLORS[k]||COLORS.severe);gl.uniform3f(state.uniforms.uColor,cc[0],cc[1],cc[2]);
 gl.drawArrays(gl.TRIANGLES,0,6);
}
function fallback2d(e,t){
 const ctx=state.ctx2d;if(!ctx)return;const k=kind(e),g=eventGeom(e),c=center(g),p=c?project(c):null;if(!p)return;
 ctx.save();ctx.globalAlpha=.24;ctx.strokeStyle=COLORS[k]||'#fff';ctx.fillStyle=COLORS[k]||'#fff';
 if(k==='tornado'){ctx.translate(p.x,p.y);ctx.beginPath();for(let i=0;i<22;i++){const y=-90+i*4,r=(i/22)*28+3,x=Math.sin(t*8+i*.9)*r*.25;ctx.lineTo(x-r*.5,y);ctx.lineTo(x+r*.5,y)}ctx.closePath();ctx.fill()}
 else if(k==='hurricane'){for(let a=0;a<6;a++){ctx.beginPath();for(let i=0;i<45;i++){const th=i*.22+a*TAU/6+t*.15,r=10+i*3.1;const x=p.x+Math.cos(th)*r,y=p.y+Math.sin(th)*r*.72;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y)}ctx.stroke()}}
 ctx.restore();
}
function visiblePhysical(){
 const z=state.map.getZoom(),w=state.canvas.clientWidth,h=state.canvas.clientHeight;
 if(z<6)return[];
 const out=[];
 for(const e of state.events){
  const k=kind(e);if(!applies(k)||!physical(e))continue;
  const min={hurricane:5.8,fire:9.2,flood:9.4,rain:9.8,hail:10,snow:9.8,ice:10,lightning:9.2,wind:9.5,tornado:10.4}[k]??10;
  if(z<min)continue;
  const c=center(eventGeom(e)),p=c?project(c):null;
  const b=bbox(eventGeom(e));
  let on=p&&p.x>-220&&p.x<w+220&&p.y>-220&&p.y<h+220;
  if(!on&&b){const a=project([b.minX,b.minY]),d=project([b.maxX,b.maxY]);if(a&&d)on=Math.max(a.x,d.x)>=-100&&Math.min(a.x,d.x)<=w+100&&Math.max(a.y,d.y)>=-100&&Math.min(a.y,d.y)<=h+100}
  if(on)out.push(e);
 }
 const cap=state.deviceMemory<=2?6:state.deviceMemory<4?10:18;
 return out.slice(0,cap);
}
function render(now){
 state.raf=requestAnimationFrame(render);
 if(!state.enabled||!state.canvas||!state.map)return;
 const minFrame=1000/(state.reduceMotion?20:state.fpsTarget);
 if(now-state.lastFrame<minFrame)return;state.lastFrame=now;
 const z=state.map.getZoom();
 if(z<5.8){if(state.gl)state.gl.clear(state.gl.COLOR_BUFFER_BIT);else if(state.ctx2d)state.ctx2d.clearRect(0,0,state.canvas.clientWidth,state.canvas.clientHeight);return}
 const ev=visiblePhysical();
 if(state.gl){
  state.gl.clearColor(0,0,0,0);state.gl.clear(state.gl.COLOR_BUFFER_BIT);
  for(const e of ev)renderPass(e,now/1000);
 }else if(state.ctx2d){
  state.ctx2d.clearRect(0,0,state.canvas.clientWidth,state.canvas.clientHeight);
  for(const e of ev)fallback2d(e,now/1000);
 }
 state.diagnostics.visible_effects=ev.length;state.diagnostics.zoom=z;
}

async function load(){
 if(!state.map||state.busy)return;
 const s=session();if(!s)return;
 state.busy=true;const q=++state.seq;
 try{
  const b=state.map.getBounds(),z=state.map.getZoom();
  const r=await fetch(RPC,{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${s.access_token}`,'Content-Type':'application/json','Cache-Control':'no-cache'},
   body:JSON.stringify({p_min_lat:b.getSouth(),p_max_lat:b.getNorth(),p_min_lng:b.getWest(),p_max_lng:b.getEast(),p_limit:z<6?3200:2200}),cache:'no-store'});
  const d=await r.json();if(!r.ok)throw new Error(d?.message||`HTTP ${r.status}`);if(q!==state.seq)return;
  state.events=Array.isArray(d.events)?d.events:[];
  state.features=state.events.map(feature).filter(Boolean);
  state.map.getSource('bp2080-weather')?.setData({type:'FeatureCollection',features:state.features});
  state.lastLoad=Date.now();applyFilter();
  window.__bp2080CinematicWeather={
   version:VERSION,renderer:state.gpuMode,webgpu_available:!!navigator.gpu,webgl2:!!state.gl,
   events:state.events.length,physical_events:state.events.filter(physical).length,
   lod:{macro:'thin source geometry only',meso:'bounded atmospheric motion',micro:'frustum-culled physical effects'},
   truth:'Physical effects render only from observed/radar/satellite/current-incident evidence; alert/forecast geometry remains contextual.'
  };
 }catch(e){console.warn('BridgePoint cinematic weather V2080',e)}
 finally{state.busy=false}
}
function schedule(ms=100){clearTimeout(state.timer);state.timer=setTimeout(load,ms)}
function install(){
 const s=window.__bp97MapState;
 if(!s?.ready||!s.map){setTimeout(install,160);return}
 if(state.ready)return;state.ready=true;state.map=s.map;
 state.reduceMotion=matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
 state.fpsTarget=state.deviceMemory<=2?28:state.deviceMemory<4?36:50;
 installStyle();installFilters();installMapLayers();initGL();
 state.map.on('moveend',()=>schedule(70));state.map.on('zoomend',()=>schedule(50));state.map.on('resize',resize);
 window.addEventListener('resize',resize,{passive:true});
 setInterval(()=>schedule(0),20000);
 schedule(0);requestAnimationFrame(render);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();