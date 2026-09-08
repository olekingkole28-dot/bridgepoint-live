import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';

const targets=(process.env.HEADLESS_TARGETS||'https://www.bridgepointintelligence.com/,https://www.bridgepointintelligence.com/app/').split(',').map(x=>x.trim()).filter(Boolean);
const artifactDir=path.resolve('headless-artifacts');
await fs.mkdir(artifactDir,{recursive:true});

const report={version:2101,generated_at:new Date().toISOString(),targets:[],complete:true};
const browser=await chromium.launch({headless:true});
try{
  for(const url of targets){
    let result={url,ok:false,attempts:0,status:null,title:'',bridgepoint_text:false,page_errors:[],console_errors:[],request_failures:[],elapsed_ms:0};
    for(let attempt=1;attempt<=3&&!result.ok;attempt++){
      result.attempts=attempt;
      const context=await browser.newContext({viewport:{width:1440,height:1000},userAgent:'BridgePointHeadlessSynthetic/2101'});
      const page=await context.newPage();
      const started=Date.now();
      const pageErrors=[];const consoleErrors=[];const requestFailures=[];
      page.on('pageerror',e=>pageErrors.push(String(e?.message||e).slice(0,500)));
      page.on('console',m=>{if(m.type()==='error')consoleErrors.push(m.text().slice(0,500));});
      page.on('requestfailed',r=>requestFailures.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText||'FAILED'}`.slice(0,700)));
      try{
        const response=await page.goto(url,{waitUntil:'domcontentloaded',timeout:45000});
        await page.waitForSelector('body',{state:'attached',timeout:10000});
        await page.waitForTimeout(1500);
        const body=(await page.locator('body').innerText({timeout:10000})).slice(0,250000);
        const title=await page.title();
        const status=response?.status()??0;
        const textOk=/bridgepoint/i.test(body)||/bridgepoint/i.test(title);
        const fatalConsole=consoleErrors.filter(x=>!/favicon|ERR_BLOCKED_BY_CLIENT|ResizeObserver/i.test(x));
        result={url,ok:status>=200&&status<400&&textOk&&pageErrors.length===0,status,title,bridgepoint_text:textOk,page_errors:pageErrors,console_errors:fatalConsole,request_failures:requestFailures.slice(0,25),attempts:attempt,elapsed_ms:Date.now()-started};
        if(!result.ok){
          const safe=new URL(url).pathname.replace(/[^a-z0-9]+/gi,'_')||'root';
          await page.screenshot({path:path.join(artifactDir,`${safe}-attempt-${attempt}.png`),fullPage:true}).catch(()=>{});
        }
      }catch(e){
        result={...result,attempts:attempt,elapsed_ms:Date.now()-started,page_errors:[...pageErrors,String(e?.message||e).slice(0,900)],console_errors:consoleErrors,request_failures:requestFailures.slice(0,25)};
        const safe=new URL(url).pathname.replace(/[^a-z0-9]+/gi,'_')||'root';
        await page.screenshot({path:path.join(artifactDir,`${safe}-attempt-${attempt}.png`),fullPage:true}).catch(()=>{});
      }finally{await context.close();}
      if(!result.ok&&attempt<3)await new Promise(r=>setTimeout(r,2500*attempt));
    }
    report.targets.push(result);
    if(!result.ok)report.complete=false;
  }
}finally{await browser.close();}
await fs.writeFile(path.join(artifactDir,'report.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(!report.complete)process.exitCode=1;
