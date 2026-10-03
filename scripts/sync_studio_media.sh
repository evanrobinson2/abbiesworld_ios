#!/usr/bin/env bash
# Sync Plink SFX + selected voyage media into studio-mock/media for Vercel hosting.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MEDIA="$ROOT/prototypes/studio-mock/media"
mkdir -p "$MEDIA/sfx/plink" "$MEDIA/maps/marbleVoyage" "$MEDIA/images/plink"
cp "$ROOT/abbies.world.ios/abbies.world.ios/Resources/SFX/Plink/"*.wav "$MEDIA/sfx/plink/"
cp "$ROOT/abbies.world.ios/abbies.world.ios/Resources/SFX/Plink/KENNEY_LICENSE.txt" "$MEDIA/sfx/plink/" 2>/dev/null || true
CLIMB="$ROOT/abbies.world.ios/abbies.world.ios/Assets.xcassets/world2_map_marbleVoyage_climb.imageset/world2_map_marbleVoyage_climb.jpg"
if [[ -f "$CLIMB" ]]; then
  cp "$CLIMB" "$MEDIA/maps/marbleVoyage/climb.jpg"
fi
echo "Synced → $MEDIA"
du -sh "$MEDIA"
