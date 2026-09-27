(()=>{
'use strict';
const canvas=document.getElementById('bpQrHouseCanvas');
if(!canvas||canvas.dataset.bpReady==='1')return;
canvas.dataset.bpReady='1';
const ctx=canvas.getContext('2d',{alpha:true,desynchronized:true});
if(!ctx)return;
const QR=["0000000000000000000000000000000000000","0000000000000000000000000000000000000","0000000000000000000000000000000000000","0000000000000000000000000000000000000","0000111111101010110010111011111110000","0000100000101110110011101010000010000","0000101110100101010010111010111010000","0000101110101000011001001010111010000","0000101110100101101110010010111010000","0000100000100111111010110010000010000","0000111111101010101010101011111110000","0000000000001110000011010000000000000","0000101101110000100111100010010110000","0000100000001111010011111111100010000","0000101110111110010001100101001100000","0000011100001000111100010101000010000","0000010101100101000001010000011000000","0000100010010101111110010010001110000","0000010001101110001000010111001110000","0000011010011010110010001000000100000","0000010111101011000100100101110100000","0000010001010110010100001101011100000","0000100101100100100101000100001000000","0000001111001001000111110001001000000","0000010110111101110111101111111000000","0000000000001001111000101000111110000","0000111111101110010011111010110100000","0000100000101110000000101000110100000","0000101110100111101101001111101000000","0000101110101011001110011100110010000","0000101110101000101001111001001010000","0000100000100000111000101010010100000","0000111111101010001000111111000100000","0000000000000000000000000000000000000","0000000000000000000000000000000000000","0000000000000000000000000000000000000","0000000000000000000000000000000000000"];
const N=QR.length,LOGICAL=444,CX=LOGICAL/2,CY=LOGICAL/2,MODULE=LOGICAL/N;
const dark=[];
for(let r=0;r<N;r++)for(let c=0;c<N;c++)if(QR[r][c]==='1')dark.push({r,c,phase:((r*19+c*31)%29)/29});
let running=true,raf=0,start=performance.now();
function clamp(v,a=0,b=1){return Math.max(a,Math.min(b,v))}
function ease(v){v=clamp(v);return v*v*(3-2*v)}
function rr(x,y,w,h,r){const q=Math.min(r,w/2,h/2);ctx.beginPath();ctx.moveTo(x+q,y);ctx.arcTo(x+w,y,x+w,y+h,q);ctx.arcTo(x+w,y+h,x,y+h,q);ctx.arcTo(x,y+h,x,y,q);ctx.arcTo(x,y,x+w,y,q);ctx.closePath()}
function mix(a,b,t){return Math.round(a+(b-a)*t)}
function rgb(a,b,t,alpha=1){return 'rgba('+mix(a[0],b[0],t)+','+mix(a[1],b[1],t)+','+mix(a[2],b[2],t)+','+alpha+')'}
function housePoint(r,c){
 const u=clamp((c-4)/28),v=clamp((r-4)/28);
 if(v<.24){
  const roofV=v/.24;
  if(u<.68){const rise=1-roofV,width=.56*(1-rise*.92);return{x:-.25+(u/.68-.5)*2*width,y:.46+rise*.58,z:0,face:'gable'}}
  return{x:-.25+roofV*.55,y:1.04-roofV*.58,z:(u-.68)/.32*.72,face:'roof'}
 }
 if(u<.68)return{x:-.80+(u/.68)*1.10,y:.46-((v-.24)/.76)*1.08,z:0,face:'front'};
 return{x:.30,y:.46-((v-.24)/.76)*1.08,z:((u-.68)/.32)*.72,face:'side'}
}
function rotate(p,angY,angX){
 const cy=Math.cos(angY),sy=Math.sin(angY),cx=Math.cos(angX),sx=Math.sin(angX);
 const x=p.x*cy+p.z*sy,z=-p.x*sy+p.z*cy;
 return{x,y:p.y*cx-z*sx,z:p.y*sx+z*cx}
}
function project(p,angY,angX){
 const q=rotate(p,angY,angX),depth=4.1-q.z,s=610/depth;
 return{x:CX+q.x*s,y:258-q.y*s,s,z:q.z}
}
function poly(points,angY,angX,fill,stroke){
 const p=points.map(v=>project(v,angY,angX));ctx.beginPath();ctx.moveTo(p[0].x,p[0].y);for(let i=1;i<p.length;i++)ctx.lineTo(p[i].x,p[i].y);ctx.closePath();ctx.fillStyle=fill;ctx.fill();if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1.25;ctx.stroke()}
}
function drawHouseBase(amount,angY,angX){
 if(amount<=.02)return;
 const a=clamp((amount-.18)/.82);
 ctx.save();ctx.globalAlpha=a;
 ctx.shadowColor='rgba(77,226,255,.28)';ctx.shadowBlur=18;
 ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(CX+10,380,126,24,0,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 poly([{x:-.80,y:-.62,z:0},{x:.30,y:-.62,z:0},{x:.30,y:.46,z:0},{x:-.25,y:1.04,z:0},{x:-.80,y:.46,z:0}],angY,angX,'rgba(7,31,43,.94)','rgba(133,238,255,.64)');
 poly([{x:.30,y:-.62,z:0},{x:.30,y:-.62,z:.72},{x:.30,y:.46,z:.72},{x:.30,y:.46,z:0}],angY,angX,'rgba(5,23,34,.93)','rgba(89,206,229,.55)');
 poly([{x:-.25,y:1.04,z:0},{x:-.25,y:1.04,z:.72},{x:.30,y:.46,z:.72},{x:.30,y:.46,z:0}],angY,angX,'rgba(13,48,61,.98)','rgba(160,245,255,.70)');
 const door=project({x:-.12,y:-.62,z:-.006},angY,angX),doorTop=project({x:-.12,y:-.20,z:-.006},angY,angX);
 ctx.strokeStyle='rgba(117,231,248,.45)';ctx.lineWidth=Math.max(2,amount*3);ctx.beginPath();ctx.moveTo(door.x-16,door.y);ctx.lineTo(doorTop.x-14,doorTop.y);ctx.lineTo(doorTop.x+14,doorTop.y);ctx.lineTo(door.x+16,door.y);ctx.stroke();ctx.restore()
}
function qrPosition(r,c){return{x:(c+.5)*MODULE,y:(r+.5)*MODULE}}
function cycleState(now){
 const t=((now-start)%8200)/8200;
 if(t<.21)return{h:0,hold:0};
 if(t<.39)return{h:ease((t-.21)/.18),hold:0};
 if(t<.68)return{h:1,hold:(t-.39)/.29};
 if(t<.86)return{h:1-ease((t-.68)/.18),hold:0};
 return{h:0,hold:0}
}
function draw(now){
 if(!running)return;
 const st=cycleState(now),h=st.h,angY=-.48+(h*(.08*Math.sin(now/950))),angX=.07;
 ctx.clearRect(0,0,LOGICAL,LOGICAL);
 const qrAlpha=clamp(1-h*1.28);
 if(qrAlpha>.01){ctx.save();ctx.globalAlpha=qrAlpha;ctx.shadowColor='rgba(0,0,0,.24)';ctx.shadowBlur=14;ctx.shadowOffsetY=8;ctx.fillStyle='#fff';rr(0,0,LOGICAL,LOGICAL,10);ctx.fill();ctx.restore()}
 drawHouseBase(h,angY,angX);
 const front=[7,21,28],house=[220,246,251];
 const ordered=dark.map(m=>{const hp=project(housePoint(m.r,m.c),angY,angX),qp=qrPosition(m.r,m.c),local=ease(clamp((h-.02-m.phase*.035)/.95));return{...m,hp,qp,t:local}}).sort((a,b)=>a.hp.z-b.hp.z);
 for(const m of ordered){
  const t=m.t,x=m.qp.x+(m.hp.x-m.qp.x)*t,y=m.qp.y+(m.hp.y-m.qp.y)*t,size=MODULE*.94*(1-t)+Math.max(3.5,5.9*(m.hp.s/150))*t;
  ctx.save();ctx.translate(x,y);if(t>.15)ctx.rotate((m.c%3-1)*.025*t);ctx.fillStyle=rgb(front,house,t,1);if(t>.3){ctx.shadowColor='rgba(93,231,255,.44)';ctx.shadowBlur=6*t}const s=Math.max(1,size);ctx.fillRect(-s/2,-s/2,s,s);ctx.restore()
 }
 if(h>.82){ctx.save();ctx.globalAlpha=(h-.82)/.18*.35;ctx.strokeStyle='rgba(205,250,255,.72)';ctx.lineWidth=1;const a=project({x:-.25,y:1.04,z:0},angY,angX),b=project({x:-.25,y:1.04,z:.72},angY,angX);ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore()}
 raf=requestAnimationFrame(draw)
}
function resize(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1),px=Math.max(1,Math.round(rect.width*dpr));
 if(canvas.width!==px||canvas.height!==px){canvas.width=px;canvas.height=px;ctx.setTransform(px/LOGICAL,0,0,px/LOGICAL,0,0)}
}
resize();
const ro='ResizeObserver'in window?new ResizeObserver(resize):null;ro?.observe(canvas);
document.addEventListener('visibilitychange',()=>{if(document.hidden){running=false;cancelAnimationFrame(raf)}else if(!running){running=true;start=performance.now();raf=requestAnimationFrame(draw)}});
raf=requestAnimationFrame(draw);
window.__BP_QR_HOUSE_V5521__={ready:true,matrixSize:N,darkModules:dark.length,url:'https://bridgepointintelligence.online/',version:5521}
})();