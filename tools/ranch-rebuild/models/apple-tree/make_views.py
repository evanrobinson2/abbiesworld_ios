"""Builds views/ (the scoring targets) from mj/apple-tree.  usage: python make_views.py

The harness target mask keeps the long warm cast shadow and the painted ground strip (in the sheet it runs the
whole width of each view and merges with the shadows), so each sheet target is cut at the row where the trunk meets
the ground pad (CUT, found from the mask's row widths). In the hero the small grass pad stands clear of the shadow
except at the shadow's right end, so below CUT only the pad's columns (PAD) are kept. The model's grass tuft is low and narrow, so it adds
nothing above that line either. Everything else is the harness mask (largest parts, small holes filled).
The three sheet views are used as labelled: they are three drawings of one kind of tree, each with its own lean,
not true orthographic views of one tree, so no view can be matched exactly; the hero wins.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'apple-tree')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402

CUT = {'hero': 1735, 'view_front': 1335, 'view_side': 1335, 'view_back': 1330}
PAD = (805, 1175)          # hero grass pad columns below CUT
BG = (246, 236, 214)


def make(name):
    m, a = harness.target_mask(os.path.join(MJ, name + '.png'))
    if name == 'hero':          # the hero's grass pad overlaps the shadow's right end: keep only the pad's columns
        m[CUT[name]:, :PAD[0]] = False; m[CUT[name]:, PAD[1]:] = False
    else:
        m[CUT[name]:] = False
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.02 * s.max())[0] + 1)
    out = np.empty_like(a); out[:] = np.array(BG) / 255; out[m] = a[m]
    out[m & (np.linalg.norm(a - np.array(BG) / 255, axis=-1) < 0.16)] *= 0.75   # keep pale leaf tips inside the mask
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', name + '.png'))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    for n in CUT:
        make(n)
    print('views written')
