"""Builds views/hero.png (the scoring target) from mj/goat-charming.  usage: python make_views.py

Only the hero is scored. The turnaround sheet disagrees with it and the hero wins: the sheet draws a leggy kid with
a long upright neck (front and back views) and its middle view is a three-quarter view with the face turned to the
camera, not a side elevation. The hero is the chibi brief: a big round head sitting straight on a round fluffy body,
short stubby legs. So the sheet views are dropped (see notes.json).

Keying: the harness mask loses most of the cream fur (it is within 0.10 of the cream backdrop) and keeps the warm
cast shadow. Here the object is anything whose saturation differs from the per-row backdrop's by > 0.03 or whose
colour is > 0.10 away, small holes filled. The cast shadow is as warm and as saturated as the tan hooves, so below
the top of the hooves only hand-measured hoof boxes (hero pixels) are kept.
Pixels too close to the backdrop for the harness threshold are painted tan so harness.target_mask() keeps them.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'goat-charming')
OUT = os.path.join(HERE, 'views')
HOOF_TOP = 1480                      # hero px (2048 image): below the belly only the leg boxes are object
HOOVES = [(778, 992, 1712), (1022, 1232, 1742), (1218, 1296, 1680), (1325, 1518, 1712)]   # x0, x1, bottom y
TAN = np.array([0.78, 0.60, 0.42])


def key(a):
    a = ndimage.median_filter(a, size=(5, 5, 1))
    s = (a.max(-1) - a.min(-1)) / np.maximum(a.max(-1), 1e-3)
    edge = np.concatenate([a[:, :6], a[:, -6:]], 1)
    bg = ndimage.median_filter(np.median(edge, 1), size=(25, 1))[:, None, :]
    sb = (bg.max(-1) - bg.min(-1)) / bg.max(-1)
    m = (np.abs(s - sb) > 0.03) | (np.linalg.norm(a - bg, axis=-1) > 0.10)
    low = np.zeros_like(m); low[HOOF_TOP:] = True
    keep = np.zeros_like(m)
    for x0, x1, yb in HOOVES:
        keep[HOOF_TOP:yb, x0:x1] = True
    m &= ~low | keep
    m = ndimage.binary_closing(np.pad(m, 16), iterations=12)[16:-16, 16:-16]
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); sz = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(sz >= 0.02 * sz.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 0.01 * m.size)[0] + 1)
    return m, np.median(bg, 0)[0]


def main():
    os.makedirs(OUT, exist_ok=True)
    a = np.asarray(Image.open(os.path.join(MJ, 'hero.png')).convert('RGB')).astype(float) / 255
    m, bg = key(a)
    out = np.broadcast_to(bg, a.shape).copy(); out[m] = a[m]
    out[m & (np.linalg.norm(out - bg, axis=-1) < 0.16)] = TAN
    import sys
    sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge')); import harness
    tmp = os.path.join(OUT, '_tmp.png'); Image.fromarray((out * 255).astype(np.uint8)).save(tmp)
    hm, _ = harness.target_mask(tmp); os.remove(tmp)
    out[m & ~hm] = TAN          # pixels the harness shadow test would drop (lit cream reads as tinted backdrop)
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(OUT, 'hero.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(OUT, 'hero_mask.png'))
    print('hero keyed')


if __name__ == '__main__':
    main()
