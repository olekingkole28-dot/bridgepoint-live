import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "recovery"))
from apply_welcome_space_v6257 import (
    BUILD, CACHE_NAME, SW_URL, patch_app_index, patch_app_js, patch_bundle,
    patch_landing_js, patch_legacy_app, patch_manifest, patch_root_html,
    patch_site, patch_worker,
)

APP_JS_REGISTER = "navigator.serviceWorker.register('/sw.js?v=6247-universal-fresh-entry-sidewalk',{updateViaCache:'none'})"
TIME_JOB = "  ['time-slider',async()=>{const m=await import('./world-v2300-time-slider.js?v=6170-no-cloud-toggle-always-on');window.__BP_WORLD_TIME_SLIDER_V5908__=m.initWorldTimeSlider(world,rpc)}],"
LANDING_TIME_CATCH = "    .catch(e=>console.warn('BridgePoint 30-day world change scrub unavailable',e));"
ACTIVATE_OLD = "self.addEventListener('activate',e=>e.waitUntil((async()=>{for(const k of await caches.keys()){const legacy=k.startsWith('bridgepoint-universe-')||k.startsWith('bridgepoint-intelligence-launch-')||(k.startsWith('bp-intelligence-')&&k!==V);if(legacy)await caches.delete(k)}await self.clients.claim()})()));"
NAV_OLD = """if(e.request.mode==='navigate'){
  e.respondWith(fetch(e.request,{cache:'no-store'}).then(r=>{if(r&&r.ok){const c=r.clone();caches.open(V).then(x=>x.put(e.request,c)).catch(()=>{})}return r}).catch(async()=>caches.match(e.request)||caches.match(u.pathname.startsWith('/app')?'/app/':'/')));
  return;
 }"""


def root_fixture():
    return """<!doctype html><html lang="en"><head>
<script id="bp-instant-globe-entry-v5938">window.addEventListener('pageshow',()=>{if(['/','/index.html','/app/','/app/index.html'].includes(location.pathname))window.scrollTo(0,0)},{once:true});</script>
<link rel="manifest" href="./manifest.webmanifest">
<script src="./landing.js?v=6247-universal-fresh-entry"></script>
</head><body>
<div id="bpWelcomeGateV1" data-phase="intro">
  <div class="bpw-layout">
    <div class="bpw-starfield bpw-stars-far" id="bpwStarsFarV4"></div>
    <div class="bpw-starfield bpw-stars-near" id="bpwStarsNearV4" aria-hidden="true"></div>
    <div class="bpw-globe-aura" aria-hidden="true"></div>
    <div class="bpw-stage"><div class="bpw-wordmark-wrap">
      <div class="bpw-wordmark" id="bpwWordmarkV3" role="img" aria-label="Welcome to BridgePoint Intelligence" data-title="WELCOME TO BRIDGEPOINT INTELLIGENCE"></div>
    </div></div>
    <div class="bpw-status">INITIALIZING</div>
    <div class="bpw-gate-panel" id="bpwGatePanelV1">
      <p class="bpw-explainer"><strong>BridgePoint Intelligence</strong> brings properties, buildings, infrastructure, weather and real-world signals together in one live 3D globe.</p>
      <div class="bpw-actions">
        <button class="bpw-create auth-open" data-mode="signup">CREATE FREE ACCOUNT</button>
        <button class="bpw-signin auth-open" data-mode="signin">SIGN IN TO BRIDGEPOINT</button>
      </div>
    </div>
    <button class="bpw-sound" id="bpwSoundV1">ENABLE SOUND</button>
  </div>
</div>
<script id="bpWelcomeGateScriptV1">
  const gate=document.getElementById('bpWelcomeGateV1');
  const wordmark=document.getElementById('bpwWordmarkV3');
  function buildSpaceStars(){
    const make=(id,count)=>{const el=document.getElementById(id);for(let i=0;i<count;i++)el.appendChild(document.createElement('i'));};
    make('bpwStarsFarV4',152);make('bpwStarsNearV4',76);
  }
  buildSpaceStars();
  function buildWordmark(){
    wordmark.textContent='WELCOME TO BRIDGEPOINT INTELLIGENCE';
  }
</script>
</body></html>"""


