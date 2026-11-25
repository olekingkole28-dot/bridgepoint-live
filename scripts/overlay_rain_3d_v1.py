from pathlib import Path
import sys,hashlib,re,urllib.request,gzip,csv,io,json,datetime
site=Path(sys.argv[1]);module='bridgepoint-rain-3d-v1.js';snapshot='bp-rain-observations-v1.json'
mobile='bridgepoint-bottom-card-mobile-v2.js';categories='bridgepoint-bottom-card-categories-v1.js'
allowed={module,snapshot,'index.html','app/index.html',mobile,'app/'+mobile,categories,'app/'+categories}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
(site/module).write_bytes(Path('rebuild-v5000',module).read_bytes())
observations=[]
try:
 req=urllib.request.Request('https://aviationweather.gov/data/cache/metars.cache.csv.gz',headers={'User-Agent':'BridgePoint Rain observation snapshot'})
 with urllib.request.urlopen(req,timeout=35) as r: data=gzip.decompress(r.read()).decode('utf-8','replace')
 lines=data.splitlines();idx=next(i for i,l in enumerate(lines) if 'raw_text' in l and 'latitude' in l and 'longitude' in l)
 for row in csv.DictReader(lines[idx:]):
  wx=row.get('wx_string','') or ''
  if not re.search(r'\b(?:[+-]?(?:SH|TS|FZ)?(?:RA|DZ)|TS(?:RA)?)\b',wx):continue
  try:lat=float(row['latitude']);lon=float(row['longitude'])
  except (ValueError,KeyError,TypeError):continue
  observations.append({'lat':lat,'lon':lon,'wx_string':wx,'observation_time':row.get('observation_time'),'source':'NOAA Aviation Weather Center METAR'})
except Exception as e:print('Optional NOAA snapshot unavailable',str(e)[:150])
(site/snapshot).write_text(json.dumps({'generated_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'observations':observations},separators=(',',':')))
print('NOAA_RAIN_OBSERVATIONS',len(observations))
for name in (mobile,categories):
 for rel in (name,'app/'+name):
  p=site/rel
  if not p.exists():continue
  s=p.read_text()
  if name==mobile:
   assert "weatherfx:'environment'" in s
   s=s.replace("weatherfx:'environment'","rain:'environment',weatherfx:'environment'",1)
   s=s.replace("environment:/weather fx|","environment:/^rain$|weather fx|",1)
  else:
   assert 'weatherfx|wildfire' in s
   s=s.replace('weatherfx|wildfire','rain|weatherfx|wildfire',1)
  p.write_text(s)
for rel in ('index.html','app/index.html'):
 p=site/rel;s=p.read_text()
 for name in (mobile,categories):
  s=re.sub(r'('+re.escape(name)+r'\?[^"\'\s<>]+)',lambda m:m[1]+'&rain=20261125v1',s)
 assert '</body>' in s
 s=s.replace('</body>','<script defer src="/'+module+'?v=20261125v1"></script>\n</body>',1)
 p.write_text(s)
assert before==snap(),'Unexpected non-Rain file changed'
print('RAIN_ONLY_BYTE_PRESERVATION_PASS',len(before))
