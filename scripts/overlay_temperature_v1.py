from pathlib import Path
import sys,hashlib,re,subprocess
site=Path(sys.argv[1]);module='bridgepoint-temperature-v1.js';grid='bp-temperature-grid-v1.json';admin='bp-temperature-admin2-v1.json'
mobile='bridgepoint-bottom-card-mobile-v2.js';categories='bridgepoint-bottom-card-categories-v1.js'
allowed={module,grid,admin,'index.html','app/index.html',mobile,'app/'+mobile,categories,'app/'+categories}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
(site/module).write_bytes(Path('rebuild-v5000',module).read_bytes())
subprocess.run([sys.executable,'scripts/build_temperature_grid_v1.py',str(site/grid)],check=True)
subprocess.run([sys.executable,'scripts/build_temperature_admin2_v1.py',str(site/admin)],check=True)
for name in (mobile,categories):
 for rel in (name,'app/'+name):
  p=site/rel
  if not p.exists():continue
  s=p.read_text()
  if name==mobile:
   assert "weatherfx:'environment'" in s
   s=s.replace("weatherfx:'environment'","temperature:'environment',weatherfx:'environment'",1)
   s=s.replace("environment:/","environment:/^temperature$|",1)
  else:
   assert 'weatherfx|wildfire' in s
   s=s.replace('weatherfx|wildfire','temperature|weatherfx|wildfire',1)
  p.write_text(s)
for rel in ('index.html','app/index.html'):
 p=site/rel;s=p.read_text()
 for name in (mobile,categories):
  s=re.sub(r'('+re.escape(name)+r'\?[^"\x27\s<>]+)',lambda m:m[1]+'&temperature=20261125v1',s)
 assert '</body>' in s and module not in s
 s=s.replace('</body>','<script defer src="/'+module+'?v=20261125v1"></script>\n</body>',1)
 p.write_text(s)
assert before==snap(),'Unrelated production file changed'
print('TEMPERATURE_ONLY_BYTE_PRESERVATION_PASS',len(before))
