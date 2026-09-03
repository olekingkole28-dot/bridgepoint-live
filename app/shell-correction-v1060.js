(()=>{
'use strict';
if(window.__bridgepointShellCorrectionV1060)return;window.__bridgepointShellCorrectionV1060=true;
const moreSvg='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="19" cy="12" r="1.6"/></svg>';
const style=document.createElement('style');style.id='bp1060-shell-correction-style';style.textContent=`
#bp1055-more-button{display:none!important;visibility:hidden!important;pointer-events:none!important}
#bp1055-nav .bp1055-tab{min-height:64px!important}
`;
document.head.appendChild(style);
function nav(){return document.getElementById('bp1055-nav')}
function mark(tab){const n=nav();n?.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===tab));window.__bridgepointActiveTabV1055=tab;window.__bridgepointActiveTabV1060=tab;}
function forceShow(id){const el=document.getElementById(id);if(!el)return false;el.classList.add('show');el.style.removeProperty('display');el.style.removeProperty('visibility');el.style.removeProperty('pointer-events');return true;}
function forceHide(id){document.getElementById(id)?.classList.remove('show')}
function install(){
  const n=nav(),base=window.BridgePointSingleShellV1055;if(!n||!base||base.__bp1060)return false;
  document.getElementById('bp1055-more-button')?.remove();
  const fifth=n.querySelector('[data-tab="plans"]')||n.querySelectorAll('[data-tab]')[4];
  if(fifth){fifth.dataset.tab='more';fifth.setAttribute('aria-label','More');fifth.innerHTML=`<span class="ico">${moreSvg}</span><span>More</span>`;}
  const corrected={
    ...base,
    __bp1060:true,
    home:(...a)=>{forceHide('bp1042-more');forceHide('bp1042-properties');window.BridgePointWorkHubV1054?.close?.();const r=base.home?.(...a);mark('home');return r;},
    map:async(...a)=>{forceHide('bp1042-more');forceHide('bp1042-properties');window.BridgePointWorkHubV1054?.close?.();const r=await base.map?.(...a);mark('map');setTimeout(()=>window.BridgePointMapUIV1060?.apply?.(),40);return r;},
    properties:(...a)=>{forceHide('bp1042-more');window.BridgePointWorkHubV1054?.close?.();let r;try{r=base.properties?.(...a)}catch(e){console.error(e)}window.BridgePointOpenPropertiesV1042?.();for(const ms of [0,70,220])setTimeout(()=>forceShow('bp1042-properties'),ms);mark('properties');return r;},
    work:(...a)=>{forceHide('bp1042-more');forceHide('bp1042-properties');let r;try{r=base.work?.(...a)}catch(e){console.error(e)}window.BridgePointWorkHubV1054?.open?.('overview');for(const ms of [0,70,220])setTimeout(()=>forceShow('bp1054-work'),ms);mark('work');return r;},
    plans:(...a)=>base.plans?.(...a),
    more:(...a)=>{forceHide('bp1042-properties');window.BridgePointWorkHubV1054?.close?.();let r;try{r=base.more?.(...a)}catch(e){console.error(e)}window.BridgePointOpenMoreV1042?.();for(const ms of [0,70,220])setTimeout(()=>forceShow('bp1042-more'),ms);mark('more');return r;},
    getActive:()=>window.__bridgepointActiveTabV1060||base.getActive?.()||'home'
  };
  window.BridgePointSingleShellV1055=corrected;window.BridgePointSingleShellV1054=corrected;window.BridgePointSingleShellV1044=corrected;window.BridgePointSingleShellV1043=corrected;window.BridgePointSingleShellV1042=corrected;window.BridgePointSingleShellV1060=corrected;
  window.BridgePointSelectedTabV984=()=>corrected.getActive();
  mark('home');
  return true;
}
let tries=0;const t=setInterval(()=>{tries++;if(install()||tries>80)clearInterval(t)},50);install();
window.BridgePointShellCorrectionV1060={install,mark,forceShow};
})();