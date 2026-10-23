"""Masks (GrabCut) for the hero's turnaround views (ref/turnaround/view_*.png, cut from MJ job 2efa3cb8 image 3), normalised to
the Bruiser study frame (crown row 53, soles row 987 of 1024, centred) so tools/contour can carve them with that stage.
Writes ref/views/mj_<view>.png and mj_<view>_mask.png."""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'bruiser-study'))
from ref_views import normalise  # noqa: E402
import cv2  # noqa: E402


def figure_mask(path):
    """GrabCut from a rectangle just inside the crop (the backdrop is a vignetted grey close to the figure's own grey,
    so a fixed colour threshold fails here). The bottom 30 px start as backdrop, which keeps the floor shadow out."""
    im = cv2.imread(path); h, w = im.shape[:2]; pad = 60
    big = cv2.copyMakeBorder(im, pad, pad, pad, pad, cv2.BORDER_REPLICATE)
    mask = np.zeros(big.shape[:2], np.uint8); bgd = np.zeros((1, 65)); fgd = np.zeros((1, 65))
    cv2.grabCut(big, mask, (pad - 2, pad - 2, w + 4, h - 26), bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
    return ((mask == 1) | (mask == 3))[pad:pad + h, pad:pad + w]

out = os.path.join(HERE, 'ref', 'views'); os.makedirs(out, exist_ok=True)
for v in ('front', 'side', 'back'):
    im = np.asarray(Image.open(os.path.join(HERE, 'ref', 'turnaround', f'view_{v}.png')).convert('RGB')).astype(float)
    m = figure_mask(os.path.join(HERE, 'ref', 'turnaround', f'view_{v}.png'))
    lab, n = ndi.label(m)
    m = lab == (1 + int(np.argmax(ndi.sum(m, lab, range(1, n + 1)))))
    ys = np.nonzero(m)[0]; f0 = int(ys.max() - 0.06 * (ys.max() - ys.min()))
    m[f0:, m[f0:].sum(0) < 0.03 * (ys.max() - ys.min())] = False
    holes = ndi.binary_fill_holes(m) & ~m                     # fill only specks, keep the gaps between legs and arms
    lab, n = ndi.label(holes); sizes = ndi.sum(holes, lab, range(1, n + 1))
    m |= np.isin(lab, 1 + np.nonzero(sizes < 400)[0])
    nm, rgb = normalise(m, im)
    Image.fromarray((nm * 255).astype(np.uint8)).save(os.path.join(out, f'mj_{v}_mask.png'))
    rgb.save(os.path.join(out, f'mj_{v}.png'))
    print(v, im.shape, m.mean().round(3))
