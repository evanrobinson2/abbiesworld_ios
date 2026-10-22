# Paper helmet study

Three competing ways to rebuild one Midjourney helmet in a folded-paper style, scored by one loss from the same camera.

- `helmet.py`: parametric helmet builder. Shape numbers say what the helmet is; `mode='grammar'` builds it from the papercraft rules (facet shell, hemmed plates, brow ledge, folded crest blades, ridge strip); `mode='smooth'` plus the optional generic paper filter is the geometry-first path.
- `hloss.py`: silhouette, chamfer, 6 landmarks, 5 part crops, SSIM, tone, style, crease and straight-crease terms.
- `fit.py`: (1+1)-ES with fast silhouette or full-render scoring; `RULES` are the style invariants the fit may not break.
- `study.py start A B C R`: the experiments. `critic.py`: Opus critic rounds. `judge.py`: 768 px final scores. `ridge.py`: late-Roman ridge helmet from the same grammar.
- Results page: https://claude.ai/artifact/TXjyaZgNac1Q4cSb7aTUnP

Needs `pip install bpy==5.2.3 scikit-image rembg onnxruntime`.
