# Remaster shots: same-camera before and after

Fixed-camera captures of the Ranch and Moon tiles for the remaster study (`docs/oracle/remaster/`). Every remaster PR
re-runs the same shot list, so before and after are the exact same camera, hour and framing.

    node tools/remaster-shots/shots.mjs /sandbox tools/remaster-shots/ranch-shots.json out/ranch
    node tools/remaster-shots/shots.mjs /moon    tools/remaster-shots/moon-shots.json  out/moon

- Serves `prototypes/ranch-atelier/dist` locally (honouring the `vercel.json` rewrites), opens the page in headless
  Chromium (SwiftShader, 1280x800) with `?creator=<room>` so `window.holodeck` exists, and waits for the tile to finish
  building (about 3 minutes on a cloud container).
- Hides every overlay so only the world canvas is in the frame.
- For each shot: sets the hour with the holodeck `time` op (running for 1.5 s so the time-of-day mode catches up, then
  paused), sets the camera with the `camera` op (`position`, `target`, no tween), waits, and saves `<id>.png`.
- The default tile is seed 41, Homestead. Live production also reads cloud model calibrations (`/api/model-calibrations`),
  which a local run does not have, so building scale can differ slightly from ranch.abbies.world.
- Needs `playwright` resolvable from this folder (the cloud image has it globally; link `node_modules` if needed).
