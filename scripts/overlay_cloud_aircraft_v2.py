#!/usr/bin/env python3
"""Restore the known 6501 volumetric cloud engine + rich *visual-only* live
ADS-B aircraft geometry on top of the EXACT already published full site.
Never reconstruct from the repository, touch auth, FAA, ships, wrecks or worlds.
Usage: overlay_cloud_aircraft_v2.py <full-current-pages-site> <source-repo>
"""
from __future__ import annotations
import hashlib,re,sys,json
from pathlib import Path

site,repo=(Path(x) for x in sys.argv[1:3])
def digests(root):
    return {p.relative_to(root).as_posix():hashlib.sha256(p.read_bytes()).hexdigest()
            for p in root.rglob('*') if p.is_file()}
before=digests(site)
protected=[
 'index.html','app/index.html','landing.js','app.js','bridgepoint-view-v5917.js',
 'bridgepoint-drone-awareness-v1.js','world-v2300-clouds.js',
 'app/world-v2300-clouds.js','bridgepoint-faa-obstruction-towers-v1.js',
 'bridgepoint-wildfires-volumetric-v1.js','bridgepoint-emrf-starlink-global-v2.js',
 'bridgepoint-global-wind-rf-v1.js','wind-rf-global-v1.json','vendor/three.module.js'
]
if missing:=set(protected)-before.keys():
    raise SystemExit('CLOUD_AIRCRAFT_CURRENT_SITE_INCOMPLETE '+str(sorted(missing)))

def one(s,old,new,label):
    if s.count(old)!=1:
        raise SystemExit('CLOUD_AIRCRAFT_STRICT_ANCHOR '+label+' '+str(s.count(old)))
    return s.replace(old,new,1)
def between(body,start,end,label):
    a=body.find(start)
    b=body.find(end,a+len(start))
    if a<0 or b<0 or body.find(start,a+1)>=0:
        raise SystemExit('CLOUD_AIRCRAFT_SECTION_MISSING '+label)
    return body[a:b]
def replace_section(old,source,start,end,label):
    original=between(old,start,end,label+' old')
    latest=between(source,start,end,label+' candidate')
    return one(old,original,latest,label)
new_drone=(repo/'rebuild-v5000/bridgepoint-drone-awareness-v1.js').read_text()
p=site/'bridgepoint-drone-awareness-v1.js'
s=p.read_text()
# Insert only source-backed 3D appearance state. Preserve current empty-globe/
# FAA/cloud layer gate, filters, ADS-B fetching, trails, and other user features.
variable="let aircraftModels=new Map(),trackedAircraft=new Map(),lastCurrentAircraftRecords=[],aircraftTrailGroup=null,aircraftTetherGroup=null,aircraftTemplates=new Map(),aircraftPopup=null,aircraftInteractionsMap=null;"
src_var=between(new_drone,variable,'let droneTrailGroup=', 'visual-state')
s=one(s,variable+'\\n',src_var,'aircraft-renderer-variables')
for start,end,label in (
  ('function loadDroneThree(){','function makeDroneModel(THREE){','aircraft-visual-module-loader'),
  ('function ensureAircraftInstancedMesh(','function disposeAircraftTemplates(){','aircraft-instanced-gpu-templates'),
  ('function showAircraftDetails(event){','function bindAircraftInteractions(){','aircraft-popup-with-3d-card'),
  ('function setAircraftModels(records){','function rebuildAircraftTrails(){','aircraft-model-position-rendering'),
  ('function setDroneModels(records){','function rebuildDroneTrails(){','source-drone-lights-hover'),
  ('function animateDroneModels(now){','function distanceMeters(a,b){','aircraft-rotor-animations'),
):
    s=replace_section(s,new_drone,start,end,label)
card=between(new_drone,'function showAircraftModelInBridgePointCard(kind,properties){','function showAircraftDetails(event){','dock-3d-card')
s=one(s,'function showAircraftDetails(event){',card+'function showAircraftDetails(event){','dock-3d-card-insert')
labels=between(new_drone,'function clearAircraftVisualLabels(){','function setAircraftModels(records){','operator-label-renderer')
s=one(s,'function setAircraftModels(records){',labels+'function setAircraftModels(records){','operator-label-insert')
s=one(s,
  " const light=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),lampMat);light.position.set(0,0,.125);rotor.add(light);",
  " const light=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),lampMat);light.name='bp-drone-night-led';light.position.set(0,0,.125);rotor.add(light);",
  'night-navigation-led')
