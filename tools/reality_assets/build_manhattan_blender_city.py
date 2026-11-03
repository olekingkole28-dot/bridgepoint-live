#!/usr/bin/env python3
"""Launcher for the isolated Manhattan Blender city builder.
The full implementation is beside this file as .py.gz; inspect with gzip -dc.
"""
from pathlib import Path
import gzip
payload = Path(__file__).with_name(Path(__file__).name + ".gz")
exec(compile(gzip.decompress(payload.read_bytes()), str(payload), "exec"), globals())
