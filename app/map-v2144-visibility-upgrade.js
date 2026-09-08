(()=>{
'use strict';
if(window.__bridgepointMapVisibilityV2144)return;window.__bridgepointMapVisibilityV2144=true;
let attempts=0;
function apply(){
 const state=window.__bp97MapState,m=state?.map;
 if(!state?.ready||!m){if(attempts++<240)setTimeout(apply,250);return}
 try{
  if(m.getLayer('bp2090-opportunity-icon')){
   try{m.setLayerZoomRange('bp2090-opportunity-icon',4.5,22)}catch(_){}
   m.setLayoutProperty('bp2090-opportunity-icon','icon-allow-overlap',true);
   m.setLayoutProperty('bp2090-opportunity-icon','icon-ignore-placement',true);
   m.setLayoutProperty('bp2090-opportunity-icon','icon-size',['interpolate',['linear'],['zoom'],4.5,.34,7,.42,10,.52,14,.64,18,.78]);
  }
  if(m.getLayer('bp2090-opportunity-halo')){
   try{m.setLayerZoomRange('bp2090-opportunity-halo',4.5,22)}catch(_){}
   m.setPaintProperty('bp2090-opportunity-halo','circle-opacity',.27);
  }
  if(m.getLayer('bp97-floorbands')){
   try{m.setLayerZoomRange('bp97-floorbands',13,22)}catch(_){}
   m.setPaintProperty('bp97-floorbands','fill-extrusion-opacity',.68);
   m.setPaintProperty('bp97-floorbands','fill-extrusion-color','#f1fdff');
  }
  if(m.getLayer('bp97-building'))m.setPaintProperty('bp97-building','fill-extrusion-opacity',.72);
  const host=document.querySelector('.map-toolbar');
  if(host&&!document.getElementById('bp2144-status')){
   const el=document.createElement('span');el.id='bp2144-status';el.style.cssText='font-size:9px;font-weight:900;opacity:.8;padding:4px 7px;border:1px solid rgba(114,231,255,.3);border-radius:999px';el.textContent='Opportunity icons + floor bands LIVE';host.appendChild(el);
  }
 }catch(e){console.warn('BridgePoint V2144 visibility upgrade',e)}
 setTimeout(apply,2500);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',apply,{once:true});else apply();
})();
