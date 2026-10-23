"""Change a learned figure by name, the way you'd say it: the language side of the recipe.

    python3 edit.py regions                                  (the words this figure understands)
    python3 edit.py measure forearm                          (that region in numbers and words)
    python3 edit.py scale forearm --width 1.15 --depth 1.15 --say "make his forearms 15% bigger"
    python3 edit.py move head --dy -0.02 --say "push his head forward 2 cm"
    python3 edit.py flatten chest --face front --amount 0.5 --say "flatter pecs, more like planes"
    python3 edit.py undo

A person (or a model reading their words) picks the op, the region and the amount; this script does the geometry.
Every edit keeps the spec before it in spec/history/NNN.json and logs the words and the op in spec/edits.jsonl,
so nothing is silently replaced. Then rebuild and shoot: python3 figure.py --shots --tag <name>.
Regions are body words mapped to a part and a height band; joint heights come from the MPFB + Rigify body
(elbow 1.31, wrist 1.02, knee 0.57, ankle 0.09). Edits fade out over the last 4 cm of a band so no step shows.
"""
import argparse
import json
import math
import os
import shutil
import time

HERE = os.path.dirname(os.path.abspath(__file__))
import numpy as np  # noqa: E402

REGIONS = {
    'head': ('torso', 1.80, 2.00), 'neck': ('torso', 1.68, 1.82), 'chest': ('torso', 1.35, 1.68),
    'belly': ('torso', 1.12, 1.35), 'hips': ('torso', 0.90, 1.12), 'torso': ('torso', 0.90, 1.82),
    'deltoid': ('arm', 1.45, 1.75), 'upper arm': ('arm', 1.31, 1.50), 'forearm': ('arm', 1.02, 1.31),
    'hand': ('arm', 0.60, 1.02), 'arm': ('arm', 0.60, 1.75),
    'thigh': ('leg', 0.57, 0.92), 'shin': ('leg', 0.09, 0.57), 'calf': ('leg', 0.09, 0.57), 'foot': ('leg', 0.0, 0.10),
    'leg': ('leg', 0.0, 0.92),
}
FACES = {'front': -math.pi / 2, 'back': math.pi / 2, 'outside': None, 'right': math.pi, 'left': 0.0}


def load(spec):
    return json.load(open(os.path.join(HERE, spec, 'spec.json')))


def parts_for(spec, region, side):
    base, z0, z1 = REGIONS[region]
    names = []
    for p in spec['parts']:
        n = p['name']
        if base == 'torso' and n == 'torso':
            names.append(p)
        elif base in ('arm', 'leg') and (n.startswith(base + '_') or (base == 'arm' and n.startswith('hand_'))):
            s = n.split('_')[1]
            if side in ('both', s):
                names.append(p)
    return names, z0, z1


def weight(z, z0, z1, fade=0.04):
    if z < z0 - fade or z > z1 + fade:
        return 0.0
    if z < z0:
        return (z - (z0 - fade)) / fade
    if z > z1:
        return ((z1 + fade) - z) / fade
    return 1.0


def ring_xy(r):
    rr = np.array(r['r']); a = np.arange(len(rr)) * 2 * math.pi / len(rr)
    return r['cx'] + rr * np.cos(a), r['cy'] + rr * np.sin(a), a


def from_xy(r, x, y):
    """Re-read a ring's radii from moved points (keeping its centre and angle slots)."""
    a = np.arange(len(r['r'])) * 2 * math.pi / len(r['r'])
    r['r'] = [round(float(v), 4) for v in np.maximum((x - r['cx']) * np.cos(a) + (y - r['cy']) * np.sin(a), 0.002)]


def measure(spec, region, side):
    ps, z0, z1 = parts_for(spec, region, side)
    lines = []
    for p in ps:
        rs = [r for r in p['rings'] if z0 <= r['z'] <= z1]
        if not rs:
            continue
        w = [np.ptp(ring_xy(r)[0]) for r in rs]; d = [np.ptp(ring_xy(r)[1]) for r in rs]
        i = int(np.argmax(w))
        lines.append(f"{p['name']} {region}: z {rs[0]['z']:.2f}-{rs[-1]['z']:.2f}, widest {w[i]:.3f} m at z {rs[i]['z']:.2f} "
                     f"(depth there {d[i]:.3f}), narrowest {min(w):.3f}, {len(rs)} rings")
    return '\n'.join(lines)


