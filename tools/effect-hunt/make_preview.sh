#!/bin/sh
# Builds the instant preview of the Effect Hunt (preview/effect-hunt/) from the live sources, so it never drifts.
# Push the branch and about a minute later: https://app.abbies.world/r2/previews/effect-hunt/index.html
set -e
cd "$(dirname "$0")/../.."
D=prototypes/ranch-atelier/dist P=preview/effect-hunt
rm -rf "$P"; mkdir -p "$P/simulations/effect-hunt" "$P/simulations/paint-world" "$P/simulations/vendor"
cp $D/studies/effect-hunt/play.html "$P/index.html"
cp $D/simulations/effect-hunt/*.mjs "$P/simulations/effect-hunt/"
cp $D/simulations/paint-world/paint-world.mjs $D/simulations/paint-world/paint-splat.mjs $D/simulations/paint-world/alien-plants.mjs "$P/simulations/paint-world/"
mkdir -p "$P/simulations/vendor/utils"; cp $D/simulations/vendor/utils/BufferGeometryUtils.js "$P/simulations/vendor/utils/"
cp $D/simulations/vendor/three.module.js "$P/simulations/vendor/"
echo "preview/effect-hunt ready ($(du -sh "$P" | cut -f1))"
