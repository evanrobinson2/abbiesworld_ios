#!/bin/sh
# Rebuild every asset in assets/ (or the ones named). Each build bakes maps, exports the GLB and renders r/hero.png, r/fps.png.
cd "$(dirname "$0")/assets"
for a in ${@:-*}; do
  [ -f "$a/build.py" ] || continue
  echo "== $a"; python3 "$a/build.py" 2>&1 | grep -E "BUILT|Error|Traceback|line [0-9]+|^\w+Error" | head -8
done
