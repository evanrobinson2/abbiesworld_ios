#!/usr/bin/env bash
# Fetch the VS Chamber Orchestra: Community Edition samples (CC0) the Composer performs with.
# About 4 GB; only the folders the orchestra uses. Kept out of git (.samples/ is ignored).
set -euo pipefail
cd "$(dirname "$0")"
COMMIT=440300901dfe9275fd84e0b7763af1f8443ae62e
DEST=.samples/VSCO-2-CE
if [ ! -d "$DEST/.git" ]; then
  git clone --filter=blob:none --no-checkout https://github.com/sgossner/VSCO-2-CE "$DEST"
fi
cd "$DEST"
git sparse-checkout init --no-cone
printf '%s\n' '/Strings/' '/Woodwinds/' '/Brass/F Horn/' '/Brass/Trumpet/' '/Brass/Tenor Trombone/' '/Brass/Tuba/' \
  '/Keys/Upright Piano/' '/Percussion/' '/Miscellania Raw/Misc 2/' '/VSCO 1 Percussion/varMetal/' \
  '/VSCO 1 Percussion/drums/bass/' '/VSCO 1 Percussion/drums/snare/drum1/' > .git/info/sparse-checkout
git checkout -q "$COMMIT"
echo "VSCO-2-CE at $COMMIT in $(pwd)"
