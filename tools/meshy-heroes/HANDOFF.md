# Meshy heroes: handoff (AW-STUDY-0043)

Written 2026-10-24 ~17:20Z by the Claude "Meshy heroes" thread, for Codex (or whoever picks this up). Evan, 17:12Z:
"you can use all meshy credits … package open work neatly and dispatch a giant hand off to codex". Read `CLAUDE.md`
first; its rules (PRs to `main`, the tour line, no engine artifacts, provenance kept in the asset folder) all apply.

## What this thread owns
1. **Meshy runs and the credit ledger for every thread.** All Meshy spending goes through one runner and one ledger.
2. **The hero characters**: 24 astronauts (6 people × plasticine/painterly × suit/tee) and Character Studio heroes cs-1, cs-2, cs-4.
3. **The shared animation set**: 83 PG clips on the hero rig, plus the loader.
4. **Meshy backpack charms**: tardigrade, heart, moon, rocket, star, floppy disk, bub, coffee cup, brass key, and the toy car (in flight).
5. **The heroes living in the Winchester town** (`simulations/abbietown/heroes.mjs`).

## How the pipeline works
- **Run Meshy in the cloud:** GitHub Action `.github/workflows/meshy-run.yml` (workflow_dispatch).
  - Inputs: `jobs` (space-separated job ids from `meshy-queue.json`, or `tasks`, `animlib`, `--anims <rig_task_id> <ids>`) and `rig_only`.
  - Repo secret `MESHY_API_KEY`. Never ask Evan for it and never print it.
  - Dispatch on a branch: the runner commits its outputs and the ledger back to that branch, so merge `main` into the branch first.
  - The cloud container itself can't reach api.meshy.ai; only the Action can.
- **The runner:** `tools/meshy-heroes/meshy_run.py`.
  - Kinds: image-to-3d, multi-image-to-3d, retexture, remesh, rig, animations.
  - Recover a paid task with `recover_task` (costs 0).
  - `CAP` is now 1,000,000 (Evan lifted the cap at 17:12Z), so Meshy's balance is the real limit. The Action prints the live balance at the start of every run.
- **The ledger:** `tools/meshy-heroes/meshy/credits.json`. It is merged on push and holds 2,394 credits up to 2026-10-24, including itemised runs from other threads.
- **The queue:** `tools/meshy-heroes/meshy-queue.json`. Each job has `id`, `kind`, `image`, `credits`, `save_to`, optional `deliver_to`, `target_polycount`, and `for`/`note`.
- **Cleanup** runs locally with `pip install bpy` (Blender 5.2 as a Python module). For bpy, run `pip download bpy` then install from the downloaded file; a direct install times out. Rendering also needs `libegl1`.
  - `cleanup.py <hero_id>`: rigged hero to the 20-bone hero rig (root, hips, spine, chest, neck, head, clavicle/upperarm/forearm/hand and thigh/shin/foot, _L/_R), metres, +Z front, ≤4 weights, ~10k tris, materials skin/suit/boots/hair, 1024px JPEG. Writes `cleanup.json` in the asset folder.
  - `charm_cleanup.py <charm-id>` (the `-tex` suffix uses the retexture): 8k tris, largest side 1.0, centred, written to `simulations/assets/backpack/charms/<name>.glb`.
  - `anim_clean.py`: a Meshy animation GLB to a ~30KB clip on the hero rig.

## Where the outputs are
- **Astronauts:** `prototypes/ranch-atelier/dist/studies/moon-mission/heroes/<A1..A6>-<clay|paint>-<suit|tee>.glb` and `heroes.json`.
  - A1 Abbie, A2 Ani, A3 Daddy, A4 Commander, A5 Engineer, A6 alien crewmate.
