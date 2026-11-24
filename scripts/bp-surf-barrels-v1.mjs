// Geographic, bounded surf geometry. No camera-relative coordinates or simulated
// measured wave heights. The barrel shape is a visual breaking-wave model.
export function* buildSurfBarrels(bounds, latitude, coast, quality, emit) {
 const C=40075016.68557849*Math.max(.12,Math.cos(latitude*Math.PI/180));
 const step=32/C,radius=105/C;
 const cx=(bounds.x0+bounds.x1)/2,cy=(bounds.y0+bounds.y1)/2;
 const cap=Math.max(3,Math.min(28,Math.round(quality*2.8)));
 const span=Math.min(12,Math.ceil(Math.sqrt(cap)*2));
 const ix=Math.floor(cx/step),iy=Math.floor(cy/step);
 let count=0,vertices=0,checked=0;
 const wet=(x,y)=>coast.contains(((x%1)+1)%1,y);
 const shore=(x,y)=>coast.shoreStrength(((x%1)+1)%1,y,radius);
 for(let ring=0;ring<=span&&count<cap;ring++){
  for(let j=-ring;j<=ring&&count<cap;j++)for(let i=-ring;i<=ring&&count<cap;i++){
   if(Math.max(Math.abs(i),Math.abs(j))!==ring)continue;
   if(++checked%12===0)yield;
   const x=(ix+i+.5)*step,y=(iy+j+.5)*step;
   if(x<bounds.x0-step||x>bounds.x1+step||y<bounds.y0-step||y>bounds.y1+step||!wet(x,y))continue;
   const strength=shore(x,y);
   if(strength<.22||strength>.78)continue;
   const e=4/C,dx=shore(x+e,y)-shore(x-e,y),dy=shore(x,y+e)-shore(x,y-e),n=Math.hypot(dx,dy);
   if(n<.015)continue;
   const nx=dx/n,ny=dy/n,tx=-ny,ty=nx;
   const half=13/C,height=1.25+1.45*strength,depth=height*.95/C;
   const rows=quality<=3?6:quality<=6?9:12,cols=quality<=3?2:quality<=6?3:5;
   const grid=[];
   let safe=true;
   for(let k=0;k<=cols;k++){
    const t=k/cols,along=(2*t-1)*half,edge=Math.sin(Math.PI*t),taper=.3+.7*edge;
    for(let j=0;j<=rows;j++){
     const a=j/rows*Math.PI*1.68;
     // Overhanging arc: the crest curves toward shore and back down,
     // leaving an open hollow beneath the lip.
     const across=depth*(1-Math.cos(a))*.8;
     const h=.10+height*taper*Math.sin(a*.5);
     const xx=x+tx*along+nx*across,yy=y+ty*along+ny*across;
     if(!wet(xx,yy)||!wet(xx+nx*2/C,yy+ny*2/C)){safe=false;break;}
     grid.push([xx,yy,h,nx,ny,j/rows]);
    }
    if(!safe)break;
   }
   if(!safe)continue;
   for(let k=0;k<cols;k++)for(let j=0;j<rows;j++){
    const a=k*(rows+1)+j,b=a+rows+1;
    for(const v of [a,b,a+1,a+1,b,b+1]){emit(...grid[v]);vertices++;}
   }
   count++;
  }
 }
 return {count,vertices,checked};
}
