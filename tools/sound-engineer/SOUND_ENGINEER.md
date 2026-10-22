# The sound engineer

The sound engineer is the role (a Claude session, or the GitHub Action on its own) that gives Abbie's World its
sound: it keeps a library of every situation the game is likely to need, picks the best recording for each,
cuts and levels it to one standard, stores it, and wires it into the game. Nobody has to decide up front which
sounds we need; the starter library covers the common cases and the full index covers the rest.

## Standards

| | Ambience beds | One-shots (animals, effects) | Interface | Music stingers |
| --- | --- | --- | --- | --- |
| Length | about 45 s, seamless loop | one take, up to the slot's `len` | under 1.5 s | up to 6 s |
| Loudness | −23 LUFS | −18 LUFS | −20 LUFS | −18 LUFS |
| Channels | stereo | mono (the game places it in space) | mono | mono |
| Peak | true peak under −1 dBTP for all | | | |
| Format | MP3, VBR (q5 beds, q3 one-shots), 44.1 kHz | | | |

Levelling everything to these targets means the game can mix by role (beds quiet under one-shots, interface just
above) without per-file gain. Loops get a 2 s crossfade from the end into the start, so they don't click.

## How a sound is chosen (pick.mjs)

1. **Match names.** Every file in the index is scored against the slot's search terms (whole words, plurals and
   -ing allowed). A term in the file name beats one in the folder name; a matching UCS category adds weight;
   words like gunshot, gore and scream rule a file out. At most three files per folder make the shortlist.
2. **Check the file.** The best six get their WAV header read (one small request each): length, sample rate,
   channels. Ambiences need a long stretch; anything under 44.1 kHz loses points.
3. **Find the take.** For one-shots the first 20 s of the winner are downloaded and silence detection (relative
   to the loudest moment) finds each separate sound. Multi-take files give the slot its variants, so a footstep
   set sounds like one pair of shoes.
4. **Record why.** picks.json keeps the takes, the shortlist with scores and reasons, and notes.

To change a choice by hand, edit that slot's `takes` in picks.json (any file from the index, any trim) and run
build and store again for it; pick.mjs `--keep` leaves hand-made picks alone. To add a situation, add a line to
library.mjs. Changes make new versions: sounds are stored by content hash, so an old URL never changes meaning.

## Where it plays in the game

`prototypes/ranch-atelier/dist/simulations/ranch-sound.mjs` behind the Ranch's "Quiet ambient sound" toggle:
a bed for the time of day and weather (dawn, day, dusk, night, rain, storm, wind, snow), the rooster at dawn,
songbirds by day, an owl at night, thunder in storms, and the animals you have (hens, cows, goats, horses) now
and then. It reads `/api/sounds` (or the bundled manifest) and keeps its old synthesised chirp if no audio loads.
`GAME_USES` in catalog.mjs records those assignments so `/sounds` shows "Where the game plays it".
