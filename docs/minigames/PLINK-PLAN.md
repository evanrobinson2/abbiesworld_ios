# Plink — build plan

This is the accountable spec for what Evan asked for across the Plink / Peg Battle thread. Newer requests override older ones.

Kid name: **Plink**. Land: **Peggle Land**. POI: **The Plink Pavilion**. Internal key: `peggle`. Audience: smart six-year-old on iPad. No PopCap/GPL copy. Port **5174** for localhost; never silently pick another port.

## Current product (overrides earlier marble-safari sketches)

**Peg Battle.** Abbie vs one goofy opponent. Five Battle Cards, three-card hand, Peglin-style block pegs that pop when hit (decorators for strength / gone / present / sticky / valuable), telegraphed enemy moves, 6 hearts, 1 damage per 10 Power. First opponent: **Bad Doggo**. Raster art is generated through the minigame pack pipeline; pegs and FX are SVG/programmatic. Live combat lives in a disposable `BattleSession`. Ball scale is checked against open-source PegglePy (`ballRad` 12 / `pegRad` 25).

World hook (do not fork the map editor for the next minigame):

- Pack: `AssetSources/World2/minigames/peg-battle/`
- POI: `poi.pegglePavilion` still opens route `.plink`
- Land: `world.peggle`, west of Work Land (Home → west → Work → west → Peggle)
- Custom innard: `PegBattleMinigameView` / prototype `/` and `/dev/peg-battle`

See `docs/minigames/MINIGAME-PACK.md`.

## What is already true

Playable web prototype: Peg Battle harness on `/dev/peg-battle`, kid battle on `/`, legacy marble drop on `/plink`. Live URL: https://abbies-world-plink.vercel.app

iOS: Peg Battle session + view from the pavilion and Classic Games. Bundled pack JSON. Evan’s three plates have local catalog fallbacks (`world2_plink_land` / `_pavilion` / `_interior`). **Evan builds / places the land.** Do not expand hardpoint layout unless he asks.

Parked, not spec: marble-safari clash waves, lobby Crazy Mode, mixed critter swarms.


| # | Role | Semantic id | iOS catalog |
| --- | --- | --- | --- |
| 1 | Scene / land | `map.peggleLand` | `world2_plink_land` |
| 2 | POI interior (innard / playfield hall) | `poi.pegglePavilion.interior` | `world2_plink_interior` |
| 3 | POI exterior, studio background removed | `poi.pegglePavilion.exterior` | `world2_plink_pavilion` |

World 2 scene `peggleLand` already exists in the catalog. **Evan builds / places the land.** Do not expand hardpoint layout unless he asks.

Tilt physics exists as a sideways gravity nudge (`crazyTiltStrength`). It is **not** the product: lobby Crazy Mode is rejected. Tilt is an earned power-up (see below).

Parked, not spec: a prototype `clash.js` / campaign safari patch may exist from a stopped agent. It still thinks in mixed critter waves. Do not ship it. Phase D is 1v1. Phase A does not depend on it.

## Locked product (requests, collapsed)

**Toy.** Finger-aim a dewdrop off the fountain. Bounce gem seeds and glow seeds. Bowls at the floor. Board is always finishable; Again is always allowed. No fail-shame copy, no “dead / wounds” in kid UI (hearts + rest).

**World.** Explore Peggle Land → enter the Pavilion → play. Classic Games can launch Plink too. Finale still awards the Marble Fountain decoration.

**Safari (inside the minigame, not the World 2 overland author).** Clickable animal gardens. Player may pick **any garden at any time**. Each garden is one animal: matching peg layout, matching interior/background, matching opponent.

**Loadout.** Before a garden, pick power-ups (max two until we say otherwise):

1. **Tilt Compass** — special peg. Hitting it gives a Tilt Ball. While you hold a Tilt Ball, a small chance after a shot offers a **right-thumb** activate. Next drop is tilt-steered (Core Motion gravity, not magnetometer) with an overlay. Finger aim stays the same. Simulator tilt = 0.
2. **Bomb seeds** — extra boom tiles. Hit = full splash on the fight (universal vs that one opponent).
3. **Red bomb seeds** — scarlet boom tiles. **4×** bomb splash.

**Meta fight (latest, overrides the mixed-swarm sketch).** One garden = **one critter**. Example: bad kitty. The board and background are that kitty’s stage. The kitty is drawn **next to the player’s avatar**. Each dewdrop is one turn. Shot score + modifiers (glow/seed hits, bomb, red bomb) apply to that critter. Critter attacks back on its cadence. Clearing the peg board **resets the board** and the fight continues. The round ends when player hearts hit 0 (rest / try again) or the critter’s hearts hit 0 (safari win). Overlay shows the result of each peg run.

**Critter art DAG.** Character reference in, constrained poses out, for battle stages (at least: idle, hit, charged, low hearts, win, rest). Same kitty, not a new design each pose.

**Soundtrack (for now).** Three parent-supplied pieces, not per-level yet:

| Track | Source title | Role now |
| --- | --- | --- |
| Abbie's World | Abbie’s World | Safari / lobby |
| Cheerful Dance | Веселый танец | Board (rotates with Blocks) |
| Blocks in the Game | Блоки в игре | Board (rotates with Cheerful Dance) |

Beds may later set a `music` id. Do not invent new level music until asked.

## Not in scope unless reopened

- Expanding World 2 scene-catalog / land authoring (Evan).
- Lobby “Crazy Mode” toggle.
- Mixed critter waves in one fight.
- Copying PopCap art, audio, Fever, owls, cannons.

## Phases (hold the build to this order)

