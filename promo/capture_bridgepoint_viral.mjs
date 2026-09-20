import fs from 'fs';
import path from 'path';
import {spawnSync} from 'child_process';
import puppeteer from 'puppeteer-core';

const CHROME=process.env.CHROME_PATH;
const OUT=process.env.OUT_DIR||'promo-work';
const FRAME_RATE=20;
fs.mkdirSync(OUT,{recursive:true});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=(...a)=>console.log('[PROMO]',...a);

function ff(args){
  const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y',...args],{stdio:'inherit'});
  if(r.status!==0)throw new Error('ffmpeg failed '+args.join(' '));
}
function geomCenter(g){
  if(!g)return null;
  if(g.type==='Point')return g.coordinates;
  let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,n=0;
  const walk=v=>{if(!Array.isArray(v))return;if(v.length>=2&&Number.isFinite(+v[0])&&Number.isFinite(+v[1])){minX=Math.min(minX,+v[0]);maxX=Math.max(maxX,+v[0]);minY=Math.min(minY,+v[1]);maxY=Math.max(maxY,+v[1]);n++;return}for(const x of v)walk(x)};
  walk(g.coordinates); return n?[(minX+maxX)/2,(minY+maxY)/2]:null;
}

const browser=await puppeteer.launch({
  headless:true,
  executablePath:CHROME,
  args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required']
});
const page=await browser.newPage();
await page.setUserAgent('Mozilla/5.0 (Linux; Android 16; Pixel 9 Pro) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36');
await page.setViewport({width:720,height:1280,deviceScaleFactor:1,isMobile:true,hasTouch:true});
page.on('console',m=>{const t=m.text();if(/BridgePoint|ROAD DRIVE|SCENARIO|weather|space/i.test(t))console.log('[BROWSER]',m.type(),t)});
page.on('pageerror',e=>console.log('[PAGEERROR]',String(e.message||e)));

