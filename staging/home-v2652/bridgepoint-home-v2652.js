import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
const supabase=createClient('https://xdfsjztwgsbmabshzsjw.supabase.co','sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25');
const home=document.getElementById('bp-v2652-home');
const workspace=document.getElementById('bp-v2652-workspace');
const openWorld=document.getElementById('bp-v2652-open-world');
const map=document.getElementById('bp-v2652-map');
const refresh=document.getElementById('bp-v2652-refresh');
const fmt=v=>Number(v||0).toLocaleString();
function enterWorkspace(){document.body.classList.add('bp-v2652-workspace');sessionStorage.setItem('bp-v2652-workspace','1')}
function showHome(){document.body.classList.remove('bp-v2652-workspace');sessionStorage.removeItem('bp-v2652-workspace');home?.scrollTo({top:0,behavior:'smooth'})}
workspace?.addEventListener('click',enterWorkspace);
openWorld?.addEventListener('click',()=>{map?.scrollIntoView({behavior:'smooth',block:'start'})});
refresh?.addEventListener('click',()=>load(true));
if(sessionStorage.getItem('bp-v2652-workspace')==='1')enterWorkspace();
window.BridgePointV2652Home={showHome,enterWorkspace};
async function load(force=false){
  try{
    if(refresh){refresh.disabled=true;refresh.textContent='Refreshing…'}
    const [cat,pulse]=await Promise.all([
      supabase.rpc('bridgepoint_living_world_catalog_v2652'),
      supabase.rpc('bridgepoint_public_system_pulse_v957')
    ]);
    if(cat.error)throw cat.error;
    const counts=cat.data?.counts||{},p=pulse.data||{};
    const values={
      layers:counts.layers,sources:counts.sources,observations:counts.observations,
      roofs:counts.roof_assets,parcels:p.total_parcels,opportunities:p.active_opportunities
    };
    for(const [k,v] of Object.entries(values)){const e=document.querySelector(`[data-bp-v2652-stat="${k}"]`);if(e)e.textContent=fmt(v)}
    const meta=document.getElementById('bp-v2652-meta');if(meta)meta.textContent=`${fmt(counts.layers)} governed world layers · ${fmt(counts.sources)} active sources · ${fmt(counts.detail_jobs)} local-detail jobs · ${fmt(counts.lidar_derivation_jobs)} lidar derivations`;
    const stamp=document.getElementById('bp-v2652-updated');if(stamp)stamp.textContent=`Updated ${new Date().toLocaleTimeString()}`;
  }catch(error){const stamp=document.getElementById('bp-v2652-updated');if(stamp)stamp.textContent=`Live counters waiting: ${error?.message||error}`}
  finally{if(refresh){refresh.disabled=false;refresh.textContent='Refresh truth'}}
}
load();setInterval(()=>{if(!document.hidden)load()},30000);
