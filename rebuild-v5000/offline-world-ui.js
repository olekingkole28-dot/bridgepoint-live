(()=>{'use strict';
if(location.pathname.startsWith('/offline/'))return;
const BUTTON='[data-bp-offline-dock-button="1"]';
function mount(){
 const grid=document.querySelector('[data-bpv-command-grid="map"]');
 if(!grid)return false;
 let button=grid.querySelector(BUTTON);
 if(!button){
  button=document.createElement('button');
  button.type='button';
  button.className='bpv-command-btn';
  button.dataset.bpOfflineDockButton='1';
  button.dataset.bpvAction='offline';
  button.title='Open BridgePoint Offline World and offline map packages';
  button.setAttribute('aria-label','Open BridgePoint Offline World');
  button.innerHTML='<span class="bpv-command-icon" aria-hidden="true">◉</span><span class="bpv-command-label">Offline BridgePoint</span>';
  button.addEventListener('click',()=>{location.assign('/offline/')});
  grid.append(button);
 }
 const old=document.getElementById('bpOfflineWorldEntry');
 if(old)old.remove();
 return true;
}
if(mount())return;
const observer=new MutationObserver(()=>{if(mount())observer.disconnect()});
try{observer.observe(document.documentElement,{childList:true,subtree:true})}catch(_){}
setTimeout(()=>{try{observer.disconnect()}catch(_){};mount()},15000);
})();