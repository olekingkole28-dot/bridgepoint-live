from pathlib import Path
import hashlib,re,sys
site=Path(sys.argv[1])
names=["bridgepoint-wildfire-realistic-mesh-v4.js","bridgepoint-wildfires-volumetric-v1.js"]
def digest(p):
    with p.open("rb") as f:return hashlib.file_digest(f,"sha256").hexdigest()
def snapshot():
    return {p.relative_to(site).as_posix():digest(p) for p in site.rglob("*") if p.is_file()}
before=snapshot()
def one(s,a,b):
    assert s.count(a)==1,(a[:120],s.count(a))
    return s.replace(a,b,1)
def mesh(s):
    s=one(s,"const lat=origin[1]+z/111320;","const lat=origin[1]-z/111320;")
    s=s.replace("(coords[1]-fire.coordinates[1])*111320","(fire.coordinates[1]-coords[1])*111320")
    s=s.replace("(b.coord[1]-fire.coordinates[1])*111320","(fire.coordinates[1]-b.coord[1])*111320")
    s=s.replace("(tr.coord[1]-fire.coordinates[1])*111320","(fire.coordinates[1]-tr.coord[1])*111320")
    s=s.replace("{exaggerated:false}","{exaggerated:true}")
    s=one(s,"const radius=clamp(fire.radiusM||180,90,850),samples=26;","const radius=fire.radiusM||180,samples=32;")
    s=one(s,"const radius=clamp(fire.radiusM||180,90,850);","const radius=fire.radiusM||180;")
    s=one(s,"const radial=9,rings=10;","const radial=10,rings=12;")
    s=one(s,"const positions=[],uvs=[],seeds=[],strengths=[],inds=[];","const positions=[],uvs=[],seeds=[],strengths=[],inds=[],heights=[];")
    s=one(s,"seeds.push(phase);strengths.push(intensity);","seeds.push(phase);strengths.push(intensity);heights.push(height);")
    s=one(s,"g.setAttribute('aStrength',new T.Float32BufferAttribute(strengths,1));","g.setAttribute('aStrength',new T.Float32BufferAttribute(strengths,1));\n g.setAttribute('aHeight',new T.Float32BufferAttribute(heights,1));")
    s=one(s,"attribute float aStrength;',","attribute float aStrength; attribute float aHeight;',")
    s=one(s,"p.x+=uWind.x*whip*sway*1.95+curl*sway*.60;","p.x+=(uWind.x*whip+curl*.28)*sway*aHeight*.24;")
    s=one(s,"p.z+=uWind.y*whip*sway*1.95+sin(t*2.4+h*12.0+phase)*sway*.63;","p.z+=(uWind.y*whip+sin(t*2.4+h*12.0+phase)*.30)*sway*aHeight*.24;")
    s=one(s,"p.y+=sin(t*6.2+phase+h*12.3)*h*.27;","p.y+=sin(t*6.2+phase+h*12.3)*h*aHeight*.13;")
    s=one(s,"float core=smoothstep(.93,.07,h);","float core=1.0-smoothstep(.07,.93,h);")
    s=one(s,"float alpha=clamp((.58+.22*turbulence+crackle*.26)*tip*(.7+.30*core),.02,.94);","float ragged=smoothstep(.12,.58,turbulence+core*.35); float alpha=clamp((.46+.36*turbulence+crackle*.26)*tip*(.6+.40*core)*ragged,0.0,.94);")
    s=one(s,"const n=clamp(Math.floor((quality>=2?130:quality>=1?94:49)+Math.sqrt(fire.count||1)*2.1),38,quality>=2?170:quality>=1?124:65);","const n=quality>=2?280:quality>=1?200:112;")
    a=s.index(" const patchCenters=[]")
    b=s.index(" for(const [i,b]",a)
    s=s[:a]+""" // Uniform area sampling with a golden-angle sequence, not central clusters.
 const accepted=[],baseHeight=clamp(8+Math.log2(1+Math.max(0,fire.frp||0))*1.4,8,25);
 const spacing=radius*Math.sqrt(pi/n);
 for(let i=0;i<n;i++){
  const theta=i*2.399963229728653+siteSeed,dist=radius*.98*Math.sqrt((i+.5)/n);
  const x=Math.cos(theta)*dist,z=Math.sin(theta)*dist,coord=lonLatAt(fire.coordinates,x,z);
  if(!allowed(coord))continue;
  const height=Math.max(baseHeight,Math.min(quality===0?80:46,spacing*.32))*(.62+hash(siteSeed+i*5.49)*.88);
  accepted.push({x,y:elevationAt(map,fire,x,z,centerElevation)+.7,z,height,energy:.75+hash(siteSeed+i*.74)*.75});
 }
"""+s[b:]
    s=one(s," const flame=allocateFlames(T,accepted,siteSeed);heatGroup.add(flame.mesh);"," const flame=allocateFlames(T,accepted,siteSeed);heatGroup.add(flame.mesh);\n const atmosphere=wildfireAtmosphereV5(T,accepted,siteSeed,quality);heatGroup.add(atmosphere.smoke,atmosphere.embers,atmosphere.ash);")
    s=one(s,"const uniforms=[flame.uniforms,...(ground?[ground.uniforms]:[])];","const uniforms=[flame.uniforms,atmosphere.uniforms,...(ground?[ground.uniforms]:[])];")
    s=one(s,"[flame.mesh,ground?.mesh].filter(Boolean)","[flame.mesh,ground?.mesh,atmosphere.smoke,atmosphere.embers,atmosphere.ash].filter(Boolean)")
    s=one(s,"tongueCount:flame.tongueCount,terrainTriangles:","terrainAnchorElevation:centerElevation,particleCount:atmosphere.count,tongueCount:flame.tongueCount,terrainTriangles:")
    s += """
// GPU-animated, terrain-origin smoke puffs, glowing embers and drifting ash.
// Visual reconstruction, not measured smoke concentration or fire spread.
export function wildfireAtmosphereV5(T,groups,seed,quality){
 const uniforms={uTime:{value:0},uPixelRatio:{value:Math.min(2,globalThis.devicePixelRatio||1)}};
 function particles(kind,per){
  const p=[],meta=[];
  for(let i=0;i<groups.length;i++)for(let j=0;j<per;j++){
   const g=groups[i],r=hash(seed+i*31+j*71+kind*83);
   p.push(g.x,g.y+g.height*.30,g.z);
   meta.push(r,hash(seed+i*19+j*23),g.height,hash(seed+j*47+i*13));
  }
  const geo=new T.BufferGeometry();
  geo.setAttribute('position',new T.Float32BufferAttribute(p,3));
  geo.setAttribute('aParticle',new T.Float32BufferAttribute(meta,4));
  const mat=new T.ShaderMaterial({uniforms:{...uniforms,uKind:{value:kind}},
   transparent:true,depthWrite:false,depthTest:true,
   blending:kind===1?T.AdditiveBlending:T.NormalBlending,
   vertexShader:\`
    attribute vec4 aParticle; uniform float uTime,uPixelRatio,uKind;
    varying float vLife,vSeed; varying float vKind;
    void main(){
     float r=aParticle.x,h=aParticle.z;
     float life=fract(r+uTime/(uKind<.5?7.5:3.5+aParticle.y*4.));
     vec3 p=position;
     float drift=h*(uKind<.5?3.5:2.0)*life;
     p.x+=drift*(.7+.25*sin(life*9.+r*30.));
     p.z+=drift*(.35+.22*cos(life*7.+r*35.));
     p.y+=h*(uKind<.5?8.:3.5)*life;
     p.x+=sin(r*70.+life*14.)*h*life*.5;
     p.z+=cos(r*51.+life*13.)*h*life*.5;
     gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
     float size=uKind<.5?(12.+life*35.):(uKind<1.5?3.1:2.0);
     gl_PointSize=clamp(size*uPixelRatio*(.65+aParticle.w*.55),1.,64.);
     vLife=life;vSeed=r;vKind=uKind;
    }\`,
   fragmentShader:\`
    varying float vLife,vSeed,vKind;
    void main(){
     vec2 p=gl_PointCoord*2.-1.;float r=length(p);
     float fade=smoothstep(0.,.08,vLife)*(1.-smoothstep(.65,1.,vLife));
     float edge=1.-smoothstep(.15,1.,r);
     float noise=sin(p.x*7.+vSeed*45.)*sin(p.y*8.-vSeed*27.)*.14;
     vec3 col=vKind<.5?mix(vec3(.15,.13,.12),vec3(.52,.49,.46),vLife):
       vKind<1.5?mix(vec3(1.,.88,.32),vec3(1.,.20,.02),vLife):vec3(.61,.57,.51);
     float a=vKind<.5?max(0.,edge+noise)*fade*.23:edge*fade*.85;
     if(r>1.)discard;gl_FragColor=vec4(col,a);
    }\`});
  const obj=new T.Points(geo,mat);obj.frustumCulled=false;return obj;
 }
 const smoke=particles(0,quality>=1?4:2),embers=particles(1,quality>=1?8:4),ash=particles(2,quality>=1?6:3);
 return {smoke,embers,ash,uniforms,count:smoke.geometry.attributes.position.count+embers.geometry.attributes.position.count+ash.geometry.attributes.position.count};
}
"""
    return s
