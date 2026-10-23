# AW-STUDY-0043 - Meshy hero characters

Every hero character, made the epic-hero way (Evan 2026-10-23 09:39Z): Midjourney turnaround, one Meshy image-to-3D
run on Evan's Mac, then the Bruiser cleanup (`tools/bruiser-study/scale`), the gear kit (`accessorize.py`) and a rig
with weights for Character Studio.

- `make_roster.py` writes `roster.json`: 12 Moon astronauts (6 crew x 2 looks, Evan 14:22Z: plasticine claymation and
  painterly, style in words only), the 40 PG base bodies (`docs/oracle/moonheroes/BASE_ROSTER.md`) and 5 story heroes.
  Each entry has its Midjourney prompt, Meshy settings and status.
- `mj-astronauts.txt`: the 12 astronaut prompts, one per line, for the Midjourney machine.
- `page.py` builds `prototypes/ranch-atelier/dist/studies/meshy-heroes/index.html`; `--inline OUT` embeds the images
  for the claude.ai preview (https://claude.ai/artifact/6sxn7vD7VxCe29yrC9a3tS).
- Midjourney images go in `refs/<id>/mj_<jobid>_<n>.png` with job ids in `refs/provenance.json`. Set the pick as `ref`
  and update `mj` and `meshy` in `roster.json`, then rebuild the page.

Budget: 2,000 credits. Astronauts 300 (plasticine untextured 20, painterly textured 30), all first runs 1,200.

## Delivery spec (Character Studio, AW-STUDY-0037, 2026-10-23 14:26Z)
- Skeleton: the 20-bone brute-fight rig, names exactly root, hips, spine, chest, neck, head, clavicle_L/R,
  upperarm_L/R, forearm_L/R, hand_L/R, thigh_L/R, shin_L/R, foot_L/R.
- Faces +Z, Y up, metres, feet on y=0. Rest pose A-pose, arms about 45 degrees down (T-pose also works).
- Skin: at most 4 weights per vertex; heat or voxel weights with clean shoulders and hips (auto weights tore the old
  brutes at the shoulder).
- 6k to 12k triangles, one GLB per character, materials named by role: skin, suit, visor, boots, hair.
- Plasticine: Meshy untextured; the studio's `clayMaterial` (studies/character-studio/directions.mjs) does the look.
- Painterly: we build it as a reusable shader in `simulations/`, keeping the comic direction's cel ink outline as rim.
- Deliver to `prototypes/ranch-atelier/dist/studies/character-studio/models/heroes/` on main and tell that thread.
  It plays all 40 CMU mocap moves (`tools/character-studio/mocap/retarget.py`).

## Abbie wears her backpack
On her rigged hero, attach the pack to the chest bone at runtime (Backpack thread, PR #418):
`import {wearBackpack} from '/simulations/backpack-wear.mjs'`, then
`const pack = await wearBackpack(chestBone, {height: .42, offset: [0, 0, -.16]})` and `pack.update(dt)` each frame.
Her front is +z, units are metres; the module compensates for bone scale.
