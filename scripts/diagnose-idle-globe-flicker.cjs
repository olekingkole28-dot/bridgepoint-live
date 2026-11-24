// Diagnostic only. Measures untouched production rendering without changing the site.
const puppeteer = require('puppeteer-core');
const {PNG}=require('pngjs');
const ORIGIN='https://bridgepointintelligence.online';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const cpu=png=>{
  const p=PNG.sync.read(png);
  const boxes=[[.5,.5],[.5,.42],[.45,.52],[.6,.52],[.38,.4],[.42,.65]];
  let vals=[];
  for(const [fx,fy] of boxes){
    const x=Math.min(p.width-1,Math.floor(fx*p.width)),y=Math.min(p.height-1,Math.floor(fy*p.height));
    const off=(y*p.width+x)*4;
    vals.push(Math.round((p.data[off]+p.data[off+1]+p.data[off+2])/3));
  }
  let total=0,n=0,dark=0;
  const x0=Math.floor(.30*p.width),x1=Math.floor(.7*p.width),y0=Math.floor(.3*p.height),y1=Math.floor(.7*p.height);
  for(let y=y0;y<y1;y+=9)for(let x=x0;x<x1;x+=9){const o=(y*p.width+x)*4,br=(p.data[o]+p.data[o+1]+p.data[o+2])/3;total+=br;n++;if(br<18)dark++}
  return {points:vals,mean:Math.round(total/Math.max(1,n)),darkPct:Math.round(100*dark/Math.max(1,n))};
};
async function main(){
 const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader']});
 try{
 for(const mobile of [false,true]){
  const page=await browser.newPage(), errors=[];
  page.on('pageerror',e=>{if(errors.length<25)errors.push(String(e.message||e).slice(0,220))});
  page.on('console',m=>{if(m.type()==='error'&&errors.length<25)errors.push(m.text().slice(0,220))});
  if(mobile){await page.setUserAgent('Mozilla/5.0 (Linux; Android 16; Pixel 9a) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36');await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true})}
  else await page.setViewport({width:1120,height:760,deviceScaleFactor:1});
  await page.evaluateOnNewDocument(()=>{try{localStorage.setItem('bp_auth_v5045',JSON.stringify({access_token:'bridgepoint-smoke-invalid-token'}))}catch(e){}});
  await page.goto(ORIGIN+'/app/?render_diagnose='+Date.now(),{waitUntil:'domcontentloaded',timeout:45000});
  await page.waitForFunction(()=>window.__BP_V5000_WORLD?.map,{timeout:50000}).catch(()=>{});
  const before=await page.evaluate(()=>{
    const m=window.__BP_V5000_WORLD?.map;
    if(!m)return {map:false,html:document.body.innerText.slice(0,300)};
    const rows=[];
    for(const name of ['setLayoutProperty','setPaintProperty','setStyle','moveLayer','setTerrain','resize','setLight','setSky','setProjection','jumpTo','easeTo','triggerRepaint']){
      if(typeof m[name]!=='function')continue;
      const original=m[name];
      try{m[name]=function(...args){
        if(rows.length<3000)rows.push({at:Math.round(performance.now()),op:name,args:JSON.stringify(args).slice(0,180)});
        return original.apply(this,args);
      }}catch(e){}
    }
    let renders=0,idles=0,sourceData=0,move=0;
    m.on('render',()=>renders++);m.on('idle',()=>idles++);m.on('sourcedata',()=>sourceData++);m.on('move',()=>move++);
    const canvas=m.getCanvas();
    const cssHistory=[];
    let prior='',canvasSizes=[];
    const observe=()=>{
      const style=getComputedStyle(canvas),e={width:canvas.width,height:canvas.height,cssW:style.width,cssH:style.height,display:style.display,opacity:style.opacity,filter:style.filter,transform:style.transform};
      const key=JSON.stringify(e);
      if(key!==prior&&cssHistory.length<100){prior=key;cssHistory.push({at:Math.round(performance.now()),...e})}
    };
    const timer=setInterval(observe,90);observe();
    window.__BP_IDLE_FLICKER_PROBE__={m,rows,cssHistory,getStats:()=>({renders,idles,sourceData,move}),stop:()=>clearInterval(timer)};
    return {map:true,zoom:m.getZoom(),pitch:m.getPitch(),container:canvas.parentElement?.id,srcCount:Object.keys(m.getStyle()?.sources||{}).length,layerCount:m.getStyle()?.layers?.length};
  });
  console.log('PROBE_BOOT',mobile?'MOBILE':'DESKTOP',JSON.stringify(before));
  await sleep(5000);
  const initial=await page.evaluate(()=>({url:location.href,hasMap:!!window.__BP_V5000_WORLD?.map,probe:!!window.__BP_IDLE_FLICKER_PROBE__,gate:!!document.querySelector('[data-surface="account"]')}));console.log('PROBE_INIT',JSON.stringify(initial));
  const samples=[];
  for(let i=0;i<60;i++){
    try{const snap=await page.screenshot({type:'png',captureBeyondViewport:false});samples.push({t:i, ...cpu(snap)})}catch(e){if(errors.length<25)errors.push('screenshot:'+e.message)}
    await sleep(130);
  }
  const after=await page.evaluate(()=>{
    const p=window.__BP_IDLE_FLICKER_PROBE__;
    if(!p)return {probe:false,url:location.href};
    p.stop();
    const counts={},args={};
    for(const r of p.rows){counts[r.op]=(counts[r.op]||0)+1;(args[r.op]||(args[r.op]=[])).push(r.args)}
    const layerChanges=p.rows.filter(r=>r.op==='setLayoutProperty'||r.op==='setPaintProperty'||r.op==='moveLayer'||r.op==='setStyle');
    const m=p.m;
    const diagnostics={water:window.__BP_WATER_ENGINE_APP_V6123__?.state||null,water2:{restored:window.__BP_WATER_ENGINE_APP_V6123__?.glStateRestoredFrames},satellite:window.__BP_SATELLITE_RASTER_VISIBILITY_GUARD_V6217__,cloud:window.__BP_SKY_CLOUDS_V5908__?.state||null};
    return {probe:true,url:location.href,counts,layerChanges:layerChanges.slice(-65),cssHistory:p.cssHistory.slice(-50),stats:p.getStats(),isMoving:m.isMoving(),zoom:m.getZoom(),diagnostics};
  });
  console.log('PROBE_RESULT',mobile?'MOBILE':'DESKTOP',JSON.stringify(after).slice(0,23000));
  console.log('PROBE_SCREENS',mobile?'MOBILE':'DESKTOP',JSON.stringify(samples).slice(0,20000));
  console.log('PROBE_ERRORS',mobile?'MOBILE':'DESKTOP',JSON.stringify(errors));
  await page.close();
 }
 }finally{await browser.close()}
}
main().catch(e=>{console.error('PROBE_FATAL',e.stack||e);process.exit(1)});
