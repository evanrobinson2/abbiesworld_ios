"""Builds views/hero.png and views/hero_mask.png (the only scoring target) from mj/clover-charming/hero.png.
usage: python make_views.py

The hero is the only target (plant: no turnaround). Its cast shadow falls to the left and under the front leaves.
It is a darkened cream/olive (red at or above green), while every leaf is green-dominant, so below SHADOW_Y every
pixel with G < SHADOW_GR * R is dropped as shadow. The cream-pink heads (also red-dominant) all sit above SHADOW_Y
except the lowest one, which is restored with a KEEP box.
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'clover-charming', 'hero.png')
SHADOW_Y = 1380          # 2048 px hero rows; shadow keying starts here
SHADOW_GR = 1.02
KEEP = [(790, 1290, 990, 1450)]   # lowest head (x0, y0, x1, y1)


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float) / 255
    bg = np.median(a[:8].reshape(-1, 3), 0)
    m = np.linalg.norm(a - bg, axis=-1) > 0.10
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    sh = G < SHADOW_GR * R
    sh[:SHADOW_Y] = False
    keep = np.zeros_like(m)
    for x0, y0, x1, y1 in KEEP:
        keep[y0:y1, x0:x1] = True
    m &= ~(sh & ~keep)
    m = ndimage.binary_opening(m, iterations=2)
    m = ndimage.binary_closing(m, iterations=3)
    top = ndimage.binary_closing(m, iterations=12)   # the heads' near-white highlights fall inside the cream key
    m[:SHADOW_Y] = top[:SHADOW_Y]
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.02 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 3000)[0] + 1)
    out = np.broadcast_to(bg, a.shape).copy(); out[m] = a[m]
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero_mask.png'))
    ys, xs = np.nonzero(m)
    print('bbox x %d-%d y %d-%d' % (xs.min(), xs.max(), ys.min(), ys.max()))
    print('views/hero.png written')


if __name__ == '__main__':
    main()
