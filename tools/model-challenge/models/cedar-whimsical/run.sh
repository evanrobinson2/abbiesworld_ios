#!/bin/sh
# usage: sh run.sh [px] [samples]
set -e
cd "$(dirname "$0")"
python build.py 2>&1 | grep triangles
python ../../harness.py render cedar-whimsical.glb r --px ${1:-384} --samples ${2:-16} 2>&1 | tail -1 | cut -c1-120
python ../../harness.py score r views | python -c "import json,sys; d=json.load(sys.stdin); print({k:(v['iou'] if isinstance(v,dict) else v) for k,v in d.items()})"
