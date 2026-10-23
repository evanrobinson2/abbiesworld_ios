"""Builds views/hero.png (the only scoring target) from mj/borage-charming/hero.png.  usage: python make_views.py

There is no turnaround, so the hero is the only target. Its cast shadow is the cream backdrop darkened (red above
green), which the harness mask would keep; every part of the plant (green leaves, blue stars, olive stems) has green
above red. So: keep what differs from the backdrop AND has G > R, then a small opening, the largest parts kept,
small holes filled, pasted on the backdrop colour.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'borage-charming', 'hero.png')


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(int) / 255
    bg = np.median(a[:8].reshape(-1, 3), 0)
    m = (np.linalg.norm(a - bg, axis=-1) > 0.10) & (a[..., 1] - a[..., 0] > 0.0)
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
