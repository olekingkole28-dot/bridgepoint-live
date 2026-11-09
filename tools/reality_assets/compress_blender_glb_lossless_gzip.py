#!/usr/bin/env python3
"""Losslessly gzip Manhattan GLB tiles and update the published tile manifest."""
from __future__ import annotations
import gzip
import hashlib
import json
import sys
from pathlib import Path

CHUNK = 8 * 1024 * 1024

def digest_stream(stream) -> tuple[int, str]:
    size = 0
    sha = hashlib.sha256()
    while True:
        block = stream.read(CHUNK)
        if not block:
            break
        size += len(block)
        sha.update(block)
    return size, sha.hexdigest()

def main() -> None:
    site = Path(sys.argv[1] if len(sys.argv) > 1 else "site")
    world = site / "assets/blender-world"
    manifest_path = world / "manifest.json"
    if not manifest_path.is_file():
        raise SystemExit(f"Missing Blender World manifest: {manifest_path}")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    tiles = manifest.get("tiles")
    if not isinstance(tiles, list) or not tiles:
        raise SystemExit("Blender World manifest contains no tiles.")

    raw_total = packed_total = 0
    max_packed = 0
    for tile in tiles:
        relative = str(tile.get("url", ""))
        if not relative.endswith(".glb") or ".." in Path(relative).parts:
            raise SystemExit(f"Unsafe or unexpected Blender World tile URL: {relative}")
        source = world / relative
        if not source.is_file():
            raise SystemExit(f"Missing Blender World GLB: {source}")
        target = source.with_suffix(source.suffix + ".gz")
        raw_size = source.stat().st_size
        source_hash = hashlib.sha256()
        with source.open("rb") as src, target.open("wb") as out:
            with gzip.GzipFile(filename="", mode="wb", fileobj=out, compresslevel=9, mtime=0) as gz:
                while True:
                    block = src.read(CHUNK)
                    if not block:
                        break
                    source_hash.update(block)
                    gz.write(block)
        packed_size = target.stat().st_size
        if packed_size >= raw_size:
            target.unlink(missing_ok=True)
            raise SystemExit(f"Gzip did not reduce the GLB tile {relative}: {raw_size} -> {packed_size}")

        with gzip.open(target, "rb") as check:
            decoded_size, decoded_hash = digest_stream(check)
        if decoded_size != raw_size or decoded_hash != source_hash.hexdigest():
            target.unlink(missing_ok=True)
            raise SystemExit(f"Gzip round-trip verification failed for {relative}")

        # Keep each static file under GitHub's per-file delivery boundary.
        if packed_size > 99_000_000:
            target.unlink(missing_ok=True)
            raise SystemExit(f"Compressed GLB still exceeds 99 MB: {relative} -> {packed_size}")

        tile["url"] = relative + ".gz"
        tile["bytes"] = packed_size
        raw_total += raw_size
        packed_total += packed_size
        max_packed = max(max_packed, packed_size)
        source.unlink()

    manifest["totalBytes"] = packed_total
    manifest["transportEncoding"] = "gzip; browser decompresses before GLTFLoader.parse"
    manifest["losslessCompression"] = {
        "algorithm": "gzip/deflate level 9",
        "tileCount": len(tiles),
        "sourceBytes": raw_total,
        "storedBytes": packed_total,
        "maximumTileBytes": max_packed,
        "roundTripVerified": True,
    }
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(
        f"BLENDER_GLB_GZIP_COMPLETE tiles={len(tiles)} source={raw_total} stored={packed_total} "
        f"saved={1-packed_total/raw_total:.1%} maxTile={max_packed} exact=true",
        flush=True,
    )

if __name__ == "__main__":
    main()