def app_index_fixture():
    return """<script id="bp-app-entry-gate-v6247">
if(!fresh||!valid){location.replace('/?auth=signin&return='+encodeURIComponent(returnTo));return}
catch(_){location.replace('/?auth=signin&return='+encodeURIComponent(location.pathname+location.search))}
<link rel="manifest" href="../manifest.webmanifest">
<script type="module" src="../app.js?v=6247-universal-fresh-entry&sidewalk=6247">
"""


def legacy_fixture():
    return """<link rel="manifest" href="./manifest.webmanifest"><meta http-equiv="refresh" content="4;url=/app/?migrated=legacy-intelligence-v5820">
<a href="/app/" style="color:#4ad9ff">Open</a>
navigator.serviceWorker.register('/sw.js?v=6218-tree-viewport-renderer-refresh')
if(k.startsWith('bp-intelligence-')&&k!=='bp-intelligence-v5820')await caches.delete(k)
finally{location.replace('/app/?migrated=legacy-intelligence-v5820')}
"""


def worker_fixture():
    return """const V='""" + CACHE_NAME + """';
self.addEventListener('install',()=>self.skipWaiting());
""" + ACTIVATE_OLD + """
self.addEventListener('fetch',e=>{
 if(e.request.method!=='GET')return;
 const u=new URL(e.request.url);
""" + NAV_OLD + """
 e.respondWith(fetch(e.request));
});
"""


