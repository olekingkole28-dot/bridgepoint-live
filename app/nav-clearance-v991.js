(()=>{
'use strict';
if(window.__bridgepointNavClearanceV992)return;
window.__bridgepointNavClearanceV992=true;

const style=document.createElement('style');
style.id='bp992-nav-clearance-style';
style.textContent=`
  #bp-live-home-v984{bottom:var(--bp992-nav-clearance,96px)!important}
  #bp988-home-hard-cover{bottom:var(--bp992-nav-clearance,96px)!important}
  #bp974-cosmos{clip-path:inset(max(64px,env(safe-area-inset-top)) 0 var(--bp992-nav-clearance,96px) 0)!important}
  @media(min-width:901px){
    #bp-live-home-v984{bottom:var(--bp984-nav-gap,82px)!important}
    #bp988-home-hard-cover{bottom:var(--bp984-nav-gap,82px)!important}
    #bp974-cosmos{clip-path:inset(max(64px,env(safe-area-inset-top)) 0 var(--bp984-nav-gap,82px) 0)!important}
  }
`;
document.head.appendChild(style);

function txt(el){return `${el?.getAttribute?.('aria-label')||''} ${el?.textContent||''}`.replace(/\s+/g,' ').trim().toLowerCase();}
function isTabText(s){return ['home','map','properties','worth','investor','more','work','plans'].some(k=>s===k||s.startsWith(k+' '));}
function measure(){
  let clearance=96;
  try{
    const hits=[...document.querySelectorAll('flt-semantics,[aria-label]')]
      .map(el=>({el,r:el.getBoundingClientRect?.(),s:txt(el)}))
      .filter(x=>x.r&&x.r.width>20&&x.r.height>20&&x.r.top>innerHeight*.62&&isTabText(x.s));
    if(hits.length){
      const navTop=Math.min(...hits.map(x=>x.r.top));
      // Exact seam: Home ends where the Flutter tab hitboxes begin.
      // No extra margin means no old-layout strip, while the tab area remains untouched.
      clearance=Math.ceil(innerHeight-navTop);
    }
  }catch(_){ }
  clearance=Math.max(72,Math.min(160,clearance));
  document.documentElement.style.setProperty('--bp992-nav-clearance',`${clearance}px`);
  document.documentElement.style.setProperty('--bp984-nav-gap',`${clearance}px`);
}

measure();
new MutationObserver(measure).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','aria-selected','aria-current']});
addEventListener('resize',measure,{passive:true});
setInterval(measure,700);
})();