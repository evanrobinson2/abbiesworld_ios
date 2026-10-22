"""Split a Midjourney turnaround sheet into its views by finding the objects, not by cutting the sheet into thirds.

usage: python split.py mj/<name>      (reads turnaround.png, writes view_front.png, view_side.png, view_back.png)

Midjourney rarely spaces the views evenly, so fixed thirds cut objects in half and leave slivers of the
neighbours. Here the foreground (pixels on an edge, since the backdrop is a smooth gradient) is projected onto the x axis, the
sheet is cut at the emptiest column near each third (bases and shadows often touch at the ground), and each
part is trimmed to its object. Left to right they become front, side and back (the order the prompt asks for). Each crop keeps the full sheet height plus a margin,
so every view shares the same vertical scale and ground line.
"""
import sys, os
import numpy as np
from PIL import Image
from scipy import ndimage


def split(d, n=3):
    im = Image.open(os.path.join(d, 'turnaround.png')).convert('RGB')
    a = np.asarray(im).astype(float) / 255
    g = ndimage.gaussian_filter(a.mean(-1), 1.5)              # the backdrop is a soft gradient, so look for edges
    e = np.hypot(ndimage.sobel(g, 0), ndimage.sobel(g, 1))    # (texture and outlines), not for a colour difference
    fg = e > 0.15
    fg[int(fg.shape[0] * 0.90):] = False                     # ignore floor shading at the bottom
    W = a.shape[1]
    p = ndimage.uniform_filter1d(fg.sum(0).astype(float), max(3, W // 150))
    # views overlap at the ground (shadows, bases), so cut at the emptiest column near each third
    c1 = int(0.2 * W) + int(np.argmin(p[int(0.2 * W):int(0.47 * W)]))
    c2 = int(0.53 * W) + int(np.argmin(p[int(0.53 * W):int(0.8 * W)]))
    names = ['front', 'side', 'back']; runs = []
    for name, (x0, x1) in zip(names, [(0, c1), (c1, c2), (c2, W)]):
        cols = np.where(p[x0:x1] > 0.02 * fg.shape[0])[0]
        lo, hi = (x0 + cols.min(), x0 + cols.max()) if len(cols) else (x0, x1 - 1)
        m = int(0.03 * W); lo, hi = max(x0, lo - m), min(x1, hi + m + 1)
        im.crop((lo, 0, hi, a.shape[0])).save(os.path.join(d, f'view_{name}.png')); runs.append((name, int(lo), int(hi)))
    return runs



if __name__ == '__main__':
    for d in sys.argv[1:]:
        print(d, split(d))
