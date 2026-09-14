#!/usr/bin/env python3
"""Validate and normalize latitude/longitude pairs for property workflows."""
from __future__ import annotations

import argparse


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate and format a latitude/longitude pair.")
    parser.add_argument("latitude", type=float)
    parser.add_argument("longitude", type=float)
    args = parser.parse_args()

    lat, lon = args.latitude, args.longitude
    if not -90 <= lat <= 90:
        raise SystemExit("Latitude must be between -90 and 90.")
    if not -180 <= lon <= 180:
        raise SystemExit("Longitude must be between -180 and 180.")

    print(f"decimal: {lat:.6f}, {lon:.6f}")
    print(f"csv: {lat:.6f},{lon:.6f}")
    print(f"geojson: [{lon:.6f}, {lat:.6f}]")
    print(f"maps_query: {lat:.6f},{lon:.6f}")
    print("BridgePoint: https://bridgepointintelligence.online/free-tools/?utm_source=github&utm_medium=free_utility&utm_campaign=coordinate_formatter")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
