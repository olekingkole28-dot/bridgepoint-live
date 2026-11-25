#!/usr/bin/env python3
"""Install the importer without changing any existing scan or globe asset."""
import hashlib, sys
from pathlib import Path
site=Path(sys.argv[1])
allowed={'index.html','app/index.html','bridgepoint-sketchfab-importer-v1.js'}
def hashes():
 return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=hashes()
assert 'bridgepoint-auto-reality-v1.js' in before
assert 'data/bp-auto-reality-v1.json' in before
assert 'bridgepoint-public-scans-v1.js' in before
assert 'assets/auto-reality-v1/paris-tour-eiffel.glb' in before
tag=b'<script defer src="/bridgepoint-sketchfab-importer-v1.js?v=20261125v1"></script>\n'
for rel in ('index.html','app/index.html'):
 p=site/rel
 old=p.read_bytes()
 assert old.count(b'</body>')==1 and tag not in old
 new=old.replace(b'</body>',tag+b'</body>',1)
 assert new.replace(tag,b'',1)==old
 p.write_bytes(new)
(site/'bridgepoint-sketchfab-importer-v1.js').write_bytes(Path('rebuild-v5000/bridgepoint-sketchfab-importer-v1.js').read_bytes())
assert hashes()==before, 'Existing release changed outside importer scope'
print('SKETCHFAB_IMPORTER_ONLY_BYTE_PRESERVATION_PASS',len(before))
