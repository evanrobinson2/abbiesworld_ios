#!/usr/bin/env bash
# Vercel "Ignored Build Step".
#
#   exit 0      -> SKIP the build
#   exit non-0  -> RUN the build
#
# Why this exists: on 2026-08-26 the hive pushed 80 commits to main in one day and
# 49 of them touched only `mind/` — pure memory sync with no app code in them.
# Every push triggered a production build, and the free tier's 100-deploys-per-day
# limit was exhausted, blocking deployment for 24 hours. The hivemind spent the
# deployment budget on thinking.
#
# Paths listed below cannot affect the built Next.js app. A commit that touches
# only those is skipped.
#
# Fails safe: if we cannot work out what changed, we build.

set -uo pipefail

# Directories that never affect the deployed app.
MEMORY_ONLY=(mind sessions)

if ! git rev-parse --verify HEAD^ >/dev/null 2>&1; then
  echo "vercel-ignore-build: no parent commit reachable — building to be safe"
  exit 1
fi

EXCLUDES=()
for p in "${MEMORY_ONLY[@]}"; do
  EXCLUDES+=(":(exclude)${p}")
done

if git diff --quiet HEAD^ HEAD -- . "${EXCLUDES[@]}"; then
  echo "vercel-ignore-build: only ${MEMORY_ONLY[*]}/ changed — skipping build"
  exit 0
fi

echo "vercel-ignore-build: app-relevant changes present — building"
git diff --name-only HEAD^ HEAD -- . "${EXCLUDES[@]}" | head -20
exit 1
