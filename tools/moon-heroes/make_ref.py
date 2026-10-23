#!/usr/bin/env python3
"""Make a Meshy-ready reference: crop part of a picture, cut the subject out (rembg), and centre it
on a plain grey square.

  python3 make_ref.py SRC OUT.png [x0 y0 x1 y1]     # crop box in pixels of SRC (optional)

Keeps only the largest cut-out shape, so neighbouring views on a sheet don't leak in.
"""
import sys
from collections import deque

import numpy as np
from PIL import Image
from rembg import remove

BG = (128, 128, 128)
SIZE = 1024
MARGIN = 0.08


def largest_blob(mask):
    h, w = mask.shape
    lab = np.zeros(mask.shape, np.int32)
    best, best_n, cur = 0, 0, 0
    for y0, x0 in zip(*np.nonzero(mask)):
        if lab[y0, x0]:
            continue
        cur += 1
        n = 0
        q = deque([(y0, x0)])
        lab[y0, x0] = cur
        while q:
            y, x = q.popleft()
            n += 1
            for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                yy, xx = y + dy, x + dx
                if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = cur
                    q.append((yy, xx))
        if n > best_n:
            best, best_n = cur, n
    return lab == best


src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
if len(sys.argv) >= 7:
    im = im.crop(tuple(int(v) for v in sys.argv[3:7]))
rgba = np.asarray(remove(im)).copy()
keep = largest_blob(rgba[:, :, 3] > 40)
rgba[~keep, 3] = 0
ys, xs = np.nonzero(rgba[:, :, 3] > 40)
rgba = rgba[ys.min(): ys.max() + 1, xs.min(): xs.max() + 1]
cut = Image.fromarray(rgba, "RGBA")
s = (SIZE * (1 - 2 * MARGIN)) / max(cut.size)
cut = cut.resize((max(1, int(cut.width * s)), max(1, int(cut.height * s))), Image.LANCZOS)
canvas = Image.new("RGB", (SIZE, SIZE), BG)
canvas.paste(cut, ((SIZE - cut.width) // 2, (SIZE - cut.height) // 2), cut)
canvas.save(out)
print("ref", out, cut.size)
