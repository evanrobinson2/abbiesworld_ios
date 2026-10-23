"""Builds the scoring target in views/ from mj/water-trough-charming.  usage: python make_views.py

hero.png / hero_mask.png: the MJ hero with its cast shadow keyed out. The harness mask keeps the hero's big tan
shadow (it shifts hue a little, so the harness's hue-preserving shadow test misses it). Here a pixel is backdrop or
shadow when every channel is at least SHADOW_RATIO of the backdrop (the shadow is the cream darkened by ~15-30%);
the wood, iron and water all drop at least one channel far lower. Then opened, small specks dropped, holes filled.
Scored by hero_check.py with a camera matched to the hero.

The turnaround sheet is dropped (see notes.json): it draws a different, boat-shaped trough with curved, tapering
ends, a rounded belly and straps at mid-length instead of at the corners, so the hero is the only target.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'water-trough-charming')
SHADOW_RATIO = 0.62
HERO_LOW_ROW = 1150                   # below it, the deeper contact shadow (pale and warm) is dropped too
CUT = ((100, 1150), (1900, 700))     # 2048 px hero: the cast shadow lies wholly below this line
LIT_DIST = 0.06                      # above it, anything this far from the backdrop is trough (the sunlit rim tops
                                     # are pale enough to pass the shadow test, so the plain key loses them)


def key(a, low_row=None):
    bg = np.median(np.concatenate([a[:8].reshape(-1, 3), a[:, :8].reshape(-1, 3)]), 0)
    r = a / bg
    m = ~(r.min(-1) > SHADOW_RATIO) & (np.linalg.norm(a - bg, axis=-1) > 0.08)
    if low_row is not None:     # the hero's contact shadow under the long wall is deeper and redder: below the
        rows = np.arange(len(a))[:, None] >= low_row      # walls' lit tops, drop pale warm pixels too
        m &= ~(rows & (r[..., 0] > 0.66) & (r[..., 2] > 0.36))
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    m = np.isin(lab, np.where(s >= 0.01 * s.max())[0] + 1)
    m = ndimage.binary_fill_holes(m)
    return m, bg


def above_cut(shape):
    """pixels above the line through CUT: everything up there is trough or backdrop, never cast shadow"""
    (x0, y0), (x1, y1) = CUT
    yy, xx = np.mgrid[:shape[0], :shape[1]]
    return yy < y0 + (xx - x0) * (y1 - y0) / (x1 - x0)


def main():
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    a = np.asarray(Image.open(os.path.join(MJ, 'hero.png')).convert('RGB')).astype(float) / 255
    m, bg = key(a, HERO_LOW_ROW)
    lit = (np.linalg.norm(a - bg, axis=-1) > LIT_DIST) & above_cut(m.shape)   # the pale, sunlit rim tops
    m = ndimage.binary_fill_holes(ndimage.binary_opening(m | lit, iterations=2))
    out = np.broadcast_to(bg, a.shape).copy(); out[m] = a[m]
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero_mask.png'))
    print('views/hero.png, hero_mask.png written')


if __name__ == '__main__':
    main()
