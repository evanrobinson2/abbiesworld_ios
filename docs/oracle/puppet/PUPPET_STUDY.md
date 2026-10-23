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

## Stock moves (19), by game genre
Everyday: Idle, Wave. Platformer: Walk, Run (one gait, a walk-to-run dial), Jump, Leap (Evan's photo pose, crouch to
leap). Story: Bow, Shrug, Sad, Sad walk.
Sports: Cheer, Kick. Fighting: Jab cross. Rhythm: Disco, Robot (stepped keys). Stealth: Sneak. Life sim: Sit down.
Arcade: Windmill. Acrobatics: Backflip (root roll through 360). Sneak is a gait too.

Moves are authored as world angles over a standing pose and grounded automatically, so a new move is a few lines.
While a move plays the figure never sinks through the floor.

## Round 2: the animation pass (Evan 10:07 AM: "the walk and run look like a computer pretending")
What was wrong, and what the Oracle already knew (Shoulder study, locomotion):
- **Keyed walk cycles slide.** Four posed keys can't keep a planted foot planted. Now walks are a gait engine: each
  foot follows a path (heel strike, flat, heel rise over the toe, toe off, swing), the floor's board seams slide back
  at exactly the stride's ground speed, and two-bone IK bends the knees to reach it. The planted foot never slides.
- **The hips were placed, not carried.** Now they ride as high as the legs allow (an inverted pendulum: lowest in
  double support, highest over the planted foot), plus a small "down" just after contact. A run is a spring instead:
  lowest mid-stance, a flight phase between steps.
- **Smoothstep between every key stops the body at every key.** Keys now play through Hermite splines, so motion
  flows through them; two equal keys make a hold, the only place that should ease to a stop.
- **Everything moved in lockstep.** Overlap: the chest, head, arms, forearms and hands sample 20 to 100 ms later
  than the hips, so they drag and follow through. In the gait the arms counter-swing the opposite leg and trail it.
- **Walk to run is one dial** (the Oracle's speed blend): cycle time, stride, duty, lean, bob, arm pump and heel
  kick all blend, and the name reads Walk, Jog or Run. Sneak and Sad walk come from the same engine with their own
  numbers. Dragging a joint on a gait bakes it into 16 keys you can then edit.
- Speedup for next time: start any locomotion from the gait engine and the Oracle's locomotion list, never from
  posed keys.

## Layers
The figure, its floor and its shadow are the world. Joint dots, ghosts, the line of action and the controls are the
presentation layer, drawn only for the player; the dots hide while a move plays.

## Next
- When the Character Studio's `moves.mjs` lands, add a "From the 3D studio" tray that projects its x angles onto this rig.
- Squash and stretch on the bones (the practice SVG already fakes foreshortening as a squash along the bone).
