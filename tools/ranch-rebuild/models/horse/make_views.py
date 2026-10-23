"""Builds views/ (the scoring targets) from mj/horse.  usage: python make_views.py

The sheet's front, side and back views are used as drawn (labels are right: front = face, side = near/left side with
the head on the left, back = rump and tail). The only change: the soft cast shadows that streak sideways from the
hooves survive the harness's shadow filter and widen the front and back bounding boxes (the front target was 0.36 H
wide at the ground against 0.32 H at the barrel, and off-centre). Below the hoof tops, only the dark hoof pixels are
kept; everything else there is painted with the backdrop.
"""
import os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'horse')
OUT = os.path.join(HERE, 'views'); os.makedirs(OUT, exist_ok=True)
for v in ('front', 'side', 'back'):
    a = np.asarray(Image.open(os.path.join(MJ, f'view_{v}.png')).convert('RGB')).astype(float)
    H = a.shape[0]
    bg = np.median(np.concatenate([a[:, :6], a[:, -6:]], 1), 1)          # per-row backdrop
    lum = a.mean(-1)
    # rows from the hoof tops down: the hooves are the only dark (lum < 120) pixels there
    dark_rows = np.where((lum < 110).sum(1) > 8)[0]
    y0 = 1335
    for y in range(y0, H):
        keep = lum[y] < 120
        a[y][~keep] = bg[y]
    Image.fromarray(a.astype(np.uint8)).save(os.path.join(OUT, f'view_{v}.png'))
    print(v, 'cleaned below row', y0)
