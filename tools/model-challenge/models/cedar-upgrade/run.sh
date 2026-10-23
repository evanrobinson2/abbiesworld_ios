#!/bin/sh
# rebuild + render + score.  usage: sh run.sh [px] [samples]
cd "$(dirname "$0")"
PX=${1:-384}; S=${2:-16}
python3 build.py 2>&1 | grep -E "triangles|Error|error" 
python3 ../../harness.py render cedar-upgrade.glb r --px $PX --samples $S 2>/dev/null | tail -1
python3 ../../harness.py score r views
