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

## Next
1. Evan's pick between ROTOR RANGER and CLOCKTOWER (or both), then build them as GRACE-DOS programs.
2. The manual's pages, readable in the scene.
3. The café door is agreed; add the tour stop once it is live.
4. Coins kept on the player's account rather than the browser.

## How it was made, and how to be faster next time
Evan's routine (09:20Z): after every natural-language minigame, look at the process and find ways to go faster.
Times are local (UTC-4) on 2026-10-23.

| Round | Evan's words | Advance play | Live | Words to live |
|---|---|---|---|---|
| 1: basement, computer, KEYSTORM, coins | 3:32-3:51 AM | 4:15 AM | 4:21 AM | about 50 min |
| 2: real DOS, 3 switches, clipboard chores, rigged girl, music | 4:25-4:41 AM (+ glitter 5:15) | 5:12 AM | 5:20 AM | about 55 min |
| 3: CRT warm-up, child's head, switch lamp, careful stairs, captions | 5:17-5:18 AM | 5:45 AM | 5:51 AM | about 33 min |

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
