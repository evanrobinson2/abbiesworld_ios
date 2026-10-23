#!/usr/bin/env python3
"""Small copies of every /models reference picture, so the strip and the grid never download full-size images.
For each urls.ref in prototypes/ranch-atelier/dist/models/manifest.json writes next to it:
  <name>.s.webp  128 px  (the strip of thumbnails)
  <name>.m.webp  480 px  (the grid of cards)
Pictures are fitted inside the box, never cropped. Safe to re-run; skips copies newer than the original.
Run it after adding models:  python3 tools/models-thumbs/make.py   (needs Pillow)"""
import json, os, sys
from PIL import Image
DIST = os.path.join(os.path.dirname(__file__), '..', '..', 'prototypes', 'ranch-atelier', 'dist')
d = json.load(open(os.path.join(DIST, 'models', 'manifest.json')))
models = d if isinstance(d, list) else d['models']
SIZES = {'s': (128, 70), 'm': (480, 78)}
made = saved = 0
for m in models:
    ref = (m.get('urls') or {}).get('ref') or ''
    src = os.path.join(DIST, ref.lstrip('/'))
    if not ref.startswith('/') or not os.path.isfile(src):
        continue
    base = os.path.splitext(src)[0]
    im = None
    for tag, (box, q) in SIZES.items():
        out = f'{base}.{tag}.webp'
        if os.path.exists(out) and os.path.getmtime(out) >= os.path.getmtime(src):
            continue
        if im is None:
            im = Image.open(src); im.load(); im = im.convert('RGBA' if 'A' in im.getbands() else 'RGB')
        t = im.copy(); t.thumbnail((box, box), Image.LANCZOS); t.save(out, 'WEBP', quality=q, method=6)
        made += 1; saved += os.path.getsize(src) - os.path.getsize(out)
print(f'{made} thumbnails written')
