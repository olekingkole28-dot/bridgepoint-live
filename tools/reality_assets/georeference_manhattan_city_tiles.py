#!/usr/bin/env python3
"""Attach accurate WGS84 tile anchors to Blender-exported local EPSG:2263 tiles.

This runs under the regular Python geospatial environment, not Blender's embedded
Python, so pyproj never loads into the Blender process.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from pyproj import Transformer

FT_TO_M = 0.3048006096012192


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--source-manifest", type=Path, required=True)
    args = parser.parse_args()

    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    source = json.loads(args.source_manifest.read_text(encoding="utf-8"))
    origin = source["localOrigin"]
    origin_x_ft = float(origin["projectedXFeet"])
    origin_y_ft = float(origin["projectedYFeet"])
    tile_size_m = float(manifest["tileSizeMeters"])
    transformer = Transformer.from_crs("EPSG:2263", "EPSG:4326", always_xy=True)

    for tile in manifest.get("tiles", []):
        cx, cy = (float(v) for v in tile["localOriginMeters"])
        center_x_ft = origin_x_ft + cx / FT_TO_M
        center_y_ft = origin_y_ft + cy / FT_TO_M
        longitude, latitude = transformer.transform(center_x_ft, center_y_ft)
        half = tile_size_m * 0.5
        projected_corners = [
            (origin_x_ft + (cx - half) / FT_TO_M, origin_y_ft + (cy - half) / FT_TO_M),
            (origin_x_ft + (cx + half) / FT_TO_M, origin_y_ft + (cy - half) / FT_TO_M),
            (origin_x_ft + (cx + half) / FT_TO_M, origin_y_ft + (cy + half) / FT_TO_M),
            (origin_x_ft + (cx - half) / FT_TO_M, origin_y_ft + (cy + half) / FT_TO_M),
        ]
        corners = [transformer.transform(x, y) for x, y in projected_corners]
        tile["longitude"] = float(longitude)
        tile["latitude"] = float(latitude)
        tile["boundsWgs84"] = [
            float(min(p[0] for p in corners)),
            float(min(p[1] for p in corners)),
            float(max(p[0] for p in corners)),
            float(max(p[1] for p in corners)),
        ]
        tile["sourceCrs"] = "EPSG:2263"

    manifest["georeferencing"] = {
        "sourceCrs": "EPSG:2263 NAD83 / New York Long Island (US survey feet)",
        "targetCrs": "EPSG:4326 WGS84 longitude/latitude",
        "transformer": "pyproj in system Python after Blender tile export",
        "originWgs84": [float(origin["longitude"]), float(origin["latitude"])],
    }
    args.manifest.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    if not manifest.get("tiles"):
        raise SystemExit("No tiles were present in the Blender manifest.")
    for tile in manifest["tiles"]:
        if not all(isinstance(tile.get(k), (int, float)) for k in ("longitude", "latitude")):
            raise SystemExit("Tile center georeferencing failed: " + str(tile.get("id")))
        if not isinstance(tile.get("boundsWgs84"), list) or len(tile["boundsWgs84"]) != 4:
            raise SystemExit("Tile bounds georeferencing failed: " + str(tile.get("id")))
    print("BRIDGEPOINT_BLENDER_WORLD_GEOREFERENCE_PASS", len(manifest["tiles"]), "tiles")


if __name__ == "__main__":
    main()
