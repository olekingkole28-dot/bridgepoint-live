(()=>{
'use strict';
if(window.__bridgepointLocaleBridgeV1002)return;
window.__bridgepointLocaleBridgeV1002=true;
const WEB='bpPreferredLocaleV984';
const FLUTTER='flutter.bridgepoint_preferred_locale_v711';
const supported=new Set(['en','es','fr','pt-BR','de','it','nl','pl','ro','ru','uk','tr','ar','he','hi','bn','pa','ur','zh-Hans','zh-Hant','ja','ko','vi','id','tl','th','ht']);
const rtl=new Set(['ar','he','ur']);
function norm(v){
  const raw=String(v??'').trim();
  if(supported.has(raw))return raw;
  const low=raw.toLowerCase();
  for(const x of supported)if(x.toLowerCase()===low)return x;
  if(low.startsWith('zh-tw')||low.startsWith('zh-hk')||low.startsWith('zh-mo'))return'zh-Hant';
  if(low.startsWith('zh'))return'zh-Hans';
  if(low.startsWith('pt'))return'pt-BR';
  const base=low.split(/[-_]/)[0];
  for(const x of supported)if(x.toLowerCase()===base||x.toLowerCase().startsWith(base+'-'))return x;
  return'en';
}
function readFlutter(){
  try{const raw=localStorage.getItem(FLUTTER);if(!raw)return null;const parsed=JSON.parse(raw);return supported.has(parsed)?parsed:null;}catch(_){return null;}
}
function readWeb(){try{const raw=localStorage.getItem(WEB);return raw&&supported.has(raw)?raw:null;}catch(_){return null;}}
function persist(code){
  const c=norm(code);
  try{localStorage.setItem(WEB,c);localStorage.setItem(FLUTTER,JSON.stringify(c));}catch(_){}
  try{document.documentElement.lang=c;document.documentElement.dir=rtl.has(c)?'rtl':'ltr';}catch(_){}
  window.__bridgepointLocaleV1002=c;
  return c;
}
function current(){return readWeb()||readFlutter()||norm(navigator.language||'en');}
persist(current());

document.addEventListener('change',e=>{
  const t=e.target;
  if(!(t instanceof HTMLSelectElement))return;
  if(t.matches('#bp984-entry [data-lang],.bp984-modal select[name="locale"]'))persist(t.value);
},true);
document.addEventListener('submit',e=>{
  const f=e.target;
  if(!(f instanceof HTMLFormElement))return;
  const select=f.querySelector('select[name="locale"]');
  if(select)persist(select.value);else persist(readWeb()||window.__bridgepointLocaleV1002||'en');
},true);
document.addEventListener('click',e=>{
  const t=e.target?.closest?.('#bp984-entry [data-signin],#bp984-entry [data-create],.bp984-modal button[type="submit"]');
  if(t)persist(readWeb()||window.__bridgepointLocaleV1002||'en');
},true);
window.BridgePointLocaleBridgeV1002={persist,current,readWeb,readFlutter,webKey:WEB,flutterKey:FLUTTER};
})();