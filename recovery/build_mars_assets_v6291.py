#!/usr/bin/env python3
"""Build compact local Mars, Phobos, Deimos, and Gale HiRISE assets.

Inputs are original public-domain NASA/USGS/PDS products. Runtime files are
compressed, versioned BridgePoint payloads; browsers never download source TIFFs.
"""
from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
import re
import struct
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
import rasterio
from rasterio.enums import Resampling
from PIL import Image
from astropy.io import fits

EARTH_RADIUS_KM = 6371.0084
MARS_RADIUS_KM = 3389.5
ASSETS = {
    "mola": "https://asc-mars.s3.us-west-2.amazonaws.com/basemaps/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif",
    "viking": "https://upload.wikimedia.org/wikipedia/commons/1/1f/Mars_Viking_MDIM21_ClrMosaic_1km.jpg",
    "shapes": "https://sbnarchive.psi.edu/pds4/non_mission/ast-sat.thomas.shape-models_V1_0.zip",
    "gale_dtm": "https://hirise.lpl.arizona.edu/PDS/DTM/PSP/ORB_009100_009199/PSP_009149_1750_PSP_009294_1750/DTEEC_009149_1750_009294_1750_U01.IMG",
}
GALE_BOUNDS = {
    "west": 137.35334875,
    "east": 137.46855246,
    "south": -4.9231148946946,
    "north": -4.676204001717,
    "source_pixel_m": 1.0117467945795,
}

def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()

def download(url: str, destination: Path) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.is_file() and destination.stat().st_size > 0:
        return destination
    request = urllib.request.Request(
        url, headers={"User-Agent": "BridgePoint-Planetary-Asset-Builder/1.0"}
    )
    temporary = destination.with_suffix(destination.suffix + ".part")
    with urllib.request.urlopen(request, timeout=180) as response, temporary.open("wb") as output:
        while True:
            block = response.read(1024 * 1024)
            if not block:
                break
            output.write(block)
    temporary.replace(destination)
    if destination.stat().st_size < 1000:
        raise RuntimeError(f"Downloaded source is implausibly small: {url}")
    return destination

def write_height_payload(destination: Path, magic: bytes, values: np.ndarray,
                         bounds: tuple[float, float, float, float] | None = None) -> dict:
    """Write uint16 normalized terrain with an explicit little-endian header."""
    array = np.asarray(values, dtype=np.float32)
    finite = np.isfinite(array)
    if not finite.any():
        raise RuntimeError(f"{destination.name}: no finite elevation values")
    low = float(np.min(array[finite]))
    high = float(np.max(array[finite]))
    if not math.isfinite(low) or not math.isfinite(high) or high <= low:
        raise RuntimeError(f"{destination.name}: invalid elevation range {low}, {high}")
    clipped = np.where(finite, array, low)
    encoded = np.rint(np.clip((clipped - low) / (high - low), 0.0, 1.0) * 65535.0).astype("<u2")
    # DataTexture has flipY=false: first row must be the southern edge.
    encoded = np.ascontiguousarray(np.flipud(encoded))
    height, width = encoded.shape
    if magic == b"BPMH":
        header = struct.pack("<4sIIIIff", magic, 1, width, height, 0, low, high)
    elif magic == b"BPMG":
        if bounds is None:
            raise ValueError("Gale patch requires geographic bounds")
        west, east, south, north = bounds
        header = struct.pack("<4sIIIIffffff", magic, 1, width, height, 0,
                             west, east, south, north, low, high)
    else:
        raise ValueError(f"Unsupported height payload type: {magic!r}")
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(gzip.compress(header + encoded.tobytes(), compresslevel=9, mtime=0))
    return {
        "file": destination.as_posix(),
        "width": int(width), "height": int(height),
        "min_elevation_m": low, "max_elevation_m": high,
        "bytes_gzip": destination.stat().st_size,
        "sha256": sha256(destination),
    }

