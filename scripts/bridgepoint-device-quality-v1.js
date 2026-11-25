/* BridgePoint adaptive device profiles. No user-agent model blacklist, no feature toggles.
 * Quality is local to the browser. Frame-rate targets are goals, not guarantees. */
(()=>{
'use strict';
if(window.__BP_DEVICE_QUALITY_V1__)return;
const profiles=Object.freeze([
 [1,'Essential',.65,30,300,100,90,160,2.4,48,2],
 [2,'Very low',.78,30,450,140,130,240,2.0,64,2],
 [3,'Low',.9,30,650,180,180,350,1.65,80,3],
 [4,'Balanced low',1,40,900,230,260,500,1.25,100,3],
 [5,'Balanced',1.1,45,1300,300,360,700,.95,128,4],
 [6,'Standard',1.25,50,1800,400,520,1000,.65,160,4],
 [7,'Enhanced',1.4,60,2400,500,720,1400,.4,220,5],
 [8,'High',1.5,60,3200,650,950,1800,.2,300,6],
 [9,'Ultra',1.75,60,4000,800,1250,2400,.1,420,7],
 [10,'Maximum',2,60,5000,900,1500,3000,0,640,8]
].map(([level,name,dpr,targetFps,buildings,exact,living,trees,lodOffset,tileCache,workers])=>Object.freeze({level,name,dpr,targetFps,buildings,exact,living,trees,lodOffset,tileCache,workers})));
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const getProfile=n=>profiles[clamp(Math.round(Number(n)||1),1,10)-1];
function classify(h={}){
 const cores=Number(h.cores)||4,mem=Number(h.memory)||0,mobile=!!h.mobile;
 if(cores<=2||(mem&&mem<=2))return 1;
 if(cores<=4&&mem&&mem<=3)return 2;
 if(cores<=4)return mobile?3:4;
 if(mem&&mem<=4)return mobile?4:5;
 if(mobile)return cores>=8&&mem>=8?7:5;
 if(cores>=16&&mem>=8)return 10;
 if(cores>=12&&mem>=8)return 9;
 if(cores>=8&&mem>=8)return 8;
 return cores>=8?7:6;
}
const hints={cores:navigator.hardwareConcurrency,memory:navigator.deviceMemory,mobile:matchMedia('(pointer:coarse)').matches||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent)};
const capability=classify(hints),initialLevel=Math.min(capability,hints.mobile?2:4);
let level=initialLevel,ceiling=capability,targetRefresh=60,lastFPS=null,slow=0,fast=0,lastChange=-Infinity,activeMap=null,appliedRatio=null,pending=false,lastRender=0,renderTimes=[],windowStart=0,changedAt=Date.now(),lastTick=performance.now(),stallCount=0,activeSince=0,observedBusyUntil=0;
const listeners=new Set();
function pixelRatio(p=getProfile(level),w=innerWidth,h=innerHeight,device=window.devicePixelRatio||1){
 // Keep large displays inside an explicit GPU fill-rate budget.
 const maxPixels=[.65,.9,1.2,1.6,2.1,2.8,3.8,5,7,9][p.level-1]*1e6;
 return Math.max(.5,Math.min(device,p.dpr,Math.sqrt(maxPixels/Math.max(1,w*h))));
}
function announce(){
 document.documentElement.dataset.bpQualityTier=String(level);
 document.documentElement.dataset.bpQualityLow=String(level<=5);
 changedAt=Date.now();
 for(const fn of listeners){try{fn(getProfile(level))}catch(e){console.warn('BridgePoint quality subscriber',e)}}
 pending=true;apply();
}
function apply(){
 if(!pending||!activeMap)return;
 const ratio=pixelRatio();
 // Downgrades must not wait for the gesture that is overloading the GPU.
 // Upgrades still wait until the camera settles.
 if(activeMap.isMoving?.()&&(appliedRatio===null||ratio>=appliedRatio-.045))return;
 pending=false;
 if(typeof activeMap.setPixelRatio==='function'&&(appliedRatio===null||Math.abs(appliedRatio-ratio)>.045)){
  try{activeMap.setPixelRatio(ratio);appliedRatio=ratio}catch(e){console.warn('BridgePoint adaptive pixel ratio',e)}
 }
}
function evaluate(fps,now=performance.now(),busy=true){
 if(!busy||!Number.isFinite(fps)||fps<0)return level;
 lastFPS=Math.round(fps*10)/10;
 const target=Math.min(targetRefresh,getProfile(level).targetFps);
 if(fps<target*.78){slow++;fast=0;}
 else if(fps>=target*.95){fast++;slow=0;}
 else{slow=0;fast=0;}
 const severe=fps<target*.4;
 if(level>1&&(severe||slow>=2)&&now-lastChange>=(severe?1000:2500)){
  level=Math.max(1,level-(severe?3:1));slow=fast=0;lastChange=now;announce();
 }else if(fast>=20&&level<ceiling&&now-lastChange>=45000&&!activeMap?.isMoving?.()){
  level++;slow=fast=0;lastChange=now;announce();
 }
 return level;
}
function bind(map){
 if(!map||activeMap===map)return;
 if(activeMap){activeMap.off?.('render',onRender);activeMap.off?.('moveend',apply);activeMap.off?.('movestart',onMoveStart);}
 activeMap=map;appliedRatio=pixelRatio();pending=false;renderTimes=[];lastRender=0;windowStart=0;lastTick=performance.now();activeSince=0;observedBusyUntil=0;
 map.on?.('render',onRender);map.on?.('moveend',apply);map.on?.('movestart',onMoveStart);
}
function onMoveStart(){activeSince=performance.now();observedBusyUntil=activeSince+2500;}
function onRender(){
 const t=performance.now();
 if(document.hidden)return;
 if(lastRender&&t-lastRender<150)observedBusyUntil=t+1500;
 lastRender=t;
 if(!windowStart)windowStart=t;
 renderTimes.push(t);
 if(renderTimes.length>600)renderTimes.shift();
}
setInterval(()=>{
 const now=performance.now(),elapsed=Math.max(1,now-lastTick);lastTick=now;
 if(document.hidden||!activeMap){renderTimes=[];windowStart=0;slow=fast=0;observedBusyUntil=0;return;}
 const times=renderTimes;renderTimes=[];windowStart=0;
 const moving=!!activeMap.isMoving?.();
 const busy=moving||times.length>=12||now<=observedBusyUntil;
 if(busy){
  // Count all elapsed time, not just gaps between surviving renders.
  // A blocked main thread will report the real delay when it recovers.
  const fps=times.length*1000/elapsed;
  if((moving||now<=observedBusyUntil)&&(elapsed>1800||times.length===0)){stallCount++;evaluate(0,now,true);}
  else if(moving||times.length>=12)evaluate(fps,now,true);
 }else{slow=fast=0;}
 apply();
},1000);
let stamps=[],start=performance.now();
function detectRefresh(t){
 if(stamps.length)stamps.push(t);else stamps=[t];
 if(stamps.length<24&&t-start<1500){requestAnimationFrame(detectRefresh);return;}
 const gaps=stamps.slice(1).map((x,i)=>x-stamps[i]).filter(x=>x>=4&&x<=40).sort((a,b)=>a-b);
 if(gaps.length>=8)targetRefresh=clamp(Math.round(1000/gaps[Math.floor(gaps.length*.2)]),30,120);
}
requestAnimationFrame(detectRefresh);
window.addEventListener('resize',()=>{pending=true;apply();},{passive:true});
document.addEventListener('visibilitychange',()=>{renderTimes=[];windowStart=0;slow=fast=0;lastTick=performance.now();lastRender=0;observedBusyUntil=0;});
window.__BP_DEVICE_QUALITY_V1__=Object.freeze({
 profiles,classify,pixelRatio,bind,subscribe(fn){listeners.add(fn);return()=>listeners.delete(fn);},
 get profile(){return getProfile(level);},
 get waterBudget(){const i=level-1;return Object.freeze({minFrameDelay:[220,180,150,125,105,90,75,65,55,45][i],gridCells:[240,320,420,540,680,850,1050,1300,1600,2000][i],marineVertices:[12000,18000,24000,32000,44000,58000,76000,96000,120000,150000][i],inlandVertices:[6000,8500,12000,16000,22000,30000,40000,52000,68000,85000][i],coastalVertices:[12000,18000,24000,32000,44000,58000,76000,96000,120000,150000][i],flowSegments:[18,24,32,40,50,60,75,90,110,130][i],sliceMs:level<=3?2:level<=6?3:4});},
 get state(){return {level,profile:getProfile(level),initialLevel,capability,stallCount,ceiling,displayRefreshHz:targetRefresh,targetFps:Math.min(targetRefresh,getProfile(level).targetFps),measuredFps:lastFPS,pixelRatio:pixelRatio(),appliedRatio,changedAt,featuresDisabled:0};}
});
announce();
})();
