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
snippet=Path("scripts/power_outage_electricity_v5.inc.js").read_text()
def patch(s):
    s=one(s," function ensureMapLayers(){",snippet+"\n function ensureMapLayers(){")
    s,n=re.subn(r"const VERSION='[^']+';", "const VERSION='6529-power-outages-electric-v5';",s,count=1)
    assert n==1
    # Preserve the outage feed, severity metadata, and point-only report semantics.
    s=one(s,"paint:{'fill-color':['match',['get','severity'],'major','#ff4055','moderate','#ffb63e','#ffe269'],","paint:{'fill-color':'#fff02a',")
    s=one(s,"'fill-opacity':['interpolate',['linear'],['zoom'],0,0.035,3,0.06,8,0.08,12,0.055]","'fill-opacity':['interpolate',['linear'],['zoom'],0,0.24,3,0.32,8,0.30,12,0.23]")
    s=one(s,"paint:{'line-color':['match',['get','severity'],'major','#ff4055','moderate','#ffb63e','#ffe269'],","paint:{'line-color':'#ffe600',")
    s=one(s,"map.addImage(item[0],iconCanvas(item[1]),{pixelRatio:2})","map.addImage(item[0],iconCanvas(item[1]).getContext('2d').getImageData(0,0,64,64),{pixelRatio:2})")
    # Attach on initial enable and reinstall when MapLibre recreates its style.
    s=one(s,"  return true;\n }\n function setPointer()", "  ensureElectricity();\n  return true;\n }\n function setPointer()")
    s=one(s,"  map=getMap();","  const previousMap=map;\n  map=getMap();\n  if(previousMap!==map){previousMap?.off?.('style.load',restoreOutageStyle);previousMap?.off?.('idle',retryElectricity);if(map){map.on('style.load',restoreOutageStyle);map.on('idle',retryElectricity);}}")
    s=one(s," async function loadMap(){",""" function retryElectricity(){if(enabled)ensureElectricity()}
 function restoreOutageStyle(){
  if(!enabled||!ensureMapLayers())return;
  if(lastData){
   try{map.getSource(IDS.countiesSource)?.setData(lastData.counties);map.getSource(IDS.countyMarkersSource)?.setData(lastData.countyPoints);map.getSource(IDS.pointsSource)?.setData(lastData.globalPoints)}catch(_){}
  }else if(seedData)applySeedSnapshot();
  ensureElectricity();
 }
 async function loadMap(){""")
    s=one(s,"   lastRefresh=Date.now();","   ensureElectricity();map?.triggerRepaint?.();\n   lastRefresh=Date.now();")
    s=one(s,"  if(!enabled){\n   clearTimeout(mapWaitTimer);","  if(!enabled){\n   stopElectricity();\n   clearTimeout(mapWaitTimer);")
    # Add only a note in the existing outage detail card to distinguish simulation.
    s=one(s,"The highlighted outline is the county-level area supplied with the report; it is not a home-by-home outage map.","The highlighted outline is the county-level area supplied with the report; it is not a home-by-home outage map. Animated electricity is illustrative, not observed electrical arcing.")
    return s
targets=set()
name="bridgepoint-power-outages-v1.js"
for rel in (name,"app/"+name):
    p=site/rel
    if not p.is_file():continue
    s=p.read_text(encoding="utf-8");p.write_text(patch(s),encoding="utf-8");targets.add(rel)
assert name in targets
for rel in ("index.html","app/index.html"):
    p=site/rel;s=p.read_text(encoding="utf-8")
    new,n=re.subn(r'(bridgepoint-power-outages-v1\.js)(?:\?[^\'"\s]+)?',r'\g<1>?v=6529-power-outages-electric-v5',s)
    assert n>=1,(rel,n)
    p.write_text(new,encoding="utf-8");targets.add(rel)
after=snapshot()
assert before.keys()==after.keys()
assert {p for p in before if before[p]!=after[p]}==targets
print("POWER_OUTAGES_ONLY_SCOPE_PASS",sorted(targets),len(before)-len(targets),"unchanged files")
