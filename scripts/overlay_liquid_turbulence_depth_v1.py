from pathlib import Path
import re, hashlib, sys
site=Path(sys.argv[1])
key='liquid-turbulence-depth-v20261123-v1'
watername='world-v2300-water.js'
sensorname='world-v2300-sensor-layers.js'
allowed={'index.html','app/index.html','landing.js','app.js',watername,sensorname,'app/'+watername,'app/'+sensorname}
def snapshot():
    return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snapshot()
def once(s,a,b):
    if s.count(a)!=1: raise SystemExit('Patch anchor not unique: '+a[:120]+' count='+str(s.count(a)))
    return s.replace(a,b,1)
def water(s):
    s=once(s,'const SURFACE_RENDER_REVISION = 6256;','const SURFACE_RENDER_REVISION = 6257;')
    s=once(s,"    'out highp vec4 fragColor;',","""    'uniform vec2 u_waveOrigin;',
    'uniform float u_underwater;',
    'float liquidHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}',
    'float liquidNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(liquidHash(i),liquidHash(i+vec2(1,0)),f.x),mix(liquidHash(i+vec2(0,1)),liquidHash(i+vec2(1,1)),f.x),f.y);}',
    'out highp vec4 fragColor;',""")
    s=once(s,"    '  if (v_kind < 0.5) {',","""    '  if (v_kind < 0.5 || (v_kind > 2.5 && v_kind < 3.5)) {',""")
    start=s.index("    '    float shimmer = glint * 0.82")
    end=s.index("    '    return;',",start)
    s=s[:start]+"""    // Liquid turbulence: advected noise and intersecting curved ribbons from the
    // magnetosphere visual approach, with water-specific optical shading.
    '    vec2 p=(v_coord+u_waveOrigin)*clamp(u_flowCycles*0.55,12.0,2400.0);',
    '    float t=u_time*0.32;',
    '    vec2 q=p+vec2(liquidNoise(p*0.71+vec2(t*0.32,-t*0.27)),liquidNoise(p*0.83+vec2(-t*0.21,t*0.35)))*1.7;',
    '    float n=liquidNoise(q+vec2(t*0.24,-t*0.12))*0.68+liquidNoise(q*2.6-vec2(t*0.17,t*0.21))*0.32;',
    '    float rphase=q.x*3.1+q.y*2.2+n*6.2-t*1.8;',
    '    float fphase=q.y*4.3-q.x*1.6+n*7.4+t*1.3;',
    '    float rfade=1.0-smoothstep(0.8,3.0,max(fwidth(rphase),fwidth(fphase)));',
    '    float ribbon=pow(max(0.0,0.5+0.5*sin(rphase)),7.0)*rfade;',
    '    float filament=pow(max(0.0,0.5+0.5*sin(fphase)),11.0)*rfade;',
    '    float billow=smoothstep(0.19,0.79,n);',
    '    float motion=clamp(billow*0.64+max(ribbon,filament)*0.30+v_wave*0.14+globalSwell*0.15+microWave*0.10,0.0,1.0);',
    '    vec3 color=mix(vec3(0.008,0.065,0.145),vec3(0.025,0.35,0.54),motion);',
    '    float foamMask=clamp(max(ribbon,filament)*0.22+foam*0.38+highlight*0.55+glint*0.08,0.0,0.85);',
    '    color=mix(color,vec3(0.60,0.90,0.98),foamMask);',
    '    color*=mix(0.22,1.0,directSun);',
    '    float alpha=mix(0.76+motion*0.14+foamMask*0.07,0.12+foamMask*0.16,u_underwater);',
    '    fragColor=vec4(color,clamp(alpha,0.10,0.97));',
"""+s[end:]
    s=once(s,"'u_flowPhaseDetail', 'u_sunDirScreen', 'u_sunElevation'];","'u_flowPhaseDetail', 'u_sunDirScreen', 'u_sunElevation', 'u_underwater'];")
    s=once(s,"        gl.enable(gl.BLEND);","        if (u.u_underwater) gl.uniform1f(u.u_underwater, window.__BP_UNDERWATER_DIVE_ACTIVE__ === true ? 1 : 0);\n        gl.enable(gl.BLEND);")
    return s
