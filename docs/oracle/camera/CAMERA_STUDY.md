# AW-STUDY-0018 - Camera and Controls on Open Land

Oracle study, 2026-10-23. Evan: "review oracle tell me what controls are actually used in these games our's done work
when there's true land". The sandbox camera was built for a floating hex diorama. On the Basin (`/sandbox?world=basin`),
a continuous valley 6.4 km across, it stops working. This study says why, what the games in the Oracle actually do
with mouse, touch and gamepad, and what Abbie's World should do. A prototype of the recommendation is in
`prototypes/ranch-atelier/dist/simulations/land-camera.mjs`.

**Confidence.** Game controls come from knowledge of the games and their public control references, not from captures
(this environment cannot reach Steam or video hosts). Each row is marked: `high` (well known, the default bindings), or
`est` (an estimate; the PC's library assimilation thread should confirm it in a play session). Abbie's World facts come
from code on `main`. We take the idea of a control scheme, never a game's code, curves or assets.

## Why ours breaks on land (verified in code)

The sandbox uses three.js `OrbitControls` (`simulations/lab.mjs`, `simulations/scene.js`) plus our wheel handler
(`sandbox-camera.mjs`). Five things go wrong once the land is real:

1. **The pivot floats.** `OrbitControls` orbits a free point. Its pan is screen-space (`screenSpacePanning` defaults to
   true), and our Shift-wheel pan uses the camera's own right and up vectors. Dragging up the screen lifts the pivot
   into the sky; over a ridge it sinks into the hill. On a flat board you never notice.
2. **The camera goes through hills.** Zoom dollies toward the floating pivot, with nothing that knows where the ground
   is. Nothing lifts the camera over a ridge between it and what you look at.
3. **One finger spins the world.** Touch is `ONE: ROTATE`. On a diorama that is right: you turn the toy. On land
   you want to travel across it, and every game and map app on a phone puts that on one finger.
4. **The tilt doesn't follow the zoom.** Close up the view stays as steep as it was high up, so you look at your
   feet instead of along the valley. The minimum distance is 1.2 units (12 m), so you cannot get down into the land.
5. **No keyboard or gamepad.** Nothing moves the camera without a mouse or a finger.

## What the games actually do

Library games Evan owns are marked `owned`. "Tilt follows zoom" means the view flattens as you zoom in.

| Game | Camera | Mouse | Keys | Touch / gamepad | Zoom to ground | Terrain and bounds | Conf. |
|---|---|---|---|---|---|---|---|
| Tiny Glade (owned) | orbit diorama | left draws; right-drag turns; middle-drag or drag pans; wheel zooms | WASD move, Q/E turn | DualShock, partial: sticks move and turn, triggers zoom | yes, down to near the grass; tilt follows zoom | camera rides over the land; small fixed plot | est |
| Townscaper | orbit around the town | left adds, right removes; drag turns; wheel zooms | WASD / arrows | phone: one finger turns, pinch zooms | low, never first person | water plane, soft radius | est |
| Dorfromantik (owned) | orbit over a flat board | left places; right/middle drag pans and turns; wheel zooms | WASD pan, Q/E turn | controller supported | tilt follows zoom, never ground level | infinite flat board | est |
| Manor Lords (owned) | RTS camera over real terrain | wheel zooms; middle-drag turns; edge scroll (toggle) | WASD, Q/E | controller supported | all the way down; walk mode as a villager (third person) | collides with terrain; map clamp | high |
| Anno 117 (owned) | city-builder camera | wheel zooms toward the cursor; drag pans; middle-drag turns | WASD, Q/E (45° steps or free) | console Anno: left stick pans, right stick turns, triggers zoom | tilt follows zoom; free camera close to the street | island bounds; height floor | high |
| Planet Zoo (owned) | free orbit | right-drag turns; middle-drag pans; wheel zooms | WASD, Q/E turn, R/F tilt | no pad on PC | to ground; follow any animal or guest | terrain collision; park bounds | high |
| Captain of Industry (owned) | RTS over real terrain | middle-drag turns; wheel zooms | WASD, Q/E | none | low, not first person | terrain collision | est |
| Company of Heroes (owned) | RTS | edge scroll; middle-drag turns; wheel zooms (Alt-wheel tilts) | arrows / WASD | none | limited | height floor; map edge | high |
| Against the Storm (owned) | fixed-angle top-down | edge scroll; drag pans; wheel zooms; no turn | WASD | none | no | clearing bounds | high |
| TABS (owned) | free fly, then possess | right-drag looks | WASD fly | partial | possess any unit: first and third person | free | high |
| 9 Kings (owned) | fixed | wheel zooms a little | none needed | full controller | no | fixed board | high |
| Bricktales (owned) | orbit diorama | right-drag turns; wheel zooms | WASD | sticks turn and zoom | no | diorama | est |
| WorldBox (owned) | 2D map | drag pans; wheel zooms | WASD | phone: one finger pans, pinch zooms | no | map edge | high |
| Apple / Google Maps (the touch standard for land) | 3D map | drag pans; wheel zooms to cursor; Ctrl/right-drag turns and tilts | arrows | one finger pans, pinch zooms, twist turns, two-finger vertical drag tilts; double tap zooms in | to street level | globe | high |

What they share, in the games built on real land (Manor Lords, Anno, Planet Zoo, Captain of Industry, Maps):

- **The pivot lives on the ground.** You always look at a point on the land, and moving slides that point across the
  land. Height comes from the land, never from the drag.
- **Grab the land.** On touch, and in most modern builders on the mouse, one finger or the left button drags the land
  like a map: the spot under your finger stays under it. Turning goes to the right or middle button, or to two fingers.
- **Zoom goes toward the cursor**, and the view **tilts toward the horizon as it comes down**. High up you look down
  like a map; low down you look along the valley.
- **Terrain is a floor, never a wall.** The camera rises over ridges instead of passing through them, and keeps a
  height floor above the ground.
- **Edge scroll** is a strategy-game habit (Anno, Company of Heroes, Against the Storm, Manor Lords toggle). The cozy
  builders (Tiny Glade, Townscaper, Dorfromantik) leave it out. In a browser window it fires whenever the mouse heads
  for the address bar, and children don't expect it.
- **Follow** moves the pivot with the creature (Planet Zoo, Manor Lords, TABS). Any grab ends it.
- **The bottom of the zoom** is where they differ. Most stop at a height floor. Manor Lords (walk as a villager), TABS
  (possess a unit) and Planet Zoo (follow a guest) step into the world. AW-STUDY-0011 found the best form of that
  step: one continuous dolly down onto the character, never a cut and never a fade.
- **Gamepad** in console builders: left stick moves (faster when you are higher), right stick turns and tilts,
  triggers zoom, A acts on the centre of the screen, B backs out.
- **Selection** is a tap or click that didn't move. Drags never select, so moving and choosing never fight.

## Recommendation for Abbie's World on open land

One camera for all land worlds, separate from the board camera, which stays exactly as it is on the hex dioramas.

| | Mouse and keys | Touch | Gamepad |
|---|---|---|---|
| Move | left-drag grabs the land; Shift-wheel; WASD / arrows | one finger grabs the land; two fingers drag | left stick (speed grows with height) |
| Turn | right- or middle-drag sideways; Q/E | two-finger twist | right stick sideways |
| Tilt | right- or middle-drag up and down; R/F | automatic with zoom (two-finger tilt later) | right stick up and down |
| Zoom | wheel, toward the cursor; trackpad pinch; Z/X | pinch, around the fingers | RT in, LT out |
| Step in (first person) | keep zooming in at the bottom | keep pinching in at the bottom | keep RT held at the bottom, or A |
| Step out | wheel out, or Esc | pinch out | LT or B |
| In first person | drag to look; WASD walks, Shift runs; click the ground to walk there | drag to look; tap the ground to walk there | left stick walks (full push runs), right stick looks |
| Select | click without moving | tap without moving | A on the centre of the screen (with the board's selection cue) |
| Follow | tap a creature (existing follow), any grab ends it | same | same |
| Edge scroll | off (an opt-in setting later for grown-ups) | n/a | n/a |

The rules behind it:

1. **The pivot is a point on the ground.** Its height is `heightAt(x, z)` (or the water's surface), never the drag.
2. **Tilt follows zoom**: 64° above the horizon at the top (4.2 km out), easing to 13° at the bottom (9 m out). A
   right-drag adds up to ±30° of the player's own taste on top.
3. **Lift over ridges, fast up and slow down.** If the land between the camera and the pivot would block the view, the
   camera rises in pitch until it clears; it lifts quickly and settles slowly (AW-STUDY-0011's collision rule turned
   on its side for a strategy camera). It never comes closer than 2.5 m to the ground.
4. **The bottom of the zoom is your own eyes.** Zoom in past the bottom and the camera makes one continuous 1.2 s move
   down to 1.6 m eye height, facing the way you were looking, the field of view opening from 34° to 52°. No cut, no
   fade, no words. Zoom out and you rise back to the overhead view. Once a land world has a player character, the
   same move lands on the soft shoulder from AW-STUDY-0011 instead of the eyes.
5. **The land sets the bounds.** The pivot stays inside the map (400 m in from its edge). On foot the lake and the
   map's edge stop you, and you can wade the rivers. How would a character know where the world ends? The lake.
6. **Presentation only.** The camera adds nothing to the world layer, shows no gizmo, reticle or label, and every HUD
   rule stays as it is. Reduced motion shortens the dive to a third of a second.

## Prototype

`simulations/land-camera.mjs` implements all of the above (about 200 lines, no new dependencies). It takes over only
when a land world asks for it: the Basin calls it from `basin/basin-world.mjs`, and while it owns the view the board's
`OrbitControls` stand down. Developers can read `window.landCamera.state` and `canvas.dataset.landCamera`
(`land`, `diving`, `eye`, `rising`).

Not built yet, on purpose: two-finger tilt on touch, edge scroll, a gamepad selection cue, and the follow hand-off
(the existing `camera-follow.mjs` translates the board's pivot; on land it should move the ground point instead).

## Who owns what

- Sandbox v2 owns the sandbox controls; this camera is a land-only module that doesn't change the board's controls.
- AW-STUDY-0011 owns the shoulder camera and the character's body. Its dive rule is the first-person step here.
- The Frontier world tiles thread owns the Basin and Evan's local sandbox, where this is tried first.
