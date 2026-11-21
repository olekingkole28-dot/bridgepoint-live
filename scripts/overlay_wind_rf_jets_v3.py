#!/usr/bin/env python3
"""Surgical restore of Wind+RF/Jets on the current complete BridgePoint site.
Never rebuild from repository: preserve each non-wind file byte-for-byte.
Usage: overlay_wind_rf_jets_v3.py <existing-pages-site> <repo-rebuild-v5000> <verified-wind-rf.json>
"""
from __future__ import annotations
from pathlib import Path
import hashlib,json,re,sys,datetime
site,source,snapshot=(Path(p) for p in sys.argv[1:4])

def sha(root):
    return {p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob("*") if p.is_file()}
before=sha(site)
required={'index.html','app/index.html','landing.js','app.js',
  'bridgepoint-view-v5917.js','bridgepoint-volumetric-fields-v5978.js',
  'app/bridgepoint-volumetric-fields-v5978.js',
  'app/bridgepoint-global-wind-rf-v1.js',
  'bridgepoint-drone-awareness-v1.js','bridgepoint-faa-obstruction-towers-v1.js',
  'bridgepoint-emrf-starlink-global-v2.js','bridgepoint-wildfires-volumetric-v1.js',
  'vendor/three.module.js'}
if missing:=required-before.keys():raise SystemExit('PRESERVED_WIND_SITE_INCOMPLETE '+repr(sorted(missing)))
added_expected={'bridgepoint-global-wind-rf-v1.js','wind-rf-global-v1.json'}
if any((site/p).exists() for p in added_expected):
    raise SystemExit('WIND_RF_SOURCE_ALREADY_EXISTS: do not overwrite a concurrent restoration')

def one(s,old,new,what):
    n=s.count(old)
    if n!=1:raise SystemExit('WIND_ONLY_ANCHOR_COUNT '+what+' '+str(n))
    return s.replace(old,new,1)

def local(s):
    s=one(s,"      st.windOn=true;st.rfOn=true;st.rfMode='both';\n      window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('wind',true);",
      "      st.windOn=true;st.rfOn=true;st.rfMode='both';\n      st.globalOverview?.setWind?.(true);st.globalOverview?.setRf?.(true,'both');\n      window.__BP_DRONE_AWARENESS_V1__?.allowLayerCategory?.('wind',true);","local-enable")
    new=(source/'bridgepoint-volumetric-fields-v5978.js').read_text()
    start=new.index('  function enableAll()')
    end=new.index('  function close()',start)
    block=new[start:end]
    assert 'disableAll()' in block and 'st.globalOverview?.disable?.()' in block
    s=one(s,'  }function close(){','  }\n'+block+'  function close(){','local-off-method')
    s=one(s,' const api={version:VERSION,map,open,close,refresh,setWind,setRf,get state(){',
      ' const api={version:VERSION,map,open,close,enableAll,disableAll,refresh,setWind,setRf,get state(){','local-public-api')
    s=one(s,"'./bridgepoint-global-wind-rf-v1.js?v=1-wind-jet-streams-all-on'",
      "'./bridgepoint-global-wind-rf-v1.js?v=3-persistent-3d-jets-rf-wind'",'local-global-import')
    return s

for rel in ('bridgepoint-volumetric-fields-v5978.js','app/bridgepoint-volumetric-fields-v5978.js'):
    p=site/rel;p.write_text(local(p.read_text()))

view=site/'bridgepoint-view-v5917.js'
s=view.read_text()
new=(source/'bridgepoint-view-v5917.js').read_text()
start=new.index('async function toggleUnifiedWindRfJets(button){')
end=new.index('async function toggleWindAndDroneField(){',start)
block=new[start:end]
assert 'disableAll' in block and 'enableAll' in block
s=one(s,'async function toggleWindAndDroneField(){',block+'async function toggleWindAndDroneField(){','insert-button-toggle')
s=one(s,
  'data-bpv-action="volumetric" title="Instant animated 3D wind, jet-stream danger markers and 4G/5G radio coverage"',
  'data-bpv-action="volumetric" aria-pressed="false" title="Toggle persistent global animated 3D wind, jet stream icons and model cards, and source-anchored 4G/5G RF coverage"',
  'button-markup')
