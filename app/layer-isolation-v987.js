(()=>{
'use strict';
if(window.__bridgepointLayerIsolationV987)return;
window.__bridgepointLayerIsolationV987=true;

const css=document.createElement('style');
css.id='bp987-layer-isolation-style';
css.textContent=`
  #bp984-home-mask{
    top:max(72px,env(safe-area-inset-top))!important;
    bottom:var(--bp984-nav-gap,86px)!important;
    background:#020610!important;
    opacity:1!important;
    filter:none!important;
    backdrop-filter:none!important;
    pointer-events:none!important;
  }
  #bp974-cosmos{
    z-index:2147480500!important;
    clip-path:inset(max(72px,env(safe-area-inset-top)) 0 var(--bp984-nav-gap,86px) 0)!important;
  }
  #bp-live-home-v984{
    z-index:2147483000!important;
  }
`;
document.head.appendChild(css);

function sync(){
  const home=document.getElementById('bp-live-home-v984');
  const mask=document.getElementById('bp984-home-mask');
  const map=document.getElementById('bp974-map-dialog');
  if(!mask)return;
  const homeOpen=home?.classList.contains('show')===true;
  const mapOpen=map?.classList.contains('show')===true;
  const shouldBlock=homeOpen&&!mapOpen;
  mask.classList.toggle('show',shouldBlock);
  mask.style.display=shouldBlock?'block':'none';
}

sync();
new MutationObserver(sync).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','aria-selected','aria-current']});
addEventListener('bridgepoint-tab-v984',sync);
addEventListener('resize',sync,{passive:true});
setInterval(sync,1200);
})();
