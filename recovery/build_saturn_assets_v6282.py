#!/usr/bin/env python3
"""Build compact local Saturn-system assets from NASA/PDS/Cassini source data."""
from __future__ import annotations
import argparse, gzip, hashlib, json, math, struct
from pathlib import Path
import numpy as np
from PIL import Image
import rasterio
from urllib.request import Request, urlopen
from urllib.parse import urlencode
import spiceypy as spice
import fast_simplification

EARTH_RADIUS_KM = 6371.0084
SATURN_RADIUS_KM = 58232.0

def sha256(path: Path) -> str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def save_webp(src: Path, dst: Path, quality: int = 94) -> dict:
    im=Image.open(src).convert("RGB")
    dst.parent.mkdir(parents=True,exist_ok=True)
    im.save(dst,"WEBP",quality=quality,method=6)
    return {"file":dst.name,"source":src.name,"source_size":list(im.size),"bytes":dst.stat().st_size}

def build_dsk_mesh(src: Path, dst: Path, body: str, target_vertices: int) -> dict:
    handle=spice.dasopr(str(src))
    try:
        dladsc=spice.dlabfs(handle)
        nv,np0=spice.dskz02(handle,dladsc)
        vertices=spice.dskv02(handle,dladsc,1,nv).astype(np.float64,copy=False)
        faces=(spice.dskp02(handle,dladsc,1,np0).astype(np.int64,copy=False)-1)
    finally:
        spice.dascls(handle)
    if len(vertices)<1000 or len(faces)<1000:
        raise RuntimeError(f"{body}: implausibly small DSK ({len(vertices)} vertices, {len(faces)} plates)")
    simple_v,simple_f=fast_simplification.simplify(vertices,faces,target_count=target_vertices)
    simple_v=np.asarray(simple_v,dtype=np.float64)
    simple_f=np.asarray(simple_f,dtype=np.int64)
    # DSK plate winding is outward; preserve that winding and compute shared normals.
    v=np.asarray(simple_v,dtype=np.float64)
    f=np.asarray(simple_f,dtype=np.int64)
    signed_volume=np.einsum('ij,ij->i',v[f[:,0]],np.cross(v[f[:,1]],v[f[:,2]])).sum()
    if signed_volume<0:
        f=f[:,[0,2,1]]
    tri=v[f]
    face_normals=np.cross(tri[:,1]-tri[:,0],tri[:,2]-tri[:,0])
    normals=np.zeros_like(v)
    np.add.at(normals,f[:,0],face_normals)
    np.add.at(normals,f[:,1],face_normals)
    np.add.at(normals,f[:,2],face_normals)
    normals/=np.maximum(1e-12,np.linalg.norm(normals,axis=1))[:,None]
    r=np.linalg.norm(v,axis=1).clip(1e-9)
    lon=np.arctan2(v[:,1],v[:,0])
    lat=np.arcsin(np.clip(v[:,2]/r,-1.0,1.0))
    uv=np.stack(((lon/(2.0*math.pi)+0.5),(lat/math.pi+0.5)),axis=1)
    # Expand triangles so a triangle crossing the +/-180-degree seam gets its
    # own wrapped UVs; this avoids a long texture smear across the globe.
    tri_uv=uv[f].copy()
    seam=(tri_uv[:,:,0].max(axis=1)-tri_uv[:,:,0].min(axis=1))>0.5
    if np.any(seam):
        mask=seam[:,None] & (tri_uv[:,:,0]<0.5)
        tri_uv[:,:,0]=np.where(mask,tri_uv[:,:,0]+1.0,tri_uv[:,:,0])
    tri_pos=v[f][:,:,[0,2,1]]/EARTH_RADIUS_KM
    tri_norm=normals[f][:,:,[0,2,1]]
    # DSK coordinates use +Z for north; Three.js uses +Y as up.
    pos=np.ascontiguousarray(tri_pos.reshape(-1,3),dtype="<f4")
    nor=np.ascontiguousarray(tri_norm.reshape(-1,3),dtype="<f4")
    tex=np.ascontiguousarray(tri_uv.reshape(-1,2),dtype="<f4")
    header=struct.pack("<4sIIII",b"BPSM",1,len(pos),len(f),0)
    raw=header+pos.tobytes()+nor.tobytes()+tex.tobytes()
    dst.parent.mkdir(parents=True,exist_ok=True)
    dst.write_bytes(gzip.compress(raw,compresslevel=9,mtime=0))
    radii=np.linalg.norm(v,axis=1)
    return {
        "body":body,"file":dst.name,"source_dsk":src.name,
        "original_vertices":int(nv),"original_triangles":int(np0),
        "simplified_vertices":int(len(v)),"simplified_triangles":int(len(f)),
        "render_vertices":int(len(pos)),"radius_km":[float(radii.min()),float(radii.max())],
        "bytes_gzip":dst.stat().st_size,"sha256":sha256(dst),
        "coordinate_mapping":"DSK body-fixed xyz -> Three.js xzy; physical coordinates in Earth-radius units",
        "header":"BPSM u32 version,renderVertexCount,triangleCount,reserved; float32 position xyz; float32 normal xyz; float32 uv"
    }

