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

## Round 2 (2026-10-23): decorating with cards, hero charms, the charm camera
Evan, 16:34Z: "use the card system though instead? ... maybe the card system can be used as a decoration mini game ??
you can just click the part of the backpack to change then the cards show and you drop into the facet?" and "these are
perfect, build the charms, and make sure there's a camera view in inventory that closes in on charms". Then 16:49Z: the
first charm is a tardigrade, won by finishing Abbie's science adventure (the cell game, AW-STUDY-0047).

- Decorating is a card game (`simulations/backpack-cards.mjs`). The brush on the open backpack turns on dress-up. Tap
  a part of the bag (`facetOf` maps part names to facets: the shell is colour and pattern, straps and zips are trim,
  the inside is lining, the front pocket is pocket, anything else is style). A hand of Cards v3 faces is dealt for
  that facet (`cards/v3/face.mjs`, `renderFace`, print style), each showing a flat bag drawn in that option. Lift a
  card and drop it on the bag to apply it, or tap it. The part being decorated glows gently. One card system, not a
  fork: the faces, the lift and the drop come from Cards v3 and the tile print designer (AW-STUDY-0014, 0025).
- Hero charms, modelled from the Midjourney charm sheet (`12-charms`): faceted gold or enamel pieces on a four-link
  gold chain. The coin with a struck star, star, heart, crescent moon on a cloud, brass key with a heart bow, floppy
  disk, bub the black lab, coffee cup and rocket. A full set hangs in staggered rows on the two side seams, clear of the
  widest part of the bag below each ring.
- The tardigrade is the first charm in `CHARMS`: a plump segmented water bear on four pairs of stubby legs, pink enamel
  with gold claws, matching the cell game's pink water bear. That game calls `earnCharm('tardigrade')` on its win
  screen. Every page with the backpack then plays the golden pickup ("A tardigrade charm for my backpack!") because
  `inventory.mjs` now also checks for new charms on `aw-backpack-change`. No Midjourney proof yet for this one (the
  Mac was busy on other proofs); it was modelled from the cell game's art direction and real tardigrade anatomy.
- The charm camera. Tap a charm, or the star button on the open backpack, and the camera closes in. The bag turns that
  charm's seam toward you, the charm turns its face to the camera with a slow sway, and its quest is told in a bubble
  at the bottom. Swipe sideways for the next charm (the camera steps back a little between charms so the move reads);
  tap anywhere else to come back.

Lessons: framing a close-up by moving the camera round a bag sends it through the bag between charms. Turning the bag
instead, and leaving the camera in front, keeps the bag out of the shot. Charms must hang clear of the widest point
below their ring, not just of the seam beside it.

## Round 3 (2026-10-23): higher-fidelity pass
Evan, 18:37Z: "Backpack is approved for higher fidelity pass." Still low-poly parts, with real materials and real small
parts, so it reads as made rather than extruded.
- Cloth relief is a real normal map built from a grain-only height canvas (canvas twill, pebbled leather, nubbly plush,
  basket weave, vinyl speckle). Before, the colour canvas drove the bump, so stripes and dots rose off the surface.
- Material roles got physical properties: sheen on plush and canvas, clearcoat on vinyl and leather, glass with a
  clearcoat, harder metal.
- A small studio is baked once for reflections (sky gradient, a warm key softbox, a cool rim strip). Gold reads as
  gold instead of brown.
- Real parts: stitching round each shell and along both edges of every strap (instanced, one draw call each), zip teeth
  along each rim, padded rounded-rectangle shoulder straps swept along a curve instead of round tubes.
- Fixed: the heart charm's facets were wound the wrong way and half of it vanished; `gem()` now checks the outline's
  winding.
- Charms stay hand-built placeholders until the Meshy versions land (tardigrade first, then the rest, via the Meshy hero
  thread). Meshy references are Midjourney pictures of each charm on a plain background, run per charm on the Mac.
Next: bake contact shading into the vertex colours, a leather label on the pocket, and swap in the cleaned Meshy charms.

