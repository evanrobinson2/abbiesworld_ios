# AW-STUDY-0024 - Grace's Basement

The office under Abbie's café. Page: `/studies/basement/` (play: `/studies/basement/play.html`). Thread: "Coffee shop
office basement". The café study (AW-STUDY-0013, `docs/oracle/cafe/CAFE_STUDY.md` section 9) owns the café; this
study owns the basement, Grace's computer, its software and the disks.

## The brief (Evan, 2026-10-23 07:32-07:51Z)
- Model THE pictured computer (his photo: a beige 1980s all-in-one in the IBM PS/2 Model 25 mould), parts first,
  low poly; generic badge, no logo. Then a 3.5" floppy from parts.
- The basement is dark and dingy, a side view like a 1980s animated adventure game, but 2.5D (built in 3D).
- You turn on the lights. A bare bulb's cone of light falls on a desk with the computer.
- The player walks down and sits at the computer; the camera swoops in and around.
- You see the machine emulated with a CRT effect, and you can play it.
- At the desk you can click the disks. One disk carries a golden 8-bit Abbie's World coin; putting it in wins a coin.
  There are ten coins to find.
- Study the machine, its keyboard, a DOS manual and three games he remembers (Typing Tutor III's Letter Invaders,
  Gunship, Questprobe Spider-Man). Make our own homages. Style yes, expression never.
- Backstory: it was his Aunt Grace's computer, in 1986; he was six. A quiet nod only: it boots to `C:\GRACE>`, the
  manual says "Grace's", the README is signed "G.".

## What is built (round 1)
- `simulations/grace-computer.mjs`: the computer, keyboard and floppy, as parts with role-named materials. GLBs
  for /models come from the same recipe: `node --import ./tools/grace-computer/three-hook.mjs tools/grace-computer/export_glb.mjs`.
  Same-camera check: `tools/grace-computer/shot.html` (theta -33, phi 80, fov 40). Photo, renders and rounds are in `tools/grace-computer/`.
- `simulations/grace-dos.mjs`: GRACE-DOS, a 40-column shell on a 640x400 canvas. Commands HELP, DIR, TYPE, CLS, DATE,
  VER, ECHO, CD; programs live in one table. KEYSTORM (our letter-shooting tutor) is the first. The disks (`DISKS`)
  run KEYSTORM, a recipe, an empty disk and the coin disk.
- `simulations/grace-basement.mjs`: the room (stairs, landing and door, switch, shelves, desk, chair, rug, bulb,
  furnace, water heater, pipes, window), the disk box, the coin jar and the kid.
- `studies/basement/play.html`: the scene. Low-resolution render, posterised with ordered dithering; resolution
  rises to full at the screen. CRT shader (curvature, scanlines, glow, tube edges). Synthesised in-room sound.
  The coins are saved in this browser (`aw-basement-coins`) until the account keeps them.

## The ten coins
Gold disk; KEYSTORM night 5; typing GRACE at the prompt (the README hints); furnace door; yellow paint can; rug;
the manual; the box under the stairs; the window sill; the pencil mug. Each flies into the jar on the desk.

## Games study
| Studied | What made it feel that way | Ours |
| --- | --- | --- |
| Typing Tutor III, Letter Invaders (Kriya Systems, 1984) | Starts on the home row, adds keys in an order as you earn them; scorecard of letters, shots, hits, accuracy and a streak bonus; difficulty follows you | KEYSTORM (built): letters drift over a town at night, the lamp on the hill zaps them, nights add keys from F J outward, speed follows accuracy |
| Gunship (MicroProse, 1986) | Pop-up from cover vs fast and low; damage builds to an autorotation; resupply pads instead of a time limit; ranks and medals over a career | ROTOR RANGER (designed, PG): rescue helicopter, spot campers over ridges, water on brush fires, ferry hikers, refuel at pads, ranger badges |
| Questprobe featuring Spider-Man (Adventure International, 1984) | A picture over a typed story; fuller sentences than earlier parsers; puzzles from the first room; gems to collect up a tall building | CLOCKTOWER (designed): a small inventor climbs a clock tower for twelve lost gears; picture above, typed story below; our own hero |

