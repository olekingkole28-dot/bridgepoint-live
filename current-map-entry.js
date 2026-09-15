(()=>{
'use strict';
const path=location.pathname||'/';
if(path==='/'||path.startsWith('/app/')||path.startsWith('/owner/')||path.startsWith('/admin/'))return;
if(document.querySelector('[data-bp-current-map-entry]'))return;
const style=document.createElement('style');
style.textContent=`.bp-current-map-entry{position:fixed;left:12px;right:12px;bottom:12px;z-index:2147483000;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:12px 14px;border:1px solid rgba(91,205,255,.35);border-radius:14px;background:rgba(3,10,18,.96);box-shadow:0 16px 48px rgba(0,0,0,.38);font:600 13px/1.35 system-ui,-apple-system,Segoe UI,sans-serif;color:#d9edf8}.bp-current-map-entry b{display:block;color:#fff;font-size:14px}.bp-current-map-entry small{display:block;color:#9fb9c9;margin-top:2px}.bp-current-map-entry a{flex:none;padding:10px 13px;border-radius:10px;background:#168df0;color:#fff;text-decoration:none;font-weight:900;white-space:nowrap}.bp-current-map-entry button{border:0;background:transparent;color:#8ca5b4;font-size:18px;cursor:pointer;padding:4px}@media(max-width:640px){.bp-current-map-entry{align-items:flex-start;gap:8px}.bp-current-map-entry small{display:none}.bp-current-map-entry a{padding:9px 10px}}`;
document.head.appendChild(style);
const bar=document.createElement('div');
bar.className='bp-current-map-entry';
bar.setAttribute('data-bp-current-map-entry','1');
bar.innerHTML='<div><b>BridgePoint has moved to the current live map.</b><small>This page stays available for search/research. Open the newest Intelligence experience for the live product.</small></div><a href="/?utm_source=legacy_public_page&utm_medium=internal&utm_campaign=current_map_v5100">OPEN LIVE MAP</a><button type="button" aria-label="Dismiss">×</button>';
bar.querySelector('button')?.addEventListener('click',()=>bar.remove());
document.body.appendChild(bar);
})();