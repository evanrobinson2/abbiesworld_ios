"""Clean the turnaround views for scoring (labels are right: front | side | back as drawn).
The cast shadows reach the crop edges and would count as object. In the bottom band, pixels whose
saturation is below the reed's (the beige shadow) are painted with the background colour.
Colours are left as drawn (the sheet is darker brown than the hero; the model uses the hero's straw)."""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../..'))
sys.path.insert(0, ROOT); import harness
MJ = os.path.join(ROOT, 'mj/hamper-whimsical'); OUT = os.path.join(HERE, 'views'); os.makedirs(OUT, exist_ok=True)

def clean(src):
    m, a = harness.target_mask(src)
    hsv = np.asarray(Image.open(src).convert('HSV')).astype(float)
    band = np.zeros_like(m); band[1250:] = True
    m &= ~(band & (hsv[..., 1] < 150))
    m = ndimage.binary_opening(m, iterations=2)
    lab, k = ndimage.label(m); sizes = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(sizes) + 1)
    bg = np.median(np.concatenate([a[:4].reshape(-1, 3), a[:, :4].reshape(-1, 3)]), 0)
    out = a.copy(); out[~m] = bg
    return Image.fromarray((out * 255).astype(np.uint8))

for v in ('front', 'side', 'back'):
    clean(os.path.join(MJ, f'view_{v}.png')).save(os.path.join(OUT, f'view_{v}.png'))
Image.open(os.path.join(MJ, 'hero.png')).save(os.path.join(OUT, 'hero.png'))
for v in ('front', 'side', 'back'):
    m, _ = harness.target_mask(os.path.join(OUT, f'view_{v}.png')); ys, xs = np.where(m)
    print(v, ys.min(), ys.max(), xs.min(), xs.max(), round(harness.aspect(m), 3))