Typing Tutor III's files (sent by Evan) were read only in a private scratch folder for pacing and layout, then
deleted. Nothing from them is in the repo or in R2.

## Design card
- Know: the light is on, the computer is on, I found a coin.
- How would the character know: bulb glow and buzz; the screen lights the desk and the drive chatters; coins in the jar.
- Mode: diegetic throughout. No HUD, no words outside the computer's own screen.
- For: the player; the scene volunteers `lights` and `computer` to the director (`volunteer('grace-basement')`).
- Adapts: one switch drives the bulb, cone, dust, hum and the hall light's share.
- Tour: no for now; it joins the tour when the café's office door leads here.

## Round 2 (2026-10-23)
Evan's asks, all built: "make the dos actual", a dark start with her thought ("It's dark in here... it feels old.")
and two choices, three switches where only up-down-up (101) lights both lamps (000 is off; anything else gives the
first lamp and a useless brown glow), a higher-fidelity girl with every limb (the Quaternius CC0 rig), faint 8-bit
music that grows near the computer, and Grace's clipboard list done for real: plug it in, wash and dry the screen,
turn on the power, put in a disk. She sits only when you tap the chair.
- Real DOS: FreeDOS on the v86 emulator, built from source by `tools/grace-dos/` (licences in its README).
  Programs tell the scene things over COM1 (`AW:<id>`).
- Interaction grammar: `docs/design/INTERACTION_GRAMMAR.md`, written from this scene.
- Canon (Evan): the gold coins are Daddy's core memories, one for each of his memory places. The coin disk shows
  "A GOLDEN MEMORY!" and her thought names it as Daddy's.
- Café link: the key in the café's cash register opens `basement_door`; the scene is entered with `?from=cafe`,
  and "Go back up" returns to the café.
- Voice: the device's speech voice (free) for now; a recorded or realtime kid voice goes through the wallet later.

## Round 4: the ending (2026-10-23)
From the game review (https://claude.ai/artifact/1qPFbCMZ81PTMb44cSfZcN): give the basement an ending, make the coins
pieces of one memory, keep the first minute short, and share the kit with the school.
- The ending: once the gold disk's coin has settled in the jar, the room warms (a warm fill, the hall light spills
  brighter through the door) and Daddy calls down, a muffled "Ab-bie!" through the floor. Her thought: "Someone's
  calling from upstairs... it's Daddy! Time to go up." with `> Coming, Daddy!` and `> Just one more minute...`.
  Coming: she stands, walks up to the door, says "I'll keep this one, Aunt Grace.", the door shuts and the old set
  powers down (the picture squeezes to a line, then a dot), then she is back in the café (`/#cafe-study`). One more
  minute: she stays, and the door is then the way home with the memory.
- Coins are pieces: each coin is one of ten pieces of Daddy's memory of this basement. She carries the memory, not ten
  coins, in the shared player inventory (`simulations/inventory.mjs`, item `memory-grace-basement`, "(n of 10
  pieces)"), and each coin is also counted in `simulations/memory-coins.mjs`. All ten play the memory's closing beat:
  the jar glows warm, a music box plays the tune's opening, and she sees it whole ("Daddy, little, typing at this desk
  with Aunt Grace.").
- The first minute stays short: lights, clipboard, disk, then the ending. KEYSTORM and the other coins are optional
  finds. ROTOR RANGER and CLOCKTOWER are on hold.
- The memory kit (`simulations/memory-kit/`), shared with the school roof:
  - `era-pass.mjs`: the chunky pixel and Bayer dither pass that sharpens at a screen, the 3 s CRT warm-up and the
    power-down. `eraPass(T, renderer).render(scene, camera, {sharp, time, boot, off})`.
  - `inner-voice.mjs`: her inner voice as white captions in the era's font at the bottom, choices beneath as `>` lines,
    device speech only when asked. `innerVoice({font}).say(text, {choices, hold})`.
  - With `coin-reward.mjs`, `memory-coins.mjs` and `inventory.mjs`, a new memory place starts with the look, the voice,
    the coins and the pocket already working.
