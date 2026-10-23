"""Builds views/hero.png (the only scoring target) from mj/goat-shelter-charming/hero.png.  usage: python make_views.py

Art director's rule: the hero wins. The turnaround sheet drew a different shelter: a brown plank base under the whole
house, a gabled porch canopy over a centred door, the ramp on the long side and no side platform. Its views are kept
in mj/ for reference (roof pitch, wall taper) but are not scored.

The harness mask keeps the hero's dark contact shadow under the stilts and the platform (it is dark brown and passes
the distance test), so the object is keyed by hue instead: pink (G/R < 0.80) or teal / blue-black (B/R > 0.85).
The warm cream backdrop and its shadows (G/R 0.80-0.98, B/R < 0.85) drop out. Then opened, closed, the largest
piece kept, small holes filled, and pasted on a flat backdrop. Scored by hero_check.py.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'goat-shelter-charming', 'hero.png')


def hero():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
    R, G, B = a[..., 0] + 1, a[..., 1] + 1, a[..., 2] + 1
    m = (G / R < 0.80) | (B / R > 0.85)
    m = ndimage.binary_opening(m, iterations=2)
    m = ndimage.binary_closing(m, iterations=4)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(s) + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 6000)[0] + 1)
    out = np.empty_like(a); out[:] = (246, 226, 192); out[m] = a[m]
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    Image.fromarray(out.astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))


if __name__ == '__main__':
    hero()
    print('views written')
