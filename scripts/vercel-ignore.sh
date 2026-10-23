#!/usr/bin/env bash
# Vercel ignoreCommand for every project built from this repo (root vercel.json). Vercel caps the command at 256
# characters, so the logic lives here. Exit 0 skips the build, exit 1 builds.
# At the repo root: build only if a Next.js app lives there. Elsewhere: skip when nothing in the project's folder changed.
if [ -z "$(git rev-parse --show-prefix)" ]; then
  [ -f package.json ] && [ -d app -o -d pages -o -d src/app -o -d src/pages ] && exit 1
  echo "No app at the repo root; skipping."; exit 0
fi
git diff --quiet HEAD^ HEAD -- . && { echo "Nothing changed in this project; skipping."; exit 0; }
exit 1
