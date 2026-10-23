"""Builds views/ (the scoring targets) from mj/compost-bay.  usage: python make_views.py

The art director's call: the hero wins. It shows a wide, low bay (about 1.8 x 1.3 x 0.75 m). The turnaround sheet drew
a near-cube, so it is used for detail only (plank/post rhythm, heap colour), not for proportions.
  hero.png       = mj hero keyed by hue (the backdrop and its big cast shadow are warm with G/R 0.72-0.98 and B/G
                   0.62-0.92; the timber is redder, the compost darker), then opened, closed and hole-filled and pasted
                   on a flat backdrop. Scored by hero_check.py: this is the score that counts.
  view_front.png = mj view_back.png (split.py's right-hand cut), which is the sheet's only orthographic view: a
                   straight-on wall with the heap showing over it. Scored as-is for reference only; its near-cube
                   proportions are not a target.
  view_front/side from split.py are 3/4 views of the cube box, not orthographic, so they are dropped.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'compost-bay')


def hero():
    a = np.asarray(Image.open(os.path.join(MJ, 'hero.png')).convert('RGB')).astype(float)
    R, G, B = a[..., 0] + 1, a[..., 1] + 1, a[..., 2] + 1
    bg = (G / R > 0.72) & (G / R < 0.99) & (B / G < 0.93) & (B / G > 0.60)
    m = ~bg
    m = ndimage.binary_opening(m, iterations=3)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(s) + 1)
    m = ndimage.binary_fill_holes(ndimage.binary_closing(np.pad(m, 40), iterations=30)[40:-40, 40:-40])
    out = np.empty_like(a); out[:] = (246, 226, 192); out[m] = a[m]
    Image.fromarray(out.astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))


def front():
    Image.open(os.path.join(MJ, 'view_back.png')).save(os.path.join(HERE, 'views', 'view_front.png'))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    hero(); front()
    print('views written')
