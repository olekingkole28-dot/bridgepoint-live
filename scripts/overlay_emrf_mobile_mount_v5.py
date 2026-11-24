from pathlib import Path
import sys,hashlib,re
site=Path(sys.argv[1])
def snapshot():
    return {p.relative_to(site).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in site.rglob("*") if p.is_file()}
before=snapshot();changed=set()
def edit(rel,fn,required=True):
    p=site/rel
    if not p.is_file():
        assert not required,rel
        return
    s=p.read_text();new=fn(s)
    if new!=s:p.write_text(new);changed.add(rel)
def wrapper(s):
    old="  if (dock) dock.insertBefore(root,dock.querySelector('#bpv-dock-actions'));\n  else map.getContainer().appendChild(root);"
    new="""  // Mobile card v2 moves the action grid into a scrollable content node.
  // insertBefore must use the reference's immediate parent, not its ancestor.
  if (dock) {
    const actions=dock.querySelector('#bpv-dock-actions');
    const host=actions?.parentElement;
    if (host && dock.contains(host) && actions.parentNode===host) host.insertBefore(root,actions);
    else (dock.querySelector('#bpv-v2-content')||dock).appendChild(root);
  } else map.getContainer().appendChild(root);"""
    assert s.count(old)==1
    return s.replace(old,new,1)
edit("bridgepoint-emrf-spectrogram-v1.js",wrapper)
edit("app/bridgepoint-emrf-spectrogram-v1.js",wrapper,False)
def view(s):
    s,n=re.subn(r"(/bridgepoint-emrf-spectrogram-v1\.js\?[^'\"]+)",r"\1&emrf-mobile-mount=v5",s);assert n>=1
    return s
edit("bridgepoint-view-v5917.js",view)
def html(s):
    s,n=re.subn(r'(data-bp-deferred-src="/bridgepoint-view-v5917\.js\?[^"]+)',r'\1&emrf-mobile-mount=v5',s);assert n==1
    return s
for rel in ("index.html","app/index.html"):edit(rel,html)
after=snapshot()
assert before.keys()==after.keys()
assert {p for p in before if before[p]!=after[p]}==changed
print("EMRF_MOBILE_MOUNT_ONLY_PASS",sorted(changed),len(before)-len(changed),"unchanged files")
