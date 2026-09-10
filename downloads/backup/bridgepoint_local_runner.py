#!/usr/bin/env python3
"""BridgePoint Local Runner

Free, offline/local-first runtime for owner-exported BridgePoint state bundles.
Uses only Python's standard library and binds to 127.0.0.1 by default.
It does not replace the production cloud app, PostGIS, billing, auth, or live ingest.
It provides a durable way to search/query exported state intelligence locally.
"""
from __future__ import annotations

import argparse
import csv
import hashlib
import html
import json
import os
import sqlite3
import sys
import threading
import time
import urllib.parse
import webbrowser
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

APP_VERSION = "680"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765
IMPORT_TABLES = (
    "properties",
    "opportunities",
    "signals",
    "patterns",
    "scores",
    "sources",
    "source_candidates",
    "media_references",
    "state_progress",
    "parity_requirements",
)


def _safe_identifier(value: str) -> str:
    value = "".join(ch if ch.isalnum() or ch == "_" else "_" for ch in value)
    if not value or value[0].isdigit():
        value = "t_" + value
    return value


def _bundle_root(path: str) -> Path:
    p = Path(path).expanduser().resolve()
    if p.is_file():
        p = p.parent
    if (p / "csv").is_dir():
        return p
    if p.name.lower() == "csv" and p.is_dir():
        return p.parent
    raise SystemExit(f"State bundle not found at {p}. Expected a folder containing csv/.")


def _manifest(root: Path) -> dict:
    p = root / "manifest.json"
    if not p.exists():
        return {"state_code": root.name, "format_version": 1, "warning": "manifest.json missing"}
    try:
        return json.loads(p.read_text(encoding="utf-8-sig"))
    except Exception as exc:
        return {"state_code": root.name, "warning": f"Manifest unreadable: {exc}"}


def _verify_checksums(root: Path) -> tuple[int, list[str]]:
    checks = root / "SHA256SUMS.txt"
    if not checks.exists():
        return 0, ["SHA256SUMS.txt missing; integrity could not be verified."]
    verified = 0
    failures: list[str] = []
    for line in checks.read_text(encoding="ascii", errors="ignore").splitlines():
        line = line.strip()
        if not line or "  " not in line:
            continue
        expected, rel = line.split("  ", 1)
        file_path = root / rel
        if not file_path.exists():
            failures.append(f"Missing: {rel}")
            continue
        digest = hashlib.sha256()
        with file_path.open("rb") as fh:
            for chunk in iter(lambda: fh.read(1024 * 1024), b""):
                digest.update(chunk)
        if digest.hexdigest().lower() != expected.lower():
            failures.append(f"Checksum mismatch: {rel}")
        else:
            verified += 1
    return verified, failures


def _csv_signature(csv_dir: Path) -> str:
    parts = []
    for table in IMPORT_TABLES:
        p = csv_dir / f"{table}.csv"
        if p.exists():
            stat = p.stat()
            parts.append(f"{p.name}:{stat.st_size}:{stat.st_mtime_ns}")
    return hashlib.sha256("|".join(parts).encode()).hexdigest()


