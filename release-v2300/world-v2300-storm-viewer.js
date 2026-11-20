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

/* True WebGL storm detail viewer. A small self-contained scene enhances the
   existing canvas preview; the canvas remains as a fallback on weak devices.
   The vortex is an illustrative visualization of the selected source event. */
async function attachVolumetricStormViewer(wrap,baseCanvas,note,cyclone,lowPower){
  let THREE;
  try{THREE=await import('./vendor/three.module.js?v=169-local');}catch(_){return false}
  if(!wrap.isConnected)return false;
  const canvas=document.createElement('canvas');
  canvas.width=520;canvas.height=305;
  canvas.style.cssText='display:block;position:absolute;inset:0;width:100%;height:100%;touch-action:none;cursor:grab';
  let renderer;
  try{
    renderer=new THREE.WebGLRenderer({canvas,antialias:!lowPower,alpha:false,powerPreference:'low-power',preserveDrawingBuffer:false});
    renderer.setSize(520,305,false);
    renderer.setPixelRatio(Math.min(lowPower?1:1.5,window.devicePixelRatio||1));
    renderer.setClearColor(0x071422,1);
  }catch(_){try{renderer?.dispose()}catch(_){}return false}
  if(!wrap.isConnected){renderer.dispose();return false}
  const scene=new THREE.Scene();
  scene.fog=new THREE.FogExp2(0x0a1623,.013);
  const camera=new THREE.PerspectiveCamera(41,520/305,.05,80);
  camera.position.set(cyclone?6.3:6.2,cyclone?5.1:4.0,cyclone?8.5:8.2);
  camera.lookAt(0,cyclone?.35:2.0,0);
  scene.add(new THREE.AmbientLight(0xc7d5e6,.83));
  const key=new THREE.DirectionalLight(0xffffff,2.35);key.position.set(-5,10,7);scene.add(key);
  const rim=new THREE.DirectionalLight(0x7fa9ff,.84);rim.position.set(5,4,-7);scene.add(rim);
  const group=new THREE.Group();scene.add(group);
  const particleCount=cyclone?(lowPower?400:960):(lowPower?410:900);
  const geom=new THREE.IcosahedronGeometry(1,lowPower?0:1);
  const mat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:1,metalness:0,flatShading:false,transparent:true,opacity:.78,depthWrite:false});
  const mesh=new THREE.InstancedMesh(geom,mat,particleCount);
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.frustumCulled=false;
  const obj=new THREE.Object3D(),color=new THREE.Color(),fract=v=>v-Math.floor(v);
  const rand=(i,k=0)=>fract(Math.sin((i+1)*127.1+(k+1)*311.7)*43758.5453);
  for(let i=0;i<particleCount;i++){
    if(cyclone){
      const arm=i%5,prog=(i+.5)/particleCount,r=.54+4.30*Math.pow(prog,.73);
      const angle=arm*2*Math.PI/5+2.72*Math.log(1+2.4*r)+rand(i,1)*.48;
      const radial=r+(rand(i,2)-.5)*.40;
      obj.position.set(Math.cos(angle)*radial,.12+Math.pow(1-prog,1.65)*1.25+rand(i,3)*.46,Math.sin(angle)*radial);
      let palette;
      if(r<1.20)palette=['#8d233f','#e33b3a'];else if(r<2.1)palette=['#e63824','#ff5428'];
      else if(r<3.00)palette=['#ff9f20','#f6d62b'];else if(r<3.90)palette=['#36bf46','#e0eb48'];
      else palette=['#338bd0','#b7d8ed'];
      color.set(palette[rand(i,4)<.5?0:1]);
      obj.scale.setScalar(.11+.20*rand(i,5)+.13*(1-prog));
      obj.scale.y*=.62+rand(i,6)*1.35;
    }else{
      const h=rand(i,1)*5.5,level=h/5.5,rad=.10+1.62*Math.pow(level,.98);
      const angle=i*2.399963+level*4.3;
      obj.position.set(Math.cos(angle)*rad*(.72+.44*rand(i,2)),h,Math.sin(angle)*rad*(.72+.44*rand(i,3)));
      color.set(rand(i,4)>.87?'#c9ced1':rand(i,5)>.52?'#667078':'#303941');
      obj.scale.setScalar(.055+.13*rand(i,6)+level*.11);
      if(level>.78)obj.scale.set(obj.scale.x*1.4,obj.scale.y*1.3,obj.scale.z*1.4);
    }
    obj.rotation.set(rand(i,7),rand(i,8),rand(i,9));obj.updateMatrix();
    mesh.setMatrixAt(i,obj.matrix);mesh.setColorAt(i,color);
  }
  mesh.instanceMatrix.needsUpdate=true;
  if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
  group.add(mesh);
  let debris=null;
  if(!cyclone){
    const count=lowPower?70:165,geometry=new THREE.TetrahedronGeometry(.065),material=new THREE.MeshStandardMaterial({color:0x99795c,roughness:1});
    debris=new THREE.InstancedMesh(geometry,material,count);debris.frustumCulled=false;
    for(let i=0;i<count;i++){
      let r=.25+rand(i,11)*1.15,a=i*2.399963;
      obj.position.set(Math.cos(a)*r,rand(i,12)*.56,Math.sin(a)*r);
      obj.scale.setScalar(.30+rand(i,13)*1.5);
      obj.rotation.set(rand(i,14)*6,rand(i,15)*6,rand(i,16)*6);
      obj.updateMatrix();debris.setMatrixAt(i,obj.matrix);
    }
    debris.instanceMatrix.needsUpdate=true;group.add(debris);
    const anvil=new THREE.Mesh(new THREE.SphereGeometry(1,16,8),
      new THREE.MeshStandardMaterial({color:0x343b46,roughness:1,transparent:true,opacity:.66,depthWrite:false}));
    anvil.scale.set(2.7,.58,2.4);anvil.position.y=5.47;group.add(anvil);
  }else{
    const eye=new THREE.Mesh(new THREE.RingGeometry(.34,.45,48),
      new THREE.MeshBasicMaterial({color:0xffcd71,side:THREE.DoubleSide,transparent:true,opacity:.60,depthWrite:false}));
    eye.rotation.x=-Math.PI/2;eye.position.y=.35;group.add(eye);
  }
  const holder=document.createElement('div');
  holder.style.cssText='position:absolute;inset:0;z-index:1;';
  holder.appendChild(canvas);
  baseCanvas.parentNode.insertBefore(holder,baseCanvas.nextSibling);
  baseCanvas.style.visibility='hidden';
  note.textContent='INTERACTIVE 3D VOLUME · DRAG TO ORBIT · PINCH TO ZOOM';
  wrap.style.position='relative';
  let last=0,yaw=0,pitch=0,radius=cyclone?10.5:9.2,dragging=false,x0=0,y0=0,raf=0,disposed=false;
  const onDown=e=>{dragging=true;x0=e.clientX;y0=e.clientY;canvas.style.cursor='grabbing';try{canvas.setPointerCapture(e.pointerId)}catch(_){}};
  const onMove=e=>{if(!dragging)return;yaw+=(e.clientX-x0)*.0085;pitch=Math.max(-.6,Math.min(.8,pitch+(e.clientY-y0)*.005));x0=e.clientX;y0=e.clientY};
  const onUp=()=>{dragging=false;canvas.style.cursor='grab'};
  canvas.addEventListener('pointerdown',onDown);canvas.addEventListener('pointermove',onMove);
  canvas.addEventListener('pointerup',onUp);canvas.addEventListener('pointercancel',onUp);
  canvas.addEventListener('wheel',e=>{e.preventDefault();radius=Math.min(15,Math.max(5,radius+Math.sign(e.deltaY)*.75))},{passive:false});
  const targetY=cyclone?.45:2.55;
  function animate(time){
    if(!holder.isConnected||disposed){disposed=true;cancelAnimationFrame(raf);
      mesh.geometry.dispose();mesh.material.dispose();if(debris){debris.geometry.dispose();debris.material.dispose();}
      renderer.dispose();return}
    raf=requestAnimationFrame(animate);
    if(document.hidden||time-last<(lowPower?40:28))return;
    const dt=Math.min(.08,(time-last)/1000||.035);last=time;
    if(!dragging)yaw+=dt*.045;
    group.rotation.y+=(cyclone?-.12:1.55)*dt;
    camera.position.set(Math.sin(yaw+.6)*radius,cyclone?targetY+5.2+pitch*radius:targetY+2.5+pitch*radius,Math.cos(yaw+.6)*radius);
    camera.lookAt(0,targetY,0);
    renderer.render(scene,camera);
  }
  raf=requestAnimationFrame(animate);
  return true;
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
  // Retain the existing CPU canvas as a fallback if WebGL is unavailable.
  void attachVolumetricStormViewer(wrap,canvas,note,cyclone,lowPower).then(ok=>{if(ok)stopped=true}).catch(()=>{});
  return wrap;
}
