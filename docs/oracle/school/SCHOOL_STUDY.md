# AW-STUDY-0026 - The School Jump

Play: `/studies/school/play.html` (study page `/studies/school/`). Code: `prototypes/ranch-atelier/dist/studies/school/play.html`,
shared pieces `simulations/coin-reward.mjs` (the gold coin moment) and `simulations/memory-coins.mjs` (one coin count).

## The brief, in Evan's words (2026-10-23, 08:57-09:20Z)
- "When I was a boy there was a Catholic school." He sent a satellite view of it (private reference only; not committed).
- "On the northwest face of that school there's roughly 3 sections." "This is a SUPER SUPER stylized version."
- "It's a first person climbing." "We see the gas pipes and door hinges", "the small mesh grate above the door", "and the door knob".
- "We maneuver a climb up that wall by navigating our little body up the door, then grate, then piping and conduit, then
  collect the tennis balls, throw them down to your dog. There are 31 tennis balls across the roof. If any car driving by
  sees you for more than a few seconds you're busted from the roof. If you get too tired on your climb by making too many
  wrong moves you have to start again, and your little voice gives you encouragement."
- "Iso across the roof", "with clear, properly communicated feeling (maybe it's meta) for the visibility". "There are walls
  and such on the roof you can run and hide behind." "The cars come on a repeatable timeframe." "You can see the cars from the view."
- "The view is from the same spot as the climb left off. The game literally transitioned."
- "Then you avoid the cars, climb one more thing, and then an expertly timed hang drop (maybe that's an overlay game?).
  That's where you get the last balls and another gold coin." "The gold coins are Daddy's core memories."
- "8-bit basement style but it becomes more like a Tales of Valor style RTS, but don't violate our UI/UX." Later: "the
  basement graphics style is perfect for this game."
- "At the end there are 2 endings: the Hollywood and the alternate." Hollywood: "climb back up the small wall to the
  surface plane, back to the conduit / telephone piping, then mesh, then door. Beside the door is an outcropping, an
  aluminium sheet-metal angled box protecting a hydro station in a wire-mesh cage with aluminium poles."
- "Add a nice reward animation with the golden coin. That's a very special prize."

## Decisions
- Stylized, fictional: no school name on screen, no real photos in the game. The gas pipe is a drainpipe (kids' game:
  never teach climbing gas lines). The hydro station is scenery only, never a handhold.
- Busted = a grown-up's shout, then you start the climb again. Tired = you slide gently down. Nobody falls or gets hurt.
- Seen = in a headlight. The car's beam is a real shadow-casting spot, so the light you see is exactly the rule:
  if it's on you they see you, and anything that shadows you hides you.
- Pixel look throughout (round two renders at 45% on both the climb and the roof so the painterly dusk reads).
- Tour: false for now (a study, not yet a door in the world).

## Design card
- What the player feels: "I'm sneaking. Don't let the cars see me. My arms are tired. I got the coin!"
- How would the character know? Headlights on you, the car braking, the engine rising; your own breath and shaking hands.
- Mode: diegetic (headlights, dog's pile, rattling lamp), meta (heartbeat, breath, sway, coin moment), spatial (hold
  shine, seen ring at your feet), one overlay (hang-drop timing, only while hanging).
- Who it's for: the player (the child).
- The whole game adapts: dusk deepens over four minutes; windows warm up as the sky darkens.

