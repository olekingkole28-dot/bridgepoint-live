from __future__ import annotations
import json, re, sys
from pathlib import Path

API_ORIGIN = "https://solaris-boat-upgrades-stocks.trycloudflare.com"

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count=text.count(old)
    if count!=1:
        raise AssertionError(f"{label}: expected one match, found {count}")
    return text.replace(old,new,1)

def patch_landing(source: str) -> str:
    source=replace_once(source,
        "location.assign('/signin/?mode='+next+'&return='+encodeURIComponent('/app/'))",
        "location.assign('/signin/?mode='+next+'&return='+encodeURIComponent('/'))",
        "website sign-in return destination")
    source=replace_once(source,
        "navigator.serviceWorker.register('/sw.js?v=6230-bootstrapped-auth',{updateViaCache:'none'})",
        "navigator.serviceWorker.register('/sw.js?v=6231-globe-root',{updateViaCache:'none'})",
        "landing service-worker URL")
    if API_ORIGIN not in source or "bp_auth_v5045" not in source:
        raise AssertionError("Landing lost its PC auth runtime/shared session key")
    return source

def patch_app(source: str) -> str:
    old_signin="async function signIn(email,password){recordLegalAcceptance();setText('authMessage','Signing in…');await authExchange('token?grant_type=password',{email,password});setText('authMessage','');await loadWorkspace(true);if(pendingPackageKey){const pk=pendingPackageKey;pendingPackageKey=null;await handlePackageAction(pk)}}"
    new_signin="""async function signIn(email,password){
 recordLegalAcceptance();
 setText('authMessage','Signing in…');
 await authExchange('token?grant_type=password',{email,password});
 if(pendingPackageKey){
  const pk=pendingPackageKey;pendingPackageKey=null;
  await loadWorkspace(true);
  await handlePackageAction(pk);
  return;
 }
 location.replace('/');
}"""
    source=replace_once(source,old_signin,new_signin,"app sign-in success destination")
    old_signup="async function createAccount(email,password){const legal=recordLegalAcceptance();setText('authMessage','Creating account…');const d=await authExchange('signup',{email,password,data:{terms_version:legal.version,terms_accepted_at:legal.accepted_at,privacy_accepted_at:legal.accepted_at,signup_source:'bridgepoint_app'}});if(d?.access_token){setText('authMessage','Account created and signed in.');await loadWorkspace(true)}else setText('authMessage','Account created. Check your email if confirmation is required, then sign in.')}"
    new_signup="""async function createAccount(email,password){
 const legal=recordLegalAcceptance();
 setText('authMessage','Creating account…');
 const d=await authExchange('signup',{email,password,data:{terms_version:legal.version,terms_accepted_at:legal.accepted_at,privacy_accepted_at:legal.accepted_at,signup_source:'bridgepoint_app'}});
 if(d?.access_token){location.replace('/');return}
 setText('authMessage','Account created. Check your email if confirmation is required, then sign in.')
}"""
    source=replace_once(source,old_signup,new_signup,"app signup success destination")
    source,count=re.subn(r"window\.__BP_APP_BUILD_VERSION__=6230;","window.__BP_APP_BUILD_VERSION__=6231;",source,count=1)
    if count!=1:
        raise AssertionError("V6230 app version marker missing")
    if API_ORIGIN not in source or "bp_auth_v5045" not in source:
        raise AssertionError("App lost its PC auth runtime/shared session key")
    return source

def patch_root_html(source: str) -> str:
    source=replace_once(source,"landing.js?v=6230-bootstrapped-auth","landing.js?v=6231-globe-root","root landing cache-bust")
    source=replace_once(source,'href="./manifest.webmanifest"','href="./manifest.webmanifest?v=6231-globe-root"',"root PWA manifest cache-bust")
    if "bpMobileLazyLoaderV6229" not in source or "bpw-globe-aura" not in source:
        raise AssertionError("Existing globe/welcome experience missing from root")
    return source

def patch_app_html(source: str) -> str:
    old_gate="location.replace('/signin/?mode=signin&return=%2Fapp%2F')"
    if source.count(old_gate)!=2:
        raise AssertionError(f"Expected two V6230 app login gates, found {source.count(old_gate)}")
    source=source.replace(old_gate,"location.replace('/signin/?mode=signin&return=%2F')")
    guard="""<script id="bp-canonical-globe-entry-v6231">(()=>{try{const p=location.pathname.split('/').filter(Boolean).join('/');if((p==='app'||p==='app/index.html')&&!location.search&&!location.hash){location.replace('/')}}catch(_){location.replace('/')}})();</script>
<script id="bp-app-entry-gate">"""
    source=replace_once(source,'<script id="bp-app-entry-gate">',guard,"app canonical globe entry guard")
    source=replace_once(source,'<link rel="manifest" href="../manifest.webmanifest">','<link rel="manifest" href="../manifest.webmanifest?v=6231-globe-root">',"app manifest cache-bust")
    source=replace_once(source,"bp-bootstrap-sw-refresh-v6230","bp-bootstrap-sw-refresh-v6231","app worker marker")
    source=replace_once(source,"/sw.js?v=6230-bootstrapped-auth","/sw.js?v=6231-globe-root","app worker URL")
    source=replace_once(source,"../app.js?v=6230-bootstrapped-auth","../app.js?v=6231-globe-root","app bundle cache-bust")
    return source

