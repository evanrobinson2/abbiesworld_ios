# AW-STUDY-0066 - Skate-Park Rail Racer (Stage 1, low fidelity)

Issue #621 (Evan, 2026-10-24). The toy-car coaster at Winchester's skate park, reimagined as a complete arcade rail-racing game
inside the world: pick a car, race the clock, earn achievements, win a wrapped prize, unwrap it, unbox a collectible toy car, and
drive it later. Stage 1 is the low-fidelity interactive study; feedback comes before hi-fi, and hi-fi before game-ready refinement.
Play it: `studies/arcade-racer/play.html` (study page `studies/arcade-racer/`). Registered as **experimental** (`arcade-racer`).

## What is really playable, and what is a mock

| Part | Status |
|---|---|
| Rail race: lane choice (3 lanes), orbs, cones, launch timing, real clock | **Playable and real.** A bot and a human use the same inputs. |
| Practice mode (hints, no records, no prizes) | Playable |
| Garage: six original cars, paint, honk, owned versus earnable, next achievement | Playable (cars are the existing coaster garage) |
| Results: time, personal best, improvement, achievement, next goal, retry / change car / back to town | Playable, real numbers |
| Prize: wrapped -> hold to unwrap -> boxed -> tear open -> hero reveal -> add to garage -> try it now | Playable, built from primitives (hi-fi art is Stage 2) |
| Persistence | **MOCK**: `localStorage` key `aw-arcade-racer-mock-v1`, this device only |
| Town board | **MOCK**: fixed rows, labelled "not real players" |
| Read-aloud | **MOCK**: lights up the words; no voice yet (ElevenLabs line in Stage 2) |

Nothing here validates racing feel. The race is a short run with real physics-of-the-model, but it has not been tuned by play.

## The loop

enter (attract sign at the skate park) -> invitation ("Ready to beat your best?", or "set your first time") -> choose (Race the clock,
Practice, Garage) -> learn by doing (3-2-1, hints in Practice) -> race -> results -> prize (if an achievement was earned) ->
collection (garage) -> replay or return to town.

## The race, and why the clock is honest

- **The old coaster stretched every ride to exactly 30.0 s** (`buildTrack` normalises time). Nothing a player did could change the
  time. The race track here (`SPRINT`, `studies/arcade-racer/race-model.mjs`) uses the same turtle recipe and the same rails, but the
  speed is the track's own: downhill speed plus what the player earns. Practice on the old ride stays 30 s and cinematic; timed mode never stretches.
- **Skill input, the minimum that is understandable:** (1) *choose a lane* by tapping the left or right half of the screen: glowing
  orbs give a speed burst, cones slow you; (2) *time the launch*: tap the rocket in the first 0.45 s after GO for a boost, tap it
  early and the engine floods. Nothing else. Steering stays on rails.
- **Race clock versus presentation.** The clock is the count of fixed 1/60 s simulation steps since GO (`makeModel().step`). The camera,
  field-of-view kick, shake, the slow-motion swing-out after the line and the screen's frame rate never touch it. At the line the
  simulation freezes and the finish time is interpolated to the crossing; the slow motion plays on a separate presentation clock.
  The countdown is counted in simulation ticks too, so a headless run is deterministic.
- **What skill is worth (a bot, through `race-model.mjs`, not a human):** all-middle with a perfect launch 12.03 s (5 cones, 2 orbs);
  a greedy look-ahead bot with a perfect launch 9.04 s (0 cones, 7 of 14 orbs); the same bot with no launch boost 9.75 s. So lane choice
  is worth about 3 s on a 10 to 12 s run and a perfect launch about 0.7 s. These are measurements of the model.
- **Fair comparison:** every record carries `TRACK_ID` (`sprint-v1`), mode (`timed`) and class (`cosmetic`): board key `sprint-v1/timed/cosmetic`.
  Practice never writes a record. Changing the track, the pads or the physics bumps the version and starts a new board. All cars handle
  identically, so there is one class. If a later stage proposes handling differences, they become separate classes with their own boards.

## Achievements and cars (cosmetic only)

| Achievement | Test | Prize car |
|---|---|---|
| First chequered flag | finish a timed race | Comet |
| Orb grabber | 6 orbs in one race | Rocket Wagon |
| Under 10.5 seconds | finish under 10.5 s | Shark |
| Clean and quick | perfect launch and no cones | Monster Mini |
| Beat your own best, 3 times | three improvements | Shopping Cart |

Start with the Sunny Buggy, usable at once. Cosmetics: body, paint (six colours), honk; wheels, trail (the existing fire-wheels card
trail), engine character and presentation are candidates for the next round. An achievement is recorded once (`SAVE.ach[id]`), so the same
qualifying result cannot pay twice. The prize queue (`SAVE.prizes`) stores the stage (`wrapped`, `boxed`, `revealed`), so an interrupted
reward resumes where it stopped; the garage shows a banner until it is added.

