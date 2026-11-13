#!/usr/bin/env python3
"""
Fetch NOAA GOES full-disk Enterprise Cloud Mask + 2 km Cloud Top Height
and convert them into compact, provenance-labelled BridgePoint cloud points.

Heavy NetCDF inputs and JSON outputs are written outside Git (ExternalAssets).
The output is an observed cloud-field data product, not yet a rendered cloud mesh.
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import math
import re
import sys
from pathlib import Path
from typing import Any

SCAN_RE = re.compile(r"_s(?P<stamp>\d{13,14})_")
SATELLITES = {
    "GOES19": "noaa-goes19",  # GOES-East
    "GOES18": "noaa-goes18",  # GOES-West
}
MASK_PRODUCT = "ABI-L2-ACMF"
HEIGHT_PRODUCT = "ABI-L2-ACHA2KMF"
SCHEMA = "bridgepoint-earth-cloud-field-v1"


def parse_goes_scan_time(key: str) -> dt.datetime | None:
    """Parse NOAA's sYYYYDDDHHMMSS scan-start token as an aware UTC time."""
    match = SCAN_RE.search(key)
    if not match:
        return None
    try:
        stamp = dt.datetime.strptime(match.group("stamp")[:13], "%Y%j%H%M%S")
        return stamp.replace(tzinfo=dt.timezone.utc)
    except ValueError:
        return None


def cloud_class_confidence(mask_class: int) -> float:
    """Conservative fallback confidence when Cloud_Probabilities is absent."""
    return {0: 0.0, 1: 0.25, 2: 0.65, 3: 0.95}.get(int(mask_class), 0.0)


def cloud_class_opacity(mask_class: int, confidence: float) -> float:
    """Map NOAA class + probability into a render-opacity hint, not a truth score."""
    mask_class = int(mask_class)
    if mask_class <= 0 or mask_class > 3:
        return 0.0
    confidence = min(1.0, max(0.0, float(confidence)))
    class_floor = {1: 0.12, 2: 0.35, 3: 0.62}[mask_class]
    return max(class_floor, min(0.96, confidence))


def choose_sample_stride(width: int, height: int, max_points: int) -> int:
    if width <= 0 or height <= 0 or max_points <= 0:
        raise ValueError("Grid dimensions and max_points must be positive.")
    stride = 1
    while math.ceil(width / stride) * math.ceil(height / stride) > max_points:
        stride *= 2
    return stride


def is_valid_cloud_point(
    latitude: float,
    longitude: float,
    cloud_top_height_m: float,
    mask_class: int,
    confidence: float,
) -> bool:
    values = (latitude, longitude, cloud_top_height_m, confidence)
    if not all(math.isfinite(float(v)) for v in values):
        return False
    if not -90.0 <= latitude <= 90.0 or not -180.0 <= longitude <= 180.0:
        return False
    if not 0.0 <= cloud_top_height_m <= 25000.0:
        return False
    if int(mask_class) not in (1, 2, 3):
        return False
    return 0.0 <= confidence <= 1.0


def _list_recent_objects(s3: Any, bucket: str, product: str, now: dt.datetime, lookback_hours: int) -> list[dict]:
    found: list[dict] = []
    for hours_back in range(max(1, lookback_hours)):
        hour_time = now - dt.timedelta(hours=hours_back)
        prefix = f"{product}/{hour_time.year:04d}/{hour_time.timetuple().tm_yday:03d}/{hour_time.hour:02d}/"
        paginator = s3.get_paginator("list_objects_v2")
        for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
            for item in page.get("Contents", []):
                if item["Key"].endswith(".nc"):
                    scan_time = parse_goes_scan_time(item["Key"])
                    if scan_time is not None:
                        found.append({
                            "key": item["Key"],
                            "scan_time": scan_time,
                            "size": int(item.get("Size", 0)),
                        })
    return found


def _latest_matching_pairs(
    mask_objects: list[dict],
    height_objects: list[dict],
    max_pair_gap_seconds: int,
    max_pairs: int,
) -> list[tuple[dict, dict]]:
    """Pair each mask with one closest height scan, then retain newest frames."""
    candidates: list[tuple[float, dict, dict]] = []
    for mask in mask_objects:
        for height in height_objects:
            gap = abs((height["scan_time"] - mask["scan_time"]).total_seconds())
            if gap <= max_pair_gap_seconds:
                candidates.append((gap, mask, height))

    # Globally choose the closest timestamp matches first. This prevents a
    # later mask from stealing a height scan that is much closer to an older
    # mask simply because the newer mask was iterated first.
    candidates.sort(key=lambda item: item[0])
    used_masks: set[str] = set()
    used_heights: set[str] = set()
    pairs: list[tuple[dict, dict]] = []

    for _, mask, height in candidates:
        if mask["key"] in used_masks or height["key"] in used_heights:
            continue
        used_masks.add(mask["key"])
        used_heights.add(height["key"])
        pairs.append((mask, height))

    pairs.sort(key=lambda pair: pair[0]["scan_time"])
    limit = max(1, max_pairs)
    if len(pairs) > limit:
        pairs = pairs[-limit:]
    return pairs


