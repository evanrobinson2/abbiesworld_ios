"""Cut-out for paper-white subjects on a saturated backdrop: paper is near-neutral, the teal backdrop (and its shadows) is not.
usage: seg_chroma.py target.png mask.png [hue_gap]"""
import sys
import numpy as np, cv2
from scipy import ndimage as ndi
img = cv2.imread(sys.argv[1]).astype(float); H, W = img.shape[:2]
b, g, r = img[..., 0], img[..., 1], img[..., 2]
# teal: green and blue well above red. paper: red close to green and blue (cream even has red on top)
teal = ((g + b) / 2 - r)
thr = float(sys.argv[3]) if len(sys.argv) > 3 else 22
lum = img.mean(-1)
fg = (teal < thr) & (lum > 75) | (teal < thr - 12) & (lum > 45)
fg = ndi.binary_opening(fg, iterations=2)
fg = ndi.binary_fill_holes(ndi.binary_closing(fg, iterations=2)) & ~((teal > thr + 15) & ~fg)
lab, n = ndi.label(fg); sizes = ndi.sum(fg, lab, range(1, n + 1))
fg = np.isin(lab, 1 + np.nonzero(sizes > 0.002 * H * W)[0])
cv2.imwrite(sys.argv[2], (fg * 255).astype(np.uint8)); print('area', round(fg.mean(), 3))
