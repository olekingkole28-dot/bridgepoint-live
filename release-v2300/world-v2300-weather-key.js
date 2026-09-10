import{VERSION}from'./world-v2300-config.js';

const ITEMS=[
 {section:'Alerts',label:'Tornado warning',detail:'NWS tornado warning / tornado geometry',color:'#ff3c6e',kind:'line'},
 {section:'Alerts',label:'Severe thunderstorm',detail:'NWS severe thunderstorm warning',color:'#ffb84a',kind:'line'},
 {section:'Alerts',label:'Flood warning',detail:'Flash/flood warning or advisory',color:'#34d7ff',kind:'line'},
 {section:'Alerts',label:'Hurricane / tropical',detail:'Tropical cyclone warning or storm position',color:'#d764ff',kind:'line'},
 {section:'Alerts',label:'Other NWS alert',detail:'Other active warning/advisory polygon',color:'#ff9a56',kind:'line'},
 {section:'Fire & earth',label:'Active wildfire perimeter',detail:'Current NIFC/WFIGS fire boundary',color:'#ff7c3d',kind:'fire'},
 {section:'Fire & earth',label:'Thermal hotspot',detail:'NASA FIRMS thermal anomaly — not automatically proof of wildfire',color:'#ff4f29',kind:'heat'},
 {section:'Fire & earth',label:'Containment',detail:'Fire perimeter containment: red → amber → green',color:'linear-gradient(90deg,#ff3b1f,#ffb02d,#75ff8a)',kind:'bar'},
 {section:'Fire & earth',label:'Earthquake',detail:'Recent USGS earthquake; size follows magnitude',color:'#ff4fd6',kind:'dot'},
 {section:'Fire & earth',label:'Burn scar',detail:'Shown only when an authoritative burn-scar source is present',color:'#160d0c',kind:'area'},
 {section:'Live effects',label:'Radar',detail:'NOAA/NWS base reflectivity',color:'linear-gradient(90deg,#2c7cff,#37d5ff,#6cff8b,#ffe65a,#ff8a3d,#ef3f67)',kind:'bar'},
 {section:'Live effects',label:'Rain',detail:'Wind-driven rain particles from live surface conditions',glyph:'╱╱╱',kind:'glyph'},
 {section:'Live effects',label:'Snow',detail:'Fluttering snow particles from live surface conditions',glyph:'❄',kind:'glyph'},
 {section:'Live effects',label:'Hail',detail:'Fast hail particles from live surface conditions',glyph:'●●',kind:'glyph'},
 {section:'Live effects',label:'Cloud / fog',detail:'Atmosphere responds to live cloud cover and visibility',color:'#b8cbd1',kind:'cloud'},
 {section:'Live effects',label:'Wildfire flame',detail:'Animated flame appearance driven by source-backed active fire geometry',color:'linear-gradient(0deg,#ff3b1f,#ff942f,#fff1b0)',kind:'flame'},
 {section:'Live effects',label:'Smoke',detail:'Simulated plume attached to source-backed active wildfire',color:'#8c9699',kind:'cloud'},
 {section:'Live effects',label:'Ash',detail:'Ash particles around source-backed wildfire at close zoom',color:'#55585a',kind:'dot'},
 {section:'Live effects',label:'Tornado cone',detail:'3D cone only where active tornado warning geometry exists',color:'linear-gradient(90deg,#33393d,#b8c2c5)',kind:'bar'},
 {section:'Live effects',label:'Hurricane spiral',detail:'Spiral/eye visualization centered on NOAA/NHC storm position',color:'linear-gradient(90deg,#8099a5,#c6dbe4,#f0fbff)',kind:'bar'},
 {section:'Live effects',label:'Lightning',detail:'Flash appears only when the backend supplies a source-backed strike record',glyph:'⚡',kind:'glyph'},
 {section:'Surface',label:'Flood extent',detail:'Flood-warning geometry / observed water context',color:'#1fb8ff',kind:'area'},
 {section:'Surface',label:'Ice / winter hazard',detail:'Ice, freezing rain, winter storm or snow warning geometry',color:'#caf7ff',kind:'area'},
 {section:'Observations',label:'Temperature station',detail:'Cool blue → warm amber/red by observed temperature',color:'linear-gradient(90deg,#70b8ff,#d4f7ff,#ffcf7e,#ff5c48)',kind:'bar'},
 {section:'Observations',label:'Coastal water level',detail:'Observed NOAA CO-OPS water-level station',color:'#78e8ff',kind:'dot'}
];

