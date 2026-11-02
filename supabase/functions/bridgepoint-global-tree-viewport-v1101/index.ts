import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { fromUrl } from "npm:geotiff@2.1.3";

const VERSION=1108;
const U=Deno.env.get("SUPABASE_URL")!, S=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const sb=createClient(U,S,{auth:{persistSession:false,autoRefreshToken:false}});
const ALLOWED=new Set(["https://bridgepointintelligence.online","https://www.bridgepointintelligence.online","https://olekingkole28-dot.github.io"]);
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
const finite=(v:any)=>{const n=Number(v);return Number.isFinite(n)?n:null};
const allowed=(o:string)=>{if(!o)return true;if(ALLOWED.has(o))return true;try{const u=new URL(o);return (u.hostname==="localhost"||u.hostname==="127.0.0.1")&&(u.protocol==="http:"||u.protocol==="https:")}catch{return false}};
const headers=(o:string)=>({"content-type":"application/json","cache-control":"public, max-age=45, stale-while-revalidate=180","access-control-allow-origin":ALLOWED.has(o)?o:"https://bridgepointintelligence.online","vary":"Origin","access-control-allow-headers":"apikey,authorization,x-client-info,content-type","access-control-allow-methods":"POST,OPTIONS","x-bridgepoint-version":String(VERSION)});

function tileCode(lat0:number,lon0:number){
 const ns=lat0>=0?"N":"S", ew=lon0>=0?"E":"W";
 return ns+String(Math.abs(lat0)).padStart(2,"0")+ew+String(Math.abs(lon0)).padStart(3,"0");
}
function tilesFor(w:number,s:number,e:number,n:number){
 const out:any[]=[]; const eps=1e-10;
 for(let lat=Math.floor(s/3)*3;lat<=Math.floor((n-eps)/3)*3;lat+=3)
  for(let lon=Math.floor(w/3)*3;lon<=Math.floor((e-eps)/3)*3;lon+=3){
   const code=tileCode(lat,lon);
   out.push({lat0:lat,lon0:lon,code,url:`https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_${code}_Map.tif`});
  }
 return out;
}
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
function havM(a:number,b:number,c:number,d:number){const r=Math.PI/180,x=(d-b)*r*Math.cos((a+c)*r/2),y=(c-a)*r;return 6371000*Math.hypot(x,y)}
function dims(h:number){
 return {trunk_height_m:clamp(h*.32,1.3,10),crown_diameter_m:clamp(h*.56,2.4,13),trunk_diameter_m:clamp(h*.07,.18,1.25)};
}
function heightBuckets(rows:any[]){
 const g=new Map<string,any[]>(),step=.05;
 for(const x of rows||[]){const lat=Number(x.lat),lon=Number(x.lon),h=Number(x.canopy_height_m);if(!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(h)||h<=0)continue;const k=`${Math.floor(lat/step)}:${Math.floor(lon/step)}`;if(!g.has(k))g.set(k,[]);g.get(k)!.push(x)}
 return {g,step};
}
function nearestHeight(b:any,lat:number,lon:number){
 const iy=Math.floor(lat/b.step),ix=Math.floor(lon/b.step);let best:any=null,bd=Infinity;
 for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++)for(const x of b.g.get(`${iy+dy}:${ix+dx}`)||[]){const d=havM(lat,lon,Number(x.lat),Number(x.lon));if(d<bd){bd=d;best=x}}
 return bd<=6000?best:null;
}

