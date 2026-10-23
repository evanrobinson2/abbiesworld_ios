"""Builds views/hero.png (the only scoring target) from mj/potting-bench/hero.png.  usage: python make_views.py

Art director's call: the hero wins and is the only target. The turnaround sheet drew a different, tall narrow bench
with a solid plank back, so view_front/side/back are dropped.
The harness mask keeps the hero's warm cast shadow (it is orange-brown, the same hue as the wood) and fills the
open gaps under the top, so the hero is keyed here instead: everything that differs from the cream backdrop above
the ground line (CUT, where the shadow starts), and below it only what falls inside hand-traced polygons around the
legs and stretchers (coordinates in the 2048 px hero). Then it is pasted on a flat backdrop. Scored by hero_check.py.
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'potting-bench', 'hero.png')
CUT = 1300
POLYS = [
    [(450, 1080), (565, 1080), (560, 1140), (512, 1545), (435, 1568), (385, 1540)],          # left back leg
    [(458, 1372), (528, 1352), (660, 1432), (662, 1568), (462, 1440)],                       # left side stretcher
    [(630, 1180), (742, 1196), (802, 1690), (772, 1712), (720, 1720), (678, 1692)],          # front left leg
    [(765, 1336), (1360, 1218), (1512, 1176), (1518, 1302), (1400, 1294), (765, 1444)],      # front stretcher
    [(1268, 1070), (1397, 1070), (1378, 1352), (1330, 1366), (1256, 1352)],                  # right back leg
    [(1348, 1176), (1512, 1186), (1534, 1362), (1408, 1302)],                                # right side stretcher
    [(1498, 1050), (1592, 1050), (1668, 1486), (1600, 1508), (1544, 1498), (1532, 1350)],    # front right leg
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
