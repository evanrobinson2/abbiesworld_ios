"""Builds views/hero.png and views/hero_mask.png (the only scoring target) from mj/ration-jar-charming/hero.png.
usage: python make_views.py

There is no turnaround for this asset, so the hero is the only target. The jar's lit cream glaze is almost the
backdrop's colour (246,229,198 vs 246,225,191) and the soft cast shadow runs off to the right along the ground, so the
hero is keyed here: colour distance plus a blue/red chroma test against the backdrop (estimated per row from the left
edge) above the ground line CUT, and below it only what falls inside hand-traced polygons around the jar foot and the
spoon bowl (2048 px hero coordinates). Holes inside the jar are filled.
"""
import os
import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'ration-jar-charming', 'hero.png')
CUT = 1540
POLYS = [
    [(600, 1540), (1490, 1540), (1450, 1650), (1385, 1720), (1250, 1752), (900, 1754), (720, 1732), (640, 1680)],  # jar foot
    [(350, 1540), (670, 1540), (655, 1650), (605, 1722), (520, 1764), (430, 1762), (372, 1722), (352, 1640)],    # spoon bowl
]


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float) / 255
    rowbg = ndimage.median_filter(np.median(a[:, :40], 1), size=(25, 1))[:, None, :]
    m = np.linalg.norm(a - rowbg, axis=-1) > 0.055
    br = (a[..., 2] + 0.01) / (a[..., 0] + 0.01); bgbr = (rowbg[..., 2] + 0.01) / (rowbg[..., 0] + 0.01)
    m |= np.abs(br - bgbr) > 0.04
    poly = Image.new('L', (a.shape[1], a.shape[0]), 0); d = ImageDraw.Draw(poly)
    for p in POLYS:
        d.polygon(p, fill=255)
    allow = np.asarray(poly) > 0; allow[:CUT] = True
    m &= allow
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.01 * s.max())[0] + 1)
    m = ndimage.binary_fill_holes(m)
    bg = np.median(a[:8].reshape(-1, 3), 0)
    out = np.broadcast_to(bg, a.shape).copy(); out[m] = a[m]
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero_mask.png'))
    print('views/hero.png written')


if __name__ == '__main__':
    main()
