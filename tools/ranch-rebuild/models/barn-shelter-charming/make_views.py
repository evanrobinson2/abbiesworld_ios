"""Builds views/ (the scoring targets) from mj/barn-shelter-charming.  usage: python make_views.py

  hero.png       = mj hero. The harness mask keeps the cast shadow and ground litter at the left foot and under the
                   doorway, and loses the grey footing stones on the right (too close to the backdrop), so the mask
                   is cut below the footing line and the footing band is filled back in.
  view_gable.png = mj view_side (the sheet's middle view): a clean gable elevation with the hayloft, scored against
                   the orthographic back gable (it is the one gable of this barn with no door or big windows).
Dropped: mj view_front (a 3/4 view, door in the gable end, contradicts the hero's door on the long side) and
mj view_back (a 3/4 view with a lean-to roof the hero doesn't have).
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'barn-shelter-charming')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402

# footing line (x, y) in hero pixels: the bottom of the stones / door leaf / corner posts on the ground
FOOT = [(258, 1732), (512, 1808), (1060, 1800), (1434, 1808), (1700, 1745), (1762, 1735)]


def clean(m):
    m = ndimage.binary_fill_holes(m)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    return lab == (np.argmax(s) + 1)


def write(mask, a, path):
    bg = np.median(a[:6].reshape(-1, 3), 0)
    obj = a.copy()
    r = obj / np.maximum(bg, 1e-3); lum = r.mean(-1)
    weak = (np.linalg.norm(obj - bg, axis=-1) < 0.16) | ((lum < 0.97) & (r.std(-1) / np.maximum(lum, 1e-3) < 0.05))
    obj[weak] = obj[weak] * np.array([0.7, 0.62, 0.66])
    out = np.ones_like(a) * bg; out[mask] = obj[mask]
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(path)


def hero():
    m, a = harness.target_mask(os.path.join(MJ, 'hero.png'))
    xs = np.arange(m.shape[1]); fx, fy = zip(*FOOT)
    yline = np.interp(xs, fx, fy)
    rows = np.arange(m.shape[0])[:, None]
    inside = (xs[None] >= FOOT[0][0]) & (xs[None] <= FOOT[-1][0])
    m &= ~((rows > 1600) & ~inside)          # shadow / grass / pebbles beside the footing
    m &= ~(rows > yline[None])               # ground below the footing line
    m |= (rows > 1560) & (rows <= yline[None]) & inside   # the footing band (stones read as backdrop)
    write(clean(m), a, os.path.join(HERE, 'views', 'hero.png'))


def gable():
    m, a = harness.target_mask(os.path.join(MJ, 'view_side.png'))
    m[1385:] = False                         # ground band under the stones
    write(clean(m), a, os.path.join(HERE, 'views', 'view_gable.png'))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    hero(); gable()
    print('views written')
