#!/bin/sh
# Build the Character Studio's claude.ai preview: the site pages with three.js from jsDelivr and every file beside them.
# usage: tools/character-studio/artifact.sh <out dir>
set -e
SRC="$(dirname "$0")/../../prototypes/ranch-atelier/dist"
OUT="$1"; mkdir -p "$OUT/models" "$OUT/mocap" "$OUT/img" "$OUT/theme"
S="$SRC/studies/character-studio"
CDN='https://cdn.jsdelivr.net/npm/three@0.170.0'
# site paths to the files copied beside the page
site() {
 sed -e "s#\"three\":\"/vendor/three.module.js\"#\"three\":\"$CDN/build/three.module.js\"#" \
     -e "s#\"/vendor/loaders/GLTFLoader.js\"#\"$CDN/examples/jsm/loaders/GLTFLoader.js\"#" \
     -e "s#\"/vendor/OrbitControls.js\"#\"$CDN/examples/jsm/controls/OrbitControls.js\"#" \
     -e "s#'/simulations/toon-kit.mjs'#'./toon-kit.mjs'#" -e "s#'/simulations/film-look.mjs'#'./film-look.mjs'#" \
     -e "s#src=\"/theme/boot.js\"#src=\"theme/boot.js\"#" -e "s#src=\"/look/context-card.mjs\"#src=\"context-card.mjs\"#" "$1"
}
site "$S/index.html" > "$OUT/index.html"
site "$S/crowd.html" > "$OUT/crowd.html"
site "$S/cast.html" > "$OUT/cast.html"
cp "$S/bodies.mjs" "$OUT/bodies.mjs"
for f in "$S"/*.mjs "$S"/puppet.html; do [ "$(basename "$f")" = bodies.mjs ] || cp "$f" "$OUT/"; done
cp "$S"/models/*.glb "$S"/models/*.json "$OUT/models/"
cp "$S"/mocap/*.json "$OUT/mocap/"
cp "$S"/img/* "$OUT/img/"
cp "$SRC/simulations/toon-kit.mjs" "$SRC/simulations/film-look.mjs" "$SRC/simulations/painted-brush.mjs" "$SRC/simulations/hand-drawn.mjs" "$OUT/"
sed -i -e "s#'/simulations/painted-brush.mjs'#'./painted-brush.mjs'#" -e "s#'/simulations/hand-drawn.mjs'#'./hand-drawn.mjs'#" "$OUT/directions.mjs"
sed -i "s#'/simulations/painted-brush.mjs'#'./painted-brush.mjs'#" "$OUT/hand-drawn.mjs"
sed -e "s#'/theme/aw.css?v=3'#new URL('aw.css?v=3', document.currentScript.src).href#" "$SRC/theme/boot.js" > "$OUT/theme/boot.js"
cp "$SRC/theme/aw.css" "$OUT/theme/"
# the context card, reading only this study's entry from a copy beside the page
sed -e "s#url = '/studies/context.json'#url = new URL('context.json', import.meta.url).href#" -e "s#'/look/context-card.css?v=1'#new URL('context-card.css', import.meta.url).href#" \
 "$SRC/look/context-card.mjs" > "$OUT/context-card.mjs"
cp "$SRC/look/context-card.css" "$OUT/"
python3 -c "import json,sys; d=json.load(open(sys.argv[1])); d['studies']={'character-studio': d['studies']['character-studio']}; json.dump(d, open(sys.argv[2],'w'))" "$SRC/studies/context.json" "$OUT/context.json"
# the artifact wraps the page in its own document
sed -i -e '/^<!doctype html>$/d' -e '/^<html/d' -e '/^<\/html>$/d' -e '/^<head>$/d' -e '/^<\/head>$/d' -e '/^<body>$/d' -e '/^<\/body>$/d' -e '/<meta charset/d' -e '/<meta name="viewport"/d' "$OUT/index.html"
# artifacts don't serve .glb (and may block data: fetches): ship each GLB as base64 text and parse it in the page
for g in "$OUT"/models/*.glb; do base64 -w0 "$g" > "${g%.glb}.glb.txt"; rm "$g"; done
sed -i -e "s#models/\([a-z-]*\)\.glb'#models/\1.glb.txt'#g" \
 -e "s#loader.loadAsync(new URL(b.url, base).href)#fetch(new URL(b.url, base)).then(r => r.text()).then(t => loader.parseAsync(Uint8Array.from(atob(t), c => c.charCodeAt(0)).buffer, ''))#" "$OUT/bodies.mjs"