## Round 4 (2026-10-23): she wears it, and every reward is a charm
- Evan, 20:51Z: "scratch the coin idea, it's all backpack charms." The gold coin charm (`first-memory`) is gone. The
  floppy disk (`basement`) is now won by beating the word game in Grace's basement (two minutes of play in all); the
  basement game calls `earnCharm('basement')`. Evan's picture of a blue enamel disk is the floppy's Midjourney pick, and
  the hand-built floppy now follows it (silver shutter, yellow label, dark metal rim) until its Meshy model lands.
- Evan, 20:51Z: she can keep each charm in her jewellery box or on her backpack, and her in-game character wears the
  backpack, with the charms jingling, in every FPS level and minigame that shows her (the overland map can wait).
  - `putInBox(id, yes)` and `inBox(id)` in `simulations/backpack.mjs`; `keychain()` leaves boxed charms off.
  - `simulations/backpack-wear.mjs`: `wearBackpack(bone, {height, offset})` mounts her saved backpack with its charms
    on a chest bone or a figure group (+z is her front), `update(dt)` each frame. The pendulums follow world motion
    and a charm tinks (three inharmonic partials, WebAudio, diegetic) when its swing turns round hard. It rebuilds on
    `aw-backpack-change`, so a newly earned or boxed charm shows without the game doing anything.
  - The study page has a "Worn" stage: a smooth stand-in mannequin running a loop.
- No charm unlocks from coins any more. The Star is "Climb onto the school roof" (the school game calls
  `earnCharm('school-roof')`), and the Heart crowns the set: it comes when every other one-off charm is earned.
- Tour: no (it is the same backpack, now worn; the tour stop stays the first pickup).

