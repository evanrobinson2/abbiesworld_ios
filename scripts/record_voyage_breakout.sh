#!/usr/bin/env bash
# Record the real iPad fight-breakout animation (march → curtain → versus → board).
#
# Usage:
#   ./scripts/record_voyage_breakout.sh
#   ./scripts/record_voyage_breakout.sh --skip-build
#
# Output: artifacts/voyage-breakout/<utc-stamp>/breakout.mp4 (+ frame stills)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUNDLE_ID="evan-personal.abbies-world-ios"
UDID="${VOYAGE_CAPTURE_UDID:-2F26AF55-6344-4577-B608-00C838759491}"
DERIVED="${VOYAGE_DERIVED:-$ROOT/.build-sim}"
SKIP_BUILD=0
SEED="${VOYAGE_CAPTURE_SEED:-42}"
RECORD_SEC="${VOYAGE_BREAKOUT_SECONDS:-12}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-build) SKIP_BUILD=1; shift ;;
    --seconds) RECORD_SEC="${2:?}"; shift 2 ;;
    --seed) SEED="${2:?}"; shift 2 ;;
    *) echo "Unknown arg: $1" >&2; exit 2 ;;
  esac
done

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="$ROOT/artifacts/voyage-breakout/$STAMP"
mkdir -p "$OUT_DIR"
MOV="$OUT_DIR/breakout.mov"
MP4="$OUT_DIR/breakout.mp4"

echo "=== Record voyage fight breakout ==="
echo "out: $OUT_DIR"
echo "seconds: $RECORD_SEC"

xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b
open -a Simulator

if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "→ build"
  xcodebuild \
    -project "$ROOT/abbies.world.ios/abbies.world.ios.xcodeproj" \
    -scheme abbies.world.ios \
    -configuration Debug \
    -destination "platform=iOS Simulator,id=$UDID" \
    -derivedDataPath "$DERIVED" \
    -quiet \
    build
fi

APP="$(find "$DERIVED/Build/Products" -name 'abbies.world.ios.app' -type d 2>/dev/null | head -n 1)"
[[ -n "$APP" ]] || { echo "missing app at $DERIVED" >&2; exit 1; }
xcrun simctl install "$UDID" "$APP"
xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true

# Landscape so the chart + versus read like play.
xcrun simctl status_bar "$UDID" override \
  --time "9:41" --dataNetwork wifi --wifiBars 3 \
  --batteryState charged --batteryLevel 100 >/dev/null 2>&1 || true

rm -f "$MOV"
echo "→ start recording"
# recordVideo blocks until SIGINT — run in background, kill after RECORD_SEC.
xcrun simctl io "$UDID" recordVideo --codec=h264 --force "$MOV" >"$OUT_DIR/record.log" 2>&1 &
REC_PID=$!

# Wait until simctl reports recording started (or 3s).
for _ in $(seq 1 30); do
  if grep -q "Recording started" "$OUT_DIR/record.log" 2>/dev/null; then
    break
  fi
  sleep 0.1
done
sleep 0.4

echo "→ launch chart + auto breakout"
xcrun simctl launch "$UDID" "$BUNDLE_ID" \
  -world2SkipAuth \
  -voyageCapture=chart \
  "-voyageCaptureSeed=${SEED}" \
  -voyageAutoBreakout

sleep "$RECORD_SEC"

echo "→ stop recording"
kill -INT "$REC_PID" 2>/dev/null || true
wait "$REC_PID" 2>/dev/null || true

# Finalize can lag a moment.
sleep 1

if [[ ! -f "$MOV" ]]; then
  echo "FAIL: no movie at $MOV" >&2
  cat "$OUT_DIR/record.log" >&2 || true
  exit 1
fi

echo "→ transcode + frame strip"
ffmpeg -y -i "$MOV" -c:v libx264 -pix_fmt yuv420p -an "$MP4" >/dev/null 2>&1
# Stills at key expected beats (seconds into the clip).
ffmpeg -y -i "$MP4" -vf "fps=1,scale=960:-1" "$OUT_DIR/frame-%02d.png" >/dev/null 2>&1
# Also grab named beats near march / curtain / versus / board.
ffmpeg -y -ss 2.0 -i "$MP4" -frames:v 1 "$OUT_DIR/beat-march.png" >/dev/null 2>&1 || true
ffmpeg -y -ss 3.5 -i "$MP4" -frames:v 1 "$OUT_DIR/beat-curtain.png" >/dev/null 2>&1 || true
ffmpeg -y -ss 5.0 -i "$MP4" -frames:v 1 "$OUT_DIR/beat-versus.png" >/dev/null 2>&1 || true
ffmpeg -y -ss 7.5 -i "$MP4" -frames:v 1 "$OUT_DIR/beat-board.png" >/dev/null 2>&1 || true

ls -la "$OUT_DIR"
echo
echo "VIDEO: $MP4"
echo "Open with: open \"$MP4\""
