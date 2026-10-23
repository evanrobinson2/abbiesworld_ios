"""Builds views/ (the scoring targets) from mj/bench.  usage: python make_views.py

The art director's call: the hero wins. It shows a heavy, low trestle bench (about 1.6 x 0.42 x 0.45 m). The
turnaround sheet drew a taller, lighter bench, so it is used for proportions of parts only, not scored as a target
except for reference.
  hero.png       = mj hero keyed by hue (the backdrop and its cast shadow have G/R about 0.9; the wood is red-brown,
                   G/R 0.55-0.7), opened, largest component kept, and pasted on a flat backdrop. The open spaces
                   between legs, stretcher and seat stay open (no hole fill), so the score sees the trestle structure.
  view_front.png = mj view_front.png (split.py's left cut): a near-straight long-side view of the taller sheet bench.
                   Scored for reference only.
  view_side.png / view_back.png: the sheet's end view and a second 3/4 long view; dropped (sheet proportions).
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'bench')


def hero():
    a = np.asarray(Image.open(os.path.join(MJ, 'hero.png')).convert('RGB')).astype(float)
    R, G, B = a[..., 0] + 1, a[..., 1] + 1, a[..., 2] + 1
    lum = (R + G + B) / 3
    m = (G / R < 0.80) | (lum < 70)          # wood is red-brown; the backdrop and cast shadow are grey-warm (G/R ~0.9)
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


def front():
    Image.open(os.path.join(MJ, 'view_front.png')).save(os.path.join(HERE, 'views', 'view_front.png'))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    hero(); front()
    print('views written')
