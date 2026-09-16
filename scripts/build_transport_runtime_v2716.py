#!/usr/bin/env python3
import argparse
import base64
import datetime as dt
import hashlib
import json
import os
import pathlib
import subprocess
import sys
from urllib.parse import quote, urljoin, urlparse

import duckdb
import requests

SUPABASE_URL=os.environ["SUPABASE_URL"].rstrip("/")
OIDC=os.environ["TRANSPORT_RUNTIME_OIDC_TOKEN"]
BROKER=f"{SUPABASE_URL}/functions/v1/bridgepoint-transport-runtime-broker-v2716"
TIPPECANOE_SHA=os.environ.get("TIPPECANOE_SHA","4f2621186acfec33b63ddf636f665623c0fef2dd")

def post(payload,timeout=180):
    r=requests.post(BROKER,json={**payload,"oidc_token":OIDC},headers={"content-type":"application/json"},timeout=timeout)
    if not r.ok:
        raise RuntimeError(f"broker {payload.get('action')} -> {r.status_code}: {r.text[:1600]}")
    j=r.json()
    if j.get("complete") is False:
        raise RuntimeError(f"broker {payload.get('action')}: {j}")
    return j

def sha256_file(path):
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(8*1024*1024),b""):
            h.update(chunk)
    return h.hexdigest()

def download_sources(state,out_dir):
    listing=post({"action":"list_sources","state_code":state})
    objects=listing["objects"]
    local={"segment":[],"connector":[]}
    for i,obj in enumerate(objects):
        kind=obj["asset_kind"]
        signed=post({"action":"sign_download","state_code":state,"object_path":obj["object_path"]})
        suffix=pathlib.Path(obj["object_path"]).name or f"part-{i:05d}.parquet"
        path=out_dir/f"{kind}-{i:05d}-{suffix}"
        with requests.get(signed["url"],stream=True,timeout=900) as r:
            r.raise_for_status()
            with path.open("wb") as f:
                for chunk in r.iter_content(8*1024*1024):
                    if chunk:f.write(chunk)
        got_size=path.stat().st_size
        got_sha=sha256_file(path)
        if got_size!=int(obj["file_bytes"]):
            raise RuntimeError(f"size mismatch {obj['object_path']}: {got_size}!={obj['file_bytes']}")
        if got_sha.lower()!=str(obj["sha256"]).lower():
            raise RuntimeError(f"sha256 mismatch {obj['object_path']}")
        local[kind].append(path)
        print(json.dumps({"verified_source":obj["object_path"],"kind":kind,"bytes":got_size,"sha256":got_sha}))
    for kind in ("segment","connector"):
        if not local[kind]:
            raise RuntimeError(f"missing verified {kind} source")
    return listing,local

def sql_list(paths):
    return "["+",".join("'" + str(p).replace("'","''") + "'" for p in paths)+"]"

def write_geojsonseq(con,paths,kind,out_path):
    src=sql_list(paths)
    desc=con.execute(f"DESCRIBE SELECT * FROM read_parquet({src},union_by_name=true)").fetchall()
    col_types={r[0]:str(r[1]).upper() for r in desc}
    cols=set(col_types)
    extra=[]
    for name in ("subtype","class"):
        if name in cols:
            extra.append((name,f'cast("{name}" as varchar)'))
    select_extra="".join(","+expr for _,expr in extra)
    geom_type=col_types.get("geometry","")
    geom_expr="geometry" if geom_type.startswith("GEOMETRY") else "ST_GeomFromWKB(geometry)"
    cur=con.execute(f"""
      select cast(id as varchar) id,
             ST_AsGeoJSON({geom_expr}) geom
             {select_extra}
      from read_parquet({src},union_by_name=true)
      where geometry is not null
    """)
    count=0
    with out_path.open("w",encoding="utf-8") as f:
        while True:
            rows=cur.fetchmany(10000)
            if not rows:break
            for row in rows:
                props={"kind":kind}
                for idx,(name,_) in enumerate(extra,start=2):
                    if row[idx] is not None:props[name]=row[idx]
                feat={"type":"Feature","id":row[0],"geometry":json.loads(row[1]),"properties":props}
                f.write(json.dumps(feat,separators=(",",":"))+"\n")
                count+=1
    return count,sorted(cols)

