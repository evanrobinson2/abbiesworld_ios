"""(1+1) evolution strategy over chosen parameter groups, for one helmet variant.

Two speeds: 'sil' scores a fast raster silhouette (no render); 'render' does a Cycles render and the full loss.
Every evaluation is appended to out/loss_log.jsonl, tagged with variant and stage, so the curve is the full history.
"""
import os, sys, json, copy, random, time
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import helmet, hloss

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out'); LOG = os.path.join(OUT, 'loss_log.jsonl')
REF = os.path.join(HERE, 'ref')

GROUPS = {
    'camera': [('cam.el', 3), ('cam.tz', 0.05)],
    'place': [('place.yaw', 4), ('place.pitch', 3), ('place.roll', 3), ('place.scale', 0.03), ('place.x', 0.05), ('place.z', 0.05)],
    'shape': [('shape.dome.0', 0.03), ('shape.dome.1', 0.03), ('shape.dome.2', 0.03), ('shape.band_h', 0.02), ('shape.lip', 0.02),
              ('shape.lip_z', 0.02), ('shape.lip_front', 0.02), ('shape.front_drop', 0.02), ('shape.low_h', 0.04), ('shape.low_back', 0.04),
              ('shape.taper', 0.03), ('shape.open', 3), ('shape.cheek_w', 3), ('shape.cheek_len', 0.05), ('shape.cheek_back_len', 0.05),
              ('shape.cheek_tip_u', 0.05), ('shape.cheek_in', 0.04), ('shape.cheek_front', 0.05), ('shape.neck_w', 3), ('shape.neck_len', 0.05),
              ('shape.neck_flare', 4), ('shape.neck_off', 3), ('shape.boss_th', 3), ('shape.boss_r', 0.01),
              ('shape.band_front', 0.03), ('shape.eye_gap', 0.02), ('shape.eye_w', 3)],
    'crest': [('shape.crest.a0', 4), ('shape.crest.a1', 4), ('shape.crest.len', 0.04), ('shape.crest.w', 0.03), ('shape.crest.hold_h', 0.02),
              ('shape.crest.lift', 0.02), ('shape.crest.rake', 3), ('shape.crest.curl', 0.05), ('shape.crest.peak_at', 0.04),
              ('shape.crest.taper', 0.05), ('shape.crest.cap', 0.04), ('shape.crest.fill', 0.05)],
    'grammar': [('grammar.dome_u', 1.5), ('grammar.dome_v', 1.0), ('grammar.dome_twist', 0.05), ('grammar.band_u', 1.5), ('grammar.shell_u', 1.5),
                ('grammar.plate_fold', 0.03), ('grammar.hem_w', 0.04), ('grammar.hem_h', 0.01), ('grammar.blades', 1.5),
                ('grammar.ridge', 0.15), ('grammar.paper_t', 0.008), ('grammar.blade_jitter', 0.02)],
    'light': [('light.key_az', 8), ('light.key_el', 5), ('light.key_size', 0.8), ('light.key_power', 300), ('light.fill_power', 80),
              ('light.fill_az', 10), ('light.world_strength', 0.08), ('light.bg_albedo.0', 0.015), ('light.bg_albedo.1', 0.015),
              ('light.bg_albedo.2', 0.015), ('light.paper_albedo', 0.03), ('light.paper_rough', 0.05), ('light.exposure', 0.12), ('light.paper_warm', 0.01)],
    'filter': [('filter.edge', 0.02), ('filter.crumple', 0.03)],
}
INTS = {'grammar.dome_u': (5, 24), 'grammar.dome_v': (2, 8), 'grammar.band_u': (6, 32), 'grammar.shell_u': (4, 20), 'grammar.blades': (5, 22)}
MINS = {'shape.crest.fill': (0.3, 1.2), 'shape.crest.peak_at': (0.05, 0.9), 'shape.crest.taper': (0.1, 1.0), 'grammar.hem_w': (0.0, 0.5),
        'grammar.paper_t': (0.005, 0.08), 'filter.crumple': (0.0, 0.6), 'filter.edge': (0.03, 0.4), 'light.paper_albedo': (0.4, 0.95),
        'light.paper_rough': (0.3, 1.0), 'shape.cheek_front': (0.6, 1.3), 'light.key_size': (0.5, 12), 'light.key_power': (100, 8000),
        'light.fill_power': (0, 3000), 'light.world_strength': (0.0, 2.0)}

