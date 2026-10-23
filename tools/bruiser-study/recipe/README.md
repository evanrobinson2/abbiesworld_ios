# Bruiser recipe: from words to Blender and back (AW-STUDY-0021)

**Status (2026-10-23): stopped, kept on record.** The scaling route for the study moved to `tools/bruiser-study/scale/`
(a cage of per-part rings learned from the Meshy mesh that drives Meshy's own vertices, 97-99.7% silhouette match at
900 to 9,000 faces, language edits via `edit.py`). This MPFB route reached 0.83 and is kept for its rigged MPFB body,
Rigify posing and the anatomy check. Results page: https://claude.ai/artifact/SdZ1jB1tQCCL3Nhn2dbi2H

This folder builds the bruiser as an engineered, rigged, low-poly character from a recipe, using the Meshy model as
the picture of "perfect". It's meant to scale: a new character is a new card, not new code.

## The loop

```
 words ──say.py──▶ character card (JSON) ──build_bruiser.py──▶ Blender: MPFB body + Rigify rig ──▶ GLB + screenshots
   ▲                       ▲                                                                             │
   │                       └──────────── fit_to_meshy.py (tunes the card against Meshy) ◀───────────────┤
   └──────────────────────────── you look at the screenshots and say what's off ◀──────────────────────────┘
```

1. **Describe.** `character.json` is the card. Its `says` line is the character in plain words. Every other field
   is a named knob in a unit a person can read:
   - `body`: MPFB (MakeHuman) macros, 0 to 1: gender, muscle, weight, height, proportions. These keep the anatomy real.
   - `shape`: MPFB detail targets by file name and weight, e.g. `torso/torso-muscle-pectoral-incr: 1.7`. Weights can
     go past 1 to exaggerate.
   - `stylise`: cartoon proportions as Rigify bone scales, where 1 is real anatomy: `head`, `neck_girth`,
     `upper_arm_girth`, `forearm_girth`, `forearm_length`, `hand`, `thigh_girth`, `shin_girth`, `leg_length`, `foot`.
   - `pose`: degrees: `arm_drop_from_vertical`, `elbow_bend`.
   - `outfit`: tank top and shorts as a thin shell cut at body landmarks (waist, mid-thigh, chest, top of shoulders)
     read off the rig, so hems stay clean whatever the proportions.
   - `lowpoly`: the Decimate ratio for the faceted look.
2. **Fit.** `fit_to_meshy.py` holds the Meshy model as the target. It renders both models as silhouettes (front and
   side, both framed by height, so only proportions count) and nudges one knob at a time, keeping any change that
   raises the overlap. Every improvement is saved as a screenshot in `steps/` (red is Meshy only, blue is ours only,
   grey is both) and logged in `fit_log.json`. The result is `character.fitted.json`.
   First run: overlap went from 0.695 to 0.830 in 80 steps (`fit_progress.gif`).
3. **Build.** `build_bruiser.py` builds the card: MPFB body, Rigify rig, stylised and posed with the rig's controls,
   frozen, dressed, decimated. It writes `out/bruiser_recipe.glb` (smooth), `out/bruiser_recipe_lowpoly.glb` (game),
   `out/bruiser_recipe_rigged.blend` (re-pose or edit by hand), and `shots/` with front, side, back and three-quarter
   renders of ours and Meshy's, plus a silhouette overlay of each.
4. **Talk back.** Look at the shots and say what's wrong. `say.py` turns a sentence into knob changes and keeps every
   version with the sentence that made it (`versions/vNNN.json`):

   ```
   python3 say.py "make the head 10% smaller" "bigger forearms" "arms closer to the body"
   Blender -b -P tools/bruiser-study/recipe/build_bruiser.py
   ```

   `python3 say.py --list` prints the words it knows. Anything it doesn't know is a sign the card needs a new knob:
   add it to the card, `bruiser_lib.apply_card`, and the `PARTS` table in `say.py`.

## Why it is built this way

- **MPFB gives real anatomy, Rigify gives control.** The body starts as a real human, so joints and limb lengths are
  right. The cartoon is a set of named departures from that (bone scales and target weights), so every exaggeration
  is visible in the card instead of hidden in sculpted vertices.
- **Meshy is the eye, not the asset.** Meshy reads the picture into a 3D shape we can measure. We don't ship its mesh;
  we fit our recipe to it. The game gets clean, named, rigged geometry with materials by role (`skin`, `tank_top`,
  `shorts`).
- **Silhouettes are honest.** Comparing masks from fixed views is a number a script can push up, and a picture a
  person can read at a glance.

## Files

| File | What it is |
| --- | --- |
| `character.json` | The starting card (hand-written). |
| `character.fitted.json` | The card after fitting to Meshy (what `build_bruiser.py` uses). |
| `bruiser_lib.py` | Blender helpers: build body and rig, apply a card, bake, dress, decimate, silhouettes, renders. |
| `fit_to_meshy.py` | The fitter. `Blender -b -P fit_to_meshy.py` |
| `build_bruiser.py` | The builder. `Blender -b -P build_bruiser.py` |
| `say.py` | Plain words to card edits, with version history. |
| `steps/`, `fit_log.json`, `fit_progress.gif` | Screenshots and log of every fitting step. |
| `shots/` | Final renders: Meshy vs recipe from four views, and overlays. |
| `out/` | The built models and the rigged Blender file. |

## Known gaps (next)

- The head is still a realistic head. His is a tall, blocky slab with a heavy brow; the silhouette barely sees that.
  Next: fit the head separately with a close-up front and side crop, or add `head` shape knobs to the fitter.
- The fitter only looks at front and side. Adding three-quarter would catch chest and back depth better.
- Forearms: Meshy's are bigger than ours reads in the shaded view; the silhouette scores them as close, so a
  per-limb crop would sharpen that.

Needs Blender 5.2 with the MPFB extension (`Blender --online-mode -c extension install mpfb --enable`) and the
bundled Rigify add-on.
