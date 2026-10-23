# AW-STUDY-0027 - Brute Fight

Two Meshy brutes, cleaned up with the Bruiser pipeline, painted, rigged on one skeleton, animated with a fighting move
set and dropped into a ranch ring. The start of a street fighter. Tools: `tools/brute-fight/` (see its README). Page:
`/studies/brute-fight/`.

## What Evan asked for
"Two brutes fighting each other ... proper idle, hurt, fall, jump, block, punch (jab, heavy, uppercut, and two fisted axe
hammer) and equal anims for receiving punches, blocking, etc. ... can you paint these too?" (2026-10-23 09:35Z)

## What it is
- Fighters: brute one (red shorts, white tank) and brute two (blue shorts, yellow tank), from his two pictures, about
  3,000 faces each, one painted texture each, materials still named by role (Skin, TankTop, Shorts).
- Skeleton: 20 bones, the same names on both, placed from each brute's learned rings.
- 20 clips: idle, walk_fwd, walk_back, jump, block, jab, heavy, uppercut, axe; hit_jab, hit_heavy, hit_uppercut, hit_axe,
  block_hit, block_heavy, block_overhead, hurt, fall, getup, victory.
- Every blow maps to a hit reaction and a blocked reaction (`moves.json`). The hammer knocks a standing brute flat; an
  uppercut also catches a jumper.
- Play: AI against AI until the player touches or presses a key, then the player is red. `?show=moves` shows each blow
  landing and then being blocked, taking turns.

## Rules of design it follows (and one new one)
- The bell in the ring is diegetic: it rings rounds in and out.
- A tired brute's idle slows and sags: the other fighter could read it.
- Stars, block rings, dust and shake are presentation-layer cues (`presentation()`), invisible to the brutes.
- The overlay is two wordless strength pills plus the touch move pad, inside the 8% budget.
- New: **a fighter is drawn mirrored so his open stance always faces the camera**, like a 2D fighter's sprite. Without
  it, whichever brute stands on the right shows his back. Keep this for every side-on fight.

## How it was made, and how to be faster next time
Timeline (local time, UTC-4):
- 05:35 Evan's words.
- 05:36-05:43 Found both brutes and the Bruiser cleanup tools; installed Blender as a Python module (`pip install bpy`).
- 05:43-05:46 Wrote `build.py` (paint, rig, weights) and `moves.py` (20 clips as numbers) in one pass.
- 05:46 First full build ran in 20 s; the contact sheet showed working clips at once. Meshy's texture was plain grey.
- 05:47-05:49 Fixes: sRGB/linear paint colours; brute two's fists hang by his hips and were weighted to the thigh (spikes),
  fixed by claiming any vertex near a hand bone for the arm; unbound toes painted as shorts.
- 05:50-05:56 Wrote the fight page; first browser shot worked; fixed facing (mirror) and the near fence blocking the view.
- 05:59 Advance preview published.
- Shipped: see the thread for the live time.

Where the time went: about a third on finding things (which mesh is canonical, which is turned for the picture, where
Blender lives), a third on the page and a third on the model pipeline. Nothing waited on Evan.

What slowed it down:
- The cloud box had no Blender and no `libEGL`; the first Cycles bake died silently.
- The deployed Bruiser G model is turned 24 degrees for the picture camera; the square source had to be found in
  `meshy/canonical`.
- The Artifact preview refuses `.glb`; the files had to be served as `.wasm` (the Bruiser study already does this).
- Stance yaw sign was guessed; the browser shot was the first place it showed.

Speedups for next time:
1. Put `pip install bpy` and `apt-get install libegl1` in the session setup, or a one-line `tools/setup-blender.sh`.
2. Reuse `tools/brute-fight/build.py` for any humanoid hero: one `fighters.json` entry. It is the shared kit now.
3. Add a top-down and a camera-side frame to the contact sheet so facing and aim show before the browser.
4. Name GLBs `.wasm` wherever a preview might carry them.
5. Next step for the game: share `play.html`'s Brute class as `simulations/brawler.mjs` so the next fighter or place
   (a Moonbase ring with radio and holograms) starts from it.

## Research pass (2026-10-23, afternoon)
Consulted after shipping, at the coordinator's ask; the fight changed where it helped.
- **Game Oracle**: asked for a plan for "a side-on cartoon fighting game like Street Fighter 6, Smash Bros and Absolver".
  It holds no fighting game yet: its studies-only plan fell back to Anno and Cartel Tycoon, which don't fit. Its identity
  schema's feel layer (`juice`: hit-stop, screen shake, camera kick, sound tied to the action) is the checklist used
  here. Gap to fill: a fighting-game identity record (Street Fighter 6, Smash, Absolver).
- **Sakurai on hit-stop** (Famitsu column 490 via Source Gaming; his 2022 video via Nintendo Wire): attacker and
  defender freeze for the same time, longer for more damage with a cap; the hit character shakes horizontally on the
  ground and vertically in the air, fading, scaled by camera distance, with the hurtbox left in place; the attacker
  trembles slightly; the flinch shows at once and blends into the hurt motion. **Applied**: all of it (`freeze()`,
  `stopShake()`, reactions start at their flinch key, `peak` in `moves.json`).
- **Capcom's frame column (SFV)** and an impact-freeze breakdown (Sonic Hurricane): hit-stop and block-stop are set per
  game and kept similar, about 9/11/13 frames for light/medium/heavy. **Applied**: 7 + 0.3 x damage frames, capped at
  13, the same on hit and block (jab 9, heavy 11, uppercut 12, hammer 13).
- **Street Fighter 6's dynamic blocking** (EventHubs): the block pose changes with where the attack comes from.
  **Applied**: a new `block_overhead` clip for a blocked hammer.
- **Skullgirls, "Fluid and Powerful Animation within Frame Restrictions"** (Mariel Cartwright, GDC 2014) and the
  Gnomon attack-animation workshop: strong key poses, anticipation and recovery, animate with startup/active/recovery
  in mind. Our clips already key a windup, a contact pose and a recovery to guard; noted as the rule for new moves.
- **Absolver** (GamingBolt and Game Developer interviews): every attack starts and ends in a stance, and simple shapes
  keep moves readable. Ours all return to the guard stance; stance-to-stance chains are a next step.
