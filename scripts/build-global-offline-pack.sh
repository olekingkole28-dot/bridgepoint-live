#!/usr/bin/env bash
set -euo pipefail

DEST="${1:-rebuild-v5000/assets/offline/protomaps-world-z6.pmtiles}"
PMTILES_BIN="${PMTILES_BIN:-pmtiles}"
MAX_BYTES="${MAX_BYTES:-157286400}"
MIN_BYTES="${MIN_BYTES:-1048576}"
DEST_DIR="$(dirname "$DEST")"
mkdir -p "$DEST_DIR"

if ! command -v "$PMTILES_BIN" >/dev/null 2>&1; then
  echo "Required PMTiles CLI not found: $PMTILES_BIN" >&2
  exit 2
fi

for offset in 0 1 2 3 4; do
  source_date="$(date -u -d "$offset days ago" +%Y%m%d)"
  source_url="https://build.protomaps.com/${source_date}.pmtiles"
  tmp="${DEST}.tmp"
  show_file="${DEST}.show.tmp"
  rm -f "$tmp" "$show_file"
  echo "Extracting Protomaps global basemap through zoom 6 from $source_url"
  if ! "$PMTILES_BIN" extract "$source_url" "$tmp" --maxzoom=6; then
    echo "Build $source_date unavailable or extraction failed; trying previous daily build." >&2
    rm -f "$tmp"
    continue
  fi

  bytes="$(stat -c%s "$tmp")"
  if [ "$bytes" -lt "$MIN_BYTES" ] || [ "$bytes" -gt "$MAX_BYTES" ]; then
    echo "Unexpected offline package size: $bytes bytes (expected between $MIN_BYTES and $MAX_BYTES)." >&2
    rm -f "$tmp"
    exit 3
  fi
  "$PMTILES_BIN" show "$tmp" > "$show_file"
  if ! grep -Eiq 'max.?zoom[^0-9]*6([^0-9]|$)' "$show_file"; then
    echo "PMTiles header validation failed; archive is not constrained to zoom level 6." >&2
    cat "$show_file" >&2
    rm -f "$tmp" "$show_file"
    exit 4
  fi

  mv "$tmp" "$DEST"
  sha256="$(sha256sum "$DEST" | cut -d' ' -f1)"
  rm -f "$show_file"
  python3 - "$DEST" "$source_date" "$source_url" "$bytes" "$sha256" <<'PY'
import datetime, json, pathlib, sys
archive, source_date, source_url, byte_count, sha256 = sys.argv[1:]
path = pathlib.Path(archive)
meta = {
    "schemaVersion": 1,
    "id": "global-streets-z6-v1",
    "title": "BridgePoint Global Streets, Water and Map Context",
    "archive": path.name,
    "format": "PMTiles v3 vector tiles",
    "minZoom": 0,
    "maxZoom": 6,
    "sourceDate": source_date,
    "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
    "sourceUrl": source_url,
    "bytes": int(byte_count),
    "sha256": sha256,
    "license": "Open Database License Produced Work; OpenStreetMap attribution required",
    "attribution": "© OpenStreetMap contributors · Protomaps"
}
path.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"archive": str(path), "bytes": int(byte_count), "sourceDate": source_date, "sha256": sha256}))
PY
  exit 0
done

echo "Could not prepare a valid global zoom-6 Protomaps archive from the latest five daily builds." >&2
exit 5
