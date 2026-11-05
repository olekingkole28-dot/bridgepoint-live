from __future__ import annotations
import json, re, sys
from pathlib import Path

API_ORIGIN = "https://solaris-boat-upgrades-stocks.trycloudflare.com"
SUPABASE_ORIGIN = "https://xdfsjztwgsbmabshzsjw.supabase.co"
SIGNIN_TEMPLATE = Path(__file__).with_name("globe-root-signin-v6231.html")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count=text.count(old)
    if count!=1:
        raise AssertionError(f"{label}: expected one match, found {count}")
    return text.replace(old,new,1)

def patch_landing(source: str) -> str:
    source=replace_once(
        source,
        "location.assign('/signin/?mode='+next+'&return='+encodeURIComponent('/app/'))",
        "location.assign('/signin/?mode='+next+'&return='+encodeURIComponent('/'))",
        "landing sign-in return route",
    )
    source=replace_once(
        source,
        "navigator.serviceWorker.register('/sw.js?v=6230-bootstrapped-auth',{updateViaCache:'none'})",
        "navigator.serviceWorker.register('/sw.js?v=6231-globe-root',{updateViaCache:'none'})",
        "landing service-worker version",
    )
    if API_ORIGIN not in source or "bp_auth_v5045" not in source:
        raise AssertionError("Landing local auth origin/shared session key missing")
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
    source=replace_once(source,old_signin,new_signin,"app sign-in success route")
    old_signup="async function createAccount(email,password){const legal=recordLegalAcceptance();setText('authMessage','Creating account…');const d=await authExchange('signup',{email,password,data:{terms_version:legal.version,terms_accepted_at:legal.accepted_at,privacy_accepted_at:legal.accepted_at,signup_source:'bridgepoint_app'}});if(d?.access_token){setText('authMessage','Account created and signed in.');await loadWorkspace(true)}else setText('authMessage','Account created. Check your email if confirmation is required, then sign in.')}"
    new_signup="""async function createAccount(email,password){
 const legal=recordLegalAcceptance();
 setText('authMessage','Creating account…');
 const d=await authExchange('signup',{email,password,data:{terms_version:legal.version,terms_accepted_at:legal.accepted_at,privacy_accepted_at:legal.accepted_at,signup_source:'bridgepoint_app'}});
 if(d?.access_token){location.replace('/');return}
 setText('authMessage','Account created. Check your email if confirmation is required, then sign in.')
}"""
    source=replace_once(source,old_signup,new_signup,"app signup success route")
    source,count=re.subn(r"window\.__BP_APP_BUILD_VERSION__=6230;","window.__BP_APP_BUILD_VERSION__=6231;",source,count=1)
    if count!=1:
        raise AssertionError("V6230 app build marker missing")
    if API_ORIGIN not in source or "bp_auth_v5045" not in source:
        raise AssertionError("App local auth origin/shared session key missing")
    return source

def patch_root_html(source: str) -> str:
    source=replace_once(source,"landing.js?v=6230-bootstrapped-auth","landing.js?v=6231-globe-root","root landing cache-bust")
    source=replace_once(source,'href="./manifest.webmanifest"','href="./manifest.webmanifest?v=6231-globe-root"',"root manifest cache-bust")
    if "bpMobileLazyLoaderV6229" not in source or "bpw-globe-aura" not in source:
        raise AssertionError("Existing welcome animation/globe startup was lost")
    return source

def patch_app_html(source: str) -> str:
    old_gate="location.replace('/signin/?mode=signin&return=%2Fapp%2F')"
    if source.count(old_gate)!=2:
        raise AssertionError(f"Expected two V6230 app sign-in gates, found {source.count(old_gate)}")
    source=source.replace(old_gate,"location.replace('/signin/?mode=signin&return=%2F')")
    source=replace_once(
        source,
        '<script id="bp-app-entry-gate">',
        """<script id="bp-canonical-globe-entry-v6231">(()=>{try{const p=location.pathname.replace(/\\\\/+$/,'');if((p==='/app'||p==='/app/index.html')&&!location.search&&!location.hash){location.replace('/')}}catch(_){location.replace('/')}})();</script>
<script id="bp-app-entry-gate">""",
        "app canonical globe launch guard",
    )
    source=replace_once(
        source,
        '<link rel="manifest" href="../manifest.webmanifest">',
        '<link rel="manifest" href="../manifest.webmanifest?v=6231-globe-root">',
        "app manifest cache-bust",
    )
    source=replace_once(
        source,
        "bp-bootstrap-sw-refresh-v6230",
        "bp-bootstrap-sw-refresh-v6231",
        "app worker marker",
    )
    source=replace_once(
        source,
        "/sw.js?v=6230-bootstrapped-auth",
        "/sw.js?v=6231-globe-root",
        "app service-worker URL",
    )
    source=replace_once(
        source,
        "../app.js?v=6230-bootstrapped-auth",
        "../app.js?v=6231-globe-root",
        "app bundle cache-bust",
    )
    return source

