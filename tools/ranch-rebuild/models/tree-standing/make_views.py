"""Copy the MJ hero and sheet views into views/ with the ground removed.

The harness mask keeps the pale ground strip / grass streaks / cast shadows under the tree (they differ from the
backdrop by more than its threshold), which doubles the width of every bottom row. The tree itself is either brown
bark or green leaves, both much more saturated than the cream backdrop and floor, so: keep harness-mask pixels that
are saturated (S > 0.40), keep the largest connected piece, fill small holes, and paint everything else flat cream.
usage: python make_views.py
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness
MJ = os.path.join(HERE, '..', '..', 'mj', 'tree-standing')
SAT = 0.40


def clean(src, dst):
    m, a = harness.target_mask(src)
    mx, mn = a.max(-1), a.min(-1); s = (mx - mn) / np.maximum(mx, 1e-3)
    m &= s > SAT
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(sizes) + 1)
    m = ndimage.binary_closing(m, iterations=3)
    holes = ndimage.binary_fill_holes(m) & ~m; hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m |= np.isin(hl, np.where(hs < 0.004 * m.size)[0] + 1)
    out = np.empty_like(a); out[:] = harness.BG; out[m] = a[m]
    Image.fromarray((out * 255).astype(np.uint8)).save(dst)
    ys, xs = np.where(m); print(os.path.basename(dst), 'h/w', round((np.ptp(ys) + 1) / (np.ptp(xs) + 1), 3))


if __name__ == '__main__':
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    clean(os.path.join(MJ, 'hero.png'), os.path.join(HERE, 'views', 'hero.png'))
    for v in ('front', 'side', 'back'):
        clean(os.path.join(MJ, f'view_{v}.png'), os.path.join(HERE, 'views', f'view_{v}.png'))
