from pathlib import Path
import sys,hashlib,re
site=Path(sys.argv[1]);name='bridgepoint-rain-3d-v1.js'
allowed={name,'index.html','app/index.html'}
def snap():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=snap()
old=(site/name).read_text();assert 'projectTileFor3D' in old
(site/name).write_bytes(Path('rebuild-v5000',name).read_bytes())
for rel in ('index.html','app/index.html'):
 p=site/rel;s=p.read_text();s,n=re.subn(r'('+re.escape(name)+r'\?[^"\x27\s<>]+)',lambda m:m[1]+'&effects=20261125v5',s)
 assert n==1,(rel,n)
 p.write_text(s)
assert before==snap(),'Unrelated production file changed'
print('RAIN_V5_ONLY_BYTE_PRESERVATION_PASS',len(before))
