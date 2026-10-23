"""Builds views/hero.png (the only scoring target) from mj/potting-bench-charming/hero.png.  usage: python make_views.py

The hero wins and is the only target. The turnaround sheet drew a different bench (rope-lashed log legs, a low
second shelf with a pot under the top, a fretwork back board, the trowel hanging on a post), so the sheet views are
dropped. The harness mask keeps the hero's soft warm cast shadow (lower left and under the legs: the same hue as
the lit wood) and fills the open gaps under the top, so the hero is keyed here instead: everything that differs from the cream backdrop above
the ground line (CUT, where the shadow starts), and below it only what falls inside hand-traced polygons around the
legs and stretchers (coordinates in the 2048 px hero). Then it is pasted on a flat backdrop. Scored by hero_check.py.
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'potting-bench-charming', 'hero.png')
CUT = 1400
POLYS = [
    [(488, 1395), (648, 1395), (634, 1602), (560, 1618), (478, 1598)],               # left back leg
    [(600, 1395), (800, 1395), (800, 1578), (598, 1512)],                             # left side stretcher
    [(788, 1395), (938, 1395), (968, 1692), (900, 1720), (818, 1702)],                # front left leg
    [(930, 1395), (1332, 1395), (1322, 1428), (932, 1512)],                           # long stretcher
    [(1318, 1395), (1402, 1395), (1402, 1455), (1318, 1430)],                         # right side stretcher
    [(1392, 1395), (1548, 1395), (1562, 1558), (1482, 1575), (1408, 1548)],           # front right leg
]


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float) / 255
    bg = np.median(a[:8].reshape(-1, 3), 0)
    m = np.linalg.norm(a - bg, axis=-1) > 0.10
    poly = Image.new('L', (a.shape[1], a.shape[0]), 0); d = ImageDraw.Draw(poly)
    for p in POLYS:
        d.polygon(p, fill=255)
    allow = np.asarray(poly) > 0; allow[:CUT] = True
    m &= allow
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.01 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 2000)[0] + 1)
    out = np.broadcast_to(bg, a.shape).copy(); out[m] = a[m]
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero_mask.png'))
    print('views/hero.png written')


if __name__ == '__main__':
    main()
