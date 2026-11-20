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
