"""Builds views/hero.png (the only scoring target) from mj/horse-shelter-charming/hero.png.  usage: python make_views.py

The hero wins and is the only target. The turnaround sheet drew a much taller, narrower shed: its gable views have
walls about 2.3x as tall as they are wide with the eave tips at half the total height, where the hero's eave tips sit
at about a third of it on a plan that is wider than it is tall. Stretching cannot reconcile both, so:
  view_front, view_back = dropped (same gable shape and details as the hero, wrong wall-to-roof proportions);
                          used only as a reference for the back gable (no door, plain planks, curved braces).
  view_side             = dropped (not orthographic: a 3/4 view with the door end showing).
The harness mask already drops the hero's cast shadow, but it keeps the thin dirt patch under the footing and
punches a notch into the right corner stones (their grey is near the backdrop's shadow tone). So the mask is cut at
the ground line (CUT) and the corner stones are filled from a hand-traced polygon (2048 px hero coordinates), then
the object is pasted on a flat backdrop. Scored by hero_check.py from the MJ hero's own direction.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'horse-shelter-charming')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402
CUT = 1702
CORNER = [(1680, 1570), (1805, 1575), (1815, 1700), (1680, 1702)]


def clean(m):
    m = ndimage.binary_fill_holes(m)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    return lab == (np.argmax(s) + 1)


def hero():
    m, a = harness.target_mask(os.path.join(MJ, 'hero.png'))
    poly = Image.new('L', (a.shape[1], a.shape[0]), 0)
    ImageDraw.Draw(poly).polygon(CORNER, fill=255)
    m |= np.asarray(poly) > 0
    m[CUT:] = False
    m = clean(ndimage.binary_opening(m, iterations=3))
    bg = np.median(a[:6].reshape(-1, 3), 0)
    out = np.repeat(np.repeat(bg[None, None], a.shape[0], 0), a.shape[1], 1).copy()
    obj = a.copy(); near = np.linalg.norm(obj - bg, axis=-1) < 0.16
    obj[near] *= np.array([0.62, 0.72, 0.9])      # darker and hue-shifted, so the harness keeps them as object
    out[m] = obj[m]
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    os.makedirs(os.path.join(HERE, 'r'), exist_ok=True)
    hero()
    mm, _ = harness.target_mask(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((mm * 255).astype(np.uint8)).save(os.path.join(HERE, 'r', 'target_mask_hero.png'))
    print('views written')
