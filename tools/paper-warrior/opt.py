"""Numeric fit: (1+1) evolution strategy over chosen parameter paths, silhouette loss only (fast raster).

usage: python opt.py in.json out.json --groups camera,pose --iters 300 --stage NAME
Every evaluation is appended to out/loss_log.jsonl so the whole history is kept.
"""
import sys, os, json, argparse, time, random, copy, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import build, loss

HERE = os.path.dirname(os.path.abspath(__file__))
LOG = os.path.join(HERE, '..', 'out', 'loss_log.jsonl')

GROUPS = {
    'camera': [('cam.dist', 0.15), ('cam.height', 0.08), ('cam.target_z', 0.05), ('fig.yaw', 4), ('fig.x', 0.03), ('cam.tx', 0.03), ('cam.focal', 3)],
    'pose': [(f'joints.{j}.{i}', 0.02) for j in ['r_shoulder', 'r_elbow', 'r_wrist', 'r_hand', 'l_shoulder', 'l_elbow', 'l_wrist', 'l_hand',
                                                 'r_hip', 'r_knee', 'r_ankle', 'r_toe', 'l_hip', 'l_knee', 'l_ankle', 'l_toe', 'neck', 'head', 'chest', 'abdomen'] for i in range(3)],
    'radii': [(f'radii.{k}', 0.008) for k in ['pelvis', 'abdomen', 'chest', 'neck', 'r_shoulder', 'r_elbow', 'r_wrist', 'l_shoulder', 'l_elbow', 'l_wrist',
                                              'r_hip', 'r_knee', 'r_ankle', 'l_hip', 'l_knee', 'l_ankle']] + [('body.blobs.0.r', 0.01), ('body.blobs.1.r', 0.01), ('body.blobs.2.r', 0.01)],
    'shield': [('shield.off.0', 0.03), ('shield.off.1', 0.03), ('shield.off.2', 0.03), ('shield.w', 0.03), ('shield.h', 0.04), ('shield.yaw', 4), ('shield.pitch', 3), ('shield.roll', 3), ('shield.curve', 0.05)],
    'helmet': [('helmet.r.0', 0.008), ('helmet.r.1', 0.008), ('helmet.r.2', 0.008), ('helmet.off.2', 0.01), ('crest.len', 0.02), ('crest.a0', 5), ('crest.a1', 5), ('crest.rake', 5), ('crest.curl', 0.02), ('crest.lift', 0.01), ('helmet.cheek_len', 0.015)],
    'light': [('light.key_az', 8), ('light.key_el', 6), ('light.key_size', 0.4), ('light.key_power', 150), ('light.fill_power', 30), ('light.fill_az', 10),
              ('light.world_strength', 0.08), ('look.bg_albedo.0', 0.02), ('look.bg_albedo.1', 0.02), ('look.bg_albedo.2', 0.02), ('look.paper_albedo', 0.04), ('look.paper_rough', 0.05), ('look.crumple', 0.3), ('look.exposure', 0.15)],
    'light2': [('light.key_az', 8), ('light.key_el', 6), ('light.key_size', 0.3), ('light.key_power', 250), ('light.fill_power', 30),
               ('light.world_strength', 0.07), ('papercraft.material.albedo', 0.04), ('look.exposure', 0.15), ('look.bg_albedo.1', 0.015), ('look.bg_albedo.2', 0.015)],
    'camera_noh': [('cam.dist', 0.15), ('cam.target_z', 0.05), ('fig.yaw', 3), ('fig.x', 0.03), ('cam.tx', 0.03), ('cam.focal', 3)],
    'parts': [('skirt.rows.0.len', 0.02), ('skirt.rows.1.len', 0.02), ('skirt.rows.2.len', 0.02), ('skirt.rows.1.flare', 0.04), ('skirt.rows.2.flare', 0.04),
              ('skirt.rows.1.rx', 0.01), ('skirt.rows.2.rx', 0.01), ('shoulders.rows.0.len', 0.015), ('shoulders.rows.1.len', 0.015), ('shoulders.rows.0.r', 0.01), ('shoulders.rows.1.flare', 0.05),
              ('shield.w', 0.03), ('shield.h', 0.03), ('shield.yaw', 4), ('shield.curve', 0.04), ('shield.squareness', 0.08), ('shield.off.0', 0.02), ('shield.off.2', 0.02), ('shield.roll', 3),
              ('helmet.r.0', 0.006), ('helmet.r.1', 0.006), ('helmet.r.2', 0.006), ('crest.len', 0.02), ('crest.a0', 5), ('crest.a1', 5), ('crest.rake', 5), ('crest.curl', 0.02),
              ('bands.sole_w', 0.01), ('radii.r_ankle', 0.005), ('radii.l_ankle', 0.005), ('radii.r_toe', 0.005), ('radii.l_toe', 0.005)],
    'skirt': [('skirt.rows.0.len', 0.02), ('skirt.rows.0.flare', 0.04), ('skirt.rows.0.rx', 0.01), ('skirt.rows.0.ry', 0.01), ('skirt.rows.1.len', 0.02), ('skirt.rows.1.flare', 0.04), ('skirt.off.2', 0.015), ('skirt.front_long', 0.03),
              ('shoulders.rows.0.len', 0.015), ('shoulders.rows.0.flare', 0.05), ('shoulders.rows.1.len', 0.015), ('shoulders.rows.1.flare', 0.05)],
}

