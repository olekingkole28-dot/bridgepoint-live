(()=>{
'use strict';
const OWNER_KEY='bp_owner_access_token';
const now=()=>Math.floor(Date.now()/1000);
function payload(token){try{const p=String(token||'').split('.')[1];if(!p)return null;const s=p.replace(/-/g,'+').replace(/_/g,'/').padEnd(Math.ceil(p.length/4)*4,'=');return JSON.parse(atob(s))}catch(_){return null}}
function usable(token){const p=payload(token);return !!(token&&p&&Number(p.exp||0)>now()+30)}
function extract(v){const out=[];const add=t=>{if(typeof t==='string'&&t.split('.').length===3)out.push(t)};try{if(typeof v==='string'){add(v);try{v=JSON.parse(v)}catch(_){return out}}if(Array.isArray(v)){for(const x of v)out.push(...extract(x));return out}if(v&&typeof v==='object'){add(v.access_token);add(v.currentSession?.access_token);add(v.session?.access_token);add(v.data?.session?.access_token);add(v.data?.access_token)}}catch(_){}return out}
function candidates(){const found=[];try{for(const store of [sessionStorage,localStorage]){for(let i=0;i<store.length;i++){const k=store.key(i)||'';if(k===OWNER_KEY||k.startsWith('sb-')&&k.endsWith('-auth-token')){for(const t of extract(store.getItem(k)||'')){const p=payload(t);found.push({token:t,exp:Number(p?.exp||0)})}}}}}catch(_){}return found.sort((a,b)=>b.exp-a.exp)}
function findValidToken(){const direct=sessionStorage.getItem(OWNER_KEY)||'';if(usable(direct))return direct;if(direct)sessionStorage.removeItem(OWNER_KEY);const c=candidates().find(x=>usable(x.token));if(c){sessionStorage.setItem(OWNER_KEY,c.token);return c.token}return''}
function prepare(){const t=findValidToken();if(!t)sessionStorage.removeItem(OWNER_KEY);return t}
window.BP_OWNER_SESSION_V624={payload,usable,findValidToken,prepare};
prepare();
})();
