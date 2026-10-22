"""Cut-out for a figure on a smooth studio backdrop: edge flood-fill for the outline (drops soft floor shadows), then
remove enclosed gaps (between legs, arm and body) wherever the colour matches a smooth backdrop model fitted to the
pixels outside the figure. usage: seg_mv.py target.png edge_mask.png out_mask.png [tol]"""
import sys
import numpy as np, cv2
from scipy import ndimage as ndi
img = cv2.imread(sys.argv[1]).astype(float); H, W = img.shape[:2]
em = cv2.imread(sys.argv[2], 0) > 127
tol = float(sys.argv[4]) if len(sys.argv) > 4 else 16
ys, xs = np.mgrid[0:H, 0:W]; u, v = xs / W, ys / H
def basis(u, v): return np.stack([np.ones_like(u), u, v, u * u, u * v, v * v, v ** 3, u * u * v, u * v * v], -1)
bgpix = ~ndi.binary_dilation(em, iterations=6)
B = basis(u[bgpix], v[bgpix]); coef, *_ = np.linalg.lstsq(B, img[bgpix], rcond=None)
pred = basis(u, v) @ coef
d = np.linalg.norm(img - pred, axis=-1)
like_bg = ndi.binary_opening(d < tol, iterations=3)
# only remove backdrop-like regions that are reasonably big (true gaps), not stray pixels on paper
lab, n = ndi.label(like_bg & em); sizes = ndi.sum(like_bg & em, lab, range(1, n + 1))
gaps = np.isin(lab, 1 + np.nonzero(sizes > 0.0004 * H * W)[0])
fg = em & ~gaps
fg = ndi.binary_opening(fg, iterations=1)
lab2, n2 = ndi.label(fg); s2 = ndi.sum(fg, lab2, range(1, n2 + 1))
fg = np.isin(lab2, 1 + np.nonzero(s2 > 0.002 * H * W)[0])
cv2.imwrite(sys.argv[3], (fg * 255).astype(np.uint8)); print('area', round(fg.mean(), 3), 'gaps removed', round(gaps.mean(), 4))
# second pass: add thin near-neutral parts the edge fill missed (a sword blade), drop backdrop-tinted floor between the feet,
# and close small holes inside the figure
b_, g_, r_ = img[..., 0], img[..., 1], img[..., 2]
teal = (g_ + b_) / 2 - r_
floor_y = int(np.nonzero(em.any(1))[0].max())          # lowest figure row = where the feet meet the floor
neutral = (teal < 12) & (np.arange(H)[:, None] < floor_y - 0.06 * H)
neutral = ndi.binary_opening(neutral, iterations=1)
lab3, n3 = ndi.label(neutral); s3 = ndi.sum(neutral, lab3, range(1, n3 + 1))
fg |= np.isin(lab3, 1 + np.nonzero(s3 > 0.0008 * H * W)[0])
low = np.arange(H)[:, None] > floor_y - 0.08 * H
fg &= ~ndi.binary_opening(low & (teal > 24), iterations=2)
holes = ndi.binary_fill_holes(fg) & ~fg
lab4, n4 = ndi.label(holes); s4 = ndi.sum(holes, lab4, range(1, n4 + 1))
fg |= np.isin(lab4, 1 + np.nonzero(s4 < 0.0015 * H * W)[0])
cv2.imwrite(sys.argv[3], (fg * 255).astype(np.uint8)); print('final area', round(fg.mean(), 3))
