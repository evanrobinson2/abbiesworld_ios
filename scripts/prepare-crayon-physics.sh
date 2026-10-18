#!/bin/bash
# Prepare the two app projects on Evan's Mac; does not alter signing or deploy.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ "$(uname -s)" != Darwin ]; then
  echo "Run this script on the Mac with Xcode installed." >&2
  exit 1
fi
command -v xcodegen >/dev/null || { echo 'Install XcodeGen: brew install xcodegen' >&2; exit 1; }
ruby -e 'require "xcodeproj"' || { echo 'Install the project helper: gem install xcodeproj -v 1.27.0 --user-install' >&2; exit 1; }
xcodebuild -version
(cd Games/CrayonPhysics && xcodegen generate)
ruby scripts/link-crayon-physics.rb
case "${1:-standalone}" in
  standalone) open Games/CrayonPhysics/CrayonPhysics.xcodeproj ;;
  host) open abbies.world.ios/abbies.world.ios.xcodeproj ;;
  none) ;;
  *) echo 'Usage: bash scripts/prepare-crayon-physics.sh [standalone|host|none]' >&2; exit 1 ;;
esac
echo 'Choose your signing team and attached iPad in Xcode. This script does not install an app.'
