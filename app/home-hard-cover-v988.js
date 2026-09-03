(()=>{
'use strict';
if(window.__bridgepointHomeHardCoverV989)return;
window.__bridgepointHomeHardCoverV989=true;

const css=document.createElement('style');
css.id='bp989-home-hard-cover-style';
css.textContent=`
  #bp984-home-mask{display:none!important;visibility:hidden!important;opacity:0!important}
  #bp988-home-hard-cover{
    position:fixed!important;
    z-index:2147483600!important;
    left:0!important;right:0!important;
    top:max(64px,env(safe-area-inset-top))!important;
    bottom:var(--bp984-nav-gap,86px)!important;
    display:none;
    background:#020610!important;
    opacity:1!important;
    filter:none!important;
    backdrop-filter:none!important;
    pointer-events:none!important;
  }
  #bp974-cosmos{
    z-index:2147483601!important;
    clip-path:inset(max(64px,env(safe-area-inset-top)) 0 var(--bp984-nav-gap,86px) 0)!important;
  }
  #bp-live-home-v984{z-index:2147483602!important}
`;
document.head.appendChild(css);

const cover=document.createElement('div');
cover.id='bp988-home-hard-cover';
cover.setAttribute('aria-hidden','true');
document.body.appendChild(cover);

function homeIsActuallyVisible(){
  const home=document.getElementById('bp-live-home-v984');
  if(!home)return false;
  const s=getComputedStyle(home);
  if(s.display==='none'||s.visibility==='hidden'||Number(s.opacity||1)===0)return false;
  const r=home.getBoundingClientRect();
  return r.width>0&&r.height>0;
}
function sync(){
  const mapOpen=document.getElementById('bp974-map-dialog')?.classList.contains('show')===true;
  const on=homeIsActuallyVisible()&&!mapOpen;
  cover.style.setProperty('display',on?'block':'none','important');
}

sync();
new MutationObserver(sync).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','aria-selected','aria-current']});
addEventListener('bridgepoint-tab-v984',sync);
addEventListener('resize',sync,{passive:true});
setInterval(sync,250);
})();
