#!/bin/sh
# Build the Character Studio's claude.ai preview: the site page with three.js from jsDelivr and every file beside it.
# usage: tools/character-studio/artifact.sh <out dir>
set -e
SRC="$(dirname "$0")/../../prototypes/ranch-atelier/dist"
OUT="$1"; mkdir -p "$OUT/models"
S="$SRC/studies/character-studio"
CDN='https://cdn.jsdelivr.net/npm/three@0.170.0'
sed -e "s#\"three\":\"/vendor/three.module.js\"#\"three\":\"$CDN/build/three.module.js\"#" \
    -e "s#\"/vendor/loaders/GLTFLoader.js\"#\"$CDN/examples/jsm/loaders/GLTFLoader.js\"#" \
    -e "s#\"/vendor/OrbitControls.js\"#\"$CDN/examples/jsm/controls/OrbitControls.js\"#" \
    -e "s#'/simulations/toon-kit.mjs'#'./toon-kit.mjs'#" "$S/index.html" > "$OUT/index.html"
sed -e "s#'../brute-fight/red/fighter.glb'#'models/brute-red.glb'#" -e "s#'../brute-fight/blue/fighter.glb'#'models/brute-blue.glb'#" "$S/bodies.mjs" > "$OUT/bodies.mjs"
for f in rig.mjs moves.mjs puppet.html; do cp "$S/$f" "$OUT/"; done
for f in "$S"/*.mjs; do case "$(basename "$f")" in bodies.mjs|rig.mjs|moves.mjs) ;; *) cp "$f" "$OUT/";; esac; done
cp "$S"/models/* "$OUT/models/"
cp "$SRC/simulations/toon-kit.mjs" "$OUT/"
cp "$SRC/studies/brute-fight/red/fighter.glb" "$OUT/models/brute-red.glb"
cp "$SRC/studies/brute-fight/blue/fighter.glb" "$OUT/models/brute-blue.glb"
# the artifact wraps the page in its own document
sed -i -e '/^<!doctype html>$/d' -e '/^<html lang="en">$/d' -e '/^<\/html>$/d' -e '/^<head>$/d' -e '/^<\/head>$/d' -e '/^<body>$/d' -e '/^<\/body>$/d' -e '/<meta charset/d' -e '/<meta name="viewport"/d' "$OUT/index.html"
# artifacts don't serve .glb (and may block data: fetches): ship each GLB as base64 text and parse it in the page
for g in "$OUT"/models/*.glb; do base64 -w0 "$g" > "${g%.glb}.glb.txt"; rm "$g"; done
sed -i -e "s#\.glb'#.glb.txt'#g" \
 -e "s#loader.loadAsync(new URL(b.url, base).href)#fetch(new URL(b.url, base)).then(r => r.text()).then(t => loader.parseAsync(Uint8Array.from(atob(t), c => c.charCodeAt(0)).buffer, ''))#" "$OUT/bodies.mjs"
