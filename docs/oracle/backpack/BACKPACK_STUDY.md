# AW-STUDY-0046 - Abbie's Backpack

Page: `/studies/backpack/` (prototypes/ranch-atelier/dist/studies/backpack/). Thread: "Backpack inventory".
Canon: `docs/design/GAME_CANON.md`. Code: `simulations/backpack.mjs` (model, view, styles, facets, charms) and
`simulations/inventory.mjs` (the one store, the register on the chronograph, pickups, charm moments).

## The ask (Evan, 2026-10-23 15:53Z)
"Abbie's inventory is a backpack... player inventories are backpacks, and they are opened fully 'half shell' style even
though they need not physically match that, we can just cleave the mesh ... and she should be able to pick from 10
different styles, and then customize 5 different facets in different ways, and one of the vanity badges she can earn in
the game for completing quests is backpack charms."

## Design card
- Feel/know: "Everything I've found is in my backpack, and my backpack is *mine*."
- How would she know? She carries it. Opening it shows the things, not a list.
- Modes: meta for pickups and new charms (her inner voice, a jingle); overlay for the register on the chronograph and
  the opened half shell (summoned, floats over the world, no dimming or blur); diegetic for charms on the backpack her
  figure wears; none for the world reacting (the basement door opens for the key).
- Who it's for: the child. Directors read the `abbie` manifest items `pocket` and `charms`.
- Tour: yes, once the first item can be picked up in play (the café key).

## How it's built
- Silhouette per style (`SIL`), extruded once. The cleave: every vertex behind the cut plane is clamped onto it, so the
  shell has a flat inside; the outside is puffed by a per-style amount (`PUFF`). The back half is the same shell
  mirrored. Each inside takes the lining (inset to leave a fabric rim). Zip piping runs round each rim.
- The front half hinges on the bottom edge and turns 180 degrees: both insides face the camera like an opened clamshell.
- Items sit on sockets in both halves as picture tiles; Daddy's core memories ride as a pile of gold coins.
- Charms hang from rings on the back half's side seams as damped pendulums driven by how the ring moves.
- Flat-shaded low poly with real material roles: `fabric <cloth>` (canvas grain, leather grain, vinyl, plush, wicker
  weave as colour and bump), `lining`, `trim strap`, `metal hardware`, `glass porthole`, `charm <id>`.
- Three.js loads only when the backpack is first drawn.

## Proofs
Midjourney proofs, 12 prompts (10 styles, the half-shell open, a charm sheet), run on Evan's Mac:
`tools/midjourney/outputs/backpack-0046/` with `provenance.json`. Round 1 of the models was built while the Mac was
offline and is matched to the proofs when they land.

## Round 1 (2026-10-23)
- 10 styles, 5 facets (10 colours, 6 patterns, 5 pockets, 6 strap/hardware sets, 6 linings), 9 charms (6 earned from
  coins and items, 3 waiting on their quests: fetch with bub, first coffee, the Moon Mission).
- Dress-up in game: the brush orb on the open backpack; arrows and dots change style, five orbs cycle the facets.
