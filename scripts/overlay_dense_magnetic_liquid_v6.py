from pathlib import Path
import sys,re,hashlib
site=Path(sys.argv[1]);key='dense-magnetic-liquid-v20261124-v6'
water='world-v2300-water.js'
allowed={'index.html','app/index.html','landing.js','app.js',water,'app/'+water}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
def read(n):return (site/n).read_text(encoding='utf-8')
def write(n,s):(site/n).write_text(s,encoding='utf-8')
def one(s,a,b):
 if s.count(a)!=1:raise SystemExit('PATCH_ANCHOR '+str(s.count(a))+' '+a[:120])
 return s.replace(a,b,1)
s=read(water)
s=one(s,'const SURFACE_RENDER_REVISION = 6261;','const SURFACE_RENDER_REVISION = 6262;')
# Port the actual Earth Shield plasma shell's 3D noise and advected ribbon/filament
# field. The ocean uses the same volumetric field sampled on its own displaced
# sea-level mesh, not the Earth Shield geometry or a screen-space texture.
s=one(s,"    'out highp vec4 fragColor;',","""    'float waterMagHash(vec3 p){p=mod(p,256.0);return fract(sin(dot(p,vec3(12.9898,78.233,37.719)))*43758.5453);}',
    'float waterMagNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(mix(waterMagHash(i),waterMagHash(i+vec3(1,0,0)),f.x),mix(waterMagHash(i+vec3(0,1,0)),waterMagHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(waterMagHash(i+vec3(0,0,1)),waterMagHash(i+vec3(1,0,1)),f.x),mix(waterMagHash(i+vec3(0,1,1)),waterMagHash(i+vec3(1,1,1)),f.x),f.y),f.z);}',
    'float waterMagRidge(float p,float power){float aa=max(fwidth(p),0.001);float core=pow(clamp(0.5+0.5*sin(p),0.0,1.0),power);return mix(core,0.20, smoothstep(1.3,5.5,aa));}',
    'out highp vec4 fragColor;',""")
