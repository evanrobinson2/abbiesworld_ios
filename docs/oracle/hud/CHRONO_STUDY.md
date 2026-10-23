# The ranch chronograph: a small study of game clocks and complication watches

Evan, 2026-10-23, on Sandbox v2: "the widgets were better like before, with liquid glass, showing the time of day, and
the simulation controls elegantly displayed; we've lost capability. I like the way you're displaying it. Maybe design
a ... chronotimer, cronoswissarmy knife." This note studies one instrument that holds time, weather, season, pause and
speed, and the design that came out of it. It refines the "sun dial" toy in `HUD_STUDY.md`.

## Games

| Game | What the clock is | Take | Leave |
|---|---|---|---|
| Don't Starve | A round dial split into day, dusk and night wedges; one hand sweeps; the day number sits in the middle; the moon phase shows at night | A ring coloured by the parts of the day, so "how long until dark" reads at a glance | The ink-scratch art |
| Stardew Valley | Top-right plate: weekday and date, a half-moon dial with a hand, weather and season icons beside it, money below | Time, weather and season in one plate; a dial for feel, digits for precision | The plank frame and the money |
| Animal Crossing: New Horizons | A tiny time-and-date pill on the phone screen; weather lives in the world | Readable digits small; weather shown by the world first | Real-world time |
| Frostpunk | Top cluster: a big dial (temperature) with day and hour, speed buttons tucked against it | Speed and pause as part of the clock, not a toolbar | The dread |
| RimWorld, Banished, Anno | Date and hour with pause, 1x, 2x, 3x buttons next to them | Pause and speed belong to time | A row of web buttons |
| Tiny Glade | No clock; you drag the sun across the sky | Time as a thing you can touch; the world's light is the readout | — |
| Dorfromantik | No time at all | Free build can drop the dial's day strip | — |

## Watches

| Complication | What it does | Ranch use |
|---|---|---|
| 24-hour (GMT) bezel | A ring of 24 hours, often two-tone for day and night | The outer ring, painted night, dawn, day, dusk, with the sun or moon riding it |
| Moonphase aperture | A window where the moon (or sun) rises over two humps | The dial's centre: the sky window with sun or moon over the ranch hills |
| Chronograph pushers | Two buttons beside the crown: start/stop and reset | Pause/play and speed live on the case as two pushers |
| Subdials (registers) | Small dials inside the main one for seconds, minutes, hours | Two small glass registers for weather and season |
| Date and day-date windows | A small aperture with the day | "Monday · Day 1" beside the time |
| Crown | Wind and set the watch | Tap the dial to set the time of day |

## The design

One liquid-glass case, top left, where the old clock card was:

- **Dial** (64 px, 56 on a phone): a 24-hour bezel coloured night, dawn, day and dusk; the sun or moon rides the ring at
  the current hour; the centre is a moonphase-style sky window over the ranch hills. Tap it to set the time of day.
- **Readout**: the time in large digits and the day underneath, on solid glass so they read over any terrain.
- **Two registers**: weather and season as small glass subdials. Tap one to change it.
- **Two pushers** on the right of the case: pause/play (the dial dims and gets a nap when paused) and speed (shows the
  pace). Tap the speed pusher for the speed choices.

Everything the v1 clock card and toolbar did for time is back, in one object. The world stays the main readout:
light, sky and weather still change with the same signals.

## Anything can be a dial (Evan: "how many friends Sarah's invited to the party could become a widget")

The case is a host for complications, like a watch movement that takes modules:

- **Source.** Every scene volunteers its information manifest (`docs/design/INFO_MANIFEST.md`,
  `presentation-layer.mjs`). Any `player` item can be pinned as a register. The ranch volunteers friends arriving,
  hungry animals, feed, water, people and the player's to-dos.
- **Dial forms by kind.** count → number, gauge or moon; level → gauge, moon or number; list → list or number;
  timer → timer or moon; state and place → sign. The player picks the form when pinning ("Pin a dial", the + register).
- **Budget.** At most three pinned registers next to weather and season. On a phone the case folds to the dial and the
  time; tapping the dial unfolds the pushers and registers for a few seconds.
- **Diegetic first.** A pinned register is a quick hit; each item still says how the world shows it (Sarah's invites:
  guests walking up the lane with presents), and the pinned dial's detail repeats that line.

## The world suggests (Evan: "widgets could be suggested by the game world")

An item may carry `relevant()`. When it turns true (friends are on the way, an animal is hungry, a party is near), the
case shows one quiet ghost register with a dashed rim. Tap it to pin it; tap its × to wave it off (remembered). It
never pops up over the world and never takes focus.

## The creator's to-dos (Evan: "add some real purpose to the moon mission")

A to-do register (pinned by default) shows how many are left and opens into the list: tick, remove, add. Each to-do
remembers the place it was made in. The voice controller can add one with `window.RanchTodos.add(text, {place})`, and
reads them from the `todos` manifest item (audiences: player, grown-up, director).

## Hand cards with a face (Evan: "you need the comic icon and names ... no backs, but a facade")

The tile cards in the hand are drawn by the Card Forge renderer (`cards/forge.mjs`, hand LOD), so they share one
language with the collectible cards: a wooden frame by tier, the tile picture in a window shaped by its type, the name
ribbon, the generator's comic icon in the enamel token, and what the tile brings as enamel icons on the plate.
