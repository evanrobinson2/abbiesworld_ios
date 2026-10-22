"""Builds views/ (the scoring targets) from mj/goat.  usage: python make_views.py

The sheet matches the hero and its middle view is a true left profile (head to the left, as the harness side
camera from +X sees our model), so all three views are kept and only the mask artefacts are cleaned:
  * the cast-shadow ground strip: the harness mask keeps a thin dark line along the ground that runs the full
    width of the front and back crops, which sets their bounding box width. Rows just above the hoof line keep only
    the columns under the hooves, and rows below it are cut.
  * cream-on-cream holes: the sheet's lit cream fur is within the harness mask threshold of the cream backdrop, so
    the harness mask loses most of the head, the lit flanks and a horn. The views are keyed again here with a lower
    backdrop distance plus a chromaticity test (backdrop taken per row from the edges; the back view's ear touches
    the left edge, so it uses the right edge only), closed a little, small holes filled.
Each view is written as the object (darkened a little where it is close to the backdrop) on a flat backdrop, so
harness.target_mask() recovers the cleaned silhouette (a plain darkening would be keyed out as cast shadow).
"""
import os, sys
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
MJ = os.path.join(HERE, '..', '..', 'mj', 'goat')
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness  # noqa: E402

HOOF = 26       # px the hooves reach into the cast-shadow strip
THRESH = 0.05   # backdrop distance (the harness uses 0.10, too coarse for cream fur on a cream backdrop)
CHROMA = 0.012  # or this much change in chromaticity
CLOSE = 4       # closing iterations for the remaining notches


def key(a, use_left):
    a = ndimage.median_filter(a, size=(5, 5, 1))
    edge = np.concatenate([a[:, -8:]] + ([a[:, :8]] if use_left else []), 1)
    bg = ndimage.median_filter(np.median(edge, 1), size=(25, 1))[:, None, :]
    d = np.linalg.norm(a - bg, axis=-1)
    ch = a / np.maximum(a.sum(-1, keepdims=True), 1e-3); cb = bg / bg.sum(-1, keepdims=True)
    return (d > THRESH) | (np.linalg.norm(ch - cb, axis=-1) > CHROMA)


def clean(m):
    rows = np.where(m.any(1))[0]; wid = m.sum(1); r1 = rows.max()
    # the shadow strip starts where the mask suddenly widens near the ground; below it keep only the hoof columns
    ref = np.median(wid[r1 - 90:r1 - 60])
    g = next(y for y in range(r1 - 90, r1 + 1) if wid[y] > 1.6 * ref)
    feet = ndimage.binary_dilation(m[g - 6:g - 2].any(0), iterations=4)
    m = m.copy(); m[g:, ~feet] = False; m[g + HOOF:] = False
    m = np.pad(m, CLOSE + 2); m = ndimage.binary_closing(m, iterations=CLOSE)[CLOSE + 2:-CLOSE - 2, CLOSE + 2:-CLOSE - 2]
    m = ndimage.binary_opening(m, iterations=2)
    holes = ndimage.binary_fill_holes(m) & ~m
    hl, hk = ndimage.label(holes)
    if hk:
        hs = ndimage.sum(holes, hl, range(1, hk + 1)); m = m | np.isin(hl, np.where(hs < 0.01 * m.size)[0] + 1)
    lab, k = ndimage.label(m); s = ndimage.sum(m, lab, range(1, k + 1))
    return np.isin(lab, np.where(s >= 0.02 * s.max())[0] + 1)


def write(mask, a, path):
    bg = np.median(a[:6].reshape(-1, 3), 0)
    ch = a / np.maximum(a.sum(-1, keepdims=True), 1e-3); cb = bg / bg.sum()
    obj = a.copy(); near = (np.linalg.norm(obj - bg, axis=-1) < 0.2) | (np.linalg.norm(ch - cb, axis=-1) < 0.03); obj[near] *= (0.86, 0.78, 0.62)   # hue-shifted, so it doesn't read as shadow
    out = np.repeat(np.repeat(bg[None, None], a.shape[0], 0), a.shape[1], 1).copy(); out[mask] = obj[mask]
    pad = 30   # a backdrop margin so no object row touches the edge
    im = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8))
    big = Image.new('RGB', (im.width + 2 * pad, im.height), tuple(int(c * 255) for c in bg)); big.paste(im, (pad, 0))
    big.save(path)


def main():
    os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
    for v in ('front', 'side', 'back'):
        p = os.path.join(MJ, f'view_{v}.png')
        a = np.asarray(Image.open(p).convert('RGB')).astype(float) / 255
        write(clean(key(a, v != 'back')), a, os.path.join(HERE, 'views', f'view_{v}.png'))
    print('views written')


if __name__ == '__main__':
    main()
