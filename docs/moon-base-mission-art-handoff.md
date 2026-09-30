# Moon Base Mission — Art / Build Handoff

## Locked direction
Whimsical chunky retro-futuristic Moon adventure for Abby (6). Premium hand-drawn family-game art, thick clean outlines, polished cel shading, rounded forms, pink/cream/cyan accents, warm and adventurous rather than sterile NASA. Abby: strawberry-blonde curly/wavy hair, blue eyes. Daddy: blue eyes, salt-and-pepper beard.

## Current visual set
- Moon Base overland: chunky base, driveway/carport, two hardpoints.
- Moon Base interior: side-view cutaway with airlock/buggy bay, mission control/observation, living quarters, two-level garden.
- Pink rocket: chunky pink/cream/cyan exterior with hatch/ladder.
- Earth cockpit: outbound launch/minigame plate.
- Moon cockpit: return plate; cockpit mismatch is acceptable.
- Rocket control asset sheet: buttons, toggles, levers, radar, screens, keypad, power indicator.
- Meteor site: crater with cracked meteor and magenta crystal glow.
- Pink lunar quadbike: 3/4 exterior; make matching strict top-down sprite.
- Circuit minigame plate: open service panel with empty 3x3 grid.
- Radar minigame plate: large blank circular radar.
- Still needed: moon-garden/gem-bug plate and top-down buggy course.

## Interaction architecture
Prefer beautiful static plates plus lightweight interactive overlays/sprites. Launch sequence should composite controls onto the cockpit and guide Abby through ~3 age-appropriate actions (button/toggle/lever/etc.). Circuit puzzle overlays nine interactive tiles. Radar overlays sweep/blips/target feedback. Buggy game uses a top-down quadbike sprite over a top-down lunar course.

## Character packs to generate
1. Abby spacesuit: front/back/profiles/3-4, walk/run, point, wonder, kneel, console, tool, wave, celebrate.
2. Daddy spacesuit: same core set plus scanner, repair, crouch beside Abby, high-five.
3. Abby cockpit: seated, reach L/R, button, toggle, lever, dial, concentrate, countdown, cheer.
4. Daddy base casual: wave, kneel, garden, tray, console, mug, repair, point, laugh, sit, hug.
5. Abby base casual: walk, sofa, window, garden, seedling, console, crouch, laugh, snack, hand-hold, jump.
6. Abby + Daddy interaction pack: reunion, hug, hand-hold, high-five, examine rock, point, show discovery, laugh, fist bump.
7. Spacesuit duo pack: walk, tracks, crystal, scanner, repair, surprise, celebration, shoulder ride.

## Rocket cutscene B-roll
Approach rocket; ladder; climbing aboard; hatch close/wave; engines waking; countdown cockpit; liftoff; clouds; home-world curvature; Moon ahead; lunar descent; Moon Base landing.

## Moon Base B-roll
Daddy waiting; reunion; first Moon walk; observation window; garden lesson; watering; giant moon vegetable; mission control together; meteor streak; impact flash; looking toward crater; quadbike prep; departure; ridge; crystal discovery; meteor reveal; repair together; radar discovery; ride home; exhausted on sofa.

## Polaroid memory pack
Arrival beside rocket; Abby/Daddy Moon selfie; moon-garden vegetable; quadbike thumbs-up; meteor crater; low-gravity bounce; repair together; Abby asleep against Daddy after mission. Candid instant-film look, white border, no written caption.

## Cutscene insert pack
Gloved hand pressing button; flipping switch; throttle forward; Abby eyes reflecting stars; rocket engine ignition; first bootprint; Daddy wave; hands planting seedling; meteor reflected in visor; quadbike wheels throwing dust; radar sweep; crystal in Abby glove.

## Environmental B-roll
Empty Moon Base beauty shot; empty garden; Abby bunk; Daddy workbench with family Polaroids; rocket + base + quadbike/carport establishing shot; paired footprints; parked quadbike by glowing rocks; distant meteor crater with base lights far away.

## Remaining plate prompts
### Gem Bugs
Close-up hydroponic planting bed inside whimsical Moon Base garden, warm orange grow lights, chunky raised planter, strange colorful lunar vegetables, crystal flowers, broad leaves and glowing sprouts, pipes/irrigation at edges, large clear continuous planting surface with open spaces for animated gem bugs to appear and be tapped, thick outlines, polished digital cel shading, no bugs, characters, text or UI --ar 4:3

### Top-down Buggy Route
Strict 90-degree top-down orthographic lunar driving board, winding broad trail bottom-to-top through craters, chunky rocks, narrow passages, crystal formations and gentle branching paths; interesting steering but not a maze; landmarks include crystal field, satellite dish, deep crater, rocky arch, meteor debris; clear start bottom and destination top; no vehicle, characters, arrows, text, UI or horizon --ar 3:4

## Production rule
Generate abundance. This is an editorial library for Cursor to crop/composite into cutscenes, transitions, dialogue beats, minigames and memories. Reuse strong Abby/Daddy/rocket/base/quadbike images as references. Prioritize continuity over novelty.

## Moon Arrival Gameplay — Guidance / Landing
After the outbound launch-control minigame and spaceflight cutscene, arrival is interactive rather than passive.

Flow: **Launch controls → spaceflight cutscene → Guidance minigame → successful landing cutscene → Moon Base unlock.**

Guidance is a kid-friendly Lunar Lander-style approach: Abby guides the rocket toward a huge forgiving landing pad using simple left/right correction and braking/thrust. Use approximately three increasingly precise approach gates before touchdown, with Mission Control coaching.

**Failure philosophy: zero punishment.** A miss should produce a funny/gentle bounce or "almost" moment and immediately allow another attempt. Abby can keep trying indefinitely. After a small number of attempts, offer an obvious **Land for me** bypass that plays the successful landing sequence. No lost progress, lives, currency, shame, or lockout. The challenge exists for delight and mastery, never as a gatekeeper.

After landing, the later mission sequence remains: meteor event → electrical repair → radar/search → quadbike traversal → meteor investigation.
