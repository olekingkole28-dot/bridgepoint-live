import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "recovery"))
from apply_welcome_space_v6257 import (
    BUILD, CACHE_NAME, SW_URL, bump_manifest_url, patch_app_index, patch_app_js, patch_bundle,
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
        self.assertIn('src="/bridgepoint-welcome-space-v6260.js?v=6282-saturn-system"', out)
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

    def test_already_migrated_legacy_app_bumps_any_previous_worker_version(self):
        migrated = """<meta http-equiv="refresh" content="0;url=/">
<link rel="manifest" href="./manifest.webmanifest">
<script>location.replace('/')</script>
<script src="/sw.js?v=6247-universal-fresh-entry-sidewalk"></script>"""
        out = patch_legacy_app(migrated)
        self.assertIn("sw.js?v=6282-saturn-system", out)
        self.assertNotIn("v=6247-universal-fresh-entry-sidewalk", out)
        self.assertIn('content="0;url=/"', out)
        self.assertIn("location.replace('/')", out)

    def test_manifest_cache_buster_replaces_any_existing_version(self):
        cases = (
            '<link rel="manifest" href="./manifest.webmanifest?v=6265-solar-globe">',
            '<link rel="manifest" href="../manifest.webmanifest?v=6247-universal-fresh-entry">',
            '<link rel="manifest" href="https://bridgepointintelligence.online/manifest.webmanifest?v=old">',
            '<link href="/manifest.webmanifest" rel="manifest">',
        )
        for tag in cases:
            with self.subTest(tag=tag):
                out = bump_manifest_url(tag, "test manifest URL")
                self.assertEqual(out.count("v=6282-saturn-system"), 1)
                self.assertNotIn("v=6265-solar-globe", out)
                self.assertNotIn("v=6247-universal-fresh-entry", out)

    def test_existing_static_production_gate_bumps_sun_module_src_without_reformatting_html(self):
        current = """<html><head>
<style id="bpWelcomeGateStylesV6257"></style>
</head><body>
<div id="bpWelcomeGateV1"><div class="bpw-celestial-system" aria-hidden="true"></div>
<div class="bpw-wordmark bpw-wordmark-static">BRIDGEPOINT</div>
<button data-mode="signup">Sign up</button><button data-mode="signin">Sign in</button>
</div>
<script>window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()});</script>
<script>
  const cameraLockMap=null;
  const removeCameraGuard=()=>{
  };
</script>
<script type="module" src="/bridgepoint-welcome-space-v6260.js?v=6265-solar-globe">
</body></html>"""
        out = patch_root_html(current)
        self.assertIn('src="/bridgepoint-welcome-space-v6260.js?v=6282-saturn-system"', out)
        self.assertNotIn("v=6265-solar-globe", out)
        self.assertIn('<div class="bpw-celestial-system" aria-hidden="true"></div>', out)
        self.assertIn('class="bpw-wordmark bpw-wordmark-static"', out)
        self.assertIn("window.__BP_WELCOME_SYNC_SPACE_ZOOM_V1__=", out)
        self.assertIn("cameraLockMap.getCanvas?.()", out)
        self.assertIn("mapCanvas.style.transformOrigin='50% 50%'", out)

    def test_app_entry_and_legacy_install_route_to_current_root_gate(self):
        app = patch_app_index(app_index_fixture())
        self.assertEqual(app.count("/?return="), 2)
        self.assertNotIn("/?auth=signin&return=", app)
        self.assertIn("app.js?v=6282-saturn-system", app)
        self.assertIn("manifest.webmanifest?v=6282-saturn-system", app)
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

    def test_service_worker_preserves_existing_modern_entry_cleanup_while_bumping_version(self):
        modern = """const V='bp-intelligence-v6247-universal-fresh-entry-sidewalk';
const BRIDGEPOINT_LAUNCH_EXPERIENCE_BUILD='v6265-solar-globe';
self.addEventListener('activate',e=>e.waitUntil((async()=>{
 const active=await caches.open(V);
 for(const request of await active.keys()){
  const url=new URL(request.url);
  if(url.origin===self.location.origin&&['/','/index.html','/app/','/app/index.html'].includes(url.pathname))await active.delete(request);
 }
 for(const k of await caches.keys()){if(k!==V)await caches.delete(k)}
 await self.clients.claim();
})()));
self.addEventListener('fetch',e=>{
 if(e.request.mode==='navigate'){
  const entryRoute=['/','/index.html','/app/'].includes(u.pathname);
  e.respondWith(fetch(e.request,{cache:'no-store'}).catch(async()=>{
   if(entryRoute)return new Response('current release required',{status:503});
   return caches.match(e.request);
  }));
  return;
 }
});"""
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "sw.js"
            path.write_text(modern)
            patch_worker(path)
            out = path.read_text()
            self.assertIn("BRIDGEPOINT_LAUNCH_EXPERIENCE_BUILD='v6283-saturn-isolated'", out)
            self.assertIn("await active.delete(request)", out)
            self.assertIn("const entryRoute=", out)
            self.assertIn("current release required", out)
            self.assertIn("clients.claim()", out)

    def test_worker_script_and_urls_are_versioned_but_offline_cache_key_is_preserved(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "landing.js"
            path.write_text(APP_JS_REGISTER)
            patch_bundle(path)
            self.assertIn(SW_URL, path.read_text())
            self.assertNotIn("v6247-universal-fresh-entry-sidewalk',{updateViaCache", path.read_text())

    def test_welcome_module_has_no_second_earth_or_ground_button_and_keeps_interactions(self):
        module = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text()
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

    def test_sun_shader_writes_logarithmic_depth_behind_its_opaque_occluder(self):
        module = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text()
        sun_shader = module.split("const sunMaterial = new THREE.ShaderMaterial({", 1)[1].split(
            "  const solarTextureLoader", 1
        )[0]
        for marker in (
            "#include <logdepthbuf_pars_vertex>",
            "#include <logdepthbuf_vertex>",
            "#include <logdepthbuf_pars_fragment>",
            "#include <logdepthbuf_fragment>",
            "depthTest:true,depthWrite:true,side:THREE.FrontSide",
        ):
            self.assertIn(marker, sun_shader)
        self.assertIn("sunDepthMesh.renderOrder=-1000", module)
        self.assertIn("sunMesh.renderOrder = -900", module)

    def test_moon_focus_uses_locally_hosted_elevation_assets_and_can_reach_surface_zoom(self):
        module = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text()
        for marker in (
            "function createMoonTerrainController()",
            "const ASSET = '/assets/moon/v1/'",
            "function decodePng16Gray(url)",
            "new DecompressionStream('deflate')",
            "moon-global-height-16ppd-u16.png",
            "moon-apollo15-4deg-512ppd-height-u16.png",
            "moon-lroc-color-4k.webp",
            "function buildGlobalTerrain()",
            "new THREE.SphereGeometry(base, globalWidthSegments, globalHeightSegments)",
            "globalTerrainMeshResolution",
            "function moonSurfacePoint(lat, lon, elevationMeters = 0)",
            "function refreshGlobalDetailPatch(centerLat, centerLon, force = false)",
            "colors = new Float32Array(vertexCount * 4)",
            "THREE.MathUtils.smoothstep(edgeDistance, 0.0, 0.035)",
            "THREE.MathUtils.smoothstep(edgeDistance, 0.0, 0.055)",
            "createMoonPatchMaterial()",
            "uniforms: { ...moonMaterial.uniforms",
            "vAlpha=color.a",
            "gl_FragColor=vec4(color,vAlpha);",
            "depthWrite: false, transparent: true",
            "extensions: { derivatives: true }",
            "uCameraLocal",
            "globalDetailPatch",
            "moonPivot.visible=true;sunGroup.visible=true;stars.visible=true;haze.visible=true;",
            "animateCamera(surface.clone().addScaledVector(surfaceNormal,0.14),surface,1.55);",
            "tiltMoonCamera(dy);",
            "panMoonSurface(dx,0);",
            "if(viewState!=='moon')",
            "function buildHighResolutionPatch()",
            "geometry.setIndex(new THREE.BufferAttribute(indices, 1))",
            "geometry.setIndex(new THREE.BufferAttribute(indices.subarray(0, indexOffset), 1))",
            "globalHeightResolution",
            "highResolutionPatchResolution",
            "externalRuntimeTerrainRequests: 0",
            "runtimeMode: 'local-static-assets'",
            "function sampleGrid(grid, u, v)",
            "createMoonPatchMaterial()",
            "const minimum=viewState==='moon'?0.00000045:viewState==='sun'?.0015:viewState==='planet'?Math.max(1e-9,focusedPlanetRadius*1.015):1.8",
            "camera.near=0.00000005",
            "camera.near=0.001",
            "const activePointers=new Map()",
            "function refreshLunarTerrainFromView()",
            "focusLocalTarget?moonMesh.localToWorld",
            "function rotateMoonBy(dx,dy)",
            "Compatibility path: gestures adjust the lunar camera, never the Moon body.",
            "function tiltMoonCamera(deltaY)",
            "function panMoonSurface(dx, dy)",
            "function syncMoonFocusToTarget()",
            "function rotateMoonViewYaw(deltaX)",
            "function refreshLabels(force = false)",
            "moon-feature-labels.json",
            "labelStatus: labelData ? 'ready' : 'unavailable'",
            "maxVisible = mobile ? 34 : 58",
            "activePointers.set(event.pointerId,{...existingPointer,x:event.clientX,y:event.clientY})",
            "pointerState?.button===2",
            "labelsGroup.visible = active",
            "moonCameraTiltDegrees:THREE.MathUtils.radToDeg(moonCameraTiltRadians())",
            "moonCameraDistanceKm:viewState==='moon'?camera.position.distanceTo(target)*EARTH_RADIUS_KM:null",
            "maximumTilt=THREE.MathUtils.degToRad(84)",
            "tiltMoonCamera(dy)",
            "gesture.center.x-gestureCenter.x",
            "zoomCameraBy(pinchDistance/gesture.distance)",
            "function enforceMoonCameraClearance()",
            "moonTerrainController?.surfaceRadiusAt(latitude,longitude)",
            "depthTest: true, depthWrite: true, transparent: false",
            "#include <logdepthbuf_vertex>",
            "#include <logdepthbuf_fragment>",
        ):
            self.assertIn(marker, module)

        self.assertNotIn("trek.nasa.gov/tiles/Moon", module)
        labels = (ROOT / "assets" / "moon" / "v1" / "moon-feature-labels.json").read_text()
        self.assertIn("Statio Tianhe", labels)
        self.assertIn("Apollo 15 ALSEP Station", labels)
        self.assertNotIn("fetch(src", module)

        # The 3D scene must actually be mounted in the public welcome gate and its
        # locally hosted terrain assets must be copied into the Pages artifact.
        index = (ROOT / "rebuild-v5000" / "index.html").read_text()
        workflow = (ROOT / ".github" / "workflows" / "deploy-intelligence-rebuild-v5000.yml").read_text()
        self.assertIn('class="bpw-celestial-system"', index)
        helper = (ROOT / "recovery" / "apply_welcome_space_v6257.py").read_text()
        self.assertIn("r'\\g<1>' + BUILD[1:] + r'\\g<2>'", helper)
        publish_workflow = (ROOT / ".github" / "workflows" / "publish-welcome-space-v6257.yml").read_text()
        self.assertIn("cp recovery/bridgepoint-welcome-space-v6260.js site/bridgepoint-welcome-space-v6260.js", publish_workflow)
        self.assertNotIn("cp -a assets/moon/v1 site/assets/moon/v1", publish_workflow)
        self.assertIn("Add only the Sun scene and local solar textures", publish_workflow)
        self.assertIn("cp -a assets/sun/v2 site/assets/sun/v2", publish_workflow)
        self.assertIn("assets/moon/v1/**", workflow)

        # The Sun now uses local SDO maps, 3D coronal structures and the same
        # oblique two-finger surface-navigation grammar as the Moon.
        self.assertIn("sunFocusLocalTarget=new THREE.Vector3(0,0,sunRadiusVisual)", module)
        self.assertIn("uPhotosphereMap", module)
        self.assertIn("sun-photosphere-v2.webp", module)
        self.assertIn("sun-photosphere-height-v2.webp", module)
        self.assertIn("sun-coronal-activity-v2.webp", module)
        self.assertIn("sun-stereoB-farside-EUV-2014-09-27-v2.webp", module)
        self.assertIn("uFarSideMap", module)
        self.assertIn("earthDepthOccluder", module)
        self.assertIn("Sun solid opaque depth occluder", module)
        self.assertIn("applySunReliefFromImage", module)
        self.assertIn("geometry.computeVertexNormals()", module)
        self.assertIn("createSolarPlasmaMaterial", module)
        self.assertIn("function panSunSurface", module)
        self.assertIn("function tiltSunCamera", module)
        self.assertIn("panSunSurface(dx,dy);", module)
        self.assertIn("panSunSurface(dx,0);tiltSunCamera(dy);", module)
        self.assertIn("solarRotationPeriodDays:25.38", module)
        self.assertIn("2014-09-27", helper)
        self.assertIn("sun-photosphere-height-v2.webp", helper)
        self.assertIn("assets/sun/v2/**", publish_workflow)
        self.assertIn("cp -a assets/sun/v2 site/assets/sun/v2", publish_workflow)
        self.assertNotIn("cp -a assets/moon/v1 site/assets/moon/v1", publish_workflow)

    def test_sun_uses_current_nasa_aia_hmi_maps_and_observation_derived_3d_structures(self):
        module = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text()
        for marker in (
            "sun-magnetogram-hmi-2026-11-09.jpg",
            "sun-aia-131-latest.jpg",
            "sun-aia-171-latest.jpg",
            "sun-aia-193-latest.jpg",
            "sun-aia-304-latest.jpg",
            "function buildMagneticLoopsFromImage",
            "function buildObservedEruptionArcs",
            "SDO AIA 131/171/304 observation-driven 3D corona shell",
            "uAIA193Map",
            "solarDiskUV",
            "solarMagneticLoopCount",
            "aia131:'2026-11-09T05:06:44Z'",
            "no three-minute client refresh configured",
        ):
            self.assertIn(marker, module)
        self.assertNotIn("[-16,-43,13,-20", module)
        self.assertNotIn("latitude=[-34,-12,11,29,2]", module)

    def test_sun_has_animated_molten_photosphere_fresnel_rim_and_observed_plasma_particles(self):
        module = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text()
        for marker in (
            "const VERSION = 'v6283-saturn-isolated'",
            "float magmaFlow=",
            "float moltenCoverage=",
            "const solarFireRim=new THREE.Mesh",
            "solarFireRim.renderOrder=-898",
            "function buildSolarSurfaceParticlePlumes(regions)",
            "NASA AIA active-region surface-ejected plasma particle streams",
            "gl_PointSize=",
            "vFade=smoothstep(0.0,.10,life)",
            "solarFireRimMaterial.uniforms.uTime.value=t",
            "solarPlasmaParticles.material.uniforms.uTime.value=t",
            "window.__BP_SOLAR_SURFACE_V4__",
        ):
            self.assertIn(marker, module)

    def test_patch_bundle_bumps_v6269_worker_to_v6283(self):
        with tempfile.TemporaryDirectory() as folder:
            bundle = Path(folder) / "app.js"
            bundle.write_text("navigator.serviceWorker.register('/sw.js?v=6269-solar-fire-plasma',{updateViaCache:'none'})")
            patch_bundle(bundle)
            self.assertIn("sw.js?v=6282-saturn-system", bundle.read_text())
            self.assertNotIn("v6269-solar-fire-plasma", bundle.read_text())

    def test_patch_bundle_also_invalidates_v6280_worker_for_v6283(self):
        with tempfile.TemporaryDirectory() as folder:
            bundle = Path(folder) / "app.js"
            bundle.write_text("navigator.serviceWorker.register('/sw.js?v=6280-unified-cosmos',{updateViaCache:'none'})")
            patch_bundle(bundle)
            self.assertIn("sw.js?v=6282-saturn-system", bundle.read_text())
            self.assertNotIn("v6280-unified-cosmos", bundle.read_text())

    def test_lunar_mesh_indices_are_buffer_attributes(self):
        module = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text()
        self.assertIn("geometry.setIndex(new THREE.BufferAttribute(indices, 1))", module)
        self.assertIn("geometry.setIndex(new THREE.BufferAttribute(indices.subarray(0, indexOffset), 1))", module)
        self.assertNotIn("geometry.setIndex(indices);", module)
        self.assertNotIn("geometry.setIndex(indices.subarray(0, indexOffset));", module)

    def test_lunar_imagery_is_not_cut_out_under_terrain_patches(self):
        module = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text()
        self.assertNotIn("uTerrainMask", module)
        self.assertNotIn("uGlobalDetailMask", module)
        self.assertIn("discard;", module)
        self.assertIn("uAllowDetailCutouts", module)
        self.assertIn("uniforms: { ...moonMaterial.uniforms, uAllowDetailCutouts", module)
        self.assertIn("vAlpha=color.a", module)
        self.assertIn("depthWrite: false, transparent: true", module)
        self.assertIn("THREE.MathUtils.smoothstep(edgeDistance, 0.0, 0.035)", module)
        self.assertIn("THREE.MathUtils.smoothstep(edgeDistance, 0.0, 0.055)", module)

    def test_lunar_surface_uses_displaced_dem_geometry_not_fragment_crater_rings(self):
        module = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text()
        self.assertNotIn("float crater(", module)
        self.assertNotIn("crater(p,", module)
        self.assertIn("vec3 normal=normalize(vNormal);", module)
        self.assertIn("geometry.computeVertexNormals()", module)
        self.assertIn("moonMaterial.uniforms.uCameraLocal.value.copy", module)

    def test_moon_craters_are_real_128ppd_displaced_geometry_not_procedural_rings(self):
        module = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text()
        self.assertIn("function loadHighResolutionTile(lat, lon)", module)
        self.assertIn("function refreshHighResolutionCraterPatch(centerLat, centerLon, force = false)", module)
        self.assertIn("moon-sldem-128ppd-", module)
        self.assertIn("const segments = 512, rowWidth = segments + 1", module)
        self.assertIn("const elevation = baseElevation * (1 - morphToBase) + highResolutionElevation * morphToBase", module)
        self.assertIn("const point = moonSurfacePoint(lat, lon, elevation)", module)
        self.assertIn("geometry.computeVertexNormals()", module)
        self.assertIn("uApolloCutoutActive", module)
        self.assertIn("uGlobalCutoutActive", module)
        self.assertIn("highResolutionRequestId += 1", module)
        self.assertIn("highResolutionBounds = null", module)
        self.assertNotIn("float crater(", module)
        self.assertNotIn("crater(p,", module)

    def test_128ppd_lunar_tile_package_is_reused_from_verified_release(self):
        workflow = (ROOT / ".github" / "workflows" / "publish-welcome-space-v6257.yml").read_text()
        self.assertIn("name: bridgepoint-welcome-space-v6257", workflow)
        self.assertIn("run-id: 42536183741", workflow)
        self.assertIn("Reuse and verify the already-published Moon terrain package", workflow)
        self.assertIn("test -s site/assets/moon/v1/sldem-128ppd/moon-sldem-128ppd-y03-x18.png", workflow)
        self.assertIn("moon-sldem-128ppd-y03-x18.png", workflow)
        self.assertNotIn("imbrium.mit.edu/DATA/SLDEM2015", workflow)
        self.assertNotIn("SLDEM_TILE_SHIFT", workflow)

    def test_welcome_space_uses_one_real_gaia_starfield_and_no_synthetic_sphere(self):
        scene = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text()
        galaxy = (ROOT / "rebuild-v5000" / "bridgepoint-gaia-galaxy-v6270.js").read_text()
        self.assertIn("stars.visible=true", scene)
        self.assertIn("initBridgePointSolarCosmos", scene)
        self.assertIn("v=6282-saturn-system", scene)
        self.assertNotIn("cinematicStarfield", scene)
        self.assertNotIn("bpw-gaia-mode", scene)
        self.assertNotIn("GAIA_DR3_GALAXY_V6270", scene)
        self.assertNotIn("GALAXY VIEW", galaxy)
        self.assertNotIn("data-gaia=", galaxy)
        self.assertIn("Gaia DR3 measured stellar positions", galaxy)
        self.assertIn("const p=[r.x,r.y,r.z],j=i*3;", galaxy)
        self.assertIn("if(starState.frame)return starState.frame;", galaxy)
        self.assertIn("0.00465047*uAUScale", galaxy)
        self.assertIn("#include <logdepthbuf_vertex>", galaxy)
        self.assertIn("starsGroup.visible=true", galaxy)
        self.assertIn("initBridgePointSolarCosmos", galaxy)

    def test_continuous_solar_scene_reuses_existing_bodies_without_placeholders(self):
        scene = (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text()
        cosmos = (ROOT / "rebuild-v5000" / "bridgepoint-gaia-galaxy-v6270.js").read_text()
        self.assertIn("bodyRefs:{earth:earthDepthOccluder,moon:moonMesh,sun:sunMesh}", scene)
        self.assertIn("clickables=[earthDepthOccluder,moonMesh,sunMesh]", scene)
        self.assertIn("overviewBaseDistance=Math.hypot(4.2,distance)", scene)
        self.assertIn("window.__BP_WELCOME_SYNC_SPACE_ZOOM_V1__?.(spaceZoomRatio)", scene)
        self.assertIn("followsEarthCamera=viewState==='overview'", scene)
        self.assertIn("maxCameraDistance", cosmos)
        self.assertIn("planetPos(THREE,p,days,ob).multiplyScalar(auScale)", cosmos)
        self.assertIn("for(const p of [])", cosmos)
        self.assertIn("World-anchored celestial body labels", cosmos)
        self.assertIn("bpw-celestial-body-picker", cosmos)
        self.assertIn("CHOOSE CELESTIAL BODY", cosmos)
        self.assertIn("const planetRefs=[];", cosmos)
        self.assertIn("planetCount:0", cosmos)
        self.assertNotIn('value="mercury"', cosmos)
        self.assertNotIn("function enterGalaxy", cosmos)
        self.assertNotIn("function enterMilky", cosmos)
        self.assertNotIn("function enterSolar", cosmos)

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
            (site / "bridgepoint-welcome-space-v6260.js").write_text(
                (ROOT / "recovery" / "bridgepoint-welcome-space-v6260.js").read_text()
            )
            (site / "bridgepoint-saturn-system-v6282.js").write_text("Saturn module fixture")
            (site / "bridgepoint-celestial-sky-v6257.js").write_text(
                (ROOT / "rebuild-v5000" / "bridgepoint-celestial-sky-v6257.js").read_text()
            )
            solar_assets = site / "assets" / "sun" / "v2"
            solar_assets.mkdir(parents=True)
            (solar_assets / "manifest.json").write_text("{}")
            for name in (
                "sun-photosphere-v2.webp",
                "sun-coronal-activity-v2.webp",
                "sun-photosphere-height-v2.webp",
                "sun-stereoB-farside-EUV-2014-09-27-v2.webp",
                "sun-magnetogram-hmi-2026-11-09.jpg",
                "sun-aia-131-latest.jpg",
                "sun-aia-171-latest.jpg",
                "sun-aia-193-latest.jpg",
                "sun-aia-304-latest.jpg",
            ):
                (solar_assets / name).write_bytes(b"test")

            before = {p.relative_to(site).as_posix() for p in site.rglob("*") if p.is_file()}
            patch_site(site)
            after = {p.relative_to(site).as_posix() for p in site.rglob("*") if p.is_file()}
            self.assertEqual(after - before, set())
            root = (site / "index.html").read_text()
            self.assertIn('src="/bridgepoint-welcome-space-v6260.js?v=6282-saturn-system"', root)
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
