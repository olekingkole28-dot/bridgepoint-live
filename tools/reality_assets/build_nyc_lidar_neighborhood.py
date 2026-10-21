#!/usr/bin/env python3
"""Build a georeferenced 3x3 NYC LiDAR + orthophoto neighborhood for BridgePoint.

Downloads only the eight neighboring members from the public NYC OpenData ZIP by byte range.
The center tile already lives at rebuild-v5000/assets/nyc-lidar/manifest.json.
All geometry remains in its own EPSG:2263 tile-local anchor; the browser aligns tile anchors
against the existing center anchor. Roof/ground imagery is nadir orthophoto only. Facade planes
come from measured LiDAR discontinuities and are deliberately not labeled as photo-textured.
"""
from __future__ import annotations
import base64, gzip, hashlib, io, json, math, os, random, struct, sys, time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlencode
import numpy as np
import laspy
from PIL import Image
from pyproj import Transformer
from scipy.ndimage import distance_transform_edt, maximum_filter, minimum_filter, binary_dilation, label

ROOT = Path(__file__).resolve().parents[2]
LIDAR_ROOT = ROOT / "rebuild-v5000" / "assets" / "nyc-lidar"
TILE_ROOT = LIDAR_ROOT / "tiles"
CENTER_MANIFEST_PATH = LIDAR_ROOT / "manifest.json"
INDEX_PATH = LIDAR_ROOT / "tiles-index.json"
ARCHIVE_URL = "https://data.cityofnewyork.us/api/views/7sc8-jtbz/files/dfe8b336-0307-4235-b00e-2742d8ac552a?download=true&filename=TopoBathymetric_Classified_LAZ.zip"
ORTHO_EXPORT_URL = "https://orthos.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer/export"
SOURCE_DATASET_URL = "https://data.cityofnewyork.us/City-Government/Topobathymetric-LiDAR-Data-2017-/7sc8-jtbz"
SOURCE_DOC_URL = "https://github.com/CityOfNewYork/nyc-geo-metadata/blob/main/Metadata/Metadata_TopobathymetricClassifiedPointCloud.md"
ORTHO_SERVICE_URL = "https://orthos.its.ny.gov/arcgis/rest/services/wms/Latest/MapServer"
FT_TO_M = 0.3048006096012192
CELL_M = 2.0
POSITION_SCALE_M = 0.02
TARGET_POINTS = 180000
LOD_COUNTS = [12000, 75000, TARGET_POINTS]
GRID_CHUNK_ROWS = 96
ORTHO_SPAN_X = 1004.557855
ORTHO_SPAN_Y = 1008.443718
SEED_BASE = 7002

