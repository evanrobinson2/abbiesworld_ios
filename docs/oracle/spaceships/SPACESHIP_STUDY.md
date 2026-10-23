# AW-STUDY-0035 - Spaceship Games: How Ships Are Designed

Oracle study, 2026-10-23. Requested by Evan:

- 13:03Z "have we ingested any space ship games from oracle? I want a space ship study as well. specifically for aurora mk 2"
- 13:03Z "mk1 is in game"
- 13:51Z "I really wanted you to study space ship games and make a study on that"
- 13:52Z "pull real 3d models from space ship games in oracle and present them as part of the study, and read online"
- 13:52Z "build your own expertise on how ships are built in games for design.. RSI, that's a good one, starfield, that's a
  good one, eve online, that's a good one.. build me some ... cool concept art"
- 13:53Z "and then we might want to do a meshy clean up and then have you do a mechatronics pass."

**Aurora Mk II is RSI's ship.** In Star Citizen, the RSI Aurora (Mk I) is the original starter ship, and the Aurora
Mk II is its ground-up redesign, flyable since Alpha 4.7 (2026-03-25). That is the "mk1 is in game" Evan meant, and it
is the centrepiece of this study. Abbie's World also has a ferry called the USS Aurora (RE-072/073 on the Moon port);
that is a coincidence of names, and the first answer in this thread wrongly rebuilt it. The rebuild was dropped.

This is a study, not a build. It reads how the studios that make the best ships work (Cloud Imperium on Star Citizen,
Bethesda on Starfield, CCP on EVE Online), goes through the 27 space games the Oracle already profiles plus the genre
greats, and distils what a ship is made of: silhouette, shape language, modules, cockpit and interior, boarding, flight
feel, displays, sound, damage and upgrades. It ends with a ship identity record and what Abbie's World adopts. The
concept art, the Meshy model and the mechatronics pass come after it and are driven by it.

Files here:

- `SPACESHIP_STUDY.md` (this file).
- `ship-signatures.json`: one ship record per game (the identity record below), each lesson marked `style` (we may learn
  from it) or `expression` (we never copy it), with `owned` for games in Evan's library and sources.
- `ship-identity.schema.json`: the ship identity record, an extension of `docs/oracle/identity/game-identity.schema.json`.
- Study page: `prototypes/ranch-atelier/dist/studies/spaceships/` (app.abbies.world/studies/spaceships/).

**About "real 3D models".** Meshes ripped from these games are their studios' copyrighted art, and the Oracle's rule
is "style yes, expression never" (`docs/oracle/identity/GAME_IDENTITY.md`). So no game mesh goes into the repo, R2, a
prompt or a public page. What the study does instead: every 3D model on the page is our own (blockouts that
demonstrate a principle, then our Mk 2), real-world public-domain NASA spacecraft are queued as scale references
(NASA's site is blocked from the cloud; they come through Evan's PC), and game facts are measured from the studios'
own published numbers (sizes, masses, part counts) and talks. Private measurement of an extracted mesh on Evan's PC
(proportions and triangle counts only, never committed) stays an option if he wants it.

## Context engineering

