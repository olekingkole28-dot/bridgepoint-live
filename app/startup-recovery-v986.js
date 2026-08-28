(()=>{
'use strict';
if(window.__bridgepointStartupRecoveryV986)return;
window.__bridgepointStartupRecoveryV986=true;

const ready=()=>!!document.querySelector('flutter-view,flt-glass-pane');
const params=new URLSearchParams(location.search);
let recovered=params.get('bpv')==='v986-recover';

function showRecovery(){
  if(ready()||document.getElementById('bp986-recovery'))return;
  document.getElementById('bp974-cosmos')?.style.setProperty('opacity','.12','important');
  const el=document.createElement('div');
  el.id='bp986-recovery';
  el.style.cssText='position:fixed;z-index:2147483646;inset:0;display:grid;place-items:center;padding:22px;background:rgba(2,6,16,.88);color:#fff;font:650 14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-align:center';
  el.innerHTML='<div style="width:min(440px,100%);padding:22px;border:1px solid rgba(72,225,255,.25);border-radius:20px;background:#071727;box-shadow:0 24px 80px rgba(0,0,0,.5)"><div style="font-size:20px;font-weight:950">BridgePoint is restarting the app</div><div style="margin-top:8px;color:#a9bfd0">The visual background loaded, but the Flutter workspace did not finish mounting. This recovery screen prevents a background-only freeze.</div><button id="bp986-retry" style="margin-top:16px;min-height:46px;padding:0 18px;border:0;border-radius:12px;background:linear-gradient(135deg,#48e1ff,#6c83ff);color:#031018;font-weight:950">Reload BridgePoint</button></div>';
  document.body.appendChild(el);
  el.querySelector('#bp986-retry').onclick=()=>location.replace('./?bpv=v986-recover&t='+Date.now());
}

setTimeout(()=>{
  if(ready())return;
  if(!recovered){
    const u=new URL(location.href);
    u.search='';
    u.searchParams.set('bpv','v986-recover');
    u.searchParams.set('t',String(Date.now()));
    location.replace(u.toString());
    return;
  }
  showRecovery();
},7000);

setTimeout(()=>{ if(!ready())showRecovery(); },14000);
})();