def sensor(s):
    s,n=re.subn(r"DEM='https://[^']+/bridgepoint-gebco-terrain-v5936'","DEM='https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'",s,count=1)
    if n!=1: raise SystemExit('missing old bathymetry source')
    s=once(s,"map.getSource(D)&&map.getSource(BS)&&map.getLayer(B)","map.getSource(D)&&map.getLayer(B)") if s.count("map.getSource(D)&&map.getSource(BS)&&map.getLayer(B)")==1 else s.replace("map.getSource(D)&&map.getSource(BS)&&map.getLayer(B)","map.getSource(D)&&map.getLayer(B)")
    a=s.index(' function addDepth(){')
    b=s.index(' function removeDepth(){',a)
    s=s[:a]+""" function addDepth(){
  if(!state.surface||dead||!map.isStyleLoaded?.())return false;
  addSrc(D,{type:'raster-dem',tiles:[DEM],tileSize:256,minzoom:0,maxzoom:13,encoding:'terrarium',attribution:'Mapzen / Tilezen open terrain; ETOPO1 ocean bathymetry; NOAA'});
  if(!map.getLayer(B)){
   const beforeId=before(['gta-coast-shadow','gta-context-buildings','gta-city-buildings','gta-water-label','gta-place-label']);
   const l={id:B,type:'hillshade',source:D,layout:{visibility:state.diving?'visible':'none'},paint:{'hillshade-exaggeration':.62,'hillshade-shadow-color':'#071c30','hillshade-highlight-color':'#a0c3c8','hillshade-accent-color':'#183c4e'}};
   if(beforeId)map.addLayer(l,beforeId);else map.addLayer(l);
  }
  const visibility=state.diving?'visible':'none';
  if(map.getLayoutProperty(B,'visibility')!==visibility)map.setLayoutProperty(B,'visibility',visibility);
  try{window.__BP_TERRAIN_SOURCE_OVERRIDE__=D;const terrain=map.getTerrain?.();if(terrain?.source!==D||Number(terrain.exaggeration)!==1)map.setTerrain({source:D,exaggeration:1})}catch(e){console.warn('BridgePoint open bathymetry activation',e)}
  return true
 }
"""+s[b:]
    s=once(s,'const clearance=Math.min(35,Math.max(2,Math.abs(bed)*.08)),targetAltitude=Math.min(-3,Math.max(-95,bed+clearance));','const clearance=Math.min(120,Math.max(2,Math.abs(bed)*.08)),targetAltitude=Math.min(-3,bed+clearance);')
    s=once(s,'source:\'GEBCO\',bedMeters:bed','source:\'Mapzen/ETOPO1\',bedMeters:bed')
    s=s.replace('GEBCO','open ETOPO1 bathymetry')
    # Avoid turning always-on water into a global building/land styling mode.
    s=once(s,'onZoom=()=>{if(state.surface)surfaceOpacity(true)}','onZoom=()=>{}')
    # Re-evaluate the seabed on dive entry and hide relief at the surface again.
    s=once(s,'if(!state.surface){state.surface=true;sync()}','if(!state.surface){state.surface=true;sync()}\\n    if(map.isStyleLoaded?.())addDepth();'.replace('\\n','\n'))
    s=once(s,"stopDiveEffects();sync();\n   try{map.stop?.();","stopDiveEffects();sync();\n   if(map.getLayer(B))map.setLayoutProperty(B,'visibility','none');\n   try{map.stop?.();")
    return s
for name,patch in [(watername,water),(sensorname,sensor)]:
    root=site/name
    result=patch(root.read_text(encoding='utf-8'))
    for rel in (name,'app/'+name):
        path=site/rel
        if not path.is_file(): raise SystemExit('missing production module '+rel)
        path.write_text(result,encoding='utf-8')
for rel in ('landing.js','app.js'):
    path=site/rel;s=path.read_text(encoding='utf-8')
    for name in (watername,sensorname):
        s,n=re.subn(re.escape(name)+r'(?:\?v=[^\s\x22\x27)]+)?',name+'?v='+key,s)
        if name==watername and n<1: raise SystemExit('missing water import '+rel)
    path.write_text(s,encoding='utf-8')
# Other feature controllers also import the sensor module; avoid stale module
# instances by refreshing imports in the main loaders where they exist.
for rel,stem in [('index.html','landing.js'),('app/index.html','app.js')]:
    path=site/rel;s=path.read_text(encoding='utf-8')
    s,n=re.subn(r'('+re.escape(stem)+r'\?v=)[^&\s\x22\x27]+',lambda m:m.group(1)+key,s,count=1)
    if n!=1: raise SystemExit('missing entry cache key '+rel)
    path.write_text(s,encoding='utf-8')
if snapshot()!=before: raise SystemExit('unrelated production assets changed')
for name in (watername,sensorname):
    assert (site/name).read_bytes()==(site/'app'/name).read_bytes()
print('LIQUID_TURBULENCE_DEPTH_SCOPE_PASS',len(before),'unrelated files preserved')
