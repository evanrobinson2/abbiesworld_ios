"""Relabel and clean the turnaround views for scoring.
Midjourney drew end | long face | end. The long face is our front (-Y), the left end is the side (+X),
and back (+Y) is the long face mirrored (the sheet has no back view; it is the same silhouette).
The cast shadows touch the image edges and would count as object, so rows in the shadow band are
limited to the body's column span measured just above the shadow."""
import sys, os, numpy as np
from PIL import Image
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '../..'))
sys.path.insert(0, ROOT); import harness
MJ = os.path.join(ROOT, 'mj/hamper-upgrade'); OUT = os.path.join(HERE, 'views'); os.makedirs(OUT, exist_ok=True)

def clean(src):
    m, a = harness.target_mask(src)
    h, w = m.shape
    edge = m[:, 0] | m[:, -1]
    rows = np.where(edge)[0]
    if len(rows):
        top = rows.min()
        ref = np.where(m[top - 12])[0]
        # body span: largest run in that row
        runs = np.split(ref, np.where(np.diff(ref) > 1)[0] + 1); r = max(runs, key=len)
        xl, xr = r.min() - 4, r.max() + 4
        m[top - 12:, :xl] = False; m[top - 12:, xr:] = False
    bg = np.median(np.concatenate([a[:4].reshape(-1, 3), a[:, :4].reshape(-1, 3)]), 0)
    out = a.copy(); out[~m] = bg
    return Image.fromarray((out * 255).astype(np.uint8))

front = clean(os.path.join(MJ, 'view_side.png'))
front.save(os.path.join(OUT, 'view_front.png'))
front.transpose(Image.FLIP_LEFT_RIGHT).save(os.path.join(OUT, 'view_back.png'))
clean(os.path.join(MJ, 'view_front.png')).save(os.path.join(OUT, 'view_side.png'))
Image.open(os.path.join(MJ, 'hero.png')).save(os.path.join(OUT, 'hero.png'))
for v in ('front', 'side', 'back'):
    m, _ = harness.target_mask(os.path.join(OUT, f'view_{v}.png')); ys, xs = np.where(m)
    print(v, ys.min(), ys.max(), xs.min(), xs.max(), round(harness.aspect(m), 3))
