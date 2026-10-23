#!/bin/sh
# One round of the process: body fit, head fit, build. Usage: run_round.sh START_CARD TARGET_GLB OUT_DIR
set -e
B=${BLENDER:-/Applications/Blender.app/Contents/MacOS/Blender}
HERE=$(cd "$(dirname "$0")" && pwd)
cp "$1" "$3/character.fitted.json" 2>/dev/null || true
$B -b -P "$HERE/fit_to_meshy.py" -- "$3/character.fitted.json" "$2" "$3" body 2>&1 | grep -E "^(START|DONE)"
$B -b -P "$HERE/fit_to_meshy.py" -- "$3/character.fitted.json" "$2" "$3" head 2>&1 | grep -E "^(START|DONE)"
$B -b -P "$HERE/build_bruiser.py" -- "$3/character.fitted.json" "$2" "$3" 2>&1 | grep -E "^SCORES"
