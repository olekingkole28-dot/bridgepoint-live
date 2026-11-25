/* BridgePoint Packages: isolated public catalog card. */
(()=>{'use strict';
if(window.__BP_TOP_PACKAGES_V1__)return;
const id='bp-top-packages-v1',fallback=[
['homeowner','BridgePoint Homeowner',19,190,'Property profiles, map, weather, alerts and favorites.'],
['home','BridgePoint Home',99,990,'Property intelligence, weather, opportunity rankings and saved searches.'],
['solar','BridgePoint Solar',149,1490,'Solar intelligence, property profiles, weather and opportunity signals.'],
['investor','BridgePoint Investor',199,1990,'Market intelligence, climate risk and ranked opportunities.'],
['commercial','BridgePoint Commercial',249,2490,'Business and project profiles, building intelligence, market and insurance risk.'],
['infrastructure','BridgePoint Infrastructure',299,2990,'Infrastructure intelligence, project profiles and digital twins.'],
['all_intelligence','BridgePoint Intelligence Suite',499,4990,'Cross-sector intelligence, claims, weather, markets and workflows.'],
['company','BridgePoint Company',699,6990,'Shared company workspace, team access and intelligence workflows.'],
['pattern_intelligence','BridgePoint Pattern Intelligence',2499,24990,'Institutional and geographic pattern intelligence.']
].map(([package_key,package_name,monthly_price,yearly_price,description])=>({package_key,package_name,monthly_price,yearly_price,description}));
const style=document.createElement('style');style.id=id+'-style';style.textContent=`
#bp-public-account-v4 #bp-top-packages-v1{position:relative;isolation:isolate;overflow:hidden;background:linear-gradient(155deg,#fff5c2 0%,#f8d469 23%,#be7e18 52%,#ffe792 79%,#b87c21 100%);border:1px solid #ffeb9c;color:#352005;font-weight:950;letter-spacing:.045em;box-shadow:0 0 12px #ffce6377,inset 0 1px 1px #fff8d9;animation:bp-pack-float-v1 2.8s ease-in-out infinite}
#bp-top-packages-v1:after{content:'';pointer-events:none;position:absolute;inset:-50% -60%;background:linear-gradient(110deg,transparent 44%,#ffffffa0 50%,transparent 56%);transform:translateX(-60%);animation:bp-pack-shine-v1 4s ease-in-out infinite}
@keyframes bp-pack-float-v1{0%,100%{transform:translateY(0)}50%{transform:translateY(-3px)}}@keyframes bp-pack-shine-v1{0%,55%{transform:translateX(-70%)}85%,100%{transform:translateX(70%)}}
@media(prefers-reduced-motion:reduce){#bp-public-account-v4 #bp-top-packages-v1,#bp-top-packages-v1:after{animation:none}}
#bp-packages-dialog-v1{box-sizing:border-box;width:min(92vw,630px);max-height:min(78dvh,720px);padding:0;border:1px solid #b99043;border-radius:18px;background:#091523;color:#edf6ff;box-shadow:0 20px 90px #000b;font:14px/1.5 system-ui,sans-serif;overflow:hidden;z-index:1600}
#bp-packages-dialog-v1::backdrop{background:#02060ca6;backdrop-filter:blur(4px)}
#bp-packages-dialog-v1[open]{display:flex;flex-direction:column}
#bp-packages-dialog-v1 .bpp-head{flex:none;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:14px 16px;border-bottom:1px solid #64502e;background:#132131}
#bp-packages-dialog-v1 h2{font:900 20px/1.2 system-ui;margin:0;color:#ffe49b}
#bp-packages-dialog-v1 .bpp-count{font-size:12px;color:#bac9d7}
#bp-packages-dialog-v1 .bpp-close,#bp-packages-dialog-v1 .bpp-retry{color:#ffe8ac;background:#243346;border:1px solid #a38247;border-radius:9px;padding:7px 12px;cursor:pointer;font:700 13px system-ui}
#bp-packages-dialog-v1 .bpp-scroll{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;touch-action:pan-y;padding:12px 14px;display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(min(100%,230px),1fr))}
#bp-packages-dialog-v1 .bpp-note{grid-column:1/-1;color:#ccd8e6;font-size:12px;margin:0}
#bp-packages-dialog-v1 article{border:1px solid #6c5939;border-radius:12px;background:linear-gradient(145deg,#182637,#0b1927);padding:13px;min-width:0;overflow-wrap:anywhere}
#bp-packages-dialog-v1 h3{margin:0 0 5px;color:#ffe4a0;font:850 15px/1.3 system-ui}
#bp-packages-dialog-v1 p{margin:5px 0}
#bp-packages-dialog-v1 .bpp-price{font-weight:850;color:#fff1c8}
#bp-packages-dialog-v1 .bpp-meta{color:#9cb2c4;font-size:12px}
#bp-packages-dialog-v1 ul{margin:5px 0;padding-left:18px}
#bp-packages-dialog-v1 .bpp-foot{flex:none;padding:10px 14px;border-top:1px solid #64502e;display:flex;gap:10px;align-items:center;justify-content:space-between}
#bp-packages-dialog-v1 a{color:#ffe49b}
`;document.head.append(style);
let btn=null,dialog=null,list=null,count=null,loading=false,loaded=null;
function node(tag,cls,value){const el=document.createElement(tag);if(cls)el.className=cls;if(value!=null)el.textContent=value;return el}
function rowsOf(payload){const rows=Array.isArray(payload)?payload:payload?.packages;if(!Array.isArray(rows))return [];const unique=new Map();for(const p of rows){if(!p||p.active===false||(!p.package_key&&!p.package_name))continue;unique.set(String(p.package_key||p.package_name),p)}return [...unique.values()]}
function money(v){if(v==null||v==='')return '';const n=Number(v);return Number.isFinite(n)&&n>=0?n.toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:2,minimumFractionDigits:0}):''}
function render(rows,source){list.replaceChildren();count.textContent=source==='live'?rows.length+' packages':rows.length+' published plans · live count unavailable';if(source!=='live')list.append(node('p','bpp-note','The live catalog is temporarily unavailable. These are published pricing-page plans, not the complete current catalog. Tap Retry catalog to refresh.'));
for(const p of rows){const card=node('article');card.append(node('h3','',p.package_name||p.package_key));const prices=[money(p.monthly_price)&&money(p.monthly_price)+'/month',money(p.yearly_price)&&money(p.yearly_price)+'/year'].filter(Boolean);card.append(node('p','bpp-price',prices.join(' · ')||'Pricing on request'));if(p.description)card.append(node('p','',p.description));const meta=[p.package_type,p.delivery_status,p.owner_approval_required?'Approval required':'',Number(p.trial_days)>0?p.trial_days+'-day trial':''].filter(Boolean).map(x=>String(x).replaceAll('_',' '));if(meta.length)card.append(node('p','bpp-meta',meta.join(' · ')));const f=p.features||p.entitlements;if(Array.isArray(f)&&f.length){const ul=node('ul');for(const x of f){const name=typeof x==='string'?x:x?.feature_name||x?.name||x?.title;if(name)ul.append(node('li','',name))}if(ul.childNodes.length)card.append(ul)}list.append(card)}
}
async function load(){if(loading)return;loading=true;try{const api=await import('/world-v2300-config.js?v=6238-pc-runtime');const results=await Promise.allSettled([api.publicRpc('bridgepoint_public_package_catalog_v1054',{},12000),api.publicRpc('bridgepoint_flutter_packages',{},12000)]);const byKey=new Map();for(const r of results)if(r.status==='fulfilled')for(const row of rowsOf(r.value))byKey.set(String(row.package_key||row.package_name),row);if(!byKey.size&&api.token?.()){for(const row of rowsOf(await api.rpc('bridgepoint_flutter_packages',{},12000)))byKey.set(String(row.package_key||row.package_name),row)}if(!byKey.size)throw Error('Catalog unavailable');loaded=[...byKey.values()];render(loaded,'live')}catch(_){if(loaded)render(loaded,'live');else render(fallback,'snapshot')}finally{loading=false}}
function open(){if(!dialog){dialog=node('dialog');dialog.id='bp-packages-dialog-v1';dialog.setAttribute('aria-labelledby','bp-packages-title-v1');const head=node('div','bpp-head'),heading=node('div'),title=node('h2','','BridgePoint Packages');title.id='bp-packages-title-v1';count=node('div','bpp-count','Loading catalog…');heading.append(title,count);const close=node('button','bpp-close','Close ×');close.type='button';close.onclick=()=>dialog.close();head.append(heading,close);list=node('div','bpp-scroll');list.setAttribute('aria-live','polite');const foot=node('div','bpp-foot'),retry=node('button','bpp-retry','Retry catalog');retry.type='button';retry.onclick=()=>void load();const pricing=node('a','','Pricing overview');pricing.href='/pricing.html';foot.append(retry,pricing);dialog.append(head,list,foot);document.body.append(dialog);dialog.addEventListener('close',()=>{btn?.setAttribute('aria-expanded','false');btn?.focus()});dialog.addEventListener('click',e=>{if(e.target!==dialog)return;const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close()})}if(!dialog.open){dialog.showModal();btn?.setAttribute('aria-expanded','true')}if(loaded)render(loaded,'live');else if(!list.childNodes.length)list.append(node('p','bpp-note','Loading all available packages…'));void load()}
function mount(){const host=document.getElementById('bp-public-account-v4');if(!host)return;if(!btn||!btn.isConnected){btn=node('button','','PACKAGES');btn.id=id;btn.type='button';btn.setAttribute('aria-haspopup','dialog');btn.setAttribute('aria-expanded','false');btn.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open()});host.append(btn)}for(const old of document.querySelectorAll('#bpv-dock [data-bpv-action="packages"]'))old.hidden=true}
window.__BP_TOP_PACKAGES_V1__={open,rowsOf};mount();new MutationObserver(mount).observe(document.body,{childList:true,subtree:true});
})();
