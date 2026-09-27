#!/usr/bin/env bash
# Build Marble Voyage for the iPad Simulator, then either capture stage stills
# (opt-in) or remind that capture is available.
#
# Usage:
#   ./scripts/build_marble_voyage.sh              # build + reminder only
#   ./scripts/build_marble_voyage.sh --capture     # build, then capture stills
#   VOYAGE_CAPTURE=1 ./scripts/build_marble_voyage.sh
#   ./scripts/build_marble_voyage.sh --device "iPad (A16)"
#   ./scripts/build_marble_voyage.sh --skip-opening-dag
#
# Does not run capture unless --capture or VOYAGE_CAPTURE=1.
# Capture relaunches the app on the chosen simulator — avoid the device
# Evan is actively playtesting, or use a dedicated sim via --device.
# Opening-screen DAG runs before xcodebuild (skip with --skip-opening-dag).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

SCHEME="abbies.world.ios"
PROJECT="$ROOT/abbies.world.ios/abbies.world.ios.xcodeproj"
DERIVED="$ROOT/DerivedData/voyage-capture"
DEVICE_NAME="${VOYAGE_CAPTURE_DEVICE:-iPad (A16)}"
DO_CAPTURE=0
SKIP_OPENING_DAG=0
CAPTURE_ARGS=()

# Env opt-in (same as --capture).
if [[ "${VOYAGE_CAPTURE:-}" == "1" || "${VOYAGE_CAPTURE:-}" == "true" || "${VOYAGE_CAPTURE:-}" == "yes" ]]; then
  DO_CAPTURE=1
fi
if [[ "${VOYAGE_SKIP_OPENING_DAG:-}" == "1" || "${VOYAGE_SKIP_OPENING_DAG:-}" == "true" ]]; then
  SKIP_OPENING_DAG=1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    --capture)
      DO_CAPTURE=1
      shift
      ;;
    --no-capture)
      DO_CAPTURE=0
      shift
      ;;
    --skip-opening-dag)
      SKIP_OPENING_DAG=1
      shift
      ;;
    --device)
      DEVICE_NAME="${2:?}"
      shift 2
      ;;
    --stages|--seed)
      CAPTURE_ARGS+=("$1" "${2:?}")
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

resolve_udid() {
  local name="$1"
  local line
  line="$(xcrun simctl list devices booted | grep -F "$name" | grep -i iPad | head -n 1 || true)"
  if [[ -z "$line" ]]; then
    line="$(xcrun simctl list devices available | grep -F "$name" | grep -i iPad | grep -v unavailable | head -n 1 || true)"
  fi
  [[ -z "$line" ]] && return 1
  echo "$line" | grep -oE '[0-9A-Fa-f]{8}-([0-9A-Fa-f]{4}-){3}[0-9A-Fa-f]{12}' | head -n 1
}

echo "=== Marble Voyage build ==="
echo "device: $DEVICE_NAME"
echo "capture: $([[ "$DO_CAPTURE" -eq 1 ]] && echo yes || echo no — reminder only)"
echo "opening-dag: $([[ "$SKIP_OPENING_DAG" -eq 1 ]] && echo skip || echo yes)"
echo

if [[ "$SKIP_OPENING_DAG" -eq 0 ]]; then
  echo "→ opening-screen DAG"
  python3 "$ROOT/scripts/voyage_opening_screen_dag.py" \
    --json "$ROOT/artifacts/voyage-opening-dag/latest.json"
  echo
fi

UDID="$(resolve_udid "$DEVICE_NAME" || true)"
if [[ -z "${UDID:-}" ]]; then
  echo "No simulator matching '$DEVICE_NAME'. Available iPads:" >&2
  xcrun simctl list devices available | grep -i iPad || true
  exit 1
fi

xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b

echo "→ xcodebuild ($SCHEME)"
xcodebuild \
  -project "$PROJECT" \
  -scheme "$SCHEME" \
  -configuration Debug \
  -destination "platform=iOS Simulator,id=$UDID" \
  -derivedDataPath "$DERIVED" \
  -quiet \
  build

APP_PATH="$(find "$DERIVED/Build/Products" -name 'abbies.world.ios.app' -type d 2>/dev/null | head -n 1 || true)"
echo "BUILD OK — ${APP_PATH:-unknown app path}"

if [[ "$DO_CAPTURE" -eq 1 ]]; then
  echo
  echo "→ voyage capture (reuses this build)"
  # With `set -u`, an empty CAPTURE_ARGS[@] errors — expand safely.
  exec "$ROOT/scripts/capture_marble_voyage.sh" --skip-build --device "$DEVICE_NAME" ${CAPTURE_ARGS[@]+"${CAPTURE_ARGS[@]}"}
fi

"$ROOT/scripts/voyage_capture_reminder.sh"
exit 0
