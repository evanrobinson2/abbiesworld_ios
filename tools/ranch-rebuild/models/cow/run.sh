#!/bin/sh
# rebuild + render + score.  usage: sh run.sh [px] [samples]
cd "$(dirname "$0")"
PX=${1:-384}; S=${2:-16}
python3 build.py 2>&1 | grep -E "triangles|Error|error" 
python3 ../../../model-challenge/harness.py render cow.glb r --px $PX --samples $S 2>/dev/null | tail -1 | cut -c1-160
python3 ../../../model-challenge/harness.py score r views | grep -E '"iou"|mean'
mkdir -p r/side && cp r/side.png r/side/side.png && python3 ../../../model-challenge/harness.py score r/side views/side | grep -E '"iou"'
python3 hero_check.py cow.glb r $PX $S 2>/dev/null | tail -1
python3 poses_check.py 256 >/dev/null 2>&1
