#!/bin/sh
# rebuild + render + score.  usage: sh run.sh [px] [samples]
cd "$(dirname "$0")"
PX=${1:-384}; S=${2:-16}
python3 build.py 2>&1 | grep triangles || { python3 build.py; exit 1; }
[ -f views/hero.png ] || python3 make_views.py
python3 ../../../model-challenge/harness.py render feed-store-charming.glb r --px $PX --samples $S 2>/dev/null | tail -1 | cut -c1-80
python3 ../../../model-challenge/harness.py score r views | grep -E '"iou"|mean'
python3 hero_iou.py r views
python3 hero_check.py feed-store-charming.glb r $PX $S 2>/dev/null | tail -1
