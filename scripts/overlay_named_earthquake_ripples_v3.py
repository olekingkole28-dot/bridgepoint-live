from pathlib import Path
import hashlib, re, sys
site=Path(sys.argv[1])
targets={"world-v2300-seismic-layer-v1.js","app/world-v2300-seismic-layer-v1.js","landing.js","app.js","index.html","app/index.html"}
def hashes():
    return {p.relative_to(site).as_posix():hashlib.file_digest(p.open("rb"),"sha256").hexdigest() for p in site.rglob("*") if p.is_file()}
before=hashes()
assert targets <= before.keys()
def once(s,a,b):
    assert s.count(a)==1, ("Expected exactly one match",a[:100],s.count(a))
    return s.replace(a,b,1)
def patch(s):
    s=once(s,"const RIPPLE_LAYER_ID = 'bp-usgs-seismic-ripple-lines-v1';","const RIPPLE_LAYER_ID = 'bp-usgs-seismic-ripple-lines-v1';\nconst RIPPLE_CREST_LAYER_ID = 'bp-usgs-seismic-ripple-crests-v3';")
    s=once(s,"const RIPPLE_FRAME_INTERVAL_MS = 40;","const RIPPLE_FRAME_INTERVAL_MS = 100;")
    start=s.index("function buildRippleFrame(")
    end=s.index("async function fetchShakeMapBoundary",start)
    s=s[:start]+'''// Raised wave bands are illustrative, not a measurement of vertical ground motion.
function crestGeometry(inner, outer) {
  if (inner.length !== outer.length || inner.length < 3) return null;
  const closed = distanceKm(outer[0], outer.at(-1)) < 0.001;
  // A single annular polygon is efficient away from the antimeridian.
  if (closed && Math.max(...outer.map(p=>p[0]))-Math.min(...outer.map(p=>p[0])) < 180 &&
      Math.max(...inner.map(p=>p[0]))-Math.min(...inner.map(p=>p[0])) < 180) {
    const signed = r => r.slice(1).reduce((a,p,i)=>a+r[i][0]*p[1]-p[0]*r[i][1],0);
    const o = signed(outer)>0 ? outer : outer.slice().reverse();
    const i = signed(inner)<0 ? inner : inner.slice().reverse();
    return {type:'Polygon',coordinates:[o,i]};
  }
  // Split open contours and dateline crossings into bounded ribbon sections.
  const polygons=[];
  for(let i=0;i<outer.length-1;i+=8){
    const j=Math.min(i+8,outer.length-1);
    const g=polygonGeometryFromRing([...outer.slice(i,j+1),...inner.slice(i,j+1).reverse()]);
    if(g?.type==='Polygon')polygons.push(g.coordinates);
    else if(g?.type==='MultiPolygon')polygons.push(...g.coordinates);
  }
  return polygons.length ? {type:'MultiPolygon',coordinates:polygons} : null;
}

function buildRippleFrame(geojson, now, shakemapCache = null) {
  const features=[];
  for(const event of (geojson?.features || [])){
    const [lon,lat]=event.geometry.coordinates, p=event.properties || {};
    const mag=finiteNumber(p.mag) ?? 2.5, origin=[lon,lat];
    const radius=finiteNumber(p.bp_impact_radius_km) ?? estimateEarthquakeImpactRadiusKm(mag,p.bp_depth_km);
    const cached=shakemapCache?.get(String(event.id));
    const actual=Array.isArray(cached?.lines)&&cached.lines.length ? cached.lines.map(l=>sampleLine(l,32)) : null;
    const segments=mag>=6?48:24;
    const waveLines=t=>{
      if(actual)return actual.map(l=>l.map(point=>interpolateGreatCircle(origin,point,t)));
      const r=circleLine(lon,lat,radius*t,segments);
      return [[...r,r[0]]];
    };
    const base=((now+stablePhase(event.id))%3400)/3400;
    for(let wave=0;wave<3;wave++){
      const phase=(base+wave/3)%1;
      // All wave vertices stay on or inside their own boundary path.
      const outer=waveLines(Math.max(0.001,phase));
      const inner=waveLines(Math.max(0.0005,phase-0.055));
      const opacity=0.55+0.45*Math.sin(Math.PI*phase);
      const height_m=Math.min(18000,Math.max(120,radius*1000*0.018))*Math.max(0.12,Math.sin(Math.PI*phase));
      const geometry=linesGeometry(outer);
      if(geometry)features.push({type:'Feature',id:String(event.id)+'-ripple-'+wave,geometry,properties:{mag,opacity}});
      for(let j=0;j<outer.length;j++){
        const crest=crestGeometry(inner[j],outer[j]);
        if(crest)features.push({type:'Feature',id:String(event.id)+'-crest-'+wave+'-'+j,geometry:crest,properties:{mag,height_m}});
      }
    }
    const pulse=(base+0.22)%1;
    features.push({type:'Feature',id:String(event.id)+'-pulse',geometry:{type:'Point',coordinates:origin},properties:{mag,scale:0.78+pulse*1.6,opacity:0.24+Math.sin(Math.PI*pulse)*0.46}});
  }
  return {type:'FeatureCollection',features};
}

'''+s[end:]
    start=s.index("  const color = [",s.index("function mapLayerSpecs()"))
    end=s.index("  return {",start)
    s=s[:start]+"""  // Magnitude classes, not measured local shaking intensity.
  const color = ['step', ['get','mag'], '#25e553', 4.5, '#ffe32b', 6, '#ff3030', 7.5, '#800020'];
"""+s[end:]
    s=once(s,"['case', ['get', 'estimated'], '#ffad59', color]","color")
    s=once(s,"['case', ['get', 'estimated'], '#ffc06a', color]","color")
    s=once(s,"2.5, 1.15, 5.5, 2, 8, 3.1","2.5, 2, 5.5, 3, 8, 4")
    s=once(s,"id: RIPPLE_LAYER_ID, type: 'line', source: RIPPLE_SOURCE_ID,","id: RIPPLE_LAYER_ID, type: 'line', source: RIPPLE_SOURCE_ID,\n      filter: ['==', '$type', 'LineString'],")
    s=once(s,"2.5, 1.25, 5.5, 2.3, 8, 3.6","2.5, 2, 5.5, 3, 8, 4")
    s=once(s,"'line-blur': 1.2","'line-blur': 0.25")
    s=once(s,"    pulse: {","""    crests: {
      id: RIPPLE_CREST_LAYER_ID, type: 'fill-extrusion', source: RIPPLE_SOURCE_ID,
      filter: ['==', '$type', 'Polygon'],
      paint: {
        'fill-extrusion-color': color,
        'fill-extrusion-height': ['get','height_m'],
        'fill-extrusion-base': 0,
        'fill-extrusion-opacity': 0.72,
        'fill-extrusion-vertical-gradient': false
      }
    },
    pulse: {""")
    s=once(s,"'circle-stroke-color': '#07131d'","'circle-stroke-color': color")
    s=once(s,"2.5, 2.7, 4.5, 4.6, 6.5, 7.2, 8.5, 10","2.5, 4, 4.5, 5.5, 6.5, 8, 8.5, 11")
    s=once(s,"version: 2,","version: 3,")
    s=once(s,"RIPPLE_LAYER_ID, PULSE_LAYER_ID, GLOW_LAYER_ID, POINT_LAYER_ID]","RIPPLE_LAYER_ID, RIPPLE_CREST_LAYER_ID, PULSE_LAYER_ID, GLOW_LAYER_ID, POINT_LAYER_ID]")
    s=once(s,"    if (!map.getLayer?.(PULSE_LAYER_ID)) map.addLayer(specs.pulse);","""    if (!map.getLayer?.(RIPPLE_CREST_LAYER_ID)) {
      // Retain visible surface wavefronts if a legacy renderer rejects extrusion.
      try { map.addLayer(specs.crests); } catch (_) {}
    }
    if (!map.getLayer?.(PULSE_LAYER_ID)) map.addLayer(specs.pulse);""")
    return s