def build_pmtiles(state,local,out_dir,expected):
    con=duckdb.connect(database=":memory:")
    con.execute("SET threads=4")
    con.execute("SET memory_limit='5GB'")
    con.execute("INSTALL spatial; LOAD spatial")
    segment_geo=out_dir/"segments.geojsonseq"
    connector_geo=out_dir/"connectors.geojsonseq"
    seg_count,seg_cols=write_geojsonseq(con,local["segment"],"segment",segment_geo)
    con_count,con_cols=write_geojsonseq(con,local["connector"],"connector",connector_geo)
    con.close()
    if seg_count!=int(expected["segment_rows"]) or con_count!=int(expected["connector_rows"]):
        raise RuntimeError(f"export row mismatch segments={seg_count}/{expected['segment_rows']} connectors={con_count}/{expected['connector_rows']}")
    output=out_dir/"transport.pmtiles"
    cmd=[
        "tippecanoe","--force","-Z6","-z16","--drop-densest-as-needed","--extend-zooms-if-still-dropping",
        "-o",str(output),
        "-L",f"segments:{segment_geo}",
        "-L",f"connectors:{connector_geo}",
    ]
    print("RUN"," ".join(cmd))
    subprocess.run(cmd,check=True)
    if not output.exists() or output.stat().st_size<=0:
        raise RuntimeError("tippecanoe produced no PMTiles output")
    return output,seg_count,con_count,{"segment_columns":seg_cols,"connector_columns":con_cols}

def _b64meta(value):
    return base64.b64encode(str(value).encode("utf-8")).decode("ascii")

def tus_upload_signed(output,bucket,object_path,signature):
    """
    Upload a large runtime artifact through Supabase Storage TUS.
    The old one-shot signed PUT path hit HTTP 413 on large state PMTiles.
    Supabase recommends the direct storage hostname plus 6 MiB TUS chunks.
    """
    parsed=urlparse(SUPABASE_URL)
    project_ref=parsed.hostname.split(".")[0]
    direct_endpoint=f"https://{project_ref}.storage.supabase.co/storage/v1/upload/resumable"
    gateway_endpoint=f"{SUPABASE_URL.rstrip('/')}/storage/v1/upload/resumable"
    size=output.stat().st_size
    metadata=",".join([
        f"bucketName {_b64meta(bucket)}",
        f"objectName {_b64meta(object_path)}",
        f"contentType {_b64meta('application/octet-stream')}",
        f"cacheControl {_b64meta('3600')}",
    ])
    create_headers={
        "Tus-Resumable":"1.0.0",
        "Upload-Length":str(size),
        "Upload-Metadata":metadata,
        "x-signature":signature,
        "x-upsert":"true",
    }
    create=None
    endpoint=None
    errors=[]
    for candidate in (direct_endpoint,gateway_endpoint):
        r=requests.post(candidate,headers=create_headers,timeout=120)
        if r.status_code in (201,204):
            create=r
            endpoint=candidate
            break
        errors.append({"endpoint":"direct" if candidate==direct_endpoint else "gateway","status":r.status_code,"body":r.text[:600]})
        if "Invalid Compact JWS" not in r.text and r.status_code not in (400,401,403):
            break
    if create is None:
        raise RuntimeError(f"TUS create failed: {json.dumps(errors,separators=(',',':'))}")
    print(json.dumps({"tus_create_endpoint":"direct" if endpoint==direct_endpoint else "gateway","status":create.status_code},separators=(",",":")))
    location=create.headers.get("Location") or create.headers.get("location")
    if not location:
        raise RuntimeError("TUS create did not return Location")
    upload_url=urljoin(endpoint,location)
    offset=0
    chunk_size=6*1024*1024
    with output.open("rb") as f:
        while offset<size:
            f.seek(offset)
            chunk=f.read(min(chunk_size,size-offset))
            if not chunk:
                raise RuntimeError(f"TUS short read at {offset}/{size}")
            r=requests.patch(upload_url,data=chunk,headers={
                "Tus-Resumable":"1.0.0",
                "Upload-Offset":str(offset),
                "Content-Type":"application/offset+octet-stream",
                "Content-Length":str(len(chunk)),
                "x-signature":signature,
                "x-upsert":"true",
            },timeout=300)
            if r.status_code not in (204,):
                raise RuntimeError(f"TUS patch {r.status_code} at {offset}/{size}: {r.text[:1200]}")
            next_offset=int(r.headers.get("Upload-Offset",offset+len(chunk)))
            if next_offset<=offset:
                raise RuntimeError(f"TUS upload offset did not advance: {offset}->{next_offset}")
            offset=next_offset
            pct=round(offset*100/size,2)
            print(json.dumps({"tus_uploaded":offset,"bytes":size,"pct":pct},separators=(",",":")))
    if offset!=size:
        raise RuntimeError(f"TUS incomplete upload {offset}/{size}")


