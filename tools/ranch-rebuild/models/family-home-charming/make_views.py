"""Builds views/hero.png (the only scoring target) from mj/family-home-charming/hero.png.  usage: python make_views.py

The hero wins and is the only target. The turnaround sheet drew a different house: a tall, narrow two-storey-ish
cottage on a near-square plan, with the door on the long side, no dormer, flat rectangular windows and a much
steeper roof. Its front view is a 3/4 view, its side view is a gable with a window (the hero's gable has the door),
and its back view is a near-square long side. None of them is an orthographic view of the hero's house, so
view_front/side/back are all dropped.
The harness mask keeps the hero's soft cast shadow on the left (it is the backdrop darkened, nearly the same hue),
so it is keyed out here (same colour test as models/family-home/make_views.py), then the object is pasted on a flat
backdrop. Near-backdrop plaster pixels are nudged darker inside the silhouette so the mask doesn't punch holes in
the cream walls. Scored by hero_check.py from the MJ hero's own direction.
"""
import os, sys
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'family-home-charming')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402
K = 2048 / 1932      # the hero was traced on a 1932 px preview
CHIMNEY = [(1200, 380), (1440, 370), (1440, 640), (1420, 668), (1350, 668), (1290, 630), (1205, 440)]


def write(mask, a, path):
    bg = np.median(a[:6].reshape(-1, 3), 0)
    out = np.repeat(np.repeat(bg[None, None], a.shape[0], 0), a.shape[1], 1).copy()
    obj = a.copy()
    near = np.linalg.norm(obj - bg, axis=-1) < 0.16
    obj[near] *= np.array([0.62, 0.72, 0.9])     # darker AND hue-shifted, so the harness does not read it as shadow
    out[mask] = obj[mask]
    Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8)).save(path)


def clean(m):
    m = ndimage.binary_fill_holes(m)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    return lab == (np.argmax(s) + 1)


def hero():
    a = np.asarray(Image.open(os.path.join(MJ, 'hero.png')).convert('RGB')).astype(float) / 255
    bg = np.median(a[:8].reshape(-1, 3), 0)
    m = np.linalg.norm(a - bg, axis=-1) > 0.07
    # cast shadow (backdrop darkened toward orange), only in its corner left of the step and below the footing line
    R = np.maximum(a[..., 0], 1e-3)
    shadow = (a[..., 1] / R < 0.87) & (a[..., 2] / R < 0.69) & (a.mean(-1) > 0.45)
    region = np.zeros(m.shape, bool); region[int(1330 * K):, :int(470 * K)] = True
    m &= ~(shadow & region)
    # the cream stone chimney stack is almost the backdrop colour: traced by hand (hero px / K)
    poly = Image.new('L', (a.shape[1], a.shape[0]), 0)
    ImageDraw.Draw(poly).polygon([(x * K, y * K) for x, y in CHIMNEY], fill=255)
    m |= np.asarray(poly) > 0
    m = ndimage.binary_opening(m, iterations=2)
    write(clean(m), a, os.path.join(HERE, 'views', 'hero.png'))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    os.makedirs(os.path.join(HERE, 'r'), exist_ok=True)
    hero()
    mm, _ = harness.target_mask(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((mm * 255).astype(np.uint8)).save(os.path.join(HERE, 'r', 'target_mask_hero.png'))
    print('views written')
