#!/bin/bash
# Run the pipeline over every model; log per model. Usage: ./runall.sh [slug ...]
cd "$(dirname "$0")"
BL="/c/Program Files/Blender Foundation/Blender 4.1/blender.exe"
SLUGS=${@:-"pirate-chest potion-bottle space-helmet street-lamp sci-fi-crate picnic-table park-bench lighthouse tractor chicken"}
for s in $SLUGS; do
  export STL_T0=$(date +%s.%N)
  "$BL" -b -P stl_pipeline.py -- "$s" > "logs_$s.txt" 2>&1
  grep -E "DONE|Traceback|Error" "logs_$s.txt" | tail -3 | sed "s/^/$s: /"
done
