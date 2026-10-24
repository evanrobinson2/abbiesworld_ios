# Halloween mode for Winchester (drafted, experimental)

Evan, 2026-10-23 21:09 local: "add a halloween mode ... the world needs you to be able to interact with it."
Status: **drafted**, behind an experimental flag. Not live for players.

## What it is
A world mode of the real Winchester board (the seven hexes at `/town`), not a separate page. The world is always today and now, so
it comes on by itself between Oct 24 and Nov 1 once the experiment is switched on. Tone: PG, cute, never scary.

| Layer | What changes | Grid |
| --- | --- | --- |
| Light | The zone's own look is graded toward dusk purples and warm amber (`town.lookFilter`, read by `dioFrame`). Stronger at night, gentler at noon. No fog layer over the world; low mist drifts on the lawns instead. | the whole game adapts to one signal |
| World | Jack-o'-lanterns glow on porches, bats circle each hex, a wheelbarrow of pumpkins (library model `kit-wheelbarrow-with-pumpkins`) stands beside a few doors. | diegetic |
| People | The townsfolk put on costumes (witch, pumpkin head, cat, skeleton, astronaut). Little trick-or-treaters queue at lit doors, knock, and go back. | diegetic |
| Play | Tap a lit porch: three knocks, a creaking door, a costumed neighbour with a speech bubble hands you a sweet that drops into the backpack with her inner voice. Five doors in one night hang the Pumpkin charm. One treat per door per night. | spatial (the bubble), diegetic (knock, creak) |
| Sound | Knock, creak, celesta jingle, and a quiet minor-key music-box loop (meta). Follows the mute switch and starts after the first tap. Placeholder for the finished "Halloween After Dark" score. | `docs/music/MUSIC_BIBLE.md` |

## Switches
- `?experimental=halloween` turns the experiment on and remembers it. `?experimental=off` clears it.
- `?halloween=on|off|auto` is the developer toggle (remembered); `window.AbbieHalloween.set('on')` does the same.
- With neither, the town is exactly as before (checked by the headless test).

## Where it lives
- `simulations/halloween-mode/rules.mjs` (the rules, no drawing), `town.mjs` (the scene), `sound.mjs`.
- One line in `docs/oracle/abbietown/abbietown.template.html` mounts it; one line in `dioramas.block.js` lets a mode grade the look.
- `pumpkin` charm and its 3D model are in `simulations/backpack.mjs` (not counted toward the Heart).

## Tests (the new-invariant gate)
- `tests/halloween-mode.test.mjs`: switch, season, doors, one treat per door, charm once, PG treats, light.
- `tests/halloween-mode.headless.cjs`: opens the real town in headless Chromium, checks it is off by default, then knocks five doors and checks the backpack, the charm and that nothing throws.

## Before it goes live
Leaves the flag when a person has played it on a phone. Then: set the season default, add `"tour"` to `whats-new.json`, swap the loop for the R2 score.
**Tour: no for now** (a seasonal event; it joins the tour once it is live for everyone).

## Not done yet
Lanterns on the farm and moon tiles, hand-made costume models (these are chunky stand-ins), real candy bowls on the porches, the Moon Mission Halloween variant.
