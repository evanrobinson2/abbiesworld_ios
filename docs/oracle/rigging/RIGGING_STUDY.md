# AW-STUDY-0041 - 2D Character Rigging

Evan, 2026-10-23 13:50Z: "spin a new study on 2D character rigging and animation? maybe we have enough understanding
of humans to start drawing these things professionally in pieces with SVG tracing over top of 2D inspired SVGs built
from midjourney turnarounds etc."

Page: app.abbies.world/studies/rigging/. Format: `RIG2D_FORMAT.md`. Reps and scores: `notes.json` (creative checks by eye)
and `scores.auto.json` (joint cover and seams, measured by `tools/rig2d/score.mjs`).

## Pipeline
1. **Turnaround.** A Midjourney model sheet of a fictional adult (front, three-quarter, side, back, same scale), Relax
   mode only. Our kids are never traced from photos.
2. **Pieces.** One SVG piece per bone, drawn in the bone's own space. Limb edges come from the body study's profiles:
   bulge peaks offset between the two edges, straight against curve (`construction.json`, `anatomy.json`). Every piece
   ends in a round cap centred exactly on its pivot.
3. **Rig.** Bones named like the mannequin and aliased to the Character Studio's names; two-bone IK for arms and legs;
   draw order with outline groups; far limbs a value darker. Each turnaround view is its own rig on the same bones.
4. **Animate.** Pose to pose, eased keys. Squash and stretch keep area. IK plants the feet.

## The reps (one change each; ARTIST_METHOD.md section 4)
| rep | change | creative /24 | joints covered | seams | motion /12 | lesson |
|---|---|---|---|---|---|---|
| 1 | rectangles cut at the joints | 4 | 97% | 18% | | square cuts open a wedge outside every bend and poke corners inside |
| 2 | discs centred on the pivots | 6 | 100% | 6% | | same-radius discs on both pieces close every joint at every angle; even tubes are sausages |
| 3 | drawn forms from the body study | 13 | 100% | 10% | | offset bulges read as a body; each piece's own outline leaves a seam across the joint |
| 4 | one outline per body (auto-patch) | 15 | 100% | 0% | | all outlines first, then all fills: no seams, one silhouette; arms keep their own line |
| 5 | side view, IK legs, first jump | 13 | 100% | 2% | 2 | IK makes the walk easy; an even, flat jump with no wind-up reads as cardboard |
| 6 | anticipation, area-true squash, arcs, overlap | 19 | 100% | 2% | 11 | the same rig gets weight from timing alone |

Rep 6 is the first over the pick line (16). What still holds it back: the shape language is generic (a mannequin has
no character), contrapposto is weak at rest, and the planes are flat by design (cut-paper look; see the Oracle's
cut-paper games: "when a look is famous for being flat, any shading at all breaks it").

## Rules this study adds to the canon
- **Pivot at the centre of the joint's circle, and the same radius on both pieces.** Then the joint is a disc at any
  angle. Measure it: joint cover must be 100% in the stress pose.
- **One outline per body.** Draw a body's outlines in one pass and its fills in a second; put a limb in its own group
  only when it should keep a line where it crosses the body (an arm across the chest).
- **Squash keeps area.** Whole-body squash is `sx * sy = 1` about the ground; a stretched bone narrows by `1/sqrt(s)`.
- **Key the jump in poses:** wind-up crouch, stretch at take-off, tuck, reach, area-true squash, then arms that
  arrive 0.05 to 0.1 s late and overshoot.

## Next
- Trace the Midjourney ranch hand (front and side) onto the two rigs as a skin, and score it with the same checks plus
  outline match against the turnaround.
- Share: the 2D Mannequin Puppet (0038) can load these rigs through `rig2d.mjs`; poses use the Character Studio's
  bone names through the aliases.
Preview artifact: https://claude.ai/artifact/PaYXoSEhYDkH3jVshwQ6hj
