"""Build + score with loss v2.  usage: run2.py params.json out_prefix [--level L] [--samples S] [--style name]"""
import sys, os, json, argparse, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import build, loss2

HERE = os.path.dirname(os.path.abspath(__file__)); REF = os.path.join(HERE, '..', 'ref')
_T = {}

def evaluate(p, out_prefix, level=1, samples=32, post=None):
    t0 = time.time()
    parts = build.setup(p, level=level, W=loss2.N2, H=loss2.N2, with_stage=True)
    if post: parts = post(p, parts)
    m_r = build.silhouette(p, parts, loss2.N2, loss2.N2)
    path = out_prefix + '_render.png'
    build.render(path, loss2.N2, loss2.N2, samples=samples)
    if not _T:
        _T['m'] = loss2.load_mask(os.path.join(REF, 'mask.png')); _T['rgb'] = loss2.load_rgb(os.path.join(REF, 'target.png'))
    t = loss2.score(m_r, _T['m'], loss2.load_rgb(path), _T['rgb'])
    t['secs'] = round(time.time() - t0, 1)
    ov = np.zeros((loss2.N2, loss2.N2, 3), np.uint8); m_t = _T['m']
    ov[m_t & m_r] = (235, 235, 235); ov[m_t & ~m_r] = (60, 140, 255); ov[m_r & ~m_t] = (255, 90, 60)
    Image.fromarray(ov).save(out_prefix + '_sil.png')
    json.dump(t, open(out_prefix + '_score.json', 'w'), indent=1)
    return t

if __name__ == '__main__':
    ap = argparse.ArgumentParser(); ap.add_argument('params'); ap.add_argument('out')
    ap.add_argument('--level', type=int, default=1); ap.add_argument('--samples', type=int, default=32)
    a = ap.parse_args()
    t = evaluate(json.load(open(a.params)), a.out, a.level, a.samples)
    print(json.dumps({k: round(v, 4) for k, v in t.items()}))
