import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
const b=await chromium.launch({executablePath:'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
try{
 const page=await b.newPage({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,serviceWorkers:'block'});
 const errors=[];
 page.on('pageerror',e=>console.log('PAGE',e.message));
 page.on('console',m=>{if(m.type()==='error'&&/shader|glsl/i.test(m.text()))errors.push(m.text())});
 const root=process.env.BP_SITE;
 const patched=new Set(['bridgepoint-view-v5917.js','bridgepoint-emrf-spectrogram-v1.js','bridgepoint-emrf-starlink-global-v2.js','starlink-orbits-v2.json']);
 await page.route('https://bridgepointintelligence.online/**',async route=>{const u=new URL(route.request().url());const rel=u.pathname.replace(/^\//,'');if(patched.has(rel.split('/').pop())){const f=path.join(root,rel);if(fs.existsSync(f))return route.fulfill({status:200,contentType:rel.endsWith('.json')?'application/json':'text/javascript',body:fs.readFileSync(f)});}return route.continue();});
 await page.goto('https://bridgepointintelligence.online/?emrf-verify=20261124-v4',{waitUntil:'domcontentloaded',timeout:60000});
 await page.waitForFunction(()=>!!(window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD__?.map),null,{timeout:90000});
 await page.waitForFunction(()=>!!document.querySelector('[data-bpv-action="emrf"]'),null,{timeout:60000});
 await page.waitForFunction(()=>{const d=document.getElementById('bpv-dock'),a=document.getElementById('bpv-dock-actions');return d?.classList.contains('bpv-mobile-v2')&&a?.parentElement!==d&&d.contains(a);},null,{timeout:60000});
 console.log('NESTED_MOBILE_DOCK_READY');
 await page.evaluate(()=>document.querySelector('#bpv-v2-tabs button[data-category="environment"],#bpv-v2-tabs button[data-bpv-v2-tab="environment"]')?.click());
 await page.evaluate(()=>document.querySelector('[data-bpv-action="emrf"]').click());
 await page.waitForFunction(()=>window.__BP_EMRF_SPECTROGRAM_V1__?.active&&window.__BP_EMRF_STARLINK_BEAMS_V2__?.state?.beamCount>=2000,null,{timeout:90000});
 const report=await page.evaluate(()=>{
  const api=window.__BP_EMRF_SPECTROGRAM_V1__,star=window.__BP_EMRF_STARLINK_BEAMS_V2__,m=api.map;
  return {mount:api.root.parentElement===document.getElementById('bpv-dock-actions').parentElement,active:api.active,star:star.state,layer:!!m.getLayer('bp-emrf-thousands-starlink-beams-v2'),ground:!!m.getLayer('bp-emrf-starlink-global-ground-heat-v3'),groundVisibility:m.getLayoutProperty('bp-emrf-starlink-global-ground-heat-v3','visibility'),projection:m.getProjection()?.type};
 });
 console.log('EMRF_BUTTON_REPORT',JSON.stringify(report));
 assert(report.mount&&report.active&&report.layer&&report.ground&&report.groundVisibility!=='none'&&report.star.beamCount>=2000);
 await page.evaluate(()=>document.querySelector('[data-bpv-action="emrf"]').click());
 await page.waitForFunction(()=>!window.__BP_EMRF_SPECTROGRAM_V1__?.active,null,{timeout:20000});
 assert(await page.evaluate(()=>!window.__BP_EMRF_SPECTROGRAM_V1__.map.getLayer('bp-emrf-thousands-starlink-beams-v2')));
 console.log('EMRF_NESTED_MOBILE_BUTTON_ON_OFF_PASS',JSON.stringify(errors.slice(0,3)));
} finally {await b.close();}
