# AW-STUDY-0038 - 2D Mannequin Puppet

Evan (2026-10-23 13:44Z, in the figure-practice thread): "update that 2D to be a rigged toy I can puppeteer? and make
some stock puppeteering? add that as the 2D version of this character studio". It is the 2D side of AW-STUDY-0037,
the Character Studio.

- Page: `prototypes/ranch-atelier/dist/studies/character-studio/puppet.html` (live at `/studies/character-studio/puppet.html`,
  `?move=Walk` opens a move). One self-contained file, no libraries.
- Advance preview: https://claude.ai/artifact/Y7azQYb5Bayp7DNzRDVKpn

## The rig
- The figure is the blue-graphite mannequin from `tools/figure-practice/make_svg.py`: same part shapes and widths, same
  joints read off Evan's photo, true bone lengths. Two changes for a side-view puppet: the shoulders sit together at the
  top of the chest and the hips close up (the photo is three-quarter view), and the far arm and leg draw behind the body.
- Bones carry the Character Studio's shared names (`studies/character-studio/rig.mjs`): spine, chest, head,
  upperarm/forearm/hand, thigh/shin/foot, `_L`/`_R` the figure's own side. Joint handles use the names in
  `tools/figure-practice/mannequin/rest-joints.json` (hc, neck, crown, e, w, f, k, a, t).
- The figure faces screen right. Angles are SVG degrees: 0 hangs down, -90 points forward, 180 up.

## Puppeteering
- Drag a joint. Elbows, knees, fingertips, toes and the head turn their bone. Wrists, ankles and the neck reach with IK
  (cyclic coordinate descent over two bones), and the hand, foot or head keeps its angle. The hips move the whole figure;
  with "pin feet" on, the legs bend so the feet stay put, which is how you crouch.
- The nearest joint dot wins a press, so a hand resting on the hip never steals the hips. A press while a move plays
  stops it and hands you the figure.
- Every drag sets a key at the playhead (auto-key). The strip shows the keys; tap one to go to it. Ghosts show the keys
  either side. Mirror swaps left and right. Star keeps the move in this browser; copy puts it on the clipboard as
  Character Studio pose data (per key, `{bone: [x, 0, 0]}` degrees from standing, +x swings back, root in hip heights).

## Stock moves (18), by game genre
Everyday: Idle, Wave. Platformer: Walk, Run, Jump, Leap (Evan's photo pose, crouch to leap). Story: Bow, Shrug, Sad.
Sports: Cheer, Kick. Fighting: Jab cross. Rhythm: Disco, Robot (stepped keys). Stealth: Sneak. Life sim: Sit down.
Arcade: Windmill. Acrobatics: Backflip (root roll through 360).

Moves are authored as world angles over a standing pose and grounded automatically, so a new move is a few lines.
While a move plays the figure never sinks through the floor.

## Layers
The figure, its floor and its shadow are the world. Joint dots, ghosts, the line of action and the controls are the
presentation layer, drawn only for the player; the dots hide while a move plays.

## Next
- When the Character Studio's `moves.mjs` lands, add a "From the 3D studio" tray that projects its x angles onto this rig.
- Squash and stretch on the bones (the practice SVG already fakes foreshortening as a squash along the bone).
