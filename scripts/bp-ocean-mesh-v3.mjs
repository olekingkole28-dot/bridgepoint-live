import earcut from './bp-earcut-v3.mjs';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const xOf=lon=>(lon+180)/360;
const yOf=lat=>{const r=clamp(lat,-85.05112878,85.05112878)*Math.PI/180;return (1-Math.log(Math.tan(r)+1/Math.cos(r))/Math.PI)/2};
const midpoint=(a,b)=>[(a[0]+b[0])*.5,(a[1]+b[1])*.5,(a[2]+b[2])*.5];
export function buildOceanPolygonMesh(parts,{maxVertices=18000,step=.015,shoreAt=()=>0}={},emit){
 let count=0,polygons=0;
 for(const rings of parts||[]){
  if(!rings?.length)continue;
  const flat=[],holes=[],points=[];
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,invalid=false;
  for(let ri=0;ri<rings.length;ri++){
   const raw=rings[ri];if(!Array.isArray(raw)||raw.length<4){if(ri===0)invalid=true;continue}
   const clean=[];
   for(const p of raw){if(!Number.isFinite(p?.[0])||!Number.isFinite(p?.[1]))continue;
    const x=xOf(p[0]),y=yOf(p[1]);if(x<0||x>1){invalid=true;break}
    if(!clean.length||x!==clean[clean.length-1][0]||y!==clean[clean.length-1][1])clean.push([x,y,p[0],p[1]]);
   }
   if(clean.length>1&&clean[0][0]===clean[clean.length-1][0]&&clean[0][1]===clean[clean.length-1][1])clean.pop();
   if(clean.length<3){if(ri===0)invalid=true;continue}
   if(ri>0)holes.push(points.length);
   for(const [x,y,lon,lat] of clean){flat.push(x,y);points.push([x,y,clamp(Number(shoreAt(lon,lat))||0,0,1)]);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y)}
  }
  if(invalid||points.length<3||maxX-minX>.5)continue;
  const indices=earcut(flat,holes,2);if(!indices.length||count+indices.length>maxVertices)continue;
  let levels=Math.min(4,Math.max(0,Math.ceil(Math.log2(Math.max(maxX-minX,maxY-minY)/Math.max(step,1e-9)))));
  while(levels>0&&count+indices.length*4**levels>maxVertices)levels--;
  function tri(a,b,c,d){if(d===0){emit(...a);emit(...b);emit(...c);count+=3;return}const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);tri(a,ab,ca,d-1);tri(ab,b,bc,d-1);tri(ca,bc,c,d-1);tri(ab,bc,ca,d-1)}
  for(let i=0;i<indices.length;i+=3)tri(points[indices[i]],points[indices[i+1]],points[indices[i+2]],levels);
  polygons++;
 }
 return {count,polygons};
}
export function oceanFallbackTexture(size=128){
 const data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const a=x/size*Math.PI*2,b=y/size*Math.PI*2;
  const n=Math.sin(a*2+b+Math.sin(b*3)*.75)*.55+Math.sin(b*2-a*3+Math.sin(a*2)*.55)*.45;
  const k=.5+.5*n, i=(y*size+x)*4;
  data[i]=Math.round(4+5*k);data[i+1]=Math.round(27+17*k);data[i+2]=Math.round(48+24*k);data[i+3]=255;
 }
 return {width:size,height:size,data};
}
