#!/bin/sh
# rebuild + render + score every piece.  usage: sh run.sh [px] [samples]
cd "$(dirname "$0")"
PX=${1:-384}; S=${2:-16}
python3 build.py 2>&1 | grep triangles
for n in crook-lantern post-lantern porch-lamp string-lights; do
  python3 ../../../model-challenge/harness.py render $n.glb r/$n --px $PX --samples $S >/dev/null 2>&1
  printf '%s ' $n; python3 ../../../model-challenge/harness.py score r/$n views/$n | grep mean
done
