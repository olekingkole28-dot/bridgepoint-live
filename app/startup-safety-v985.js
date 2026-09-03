(()=>{
'use strict';
if(window.__bridgepointStartupSafetyV985)return;
window.__bridgepointStartupSafetyV985=true;

function findToken(){
  const seen=new Set();
  const walk=v=>{
    if(v==null||seen.has(v))return null;
    if(typeof v==='object'){
      seen.add(v);
      if(typeof v.access_token==='string'&&v.access_token.length>30)return v.access_token;
      for(const x of Object.values(v)){const h=walk(x);if(h)return h;}
    }
    return null;
  };
  try{
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i)||'';
      if(!/auth|supabase|sb-/i.test(k))continue;
      const raw=localStorage.getItem(k);if(!raw)continue;
      try{const h=walk(JSON.parse(raw));if(h)return h;}catch(_){ }
    }
  }catch(_){ }
  return null;
}

function revealEntryIfNeeded(){
  const entry=document.getElementById('bp984-entry');
  if(!findToken()&&entry&&!entry.classList.contains('show')){
    entry.classList.add('show');
  }
}

function ensureFlutterLoader(){
  if(document.querySelector('script[data-bridgepoint-flutter-v985]'))return;
  if(document.querySelector('flutter-view,flt-glass-pane'))return;
  const s=document.createElement('script');
  s.src='flutter_bootstrap.js?v=985';
  s.async=true;
  s.dataset.bridgepointFlutterV985='1';
  s.onerror=()=>{setTimeout(ensureFlutterLoader,1200);};
  document.body.appendChild(s);
}

function backgroundCleanup(){
  setTimeout(async()=>{
    try{
      if('serviceWorker' in navigator){
        const regs=await Promise.race([
          navigator.serviceWorker.getRegistrations(),
          new Promise(resolve=>setTimeout(()=>resolve([]),1500))
        ]);
        Promise.allSettled((regs||[]).map(r=>r.unregister()));
      }
    }catch(_){ }
    try{
      if('caches' in window){
        const keys=await Promise.race([
          caches.keys(),
          new Promise(resolve=>setTimeout(()=>resolve([]),1500))
        ]);
        Promise.allSettled((keys||[]).map(k=>caches.delete(k)));
      }
    }catch(_){ }
  },2500);
}

ensureFlutterLoader();
setTimeout(ensureFlutterLoader,1800);
setTimeout(ensureFlutterLoader,4200);
setTimeout(revealEntryIfNeeded,650);
setTimeout(revealEntryIfNeeded,1800);
backgroundCleanup();
})();