def patch_manifest(path: Path) -> None:
    data=json.loads(path.read_text(encoding="utf-8"))
    if data.get("start_url")!="/app/":
        raise AssertionError(f"Expected V6230 PWA start_url /app/, got {data.get('start_url')!r}")
    data["start_url"]="/"
    # Keep the current manifest ID, scope, display mode and icons to preserve installed identity.
    path.write_text(json.dumps(data,separators=(",",":")),encoding="utf-8")

def patch_worker(source: str) -> str:
    if "BOOTSTRAP_AUTH_BUILD='v6230'" not in source:
        raise AssertionError("V6230 service-worker marker missing")
    if "GLOBE_ROOT_BUILD='v6231'" in source:
        raise AssertionError("V6231 marker already present")
    replacement="""const BOOTSTRAP_AUTH_BUILD='v6230';
const GLOBE_ROOT_BUILD='v6231';"""
    return replace_once(source,"const BOOTSTRAP_AUTH_BUILD='v6230';",replacement,"worker build marker")

def patch_signin_template(source: str) -> str:
    source=replace_once(source,
        "const requestedReturn=params.get('return')||'/app/';",
        "const requestedReturn=params.get('return')||'/';",
        "sign-in default destination")
    old_line=next((line for line in source.splitlines() if line.startswith("const RETURN_TO=")),None)
    if not old_line:
        raise AssertionError("Sign-in return validation line missing")
    new_line=r"""const RETURN_TO=(requestedReturn==='/app/'||requestedReturn==='/app')?'/':(requestedReturn.startsWith('/')&&!requestedReturn.startsWith('//')&&!requestedReturn.includes('\\')?requestedReturn:'/');"""
    source=replace_once(source,old_line,new_line,"legacy app destination normalization")
    if API_ORIGIN not in source or "bp_auth_v5045" not in source:
        raise AssertionError("Sign-in page lost local auth runtime/session key")
    return source

def patch_site(site: Path) -> None:
    required={
        "index.html":site/"index.html",
        "landing.js":site/"landing.js",
        "app.js":site/"app.js",
        "app/index.html":site/"app"/"index.html",
        "sw.js":site/"sw.js",
        "manifest.webmanifest":site/"manifest.webmanifest",
        "signin/index.html":site/"signin"/"index.html",
    }
    for label,path in required.items():
        if not path.is_file():
            raise FileNotFoundError(f"Missing Pages artifact file: {label}")
    required["landing.js"].write_text(patch_landing(required["landing.js"].read_text(encoding="utf-8")),encoding="utf-8")
    required["app.js"].write_text(patch_app(required["app.js"].read_text(encoding="utf-8")),encoding="utf-8")
    required["index.html"].write_text(patch_root_html(required["index.html"].read_text(encoding="utf-8")),encoding="utf-8")
    required["app/index.html"].write_text(patch_app_html(required["app/index.html"].read_text(encoding="utf-8")),encoding="utf-8")
    required["sw.js"].write_text(patch_worker(required["sw.js"].read_text(encoding="utf-8")),encoding="utf-8")
    patch_manifest(required["manifest.webmanifest"])
    required["signin/index.html"].write_text(patch_signin_template(required["signin/index.html"].read_text(encoding="utf-8")),encoding="utf-8")

    checks={
        "landing.js":["encodeURIComponent('/')","sw.js?v=6231-globe-root",API_ORIGIN],
        "app.js":["window.__BP_APP_BUILD_VERSION__=6231;","location.replace('/')",API_ORIGIN],
        "index.html":["landing.js?v=6231-globe-root","bpMobileLazyLoaderV6229","bpw-globe-aura","manifest.webmanifest?v=6231-globe-root"],
        "app/index.html":["bp-canonical-globe-entry-v6231","return=%2F","manifest.webmanifest?v=6231-globe-root","app.js?v=6231-globe-root"],
        "sw.js":["BOOTSTRAP_AUTH_BUILD='v6230'","GLOBE_ROOT_BUILD='v6231'"],
        "signin/index.html":["bp_auth_v5045","token?grant_type=password",API_ORIGIN,"||'/'","const RETURN_TO=(requestedReturn==='/app/'"],
    }
    for name,needles in checks.items():
        content=(site/name).read_text(encoding="utf-8")
        for needle in needles:
            if needle not in content:
                raise AssertionError(f"{name}: missing marker {needle}")
    manifest=json.loads(required["manifest.webmanifest"].read_text(encoding="utf-8"))
    if manifest.get("start_url")!="/" or manifest.get("id")!="/bridgepoint-intelligence-v5050":
        raise AssertionError("Manifest launch URL/identity did not pass canonical-root verification")
    print("BRIDGEPOINT_GLOBE_ROOT_HANDOFF_V6231_PATCH_PASS")
    print("Website sign-in, app sign-in, direct app launch and installed-app start_url all converge on /.")
    print("Package-specific /app/?page=... routes remain available.")
    print("Globe, card, welcome animation and feature assets remain untouched.")

if __name__=="__main__":
    if len(sys.argv)!=2:
        raise SystemExit("Usage: apply_globe_root_handoff_v6231.py SITE_DIRECTORY")
    patch_site(Path(sys.argv[1]))