# Range and tile metadata are from the official public ZIP central directory/header audit.
# Byte offsets refer to ZIP local-file headers; the LAZ members are ZIP_STORED.
NEIGHBOR_TILES = [
    {"id":"985207","archiveOffset":96011187486,"archiveBytes":77428625,"bounds":[985000.0,207500.0,987499.99,209999.99],"pointCount":16934743},
    {"id":"985210","archiveOffset":96088616182,"archiveBytes":80867927,"bounds":[985000.0,210000.0,987499.99,212500.0],"pointCount":17280784},
    {"id":"985212","archiveOffset":96169484180,"archiveBytes":78268378,"bounds":[985000.0,212500.0,987499.99,214999.99],"pointCount":17348751},
    {"id":"987207","archiveOffset":98146644403,"archiveBytes":91825606,"bounds":[987500.0,207500.0,989999.99,209999.99],"pointCount":18934516},
    {"id":"987212","archiveOffset":98321805827,"archiveBytes":84290408,"bounds":[987500.0,212500.0,989999.99,214999.99],"pointCount":17613220},
    {"id":"990207","archiveOffset":100387448666,"archiveBytes":85920443,"bounds":[990000.0,207500.0,992499.98,210000.0],"pointCount":18457443},
    {"id":"990210","archiveOffset":100473369180,"archiveBytes":98559423,"bounds":[990000.0,210000.0,992499.99,212499.99],"pointCount":20487770},
    {"id":"990212","archiveOffset":100571928674,"archiveBytes":82491439,"bounds":[990000.0,212500.0,992499.99,215000.0],"pointCount":17439585},
]

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for block in iter(lambda: f.read(4 * 1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()

def range_get(start: int, end: int, timeout: int = 240) -> bytes:
    req = Request(ARCHIVE_URL, headers={
        "Range": f"bytes={start}-{end}",
        "User-Agent": "BridgePoint-Intelligence-NYC-LiDAR/7002",
        "Accept-Encoding": "identity",
    })
    with urlopen(req, timeout=timeout) as res:
        status = getattr(res, "status", res.getcode())
        content_range = res.headers.get("Content-Range", "")
        if status != 206 or not content_range.startswith(f"bytes {start}-"):
            raise RuntimeError(f"NYC archive did not honor byte range {start}-{end}: HTTP {status}, Content-Range={content_range!r}")
        data = res.read()
    expected = end - start + 1
    if len(data) != expected:
        raise RuntimeError(f"NYC archive range length mismatch: wanted {expected}, got {len(data)}")
    return data

def fetch_laz(tile: dict, destination: Path) -> None:
    if destination.exists() and destination.stat().st_size == tile["archiveBytes"]:
        print("SOURCE_CACHE_HIT", tile["id"], destination.stat().st_size, flush=True)
        return
    header = range_get(tile["archiveOffset"], tile["archiveOffset"] + 4095, timeout=60)
    if header[:4] != b"PK\x03\x04":
        raise RuntimeError(f"Bad local ZIP header for {tile['id']}: {header[:8].hex()}")
    filename_length, extra_length = struct.unpack_from("<HH", header, 26)
    filename = header[30:30 + filename_length].decode("utf-8", "replace")
    if not filename.endswith(f"/{tile['id']}.laz"):
        raise RuntimeError(f"ZIP member mismatch for {tile['id']}: {filename!r}")
    data_start = tile["archiveOffset"] + 30 + filename_length + extra_length
    destination.parent.mkdir(parents=True, exist_ok=True)
    temp = destination.with_suffix(destination.suffix + ".partial")
    print("SOURCE_RANGE_START", tile["id"], data_start, tile["archiveBytes"], flush=True)
    raw = range_get(data_start, data_start + tile["archiveBytes"] - 1, timeout=240)
    if raw[:4] != b"LASF":
        raise RuntimeError(f"Extracted member is not LAS/LAZ for {tile['id']}: {raw[:8].hex()}")
    temp.write_bytes(raw)
    temp.replace(destination)
    print("SOURCE_RANGE_READY", tile["id"], len(raw), flush=True)

def fetch_orthophoto(tile: dict, anchor_x: float, anchor_y: float, out_jpg: Path):
    to3857 = Transformer.from_crs(2263, 3857, always_xy=True)
    cx, cy = to3857.transform(anchor_x, anchor_y)
    bbox = [cx - ORTHO_SPAN_X / 2, cy - ORTHO_SPAN_Y / 2,
            cx + ORTHO_SPAN_X / 2, cy + ORTHO_SPAN_Y / 2]
    params = {
        "bbox": ",".join(f"{v:.8f}" for v in bbox),
        "bboxSR": "3857", "imageSR": "3857", "size": "4096,4096",
        "format": "jpg", "pixelType": "U8", "transparent": "false", "f": "image"
    }
    url = ORTHO_EXPORT_URL + "?" + urlencode(params)
    last_error = None
    for attempt in range(4):
        try:
            req = Request(url, headers={"User-Agent":"BridgePoint-Intelligence-NYC-LiDAR/7002"})
            with urlopen(req, timeout=120) as res:
                data = res.read()
            im = Image.open(io.BytesIO(data))
            im.verify()
            im = Image.open(io.BytesIO(data)).convert("RGB")
            if im.size != (4096, 4096):
                raise RuntimeError(f"Unexpected orthophoto size for {tile['id']}: {im.size}")
            out_jpg.parent.mkdir(parents=True, exist_ok=True)
            out_jpg.write_bytes(data)
            print("ORTHO_READY", tile["id"], im.size, len(data), json.dumps(bbox), flush=True)
            return bbox
        except Exception as exc:
            last_error = exc
            time.sleep(2 * (attempt + 1))
    raise RuntimeError(f"Orthophoto export failed for {tile['id']}: {last_error}")

def qpos(x_ft, z_ft, y_ft, anchor_x, anchor_y, anchor_z):
    return np.rint(np.column_stack(((x_ft-anchor_x)*FT_TO_M,
                                    (z_ft-anchor_z)*FT_TO_M,
                                    (y_ft-anchor_y)*FT_TO_M)) / POSITION_SCALE_M).clip(-32768,32767).astype("<i2")

def gzip_bytes(raw: bytes) -> bytes:
    return gzip.compress(raw, compresslevel=9, mtime=0)

def write_lod_assets(tile, source, image, image_bbox, anchor, out_dir):
    seed = SEED_BASE + int(tile["id"])
    rng = np.random.default_rng(seed)
    candidates = []
    scanned = 0
    probability = min(0.08, (TARGET_POINTS * 2.0) / float(tile["pointCount"]))
    with laspy.open(str(source), laz_backend=laspy.LazBackend.Lazrs) as reader:
        total = int(reader.header.point_count)
        if total != int(tile["pointCount"]):
            raise RuntimeError(f"Point count mismatch for {tile['id']}: {total} vs {tile['pointCount']}")
        for chunk_index, pts in enumerate(reader.chunk_iterator(250000), 1):
            n = len(pts)
            x = np.asarray(pts.x, dtype=np.float64)
            y = np.asarray(pts.y, dtype=np.float64)
            z = np.asarray(pts.z, dtype=np.float64)
            cls = np.asarray(pts.classification, dtype=np.uint8)
            good = ~np.isin(cls, np.array([7, 18], dtype=np.uint8))
            choose = good & (rng.random(n) < probability)
            if choose.any():
                candidates.append(np.column_stack((x[choose], y[choose], z[choose])).astype(np.float64))
            scanned += n
            if chunk_index % 20 == 0:
                print("LOD_SCAN", tile["id"], scanned, "/", total, flush=True)
    if not candidates:
        raise RuntimeError(f"No valid point candidates for {tile['id']}")
    pts = np.concatenate(candidates, axis=0)
    if len(pts) < TARGET_POINTS:
        raise RuntimeError(f"Not enough sampled returns for {tile['id']}: {len(pts)}")
    pts = pts[rng.choice(len(pts), TARGET_POINTS, replace=False)]
    sx, sy, sz = pts[:, 0], pts[:, 1], pts[:, 2]
    to3857 = Transformer.from_crs(2263, 3857, always_xy=True)
    mx, my = to3857.transform(sx, sy)
    bx0, by0, bx1, by1 = image_bbox
    width, height = image.size
    px = np.floor((mx - bx0) / (bx1 - bx0) * width).astype(np.int64)
    py = np.floor((by1 - my) / (by1 - by0) * height).astype(np.int64)
    inside = (px >= 0) & (px < width) & (py >= 0) & (py < height)
    px = np.clip(px, 0, width - 1)
    py = np.clip(py, 0, height - 1)
    colors = np.asarray(image, dtype=np.uint8)[py, px].copy()
    pos = qpos(sx, sz, sy, anchor["projectedXFeet"], anchor["projectedYFeet"], anchor["verticalOriginFeet"])
    order = rng.permutation(TARGET_POINTS)
    pos, colors = pos[order], colors[order]
    lods = []
    for level, count in enumerate(LOD_COUNTS):
        raw = pos[:count].astype("<i2", copy=False).tobytes() + colors[:count].astype("u1", copy=False).tobytes()
        compressed = gzip_bytes(raw)
        filename = f"nyc-midtown-{tile['id']}-lod{level}.bin.gz"
        (out_dir / filename).write_bytes(compressed)
        lods.append({
            "level": level, "name": ["CITY_TILE","BLOCKS","DETAIL"][level],
            "pointCount": count, "file": filename, "encoding": "gzip(binary)",
            "binaryLayout": "int16le xyz positions quantized at 0.02 metres followed by uint8 RGB from NYS orthophoto",
            "rawBytes": len(raw), "gzipBytes": len(compressed),
            "sha256": hashlib.sha256(compressed).hexdigest(),
            "positionEncoding": "int16le", "positionScaleMeters": POSITION_SCALE_M,
            "colorSource": "NYS Latest Orthoimagery 2022–2025 natural-color orthophoto",
            "colorizedFromActualImagery": True
        })
    return lods

def build_surface_and_walls(tile, source, image_bbox, anchor, out_dir, image_path):
    xmin, ymin, xmax, ymax = tile["bounds"]
    cell_ft = CELL_M / FT_TO_M
    nx = max(1, int(round((xmax - xmin) / cell_ft)))
    ny = max(1, int(round((ymax - ymin) / cell_ft)))
    top = np.full((ny, nx), -np.inf, dtype=np.float32)
    ground_sum = np.zeros((ny, nx), dtype=np.float64)
    ground_count = np.zeros((ny, nx), dtype=np.uint32)
    center_ground = []
    scanned = 0
    with laspy.open(str(source), laz_backend=laspy.LazBackend.Lazrs) as reader:
        total = int(reader.header.point_count)
        for chunk_index, pts in enumerate(reader.chunk_iterator(250000), 1):
            x = np.asarray(pts.x, dtype=np.float64)
            y = np.asarray(pts.y, dtype=np.float64)
            z = np.asarray(pts.z, dtype=np.float32)
            cls = np.asarray(pts.classification, dtype=np.uint8)
            inside = (x >= xmin) & (x <= xmax) & (y >= ymin) & (y <= ymax) & (~np.isin(cls, np.array([7, 18], dtype=np.uint8)))
            if inside.any():
                ix = np.clip(np.floor((x[inside] - xmin) / cell_ft).astype(np.int32), 0, nx - 1)
                iy = np.clip(np.floor((y[inside] - ymin) / cell_ft).astype(np.int32), 0, ny - 1)
                np.maximum.at(top, (iy, ix), z[inside])
                g = inside & (cls == 2)
                if g.any():
                    gx = np.clip(np.floor((x[g] - xmin) / cell_ft).astype(np.int32), 0, nx - 1)
                    gy = np.clip(np.floor((y[g] - ymin) / cell_ft).astype(np.int32), 0, ny - 1)
                    np.add.at(ground_sum, (gy, gx), z[g].astype(np.float64))
                    np.add.at(ground_count, (gy, gx), 1)
                    local = g & (np.abs(x - anchor["projectedXFeet"]) <= 200) & (np.abs(y - anchor["projectedYFeet"]) <= 200)
                    if local.any():
                        center_ground.append(np.asarray(z[local], dtype=np.float64))
            scanned += len(pts)
            if chunk_index % 20 == 0:
                print("SURFACE_SCAN", tile["id"], scanned, "/", total, flush=True)
    if scanned != int(tile["pointCount"]):
        raise RuntimeError(f"Unexpected scan count for {tile['id']}: {scanned}")
    top_valid = np.isfinite(top)
    top_populated = int(top_valid.sum())
    # Open water/occluded patches can legitimately have no top-surface returns. Keep these
    # cells, but never propagate a neighboring roof height across the gap: use only the nearest
    # measured class-2 ground height for empty DSM cells, preserving flat water/ground context.
    if top_populated < int(nx * ny * 0.75):
        raise RuntimeError(f"LiDAR top-surface occupancy too low for safe materialization of {tile['id']}: {top_populated}/{nx*ny}")
    ground_valid = ground_count > 0
    ground = np.full((ny, nx), np.nan, dtype=np.float32)
    np.divide(ground_sum, ground_count, out=ground, where=ground_valid)
    if not ground_valid.any():
        raise RuntimeError(f"No measured ground class points for {tile['id']}")
    ground = ground[tuple(distance_transform_edt(~ground_valid, return_distances=False, return_indices=True))]
    top = np.where(top_valid, top, ground).astype(np.float32, copy=False)
    if center_ground:
        anchor["verticalOriginFeet"] = float(np.median(np.concatenate(center_ground)))
        anchor["verticalOriginMethod"] = "median of measured LAS class-2 ground returns within 200 ft of tile center"
    else:
        anchor["verticalOriginFeet"] = float(np.median(ground))
        anchor["verticalOriginMethod"] = "fallback median of measured LAS class-2 ground grid cells"
    above_ground = (top - ground) * FT_TO_M
    local_span = (maximum_filter(top, size=3, mode="nearest") - minimum_filter(top, size=3, mode="nearest")) * FT_TO_M
    flat_seed = (above_ground >= 4.5) & (local_span <= 5.0)
    candidate = binary_dilation(flat_seed, structure=np.ones((3,3), dtype=bool)) & (above_ground >= 4.5)
    labels, nlabels = label(candidate, structure=np.array([[0,1,0],[1,1,1],[0,1,0]], dtype=np.uint8))
    counts = np.bincount(labels.ravel(), minlength=nlabels+1)
    keep = counts >= 6
    keep[0] = False
    roof_mask = keep[labels]
    print("SURFACE_GRID", tile["id"], nx, ny, "occupied", top_populated, "roof_cells", int(roof_mask.sum()), "components", int(keep.sum()-1), flush=True)

    # Keep the photo mesh to roof-supported LiDAR cells plus the measured-ground DTM.
    # Unclassified tree crowns and isolated high returns must not become needle-like roof
    # triangles when the camera tilts. Other scene layers can render vegetation separately.
    surface_height = np.where(roof_mask, top, ground).astype(np.float32, copy=False)

    # Build distinct corners for each cell. Smooth only within the same roof/ground class and
    # only when neighboring measured heights differ by <= 1.5 m; building edges stay sharp.
    corner_neighbors = {
        "sw": ((0,0), (0,-1), (-1,0), (-1,-1)),
        "se": ((0,0), (0,1), (-1,0), (-1,1)),
        "nw": ((0,0), (0,-1), (1,0), (1,-1)),
        "ne": ((0,0), (0,1), (1,0), (1,1)),
    }
    def corner_height(j, i, corner):
        h0 = float(surface_height[j, i])
        is_roof = bool(roof_mask[j, i])
        vals = [h0]
        for dj, di in corner_neighbors[corner][1:]:
            jj, ii = j + dj, i + di
            if not (0 <= jj < ny and 0 <= ii < nx):
                continue
            if bool(roof_mask[jj, ii]) != is_roof:
                continue
            h = float(surface_height[jj, ii])
            if abs((h - h0) * FT_TO_M) <= 1.5:
                vals.append(h)
        return float(np.mean(vals))

    corner_sw = np.empty((ny,nx), dtype=np.float32)
    corner_se = np.empty((ny,nx), dtype=np.float32)
    corner_nw = np.empty((ny,nx), dtype=np.float32)
    corner_ne = np.empty((ny,nx), dtype=np.float32)
    for j in range(ny):
        for i in range(nx):
            corner_sw[j,i] = corner_height(j,i,"sw")
            corner_se[j,i] = corner_height(j,i,"se")
            corner_nw[j,i] = corner_height(j,i,"nw")
            corner_ne[j,i] = corner_height(j,i,"ne")

    # Vectorized cell-corner positions and exact orthophoto UVs.
    x0 = xmin + np.arange(nx, dtype=np.float64) * cell_ft
    x1 = np.minimum(x0 + cell_ft, xmax)
    y0 = ymin + np.arange(ny, dtype=np.float64) * cell_ft
    y1 = np.minimum(y0 + cell_ft, ymax)
    xx0, yy0 = np.meshgrid(x0, y0)
    xx1, yy1 = np.meshgrid(x1, y1)
    xyz = np.empty((ny,nx,4,3), dtype=np.float64)
    xyz[:,:,0,0], xyz[:,:,0,1], xyz[:,:,0,2] = xx0, yy0, corner_sw
    xyz[:,:,1,0], xyz[:,:,1,1], xyz[:,:,1,2] = xx1, yy0, corner_se
    xyz[:,:,2,0], xyz[:,:,2,1], xyz[:,:,2,2] = xx0, yy1, corner_nw
    xyz[:,:,3,0], xyz[:,:,3,1], xyz[:,:,3,2] = xx1, yy1, corner_ne
    flat_xyz = xyz.reshape(-1,3)
    q = qpos(flat_xyz[:,0], flat_xyz[:,2], flat_xyz[:,1],
             anchor["projectedXFeet"], anchor["projectedYFeet"], anchor["verticalOriginFeet"])
    to3857 = Transformer.from_crs(2263, 3857, always_xy=True)
    mx, my = to3857.transform(flat_xyz[:,0], flat_xyz[:,1])
    bx0, by0, bx1, by1 = image_bbox
    uv = np.empty((len(flat_xyz),2), dtype="<u2")
    uv[:,0] = np.clip(np.rint((mx-bx0)/(bx1-bx0)*65535), 0, 65535).astype(np.uint16)
    uv[:,1] = np.clip(np.rint((my-by0)/(by1-by0)*65535), 0, 65535).astype(np.uint16)
    pos_cells = q.reshape(ny,nx,4,3).astype("<i2", copy=False)
    uv_cells = uv.reshape(ny,nx,4,2).astype("<u2", copy=False)
    chunks = []
    for part, row_start in enumerate(range(0, ny, GRID_CHUNK_ROWS)):
        row_end = min(ny, row_start + GRID_CHUNK_ROWS)
        local_cells = (row_end-row_start)*nx
        base = np.arange(local_cells, dtype=np.uint32) * 4
        indices = np.empty(local_cells*6, dtype="<u4")
        indices[0::6], indices[1::6], indices[2::6] = base, base+2, base+1
        indices[3::6], indices[4::6], indices[5::6] = base+1, base+2, base+3
        raw = pos_cells[row_start:row_end].reshape(-1,3).tobytes() + uv_cells[row_start:row_end].reshape(-1,2).tobytes() + indices.tobytes()
        compressed = gzip_bytes(raw)
        filename = f"nyc-midtown-{tile['id']}-surface-2m-part-{part:02d}.bin.gz"
        (out_dir/filename).write_bytes(compressed)
        vertices = local_cells*4
        chunks.append({
            "part":part, "file":filename, "rowStart":row_start, "rowEndExclusive":row_end,
            "gridWidth":nx, "gridRows":row_end-row_start, "vertexCount":vertices,
            "indexCount":int(indices.size), "triangleCount":int(indices.size//3),
            "rawBytes":len(raw), "gzipBytes":len(compressed), "sha256":hashlib.sha256(compressed).hexdigest(),
            "binaryLayout":"int16le xyz positions, uint16le normalized UV pairs, uint32le local triangle indices",
            "positionScaleMeters":POSITION_SCALE_M
        })
        print("SURFACE_CHUNK_READY", tile["id"], part, len(compressed), flush=True)

    # Build explicit vertical quads from elevated roof-mask boundaries; do not fake photographic facades.
    wall_pos, wall_rgb, wall_idx = [], [], []
    base_rgb = (166,173,176)
    shades = {"east":0.80,"west":0.66,"north":0.90,"south":0.74}
    def push_wall(corners, direction):
        if max(p[1] for p in corners)-min(p[1] for p in corners) < 1.0:
            return
        base = len(wall_pos)
        for xf,hf,yf in corners:
            wall_pos.append(qpos(np.array([xf]), np.array([hf]), np.array([yf]),
                                 anchor["projectedXFeet"], anchor["projectedYFeet"], anchor["verticalOriginFeet"])[0])
        top_m = np.mean([p[1] for p in corners[:2]])*FT_TO_M
        shade = shades[direction] * (0.94 if top_m < 8 else 1.0)
        rgb = tuple(int(np.clip(v*shade,0,255)) for v in base_rgb)
        bottom = tuple(int(v*0.70) for v in rgb)
        wall_rgb.extend((rgb,rgb,bottom,bottom))
        wall_idx.extend((base,base+1,base+2,base,base+2,base+3))
    for j in range(ny):
        north = ymin + j*cell_ft
        south = min(north+cell_ft, ymax)
        for i in range(nx):
            if not roof_mask[j,i]:
                continue
            west, east = xmin+i*cell_ft, min(xmin+(i+1)*cell_ft, xmax)
            ta,tb = float(corner_nw[j,i]),float(corner_ne[j,i])
            lowj = min(j+1,ny-1)
            base_h = float(ground[lowj,i]) if j+1>=ny else max(float(ground[lowj,i]),float(surface_height[lowj,i]))
            if (j+1>=ny or not roof_mask[j+1,i]) and min(ta,tb)-base_h > 3.0/FT_TO_M:
                push_wall([(west,ta,south),(east,tb,south),(east,base_h,south),(west,base_h,south)],"north")
            ta,tb = float(corner_sw[j,i]),float(corner_se[j,i])
            lowj = max(j-1,0)
            base_h = float(ground[lowj,i]) if j==0 else max(float(ground[lowj,i]),float(surface_height[lowj,i]))
            if (j==0 or not roof_mask[j-1,i]) and min(ta,tb)-base_h > 3.0/FT_TO_M:
                push_wall([(east,tb,north),(west,ta,north),(west,base_h,north),(east,base_h,north)],"south")
            ta,tb = float(corner_se[j,i]),float(corner_ne[j,i])
            lowi = min(i+1,nx-1)
            base_h = float(ground[j,lowi]) if i+1>=nx else max(float(ground[j,lowi]),float(surface_height[j,lowi]))
            if (i+1>=nx or not roof_mask[j,i+1]) and min(ta,tb)-base_h > 3.0/FT_TO_M:
                push_wall([(east,ta,north),(east,tb,south),(east,base_h,south),(east,base_h,north)],"east")
            ta,tb = float(corner_sw[j,i]),float(corner_nw[j,i])
            lowi = max(i-1,0)
            base_h = float(ground[j,lowi]) if i==0 else max(float(ground[j,lowi]),float(surface_height[j,lowi]))
            if (i==0 or not roof_mask[j,i-1]) and min(ta,tb)-base_h > 3.0/FT_TO_M:
                push_wall([(west,tb,south),(west,ta,north),(west,base_h,north),(west,base_h,south)],"west")
    wall_pos_arr = np.asarray(wall_pos, dtype="<i2").reshape((-1,3))
    wall_rgb_arr = np.asarray(wall_rgb, dtype="u1").reshape((-1,3))
    wall_idx_arr = np.asarray(wall_idx, dtype="<u4")
    wall_raw = wall_pos_arr.tobytes()+wall_rgb_arr.tobytes()+wall_idx_arr.tobytes()
    wall_gz = gzip_bytes(wall_raw)
    wall_file = f"nyc-midtown-{tile['id']}-walls-2m.bin.gz"
    (out_dir/wall_file).write_bytes(wall_gz)
    texture_file = f"nyc-midtown-{tile['id']}-ortho.webp"
    Image.open(image_path).convert("RGB").save(out_dir/texture_file,"WEBP",quality=91,method=6)
    wall_quad_count = len(wall_idx_arr)//6
    surface_meta = {
        "file":None, "encoding":"gzip(binary chunk array)", "gridSpacingMetres":CELL_M,
        "gridWidth":nx, "gridHeight":ny, "vertexCount":int(pos_cells.shape[0]*pos_cells.shape[1]*4),
        "triangleCount":int(sum(c["triangleCount"] for c in chunks)), "indexCount":int(sum(c["indexCount"] for c in chunks)),
        "binaryLayout":"int16le xyz positions at 0.02m, uint16le normalized UV pairs, uint32le chunk-local triangle indices",
        "positionScaleMeters":POSITION_SCALE_M, "uvEncoding":"uint16 normalized 0..65535", "indexEncoding":"uint32le",
        "rawBytes":int(sum(c["rawBytes"] for c in chunks)), "gzipBytes":int(sum(c["gzipBytes"] for c in chunks)),
        "textureFile":texture_file, "textureFormat":"WebP", "textureSize":[4096,4096],
        "textureSha256":sha256_file(out_dir/texture_file), "sourcePointCount":total,
        "sourceTileSha256":sha256_file(source), "imagerySource":"NYS Latest Orthoimagery 2022–2025 natural color",
        "photorealisticRoofDrape":True, "facadePhotoCoverage":False,
        "coveragePercent":round(100*top_populated/(nx*ny),4),
        "materializedAtUtc":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime()),
        "wallFile":wall_file, "wallVertexCount":int(wall_pos_arr.shape[0]), "wallIndexCount":int(wall_idx_arr.size),
        "wallTriangleCount":int(wall_idx_arr.size//3), "wallQuadCount":int(wall_quad_count),
        "wallRawBytes":len(wall_raw), "wallGzipBytes":len(wall_gz), "wallSha256":hashlib.sha256(wall_gz).hexdigest(),
        "wallBinaryLayout":"int16le xyz positions at 0.02m, uint8 RGB wall-shading colors, uint32le triangle indices",
        "wallMaterial":"neutral shaded vertical faces derived from measured LiDAR roof boundaries",
        "wallMethod":"vertical quads between sustained elevated LiDAR roof-mask regions and the measured-ground DTM",
        "surfaceClassPolicy":"real orthophoto draped only over source-derived elevated roof-mask cells and measured class-2 ground; non-roof unclassified returns do not become elevated photo-mesh vertices",
        "cornerSmoothing":"corner-specific local means restricted to the same roof/ground class and neighboring heights within 1.5 metres; larger breaks stay sharp",
        "triangulationMethod":"two triangles per measured 2m cell with independent cell-local vertices so roof-ground and roof-height breaks do not stretch across facades",
        "obliqueImageryAvailable":False,
        "chunks":chunks, "chunkStrategy":"independent gzip row chunks with chunk-local indices"
    }
    return surface_meta

def make_manifest(tile, source, out_dir, anchor, bounds_wgs84, image_bbox, lods, surface_meta, ortho_sha):
    manifest = {
        "version":7002, "status":"MATERIALIZED_EXACT_LIDAR_WITH_ORTHOPHOTO_SURFACE_AND_VERTICAL_WALLS",
        "tileId":tile["id"],
        "source":{
            "provider":"NYC Office of Technology and Innovation / NYC OpenData",
            "dataset":"Topobathymetric LiDAR Data (2017)", "datasetUrl":SOURCE_DATASET_URL,
            "metadataUrl":SOURCE_DOC_URL, "archiveUrl":ARCHIVE_URL,
            "archiveMember":f"TopoBathymetric_Classified_LAZ/{tile['id']}.laz",
            "archiveMemberMethod":"ZIP_STORED_BYTE_RANGE_READ",
            "archivePayloadBytes":int(tile["archiveBytes"]), "archivePayloadOffset":int(tile["archiveOffset"]),
            "tileSha256":sha256_file(source),
            "licenseNote":"Public NYC Open Data dataset; retain source attribution and consult NYC Open Data terms for downstream reuse."
        },
        "acquisition":{"topographicCaptureStart":"2017-05-03","topographicCaptureEnd":"2017-05-17","nominalPulseDensity":"at least 8 pulses/m2 for citywide topographic data"},
        "coordinateReference":{"horizontal":"EPSG:2263 NAD83 / New York Long Island (US survey feet)","vertical":"NAVD88 Geoid 12B elevation (US survey feet)","sourceScaleFeet":[0.01,0.01,0.01]},
        "sourcePoints":int(tile["pointCount"]), "pointsScanned":int(tile["pointCount"]),
        "samplePoints":TARGET_POINTS, "sampleStrategy":"Seeded random sample of measured LAS returns; same nested return sample across 3 LOD tiers; RGB sampled from the registered NYS orthophoto.",
        "anchor":anchor,
        "tileBoundsSourceFeet":{"xmin":tile["bounds"][0],"ymin":tile["bounds"][1],"xmax":tile["bounds"][2],"ymax":tile["bounds"][3]},
        "boundsWgs84":bounds_wgs84,
        "lods":lods,
        "imagery":{
            "provider":"New York State ITS Geospatial Services","service":ORTHO_SERVICE_URL,
            "serviceUrl":ORTHO_EXPORT_URL,
            "description":"Latest NYS orthoimagery, combined 2022–2025 natural-color imagery; image export centered on each measured LiDAR tile.",
            "sourceProduct":"Latest New York State Orthoimagery","nominalResolution":"source varies; 4096px local export",
            "captureWindow":"2022–2025 composite","format":"WebP natural-color orthophoto texture derived from the NYS JPEG export",
            "imageFile":surface_meta["textureFile"],"imageSize":[4096,4096],
            "exportBboxEPSG3857":list(image_bbox),"imagerySha256":surface_meta["textureSha256"],"sourceExportSha256":ortho_sha,
            "method":"Real orthophoto pixels draped onto measured LiDAR roof and ground surface; vertical facade planes remain separately LiDAR-derived."
        },
        "materialization":{
            "method":"Measured NYC OpenData LiDAR returns materialized as roof-supported 2m triangles plus a measured-ground DTM and registered NYS orthophoto drape",
            "renderablePointCounts":LOD_COUNTS,"pointCoordinateQuantizationMetres":POSITION_SCALE_M,
            "sourcePointGeometryPreserved":True,"syntheticGeometryAdded":False,
            "surfaceMesh":"Nadir photo mesh uses source-derived elevated roof-mask cells plus measured class-2 ground; non-roof unclassified returns are not elevated mesh vertices, and corner smoothing is edge-preserving",
            "verticalWalls":"Neutral shaded vertical quads derived from roof-mask boundaries against the measured-ground DTM; no nadir imagery is stretched onto facades",
            "wallQuadCount":surface_meta["wallQuadCount"],"roofPhotoTexture":True,"sidePhotoTexture":False,
            "coordinateGrid":"Cell footprints snapped to EPSG:2263 2m bins and independently anchored per LiDAR tile"
        },
        "surfaceMesh":surface_meta,
        "builtAtUtc":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
    }
    path = out_dir / "manifest.json"
    path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    return path

def tile_bounds_wgs84(tile):
    xmin,ymin,xmax,ymax = tile["bounds"]
    trans = Transformer.from_crs(2263, 4326, always_xy=True)
    ring = [trans.transform(xmin,ymin), trans.transform(xmax,ymin), trans.transform(xmax,ymax), trans.transform(xmin,ymax)]
    ring = [[float(x),float(y)] for x,y in ring]
    ring.append(ring[0])
    lons, lats = [p[0] for p in ring[:-1]], [p[1] for p in ring[:-1]]
    return {"polygon":ring,"west":min(lons),"south":min(lats),"east":max(lons),"north":max(lats)}

def main():
    start = time.time()
    if not CENTER_MANIFEST_PATH.exists():
        raise FileNotFoundError(f"Central pilot manifest missing: {CENTER_MANIFEST_PATH}")
    center = json.loads(CENTER_MANIFEST_PATH.read_text(encoding="utf-8-sig"))
    center_record = {
        "tileId":"987210","manifest":"manifest.json","assetBase":"/assets/nyc-lidar/",
        "boundsWgs84":center["boundsWgs84"],"anchor":center["anchor"]
    }
    records = [center_record]
    for tile in NEIGHBOR_TILES:
        out_dir = TILE_ROOT / tile["id"]
        out_dir.mkdir(parents=True, exist_ok=True)
        source = Path(os.environ.get("BRIDGEPOINT_LIDAR_CACHE", "/tmp/bridgepoint-nyc-lidar")) / f"{tile['id']}.laz"
        fetch_laz(tile, source)
        xmin,ymin,xmax,ymax = tile["bounds"]
        anchor_x, anchor_y = round((xmin+xmax)/2.0, 2), round((ymin+ymax)/2.0, 2)
        to4326 = Transformer.from_crs(2263, 4326, always_xy=True)
        longitude, latitude = to4326.transform(anchor_x, anchor_y)
        anchor = {
            "longitude":float(longitude),"latitude":float(latitude),
            "projectedXFeet":anchor_x,"projectedYFeet":anchor_y,"verticalOriginFeet":0.0,
            "verticalOriginMethod":"computed from source LAS class-2 ground returns within 200 ft of tile center",
            "enuAxes":"local X=east, Y=up, Z=north","feetToMeters":FT_TO_M
        }
        cache_dir = Path(os.environ.get("BRIDGEPOINT_LIDAR_CACHE", "/tmp/bridgepoint-nyc-lidar"))
        cache_dir.mkdir(parents=True, exist_ok=True)
        ortho_jpg = cache_dir / f"{tile['id']}-ortho.jpg"
        image_bbox = fetch_orthophoto(tile, anchor_x, anchor_y, ortho_jpg)
        image = Image.open(ortho_jpg).convert("RGB")
        # Determine the exact tile-local vertical anchor from measured ground before quantizing any points.
        surface = build_surface_and_walls(tile, source, image_bbox, anchor, out_dir, ortho_jpg)
        lods = write_lod_assets(tile, source, image, image_bbox, anchor, out_dir)
        bnds = tile_bounds_wgs84(tile)
        manifest_path = make_manifest(tile, source, out_dir, anchor, bnds, image_bbox, lods, surface, sha256_file(ortho_jpg))
        records.append({
            "tileId":tile["id"],"manifest":f"tiles/{tile['id']}/manifest.json",
            "assetBase":f"/assets/nyc-lidar/tiles/{tile['id']}/",
            "boundsWgs84":bnds,"anchor":anchor
        })
        print("TILE_MATERIALIZED",tile["id"],"sourceSha256",sha256_file(source),
              "manifest",str(manifest_path),"wallQuads",surface["wallQuadCount"],
              "surfaceChunks",len(surface["chunks"]),flush=True)
        # Release arrays and source tile before starting the next source tile.
        for temporary in (source, ortho_jpg):
            try: temporary.unlink()
            except OSError: pass
    # Keep a stable, explicit neighbor lookup; the browser only loads tile geometry for its view.
    records.sort(key=lambda x: x["tileId"])
    tile_index = {
        "version":7002,"baseTileId":"987210",
        "coordinateReference":"EPSG:2263 NAD83 / New York Long Island (US survey feet); local vertical datum NAVD88 Geoid12B ft",
        "sourceDataset":SOURCE_DATASET_URL,
        "surfaceMethod":"edge-preserving LiDAR roof-mask triangles + measured-ground DTM, registered nadir orthophoto, and separate neutral vertical walls",
        "tiles":records,
        "tileCount":len(records),
        "generatedAtUtc":time.strftime("%Y-%m-%dT%H:%M:%SZ",time.gmtime())
    }
    INDEX_PATH.write_text(json.dumps(tile_index,indent=2),encoding="utf-8")
    print("NEIGHBORHOOD_READY",json.dumps({
        "tileCount":len(records),"tileIds":[r["tileId"] for r in records],
        "index":str(INDEX_PATH),"elapsedSeconds":round(time.time()-start,1),
        "assetBytes":sum(p.stat().st_size for p in TILE_ROOT.rglob("*") if p.is_file())
    }),flush=True)

if __name__ == "__main__":
    main()
