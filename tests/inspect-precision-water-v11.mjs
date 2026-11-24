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
await page.setViewport({width:440,height:900,deviceScaleFactor:1,isMobile:true,hasTouch:true});
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
  const brief=(v)=>v&&Object.fromEntries(Object.entries(v).filter(([k,a])=>/error|active|enabled|vert|polygon|grid|shader|build|render|frame|wave|draw|relief|anim|surface|context|marine|globalOcean|globalHorizon|continuousOffshore|coastal|localPrecision/i.test(k)&&['string','number','boolean'].includes(typeof a)).slice(0,150));
  const visible=el=>!!el&&!el.hidden&&getComputedStyle(el).display!=='none'&&getComputedStyle(el).visibility!=='hidden'&&el.getBoundingClientRect().width>0;
  let oceanPoints=[];try{oceanPoints=[[-40,20],[-150,20],[0,0]].map(p=>[p,map.queryTerrainElevation(p,{exaggerated:false})])}catch(_){}
  return {url:location.href,zoom:map?.getZoom?.(),pitch:map?.getPitch?.(),center:map?.getCenter?.(),projection:map?.getProjection?.()?.type,canvas:cv&&{width:cv.width,height:cv.height,visibility:cv.style.visibility,transform:cv.style.transform},auth:!!document.querySelector('#authPanel:not([hidden])'),publicButtons:visible(document.querySelector('#bp-public-account-v4')),card:!!document.querySelector('.bpv-command-btn'),spaceButton:visible(document.querySelector('#bpAppSpaceToggleV1')),space:sp?.state,spaceCanvas:visible(document.querySelector('#bpWelcomeSpaceCanvasV6257')),celestial:cel?.state?.()?.viewState,orbit:visible(document.querySelector('#bp-public-orbit-v4')),water:brief(w),terrain,layerInfo,oceanPoints,submerged:window.__BP_WATER_SUBMERGENCE_V2__,dive:window.__BP_UNDERWATER_DIVE_STATE__,sensor:window.__BP_SENSOR_LAYERS_V5945__?.snapshot?.(),mapErrors:window.__BP_MAP_RUNTIME_ERRORS__?.slice(-5)};
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
 await sleep(13000);await snapshot('global-preserved');
 const views=[['offshore-z13',-40,20,13,0],['offshore-z16',-40,20,16,55],['offshore-z18',-40,20,18,55],['coast-z16',-122.51,37.79,16,35],['coast-z19',-122.51,37.79,19,45],['coast-z21',-122.51,37.79,21,45]];
 const states=[];
 for(const [tag,lng,lat,z,pitch] of views){
   await page.evaluate(({lng,lat,z,pitch})=>{const m=window.__BP_V5000_WORLD__?.map;m?.stop();m?.jumpTo({center:[lng,lat],zoom:z,pitch,bearing:0})},{lng,lat,z,pitch});
   await sleep(7000);states.push(await snapshot(tag));
 }
 for(const p of states)if(p.water?.surfaceRenderRevision!==6267||p.water?.shaderError||!p.water?.localPrecisionGeometry||!(p.water?.surfaceVertexCount>0))throw Error('Precision water not active '+JSON.stringify(p.water));
 console.log('BP_PRECISION_WATER_RUNTIME_PASS '+JSON.stringify(states.map(p=>({zoom:p.zoom,pitch:p.pitch,local:p.water.localPrecisionProjection,vertices:p.water.surfaceVertexCount,submerged:p.submerged}))));
 console.log('BP_BROWSER_ERRORS '+JSON.stringify(errors));console.log('BP_BROWSER_NETWORK '+JSON.stringify(network));
}catch(e){console.log('BP_PROBE_FAILURE '+String(e?.stack||e));try{await snapshot('failure')}catch(_){}process.exitCode=1}
finally{await browser.close()}
