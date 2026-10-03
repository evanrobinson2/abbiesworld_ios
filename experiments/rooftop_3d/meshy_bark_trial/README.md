# One authorized bark-material trial

Evan explicitly approved uploading the newly authored bare tree for one 4K Meshy retexture job costing 10 credits. Task `01a0e8e7-e1fe-7049-9ee7-f3a250bac867` succeeded; the recorded actual cost is **10 credits**. No repeat job was submitted. The API credential was supplied through a hidden prompt and was not saved in the project.

`tree-bark-input.glb` is the immutable uploaded tree, with no flowers or leaves. `input-manifest.json` records its hash, 95,910 triangles, original placement and bounds. `request.json`, `job.json` and `provenance.json` record the prompt, options, result and downloaded output hashes. The client resumes a known task rather than creating another one.

The returned model was uniformly normalized. All three measured restoration ratios agree at approximately 3.7905935. Blender has attached, packed 4K color/normal maps and 2K companion maps. `blender-review.json` records the map dimensions and fitting check.

`../bark-material-study.blend` preserves the original material candidate under the earlier camera (renders 12 and 13). Meshy provides subdued grain but the result is still too smooth and pale for the deeply ridged source tree. The later `../enclosure-study.blend` rearranges a copy, keeps its UVs, and applies a darker, cooler material calibration. New bark returns use local procedural materials; no second paid texture job was used for them.

The geometry and camera still require artistic review; this is not a finished tree or a mobile-ready asset. Blossoms remain independently placed. The source library and uploaded model remain unchanged.