def build_titan_height(src: Path, dst: Path) -> dict:
    with rasterio.open(src) as ds:
        arr=ds.read(1).astype(np.float32,copy=False)
        nodata=ds.nodata
        width,height=ds.width,ds.height
        if ds.count!=1 or width<360 or height<180:
            raise RuntimeError("Titan DEM cube dimensions/bands are unexpected")
    valid=np.isfinite(arr)
    if nodata is not None:
        valid &= arr!=np.float32(nodata)
    if valid.sum()<width*height*0.95:
        raise RuntimeError("Titan interpolated DEM unexpectedly contains extensive missing cells")
    lo=float(np.percentile(arr[valid],0.05)); hi=float(np.percentile(arr[valid],99.95))
    if not hi>lo: raise RuntimeError("Titan DEM has no useful relief range")
    scaled=np.zeros(arr.shape,dtype=np.uint16)
    scaled[valid]=np.rint(np.clip((arr[valid]-lo)/(hi-lo),0,1)*65534.0).astype(np.uint16)
    # Keep north at the top of the image and positive-east longitude increasing.
    header=struct.pack("<4sIIIIff",b"BPSH",1,width,height,0,lo,hi)
    # DataTexture rows are uploaded with row zero at v=0; store south-to-north.
    raw=header+np.ascontiguousarray(scaled[::-1,:].astype("<u2")).tobytes()
    dst.parent.mkdir(parents=True,exist_ok=True)
    dst.write_bytes(gzip.compress(raw,compresslevel=9,mtime=0))
    return {"body":"Titan","file":dst.name,"source_cube":src.name,"width":width,"height":height,
            "elevation_min_m":lo,"elevation_max_m":hi,"nodata_cells":int((~valid).sum()),
            "bytes_gzip":dst.stat().st_size,"sha256":sha256(dst),
            "header":"BPSH u32 version,width,height,reserved; float32 min/max metres; uint16 normalized elevation"}

def fetch_bytes(url: str, timeout: int = 180) -> bytes:
    req=Request(url,headers={"User-Agent":"BridgePoint-Intelligence/1.0 (NASA open-data asset build)"})
    with urlopen(req,timeout=timeout) as response:
        return response.read()

