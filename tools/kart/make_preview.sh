#!/bin/sh
# Builds the instant preview of kart mode (preview/kart/) from the live sources, so it never drifts.
# Push the branch and about a minute later: https://app.abbies.world/r2/previews/kart/index.html (add ?dev for the workbench)
set -e
cd "$(dirname "$0")/../.."
D=prototypes/ranch-atelier/dist P=preview/kart
rm -rf "$P"; mkdir -p "$P/simulations/effect-hunt" "$P/simulations/kart" "$P/simulations/vendor"
cp $D/studies/kart/play.html "$P/index.html"
cp $D/simulations/effect-hunt/*.mjs "$P/simulations/effect-hunt/"
cp $D/simulations/kart/*.mjs "$P/simulations/kart/"
cp $D/simulations/vendor/three.module.js "$P/simulations/vendor/"
echo "preview/kart ready ($(du -sh "$P" | cut -f1))"
