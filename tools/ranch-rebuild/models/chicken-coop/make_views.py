"""Builds views/ (the scoring targets) from mj/chicken-coop.  usage: python make_views.py

The hero wins (door, ramp and nest box on the long eave wall at -Y; mesh window on the +X gable). The sheet drew a
narrower, taller coop with an arched pop door on a gable end, so it is used for proportions only:
  view_front.png = dropped. The sheet's left view is a 3/4 view of a gable end with an arched pop door and its ramp;
                   no orthographic view of our door wall exists.
  view_side.png  = mj view_back (the gable end with the mesh window) MIRRORED so its nest box bump sits at the front
                   (-Y is image-left when seen from +X). Ground shadow cut (legs kept by column), then stretched so
                   width/height matches our model's gable (SIDE_SX).
  view_back.png  = mj view_side (the long eave wall without a door: our back wall, with the sheet's leg spacing).
                   Its nest box lies inside the wall outline, so the silhouette is just the back wall. Stretched by BACK_SX.
  hero.png       = mj hero with its greenish cast shadow and the orange ground glow painted out; scored by hero_check.py.
"""
import os, sys, shutil
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'chicken-coop')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402

# width/height stretch of the sheet views towards the hero's proportions (sheet: square plan, narrow + tall)
# model (round 3): total height 2.6 m, gable wall 1.25 m wide, eave wall 1.65 m long (corner posts included)
# sheet: gable wall 583 px / 1137 px tall, eave wall 555 px / 1133 px tall
MODEL_H = 2.6
SIDE_SX = (1.25 / MODEL_H) / (583 / 1137)
BACK_SX = (1.65 / MODEL_H) / (555 / 1133)
# the sheet's gable view has no ramp (its ramp is on the other gable); ours runs from the sill down to the ground in
# front of the eave wall, so it shows edge-on in the side view: painted in from the model's numbers (hero-matched)
RAMP = dict(top_z=0.55, run=1.00, thick=0.10)


def write(mask, a, path, sx=1.0):
    bg = np.median(a[:6].reshape(-1, 3), 0)
    obj = a.copy(); near = np.linalg.norm(obj - bg, axis=-1) < 0.16; obj[near] *= 0.78
    out = np.repeat(np.repeat(bg[None, None], a.shape[0], 0), a.shape[1], 1).copy(); out[mask] = obj[mask]
    im = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    w = int(round(im.width * sx)); big = Image.new('RGB', (w + 160, im.height + 80), tuple(int(c * 255) for c in bg))
    big.paste(im.resize((w, im.height), Image.BILINEAR), (80, 0)); big.save(path)


def clean(m):
    m = ndimage.binary_fill_holes(m)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    return lab == (np.argmax(s) + 1)


def legs_only(m, cut, ref):
    """Below row `cut` keep only columns where the legs are at row `ref` (the ground shadow spans the sheet)."""
    cols = ndimage.binary_dilation(m[ref], iterations=12)
    m[cut:] &= cols[None, :]
    return m


def add_ramp(m, a, sx):
    ys, xs = np.where(m); top, bot = ys.min(), ys.max(); k = (bot - top) / MODEL_H
    rows = np.where(m[int(bot - RAMP['top_z'] * k)])[0]; xw = rows.min()   # front wall face (left) at the sheet's sill
    x0, y0 = xw, bot - RAMP['top_z'] * k; x1, y1 = xw - RAMP['run'] * k / sx, bot
    yy, xx = np.mgrid[0:m.shape[0], 0:m.shape[1]]
    d = np.array([x1 - x0, y1 - y0]); ln = np.hypot(*d); d /= ln
    tpar = (xx - x0) * d[0] + (yy - y0) * d[1]; perp = (xx - x0) * d[1] - (yy - y0) * d[0]
    r = (tpar >= 0) & (tpar <= ln) & (np.abs(perp + RAMP['thick'] * k / 2) <= RAMP['thick'] * k / 2) & (yy <= bot)
    m |= r; a[r] = (0.66, 0.5, 0.33)
    return m


def sheet(name, cut, ref, sx, flip, out, ramp=False):
    m, a = harness.target_mask(os.path.join(MJ, name))
    m = legs_only(m, cut, ref)
    m = clean(m)
    if flip:
        m, a = m[:, ::-1].copy(), a[:, ::-1].copy()
    if ramp:
        pad = 700; m = np.pad(m, ((0, 0), (pad, 0))); a = np.pad(a, ((0, 0), (pad, 0), (0, 0)), mode='edge')
        m = add_ramp(m, a, sx)
    write(m, a, os.path.join(HERE, 'views', out), sx)
    ys = np.where(m.any(1))[0]; return m, ys.min(), ys.max()


def hero():
    a = np.asarray(Image.open(os.path.join(MJ, 'hero.png')).convert('RGB')).astype(float)
    m, _ = harness.target_mask(os.path.join(MJ, 'hero.png'))
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    rows = np.arange(a.shape[0])[:, None]
    shadow = (g > r - 18) & (r - b < 60) & (r + g + b < 520) & (rows > 1350)   # greenish-grey cast shadow (left, on the ground)
    glow = (r + g + b > 560) & (rows > 1500)   # bright orange ground under the coop
    m &= ~shadow & ~glow
    m = ndimage.binary_opening(m, iterations=2)
    m = clean(m)
    bg = np.array([236, 215, 175], float)
    out = np.where(m[..., None], a, bg); Image.fromarray(out.astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    sheet('view_back.png', 1300, 1290, SIDE_SX, True, 'view_side.png', ramp=True)
    sheet('view_side.png', 1290, 1280, BACK_SX, False, 'view_back.png')
    hero()
    print('views written')
