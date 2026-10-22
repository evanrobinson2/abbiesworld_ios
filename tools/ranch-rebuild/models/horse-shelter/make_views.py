"""Builds views/ (the scoring targets) from mj/horse-shelter.  usage: python make_views.py

The sheet drew a narrower, taller shed than the hero (a near-square plan and walls about as tall as they are wide).
The hero wins on proportions, the sheet gives the roof pitch, eave depth and the back wall:
  view_front.png = mj view_front (the gable end with the door). The ground strip is cut off and the lean-to the sheet
                   added on the left (not in the hero) is replaced by the mirror of the right half. Then it is stretched
                   horizontally so ridge height / wall width matches the hero (HERO_RIDGE_OVER_W, measured on the hero,
                   corrected for its ~32 degree yaw).
  view_side.png  = mj view_back, which is really the long eave side (no door, roof courses face us). Ground strip and
                   grass tufts cut, then stretched so its wall length is HERO_D_OVER_W x the stretched front wall width.
  view_back      = dropped: the sheet has no back gable view (its middle view is a 3/4 with a lean-to, not orthographic).
  hero.png       = mj hero as is (its cast shadow is already removed by the harness mask), scored by hero_check.py.
"""
import os, sys, shutil
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'horse-shelter')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402

HERO_RIDGE_OVER_W = 1.19   # hero: ridge-board top above ground (1160 px) / gable wall width (830 px / cos 32 deg yaw)
HERO_D_OVER_W = 1.1        # art director: width : depth about 1 : 1.1


def write(mask, a, path, sx=1.0):
    bg = np.median(a[:6].reshape(-1, 3), 0)
    obj = a.copy(); near = np.linalg.norm(obj - bg, axis=-1) < 0.16; obj[near] *= 0.78
    out = np.repeat(np.repeat(bg[None, None], a.shape[0], 0), a.shape[1], 1).copy(); out[mask] = obj[mask]
    im = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    if sx != 1.0:
        w = int(round(im.width * sx)); big = Image.new('RGB', (w + 80, im.height), tuple(int(c * 255) for c in bg))
        big.paste(im.resize((w, im.height), Image.BILINEAR), (40, 0)); im = big
    im.save(path)


def clean(m):
    m = ndimage.binary_fill_holes(m)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    return lab == (np.argmax(s) + 1)


def rows_span(m, y0, y1):
    xs = np.where(m[y0:y1].any(0))[0]; return xs.min(), xs.max()


def front():
    m, a = harness.target_mask(os.path.join(MJ, 'view_front.png'))
    m[1374:] = False
    wl, wr = rows_span(m, 1150, 1300)              # wall + footing span
    c = (wl + wr) // 2
    for y in range(850, 1374):                      # lean-to on the left: mirror the right half over it
        right = m[y, c:].copy(); n = min(c, len(right))
        m[y, c - n:c] = right[:n][::-1]
    m = clean(m)
    ys = np.where(m.any(1))[0]; ridge_h = 1374 - ys.min()
    wl, wr = rows_span(m, 1150, 1300); W = wr - wl
    sx = ridge_h / HERO_RIDGE_OVER_W / W
    write(m, a, os.path.join(HERE, 'views', 'view_front.png'), sx)
    return W * sx


def side(front_w):
    m, a = harness.target_mask(os.path.join(MJ, 'view_back.png'))
    m[1371:] = False; m[1320:, 668:] = False; m[1320:, :100] = False
    m = clean(m)
    wl, wr = rows_span(m, 1150, 1300); L = wr - wl
    sx = HERO_D_OVER_W * front_w / L
    write(m, a, os.path.join(HERE, 'views', 'view_side.png'), sx)


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    fw = front(); side(fw)
    shutil.copy(os.path.join(MJ, 'hero.png'), os.path.join(HERE, 'views', 'hero.png'))
    print('views written')
