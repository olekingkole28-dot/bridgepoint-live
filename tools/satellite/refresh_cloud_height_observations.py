#!/usr/bin/env python3
"""Build a small, provenance-preserving cloud-height sample feed for BridgePoint.

The site consumes compact samples from this generated JSON. This job deliberately
uses official numeric fields (never RGB-to-height guesses) and retains provenance,
timestamps, and source status so the renderer can fall back to modelled geometry
where measurements are unavailable.
"""
from __future__ import annotations

import argparse
import datetime as dt
import html.parser
import json
import math
import os
import re
import tempfile
import time
import urllib.parse
import xml.etree.ElementTree as ET
from pathlib import Path
from typing import Any

import numpy as np
import requests

USER_AGENT = "BridgePoint-CloudHeightFeed/1.0 (+https://github.com/olekingkole28-dot/bridgepoint-live)"
TIMEOUT = (8, 20)
MAX_NETCDF_BYTES = 120 * 1024 * 1024
MAX_SAMPLES_PER_SOURCE = 65000
MAX_NOAA_SAMPLES = 24000
MAX_NOAA_MASK_SAMPLES = 65000
NOAA_BUCKETS = (("19", "NOAA GOES-19 ABI-L2-ACHAF Cloud Top Height"), ("18", "NOAA GOES-18 ABI-L2-ACHAF Cloud Top Height"))
SATCORPS_CANDIDATES = (
    ("NASA SatCORPS GCC Global V2", "https://satcorps.larc.nasa.gov/prod/GCC-GEO-LEO/visst-pixel-gif-v2/"),
    ("NASA SatCORPS GCC GEO-LEO V1B", "https://satcorps.larc.nasa.gov/prod/GCC-GEO-LEO/kdt/visst-pixel-netcdf/"),
    ("NASA SatCORPS legacy GEO-LEO", "https://cloudsgate2.larc.nasa.gov/prod/GCC-GEO-LEO/kdt/visst-pixel-netcdf/"),
)
NETCDF_SUFFIXES = (".nc", ".nc4", ".cdf", ".netcdf")


def utc_now() -> dt.datetime:
    return dt.datetime.now(dt.timezone.utc)


def safe_float(value: Any) -> float:
    try:
        out = float(value)
        return out if math.isfinite(out) else math.nan
    except (TypeError, ValueError, OverflowError):
        return math.nan


def normalized_name(value: str) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value).lower())


def find_variable(ds: xr.Dataset, candidates: tuple[str, ...]) -> str | None:
    by_normalized = {normalized_name(name): name for name in ds.variables}
    for candidate in candidates:
        found = by_normalized.get(normalized_name(candidate))
        if found is not None:
            return found
    return None


def reduce_to_2d(values: Any) -> np.ndarray:
    array = np.asarray(values)
    array = np.squeeze(array)
    if array.ndim == 0:
        return np.asarray(array, dtype=np.float64).reshape(1, 1)
    while array.ndim > 2:
        array = array[0]
    if array.ndim == 1:
        array = array.reshape(1, -1)
    if array.ndim != 2:
        raise ValueError(f"Expected a 2D cloud-height grid, received shape {array.shape}")
    return np.asarray(array, dtype=np.float64)


def meters(values: np.ndarray, units: str, default_unit: str) -> np.ndarray:
    unit = (units or default_unit).strip().lower().replace(" ", "")
    if unit in {"km", "kilometer", "kilometers", "kilometre", "kilometres"} or "km" in unit:
        return np.asarray(values, dtype=np.float64) * 1000.0
    return np.asarray(values, dtype=np.float64)


