"""Builds views/ (the scoring targets) from mj/cow.  usage: python make_views.py

The cow is cream on a cream backdrop, so the harness's 0.10 colour threshold punches big holes in the body (the
target masks lose most of the back and flank). Here the mask is redone with a lower threshold, the cast shadow cut
off below the hooves, a closing pass and all holes filled, and the view is written back as a dark silhouette on the
backdrop so the harness reads exactly that mask.
  view_front.png, view_back.png: the sheet's front and back (scored at full weight).
  side/view_side.png: the sheet's side, which is drawn slightly three-quarter (head turned toward us, body
                      foreshortened), so it is scored separately as a proportion guide, not in the mean.
  hero.png: the MJ hero mask (for hero_check.py).
"""
import os, sys, shutil
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'cow')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402


def mask(path, thresh, ground=None):
    a = np.asarray(Image.open(path).convert('RGB')).astype(float) / 255
    edge = np.concatenate([a[:, :6], a[:, -6:]], 1)
    bg = ndimage.median_filter(np.median(edge, 1), size=(25, 1))[:, None, :]
    d = np.linalg.norm(a - bg, axis=-1)
    m = d > thresh
    r = a / np.maximum(bg, 1e-3); lum = r.mean(-1)
    shadow = (lum < 0.97) & (r.std(-1) / np.maximum(lum, 1e-3) < 0.03)
    m &= ~shadow
    if ground is not None:
        m[ground:] = False
    m = ndimage.binary_opening(m, iterations=2)
    m = ndimage.binary_closing(m, iterations=3)
    m = ndimage.binary_fill_holes(m)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    keep = np.where(s >= 0.01 * s.max())[0] + 1
    return np.isin(lab, keep), a


def write(m, a, path):
    bg = np.median(a[:6].reshape(-1, 3), 0)
    out = np.repeat(np.repeat(bg[None, None], a.shape[0], 0), a.shape[1], 1).copy()
    out[m] = (0.35, 0.25, 0.2)
    Image.fromarray((out * 255).astype(np.uint8)).save(path)


def hoof_line(path):
    """lowest row of hoof colour (dark brown), to cut the ground shadow below it"""
    a = np.asarray(Image.open(path).convert('RGB')).astype(float) / 255
    hoof = (a[..., 0] - a[..., 2] > 0.25) & (a.mean(-1) < 0.55)
    ys = np.where(hoof.sum(1) > 3)[0]
    return ys.max() + 2


# row (in the source image) below which the legs start: above it the low-threshold mask with a big closing (the
# body is one convex lump), below it the harness's own mask (it keeps the gaps between the legs and drops shadows)
BELLY = {'front': 1150, 'back': 1110, 'side': 1150, 'hero': 1330}


def view_mask(p, v, T):
    up, a = mask(p, T, hoof_line(p))
    up = ndimage.binary_closing(up, iterations=14) | up
    up = ndimage.binary_fill_holes(up)
    lo, _ = harness.target_mask(p)
    lo[hoof_line(p):] = False
    lo = ndimage.binary_opening(lo, structure=np.ones((31, 1)))      # drops the thin ground streaks joining the hooves
    if v == 'hero':                                                # the floor right of the near front hoof reads as object
        lo[1560:, 1365:] = False
    m = np.zeros_like(up); b = BELLY[v]
    m[:b] = up[:b]; m[b:] = lo[b:]
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:                                                         # only small specks, not the gaps between legs
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 0.002 * m.size)[0] + 1)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    return np.isin(lab, np.where(s >= 0.01 * s.max())[0] + 1), a


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views', 'side'), exist_ok=True)
    T = float(sys.argv[1]) if len(sys.argv) > 1 else 0.05
    for v in ['front', 'back', 'side']:
        p = os.path.join(MJ, f'view_{v}.png')
        m, a = view_mask(p, v, T)
        write(m, a, os.path.join(HERE, 'views', *(['side'] if v == 'side' else []), f'view_{v}.png'))
    p = os.path.join(MJ, 'hero.png'); m, a = view_mask(p, 'hero', T)
    write(m, a, os.path.join(HERE, 'views', 'hero.png'))
    print('views written')
