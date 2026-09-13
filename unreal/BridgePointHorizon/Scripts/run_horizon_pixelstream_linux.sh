#!/usr/bin/env bash
set -euo pipefail

BUILD_ROOT="${HORIZON_BUILD_ROOT:-/opt/bridgepoint/horizon-builds}"
INFRA_ROOT="${HORIZON_PIXEL_INFRA_ROOT:-/opt/bridgepoint/PixelStreamingInfrastructure-UE5.8}"
PUBLIC_URL="${HORIZON_PUBLIC_STREAM_URL:-}"
REGION="${HORIZON_STREAM_REGION:-unknown}"
SUPABASE_SECRET="${SUPABASE_SECRET_KEY:-}"
TURN_USER="${HORIZON_TURN_USER:-BridgePointTurn}"
TURN_PASS="${HORIZON_TURN_PASS:-}"
PLAYER_PORT="${HORIZON_PLAYER_PORT:-8080}"
STREAMER_PORT="${HORIZON_STREAMER_PORT:-8888}"
TURN_PORT="${HORIZON_TURN_PORT:-19303}"
TARGET_FPS="${HORIZON_TARGET_FPS:-60}"

CURRENT_FILE="$BUILD_ROOT/current.txt"
[[ -s "$CURRENT_FILE" ]] || { echo "No current Horizon native build pointer." >&2; exit 2; }
ARCHIVE_DIR="$(cat "$CURRENT_FILE")"
MANIFEST="$ARCHIVE_DIR/native-build.json"
[[ -s "$MANIFEST" ]] || { echo "Native build manifest missing: $MANIFEST" >&2; exit 2; }

readarray -t META < <(python3 - "$MANIFEST" <<'PY'
import json,sys
x=json.load(open(sys.argv[1],encoding="utf-8"))
print(x.get("executable",""))
print(x.get("source_sha","unknown"))
PY
)
GAME_BIN="${META[0]}"
SOURCE_SHA="${META[1]}"
[[ -x "$GAME_BIN" ]] || chmod +x "$GAME_BIN" 2>/dev/null || true
[[ -x "$GAME_BIN" ]] || { echo "Packaged Horizon executable is not runnable: $GAME_BIN" >&2; exit 3; }

command -v nvidia-smi >/dev/null
nvidia-smi >/dev/null

if [[ -z "$TURN_PASS" ]]; then
  TURN_PASS="$(python3 - <<'PY'
import secrets
print(secrets.token_urlsafe(28))
PY
)"
fi

if [[ ! -d "$INFRA_ROOT/.git" ]]; then
  mkdir -p "$(dirname "$INFRA_ROOT")"
  git clone --depth 1 --branch UE5.8 https://github.com/EpicGames/PixelStreamingInfrastructure.git "$INFRA_ROOT"
else
  git -C "$INFRA_ROOT" fetch origin UE5.8 --depth 1
  git -C "$INFRA_ROOT" checkout UE5.8
  git -C "$INFRA_ROOT" reset --hard origin/UE5.8
fi

PUBLIC_IP="$(curl -fsSL --max-time 10 https://api.ipify.org)"
START="$INFRA_ROOT/SignallingWebServer/platform_scripts/bash/start.sh"
chmod +x "$INFRA_ROOT/SignallingWebServer/platform_scripts/bash/"*.sh

mkdir -p "$ARCHIVE_DIR/logs"
SIGNAL_LOG="$ARCHIVE_DIR/logs/signalling.log"
GAME_LOG="$ARCHIVE_DIR/logs/game.log"
PID_FILE="$ARCHIVE_DIR/pixelstream-processes.json"

cleanup() {
  set +e
  if [[ -n "${GAME_PID:-}" ]]; then kill "$GAME_PID" 2>/dev/null; fi
  if [[ -n "${SIGNAL_PID:-}" ]]; then kill "$SIGNAL_PID" 2>/dev/null; fi
  rm -f "$PID_FILE"
  heartbeat offline "UE5.8 Pixel Streaming host stopped."
}
trap cleanup EXIT INT TERM

heartbeat() {
  local status="$1"
  local message="$2"
  [[ -n "$PUBLIC_URL" && -n "$SUPABASE_SECRET" ]] || return 0
  python3 - "$status" "$PUBLIC_URL" "$REGION" "$SOURCE_SHA" "$TARGET_FPS" "$message" > /tmp/horizon-heartbeat.json <<'PY'
import json,sys
status,url,region,sha,fps,message=sys.argv[1:]
print(json.dumps({
  "status":status,
  "enabled":status in ("online","starting","degraded"),
  "player_url":url,
  "region":region,
  "build_sha":sha,
  "fps":float(fps),
  "connected_players":0,
  "message":message
}))
PY
  curl -fsS --max-time 10     -X POST     -H "apikey: $SUPABASE_SECRET"     -H "Content-Type: application/json"     --data-binary @/tmp/horizon-heartbeat.json     "https://xdfsjztwgsbmabshzsjw.supabase.co/functions/v1/bridgepoint-horizon-native-stream-v4248" >/dev/null || true
}

heartbeat starting "Linux GPU host is starting UE5.8 Pixel Streaming 2."

(
  cd "$INFRA_ROOT"
  "$START"     --start-turn     --publicip "$PUBLIC_IP"     --turn "$PUBLIC_IP:$TURN_PORT"     --turn-user "$TURN_USER"     --turn-pass "$TURN_PASS"     --     --streamer_port "$STREAMER_PORT"     --player_port "$PLAYER_PORT"     --max_players 4
) >"$SIGNAL_LOG" 2>&1 &
SIGNAL_PID=$!

sleep 8
kill -0 "$SIGNAL_PID" 2>/dev/null || {
  echo "Pixel Streaming signalling server failed." >&2
  tail -n 100 "$SIGNAL_LOG" >&2 || true
  exit 4
}

"$GAME_BIN"   "-PixelStreamingURL=ws://127.0.0.1:$STREAMER_PORT"   -RenderOffScreen   -ForceRes   -ResX=1920   -ResY=1080   -AudioMixer   -Unattended   -NoSplash >"$GAME_LOG" 2>&1 &
GAME_PID=$!

python3 - "$PID_FILE" "$$" "$GAME_PID" "$SIGNAL_PID" <<'PY'
import datetime,json,sys
path,supervisor,game,signal=sys.argv[1:]
json.dump({
  "supervisor_pid":int(supervisor),
  "game_pid":int(game),
  "signalling_pid":int(signal),
  "started_at_utc":datetime.datetime.now(datetime.timezone.utc).isoformat()
},open(path,"w",encoding="utf-8"),indent=2)
PY

sleep 8
kill -0 "$GAME_PID" 2>/dev/null || {
  heartbeat error "UE5.8 process exited during startup."
  tail -n 100 "$GAME_LOG" >&2 || true
  exit 5
}

heartbeat online "BridgePoint Horizon UE5.8 Linux Pixel Streaming 2 is online."
echo "HORIZON_LINUX_PIXEL_STREAMING_ONLINE"
echo "Player URL: $PUBLIC_URL"
echo "GPU public IP: $PUBLIC_IP"

while kill -0 "$GAME_PID" 2>/dev/null && kill -0 "$SIGNAL_PID" 2>/dev/null; do
  heartbeat online "BridgePoint Horizon UE5.8 Linux Pixel Streaming 2 is online."
  sleep 15
done

heartbeat error "Horizon native process or signalling server exited unexpectedly."
exit 6
