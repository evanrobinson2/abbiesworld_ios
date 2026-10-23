"""Clean silhouette targets for scoring, written to views/ as a dark silhouette on the harness backdrop.

The elder's creamy umbels are almost the colour of the cream backdrop, so the harness colour mask loses most of the
flowers (the hero's whole top half). Here the mask is colour difference OR local texture (the umbels are full of
tiny specks and shading, the backdrop is flat), closed to join the florets, small holes filled, the cast shadow
dropped, and everything below the base row cut away. The sheet masks are then stretched to the hero's proportions.
usage: python make_views.py
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'elder')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

# per view: base row of the stems as a fraction of the image height (ground and shadow below it are cut)
BASE = {'hero': 0.872, 'view_front': 0.858, 'view_side': 0.858, 'view_back': 0.858}
# the sheet drew a taller, open shrub (aspect 1.25 to 1.6); the hero's dome is wide (0.65). Per the AD the hero wins
# and the sheet gives proportion only, so the sheet masks are stretched horizontally to this height/width aspect.
SHEET_ASPECT = 0.85
THRESH = 0.06
TEX = 0.022       # local luminance std that counts as 'textured' (florets)
CLOSE = 0.006     # closing radius as a fraction of the image height


def key(path, base):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float) / 255
    h = a.shape[0]
    edge = np.concatenate([a[:, :6], a[:, -6:]], 1); rowbg = ndimage.median_filter(np.median(edge, 1), size=(25, 1))
    d = np.linalg.norm(a - rowbg[:, None], axis=-1)
    lum = a.mean(-1)
    w = max(3, int(h * 0.004))
    mu = ndimage.uniform_filter(lum, w); sd = np.sqrt(np.maximum(ndimage.uniform_filter(lum * lum, w) - mu * mu, 0))
    m = (d > THRESH) | (sd > TEX)
    r = a / np.maximum(rowbg[:, None], 1e-3); rl = r.mean(-1)
    sh = (rl > 0.35) & (rl < 0.97) & (r.std(-1) / np.maximum(rl, 1e-3) < 0.035)
    sh[:int((base - 0.04) * h)] = False
    m &= ~sh
    m[int(base * h):] = False
    # near the ground the floor's horizon and the cast shadow differ from the edge colour too: keep only foliage there
    g0 = int((base - 0.035) * h)
    leafy = (lum < 0.40) & (a[..., 1] - a[..., 2] > 0.08)
    m[g0:] &= ndimage.binary_dilation(leafy, iterations=2)[g0:]
    k = max(1, int(CLOSE * h))
    m = ndimage.binary_closing(m, iterations=k)
    m = ndimage.binary_opening(m, iterations=2)
    lab, n = ndimage.label(m)
    if n:
        s = ndimage.sum(m, lab, range(1, n + 1)); m = np.isin(lab, np.where(s >= 0.02 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m
    hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 0.004 * m.size)[0] + 1)
    return m


def main():
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    bg = np.array(harness.BG) * 255
    for name, base in BASE.items():
        m = key(os.path.join(MJ, f'{name}.png'), base)
        if name != 'hero':
            ys, xs = np.where(m); m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
            h = m.shape[0]; w = int(round(h / SHEET_ASPECT)); pad = int(0.08 * w)
            st = np.asarray(Image.fromarray((m * 255).astype(np.uint8)).resize((w, h), Image.BILINEAR)) > 127
            m = np.zeros((h + 2 * pad, w + 2 * pad), bool); m[pad:pad + h, pad:pad + w] = st
        out = np.empty(m.shape + (3,), np.uint8); out[:] = bg.astype(np.uint8); out[m] = (40, 60, 30)
        Image.fromarray(out).save(os.path.join(HERE, 'views', f'{name}.png'))
        print(name, 'aspect %.3f' % harness.aspect(m))


if __name__ == '__main__':
    main()
