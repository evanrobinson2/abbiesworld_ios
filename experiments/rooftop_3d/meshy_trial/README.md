# Window timber — first Meshy material trial

One authorized Meshy Retexture job, completed September 28, 2026. Actual cost: **10 Meshy credits**. Task identity and file hashes are recorded in `job.json` and `provenance.json`. Credentials are never stored in these files or the scripts.

## What was tested

21 existing timber parts from the window frame, circular surround and lattice were exported as one UV-mapped test mesh. The rose wall, glass, bench and other rooftop assets were excluded. Meshy 6 received a detailed text description derived from the approved reference: dark mulberry timber, flowing grain, small knots and softly worn edges. The original scene image was not uploaded. Lighting removal and PBR map generation were enabled.

The service returned a normalized mesh. All three measured axis ratios agreed on a 1.85 scale correction, preserving its proportions. Blender restored its source position and scale. Color and normal textures are 4096 × 4096; the imported additional map images are 2048 × 2048. The original linked asset library was not modified.

## Review

- `../renders/06-timber-before.png`: original procedural material under the sunset lighting.
- `../renders/07-timber-meshy.png`: generated material under the same camera and lighting.
- `../renders/08-timber-scene.png`: generated candidate seen in the assembled rooftop.
- `../meshy-material-study.blend`: separate editable candidate scene with packed texture images.

The candidate produces clearer longitudinal grain and a more detailed circular window surround. Its intact openings and preserved proportions make it usable for this material comparison. It remains too uniform and clean to reproduce the reference's aged treehouse timber; the large timber shapes and edges also need more authored irregularity. This is a successful pipeline/material trial, not final-art approval or a production replacement. The canopy, bark and remaining furniture are unchanged.

## Reproduction

`prepare_meshy_trial.py` exports the geometry. `meshy_retexture_trial.py` authenticates using an existing `MESHY_API_KEY` environment variable or a hidden terminal prompt. It submits only when no saved task exists and otherwise resumes the recorded task; it never automatically retries a create request. `review_meshy_trial.py` produces the saved comparison scene and renders.

The request options and exact prompt are in `request.json`. Preserve the recorded task and downloaded artifacts; rerunning the existing client resumes this job rather than charging for another trial.
