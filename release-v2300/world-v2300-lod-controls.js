const VERSION=6016;
const STORAGE_KEY='bridgepoint-world-lod-v6037';
const TIERS={BRONZE:{name:'Bronze',sub:'LIGHT 3D',hint:'Lightweight 3D buildings and terrain.'},SILVER:{name:'Silver',sub:'ENHANCED DETAIL',hint:'More roof, floor, facade and structural detail.'},GOLD:{name:'Gold',sub:'MAX AVAILABLE',hint:'Richest available source-backed and derived rendering detail.'}};
function validTier(value){const t=String(value||'').toUpperCase();return Object.prototype.hasOwnProperty.call(TIERS,t)?t:'GOLD'}
function readSavedTier(){try{const saved=localStorage.getItem(STORAGE_KEY);return saved?validTier(saved):'GOLD'}catch(_){return'GOLD'}}
function ensureStyle(){
 if(document.getElementById('bp-lod-controls-style-v6017'))return;
 const style=document.createElement('style');style.id='bp-lod-controls-style-v6017';
 style.textContent=`
 .bp-lod-controls-v6017{box-sizing:border-box;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;width:100%;max-width:100%;padding:9px;margin:7px 0;border:1px solid rgba(118,218,245,.3);border-radius:12px;background:linear-gradient(145deg,rgba(5,17,28,.97),rgba(9,31,43,.97));box-shadow:0 8px 26px rgba(0,0,0,.34);color:#eaf8ff;font:12px/1.25 system-ui,-apple-system,sans-serif;backdrop-filter:blur(12px);position:relative;z-index:55;pointer-events:auto;flex:1 0 100%;grid-column:1/-1}
 .bp-lod-controls-v6017 *{box-sizing:border-box}.bp-lod-head-v6017{grid-column:1/-1;display:flex;justify-content:space-between;align-items:center;gap:8px}
 .bp-lod-heading-v6017{font-size:10px;font-weight:900;letter-spacing:.12em;color:#b9eaf6}.bp-lod-status-v6017{font-size:10px;color:#92b8c9;text-align:right;overflow-wrap:anywhere}
 .bp-lod-button-v6017{min-width:0;min-height:43px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;padding:7px 3px;border-radius:9px;border:1px solid rgba(255,255,255,.18);font:900 11px/1.15 system-ui,-apple-system,sans-serif;letter-spacing:.045em;text-align:center;cursor:pointer;color:#fff;background:rgba(8,20,29,.96);touch-action:manipulation;-webkit-tap-highlight-color:transparent}
 .bp-lod-button-v6017 small{font:700 8px/1.1 system-ui,-apple-system,sans-serif;letter-spacing:.03em;opacity:.88}
 .bp-lod-button-v6017[data-bp-lod-tier="BRONZE"]{border-color:rgba(193,129,79,.55);color:#e9b181}.bp-lod-button-v6017[data-bp-lod-tier="SILVER"]{border-color:rgba(194,206,218,.58);color:#d4e0eb}.bp-lod-button-v6017[data-bp-lod-tier="GOLD"]{border-color:rgba(244,195,67,.72);color:#f6d57d}
 .bp-lod-button-v6017[aria-pressed="true"][data-bp-lod-tier="BRONZE"]{background:linear-gradient(150deg,rgba(105,59,28,.98),rgba(43,29,22,.98));box-shadow:inset 0 0 0 1px rgba(239,171,110,.28),0 0 12px rgba(184,109,57,.17)}
 .bp-lod-button-v6017[aria-pressed="true"][data-bp-lod-tier="SILVER"]{background:linear-gradient(150deg,rgba(76,95,112,.98),rgba(27,40,53,.98));box-shadow:inset 0 0 0 1px rgba(224,237,248,.28),0 0 12px rgba(173,199,220,.14)}
 .bp-lod-button-v6017[aria-pressed="true"][data-bp-lod-tier="GOLD"]{background:linear-gradient(150deg,rgba(118,83,12,.98),rgba(48,35,11,.98));box-shadow:inset 0 0 0 1px rgba(255,220,110,.35),0 0 14px rgba(241,190,47,.2)}
 .bp-lod-button-v6017:focus-visible{outline:2px solid #7de8ff;outline-offset:2px}.bp-lod-controls-floating-v6017{position:absolute;left:50%;bottom:max(10px,calc(env(safe-area-inset-bottom) + 8px));transform:translateX(-50%);width:min(380px,calc(100% - 16px));margin:0}
  .bp-lod-controls-in-card-v6017{position:relative!important;left:auto!important;right:auto!important;top:auto!important;bottom:auto!important;transform:none!important;width:100%!important;max-width:none!important;margin:8px 0 0!important;grid-column:1/-1}
 @media(max-width:480px){.bp-lod-controls-v6017{gap:5px;padding:7px}.bp-lod-button-v6017{min-height:42px;font-size:10px}.bp-lod-status-v6017{font-size:9px}}
 @media(prefers-reduced-motion:reduce){.bp-lod-button-v6017{transition:none!important}}
 `;
 document.head.appendChild(style)
}
export function initWorldLodControls(world,options={}){
 const map=world?.map,container=map?.getContainer?.();if(!map||!container)return null;ensureStyle();
 const rootId='bp-lod-controls-v6017-'+(container.id||'world');document.getElementById(rootId)?.remove();
 const toolbar=document.getElementById('bpv-map-controls-slot');
 const root=document.createElement('section');root.id=rootId;root.className='bp-lod-controls-v6017';root.setAttribute('aria-label','3D world level of detail');if(!toolbar)root.classList.add('bp-lod-controls-floating-v6017');
 const head=document.createElement('div');head.className='bp-lod-head-v6017';
 const title=document.createElement('span');title.className='bp-lod-heading-v6017';title.textContent='WORLD DETAIL';
 const status=document.createElement('span');status.className='bp-lod-status-v6017';status.setAttribute('role','status');status.setAttribute('aria-live','polite');head.append(title,status);root.append(head);
 const buttons=new Map();
 for(const tier of ['GOLD','SILVER','BRONZE']){const meta=TIERS[tier],button=document.createElement('button');button.type='button';button.className='bp-lod-button-v6017';button.dataset.bpLodTier=tier;button.setAttribute('aria-pressed','false');button.title=meta.hint;button.setAttribute('aria-label',meta.name+' level of detail. '+meta.hint);const name=document.createElement('span');name.textContent=meta.name;const sub=document.createElement('small');sub.textContent=meta.sub;button.append(name,sub);root.append(button);buttons.set(tier,button)}
 if(toolbar){root.classList.add('bp-lod-controls-in-card-v6017');toolbar.append(root)}else{try{if(getComputedStyle(container).position==='static')container.style.position='relative'}catch(_){}container.append(root)}const relocateToCard=()=>{const target=document.getElementById('bpv-map-controls-slot');if(!target||root.parentElement===target)return false;root.classList.remove('bp-lod-controls-floating-v6017');root.classList.add('bp-lod-controls-in-card-v6017');target.append(root);return true};if(!relocateToCard()&&typeof MutationObserver!=='undefined'){const cardObserver=new MutationObserver(()=>{if(relocateToCard())cardObserver.disconnect()});cardObserver.observe(document.documentElement,{childList:true,subtree:true});setTimeout(()=>cardObserver.disconnect(),20000)}
 let selectedTier=readSavedTier(),lastApplyError=null;
 const paintUi=()=>{for(const [tier,button]of buttons){const on=tier===selectedTier;button.setAttribute('aria-pressed',String(on));button.classList.toggle('active',on)}status.textContent=lastApplyError?selectedTier+' · MAP APPLY WARNING':selectedTier+' · '+(selectedTier==='GOLD'?'MAX AVAILABLE':selectedTier==='SILVER'?'ENHANCED DETAIL':'LIGHT 3D');root.dataset.activeTier=selectedTier};
 const setTier=(value,persist=true)=>{const next=validTier(value);selectedTier=next;lastApplyError=null;if(persist){try{localStorage.setItem(STORAGE_KEY,next)}catch(_){}}
  window.__BP_LOD_RENDERING_V6016__={...(window.__BP_LOD_RENDERING_V6016__||{}),version:VERSION,tier:next,selectedByUser:!!persist,deviceClass:container.clientWidth<620?'mobile':'desktop',updatedAt:Date.now()};
  try{if(typeof world.setLodTier==='function')world.setLodTier(next);else{lastApplyError='map API pending';map.triggerRepaint?.()}}catch(e){lastApplyError=String(e?.message||e||'tier change failed')}
  paintUi();window.__BP_LOD_CONTROL_EVENT_V6016__={tier:next,containerId:container.id||'',updatedAt:Date.now(),error:lastApplyError};return{tier:next,error:lastApplyError}};
 for(const [tier,button]of buttons)button.addEventListener('click',()=>setTier(tier,true));
 const controller={version:VERSION,map,element:root,buttons,get tier(){return selectedTier},get state(){return{version:VERSION,tier:selectedTier,deviceClass:container.clientWidth<620?'mobile':'desktop',visible:root.isConnected,activeButtons:[...buttons].filter(([t,b])=>b.getAttribute('aria-pressed')==='true').map(([t])=>t),updatedAt:Date.now()}},setTier};
 window.__BP_LOD_CONTROL_V6016__=controller;setTier(selectedTier,false);map.on?.('load',()=>setTier(validTier(window.__BP_LOD_RENDERING_V6016__?.tier||selectedTier),false));
 window.__BP_LOD_CONTROL_BOOT_V6016__={version:VERSION,ok:true,containerId:container.id||'',toolbar:!!toolbar,inCard:root.parentElement===document.getElementById('bpv-map-controls-slot'),deviceClass:container.clientWidth<620?'mobile':'desktop',updatedAt:Date.now()};return controller
}
