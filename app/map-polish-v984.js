(()=>{
'use strict';
if(window.__bridgepointMapPolishV984)return;window.__bridgepointMapPolishV984=true;
const icons={
'🧊':'<svg viewBox="0 0 24 24"><path d="M7 4h10l4 8-4 8H7l-4-8z"/><path d="M7 4l5 8 5-8M7 20l5-8 5 8M3 12h18"/></svg>',
'🌪️':'<svg viewBox="0 0 24 24"><path d="M3 5h18M5 9h14M7 13h10M9 17h6M11 21h2"/></svg>',
'🔥':'<svg viewBox="0 0 24 24"><path d="M12 22c-5 0-8-3.4-8-7.4 0-3.2 2-5.5 5-8.6.1 2.5 1.6 3.4 2.6 3.9.1-3.5 2.3-6.2 4.4-8.4-.1 3.8 4 5.7 4 11.3 0 5.2-3.5 9.2-8 9.2z"/><path d="M12 20c-2.1 0-3.5-1.5-3.5-3.4 0-1.7 1-3 2.7-4.7.2 1.3.8 1.9 1.4 2.4.4-1.6 1.3-2.9 2.2-3.9 0 1.9 1.8 3.1 1.8 5.4 0 2.4-1.8 4.2-4.6 4.2z"/></svg>',
'🌀':'<svg viewBox="0 0 24 24"><path d="M12 12c0-4.8 3.5-8.4 8.5-8.8-2 1.5-2.8 3.5-2.8 5.1 0 3.1 2.3 5.5 5.3 5.6-2.1 4.4-6.2 6.9-10.9 6.9-4.8 0-8.8-2.5-11.1-6.6 2 1.1 4 1.4 5.7.7 2.9-1.1 4.7-2.9 5.3-2.9z"/><circle cx="12" cy="12" r="1.7"/></svg>',
'🌧️':'<svg viewBox="0 0 24 24"><path d="M6 14h11a4 4 0 0 0 .6-7.9A6 6 0 0 0 6.4 8 3 3 0 0 0 6 14z"/><path d="M8 17l-1 3M13 17l-1 3M18 17l-1 3"/></svg>',
'🌊':'<svg viewBox="0 0 24 24"><path d="M2 8c3-3 6-3 9 0s6 3 11 0M2 13c3-3 6-3 9 0s6 3 11 0M2 18c3-3 6-3 9 0s6 3 11 0"/></svg>',
'💨':'<svg viewBox="0 0 24 24"><path d="M3 7h11a3 3 0 1 0-3-3M3 12h16a3 3 0 1 1-3 3M3 17h8"/></svg>',
'⚡':'<svg viewBox="0 0 24 24"><path d="M13 2L5 13h6l-1 9 9-13h-6z"/></svg>',
'❄️':'<svg viewBox="0 0 24 24"><path d="M12 2v20M4 6l16 12M20 6L4 18M8 4l4 3 4-3M8 20l4-3 4 3M3 10l4 2-4 2M21 10l-4 2 4 2"/></svg>',
'🏠':'<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8v10h-6v-6H9v6H3z"/></svg>',
'🏗️':'<svg viewBox="0 0 24 24"><path d="M4 22V3h2v19M6 5h13M9 5l5 5M15 5l-5 5M19 5v9M16 14h6M20 14v5M18 19h4"/></svg>',
'🔑':'<svg viewBox="0 0 24 24"><circle cx="8" cy="9" r="5"/><path d="M12 12l9 9M16 16l2-2M18 18l2-2"/></svg>',
'☀️':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/></svg>',
'●':'<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="6"/></svg>'};
const css=document.createElement('style');css.id='bp984-map-polish-style';css.textContent=`#bp974-map-dialog .intel-marker{display:grid;place-items:center;overflow:hidden}#bp974-map-dialog .intel-marker svg{width:18px;height:18px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}#bp974-map-dialog .intel-marker.signal svg{width:14px;height:14px}#bp974-map-dialog .intel-marker.critical{color:#ff7b7b}#bp974-map-dialog .intel-marker.high{color:#ffd16b}#bp974-map-dialog .intel-marker.mid{color:#69e8ff}#bp974-map-dialog .intel-marker.lower{color:#63e7ad}#bp974-map-dialog .filters{box-shadow:0 12px 35px rgba(0,0,0,.24)}#bp974-map-dialog .chip{transition:transform .15s ease,border-color .15s ease,background .15s ease}#bp974-map-dialog .chip:active{transform:scale(.96)}#bp974-map-dialog .radarbar{box-shadow:0 -12px 32px rgba(0,0,0,.23)}#bp974-map-dialog .state-marker{backdrop-filter:blur(8px)}`;document.head.appendChild(css);
function polishMarker(el){if(el.dataset.bp984Vector==='1')return;const text=(el.textContent||'').trim(),svg=icons[text];if(!svg)return;el.innerHTML=svg;el.dataset.bp984Vector='1';el.setAttribute('aria-label',({ '🧊':'Hail','🌪️':'Tornado','🔥':'Fire / wildfire','🌀':'Hurricane / tropical storm','🌧️':'Rain','🌊':'Flood','💨':'Wind','⚡':'Lightning','❄️':'Snow / ice','🏠':'Roof / property','🏗️':'Permit / construction','🔑':'Ownership transfer','☀️':'Solar','●':'Other intelligence'}[text]||'Intelligence marker'));}
function returnHome(){let ok=false;try{if(typeof window.BridgePointNavigateFlutterTabV984==='function')ok=window.BridgePointNavigateFlutterTabV984('home')===true;}catch(_){}setTimeout(()=>{const tab=typeof window.BridgePointSelectedTabV984==='function'?window.BridgePointSelectedTabV984():null;if(!ok||tab==='map'){location.replace('./?bpv=v984&home=1');}},220);}
function patchDialog(){const d=document.getElementById('bp974-map-dialog');if(!d)return;d.querySelectorAll('.intel-marker').forEach(polishMarker);const close=d.querySelector('[data-close]');if(close&&!close.dataset.bp984Close){const old=close.onclick;close.onclick=e=>{try{old?.call(close,e);}finally{returnHome();}};close.dataset.bp984Close='1';}}
new MutationObserver(patchDialog).observe(document.documentElement,{subtree:true,childList:true});setInterval(patchDialog,900);patchDialog();
})();