# AW-STUDY-0047 - Abbie's Science Adventure

Evan, 2026-10-23 12:18 PM (UTC-4): "make abbie's science adventure, it is found inside the science lab in town ..
there's a small beaker outside with a strange green goo. then when you go to that mini game, it's a spore style single
cell top down battler, here the lens and shaders will SHINE and the SVG 2D will shine also ... focus on the 2D view."
Then "the early stage": Spore's Cell Stage only.

- Play: `prototypes/ranch-atelier/dist/studies/cell/play.html` (`?play=filter|jaw` skips the lab, `?dev` shows
  contact circles and the mood number, `?from=` sets where the back button goes). Study page: `studies/cell/`.
- Entry: the science lab in Abbie's Town (AW-STUDY-0042, the hex city thread) has a bubbling goo beaker at its door;
  tapping it opens the game.
- Oracle: Spore was ingested for this study (`docs/oracle/identity/examples/spore.json`, profile
  `docs/oracle/games/spore.json`). Taken: size is the rule, diet by mouth, parts found in the world feed an editor
  moment, growing lifts you a layer, soft failure. Left: Spore's creatures, parts, art, music, editor and name.

## Round 1 (built)
- The lab bench, the beaker, a drop under the lens; a liquid-glass ring opens onto the pond.
- First mouth: leaf mouth (eats green algae) or chompers (eats orange bits). Hold to swim toward your finger, tap to
  dash, WASD and space on a keyboard.
- Five growth steps (5, 7, 9, 11 snacks). Each one grows Abbie, lifts the camera and opens a part picker of glass
  lenses: tail, cilia, spike, chompers, leaf mouth, poison sac. Glinting glass shells in the goo hold parts; found ones
  come first.
- Other cells, all ours: drifters (blue grazers), nippers (orange hunters), burrs (purple spines) and puffers (yellow,
  poison clouds). A jaw swallows anything under half your size whole; peers fight; spines hurt whoever rams them.
- At the fifth step a giant rises from the deep (drawn faint while it rises). It pops into a gold coin: one of Daddy's
  core memories (`memory-coins.mjs`, id `science-lab:the-giant`), "He showed me pond water under a microscope once."
- If Abbie pops, a new cell buds from the goo with her parts and half her snacks.

## How it's drawn
- `simulations/lens-pond.mjs`: the water is one WebGL fragment shader. Tiny Glade soft light (moving sun pattern),
  Painted Brush shade (brush-broken light, purple shadow, teal rim, 12 fps glow specks), giant shapes in the deep
  (parallax .3) and motes (parallax .65). Every cell is a lens: the shader re-samples the water through the cell,
  magnified and bent at the rim with `lensMap()`'s profile, per colour channel, with a sun rim and a teal shade rim.
- `simulations/microbe-kit.mjs`: rigged SVG cells. 24-point spring membrane (dents, squash, breathing), tail chain
  with lag and whip, cilia in a metachronal wave, jaws that open near prey, eyes that look and blink, food bits
  floating inside. World-fixed light: the membrane is drawn unrotated, parts turn.
- One mood signal (danger near Abbie) drives the shader light, the music tempo and key, and the pond's hum.

## Information
| What | Shown as | Mode |
|---|---|---|
| Growth | eaten bits glow inside the cell; five glass beads in the pill | diegetic + overlay |
| Health | membrane dents, pales, wobbles; heartbeat when low | diegetic + meta |
| Danger | size, a hunter's narrowed eyes and open jaw, cooler light, faster minor music | diegetic |
| Parts | on the body, animating; the picker is summoned | diegetic |
| Coins | coin in the pill | overlay |

Play HUD: one glass pill (about 2% of a phone screen) and a round back button, zero words. Captions are Abbie's inner
voice at story beats (`memory-kit/inner-voice.mjs`). The scene volunteers its manifest (`cell-pond`).

Tour: yes (the science lab is a whole place to visit, and it shows off the lens and couch play).

## Round 2: the brawl (Evan 12:49 PM)
"we don't have to fake it with raster, we can just build it. you survive by eating and defending .. 5 levels of
difficulty, cards for boosts etc. it should have a brawl-ha-ha feeling and multiple players at same time, study for me
this HUD, look/feel, and redesign the evolution stage from single cell creature to the next stage of life. you win
when you get off the slide ... you get the tardigrade backpack charm that's the first one."

Nothing is raster: the water is a shader, every creature is procedural SVG rebuilt each frame from a rig, and the
cards are Cards v3 faces painted in millimetres with vector art.

