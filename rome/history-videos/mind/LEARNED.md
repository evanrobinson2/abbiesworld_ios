# Learned — things that changed the model

Append-only. One entry per correction that would change how a node acts.

**Mission:** the hive's intellectual capability should compound. A fact that only reaches
Evan in chat dies with that window. A fact written here reaches every body on connect.

## Entry format

```
## <date> — <one-line claim, stated as the corrected truth>

**Was:** what we believed, and where that belief was written.
**Is:** the corrected fact.
**How:** how it was established — command, measurement, file. Not "I think."
**Changed:** what a node should now do differently.
```

The **How** field is the point. See the pattern note at the bottom for why.

---

## 2026-08-26 — The Peter's Barque reference track is 103.4 BPM, not ~92

**Was:** `research/reference-video/inspiration-2/music-analysis.md` asserted "~90–95 BPM,"
"90 BPM pocket," and "~92 BPM throughout" in three places. `SONG-ARC-STANZAS-02-07.md`
inherited it as the musical bed spec for all seven stanzas.

**Is:** 103.4 BPM, key B♭/A# minor, peak −2.9 dBFS, crest factor 13.4 dB.

**How:** `scripts/analyze_audio.py` — librosa beat tracking cross-checked against median
inter-beat interval; both independently return 103.4. Sidecar at
`feedback/inbox/analysis/reel-audio.analysis.json`.

**Changed:** Suno prompts derived from this template say 103, not 92. Both source documents
are patched. An entire prior discussion about whether the battle cue should be 85 or 92 BPM
was arguing about a number nobody had measured.

## 2026-08-26 — The two inbox tracks are parallel keys

**Was:** unmeasured; treated as two unrelated candidates.

**Is:** `dust-on-the-steppe` is 112.3 BPM in **E♭ minor**. `frozen-plain-thrace` is 107.7 BPM
in **E♭ major**. Same tonic, opposite mode.

**How:** `scripts/analyze_audio.py`, Krumhansl-Schmuckler chroma correlation. Sidecars in
`feedback/inbox/analysis/`.

**Changed:** They intercut and crossfade with no key change. Mode becomes the emotional
variable across the trilogy — minor for displacement, major for resolve. This is a stronger
unifying device than a fixed BPM, which is what the arc was previously relying on.

## 2026-08-26 — Cloud can transcribe and measure audio without any API

**Was:** `mind/STATE.md` listed the Zoom transcription as blocked on OpenAI credits.
`IDENTITY.md` reduced cloud's audio capability to "cannot hear."

**Is:** cloud transcribed 48:31 in 147 seconds using local `faster-whisper` (`small.en`, ~20x
realtime) with no network calls, and measures tempo, key, sections and headroom with librosa
and ffmpeg.

**How:** `scripts/transcribe_local.py`, `scripts/analyze_audio.py`. Commits `e3a1a25`,
`87ad866`.

**Changed:** "Cannot hear" and "cannot process audio" are different claims and only the first
is true. Audio work is never blocked on API credits again.

## 2026-08-26 — Corrected an overstatement I made about the masters

**Was:** cloud reported both tracks as "aggressively mastered" and Thrace as "very likely
clipping," from a single ffmpeg `volumedetect` reading of 0.0 dB.

**Is:** crest factors are 13.7 and 12.7 dB, which indicates real dynamics — a brickwalled
master runs 6–8. Flat factor 0.0 on both. Thrace does peak **+0.15 dBFS**, marginally over
full scale, and needs about a 1 dB trim. Dust is clean at −0.56.

**How:** `ffmpeg astats` at native sample rate plus librosa crest computation.

**Changed:** the trim is real but small. Logging this because the original claim was mine and
it was wrong; a correction that only exists in chat does not reach the next node.

---

## The pattern behind all four

Three times in one night, an **unverified claim rendered in the same voice as a verified one**
was inherited as fact and cost real work:

1. "~92 BPM" — an ear estimate that became the bed spec for a seven-stanza song.
2. "Cloud called the `.m4a` broken" — a guess about another node ("it *probably* opened it as
   text") that became a standing rule in `IDENTITY.md` within two hops.
3. "Transcription needs OpenAI credits" — an assumption that blocked a 48-minute recording for
   an hour while the capability existed locally the whole time.

Markdown has no type system. "103.4 BPM, measured with librosa" and "about 92 I think" look
identical once they are prose in a file, and every node inherits both with equal confidence on
connect.

**So: state how you know.** One clause is enough — *measured with X*, *asserted by Y*,
*assumed*. `bible/06-uncertainty-ledger.md` already does exactly this for the film, grading
every claim from attested to invented. This file is that discipline applied to operational
facts.

More nodes multiply this either way. A hive that records provenance gets smarter as it grows.
One that does not accumulates confident error faster, because every new body reads the bad
fact on connect and inherits it whole.

## 2026-08-26 — The hive spent the Vercel deployment budget on memory sync

**Was:** unnoticed. Deployment was assumed available on demand.

**Is:** Vercel's free tier caps production deployments at **100 per day**, and we hit it.
Deployment is blocked for 24 hours. Cause: 80 commits were pushed to `main` today and
**49 of them touched only `mind/`** — pure memory sync with no app code. Every push
triggered a production build. A stray Vercel project named `workspace`, created by
accident during an early cloud `vercel --prod` run, is git-connected to the same repo, so
**every push built twice.**

**How:** `npx vercel ls` showed 20 production builds in the last hour on
`rome-history-videos` plus 3 concurrent ones on `workspace`. Commit classification by
`git show --name-only` per commit: 80 total, 49 mind-only. API error was
`api-deployments-free-per-day`.

**Changed:** Added `ignoreCommand` to `vercel.json` pointing at
`scripts/vercel-ignore-build.sh`, which exits 0 (skip) when a commit touches only `mind/`
or `sessions/` and exits 1 (build) otherwise. Verified both directions against real
commits. This removes roughly 61% of builds.

Still outstanding: the `workspace` project should be deleted. It serves nothing, was
created by mistake, and doubles every remaining build:
`npx vercel project rm workspace --yes`

**The general lesson:** a memory system that writes to the same repo the app deploys from
couples *thinking* to *building*. Any node that appends to `mind/` was silently spending a
shared, finite production resource. When adding a new always-on write path, check what
else watches that path.
