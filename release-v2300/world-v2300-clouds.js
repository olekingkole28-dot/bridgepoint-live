const STYLE_ID='bp-sky-clouds-style-v5908';
const ROOT_CLASS='bp-sky-cloudfield-v5908';

const CSS = `
#liveMap .bp-sky-cloudfield-v5908{
  position:absolute;inset:0;overflow:hidden;z-index:4;pointer-events:none;
  opacity:0;visibility:hidden;contain:paint;isolation:isolate;
  transition:opacity .7s ease,visibility .7s ease;
  --bp-cloud-white:rgba(247,252,255,.84);
  --bp-cloud-light:rgba(220,239,252,.72);
  --bp-cloud-shadow:rgba(101,142,170,.2);
  mask-image:linear-gradient(to bottom,rgba(0,0,0,.1) 0%,#000 9%,#000 31%,rgba(0,0,0,.62) 39%,transparent 49%);
  -webkit-mask-image:linear-gradient(to bottom,rgba(0,0,0,.1) 0%,#000 9%,#000 31%,rgba(0,0,0,.62) 39%,transparent 49%);
}
#liveMap .bp-sky-cloudfield-v5908[data-active="true"]{opacity:1;visibility:visible}
#liveMap .bp-sky-cloudfield-v5908 .bp-sky-cloud-bank{
  position:absolute;left:0;width:100%;height:44%;background-repeat:repeat-x;
  background-size:50% 100%;will-change:background-position;transform:translateZ(0);
  filter:drop-shadow(0 8px 14px rgba(5,24,42,.13));
}
#liveMap .bp-sky-cloudfield-v5908 .bp-sky-cloud-bank::after{
  content:"";position:absolute;inset:0;
  background:linear-gradient(180deg,rgba(255,255,255,.1) 0%,transparent 24%,rgba(47,87,115,.14) 67%,transparent 100%);
  mix-blend-mode:multiply;
}
#liveMap .bp-sky-cloudfield-v5908 .bp-sky-cloud-high{
  top:1%;height:32%;opacity:.48;filter:blur(1.2px) drop-shadow(0 3px 10px rgba(4,20,34,.09));
  background-image:
    radial-gradient(ellipse 8% 36% at 9% 70%,var(--bp-cloud-white) 0%,rgba(235,247,255,.63) 44%,transparent 100%),
    radial-gradient(ellipse 6% 28% at 15% 56%,rgba(255,255,255,.86) 0%,rgba(225,241,251,.55) 50%,transparent 100%),
    radial-gradient(ellipse 13% 38% at 23% 71%,rgba(248,252,255,.78) 0%,rgba(214,235,249,.52) 48%,transparent 100%),
    radial-gradient(ellipse 7% 30% at 32% 62%,rgba(255,255,255,.78) 0%,rgba(226,240,251,.48) 48%,transparent 100%),
    radial-gradient(ellipse 12% 36% at 39% 72%,rgba(250,253,255,.78) 0%,rgba(210,231,245,.45) 50%,transparent 100%),
    radial-gradient(ellipse 8% 33% at 47% 57%,rgba(255,255,255,.84) 0%,rgba(226,240,250,.52) 48%,transparent 100%),
    radial-gradient(ellipse 13% 38% at 57% 72%,rgba(249,252,255,.82) 0%,rgba(209,231,246,.49) 52%,transparent 100%),
    radial-gradient(ellipse 7% 30% at 66% 60%,rgba(255,255,255,.82) 0%,rgba(225,240,251,.52) 49%,transparent 100%),
    radial-gradient(ellipse 12% 38% at 76% 72%,rgba(248,252,255,.8) 0%,rgba(209,230,245,.5) 52%,transparent 100%),
    radial-gradient(ellipse 7% 29% at 85% 58%,rgba(255,255,255,.78) 0%,rgba(220,238,249,.48) 50%,transparent 100%),
    radial-gradient(ellipse 11% 35% at 95% 70%,rgba(248,252,255,.8) 0%,rgba(209,230,245,.46) 52%,transparent 100%);
  animation:bp-cloud-drift-high-v5908 155s linear infinite;
}
#liveMap .bp-sky-cloudfield-v5908 .bp-sky-cloud-mid{
  top:9%;height:39%;opacity:.64;filter:blur(2.2px) drop-shadow(0 8px 17px rgba(4,18,31,.14));
  background-image:
    radial-gradient(ellipse 11% 47% at 4% 69%,rgba(248,252,255,.86) 0%,rgba(222,239,250,.71) 42%,transparent 100%),
    radial-gradient(ellipse 7% 36% at 12% 47%,rgba(255,255,255,.91) 0%,rgba(218,238,250,.64) 48%,transparent 100%),
    radial-gradient(ellipse 13% 49% at 23% 70%,rgba(246,251,255,.86) 0%,rgba(197,225,243,.65) 51%,transparent 100%),
    radial-gradient(ellipse 8% 36% at 34% 54%,rgba(255,255,255,.88) 0%,rgba(215,237,251,.68) 48%,transparent 100%),
    radial-gradient(ellipse 15% 48% at 45% 72%,rgba(246,251,255,.87) 0%,rgba(194,222,240,.66) 52%,transparent 100%),
    radial-gradient(ellipse 10% 37% at 58% 52%,rgba(255,255,255,.85) 0%,rgba(217,236,248,.66) 50%,transparent 100%),
    radial-gradient(ellipse 15% 48% at 69% 70%,rgba(245,250,255,.86) 0%,rgba(190,220,240,.66) 52%,transparent 100%),
    radial-gradient(ellipse 9% 36% at 82% 52%,rgba(255,255,255,.86) 0%,rgba(215,236,250,.62) 50%,transparent 100%),
    radial-gradient(ellipse 14% 46% at 93% 69%,rgba(247,251,255,.85) 0%,rgba(194,224,242,.64) 53%,transparent 100%);
  animation:bp-cloud-drift-mid-v5908 105s linear infinite;
}
#liveMap .bp-sky-cloudfield-v5908 .bp-sky-cloud-low{
  top:17%;height:35%;opacity:.26;filter:blur(4px) drop-shadow(0 7px 12px rgba(3,18,31,.12));
  background-image:
    radial-gradient(ellipse 15% 47% at 8% 70%,rgba(184,213,234,.7) 0%,rgba(226,241,251,.55) 46%,transparent 100%),
    radial-gradient(ellipse 11% 38% at 19% 51%,rgba(239,248,255,.75) 0%,rgba(193,222,241,.48) 48%,transparent 100%),
    radial-gradient(ellipse 17% 48% at 32% 73%,rgba(183,212,233,.65) 0%,rgba(224,240,252,.5) 51%,transparent 100%),
    radial-gradient(ellipse 12% 38% at 46% 52%,rgba(241,249,255,.72) 0%,rgba(191,220,239,.46) 48%,transparent 100%),
    radial-gradient(ellipse 17% 48% at 60% 72%,rgba(183,211,233,.67) 0%,rgba(221,239,250,.49) 51%,transparent 100%),
    radial-gradient(ellipse 11% 38% at 74% 51%,rgba(241,249,255,.71) 0%,rgba(191,220,239,.45) 48%,transparent 100%),
    radial-gradient(ellipse 17% 47% at 90% 72%,rgba(183,211,233,.65) 0%,rgba(221,239,250,.47) 51%,transparent 100%);
  animation:bp-cloud-drift-low-v5908 205s linear infinite;
}
@keyframes bp-cloud-drift-high-v5908{from{background-position:0 0}to{background-position:100% 0}}
@keyframes bp-cloud-drift-mid-v5908{from{background-position:100% 0}to{background-position:0 0}}
@keyframes bp-cloud-drift-low-v5908{from{background-position:0 0}to{background-position:100% 0}}
@media(max-width:700px){
  #liveMap .bp-sky-cloudfield-v5908{mask-image:linear-gradient(to bottom,transparent 0%,#000 13%,#000 29%,transparent 44%);-webkit-mask-image:linear-gradient(to bottom,transparent 0%,#000 13%,#000 29%,transparent 44%)}
  #liveMap .bp-sky-cloudfield-v5908 .bp-sky-cloud-high{opacity:.32;animation-duration:210s}
  #liveMap .bp-sky-cloudfield-v5908 .bp-sky-cloud-mid{opacity:.42;animation-duration:160s}
  #liveMap .bp-sky-cloudfield-v5908 .bp-sky-cloud-low{opacity:.17;animation-duration:260s}
}
@media(prefers-reduced-motion:reduce){
  #liveMap .bp-sky-cloudfield-v5908 .bp-sky-cloud-bank{animation:none!important}
}
`;

