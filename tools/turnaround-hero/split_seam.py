"""Split a turnaround sheet whose views touch: cut along low-cost seams, keep each view's own figure, refill the rest with the backdrop."""
import sys, numpy as np
from PIL import Image
from scipy import ndimage
# usage: python split_seam.py <sheet.png> <out_dir>
src, out = sys.argv[1], sys.argv[2]
ranges = [(380, 480), (590, 720)]
im = np.asarray(Image.open(src).convert('RGB')).astype(float)
H, W, _ = im.shape
g = ndimage.gaussian_filter(im.mean(-1), 1.5)
edge = np.hypot(ndimage.sobel(g, 0), ndimage.sobel(g, 1))
# figures: outlined shapes; fill the outlines to get solid silhouettes
fig = ndimage.binary_fill_holes(ndimage.binary_closing(edge > 25, iterations=4))
fig = ndimage.binary_opening(fig, iterations=2)
# backdrop: smooth 2D field from everything that is not a figure (normalized convolution)
free = ~ndimage.binary_dilation(fig, iterations=8)
w = ndimage.gaussian_filter(free.astype(float), 40)
bg = np.stack([ndimage.gaussian_filter(im[..., c] * free, 40) for c in range(3)], -1) / np.maximum(w, 1e-6)[..., None]
cost = np.abs(im - bg).max(-1) + edge
def seam(x0, x1):
    c = cost[:, x0:x1]; acc = c.copy(); back = np.zeros(c.shape, int)
    for y in range(1, H):
        prev = acc[y - 1]
        stack = np.stack([np.r_[np.inf, prev[:-1]], prev, np.r_[prev[1:], np.inf]])
        k = stack.argmin(0); back[y] = k - 1; acc[y] += stack.min(0)
    xs = np.zeros(H, int); xs[-1] = acc[-1].argmin()
    for y in range(H - 1, 0, -1): xs[y - 1] = xs[y] + back[y, xs[y]]
    return xs + x0
s1, s2 = seam(*ranges[0]), seam(*ranges[1])
cols = np.arange(W)[None, :]
regions = {'front': cols < s1[:, None], 'side': (cols >= s1[:, None]) & (cols < s2[:, None]), 'back': cols >= s2[:, None]}
ground = int(H * .90)
for name, m in regions.items():
    f = fig & m; f[ground:] = False
    lab, n = ndimage.label(f)
    keep = lab == (np.argmax(ndimage.sum(f, lab, range(1, n + 1))) + 1)
    keep[ground:] = m[ground:]                                # floor strip keeps its contact shadows
    keep = ndimage.binary_dilation(keep, iterations=3) & m
    o = np.where(keep[..., None], im, bg)
    xs = np.where(keep[:ground].any(0))[0]; pad = 30
    x0, x1 = max(0, xs.min() - pad), min(W, xs.max() + pad + 1)
    Image.fromarray(o[:, x0:x1].clip(0, 255).astype(np.uint8)).save(f'{out}/view_{name}.png')
    print(name, int(x0), int(x1))
print('seam1', s1.min(), s1.max(), 'seam2', s2.min(), s2.max())
