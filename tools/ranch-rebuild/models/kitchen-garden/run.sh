#!/bin/sh
# rebuild + render + score.  usage: sh run.sh [px] [samples]
# Targets are the pieces' crops of mj/kitchen-garden/sheet.png (views/, cut and keyed by make_views.py).
cd "$(dirname "$0")"
PX=${1:-384}; S=${2:-16}
python3 make_views.py
python3 build.py 2>&1 | grep triangles
python3 score.py $PX $S 2>/dev/null | grep -E "IoU"
