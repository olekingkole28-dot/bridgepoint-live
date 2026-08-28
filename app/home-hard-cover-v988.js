(()=>{
'use strict';
if(window.__bridgepointHomeHardCoverV988)return;
window.__bridgepointHomeHardCoverV988=true;

const css=document.createElement('style');
css.id='bp988-home-hard-cover-style';
css.textContent=`
  #bp984-home-mask{display:none!important;visibility:hidden!important;opacity:0!important}
  #bp988-home-hard-cover{
    position:fixed;
    z-index:2147482800;
    left:0;right:0;
    top:max(64px,env(safe-area-inset-top));
    bottom:var(--bp984-nav-gap,86px);
    display:none;
    background:#020610;
    opacity:1;
    pointer-events:none;
  }
  #bp974-cosmos{
    z-index:2147482900!important;
    clip-path:inset(max(64px,env(safe-area-inset-top)) 0 var(--bp984-nav-gap,86px) 0)!important;
  }
  #bp-live-home-v984{z-index:2147483000!important}
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
  cover.style.display=homeIsActuallyVisible()&&!mapOpen?'block':'none';
}

sync();
new MutationObserver(sync).observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','aria-selected','aria-current']});
addEventListener('bridgepoint-tab-v984',sync);
addEventListener('resize',sync,{passive:true});
setInterval(sync,500);
})();
