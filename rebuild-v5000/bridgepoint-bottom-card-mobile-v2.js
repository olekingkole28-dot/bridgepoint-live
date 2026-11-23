/* BridgePoint Mobile Card v2: opt-in presentation changes only.
 * Keep original button nodes/listeners, source layers, billing and map logic untouched.
 * Desktop continues using the original five-category module. */
(()=>{
'use strict';
const KEY='__BP_MOBILE_CARD_V2__';if(window[KEY])return;
const media=matchMedia('(max-width:700px)');
const C=[
 ['property','Property & Scans','⌂','#ffcf78'],
 ['environment','Live Environment','☁','#5ce8c8'],
 ['global','Global & Horizon','✦','#c899ff'],
 ['visuals','Map & Visuals','◎','#72bbff'],
 ['system','System & Tools','⚙','#ffa1b3']
];
const SORT={
 property:['parcel lines','public parcel viewer','property slots','listings','opportunities','blender world','30 day history'],
 environment:['weather fx','wildfire','power outages','wind drone','wind rf jets','global em rf','aircraft','water flow','vessel awareness','named earthquakes'],
 global:['horizon','earth shield','near earth objects','spacecraft','hostile zones','nuclear sites','faa towers','solar fields','offshore oil gas','subsurface wells','mines quarries','subway stations','transportation','lighthouses','world wonders','shipwrecks','plane wrecks','caves sites','jenolan caves 3d'],
 visuals:['whole earth','orbit motion','satellite color','nasa night lights','world x ray layers','liquid ocean','below surface'],
 system:['bridgepoint ai','search','explore','layers tools','offline bridgepoint','account billing','live counters']
};
const ACTION={parcels:'property',boundaryviewer:'property',property:'property',listings:'property',opportunities:'property',worldchanges:'property',weatherfx:'environment',wildfire:'environment',windfx:'environment',volumetric:'environment',emrf:'environment',whole:'visuals',motion:'visuals',satellite:'visuals',nightlights:'visuals',ai:'system',search:'system',explore:'system',controls:'system',account:'system',metrics:'system',premium:'system'};
const PATTERNS={
 property:/parcel lines|public parcel viewer|property slots|^listings$|^opportunities$|blender world|30 day history|property lookup/,
 environment:/weather fx|wildfire|power outages?|wind drone|wind rf|jet streams?|global em|em rf|^aircraft|water flow|vessel awareness|named earthquakes?|^earthquakes?$/,
 global:/^horizon$|earth shield|near earth objects?|^spacecraft|hostile zones|conflict zones|nuclear sites|faa towers|solar fields|offshore oil|subsurface wells|mines quarries|subway stations|transportation|lighthouses?|world wonders?|shipwrecks?|plane wrecks?|caves sites|jenolan caves/,
 visuals:/whole earth|orbit motion|satellite color|satellite imagery|nasa night lights|world x ray|x ray layers|liquid ocean|below surface/,
 system:/bridgepoint ai|^search$|^explore$|layers tools|free premium tools|offline bridgepoint|account billing|live counters/
};
const N=v=>String(v||'').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const state={version:2,ready:false,active:'property',buttonCount:0};
window[KEY]=state;
let dock,actions,header,nav,playback,content,watch,rootWatch,timer,frame=0;
const node=(tag,id,cls)=>{const e=document.createElement(tag);if(id)e.id=id;if(cls)e.className=cls;return e;};
const existing=(id)=>document.getElementById(id);
function installCSS(){
 if(existing('bpv-mobile-v2-css'))return;
 const sheet=node('style','bpv-mobile-v2-css');
 sheet.textContent="\n@media(max-width:700px){\nbody #bpv-dock.bpv-mobile-v2{display:flex!important;flex-direction:column!important;width:calc(100% - 20px)!important;height:min(57dvh,650px)!important;min-height:315px!important;max-height:calc(100dvh - 80px)!important;overflow:hidden!important;box-sizing:border-box!important;padding:8px 9px!important;border-radius:19px!important}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-header{flex:0 0 auto;min-width:0;display:flex;flex-direction:column;gap:3px;z-index:3;background:#071522}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-header .bpv-dock-label{display:flex!important;margin:0!important}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-account-row{display:block!important;width:100%!important;margin:0!important}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-account-row .bpv-topbar-right{display:flex!important;align-items:center;justify-content:space-between!important;flex-wrap:nowrap!important;gap:6px!important;width:100%!important}\n#bpv-dock.bpv-mobile-v2 #bpv-ai-commandbar-v1{width:100%!important;min-width:0!important;max-width:none!important;margin:3px 0!important;position:relative!important;inset:auto!important}\n#bpv-dock.bpv-mobile-v2 #bpv-ai-commandbar-v1 input{min-width:0!important}\n#bpv-dock.bpv-mobile-v2 .bpv-dock-window-actions button{min-height:31px!important;font-size:10px!important;padding:6px 9px!important}\n#bpv-dock.bpv-mobile-v2 .bpv-card-category-nav-v1{display:none!important}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-tabs{display:flex!important;flex:0 0 auto;gap:6px;padding:6px 1px;overflow-x:auto;white-space:nowrap;scroll-snap-type:x proximity;scrollbar-width:thin}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-tabs button{flex:0 0 auto;display:inline-flex;align-items:center;gap:7px;min-height:40px;padding:7px 10px;border:1px solid #3e5361;border-radius:12px;background:#0e2534;color:#e2f1f6;font:800 12px/1.15 system-ui,sans-serif;white-space:nowrap;scroll-snap-align:start}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-tabs button[aria-selected=true]{border-color:var(--tab-color);box-shadow:inset 0 0 0 1px var(--tab-color);background:#1c3444;color:#fff}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-tabs .bpv-v2-tab-icon{font-size:17px;color:var(--tab-color)}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-playback{flex:0 0 auto;max-height:117px;overflow:auto;border-top:1px solid #244453;border-bottom:1px solid #244453;padding:3px 0;margin-bottom:4px}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-playback:empty{display:none!important}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-playback #bp-world-time-slider-v5908{width:100%!important;min-width:0!important;max-width:100%!important;grid-column:auto!important;margin:0!important;padding:2px!important}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-playback .bpwt-controls{display:flex!important;flex-wrap:wrap!important;gap:4px!important}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-playback .bpwt-controls button{font-size:10px!important;min-height:29px!important;padding:4px 7px!important}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-content{flex:1 1 auto;min-height:0!important;width:100%;overflow-y:auto!important;overflow-x:hidden!important;overscroll-behavior:contain;padding:2px 1px 9px;scrollbar-width:thin}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-content .bpv-v2-extras{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:7px}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-content .bpv-v2-extras[hidden]{display:none!important}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-property #bpv-search-slot,#bpv-dock.bpv-mobile-v2 #bpv-v2-visuals #bpv-map-controls-slot,#bpv-dock.bpv-mobile-v2 #bpv-v2-system #bpv-premium-tools-slot{grid-column:1/-1;width:100%;min-width:0;max-width:100%}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-property #bpv-search-slot{order:3}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-property #bpMapsLaunchV1{order:0}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-property #bpPublicScansLaunchV1{order:1}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-property #bpv-v2-lidar{order:4}\n#bpv-dock.bpv-mobile-v2 #bpMapsLaunchV1,#bpv-dock.bpv-mobile-v2 #bpPublicScansLaunchV1{position:relative!important;inset:auto!important;top:auto!important;right:auto!important;left:auto!important;bottom:auto!important;z-index:auto!important;width:100%!important;min-width:0!important;max-width:none!important;height:auto!important;min-height:48px!important;margin:0!important;padding:10px 12px!important;transform:none!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;border-radius:12px!important;white-space:normal!important;word-break:normal!important;overflow-wrap:break-word!important;hyphens:none!important;letter-spacing:0!important;font:800 12px/1.2 system-ui,sans-serif!important;text-align:left!important}\n#bpv-dock.bpv-mobile-v2 #bpPublicScansLaunchV1{background:linear-gradient(120deg,#0f7472,#14586f)!important}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-lidar{min-height:48px;padding:10px 12px;width:100%;border:1px solid #55b1c3;border-radius:12px;background:#0b3541;color:#dffbff;font:800 12px/1.2 system-ui,sans-serif;text-align:left}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-lidar[disabled]{opacity:.55}\nhtml body.bpv-view-ready #bpv-dock.bpv-mobile-v2 #bpv-dock-actions.bpv-command-groups,#bpv-dock.bpv-mobile-v2 #bpv-dock-actions{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:8px!important;justify-content:stretch!important;align-items:stretch!important;width:100%!important;min-width:0!important;max-width:none!important}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions .bpv-command-group,#bpv-dock.bpv-mobile-v2 #bpv-dock-actions .bpv-command-grid,#bpv-dock.bpv-mobile-v2 #bpv-dock-actions .bpv-command-inline-slot{display:contents!important}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions .bpv-command-heading,#bpv-dock.bpv-mobile-v2 #bpv-dock-actions .bpv-command-group p,#bpv-dock.bpv-mobile-v2 #bpv-dock-actions .bpv-command-group small,#bpv-dock.bpv-mobile-v2 #bpv-dock-actions [role=status]{display:none!important}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button{--bpv-action:#86deff;order:var(--bpv-v2-order,500);width:100%!important;max-width:none!important;min-width:0!important;min-height:48px!important;height:auto!important;display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:8px!important;padding:10px 12px!important;box-sizing:border-box!important;white-space:normal!important;word-break:normal!important;overflow-wrap:break-word!important;hyphens:none!important;text-align:left!important;font-size:12px!important;line-height:1.2!important;letter-spacing:0!important}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button[data-bpv-v2-category=property]{--bpv-action:#ffcf78}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button[data-bpv-v2-category=environment]{--bpv-action:#5ce8c8}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button[data-bpv-v2-category=global]{--bpv-action:#c899ff}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button[data-bpv-v2-category=visuals]{--bpv-action:#72bbff}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button[data-bpv-v2-category=system]{--bpv-action:#ffa1b3}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button[data-bpv-v2-visible=false]{display:none!important}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button[data-bpv-v2-visible=true]{display:flex!important}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button[hidden]{display:none!important}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button .bpv-command-label,#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button .bpv-v2-text{min-width:0!important;white-space:normal!important;word-break:normal!important;overflow-wrap:break-word!important;hyphens:none!important;font-size:12px!important;line-height:1.2!important}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button .bpv-command-icon,#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button .bpv-v2-icon{flex:0 0 30px!important;width:30px!important;height:30px!important;min-width:30px!important;color:var(--bpv-action)!important;border-color:var(--bpv-action)!important}\n#bpv-dock.bpv-mobile-v2 #bpv-dock-actions .bpv-v2-subhead{grid-column:1/-1;display:none;order:var(--bpv-v2-order);padding:9px 2px 2px;color:#cca3ff;font:900 11px/1.2 system-ui,sans-serif;letter-spacing:.08em}\n#bpv-dock.bpv-mobile-v2[data-bpv-v2-active=global] #bpv-dock-actions .bpv-v2-subhead{display:block!important}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-content .bpv-v2-hide-original{display:none!important}\n#bpv-dock.bpv-mobile-v2 #bpv-v2-tabs button:focus-visible,#bpv-dock.bpv-mobile-v2 #bpv-dock-actions button:focus-visible{outline:2px solid white;outline-offset:2px}\n}";
 document.head.appendChild(sheet);
}
function label(btn){return N(btn.querySelector('.bpv-command-label')?.textContent||btn.getAttribute('aria-label')||btn.textContent||btn.title);}
function categorize(btn){
 const name=label(btn);
 for(const [cat,re] of Object.entries(PATTERNS))if(re.test(name))return cat;
 const action=N(btn.dataset.bpvAction).replace(/\s/g,'');if(ACTION[action])return ACTION[action];
 const id=N(btn.id),group=N(btn.closest('[data-bpv-command-section]')?.dataset.bpvCommandSection);
 const hint=N(btn.title);
 for(const [cat,re] of Object.entries(PATTERNS))if(re.test(id)||re.test(hint))return cat;
 if(/weather|environment|earthquake|water|vessel|aircraft|outage/.test(group))return 'environment';
 if(/horizon|space|faa|wreck|cave|site|subway|lighthouse|solar|mine|offshore|transport|nuclear|conflict|landmark|underground/.test(group))return 'global';
 if(/property|parcel|listing|blender/.test(group))return 'property';
 if(/map|satellite|xray|nightlight/.test(group))return 'visuals';
 return 'system'; // all future/unknown buttons stay accessible
}
function symbol(name,cat){
 if(/shipwreck|vessel/.test(name))return '⚓';
 if(/aircraft|plane wreck/.test(name))return '✈';
 if(/spacecraft|near earth/.test(name))return '🚀';
 if(/conflict|hostile/.test(name))return '⚠';
 if(/fire|wildfire/.test(name))return '🔥';
 if(/weather/.test(name))return '☁';
 if(/water|ocean|wind/.test(name))return '≋';
 if(/cave|mine|underground/.test(name))return '◆';
 if(/search/.test(name))return '⌕';
 return C.find(a=>a[0]===cat)?.[2]||'◈';
}
function addIcon(btn,cat,name){
 const exists=btn.querySelector('.bpv-command-icon,.bpv-v2-icon');
 if(exists){if(!exists.textContent.trim()&&!exists.querySelector('svg,img'))exists.textContent=symbol(name,cat);return;}
 if(btn.querySelector('svg,img,.bpv-icon'))return;
 const ico=node('span','','bpv-command-icon bpv-v2-icon');
 ico.setAttribute('aria-hidden','true');ico.textContent=symbol(name,cat);
 btn.insertBefore(ico,btn.firstChild);
}
function sortIndex(name,cat){
 const a=SORT[cat]||[];
 const at=a.findIndex(s=>name.includes(s)||s.includes(name)&&name.length>4);
 return at<0?90:at;
}
function subGroup(name){
 if(/horizon|earth shield|near earth|spacecraft|hostile zones|conflict zones/.test(name))return 'space';
 if(/wonder|wreck|caves|jenolan|landmark|photogram/.test(name))return 'landmark';
 return 'sites';
}
function scan(){
 if(!media.matches||!actions)return;
 let total=0;
 for(const b of actions.querySelectorAll('button')){
  if(b.closest('#bp-world-time-slider-v5908'))continue;
  const name=label(b),cat=categorize(b),idx=sortIndex(name,cat);
  b.dataset.bpvV2Category=cat;
  const sub=cat==='global'?subGroup(name):'';
  b.style.setProperty('--bpv-v2-order',String((cat==='global'?(sub==='space'?10:sub==='sites'?110:210):10)+idx));
  addIcon(b,cat,name);
  const shown=cat===state.active;
  b.dataset.bpvV2Visible=String(shown);b.setAttribute('aria-hidden',String(!shown));
  if(!shown){if(!b.hasAttribute('data-bpv-v2-tab-original'))b.dataset.bpvV2TabOriginal=b.getAttribute('tabindex')??'';
   b.setAttribute('tabindex','-1');
  }else if(b.hasAttribute('data-bpv-v2-tab-original')){
   const orig=b.dataset.bpvV2TabOriginal;if(orig)b.setAttribute('tabindex',orig);else b.removeAttribute('tabindex');
   delete b.dataset.bpvV2TabOriginal;
  }
  total++;
 }
 state.buttonCount=total;
}
function select(cat){
 if(!C.some(c=>c[0]===cat))return;
 state.active=cat;dock.dataset.bpvV2Active=cat;
 nav.querySelectorAll('[data-bpv-v2-tab]').forEach(b=>{const yes=b.dataset.bpvV2Tab===cat;b.setAttribute('aria-selected',String(yes));b.tabIndex=yes?0:-1;});
 content.querySelectorAll('.bpv-v2-extras').forEach(e=>{e.hidden=e.dataset.bpvV2Extra!==cat;});
 content.scrollTop=0;scan();
}
function attachTo(id,target){
 const el=existing(id);if(!el||!target||el.parentElement===target)return;
 target.appendChild(el);
}
function extras(){
 if(!media.matches||!content)return;
 const prop=existing('bpv-v2-property'),map=existing('bpv-v2-visuals'),sys=existing('bpv-v2-system');
 attachTo('bpv-search-slot',prop);
 attachTo('bpv-map-controls-slot',map);
 attachTo('bpv-premium-tools-slot',sys);
 attachTo('bpMapsLaunchV1',prop);
 attachTo('bpPublicScansLaunchV1',prop);
 attachTo('bpv-ai-commandbar-v1',header);
 attachTo('bp-world-time-slider-v5908',playback);
 let button=existing('bpv-v2-lidar');
 if(!button){
  button=node('button','bpv-v2-lidar');button.type='button';button.textContent='◆  LiDAR / Photo Mesh';
  button.addEventListener('click',()=>{
   const native=document.querySelector('[data-bp-lidar-toggle-v7003] button,[data-bp-lidar-toggle-v7003] input[type=checkbox]')||
    [...document.querySelectorAll('#bpv-map-controls-slot button')].find(x=>/lidar|photo mesh/i.test(x.textContent||''));
   native?.click();
  });
  prop.appendChild(button);
 }
 const original=document.querySelector('[data-bp-lidar-toggle-v7003]');
 if(original){original.classList.add('bpv-v2-hide-original');button.disabled=false;}
 else button.disabled=![...document.querySelectorAll('#bpv-map-controls-slot button')].some(x=>/lidar|photo mesh/i.test(x.textContent||''));
}
function createTabs(){
 nav=node('nav','bpv-v2-tabs');nav.setAttribute('role','tablist');nav.setAttribute('aria-label','BridgePoint sections');
 C.forEach(([id,title,icon,color])=>{
  const b=node('button');b.type='button';b.dataset.bpvV2Tab=id;b.setAttribute('role','tab');
  b.style.setProperty('--tab-color',color);b.setAttribute('aria-controls','bpv-v2-content');
  const symbol=node('span','','bpv-v2-tab-icon');symbol.setAttribute('aria-hidden','true');symbol.textContent=icon;
  const name=node('span');name.textContent=title;b.append(symbol,name);
  b.addEventListener('click',()=>select(id));nav.appendChild(b);
 });
 nav.addEventListener('keydown',e=>{
  if(!['ArrowLeft','ArrowRight'].includes(e.key))return;
  const i=C.findIndex(c=>c[0]===state.active);
  const next=(i+(e.key==='ArrowRight'?1:-1)+C.length)%C.length;
  e.preventDefault();select(C[next][0]);nav.querySelectorAll('button')[next].focus();
 });
}
function mount(){
 if(!media.matches)return false;
 dock=existing('bpv-dock');actions=existing('bpv-dock-actions');
 if(!dock||!actions)return false;
 if(dock.classList.contains('bpv-mobile-v2'))return true;
 installCSS();dock.classList.add('bpv-mobile-v2');
 header=node('div','bpv-v2-header');
 dock.insertBefore(header,dock.firstChild);
 attachToHeader();
 createTabs();dock.insertBefore(nav,actions);
 playback=node('div','bpv-v2-playback');dock.insertBefore(playback,actions);
 content=node('div','bpv-v2-content');dock.insertBefore(content,actions);
 C.forEach(([id,title])=>{
  const region=node('section','bpv-v2-'+id,'bpv-v2-extras');region.dataset.bpvV2Extra=id;region.setAttribute('aria-label',title);
  content.appendChild(region);
 });
 content.appendChild(actions);
 attachTo('bpv-property-card-slot',content);
 attachTo('bpv-more-info',content);
 for(const [id,title,ord] of [['space','HORIZON & SPACE',1],['sites','INFRASTRUCTURE & SITES',100],['landmark','LANDMARKS & WRECKS',200]]){
  const div=node('div','','bpv-v2-subhead');div.dataset.bpvV2Subhead=id;div.style.setProperty('--bpv-v2-order',String(ord));div.textContent=title;
  actions.prepend(div);
 }
 extras();select(state.active);
 watch=new MutationObserver(()=>{if(frame)return;frame=requestAnimationFrame(()=>{frame=0;scan();});});
 watch.observe(actions,{childList:true,subtree:true});
 timer=setInterval(extras,1000);
 setTimeout(()=>{if(timer){clearInterval(timer);timer=null}},110000);
 state.ready=true;return true;
}
function attachToHeader(){
 attachTo('bpv-dock-label',header);
 const lbl=dock.querySelector('.bpv-dock-label');if(lbl&&lbl.parentElement!==header)header.appendChild(lbl);
 attachTo('bpv-dock-account-row',header);
 attachTo('bpv-ai-commandbar-v1',header);
}
function init(){
 if(mount())return;
 if(!media.matches)return;
 rootWatch=new MutationObserver(()=>{if(mount()){rootWatch.disconnect();rootWatch=null;}});
 rootWatch.observe(document.documentElement,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
window.addEventListener('pageshow',()=>{if(media.matches){if(!state.ready)init();else{scan();extras();}}});
})();