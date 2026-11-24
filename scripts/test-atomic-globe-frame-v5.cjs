// Integration test: attach the branch's frame shield to the LIVE public MapLibre canvas.
const fs=require('node:fs');
const assert=require('node:assert/strict');
const puppeteer=require('puppeteer-core');
const src=fs.readFileSync('release-v2300/world-v2300-map.js','utf8');
const a=src.indexOf('  function installAtomicSatelliteFramePresentationV5(){');
const b=src.indexOf('\n  installAtomicSatelliteFramePresentationV5();',a);
assert.ok(a>0&&b>a,'V5 shield present in branch');
const definition=src.slice(a,b);
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
(async()=>{
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
 try{
  const page=await browser.newPage();
  await page.setViewport({width:430,height:870,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  page.on('pageerror',e=>console.log('PAGEERROR',e.message.slice(0,200)));
  await page.goto('https://bridgepointintelligence.online/?frame_shield_browser_test='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>!!(window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD?.map),{timeout:35000});
  const install=await page.evaluate(def=>{
   const map=window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD?.map;
   const world=window;
   const gl=map.getCanvas().getContext('webgl2')||map.getCanvas().getContext('webgl');
   const old=gl.readPixels.bind(gl);
   gl.readPixels=function(...args){if(window.__BP_TEST_BLACK_FRAME_V5__===true){args[6].fill(0);return;}return old(...args);};
   Function('map','document','window','performance',def+'\nreturn installAtomicSatelliteFramePresentationV5;')(map,document,window,performance)();
   return {glPreserved:gl.getContextAttributes().preserveDrawingBuffer,
    state:window.__BP_ATOMIC_GLOBE_FRAME_V5__,layer:map.getLayoutProperty('gta-nasa','visibility')};
  },definition);
  console.log('BROWSER_SHIELD_INSTALLED',JSON.stringify(install));
  await page.waitForFunction(()=>window.__BP_ATOMIC_GLOBE_FRAME_V5__?.captures>=1,{timeout:45000,polling:500})
   .catch(()=>console.log('SNAPSHOT_TIMEOUT'));
  const state=await page.evaluate(()=>{
   const x=window.__BP_ATOMIC_GLOBE_FRAME_V5__;
   return x?{captures:x.captures,validFrames:x.validFrames,reason:x.reason,lastCheck:x.lastCheckAt,refAge:x.backupAgeMs}:null;
  });
  console.log('AFTER_WARMUP',JSON.stringify(state));
  assert.ok(state?.captures>=1,'actual live MapLibre canvas was captured');
  const result=await page.evaluate(()=>{
   const m=window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD?.map;
   const original={nasa:m.getLayoutProperty('gta-nasa','visibility'),esri:m.getLayoutProperty('gta-esri','visibility')};
   window.__BP_TEST_BLACK_FRAME_V5__=true;m.fire('render');
   const s=window.__BP_ATOMIC_GLOBE_FRAME_V5__;
   const dark={held:s.held,errors:s.error||null,rejected:s.rejectedDarkFrames,display:document.querySelector('.bp-stable-globe-frame-v5')?.style.display};
   window.__BP_TEST_BLACK_FRAME_V5__=false;m.fire('render');
   const bright={held:s.held,display:document.querySelector('.bp-stable-globe-frame-v5')?.style.display};
   return {dark,bright,original,after:{nasa:m.getLayoutProperty('gta-nasa','visibility'),esri:m.getLayoutProperty('gta-esri','visibility')}};
  });
  console.log('SYNTHETIC_PRODUCTION_GL_BLACK_FRAME',JSON.stringify(result));
  assert.equal(result.dark.held,true,'dark actual WebGL readPixels must be hidden on live MapLibre');
  assert.equal(result.dark.display,'block');
  assert.equal(result.bright.held,false);
  assert.equal(result.bright.display,'none');
  assert.deepEqual(result.after,result.original,'real satellite layers untouched');
  console.log('ATOMIC_GLOBE_V5_REAL_BROWSER_SYNTHETIC_FLICKER_BLOCKED');
  await page.close();
 }finally{await browser.close()}
})().catch(e=>{console.error('ATOMIC_GLOBE_V5_BROWSER_TEST_FAILED',e.stack||e);process.exit(1)});
