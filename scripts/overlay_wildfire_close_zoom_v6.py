from pathlib import Path
import hashlib,re,sys
site=Path(sys.argv[1])
def digest(p):
    with p.open("rb") as f:return hashlib.file_digest(f,"sha256").hexdigest()
def snapshot():return {p.relative_to(site).as_posix():digest(p) for p in site.rglob("*") if p.is_file()}
before=snapshot()
def one(s,a,b):
    assert s.count(a)==1,(a[:140],s.count(a))
    return s.replace(a,b,1)
def controller(s):
    assert "5-terrain-smoke-ash-20261124" in s and "terrainAnchorElevation" in s
    a=s.index("function sourceFeature(")
    s=s[:a]+"""// Use footprint/viewport intersection rather than requiring the epicenter to
// remain on-screen. Smoke and ash also occupy airspace beyond the fire edge.
function wildfireViewport(state){
 const map=state.map,b=map.getBounds?.(),c=map.getCenter?.();
 if(!b)return null;
 let w=Number(b.getWest?.()),e=Number(b.getEast?.()),s=Number(b.getSouth?.()),n=Number(b.getNorth?.());
 if(![w,e,s,n].every(Number.isFinite))return null;
 if(e<w)e+=360;
 const ref=(w+e)*.5;
 // Tilted street-level cameras can look over the ground footprint. Include
 // the camera center when the projection's screen bounds omit it.
 const lon=Number(c?.lng),lat=Number(c?.lat);
 if(Number.isFinite(lon)&&Number.isFinite(lat)){
  const x=ref+(((lon-ref+180)%360+360)%360-180);
  w=Math.min(w,x);e=Math.max(e,x);s=Math.min(s,lat);n=Math.max(n,lat);
 }
 return {w,e,s,n,ref:(w+e)*.5};
}
function wildfireFootprintVisible(state,fire,viewport=wildfireViewport(state),includeAtmosphere=false){
 if(!viewport)return boundsContains(state.map.getBounds?.(),fire.coordinates);
 const {w,e,s,n,ref}=viewport;
 const [lon,lat]=fire.coordinates;
 const radius=Math.max(0,Number(fire.radiusM)||0);
 const extent=radius+(includeAtmosphere?Math.max(180,radius*.55):0);
 const dy=extent/110574,dx=extent/(111320*Math.max(.06,Math.cos(lat*Math.PI/180)));
 const wrap=x=>ref+(((x-ref+180)%360+360)%360-180);
 const x=wrap(lon);
 if(lat+dy>=s&&lat-dy<=n&&(e-w>=360||[x-360,x,x+360].some(q=>q+dx>=w&&q-dx<=e)))return true;
 // A mapped perimeter may extend beyond its detection circle. Cache each
 // ring's bounds so close zoom does not walk every polygon vertex per frame.
 const mapped=state.perimeters?.get(fire.id);
 if(!mapped?.length)return false;
 const cache=state.footprintBounds||(state.footprintBounds=new WeakMap());
 let boxes=cache.get(mapped);
 if(!boxes){
  boxes=[];
  for(const f of mapped){
   const g=f.geometry,polys=g?.type==='Polygon'?[g.coordinates]:g?.type==='MultiPolygon'?g.coordinates:[];
   for(const rings of polys){
    const ring=rings?.[0];if(!ring?.length)continue;
    const anchor=ring[0][0];let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;
    for(const p of ring){
     const q=anchor+(((p[0]-anchor+180)%360+360)%360-180);
     minX=Math.min(minX,q);maxX=Math.max(maxX,q);minY=Math.min(minY,p[1]);maxY=Math.max(maxY,p[1]);
    }
    boxes.push([minX,maxX,minY,maxY]);
   }
  }
  cache.set(mapped,boxes);
 }
 return boxes.some(([a,b,c,d])=>{
  if(d+dy<s||c-dy>n)return false;
  const mid=(a+b)*.5,half=(b-a)*.5+dx,q=wrap(mid);
  return e-w>=360||[q-360,q,q+360].some(t=>t+half>=w&&t-half<=e);
 });
}
"""+s[a:]
    s=one(s,"const fires=state.fires.filter(f=>boundsContains(bounds,f.coordinates))\n   .sort((a,b)=>b.frp-a.frp).slice(0,zoom>=6.5?5000:5000);","const viewport=wildfireViewport(state);\n  const fires=state.fires.filter(f=>wildfireFootprintVisible(state,f,viewport))\n   .sort((a,b)=>b.frp-a.frp).slice(0,5000);")
    s=one(s,"return state.fires.filter(f=>boundsContains(bounds,f.coordinates))\n  .sort((a,b)=>distMeters(a.coordinates,ref)-distMeters(b.coordinates,ref))\n  .slice(0,zoom<15?3:7);","const viewport=wildfireViewport(state);\n return state.fires.filter(f=>wildfireFootprintVisible(state,f,viewport,true))\n  .sort((a,b)=>Math.max(0,distMeters(a.coordinates,ref)-a.radiusM)-Math.max(0,distMeters(b.coordinates,ref)-b.radiusM)||distMeters(a.coordinates,ref)-distMeters(b.coordinates,ref))\n  .slice(0,zoom<15?3:zoom<18?7:12);")
    s=one(s,"if(now-state.lastFrame<30){map.triggerRepaint?.();return;}state.lastFrame=now;","// Never skip drawing on a MapLibre frame: it clears the shared canvas.\n   state.lastFrame=now;")
    # Retain effects during quality and elevation refinements until replacement is ready.
    a=s.index("    if(effect&&effect.quality!==quality)")
    b=s.index("    const height=effect.terrainAnchorElevation;",a)
    s=s[:a]+"""    const perimeterRef=state.perimeters.get(site.id);
    let sampled=null;try{const v=map.queryTerrainElevation?.(site.coordinates,{exaggerated:true});if(Number.isFinite(v))sampled=v;}catch(_){}
    const stamp=Math.floor(zoom*2);
    const moving=map.isMoving?.()===true;
    const stale=effect&&(effect.quality!==quality||effect.perimeterRef!==perimeterRef||
       (sampled!==null&&Math.abs(sampled-effect.terrainAnchorElevation)>1.5)||
       (now-effect.terrainSampledAt>3500&&map.areTilesLoaded?.()===true&&!effect.settledTerrain));
    // Keep the old scene visible throughout continuous zoom and only swap in
    // a valid replacement. No disposal gap or zoom-stamp-driven rebuild.
    if(!effect||(stale&&!moving&&now-effect.terrainSampledAt>450)){
     try{
      const next=makeSceneForFire(T,state,site,quality);
      next.perimeterRef=perimeterRef;next.terrainStamp=stamp;next.terrainSampledAt=now;
      next.settledTerrain=map.areTilesLoaded?.()===true;
      const previous=effect;state.effects.set(site.id,next);effect=next;previous?.dispose?.();
     }catch(e){
      if(!effect){if(!state.renderWarned){state.renderWarned=true;console.warn('3D wildfire scene',e);}continue;}
      effect.terrainSampledAt=now;
     }
    }
"""+s[b:]
    # Keep boundaries installed even while camera moves; update on moveend as
    # before, but include all approximate polygons in one stable GeoJSON source.
    s=one(s,"const fires=state.fires.filter(f=>wildfireFootprintVisible(state,f,viewport))","const fires=state.fires")
    # Prevent stale map style max zoom/collision hooks from suppressing the fire.
    s=one(s,"const addLayer=(layer,before)=>{if(!map.getLayer?.(layer.id))map.addLayer(layer,before);};","const addLayer=(layer,before)=>{if(!map.getLayer?.(layer.id))map.addLayer(layer,before);};")
    return s
