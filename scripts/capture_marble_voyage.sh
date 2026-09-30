#!/usr/bin/env bash
# Capture Marble Voyage stage stills from the current build (silent / agent-friendly).
#
# Usage:
#   ./scripts/capture_marble_voyage.sh
#   ./scripts/capture_marble_voyage.sh --stages title,chart,fight
#   ./scripts/capture_marble_voyage.sh --seed 42 --skip-build
#   ./scripts/capture_marble_voyage.sh --device "iPad (A16)"
#
# Output:
#   artifacts/voyage-capture/<utc-stamp>/title.png …
#   artifacts/voyage-capture/<utc-stamp>/manifest.json
#
# Requires: Xcode, booted (or bootable) iPad Simulator.
# Override device with VOYAGE_CAPTURE_DEVICE or --device.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BUNDLE_ID="evan-personal.abbies-world-ios"
SCHEME="abbies.world.ios"
PROJECT="$ROOT/abbies.world.ios/abbies.world.ios.xcodeproj"
DERIVED="$ROOT/DerivedData/voyage-capture"
STAGES="title,chart,fight"
SEED="42"
SKIP_BUILD=0
DEVICE_NAME="${VOYAGE_CAPTURE_DEVICE:-iPad (A16)}"
READY_TIMEOUT_SEC=45
POLL_INTERVAL=0.25

while [[ $# -gt 0 ]]; do
  case "$1" in
    --stages)
      STAGES="${2:?}"
      shift 2
      ;;
    --seed)
      SEED="${2:?}"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=1
      shift
      ;;
    --device)
      DEVICE_NAME="${2:?}"
      shift 2
      ;;
    -h|--help)
      sed -n '2,18p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown arg: $1" >&2
      exit 2
      ;;
  esac
done

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
OUT_DIR="$ROOT/artifacts/voyage-capture/$STAMP"
mkdir -p "$OUT_DIR"

echo "=== Marble Voyage capture ==="
echo "stages: $STAGES"
echo "seed:   $SEED"
echo "out:    $OUT_DIR"
echo

resolve_udid() {
  local name="$1"
  # Match by device name, then take the UUID token (names may contain parentheses).
  local line
  line="$(xcrun simctl list devices booted | grep -F "$name" | grep -i iPad | head -n 1 || true)"
  if [[ -z "$line" ]]; then
    line="$(xcrun simctl list devices available | grep -F "$name" | grep -i iPad | grep -v unavailable | head -n 1 || true)"
  fi
  [[ -z "$line" ]] && return 1
  echo "$line" | grep -oE '[0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}' | head -n 1
}

UDID="$(resolve_udid "$DEVICE_NAME" || true)"
if [[ -z "${UDID:-}" ]]; then
  echo "No simulator matching '$DEVICE_NAME'. Available iPads:" >&2
  xcrun simctl list devices available | grep -i iPad || true
  exit 1
fi

echo "simulator: $DEVICE_NAME ($UDID)"
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b

# Quiet status bar for readable stills (cleared on reboot — set after boot).
xcrun simctl status_bar "$UDID" override \
  --time "9:41" \
  --dataNetwork wifi --wifiBars 3 \
  --batteryState charged --batteryLevel 100 \
  >/dev/null 2>&1 || true

APP_PATH=""
if [[ "$SKIP_BUILD" -eq 0 ]]; then
  echo "→ building $SCHEME for simulator"
  xcodebuild \
    -project "$PROJECT" \
    -scheme "$SCHEME" \
    -configuration Debug \
    -destination "platform=iOS Simulator,id=$UDID" \
    -derivedDataPath "$DERIVED" \
    -quiet \
    build
fi

APP_PATH="$(find "$DERIVED/Build/Products" -name 'abbies.world.ios.app' -type d 2>/dev/null | head -n 1 || true)"
if [[ -z "$APP_PATH" ]]; then
  # Fall back to a prior DerivedData build if --skip-build and local cache exists.
  APP_PATH="$(find "$ROOT/DerivedData" -name 'abbies.world.ios.app' -type d 2>/dev/null | head -n 1 || true)"
fi
if [[ -z "$APP_PATH" ]]; then
  echo "Could not find abbies.world.ios.app — run without --skip-build." >&2
  exit 1
fi
echo "app: $APP_PATH"

echo "→ install"
xcrun simctl install "$UDID" "$APP_PATH"

data_container() {
  xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data 2>/dev/null || true
}

wait_ready() {
  local stage="$1"
  local deadline=$((SECONDS + READY_TIMEOUT_SEC))
  local container=""
  while (( SECONDS < deadline )); do
    container="$(data_container)"
    if [[ -n "$container" && -f "$container/Documents/voyage-capture/READY" ]]; then
      # Confirm stage matches (avoid racing a prior launch).
      if grep -q "\"stage\"[[:space:]]*:[[:space:]]*\"$stage\"" "$container/Documents/voyage-capture/READY" 2>/dev/null \
        || grep -q "$stage" "$container/Documents/voyage-capture/READY" 2>/dev/null; then
        echo "$container"
        return 0
      fi
    fi
    sleep "$POLL_INTERVAL"
  done
  return 1
}

IFS=',' read -r -a STAGE_LIST <<< "$STAGES"
CAPTURED=()

for raw in "${STAGE_LIST[@]}"; do
  stage="$(echo "$raw" | tr '[:upper:]' '[:lower:]' | tr -d '[:space:]')"
  [[ -z "$stage" ]] && continue
  echo
  echo "→ capture $stage"

  xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
  # Clear any leftover READY from prior stage.
  if container="$(data_container)"; then
    rm -f "$container/Documents/voyage-capture/READY" 2>/dev/null || true
  fi

  xcrun simctl launch "$UDID" "$BUNDLE_ID" \
    -world2SkipAuth \
    "-voyageCapture=${stage}" \
    "-voyageCaptureSeed=${SEED}"

  if ! container="$(wait_ready "$stage")"; then
    echo "  FAIL: timed out waiting for voyage.capture READY ($stage)" >&2
    # Still try a late screenshot for debugging.
    xcrun simctl io "$UDID" screenshot "$OUT_DIR/${stage}-TIMEOUT.png" || true
    exit 1
  fi

  shot="$OUT_DIR/${stage}.png"
  xcrun simctl io "$UDID" screenshot "$shot"
  echo "  wrote $shot"
  CAPTURED+=("$stage")

  xcrun simctl terminate "$UDID" "$BUNDLE_ID" 2>/dev/null || true
done

GIT_SHA="$(git -C "$ROOT" rev-parse --short HEAD 2>/dev/null || echo unknown)"
MANIFEST="$OUT_DIR/manifest.json"
{
  echo "{"
  echo "  \"stamp\": \"$STAMP\","
  echo "  \"git\": \"$GIT_SHA\","
  echo "  \"seed\": $SEED,"
  echo "  \"simulator\": \"$DEVICE_NAME\","
  echo "  \"udid\": \"$UDID\","
  echo "  \"bundleId\": \"$BUNDLE_ID\","
  echo "  \"stages\": ["
  for i in "${!CAPTURED[@]}"; do
    s="${CAPTURED[$i]}"
    comma=","
    [[ $i -eq $((${#CAPTURED[@]} - 1)) ]] && comma=""
    echo "    {\"stage\": \"$s\", \"file\": \"${s}.png\"}$comma"
  done
  echo "  ]"
  echo "}"
} > "$MANIFEST"

echo
echo "CAPTURE OK — $OUT_DIR"
echo "manifest: $MANIFEST"
ls -la "$OUT_DIR"
