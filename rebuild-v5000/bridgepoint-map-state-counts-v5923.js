(()=>{
'use strict';
if(window.__BP_MAP_STATE_COUNTS_V5923__)return;
const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co',KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
const fmt=n=>Number(n||0).toLocaleString();
let data=null,loading=null;
function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=String(text);return n}
function renderStates(rows){
 const host=document.getElementById('landingMapOpportunityStates');
 if(host){host.replaceChildren();for(const x of rows){const card=node('article','bp-opp-state'),head=node('div','bp-opp-state-head');head.append(node('b','',x.state_code),node('strong','',fmt(x.opportunity_records)));card.append(head,node('small','',fmt(x.unique_properties)+' distinct properties'));host.append(card)}}
 const pane=document.querySelector('[data-bpv-pane="opportunities"]');
 if(pane){
  let section=pane.querySelector('#bpv-map-state-breakdown-v5923');
  if(!section){
   section=node('section','bpv-opportunity-section');section.id='bpv-map-state-breakdown-v5923';
   const heading=node('div','bpv-opportunity-section-head');heading.append(node('b','','MAIN MAP OPPORTUNITY RECORDS BY STATE'),node('small','','Qualified active map records joined to property identity and state. International risk reviews are shown separately by country.'));
   const list=node('div','bpv-opportunity-list');list.id='bpv-map-opportunity-states';
   section.append(heading,list);
   const note=pane.querySelector('#bpv-opportunity-updated');
   if(note)section.before(note); 
   const types=pane.querySelector('#bpv-map-opportunity-types');
   if(types&&types.parentElement)section.after(types.parentElement===pane?types:types); 
   pane.append(section);
  }
  const list=section.querySelector('#bpv-map-opportunity-states');if(list){list.replaceChildren();for(const x of rows){const card=node('article','bpv-opportunity-row'),info=node('div','bpv-opportunity-row-info');info.append(node('b','',x.state_code),node('small','',fmt(x.unique_properties)+' distinct properties'));card.append(info,node('strong','bpv-opportunity-value',fmt(x.opportunity_records)));list.append(card)}}
 }
}
async function refresh(){
 if(loading)return loading;
 loading=(async()=>{try{
  const r=await fetch(SUPA+'/rest/v1/rpc/bridgepoint_public_map_opportunity_summary_v5920',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json','Accept':'application/json'},body:'{}',cache:'no-store'});
  const d=await r.json();if(!r.ok)throw new Error(d?.message||('HTTP '+r.status));
  if(d?.complete!==true||Number(d.version)!==5920||!Array.isArray(d.by_state))throw new Error('State counters are not ready');
  data=d;window.__BP_MAP_OPPORTUNITY_SUMMARY_V5920__=d;renderStates(d.by_state);
  const status=document.getElementById('bpv-map-state-updated-v5923');if(status)status.textContent='State snapshot: '+new Date(d.state_snapshot_generated_at||d.generated_at||Date.now()).toLocaleString()+'. Main-map record counts are separate from international risk-review records.';
  return d;
 }catch(e){console.warn('BridgePoint state count refresh',e);return null}finally{loading=null}})();return loading;
}
function boot(){
 const page=document.getElementById('landingMapOpportunityStates')||document.querySelector('[data-bpv-pane="opportunities"]');
 if(page){void refresh();window.__BP_MAP_STATE_COUNTS_V5923__={refresh,ready:true};return}
 setTimeout(boot,180);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
window.addEventListener('load',()=>{if(!data)void refresh()},{once:true});
setInterval(()=>{if(!document.hidden)void refresh()},5*60*1000);
})();