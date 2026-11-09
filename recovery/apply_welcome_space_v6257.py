from __future__ import annotations

import json
import re
import sys
from pathlib import Path

BUILD = "v6266-solar-realism"
# Moon terrain assets are bundled locally under assets/moon/v1; runtime requests stay same-origin.
SW_URL = "/sw.js?v=6266-solar-realism"
CACHE_NAME = "bp-intelligence-v6247-universal-fresh-entry-sidewalk"


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise AssertionError(f"{label}: expected exactly one match, found {count}")
    return source.replace(old, new, 1)


def replace_prefix_once(source: str, pattern: str, replacement: str, label: str) -> str:
    source, count = re.subn(pattern, replacement, source, count=1)
    if count != 1:
        raise AssertionError(f"{label}: expected exactly one match, found {count}")
    return source


def patch_stars(source: str) -> str:
    # The dedicated Three.js module owns the welcome starfield, Moon and Sun.
    pattern = re.compile(r"(?ms)^  function buildSpaceStars\(\)\{.*?^  \}\n  buildSpaceStars\(\);")
    replacement = """  function buildSpaceStars(){
    // Rendering is provided by bridgepoint-welcome-space-v6260.js.
  }
  buildSpaceStars();"""
    source, count = pattern.subn(replacement, source, count=1)
    if count != 1:
        raise AssertionError("Legacy starfield hook missing")
    pattern = re.compile(r"(?ms)^  function buildWordmark\(\)\{.*?^  \}\n")
    replacement = """  function buildWordmark(){
    if(wordmark)wordmark.dataset.built='1';
    return 0;
  }
"""
    source, count = pattern.subn(replacement, source, count=1)
    if count != 1:
        raise AssertionError("Wordmark builder missing")
    return source


