const puppeteer=require('puppeteer-core');
const fs=require('node:fs'),assert=require('node:assert/strict');
const moduleSource=fs.readFileSync('release-v2300/world-v2300-map.js','utf8');
const sleep=ms=>new Promise(ok=>setTimeout(ok,ms));
assert.match(moduleSource,/bpFoundation:\{type:'raster',tiles:\[/);
assert.match(moduleSource,/id:'gta-foundation',type:'raster'/);
(async()=>{
 const b=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
 try{
  const p=await b.newPage();
  await p.setViewport({width:390,height:840,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const errors=[],requestCounts={foundation:0,deniedNASA:0,deniedEsri:0};
  p.on('console',msg=>{if(/error/i.test(msg.type())&&errors.length<35)errors.push(msg.text().slice(0,200))});
  p.on('pageerror',e=>{if(errors.length<35)errors.push(String(e.message).slice(0,200))});
  await p.setRequestInterception(true);
  p.on('request',r=>{
   const u=r.url();
   if(r.isNavigationRequest()&&r.frame()===p.mainFrame()&&u.startsWith('https://bridgepointintelligence.online/')){
    const html=`<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/vendor/maplibre-gl.css"></head><body style="margin:0;background:#000"><div id="liveMap" style="position:fixed;inset:0;width:100vw;height:100vh"></div><script src="/vendor/maplibre-gl.js?v=524-v5945"></script><script type="module">import {initWorld} from '/world-v2300-map.js?v=globe-foundation-v6-preview';window.__BP_STANDALONE_WORLD__=initWorld({containerId:'liveMap',center:[27,-19],zoom:3,pitch:0,bearing:0});</script></body></html>`;
    return r.respond({status:200,contentType:'text/html',body:html});
   }
   if(/https:\/\/bridgepointintelligence\.online\/world-v2300-map\.js\?v=globe-foundation-v6-preview/.test(u))
    return r.respond({status:200,contentType:'text/javascript',headers:{'access-control-allow-origin':'*'},body:moduleSource});
   if(u.includes('gibs.earthdata.nasa.gov/')){requestCounts.deniedNASA++;return r.abort('failed');}
   if(u.includes('server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/')){
    if(u.endsWith('/tile/0/0/0')){requestCounts.foundation++;return r.continue();}
    requestCounts.deniedEsri++;return r.abort('failed');
   }
   return r.continue();
  });
  await p.goto('https://bridgepointintelligence.online/?v6_test='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
  await p.waitForFunction(()=>!!window.__BP_STANDALONE_WORLD__?.map,{timeout:35000});
  await p.waitForFunction(()=>window.__BP_STANDALONE_WORLD__?.map?.isSourceLoaded('bpFoundation')===true,{timeout:30000}).catch(()=>{});
  const inspect=async()=>p.evaluate(()=>{
   const m=window.__BP_STANDALONE_WORLD__.map,gl=m.getCanvas().getContext('webgl2')||m.getCanvas().getContext('webgl');
   const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight,pixels=new Uint8Array(20*20*4);
   gl.readPixels((w-20)>>1,(h-20)>>1,20,20,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
   let sum=0;for(let i=0;i<pixels.length;i+=4)sum+=(pixels[i]+pixels[i+1]+pixels[i+2])/3;
   const cm=m.style?.tileManagers?.bpFoundation;
   const tiles=cm?cm._inViewTiles:null;
   return{zoom:m.getZoom(),center:m.getCenter().toArray(),sourceLoaded:['bpFoundation','nasa','esri'].map(id=>m.isSourceLoaded(id)),
    foundationLayer:!!m.getLayer('gta-foundation'),foundationOpacity:m.getPaintProperty('gta-foundation','raster-opacity'),
    foundationSource:m.getSource('bpFoundation')?{maxzoom:m.getSource('bpFoundation').maxzoom,tiles:m.getSource('bpFoundation').tiles}:null,
    inViewKeys:tiles?Object.keys(tiles).slice(0,10):null,
    brightness:Math.round(sum/400),
    guard:window.__BP_ATOMIC_GLOBE_FRAME_V5__?.reason||null,
    errors:window.__BP_MAP_RUNTIME_ERRORS__?.slice(-3)||[]};
  });
  const samples=[];
  samples.push({region:'Africa first',...await inspect()});
  for(const [label,lng,lat,z]of [['Africa coast',31,-20,5],['South Africa',24,-32,7],['US East Coast',-73,41,5],['South America',-62,-13,3],['Africa return',27,-19,5]]){
   await p.evaluate(({lng,lat,z})=>window.__BP_STANDALONE_WORLD__.map.jumpTo({center:[lng,lat],zoom:z,pitch:0,bearing:0}),{lng,lat,z});
   for(let i=0;i<4;i++){await sleep(350);samples.push({region:label,step:i,...await inspect()});}
  }
  console.log('FOUNDATION_STRESS_SAMPLES',JSON.stringify(samples).slice(0,23500));
  console.log('FOUNDATION_REQUESTS',JSON.stringify(requestCounts));
  console.log('FOUNDATION_ERRORS',JSON.stringify(errors.slice(-15)));
  assert.ok(samples.every(x=>x.foundationLayer&&x.foundationSource?.maxzoom===0),'the fixed z0 global image is present at every zoom');
  assert.ok(samples.some(x=>x.sourceLoaded[1]===false&&x.sourceLoaded[2]===false),'high-resolution providers were both missing as intended');
  const bothOut=samples.filter(x=>x.sourceLoaded[1]===false&&x.sourceLoaded[2]===false);
  const brightFrames=bothOut.filter(x=>x.brightness>=24);
  assert.ok(brightFrames.length>=Math.ceil(bothOut.length*.7),'the Earth must stay visible while both detailed satellite sources are unavailable: '+JSON.stringify({out:bothOut.length,bright:brightFrames.length,samples:bothOut.map(x=>x.brightness)}));
  console.log('FOUNDATION_V6_REAL_GLOBE_TILES_STABLE',JSON.stringify({sampled:samples.length,providerOut:bothOut.length,bright:brightFrames.length,z0:requestCounts.foundation}));
  await p.close();
 }finally{await b.close()}
})().catch(e=>{console.error('FOUNDATION_V6_TEST_FAILED',e.stack||e);process.exit(1)});