
 // Animated electricity is an illustrative outage visualization, not detected live arcing.
 const ELECTRIC_LAYER='bp-power-outage-electricity-v6';
 let electricThree=null,electricPromise=null,electricMap=null;
 const electricHash=(a,b=0)=>{const x=Math.sin(a*127.1+b*311.7+17.17)*43758.5453;return x-Math.floor(x)};
 function electricRingContains(p,ring){
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
   const a=ring[i],b=ring[j];
   if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
 }
 function electricInside(p,rings){return rings.length>0&&electricRingContains(p,rings[0])&&!rings.slice(1).some(r=>electricRingContains(p,r))}
 function electricBounds(ring){
  let w=Infinity,e=-Infinity,s=Infinity,n=-Infinity;
  for(const p of ring){w=Math.min(w,p[0]);e=Math.max(e,p[0]);s=Math.min(s,p[1]);n=Math.max(n,p[1]);}
  return [w,s,e,n];
 }
 const electricWrap=(x,ref)=>ref+(((x-ref+180)%360+360)%360-180);
 function electricPolygons(features,ref){
  const out=[];
  for(const f of features||[]){
   const g=f.geometry,polys=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
   for(const rings of polys){
    if(!rings?.[0]?.length)continue;
    const a=electricWrap(rings[0][0][0],ref);
    const r=rings.map(ring=>ring.map(p=>[electricWrap(p[0],a),p[1]]));
    out.push({rings:r,bounds:electricBounds(r[0]),id:f.id||f.properties?.eventId||out.length});
   }
  }
  return out;
 }
 function electricViewport(m){
  const c=m.getCenter(),b=m.getBounds(),z=m.getZoom(),ref=c.lng;
  let w=electricWrap(b.getWest(),ref),e=electricWrap(b.getEast(),ref);
  if(e<w)e+=360;if(ref<w){w-=360;e-=360;}
  if(z<2||b.getEast()-b.getWest()>=350){w=ref-180;e=ref+180;}
  const lat=Math.max(-80,Math.min(80,c.lat));
  const metresPerDegreeX=111320*Math.max(.07,Math.cos(lat*Math.PI/180));
  const metrePixel=156543.034*Math.cos(lat*Math.PI/180)/Math.pow(2,z);
  const spacing=Math.max(8,Math.min(32000,metrePixel*48));
  return {w,e,s:b.getSouth(),n:b.getNorth(),ref,lat,z,spacing,dx:spacing/metresPerDegreeX,dy:spacing/111320};
 }
 function electricSites(polys,v,budget=420){
  const sites=[];
  // One geographic grid per zoom band, stable while panning. Each covered
  // polygon gets at least one site if a valid interior sample is available.
  const candidates=polys.filter(p=>p.bounds[0]<=v.e&&p.bounds[2]>=v.w&&p.bounds[1]<=v.n&&p.bounds[3]>=v.s);
  const cap=Math.max(1,Math.min(72,Math.floor(budget/Math.max(1,candidates.length))));
  for(const p of candidates){
   if(sites.length>=budget)break;
   const [w,s,e,n]=p.bounds;
   const x0=Math.max(w,v.w-v.dx),x1=Math.min(e,v.e+v.dx),y0=Math.max(s,v.s-v.dy),y1=Math.min(n,v.n+v.dy);
   if(x0>x1||y0>y1)continue;
   const ratio=Math.sqrt(Math.max(1,((x1-x0)/v.dx)*((y1-y0)/v.dy)/cap));
   const dx=v.dx*ratio,dy=v.dy*ratio;
   let count=0;
   for(let iy=Math.floor(y0/dy);iy<=Math.floor(y1/dy)&&count<cap&&sites.length<budget;iy++){
    for(let ix=Math.floor(x0/dx);ix<=Math.floor(x1/dx)&&count<cap&&sites.length<budget;ix++){
     const x=(ix+.3+.4*electricHash(ix,iy))*dx,y=(iy+.3+.4*electricHash(iy,ix))*dy;
     if(x<x0||x>x1||y<y0||y>y1||!electricInside([x,y],p.rings))continue;
     sites.push({p,coord:[x,y],seed:ix*19.71+iy*73.17,dx,dy,spacing:Math.min(42000,v.spacing*ratio)});count++;
    }
   }
   if(!count){
    for(let i=0;i<81;i++){
     const x=x0+(x1-x0)*((i%9+.5)/9),y=y0+(y1-y0)*(Math.floor(i/9)+.5)/9;
     if(electricInside([x,y],p.rings)){sites.push({p,coord:[x,y],seed:x*17+y*19,dx:v.dx,dy:v.dy,spacing:v.spacing});break;}
    }
   }
  }
  return sites;
 }
 function electricArcPaths(site){
  const {p,coord,seed,dx,dy,spacing}=site,paths=[];
  const heightScale=Math.max(2.4,Math.min(spacing*.23,spacing));
  const make=(origin,angle,length,steps,phase,kind,rootHeight=0)=>{
   const path=[];
   for(let i=0;i<=steps;i++){
    const t=i/steps;
    const jitter=(electricHash(seed+phase*491,i)-.5)*.19*Math.sin(Math.PI*t);
    const x=origin[0]+(Math.cos(angle)*t*length-Math.sin(angle)*jitter)*dx;
    const y=origin[1]+(Math.sin(angle)*t*length+Math.cos(angle)*jitter)*dy;
    if(!electricInside([x,y],p.rings))break;
    // Keep segments inside concave boundaries and holes, not only endpoints.
    if(path.length){const prev=path[path.length-1].coord;let ok=true;
     for(let j=1;j<5;j++)if(!electricInside([prev[0]+(x-prev[0])*j/5,prev[1]+(y-prev[1])*j/5],p.rings)){ok=false;break;}
     if(!ok)break;
    }
    const h=kind===1?heightScale*(.18*t+.88*Math.sin(Math.PI*t*.84)):
     kind===2?rootHeight*(1-t)+heightScale*.19*Math.sin(Math.PI*t):heightScale*.10*Math.sin(Math.PI*t);
    path.push({coord:[x,y],height:Math.max(.18,h+.18),phase,t,kind});
   }
   if(path.length>1)paths.push(path);
   return path;
  };
  // Multiple differently phased networks cover the whole sampled area:
  // long ground-hugging channels and short upward forks.
  for(let k=0;k<4;k++){
   const a=k*Math.PI*.5+electricHash(seed,k)*.75;
   const phase=electricHash(seed,k+37);
   const main=make(coord,a,.78+.58*electricHash(seed,k+9),14,phase,0);
   if(main.length>5){
    const r=main[4];
    make(r.coord,a+(k%2?1:-1)*1.12,.35+.22*electricHash(seed,k+80),7,phase,2,r.height);
   }
   if(k%2===0){
    const up=make(coord,a+.56,.28+.18*electricHash(seed,k+71),10,electricHash(seed,k+99),1);
    if(up.length>5){const r=up[5];make(r.coord,a-1.3,.22,5,r.phase,2,r.height);}
   }
  }
  return paths;
 }
 function electricTerrain(m,p){
  try{const h=m.queryTerrainElevation?.([electricWrap(p[0],0),p[1]],{exaggerated:true});return Number.isFinite(h)?h:0}catch(_){return 0}
 }
 function electricMesh(T,m,sites){
  // Batch nearby paths into shared local east/up/south coordinates; map model
  // matrix carries the local anchor onto the globe, avoiding GPU global jitter.
  const batches=new Map();
  for(const site of sites){
   const bucket=Math.max(.001,Math.min(.55,site.spacing/111320*4));
   const key=Math.floor(site.coord[0]/bucket)+':'+Math.floor(site.coord[1]/bucket);
   let b=batches.get(key);
   if(!b){b={anchor:site.coord,elevation:electricTerrain(m,site.coord),pos:[],phase:[],edge:[],travel:[],kind:[],lift:[]};batches.set(key,b);}
   const local=p=>[(p.coord[0]-b.anchor[0])*111320*Math.cos(b.anchor[1]*Math.PI/180),
    electricTerrain(m,p.coord)-b.elevation+p.height,(b.anchor[1]-p.coord[1])*111320];
   const width=Math.max(.045,site.spacing*.007);
   for(const path of electricArcPaths(site)){
    for(let i=1;i<path.length;i++){
     const a=local(path[i-1]),c=local(path[i]);
     const dx=c[0]-a[0],dz=c[2]-a[2],d=Math.hypot(dx,dz)||1;
     // Crossed tapered 3D ribbons: one horizontal, one vertical.
     for(const offset of [[-dz/d*width,0,dx/d*width],[0,width,0]]){
      const v=(p,k)=>p.map((x,j)=>x+offset[j]*k);
      for(const [point,k] of [[a,-1],[a,1],[c,1],[a,-1],[c,1],[c,-1]]){
       const node=point===a?path[i-1]:path[i]; b.pos.push(...v(point,k));b.phase.push(node.phase);b.edge.push(k);b.travel.push(node.t);b.kind.push(node.kind);b.lift.push(node.height);
      }
     }
    }
   }
  }
  const uniforms={uTime:{value:0}};
  const material=new T.ShaderMaterial({uniforms,transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,blending:T.AdditiveBlending,
   vertexShader:`attribute float aPhase,aEdge,aTravel,aKind,aLift;
   uniform float uTime;
   varying float vPhase,vEdge,vTravel,vKind;
   void main(){
    vPhase=aPhase;vEdge=aEdge;vTravel=aTravel;vKind=aKind;
    vec3 p=position;
    // Flex raised arcs in three dimensions while roots stay on terrain.
    float flex=sin(uTime*13.0+aPhase*41.0+aTravel*12.0);
    p.y+=max(0.0,aLift-.18)*.16*flex;
    gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
   }`,
   fragmentShader:`uniform float uTime; varying float vPhase,vEdge,vTravel,vKind;
   float hash(float x){return fract(sin(x*127.1)*43758.5453);}
   void main(){
    float cycle=fract(uTime*(.75+vPhase*.8)+vPhase*11.0);
    float wave=exp(-pow((vTravel-cycle)*5.8,2.0));
    float tail=exp(-pow((vTravel-cycle+.18)*4.0,2.0));
    float tick=floor(uTime*9.0+vPhase*29.0);
    float spark=hash(tick+vPhase*173.0);
    float crackle=.50+.50*sin(uTime*19.0+vTravel*39.0+vPhase*23.0);
    float active=(.14+.69*wave+.27*tail)*(.55+.45*spark)*(.78+.22*crackle);
    float edge=abs(vEdge),core=1.0-smoothstep(.035,.27,edge),halo=exp(-edge*edge*4.2);
    vec3 glow=mix(vec3(.18,.42,1.),vec3(.65,.88,1.),halo);
    vec3 color=mix(glow,vec3(1.,1.,.98),core);
    gl_FragColor=vec4(color,clamp(active*(.90*core+.40*halo),0.,1.));
   }`});
  const scenes=[];
  for(const b of batches.values()){
   if(!b.pos.length)continue;
   const g=new T.BufferGeometry();
   g.setAttribute('position',new T.Float32BufferAttribute(b.pos,3));
   g.setAttribute('aPhase',new T.Float32BufferAttribute(b.phase,1));
   g.setAttribute('aEdge',new T.Float32BufferAttribute(b.edge,1));
   g.setAttribute('aTravel',new T.Float32BufferAttribute(b.travel,1));
   g.setAttribute('aKind',new T.Float32BufferAttribute(b.kind,1));
   g.setAttribute('aLift',new T.Float32BufferAttribute(b.lift,1));
   const mesh=new T.Mesh(g,material);mesh.frustumCulled=false;
   const scene=new T.Scene();scene.add(mesh);scenes.push({...b,scene,geometry:g});
  }
  return {scenes,uniforms,dispose(){for(const b of scenes)b.geometry.dispose();material.dispose()}};
 }
 function stopElectricity(){
  if(electricMap?.getLayer?.(ELECTRIC_LAYER))try{electricMap.removeLayer(ELECTRIC_LAYER)}catch(_){}
  electricMap=null;
 }
 function ensureElectricity(){
  if(!enabled||!map||!map.getStyle?.()||!map.getLayer?.(IDS.areaPoints))return;
  if(electricMap&&electricMap!==map)stopElectricity();
  if(map.getLayer(ELECTRIC_LAYER))return;
  if(!electricThree){
   if(!electricPromise)electricPromise=import('/vendor/three.module.js?v=169-local').then(T=>{electricThree=T;ensureElectricity()})
    .catch(e=>console.warn('Power outage 3D electricity unavailable',e)).finally(()=>{electricPromise=null});
   return;
  }
  const m=map,T=electricThree;let renderer,camera,active=null,sourceRef=null,lastBuild=0,lastKey='',settled=false;
  const layer={id:ELECTRIC_LAYER,type:'custom',renderingMode:'3d',
   onAdd(m,gl){renderer=new T.WebGLRenderer({canvas:m.getCanvas(),context:gl,alpha:true,antialias:false,powerPreference:'low-power'});renderer.autoClear=false;camera=new T.Camera();},
   render(_gl,args){
    if(!enabled||m!==map||!renderer||document.hidden)return;
    const matrix=args?.defaultProjectionData?.mainMatrix||args?.modelViewProjectionMatrix;
    if(!matrix||matrix.length<16)return;
    const data=lastData?.counties?.features||[],now=performance.now(),v=electricViewport(m);
    if(!data.length){active?.dispose();active=null;return;}
    const key=[Math.floor(v.z*2),Math.floor(v.ref/Math.max(v.dx*2,.0001)),Math.floor(v.lat/Math.max(v.dy*2,.0001))].join(':');
    if(!active||sourceRef!==data||((key!==lastKey||!settled&&m.areTilesLoaded?.())&&now-lastBuild>250)){
     try{
      const next=electricMesh(T,m,electricSites(electricPolygons(data,v.ref),v));
      const old=active;active=next;old?.dispose();sourceRef=data;lastKey=key;lastBuild=now;settled=m.areTilesLoaded?.()===true;
     }catch(e){console.warn('Power outage electric terrain mesh',e);lastBuild=now;}
    }
    if(!active)return;
    active.uniforms.uTime.value=now*.001;
    const projection=new T.Matrix4().fromArray(matrix);
    for(const b of active.scenes){
     const raw=m.transform?.getMatrixForModel?.([electricWrap(b.anchor[0],0),b.anchor[1]],b.elevation);
     if(!raw||raw.length<16)continue;
     camera.projectionMatrix.copy(projection).multiply(new T.Matrix4().fromArray(raw));
     renderer.resetState();renderer.render(b.scene,camera);
    }
    if(active.scenes.length)m.triggerRepaint?.();
   },
   onRemove(){active?.dispose();active=null;renderer?.dispose();renderer=null;camera=null;}
  };
  try{m.addLayer(layer,IDS.areaPoints);electricMap=m;m.triggerRepaint?.()}catch(e){console.warn('Power outage custom 3D layer',e)}
 }