What this study was built from (also the right-hand card on the page, per Evan's 13:55Z org-wide rule).

Oracle consultation
- Game Oracle profiles (`docs/oracle/games/*.json`): 27 space or sci-fi games, plus Outer Wilds, ASTRONEER and Among Us.
- "How it's drawn" (`identity.rendering`): only No Man's Sky, Outer Wilds and ASTRONEER were hand-studied before; this
  study hand-studied 16 more (`tools/steam-study/rendering_notes.py`, "Space games" block).
- Identity schema (`docs/oracle/identity/`), HUD study (`docs/oracle/hud/HUD_STUDY.md`), rendering study
  (`docs/oracle/rendering/RENDERING_STUDY.md`), Moon base kit (AW-STUDY-0031).

Game developer sources
- RSI, "How Ideas Take Flight: The Star Citizen Ship Pipeline":
  https://robertsspaceindustries.com/en/comm-link/transmission/14244-How-Ideas-Take-Flight-The-Star-Citizen-Ship-Pipeline
- RSI Q&A on the Aurora Mk II: https://starcitizen.tools/Comm-Link:Q%26A_-_RSI_Aurora
- Aurora Mk II reference: https://starcitizen.tools/RSI_Aurora_Mk_II ; Mk I LN: https://starcitizen.tools/Aurora_Mk_I_LN
- Star Citizen pipeline and Gold Standard: https://starcitizen.tools/Ship_Pipeline
- Star Citizen UI: https://www.hudsandguis.com/home/star-citizen-revisited-part-1
- CCP, "Iconic Ships Reimagined - The Minmatar Rupture": https://eveonline.com/article/iconic-ships-reimagined-the-minmatar-rupture
- CCP, "Strategic Cruisers: A New Breed": https://www.eveonline.com/article/strategic-cruisers-a-new-breed/
- "EVE Universe: The Art of New Eden": https://www.gamingnexus.com/Article/4771/GN-Unplugged-EVE-Universe--The-Art-of-New-Eden
- Starfield NASA-punk (Istvan Pely): https://www.techradar.com/news/starfields-developers-are-aiming-for-a-nasa-punk-aesthetic
- Starfield habs: https://dotesports.com/starfield/news/starfield-shipbuilder-habs-explained-interiors-stations-and-more
- Kerbal Space Program art: https://www.gamedeveloper.com/art/environment-art-and-modeling-in-kerbal-space-program
- FTL postmortem (GDC): https://gdcvault.com/play/1018034/Designing-Without-a-Pitch-FTL
- Outer Wilds (GDC, curiosity-driven design): https://www.gdcvault.com/play/1027368/
- Stellaris dev diary 230, the art of aquatic ships: https://forum.paradoxplaza.com/forum/developer-diary/stellaris-dev-diary-230-the-art-of-aquatics-ships-the-drake.1495959/

Game design and craft articles
- Creative Bloq, "Video game spaceship design": https://www.creativebloq.com/sci-fi/video-game-spaceship-design-21619331
- Creative Bloq, "Modelling a spaceship for gameplay design": https://creativebloq.com/how-to/modelling-a-spaceship-for-gameplay-design
- ArtStation, "Design analysis: Moth by John Liberto" (Simon Kopp): https://acapulco.artstation.com/blog/z6Br/design-analysis-moth-by-john-liberto
- ArtStation Magazine, "Crafting Star Citizen's 3D Concepts" (Gurmukh Bhasin): https://magazine.artstation.com/2015/09/crafting-star-citizens-3d-concepts/

Confidence: studio facts are quoted from the sources above. Game facts not in a source come from public knowledge of
the games and are marked `estimate` in `ship-signatures.json`. No captures, no game files.

## The short version

1. **A ship is a character before it is a vehicle.** Every good studio starts with who flies it and what it has been
   through (Creative Bloq; CCP starts a redesign by asking the ship's "history and emotional tone"). The Outer Wilds
   ship is a wood-and-tin campfire; an EVE Minmatar hull is a proud scrapyard; the Aurora is a family's first car.
2. **One silhouette, readable from the back and from far away.** You spend most of a game looking at a ship's rear,
   so design it from the rear first; it must read at map distance (Stellaris, EVE) and at card size. Hierarchy is
   three or so primary volumes, a few secondary, many small tertiary ones, with detail clustered at one focal area
   (the cockpit), not spread evenly (the Moth analysis).
3. **Shape language is a promise.** Round means safe and friendly, a flat belly means it can land, swept wings mean
   fast, exposed frames mean rugged (Creative Bloq; EVE: Amarr cathedrals, Caldari hard slabs, Gallente curves,
   Minmatar junk). Inside a family, keep cohesion; between families, keep distinction. RSI, Drake, Anvil and Origin
   do the same as manufacturers; in Starfield the manufacturer changes only the look, not the function.
4. **Function drives form, and every part says what it is for.** Engines, sensors, landing gear, doors, ramps and
   thrusters are placed first and form the base structure; greeble comes last. NASA-punk (Starfield) is this rule
   made into a style: stencils, hazard stripes, access hatches, exposed truss. Doors and landing gear belong in the
   concept, never bolted on in 3D (Creative Bloq; Star Citizen's "Hobbins Hole" door was too small for the pilot).
5. **Ships are built from parts, and the parts are the game.** KSP (stacked parts), Starfield (habs that generate the
   interior), EVE Tech 3 (five subsystems that change the geometry, "literal thousands" of combinations), Space
   Engineers (blocks), and now the Aurora Mk II (external modules a tractor beam snaps on). Star Citizen builds every
   ship from functional pieces "attached together by code at runtime", so a shared cockpit changes once for every
   variant. Modules add mass and change handling, so a choice is visible and felt.
6. **Inside and outside are one ship.** Star Citizen and Starfield ships are walk-through: what you see outside is
   where the rooms are inside. FTL and Among Us go further: the floor plan is the interface. Metrics matter more than
   style: doorways, corridors, ladders and seats sized to the body that uses them.
7. **Boarding is a ritual.** A ramp drops with light spilling out, a canopy hinges up, a ladder unfolds, the cockpit
   seat swallows you. Outer Wilds' lift, No Man's Sky's climb-in, the Aurora Mk II's round side door: the moment of
   getting in is what makes a ship yours.
8. **Information lives on the ship.** Star Citizen's diegetic screens and holograms, Outer Wilds' cockpit gauges and
   ship log, Dead-Space-style displays on things. Lights tell state: warm windows mean people inside (EVE Minmatar),
   engine glow means power, red and green mean port and starboard.
9. **Flight feel is thrusters you can see.** Vernier thrusters on every axis puff when you turn (Creative Bloq), VTOL
   fans swivel to hover (Aurora Mk II), wings fold to land. Sound is the same: a rising engine whine, the clunk of
   gear locking, the hiss of a door.
10. **Damage and upgrades are visible.** Parts break per piece (Star Citizen damage states, SPAZ parts falling off,
    FTL fires per room); upgrades are new parts you can see (EVE Tech 2 adds plates, Starcom modules grow the hull).

## Part 1. The three masters Evan named

### RSI and Star Citizen

How a ship is made (RSI's own pipeline article):

| Stage | What happens |
| --- | --- |
| Concept Ready | Design and writers fix the role, stats and fiction; the concept artist delivers "upward of 16 different roughs", then a rough 3D model in Modo or Maya. Technical designers, modelers and animators check landing gear, thruster and cockpit placement, control surfaces, engineering bay, sleeping quarters and weapons. |
| Hangar Ready | White box: the ship is sliced into functional pieces that can be damaged independently and are "attached together by code at runtime". Designers set thruster positions and flight test. Final art follows the white-box hierarchy, then hardpoints, helpers, UVs, materials and wear layers; animation, lighting and sound. |
| Dogfight / Flight Ready | Damage states per piece, LODs, named effect helpers, diegetic HUD and instruments, VFX and audio; balance. |
| Gold Standard | A later rework so every ship has the current features: cockpit buttons and animations, metrics passes for characters and items, physical components you can reach, lighting and materials. |

Lessons:
- **Concept in 3D early, with function checked by the people who will build it.** The "Hobbins Hole" (a doorway too
  small for the pilot) is why metrics are checked at concept, not at final art.
- **A ship is a hierarchy of named, separable parts.** Damage, effects, animation and variants all hang on it.
- **Variants share parts.** The Aurora Mk I came as LN, LX, MR, ES and CL; the old way, a cockpit change was made five
  times. The new system changes it once.
- **Manufacturers are design languages.** RSI (versatile, reliable, pioneering), Drake ("rough-and-tumble"), Anvil
  (military), Origin (luxury), MISC ("rugged reliability" for traders and miners).
- **Diegetic UI reuses one kit.** Forty-five cockpits share one set of display components in different combinations,
  with a limited palette and depth as hierarchy (hudsandguis).

**The Aurora Mk II** (starcitizen.tools; RSI Q&A):
- A small (S2) starter and light fighter, one seat, 24.5 m long and 28 m wide with wings out, 7.5 m tall, 63.5 t.
  The Mk I LN is 19 m x 8.75 m x 4.5 m and 27 t.
- "Takes the essence of the Mk I and brings it up to a level suitable for the game as it exists today." Nods to the
  Mk I: the circular side door, the bed and the window.
- Four backward-swept wings, over and under. The shorter lower wings carry VTOL fans; the wings fold back to land
  ("landing mode forces them into the folded state"), and folded wings disable the wing guns and shrink the frontal
  profile.
- The first ship with external modules, snapped on with a tractor beam or the loadout manager: cargo (6 SCU, on top
  of 2 SCU inside) and combat (missiles and a shield). Modules add mass and slightly worsen handling. RSI chose
  modules over variants: a base ship that does "a little bit of most missions".
- Bigger inside because "ships require much more space internally for traversal and access to items": one port-side
  entrance, pilot seat, engineering terminal, bed, suit locker, weapon and tool racks, and components you can reach,
  including ones on top, by climbing over the cockpit window.

What it teaches a Mk 2 of anything: keep three or four signature features of the Mk 1 (door, bed, window), redesign
everything else for how the game plays now, grow it to fit people walking around inside, and turn variants into
modules you can see, snap on and feel.

### Bethesda and Starfield

- **NASA-punk** (lead artist Istvan Pely): "You can draw a line from current-day space technology and extrapolate from
  there." Grounded and relatable. In the ships that means white and grey composite panels, stencilled labels, hazard
  stripes, exposed truss, chunky landing struts and boxy cockpits.
- **Ships from parts.** The ship builder snaps cockpits, habs, reactors, engines, landing gear, bays and structural
  parts together. Habs "determine the interior layout of your ship": the inside is generated from the outside.
  "Every hab must be connected and accessible", or the ship won't save.
- **Manufacturers are looks, not stats.** Taiyo is streamlined, Deimos angular, Hopetech, Stroud-Eklund and Nova
  Galactic each have their own panel language, but the same hab does the same job whoever makes it.
- **Boarding and landing are cinematic.** Every landing and take-off is a short third-person shot of the ship and its
  gear, so the ship's mechanics are always on show.

Lessons: a kit of parts with snap points, a rule that everything must connect, a generated interior, and manufacturer
skins that change look but not job.

### CCP and EVE Online

- **Faction shape languages** ("visual distinction from the other races, and a visual cohesion within each race"):
  Amarr ships "carved out to look like tools for religious sacrifice", gold cathedrals; Caldari hard slabs from
  "modern fighter jets and aircraft carriers", like "broken-off pieces of Caldari space stations"; Gallente
  "aerodynamic, art nouveau curves"; Minmatar "scrap heaps" with spaced plating and exposed beams.
- **The Rupture redesign** shows the process: history and feeling first; 2D sketches mixing faction shapes; "messy 3D
  blockouts to find problems that 2D hides"; fix flat sides and lost silhouette angles (the redesign "felt too
  monolithic" from the front and top, so gun-port covers were angled to keep the "inverted pyramid"); then variants
  and skins. Warm orange windows suggest a crowded, homey interior. Turrets sit in gun ports that open after warp.
- **Tech 3 strategic cruisers:** a hull plus five subsystems (electronic, defensive, offensive, engineering,
  propulsion). Each one changes "the geometrical shape and appearance as well", and every combination is allowed:
  "literal thousands". No subsystem is strictly better; each is a trade-off.
- **Scale ladder:** frigate to titan spans tens of metres to kilometres; each class keeps the faction silhouette, so
  you can name a ship by its shape from across a battle.

Lessons: decide the family's shape language first; check the blockout from every angle; let modules change the
silhouette; use lights to suggest life inside.

## Part 2. The Oracle's space games

From the 27 space or sci-fi profiles plus Outer Wilds, ASTRONEER and Among Us. "Ship role" is what the ship is to the
player. Full records are in `ship-signatures.json`.

| Game | Ship role | Built from | Inside | Boarding | Displays | Lesson |
| --- | --- | --- | --- | --- | --- | --- |
| Outer Wilds (owned) | Home and campfire | One fixed ship | Walk-in cockpit, ship log computer | Lift ramp under the hull | Cockpit gauges, ship log, signalscope | A small, fragile, handmade ship you love coming home to |
| Kerbal Space Program | The puzzle you build | Stacked parts on attach nodes | Kerbal faces in windows | Crew hatch | Navball, staging stack | Chunky parts with one job each; failure is funny |
| No Man's Sky | Collectible and identity | Procedural part sets per class | Cockpit only | Climb-in animation | Cockpit screens, scanner | Classes read by silhouette (fighter, hauler, explorer, shuttle, exotic, living) |
| Starfield | Your house and build | Snap kit, habs make the interior | Full walk-through | Ramp and ladder | Cockpit screens | Generated interior from the parts outside |
| FTL | The board | Fixed layout per ship, systems as rooms | Top-down cutaway is the game | None | The floor plan is the UI | Rooms and crew explain a ship faster than any HUD |
| Space Engineers | The build | Blocks on a grid | Full walk-through | Doors and hatches | Block screens, LCDs | Physical blocks with mass and damage per block |
| Empyrion | The build | Voxel blocks | Walk-through | Doors | Block screens | Blocks need sloped armour to look like ships |
| Stellaris | Fleet icon | Species ship sets | None | None | Strategic map | One shape language at many sizes, readable far away |
| Sins of a Solar Empire | Fleet | Fixed hulls | None | None | Strategic UI | Faction silhouettes plus engine-glow colour |
| Space Pirates and Zombies 1/2 | Weapon and toy | Interchangeable parts | None | None | Overlay | Parts fall off when shot |
| Starcom: Unknown Space | Your growing base | Modules on a grid | None | None | Overlay | Added modules visibly grow the hull |
| Mass Effect: Andromeda | Home between missions | Fixed | Full walk-through | Ramp | Bridge window | A hero window on the bridge |
| Among Us | The map | Rooms | Top-down rooms | None | Task panels on walls | The ship is a social space of rooms |
| ASTRONEER | Shuttle you build up | Snap-on modules | None | Seat | Diegetic backpack | Bright chunky modules that click on |
| IXION | City ship | Ring sectors | Sectors | None | Overlay | A ship as a city you run |
| Breathedge | Comedy | Junk | Station | Airlocks | Diegetic | Real hardware, silly arrangement |
| Dyson Sphere Program | Your mech | Fixed | None | None | Overlay | Glossy white with blue emissive trims |
| Deliver Us The Moon, The Invincible | Atmosphere | Fixed | Walk-through | Hatches | Diegetic screens | Grounded NASA and retro-future hardware |
| Surviving Mars | Supply rockets | Fixed | None | None | Overlay | World-Fair retro palette |
| Ring Runner, Transcendence, VoidExpanse, Entropy, Breachway, Delta-V | Weapon platform | Fixed or slot-fitted | None | None | Overlay | Slot fitting changes stats, rarely the look |

Genre greats outside Evan's library, used for principles only: Star Citizen and EVE (above), Elite Dangerous (cockpit
panels, ship kits), Super Mario Galaxy's Starship Mario and Ratchet & Clank (a ship as a character), Lego Star Wars
(ships from bricks), Astro Bot's mothership (a home hub).

## Part 3. What a ship is made of

### Silhouette and shape language
- Three primary volumes, a few secondary, many tertiary; a fast rhythm of detail at the ends, slow in the middle, with
  colour and value contrast pulling to one focal area (Moth analysis).
- Design the rear view first. Check the front, top and three-quarter: a design can work in one view and "come back
  looking like a duck" from another.
- Shape grammar: round is friendly and safe; a flat underside lands; swept is fast; exposed frames are rugged and
  repairable; vertical fins are proud. Keep two or three tones that survive changing light, and borrow ground tones
  underneath and sky tones on top.

### Function and parts
- Place first: cockpit and sightline, engines and thrust line, landing gear and its footprint, the door and its ramp,
  sensors, cargo. Then the hull wraps them.
- Name every part by its job. A part is the unit of damage, animation, effects, upgrade and variant (Star Citizen,
  EVE T3, KSP).
- Modules attach at snap points, must connect, add mass and change handling. They should change the silhouette
  enough to see (EVE T3, Aurora Mk II).

### Cockpit, interior and metrics
- The outside promises the inside: a window means a room, a big canopy means a pilot you can see.
- Size doorways, corridors, ladders, bunks and seats to the bodies that use them (an adult at 1.9 m, Abbie at about
  1.1 m eye height). Leave room to walk to the components.
- An interior that reads as a floor plan (FTL, Among Us) can be the game itself.

### Boarding and mechanics
- Doors, ramps, canopies, ladders, landing gear, folding wings and swivelling engines are the mechanics people love to
  watch. Each one is a named part with a pivot, a range and a sound.
- Landing and take-off are shots: show the gear unfold and the dust kick up.

### Displays and state
- Diegetic first: cockpit screens and holograms, ship lights, warm windows, engine glow, beacons, port and starboard
  running lights. Overlay only for precise numbers.
- Sound sits on the same grid: the engine note, gear clunks, door hiss and the cockpit hum.

### Damage and upgrades
- Damage per part: scorch, dent, spark, fall off, fire in a room.
- Upgrades are new or bigger parts you can see.

## Part 4. The ship identity record

`ship-identity.schema.json` describes one ship in the Oracle's way, so ships from any game (and ours) compare on the
same fields:

- `role`: what the ship is to the player (home, vehicle, character, build, board, weapon, fleet icon).
- `silhouette`: primary volumes, rear-view read, distance read, focal area.
- `shape_language`: grammar words (round, slab, swept, frame, cathedral, junk...), family or manufacturer.
- `function_parts`: named parts with their jobs (cockpit, engines, thrusters, gear, door, ramp, sensors, cargo).
- `modularity`: none, variants, slots, modules or blocks; snap points; whether modules change the silhouette and mass.
- `interior`: none, cockpit only, cutaway, walk-through; metrics (door, corridor, ladder, seat).
- `boarding`: the ritual (ramp, lift, canopy, ladder, climb-in).
- `mechanics`: moving parts with pivots and ranges.
- `displays`: diegetic, spatial, meta and overlay mix, and how state is shown (lights, glow, screens).
- `flight_feel`: thrusters you see, VTOL, wings, mass.
- `damage_and_upgrade`: per part, visible upgrades.
- `sound`: engine, mechanisms, cockpit.
- `rendering`: the Oracle's `oracle.rendering.v1` block.
- `lessons`: each marked `style` or `expression`.

## Part 5. What Abbie's World adopts

1. **Every ship is a character with a one-line story** written before drawing ("the family's first ship, patched and
   loved").
2. **Silhouette first, from the back, at card size and at 50 m.** Three primary volumes, one focal area (the cockpit).
3. **A shape language per manufacturer**, like EVE factions and Star Citizen makers, in Abbie's World's own words. A
   proposal: Aurora Works (round, friendly explorers, ivory and sunset orange), Bolt & Bucket (exposed-frame haulers,
   yellow and rust), Swiftwing (sleek racers, white and blue). These are ideas for Evan, not edicts.
4. **Function first, NASA-punk details.** Every part says what it does: stencils, hatches, hazard stripes, fuel caps,
   kid-readable labels.
5. **Ships from named parts with snap points** (our bkit recipes already do this): cockpit, hab, cargo, engine
   block, gear, ramp. Modules change the silhouette and the mass. That's the KSP and Aurora Mk II lesson, sized for a
   child: snap on a cargo pod and you can see it and feel the ship get heavier.
6. **Inside matches outside, at Abbie's size.** Doors, ladders, bunks and seats fit a 1.1 m eye height and an adult.
   An FTL-style cutaway view is the ship's map.
7. **Boarding and landing are the best moments.** Ramp down with warm light, canopy up, gear unfolds, dust. These are
   the mechatronics pass.
8. **State on the ship, not on the screen:** engine glow means ready, warm windows mean someone's home, beacon means
   talking to Earth, red and green running lights. Overlay only for precise numbers.
9. **Damage and upgrades show on the parts.** Scuffs and patch panels tell the ship's story.

## Part 6. Aurora Mk 2: the plan

Evan's route (13:53Z): concept art, a Meshy model, a cleanup, then a mechatronics pass.

1. **Concept art (Midjourney on Evan's PC).** Six prompts built from this study: a cinematic key art, an orthographic
   design sheet with separate modules, an FTL-style cutaway, a mechanical detail sheet (gear, nacelle pivot, canopy,
   ramp), an in-flight shot, and a three-manufacturer lineup. Prompts and job ids go in `ship-signatures.json` siblings
   under `tools/aurora-mk2/` once they land.
2. **Meshy** from Evan's pick (on the Mac, with his key and his "go"). Note: an earlier Moon-ship note
   (`DEVELOPMENT-PRACTICES.md`) ruled Meshy out for the Aurora and Moon ships; Evan's 13:53Z message overrides it for
   this ship.
3. **Cleanup in Blender** (the Bruiser method, AW-STUDY-0021): retopo to low poly, split into named parts at the
   module seams, role materials, baked maps.
4. **Mechatronics pass:** pivots and ranges for the landing gear (three-step unfold), the VTOL nacelles, the canopy,
   the ramp and any folding wings; each a named part with an animation and a sound cue, shown on the page.

Design brief for Mk 2, from the lessons (not a copy of RSI's ship): a family explorer that keeps three Mk 1 signatures
(the round door, the bunk and the big window), a rear module bay with snap-on modules (cargo pod, buggy garage,
science lab) that change the silhouette and mass, swivelling VTOL nacelles and folding gear for the landing ritual,
a walk-through interior at Abbie's size, and all state shown on the ship.
