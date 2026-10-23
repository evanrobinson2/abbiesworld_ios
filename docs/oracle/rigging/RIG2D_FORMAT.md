# aw-rig2d v1: the shared 2D cut-out rig

AW-STUDY-0041 (2D Character Rigging), shared with AW-STUDY-0038 (2D Mannequin Puppet) and the Character Studio
(AW-STUDY-0037). Runtime: `prototypes/ranch-atelier/dist/simulations/rig2d.mjs` (browser and node, no dependencies).
Builder for the mannequin: `tools/rig2d/build.mjs`. It follows Spine's conventions so a rig can move to Spine or Rive later.

## Space
- Pixels, y down (SVG). Character space has its origin on the ground under the hip centre. `units.px_per_head` says
  how big a head is (56 for the mannequin, 7.5 heads tall).
- Angles are degrees, clockwise on screen. Every bone points along its own +x; a piece is drawn in its bone's space,
  from x = 0 (the pivot) to x = length.

## Fields
| field | what |
|---|---|
| `joints` | rest positions `{name: [x, y]}`. Names follow `tools/figure-practice/mannequin/rest-joints.json`: hc, pelvis, waist, neck, crown; per side R/L (the figure's own side): s, e, w, f (shoulder, elbow, wrist, fingertip), h, k, a, t (hip, knee, ankle, toe). |
| `bones` | `{name, parent, head, tail, alias}`: a bone runs from one joint to another. The loader computes length, rest angle and the offset in the parent's space. `alias` is the Character Studio's name (`upperarm_L`, `forearm_L`, `spine`, `pelvis`...); poses and animations may use either name. |
| `ik` | two-bone constraints `{name, bones: [upper, lower], bend: 1 or -1, stretch?, hold?}`. `bend` picks the side the middle joint goes to (Spine's "bend positive"). `stretch` (for example 1.12) lets both bones lengthen past full reach. `hold` names an end bone whose world angle the target may set (a planted foot stays flat). |
| `slots` | draw order, back to front: `{bone, piece, group?, far?}`. Slots in a run with the same `group` draw all their outlines first and all their fills on top, so the joints inside one body show no seam (Toon Boom's auto-patch). `far` marks the far-side limbs, drawn a value darker. |
| `pieces` | `{piece: {skinName: "<svg elements>"}}`. `default` is required; other skins (costumes, a traced character) swap pieces on the same bones. |
| `animations` | `{name: {duration, loop, bones, root, ik}}`, see below. |

## Poses and animations
- A pose is `{root: {x, y, sx, sy, rotate}, bones: {name: {rotate, sx, sy, x, y}}, ik: {name: {x, y, angle?}}}`.
  Bone values are offsets from rest. IK targets are absolute, in character space.
- Squash and stretch: a bone's `sx` stretches it along itself and, unless the bone sets `keepArea: false`, `sy`
  defaults to `1/sqrt(sx)`. Children ride the stretched length but never inherit the scale (Spine's "no scale" inherit).
  Whole-body squash goes on `root.sx/sy` about the ground point; keep `sx * sy = 1` so the body keeps its area.
- Keys are `[time, ...values, ease?]`. Timelines: `bones.<name>.rotate [t, deg]`, `.scale [t, sx, sy]`,
  `.translate [t, x, y]`; `root.translate`, `root.scale`, `root.rotate`; `ik.<name> [t, x, y]` or `[t, x, y, angle]`.
  Eases: `linear`, `step`, `in`, `out`, `ease` (the default, in and out). The ease on a key shapes the move to the next key.

## API
`loadRig(json)`, `solve(rig, pose) -> world transforms`, `renderSVG(rig, pose, {bones, skin}) -> string`,
`mount(rig, svgElement) -> {play(name), set(pose), stop(), bones(on), skin(name)}`, `sample(animation, t) -> pose`,
`jointPos(rig, W, bone, atTail)`, `RIG_CSS` (the flat-fill, one-ink-line look, themable with `--rig-fill`,
`--rig-far`, `--rig-ink`, `--rig-line`). The bones view (`bones: true`) is a developer helper: never in the player's view.
