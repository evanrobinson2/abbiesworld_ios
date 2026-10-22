"""Build + score one parameter set.  usage: python run.py params.json out_prefix [--render N] [--level L]"""
import sys, os, json, argparse, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import build, loss

HERE = os.path.dirname(os.path.abspath(__file__))
REF = os.path.join(HERE, '..', 'ref')

def evaluate(p, out_prefix=None, render_px=0, level=1, samples=48):
    t0 = time.time()
    parts = build.setup(p, level=level, W=loss.N, H=loss.N, with_stage=render_px > 0)
    m_r = build.silhouette(p, parts, loss.N, loss.N)
    m_t = loss.load_mask(os.path.join(REF, 'mask.png'))
    rgb_r = rgb_t = None
    if render_px:
        path = out_prefix + '_render.png'
        build.render(path, render_px, render_px, samples=samples)
        rgb_r = loss.load_rgb(path)
        rgb_t = loss.load_rgb(os.path.join(REF, 'target.png'))
    terms = loss.score(m_r, m_t, rgb_r, rgb_t)
    terms['secs'] = round(time.time() - t0, 2)
    if out_prefix:
        overlay = np.zeros((loss.N, loss.N, 3), np.uint8)
        overlay[m_t & m_r] = (235, 235, 235)
        overlay[m_t & ~m_r] = (60, 140, 255)   # missing (in reference, not in model): blue
        overlay[m_r & ~m_t] = (255, 90, 60)    # extra (in model, not in reference): red
        Image.fromarray(overlay).save(out_prefix + '_sil.png')
        json.dump(terms, open(out_prefix + '_score.json', 'w'), indent=1)
    return terms

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('params'); ap.add_argument('out')
    ap.add_argument('--render', type=int, default=0); ap.add_argument('--level', type=int, default=1)
    ap.add_argument('--samples', type=int, default=48)
    a = ap.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:])
    p = json.load(open(a.params))
    print(json.dumps(evaluate(p, a.out, a.render, a.level, a.samples)))
