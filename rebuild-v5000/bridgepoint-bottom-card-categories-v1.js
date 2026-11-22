(()=>{
'use strict';
const KEY='__BP_BOTTOM_CARD_CATEGORIES_V1__';
if(window[KEY]?.version===1)return;
const CATEGORIES=[
 {id:'explore',label:'Explore',icon:'◈'},
 {id:'weather',label:'Weather',icon:'☁'},
 {id:'property',label:'Property',icon:'⌂'},
 {id:'map',label:'Map',icon:'⌖'},
 {id:'system',label:'System',icon:'⚙'}
];
const ICONS={explore:'◈',weather:'☁',property:'⌂',map:'⌖',system:'⚙'};
const CSS=[
 '#bpv-dock.bpv-futuristic-card-v1{border:1px solid rgba(83,222,255,.5)!important;border-radius:20px!important;background:linear-gradient(158deg,rgba(7,23,37,.97),rgba(3,9,18,.98) 72%)!important;box-shadow:0 20px 58px rgba(0,0,0,.52),inset 0 1px rgba(210,248,255,.1),0 0 28px rgba(41,177,224,.12)!important;backdrop-filter:blur(20px) saturate(1.3)!important}',
 '#bpv-dock.bpv-futuristic-card-v1 .bpv-dock-label{border-bottom:1px solid rgba(111,211,245,.18)!important}',
 '#bpv-dock .bpv-card-category-nav-v1{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:7px 0 9px;padding:0 1px}',
 '#bpv-dock .bpv-card-category-tab-v1{--bpv-tab:#74ddff;display:flex;align-items:center;justify-content:center;gap:6px;min-width:0;min-height:40px;padding:6px 7px;border:1px solid rgba(139,205,235,.2);border-radius:12px;background:linear-gradient(145deg,rgba(15,34,49,.94),rgba(6,14,25,.96));color:#d8eaf3;font:800 10px/1 system-ui,sans-serif;letter-spacing:.055em;text-transform:uppercase;white-space:nowrap;box-shadow:inset 0 1px rgba(255,255,255,.06);transition:transform .16s ease,border-color .16s ease,background .16s ease,box-shadow .16s ease}',
 '#bpv-dock .bpv-card-category-tab-v1[data-bpv-card-tab="explore"]{--bpv-tab:#c18bff}',
 '#bpv-dock .bpv-card-category-tab-v1[data-bpv-card-tab="weather"]{--bpv-tab:#4be8c2}',
 '#bpv-dock .bpv-card-category-tab-v1[data-bpv-card-tab="property"]{--bpv-tab:#ffc86b}',
 '#bpv-dock .bpv-card-category-tab-v1[data-bpv-card-tab="map"]{--bpv-tab:#65a9ff}',
 '#bpv-dock .bpv-card-category-tab-v1[data-bpv-card-tab="system"]{--bpv-tab:#ff829a}',
 '#bpv-dock .bpv-card-category-tab-v1 .bpv-card-category-icon-v1{display:inline-flex;align-items:center;justify-content:center;flex:0 0 23px;width:23px;height:23px;border:1px solid color-mix(in srgb,var(--bpv-tab) 52%,transparent);border-radius:8px;background:color-mix(in srgb,var(--bpv-tab) 14%,transparent);color:var(--bpv-tab);font-size:15px;line-height:1;box-shadow:0 0 12px color-mix(in srgb,var(--bpv-tab) 19%,transparent)}',
 '#bpv-dock .bpv-card-category-tab-v1[aria-selected="true"]{border-color:color-mix(in srgb,var(--bpv-tab) 75%,transparent);background:linear-gradient(145deg,color-mix(in srgb,var(--bpv-tab) 22%,#0b1928),rgba(4,12,21,.98));color:#f4fcff;box-shadow:0 0 16px color-mix(in srgb,var(--bpv-tab) 18%,transparent),inset 0 1px rgba(255,255,255,.12)}',
 '#bpv-dock .bpv-card-category-tab-v1:focus-visible,#bpv-dock .bpv-v2-tool-button:focus-visible{outline:2px solid #e9fbff;outline-offset:2px}',
 '#bpv-dock #bpv-dock-actions.bpv-command-groups{gap:7px!important;align-items:stretch!important}',
 '#bpv-dock #bpv-dock-actions .bpv-v2-tool-button{--bpv-action:#83dfff;position:relative;display:flex!important;align-items:center;justify-content:flex-start;gap:9px;min-width:0;min-height:47px;padding:7px 9px!important;overflow:hidden;border:1px solid rgba(124,197,228,.24)!important;border-radius:13px!important;background:linear-gradient(145deg,rgba(14,33,48,.96),rgba(5,14,24,.98))!important;color:#e7f5fb!important;text-align:left;font:750 11px/1.2 system-ui,sans-serif!important;letter-spacing:.01em;box-shadow:inset 0 1px rgba(255,255,255,.055),0 6px 16px rgba(0,0,0,.19)!important;transition:transform .15s ease,border-color .15s ease,box-shadow .15s ease}',
 '#bpv-dock #bpv-dock-actions .bpv-v2-tool-button[data-bpv-card-category="explore"]{--bpv-action:#c18bff}',
 '#bpv-dock #bpv-dock-actions .bpv-v2-tool-button[data-bpv-card-category="weather"]{--bpv-action:#4be8c2}',
 '#bpv-dock #bpv-dock-actions .bpv-v2-tool-button[data-bpv-card-category="property"]{--bpv-action:#ffc86b}',
 '#bpv-dock #bpv-dock-actions .bpv-v2-tool-button[data-bpv-card-category="map"]{--bpv-action:#65a9ff}',
 '#bpv-dock #bpv-dock-actions .bpv-v2-tool-button[data-bpv-card-category="system"]{--bpv-action:#ff829a}',
 '#bpv-dock #bpv-dock-actions .bpv-v2-tool-button:hover{transform:translateY(-1px);border-color:color-mix(in srgb,var(--bpv-action) 68%,transparent)!important;box-shadow:0 7px 19px rgba(0,0,0,.25),0 0 13px color-mix(in srgb,var(--bpv-action) 13%,transparent)!important}',
 '#bpv-dock #bpv-dock-actions .bpv-v2-tool-button .bpv-command-icon,#bpv-dock #bpv-dock-actions .bpv-v2-tool-button .bpv-v2-icon{display:inline-flex;align-items:center;justify-content:center;flex:0 0 30px;width:30px;height:30px;min-width:30px;margin:0;border:1px solid color-mix(in srgb,var(--bpv-action) 55%,transparent);border-radius:10px;background:color-mix(in srgb,var(--bpv-action) 13%,rgba(2,10,19,.8));color:var(--bpv-action)!important;font-size:17px;line-height:1;box-shadow:0 0 12px color-mix(in srgb,var(--bpv-action) 16%,transparent)}',
 '#bpv-dock #bpv-dock-actions .bpv-v2-tool-button .bpv-command-label{min-width:0;color:#edf8fc!important;font-weight:800;line-height:1.16}',
 '#bpv-dock #bpv-dock-actions .bpv-card-category-hidden{display:none!important}',
 '#bpv-dock #bpv-dock-actions .bpv-command-group [class*="note"],#bpv-dock #bpv-dock-actions .bpv-command-group [class*="status"],#bpv-dock #bpv-dock-actions .bpv-command-group [class*="count"],#bpv-dock #bpv-dock-actions .bpv-command-group [class*="counter"],#bpv-dock #bpv-dock-actions .bpv-command-group [class*="description"],#bpv-dock #bpv-dock-actions .bpv-command-group [class*="subtitle"],#bpv-dock #bpv-dock-actions .bpv-command-group [class*="caption"],#bpv-dock #bpv-dock-actions .bpv-command-group [aria-live]{display:none!important}',
 '#bpv-dock .bpv-dock-window-actions button{border:1px solid rgba(91,213,247,.3)!important;border-radius:10px!important;background:linear-gradient(145deg,rgba(18,43,60,.95),rgba(6,15,25,.98))!important;color:#dff8ff!important;font-weight:800!important;box-shadow:inset 0 1px rgba(255,255,255,.07)!important}',
 '#bpv-dock #bp-world-time-slider-v5908{grid-column:1/-1!important}',
 '#bpv-dock #bp-world-time-slider-v5908 .bpwt-eyebrow,#bpv-dock #bp-world-time-slider-v5908 .bpwt-status,#bpv-dock #bp-world-time-slider-v5908 .bpwt-date,#bpv-dock #bp-world-time-slider-v5908 .bpwt-scale,#bpv-dock #bp-world-time-slider-v5908 .bpwt-stats,#bpv-dock #bp-world-time-slider-v5908 .bpwt-filters,#bpv-dock #bp-world-time-slider-v5908 .bpwt-list,#bpv-dock #bp-world-time-slider-v5908 .bpwt-note{display:none!important}',
 '#bpv-dock #bp-world-time-slider-v5908 input[data-slider]{accent-color:#5be6d1}',
 '#bpv-dock #bp-world-time-slider-v5908 .bpwt-controls button{border:1px solid rgba(91,213,247,.25)!important;border-radius:10px!important;background:linear-gradient(145deg,rgba(13,34,49,.96),rgba(5,13,23,.98))!important;color:#e8f6fb!important;font-weight:800!important}',
 '#bpv-dock #bp-world-time-slider-v5908 .bpwt-controls button[data-live]::first-letter{color:#4be8c2}',
 '#bpv-dock #bp-world-time-slider-v5908 .bpwt-controls button[data-play]::first-letter{color:#ffc86b}',
 '#bpv-dock #bp-world-time-slider-v5908 .bpwt-controls button[data-skyview]::first-letter{color:#c18bff}',
 '#bpv-dock #bp-world-time-slider-v5908 .bpwt-controls button[data-refresh]::first-letter{color:#65a9ff}',
 '@media(max-width:700px){#bpv-dock .bpv-card-category-nav-v1{grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin:6px 0 8px}#bpv-dock .bpv-card-category-tab-v1{min-height:38px;padding:5px 6px;font-size:9px;gap:5px}#bpv-dock .bpv-card-category-tab-v1 .bpv-card-category-icon-v1{flex-basis:22px;width:22px;height:22px;font-size:14px}html body.bpv-view-ready #bpv-dock .bpv-dock-actions.bpv-command-groups{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:6px!important}#bpv-dock #bpv-dock-actions .bpv-v2-tool-button{min-height:45px;padding:6px 7px!important;gap:7px;font-size:10px!important}#bpv-dock #bpv-dock-actions .bpv-v2-tool-button .bpv-command-icon,#bpv-dock #bpv-dock-actions .bpv-v2-tool-button .bpv-v2-icon{flex-basis:27px;width:27px;height:27px;min-width:27px;font-size:16px}}'
].join('');
let style=null,nav=null,dock=null,actions=null,observer=null,rootObserver=null,scheduled=false,active='explore';
const state={version:1,ready:false,activeCategory:active,buttonCount:0};
window[KEY]=state;
function addStyle(){
 if(document.getElementById('bpv-bottom-card-futuristic-v1'))return;
 style=document.createElement('style');
 style.id='bpv-bottom-card-futuristic-v1';
 style.textContent=CSS;
 (document.head||document.documentElement).appendChild(style);
}
function norm(v){return String(v||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()}
function categoryFor(button){
 const action=norm(button.dataset.bpvAction);
 if(/^(account|metrics|billing|profile|language|settings)$/.test(action))return 'system';
 if(/^(ai|listings|opportunities|property)$/.test(action))return 'property';
 if(/^(parcels|boundaryviewer|worldchanges|controls|motion|whole)$/.test(action))return 'map';
 if(/^(weatherfx|wildfire|windfx|volumetric|emrf)$/.test(action))return 'weather';
 const group=button.closest('[data-bpv-command-section]');
 const section=norm((group?.dataset.bpvCommandSection||'')+' '+(group?.getAttribute('aria-label')||''));
 if(/^(environment|weather|hazard|storm|radar|water flow|power outage|wildfire)( |$)/.test(section)||/\b(weather|environment|storm|radar|water flow|buoy|outage|wildfire|hurricane|tornado|precipitation|flood)\b/.test(section))return 'weather';
 if(/\b(account|billing|system|settings|profile|subscription)\b/.test(section))return 'system';
 if(/\b(property intelligence|property|listings|opportunities|real estate|parcel records)\b/.test(section))return 'property';
 if(/\b(map|map layers|satellite imagery|imagery|world history|navigation|map controls)\b/.test(section))return 'map';
 if(/\b(wreck|shipwreck|plane wreck|spacecraft|launch site|wonder|landmark|monument|temple|ruin|archaeolog|cave|underground|photogram|scan|model|lighthouse|turbine|aircraft|vessel|ship|train|rail|bridge|faa|tower|streetlight|telephone pole|tree|explore)\b/.test(section))return 'explore';
 const text=norm((button.textContent||'')+' '+(button.title||'')+' '+(button.getAttribute('aria-label')||''));
 if(/\b(weather|storm|radar|wildfire|wind|water|flow|buoy|outage|flood|hurricane|tornado|cloud|lightning|tide|current|precipitation)\b/.test(text))return 'weather';
 if(/\b(wreck|shipwreck|aircraft|plane|vessel|ship|spacecraft|launch|wonder|landmark|monument|temple|ruin|archaeolog|cave|underground|photogram|scan|model|lighthouse|turbine|train|rail|bridge|faa|tower|streetlight|telephone pole|tree|3d|explore)\b/.test(text))return 'explore';
 if(/\b(property|listing|listings|opportunit|parcel|roof|building|address|solar|claim|home)\b/.test(text))return 'property';
 if(/\b(map|layer|satellite|imagery|orbit|motion|boundary|terrain|history|navigation)\b/.test(text))return 'map';
 if(/\b(account|billing|system|counter|metric|profile|language|refresh|settings|support)\b/.test(text))return 'system';
 return 'explore';
}
function ensureIcon(button,id){
 let icon=button.querySelector('.bpv-command-icon');
 if(icon){icon.classList.add('bpv-v2-icon');return}
 const existing=Array.from(button.children).find(el=>el.matches('svg,[aria-hidden="true"],.bpv-icon,.icon'));
 if(existing){existing.classList.add('bpv-v2-icon');return}
 icon=document.createElement('span');
 icon.className='bpv-command-icon bpv-v2-icon';
 icon.setAttribute('aria-hidden','true');
 icon.textContent=ICONS[id]||ICONS.explore;
 button.insertBefore(icon,button.firstChild);
}
function setActive(id){
 active=CATEGORIES.some(c=>c.id===id)?id:'explore';
 state.activeCategory=active;
 if(nav)nav.querySelectorAll('[data-bpv-card-tab]').forEach(button=>{
  const selected=button.dataset.bpvCardTab===active;
  button.setAttribute('aria-selected',String(selected));
  button.tabIndex=selected?0:-1;
 });
 scanButtons();
}
function scanButtons(){
 if(!actions)return;
 let count=0;
 actions.querySelectorAll('button').forEach(button=>{
  if(button.closest('#bp-world-time-slider-v5908'))return;
  const id=categoryFor(button);
  button.dataset.bpvCardCategory=id;
  button.classList.add('bpv-v2-tool-button');
  ensureIcon(button,id);
  const hidden=id!==active;
  button.classList.toggle('bpv-card-category-hidden',hidden);
  button.setAttribute('aria-hidden',String(hidden));
  count++;
 });
 state.buttonCount=count;
}
function createNav(){
 if(nav&&nav.isConnected)return;
 nav=document.createElement('div');
 nav.id='bpv-card-category-nav-v1';
 nav.className='bpv-card-category-nav-v1';
 nav.setAttribute('role','tablist');
 nav.setAttribute('aria-label','Bottom card sections');
 CATEGORIES.forEach(category=>{
  const tab=document.createElement('button');
  tab.type='button';
  tab.className='bpv-card-category-tab-v1';
  tab.dataset.bpvCardTab=category.id;
  tab.setAttribute('role','tab');
  tab.setAttribute('aria-controls','bpv-dock-actions');
  tab.setAttribute('aria-selected',String(category.id===active));
  tab.tabIndex=category.id===active?0:-1;
  tab.innerHTML='<span class="bpv-card-category-icon-v1" aria-hidden="true">'+category.icon+'</span><span>'+category.label+'</span>';
  nav.appendChild(tab);
 });
 nav.addEventListener('click',event=>{
  const tab=event.target.closest('[data-bpv-card-tab]');
  if(tab&&nav.contains(tab))setActive(tab.dataset.bpvCardTab);
 });
 nav.addEventListener('keydown',event=>{
  if(!['ArrowLeft','ArrowRight'].includes(event.key))return;
  const tabs=Array.from(nav.querySelectorAll('[data-bpv-card-tab]'));
  const index=tabs.indexOf(document.activeElement);
  if(index<0)return;
  event.preventDefault();
  const step=event.key==='ArrowRight'?1:-1;
  const next=tabs[(index+step+tabs.length)%tabs.length];
  next.focus();
  setActive(next.dataset.bpvCardTab);
 });
 actions.parentNode.insertBefore(nav,actions);
}
function scanWhenReady(){
 const foundDock=document.getElementById('bpv-dock');
 const foundActions=document.getElementById('bpv-dock-actions');
 if(!foundDock||!foundActions)return false;
 dock=foundDock;actions=foundActions;
 dock.classList.add('bpv-futuristic-card-v1');
 addStyle();
 createNav();
 scanButtons();
 state.ready=true;
 if(!observer){
  observer=new MutationObserver(()=>{
   if(scheduled)return;
   scheduled=true;
   requestAnimationFrame(()=>{scheduled=false;scanButtons()});
  });
  observer.observe(actions,{childList:true,subtree:true});
 }
 return true;
}
if(!scanWhenReady()){
 rootObserver=new MutationObserver(()=>{
  if(scanWhenReady()){rootObserver?.disconnect();rootObserver=null}
 });
 rootObserver.observe(document.documentElement,{childList:true,subtree:true});
}
window.addEventListener('pageshow',scanWhenReady,{passive:true});
})();