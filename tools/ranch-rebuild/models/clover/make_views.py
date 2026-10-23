"""Builds views/hero.png and views/hero_mask.png (the only scoring target) from mj/clover/hero.png.  usage: python make_views.py

Art director's call: score on the hero alone (no turnaround). The hero's cast shadow falls to the right and in thin
strips under the front leaves. It is a desaturated grey-green (blue close to green), while the leaves are saturated
(blue well below green), so below SHADOW_Y every pixel with B/G above SHADOW_BG is dropped as shadow. Flowers (cream,
pink, also B/G high) all sit above SHADOW_Y except a few low heads, which are restored with the KEEP boxes.
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'clover', 'hero.png')
SHADOW_Y = 1080          # 2048 px hero rows; shadow keying starts here
SHADOW_BG = 0.74
KEEP = [(440, 1180, 560, 1280), (1310, 1330, 1410, 1420)]   # low pink heads (x0, y0, x1, y1)


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float) / 255
    bg = np.median(a[:8].reshape(-1, 3), 0)
    m = np.linalg.norm(a - bg, axis=-1) > 0.10
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    sh = (B / np.maximum(G, 1e-3) > SHADOW_BG) & (G > R * 0.9)
    sh[:SHADOW_Y] = False
    keep = np.zeros_like(m)
    for x0, y0, x1, y1 in KEEP:
        keep[y0:y1, x0:x1] = True
    m &= ~(sh & ~keep)
    m = ndimage.binary_opening(m, iterations=2)
    m = ndimage.binary_closing(m, iterations=3)
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
