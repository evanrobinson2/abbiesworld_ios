"""Builds views/ (the scoring targets) from mj/chicken.  usage: python make_views.py [thresh]

The hen is warm white on a cream backdrop, so the harness's 0.10 colour threshold punches big holes through the
body and breast (the raw masks lose half the bird), and it keeps the hero's long cast shadow. Here the mask is redone:
a low colour threshold plus a big closing above the belly (the body is one lump), the harness mask below it (it keeps
the gap between the legs), everything below the lowest toe cut off (the ground shadow), all holes filled, and the
view written back as a dark silhouette on the backdrop so the harness reads exactly that mask.
  view_front.png, view_back.png: the sheet's front and back, as split.
  view_side.png: re-cropped from turnaround.png (split.py's crop cut the breast off). The sheet's side faces right (head toward +x of the picture) and is slightly three-quarter. The
                 harness side camera looks from +X, where our hen (head -Y) faces left, so it is mirrored.
  hero.png: the MJ hero mask (for hero_check.py).
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'chicken')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402


def load(path):
    return np.asarray(Image.open(path).convert('RGB')).astype(float) / 255


def background(a):
    edge = np.concatenate([a[:, :6], a[:, -6:]], 1)
    return ndimage.median_filter(np.median(edge, 1), size=(25, 1))[:, None, :]


def toe_line(a):
    """lowest row of leg colour (saturated yellow-orange), to cut the ground shadow below it"""
    leg = (a[..., 0] - a[..., 2] > 0.38) & (a[..., 1] > 0.35) & (a[..., 0] > 0.6) & (a[..., 1] < 0.8 * a[..., 0])
    rows = np.where(leg.sum(1) > 4)[0]
    return rows.max() + 2


def low_mask(a, thresh):
    bg = background(a)
    d = np.linalg.norm(a - bg, axis=-1)
    m = d > thresh
    r = a / np.maximum(bg, 1e-3); lum = r.mean(-1)
    m &= ~((lum < 0.97) & (r.std(-1) / np.maximum(lum, 1e-3) < 0.03))     # backdrop darkened without a hue shift
    return m


def biggest(m, frac=0.01):
    lab, k = ndimage.label(m)
    if not k:
        return m
    s = ndimage.sum(m, lab, range(1, k + 1))
    return np.isin(lab, np.where(s >= frac * s.max())[0] + 1)


def view_mask(a, belly, thresh):
    toe = toe_line(a)
    blur = ndimage.uniform_filter(a, size=(5, 5, 1))
    up = low_mask(blur, thresh); up[toe:] = False
    up = ndimage.binary_opening(up, iterations=2)
    up = biggest(up, 0.05)
    up = ndimage.binary_fill_holes(ndimage.binary_closing(up, iterations=12) | up)
    # below the belly: drop the cast shadow by hue (the backdrop darkened keeps G/R high and B/G low; feathers are
    # whiter, the legs and golden underside warmer)
    R, G, B = blur[..., 0] + 1e-3, blur[..., 1], blur[..., 2]
    shadow = (G / R > 0.84) & (B / np.maximum(G, 1e-3) < 0.90)
    lo = up & ~shadow
    lo = ndimage.binary_opening(lo, iterations=3)
    m = up.copy(); m[belly:] = lo[belly:]
    # white hackle and breast feathers on the outline match the backdrop and leave notches open to the side; above the
    # belly each column is filled between its topmost and bottommost object pixel (the hen has no side-facing holes)
    for x in np.where(m[:belly].any(0))[0]:
        ys = np.where(m[:belly, x])[0]; m[ys.min():ys.max() + 1, x] = True
    m = biggest(m, 0.002)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 0.002 * m.size)[0] + 1)
    return m


def write(m, a, path, mirror=False):
    bg = np.median(a[:6].reshape(-1, 3), 0)
    out = np.repeat(np.repeat(bg[None, None], a.shape[0], 0), a.shape[1], 1).copy()
    out[m] = (0.35, 0.25, 0.2)
    im = Image.fromarray((out * 255).astype(np.uint8))
    if mirror:
        im = im.transpose(Image.FLIP_LEFT_RIGHT)
    im.save(path)


SIDE_CROP = (980, 1880)    # columns of turnaround.png holding the middle (side) hen
# row (in the source image) where the feathered belly ends and the legs begin
BELLY = {'front': 1230, 'side': 1230, 'back': 1230, 'hero': 1500}

if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    T = float(sys.argv[1]) if len(sys.argv) > 1 else 0.035
    for v in ['front', 'side', 'back']:
        a = load(os.path.join(MJ, f'view_{v}.png'))
        if v == 'side':      # split.py cut the breast off at the right edge: re-crop the middle hen from the sheet
            a = load(os.path.join(MJ, 'turnaround.png'))[:, SIDE_CROP[0]:SIDE_CROP[1]]
        write(view_mask(a, BELLY[v], T), a, os.path.join(HERE, 'views', f'view_{v}.png'), mirror=(v == 'side'))
    a = load(os.path.join(MJ, 'hero.png'))
    write(view_mask(a, BELLY['hero'], T), a, os.path.join(HERE, 'views', 'hero.png'))
    print('views written')
