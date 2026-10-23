# AW-STUDY-0053 Charms Map and Jewellery Box

Page: `prototypes/ranch-atelier/dist/studies/charms/index.html` (live `/studies/charms/`). Thread: "Charms map and jewellery box".
Evan, 2026-10-23 4:19 PM and 4:23 PM: a "show me where I can earn my charms" view, a charm chest of ten "just like the
coins", a jewellery box with encasement, the Winchester board as the sample world with the tardigrade in the science
lab, the high school at the centre of all three zones (no minimap logo there; the three zones get logos), and a mission
board for the demo. Then: "the way we show things you haven't earned yet is a locked card ... it shows a disabled
version of the tile, and a button to locate where to unlock, and draw a 3D low poly hi fi padlock there (game ready
asset only)".

## Decisions
- **Earn map:** the chest opens glints over the places that pay a charm (spatial). Tapping an empty slot opens its **locked
  card** (greyed card, one sentence, "Show me where"). That button flies the camera there, lights the place with a column
  of lantern light and sets the padlock on it. Bub's paw prints are the hint for being stuck (diegetic).
- **Padlock:** `tools/charms/padlock.py` builds `models/padlock/padlock.glb`: 158 triangles, flat shaded, parts
  `padlock body`, `padlock shackle`, `padlock keyhole`, materials `metal gold`, `metal steel`, `keyhole dark`. The page renders
  the real GLB once to a picture for the board. When a charm is earned the padlock should spring open (animation not built).
- **Chest:** ten slots shaped like their charms, lid engraved "n of 10". `first-memory` was removed from `CHARMS` (backpack PR #418), so the set is now eleven (toy car added; Moon is renamed Moon base). The floppy is won by beating the basement word game. Moon cheese is repeatable, one slot, two on the keychain.
- **Jewellery box:** drawer box with a glass dome over each charm (recommended); wall shadow-box is the bedroom alternative.
  Hang up to two on the bag; the box toggle uses `putInBox` / `inBox` from `backpack.mjs?v=6`.
- **Charm places:** tardigrade at the lab, floppy at the café cellar door, key and coffee cup at the café, star at the
  school, bub in Abbie's yard, moon and rocket at the black truck, moon cheese at the Moon outpost (ghost until a Moon tile is
  placed), heart ('Earn every other charm') comes by itself, no place; star is 'Climb onto the school roof'. Nothing yet on Ani's side.

## Mission board spec (for "Demo flow and opening tour")
Town noticeboard in the square by the school: cork, painted-wood frame, brass plate "TOWN NOTICES". Four pinned die-cut
cards (picture of the place, one sentence, charm stamp): Coffee shop basement, Science lab, Moon base mining (grey with
"Needs the Moon tile" until a Moon tile is on the board), and a large Moon Mission card. Done cards get a green "Done" tag.
Open missions also fly a small flag over their place on the board.
Zoom: 0 to 0.9 s dolly toward the place; 0.5 to 1.3 s a smoke puff on the place only (under a quarter of the screen) hides
the swap; 1.3 s the mission's own opening shot. No full-screen fade. Return is the reverse puff, then the charm drops in the chest.
Unlock order: the Moon tile is the Moon Mission's prize in the real game; the demo may start with it in the bag (the stage has a toggle).
Tour: yes for the chest and the mission board when built; this study page itself is `tour: false`.

## Not built
Chest and noticeboard inside `/town`, real tile-conforming terrain, the padlock opening animation, the grown-up charm list,
a hero picture for moon cheese.

## The charm track (Evan, 2026-10-23 5:43 PM)
The overland loop: explore, find the minigames, collect world charms, unlock card blueprints, expand the board with new
tiles (Moon base, farm, a Science tile with the high school where the science fair happens). That progression is **the
charm track**; other tracks come later. The page shows it as rungs: charms -> blueprint -> tile, driven by one `TRACK` list.
Proposed rungs (for Evan to rearrange): tardigrade + star -> Science blueprint -> Science tile; Moon base + rocket -> Moon
base blueprint -> Moon tile; bub + coffee cup -> Farm blueprint -> Ranch tile; floppy + brass key -> Basement arcade card
blueprint; toy car -> Coaster blueprint (card); heart (every other charm) -> World of boards. Open: the high school now lives
on the Science tile, not the Winchester centre (Winchester files untouched here).

## Eleven charms (Evan 5:44 PM)
Added Toy car (10 of 16 stars in the coaster game; a placeholder spot on Abbie and Daddy's side). The Moon base charm is the
existing `moon-key` charm shown as "Moon base" (one charm for the base; rocket stays for finishing the mission, cheese is
repeatable mining). Backpack thread to confirm or ask Evan for a separate charm.

## Floating charms (Evan, 2026-10-23 6:51 PM): drafted, not in the game
Charms are the only reward and hang in the world as spinning, glowing pickups, like the hidden packages in GTA 3. Two kinds:
*won* charms drop at their place when the minigame ends; *found* charms (bub, coffee cup, brass key) sit hidden until explored to.
The Heart never floats. Hint is meta only: a chime that rises as you near one (the study shows a shimmer ring). The study page
has a playable preview. Placements are Winchester edits and are listed in the page for the hex city thread; nothing was edited here.
Dispatch check: the newest dispatch (issue #482, loading screen with the chalkboard card gesture) says nothing about charms and was already taken by the intro and precompile thread.

## Winchester notes (22:53Z)
Lab gone (science adventure parked); Science tile cancelled, high school stays in the Downtown centre hex (first track rung parked);
black truck parks at the French bakery curb; skate park beside the café is a candidate charm spot; the oak is Abbie's pink tree house.
Floating spots updated on the page; use `AbbieTown.board.heightAt` and `board.obstaclesNear` when placing.
