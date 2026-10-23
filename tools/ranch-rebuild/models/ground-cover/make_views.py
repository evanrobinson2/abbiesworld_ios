"""Cuts the 9 ground-cover pieces out of mj/ground-cover/sheet.png and keys a silhouette mask for each.
usage: python make_views.py      (writes views/<piece>.png and views/<piece>_mask.png)

The sheet's cast shadows fall to the left of each piece and are a pale green (blue/green about 0.75, light), while the
grass itself is darker and more saturated (blue/green 0.35 to 0.65). Pixels that are light AND low-saturation-ish
(B/G above SHADOW_BG and mean between SHADOW_L and 0.80, so the cream-white clover heads stay) are dropped as shadow. Boxes are in the sheet's 2912 x 1632 pixels.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'ground-cover', 'sheet.png')
S = 1.456   # boxes below are read off the sheet at 2000 px wide
BOX = {  # (x0, y0, x1, y1) at 2000 px wide
    'tuft-a': (285, 280, 670, 510),
    'tuft-b': (700, 365, 905, 510),
    'tuft-c': (940, 360, 1190, 505),
    'tuft-d': (1230, 250, 1620, 510),
    'tuft-e': (1655, 345, 1880, 500),
    'tuft-f': (30, 505, 490, 750),
    'clover-patch': (495, 560, 1020, 770),
    'wildflower-clump': (1060, 545, 1392, 750),
    'path-edge': (1375, 620, 1945, 760),
}
SHADOW_BG, SHADOW_L = 0.70, 0.55


def mask(a, bg):
    m = np.linalg.norm(a - bg, axis=-1) > 0.10
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    sh = (B / np.maximum(G, 1e-3) > SHADOW_BG) & (a.mean(-1) > SHADOW_L) & (a.mean(-1) < 0.80) & (G >= R * 0.97)
    m &= ~sh
    m = ndimage.binary_opening(m, iterations=1)
    m = ndimage.binary_closing(m, iterations=2)
    lab, k = ndimage.label(m)
    if k:
        s = ndimage.sum(m, lab, range(1, k + 1)); m = np.isin(lab, np.where(s >= 0.03 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 400)[0] + 1)
    return m


def main():
    im = Image.open(SRC).convert('RGB'); A = np.asarray(im).astype(float) / 255
    bg = np.median(A[:10].reshape(-1, 3), 0)
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    for name, b in BOX.items():
        x0, y0, x1, y1 = [int(v * S) for v in b]
        a = A[y0:y1, x0:x1]; m = mask(a, bg)
        Image.fromarray((a * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', name + '.png'))
        Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', name + '_mask.png'))
        ys, xs = np.nonzero(m)
        print('%-17s mask %4d x %4d px (w/h %.2f)' % (name, np.ptp(xs) + 1, np.ptp(ys) + 1, (np.ptp(xs) + 1) / (np.ptp(ys) + 1)))


if __name__ == '__main__':
    main()
