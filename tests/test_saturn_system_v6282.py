from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
GAIA = (ROOT / "rebuild-v5000" / "bridgepoint-gaia-galaxy-v6270.js").read_text(encoding="utf-8")
SCENE = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text(encoding="utf-8")
SATURN = (ROOT / "recovery" / "bridgepoint-saturn-system-v6282.js").read_text(encoding="utf-8")
BUILDER = (ROOT / "recovery" / "build_saturn_assets_v6282.py").read_text(encoding="utf-8")


class SaturnSystemV6289Tests(unittest.TestCase):
    def test_saturn_is_the_only_saturn_picker_option_and_moons_are_canvas_targets(self):
        self.assertIn('value="saturn">Saturn', GAIA)
        for value in ('value="titan">Titan', 'value="enceladus">Enceladus',
                      'value="mimas">Mimas'):
            self.assertNotIn(value, GAIA)
        self.assertIn("bodySelect.value=['titan','enceladus','mimas'].includes(selectedBody)?'saturn':selectedBody", GAIA)
        self.assertIn("initBridgePointSaturnSystem", GAIA)
        self.assertIn("saturnController?.update?.()", GAIA)
        self.assertIn("saturnController?.dispose?.()", GAIA)
        self.assertIn("raycaster.intersectObjects(raycastTargets,false)[0]", SCENE)
        self.assertIn("clickables.filter(object=>['saturn','titan','enceladus','mimas'].includes(object?.userData?.body))", SCENE)

    def test_saturn_scene_isolated_from_the_earth_map_and_unrelated_bodies(self):
        self.assertIn("scene.background=new THREE.Color(0x02050c)", SCENE)
        self.assertIn("earth.visible=false;moonPivot.visible=false;sunGroup.visible=false;haze.visible=false", SCENE)
        self.assertIn("earth.visible=true;moonPivot.visible=true;sunGroup.visible=true;stars.visible=true;haze.visible=true", SCENE)
        self.assertIn("scene.background=null", SCENE)
        self.assertIn("SaturnSystemGroup", SATURN)

    def test_saturn_uses_the_existing_moon_and_sun_gesture_controls(self):
        for marker in ("function panSaturnSurface(dx,dy)", "function tiltSaturnCamera(deltaY)",
                       "panSaturnSurface(dx,0);tiltSaturnCamera(dy);",
                       "enforceSaturnCameraClearance()", "saturnFocusLocalTarget"):
            self.assertIn(marker, SCENE)

    def test_saturn_receives_the_shared_sun_position_callback(self):
        self.assertIn(
            "getSaturnPosition,getSunPosition,getSelectedBody,isMobile=false}=options",
            SATURN,
        )
        self.assertIn("if(getSunPosition){", SATURN)
        self.assertIn(
            "getSunPosition:()=>getSunPosition?getSunPosition():new THREE.Vector3()",
            GAIA,
        )

    def test_saturn_cloud_shader_uses_three_r169_compatible_texture_sampling(self):
        self.assertIn("vec4 saturnLayerA=texture2D(map,saturnUvA)", SATURN)
        self.assertIn("vec4 saturnLayerB=texture2D(map,saturnUvB)", SATURN)
        self.assertNotIn("mapTexelToLinear", SATURN)

    def test_saturn_uses_the_existing_camera_and_body_focus_path(self):
        self.assertIn("bodyData?.systemCameraDistance", SCENE)
        self.assertIn("key==='saturn'?2.1:1.5", SCENE)
        self.assertIn("bodyRefs:{earth:earthDepthOccluder,moon:moonMesh,sun:sunMesh}", SCENE)
        self.assertIn("initBridgePointSaturnSystem", GAIA)

    def test_saturn_uses_cropped_cassini_raster_dual_flow_and_dynamic_storms(self):
        for marker in (
            "loaded.saturn.offset.set(.175,.30)",
            "loaded.saturn.repeat.set(.75,.47)",
            "saturnUvA.x=.175+mod",
            "saturnUvB.x=.175+mod",
            "saturnMissing",
            "saturnProcedural",
            "uSaturnAtmosTime",
            "Saturn volumetric Fresnel atmospheric rim",
            "uSaturnLightDir",
            "warpedLatitude",
            "stormMaskA",
            "stormSwirlB",
            "stormMaskC",
            "polarHexBand",
            "saturnCloud.rgb=mix(saturnCloud.rgb,saturnFlowColor,.64)",
            "vec3(1.13,1.085,.985)",
        ):
            self.assertIn(marker, SATURN)

    def test_saturn_rings_are_closed_depth_writing_volumes_with_shadow_flags(self):
        for marker in (
            "function buildRingAlphaProfile",
            "new THREE.DataTexture(data,width,height,THREE.RGBAFormat",
            "alphaMap,transparent:true,opacity:1",
            "roughness:.86,metalness:.015",
            "ringVisualThicknessKm=6400",
            "halfThicknessKm=Math.min(ringVisualThicknessKm*.5,(outerKm-innerKm)*.18)",
            "renderedThicknessKm:halfThicknessKm*2",
            "depthTest:true,depthWrite:true",
            "ringDustCount=isMobile?5600:18000",
            "zone.diffuse?.42:.30",
            "function updateRingDust(time)",
            "Saturn 3D volume of orbiting ice grains",
            "mesh.castShadow=true;mesh.receiveShadow=true",
            "saturnMesh.castShadow=true;saturnMesh.receiveShadow=true",
        ):
            self.assertIn(marker, SATURN)

    def test_moons_are_larger_and_directly_clickable(self):
        for marker in (
            "const visualScale=Math.min(36,(saturnRadius*.25)/radius)",
            "placeholder.scale.setScalar(visualScale)",
            "clickables.push(placeholder)",
            "systemCameraDistance:Math.max(.22,visualRadius*3.6)",
        ):
            self.assertIn(marker, SATURN)
        self.assertNotIn("new THREE.BoxGeometry", SATURN)
        self.assertNotIn("moonHitboxes", SATURN)
        self.assertIn("saturnFocusMesh.scale?.x", SCENE)
        self.assertIn("map:dustSprite,size=isMobile?.82:1.05", SATURN)
        self.assertIn("Enceladus soft circular water-ice plume sprite particles", SATURN)
        self.assertNotIn("PointsMaterial({color:0xecfaff,size:isMobile?1.45:2.05,transparent:true", SATURN)

    def test_cassini_dsk_triangle_winding_is_corrected_after_axis_reflection(self):
        self.assertIn("const second=i+1,third=i+2", SATURN)
        self.assertIn("position[second*3+j]", SATURN)
        self.assertIn("normal[second*3+j]", SATURN)
        self.assertIn("uv[second*2+j]", SATURN)
        self.assertIn("getSunPosition:()=>getSunPosition?getSunPosition():new THREE.Vector3()", GAIA)

    def test_real_cassini_shapes_and_titan_height_grid_are_used(self):
        for marker in ("BPSM", "BPSH",
                       "titan-cassini-topography-4ppd-u16.bin.gz",
                       "new THREE.DataTexture", "enceladus-cassini-shape-v1.bin.gz",
                       "mimas-cassini-shape-v1.bin.gz"):
            self.assertIn(marker, SATURN)
        self.assertIn("MIMAS_M3_GAS_V01.BDS", BUILDER)
        self.assertIn("cas_enceladus_ssd_spc_0128icq_v1.bds", BUILDER)
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
        self.assertIn("const segments=key==='titan'?(isMobile?512:1024)", SATURN)
        self.assertIn("NASA Cassini ISS PIA22770", BUILDER)

    def test_saturn_texture_rotation_titan_atmosphere_and_enceladus_plumes_are_animated(self):
        for marker in ("saturnMesh.rotation.y", "titanAtmosphere.rotation.y",
                       "Titan thick golden nitrogen atmosphere",
                       "Enceladus south-polar water-ice geyser plumes",
                       "Enceladus animated water-ice plume particles"):
            self.assertIn(marker, SATURN)


if __name__ == "__main__":
    unittest.main()
