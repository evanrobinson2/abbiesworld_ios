# Ranch model challenge: art direction brief

Requested by Evan, 2026-10-22. Five assets from the live Ranch set list, each made in two styles.
Roles: Claude (this thread) is the art director, Midjourney (the Mac worker) is the illustrator,
and a 3D modeler builds the models. The art director then stitches it all together: checks each model
against its illustration, revises it, publishes the model pages, and writes the report.

Current versions (rendered from the live site, 2026-10-22) are in `current/`.

| ID | Asset | Skill it tests | What it is now |
|---|---|---|---|
| R-02 | Barn | complexity | red box barn, teal roof, cupola, X doors, ~1.5k tris (procedural, barn-builder) |
| R-03 | Old cedar | organic / style | low-poly broadleaf blob canopy, not cedar-like at all |
| BA-0031 | Portable beam balance | mechatronics | two posts, crossbar, beam, two teal pans on cords, 764 tris, static |
| BA-0081 | Ranch produce seller | character | blocky villager, apron, basket of onions, 9.2k tris, static pose |
| BA-0023 | Lidded reed hamper | craft / material | slatted crate; lid lies flat beside it, which reads as a bug |

## The two styles

**A. Upgrade.** The same asset, built better. Keep the ranch's look: "a little world in ink and
sunshine", warm low-poly diorama, chunky readable silhouettes, flat colors with soft light. Add
real craft: beveled edges, plank and shingle rhythm, layered parts, believable joinery, a hero detail
or two. It should sit next to the current set and look like the same game two years later. No
photorealism, and nothing gritty.

**B. Whimsical.** The same asset reimagined as storybook toy art. Exaggerated proportions, soft
curves, a bit of tilt and lean, playful character (the barn can have a personality, the balance can
be a little contraption). It must still be clearly the same object and still work as a game piece.
Think Tiny Glade meets a picture book, with no faces pasted on objects.

## Rules for every illustration (so the modeler can build from it)

- One object, centered and complete, nothing cropped. Plain warm cream background, soft studio light,
  gentle contact shadow. No scenery, no text, no frames.
- For each asset and style, one **hero** 3/4 view (what Evan sees) and one **turnaround sheet**
  (front, side, back, in the same lighting) for the modeler.
- Materials read as flat painted colors with light texture, matching a low-poly game.

## Midjourney prompts (20 jobs)

Shared tail for every prompt: `stylized 3D game asset, low-poly diorama style, flat painted colors, soft studio lighting, plain warm cream background, centered, full object visible, no text`

Hero: `--ar 1:1`. Turnaround: start with `orthographic turnaround sheet, front view, side view, back view, evenly spaced, same scale,` and use `--ar 16:9`.

### Upgrade (style A)
1. **barn-upgrade**: a cozy red timber farm barn with a teal shingled gable roof, a small cupola with a weathervane, big X-braced sliding doors on a rail, a hayloft door with a hoist beam, white trim, a stone foundation, visible plank rhythm and beveled corner posts
2. **cedar-upgrade**: an ancient western red cedar tree, a massive fluted reddish trunk with flared roots, drooping layered fan-shaped evergreen sprays in tiered clumps, a broad conical crown, a few bare dead branches
3. **balance-upgrade**: a Bronze Age portable merchant beam balance on a timber stand, a carved wooden gantry with a crossbar, a bronze beam with a pointer needle, two shallow bronze pans hung on three cords each, rope lashings, a small stone weight set at the base
4. **seller-upgrade**: a friendly Bronze Age ranch produce seller woman, linen tunic, ochre apron with a pocket, a leather belt, a hair wrap, sandals, carrying a woven basket of onions, carrots and greens on her hip, standing in a relaxed A-pose
5. **hamper-upgrade**: a rectangular woven reed merchandise hamper with a separate fitted lid sitting on top, a tight basket weave, a reinforced rim, rope handles on both ends, a toggle and loop latch

### Whimsical (style B)
6. **barn-whimsical**: a whimsical storybook barn with a tall curvy gambrel roof that leans slightly, a chubby round silo attached, a crooked cupola with a rooster weathervane, oversized round-top doors, flower boxes, a bit squashed and toy-like
7. **cedar-whimsical**: a whimsical storybook old cedar tree with a twisty, plump trunk, swirling cloud-like layered evergreen tiers, a little door at its roots, a rope swing on a low branch
8. **balance-whimsical**: a whimsical toy contraption beam balance, a bendy wooden stand, mismatched pans (a teacup and a little bowl), a seesaw beam with a cheerful pointer, springy cords, a tiny bell on top
9. **seller-whimsical**: a whimsical chibi produce seller, a big round head, rosy cheeks, a giant floppy sun hat with a carrot tucked in, an oversized basket overflowing with vegetables, a patched apron, a cheerful pose
10. **hamper-whimsical**: a whimsical plump woven picnic hamper, bulging, rounded sides, a domed lid slightly ajar with a leafy sprout peeking out, a chunky braided rope handle, a big wooden toggle

## Scoring (per model, 1 to 5)

Match to the illustration (silhouette, proportions, color), style (does it read as A or B),
complexity, mechatronics (moving parts actually rigged: barn doors slide, balance beam tips, hamper
lid opens, seller has a simple idle pose), game readiness (triangle count, scale in metres, origin on the
ground), and creativity (what the modeler added beyond the picture).
