#!/usr/bin/env python3
"""Losslessly pack 16-bit SLDEM2015 height tiles into two-channel WebP.

R stores the original high byte and G stores the original low byte. WebP is
encoded losslessly and is decoded back to the identical uint16 samples by the
BridgePoint browser loader. No elevation quantization or resampling occurs.
"""
from __future__ import annotations
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

def main() -> None:
    site = Path(sys.argv[1] if len(sys.argv) > 1 else "site")
    tile_dir = site / "assets/moon/v1/sldem-128ppd"
    if not tile_dir.is_dir():
        raise SystemExit(f"Missing SLDEM tile directory: {tile_dir}")
    pngs = sorted(tile_dir.glob("moon-sldem-128ppd-y*-x*.png"))
    if len(pngs) < 300:
        raise SystemExit(f"Expected the full SLDEM tile set (>=300 tiles), found {len(pngs)}")

    total_png = total_webp = 0
    for index, src in enumerate(pngs, 1):
        with Image.open(src) as image:
            values = np.asarray(image)
        if values.dtype != np.uint16 or values.ndim != 2 or values.shape != (1280, 1280):
            raise SystemExit(f"Invalid 16-bit SLDEM tile {src.name}: shape={values.shape} dtype={values.dtype}")

        high = (values >> 8).astype(np.uint8)
        low = (values & 255).astype(np.uint8)
        packed = np.stack((high, low, np.zeros_like(high)), axis=-1)
        dst = src.with_suffix(".webp")
        Image.fromarray(packed, mode="RGB").save(
            dst, format="WEBP", lossless=True, quality=100, method=6, exact=True
        )

        # Mandatory pixel-for-pixel round-trip check before the PNG is removed.
        decoded = np.asarray(Image.open(dst).convert("RGB"))
        rebuilt = (decoded[..., 0].astype(np.uint16) << 8) | decoded[..., 1].astype(np.uint16)
        if not np.array_equal(values, rebuilt):
            dst.unlink(missing_ok=True)
            raise SystemExit(f"Lossless WebP verification failed for {src.name}")

        old_size, new_size = src.stat().st_size, dst.stat().st_size
        if new_size >= old_size:
            dst.unlink()
            raise SystemExit(f"Lossless WebP did not reduce {src.name}: {old_size} -> {new_size}")
        total_png += old_size
        total_webp += new_size
        src.unlink()
        if index % 40 == 0:
            print(f"SLDEM_WEBP_PROGRESS {index}/{len(pngs)}", flush=True)

    manifest_path = site / "assets/moon/v1/manifest.json"
    if manifest_path.is_file():
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        manifest["highResolutionTerrainEncoding"] = {
            "format": "lossless-webp-rgb16",
            "channels": {"red": "original uint16 high byte", "green": "original uint16 low byte"},
            "tilePixels": [1280, 1280],
            "quantization": "none",
            "roundTripVerified": True,
            "tileCount": len(pngs),
            "sourceBytes": total_png,
            "storedBytes": total_webp,
        }
        manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    # Force both the public homepage and app shell to load the decoder-aware module.
    old_ref = "bridgepoint-blender-world-v1.js?v=2-raster-hide"
    new_ref = "bridgepoint-blender-world-v1.js?v=3-lossless-gzip"
    html_updates = 0
    for html in site.rglob("*.html"):
        page = html.read_text(encoding="utf-8")
        if old_ref in page:
            html.write_text(page.replace(old_ref, new_ref), encoding="utf-8")
            html_updates += page.count(old_ref)
    if html_updates < 2:
        raise SystemExit(f"Expected homepage and app shell Blender World script references; updated {html_updates}")

    print(
        f"SLDEM_WEBP_COMPLETE tiles={len(pngs)} source={total_png} stored={total_webp} "
        f"saved={1-total_webp/total_png:.1%} exact_uint16=true",
        flush=True,
    )

if __name__ == "__main__":
    main()