def launch_styles() -> str:
    return r"""<style id="bpWelcomeGateStylesV6257">
#bpWelcomeGateV1{pointer-events:auto!important;background:radial-gradient(ellipse at 50% 50%,rgba(2,8,18,.015),rgba(0,2,7,.14) 72%,rgba(0,1,5,.30))!important}
html.bpw-entry-locked #previewMap{background:#00030a!important}
html.bpw-entry-locked #previewMap canvas{filter:contrast(1.17) saturate(1.10) brightness(1.025)}
#bpWelcomeGateV1 .bpw-globe-aura{display:none!important}
#bpWelcomeGateV1 .bpw-starfield{background:radial-gradient(ellipse at 16% 26%,rgba(36,79,151,.20),transparent 38%),radial-gradient(ellipse at 82% 70%,rgba(31,71,130,.18),transparent 42%),radial-gradient(ellipse at 52% 48%,rgba(4,13,29,.12),transparent 68%)}
#bpWelcomeGateV1 .bpw-starfield canvas{display:none!important}
#bpWelcomeGateV1 .bpw-celestial-system{position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;z-index:9!important;overflow:hidden;pointer-events:none;perspective:1200px;isolation:isolate;opacity:1!important;visibility:visible!important}
#bpWelcomeGateV1 .bpw-celestial-canvas{display:none!important}
#bpWelcomeGateV1 .bpw-wordmark-wrap{top:calc(env(safe-area-inset-top,0px) + clamp(18px,3.2vh,38px))!important;left:0!important;right:0!important;transform:none!important;z-index:10!important;padding:0 12px!important}
#bpWelcomeGateV1 .bpw-wordmark-wrap:before,#bpWelcomeGateV1 .bpw-wordmark-wrap:after{content:"";position:absolute;top:50%;width:clamp(12px,8vw,110px);height:1px;background:linear-gradient(90deg,transparent,rgba(132,197,236,.66));box-shadow:0 0 9px rgba(102,184,235,.24)}
#bpWelcomeGateV1 .bpw-wordmark-wrap:before{right:calc(50% + clamp(112px,25vw,260px))}
#bpWelcomeGateV1 .bpw-wordmark-wrap:after{left:calc(50% + clamp(112px,25vw,260px));transform:scaleX(-1)}
#bpWelcomeGateV1 .bpw-wordmark-static{position:relative!important;display:flex!important;flex-direction:column;align-items:center;justify-content:center;gap:clamp(2px,.7vh,7px);width:100%;max-width:100%;white-space:normal!important;text-align:center;font-family:"Orbitron","Eurostile","Bank Gothic",system-ui,sans-serif!important;font-weight:900!important;text-transform:uppercase!important;transform:perspective(1100px) rotateX(8deg)!important;transform-style:preserve-3d!important;filter:drop-shadow(0 9px 11px rgba(0,0,0,.72))!important}
#bpWelcomeGateV1 .bpw-wordmark-main{display:block;font-size:clamp(30px,7.1vw,78px);line-height:.94;letter-spacing:.105em;margin-right:-.105em;color:#f4fbff;-webkit-text-fill-color:#f4fbff;-webkit-text-stroke:.6px rgba(220,241,255,.78);text-shadow:0 1px 0 #d8e8f6,0 2px 0 #94b2cb,0 3px 0 #55738f,0 4px 0 #263f59,0 7px 0 #10253a,0 11px 20px rgba(0,0,0,.88),0 0 24px rgba(112,190,242,.28)}
#bpWelcomeGateV1 .bpw-wordmark-sub{display:block;font-size:clamp(12px,2.55vw,24px);line-height:1.15;letter-spacing:.43em;margin-right:-.43em;font-weight:700;color:#a9d5f1;-webkit-text-fill-color:#a9d5f1;-webkit-text-stroke:.25px rgba(223,242,255,.48);text-shadow:0 1px 0 #5d7892,0 3px 8px rgba(0,0,0,.86),0 0 15px rgba(90,179,236,.30)}
#bpWelcomeGateV1 .bpw-letter-frame,#bpWelcomeGateV1 .bpw-letter-face{animation:none!important;will-change:auto!important}
#bpWelcomeGateV1 .bpw-status,#bpWelcomeGateV1 .bpw-sound{display:none!important}
#bpWelcomeGateV1 .bpw-gate-panel{left:12px!important;right:12px!important;bottom:calc(env(safe-area-inset-bottom,0px) + clamp(20px,4vh,42px))!important;z-index:12!important;display:flex!important;gap:0!important;padding:0!important;border:0!important;border-radius:0!important;background:transparent!important;box-shadow:none!important;backdrop-filter:none!important;opacity:1!important;visibility:visible!important;transform:none!important;transition:none!important;pointer-events:auto!important}
#bpWelcomeGateV1 .bpw-explainer{display:none!important}
#bpWelcomeGateV1 .bpw-actions{display:flex!important;flex-wrap:wrap;justify-content:center;align-items:center;gap:12px;width:100%;margin:0!important}
#bpWelcomeGateV1 .bpw-actions button{min-width:min(230px,42vw);max-width:calc(100vw - 28px);margin:0!important;animation:none!important;transition:background .2s ease,border-color .2s ease!important;backdrop-filter:none!important;box-shadow:0 8px 24px rgba(0,0,0,.42),inset 0 1px 0 rgba(255,255,255,.24)!important}
@media(max-width:620px){
#bpWelcomeGateV1 .bpw-wordmark-wrap{padding:0 8px!important}
#bpWelcomeGateV1 .bpw-wordmark-wrap:before{right:calc(50% + 104px)}
#bpWelcomeGateV1 .bpw-wordmark-wrap:after{left:calc(50% + 104px)}
#bpWelcomeGateV1 .bpw-wordmark-main{font-size:clamp(27px,8.5vw,42px);letter-spacing:.065em;margin-right:-.065em}
#bpWelcomeGateV1 .bpw-wordmark-sub{font-size:clamp(11px,3.1vw,16px);letter-spacing:.36em;margin-right:-.36em}
#bpWelcomeGateV1 .bpw-gate-panel{left:10px!important;right:10px!important;bottom:calc(env(safe-area-inset-bottom,0px) + 16px)!important}
#bpWelcomeGateV1 .bpw-actions{flex-direction:column;gap:9px}
#bpWelcomeGateV1 .bpw-actions button{width:min(100%,340px);min-width:0;padding:14px 16px}
}
@media(prefers-reduced-motion:reduce){#bpWelcomeGateV1 .bpw-wordmark-static{transform:none!important}}
</style>"""


