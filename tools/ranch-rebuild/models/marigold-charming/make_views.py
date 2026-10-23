"""Builds views/hero.png (the only scoring target) from mj/marigold-charming/hero.png.  usage: python make_views.py

Hero only (plant group, no turnaround). The hero's cast shadow falls to the lower LEFT and is a grey-tan
(blue channel well above the leaves' and petals', darker than the cream backdrop), so below SHADOW_Y pixels with
B > SHADOW_B and not near-backdrop are dropped; leaves (B < 100) and petals (B < 70) are kept. Below CONTACT_Y the brown contact shadow under the
rosette (R > G + 18; the leaves there are green, G >= R) is dropped too. Then a small opening,
the main parts are kept, small holes are filled, and the silhouette is pasted on the harness backdrop.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'marigold-charming', 'hero.png')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

SHADOW_Y = 1100     # shadow zone (2048 px hero): below this
SHADOW_B = 104
CONTACT_Y = 1540    # below this, warm brown (R > G + 18) is contact shadow
THRESH = 0.12


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
    bg = np.median(a[:40].reshape(-1, 3), 0)
    m = np.linalg.norm(a - bg, axis=-1) / 255 > THRESH
    B = a[..., 2]
    sh = B > SHADOW_B
    sh[:SHADOW_Y] = False
    low = a[..., 0] > a[..., 1] + 18                     # brown contact shadow under the rosette (leaves there are G >= R)
    low[:CONTACT_Y] = False
    sh |= low
    m &= ~sh
    m = ndimage.binary_opening(m, iterations=3)
    m = ndimage.binary_closing(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.02 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 1500)[0] + 1)
    out = np.empty(a.shape, np.uint8); out[:] = (np.array(harness.BG) * 255).astype(np.uint8); out[m] = a[m].astype(np.uint8)
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    Image.fromarray(out).save(os.path.join(HERE, 'views', 'hero.png'))
    print('views/hero.png aspect %.3f' % harness.aspect(m))


if __name__ == '__main__':
    main()
