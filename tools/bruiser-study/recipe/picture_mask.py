#!/usr/bin/env python3
"""Cut the character out of a reference picture (flat studio background) as a mask.

  python3 picture_mask.py ref.png out.npy [out_preview.png]
"""
import sys
import numpy as np
from PIL import Image, ImageFilter

src, dst = sys.argv[1], sys.argv[2]
try:
    # Prefer a real matte (rembg / U2-Net) when it is installed; the colour key below is the fallback.
    from rembg import remove
    alpha = np.asarray(remove(Image.open(src).convert("RGB")))[:, :, 3]
    mask = alpha > 127
    np.save(dst, mask)
    if len(sys.argv) > 3:
        Image.fromarray((mask * 255).astype(np.uint8)).save(sys.argv[3])
    print("mask (rembg)", mask.shape, mask.mean().round(3))
    sys.exit(0)
except ImportError:
    pass
im = np.asarray(Image.open(src).convert("RGB")).astype(np.float32)
h, w, _ = im.shape
# background colour varies a little top to bottom: model it per row from the outer 6% columns
edge = np.concatenate([im[:, : w // 16], im[:, -w // 16 :]], axis=1)
bg = np.median(edge, axis=1)[:, None, :]
diff = np.abs(im - bg).max(axis=2)
mask = diff > 18
# drop the floor shadow: a soft, low-contrast band at the bottom
m = Image.fromarray((mask * 255).astype(np.uint8)).filter(ImageFilter.MedianFilter(7))
mask = np.asarray(m) > 127
# keep the largest connected blob
from collections import deque
lab = np.zeros(mask.shape, np.int32); best, best_n, cur = 0, 0, 0
for y0, x0 in zip(*np.nonzero(mask)):
    if lab[y0, x0]:
        continue
    cur += 1; n = 0; q = deque([(y0, x0)]); lab[y0, x0] = cur
    while q:
        y, x = q.popleft(); n += 1
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and mask[yy, xx] and not lab[yy, xx]:
                lab[yy, xx] = cur; q.append((yy, xx))
    if n > best_n:
        best, best_n = cur, n
mask = lab == best
# fill holes (grey cloth that matches the backdrop): anything the outside can't reach is inside
outside = np.zeros_like(mask); q = deque()
for y in range(h):
    for x in (0, w - 1):
        if not mask[y, x]: outside[y, x] = True; q.append((y, x))
for x in range(w):
    for y in (0, h - 1):
        if not mask[y, x] and not outside[y, x]: outside[y, x] = True; q.append((y, x))
while q:
    y, x = q.popleft()
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        yy, xx = y + dy, x + dx
        if 0 <= yy < h and 0 <= xx < w and not mask[yy, xx] and not outside[yy, xx]:
            outside[yy, xx] = True; q.append((yy, xx))
mask = ~outside
# floor shadow: in the bottom rows keep only strong-contrast pixels (feet), not the soft shadow
rows = np.nonzero(mask.any(axis=1))[0]
foot_band = rows.max() - int(0.06 * (rows.max() - rows.min()))
mask[foot_band:] &= diff[foot_band:] > 45
np.save(dst, mask)
if len(sys.argv) > 3:
    Image.fromarray((mask * 255).astype(np.uint8)).save(sys.argv[3])
print("mask", mask.shape, mask.mean().round(3))
