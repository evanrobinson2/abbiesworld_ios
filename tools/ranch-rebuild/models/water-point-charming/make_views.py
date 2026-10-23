"""views/hero.png: the charming MJ hero with its backdrop flattened, so the harness's target mask is the object only.
The harness mask already drops this hero's cast shadow (it is a hue-neutral darkening of the cream backdrop), so the
mask is taken as is and everything outside it is painted with the flat backdrop colour.
The turnaround sheet (mj/water-point-charming/view_*.png) is not scored: it draws a different, rounded tub-shaped
well with the posts at the middle of the sides and the pump in front, which the hero contradicts (hero wins)."""
import sys, os
import numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness
SRC = os.path.join(HERE, '..', '..', 'mj', 'water-point-charming', 'hero.png')
m, a = harness.target_mask(SRC)
img = np.asarray(Image.open(SRC).convert('RGB')).copy()
img[~m] = np.array([250, 240, 214], np.uint8)
os.makedirs(os.path.join(HERE, 'views'), exist_ok=True)
Image.fromarray(img).save(os.path.join(HERE, 'views', 'hero.png'))
m2, _ = harness.target_mask(os.path.join(HERE, 'views', 'hero.png'))
Image.fromarray((m2 * 255).astype(np.uint8)).resize((512, 512)).save(os.path.join(HERE, 'views', '_mask_hero.png'))
print('views/hero.png written, mask px', int(m2.sum()), 'vs source', int(m.sum()))
