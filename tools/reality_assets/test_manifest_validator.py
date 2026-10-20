import json
import struct
import tempfile
import unittest
from pathlib import Path

from tools.reality_assets.validate_manifest import validate_glb, validate_manifest_data


def write_glb(path: Path) -> None:
    # Tiny structural GLB used only to test the validator; it is not a renderable product asset.
    document = {
        "asset": {"version": "2.0"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": {}}]}],
    }
    raw = json.dumps(document, separators=(",", ":")).encode("utf-8")
    raw += b" " * ((4 - len(raw) % 4) % 4)
    size = 12 + 8 + len(raw)
    path.write_bytes(struct.pack("<4sII", b"glTF", 2, size) +
                     struct.pack("<II", len(raw), 0x4E4F534A) + raw)


def valid_asset() -> dict:
    return {
        "id": "pilot-block",
        "title": "Pilot block mesh",
        "modelUrl": "/assets/reality-assets/pilot-block.glb",
        "boundsWgs84": [-73.99, 40.72, -73.98, 40.73],
        "longitude": -73.985,
        "latitude": 40.725,
        "targetHeightMeters": 34.0,
        "minZoom": 16,
        "upAxis": "Y",
        "rotationDegrees": 0,
        "groundOffsetMeters": 0,
        "capturedAt": "2026-10-19T12:00:00Z",
        "source": "Authorized pilot capture",
        "sourceUrl": "https://example.org/source-record",
        "license": "CC BY 4.0",
        "attribution": "Example contributor",
    }


class RealityAssetManifestTests(unittest.TestCase):
    def test_empty_catalog_is_valid(self):
        with tempfile.TemporaryDirectory() as tmp:
            count = validate_manifest_data({"schemaVersion": 1, "assets": []}, Path(tmp))
            self.assertEqual(count, 0)

    def test_valid_embedded_glb_manifest_passes(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_glb(root / "pilot-block.glb")
            count = validate_manifest_data({"schemaVersion": 1, "assets": [valid_asset()]}, root)
            self.assertEqual(count, 1)

    def test_external_model_url_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            asset = valid_asset()
            asset["modelUrl"] = "https://example.org/mesh.glb"
            with self.assertRaisesRegex(ValueError, "same-origin"):
                validate_manifest_data({"schemaVersion": 1, "assets": [asset]}, Path(tmp))

    def test_path_traversal_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            asset = valid_asset()
            asset["modelUrl"] = "/assets/reality-assets/../other.glb"
            with self.assertRaises(ValueError):
                validate_manifest_data({"schemaVersion": 1, "assets": [asset]}, Path(tmp))

    def test_bad_geometry_bounds_are_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_glb(root / "pilot-block.glb")
            asset = valid_asset()
            asset["boundsWgs84"] = [-73.99, 40.72, -73.98, 40.73]
            asset["longitude"] = 0
            with self.assertRaisesRegex(ValueError, "anchor"):
                validate_manifest_data({"schemaVersion": 1, "assets": [asset]}, root)

    def test_missing_attribution_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            write_glb(root / "pilot-block.glb")
            asset = valid_asset()
            asset.pop("attribution")
            with self.assertRaisesRegex(ValueError, "attribution"):
                validate_manifest_data({"schemaVersion": 1, "assets": [asset]}, root)

    def test_malformed_glb_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / "bad.glb"
            path.write_bytes(b"not a GLB")
            with self.assertRaisesRegex(ValueError, "too short|binary glTF"):
                validate_glb(path)


if __name__ == "__main__":
    unittest.main()
