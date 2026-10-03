# Direct image-to-3D experiment

The clean original Rooftop Lookout artwork was sent directly to Meshy following Evan’s request to try a new approach. No handmade geometry or textual reinterpretation was supplied.

Input: `../references/rooftop-source.png` (exact bytes and SHA-256 in `request.json`).

One Meshy 7.1 generation: standard geometry, 4K PBR textures, image enhancement disabled, no remesh. Requested GLB and USDZ plus four provider preview angles. Documented and API-reported cost: 30 credits. No automatic rerolls.

The client saves the job identity immediately and resumes that identity if interrupted. It refuses to repeat a potentially ambiguous submission. Credentials stay in process memory; no API credential or signed asset URL is saved.

The generated candidate stays separate from the Blender source and the existing iPad prototypes. This is an experiment in reconstructing the whole illustration; game integration, independent moving components, suitable geometry and visual fidelity require inspection of the actual output.

Sources: [Image-to-3D API](https://docs.meshy.ai/en/api/image-to-3d), [pricing](https://docs.meshy.ai/en/api/pricing).

## Result

Meshy reported SUCCEEDED and charged 30 credits, but the visual reconstruction failed. The downloaded model contains one mesh (727,956 triangles) forming an almost flat rectangular frame with small blossom fragments; the tree, couch, alcove, roof and full deck were not reconstructed. Independent Blender import and render confirmed this is present in the model itself, not just a provider preview error. Bounds in Blender coordinates are about 1.903 × 1.859 × 0.060 units.

Files: `preview.png` and the four cardinal previews are Meshy’s outputs. `blender-inspection.png` is an independent neutral-light render of the raw GLB. `rooftop-meshy.glb`, `rooftop-meshy.usdz` and packed `rooftop-meshy-inspection.blend` retain the result. Nothing has been integrated into the app, and no second job was submitted.
