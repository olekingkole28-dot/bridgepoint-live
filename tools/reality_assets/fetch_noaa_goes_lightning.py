#!/usr/bin/env python3
"""Fetch public NOAA GOES GLM-L2-LCFA lightning flashes into a compact local field."""

from __future__ import annotations
import argparse, datetime as dt, json, math, re, sys
from pathlib import Path
from typing import Any

PRODUCT = "GLM-L2-LCFA"
SCHEMA = "bridgepoint-earth-lightning-flashes-v1"
SATELLITES = {"GOES19": "noaa-goes19", "GOES18": "noaa-goes18"}
SCAN_RE = re.compile(r"_s(?P<stamp>\d{13,14})_")

def parse_scan_start_utc(key: str) -> dt.datetime | None:
    m = SCAN_RE.search(key)
    if not m:
        return None
    try:
        return dt.datetime.strptime(m.group("stamp")[:13], "%Y%j%H%M%S").replace(tzinfo=dt.timezone.utc)
    except ValueError:
        return None

def _as_utc_iso(value: Any) -> str:
    if hasattr(value, "to_pydatetime"):
        value = value.to_pydatetime()
    if isinstance(value, dt.datetime):
        value = value.replace(tzinfo=dt.timezone.utc) if value.tzinfo is None else value.astimezone(dt.timezone.utc)
        return value.isoformat().replace("+00:00", "Z")
    if hasattr(value, "strftime"):
        return value.strftime("%Y-%m-%dT%H:%M:%SZ")
    raise ValueError(f"Unsupported CF datetime type: {type(value).__name__}")

def decode_cf_times(netCDF4: Any, variable: Any) -> list[str]:
    import numpy as np

    units = str(getattr(variable, "units", "")).strip()
    calendar = str(getattr(variable, "calendar", "standard"))
    if " since " not in units:
        raise RuntimeError(f"Lightning time variable is not CF-relative time: {units!r}")

    raw = np.ma.asarray(variable[:])
    values = np.asarray(np.ma.filled(raw, np.nan), dtype=np.float64)
    masked = np.ma.getmaskarray(raw)
    result = [""] * len(values)
    valid_indices = np.where((~masked) & np.isfinite(values))[0]
    if valid_indices.size == 0:
        return result

    decoded = netCDF4.num2date(
        values[valid_indices],
        units=units,
        calendar=calendar,
        only_use_cftime_datetimes=False,
        only_use_python_datetimes=True,
    )
    for index, date_value in zip(valid_indices, decoded):
        try:
            result[int(index)] = _as_utc_iso(date_value)
        except (TypeError, ValueError, OverflowError):
            result[int(index)] = ""
    return result

def validate_flash(lat: float, lon: float, energy: float, area: float, quality: int) -> bool:
    if not all(math.isfinite(float(v)) for v in (lat, lon, energy, area)):
        return False
    return (
        -90.0 <= lat <= 90.0 and -180.0 <= lon <= 180.0 and
        0.0 <= energy <= 1.0e12 and 0.0 <= area <= 1.0e12 and
        int(quality) == 0
    )

def list_recent_files(s3: Any, bucket: str, now: dt.datetime, lookback_hours: int) -> list[dict]:
    files = []
    for offset in range(max(1, lookback_hours)):
        hour = now - dt.timedelta(hours=offset)
        prefix = f"{PRODUCT}/{hour.year:04d}/{hour.timetuple().tm_yday:03d}/{hour.hour:02d}/"
        for page in s3.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=prefix):
            for item in page.get("Contents", []):
                key = item["Key"]
                scan = parse_scan_start_utc(key) if key.endswith(".nc") else None
                if scan:
                    files.append({
                        "key": key,
                        "scan_time": scan,
                        "size": int(item.get("Size", 0)),
                        "etag": str(item.get("ETag", "")).strip('"'),
                    })
    files.sort(key=lambda x: x["scan_time"], reverse=True)
    return files

def cache_is_current(destination: Path, expected_size: int, expected_etag: str) -> bool:
    marker = destination.with_name(destination.name + ".etag")
    if expected_size <= 0 or not expected_etag or not destination.is_file() or not marker.is_file():
        return False
    try:
        return destination.stat().st_size == expected_size and marker.read_text(encoding="utf-8").strip() == expected_etag
    except OSError:
        return False

