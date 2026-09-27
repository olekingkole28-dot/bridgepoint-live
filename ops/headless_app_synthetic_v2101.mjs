import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const VERSION=5823;
const targets=(process.env.HEADLESS_TARGETS||'https://bridgepointintelligence.online/,https://bridgepointintelligence.online/app/').split(',').map(x=>x.trim()).filter(Boolean);
const artifactDir=path.resolve('headless-artifacts');
await fs.mkdir(artifactDir,{recursive:true});
const report={version:VERSION,generated_at:new Date().toISOString(),targets:[],complete:true};
const browser=await chromium.launch({headless:true});

const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const num=s=>Number(String(s||'').replace(/[^0-9.-]/g,''));
async function skipMolly(page){
  await page.waitForFunction(()=>!!window.__BP_WALKTHROUGH_V5539__,{timeout:12000}).catch(()=>{});
  await page.evaluate(()=>{try{window.__BP_WALKTHROUGH_V5539__?.skip?.()}catch(_){}}).catch(()=>{});
  await page.waitForFunction(()=>window.__BP_WALKTHROUGH_V5539__?.active!==true,{timeout:10000}).catch(()=>{});
  const active=await page.evaluate(()=>window.__BP_WALKTHROUGH_V5539__?.active===true).catch(()=>false);
  if(active)throw new Error('MOLLY_WALKTHROUGH_BLOCKING_HEADLESS');
}
async function rootContracts(page){
  await skipMolly(page);
  await page.waitForSelector('#globalCanonicalTile',{timeout:15000});
  await page.waitForFunction(()=>!!window.__BP_HEADLINE_V5822__,{timeout:12000});
  const snap=await page.evaluate(()=>{
    const ids=['landingProperties','landingBuildings','landingAddresses','landingBoundaries','landingGlobalProperties','landingLayouts','landingParts','landingTransport','landingWeatherEvents','landingOpportunityHeroStat'];
    const texts=Object.fromEntries(ids.map(id=>[id,document.getElementById(id)?.textContent?.trim()||'']));
    const h=window.__BP_HEADLINE_V5822__||{};
    return{texts,headline:h,globalCenter:document.getElementById('globalCountryTotal')?.textContent?.trim()||'',oppTotal:document.getElementById('landingOpportunityTotal')?.textContent?.trim()||''};
  });
  for(const [id,v] of Object.entries(snap.texts))if(!v||v==='—'||v==='-'||/^loading/i.test(v))throw new Error('HEADLINE_NOT_INSTANT '+id+'='+v);
  const h=snap.headline,world=Number(h.world_canonical_total||0),us=Number(h.us_canonical_total||0),nonus=Number(h.non_us_canonical_total||0);
  if(!world||world!==us+nonus)throw new Error('WORLD_TOTAL_CONTRACT '+JSON.stringify({world,us,nonus}));
  if(num(snap.texts.landingGlobalProperties)!==world)throw new Error('TOP_GLOBAL_MISMATCH '+JSON.stringify({dom:snap.texts.landingGlobalProperties,world}));
  if(num(snap.globalCenter)!==world)throw new Error('DONUT_GLOBAL_MISMATCH '+JSON.stringify({donut:snap.globalCenter,world}));
  if(num(snap.texts.landingOpportunityHeroStat)!==Number(h.opportunities_total||0)||num(snap.oppTotal)!==Number(h.opportunities_total||0))throw new Error('OPPORTUNITY_TOTAL_MISMATCH '+JSON.stringify({snap}));
  for(const [tile,target] of [['#globalCanonicalTile','#global-coverage'],['#opportunityMetricTile','#opportunities']]){
    await page.locator(tile).click();
    await sleep(900);
    const pos=await page.locator(target).evaluate(el=>{const r=el.getBoundingClientRect();return{top:r.top,height:r.height,vh:innerHeight}});
    if(pos.top>Math.max(180,pos.vh*.32)||pos.top+pos.height<0)throw new Error('METRIC_SCROLL_FAILED '+tile+' '+JSON.stringify(pos));
  }
  const tabs=await page.locator('[data-preview-cap]').count();
  for(let i=0;i<tabs;i++){const b=page.locator('[data-preview-cap]').nth(i);if(await b.isVisible().catch(()=>false))await b.click({timeout:3000}).catch(()=>{});}
  return{world,us,nonus,opportunities:Number(h.opportunities_total||0),headline_cards:Object.keys(snap.texts).length,preview_tabs:tabs};
}
async function appContracts(page){
  await skipMolly(page);
  await page.waitForFunction(()=>!!window.__BP_V5000_WORLD?.map,{timeout:45000});
  await page.waitForFunction(()=>window.__BP_WALKTHROUGH_V5539__?.active!==true,{timeout:8000}).catch(()=>{});
  const open=page.locator('#openPagesNav');
  if(await open.count()&&await open.isVisible().catch(()=>false))await open.click().catch(()=>{});
  const nav=page.locator('#bottomNav [data-nav]');
  const n=await nav.count(),tested=[];
  for(let i=0;i<n;i++){
    const el=nav.nth(i);if(!(await el.isVisible().catch(()=>false)))continue;
    const key=await el.getAttribute('data-nav');await el.click({timeout:5000}).catch(e=>{throw new Error('NAV_CLICK_'+key+' '+e.message)});
    await sleep(180);tested.push(key);
  }
  const molly=await page.evaluate(()=>window.__BP_WALKTHROUGH_V5539__?.active===true);
  if(molly)throw new Error('MOLLY_REACTIVATED_DURING_NAV');
  const shell=await page.evaluate(()=>({frontend:window.__BP_FRONTEND_VERSION,world:window.__BP_WORLD_RENDER_VERSION__,dragPan:window.__BP_V5000_WORLD?.map?.dragPan?.isEnabled?.(),touchZoom:window.__BP_V5000_WORLD?.map?.touchZoomRotate?.isEnabled?.(),canvases:document.querySelectorAll('#liveMap canvas').length}));
  if(!shell.dragPan||!shell.touchZoom||shell.canvases!==1)throw new Error('APP_SHELL_REGRESSION '+JSON.stringify(shell));
  return{nav_tested:tested,shell};
}

