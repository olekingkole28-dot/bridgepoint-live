(()=>{
'use strict';
if(window.__bridgepointNavBoundaryV996)return;
window.__bridgepointNavBoundaryV996=true;

const style=document.createElement('style');
style.id='bp996-nav-boundary-style';
style.textContent=`
  /* Home itself stops at Flutter's semantic tab hitbox so it can never steal a tab tap. */
  #bp-live-home-v984{
    bottom:var(--bp996-touch-clearance,150px)!important;
    -webkit-mask-image:linear-gradient(to bottom,#000 0,#000 calc(100% - 16px),rgba(0,0,0,.95) calc(100% - 8px),transparent 100%)!important;
    mask-image:linear-gradient(to bottom,#000 0,#000 calc(100% - 16px),rgba(0,0,0,.95) calc(100% - 8px),transparent 100%)!important;
  }

  /* These are pointer-free atmosphere layers. They continue down to the VISUAL top of
     the nav bar, hiding the old compiled Flutter page that sits inside the oversized
     semantics hitbox above the visible nav. This is not a separate strip element. */
  #bp988-home-hard-cover{
    bottom:var(--bp996-visual-clearance,94px)!important;
    pointer-events:none!important;
  }
  #bp974-cosmos{
    clip-path:inset(max(64px,env(safe-area-inset-top)) 0 var(--bp996-visual-clearance,94px) 0)!important;
    pointer-events:none!important;
  }

  #bp994-nav-seam-cover{display:none!important;visibility:hidden!important;opacity:0!important}

  @media(min-width:901px){
    #bp-live-home-v984{-webkit-mask-image:none!important;mask-image:none!important;bottom:var(--bp984-nav-gap,82px)!important}
    #bp988-home-hard-cover{bottom:var(--bp984-nav-gap,82px)!important}
    #bp974-cosmos{clip-path:inset(max(64px,env(safe-area-inset-top)) 0 var(--bp984-nav-gap,82px) 0)!important}
  }
`;
document.head.appendChild(style);

function txt(el){return `${el?.getAttribute?.('aria-label')||''} ${el?.textContent||''}`.replace(/\s+/g,' ').trim().toLowerCase();}
function isTabText(s){return ['home','map','properties','worth','investor','more','work','plans'].some(k=>s===k||s.startsWith(k+' '));}
function measure(){
  let touchClearance=150;
  try{
    const hits=[...document.querySelectorAll('flt-semantics,[aria-label]')]
      .map(el=>({r:el.getBoundingClientRect?.(),s:txt(el)}))
      .filter(x=>x.r&&x.r.width>20&&x.r.height>20&&x.r.top>innerHeight*.62&&isTabText(x.s));
    if(hits.length){
      const navHitTop=Math.min(...hits.map(x=>x.r.top));
      touchClearance=Math.ceil(innerHeight-navHitTop);
    }
  }catch(_){ }

  touchClearance=Math.max(105,Math.min(220,touchClearance));

  // Flutter's semantic destination boxes extend well above the painted bottom nav.
  // Keep ~66px of that oversized semantic zone visible only as BridgePoint atmosphere.
  // Because those layers are pointer-events:none, the full Flutter tab hitbox remains tappable.
  const overlap=Math.min(66,Math.max(0,touchClearance-88));
  const visualClearance=Math.max(88,touchClearance-overlap);

  const de=document.documentElement;
  de.style.setProperty('--bp996-touch-clearance',`${touchClearance}px`);
  de.style.setProperty('--bp996-visual-clearance',`${visualClearance}px`);
  de.style.setProperty('--bp995-nav-clearance',`${touchClearance}px`);
  de.style.setProperty('--bp992-nav-clearance',`${touchClearance}px`);
  de.style.setProperty('--bp984-nav-gap',`${touchClearance}px`);
  document.getElementById('bp994-nav-seam-cover')?.remove();
}

measure();
new MutationObserver(measure).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','aria-selected','aria-current']});
addEventListener('resize',measure,{passive:true});
setInterval(measure,900);
})();