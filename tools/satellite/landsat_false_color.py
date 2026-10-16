#!/usr/bin/env python3
"""Create a source-backed Landsat false-colour composite for BridgePoint.

The script reads real Landsat Collection 2 Level-2 COG assets, applies the
published band scale/offset, masks fill/cloud/cirrus/shadow/snow using QA_PIXEL,
stretches each display channel using sampled percentiles, and writes:
  * a georeferenced RGB GeoTIFF with an internal validity mask
  * an optimized RGBA PNG with transparent pixels where source data is invalid

Example:
  python landsat_false_color.py --bbox 126.0,71.5,130.0,73.4 --composite earth

Band mapping:
  earth:      R=SWIR-2, G=NIR, B=Red     (Landsat 7, 5, 4)
  water-soil: R=SWIR-1, G=NIR, B=Red    (Landsat 6, 5, 4)
  vegetation: R=NIR, G=Red, B=Green     (classic infrared false colour)

This is an export pipeline, not a claim that the selected scene is current.
"""

from __future__ import annotations

import argparse
import json
import math
import sys
from contextlib import ExitStack
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import planetary_computer
import rasterio
from PIL import Image
from pystac import Item
from pystac_client import Client
from rasterio.enums import Resampling
from rasterio.windows import Window, from_bounds, transform as window_transform
from rasterio.warp import transform_bounds

COLLECTION = "landsat-c2-l2"
STAC_URL = "https://planetarycomputer.microsoft.com/api/stac/v1"
QA_EXCLUDE_BITS = sum(1 << bit for bit in (0, 1, 2, 3, 4, 5))
DEFAULT_COMPOSITES = {
    "earth": ("swir22", "nir08", "red"),
    "water-soil": ("swir16", "nir08", "red"),
    "vegetation": ("nir08", "red", "green"),
}
DISPLAY_NAMES = {
    "swir22": "SWIR-2",
    "swir16": "SWIR-1",
    "nir08": "Near-infrared",
    "red": "Red",
    "green": "Green",
}


def parse_bbox(value: str) -> tuple[float, float, float, float]:
    try:
        vals = tuple(float(part.strip()) for part in value.split(","))
    except ValueError as exc:
        raise argparse.ArgumentTypeError("BBox must be west,south,east,north in decimal degrees.") from exc
    if len(vals) != 4:
        raise argparse.ArgumentTypeError("BBox must contain exactly four numbers: west,south,east,north.")
    west, south, east, north = vals
    if not (-180 <= west < east <= 180 and -90 < south < north < 90):
        raise argparse.ArgumentTypeError("BBox coordinates are invalid or cross the antimeridian.")
    return west, south, east, north