### Phase A — Put the reviewed toy in iOS

Wire Evan’s three plates. Paint the Swift board with interior + seed/glow/ball sprites. Local catalog fallbacks for `map.peggleLand` and the pavilion interior/exterior so the existing land/POI can show his art when he places it. Same falling timescale as Vercel. Tests still decode the eight beds.

**Done when:** `-launchPlink` shows the innard behind a falling dewdrop, the pavilion POI uses the transparent exterior, and the three bundled tracks play (safari vs board).

### Phase B — Safari picker + loadout

Replace the locked bed list with a clickable animal safari *inside* Plink. Any garden, anytime. Loadout screen: tilt / bomb / red bomb, then play. Keep bed ids stable (`dewdrop-nursery` … `pavilion-finale`) and rename them to the animals.

**Done when:** a player can tap Elephant Grove first, pack bombs, and start that board.

### Phase C — Tilt as a power-up

Tilt peg → Tilt Ball → chance to sparkle → right-thumb activate → next ball tilt + overlay. No lobby toggle. Deadzone ~0.08, clamp ±0.75, steering only while falling.

**Done when:** a unit test proves the tilt peg grants a ball, activation flags the next shot, and a falling step with tilt.x > 0 moves vx.

### Phase D — 1v1 Critter Clash

One opponent per garden. Turn = one peg run. Damage table lives in campaign JSON. Board clear resets pegs, fight continues. Hearts overlay: player avatar | kitty pose. Win = critter hearts 0 (+ gems, fountain on finale). Rest = player hearts 0.

Default table (change only by editing this plan):

| Peg / event | Damage to the critter |
| --- | --- |
| Gem seed | 1 |
| Glow seed | 2 |
| Bomb | 3 (full splash on this 1v1) |
| Red bomb | 12 (4× bomb) |
| Board-clear burst | 8, then board resets |

Player starts at 12 hearts. Critter stats are per animal (kitty first). Critter cadence: attack every N player turns.

**Done when:** tests cover bomb 3, red bomb 12, board reset while the kitty still has hearts, rest at 0 player hearts, win at 0 critter hearts.

### Phase E — Kitty (and later animals) art DAG

Pipeline: character ref → locked silhouette → poses for battle stages → optional matching board background. Constrained so the kitty is obviously the same character next to the avatar. Do not freehand a new cat each pose.

**Done when:** generate.py (or a sibling DAG) can emit idle/hit/low-hearts from one ref, and the clash overlay uses those imagesets.

### Phase F — Only after A–D feel good on device

More animals, more poses, server campaign record, original per-level music. Not before.

## Questions (answer these; defaults in italics)

1. **1v1 vs swarm.** Treat “fight that exact critter” as the spec and drop the mixed wave? *Yes.*
2. **First animal.** Is **bad kitty** the first (and only) opponent we art for until Phase E is proven, with the other seven gardens using stand-in shapes? *Yes — kitty proves the DAG.*
3. **Kitty reference.** Do you have a character sheet / creature-card to lock, or should we invent one Abbie’s World kitty and freeze it as the ref? *Invent and freeze unless you drop a ref in the next message.*
4. **Build order.** Phase A (your three plates in the real iOS game) before B–E? *Yes. The toy has to live in Swift before safari/clash/DAG.*

Reply with corrections or “defaults.” After that, the next coding turn starts at Phase A and does not skip ahead.

## Proposed: marble stash and SVG pegs (not scheduled yet)

Do not build this until Phase A is on device. This is the cousin of Peggle’s hopper, not a reskin.

**Peggle (study only).** Ten identical balls. Extra balls come from the moving bucket and high shot scores. Special shots are a Master’s green peg that changes the *next* (or current) ball: Fireball, Flippers, Multiball, Super Guide. Pegs are blue / orange / green / purple. We copy none of the art, audio, Fever, or names.

**Plink hopper.** The player owns a **stash**. Before a garden they pack a **pouch** of marbles (default **6**). During the fight the pouch **cycles front to back**: each dewdrop drop uses the front marble. A six-year-old starts with six plain **Dewdrops** (no extra effect). Wins unlock new marble *types* into the stash; they still pick the mix each round.

Default marble types (unlock later, do not ship all at once):

| Marble | When it exists | On that drop |
| --- | --- | --- |
| Dewdrop | Start | Normal physics, no bonus |
| Tilt marble | Unlock, or a compass peg may tuck one into the pouch | That drop is tilt-steered + overlay |
| Boom marble | Unlock | Treats the shot as if a bomb tile was hit |
| Red boom | Unlock, rare | Treats the shot as a red bomb (4×) |

Used Dewdrops go to the **back of the pouch**. Specials are **spent** unless the +1 Drop bowl tucks that same marble back. The garden gift is always a Dewdrop so the fight cannot stall.

Board **pegs** stay a separate layer (seed, glow, compass, bomb, red bomb). Hitting a compass peg still *grants* a Tilt marble into the pouch — that is the “you got that as a ball” beat. Packing a Tilt marble from the stash is the other way to have one.

**SVG pegs and marbles.** Author each kind as an SVG template (`core`, `rim`, `glyph`, `spark`) with states idle / lit / popping. Palettes swap per animal garden without new drawings. Web draws SVG directly. iOS uses the same paths as SwiftUI `Shape`s (or PDF vectors), not CSS shaders — wet-marble shine is a SwiftUI/Metal highlight on those paths. Raster sprites stay fallbacks only.

Peg kinds that need views now: `seed`, `glow`, `tilt`, `bomb`, `redBomb`, plus the four marble faces above.