- **The stage is the drop on the slide** (radius 640). Past the meniscus is dry glass. Surface tension holds a cell in
  gently near the rim; a big hit carries it past and it "dries", twinkles and buds again in the middle two snacks
  lighter (Brawlhalla and Smash: push off the edge, don't drain a bar). Players never die from hits; wild cells do.
- **Heat is the gauge.** Every hit raises a player's heat. The cell glows red (an overlay on the membrane) and its
  portrait in the corner warms; the hotter it is, the further the next hit sends it. Heat cools slowly. A finishing
  hit on a hot cell freezes the world for a beat. Defending: dodge with a dash, a Bubble card, or stay in the middle.
- **Couch multiplayer** (`simulations/couch-input.mjs`): up to four on one screen, touch, two keyboard sets (W A S D
  + Space + E, arrows + Enter + /) and gamepads (stick, A dash, X card, LB/RB pick). Anyone drops in mid-brawl by
  pressing a button; they take a rival's seat. Empty seats are rivals played by the goo, so solo play is still a brawl.
  The camera frames every human player.
- **Five difficulty levels** are the five goo beakers on the lab shelf: the darker and bubblier, the hungrier the goo.
  They set rival skill, hunter appetite, how many wild cells, the swirl of the water (3+) and giants (3+).
- **Five growth stages** inside every game: four as a cell (parts gained on each), the fifth as a tardigrade.
- **Boost cards** (`simulations/boost-cards.mjs`, faces from `cards/v3/face.mjs`, die-cut): Zoom, Bubble, Mega Chomp,
  Magnet, Splash, Big Snack. You draw one each time you grow, and card bubbles float in the drop. Hand of three in your
  corner; tap, E, / or X plays it.
- **Evolution, redesigned:** the next stage of life after one cell is a real microscopic animal that lives in a drop on
  a slide: the tardigrade. Filling stage four starts it: the nucleus divides 2, 4, 8, 16 (a cell cluster, the step
  from one cell to many), the body stretches long, and it becomes a water bear (`tardigradeView` in
  `microbe-kit.mjs`): eight stubby legs with gold claws that plant and step, a bending segmented body, a round snout.
  It walks rather than swims: slower, heavier, harder to knock away, and it rams.
- **Win: get off the slide.** When the first water bear appears, a way off glows gold on the rim of the drop. The first
  water bear to walk into it climbs off the slide. The lens pulls back to the lab bench, the bear walks off the glass,
  and the win grants the **tardigrade backpack charm** (`earnCharm('tardigrade')`, `simulations/backpack.mjs`, the first
  charm in the game) and a gold memory coin (`science-lab:off-the-slide`). If a rival gets off first, "One more go?".

## The HUD and look study (Evan: "study for me this HUD, look/feel")
Records consulted: Spore Cell Stage (`identity/examples/spore.json`), Super Smash Bros. Ultimate
(`identity/examples/super-smash-bros-ultimate.json`), Brawlhalla (`games/brawlhalla.json`).

| Game | Body / damage | Progress | Threat | Tools | HUD budget |
|---|---|---|---|---|---|
| Spore Cell Stage | small health bar, cell flashes when hit | DNA bar along the bottom | size; giants blurred in the layer below | editor on a separate screen, opened by a mating call | ~8% |
| Smash Ultimate | one damage % per player along the bottom; fighter smokes and flashes when high | stocks by the portrait | stage edge, charge glows | items in hand | ~6% |
| Brawlhalla | damage shown as the fighter changing colour (white to red) | stocks | stage edge | weapons on the ground | ~8% |
| **Ours** | **the cell heats red and wobbles; its portrait warms with it** | **food glows inside the cell; five glass beads by the portrait** | **size, a hunter's narrowed eyes, the light cooling, faster minor music; the drop's rim; giants rise faint first** | **boost cards in your corner (the one overlay we want), parts on the body** | **~2% per player** |

What we took: Brawlhalla's colour-as-damage (wordless, on the character), Smash's "further when hotter" and the
finishing freeze, Spore's size rule and rising giants. What we refused: numbers (a child reads heat, not 87%), bars,
and a separate editor screen (parts arrive on the body without stopping the brawl; a single touch player still gets
two lenses to pick from, with a timer, and the game never pauses).

Each player's corner: a glass pill with a live dot of their cell's colour (it heats as they're hit and shrinks when
they're off the drop), five growth beads, and (player one) Daddy's coins. Rivals' pills are smaller. Phones stack
rivals top right. Hands of cards sit low, away from the captions. The back button is a small glass button top centre.