def apply(spec, a):
    ps, z0, z1 = parts_for(spec, a.region, a.side)
    for p in ps:
        for r in p['rings']:
            w = weight(r['z'], z0, z1)
            if w == 0:
                continue
            if a.op == 'scale':
                x, y, _ = ring_xy(r)
                sx, sy = 1 + (a.width - 1) * w, 1 + (a.depth - 1) * w
                from_xy(r, r['cx'] + (x - r['cx']) * sx, r['cy'] + (y - r['cy']) * sy)
            elif a.op == 'move':
                r['cx'] = round(r['cx'] + a.dx * w, 4); r['cy'] = round(r['cy'] + a.dy * w, 4)
            elif a.op == 'flatten':
                # pull the points on one face toward the plane through that face's outermost point: big flat planes
                x, y, ang = ring_xy(r)
                face = FACES[a.face]
                if face is None:
                    face = math.pi if r['cx'] < 0 else 0.0
                d = np.array([math.cos(face), math.sin(face)])
                proj = (x - r['cx']) * d[0] + (y - r['cy']) * d[1]
                on = np.cos(ang - face) > 0.5
                if not on.any():
                    continue
                plane = proj[on].max()
                push = (plane - proj) * on * a.amount * w
                from_xy(r, x + push * d[0], y + push * d[1])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('op', choices=['regions', 'measure', 'scale', 'move', 'flatten', 'undo'])
    ap.add_argument('region', nargs='?')
    ap.add_argument('--side', default='both', help='R (his right), L, or both')
    ap.add_argument('--spec', default='spec')
    ap.add_argument('--width', type=float, default=1.0); ap.add_argument('--depth', type=float, default=1.0)
    ap.add_argument('--dx', type=float, default=0.0); ap.add_argument('--dy', type=float, default=0.0)
    ap.add_argument('--face', default='front', choices=list(FACES)); ap.add_argument('--amount', type=float, default=0.5)
    ap.add_argument('--say', default='', help="the request in words, kept with the edit")
    a = ap.parse_args()
    sdir = os.path.join(HERE, a.spec); hist = os.path.join(sdir, 'history'); os.makedirs(hist, exist_ok=True)
    if a.op == 'regions':
        for k, (p, z0, z1) in REGIONS.items():
            print(f'{k:10s} {p:6s} z {z0:.2f}-{z1:.2f}')
        return
    spec = load(a.spec)
    if a.op == 'measure':
        print(measure(spec, a.region, a.side)); return
    if a.op == 'undo':
        old = sorted(os.listdir(hist))
        if not old:
            print('nothing to undo'); return
        shutil.copy(os.path.join(hist, old[-1]), os.path.join(sdir, 'spec.json')); os.remove(os.path.join(hist, old[-1]))
        open(os.path.join(sdir, 'edits.jsonl'), 'a').write(json.dumps(dict(op='undo', at=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()))) + '\n')
        print('undone', old[-1]); return
    n = len(os.listdir(hist))
    shutil.copy(os.path.join(sdir, 'spec.json'), os.path.join(hist, f'{n:03d}.json'))
    before = measure(spec, a.region, a.side)
    apply(spec, a)
    json.dump(spec, open(os.path.join(sdir, 'spec.json'), 'w'), indent=0)
    after = measure(spec, a.region, a.side)
    rec = dict(n=n, say=a.say, op=a.op, region=a.region, side=a.side,
               args={k: getattr(a, k) for k in ('width', 'depth', 'dx', 'dy', 'face', 'amount')},
               before=before, after=after, at=time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()))
    open(os.path.join(sdir, 'edits.jsonl'), 'a').write(json.dumps(rec) + '\n')
    print(before); print('->'); print(after)


if __name__ == '__main__':
    main()
