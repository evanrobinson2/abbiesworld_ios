# Feedback inbox

Drop point for review recordings (Zoom / Loom / voice memo) so a cloud agent can read them.

Cloud agents run on a remote Linux VM and **cannot see your Mac's filesystem**. Pasting a
path like `/Users/evanrobinson/Documents/Zoom/...` will not work. The file has to arrive
here, in the repo.

`research/**/*.mp4` and `research/**/*.m4a` are gitignored (source reference media stays
local). Files under `feedback/` are **not** ignored, so they commit normally.

---

## Which file to send

| You have | Send | Why |
| --- | --- | --- |
| Zoom folder | `audio*.m4a` | Already audio-only, far smaller, all I need to transcribe |
| Zoom folder, and screen content matters | also `video*.mp4` | Needed only to see *which frame* was on screen |
| Loom | the share URL | `yt-dlp` has a native Loom extractor — no upload needed |

Agents cannot hear or watch anything directly. Audio is transcribed via the OpenAI API
(`OPENAI_API_KEY`); video frames are described by a vision model. So audio is the
high-value file and video is only for correlation.

### Skip the video entirely

Say the shot ID or number out loud while recording — "shot 12, the corral frame, move this
before the disarm." Then the transcript alone is unambiguous and there is no correlation
problem to solve. This is the cheapest workflow by a wide margin.

---

## How to send

```bash
cd /path/to/rome_history_videos
mkdir -p feedback/inbox

# audio only (recommended)
cp "/Users/evanrobinson/Documents/Zoom/2026-08-25 19.19.55 Evan Robinson's Zoom Meeting/audio1834333043.m4a" \
   feedback/inbox/

git add feedback/inbox && git commit -m "Add review recording 2026-08-25" && git push
```

Then tell the agent it has landed.

---

## Before you commit — two cautions

**Other people.** A meeting recording captures every participant's voice and likeness. Git
history is effectively permanent; deleting the file in a later commit does not remove it.
If anyone else is on the recording, trim to just your narration first:

```bash
# keep only 00:04:10 - 00:11:30, no re-encode
ffmpeg -i audio1834333043.m4a -ss 00:04:10 -to 00:11:30 -c copy trimmed.m4a
```

**Size.** Zoom video runs large. Check before committing; anything over ~50 MB is better
handled as a trimmed audio file or an external link.

---

## Naming

`YYYY-MM-DD-topic.m4a` — e.g. `2026-08-25-image-ordering.m4a`. Keeps the inbox readable
once there are several.
