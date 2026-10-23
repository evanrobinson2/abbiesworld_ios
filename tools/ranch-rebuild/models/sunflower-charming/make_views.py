"""Clean hero silhouette for scoring, written to views/hero.png as a dark silhouette on the harness backdrop.

The charming sunflower has no turnaround, so only the hero is keyed. The backdrop is estimated per row from both edges;
the warm cast shadow that runs off to the left along the ground is dropped (below 80 % of the height only green-above-red
pixels in a band round the stalk are kept), and everything below the stalk foot is cut.
usage: python make_views.py
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'sunflower-charming')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

BASE = 0.955      # bottom of the stalk (no dirt patch in the charming hero), as a fraction of the image height
THRESH = 0.06


def key(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float) / 255
    h, w = a.shape[:2]
    edge = np.concatenate([a[:, :6], a[:, -6:]], 1)
    rowbg = ndimage.median_filter(np.median(edge, 1), size=(25, 1))
    d = np.linalg.norm(a - rowbg[:, None], axis=-1)
    m = d > THRESH
    # near the ground keep only the stem and the patch: a column band round the plant, and saturated (brown/green) pixels
    g0 = int(0.80 * h)
    green = a[..., 2] < 0.25                        # the stalk is olive with almost no blue; the tan cast shadow has plenty
    band = np.zeros_like(m); band[:, int(0.44 * w):int(0.56 * w)] = True
    m[g0:] &= (green & band)[g0:]
    m[int(BASE * h):] = False
    m = ndimage.binary_closing(m, iterations=2)
    m = ndimage.binary_opening(m, iterations=1)
    lab, k = ndimage.label(m)
    if k:
        s = ndimage.sum(m, lab, range(1, k + 1)); m = np.isin(lab, np.where(s >= 0.01 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m
    hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 0.002 * m.size)[0] + 1)
    return m


def main():
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    bg = np.array(harness.BG) * 255
    m = key(os.path.join(MJ, 'hero.png'))
    out = np.empty(m.shape + (3,), np.uint8); out[:] = bg.astype(np.uint8); out[m] = (40, 60, 30)
    Image.fromarray(out).save(os.path.join(HERE, 'views', 'hero.png'))
    ys, xs = np.where(m)
    print('hero aspect %.3f' % harness.aspect(m), 'bbox x', xs.min(), xs.max(), 'y', ys.min(), ys.max())


if __name__ == '__main__':
    main()