function addStyle(){
  if(document.getElementById(STYLE_ID))return;
  const style=document.createElement('style');style.id=STYLE_ID;style.textContent=CSS.replaceAll('#liveMap',':is(#liveMap,#previewMap)');document.head.appendChild(style);
}

export function initSkyClouds(target){
  const map=target?.map||target;
  const container=map?.getContainer?.();
  if(!map||!container)return null;
  if(container.querySelector('.'+ROOT_CLASS)){const existing=window.__BP_SKY_CLOUDS_V5908__;if(existing?.map===map)return existing;container.querySelectorAll('.'+ROOT_CLASS).forEach(node=>node.remove())}
  addStyle();
  if(getComputedStyle(container).position==='static')container.style.position='relative';
  const overlay=document.createElement('div');
  overlay.className=ROOT_CLASS;
  overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML='<div class="bp-sky-cloud-bank bp-sky-cloud-high"></div><div class="bp-sky-cloud-bank bp-sky-cloud-mid"></div><div class="bp-sky-cloud-bank bp-sky-cloud-low"></div>';
  container.appendChild(overlay);
  let enabled=false,lastActive=false,disposed=false;
  const sync=()=>{
    if(disposed)return;
    const zoom=Number(map.getZoom?.()||0),pitch=Number(map.getPitch?.()||0);
    const active=enabled&&!document.hidden&&zoom>=7.2&&pitch>=24;
    if(active!==lastActive){
      lastActive=active;
      overlay.dataset.active=active?'true':'false';
    }
    overlay.dataset.zoomBand=zoom>=14?'city':zoom>=9?'town':'regional';
    window.__BP_SKY_CLOUDS_STATE_V5908__={version:5908,enabled,visible:active,kind:'stylized animated sky clouds',meteorologicalObservation:false,zoom,pitch,updatedAt:Date.now()};
  };
  const onVisibility=()=>sync();
  map.on?.('move',sync);map.on?.('resize',sync);map.on?.('styledata',sync);
  document.addEventListener('visibilitychange',onVisibility);
  sync();
  const api={
    version:5908,map,overlay,get enabled(){return enabled},
    setEnabled(value){enabled=!!value;sync();return enabled},
    toggle(){return this.setEnabled(!enabled)},
    get state(){return window.__BP_SKY_CLOUDS_STATE_V5908__||{version:5908,enabled,visible:false}},
    destroy(){
      if(disposed)return;disposed=true;
      map.off?.('move',sync);map.off?.('resize',sync);map.off?.('styledata',sync);
      document.removeEventListener('visibilitychange',onVisibility);
      overlay.remove();
    }
  };
  window.__BP_SKY_CLOUDS_V5908__=api;
  window.addEventListener('bp:sky-cloud-toggle',event=>{if(event?.detail?.map&&event.detail.map!==map)return;api.toggle()});
  return api;
}
