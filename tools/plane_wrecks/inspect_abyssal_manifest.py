#!/usr/bin/env python3
"""Inspect KWAJ archive entries and rights without downloading its 3 GB ZIP."""
from __future__ import annotations
import json
import re
import struct
import urllib.request
import zipfile
from collections import Counter
from fetch_plane_wrecks import ARCHIVE_URL, HttpRangeReader

req=urllib.request.Request("https://zenodo.org/api/records/21824088",headers={
    "Accept":"application/json","User-Agent":"BridgePoint-Plane-Wrecks/1.0"
})
with urllib.request.urlopen(req,timeout=35) as response:
    record=json.loads(response.read().decode("utf-8"))
meta=record.get("metadata") or {}
print("BRIDGEPOINT_KWAJ_RIGHTS",json.dumps({
    "title":meta.get("title"),
    "license":meta.get("license"),
    "rights":meta.get("rights"),
    "creators":meta.get("creators"),
    "publication_date":meta.get("publication_date")
}))
exts=Counter()
candidates=[]
dirs=set()
with HttpRangeReader(ARCHIVE_URL) as remote:
    with zipfile.ZipFile(remote) as archive:
        infos=archive.infolist()
        print("BRIDGEPOINT_KWAJ_MEMBER_COUNT",len(infos))
        for info in infos:
            name=info.filename
            if not re.search(r"(^|/)KWAJ(/|$)",name,re.I):
                continue
            parts=name.split("/")
            if len(parts)>1: dirs.add("/".join(parts[:2])+"/")
            if info.is_dir(): continue
            suffix=name.lower().rsplit(".",1)[-1] if "." in name else "(none)"
            exts[suffix]+=1
            if re.search(r"\.(glb|gltf|ply|obj|fbx|e57|las|laz|pcd|zip|npz|npy|tar|bin|splat|spz|ksplat|json|csv|txt)$",name,re.I):
                candidates.append({"name":name,"size":info.file_size,"compressed":info.compress_size})
print("BRIDGEPOINT_KWAJ_KWAJ_TOP_LEVEL_DIRS",json.dumps(sorted(dirs)))
print("BRIDGEPOINT_KWAJ_FILE_EXTENSIONS",json.dumps(exts.most_common(40)))
print("BRIDGEPOINT_KWAJ_MESH_CANDIDATES",json.dumps(candidates[:500]))

with HttpRangeReader(ARCHIVE_URL) as remote:
    with zipfile.ZipFile(remote) as archive:
        member="KWAJ/train/sparse/0/points3D.bin"
        info=archive.getinfo(member)
        raw=archive.read(member)
        if len(raw)!=info.file_size or len(raw)<8:
            raise SystemExit("KWAJ COLMAP points3D.bin extraction failed")
        count=struct.unpack_from("<Q",raw,0)[0]
        offset=8
        mins=[float("inf")]*3
        maxs=[float("-inf")]*3
        tracks=0
        colors=0
        samples=[]
        for index in range(count):
            if offset+43>len(raw):
                raise SystemExit("Truncated COLMAP points3D.bin record")
            point_id=struct.unpack_from("<Q",raw,offset)[0];offset+=8
            xyz=struct.unpack_from("<ddd",raw,offset);offset+=24
            rgb=struct.unpack_from("<BBB",raw,offset);offset+=3
            error=struct.unpack_from("<d",raw,offset)[0];offset+=8
            track_len=struct.unpack_from("<Q",raw,offset)[0];offset+=8
            track_bytes=track_len*8
            if offset+track_bytes>len(raw):
                raise SystemExit("Truncated COLMAP point track")
            offset+=track_bytes
            tracks+=track_len
            for axis in range(3):
                mins[axis]=min(mins[axis],xyz[axis]);maxs[axis]=max(maxs[axis],xyz[axis])
            if index<5:
                samples.append({"id":point_id,"xyz":xyz,"rgb":rgb,"error":error,"track":track_len})
        print("BRIDGEPOINT_KWAJ_COLMAP_POINTS",json.dumps({
            "member":member,"bytes":len(raw),"pointCount":count,"meanTrackLength":tracks/max(1,count),
            "bounds":{"min":mins,"max":maxs,"size":[maxs[i]-mins[i] for i in range(3)]},
            "sample":samples,"trailingBytes":len(raw)-offset
        }))