try{
  for(const url of targets){
    let result={url,ok:false,attempts:0,status:null,title:'',bridgepoint_text:false,page_errors:[],console_errors:[],request_failures:[],elapsed_ms:0,contracts:null};
    for(let attempt=1;attempt<=2&&!result.ok;attempt++){
      const context=await browser.newContext({viewport:{width:1440,height:1000},userAgent:'BridgePointHeadlessSynthetic/'+VERSION});
      const page=await context.newPage(),started=Date.now(),pageErrors=[],consoleErrors=[],requestFailures=[];
      page.on('pageerror',e=>pageErrors.push(String(e?.message||e).slice(0,500)));
      page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,500));});
      page.on('requestfailed',r=>requestFailures.push((r.method()+' '+r.url()+' :: '+(r.failure()?.errorText||'FAILED')).slice(0,700)));
      try{
        const runUrl=new URL(url);runUrl.searchParams.set('qa','bp-headless-v5824');
        const response=await page.goto(runUrl.toString(),{waitUntil:'domcontentloaded',timeout:45000});
        await page.waitForSelector('body',{state:'attached',timeout:10000});
        const body=(await page.locator('body').innerText({timeout:10000})).slice(0,250000),title=await page.title(),status=response?.status()??0,textOk=/bridgepoint/i.test(body)||/bridgepoint/i.test(title);
        let contracts=null;
        const pth=new URL(url).pathname;
        if(pth==='/'||pth==='')contracts=await rootContracts(page);
        else if(pth.startsWith('/app'))contracts=await appContracts(page);
        const fatalConsole=consoleErrors.filter(x=>!/favicon|ERR_BLOCKED_BY_CLIENT|ResizeObserver/i.test(x));
        const severePage=pageErrors.filter(x=>!/ResizeObserver loop/i.test(x));
        result={url,ok:status>=200&&status<400&&textOk&&severePage.length===0,status,title,bridgepoint_text:textOk,page_errors:severePage,console_errors:fatalConsole,request_failures:requestFailures.slice(0,25),attempts:attempt,elapsed_ms:Date.now()-started,contracts};
        if(!result.ok)throw new Error('SYNTHETIC_CONTRACT_FAILED '+JSON.stringify(result).slice(0,2000));
      }catch(e){
        result={...result,ok:false,attempts:attempt,elapsed_ms:Date.now()-started,page_errors:[...pageErrors,String(e?.message||e).slice(0,1200)],console_errors:consoleErrors,request_failures:requestFailures.slice(0,25)};
        const safe=new URL(url).pathname.replace(/[^a-z0-9]+/gi,'_')||'root';
        await page.screenshot({path:path.join(artifactDir,safe+'-attempt-'+attempt+'.png'),fullPage:true}).catch(()=>{});
      }finally{await context.close();}
      if(!result.ok&&attempt<2)await sleep(2500*attempt);
    }
    report.targets.push(result);if(!result.ok)report.complete=false;
  }
}finally{await browser.close();}
await fs.writeFile(path.join(artifactDir,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.complete)process.exitCode=1;