- **Character Studio heroes:** `prototypes/ranch-atelier/dist/studies/character-studio/models/heroes/cs-{1,2,4}*.glb`.
- **Animations:** `studies/moon-mission/heroes/anims/*.glb` and `index.json`, with provenance in `tools/meshy-heroes/meshy/anims/provenance.json`. All of them come from cs-4's rig (`01a16a9d-de81-7778-b81c-d1e1ba82e0f2`).
- **Animation loader:** `simulations/hero-anims.mjs`. `heroClip(name, hero)` keeps the joint turns, drops the clip's adult bone lengths and scales the hips to the hero. Always use it; raw clips stretch the children and make them float.
- **Town heroes:** `simulations/abbietown/heroes.mjs`, mounted by one line after the townsfolk in `docs/oracle/abbietown/abbietown.template.html`. The page is generated: edit the template, then run `build_page.py`.
  - Abbie, Ani and Daddy (clay tee) stand on the common by the skate park; the crew (clay suit) stand at the launch pad.
  - Checked live on abbies.world on 2026-10-24 (screenshots on branch `heroes-live-check`, which can be deleted).
- **Charms:** `prototypes/ranch-atelier/dist/simulations/assets/backpack/charms/*.glb`. Each one's history is in `tools/meshy-heroes/meshy/charm-*/`.
- **Pictures:** `/mnt/project-files/moon-heroes/`.

## Open work, in order
1. **Toy-car charm (GitHub issue #534).** The Meshy run (`charm-toy-car`, textured, 30 credits) was dispatched at 17:15Z on branch `claude/project-thread-4a30bd`.
   - The reference is a Blender render of the CC BY "Toy racer" (`tools/meshy-heroes/refs/charm-toy-car/`, with provenance and `render_ref.py`). Credit 3dworkbench (CC BY 4.0) wherever the model is credited.
   - Then: run `python3 tools/meshy-heroes/charm_cleanup.py charm-toy-car`, which writes `charms/toy-car.glb`.
   - Wire it in `simulations/backpack.mjs` (`CHARM_GLB`, `CHARM_SHADE`) in place of the hand-built box car. The Backpack and Charms threads own that file.
   - Check it in the game, comment on #534 and close it. Status: see the thread's last message or `git log` on that branch.
2. **Side-by-side page (a CLAUDE.md rule):** every model made from an image needs an interactive 3D viewer next to its inspiration picture. Not built yet for the 24 astronauts, the cs heroes or the charms. The refs are in `tools/meshy-heroes/refs/<id>/pick.png`.
3. **cs-3 (stick man):** Meshy rigging failed with error 422 (pose estimation). Rerun from an A-pose image, or rig it in Blender.
4. **Roster still to make:** 40 PG base bodies and the story heroes (Star Child, gem bug). They are listed in `tools/meshy-heroes/roster.json`.
   - They need reference pictures: Midjourney on Evan's Mac when it's online, or another image source (record which was used).
   - Cost: 20 credits untextured or 30 textured each, plus 10 for remesh and rig.
5. **Abbie wears her backpack** on the hero: `wearBackpack(chestBone, {height:.42, offset:[0,0,-.16]})` from `/simulations/backpack-wear.mjs`, with `pack.update(dt)` each frame. Not yet done in the town heroes.
6. **Reusable painterly shader** owed to Character Studio (keep the comic cel-ink outline) in `simulations/`.
7. **Optional: more animations.** Only 83 of Meshy's 678 library actions are cut, at 3 credits each. Use PG ones only (no weapons, shooting, dying or illness).
   - Command: `--anims 01a16a9d-de81-7778-b81c-d1e1ba82e0f2 <ids>`. Free library list: `meshy/anims/library.json`. Some ids are retired: they return 400 and aren't charged.

## Evan's standing rules that bite here
- Never call work "done" unless it is production-complete in the game. Say "drafted", "preview" or "live", and verify live before saying "live".
- The cloud can't reach abbies.world. Use the Vercel MCP `web_fetch_vercel_url` for files, and a Remote Control session on Evan's PC for screenshots.
- PG only. Kids' faces are never redrawn. Designed voices only.
- Ranch deploys go through the "Vercel deploys broken" thread as a `main` sha. Each PR states `tour: true/false`.