def sampling_indices(rows: int, cols: int, max_samples: int = MAX_SAMPLES_PER_SOURCE) -> tuple[np.ndarray, np.ndarray]:
    """Choose a deterministic, spatially balanced sample grid under the feed budget."""
    if rows < 1 or cols < 1:
        return np.array([], dtype=int), np.array([], dtype=int)
    aspect = cols / rows
    target_cols = max(1, min(cols, int(math.sqrt(max_samples * aspect))))
    target_rows = max(1, min(rows, max_samples // target_cols))
    if target_rows * target_cols > max_samples:
        target_rows = max(1, max_samples // target_cols)
    row_idx = np.unique(np.linspace(0, rows - 1, target_rows, dtype=int))
    col_idx = np.unique(np.linspace(0, cols - 1, target_cols, dtype=int))
    return row_idx, col_idx


def compact_grid_samples(
    lat_grid: np.ndarray,
    lon_grid: np.ndarray,
    top_m: np.ndarray,
    base_m: np.ndarray | None,
    quality: np.ndarray | None,
    source_index: int,
    max_samples: int = MAX_SAMPLES_PER_SOURCE,
) -> list[list[Any]]:
    """Return rows [longitude, latitude, top_m, base_m|null, sourceIndex]."""
    top = reduce_to_2d(top_m)
    if lat_grid.ndim == 1 and lon_grid.ndim == 1:
        if lat_grid.size == top.shape[0] and lon_grid.size == top.shape[1]:
            lat_grid, lon_grid = np.meshgrid(lat_grid, lon_grid, indexing="ij")
        elif lon_grid.size == top.shape[0] and lat_grid.size == top.shape[1]:
            lat_grid, lon_grid = np.meshgrid(lat_grid, lon_grid, indexing="ij")
            lat_grid, lon_grid = lat_grid.T, lon_grid.T
        else:
            raise ValueError(f"Lat/lon axes do not match height grid {top.shape}")
    lat = np.asarray(lat_grid, dtype=np.float64)
    lon = np.asarray(lon_grid, dtype=np.float64)
    if lat.shape != top.shape or lon.shape != top.shape:
        raise ValueError(f"Lat/lon grids {lat.shape}/{lon.shape} do not match heights {top.shape}")

    base = None if base_m is None else reduce_to_2d(base_m)
    if base is not None and base.shape != top.shape:
        base = None
    qual = None if quality is None else np.asarray(np.squeeze(quality))
    if qual is not None:
        while qual.ndim > 2:
            qual = qual[0]
        if qual.shape != top.shape:
            qual = None

    row_idx, col_idx = sampling_indices(*top.shape, max_samples=max_samples)
    top_s = top[np.ix_(row_idx, col_idx)]
    lat_s = lat[np.ix_(row_idx, col_idx)]
    lon_s = lon[np.ix_(row_idx, col_idx)]
    base_s = None if base is None else base[np.ix_(row_idx, col_idx)]
    qual_s = None if qual is None else qual[np.ix_(row_idx, col_idx)]

    output: list[list[Any]] = []
    for r in range(top_s.shape[0]):
        for c in range(top_s.shape[1]):
            top_value = safe_float(top_s[r, c])
            lat_value = safe_float(lat_s[r, c])
            lon_value = safe_float(lon_s[r, c])
            if not (200.0 <= top_value <= 23000.0 and -85.0 <= lat_value <= 85.0 and -180.0 <= lon_value <= 180.0):
                continue
            if qual_s is not None:
                q = safe_float(qual_s[r, c])
                # GOES DQF 0 is good and 1 is conditionally usable; exclude other codes.
                if not math.isfinite(q) or q < 0 or q > 1:
                    continue
            base_value: float | None = None
            if base_s is not None:
                candidate = safe_float(base_s[r, c])
                if 0.0 <= candidate < top_value - 150.0:
                    base_value = round(candidate, 1)
            output.append([round(lon_value, 4), round(lat_value, 4), round(top_value, 1), base_value, source_index])
    return output


def compact_cloud_mask_samples(
    lat_grid: np.ndarray,
    lon_grid: np.ndarray,
    probability: np.ndarray,
    quality: np.ndarray | None,
    source_index: int,
    max_samples: int = MAX_NOAA_MASK_SAMPLES,
) -> list[list[Any]]:
    """Return [longitude, latitude, cloud_probability_0_to_255, sourceIndex].

    Clear pixels are retained as well as cloudy pixels so the renderer can remove
    stale/procedural clouds where the official GOES mask reports clear sky.
    """
    prob = reduce_to_2d(probability)
    lat = np.asarray(lat_grid, dtype=np.float64)
    lon = np.asarray(lon_grid, dtype=np.float64)
    if lat.shape != prob.shape or lon.shape != prob.shape:
        raise ValueError(f"Lat/lon grids {lat.shape}/{lon.shape} do not match cloud mask {prob.shape}")
    qual = None if quality is None else reduce_to_2d(quality)
    if qual is not None and qual.shape != prob.shape:
        qual = None
    row_idx, col_idx = sampling_indices(*prob.shape, max_samples=max_samples)
    p_s = prob[np.ix_(row_idx, col_idx)]
    lat_s = lat[np.ix_(row_idx, col_idx)]
    lon_s = lon[np.ix_(row_idx, col_idx)]
    q_s = None if qual is None else qual[np.ix_(row_idx, col_idx)]
    output: list[list[Any]] = []
    for r in range(p_s.shape[0]):
        for col in range(p_s.shape[1]):
            p = safe_float(p_s[r, col])
            lat_value = safe_float(lat_s[r, col])
            lon_value = safe_float(lon_s[r, col])
            if not (math.isfinite(p) and 0.0 <= p <= 1.0 and -85.0 <= lat_value <= 85.0 and -180.0 <= lon_value <= 180.0):
                continue
            # ECM DQF=0 is good. Reject degraded, bad, and space-view pixels.
            if q_s is not None:
                q = safe_float(q_s[r, col])
                if not math.isfinite(q) or q != 0:
                    continue
            output.append([round(lon_value, 4), round(lat_value, 4), round(p * 255.0), source_index])
    return output


def compact_point_samples(
    latitudes: np.ndarray,
    longitudes: np.ndarray,
    top_heights_m: np.ndarray,
    base_heights_m: np.ndarray | None,
    quality: np.ndarray | None,
    source_index: int,
    max_samples: int = MAX_SAMPLES_PER_SOURCE,
) -> list[list[Any]]:
    """Sample NetCDF products stored as 1D per-pixel geolocated records."""
    lat = np.asarray(latitudes, dtype=np.float64).reshape(-1)
    lon = np.asarray(longitudes, dtype=np.float64).reshape(-1)
    top = np.asarray(top_heights_m, dtype=np.float64).reshape(-1)
    if not (lat.size == lon.size == top.size):
        raise ValueError("Geolocated pixel arrays must have matching latitude/longitude/top lengths")
    base = None if base_heights_m is None else np.asarray(base_heights_m, dtype=np.float64).reshape(-1)
    if base is not None and base.size != top.size:
        base = None
    qual = None if quality is None else np.asarray(quality).reshape(-1)
    if qual is not None and qual.size != top.size:
        qual = None
    count = min(top.size, max_samples)
    if count <= 0:
        return []
    indices = np.unique(np.linspace(0, top.size - 1, count, dtype=int))
    output: list[list[Any]] = []
    for i in indices:
        tv, lav, lov = safe_float(top[i]), safe_float(lat[i]), safe_float(lon[i])
        if not (200.0 <= tv <= 23000.0 and -85.0 <= lav <= 85.0 and -180.0 <= lov <= 180.0):
            continue
        if qual is not None:
            q = safe_float(qual[i])
            if not math.isfinite(q) or q < 0 or q > 1:
                continue
        bv: float | None = None
        if base is not None:
            candidate = safe_float(base[i])
            if 0.0 <= candidate < tv - 150.0:
                bv = round(candidate, 1)
        output.append([round(lov, 4), round(lav, 4), round(tv, 1), bv, source_index])
    return output


class LinkParser(html.parser.HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.hrefs: list[str] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        if tag.lower() == "a":
            href = dict(attrs).get("href")
            if href:
                self.hrefs.append(href)


def goes_start_time(url: str) -> dt.datetime | None:
    """Extract the observation start from NOAA's sYYYYJJJHHMMSSd filename token."""
    match = re.search(r"_s(\d{4})(\d{3})(\d{2})(\d{2})(\d{2})(\d)", urllib.parse.urlparse(url).path)
    if not match:
        return None
    year, day, hour, minute, second, tenth = map(int, match.groups())
    try:
        return dt.datetime(year, 1, 1, tzinfo=dt.timezone.utc) + dt.timedelta(
            days=day - 1, hours=hour, minutes=minute, seconds=second, microseconds=tenth * 100000
        )
    except ValueError:
        return None


def is_netcdf_url(url: str) -> bool:
    return urllib.parse.urlparse(url).path.lower().endswith(NETCDF_SUFFIXES)


def satcorps_find_files(session: requests.Session, start_url: str, budget: int = 8) -> list[str]:
    """Walk a small number of recent directory listings; never crawl the whole archive."""
    root_path = urllib.parse.urlparse(start_url).path
    queue: list[tuple[str, int]] = [(start_url, 0)]
    visited: set[str] = set()
    files: list[str] = []
    requests_used = 0

    while queue and requests_used < budget and len(files) < 50:
        current, depth = queue.pop(0)
        current = current.split("#", 1)[0]
        if current in visited:
            continue
        visited.add(current)
        requests_used += 1
        try:
            response = session.get(current, timeout=(4, 10), allow_redirects=True)
            response.raise_for_status()
        except requests.RequestException:
            continue
        final_url = response.url
        if is_netcdf_url(final_url):
            files.append(final_url)
            continue
        if len(response.content) > 5_000_000:
            continue
        parser = LinkParser()
        try:
            parser.feed(response.text)
        except Exception:
            continue
        links: list[str] = []
        for href in parser.hrefs:
            if href.startswith(("#", "?", "mailto:", "javascript:")) or href in {"../", "./"}:
                continue
            target = urllib.parse.urljoin(final_url, href)
            parsed = urllib.parse.urlparse(target)
            if parsed.scheme != "https" or parsed.netloc not in {"satcorps.larc.nasa.gov", "cloudsgate2.larc.nasa.gov"}:
                continue
            if is_netcdf_url(target):
                files.append(target)
            elif depth < 3 and parsed.path.startswith(root_path) and (parsed.path.endswith("/") or not parsed.path):
                if target.rstrip("/") != final_url.rstrip("/"):
                    links.append(target)
        # Date/hour directory names are generally sortable in reverse lexical order.
        for target in sorted(set(links), reverse=True)[:5]:
            queue.append((target, depth + 1))
    return sorted(set(files), reverse=True)[:50]


def download_netcdf(session: requests.Session, url: str, target: Path) -> bool:
    try:
        with session.get(url, timeout=(15, 60), stream=True) as response:
            response.raise_for_status()
            content_length = int(response.headers.get("Content-Length", "0") or "0")
            if content_length and content_length > MAX_NETCDF_BYTES:
                raise ValueError(f"Refusing oversized SatCORPS file ({content_length} bytes)")
            total = 0
            with target.open("wb") as out:
                for chunk in response.iter_content(1024 * 1024):
                    if not chunk:
                        continue
                    total += len(chunk)
                    if total > MAX_NETCDF_BYTES:
                        raise ValueError("SatCORPS NetCDF exceeds the configured download limit")
                    out.write(chunk)
        return target.stat().st_size > 1024
    except Exception as exc:
        print(f"SATCORPS_DOWNLOAD_FAILED {url}: {exc}")
        try:
            target.unlink()
        except FileNotFoundError:
            pass
        return False


def extract_satcorps(path: Path, source_index: int) -> tuple[list[list[Any]], dict[str, Any]]:
    # Heavy NetCDF dependency is loaded only when a file is actually retrieved.
    import xarray as xr

    with xr.open_dataset(path, decode_cf=True, mask_and_scale=True) as original:
        ds = original
        top_name = find_variable(ds, ("cloud_top_height", "Cloud_Top_Height", "cloud_top_height_km"))
        base_name = find_variable(ds, ("cloud_bottom_height", "Cloud_Bottom_Height", "cloud_bottom_height_km"))
        lat_name = find_variable(ds, ("lat", "latitude"))
        lon_name = find_variable(ds, ("lon", "longitude"))
        if top_name is None or lat_name is None or lon_name is None:
            raise ValueError(f"SatCORPS file lacks required top/lat/lon variables; found {list(ds.variables)[:50]}")
        top_da = ds[top_name].squeeze(drop=True)
        top_values = np.asarray(top_da.values)
        base_values: np.ndarray | None = None
        if base_name:
            base_da = ds[base_name].squeeze(drop=True)
            base_values = np.asarray(base_da.values)
        lat_da, lon_da = ds[lat_name].squeeze(drop=True), ds[lon_name].squeeze(drop=True)
        lat, lon = np.asarray(lat_da.values), np.asarray(lon_da.values)
        quality_name = find_variable(ds, ("DQF", "quality_flag", "cloud_quality_flag"))
        quality = None if quality_name is None else np.asarray(ds[quality_name].squeeze(drop=True).values)
        top_units = str(top_da.attrs.get("units", "km"))
        if lat.ndim == 1 and lon.ndim == 1 and lat.size == lon.size == top_values.size:
            # Some GCC pixel files store flat geolocated pixels, not a 2D coordinate grid.
            top_flat = meters(top_values.reshape(-1), top_units, "km")
            base_flat = None
            if base_values is not None:
                base_flat = meters(base_values.reshape(-1), str(base_da.attrs.get("units", "km")), "km")
            samples = compact_point_samples(lat, lon, top_flat, base_flat, quality, source_index)
        else:
            top = meters(reduce_to_2d(top_values), top_units, "km")
            base: np.ndarray | None = None
            if base_values is not None:
                base = meters(reduce_to_2d(base_values), str(base_da.attrs.get("units", "km")), "km")
            if lat.ndim == 1 and lon.ndim == 1:
                if lat.size == top.shape[0] and lon.size == top.shape[1]:
                    lat, lon = np.meshgrid(lat, lon, indexing="ij")
                elif lon.size == top.shape[0] and lat.size == top.shape[1]:
                    lat, lon = np.meshgrid(lat, lon, indexing="ij")
                    lat, lon = lat.T, lon.T
            samples = compact_grid_samples(lat, lon, top, base, quality, source_index)
        timestamp = str(ds.attrs.get("time_coverage_end") or ds.attrs.get("date_created") or ds.attrs.get("time_coverage_start") or "")
        if not timestamp:
            timestamp = path.name
        metadata = {"source": "NASA SatCORPS Global Cloud Composite", "variant": "GCC V2", "status": "available",
                    "observed_at": timestamp, "file": path.name, "sample_count": len(samples), "height_reference": "MSL"}
        return samples, metadata


def date_prefixes(now: dt.datetime, product: str = "ABI-L2-ACHAF") -> list[str]:
    values = []
    for day in (now.date(), (now - dt.timedelta(days=1)).date()):
        day_of_year = day.timetuple().tm_yday
        values.append(f"{product}/{day.year}/{day_of_year:03d}/")
    return values


def list_noaa_files(session: requests.Session, satellite: str, now: dt.datetime, product: str = "ABI-L2-ACHAF") -> list[tuple[str, str]]:
    bucket = f"https://noaa-goes{satellite}.s3.amazonaws.com/"
    found: list[tuple[str, str]] = []
    for prefix in date_prefixes(now, product):
        try:
            response = session.get(bucket, params={"list-type": "2", "prefix": prefix, "max-keys": "1000"}, timeout=TIMEOUT)
            response.raise_for_status()
            root = ET.fromstring(response.content)
            for item in root.findall(".//{*}Contents"):
                key = item.findtext("{*}Key") or ""
                modified = item.findtext("{*}LastModified") or ""
                if key.lower().endswith(".nc") and product in key:
                    found.append((urllib.parse.urljoin(bucket, urllib.parse.quote(key, safe="/")), modified))
        except Exception as exc:
            print(f"NOAA_LIST_FAILED GOES-{satellite} {prefix}: {exc}")
    return sorted(set(found), key=lambda x: (x[1], x[0]), reverse=True)


def extract_noaa_cloud_mask(path: Path, source_index: int, metadata: dict[str, Any]) -> tuple[list[list[Any]], dict[str, Any]]:
    """Extract the official GOES Enterprise Clear Sky Mask with geolocated probability.

    CloudMaskProbability/Cloud_Probabilities is preferred; the official 4-level
    ACM classification is a safe fallback when a probability layer is absent.
    """
    import xarray as xr
    from pyproj import CRS, Transformer

    with xr.open_dataset(path, decode_cf=True, mask_and_scale=True) as ds:
        probability_name = find_variable(ds, (
            "CloudProbability", "Cloud_Probabilities", "Cloud_robabilities", "CloudProbabilityPercent",
            "Cloud_Probability", "CloudProbabilities"
        ))
        class_name = find_variable(ds, ("ACM", "CloudMask", "Cloud_Mask", "CloudMaskFourLevel"))
        quality_name = find_variable(ds, ("DQF", "CloudMaskQualFlag", "CloudMaskQualityFlag"))
        x_name, y_name = find_variable(ds, ("x",)), find_variable(ds, ("y",))
        projection_name = find_variable(ds, ("goes_imager_projection",))
        if x_name is None or y_name is None or projection_name is None or (probability_name is None and class_name is None):
            raise ValueError(f"GOES ECM file lacks probability/class/x/y/projection variables: {list(ds.variables)[:45]}")
        source_da = ds[probability_name].squeeze(drop=True) if probability_name else ds[class_name].squeeze(drop=True)
        raw = reduce_to_2d(source_da.values)
        if probability_name:
            finite = raw[np.isfinite(raw)]
            if finite.size and float(np.nanmax(finite)) > 1.5:
                encoded_scale = source_da.encoding.get("scale_factor", source_da.attrs.get("scale_factor"))
                encoded_offset = source_da.encoding.get("add_offset", source_da.attrs.get("add_offset", 0.0))
                if encoded_scale is not None and 0 < float(encoded_scale) <= 0.1:
                    probability = raw * float(encoded_scale) + float(encoded_offset or 0.0)
                elif float(np.nanmax(finite)) <= 100.0:
                    probability = raw / 100.0
                else:
                    raise ValueError("Cloud probability is still encoded but its scale_factor is missing")
            else:
                probability = raw
        else:
            # NOAA's documented ACM levels: clear, probably clear, probably cloudy, cloudy.
            lookup = np.array([0.02, 0.18, 0.82, 0.98], dtype=np.float64)
            classes = np.rint(raw).astype(np.int16, copy=False)
            probability = np.full(raw.shape, np.nan, dtype=np.float64)
            valid = np.isfinite(raw) & (classes >= 0) & (classes <= 3)
            probability[valid] = lookup[classes[valid]]
        probability = np.clip(probability, 0.0, 1.0)
        x = np.asarray(ds[x_name].values, dtype=np.float64).squeeze()
        y = np.asarray(ds[y_name].values, dtype=np.float64).squeeze()
        projection = ds[projection_name].attrs
        perspective_height = float(projection.get("perspective_point_height", 35786023.0))
        lon0 = float(projection.get("longitude_of_projection_origin", -75.2))
        semi_major = float(projection.get("semi_major_axis", 6378137.0))
        semi_minor = float(projection.get("semi_minor_axis", 6356752.31414))
        sweep = str(projection.get("sweep_angle_axis", "x"))
        if str(ds[x_name].attrs.get("units", "rad")).lower() in {"rad", "radian", "radians"}:
            x = x * perspective_height
        if str(ds[y_name].attrs.get("units", "rad")).lower() in {"rad", "radian", "radians"}:
            y = y * perspective_height
        if x.ndim != 1 or y.ndim != 1 or len(y) != probability.shape[0] or len(x) != probability.shape[1]:
            raise ValueError(f"GOES ECM x/y axes do not match mask grid: {probability.shape}, {x.shape}, {y.shape}")
        quality = None
        if quality_name:
            quality = reduce_to_2d(ds[quality_name].values)
            if quality.shape != probability.shape:
                quality = None
        row_idx, col_idx = sampling_indices(*probability.shape, max_samples=MAX_NOAA_MASK_SAMPLES)
        xx, yy = np.meshgrid(x[col_idx], y[row_idx])
        crs = CRS.from_proj4(
            f"+proj=geos +h={perspective_height} +lon_0={lon0} +sweep={sweep} +a={semi_major} +b={semi_minor} +units=m +no_defs"
        )
        transformer = Transformer.from_crs(crs, CRS.from_epsg(4326), always_xy=True)
        lon_grid, lat_grid = transformer.transform(xx, yy)
        sampled_probability = probability[np.ix_(row_idx, col_idx)]
        sampled_quality = None if quality is None else quality[np.ix_(row_idx, col_idx)]
        samples = compact_cloud_mask_samples(
            lat_grid, lon_grid, sampled_probability, sampled_quality, source_index,
            max_samples=MAX_NOAA_MASK_SAMPLES
        )
        info = {
            **metadata, "status": "available", "sample_count": len(samples),
            "probability_variable": probability_name, "class_variable": class_name,
            "quality_variable": quality_name, "height_reference": "not-applicable",
            "resolution_m": 2000, "mask_policy": "NOAA GOES Enterprise Cloud Mask probability; DQF=0 only",
        }
        return samples, info


def extract_noaa(path: Path, source_index: int, metadata: dict[str, Any]) -> tuple[list[list[Any]], dict[str, Any]]:
    # NetCDF and projection libraries are only needed once a usable GOES file exists.
    import xarray as xr
    from pyproj import CRS, Transformer

    with xr.open_dataset(path, decode_cf=True, mask_and_scale=True) as original:
        ds = original
        height_name = find_variable(ds, ("HT", "cloud_top_height"))
        quality_name = find_variable(ds, ("DQF", "quality_flag"))
        x_name, y_name = find_variable(ds, ("x",)), find_variable(ds, ("y",))
        projection_name = find_variable(ds, ("goes_imager_projection",))
        if height_name is None or x_name is None or y_name is None or projection_name is None:
            raise ValueError(f"GOES ACHA file lacks expected HT/x/y/projection variables: {list(ds.variables)[:30]}")
        height_da = ds[height_name].squeeze(drop=True)
        top = meters(reduce_to_2d(height_da.values), str(height_da.attrs.get("units", "m")), "m")
        x = np.asarray(ds[x_name].values, dtype=np.float64).squeeze()
        y = np.asarray(ds[y_name].values, dtype=np.float64).squeeze()
        projection = ds[projection_name].attrs
        perspective_height = float(projection.get("perspective_point_height", 35786023.0))
        lon0 = float(projection.get("longitude_of_projection_origin", -75.2))
        semi_major = float(projection.get("semi_major_axis", 6378137.0))
        semi_minor = float(projection.get("semi_minor_axis", 6356752.31414))
        sweep = str(projection.get("sweep_angle_axis", "x"))
        if str(ds[x_name].attrs.get("units", "rad")).lower() in {"rad", "radian", "radians"}:
            x = x * perspective_height
        if str(ds[y_name].attrs.get("units", "rad")).lower() in {"rad", "radian", "radians"}:
            y = y * perspective_height
        if x.ndim != 1 or y.ndim != 1 or len(y) != top.shape[0] or len(x) != top.shape[1]:
            raise ValueError(f"GOES x/y axes do not match HT grid: {top.shape}, {x.shape}, {y.shape}")
        row_idx, col_idx = sampling_indices(*top.shape, max_samples=MAX_NOAA_SAMPLES)
        xs, ys = x[col_idx], y[row_idx]
        xx, yy = np.meshgrid(xs, ys)
        crs = CRS.from_proj4(f"+proj=geos +h={perspective_height} +lon_0={lon0} +sweep={sweep} +a={semi_major} +b={semi_minor} +units=m +no_defs")
        transformer = Transformer.from_crs(crs, CRS.from_epsg(4326), always_xy=True)
        lon_grid, lat_grid = transformer.transform(xx, yy)
        quality = None
        if quality_name:
            quality = np.asarray(ds[quality_name].squeeze(drop=True).values)
            while quality.ndim > 2:
                quality = quality[0]
            if quality.shape == top.shape:
                quality = quality[np.ix_(row_idx, col_idx)]
            else:
                quality = None
        top_s = top[np.ix_(row_idx, col_idx)]
        output: list[list[Any]] = []
        for r in range(top_s.shape[0]):
            for c in range(top_s.shape[1]):
                top_value = safe_float(top_s[r, c])
                lat_value, lon_value = safe_float(lat_grid[r, c]), safe_float(lon_grid[r, c])
                if not (200.0 <= top_value <= 23000.0 and -85.0 <= lat_value <= 85.0 and -180.0 <= lon_value <= 180.0):
                    continue
                if quality is not None:
                    q = safe_float(quality[r, c])
                    if not math.isfinite(q) or q < 0 or q > 1:
                        continue
                output.append([round(lon_value, 4), round(lat_value, 4), round(top_value, 1), None, source_index])
        info = {**metadata, "status": "available", "sample_count": len(output), "file": path.name, "height_reference": "MSL",
                "units": str(height_da.attrs.get("units", "m")), "dqf_filter": "0=good, 1=conditionally usable"}
        return output, info


def refresh_feed(output_path: Path) -> dict[str, Any]:
    session = requests.Session()
    session.headers.update({"User-Agent": USER_AGENT, "Accept": "text/html,application/xhtml+xml,application/netcdf,application/octet-stream,*/*"})
    samples: list[list[Any]] = []
    sources: list[dict[str, Any]] = []
    cloud_mask_samples: list[list[Any]] = []
    cloud_mask_sources: list[dict[str, Any]] = []
    warnings: list[str] = []
    now = utc_now()

    # NASA global product first, so NOAA-only sources supplement rather than replace global cloud bases/tops.
    nasa_added = False
    nasa_last_endpoint = SATCORPS_CANDIDATES[0][1]
    for label, endpoint in SATCORPS_CANDIDATES:
        nasa_last_endpoint = endpoint
        urls = satcorps_find_files(session, endpoint)
        for url in urls[:1]:
            source_index = len(sources)
            with tempfile.TemporaryDirectory(prefix="bp-satcorps-") as temp_dir:
                file_path = Path(temp_dir) / "latest-satcorps.nc"
                if not download_netcdf(session, url, file_path):
                    continue
                try:
                    extracted, metadata = extract_satcorps(file_path, source_index)
                    if extracted:
                        samples.extend(extracted)
                        sources.append({**metadata, "endpoint": url, "retrieved_at": now.isoformat()})
                        nasa_added = True
                        break
                except Exception as exc:
                    warnings.append(f"NASA SatCORPS candidate rejected: {type(exc).__name__}: {exc}")
        if nasa_added:
            break
    if not nasa_added:
        warnings.append("NASA SatCORPS NetCDF directory did not yield a decodable current file; modelled heights remain the fallback outside valid GOES samples.")
        sources.append({"source": "NASA SatCORPS Global Cloud Composite", "variant": "GCC V2", "status": "unavailable",
                        "endpoint": nasa_last_endpoint, "observed_at": None, "sample_count": 0,
                        "height_reference": "MSL"})

    # Official measured GOES cloud tops fill their geostationary coverage; the base stays estimated where absent.
    for satellite, label in NOAA_BUCKETS:
        candidates = list_noaa_files(session, satellite, now)
        source_index = len(sources)
        picked: tuple[str, str] | None = None
        for url, modified in candidates:
            if not modified:
                picked = (url, modified)
                break
            try:
                age = now - dt.datetime.fromisoformat(modified.replace("Z", "+00:00"))
                if age <= dt.timedelta(hours=3):
                    picked = (url, modified)
                    break
            except ValueError:
                picked = (url, modified)
                break
        if not picked:
            warnings.append(f"{label}: no current full-disk ACHA file found in the public bucket.")
            sources.append({"source": label, "status": "unavailable", "sample_count": 0, "height_reference": "MSL"})
            continue
        url, modified = picked
        with tempfile.TemporaryDirectory(prefix=f"bp-goes{satellite}-") as temp_dir:
            file_path = Path(temp_dir) / f"goes{satellite}-acha.nc"
            observed = goes_start_time(url)
            observed_at = observed.isoformat().replace("+00:00", "Z") if observed else modified
            temp_source = {"source": label, "satellite": f"GOES-{satellite}", "endpoint": url, "observed_at": observed_at, "published_at": modified}
            try:
                response = session.get(url, timeout=(15, 60), stream=True)
                response.raise_for_status()
                size = int(response.headers.get("Content-Length", "0") or "0")
                if size and size > MAX_NETCDF_BYTES:
                    raise ValueError(f"Refusing oversized GOES file ({size} bytes)")
                total = 0
                with file_path.open("wb") as out:
                    for chunk in response.iter_content(1024 * 1024):
                        if not chunk:
                            continue
                        total += len(chunk)
                        if total > MAX_NETCDF_BYTES:
                            raise ValueError("GOES NetCDF exceeds the configured download limit")
                        out.write(chunk)
                extracted, metadata = extract_noaa(file_path, source_index, temp_source)
                if extracted:
                    samples.extend(extracted)
                    sources.append(metadata)
                    # Match the cloud mask to this same GOES full-disk scan, not merely
                    # the latest file from a different ten-minute observation.
                    expected_time = goes_start_time(url)
                    mask_files = list_noaa_files(session, satellite, now, product="ABI-L2-ACMF")
                    matching_mask = None
                    best_delta = float("inf")
                    for candidate_url, candidate_modified in mask_files:
                        candidate_time = goes_start_time(candidate_url)
                        if expected_time and candidate_time:
                            delta = abs((candidate_time - expected_time).total_seconds())
                        else:
                            try:
                                candidate_stamp = dt.datetime.fromisoformat(candidate_modified.replace("Z", "+00:00"))
                                expected_stamp = dt.datetime.fromisoformat(modified.replace("Z", "+00:00"))
                                delta = abs((candidate_stamp - expected_stamp).total_seconds())
                            except (ValueError, AttributeError):
                                continue
                        if delta <= 120 and delta < best_delta:
                            best_delta = delta
                            matching_mask = (candidate_url, candidate_modified, candidate_time)
                    mask_source_index = len(cloud_mask_sources)
                    if matching_mask:
                        mask_url, mask_modified, mask_observed = matching_mask
                        mask_observed_at = mask_observed.isoformat().replace("+00:00", "Z") if mask_observed else mask_modified
                        mask_source = {
                            "source": f"NOAA GOES-{satellite} ABI-L2-ACMF Enterprise Cloud Mask",
                            "product": "ABI-L2-ACMF", "satellite": f"GOES-{satellite}",
                            "endpoint": mask_url, "observed_at": mask_observed_at, "published_at": mask_modified,
                        }
                        with tempfile.TemporaryDirectory(prefix=f"bp-goes{satellite}-mask-") as mask_temp:
                            mask_path = Path(mask_temp) / f"goes{satellite}-acmf.nc"
                            try:
                                mask_response = session.get(mask_url, timeout=(15, 60), stream=True)
                                mask_response.raise_for_status()
                                mask_size = int(mask_response.headers.get("Content-Length", "0") or "0")
                                if mask_size and mask_size > MAX_NETCDF_BYTES:
                                    raise ValueError(f"Refusing oversized GOES mask file ({mask_size} bytes)")
                                total_mask_bytes = 0
                                with mask_path.open("wb") as mask_out:
                                    for mask_chunk in mask_response.iter_content(1024 * 1024):
                                        if not mask_chunk:
                                            continue
                                        total_mask_bytes += len(mask_chunk)
                                        if total_mask_bytes > MAX_NETCDF_BYTES:
                                            raise ValueError("GOES cloud mask NetCDF exceeds the configured download limit")
                                        mask_out.write(mask_chunk)
                                mask_rows, mask_info = extract_noaa_cloud_mask(mask_path, mask_source_index, mask_source)
                                if not mask_rows:
                                    raise ValueError("No quality-valid cloud-mask samples remained")
                                cloud_mask_samples.extend(mask_rows)
                                cloud_mask_sources.append(mask_info)
                            except Exception as mask_exc:
                                warnings.append(f"{mask_source['source']}: {type(mask_exc).__name__}: {mask_exc}")
                                cloud_mask_sources.append({**mask_source, "status": "unavailable", "sample_count": 0})
                    else:
                        warnings.append(f"NOAA GOES-{satellite} ABI-L2-ACMF: no same-scan mask file within 120 seconds of the cloud-height observation.")
                        cloud_mask_sources.append({
                            "source": f"NOAA GOES-{satellite} ABI-L2-ACMF Enterprise Cloud Mask",
                            "product": "ABI-L2-ACMF", "satellite": f"GOES-{satellite}",
                            "status": "unavailable", "sample_count": 0, "height_reference": "not-applicable",
                        })
                else:
                    raise ValueError("No valid cloud-top-height samples remained after quality filtering")
            except Exception as exc:
                warnings.append(f"{label}: {type(exc).__name__}: {exc}")
                sources.append({**temp_source, "status": "unavailable", "sample_count": 0, "height_reference": "MSL"})

    if not samples:
        raise RuntimeError("No measured cloud-height samples were produced by NASA SatCORPS or NOAA GOES; preserving the previous published feed.")
    payload = {
        "schema_version": 1,
        "generated_at": now.isoformat(),
        "refresh_interval_seconds": 600,
        "height_reference": "MSL",
        "source_policy": "Measured numeric cloud-top/base values only; NOAA cloud base is omitted when not supplied. No raster-colour-derived heights.",
        "cloud_mask_policy": "Same-scan NOAA ABI-L2-ACMF probability/classification samples with DQF=0; satellite imagery RGB classification remains fallback outside this GOES coverage.",
        "sample_columns": ["longitude", "latitude", "cloud_top_height_m", "cloud_base_height_m_or_null", "source_index"],
        "sources": sources,
        "samples": samples,
        "sample_count": len(samples),
        "cloud_mask_schema_version": 1,
        "cloud_mask_sources": cloud_mask_sources,
        "cloud_mask_samples": cloud_mask_samples,
        "cloud_mask_sample_count": len(cloud_mask_samples),
        "warnings": warnings,
    }
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as stream:
        json.dump(payload, stream, separators=(",", ":"), allow_nan=False)
    print("CLOUD_HEIGHT_FEED_SUMMARY " + json.dumps({
        "sample_count": len(samples),
        "sources": [{"source": x.get("source"), "status": x.get("status"), "sample_count": x.get("sample_count"), "observed_at": x.get("observed_at")} for x in sources],
        "warnings": warnings[:8],
        "cloud_mask_sample_count": len(cloud_mask_samples),
        "cloud_mask_sources": [{"source": x.get("source"), "status": x.get("status"), "sample_count": x.get("sample_count"), "observed_at": x.get("observed_at")} for x in cloud_mask_sources],
        "output_bytes": output_path.stat().st_size,
    }, separators=(",", ":")))
    return payload


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="cloud-height-observations.json")
    args = parser.parse_args()
    try:
        payload = refresh_feed(Path(args.output))
    except Exception as exc:
        print(f"CLOUD_HEIGHT_FEED_REFRESH_FAILED {type(exc).__name__}: {exc}")
        return 1
    print(f"CLOUD_HEIGHT_FEED_WRITTEN samples={payload['sample_count']} sources={len(payload['sources'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
