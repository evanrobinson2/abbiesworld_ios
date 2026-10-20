# Local tile physics integration

Updated 2026-10-20. Local integration only; no production deployment.

## Runtime and contracts

The Ranch adapter now uses `RigidWorld` (`rigid-world.mjs`), backed by pinned
Rapier 0.21.0 with embedded WASM. The original `PhysicsWorld` remains a small
reference solver and coordinate/profile utility, not the Ranch runtime.

All coordinates are metres, masses kilograms, and time physical seconds. The
solver runs at 120 Hz with 8 solver iterations and selective actor CCD (up to 4 CCD substeps).
CCD activation uses a conservative bound on relative speed against tile surfaces
and peer bodies, rather than absolute common free-fall speed.
Moving-tile contact also bounds relative travel to half the smallest affected
actor radius, including angular sweep and gravity, with at most 128 native
microsteps per fixed step. Excessive motion cancels explicitly. Single-tile
meshes use those conservative steps instead of redundant tile-side CCD; tile-side
CCD and the support shell remain enabled when another tile can collide. A
100 m/s moving-tile regression verifies the conservative stepping.
Calendar speed never multiplies physical time. The host caps a rendered frame's
time contribution at .05 seconds, so overloaded scenes run physics slowly rather
than catching up unboundedly. This is a remaining performance limitation.

Profiles compose world/tile-oriented gravity, drag, restitution and friction.
Earth and Moon share one implementation. Crossing finite tile force volumes
preserves world position and velocity. Disconnection affects navigation, not
collider existence or force profiles. Stable body IDs and separate individual
story IDs survive ownership transfers; replacement individuals cannot inherit a
retired individual's body.

Inhabitants have rigid sphere contact proxies with mass, orientation, angular
velocity and inertia. Friction can produce rolling/tumbling. Visual roots rotate
about their physical centers, including their foot offsets. These are approximate
contact shapes, not articulated ragdolls or anatomically accurate colliders.
The host currently supplies the default 1 kg mass; species masses are not calibrated.

Tiles are rigid assemblies with explicit default 1000 kg mass and disk-like
inertia based on their extent. Ground, structures and anchored fixtures retain
all supplied mesh triangles. Inhabitants contact the exact triangle surfaces.
Tile-to-tile contact uses a compound of those same triangles with a 2 mm rounded
contact skin: this avoids dynamic triangle-mesh backside tunnelling. Collision
groups separate these two representations so inhabitants do not hit duplicate
surfaces. No invented floor, cup or edge clamp catches objects outside real geometry.

## Manipulation

`createRanchPhysics` retains its existing callbacks and adds:

- `begin(tileId,{response})`: capture one atomic physical/behavior/visual snapshot,
  acquire actors on that tile, disconnect navigation and emit per-body events.
- `move({position,rotation},durationSeconds)`: drive a held tile; coordinates are
  metres relative to `active.group`, quaternion is x/y/z/w. Render scale is .1.
- `drop()`: release into gravity with recently sampled linear/angular velocity.
  Samples older than .1 seconds after motion ends are not reused as throws.
- `grab(tileId)`: stop and re-grab within the existing transaction.
- `end()`: stop a held frame without dropping (retained for Return compatibility).
- `returnTile(tileId,durationSeconds)`: interrupt a drop and drive the original pose.
- `cancel()`: restore exact original simulation, visual Euler representation,
  fixtures, resources, jobs, identities, native solver state and queued events.

The UI offers Move tile, Lift, Tilt, Drop, Return and Cancel. Free dragging requires
the explicit Move tile tool and a hit on the selected tile's subtree. Mouse, pen
and one-finger touch use a camera-facing drag plane. Modified camera gestures
retain the shared Sandbox implementation. A second touch cancels the transaction
and hands both pointers to the existing camera controller; no new camera bindings.
Pointer cancellation, lost capture and Escape restore the transaction. Move tile
disarms after finish/cancel. Configuration changes and persistence of intermediate
poses are disabled while the day is paused for manipulation.