old="if(a==='volumetric'){setDockMaximized(true);void openVolumetricFields().catch(e=>{console.warn('BridgePoint volumetric fields unavailable',e);showActionNotice('Wind / RF Fields could not open: '+String(e?.message||e))});return}"
start_new=new.index("  if(a==='volumetric'){",new.index("async function toggleUnifiedWindRfJets(button){"))
end_new=new.index("  if(a==='emrf'){",start_new)
replacement=new[start_new:end_new].rstrip()
s=one(s,old,replacement,'button-handler')
old_import='v=6000-auto-wind-4g-5g-jets'
if s.count(old_import)!=2:raise SystemExit('WIND_LOCAL_IMPORT_COUNT '+str(s.count(old_import)))
s=s.replace(old_import,'v=6001-persistent-global-wind-jet-rf')
view.write_text(s)

for rel in ('index.html','app/index.html'):
    p=site/rel
    s=p.read_text()
    pattern=re.compile(r'(data-bp-deferred-src=")(/bridgepoint-view-v5917\.js\?[^"]+)(")')
    found=list(pattern.finditer(s))
    if len(found)!=1:raise SystemExit('WIND_BUTTON_VIEW_ENTRYPOINT_AMBIGUOUS '+rel)
    hit=found[0]
    url=hit.group(2)
    if 'windrfjets=' in url:raise SystemExit('WIND_CACHE_ALREADY_PRESENT '+rel)
    s=s[:hit.start(2)]+url+'&windrfjets=v3-current-3d-source'+s[hit.end(2):]
    p.write_text(s)
    print('WIND_VIEW_CACHE_REFRESH_ONLY',rel)

global_source=(source/'bridgepoint-global-wind-rf-v1.js').read_bytes()
for rel in ('bridgepoint-global-wind-rf-v1.js','app/bridgepoint-global-wind-rf-v1.js'):
    (site/rel).write_bytes(global_source)

data=json.loads(snapshot.read_text())
assert data['version']==1 and len(data['winds'])>=100 and len(data['sites'])>=60
now=datetime.datetime.now(datetime.timezone.utc)
fetched=datetime.datetime.fromisoformat(data['fetched_at'].replace('Z','+00:00'))
if fetched.tzinfo is None:fetched=fetched.replace(tzinfo=datetime.timezone.utc)
age=(now-fetched).total_seconds()
assert -600<=age<2*86400, 'Forecast sample is stale or from the future'
assert sum(float(row[4])>=85 for row in data['winds'])>=12
assert all(len(row)==7 and all(isinstance(v,(int,float)) for v in row) for row in data['winds'])
assert all(len(row)>=3 for row in data['sites'])
(site/'wind-rf-global-v1.json').write_bytes(snapshot.read_bytes())
after=sha(site)
changed={p for p in before if before[p]!=after.get(p)}
added=set(after)-set(before)
removed=set(before)-set(after)
expected_changed={'bridgepoint-volumetric-fields-v5978.js','app/bridgepoint-volumetric-fields-v5978.js',
  'bridgepoint-view-v5917.js','app/bridgepoint-global-wind-rf-v1.js','index.html','app/index.html'}
if changed!=expected_changed or added!=added_expected or removed:
    raise SystemExit('WIND_RF_JETS_NO_REGRESSION_FAILED '+json.dumps({
      'changed':sorted(changed),'expected':sorted(expected_changed),
      'added':sorted(added),'removed':sorted(removed)}))
assert (site/'bridgepoint-global-wind-rf-v1.js').read_bytes()==(site/'app/bridgepoint-global-wind-rf-v1.js').read_bytes()
assert (site/'bridgepoint-volumetric-fields-v5978.js').read_bytes()==(site/'app/bridgepoint-volumetric-fields-v5978.js').read_bytes()
print('WIND_RF_JETS_ONLY_PRESERVATION_PASS',len(before),'original files',len(changed),'wind-only modifications',len(added),'restored files',
      len(data['winds']),'real global forecast samples',len(data['sites']),'real FCC source structures')
