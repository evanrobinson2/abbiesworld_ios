"""Fit one prop to its reference image: multi-start camera search, shape fit on the silhouette, light fit on renders.
usage: python prop_fit.py props/NAME/params.json  (writes props/NAME/fit.json, renders, and logs to out/loss_log.jsonl)"""
import sys, os, json, copy, random, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
import build, props, loss, loss2, opt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
N = 384

def load(pdir):
    m = np.asarray(Image.open(os.path.join(pdir, 'mask.png')).convert('L').resize((N, N), Image.BILINEAR)) > 127
    rgb = np.asarray(Image.open(os.path.join(pdir, 'target.png')).convert('RGB').resize((N, N), Image.LANCZOS)).astype(float) / 255
    return m, rgb

def sil(p, m_t):
    objs = props.setup(p, N, N, with_stage=False)
    m_r = build.silhouette(p, objs, N, N)
    s, c = loss.sil_terms(m_r, m_t)
    return dict(sil=float(s), cham=float(c), total=float(0.5 * s + 3.0 * c)), m_r

def full(p, m_t, rgb_t, path, samples=24):
    objs = props.setup(p, N, N, with_stage=True)
    m_r = build.silhouette(p, objs, N, N)
    build.render(path, N, N, samples=samples)
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(float) / 255
    s, c = loss.sil_terms(m_r, m_t)
    from skimage.metrics import structural_similarity
    g_r, g_t = rgb.mean(-1), rgb_t.mean(-1)
    ss = 1 - structural_similarity(g_r, g_t, data_range=1.0)
    tone = float(np.abs(rgb - rgb_t).mean())
    st, _, _ = loss2.style_term(g_r, g_t, m_r, m_t)
    t = dict(sil=float(s), cham=float(c), ssim=float(ss), tone=tone, style=float(st))
    t['total'] = 0.35 * t['sil'] + 2.0 * t['cham'] + 0.25 * t['ssim'] + 0.6 * t['tone'] + 0.3 * t['style']
    ov = np.zeros((N, N, 3), np.uint8); ov[m_t & m_r] = 235; ov[m_t & ~m_r] = (60, 140, 255); ov[m_r & ~m_t] = (255, 90, 60)
    Image.fromarray(ov).save(path.replace('.png', '_sil.png'))
    return t

def es(p, spec, iters, f, stage, seed, log=True):
    rng = random.Random(seed)
    best = f(p); bl = best['total']; sigma = 1.0
    for k in range(iters):
        q = copy.deepcopy(p)
        for _ in range(rng.choice([1, 1, 2])):
            path, step = rng.choice(spec)
            opt.setp(q, path, opt.getp(q, path) + rng.gauss(0, step * sigma))
        t = f(q)
        acc = bool(t['total'] < bl)
        if log: opt.log(dict(iter=opt.next_iter(), stage=stage, reviser='numeric-es', kind='eval', accepted=acc, **{a: b for a, b in t.items() if isinstance(b, float)}))
        if acc: p, best, bl = q, t, t['total']; sigma = min(2, sigma * 1.15)
        else: sigma = max(0.25, sigma * 0.98)
    return p, best

CAM = [('cam.az', 4), ('cam.el', 3), ('cam.dist', 0.05), ('cam.tx', 0.01), ('cam.tz', 0.01), ('cam.focal', 3), ('place.yaw', 4)]
LIGHT = [('light.key_az', 10), ('light.key_el', 6), ('light.key_power', 200), ('light.key_size', 0.3), ('light.fill_power', 30),
         ('light.world_strength', 0.08), ('material.albedo', 0.03), ('exposure', 0.15), ('bg.0', 0.015), ('bg.1', 0.015), ('bg.2', 0.015)]

def main():
    ppath = sys.argv[1]; pdir = os.path.dirname(ppath); name = os.path.basename(pdir)
    p = json.load(open(ppath))
    m_t, rgb_t = load(pdir)
    fs = lambda q: sil(q, m_t)[0]
    t0 = time.time()
    # 1. multi-start camera: the silhouette alone can't tell which way a prop faces, so try several turns
    starts = []
    for az in p.get('az_starts', [-60, -30, 0, 30, 60]):
        q = copy.deepcopy(p); q['cam']['az'] = az
        q, b = es(q, CAM, 60, fs, f'prop-{name}-camstart', seed=int(az) + 100, log=False)
        starts.append((b['total'], az, q))
        print(name, 'start az', az, round(b['total'], 4), flush=True)
    starts.sort(key=lambda x: x[0])
    p = starts[0][2]
    opt.log(dict(iter=opt.next_iter(), stage=f'prop-{name}-camstart', reviser='multistart', kind='start', accepted=True, total=starts[0][0], starts=[(a, round(b, 4)) for b, a, _ in starts]))
    # 2. camera + shape on the silhouette
    shape = [(k, v) for k, v in p['shape_steps'].items()]
    p, b_shape = es(p, CAM + shape, p.get('iters', 600), fs, f'prop-{name}-shape', seed=1)
    print(name, 'shape', round(b_shape['total'], 4), flush=True)
    # 3. light, material and backdrop on renders
    fp = lambda q: full(q, m_t, rgb_t, os.path.join(pdir, '_fit.png'), samples=12)
    first = fp(p)
    p, b = es(p, LIGHT, p.get('light_iters', 30), fp, f'prop-{name}-light', seed=2)
    final = full(p, m_t, rgb_t, os.path.join(pdir, 'fit_render.png'), samples=48)
    json.dump(p, open(os.path.join(pdir, 'fit.json'), 'w'), indent=1)
    json.dump(dict(prop=name, starts=[(a, b_) for b_, a, _ in starts], after_shape_sil=b_shape, before_light=first, final=final, secs=round(time.time() - t0)), open(os.path.join(pdir, 'fit_summary.json'), 'w'), indent=1)
    print(name, 'final', json.dumps({k: round(v, 4) for k, v in final.items()}), flush=True)

if __name__ == '__main__':
    main()
