"""Builds views/hero.png (the only scoring target) from mj/coneflower-charming/hero.png.  usage: python make_views.py

Art director's call: score on the hero alone (no turnaround was made). The charming hero's cast shadow runs off to the
lower left; it is a grey tan (B/R ~0.73, G/R ~0.92), while the leaves there are olive (B/R under 0.5) and petals pink
(G/R ~0.6). So in the lower-left zone, pixels with B/R > 0.6 and 0.8 < G/R < 0.97 are dropped. Then a small opening and
closing, the main parts are kept, small holes are filled, and the silhouette is pasted on the harness backdrop.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'coneflower-charming', 'hero.png')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

SHADOW_Y, SHADOW_X = 1150, 900      # shadow zone (2048 px hero): below and left of these
THRESH = 0.13


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
    bg = np.median(a[:40].reshape(-1, 3), 0)
    m = np.linalg.norm(a - bg, axis=-1) / 255 > THRESH
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    lum = (R + G + B) / 3
    sh = (B / np.maximum(R, 1) > 0.6) & (G / np.maximum(R, 1) < 0.97) & (G / np.maximum(R, 1) > 0.8)   # grey-tan shadow, not olive leaf or pink petal
    sh[:SHADOW_Y] = False; sh[:, SHADOW_X:] = False
    m &= ~sh
    m = ndimage.binary_opening(m, iterations=2)
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
