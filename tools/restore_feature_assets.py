"""Restore the exact published model files when rebuilding the Pages site."""
import hashlib
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import urlopen

ORIGIN = "https://bridgepointintelligence.online/"
MANIFEST = "bridgepoint-model-assets-v1.json"
DIRECTORIES = ("assets/shipwrecks/", "assets/plane-wrecks/", "assets/spacecraft/",
               "assets/underground/jenolan-caves-v1/", "vendor/draco/", "vendor/basis/")
VENDOR = {"vendor/" + name for name in ("three.module.js", "GLTFLoader.bundle.js",
                                         "DRACOLoader.bundle.js", "KTX2Loader.bundle.js")}
MODULES = ("shipwrecks", "plane-wrecks", "plane-wrecks-extra", "spacecraft",
           "spacecraft-columbia", "spacecraft-discovery", "spacecraft-saturn", "jenolan-caves")
SCRIPTS = {prefix + "bridgepoint-" + name + "-v1.js" for prefix in ("", "app/") for name in MODULES}

def allowed(name):
    return (name in VENDOR or name in SCRIPTS or name.startswith(DIRECTORIES)) and all(
        part not in ("", ".", "..") for part in name.split("/")
    )

def digest(path):
    with path.open("rb") as stream:
        return hashlib.file_digest(stream, "sha256").hexdigest()

def write_manifest(root):
    names = set(VENDOR) | SCRIPTS
    for directory in DIRECTORIES:
        names.update(p.relative_to(root).as_posix() for p in (root / directory).rglob("*") if p.is_file())
    hashes = {name: digest(root / name) for name in sorted(names)}
    (root / MANIFEST).write_text(json.dumps(hashes, indent=2) + "\n")

def restore(root):
    try:
        with urlopen(ORIGIN + MANIFEST, timeout=30) as response:
            hashes = json.load(response)
    except HTTPError as error:
        if error.code == 404:
            sys.exit(44)  # First deployment with manifest support.
        raise
    if not (VENDOR | SCRIPTS).issubset(hashes) or not all(map(allowed, hashes)):
        raise ValueError("Published model manifest is incomplete or contains unexpected paths")

    def fetch(item):
        name, expected = item
        path = root / name
        path.parent.mkdir(parents=True, exist_ok=True)
        with urlopen(ORIGIN + quote(name), timeout=90) as response, path.open("wb") as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
        if digest(path) != expected:
            raise ValueError(f"Published model asset changed during restoration: {name}")

    with ThreadPoolExecutor(max_workers=6) as pool:
        list(pool.map(fetch, hashes.items()))

if __name__ == "__main__":
    mode, directory = sys.argv[1:]
    {"write": write_manifest, "restore": restore}[mode](Path(directory))
