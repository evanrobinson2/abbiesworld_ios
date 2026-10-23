"""Width profiles of target vs render (both normalised to height 1), for tuning.  usage: python prof.py [view]"""
import sys, os
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', '..', 'model-challenge'))
import harness
v = sys.argv[1] if len(sys.argv) > 1 else 'front'
tp = os.path.join(HERE, 'views', 'side' if v == 'side' else '', f'view_{v}.png')
for lab, (m, _) in (('target', harness.target_mask(tp)), ('render', harness.render_mask(os.path.join(HERE, 'r', f'{v}.png')))):
    ys, xs = np.where(m); H = ys.max() - ys.min(); out = []
    for f in np.arange(0.0, 1.0, 0.05):
        y = int(ys.max() - f * H); r = np.where(m[y])[0]
        out.append('%.2f' % ((r.max() - r.min()) / H) if len(r) else ' -  ')
    print(lab, ' '.join(out))
print('h     ', ' '.join('%.2f' % f for f in np.arange(0.0, 1.0, 0.05)))
