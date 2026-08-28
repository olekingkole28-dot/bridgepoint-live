(()=>{
'use strict';
if(window.__bridgepointNavBoundaryV997)return;
window.__bridgepointNavBoundaryV997=true;

const style=document.createElement('style');
style.id='bp997-nav-boundary-style';
style.textContent=`
  /* One boundary only: the actual painted top of Flutter's bottom nav. */
  #bp-live-home-v984{
    bottom:var(--bp997-nav-clearance,112px)!important;
    -webkit-mask-image:none!important;
    mask-image:none!important;
  }
  #bp988-home-hard-cover{
    bottom:var(--bp997-nav-clearance,112px)!important;
    pointer-events:none!important;
  }
  #bp974-cosmos{
    clip-path:inset(max(64px,env(safe-area-inset-top)) 0 var(--bp997-nav-clearance,112px) 0)!important;
    pointer-events:none!important;
  }
  #bp994-nav-seam-cover{display:none!important;visibility:hidden!important;opacity:0!important}

  @media(min-width:901px){
    #bp-live-home-v984{bottom:var(--bp984-nav-gap,82px)!important}
    #bp988-home-hard-cover{bottom:var(--bp984-nav-gap,82px)!important}
    #bp974-cosmos{clip-path:inset(max(64px,env(safe-area-inset-top)) 0 var(--bp984-nav-gap,82px) 0)!important}
  }
`;
document.head.appendChild(style);

function textOf(el){
  return `${el?.getAttribute?.('aria-label')||''} ${el?.textContent||''}`.replace(/\s+/g,' ').trim().toLowerCase();
}
function tabName(s){
  if(/^home\b/.test(s))return'home';
  if(/^map\b/.test(s))return'map';
  if(/^propert/.test(s))return'properties';
  if(/^(worth|investor)\b/.test(s))return'worth';
  if(/^(more|work|plans)\b/.test(s))return'more';
  return null;
}
function rectOK(r){return r&&r.width>0&&r.height>0&&Number.isFinite(r.top)&&Number.isFinite(r.bottom);}
function median(a){if(!a.length)return null;const b=[...a].sort((x,y)=>x-y),m=Math.floor(b.length/2);return b.length%2?b[m]:(b[m-1]+b[m])/2;}

function detectNavTop(){
  const nodes=[...document.querySelectorAll('flt-semantics,[aria-label]')];
  const tabs=[];
  for(const el of nodes){
    const name=tabName(textOf(el));
    if(!name)continue;
    const r=el.getBoundingClientRect?.();
    if(!rectOK(r)||r.top<innerHeight*.68||r.bottom<innerHeight*.82)continue;
    tabs.push({el,name,r});
  }
  if(!tabs.length)return null;

  /* Prefer a shared full-width ancestor ending at the viewport bottom. */
  const candidates=[];
  for(const t of tabs){
    let p=t.el;
    for(let depth=0;depth<7&&p;depth++,p=p.parentElement){
      const r=p.getBoundingClientRect?.();
      if(!rectOK(r))continue;
      const nearBottom=r.bottom>=innerHeight-8;
      const fullWidth=r.width>=innerWidth*.88;
      const saneHeight=r.height>=58&&r.height<=180;
      if(nearBottom&&fullWidth&&saneHeight){
        candidates.push({top:r.top,height:r.height,width:r.width});
      }
    }
  }
  if(candidates.length){
    candidates.sort((a,b)=>a.height-b.height||b.width-a.width);
    return candidates[0].top;
  }

  /* Fallback: use individual ~one-fifth-width destination boxes, not oversized semantics. */
  const leafTops=tabs
    .filter(t=>t.r.width>=innerWidth*.12&&t.r.width<=innerWidth*.32&&t.r.height>=48&&t.r.height<=135)
    .map(t=>t.r.top);
  const mt=median(leafTops);
  if(mt!=null)return mt;

  /* Last resort: median tab top is safer than the previous highest-box calculation. */
  return median(tabs.map(t=>t.r.top));
}

function measure(){
  let navTop=null;
  try{navTop=detectNavTop();}catch(_){ }
  let clearance=112;
  if(Number.isFinite(navTop))clearance=Math.ceil(innerHeight-navTop);
  clearance=Math.max(82,Math.min(165,clearance));
  const de=document.documentElement;
  de.style.setProperty('--bp997-nav-clearance',`${clearance}px`);
  de.style.setProperty('--bp996-visual-clearance',`${clearance}px`);
  de.style.setProperty('--bp996-touch-clearance',`${clearance}px`);
  de.style.setProperty('--bp995-nav-clearance',`${clearance}px`);
  de.style.setProperty('--bp992-nav-clearance',`${clearance}px`);
  de.style.setProperty('--bp984-nav-gap',`${clearance}px`);
  document.getElementById('bp994-nav-seam-cover')?.remove();
}

measure();
new MutationObserver(measure).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['style','class','aria-selected','aria-current']});
addEventListener('resize',measure,{passive:true});
addEventListener('orientationchange',measure,{passive:true});
setInterval(measure,1000);
})();