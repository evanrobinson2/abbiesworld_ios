# AW-STUDY-0011 - Over-the-Shoulder Play

Oracle study, 2026-10-23. Requested by Evan, about stepping into Abbie's World: zooming all the way down drops you
into a character, the view is over the shoulder, "so you can maybe have some kind of super upgraded animations for
player? .. could we ask oracle to suggest how proper games with over the shoulder have done it? suggest some first?"

This is a study, not a build. It covers four things that proper third-person games get right: camera framing,
collision and occlusion, the transition from the top-down board to the shoulder, and the player character's animation
(locomotion, idle, turns, interactions). It ends with five options for Abbie's World, cheap enough for an iPhone in
three.js. "Play my day" and "run around" are Evan's ideas, not edicts; option E sketches them without committing.

Files in this folder:

- `SHOULDER_STUDY.md` (this file).
- `shoulder-signatures.json`: per-game camera and body profiles (an estimate of the identity schema's `camera`
  descriptor, plus framing numbers, collision style, transition and animation notes), each lesson marked `style` (we
  may learn from it) or `expression` (we never copy it). Games Evan owns are marked `owned`.
- `shoulder-study.html`: source of the visual page, https://claude.ai/artifact/F8HG8LMckTjCwQzDsHDsoz

**Confidence.** Game facts come from knowledge of the games and public developer talks (Sources), not captures: this
environment cannot reach Steam or video hosts. Numbers marked `estimate` should be measured by the PC's library
assimilation thread. Abbie's World facts come from code on `main` (paths given). Nothing here copies any game's
camera curves, animation clips, characters or footage; we take the ideas, never the expression.

## The short version

1. **A true over-the-shoulder camera is an aiming camera.** Resident Evil 4 (2005) and Gears of War (2006) pushed it
   off-centre so a gun could point down the middle of the screen. Abbie's World has no aiming. The games children
   love (Mario, Astro Bot, Sky, Fall Guys, Bluey) use a **chase camera**: behind and a little above, nearly centred.
   Our answer is a **soft shoulder**: centred while you move, sliding gently to one shoulder when you stop, look or
   talk, so the thing you face gets the open half of the frame.
2. **The child never has to steer the camera.** It follows on its own, recentres behind you after a short pause,
   looks a little ahead of where you are going, and leans toward interesting things. A drag can still look around;
   letting go eases it home. Camera wrangling is the first thing that defeats a six-year-old.
3. **Collision: pull in fast, ease out slow, and look through small things.** One sphere cast from the head to the
   wanted camera spot finds walls; the camera snaps in front of them and drifts back out over about half a second.
   Fences, posts, leaves and animals never push the camera: they thin to a soft dither for the player only.
4. **The dive is one continuous move, never a cut and never a fade.** Manor Lords (owned) and Spore show the shape:
   a single dolly that lowers the camera, raises the pitch from looking down to looking along, narrows the field of
   view and arrives behind the character's head. About 1.2 seconds, anchored on the character the child chose.
5. **The character acknowledges you.** At the bottom of the dive the character glances back over their shoulder
   (a small turn of the head, maybe a wave) and then faces forward. That is the "I'm you now" moment, told through
   the body, with no label and no HUD.
6. **Animation quality is mostly cheap procedural layers on a few good clips.** AAA studios use motion matching
   (For Honor, The Last of Us Part II) with hours of capture. We cannot. What sells a body at our scale: a speed blend
   of idle, walk and run, played at the speed the feet actually travel; a head that looks at interesting things; a
   lean into turns; feet that settle on the ground; a squash on landing; and springy ears, tails, hair and scarves.
7. **The body is a diegetic channel.** How would the character know it is cold, late or about to rain? They shiver,
   yawn, hurry, hunch. One world signal drives the body along with light, music and animals. This is the "whole game
   adapts" rule from the HUD study, and the shoulder view is where it pays off most.
8. **Interactions are spatial, never prompts.** No "Press E", no words. Things you can touch warm slightly when you
   are near (a presentation-layer glow on the thing); a tap walks the character to the right spot and plays the
   action, with a hand that reaches to the real target.
9. **One skinned character, everyone else stays cheap.** On a phone only the player needs a skeleton, a mixer and
   look-at. NPCs keep today's vertex motion (`npc-motion-1`). The whole camera and body layer should cost under half
   a millisecond a frame.

