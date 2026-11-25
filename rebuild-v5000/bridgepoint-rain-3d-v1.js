/* BridgePoint Rain V1: independent observation-driven 3D weather visualization. */
(()=>{
'use strict';
if(window.__BP_RAIN_BUTTON_V1__)return;
const D=Math.PI/180,C=40075016.68557849,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),frac=x=>x-Math.floor(x),hash=(a,b=0)=>frac(Math.sin(a*127.1+b*311.7)*43758.5453);
const mobile=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad/i.test(navigator.userAgent);
const SOURCE='bp-rn-v1-source',FILL='bp-rn-v1-area',EDGE='bp-rn-v1-edge',PUDDLE='bp-rn-v1-pool',FX='bp-rn-v1-3d',MARK='bp-rn-v1-marker',ICON='bp-rn-v1-icon',RAIN_IMG='bp-rn-v1-rain-image',STORM_IMG='bp-rn-v1-storm-image';
const fc=features=>({type:'FeatureCollection',features});
const mapNow=()=>window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD__?.map||window.__bpLandingWorldV5420?.map||window.__bpWorldV2300?.map||window.__BP_WORLD_V2300__?.map;
let map=null,on=false,rows=[],cells=[],near=[],pools=[],drops=[],cloudVertices=new Float32Array(),dirty=true,raf=0,lastFrame=0,lastSource=0,refreshTimer=0,fetching=false,sourceStatus='idle',sourceTime=null,epoch=0,rebuildTimer=0,button=null,error=null,lastPoolBuild=0;
const diagnostics={cloudLobes:0,fallingDrops:0,ripples:0,lightningBolts:0,draws:0,shaderReady:false,projection:null,sourcePolicy:'Observed rain or thunderstorm; estimated coverage, simulated effects, not measured puddles or strikes'};
const empty=()=>fc([]);
function number(x){return x==null||x===''?NaN:Number(x)}
function weatherText(o){return [o.weather,o.present_weather,o.weather_text,o.wx,o.wxString,o.wx_string,o.condition,o.rawdata,o.rawOb,o.raw_text].filter(Boolean).join(' ').toUpperCase()}
function isRain(o){const s=weatherText(o);return /\b(?:[+-]?(?:SH|TS|FZ)?(?:RA|DZ)|TS(?:RA)?|RAIN|DRIZZLE|THUNDERSTORM|SHOWERS?)\b/.test(s)&&!(/\b(?:SN|BLSN|SNOW|BLIZZARD)\b/.test(s)&&!/\b(?:RA|RAIN|TSRA)\b/.test(s))}
function thunder(o){return /\b(?:TS(?:RA)?|THUNDERSTORM|THUNDER|SQUALL)\b/.test(weatherText(o))}
function age(o,now=Date.now()){let raw=o.observed_at??o.observation_time??o.obsTime??o.reportTime??o.timestamp??o.time;let n=typeof raw==='number'?raw*(raw<1e12?1000:1):Date.parse(raw||'');return Number.isFinite(n)?now-n:0}
function normalize(input){const out=[],seen=new Set();for(const item of input||[]){const o={...item,...(item?.properties||{})};if(!isRain(o)||age(o)>90*60000||age(o)<-120000)continue;const lon=number(o.lng??o.lon??o.longitude??item?.geometry?.coordinates?.[0]),lat=number(o.lat??o.latitude??item?.geometry?.coordinates?.[1]);if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lon)>180||Math.abs(lat)>84)continue;const key=lon.toFixed(2)+','+lat.toFixed(2);if(seen.has(key))continue;seen.add(key);const ts=thunder(o),r=number(o.rain_radius_mi??o.precipitation_radius_mi),base=number(o.cloud_base_height_m??o.cloudBaseHeightM);out.push({lon,lat,ts,radius:clamp(Number.isFinite(r)&&r>0?r*1609.344:ts?24000:14000,2500,65000),base:clamp(Number.isFinite(base)?base:ts?700:500,200,3500),key,seed:Math.round((lon+180)*1000+lat*97),observedAt:String(o.observed_at??o.observation_time??o.reportTime??o.timestamp??''),source:String(o.source||'weather observation')})}return out}
function world(lon,lat,h){const r=clamp(lat,-84.9,84.9)*D;return [(lon+180)/360,(1-Math.log(Math.tan(Math.PI/4+r/2))/Math.PI)/2,h]}
function geo(lon,lat,e,n){return [lon+e/(111320*Math.max(.12,Math.cos(lat*D))),lat+n/111320]}
function distance(a,b){return Math.hypot((a.lon-b.lon)*111320*Math.cos((a.lat+b.lat)*D*.5),(a.lat-b.lat)*111320)}
function terrain(lon,lat){try{const h=map.queryTerrainElevation([lon,lat],{exaggerated:false});return Number.isFinite(h)?h:0}catch(_){return 0}}
function ring(lon,lat,rx,ry,seed=0,n=32){const out=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,w=.92+.16*hash(seed,i);out.push(geo(lon,lat,Math.cos(a)*rx*w,Math.sin(a)*ry*w))}out.push(out[0]);return out}
function shape(c){const rr=ring(c.lon,c.lat,c.radius,c.radius*.82,c.seed);if(rr.some(p=>Math.abs(p[0])>180||Math.abs(p[1])>85))return null;return {type:'Feature',geometry:{type:'Polygon',coordinates:[rr]},properties:{kind:'area',thunderstorm:c.ts,source:c.source,coverage:'estimated around observed rain'}}}
let popup=null;
function iconImage(storm){
 const canvas=document.createElement('canvas');canvas.width=64;canvas.height=64;
 const c=canvas.getContext('2d');c.lineJoin='round';c.lineCap='round';
 c.fillStyle=storm?'#23335d':'#103852';c.strokeStyle=storm?'#e2d2ff':'#98dfff';c.lineWidth=3;c.beginPath();c.arc(32,32,29,0,Math.PI*2);c.fill();c.stroke();
 c.fillStyle='#eaf7ff';c.beginPath();c.moveTo(16,34);c.bezierCurveTo(8,29,15,20,23,22);c.bezierCurveTo(24,9,42,10,45,22);c.bezierCurveTo(57,20,59,34,47,36);c.lineTo(19,36);c.closePath();c.fill();
 c.strokeStyle='#7edbff';c.lineWidth=3.8;for(const x of storm?[18,46]:[19,32,45]){c.beginPath();c.moveTo(x,41);c.lineTo(x-4,50);c.stroke()}
 if(storm){c.fillStyle='#ffe680';c.beginPath();c.moveTo(34,34);c.lineTo(26,45);c.lineTo(34,45);c.lineTo(29,56);c.lineTo(43,41);c.lineTo(35,41);c.closePath();c.fill()}
 return c.getImageData(0,0,64,64);
}
function ensureIcons(){
 if(!map.hasImage(RAIN_IMG))map.addImage(RAIN_IMG,iconImage(false),{pixelRatio:2});
 if(!map.hasImage(STORM_IMG))map.addImage(STORM_IMG,iconImage(true),{pixelRatio:2});
 const filter=['==',['get','kind'],'marker'];
 if(!map.getLayer(MARK))map.addLayer({id:MARK,type:'circle',source:SOURCE,minzoom:0,filter,paint:{'circle-radius':['interpolate',['linear'],['zoom'],0,5,5,7,12,9,24,9],'circle-color':['case',['get','thunderstorm'],'#b39cff','#49baff'],'circle-stroke-width':1.6,'circle-stroke-color':'#d5f3ff','circle-opacity':.94,'circle-pitch-alignment':'viewport','circle-pitch-scale':'viewport'}});
 if(!map.getLayer(ICON))map.addLayer({id:ICON,type:'symbol',source:SOURCE,minzoom:0,filter,layout:{'icon-image':['case',['get','thunderstorm'],STORM_IMG,RAIN_IMG],'icon-size':['interpolate',['linear'],['zoom'],0,.72,4,.86,10,1,24,1],'icon-allow-overlap':true,'icon-ignore-placement':true,'icon-pitch-alignment':'viewport','icon-rotation-alignment':'viewport'}});
}
function openRainMarker(e){
 if(!on||!map||!map.getLayer(MARK))return;
 let f;try{f=map.queryRenderedFeatures(e.point,{layers:[ICON,MARK].filter(id=>map.getLayer(id))})[0]}catch(_){return}if(!f)return;
 const P=window.maplibregl?.Popup||window.MapLibreGL?.Popup;if(!P)return;
 const p=f.properties||{},box=document.createElement('div');box.style.cssText='font:13px/1.5 system-ui;color:#102b43;max-width:235px';
 const h=document.createElement('strong');h.textContent=p.thunderstorm===true||p.thunderstorm==='true'?'⛈ Thunderstorm':'🌧 Rain';box.append(h);
 for(const [label,value] of [['Source',p.source],['Estimated rain radius',Math.round(Number(p.radius_m)/1000)+' km'],['Observation',p.observed_at||'Source weather scene'],['Visual effects','Estimated coverage; simulated puddles and lightning']]){const r=document.createElement('div');r.textContent=label+': '+value;box.append(r)}
 popup?.remove();popup=new P({closeButton:true,closeOnClick:true,maxWidth:'260px'}).setLngLat(f.geometry.coordinates).setDOMContent(box).addTo(map);
}
function ensure(){if(!map||!on)return;try{if(!map.getSource(SOURCE)){map.addSource(SOURCE,{type:'geojson',data:empty()});dirty=true}const before=map.getLayer('gta-context-buildings')?'gta-context-buildings':undefined;
if(!map.getLayer(FILL))map.addLayer({id:FILL,type:'fill',source:SOURCE,filter:['==',['get','kind'],'area'],paint:{'fill-color':'#84cfff','fill-opacity':.25}},before);
if(!map.getLayer(EDGE))map.addLayer({id:EDGE,type:'line',source:SOURCE,filter:['==',['get','kind'],'area'],paint:{'line-color':'#b9e8ff','line-width':['interpolate',['linear'],['zoom'],0,1.2,7,2,16,2.5],'line-opacity':.95}});
if(!map.getLayer(PUDDLE))map.addLayer({id:PUDDLE,type:'fill',source:SOURCE,minzoom:13,filter:['==',['get','kind'],'pool'],paint:{'fill-color':'#456c83','fill-opacity':.52,'fill-outline-color':'#81b4d1'}},before);
if(!map.getLayer(FX))map.addLayer(makeLayer());
ensureIcons();
}catch(e){error=String(e?.message||e)}}
function updateSource(){if(!on||!map)return;const features=cells.map(shape).filter(Boolean);for(const c of cells)features.push({type:'Feature',geometry:{type:'Point',coordinates:[c.lon,c.lat]},properties:{kind:'marker',thunderstorm:c.ts,source:c.source,radius_m:c.radius,observed_at:c.observedAt||''}});for(const p of pools)features.push({type:'Feature',geometry:{type:'Polygon',coordinates:[ring(p.lon,p.lat,p.r,p.r*.64,p.seed,14)]},properties:{kind:'pool',modelled:true}});map.getSource(SOURCE)?.setData(fc(features));}
function choose(){if(!on||!map)return;const z=map.getZoom(),c=map.getCenter(),view={lon:c.lng,lat:c.lat},canvas=map.getCanvas(),width=canvas.clientWidth||400,height=canvas.clientHeight||800;
const visible=cells.filter(a=>{if(z<3.5&&Math.sin(c.lat*D)*Math.sin(a.lat*D)+Math.cos(c.lat*D)*Math.cos(a.lat*D)*Math.cos((a.lon-c.lng)*D)<-.05)return false;try{const p=map.project([a.lon,a.lat]),mpp=156543*Math.cos(a.lat*D)/2**z,margin=Math.max(45,a.radius/Math.max(.1,mpp));return p.x>=-margin&&p.x<=width+margin&&p.y>=-margin&&p.y<=height+margin}catch(_){return false}});
visible.sort((a,b)=>distance(a,view)-distance(b,view));near=visible.slice(0,z<4?(mobile?26:48):z<10?(mobile?12:24):(mobile?5:9));pools=[];drops=[];let cv=[];const add=(arr,p,col,flash=0,seed=0)=>arr.push(...p,...col,flash,seed);
for(const a of near){a.ground=terrain(a.lon,a.lat);const radius=a.radius,th=a.ts?1:0,seed=a.seed;
 // Overlapping shaded ellipsoid meshes are geographically fixed to the estimated rain region.
 const lobes=z<5?7:11,segments=12,bands=7;
 for(let j=0;j<lobes;j++){const theta=hash(seed,j+1)*Math.PI*2,offset=radius*(j?(.12+.36*hash(seed,j+17)):0),q=geo(a.lon,a.lat,Math.cos(theta)*offset,Math.sin(theta)*offset*.76),rx=radius*(.20+.16*hash(seed,j+44)),ry=rx*(.62+.27*hash(seed,j+67)),rz=clamp(rx*.28,650,th?5200:2500),top=a.ground+a.base+rz*.85;
 const point=(i,k)=>{const t=i/bands*Math.PI,b=k/segments*Math.PI*2,w=1+.10*Math.sin(b*3+seed)*Math.sin(t);const pt=geo(q[0],q[1],Math.sin(t)*Math.cos(b)*rx*w,Math.sin(t)*Math.sin(b)*ry*w);const h=Math.max(a.ground+a.base,top+rz*Math.cos(t));const shade=.24+.22*(.5+.5*Math.cos(t))+.06*Math.sin(b+.4)*Math.sin(t);return [world(pt[0],pt[1],h),[shade*.84,shade*.95,shade*1.09,.97]]};
 for(let i=0;i<bands;i++)for(let k=0;k<segments;k++){const p=point(i,k),q1=point(i+1,k),q2=point(i+1,k+1),q3=point(i,k+1);for(const v of [p,q1,q2,p,q2,q3])add(cv,v[0],v[1],th,frac(seed*.173))}
 }
 // At close zoom sample the part of the cell intersecting the viewport, never the dry side.
 const mpp=156543*Math.max(.12,Math.cos(c.lat*D))/2**z;
 const local=z>=10&&distance(a,view)<radius*.82,origin=local?view:a,rad=local?Math.min(radius,Math.max(80,mpp*Math.hypot(width,height)*.65)):radius*.83;
 const count=Math.max(15,Math.floor((mobile?420:1050)/Math.max(1,near.length)));
 for(let j=0;j<count;j++){const ang=hash(seed,j+200)*Math.PI*2,r=Math.sqrt(hash(seed,j+600))*rad,p=geo(origin.lon,origin.lat,Math.cos(ang)*r,Math.sin(ang)*r);if(distance(a,{lon:p[0],lat:p[1]})>radius*.82)continue;drops.push({lon:p[0],lat:p[1],ground:z>=10?terrain(p[0],p[1]):a.ground,base:a.base,phase:hash(seed,j+1000),rate:8+hash(seed,j+1300)*5,seed:seed+j})}
 if(z>=13&&local){for(let j=0;j<(mobile?25:55);j++){const ang=hash(seed,j+3000)*Math.PI*2,r=Math.sqrt(hash(seed,j+3100))*Math.min(500,rad),p=geo(c.lng,c.lat,Math.cos(ang)*r,Math.sin(ang)*r);if(distance(a,{lon:p[0],lat:p[1]})>radius*.78)continue;const h=terrain(p[0],p[1]);pools.push({lon:p[0],lat:p[1],h:h+.06,r:1.3+hash(seed,j+3300)*4,seed:seed+j,formed:Date.now()})}}
}
cloudVertices=new Float32Array(cv);diagnostics.cloudLobes=near.length*(z<5?7:11);dirty=true;updateSource();map.triggerRepaint();}
function effects(t){const out=[],z=map.getZoom();const add=(p,col)=>out.push(...p,...col,0,0);for(const d of drops){const phase=frac(d.phase+t*d.rate/d.base),h=d.ground+(1-phase)*d.base,scale=156543*Math.max(.12,Math.cos(d.lat*D))/2**z,len=clamp(scale*.7,2,Math.min(95,d.base*.15)),p=geo(d.lon,d.lat,-Math.min(4,len*.1),0);add(world(d.lon,d.lat,h),[.66,.83,.99,.18]);add(world(p[0],p[1],Math.max(d.ground,h-len)),[.77,.91,1,.83])}
diagnostics.fallingDrops=drops.length;diagnostics.ripples=0;for(const p of pools){const f=frac(t*1.15+hash(p.seed,10)),r=p.r*(.1+.72*f),alpha=(1-f)*.78;for(let i=0;i<12;i++){const a=i/12*Math.PI*2,b=(i+1)/12*Math.PI*2;for(const k of [a,b]){const q=geo(p.lon,p.lat,Math.cos(k)*r,Math.sin(k)*r);add(world(q[0],q[1],p.h),[.72,.90,1,alpha])}}if(f<.25){for(let i=0;i<4;i++){const a=i*Math.PI/2+hash(p.seed,15),q=geo(p.lon,p.lat,Math.cos(a)*.45,Math.sin(a)*.45);add(world(p.lon,p.lat,p.h),[.8,.94,1,.85]);add(world(q[0],q[1],p.h+.20*Math.sin(f*12)),[.8,.94,1,.2])}}diagnostics.ripples++}
diagnostics.lightningBolts=0;
if(!matchMedia('(prefers-reduced-motion: reduce)').matches)for(const c of near.filter(a=>a.ts).slice(0,mobile?5:10)){const f=frac(t/13+frac(c.seed*.173));if(f>.025)continue;const ground=c.ground,base=c.base,seed=c.seed+Math.floor(t/13);let prev=world(c.lon,c.lat,ground+base+300);for(let i=1;i<=14;i++){const u=i/14,p=geo(c.lon,c.lat,(hash(seed,i)-.5)*base*.55,(hash(seed,i+40)-.5)*base*.35),next=world(p[0],p[1],ground+(base+300)*(1-u));add(prev,[.88,.94,1,1]);add(next,[.75,.88,1,1]);if(i%4===0&&i<13){const b=geo(p[0],p[1],base*.25,base*.12);add(next,[.63,.80,1,.65]);add(world(b[0],b[1],ground+(base+300)*(1-u)*.65),[.63,.80,1,.15])}prev=next}diagnostics.lightningBolts++}
return new Float32Array(out)}
function makeLayer(){let gl,buffers=[],vao,programs=new Map(),cloudCount=0;
function program(g,args){const sd=args?.shaderData;if(!sd?.vertexShaderPrelude||!args?.defaultProjectionData)return null;const key=sd.vertexShaderPrelude+'\\n'+sd.define;if(programs.has(key))return programs.get(key);
const vs='#version 300 es\n'+sd.vertexShaderPrelude+'\n'+sd.define+'\nprecision highp float;\nin vec3 a_pos;in vec4 a_color;in vec2 a_flash;uniform float u_time;uniform float u_reduce;out vec4 v_color;void main(){gl_Position=projectTileFor3D(a_pos.xy,a_pos.z);float flash=(1.-step(.025,fract(u_time/13.+a_flash.y)))*a_flash.x*(1.-u_reduce);v_color=vec4(mix(a_color.rgb,vec3(.94,.96,1.),flash*.75),a_color.a);}';
const fs='#version 300 es\nprecision mediump float;in vec4 v_color;out vec4 outColor;void main(){outColor=v_color;}';
const compile=(type,src)=>{const s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS)){const e=g.getShaderInfoLog(s);g.deleteShader(s);throw Error(e)}return s};const v=compile(g.VERTEX_SHADER,vs),f=compile(g.FRAGMENT_SHADER,fs),p=g.createProgram();g.attachShader(p,v);g.attachShader(p,f);g.linkProgram(p);g.deleteShader(v);g.deleteShader(f);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));const u=n=>g.getUniformLocation(p,n);const o={p,attrs:['a_pos','a_color','a_flash'].map(n=>g.getAttribLocation(p,n)),u:['u_projection_matrix','u_projection_fallback_matrix','u_projection_tile_mercator_coords','u_projection_clipping_plane','u_projection_transition','u_time','u_reduce'].map(u)};programs.set(key,o);return o}
return {id:FX,type:'custom',renderingMode:'3d',onAdd(m,g){gl=g;buffers=[g.createBuffer(),g.createBuffer()];vao=g.createVertexArray?.();dirty=true},render(g,args){if(!on||!near.length||!vao)return;const now=performance.now()/1000;let saved;try{const a=program(g,args);if(!a)return;const d=args.defaultProjectionData;const get=n=>g.getParameter(g[n]),is=n=>g.isEnabled(g[n]);saved={p:get('CURRENT_PROGRAM'),a:get('ARRAY_BUFFER_BINDING'),vao:get('VERTEX_ARRAY_BINDING'),depth:is('DEPTH_TEST'),blend:is('BLEND'),cull:is('CULL_FACE'),mask:get('DEPTH_WRITEMASK'),func:get('DEPTH_FUNC'),sr:get('BLEND_SRC_RGB'),dr:get('BLEND_DST_RGB'),sa:get('BLEND_SRC_ALPHA'),da:get('BLEND_DST_ALPHA')};
g.useProgram(a.p);g.bindVertexArray(vao);g.uniformMatrix4fv(a.u[0],false,d.mainMatrix);g.uniformMatrix4fv(a.u[1],false,d.fallbackMatrix);g.uniform4fv(a.u[2],d.tileMercatorCoords);g.uniform4fv(a.u[3],d.clippingPlane);g.uniform1f(a.u[4],d.projectionTransition);g.uniform1f(a.u[5],now);g.uniform1f(a.u[6],matchMedia('(prefers-reduced-motion: reduce)').matches?1:0);
g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.disable(g.CULL_FACE);g.enable(g.BLEND);g.blendFuncSeparate(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA,g.ONE,g.ONE_MINUS_SRC_ALPHA);
const bind=b=>{g.bindBuffer(g.ARRAY_BUFFER,b);for(let i=0;i<3;i++){const loc=a.attrs[i];if(loc<0)continue;g.enableVertexAttribArray(loc);g.vertexAttribPointer(loc,[3,4,2][i],g.FLOAT,false,36,[0,12,28][i])}};
bind(buffers[0]);if(dirty){g.bufferData(g.ARRAY_BUFFER,cloudVertices,g.STATIC_DRAW);cloudCount=cloudVertices.length/9;dirty=false}g.depthMask(true);g.drawArrays(g.TRIANGLES,0,cloudCount);
const dynamic=effects(now);bind(buffers[1]);g.bufferData(g.ARRAY_BUFFER,dynamic,g.DYNAMIC_DRAW);g.depthMask(false);g.drawArrays(g.LINES,0,dynamic.length/9);diagnostics.draws++;diagnostics.shaderReady=true;diagnostics.projection='MapLibre projectTileFor3D';error=null;
}catch(e){error=String(e?.message||e)}finally{if(saved){g.bindVertexArray(saved.vao);g.bindBuffer(g.ARRAY_BUFFER,saved.a);g.useProgram(saved.p);for(const [n,v] of [['DEPTH_TEST',saved.depth],['BLEND',saved.blend],['CULL_FACE',saved.cull]])v?g.enable(g[n]):g.disable(g[n]);g.depthMask(saved.mask);g.depthFunc(saved.func);g.blendFuncSeparate(saved.sr,saved.dr,saved.sa,saved.da)}}},onRemove(){if(gl){for(const b of buffers)gl.deleteBuffer(b);for(const p of programs.values())gl.deleteProgram(p.p);if(vao)gl.deleteVertexArray(vao)}programs.clear()}}}
function syncButton(){if(!button)return;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));button.title=on?'Rain ON · '+(sourceStatus==='unavailable'?'source unavailable':cells.length+' observed rain regions')+' · estimated coverage and simulated effects':'Show live rain regions, 3D storm clouds, rain and lightning';}
function animate(t){raf=0;if(!on||document.hidden)return;if(map&&near.length&&t-lastFrame>(map.isMoving?.()?100:mobile?66:45)){lastFrame=t;map.triggerRepaint()}raf=requestAnimationFrame(animate)}
function schedule(){clearTimeout(rebuildTimer);rebuildTimer=setTimeout(()=>{if(on){ensure();choose()}},180)}
const getScene=()=>window.__bpWeatherV2300?.getScene?.()||window.__BP_SHARED_VISUAL_WEATHER__?.weather?.getScene?.()||{};
async function refresh(force=false){if(!on||fetching)return;const generation=epoch;fetching=true;try{const scene=getScene(),live=Array.isArray(scene.observations)?scene.observations:[];let input=live.slice();let snapshot=null;
if(force||Date.now()-lastSource>300000){lastSource=Date.now();try{const response=await fetch('/bp-rain-observations-v1.json',{cache:'no-cache',signal:AbortSignal.timeout(6000)});if(response.ok){const j=await response.json();if(Date.now()-Date.parse(j.generated_at)<90*60000)snapshot=j}}catch(_){}if(snapshot)rows=snapshot.observations||[]}
if(!on||epoch!==generation)return;input.push(...rows);cells=normalize(input);sourceTime=scene.generated_at||snapshot?.generated_at||null;sourceStatus=input.length?'ready':'unavailable';ensure();choose();syncButton();
}catch(e){error=String(e?.message||e);sourceStatus='unavailable';syncButton()}finally{fetching=false}}
function unbind(){if(!map)return;popup?.remove();popup=null;map.off('click',openRainMarker);for(const e of ['moveend','zoomend','style.load'])map.off(e,schedule);for(const id of [ICON,MARK,FX,PUDDLE,EDGE,FILL])try{if(map.getLayer(id))map.removeLayer(id)}catch(_){}try{if(map.getSource(SOURCE))map.removeSource(SOURCE)}catch(_){}}
function bind(){const m=mapNow();if(!m)return false;if(m!==map){unbind();map=m;for(const e of ['moveend','zoomend','style.load'])map.on(e,schedule);map.on('click',openRainMarker)}return true}
function setEnabled(v){on=!!v;epoch++;syncButton();clearInterval(refreshTimer);clearTimeout(rebuildTimer);if(!on){cancelAnimationFrame(raf);raf=0;unbind();map=null;near=[];pools=[];drops=[];cloudVertices=new Float32Array();return false}
if(bind()){ensure();void refresh(true)}refreshTimer=setInterval(()=>{if(!on||document.hidden)return;if(bind()){ensure();void refresh(false)}},15000);if(!raf)raf=requestAnimationFrame(animate);return true}
function mount(){const dock=document.querySelector('#bpv-dock');if(!dock)return;if(button?.isConnected)return;const grid=dock.querySelector('[data-bpv-command-grid="environment"]')||dock.querySelector('#bpv-dock-actions');if(!grid)return;button=document.createElement('button');button.type='button';button.className='bpv-command-btn';button.dataset.bpvAction='rain';button.dataset.bpvBound='1';button.innerHTML='<span class="bpv-command-icon" style="color:#8ed6ff" aria-hidden="true">🌧</span><span class="bpv-command-label">Rain</span>';button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setEnabled(!on)});grid.append(button);syncButton()}
window.addEventListener('bp2300:weather-updated',()=>{if(on)void refresh(false)});document.addEventListener('visibilitychange',()=>{if(on&&!document.hidden){if(!raf)raf=requestAnimationFrame(animate);void refresh(false)}});
window.__BP_RAIN_BUTTON_V1__={setEnabled,get state(){return{enabled:on,sourceStatus,sourceTime,cells:cells.length,visibleCells:near.length,puddles:pools.length,markerCount:on?cells.length:0,markerLayerReady:!!map?.getLayer(ICON),error,...diagnostics}},normalize};
mount();const observer=new MutationObserver(mount);observer.observe(document.body||document.documentElement,{childList:true,subtree:true});
})();
