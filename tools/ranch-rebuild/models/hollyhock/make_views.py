"""Builds views/hero.png and views/hero_mask.png (the only scoring target) from mj/hollyhock/hero.png.
usage: python make_views.py

Art director's call: score on the hero alone (no turnaround). The hero has a long grey-green cast shadow running off
to the left along the ground, and a warm contact shadow under the leaves. Keyed here: everything that differs from the
cream backdrop, minus low-saturation (grey) pixels near the ground (the cast shadow; leaves and petals are saturated),
cut below the lowest leaf tip (BASE row), then the largest connected parts are kept and small holes filled.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'hollyhock', 'hero.png')
GROUND = 1740     # below this row the cast shadow lies on the ground
BASE = 1945       # lowest leaf tip; the contact shadow is below
SAT_MIN = 0.28


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float) / 255
    bg = np.median(a[:8].reshape(-1, 3), 0)
    m = np.linalg.norm(a - bg, axis=-1) > 0.10
    mx = a.max(-1); sat = (mx - a.min(-1)) / np.maximum(mx, 1e-3)
    grey = sat < SAT_MIN; grey[:GROUND] = False
    m &= ~grey
    m[BASE:] = False
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.01 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 1500)[0] + 1)
    out = np.broadcast_to(bg, a.shape).copy(); out[m] = a[m]
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero_mask.png'))
    ys, xs = np.where(m)
    print('views/hero.png written; bbox rows %d-%d cols %d-%d, aspect %.2f' % (ys.min(), ys.max(), xs.min(), xs.max(),
          (np.ptp(ys) + 1) / (np.ptp(xs) + 1)))


if __name__ == '__main__':
    main()
