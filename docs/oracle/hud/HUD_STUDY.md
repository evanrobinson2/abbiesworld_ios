# What makes a great game HUD

Oracle study, 2026-10-23. Requested by Evan ("do the same for HUD in-game", after the card study in `../cards/`):
This War of Mine, Don't Starve, Sons of the Forest and SteamWorld Dig, applied to Abbie's World, a toy-world builder
for young children in the Ranch Atelier.

Files in this folder:

- `HUD_STUDY.md` (this file): the five ways a HUD can be presented and why each works, what the games do, what
  every great HUD shares, the Abbie's World HUD spec, an audit of today's `/sandbox`, and the rubric in prose.
- `hud-rubric.json`: the rubric as data. Gates must pass; the rest scores out of 100. Every check has an id, a
  threshold, a method and a `source` from the identity schema's enum.
- `hud-signatures.json`: per-game HUD signatures in the identity schema's `signature` shape, each marked `style`
  (we may learn from it) or `expression` (we never copy it).
- `hud-ranch-proposed.json` and `hud-ranch-today.json`: HUD manifests for the proposed Abbie's World HUD and for
  the live `/sandbox` as of 2026-10-22 (`claude/live-snapshot-2026-10-22`), so the checker has a pass and a fail.
- `tools/hud-rubric/check_hud.py`: a reference checker for the automatable checks (chrome budget, words on screen,
  touch targets, safe areas, hover-only information, numeral contrast over captures, always-on count, share of state
  that lives on things, fade rules, web red flags in CSS).

Visual page with interactive examples drawn for this study: https://claude.ai/artifact/66MG9h31W6fYFmRGdjPucx (source:
`hud-study.html` in this folder).

**Confidence.** The taxonomy is the standard one from Fagerholt and Lorentzon (2009), plus "none", which the
literature treats as a design goal rather than a category. Game observations come from public guides and prior
knowledge of each game, not from captures; each signature carries a `confidence`, and the Sons of the Forest HUD
layout is from a 2023 guide (it has been patched since). Millisecond timings are design targets for us, not
measurements of the games, and are marked `estimate` where they describe a game. The PC's "Game library
assimilation" thread had no identity profiles for these games yet (This War of Mine, Don't Starve, Tiny Glade,
Dorfromantik, Bricktales and 9 Kings are in Evan's installed list; Sons of the Forest and SteamWorld Dig are not);
when profiles land, their `ui_and_game_feel` fields should be checked against this file. Nothing here copies any
game's UI art, icons, fonts or layout; the ledger says what is style and what is expression.

## The core rule: the whole game adapts

Evan's framing (2026-10-23): every HUD choice fits on a 2x2, plus "none".

| | In the world | On the screen |
|---|---|---|
| **Characters know** | **Diegetic**: feeling through the world, shared with everyone in it | **Meta**: feeling in your body, what the hero feels painted on the lens |
| **Only you know** | **Spatial**: where and which, attention without words | **Overlay**: information and precision only |

**None**: the world simply behaves differently, and you feel unease before you know why.

**Overlays convey information; meta conveys feeling; diegetic conveys feeling through the world.** One fact, "8 minutes
until the horde arrives", shown each way:

| Kind | How it shows | What the player feels |
|---|---|---|
| Overlay | A timer in the corner counting down | Information. You plan; your heart rate doesn't change |
| Spatial | An orange glow on the horizon where it will come from, a marker on the gate | Attention. You know where, not how it feels |
| Meta | The screen edges close in, a heartbeat rises from 62 to 132 bpm | Dread in your body, without a number |
| Diegetic | The bell rings faster, villagers run inside, the gate closes, dusk falls | The village is afraid with you |
| None | Crows lift off the fence, dogs bark, then silence | Unease, before you know what is wrong |

**That is how you create feelings.** The best games don't pick one: **the whole game adapts.** A single game-state
signal (threat, time of day, mood) drives every channel together:

