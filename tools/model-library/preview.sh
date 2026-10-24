#!/bin/sh
# Builds a stand-alone preview of the library at preview/model-library/ (synced to R2 by the preview workflow).
set -e
cd "$(git rev-parse --show-toplevel)"
D=prototypes/ranch-atelier/dist/models; P=preview/model-library
rm -rf $P; mkdir -p $P
cp -r $D/library $D/library.js $D/library.json $D/models.css $P/
cat > $P/index.html <<'H'
<!doctype html>
<html lang="en" data-aw-skin="look"><head><meta charset="utf-8"><script src="/theme/boot.js?v=1"></script>
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Models</title>
<link rel="stylesheet" href="/look.css?v=2"><link rel="stylesheet" href="./models.css"></head>
<body><main class="wrap libwrap" id="root"></main>
<script type="module">window.LIB_BASE = './'; import('/vendor/model-viewer.min.js').catch(() => {}); import('./library.js').then(m => m.mount(document.getElementById('root')));</script></body></html>
H
echo "$P ready"
