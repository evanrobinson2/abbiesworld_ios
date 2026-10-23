"""Builds views/hero.png (the only scoring target) from mj/goldenrod-charming/hero.png.  usage: python make_views.py

Art director's call: score on the hero alone (no turnaround). The hero has a long tan cast shadow running off to the
left along the ground, which the harness mask keeps (it is warm, so the hue-shift rule misses it). Here the hero is
keyed against its cream backdrop, and below GROUND (the top of the shadow) everything left of the plant's foot (SHADOW_X)
and everything shadow-like (the backdrop darkened with no big change of hue, not dark) is dropped; below GROUND only green
(leaf) pixels are kept, since the charming hero's shadow is a darker warm tan the hue rule misses. Small specks are
removed, small holes filled, and the silhouette is pasted on the harness backdrop. Scored by hero_check.py.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'goldenrod-charming', 'hero.png')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness
GROUND, SHADOW_X, BOTTOM = 1715, 700, 1870   # rows/cols in the 2048 px hero


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float) / 255
    h, w, _ = a.shape
    rowbg = ndimage.median_filter(np.median(a[:, -8:], 1), size=(25, 1))
    m = np.linalg.norm(a - rowbg[:, None], axis=-1) > 0.10
    r = a / np.maximum(rowbg[:, None], 1e-3); lum = r.mean(-1)
    shadow = (lum > 0.55) & (r.std(-1) / np.maximum(lum, 1e-3) < 0.10)
    shadow[:GROUND] = False
    m &= ~shadow
    m[GROUND:, :SHADOW_X] = False
    leafy = a[..., 1] > a[..., 0] * 0.92          # below the ground line only the green leaves count; the tan shadow is red > green
    m[GROUND:] &= leafy[GROUND:]
    m[BOTTOM:] = False
    m = ndimage.binary_closing(m, iterations=2)
    m = ndimage.binary_opening(m, iterations=1)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.01 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 0.002 * m.size)[0] + 1)
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    out = np.empty(m.shape + (3,), np.uint8); out[:] = (np.array(harness.BG) * 255).astype(np.uint8); out[m] = (60, 60, 20)
    Image.fromarray(out).save(os.path.join(HERE, 'views', 'hero.png'))
    ys, xs = np.where(m)
    print('views/hero.png written, aspect %.3f, bbox x %d-%d y %d-%d' % (harness.aspect(m), xs.min(), xs.max(), ys.min(), ys.max()))


if __name__ == '__main__':
    main()
