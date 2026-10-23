"""Row profiles (left/right extent, in tree-heights, about trunk centre at 10% height) for target vs render."""
import sys, numpy as np
sys.path.insert(0, '../..'); import harness
def prof(m):
    ys, xs = np.where(m); y0, y1 = ys.min(), ys.max(); H = y1 - y0
    yb = int(y1 - 0.1 * H); row = np.where(m[yb])[0]; cx = (row.min() + row.max()) / 2
    out = []
    for f in np.arange(0.05, 1.0, 0.05):
        y = int(y1 - f * H); r = np.where(m[y])[0]
        out.append((f, (r.min() - cx) / H if len(r) else 0, (r.max() - cx) / H if len(r) else 0, len(r) / H))
    return out
for v in ['front', 'side', 'back']:
    t = prof(harness.target_mask(f'views/view_{v}.png')[0]); r = prof(harness.render_mask(f'r/{v}.png')[0])
    print(v, ' h   tgtL  tgtR  fill |  renL  renR  fill')
    for a, b in zip(t, r):
        print(f'  {a[0]:.2f} {a[1]:+.2f} {a[2]:+.2f} {a[3]:.2f} | {b[1]:+.2f} {b[2]:+.2f} {b[3]:.2f}')
