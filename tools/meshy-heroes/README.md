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
- Picks go in `refs/<id>.png` with the job id in `provenance.json`; set `ref`, `mj` and `meshy` in `roster.json`
  by hand-free edits through `make_roster.py` follow-ups, then rebuild the page.

Budget: 2,000 credits. Astronauts 300 (plasticine untextured 20, painterly textured 30), all first runs 1,200.
