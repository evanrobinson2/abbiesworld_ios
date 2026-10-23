"""Builds views/hero.png and views/hero_mask.png (the only scoring target) from mj/stone-edging-charming/hero.png.
usage: python make_views.py
Keys out the cream backdrop, then drops the cast shadow right of the last (nearest) stone (x > SHADOW_X near the ground)."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'stone-edging-charming', 'hero.png')
SHADOW_X, SHADOW_Y = 1935, 1380    # 2048 px coords: shadow lies right of the last stone, at ground level


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float) / 255
    bg = np.median(a[:8].reshape(-1, 3), 0)
    m = np.linalg.norm(a - bg, axis=-1) > 0.055       # the charming backdrop is flat; the cream stones sit close to it
    m |= (a[..., 2] > bg[..., 2] + 0.02) & (a.sum(-1) > bg.sum(-1) + 0.03)   # warm white petals: a touch brighter and bluer
    m[SHADOW_Y:, SHADOW_X:] = False
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.002 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 40000)[0] + 1)
    out = np.broadcast_to(bg, a.shape).copy(); out[m] = a[m]
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero_mask.png'))
    ys, xs = np.where(m); print('views/hero.png written, bbox', xs.min(), xs.max(), ys.min(), ys.max())


if __name__ == '__main__':
    main()
