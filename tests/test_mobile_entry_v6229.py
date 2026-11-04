import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "recovery"))
from apply_mobile_entry_v6229 import patch_html, patch_landing_js


def index_fixture() -> str:
    optional = "".join(
        f'<script defer src="/optional-{i}.js"></script>'
        for i in range(16)
    )
    return """<!doctype html><html><head>
<link rel="modulepreload" href="/world-v2300-map.js?v=6226-underwater-satellite-lock">
<link rel="modulepreload" href="/world-v2300-clouds.js?v=6170-always-on-3d-cloud-volumes">
<link rel="modulepreload" href="/world-v2300-lightning.js?v=6195-desktop-globe-flash-stability">
<link rel="modulepreload" href="/world-v2300-weather.js?v=6195-desktop-globe-flash-stability">
<link rel="modulepreload" href="/intelligence-global-v5507.js?v=6170-imerg-nrt-timeline">
</head><body>
<div id="bpWelcomeGateV1" class="bpw-globe-aura"></div>
<script src="./vendor/maplibre-gl.js?v=524-v5945"></script>
<script defer src="./landing.js?v=6228-auth-retry&bp=5970-globe-model-matrices"></script>
""" + optional + """
<script id="bpWelcomeGateScriptV1">
let musicChordTimer=0,musicArpTimer=0,sessionWatch=0,resizeHandler=null,gateSettled=false,sequenceStarted=false,spinTimer=0,spinActive=false;
const restorePage=()=>{
    gate.remove();
    if(resizeHandler)window.removeEventListener('resize',resizeHandler);
};
if(isSignedIn()){gate.remove();return}
const startSequence=()=>{
    if(sequenceStarted||gateSettled)return;
    sequenceStarted=true;
    startGlobeSpin();
    const lettersDuration=buildWordmark();
    if(status)status.textContent='BRIDGEPOINT WORLD INITIALIZED';
    setTimeout(()=>{
      if(isSignedIn()){restorePage();return}
      setTimeout(settleGate,1250);
    },lettersDuration+160);
};
const waitForGlobe=()=>{
      if(isSignedIn()){restorePage();return}
      if(gateSettled)return;
      try{activeMap=window.__BP_LANDING_WORLD__?.map||window.__BP_V5000_WORLD__?.map||activeMap}catch(_){}
      if(activeMap&&mapIsReady(activeMap)){startSequence();return}
      if(Date.now()-startedAt>45000){
        if(activeMap){holdWholeEarth(activeMap,true);startSequence()}
        else{if(status)status.textContent='CONNECTING TO THE BRIDGEPOINT WORLD';setTimeout(waitForGlobe,1000);return}
      }else{setTimeout(waitForGlobe,220);return}
};
</script>
</body></html>"""


def landing_fixture() -> str:
    return """const AUTH='bpAuthRequestV6228';
async function initMap(){
  const mod=await import('./world-v2300-map.js?v=6226-underwater-satellite-lock');
  void window.__BP_ACTIVATE_CLOUDS__().catch(e=>console.warn('BridgePoint always-on 3D clouds unavailable',e));
  void ensureLandingStormCloudWeather(world).catch(e=>console.warn('BridgePoint always-on storm cloud feed unavailable',e));
  void import('./world-v2300-lod-controls.js?v=6201-gold-always-on').then(m=>initLod(m));
  void import('./bridgepoint-landmarks-v5940.js?v=5966-statue-pedestal-aligned').then(m=>initLandmarks(m));
  void import('./world-v2300-sensor-layers.js?v=6224-underwater-dive-camera').then(m=>initSensors(m));
  void import('./world-v2300-realism.js?v=5926-world-sun-materials').then(m=>initRealism(m))
   .catch(e=>console.warn('BridgePoint real-world rendering controls unavailable',e));
}
"""


class MobileEntryPatchTests(unittest.TestCase):
    def test_keeps_core_renderer_and_lazifies_secondary_scripts(self):
        patched, stats = patch_html(index_fixture())
        self.assertEqual(stats["lazy_scripts"], 16)
        self.assertIn('./vendor/maplibre-gl.js?v=524-v5945', patched)
        self.assertIn('landing.js?v=6229-mobile-entry&bp=5970-globe-model-matrices', patched)
        self.assertIn('world-v2300-map.js?v=6226-underwater-satellite-lock', patched)
        self.assertIn('bpMobileLazyLoaderV6229', patched)
        self.assertIn('data-bp-lazy-src="/optional-0.js"', patched)
        self.assertNotIn('<script defer src="/optional-0.js"', patched)
        self.assertIn('acquisition_tracker', patched) if 'acquisition_tracker' in index_fixture() else None

    def test_preserves_welcome_animation_and_releases_gate_after_bounded_wait(self):
        patched, _ = patch_html(index_fixture())
        self.assertIn('bpw-globe-aura', patched)
        self.assertIn("gateFallbackStarted=false", patched)
        self.assertIn('BRIDGEPOINT WORLD IS LOADING', patched)
        self.assertIn("window.__BP_WELCOME_GATE_UNLOCKED_V6229__=true", patched)
        self.assertIn("if(gate.dataset.removed==='1')return;", patched)

    def test_only_secondary_preloads_are_removed(self):
        patched, _ = patch_html(index_fixture())
        self.assertIn('rel="modulepreload" href="/world-v2300-map.js', patched)
        for source in ("world-v2300-clouds.js", "world-v2300-lightning.js", "world-v2300-weather.js", "intelligence-global-v5507.js"):
            self.assertNotIn(f'rel="modulepreload" href="/{source}', patched)
        with self.assertRaises(AssertionError):
            patch_html(patched)

    def test_defers_optional_landing_engines_but_retains_every_initializer(self):
        patched = patch_landing_js(landing_fixture())
        self.assertIn("bp:welcome-gate-unlocked-v6229", patched)
        self.assertIn("window.__BP_LANDING_START_OPTIONAL_MODULES_V6229__", patched)
        self.assertIn("window.__BP_LANDING_OPTIONAL_MODULES_STARTED_V6229__", patched)
        for feature in ("world-v2300-clouds.js", "world-v2300-lod-controls.js", "bridgepoint-landmarks-v5940.js", "world-v2300-sensor-layers.js", "world-v2300-realism.js"):
            self.assertIn(feature, patched)
        self.assertNotIn("  void window.__BP_ACTIVATE_CLOUDS__().catch", patched)
        with self.assertRaises(AssertionError):
            patch_landing_js(patched)


if __name__ == "__main__":
    unittest.main()
