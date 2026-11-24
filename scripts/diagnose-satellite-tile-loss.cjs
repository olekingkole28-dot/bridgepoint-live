const puppeteer=require('puppeteer-core');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const b=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
 try{
  const page=await b.newPage();
  await page.setViewport({width:390,height:840,deviceScaleFactor:1,isMobile:true,hasTouch:true});
  const failed=[],status={},resources=[];
  page.on('requestfailed',r=>{if(failed.length<60)failed.push({url:r.url().slice(0,200),error:r.failure()?.errorText})});
  page.on('response',r=>{const u=r.url();if(/earthdata.nasa.gov|arcgisonline.com|nationalmap.gov|hotosm.org/.test(u)){status[r.status()]=(status[r.status()]||0)+1;if(r.status()>=400&&resources.length<80)resources.push({status:r.status(),url:u.slice(0,240)})}});
  await page.setRequestInterception(true);
  page.on('request',request=>{
   if(request.isNavigationRequest()&&request.frame()===page.mainFrame()&&request.url().startsWith('https://bridgepointintelligence.online/')){
    const html=String.raw`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,user-scalable=no"><link rel="stylesheet" href="/vendor/maplibre-gl.css"></head><body style="margin:0;background:#000"><div id="liveMap" style="position:fixed;inset:0;width:100vw;height:100vh"></div><script src="/vendor/maplibre-gl.js?v=524-v5945"></script><script type="module">import {initWorld} from '/world-v2300-map.js?v=atomic-globe-v20261123-v5';window.__BP_STANDALONE_WORLD__=initWorld({containerId:'liveMap',center:[35,-15],zoom:3.0,pitch:0,bearing:0});console.log('SAT_STANDALONE_STARTED',!!window.__BP_STANDALONE_WORLD__?.map);</script></body></html>`;
    return request.respond({status:200,contentType:'text/html',body:html});
   }
   return request.continue();
  });
  await page.goto('https://bridgepointintelligence.online/?satellite_diag='+Date.now(),{waitUntil:'domcontentloaded',timeout:50000});
  await page.waitForFunction(()=>!!(window.__BP_STANDALONE_WORLD__?.map||window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD?.map),{timeout:25000});
  await page.evaluate(()=>{
   const m=window.__BP_STANDALONE_WORLD__?.map||window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD?.map;
   for(const name of ['jumpTo','easeTo','flyTo','rotateTo','panTo','zoomTo','setZoom','setCenter','setBearing','setPitch']){
    const fn=m[name];if(typeof fn!=='function')continue;
    m[name]=function(...args){if(window.__BP_SAT_PROBE_MANUAL__===true)return fn.apply(this,args);return this;}
   }
   m.stop?.();
   window.__BP_SAT_PROBE_LOCKED__=true;
  });
  const introspection=await page.evaluate(()=>{
   const m=window.__BP_STANDALONE_WORLD__?.map||window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD?.map;
   const st=m.style,source=m.getSource('esri');
   const all=Object.getOwnPropertyNames(st),cached=all.filter(k=>/source|tile|cache|style|image|terrain/i.test(k));
   const srckeys=Object.getOwnPropertyNames(source||{});
   const caches={};
   for(const [k,v] of Object.entries(st||{})){
    if(!/cache|source/i.test(k))continue;
    if(v&&typeof v==='object')caches[k]={kind:v.constructor?.name,keys:Object.keys(v).slice(0,18)};
   }
   const tm=st?.tileManagers;const managers={key:Object.keys(tm||{}),type:tm?.constructor?.name||null,inner:{}};for(const [k,v] of Object.entries(tm||{})){if(!v||typeof v!=='object')continue;managers.inner[k]={type:v.constructor?.name,keys:Object.keys(v).slice(0,15),mapSize:v.size||null};}
   return {styleKeys:cached,sourceKeys:srckeys,caches,tileManagers:managers,zoom:m.getZoom(),version:window.maplibregl?.version,buffer: m.getCanvas().getContext('webgl2')?.getContextAttributes()?.preserveDrawingBuffer};
  });
  console.log('SAT_INTROSPECT',JSON.stringify(introspection));
  await page.evaluate(()=>{
   const m=window.__BP_STANDALONE_WORLD__?.map||window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD?.map;
   const gl=m.getCanvas().getContext('webgl2')||m.getCanvas().getContext('webgl'),pixels=new Uint8Array(40*40*4);
   const rows=[];
   m.on('render',()=>{
    const w=gl.drawingBufferWidth,h=gl.drawingBufferHeight;
    if(w<100||h<100)return;
    try{
     gl.readPixels((w-40)>>1,(h-40)>>1,40,40,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
     let br=0;for(let i=0;i<pixels.length;i+=4)br+=(pixels[i]+pixels[i+1]+pixels[i+2])/3;
     const st=m.style;
     let sourceCaches={};
     for(const id of ['nasa','esri','usgs','oam']){
      const cache=st?.tileManagers?.[id];if(!cache)continue;
      const inView=cache._inViewTiles;
      const tiles=inView instanceof Map?[...inView.values()]:Object.values(inView||{});
      const states=tiles.map(t=>t?.state||t?.tile?.state||'unknown');
      sourceCaches[id]={tiles:tiles.length,loaded:states.filter(n=>n==='loaded').length,
       states:states.slice(0,18),cacheSize:cache._outOfViewCache?.size||0,
       sourceLoaded:cache._source?._loaded||false}
     }
     rows.push({t:Math.round(performance.now()),br:Math.round(br/1600),zoom:+m.getZoom().toFixed(3),
      moving:m.isMoving(),st:m.isStyleLoaded(),sourceLoaded:['nasa','esri'].map(id=>m.isSourceLoaded(id)),
      layerVis:['gta-nasa','gta-esri'].map(id=>m.getLayoutProperty(id,'visibility')),
      layerAlpha:['gta-nasa','gta-esri'].map(id=>m.getPaintProperty(id,'raster-opacity')),
      sourceCaches});
     if(rows.length>500)rows.shift();
    }catch(e){if(rows.length<500)rows.push({err:String(e)})}
   });
   window.__BP_SAT_TILE_DIAG__={m,rows};
  });
  const points=[[35,-15,3],[27,-19,5],[28,-18,7],[27,-19,5],[-73,41,1.5]];
  for(const [lng,lat,zoom] of points){
   const start=Date.now();
   await page.evaluate(({lng,lat,zoom})=>{window.__BP_SAT_PROBE_MANUAL__=true;try{window.__BP_SAT_TILE_DIAG__.m.jumpTo({center:[lng,lat],zoom,pitch:0,bearing:0})}finally{window.__BP_SAT_PROBE_MANUAL__=false}},{lng,lat,zoom});
   await sleep(4500);
   const res=await page.evaluate(()=>{
    const p=window.__BP_SAT_TILE_DIAG__;const m=p.m,rows=p.rows.splice(0);
    const st=m.style;
    return {center:m.getCenter().toArray(),zoom:m.getZoom(),frames:rows,
     cacheSummary:Object.getOwnPropertyNames(st).filter(k=>/cache|tilemanager/i.test(k)).map(k=>({key:k,keys:Object.keys(st[k]||{}).slice(0,12)})),
     layerDetails:['gta-nasa','gta-esri'].map(id=>({id,visibility:m.getLayoutProperty(id,'visibility'),opacity:m.getPaintProperty(id,'raster-opacity')}))};
   });
   const compact=res.frames.map(f=>[f.t,f.br,f.zoom,f.moving?1:0,f.sourceLoaded,f.sourceCaches]).slice(-70);
   console.log('SAT_REGION',JSON.stringify({center:res.center,zoom:res.zoom,n:res.frames.length,range:res.frames.length?[Math.min(...res.frames.map(x=>x.br||999)),Math.max(...res.frames.map(x=>x.br||0))]:[],
    cacheSummary:res.cacheSummary,layerDetails:res.layerDetails,
    frames:compact}).slice(0,26000));
  }
  console.log('SAT_ERRORS',JSON.stringify({failed,status,resources}).slice(0,20000));
  await page.close();
 }finally{await b.close()}
})().catch(e=>{console.error('SAT_DIAG_FATAL',e.stack||e);process.exit(1)});