def patch_manifest(path: Path) -> None:
    data=json.loads(path.read_text(encoding="utf-8"))
    if data.get("start_url")!="/app/":
        raise AssertionError(f"Expected V6230 PWA start_url /app/, found {data.get('start_url')!r}")
    data["start_url"]="/"
    # Keep the existing manifest ID/scope/display/icons to preserve installed app identity.
    path.write_text(json.dumps(data,separators=(",",":"))+"\\n",encoding="utf-8")

def patch_worker(source: str) -> str:
    if "BOOTSTRAP_AUTH_BUILD='v6230'" not in source:
        raise AssertionError("V6230 service-worker baseline missing")
    if "GLOBE_ROOT_BUILD='v6231'" in source:
        raise AssertionError("V6231 service-worker marker already exists")
    return source.replace(
        "const BOOTSTRAP_AUTH_BUILD='v6230';",
        "const BOOTSTRAP_AUTH_BUILD='v6230';\\nconst GLOBE_ROOT_BUILD='v6231';",
        1,
    )

def patch_signin_template(source: str) -> str:
    source=replace_once(
        source,
        "const requestedReturn=params.get('return')||'/app/';",
        "const requestedReturn=params.get('return')||'/';",
        "sign-in default return destination",
    )
    source=replace_once(
        source,
        "const RETURN_TO=requestedReturn.startsWith('/')&&!requestedReturn.startsWith('//')&&!requestedReturn.includes('\\\\')?requestedReturn:'/app/';",
        "const safeReturn=requestedReturn.startsWith('/')&&!requestedReturn.startsWith('//')&&!requestedReturn.includes('\\\\')?requestedReturn:'/';\\nconst RETURN_TO=(safeReturn==='/app/'||safeReturn==='/app')?'/':safeReturn;",
        "legacy app return normalization",
    )
    if "bp_auth_v5045" not in source or API_ORIGIN not in source:
        raise AssertionError("Sign-in page lost PC runtime or shared session storage")
    return source

def patch_site(site: Path) -> None:
    required={
        "index.html":site/"index.html",
        "landing.js":site/"landing.js",
        "app.js":site/"app.js",
        "app/index.html":site/"app"/"index.html",
        "sw.js":site/"sw.js",
        "manifest.webmanifest":site/"manifest.webmanifest",
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

    old_signin=(site/"signin"/"index.html").read_text(encoding="utf-8")
    signin=patch_signin_template(old_signin)
    (site/"signin"/"index.html").write_text(signin,encoding="utf-8")

    checks={
        "landing.js":["/signin/?mode=","encodeURIComponent('/')","sw.js?v=6231-globe-root",API_ORIGIN],
        "app.js":["window.__BP_APP_BUILD_VERSION__=6231;","location.replace('/')",API_ORIGIN],
        "index.html":["landing.js?v=6231-globe-root","bpMobileLazyLoaderV6229","bpw-globe-aura","manifest.webmanifest?v=6231-globe-root"],
        "app/index.html":["bp-canonical-globe-entry-v6231","return=%2F","manifest.webmanifest?v=6231-globe-root","app.js?v=6231-globe-root"],
        "sw.js":["BOOTSTRAP_AUTH_BUILD='v6230'","GLOBE_ROOT_BUILD='v6231'"],
        "manifest.webmanifest":[],
        "signin/index.html":["bp_auth_v5045","token?grant_type=password",API_ORIGIN,"||'/'","safeReturn==='/app/'"],
    }
    for name,needles in checks.items():
        content=(site/name).read_text(encoding="utf-8")
        for needle in needles:
            if needle not in content:
                raise AssertionError(f"{name}: missing required marker {needle}")
    manifest=json.loads(required["manifest.webmanifest"].read_text(encoding="utf-8"))
    if manifest.get("start_url")!="/" or manifest.get("id")!="/bridgepoint-intelligence-v5050":
        raise AssertionError("PWA manifest did not keep its identity and switch its launch to the canonical globe")
    print("BRIDGEPOINT_GLOBE_ROOT_HANDOFF_V6231_PATCH_PASS")
    print("Website sign-in, app sign-in, direct app launch and PWA start_url now converge on /.")
    print("Package-specific /app/?page=... routes remain available.")
    print("Globe, card, animation and all feature assets remain untouched.")

if __name__=="__main__":
    if len(sys.argv)!=2:
        raise SystemExit("Usage: apply_globe_root_handoff_v6231.py SITE_DIRECTORY")
    patch_site(Path(sys.argv[1]))
