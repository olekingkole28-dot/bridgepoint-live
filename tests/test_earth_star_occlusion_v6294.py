from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
PATCH = ROOT / "patches" / "earth-star-occlusion-v6294"
WELCOME = (PATCH / "bridgepoint-welcome-space-v6260.js").read_text(encoding="utf-8")
GAIA = (PATCH / "bridgepoint-gaia-galaxy-v6270.js").read_text(encoding="utf-8")
EXPLORER = (PATCH / "bridgepoint-app-space-explorer-v1.js").read_text(encoding="utf-8")


class EarthStarOcclusionV6294Tests(unittest.TestCase):
    def test_gaia_stars_are_clipped_to_projected_earth_silhouette(self):
        for marker in (
            "uEarthScreenMask",
            "uEarthMaskEnabled",
            "gl_FragCoord.xy",
            "distance(gl_FragCoord.xy,uEarthScreenMask.xy)<uEarthScreenMask.z",
            "updateEarthScreenOcclusion(starState.points?.material?.uniforms)",
            "earthOcclusionMesh=bodyRefs?.earth||null",
            "const earthMaskCanvas=canvas&&",
        ):
            self.assertIn(marker, GAIA)
        self.assertIn("depthTest:true,depthWrite:false", GAIA)

    def test_existing_earth_anchor_and_planet_modules_remain_the_shared_scene(self):
        self.assertIn("Earth opaque depth occluder", WELCOME)
        self.assertIn("bodyRefs:{earth:earthDepthOccluder,moon:moonMesh,sun:sunMesh}", WELCOME)
        self.assertIn("bridgepoint-gaia-galaxy-v6270.js?v=v6294-earth-opaque", WELCOME)
        self.assertIn("initBridgePointSaturnSystem", GAIA)
        self.assertIn("initBridgePointMarsSystem", GAIA)
        self.assertIn("name:'Titan'", (ROOT / "recovery" / "bridgepoint-saturn-system-v6282.js").read_text(encoding="utf-8"))
        self.assertIn("Phobos", (ROOT / "rebuild-v5000" / "bridgepoint-mars-system-v6291.js").read_text(encoding="utf-8"))

    def test_signed_in_explorer_loads_the_same_opaque_earth_renderer(self):
        self.assertIn("bridgepoint-welcome-space-v6260.js?v=v6294-earth-opaque&space=app-explorer-v1", EXPLORER)


if __name__ == "__main__":
    unittest.main()
