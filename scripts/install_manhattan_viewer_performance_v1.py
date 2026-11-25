#!/usr/bin/env python3
"""Manhattan-only viewer performance patch; leave original GLB and globe intact."""
from pathlib import Path
import sys, json, hashlib, struct, io, re
from PIL import Image
site=Path(sys.argv[1])
folder=site/'assets/manhattan-photogrammetry-v1'
orig=folder/'manhattan.glb'
viewer=site/'bridgepoint-public-scans-v1.js'
allowed={'index.html','app/index.html','bridgepoint-public-scans-v1.js','assets/manhattan-photogrammetry-v1/manhattan-mobile.glb'}
def hashes():return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob('*') if p.is_file() and p.relative_to(site).as_posix() not in allowed}
before=hashes()
raw=orig.read_bytes()
assert hashlib.sha256(raw).hexdigest()=='d38b5a3d490b71e21888eecd6cd5fc5a49cd3ec649efe00918303916d48d7cfc'
jl=struct.unpack_from('<I',raw,12)[0]; doc=json.loads(raw[20:20+jl]); binary=raw[28+jl:]
assert len(doc['images'])==1 and len(doc['buffers'])==1
img=doc['images'][0]; vi=img['bufferView']; view=doc['bufferViews'][vi]; off=view.get('byteOffset',0); length=view['byteLength']; im=Image.open(io.BytesIO(binary[off:off+length])); oldsize=im.size
im.thumbnail((4096,4096),Image.Resampling.LANCZOS); buf=io.BytesIO();im.convert('RGB').save(buf,'JPEG',quality=92,subsampling=0,optimize=True)
tex=buf.getvalue(); oldpad=(length+3)//4*4; newpad=(len(tex)+3)//4*4
assert off%4==0
for i,v in enumerate(doc['bufferViews']):
 if i==vi:continue
 start=v.get('byteOffset',0);end=start+v['byteLength']
 assert end<=off or start>=off+oldpad
 if start>=off+oldpad:v['byteOffset']=start+newpad-oldpad
view['byteLength']=len(tex);img['mimeType']='image/jpeg'
newbin=binary[:off]+tex+b'\0'*(newpad-len(tex))+binary[off+oldpad:]
doc['buffers'][0]['byteLength']=len(newbin)
js=json.dumps(doc,separators=(',',':')).encode();js+=b' '*((-len(js))%4)
out=struct.pack('<4sII',b'glTF',2,28+len(js)+len(newbin))+struct.pack('<I4s',len(js),b'JSON')+js+struct.pack('<I4s',len(newbin),b'BIN\0')+newbin
(folder/'manhattan-mobile.glb').write_bytes(out)
print('MANHATTAN_TEXTURE',oldsize,im.size,'SOURCE_BYTES',len(raw),'PREVIEW_BYTES',len(out))
s=viewer.read_text()
def change(a,b):
 global s
 assert s.count(a)==1,(a[:100],s.count(a));s=s.replace(a,b,1)
change("const VERSION = '1.1.1-manhattan';","const VERSION = '1.1.2-manhattan-performance';")
change("fileUrl = new URL(item.asset_url, window.location.origin);","fileUrl = new URL(item.asset_url, window.location.origin);\n        if (fileUrl.pathname === '/assets/manhattan-photogrammetry-v1/manhattan.glb' && (innerWidth < 850 || (navigator.deviceMemory && navigator.deviceMemory <= 4))) fileUrl = new URL('/assets/manhattan-photogrammetry-v1/manhattan-mobile.glb', window.location.origin);")
change("await renderModel(libraries, buffer, fileName, stage);","await renderModel(libraries, buffer, fileName, stage, item.asset_url === '/assets/manhattan-photogrammetry-v1/manhattan.glb');")
change("async function renderModel(libs, buffer, fileName, stage) {","async function renderModel(libs, buffer, fileName, stage, manhattan = false) {")
change("    scene.add(modelObject);","    if (manhattan) { const replacements = new Map(); modelObject.traverse(o => { if (!o.isMesh || !o.material) return; const convert = m => { if (!m.map) return m; if (!replacements.has(m)) { replacements.set(m, new THREE.MeshBasicMaterial({ map: m.map, color: m.color || 0xffffff, side: THREE.FrontSide, vertexColors: m.vertexColors, transparent: m.transparent, opacity: m.opacity, alphaTest: m.alphaTest })); } return replacements.get(m); }; o.material = Array.isArray(o.material) ? o.material.map(convert) : convert(o.material); }); for (const m of replacements.keys()) m.dispose(); }\n    scene.add(modelObject);")
change("antialias: true, alpha: false, powerPreference: 'low-power'","antialias: !manhattan, alpha: false, powerPreference: manhattan ? 'high-performance' : 'low-power'")
change("renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));","renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, manhattan ? 1 : 1.5));")
change("renderer.shadowMap.enabled = true;","renderer.shadowMap.enabled = !manhattan;")
change("controls.autoRotate = true;","controls.autoRotate = !manhattan;")
change("controls.minDistance = largest * .12;","controls.minDistance = largest * (manhattan ? .003 : .12);")
change("renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });","if (manhattan) { controls.enableDamping = false; let queued = false; const draw = () => { if (queued) return; queued = true; requestAnimationFrame(() => { queued = false; if (state.renderer === renderer && stage.isConnected && !document.hidden) renderer.render(scene,camera); }); }; controls.addEventListener('change',draw); state.manhattanDraw = draw; draw(); } else renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });")
change("camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h);","camera.aspect = w / h; camera.updateProjectionMatrix(); renderer.setSize(w, h); if (manhattan) state.manhattanDraw?.();")
change("state.resizeObserver?.disconnect(); state.resizeObserver = null;","state.resizeObserver?.disconnect(); state.resizeObserver = null; state.manhattanDraw = null;")
viewer.write_text(s)
for rel in ('index.html','app/index.html'):
 p=site/rel;t=p.read_text();t,n=re.subn(r'bridgepoint-public-scans-v1\.js(?:\?v=[^"\'\s<>]+)?','bridgepoint-public-scans-v1.js?v=20261125manhattanperf1',t);assert n>=1;p.write_text(t)
assert hashes()==before
print('MANHATTAN_VIEWER_PERFORMANCE_ONLY_PASS',len(before))
