#!/usr/bin/env bash
# Local execution-capacity — VPN-style always-on worker + menu bar.
# Absolute paths only.
set -euo pipefail

ROOT="/Users/evanrobinson/abbies.world.ios/prototypes/execution-capacity"
APP="$ROOT/app.py"
PY="$ROOT/.venv/bin/python"
PORT="${EXECUTION_CAPACITY_PORT:-8780}"
BASE="http://127.0.0.1:${PORT}"
PIDFILE="${TMPDIR:-/tmp}/abbies-execution-capacity.pid"
LOG="${TMPDIR:-/tmp}/abbies-execution-capacity.log"
TOKEN_FILE="${HOME}/.abbies_world_token"
PLIST_SRC="$ROOT/launchd/world.abbies.execution-capacity.plist"
PLIST_DST="${HOME}/Library/LaunchAgents/world.abbies.execution-capacity.plist"
LABEL="world.abbies.execution-capacity"

usage() {
  cat <<EOF
Usage:
  /Users/evanrobinson/abbies.world.ios/scripts/execution_capacity.sh start
  /Users/evanrobinson/abbies.world.ios/scripts/execution_capacity.sh stop
  /Users/evanrobinson/abbies.world.ios/scripts/execution_capacity.sh status
  /Users/evanrobinson/abbies.world.ios/scripts/execution_capacity.sh submit "PROMPT" [job-id]
  /Users/evanrobinson/abbies.world.ios/scripts/execution_capacity.sh open
  /Users/evanrobinson/abbies.world.ios/scripts/execution_capacity.sh install-login   # always-on like VPN
  /Users/evanrobinson/abbies.world.ios/scripts/execution_capacity.sh uninstall-login

Menu bar: Midjourney sailboat (… working · × paused · ! restarting)
Auth: ~/.abbies_world_token
Doc:  /Users/evanrobinson/abbies.world.ios/docs/architecture/EXECUTION_CAPACITY.md
EOF
}

up() {
  curl -sf -o /dev/null --max-time 1 "${BASE}/health"
}

token() {
  if [[ -n "${EXECUTION_CAPACITY_TOKEN:-}" ]]; then
    printf '%s' "$EXECUTION_CAPACITY_TOKEN"
    return
  fi
  if [[ -f "$TOKEN_FILE" ]]; then
    head -n 1 "$TOKEN_FILE" | tr -d '\r\n'
    return
  fi
  if [[ -n "${ABBIES_WORLD_TOKEN:-}" ]]; then
    printf '%s' "$ABBIES_WORLD_TOKEN"
    return
  fi
  echo ""
}

ensure_venv() {
  if [[ ! -x "$PY" ]]; then
    echo "error: missing venv at $ROOT/.venv — run: python3 -m venv $ROOT/.venv && $ROOT/.venv/bin/pip install rumps" >&2
    return 1
  fi
}

cmd_start() {
  ensure_venv
  if up; then
    echo "ok: already up ${BASE}"
    return 0
  fi
  if lsof -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    echo "error: port ${PORT} busy — refuse to pick another port" >&2
    return 1
  fi
  if [[ -z "$(token)" ]]; then
    echo "error: missing household token at ${TOKEN_FILE}" >&2
    return 1
  fi
  TOKEN="$(token)"
  EXECUTION_CAPACITY_TOKEN="$TOKEN" \
  EXECUTION_CAPACITY_TRAY="${EXECUTION_CAPACITY_TRAY:-1}" \
  EXECUTION_CAPACITY_OPEN="${EXECUTION_CAPACITY_OPEN:-0}" \
  EXECUTION_CAPACITY_RESUME_ON_START="${EXECUTION_CAPACITY_RESUME_ON_START:-1}" \
  EXECUTION_CAPACITY_HUMANIZE="${EXECUTION_CAPACITY_HUMANIZE:-1}" \
    nohup "$PY" "$APP" >"$LOG" 2>&1 &
  echo $! >"$PIDFILE"
  for _ in $(seq 1 40); do
    if up; then
      echo "ok: started ${BASE} (pid $(cat "$PIDFILE"))"
      echo "tray: Midjourney sailboat in menu bar (Pause/Resume/Open/Quit)"
      return 0
    fi
    sleep 0.25
  done
  echo "error: did not come up — see ${LOG}" >&2
  return 1
}

