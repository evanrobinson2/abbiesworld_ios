# AW-STUDY-0044 - The Living Suit

Evan, 2026-10-23 14:19Z: "use meta to put on a HUD / living suit when you're in FPS - it can be biome dependent. I'd
expect an astronaut bubble with oxygen etc. when I'm on the moon."
14:20Z: "the FPS is WILD. just make it more obvious that we're in FPS mode. give me a tool in my hands and an FPS hud -
do abbie's world FPS hud proposals 3 variants, the one evan would like, the one abbie would like, and a third option for
good measure, then I will want them to go through formal design and art direction creative process."

- Page: `/studies/suit-hud/` (playable demo, all places and proposals). Advance artifact:
  https://claude.ai/artifact/JSak1Hokb3ox8S5fi7z7rx (built by `tools/suit-hud/build_artifact.py`).
- Code: `prototypes/ranch-atelier/dist/simulations/suit-hud.mjs` (+ `suit-hud.css`), wired into the sandbox in `lab.mjs`
  next to `first-person.mjs`. Live in the sandbox: zoom all the way down, or `RanchFirstPerson.enter()`.
- Rubric manifests: `hud-suit-prime.json`, `hud-suit-bubble.json`, `hud-suit-glove.json` (this folder).

## What "use meta" means

Both readings, because they fit together:

1. **Metadata.** Each place names what you wear and carry (`BIOMES` in `suit-hud.mjs`). A new world gets its suit by
   naming one: `suit`, `tool`, `air`, `dark`, glove and trim colours, ink colour and the place's dialect.
2. **The meta layer.** In the HUD canon, meta is what you feel in your own body. The suit lives there: the helmet glass,
   breath fogging it when you hurry or the air runs thin, the fizz of fresh air. As little as possible goes in the
   overlay. A Metroid Prime style visor (the other reading) is proposal A.

## What each place makes you wear

| Place | Suit (the glass) | Tool | Air |
|---|---|---|---|
| Moon | astronaut bubble | regolith scoop | yes |
| Mars | dust visor (amber brow, drifting dust) | rock hammer | yes |
| Aurora starship | headset (mic boom, blinking light) | wrench | no |
| Ranch | straw sun-hat brim | watering can | no |
| Halloween street | knit hood | flashlight (beam) | no |
| Cemetery | knit hood | lantern | no |
| City | brass goggles | parcel scanner | no |

Abbie is the player, so the gloves follow Moon Mission canon: a white suit with pink trim on the Moon and Mars, work
leather on the Ranch, and so on. Where there is no air, the air readout shows the tool's charge instead.

## Making first person obvious

- The sandbox's buttons, panels and toys step aside while you are in first person (`html.first-person`).
- The glass slides down over your eyes as you step in, with a soft seal sound, and your hands rise into view.
- The hands bob with each step (scaled by speed), lag a little behind a turn, and swing when you use the tool
  (tap, E or F). V cycles the three proposals; `?hud=prime|bubble|glove` picks one; the choice is remembered.

## The three proposals

| | A. Prime visor (Evan's) | B. Bubble buddy (Abbie's) | C. The glove (third) |
|---|---|---|---|
| Feel | "a real suit watching out for me" | "my bubble is full and I know the way home" | "I'm really there" |
| Air | 10-cell arc on the visor frame, amber when low | glass vial of rising bubbles | 6 lights on the left wrist cuff |
| Home | heading tape, pink diamond | a heart leaning along the top edge | needle on the cuff |
| Aim | dot + 4 brackets that open when walking | twinkling pink star | plain dot |
| Extras | readouts tuck to 35% after no change | star sticker on her helmet | tool lamp shows charge |
| Reference (style only) | Metroid Prime visor, Dead Space suit lights | Astroneer's visible oxygen, Animal Crossing stickers | Dead Space spine, Astroneer backpack, Firewatch hands |

Every proposal: zero words, no numbers, no red, no buzzer. Air drains as you walk; before it runs out the base tops you
up with a two-note chime and a fizz. Nobody fails.

## Measurements (2026-10-23, headless Chromium, 1280 x 720 stage)

Glass canvas pixels drawn (alpha > 40), share of the screen:

| Moon prime | Moon bubble | Moon glove | Ranch bubble | Ranch prime | Mars prime | Starship glove | Halloween bubble | City prime | Moon bubble, phone 390 |
|---|---|---|---|---|---|---|---|---|---|
| 2.1% | 2.7% | 1.8% | 5.9% | 5.5% | 5.8% | 0.4% | 2.0% | 7.2% | 3.3% |

The hands and tool sit in the bottom-right corner on their own canvas and are not counted above.

HUD rubric (`tools/hud-rubric/check_hud.py`): all seven gates pass for all three. Auto checks: A 12 of 14, B 12 of 14,
C 13 of 14.
- `spatial_share` fails for A and B: two of their four readouts are overlays, not on things. That is the price of the
  visor and the vial; C passes.
- `one_signal_many_channels` fails for all three: air drives the glass and the sound but nothing in the world yet.
  Next channels: Houston on the radio, the habitat beacon blinking, a crewmate looking over.

## Two layers

The glass (2D canvas) and the hands (their own WebGL scene and camera) draw above the world canvas. Nothing is added
to the world scene, so characters, directors, Oracle shots and the voice controller's `look` never perceive them, and
the suit never writes to the simulation.

## Next: the formal design and art direction pass (Evan's ask)

1. Done: brief and design card per proposal.
2. Done: three playable greyboxes, in the real sandbox and on the study page.
3. Art direction board per proposal: Midjourney mood frames of the glass, the gloves and each tool, anchored on Abbie's
   white suit with pink trim (needs Evan's Mac for Midjourney).
4. Evan picks a direction; Abbie plays all three and picks hers (C can merge into either).
5. Art pass: modelled gloves and tools from recipes (`tools/moon-base-kit` bkit style), a glass shader with real
   refraction on the rim, a sound twin for every signal.
6. Score with the rubric and a phone playtest, then make the pick the default.

## Coordination

- Moon Mission (AW-STUDY-0036): suits and trims follow its canon; its mission overlay should sit inside the bubble.
- Moon Base Kit (AW-STUDY-0031): the scoop, hammer and wrench are greybox; the kit can own the modelled versions.
- Design lead: owns HUD canon, the far-right callout and the pocket inventory. The tool in your hand should become the
  item you hold from Abbie's pocket.