for rel in ("world-v2300-seismic-layer-v1.js","app/world-v2300-seismic-layer-v1.js"):
    p=site/rel
    live=p.read_text(encoding="utf-8")
    if "const RIPPLE_LAYER_ID = 'bp-usgs-seismic-ripple-lines-v1';" not in live:
        assert "source-reported epicenter points only" in live and "export function initUSGSSeismicLayer(world)" in live, ("Unexpected deployed seismic module", rel)
        live=Path("release-v2300/world-v2300-seismic-layer-v1.js").read_text(encoding="utf-8")
        print("Restoring repository V2 impact boundary functions into points-only production module",rel)
    p.write_text(patch(live),encoding="utf-8")
for rel in ("landing.js","app.js"):
    p=site/rel
    s=p.read_text(encoding="utf-8")
    s,n=re.subn(r'(world-v2300-seismic-layer-v1\.js\?v=)[^\'"\s]+',r'\g<1>3-raised-wavefronts-20261124',s)
    assert n>0,(rel,n)
    p.write_text(s,encoding="utf-8")
for rel,entry in (("index.html","landing.js"),("app/index.html","app.js")):
    p=site/rel
    s=p.read_text(encoding="utf-8")
    s,n=re.subn(r'('+re.escape(entry)+r'\?v=[^&"\'\s]+)',r'\g<1>-named-earthquake-raised-wavefronts-v3',s)
    assert n>0,(rel,n)
    p.write_text(s,encoding="utf-8")
after=hashes()
assert before.keys()==after.keys(),"file inventory changed"
assert {p for p in before if before[p]!=after[p]}==targets,"unexpected file changes"
print("SEISMIC_ONLY_SCOPE_PASS",len(before)-len(targets),"untouched files")
