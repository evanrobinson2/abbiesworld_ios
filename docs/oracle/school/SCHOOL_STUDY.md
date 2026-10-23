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
- Pixel look throughout (render at 24% on the climb, 40% on the roof so the street reads).
- Tour: false for now (a study, not yet a door in the world).

## Design card
- What the player feels: "I'm sneaking. Don't let the cars see me. My arms are tired. I got the coin!"
- How would the character know? Headlights on you, the car braking, the engine rising; your own breath and shaking hands.
- Mode: diegetic (headlights, dog's pile, rattling lamp), meta (heartbeat, breath, sway, coin moment), spatial (hold
  shine, seen ring at your feet), one overlay (hang-drop timing, only while hanging).
- Who it's for: the player (the child).
- The whole game adapts: dusk deepens over four minutes; windows warm up as the sky darkens.

## Still to do
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
