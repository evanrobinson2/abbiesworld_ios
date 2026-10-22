"""Rebuild views/ from the turnaround sheet so the harness masks see the figure, not the floor:
- the sheet's backdrop is a gradient, so the background is fitted (quadratic in x, y) and the figure is what
  differs from that fit; the floor's contact shadow (a darker, yellower beige under the feet) is painted out;
- clean cuts between views, whose hats and baskets overlap in x on the sheet;
- light cream parts inside the silhouette (sleeves, hat underside) are nudged off the background colour
  so the harness's colour-difference mask keeps them;
- the side view is mirrored: the sheet draws the figure facing right, the harness side camera sees it facing left."""
import numpy as np, os
from PIL import Image
from scipy import ndimage
H = os.path.dirname(os.path.abspath(__file__))
a = np.asarray(Image.open(os.path.join(H, '../../mj/seller-whimsical/turnaround.png')).convert('RGB')).astype(float)
h, w, _ = a.shape
yy, xx = np.mgrid[0:h, 0:w] / np.array([h, w])[:, None, None]
crude = np.linalg.norm((a - a[:6].reshape(-1, 3).mean(0)) / 255., axis=-1) < 0.06
crude[1250:] = False                                                  # fit only the wall, not the floor
A = np.stack([np.ones_like(xx), xx, yy, xx * xx, yy * yy, xx * yy], -1)
coef = np.linalg.lstsq(A[crude][::50], a[crude][::50], rcond=None)[0]
bgfit = A @ coef
d = np.linalg.norm((a - bgfit) / 255., axis=-1)
m = d > 0.055
R, G, B = a[..., 0], a[..., 1], a[..., 2]
floor = np.zeros_like(m); floor[1300:] = True
shadow = floor & (R - G >= -2) & (R - G <= 35) & (G < 225) & (B > 0.43 * G)
m &= ~shadow
m = ndimage.binary_opening(m, iterations=2)
bg = a[:6].reshape(-1, 3).mean(0)
os.makedirs(os.path.join(H, 'views'), exist_ok=True)
for name, (x0, x1), flip in [('front', (0, 1060), False), ('side', (950, 1866), True), ('back', (1866, 2912), False)]:
    mm = m[:, x0:x1].copy(); im = a[:, x0:x1].copy()
    if name == 'front': mm[800:, 960 - x0:] = False          # the side view's basket reaches under the front hat
    if name == 'side': mm[:800, :1068 - x0] = False          # the front view's hat brim reaches over the side basket
    cols = np.where(mm[1270:1300].any(0))[0]                  # under the hem keep only what is below the skirt (feet)
    keep = np.zeros(mm.shape[1], bool); keep[max(0, cols.min() - 10):cols.max() + 10] = True
    mm[1300:, ~keep] = False
    lab, k = ndimage.label(mm); s = ndimage.sum(mm, lab, range(1, k + 1))
    mm = np.isin(lab, np.where(s >= 0.002 * s.max())[0] + 1)
    mm = ndimage.binary_closing(mm, iterations=5)
    mm = ndimage.binary_fill_holes(mm)
    mm = ndimage.binary_opening(mm, iterations=3)
    out = np.where(mm[..., None], im, bg)
    weak = mm & (np.linalg.norm((out - bg) / 255., axis=-1) <= 0.13)
    out[weak] = out[weak] * 0.82
    o = Image.fromarray(out.clip(0, 255).astype(np.uint8))
    if flip: o = o.transpose(Image.FLIP_LEFT_RIGHT)
    pad = Image.new('RGB', (o.width + 80, o.height), tuple(int(c) for c in bg)); pad.paste(o, (40, 0))
    pad.save(os.path.join(H, 'views', f'view_{name}.png'))
Image.open(os.path.join(H, '../../mj/seller-whimsical/hero.png')).save(os.path.join(H, 'views', 'hero.png'))
