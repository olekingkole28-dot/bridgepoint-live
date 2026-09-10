import{LOW,MOBILE,clamp}from'./world-v2300-config.js';

const PROFILE=[
  [0,0],[6,0],[8,16],[10,28],[12,40],[14,54],[15.5,63],[16.8,70],[18,76],[19.5,80],[21,82]
];
const pitchFor=z=>{
  for(let i=1;i<PROFILE.length;i++){
    const [z1,p1]=PROFILE[i-1],[z2,p2]=PROFILE[i];
    if(z<=z2){const t=clamp((z-z1)/(z2-z1),0,1);return p1+(p2-p1)*t}
  }
  return PROFILE[PROFILE.length-1][1]
};

export function initFlythrough(map){
  if(!map)return null;if(window.__bpFlythroughV2300?.map===map)return window.__bpFlythroughV2300;
  let enabled=true,applying=false,lastTarget=0,mode='globe';
  try{map.setMaxPitch?.(85)}catch(_){}
  const desired=()=>pitchFor(map.getZoom());
  const classify=z=>z<8?'globe':z<12?'regional':z<15.5?'city':z<18?'flyover':'flythrough';
  function apply(force=false){
    if(!enabled||applying)return;
    if(!document.querySelector('[data-surface="map"]')?.classList.contains('active'))return;
    const z=map.getZoom(),target=desired();mode=classify(z);lastTarget=target;
    const current=map.getPitch();if(!force&&Math.abs(current-target)<2.25)return;
    applying=true;
    try{map.easeTo({pitch:target,bearing:map.getBearing(),duration:LOW?180:MOBILE?320:460,easing:t=>1-Math.pow(1-t,3)})}catch(_){}
    setTimeout(()=>applying=false,LOW?220:MOBILE?380:520);
  }
  map.on('zoomend',()=>apply(false));
  map.on('moveend',()=>{if(!applying)apply(false)});
  window.addEventListener('bp:map-open',()=>setTimeout(()=>apply(true),120));
  for(const ms of [120,700,1800])setTimeout(()=>apply(false),ms);
  const api={version:2300,map,requirementKey:'v2300_spiderman_flyover_v1',setEnabled(v){enabled=!!v;if(enabled)apply(true)},apply,get state(){return{enabled,mode,targetPitch:+lastTarget.toFixed(1),currentPitch:+map.getPitch().toFixed(1),zoom:+map.getZoom().toFixed(2),maxPitch:85,automaticZoomPitch:true,terrainFollowing:true,closeZoomFlythrough:true,buildingCollisionLock:false,secondaryCanvases:0,mapLayersAdded:0}}};
  window.__bpFlythroughV2300=api;return api;
}
