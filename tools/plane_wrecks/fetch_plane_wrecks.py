#!/usr/bin/env python3
"""Inspect and extract the CC BY 4.0 KWAJ F4U-1 Corsair scan from the Abyssal archive.\n\nCI probe revision 2: exercise the byte-range ZIP central-directory reader.

The source ZIP is approximately 3 GB. ZipFile is backed by HTTP Range requests so
the CI job reads only the central directory and the selected mesh member, never
the complete archive.
"""
from __future__ import annotations
import argparse
import io
import json
import re
import urllib.request
import zipfile
from pathlib import Path

RECORD_ID = "21824088"
ARCHIVE_URL = f"https://zenodo.org/api/records/{RECORD_ID}/files/Abyssal.zip/content"
MAX_MEMBER_BYTES = 512 * 1024 * 1024

def fetch_range(url: str, start: int, end: int) -> tuple[bytes, int]:
    req = urllib.request.Request(url, headers={
        "User-Agent": "BridgePoint-Plane-Wrecks/1.0",
        "Range": f"bytes={start}-{end}",
        "Accept-Encoding": "identity",
    })
    with urllib.request.urlopen(req, timeout=180) as response:
        if response.status != 206:
            raise SystemExit(f"Range request not honored (HTTP {response.status}); refusing 3 GB download")
        match = re.fullmatch(r"bytes (\d+)-(\d+)/(\d+)", response.headers.get("Content-Range", ""))
        if not match:
            raise SystemExit("Zenodo returned an invalid Content-Range header")
        actual_start, actual_end, total = map(int, match.groups())
        if actual_start != start or actual_end < end or actual_end >= total:
            raise SystemExit(f"Unexpected range: {response.headers.get('Content-Range')}")
        data = response.read(end - start + 2)
    if len(data) != end - start + 1:
        raise SystemExit(f"Short range response: wanted {end-start+1}, got {len(data)}")
    return data, total

class HttpRangeReader(io.RawIOBase):
    """Seekable ZIP reader using 1 MiB HTTP byte ranges."""
    def __init__(self, url: str, block_size: int = 1024 * 1024):
        self.url, self.block_size = url, block_size
        self.position, self.cache_start, self.cache_data = 0, -1, b""
        _, self.total_size = fetch_range(url, 0, 0)
    def readable(self): return True
    def seekable(self): return True
    def tell(self): return self.position
    def seek(self, offset, whence=io.SEEK_SET):
        new = offset if whence == io.SEEK_SET else self.position + offset if whence == io.SEEK_CUR else self.total_size + offset
        if new < 0: raise ValueError("negative seek")
        self.position = new
        return new
    def read(self, size=-1):
        if size is None or size < 0: size = self.total_size - self.position
        size = min(size, self.total_size - self.position)
        if size <= 0: return b""
        parts, remaining = [], size
        while remaining:
            if not (self.cache_start <= self.position < self.cache_start + len(self.cache_data)):
                start = (self.position // self.block_size) * self.block_size
                end = min(self.total_size, start + self.block_size) - 1
                self.cache_data, _ = fetch_range(self.url, start, end)
                self.cache_start = start
            offset = self.position - self.cache_start
            count = min(remaining, len(self.cache_data) - offset)
            if count <= 0: break
            parts.append(self.cache_data[offset:offset+count])
            self.position += count
            remaining -= count
        return b"".join(parts)

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--inspect-only", action="store_true")
    parser.add_argument("--output", type=Path, default=Path("assets/plane-wrecks"))
    args = parser.parse_args()
    with HttpRangeReader(ARCHIVE_URL) as remote:
        with zipfile.ZipFile(remote) as archive:
            candidates = []
            for info in archive.infolist():
                name = info.filename
                if re.search(r"(KWAJ|corsair|f4u)", name, re.I) and re.search(r"\.(glb|gltf|ply|obj|fbx|e57|las|laz|zip)$", name, re.I):
                    candidates.append({"name": name, "size": info.file_size, "compressed": info.compress_size})
            if not candidates:
                raise SystemExit("No KWAJ/Corsair model or point-cloud files found in the dataset ZIP")
            print("BRIDGEPOINT_KWAJ_ARCHIVE_CANDIDATES", json.dumps(candidates))
            if args.inspect_only:
                return
            # Prefer a cleaned ready-to-render mesh over imagery or raw capture material.
            ranked = sorted(candidates, key=lambda x: (
                0 if re.search(r"clean|mesh|model|textured", x["name"], re.I) else 1,
                0 if x["name"].lower().endswith((".glb", ".gltf")) else 1,
                x["size"],
            ))
            selected = next((x for x in ranked if x["size"] > 0 and x["size"] <= MAX_MEMBER_BYTES), None)
            if not selected:
                raise SystemExit("No candidate mesh file is within the 512 MiB extraction limit")
            raw = archive.read(selected["name"])
            if len(raw) != selected["size"]:
                raise SystemExit("Extracted mesh size mismatch")
            args.output.mkdir(parents=True, exist_ok=True)
            target = args.output / Path(selected["name"]).name
            target.write_bytes(raw)
            print("BRIDGEPOINT_KWAJ_MESH_EXTRACTED", selected["name"], len(raw), target)

if __name__ == "__main__":
    main()
