# AW-STUDY-0032 - School Jump: Game-Ready

The school jump (AW-STUDY-0026, `studies/school/play.html`) made game ready. Study page: `studies/school-ready/`.

## The brief, in Evan's words (2026-10-23, 11:45Z / 7:45 AM)

> climbing isn't working that well. this needs another UX / UI pass too it's not game ready at all. and the school is
> inconvincing and needs an upgrade, as does the dog, and the whole artwork, make a new study

Then, at 12:24Z: "and then make the improvements". These are the improvements from the memory-places review
(https://claude.ai/artifact/1qPFbCMZ81PTMb44cSfZcN).

Canon kept from 0026: golden dusk, slow station wagons, two barriers, burning headlights felt through meta, a
fictional school and town, and no real photos. Also kept: the chalk-target toss (the third throw always lands on the
roof), the "big jump" warning with the second tap, the listened, Hollywood and janitor endings, grown-up Daddy's
closing lines, and the voiced lines, keyed by text. Young Daddy has a blond mop and never a hat; bub is a black lab.

## Decisions

- **The climb is a verb in the shared kit.** `simulations/climb-kit.mjs` holds pure rules with no rendering:
  `planGrab`, `holdNear` and `bestNext`. Tap a hold and the hand that can reach it moves. When both hands can, the kit
  picks the one that leaves the most holds in reach further on, so you can't hit a dead end. After that it prefers the
  hand on the hold's side, then the trailing hand. The old climb stalled because a second grab needed a let-go first.
- **Thumb-sized targets.** Holds are picked by distance on the screen, with at least 54 px, about 8% of the short
  side. A shining (reachable) hold wins over a dull one nearby.
- **A nudge, not words.** For the first six grabs, a soft ring sits on the best hold up. Arrow keys and WASD grab
  the best hold in that direction.
- **Hero low-poly recipes in code**, shared with the figure study (AW-STUDY-0034):
  - `simulations/lowpoly-kit.mjs` has lofts, two-bone IK, world UVs, canvas textures and normal maps.
  - `simulations/black-lab.mjs` is bub, with walk, trot, gallop, sit, pant and bark.
  - `simulations/young-daddy.mjs` is the kid: IK hands and feet, throw, shield, carry, crouch and effort.
  - `studies/school/school-world.mjs` has the school, street, houses, wagons, the dusk sky and the environment.
- **One dusk clock** drives the sky, sun colour, fog, classroom and house windows, wall lamp and street lights.
- **Framing in metres.** `frameFov(halfW, halfH, dist)` caps at aspect 1, so a portrait phone sees the same climb as a
  laptop. No views are blocked by poles, parked cars or the sign.

## The memory-places review, applied

- **The dog is the hook.** When the ball lands on the roof, bub looks up and whines (`SFX.whine`). Before this, he
  barked.
- **The pile grows by the dog.** Balls you throw down land in bub's pile.
- **Headlights** sweep on the wagons' slow rhythm. You hear the engine first, and a heartbeat plays while you're lit.
  The beam on the brick is bright enough to burn but never a whiteout.
- **Busted.** A grown-up gets out on the sidewalk and puts a flashlight on you. You drop what you carry. On the roof,
  you slide back to the last place nobody could see you (`S.cover`, recorded every unseen frame). On the wall, you
  start the climb again.
- **The climb verb** is now the shared kit, ready for the basement and the next memory place.
- **The hang drop** has one small glass timing ring. The swing runs round a 240° arc, and the gold arc is when to let
  go. The power toss keeps its bar.
- **Coins are memory pieces.** The school's coin is one piece. The closing beat that plays when the whole set is
  found belongs to the shared inventory, and is not built in this study.

## Design card

- **What the player feels:** "I'm sneaking. That one shines, I can reach it. My arms are shaking. Don't let the cars
  see me."
- **How would the character know?** The worn shiny spot on a bracket, headlights on the brick, a car braking, your own
  breath and shaking arms, and bub below, looking up and whining.
- **Mode:**
  - Diegetic: headlights, the dog's pile, bub, lamps coming on.
  - Spatial: the shine and the nudge ring.
  - Meta: glare, heartbeat, shaking arms, haptics.
  - Overlay: only the timing glass and the score chip.
- **HUD:** zero words; a back chevron, one score chip, and a timing glass only while needed.

## How it was made, and how to be faster next time

Timeline, local time (UTC-4):

- 7:45 AM: Evan's words.
- About 7:50: study opened, and the old climb diagnosed by playing it headless (the second grab needed a let-go).
- About 8:00 to 8:10: the climb rules rewritten and tested by a scripted player. It reached the top in 11 taps with
  no wrong moves.
- About 8:10 to 8:20: art. The kid, the dog, the school, the wagons and the sky were rebuilt as recipes, each checked
  in its own orbit viewer.
- About 8:20 to 8:25: composition passes on desktop and portrait phones (poles, cars, fov, glare), then the study
  page and the bundler.
- 8:24: the review items arrive, and are folded in by about 8:35.
- About 8:40: preview artifact, then the PR to main and the deploy.

Where the time went: about 40% on the art recipes, 25% on composition fixes found only in screenshots, 20% on the
climb, and the rest on the page, the preview and shipping.

What slowed it down:

1. Software WebGL screenshots of 1280×720 frames time out at the default 30 s. Each composition fix cost a few
   minutes of waiting.
2. The camera framing was fixed one view at a time, by eye, and portrait phones broke it again.
3. Props placed without checking camera lines: power poles, parked cars and the sign blocked the title and toss
   shots.
4. The advance-preview bundle had to be hand-assembled. It is now a tool.

Speedups for the next game:

- `tools/advance-artifact/bundle.mjs <out> <page>` turns any study page into a publishable artifact in one command.
- `tools/minigame-test/school-flow.cjs` plays a game by its own rules and screenshots every beat. Copy it per game,
  and wait on state, never on time. Shoot portrait first; it is faster and catches more.
- `simulations/climb-kit.mjs`, `lowpoly-kit.mjs`, `black-lab.mjs` and `young-daddy.mjs` are ready to import.
  Grace's basement and the next memory place should start from them.
- Frame cameras in metres with `frameFov` and cap the aspect, from the first view, not after a portrait screenshot.
- Place street props with a check that they don't land in any named camera's view cone. A small helper belongs in
  the shared kit next.

## Canon learned

- Climbing in Abbie's World is "tap what shines". The game picks the hand, and it never lets you trap yourself
  (`docs/design/INTERACTION_GRAMMAR.md` should cite `climb-kit.mjs`).
- Being caught costs ground, not the run. You slide back to the last cover.