targets=set()
name="bridgepoint-wildfires-volumetric-v1.js"
for rel in (name,"app/"+name):
    p=site/rel
    if not p.is_file():continue
    s=p.read_text(encoding="utf-8");p.write_text(controller(s),encoding="utf-8");targets.add(rel)
assert name in targets
for rel in ("landing.js","app.js","bridgepoint-view-v5917.js","app/bridgepoint-view-v5917.js"):
    p=site/rel
    if not p.is_file():continue
    s=p.read_text(encoding="utf-8")
    new,n=re.subn(r'(bridgepoint-wildfires-volumetric-v1\.js\?v=5-terrain-smoke-ash-20261124)',r'\g<1>-closezoom-v6',s)
    if n and new!=s:p.write_text(new,encoding="utf-8");targets.add(rel)
assert len(targets)>1,"No wildfire import cache key updated"
for rel in ("landing.js","app.js"):
    p=site/rel;s=p.read_text(encoding="utf-8")
    new,n=re.subn(r'(bridgepoint-view-v5917\.js\?v=[^\'"\s]+)',r'\g<1>-wildfire-closezoom-v6',s)
    if n and new!=s:p.write_text(new,encoding="utf-8");targets.add(rel)
for rel,entry in (("index.html","landing.js"),("app/index.html","app.js")):
    p=site/rel;s=p.read_text(encoding="utf-8")
    new,n=re.subn(r'('+re.escape(entry)+r'\?v=[^&"\'\s]+)',r'\g<1>-wildfire-closezoom-v6',s)
    assert n>0,(rel,n)
    p.write_text(new,encoding="utf-8");targets.add(rel)
after=snapshot()
assert before.keys()==after.keys()
assert {p for p in before if before[p]!=after[p]}==targets
assert all(before[p]==after[p] for p in before if "wildfire-realistic-mesh" in p)
print("WILDFIRE_CLOSE_ZOOM_ONLY_SCOPE_PASS",sorted(targets),len(before)-len(targets),"unchanged files")
