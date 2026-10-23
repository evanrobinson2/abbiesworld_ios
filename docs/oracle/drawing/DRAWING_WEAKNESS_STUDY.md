# AW-STUDY-0044 - Why Our Drawing Is Weak (2026-10-23)

Page: /studies/drawing/ (preview https://claude.ai/artifact/Uri32fy8Rft3qssdwkCVQP). Code: `tools/trace-lab/`.

Evan: Midjourney is good at raster, but our code cannot trace those images well, let alone carry expression and feeling.

## Finding
Tracing is not what is broken. Potrace on a Midjourney sketch covers 99.8% of the ink with 100% precision and a 0.94 line-weight match (0.89 on a second image), against our own ink mask. A centerline trace with one width loses all weight; measured widths recover half of it.
Our drawing is weak because (1) we draw from a description, not the picture; (2) nothing measures the result: eyeballed landmarks scored 0.49 silhouette overlap, a render-and-compare loop reached 0.871 in 4,000 tries (nine manual reps reached the same plateau); (3) capsules and ellipses carry no line weight, bevel or hatching; (4) silhouette overlap cannot see feeling; (5) we trace to compare, then throw the trace away.

## Fix proven on the 2D example
`fit.py` (landmarks by loop) then `skin.py` (two ink layers cut into 18 parts on the fitted skeleton). At rest the puppet matches the picture's ink (98.8% covered, 99.9% real), as vector. Posed, it keeps its line.
Not solved: gaps open at joints when a part turns (the hidden overlap was never drawn); the floating arm is Midjourney's own error. Only one image was fitted. Vtracer colour mode was tried and dropped (setup error), not scored.

## Recommendation
Reference first (trace, never re-draw); landmarks by loop, not eye; parts are traced cut-outs on the 0041 rig; add line-weight, ink coverage and tone to the practice-rep score; next test a Midjourney character with a face (fictional adult), no kids' faces redrawn.
Tour: no (a study, not a feature).
