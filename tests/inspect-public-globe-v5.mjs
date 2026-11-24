import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire('/tmp/bp-live-browser.cjs');
const puppeteer=require('puppeteer-core');
const base=process.env.BP_ORIGIN||'https://bridgepointintelligence.online';
const out=process.env.BP_SMOKE_OUTPUT||'/tmp/bp-live-browser';
fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH,protocolTimeout:120000,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const page=await browser.newPage();
await page.setViewport({width:920,height:640,deviceScaleFactor:1});
const errors=[],network=[];
page.on('pageerror',e=>{if(errors.length<30)errors.push(String(e))});
page.on('console',m=>{if((m.type()==='error'||m.type()==='warning')&&errors.length<60)errors.push(m.text().slice(0,350))});
page.on('response',r=>{if(/water|relief|space-explorer|welcome-space|terrarium|sensor-layers|map\.js/.test(r.url())&&network.length<65)network.push([r.status(),r.url().slice(0,180)])});
async function snapshot(tag){
 const state=await page.evaluate(()=>{
  const map=window.__BP_V5000_WORLD__?.map||window.__bpWorldV2300?.map||window.__BP_LANDING_WORLD__?.map;
  const w=window.__BP_WATER_ENGINE_APP_V6123__||window.__BP_WATER_ENGINE_V6123__;
  const sp=window.__BP_APP_SPACE_EXPLORER_V1__,cel=window.__BP_WELCOME_SPACE_V6257__;
  const cv=map?.getCanvas?.();
  const layers=map?.getStyle?.()?.layers||[];
  const layerInfo=layers.filter(l=>/water|ocean|gebco|coast|foundation|nasa|esri/.test(l.id)).map(l=>[l.id,l.type,l.layout?.visibility,l.paint?.['fill-opacity']??l.paint?.['raster-opacity']]);
  const terrain=map?.getTerrain?.();
  const brief=(v)=>v&&Object.fromEntries(Object.entries(v).filter(([k,a])=>/error|active|enabled|vertex|polygon|grid|shader|build|render|frame|wave|draw|relief|anim|surface|context|marine/i.test(k)&&['string','number','boolean'].includes(typeof a)).slice(0,85));
  const visible=el=>!!el&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>0;
  let oceanPoints=[];try{oceanPoints=[[-40,20],[-150,20],[0,0]].map(p=>[p,map.queryTerrainElevation(p,{exaggerated:false})])}catch(_){}
  return {url:location.href,zoom:map?.getZoom?.(),pitch:map?.getPitch?.(),center:map?.getCenter?.(),projection:map?.getProjection?.()?.type,canvas:cv&&{width:cv.width,height:cv.height,visibility:cv.style.visibility,transform:cv.style.transform},auth:!!document.querySelector('#authPanel:not([hidden])'),publicButtons:visible(document.querySelector('#bp-public-account-v4')),card:!!document.querySelector('.bpv-command-btn'),spaceButton:visible(document.querySelector('#bpAppSpaceToggleV1')),space:sp?.state,celestial:cel?.state?.()?.viewState,orbit:visible(document.querySelector('#bp-public-orbit-v4')),water:brief(w),terrain,layerInfo,oceanPoints,submerged:window.__BP_WATER_SUBMERGENCE_V2__,dive:window.__BP_UNDERWATER_DIVE_STATE__,sensor:window.__BP_SENSOR_LAYERS_V5945__?.snapshot?.(),mapErrors:window.__BP_MAP_RUNTIME_ERRORS__?.slice(-5)};
 });
 console.log('BP_BROWSER_STATE '+tag+' '+JSON.stringify(state));
 const bytes=await page.screenshot({type:'jpeg',quality:42,path:out+'/'+tag+'.jpg'});
 // A compact inline preview is emitted in chunks so it can be inspected directly.
 const b64=bytes.toString('base64');console.log('BP_JPEG_BEGIN '+tag);for(let i=0;i<b64.length;i+=1800)console.log('BP_JPEG '+b64.slice(i,i+1800));console.log('BP_JPEG_END '+tag);
 return state;
}
try{
 await page.goto(base+'/?bp_visual_probe='+Date.now(),{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>!!window.__BP_V5000_WORLD__?.map,{timeout:90000}).catch(()=>{});
 await sleep(13000);
 await snapshot('global');
 await sleep(2800);await snapshot('global-second');
 if(await page.evaluate(()=>!!window.__BP_APP_SPACE_EXPLORER_V1__?.open)){
  await page.evaluate(()=>{void window.__BP_APP_SPACE_EXPLORER_V1__.open()});
  await sleep(10000);await snapshot('space');
  await page.evaluate(()=>window.__BP_APP_SPACE_EXPLORER_V1__?.close?.());await sleep(700);
 }
 await page.evaluate(()=>{const m=window.__BP_V5000_WORLD__?.map;m?.stop();m?.jumpTo({center:[-40,20],zoom:5,pitch:0,bearing:0})});
 await sleep(6500);await snapshot('ocean-regional');
 await page.evaluate(()=>{const m=window.__BP_V5000_WORLD__?.map;m?.stop();m?.jumpTo({center:[-40,20],zoom:13,pitch:58,bearing:0})});
 await sleep(7000);await snapshot('ocean-close');
 console.log('BP_BROWSER_ERRORS '+JSON.stringify(errors));console.log('BP_BROWSER_NETWORK '+JSON.stringify(network));
}catch(e){console.log('BP_PROBE_FAILURE '+String(e?.stack||e));try{await snapshot('failure')}catch(_){}process.exitCode=1}
finally{await browser.close()}
