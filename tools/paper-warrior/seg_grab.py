"""Prop cut-out with GrabCut seeded by a background-deviation score. Shadows (darker, same hue) are marked probable background.
usage: seg_grab.py target.png mask.png"""
import sys
import numpy as np, cv2
from scipy import ndimage as ndi
img = cv2.imread(sys.argv[1]); H, W = img.shape[:2]
f = img.astype(float)
yy, xx = np.mgrid[0:H, 0:W] / max(H, W)
border = np.zeros((H, W), bool); b = 30; border[:b] = border[-b:] = True; border[:, :b] = border[:, -b:] = True
def basis(x, y): return np.stack([np.ones_like(x), x, y, x * x, x * y, y * y], -1)
A = basis(xx[border], yy[border]); B = basis(xx, yy); est = np.zeros_like(f)
for c in range(3):
    coef, *_ = np.linalg.lstsq(A, f[..., c][border], rcond=None); est[..., c] = B @ coef
ratio = f.mean(-1) / (est.mean(-1) + 1e-3)
chroma = lambda x: x / (x.sum(-1, keepdims=True) + 1e-3)
dc = np.linalg.norm(chroma(f) - chroma(est), axis=-1) * 60
gm = np.hypot(*np.gradient(cv2.GaussianBlur(f.mean(-1), (0, 0), 1.2)))
mask = np.full((H, W), cv2.GC_PR_BGD, np.uint8)
sure_fg = (ratio > 1.06) | (ratio < 0.65)
mask[ndi.binary_dilation(sure_fg, iterations=2)] = cv2.GC_PR_FGD
mask[ndi.binary_erosion(sure_fg, iterations=3)] = cv2.GC_FGD
mask[border] = cv2.GC_BGD
far = ~ndi.binary_dilation(sure_fg | (gm > 4), iterations=25); mask[far] = cv2.GC_BGD
bgd, fgd = np.zeros((1, 65)), np.zeros((1, 65))
cv2.grabCut(img, mask, None, bgd, fgd, 6, cv2.GC_INIT_WITH_MASK)
fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
lab, n = ndi.label(fg); sizes = ndi.sum(fg, lab, range(1, n + 1))
fg = np.isin(lab, 1 + np.nonzero(sizes > 0.003 * H * W)[0])
fg = ndi.binary_opening(fg, iterations=1)
cv2.imwrite(sys.argv[2], (fg * 255).astype(np.uint8))
print('area', round(fg.mean(), 3))
