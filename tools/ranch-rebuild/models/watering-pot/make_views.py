"""views/hero.png: the MJ hero keyed by hue (the orange pot kept, the cream backdrop and grey-brown cast shadow
dropped), on a flat backdrop so harness.target_mask reads it cleanly."""
import os
import numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__))
a = np.asarray(Image.open(os.path.join(HERE, '..', '..', 'mj', 'watering-pot', 'hero.png')).convert('RGB')).astype(float) / 255
mx, mn = a.max(-1), a.min(-1); sat = (mx - mn) / np.maximum(mx, 1e-3)
hsv = np.asarray(Image.fromarray((a * 255).astype(np.uint8)).convert('HSV')).astype(float) / 255
m = (hsv[..., 0] < 0.088) & (hsv[..., 1] > 0.33)   # pot hue ~0.06-0.07; the cast shadow is ~0.10 and greyer
m = ndimage.binary_opening(m, iterations=2); m = ndimage.binary_closing(m, iterations=3)
lab, k = ndimage.label(m); sizes = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(sizes) + 1)

out = np.full(a.shape, (0.95, 0.91, 0.82)); out[m] = (0.80, 0.42, 0.18)
Image.fromarray((out * 255).astype(np.uint8)).save(os.path.join(HERE, 'views', 'hero.png'))
print('mask px', int(m.sum()))
