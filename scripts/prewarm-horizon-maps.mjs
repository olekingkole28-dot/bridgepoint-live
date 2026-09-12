import fs from 'node:fs';
import path from 'node:path';

const sourcePath=process.argv[2]||'app/horizon-playable/horizon-world.js';
const outDir=process.argv[3]||'site/app/horizon/maps';
const src=fs.readFileSync(sourcePath,'utf8');
const ep=src.match(/const ENDPOINT='([^']+)'/)?.[1];
const arr=src.match(/const MAP_PRESETS=\[([\s\S]*?)\];\nconst MAP_BY_ID/);
if(!ep||!arr)throw new Error('Unable to parse Horizon endpoint/map presets');
const presets=Function('"use strict";return ['+arr[1]+'];')();
fs.mkdirSync(outDir,{recursive:true});

const timeoutMs=28000;
async function fetchOne(m){
  const u=new URL(ep);
  u.searchParams.set('state',m.state);u.searchParams.set('lat',String(m.lat));u.searchParams.set('lon',String(m.lon));
  u.searchParams.set('span_km',String(m.span));u.searchParams.set('cell_id','HORIZON_MAP_'+m.id.toUpperCase());
  const ac=new AbortController();const timer=setTimeout(()=>ac.abort(),timeoutMs);
  try{
    const r=await fetch(u,{headers:{accept:'application/json'},signal:ac.signal});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const body=await r.json();
    if(!body?.complete)throw new Error(body?.error||'incomplete scene');
    fs.writeFileSync(path.join(outDir,m.id+'.json'),JSON.stringify(body));
    return {id:m.id,ok:true,bytes:fs.statSync(path.join(outDir,m.id+'.json')).size,buildings:Number(body.counts?.buildings||0)};
  }finally{clearTimeout(timer)}
}
const results=[];
let cursor=0;
async function worker(){
  for(;;){
    const i=cursor++;if(i>=presets.length)return;
    const m=presets[i];
    try{results[i]=await fetchOne(m);console.log('PREWARM_OK',m.id,results[i].buildings,results[i].bytes)}
    catch(e){results[i]={id:m.id,ok:false,error:String(e?.message||e)};console.warn('PREWARM_SKIP',m.id,results[i].error)}
  }
}
await Promise.all(Array.from({length:Math.min(8,presets.length)},()=>worker()));
const summary={generated_at:new Date().toISOString(),total:presets.length,ok:results.filter(x=>x?.ok).length,failed:results.filter(x=>x&&!x.ok).length,results};
fs.writeFileSync(path.join(outDir,'index.json'),JSON.stringify(summary));
console.log('HORIZON_MAP_PREWARM',JSON.stringify({total:summary.total,ok:summary.ok,failed:summary.failed}));
