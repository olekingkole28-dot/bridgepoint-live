(()=>{
'use strict';
if(window.__bridgepointHomeSeamFixV1037)return;
window.__bridgepointHomeSeamFixV1037=true;

// The founding offer belongs inside Plans, never as a floating corner button.
function removeFloatingOffer(){
  document.getElementById('bp1036-commerce-tab')?.remove();
}
removeFloatingOffer();

const style=document.createElement('style');
style.id='bp1037-home-seam-style';
style.textContent=`
  #bp1036-commerce-tab{display:none!important;visibility:hidden!important;pointer-events:none!important}
  html.bp1000-home flutter-view{
    clip-path:inset(calc(100% - var(--bp1037-nav-height,82px)) 0 0 0)!important;
    -webkit-clip-path:inset(calc(100% - var(--bp1037-nav-height,82px)) 0 0 0)!important;
  }
  html.bp1000-home #bp-live-home-v984{
    bottom:var(--bp1037-nav-height,82px)!important;
  }
  html.bp1000-home #bp974-cosmos{
    clip-path:inset(var(--bp1000-header,72px) 0 var(--bp1037-nav-height,82px) 0)!important;
  }
  #bp1037-home-seam-guard{
    position:fixed;z-index:2147483614;left:0;right:0;
    bottom:var(--bp1037-nav-height,82px);height:8px;
    display:none;pointer-events:none;
    background:linear-gradient(180deg,rgba(3,8,17,0),#030811 72%);
  }
  html.bp1000-home #bp1037-home-seam-guard{display:block}
`;
document.head.appendChild(style);

const guard=document.createElement('div');
guard.id='bp1037-home-seam-guard';
guard.setAttribute('aria-hidden','true');
document.body.appendChild(guard);

function txt(el){
  return `${el?.getAttribute?.('aria-label')||''} ${el?.textContent||''}`
    .replace(/\s+/g,' ').trim().toLowerCase();
}
function isTabLabel(s){
  return /^(home|map|properties?|work|plans?|worth|more|investor)\b/.test(s);
}
function validRect(r){
  return r&&Number.isFinite(r.top)&&Number.isFinite(r.bottom)&&r.width>12&&r.height>12;
}
function median(values){
  if(!values.length)return null;
  const a=[...values].sort((x,y)=>x-y),m=Math.floor(a.length/2);
  return a.length%2?a[m]:(a[m-1]+a[m])/2;
}
function detectNavTop(){
  const tabs=[];
  for(const el of document.querySelectorAll('flt-semantics,[aria-label]')){
    const label=txt(el);
    if(!isTabLabel(label))continue;
    const r=el.getBoundingClientRect?.();
    if(!validRect(r)||r.top<innerHeight*.70||r.bottom<innerHeight*.86)continue;
    tabs.push({el,r});
  }
  if(!tabs.length)return null;

  const ancestors=[];
  for(const t of tabs){
    let node=t.el;
    for(let depth=0;depth<8&&node;depth++,node=node.parentElement){
      const r=node.getBoundingClientRect?.();
      if(!validRect(r))continue;
      if(r.bottom>=innerHeight-5&&r.width>=innerWidth*.90&&r.height>=54&&r.height<=140){
        ancestors.push(r.top);
      }
    }
  }
  if(ancestors.length)return Math.max(...ancestors);

  const leaf=tabs
    .filter(t=>t.r.width>=innerWidth*.11&&t.r.width<=innerWidth*.34&&t.r.height>=42&&t.r.height<=125)
    .map(t=>t.r.top);
  return median(leaf.length?leaf:tabs.map(t=>t.r.top));
}

let lastHeight=0;
function measure(){
  removeFloatingOffer();
  let top=null;
  try{top=detectNavTop();}catch(_){}
  let height=innerWidth<=900?82:76;
  if(Number.isFinite(top))height=Math.round(innerHeight-top);
  // Keep only the actual navigation bar. The previous 92–116px estimate exposed old Flutter body content.
  height=Math.max(68,Math.min(innerWidth<=900?104:92,height));
  if(Math.abs(height-lastHeight)<1)return;
  lastHeight=height;
  const root=document.documentElement;
  root.style.setProperty('--bp1037-nav-height',`${height}px`);
  root.style.setProperty('--bp1000-native-nav',`${height}px`);
  root.style.setProperty('--bp984-nav-gap',`${height}px`);
}

measure();
const observer=new MutationObserver(measure);
observer.observe(document.documentElement,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','aria-selected','aria-current']});
addEventListener('resize',measure,{passive:true});
addEventListener('orientationchange',measure,{passive:true});
setInterval(measure,650);
})();
