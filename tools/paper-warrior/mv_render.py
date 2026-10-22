"""Render the three turnaround views and score them against the Midjourney targets, optionally fitting light first.

usage: python mv_render.py params.json OUT_PREFIX [--light-iters N] [--px 384] [--samples 24]
For renders the figure turns instead of the camera (so the camera always faces the backdrop): a view at camera azimuth
A is rendered with the figure turned by -A and the camera at azimuth 0 with that view's focal and shift.
Writes OUT_PREFIX_{front,side,back}.png, OUT_PREFIX_sheet.jpg (targets over renders), OUT_PREFIX_score.json and,
when fitting light, OUT_PREFIX_lit.json.
"""
import sys, os, json, copy, random, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from PIL import Image
from skimage.metrics import structural_similarity
import build, loss, loss2, opt
import mv_fit

ROOT = mv_fit.ROOT

def view_params(p, v):
    q = copy.deepcopy(p)
    q['fig']['yaw'] = p['fig'].get('yaw', 0.0) - p['mv'][v]['az']
    q['cam'] = dict(p['cam']); q['cam'].update(p['mv'][v]); q['cam']['az'] = 0.0
    return q

def render_view(p, v, path, px, samples):
    q = view_params(p, v)
    parts = build.setup(q, level=2, W=px, H=px, with_stage=True)
    build.render(path, px, px, samples=samples)
    return build.silhouette(q, parts, px, px)

def score_view(path, m_r, v, px):
    rgb = np.asarray(Image.open(path).convert('RGB')).astype(float) / 255
    rgb_t = np.asarray(Image.open(os.path.join(ROOT, 'mv', f'{v}_sq.png')).convert('RGB').resize((px, px), Image.LANCZOS)).astype(float) / 255
    m_t = loss.load_mask(os.path.join(ROOT, 'mv', f'{v}_mask.png'), px)
    s, c = loss.sil_terms(m_r, m_t)
    g, gt = rgb.mean(-1), rgb_t.mean(-1)
    t = dict(sil=float(s), cham=float(c), ssim=float(1 - structural_similarity(g, gt, data_range=1.0)),
             tone=float(np.abs(rgb - rgb_t).mean()), style=float(loss2.style_term(g, gt, m_r, m_t)[0]))
    t['total'] = 0.35 * t['sil'] + 2.0 * t['cham'] + 0.25 * t['ssim'] + 0.6 * t['tone'] + 0.3 * t['style']
    return t, rgb_t

def all_views(p, prefix, px, samples):
    out, tiles = {}, []
    for v in mv_fit.VIEWS:
        path = f'{prefix}_{v}.png'
        m = render_view(p, v, path, px, samples)
        out[v], rgb_t = score_view(path, m, v, px)
        tiles.append((rgb_t, np.asarray(Image.open(path).convert('RGB')).astype(float) / 255))
    out['mean'] = {k: float(np.mean([out[v][k] for v in mv_fit.VIEWS])) for k in out['front']}
    return out, tiles

LIGHT = [('light.key_az', 10), ('light.key_el', 6), ('light.key_power', 200), ('light.key_size', 0.3), ('light.fill_power', 30),
         ('light.world_strength', 0.08), ('papercraft.material.albedo', 0.03), ('look.exposure', 0.15),
         ('look.bg_albedo.0', 0.015), ('look.bg_albedo.1', 0.015), ('look.bg_albedo.2', 0.015)]

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('params'); ap.add_argument('prefix')
    ap.add_argument('--light-iters', type=int, default=0); ap.add_argument('--px', type=int, default=384); ap.add_argument('--samples', type=int, default=24)
    a = ap.parse_args()
    p = json.load(open(a.params))
    if a.light_iters:
        rng = random.Random(5); tmp = a.prefix + '_tmp'
        best, _ = all_views(p, tmp, 192, 10); bl = best['mean']['total']
        for k in range(a.light_iters):
            q = copy.deepcopy(p)
            for _ in range(rng.choice([1, 2])):
                path, step = rng.choice(LIGHT); opt.setp(q, path, opt.getp(q, path) + rng.gauss(0, step))
            t, _ = all_views(q, tmp, 192, 10)
            acc = bool(t['mean']['total'] < bl)
            opt.log(dict(iter=opt.next_iter(), stage='r3-light', reviser='numeric-es', kind='eval', accepted=acc, **{f'{v}_{kk}': x for v in t for kk, x in t[v].items()}))
            if acc: p, bl = q, t['mean']['total']
            print('light', k, round(t['mean']['total'], 4), acc, flush=True)
        json.dump(p, open(a.prefix + '_lit.json', 'w'), indent=1)
    sc, tiles = all_views(p, a.prefix, a.px, a.samples)
    json.dump(sc, open(a.prefix + '_score.json', 'w'), indent=1)
    top = np.concatenate([t for t, _ in tiles], 1); bot = np.concatenate([r for _, r in tiles], 1)
    Image.fromarray((np.concatenate([top, bot], 0) * 255).astype(np.uint8)).save(a.prefix + '_sheet.jpg', quality=88)
    print(json.dumps({v: round(sc[v]['total'], 4) for v in sc}))

if __name__ == '__main__':
    main()