## Reward sequence

achievement -> a wrapped box (paper, ribbon, bow) -> hold to pull the ribbon (or tap) -> the paper falls away -> toy packaging with a
window, a header and the car on its base -> tap, the lid flips and the car lifts -> flash, hero turntable with the name -> Add to garage -> Try it now.
Skip jumps to the reveal. Reduced motion (the turtle button, or the OS setting) turns every beat into one tap with no flash, shake or spin.
No paid or random loot: the prize is always the car its achievement names.

## Connections, not replacements

- **Coaster (AW-STUDY-0054):** the six cars, the track kit and the skate-park entrance are reused. The 30 s ride keeps its place; this
  adds a timed mode beside it. The Toy car charm is untouched (the garage notes it if you hold it). In production the first prize car
  could become the charm's art; that is a question for Evan.
- **Backpack / charms:** no new charm in Stage 1.
- **Signature home / trophy study (#619):** the earned cars and best time are the natural contents of a trophy shelf. Stage 1 shows
  the cars in a garage; a shelf in the home is for the home owner to decide.
- **Town:** the back button returns to `/studies/abbietown/?at=town:skate-park`. The gate is not changed; no entrance is added in Stage 1.

## Production plan for persistence (not built)

Ownership and records belong on the account (Postgres via the existing auth and jobs, see `docs/architecture/`): `arcade_cars(player, car,
earned_by, at)`, `arcade_runs(player, board_key, time_ms, orbs, cones, launch, car, at)` and a server check of the board key. A signed
run (inputs + seed) allows replay validation for any shared board. Recovery: the device save is a cache; the account is the truth, and a
lost device restores from it. Until then the mock key is labelled everywhere it shows.

## Oracle consultation: evidence quality

Evan ran the local Oracle `consult()` on his PC (source: studies, no model). Useful: small clear objective, icon and read-aloud
support, explicit setup/play/payoff, the world responds to actions. The retrieval returned off-topic references (Spore, Cartel Tycoon
and others) and generic rules; they are **not** used as racing research. This thread could not reach the Oracle, so the racing
references below are public game design writing, listed in the study's Context card, each used for one decision. Evidence quality:
the Oracle gave structure only, with no racing evidence; the racing decisions rest on public sources and our canon, and the feel is unproven until played.

## The candidate "arcade inside the world" contract (not yet in the general MO)

To absorb only after Evan reviews this study.

1. **Entry:** a place in the world (a gate) and an attract moment that is the place's own sign, not a menu.
2. **Invitation:** one real question the player answers ("Ready to beat your best?") with a clear way to learn first.
3. **Fantasy and objective:** one sentence, one icon row, read-aloud support.
4. **Learn:** a practice mode that never counts, with hints in the world; the player learns by doing.
5. **Play:** a short run (10 to 60 s) with at least one input that changes the score. Rails for access, skill for meaning.
6. **Clock honesty:** score on a fixed-step simulation clock; presentation effects live on another clock and never move the score.
7. **Score:** the result screen shows the number, the personal best, the improvement, the achievement and the next goal.
8. **Fairness:** records keyed by track, mode, version and class; practice and mock rows never mix with real ones.
9. **Reward:** earned by play, once per qualifying result, resumable, skippable, with a reduced-motion path; a treasured object, not a toast.
10. **Collection:** what is earned is visible, selectable and used on the next run; cosmetic first.
11. **Retry and exit:** race again, change car and back to the world, each one tap from the results.
12. **Persistence:** a labelled mock first; account-backed ownership before it is live.
13. **Verification:** a headless run plays it end to end (INVARIANTS.md 1) and fails on any page error; a deterministic clock makes the run repeatable.

## What Stage 2 needs from Evan

1. Does the race feel like an arcade game (lane taps and the launch timing), or does it want a third input?
2. Is a 10 to 12 s run the right length, or should timed mode run longer?
3. Which prize beat did you like most (ribbon pull, box tear, hero turntable)?
4. Should the first prize car become the Toy car charm?
5. Do you want the other reference vehicles (the pink retro convertible, the pink boxy off-roader, the angular armoured car) as originals in the garage?

## How it was made, and how to be faster next time

Timeline (local, UTC-4): the issue arrived at 12:41 PM; the playable loop, the model numbers and a headless run were in the same session.
Where the time went: reading the coaster's kit, deciding the race model, and writing the prize stage geometry (the wrapping panels took
two passes). What slowed it down: the reference photos were not reachable from a cloud thread, so the cars are the existing garage, not
matched to the pictures. Speedups: (1) the race model is pure numbers, so a bot measured the skill spread before any rendering;
(2) a deterministic tick clock made the headless test stable on software WebGL; (3) the prize stage is a reusable pattern (`buildPrize`),
the next collectible only needs a name and a colour; (4) ask for a PC agent early when the brief names reference photos.
