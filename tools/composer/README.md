# Composer

> **Switched off (Evan, 2026-10-22).** The rendered music was taken out of the game, the jukebox, Family Teleport,
> `/music` and `/sounds` until music of Suno quality or better is available through an API. Everything here is kept:
> the scores, the renderer, and the runtime (`runtime/`: director, listening page). `render_all.py` now writes to
> `out/` (git-ignored) instead of the site. To bring it back, move `runtime/*` to
> `prototypes/ranch-atelier/dist/music/`, point `SITE` in `render_all.py` back at the site, re-render, and restore the
> jukebox and Family Teleport hooks from commit 6abff0d. The director works with any audio files, so a future
> API-generated score can reuse it.

## The Music Bible (canon)

`docs/music/MUSIC_BIBLE.md` (Evan, 2026-10-23) is the source of truth: one Abbie's World identity in D major,
122–126 bpm, 4/4 with a 3+3+2 rhythm, arranged per world. `api/briefs-bible.json` turns it into briefs (main theme,
ranch, both treehouses, HQ/moon, Halloween, Halloween After Dark, lo-fi, Card Factory, the Mysterious / Intense / Epic
modes and the sonic-identity stings). `motifs/motifs.py` renders both candidate melodies note for note (MIDI plus a
reference MP3) because a text prompt cannot pin an exact melody; takes are judged against those.

Every take made from a briefs file with an `identity` block records a `trace` in its JSON sidecar (Bible section 9):
identity, source motif, family, world, place, situation, mode, key, bpm, meter, instrumentation, mood, intensity,
variant_of, loop, the prompt's styles and sections, and the intended duration.

    gh workflow run music-takes.yml --ref main -f briefs=briefs-bible.json -f takes=2

## API music (ElevenLabs)

The replacement for the sample renderer. `api/briefs.json` holds one composition plan per cue (beds, stings,
interludes) in a shared palette; `api/elevenlabs.py` sends them to the ElevenLabs Music API and writes takes plus a
provenance sidecar to `out/api/<cue>/` (git-ignored), loudness-matched to the score's targets with ffmpeg.

```
python3 tools/composer/api/elevenlabs.py --dry-run                       # print the plans
ELEVENLABS_API_KEY=... python3 tools/composer/api/elevenlabs.py --only wonder sting-arrival --takes 3
```

The cloud box cannot reach api.elevenlabs.io, so takes are made by the `music-takes` GitHub workflow (manual; secret
`ELEVENLABS_API_KEY`), which commits mastered takes and provenance to `takes/<cue>/` for review.

Licence (checked 2026-10-22): on any paid plan from Starter up, output may be used commercially, including in an
indie game (under $500k revenue); "Studio Games" above that need Enterprise Music. No attribution from Starter up.
Google Lyria is not usable: the Gemini API and Google Cloud (section 20(d)) terms ban apps likely to be used by
under-18s. Takes stay out of the site until they clearly beat the old mock-up; then they go through the R2
catalogue and the director in `runtime/`.

Original music for Abbie's World: looping beds, interludes and stings, written as code and performed by a recorded
chamber orchestra. Listen at `/music` on the Ranch Atelier site; the same records appear on `/sounds`.

```
cues/*.py  (scores: tempo, key, voicings, lines, in beats)
   │  engine/core.py      sampler: picks the nearest recorded note, dynamic layer and round robin; humanises timing
   │  engine/dsp.py       synthetic concert hall, bus glue, true-peak limiter, LUFS loudness
   ▼  engine/render.py    stems → mix → master → seamless loop fold → MP3 → /sounds record
prototypes/ranch-atelier/dist/music/composer/*.mp3      mix, four stems per bed, one file per key per sting
prototypes/ranch-atelier/dist/music/catalog.json        /sounds records ({sounds:[...]}, tools/sound-engineer shape)
tools/composer/assets/<id>/provenance.json              brief, score, recipe, sample library and commit, hashes, history
   ▼
prototypes/ranch-atelier/dist/music/director.mjs        runtime: layers, beat-synced stings in the bed's key, bridges
```

## The score

- **Abbie's motif**: sol-do-re-mi (a rising fourth, then two steps up to the third), answered re-do-la. Every cue
  quotes it so the game sounds like one score. `cues/common.py`.
- **Beds** (loops, four stems each): Ranch Morning (D major, 76), Ranch Workday (G major, 104), Ranch Night
  (B-flat major waltz, 60), Wonder (E lydian, 92; the family teleport worlds).
- **Stems** open with intensity: `foundation` always, `pulse` from 0.2, `melody` from 0.45, `color` from 0.7.
- **Stings**: arrival, teleport, reveal, victory, small win, discovery, oops, build complete. Each is written in
  scale degrees and rendered in D, G, B-flat and E, so the director can drop it over any bed in tune.
- **Interludes**: world intro (the full theme), chapter card, night falls (D → B-flat), morning comes (B-flat → D).

## Using it in a game

```js
import {music} from '/music/director.mjs';
button.onclick = async () => { await music.unlock(); music.play('ranch-morning'); };   // needs a user gesture
music.intensity(0.7);                              // open the melody and colour layers
music.sting('arrival');                            // next beat, in the bed's key, the bed ducks underneath
music.interlude('night-falls', {then: 'ranch-night'});
```

The site's jukebox also lists the beds (they play through the director so the loops are seamless).

## Render

```
pip install -r requirements.txt          # plus ffmpeg with libmp3lame
./fetch_samples.sh                       # VS Chamber Orchestra CE, CC0, ~4 GB, into .samples/ (git-ignored)
python3 render_all.py                    # everything; or name cues: python3 render_all.py wonder sting-victory
```

Rendering is deterministic (fixed seeds). A change request is a new render: edit the score, re-render, and the
asset's `provenance.json` history gains an entry with the new hash. Loudness targets: beds −18 LUFS, interludes −17,
stings −16, all under −1 dBTP.

Loops are written as `[last 0.2 s][loop][first 0.2 s]` with `loopPoints` in the record, so MP3 encoder delay can't
put a gap in the loop: play `loopStart..loopEnd` with WebAudio (`AudioBufferSourceNode.loopStart/loopEnd`).

## Samples and licences

- [VS Chamber Orchestra: Community Edition](https://github.com/sgossner/VSCO-2-CE) by Versilian Studios, CC0 (public
  domain). The upright piano is by Simon Dalzell / Ivy Audio, redistributable by Versilian. Credit is encouraged, not
  required; we credit them on `/music` and in every record.
- The scores and renders are original work for Abbie's World.
- Reference only, not used: the Moon Mission pack's music (Eric Matyas, soundimage.org, attribution required).

## Tuning check

Most VSCO file names put middle C at C3; the solo violin, harp, xylophone and piano are named at pitch. This was
measured, not assumed: each instrument's samples were pitch-tracked against their names, and the timpani (named by
drum, not note) were tuned by their strongest partial (`TIMPANI_TUNING` in `engine/instruments.py`). Notes outside
an instrument's sampled range are moved by octaves, the way an orchestrator would, and reported during the render.
