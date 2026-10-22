#!/bin/sh
# rebuild + render + score.  usage: sh run.sh [px] [samples]
cd "$(dirname "$0")"
PX=${1:-384}; S=${2:-16}
python3 build.py >/dev/null 2>&1 || { python3 build.py; exit 1; }
python3 ../../harness.py render barn-upgrade.glb r --px $PX --samples $S 2>/dev/null | tail -1
python3 ../../harness.py score r views
python3 gable_check.py barn-upgrade.glb r 2>/dev/null | tail -1