## 1. Camera framing

What the good ones share:

- **Pivot, not position.** The camera aims at a pivot near the back of the head (about 0.9 times standing height),
  and sits on a boom behind it. Everything else (lag, collision, recentring) acts on the boom, so the character's own
  bob never shakes the view. Estimates for a child-sized character of height h: boom length about 2.2h to 3h, camera
  height a little above the head, pitch 8 to 15 degrees down, vertical field of view 55 to 65 degrees.
- **The character sits low and a little off-centre.** Most third-person games place the head near the upper third and
  the body slightly left of centre (God of War 2018 frames Kratos left so the world opens to his right). When moving,
  frame the path ahead; when stopped, frame what the character faces.
- **Look-ahead.** The pivot leads in the direction of travel by a small amount, so a running child sees where they are
  going, not their own back.
- **Lag with a dead zone.** The camera follows with spring damping (a time constant around 0.15 to 0.3 s) and ignores
  tiny movements inside a dead zone. This is what makes Mario and Astro Bot feel calm. No lag at all feels robotic;
  too much feels drunk.
- **Auto-recentre.** After roughly 1 to 2 seconds of moving without touching the camera, it swings back behind the
  heading. Zelda: Breath of the Wild, Sky: Children of the Light and Mario Odyssey all do some version.
- **Points of interest.** Designers place soft attractors (a bell, a sleeping goat, a gate) that bias the camera and
  the head toward them when nearby. God of War and Breath of the Wild lean on this heavily.
- **Kids' games go further.** Bluey (owned) and PAW Patrol World (owned) keep the camera mostly automatic; Mario 3D
  World often fixes it entirely. Children aim with their bodies, not with a second stick.

On a phone the second stick does not exist. Sky (phone-first) solved it: one thumb anywhere moves, a drag with a
second finger looks, and the camera does the rest. That fits our zero-word, 8 percent HUD: nothing is on screen until
a thumb lands.

## 2. Collision and occlusion

- **Sphere cast, not a ray.** Cast a small sphere (radius about 0.2 m) from the pivot to the wanted camera spot. If it
  hits, move the camera to just in front of the hit. A ray lets the near plane clip through edges; a sphere does not.
- **Asymmetric smoothing.** Pull in instantly (or within a frame or two), release over 0.3 to 0.6 s. Pulling in slowly
  shows the inside of walls; releasing instantly makes the camera pop when you pass a post.
- **Whiskers.** Two extra short casts left and right of the boom let the camera start sliding around a corner before
  it hits it.
- **Ignore small things.** Thin and soft things (fence rails, posts, plants, animals, other characters) never move the
  camera. They are kept out of the camera's collision set and instead fade.
- **Fade what blocks the character.** When something stands between the camera and the character, it dithers to a
  screen-door pattern (cheaper and better sorted on phones than true transparency). Mario Odyssey draws Mario's
  silhouette through walls; many games dither the occluder. For a child the occluder fade is gentler.
- **Too close to the character.** If collision pulls the camera inside the head, fade the character's own head and
  shoulders out rather than flipping to first person.
- **Roofs and rooms.** Indoors, the Sims and Animal Crossing remove the roof and front walls instead of pushing a
  camera into a tiny room. For Abbie's World interiors (the barn, the café), a cutaway beats a cramped shoulder.

**Information principles.** The fade and cutaway are presentation layer: drawn for the player and invisible to
characters, the simulation and Suzy's `look` (route them through `presentation-layer.mjs`). The camera collision set
must be a cheap proxy (boxes and capsules per building) on its own layer, never the render meshes.

## 3. From the board to the shoulder

The board is a diorama seen from above; the shoulder is a body in the world. The games that cross that gap well:

- **Manor Lords (owned).** You can zoom from the city-builder view down to walk around your village as a person. The
  zoom is continuous and the world is the same world. The lesson: one camera, one world, a curve that changes the
  camera's pitch and height together.
- **Spore and Google Earth.** Scale changes as a single unbroken move with pitch tied to altitude. Far up you look down;
  near the ground you look along.
- **Black & White, Populous.** The god view and the near view are the same place; the creature you care about is
  always the anchor.

The common recipe:

1. **Anchor.** The child taps (or pinches toward) a character. That character becomes the dive's target; the camera
   never loses them from frame.