def broker_tus_upload(output,state):
    """Upload large PMTiles through the OIDC broker; service-role auth stays server-side."""
    size=output.stat().st_size
    created=post({"action":"tus_create","state_code":state,"file_bytes":size},timeout=180)
    upload_url=created["upload_url"]
    chunk_size=6*1024*1024

    def head_offset():
        h=post({"action":"tus_head","state_code":state,"upload_url":upload_url},timeout=120)
        off=int(h.get("offset",0))
        length=int(h.get("length",size) or size)
        if length not in (0,size):
            raise RuntimeError(f"broker TUS length mismatch {length}!={size}")
        if off<0 or off>size:
            raise RuntimeError(f"broker TUS invalid offset {off}/{size}")
        return off

    offset=head_offset()
    with output.open("rb") as fh:
        while offset<size:
            advanced=False
            last_error=None
            for attempt in range(4):
                fh.seek(offset)
                chunk=fh.read(min(chunk_size,size-offset))
                if not chunk:
                    raise RuntimeError(f"broker TUS short read at {offset}/{size}")
                relay_url=(
                    BROKER+"?action=tus_patch"
                    +"&state_code="+quote(state,safe="")
                    +"&upload_url="+quote(upload_url,safe="")
                    +"&offset="+str(offset)
                )
                try:
                    r=requests.post(
                        relay_url,
                        data=chunk,
                        headers={
                            "x-bridgepoint-oidc":OIDC,
                            "content-type":"application/offset+octet-stream",
                            "content-length":str(len(chunk)),
                        },
                        timeout=300,
                    )
                    if r.ok:
                        j=r.json()
                        next_offset=int(j.get("offset",offset+len(chunk)))
                        if next_offset<=offset or next_offset>size:
                            raise RuntimeError(f"broker TUS offset did not advance {offset}->{next_offset}")
                        offset=next_offset
                        advanced=True
                        break
                    last_error=RuntimeError(f"broker TUS patch {r.status_code} at {offset}/{size}: {r.text[:1200]}")
                except Exception as e:
                    last_error=e

                # The relay may have completed the PATCH after the client lost the response.
                # HEAD makes retries idempotent and prevents replaying bytes at the wrong offset.
                try:
                    recovered=head_offset()
                    if recovered>offset:
                        offset=recovered
                        advanced=True
                        break
                except Exception as he:
                    last_error=RuntimeError(f"{last_error}; HEAD recovery failed: {he}")
                import time
                time.sleep(1+attempt*2)

            if not advanced:
                raise RuntimeError(str(last_error or f"broker TUS failed at {offset}/{size}"))
            print(json.dumps({
                "broker_tus_uploaded":offset,
                "bytes":size,
                "pct":round(offset*100/size,2)
            },separators=(",",":")))

    final_offset=head_offset()
    if final_offset!=size:
        raise RuntimeError(f"broker TUS incomplete upload {final_offset}/{size}")
    print(json.dumps({"broker_tus_complete":True,"bytes":size,"state_code":state},separators=(",",":")))


