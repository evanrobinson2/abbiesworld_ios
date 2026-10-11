#!/usr/bin/env bash
# Local Midjourney bridge — ChatGPT desktop (same Mac) operates MJ via Chrome.
# Abstract / tunnel / Vercel MJ_WORKER_URL later. This is the household path.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
STUDIO="$ROOT/prototypes/studio-mock"
PORT=8766
BASE="http://127.0.0.1:${PORT}"
PIDFILE="${TMPDIR:-/tmp}/abbies-mj-bridge.pid"
RATEFILE="${TMPDIR:-/tmp}/abbies-mj-bridge.last-fill"
MIN_GAP_SEC="${MJ_BRIDGE_MIN_GAP_SEC:-30}"

usage() {
  cat <<'EOF'
Usage:
  /Users/evanrobinson/abbies.world.ios/scripts/mj_local_bridge.sh start
  /Users/evanrobinson/abbies.world.ios/scripts/mj_local_bridge.sh stop
  /Users/evanrobinson/abbies.world.ios/scripts/mj_local_bridge.sh status
  /Users/evanrobinson/abbies.world.ios/scripts/mj_local_bridge.sh fill "prompt"
  /Users/evanrobinson/abbies.world.ios/scripts/mj_local_bridge.sh wait-fill "prompt"

Always absolute path (large filesystem — do not rely on cwd).
ChatGPT desktop: run wait-fill with the Midjourney prompt. No chat.
Prereqs: Chrome on midjourney.com/imagine + Allow JavaScript from Apple Events.
Contract: /Users/evanrobinson/abbies.world.ios/docs/architecture/MIDJOURNEY_LOCAL_BRIDGE.md
EOF
}

helper_up() {
  curl -sf -o /dev/null --max-time 1 "$BASE/" 2>/dev/null || \
    curl -sf -o /dev/null --max-time 1 "$BASE/review.html" 2>/dev/null
}

cmd_start() {
  if helper_up; then
    echo "ok: already up $BASE"
    return 0
  fi
  if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "error: port $PORT busy but helper not responding" >&2
    return 1
  fi
  cd "$STUDIO"
  nohup python3 server.py >"${TMPDIR:-/tmp}/abbies-mj-bridge.log" 2>&1 &
  echo $! >"$PIDFILE"
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    if helper_up; then
      echo "ok: started $BASE (pid $(cat "$PIDFILE"))"
      return 0
    fi
    sleep 0.2
  done
  echo "error: helper did not come up — see ${TMPDIR:-/tmp}/abbies-mj-bridge.log" >&2
  return 1
}

cmd_stop() {
  if [[ -f "$PIDFILE" ]]; then
    kill "$(cat "$PIDFILE")" 2>/dev/null || true
    rm -f "$PIDFILE"
  fi
  # Only kill listeners that look like our helper cwd
  local pids
  pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
  fi
  echo "ok: stopped"
}

cmd_status() {
  echo "contract: dumb worker — accept prompt, wait-fill, one-line result, do not interview Evan"
  if helper_up; then
    echo "helper: up ($BASE)"
  else
    echo "helper: down"
  fi
  if [[ -f "$RATEFILE" ]]; then
    local last now gap
    last="$(cat "$RATEFILE" 2>/dev/null || echo 0)"
    now="$(date +%s)"
    gap=$((now - last))
    if (( gap < MIN_GAP_SEC )); then
      echo "rate: wait $((MIN_GAP_SEC - gap))s (min gap ${MIN_GAP_SEC}s)"
    else
      echo "rate: ready (last fill ${gap}s ago, min gap ${MIN_GAP_SEC}s)"
    fi
  else
    echo "rate: ready (no prior fill)"
  fi
  echo "chrome: open midjourney.com/imagine + Allow JavaScript from Apple Events"
}

seconds_since_fill() {
  if [[ ! -f "$RATEFILE" ]]; then
    echo 9999
    return
  fi
  local last now
  last="$(cat "$RATEFILE" 2>/dev/null || echo 0)"
  now="$(date +%s)"
  echo $((now - last))
}

cmd_fill() {
  local prompt="${1:-}"
  if [[ -z "$prompt" ]]; then
    echo "error: prompt required" >&2
    return 1
  fi
  cmd_start >/dev/null
  local gap
  gap="$(seconds_since_fill)"
  if (( gap < MIN_GAP_SEC )); then
    echo "error: rate_limited wait_sec=$((MIN_GAP_SEC - gap))" >&2
    return 2
  fi
  local tmp
  tmp="$(mktemp)"
  local code
  code="$(
    curl -sS -o "$tmp" -w "%{http_code}" --max-time 60 \
      -X POST "$BASE/api/midjourney/fill" \
      -H "Content-Type: application/json" \
      -d "$(python3 -c 'import json,sys; print(json.dumps({"prompt":sys.argv[1]}))' "$prompt")"
  )"
  date +%s >"$RATEFILE"
  cat "$tmp"
  echo
  rm -f "$tmp"
  [[ "$code" == "200" ]]
}

cmd_wait_fill() {
  local prompt="${1:-}"
  if [[ -z "$prompt" ]]; then
    echo "error: prompt required" >&2
    return 1
  fi
  local gap
  gap="$(seconds_since_fill)"
  if (( gap < MIN_GAP_SEC )); then
    local wait=$((MIN_GAP_SEC - gap))
    echo "waiting ${wait}s for Midjourney cadence…"
    sleep "$wait"
  fi
  cmd_fill "$prompt"
}

main() {
  local op="${1:-}"
  shift || true
  case "$op" in
    start) cmd_start ;;
    stop) cmd_stop ;;
    status) cmd_status ;;
    fill) cmd_fill "${1:-}" ;;
    wait-fill) cmd_wait_fill "${1:-}" ;;
    -h|--help|help|"") usage ;;
    *)
      echo "unknown: $op" >&2
      usage >&2
      return 1
      ;;
  esac
}

main "$@"
