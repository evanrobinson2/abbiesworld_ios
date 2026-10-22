# Modeler brief (model challenge)

You are the 3D modeler. The art director (BRIEF.md) and Midjourney (mj/) have done their part. Build each
asset in Blender Python (`pip install bpy==5.2.3`, already installed; Cycles CPU only, no EEVEE) so it matches
its Midjourney illustration, then export a game-ready GLB.

## Inputs per job `<name>` (for example `barn-upgrade`)
- `mj/<name>/hero.png`: the 3/4 illustration (the look to hit).
- `mj/<name>/view_front.png`, `view_side.png`, `view_back.png`: the turnaround sheet split into views (the shapes to hit).
  They are cut from the sheet by `split.py` and named by left-to-right order, but Midjourney doesn't always draw
  front, side and back in that order (the hamper's "front" is its end; the barn's side view is a fantasy L-shaped
  barn). Look at them, and if a view is mislabeled, re-crop or rename it in `models/<name>/views/` and score with
  that folder. If a view contradicts the hero, the hero wins: drop that view and say so in notes.json.
- `current/`: today's live version of the asset, for scale and to see what "upgrade" improves on.
- BRIEF.md: the style definitions (upgrade versus whimsical) and the asset table.

## Output per job, in `models/<name>/`
- `build.py`: a standalone builder. `python build.py` rebuilds the GLB from nothing (no hand edits). Keep
  shape numbers in a dict at the top so revisions are parameter edits.
- `<name>.glb`: exported with `bpy.ops.export_scene.gltf(filepath=..., export_format='GLB', export_animations=True,
  export_animation_mode='SCENE', export_apply=True)`.
- `notes.json`: `{"what_i_did": [[heading, sentence], ...], "good": [...], "off": [...], "rounds": [{"round": n,
  "change": "...", "mean_iou": x}], "moving_parts": "...", "creative_additions": "..."}`.
- `r/` (renders and score from the harness, see below).

## Conventions (the harness and the game depend on these)
- Z up, metres, origin at the centre of the footprint on the ground (z = 0 is the ground), front faces -Y.
- Real scale: barn about 8 to 10 m long, old cedar 12 to 18 m tall, beam balance about 1 m tall, seller about 1.65 m
  tall (whimsical chibi about 1.2 m), hamper about 0.7 m long.
- Triangle budgets: barn 10k, cedar 8k, balance 3k, seller 12k, hamper 4k. Fewer is fine if it reads well.
- Materials: Principled BSDF, flat base colours sampled from the illustration, roughness 0.7 to 0.9, no image
  textures. Name each material by what it is (RedPlank, TealShingle, Bronze...). Use a few bevels and modifiers,
  but apply them all on export.
- Give objects meaningful names (door_left, beam, pan_left, lid...). Join only what never moves separately.

## Moving parts (mechatronics is scored)
Put the animation on the scene timeline, frames 1 to 120 at 24 fps, as a seamless loop. It exports as one clip.
- barn: the big doors slide open along their rail and close again. The whimsical one can also spin its weathervane.
- cedar: a gentle sway of the crown and branches (rotate branch groups a few degrees with offset phases). The
  whimsical one can swing its rope swing.
- balance: the beam tips one way, then the other, and settles. The pans must stay hanging straight down, so
  keyframe each pan's counter-rotation or place pans with keyframed locations at the beam ends.
- seller: an idle loop. Body breathing or bob, head turn, basket sway. Rigid parts parented in a hierarchy are fine,
  and no skinning is required.
- hamper: the lid lifts on its hinge, holds, and closes. The whimsical sprout bobs.

## Loop
1. Study the hero and the three views. Write down the 6 to 10 features that make the silhouette (the
   distinctive shapes), and build those first. Small details come last.
2. Build, export, then render and score:
   `python ../../harness.py render <name>.glb r --px 384 --samples 16 && python ../../harness.py score r ../../mj/<name>` (or `score r views` if you fixed the views)
   Look at `r/compare.jpg` (target | render | overlay) and `r/hero.png` next to `mj/<name>/hero.png`, with your own eyes.
3. Revise. Fix the biggest shape and proportion errors first, then colour, then detail. Do at least 3 rounds,
   and record each round's change and mean IoU in notes.json. Stop when a round no longer helps.
   IoU is a guide, not the goal. A whimsical piece that reads right but scores 0.02 lower beats one that doesn't.
4. Final: `python ../../harness.py render <name>.glb r --px 768 --samples 48` and score again.

Don't commit or push; the art director does that. Don't touch files outside `models/<name>/`.