cmd_stop() {
  # Prefer pause via API if alive; then kill process / unload is separate.
  if up; then
    local t
    t="$(token)"
    curl -sS -X POST "${BASE}/v1/stop" \
      -H "Authorization: Bearer ${t}" \
      -H "Content-Type: application/json" \
      -d '{}' >/dev/null || true
  fi
  if [[ -f "$PIDFILE" ]]; then
    kill "$(cat "$PIDFILE")" 2>/dev/null || true
    rm -f "$PIDFILE"
  fi
  local pids
  pids="$(lsof -tiTCP:"$PORT" -sTCP:LISTEN 2>/dev/null || true)"
  if [[ -n "${pids}" ]]; then
    # shellcheck disable=SC2086
    kill $pids 2>/dev/null || true
  fi
  echo "ok: stopped process (LaunchAgent may restart if install-login is active)"
}

cmd_status() {
  if up; then
    echo "helper: up (${BASE})"
    curl -sS "${BASE}/health"
    echo
  else
    echo "helper: down"
  fi
  if launchctl print "gui/$(id -u)/${LABEL}" >/dev/null 2>&1; then
    echo "login: installed (${LABEL})"
  else
    echo "login: not installed"
  fi
}

cmd_submit() {
  local prompt="${1:-}"
  local id="${2:-}"
  if [[ -z "$prompt" ]]; then
    echo "error: prompt required" >&2
    return 1
  fi
  cmd_start >/dev/null
  local t body
  t="$(token)"
  if [[ -n "$id" ]]; then
    body="$(python3 -c 'import json,sys; print(json.dumps({"id":sys.argv[1],"capability":"midjourney.imagine","payload":{"prompt":sys.argv[2]}}))' "$id" "$prompt")"
  else
    body="$(python3 -c 'import json,sys; print(json.dumps({"capability":"midjourney.imagine","payload":{"prompt":sys.argv[1]}}))' "$prompt")"
  fi
  # Ensure accepting work
  curl -sS -X POST "${BASE}/v1/resume" \
    -H "Authorization: Bearer ${t}" \
    -H "Content-Type: application/json" \
    -d '{}' >/dev/null || true
  curl -sS -X POST "${BASE}/v1/jobs" \
    -H "Authorization: Bearer ${t}" \
    -H "Content-Type: application/json" \
    -d "$body"
  echo
}

cmd_open() {
  cmd_start >/dev/null
  open "${BASE}/"
}

cmd_install_login() {
  ensure_venv
  mkdir -p "${HOME}/Library/LaunchAgents"
  cp "$PLIST_SRC" "$PLIST_DST"
  launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
  launchctl bootstrap "gui/$(id -u)" "$PLIST_DST"
  launchctl enable "gui/$(id -u)/${LABEL}" 2>/dev/null || true
  launchctl kickstart -k "gui/$(id -u)/${LABEL}" 2>/dev/null || true
  echo "ok: installed always-on login item ${LABEL}"
  echo "menu bar should show the Midjourney sailboat shortly"
}

cmd_uninstall_login() {
  launchctl bootout "gui/$(id -u)/${LABEL}" 2>/dev/null || true
  rm -f "$PLIST_DST"
  echo "ok: removed login item ${LABEL}"
}

main() {
  local op="${1:-}"
  shift || true
  case "$op" in
    start) cmd_start ;;
    stop) cmd_stop ;;
    status) cmd_status ;;
    submit) cmd_submit "${1:-}" "${2:-}" ;;
    open) cmd_open ;;
    install-login) cmd_install_login ;;
    uninstall-login) cmd_uninstall_login ;;
    -h|--help|help|"") usage ;;
    *)
      echo "unknown: $op" >&2
      usage >&2
      return 1
      ;;
  esac
}

main "$@"
