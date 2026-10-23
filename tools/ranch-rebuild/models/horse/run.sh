#!/bin/sh
# rebuild + render + score.  usage: sh run.sh [px] [samples]
cd "$(dirname "$0")"
PX=${1:-384}; S=${2:-16}
python3 build.py 2>&1 | grep -E 'triangles|feeding|Error|error' 
python3 ../../../model-challenge/harness.py render horse.glb r --px $PX --samples $S 2>/dev/null | tail -1 | cut -c1-120
python3 ../../../model-challenge/harness.py score r views | grep -E '"iou"|mean'
