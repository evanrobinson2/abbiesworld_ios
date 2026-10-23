"""Builds views/ (the scoring targets) from mj/horse-charming.  usage: python make_views.py

- views/hero.png: the hero, keyed here. The harness mask keeps the hero's soft beige cast shadow (it is a warm,
  slightly hue-shifted darkening, so the harness shadow test misses it) and drops the lower half of the cream muzzle
  (it is within 0.10 of the backdrop). So: object = everything differing from the per-row backdrop by > 0.05, and
  below the ground line CUT only the coat/hoof pixels (shadow pixels keep g/r > 0.70, the coat and hooves are < 0.66).
- views/view_front.png, view_back.png: the sheet's front and back: the harness mask (it removes their grey cast
  shadows and keeps the gaps between the legs) plus the loose mask above row 900 (fills the cream muzzle), then MIRRORED left-right. The
  sheet hangs the mane on the horse's left (+X) and swings the tail to its right; the hero (which wins) shows the mane
  on the near side, which is the horse's right (-X). The horse is otherwise symmetric, so mirroring the sheet makes
  it agree with the hero.
- view_side is dropped: it is a three-quarter view (both eyes and the whole face show), not a side elevation.
Object pixels too close to the backdrop for the harness's 0.10 threshold (cream muzzle and blaze) are painted a
hue-shifted tan so the harness keeps them; everything else is painted with the flat backdrop.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'horse-charming')
OUT = os.path.join(HERE, 'views'); os.makedirs(OUT, exist_ok=True)
JOBS = {'hero': ('hero.png', 1340, False, None), 'view_front': ('view_front.png', 1330, True, 900), 'view_back': ('view_back.png', 1330, True, 900)}
TAN = np.array([0.78, 0.60, 0.42])


def key(a, cut, top=None, path=None):
    edge = np.concatenate([a[:, :6], a[:, -6:]], 1)
    bg = ndimage.median_filter(np.median(edge, 1), size=(25, 1))[:, None, :]
    d = np.linalg.norm(a - bg, axis=-1)
    m = d > 0.05
    gr = a[..., 1] / np.maximum(a[..., 0], 1e-3)
    low = np.zeros_like(m); low[cut:] = True
    m &= ~(low & (gr > 0.70))
    if top is not None:                    # sheet views: the harness mask (keeps the gaps between the legs), plus the
        import sys                         # loose mask only above row `top`, where the cream muzzle drops out
        sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge')); import harness
        hm, _ = harness.target_mask(path)
        m[top:] = False; m |= hm
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.02 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 0.004 * m.size)[0] + 1)
    out = np.broadcast_to(np.median(bg, 0), a.shape).copy()
    out[m] = a[m]
    weak = m & (np.linalg.norm(out - np.median(bg, 0), axis=-1) < 0.16)
    out[weak] = TAN
    return out, m


for nm, (src, cut, mirror, top) in JOBS.items():
    a = np.asarray(Image.open(os.path.join(MJ, src)).convert('RGB')).astype(float) / 255
    out, m = key(a, cut, top, os.path.join(MJ, src))
    if mirror:
        out, m = out[:, ::-1], m[:, ::-1]
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(OUT, f'{nm}.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(OUT, f'{nm}_mask.png'))
    print(nm, 'keyed', 'mirrored' if mirror else '')