def getp(p, path):
    cur = p
    for k in path.split('.'):
        cur = cur[int(k)] if isinstance(cur, list) else cur[k]
    return cur

def setp(p, path, val):
    ks = path.split('.')
    cur = p
    for k in ks[:-1]:
        cur = cur[int(k)] if isinstance(cur, list) else cur[k]
    k = ks[-1]
    if isinstance(cur, list): cur[int(k)] = val
    else: cur[k] = val

MIRROR = {'r_': 'l_', 'l_': 'r_'}

def log(entry):
    with open(LOG, 'a') as f:
        f.write(json.dumps(entry) + '\n')

def next_iter():
    if not os.path.exists(LOG): return 0
    with open(LOG) as f:
        return sum(1 for _ in f)

RENDER = dict(px=0, samples=16, parts=False)
RGB_T = None

def sil_loss(p, m_t, level):
    global RGB_T
    px = RENDER['px']
    parts = build.setup(p, level=level, W=loss.N, H=loss.N, with_stage=px > 0)
    m_r = build.silhouette(p, parts, loss.N, loss.N)
    if not px and RENDER['parts']:
        import loss2
        m2 = build.silhouette(p, parts, loss2.N2, loss2.N2)
        if 'm2' not in RENDER: RENDER['m2'] = loss2.load_mask(os.path.join(HERE, '..', 'ref', 'mask.png'))
        mt2 = RENDER['m2']
        s_, c_ = loss.sil_terms(m2, mt2)
        pi = []
        for k, box in loss2.PARTS.items():
            a_, b_ = loss2.crop(m2, box), loss2.crop(mt2, box)
            pi.append(1 - (a_ & b_).sum() / max((a_ | b_).sum(), 1))
        t = dict(sil=float(s_), cham=float(c_), parts_iou=float(np.mean(pi)))
        t['total'] = 0.25 * t['sil'] + 1.5 * t['cham'] + 0.35 * t['parts_iou']
        return t
    if not px:
        return loss.score(m_r, m_t)
    path = os.path.join(HERE, '..', 'out', '_opt_render.png')
    if RENDER['parts']:
        import loss2
        build.render(path, loss2.N2, loss2.N2, samples=RENDER['samples'])
        m2 = build.silhouette(p, parts, loss2.N2, loss2.N2)
        if 'm2' not in RENDER:
            RENDER['m2'] = loss2.load_mask(os.path.join(HERE, '..', 'ref', 'mask.png')); RENDER['rgb2'] = loss2.load_rgb(os.path.join(HERE, '..', 'ref', 'target.png'))
        return loss2.score(m2, RENDER['m2'], loss2.load_rgb(path), RENDER['rgb2'])
    build.render(path, px, px, samples=RENDER['samples'])
    if RGB_T is None:
        RGB_T = loss.load_rgb(os.path.join(HERE, '..', 'ref', 'target.png'))
    return loss.score(m_r, m_t, loss.load_rgb(path), RGB_T)

def run(p, groups, iters, stage, level=0, seed=0, reviser='numeric-es'):
    rng = random.Random(seed)
    m_t = loss.load_mask(os.path.join(HERE, '..', 'ref', 'mask.png'))
    spec = [s for g in groups for s in GROUPS[g]]
    best = sil_loss(p, m_t, level); bl = best['total']
    it = next_iter()
    log(dict(iter=it, stage=stage, reviser=reviser, kind='start', accepted=True, **best))
    sigma = 1.0
    for k in range(iters):
        q = copy.deepcopy(p)
        nmut = rng.choice([1, 1, 2, 3])
        changed = []
        for _ in range(nmut):
            path, step = rng.choice(spec)
            setp(q, path, getp(q, path) + rng.gauss(0, step * sigma))
            changed.append(path)
        t = sil_loss(q, m_t, level)
        acc = t['total'] < bl
        it += 1
        log(dict(iter=it, stage=stage, reviser=reviser, kind='eval', accepted=acc, changed=changed, **t))
        if acc:
            p, best, bl = q, t, t['total']
            sigma = min(2.0, sigma * 1.15)
        else:
            sigma = max(0.25, sigma * 0.985)
    return p, best

if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('inp'); ap.add_argument('out')
    ap.add_argument('--groups', default='camera'); ap.add_argument('--iters', type=int, default=200)
    ap.add_argument('--stage', default='fit'); ap.add_argument('--level', type=int, default=0); ap.add_argument('--seed', type=int, default=0)
    ap.add_argument('--render', type=int, default=0); ap.add_argument('--samples', type=int, default=16)
    ap.add_argument('--parts', action='store_true')
    a = ap.parse_args()
    p = json.load(open(a.inp))
    RENDER.update(px=a.render, samples=a.samples, parts=a.parts)
    t0 = time.time()
    p, best = run(p, a.groups.split(','), a.iters, a.stage, a.level, a.seed)
    json.dump(p, open(a.out, 'w'), indent=1)
    print(json.dumps(best), round(time.time() - t0, 1), 's')
