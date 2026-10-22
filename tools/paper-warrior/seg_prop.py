"""Generic prop cut-out: fit a smooth background from the border, score colour/brightness deviation,
drop cast shadows (darker than the backdrop with the same hue). usage: seg_prop.py target.png mask.png [thr]"""
import sys
from PIL import Image; import numpy as np
from scipy import ndimage as ndi
im = np.asarray(Image.open(sys.argv[1]).convert('RGB')).astype(float); H, W, _ = im.shape
thr = float(sys.argv[3]) if len(sys.argv) > 3 else 0.5
yy, xx = np.mgrid[0:H, 0:W] / max(H, W)
border = np.zeros((H, W), bool); b = 40; border[:b] = border[-b:] = True; border[:, :b] = border[:, -b:] = True
def basis(x, y): return np.stack([np.ones_like(x), x, y, x * x, x * y, y * y, x ** 3, y ** 3, x * x * y, x * y * y], -1)
mask_bg = border
est = np.zeros_like(im)
for it in range(2):
    A = basis(xx[mask_bg], yy[mask_bg]); B = basis(xx, yy)
    for c in range(3):
        coef, *_ = np.linalg.lstsq(A, im[..., c][mask_bg], rcond=None); est[..., c] = B @ coef
    def chroma(x): return x / (x.sum(-1, keepdims=True) + 1e-3)
    dc = np.linalg.norm(chroma(im) - chroma(est), axis=-1) * 60
    dl = (im.mean(-1) - est.mean(-1)) / 25
    score = np.maximum(dc, 0) + np.maximum(dl, 0) + np.maximum(-dl, 0) * (dc > 0.5)
    mask_bg = score < 0.25
ratio = im.mean(-1) / (est.mean(-1) + 1e-3)
fg = (ratio > 1.035) | (ratio < 0.72) | (dc > 2.2)
fg = ndi.binary_opening(fg, iterations=2)
lab, n = ndi.label(fg); sizes = ndi.sum(fg, lab, range(1, n + 1))
fg = np.isin(lab, 1 + np.nonzero(sizes > 0.002 * H * W)[0])
fg = ndi.binary_fill_holes(ndi.binary_closing(fg, iterations=3))
Image.fromarray((fg * 255).astype(np.uint8)).save(sys.argv[2])
Image.fromarray(np.clip(score * 120, 0, 255).astype(np.uint8)).save(sys.argv[2].replace('.png', '_score.png'))
ys, xs = np.nonzero(fg); print('bbox', xs.min(), xs.max(), ys.min(), ys.max(), 'area', round(fg.mean(), 3))
