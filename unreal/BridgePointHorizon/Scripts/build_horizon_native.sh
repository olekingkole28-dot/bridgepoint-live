#!/usr/bin/env bash
set -euo pipefail

UE_ROOT="${UE_ROOT:-}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
PROJECT="$REPO_ROOT/unreal/BridgePointHorizon/BridgePointHorizon.uproject"
ARCHIVE_DIR="${1:-$REPO_ROOT/artifacts/horizon-native/linux-current}"

if [[ -z "$UE_ROOT" ]]; then
  echo "UE_ROOT is required and must point to Unreal Engine 5.8." >&2
  exit 2
fi

RUN_UAT="$UE_ROOT/Engine/Build/BatchFiles/RunUAT.sh"
[[ -x "$RUN_UAT" ]] || { echo "RunUAT.sh not found: $RUN_UAT" >&2; exit 2; }

mkdir -p "$ARCHIVE_DIR"

"$RUN_UAT" BuildCookRun   "-project=$PROJECT"   -noP4   -platform=Linux   -clientconfig=Shipping   -build -cook -stage -package -pak -iostore -archive   "-archivedirectory=$ARCHIVE_DIR"   -utf8output

GAME_BIN="$(find "$ARCHIVE_DIR" -type f -perm -111 | grep -v -E 'CrashReportClient|UnrealPak' | head -n 1 || true)"
[[ -n "$GAME_BIN" ]] || { echo "Packaged Horizon Linux executable not found." >&2; exit 3; }

SOURCE_SHA="$(git -C "$REPO_ROOT" rev-parse HEAD 2>/dev/null || echo unknown)"
python3 - "$ARCHIVE_DIR/native-build.json" "$GAME_BIN" "$SOURCE_SHA" <<'PY'
import json,sys,datetime
path,exe,sha=sys.argv[1:]
with open(path,"w",encoding="utf-8") as f:
    json.dump({
        "engine_version":"5.8",
        "configuration":"Shipping",
        "source_sha":sha,
        "built_at_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "executable":exe,
        "pixel_streaming_plugin":"PixelStreaming2"
    },f,indent=2)
PY

echo "HORIZON_UE58_LINUX_PACKAGE_OK"
echo "$GAME_BIN"
