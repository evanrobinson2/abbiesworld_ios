#!/bin/bash
# Run on the existing Mac after DevEx establishes access. Does not sign or deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$(uname -s)" != Darwin ]; then
  echo "This verification requires macOS and Xcode." >&2
  exit 1
fi
command -v xcodegen >/dev/null
xcodebuild -version
xcodegen generate
mkdir -p verification
run_id=$(date -u +%Y%m%dT%H%M%SZ)
destination=${SIMULATOR_DESTINATION:-}
if [ -z "$destination" ]; then
  simulator_id=$(xcrun simctl list devices available --json | python3 -c '
import json,sys
data=json.load(sys.stdin)
devices=[d for group in data["devices"].values() for d in group
         if d.get("isAvailable") and "iPad" in d.get("name", "")]
if not devices:
    sys.exit("Install an iPad simulator runtime in Xcode, then rerun.")
print(devices[0]["udid"])
')
  destination="platform=iOS Simulator,id=$simulator_id"
fi
xcodebuild -project CrayonPhysics.xcodeproj -scheme CrayonPhysics \
  -destination "$destination" -derivedDataPath DerivedData \
  -resultBundlePath "verification/$run_id.xcresult" \
  CODE_SIGNING_ALLOWED=NO test 2>&1 | tee "verification/$run_id.log"
echo "Simulator results: ios/verification/$run_id.xcresult"
echo "Physical iPad, actual stylus, all puzzle solutions and host playroom are separate acceptance checks."
