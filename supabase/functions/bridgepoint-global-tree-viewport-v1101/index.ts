import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { fromUrl } from "npm:geotiff@2.1.3";
import { detectCanopyPeaks, treeCandidateSourceTruth } from "./tree-canopy-peaks.mjs";

const VERSION=1109;
const U=Deno.env.get("SUPABASE_URL")!, S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const ALLOWED=new Set(["https://bridgepointintelligence.online","https://www.bridgepointintelligence.online","https://olekingkole28-dot.github.io"]);
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const finite=(v:any)=>{const n=Number(v);return Number.isFinite(n)?n:null};
const allowed=(o:string)=>{if(!o)return true;if(ALLOWED.has(o))return true;try{const u=new URL(o);return (u.hostname==="localhost"||u.hostname==="127.0.0.1")&&(u.protocol==="http:"||u.protocol==="https:")}catch{return false}};
const headers=(o:string)=>({"content-type":"application/json","cache-control":"public, max-age=45, stale-while-revalidate=180","access-control-allow-origin":ALLOWED.has(o)?o:"https://bridgepointintelligence.online","vary":"Origin","access-control-allow-headers":"apikey,authorization,x-client-info,content-type","access-control-allow-methods":"POST,OPTIONS","x-bridgepoint-version":String(VERSION)});

