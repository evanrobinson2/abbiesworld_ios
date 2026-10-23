"""Clean silhouette targets for scoring, written to views/ as a dark silhouette on the harness backdrop.

The harness mask keeps the hero's warm brown cast shadow (it shifts hue, so the harness shadow rule misses it) and
the sheet's soil mounds. Here: the backdrop is estimated per row from the right edge only (the hero's shadow runs
off the left edge), light hue-shifted pixels near the ground are dropped, a small closing joins the leaf pieces,
the largest connected parts are kept, and everything below the stem bases is cut away.
usage: python make_views.py
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'hazel-charming')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

# per view: base row of the trunk as a fraction of the image height (ground and shadow below it are cut)
BASE = {'hero': 0.925, 'view_front': 0.905, 'view_side': 0.905, 'view_back': 0.905}
THRESH = 0.045


def key(path, base):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float) / 255
    h = a.shape[0]
    edge = a[:, -6:]   # right edge only: the hero's shadow runs off the left edge
    rowbg = ndimage.median_filter(np.median(edge, 1), size=(25, 1))
    d = np.linalg.norm(a - rowbg[:, None], axis=-1)
    m = d > THRESH
    # drop cast shadows (backdrop darkened without a hue shift), as the harness does
    r = a / np.maximum(rowbg[:, None], 1e-3); lum = r.mean(-1)
    # only near the ground: higher up, the grey-white bark would be taken for shadow
    sh = (lum > 0.35) & (lum < 0.97) & (r.std(-1) / np.maximum(lum, 1e-3) < 0.035); sh[:int((base - 0.02) * h)] = False
    m &= ~sh
    m[int(base * h):] = False
    if 'hero' in os.path.basename(path):
        # the hero's backdrop darkens towards the lower left: below the litter line keep only the litter's span
        w = a.shape[1]; low = int(0.885 * h)
        m[low:, :int(0.31 * w)] = False; m[low:, int(0.74 * w):] = False
    # the hero's warm cast shadow (brown, hue-shifted, so the rule above misses it): light, R > G, near the ground
    R, G = a[..., 0], a[..., 1]
    warm = (R > 0.62) & (G / np.maximum(R, 1e-3) < 0.97); warm[:int(0.8 * h)] = False
    m &= ~warm
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
    for name, base in BASE.items():
        m = key(os.path.join(MJ, f'{name}.png'), base)
        out = np.empty(m.shape + (3,), np.uint8); out[:] = bg.astype(np.uint8); out[m] = (40, 60, 30)
        Image.fromarray(out).save(os.path.join(HERE, 'views', f'{name}.png'))
        print(name, 'aspect %.3f' % harness.aspect(m))


if __name__ == '__main__':
    main()