def _create_db(root: Path, rebuild: bool = False) -> Path:
    csv_dir = root / "csv"
    db_path = root / "bridgepoint_local.sqlite"
    sig = _csv_signature(csv_dir)
    if db_path.exists() and not rebuild:
        try:
            with sqlite3.connect(db_path) as con:
                old = con.execute("select value from bp_meta where key='csv_signature'").fetchone()
                if old and old[0] == sig:
                    return db_path
        except sqlite3.Error:
            pass

    tmp = db_path.with_suffix(".sqlite.tmp")
    if tmp.exists():
        tmp.unlink()
    con = sqlite3.connect(tmp)
    try:
        con.execute("pragma journal_mode=WAL")
        con.execute("pragma synchronous=NORMAL")
        con.execute("pragma temp_store=MEMORY")
        con.execute("create table bp_meta(key text primary key,value text not null)")
        con.execute("insert into bp_meta values('csv_signature',?)", (sig,))
        con.execute("insert into bp_meta values('app_version',?)", (APP_VERSION,))

        for table in IMPORT_TABLES:
            source = csv_dir / f"{table}.csv"
            if not source.exists():
                continue
            with source.open("r", encoding="utf-8-sig", newline="") as fh:
                reader = csv.reader(fh)
                try:
                    headers = next(reader)
                except StopIteration:
                    continue
                headers = [h.strip() or f"column_{i+1}" for i, h in enumerate(headers)]
                safe_headers = []
                used = set()
                for i, h in enumerate(headers):
                    base = _safe_identifier(h)
                    name = base
                    n = 2
                    while name.lower() in used:
                        name = f"{base}_{n}"
                        n += 1
                    used.add(name.lower())
                    safe_headers.append(name)
                t = _safe_identifier(table)
                cols = ",".join(f'"{c}" text' for c in safe_headers)
                con.execute(f'create table "{t}" ({cols})')
                placeholders = ",".join("?" for _ in safe_headers)
                insert_sql = f'insert into "{t}" values ({placeholders})'
                batch = []
                for row in reader:
                    if len(row) < len(safe_headers):
                        row += [""] * (len(safe_headers) - len(row))
                    elif len(row) > len(safe_headers):
                        row = row[: len(safe_headers)]
                    batch.append(row)
                    if len(batch) >= 5000:
                        con.executemany(insert_sql, batch)
                        batch.clear()
                if batch:
                    con.executemany(insert_sql, batch)
                con.commit()

        tables = {r[0] for r in con.execute("select name from sqlite_master where type='table'")}
        if "properties" in tables:
            columns = {r[1] for r in con.execute("pragma table_info(properties)")}
            for col in ("property_id", "municipality", "county", "postal_code", "full_address"):
                if col in columns:
                    try:
                        con.execute(f'create index if not exists "idx_properties_{col}" on properties("{col}")')
                    except sqlite3.Error:
                        pass
        if "opportunities" in tables:
            columns = {r[1] for r in con.execute("pragma table_info(opportunities)")}
            for col in ("property_id", "opportunity_score", "priority", "status"):
                if col in columns:
                    try:
                        con.execute(f'create index if not exists "idx_opportunities_{col}" on opportunities("{col}")')
                    except sqlite3.Error:
                        pass
        con.commit()
    finally:
        con.close()
    os.replace(tmp, db_path)
    return db_path


def _columns(con: sqlite3.Connection, table: str) -> list[str]:
    return [r[1] for r in con.execute(f'pragma table_info("{table}")')]


def _table_exists(con: sqlite3.Connection, table: str) -> bool:
    return con.execute("select 1 from sqlite_master where type='table' and name=?", (table,)).fetchone() is not None


def _dict_rows(cur: sqlite3.Cursor) -> list[dict]:
    names = [d[0] for d in cur.description or []]
    return [dict(zip(names, row)) for row in cur.fetchall()]


def _summary(db: Path, manifest: dict) -> dict:
    out = {"version": APP_VERSION, "state": manifest.get("state_code"), "manifest": manifest, "counts": {}}
    with sqlite3.connect(db) as con:
        for table in IMPORT_TABLES:
            if _table_exists(con, table):
                out["counts"][table] = con.execute(f'select count(*) from "{table}"').fetchone()[0]
    return out


