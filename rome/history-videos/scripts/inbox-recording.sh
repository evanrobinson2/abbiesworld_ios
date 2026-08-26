#!/usr/bin/env bash
# Copy a review recording into feedback/inbox and push it.
# Usage: scripts/inbox-recording.sh <file-or-zoom-folder> [--name YYYY-MM-DD-topic.ext]
set -euo pipefail

usage() {
  echo "Usage: scripts/inbox-recording.sh <file-or-zoom-folder> [--name YYYY-MM-DD-topic.ext]" >&2
  exit 2
}

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

NAME=""
SRC=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)
      NAME="${2:-}"
      [[ -n "$NAME" ]] || usage
      shift 2
      ;;
    -h|--help)
      usage
      ;;
    *)
      if [[ -n "$SRC" ]]; then
        echo "Unexpected argument: $1" >&2
        usage
      fi
      SRC="$1"
      shift
      ;;
  esac
done

[[ -n "$SRC" ]] || usage
[[ -e "$SRC" ]] || { echo "Not found: $SRC" >&2; exit 1; }

if [[ -d "$SRC" ]]; then
  picked="$(find "$SRC" -maxdepth 1 -type f -name 'audio*.m4a' | sort | head -1)"
  if [[ -z "$picked" ]]; then
    echo "No audio*.m4a in folder: $SRC" >&2
    exit 1
  fi
  SRC="$picked"
  echo "Using Zoom audio: $SRC"
fi

base="$(basename "$SRC")"
case "$base" in
  .env|.env.*|*.pem|*.key|credentials.json)
    echo "Refusing to commit secret-looking file: $base" >&2
    exit 1
    ;;
esac

if [[ "$OSTYPE" == darwin* ]]; then
  size="$(stat -f%z "$SRC")"
else
  size="$(stat -c%s "$SRC")"
fi

if (( size > 95000000 )); then
  echo "File is ${size} bytes — too large for git. Trim the audio first." >&2
  exit 1
fi
if (( size > 50000000 )); then
  echo "Warning: ${size} bytes is large for git. Continuing."
fi

today="$(date +%Y-%m-%d)"
if [[ -z "$NAME" ]]; then
  if [[ "$base" =~ ^[0-9]{4}-[0-9]{2}-[0-9]{2}- ]]; then
    NAME="$base"
  else
    NAME="${today}-${base}"
  fi
fi

DEST="feedback/inbox/$NAME"
mkdir -p feedback/inbox

git fetch origin
if ! git pull --ff-only; then
  echo "Could not fast-forward. Resolve local/remote divergence, then retry." >&2
  exit 1
fi

cp "$SRC" "$DEST"
git add -- "$DEST"

if git diff --cached --quiet -- "$DEST"; then
  echo "Nothing new to commit (already in repo?)"
  exit 0
fi

git commit -m "Add review recording ${today}"
git push

echo "PUSHED OK: $DEST"
echo "https://github.com/evanrobinson2/rome_history_videos/blob/main/${DEST}"
