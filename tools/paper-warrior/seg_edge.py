"""Prop cut-out by flood-filling the backdrop from the image border, stopping at crisp object edges.
Soft cast-shadow edges don't stop the fill, so shadows end up as background. usage: seg_edge.py target.png mask.png [lo hi]"""
import sys
import numpy as np, cv2
from scipy import ndimage as ndi
img = cv2.imread(sys.argv[1]); H, W = img.shape[:2]
lo, hi = (int(sys.argv[3]), int(sys.argv[4])) if len(sys.argv) > 4 else (12, 30)
g = cv2.GaussianBlur(cv2.cvtColor(img, cv2.COLOR_BGR2GRAY), (0, 0), 1.0)
edges = cv2.Canny(g, lo, hi) > 0
edges = ndi.binary_closing(ndi.binary_dilation(edges, iterations=1), iterations=2)
free = ~edges
lab, n = ndi.label(free)
border_labels = set(np.unique(np.r_[lab[0], lab[-1], lab[:, 0], lab[:, -1]])) - {0}
bg = np.isin(lab, list(border_labels))
# big interior regions that look like backdrop (seen through arches) also count as background
f = img.astype(float); bgcol = np.median(f[bg], axis=0)
for l in range(1, n + 1):
    if l in border_labels: continue
    reg = lab == l
    if reg.sum() > 0.004 * H * W and np.linalg.norm(f[reg].mean(0) - bgcol) < 14:
        bg |= reg
fg = ~bg
fg = ndi.binary_opening(fg, iterations=2)
lab2, n2 = ndi.label(fg); sizes = ndi.sum(fg, lab2, range(1, n2 + 1))
fg = np.isin(lab2, 1 + np.nonzero(sizes > 0.002 * H * W)[0])
cv2.imwrite(sys.argv[2], (fg * 255).astype(np.uint8)); print('area', round(fg.mean(), 3))
