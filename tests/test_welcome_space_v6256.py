import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "recovery"))
from apply_welcome_space_v6256 import (
    BUILD, CACHE_NAME, SW_URL, patch_app_index, patch_legacy_app,
    patch_manifest, patch_root_html, patch_worker,
)


def root_fixture() -> str:
    return """<!doctype html><html><head></head><body>
<div id="bpWelcomeGateV1" data-phase="intro">
  <div class="bpw-layout">
    <div class="bpw-starfield bpw-stars-far" id="bpwStarsFarV4"></div>
    <div class="bpw-starfield bpw-stars-near" id="bpwStarsNearV4" aria-hidden="true"></div>
    <div class="bpw-globe-aura" aria-hidden="true"></div>
    <div class="bpw-stage">
      <div class="bpw-wordmark-wrap">
        <div class="bpw-wordmark" id="bpwWordmarkV3" role="img" aria-label="Welcome to BridgePoint Intelligence" data-title="WELCOME TO BRIDGEPOINT INTELLIGENCE"></div>
      </div>
    </div>
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


class WelcomeSpaceV6256Tests(unittest.TestCase):
    def test_root_installs_modular_scene_without_legacy_canvas_renderer(self):
        out = patch_root_html(root_fixture())
        self.assertIn("bpWelcomeGateStylesV6256", out)
        self.assertIn('id="bpwCelestialCanvasV6255"', out)
        self.assertIn('src="/bridgepoint-welcome-space-v6256.js?v=6256"', out)
        self.assertIn('data-mode="signup"', out)
        self.assertIn('data-mode="signin"', out)
        self.assertIn("bpw-wordmark-main", out)
        self.assertNotIn('class="bpw-globe-aura"', out)
        self.assertNotIn('class="bpw-explainer"', out)
        self.assertNotIn("starCount", out)
        self.assertIn("Rendering is provided by bridgepoint-welcome-space-v6256.js", out)

    def test_app_entry_preserves_return_path_and_uses_new_cache_version(self):
        src = """<script id="bp-app-entry-gate-v6247">
if(!fresh||!valid){location.replace('/?auth=signin&return='+encodeURIComponent(returnTo));return}
catch(_){location.replace('/?auth=signin&return='+encodeURIComponent(location.pathname+location.search))}
<link rel="manifest" href="../manifest.webmanifest">
<script type="module" src="../app.js?v=6247-universal-fresh-entry&sidewalk=6247">
"""
        out = patch_app_index(src)
        self.assertEqual(out.count("/?return="), 2)
        self.assertNotIn("/?auth=signin&return=", out)
        self.assertIn("app.js?v=6256-welcome-space-scene&sidewalk=6247", out)
        self.assertIn("manifest.webmanifest?v=6256-welcome-space-scene", out)

    def test_legacy_entry_keeps_offline_cache_and_routes_to_root(self):
        src = """<link rel="manifest" href="./manifest.webmanifest"><meta http-equiv="refresh" content="4;url=/app/?migrated=legacy-intelligence-v5820">
<a href="/app/" style="color:#4ad9ff">Open</a>
navigator.serviceWorker.register('/sw.js?v=6218-tree-viewport-renderer-refresh')
if(k.startsWith('bp-intelligence-')&&k!=='bp-intelligence-v5820')await caches.delete(k)
finally{location.replace('/app/?migrated=legacy-intelligence-v5820')}
"""
        out = patch_legacy_app(src)
        self.assertIn('content="0;url=/"', out)
        self.assertIn('href="/"', out)
        self.assertIn("location.replace('/')", out)
        self.assertIn(SW_URL, out)
        self.assertIn("k!=='bp-intelligence-v6247-universal-fresh-entry-sidewalk'", out)

    def test_manifest_start_url_changes_without_changing_identity(self):
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

    def test_worker_version_updates_without_deleting_existing_cache(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "sw.js"
            path.write_text("const V='" + CACHE_NAME + "';\n")
            patch_worker(path)
            result = path.read_text()
            self.assertIn("const V='" + CACHE_NAME + "';", result)
            self.assertIn("BRIDGEPOINT_LAUNCH_EXPERIENCE_BUILD='" + BUILD + "'", result)

    def test_scene_module_contains_3d_focus_resize_and_orbit_contracts(self):
        module = (ROOT / "rebuild-v5000" / "bridgepoint-welcome-space-v6256.js").read_text()
        for marker in (
            "new THREE.Raycaster()", "logarithmicDepthBuffer: true",
            "camera.updateProjectionMatrix()", "renderer.setSize(width,height,false)",
            "MOON_PERIOD_DAYS = 27.321661", "data-space-ground",
            "function focusBody(body)", "function setGroundSky()",
            "moonMesh.lookAt(earth.position)", "new THREE.PointLight",
        ):
            self.assertIn(marker, module)

    def test_unexpected_root_baseline_is_rejected(self):
        with self.assertRaises(AssertionError):
            patch_root_html("<html><body><div id='bpWelcomeGateV1'></div></body></html>")


if __name__ == "__main__":
    unittest.main()
