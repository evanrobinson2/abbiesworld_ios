"""Builds views/hero.png (the only scoring target) from mj/bench-charming.  usage: python make_views.py

The hero wins and is the only target. It shows a chubby, low storybook bench: one thick pillow-edged slab on four fat
round splayed log legs with rounded feet and a thin dark stretcher with a tenon. The turnaround sheet drew a taller,
lighter bench with square-sawn legs and both stretchers and end rails at mid height, and its cuts are 3/4 views
with big cast shadows (the long-side cut scored 0.13 and is mostly shadow and sky), so all three sheet views are dropped.
  hero.png = mj hero keyed by hue: the backdrop is G/R ~0.89 and the soft cast shadow G/R ~0.80, the lit and shaded
             wood G/R 0.49-0.66, so G/R < 0.74 (or very dark) keys the bench and leaves the shadow out. Opened, largest
             component kept, small specks filled; the real openings between seat, legs and stretcher stay open.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'bench-charming')


def hero():
    a = np.asarray(Image.open(os.path.join(MJ, 'hero.png')).convert('RGB')).astype(float)
    R, G, B = a[..., 0] + 1, a[..., 1] + 1, a[..., 2] + 1
    lum = (R + G + B) / 3
    m = (G / R < 0.74) | (lum < 70)          # wood is red-brown; the backdrop and cast shadow are grey-warm (G/R ~0.9)
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(s) + 1)
    m = ndimage.binary_closing(np.pad(m, 20), iterations=4)[20:-20, 20:-20]
    # fill only small holes (texture specks), keep the real openings
    holes = ndimage.binary_fill_holes(m) & ~m
    lab, k = ndimage.label(holes)
    if k:
        sz = ndimage.sum(holes, lab, range(1, k + 1))
        for i, v in enumerate(sz):
            if v < 3000:
                m[lab == i + 1] = True
    out = np.empty_like(a); out[:] = (246, 226, 192); out[m] = a[m]
    Image.fromarray(out.astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    hero()
    print('views written')
