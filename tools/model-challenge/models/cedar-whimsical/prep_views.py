"""Clean the turnaround views for scoring. Labels are right (front and side show the door, back shows the swing),
but each crop has the sheet's cast-shadow band touching both edges and a sliver of the neighbouring tree.
Rows in the shadow band are limited to the base's column span, and only the largest component is kept."""
import sys, os, numpy as np
from PIL import Image
from scipy import ndimage
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../..'))
sys.path.insert(0, ROOT); import harness
MJ = os.path.join(ROOT, 'mj/cedar-whimsical'); OUT = os.path.join(HERE, 'views'); os.makedirs(OUT, exist_ok=True)

def clean(src):
    m, a = harness.target_mask(src)
    edge = m[:, 0] | m[:, -1]
    rows = np.where(edge)[0]
    rows = rows[rows > m.shape[0] * 0.8]          # only the ground shadow band, not neighbour slivers higher up
    if len(rows):
        top = rows.min()
        ref = np.where(m[top - 12])[0]
        runs = np.split(ref, np.where(np.diff(ref) > 1)[0] + 1); r = max(runs, key=len)
        xl, xr = r.min() - 30, r.max() + 30
        m[top - 12:, :xl] = False; m[top - 12:, xr:] = False
    lab, k = ndimage.label(m)
    if k:
        sizes = ndimage.sum(m, lab, range(1, k + 1)); m = lab == (np.argmax(sizes) + 1)
    bg = np.median(np.concatenate([a[:4].reshape(-1, 3), a[:, :4].reshape(-1, 3)]), 0)
    out = a.copy(); out[~m] = bg
    return Image.fromarray((out * 255).astype(np.uint8))

for v in ('front', 'side', 'back'):
    clean(os.path.join(MJ, f'view_{v}.png')).save(os.path.join(OUT, f'view_{v}.png'))
Image.open(os.path.join(MJ, 'hero.png')).save(os.path.join(OUT, 'hero.png'))
for v in ('front', 'side', 'back'):
    m, _ = harness.target_mask(os.path.join(OUT, f'view_{v}.png')); ys, xs = np.where(m)
    print(v, ys.min(), ys.max(), xs.min(), xs.max(), round(harness.aspect(m), 3))