def patch_root_html(source: str) -> str:
    # The last verified Pages artifact already has the V6264 welcome design.
    # When present, retain that markup and only bump the scene module URL.
    if 'class="bpw-wordmark bpw-wordmark-static"' in source:
        for marker in (
            'class="bpw-celestial-system" aria-hidden="true"></div>',
            "bpWelcomeGateStylesV6257",
            'data-mode="signup"',
            'data-mode="signin"',
            "event.persisted",
        ):
            if marker not in source:
                raise AssertionError(f"Current welcome root is missing {marker}")
        old_tag = '<script type="module" src="/bridgepoint-welcome-space-v6260.js?v=6265-solar-globe"></script>'
        new_tag = '<script type="module" src="/bridgepoint-welcome-space-v6260.js?v=6266-solar-realism"></script>'
        if old_tag in source:
            source = replace_once(source, old_tag, new_tag, "bump current welcome module URL")
        elif new_tag not in source:
            raise AssertionError("Current welcome module URL is neither V6264, V6265 nor V6266")
        if 'data-space-ground' in source:
            raise AssertionError("Ground sky control must not appear on the welcome screen")
        return source

    required = (
        '<div id="bpWelcomeGateV1"',
        'id="bpwStarsFarV4"',
        'id="bpwStarsNearV4"',
        'id="bpwWordmarkV3"',
        'class="bpw-globe-aura"',
        'data-mode="signup"',
        'data-mode="signin"',
        "function buildSpaceStars(){",
        "function buildWordmark(){",
    )
    for marker in required:
        if marker not in source:
            raise AssertionError(f"Root landing baseline is missing {marker}")

    source = replace_once(source, '    <div class="bpw-globe-aura" aria-hidden="true"></div>\n', "", "remove Earth aura element")
    source = replace_once(
        source,
        'class="bpw-wordmark" id="bpwWordmarkV3" role="img" aria-label="Welcome to BridgePoint Intelligence" data-title="WELCOME TO BRIDGEPOINT INTELLIGENCE"></div>',
        'class="bpw-wordmark bpw-wordmark-static" id="bpwWordmarkV3" role="img" aria-label="BridgePoint Intelligence" data-title="BridgePoint Intelligence"><span class="bpw-wordmark-main">BRIDGEPOINT</span><span class="bpw-wordmark-sub">INTELLIGENCE</span></div>',
        "replace animated welcome text with static title",
    )
    source = replace_once(
        source,
        '      <p class="bpw-explainer"><strong>BridgePoint Intelligence</strong> brings properties, buildings, infrastructure, weather and real-world signals together in one live 3D globe.</p>\n',
        "",
        "remove extra welcome copy",
    )
    near_anchor = '    <div class="bpw-starfield bpw-stars-near" id="bpwStarsNearV4" aria-hidden="true"></div>\n'
    source = replace_once(source, near_anchor, near_anchor + """    <div class="bpw-celestial-system" aria-hidden="true"></div>\n""", "insert Moon and Sun stage")
    source = patch_stars(source)
    module_tag = '<script type="module" src="/bridgepoint-welcome-space-v6260.js?v=6266-solar-realism"></script>\n'
    source = replace_once(source, "</body>", module_tag + "</body>", "load the modular Three.js welcome scene")
    source = replace_once(source, "</head>", launch_styles() + "\n</head>", "install responsive welcome styling")
    pageshow_old = "window.addEventListener('pageshow',()=>{if(['/','/index.html','/app/','/app/index.html'].includes(location.pathname))window.scrollTo(0,0)},{once:true});"
    pageshow_new = """window.addEventListener('pageshow',event=>{
 const entryRoutes=['/','/index.html','/app/','/app/index.html','/app/intelligence-launch','/app/intelligence-launch/'];
 if(event.persisted&&entryRoutes.includes(location.pathname)){location.reload();return;}
 if(entryRoutes.includes(location.pathname))window.scrollTo(0,0);
});"""
    source = replace_once(source, pageshow_old, pageshow_new, "reload entry page restored from back-forward cache")
    if source.count('class="bpw-globe-aura"') != 0 or "WELCOME TO" in source or 'data-space-ground' in source:
        raise AssertionError("The root welcome markup did not complete its launch migration")
    return source