class WelcomeSpaceV6257Tests(unittest.TestCase):
    def test_root_uses_one_existing_earth_and_no_ground_sky_button(self):
        out = patch_root_html(root_fixture())
        self.assertIn("bpWelcomeGateStylesV6257", out)
        self.assertIn('src="/bridgepoint-welcome-space-v6257.js?v=6257"', out)
        self.assertIn('class="bpw-celestial-system" aria-hidden="true"></div>', out)
        self.assertNotIn("bpwCelestialCanvasV6257", out)
        self.assertNotIn('class="bpw-globe-aura"', out)
        self.assertNotIn('class="bpw-explainer"', out)
        self.assertNotIn("WELCOME TO", out)
        self.assertIn("event.persisted", out)
        self.assertIn("location.reload()", out)
        self.assertIn('data-mode="signup"', out)
        self.assertIn('data-mode="signin"', out)
        self.assertNotIn("data-space-ground", out)

    def test_app_entry_and_legacy_install_route_to_current_root_gate(self):
        app = patch_app_index(app_index_fixture())
        self.assertEqual(app.count("/?return="), 2)
        self.assertNotIn("/?auth=signin&return=", app)
        self.assertIn("app.js?v=6257-welcome-space-fix", app)
        self.assertIn("manifest.webmanifest?v=6257-welcome-space-fix", app)
        legacy = patch_legacy_app(legacy_fixture())
        self.assertIn('content="0;url=/"', legacy)
        self.assertIn("location.replace('/')", legacy)
        self.assertIn(SW_URL, legacy)
        self.assertIn("k!=='" + CACHE_NAME + "'", legacy)

    def test_app_and_landing_receive_in_app_celestial_sky_loader(self):
        with tempfile.TemporaryDirectory() as folder:
            app = Path(folder) / "app.js"
            app.write_text(APP_JS_REGISTER + "\n" + TIME_JOB + "\n" + TIME_JOB + "\n")
            patch_bundle(app)
            patch_app_js(app)
            app_text = app.read_text()
            self.assertIn(SW_URL, app_text)
            self.assertEqual(app_text.count("bridgepoint-celestial-sky-v6257.js?v=6257"), 1)
            time_slider = (ROOT / "release-v2300" / "world-v2300-time-slider.js").read_text()
            self.assertIn("data-skyview", time_slider)

            landing = Path(folder) / "landing.js"
            landing.write_text(APP_JS_REGISTER + "\n" + LANDING_TIME_CATCH + "\n")
            patch_bundle(landing)
            patch_landing_js(landing)
            landing_text = landing.read_text()
            self.assertIn(SW_URL, landing_text)
            self.assertIn("bridgepoint-celestial-sky-v6257.js?v=6257", landing_text)

    def test_app_and_landing_sky_loader_patches_are_idempotent(self):
        with tempfile.TemporaryDirectory() as folder:
            app = Path(folder) / "app.js"
            app_source = APP_JS_REGISTER + "\\n" + TIME_JOB + "\\n" + TIME_JOB + "\\n"
            app.write_text(app_source)
            patch_bundle(app)
            patch_app_js(app)
            once = app.read_text()
            patch_app_js(app)
            self.assertEqual(app.read_text(), once)
            self.assertEqual(once.count("['celestial-sky'"), 1)

            landing = Path(folder) / "landing.js"
            landing.write_text(APP_JS_REGISTER + "\\n" + LANDING_TIME_CATCH + "\\n")
            patch_bundle(landing)
            patch_landing_js(landing)
            once = landing.read_text()
            patch_landing_js(landing)
            self.assertEqual(landing.read_text(), once)
            self.assertEqual(once.count("void import('./bridgepoint-celestial-sky-v6257.js?v=6257')"), 1)

    def test_service_worker_removes_stale_entry_documents_and_refuses_old_offline_shell(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "sw.js"
            path.write_text(worker_fixture())
            patch_worker(path)
            text = path.read_text()
            self.assertIn("BRIDGEPOINT_LAUNCH_EXPERIENCE_BUILD='" + BUILD + "'", text)
            self.assertIn("const active=await caches.open(V)", text)
            self.assertIn("await active.delete(request)", text)
            self.assertIn("const entryRoute=", text)
            self.assertIn("if(entryRoute)return new Response", text)
            self.assertIn("clients.claim()", text)
            self.assertIn("caches.match(e.request)||caches.match", text)

    def test_manifest_keeps_installed_app_identity(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "manifest.webmanifest"
            path.write_text(json.dumps({
                "id": "/bridgepoint-intelligence-v5050",
                "name": "BridgePoint Intelligence",
                "start_url": "/app/",
                "scope": "/",
                "display": "standalone",
            }))
            patch_manifest(path, "/bridgepoint-intelligence-v5050")
            data = json.loads(path.read_text())
            self.assertEqual(data["start_url"], "/")
            self.assertEqual(data["id"], "/bridgepoint-intelligence-v5050")

    def test_worker_script_and_urls_are_versioned_but_offline_cache_key_is_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "landing.js"
            path.write_text(APP_JS_REGISTER)
            patch_bundle(path)
            self.assertIn(SW_URL, path.read_text())
            self.assertNotIn("v6247-universal-fresh-entry-sidewalk',{updateViaCache", path.read_text())

    def test_welcome_module_has_no_second_earth_or_ground_button_and_keeps_interactions(self):
        module = (ROOT / "rebuild-v5000" / "bridgepoint-welcome-space-v6257.js").read_text()
        self.assertNotIn("earthMesh", module)
        self.assertNotIn("earthMaterial", module)
        self.assertNotIn("data-space-ground", module)
        self.assertNotIn("groundMode", module)
        for marker in (
            "new THREE.Raycaster()", "logarithmicDepthBuffer: true",
            "camera.updateProjectionMatrix()", "renderer.setSize(width,height,false)",
            "MOON_PERIOD_DAYS = 27.321661", "function focusBody(body)",
            "function resetView()", "focusedObject&&!transitionStart&&!dragging",
            "setResponsiveSunPosition()", "data-space-reset",
        ):
            self.assertIn(marker, module)

    def test_moon_focus_uses_nasa_dem_tiles_and_can_reach_surface_zoom(self):
        module = (ROOT / "rebuild-v5000" / "bridgepoint-welcome-space-v6257.js").read_text()
        for marker in (
            "function createMoonTerrainController()",
            "Apollo15_MetricCam_Gray_Global_1024ppd",
            "LRO_WAC_Mosaic_Global_303ppd_v02",
            "heightRangeMeters: [-8000, 8000]",
            "pixels[pixelOffset] / 255 * 16000 - 8000",
            "new THREE.MeshStandardMaterial({",
            "moonMaterial.uniforms.uTerrainMask.value = maskTexture",
            "viewState==='moon'?0.000003:1.8",
            "camera.near=0.00000005",
            "camera.near=0.001",
            "const activePointers=new Map()",
            "function refreshLunarTerrainFromView()",
            "focusLocalTarget?moonMesh.localToWorld",
            "function rotateMoonBy(dx,dy,twist=0)",
            "gesture.center.x-gestureCenter.x",
            "zoomCameraBy(pinchDistance/gesture.distance)",
            "moonUserRotation.multiply(yaw).multiply(pitch).multiply(roll)",
            "function enforceMoonCameraClearance()",
            "moonTerrainController?.surfaceRadiusAt(latitude,longitude)",
            "coverageContext.putImageData(coverageImage, 0, 0)",
            "depthTest: true, depthWrite: true, transparent: false",
            "#include <logdepthbuf_vertex>",
            "#include <logdepthbuf_fragment>",
        ):
            self.assertIn(marker, module)

        # The Sun's original focus camera branch remains intact.
        self.assertIn(
            "animateCamera(world.clone().add(new THREE.Vector3(0,0,sunRadiusVisual*2.7)),world,1.8);",
            module,
        )

    def test_celestial_sky_is_attached_to_the_app_map_without_a_second_canvas(self):
        module = (ROOT / "rebuild-v5000" / "bridgepoint-celestial-sky-v6257.js").read_text()
        self.assertIn("function apparentAngularRadiusPx", module)
        self.assertIn("initBridgePointCelestialSky", module)
        self.assertIn("createElementNS", module)
        self.assertNotIn("createElement('canvas')", module)



    def test_complete_site_patch_changes_only_entry_files_and_adds_two_modules(self):
        with tempfile.TemporaryDirectory() as folder:
            site = Path(folder)
            (site / "app").mkdir()
            (site / "app" / "intelligence-launch").mkdir()
            (site / "index.html").write_text(root_fixture())
            (site / "app" / "index.html").write_text(app_index_fixture())
            (site / "landing.js").write_text(APP_JS_REGISTER + "\n" + LANDING_TIME_CATCH + "\n")
            (site / "app.js").write_text(APP_JS_REGISTER + "\n" + TIME_JOB + "\n" + TIME_JOB + "\n")
            (site / "sw.js").write_text(worker_fixture())
            (site / "manifest.webmanifest").write_text(json.dumps({
                "id": "/bridgepoint-intelligence-v5050", "name": "BridgePoint Intelligence",
                "start_url": "/app/", "scope": "/", "display": "standalone"
            }))
            (site / "app" / "intelligence-launch" / "index.html").write_text(legacy_fixture())
            (site / "app" / "intelligence-launch" / "manifest.webmanifest").write_text(json.dumps({
                "id": "/app/intelligence-launch/", "name": "BridgePoint Intelligence",
                "start_url": "/app/", "scope": "/", "display": "standalone"
            }))
            for name in ("bridgepoint-welcome-space-v6257.js", "bridgepoint-celestial-sky-v6257.js"):
                (site / name).write_text((ROOT / "rebuild-v5000" / name).read_text())

            before = {p.relative_to(site).as_posix() for p in site.rglob("*") if p.is_file()}
            patch_site(site)
            after = {p.relative_to(site).as_posix() for p in site.rglob("*") if p.is_file()}
            self.assertEqual(after - before, set())
            root = (site / "index.html").read_text()
            self.assertIn('src="/bridgepoint-welcome-space-v6257.js?v=6257"', root)
            self.assertIn("event.persisted", root)
            self.assertIn("location.reload()", root)
            self.assertNotIn("data-space-ground", root)
            app_text = (site / "app.js").read_text()
            landing_text = (site / "landing.js").read_text()
            self.assertIn("bridgepoint-celestial-sky-v6257.js?v=6257", app_text)
            self.assertIn("bridgepoint-celestial-sky-v6257.js?v=6257", landing_text)
            worker = (site / "sw.js").read_text()
            self.assertIn("entryRoute=", worker)
            self.assertIn("if(entryRoute)return new Response", worker)
            self.assertLess(worker.index("if(entryRoute)return new Response"), worker.index("return caches.match(e.request)||caches.match"))

    def test_patch_rejects_unexpected_root_baseline(self):
        with self.assertRaises(AssertionError):
            patch_root_html("<html><body><div id='bpWelcomeGateV1'></div></body></html>")


if __name__ == "__main__":
    unittest.main()