INDEX_HTML = r'''<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>BridgePoint Local</title><style>:root{color-scheme:dark}*{box-sizing:border-box}body{margin:0;background:#06101c;color:#f4f8fc;font:14px/1.45 system-ui,sans-serif}.wrap{max-width:1200px;margin:auto;padding:20px}.top,.card{background:#0d1b2c;border:1px solid #29445e;border-radius:16px;padding:16px;margin-bottom:12px}h1{margin:0 0 5px;font-size:clamp(1.8rem,5vw,3rem)}.muted{color:#9eb3c7}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}.metric{padding:12px;background:#0a1726;border-radius:11px}.metric b{font-size:1.4rem;display:block}input,button{padding:11px;border-radius:9px;border:1px solid #35536f;background:#081725;color:#fff}button{cursor:pointer;font-weight:800}.row{display:flex;gap:8px;flex-wrap:wrap}.row input{flex:1;min-width:220px}table{width:100%;border-collapse:collapse;margin-top:10px}th,td{text-align:left;padding:8px;border-bottom:1px solid #20364b;font-size:.77rem;vertical-align:top}th{color:#9eb3c7;position:sticky;top:0;background:#0d1b2c}.scroll{max-height:55vh;overflow:auto}.good{color:#68e1a6}.warn{color:#ffca5e}@media(max-width:700px){.grid{grid-template-columns:1fr 1fr}}</style></head><body><main class="wrap"><section class="top"><div class="muted">LOCAL-FIRST · OFFLINE STATE BUNDLE</div><h1>BridgePoint Local</h1><div id="state" class="muted">Loading…</div><p class="muted">Private local viewer. This server is bound to your own computer only. Live ingest, cloud billing, PostGIS and account services are intentionally not reproduced here.</p></section><section class="card"><div class="grid" id="metrics"></div></section><section class="card"><h2>Property search</h2><div class="row"><input id="q" placeholder="Address, municipality, county, ZIP, parcel or property ID"><button onclick="searchProperties()">Search</button></div><div class="scroll"><table id="properties"></table></div></section><section class="card"><h2>Top exported opportunities</h2><button onclick="loadOpps()">Refresh opportunities</button><div class="scroll"><table id="opps"></table></div></section><script>const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));function table(id,rows){const el=document.getElementById(id);if(!rows.length){el.innerHTML='<tr><td class="muted">No rows.</td></tr>';return}const keys=Object.keys(rows[0]);el.innerHTML='<thead><tr>'+keys.map(k=>'<th>'+esc(k)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+keys.map(k=>'<td>'+esc(r[k])+'</td>').join('')+'</tr>').join('')+'</tbody>'}async function j(u){const r=await fetch(u);const x=await r.json();if(!r.ok)throw Error(x.error||r.status);return x}async function boot(){const s=await j('/api/summary');document.getElementById('state').textContent=(s.state||'STATE')+' · local bundle · runtime v'+s.version;document.getElementById('metrics').innerHTML=Object.entries(s.counts||{}).map(([k,v])=>'<div class="metric"><span class="muted">'+esc(k)+'</span><b>'+Number(v).toLocaleString()+'</b></div>').join('');loadOpps()}async function searchProperties(){const q=document.getElementById('q').value.trim();table('properties',(await j('/api/properties?q='+encodeURIComponent(q))).rows||[])}async function loadOpps(){table('opps',(await j('/api/opportunities?limit=100')).rows||[])}document.getElementById('q').addEventListener('keydown',e=>{if(e.key==='Enter')searchProperties()});boot().catch(e=>document.getElementById('state').innerHTML='<span class="warn">'+esc(e.message)+'</span>');</script></main></body></html>'''


