#!/bin/sh
# rebuild + render + score.  usage: sh run.sh [px] [samples]
cd "$(dirname "$0")"
PX=${1:-384}; S=${2:-16}
python3 build.py >/dev/null 2>&1 || { python3 build.py; exit 1; }
python3 ../../../model-challenge/harness.py render feed-store.glb r --px $PX --samples $S 2>/dev/null | tail -1
python3 ../../../model-challenge/harness.py score r views
python3 hero_iou.py r views
python3 -c "import json;print(json.load(open('r/stats.json'))['triangles'],'tris')"
