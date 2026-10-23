# AW-STUDY-0048 - Changing Worlds

Page: `/studies/worlds/` (`prototypes/ranch-atelier/dist/studies/worlds/index.html`, built by `docs/oracle/changing-worlds/build_page.py`
from `worlds.template.html`). Model: `simulations/worlds/worlds.mjs` (test: `simulations/tests/worlds.test.mjs`).

## The ask (Evan, 2026-10-23 17:30Z)
"we still don't have a proper way to change worlds in the game ... do a study for the UX around that ... the final
winchester region should a mega structure of 7 hexes in a greater hex ... carve the 3 regions roughly 33% each."
Extra scope from the Moon Mission thread: Ranch, Abbie's Town, Launch, Moon base and New Nova; arrive and return; what the
family sees on the TV when the crew changes world; how the rocket port and the tile-drop reveal fit.

## Design card
- Feel/know: "I can always go the way I came, and my backpack is with me."
- How would a character know? A door, a truck, a train, a rocket port. Diegetic first.
- Modes: diegetic for the ways and the arrival lines; spatial for a ring over the way and the pin over the way back; meta for
  the coin warming, the key jingle and the engine hum; overlay for the map and the Captain's Hat; none for a locked cellar that rattles.
- Who it's for: the child (play); the family TV adds jobs, a vote and the Hat.
- Tour: **yes**, once a second world is playable ("The black truck takes you out of town").

## What exists today
Every place is its own page. Ranch: `/sandbox` (Basin behind `?world=basin`). Town, basement, school, cell game, hex city and the café are
studies with direct URLs. The town fires `abbietown:cafe-door`. Family Teleport (`/teleport`) is a separate toy with six generated stages.
No teleport drawer was found in the app code. Coins and charms follow a signed-in account (PR #364); items and the visited list do not yet.

## Recommendation: doorways and rides (A)
Rooms are doors, worlds are rides, every way there is the same way back. The camera goes through the way (no fade, no loading card).
Option B (tile drop) is used once per new world as a reveal (the pink rocket tile). Option C (map) is a backpack page that only pins
places already visited, unlocked later as a reward. Core-memory places: hold up a gold coin; only for places already visited.
Family TV: the truck and rocket wait for every job; a fork is a vote; ties go to the Captain's Hat, which then moves on.

## Winchester
Seven hexes (centre plus six) form one greater hex. Regions use the ids in `abbietown/regions.mjs`: `downtown`, `anis-side`,
`abbie-daddy-side` (sub-areas lake-country, pond-side, school-hill). Each takes two outer hexes plus a wedge of the centre; the church park
disk is always Downtown. Measured on the real 760 m hexes: 32.5%, 32.6%, 34.9%. Launch is off the map north, New Nova south. Regions are
walked, not changed like worlds.

## Sources and honesty
Oracle: local records for Zelda BotW, Outer Wilds, No Man's Sky, Hades, A Short Hike, Animal Crossing, Tiny Glade, Portal. Pokémon and
Mario Odyssey are not in the Oracle; their lines on the page are general knowledge, flagged. Three web articles were found by search and
listed in the context card as "not read in full".

## Next
1. Backpack store holds items and visited list. 2. Black truck as the first ride (cutscene, tile drop, job presses). 3. Doors: cellar, Muraco, lab.
4. Train and ranch gate. 5. Map page as a reward. Decisions to confirm: truck first, tile drop as one-time reveal, map as reward.
