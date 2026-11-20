#!/usr/bin/env python3
"""Patch the exact last verified complete BridgePoint website ONLY for auth tunnel.
The caller provides an extracted artifact; this never builds an older website.
"""
from __future__ import annotations
import hashlib, json, re, sys
from pathlib import Path

OLD='https://louise-willing-cases-strategies.trycloudflare.com'
NEW='https://characterization-seas-total-adopt.trycloudflare.com'
TOKEN='authorigin=20261120r1'

def hashes(root:Path):
    return {f.relative_to(root).as_posix(): hashlib.sha256(f.read_bytes()).hexdigest()
            for f in root.rglob('*') if f.is_file()}

def main(site:Path,source:Path):
    oldfiles=hashes(site)
    retained={
        'index.html','app/index.html','landing.js','app.js',
        'bridgepoint-view-v5917.js','bridgepoint-global-wind-rf-v1.js',
        'wind-rf-global-v1.json','bridgepoint-volumetric-fields-v5978.js',
        'bridgepoint-emrf-starlink-global-v2.js','starlink-orbits-v2.json',
        'bridgepoint-spacecraft-museums-v3.js','bridgepoint-spacecraft-columbia-v1.js',
        'bridgepoint-spacecraft-discovery-v1.js','bridgepoint-spacecraft-ten-pads-v2.js',
        'bridgepoint-plane-wrecks-v1.js','bridgepoint-shipwrecks-v1.js',
        'bridgepoint-underground-scan-sites-v1.js','bridgepoint-wildfire-realistic-mesh-v4.js',
        'bridgepoint-celestial-sky-v6257.js','vendor/three.module.js',
    }
    if missing:=retained-set(oldfiles):
        raise RuntimeError('NO_PUBLISH_MISSING_COMPLETE_SITE_FILES '+str(sorted(missing)))
    for entry,source_file in (('landing.js','landing.js'),('app.js','app.js')):
        original=(site/entry).read_bytes()
        candidate=(source/source_file).read_bytes()
        old=OLD.encode()
        new=NEW.encode()
        if original.count(old)!=1:
            raise RuntimeError('NO_PUBLISH_ORIGINAL_AUTH_ORIGIN_UNEXPECTED '+entry)
        if candidate.count(new)!=1 or candidate!=original.replace(old,new,1):
            raise RuntimeError('NO_PUBLISH_AUTH_CHANGE_HAS_UNRELATED_CODE '+entry)
        (site/entry).write_bytes(candidate)
    for entry,script in (('index.html','landing.js'),('app/index.html','app.js')):
        p=site/entry
        raw=p.read_text(encoding='utf-8')
        pat=r'(?<=src=")(?:\./|\.\./|/)?'+re.escape(script)+r'\?[^"]*(?=")'
        matches=list(re.finditer(pat,raw))
        if len(matches)!=1: raise RuntimeError('NO_PUBLISH_SCRIPT_CACHE_URL_AMBIGUOUS '+entry+': '+str(len(matches)))
        m=matches[0]
        if TOKEN in m.group(0): raise RuntimeError('NO_PUBLISH_DUPLICATE_CACHE_TOKEN '+entry)
        newurl=m.group(0)+'&'+TOKEN
        p.write_text(raw[:m.start()]+newurl+raw[m.end():],encoding='utf-8')
    updated=hashes(site)
    allowed={'landing.js','app.js','index.html','app/index.html'}
    changed={f for f in oldfiles if oldfiles[f]!=updated.get(f)}
    if changed!=allowed or set(updated)!=set(oldfiles):
        raise RuntimeError('NO_PUBLISH_UNRELATED_PRODUCTION_FILES '+json.dumps({
            'changed':sorted(changed),'added':sorted(set(updated)-set(oldfiles)),
            'removed':sorted(set(oldfiles)-set(updated))}))
    assert (site/'bridgepoint-view-v5917.js').read_bytes()
    assert TOKEN in (site/'index.html').read_text(encoding='utf-8')
    assert TOKEN in (site/'app/index.html').read_text(encoding='utf-8')
    print('BRIDGEPOINT_AUTH_ONLY_PRESERVE_PASS unchanged_files=',len(oldfiles)-4,
          'changed=landing.js,app.js,index.html,app/index.html',
          'auth_destination=',NEW,flush=True)

if __name__=='__main__':
    if len(sys.argv)!=3: raise SystemExit('usage: overlay_auth_tunnel_v1.py extracted-site rebuild-v5000')
    main(Path(sys.argv[1]),Path(sys.argv[2]))