- **Light**: the sky and sun move toward night; windows light up.
- **Music**: the adaptive score (world, place, situation, then a mood: Mysterious, Intense, Epic; the composer
  thread's `docs/music/MUSIC_BIBLE.md` when it lands) crossfades its layers on the same signal.
- **NPCs**: residents stop wandering, hurry, go inside, close the gate.
- **Animals**: crows lift, dogs bark, sheep and cows head for the barn.
- **Sound**: the bell's interval shrinks; the ambient bed thins to silence before the arrival.
- **Lens**: only at the very end, a light meta vignette.

The world becomes the HUD, and no timer is needed. For Abbie's World the threat becomes friendly ("a storm in 8
minutes", "night is coming", "the festival starts soon"); the mechanism is the same. The rubric checks it as
`one_signal_many_channels` (D3): each timed or threatening state drives at least three world channels. The study page
opens with this demo, all five modes and the adaptive version on one scene.

## The short version

1. **The best HUD is the one you stop seeing.** Every game in this study either moves information into the world
   (Dead Space, Firewatch, Sons of the Forest's inventory) or makes the overlay so small and so consistent that the
   eye learns where it is and stops looking (Don't Starve, SteamWorld Dig). Tiny Glade has almost no HUD at all.
2. **Put information where the eyes already are.** A thirsty cow should show it on the cow. Spatial and diegetic
   readouts beat corner meters for anything that belongs to one thing in the world; corner meters are for the
   player's own body (health, hunger) and for time.
3. **Three things always on, at most.** Don't Starve shows three needs and a clock; SteamWorld Dig shows health,
   light and water plus money; Dorfromantik shows a tile count and a score. Everything else is summoned by a
   gesture or appears only when it changes.
4. **A meter should have a body in the world.** The best meters are doubled by the world: Don't Starve's sanity
   bends the screen, SteamWorld Dig's lamp shrinks the light around you, This War of Mine's noise is a ring you can
   see. The number tells you; the world makes you feel it.
5. **Change is the signal.** A HUD element earns attention when it changes: it pulses, bumps, counts up, and plays a
   sound, then settles. A static HUD element should be the quietest thing on screen.
6. **Fade by rule, never by surprise.** Show on change, hold, then fade; drop everything while the player is
   holding something; bring it back with one gesture. Far Cry 2 was criticised for fading its HUD in and out on its
   own; predictability matters more than minimalism.
7. **Touch HUDs are not mouse HUDs shrunk.** Fingers cover what they touch, have no hover, and live at the bottom
   of the screen. Targets of 64 px or more for children, previews above the finger, nothing essential behind hover,
   and nothing in the notch or the home-indicator strip.
8. **Style the HUD as an object from the world.** Don't Starve's needs are drawn like the world's own ink, This War
   of Mine's are pencil on paper, Dead Space's are the suit's own lights. A HUD drawn in web UI (rounded rectangles,
   system fonts, icon sets) breaks the toy.

## Five ways to present information

The standard taxonomy (Fagerholt and Lorentzon, *Beyond the HUD*, Chalmers, 2009) sorts interface elements on two
questions: **is it part of the story world** (would a character see it?), and **is it placed in the world's 3D
space** (or flat on the screen)? That gives four kinds. We add a fifth, **none**, where there is no interface at
all because the world itself carries the information.

| Kind | In the story? | In the world's space? | Examples | Why it works | When it fails |
|---|---|---|---|---|---|
| **Diegetic** | Yes | Yes | Dead Space suit spine and holograms; Firewatch paper map and walkie-talkie; Sons of the Forest backpack mat and GPS; This War of Mine radio | Nothing breaks the fiction; reading it is part of play; you learn the world by using it | Slow to read; hard to see at a distance or small sizes; a held map stops you doing anything else |
| **Spatial** | No | Yes | This War of Mine interaction icons and noise rings; Dorfromantik quest numbers on tile groups; Sons of the Forest interaction icons; damage numbers | Information sits on the thing it is about, so the eye doesn't travel; perfect for "this one wants something" | Clutter when many things talk at once; must scale and face the camera to stay readable |
| **Meta** | Yes (a feeling) | No (on the lens) | Don't Starve sanity distortion; Sons of the Forest grey screen at low health; blood on the lens; SteamWorld Dig's darkness as the lamp runs out | You feel the state with your whole field of view; no reading needed | Loses precision; can frighten young children; easy to overdo |
| **Overlay** (non-diegetic) | No | No | Don't Starve needs and clock; SteamWorld Dig bars; Dorfromantik score; 9 Kings cards | Fast, precise, always in the same place; the eye learns it | Breaks the fiction; becomes a dashboard when it grows; looks like a website when drawn as panels |
| **None** | n/a | n/a | Tiny Glade; Journey's scarf; Dorfromantik's landscape as the score | Total immersion; the world is the readout and the reward | Only works when the state is visible in the world and the stakes are low |

Two more axes matter as much as the kind:

- **Time.** Always on, on change (appears, holds, fades), on threshold (only when low or full), or summoned (the
  player asks: hold, pinch, press). Most great HUDs mix kinds and times: Don't Starve's needs are always-on overlays,
  but sanity's full effect is a meta layer that only arrives on threshold.
- **Owner.** The player's own body (health, hunger, stamina), the player's tools and hands (inventory, current tool),
  the world's things (a cow, a tile group), the world's time and weather, and the meta game (score, goals). Body and
  time go in corners; things go on the things; tools go in the hands.

## The games

Each entry: how its HUD works, what is always on versus summoned, what we take (style), and what we leave
(expression).

### This War of Mine (11 bit studios, 2014)

- **Frame.** A side-on cutaway of a ruined house, like a dollhouse, with the camera panning across rooms. The world
  is drawn in grey charcoal and pencil, and so is every UI element: the interface looks like sketches on paper in
  the same hand as the world.
- **People, not numbers.** Each survivor's state is written as words graded by severity ("hungry", "very tired",
  "wounded", "depressed") on their portrait and bio, never as a bar or a percentage. This is the game's thesis:
  these are people, not stats.
- **Interactions are spatial.** Small icons appear over beds, stoves, rubble and doors in the world when they can be
  used; you tap the icon on the object. There is no action bar.
- **Noise is a ring.** At night, the noise you make is drawn as expanding circles around your character, and sounds
  you hear from unseen rooms appear as rings where they came from. Rooms you haven't seen are dark and hatched. Danger
  is shown in the world where it is, not in a corner.
- **Time.** A clock and the day count are the main always-on elements; days open with a charcoal title card.
- **Diegetic news.** The radio in the shelter carries news of prices, weather and fighting: information the
  characters also hear.
- **Take.** State as plain severity words for adults becomes state as bodies and bubbles for children: a tired
  cow lies down, a hungry goat bleats with a bubble. Interaction icons on objects, not a bar. The noise ring as a
  model for "where is the thing that wants me". Draw the UI in the same hand as the world.
- **Leave.** The charcoal art, the sketch frames, the icons, the war tone, all text.

### Don't Starve (Klei Entertainment, 2013)

- **Always on.** Top right: three need badges (an organ-shaped icon each for hunger, sanity and health) that drain
  visibly, with an arrow showing which way they are moving; next to them a round day clock split into day, dusk and
  night segments, with the moon phase shown at night. Bottom: a row of inventory slots with equipment slots for hand,
  body and head. Left edge: crafting tabs. That is the whole always-on set, and it never moves.
- **On change.** Badges pulse and show a number when they change or when hovered. The character speaks one-line
  quips above their head when examining things (spatial text).
- **Meta.** As sanity drops, the world desaturates, the screen wobbles, shadow creatures flicker in and out and
  whispers start. At full night with no light the screen goes black and the threat attacks. The meter becomes the
  world.
- **Readability.** The badges are drawn with the same inked line and paper texture as the world, so they belong to
  it even though they are overlays. Three needs is the most players can watch.
- **Take.** A round day dial with segments: the model for our sun dial. Need badges with a direction arrow (rate of
  change matters as much as the level). A meter doubled by the world (sanity distortion) at a gentle, kid-safe
  strength. A small fixed always-on set the eye can learn.
- **Leave.** The ink-and-paper look, badge art, organ icons, the gothic tone, the characters, all text.

### Sons of the Forest (Endnight Games, 2023 early access, 2024 release)

- **Corner cluster.** Bottom right: one compact round widget with health on one side, stamina (whose outline shows
  overall vitality) on the other, and three small need rings above it for thirst, hunger and rest. Armour wraps the
  health arc in segments. That one cluster is the whole always-on HUD.
- **Meta.** At critically low health the screen turns grey. Cold and wet greys out part of the stamina arc, so you see
  that some stamina isn't available.
- **Spatial.** Interaction icons appear on objects when you look at them: a filled prompt for a press, a hollow
  one for a hold; small pictograms for sit, climb, open, loot, plant. Unknown plants show a question mark until you
  eat one.
- **Diegetic inventory.** Opening the backpack lays every item out physically on a mat on the ground in front of you;
  crafting is placing items on a crafting mat in the middle until a recipe completes. The inventory is a table of
  objects, not a grid of slots.
- **Diegetic map and tools.** The map is a GPS tracker you hold in your hand. Building starts in a physical guide book
  of blueprints; a chosen blueprint appears as a ghost in the world, which fills in as you add logs. Kelvin, the
  companion, takes orders from a notepad.
- **Take.** One corner cluster for the body; everything else on objects or in hands. The inventory as objects laid
  on a mat: for us, the hand of cards and a toy box on the table edge. Blueprint ghosts that fill in as you build. Grey
  as a signal that something isn't available (gently, and never as a "disabled button").
- **Leave.** The survival-horror tone, the mat, book and GPS art, icons, Kelvin, all text.

### SteamWorld Dig (Image & Form, 2013; SteamWorld Dig 2, 2017)

- **Always on.** A short strip of bars at the top: health, the lamp's light and (once you have steam tools) water,
  plus money. Bars are segmented, so pickups that add "one bar" read exactly.
- **The lamp is a meter with a body.** As the lamp's light runs down, the lit circle around the robot shrinks and the
  mine gets darker. You don't need to read the bar to know you should go home. (Confidence on the exact radius
  curve is low; verify on capture.)