s=one(s,
  'for(const group of [droneTetherGroup,aircraftTetherGroup])',
  'for(const group of [droneTetherGroup,aircraftTetherGroup,aircraftLabelGroup])',
  'dispose-operator-decals')
s=one(s,
  'droneTetherGroup=null;aircraftTetherGroup=null;',
  'droneTetherGroup=null;aircraftTetherGroup=null;aircraftLabelGroup=null;\n'+
  '   aircraftCardPreviewCleanup?.();aircraftCardPreviewCleanup=null;\n'+
  '   aircraftCardRoot?.remove();aircraftCardRoot=null;',
  'dispose-card-when-models-unload')
s=one(s,
  'for(const [kind,entry] of aircraftTemplates)entry.mesh.visible=active&&isAircraftKindVisible(kind);',
  'for(const entry of aircraftTemplates.values())entry.mesh.visible=active&&isAircraftKindVisible(entry.kind);',
  'maintain-aircraft-filters-after-class-subtypes')
s=one(s,
  'function clearTrackedAircraft(){\n trackedAircraft.clear();',
  "function clearTrackedAircraft(){\n aircraftCardPreviewCleanup?.();aircraftCardPreviewCleanup=null;\n"+
  " aircraftCardRoot?.remove();aircraftCardRoot=null;\n clearAircraftVisualLabels();\n trackedAircraft.clear();",
  'clear-card-when-button-off')
# Only the aircraft-owned cleanups; no changes to the global layer sweep.
if 'bp-faa-obstructions-' not in s or "allowedCategories.add('clouds')" not in s:
    raise SystemExit('CLOUDS_OR_FAA_VISIBLE_LAYER_PERMISSION_REGRESSED')
if 'bridgepoint-aircraft-visuals-v2.js?v=2-colored-type-rotors-night' not in s:
    raise SystemExit('AIRCRAFT_VISUALS_SOURCE_NOT_IMPORTED')
p.write_text(s)
print('LIVE_AIRCRAFT_VISUAL_PATCH_ONLY',p.name,len(s))

# The newest v6501 source restores the wispy/billowing raymarch volumes and
# five-minute weather + satellite-cloud refresh. Never resurrect old sky videos.
cloud=(repo/'release-v2300/world-v2300-clouds.js').read_bytes()
if len(cloud)<235000 or b'bpRaymarchCumulusV6500' not in cloud or b'cloudHeightFeedTimer' not in cloud:
    raise SystemExit('LATEST_CLOUD_ENGINE_SOURCE_INVALID')
for rel in ('world-v2300-clouds.js','app/world-v2300-clouds.js'):
    (site/rel).write_bytes(cloud)
print('LIVE_VOLUMETRIC_CLOUDS_V6501_RESTORED',len(cloud),'bytes')

air_visual=(repo/'rebuild-v5000/bridgepoint-aircraft-visuals-v2.js').read_bytes()
if len(air_visual)<15000 or b'buildDetailedAirframe' not in air_visual or b'mountAircraftCardPreview' not in air_visual:
    raise SystemExit('DETAILED_AIRCRAFT_GEOMETRY_MISSING')
for rel in ('bridgepoint-aircraft-visuals-v2.js','app/bridgepoint-aircraft-visuals-v2.js'):
    if (site/rel).exists():raise SystemExit('AIRCRAFT_NEW_VISUAL_FILE_ALREADY_EXISTS '+rel)
    (site/rel).parent.mkdir(parents=True,exist_ok=True)
    (site/rel).write_bytes(air_visual)

