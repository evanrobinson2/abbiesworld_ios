#!/bin/sh
# rebuild + render + score.  usage: sh run.sh [px] [samples]
# The hero is the main target (hero_check.py, matched camera); the sheet's end view is scored as view_side only.
cd "$(dirname "$0")"
PX=${1:-384}; S=${2:-16}
python3 build.py 2>&1 | grep triangles || { python3 build.py; exit 1; }
python3 make_views.py | tail -1
python3 ../../../model-challenge/harness.py render water-trough.glb r --px $PX --samples $S 2>/dev/null | tail -1 | cut -c1-120
python3 ../../../model-challenge/harness.py score r views | grep -E '"iou"|mean'
python3 hero_check.py water-trough.glb r $PX $S 2>/dev/null | tail -1