- **The world is the map.** Every tunnel you dig stays dug, so the mine is its own record of where you have been.
- **Loot juice.** Ore pops out of rock with a sparkle and a sound, flies to the robot, and fills the bag; selling in
  town is a cascade of coins with a rising sound. When the bag is full you must go back, which turns a capacity number
  into a rhythm.
- **Take.** A meter doubled by the world (light radius). Few segmented bars instead of percentages. Loot that flies
  from the world to the counter, linking the thing to the number. The world as its own map.
- **Leave.** The western-steampunk art, robots, frames, fonts, all text.

### Tiny Glade (Pounce Light, 2024)

- **Almost none.** No resources, no goals, no score. A few tool icons sit small at the bottom; the tool you hold is the
  interface (drag a wall, pull its top to raise it, drag a path). Time of day is a sun you can move.
- **Why it works.** With no failure and nothing to manage, nothing needs to be shown. The reward is the diorama.
- **Take.** The verb is the UI. Time as a sun object. Tools few and small, in one place. Everything grows rather
  than counts.
- **Leave.** The art, tool icons, procedural look, all text.

### Dorfromantik (Toukana Interactive, 2022)

- **Always on.** The stack of tiles you have left sits in a corner as a physical stack with its count painted on it;
  the score sits small at the top. The next tile follows the cursor.
