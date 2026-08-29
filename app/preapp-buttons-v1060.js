(()=>{
'use strict';
if(window.__bridgepointPreappButtonsV1060)return;window.__bridgepointPreappButtonsV1060=true;
const style=document.createElement('style');style.id='bp1060-preapp-buttons-style';style.textContent=`
#bp1055-deeptech .bp1060-preapp-button{width:100%;min-height:150px;display:flex;flex-direction:column;align-items:flex-start;text-align:left;color:#fff;font:inherit;cursor:pointer;appearance:none;-webkit-appearance:none;transition:transform .14s ease,border-color .14s ease,background .14s ease;position:relative;overflow:hidden}
#bp1055-deeptech .bp1060-preapp-button:hover{border-color:rgba(102,232,255,.42);background:linear-gradient(145deg,rgba(13,39,61,.95),rgba(7,21,35,.93))}#bp1055-deeptech .bp1060-preapp-button:active{transform:scale(.985)}
#bp1055-deeptech .bp1060-open{margin-top:auto;padding-top:12px;display:flex;align-items:center;gap:6px;color:#73ebff;font-size:10px;font-weight:1000;letter-spacing:.15px}#bp1055-deeptech .bp1060-open svg{width:15px;height:15px;stroke:currentColor;fill:none;stroke-width:2}
#bp1055-deeptech .bp1060-preapp-button.bp1055d-lab{min-height:138px;border-style:solid;background:linear-gradient(145deg,rgba(39,30,12,.42),rgba(12,20,30,.9))}#bp1055-deeptech .bp1060-preapp-button.bp1055d-lab .bp1060-open{color:#ffd77e}
#bp1055-deeptech .bp1060-preapp-button h4,#bp1055-deeptech .bp1060-preapp-button b{font-size:14px}#bp1055-deeptech .bp1060-preapp-button p{font-size:10px;line-height:1.45}
@media(max-width:780px){#bp1055-deeptech .bp1060-preapp-button{min-height:126px;padding:15px}#bp1055-deeptech .bp1060-preapp-button h4,#bp1055-deeptech .bp1060-preapp-button b{font-size:15px}.bp1055d-grid,.bp1055d-road{gap:10px!important}}
`;document.head.appendChild(style);
const arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';
function intentFor(el){if(el.classList.contains('bp1055d-lab'))return'lab';const grid=el.parentElement,heading=grid?.previousElementSibling?.querySelector?.('h3')?.textContent?.toLowerCase()||'';if(heading.includes('loading across')||heading.includes('u.s.'))return'properties';return'product';}
function labelFor(intent){return intent==='lab'?'Open Intelligence Lab':intent==='properties'?'Open Property Workspace':'Open Product Tools';}
function route(intent){const existing=document.querySelector(`#bp1059-entry-grid [data-bp1059-entry="${intent}"]`);if(existing){existing.click();return;}sessionStorage.setItem('bp1059_entry_intent',intent);location.href=`./?entry=1&mode=signin&intent=${encodeURIComponent(intent)}`;}
function replace(el){if(!el||el.dataset.bp1060Button==='1'||el.closest('button'))return false;const intent=intentFor(el),b=document.createElement('button');b.type='button';b.className=el.className+' bp1060-preapp-button';b.dataset.bp1060Button='1';b.dataset.bp1060Intent=intent;b.innerHTML=el.innerHTML+`<span class="bp1060-open">${labelFor(intent)} ${arrow}</span>`;b.addEventListener('click',()=>route(intent));el.replaceWith(b);return true;}
function upgrade(){const root=document.getElementById('bp1055-deeptech');if(!root)return false;let changed=false;root.querySelectorAll('.bp1055d-card:not([data-bp1060-button="1"]),.bp1055d-lab:not([data-bp1060-button="1"])').forEach(el=>{changed=replace(el)||changed;});return changed;}
function pending(){return !!document.querySelector('#bp1055-deeptech .bp1055d-card:not([data-bp1060-button="1"]),#bp1055-deeptech .bp1055d-lab:not([data-bp1060-button="1"])');}
let tries=0,stable=0;const t=setInterval(()=>{tries++;upgrade();const root=document.getElementById('bp1055-deeptech');if(root&&!pending())stable++;else stable=0;if(stable>=4||tries>40)clearInterval(t);},500);setTimeout(upgrade,0);setTimeout(upgrade,900);
window.BridgePointPreappButtonsV1060={upgrade,route,pending};
})();