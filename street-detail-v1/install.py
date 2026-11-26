from pathlib import Path
import sys, re, json, zipfile, hashlib, gzip, html, shutil, subprocess
site=Path(sys.argv[1]);src=Path('street-detail-v1');target=site/'assets/street-detail-v1';target.mkdir(parents=True,exist_ok=True)
archive=b''.join(p.read_bytes() for p in sorted((src/'chunks').glob('*.bin')))
assert hashlib.sha256(archive).hexdigest()=='478f7972089cd6e378fe2995809b9feda0e702519c41720a01938969f7fe4c34'
import io
with zipfile.ZipFile(io.BytesIO(archive)) as z:
 assert z.testzip() is None
 m=json.loads(z.read('manifest.json'));assert len(m['packs'])==14 and sum(len(x['scenes']) for x in m['packs'])==83
 for x in m['packs']:
  assert 'CC-BY-4.0' in x['credit']['license'];data=z.read(x['file']);assert len(data)==x['bytes'] and hashlib.sha256(data).hexdigest()==x['sha256']
  if x['file'].endswith('.glb'):
   assert data[:4]==b'glTF' and int.from_bytes(data[8:12],'little')==len(data)
   dest=target/(x['file']+'.gz');dest.write_bytes(gzip.compress(data,compresslevel=6,mtime=0));x['published_file']=dest.name
  else:(target/x['file']).write_bytes(data);x['published_file']=x['file']
extra=b''.join(p.read_bytes() for p in sorted((src/'extra').glob('*.bin')))
assert hashlib.sha256(extra).hexdigest()=='2f488095afce949e944e9c8bae66678f0ad3e042df6f0d3bf3e87a10abe5dffa'
with zipfile.ZipFile(io.BytesIO(extra)) as z:
 assert z.testzip() is None
 extra_manifest=json.loads(z.read('manifest.json'))
 assert len(extra_manifest['packs'])==5
 for x in extra_manifest['packs']:
  assert x['credit']['license'].startswith('CC-BY-4.0');data=z.read(x['file']);assert len(data)==x['bytes'] and hashlib.sha256(data).hexdigest()==x['sha256']
  assert data[:4]==b'glTF' and int.from_bytes(data[8:12],'little')==len(data)
  dest=target/(x['file']+'.gz');dest.write_bytes(gzip.compress(data,compresslevel=6,mtime=0));x['published_file']=dest.name
  m['packs'].append(x)
assert len(m['packs'])==19 and sum(len(x['scenes']) for x in m['packs'])==88
(target/'manifest.json').write_text(json.dumps(m,indent=2))
credits='<!doctype html><html lang="en"><meta charset="utf-8"><title>BridgePoint Street Model Credits</title><style>body{font:16px system-ui;max-width:850px;margin:2rem auto;padding:1rem}li{margin:1rem 0}</style><h1>BridgePoint street model credits</h1><p>Original source assets are CC BY 4.0. Selected variants, reduced texture sizes, grounded rendering transforms and level-of-detail changes are adaptations by BridgePoint. Model forms are visual proxies at available mapped locations, not verified photographs or a real-time inventory of individual objects. No vehicles are placed without a verified vehicle source.</p><ul>'
for p in m['packs']:
 c=p['credit'];credits+='<li><a href="'+html.escape(c['source'],quote=True)+'">'+html.escape(c['title'])+'</a> — '+html.escape(c['author'])+' — <a href="https://creativecommons.org/licenses/by/4.0/">CC BY 4.0</a></li>'
(target/'credits.html').write_text(credits+'</ul></html>')
(site/'vendor/bp-street-detail-v1.mjs').write_bytes((src/'street-detail.mjs').read_bytes())
def once(s,a,b):
 assert s.count(a)==1, f'Expected exact single patch anchor: {a[:80]} (found {s.count(a)})'
 return s.replace(a,b,1)
