"""Builds views/ (the scoring targets) from mj/chicken-coop-charming.  usage: python make_views.py

The hero wins: the long eave wall with the arched door, ramp and nest hatch faces -Y; the hero looks at it from the
front-left, so the gable it shows (mesh window + porthole) is the -X gable. The harness mask fails on this art: the
cream walls are nearly the backdrop colour (holes), and the soft grey cast shadow under and left of the coop is kept.
So every target is keyed here: backdrop distance, holes filled (the timber trim encloses the cream walls), and below
the platform only saturated warm pixels ((r-b)/r > 0.4 and (r-g)/r > 0.18: wood and the brown stone shoes;
the shadow under the coop is brown too, but greyer) are kept, which drops the cast shadow but keeps legs, stone
shoes and ramp.
  hero.png       = keyed MJ hero; scored by hero_check.py from the hero's own direction.
  view_side.png  = mj view_back: the sheet's gable with the mesh window and the nest box on the image-left (-Y when seen
                   from +X, where the harness side camera stands), so it is used unmirrored. Stretched to the model's
                   gable width/height (the sheet coop is narrower and taller), and the ramp, which the sheet puts on
                   the other gable, is painted in edge-on from the model's numbers, as in models/chicken-coop.
  view_front     = dropped: the sheet's left view is a gable with an arched door and a stair ramp (the hero has the door
                   on the long wall).
  view_back      = dropped: the sheet's middle view is a 3/4 view, not the long wall.
"""
import os, sys, json
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'chicken-coop-charming')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402

# model numbers (from the round-1 build): total height, gable width incl. corner posts, ramp (edge-on in the side view)
MODEL_H = 3.01
MODEL_GW = 1.35
SHEET = dict(top=268, bot=1398, wall_l=88, wall_r=612, platform=1100)   # mj view_back px
RAMP = dict(top_z=0.58, out=0.10, run=1.00, thick=0.12)


def key(a, plat_row):
    """object mask: differs from the backdrop, holes filled above the platform bottom (plat_row); below it only warm
    saturated (wood/stone) pixels, opened to drop grass and ground specks, with no hole filling (the gaps between the
    legs stay open)."""
    bg = np.median(np.concatenate([a[:8].reshape(-1, 3), a[:, :8].reshape(-1, 3)]), 0)
    m = np.linalg.norm(a - bg, axis=-1) > 0.07
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    rr = np.maximum(r, 1e-3)
    wood = ((r - b) / rr > 0.40) & ((r - g) / rr > 0.18)   # wood and stone shoes; not the brown-grey shadow or the backdrop
    top = m.copy(); top[plat_row:] = False
    top = ndimage.binary_fill_holes(ndimage.binary_closing(ndimage.binary_opening(top, iterations=2), iterations=3))
    low = m & wood; low[:plat_row - 40] = False
    low = ndimage.binary_opening(low, iterations=6)
    lab, k = ndimage.label(low); s = ndimage.sum(low, lab, range(1, k + 1))
    low = np.isin(lab, 1 + np.where(s > 1500)[0])
    low = ndimage.binary_fill_holes(ndimage.binary_closing(low, iterations=6))   # the dark gaps between ramp slats
    m = top | low
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    return lab == (np.argmax(s) + 1)


# Below the platform the hero's shadow, warm ground glow and grey lit ramp slats defeat any colour key, so the legs,
# braces, stone shoes and ramp are traced by hand (hero px, 2048 square).
HERO_LOW = [
    [(1095, 1408), (1342, 1397), (1657, 1777), (1620, 1787), (1432, 1817), (1402, 1810)],      # ramp
    [(553, 1465), (617, 1465), (617, 1622), (624, 1697), (545, 1697), (553, 1622)],             # front-left leg + shoe
    [(943, 1490), (1022, 1490), (1022, 1690), (1037, 1765), (935, 1765), (943, 1690)],          # front-middle leg + shoe
    [(1078, 1490), (1134, 1490), (1134, 1585), (1149, 1637), (1070, 1637), (1078, 1585)],       # back-middle leg + shoe
    [(1490, 1465), (1554, 1465), (1554, 1622), (1562, 1667), (1505, 1667), (1490, 1622)],       # front-right leg + shoe
]
HERO_BRACES = [((592, 1555), (683, 1480)), ((877, 1510), (945, 1600)), ((1020, 1585), (1095, 1510)), ((1410, 1480), (1500, 1570))]