def download_sources(root: Path) -> None:
    """Download the exact open NASA/PDS/NAIF/Cornell source files used by the builder."""
    files={
      "saturn/saturn-cassini-iss-rgb-global-original.png":
        "https://atmos.nmsu.edu/PDS/data/PDS4/co_iss_global-maps/browse/Browse_Cassini_ISS_RGB_Saturn_global_color_map_original.png",
      "titan/titan-cassini-surface-mosaic-PIA22770.jpg":
        "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia22/pia22770/PIA22770.jpg?fit=clip&h=2880&w=5760",
      "enceladus/enceladus-cassini-color-map-PIA18435.jpg":
        "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia18/pia18435/PIA18435.jpg?fit=clip&h=7980&w=15960",
      "mimas/mimas-cassini-color-map-PIA18437.jpg":
        "https://assets.science.nasa.gov/dynamicimage/assets/science/psd/photojournal/pia/pia18/pia18437/PIA18437.jpg?fit=clip&h=3178&w=6356",
      "enceladus/cas_enceladus_ssd_spc_0128icq_v1.bds":
        "https://naif.jpl.nasa.gov/pub/naif/CASSINI/kernels/dsk/cas_enceladus_ssd_spc_0128icq_v1.bds",
      "mimas/MIMAS_M3_GAS_V01.BDS":
        "https://sbn.psi.edu/pds/shape-models/files/dsk/MIMAS_M3_GAS_V01.BDS",
    }
    for rel,url in files.items():
        path=root/rel
        if path.exists() and path.stat().st_size>1024:
            print("SOURCE_CACHED",rel,path.stat().st_size,flush=True)
            continue
        path.parent.mkdir(parents=True,exist_ok=True)
        data=fetch_bytes(url)
        if len(data)<1024: raise RuntimeError(f"NASA source is unexpectedly small: {url}")
        path.write_bytes(data)
        print("SOURCE_OK",rel,len(data),flush=True)

    # Cornell eCommons distributes the Cassini 4-PPD interpolated DEM as an ISIS cube.
    titan_dem=root/"titan"/"topo_4PPD_interp.cub"
    if not titan_dem.exists() or titan_dem.stat().st_size<100000:
        item="88de3ac0-b77b-46fa-bb30-ba02f17cf12c"
        bundles=json.loads(fetch_bytes(f"https://ecommons.cornell.edu/server/api/core/items/{item}/bundles"))
        original=next(b for b in bundles["_embedded"]["bundles"] if b["name"]=="ORIGINAL")
        bits=json.loads(fetch_bytes(original["_links"]["bitstreams"]["href"]))
        bit=next(b for b in bits["_embedded"]["bitstreams"] if b["name"]=="topo_4PPD_interp.cub")
        signed=json.loads(fetch_bytes(bit["_links"]["signedurl"]["href"]))["presignedUrl"]
        data=fetch_bytes(signed)
        if len(data)!=int(bit["sizeBytes"]): raise RuntimeError("Cornell Titan DEM byte count does not match published metadata")
        titan_dem.parent.mkdir(parents=True,exist_ok=True);titan_dem.write_bytes(data)
        print("SOURCE_OK","titan/topo_4PPD_interp.cub",len(data),flush=True)

    # Request short Saturn-centred vector states for Mimas, Enceladus and Titan
    # in the same BODY EQUATOR frame used by the rendered ring plane.
    base="https://ssd.jpl.nasa.gov/api/horizons.api"
    metadata=root/"metadata";metadata.mkdir(parents=True,exist_ok=True)
    for key,body_id in (("mimas",601),("enceladus",602),("titan",606)):
        path=metadata/f"horizons-{body_id}-body-equator-20261109.json"
        if path.exists() and path.stat().st_size>1000:
            continue
        params={"format":"json","COMMAND":f"'{body_id}'","CENTER":"'500@699'",
            "MAKE_EPHEM":"'YES'","EPHEM_TYPE":"'VECTORS'","START_TIME":"'2026-11-09 00:00'",
            "STOP_TIME":"'2026-11-09 00:01'","STEP_SIZE":"'1 m'","REF_PLANE":"'BODY EQUATOR'",
            "OUT_UNITS":"'KM-S'","CSV_FORMAT":"'YES'","VEC_TABLE":"'2'","VEC_LABELS":"'YES'","OBJ_DATA":"'NO'"}
        data=fetch_bytes(base+"?"+urlencode(params))
        result=json.loads(data)
        if "$$SOE" not in result.get("result",""): raise RuntimeError(f"JPL Horizons returned no {key} vector state")
        path.write_text(json.dumps(result,indent=2),encoding="utf-8")
        print("EPHEMERIS_OK",key,flush=True)

