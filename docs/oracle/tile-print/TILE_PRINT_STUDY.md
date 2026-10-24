# AW-STUDY-0025 - Tile pull and print

Evan, 2026-10-23 08:18Z: "simulation for tiles should be premade. only redone if user customizes in which case it
should 'print the tile' in a slow animation window that actually finishes with a print animation ... when you pull a
tile it gives you a dialog, which I won't want. when you pull the tile, it should have preloaded the sim, pull the
MODEL from the CARD and drop the model onto the board ... if the user pulls the model from the card.. the card's blank!
it can show any final details or maybe a facet that says drop here to customize.. and then you can come back, the
model will shrink then expand into a proper interface for customizing the tile? each tile owns its own".

Advance page (storyboard and findings): https://claude.ai/artifact/A6zgeRWA7WdA2D81bQCNip

## Findings: where the lag and the dialog came from

Measured in a headless phone-sized browser on `main` (SwiftShader, so absolute times are slow; the order is what
matters): the pull took 24 s to lift and the landing 185 s to settle, and the tile sheet was open afterwards.

- **Nothing was made before the touch.** Pressing a card called `selectGenerator`, which started `prepareTile`
  (`simulations/lab.mjs`). That plans the whole board again with the new tile, draws it, builds its life and warms
  the shaders. The drag waited for it (`heroMove` waited on `selectionReady` in `simulations/tile-chooser.mjs`), and the
  pull only counted when it went left or up.
- **Dropping on another hex prepared everything again** (AW-STUDY-0015).
- **Landing redrew every tile**: `commit` calls `generate()`, which redrew every tile and rebuilt all life (0015).
- **The dialog was the tile sheet.** A pulled card holds pointer capture, so releasing the drag sends a click to the
  card. Sandbox v2 treated a click on the selected card as "open the tile options sheet" (`toggleSheet` in
  `simulations/ui-v2.mjs`). Every pull therefore ended with the sheet open.

## What changed

| Piece | Where | What it does |
|---|---|---|
| Premade tiles | `tile-chooser.mjs` (`premake`, `premakeTick`, `adoptPremade`) | Once the board settles, each hand card prepares its tile for the free hex nearest the middle of the view, one at a time, and keeps it. Pressing a card adopts it with no prepare. A board change drops the premades and they are made again. |
| Pull | `tile-chooser.mjs` (`heroMove`, `pull`) | The drag starts on the first 8 px in any direction. If the tile is still being made, the card's picture rides on the finger until the live model takes its place. |
| No dialog | `ui-v2.mjs` | A click on the selected card no longer opens the tile sheet. The sheet is still in the toy box and on the hand's options button. |
| Blank card | `tile-pull.mjs` (`blankCard`) | While its model is off, the card is plain stock cut to the same die line, with a dashed hex and a plus: "drop here to customize". The card art files are not changed. After the landing the art rises back in. |
| Fast landing | ported from AW-STUDY-0015 (commit 2fecaca) | The hovered hex is prepared while you carry; landing keeps every unchanged tile; wind-up, slam, dust and crunch-thud. |
| Customizer | `tile-pull.mjs` (`openCustomizer`), `tile-chooser.mjs` (`customize`) | Bring the model back to its card: it shrinks into the card, and the card grows into that tile's own customizer. Kinds as small cards (Ranch, Paddock, Sugar shack; garden kinds; planets) and each setting as a row of hex pips (households, vegetation, cargo). Settings are a draft until Print. |
| Print | `tile-pull.mjs` (`openPrintWindow`), `tile-chooser.mjs` (`printCustom`), `live-tray-preview.mjs` (`reveal`) | The only re-simulation. The card becomes a little printer: the head waits over an empty bed while the tile is really made, then lays it down from the bottom up (a clipping plane on the live preview), with a paper-feed tick per layer, then an ink stamp and a thump. At least about four seconds. The new model goes back on the card, ready to pull. |

## Round 2 (Evan, 08:43Z to 08:54Z)

- "drag the icon itself off the shelf, and drop it on the board, it should then roll like a die": the card rides on
  the finger, and the landing is `rollTile` in `tile-drop-impact.mjs` (falls in from the side, tumbles about its centre,
  hops twice, squares up on its hex; dust and crunch-thud on the first hit).
- Five reveal effects to pick from, on the same throw: https://claude.ai/artifact/Wiev9pUG9fkNg9Q9ZmmHCy (A tape burst,
  his idea; B print up; C pop-up book; D sprout ring; E brick rain). The pick goes in next.
- "custom -> that needs to FLIP THE CARD and show the custom mechanics at play on a simulated tile that is constantly
  printing": the customizer is the card turned over, the live tile on the card's body colour with a print head that
  keeps sweeping it; Accept keeps the old tile printing in the bed until the new one is made, then lays it down and stamps it.
- "If you click it, that is a CARD": a tap opens the same card-designer card. The glass tile sheet no longer opens from a card.
- "first one should not be selected by default": no card looks picked. "this shouldn't happen": the frame round the Ranch
  card was its focus ring doubled by the selected glow; a card in the hand shows focus by lifting.

## Round 3 (Evan, 12:47Z to 21:35Z): the reveals in the game

- Picks: brick drop (E) and laser print (B); tape burst (A) was studied but is not in the game. "all of these should take
  1.5 seconds tops", "maybe it's only 2 phases for each".
- **Landing** (`simulations/tile-reveal.mjs`, `landTile`): the bare slab rolls in (`rollTile`), then every standing piece
  (asset groups, tree crowns, trunks, props; read from the drawn tile, at most 150) drops from the air with plain
  gravity, bounces, tumbles and settles inside the hex (phase 1, at most 0.62 s of settling). Then each piece in a
  shuffled rapid order hovers, wobbles upright and shoots home with a click (phase 2). Ground cover grows in under it.
  Every node is put back on its exact stored transform at the end (checked: hash of all transforms equal, done at or
  before 1.5 s at 60 fps). A tile with fewer than three loose pieces (city, moon) just grows in. Reduced motion skips it.
- **Print** (`tile-pull.mjs`, `openPrintWindow`): no arm and no carriage. A beam from above traces the cut line, the
  layers just made glow hot, sparks at the spot; the reveal itself is 0.9 s, then the laser draws the ring and tick and
  it cools to ink. The old tile still loops under the beam while the new one is really made.
- Not built: the powder blow-off of the laser study (the card shows the live tile, which the powder would hide), and the tape burst.
- Shader precompile and the DOS-computer intro belong to the performance thread.

## Design card

- What the player feels: "the tile is right there on the card; I can grab it and drop it." And "if I put it back, I
  can change it, and the game makes me a new one."
- How would the character know? They don't: cards, the blank, the customizer and the print window are tools for the
  player. Only the landed tile enters the world, and the world reacts to it (dust, sound, the tile's people and animals).
- Mode: overlay for the customizer and printer (summoned, precise choices); none for the landing (the world just has a
  new tile in it). The print stamp is meta (felt: the thump).
- Who it's for: player.
- Presentation layer: everything in `tile-pull.mjs`. World layer: only the committed tile.
- Tour: yes. A stop "Pull it off the card." in `welcome/tour-stops.mjs`. The reveals are part of that stop's feature: no new stop (whats-new `tour: false`).

## Next

- **A tile made once for any hex.** `prepareTile` still plans against the whole board for one hex, so a tile dropped on
  a hex other than its premade one is made again while you carry (0015's spare). Making a tile once and fitting it to
  any neighbour (edges and ground blend) would make every drop instant.
- Premades use memory (four prepared tiles with their life). If phones struggle, keep only the two most-used cards.
