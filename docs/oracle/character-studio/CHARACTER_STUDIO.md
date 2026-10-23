# AW-STUDY-0037 Character Studio: how studios make people move

Page: https://app.abbies.world/studies/character-studio/ (3D stage, the 2D puppet next door, and a golden-hour crowd).
Code: `prototypes/ranch-atelier/dist/studies/character-studio/` and `tools/character-studio/`.

## Why the first round failed

Evan, 2026-10-23 14:12Z, looking at the Meshy brute waving with a caved face and a torn shoulder: "this animation is
clearly not usable.. we have so much in oracle, why aren't you using it, why isn't it working?"

The honest answer had three parts.

1. **Every move was hand-keyed by an AI from numbers.** Fifty moves, each written as a handful of Euler angles. The
   poses were right; the motion between them was not. There was no weight shift, no overlap, no follow-through, and
   timing was evenly eased.
2. **The brutes were the wrong bodies to show it on.** Their meshes were auto-weighted (heat weights on a 3k-triangle
   Meshy scan) and painted by projection, not by UV. A raised arm pulls the shoulder and face apart. They are now off the
   studio until the Meshy retexture and real skin weights land (Texture Studio, AW-STUDY-0040, and Meshy heroes,
   AW-STUDY-0043).
3. **The Oracle has nothing on animation, and nobody checked.** We ran it after the fact:
   - The game identity schema (`docs/oracle/identity/GAME_IDENTITY.md`, art layer) has a `motion` field: "animation
     style (procedural, keyframed, physics), how alive the idle world is". **None of the 380 game records fill it in.**
     Only five records mention animation at all (Dragon's Lair, Jotun, Dispatch, Yu-Gi-Oh! Master Duel, Disney
     Dreamlight Valley), and only as a one-line art note.
   - The `consult` director, asked for "50 believable human animations from every game genre, a golden-hour crowd that
     looks like film", answered with Tiny Glade, Cartel Tycoon and Anno 117 and the rules "fences drawn as strokes"
     and "ranch supply chains". It matched on the word "build" in our wording. Nothing about motion.
   - The Oracle does know how things are *drawn* ("How it's drawn" per game, the Storybook study), so the shading
     pass could use it. The motion pass could not.

So the Oracle wasn't ignored because it was full; it was skipped and it was empty. This study fills the animation gap
with real outside sources, writes down what we took, and logs the Oracle work in `docs/oracle/BACKLOG.md`.

## Deep consult: how studios get believable motion

