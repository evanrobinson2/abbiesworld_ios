#!/usr/bin/env bash
# Vercel "Ignored Build Step".
#
#   exit 0      -> SKIP the build
#   exit non-0  -> RUN the build
#
# Defense in depth for old or accidental mind-only commits in this app repo.
# Routine memory sync now goes to `evanrobinson2/hive_mind`; it must not depend
# on this ignored-build step, because a skipped build can still create a
# deployment object and interfere with an in-flight app deployment.
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
