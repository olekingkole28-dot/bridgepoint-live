#!/usr/bin/env bash
set -euo pipefail
DEST="${1:-rebuild-v5000/assets/offline/protomaps-world-z6.pmtiles}"
PMTILES_BIN="${PMTILES_BIN:-pmtiles}"
MAX_ZOOM="${MAX_ZOOM:-6}"
PACK_ID="${PACK_ID:-global-basemap-z6-v1}"
if [[ "$MAX_ZOOM" == "6" ]]; then
  MIN_BYTES="${MIN_BYTES:-20000000}"; MAX_BYTES="${MAX_BYTES:-200000000}"
elif [[ "$MAX_ZOOM" == "7" ]]; then
  MIN_BYTES="${MIN_BYTES:-80000000}"; MAX_BYTES="${MAX_BYTES:-700000000}"
else
  echo "Supported global offline archive max zooms are 6 and 7." >&2; exit 2
fi
mkdir -p "$(dirname "$DEST")"
command -v "$PMTILES_BIN" >/dev/null 2>&1 || { echo "PMTiles CLI not found: $PMTILES_BIN" >&2; exit 2; }
for offset in 0 1 2 3 4 5 6 7; do
  source_date="$(date -u -d "$offset days ago" +%Y%m%d)"
  source_url="https://build.protomaps.com/${source_date}.pmtiles"
  tmp="${DEST}.tmp"; show_file="${DEST}.show.tmp"
  rm -f "$tmp" "$show_file"
  echo "Extracting Protomaps whole-planet basemap at zooms 0–${MAX_ZOOM} from $source_url"
  if ! "$PMTILES_BIN" extract "$source_url" "$tmp" "--maxzoom=$MAX_ZOOM"; then
    echo "Build $source_date unavailable; trying previous daily build." >&2
    rm -f "$tmp"; continue
  fi
  bytes="$(stat -c%s "$tmp")"
  if [ "$bytes" -lt "$MIN_BYTES" ] || [ "$bytes" -gt "$MAX_BYTES" ]; then
    echo "Unexpected archive size: $bytes bytes (required range $MIN_BYTES–$MAX_BYTES for zoom $MAX_ZOOM)." >&2
    rm -f "$tmp"; exit 3
  fi
  "$PMTILES_BIN" show "$tmp" > "$show_file"
  if ! grep -Eiq "max.?zoom[^0-9]*${MAX_ZOOM}([^0-9]|$)" "$show_file"; then
    echo "PMTiles header validation failed: archive does not report max zoom $MAX_ZOOM." >&2
    cat "$show_file" >&2; rm -f "$tmp" "$show_file"; exit 4
  fi
  mv "$tmp" "$DEST"
  sha256="$(sha256sum "$DEST" | cut -d' ' -f1)"
  rm -f "$show_file"
  python3 - "$DEST" "$source_date" "$source_url" "$bytes" "$sha256" "$MAX_ZOOM" "$PACK_ID" <<'PY'
import datetime, json, pathlib, sys
archive, source_date, source_url, byte_count, sha256, max_zoom, pack_id = sys.argv[1:]
p = pathlib.Path(archive)
meta = {
  "schemaVersion": 1, "id": pack_id,
  "title": f"BridgePoint Global Open Basemap — zoom 0–{max_zoom}",
  "archive": p.name, "format": "PMTiles v3 vector tiles",
  "minZoom": 0, "maxZoom": int(max_zoom), "sourceDate": source_date,
  "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
  "sourceUrl": source_url, "sizeBytes": int(byte_count), "sha256": sha256,
  "licence": "OpenStreetMap-derived Produced Work under ODbL; required attribution is included in NOTICE.txt",
  "attribution": "© OpenStreetMap contributors · Protomaps"
}
p.with_suffix(".meta.json").write_text(json.dumps(meta, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"archive": str(p), "sizeBytes": int(byte_count), "sourceDate": source_date, "sha256": sha256, "maxZoom": int(max_zoom)}))
PY
  exit 0
done
echo "Could not prepare a valid global zoom-${MAX_ZOOM} archive from the latest eight daily builds." >&2
exit 5
