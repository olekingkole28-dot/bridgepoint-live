from __future__ import annotations

import json
import re
import shutil
import sys
from pathlib import Path

BUILD = "v6300-direct-entry"
UPDATER_QUERY = "v=6300-direct-entry"
CURRENT_SW_VERSION = "6306-mobile-planet-picker"
CURRENT_CACHE = "bp-intelligence-v6306-mobile-planet-picker"


def bump_updater_reference(source: str, label: str) -> str:
    pattern = re.compile(
        r'(<script\b[^>]*?\bsrc=["\'][^"\']*app-update-v5820\.js)(?:\?[^"\']*)?(["\'][^>]*>)',
        re.IGNORECASE,
    )
    result, count = pattern.subn(r"\g<1>?" + UPDATER_QUERY + r"\g<2>", source)
    if count < 1:
        raise AssertionError(f"{label}: app-update-v5820.js script reference missing")
    return result


def add_modulepreload(source: str, href: str) -> str:
    # Avoid duplicate requests while allowing the exact URL/cache-buster to evolve.
    if re.search(
        r'<link\b(?=[^>]*\brel=["\']modulepreload["\'])(?=[^>]*\bhref=["\']'
        + re.escape(href)
        + r'["\'])[^>]*>',
        source,
        re.IGNORECASE,
    ):
        return source
    tag = f'<link rel="modulepreload" href="{href}" fetchpriority="high">'
    if "</head>" not in source:
        raise AssertionError("Root entry: closing </head> not found")
    return source.replace("</head>", tag + "\n</head>", 1)


def patch_root_html(source: str) -> str:
    required = (
        'id="bpWelcomeGateV1"',
        'class="bpw-celestial-system"',
        'class="bpw-wordmark bpw-wordmark-static"',
        'class="bpw-wordmark-main"',
        'class="bpw-wordmark-sub"',
        "bpWelcomeGateStylesV6257",
        'data-mode="signup"',
        'data-mode="signin"',
    )
    for marker in required:
        if marker not in source:
            raise AssertionError(f"Root entry is missing the current welcome experience marker: {marker}")

    source = bump_updater_reference(source, "Root entry")
    module_match = re.search(
        r'<script\b(?=[^>]*\bsrc=["\']([^"\']*bridgepoint-welcome-space-v6260\.js(?:\?[^"\']*)?)["\'])[^>]*>',
        source,
        re.IGNORECASE,
    )
    if not module_match:
        raise AssertionError("Root entry: current v6260 welcome-space module is missing")
    module_href = module_match.group(1)

    source = add_modulepreload(source, "/vendor/three.module.js?v=169-local")
    source = add_modulepreload(source, module_href)
    return source


def patch_app_html(source: str) -> str:
    return bump_updater_reference(source, "App entry")


def patch_manifest(source: str) -> str:
    data = json.loads(source)
    # Preserve the installed-app identity while making the app icon open
    # the same canonical welcome entry as the website.
    data["start_url"] = "/"
    data["scope"] = "/"
    return json.dumps(data, indent=2, ensure_ascii=False) + "\n"


def validate_updater(source: str) -> None:
    required = (
        "BUILD=6300",
        "CACHE_VERSION='6306-mobile-planet-picker'",
        "CURRENT_CACHE='bp-intelligence-v6306-mobile-planet-picker'",
        "reloadDeferredUntilNavigation:true",
        "controllerchange",
    )
    for marker in required:
        if marker not in source:
            raise AssertionError(f"Updater is missing required direct-entry behavior: {marker}")
    forbidden = ("location.replace", "location.reload", "reloadOnce")
    for marker in forbidden:
        if marker in source:
            raise AssertionError(f"Updater must not force a navigation: {marker}")


def apply(site: Path, updater_source: Path) -> None:
    root_path = site / "index.html"
    app_path = site / "app" / "index.html"
    manifest_path = site / "manifest.webmanifest"
    updater_target = site / "app-update-v5820.js"
    for required in (root_path, app_path, manifest_path, updater_source):
        if not required.is_file():
            raise FileNotFoundError(f"Required entry artifact is missing: {required}")

    updater = updater_source.read_text(encoding="utf-8")
    validate_updater(updater)
    root = patch_root_html(root_path.read_text(encoding="utf-8"))
    app = patch_app_html(app_path.read_text(encoding="utf-8"))
    manifest = patch_manifest(manifest_path.read_text(encoding="utf-8"))

    root_path.write_text(root, encoding="utf-8")
    app_path.write_text(app, encoding="utf-8")
    manifest_path.write_text(manifest, encoding="utf-8")
    shutil.copyfile(updater_source, updater_target)


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit("Usage: apply_entry_fast_start_v6300.py SITE_DIR UPDATER_SOURCE")
    apply(Path(sys.argv[1]), Path(sys.argv[2]))
    print("V6300_DIRECT_ENTRY_READY")
    print("Root welcome world preloads the Three.js runtime and existing celestial scene.")
    print("Website, installed app, and app shell use one non-reloading updater.")
    print("The published v6292 service-worker cache is preserved.")


if __name__ == "__main__":
    main()
