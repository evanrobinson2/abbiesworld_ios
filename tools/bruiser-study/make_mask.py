"""Reference silhouette for AW-STUDY-0021: the figure mask every arm is scored against.

Background is a smooth warm grey with a soft floor shadow; the figure is a cooler, more varied grey.
We model the backdrop per row from the left and right margins, take pixels far from it, keep the largest
component and fill holes. Output ref/mask.png (white = figure) and ref/bbox.json.
"""
import json
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

im = np.asarray(Image.open('ref/bruiser.png').convert('RGB')).astype(float)
H, W, _ = im.shape
margin = np.concatenate([im[:, :120], im[:, -120:]], 1)
bg = np.median(margin, 1)[:, None, :]                       # per-row backdrop colour
d = np.abs(im - bg).sum(-1)
lum = im.mean(-1); blue = im[..., 2] - im[..., 0]           # figure is cooler (bluer) than the warm backdrop
m = (d > 22) | (blue > 4)
# The floor shadow under the feet is warm and dark; cut it before closing, so the gap between the legs stays open.
warm_dark = (lum < 115) & (im[..., 0] - im[..., 2] > 5)
m &= ~(warm_dark & (np.arange(H)[:, None] > 955))
m = ndi.binary_opening(m, iterations=2)
lab, n = ndi.label(m)
m = lab == (1 + int(np.argmax(ndi.sum(m, lab, range(1, n + 1)))))
m = ndi.binary_fill_holes(ndi.binary_closing(m, iterations=3))
# What is left of the floor shadow is a thin sliver beside the feet: drop floor columns less than 22 px tall.
cnt = m[900:].sum(0)
mean_lum = (lum[900:] * m[900:]).sum(0) / np.maximum(cnt, 1)
thin = (cnt < 22) & (mean_lum < 125)                      # thin and dark: shadow, not a lit toe
m[900:, thin] = False
Image.fromarray((m * 255).astype(np.uint8)).save('ref/mask.png')
ys, xs = np.nonzero(m)
json.dump(dict(x0=int(xs.min()), x1=int(xs.max()), y0=int(ys.min()), y1=int(ys.max()), area=int(m.sum())), open('ref/bbox.json', 'w'))
print(xs.min(), xs.max(), ys.min(), ys.max(), m.mean())
