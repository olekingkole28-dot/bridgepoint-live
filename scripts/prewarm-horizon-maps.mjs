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

async function fetchJson(url,timeoutMs){
  const ac=new AbortController(),timer=setTimeout(()=>ac.abort(),timeoutMs);
  try{
    const r=await fetch(url,{headers:{accept:'application/json','cache-control':'no-cache'},signal:ac.signal});
    if(!r.ok)throw new Error('HTTP '+r.status);
    const body=await r.json();
    if(!body?.complete)throw new Error(body?.error||'incomplete scene');
    return body;
  }finally{clearTimeout(timer)}
}
function endpointUrl(m){
  const u=new URL(ep);
  u.searchParams.set('state',m.state);u.searchParams.set('lat',String(m.lat));u.searchParams.set('lon',String(m.lon));
  u.searchParams.set('span_km',String(m.span));u.searchParams.set('cell_id','HORIZON_MAP_'+m.id.toUpperCase());
  return u;
}
function save(m,body,source){
  const file=path.join(outDir,m.id+'.json');fs.writeFileSync(file,JSON.stringify(body));
  return{id:m.id,ok:true,source,bytes:fs.statSync(file).size,buildings:Number(body.counts?.buildings||0)};
}
const results=new Map();
async function pass(list,timeoutMs,workers,label){
  let cursor=0;
  async function worker(){
    for(;;){
      const i=cursor++;if(i>=list.length)return;const m=list[i];
      try{
        const body=await fetchJson(endpointUrl(m),timeoutMs);
        const row=save(m,body,label);results.set(m.id,row);console.log('PREWARM_OK',label,m.id,row.buildings,row.bytes);
      }catch(e){results.set(m.id,{id:m.id,ok:false,error:String(e?.message||e)});console.warn('PREWARM_RETRY',label,m.id,String(e?.message||e))}
    }
  }
  await Promise.all(Array.from({length:Math.min(workers,list.length||1)},()=>worker()));
}
const failed=()=>presets.filter(m=>!results.get(m.id)?.ok);

await pass(presets,9000,16,'fast');
if(failed().length)await pass(failed(),20000,12,'retry20');
if(failed().length)await pass(failed(),30000,8,'retry30');

// If a live snapshot already exists, never regress that map to a slow function-only load.
for(const m of failed()){
  try{
    const url='https://bridgepointintelligence.online/app/horizon/maps/'+encodeURIComponent(m.id)+'.json?reuse='+Date.now();
    const body=await fetchJson(url,9000),row=save(m,body,'live-fallback');
    results.set(m.id,row);console.log('PREWARM_OK','live-fallback',m.id,row.buildings,row.bytes);
  }catch(e){console.warn('PREWARM_MISS',m.id,String(e?.message||e))}
}
const ordered=presets.map(m=>results.get(m.id)||{id:m.id,ok:false,error:'not attempted'});
const summary={generated_at:new Date().toISOString(),total:presets.length,ok:ordered.filter(x=>x.ok).length,failed:ordered.filter(x=>!x.ok).length,results:ordered};
fs.writeFileSync(path.join(outDir,'index.json'),JSON.stringify(summary));
console.log('HORIZON_MAP_PREWARM',JSON.stringify({total:summary.total,ok:summary.ok,failed:summary.failed}));
if(summary.ok<Math.min(45,presets.length))throw new Error('Too few static Horizon maps: '+summary.ok+'/'+summary.total);