def signed_put_upload(output,signed_url):
    """Control/fallback path matching storage-js uploadToSignedUrl semantics."""
    parsed=urlparse(signed_url)
    project_ref=urlparse(SUPABASE_URL).hostname.split(".")[0]
    direct=parsed._replace(netloc=f"{project_ref}.storage.supabase.co").geturl()
    candidates=[]
    for u in (direct,signed_url):
        if u not in candidates:candidates.append(u)
    errors=[]
    size=output.stat().st_size
    for u in candidates:
        with output.open("rb") as body:
            r=requests.put(u,data=body,headers={
                "content-type":"application/octet-stream",
                "cache-control":"max-age=3600",
                "x-upsert":"true",
                "content-length":str(size),
            },timeout=900)
        if r.status_code in (200,201):
            print(json.dumps({"signed_put":"direct" if u==direct else "gateway","status":r.status_code,"bytes":size},separators=(",",":")))
            return
        errors.append({"endpoint":"direct" if u==direct else "gateway","status":r.status_code,"body":r.text[:600]})
        # A gateway 413 is expected to remain recoverable by another large-object strategy.
    raise RuntimeError(f"signed PUT failed: {json.dumps(errors,separators=(',',':'))}")

def upload_finalize(state,output,seg_count,con_count,metadata):
    digest=sha256_file(output)
    size=output.stat().st_size
    # Supabase's normal signed upload path is fast for smaller artifacts, but
    # returns EntityTooLarge for ~100MB PMTiles. Large objects use a 6 MiB TUS
    # relay through the OIDC broker so the service-role credential never leaves
    # Supabase.
    signed_put_limit=48*1024*1024
    if size>signed_put_limit:
        print(json.dumps({"upload_path":"BROKER_TUS_RELAY","bytes":size,"state_code":state},separators=(",",":")))
        broker_tus_upload(output,state)
    else:
        signed=post({"action":"sign_upload","state_code":state})
        try:
            signed_put_upload(output,signed["signed_url"])
        except RuntimeError as e:
            if "413" not in str(e) and "EntityTooLarge" not in str(e):
                raise
            print(json.dumps({"upload_path":"BROKER_TUS_RELAY_AFTER_413","bytes":size,"state_code":state},separators=(",",":")))
            broker_tus_upload(output,state)
    generated=dt.datetime.now(dt.timezone.utc).isoformat()
    receipt=post({
        "action":"finalize","state_code":state,"file_bytes":size,"sha256":digest,
        "segment_rows":seg_count,"connector_rows":con_count,"minzoom":6,"maxzoom":16,
        "generated_at":generated,
        "metadata":{
            **metadata,
            "generator":"felt/tippecanoe",
            "tippecanoe_sha":TIPPECANOE_SHA,
            "layers":["segments","connectors"],
            "source_archive_version":2696,
            "runtime_version":2716,
        }
    })
    print(json.dumps({"runtime_receipt":receipt,"sha256":digest,"bytes":size},separators=(",",":")))

def main():
    p=argparse.ArgumentParser()
    p.add_argument("--state",default="DC")
    p.add_argument("--work-dir",default="transport-runtime-output")
    args=p.parse_args()
    state=args.state.upper()
    work=pathlib.Path(args.work_dir)
    work.mkdir(parents=True,exist_ok=True)
    listing,local=download_sources(state,work)
    expected=listing["summary"]
    output,seg_count,con_count,meta=build_pmtiles(state,local,work,expected)
    meta["source_object_count"]=len(listing["objects"])
    meta["source_bytes"]=int(expected["source_bytes"])
    upload_finalize(state,output,seg_count,con_count,meta)

if __name__=="__main__":
    try:
        main()
    except Exception as e:
        print(f"RUNTIME_BUILD_FAILED: {e}",file=sys.stderr)
        try:
            state="DC"
            if "--state" in sys.argv:
                state=sys.argv[sys.argv.index("--state")+1].upper()
            post({"action":"fail","state_code":state,"error":str(e)})
        except Exception as receipt_error:
            print(f"RUNTIME_FAILURE_RECEIPT_FAILED: {receipt_error}",file=sys.stderr)
        raise
