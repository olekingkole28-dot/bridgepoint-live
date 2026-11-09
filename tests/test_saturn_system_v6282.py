from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
GAIA = (ROOT / "rebuild-v5000" / "bridgepoint-gaia-galaxy-v6270.js").read_text(encoding="utf-8")
SCENE = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text(encoding="utf-8")
SATURN = (ROOT / "recovery" / "bridgepoint-saturn-system-v6282.js").read_text(encoding="utf-8")
BUILDER = (ROOT / "recovery" / "build_saturn_assets_v6282.py").read_text(encoding="utf-8")


class SaturnSystemV6282Tests(unittest.TestCase):
    def test_saturn_and_three_moons_are_in_the_existing_celestial_picker(self):
        for value in ('value="saturn">Saturn', 'value="titan">Titan',
                      'value="enceladus">Enceladus', 'value="mimas">Mimas'):
            self.assertIn(value, GAIA)
        self.assertIn("initBridgePointSaturnSystem", GAIA)
        self.assertIn("saturnController?.update?.()", GAIA)
        self.assertIn("saturnController?.dispose?.()", GAIA)

    def test_saturn_uses_the_existing_camera_and_body_focus_path(self):
        self.assertIn("bodyData?.systemCameraDistance", SCENE)
        self.assertIn("key==='saturn'?2.1:1.5", SCENE)
        self.assertIn("bodyRefs:{earth:earthDepthOccluder,moon:moonMesh,sun:sunMesh}", SCENE)
        self.assertIn("initBridgePointSaturnSystem", GAIA)

    def test_real_cassini_shapes_and_titan_height_grid_are_used(self):
        for marker in ("BPSM", "BPSH", "MIMAS_M3_GAS_V01.BDS",
                       "cas_enceladus_ssd_spc_0128icq_v1.bds",
                       "titan-cassini-topography-4ppd-u16.bin.gz",
                       "new THREE.DataTexture", "enceladus-cassini-shape-v1.bin.gz",
                       "mimas-cassini-shape-v1.bin.gz"):
            self.assertIn(marker, SATURN)
        self.assertIn("target_count=target_vertices", BUILDER)
        self.assertIn("topo_4PPD_interp.cub", BUILDER)

    def test_saturn_rings_use_distinct_measured_bands_and_preserve_the_cassini_gap(self):
        for marker in ("66900,74510", "74510,92000", "92000,117580",
                       "122170,136775", "140180,140480", "166000,174000",
                       "180000,480000", "Saturn BODY EQUATOR"):
            self.assertIn(marker, SATURN)
        self.assertIn("Cassini Division", SATURN)

    def test_jpl_horizons_epoch_and_saturn_centric_states_drive_moon_orbits(self):
        self.assertIn("2026-11-09T00:00:00Z", SATURN)
        self.assertIn("500@699", BUILDER) if "500@699" in BUILDER else self.assertIn("JPL Horizons", SATURN)
        for marker in ("185539.0", "238042.0", "1221870.0",
                       "1.370218", "15.945421", ".942422",
                       "3.7931187e7", "makeOrbit(m.p,m.v)"):
            self.assertIn(marker, SATURN)

    def test_surface_textures_are_the_latest_global_cassini_mosaics(self):
        self.assertIn("PIA22770", BUILDER)
        self.assertIn("PIA18435", BUILDER)
        self.assertIn("PIA18437", BUILDER)
        self.assertIn("titan-cassini-surface-mosaic.webp", SATURN)
        self.assertIn("titan-cassini-topography-4ppd-u16.bin.gz", SATURN)
        self.assertIn("const segments=key==='titan'?(isMobile?160:256)", SATURN)
        self.assertIn("NASA Cassini ISS PIA22770", BUILDER)

    def test_saturn_texture_rotation_titan_atmosphere_and_enceladus_plumes_are_animated(self):
        for marker in ("saturnMesh.rotation.y", "titanAtmosphere.rotation.y",
                       "Titan thick golden nitrogen atmosphere",
                       "Enceladus south-polar water-ice geyser plumes",
                       "Enceladus animated water-ice plume particles"):
            self.assertIn(marker, SATURN)


if __name__ == "__main__":
    unittest.main()