a=s.index("    '    float scale=clamp(20.0*exp2(u_oceanZoom*0.83)")
b=s.index("    '    return;',",a)
s=s[:a]+"""    // The magnetosphere's rapidly moving 3D plasma turbulence, recolored as water.
    // More than one scale is visible even on the whole globe. Local-coordinate
    // evaluation avoids large-world precision collapse in the close/pitched view.
    '    float zoomScale=clamp(104.0*exp2(u_oceanZoom-0.6),104.0,32000000.0);',
    '    vec2 p=v_coord*zoomScale+mod(u_waveOrigin*zoomScale,256.0);',
    '    float t=u_time*(0.82+min(u_windSpeed*0.008,0.42));',
    '    vec3 local=vec3(p.x*0.82,p.y*0.91,0.64*v_wave+0.38*sin(p.x*0.29+p.y*0.31));',
    '    vec3 flow=vec3(local.x*0.39+t*0.41,local.y*0.69-t*0.65,local.z*0.72+t*0.53);',
    '    float n=waterMagNoise(flow)+0.5*waterMagNoise(flow*2.6+vec3(1.7,2.4,3.2));',
    '    float rphase=local.y*2.5+local.z*1.6-local.x*0.4+n*7.0-t*3.9;',
    '    float fphase=local.x*3.3-local.y+n*9.0+t*4.2;',
    '    float ribbon=waterMagRidge(rphase,6.0);',
    '    float filament=waterMagRidge(fphase,9.0);',
    '    float billow=smoothstep(0.26,1.12,n);',
    '    float crestField=0.5+0.5*sin(local.x*1.58+local.y*1.18+n*5.8-t*2.45);',
    '    float finePhase=local.x*6.7-local.y*4.2+n*13.0-t*5.6;',
    '    float finer=waterMagRidge(finePhase,11.0);',
    '    float secondary=waterMagRidge(local.y*5.1+local.x*2.7-n*10.0+t*4.8,8.0);',
    '    float detailWeight=mix(0.68,1.0,smoothstep(3.0,14.0,u_oceanZoom));',
    '    float flare=clamp(max(ribbon,filament)*0.84+secondary*0.43+finer*0.31*detailWeight,0.0,1.0);',
    '    float motion=clamp(billow*0.67+crestField*0.24+flare*0.43+v_wave*0.11,0.0,1.0);',
    // Lit, rounded billows and denser, softer shadowed troughs. Keep the shade
    // blue and turquoise; no violet/green plasma color is imported.
    '    float heightField=n*0.75+crestField*0.31+flare*0.18+v_wave*0.22;',
    '    vec3 liquidNormal=normalize(vec3(-dFdx(heightField)*3.8,-dFdy(heightField)*3.8,1.0));',
    '    float rollingLight=clamp(0.50+0.56*dot(liquidNormal,normalize(vec3(-0.45,0.5,0.75))),0.14,1.0);',
    '    vec3 color=mix(vec3(0.008,0.063,0.17),vec3(0.065,0.50,0.75),motion);',
    '    color=mix(color,vec3(0.12,0.70,0.88),flare*0.62);',
    '    color*=0.68+rollingLight*0.43;',
    '    float shore=clamp(-v_flood,0.0,1.0);',
    '    float breaker=smoothstep(0.73,0.95,0.47*v_wave+0.53*crestField+0.14*flare);',
    '    float whitecap=breaker*clamp(0.36+v_storm*0.40+u_windSpeed/65.0+shore*0.65,0.0,1.0);',
    '    float swash=sin(rphase-t*2.25+n*1.6-shore*5.4);',
    '    float shoreWash=shore*smoothstep(0.28,0.78,0.50+0.50*swash);',
    '    float foamMask=clamp(whitecap*0.92+shoreWash*0.87+pow(flare,4.0)*0.18+foam*0.10,0.0,1.0);',
    '    color=mix(color,vec3(0.91,0.98,1.0),foamMask);',
    '    color*=mix(0.73,1.0,directSun);',
    '    float alpha=mix(mix(0.62,0.78,1.0-smoothstep(3.0,12.0,u_oceanZoom))+flare*0.10+foamMask*0.10,0.045+foamMask*0.12,u_underwater);',
    '    fragColor=vec4(color,clamp(alpha,0.05,0.96));',
"""+s[b:]
# Retain conservative geometric wave limits, increase moving crest detail rather
# than changing any shoreline, terrain, dive or other renderer behavior.
s=one(s,"rollingWave=wave+0.31*sin(gerstnerPhaseC)+0.36*pow(max(0.0,sin(phaseA)),5.0)+shoaling*0.28*sin(phaseA*1.8-0.8);","rollingWave=wave+0.40*sin(gerstnerPhaseC)+0.48*pow(max(0.0,sin(phaseA)),5.0)+shoaling*0.28*sin(phaseA*1.8-0.8);")
# Publish a meaningful renderer diagnostic; existing API/GL state stays intact.
s=one(s,"api.lastDrawAt = Date.now();","api.lastDrawAt = Date.now();\n        api.denseMagneticShader='earth-shield-3d-noise-blue-liquid';")
# Extract the actual production fragment source for offline GLSL compilation.
frag=s[s.index('const fragmentSource = ['):];frag=frag[:frag.index("].join(")]
import ast
glsl=[]
for line in frag.splitlines()[1:]:
 line=line.strip()
 if line.startswith("'"):
  glsl.append(ast.literal_eval(line[:-1] if line.endswith(',') else line))
(Path(sys.argv[2])).write_text('\n'.join(glsl)+'\n',encoding='utf-8')
for rel in (water,'app/'+water):write(rel,s)
# Refresh only water module imports and the two entry cache keys, preserving all
# other import URLs and their versions.
for rel in ('landing.js','app.js'):
 old=read(rel);new,n=re.subn(re.escape(water)+r'\?v=[^\s\x22\x27)]+',water+'?v='+key,old)
 if n<1:raise SystemExit('missing water import '+rel)
 write(rel,new)
for rel,stem in [('index.html','landing.js'),('app/index.html','app.js')]:
 old=read(rel);new,n=re.subn(r'('+re.escape(stem)+r'\?v=)[^&\s\x22\x27]+',lambda m:m.group(1)+key,old,count=1)
 if n!=1:raise SystemExit('missing entry cache key '+rel)
 write(rel,new)
if snap()!=before:raise SystemExit('UNRELATED PRODUCTION FILE CHANGED')
assert (site/water).read_bytes()==(site/'app'/water).read_bytes()
print('DENSE_MAGNETIC_LIQUID_SCOPE_PASS',len(before),'unchanged production files')
