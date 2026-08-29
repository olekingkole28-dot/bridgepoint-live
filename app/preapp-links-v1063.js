(()=>{
'use strict';
if(window.__bridgepointPreappLinksV1063)return;window.__bridgepointPreappLinksV1063=true;
const style=document.createElement('style');style.id='bp1063-preapp-links-style';style.textContent=`
#bp1055-deeptech .bp1063-deep-action{margin-top:14px;min-height:44px;border:1px solid rgba(102,232,255,.28);border-radius:12px;background:linear-gradient(135deg,rgba(72,225,255,.14),rgba(108,131,255,.13));color:#fff;padding:0 14px;font:950 11px system-ui;cursor:pointer;display:inline-flex;align-items:center;gap:8px}#bp1055-deeptech .bp1063-deep-action:active{transform:scale(.985)}
#bp1044-preapp .bp1044p-footer{align-items:center;gap:8px!important}#bp1044-preapp .bp1044p-footer .bp1063-footer-note{flex:1 1 100%;color:#728b9f;line-height:1.45}#bp1044-preapp .bp1044p-footer a,#bp1044-preapp .bp1044p-footer button{min-height:36px;border:1px solid rgba(255,255,255,.09);border-radius:999px;background:#0b1d30;color:#94def0!important;padding:0 10px;text-decoration:none;font:900 9px system-ui;cursor:pointer;display:inline-flex;align-items:center;justify-content:center}#bp1044-preapp .bp1044p-footer a:hover,#bp1044-preapp .bp1044p-footer button:hover{border-color:rgba(72,225,255,.34);background:rgba(72,225,255,.07)}
@media(max-width:620px){#bp1044-preapp .bp1044p-footer a,#bp1044-preapp .bp1044p-footer button{min-height:40px;flex:1 1 calc(50% - 8px)}#bp1055-deeptech .bp1063-deep-action{width:100%;justify-content:center}}
`;document.head.appendChild(style);
function entry(intent){try{sessionStorage.setItem('bp1059_entry_intent',intent);}catch(_){}location.href=`./?entry=1&mode=signin&intent=${encodeURIComponent(intent)}`;}
function scrollTo(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth',block:'start'});}
function upgradeDeepTech(){const root=document.getElementById('bp1055-deeptech');if(!root||root.dataset.bp1063Links==='1')return false;root.dataset.bp1063Links='1';const hero=root.querySelector('.bp1055d-hero>div:first-child');if(hero&&!hero.querySelector('.bp1063-deep-action')){const b=document.createElement('button');b.type='button';b.className='bp1063-deep-action';b.innerHTML='Open Deep Tech workspace <span aria-hidden="true">→</span>';b.addEventListener('click',()=>entry('lab'));hero.appendChild(b);}return true;}
function upgradeFooter(){const footer=document.querySelector('#bp1044-preapp .bp1044p-footer');if(!footer||footer.dataset.bp1063Links==='1')return false;footer.dataset.bp1063Links='1';const oldSpan=footer.querySelector('span');if(oldSpan)oldSpan.classList.add('bp1063-footer-note');const existing=new Set([...footer.querySelectorAll('a')].map(a=>(a.textContent||'').trim().toLowerCase()));
const addButton=(label,id)=>{const b=document.createElement('button');b.type='button';b.textContent=label;b.addEventListener('click',()=>scrollTo(id));footer.appendChild(b);};
if(!existing.has('deep tech'))addButton('Deep Tech','bp1055-deeptech');
if(!existing.has('plans'))addButton('Plans','bp1054-plans');
if(!existing.has('legal & trust'))addButton('Legal & Trust','bp1054-trust');
if(!existing.has('terms')){const a=document.createElement('a');a.href='../terms/';a.textContent='Terms';footer.appendChild(a);}
return true;}
function upgrade(){upgradeDeepTech();upgradeFooter();}
new MutationObserver(upgrade).observe(document.documentElement,{childList:true,subtree:true});setTimeout(upgrade,0);setTimeout(upgrade,700);setTimeout(upgrade,1800);
window.BridgePointPreappLinksV1063={upgrade};
})();