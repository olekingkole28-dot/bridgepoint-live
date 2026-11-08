import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "recovery"))
from apply_launch_experience_v6248 import (
    BUILD, CACHE_NAME, patch_app_index, patch_legacy_app, patch_manifest,
    patch_root_html, patch_worker,
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
    const make=(id,count,seed,near)=>{
      const field=document.getElementById(id);if(!field||field.dataset.built==='1')return;
      let state=seed>>>0;
      const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296};
      for(let i=0;i<count;i++){
        const star=document.createElement('i');
        field.appendChild(star);
      }
      field.dataset.built='1';
    };
    make('bpwStarsFarV4',152,90419,false);
    make('bpwStarsNearV4',76,59173,true);
  }
  buildSpaceStars();
  function buildWordmark(){
    if(!wordmark||wordmark.dataset.built==='1')return 0;
    const lines=[{text:'WELCOME TO'},{text:'BRIDGEPOINT'},{text:'INTELLIGENCE'}];
    let letterIndex=0,lastDelay=0;
    lines.forEach(line=>{
      const row=document.createElement('div');
      line.text.split('').forEach(character=>{row.appendChild(document.createElement('span'));letterIndex++});
      wordmark.appendChild(row);
    });
    wordmark.dataset.built='1';
    return Math.round(lastDelay*1000+2920);
  }
</script>
</body></html>"""


class LaunchExperienceV6254Tests(unittest.TestCase):
    def test_root_has_static_title_two_buttons_no_earth_aura(self):
        out = patch_root_html(root_fixture())
        self.assertIn(">INTELLIGENCE</span></div>", out)
        self.assertIn('data-mode="signup"', out)
        self.assertIn('data-mode="signin"', out)
        self.assertNotIn('class="bpw-globe-aura"', out)
        self.assertNotIn("WELCOME TO", out)
        self.assertNotIn('class="bpw-explainer"', out)
        self.assertIn("bpwCelestialCanvasV6254", out)
        self.assertIn("bpwCelestialFallbackCanvasV6254", out)
        self.assertIn("const ctx=target.getContext('2d',{alpha:true});", out)
        self.assertIn("fallbackCanvas.width=canvas.width", out)
        self.assertIn("position:fixed!important;inset:0!important;width:100vw!important;height:100vh!important;height:100dvh!important;z-index:9!important", out)
        self.assertIn("mix-blend-mode:screen", out)
        self.assertIn("bpw-wordmark-main", out)
        self.assertIn("bpw-celestial-system", out)
        self.assertIn("const starCount=lowPower?4200:8200", out)
        self.assertIn("vec3 lunar=mix", out)
        self.assertIn("function celestialAlignment(width,height)", out)
        self.assertIn("__BP_CELESTIAL_ALIGNMENT_V6254__", out)
        self.assertIn("flareReach=1.20", out)
        self.assertIn("craterRelief(uv,rim,shadow)", out)
        self.assertIn("bigGrid=uv*vec2(7.0,4.8)", out)
        self.assertIn("orbitPhase=Date.now()*.000085", out)
        self.assertIn("sunlightDirection:[0,.92,.40]", out)
        self.assertIn("sunRadius=Math.min(earthRadius*.47", out)
        self.assertIn("verticalHalf-sunRadius*.70", out)
        self.assertIn("sunBehindEarth=u_earthR>0.0", out)
        self.assertIn("nightShade.addColorStop(.82,'rgba(0,4,18,.76)')", out)
        self.assertIn("ellipse(0,alignment.earthRadius*unit*1.48,alignment.earthRadius*unit*.95", out)
        self.assertIn("sunBehindEarth=u_earthR>0.0", out)
        self.assertIn("earthRadius*.95,centerNY+(-1.48+Math.sin(orbitPhase)*.34)*earthRadius", out)
        self.assertIn("u_moonSpin", out)
        self.assertIn("nightShade.addColorStop(.82,'rgba(0,4,18,.76)')", out)
        self.assertIn("orbitRadius=length(vec2(oq.x/.95,(oq.y+1.48)/.34))", out)
        self.assertIn("now-lastAlignment<110", out)
        self.assertIn("for(const event of ['move','moveend','resize','rotate','pitch'])", out)
        self.assertIn("canvas.getContext('webgl'", out)
        self.assertIn("if(u_celestialVisible>.5){vec2 mdv=", out)
        self.assertIn("gl.drawArrays(gl.POINTS", out)
        self.assertIn("bpw-wordmark-main", out)
        self.assertIn("moonRadius=earthRadius*.136", out)
        self.assertIn("u_moonSpin", out)
        self.assertIn("u_earthC", out)
        self.assertIn("spot1=length((n.xy-vec2(-.32,.18))", out)
        self.assertIn("const galaxyProgram=program(", out)
        self.assertIn("const planetProgram=program(", out)
        self.assertIn("float laneA=1.0-smoothstep", out)
        self.assertIn("float laneB=1.0-smoothstep", out)
        self.assertIn("name:'Neptune'", out)
        self.assertIn("radius:earthRadius*.168", out)
        self.assertIn("float vortex=exp(-dist*dist*16.0)", out)
        self.assertIn("Math.log1p(range)*.12", out)
        self.assertIn("ringR=length(vec2(q.x,(q.y-.045*q.x)/.46))", out)
        self.assertIn("cassini=1.0-smoothstep", out)
        self.assertIn("renderPlanets(celestial,now)", out)
        self.assertIn("depth=.72+z*2.0", out)
        self.assertIn("galaxyOffset=.48-.46*galaxyBlend*galaxyBlend*(3-2*galaxyBlend)", out)
        self.assertIn("bandOffset=mix(.48,.02,smoothstep(1.05,1.85,aspect))", out)
        self.assertIn("nebulaOffset=mix(.62,.34,smoothstep(1.05,1.85,aspect))", out)
        self.assertIn("scale=u_bodyType>6.5?2.20:1.0", out)
        self.assertIn("v_bright=step(.82,a_pos.w)", out)
        self.assertIn("function buildWordmark(){", out)
        self.assertIn("return 0;", out)
        self.assertNotIn("document.createElement('i')", out)

    def test_app_gate_preserves_return_path_without_auto_opening_signin_modal(self):
        src = """<script id="bp-app-entry-gate-v6247">
