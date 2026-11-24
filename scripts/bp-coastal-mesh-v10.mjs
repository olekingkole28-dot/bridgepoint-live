import {trianglesB64,coastB64,cellOffsets} from './bp-coastal-data-v10.mjs';
const N=128,Q=2**30,C=40075016.6856;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrap=x=>((x%1)+1)%1;
function unpack(s){
 const b=atob(s),a=new Uint8Array(b.length);for(let i=0;i<b.length;i++)a[i]=b.charCodeAt(i);
 const dv=new DataView(a.buffer),v=new Float64Array(b.length/4);for(let i=0;i<v.length;i++)v[i]=dv.getUint32(i*4,true)/Q;return v;
}
const tri=unpack(trianglesB64),coast=unpack(coastB64);
const buckets=Array.from({length:N*N},()=>[]);
for(let i=0;i<coast.length;i+=4){
 const x0=clamp(Math.floor(Math.min(coast[i],coast[i+2])*N),0,N-1),x1=clamp(Math.floor(Math.max(coast[i],coast[i+2])*N),0,N-1);
 const y0=clamp(Math.floor(Math.min(coast[i+1],coast[i+3])*N),0,N-1),y1=clamp(Math.floor(Math.max(coast[i+1],coast[i+3])*N),0,N-1);
 for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++)buckets[y*N+x].push(i);
}
export function bandWorld(z,lat=0){return Math.max(42/(C*Math.max(.12,Math.cos(lat*Math.PI/180))),20/(512*Math.pow(2,z)))}
export function contains(x,y){
 if(y<0||y>=1)return false;x=wrap(x);
 const cell=Math.min(N-1,Math.floor(y*N))*N+Math.min(N-1,Math.floor(x*N));
 for(let t=cellOffsets[cell]*6;t<cellOffsets[cell+1]*6;t+=6){
  const ax=tri[t],ay=tri[t+1],bx=tri[t+2],by=tri[t+3],cx=tri[t+4],cy=tri[t+5];
  const a=(bx-ax)*(y-ay)-(by-ay)*(x-ax),b=(cx-bx)*(y-by)-(cy-by)*(x-bx),c=(ax-cx)*(y-cy)-(ay-cy)*(x-cx);
  if((a>=-1e-14&&b>=-1e-14&&c>=-1e-14)||(a<=1e-14&&b<=1e-14&&c<=1e-14))return true;
 }
 return false;
}
export function shoreStrength(x,y,r){
 x=wrap(x);if(y<0||y>1||!(r>0))return 0;let best=r*r;
 const j0=clamp(Math.floor((y-r)*N),0,N-1),j1=clamp(Math.floor((y+r)*N),0,N-1);
 for(let j=j0;j<=j1;j++)for(let i=Math.floor((x-r)*N);i<=Math.floor((x+r)*N);i++){
  const col=((i%N)+N)%N,shift=Math.floor(i/N);
  for(const k of buckets[j*N+col]){
   const ax=coast[k]+shift,ay=coast[k+1],bx=coast[k+2]+shift,by=coast[k+3];
   if(x+r<Math.min(ax,bx)||x-r>Math.max(ax,bx)||y+r<Math.min(ay,by)||y-r>Math.max(ay,by))continue;
   const dx=bx-ax,dy=by-ay,d=dx*dx+dy*dy;
   const t=d?clamp(((x-ax)*dx+(y-ay)*dy)/d,0,1):0;
   const ex=x-ax-t*dx,ey=y-ay-t*dy;
   best=Math.min(best,ex*ex+ey*ey);
  }
 }
 return clamp(1-Math.sqrt(best)/r,0,1);
}
function clipEdge(points,axis,edge,greater){
 if(!points.length)return points;const out=[];let a=points[points.length-1],inside=greater?a[axis]>=edge:a[axis]<=edge;
 for(const b of points){
  const next=greater?b[axis]>=edge:b[axis]<=edge;
  if(next!==inside){const f=(edge-a[axis])/(b[axis]-a[axis]);const p=[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f];p[axis]=edge;out.push(p)}
  if(next)out.push(b);a=b;inside=next;
 }return out;
}
function area(a,b,c){return Math.abs((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]))*.5}
function mid(a,b){return [(a[0]+b[0])*.5,(a[1]+b[1])*.5]}
function span(a,b,c){return Math.max(Math.abs(a[0]-b[0]),Math.abs(a[0]-c[0]),Math.abs(b[0]-c[0]),Math.abs(a[1]-b[1]),Math.abs(a[1]-c[1]),Math.abs(b[1]-c[1]))}
export function buildCoastalSurface(bounds,z,{latitude=0,maxVertices=100000}={},emit){
 const r=bandWorld(z,latitude),base=[],memo=new Map();
 const sx0=Math.floor(bounds.x0),sx1=Math.floor(bounds.x1-1e-12);
 for(let shift=sx0;shift<=sx1;shift++){
  const x0=clamp(bounds.x0-shift,0,1),x1=clamp(bounds.x1-shift,0,1),y0=clamp(bounds.y0,0,1),y1=clamp(bounds.y1,0,1);
  if(x0>=x1||y0>=y1)continue;
  for(let y=clamp(Math.floor(y0*N),0,N-1);y<=clamp(Math.floor(y1*N),0,N-1);y++)for(let x=clamp(Math.floor(x0*N),0,N-1);x<=clamp(Math.floor(x1*N),0,N-1);x++){
   const cell=y*N+x;
   for(let t=cellOffsets[cell]*6;t<cellOffsets[cell+1]*6;t+=6){
    let p=[[tri[t],tri[t+1]],[tri[t+2],tri[t+3]],[tri[t+4],tri[t+5]]];
    p=clipEdge(clipEdge(clipEdge(clipEdge(p,0,x0,true),0,x1,false),1,y0,true),1,y1,false);
    for(let k=1;k+1<p.length;k++)if(area(p[0],p[k],p[k+1])>1e-20)base.push([p[0],p[k],p[k+1]]);
   }
  }
 }
 let extra=Math.max(0,maxVertices-base.length*3),count=0,shoreVertices=0,largest=0;
 const strength=p=>{const key=Math.round(p[0]*2**30)+':'+Math.round(p[1]*2**30);if(!memo.has(key))memo.set(key,shoreStrength(p[0],p[1],r));return memo.get(key)};
 const output=p=>{const s=strength(p);if(s>0)shoreVertices++;emit(Math.min(1-1e-8,Math.max(0,p[0])),p[1],s);count++};
 const target=Math.max(r*.4,Math.max(bounds.x1-bounds.x0,bounds.y1-bounds.y0)/150);
 function subdivide(a,b,c,depth){
  const length=span(a,b,c),near=Math.max(strength(a),strength(b),strength(c),strength(mid(a,b)),strength(mid(a,c)),strength(mid(b,c)));
  if(depth<5&&extra>=9&&length>target&&(near>0||length>Math.max(target*6,.002))){
   extra-=9;const ab=mid(a,b),ac=mid(a,c),bc=mid(b,c);
   subdivide(a,ab,ac,depth+1);subdivide(ab,b,bc,depth+1);subdivide(ac,bc,c,depth+1);subdivide(ab,bc,ac,depth+1);
  }else{largest=Math.max(largest,length);output(a);output(b);output(c)}
 }
 for(const [a,b,c] of base)subdivide(a,b,c,0);
 return {count,shoreVertices,baseTriangles:base.length,largestStep:largest,band:r};
}
