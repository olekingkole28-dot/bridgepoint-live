(()=>{
'use strict';
if(window.__bridgepointMapNationalV1001)return;
window.__bridgepointMapNationalV1001=true;

const US_CENTER=[39.4,-98.3];
function near(a,b,t=.8){return Math.abs(Number(a)-Number(b))<=t;}
function patchLeaflet(){
  const L=window.L;
  if(!L||L.Map.prototype.__bp1001SetViewPatched)return;
  const original=L.Map.prototype.setView;
  L.Map.prototype.setView=function(center,zoom,options){
    try{
      const el=this.getContainer?.();
      if(el?.id==='bp974-map'&&Array.isArray(center)){
        const lat=Number(center[0]),lng=Number(center[1]),z=Number(zoom);
        const current=Number(this.getZoom?.());
        if(near(lat,US_CENTER[0],1.2)&&near(lng,US_CENTER[1],2.0)&&z>=7){
          return original.call(this,US_CENTER,4,options);
        }
        if(!this.__bp1001InitialStateJumpHandled&&current<=4.5&&z>=7&&near(lat,41.5978,1)&&near(lng,-72.7554,1.5)){
          this.__bp1001InitialStateJumpHandled=true;
          return original.call(this,US_CENTER,4,options);
        }
      }
    }catch(_){}
    return original.call(this,center,zoom,options);
  };
  L.Map.prototype.__bp1001SetViewPatched=true;
}
function installNationwideOption(){
  const dialog=document.getElementById('bp974-map-dialog');
  const select=dialog?.querySelector('[data-state]');
  if(!select)return false;
  let us=[...select.options].find(o=>o.value==='US');
  if(!us){
    us=document.createElement('option');
    us.value='US';
    us.textContent='US — Nationwide';
    select.insertBefore(us,select.firstChild);
  }
  if(select.value!=='US'){
    select.value='US';
    select.dispatchEvent(new Event('change',{bubbles:true}));
  }
  const sub=dialog.querySelector('.sub');
  if(sub)sub.textContent='Nationwide radar first • choose any state for property-level intelligence';
  return true;
}

const prior=window.BridgePointOpenIntelligenceMapV974;
if(typeof prior==='function'){
  window.BridgePointOpenIntelligenceMapV974=async function(){
    try{await window.BridgePointRadarV1000?.ensureLeaflet?.();patchLeaflet();}catch(_){}
    const out=await prior.apply(this,arguments);
    patchLeaflet();
    installNationwideOption();
    return out;
  };
}
window.BridgePointMapNationalV1001={patchLeaflet,installNationwideOption};
})();