if(!fresh||!valid){location.replace('/?auth=signin&return='+encodeURIComponent(returnTo));return}
catch(_){location.replace('/?auth=signin&return='+encodeURIComponent(location.pathname+location.search))}
<link rel="manifest" href="../manifest.webmanifest">
<script type="module" src="../app.js?v=6247-universal-fresh-entry&sidewalk=6247">
"""
        out = patch_app_index(src)
        self.assertEqual(out.count("/?return="), 2)
        self.assertNotIn("/?auth=signin&return=", out)
        self.assertIn("app.js?v=6254-realistic-solar-scene&sidewalk=6247", out)
        self.assertIn("manifest.webmanifest?v=6254-realistic-solar-scene", out)

    def test_legacy_app_redirects_root_and_keeps_current_offline_cache(self):
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
        self.assertIn("sw.js?v=6254-realistic-solar-scene", out)
        self.assertIn("k!=='bp-intelligence-v6247-universal-fresh-entry-sidewalk'", out)

    def test_root_manifest_start_url_changes_but_identity_is_preserved(self):
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

    def test_worker_script_updates_without_changing_the_offline_cache_name(self):
        from apply_launch_experience_v6248 import patch_worker
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "sw.js"
            path.write_text("const V='" + CACHE_NAME + "';\nself.addEventListener('install',()=>self.skipWaiting());\n")
            patch_worker(path)
            result = path.read_text()
            self.assertIn("const V='" + CACHE_NAME + "';", result)
            self.assertIn("BRIDGEPOINT_LAUNCH_EXPERIENCE_BUILD='" + BUILD + "'", result)

    def test_patch_rejects_unexpected_root_baseline(self):
        with self.assertRaises(AssertionError):
            patch_root_html("<html><body><div id='bpWelcomeGateV1'></div></body></html>")


if __name__ == "__main__":
    unittest.main()