def patch_app_index(source: str) -> str:
    if 'id="bp-app-entry-gate-v6247"' not in source:
        raise AssertionError("V6247 app entry gate baseline is missing")
    source = source.replace("/?auth=signin&return=", "/?return=")
    if source.count("/?return=") != 2 or "/?auth=signin&return=" in source:
        raise AssertionError("App launch redirects must preserve the return route through the root gate")
    old_manifest = '../manifest.webmanifest?v=6265-solar-globe"'
    new_manifest = '../manifest.webmanifest?v=6266-solar-realism"'
    if old_manifest in source:
        source = replace_once(source, old_manifest, new_manifest, "bump current app manifest URL")
    else:
        source = replace_once(source, '../manifest.webmanifest"', new_manifest, "bust the app manifest URL")
    source = replace_prefix_once(
        source,
        r"(app\.js\?v=)(?:6247-universal-fresh-entry|6264-geometric-crater-bowls|6265-solar-globe)",
        r"\g<1>6266-solar-realism",
        "bust the app bundle URL",
    )
    return source

def patch_legacy_app(source: str) -> str:
    # Already-migrated installed legacy route: preserve redirects and cache policy.
    if 'content="0;url=/"' in source and "location.replace('/')" in source:
        old = "sw.js?v=6265-solar-globe"
        new = "sw.js?v=6266-solar-realism"
        if old in source:
            source = replace_once(source, old, new, "bump current legacy service-worker URL")
        elif new not in source:
            raise AssertionError("Current legacy service-worker URL is neither V6264, V6265 nor V6266")
        return source
    source = replace_once(source, 'content="4;url=/app/?migrated=legacy-intelligence-v5820"', 'content="0;url=/"', "make legacy installed app route immediately to the canonical gate")
    source = replace_once(source, 'href="/app/" style="color:#4ad9ff"', 'href="/" style="color:#4ad9ff"', "legacy app fallback link")
    source = replace_once(source, "sw.js?v=6218-tree-viewport-renderer-refresh", "sw.js?v=6266-solar-realism", "refresh legacy app service worker")
    source = replace_once(source, "k.startsWith('bp-intelligence-')&&k!=='bp-intelligence-v5820'", "k.startsWith('bp-intelligence-')&&k!=='bp-intelligence-v6247-universal-fresh-entry-sidewalk'", "preserve the existing offline cache during legacy-app migration")
    source = replace_once(source, "location.replace('/app/?migrated=legacy-intelligence-v5820')", "location.replace('/')", "legacy app final route")
    return source

def patch_manifest(path: Path, expected_id: str) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("id") != expected_id:
        raise AssertionError(f"{path}: unexpected installed-app identity {data.get('id')!r}")
    if data.get("start_url") not in ("/app/", "/"):
        raise AssertionError(f"{path}: unexpected previous start_url {data.get('start_url')!r}")
    data["start_url"] = "/"
    path.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")


