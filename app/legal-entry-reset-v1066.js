(()=>{
'use strict';
if(window.__bridgepointLegalEntryResetV1066)return;window.__bridgepointLegalEntryResetV1066=true;
const ACCEPT='bp1054_required_legal_acceptance';
function token(){try{const seen=new Set(),walk=o=>{if(!o||typeof o!=='object'||seen.has(o))return null;seen.add(o);if(typeof o.access_token==='string'&&o.access_token.length>30)return o.access_token;for(const v of Object.values(o)){const r=walk(v);if(r)return r;}return null;};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i)||'';if(!/auth|supabase|sb-/i.test(k))continue;try{const r=walk(JSON.parse(localStorage.getItem(k)||'null'));if(r)return r;}catch(_){}}}catch(_){}return null;}
function clear(){if(token())return;try{sessionStorage.removeItem(ACCEPT);}catch(_){}}
function authEntry(el){if(!el)return false;const href=el.getAttribute?.('href')||'';return !!(el.matches?.('[data-signin],[data-create],[data-bp1046-signin],[data-bp1046-create],[data-bp1059-entry],[data-bp1066-entry]')||href.includes('mode=signin')||href.includes('mode=create'));
}
clear();
window.addEventListener('click',e=>{const el=e.target?.closest?.('a,button');if(authEntry(el))clear();},true);
window.BridgePointLegalEntryResetV1066={clear};
})();