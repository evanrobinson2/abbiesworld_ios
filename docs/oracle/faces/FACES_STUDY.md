# AW-STUDY-0039 - Facial Expressions

Part of the character studio (AW-STUDY-0037). Asked by Evan, 2026-10-23 13:44Z: learn from the Game Oracle how games do
facial expressions, and turn that into a system our characters use.

- Page: `prototypes/ranch-atelier/dist/studies/faces/` (app.abbies.world/studies/faces/)
- Advance artifact: https://claude.ai/artifact/DKXmGABmdG9hG2wxjjUQpn
- Kit: `simulations/face-kit.mjs` (expression set, FaceDriver, line parsing, visemes, painted face, emote bubble) and
  `simulations/face-rig3d.mjs` (3D toy: bone face + blendshape mouth + decals, painted swap mode, faceless body)
- Library data: `studies/faces/games-faces.json` (40 Oracle games, schema `oracle.faces.v1`)
- Context engineering: `studies/faces/context.json` (shown as the right-side card)

## What games do (six techniques)

| Technique | How | Your games | Best when |
|---|---|---|---|
| Blendshapes | sculpted face shapes mixed by weight, often from performance capture | RDR2, GTA V, Cyberpunk 2077, Mass Effect Andromeda, The Alters | the camera comes close and there is budget |
| Bone face | joints move brows, lids, jaw | TF2, Garry's Mod, Telltale (Wolf Among Us, Batman), Dispatch, BioShock Infinite, Dreamlight Valley, Bluey, KSP | stylised characters, shared rigs |
| Texture swap | drawn sheet of eyes/brows/mouths swapped | Cult of the Lamb, Don't Starve, South Park, LEGO Bricktales, Oxygen Not Included, Starbound | cartoon and toy looks, 2D puppets |
| Portraits | big face beside the words, small figure in the world | Hades, The Pale Beyond, Papers Please | iso or far cameras |
| Decals and bubbles | blush, tears, sweat, sparkle; thought bubbles | RimWorld, Cult of the Lamb, Dave the Diver | far cameras, kids' readability |
| Faceless | body, voice and camera act | Among Us, Helldivers 2, Astroneer, Superhot, Stacking, Bastion, Portal, Gris, Overcooked 2 | helmets, toys, tiny figures |

Why it works, in one line each:
- Camera first, then the face budget (GTA V, Twelve Minutes, Hades).
- Eyes alive or not at all: blinks, darts and a held beat (the Mass Effect Andromeda lesson).
- Voice and script tags can drive the face automatically (Cyberpunk 2077's JALI, Starbound's typed emoticons).
- The game state can drive the face (Kerbal Space Program).
- Exaggerate for the distance (TF2); below ~40 px switch to body plus a bubble (RimWorld).
- A fixed toy face is still expressive if the body acts (Stacking, LEGO).

## Our system

1. **Expression set** (18): calm, happy, joy, laugh, sad, grumpy, surprised, worried, yuck, curious, thinking, proud, shy,
   sleepy, determined, mischief, love, confused. Each defines face channels (brows L/R, lids, squint, gaze, pupil, smile
   L/R, jaw, wide, pucker, blush, tear, sweat, sparkle), body (tilt, nod, turn, chest, shoulders, lean, bounce, arm pose),
   a far-away emote, an ElevenLabs v3 voice tag, and a mood (valence, arousal) that can steer music and light.
2. **FaceDriver** layers: mood (slow), expression (snap in, hold, ease back to mood, with a blink on each change), life
   (blinks every 2-5 s, saccades, breathing), speech.
3. **Lines drive voice and face**: `[joy] A gold coin! [surprised] It's warm...`. `parseLine` turns tags into expression
   changes (synonyms such as excited, giggles, whispers map in); `?` makes curious, `...` thinking, `!` raises intensity.
   `voiceText` gives the voice the same tags. Mouth shapes: 10 visemes from letters (`textToVisemes`), re-synced by voice
   word-boundary events (`sync(charIndex)`); scripted lines should store ElevenLabs character timestamps next to the
   audio; live streams can fall back to loudness (`setAudioLevel`).
4. **Three renderers, same numbers**: 3D rig (bones + blendshapes + decals), painted (swap sheet on a texture), faceless
   (body only). A 2D puppet face (`drawFace2D`) for the 2D character studio.
5. **Distance**: the page measures the face's height on screen. Under 40 px it pushes the expression (x1.3) and body; under
   18 px x1.45; the emote bubble appears, on the presentation layer only.

## Rules

- Kids' faces are never redrawn: the kit animates parts a character already has; no likeness painting, no photos.
- PG: grumpy not furious, worried not terrified, yuck not gross-out.
- No player-face capture (Before Your Eyes' webcam blinks stay out).
- Face and body are world layer; the bubble is presentation layer.

## Next

- Fit the rig to the rigged wooden mannequin and the Meshy heroes (AW-STUDY-0037); add the 18 feelings as stock
  expressions to the 2D puppet.
- Store viseme tracks beside the family cast's pre-rendered lines.
- Per art direction (claymation, stick figure, 1980s action cartoon, comic hero): one tuned sheet of shapes on the same rig.
