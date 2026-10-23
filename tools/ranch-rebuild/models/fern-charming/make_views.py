"""Builds views/hero.png (the only scoring target) from mj/fern-charming/hero.png.  usage: python make_views.py

No turnaround was made for the charming fern, so the hero is the only target. The harness mask keeps the hero's soft cast
shadow (greenish grey-olive, so it is not a plain darkening of the cream). Fern pixels are saturated: blue is well
under green (B/G < ~0.45), while the shadow keeps more blue (B/G > ~0.5). So below SHADOW_ROW, pixels with
B/G > BG_RATIO are dropped. Then small specks are removed, small holes filled, and the mask is pasted on a flat
backdrop (the fern's own colours kept)."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, '..', '..', 'mj', 'fern-charming', 'hero.png')
SHADOW_ROW = 1350      # 2048 px hero; the cast shadow starts below this row
BG_RATIO = 0.50
THRESH = 0.10
FOOT_ROW, FOOT_X = 1560, (500, 1480)   # below FOOT_ROW only the crown foot (these columns) is kept


def main():
    a = np.asarray(Image.open(SRC).convert('RGB')).astype(float) / 255
    edge = np.concatenate([a[:, :8], a[:, -8:]], 1)
    rowbg = ndimage.median_filter(np.median(edge, 1), size=(25, 1))
    m = np.linalg.norm(a - rowbg[:, None], axis=-1) > THRESH
    bg_ratio = a[..., 2] / np.maximum(a[..., 1], 1e-3)
    sh = bg_ratio > BG_RATIO; sh[:SHADOW_ROW] = False
    m &= ~sh
    # the darkest shadow streak runs out to the left along the ground: keep only the crown's foot there
    low = np.zeros_like(m); low[FOOT_ROW:] = True; low[:, FOOT_X[0]:FOOT_X[1]] = False
    m &= ~low
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.003 * s.max())[0] + 1)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 1500)[0] + 1)
    bg = np.median(a[:8].reshape(-1, 3), 0)
    out = np.broadcast_to(bg, a.shape).copy(); out[m] = a[m]
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero_mask.png'))
    ys, xs = np.where(m)
    print('views/hero.png written; bbox w/h %.2f' % ((np.ptp(xs) + 1) / (np.ptp(ys) + 1)))


if __name__ == '__main__':
    main()