- **Spatial.** Quests are numbers floating over the group of tiles that wants them ("this forest wants 30 more
  trees"), with a flag when completed; placing a tile shows which edges match before you commit; points float up from
  the tile that earned them and new tiles fly to the stack.
- **Take.** Remaining moves as a stack you can see shrink. Goals as numbers on the place that wants them. Rewards that
  fly from the world to the counter.
- **Leave.** The art, tile designs, banner and flag art, all text.

### LEGO Bricktales (ClockStone, 2022)

- **Two modes, two HUDs.** Exploring the diorama has almost no HUD: characters with speech bubbles and an occasional
  prompt. Building happens in a separate build space with a brick palette and a "test" step that runs the physics.
- **Take.** The build mode is a place you go to, framed like a workbench, and the play mode stays clean. Speech
  bubbles over characters.
- **Leave.** LEGO bricks, minifigures, the palette art, all text. (Confidence moderate; verify on capture.)

### 9 Kings (Sad Socket, 2025 early access)

- **The board is the HUD.** A small hand of cards at the bottom, the year counter, and the kingdom grid; every decision
  is placed on the board and then the year resolves on its own.
- **Take.** Cards in hand at the bottom edge; one counter for time; consequences shown on the board, not in panels.
- **Leave.** Pixel art, card art, kings, all text. (Confidence moderate.)

### Dead Space (EA Redwood Shores, 2008; remake by Motive, 2023)

- **Fully diegetic.** Health is a light bar on the suit's spine; stasis is a ring on the back; ammo is a hologram
  projected from the weapon; the inventory, map and messages are holograms projected in front of the character, in
  real time, without pausing. A "locator" line projects on the floor to show the way.
- **Why it works.** The camera sits behind the character, so the spine is always in view. The interface is the suit.
- **The lesson in its failure.** The 3D holographic map was hard to use, so the floor locator was added: diegetic is
  worth it only while it keeps the function.
- **Take.** State on the character's body. A path line on the ground instead of a waypoint marker. Menus that live in
  the world and don't pause it.
- **Leave.** The suit, hologram art, horror tone, all text.

### Firewatch (Campo Santo, 2016)

- **No HUD.** You navigate with a paper map and a compass held in your hands; the map collects notes as the story
  goes on. The walkie-talkie is the dialogue interface: you raise it to talk, and choices appear as lines.
- **Why it works.** Reading the map is slow on purpose, so you look at the world.
- **Take.** A held object as the map; dialogue through a held prop.
- **Leave.** The map art, the radio, the story, all text.

### Journey (thatgamecompany, 2012), for "none"

- **No HUD.** Your scarf's length and glowing glyphs are your flight energy; the meter is your costume.
- **Take.** A meter that is part of the character's body.

## What every great HUD shares

| Principle | Evidence | Measure in the rubric |
|---|---|---|
| Information on the thing it is about | This War of Mine icons and rings, Dorfromantik quests, Sons of the Forest prompts | Share of state readouts that are spatial or diegetic |
| A small, fixed always-on set | Don't Starve 3 + clock, Sons of the Forest one cluster, SteamWorld Dig 3 bars | At most 3 always-on elements; positions never move |
| Meters doubled by the world | Don't Starve sanity, SteamWorld Dig lamp, Sons of the Forest grey | Each always-on meter has a world or meta echo |
| Rate as well as level | Don't Starve arrows | Direction cue on draining meters |
| Change is the signal | Don't Starve pulse, SteamWorld Dig loot, Dorfromantik flying points | Every change animates and sounds; static elements quietest |
| Rewards fly from the world | SteamWorld Dig ore, Dorfromantik tiles | Gain animations start at the world source |
| Predictable fades | Far Cry 2 criticism, Dead Space menus | Fade rules declared; one gesture summons |
| Same hand as the world | Don't Starve ink, This War of Mine pencil, Dead Space suit | "Object from this world, not web UI" judge |
| Modes are places | Bricktales build space, Sons of the Forest mat | Build or parent tools live in their own place |
| No HUD where nothing is at stake | Tiny Glade, Journey | Free-build mode shows no always-on HUD |

## Information hierarchy for Abbie's World

Five tiers. Every piece of information gets exactly one home tier; promote it only with a reason.

| Tier | What lives here | Examples in the Ranch |
|---|---|---|
| **T0 World** (no UI) | State the world can show by itself | Café grows an awning; grass browns when dry; animals lie down when tired; night falls |
| **T1 On the thing** (spatial and diegetic) | Anything about one thing | Water drop bubble over a thirsty cow; +2 popping off a tile; a meadow's want-number; valid slots glowing; the café sign's star count |
| **T2 Always on** (overlay, at most 3) | The child's tools and time | The hand of cards (bottom); the sun dial (top); the toy box (bottom corner, opens the shelf) |
| **T3 Summoned** | Detail on demand | Hold the barn: a ring of animal heads with counts; pinch out: big overland icons; tap a resident: thought bubble |
| **T4 Workbench** (behind a door) | Grown-up controls | Sliders, presets, generate, arrival effects, inspector, scene search (GAME_FEEL Law 12) |

Rules for promotion: an item is always-on only if the child needs it every few seconds **and** it changes what they
do next. Score isn't: it lives on the café sign (T1). Time is: it shapes the whole loop (T2).

## Readability

- **Size.** Always-on icons at least 48 px on an iPhone in portrait (about 12 per cent of the short edge for the
  sun dial); numerals with a cap height of at least 18 px; spatial bubbles at least 36 px and scaled with zoom between
  a floor and a ceiling so they never vanish or swamp.
- **Contrast over anything.** HUD elements sit over moving terrain and sky. Numerals need a dark outline (at least 8
  per cent of glyph height) or a solid token behind them, and at least 3:1 contrast against the brightest and the
  darkest background they appear over, measured across captures of day, dusk and night.
- **Silhouette.** Every icon must be nameable from its silhouette at 32 px. Colour is never the only cue; pair it with
  shape (as the card study's rarity gems do).
- **Glance test.** In a one-second exposure, a viewer can tell the time of day, whether a card is in hand, and which
  animal wants something.
- **One meaning per channel.** Colour means the tile type; motion means change; size means importance. Don't spend a
  channel twice.

## Touch versus mouse

| Concern | Touch (iPhone, iPad) | Mouse (PC) |
|---|---|---|
| Hover | Doesn't exist. Nothing essential behind hover; previews come from press-and-hold or dragging. | Hover previews welcome, but must have a touch twin. |
| Targets | 64 CSS px or more for children (Apple's floor is 44 pt). Spatial bubbles are tappable and padded. | Can be smaller, but keep the same layout so one design serves both. |
| Occlusion | The finger covers what it touches: lift held cards above the finger by about 60 px; show placement previews above the touch point. | The cursor covers nothing; the preview can sit under the pointer. |
| Reach | Thumbs live in the bottom third. The hand of cards goes at the bottom; the sun dial at the top is watched, rarely touched. | Anywhere. |
| Edges | Keep clear of the notch, the Dynamic Island and the home-indicator strip (`env(safe-area-inset-*)`), and of the left edge where iOS back-swipe lives. | No constraint. |
| Gestures | One finger pans, two pinch and twist; hold to summon. No double-tap-to-zoom. | Drag pans, wheel zooms; no modifier keys. |
| Orientation | Portrait and landscape both work; always-on elements re-anchor to the same edges. | Window resize. |
| Feedback | iOS Safari has no vibration API, so sound and motion carry the touch feel. | Same. |

## Juice for HUDs

| Moment | Spec (our targets) |
|---|---|
| Value goes up | The source in the world pops (scale 1.15, 120 ms), a token flies to the counter on a curve (300 to 450 ms), the counter bumps (1.2 scale, spring) and ticks up one step per token with rising pentatonic pitch |
| Value goes down | A trailing ghost of the old value (a lighter chip) shrinks to the new level over 400 ms after a 150 ms hold, so the loss is visible; a soft low note, never a buzzer |
| Threshold reached | The element pulses twice (1.0 to 1.08) and its world echo starts (the cow's bubble appears, the light dims) |
| New element appears | Pops in from 0.6 scale with 8 per cent overshoot in 220 ms; never fades in from nothing |
| Element leaves | Shrinks and drops 6 px in 180 ms, or fades to its resting opacity (below) |
| Time passes | The sun dial's hand sweeps continuously; each new day it clicks with a tick and the day picture under it bounces |
| Summon | The ring opens from the touch point in 160 ms, items staggered 30 ms; releasing closes it in 120 ms |
| Reduced motion | Crossfades of 150 ms, no flying tokens (counter ticks in place), no pulse; sound stays |

## How HUDs fade away

The four fade rules we use, in order of priority:

1. **Focus fade.** While the child is holding something (a card, a tile, a resident), every always-on element except
   what they hold drops to 25 per cent opacity in 150 ms, and comes back in 250 ms on release. The world is the stage
   during the decision.
2. **Change fade.** On-change elements appear on change, hold for 2.5 s, then fade to zero over 400 ms. A new change
   during the hold restarts the hold.
3. **Idle tuck.** After 6 s with no input, the hand of cards tucks down so only its top 40 per cent shows; any touch
   brings it back in 200 ms. The sun dial never hides (it is time, and time keeps moving).
4. **Threshold.** Need bubbles appear only below the need's threshold and stay until it is met; they never fade by
   timer, because the cow still wants water.

And two guarantees: **predictable** (the same thing always fades the same way) and **summonable** (one gesture brings
everything back: tap empty ground).

## The Abbie's World HUD

The ranch is a toy on a table. The HUD is made of toys on the same table.

### Always on (T2), three objects

| Object | Where | What it does | Notes |
|---|---|---|---|
| **Sun dial** | Top centre, inside the top safe area, 56 to 64 px | Time of day and the day of the season: the sun travels an arc over a strip of seven tiny day pictures. Tap to pause (the sun gets a nightcap), drag to speed up or rewind. | Replaces the pause button and "Day N". Doubled by the world's light. |
| **Hand of cards** | Bottom edge, inside the home-indicator inset, cards about 18 per cent of the short edge | The child's next choices. Lift one, drag it to the board. | Replaces the tiles panel. Tucks when idle; fades when the child is holding something else. |
| **Toy box** | Bottom-left corner, 64 px | Opens the shelf of little dioramas (scenes). Long-press opens the grown-up workbench (Law 12). | Replaces the library and settings buttons. |

The café sign is not on the HUD: it is a sign on the café (T1), and the score lives there.

### On the thing (T1)

- **Need bubbles**: a water drop, a hay stalk or a sleepy moon over an animal below threshold; tap it and the
  animal walks to the trough. Bubbles are round, white-paper discs with a dark outline, 36 to 56 px with zoom.
- **Gain pops**: +N rises from the tile that earned it and flies to the café sign.
- **Want numbers**: a meadow that wants three cows shows a small painted post with "3" and a cow silhouette;
  it gets a flag when done (the idea from Dorfromantik, our own art).
- **Placement preview**: while dragging, valid slots glow on the board and neighbours that would react hop.
- **Speech**: residents speak in picture bubbles (icons, not words).
- **Path line**: when the child taps a resident, a dotted line on the ground shows where they are going.

### Meta, gently

- Night dims the edges of the screen with a soft blue vignette; rain adds a few drops sliding on the lens; a dry
  spell warms the edges. Never red, never pulsing, never scary.

### None

- Free-build mode (no season running) hides the sun dial's day strip and shows only the hand and the toy box.

## Two layers that never mix (Evan, 2026-10-23)

In a living simulation anything placed in the world becomes part of the fiction: characters, AI directors and the
voice controller perceive it and react to it ("if we did, the bots would actually react to it and direct the
simulation to INVOKE HORROR, HAVE SOME PEOPLE WORSHIP IT!"). So:

- **World layer**: only in-fiction things. It is the only thing characters, the simulation, AI directors and the
  voice `look` tool can perceive.
- **Presentation layer**: overlay, meta, spatial cues, name tags, selection, debug and tools. It is drawn for the
  player and is invisible to every perception. No engine or editor artifacts (gizmos, axes, grids, debug boxes, raw
  ids) in the player's view outside developer mode.

### Leak check of today's code (`claude/live-snapshot-2026-10-22`, read 2026-10-23)

| Where | What leaks | Severity |
|---|---|---|
| `simulations/lab.mjs` (inspect) | Selecting a person or object adds a red `THREE.BoxHelper` to the world scene. It is a debug box in the player's view, and it lands in every renderer capture | High: it breaks the no-gizmo rule and is seen by any vision AI |
| `simulations/holodeck/stage.mjs` `capture()` and `mcp/holodeck-cli.mjs look` | The screenshot is the raw WebGL canvas, so anything in the 3D scene shows (selection box, label sprites, rings and markers the AI built). There is no presentation-only render pass | Medium |
| `holodeck/stage.mjs` labels | Floating name tags are sprites parented to the entity's world object, so `Box3.setFromObject` (used by `probe`) counts the tag as part of the thing | Low |
| `simulations/live/policy.mjs` `summarize()` (voice `look`) | `yourThings` reports every entity, including invisible ones (`visible:false`), marker shapes (`ring`, `empty`) and `label` text, as world things. There is no layer field, so the voice controller can't tell a marker from a barn | Medium |
| `outbreak-simulation.mjs` `decide()` (actor senses) | Actors sense only simulation entities through the spatial index | Clean |
| `view-context.js` (chat view share) | Shares visible DOM text and a screenshot with developer chat; it skips `[data-context-private]` | Clean (developer tool) |

Fix direction: add `layer: 'world' | 'presentation'` to every entity and scene object. Put presentation objects in their
own `THREE.Layers` channel, so captures for AI perception render the world layer only and `summarize()` drops them,
along with invisible entities. Selection becomes a presentation-layer cue (a glow or contact ring) shown only to the
player, never a `BoxHelper`.

### Evan's notes on today's sandbox (2026-10-23)

Screenshot (browser chrome cropped): `evan/sandbox-2026-10-23.jpg`. This is a newer layout than the audit below: a
top bar (ranch name, Talk, pause, speed, music, code, sliders, layers), a clock and weather card at top left, and a
"Tiles" settings panel on the right with tile preview cards, segmented buttons and sections.

| Keep | Lose |
|---|---|
| **Liquid glass**: the translucent, glassy material of the controls | **The web-page layout**: top bar, right-side settings panel, segmented Low/Medium/High buttons, section headings |
| **Rich colours** | **The mask**: the pale haze that fades and covers the world toward its edges and behind the panels. The world must stay fully visible, edge to edge |
| **Live previews**: the tile picture cards and the live 3D tile preview | |

What this means for the HUD spec:

- The three always-on toys (sun dial, hand of cards, toy box) may be made of liquid glass, as long as they read as
  objects: glass with thickness, a rim highlight and a contact shadow, not flat frosted rectangles.
- The hand of cards keeps the live previews: each card's art is a live render of the tile it places (the preview
  the sandbox already has), not a static icon.
- No full-screen or edge mask, fog, haze, vignette-to-white or backdrop blur over the world in play mode. Glass may
  refract what is directly behind it, but it never dims or hides the world around it. (Night and the meta
  vignette in the core rule are world light, tied to a game signal, not a permanent mask.)
- Settings such as density, variety, size and buildings go to the workbench (Law 12), where a tool look is allowed.

### Audit of today's `/sandbox` (live branch, 2026-10-22)

`prototypes/ranch-atelier/dist/simulations/index.html` on `claude/live-snapshot-2026-10-22`:

| Today | Kind | Verdict | Replacement |
|---|---|---|---|
| Top toolbar: library, pause, generate, fit, settings | Overlay, web buttons | Out of play mode | Toy box (library); sun dial (pause); generate and settings to the workbench; fit becomes tap empty ground twice |
| Inspector side panel with live status, activity list, presets, lighting | Overlay panel | Out | Activity becomes the world (residents walking, gain pops); the rest to the workbench |
| Sliders for horses, cows, goats, chickens, goat play, playground, size, complexity | Overlay form | Out | Hold the barn to call or send animals; the rest to the workbench |
| Arrival effect select, time input, replay | Overlay form | Out | Workbench |
| Selected-object inspection card with details | Overlay panel | Replace | Tap the resident: they turn, wave and show a thought bubble (T1) |
| Library dialog with search and tabs | Modal | Replace | The shelf of dioramas from the toy box |
| Error box | Overlay text | Replace | The world reassembles itself; errors go to the workbench log |

`hud-ranch-today.json` encodes this layout (approximate positions at 390 x 844 pt); the checker fails it on chrome
budget, words, always-on count and web red flags. `hud-ranch-proposed.json` passes.

## The rubric

Full detail and thresholds are in `hud-rubric.json`. In short:

**Gates** (any failure rejects the HUD):

1. **Chrome budget**: always-on overlay area is at most 8 per cent of the viewport, in portrait and landscape.
2. **Words**: zero words in play mode (numbers and the child's own names are allowed).
3. **Touch targets and edges**: every touchable element is at least 64 CSS px (44 pt absolute floor for grown-up
   doors) and sits fully inside the safe area, away from the left back-swipe strip.
4. **No hover-only information**: everything a hover shows has a touch path.
5. **Numeral legibility**: cap height at least 18 px, and at least 3:1 contrast against the background behind the
   element in every capture (day, dusk, night).
6. **Expression ledger**: no game's UI art, icons, fonts or layout copied; provenance recorded.
7. **Kid-safe**: no red alarm states, no buzzers, no flashing above 3 Hz, no fail screens.

**Scored** (100 points):

| Dimension | Weight | Main measures |
|---|---|---|
| Glance | 12 | One-second exposure: a VLM or a child names time of day, card in hand and who wants something |
| Hierarchy | 12 | At most 3 always-on elements; every item has one tier; summoned detail in one gesture |
| State on things | 12 | At least 70 per cent of state readouts are spatial or diegetic |
| Readability | 10 | Outlines, silhouettes at 32 px, colour never alone, size floors |
| Touch and mouse | 10 | Thumb zone for frequent targets, occlusion offsets, gestures, both orientations |
| Fade and focus | 10 | The four fade rules declared and observed; tap empty ground summons |
| Juice | 12 | Gains fly from the world, losses trail, thresholds pulse, sound per change, reduced-motion path |
| Toy, not web | 10 | Pairwise "object from this world" judge; no web red flags (1 px borders, system fonts, icon sets) |
| Accessibility | 6 | Reduced motion, colour-blind simulation, every sound cue has a visual twin |
| House style | 6 | Closer to the Abbie's World identity than to any single source game |

A HUD ships at 80 or more with all gates passed.

## How this fits the identity schema

- Each game's HUD findings are `signature` objects (layer `interface` or `interaction`) with `class` set to `style` or
  `expression` in `hud-signatures.json`, so the Oracle can fold them into the games' identity records without new
  fields.
- Measures use the schema's `source` enum: `footage_cv` for computer vision over our own captures, `llm_judge` for
  VLM judgments (pairwise, both orders), `playtrace` for in-game timing logs, `human` for Evan's and the kids' picks,
  `estimate` for unmeasured values.
- The legal line is the same as `GAME_IDENTITY.md`: conventions that are scènes à faire for HUDs (health in a corner,
  a day clock, interaction prompts on objects, a hand of cards at the bottom) are free; the particular icons, badge
  art, frames, fonts and the overall look of one game's interface are never copied.

## Sources

- Taxonomy: Fagerholt and Lorentzon, *Beyond the HUD: User Interfaces for Increased Player Immersion in FPS Games*
  (Chalmers, 2009), as summarised in [Andrews, "Game UI Discoveries: What Players Want"](https://www.gamedeveloper.com/design/game-ui-discoveries-what-players-want)
  (also the Far Cry 2 fade and Dead Space locator lessons).
- Sons of the Forest HUD: [Corrosion Hour, UI and HUD overview](https://www.corrosionhour.com/sons-of-the-forest-ui-hud-overview-guide/);
  [Siege.gg, stats and HUD explained](https://siege.gg/news/sons-of-the-forest-stats-and-hud-explained).
- SteamWorld Dig pickups (health and water in bars, light in seconds): [SteamWorld wiki](https://steamworld.wiki.gg/wiki/Minor_Gameplay_Elements_in_SteamWorld_Dig).
- This War of Mine interface: [PC Gamer review](https://www.pcgamer.com/this-war-of-mine-review); [Tampere PlayLab review](https://blogs.tuni.fi/playlab/game-reviews/this-war-of-mine-to-have-just-one-more-day/).
- Touch targets: Apple Human Interface Guidelines (44 pt minimum hit target).
- House rules: `GAME_FEEL.md` (project files, `game-feel/`), especially Laws 1, 5, 6, 7 and 12.
