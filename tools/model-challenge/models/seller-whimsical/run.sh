#!/bin/sh
# iteration render + score (cleaned views in views/)
cd "$(dirname "$0")" && python build.py >/dev/null 2>&1 && python ../../harness.py render seller-whimsical.glb r --px ${PX:-384} --samples ${S:-16} 2>&1 | tail -1 && python ../../harness.py score r views