## Round 5 (2026-10-23): Meshy charms
- The six cleaned Meshy charms from the Meshy hero thread (`simulations/assets/backpack/charms/*.glb`: tardigrade
  textured; heart, moon, rocket, star, floppy disk untextured with one "charm" material) replace the hand-built ones.
  `loadCharmModels(ids)` reads them with a small GLB reader inside backpack.mjs (one node, plain triangles, an optional
  base-colour image), so every page loads them with its own three.js and needs no importmap. Views and the worn
  backpack draw the hand-built charm first and rebuild when the model lands; a charm without a model keeps its
  hand-built stand-in (now only the toy car); bub, the coffee cup and the brass key landed later the same evening (PR #453). Untextured models are shaded by role
  (enamel red heart and rocket, gold moon and star, blue floppy). Turns: the water bear hangs side on, the disk stands up.
- New charm `toy-car` (the charms study's chest of eleven): 10 of the 16 stars in the toy-car coaster, granted by the
  coaster game with `earnCharm('toy-car')`. Hand-built until it has a Midjourney pick and a Meshy model.
- Next: textured Meshy runs for the floppy disk (Evan's picture has a yellow label and silver shutter) and the rocket.

## Round 6: the floating mini (Evan, 22:55Z)

"I like back pack as a stand alone ... floating mini's just idly floating around waiting to be interacted with ...
bring back pack to center ... arrange slots for the cards, but use card designer please", "the settings / slots for
cards include the facets, and the styles", "they are all used to control the style".

- Tapping the backpack register on the weather instrument (or B) flies the backpack to the middle of the screen. It
  hangs in the air there with a slow bob and sway, and no floor or shadow. Nothing behind it is dimmed or blurred,
  because the page is see-through everywhere except the backpack, the slots and the hand.
- Six slots sit around it, three on each side: Style, Colour, Pattern, Pocket, Straps and Lining. Each one shows the
  Cards v3 card (`face.mjs`, print style) the backpack wears now.
- Tap a slot and that hand is dealt above the play dock. Drop a card into its slot, or onto the backpack, or just tap
  it, and the backpack restyles live and the slot's card updates. Tap the backpack to open it half shell.
- Player clothes will join it later as more floating minis. For now there is only the backpack.
- Also fixed: a dragged card could be left stuck on the world (Evan, 22:56Z, "saddlebag is stuck in live game").
  Drags now always clean up.
- Files: `inventory.mjs` (float layout, slots), `backpack.mjs` (`float`, `deckHost`, `overSlot`, `deal()`) and
  `backpack-cards.mjs` (`slotFace()`, split colour and pattern hands).

Tour: no.

## Round 7: the left bar and the notebook (Evan, 23:39Z)

"6, backpack, should show as an actual 3d poly backpack on the left side of screen if user clicks it that's when it
opens, showing your stuff ... when you open back pack, THATS where you see your notebook, and in your notebook is a list
of quests (hand written in pencil font on ruled yellow line paper in a fluffy care like number 7. let her pick her
notebook as a facet of her backpack. you can show it under the backpack on the left bar. the left bar (use liquid glass)
... the left side is stuff the PLAYER in the game can touch."

- The left bar (`#aw-left-bar`, made by `inventory.mjs`) is a liquid-glass object on the left edge, with depth from its
  highlights and edges and no blur. It holds the real backpack model, drawn small and idling with a slow turn and a
  breath, in her look and with her charms, and her notebook cover under it. The backpack has left the chronograph.
- Tapping the backpack brings it into main focus (round 6) and the bar steps aside. Her notebook peeks out beside the
  open backpack.
- The notebook (`notebook.mjs`) opens in main focus with its fluffy cover beside the page. The page is yellow ruled
  paper with a red margin, and the writing is Patrick Hand (OFL) in pencil grey with hand-drawn tick boxes.
- The notebook lists the townsfolk favours from the quests thread's `quests.mjs` `list()`: each shows its next step and
  who asked, with finished steps ticked under it. After them come the charm quests.
- The cover is a new backpack facet, `notebook`, with seven fluffy covers drawn from Evan's picture: Strawberry (heart
  sunglasses), Unicorn, Puppy, Rainbow bear (crown), Bunny (winking), Kitty and Teddy. It is the seventh card slot
  round the floating backpack, and it stays the same when the style changes (`keep: true`).

Tour: yes. Players need to know where their quests are.

## Round 8: the loadout, dressing it by its parts (Evan, 2026-10-24 00:16Z)

"The card dynamic is NOT working at all. instead leverage inspiration from FPS games and treat the facets like they are
slots on the model -> then find very simple small interaction systems where you click the facet to enable selection
then pick from a small and unobtrusive list of options."

What changed: the seven card slots round the floating backpack and the hand along the bottom are gone. In their place is
`simulations/loadout.mjs`, a shared module modelled on an FPS gunsmith. A small glass bead sits on each slot of the
model: the style just above it, colour and pattern on the shell, the pocket, the straps, the lining at the opening, and
the notebook peeking out. The beads ride with the backpack as it floats. Tap a bead, or the part itself, and that slot is
selected: the part glows, the bag stops turning (the lining opens it part way), and a short strip of swatches or mini
icons opens beside the bag, never over it (below it on a phone). Tap one and it goes on. Tap the bead again, empty space,
or Escape, and the strip folds away. The basket orb opens it half shell on what she carries.

How the beads find their parts: `backpackView` casts a 22 by 22 grid of rays over its stage every 0.4 s. Each slot takes
the hit on its own part nearest a home spot on the silhouette, so the two straps get one bead and colour and pattern sit
apart on the shell. That hit is kept as a point on the part, so the bead stays glued to it every frame. A part out of
sight (the lining while shut, no pocket) falls back to the nearest surface by its home spot. `view.anchors()`,
`view.bounds`, `view.select(f)` and `view.pick(f, value)` are the hooks; `onPart` turns part taps into selection.

Reuse: the buggy (carwash) and her clothes can use the same module with their own slots and anchors. The card faces
(`backpack-cards.mjs`) stay for the study page's old decorate mode only.

Tour: no. It is the same backpack, dressed in a simpler way.

Using what she carries (same round): tap a thing in the open backpack and `aw-inventory-use` fires with `{item}`. A
listener that takes it calls `inventory().remove(item.id)`. The effect pickups picked up while driving (embers, droplets,
pet treats, dye drops) are counted by `effect-charge.mjs`, the one store, and the backpack shows them as items. Tapping
one charges its world effect there and then (`charge(id)`), and Abbie says so.

## Abbie's default backpack (Evan, 2026-10-24 01:00Z)

"this is abbie's default backpack": Bunny, Grape, Stripes, Heart pocket, Pink and gold straps, Rainbow lining, Rainbow
bear notebook. `DEFAULT_LOOK` in `backpack.mjs`; `look()` uses it whenever nothing is saved, so new players start with
it and Abbie wears it in every game until she changes it. Tour: no.
