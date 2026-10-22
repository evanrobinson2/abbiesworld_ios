"""Builds views/ (the scoring targets) from mj/hay-rack.  usage: python make_views.py

The art director's call: the hero wins. It shows a V-shaped feeder (about 1.3 x 0.9 x 0.95 m) heaped with hay.
The turnaround sheet drew a different, box-shaped rack with X-bracing, so it is used only for end proportions.
  hero.png       = mj hero keyed on B/G < 0.60 (timber and hay are saturated orange/gold; the cream backdrop and most
                   of the cast shadow are not), the floor shadow between the near legs cut away, then closed, hole-filled and opened and pasted on a flat
                   backdrop. Scored by hero_check.py: this is the score that counts.
  view_front.png = mj view_front.png (split.py's left cut): a straight-on long side of the box rack. Scored for
                   reference only; the box shape is not a target.
  view_side/back from split.py are dropped (a 3/4 view and a second long side of the same box rack).
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'hay-rack')


def key(path, close=12, floor_box=None):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    R, G, B = a[..., 0] + 1, a[..., 1] + 1, a[..., 2] + 1
    m = B / G < 0.60                     # timber and hay are far more saturated than the cream backdrop
    if floor_box:                        # the floor shadow seen under the rack between the two near legs
        x0, x1, y0 = floor_box
        m[y0:, x0:x1] = False
    m = ndimage.binary_fill_holes(ndimage.binary_closing(np.pad(m, 40), iterations=close)[40:-40, 40:-40])
    m = ndimage.binary_opening(m, iterations=6)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(s) + 1)
    out = np.empty_like(a); out[:] = (246, 226, 192); out[m] = a[m]
    return Image.fromarray(out.astype(np.uint8))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    key(os.path.join(MJ, 'hero.png'), floor_box=(560, 1130, 1268)).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.open(os.path.join(MJ, 'view_front.png')).save(os.path.join(HERE, 'views', 'view_front.png'))
    print('views written')
