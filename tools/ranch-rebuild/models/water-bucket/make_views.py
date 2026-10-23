"""Builds views/hero.png (the only scoring target) from mj/water-bucket/hero.png.  usage: python make_views.py

No turnaround for this asset, so the hero is the only target. The harness mask keeps the hero's warm cast shadow
(cream backdrop darkened, hue unchanged), so the hero is keyed here instead: wood, iron and rope are all clearly more
saturated (HSV S > 0.45) or darker (V < 0.55) than the backdrop and its shadow (S < 0.40), and above the ground
line (CUT) anything that differs from the backdrop counts too (lit wood on the right is pale). Below CUT only what falls
inside a hand-traced outline of the bucket's lower body (2048 px hero coordinates) is kept, which drops the cast
shadow. The water is enclosed by the rim, so small holes are filled. Pasted on a flat backdrop."""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'water-bucket', 'hero.png')
S_MIN, V_MAX = 0.45, 0.55
CUT = 1300
BODY = [(x + 400, y + 1100) for x, y in [(150, 0), (160, 100), (192, 400), (250, 560), (300, 660), (420, 727), (620, 762),
                                         (830, 737), (940, 662), (1000, 545), (1048, 330), (1085, 100), (1100, 0)]]


def main():
    rgb = np.asarray(Image.open(SRC).convert('RGB')).astype(float) / 255
    hsv = np.asarray(Image.open(SRC).convert('HSV')).astype(float) / 255
    bg = np.median(rgb[:8].reshape(-1, 3), 0)
    m = (hsv[..., 1] > S_MIN) | (hsv[..., 2] < V_MAX)
    m[:CUT] |= np.linalg.norm(rgb[:CUT] - bg, axis=-1) > 0.10
    poly = Image.new('L', (rgb.shape[1], rgb.shape[0]), 0); ImageDraw.Draw(poly).polygon(BODY, fill=255)
    allow = np.asarray(poly) > 0; allow[:CUT] = True
    m[CUT:] = allow[CUT:]
    m = ndimage.binary_opening(m, iterations=2); m = ndimage.binary_closing(m, iterations=4)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(s) + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:   # the water and specks inside the bucket are filled; the big loop under the handle stays open
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); ys = ndimage.center_of_mass(holes, hl, range(1, hk + 1))
        m |= np.isin(hl, [i + 1 for i in range(hk) if hs[i] < 20000 or ys[i][0] > 700])
    out = np.broadcast_to(bg, rgb.shape).copy(); out[m] = rgb[m]
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero_mask.png'))
    ys, xs = np.where(m); print('views/hero.png written, bbox', ys.min(), ys.max(), xs.min(), xs.max())


if __name__ == '__main__':
    main()
