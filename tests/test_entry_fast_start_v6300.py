from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "recovery"))

from apply_entry_fast_start_v6300 import (
    BUILD,
    CURRENT_CACHE,
    CURRENT_SW_VERSION,
    UPDATER_QUERY,
    add_modulepreload,
    bump_updater_reference,
    patch_app_html,
    patch_manifest,
    patch_root_html,
    validate_updater,
)


def root_fixture() -> str:
    return """<!doctype html>
<html lang="en">
<head><title>BridgePoint Intelligence</title></head>
<body>
<div id="bpWelcomeGateV1">
  <div class="bpw-celestial-system"></div>
  <div class="bpw-wordmark bpw-wordmark-static">
    <span class="bpw-wordmark-main">BRIDGEPOINT</span>
    <span class="bpw-wordmark-sub">INTELLIGENCE</span>
  </div>
  <button data-mode="signup">CREATE FREE ACCOUNT</button>
  <button data-mode="signin">SIGN IN TO BRIDGEPOINT</button>
</div>
<script defer src="/app-update-v5820.js?v=6247-universal-fresh-entry-sidewalk"></script>
<script type="module" src="/bridgepoint-welcome-space-v6260.js?v=6292-mars-night-side-shading"></script>
</body></html>"""


def app_fixture() -> str:
    return """<!doctype html><html><head>
<script defer src="/app-update-v5820.js?v=6247-universal-fresh-entry-sidewalk"></script>
<link rel="manifest" href="../manifest.webmanifest">
</head><body><main>BridgePoint workspace</main></body></html>"""


class EntryFastStartV6300Tests(unittest.TestCase):
    def test_root_preloads_existing_welcome_scene_and_static_brand(self):
        out = patch_root_html(root_fixture())
        self.assertIn('href="/vendor/three.module.js?v=169-local"', out)
        self.assertIn(
            'href="/bridgepoint-welcome-space-v6260.js?v=6292-mars-night-side-shading"',
            out,
        )
        self.assertIn('class="bpw-wordmark-main">BRIDGEPOINT', out)
        self.assertIn('class="bpw-wordmark-sub">INTELLIGENCE', out)
        self.assertIn('src="/app-update-v5820.js?v=6300-direct-entry"', out)
        self.assertIn('data-mode="signup"', out)
        self.assertIn('data-mode="signin"', out)

    def test_root_preload_patch_is_idempotent(self):
        once = patch_root_html(root_fixture())
        twice = patch_root_html(once)
        self.assertEqual(once, twice)
        self.assertEqual(once.count('rel="modulepreload"'), 2)

    def test_app_entry_uses_same_non_reloading_updater(self):
        out = patch_app_html(app_fixture())
        self.assertIn('src="/app-update-v5820.js?v=6300-direct-entry"', out)
        self.assertIn("BridgePoint workspace", out)
        self.assertEqual(patch_app_html(out), out)

    def test_installed_app_opens_the_canonical_welcome_screen_and_keeps_identity(self):
        source = json.dumps({
            "id": "/bridgepoint-intelligence-v5050",
            "name": "BridgePoint Intelligence",
            "start_url": "/app/",
            "scope": "/",
            "display": "standalone"
        })
        result = json.loads(patch_manifest(source))
        self.assertEqual(result["start_url"], "/")
        self.assertEqual(result["scope"], "/")
        self.assertEqual(result["id"], "/bridgepoint-intelligence-v5050")
        self.assertEqual(result["name"], "BridgePoint Intelligence")

    def test_updater_preserves_current_v6292_worker_and_cache_without_navigation(self):
        source = (ROOT / "rebuild-v5000" / "app-update-v5820.js").read_text(encoding="utf-8")
        validate_updater(source)
        self.assertIn(CURRENT_SW_VERSION, source)
        self.assertIn(CURRENT_CACHE, source)
        self.assertNotIn("location.replace", source)
        self.assertNotIn("location.reload", source)
        self.assertNotIn("reloadOnce", source)

    def test_preload_does_not_duplicate_an_existing_exact_module(self):
        source = '<html><head><link rel="modulepreload" href="/x.js"></head></html>'
        self.assertEqual(add_modulepreload(source, "/x.js"), source)


if __name__ == "__main__":
    unittest.main()
