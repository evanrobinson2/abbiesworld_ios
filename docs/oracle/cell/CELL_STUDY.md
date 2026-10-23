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

Tour: yes.

## Round 2 (Evan 12:49 PM, in progress)
"we don't have to fake it with raster, we can just build it. you survive by eating and defending .. 5 levels of
difficulty, cards for boosts etc. it should have a brawl-ha-ha feeling and multiple players at same time, study for me
this HUD, look/feel, and redesign the evolution stage from single cell creature to the next stage of life. you win
when you get off the slide ... you get the tardigrade backpack charm that's the first one."