# Surgical cloud import migration: retain every other landing/app behavior.
old_cloud='world-v2300-clouds.js?v=6202-global-satellite-cloud-banks'
new_cloud='world-v2300-clouds.js?v=6400-fortnite-atmosphere&vol=6510&motion=6341&weatherrev=20261120a&cloudfix=6510&restore=20261121-automatic-volumes'
for rel in ('landing.js','app.js','bridgepoint-view-v5917.js'):
    p=site/rel;s=p.read_text()
    n=s.count(old_cloud)
    if n<1:raise SystemExit('CLOUD_IMPORT_URL_MISSING '+rel)
    s=s.replace(old_cloud,new_cloud)
    if rel=='bridgepoint-view-v5917.js':
        # Suppress the removed cloud command even if the old dock dynamic
        # markup repaints after sign-in; all clouds stay automatic on.
        marker="const panelOpenButtons=ui.actions.querySelectorAll('[data-bpv-action]');"
        s=one(s,marker,
          "ui.actions.querySelectorAll('[data-bpv-action=\"clouds\"]').forEach(b=>b.remove());\n "+
          marker,'remove-obsolete-cloud-command')
    p.write_text(s)
    print('LIVE_CLOUD_AUTO_IMPORTS_UPDATED',rel,n)

# Both the welcome and signed-in page hide obsolete cloud controls *before*
# scripts load, and cache-bust only the two modified feature script families.
for rel in ('index.html','app/index.html'):
    p=site/rel;s=p.read_text()
    if 'bp-clouds-always-on-v6330' in s:raise SystemExit('CLOUD_HIDE_ALREADY_RESTORED '+rel)
    s=one(s,'<meta charset="utf-8">',
      '<meta charset="utf-8"><style id="bp-clouds-always-on-v6330">'+
      '[data-bpv-action="clouds"],.bpv-command-btn[data-bpv-action="clouds"]{display:none!important}</style>',
      'hide-obsolete-cloud-button '+rel)
    for name,cache in (('bridgepoint-view-v5917.js','cloudair=v2-raymarch-and-models'),
       ('bridgepoint-drone-awareness-v1.js','airmodels=v2-colored-spinning-night')):
        regex=re.compile(r'(data-bp-deferred-src=")(/'+re.escape(name)+r'\?[^"]+)(")')
        found=list(regex.finditer(s))
        if len(found)!=1:raise SystemExit('CLOUD_AIR_SCRIPT_URL_COUNT '+rel+' '+name+' '+str(len(found)))
        m=found[0]
        if cache in m.group(2):raise SystemExit('DUPLICATE_CACHE_LABEL '+rel+' '+name)
        s=s[:m.start(2)]+m.group(2)+'&'+cache+s[m.end(2):]
    # The current entrypoint may lazy-load landing/app using any of three
    # source syntaxes. Only modify the two matching existing imports.
    script_name='landing.js' if rel=='index.html' else 'app.js'
    regex=re.compile(r'((?:src|data-bp-deferred-src)=")([^"]*'+re.escape(script_name)+r'\?[^"]+)(")')
    found=list(regex.finditer(s))
    for m in reversed(found):
        if '&cloudrestore=v6501' in m.group(2):continue
        s=s[:m.start(2)]+m.group(2)+'&cloudrestore=v6501'+s[m.end(2):]
    p.write_text(s)
    print('LIVE_CLOUD_AND_AIR_UI_CACHE_REFERENCES',rel,'main-script-matches',len(found))

after=digests(site)
removed=set(before)-set(after)
added=set(after)-set(before)
changed={name for name,d in before.items() if d!=after.get(name)}
expected_added={'bridgepoint-aircraft-visuals-v2.js','app/bridgepoint-aircraft-visuals-v2.js'}
expected_changed={'index.html','app/index.html','landing.js','app.js',
 'bridgepoint-view-v5917.js','bridgepoint-drone-awareness-v1.js',
 'world-v2300-clouds.js','app/world-v2300-clouds.js'}
if removed or added!=expected_added or changed!=expected_changed:
    raise SystemExit('CLOUD_AIRCRAFT_STRICT_NO_REGRESSION_GUARD '+json.dumps({
      'removed':sorted(removed),'added':sorted(added),'changed':sorted(changed),
      'expected_changes':sorted(expected_changed)}))
for protected_name in protected:
    if protected_name not in expected_changed and before[protected_name]!=after[protected_name]:
        raise SystemExit('UNRELATED_ASSET_CHANGED '+protected_name)
print('CLOUD_AIRCRAFT_ONLY_NO_REGRESSION_PASS',
      len(before),'preserved originals',len(changed),'scoped updates',len(added),'air visual files added')
