#!/usr/bin/env python3
"""Publish only validated Manhattan registration; retire inaccurate preview on failed fit."""
from pathlib import Path
import sys,json,hashlib,re
site=Path(sys.argv[1]);reg=json.loads(Path(sys.argv[2]).read_text());uid='city-photogrammetry:372bc495b3a941308f4a3198bc45e17b'
allowed={'index.html','app/index.html','data/bp-auto-reality-v1.json','bridgepoint-public-scan-catalog-v1.json','bridgepoint-auto-reality-v1.js','bridgepoint-public-scans-v1.js','assets/manhattan-photogrammetry-v1/registration.json'}
def hashes():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=hashes()
p=site/'data/bp-auto-reality-v1.json';d=json.loads(p.read_text());row=next(x for x in d['items'] if x['id']==uid)
row.pop('replacementFootprint',None)
if reg['accepted']:
 row.update(coordinates=reg['coordinates'],headingDeg=reg['headingDeg'],sourceScaleM=reg['scaleMetresPerSourceUnit'],groundSourceY=reg['groundSourceY'],registrationAccepted=True,replacementFootprint=reg['footprint'])
 row['precision']='Shoreline and independent tower-height alignment; approximate, not survey-grade. Covered legacy features replaced only while mesh renders.'
else:
 row.pop('asset',None);row.pop('mobileAsset',None);row['registrationAccepted']=False;row['coordinates']=[-74.011,40.705];row['precision']='Site reference only. Incorrect experimental placement removed; full original mesh remains in the public 3D scan catalog.'
d['nativeCount']=sum(bool(x.get('asset')) for x in d['items']);d['viewerOnlyCount']=len(d['items'])-d['nativeCount'];p.write_text(json.dumps(d,separators=(',',':')))
p=site/'bridgepoint-public-scan-catalog-v1.json';c=json.loads(p.read_text());i=next(x for x in c['items'] if x['id']==uid);i['coordinates']=row['coordinates'];i['precision']=row['precision'];p.write_text(json.dumps(c,separators=(',',':')))
(site/'assets/manhattan-photogrammetry-v1/registration.json').write_text(json.dumps(reg,indent=2))
p=site/'bridgepoint-auto-reality-v1.js';s=p.read_text();assert 'bp-auto-reality-v1.json?v=20261125manhattanglobe2' in s;p.write_text(s.replace('bp-auto-reality-v1.json?v=20261125manhattanglobe2','bp-auto-reality-v1.json?v=20261125manhattancoast3'))
p=site/'bridgepoint-public-scans-v1.js';s=p.read_text();assert '1.1.2-manhattan-performance' in s;p.write_text(s.replace('1.1.2-manhattan-performance','1.1.3-manhattan-coast'))
for rel in ('index.html','app/index.html'):
 p=site/rel;s=p.read_text();s=s.replace('bridgepoint-auto-reality-v1.js?v=20261125manhattanglobe2','bridgepoint-auto-reality-v1.js?v=20261125manhattancoast3').replace('bridgepoint-public-scans-v1.js?v=20261125manhattanperf1','bridgepoint-public-scans-v1.js?v=20261125manhattancoast3');p.write_text(s)
assert hashes()==before
print('MANHATTAN_COAST_V3_ONLY_PASS',len(before),'GLOBE_PLACEMENT',reg['accepted'])
