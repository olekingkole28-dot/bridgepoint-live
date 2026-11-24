import {createRequire} from 'node:module';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const require=createRequire('/tmp/bp-live-browser.cjs'),puppeteer=require('puppeteer-core');
const origin='https://bridgepointintelligence.online',out='/tmp/bp-vessel-qa';
fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH,protocolTimeout:120000,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
await page.setViewport({width:920,height:720,deviceScaleFactor:1});
try{
 await page.goto(origin+'/app/?vessel_qa='+Date.now(),{waitUntil:'domcontentloaded',timeout:90000});
 await page.waitForFunction(()=>window.__BP_VESSEL_AWARENESS_V1__?.version===3,{timeout:90000});
 const result=await page.evaluate(async()=>{
  const T=await import('/vendor/three.module.js?v=169-local');
  const source=await (await fetch('/bridgepoint-vessel-awareness-v1.js?v=precision-water-vessels-v20261124-v11')).text();
  // Exercise the actual shipped model constructors in isolation; no test ships
  // are ever inserted into the public map, source or live AIS dataset.
  const marker=source.indexOf("if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot");
  if(marker<0)throw new Error('Cannot isolate vessel geometry');
  const factory=new Function('window','document','return '+source.slice(0,marker)+'return {makeShipGeometry,hullNameGeometry,motionFor};})();');
  const api=factory({},document),stats=[];
  const sc=new T.Scene();sc.background=new T.Color(0x0c4660);
  sc.add(new T.AmbientLight(0xffffff,1.1));const light=new T.DirectionalLight(0xffffff,3);light.position.set(-4,-4,8);sc.add(light);
  const kinds=['cargo','tanker','passenger','fishing','sail','tug','highspeed','other'];
  for(let i=0;i<kinds.length;i++){
   const kind=kinds[i],g=api.makeShipGeometry(T,kind);g.computeBoundingBox();
   const stat={kind,vertices:g.getAttribute('position').count,glassVertices:[...g.getAttribute('shipGlass').array].filter(n=>n>0).length,minZ:g.boundingBox.min.z,maxZ:g.boundingBox.max.z};
   if(stat.vertices<10000||stat.minZ>-.14||stat.maxZ<.15||stat.glassVertices<1)throw new Error('Invalid hull '+JSON.stringify(stat));
   stats.push(stat);
   const mesh=new T.Mesh(g,new T.MeshStandardMaterial({vertexColors:true,metalness:.25,roughness:.42,side:T.DoubleSide}));mesh.position.set((i%2)*2.3-1.15,Math.floor(i/2)*1.1-1.65,0);sc.add(mesh);
  }
  const names=api.hullNameGeometry(T);if(names.getAttribute('uv').count!==names.getAttribute('position').count)throw Error('Hull UV mismatch');
  const a=api.motionFor({mmsi:'geometry-test'},0,12,80),b=api.motionFor({mmsi:'geometry-test'},3,12,80);
  if(a.heave===b.heave||a.roll===b.roll)throw Error('Static vessel motion');
  const r=new T.WebGLRenderer({antialias:true});r.setSize(920,720);r.outputColorSpace=T.SRGBColorSpace;
  const cam=new T.PerspectiveCamera(43,920/720,.01,50);cam.up.set(0,0,1);cam.position.set(3,-5,6);cam.lookAt(0,0,0);r.render(sc,cam);
  const png=r.domElement.toDataURL('image/png');r.dispose();
  return {stats,uvVertices:names.getAttribute('uv').count,motion:[a,b],png};
 });
 fs.writeFileSync(out+'/model-families.png',Buffer.from(result.png.split(',')[1],'base64'));
 delete result.png;console.log('BP_VESSEL_GEOMETRY_PASS '+JSON.stringify(result));
 await page.evaluate(()=>{const api=window.__BP_VESSEL_AWARENESS_V1__;if(!api.state.enabled)void api.toggle()});
 await page.evaluate(()=>window.__BP_V5000_WORLD__?.map?.jumpTo({center:[-122.49,37.82],zoom:10,pitch:0}));
 await new Promise(r=>setTimeout(r,15000));
 const state=await page.evaluate(()=>({state:window.__BP_VESSEL_AWARENESS_V1__.state,diagnostics:window.__BP_VESSEL_AWARENESS_V1__.diagnostics(),water:window.__BP_WATER_ENGINE_V6123__?.surfaceRenderRevision,layers:window.__BP_V5000_WORLD__?.map?.getStyle()?.layers?.filter(l=>/vessel/.test(l.id)).map(l=>({id:l.id,visibility:l.layout?.visibility}))}));
 console.log('BP_LIVE_VESSEL_STATE '+JSON.stringify(state));console.log('BP_VESSEL_PAGE_ERRORS '+JSON.stringify(errors.slice(0,15)));
 await page.screenshot({path:out+'/live-vessel-layer.jpg',type:'jpeg',quality:75});
 assert(state.state.enabled&&state.state.modelLayerReady,'vessel button or 3D layer failed to activate');
 assert(state.layers?.some(l=>l.id==='bp-vessel-class-icons-v2'),'persistent icons missing');
 const target=await page.evaluate(()=>{const m=window.__BP_V5000_WORLD__?.map;return (m?.querySourceFeatures('bp-vessel-live-source-v1',{sourceLayer:'vessels'})||[]).find(f=>f.geometry?.type==='Point'&&Number(f.properties?.length)>=30&&f.properties?.kind==='vessel')?.geometry.coordinates||null});
 if(target){for(const z of [14,17,20]){await page.evaluate(({target,z})=>window.__BP_V5000_WORLD__?.map?.jumpTo({center:target,zoom:z,pitch:45}),{target,z});await new Promise(r=>setTimeout(r,6500));await page.screenshot({path:out+'/actual-ship-z'+z+'.jpg',type:'jpeg',quality:75});console.log('BP_ACTUAL_SHIP_ZOOM '+z+' '+JSON.stringify(await page.evaluate(()=>window.__BP_VESSEL_AWARENESS_V1__?.diagnostics())))}}
 else console.log('BP_NO_LIVE_AIS_SAMPLE_FOR_CLOSEUP');
}catch(e){console.log('BP_VESSEL_QA_FAILURE '+String(e?.stack||e));process.exitCode=1}
finally{await browser.close()}
