"""Round 3: fit the warrior to several views at once (a Midjourney turnaround sheet: front, left side, back).

usage: python mv_fit.py OUT_PREFIX --views front,side,back [--iters-scale 1.0] [--seed 0]
The figure is built once per candidate; each view only re-aims the camera and rasters the silhouette, so extra views
are cheap. Shared camera: distance, height, target. Per view: azimuth, focal (each crop has its own scale), lens shift.
Every evaluation is scored on ALL three views and logged, but only the views named in --views drive the search, so a
front-only fit can be judged on the views it never saw.
"""
import sys, os, json, copy, random, time, math, argparse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import bpy
import build, loss, opt

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
VIEWS = {'front': 0.0, 'side': 90.0, 'back': 180.0}   # camera azimuth; the figure faces -Y, its left hand is +X
N = 256
MT = {v: loss.load_mask(os.path.join(ROOT, 'mv', f'{v}_mask.png'), N) for v in VIEWS}

def neutral_pose(p):
    """Standing, arms hanging slightly out, feet under the hips, symmetric (the turnaround's 'neutral standing pose')."""
    J = {'pelvis': (0, 0, 1.0), 'abdomen': (0, 0, 1.18), 'chest': (0, 0, 1.38), 'neck': (0, 0, 1.55), 'head': (0, 0, 1.66)}
    for s, x in (('l', 1), ('r', -1)):
        J.update({f'{s}_shoulder': (0.19 * x, 0, 1.44), f'{s}_elbow': (0.25 * x, 0.01, 1.17), f'{s}_wrist': (0.28 * x, -0.02, 0.95),
                  f'{s}_hand': (0.28 * x, -0.04, 0.88), f'{s}_hip': (0.1 * x, 0, 1.0), f'{s}_knee': (0.12 * x, -0.01, 0.53),
                  f'{s}_ankle': (0.12 * x, 0.02, 0.11), f'{s}_toe': (0.13 * x, -0.11, 0.02)})
    p['joints'] = {k: list(v) for k, v in J.items()}
    p['fig'].update(x=0.0, y=0.0, yaw=0.0)
    p['helmet']['yaw'] = 0.0
    p['cam'].update(dist=8.5, height=1.0, target_z=0.92, focal=100.0, az=0.0, tx=0.0, shift_x=0.0, shift_y=0.0)
    p['mv'] = {v: dict(az=VIEWS[v], focal=100.0, shift_x=0.0, shift_y=0.0) for v in VIEWS}
    return p

def score_all(p, level=0):
    build.clear_scene()
    parts = build.build_figure(p, level, with_stage=False)
    out = {}
    for v in VIEWS:
        q = dict(p['cam']); q.update(p['mv'][v])
        for ob in [o for o in bpy.data.objects if o.type == 'CAMERA']: bpy.data.objects.remove(ob, do_unlink=True)
        build.build_camera(dict(p, cam=q), N, N)
        m = build.silhouette(p, parts, N, N)
        s, c = loss.sil_terms(m, MT[v])
        out[v] = dict(sil=float(s), cham=float(c), total=float(0.5 * s + 3.0 * c))
    return out

def objective(sc, views):
    return float(np.mean([sc[v]['total'] for v in views]))

def flat(sc, views):
    d = {f'{v}_{k}': x for v in sc for k, x in sc[v].items()}
    d['total'] = objective(sc, views); d['all3'] = objective(sc, list(VIEWS))
    return d

def es(p, spec, iters, views, stage, rng, sigma0=1.0):
    sc = score_all(p); best = objective(sc, views); sigma = sigma0
    for k in range(iters):
        q = copy.deepcopy(p); changed = []
        for _ in range(rng.choice([1, 1, 2, 3])):
            path, step = rng.choice(spec)
            opt.setp(q, path, opt.getp(q, path) + rng.gauss(0, step * sigma)); changed.append(path)
        s2 = score_all(q); t = objective(s2, views)
        acc = bool(t < best)
        opt.log(dict(iter=opt.next_iter(), stage=stage, reviser='numeric-es', kind='eval', accepted=acc, changed=changed, **flat(s2, views)))
        if acc: p, sc, best = q, s2, t; sigma = min(2.0, sigma * 1.15)
        else: sigma = max(0.25, sigma * 0.985)
    return p, sc

def cam_spec(views):
    s = [('cam.dist', 0.2), ('cam.height', 0.1), ('cam.target_z', 0.03)]
    for v in views:
        s += [(f'mv.{v}.focal', 3), (f'mv.{v}.shift_x', 0.01), (f'mv.{v}.shift_y', 0.01)]
        if v != 'front': s += [(f'mv.{v}.az', 3)]
    return s

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('out'); ap.add_argument('--views', default='front,side,back')
    ap.add_argument('--iters-scale', type=float, default=1.0); ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--init', default=os.path.join(ROOT, 'out', 'C_final.json'))
    a = ap.parse_args(); views = a.views.split(','); tag = 'r3-' + ('mv' if len(views) > 1 else views[0])
    rng = random.Random(a.seed); S = lambda n: int(n * a.iters_scale)
    p = neutral_pose(json.load(open(a.init)))
    t0 = time.time(); hist = []
    def mark(name):
        sc = score_all(p); hist.append(dict(stage=name, secs=round(time.time() - t0), **flat(sc, views)))
        print(tag, name, 'fit', round(hist[-1]['total'], 4), 'all3', round(hist[-1]['all3'], 4), flush=True)
    mark('start')
    # 1. camera framing per view
    p, _ = es(p, cam_spec(views), S(250), views, f'{tag}-camera', rng); mark('camera')
    # 2. shield: the silhouette can't tell which way a disc faces, so sweep its turn before polishing
    best = None
    for yaw in range(0, 360, 30):
        q = copy.deepcopy(p); q['shield']['yaw'] = float(yaw); t = objective(score_all(q), views)
        if best is None or t < best[0]: best = (t, yaw)
    p['shield']['yaw'] = float(best[1]); mark(f'shield-sweep-{best[1]}')
    # 3. pose and camera, then proportions, then the parts, then everything
    G = opt.GROUPS
    p, _ = es(p, G['pose'] + cam_spec(views), S(700), views, f'{tag}-pose', rng); mark('pose')
    p, _ = es(p, G['radii'] + G['pose'], S(700), views, f'{tag}-radii', rng); mark('radii')
    p, _ = es(p, G['shield'] + G['helmet'] + G['parts'] + G['skirt'], S(700), views, f'{tag}-parts', rng); mark('parts')
    p, _ = es(p, G['pose'] + G['radii'] + G['shield'] + G['helmet'] + G['parts'] + cam_spec(views), S(600), views, f'{tag}-all', rng, 0.6); mark('all')
    json.dump(p, open(a.out + '.json', 'w'), indent=1)
    json.dump(hist, open(a.out + '_hist.json', 'w'), indent=1)

if __name__ == '__main__':
    main()
