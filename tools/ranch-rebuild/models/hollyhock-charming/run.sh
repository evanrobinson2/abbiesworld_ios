#!/bin/sh
# rebuild + render + score.  usage: sh run.sh [px] [samples]
# The hero is the only target (no turnaround), so the score is hero_check.py's matched camera.
cd "$(dirname "$0")"
PX=${1:-384}; S=${2:-16}
python3 build.py 2>&1 | grep -E "triangles|size" || { python3 build.py; exit 1; }
python3 make_views.py | tail -1
python3 ../../../model-challenge/harness.py render hollyhock-charming.glb r --px $PX --samples $S 2>/dev/null | tail -1 | cut -c1-120
python3 hero_check.py hollyhock-charming.glb r $PX $S 2>/dev/null | tail -1
