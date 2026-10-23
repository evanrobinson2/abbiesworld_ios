"""Builds views/ (the scoring targets) from mj/family-home.  usage: python make_views.py

The turnaround sheet draws the door on a gable end, the hero puts it on the long side. The hero wins, so:
  view_side.png  = mj view_front (the gable end with the chimney on the back slope), seen from +X. Its door steps
                   (which belong to the sheet's gable door, not ours) and stray ground pixels are trimmed off.
  view_back.png  = mj view_back (the long side with one window), mirrored so the chimney sits at the +X end as in the
                   hero, and stretched horizontally to the hero's length/width ratio (the sheet draws a near-square
                   plan; the hero is clearly longer). It scores heights only: roof, walls, foundation, chimney.
  view_front     = dropped: no target exists for the door side (the sheet's 'side' is a 3/4 view).
  hero.png       = mj hero with its cast shadow removed (scored by hero_check.py from the hero's own direction).
Plaster pixels that are almost the backdrop colour are nudged darker inside the filled silhouette, so the harness
mask (which keys on difference from the backdrop) doesn't punch holes through the cream walls.
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'family-home')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402

LW = None  # length / width of the walls, read from build.py


def write(mask, a, path):
    bg = np.median(a[:6].reshape(-1, 3), 0)
    out = np.repeat(np.repeat(bg[None, None], a.shape[0], 0), a.shape[1], 1).copy()
    obj = a.copy()
    near = np.linalg.norm(obj - bg, axis=-1) < 0.16
    obj[near] *= 0.78
    out[mask] = obj[mask]
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(path)


def clean(m):
    m = ndimage.binary_fill_holes(m)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    return lab == (np.argmax(s) + 1)


def side():
    m, a = harness.target_mask(os.path.join(MJ, 'view_front.png'))
    m[1432:] = False                          # step stones below the footing line
    m[1325:, :80] = False                     # shadow left of the steps (the steps stay: our front step shows there too)
    m[1325:, 790:] = False
    write(clean(m), a, os.path.join(HERE, 'views', 'view_side.png'))


def back():
    m, a = harness.target_mask(os.path.join(MJ, 'view_back.png'))
    m[1380:, 812:] = False                    # the step stones poking out on the right of the sheet's back view
    m = clean(m)[:, ::-1]; a = a[:, ::-1]
    # gable wall width on the sheet (view_front, footing-top rows) vs long wall length (view_back)
    # the sheet draws its back view smaller than its gable view: footing-bottom to eave is 440 px there (987-1427)
    # against 500 px on the gable view (940-1440), so the back view is rescaled by 500/440 first
    gable_w = 750 - 180; long_w = (770 - 154) * 500 / 440
    s = LW * gable_w / long_w
    h, w = m.shape; W2 = int(w * s) + 40
    mi = Image.fromarray((m * 255).astype(np.uint8)).resize((int(w * s), h), Image.BILINEAR)
    ai = Image.fromarray((a * 255).astype(np.uint8)).resize((int(w * s), h), Image.BILINEAR)
    M = np.zeros((h, W2), bool); A = np.zeros((h, W2, 3))
    M[:, 20:20 + mi.width] = np.asarray(mi) > 127
    A[:, 20:20 + mi.width] = np.asarray(ai) / 255.0
    bg = np.median(a[:6].reshape(-1, 3), 0); A[:, :20] = bg; A[:, 20 + mi.width:] = bg
    write(M, A, os.path.join(HERE, 'views', 'view_back.png'))


def hero():
    m, a = harness.target_mask(os.path.join(MJ, 'hero.png'))
    bg = np.median(a[:6].reshape(-1, 3), 0)
    r = a / np.maximum(bg, 1e-3); lum = r.mean(-1)
    R = np.maximum(a[..., 0], 1e-3)
    shadow = (lum > 0.35) & (lum < 0.9) & (np.abs(a[..., 1] / R - 0.91) < 0.06) & (np.abs(a[..., 2] / R - 0.76) < 0.08)
    m = ndimage.binary_opening(m & ~shadow, iterations=3)
    write(clean(m), a, os.path.join(HERE, 'views', 'hero.png'))


if __name__ == '__main__':
    import importlib.util
    spec = importlib.util.spec_from_file_location('build', os.path.join(HERE, 'build.py'))
    b = importlib.util.module_from_spec(spec); spec.loader.exec_module(b)
    LW = b.P['L'] / b.P['W']
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    side(); back(); hero()
    for v in ('view_side', 'view_back', 'hero'):
        mm, _ = harness.target_mask(os.path.join(HERE, 'views', v + '.png'))
        os.makedirs(os.path.join(HERE, 'r'), exist_ok=True); Image.fromarray((mm * 255).astype(np.uint8)).save(os.path.join(HERE, 'r', 'target_mask_' + v + '.png'))
    print('views written, L/W', round(LW, 3))
