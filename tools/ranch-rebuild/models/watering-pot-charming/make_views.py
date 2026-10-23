"""views/hero.png: the MJ charming hero keyed by hue (the orange pot kept, the cream backdrop and the browner cast
shadow to the left dropped), on a flat backdrop so harness.target_mask reads it cleanly. Specular highlights are pale
but keep the pot hue, so small holes are filled; the big hole inside the handle loop stays open."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
a = np.asarray(Image.open(os.path.join(HERE, '..', '..', 'mj', 'watering-pot-charming', 'hero.png')).convert('RGB')).astype(float) / 255
hsv = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).convert('HSV')).astype(float) / 255
m = (hsv[..., 0] < 0.068) & (hsv[..., 1] > 0.10)   # pot hue ~0.04-0.06; the cast shadow is ~0.075-0.09
m = ndimage.binary_closing(m, iterations=4); m = ndimage.binary_opening(m, iterations=7)
lab, k = ndimage.label(m); sizes = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(sizes) + 1)
holes, k = ndimage.label(~m)
for i in range(1, k + 1):                         # fill highlight holes, keep the handle loop
    h = holes == i
    if h.sum() < 0.002 * m.size and not (h[0].any() or h[-1].any() or h[:, 0].any() or h[:, -1].any()):
        m |= h
out = np.full(a.shape, (0.95, 0.91, 0.82)); out[m] = (0.80, 0.42, 0.18)
Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
print('mask px', int(m.sum()))
