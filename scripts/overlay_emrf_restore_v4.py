from pathlib import Path
import hashlib,re,sys,json,datetime
site=Path(sys.argv[1])
def snapshot():
    return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob("*") if p.is_file()}
before=snapshot()
changed=set()
def edit(rel,fn,required=True):
    p=site/rel
    if not p.exists():
        if required:raise RuntimeError("missing "+rel)
        return
    old=p.read_text();new=fn(old)
    if old!=new:p.write_text(new);changed.add(rel)
def once(s,a,b):
    assert s.count(a)==1,(a[:100],s.count(a))
    return s.replace(a,b,1)
def star(s):
    s=once(s,"const OMM='/starlink-orbits-v2.json';","const OMM='/starlink-orbits-v2.json?emrf-restore=20261124-v4';")
    s=once(s,"if(now-state.lastPaint>15000||state.recompute)","if(now-state.lastPaint>15000||state.recompute||state.lastMatrixZoom!==map.getZoom()||state.lastProjectionType!==map.getProjection?.()?.type)")
    s=once(s,"state.recompute=false;updateMatrices();state.lastPaint=now;","state.recompute=false;state.lastMatrixZoom=map.getZoom();state.lastProjectionType=map.getProjection?.()?.type;updateMatrices();state.lastPaint=now;")
    s=once(s,"if(!state.beams.count)return;","if(!state.beams.count){if(state.positions.length){state.recompute=true;map.triggerRepaint?.();}return;}")
    s=once(s,"// Other BridgePoint atmosphere layers can drive repaint; when static use\n    // slow re-render rather than running thousands of per-frame JS transforms.","// Draw each requested frame; independent animation must not depend on other overlays.\n    if(state.enabled&&state.positions.length)map.triggerRepaint?.();")
    s=once(s,"else void loadCatalog();","else await loadCatalog();")
    s=once(s,"if(!state.enabled||document.hidden||!state.catalog)return;","if(!state.enabled||document.hidden)return;\n    if(!state.catalog||state.positions.length<2000){void loadCatalog();return;}")
    s=once(s,"function handleStyle(){if(state.enabled){installLayer();state.recompute=true;state.lastOrbitAt=0;}}","function handleStyle(){if(state.enabled){installLayer();state.recompute=true;state.lastOrbitAt=0;map.triggerRepaint?.();}}")
    s=once(s,"map.on?.('style.load',handleStyle);","map.on?.('style.load',handleStyle);map.on?.('idle',handleStyle);")
    # Avoid infinite repaint from idle when already mounted.
    s=once(s,"function handleStyle(){if(state.enabled){installLayer();state.recompute=true;state.lastOrbitAt=0;map.triggerRepaint?.();}}","function handleStyle(){if(state.enabled&&!map.getLayer?.(LAYER)){installLayer();state.recompute=true;state.lastOrbitAt=0;map.triggerRepaint?.();}}")
    s=once(s,"map.off?.('style.load',handleStyle);","map.off?.('style.load',handleStyle);map.off?.('idle',handleStyle);")
    return s
def wrapper(s):
    s,n=re.subn(r"(\./bridgepoint-emrf-starlink-global-v2\.js\?[^'\"]+)",r"\1&emrf-repair=20261124-v4",s);assert n==1
    s=once(s,"if (st.beamLayer && st.beamLayer.map===map) return st.beamLayer;","if (st.beamLayer && st.beamLayer.map===map && map.getLayer(IDS.beamLayer)) return st.beamLayer;\n    st.beamLayer=null;")
    s=once(s,"if (map.getLayer(IDS.beamLayer)) throw new Error('Starlink beam layer handle was lost during a style replacement');","if (map.getLayer(IDS.beamLayer)) map.removeLayer(IDS.beamLayer);")
    s=once(s,"const v=map.queryTerrainElevation?.([site.lon,site.lat]);","const v=map.queryTerrainElevation?.([site.lon,site.lat],{exaggerated:true});")
    s=once(s,"const beams=getOrbitPositions();","const beams=st.starlinkV2?.state?.beamCount?[]:getOrbitPositions();")
    s=once(s,"if (st.beams.length) void updateBeams();","void updateBeams();")
    s=once(s,"if(st.starlinkV2?.state?.enabled)map.triggerRepaint?.();","if(st.starlinkV2?.state?.enabled)map.triggerRepaint?.();else void enableStarlinkThousandsV2();")
    s=once(s,"if(!st.beamLayer)void updateBeams();","void updateBeams();")
    s=once(s,"if (st.active){scheduleInteraction();map.triggerRepaint?.();}","if (st.active){setVisibility(true);scheduleInteraction();map.triggerRepaint?.();}")
    return s
for rel in ("bridgepoint-emrf-starlink-global-v2.js","app/bridgepoint-emrf-starlink-global-v2.js"):edit(rel,star)
edit("bridgepoint-emrf-spectrogram-v1.js",wrapper)
edit("app/bridgepoint-emrf-spectrogram-v1.js",wrapper,False)
def view(s):
    s,n=re.subn(r"(/bridgepoint-emrf-spectrogram-v1\.js\?[^'\"]+)",r"\1&emrf-repair=20261124-v4",s);assert n>=1
    return s
edit("bridgepoint-view-v5917.js",view)
def html(s):
    s,n=re.subn(r'(data-bp-deferred-src="/bridgepoint-view-v5917\.js\?[^"]+)',r'\1&emrf-repair=20261124-v4',s);assert n==1
    return s
for rel in ("index.html","app/index.html"):edit(rel,html)
# Fresh verified orbital elements generated separately, never invented.
catalog=Path(sys.argv[2]); data=json.loads(catalog.read_text())
assert data["record_count"]>=2500 and data["recent_72h"]>=2000
(site/"starlink-orbits-v2.json").write_bytes(catalog.read_bytes())
changed.add("starlink-orbits-v2.json")
after=snapshot()
assert before.keys()==after.keys()
assert {k for k in before if before[k]!=after[k]}==changed
assert all("emrf" in k or k in ("index.html","app/index.html","bridgepoint-view-v5917.js","starlink-orbits-v2.json") for k in changed)
print("EMRF_ONLY_SCOPE_PASS",sorted(changed),len(before)-len(changed),"unchanged files")