def download_if_changed(s3: Any, bucket: str, item: dict, destination: Path) -> bool:
    destination.parent.mkdir(parents=True, exist_ok=True)
    expected_size = int(item.get("size", 0))
    expected_etag = str(item.get("etag", ""))
    if cache_is_current(destination, expected_size, expected_etag):
        return False
    s3.download_file(bucket, item["key"], str(destination))
    if expected_etag:
        destination.with_name(destination.name + ".etag").write_text(expected_etag, encoding="utf-8")
    return True

def read_flash_file(path: Path, max_flashes: int) -> tuple[list[dict], dict]:
    try:
        import netCDF4
        import numpy as np
    except ImportError as exc:
        raise RuntimeError("Install Scripts/requirements_noaa_lightning.txt.") from exc

    result = []
    with netCDF4.Dataset(path, "r") as ds:
        names = (
            "flash_lat", "flash_lon", "flash_time_offset_of_first_event",
            "flash_time_offset_of_last_event", "flash_energy", "flash_area",
            "flash_quality_flag"
        )
        missing = [name for name in names if name not in ds.variables]
        if missing:
            raise RuntimeError("Missing GLM variables: " + ", ".join(missing))
        first_times = decode_cf_times(netCDF4, ds.variables["flash_time_offset_of_first_event"])
        last_times = decode_cf_times(netCDF4, ds.variables["flash_time_offset_of_last_event"])

        def values(name: str, fill: float):
            return np.ma.filled(ds.variables[name][:], fill).tolist()

        lats = values("flash_lat", float("nan"))
        lons = values("flash_lon", float("nan"))
        energies = values("flash_energy", float("nan"))
        areas = values("flash_area", float("nan"))
        flags = values("flash_quality_flag", 255)
        ids = values("flash_id", -1) if "flash_id" in ds.variables else list(range(len(lats)))
        if len({len(first_times), len(last_times), len(lats), len(lons), len(energies), len(areas), len(flags), len(ids)}) != 1:
            raise RuntimeError("GLM flash variables have inconsistent row counts.")

        for i in range(len(first_times)):
            if not first_times[i] or not last_times[i]:
                continue
            try:
                lat, lon = float(lats[i]), float(lons[i])
                energy, area, quality = float(energies[i]), float(areas[i]), int(flags[i])
            except (TypeError, ValueError, OverflowError):
                continue
            if not validate_flash(lat, lon, energy, area, quality):
                continue
            result.append({
                "flash_id": int(ids[i]),
                "lat": round(lat, 6),
                "lon": round(lon, 6),
                "first_event_utc": first_times[i],
                "last_event_utc": last_times[i],
                "energy_j": round(energy, 6),
                "area_m2": round(area, 3),
                "quality_flag": quality,
                "detection_kind": "GLM_optical_flash",
            })
            if len(result) >= max_flashes:
                break

        metadata = {
            "product_start_utc": str(getattr(ds, "time_coverage_start", "")),
            "product_end_utc": str(getattr(ds, "time_coverage_end", "")),
            "flash_rows_in_file": len(first_times),
            "quality_screened_flash_count": len(result),
            "flash_energy_units": str(getattr(ds.variables["flash_energy"], "units", "J")),
            "flash_area_units": str(getattr(ds.variables["flash_area"], "units", "m2")),
            "quality_flag_meanings": str(getattr(ds.variables["flash_quality_flag"], "flag_meanings", "")),
        }
    return result, metadata