def build(root: Path, out: Path) -> dict:
    out.mkdir(parents=True,exist_ok=True)
    texture_dir=out/"textures"; mesh_dir=out/"meshes"; dem_dir=out/"height"
    textures={}
    textures["saturn"]=save_webp(root/"saturn"/"saturn-cassini-iss-rgb-global-original.png",texture_dir/"saturn-cassini-iss-global.webp",95)
    textures["titan"]=save_webp(root/"titan"/"titan-cassini-surface-mosaic-PIA22770.jpg",texture_dir/"titan-cassini-surface-mosaic.webp",94)
    textures["enceladus"]=save_webp(root/"enceladus"/"enceladus-cassini-color-map-PIA18435.jpg",texture_dir/"enceladus-cassini-global-map.webp",94)
    textures["mimas"]=save_webp(root/"mimas"/"mimas-cassini-color-map-PIA18437.jpg",texture_dir/"mimas-cassini-global-map.webp",94)
    dem=build_titan_height(root/"titan"/"topo_4PPD_interp.cub",dem_dir/"titan-cassini-topography-4ppd-u16.bin.gz")
    ephemerides={}
    for key,body_id in (("mimas",601),("enceladus",602),("titan",606)):
        eph_path=root/"metadata"/f"horizons-{body_id}-body-equator-20261109.json"
        response=json.loads(eph_path.read_text(encoding="utf-8-sig"))
        block=response["result"].split("$$SOE",1)[1].split("$$EOE",1)[0].strip().splitlines()[0]
        fields=[v.strip() for v in block.split(",")]
        if len(fields)<8: raise RuntimeError(f"JPL Horizons state vector is malformed: {eph_path.name}")
        ephemerides[key]={"target_id":body_id,"epoch_utc":"2026-11-09T00:00:00Z",
            "saturn_center":"500@699","reference_frame":"Saturn BODY EQUATOR",
            "position_km":[float(v.replace("D","E")) for v in fields[2:5]],
            "velocity_km_s":[float(v.replace("D","E")) for v in fields[5:8]],
            "source":"NASA/JPL Horizons API"}
    (out/"ephemerides.json").write_text(json.dumps(ephemerides,indent=2)+"\n",encoding="utf-8")
    meshes={}
    meshes["enceladus"]=build_dsk_mesh(root/"enceladus"/"cas_enceladus_ssd_spc_0128icq_v1.bds",mesh_dir/"enceladus-cassini-shape-v1.bin.gz","Enceladus",65000)
    meshes["mimas"]=build_dsk_mesh(root/"mimas"/"MIMAS_M3_GAS_V01.BDS",mesh_dir/"mimas-cassini-shape-v1.bin.gz","Mimas",90000)
    manifest={
      "version":"saturn-system-v6282","created":"2026-11-09",
      "sources":{
        "saturn":"NASA PDS Cassini ISS RGB Saturn global color-map browse image; visual atmospheric albedo texture, not a height map",
        "titan":"NASA Cassini ISS PIA22770 near-infrared 938 nm global surface mosaic assembled from 9,873 images; paired with Corlies et al. 2024 Cassini SAR topography topo_4PPD_interp.cub, a globally interpolated DEM whose source observations are sparse",
        "enceladus":"NASA Cassini PIA18435 global enhanced-color mosaic (100 m/px source product) plus NASA NAIF Cassini DSK shape model cas_enceladus_ssd_spc_0128icq_v1",
        "mimas":"NASA Cassini PIA18437 enhanced-color global mosaic (200 m/px source product) plus NASA PDS Gaskell M3 DSK shape model MIMAS_M3_GAS_V01.BDS"
      },
      "textures":textures,"titan_dem":dem,"shape_meshes":meshes,"ephemeris_file":"ephemerides.json",
      "physical":{
        "saturn_mean_radius_km":58232.0,
        "titan_mean_radius_km":2574.73,"titan_orbit_km":1221870.0,"titan_orbit_period_days":15.945421,
        "enceladus_mean_radius_km":252.1,"enceladus_orbit_km":238042.0,"enceladus_orbit_period_days":1.370218,
        "mimas_mean_radius_km":198.2,"mimas_orbit_km":185539.0,"mimas_orbit_period_days":0.942422
      },
      "rings_km":{
        "D":[66900,74510],"C":[74510,92000],"B":[92000,117580],
        "cassini_division":[117580,122170],"A":[122170,136775],
        "F":[140180,140480],"G":[166000,174000],"E":[180000,480000]
      }
    }
    (out/"manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    return manifest

if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--source-root",required=True,type=Path)
    p.add_argument("--output-root",required=True,type=Path)
    p.add_argument("--download",action="store_true",help="Download NASA/PDS/NAIF/JPL source products before conversion")
    args=p.parse_args()
    if args.download:
        download_sources(args.source_root)
    m=build(args.source_root,args.output_root)
    print(json.dumps({"manifest":str(args.output_root/"manifest.json"),
                      "titan_dem":m["titan_dem"],
                      "meshes":m["shape_meshes"],
                      "textures":m["textures"]},indent=2))

[executed on device: MollieOllie (898525b9-c32e-4ce4-b683-4efb3b88b364)]