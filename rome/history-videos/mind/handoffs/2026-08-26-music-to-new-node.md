# Handoff — music, from cloud-production to whoever takes the music row

Timestamp: 2026-08-26 02:30 UTC
From: **cloud-production** (now reassigned to visuals by Evan)
To: **cloud-music** (unclaimed — take this row in `mind/GOALS.md`)
Status: analysis complete, decisions open

Everything below is measured, not estimated. Tooling is `scripts/analyze_audio.py`; run it
on anything new dropped into `feedback/inbox/`. JSON sidecars live in
`feedback/inbox/analysis/`.

---

## Correct a wrong number before you touch anything

`music-analysis.md` asserted the Peter's Barque reference was ~92 BPM in three places, and
`SONG-ARC-STANZAS-02-07.md` inherited that as the bed spec for all seven stanzas.

**It is 103.4 BPM.** Measured two independent ways (librosa beat tracking and median
inter-beat interval), both agreeing. Both documents are patched. Any Suno prompt derived
from that template must say 103.

Logged in `mind/LEARNED.md`. An entire prior argument about whether the battle cue should be
85 or 92 BPM was conducted about a number nobody had measured.

## The two inbox tracks are parallel keys — this is the useful finding

| Track | Length | Tempo | Key |
| --- | --- | --- | --- |
| `2026-08-24-dust-on-the-steppe.mp3` | 2:44 | 112.3 BPM | **E♭ / D# minor** |
| `2026-08-25-frozen-plain-thrace.mp3` | 3:30 | 107.7 BPM | **E♭ / D# major** |

Same tonic, opposite mode. They intercut and crossfade with **no key change**, and the mode
shift itself carries meaning — minor for displacement and wandering, major for resolve.

That is a stronger unifying device across three films than a fixed BPM, which is what the
arc was previously leaning on. Consider making E♭ the tonal centre of the whole trilogy and
using mode as the emotional variable rather than trying to hold one tempo.

## Headroom — small real issue, and a correction of my own error

I earlier told Evan both tracks were "aggressively mastered" and Thrace was "very likely
clipping." That was overstated and I logged the correction.

- Crest factors are **13.7 dB** (Dust) and **12.7 dB** (Thrace). Brickwalled masters run
  6–8, so these have genuine dynamics.
- Flat factor 0.0 on both, one absolute peak each.
- **Thrace does peak at +0.15 dBFS**, marginally over full scale. It will clip on some
  playback chains. About a 1 dB trim fixes it.
- Dust is clean at −0.56 dBFS.

## Cut points already measured

`frozen-plain-thrace` has a **12 dB collapse at 2:59** — from −11.5 dB down to −23.7. That
is a hole in the music, and it is where an aftermath beat belongs. Its loudest sustained
passage is **2:23–2:59**, which is where a cavalry arrival should land.

Full section maps with timestamps are in the JSON sidecars. Nine sections for Thrace, seven
for Dust, ten for the reference.

## Open decisions

1. **Scale.** 2:44 and 3:30 are movement-length, not film-length. Three videos means either
   short films or these are single movements inside longer scores. Nobody has decided.
2. **The battle song.** The 2026-08-25 narration asks for a "departure" from the main bed
   (~11:33 in the transcript). `SONG-ARC` specifies one bed across all stanzas. That conflict
   is unresolved and it should be a decision, not drift.
3. **"Techno Gothic" was explicitly rejected** by Evan at ~29:33 in the transcript: *"I want
   to kind of get away from that for this."* Do not propose it again.
4. Generator is **Suno**. Neither cloud body can run it, so prompts go to Evan and audio
   comes back through `feedback/inbox/`.

## Context you will want

`frozen-plain-thrace` is the track Evan was listening to during the session recorded in
`mind/EXPERIENCE.md` — the one where he cried and discovered the story was about Alaric. It
works. Treat it as validated rather than as a candidate.

The narration also asks for **training-flashback music** tied to the reversal (~32:07), and
the arc's emotional spine is:

> love → union → massacre → wandering → refuge → humiliation → hunger → apparent defeat →
> reversal → revolt → cavalry return → inheritance → self-possession

Read `mind/STORY_ARC.md` and `assets/production/VIDEO-3-RISE-OF-ALARIC.md` before writing any
prompt. The narrator is a Roman clerk who converts — see
`assets/production/NARRATOR-NOTARIUS.md` — which means the spoken-word delivery has a pronoun
arc the music should support rather than fight.
