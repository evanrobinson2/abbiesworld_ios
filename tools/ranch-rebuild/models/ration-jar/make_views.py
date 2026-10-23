"""Builds views/hero.png and views/hero_mask.png (the only scoring target) from mj/ration-jar/hero.png.
usage: python make_views.py

There is no turnaround for this asset, so the hero is the only target. The harness mask keeps the long brown cast
shadow on the right and drops the bright cream upper body (it is close to the backdrop), so the hero is keyed here:
a hand-traced polygon inside the jar body (its lit shoulder is the backdrop's colour), plus everything that differs from the backdrop (estimated per row from the left edge) above the ground line CUT, and below
it only what falls inside hand-traced polygons around the jar foot and the scoop bowl (2048 px hero coordinates).
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'ration-jar', 'hero.png')
CUT = 1300
POLYS = [
    [(690, 1300), (1458, 1300), (1392, 1650), (1330, 1700), (1200, 1728), (1000, 1734), (800, 1716), (720, 1680), (698, 1600)],  # jar foot
    [(380, 1380), (470, 1336), (600, 1326), (692, 1390), (692, 1600), (620, 1700), (540, 1736), (460, 1730), (400, 1680), (368, 1560)],  # scoop bowl
]
# the lit left shoulder is the backdrop's exact colour (246,218,177 vs 238,210,166), so the jar body is forced in
BODY = [(735, 680), (1320, 680), (1380, 850), (1440, 1000), (1440, 1300), (655, 1300), (642, 1000), (668, 870)]


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float) / 255
    rowbg = ndimage.median_filter(np.median(a[:, :40], 1), size=(25, 1))[:, None, :]
    m = np.linalg.norm(a - rowbg, axis=-1) > 0.07
    br = (a[..., 2] + 0.01) / (a[..., 0] + 0.01); bgbr = (rowbg[..., 2] + 0.01) / (rowbg[..., 0] + 0.01)
    m |= np.abs(br - bgbr) > 0.06          # the lit cream glaze is near the backdrop in value but much less yellow
    poly = Image.new('L', (a.shape[1], a.shape[0]), 0); d = ImageDraw.Draw(poly)
    for p in POLYS:
        d.polygon(p, fill=255)
    allow = np.asarray(poly) > 0; allow[:CUT] = True
    m &= allow
    body = Image.new('L', poly.size, 0); ImageDraw.Draw(body).polygon(BODY, fill=255); m |= np.asarray(body) > 0
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.01 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 20000)[0] + 1)
    bg = np.median(a[:8].reshape(-1, 3), 0)
    out = np.broadcast_to(bg, a.shape).copy(); out[m] = a[m]
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero_mask.png'))
    print('views/hero.png written')


if __name__ == '__main__':
    main()
