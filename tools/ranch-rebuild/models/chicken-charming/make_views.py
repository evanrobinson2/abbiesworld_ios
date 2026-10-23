"""Builds views/ (the scoring targets) from mj/chicken-charming.  usage: python make_views.py [thresh]

The hen is warm white on a warm cream backdrop with a vignette (the hero's corners are darker), so the harness's
0.10 colour threshold eats the lit feathers and keeps the cast shadows. Here each image is keyed again at 512 px:
  * the backdrop is each row's left and right edge colour, blended across the row;
  * above the belly line (BELLY): colour distance > thresh, closed and hole-filled (body, head, comb are one lump);
  * below it: only leg colour (saturated gold-orange) and feathers brighter than the backdrop, so the darker cast
    shadow under the feet drops out; everything below the lowest leg row (the toes) is cut;
then written back as a dark silhouette on the backdrop so the harness reads exactly that mask.
  hero.png:            the MJ hero (scored by hero_check.py; it wins).
  view_front/back.png: the sheet's front and back, scored by the harness.
  side/view_side.png:  the sheet's side. It is drawn three-quarter, facing right, and shows a fluffy tail-less egg
                       where the hero has a raised golden tail, so it is a proportion guide only, scored apart
                       (mirrored: the harness side camera at +X sees our hen, head -Y, facing left).
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'chicken-charming')
N = 512
BELLY = {'hero': 0.765, 'view_front': 0.745, 'view_side': 0.745, 'view_back': 0.745}   # belly line, fraction of height


def load(name):
    im = Image.open(os.path.join(MJ, name + '.png')).convert('RGB'); s = N / max(im.size)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    return np.asarray(im).astype(float) / 255


def backdrop(a):
    """per row, the left and right edge colours (median of 12 px, smoothed over 25 rows) blended linearly across:
    follows the hero's vertical wall-to-floor gradient and its darker upper-left vignette"""
    H, W = a.shape[:2]
    L = ndimage.median_filter(np.median(a[:, :12], 1), size=(25, 1))
    R = ndimage.median_filter(np.median(a[:, -12:], 1), size=(25, 1))
    t = np.linspace(0, 1, W)[None, :, None]
    return L[:, None, :] * (1 - t) + R[:, None, :] * t


def biggest(m):
    lab, k = ndimage.label(m)
    if not k:
        return m
    s = ndimage.sum(m, lab, range(1, k + 1))
    return lab == (np.argmax(s) + 1)


def key(name, thresh):
    a = load(name); bg = backdrop(a); H = a.shape[0]
    d = np.linalg.norm(a - bg, axis=-1)
    belly = int(BELLY[name] * H)
    leg = (a[..., 0] - a[..., 2] > 0.25) & (a[..., 0] > 0.3) & (a[..., 1] < 0.80 * a[..., 0])   # the warm shadow has G/R 0.86
    lum, blum = a.mean(-1), bg.mean(-1)
    rows = np.where(leg[belly:].sum(1) > 2)[0]
    toe = belly + rows.max() + 2 if len(rows) else H
    up = d > thresh; up[belly:] = False
    up = ndimage.binary_opening(up, iterations=1)
    up = ndimage.binary_fill_holes(ndimage.binary_closing(up, iterations=4) | up)
    lo = leg & (d > thresh)
    lo[:belly] = False; lo[toe:] = False
    cols = np.where(up[belly - 3])[0]
    if len(cols):
        lo[:, :cols.min() - 10] = False; lo[:, cols.max() + 10:] = False
    lo = ndimage.binary_closing(lo, iterations=2)
    lo = ndimage.binary_opening(lo, iterations=1)
    m = up | lo
    m = ndimage.binary_closing(m, iterations=2) | m
    m = biggest(m)
    return ndimage.binary_fill_holes(m), a


def write(m, a, path, mirror=False):
    out = np.empty_like(a); out[:] = np.median(a[:6].reshape(-1, 3), 0)
    out[m] = (0.35, 0.25, 0.2)
    im = Image.fromarray((out * 255).astype(np.uint8))
    if mirror:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im.save(path)


if __name__ == '__main__':
    T = float(sys.argv[1]) if len(sys.argv) > 1 else 0.045
    os.makedirs(os.path.join(HERE, 'views', 'side'), exist_ok=True)
    for name, out, mir in (('view_front', 'view_front.png', False), ('view_back', 'view_back.png', False),
                           ('view_side', 'side/view_side.png', True), ('hero', 'hero.png', False)):
        m, a = key(name, T)
        write(m, a, os.path.join(HERE, 'views', out), mir)
    print('views written')
