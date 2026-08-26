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

Agents cannot hear or watch anything directly. A playable `.m4a` is not “broken.”
Transcribe with `scripts/transcribe_inbox.py` (`OPENAI_API_KEY`), then read the
markdown. Do not `Read` the audio file as text. Video frames are only for
correlation if screen content matters.

### Skip the video entirely

Say the shot ID or number out loud while recording — "shot 12, the corral frame, move this
before the disarm." Then the transcript alone is unambiguous and there is no correlation
problem to solve. This is the cheapest workflow by a wide margin.

---

## How to send

Drop the file on the agent (or paste a path / Zoom folder). It runs:

```bash
scripts/inbox-recording.sh "/path/to/audio.m4a"
# or a Zoom meeting folder — picks audio*.m4a
scripts/inbox-recording.sh "/Users/…/Evan Robinson's Zoom Meeting"
```

The script pulls, copies into `feedback/inbox/`, commits only that file, and pushes.

Then tell the agent it has landed — or just drop the file; that is enough.

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
