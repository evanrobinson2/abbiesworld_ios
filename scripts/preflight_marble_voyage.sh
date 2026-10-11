#!/usr/bin/env bash
# Marble Voyage / Plink playtest preflight — exit non-zero on design regressions.
# Agents: run before handing Evan a major build or Marble Voyage / Plink session.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Marble Voyage preflight ==="
echo

FAIL=0

run() {
  local label="$1"
  shift
  echo "→ $label"
  if "$@"; then
    echo "  PASS"
  else
    echo "  FAIL"
    FAIL=1
  fi
  echo
}

run "Voyage design rules (real estate, alpha, feed, climb, VS, no-clip plates)" \
  python3 "$ROOT/scripts/check_voyage_design_rules.py"

run "Opening-screen DAG (predicted title/chart/fight/shop/event contracts)" \
  python3 "$ROOT/scripts/voyage_opening_screen_dag.py" \
    --json "$ROOT/artifacts/voyage-opening-dag/latest.json"

if [[ "$FAIL" -ne 0 ]]; then
  echo "PREFLIGHT FAILED — do not send Evan into Marble Voyage / Plink until green."
  exit 1
fi

echo "PREFLIGHT OK — design gates + opening-screen DAG passed."
"$ROOT/scripts/voyage_capture_reminder.sh"
exit 0
