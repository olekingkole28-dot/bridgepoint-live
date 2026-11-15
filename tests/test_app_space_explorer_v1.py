from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
APP = (ROOT / "rebuild-v5000" / "app-index.html").read_text(encoding="utf-8")
EXPLORER = (ROOT / "rebuild-v5000" / "bridgepoint-app-space-explorer-v1.js").read_text(encoding="utf-8")
WELCOME = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text(encoding="utf-8")
GAIA = (ROOT / "rebuild-v5000" / "bridgepoint-gaia-galaxy-v6270.js").read_text(encoding="utf-8")


class AppCelestialExplorerV1Tests(unittest.TestCase):
    def test_signed_in_app_loads_the_restored_space_explorer(self):
        self.assertIn("bridgepoint-app-space-explorer-v1.js?v=1-restored-celestial-system", APP)
        self.assertIn('id="liveMap"', APP)
        self.assertIn('class="map-tools"', APP)
        self.assertIn("SPACE 3D", EXPLORER)
        self.assertIn("window.__BP_WELCOME_SYNC_SPACE_ZOOM_V1__ = syncMapCanvas", EXPLORER)
        self.assertIn("syncMapCanvas(1)", EXPLORER)

    def test_explorer_mounts_the_existing_shared_celestial_scene(self):
        self.assertIn("id = 'bpWelcomeGateV1'", EXPLORER)
        self.assertIn("className = 'bpw-celestial-system'", EXPLORER)
        self.assertIn("/bridgepoint-welcome-space-v6260.js?v=6292-mars-night-side-shading", EXPLORER)
        self.assertIn("initBridgePointSolarCosmos", WELCOME + GAIA)
        self.assertIn("initBridgePointSaturnSystem", GAIA)
        self.assertIn("initBridgePointMarsSystem", GAIA)

    def test_overlay_pause_and_resume_prevent_background_rendering(self):
        self.assertIn("renderActive=false", WELCOME)
        self.assertIn("renderActive=true", WELCOME)
        self.assertIn("pause(){renderActive=false}", WELCOME)
        self.assertIn("resume(){if(disposed||renderActive)return;renderActive=true;resize();if(!document.hidden)requestAnimationFrame(render)}", WELCOME)


if __name__ == "__main__":
    unittest.main()
