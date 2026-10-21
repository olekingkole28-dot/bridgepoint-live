import { Buffer } from "node:buffer";
import { PNG } from "npm:pngjs@7.0.0";
const U="https://gibs.earthdata.nasa.gov/wms/epsg3857/best/wms.cgi";
const WORLD=20037508.342789244, R=6378137, SIZE=256;
const CORS={"access-control-allow-origin":"*","access-control-allow-headers":"authorization, apikey, content-type","access-control-allow-methods":"GET, OPTIONS"};
const JSONH={...CORS,"content-type":"application/json","cache-control":"public,max-age=300,stale-while-revalidate=900"};
function tileBox(z:number,x:number,y:number){
 const n=2**z;
 return {west:-WORLD+2*WORLD*x/n,east:-WORLD+2*WORLD*(x+1)/n,north:WORLD-2*WORLD*y/n,south:WORLD-2*WORLD*(y+1)/n};
}
function dateAt(v:string|null){
 const d=v?new Date(v):new Date();
 return Number.isNaN(d.getTime())?new Date():d;
}
function ymd(d:Date){return d.toISOString().slice(0,10)}
function offsetDay(d:Date,n:number){const x=new Date(d);x.setUTCDate(x.getUTCDate()-n);return x}
function solarAltitude(lon:number,lat:number,at:Date){
 const start=Date.UTC(at.getUTCFullYear(),0,0), day=Math.floor((Date.UTC(at.getUTCFullYear(),at.getUTCMonth(),at.getUTCDate())-start)/86400000);
 const hour=at.getUTCHours()+at.getUTCMinutes()/60+at.getUTCSeconds()/3600;
 const gamma=2*Math.PI/365*(day-1+(hour-12)/24);
 const eq=229.18*(0.000075+0.001868*Math.cos(gamma)-0.032077*Math.sin(gamma)-0.014615*Math.cos(2*gamma)-0.040849*Math.sin(2*gamma));
 const dec=0.006918-0.399912*Math.cos(gamma)+0.070257*Math.sin(gamma)-0.006758*Math.cos(2*gamma)+0.000907*Math.sin(2*gamma)-0.002697*Math.cos(3*gamma)+0.00148*Math.sin(3*gamma);
 let mins=(hour*60+eq+4*lon)%1440;if(mins<0)mins+=1440;
 const ha=(mins/4-180)*Math.PI/180, p=lat*Math.PI/180;
 const cosz=Math.max(-1,Math.min(1,Math.sin(p)*Math.sin(dec)+Math.cos(p)*Math.cos(dec)*Math.cos(ha)));
 return 90-Math.acos(cosz)*180/Math.PI;
}
async function upstream(b:any,date:string|null){
 const q=new URLSearchParams({
  SERVICE:"WMS",VERSION:"1.1.1",REQUEST:"GetMap",
  LAYERS:"VIIRS_SNPP_GapFilled_BRDF_Corrected_DayNightBand_Radiance",STYLES:"",
  FORMAT:"image/png",TRANSPARENT:"TRUE",
  WIDTH:String(SIZE),HEIGHT:String(SIZE),SRS:"EPSG:3857",
  BBOX:[b.west,b.south,b.east,b.north].join(",")
 });
 // NASA GIBS imagery is daily and its latest available date can lag today.
 // Omitting TIME requests the layer's current default/latest published date.
 if(date)q.set("TIME",date);
 const r=await fetch(U+"?"+q.toString(),{headers:{accept:"image/png","user-agent":"BridgePointIntelligence/5937-NASA-nightlights"},signal:AbortSignal.timeout(16000)});
 if(!r.ok)throw new Error("NASA_GIBS_HTTP_"+r.status);
 const ct=r.headers.get("content-type")||"";
 if(!ct.includes("image/png"))throw new Error("NASA_GIBS_NON_IMAGE:"+ct);
 return await r.arrayBuffer();
}
function makeNightOnly(input:ArrayBuffer,b:any,at:Date){
 const png=PNG.sync.read(Buffer.from(input));
 if(png.width!==SIZE||png.height!==SIZE)throw new Error("NASA_TILE_SIZE:"+png.width+"x"+png.height);
 const count=SIZE*SIZE,stride=SIZE+1;
 const gray=new Uint8Array(count),originalAlpha=new Uint8Array(count);
 // Build a fast local background model, so dim texture does not become a solid gold wash.
 for(let i=0;i<count;i++){
  const j=i*4;
  gray[i]=Math.round(png.data[j]*0.2126+png.data[j+1]*0.7152+png.data[j+2]*0.0722);
  originalAlpha[i]=png.data[j+3];
 }
 const integral=new Uint32Array(stride*stride);
 for(let y=0;y<SIZE;y++){
  let rowSum=0;
  for(let x=0;x<SIZE;x++){
   rowSum+=gray[y*SIZE+x];
   integral[(y+1)*stride+x+1]=integral[y*stride+x+1]+rowSum;
  }
 }
 const rectSum=(x0:number,y0:number,x1:number,y1:number)=>{
  return integral[y1*stride+x1]-integral[y0*stride+x1]-integral[y1*stride+x0]+integral[y0*stride+x0];
 };
 const clamp01=(n:number)=>Math.max(0,Math.min(1,n));
 const dx=(b.east-b.west)/SIZE,dy=(b.north-b.south)/SIZE;
 for(let py=0;py<SIZE;py++){
  const my=b.north-(py+0.5)*dy;
  const lat=Math.max(-85.05112878,Math.min(85.05112878,Math.atan(Math.sinh(my/R))*180/Math.PI));
  const y0=Math.max(0,py-4),y1=Math.min(SIZE,py+5);
  for(let px=0;px<SIZE;px++){
   const index=py*SIZE+px,i=index*4;
   const mx=b.west+(px+0.5)*dx,lon=mx/WORLD*180;
   const lum=gray[index],sourceAlpha=originalAlpha[index];
   const x0=Math.max(0,px-4),x1=Math.min(SIZE,px+5);
   const area=(x1-x0)*(y1-y0),localMean=(rectSum(x0,y0,x1,y1)-lum)/Math.max(1,area-1);
   const localContrast=lum-localMean;
   // NASA's daily browse image can include moonlit cloud/surface texture:
   // retain distinct signals and brighter cores; suppress low-contrast background.
   if(solarAltitude(lon,lat,at)>-6||sourceAlpha===0||lum<12||
      (lum<64&&localContrast<8)||(lum<90&&localContrast<4)){
    png.data[i+3]=0;continue;
   }
   const power=clamp01((lum-8)/118);
   const edge=clamp01((localContrast+2)/20);
   const strength=clamp01(0.76*Math.pow(power,0.62)+0.24*Math.pow(edge,0.6));
   // Hot gold/orange points; the brightest urban cores trend toward pale white.
   png.data[i]=255;
   png.data[i+1]=Math.round(132+123*power);
   png.data[i+2]=Math.round(12+218*Math.pow(power,1.3));
   png.data[i+3]=Math.round(Math.max(32,Math.min(250,32+218*Math.pow(strength,0.72))));
  }
 }
 return PNG.sync.write(png);
}
Deno.serve(async(req:Request)=>{
 if(req.method==="OPTIONS")return new Response("ok",{headers:CORS});
 if(req.method!=="GET")return new Response("GET_REQUIRED",{status:405,headers:CORS});
 try{
  const url=new URL(req.url),z=Number(url.searchParams.get("z")),x=Number(url.searchParams.get("x")),y=Number(url.searchParams.get("y"));
  if(![z,x,y].every(Number.isInteger)||z<0||z>18||x<0||y<0||x>=2**z||y>=2**z)return new Response("INVALID_TILE",{status:400,headers:CORS});
  const at=dateAt(url.searchParams.get("at")),b=tileBox(z,x,y);
  const requestedAt=at.toISOString(),tries:(number|null)[]=Math.abs(Date.now()-at.getTime())<=36*60*60*1000?[null,0,1,2,3,4,5]:[0,1,2,3,4,5],failures:string[]=[];
  let data:ArrayBuffer|null=null,usedDate="";
  for(const days of tries){
   const d=days===null?null:ymd(offsetDay(at,days));
   try{data=await upstream(b,d);usedDate=d||"NASA-default-latest";break}catch(e){failures.push((d||"NASA-default-latest")+":"+String((e as any)?.message||e).slice(0,120))}
  }
  if(!data)throw new Error("NASA_DNB_UNAVAILABLE:"+failures.join("|"));
  const image=makeNightOnly(data,b,at);
  return new Response(image,{headers:{
   ...CORS,"content-type":"image/png",
   "cache-control":"public,max-age=600,stale-while-revalidate=1800",
   "x-bridgepoint-source":"NASA GIBS VIIRS SNPP Gap-Filled BRDF-Corrected Day/Night Band Radiance",
   "x-bridgepoint-observation-date":usedDate,
   "x-bridgepoint-mask-time":requestedAt,
   "x-bridgepoint-night-mask":"solar-altitude-below-minus-6-degrees",
   "x-bridgepoint-disclaimer":"daily visual layer, not a confirmed power-outage signal"
  }});
 }catch(e){return new Response(String((e as any)?.message||e),{status:503,headers:{...CORS,"content-type":"text/plain","cache-control":"no-store","retry-after":"3"}})}
});