def build_global_mola(source: Path, destination: Path) -> dict:
    # The source is the native simple-cylindrical 128 px/degree MEGDR at
    # 463.0836 m/px. A compact global 8192x4096 working grid keeps the
    # planetary shader texture practical; close-range geometry is supplied by
    # the local 1.01 m/px HiRISE terrain patch below.
    with rasterio.open(source) as dataset:
        if dataset.count < 1 or dataset.width < 10000 or dataset.height < 5000:
            raise RuntimeError("Unexpected MOLA MEGDR raster dimensions")
        raw = dataset.read(
            1, out_shape=(4096, 8192), resampling=Resampling.average
        ).astype(np.float32)
        scale = float(dataset.scales[0] if dataset.scales else 1.0)
        offset = float(dataset.offsets[0] if dataset.offsets else 0.0)
        raw = raw * scale + offset
        nodata = dataset.nodata
        if nodata is not None:
            raw[np.isclose(raw, nodata)] = np.nan
        valid = np.isfinite(raw)
        if valid.mean() < 0.98:
            raise RuntimeError("MOLA working grid contains unexpected nodata coverage")
        tags = dataset.tags()
        band_tags = dataset.tags(1)
    metadata = write_height_payload(destination, b"BPMH", raw)
    metadata.update({
        "source": ASSETS["mola"],
        "source_product": "NASA MGS MOLA MEGDR global 463m",
        "source_native_pixels_per_degree": 128,
        "source_native_equatorial_pixel_m": 463.0835744,
        "projection": "simple cylindrical, planetocentric, positive-east longitude",
        "processing": "area-average resample to 8192x4096 uint16 elevation texture",
        "source_tags": tags, "source_band_tags": band_tags,
    })
    return metadata