function css(){return `
#bp2300WeatherKey{position:absolute;z-index:32;left:10px;bottom:10px;max-width:min(338px,calc(100% - 20px));font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#effcff;pointer-events:none}
#bp2300WeatherKey *{box-sizing:border-box}
#bp2300WeatherKeyToggle{pointer-events:auto;min-height:44px;border:1px solid rgba(88,232,255,.42);border-radius:14px;padding:9px 13px;background:linear-gradient(145deg,rgba(8,27,37,.96),rgba(11,39,50,.94));color:#f1feff;box-shadow:0 8px 24px rgba(0,0,0,.3),0 0 18px rgba(48,211,255,.09);display:flex;align-items:center;gap:9px;font-weight:850;letter-spacing:.01em;touch-action:manipulation}
.bp2300-key-spectrum{width:25px;height:8px;border-radius:999px;background:linear-gradient(90deg,#34d7ff,#d764ff,#ff3c6e,#ffb84a,#75ff8a);box-shadow:0 0 9px rgba(88,233,255,.35)}
#bp2300WeatherKeyPanel{pointer-events:auto;margin-top:7px;width:min(338px,calc(100vw - 20px));max-height:min(62dvh,520px);overflow:auto;overscroll-behavior:contain;border:1px solid rgba(88,232,255,.28);border-radius:16px;background:linear-gradient(155deg,rgba(3,13,20,.97),rgba(8,27,36,.96));box-shadow:0 20px 50px rgba(0,0,0,.5),0 0 25px rgba(48,211,255,.07);backdrop-filter:blur(11px);padding:11px;scrollbar-width:thin}
#bp2300WeatherKeyPanel[hidden]{display:none}
.bp2300-key-head{display:flex;align-items:start;justify-content:space-between;gap:10px;padding:2px 2px 8px}.bp2300-key-head b{font-size:14px}.bp2300-key-head small{display:block;margin-top:2px;color:#8fb0ba;font-size:10px;line-height:1.35}.bp2300-key-close{width:36px;height:36px;flex:0 0 36px;border-radius:10px;border:1px solid rgba(150,236,248,.2);background:#0c222c;color:#eaffff;font-size:20px}
.bp2300-key-section{border-top:1px solid rgba(143,225,239,.1);padding:8px 1px 4px}.bp2300-key-section:first-of-type{border-top:0}.bp2300-key-section h4{margin:0 0 5px;font-size:9px;letter-spacing:.15em;text-transform:uppercase;color:#64e9ff}
.bp2300-key-row{display:grid;grid-template-columns:30px minmax(0,1fr);align-items:center;gap:8px;padding:5px 3px;border-radius:8px}.bp2300-key-row:hover{background:rgba(79,199,220,.055)}.bp2300-key-swatch{display:grid;place-items:center;width:26px;height:17px}.bp2300-key-dot{width:10px;height:10px;border-radius:50%;box-shadow:0 0 7px currentColor}.bp2300-key-line{width:25px;height:3px;border-radius:4px;box-shadow:0 0 6px currentColor}.bp2300-key-area{width:24px;height:14px;border:1px solid rgba(255,255,255,.28);border-radius:4px}.bp2300-key-bar{width:26px;height:7px;border-radius:999px}.bp2300-key-cloud{width:23px;height:11px;border-radius:12px;filter:blur(.4px);opacity:.72}.bp2300-key-fire{width:15px;height:15px;border-radius:11px 11px 11px 2px;transform:rotate(-45deg);box-shadow:0 0 8px currentColor}.bp2300-key-glyph{font-size:15px;font-weight:900;color:#f4fdff;text-shadow:0 0 8px rgba(115,232,255,.45);letter-spacing:-2px}.bp2300-key-copy strong{display:block;font-size:11px;line-height:1.15;color:#f0fcff}.bp2300-key-copy span{display:block;margin-top:1px;font-size:9px;line-height:1.28;color:#91abb4}
.bp2300-key-truth{margin:8px 1px 1px;padding:8px 9px;border-radius:10px;background:rgba(255,210,97,.055);border:1px solid rgba(255,217,110,.14);font-size:9px;line-height:1.4;color:#b8cbd1}.bp2300-key-truth b{color:#ffe08c}
@media(max-width:760px){#bp2300WeatherKey{left:8px;bottom:8px}#bp2300WeatherKeyToggle{min-height:42px;padding:8px 11px;font-size:12px}#bp2300WeatherKeyPanel{max-height:54dvh}.bp2300-key-row{padding:4px 2px}}
@media(max-width:420px){#bp2300WeatherKeyPanel{width:min(326px,calc(100vw - 16px));max-height:50dvh}.bp2300-key-copy span{font-size:8.5px}}
`;}
function swatch(item){
 const bg=item.color||'';
 if(item.kind==='glyph')return `<span class="bp2300-key-swatch"><i class="bp2300-key-glyph">${item.glyph}</i></span>`;
 const cls=item.kind==='line'?'bp2300-key-line':item.kind==='bar'||item.kind==='heat'?'bp2300-key-bar':item.kind==='cloud'?'bp2300-key-cloud':item.kind==='fire'?'bp2300-key-fire':item.kind==='area'?'bp2300-key-area':'bp2300-key-dot';
 return `<span class="bp2300-key-swatch"><i class="${cls}" style="${bg.startsWith('linear-gradient')?`background:${bg}`:`background:${bg};color:${bg}`}"></i></span>`;
}
function panel(){
 const groups=[...new Set(ITEMS.map(x=>x.section))];
 return `<div class="bp2300-key-head"><div><b>Live weather key</b><small>Colors and effects currently used on the BridgePoint world</small></div><button class="bp2300-key-close" type="button" aria-label="Close weather key">×</button></div>${groups.map(g=>`<section class="bp2300-key-section"><h4>${g}</h4>${ITEMS.filter(x=>x.section===g).map(x=>`<div class="bp2300-key-row">${swatch(x)}<div class="bp2300-key-copy"><strong>${x.label}</strong><span>${x.detail}</span></div></div>`).join('')}</section>`).join('')}<div class="bp2300-key-truth"><b>Map truth:</b> animated particles and 3D weather effects visualize source-backed weather or incident data; they are not extra sensor measurements. Lightning and burn scars remain off unless a source actually provides them.</div>`;
}
export function initWeatherKey(map){
 if(window.__bpWeatherKeyV2300)return window.__bpWeatherKeyV2300;
 const shell=document.querySelector('[data-surface="map"] .map-shell')||document.getElementById('liveMap')?.parentElement;if(!shell)return null;
 if(!document.getElementById('bp2300WeatherKeyStyle')){const s=document.createElement('style');s.id='bp2300WeatherKeyStyle';s.textContent=css();document.head.appendChild(s)}
 const root=document.createElement('div');root.id='bp2300WeatherKey';root.innerHTML=`<button id="bp2300WeatherKeyToggle" type="button" aria-expanded="false" aria-controls="bp2300WeatherKeyPanel"><span class="bp2300-key-spectrum"></span><span>Weather key</span></button><div id="bp2300WeatherKeyPanel" role="region" aria-label="BridgePoint live weather key" hidden>${panel()}</div>`;shell.appendChild(root);
 const toggle=root.querySelector('#bp2300WeatherKeyToggle'),p=root.querySelector('#bp2300WeatherKeyPanel'),close=root.querySelector('.bp2300-key-close');let open=false;
 function setOpen(v){open=!!v;p.hidden=!open;toggle.setAttribute('aria-expanded',String(open));return open}
 toggle.addEventListener('click',()=>setOpen(!open));close.addEventListener('click',()=>setOpen(false));document.addEventListener('keydown',e=>{if(e.key==='Escape'&&open)setOpen(false)});
 const api={version:VERSION,requirementKey:'v2300_weather_legend_v1',items:ITEMS,mapLayersChanged:false,webglCanvasesAdded:0,networkRequestsAdded:0,toggle:()=>setOpen(!open),open:()=>setOpen(true),close:()=>setOpen(false),get state(){return{version:VERSION,open,itemCount:ITEMS.length,sections:[...new Set(ITEMS.map(x=>x.section))],nonBlocking:true,preservesWeatherColors:true,mapLayersChanged:false,webglCanvasesAdded:0}}};window.__bpWeatherKeyV2300=api;return api;
}