def controller(s):
    s=one(s,"?v=4-rolling-heat-turbulence&restore=20261120-emrf-fire","?v=5-terrain-smoke-ash-20261124")
    s=s.replace("{exaggerated:false}","{exaggerated:true}")
    # MapLibre model frame: x east, y up, z south. Fallback also uses south.
    s=one(s,"if(zoom<12.5)return [];","if(zoom<10.5)return [];")
    s=one(s,"if(zoom>=6.5){","if(zoom>=0){")
    s=one(s,".sort((a,b)=>b.frp-a.frp).slice(0,240);",".sort((a,b)=>b.frp-a.frp).slice(0,zoom>=6.5?5000:5000);")
    s=one(s,"const sites=visible3DFires(state);if(!sites.length)return;","const sites=visible3DFires(state);if(!sites.length){for(const e of state.effects.values())e.dispose?.();state.effects.clear();return;}")
    s=one(s,"if(!effect){effect=makeSceneForFire(T,state,site,quality);state.effects.set(site.id,effect);}","""const perimeterRef=state.perimeters.get(site.id);
    let sampled=null;try{const v=map.queryTerrainElevation?.(site.coordinates,{exaggerated:true});if(Number.isFinite(v))sampled=v;}catch(_){}
    // Rebuild after DEM refinement, a newly arrived perimeter, or a zoom change.
    const stamp=Math.floor(zoom*2);
    if(effect&&(effect.perimeterRef!==perimeterRef||effect.terrainStamp!==stamp||
       (sampled!==null&&Math.abs(sampled-effect.terrainAnchorElevation)>1.5)||
       (now-effect.terrainSampledAt>3500&&map.areTilesLoaded?.()===true&&!effect.settledTerrain))){
      effect.dispose?.();state.effects.delete(site.id);effect=null;
    }
    if(!effect){effect=makeSceneForFire(T,state,site,quality);effect.perimeterRef=perimeterRef;effect.terrainStamp=stamp;
      effect.terrainSampledAt=now;effect.settledTerrain=map.areTilesLoaded?.()===true;state.effects.set(site.id,effect);}""")
    s=one(s,"let height=0;\n    try{const sample=map.queryTerrainElevation?.(site.coordinates,{exaggerated:true});if(Number.isFinite(sample))height=sample;}catch(_){}","const height=effect.terrainAnchorElevation;")
    return s
