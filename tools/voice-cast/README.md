# Voice cast (AW-STUDY-0030, Family cast)

One designed ElevenLabs voice per character, shared by every memory place and by live mode. Designed voices only
(Voice Design from a written description), never a clone of a real person. Kid characters are described as an adult
voice actor performing a young character, because ElevenLabs Voice Design blocks descriptions of children's voices.

- `cast.json`: the characters (looks, two voice descriptions, sample line), `picks` (candidate per character) and
  `voices` (saved ElevenLabs voice ids). The study page reads a copy at `dist/studies/family-cast/cast.json`.
- `cast.py design | save --picks id=n,... | lines <game>`, run by the `voice-cast` workflow (manual). Audio goes to R2
  (`voices/...`, played same-origin via `/r2/`), never git.
- Every saved voice also speaks any new line live (streaming TTS, `eleven_flash_v2_5`), not just pre-rendered lines.

## Per-unit voice and sounds

`dist/simulations/unit-voice.mjs` resolves how any unit sounds: `speaks`, `voiceId`, `model` and `soundPack`.
Order: the kind's default (kid, grown-up, dog, animal, thing) <- the cast entry (and an optional `profile` object on
it) <- the player's override for that one unit (`set(unitId, patch)`, `reset(unitId)`, stored per device).
Sound packs name sound-store slots (`sounds/manifest.json`) per moment: `vocal`, `happy`, `step`, `effort`.
The study page's per-character Voice / Speaks / Sounds pickers use it; game pickers should too.