def hero_low(shape):
    im = Image.new('L', (shape[1], shape[0]), 0); d = ImageDraw.Draw(im)
    for poly in HERO_LOW:
        d.polygon(poly, fill=255)
    for a, b in HERO_BRACES:
        d.line([a, b], fill=255, width=34)
    return np.asarray(im) > 0


def clean(m):
    m = ndimage.binary_fill_holes(m)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    return lab == (np.argmax(s) + 1)


def write(mask, a, path, sx=1.0, pad=80):
    bg = np.median(a[:6].reshape(-1, 3), 0)
    obj = a.copy(); near = np.linalg.norm(obj - bg, axis=-1) < 0.16
    obj[near] *= np.array([0.62, 0.72, 0.9])     # darker AND hue-shifted, so the harness does not read it as shadow
    out = np.repeat(np.repeat(bg[None, None], a.shape[0], 0), a.shape[1], 1).copy(); out[mask] = obj[mask]
    im = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    w = int(round(im.width * sx)); big = Image.new('RGB', (w + 2 * pad, im.height + pad), tuple(int(c * 255) for c in bg))
    big.paste(im.resize((w, im.height), Image.BILINEAR), (pad, 0)); big.save(path)


def load(name):
    return np.asarray(Image.open(os.path.join(MJ, name)).convert('RGB')).astype(float) / 255


def hero():
    a = load('hero.png')
    m = key(a, 1490)
    m[1490:] = False
    m |= hero_low(m.shape)
    write(m, a, os.path.join(HERE, 'views', 'hero.png'), pad=0)


def side():
    a = load('view_back.png')
    m = key(a, SHEET['platform'] + 30)
    sx = (MODEL_GW / MODEL_H) / ((SHEET['wall_r'] - SHEET['wall_l']) / (SHEET['bot'] - SHEET['top']))
    # paint the ramp edge-on: from the platform lip at the front (-Y = image-left) down to the ground
    pad = 600
    m = np.pad(m, ((0, 0), (pad, 0))); a = np.pad(a, ((0, 0), (pad, 0), (0, 0)), mode='edge')
    k = (SHEET['bot'] - SHEET['top']) / MODEL_H          # px per metre vertically
    kx = k / sx                                          # px per metre horizontally (before the stretch)
    x0 = pad + SHEET['wall_l'] - RAMP['out'] * kx; y0 = SHEET['bot'] - RAMP['top_z'] * k
    x1 = x0 - RAMP['run'] * kx; y1 = SHEET['bot']
    yy, xx = np.mgrid[0:m.shape[0], 0:m.shape[1]]
    d = np.array([x1 - x0, y1 - y0]); ln = np.hypot(*d); d /= ln
    tpar = (xx - x0) * d[0] + (yy - y0) * d[1]; perp = (xx - x0) * d[1] - (yy - y0) * d[0]
    r = (tpar >= -10) & (tpar <= ln) & (np.abs(perp + RAMP['thick'] * k / 2) <= RAMP['thick'] * k / 2) & (yy <= y1)
    m |= r; a[r] = (0.55, 0.38, 0.2)
    write(m, a, os.path.join(HERE, 'views', 'view_side.png'), sx)


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    os.makedirs(os.path.join(HERE, 'r'), exist_ok=True)
    hero(); side()
    for n in ('hero', 'view_side'):
        mm, _ = harness.target_mask(os.path.join(HERE, 'views', n + '.png'))
        Image.fromarray((mm * 255).astype(np.uint8)).save(os.path.join(HERE, 'r', f'target_mask_{n}.png'))
    print('views written')
