(()=>{
'use strict';
if(window.__bridgepointNavSeamCoverV994)return;
window.__bridgepointNavSeamCoverV994=true;
const style=document.createElement('style');
style.id='bp994-nav-seam-cover-style';
style.textContent=`
  #bp994-nav-seam-cover{
    position:fixed;
    left:0;right:0;
    bottom:var(--bp992-nav-clearance,96px);
    height:44px;
    z-index:2147483604;
    display:none;
    pointer-events:none!important;
    background:linear-gradient(180deg,rgba(3,8,17,.08) 0%,rgba(3,8,17,.82) 34%,#071729 100%);
    box-shadow:0 10px 24px rgba(0,0,0,.20);
  }
  html.bp990-home #bp994-nav-seam-cover{display:block}
  html.bp990-nonhome #bp994-nav-seam-cover{display:none!important}
  html.bp990-home #bp-live-home-v984{padding-bottom:62px!important}
  @media(min-width:901px){#bp994-nav-seam-cover{display:none!important}}
`;
document.head.appendChild(style);
const seam=document.createElement('div');
seam.id='bp994-nav-seam-cover';
seam.setAttribute('aria-hidden','true');
document.body.appendChild(seam);
})();