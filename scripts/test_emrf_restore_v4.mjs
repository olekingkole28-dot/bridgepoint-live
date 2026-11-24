import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await b.newPage({viewport:{width:850,height:600},serviceWorkers:'block'});
 const errors=[];
 page.on('pageerror',e=>console.log('PAGE',e.message));
 page.on('console',m=>{if(m.type()==='error'&&/shader|glsl/i.test(m.text()))errors.push(m.text())});
 await page.goto('http://127.0.0.1:8769/index.html',{waitUntil:'domcontentloaded',timeout:45000});
 await page.waitForFunction(()=>!!window.__BP_LANDING_WORLD__?.map,null,{timeout:90000});
 await page.waitForFunction(()=>!!document.querySelector('[data-bpv-action="emrf"]'),null,{timeout:60000});
 await page.evaluate(()=>document.querySelector('[data-bpv-action="emrf"]').click());
 await page.waitForFunction(()=>window.__BP_EMRF_SPECTROGRAM_V1__?.active&&window.__BP_EMRF_STARLINK_BEAMS_V2__?.state?.beamCount>=2000,null,{timeout:90000});
 const report=await page.evaluate(()=>{
  const api=window.__BP_EMRF_SPECTROGRAM_V1__,star=window.__BP_EMRF_STARLINK_BEAMS_V2__,m=api.map;
  return {active:api.active,star:star.state,layer:!!m.getLayer('bp-emrf-thousands-starlink-beams-v2'),ground:!!m.getLayer('bp-emrf-starlink-global-ground-heat-v3'),groundVisibility:m.getLayoutProperty('bp-emrf-starlink-global-ground-heat-v3','visibility'),projection:m.getProjection()?.type};
 });
 console.log('EMRF_BUTTON_REPORT',JSON.stringify(report));
 assert(report.active&&report.layer&&report.ground&&report.groundVisibility!=='none'&&report.star.beamCount>=2000);
 await page.evaluate(()=>document.querySelector('[data-bpv-action="emrf"]').click());
 await page.waitForFunction(()=>!window.__BP_EMRF_SPECTROGRAM_V1__?.active,null,{timeout:20000});
 assert(await page.evaluate(()=>!window.__BP_EMRF_SPECTROGRAM_V1__.map.getLayer('bp-emrf-thousands-starlink-beams-v2')));
 console.log('EMRF_ACTUAL_BUTTON_ON_OFF_PASS',JSON.stringify(errors.slice(0,3)));
} finally {await b.close();}
