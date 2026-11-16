from pathlib import Path
import json
import unittest

ROOT = Path(__file__).resolve().parents[1]
PATCH = ROOT / "patches" / "earth-star-occlusion-v6294"
WELCOME = (PATCH / "bridgepoint-welcome-space-v6260.js").read_text(encoding="utf-8")
GAIA = (PATCH / "bridgepoint-gaia-galaxy-v6270.js").read_text(encoding="utf-8")
EXPLORER = (PATCH / "bridgepoint-app-space-explorer-v1.js").read_text(encoding="utf-8")
MOON_DIR = ROOT / "assets" / "moon" / "v1"
MOON_MANIFEST = json.loads((MOON_DIR / "manifest.json").read_text(encoding="utf-8"))


class MoonAndEarthOcclusionV6301Tests(unittest.TestCase):
    def test_gaia_stars_are_clipped_to_the_projected_earth_silhouette_each_frame(self):
        for marker in (
            "const {THREE,scene,camera,host,canvas,controls,starsGroup",
            "const earthOcclusionMesh=bodyRefs?.earth||null;",
            "function updateEarthScreenOcclusion(uniforms)",
            "uEarthScreenMask",
            "uEarthMaskEnabled",
            "distance(gl_FragCoord.xy,uEarthScreenMask.xy)<uEarthScreenMask.z",
            "updateEarthScreenOcclusion(starState.points?.material?.uniforms)",
        ):
            self.assertIn(marker, GAIA)
        self.assertIn("depthTest:true,depthWrite:false", GAIA)
        self.assertIn("points.name='Gaia DR3 measured stellar positions'", GAIA)

    def test_shared_ray_sphere_occlusion_covers_all_celestial_materials_without_hiding_foreground_objects(self):
        for marker in (
            "function patchCelestialEarthMaterial(material)",
            "function scanSceneForEarthOcclusion()",
            "function updateEarthRayOcclusionUniforms()",
            "vBpEarthWorldPosition",
            "uBpEarthCenter",
            "uBpEarthRadius",
            "bpEarthHit>0.0&&bpEarthHit<bpEarthObjectDistance-bpEarthEpsilon",
            "scanSceneForEarthOcclusion();",
            "updateEarthRayOcclusionUniforms();",
            "window.__BP_EARTH_OCCLUSION_DIAGNOSTIC_V6302__",
            "foregroundBodiesPreserved:true",
            "colorWrite===false",
        ):
            self.assertIn(marker, GAIA)
        self.assertIn("depthTest:true,depthWrite:false", GAIA)
        self.assertIn("Earth opaque depth occluder", WELCOME)
        self.assertIn("bodyRefs:{earth:earthDepthOccluder,moon:moonMesh,sun:sunMesh}", WELCOME)

    def test_ray_sphere_occlusion_hides_far_side_objects_but_keeps_near_side_planets(self):
        def occluded(origin, target, center=(0.0, 0.0, 0.0), radius=1.0):
            delta = tuple(target[i] - origin[i] for i in range(3))
            distance = sum(v*v for v in delta) ** 0.5
            if distance <= 1e-9:
                return False
            ray = tuple(v/distance for v in delta)
            to_earth = tuple(center[i]-origin[i] for i in range(3))
            along = sum(to_earth[i]*ray[i] for i in range(3))
            perp_sq = max(0.0, sum(v*v for v in to_earth)-along*along)
            radius_sq = radius*radius
            if along <= 0.0 or perp_sq >= radius_sq:
                return False
            half_chord = max(0.0, radius_sq-perp_sq) ** 0.5
            near, far = along-half_chord, along+half_chord
            earth_hit = near if near > 0.0 else far
            return earth_hit > 0.0 and earth_hit < distance-max(1e-5,radius*1e-5)

        camera = (0.0, 0.0, 5.0)
        self.assertTrue(occluded(camera, (0.0, 0.0, -8.0)), "far-side star must be hidden")
        self.assertTrue(occluded(camera, (0.0, 0.0, -2.0)), "far-side planet must be hidden")
        self.assertFalse(occluded(camera, (0.0, 0.0, 2.0)), "near-side Moon/planet must remain visible")
        self.assertFalse(occluded(camera, (4.0, 0.0, -8.0)), "objects on rays missing Earth must remain visible")
        self.assertTrue(occluded((0.0, 0.0, 0.0), (0.0, 0.0, -8.0)), "inside-Earth camera must still hide far-side stars")

    def test_real_3d_moon_loads_the_published_global_dem_color_and_apollo_patch(self):
        for marker in (
            "const VERSION = 'v6302-earth-ray-opaque'",
            "function createMoonTerrainController()",
            "const ASSET = '/assets/moon/v1/'",
            "moon-global-height-4ppd-u16.png",
            "moon-apollo15-4deg-512ppd-height-u16.png",
            "moon-lroc-color-4k.webp",
            "function buildGlobalTerrain()",
            "function buildHighResolutionPatch()",
            "moonMaterial.uniforms.uBaseTextureReady.value = 1",
            " LOLA (4 pixels/degree)",
        ):
            self.assertIn(marker, WELCOME)
        self.assertNotIn("moon-global-height-16ppd-u16.png", WELCOME)
        self.assertEqual(MOON_MANIFEST["globalHeight"]["file"], "moon-global-height-4ppd-u16.png")
        self.assertEqual(MOON_MANIFEST["globalHeight"]["samplesPerDegree"], 4)
        for file_name in (
            MOON_MANIFEST["globalHeight"]["file"],
            MOON_MANIFEST["color"]["file"],
            MOON_MANIFEST["highResolutionPatches"][0]["file"],
            "moon-feature-labels.json",
        ):
            self.assertTrue((MOON_DIR / file_name).is_file(), file_name)

    def test_live_sun_feed_and_three_minute_refresh_are_preserved(self):
        for marker in (
            "const LIVE_SOLAR_REFRESH_MS=3*60*1000;",
            "solar-live.json?bp_refresh=",
            "solarState.sourceImageMetadata=records",
            "solarState.liveImageAppliedAtUtc[source.key]",
            "bundled local snapshots retained as fallback",
        ):
            self.assertIn(marker, WELCOME)

    def test_existing_planetary_systems_and_shared_scene_are_preserved(self):
        self.assertIn("Earth opaque depth occluder", WELCOME)
        self.assertIn("bodyRefs:{earth:earthDepthOccluder,moon:moonMesh,sun:sunMesh}", WELCOME)
        self.assertIn("bridgepoint-gaia-galaxy-v6270.js?v=v6302-earth-ray-opaque", WELCOME)
        self.assertIn("initBridgePointSaturnSystem", GAIA)
        self.assertIn("initBridgePointMarsSystem", GAIA)
        self.assertIn("name:'Titan'", (ROOT / "recovery" / "bridgepoint-saturn-system-v6282.js").read_text(encoding="utf-8"))
        self.assertIn("Phobos", (ROOT / "rebuild-v5000" / "bridgepoint-mars-system-v6291.js").read_text(encoding="utf-8"))

    def test_signed_in_explorer_loads_the_same_repaired_welcome_renderer(self):
        self.assertIn(
            "/bridgepoint-welcome-space-v6260.js?v=v6302-earth-ray-opaque&space=app-explorer-v1",
            EXPLORER,
        )
        self.assertIn("Open the interactive 3D Sun, Moon, Saturn, Mars and their moons", EXPLORER)


if __name__ == "__main__":
    unittest.main()