class LocalHandler(BaseHTTPRequestHandler):
    server_version = "BridgePointLocal/680"

    def log_message(self, fmt: str, *args) -> None:
        sys.stdout.write("[local] " + (fmt % args) + "\n")

    def _json(self, payload: object, status: int = 200) -> None:
        data = json.dumps(payload, ensure_ascii=False, default=str).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(data)

    def _html(self, body: str) -> None:
        data = body.encode("utf-8")
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Security-Policy", "default-src 'self'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:;")
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self) -> None:
        parsed = urllib.parse.urlparse(self.path)
        qs = urllib.parse.parse_qs(parsed.query)
        if parsed.path in ("/", "/index.html"):
            return self._html(INDEX_HTML)
        try:
            if parsed.path == "/api/summary":
                return self._json(self.server.bp_summary)  # type: ignore[attr-defined]
            if parsed.path == "/api/integrity":
                return self._json(self.server.bp_integrity)  # type: ignore[attr-defined]
            if parsed.path == "/api/properties":
                q = (qs.get("q") or [""])[0].strip()
                return self._json({"rows": self._properties(q)})
            if parsed.path == "/api/opportunities":
                raw = (qs.get("limit") or ["100"])[0]
                try:
                    limit = max(1, min(int(raw), 500))
                except ValueError:
                    limit = 100
                return self._json({"rows": self._opportunities(limit)})
            return self._json({"error": "Not found"}, 404)
        except Exception as exc:
            return self._json({"error": str(exc)}, 500)

    @property
    def db(self) -> Path:
        return self.server.bp_db  # type: ignore[attr-defined]

    def _properties(self, q: str) -> list[dict]:
        with sqlite3.connect(self.db) as con:
            if not _table_exists(con, "properties"):
                return []
            cols = _columns(con, "properties")
            preferred = [c for c in ("property_id", "full_address", "municipality", "county", "state_code", "postal_code", "parcel_number", "property_type", "year_built", "current_owner_name", "market_total_value", "canonical_confidence", "latitude", "longitude") if c in cols]
            if not preferred:
                preferred = cols[:14]
            select = ",".join(f'"{c}"' for c in preferred)
            if not q:
                cur = con.execute(f"select {select} from properties limit 100")
                return _dict_rows(cur)
            search_cols = [c for c in ("full_address", "normalized_address", "municipality", "county", "postal_code", "parcel_number", "property_id", "current_owner_name") if c in cols]
            if not search_cols:
                return []
            where = " or ".join(f'lower(coalesce("{c}",\'\')) like ?' for c in search_cols)
            needle = f"%{q.lower()}%"
            cur = con.execute(f"select {select} from properties where {where} limit 200", [needle] * len(search_cols))
            return _dict_rows(cur)

    def _opportunities(self, limit: int) -> list[dict]:
        with sqlite3.connect(self.db) as con:
            if not _table_exists(con, "opportunities"):
                return []
            cols = _columns(con, "opportunities")
            preferred = [c for c in ("property_id", "opportunity_type", "opportunity_name", "priority", "status", "opportunity_score", "confidence", "reason", "why_now", "detected_at", "updated_at") if c in cols]
            if not preferred:
                preferred = cols[:14]
            select = ",".join(f'"{c}"' for c in preferred)
            order = ""
            for score in ("opportunity_score", "score", "priority_score"):
                if score in cols:
                    order = f' order by cast(nullif("{score}",\'\') as real) desc'
                    break
            cur = con.execute(f"select {select} from opportunities{order} limit ?", (limit,))
            return _dict_rows(cur)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run BridgePoint locally from an exported state bundle.")
    parser.add_argument("bundle", nargs="?", default=".", help="Path to BridgePoint state export folder")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument("--port", type=int, default=DEFAULT_PORT)
    parser.add_argument("--rebuild", action="store_true", help="Rebuild local SQLite cache")
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    if args.host not in ("127.0.0.1", "localhost", "::1"):
        raise SystemExit("For safety BridgePoint Local only binds to localhost. Use 127.0.0.1.")

    root = _bundle_root(args.bundle)
    manifest = _manifest(root)
    print(f"BridgePoint Local v{APP_VERSION}")
    print(f"Bundle: {root}")
    verified, failures = _verify_checksums(root)
    if failures:
        print("Integrity warnings:")
        for item in failures[:20]:
            print(" -", item)
    else:
        print(f"Integrity: {verified} file checksums verified")
    print("Building/verifying local SQLite cache. First run can take time for a large state…")
    db = _create_db(root, rebuild=args.rebuild)
    summary = _summary(db, manifest)
    server = ThreadingHTTPServer((args.host, args.port), LocalHandler)
    server.bp_db = db  # type: ignore[attr-defined]
    server.bp_summary = summary  # type: ignore[attr-defined]
    server.bp_integrity = {"verified_files": verified, "failures": failures}  # type: ignore[attr-defined]
    url = f"http://127.0.0.1:{args.port}/"
    print(f"Local-only BridgePoint viewer: {url}")
    print("Press Ctrl+C to stop. No internet connection is required for local queries.")
    if not args.no_browser:
        threading.Timer(0.6, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping BridgePoint Local.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
