const VERSION=5927, ROOT_ID='bp-realworld-effects-v5927', STYLE_ID='bp-realworld-effects-style-v5927';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),wrap=d=>((d+180)%360+360)%360-180;
function addStyle(){
 if(document.getElementById(STYLE_ID))return;
 const css=[
 '#bp-realworld-effects-v5927{position:absolute;z-index:1400;left:12px;top:max(72px,calc(env(safe-area-inset-top) + 58px));width:min(410px,calc(100% - 24px));max-height:calc(100dvh - 96px);overflow:auto;box-sizing:border-box;padding:12px;border:1px solid rgba(105,231,255,.45);border-radius:16px;background:linear-gradient(150deg,rgba(3,15,24,.97),rgba(5,33,46,.95));color:#eaf9ff;font:12px/1.4 system-ui,sans-serif;box-shadow:0 24px 70px rgba(0,0,0,.52);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}',
 '#bp-realworld-effects-v5927 *{box-sizing:border-box;min-width:0}',
 '#bp-realworld-effects-v5927 [data-head]{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}',
 '#bp-realworld-effects-v5927 [data-head] strong{display:block;font-size:12px;letter-spacing:.08em;font-weight:950}',
 '#bp-realworld-effects-v5927 [data-head] small{display:block;margin-top:3px;color:#8fb6c5;font-size:10px;line-height:1.35}',
 '#bp-realworld-effects-v5927 button{max-width:100%;border:1px solid rgba(120,221,245,.25);border-radius:9px;background:rgba(13,47,61,.86);color:#e7fbff;padding:8px 9px;min-height:35px;font:800 10px/1.2 system-ui,sans-serif;cursor:pointer;overflow-wrap:anywhere}',
 '#bp-realworld-effects-v5927 button[aria-pressed=true]{border-color:rgba(100,243,199,.68);background:linear-gradient(125deg,rgba(18,106,88,.88),rgba(15,69,82,.9));color:#c7ffeb}',
 '#bp-realworld-effects-v5927 [data-close]{flex:0 0 34px;min-height:34px;padding:4px;font-size:16px}',
 '#bp-realworld-effects-v5927 [data-grid]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:10px}',
 '#bp-realworld-effects-v5927 [data-status]{margin-top:9px;padding:8px;border-radius:9px;background:rgba(255,255,255,.035);font-size:10px;line-height:1.45;color:#9bd8e8;overflow-wrap:anywhere}',
 '#bp-realworld-effects-v5927 [data-note]{margin:8px 1px 0;color:#8eabb8;font-size:9px;line-height:1.45;overflow-wrap:anywhere}',
 '.bp-rwe-wind-canvas,.bp-rwe-sun-canvas{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:8}.bp-rwe-sun-canvas{z-index:7}',
 '@media(max-width:700px){#bp-realworld-effects-v5927{left:6px;right:6px;top:max(70px,calc(env(safe-area-inset-top) + 56px));width:auto;max-height:calc(100dvh - 82px);padding:9px;border-radius:13px}#bp-realworld-effects-v5927 [data-grid]{gap:5px}#bp-realworld-effects-v5927 button{padding:7px 6px;font-size:9px}#bp-realworld-effects-v5927 [data-head] strong{font-size:10px}}'
 ].join('\n');
 const s=document.createElement('style');s.id=STYLE_ID;s.textContent=css;document.head.appendChild(s);
}
function solarPosition(date,lat,lon){
 const rad=Math.PI/180,yearStart=Date.UTC(date.getUTCFullYear(),0,0),day=Math.floor((date.getTime()-yearStart)/86400000);
 const hour=date.getUTCHours()+date.getUTCMinutes()/60+date.getUTCSeconds()/3600;
 const gamma=2*Math.PI/365*(day-1+(hour-12)/24);
 const eq=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
 const decl=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
 const minutes=((hour*60+eq+4*lon)%1440+1440)%1440,ha=(minutes/4-180)*rad,phi=lat*rad;
 const elevation=Math.asin(Math.sin(phi)*Math.sin(decl)+Math.cos(phi)*Math.cos(decl)*Math.cos(ha))/rad;
 const azimuth=(Math.atan2(Math.sin(ha),Math.cos(ha)*Math.sin(phi)-Math.tan(decl)*Math.cos(phi))/rad+180+360)%360;
 return {elevation,azimuth};
}
function getWind(scene,map){
 const c=map.getCenter();let best=null,dist=Infinity;
 for(const o of scene?.observations||[]){
  const speed=Number(o.wind_speed_mph??(Number.isFinite(+o.wind_speed_kt)?+o.wind_speed_kt*1.15078:NaN));
  const direction=Number(o.wind_dir_deg??o.wind_direction_deg??o.wind_direction);
  if(!Number.isFinite(speed)||speed<1||!Number.isFinite(direction)||!Number.isFinite(+o.lng)||!Number.isFinite(+o.lat))continue;
  const d=(+o.lng-c.lng)**2*Math.max(.1,Math.cos(c.lat*Math.PI/180))+(+o.lat-c.lat)**2;
  if(d<dist){dist=d;best={speed,direction,lng:+o.lng,lat:+o.lat}}
 }
 return best;
}
function setVis(map,id,on){try{if(map.getLayer(id))map.setLayoutProperty(id,'visibility',on?'visible':'none')}catch(_){}}
export function initBridgePointRealWorldEffects(target,rpc){
 const map=target?.map||target,container=map?.getContainer?.();if(!map||!container)return null;
 if(window.__BP_REALWORLD_EFFECTS_V5927__?.map===map){window.__BP_REALWORLD_EFFECTS_V5927__.open();return window.__BP_REALWORLD_EFFECTS_V5927__}
 addStyle();if(getComputedStyle(container).position==='static')container.style.position='relative';
 const root=document.createElement('section');root.id=ROOT_ID;root.hidden=true;root.setAttribute('aria-label','BridgePoint real-world effects');
 root.innerHTML='<div data-head><div><strong>BRIDGEPOINT · REAL-WORLD EFFECTS</strong><small>Source weather, atmosphere, wind and visible event geometry. Turn on only what you need.</small></div><button data-close type="button" aria-label="Close effects">×</button></div>'+
 '<div data-grid><button data-source aria-pressed="false">SOURCE WEATHER · OFF</button><button data-particles aria-pressed="false">3D RAIN / SNOW / HAIL · OFF</button><button data-flood aria-pressed="false">FLOOD ALERT SURFACES · OFF</button><button data-radar aria-pressed="false">NOAA RADAR · OFF</button><button data-wind aria-pressed="false">3D WIND STREAMLINES · OFF</button><button data-clouds aria-pressed="true">SKY CLOUD LAYERS · ON</button><button data-sun aria-pressed="false">SUN / SHADOW LIGHTING · OFF</button><button data-realism aria-pressed="false">SATELLITE / MATERIAL REALISM · OFF</button></div>'+
 '<div data-status>Ready. Source-backed features appear where feeds cover the current view.</div><p data-note>Radar, alerts and station observations are source-linked. Wind streamlines and canopy movement are schematic visualizations based on the nearest measured wind and rendered building footprints, not engineering CFD. Cloud layers are animated visual layers, not volumetric 3D clouds. Flood outlines are official alert geometry, not surveyed water depth.</p>';
 container.appendChild(root);
 const $=sel=>root.querySelector(sel);
 const st={map,container,root,weather:null,clouds:window.__BP_SKY_CLOUDS_V5908__||null,realism:window.__BP_WORLD_REALISM_V5910__||null,source:false,particles:false,flood:false,radar:false,wind:false,cloudsOn:true,sun:false,realismOn:false,windCanvas:null,sunCanvas:null,raf:0,windMove:null,windResize:null,sunMove:null,lightOriginal:null,treeOriginal:undefined,obstacles:[],obstaclesAt:0,disposed:false,rpc};
 const setStatus=s=>{const n=$('[data-status]');if(n)n.textContent=s};
 const paint=()=>{const vals=[['[data-source]','SOURCE WEATHER',st.source],['[data-particles]','3D RAIN / SNOW / HAIL',st.particles],['[data-flood]','FLOOD ALERT SURFACES',st.flood],['[data-radar]','NOAA RADAR',st.radar],['[data-wind]','3D WIND STREAMLINES',st.wind],['[data-clouds]','SKY CLOUD LAYERS',st.cloudsOn],['[data-sun]','SUN / SHADOW LIGHTING',st.sun],['[data-realism]','SATELLITE / MATERIAL REALISM',st.realismOn]];for(const [s,t,on] of vals){const b=$(s);if(b){b.textContent=t+' · '+(on?'ON':'OFF');b.setAttribute('aria-pressed',String(on))}}};
 async function ensureWeather(){if(st.weather)return st.weather;const m=await import('./world-v2300-weather.js?v=5927-source-weather');st.weather=window.__bpWeatherV2300||m.initWeather({map},{deferActivation:true});if(!st.weather)throw new Error('Source weather engine unavailable');return st.weather}
 async function ensureClouds(){if(st.clouds)return st.clouds;const m=await import('./world-v2300-clouds.js?v=5927-clouds');st.clouds=window.__BP_SKY_CLOUDS_V5908__||m.initSkyClouds({map});return st.clouds}
 async function ensureRealism(){if(st.realism)return st.realism;const m=await import('./world-v2300-realism.js?v=5927-material-realism');st.realism=window.__BP_WORLD_REALISM_V5910__||m.initRealismMode({map});return st.realism}
 function sunCanvas(){if(!st.sunCanvas){st.sunCanvas=document.createElement('canvas');st.sunCanvas.className='bp-rwe-sun-canvas';st.sunCanvas.setAttribute('aria-hidden','true');container.appendChild(st.sunCanvas)}return st.sunCanvas}
 function drawSun(){
  if(!st.sun||!st.sunCanvas)return;const c=st.sunCanvas,w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight),dpr=Math.min(window.devicePixelRatio||1,1.5);
  if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
  const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  const pos=map.getCenter(),sun=solarPosition(new Date(),pos.lat,pos.lng),pitch=Number(map.getPitch()||0);
  if(sun.elevation<=0||pitch<18){setStatus(sun.elevation<=0?'Sun is below the local horizon at map center.':'Tilt the globe up to show the Sun sky cue.');return}
  const delta=wrap(sun.azimuth-Number(map.getBearing()||0))*Math.PI/180,x=w/2+delta*(w/1.08),y=h/2-(sun.elevation+90-pitch)*Math.PI/180*(h/1.15);
  if(x<-55||x>w+55||y<-55||y>h*.52){setStatus('Solar position is computed for map center, but the disk is outside the visible sky window. Rotate/tilt the globe.');return}
  const r=12,g=ctx.createRadialGradient(x,y,r*.3,x,y,r*4.2);g.addColorStop(0,'rgba(255,245,183,.72)');g.addColorStop(.2,'rgba(255,219,117,.25)');g.addColorStop(1,'rgba(255,205,98,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*4.2,0,Math.PI*2);ctx.fill();
  const disk=ctx.createRadialGradient(x-r*.3,y-r*.35,1,x,y,r);disk.addColorStop(0,'#fffef0');disk.addColorStop(.55,'#ffe8a1');disk.addColorStop(1,'#ffbb52');ctx.fillStyle=disk;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
  setStatus('Solar-position overlay · elevation '+Math.round(sun.elevation)+'° · azimuth '+Math.round(sun.azimuth)+'°. Displayed disk is a sky cue; map lighting uses this solar estimate.');
 }
 async function setSun(on){
  st.sun=!!on;
  if(st.sun){
   sunCanvas();try{if(st.lightOriginal===null)st.lightOriginal=map.getLight?.()||null}catch(_){st.lightOriginal=null}
   const updateLight=()=>{const p=map.getCenter(),sun=solarPosition(new Date(),p.lat,p.lng),alt=sun.elevation,color=alt<5?'#f0a36a':alt<18?'#f1caa0':'#e5f4ff',intensity=alt<0?.12:alt<8?.35:alt<25?.55:.78;try{map.setLight({anchor:'map',color,intensity,position:[1.2,sun.azimuth,90-clamp(alt,-10,89)]})}catch(_){}drawSun()};
   st.sunMove=st.sunMove||updateLight;map.on('moveend',st.sunMove);map.on('rotate',st.sunMove);map.on('pitch',st.sunMove);updateLight();
  }else{
   if(st.sunCanvas){st.sunCanvas.remove();st.sunCanvas=null}
   if(st.sunMove){map.off('moveend',st.sunMove);map.off('rotate',st.sunMove);map.off('pitch',st.sunMove);st.sunMove=null}
   if(st.lightOriginal){try{map.setLight(st.lightOriginal)}catch(_){}}
   st.lightOriginal=null;
  }
  paint();
 }
 function obstacleList(){
  if(Date.now()-st.obstaclesAt<900)return st.obstacles;st.obstaclesAt=Date.now();st.obstacles=[];
  const w=container.clientWidth||1,h=container.clientHeight||1;if(map.getZoom()<10)return st.obstacles;
  const layers=(map.getStyle()?.layers||[]).filter(l=>l.type==='fill-extrusion'&&/building|structure|city/i.test(l.id)).map(l=>l.id).filter(id=>map.getLayer(id)).slice(0,12);if(!layers.length)return st.obstacles;
  let fs=[];try{fs=map.queryRenderedFeatures({layers})||[]}catch(_){}
  const seen=new Set();for(const f of fs){if(st.obstacles.length>=300)break;const key=String(f.id??f.properties?.building_id??'')+'|'+String(f.sourceLayer||'');if(seen.has(key))continue;seen.add(key);
   const pts=[],walk=v=>{if(!Array.isArray(v))return;if(v.length>=2&&typeof v[0]==='number'&&typeof v[1]==='number'){pts.push([v[0],v[1]]);return}for(const n of v)walk(n)};walk(f.geometry?.coordinates);if(!pts.length)continue;
   let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;for(const ll of pts){let p;try{p=map.project(ll)}catch(_){continue}x0=Math.min(x0,p.x);x1=Math.max(x1,p.x);y0=Math.min(y0,p.y);y1=Math.max(y1,p.y)}
   const bw=x1-x0,bh=y1-y0;if(!Number.isFinite(bw)||!Number.isFinite(bh)||bw<2||bh<3||bw>220||bh>300||x1<0||x0>w||y1<0||y0>h)continue;
   st.obstacles.push({x:(x0+x1)/2,y:(y0+y1)/2,rx:Math.max(7,bw*.5+8),ry:Math.max(7,bh*.5+8)});
  }return st.obstacles;
 }
 function stopWind(){
  if(st.windCanvas){st.windCanvas.remove();st.windCanvas=null}
  st.obstacles=[];st.obstaclesAt=0;
  try{if(st.treeOriginal!==undefined&&map.getLayer('gta-bp-tree3d-canopy'))map.setPaintProperty('gta-bp-tree3d-canopy','fill-extrusion-translate',st.treeOriginal)}catch(_){}
  st.treeOriginal=undefined;
 }
 function drawWind(now){
  if(st.disposed||!st.wind||document.hidden||!st.windCanvas)return;
  const scene=st.weather?.getScene?.()||{},o=getWind(scene,map),c=st.windCanvas,w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight),dpr=Math.min(window.devicePixelRatio||1,1.5);
  if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}
  const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
  if(!o){setStatus('Waiting for a mapped weather observation containing measured wind speed and direction. No wind field is fabricated.');st.raf=requestAnimationFrame(drawWind);return}
  const obs=obstacleList(),angle=(o.direction+180-(map.getBearing?.()||0))*Math.PI/180,ux=Math.sin(angle),uy=-Math.cos(angle),px=-uy,py=ux;
  const span=Math.hypot(w,h)+80,spacing=w<500?25:31,count=clamp(Math.floor((Math.abs(ux)>Math.abs(uy)?h:w)/spacing),12,82),phase=(now*.028)%24;ctx.lineWidth=1.25;ctx.lineCap='round';ctx.lineJoin='round';
  for(let n=0;n<count;n++){const lateral=(n-(count-1)/2)*spacing,midX=w/2+px*lateral,midY=h/2+py*lateral;let x,y;if(Math.abs(ux)>Math.abs(uy)){x=ux>0?-34:w+34;y=clamp(midY,-15,h+15)}else{y=uy>0?-34:h+34;x=clamp(midX,-15,w+15)}
   ctx.beginPath();ctx.moveTo(x,y);let arrow=null;for(let j=0;j<Math.min(220,Math.ceil(span/7));j++){let vx=ux,vy=uy;for(const b of obs){const dx=x-b.x,dy=y-b.y,ell=(dx*dx)/(b.rx*b.rx)+(dy*dy)/(b.ry*b.ry);if(ell<3){const d=Math.max(3,Math.hypot(dx,dy)),force=Math.min(2.25,(3-ell)*.62);vx+=dx/d*force;vy+=dy/d*force}}const nrm=Math.max(.01,Math.hypot(vx,vy));vx/=nrm;vy/=nrm;x+=vx*7;y+=vy*7;ctx.lineTo(x,y);if(j%30===Math.floor(phase/3))arrow={x,y,vx,vy};if(x<-42||x>w+42||y<-42||y>h+42)break}
   ctx.strokeStyle='rgba(92,223,255,'+(.27+((n*3+phase)%24)/24*.26)+')';ctx.stroke();if(arrow){ctx.beginPath();ctx.moveTo(arrow.x,arrow.y);ctx.lineTo(arrow.x-arrow.vx*7-arrow.vy*4,arrow.y-arrow.vy*7+arrow.vx*4);ctx.lineTo(arrow.x-arrow.vx*7+arrow.vy*4,arrow.y-arrow.vy*7-arrow.vx*4);ctx.closePath();ctx.fillStyle='rgba(205,250,255,.8)';ctx.fill()}
  }
  try{const id='gta-bp-tree3d-canopy';if(map.getLayer(id)){if(st.treeOriginal===undefined)st.treeOriginal=map.getPaintProperty(id,'fill-extrusion-translate')||[0,0];map.setPaintProperty(id,'fill-extrusion-translate',[Math.sin(now*.0024)*Math.min(5,o.speed*.12),Math.cos(now*.0018)*Math.min(2,o.speed*.035)])}}catch(_){}
  const note=$('[data-note]');if(note)note.textContent='Nearest measured wind: '+Math.round(o.speed)+' mph at '+Math.round(o.direction)+'°. Lines bend around visible building footprints; schematic map overlay, not CFD.';
  st.raf=requestAnimationFrame(drawWind);
 }
 async function setSource(on){
  const wx=await ensureWeather();st.source=!!on;wx.setActive(st.source);wx.fx?.setEnabled?.(st.particles);
  setStatus(st.source?'Source weather enabled; available alerts, storms, fires, observations and water-level points will refresh with the view.':'Source weather overlays are off; physical map layers stay intact.');paint();
 }
 async function setParticles(on){
  const wx=await ensureWeather();st.particles=!!on;
  if(on&&!st.source){st.source=true;wx.setActive(true)}
  wx.fx?.setEnabled?.(st.particles);paint();setStatus(on?'Animated rain/snow/hail and supported storm/funnel/fire effects on where the current source scene supports them.':'Animated particle effects off. Source polygons can stay on.');
 }
 async function setFlood(on){
  const wx=await ensureWeather();st.flood=!!on;if(on&&!st.source){st.source=true;wx.setActive(true)}if(on)wx.fx?.setEnabled?.(st.particles);
  for(const id of ['bp2300-fx-flood-fill','bp2300-fx-flood-line'])setVis(map,id,st.flood);
  if(on){for(const id of ['bp2300-fx-ice-fill','bp2300-fx-ice-line','bp2300-fx-burn','bp2300-fx-containment','bp2300-fx-tornado','bp2300-fx-hurricane','wx-fire-fill','wx-fire-line','wx-thermal','wx-quake-glow','wx-quake','wx-storm-glow','wx-storm','wx-obs','wx-water'])setVis(map,id,false)}
  else for(const id of ['bp2300-fx-ice-fill','bp2300-fx-ice-line','bp2300-fx-burn','bp2300-fx-containment','bp2300-fx-tornado','bp2300-fx-hurricane','wx-fire-fill','wx-fire-line','wx-thermal','wx-quake-glow','wx-quake','wx-storm-glow','wx-storm','wx-obs','wx-water'])setVis(map,id,true);
  paint();setStatus(st.flood?'Flood-alert polygon overlay on. Source outlines show alert geometry, not exact measured flood depths.':'Flood-only surface filter off.');
 }
 async function setRadar(on){const wx=await ensureWeather();st.radar=!!on;wx.setRadar(st.radar);paint();setStatus(st.radar?'NOAA radar enabled where provider coverage exists.':'NOAA radar disabled.')}
 async function setWind(on){
  st.wind=!!on;
  if(on){const wx=await ensureWeather();if(!st.source){st.source=true;wx.setActive(true)}wx.fx?.setEnabled?.(st.particles);if(!st.windCanvas){st.windCanvas=document.createElement('canvas');st.windCanvas.className='bp-rwe-wind-canvas';st.windCanvas.setAttribute('aria-hidden','true');container.appendChild(st.windCanvas)}st.raf=requestAnimationFrame(drawWind);st.windMove=st.windMove||(()=>{st.obstaclesAt=0});st.resize=st.resize||(()=>{st.obstaclesAt=0});map.on('moveend',st.windMove);map.on('resize',st.resize)}
  else{if(st.raf)cancelAnimationFrame(st.raf);st.raf=0;stopWind();if(st.windMove)map.off('moveend',st.windMove);if(st.resize)map.off('resize',st.resize);st.windMove=null;st.resize=null}
  paint();if(!on)setStatus('Wind visualization off; tree-canopy translation restored.');
 }
 async function setClouds(on){const cloud=await ensureClouds();st.cloudsOn=!!on;cloud.setEnabled(st.cloudsOn);paint()}
 async function setRealism(on){const real=await ensureRealism();st.realismOn=!!on;real.setEnabled(st.realismOn);paint()}
 async function setSun(on){
  st.sun=!!on;if(on){if(!st.sunCanvas){st.sunCanvas=document.createElement('canvas');st.sunCanvas.className='bp-rwe-sun-canvas';st.sunCanvas.setAttribute('aria-hidden','true');container.appendChild(st.sunCanvas)}try{if(st.lightOriginal===null)st.lightOriginal=map.getLight?.()||null}catch(_){st.lightOriginal=null}
   const update=()=>{const p=map.getCenter(),s=solarPosition(new Date(),p.lat,p.lng),alt=s.elevation,color=alt<5?'#f0a36a':alt<18?'#f1caa0':'#e5f4ff',intensity=alt<0?.12:alt<8?.35:alt<25?.55:.78;try{map.setLight({anchor:'map',color,intensity,position:[1.2,s.azimuth,90-clamp(alt,-10,89)]})}catch(_){}drawSunDisk(s)};
   const drawSunDisk=s=>{const c=st.sunCanvas,w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight),dpr=Math.min(window.devicePixelRatio||1,1.5);if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr)}const ctx=c.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);if(s.elevation<=0||map.getPitch()<18){setStatus(s.elevation<=0?'Sun is below the local horizon at map center.':'Tilt the globe up to reveal the Sun sky cue.');return}const d=wrap(s.azimuth-map.getBearing())*Math.PI/180,x=w/2+d*(w/1.08),y=h/2-(s.elevation+90-map.getPitch())*Math.PI/180*(h/1.15);if(x<-55||x>w+55||y<-55||y>h*.52){setStatus('Solar direction calculated; rotate/tilt the globe to bring the sun cue into view.');return}const r=12,g=ctx.createRadialGradient(x,y,r*.3,x,y,r*4.2);g.addColorStop(0,'rgba(255,245,183,.72)');g.addColorStop(.2,'rgba(255,219,117,.25)');g.addColorStop(1,'rgba(255,205,98,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r*4.2,0,Math.PI*2);ctx.fill();ctx.fillStyle='#ffe8a1';ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();setStatus('Solar-position cue · elevation '+Math.round(s.elevation)+'° · azimuth '+Math.round(s.azimuth)+'°. Lighting uses this solar estimate; the disk is a screen-space cue.')};
   st.sunMove=st.sunMove||update;map.on('moveend',st.sunMove);map.on('rotate',st.sunMove);map.on('pitch',st.sunMove);update();
  }else{if(st.sunCanvas){st.sunCanvas.remove();st.sunCanvas=null}if(st.sunMove){map.off('moveend',st.sunMove);map.off('rotate',st.sunMove);map.off('pitch',st.sunMove);st.sunMove=null}if(st.lightOriginal){try{map.setLight(st.lightOriginal)}catch(_){}}st.lightOriginal=null}
  paint();
 }
 async function open(options={}){root.hidden=false;paint();if(options.initialWind&&!st.wind)await setWind(true);return api}
 function close(){root.hidden=true;return api}
 $('[data-close]').onclick=close;
 $('[data-source]').onclick=()=>void setSource(!st.source).catch(e=>setStatus(String(e?.message||e)));
 $('[data-particles]').onclick=()=>void setParticles(!st.particles).catch(e=>setStatus(String(e?.message||e)));
 $('[data-flood]').onclick=()=>void setFlood(!st.flood).catch(e=>setStatus(String(e?.message||e)));
 $('[data-radar]').onclick=()=>void setRadar(!st.radar).catch(e=>setStatus(String(e?.message||e)));
 $('[data-wind]').onclick=()=>void setWind(!st.wind).catch(e=>setStatus(String(e?.message||e)));
 $('[data-clouds]').onclick=()=>void setClouds(!st.cloudsOn).catch(e=>setStatus(String(e?.message||e)));
 $('[data-sun]').onclick=()=>void setSun(!st.sun).catch(e=>setStatus(String(e?.message||e)));
 $('[data-realism]').onclick=()=>void setRealism(!st.realismOn).catch(e=>setStatus(String(e?.message||e)));
 const api={version:VERSION,map,root,open,close,state:st,get current(){return{sourceWeather:st.source,particles:st.particles,flood:st.flood,radar:st.radar,wind:st.wind,clouds:st.cloudsOn,sun:st.sun,realism:st.realismOn}},destroy(){st.disposed=true;if(st.raf)cancelAnimationFrame(st.raf);st.windCanvas?.remove();st.sunCanvas?.remove();if(st.lightOriginal)try{map.setLight(st.lightOriginal)}catch(_){}try{if(st.treeOriginal!==undefined&&map.getLayer('gta-bp-tree3d-canopy'))map.setPaintProperty('gta-bp-tree3d-canopy','fill-extrusion-translate',st.treeOriginal)}catch(_){};st.root.remove()}};
 window.__BP_REALWORLD_EFFECTS_V5927__=api;paint();return api;
}
export function openBridgePointRealWorldEffects(target,rpc,options={}){const api=initBridgePointRealWorldEffects(target,rpc);return api?.open(options)||null}
