"""Clean silhouette targets for scoring, written to views/ as a dark silhouette on the harness backdrop.

The harness mask drops most of the white birch trunk (white bark on a cream backdrop is under its 0.10 colour
threshold, and the thin remains are removed by its opening/size filter), and keeps a strip of ground and cast
shadow at the base. Here: a lower colour threshold, a small closing to join the trunk pieces, the largest
connected parts only, and everything below the trunk base cut away.
usage: python make_views.py
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'birch')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

# per view: base row of the trunk as a fraction of the image height (ground and shadow below it are cut)
BASE = {'hero': 0.900, 'view_front': 0.926, 'view_side': 0.918, 'view_back': 0.926}
THRESH = 0.045


def key(path, base):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float) / 255
    h = a.shape[0]
    edge = np.concatenate([a[:, :6], a[:, -6:]], 1); rowbg = ndimage.median_filter(np.median(edge, 1), size=(25, 1))
    d = np.linalg.norm(a - rowbg[:, None], axis=-1)
    m = d > THRESH
    # drop cast shadows (backdrop darkened without a hue shift), as the harness does
    r = a / np.maximum(rowbg[:, None], 1e-3); lum = r.mean(-1)
    # only near the ground: higher up, the grey-white bark would be taken for shadow
    sh = (lum > 0.35) & (lum < 0.97) & (r.std(-1) / np.maximum(lum, 1e-3) < 0.035); sh[:int((base - 0.02) * h)] = False
    m &= ~sh
    m[int(base * h):] = False
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
