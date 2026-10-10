# Art direction (decided by Evan, 2026-10-10)

Three looks, each with one job. Every design is our own: no borrowed franchise mechs, emblems, names or text.

| Use | Look | Reference proof |
|---|---|---|
| In-game: maps, tiles, sprites, battles | 16-bit pixel art: 32x32 tiles, limited rich palette, chunky dark outlines, SNES-era RPG readability | p03 town map (also p16 world-map travel) |
| Story boards: cutscenes, building interiors, portraits | Painterly digital illustration, built in depth layers for parallax | p11 briefing room (also p10 hero, p14 vault, p15 ambush) |
| Concept art: key art, title screen, mech and faction design | Neon 1990 title screen: chrome and violet rim light, starfield, ringed planet | p01 title key art; p09 emblems for the two houses |

Proof votes, round 1: thumbs up on p01, p03, p09, p11; no thumbs down.

How this maps to the pipeline: one game, three style packs used together, not swapped.
- `pixel16` renders everything you play in.
- `storyboard` renders every story scene and interior the scripts open.
- `neon` is where designs are decided; approved designs are then redrawn in the other two.

## Mech design rule (Evan, 2026-10-10)
Mechs are grounded Japanese "real robot" military machines: piloted, armoured cockpits, panel lines, exposed joints and pistons, stencil markings, believable weight. Never organic, alien, insect-like or chrome-blob shapes.
Stay clear of famous franchise signatures: no V-shaped head fins with blue-and-white paint, no single round red eye, no copies of any known design. Round-3 Kestrel and Harrier were redone for exactly this.

## World layout (Evan, 2026-10-10)
- 2D throughout. No walkable tile town.
- Overland: a hex board of self-contained pixel hexes (each hex has its own bevelled edge, so nothing has to tile seamlessly) with figurine tokens for squads and mechs.
- Cities: one epic illustrated scene per city (plus an occupied version), with clickable points of interest.
- Each point of interest gets its own illustrated scene.
- Battles: one card system (deck from the mech's loadout, heat as cost, booster packs), no separate minigames.

## Defaults (Evan, 2026-10-10: "no micro decisions, this is a remake")
When a small choice comes up, follow the 1988 original's structure and pick. Decided under this rule:
- Mantis: the round-3 real-robot design is canon (fits the mech design rule).
- One body per mech design (7 figurines), not the original's two shared bodies.
- Story boards may be single scenes or multi-panel, whichever the scene needs.