function metaY(lat:number,z=10){const p=clamp(lat,-85.05112878,85.05112878)*Math.PI/180,n=2**z;return Math.floor((1-Math.asinh(Math.tan(p))/Math.PI)/2*n)}
function metaX(lon:number,z=10){const n=2**z;return Math.floor((clamp(lon,-180,179.999999)+180)/360*n)}
function quadkey(x:number,y:number,z=10){let q='';for(let i=z;i>0;i--){let d=0,m=1<<(i-1);if(x&m)d++;if(y&m)d+=2;q+=d}return q}
function metaTilesFor(w:number,s:number,e:number,n:number){
 const z=10,out:any[]=[];const x0=clamp(metaX(w,z),0,2**z-1),x1=clamp(metaX(e-1e-10,z),0,2**z-1),y0=clamp(metaY(n,z),0,2**z-1),y1=clamp(metaY(s+1e-10,z),0,2**z-1);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const q=quadkey(x,y,z);out.push({x,y,z,quadkey:q,url:`https://dataforgood-fb-data.s3.amazonaws.com/forests/v2/global/dinov3_global_chm_v2_ml3/chm/${q}.tif`})}
 return out
}
const WM_R=6378137;
function mercX(lon:number){return WM_R*lon*Math.PI/180}
function mercY(lat:number){const p=clamp(lat,-85.05112878,85.05112878)*Math.PI/180;return WM_R*Math.log(Math.tan(Math.PI/4+p/2))}
function invMerc(mx:number,my:number){return [mx/WM_R*180/Math.PI,(2*Math.atan(Math.exp(my/WM_R))-Math.PI/2)*180/Math.PI]}
function hash32(s:string){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}return h>>>0}
function dims(h:number){
 return {trunk_height_m:clamp(h*.32,1.3,10),crown_diameter_m:clamp(h*.56,2.4,13),trunk_diameter_m:clamp(h*.07,.18,1.25)};
}
async function cached(w:number,s:number,e:number,n:number,limit:number){
 const {data,error}=await sb.rpc("bridgepoint_global_tree_cache_viewport_v1102",{p_west:w,p_south:s,p_east:e,p_north:n,p_limit:limit});
 if(error)throw error;return data||{type:"FeatureCollection",features:[]};
}
function activeMetaTile(w:number,s:number,e:number,n:number){
 const lon=(w+e)/2,lat=(s+n)/2,epsilon=1e-8;
 return metaTilesFor(lon-epsilon,lat-epsilon,lon+epsilon,lat+epsilon)[0]||null;
}
async function deriveMetaTile(t:any,w:number,s:number,e:number,n:number,limit:number){
 const tif=await fromUrl(t.url);const img=await tif.getImage();const bb=img.getBoundingBox(),W=img.getWidth(),H=img.getHeight();
 const vw=mercX(w),ve=mercX(e),vs=mercY(s),vn=mercY(n),iw=Math.max(vw,bb[0]),ie=Math.min(ve,bb[2]),is=Math.max(vs,bb[1]),inn=Math.min(vn,bb[3]);if(iw>=ie||is>=inn)return [];
 let x0=Math.floor((iw-bb[0])/(bb[2]-bb[0])*W),x1=Math.ceil((ie-bb[0])/(bb[2]-bb[0])*W);
 let y0=Math.floor((bb[3]-inn)/(bb[3]-bb[1])*H),y1=Math.ceil((bb[3]-is)/(bb[3]-bb[1])*H);
 x0=clamp(x0,0,W-1);x1=clamp(x1,x0+1,W);y0=clamp(y0,0,H-1);y1=clamp(y1,y0+1,H);
 const midLat=(s+n)/2,groundScale=Math.max(.12,Math.cos(midLat*Math.PI/180));
 const targetSpacing=limit<=400?5.5:limit<=900?4.2:limit<=1800?3.0:2.2;
 const outW=Math.round(clamp((ie-iw)*groundScale/targetSpacing,32,2048));
 const outH=Math.round(clamp((inn-is)*groundScale/targetSpacing,32,2048));
 const rr:any=await img.readRasters({window:[x0,y0,x1,y1],width:outW,height:outH,resampleMethod:"nearest",interleave:true});
 const spacingX=((ie-iw)*groundScale)/outW,spacingY=((inn-is)*groundScale)/outH;
 const peaks=detectCanopyPeaks(rr,outW,outH,{
  spacingMetersX:spacingX,spacingMetersY:spacingY,minHeightMeters:2.5,
  maxInstances:Math.min(6000,limit*2),seed:t.quadkey
 });
 const truth=treeCandidateSourceTruth();
 return peaks.map(peak=>{
  const ox=x0+(peak.x+.5)*(x1-x0)/outW,oy=y0+(peak.y+.5)*(y1-y0)/outH;
  const px=Math.max(0,Math.min(W-1,Math.round(ox))),py=Math.max(0,Math.min(H-1,Math.round(oy)));
  const mx=bb[0]+(ox/W)*(bb[2]-bb[0]),my=bb[3]-(oy/H)*(bb[3]-bb[1]),ll=invMerc(mx,my),lon=ll[0],lat=ll[1];
  if(lon<w||lon>e||lat<s||lat>n)return null;
  const h=clamp(Number(peak.height),2.5,80),rid=`${t.quadkey}:${px}:${py}`,d=dims(h);
  return {source_key:"META_WRI_CHMV2_LOCAL_MAXIMA_V1109",source_record_id:rid,tile_key:t.quadkey,
   geometry:`POINT(${lon} ${lat})`,height_m:h,render_height_m:h,
   trunk_height_m:d.trunk_height_m,crown_diameter_m:d.crown_diameter_m,trunk_diameter_m:d.trunk_diameter_m,
   leaf_cycle:null,species:null,position_truth:truth.positionTruth,height_truth:truth.heightTruth,
   properties:{native_resolution_m:1,sample_spacing_m:Number(Math.max(spacingX,spacingY).toFixed(2)),
    source_crs:"EPSG:3857",quadkey:t.quadkey,canopy_model:"Meta/WRI DINOv3 CHMv2",
    height_unit:"m",individual_tree_truth:false,position_note:truth.positionNote,
    structure_truth:"DERIVED_FROM_MODELED_CANOPY_HEIGHT"}};
 }).filter(Boolean);
}
async function persist(rows:any[]){
 if(!rows.length)return 0;
 let total=0;
 for(let i=0;i<rows.length;i+=250){
  const part=rows.slice(i,i+250).flatMap((r:any)=>{
   const m=String(r.geometry||'').match(/POINT\(([-\d.]+) ([-\d.]+)\)/);if(!m)return[];
   return [{source_key:r.source_key,source_record_id:r.source_record_id,tile_key:r.tile_key,lon:Number(m[1]),lat:Number(m[2]),
    height_m:r.height_m,render_height_m:r.render_height_m,trunk_height_m:r.trunk_height_m,crown_diameter_m:r.crown_diameter_m,
    trunk_diameter_m:r.trunk_diameter_m,leaf_cycle:r.leaf_cycle,species:r.species,position_truth:r.position_truth,
    height_truth:r.height_truth,properties:r.properties}];
  });
  if(!part.length)continue;
  const {data,error}=await sb.rpc("bridgepoint_global_tree_cache_upsert_v1104",{p_rows:part});if(error)throw error;
  total+=Number(data||0);
 }
 return total;
}
Deno.serve(async(req)=>{
 const origin=req.headers.get("origin")||"",H=headers(origin);
 if(req.method==="OPTIONS")return new Response(null,{status:allowed(origin)?204:403,headers:H});
 if(req.method!=="POST"&&req.method!=="GET")return new Response(JSON.stringify({complete:false,error:"GET_OR_POST_REQUIRED"}),{status:405,headers:H});
 if(!allowed(origin))return new Response(JSON.stringify({complete:false,error:"ORIGIN_NOT_ALLOWED"}),{status:403,headers:H});
 try{
  const b=req.method==="GET"?Object.fromEntries(new URL(req.url).searchParams.entries()):await req.json().catch(()=>({})),w=finite(b.west),s=finite(b.south),e=finite(b.east),n=finite(b.north);
  if(w==null||s==null||e==null||n==null||w>=e||s>=n||w< -180||e>180||s< -90||n>90)return new Response(JSON.stringify({complete:false,error:"VALID_VIEWPORT_REQUIRED"}),{status:400,headers:H});
  if(e-w>.75||n-s>.75)return new Response(JSON.stringify({complete:true,version:VERSION,type:"FeatureCollection",features:[],reason:"ZOOM_IN_FOR_3D_TREES"}),{headers:H});
  const limit=Math.min(Math.max(Number(b.limit||1200),80),3000);
  const hit=await cached(w,s,e,n,limit),cachedFeatures=hit?.features||[];
  const goodCached=cachedFeatures.filter((f:any)=>
   f?.properties?.source_key==="META_WRI_CHMV2_LOCAL_MAXIMA_V1109"&&
   f?.properties?.height_m!=null&&
   f?.properties?.position_truth==="CHMV2_LOCAL_CANOPY_PEAK_ESTIMATE_V1109"
  );
  if(goodCached.length>=Math.min(80,Math.floor(limit*.2))){
   const heightBacked=cachedFeatures.filter((f:any)=>f?.properties?.height_m!=null).length;
   return new Response(JSON.stringify({...hit,complete:true,version:VERSION,tree_count:cachedFeatures.length,
    height_backed_count:heightBacked,modeled_height_count:heightBacked,measured_height_count:0,
    source:"META_WRI_CHMV2_LOCAL_CANOPY_PEAKS",active_tile_only:true,building_footprint_exclusion:true}),{headers:H});
  }
  const tile=activeMetaTile(w,s,e,n),rows:any[]=[];
  if(tile){
   try{rows.push(...await deriveMetaTile(tile,w,s,e,n,limit))}
   catch(error){console.warn("meta_chmv2_local_maxima",tile.quadkey,String((error as any)?.message||error))}
  }
  const picked=rows.slice(0,limit);
  if(picked.length)await persist(picked);
  const fresh=await cached(w,s,e,n,limit),features=fresh?.features||[];
  const heightBacked=features.filter((f:any)=>f?.properties?.height_m!=null).length;
  return new Response(JSON.stringify({...fresh,complete:true,version:VERSION,tree_count:features.length,
   height_backed_count:heightBacked,modeled_height_count:heightBacked,measured_height_count:0,
   source:"META_WRI_CHMV2_LOCAL_CANOPY_PEAKS",active_tile_only:true,active_tile:tile?.quadkey||null,
   candidates_generated:picked.length,cache_rows_written:picked.length?true:false,
   building_footprint_exclusion:true}),{headers:H});
 }catch(e){return new Response(JSON.stringify({complete:false,version:VERSION,error:"GLOBAL_TREE_VIEWPORT_UNAVAILABLE",detail:String((e as any)?.message||e).slice(0,500)}),{status:500,headers:H})}
});