def patch_bundle(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    new_url = "navigator.serviceWorker.register('/sw.js?v=6266-solar-realism',{updateViaCache:'none'})"
    old_urls = (
        "navigator.serviceWorker.register('/sw.js?v=6247-universal-fresh-entry-sidewalk',{updateViaCache:'none'})",
        "navigator.serviceWorker.register('/sw.js?v=6264-geometric-crater-bowls',{updateViaCache:'none'})",
    )
    if new_url not in source:
        for old in old_urls:
            if old in source:
                source = replace_once(source, old, new_url, f"{path.name} service-worker refresh")
                break
        else:
            raise AssertionError(f"{path.name}: current service-worker registration URL is unknown")
    path.write_text(source, encoding="utf-8")

def patch_app_js(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    sky_job = "['celestial-sky',async()=>{const m=await import('./bridgepoint-celestial-sky-v6257.js?v=6257');window.__BP_CELESTIAL_SKY_V6257__=m.initBridgePointCelestialSky(world)}],"
    if source.count(sky_job) == 1:
        return
    if source.count(sky_job) != 0:
        raise AssertionError(f"{path.name}: duplicate celestial sky app jobs")
    marker = "  ['time-slider',async()=>{const m=await import('./world-v2300-time-slider.js?v=6170-no-cloud-toggle-always-on');window.__BP_WORLD_TIME_SLIDER_V5908__=m.initWorldTimeSlider(world,rpc)}],"
    if source.count(marker) != 2:
        raise AssertionError(f"{path.name}: expected two existing time-slider jobs")
    pos = source.rfind(marker) + len(marker)
    source = source[:pos] + "\n  " + sky_job + source[pos:]
    path.write_text(source, encoding="utf-8")


def patch_landing_js(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    sky_import = "void import('./bridgepoint-celestial-sky-v6257.js?v=6257')"
    if source.count(sky_import) == 1:
        return
    if source.count(sky_import) != 0:
        raise AssertionError(f"{path.name}: duplicate celestial sky imports")
    marker = "    .catch(e=>console.warn('BridgePoint 30-day world change scrub unavailable',e));"
    source = replace_once(
        source,
        marker,
        marker + """
   // Celestial objects appear in the app's existing LOOK UP · SKY VIEW mode.
   void import('./bridgepoint-celestial-sky-v6257.js?v=6257')
    .then(m=>{window.__BP_CELESTIAL_SKY_V6257__=m.initBridgePointCelestialSky(world)})
    .catch(e=>console.warn('BridgePoint celestial sky overlay unavailable',e));""",
        "initialize celestial sky on the main globe",
    )
    path.write_text(source, encoding="utf-8")


def patch_worker(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    current_build = "BRIDGEPOINT_LAUNCH_EXPERIENCE_BUILD='v6265-solar-globe'"
    next_build = "BRIDGEPOINT_LAUNCH_EXPERIENCE_BUILD='" + BUILD + "'"
    if current_build in source and "entryRoute=" in source:
        source = replace_once(source, current_build, next_build, "bump current welcome service-worker release marker")
        path.write_text(source, encoding="utf-8")
        return
    if next_build in source and "entryRoute=" in source:
        return
    source = replace_once(
        source,
        "const V='" + CACHE_NAME + "';",
        "const V='" + CACHE_NAME + "';\n" + next_build + ";",
        "bump worker script while preserving the existing offline cache name",
    )
    activate_old = "self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys()){const legacy=k.startsWith('bridgepoint-universe-')||k.startsWith('bridgepoint-intelligence-launch-')||(k.startsWith('bp-intelligence-')&&k!==V);if(legacy)await caches.delete(k)}await self.clients.claim()})()));"
    activate_new = """self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const active=await caches.open(V);
 // Never let a saved offline HTML entry shadow the current welcome/app shell.
 for(const request of await active.keys()){
  const url=new URL(request.url);
  if(url.origin===self.location.origin&&['/','/index.html','/app/','/app/index.html','/app/intelligence-launch','/app/intelligence-launch/'].includes(url.pathname))await active.delete(request);
 }
 for(const k of await caches.keys()){
  const legacy=k.startsWith('bridgepoint-universe-')||k.startsWith('bridgepoint-intelligence-launch-')||(k.startsWith('bp-intelligence-')&&k!==V);
  if(legacy)await caches.delete(k);
 }
 await self.clients.claim();
})()));"""
    source = replace_once(source, activate_old, activate_new, "purge only stale cached entry documents at activation")
    navigation_old = """if(e.request.mode==='navigate'){
  e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r&&r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c)).catch(()=>{})}return r}).catch(async()=>caches.match(e.request)||caches.match(u.pathname.startsWith('/app')?'/app/':'/')));
  return;
 }"""
    navigation_new = """if(e.request.mode==='navigate'){
  const entryRoute=['/','/index.html','/app/','/app/index.html','/app/intelligence-launch','/app/intelligence-launch/'].includes(u.pathname);
  e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{
   if(r&&r.ok&&!entryRoute){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c)).catch(()=>{})}
   return r;
  }).catch(async()=>{
   if(entryRoute)return new Response('BridgePoint needs a network connection to load the current application release.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
   return caches.match(e.request)||caches.match(u.pathname.startsWith('/app')?'/app/':'/');
  }));
  return;
 }"""
    source = replace_once(source, navigation_old, navigation_new, "serve current online entry routes without stale HTML fallback")
    path.write_text(source, encoding="utf-8")

def patch_site(site: Path) -> None:
    required = {
        "root": site / "index.html",
        "app index": site / "app" / "index.html",
        "landing bundle": site / "landing.js",
        "app bundle": site / "app.js",
        "service worker": site / "sw.js",
        "root manifest": site / "manifest.webmanifest",
        "legacy app index": site / "app" / "intelligence-launch" / "index.html",
        "legacy app manifest": site / "app" / "intelligence-launch" / "manifest.webmanifest",
        "welcome space module": site / "bridgepoint-welcome-space-v6260.js",
        "celestial sky module": site / "bridgepoint-celestial-sky-v6257.js",
        "solar manifest": site / "assets" / "sun" / "v2" / "manifest.json",
        "solar photosphere": site / "assets" / "sun" / "v2" / "sun-photosphere-v2.webp",
        "solar activity": site / "assets" / "sun" / "v2" / "sun-coronal-activity-v2.webp",
        "solar far-side EUV": site / "assets" / "sun" / "v2" / "sun-stereoB-farside-EUV-2014-09-27-v2.webp",
    }
    for label, path in required.items():
        if not path.is_file():
            raise FileNotFoundError(f"Production Pages artifact is missing {label}: {path}")

    root = required["root"].read_text(encoding="utf-8")
    root = patch_root_html(root)
    old_root_manifest = './manifest.webmanifest?v=6265-solar-globe"'
    new_root_manifest = './manifest.webmanifest?v=6266-solar-realism"'
    if old_root_manifest in root:
        root = replace_once(root, old_root_manifest, new_root_manifest, "bump current root manifest URL")
    else:
        root = replace_once(root, './manifest.webmanifest"', new_root_manifest, "bust the root manifest URL")
    root = replace_prefix_once(
        root,
        r"(landing\.js\?v=)(?:6247-universal-fresh-entry|6264-geometric-crater-bowls|6265-solar-globe)",
        r"\g<1>6266-solar-realism",
        "bust the landing bundle URL",
    )
    required["root"].write_text(root, encoding="utf-8")

    app_index = patch_app_index(required["app index"].read_text(encoding="utf-8"))
    required["app index"].write_text(app_index, encoding="utf-8")
    patch_bundle(required["landing bundle"])
    patch_bundle(required["app bundle"])
    patch_app_js(required["app bundle"])
    patch_landing_js(required["landing bundle"])
    patch_worker(required["service worker"])

    patch_manifest(required["root manifest"], "/bridgepoint-intelligence-v5050")
    legacy = patch_legacy_app(required["legacy app index"].read_text(encoding="utf-8"))
    old_legacy_manifest = './manifest.webmanifest?v=6265-solar-globe"'
    new_legacy_manifest = './manifest.webmanifest?v=6266-solar-realism"'
    if old_legacy_manifest in legacy:
        legacy = replace_once(legacy, old_legacy_manifest, new_legacy_manifest, "bump current legacy manifest URL")
    else:
        legacy = replace_once(legacy, './manifest.webmanifest"', new_legacy_manifest, "bust the legacy app manifest URL")
    required["legacy app index"].write_text(legacy, encoding="utf-8")
    patch_manifest(required["legacy app manifest"], "/app/intelligence-launch/")

    checks = {
        "root": [
            'class="bpw-wordmark bpw-wordmark-static"',
            ">INTELLIGENCE</span></div>",
            "bpw-celestial-system",
            "bpw-wordmark-main",
            "bpWelcomeGateStylesV6257",
            'src="/bridgepoint-welcome-space-v6260.js?v=6266-solar-realism"',
            'data-mode="signup"',
            'data-mode="signin"',
        ],
        "app index": [
            "/?return=",
            "app.js?v=6266-solar-realism",
            "manifest.webmanifest?v=6266-solar-realism",
        ],
        "landing bundle": [SW_URL, "bridgepoint-celestial-sky-v6257.js?v=6257"],
        "app bundle": [SW_URL, "bridgepoint-celestial-sky-v6257.js?v=6257"],
        "service worker": ["const V='" + CACHE_NAME + "';", "BRIDGEPOINT_LAUNCH_EXPERIENCE_BUILD='v6266-solar-realism'", "entryRoute", "clients.claim()"],
        "welcome space module": [
            "new THREE.Raycaster()", "logarithmicDepthBuffer: true", "MOON_PERIOD_DAYS = 27.321661",
            "data-space-reset", "uPhotosphereMap", "sun-photosphere-v2.webp", "sun-photosphere-height-v2.webp",
            "sun-coronal-activity-v2.webp", "sun-stereoB-farside-EUV-2014-09-27-v2.webp",
            "addCoronalLoop", "createSolarPlasmaMaterial", "applySunReliefFromImage",
            "syncSunDepthGeometry", "earthDepthOccluder", "Sun solid opaque depth occluder",
            "function panSunSurface", "panSunSurface(dx,dy)", "function tiltSunCamera", "uFarSideMap"
        ],
        "celestial sky module": ["apparentAngularRadiusPx", "bp6257-sun-surface", "initBridgePointCelestialSky"],
        "legacy app index": ['content="0;url=/"', "location.replace('/')", "sw.js?v=6266-solar-realism"],
    }
    for label, markers in checks.items():
        content = required[label].read_text(encoding="utf-8")
        for marker in markers:
            if marker not in content:
                raise AssertionError(f"{label}: missing required launch marker {marker}")

    root_manifest = json.loads(required["root manifest"].read_text(encoding="utf-8"))
    legacy_manifest = json.loads(required["legacy app manifest"].read_text(encoding="utf-8"))
    if root_manifest.get("start_url") != "/" or legacy_manifest.get("start_url") != "/":
        raise AssertionError("Installed app manifests must both launch at the canonical root gate")
    if root_manifest.get("id") != "/bridgepoint-intelligence-v5050":
        raise AssertionError("The current installed-app identity changed")
    if legacy_manifest.get("id") != "/app/intelligence-launch/":
        raise AssertionError("The legacy installed-app identity changed")
    print("BRIDGEPOINT_WELCOME_SPACE_V6265_SOLAR_PATCH_PASS")
    print("Website, app, current PWA and legacy PWA route to the same root globe gate.")
    print("The Sun uses BridgePoint-hosted SDO photosphere, AIA activity and HMI magnetic textures with interactive 3D corona.")
    print("Existing lunar terrain assets, offline data caches and authentication/session logic are preserved.")


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: apply_welcome_space_v6257.py SITE_DIRECTORY")
    patch_site(Path(sys.argv[1]))


if __name__ == "__main__":
    main()
