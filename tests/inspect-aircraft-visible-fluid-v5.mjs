import {createRequire} from 'node:module';import fs from 'node:fs';
const require=createRequire('/tmp/bp-live-browser.cjs'),puppeteer=require('puppeteer-core');
const out='/tmp/bp-aircraft-visible-fluid-v5';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH,protocolTimeout:120000,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));page.on('console',m=>{if(m.type()==='error'&&errors.length<30)errors.push(m.text().slice(0,400))});
await page.setViewport({width:440,height:900,isMobile:true,hasTouch:true,deviceScaleFactor:1});
try{
 await page.goto('https://bridgepointintelligence.online/?aircraftonetapqa='+Date.now(),{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>!!document.querySelector('[data-bp-drone-awareness-button="1"]')&&window.__BP_DRONE_AWARENESS_V1__?.state?.mapReady,{timeout:90000});
 const snap=()=>page.evaluate(()=>{const api=window.__BP_DRONE_AWARENESS_V1__,m=window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD__?.map;const side=document.querySelector('#bpv-sidecar'),pane=document.querySelector('[data-bpv-pane="drones"]');return {state:api.state,panelOpen:!!side&&!side.hidden&&side.dataset.panel==='drones',paneVisible:!!pane&&!pane.hidden&&!!pane.getClientRects().length,button:document.querySelector('[data-bp-drone-awareness-button="1"]')?.getAttribute('aria-pressed'),layers:(m?.getStyle()?.layers||[]).filter(l=>/bp-aircraft-awareness-live|bp-drone-awareness-.*(live|model)/.test(l.id)).map(l=>[l.id,l.type,l.layout?.visibility])}});
 const before=await snap();if(before.state.enabled)throw Error('Aircraft unexpectedly active before tap');
 await page.evaluate(()=>document.querySelector('[data-bp-drone-awareness-button="1"]').click());
 await page.waitForFunction(()=>window.__BP_DRONE_AWARENESS_V1__?.state?.enabled&&window.__BP_DRONE_AWARENESS_V1__?.state?.layerVisible,{timeout:20000});
 const first=await snap();console.log('BP_AIRCRAFT_FIRST_TAP '+JSON.stringify(first));
 if(first.panelOpen||first.paneVisible||first.button!=='true'||first.state.selectedAircraftGroups.length!==5)throw Error('Nested card or incomplete activation');
 await page.waitForFunction(()=>{const s=window.__BP_DRONE_AWARENESS_V1__?.state;return s?.aircraftPositions>0&&s?.aircraftModelsRendered>0},{timeout:150000}).catch(()=>{});
 const live=await snap();console.log('BP_AIRCRAFT_LIVE '+JSON.stringify(live));console.log('BP_AIRCRAFT_ERRORS '+JSON.stringify(errors));
 await page.screenshot({path:out+'/one-tap.jpg',type:'jpeg',quality:75});
 if(!live.state.aircraftPositions||!live.state.aircraftModelsRendered)throw Error('No live aircraft/model sample received');
 if(live.panelOpen||live.paneVisible)throw Error('Unexpected card after feed loads');
 const globe=await page.evaluate(()=>window.__BP_DRONE_AWARENESS_V1__.diagnostics().flightLodStats);
 console.log('BP_AIRCRAFT_GLOBAL_LOD '+JSON.stringify(globe));
 if(!globe?.locator||globe.detail!==0||globe.vertices>2000000)throw Error('Global render budget failure '+JSON.stringify(globe));
 const fps=await page.evaluate(()=>new Promise(resolve=>{const stamps=[];const start=performance.now();function frame(t){stamps.push(t);if(t-start<2500)requestAnimationFrame(frame);else{const gaps=stamps.slice(1).map((x,i)=>x-stamps[i]);resolve({frames:stamps.length,maxGap:Math.max(...gaps),meanGap:gaps.reduce((a,b)=>a+b,0)/Math.max(1,gaps.length)})}}requestAnimationFrame(frame)}));
 console.log('BP_AIRCRAFT_GLOBAL_FRAME_TIMES '+JSON.stringify(fps));
 const target=await page.evaluate(()=>{const m=window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD__?.map;return m?.querySourceFeatures('bp-aircraft-awareness-live-source-v1')?.find(f=>f.geometry?.type==='Point'&&Number(f.properties?.altitude_meters)>500)?.geometry.coordinates||null});
 if(target){
  for(const z of [8,12,16]){await page.evaluate(({target,z})=>{const m=window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD__?.map;m.stop();m.jumpTo({center:target,zoom:z,pitch:0})},{target,z});await new Promise(r=>setTimeout(r,3500));console.log('BP_AIRCRAFT_CLOSE_LOD '+z+' '+JSON.stringify(await page.evaluate(()=>window.__BP_DRONE_AWARENESS_V1__.diagnostics().flightLodStats)));await page.screenshot({path:out+'/zoom-'+z+'.jpg',type:'jpeg',quality:75});}
 }

 await page.evaluate(()=>document.querySelector('[data-bp-drone-awareness-button="1"]').click());
 const off=await snap();if(off.state.enabled||off.state.layerVisible||off.panelOpen)throw Error('Second tap did not hide aircraft');
 console.log('BP_AIRCRAFT_ONE_TAP_PASS');
}catch(e){console.log('BP_AIRCRAFT_ONE_TAP_FAILURE '+String(e?.stack||e));process.exitCode=1}finally{await browser.close()}