def getp(p, path):
    cur = p
    for k in path.split('.'): cur = cur[int(k)] if isinstance(cur, list) else cur[k]
    return cur

def setp(p, path, val):
    ks = path.split('.'); cur = p
    for k in ks[:-1]: cur = cur[int(k)] if isinstance(cur, list) else cur[k]
    if isinstance(cur, list): cur[int(ks[-1])] = val
    else: cur[ks[-1]] = val

_T = {}
def target(n):
    if n not in _T: _T[n] = (hloss.load_mask(os.path.join(REF, 'mask.png'), n), hloss.load_rgb(os.path.join(REF, 'target.png'), n))
    return _T[n]

def evaluate(p, mode, speed='sil', n=384, samples=12, path=None):
    filt = p.get('filter') if mode == 'smooth' and p.get('filter', {}).get('on') else None
    parts = helmet.setup(p, mode, filt, n, n, with_stage=speed != 'sil')
    m_r = helmet.silhouette(parts, n, n)
    m_t, rgb_t = target(n)
    kp = helmet.project_landmarks(n, n)
    if 'kp' not in _T: _T['kp'] = json.load(open(os.path.join(REF, 'landmarks.json')))
    if speed == 'sil':
        return hloss.score(m_r, m_t, kp=kp, kp_ref=_T['kp'])
    path = path or os.path.join(OUT, '_eval.png')
    helmet.render(path, n, n, samples)
    t = hloss.score(m_r, m_t, hloss.load_rgb(path, n), rgb_t, kp=kp, kp_ref=_T['kp'])
    t['tris'] = helmet.tri_count(parts)
    return t

def log(e):
    with open(LOG, 'a') as f: f.write(json.dumps(e) + '\n')

# Style invariants: what makes it THIS kind of papercraft helmet, which a silhouette fit is free to erase
# (round 2 shrank the crest to a 6 cm card, turned the brow ledge inside out and closed the eye slot).
RULES = {'shape.crest.w': (0.22, 0.45), 'shape.lip': (0.05, 0.2), 'shape.eye_gap': (0.08, 0.3), 'shape.band_front': (0.15, 0.5),
         'shape.crest.fill': (0.85, 1.2), 'shape.crest.curl': (-0.6, 0.1), 'shape.cheek_in': (0.1, 0.4), 'shape.crest.hold_h': (0.12, 0.3),
         'grammar.hem_h': (0.03, 0.08), 'grammar.plate_fold': (0.06, 0.2), 'grammar.dome_v': (3, 6), 'grammar.ridge': (0.3, 1.0)}

def enforce(p, bounds):
    for k, (lo, hi) in bounds.items(): setp(p, k, min(hi, max(lo, getp(p, k))))
    return p

def es(p, mode, groups, iters, variant, stage, speed='sil', seed=0, n=384, samples=12, rules=False):
    rng = random.Random(seed)
    bounds = dict(MINS, **(RULES if rules else {}))
    if rules: p = enforce(copy.deepcopy(p), RULES)
    spec = [s for g in groups for s in GROUPS[g]]
    best = evaluate(p, mode, speed, n, samples); bl = best['total']
    log(dict(variant=variant, stage=stage, speed=speed, kind='start', accepted=True, t=time.time(), **best))
    sigma = 1.0
    for k in range(iters):
        q = copy.deepcopy(p); changed = []
        for _ in range(rng.choice([1, 1, 2, 3])):
            path, step = rng.choice(spec)
            v = getp(q, path) + rng.gauss(0, step * sigma)
            if path in INTS: v = int(min(INTS[path][1], max(INTS[path][0], round(v))))
            if path in bounds: v = min(bounds[path][1], max(bounds[path][0], v))
            setp(q, path, v); changed.append(path)
        try:
            t = evaluate(q, mode, speed, n, samples)
        except Exception as ex:  # a broken mesh is just a rejected sample
            log(dict(variant=variant, stage=stage, speed=speed, kind='error', err=str(ex)[:200])); continue
        acc = t['total'] < bl
        log(dict(variant=variant, stage=stage, speed=speed, kind='eval', accepted=acc, changed=changed, t=time.time(), **t))
        if acc:
            p, best, bl = q, t, t['total']; sigma = min(2.0, sigma * 1.15)
        else:
            sigma = max(0.25, sigma * 0.985)
    return p, best
