import sys, tempfile, unittest, json
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"recovery"))
from apply_globe_root_handoff_v6231 import patch_landing,patch_app,patch_root_html,patch_app_html,patch_manifest,patch_worker,patch_signin_template

API="https://solaris-boat-upgrades-stocks.trycloudflare.com"

class GlobeRootHandoffV6231Tests(unittest.TestCase):
    def test_website_login_returns_to_root(self):
        src="location.assign('/signin/?mode='+next+'&return='+encodeURIComponent('/app/'));navigator.serviceWorker.register('/sw.js?v=6230-bootstrapped-auth',{updateViaCache:'none'});"+API+" bp_auth_v5045"
        out=patch_landing(src)
        self.assertIn("encodeURIComponent('/')",out)
        self.assertIn("sw.js?v=6231-globe-root",out)

    def test_app_login_and_signup_return_to_root(self):
        src="""async function signIn(email,password){recordLegalAcceptance();setText('authMessage','Signing in…');await authExchange('token?grant_type=password',{email,password});setText('authMessage','');await loadWorkspace(true);if(pendingPackageKey){const pk=pendingPackageKey;pendingPackageKey=null;await handlePackageAction(pk)}}
async function createAccount(email,password){const legal=recordLegalAcceptance();setText('authMessage','Creating account…');const d=await authExchange('signup',{email,password,data:{terms_version:legal.version,terms_accepted_at:legal.accepted_at,privacy_accepted_at:legal.accepted_at,signup_source:'bridgepoint_app'}});if(d?.access_token){setText('authMessage','Account created and signed in.');await loadWorkspace(true)}else setText('authMessage','Account created. Check your email if confirmation is required, then sign in.')}
window.__BP_APP_BUILD_VERSION__=6230;"""+API+" bp_auth_v5045"
        out=patch_app(src)
        self.assertIn("location.replace('/')",out)
        self.assertIn("window.__BP_APP_BUILD_VERSION__=6231;",out)
        self.assertIn("await handlePackageAction(pk)",out)

    def test_root_keeps_globe_assets_and_busts_entry(self):
        src='<script src="./landing.js?v=6230-bootstrapped-auth"></script><link rel="manifest" href="./manifest.webmanifest"><i>bpMobileLazyLoaderV6229</i><b>bpw-globe-aura</b>'
        out=patch_root_html(src)
        self.assertIn("landing.js?v=6231-globe-root",out)
        self.assertIn("manifest.webmanifest?v=6231-globe-root",out)
        self.assertIn("bpw-globe-aura",out)

    def test_app_plain_launch_redirects_to_root_and_preserves_deep_links(self):
        src="""<script id="bp-app-entry-gate">if(!s){location.replace('/signin/?mode=signin&return=%2Fapp%2F')}catch(_){location.replace('/signin/?mode=signin&return=%2Fapp%2F')}</script>
<link rel="manifest" href="../manifest.webmanifest"><script id="bp-bootstrap-sw-refresh-v6230">navigator.serviceWorker.register('/sw.js?v=6230-bootstrapped-auth')</script>
<script type="module" src="../app.js?v=6230-bootstrapped-auth"></script>"""
        out=patch_app_html(src)
        self.assertIn("bp-canonical-globe-entry-v6231",out)
        self.assertEqual(out.count("return=%2F'"),2)
        self.assertIn("manifest.webmanifest?v=6231-globe-root",out)
        self.assertIn("app.js?v=6231-globe-root",out)
        self.assertIn("!location.search&&!location.hash",out)

    def test_manifest_switches_launch_but_preserves_installed_identity(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d)/"manifest.webmanifest"
            p.write_text(json.dumps({"id":"/bridgepoint-intelligence-v5050","start_url":"/app/","scope":"/","display":"standalone"}))
            patch_manifest(p)
            result=json.loads(p.read_text())
            self.assertEqual(result["start_url"],"/")
            self.assertEqual(result["id"],"/bridgepoint-intelligence-v5050")

    def test_worker_keeps_cache_name_and_bumps_script_marker(self):
        src="const V='bp-intelligence-v6222-goes-cloud-mask-volumetric';\nconst BOOTSTRAP_AUTH_BUILD='v6230';\n"
        out=patch_worker(src)
        self.assertIn("const V='bp-intelligence-v6222-goes-cloud-mask-volumetric';",out)
        self.assertIn("GLOBE_ROOT_BUILD='v6231'",out)

    def test_signin_normalizes_legacy_app_return_target(self):
        src="const requestedReturn=params.get('return')||'/app/';\nconst RETURN_TO=requestedReturn.startsWith('/')?requestedReturn:'/app/';\nconst API_ORIGIN='"+API+"';\nconst STORE='bp_auth_v5045';"
        out=patch_signin_template(src)
        self.assertIn("params.get('return')||'/'",out)
        self.assertIn("const RETURN_TO=(requestedReturn==='/app/'||requestedReturn==='/app')?'/':",out)

if __name__=="__main__": unittest.main()
