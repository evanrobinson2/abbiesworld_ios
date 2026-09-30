#!/usr/bin/env bash
# Run player-protocol Monte Carlo (aggressive / motivated / casual) and write
# docs/minigames/evidence/player_protocol_summary.json via XCTest.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
DEST="${DESTINATION:-platform=iOS Simulator,name=iPad (A16)}"
DD="${DERIVED_DATA:-$ROOT/DerivedData/voyage-protocol}"

xcodebuild test \
  -project abbies.world.ios/abbies.world.ios.xcodeproj \
  -scheme abbies.world.ios \
  -destination "$DEST" \
  -derivedDataPath "$DD" \
  -only-testing:abbies.world.iosTests/MarbleVoyagePlayerProtocolTests/testProtocolAuditCollectsStatsAndWritesEvidence

echo "Evidence: $ROOT/docs/minigames/evidence/player_protocol_summary.json"