def run(args: argparse.Namespace) -> int:
    try:
        import boto3
        from botocore import UNSIGNED
        from botocore.config import Config
    except ImportError as exc:
        raise RuntimeError("Install Scripts/requirements_noaa_lightning.txt.") from exc

    now = dt.datetime.now(dt.timezone.utc)
    s3 = boto3.client("s3", region_name="us-east-1", config=Config(signature_version=UNSIGNED))
    root = Path(args.output_dir).resolve()
    root.mkdir(parents=True, exist_ok=True)
    manifest_sources, errors = [], []

    for satellite, bucket in SATELLITES.items():
        selected = list_recent_files(s3, bucket, now, args.lookback_hours)[:max(1, args.max_files_per_satellite)]
        if not selected:
            errors.append(f"{satellite}: no recent GLM LCFA files found.")
            continue

        sat_dir = root / satellite
        download_dir = sat_dir / "downloads"
        flashes, product_files = [], []
        for item in selected:
            filename = Path(item["key"]).name
            local = download_dir / filename
            local.parent.mkdir(parents=True, exist_ok=True)
            try:
                download_if_changed(s3, bucket, item, local)
                remaining = max(1, args.max_flashes_per_satellite - len(flashes))
                points, metadata = read_flash_file(local, remaining)
                for point in points:
                    point["source_file"] = filename
                flashes.extend(points)
                product_files.append({
                    "key": item["key"],
                    "scan_start_utc": item["scan_time"].isoformat().replace("+00:00", "Z"),
                    "metadata": metadata,
                })
            except Exception as exc:
                errors.append(f"{satellite} {item['key']}: {exc}")
            if len(flashes) >= args.max_flashes_per_satellite:
                break

        if not flashes:
            errors.append(f"{satellite}: no quality-valid flashes in recent files.")
            continue

        flashes.sort(key=lambda item: item["first_event_utc"])
        output = sat_dir / f"lightning-flashes-{satellite}.json"
        output.parent.mkdir(parents=True, exist_ok=True)
        payload = {
            "schema": SCHEMA,
            "source": {
                "source_id": f"noaa-{satellite.lower()}-glm-l2-lcfa",
                "source_name": "NOAA/NESDIS GOES Geostationary Lightning Mapper Level 2 LCFA",
                "source_version": PRODUCT,
                "satellite": satellite,
                "evidence_kind": "Observed",
                "license_id": "NOAA_PUBLIC_DATA_SOURCE_REVIEW_REQUIRED",
                "attribution": "NOAA/NESDIS GOES-R Series Geostationary Lightning Mapper",
                "commercially_cleared": False,
                "spatial_resolution_m": "approximately 8 km at nadir, degrading toward field-of-view edge",
                "detection_type": "optical_lightning_flashes",
                "ground_strike_location_guaranteed": False,
                "cloud_to_ground_vs_intracloud_classification": "not_provided_by_this_product",
            },
            "sequence": {
                "generated_at_utc": now.isoformat().replace("+00:00", "Z"),
                "file_count": len(product_files),
                "earliest_flash_utc": flashes[0]["first_event_utc"],
                "latest_flash_utc": flashes[-1]["first_event_utc"],
                "product_files": product_files,
            },
            "point_count": len(flashes),
            "flashes": flashes,
        }
        output.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
        manifest_sources.append({
            "satellite": satellite,
            "file": str(output.relative_to(root)).replace("\\", "/"),
            "point_count": len(flashes),
            "file_count": len(product_files),
            "earliest_flash_utc": flashes[0]["first_event_utc"],
            "latest_flash_utc": flashes[-1]["first_event_utc"],
            "evidence_kind": "Observed",
            "commercially_cleared": False,
        })
        print(f"{satellite}: {len(flashes)} quality-valid flashes across {len(product_files)} files.")

    manifest = {
        "schema": SCHEMA,
        "generated_at_utc": now.isoformat().replace("+00:00", "Z"),
        "refresh_interval_seconds": 20,
        "maximum_expected_age_seconds": 120,
        "sources": manifest_sources,
        "errors": errors,
        "policy": {
            "all_detections_are_observed": True,
            "commercial_clearance_default": False,
            "no_cloud_to_ground_claim": True,
            "missing_sources_are_not_synthesized": True,
        },
    }
    (root / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    if not manifest_sources:
        print("No valid GLM lightning feed was produced.", file=sys.stderr)
        return 2
    print(f"Wrote lightning manifest under {root}.")
    return 0

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default=str(
        Path(__file__).resolve().parents[2] / "unreal" / "BridgePointHorizon" /
        "ExternalAssets" / "BridgePointEarth" / "Lightning"
    ))
    parser.add_argument("--lookback-hours", type=int, default=1)
    parser.add_argument("--max-files-per-satellite", type=int, default=18)
    parser.add_argument("--max-flashes-per-satellite", type=int, default=30000)
    return parser.parse_args()

if __name__ == "__main__":
    try:
        raise SystemExit(run(parse_args()))
    except Exception as error:
        print(f"NOAA lightning ingest failed: {error}", file=sys.stderr)
        raise SystemExit(1)
