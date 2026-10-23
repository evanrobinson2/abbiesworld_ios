# Aurora Mk 2 (AW-STUDY-0035)

The upgrade of the USS Aurora Moon ferry (Mk 1: `RE-072`, `RE-073` in `prototypes/ranch-atelier/dist/simulations/moon/assets/`).
Study doc `docs/oracle/aurora/AURORA_STUDY.md`; page `prototypes/ranch-atelier/dist/studies/aurora/`.

- `build.py`: the recipe on the Moon base kit (`tools/moon-base-kit/bkit.py`). Writes `aurora-mk2.glb`, `maps/`, `r/`
  (hero and 1.1 m eye renders) and `stats.json`. About 9 minutes on 4 cores; `--norender` skips the renders.
  Needs `pip install bpy` (5.2.3).
- `render_mk1.py`: renders Mk 1 with the same cameras and light into `mk1/`, for the side-by-side.
- `mj_prompts.json`: the Midjourney proofs. Picks go in `concept/` with job ids in `provenance.json`.
- `notes.json`: brief, request and revision rounds.

After a rebuild, copy `aurora-mk2.glb` to `prototypes/ranch-atelier/dist/studies/aurora/m/aurora-mk2.wasm` (the
Artifact preview refuses `.glb`) and the renders to `studies/aurora/img/`.