# Keep the live source-backed tree placement and instancing, replacing only the close model geometry.
for base in (site,site/'app'):
 p=base/'world-v2300-tree-instanced.js';s=p.read_text();s="import {selectTreeAsset,loadStreetGLTF,normalizedBounds} from '/vendor/bp-street-detail-v1.mjs';\n"+s
 s=once(s,'async function loadModel(modelId, lodKey) {','async function loadModel(modelId, lodKey, streetFallback = false) {')
 s=once(s,'const file = pickLod(model, lodKey);', '''const defaultFile = pickLod(model, lodKey);
    const sourceFile = !streetFallback && lodKey === 'lod0' && map.getZoom() >= 17.5 && activeTrees.length <= (mobile ? 65 : 140) ? selectTreeAsset(model, modelId, map.getCenter().lat) : null;
    const file = sourceFile || defaultFile;''')
 s=once(s,'const cacheKey = modelId + \'|\' + file.level + \'|\' + file.url;','const cacheKey = modelId + \'|\' + file.level + \'|\' + file.url + \'|\' + (file.streetScene ?? \'native\');')
 s=once(s,'const promise = loader.loadAsync(file.url).then(gltf => {',"const promise = (sourceFile ? loadStreetGLTF(loader,file) : loader.loadAsync(file.url)).then(gltf => {")
 s=once(s,'const root = gltf.scene || gltf.scenes?.[0];','const root = sourceFile ? gltf.scenes?.[file.streetScene] : (gltf.scene || gltf.scenes?.[0]);')
 s=once(s,'root.updateMatrixWorld(true);\n      const meshes = [];','root.updateMatrixWorld(true);\n      const streetBounds = sourceFile ? normalizedBounds(THREE,root) : null;\n      const meshes = [];\n      let sourceTriangles = 0;')
 s=once(s,'geometry.applyMatrix4(object.matrixWorld);\n        addWindAttribute(THREE, geometry);','''geometry.applyMatrix4(object.matrixWorld);
        if(streetBounds){geometry.translate(-streetBounds.base.x,-streetBounds.box.min.y,-streetBounds.base.z);const scale=1/streetBounds.size.y;geometry.scale(scale,scale,scale);sourceTriangles+=(geometry.index?.count||geometry.attributes.position.count)/3;}
        addWindAttribute(THREE, geometry);''')
 s=once(s,"if (!meshes.length) throw new Error('TREE_MODEL_HAS_NO_MESHES_' + modelId);", "if (!meshes.length) throw new Error('TREE_MODEL_HAS_NO_MESHES_' + modelId);\n      if(sourceFile && sourceTriangles>10000)throw Error('STREET_TREE_TRIANGLE_LIMIT');")
 s=once(s,'loadModel.cache.delete(cacheKey);\n      throw error;','loadModel.cache.delete(cacheKey);\n      if(sourceFile)return loadModel(modelId,lodKey,true);\n      throw error;')
 s=once(s,'mesh.setColorAt(i, tint);','mesh.setColorAt(i, loaded.file.streetScene!==undefined ? new THREE.Color(1,1,1) : tint);')
 s=once(s,'const renderedTreeCount = results.reduce((sum, result) => sum + result.trees.length, 0);','const renderedTreeCount = results.reduce((sum, result) => sum + result.trees.length, 0);\n      state.sourceStreetTreeCount=results.filter(x=>x.loaded.file.streetScene!==undefined).reduce((sum,x)=>sum+x.trees.length,0);')
 p.write_text(s)
 p=base/'world-v2300-map.js';s=p.read_text();pattern=r"world-v2300-tree-instanced\.js\?v=[^'\"\s]+";s,n=re.subn(pattern,'world-v2300-tree-instanced.js?v=20261126-street-source-v1',s);assert n>=1
 anchor="map.on('zoomend',bpAttachTreeRendererFromViewport);"
 s=once(s,anchor,anchor+'''\n let bpSourceStreetAttached=false;
 const bpInstallSourceStreet=()=>{if(bpSourceStreetAttached||map.getZoom()<17.5)return;bpSourceStreetAttached=true;import('/vendor/bp-street-detail-v1.mjs').then(m=>m.attachStreetDetail(map)).catch(()=>{bpSourceStreetAttached=false;});};
 map.on('moveend',bpInstallSourceStreet);map.on('zoomend',bpInstallSourceStreet);map.on('idle',bpInstallSourceStreet);''');p.write_text(s)
 # The existing streetlight batches retain their geographic anchors and night lighting.
 # Optional legacy module; otherwise the source street layer supplies mapped lights.
 if (base/'bridgepoint-streetlights-3d-v1.js').is_file():
  p=base/'bridgepoint-streetlights-3d-v1.js';s=p.read_text();s="import {loadStreetGLTF,normalizedBounds} from '/vendor/bp-street-detail-v1.mjs';\n"+s
  anchor='  function makeCollection(parent, entries) {'
  s=once(s,anchor,'''  let bpStreetLightParts=null,bpStreetLightPending=false,bpStreetLightEnabled=false;
   function bpLoadStreetLights(){if(bpStreetLightParts||bpStreetLightPending)return;bpStreetLightPending=true;import('/vendor/GLTFLoader.bundle.js?v=169-local').then(async m=>{
     const gltf=await loadStreetGLTF(new m.GLTFLoader(),{url:'/assets/street-detail-v1/lights.glb.gz'});
     bpStreetLightParts=gltf.scenes.slice(0,8).map(root=>{const b=normalizedBounds(THREE,root),parts=[];root.traverse(o=>{if(o.isMesh&&o.geometry){const g=o.geometry.clone().applyMatrix4(o.matrixWorld);g.translate(-b.base.x,-b.box.min.y,-b.base.z);g.scale(1/b.size.y,1/b.size.y,1/b.size.y);parts.push({geometry:g,material:o.material});}});return parts;});
     if(bpStreetLightParts.length!==8||bpStreetLightParts.some(x=>!x.length))throw Error('STREET_LIGHT_EMPTY');lastSignature='';scheduleRefresh();
   }).catch(e=>{bpStreetLightParts=null;state.sourceModelError=String(e).slice(0,180)}).finally(()=>{bpStreetLightPending=false});}
 '''+anchor)
  s=once(s,'    for (const [key, geometry, material] of definitions) {','''    if(bpStreetLightEnabled&&bpStreetLightParts){
       const batches=Array.from({length:bpStreetLightParts.length},()=>[]);for(const entry of entries){let h=0;for(const c of String(entry.key))h=(Math.imul(h,31)+c.charCodeAt(0))>>>0;batches[h%batches.length].push(entry);}
       for(let k=0;k<batches.length;k++){const batch=batches[k];if(!batch.length)continue;for(const [j,part] of bpStreetLightParts[k].entries()){const mesh=createInstanced(parent,part.geometry,part.material,batch.length,THREE);for(let i=0;i<batch.length;i++){const e=batch[i];mesh.setMatrixAt(i,e.baseMatrix.clone().multiply(new THREE.Matrix4().makeRotationY(e.yaw)).multiply(new THREE.Matrix4().makeScale(e.height,e.height,e.height)));}mesh.instanceMatrix.needsUpdate=true;staticMeshes['source-'+k+'-'+j]=mesh;}}
     } else for (const [key, geometry, material] of definitions) {''')
  s=once(s,'    const precisionMode = zoom >= PRECISE_MIN_ZOOM;','''    const precisionMode = zoom >= PRECISE_MIN_ZOOM;
     const requestedSource=zoom>=17.5&&records.length<=(window.innerWidth<=700?100:220);
     if(requestedSource)bpLoadStreetLights();
     const nextSource=requestedSource&&!!bpStreetLightParts;if(nextSource!==bpStreetLightEnabled){bpStreetLightEnabled=nextSource;lastSignature='';}state.sourceModelActive=bpStreetLightEnabled;''')
  p.write_text(s)
 # Use distinct module cache keys for the existing loader path wherever it is referenced.
 for filename in ('index.html','landing.js','app.js'):
  pp=base/filename
  if pp.is_file():
   old=pp.read_text();new=re.sub(r'bridgepoint-streetlights-3d-v1\.js\?v=[^\'"\s<>]+','bridgepoint-streetlights-3d-v1.js?v=20261126-street-source-v1',old)
   new=re.sub(r'world-v2300-map\.js\?v=[^\'"\s<>]+','world-v2300-map.js?v=20261126-street-source-v1',new)
   if new!=old:pp.write_text(new)
print('STREET_SOURCE_INSTALL_PASS',len(m['packs']),sum(len(x['scenes']) for x in m['packs']))
