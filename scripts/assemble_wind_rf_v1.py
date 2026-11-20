#!/usr/bin/env python3
"""Assemble ONLY approved Wind+RF JS/assets onto the previously published entire site."""
from __future__ import annotations
import hashlib,json,re,shutil,sys
from datetime import datetime,timezone
from pathlib import Path

def digest(site):
    return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest()
            for p in site.rglob('*') if p.is_file()}

def assemble(site,source,catalog):
    needed={
        'index.html','app/index.html','landing.js','app.js',
        'vendor/three.module.js','bridgepoint-view-v5917.js','bridgepoint-volumetric-fields-v5978.js',
        'bridgepoint-emrf-spectrogram-v1.js','bridgepoint-emrf-starlink-global-v2.js','starlink-orbits-v2.json',
        'bridgepoint-wildfire-realistic-mesh-v4.js','bridgepoint-celestial-sky-v6257.js',
        'bridgepoint-spacecraft-v1.js','bridgepoint-spacecraft-saturn-v1.js',
        'bridgepoint-spacecraft-columbia-v1.js','bridgepoint-spacecraft-discovery-v1.js',
        'bridgepoint-spacecraft-ten-pads-v2.js','app/bridgepoint-spacecraft-ten-pads-v2.js',
        'bridgepoint-spacecraft-museums-v3.js','app/bridgepoint-spacecraft-museums-v3.js',
        'bridgepoint-underground-scan-sites-v1.js','bridgepoint-plane-wrecks-v1.js',
        'bridgepoint-shipwrecks-v1.js'
    }
    before=digest(site)
    if missing:=needed-set(before):
        raise RuntimeError('NO_PUBLISH_BASELINE_MISSING '+str(sorted(missing)))
    current=(site/'bridgepoint-volumetric-fields-v5978.js').read_text(encoding='utf-8')
    view=(site/'bridgepoint-view-v5917.js').read_text(encoding='utf-8')
    candidate=(source/'bridgepoint-volumetric-fields-v5978.js').read_text(encoding='utf-8')
    newview=(source/'bridgepoint-view-v5917.js').read_text(encoding='utf-8')
    if 'DENSE WIND LINES' not in current or 'setRf(mode)' not in current:
        raise RuntimeError('NO_PUBLISH_BASELINE_WIND_FEATURE_MISMATCH')
    if "st.windOn=true;st.rfOn=true;st.rfMode='both';" not in candidate:
        raise RuntimeError('NO_PUBLISH_NO_ONE_TOUCH_WIND')
    if 'v=5992-expanded-field-panel' not in view or 'v=6000-auto-wind-4g-5g-jets' not in newview:
        raise RuntimeError('NO_PUBLISH_WIND_CARD_CACHE_MISMATCH')
    if '__BP_WIND_RF_WARMED_V1__' not in newview:
        raise RuntimeError('NO_PUBLISH_GLOBAL_FORECAST_PREWARM_MISSING')
    doc=json.loads(catalog.read_text(encoding='utf-8'))
    stamp=datetime.fromisoformat(doc['fetched_at'].replace('Z','+00:00'))
    age=(datetime.now(timezone.utc)-stamp).total_seconds()
    if not(0<=age<4*3600 and len(doc['winds'])>=100 and len(doc['sites'])>=60):
        raise RuntimeError('NO_PUBLISH_SOURCE_DATA_STALE_OR_INCOMPLETE')
    if not all(len(row)==7 and 4000<row[6]<17000 for row in doc['winds']):
        raise RuntimeError('NO_PUBLISH_JET_ALTITUDE_MISSING')
    if any((site/n).exists() for n in ('bridgepoint-global-wind-rf-v1.js','wind-rf-global-v1.json')):
        raise RuntimeError('NO_PUBLISH_NEW_FILE_COLLISION')
    changed={'bridgepoint-volumetric-fields-v5978.js','bridgepoint-view-v5917.js','index.html','app/index.html'}
    for name in ('bridgepoint-volumetric-fields-v5978.js','bridgepoint-view-v5917.js'):
        (site/name).write_bytes((source/name).read_bytes())
    if (site/'app/bridgepoint-volumetric-fields-v5978.js').exists():
        (site/'app/bridgepoint-volumetric-fields-v5978.js').write_bytes((source/'bridgepoint-volumetric-fields-v5978.js').read_bytes())
        changed.add('app/bridgepoint-volumetric-fields-v5978.js')
    added={'bridgepoint-global-wind-rf-v1.js','app/bridgepoint-global-wind-rf-v1.js','wind-rf-global-v1.json'}
    for name in ('bridgepoint-global-wind-rf-v1.js','app/bridgepoint-global-wind-rf-v1.js'):
        (site/name).write_bytes((source/'bridgepoint-global-wind-rf-v1.js').read_bytes())
    shutil.copyfile(catalog,site/'wind-rf-global-v1.json')
    for entry in ('index.html','app/index.html'):
        path=site/entry
        html=path.read_text(encoding='utf-8')
        pattern=r'(?<=data-bp-deferred-src=")/bridgepoint-view-v5917\.js(?:\?[^"]*)?(?=")'
        hits=list(re.finditer(pattern,html))
        if len(hits)!=1:raise RuntimeError('NO_PUBLISH_VIEW_CACHE_UNEXPECTED '+entry)
        hit=hits[0]
        if 'windrfjets=v1' in hit.group(0):raise RuntimeError('NO_PUBLISH_DUPLICATE_CACHE_TOKEN')
        replacement=hit.group(0)+('&' if '?' in hit.group(0) else '?')+'windrfjets=v1'
        path.write_text(html[:hit.start()]+replacement+html[hit.end():],encoding='utf-8')
    after=digest(site)
    changed_actual={p for p in before if before[p]!=after.get(p)}
    if changed_actual!=changed or set(after)-set(before)!=added or set(before)-set(after):
        raise RuntimeError('NO_PUBLISH_UNRELATED_PRODUCTION_CHANGE '+json.dumps({
            'changed':sorted(changed_actual),'added':sorted(set(after)-set(before)),
            'deleted':sorted(set(before)-set(after))}))
    assert (site/'bridgepoint-emrf-starlink-global-v2.js').read_bytes()==(site/'app/bridgepoint-emrf-starlink-global-v2.js').read_bytes()
    print('WIND_RF_ONE_PRESS_PRODUCTION_PRESERVED',len(before)-len(changed),
          'unchanged site files, true forecast samples',len(doc['winds']),
          'mapped FCC structures',len(doc['sites']),flush=True)

if __name__=='__main__':
    if len(sys.argv)!=4:raise SystemExit('usage: assemble_wind_rf_v1.py <site> <rebuild-v5000> <wind-catalog>')
    assemble(Path(sys.argv[1]),Path(sys.argv[2]),Path(sys.argv[3]))