await page.goto('https://bridgepointintelligence.online/app/?qa=promo-'+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
await page.waitForFunction(()=>window.__BP_V5000_WORLD?.map&&window.__BP_INTELLIGENCE_PREMIUM_TOOLS_V5507__,{timeout:60000});
await page.waitForFunction(()=>window.__BP_WORLD_CORE_READY__?.ready===true||!!window.__BP_WORLD_CORE_READY__?.error,{timeout:40000});
await sleep(2500);
await page.evaluate(()=>{
  const s=document.createElement('i');s.id='bpPromoPulse';s.style.cssText='position:fixed;left:-10px;top:-10px;width:1px;height:1px;opacity:.001;pointer-events:none;z-index:-1';document.body.appendChild(s);
  const keep=document.createElement('input');keep.id='bpPromoRefreshGuard';keep.type='text';keep.autocomplete='off';keep.setAttribute('aria-hidden','true');keep.style.cssText='position:fixed;left:-200vw;top:-200vh;width:1px;height:1px;opacity:0;pointer-events:none';document.body.appendChild(keep);
  const refocus=()=>{try{keep.focus({preventScroll:true})}catch(_){}};
  refocus();setInterval(refocus,220);
  let n=0;setInterval(()=>{n++;s.style.transform='translateX('+(n%2)+'px)';s.style.opacity=n%2?'.001':'.002'},40);
});

const meta={clips:[],fire:null,weatherTarget:null,tools:{},generatedAt:new Date().toISOString()};

async function recordClip(name,action){
  const dir=path.join(OUT,'frames-'+name);fs.rmSync(dir,{recursive:true,force:true});fs.mkdirSync(dir,{recursive:true});
  const client=await page.target().createCDPSession();
  let idx=0,lastTs=0,active=true;
  client.on('Page.screencastFrame',ev=>{
    client.send('Page.screencastFrameAck',{sessionId:ev.sessionId}).catch(()=>{});
    if(!active)return;
    const ts=Number(ev.metadata?.timestamp)||Date.now()/1000;
    if(lastTs&&ts-lastTs<1/FRAME_RATE*.92)return;
    lastTs=ts;
    fs.writeFileSync(path.join(dir,'f-'+String(idx).padStart(5,'0')+'.jpg'),Buffer.from(ev.data,'base64'));idx++;
  });
  await client.send('Page.startScreencast',{format:'jpeg',quality:88,maxWidth:720,maxHeight:1280,everyNthFrame:1});
  await sleep(180);
  const started=Date.now();
  await action();
  await sleep(240);
  const wallMs=Math.max(500,Date.now()-started);
  active=false;
  await client.send('Page.stopScreencast').catch(()=>{});
  await sleep(250);
  await client.detach().catch(()=>{});
  if(idx<8){
    log(name,'low screencast frame count',idx,'adding still frames');
    const shot=await page.screenshot({type:'jpeg',quality:90});
    while(idx<40){fs.writeFileSync(path.join(dir,'f-'+String(idx).padStart(5,'0')+'.jpg'),shot);idx++}
  }
  const out=path.join(OUT,name+'.mp4');
  const sourceFps=Math.max(1,Math.min(24,idx/(wallMs/1000)));
  ff(['-framerate',sourceFps.toFixed(3),'-i',path.join(dir,'f-%05d.jpg'),'-vf','framerate=fps=30:interp_start=0:interp_end=255:scene=100,format=yuv420p','-c:v','libx264','-preset','veryfast','-crf','19','-movflags','+faststart',out]);
  const seconds=idx/sourceFps;
  meta.clips.push({name,frames:idx,seconds,wallMs,sourceFps});
  log('clip',name,idx,'frames',seconds.toFixed(2),'sec','capture fps',sourceFps.toFixed(2));
}

async function mapEval(cfg){
  await page.evaluate(c=>{const m=window.__BP_V5000_WORLD?.map;if(!m)return;try{m.stop()}catch(_){};try{m.setProjection?.({type:'globe'})}catch(_){};if(c.jump)try{m.jumpTo(c.jump)}catch(_){};if(c.ease)try{m.easeTo(c.ease)}catch(_){}},cfg);
}
async function closeActive(){
  await page.evaluate(()=>{
    for(const sel of ['#bpRoadDrive [data-rd-exit]','#bpScenarioLab [data-exit]','#bp5507-hud [data-exit]']){const b=document.querySelector(sel);if(b){try{b.click()}catch(_){}}}
    const p=document.getElementById('bp5507-tool-panel');if(p)p.hidden=true;
    document.body.classList.remove('bp5527-drive-ui-hidden');
  });
  await sleep(500);
}
async function openDrawer(){
  await closeActive();
  await page.waitForSelector('#bp5507-tool-panel',{timeout:15000});
  await page.evaluate(()=>{const p=document.getElementById('bp5507-tool-panel');if(p){p.hidden=false;p.scrollTop=0}});
  await page.waitForFunction(()=>document.getElementById('bp5507-tool-panel')?.hidden===false,{timeout:3000});
}
async function openTool(key){
  await openDrawer();
  await page.waitForSelector('[data-tool="'+key+'"]',{timeout:7000});
  await page.$eval('[data-tool="'+key+'"]',b=>b.click());
  await sleep(850);
  meta.tools[key]=await page.evaluate(k=>({state:window.__BP_INTELLIGENCE_PREMIUM_TOOLS_V5507__?.state||null,status:document.getElementById('bp5507-tool-status')?.innerText||'',hud:document.getElementById('bp5507-hud')?.innerText||'',gated:document.querySelector('[data-tool="'+k+'"]')?.dataset.gated||null}),key);
}

await closeActive();

await recordClip('01-globe',async()=>{
  await mapEval({jump:{center:[-98,34],zoom:1.75,pitch:0,bearing:-22}});
  await sleep(450);
  await mapEval({ease:{center:[-70,25],zoom:2.95,pitch:18,bearing:18,duration:3600}});
  await sleep(3900);
});

await mapEval({jump:{center:[-98,38],zoom:3.35,pitch:0,bearing:0}});
await sleep(2200);
const weatherTarget=await page.evaluate(()=>{
  const m=window.__BP_V5000_WORLD?.map;if(!m)return[-96,36];
  const ids=['bp-v5004-weather-points','bp-v5004-weather-shape-line','bp5507-live-points'].filter(id=>m.getLayer(id));
  let fs=[];try{fs=m.queryRenderedFeatures({layers:ids})||[]}catch(_){}
  const center=g=>{if(!g)return null;if(g.type==='Point')return g.coordinates;let a=[];const w=v=>{if(!Array.isArray(v))return;if(v.length>=2&&Number.isFinite(+v[0])&&Number.isFinite(+v[1]))a.push([+v[0],+v[1]]);else v.forEach(w)};w(g.coordinates);if(!a.length)return null;return[a.reduce((s,x)=>s+x[0],0)/a.length,a.reduce((s,x)=>s+x[1],0)/a.length]};
  for(const f of fs){const c=center(f.geometry);if(c&&c[0]>-130&&c[0]<-60&&c[1]>20&&c[1]<55)return c}
  return[-96,36];
});
meta.weatherTarget=weatherTarget;
await recordClip('02-weather-3d',async()=>{
  await page.evaluate(c=>{const m=window.__BP_V5000_WORLD.map;m.easeTo({center:c,zoom:5.7,pitch:0,bearing:0,duration:1700})},weatherTarget);
  await sleep(1950);
  await page.evaluate(c=>{const m=window.__BP_V5000_WORLD.map;m.easeTo({center:c,zoom:8.2,pitch:63,bearing:-20,duration:2300})},weatherTarget);
  await sleep(2600);
});

await recordClip('03-city-3d',async()=>{
  await mapEval({jump:{center:[-74.02,40.72],zoom:10.5,pitch:22,bearing:0}});
  await sleep(450);
  await mapEval({ease:{center:[-73.9857,40.7484],zoom:16.65,pitch:69,bearing:-28,duration:3000}});
  await sleep(3300);
});

await openDrawer();
await recordClip('04-free-tools',async()=>{
  await sleep(1500);
  await page.evaluate(()=>{const p=document.getElementById('bp5507-tool-panel');if(p)p.scrollTo({top:p.scrollHeight*.55,behavior:'smooth'})});
  await sleep(2200);
});

await closeActive();
await mapEval({jump:{center:[-76,39],zoom:5.4,pitch:62,bearing:40}});
await openTool('FLIGHT_SIM');
await recordClip('05-flight-sim',async()=>{
  await sleep(900);
  await page.evaluate(()=>{document.querySelector('#bp5507-hud [data-fast]')?.click();document.querySelector('#bp5507-hud [data-fast]')?.click()});
  await sleep(3900);
});

async function findFireRoad(){
  const fire=await page.evaluate(()=>{
    const fires=window.__bpWeatherV2300?.getScene?.()?.fires||window.__bpWeatherV2300?.fx?.scene?.fires||[];
    const center=g=>{if(!g)return null;if(g.type==='Point')return g.coordinates;let minX=Infinity,minY=Infinity,maxX=-Infinity,maxY=-Infinity,n=0;const w=v=>{if(!Array.isArray(v))return;if(v.length>=2&&Number.isFinite(+v[0])&&Number.isFinite(+v[1])){minX=Math.min(minX,+v[0]);maxX=Math.max(maxX,+v[0]);minY=Math.min(minY,+v[1]);maxY=Math.max(maxY,+v[1]);n++;return}v.forEach(w)};w(g.coordinates);return n?[(minX+maxX)/2,(minY+maxY)/2]:null};
    for(const f of fires){const c=center(f.geometry||f);if(c&&c[0]>-170&&c[0]<-60&&c[1]>15&&c[1]<72)return{center:c,name:String(f.name||f.id||'LIVE FIRE')}}
    return null;
  });
  if(!fire)return null;
  await page.evaluate(c=>window.__BP_V5000_WORLD.map.jumpTo({center:c,zoom:13.8,pitch:45,bearing:0}),fire.center);
  await sleep(2300);
  const road=await page.evaluate(()=>{
    const m=window.__BP_V5000_WORLD.map,ids=['gta-road-major','gta-road-local','gta-bridge-deck','gta-road-supplement-bp'].filter(id=>m.getLayer(id));let fs=[];try{fs=m.queryRenderedFeatures({layers:ids})||[]}catch(_){}
    for(const f of fs){const g=f.geometry;if(g?.type==='LineString'&&g.coordinates?.length>2){const a=g.coordinates[Math.floor(g.coordinates.length/2)];if(Array.isArray(a)&&Number.isFinite(+a[0]))return[+a[0],+a[1]]}if(g?.type==='MultiLineString'){for(const l of g.coordinates||[]){if(l?.length>2){const a=l[Math.floor(l.length/2)];if(Number.isFinite(+a[0]))return[+a[0],+a[1]]}}}}
    return null;
  });
  return road?{...fire,road}:null;
}
await closeActive();
const fireRoad=await findFireRoad();
meta.fire=fireRoad;
await openTool('DRIVE');
await page.waitForSelector('#bpRoadDrive',{timeout:12000});
if(fireRoad){
  await page.evaluate(c=>window.__BP_V5000_WORLD.map.easeTo({center:c,zoom:15.1,pitch:58,bearing:0,duration:500}),fireRoad.road);
  await sleep(900);
  await page.$eval('#bpRoadDrive [data-rd-center]',b=>b.click());
}else{
  const preset=await page.$('#bpRoadDrive [data-rd-preset][data-label="LOS ANGELES"]')||await page.$('#bpRoadDrive [data-rd-preset]');
  if(preset)await preset.click();
}
await sleep(650);
await page.$eval('#bpRoadDrive [data-rd-start]',b=>b.click());
try{await page.waitForFunction(()=>window.__BP_ROAD_DRIVE_V5530__?.state?.stage==='drive',{timeout:15000})}catch(e){
  log('road drive primary start failed; retrying NYC');
  await closeActive();await openTool('DRIVE');await page.waitForSelector('#bpRoadDrive',{timeout:9000});
  const ny=await page.$('#bpRoadDrive [data-rd-preset][data-label="NEW YORK CITY"]')||await page.$('#bpRoadDrive [data-rd-preset]');if(ny)await ny.click();await sleep(700);await page.$eval('#bpRoadDrive [data-rd-start]',b=>b.click());await page.waitForFunction(()=>window.__BP_ROAD_DRIVE_V5530__?.state?.stage==='drive',{timeout:15000});
}
await recordClip('06-road-drive',async()=>{
  await page.evaluate(()=>document.body.classList.remove('bp5527-drive-ui-hidden'));
  await sleep(1400);
  await page.evaluate(()=>{document.querySelector('#bpRoadDrive [data-rd-faster]')?.click();document.querySelector('#bpRoadDrive [data-rd-faster]')?.click();document.body.classList.remove('bp5527-drive-ui-hidden')});
  await sleep(2700);
  await page.evaluate(()=>document.body.classList.remove('bp5527-drive-ui-hidden'));
  await sleep(3400);
});
meta.roadDriveEnd=await page.evaluate(()=>({state:window.__BP_ROAD_DRIVE_V5530__?.state||null,fireLabels:[...document.querySelectorAll('.bp-rd-fire-distance')].map(x=>x.innerText)}));

await closeActive();await openTool('SCENARIO');
await page.waitForSelector('.bp-sl-panel',{timeout:10000});
await page.$eval('[data-event="WILDFIRE"]',b=>b.click());
{const p=await page.$('[data-preset][data-label="LOS ANGELES"]')||await page.$('[data-preset]');if(p)await p.click()}
await sleep(700);
{const start=await page.$('[data-start]');if(start)await start.click()}
try{await page.waitForSelector('[data-play]',{timeout:15000})}catch(_){}
await recordClip('07-scenario-lab',async()=>{await sleep(5200)});

await closeActive();await openTool('TIMEMAP');await sleep(900);
await recordClip('08-weather-time',async()=>{
  await page.evaluate(()=>{const r=document.querySelector('#bp5507-hud [data-range]');if(r){r.value='62';r.dispatchEvent(new Event('input',{bubbles:true}))}});
  await sleep(1400);
  await page.evaluate(()=>{const r=document.querySelector('#bp5507-hud [data-range]');if(r){r.value='30';r.dispatchEvent(new Event('input',{bubbles:true}))}});
  await sleep(1800);
});

await closeActive();await openTool('WIND');await sleep(700);
await recordClip('09-3d-wind',async()=>{
  await sleep(900);
  await page.evaluate(()=>document.querySelector('#bp5507-hud [data-key]')?.click());
  await sleep(2200);
});

await closeActive();await openTool('SPACE_WEATHER');await sleep(900);
await recordClip('10-space-weather',async()=>{await sleep(3900)});

await recordClip('11-source-gated',async()=>{
  await closeActive();await openDrawer();await sleep(700);
  for(const k of ['AIRCRAFT_LIVE','SATELLITES','CAMERAS','GEYSER_VIEW']){
    const b=await page.$('[data-tool="'+k+'"]');if(b){await b.click();await sleep(850)}
  }
  await openDrawer();await sleep(1200);
});

await recordClip('12-space-view',async()=>{
  await closeActive();
  await page.evaluate(()=>{const m=window.__BP_V5000_WORLD.map;try{m.setMinZoom(0)}catch(_){};m.jumpTo({center:[-30,20],zoom:.82,pitch:0,bearing:0})});
  await sleep(550);
  await page.evaluate(()=>{const m=window.__BP_V5000_WORLD.map;m.easeTo({zoom:.66,duration:800})});
  await sleep(1100);
  await page.evaluate(()=>{const host=document.querySelector('#liveMap')?.parentElement||document.querySelector('#liveMap');host?.dispatchEvent(new WheelEvent('wheel',{deltaY:680,bubbles:true,cancelable:true}))});
  await sleep(1800);
  await page.evaluate(()=>{const host=document.querySelector('#liveMap')?.parentElement||document.querySelector('#liveMap');host?.dispatchEvent(new WheelEvent('wheel',{deltaY:250,bubbles:true,cancelable:true}))});
  await sleep(1700);
});
meta.space={captured:true,note:'Space clip completed; browser outro intentionally rendered in post for reliability'};
fs.writeFileSync(path.join(OUT,'capture_meta.json'),JSON.stringify(meta,null,2));
await browser.close().catch(()=>{});
log('CAPTURE_COMPLETE',JSON.stringify(meta));
