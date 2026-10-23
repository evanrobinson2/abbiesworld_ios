"""Builds the scoring targets in views/ from mj/water-trough.  usage: python make_views.py

hero.png / hero_mask.png: the MJ hero with its cast shadow keyed out. The harness mask keeps the hero's big tan
shadow (it shifts hue a little, so the harness's hue-preserving shadow test misses it). Here a pixel is backdrop or
shadow when every channel is at least SHADOW_RATIO of the backdrop (the shadow is the cream darkened by ~15-30%);
the wood, iron and water all drop at least one channel far lower. Then opened, small specks dropped, holes filled.
Scored by hero_check.py with a camera matched to the hero.

view_side.png: the sheet's left-hand end view re-cropped from turnaround.png (split.py's crops run down into the
3/4 view). It is an end (short side) of the trough, so it matches the harness's side camera (+X). See notes.json for
whether it is kept as a target.  view_front / view_back: the other two sheet views are also end views (not the long
front or back), so they are not written.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'water-trough')
SHADOW_RATIO = 0.62
SIDE_CROP = (250, 200, 960, 740)     # left end view in the 2912x1632 turnaround
SIDE_RIM = 150                       # rows above the near end's rim are the far end drawn in perspective: blanked
HERO_LOW_ROW = 1150


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


def main():
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    a = np.asarray(Image.open(os.path.join(MJ, 'hero.png')).convert('RGB')).astype(float) / 255
    m, bg = key(a, HERO_LOW_ROW)
    out = np.broadcast_to(bg, a.shape).copy(); out[m] = a[m]
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
    Image.fromarray((m * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero_mask.png'))
    t = Image.open(os.path.join(MJ, 'turnaround.png')).convert('RGB').crop(SIDE_CROP)
    a = np.asarray(t).astype(float) / 255; m, bg = key(a); m[:SIDE_RIM] = False
    out = np.broadcast_to(bg, a.shape).copy(); out[m] = a[m]
    Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'view_side.png'))
    print('views/hero.png, hero_mask.png, view_side.png written')


if __name__ == '__main__':
    main()
