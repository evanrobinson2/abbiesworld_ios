# Model library

Index and pictures for the `/models` library page (`dist/models/library.js`).

```
node tools/model-library/render.mjs <repo> /tmp/thumbs list.json   # pictures of GLBs (headless Chromium + model-viewer)
python3 tools/model-library/build.py [thumbs-dir] [branch-files-dir]  # writes dist/models/library.json + library/t/*.webp
tools/model-library/preview.sh                                      # stand-alone page in preview/model-library/
```

`build.py` finds every GLB in git (hash-deduped), names them from the repo's catalogues, tags study, place, source, type and
status, merges the review-desk manifest, and lists GLBs that exist only on other branches (extracted to the branch-files dir, not added to `main`).
Pictures are keyed by the first 12 characters of the file's md5. Rules for study, source and type are tables at the top of `build.py`.
