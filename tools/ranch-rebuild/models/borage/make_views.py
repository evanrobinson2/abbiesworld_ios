"""Builds views/hero.png (the only scoring target) from mj/borage/hero.png.  usage: python make_views.py

Art director's call: score on the hero alone (there is no turnaround). The hero's cast shadow is olive (cream
darkened under a green-tinted light), so the harness mask keeps it. Here: everything that differs from the cream
backdrop above CUT (just above where the shadow starts) is kept; below it, only what falls
inside hand-traced polygons round the lowest rosette leaves. Then a small opening, the
largest parts kept, small holes filled, pasted on the backdrop colour.
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'borage', 'hero.png')
CUT = 1600          # rows below this (2048 px hero) may be shadow; there only the traced leaf polygons count
POLYS = [   # the rosette's lowest leaves, hand-traced in the 2048 px hero
    [(400, 1600), (410, 1642), (525, 1652), (590, 1657), (730, 1647), (860, 1632), (870, 1600)],            # left leaves
    [(685, 1720), (695, 1680), (780, 1650), (860, 1612), (860, 1600), (1000, 1600), (1050, 1650), (1075, 1695),
     (1040, 1720), (970, 1732), (890, 1705), (800, 1715), (720, 1728)],                                     # front leaves
    [(1000, 1600), (1110, 1680), (1150, 1660), (1250, 1650), (1350, 1610), (1530, 1600), (1565, 1650), (1550, 1695),
     (1470, 1705), (1350, 1695), (1280, 1695), (1200, 1700), (1120, 1695), (1060, 1660)],                   # right leaves
    [(1000, 1600), (1530, 1600), (1400, 1640), (1250, 1660), (1110, 1695), (1050, 1660)],                     # dark stem base
]


def main():
    a8 = np.asarray(Image.open(SRC).convert('RGB')).astype(int)
    a = a8 / 255
    bg = np.median(a[:8].reshape(-1, 3), 0)
    m = np.linalg.norm(a - bg, axis=-1) > 0.10
    poly = Image.new('L', (a.shape[1], a.shape[0]), 0); d = ImageDraw.Draw(poly)
    for p in POLYS:
        d.polygon(p, fill=255)
    allow = np.asarray(poly) > 0; allow[:CUT] = True
    m &= allow
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.002 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 1500)[0] + 1)
    out = np.broadcast_to(bg, a.shape).copy(); out[m] = a[m]
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero_mask.png'))
    ys, xs = np.nonzero(m)
    print('views/hero.png written; bbox x %d-%d y %d-%d' % (xs.min(), xs.max(), ys.min(), ys.max()))


if __name__ == '__main__':
    main()
