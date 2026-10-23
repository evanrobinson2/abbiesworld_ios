---
name: inbox-review-recording
description: >-
  Copies a dropped Zoom/Loom/voice-memo review recording into
  feedback/inbox, commits, and pushes so cloud agents can read it. Use when
  the user attaches or drops an .m4a/.mp3/.wav/.mp4, a Zoom meeting folder,
  or says inbox this, review recording, feedback inbox, or drop this file.
---

# Inbox a review recording

Cloud agents cannot see the Mac filesystem. A dropped or attached file must
land in `feedback/inbox` on git `main` (or the current branch) before anyone
else can use it.

## Do this

1. Resolve the source file:
   - Chat attachment → use that path
   - Zoom folder → use `audio*.m4a` inside it (not the video)
   - Pasted path → use it if it exists
2. Run, from this repo root:

```bash
scripts/inbox-recording.sh "/absolute/path/to/file-or-zoom-folder"
```

Optional readable name:

```bash
scripts/inbox-recording.sh "$SRC" --name 2026-08-25-image-ordering.m4a
```

3. Reply with the pushed path and GitHub URL. Do not commit unrelated dirty files.

## Do not

- Paste a `/Users/...` path to a cloud agent and stop — that path is invisible there
- Commit `.env`, keys, or files over ~95 MB
- `git add` the whole repo; the script stages only the inbox file
