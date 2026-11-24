from pathlib import Path
import hashlib,re,sys
site=Path(sys.argv[1])
def digest(p):
    with p.open("rb") as f:return hashlib.file_digest(f,"sha256").hexdigest()
def snapshot():return {p.relative_to(site).as_posix():digest(p) for p in site.rglob("*") if p.is_file()}
before=snapshot()
old=Path("scripts/power_outage_electricity_v6.inc.js").read_text()
new=Path("scripts/power_outage_electricity_v7.inc.js").read_text()
targets=set()
name="bridgepoint-power-outages-v1.js"
for rel in (name,"app/"+name):
    p=site/rel
    if not p.is_file():continue
    s=p.read_text(encoding="utf-8")
    assert s.count(old)==1,(rel,"V6 electricity block not found")
    result=s.replace(old,new,1)
    assert result.replace(new,old,1)==s
    p.write_text(result,encoding="utf-8");targets.add(rel)
assert name in targets
for rel in ("index.html","app/index.html"):
    p=site/rel;s=p.read_text(encoding="utf-8")
    result,n=re.subn(r'(bridgepoint-power-outages-v1\.js\?v=6529-power-outages-electric-v5-traveling-arcs-v6)',r'\g<1>-shader-repair-v7',s)
    assert n>=1,(rel,n)
    p.write_text(result,encoding="utf-8");targets.add(rel)
after=snapshot()
assert before.keys()==after.keys()
assert {p for p in before if before[p]!=after[p]}==targets
print("POWER_OUTAGE_ELECTRICITY_ONLY_SCOPE_PASS",sorted(targets),len(before)-len(targets),"unchanged files")