def build_viking_color(source: Path, destination: Path) -> dict:
    with Image.open(source) as image:
        original = image.size
        resized = image.convert("RGB").resize((8192, 4096), Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        resized.save(destination, "WEBP", quality=92, method=6, exact=True)
    return {
        "file": destination.as_posix(), "source": ASSETS["viking"],
        "source_product": "Viking MDIM 2.1 colorized global mosaic, 1 km derived global view",
        "source_dimensions": list(original), "dimensions": [8192, 4096],
        "bytes": destination.stat().st_size, "sha256": sha256(destination),
        "projection": "simple cylindrical global image; longitude seam at the antimeridian",
    }

def load_grid_table(path: Path) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    rows = np.genfromtxt(path, dtype=np.float64, invalid_raise=False)
    rows = rows[np.isfinite(rows).all(axis=1)]
    if rows.ndim != 2 or rows.shape[1] < 3 or len(rows) < 1000:
        raise RuntimeError(f"Unexpected PDS small-body shape table: {path}")
    lat_values = np.unique(rows[:, 0])
    lon_values = np.unique(rows[:, 1])
    grid = np.full((len(lat_values), len(lon_values)), np.nan, dtype=np.float64)
    lat_idx = {value: i for i, value in enumerate(lat_values)}
    lon_idx = {value: i for i, value in enumerate(lon_values)}
    for lat, lon, radius in rows[:, :3]:
        grid[lat_idx[lat], lon_idx[lon]] = radius
    # The PDS products repeat longitude 360 to close the seam. Keep the
    # 0-degree column only and close the mesh explicitly in the triangulation.
    keep = lon_values < 360.0
    lon_values = lon_values[keep]
    grid = grid[:, keep]
    if np.isnan(grid).mean() > 0.01:
        raise RuntimeError(f"{path.name}: missing more than 1% of shape grid")
    return lat_values, lon_values, grid

def build_grid_shape(source: Path, destination: Path, body: str) -> dict:
    root = source / "ast-sat.thomas.shape-models_V1_0" / "data"
    table_name = "m1phobos.tab" if body == "phobos" else "m2deimos.tab"
    lat, lon, radius = load_grid_table(root / table_name)
    lat_r = np.deg2rad(lat)[:, None]
    lon_r = np.deg2rad(lon)[None, :]
    r = radius
    vertices = np.stack((
        r * np.cos(lat_r) * np.cos(lon_r),
        r * np.sin(lat_r) * np.ones_like(lon_r),
        r * np.cos(lat_r) * np.sin(lon_r),
    ), axis=-1).reshape(-1, 3)
    rows, cols = radius.shape
    faces = []
    for row in range(rows - 1):
        for col in range(cols):
            nxt = (col + 1) % cols
            a = row * cols + col
            b = (row + 1) * cols + col
            c = (row + 1) * cols + nxt
            d = row * cols + nxt
            faces.append((a, b, c))
            faces.append((a, c, d))
    faces = np.asarray(faces, dtype=np.int64)
    tri = vertices[faces]
    face_normals = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    area = np.linalg.norm(face_normals, axis=1)
    keep = np.isfinite(area) & (area > 1e-10)
    faces = faces[keep]
    signed_volume = np.einsum(
        "ij,ij->i", vertices[faces[:, 0]],
        np.cross(vertices[faces[:, 1]], vertices[faces[:, 2]])
    ).sum()
    if signed_volume < 0:
        faces = faces[:, [0, 2, 1]]
    tri = vertices[faces]
    face_normals = np.cross(tri[:, 1] - tri[:, 0], tri[:, 2] - tri[:, 0])
    normals = np.zeros_like(vertices)
    np.add.at(normals, faces[:, 0], face_normals)
    np.add.at(normals, faces[:, 1], face_normals)
    np.add.at(normals, faces[:, 2], face_normals)
    normal_lengths = np.linalg.norm(normals, axis=1)
    normals /= np.maximum(1e-12, normal_lengths)[:, None]
    rr = np.linalg.norm(vertices, axis=1).clip(1e-9)
    longitude = np.arctan2(vertices[:, 2], vertices[:, 0])
    latitude = np.arcsin(np.clip(vertices[:, 1] / rr, -1.0, 1.0))
    uv = np.stack((longitude / (2 * math.pi) + 0.5, latitude / math.pi + 0.5), axis=1)
    tri_uv = uv[faces].copy()
    seam = (tri_uv[:, :, 0].max(axis=1) - tri_uv[:, :, 0].min(axis=1)) > 0.5
    if seam.any():
        tri_uv[:, :, 0] = np.where(
            seam[:, None] & (tri_uv[:, :, 0] < 0.5),
            tri_uv[:, :, 0] + 1.0, tri_uv[:, :, 0]
        )
    # The PDS model is in body-centric xyz. Convert to Three.js xzy axes and
    # expand triangles so texture seam wrapping remains unambiguous.
    positions = np.ascontiguousarray((vertices[faces][:, :, [0, 2, 1]] / EARTH_RADIUS_KM).reshape(-1, 3), dtype="<f4")
    triangle_normals = np.ascontiguousarray(normals[faces][:, :, [0, 2, 1]].reshape(-1, 3), dtype="<f4")
    texture_uv = np.ascontiguousarray(tri_uv.reshape(-1, 2), dtype="<f4")
    header = struct.pack("<4sIIII", b"BPSM", 1, len(positions), len(faces), 0)
    payload = header + positions.tobytes() + triangle_normals.tobytes() + texture_uv.tobytes()
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(gzip.compress(payload, compresslevel=9, mtime=0))
    radii = np.linalg.norm(vertices, axis=1)
    return {
        "body": body, "file": destination.as_posix(), "source": table_name,
        "source_bundle": ASSETS["shapes"], "grid_rows": int(rows), "grid_columns": int(cols),
        "render_vertices": int(len(positions)), "triangles": int(len(faces)),
        "radius_range_km": [float(radii.min()), float(radii.max())],
        "bytes_gzip": destination.stat().st_size, "sha256": sha256(destination),
        "header": "BPSM v1; expanded float32 xyz in Earth-radius units, normals xyz, UV",
    }

def build_small_body_texture(source: Path, destination: Path, body: str) -> dict:
    root = source / "ast-sat.thomas.shape-models_V1_0" / "data"
    fits_name = "m1phobosm.fit" if body == "phobos" else "m2deimosm.fit"
    with fits.open(root / fits_name, memmap=False) as hdus:
        data = np.asarray(hdus[0].data, dtype=np.float32)
        if data.ndim > 2:
            data = data.squeeze()
    finite = np.isfinite(data)
    if finite.mean() < 0.9:
        raise RuntimeError(f"{body}: PDS FITS mosaic has excessive invalid coverage")
    low, high = np.percentile(data[finite], [1, 99])
    normalized = np.clip((data - low) / max(1e-6, high - low), 0, 1)
    # Small-body Viking mosaics are monochrome; warm the gray reflectance
    # gently without inventing unobserved surface markings.
    gray = np.rint(normalized * 255).astype(np.uint8)
    rgb = np.stack((gray, np.clip(gray.astype(np.int16) * 0.94, 0, 255).astype(np.uint8),
                    np.clip(gray.astype(np.int16) * 0.88, 0, 255).astype(np.uint8)), axis=-1)
    image = Image.fromarray(rgb, mode="RGB")
    image = image.resize((1024, 512), Image.Resampling.LANCZOS)
    destination.parent.mkdir(parents=True, exist_ok=True)
    image.save(destination, "WEBP", quality=91, method=6)
    return {
        "body": body, "file": destination.as_posix(), "source": fits_name,
        "source_bundle": ASSETS["shapes"], "dimensions": [1024, 512],
        "bytes": destination.stat().st_size, "sha256": sha256(destination),
    }

def build_gale_hirise(source: Path, destination: Path) -> dict:
    # The DTM is a PDS3 attached-label IMG: 32-bit PC_REAL elevations in meters.
    with rasterio.open(source) as dataset:
        if dataset.count != 1 or dataset.width < 6000 or dataset.height < 12000:
            raise RuntimeError("Unexpected HiRISE Gale DTM dimensions")
        values = dataset.read(
            1, out_shape=(4096, 2048), resampling=Resampling.average
        ).astype(np.float32)
        nodata = dataset.nodata
    if nodata is not None:
        values[np.isclose(values, nodata)] = np.nan
    values[(values < -10000.0) | (values > 30000.0)] = np.nan
    valid = np.isfinite(values)
    if valid.mean() < 0.90:
        raise RuntimeError("HiRISE Gale DTM has excessive invalid pixels after resampling")
    bounds = (
        GALE_BOUNDS["west"], GALE_BOUNDS["east"],
        GALE_BOUNDS["south"], GALE_BOUNDS["north"]
    )
    metadata = write_height_payload(destination, b"BPMG", values, bounds)
    metadata.update({
        "source": ASSETS["gale_dtm"],
        "source_product": "MRO HiRISE DTEEC_009149_1750_009294_1750_U01",
        "location": "Gale Crater inverted riverbed, Mars",
        "center_latitude_deg": -4.79, "center_longitude_east_deg": 137.4,
        "native_pixel_scale_m": GALE_BOUNDS["source_pixel_m"],
        "native_dimensions": [6749, 14466],
        "projection": "equirectangular, planetocentric, positive-east",
        "processing": "area-average resampled high-resolution local elevation patch",
    })
    return metadata

def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-root", type=Path, default=Path("/tmp/bridgepoint-mars-source"))
    parser.add_argument("--output-root", type=Path, default=Path("site/assets/mars/v1"))
    args = parser.parse_args()
    source = args.source_root
    out = args.output_root
    source.mkdir(parents=True, exist_ok=True)
    out.mkdir(parents=True, exist_ok=True)
    mola = download(ASSETS["mola"], source / "Mars_MGS_MOLA_DEM_mosaic_global_463m.tif")
    viking = download(ASSETS["viking"], source / "Mars_Viking_MDIM21_ClrMosaic_1km.jpg")
    shapes_zip = download(ASSETS["shapes"], source / "thomas-small-body-shapes.zip")
    shapes_root = source / "shape-models"
    if not (shapes_root / "ast-sat.thomas.shape-models_V1_0" / "data" / "m1phobos.tab").exists():
        with zipfile.ZipFile(shapes_zip) as archive:
            archive.extractall(shapes_root)
    gale = download(ASSETS["gale_dtm"], source / "DTEEC_009149_1750_009294_1750_U01.IMG")

    global_dem = build_global_mola(mola, out / "height" / "mola-global-bpmh.bin.gz")
    color = build_viking_color(viking, out / "textures" / "mars-viking-mdim-global.webp")
    bodies = {}
    for body in ("phobos", "deimos"):
        bodies[body] = {
            "mesh": build_grid_shape(shapes_root, out / "meshes" / f"{body}-thomas-grid-v1.bin.gz", body),
            "texture": build_small_body_texture(shapes_root, out / "textures" / f"{body}-thomas-viking-mosaic.webp", body),
        }
    gale_patch = build_gale_hirise(gale, out / "height" / "gale-hirise-dtm-bpmg.bin.gz")
    manifest = {
        "version": 6291,
        "build": "v6291-mars-orbit-geometry",
        "body": "Mars",
        "mars_mean_radius_km": MARS_RADIUS_KM,
        "mars_equatorial_radius_km": 3396.19,
        "mars_polar_radius_km": 3376.2,
        "global_height": global_dem,
        "global_color": color,
        "moons": bodies,
        "localized_terrain": {"gale": gale_patch},
        "orbital_parameters": {
            "source": "Published Mars-system mean orbital elements; Mars-centered two-body Keplerian propagation",
            "central_body": "Mars 499",
            "phobos": {"semimajor_axis_km": 9376.0, "eccentricity": 0.0151, "inclination_deg": 1.075, "period_hours": 7.653},
            "deimos": {"semimajor_axis_km": 23463.2, "eccentricity": 0.0002, "inclination_deg": 1.793, "period_hours": 30.312},
        },
        "sources": {
            "mola": ASSETS["mola"],
            "viking_mdim": ASSETS["viking"],
            "pds_small_body_shape_models": ASSETS["shapes"],
            "hirise_gale_dtm": ASSETS["gale_dtm"],
        },
        "built_utc": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }
    (out / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    total = sum(path.stat().st_size for path in out.rglob("*") if path.is_file())
    print(json.dumps({
        "MARS_ASSETS_PASS": True,
        "output": str(out),
        "total_bytes": total,
        "files": {p.relative_to(out).as_posix(): p.stat().st_size for p in out.rglob("*") if p.is_file()},
        "manifest": manifest,
    }, indent=2))

if __name__ == "__main__":
    main()
