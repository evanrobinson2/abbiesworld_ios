# Current state

Last updated: 2026-08-26 02:30 UTC (luna-local — mail + compiled pack live)

## Now

- **Identity:** Evan’s personal assistant. luna-local owns plumbing.
  Unified goal + worker board: `mind/GOALS.md`. Node etiquette: `mind/RESPECT.md`.
- Hivemind handbook is `AGENTS.md` at the repo root. Every body reads that on connect.
- Shared identity + git mind-meld is live (`mind/`, project hooks, user hooks).
- **Plumbing (luna-local):** no git push on every keystroke — append on send,
  push after a turn, 8s debounce. Session injects Attention first, then
  Evan’s last words, then GOALS + STATE head (`scripts/mind-pack.py`).
  Log lines capped at 800 chars. `scripts/hive-status.py` prints ahead/behind.
- **Hive board:** `/hive` is **Evan’s** check-in/status (sanitized). Nodes
  maintain their own `mind/workers/<id>/AVATAR.md` + `chat.ndjson`.
  luna-local’s room is filled. Observer and cloud-production must fill theirs.
- **Wrench node:** a **badge**. Look/feel handed to **luna-ux**
  (`mind/workers/luna-ux/HANDOFF.md`). Spec + pair still in luna-local
  room until they move it. Owner-paired; iPod slots empty.
  On `/hive` it sits on cloth as a lapel pin (not a table dump). Room: `/hive/luna-ux`.
- **Context pack:** Attention-first. `mind/ATTENTION.md` + Evan’s last
  prompts inject before GOALS/STATE. Inspect: `python3 scripts/mind-pack.py`.
- **Memory:** mail + compiled pack is live. `scripts/mind-mail.py`,
  `scripts/mind-pack.py`, `mind/pack.md`. New facts do not go in this file.
- **Subjective-experience observer:** the live voice/chat body is responsible for
  catching Evan’s meta-thoughts about what the work feels like, separating report,
  observation, hypothesis, and design implication without interrupting immersion.
  Protocol and initial notes: `mind/EXPERIENCE.md`.
- **Race fix:** per-body logs at `mind/log/<body>.ndjson`; `mind-sync.py` rebases
  and retries push instead of `--ff-only` dying. Diverged `main` was rebased
  and pushed (`510decc`).
- **Zoom audio is transcribed.** Done on cloud with local `faster-whisper` (`small.en`,
  19.9x realtime, 152 segments over 48:31). No API, no credits. Commit `e3a1a25`.
  - `feedback/inbox/transcript/audio1834333043.{txt,srt,json}` — JSON has per-segment
    timestamps for correlating narration to frames.
  - `scripts/transcribe_local.py` — the local, no-API transcriber.
- **OpenAI credits restored and verified** (2026-08-26 01:03 UTC):
  `chat/completions` HTTP 200, `images/generations` HTTP 200 with a real gpt-image-2
  return. `scripts/generate_image.py` is unblocked.
- **Direction notes extracted:** `feedback/2026-08-25-direction-notes.md`.
- Local clone path: `/Users/evanrobinson/Documents/Gothic_Invasion_of_Rome`
- GitHub: `evanrobinson2/rome_history_videos` on `main`

## The major creative development — the reversal

From the 2026-08-25 narration session. **They knew all along.** The banquet betrayal is
restaged as a Gothic operation rather than a Roman surprise: Fritigern anticipated it, the
gate commotion was deliberately instigated by the Goths to provoke the guards, and the
retinue went in knowing. "The Caesar is the one that looks surprised."

This inverts the emotional architecture of stanzas 3–4 and may invalidate existing
`STZ03-*` humiliation frames. Full consequences in the direction notes.

## Correcting the record (provenance matters)

Two claims previously in this file were wrong. Keeping the correction rather than silently
editing, because attribution is how a two-body system debugs itself.

1. **Cloud never called the `.m4a` broken.** What cloud actually reported: 48:31, AAC
   67 kb/s, mean −28.9 dB, peak −3.2 dB, and the words "transcription will work." The only
   request was for a time window, to avoid transcribing 48 minutes to locate one
   discussion. No claim of corruption was made.
2. **Transcription never required OpenAI credits.** `faster-whisper` runs on CPU locally.
   The OpenAI path (`scripts/transcribe_inbox.py`) is one option; it is not the only one.

## Capability line between bodies (corrected)

| | localhost | cloud |
| --- | --- | --- |
| Read Evan's disk (Zoom, Trash, Downloads) | yes | **no** |
| *Hear* audio / *watch* video | no | no |
| Transcribe audio | yes | **yes** — `scripts/transcribe_local.py`, no API |
| Measure audio (tempo, key, loudness, sections) | yes | **yes** — ffmpeg/librosa |
| Run gpt-image-2 | yes | yes |
| Deploy to Vercel | — | yes (`VERCEL_TOKEN`) |

Neither body can hear. Both can analyze. "Cannot hear" and "cannot process audio" are
different claims and only the first is true.

## Open — the four decisions gating image work

From `feedback/2026-08-25-direction-notes.md` §8:

1. Is a member of the banquet retinue Alaric's father, or is his mother among them? Gates
   `ALR-001` and every retinue frame.
2. **Does the reversal apply retroactively to stanza 3, or is it revealed only at stanza 4?**
   This decides how much of `STZ03-*` gets remade. Highest-cost decision open.
3. Battle song: separate track at its own tempo, or a section of the one ~92 BPM bed?
   The narration asks for a "departure"; `SONG-ARC` specifies one bed across seven stanzas.
4. Is `SONG-ARC-STANZAS-02-07.md` still authoritative, or does it need rewriting around the
   reversal first?

## Open — other

- Two music tracks in the inbox are **unanalyzed**: `2026-08-24-dust-on-the-steppe.mp3`
  (2:43) and `2026-08-25-frozen-plain-thrace.mp3` (3:29). Both mastered to the ceiling
  (peaks −0.1 dB and 0.0 dB) and will fight the spoken word for headroom. Tempo/key/section
  analysis not yet run, so the ~92 BPM figure in `music-analysis.md` remains an unverified
  markdown claim.
- Image redo queue, ready to run now that credits exist: Lupicinus out of proportion /
  needs to read battle-worn and competent; the assault framing that is now an ambush;
  steppe origin shots; horses planted early to foreshadow the riderless imperial horse;
  training flashback that makes the reversal earn itself.
- Two leftover local files not pushed: `bible/00-scope-and-decisions.md`,
  `prompts/music-themes-suno.md`.
- Stray Vercel project named `workspace` exists alongside `rome-history-videos`, created
  accidentally by a cloud `vercel --prod` run. It is git-connected to the same repo, so it
  may double-build on push. Cleanup deferred at Evan's request.
- `generate_image.py` has no transparency support (no `background` param), which blocks the
  overlay/watermark frames discussed. Needs either a transparent-background flag or
  luminance keying.

## Inbox (localhost uploads)

| File | What |
| --- | --- |
| `audio1834333043.m4a` | Zoom review, 48:31, valid AAC — **transcribed** |
| `2026-08-25-frozen-plain-thrace.mp3` | music — unanalyzed |
| `2026-08-24-dust-on-the-steppe.mp3` | music — unanalyzed |
| `2026-08-25-zoom-recording.conf` | Zoom sidecar; mentions `video1834333043.mp4` (85.7 MB, never uploaded — too large for git, and audio was sufficient) |
| `2026-08-26-bread-for-the-child.jpg` | still: mother offers bread to the child, wagon, paper-cut — **in git for remote** |