def utc_iso(value: datetime) -> str:
    return value.astimezone(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def item_cloud_cover(item: Item) -> float:
    try:
        return max(0.0, min(100.0, float(item.properties.get("eo:cloud_cover", 100.0))))
    except (TypeError, ValueError):
        return 100.0


def platform_is_landsat_8_or_9(item: Item) -> bool:
    platform = str(item.properties.get("platform", "")).lower()
    item_id = item.id.upper()
    return platform in {"landsat-8", "landsat-9"} or item_id.startswith(("LC08_", "LC09_"))


def query_scene(args: argparse.Namespace) -> Item:
    catalog = Client.open(STAC_URL)
    start = args.date_start
    end = args.date_end or utc_iso(datetime.now(timezone.utc))
    if datetime.fromisoformat(start.replace("Z", "+00:00")) > datetime.fromisoformat(end.replace("Z", "+00:00")):
        raise ValueError("--date-start must be earlier than or equal to --date-end.")

    search = catalog.search(
        collections=[COLLECTION],
        bbox=args.bbox,
        datetime=f"{start}/{end}",
        query={"eo:cloud_cover": {"lte": args.max_cloud}},
        max_items=args.max_items,
    )
    candidates = []
    for item in search.items():
        if not platform_is_landsat_8_or_9(item):
            continue
        if not all(name in item.assets for name in set(DEFAULT_COMPOSITES[args.composite]) | {"qa_pixel"}):
            continue
        candidates.append(item)

    if not candidates:
        raise RuntimeError(
            f"No Landsat 8/9 scene met the area/date/cloud limit (max cloud {args.max_cloud:g}%). "
            "Try a wider date range, a higher --max-cloud value, or a smaller bbox."
        )

    # Prefer the clearest usable scene; within identical cloud cover, prefer the latest.
    candidates.sort(
        key=lambda item: (
            item_cloud_cover(item),
            str(item.properties.get("datetime", "")),
        ),
        reverse=False,
    )
    # The first sort element prioritizes cloud cover; tie-break dates newest first.
    min_cloud = item_cloud_cover(candidates[0])
    best_cloud_group = [it for it in candidates if math.isclose(item_cloud_cover(it), min_cloud, abs_tol=0.05)]
    best_cloud_group.sort(key=lambda item: str(item.properties.get("datetime", "")), reverse=True)
    chosen = best_cloud_group[0]
    return planetary_computer.sign(chosen)


def asset_scale_offset(item: Item, name: str, dataset: rasterio.io.DatasetReader) -> tuple[float, float, float | None]:
    """Read scale/offset/nodata from STAC first, then from Rasterio metadata."""
    meta_list = item.assets[name].extra_fields.get("raster:bands") or []
    band_meta = meta_list[0] if meta_list else {}
    scale = band_meta.get("scale")
    offset = band_meta.get("offset")
    nodata = band_meta.get("nodata")
    if scale is None:
        scale = dataset.scales[0] if dataset.scales else 1.0
    if offset is None:
        offset = dataset.offsets[0] if dataset.offsets else 0.0
    if nodata is None:
        nodata = dataset.nodata
    return float(scale), float(offset), None if nodata is None else float(nodata)


def clipped_read_window(dataset: rasterio.io.DatasetReader, bbox: tuple[float, float, float, float]) -> Window:
    west, south, east, north = bbox
    left, bottom, right, top = transform_bounds("EPSG:4326", dataset.crs, west, south, east, north, densify_pts=31)
    requested = from_bounds(left, bottom, right, top, transform=dataset.transform)
    col0 = max(0, math.floor(requested.col_off))
    row0 = max(0, math.floor(requested.row_off))
    col1 = min(dataset.width, math.ceil(requested.col_off + requested.width))
    row1 = min(dataset.height, math.ceil(requested.row_off + requested.height))
    if col1 <= col0 or row1 <= row0:
        raise RuntimeError("The selected Landsat scene intersects the search bbox but no pixels overlap after reprojection.")
    return Window(col0, row0, col1 - col0, row1 - row0)


def assert_aligned(reference: rasterio.io.DatasetReader, others: dict[str, rasterio.io.DatasetReader]) -> None:
    for name, dataset in others.items():
        if (
            dataset.crs != reference.crs
            or dataset.transform != reference.transform
            or dataset.width != reference.width
            or dataset.height != reference.height
        ):
            raise RuntimeError(f"Source asset '{name}' does not share the reference band's native pixel grid.")


def read_scaled(
    dataset: rasterio.io.DatasetReader,
    window: Window,
    scale: float,
    offset: float,
) -> np.ndarray:
    raw = dataset.read(1, window=window, masked=False)
    return raw.astype(np.float32, copy=False) * scale + offset


def qa_valid_mask(qa: np.ndarray) -> np.ndarray:
    # Landsat QA_PIXEL bits: fill, dilated cloud, cirrus, cloud, shadow, snow.
    return (qa.astype(np.uint16, copy=False) & QA_EXCLUDE_BITS) == 0


def stretch_parameters(
    sources: dict[str, rasterio.io.DatasetReader],
    scales: dict[str, float],
    offsets: dict[str, float],
    nodatas: dict[str, float | None],
    qa_source: rasterio.io.DatasetReader,
    window: Window,
    channel_names: tuple[str, str, str],
    sample_side: int,
    low_percentile: float,
    high_percentile: float,
) -> tuple[dict[str, tuple[float, float]], dict[str, Any]]:
    height, width = int(window.height), int(window.width)
    stride = max(1, math.ceil(max(height, width) / sample_side))
    out_h = max(1, math.ceil(height / stride))
    out_w = max(1, math.ceil(width / stride))
    out_shape = (out_h, out_w)

    qa = qa_source.read(1, window=window, out_shape=out_shape, resampling=Resampling.nearest)
    valid = qa_valid_mask(qa)
    samples: dict[str, np.ndarray] = {}
    percentiles: dict[str, tuple[float, float]] = {}
    details: dict[str, Any] = {"sample_stride": stride, "sample_width": out_w, "sample_height": out_h}

    for name in channel_names:
        ds = sources[name]
        arr = ds.read(1, window=window, out_shape=out_shape, resampling=Resampling.nearest).astype(np.float32)
        arr = arr * scales[name] + offsets[name]
        nodata = nodatas[name]
        if nodata is not None:
            raw = ds.read(1, window=window, out_shape=out_shape, resampling=Resampling.nearest)
            valid_channel = raw != nodata
        else:
            valid_channel = np.isfinite(arr)
        channel_valid = valid & valid_channel & np.isfinite(arr)
        values = arr[channel_valid]
        if values.size < 100:
            raise RuntimeError(f"Not enough valid cloud-free pixels to stretch the '{name}' channel.")
        lo, hi = np.nanpercentile(values, [low_percentile, high_percentile]).astype(float)
        if not np.isfinite(lo) or not np.isfinite(hi) or hi <= lo:
            raise RuntimeError(f"Invalid percentile stretch for channel '{name}': {lo}, {hi}.")
        percentiles[name] = (lo, hi)
        samples[name] = values
        details[DISPLAY_NAMES.get(name, name)] = {
            "low": round(lo, 8),
            "high": round(hi, 8),
            "percentiles": [low_percentile, high_percentile],
            "valid_sample_pixels": int(values.size),
        }
    return percentiles, details


def stretched_uint8(values: np.ndarray, bounds: tuple[float, float], gamma: float) -> np.ndarray:
    low, high = bounds
    normalized = np.clip((values - low) / (high - low), 0.0, 1.0)
    if not math.isclose(gamma, 1.0):
        normalized = np.power(normalized, 1.0 / gamma)
    return np.rint(normalized * 255.0).astype(np.uint8)


def produce_assets(args: argparse.Namespace, item: Item) -> dict[str, Any]:
    channel_names = DEFAULT_COMPOSITES[args.composite]
    outdir = Path(args.output_dir)
    outdir.mkdir(parents=True, exist_ok=True)
    safe_id = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in item.id)
    prefix = f"BridgePoint_{safe_id}_{args.composite}_false_color"
    tif_path = outdir / f"{prefix}.tif"
    png_path = outdir / f"{prefix}.png"

    with ExitStack() as stack:
        sources = {
            name: stack.enter_context(rasterio.open(item.assets[name].href))
            for name in set(channel_names)
        }
        qa_source = stack.enter_context(rasterio.open(item.assets["qa_pixel"].href))
        reference = sources[channel_names[0]]
        assert_aligned(reference, {**sources, "qa_pixel": qa_source})
        window = clipped_read_window(reference, args.bbox)

        scales: dict[str, float] = {}
        offsets: dict[str, float] = {}
        nodatas: dict[str, float | None] = {}
        for name, dataset in sources.items():
            scales[name], offsets[name], nodatas[name] = asset_scale_offset(item, name, dataset)

        stretches, stretch_info = stretch_parameters(
            sources=sources,
            scales=scales,
            offsets=offsets,
            nodatas=nodatas,
            qa_source=qa_source,
            window=window,
            channel_names=channel_names,
            sample_side=args.sample_side,
            low_percentile=args.low_percentile,
            high_percentile=args.high_percentile,
        )

        width, height = int(window.width), int(window.height)
        out_transform = window_transform(window, reference.transform)
        profile = reference.profile.copy()
        profile.update({
            "driver": "GTiff",
            "width": width,
            "height": height,
            "transform": out_transform,
            "count": 3,
            "dtype": "uint8",
            "nodata": None,
            "compress": "deflate",
            "predictor": 2,
            "tiled": True,
            "blockxsize": 512,
            "blockysize": 512,
            "interleave": "pixel",
            "BIGTIFF": "IF_SAFER",
        })

        validity = np.zeros((height, width), dtype=np.uint8)
        png_image = Image.new("RGBA", (width, height), (0, 0, 0, 0))
        tile = max(128, min(1024, args.block_size))

        with rasterio.open(tif_path, "w", **profile) as dest:
            dest.update_tags(
                title="BridgePoint false-colour satellite composite",
                source="USGS/NASA Landsat Collection 2 Level-2 via Microsoft Planetary Computer",
                source_collection=COLLECTION,
                source_item_id=item.id,
                acquisition_datetime=str(item.properties.get("datetime", "")),
                platform=str(item.properties.get("platform", "")),
                eo_cloud_cover_pct=str(item.properties.get("eo:cloud_cover", "unknown")),
                composite=args.composite,
                composite_bands=f"R={channel_names[0]},G={channel_names[1]},B={channel_names[2]}",
                contrast_stretch=f"percentiles {args.low_percentile:g}-{args.high_percentile:g} per channel",
                gamma=str(args.gamma),
                licence_note="See Microsoft Planetary Computer / USGS Landsat dataset terms before redistribution.",
            )

            for row in range(0, height, tile):
                block_h = min(tile, height - row)
                for col in range(0, width, tile):
                    block_w = min(tile, width - col)
                    src_window = Window(window.col_off + col, window.row_off + row, block_w, block_h)
                    qa = qa_source.read(1, window=src_window)
                    valid = qa_valid_mask(qa)
                    channels = []
                    for band_index, name in enumerate(channel_names):
                        ds = sources[name]
                        raw = ds.read(1, window=src_window)
                        nodata = nodatas[name]
                        if nodata is not None:
                            valid &= raw != nodata
                        scaled = raw.astype(np.float32) * scales[name] + offsets[name]
                        valid &= np.isfinite(scaled)
                        channels.append(stretched_uint8(scaled, stretches[name], args.gamma))

                    rgb = np.stack(channels, axis=-1)
                    rgb[~valid] = 0
                    dest.write(np.moveaxis(rgb, -1, 0), window=Window(col, row, block_w, block_h))
                    validity[row:row + block_h, col:col + block_w] = valid.astype(np.uint8) * 255
                    rgba = np.dstack((rgb, valid.astype(np.uint8) * 255))
                    png_image.paste(Image.fromarray(rgba, mode="RGBA"), (col, row))

            dest.write_mask(validity)

        png_image.save(png_path, format="PNG", optimize=True, compress_level=6)
        png_image.close()

    return {
        "status": "success",
        "item_id": item.id,
        "collection": COLLECTION,
        "platform": item.properties.get("platform"),
        "acquired_at": item.properties.get("datetime"),
        "scene_cloud_cover_pct": item.properties.get("eo:cloud_cover"),
        "bbox_wgs84": list(args.bbox),
        "source_pixel_size_m": 30,
        "composite": args.composite,
        "bands_rgb": {
            "R": {"key": channel_names[0], "name": DISPLAY_NAMES[channel_names[0]]},
            "G": {"key": channel_names[1], "name": DISPLAY_NAMES[channel_names[1]]},
            "B": {"key": channel_names[2], "name": DISPLAY_NAMES[channel_names[2]]},
        },
        "stretch": stretch_info,
        "width_px": width,
        "height_px": height,
        "geotiff": str(tif_path),
        "png": str(png_path),
        "attribution": "USGS/NASA Landsat Collection 2 Level-2 via Microsoft Planetary Computer",
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Build a false-colour Landsat GeoTIFF and optimized PNG using per-channel percentile stretches."
    )
    parser.add_argument("--bbox", required=True, type=parse_bbox, help="AOI in lon/lat: west,south,east,north.")
    parser.add_argument("--composite", choices=sorted(DEFAULT_COMPOSITES), default="earth")
    parser.add_argument("--date-start", default="2013-01-01T00:00:00Z", help="UTC ISO date/time (default: start of Landsat 8 era).")
    parser.add_argument("--date-end", default=None, help="UTC ISO date/time (default: now).")
    parser.add_argument("--max-cloud", type=float, default=20.0, help="Maximum scene-wide cloud cover percentage (default: 20).")
    parser.add_argument("--max-items", type=int, default=100, help="Maximum STAC results to evaluate (default: 100).")
    parser.add_argument("--low-percentile", type=float, default=2.0)
    parser.add_argument("--high-percentile", type=float, default=98.0)
    parser.add_argument("--sample-side", type=int, default=1600, help="Maximum width/height for the percentile sampling grid.")
    parser.add_argument("--gamma", type=float, default=0.9, help="Display gamma; values below 1 brighten midtones (default: 0.9).")
    parser.add_argument("--block-size", type=int, default=512, help="Processing tile size (128-1024 pixels).")
    parser.add_argument("--output-dir", default="output/false-color", help="Output directory (default: output/false-color).")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if not (0 <= args.max_cloud <= 100):
        parser.error("--max-cloud must be between 0 and 100.")
    if not (0 <= args.low_percentile < args.high_percentile <= 100):
        parser.error("Percentiles must satisfy 0 <= low < high <= 100.")
    if args.sample_side < 100:
        parser.error("--sample-side must be at least 100.")
    if args.gamma <= 0:
        parser.error("--gamma must be greater than zero.")
    if not (128 <= args.block_size <= 1024):
        parser.error("--block-size must be between 128 and 1024.")

    try:
        item = query_scene(args)
        result = produce_assets(args, item)
        result["percentile_bounds"] = [args.low_percentile, args.high_percentile]
        print(json.dumps(result, indent=2))
        return 0
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