async function cached(w:number,s:number,e:number,n:number,limit:number){
 const {data,error}=await sb.rpc("bridgepoint_global_tree_cache_viewport_v1101",{p_west:w,p_south:s,p_east:e,p_north:n,p_limit:limit});
 if(error)throw error;return data||{type:"FeatureCollection",features:[]};
}
async function heightSamples(w:number,s:number,e:number,n:number){
 const pad=.06; const {data,error}=await sb.rpc("bridgepoint_global_tree_height_samples_v1101",{p_west:Math.max(-180,w-pad),p_south:Math.max(-90,s-pad),p_east:Math.min(180,e+pad),p_north:Math.min(90,n+pad),p_limit:5000});
 if(error)throw error;return Array.isArray(data)?data:[];
}
async function deriveMetaTile(t:any,w:number,s:number,e:number,n:number,limit:number){
 const tif=await fromUrl(t.url);const img=await tif.getImage();const bb=img.getBoundingBox(),W=img.getWidth(),H=img.getHeight();
 const vw=mercX(w),ve=mercX(e),vs=mercY(s),vn=mercY(n),iw=Math.max(vw,bb[0]),ie=Math.min(ve,bb[2]),is=Math.max(vs,bb[1]),inn=Math.min(vn,bb[3]);if(iw>=ie||is>=inn)return [];
 let x0=Math.floor((iw-bb[0])/(bb[2]-bb[0])*W),x1=Math.ceil((ie-bb[0])/(bb[2]-bb[0])*W);
 let y0=Math.floor((bb[3]-inn)/(bb[3]-bb[1])*H),y1=Math.ceil((bb[3]-is)/(bb[3]-bb[1])*H);
 x0=clamp(x0,0,W-1);x1=clamp(x1,x0+1,W);y0=clamp(y0,0,H-1);y1=clamp(y1,y0+1,H);
 const spacing=limit<=400?26:limit<=800?18:14,outW=Math.round(clamp((ie-iw)/spacing,18,420)),outH=Math.round(clamp((inn-is)/spacing,18,420));
 const rr:any=await img.readRasters({window:[x0,y0,x1,y1],width:outW,height:outH,resampleMethod:"nearest",interleave:true});
 const candidates:any[]=[];
 for(let yy=0;yy<outH;yy++)for(let xx=0;xx<outW;xx++){
  const h=Number(rr[yy*outW+xx]);if(!Number.isFinite(h)||h<2||h>80)continue;
  const ox=x0+(xx+.5)*(x1-x0)/outW,oy=y0+(yy+.5)*(y1-y0)/outH,mx=bb[0]+(ox/W)*(bb[2]-bb[0]),my=bb[3]-(oy/H)*(bb[3]-bb[1]),ll=invMerc(mx,my),lon=ll[0],lat=ll[1];
  if(lon<w||lon>e||lat<s||lat>n)continue;
  const px=Math.floor(ox),py=Math.floor(oy),rid=`${t.quadkey}:${px}:${py}`,hv=hash32(rid),d=dims(h);
  candidates.push({hv,row:{source_key:"META_WRI_CHMV2_V1103",source_record_id:rid,tile_key:t.quadkey,geometry:`POINT(${lon} ${lat})`,height_m:h,render_height_m:h,
   trunk_height_m:d.trunk_height_m,crown_diameter_m:d.crown_diameter_m,trunk_diameter_m:d.trunk_diameter_m,leaf_cycle:null,species:null,
   position_truth:"META_WRI_CHMV2_CANOPY_SAMPLE_DERIVED_TREE_DISPLAY",height_truth:"MODELED_CANOPY_HEIGHT_META_WRI_DINOV3_V2",
   properties:{native_resolution_m:1,source_crs:"EPSG:3857",quadkey:t.quadkey,canopy_model:"DINOv3 CHMv2",height_unit:"m",individual_tree_truth:false}}});
 }
 candidates.sort((a,b)=>a.hv-b.hv);return candidates.slice(0,limit).map(x=>x.row)
}
async function deriveTile(t:any,w:number,s:number,e:number,n:number,limit:number,hb:any){
 const tif=await fromUrl(t.url);const img=await tif.getImage();const bb=img.getBoundingBox(),W=img.getWidth(),H=img.getHeight();
 const iw=Math.max(w,bb[0]),ie=Math.min(e,bb[2]),is=Math.max(s,bb[1]),inn=Math.min(n,bb[3]);if(iw>=ie||is>=inn)return [];
 let x0=Math.floor((iw-bb[0])/(bb[2]-bb[0])*W),x1=Math.ceil((ie-bb[0])/(bb[2]-bb[0])*W);
 let y0=Math.floor((bb[3]-inn)/(bb[3]-bb[1])*H),y1=Math.ceil((bb[3]-is)/(bb[3]-bb[1])*H);
 x0=clamp(x0,0,W-1);x1=clamp(x1,x0+1,W);y0=clamp(y0,0,H-1);y1=clamp(y1,y0+1,H);
 const midLat=(is+inn)/2,metersX=(ie-iw)*111320*Math.max(.12,Math.cos(midLat*Math.PI/180)),metersY=(inn-is)*110540;
 const outW=Math.round(clamp(metersX/28,28,420)),outH=Math.round(clamp(metersY/28,28,420));
 const rr:any=await img.readRasters({window:[x0,y0,x1,y1],width:outW,height:outH,resampleMethod:"nearest",interleave:true});
 const candidates:any[]=[];
 for(let yy=0;yy<outH;yy++)for(let xx=0;xx<outW;xx++){
  const v=Number(rr[yy*outW+xx]);if(v!==10)continue;
  const ox=x0+(xx+.5)*(x1-x0)/outW,oy=y0+(yy+.5)*(y1-y0)/outH;
  const px=Math.floor(ox),py=Math.floor(oy),rid=`${t.code}:${px}:${py}`,hv=hash32(rid);
  if((hv%100)<16)continue;
  const lon=bb[0]+(ox/W)*(bb[2]-bb[0]),lat=bb[3]-(oy/H)*(bb[3]-bb[1]);
  const hs=nearestHeight(hb,lat,lon);let measured=hs?clamp(Number(hs.canopy_height_m),2,80):null;
  const render=measured??clamp(7+((hv>>>8)%1200)/100 + 4*Math.cos(Math.min(70,Math.abs(lat))*Math.PI/140),4,28);
  const d=dims(render);
  candidates.push({hv,row:{source_key:"ESA_WORLDCOVER_TREE_COVER_V1101",source_record_id:rid,tile_key:t.code,
   geometry:`POINT(${lon} ${lat})`,height_m:measured,render_height_m:render,
   trunk_height_m:d.trunk_height_m,crown_diameter_m:d.crown_diameter_m,trunk_diameter_m:d.trunk_diameter_m,
   leaf_cycle:null,species:null,position_truth:"ESA_WORLDCOVER_10M_TREE_COVER_DERIVED_POINT",
   height_truth:hs?String(hs.height_truth||"NASA_LIDAR_CANOPY_HEIGHT"):"DERIVED_RENDER_HEIGHT_PENDING_NASA_LIDAR",
   properties:{worldcover_class:10,worldcover_tile:t.code,native_resolution_m:10,height_source:hs?.source_key||null,height_source_record:hs?.source_record_id||null}}});
 }
 candidates.sort((a,b)=>a.hv-b.hv);return candidates.slice(0,limit).map(x=>x.row);
}
async function persist(rows:any[]){
 if(!rows.length)return 0;
 let total=0;
 for(let i=0;i<rows.length;i+=150){
  const part=rows.slice(i,i+150).flatMap((r:any)=>{
   const m=String(r.geometry||'').match(/POINT\(([-\d.]+) ([-\d.]+)\)/);if(!m)return[];
   return [{source_key:r.source_key,source_record_id:r.source_record_id,tile_key:r.tile_key,lon:Number(m[1]),lat:Number(m[2]),
    height_m:r.height_m,render_height_m:r.render_height_m,trunk_height_m:r.trunk_height_m,crown_diameter_m:r.crown_diameter_m,
    trunk_diameter_m:r.trunk_diameter_m,leaf_cycle:r.leaf_cycle,species:r.species,position_truth:r.position_truth,
    height_truth:r.height_truth,properties:r.properties}];
  });
  if(!part.length)continue;
  const {data,error}=await sb.rpc("bridgepoint_global_tree_cache_upsert_v1103",{p_rows:part});if(error)throw error;
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
  if(e-w>.32||n-s>.32)return new Response(JSON.stringify({complete:true,version:VERSION,type:"FeatureCollection",features:[],reason:"ZOOM_IN_FOR_3D_TREES"}),{headers:H});
  const limit=Math.min(Math.max(Number(b.limit||1200),80),3000),hit=await cached(w,s,e,n,limit),cachedFeatures=hit?.features||[],goodCached=cachedFeatures.filter((f:any)=>{const t=String(f?.properties?.height_truth||'');return f?.properties?.height_m!=null&&(t.includes('META_WRI')||t.includes('NASA')||t.includes('LIDAR'))});
  if(goodCached.length>=Math.min(180,Math.floor(limit*.35))){
   const cf=hit?.features||[],heightBacked=cf.filter((f:any)=>f?.properties?.height_m!=null).length,modeledHeight=cf.filter((f:any)=>String(f?.properties?.height_truth||'').includes('MODELED')).length,measuredHeight=cf.filter((f:any)=>{const t=String(f?.properties?.height_truth||'').toUpperCase();return t.includes('LIDAR')||t.includes('MEASURED')||t.includes('GEDI')||t.includes('ICESAT')}).length;
   return new Response(JSON.stringify({...hit,complete:true,version:VERSION,tree_count:cf.length,height_backed_count:heightBacked,modeled_height_count:modeledHeight,measured_height_count:measuredHeight,source:"QUALITY_CACHE"}),{headers:H});
  }
  const hs=await heightSamples(w,s,e,n),hb=heightBuckets(hs),metaTiles=metaTilesFor(w,s,e,n),metaRows:any[]=[];
  for(const t of metaTiles){try{metaRows.push(...await deriveMetaTile(t,w,s,e,n,Math.ceil(limit/Math.max(1,metaTiles.length))*2))}catch(e){console.warn("meta_chmv2",t.quadkey,String((e as any)?.message||e))}}
  metaRows.sort((a,b)=>hash32(a.source_record_id)-hash32(b.source_record_id));
  let rows:any[]=metaRows.slice(0,limit);
  if(rows.length<Math.min(80,Math.floor(limit*.22))){
   const tiles=tilesFor(w,s,e,n),fallback:any[]=[];
   for(const t of tiles){try{fallback.push(...await deriveTile(t,w,s,e,n,Math.ceil(limit/Math.max(1,tiles.length))*2,hb))}catch(e){console.warn("worldcover",t.code,String((e as any)?.message||e))}}
   fallback.sort((a,b)=>hash32(a.source_record_id)-hash32(b.source_record_id));rows=[...rows,...fallback].slice(0,limit);
  }
  const picked=rows.slice(0,limit);
  try{await persist(picked)}catch(e){console.warn("cache",String((e as any)?.message||e))}
  const features=picked.map(r=>{const m=r.geometry.match(/POINT\(([-\d.]+) ([-\d.]+)\)/);return {type:"Feature",geometry:{type:"Point",coordinates:[Number(m?.[1]),Number(m?.[2])]},properties:{layer_key:"TREE_OBJECTS_3D",asset_kind:"tree",class:"tree",source_key:r.source_key,source_record_id:r.source_record_id,height_m:r.height_m,render_height_m:r.render_height_m,trunk_height_m:r.trunk_height_m,crown_diameter_m:r.crown_diameter_m,trunk_diameter_m:r.trunk_diameter_m,leaf_cycle:r.leaf_cycle,species:r.species,position_truth:r.position_truth,height_truth:r.height_truth,properties:r.properties}}});
  const heightBacked=features.filter((f:any)=>f.properties.height_m!=null).length,modeledHeight=features.filter((f:any)=>String(f.properties.height_truth||'').includes('MODELED')).length,measuredHeight=features.filter((f:any)=>{const t=String(f.properties.height_truth||'').toUpperCase();return t.includes('LIDAR')||t.includes('MEASURED')||t.includes('GEDI')||t.includes('ICESAT')}).length;
  return new Response(JSON.stringify({complete:true,version:VERSION,type:"FeatureCollection",features,tree_count:features.length,height_backed_count:heightBacked,modeled_height_count:modeledHeight,measured_height_count:measuredHeight,source:metaRows.length?"META_WRI_CHMV2_PRIMARY":"ESA_WORLDCOVER_PLUS_NASA_HEIGHT_CACHE"}),{headers:H});
 }catch(e){return new Response(JSON.stringify({complete:false,version:VERSION,error:"GLOBAL_TREE_VIEWPORT_UNAVAILABLE",detail:String((e as any)?.message||e).slice(0,500)}),{status:500,headers:H})}
});