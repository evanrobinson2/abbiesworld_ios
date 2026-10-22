"""Builds views/ (the scoring targets) from mj/goat-shelter.  usage: python make_views.py

The sheet drew a steeper, taller shed with brown framing than the hero. The art director's call: the hero wins on
look and pitch, the sheet gives the back wall and depth only. So:
  view_front.png = mj view_front (the gable end with the door and ramp). The cast-shadow ground strip and the sheet's
                   loose rack/chair left of the shed are cut, then the silhouette is stretched horizontally so
                   apex height / wall width matches the hero (HERO_APEX_OVER_W, measured on the hero, corrected
                   for its yaw). This lowers the sheet's ~64 deg pitch towards the hero's.
  view_back.png  = re-cropped from turnaround.png (split.py cut the right-hand building in two). That building is
                   a 3/4 view of the back gable with the long side on its left; the left half is replaced by the
                   mirror of the right half (pure gable), the ground strip and the stray bench are cut, then it is
                   stretched with the same ratio. Our model is viewed from +Y for it.
  view_side      = dropped: the sheet's middle view is a 3/4 front view, not an orthographic side.
  hero.png       = mj hero with its ground shadow keyed out. The harness mask keeps the hero's dark contact shadow
                   under the stilts and drops the grey-teal ramp (it reads as darkened backdrop), so the object is
                   keyed by hue instead (backdrop and shadows are warm with G/R 0.70-0.98), then opened, closed and
                   hole-filled, and pasted on a flat backdrop. Scored by hero_check.py.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'goat-shelter')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402

HERO_APEX_OVER_W = 1.38   # hero: bargeboard crossing top above ground (~970 px) / gable wall width (555 px / cos 40 deg yaw)


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


def span(m, y0, y1):
    xs = np.where(m[y0:y1].any(0))[0]; return xs.min(), xs.max()


def stretch_for(m, wall_rows, ground):
    ys = np.where(m.any(1))[0]; h = ground - ys.min()
    wl, wr = span(m, *wall_rows); return h / HERO_APEX_OVER_W / (wr - wl)


def front():
    m, a = harness.target_mask(os.path.join(MJ, 'view_front.png'))
    m[1356:] = False
    m[1150:, :255] = False; m[1150:, 815:] = False          # shadow strip and the loose rack left of the shed
    m[1312:, :380] = False; m[1312:, 690:] = False          # ground line either side of the ramp
    m = clean(m)
    sx = stretch_for(m, (950, 1100), 1312)
    write(m, a, os.path.join(HERE, 'views', 'view_front.png'), sx)
    return sx


def back():
    src = Image.open(os.path.join(MJ, 'turnaround.png')).convert('RGB').crop((1900, 0, 2912, 1632))
    tmp = os.path.join(HERE, 'views', '_back_raw.png'); src.save(tmp)
    m, a = harness.target_mask(tmp); os.remove(tmp)
    m[1244:] = False
    c = 531                                                    # gable centre (between the corner posts 334 and 728)
    right = m[:, c:].copy(); n = min(c, right.shape[1])
    m[:, :c] = False; m[:, c - n:c] = right[:, :n][:, ::-1]
    m = clean(m)
    sx = stretch_for(m, (950, 1100), 1244)
    write(m, a, os.path.join(HERE, 'views', 'view_back.png'), sx)
    return sx


def hero():
    a = np.asarray(Image.open(os.path.join(MJ, 'hero.png')).convert('RGB')).astype(float)
    R, G, B = a[..., 0] + 1, a[..., 1] + 1, a[..., 2] + 1
    m = ~((G / R > 0.70) & (G / R < 0.98) & (B / G < 0.92))
    m = ndimage.binary_opening(m, iterations=3)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(s) + 1)
    m = ndimage.binary_fill_holes(ndimage.binary_closing(m, iterations=4))
    out = np.empty_like(a); out[:] = (246, 226, 192); out[m] = a[m]
    Image.fromarray(out.astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    print('stretch front %.2f back %.2f' % (front(), back()))
    hero()
    print('views written')
