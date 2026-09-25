export const VERSION=2300;
export const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';
export const KEY='sb_publishable_lM9oWQeHjBmgOIiteeOicQ_PTyAeF25';
export const RPC=`${SUPA}/rest/v1/rpc/`;
export const EDGE=`${SUPA}/functions/v1/`;
export const EMPTY={type:'FeatureCollection',features:[]};
export const MOBILE=innerWidth<=900||/Android|iPhone|iPad|Mobile/i.test(navigator.userAgent);
export const LOW=(Number(navigator.deviceMemory||4)<=3||Number(navigator.hardwareConcurrency||4)<=4);
export const TIER=LOW?'LOW':((Number(navigator.deviceMemory||4)>=8&&Number(navigator.hardwareConcurrency||4)>=8)?'HIGH':'MID');
export const AUTH_KEYS=['sb-xdfsjztwgsbmabshzsjw-auth-token','bp-homepage-auth-v1990','bp-homepage-auth-v1992'];
export const BUILDING_VIEWPORT_CANONICAL_ARGS=true;

export function deepSession(v,seen=new Set()){
  if(!v||seen.has(v))return null;
  if(typeof v==='object'){
    seen.add(v);
    if(typeof v.access_token==='string')return v;
    for(const x of Object.values(v)){const s=deepSession(x,seen);if(s)return s}
  }
  return null;
}
export function session(){
  for(const k of AUTH_KEYS){try{const raw=localStorage.getItem(k);if(!raw)continue;const s=deepSession(JSON.parse(raw));if(s?.access_token)return s}catch(_){}}
  return null;
}
export function token(){return session()?.access_token||''}
export function headers(extra={}){return{apikey:KEY,Authorization:`Bearer ${token()}`,...extra}}
function normalizeRpcArgs(name,args={}){
  if(name!=='bridgepoint_building_viewport_v2300')return args;
  const out={...args};
  // V2300 map historically sent west/south/east/north names while the database RPC
  // contract is min/max latitude/longitude. Normalize both shapes here so mobile and
  // desktop detail loading always hit the canonical backend signature.
  if(out.p_min_lat==null&&out.p_south!=null)out.p_min_lat=out.p_south;
  if(out.p_max_lat==null&&out.p_north!=null)out.p_max_lat=out.p_north;
  if(out.p_min_lng==null&&out.p_west!=null)out.p_min_lng=out.p_west;
  if(out.p_max_lng==null&&out.p_east!=null)out.p_max_lng=out.p_east;
  delete out.p_south;delete out.p_north;delete out.p_west;delete out.p_east;
  return out;
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
export async function rpc(name,args={},timeout=9000){
  const body=normalizeRpcArgs(name,args),attempts=name==='bridgepoint_building_viewport_v2300'?3:1;
  let lastError=null;
  for(let attempt=0;attempt<attempts;attempt++){
    const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
    try{
      const r=await fetch(RPC+name,{method:'POST',headers:headers({'Content-Type':'application/json','Cache-Control':'no-cache'}),body:JSON.stringify(body),signal:c.signal,cache:'no-store'});
      const d=await r.json().catch(()=>({}));
      if(!r.ok)throw new Error(d?.message||d?.error||d?.hint||`HTTP ${r.status}`);
      return d;
    }catch(e){
      lastError=e;
      if(attempt+1>=attempts)throw e;
      await wait(attempt===0?450:1100);
    }finally{clearTimeout(t)}
  }
  throw lastError||new Error('RPC unavailable');
}
export async function edge(name,args={},timeout=15000){
  const c=new AbortController(),t=setTimeout(()=>c.abort(),timeout);
  try{
    const r=await fetch(EDGE+name,{method:'POST',headers:headers({'Content-Type':'application/json'}),body:JSON.stringify(args),signal:c.signal,cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(d?.message||d?.error||`HTTP ${r.status}`);
    return d;
  }finally{clearTimeout(t)}
}
export function tileTransform(url,resourceType){
  if(url.startsWith(SUPA+'/functions/v1/'))return{url,headers:headers()};
  return{url};
}
export function fc(features=[]){return{type:'FeatureCollection',features:features.filter(Boolean)}}
export function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
export function bbox(map,pad=.12){
  const b=map.getBounds(),dx=(b.getEast()-b.getWest())*pad,dy=(b.getNorth()-b.getSouth())*pad;
  return{west:b.getWest()-dx,south:b.getSouth()-dy,east:b.getEast()+dx,north:b.getNorth()+dy};
}
export function lngLatCenter(geometry){
  const pts=[];const walk=v=>{if(!Array.isArray(v))return;if(v.length>=2&&typeof v[0]==='number'&&typeof v[1]==='number'){pts.push(v);return}for(const x of v)walk(x)};walk(geometry?.coordinates);
  if(!pts.length)return null;let x=0,y=0;for(const p of pts){x+=p[0];y+=p[1]}return{x:x/pts.length,y:y/pts.length};
}
