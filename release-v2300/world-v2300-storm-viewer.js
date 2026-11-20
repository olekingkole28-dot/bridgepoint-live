/* BridgePoint storm detail — geographically anchored events, illustrative animated 3D preview.
   Cloud shape, funnel and radar colors are visualizations, not instrument-measured 3D volumes. */
const PI2=Math.PI*2;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
function spriteFor(rgb){
  const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d');
  const color=rgb.join(',');
  const shade=g.createRadialGradient(27,23,3,32,32,31);
  shade.addColorStop(0,'rgba('+rgb.map(x=>Math.min(255,Math.round(x*1.17))).join(',')+',.96)');
  shade.addColorStop(.31,'rgba('+color+',.94)');
  shade.addColorStop(.60,'rgba('+color+',.68)');
  shade.addColorStop(.85,'rgba('+color+',.20)');
  shade.addColorStop(1,'rgba('+color+',0)');
  g.fillStyle=shade;g.fillRect(0,0,64,64);return c;
}
const palette=[
 [224,236,244],[175,189,206],[93,108,124],[44,53,66],
 [18,105,218],[11,198,215],[37,223,97],[242,224,28],
 [255,142,27],[249,30,38],[125,22,72]
];
function makeClouds(cyclone,lowPower){
  const points=[];
  const count=cyclone?(lowPower?215:355):(lowPower?195:320);
  for(let i=0;i<count;i++){
    const a=(i*.61803398875)%1,b=(i*.7548776662)%1,c=(i*.41421356237)%1;
    if(cyclone){
      const arm=i%5,r=.14+.85*Math.sqrt((i+.35)/count),angle=arm*PI2/5+Math.log(Math.max(.12,r))*(-2.50)+a*.32;
      const radius=r*(.95+.09*Math.sin(i*1.87)),z=.10+.20*(1-r)+b*.13;
      let color=r<.25?9:r<.40?8:r<.54?7:r<.72?6:r<.88?5:4;
      if(i%5===0&&r>.63)color=1;
      points.push({r:radius,angle,z,color,size:8+(1-r)*8+b*7,phase:PI2*c});
    }else{
      const t=(i+.5)/count,r=.042+.47*Math.pow(t,1.25),angle=19*t+b*PI2;
      points.push({r:r*(.65+.44*c),angle,z:t*.88,color:t<.23?3:t<.60?2:1,size:6+9*t+b*7,phase:PI2*a});
    }
  }
  if(!cyclone)for(let i=0;i<(lowPower?65:105);i++){
    const t=(i+.5)/(lowPower?65:105),theta=i*2.3999632297,r=.13+.65*Math.sqrt(t);
    points.push({r,angle:theta,z:.84+.11*((i*.517)%1),color:i%4===0?2:0,size:14+15*((i*.713)%1),phase:i*.2,anvil:true});
  }
  return points;
}
export function attachStormViewer(root,record={}){
  if(!root||typeof document==='undefined')return null;
  if(root.querySelector('[data-bp-storm-model]'))return root.querySelector('[data-bp-storm-model]');
  const label=[record.name,record.type,record.classification,record.event,record.phenom,record.icon_key,record.headline].filter(Boolean).join(' ').toLowerCase();
  const cyclone=/hurricane|tropical|cyclone|typhoon|hurricane/.test(label)||record.icon_key==='hurricane'||['HU','TR','TS'].includes(String(record.phenom||'').toUpperCase());
  const tornado=/tornado|waterspout/.test(label)||record.icon_key==='tornado'||String(record.phenom||'').toUpperCase()==='TO';
  if(!cyclone&&!tornado)return null;
  const lowPower=/Android|iPhone|iPad/i.test(navigator.userAgent)||Number(navigator.hardwareConcurrency||4)<=4;
  const wrap=document.createElement('div');wrap.dataset.bpStormModel='true';
  wrap.style.cssText='width:100%;max-width:350px;margin:8px auto;border-radius:12px;overflow:hidden;background:#07121f;border:1px solid #365269;color:#cbe7fb;touch-action:pan-y;';
  const canvas=document.createElement('canvas');canvas.width=520;canvas.height=305;
  canvas.style.cssText='display:block;width:100%;height:auto;aspect-ratio:520/305;touch-action:none;';
  canvas.setAttribute('aria-label',cyclone?'Animated simulated 3D rotating hurricane cloud bands and eye':'Animated simulated 3D tornado funnel and surrounding storm clouds');
  canvas.setAttribute('role','img');
  const note=document.createElement('div');note.textContent='ANIMATED 3D VIEW · DRAG TO ROTATE';
  note.style.cssText='padding:5px 9px;font:600 10px/1.4 system-ui,Arial;letter-spacing:.05em;background:#0b1b2b;';
  const caveat=document.createElement('div');
  caveat.textContent=tornado?'Illustrative tornado vortex. A warning alone does not confirm a funnel or EF rating.':'Illustrative radar-colored cyclone vortex, not measured per-cloud reflectivity or height.';
  caveat.style.cssText='padding:5px 9px 8px;font:10px/1.4 system-ui,Arial;color:#b7c6d6;';
  wrap.append(canvas,note,caveat);
  root.insertBefore(wrap,root.children[1]||null);
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)return wrap;
  const sprites=palette.map(spriteFor);
  const clouds=makeClouds(cyclone,lowPower);
  let angle=0, dragging=false, pointerX=0, stopped=false, last=0;
  canvas.addEventListener('pointerdown',e=>{dragging=true;pointerX=e.clientX;try{canvas.setPointerCapture(e.pointerId)}catch(_){}});
  canvas.addEventListener('pointermove',e=>{if(!dragging)return;angle+=clamp((e.clientX-pointerX)*.011,-.5,.5);pointerX=e.clientX});
  canvas.addEventListener('pointerup',()=>{dragging=false});
  canvas.addEventListener('pointercancel',()=>{dragging=false});
  const draw=time=>{
    if(stopped||!canvas.isConnected){stopped=true;return}
    requestAnimationFrame(draw);
    if(document.hidden||time-last<42)return;
    last=time;
    const w=canvas.width,h=canvas.height,t=time*.001;
    const sky=ctx.createLinearGradient(0,0,0,h);sky.addColorStop(0,'#09243a');sky.addColorStop(.66,'#122f48');sky.addColorStop(1,'#020a13');
    ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(124,196,231,.10)';ctx.lineWidth=1;
    for(let i=1;i<5;i++){ctx.beginPath();ctx.ellipse(w/2,cyclone?h*.54:h*.84,i*44,i*(cyclone?14:6),0,0,PI2);ctx.stroke()}
    const positions=[];
    for(let i=0;i<clouds.length;i++){
      const p=clouds[i];
      const spin=(cyclone?-.33:1.70)*t+(cyclone?-.35:1.6)*angle;
      const theta=p.angle+spin*(cyclone?(.66+.8*(1-p.r)):(.8+.9*(1-p.z)))+p.phase*.03;
      const wobble=cyclone?1:.95+.1*Math.sin(t*1.8+p.z*7);
      const x=Math.cos(theta)*p.r*wobble,y=Math.sin(theta)*p.r*wobble;
      const yaw=angle+(cyclone?.27:.10);
      const rx=x*Math.cos(yaw)-y*Math.sin(yaw),ry=x*Math.sin(yaw)+y*Math.cos(yaw);
      const elevation=cyclone?p.z*.70:p.z;
      const size=p.size*(cyclone?1.3:1.15)*(1+.12*ry);
      const px=w*.5+rx*(cyclone?202:180),py=(cyclone?h*.53:h*.82)+ry*(cyclone?65:36)-elevation*(cyclone?95:225);
      positions.push({px,py,size,color:p.color,depth:ry+elevation*.10});
    }
    positions.sort((a,b)=>a.depth-b.depth);
    for(const p of positions){
      ctx.globalAlpha=clamp(.60+.34*((p.depth+1)*.5),.48,.97);
      ctx.drawImage(sprites[p.color],p.px-p.size,p.py-p.size,p.size*2,p.size*2);
    }
    ctx.globalAlpha=1;
    if(cyclone){
      ctx.beginPath();ctx.ellipse(w*.5,h*.53,13,8,0,0,PI2);
      ctx.fillStyle='#091d33';ctx.fill();
      ctx.strokeStyle='rgba(75,232,243,.75)';ctx.lineWidth=2;ctx.stroke();
      ctx.fillStyle='#ebf9ff';ctx.font='600 11px system-ui';ctx.fillText('ROTATING EYE / SPIRAL BANDS',12,h-14);
    }else{
      ctx.fillStyle='#dceefa';ctx.font='600 11px system-ui';ctx.fillText('ROTATING FUNNEL / CLOUD INFLOW',12,h-14);
    }
  };
  requestAnimationFrame(draw);
  return wrap;
}
