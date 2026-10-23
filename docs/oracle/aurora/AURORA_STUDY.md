# AW-STUDY-0035 - Aurora Mk 2 Spaceship

Evan, 2026-10-23 13:03Z: "have we ingested any space ship games from oracle? I want a space ship study as well.
specifically for aurora mk 2", then "mk1 is in game".

Page: `prototypes/ranch-atelier/dist/studies/aurora/` (app.abbies.world/studies/aurora/). Recipe: `tools/aurora-mk2/`.

## What Mk 1 is

The USS Aurora is the Moon port's ferry. It was never in the Moon Mission pack (`trek.zip`) or the Moon heroes roster; it
was authored in the rocketship-exterior batch of the Scene Generator:

| Asset | What it is |
| --- | --- |
| RE-072 | Aurora rounded shell lunar ferry: 6.4 m, ivory segmented shell, light rib hoops, dark window waist with a terracotta pinstripe, ribbed cockpit window, two spherical shoulder engine pods with brass rims, four splayed legs, an airlock box. Built from a reference picture Evan supplied (`aurora-shell-user.png`). |
| RE-073 | The same ship at exactly 2x, lettered USS AURORA; the VIP ship in `moon-rocket.mjs`. |
| RE-075 | RE-073 under construction (upper shell off, scaffolds). |
| RE-076 | The fitted cabin cutaway: two pilot seats, four passenger seats, two berths, galley and washroom. |
| `/starship` | The Aurora Starship scene: 20 crew with life stories (`simulations/starship/`). |

The Mk 1 Blender source (`batch_shell_ferry.py`) lives in the PC's bronze-age-world project, not in this repo; the GLBs
and their asset cards are in `dist/simulations/moon/assets/`. `DEVELOPMENT-PRACTICES.md` records that Meshy was ruled
out for the Aurora and Moon ship work, so Mk 2 is an engineered recipe.

## The Oracle's space games

The Oracle has profiled 27 space or sci-fi games from Evan's library: Breachway, Breathedge 1 and 2, Deliver Us The Moon,
ΔV: Rings of Saturn, Dyson Sphere Program, Empyrion, Entropy, FTL, IXION, Kerbal Space Program, Mass Effect: Andromeda,
No Man's Sky, Ring Runner, Sins of a Solar Empire, Space Engineers, Space Pirates and Zombies 1 and 2, Starcom, Starfield,
Startopia, Stationeers, Stellaris, Surviving Mars, The Invincible, Transcendence and VoidExpanse. Outer Wilds, ASTRONEER and
Among Us are profiled under other genres and matter here too. SpaceCraft still needs a play session.

"How it's drawn" (`identity.rendering`) exists for all of them, but only No Man's Sky has a hand-studied signature and
lesson; the rest are read from the one-line art note. Hand-studying Outer Wilds, Kerbal and ASTRONEER is the obvious
next step for the rendering index.

Lessons used in Mk 2:

1. **Kerbal Space Program**: a ship is its parts. Every Mk 2 part is named for what it is, so the game can animate one
   part and a child can ask for a change in words.
2. **Outer Wilds**: a handmade ship you want to come home to. Warm light at the door and in the portholes.
3. **ASTRONEER**: bright, chunky low poly reads at any size; the detail goes into baked maps, not triangles.
4. **No Man's Sky**: one palette per place drives sky, fog and grade. The Aurora's own palette (ivory, terracotta,
   brass, green-black glass) stays fixed so it reads on any world.
5. **FTL, Among Us**: rooms you can see into are where the crew's story happens. Next: a Mk 2 cutaway from RE-076.
6. **Starfield, Space Engineers**: ships from modules. Mk 2's sections and pods are the first modules of a kid-sized
   build-your-own Aurora.

## Mk 2, round 1 (2026-10-23)

Engineered on the Moon base kit (`tools/moon-base-kit/bkit.py`), with six Aurora roles added in the recipe (Metal_Ivory,
Metal_IvoryLight, Metal_Waist, Metal_Terracotta, Metal_Brass, Glass_Canopy). 116 named parts, about 12.8k triangles,
2048 px baked colour, roughness and normal maps, mass per part in the glTF extras. 8.7 x 9.8 x 5.5 m, with the feet inside
the touchdown circle of the 12 m landing pad (MK-003, AW-STUDY-0031).

What it keeps from Mk 1: the sealed ivory shell, rib hoops, dark window waist and terracotta pinstripe, spherical
shoulder pods with brass rims, ribbed cockpit glass, four splayed legs and belly VTOL thrusters.

What it adds: a three-section hull (cockpit, cabin, cargo), a wraparound canopy, amber "ready" glow in the pod intakes
and nozzles, a lit brass doorway with a five-step stair, ten warm portholes, red and green running lights, a dorsal
spine, hatch, sensor dish and red beacon, and twin main nozzles with a cargo door.

How it shows information (all diegetic): pods glowing amber mean ready to fly; lit door and stair down mean come aboard;
warm portholes mean someone is home; the mast beacon blinks when it talks to Earth; red and green running lights give
port and starboard.

The Midjourney proofs were queued on the Mac, which went offline mid-run, then moved to Evan's PC. Round 2 rebuilds the
recipe against his pick and shows pick | round 1 | round 2 from the same camera.

## Coordination

- Moon base FPS assets (AW-STUDY-0031) owns the landing pad, hangar and airlock. Mk 2 fits MK-003 and uses its lamp
  roles, so the pad's beacon ring and the ship's ready glow speak the same amber.
- Moon heroes (AW-STUDY-0029) owns the lander, buggy and the characters. The Aurora is the ferry, not the lander. Cyan
  `#00ffd1` stays reserved for the meteorite and the Star Child and gold for memory coins; Mk 2 uses neither.

## Next

1. Evan's Midjourney pick, then round 2.
2. A cutaway Mk 2 cabin from the RE-076 fit-out, sized for the 20-crew starship scene.
3. Ready and boarding states animated in the Moon port (`moon-rocket.mjs`), then Mk 2 replacing RE-073 on the VIP visit.
