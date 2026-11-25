/* BridgePoint Rain V3: stable multi-scale cloud puffs, visible precipitation and wet ground. */
(()=>{
'use strict';
if(window.__BP_RAIN_BUTTON_V1__)return;
const D=Math.PI/180,C=40075016.68557849,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),frac=x=>x-Math.floor(x),hash=(a,b=0)=>frac(Math.sin(a*127.1+b*311.7)*43758.5453);
const mobile=matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad/i.test(navigator.userAgent);
const SOURCE='bp-rn-v1-source',FILL='bp-rn-v1-area',EDGE='bp-rn-v1-edge',PUDDLE='bp-rn-v1-pool',FX='bp-rn-v1-3d',MARK='bp-rn-v1-marker',ICON='bp-rn-v1-icon',RAIN_IMG='bp-rn-v1-rain-image',STORM_IMG='bp-rn-v1-storm-image';
const fc=features=>({type:'FeatureCollection',features});
const mapNow=()=>window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD__?.map||window.__bpLandingWorldV5420?.map||window.__bpWorldV2300?.map||window.__BP_WORLD_V2300__?.map;
let map=null,on=false,rows=[],cells=[],near=[],pools=[],drops=[],cloudVertices=new Float32Array(),dirty=true,raf=0,lastFrame=0,lastSource=0,refreshTimer=0,fetching=false,sourceStatus='idle',sourceTime=null,epoch=0,rebuildTimer=0,button=null,error=null,lastPoolBuild=0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let overlay=null,overlayCtx=null,overlaySize='',lastOverlay=0,cloudCache=new Map(),currentView=null;
const budgets={cloudCells:mobile?5:9,cloudPuffs:mobile?180:380,drops:mobile?520:1100,puddles:mobile?48:100};
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
function distance(a,b){const dx=((a.lon-b.lon+540)%360)-180;return Math.hypot(dx*111320*Math.max(.12,Math.cos((a.lat+b.lat)*D*.5)),(a.lat-b.lat)*111320)}
function terrain(lon,lat){try{const h=map.queryTerrainElevation([lon,lat],{exaggerated:false});return Number.isFinite(h)?h:0}catch(_){return 0}}
function ring(lon,lat,rx,ry,seed=0,n=32){const out=[];for(let i=0;i<n;i++){const a=i/n*Math.PI*2,w=.92+.16*hash(seed,i);out.push(geo(lon,lat,Math.cos(a)*rx*w,Math.sin(a)*ry*w))}out.push(out[0]);return out}
function inCell(c,p){const dlon=((p.lon-c.lon+540)%360)-180,dx=dlon*111320*Math.max(.12,Math.cos(c.lat*D)),dy=(p.lat-c.lat)*111320;return Math.hypot(dx/c.radius,dy/(c.radius*.82))<.90}
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
if(!map.getLayer(PUDDLE))map.addLayer({id:PUDDLE,type:'fill',source:SOURCE,minzoom:13,filter:['==',['get','kind'],'pool'],paint:{'fill-color':'#315d82','fill-opacity':.74,'fill-outline-color':'#a4d9ef'}},before);
if(!map.getLayer(FX))map.addLayer(makeLayer());
ensureIcons();
}catch(e){error=String(e?.message||e)}}
function updateSource(){if(!on||!map)return;const features=cells.map(shape).filter(Boolean);for(const c of cells)features.push({type:'Feature',geometry:{type:'Point',coordinates:[c.lon,c.lat]},properties:{kind:'marker',thunderstorm:c.ts,source:c.source,radius_m:c.radius,observed_at:c.observedAt||''}});for(const p of pools)features.push({type:'Feature',geometry:{type:'Polygon',coordinates:[ring(p.lon,p.lat,p.r,p.r*.64,p.seed,14)]},properties:{kind:'pool',modelled:true}});map.getSource(SOURCE)?.setData(fc(features));}
function choose(){if(!on||!map)return;const z=map.getZoom(),c=map.getCenter(),view={lon:c.lng,lat:c.lat},canvas=map.getCanvas(),width=canvas.clientWidth||400,height=canvas.clientHeight||800;
const visible=cells.filter(a=>{if(inCell(a,view))return true;if(z<3.5&&Math.sin(c.lat*D)*Math.sin(a.lat*D)+Math.cos(c.lat*D)*Math.cos(a.lat*D)*Math.cos((a.lon-c.lng)*D)<-.05)return false;try{const p=map.project([a.lon,a.lat]),mpp=156543*Math.max(.12,Math.cos(a.lat*D))/2**z,margin=Math.max(120,a.radius/Math.max(.1,mpp)*1.7);return p.x>=-margin&&p.x<=width+margin&&p.y>=-margin&&p.y<=height+margin}catch(_){return false}});
visible.sort((a,b)=>Number(inCell(b,view))-Number(inCell(a,view))||distance(a,view)-distance(b,view));
near=visible.slice(0,z<4?(mobile?26:48):z<10?(mobile?12:24):budgets.cloudCells);
const mpp=156543*Math.max(.12,Math.cos(c.lat*D))/2**z;
const viewRadius=Math.max(12,mpp*Math.hypot(width,height)*.85);
currentView={z,lon:c.lng,lat:c.lat,mpp,width,height};
pools=[];drops=[];let cv=[],puffCount=0;
const add=(arr,p,col,flash=0,seed=0)=>arr.push(...p,...col,flash,seed);
function puff(a,lon,lat,rx,ry,rz,alt,seed,segments,bands){
 if(puffCount>=budgets.cloudPuffs)return;puffCount++;
 const th=a.ts?1:0;
 const point=(i,k)=>{const t=i/bands*Math.PI,b=k/segments*Math.PI*2,st=Math.sin(t),ct=Math.cos(t),cb=Math.cos(b),sb=Math.sin(b);
 const n=1+.12*Math.sin(b*3+seed)*st+.075*Math.cos(t*5+b*2+seed)*st;
 const pt=geo(lon,lat,st*cb*rx*n,st*sb*ry*n);
 const h=alt+rz*ct*n;
 // Rounded storm puffs: bright sunlit shoulders, diffuse edges and dark undersides.
 const light=Math.max(0,.64*ct+.52*st*cb-.35*st*sb),ambient=.20+.11*(ct+1)*.5;
 const shade=clamp(ambient+.42*light+.045*Math.sin(b*4+t*3+seed),.13,.69);
 return [world(pt[0],pt[1],h),[shade*.89,shade*.97,shade*1.09,z>=10?.74:.93]]};
 for(let i=0;i<bands;i++)for(let k=0;k<segments;k++){const p=point(i,k),q=point(i+1,k),r=point(i+1,k+1),u=point(i,k+1);for(const v of [p,q,r,p,r,u])add(cv,v[0],v[1],th,frac(a.seed*.173))}
}
for(const a of near){
 a.ground=terrain(a.lon,a.lat);const radius=a.radius,seed=a.seed;
 const local=z>=10&&distance(a,view)<radius+viewRadius;
 const perCell=Math.max(5,Math.floor(budgets.cloudPuffs/Math.max(1,near.length)));
 if(z<10){
  // Multi-scale billows: main cloud body plus smaller lobes across its surface.
  const lobes=Math.min(perCell,z<4?22:48);
  for(let j=0;j<lobes;j++){const theta=hash(seed,j+1)*Math.PI*2,offset=radius*Math.sqrt(hash(seed,j+17))*.65,q=geo(a.lon,a.lat,Math.cos(theta)*offset,Math.sin(theta)*offset*.76);
   const rx=radius*(j<5?.23+.07*hash(seed,j+44):.075+.13*hash(seed,j+44)),ry=rx*(.72+.34*hash(seed,j+67)),rz=clamp(rx*(.40+.17*hash(seed,j+88)),360,a.ts?4600:2300);
   puff(a,q[0],q[1],rx,ry,rz,a.ground+a.base+rz*(1.1+.35*hash(seed,j+100)),seed+j,z<4?12:16,z<4?8:10);
  }
 }else if(local){
  // Use a fixed geographic grid of smaller cloud puffs across the whole rain cell.
  // A camera pan changes which puffs are loaded, never their world position.
  const spacing=clamp(a.base*.95,420,1400),cos=Math.max(.12,Math.cos(a.lat*D)),ix=Math.floor((view.lon-a.lon)*111320*cos/spacing),iy=Math.floor((view.lat-a.lat)*111320/spacing);
  const reach=Math.min(4,Math.max(1,Math.ceil((viewRadius+a.base*2)/spacing)));
  let made=0;const candidates=[];
  for(let y=iy-reach;y<=iy+reach;y++)for(let x=ix-reach;x<=ix+reach;x++)candidates.push([x,y,Math.hypot(x-ix,y-iy)]);
  candidates.sort((p,q)=>p[2]-q[2]);
  for(const [x,y] of candidates){if(made>=perCell)break;const k=seed+x*73856093+y*19349663,q=geo(a.lon,a.lat,x*spacing+(hash(k,1)-.5)*spacing*.6,y*spacing+(hash(k,2)-.5)*spacing*.6);
   if(!inCell(a,{lon:q[0],lat:q[1]}))continue;
   const gh=terrain(q[0],q[1]);
   for(let j=0;j<5&&made<perCell;j++){const angle=hash(k,j+7)*Math.PI*2,offset=j?spacing*.32:0,p=geo(q[0],q[1],Math.cos(angle)*offset,Math.sin(angle)*offset);
    const rx=spacing*(j===0?.76:.33+.23*hash(k,j+22)),rz=clamp(rx*.58,150,1000);
    puff(a,p[0],p[1],rx,rx*.84,rz,gh+a.base+rz*(1.03+.3*hash(k,j+60)),k+j,16,10);made++;
   }
  }
 }
 // The sampling footprint intersects the observed cell rather than following its station center.
 const origin=local?view:a,rad=local?Math.min(radius,viewRadius*1.15):radius*.80;
 const count=Math.max(18,Math.floor(budgets.drops/Math.max(1,near.length)));
 const span=local?clamp(viewRadius*.9,16,Math.min(a.base,240)):a.base;
 for(let j=0;j<count;j++){const ang=hash(seed,j+200)*Math.PI*2,r=Math.sqrt(hash(seed,j+600))*rad,p=geo(origin.lon,origin.lat,Math.cos(ang)*r,Math.sin(ang)*r);
  if(!inCell(a,{lon:p[0],lat:p[1]}))continue;
  const gh=z>=10?terrain(p[0],p[1]):a.ground;
  drops.push({lon:p[0],lat:p[1],ground:gh,base:a.base,span,phase:hash(seed,j+1000),rate:8+hash(seed,j+1300)*5,seed:seed+j});
 }
 if(z>=12.5&&local){
  // Meter-based anchored grid: closer views get more useful puddle density without giant puddles.
  const spacing=clamp(viewRadius/7,2.8,28),cos=Math.max(.12,Math.cos(a.lat*D)),gx=Math.floor((view.lon-a.lon)*111320*cos/spacing),gy=Math.floor((view.lat-a.lat)*111320/spacing);
  const reach=Math.min(12,Math.ceil(viewRadius/spacing));let made=0;const candidates=[];
  for(let y=gy-reach;y<=gy+reach;y++)for(let x=gx-reach;x<=gx+reach;x++)candidates.push([x,y,Math.hypot(x-gx,y-gy)]);
  candidates.sort((p,q)=>p[2]-q[2]);
  for(const [x,y] of candidates){if(pools.length>=budgets.puddles||made>=Math.max(8,Math.floor(budgets.puddles/near.length)))break;
   const k=seed+x*73856093+y*19349663;if(hash(k,31)>.52)continue;
   const p=geo(a.lon,a.lat,(x+(hash(k,32)-.5)*.65)*spacing,(y+(hash(k,33)-.5)*.65)*spacing);
   if(!inCell(a,{lon:p[0],lat:p[1]})||distance(view,{lon:p[0],lat:p[1]})>viewRadius)continue;
   const h=terrain(p[0],p[1]);pools.push({lon:p[0],lat:p[1],h:h+.18,r:clamp(spacing*(.20+.13*hash(k,34)),.6,4.8),seed:k});made++;
  }
 }
}
cloudVertices=new Float32Array(cv);diagnostics.cloudLobes=puffCount;diagnostics.fallingDrops=drops.length;dirty=true;updateSource();map.triggerRepaint();}
function lightningPhase(c,t){return frac(t/8+frac(c.seed*.173))}
function effects(t){
 const lines=[],triangles=[],z=map.getZoom();
 const add=(arr,p,col)=>arr.push(...p,...col,0,0);
 function ribbon(a,b,width,colA,colB){
  const p=geo(a.lon,a.lat,width,0),q=geo(b.lon,b.lat,width,0),r=geo(a.lon,a.lat,-width,0),u=geo(b.lon,b.lat,-width,0);
  const A=world(p[0],p[1],a.h),B=world(q[0],q[1],b.h),C=world(r[0],r[1],a.h),D=world(u[0],u[1],b.h);
  for(const [v,col] of [[A,colA],[B,colB],[C,colA],[C,colA],[B,colB],[D,colB]])add(triangles,v,col);
 }
 for(const d of drops){
  const phase=frac(d.phase+t*d.rate/d.span),h=d.ground+(1-phase)*d.span,scale=156543*Math.max(.12,Math.cos(d.lat*D))/2**z,len=clamp(scale*2.2,2.2,Math.min(170,d.span*.36)),w=clamp(scale*.65,.18,24);
  const p=geo(d.lon,d.lat,-Math.max(len*.24,scale*.8),len*.12);
  const tail={lon:d.lon,lat:d.lat,h},head={lon:p[0],lat:p[1],h:Math.max(d.ground+.18,h-len)};
  ribbon(tail,head,w,[.63,.82,1,.30],[.82,.94,1,.96]);
 }
 diagnostics.fallingDrops=drops.length;diagnostics.ripples=0;
 for(const p of pools){
  const f=frac(t*1.7+hash(p.seed,10)),r=p.r*(.1+.75*f),alpha=(1-f)*.88;
  for(let i=0;i<16;i++){const a=i/16*Math.PI*2,b=(i+1)/16*Math.PI*2;for(const k of [a,b]){const q=geo(p.lon,p.lat,Math.cos(k)*r,Math.sin(k)*r*.64);add(lines,world(q[0],q[1],p.h),[.76,.95,1,alpha])}}
  if(f<.28)for(let i=0;i<5;i++){const a=i*Math.PI*2/5+hash(p.seed,15),q=geo(p.lon,p.lat,Math.cos(a)*p.r*.35,Math.sin(a)*p.r*.35);add(lines,world(p.lon,p.lat,p.h),[.85,.96,1,.95]);add(lines,world(q[0],q[1],p.h+.38*Math.sin(f*11)),[.85,.96,1,.35])}
  diagnostics.ripples++;
 }
 diagnostics.lightningBolts=0;
 if(!reduced.matches)for(const c of near.filter(a=>a.ts).slice(0,mobile?5:10)){
  const f=lightningPhase(c,t);if(f>.065)continue;
  const focus=currentView&&inCell(c,currentView)?currentView:c,seed=c.seed+Math.floor(t/8+frac(c.seed*.173));
  const off=clamp((currentView?.mpp||10)*100,15,c.radius*.25),end=geo(focus.lon,focus.lat,(hash(seed,91)-.5)*off,(hash(seed,92)-.5)*off);
  if(!inCell(c,{lon:end[0],lat:end[1]}))continue;
  const ground=terrain(end[0],end[1]),base=c.base,scale=156543*Math.max(.12,Math.cos(end[1]*D))/2**z;
  let prev={lon:end[0],lat:end[1],h:ground+base+200};
  for(let i=1;i<=18;i++){const u=i/18,p=geo(end[0],end[1],(hash(seed,i)-.5)*base*.32*Math.sin(u*Math.PI),(hash(seed,i+40)-.5)*base*.2*Math.sin(u*Math.PI)),next={lon:p[0],lat:p[1],h:ground+(base+200)*(1-u)};
   ribbon(prev,next,clamp(scale*1.3,.5,38),[.94,.98,1,.95],[.75,.88,1,.95]);
   if(i%5===0&&i<16){const b=geo(p[0],p[1],base*.14,base*.09);ribbon(next,{lon:b[0],lat:b[1],h:ground+(base+200)*(1-u)*.65},clamp(scale*.5,.2,14),[.75,.87,1,.7],[.65,.79,1,.16])}prev=next;
  }diagnostics.lightningBolts++;
 }
 return {lines:new Float32Array(lines),triangles:new Float32Array(triangles)};
}
// Close-range visibility aid: geographic projection of ground impacts and the
// low-altitude end of the same rain columns. No random rain outside source cells.
function ensureOverlay(){
 if(overlay?.isConnected)return;const host=map.getCanvasContainer?.()||map.getContainer?.();if(!host)return;
 overlay=document.createElement('canvas');overlay.id='bp-rn-v3-local-visibility';overlay.setAttribute('aria-hidden','true');
 overlay.style.cssText='position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1;';host.append(overlay);overlayCtx=overlay.getContext('2d');overlaySize='';
}
function drawLocalVisibility(t){
 if(!on||!map)return;ensureOverlay();const ctx=overlayCtx;if(!ctx)return;
 const cv=map.getCanvas(),w=cv.clientWidth||400,h=cv.clientHeight||800,dpr=Math.min(1.5,devicePixelRatio||1),key=w+':'+h+':'+dpr;
 if(key!==overlaySize){overlay.width=Math.round(w*dpr);overlay.height=Math.round(h*dpr);overlaySize=key}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
 const z=map.getZoom();if(z<9||!near.length)return;
 const pitch=Math.max(.28,Math.sin(map.getPitch()*D)),seconds=t/1000,limit=mobile?200:450;
 let streaks=0;
 ctx.lineCap='round';ctx.lineWidth=1.25;ctx.strokeStyle='rgba(191,225,255,.64)';ctx.beginPath();
 for(let i=0;i<drops.length;i+=Math.max(1,Math.ceil(drops.length/limit))){const d=drops[i],q=map.project([d.lon,d.lat]),mpp=156543*Math.max(.12,Math.cos(d.lat*D))/2**z,phase=frac(d.phase+seconds*d.rate/d.span),height=clamp(d.span/Math.max(.08,mpp)*pitch,18,h*.85),x=q.x+(1-phase)*6,y=q.y-height*(1-phase);if(x<0||x>w||y<0||y>h)continue;ctx.moveTo(x,y);ctx.lineTo(x-2.5,y+clamp(5+z*.25,6,11));streaks++}ctx.stroke();
 diagnostics.projectedLocalStreaks=streaks;
 // Project each wet-ground ripple from its fixed world position. This aid keeps
 // impacts readable when the map's high zoom float precision is sub-meter.
 if(z>=14){ctx.lineWidth=1.1;for(const p of pools){const q=map.project([p.lon,p.lat]);if(q.x<0||q.x>w||q.y<0||q.y>h)continue;const mpp=156543*Math.max(.12,Math.cos(p.lat*D))/2**z,r=clamp(p.r/Math.max(.03,mpp),2,38),f=frac(seconds*1.7+hash(p.seed,10));ctx.strokeStyle='rgba(193,232,255,'+((1-f)*.7).toFixed(2)+')';ctx.beginPath();ctx.ellipse(q.x,q.y,r*(.18+.70*f),r*(.10+.40*f),0,0,Math.PI*2);ctx.stroke()}}
}
function makeLayer(){let gl,buffers=[],vao,programs=new Map(),cloudCount=0;
function program(g,args){const sd=args?.shaderData;if(!sd?.vertexShaderPrelude||!args?.defaultProjectionData)return null;const key=sd.vertexShaderPrelude+'\\n'+sd.define;if(programs.has(key))return programs.get(key);
const vs='#version 300 es\n'+sd.vertexShaderPrelude+'\n'+sd.define+'\nprecision highp float;\nin vec3 a_pos;in vec4 a_color;in vec2 a_flash;uniform float u_time;uniform float u_reduce;out vec4 v_color;void main(){gl_Position=projectTileFor3D(a_pos.xy,a_pos.z);float flash=(1.-step(.065,fract(u_time/8.+a_flash.y)))*a_flash.x*(1.-u_reduce);v_color=vec4(mix(a_color.rgb,vec3(.94,.96,1.),flash*.75),a_color.a);}';
const fs='#version 300 es\nprecision mediump float;in vec4 v_color;out vec4 outColor;void main(){outColor=v_color;}';
const compile=(type,src)=>{const s=g.createShader(type);g.shaderSource(s,src);g.compileShader(s);if(!g.getShaderParameter(s,g.COMPILE_STATUS)){const e=g.getShaderInfoLog(s);g.deleteShader(s);throw Error(e)}return s};const v=compile(g.VERTEX_SHADER,vs),f=compile(g.FRAGMENT_SHADER,fs),p=g.createProgram();g.attachShader(p,v);g.attachShader(p,f);g.linkProgram(p);g.deleteShader(v);g.deleteShader(f);if(!g.getProgramParameter(p,g.LINK_STATUS))throw Error(g.getProgramInfoLog(p));const u=n=>g.getUniformLocation(p,n);const o={p,attrs:['a_pos','a_color','a_flash'].map(n=>g.getAttribLocation(p,n)),u:['u_projection_matrix','u_projection_fallback_matrix','u_projection_tile_mercator_coords','u_projection_clipping_plane','u_projection_transition','u_time','u_reduce'].map(u)};programs.set(key,o);return o}
return {id:FX,type:'custom',renderingMode:'3d',onAdd(m,g){gl=g;buffers=[g.createBuffer(),g.createBuffer()];vao=g.createVertexArray?.();dirty=true},render(g,args){if(!on||!near.length||!vao)return;const now=performance.now()/1000;let saved;try{const a=program(g,args);if(!a)return;const d=args.defaultProjectionData;const get=n=>g.getParameter(g[n]),is=n=>g.isEnabled(g[n]);saved={p:get('CURRENT_PROGRAM'),a:get('ARRAY_BUFFER_BINDING'),vao:get('VERTEX_ARRAY_BINDING'),depth:is('DEPTH_TEST'),blend:is('BLEND'),cull:is('CULL_FACE'),mask:get('DEPTH_WRITEMASK'),func:get('DEPTH_FUNC'),sr:get('BLEND_SRC_RGB'),dr:get('BLEND_DST_RGB'),sa:get('BLEND_SRC_ALPHA'),da:get('BLEND_DST_ALPHA')};
g.useProgram(a.p);g.bindVertexArray(vao);g.uniformMatrix4fv(a.u[0],false,d.mainMatrix);g.uniformMatrix4fv(a.u[1],false,d.fallbackMatrix);g.uniform4fv(a.u[2],d.tileMercatorCoords);g.uniform4fv(a.u[3],d.clippingPlane);g.uniform1f(a.u[4],d.projectionTransition);g.uniform1f(a.u[5],now);g.uniform1f(a.u[6],matchMedia('(prefers-reduced-motion: reduce)').matches?1:0);
g.enable(g.DEPTH_TEST);g.depthFunc(g.LEQUAL);g.disable(g.CULL_FACE);g.enable(g.BLEND);g.blendFuncSeparate(g.SRC_ALPHA,g.ONE_MINUS_SRC_ALPHA,g.ONE,g.ONE_MINUS_SRC_ALPHA);
const bind=b=>{g.bindBuffer(g.ARRAY_BUFFER,b);for(let i=0;i<3;i++){const loc=a.attrs[i];if(loc<0)continue;g.enableVertexAttribArray(loc);g.vertexAttribPointer(loc,[3,4,2][i],g.FLOAT,false,36,[0,12,28][i])}};
bind(buffers[0]);if(dirty){g.bufferData(g.ARRAY_BUFFER,cloudVertices,g.STATIC_DRAW);cloudCount=cloudVertices.length/9;dirty=false}g.depthMask(map.getZoom()<9);g.drawArrays(g.TRIANGLES,0,cloudCount);
const dynamic=effects(now);bind(buffers[1]);g.depthMask(false);g.bufferData(g.ARRAY_BUFFER,dynamic.triangles,g.DYNAMIC_DRAW);g.drawArrays(g.TRIANGLES,0,dynamic.triangles.length/9);g.bufferData(g.ARRAY_BUFFER,dynamic.lines,g.DYNAMIC_DRAW);g.drawArrays(g.LINES,0,dynamic.lines.length/9);diagnostics.draws++;diagnostics.shaderReady=true;diagnostics.projection='MapLibre projectTileFor3D';error=null;
}catch(e){error=String(e?.message||e)}finally{if(saved){g.bindVertexArray(saved.vao);g.bindBuffer(g.ARRAY_BUFFER,saved.a);g.useProgram(saved.p);for(const [n,v] of [['DEPTH_TEST',saved.depth],['BLEND',saved.blend],['CULL_FACE',saved.cull]])v?g.enable(g[n]):g.disable(g[n]);g.depthMask(saved.mask);g.depthFunc(saved.func);g.blendFuncSeparate(saved.sr,saved.dr,saved.sa,saved.da)}}},onRemove(){if(gl){for(const b of buffers)gl.deleteBuffer(b);for(const p of programs.values())gl.deleteProgram(p.p);if(vao)gl.deleteVertexArray(vao)}programs.clear()}}}
function syncButton(){if(!button)return;button.classList.toggle('active',on);button.setAttribute('aria-pressed',String(on));button.title=on?'Rain ON · '+(sourceStatus==='unavailable'?'source unavailable':cells.length+' observed rain regions')+' · estimated coverage and simulated effects':'Show live rain regions, 3D storm clouds, rain and lightning';}
function animate(t){raf=0;if(!on||document.hidden)return;if(map&&near.length&&t-lastFrame>(map.isMoving?.()?100:mobile?66:45)){lastFrame=t;map.triggerRepaint();if(t-lastOverlay>=66){lastOverlay=t;try{drawLocalVisibility(t)}catch(e){console.warn('Rain local projection',e)}}}raf=requestAnimationFrame(animate)}
function schedule(){clearTimeout(rebuildTimer);rebuildTimer=setTimeout(()=>{if(on){ensure();choose();if(overlayCtx)drawLocalVisibility(performance.now())}},180)}
const getScene=()=>window.__bpWeatherV2300?.getScene?.()||window.__BP_SHARED_VISUAL_WEATHER__?.weather?.getScene?.()||{};
async function refresh(force=false){if(!on||fetching)return;const generation=epoch;fetching=true;try{const scene=getScene(),live=Array.isArray(scene.observations)?scene.observations:[];let input=live.slice();let snapshot=null;
if(force||Date.now()-lastSource>300000){lastSource=Date.now();try{const response=await fetch('/bp-rain-observations-v1.json',{cache:'no-cache',signal:AbortSignal.timeout(6000)});if(response.ok){const j=await response.json();if(Date.now()-Date.parse(j.generated_at)<90*60000)snapshot=j}}catch(_){}if(snapshot)rows=snapshot.observations||[]}
if(!on||epoch!==generation)return;input.push(...rows);cells=normalize(input);sourceTime=scene.generated_at||snapshot?.generated_at||null;sourceStatus=input.length?'ready':'unavailable';ensure();choose();syncButton();
}catch(e){error=String(e?.message||e);sourceStatus='unavailable';syncButton()}finally{fetching=false}}
function unbind(){overlay?.remove();overlay=null;overlayCtx=null;overlaySize='';if(!map)return;popup?.remove();popup=null;map.off('click',openRainMarker);for(const e of ['moveend','zoomend','style.load'])map.off(e,schedule);for(const id of [ICON,MARK,FX,PUDDLE,EDGE,FILL])try{if(map.getLayer(id))map.removeLayer(id)}catch(_){}try{if(map.getSource(SOURCE))map.removeSource(SOURCE)}catch(_){}}
function bind(){const m=mapNow();if(!m)return false;if(m!==map){unbind();map=m;for(const e of ['moveend','zoomend','style.load'])map.on(e,schedule);map.on('click',openRainMarker)}return true}
function setEnabled(v){on=!!v;epoch++;syncButton();clearInterval(refreshTimer);clearTimeout(rebuildTimer);if(!on){cancelAnimationFrame(raf);raf=0;unbind();map=null;near=[];pools=[];drops=[];cloudVertices=new Float32Array();return false}
if(bind()){ensure();void refresh(true)}refreshTimer=setInterval(()=>{if(!on||document.hidden)return;if(bind()){ensure();void refresh(false)}},15000);if(!raf)raf=requestAnimationFrame(animate);return true}
function mount(){const dock=document.querySelector('#bpv-dock');if(!dock)return;if(button?.isConnected)return;const grid=dock.querySelector('[data-bpv-command-grid="environment"]')||dock.querySelector('#bpv-dock-actions');if(!grid)return;button=document.createElement('button');button.type='button';button.className='bpv-command-btn';button.dataset.bpvAction='rain';button.dataset.bpvBound='1';button.innerHTML='<span class="bpv-command-icon" style="color:#8ed6ff" aria-hidden="true">🌧</span><span class="bpv-command-label">Rain</span>';button.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();setEnabled(!on)});grid.append(button);syncButton()}
window.addEventListener('bp2300:weather-updated',()=>{if(on)void refresh(false)});document.addEventListener('visibilitychange',()=>{if(on&&!document.hidden){if(!raf)raf=requestAnimationFrame(animate);void refresh(false)}});
window.__BP_RAIN_BUTTON_V1__={setEnabled,get state(){return{enabled:on,sourceStatus,sourceTime,cells:cells.length,visibleCells:near.length,puddles:pools.length,markerCount:on?cells.length:0,markerLayerReady:!!map?.getLayer(ICON),error,...diagnostics}},normalize};
mount();const observer=new MutationObserver(mount);observer.observe(document.body||document.documentElement,{childList:true,subtree:true});
})();
