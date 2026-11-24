import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire('/tmp/bp-live-browser.cjs'),puppeteer=require('puppeteer-core');
const out='/tmp/bp-aircraft-detail';fs.mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({headless:true,executablePath:process.env.CHROME_PATH,protocolTimeout:120000,args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--ignore-gpu-blocklist','--enable-unsafe-swiftshader','--use-gl=angle','--use-angle=swiftshader']});
const page=await browser.newPage(),errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error'&&errors.length<40)errors.push(m.text().slice(0,500))});
await page.setViewport({width:900,height:700,deviceScaleFactor:1});
try{
 await page.goto('https://bridgepointintelligence.online/?aircraftqa='+Date.now(),{waitUntil:'domcontentloaded',timeout:90000});
 const result=await page.evaluate(async()=>{
 const m=await import('/bridgepoint-aircraft-visuals-v2.js?qa=3'),T=await import('/vendor/three.module.js?v=169-local');
 if(m.AIRCRAFT_VISUAL_VERSION!==3)throw Error('Old aircraft model loaded');
 const renderer=new T.WebGLRenderer({antialias:true});renderer.setSize(900,700);
 const scene=new T.Scene();scene.background=new T.Color(0x152b40);scene.add(new T.AmbientLight(0xffffff,1.7));
 const light=new T.DirectionalLight(0xffffff,3.1);light.position.set(3,-4,7);scene.add(light);
 const variants=[['jet','jumbo'],['jet','widebody'],['jet','narrowbody'],['jet','business'],['helicopter','rescue'],['propeller','turboprop'],['glider','sailplane'],['balloon','balloon'],['drone','general'],['balloon','airship']];
 const stats=[];
 for(let i=0;i<variants.length;i++){
 const [kind,variant]=variants[i],g=m.buildDetailedAirframe(T,kind,variant),mat=m.buildAircraftMaterial(T);
 m.attachInstancedNight(T,g,1);g.getAttribute('aBpNight').setX(0,1);
 const mesh=new T.InstancedMesh(g,mat,1),matrix=new T.Matrix4().makeTranslation((i%2)*3.4-1.7,Math.floor(i/2)*2-4,0);
 mesh.setMatrixAt(0,matrix);mesh.instanceMatrix.needsUpdate=true;mesh.frustumCulled=false;scene.add(mesh);
 stats.push({kind,variant,vertices:g.getAttribute('position').count,parts:g.userData.bpParts,rotors:[...g.getAttribute('aBpRotor').array].filter(x=>x>0).length});
 }
 const camera=new T.PerspectiveCamera(46,900/700,.1,100);camera.up.set(0,0,1);camera.position.set(3,-9,15);camera.lookAt(0,0,0);
 renderer.render(scene,camera);for(const child of scene.children)m.updateAircraftShader(child.material,2.7);renderer.render(scene,camera);
 const png=renderer.domElement.toDataURL();renderer.dispose();
 return {stats,png};
 });
 fs.writeFileSync(out+'/airframes.png',Buffer.from(result.png.split(',')[1],'base64'));delete result.png;
 console.log('BP_AIRCRAFT_MODEL_DETAIL '+JSON.stringify(result));console.log('BP_AIRCRAFT_BROWSER_ERRORS '+JSON.stringify(errors));
 if(result.stats.some(x=>x.vertices<1000||x.parts<5)||errors.some(x=>/Shader Error|shader is not compiled|VALIDATE_STATUS/.test(x)))throw Error('Airframe geometry or shader validation failed');
}catch(e){console.log('BP_AIRCRAFT_QA_FAILURE '+String(e?.stack||e));process.exitCode=1}finally{await browser.close()}
