/* BridgePoint Wildfire visual engine v4 — GPU-driven native 3D fire volumes.
 * Real detections determine locations. Flames, heat, smoke and burn propagation
 * are explicitly illustrative (not physically simulated or damage confirmed).
 * Geometry: 3D tapered curved tube surfaces; no particles, sprites, billboards,
 * external textures, or changes to the base terrain/building/tree renderers.
 */
const pi=Math.PI;
const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
const fract=x=>x-Math.floor(x);
const hash=x=>fract(Math.sin(x*127.13+98.71)*43758.5453);
const finite=x=>Number.isFinite(x);
function lonLatAt(origin,x,z){
 const lat=origin[1]+z/111320;
 const lon=origin[0]+x/(111320*Math.max(.06,Math.cos(origin[1]*pi/180)));
 return [lon,lat];
}
function inRing(p,ring){
 let inside=false;
 for(let i=0,j=ring.length-1;i<ring.length;j=i++){
  const a=ring[i],b=ring[j];
  if(((a[1]>p[1])!==(b[1]>p[1]))&&p[0]<(b[0]-a[0])*(p[1]-a[1])/((b[1]-a[1])||1e-15)+a[0])inside=!inside;
 }
 return inside;
}
export function isInsideMeasuredFireBoundary(point,features){
 if(!features?.length)return true;
 return features.some(feature=>{
  const g=feature?.geometry;
  if(!g)return false;
  const polys=g.type==='Polygon'?[g.coordinates]:g.type==='MultiPolygon'?g.coordinates:[];
  return polys.some(rings=>rings?.length&&inRing(point,rings[0])&&!rings.slice(1).some(r=>inRing(point,r)));
 });
}
function elevationAt(map,fire,dx,dz,originElevation){
 const coord=lonLatAt(fire.coordinates,dx,dz);
 try{
  const sample=map.queryTerrainElevation?.(coord,{exaggerated:false});
  return finite(sample)?clamp(sample-originElevation,-9000,9000):0;
 }catch(_){return 0;}
}
function allocateFlames(T,groups,seed){
 const radial=9,rings=10;
 const positions=[],uvs=[],seeds=[],strengths=[],inds=[];
 function putTongue(x,y,z,height,radius,phase,intensity){
  const base=positions.length/3;
  for(let j=0;j<=rings;j++){
   const q=j/rings,falloff=Math.pow(1-q,.72);
   for(let i=0;i<radial;i++){
    const angle=i*pi*2/radial+j*.035+phase;
    const ripple=1+.12*Math.sin(angle*3+phase);
    positions.push(x+Math.cos(angle)*radius*falloff*ripple,
      y+q*height,z+Math.sin(angle)*radius*falloff*ripple);
    uvs.push(q,i/radial);
    seeds.push(phase);strengths.push(intensity);
   }
  }
  for(let j=0;j<rings;j++){
   for(let i=0;i<radial;i++){
    const here=base+j*radial+i,next=base+j*radial+(i+1)%radial;
    inds.push(here,next,here+radial,next,next+radial,here+radial);
   }
  }
 }
 for(const [index,item] of groups.entries()){
  const {x,y,z,height,energy=1}=item;
  const diversity=hash(seed+index*7.57);
  const tongues=energy>1.1?5:3;
  for(let k=0;k<tongues;k++){
   const h=height*(k===0?1: .48+.43*hash(seed+index*31+k));
   const angle=k*pi*2/tongues+diversity*3,spread=height*(k===0?.04:.11);
   putTongue(x+Math.cos(angle)*spread,y,z+Math.sin(angle)*spread,
    h,Math.max(.22,h*(.13+.075*hash(index*9.7+k+seed))),
    seed+index*.71+k*1.1,clamp(energy,.6,1.6));
  }
 }
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(positions,3));
 g.setAttribute('aUV',new T.Float32BufferAttribute(uvs,2));
 g.setAttribute('aSeed',new T.Float32BufferAttribute(seeds,1));
 g.setAttribute('aStrength',new T.Float32BufferAttribute(strengths,1));
 g.setIndex(inds);
 const uniforms={uTime:{value:0},uWind:{value:new T.Vector2(.70,.42)}};
 const material=new T.ShaderMaterial({
  uniforms,transparent:true,depthWrite:false,depthTest:true,
  side:T.DoubleSide,blending:T.NormalBlending,
  vertexShader:[
   'precision highp float;',
   'attribute vec2 aUV; attribute float aSeed; attribute float aStrength;',
   'uniform float uTime; uniform vec2 uWind;',
   'varying vec2 vUV; varying float vSeed; varying float vStrength;',
   'void main(){',
   'vUV=aUV;vSeed=aSeed;vStrength=aStrength;',
   'float h=aUV.x, t=uTime, phase=aSeed;',
   'vec3 p=position;',
   'float whip=sin(t*3.7+phase*1.17+h*8.8)*.67+sin(t*5.4-phase*.87+h*15.3)*.25;',
   'float curl=cos(t*2.8+phase*2.3+h*10.7);',
   'float sway=(h*h)*(1.0+sin(t*1.5+phase)*.19);',
   'p.x+=uWind.x*whip*sway*1.95+curl*sway*.60;',
   'p.z+=uWind.y*whip*sway*1.95+sin(t*2.4+h*12.0+phase)*sway*.63;',
   'p.y+=sin(t*6.2+phase+h*12.3)*h*.27;',
   'gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);',
   '}'
  ].join('\n'),
  fragmentShader:[
   'precision highp float;',
   'uniform float uTime;',
   'varying vec2 vUV; varying float vSeed; varying float vStrength;',
   'float n2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
   'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);',
   'return mix(mix(n2(i),n2(i+vec2(1,0)),f.x),mix(n2(i+vec2(0,1)),n2(i+vec2(1,1)),f.x),f.y);}',
   'void main(){',
   'float h=vUV.x,t=uTime;',
   'float turbulence=noise(vec2(vSeed*2.7+vUV.y*6.0+h*3.6-t*1.9,h*7.0+t*3.2));',
   'float crackle=pow(noise(vec2(vSeed*4.1+h*15.0+t*8.7,vUV.y*12.0+t*5.8)),4.0);',
   'float pulse=.78+.20*sin(t*5.6+vSeed*3.1+h*12.4)+.13*turbulence;',
   'vec3 ember=vec3(.42,.019,.003),orange=vec3(1.0,.18,.012),',
   'amber=vec3(1.0,.49,.035),gold=vec3(1.0,.81,.29),',
   'hot=vec3(1.0,.97,.72);',
   'float core=smoothstep(.93,.07,h);',
   'vec3 col=mix(ember,orange,smoothstep(.02,.24,h));',
   'col=mix(col,amber,smoothstep(.18,.55,h));',
   'col=mix(col,gold,smoothstep(.37,.72,h)*(.36+.34*turbulence));',
   'col=mix(col,hot,core*pow(turbulence,2.0)*.55+crackle*.25);',
   'col*=pulse*vStrength;',
   'float tip=1.0-smoothstep(.67,1.0,h);',
   'float alpha=clamp((.58+.22*turbulence+crackle*.26)*tip*(.7+.30*core),.02,.94);',
   'gl_FragColor=vec4(col,alpha);',
   '}'
  ].join('\n')
 });
 const mesh=new T.Mesh(g,material);mesh.frustumCulled=false;
 mesh.name='BridgePoint true 3D turbulent wildfire tongues (GPU-animated)';
 return {mesh,uniforms,tongueCount:groups.length*3};
}
function makeGroundHeatSheet(T,map,fire,perimeters,centerElevation,allowed,seed){
 const radius=clamp(fire.radiusM||180,90,850),samples=26;
 const p=[],uv=[],tri=[],vertices=new Map();
 const step=2*radius/samples;
 const grid=(x,z)=>{
  const k=x+':'+z;
  if(vertices.has(k))return vertices.get(k);
  const dx=-radius+step*x,dz=-radius+step*z;
  const coord=lonLatAt(fire.coordinates,dx,dz);
  const inside=dx*dx+dz*dz<=radius*radius&&allowed(coord);
  const item={dx,dz,inside,y:inside?elevationAt(map,fire,dx,dz,centerElevation)+.72:0};
  vertices.set(k,item);return item;
 };
 let polygons=0;
 for(let z=0;z<samples;z++)for(let x=0;x<samples;x++){
  const corners=[grid(x,z),grid(x+1,z),grid(x+1,z+1),grid(x,z+1)];
  if(!corners.every(c=>c.inside))continue;
  const base=p.length/3;
  for(const c of corners){p.push(c.dx,c.y,c.dz);uv.push(c.dx/radius,c.dz/radius);}
  tri.push(base,base+1,base+2,base,base+2,base+3);polygons+=2;
 }
 if(!polygons)return null;
 const g=new T.BufferGeometry();
 g.setAttribute('position',new T.Float32BufferAttribute(p,3));
 g.setAttribute('aGroundXY',new T.Float32BufferAttribute(uv,2));
 g.setIndex(tri);
 const uniforms={uTime:{value:0},uFirePower:{value:clamp(Math.log2(2+Math.max(0,fire.frp||0))/7.5,.42,1.25)},uSeed:{value:seed}};
 const m=new T.ShaderMaterial({
  uniforms,transparent:true,depthWrite:false,depthTest:true,
  side:T.DoubleSide,blending:T.NormalBlending,
  vertexShader:[
   'precision highp float;',
   'attribute vec2 aGroundXY;',
   'varying vec2 vGround;',
   'void main(){vGround=aGroundXY;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}'
  ].join('\n'),
  fragmentShader:[
   'precision highp float;',
   'uniform float uTime,uFirePower,uSeed;',
   'varying vec2 vGround;',
   'float hash2(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
   'float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);',
   'return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x),f.y);}',
   'void main(){',
   'vec2 uv=vGround;',
   'float flow=noise(uv*13.0+vec2(uTime*.52,-uTime*.34+uSeed));',
   'float rolling=noise(uv*31.0+vec2(-uTime*.81,uTime*.59));',
   'float detail=noise(uv*66.0+vec2(uTime*1.40,-uTime*1.11));',
   'float radial=length(uv);',
   'float frontline=1.0-smoothstep(.12,.52,abs(radial-(.55+.16*flow)));',
   'float patches=smoothstep(.54,.82,.55*flow+.35*rolling+.3*detail);',
   'float hot=clamp((patches*.72+frontline*.55)*uFirePower,0.0,1.0);',
   'float flicker=.77+.19*sin(uTime*7.2+detail*22.0+uv.x*40.0)+.11*detail;',
   'hot=clamp(hot*flicker,0.0,1.0);',
   'vec3 ash=vec3(.12,.018,.008),smoulder=vec3(.47,.058,.008);',
   'vec3 orange=vec3(1.0,.24,.012),fire=vec3(1.0,.62,.075),white=vec3(1.0,.94,.48);',
   'vec3 col=mix(ash,smoulder,smoothstep(.12,.50,hot));',
   'col=mix(col,orange,smoothstep(.33,.69,hot));',
   'col=mix(col,fire,smoothstep(.58,.92,hot));',
   'col=mix(col,white,pow(max(0.0,hot-.78),2.0)*7.0);',
   'float alpha=clamp(.06+.56*hot,0.0,.63);',
   'gl_FragColor=vec4(col,alpha);',
   '}'
  ].join('\n')
 });
 const mesh=new T.Mesh(g,m);mesh.frustumCulled=false;
 mesh.name='BridgePoint terrain-following rolling fire-front shader';
 return {mesh,uniforms,triangleCount:polygons};
}
export function createBridgePointWildfireVolumeV4(T,{map,fire,perimeters=[],buildings=[],trees=[],quality=1}){
 if(!T?.ShaderMaterial||!T?.BufferGeometry||!fire?.coordinates)return null;
 const siteSeed=fire.coordinates[0]*71.93+fire.coordinates[1]*113.71+(fire.count||1)*.019;
 const radius=clamp(fire.radiusM||180,90,850);
 const allowed=coords=>{
  const [x,z]=[(coords[0]-fire.coordinates[0])*111320*Math.cos(fire.coordinates[1]*pi/180),
               (coords[1]-fire.coordinates[1])*111320];
  return x*x+z*z<=radius*radius&&isInsideMeasuredFireBoundary(coords,perimeters);
 };
 let centerElevation=0;
 try{
  const h=map.queryTerrainElevation?.(fire.coordinates,{exaggerated:false});
  if(finite(h))centerElevation=h;
 }catch(_){}
 const scene=new T.Scene(),heatGroup=new T.Group();
 scene.add(heatGroup);
 const n=clamp(Math.floor((quality>=2?130:quality>=1?94:49)+Math.sqrt(fire.count||1)*2.1),38,quality>=2?170:quality>=1?124:65);
 const patchCenters=[],patchCount=quality>=1?9:6;
 for(let p=0;p<patchCount;p++){
  const theta=p*pi*2/patchCount+hash(siteSeed+p*3)*.7;
  const rr=radius*(.12+.63*hash(siteSeed+p*11.3));
  patchCenters.push([Math.cos(theta)*rr,Math.sin(theta)*rr]);
 }
 const accepted=[],baseHeight=clamp(5.5+Math.log2(1+Math.max(0,fire.frp||0))*.95,5.5,17);
 for(let i=0;i<n*12&&accepted.length<n;i++){
  const u=hash(siteSeed+i*13.39),v=hash(siteSeed+i*37.11),
    patch=patchCenters[i%patchCount];
  const frontier=i%5===0;
  const theta=pi*2*(u+i*.6180339);
  const dist=frontier?radius*(.57+.29*v):radius*(.06+.24*v);
  const x=frontier?Math.cos(theta)*dist:patch[0]+Math.cos(theta)*dist;
  const z=frontier?Math.sin(theta)*dist:patch[1]+Math.sin(theta)*dist;
  const coord=lonLatAt(fire.coordinates,x,z);
  if(!allowed(coord))continue;
  const height=baseHeight*(.49+1.06*hash(siteSeed+i*5.49));
  const y=elevationAt(map,fire,x,z,centerElevation)+.42;
  accepted.push({x,y,z,height,energy:.75+hash(siteSeed+i*.74)*.75});
 }
 // Always visibly reconstruct around an observed detection even if its
 // upstream perimeter geometry is invalid or excludes the sampled centre.
 if(!accepted.length)accepted.push({x:0,y:.44,z:0,height:baseHeight,energy:1});
 for(const [i,b] of buildings.entries()){
  const [x,z]=[(b.coord[0]-fire.coordinates[0])*111320*Math.cos(fire.coordinates[1]*pi/180),
               (b.coord[1]-fire.coordinates[1])*111320];
  if(!allowed(b.coord))continue;
  const y=elevationAt(map,fire,x,z,centerElevation);
  for(let j=0;j<3;j++)
   accepted.push({x:x+(j-1)*1.2,y:y+b.height*(.65+j*.14),z:z+(j-1)*.6,
    height:clamp(b.height*.22+2.8,3.5,18),energy:1.12});
 }
 for(const [i,tr] of trees.entries()){
  const [x,z]=[(tr.coord[0]-fire.coordinates[0])*111320*Math.cos(fire.coordinates[1]*pi/180),
               (tr.coord[1]-fire.coordinates[1])*111320];
  if(!allowed(tr.coord))continue;
  const y=elevationAt(map,fire,x,z,centerElevation);
  for(let j=0;j<3;j++)accepted.push({x:x+(j-1)*.72,y:y+tr.height*(.15+j*.28),z:z+(j-1)*.5,
   height:clamp(tr.height*.43,3.5,16),energy:1.2});
 }
 const flame=allocateFlames(T,accepted,siteSeed);heatGroup.add(flame.mesh);
 const ground=makeGroundHeatSheet(T,map,fire,perimeters,centerElevation,allowed,siteSeed);
 if(ground)heatGroup.add(ground.mesh);
 const uniforms=[flame.uniforms,...(ground?[ground.uniforms]:[])];
 function dispose(){
  for(const obj of [flame.mesh,ground?.mesh].filter(Boolean)){
   obj.geometry?.dispose?.();obj.material?.dispose?.();
  }
 }
 return {scene,flames:[],uniforms,dispose,fire,quality,groupCount:accepted.length,
  tongueCount:flame.tongueCount,terrainTriangles:ground?.triangleCount||0,
  built:buildings.length,tree:trees.length};
}