def _download_file(s3: Any, bucket: str, key: str, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    s3.download_file(bucket, key, str(destination))


def _load_cloud_points(mask_path: Path, height_path: Path, max_points: int) -> tuple[list[dict], int]:
    try:
        import netCDF4
        import numpy as np
        from pyproj import CRS, Transformer
    except ImportError as exc:
        raise RuntimeError(
            "Missing processing dependencies. Install Scripts/requirements_noaa_cloud_fields.txt."
        ) from exc

    with netCDF4.Dataset(mask_path, "r") as mask_ds, netCDF4.Dataset(height_path, "r") as height_ds:
        for variable in ("ACM", "DQF", "x", "y", "goes_imager_projection"):
            if variable not in mask_ds.variables:
                raise RuntimeError(f"Mask dataset is missing required variable {variable}.")
        for variable in ("HT", "DQF", "x", "y", "goes_imager_projection"):
            if variable not in height_ds.variables:
                raise RuntimeError(f"Cloud-height dataset is missing required variable {variable}.")

        mask = np.ma.filled(mask_ds.variables["ACM"][:], 255).astype(np.int16)
        mask_dqf = np.ma.filled(mask_ds.variables["DQF"][:], 255).astype(np.int16)
        height = np.ma.filled(height_ds.variables["HT"][:], -9999).astype(np.float32)
        height_dqf = np.ma.filled(height_ds.variables["DQF"][:], 255).astype(np.int16)

        if mask.ndim != 2 or height.ndim != 2 or mask.shape != height.shape:
            raise RuntimeError(f"Cloud mask / height grid mismatch: {mask.shape} vs {height.shape}")
        if mask_dqf.shape != mask.shape or height_dqf.shape != height.shape:
            raise RuntimeError("Cloud data quality grids do not match the cloud field grid.")

        mask_x = np.asarray(mask_ds.variables["x"][:], dtype=np.float64)
        mask_y = np.asarray(mask_ds.variables["y"][:], dtype=np.float64)
        height_x = np.asarray(height_ds.variables["x"][:], dtype=np.float64)
        height_y = np.asarray(height_ds.variables["y"][:], dtype=np.float64)
        if mask_x.shape != height_x.shape or mask_y.shape != height_y.shape:
            raise RuntimeError("Cloud mask and height coordinate axes differ.")
        if not np.allclose(mask_x, height_x, rtol=0.0, atol=1e-10) or not np.allclose(mask_y, height_y, rtol=0.0, atol=1e-10):
            raise RuntimeError("Cloud mask and height coordinate axes are not aligned.")

        projection = mask_ds.variables["goes_imager_projection"]
        height_m = float(projection.perspective_point_height)
        crs = CRS.from_proj4(
            f"+proj=geos +h={height_m} "
            f"+lon_0={float(projection.longitude_of_projection_origin)} "
            f"+sweep={str(projection.sweep_angle_axis)} "
            f"+a={float(projection.semi_major_axis)} "
            f"+b={float(projection.semi_minor_axis)} +units=m +no_defs"
        )
        transformer = Transformer.from_crs(crs, CRS.from_epsg(4326), always_xy=True)

        x_units = str(getattr(mask_ds.variables["x"], "units", "rad")).lower()
        y_units = str(getattr(mask_ds.variables["y"], "units", "rad")).lower()
        x_values = mask_x * height_m if "rad" in x_units else mask_x
        y_values = mask_y * height_m if "rad" in y_units else mask_y

        probability = None
        for candidate in ("Cloud_Probabilities", "Cloud_Probability", "Cloud_robabilities"):
            if candidate in mask_ds.variables:
                probability = np.ma.filled(mask_ds.variables[candidate][:], np.nan).astype(np.float32)
                break
        if probability is not None and probability.shape != mask.shape:
            raise RuntimeError("Cloud probability grid does not match the cloud mask grid.")

        height_var = height_ds.variables["HT"]
        height_units = str(getattr(height_var, "units", "m")).lower()
        if height_units not in ("m", "meter", "meters", "metre", "metres"):
            raise RuntimeError(f"Unexpected cloud-top height units: {height_units}")

        stride = choose_sample_stride(mask.shape[1], mask.shape[0], max_points)
        rows = np.arange(0, mask.shape[0], stride, dtype=np.int32)
        cols = np.arange(0, mask.shape[1], stride, dtype=np.int32)
        row_grid, col_grid = np.meshgrid(rows, cols, indexing="ij")

        selected_mask = mask[row_grid, col_grid]
        selected_mask_dqf = mask_dqf[row_grid, col_grid]
        selected_height = height[row_grid, col_grid]
        selected_height_dqf = height_dqf[row_grid, col_grid]

        valid = (
            np.isin(selected_mask, (1, 2, 3)) &
            (selected_mask_dqf == 0) &
            (selected_height_dqf == 0) &
            np.isfinite(selected_height) &
            (selected_height >= 0.0) &
            (selected_height <= 25000.0)
        )

        if probability is not None:
            selected_probability = probability[row_grid, col_grid]
            valid &= np.isfinite(selected_probability)
            # NetCDF auto-scaling is normally active, but tolerate packed
            # integer probability values when files are opened without scale.
            selected_probability = np.where(
                selected_probability > 1.0,
                selected_probability / 65535.0,
                selected_probability,
            )
        else:
            class_probability = np.asarray([0.0, 0.25, 0.65, 0.95], dtype=np.float32)
            selected_probability = class_probability[np.clip(selected_mask, 0, 3)]

        valid_rows = row_grid[valid]
        valid_cols = col_grid[valid]
        if valid_rows.size == 0:
            return [], stride

        sample_x = x_values[valid_cols]
        sample_y = y_values[valid_rows]
        lon, lat = transformer.transform(sample_x, sample_y)

        points: list[dict] = []
        valid_masks = selected_mask[valid]
        valid_heights = selected_height[valid]
        valid_probabilities = selected_probability[valid]
        for latitude, longitude, top_m, mask_class, confidence in zip(
            lat, lon, valid_heights, valid_masks, valid_probabilities
        ):
            latitude = float(latitude)
            longitude = float(longitude)
            top_m = float(top_m)
            mask_class = int(mask_class)
            confidence = min(1.0, max(0.0, float(confidence)))
            if not is_valid_cloud_point(latitude, longitude, top_m, mask_class, confidence):
                continue
            points.append({
                "lat": round(latitude, 6),
                "lon": round(longitude, 6),
                "cloud_top_m": round(top_m, 1),
                "mask_class": mask_class,
                "probability": round(confidence, 3),
                "opacity_hint": round(cloud_class_opacity(mask_class, confidence), 3),
            })

        return points, stride


def build_satellite_field(
    satellite: str,
    bucket: str,
    mask_object: dict,
    height_object: dict,
    s3: Any,
    output_dir: Path,
    max_points: int,
    frame_index: int = 0,
    frame_count: int = 1,
) -> dict:
    mask_time = mask_object["scan_time"]
    height_time = height_object["scan_time"]
    sat_dir = output_dir / satellite
    downloads = sat_dir / "downloads"
    mask_file = downloads / Path(mask_object["key"]).name
    height_file = downloads / Path(height_object["key"]).name
    _download_file(s3, bucket, mask_object["key"], mask_file)
    _download_file(s3, bucket, height_object["key"], height_file)

    points, stride = _load_cloud_points(mask_file, height_file, max_points)
    if not points:
        raise RuntimeError(f"{satellite} produced no quality-valid cloudy points.")

    stamp = mask_time.strftime("%Y%jT%H%M%SZ")
    output_file = sat_dir / f"cloud-field-{satellite}-{stamp}.json"
    output_file.parent.mkdir(parents=True, exist_ok=True)

    payload = {
        "schema": SCHEMA,
        "source": {
            "source_id": f"noaa-{satellite.lower()}-abi-enterprise-cloud-mask",
            "source_name": "NOAA/NESDIS GOES ABI Enterprise Cloud Mask + 2 km Cloud Top Height",
            "source_version": "ABI-L2-ACMF + ABI-L2-ACHA2KMF",
            "satellite": satellite,
            "frame_index": frame_index,
            "frame_count": frame_count,
            "mask_scan_start_utc": mask_time.isoformat().replace("+00:00", "Z"),
            "height_scan_start_utc": height_time.isoformat().replace("+00:00", "Z"),
            "evidence_kind": "Observed",
            "license_id": "NOAA_PUBLIC_DATA_SOURCE_REVIEW_REQUIRED",
            "attribution": "NOAA/NESDIS GOES-R Series ABI",
            "commercially_cleared": False,
            "spatial_resolution_m": 2000,
            "cloud_height_units": "m",
            "cloud_height_reference": "geopotential_height_m",
            "mask_classes": {
                "0": "confidently_clear",
                "1": "probably_clear",
                "2": "probably_cloudy",
                "3": "confidently_cloudy",
            },
            "quality_policy": "Only DQF=0 samples are exported.",
        },
        "sampling": {
            "stride_pixels": stride,
            "source_grid_width": None,
            "source_grid_height": None,
            "point_count": len(points),
            "maximum_points": max_points,
        },
        "points": points,
    }
    output_file.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")

    return {
        "satellite": satellite,
        "observed_at_utc": mask_time.isoformat().replace("+00:00", "Z"),
        "height_observed_at_utc": height_time.isoformat().replace("+00:00", "Z"),
        "file": str(output_file.relative_to(output_dir)).replace("\\", "/"),
        "point_count": len(points),
        "stride_pixels": stride,
        "source_ids": [mask_object["key"], height_object["key"]],
        "attribution": "NOAA/NESDIS GOES-R Series ABI",
        "evidence_kind": "Observed",
        "commercially_cleared": False,
    }


def run(args: argparse.Namespace) -> int:
    try:
        import boto3
        from botocore import UNSIGNED
        from botocore.config import Config
    except ImportError as exc:
        raise RuntimeError(
            "Install Scripts/requirements_noaa_cloud_fields.txt before running."
        ) from exc

    now = dt.datetime.now(dt.timezone.utc)
    s3 = boto3.client("s3", region_name="us-east-1", config=Config(signature_version=UNSIGNED))
    output_dir = Path(args.output_dir).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    sources = []
    errors = []
    for satellite, bucket in SATELLITES.items():
        masks = _list_recent_objects(s3, bucket, MASK_PRODUCT, now, args.lookback_hours)
        heights = _list_recent_objects(s3, bucket, HEIGHT_PRODUCT, now, args.lookback_hours)
        pairs = _latest_matching_pairs(
            masks,
            heights,
            args.max_pair_gap_seconds,
            args.frames_per_satellite,
        )
        if not pairs:
            errors.append(f"{satellite}: no aligned full-disk cloud-mask/cloud-height pair found in recent hours.")
            continue

        for frame_index, (mask_object, height_object) in enumerate(pairs):
            try:
                source = build_satellite_field(
                    satellite, bucket, mask_object, height_object,
                    s3, output_dir, args.max_points,
                    frame_index=frame_index,
                    frame_count=len(pairs),
                )
                source["frame_index"] = frame_index
                source["frame_count"] = len(pairs)
                sources.append(source)
                print(
                    f"{satellite} frame {frame_index + 1}/{len(pairs)}: "
                    f"{source['point_count']} cloud points from {source['observed_at_utc']}"
                )
            except Exception as exc:
                errors.append(f"{satellite} {mask_object['key']}: {exc}")

    manifest = {
        "schema": SCHEMA,
        "generated_at_utc": now.isoformat().replace("+00:00", "Z"),
        "refresh_interval_seconds": 600,
        "sequence_interval_seconds": 600,
        "frame_count_per_satellite": args.frames_per_satellite,
        "maximum_expected_age_seconds": 1800,
        "sources": sources,
        "errors": errors,
        "policy": {
            "all_data_is_observed": True,
            "commercial_clearance_default": False,
            "missing_sources_are_not_synthesized": True,
        },
    }
    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    if not sources:
        print("No valid cloud fields were produced; manifest records the source failures.", file=sys.stderr)
        return 2

    print(f"Wrote {manifest_path} ({len(sources)} satellite fields).")
    if errors:
        print("Partial coverage:", "; ".join(errors), file=sys.stderr)
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--output-dir",
        default=str(Path(__file__).resolve().parents[2] / "unreal" / "BridgePointHorizon" / "ExternalAssets" / "BridgePointEarth" / "Clouds"),
    )
    parser.add_argument("--lookback-hours", type=int, default=6)
    parser.add_argument("--max-pair-gap-seconds", type=int, default=600)
    parser.add_argument("--max-points", type=int, default=20000)
    parser.add_argument("--frames-per-satellite", type=int, default=4)
    return parser.parse_args()


if __name__ == "__main__":
    try:
        raise SystemExit(run(parse_args()))
    except Exception as error:
        print(f"NOAA cloud-field ingest failed: {error}", file=sys.stderr)
        raise SystemExit(1)
