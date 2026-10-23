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
- **Chest:** ten slots shaped like their charms, lid engraved "n of 10". `first-memory` was removed from `CHARMS` (backpack PR #418), so ten is the whole set. The floppy is won by beating the basement word game. Moon cheese is repeatable, one slot, two on the keychain.
- **Jewellery box:** drawer box with a glass dome over each charm (recommended); wall shadow-box is the bedroom alternative.
  Hang up to two on the bag; the box toggle uses `putInBox` / `inBox` from `backpack.mjs?v=6`.
- **Charm places:** tardigrade at the lab, floppy at the café cellar door, key and coffee cup at the café, star at the
  school, bub in Abbie's yard, moon and rocket at the black truck, moon cheese at the Moon outpost (ghost until a Moon tile is
  placed), heart is the coin chest's reward. Nothing yet on Ani's side.

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
