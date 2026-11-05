import sys, tempfile, unittest
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "recovery"))
from apply_bootstrapped_auth_v6230 import (
    patch_landing, patch_app, patch_root_html, patch_app_html, patch_service_worker
)

class BootstrapAuthV6230Tests(unittest.TestCase):
    def test_landing_uses_pc_runtime_and_routes_signin(self):
        source = """const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co',AUTH_STORE='bp_auth_v5045';function openAuth(v){setMode(v||'signup');$('authModal').hidden=false;setTimeout(()=>$('authEmail').focus(),50)}navigator.serviceWorker.register('/sw.js?v=6222-goes-cloud-mask-volumetric',{updateViaCache:'none'});window.addEventListener('bp:welcome-gate-unlocked-v6229',()=>{});"""
        result = patch_landing(source)
        self.assertIn("https://solaris-boat-upgrades-stocks.trycloudflare.com", result)
        self.assertIn("location.assign('/signin/?mode='+next", result)
        self.assertIn("/sw.js?v=6230-bootstrapped-auth", result)

    def test_app_uses_pc_runtime(self):
        source = """const SUPA='https://xdfsjztwgsbmabshzsjw.supabase.co';window.__BP_APP_BUILD_VERSION__=5910;const AUTH_STORE='bp_auth_v5045';"""
        result = patch_app(source)
        self.assertIn("https://solaris-boat-upgrades-stocks.trycloudflare.com", result)
        self.assertIn("__BP_APP_BUILD_VERSION__=6230", result)

    def test_root_html_cache_bust(self):
        source = '<script src="./landing.js?v=6229-mobile-entry&bp=5970"></script><script id="bpMobileLazyLoaderV6229"></script><i class="bpw-globe-aura"></i>'
        self.assertIn("landing.js?v=6230-bootstrapped-auth", patch_root_html(source))

    def test_app_gate_and_worker_refresh(self):
        source = """<script id="bp-app-entry-gate">if(!s?.access_token){location.replace('/?auth=signin')}catch(_){location.replace('/?auth=signin')}</script>
<link rel="icon" href="/icon.svg">
<script type="module" src="../app.js?v=5912-old"></script>"""
        result = patch_app_html(source)
        self.assertEqual(result.count("/signin/?mode=signin"), 2)
        self.assertIn("bp-bootstrap-sw-refresh-v6230", result)
        self.assertIn("../app.js?v=6230-bootstrapped-auth", result)

    def test_service_worker_keeps_existing_cache_name(self):
        source = "const V='bp-intelligence-v6222';\nself.addEventListener('install',()=>self.skipWaiting());"
        result = patch_service_worker(source)
        self.assertIn("const V='bp-intelligence-v6222';", result)
        self.assertIn("BOOTSTRAP_AUTH_BUILD='v6230'", result)

if __name__ == "__main__":
    unittest.main()
