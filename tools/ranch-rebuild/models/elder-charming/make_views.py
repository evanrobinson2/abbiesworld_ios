"""Clean silhouette targets for scoring, written to views/ as a dark silhouette on the harness backdrop.

Copied from models/elder and re-pointed at mj/elder-charming. The creamy flower heads are almost the colour of the
cream backdrop, so the harness colour mask loses them: the mask is colour difference OR local texture (the florets
are speckled, the backdrop is flat), closed, small holes filled. The hero's soft cast shadow runs off to the left
along the ground: everything below the base row is cut, and in the band just above it only green pixels (the pale
cloud clumps, the trunk's olive) are kept, which drops the shadow (backdrop darkened, same hue).

The turnaround sheet drew a different tree (tall, narrow, 1.6x taller than wide, a two-tier crown on a long bare
trunk over a small clump), which contradicts the hero (about as wide as tall, a big leaning canopy over a large cloud
bush). The hero wins: the sheet masks are keyed as they are (no stretching) and scored for reference only.
usage: python make_views.py
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'elder-charming')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness

# per view: base row as a fraction of the image height (ground and shadow below it are cut)
BASE = {'hero': 0.856, 'view_front': 0.905, 'view_side': 0.905, 'view_back': 0.905}
BAND = 0.10       # height of the ground band (fraction of the image) where only green pixels are kept
THRESH = 0.06
TEX = 0.022       # local luminance std that counts as 'textured' (florets)
HOLE = 0.0015     # holes smaller than this share of the image are filled
CLOSE = 0.006     # closing radius as a fraction of the image height


def key(path, base):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float) / 255
    h = a.shape[0]
    edge = np.concatenate([a[:, :6], a[:, -6:]], 1); top = np.median(a[:6].reshape(-1, 3), 0)
    rowbg = np.median(edge, 1); ok = (np.linalg.norm(edge - top, axis=-1) < 0.15).mean(1) > 0.8   # rows clear of the object
    ys = np.arange(len(rowbg))
    rowbg = np.stack([np.interp(ys, ys[ok], rowbg[ok, c]) for c in range(3)], 1)
    rowbg = ndimage.median_filter(rowbg, size=(25, 1))
    d = np.linalg.norm(a - rowbg[:, None], axis=-1)
    lum = a.mean(-1)
    w = max(3, int(h * 0.004))
    mu = ndimage.uniform_filter(lum, w); sd = np.sqrt(np.maximum(ndimage.uniform_filter(lum * lum, w) - mu * mu, 0))
    m = (d > THRESH) | (sd > TEX)
    m[int(base * h):] = False
    g0 = int((base - BAND) * h)
    green = (a[..., 1] - a[..., 2] > 0.22) | (lum < 0.35)
    m[g0:] &= ndimage.binary_dilation(green, iterations=2)[g0:]
    k = max(1, int(CLOSE * h))
    m = ndimage.binary_closing(m, iterations=k)
    m = ndimage.binary_opening(m, iterations=2)
    lab, n = ndimage.label(m)
    if n:
        s = ndimage.sum(m, lab, range(1, n + 1)); m = np.isin(lab, np.where(s >= 0.02 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m
    hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < HOLE * m.size)[0] + 1)
    return m


def main():
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    bg = np.array(harness.BG) * 255
    for name, base in BASE.items():
        m = key(os.path.join(MJ, f'{name}.png'), base)
        out = np.empty(m.shape + (3,), np.uint8); out[:] = bg.astype(np.uint8); out[m] = (40, 60, 30)
        Image.fromarray(out).save(os.path.join(HERE, 'views', f'{name}.png'))
        ys, xs = np.where(m)
        print(name, 'aspect %.3f' % harness.aspect(m), 'bbox x %d..%d y %d..%d' % (xs.min(), xs.max(), ys.min(), ys.max()))


if __name__ == '__main__':
    main()
