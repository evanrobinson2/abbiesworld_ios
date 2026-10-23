"""Cut the Midjourney turnaround (ref/turnaround, job 632f773e image 0) into front / side / back / three-quarter
reference views with silhouette masks, normalised so the figure stands crown-to-sole at the study's scale
(rows 53 to 987 of a 1024 frame, centred). Writes ref/views/mj_<view>.png and mj_<view>_mask.png.

The turnaround is "this kind of character" drawn by Midjourney from Evan's picture; the exact guy is still the
front reference. Side and back views are scored after both silhouettes are normalised by height and centred,
since the turnaround is roughly orthographic and its scale is its own.
"""
import os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, 'ref', 'turnaround', 'mj_632f773e-78a8-439b-95bb-90ef434313b6_0.png')
NAMES = ['front', 'side', 'back', 'three_quarter']
TOP, BOT, N = 53, 987, 1024


def figure_mask(im):
    H, W, _ = im.shape
    bg = np.median(np.concatenate([im[:40].reshape(-1, 3), im[:, :8].reshape(-1, 3)]), 0)
    lum = im.mean(-1)
    d = np.abs(im - bg).sum(-1)
    m = (d > 24) | (im[..., 2] - im[..., 0] > 4)
    warm_dark = (lum < 118) & (im[..., 0] - im[..., 2] > 4)
    m &= ~(warm_dark & (np.arange(H)[:, None] > H * 0.9))
    m = ndi.binary_opening(m, iterations=2)
    return m


def normalise(mask, rgb=None):
    ys, xs = np.nonzero(mask)
    y0, y1 = ys.min(), ys.max()
    s = (BOT - TOP) / (y1 - y0)
    cx = xs.mean()
    out_m = np.zeros((N, N), bool); out_rgb = None
    w = mask.shape[1]
    M = Image.fromarray((mask * 255).astype(np.uint8)).resize((round(w * s), round(mask.shape[0] * s)), Image.BILINEAR)
    ox, oy = round(N / 2 - cx * s), round(TOP - y0 * s)
    canvas = Image.new('L', (N, N), 0); canvas.paste(M, (ox, oy))
    out_m = np.asarray(canvas) > 127
    if rgb is not None:
        R = Image.fromarray(rgb.astype(np.uint8)).resize(M.size, Image.LANCZOS)
        c2 = Image.new('RGB', (N, N), tuple(int(v) for v in np.median(rgb[:40].reshape(-1, 3), 0))); c2.paste(R, (ox, oy))
        out_rgb = c2
    return out_m, out_rgb


def main():
    im = np.asarray(Image.open(SRC).convert('RGB')).astype(float)
    m = figure_mask(im)
    # The four figures stand in a row: split at the empty column gaps above the floor (shadows join them below).
    H = m.shape[0]
    occ = m[: int(H * 0.88)].sum(0) > 2
    runs, start = [], None
    for x, v in enumerate(list(occ) + [False]):
        if v and start is None:
            start = x
        elif not v and start is not None:
            runs.append((start, x)); start = None
    runs = sorted(sorted(runs, key=lambda r: r[1] - r[0])[-4:])
    cuts = [0] + [(runs[i][1] + runs[i + 1][0]) // 2 for i in range(3)] + [m.shape[1]]
    comps = []
    for i in range(4):
        part = np.zeros_like(m); part[:, cuts[i]:cuts[i + 1]] = m[:, cuts[i]:cuts[i + 1]]
        lab, n = ndi.label(part)
        c = lab == (1 + int(np.argmax(ndi.sum(part, lab, range(1, n + 1)))))
        # floor shadow: a thin strip at the soles; drop floor columns that are only a few pixels tall
        ys = np.nonzero(c)[0]; f0 = int(ys.max() - 0.06 * (ys.max() - ys.min()))
        thin = c[f0:].sum(0) < 0.03 * (ys.max() - ys.min())
        c[f0:, thin] = False
        lab2, n2 = ndi.label(c)
        comps.append(lab2 == (1 + int(np.argmax(ndi.sum(c, lab2, range(1, n2 + 1))))))
    out = os.path.join(HERE, 'ref', 'views'); os.makedirs(out, exist_ok=True)
    for name, c in zip(NAMES, comps):
        cm = ndi.binary_fill_holes(ndi.binary_closing(c, iterations=3))
        ys, xs = np.nonzero(cm)
        pad = 20
        sl = (slice(max(0, ys.min() - pad), ys.max() + pad), slice(max(0, xs.min() - pad), xs.max() + pad))
        nm, nrgb = normalise(cm[sl], im[sl])
        Image.fromarray((nm * 255).astype(np.uint8)).save(os.path.join(out, f'mj_{name}_mask.png'))
        nrgb.save(os.path.join(out, f'mj_{name}.png'))
        print(name, cm.sum())


if __name__ == '__main__':
    main()
