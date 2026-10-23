"""Builds views/ (the scoring targets) from mj/feed-store-charming/.  usage: python make_views.py

The hero wins. Sheet views:
- view_front.png is the gable front (door, sign, sacks, scoop), labelled correctly: kept as `front`. Its roof is a
  steep ogee spire and its door arched, which the hero doesn't have, so it only guides the overall gable silhouette.
- view_side.png is not a side view: it is a 3/4 view of the door gable plus a window wall. Dropped.
- view_back.png is the plain eave wall seen square-on (a side view, not the back): kept as `side`.
- No back target.
The hero sits on a darker ground band that the harness mask keeps (the box nearly doubles in width), so below
the ground line (CUT) only what falls inside a hand-traced polygon around the sacks, door sill, scoop and
footing stones is kept (traced on the 1932 px preview, scaled by K). Then it is pasted on a flat backdrop.
"""
import os, shutil
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'feed-store-charming')
K = 2048 / 1932
CUT = 1490                      # preview px; above this the backdrop is clean
BASE = [(280, 1380), (1665, 1380), (1665, 1630), (1560, 1690), (1250, 1700), (985, 1702), (900, 1712),
        (838, 1700), (650, 1668), (470, 1676), (280, 1662)]


def hero():
    a = np.asarray(Image.open(os.path.join(MJ, 'hero.png')).convert('RGB')).astype(float) / 255
    bg = np.median(a[:8].reshape(-1, 3), 0)
    m = np.linalg.norm(a - bg, axis=-1) > 0.08
    poly = Image.new('L', (a.shape[1], a.shape[0]), 0)
    ImageDraw.Draw(poly).polygon([(x * K, y * K) for x, y in BASE], fill=255)
    allow = np.asarray(poly) > 0; allow[:int(CUT * K)] = True
    m &= allow
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.01 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 4000)[0] + 1)
    out = np.broadcast_to(bg, a.shape).copy()
    obj = a.copy(); near = np.linalg.norm(obj - bg, axis=-1) < 0.16
    obj[near] *= np.array([0.62, 0.72, 0.9])     # keep pale sack pixels from reading as backdrop/shadow
    out[m] = obj[m]
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    hero()
    shutil.copy(os.path.join(MJ, 'view_front.png'), os.path.join(HERE, 'views', 'view_front.png'))
    shutil.copy(os.path.join(MJ, 'view_back.png'), os.path.join(HERE, 'views', 'view_side.png'))
    import sys; sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
    import harness
    mm, _ = harness.target_mask(os.path.join(HERE, 'views', 'hero.png'))
    os.makedirs(os.path.join(HERE, 'r'), exist_ok=True)
    Image.fromarray((mm * 255).astype(np.uint8)).resize((512, 512)).save(os.path.join(HERE, 'r', 'target_mask_hero.png'))
    print('views written')
