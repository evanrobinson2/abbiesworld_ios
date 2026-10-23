"""Builds views/ (the scoring targets) from mj/hay-rack-charming.  usage: python make_views.py

The art director's call: the hero wins. It shows a chubby box crib (fat top and lower rims with log ends, corner
posts with caps, leaning slats, walls flaring out to the top, four stubby splayed legs) heaped with a hay pillow.
  hero.png       = mj hero keyed on B/G < 0.60 (timber and hay are saturated orange/gold; the cream backdrop is not).
                   The mask also keeps the warm cast shadow under the crib, so below the lower rim (the polyline CUT)
                   only what falls inside hand-traced leg polygons is kept (coordinates in the 2048 px hero), as in
                   models/potting-bench/make_views.py. Then closed, hole-filled, opened and pasted on a flat backdrop.
                   Scored by hero_check.py: this is the score that counts.
  view_front.png = mj view_front.png (split.py's left cut): a straight-on long side. Scored for reference only: the
                   sheet's crib is taller and boxier, with straight walls and straight legs.
  view_side/back are dropped (a 3/4 view and a second long side of the same crib).
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'hay-rack-charming')
CUT = [(0, 1235), (350, 1235), (560, 1295), (900, 1392), (1050, 1385), (1400, 1285), (1700, 1195), (2048, 1195)]
LEGS = [
    [(395, 1225), (565, 1255), (545, 1400), (525, 1465), (430, 1478), (372, 1445)],      # left leg
    [(892, 1370), (1068, 1370), (1072, 1620), (1000, 1648), (905, 1630)],                 # front leg
    [(1478, 1205), (1665, 1190), (1672, 1405), (1600, 1438), (1515, 1428)],               # right leg
]


def key(path):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float)
    R, G, B = a[..., 0] + 1, a[..., 1] + 1, a[..., 2] + 1
    m = B / G < 0.60
    allow = Image.new('L', (a.shape[1], a.shape[0]), 0); d = ImageDraw.Draw(allow)
    d.polygon([(0, 0), (2048, 0)] + CUT[::-1], fill=255)
    for p in LEGS:
        d.polygon(p, fill=255)
    m &= np.asarray(allow) > 0
    m = ndimage.binary_fill_holes(ndimage.binary_closing(np.pad(m, 40), iterations=10)[40:-40, 40:-40])
    m = ndimage.binary_opening(m, iterations=5)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(s) + 1)
    out = np.empty_like(a); out[:] = (246, 226, 192); out[m] = a[m]
    return Image.fromarray(out.astype(np.uint8))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    key(os.path.join(MJ, 'hero.png')).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.open(os.path.join(MJ, 'view_front.png')).save(os.path.join(HERE, 'views', 'view_front.png'))
    print('views written')
