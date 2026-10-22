# Composer

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
