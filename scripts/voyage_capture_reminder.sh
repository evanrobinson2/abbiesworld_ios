#!/usr/bin/env bash
# Shared Marble Voyage stage-capture reminder (sourced or executed).
# Does not run capture — only prints how to request it.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

cat <<EOF

── Voyage stage stills (optional) ──
Silent title/chart/fight PNGs for agent review. Uses the iPad Simulator
(default: iPad (A16)) — will relaunch the app on that device.

  Request with build:  ./scripts/build_marble_voyage.sh --capture
  Or after any build:  ./scripts/capture_marble_voyage.sh --skip-build
  Env opt-in:          VOYAGE_CAPTURE=1 ./scripts/build_marble_voyage.sh

Output: artifacts/voyage-capture/<stamp>/{title,chart,fight}.png
Docs:   docs/minigames/MARBLE_VOYAGE_APP_STORE.md
EOF
