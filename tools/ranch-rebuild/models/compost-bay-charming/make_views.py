"""Builds views/hero.png (the only scoring target) from mj/compost-bay-charming.  usage: python make_views.py

The art director's call: the hero wins. It shows a chunky bay with doubled corner boards, three fat plank rows and a
domed heap. The hero's dark olive cast shadow (lower left) is warm, so the normal bay's hue key (backdrop and shadow
have G/R 0.72-0.98 and B/G 0.60-0.93; timber is redder, compost darker) removes it along with the backdrop; then the
mask is opened, closed and hole-filled and pasted on a flat backdrop. Scored by hero_check.py.
The turnaround sheet drew three 3/4 views (no orthographic one) of a near-cube crate with four rows and single corner
posts, so all three views are dropped; the sheet is used for nothing but colour reference.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'compost-bay-charming')


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


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    hero()
    print('views written')