2. **One curve.** A single parameter t from 0 (board) to 1 (shoulder) drives distance, pitch, field of view, near
   plane and look-ahead together, eased in and out. Pitch moves late (the camera stays looking down until the last
   third, then lifts its eyes to the horizon). About 1.2 s for an intentional dive; a pinch scrubs t directly.
3. **Let detail arrive.** While the camera falls, near detail (grass, small props, the character's skinned model)
   swaps in under motion, where the eye forgives it. The swap must never be a fade.
4. **Possession beat.** At t = 1 the character glances back at the camera, then turns forward. The play HUD tucks away.
5. **The way back.** A pinch out, or a long look up at the sky, runs the same curve backwards to the exact board view
   the child left (the `createSandboxFocus` bookmark in `prototypes/ranch-atelier/dist/sandbox-camera.mjs` already
   stores one per session).

Rules that carry over from the cutscene study (AW-STUDY-0009): the hand-back is seamless on the play camera, the move
is honest about loading (it ends when the near detail is ready, never later), and nothing masks the world: no white
flash, no vignette, no blur.

## 4. The player's body

### Locomotion

- **A speed blend.** Idle, walk and run blended by actual speed (a one-dimensional blend). The single biggest flaw in
  cheap games is foot sliding; play each clip at the rate its stride matches the ground speed.
- **Starts and stops.** A tiny lean forward to start and a settle back on stopping. Even 0.1 s of anticipation reads
  as weight. If we have no start clip, a procedural pelvis lean does it.
- **Lean into turns.** Tilt the body a few degrees toward the turn, proportional to turning speed. Free, and it is
  what makes Sable's and Astro Bot's characters feel alive.
- **Turn in place.** Below walking speed, turning more than about 90 degrees plays a step-turn rather than rotating
  the model like a statue.
- **Feet on the ground.** On slopes and steps, a simple two-bone foot IK (or just a pelvis drop to the lower foot)
  stops feet floating. Our tiles are gentle, so the pelvis drop alone may be enough.
- **Squash and stretch, softly.** A small squash on landing and stretch on a jump. Fall Guys (owned) proves that
  wobble and physical comedy sell to kids more than realism.

### Idle

- **Breathing** (a slow chest and shoulder scale), then **fidgets** after 6 to 10 seconds still: look around, scratch,
  stretch. Fidgets come from the world: look at the nearest animal, wave at a neighbour, yawn when it is late.
- **Head look-at.** The cheapest big win in third-person animation. The head (and a little of the spine) turns toward
  the nearest point of interest within a cone. Breath of the Wild and A Short Hike both use it to show what matters
  without a single marker. It is also our most diegetic signal: the character noticed the bleating sheep, so you do.

### Interactions

- **Walk to the spot, then act.** Each interactable thing carries an interaction point and facing. A tap walks the
  character there, turns them, and plays the action. This is how almost every third-person game hides imprecise
  input.
- **Reach.** A short hand IK pulls the hand onto the real target (the apple, the goat's head, the bell rope) on top of
  a generic reach clip. One clip, many targets.
- **Social.** Waves, hugs and high-fives with NPCs use sync points: both bodies play matched halves.

### Secondary motion

- Springs on ears, tails, hair, scarves and backpacks (a damped spring per chain, a few bones). Journey's scarf and
  Sable's cape are the reference for how much this adds. Cheap and very kid-legible.

### Body as information

The world signal (time, weather, mood, threat) chooses the body's flavour: shiver and hunch in cold, hurry under rain,
skip when happy, slow and yawn at night, tiptoe near a sleeping animal. The same signal already drives light and the
Music Bible. Sound follows the body too: footsteps change by surface, breath when running.

## 5. What Abbie's World has today

- **Board camera:** an orbit camera with wheel and pinch zoom and a per-session focus bookmark
  (`prototypes/ranch-atelier/dist/sandbox-camera.mjs`, `trackpad-orbit.js`).
- **Shoulder view:** being built in the current Sandbox v2 batch (zoom to the bottom drops you in). Not yet on `main`
  when this was written.
- **NPC motion:** procedural vertex deformation for walking, carrying, working, reading and talking
  (`prototypes/ranch-atelier/dist/simulations/npc-animation.js`, `npc-motion-1`). Cheap, works on any static model,
  but it cannot do a head look-at, a reach or a turn-step well.
- **Skeletal path:** a skeletal actor with an `AnimationMixer`, cross-fades and named clips (`Idle_Loop`, `Walk_Loop`)
  exists for the night opening (`prototypes/ranch-atelier/dist/night-skeletal-actor.mjs`, with
  `character-variants.mjs` and `character-skeleton-utils.mjs`). That is the right base for the player body.
- **Presentation layer:** `prototypes/ranch-atelier/dist/simulations/presentation-layer.mjs` is where occluder fades,
  interaction glows and the dive's HUD tuck belong.

## 6. Phone budget

Targets for 60 frames a second on Evan's iPhone, the player body and camera together:

| Part | Budget |
| --- | --- |
| Player model | one skinned mesh, about 3,000 to 6,000 triangles, 25 to 40 bones |
| Animation | one `AnimationMixer`, at most 3 clips blending, procedural layers as a few bone rotations |
| Look-at, lean, foot drop | under 0.05 ms |
| Spring bones | 2 to 4 chains of 3 to 5 bones |
| Camera | 1 sphere cast plus 2 whiskers against a proxy collision layer of boxes and capsules, under 0.1 ms |
| Occluder fade | screen-door dither in the material, no transparency sorting |
| Shadow | one tight shadow frustum that follows the player, or a blob shadow under them |
| NPCs | unchanged (`npc-motion-1`), skinned only when they share a beat with the player |

## 7. Options for Abbie's World

None of these is built. They are ordered by how much they change the feel per day of work.

**A. Soft shoulder, automatic.** A chase camera centred while moving, sliding to one shoulder when stopped; spring
lag with a dead zone; look-ahead; auto-recentre after about 1.5 s; points of interest on bells, gates and animals.
Sphere cast with fast-in, slow-out; small things dither. One thumb anywhere moves the character; a second finger
looks. Nothing on screen at rest. Style from Sky, Mario and Astro Bot; built on our own numbers.

**B. The dive.** One curve from board to shoulder anchored on the chosen character, about 1.2 s, pitch lifting late,
detail swapping in under motion, ending in the over-the-shoulder glance. Pinch out runs it backwards to the exact board
view. Style from Manor Lords and Spore.

**C. A living body.** The player's character becomes a skinned actor on the existing skeletal path: speed-matched idle,
walk and run; procedural lean, turn-step and pelvis drop; head look-at to the nearest interesting thing; breathing and
world-driven fidgets; spring ears, tails and scarves; flavours from the world signal (cold, rain, night, happy).
This is the "super upgraded animation" Evan asked about, and most of it is code, not new clips.

**D. Touch the world.** Interaction points on Ranch things: near ones warm with a soft glow on the object; a tap walks
the character there and plays the action with a hand reaching the real target (pet the goat, pick the apple, ring the
bell, open the gate). No prompts, no words. NPC waves and high-fives use matched halves.

**E. Ride along (for "play my day").** The shoulder camera follows a character through their own schedule from the
simulation, like a gentle documentary; a thumb on the screen takes the wheel and the character becomes yours ("run
around"); letting go for a while hands them back to their day. Idea only, recorded for later.

**Recommended order:** A and B together first (they are one camera system and the first thing anyone feels), then C,
then D. E waits until Evan asks for it.

## Style, never expression

We take camera models, framing ratios, smoothing ideas, the dive's shape, and animation techniques (blend by speed,
look-at, lean, springs, walk-to-interact). These are genre conventions and engineering. We never take any game's
characters, clips, motion capture, camera curve data, level layouts, sounds or shot compositions. The ledger is in
`shoulder-signatures.json`.

## Sources

Public knowledge of the games listed in `shoulder-signatures.json`, and these well-known talks and write-ups (titles
from memory; check before quoting): John Nesky, "50 Game Camera Mistakes" (GDC 2014); Mark Haigh-Hutchinson,
*Real-Time Cameras* (2009); Simon Clavet, "Motion Matching and The Road to Next-Gen Animation" (GDC 2016, For Honor);
Kristjan Zadziuk, "Motion Matching, The Future of Games Animation... Today" (GDC 2016); David Rosen, "An Indie Approach
to Procedural Animation" (GDC 2014, Overgrowth); Santa Monica Studio talks on the God of War (2018) one-shot camera.
