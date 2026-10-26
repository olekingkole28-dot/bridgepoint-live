#!/usr/bin/env bash
set -euo pipefail
DEST="${1:-rebuild-v5000/assets/offline/protomaps-world-z6.pmtiles}"
PMTILES_BIN="${PMTILES_BIN:-pmtiles}"
MAX_BYTES="${MAX_BYTES:-200000000}"
MIN_BYTES="${MIN_BYTES:-20000000}"
mkdir -p "$(dirname "$DEST")"
command -v "$PMTILES_BIN" >/dev/null 2>&1 || { echo "PMTiles CLI not found: $PMTILES_BIN" >&2; exit 2; }

for offset in 0 1 2 3 4 5 6 7; do
  source_date="$(date -u -d "$offset days ago" +%Y%m%d)"
  source_url="https://build.protomaps.com/${source_date}.pmtiles"
  tmp="${DEST}.tmp"; show_file="${DEST}.show.tmp"
  rm -f "$tmp" "$show_file"
  echo "Extracting Protomaps world basemap at zooms 0–6 from $source_url"
  if ! "$PMTILES_BIN" extract "$source_url" "$tmp" --maxzoom=6; then
    echo "Build $source_date unavailable; trying previous daily build." >&2
    rm -f "$tmp"
    continue
  fi
  bytes="$(stat -c%s "$tmp")"
  if [ "$bytes" -lt "$MIN_BYTES" ] || [ "$bytes" -gt "$MAX_BYTES" ]; then
    echo "Unexpected archive size: $bytes bytes (required range $MIN_BYTES–$MAX_BYTES)." >&2
    rm -f "$tmp"; exit 3
  fi
  "$PMTILES_BIN" show "$tmp" > "$show_file"
  if ! grep -Eiq 'max.?zoom[^0-9]*6([^0-9]|$)' "$show_file"; then
    echo "PMTiles header validation failed: archive does not report max zoom 6." >&2
    cat "$show_file" >&2; rm -f "$tmp" "$show_file"; exit 4
  fi
  mv "$tmp" "$DEST"
  sha256="$(sha256sum "$DEST" | cut -d' ' -f1)"
  rm -f "$show_file"
  python3 - "$DEST" "$source_date" "$source_url" "$bytes" "$sha256" <<'PY'
import datetime, json, pathlib, sys
archive, source_date, source_url, byte_count, sha256 = sys.argv[1:]
p = pathlib.Path(archive)
meta = {
  "schemaVersion": 1,
  "id": "global-basemap-z6-v1",
  "title": "BridgePoint Global Basemap — zoom 0–6",
  "archive": p.name,
  "format": "PMTiles v3 vector tiles",
  "minZoom": 0,
  "maxZoom": 6,
  "sourceDate": source_date,
  "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
  "sourceUrl": source_url,
  "sizeBytes": int(byte_count),
  "sha256": sha256,
  "licence": "OpenStreetMap-derived Produced Work under ODbL; required attribution is included in NOTICE.txt",
  "attribution": "© OpenStreetMap contributors · Protomaps"
}
p.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"archive": str(p), "sizeBytes": int(byte_count), "sourceDate": source_date, "sha256": sha256}))
PY
  exit 0
done
echo "Could not prepare a valid global zoom-6 archive from the latest eight daily builds." >&2
exit 5
