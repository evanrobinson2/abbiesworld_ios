"""Builds views/ (the scoring targets) from mj/barn-shelter.  usage: python make_views.py

The hero and the turnaround agree on this barn, so all three sheet views are scored:
  view_front.png = mj view_front (the gable end with the doorway). The ground band is cut at the stone base and the
                   lumber pile / clutter the sheet drew beside the corners (not in the hero) is clipped to the footing.
  view_side.png  = mj view_side as is (ground cut). It is not orthographic side-on: it is a 3/4 view from the front
                   right (doorway on the left, the +X long side on the right), so check.py renders the model from
                   that direction (SIDE_YAW) instead of the harness's side camera.
  view_back.png  = mj view_back (the closed back gable), ground cut and the lumber at its left foot clipped.
  hero.png       = mj hero with the cast-shadow streak on the ground at its left foot removed.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'barn-shelter')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402

GROUND = 1370                     # sheet: bottom of the stone base (same row in all three views)
CLIP = {'front': (130, 828, 1180), 'side': (60, 1068, 1180), 'back': (74, 717, 1180)}   # x span kept below row


def clean(m):
    m = ndimage.binary_fill_holes(m)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    return lab == (np.argmax(s) + 1)


def write(mask, a, path):
    bg = np.median(a[:6].reshape(-1, 3), 0)
    obj = a.copy()
    # keep every object pixel clearly off the backdrop (and not shadow-like), so the harness re-reads the same mask
    r = obj / np.maximum(bg, 1e-3); lum = r.mean(-1)
    weak = (np.linalg.norm(obj - bg, axis=-1) < 0.16) | ((lum < 0.97) & (r.std(-1) / np.maximum(lum, 1e-3) < 0.05))
    obj[weak] = obj[weak] * np.array([0.7, 0.62, 0.66])
    out = np.ones_like(a) * bg; out[mask] = obj[mask]
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(path)


def sheet(v):
    m, a = harness.target_mask(os.path.join(MJ, f'view_{v}.png'))
    m[GROUND:] = False
    x0, x1, y = CLIP[v]; m[y:, :x0] = False; m[y:, x1:] = False
    write(clean(m), a, os.path.join(HERE, 'views', f'view_{v}.png'))


def hero():
    m, a = harness.target_mask(os.path.join(MJ, 'hero.png'))
    m[1555:, :265] = False        # shadow streak on the ground left of the building
    m[1640:] = False              # ground litter below the footing
    write(clean(m), a, os.path.join(HERE, 'views', 'hero.png'))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    for v in ('front', 'side', 'back'):
        sheet(v)
    hero()
    print('views written')
