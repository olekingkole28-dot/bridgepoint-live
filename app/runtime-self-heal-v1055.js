(()=>{
'use strict';
if(window.__bridgepointRuntimeSelfHealV1055)return;window.__bridgepointRuntimeSelfHealV1055=true;
let seq=0,lastRepair={};
function active(){return window.BridgePointSingleShellV1055?.getActive?.()||window.__bridgepointActiveTabV1055||'home'}
function visible(el){if(!el)return false;const s=getComputedStyle(el);return s.display!=='none'&&s.visibility!=='hidden'&&s.opacity!=='0'}
function canRepair(key){const n=Date.now();if(n-(lastRepair[key]||0)<10000)return false;lastRepair[key]=n;return true}
async function repair(tab){if(document.hidden)return;const api=window.BridgePointSingleShellV1055;if(!api)return;if(tab==='home'){const h=document.getElementById('bp-live-home-v984');if(!visible(h)&&canRepair('home'))api.home?.();return}if(tab==='properties'){const p=document.getElementById('bp1042-properties');if(!visible(p)&&canRepair('properties'))api.properties?.();return}if(tab==='work'){const w=document.getElementById('bp1054-work');if(!visible(w)&&canRepair('work'))api.work?.();return}if(tab==='plans'){const p=document.getElementById('bp1042-plans')||document.querySelector('[id*=plans][class*=show]');if(!visible(p)&&canRepair('plans'))api.plans?.();return}if(tab==='map'){const m=document.getElementById('bp974-map-dialog');if(!m?.classList.contains('show')&&canRepair('map'))api.map?.();}}
function schedule(tab){const my=++seq;setTimeout(()=>{if(my===seq&&active()===tab)repair(tab)},2600)}
window.addEventListener('bridgepoint-tab-v1055',e=>schedule(e.detail?.tab||active()));document.addEventListener('visibilitychange',()=>{if(!document.hidden)schedule(active())});window.addEventListener('online',()=>schedule(active()));
// Slow safety sweep only while visible. This replaces the old high-frequency whole-DOM repair behavior.
setInterval(()=>{if(!document.hidden)repair(active())},12000);
window.addEventListener('unhandledrejection',e=>{const msg=String(e.reason?.message||e.reason||'');if(/map|render|surface|navigation|fetch/i.test(msg))schedule(active())});
window.BridgePointRuntimeSelfHealV1055={repair:()=>repair(active()),active};
})();