## Recovery and safety

Physics owns acquired poses until the host accepts a grounded upright position
on the original reconnected tile. Return supplies contact-only get-up torque.
When blocked or tilted, behavior can propose a nearby waypoint, including a
minimum .4 m displacement to escape a fence-pinned posture. Requests retain
actual navigation bounds, obstacles and peers; maximum waypoint distance is 2 m.

Locomotion modifies horizontal velocity, never position or vertical gravity.
It is limited to .6 m/s and 6 seconds per attempt. Up to three attempts can query
newly freed space. The host rolls back after 20 physical seconds if safe recovery
still fails. A fall into empty space, inaccessible landing or overcrowded layout
can legitimately need rollback; it must never silently teleport actors or resume
obsolete navigation. Arbitrarily relocated terrain is not a rebuilt road network:
normal life resumes after Return or Cancel.

## Glass House

`glass-house.mjs` reuses the original Sandbox `inertia-layers.mjs` and
`sandbox-inertia.mjs` through injected exports. It animates temporary cloned
contents and reassembles them, restoring originals and their exact visibility.
No simulation or cargo state changes. No physical glass cup existed in this Ranch
baseline, and the presentation option does not claim to provide one.

## Verification and ownership

`test-results.txt` records 44 passing tests in the module and shared-camera regression run. New native
engine tests cover angular friction, CCD, tile drop/grab/Return, stale release
samples, real tile-on-tile landing, grounded get-up, native snapshot deterministic
continuation, profile crossing, attachments, and 100 crowded bodies settling.

Isolated Chrome scripts under `tests/` exercise the real app:

- `browser-long-press.cjs`: unarmed 500 ms mouse/touch hold, open/closed hand
  cursors, short clicks, early camera drag, existing inhabitant identities,
  release-to-drop, Escape, pointer cancellation, two-touch camera handoff,
  and modified camera gestures. Passed with no page errors. Long-press applies
  to Physical mode; Glass House retains its existing presentation controls.
- `browser-gestures.cjs`: mouse/touch drag→drop→Escape, touchCancel, second-touch
  camera handoff, Shift/right/middle drag and wheel camera priority.
- `browser-matrix.cjs`: seed 41 Cluster/Moon/Carry on and seed 801 Pair/Earth/Panic,
  Lift/Tilt/Return plus original Glass House; desktop 1280x720 and phone 390x844.
  Both returned and reassembled with no page errors. No page scrolling; scene top0.
  Its final ledger sample is after Glass House, not the preceding physical Return.
- `browser-cancel.cjs`: exact complete life snapshot equality across cancellation.

Ranch owner independently verified loaded-job Drop/Cancel and real mouse drag
against the user scene. Stress evidence is in `ranch-stress-test/rigid*`; early
measurements were affected by concurrent browser/weather work. Do not treat those
as a clean capacity guarantee. Hundreds of simultaneously tumbling actors remain
much more expensive than ordinary navigation; 500 visible bodies are not verified.

Physics owns this directory. Ranch owns lab/life/UI and weather changes. The
coordinated recoveryTarget-only change and Return timeout preserve that work.
Stress Test owns independent frozen harnesses/reports. Preserve all concurrent
changes and coordinate any future production release with the release owner.

## Final stress outcome

An unsuccessful smooth-Return candidate run is saved in `smooth-return-results.json` (actual
seed 214, 25 and 100 animals). Lift/Tilt ran without errors; drops remained slow
(native step dominated). Both Drop→Return cases exhausted safe-footing recovery
and restored the original scene. Immediate Cancel was exact in both. This is
explicitly **not** evidence that crowded dynamic-drop recovery is solved.
That Return candidate was reverted after it regressed a Moon fixture; normal
Return retains the preceding drive trajectory. Normal-population Earth/Moon
Lift→Tilt→Return and camera/drag checks are separate
from that stress outcome. No smooth-frame-rate claim or production release.