- Dialog scripts (`memory-kit/dialog.mjs`, round 5): a place's talk is JSON, `{start, nodes: {id: {say, hold, choices: [{label, next, if, set, do}], next, branch, set, do, once}}}`,
  run with `dialog(voice, {actions, key}).run(script)`. Conditions are `flag`, `!flag`, `flag=value` or arrays; flags can persist
  with `key`. It only calls `voice.say()`, so it needs no DOM of its own (unit test: `tools/minigame-test/dialog.test.mjs`).
  Daddy's call in the basement is the first script; the Moon Mission reuses the same format.
- Both ways up now land in the café diorama (`/studies/cafe/diorama.html?from=basement`), which walks her up the stairs.
- Test hooks: `?ending` (Daddy calls soon after it opens), `?stay` (powers down but stays). The end-to-end test
  (`tools/minigame-test/basement-flow.cjs`) now plays through to the power-down.

## Round 5: games on Grace's desk (2026-10-23, Evan 19:41Z)
Evan: "put a gameboy in graces basement and put tetris on there ... make sure dos works fully on that computer and there's
more than just 1 game .. give prince of persia (anachronistic, but okay)". The legal line: we never ship someone else's
game. So the games are ours, in the spirit of the ones he named.
- **Pocket player** (`simulations/gameboy.mjs`): a low-poly handheld on the desk (rounded shell, bezel, glass, d-pad on a
  dish, two magenta buttons, start and select, speaker slots, wheel, link port), named by what the parts are. Tap it (or
  its buttons: the d-pad splits by where you touch) for a close-up; arrows, X, Z, Enter work too, Esc puts it down.
  Its game, POCKET BLOCKS, is a falling-blocks puzzle with a 7-bag, ghost piece, soft drop, line-clear flash, levels and
  game over. The screen is the "one-bit dither" card (Inspiring Shaders #12, Return of the Obra Dinn): the frame is
  painted in greys, then each pixel is forced to ink or paper by a 4x4 Bayer pattern. No new coins (the ten stay ten).
- **DOS, fully** (`tools/grace-dos`): the hard disk now holds `GAMES.BAT`, `BLOCKS.COM` and `DUSKBLD.COM`; HELP lists
  them. Two new floppies in a wider disk box: BLOCKS and DUSK. `test/dos-battery.cjs` types what a child would try (VER,
  DIR, TYPE, HELP, GAMES, DATE, TIME, ECHO, SET, PATH, MD, CD, COPY, DEL, RD, a wrong command, CLS) and runs every floppy,
  quits it and checks the prompt is back. Not available: MEM (FreeDOS tools are not in the image).
- **Our own C for DOS**: GCC in 16-bit mode builds the .COM files against `src/c/aw.h`, a small freestanding runtime:
  INT 9 key table with held and latched bits (v86 gives no key-repeat you can rely on), mode 13h with a back buffer, the
  BIOS font, PC-speaker tones, and PIT pacing (v86 has no steady retrace). Held keys now reach the PC from a real keyboard
  (`GracePC.keyDown/keyUp/releaseAll`); phones keep the tap-to-type field.
- **BLOCKS.COM** is the same game as the pocket one in C, in 256 colours. **DUSKBLD.COM** (DUSKBLADE) is an original
  swordfighting platformer: four palace rooms of three storeys, running and careful steps (Shift), jumps and running
  leaps, ledges to climb and drop from, loose floor, spikes, a blade trap, a pressure plate and gate, a potion, a guard
  and a captain to duel (X lunge, Z parry), falls that hurt at one storey and kill at two, a 12 minute clock, and the
  golden door. The people are skeleton figures posed by forward kinematics (`fig.h`) from keyframed poses
  (`duskpose.h`) eased between frames, the way traced film is.
- **Embed mode** (`play.html?embed=1`): the page never navigates away; it tells its parent `{type:'basement', event:
  'ready'|'quit'}` and obeys `{type:'pause'|'resume'}`, so the sandbox can offer it as "play while you wait".
- Tour: no. Tests: `tools/minigame-test/route-cafe-basement.cjs` plays the whole route (town, café, key, door, chores,
  gold disk, ending, back up, front door).

## Round 6: no coins, one charm (Evan 20:51Z)
"Scratch the coin idea, it's all backpack charms." The ten coins, the jar fill, the gold disk and the memory-pieces
pocket item are gone. Beating the word game (KEYSTORM) by playing it two minutes in all (counted while it is on the screen
she is looking at and she is typing; saved as `aw-keystorm-secs`) wins the floppy disk charm through the Backpack's
`earnCharm('basement')`, with the shared golden reward lift, and then Daddy calls her up. The gold disk is out of the box.
Test hook `?play=115`. Tour: no.

## Next
1. On hold: ROTOR RANGER as a GRACE-DOS program (CLOCKTOWER is a real game's name: avoid it). A phone pad for DUSKBLADE while seated.
1b. Duels need a second pass: more guard moves, a boss, music from the PC speaker.
2. The manual's pages, readable in the scene.
3. The café door is agreed; add the tour stop once it is live.
4. Coins and the pocket kept on the player's account rather than the browser.
5. Daddy's call in his designed voice (family cast) once voices go through the wallet.

## How it was made, and how to be faster next time
Evan's routine (09:20Z): after every natural-language minigame, look at the process and find ways to go faster.
Times are local (UTC-4) on 2026-10-23.

| Round | Evan's words | Advance play | Live | Words to live |
|---|---|---|---|---|
| 1: basement, computer, KEYSTORM, coins | 3:32-3:51 AM | 4:15 AM | 4:21 AM | about 50 min |
| 2: real DOS, 3 switches, clipboard chores, rigged girl, music | 4:25-4:41 AM (+ glitter 5:15) | 5:12 AM | 5:20 AM | about 55 min |
| 3: CRT warm-up, child's head, switch lamp, careful stairs, captions | 5:17-5:18 AM | 5:45 AM | 5:51 AM | about 33 min |
| 5: Game Boy, BLOCKS, DUSKBLADE, DOS battery, embed mode | 7:41 PM | (see round 5) | (see round 5) | |

Where the time went:
- Real DOS was most of round 2: finding FreeDOS, SeaBIOS and v86 sources through blocked mirrors (gitlab worked), writing a
  FAT12 image builder, and debugging KEYSTORM in assembly (a clobbered SI register crashed it once).
- Software WebGL in the test browser runs the game several times slower than real time. Fixed sleeps in tests
  captured the wrong moments and cost reruns; waiting on game state fixed that (`tools/minigame-test/basement-flow.cjs`).
- The advance artifact can't serve .bin, .gz or .gltf files, so it needed a base64 shim and path rewriting, done by hand
  each round.
- Each round rewrote parts of one 600-line `play.html`. Captions, close-ups, chores, CRT and reward logic all live there.

Speedups for the next minigame:
1. **Minigame kit.** Move captions with "> " choices, close-up camera, chore list on paper, CRT warm-up, pixel and dither
   pass, and the coin reward hookup out of `play.html` into `simulations/` modules. A new place should be its room
   recipe plus a script of beats.
2. **One-command advance artifact.** A script that copies a play page and its imports, rewrites absolute paths, and
   base64-wraps binaries, so the advance preview is a single call rather than ten minutes of bundling.
3. **Test by state, not by clock.** Start from the flow harness above. Use `?noboot`, `?lit`, `?done` and `?sit` to
   jump to any beat.
4. **One child character.** The rig, the child's head and slimmer build (`grace-kid.mjs`) should become the shared
   kid, so no game rebuilds faces.
5. **Emulator kit stays.** `tools/grace-dos` (FAT12 builder, COM1 signal, build script) makes any new DOS-era game a
   small .asm file and a build line.

What this game added to the canon: bottom captions in the place's era font with terminal "> " choices
(`docs/design/INTERACTION_GRAMMAR.md` rules 7-8); approach is not commitment (sit only by touching the chair); lists
are paper; the gold coins are Daddy's core memories.