## Round two (Evan, 2026-10-23 09:30-09:36Z)
In his words: "cars travel diagonally from top right to bottom left across the front. upgrade everything to game ready
including pick up mechanics and score for user. meta for getting caught ... make the cars much more dramatic and make
the climb feel cartoonishly far - and use click to latch and click to unlatch - crossover isn't allowed ... start by
walking your dog. and then you throw the ball against the wall, after each time the dog barks and user says oh you want
it further do ya bub, then throws it harder, and on the third one it goes to the roof." "Like Annapurna games." "Put it
through a full game development process ... we need better assets."
New direction (09:36Z, his picture: side-on painterly golden dusk, a kid in a red cap, white tee and red shorts on the
brick by a drainpipe, a shaggy golden dog below, a station wagon's headlights): "do same top as current, but make the
cars move slower, give only 2 barriers, make it really obvious, make the lights go all the way to player and use meta
to make us FEEL the burning lights" of getting caught.

What changed:
- Intro: walk bub on the leash; three throws at the wall, each harder; the third lands on the roof.
- The climb is side-on (his picture), the kid visible on the wall, a tall wall of door, grate, drainpipe brackets,
  conduit clamps and the phone box. Click to latch, click to unlatch; hands never cross; you can't let go of your last
  hand in mid-air. Stamina drains on one hand and recovers on two.
- Roof: two big barriers only (a brick wall and the big air handler). Pick up by walking over a ball (carry three),
  tap bub to throw. Score chip (balls, coins, points) in one glass pill; +N pops on the thing that scored.
- Cars: station wagons, every 16 s, slow, travelling diagonally top-right to bottom-left on screen. A visible light
  shaft runs from the headlights all the way to the player; the beam is still the shadow-casting seen rule.
- Getting caught (meta): exposure and warm glare climb (capped below a whiteout: nothing masks the world), a high
  whine, heartbeat, camera push-in, shake and slow motion; the kid shields their eyes.
- Concept proofs (Midjourney, Evan's Mac): key art, roof, wall, first person, characters. Job ids and picks in
  `tools/midjourney/outputs/school-jump-concepts/provenance.json`; the study page shows them.
- Next for assets: turnarounds of the kid and bub, wall pieces, rooftop props and the station wagon from the picks,
  built as hero low-poly recipes per `tools/ranch-rebuild/MODELER.md`.

## Still to do
- Asset pass from the concept picks (kid, bub, station wagon, wall kit, roof props).
- The alternate ending (waiting on Evan).
- Grace's basement can call `coinReward()` for its ten coins (owned by that thread).

## How it was made, and how to be faster next time
Evan's routine (09:20Z): after every natural-language minigame, look at the process and find ways to go faster.

Timeline: first message 08:57Z, game loop fully described by 09:05Z, playable preview at 09:17Z, coin reward and
ship by ~09:35Z. About 20 minutes from the first sentence to something playable, most of it while he was still talking.

What slowed us down:
1. Building while the story was still arriving. The climb wall, roof layout and the canopy each moved once as new details
   arrived (canopy from the gym's east side to beside the main roof once the "climb back up the small wall" ending came).
2. Hand-placed geometry. Every hold, roof and blocker was typed as numbers, then checked by screenshot.
3. Two real bugs found only in the browser: an infinite loop placing balls in a too-small canopy, and a car headlight
   aimed in local space. Each cost a test round.
4. Screenshots through software WebGL take ~30 s each.

To go faster:
1. A minigame kit: climb wall (holds, reach, tiredness, inner voice), iso walker (regions, blockers, tap-to-walk),
   watcher (headlight or eye cone that is also the visibility rule), timing overlay, coin reward. The next game is
   composition, not new code. Pull `Wall`, `holds()`, `reachable()`, the car watcher and the hang meter out of play.html.
2. A layout sketch first: turn a satellite or photo reference into rectangles in one step (footprint, heights, sections),
   then build on that, so the geometry doesn't move as the story grows.
3. Every placement loop gets a try cap; every child light aims through a helper that converts world to local.
4. A scripted playthrough (`window.schoolJump`) from the start: one run checks every phase and takes the screenshots.
5. Ask the one question that unlocks the most (here: "what does the jump mean?") and start building on the likeliest
   reading at the same time.

### Round two, speed review (2026-10-23)
- What slowed us: a new art direction arrived mid-rewrite, so the climb camera, palette and kid pose were patched after
  the fact. Next time, freeze the reference picture first (it is the art target) and write the camera and palette
  from it before gameplay code.
- Lighting tuned by eye took three passes (whiteout, then too bright, then right). A fixed "seen / not seen" screenshot
  pair from the Playwright script is now the check; keep it as a reusable harness for every minigame.
- The whats-new.json merge conflict happens on every ship because every thread adds to the top. A tiny script that
  re-inserts our entry on top of main's file fixed it in seconds; it should live in tools/ for all threads.
- Concept art (Midjourney on Evan's Mac) ran in parallel with the code and never blocked it. Keep doing that.
