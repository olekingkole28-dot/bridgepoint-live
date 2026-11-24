// Public globe chrome: no account token is fabricated and no private API is unlocked.
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function attachPublicGlobe(world){
 const map=world?.map;if(!map||map.__bpPublicGlobeV4)return;map.__bpPublicGlobeV4=true;
 const container=map.getContainer(),canvas=map.getCanvas();
 const style=document.createElement('style');style.id='bp-public-globe-v4-style';
 style.textContent=' #bp-public-account-v4{position:fixed;top:max(9px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;gap:6px;z-index:1200;transition:opacity .25s,transform .25s;pointer-events:auto} #bp-public-account-v4.bp-hide{opacity:0;pointer-events:none;transform:translate(-50%,-12px)} #bp-public-account-v4 button{appearance:none;min-height:32px;padding:7px 12px;border:1px solid #73c4df77;border-radius:999px;background:#051522dc;color:#e7faff;font:750 11px system-ui;white-space:nowrap;cursor:pointer} #bp-public-account-v4 button:first-child{background:#15485d} #trialBanner{display:none!important} #bp-public-orbit-v4{position:absolute;inset:0;z-index:5;pointer-events:none;overflow:hidden} #bp-public-orbit-v4[hidden]{display:none!important} #bp-public-orbit-v4 button{position:absolute;pointer-events:auto;border:0;border-radius:50%;padding:0;cursor:pointer;background-color:transparent;aspect-ratio:1;box-sizing:border-box} #bp-public-orbit-v4 .sun{background:radial-gradient(circle at 36% 30%,#fffbd3,#ffd472 38%,#fa7c18 68%,#9d2606 100%);box-shadow:0 0 14px 6px #fca32c99,0 0 35px 12px #ff85132c} #bp-public-orbit-v4 .moon{background-image:radial-gradient(circle at 31% 27%,transparent 23%,#000b 87%),url(/assets/moon/v1/moon-lroc-color-4k.webp);background-size:100%,205% 100%;background-position:center,40% center;background-color:#88939f;box-shadow:0 0 8px #a8ccff44} @media(max-width:520px){#bp-public-account-v4 button{font-size:10px;padding:6px 9px;min-height:30px}}';
 document.head.appendChild(style);
 const auth=document.createElement('div');auth.id='bp-public-account-v4';auth.setAttribute('aria-label','Optional BridgePoint account');
 const button=(label,mode)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{window.__BP_PUBLIC_OPEN_AUTH_V4__?.(mode);};auth.appendChild(b);return b};
 const create=button('CREATE ACCOUNT','signup'),login=button('LOGIN','signin');document.body.appendChild(auth);
 const signed=()=>{let a=null;try{a=JSON.parse(localStorage.getItem('bp_auth_v5045')||'null')}catch(_){}const yes=!!a?.access_token;create.hidden=yes;login.textContent=yes?'ACCOUNT':'LOGIN'};
 signed();const signedTimer=setInterval(signed,2500);
 const sky=document.createElement('div');sky.id='bp-public-orbit-v4';sky.hidden=true;
 const sun=document.createElement('button'),moon=document.createElement('button');sun.className='sun';moon.className='moon';sun.setAttribute('aria-label','Explore the Sun');moon.setAttribute('aria-label','Explore the Moon');sky.append(sun,moon);container.appendChild(sky);
 const focus=async body=>{pause();const api=window.__BP_APP_SPACE_EXPLORER_V1__;if(!api?.open){document.getElementById('bpAppSpaceToggleV1')?.click();return}await api.open();window.__BP_WELCOME_SPACE_V6257__?.focus?.(body)};
 sun.onclick=()=>void focus('sun');moon.onclick=()=>void focus('moon');
 let timer=0,spinning=false,interacting=false,lastUser=performance.now(),hideTimer=0,closed=false,lastSky=0;
 const globalZoom=()=>Math.max(.6,Math.min(1.25,Math.log2(Math.max(1,Math.min(container.clientWidth,container.clientHeight))*.80*Math.PI/512)));
 const isGlobal=()=>map.getProjection?.()?.type!=='mercator'&&map.getZoom()<=globalZoom()+.27&&Math.abs(map.getPitch())<12&&!window.__BP_UNDERWATER_DIVE_ACTIVE__&&!window.__BP_APP_SPACE_EXPLORER_V1__?.state?.open;
 function skyLayout(){
  const t=performance.now();if(t-lastSky<120)return;lastSky=t;
  sky.hidden=!isGlobal();if(sky.hidden)return;
  const w=container.clientWidth,h=container.clientHeight,r=Math.min(w,h)*.41,cx=w/2,cy=h/2,sz=clamp(r*.19,17,39),mz=clamp(r*.12,13,26);
  // Outside the full globe disk, so the atmospheric Earth occludes the sky.
  const phase=Date.now()/86400000*2*Math.PI/27.32,a=phase-.7;
  const place=(el,x,y,size)=>{el.style.width=size+'px';el.style.left=clamp(x-size/2,2,w-size-2)+'px';el.style.top=clamp(y-size/2,2,h-size-2)+'px'};
  place(sun,cx-r*.83,cy-r*.89,sz);place(moon,cx+Math.cos(a)*r*1.13,cy+Math.sin(a)*r*1.13,mz);
 }
 function pause(){clearTimeout(timer);timer=0;if(spinning){spinning=false;map.stop?.()}}
 function spin(){
  timer=0;if(closed||document.hidden||interacting||!isGlobal()||performance.now()-lastUser<1900||map.isMoving?.()){schedule(650);return}
  // A slow, continuous, tagged ease; never modify zoom, pitch or bearing.
  const c=map.getCenter();spinning=true;map.easeTo({center:[c.lng+.48,c.lat],duration:2400,easing:t=>t,essential:true},{bpPublicIdleSpin:true});
  schedule(2450);skyLayout();
 }
 function schedule(ms=650){clearTimeout(timer);if(!closed)timer=setTimeout(spin,ms)}
 function userStart(){lastUser=performance.now();interacting=true;pause();auth.classList.add('bp-hide');clearTimeout(hideTimer);skyLayout()}
 function userEnd(){interacting=false;lastUser=performance.now();clearTimeout(hideTimer);hideTimer=setTimeout(()=>{auth.classList.remove('bp-hide');schedule(300)},1800);schedule(2100)}
 function move(e){if(e?.bpPublicIdleSpin!==true&&e?.originalEvent){lastUser=performance.now();auth.classList.add('bp-hide')}skyLayout()}
 function end(e){if(e?.bpPublicIdleSpin===true){spinning=false;return}userEnd();skyLayout()}
 const ptrDown=e=>{if(e.target===canvas||canvas.contains?.(e.target))userStart()};
 const wheel=e=>{if(e.target!==canvas)return;userStart();userEnd()};
 container.addEventListener('pointerdown',ptrDown,true);container.addEventListener('wheel',wheel,{capture:true,passive:true});window.addEventListener('pointerup',userEnd,{passive:true});window.addEventListener('pointercancel',userEnd,{passive:true});
 map.on('move',move);map.on('moveend',end);map.on('resize',skyLayout);map.on('zoom',skyLayout);
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pause();else schedule(900)});
 map.once('remove',()=>{closed=true;pause();clearInterval(signedTimer);clearTimeout(hideTimer);auth.remove();sky.remove();window.removeEventListener('pointerup',userEnd);window.removeEventListener('pointercancel',userEnd)});
 const q=new URLSearchParams(location.search),mode=q.get('auth');if(mode==='signin'||mode==='signup')setTimeout(()=>window.__BP_PUBLIC_OPEN_AUTH_V4__?.(mode),200);
 window.__BP_PUBLIC_GLOBE_V4__={map,globalZoom,publicAccess:true,get rotating(){return spinning},get globalView(){return isGlobal()},pause};
 skyLayout();schedule(2100);
}
