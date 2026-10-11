# Abbie’s Worms — plate spec

The artillery rules are already settled. This document is the production surface those rules play on. It is the source the art requests in `art-requests/open/20261011-worms-*` fulfill.

The browser prototype (local commit `4c12824`, no remote) is a rules checkpoint only. Its Three.js garden, code-drawn “SVGs,” oscillator score, and HTML shot workshop are not assets and are not imported here.

## What stays

The deterministic kernel in that local checkout:

- 1280×720 logical field, heightfield terrain, wind, gravity
- crater carving, impact and fall damage, water
- three weapons: impact seed, fuse berry, splitting acorn
- five-level shot search, hot-seat teams, turn timer, move budget

When a host is built, port that kernel. Do not re-tune it to match a painting.

## What a match looks like

One fixed side-on camera on an iPad landscape screen. Paintings fill the screen with fit, never crop. The same composite Marble Voyage uses for fight plates: 4:3, target **2048×1536**.

Back to front:

| Order | Semantic ID | Parallax | What it is |
| --- | --- | --- | --- |
| 1 | `plate.worms.garden.sky` | 0.15 | Opaque far sky, clouds, sun, distant fence. |
| 2 | `plate.worms.garden.mid` | 0.40 | Far beds and flowers only. Empty regions are flat key color, not sky. |
| 3 | `plate.worms.garden.soil` | 1.00 | Tileable cutaway the heightfield clips. This is the only ground. |
| 4 | worms, shots, craters | 1.00 | Simulation, drawn on the soil plane. |
| 5 | `plate.worms.garden.near` | 1.35 | Leaves and pots at the left and right edges. Center stays clear. |
| 6 | `fx.worms.garden.motes` | by depth | Pollen, flecks, dust puffs. |

Parallax is a small screen shift from the active worm’s horizontal position, the same idea as `MarbleVoyageSceneAtmosphere`: near layers move more than far ones. Wind also drives motes and a slight sway on the near leaves.

The soil strip is **2048×512**, tileable on X. Grass is a straight lip along the top. The game masks this texture with the heightfield, so the painting must not contain a baked hill, a character, or a crater. Water, when the mask reaches it, is a thin band along the bottom of the strip.

## Characters

Abbie is the style lock: an original peach earthworm with a pink bow, side view, facing right, full body, transparent ground. She is not the human child from the cottage portraits.

Four poses share one body: idle, aim, hurt, win. After a pose is kept, it is traced to a layered SVG (body, face, bow) so menu and battlefield use the same drawing. The other eleven worms are later costumes on that locked body. They are not part of this batch.

## Gesture, music, menus

Not this batch.

- Aim is a drag on the sky. The predicted arc is the control. Power is a hold on the battlefield.
- Menu loop and match loop are recorded stems (`music.worms.menu`, `music.worms.match`), ducked under hits. No oscillator score.
- Team setup and the cast gallery come after one battlefield reads as finished.

## Host

A World2 screen in the Plink family: a host view, these plates, the ported kernel. Landscape fit, safe areas, no site header. Do not ship the prototype inside a web view.

## Art landing

Originals land under `AssetSources/AbbiesWorms/garden-v1/` with job id, candidate index, and sha256. Do not bind into Swift in the same change that delivers the pictures. Evan approves stills before a renderer is written.