targets=set()
for name,fn in zip(names,[mesh,controller]):
    for rel in (name,"app/"+name):
        p=site/rel
        if not p.is_file():continue
        original=p.read_text(encoding="utf-8")
        p.write_text(fn(original),encoding="utf-8");targets.add(rel)
    assert name in targets
# Preserve every existing entrypoint cache key, changing only wildfire imports.
for rel in ("landing.js","app.js","bridgepoint-view-v5917.js","app/bridgepoint-view-v5917.js"):
    p=site/rel
    if not p.is_file():continue
    s=p.read_text(encoding="utf-8")
    new,n=re.subn(r'(bridgepoint-wildfires-volumetric-v1\.js)(?:\?[^\'"\s]+)?',r'\g<1>?v=5-terrain-smoke-ash-20261124',s)
    if n and new!=s:p.write_text(new,encoding="utf-8");targets.add(rel)
for rel,entry in (("index.html","landing.js"),("app/index.html","app.js")):
    p=site/rel;s=p.read_text(encoding="utf-8")
    new,n=re.subn(r'('+re.escape(entry)+r'\?v=[^&"\'\s]+)',r'\g<1>-wildfire-terrain-v5',s)
    assert n>0,(rel,n)
    p.write_text(new,encoding="utf-8");targets.add(rel)
# If view module owns wildfire import, cache-bust it in both entry scripts.
for rel in ("landing.js","app.js"):
    p=site/rel;s=p.read_text(encoding="utf-8")
    new,n=re.subn(r'(bridgepoint-view-v5917\.js\?v=[^\'"\s]+)',r'\g<1>-wildfire-terrain-v5',s)
    if n and new!=s:p.write_text(new,encoding="utf-8");targets.add(rel)
after=snapshot()
assert before.keys()==after.keys()
assert {p for p in before if before[p]!=after[p]}==targets,(targets,{p for p in before if before[p]!=after[p]})
print("WILDFIRE_ONLY_SCOPE_PASS",sorted(targets),len(before)-len(targets),"unchanged files")
