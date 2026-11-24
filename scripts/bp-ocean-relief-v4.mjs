// Derived exclusively from measured Mapzen Terrarium elevation tiles.
export const DEPTH_SOURCE='bp-ocean-relief-src-v4',DEPTH_LAYER='bp-ocean-relief-v4';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function shadeBathymetry(input,w,h,zoom){
 const result=new Uint8ClampedArray(input.length),e=new Float32Array(w*h);
 for(let i=0;i<e.length;i++)e[i]=input[i*4]*256+input[i*4+1]+input[i*4+2]/256-32768;
 const cell=40075016.6856/(256*2**zoom);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){
  const i=y*w+x,k=i*4,z=e[i];if(z>=0){result[k+3]=0;continue}
  const dx=(e[y*w+Math.min(w-1,x+1)]-e[y*w+Math.max(0,x-1)])/(2*cell);
  const dy=(e[Math.min(h-1,y+1)*w+x]-e[Math.max(0,y-1)*w+x])/(2*cell);
  const slope=Math.hypot(dx,dy),normal=Math.sqrt(1+dx*dx+dy*dy);
  const light=clamp((.78-.48*dx+.39*dy)/normal,.13,1.25);
  const depth=clamp(Math.log1p(-z/80)/Math.log1p(11000/80),0,1);
  const highlight=.67+.64*light+.12*clamp(slope,0,1);
  result[k]=Math.round(clamp((99-65*depth)*highlight,0,255));
  result[k+1]=Math.round(clamp((183-79*depth)*highlight,0,255));
  result[k+2]=Math.round(clamp((192-53*depth)*highlight,0,255));
  result[k+3]=255;
 }
 return result;
}
let installed=false;
export function installOceanRelief(map){
 if(!map?.getSource('dem')||!map.getLayer('gta-coast-shadow'))return false;
 if(!installed){
  window.maplibregl.addProtocol('bp-ocean-relief',async(req,abort)=>{
   const m=req.url.match(/^bp-ocean-relief:\/\/(\d+)\/(\d+)\/(\d+)(?:\.png)?$/);
   if(!m)throw new Error('Invalid bathymetry tile coordinate');
   const [,z,x,y]=m;
   const r=await fetch('https://s3.amazonaws.com/elevation-tiles-prod/terrarium/'+z+'/'+x+'/'+y+'.png',{signal:abort?.signal});
   if(!r.ok)throw new Error('Bathymetry tile HTTP '+r.status);
   const image=await createImageBitmap(await r.blob(),{colorSpaceConversion:'none',premultiplyAlpha:'none'});
   try{
    const canvas=typeof OffscreenCanvas==='function'?new OffscreenCanvas(image.width,image.height):Object.assign(document.createElement('canvas'),{width:image.width,height:image.height});
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    ctx.drawImage(image,0,0);const raw=ctx.getImageData(0,0,canvas.width,canvas.height);
    raw.data.set(shadeBathymetry(raw.data,canvas.width,canvas.height,Number(z)));ctx.putImageData(raw,0,0);
    const blob=canvas.convertToBlob?await canvas.convertToBlob({type:'image/png'}):await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    return {data:await blob.arrayBuffer(),cacheControl:'public,max-age=86400'};
   }finally{image.close?.()}
  });installed=true;
 }
 if(!map.getSource(DEPTH_SOURCE))map.addSource(DEPTH_SOURCE,{type:'raster',tiles:['bp-ocean-relief://{z}/{x}/{y}.png'],tileSize:256,minzoom:0,maxzoom:12,attribution:'Mapzen / Tilezen terrain · ETOPO1 bathymetry'});
 if(!map.getLayer(DEPTH_LAYER)){
  map.addLayer({id:DEPTH_LAYER,type:'raster',source:DEPTH_SOURCE,paint:{'raster-opacity':1,'raster-resampling':'linear','raster-fade-duration':0}},'gta-coast-shadow');
 }
 // Keep relief beneath water but above all imagery, including after style reorders.
 const cover='bp-liquid-ocean-cover-v2';
 if(map.getLayer(cover)){const l=map.getStyle().layers,di=l.findIndex(x=>x.id===DEPTH_LAYER),ci=l.findIndex(x=>x.id===cover);if(di>ci)map.moveLayer(DEPTH_LAYER,cover)}
 return true;
}
