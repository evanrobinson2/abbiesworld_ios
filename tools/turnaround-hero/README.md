# AW-STUDY-0023 - Turnaround Hero

Model ONE exact figure, Evan's grey low-poly heroic man (`ref/hero-front-back.png`: front and back), using what the
Bruiser Study (AW-STUDY-0021) learned. Starts after Evan's feedback on the Bruiser results; until then this folder is
prep only. Page: `prototypes/ranch-atelier/dist/studies/turnaround-hero/`.

## Method, inherited from AW-STUDY-0021
1. **Turnaround first.** Midjourney front, side and back of this exact figure (`mj-queue.json`, Evan's prompt verbatim,
   the reference attached). Evan picks the sheet; every model is scored from front, side and back.
2. **Depth from a measuring stick.** Meshy multi-view to 3D on Evan's Mac (front + side + back), aligned into the study
   frame and rendered from the same cameras. It is a ruler, not the deliverable.
3. **Anatomy base.** An MPFB (MakeHuman) body, "muscular, heavy", with a Rigify skeleton posed to the A pose, checked
   against the Bodies canon (`docs/oracle/bodies/human-canon.json`, `tools/bodies/score_body.py`).
4. **Simplify to planes.** Decimate (planar) into big flat facets, then the recipe (`build.py`) rebuilds the figure
   part by part with the winning split order from 0021 (torso out led round 1).
5. **This figure, faithfully.** Small bald head, heavy brow, nose and jaw; huge shoulders and traps; fists with five
   fingers; thick shins with the faceted boot-like calves; plain ankle cuffs and shoes.

## Gates every round must pass
- Silhouette IoU and loss from front, side and back against the picked turnaround, same camera as the reference.
- Anatomy: head count, limb lengths and joint heights within the canon's tolerance.
- Simplification: fewer, bigger planes; no noise facets.
- PG base layer: tight briefs with a smooth, plain front. Nothing at the crotch, no anatomical detail.
- Shown beside Evan's pick from the same camera, with an interactive 3D viewer.
