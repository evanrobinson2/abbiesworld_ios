"""Builds views/hero.png and views/hero_mask.png (the only scoring target) from mj/bramble/hero.png.
usage: python make_views.py

Art director's call: the hero is the only target (no turnaround). The hero's cast shadow (olive-grey, spreading
right and under the trailing leaves) differs from the cream backdrop, so the harness mask would keep it. Here every
pixel that differs from the per-row backdrop is kept, then, below SHADOW_TOP, pixels with the shadow's hue (R ~ G,
neither leaf-green nor cane-brown, not dark berry) are dropped. Small specks are removed and small holes filled; the
big window of sky under the arch stays open.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'bramble', 'hero.png')
SHADOW_TOP = 1380      # rows above this (2048 px hero) hold no ground shadow
THRESH = 0.10


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float) / 255
    edge = np.concatenate([a[:, :6], a[:, -6:]], 1)
    rowbg = ndimage.median_filter(np.median(edge, 1), size=(25, 1))
    m = np.linalg.norm(a - rowbg[:, None], axis=-1) > THRESH
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    gr = G / np.maximum(R, 1e-3)
    shadow = (np.abs(gr - 0.95) < 0.09) & (R > 0.22)
    shadow[:SHADOW_TOP] = False
    m &= ~shadow
    m = ndimage.binary_opening(m, iterations=2)
    m = ndimage.binary_closing(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 600)[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 3000)[0] + 1)
    bg = np.median(a[:8].reshape(-1, 3), 0)
    out = np.broadcast_to(bg, a.shape).copy(); out[m] = a[m]
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero_mask.png'))
    ys, xs = np.where(m)
    print('bbox x %d-%d y %d-%d aspect %.3f' % (xs.min(), xs.max(), ys.min(), ys.max(), (np.ptp(ys) + 1) / (np.ptp(xs) + 1)))


if __name__ == '__main__':
    main()