| Source | What it says | What we did |
| --- | --- | --- |
| Simon Clavet (Ubisoft Montreal), *Motion Matching and The Road to Next-Gen Animation*, GDC 2016 ([GDC Vault](https://gdcvault.com/play/1023280/Motion-Matching-and-The-Road)) | Believable motion comes from real captured motion, played back in long unedited stretches. For For Honor they shot "dance cards" and let the runtime pick the best next frame. | Real mocap is now the default ("Real motion" on). 33 of 50 moves are motion capture, cut from long takes, not keyed. |
| David Rosen (Wolfire), *An Indie Approach to Procedural Animation*, GDC 2014 ([GDC Vault](https://www.gdcvault.com/play/1020583/Animation-Bootcamp-An-Indie-Approach), [summary](https://gamedeveloper.com/design/video-an-indie-approach-to-procedural-animation)) | Overgrowth animates with very few key poses and lets procedure (springs, stride-matched cycles, physics) do the in-betweens. Few keys plus good interpolation beats many bad keys. | The seventeen moves with no good capture (idle, hang, climb, swim, tiptoe, kart, bike, cast, bow, clap and others) stay hand-keyed, but the walk family keeps its procedural, stride-matched gait, and the crowd uses that for variety. |
| David Bollo (The Coalition), *Inertialization: High-Performance Animation Transitions in Gears of War*, GDC 2018 ([GDC Vault](https://gdcvault.com/play/1025165/Inertialization-High-Performance-Animation-Transitions)) | Don't cross-fade two clips; let the old motion's velocity decay into the new pose. Cross-fades are what make game characters float. | One-shots blend their last 0.35 s back into their first frame with a smoothstep. Proper inertialization between moves is the next step (listed below). |
| Daniel Holden (Ubisoft La Forge), [Code vs Data Driven Displacement](https://theorangeduck.com/page/code-vs-data-driven-displacement) and [Learned Motion Matching](https://theorangeduck.com/page/learned-motion-matching) | Foot sliding comes from moving the character at a speed the animation didn't record. Let the animation's own root motion drive travel. | The retargeter measures each walking clip's hip travel; the stage moves the body at exactly that speed (`speed` in hip heights per second), so feet plant. |
| CMU Graphics Lab Motion Capture Database ([mocap.cs.cmu.edu](http://mocap.cs.cmu.edu/)), BVH conversion by cgspeed | 2,500 takes, free for any use including commercial; the request is a credit line. | The source of all 33 clips, credited in the studio and in `mocap/index.json`. |
| Frank Thomas and Ollie Johnston, *The Illusion of Life* (1981): the twelve principles | Weight, overlap, follow-through, slow-in and slow-out, arcs, secondary action. | Our check list for the hand-keyed seventeen, and the reason we cut loops on matching frames (a pop at the loop breaks "arcs"). |
| Sony Pictures Animation on *Spider-Verse*: animating "on twos" | Stepping at 12 drawings a second reads as hand-made, not as low frame rate, when the whole frame steps. | The clay, village and stick directions step the pose and the surface "boil" together at 12 a second. |
| Our Storybook look, AW-STUDY-0028 (`docs/oracle/storybook/STORYBOOK_STUDY.md`) and the Oracle's "How it's drawn" notes | Film reads at a distance through contact shadows, air, a soft focal plane and a warm grade, not through polygon count. | `simulations/film-look.mjs`: the Storybook post chain (AO, height haze, depth of field, bloom, grade) as a shared module. The studio and crowd both render through it. |

Asked of Evan and declined: animation "pulled from defunct studios with no claim to rights". A closed studio's work is
still owned by someone (a buyer, a publisher, a liquidator), so we can't ship it. CMU, 100STYLE and Quaternius are
free with clear licences and cover the same ground.

## The pipeline (so the next character skips this)

1. **Skeleton**: one 20-bone humanoid shared with the brute fight (`rig.mjs`, `BONES`). Faces +Z, Y up. Any rest pose
   works: `rigSkinned` learns the rest and corrects each limb to the mannequin's A-pose.
2. **Pick a take**: `tools/character-studio/mocap/clips.json` maps a move to a CMU take (subject_trial), with `loop`
   and loop length limits.
3. **Retarget**: `python3 tools/character-studio/mocap/retarget.py clips.json <bvh dir> <out dir>` (about a minute).
   Per frame it takes each bone's world rotation relative to the take's T-pose, maps our A-pose limb direction onto
   it, aligns heading to travel, finds a loop on matching frames (moving hips only) or keeps the busiest 5 seconds.
4. **Play**: `mocap.mjs` loads `mocap/index.json`; `applyPose` reads `pose.q` world quaternions. Every body on the
   skeleton (mannequin, smooth mannequin, Meshy heroes, the 2D puppet's tray) gets all of them.
5. **Check before showing**: the first contact sheets caught two things a quick look would have shipped: every hand
   was NaN (the CMU finger joint sits at zero length, so the hand's direction came from a 0-length bone; it now points
   at the index finger), and seven takes read wrong: a stretch-and-yawn "idle", a playground hang and climb with no bar,
   a pantomimed swim standing upright, a tiptoe and an aim-walk that read as plain walking, and a twist that was the
   same take as the cheer. Those seven went back to hand-keyed.
6. **Contact sheets**: every move at three or four moments (`tools/character-studio/thumbs.mjs`
   renders the drawer's tiles the same way). Nothing goes to Evan unseen.

## The next characters (round 1)

Evan asked where the claymation and Midjourney "next characters" were. Four turnaround sheets were made in Midjourney
(Relax mode, Evan's account), one pick each, upscaled:

| Character | Pick | Grid job | Upscale job |
| --- | --- | --- | --- |
| Clay adventurer | grid 1 | 4a8e95be | bad2df2e |
| Plasticine inventor | grid 3 | 6d74c041 | 28c993df |
| Stick man | grid 2 | a621d6e0 | 3101d933 |
| 80s action hero | grid 3 | 43251376 | 8f8ff88c |

Full prompts, ids and hashes: `tools/midjourney/outputs/character-studio/*/provenance.json`.

**How they're built.** `characters.mjs` is the recipe: engineered parts, not image-to-3D. Each character is the wooden
mannequin's 30 named parts (pelvis, abdomen, chest, upper_arm_L...) with its own proportions (a rest-joint table per
character, same A-pose) and its own shapes and clothes; hats, packs, a sword and a cape hang on the part they belong
to. `rigMannequin` parents them to the same 20 bones, so all 50 moves and the mocap play on them with no extra work.
Materials are named by what they are (skin, jacket, suit, boots...), and the art directions keep a recipe character's
own colours and face, changing only how they're made (clay dents, cel shading and ink).

**The Cast room** (`cast.html`) shows each one beside its picture, with a live viewer that plays the same moves.

**Self-score, round 1** (side by side with the picture, front, side and back):
- Stick man: closest. Ink lines, paper head, sword and cape all read. The sketchy line quality isn't there yet.
- Plasticine inventor: silhouette, knit, corduroys, long neck and grin read. The ears and hands are smaller than in the picture.
- Clay adventurer: colours, hat, googly eyes and boots read. The puffer jacket and hood aren't as puffy and bunched as the picture.
- 80s action hero: colours and costume layout read. It has none of the drawn muscle and no ink piping yet, and the
  face is too plain.

Lesson for the next rep: build the silhouette first from the side view (the puffer's hood and the hero's V read from the
side), then the costume. A round pec reads as the wrong thing at a distance; use one flat chest plate.

## What's next

- Inertialized transitions between moves (Bollo), so a change of move keeps momentum.
- Fill the Oracle's `motion` field for the genre references in `moves.mjs` (Animal Crossing, Celeste, Street Fighter,
  Zelda, Little Nightmares, Wii Sports, Splatoon, Minecraft, Just Dance, Mario Kart, Fall Guys). Logged in the backlog.
- The Meshy heroes on real weights (AW-STUDY-0043) and the Midjourney "next characters" in clay and 80s-action, built
  in 3D and added to the cast when the Mac is back.
