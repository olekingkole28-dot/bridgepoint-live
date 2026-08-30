(()=>{
'use strict';
if(window.__bridgepointPreAuthLegalV1059)return;
window.__bridgepointPreAuthLegalV1059=true;
const PROJECT='https://xdfsjztwgsbmabshzsjw.supabase.co';
const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const API=`${PROJECT}/rest/v1/rpc/`;
const ACCEPT_KEY='bp1054_required_legal_acceptance';
const INTENT_KEY='bp1059_entry_intent';
let directStarted=false;
function token(){try{for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(!/auth|supabase|sb-/i.test(k))continue;const raw=localStorage.getItem(k);if(!raw)continue;const x=JSON.parse(raw),seen=new Set(),walk=o=>{if(!o||typeof o!=='object'||seen.has(o))return null;seen.add(o);if(typeof o.access_token==='string'&&o.access_token.length>30)return o.access_token;for(const v of Object.values(o)){const r=walk(v);if(r)return r;}return null;};const r=walk(x);if(r)return r;}}catch(_){}return null;}
function currentAcceptance(){try{return JSON.parse(sessionStorage.getItem(ACCEPT_KEY)||'null');}catch(_){return null;}}
function saveIntent(mode,target){const x={mode:mode==='create'?'create':'signin',target:target||null};try{sessionStorage.setItem(INTENT_KEY,JSON.stringify(x));}catch(_){}return x;}
function readIntent(){try{return JSON.parse(sessionStorage.getItem(INTENT_KEY)||'null');}catch(_){return null;}}
function openAuth(mode='signin',target=null,attempt=0){saveIntent(mode,target);const auth=window.BridgePointAuthV1046;if(!auth?.open){if(attempt<80)return setTimeout(()=>openAuth(mode,target,attempt+1),40);return;}auth.open(mode==='create'?'create':'signin');}
function begin(mode='signin',target=null){openAuth(mode,target);}
async function recordServerAcceptance(){const t=token(),a=currentAcceptance();if(!t||!a?.accepted||!Array.isArray(a.documents)||!a.documents.length)return;try{const c=new AbortController(),tm=setTimeout(()=>c.abort(),9000);const r=await fetch(API+'bridgepoint_accept_legal_v82',{method:'POST',headers:{apikey:KEY,Authorization:`Bearer ${t}`,'Content-Type':'application/json','Cache-Control':'no-cache'},body:JSON.stringify({p_document_keys:a.documents.map(d=>d.document_key),p_acceptance_source:'APP_REQUIRED_GATE'}),signal:c.signal,cache:'no-store'});clearTimeout(tm);if(!r.ok)return;}catch(_){} }
function route(){const t=token(),x=readIntent();if(!t||!x?.target)return;let done=true;if(x.target==='product')window.BridgePointProductToolsV1056?.open?.('geography');else if(x.target==='workflow')window.BridgePointWorkflowToolsV1057?.open?.('watchlists');else if(x.target==='lab')window.BridgePointIntelligenceLabV1058?.open?.('patterns');else if(x.target==='properties')window.BridgePointSingleShellV1055?.properties?.();else done=false;if(done)try{sessionStorage.removeItem(INTENT_KEY);}catch(_){} }
const q=new URLSearchParams(location.search),hash=new URLSearchParams((location.hash||'').replace(/^#/,''));
const recovery=!!hash.get('access_token');
const direct=!recovery&&(q.get('entry')==='1'||q.get('mode')==='signin'||q.get('mode')==='create');
function startDirect(){if(directStarted||!direct||token())return;directStarted=true;openAuth(q.get('mode')==='create'?'create':'signin',readIntent()?.target||null);}
if(direct&&!token())setTimeout(startDirect,0);
document.addEventListener('DOMContentLoaded',startDirect,{once:true});
window.addEventListener('load',()=>{startDirect();void recordServerAcceptance();setTimeout(route,700);});
setTimeout(()=>{startDirect();void recordServerAcceptance();setTimeout(route,400);},300);
window.BridgePointPreAuthLegalV1059={begin,currentAcceptance};
})();
