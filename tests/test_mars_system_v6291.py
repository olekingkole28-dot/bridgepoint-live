from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
GAIA = (ROOT / "rebuild-v5000" / "bridgepoint-gaia-galaxy-v6270.js").read_text(encoding="utf-8")
SCENE = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text(encoding="utf-8")
MARS = (ROOT / "rebuild-v5000" / "bridgepoint-mars-system-v6291.js").read_text(encoding="utf-8")
BUILDER = (ROOT / "recovery" / "build_mars_assets_v6291.py").read_text(encoding="utf-8")


class MarsSystemV6291Tests(unittest.TestCase):
    def test_mars_is_added_to_the_existing_picker_and_uses_shared_runtime(self):
        self.assertIn("value=\"mars\">Mars", GAIA)
        self.assertIn("initBridgePointMarsSystem", GAIA)
        self.assertIn("bridgepoint-mars-system-v6291.js?v=6291-mars-orbit-geometry", GAIA)
        self.assertIn("getMarsPosition:", GAIA)
        self.assertIn("marsController?.update?.()", GAIA)
        self.assertIn("marsController?.dispose?.()", GAIA)

    def test_mars_uses_the_existing_isolated_celestial_camera_path(self):
        for marker in (
            "const marsBody=['mars','phobos','deimos'].includes(key)",
            "key==='mars'?'mars-system'",
            "mars-surface",
            "viewState==='mars-system'||viewState==='mars-surface'",
            "['mars','phobos','deimos'].includes(object?.userData?.body)",
            "marsModuleMode:",
        ):
            self.assertIn(marker, SCENE)

    def test_global_mars_mesh_uses_mola_height_displacement_and_viking_color(self):
        for marker in (
            "MarsSystemGroup",
            "MOLA MEGDR globally displaced 3D terrain",
            "uMarsHeight",
            "uMarsHeightMin",
            "uMarsHeightMax",
            "THREE.RedFormat",
            "mars-viking-mdim-global.webp",
            "height/mola-global-bpmh.bin.gz",
        ):
            self.assertIn(marker, MARS)

    def test_phobos_and_deimos_use_real_pds_meshes_and_independent_orbits(self):
        for marker in (
            "phobos-thomas-grid-v1.bin.gz",
            "deimos-thomas-grid-v1.bin.gz",
            "phobos-thomas-viking-mosaic.webp",
            "deimos-thomas-viking-mosaic.webp",
            "PDS Thomas irregular 3D shape model",
            "moonOrbitPosition",
            "MARS_MU_KM3_S2",
            "orbitCurve",
            "semimajorAxisKm",
            "inclinationDeg",
            "clickables.push(mesh)",
        ):
            self.assertIn(marker, MARS)

    def test_gale_hirise_local_terrain_is_loaded_only_at_close_zoom(self):
        for marker in (
            "gale-hirise-dtm-bpmg.bin.gz",
            "Gale Crater HiRISE 1.01 m/pixel local replacement terrain mesh",
            "nearGale",
            "state.loaded.galeHiRISE",
            "sourcePixelScaleM:1.0117467945795",
        ):
            self.assertIn(marker, MARS)
        self.assertIn("DTEEC_009149_1750_009294_1750_U01.IMG", BUILDER)

    def test_builder_uses_public_nasa_usgs_pds_and_hirise_sources(self):
        for marker in (
            "Mars_MGS_MOLA_DEM_mosaic_global_463m.tif",
            "Mars_Viking_MDIM21_ClrMosaic_1km.jpg",
            "ast-sat.thomas.shape-models_V1_0.zip",
            "hirise.lpl.arizona.edu/PDS/DTM/PSP/",
            "b\"BPMH\"",
            "b\"BPMG\"",
            "b\"BPSM\"",
        ):
            self.assertIn(marker, BUILDER)


if __name__ == "__main__":
    unittest.main()
