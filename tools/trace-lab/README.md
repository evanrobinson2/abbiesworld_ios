# trace-lab (AW-STUDY-0044)
`pip install opencv-python-headless scikit-image scipy potracer cairosvg`
- `traces.py <png> <out>`: potrace and centerline traces, scored (recall, precision, chamfer, line-weight match).
- `fit.py <png> <out>`: puppet landmarks by eye, then render-and-compare hill-climb (silhouette IoU + ink chamfer).
- `skin.py <png> <fit.json> <out>`: cut the traced two-layer ink into the fitted parts, pose the puppet (SVG).
- `build_page.py [--inline]`: builds `studies/drawing/index.html`.
Input: `tools/midjourney/outputs/figure-practice-sketches/job1_1.png`. Landmarks in `fit.py` are for that image.
