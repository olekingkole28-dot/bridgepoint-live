(()=>{'use strict';
const VERSION=1068;
if(window.BridgePointLanguage?.version>=VERSION)return;

const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const STORAGE='bp-language';
const LEGACY_STORAGE='bp-launch-lang';
const HOST_ID='bpGoogleTranslate1067';
const SELECTOR='data-bp-language';
const FALLBACK=[
 {locale:'en',language_code:'en',native_name:'English',direction:'LTR'},
 {locale:'es',language_code:'es',native_name:'Español',direction:'LTR'},
 {locale:'fr',language_code:'fr',native_name:'Français',direction:'LTR'},
 {locale:'pt-BR',language_code:'pt',native_name:'Português (Brasil)',direction:'LTR'},
 {locale:'de',language_code:'de',native_name:'Deutsch',direction:'LTR'},
 {locale:'it',language_code:'it',native_name:'Italiano',direction:'LTR'},
 {locale:'nl',language_code:'nl',native_name:'Nederlands',direction:'LTR'},
 {locale:'pl',language_code:'pl',native_name:'Polski',direction:'LTR'},
 {locale:'ro',language_code:'ro',native_name:'Română',direction:'LTR'},
 {locale:'ru',language_code:'ru',native_name:'Русский',direction:'LTR'},
 {locale:'uk',language_code:'uk',native_name:'Українська',direction:'LTR'},
 {locale:'tr',language_code:'tr',native_name:'Türkçe',direction:'LTR'},
 {locale:'ar',language_code:'ar',native_name:'العربية',direction:'RTL'},
 {locale:'he',language_code:'he',native_name:'עברית',direction:'RTL'},
 {locale:'hi',language_code:'hi',native_name:'हिन्दी',direction:'LTR'},
 {locale:'bn',language_code:'bn',native_name:'বাংলা',direction:'LTR'},
 {locale:'pa',language_code:'pa',native_name:'ਪੰਜਾਬੀ',direction:'LTR'},
 {locale:'ur',language_code:'ur',native_name:'اردو',direction:'RTL'},
 {locale:'zh-Hans',language_code:'zh',native_name:'简体中文',direction:'LTR'},
 {locale:'zh-Hant',language_code:'zh',native_name:'繁體中文',direction:'LTR'},
 {locale:'ja',language_code:'ja',native_name:'日本語',direction:'LTR'},
 {locale:'ko',language_code:'ko',native_name:'한국어',direction:'LTR'},
 {locale:'vi',language_code:'vi',native_name:'Tiếng Việt',direction:'LTR'},
 {locale:'id',language_code:'id',native_name:'Bahasa Indonesia',direction:'LTR'},
 {locale:'tl',language_code:'tl',native_name:'Filipino / Tagalog',direction:'LTR'},
 {locale:'th',language_code:'th',native_name:'ไทย',direction:'LTR'},
 {locale:'ht',language_code:'ht',native_name:'Kreyòl ayisyen',direction:'LTR'}
];
let languages=FALLBACK.slice();
let current='en';
let observer=null,refreshTimer=0,googleReady=false,googleLoading=false,observerMuteUntil=0;

const ALIAS={
 'pt':'pt-BR','pt-br':'pt-BR','zh-cn':'zh-Hans','zh-hans':'zh-Hans','zh-tw':'zh-Hant','zh-hant':'zh-Hant',
 'fil':'tl','iw':'he'
};
const GOOGLE={'pt-BR':'pt','zh-Hans':'zh-CN','zh-Hant':'zh-TW'};
const MAP={'pt-BR':'pt','zh-Hans':'zh','zh-Hant':'zh','tl':'fil'};
const PROTECTED=[
 'code','pre','kbd','samp','[translate="no"]','[data-no-translate]','.notranslate',
 '#authUserEmail','#pAddress','#pLocation','#pParcel','#previewTitle','#bRecord','#bSource',
 '#bProvSource','#bProvDataset','#bProvLicense','#bProvOriginal','#bProvOriginalUpdated',
 '#bProvParcelSource','.workspace-row h3','.workspace-row p',
 '[data-property-id]','[data-parcel-id]','[data-source-record-id]'
].join(',');

function norm(v){
 const raw=String(v||'').trim();
 if(!raw)return'en';
 const k=raw.toLowerCase();
 const a=ALIAS[k]||raw;
 if(languages.some(x=>x.locale===a))return a;
 const base=a.split('-')[0].toLowerCase();
 return languages.find(x=>String(x.language_code||'').toLowerCase()===base)?.locale||'en';
}
function config(locale=current){return languages.find(x=>x.locale===norm(locale))||languages[0]}
function googleCode(locale=current){const l=norm(locale);return GOOGLE[l]||config(l)?.language_code||l}
function mapCode(locale=current){const l=norm(locale);return MAP[l]||config(l)?.language_code||l.split('-')[0]}
function getCookieTarget(){
 const m=document.cookie.match(/(?:^|;\s*)googtrans=\/en\/([^;]+)/);
 return m?.[1]||'';
}
function setCookie(locale){
 const g=googleCode(locale);
 const value='/en/'+g;
 document.cookie='googtrans='+value+';path=/;max-age=31536000;SameSite=Lax';
 if(/(^|\.)bridgepointintelligence\.online$/i.test(location.hostname)){
   document.cookie='googtrans='+value+';path=/;domain=.bridgepointintelligence.online;max-age=31536000;SameSite=Lax';
 }
}
function clearCookie(){
 for(const domain of ['', '.bridgepointintelligence.online']){
  document.cookie='googtrans=;path=/;'+(domain?'domain='+domain+';':'')+'expires=Thu, 01 Jan 1970 00:00:00 GMT;SameSite=Lax';
 }
}
function authToken(){
 try{
  const app=JSON.parse(localStorage.getItem('bp_auth_v5045')||'null');
  const t=app?.access_token||app?.currentSession?.access_token||app?.session?.access_token;
  if(t)return t;
  for(let i=0;i<localStorage.length;i++){
    const k=localStorage.key(i)||'';
    if(k.startsWith('sb-')&&k.endsWith('-auth-token')){
      const d=JSON.parse(localStorage.getItem(k)||'{}');
      const x=d?.access_token||d?.currentSession?.access_token||d?.session?.access_token;
      if(x)return x;
    }
  }
 }catch(_){}
 return '';
}
async function rpc(name,args={},auth=false){
 const headers={'apikey':KEY,'Content-Type':'application/json','Accept':'application/json'};
 if(auth){const t=authToken();if(!t)return null;headers.Authorization='Bearer '+t}
 const r=await fetch(SUPA+'/rest/v1/rpc/'+name,{method:'POST',headers,body:JSON.stringify(args),cache:'no-store'});
 if(!r.ok)return null;
 return r.json().catch(()=>null);
}
async function hydrateLanguages(){
 try{
  const d=await rpc('bridgepoint_supported_languages_v711',{p_locale:current});
  if(Array.isArray(d?.languages)&&d.languages.length>=27){
   languages=d.languages.map(x=>({
    locale:x.locale,
    language_code:x.language_code,
    native_name:x.native_name||x.english_name||x.locale,
    english_name:x.english_name||x.locale,
    direction:x.direction||'LTR'
   }));
   current=norm(current);
   buildSelector(true);
   applyDocumentLanguage();
  }
 }catch(_){}
}
async function persistRemote(locale){
 try{await rpc('bridgepoint_save_locale_v711',{p_locale:norm(locale)},true)}catch(_){}
}
async function hydrateRemotePreference(){
 if(localStorage.getItem(STORAGE))return;
 try{
  const d=await rpc('bridgepoint_locale_preference_v711',{},true);
  if(d?.preferred_locale){
    current=norm(d.preferred_locale);
    localStorage.setItem(STORAGE,current);
    localStorage.setItem(LEGACY_STORAGE,current);
    applyDocumentLanguage();
    syncSelectors();
    if(current!=='en'){setCookie(current);loadGoogle()}
  }
 }catch(_){}
}
function protectTruth(root=document){
 try{
  const nodes=[];
  if(root?.matches?.(PROTECTED))nodes.push(root);
  root?.querySelectorAll?.(PROTECTED).forEach(x=>nodes.push(x));
  for(const e of nodes){e.classList.add('notranslate');e.setAttribute('translate','no')}
 }catch(_){}
}
function applyDocumentLanguage(){
 const c=config();
 document.documentElement.lang=current;
 document.documentElement.dir=String(c?.direction||'LTR').toUpperCase()==='RTL'?'rtl':'ltr';
 document.documentElement.dataset.bpLocale=current;
 protectTruth(document);
}
function syncSelectors(){
 document.querySelectorAll('select[data-bp-language-select="1"]').forEach(s=>{if([...s.options].some(o=>o.value===current))s.value=current});
}
function buildSelector(force=false){
 let wrap=document.querySelector('['+SELECTOR+'="1"]');
 const mount=document.getElementById('appLanguageMount')||document.querySelector('.app-shell .topbar-actions [data-bp-language-mount="app"]')||document.querySelector('[data-bp-language-mount="app"]');
 if(!wrap){
  wrap=mount||document.createElement('div');
  wrap.classList.add('bp-language','notranslate');
  wrap.dataset.bpLanguage='1';
  wrap.setAttribute('translate','no');
  if(mount)wrap.classList.add('bp-language--topbar'); else document.body.appendChild(wrap);
 }
 let sel=wrap.querySelector('select[data-bp-language-select="1"]');
 if(!sel){
  sel=document.createElement('select');
  sel.dataset.bpLanguageSelect='1';
  sel.setAttribute('aria-label','Select language');
  sel.addEventListener('change',()=>setLanguage(sel.value));
 }
 const sig=languages.map(x=>x.locale+':'+x.native_name).join('|');
 if(force||sel.dataset.sig!==sig){
  sel.replaceChildren(...languages.map(l=>{const o=document.createElement('option');o.value=l.locale;o.textContent=l.native_name||l.english_name||l.locale;return o}));
  sel.dataset.sig=sig;
 }
 wrap.replaceChildren(sel);
 syncSelectors();
 return wrap;
}
function ensureHost(){
 let h=document.getElementById(HOST_ID);
 if(!h){h=document.createElement('div');h.id=HOST_ID;h.className='notranslate';h.setAttribute('translate','no');document.body.appendChild(h)}
 return h;
}
function applyGoogleTarget(){
 if(current==='en')return false;
 const combo=document.querySelector('.goog-te-combo');
 if(!combo)return false;
 const g=googleCode(current);
 if(combo.value!==g)combo.value=g;
 observerMuteUntil=Date.now()+1600;
 combo.dispatchEvent(new Event('change',{bubbles:true}));
 googleReady=true;
 return true;
}
function googleInit(){
 try{
  ensureHost();
  if(!window.google?.translate?.TranslateElement)return;
  const included=[...new Set(languages.filter(x=>x.locale!=='en').map(x=>GOOGLE[x.locale]||x.language_code||x.locale))].join(',');
  new google.translate.TranslateElement({
   pageLanguage:'en',
   includedLanguages:included,
   autoDisplay:false,
   multilanguagePage:true
  },HOST_ID);
  googleReady=true;
  setTimeout(applyGoogleTarget,60);
  setTimeout(applyGoogleTarget,450);
 }catch(e){console.warn('BridgePoint language init',e)}
}
window.bridgepointGoogleTranslateInit1067=googleInit;
function loadGoogle(){
 if(current==='en'||googleLoading||window.google?.translate?.TranslateElement){if(window.google?.translate?.TranslateElement)googleInit();return}
 googleLoading=true;
 ensureHost();
 const s=document.createElement('script');
 s.src='https://translate.google.com/translate_a/element.js?cb=bridgepointGoogleTranslateInit1067';
 s.async=true;
 s.referrerPolicy='no-referrer-when-downgrade';
 s.onload=()=>{googleLoading=false;setTimeout(applyGoogleTarget,100)};
 s.onerror=()=>{googleLoading=false;console.warn('BridgePoint full-page translation engine unavailable')};
 document.head.appendChild(s);
}
function dispatch(){
 const d={version:VERSION,locale:current,languageCode:config()?.language_code||current,direction:config()?.direction||'LTR',mapCode:mapCode()};
 window.dispatchEvent(new CustomEvent('bridgepoint:languagechange',{detail:d}));
}
function setLanguage(locale,{persist=true}={}){
 const next=norm(locale);
 const was=current;
 current=next;
 if(persist){
  localStorage.setItem(STORAGE,current);
  localStorage.setItem(LEGACY_STORAGE,current);
  void persistRemote(current);
 }
 applyDocumentLanguage();
 syncSelectors();
 if(current==='en'){
  const wasTranslated=!!getCookieTarget()||document.documentElement.classList.contains('translated-ltr')||document.documentElement.classList.contains('translated-rtl');
  clearCookie();
  dispatch();
  if(wasTranslated&&was!=='en')setTimeout(()=>location.reload(),30);
  return;
 }
 setCookie(current);
 loadGoogle();
 setTimeout(()=>{if(!applyGoogleTarget()&&!googleLoading)loadGoogle()},250);
 setTimeout(applyGoogleTarget,1000);
 dispatch();
}
function refresh(){
 protectTruth(document);
 syncSelectors();
 if(current!=='en')setTimeout(applyGoogleTarget,80);
}
function startObserver(){
 if(observer)return;
 observer=new MutationObserver(ms=>{
  if(current==='en'||Date.now()<observerMuteUntil)return;
  let relevant=false;
  for(const m of ms){
   if(m.type==='characterData'){
    const p=m.target?.parentElement;
    if(p&&!p.closest?.(PROTECTED))relevant=true;
    continue;
   }
   for(const n of m.addedNodes||[]){
    if(n.nodeType===1){
     protectTruth(n);
     if(!n.matches?.(PROTECTED)&&!n.closest?.(PROTECTED))relevant=true;
    }else if(n.nodeType===3){
     const p=n.parentElement;
     if(p&&!p.closest?.(PROTECTED))relevant=true;
    }
   }
  }
  if(relevant){
   clearTimeout(refreshTimer);
   refreshTimer=setTimeout(()=>applyGoogleTarget(),700);
  }
 });
 observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
}
function mapNameExpression(locale=current){
 const m=mapCode(locale);
 return ['coalesce',['get','name:'+m],['get','name_'+m.replace(/-/g,'_')],['get','name:en'],['get','name_en'],['get','name'],''];
}

current=norm(localStorage.getItem(STORAGE)||localStorage.getItem(LEGACY_STORAGE)||document.documentElement.lang||navigator.language||'en');
window.BridgePointLanguage={
 version:VERSION,
 getLocale:()=>current,
 getLanguage:()=>config(),
 getLanguages:()=>languages.slice(),
 mapCode:()=>mapCode(),
 mapNameExpression,
 setLanguage,
 refresh,
 protectTruth
};
function boot(){
 applyDocumentLanguage();
 buildSelector();
 startObserver();
 void hydrateLanguages();
 void hydrateRemotePreference();
 if(current!=='en'){setCookie(current);loadGoogle()}
 dispatch();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();