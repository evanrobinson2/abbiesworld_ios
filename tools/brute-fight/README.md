# AW-STUDY-0027 - Brute Fight

Evan, 2026-10-23 09:35Z: "u have meshy right? these are EPIC HERO models.. after you clean them up, you can rig and animate
them right? can you make a brute study with two brutes fighting each other? use proper idle, hurt, fall, jump, block,
punch (jab, heavy, uppercut, and two fisted axe hammer) and equal anims for receiving punches, blocking, etc. we can make
a street fighter with this one ... can you paint these too?"

Standing rule (Evan, 09:39Z): epic heroes come from Meshy, followed by Blender cleanup with the Bruiser pipeline.

Page: `prototypes/ranch-atelier/dist/studies/brute-fight/` (`index.html` is the study, `play.html` the game,
`play.html?show=moves` walks through every blow with its hit reaction and its blocked reaction).

| File | What it is |
|---|---|
| `fighters.json` | The fighters: Meshy hero, learned rings (spec), Meshy task, his picture, and the paint (role colours and shadow tint). |
| `build.py` | One command for everything: weld + decimate (the Bruiser cleanup), roles per hero face, bake colour, AO and height from the 30k hero onto fresh UVs on the 3k fighter, combine into `paint.png`, place the 20-bone skeleton from the rings, weight by part and distance, key every move, export `out/<fighter>/fighter.glb`. `--sheet` also renders `moves.jpg`. |
| `moves.py` | The move set as numbers: key poses about the body's own axes (see its docstring), 20 clips, and the game data in `MOVES` (when the blow lands, reach, damage, which reaction, push). Written to `out/moves.json` for the game. |
| `out/<fighter>/` | `fighter.glb` (mesh, paint, skeleton, 20 animations), `paint.png`, `rig.json` (joint positions), `moves.jpg` (contact sheet). |

`python3 build.py --sheet` rebuilds both (about 20 s each; needs `pip install bpy`, and on a bare Linux box `libegl1`).
Then copy `out/*/fighter.glb` and `out/moves.json` into the study folder.

Adding a brute: a Meshy model, its rings from `tools/bruiser-study/scale/learn.py`, and one entry in `fighters.json`.
Every clip works on every brute, because the skeleton is placed from the rings and the poses are written about the
body's own axes.

Meshy came back grey for both (the pictures are grey clay), so the paint is ours. No new Meshy runs were made: both
heroes are the Bruiser study's (`01a167ca`, `01a16806`). Bruiser thread asks to be told before any new Meshy run
(credits are set aside for the Moon Base models).
