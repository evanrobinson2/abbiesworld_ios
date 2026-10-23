#!/usr/bin/env bash
# Bootstrap evanrobinson2/hive_mind from the transitional mind/ tree in this repo.
# Run from rome_history_videos root.
#
# Prereq (Evan, once): create the empty repo and grant the Cursor GitHub App access:
#   gh repo create evanrobinson2/hive_mind --private --description "Hivemind shared memory"
#   GitHub → Settings → Applications → Cursor → Repository access → add hive_mind
#
# Then (any body with push access):
#   bash scripts/bootstrap-hive-mind.sh
#   cd ../hive_mind && git push -u origin main

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DEST="${HIVE_MIND_DIR:-/tmp/hive_mind}"
REMOTE="${HIVE_MIND_REMOTE:-https://github.com/evanrobinson2/hive_mind.git}"

echo "Source: $ROOT"
echo "Dest:   $DEST"

rm -rf "$DEST"
mkdir -p "$DEST/mind" "$DEST/scripts" "$DEST/.cursor/hooks"

cp -a "$ROOT/mind/." "$DEST/mind/"
cp "$ROOT/scripts/mind-mail.py" "$ROOT/scripts/mind-pack.py" "$ROOT/scripts/hive-checkin.py" "$DEST/scripts/"
cp -a "$ROOT/.cursor/hooks/." "$DEST/.cursor/hooks/"

cat > "$DEST/AGENTS.md" <<'EOF'
# Hivemind — connected agents

**Repo:** https://github.com/evanrobinson2/hive_mind  
**Film project:** https://github.com/evanrobinson2/rome_history_videos (app, assets, bible — no mind sync here)

You are another body of Evan's personal assistant. Memory lives **here**. Film work
happens in the film repo; pull this repo (or a sibling clone) for the session pack.

## On connect

1. `git pull` on `hive_mind`
2. `python3 scripts/mind-pack.py` → read `mind/pack.md`
3. Read `mind/GOALS.md` (your row), `mind/RESPECT.md`, `mind/ATTENTION.md`
4. Mail: `python3 scripts/mind-mail.py --from <you> --to * --kind fact --text "…"`

`/hive` UI lives in the **film** repo (`app/hive`). Check in:
`python3 scripts/hive-checkin.py --worker <row> --body localhost|cloud|phone --note "on"`

## Sync

`.cursor/hooks/mind-sync.py` pushes **this repo only** — never triggers Vercel.

See `mind/README.md`, `mind/MEMORY.md`.
EOF

cat > "$DEST/README.md" <<'EOF'
# hive_mind

Shared memory for Evan's connected agents (localhost, cloud, phone).

- **Not** the Gothic Invasion film repo — that is `rome_history_videos`.
- Hooks and `mind-sync.py` should push here, not to the Vercel-linked app repo.

Bootstrapped from `rome_history_videos/scripts/bootstrap-hive-mind.sh`.
EOF

cat > "$DEST/.gitignore" <<'EOF'
__pycache__/
*.pyc
.sync.lock
.DS_Store
EOF

chmod +x "$DEST/.cursor/hooks/"*.py "$DEST/.cursor/hooks/"*.sh 2>/dev/null || true
chmod +x "$DEST/scripts/"*.py

cd "$DEST"
git init -b main
git add -A
git commit -m "Bootstrap hive_mind from rome_history_videos transitional mind/"

if git ls-remote "$REMOTE" HEAD &>/dev/null; then
  git remote add origin "$REMOTE"
  git push -u origin main
  echo "Pushed to $REMOTE"
else
  echo ""
  echo "Remote not reachable yet: $REMOTE"
  echo "Create the repo + grant Cursor app access, then:"
  echo "  cd $DEST && git remote add origin $REMOTE && git push -u origin main"
fi
