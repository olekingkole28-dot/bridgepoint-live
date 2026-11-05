from __future__ import annotations
import re, sys
from pathlib import Path

API_ORIGIN = "https://solaris-boat-upgrades-stocks.trycloudflare.com"
SUPABASE_ORIGIN = "https://xdfsjztwgsbmabshzsjw.supabase.co"
SIGNIN_TEMPLATE = Path(__file__).with_name("bootstrapped-signin-v6230.html")

def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise AssertionError(f"{label}: expected one match, found {count}")
    return text.replace(old, new, 1)

def patch_landing(source: str) -> str:
    if "bp:welcome-gate-unlocked-v6229" not in source:
        raise AssertionError("V6229 mobile entry baseline missing")
    source = replace_once(
        source,
        "const SUPA='" + SUPABASE_ORIGIN + "'",
        "const SUPA='" + API_ORIGIN + "'",
        "landing local API origin",
    )
    source = replace_once(
        source,
        "function openAuth(v){setMode(v||'signup');$('authModal').hidden=false;setTimeout(()=>$('authEmail').focus(),50)}",
        "function openAuth(v){const next=v==='signin'?'signin':'signup';location.assign('/signin/?mode='+next+'&return='+encodeURIComponent('/app/'))}",
        "landing sign-in handoff",
    )
    old_sw = "navigator.serviceWorker.register('/sw.js?v=6222-goes-cloud-mask-volumetric',{updateViaCache:'none'})"
    source = replace_once(
        source,
        old_sw,
        "navigator.serviceWorker.register('/sw.js?v=6230-bootstrapped-auth',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{})",
        "landing PWA worker refresh",
    )
    if SUPABASE_ORIGIN in source or "bp_auth_v5045" not in source:
        raise AssertionError("Landing bundle still has a cloud auth origin or lost the shared session key")
    return source

def patch_app(source: str) -> str:
    source = replace_once(
        source,
        "const SUPA='" + SUPABASE_ORIGIN + "'",
        "const SUPA='" + API_ORIGIN + "'",
        "app local API origin",
    )
    source, count = re.subn(r"window\.__BP_APP_BUILD_VERSION__=\d+;", "window.__BP_APP_BUILD_VERSION__=6230;", source, count=1)
    if count != 1:
        raise AssertionError("App build version marker was not updated")
    if SUPABASE_ORIGIN in source or "bp_auth_v5045" not in source:
        raise AssertionError("App bundle still has a cloud auth origin or lost the shared session key")
    return source

def patch_root_html(source: str) -> str:
    source = replace_once(
        source,
        "landing.js?v=6229-mobile-entry",
        "landing.js?v=6230-bootstrapped-auth",
        "root landing cache-bust",
    )
    if "bpMobileLazyLoaderV6229" not in source or "bpw-globe-aura" not in source:
        raise AssertionError("Existing globe and mobile entry markers were lost")
    return source

def patch_app_html(source: str) -> str:
    old_gate = "location.replace('/?auth=signin')"
    if source.count(old_gate) != 2:
        raise AssertionError(f"Expected both app entry gates, found {source.count(old_gate)}")
    source = source.replace(old_gate, "location.replace('/signin/?mode=signin&return=%2Fapp%2F')")
    anchor = "</script>\n<link rel=\"icon\""
    worker_script = """</script>
<script id="bp-bootstrap-sw-refresh-v6230">if('serviceWorker' in navigator){navigator.serviceWorker.register('/sw.js?v=6230-bootstrapped-auth',{updateViaCache:'none'}).then(r=>r.update()).catch(()=>{})}</script>
<link rel="icon\""""
    source = replace_once(source, anchor, worker_script, "app PWA worker refresh insertion")
    pattern = re.compile(r'(\bsrc=["\'])\.\./app\.js\?v=[^"\']*(["\'])')
    source, count = pattern.subn(r'\1../app.js?v=6230-bootstrapped-auth\2', source, count=1)
    if count != 1:
        raise AssertionError("App module cache-bust reference was not found")
    if "/?auth=signin" in source:
        raise AssertionError("A legacy app gate still points to the homepage")
    return source

def patch_service_worker(source: str) -> str:
    if "BOOTSTRAP_AUTH_BUILD='v6230'" in source:
        raise AssertionError("Service worker already has V6230 marker")
    match = re.search(r"^const V='([^']+)';", source, flags=re.M)
    if not match:
        raise AssertionError("Could not find service-worker cache key")
    # Keep the existing cache key unchanged. This forces a worker script update
    # without deleting the previous worker's locally saved offline resources.
    return source[:match.end()] + "\nconst BOOTSTRAP_AUTH_BUILD='v6230';" + source[match.end():]

def patch_site(site: Path) -> None:
    required = {
        "index.html": site / "index.html",
        "landing.js": site / "landing.js",
        "app.js": site / "app.js",
        "app/index.html": site / "app" / "index.html",
        "sw.js": site / "sw.js",
    }
    for label, path in required.items():
        if not path.is_file():
            raise FileNotFoundError(f"Missing Pages artifact file: {label}")
    required["landing.js"].write_text(patch_landing(required["landing.js"].read_text(encoding="utf-8")), encoding="utf-8")
    required["app.js"].write_text(patch_app(required["app.js"].read_text(encoding="utf-8")), encoding="utf-8")
    required["index.html"].write_text(patch_root_html(required["index.html"].read_text(encoding="utf-8")), encoding="utf-8")
    required["app/index.html"].write_text(patch_app_html(required["app/index.html"].read_text(encoding="utf-8")), encoding="utf-8")
    required["sw.js"].write_text(patch_service_worker(required["sw.js"].read_text(encoding="utf-8")), encoding="utf-8")

    signin = site / "signin" / "index.html"
    signin.parent.mkdir(parents=True, exist_ok=True)
    signin.write_text(SIGNIN_TEMPLATE.read_text(encoding="utf-8"), encoding="utf-8")

    checks = {
        "landing.js": ["https://solaris-boat-upgrades-stocks.trycloudflare.com", "/signin/?mode="],
        "app.js": ["https://solaris-boat-upgrades-stocks.trycloudflare.com", "__BP_APP_BUILD_VERSION__=6230"],
        "index.html": ["landing.js?v=6230-bootstrapped-auth", "bpMobileLazyLoaderV6229"],
        "app/index.html": ["/signin/?mode=signin", "bp-bootstrap-sw-refresh-v6230", "app.js?v=6230-bootstrapped-auth"],
        "sw.js": ["BOOTSTRAP_AUTH_BUILD='v6230'"],
        "signin/index.html": ["bp_auth_v5045", "auth/v1/token?grant_type=password", API_ORIGIN],
    }
    for name, needles in checks.items():
        content = (site / name).read_text(encoding="utf-8")
        for needle in needles:
            if needle not in content:
                raise AssertionError(f"{name}: missing required marker {needle}")
    print("BRIDGEPOINT_BOOTSTRAPPED_AUTH_V6230_PATCH_PASS")
    print("Static site remains on bridgepointintelligence.online; auth and app API calls use the PC-backed runtime.")
    print("PWA cache key preserved; only its worker script is versioned, so cached offline assets are not cleared.")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit("Usage: apply_bootstrapped_auth_v6230.py SITE_DIRECTORY")
    patch_site(Path(sys.argv[1]))
