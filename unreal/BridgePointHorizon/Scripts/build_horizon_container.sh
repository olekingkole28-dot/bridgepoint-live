#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="${HORIZON_REPO_ROOT:-/opt/bridgepoint/bridgepoint-live}"
BUILD_ROOT="${HORIZON_BUILD_ROOT:-/opt/bridgepoint/horizon-builds}"
IMAGE="${HORIZON_UE_IMAGE:-ghcr.io/epicgames/unreal-engine:dev-slim-5.8.0}"
GHCR_USER="${EPIC_GHCR_USER:-}"
GHCR_TOKEN="${EPIC_GHCR_TOKEN:-}"

if [[ -z "$GHCR_USER" || -z "$GHCR_TOKEN" ]]; then
  echo "EPIC_GHCR_USER and EPIC_GHCR_TOKEN are required for Epic's UE5.8 container." >&2
  exit 2
fi

cd "$REPO_ROOT"
TREE_SHA="$(git rev-parse HEAD:unreal/BridgePointHorizon)"
SHORT="${TREE_SHA:0:12}"
WORK_DIR="$BUILD_ROOT/work-$SHORT"
ARCHIVE_DIR="$BUILD_ROOT/$SHORT"

mkdir -p "$BUILD_ROOT"
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR" "$ARCHIVE_DIR"
cp -a "$REPO_ROOT/unreal/BridgePointHorizon/." "$WORK_DIR/"

echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin
docker pull "$IMAGE"

# Epic's official development image runs as a non-root UE user.
chown -R 1000:1000 "$WORK_DIR" "$ARCHIVE_DIR" 2>/dev/null || true

docker run --rm   -v "$WORK_DIR:/project"   -v "$ARCHIVE_DIR:/output"   "$IMAGE"   /home/ue4/UnrealEngine/Engine/Build/BatchFiles/RunUAT.sh   BuildCookRun   -utf8output   -platform=Linux   -clientconfig=Shipping   -serverconfig=Shipping   -project=/project/BridgePointHorizon.uproject   -noP4   -nodebuginfo   -build   -cook   -stage   -package   -pak   -iostore   -archive   -archivedirectory=/output

GAME_BIN="$(find "$ARCHIVE_DIR" -type f -perm -111 | grep -v -E 'CrashReportClient|UnrealPak|ShaderCompileWorker' | head -n 1 || true)"
if [[ -z "$GAME_BIN" ]]; then
  echo "Packaged Horizon Linux executable not found." >&2
  exit 3
fi

SOURCE_SHA="$(git rev-parse HEAD)"
python3 - "$ARCHIVE_DIR/native-build.json" "$GAME_BIN" "$SOURCE_SHA" "$TREE_SHA" <<'PY'
import datetime,json,sys
path,exe,sha,tree=sys.argv[1:]
with open(path,"w",encoding="utf-8") as f:
    json.dump({
        "engine_version":"5.8",
        "configuration":"Shipping",
        "source_sha":sha,
        "source_tree_sha":tree,
        "built_at_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "executable":exe,
        "pixel_streaming_plugin":"PixelStreaming2",
        "platform":"Linux"
    },f,indent=2)
PY

rm -rf "$WORK_DIR"
echo "$ARCHIVE_DIR" > "$BUILD_ROOT/current.txt"
echo "HORIZON_UE58_CONTAINER_PACKAGE_OK"
echo "$ARCHIVE_DIR"
