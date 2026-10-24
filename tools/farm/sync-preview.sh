#!/bin/sh
# Copies the farm's modules next to its preview page so the instant-preview route (R2) serves a page that runs on its own:
#   https://app.abbies.world/r2/previews/wright-farm/index.html
# Run from the repo root after changing simulations/farm/. Models, three.js and the vendor loaders come from the live Ranch site
# (same origin as the preview), so only our own modules are copied.
set -e
D=prototypes/ranch-atelier/dist/simulations
P=preview/wright-farm/simulations
mkdir -p "$P/farm"
cp $D/farm/*.mjs "$P/farm/"
cp $D/livestock-animation.mjs "$P/"
echo "synced $(ls $P/farm | wc -l) farm modules"
