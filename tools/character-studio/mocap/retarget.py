"""AW-STUDY-0037 realism pass: retarget CMU motion capture onto the Character Studio skeleton.

The CMU Graphics Lab Motion Capture Database (http://mocap.cs.cmu.edu), BVH conversion by Bruce Hahne (cgspeed),
mirrored at github.com/una-dinosauria/cmu-mocap. CMU: "free for all uses"; see READMEFIRST.txt there.

Each BVH frame becomes a pose in the studio's "world" form: for every bone, its turn in character space measured from
the mannequin's rest A-pose (studies/character-studio/rig.mjs applyPose, pose.q). How:
  D = G(frame) * G(T-pose)^-1     the joint's turn since the BVH's frame-one T-pose, in world space
  q = D * A2T                    A2T turns the mannequin's rest direction for that limb onto the T-pose direction,
                                 so an arm that hangs in our A-pose is lifted to where the actor's arm was in the T-pose
Heading is turned so the actor faces +Z (along its travel for walks), travel is taken out for loops (the stage moves
the character), and lift is how far the lowest foot is off the floor (jumps), in hip heights.

usage: python3 retarget.py clips.json <bvh dir> <out dir>
"""
import json, math, os, sys
import numpy as np

STUDIO_TO_BVH = {
    'hips': 'Hips', 'spine': 'LowerBack', 'chest': 'Spine1', 'neck': 'Neck1', 'head': 'Head',
    'clavicle_L': 'LeftShoulder', 'upperarm_L': 'LeftArm', 'forearm_L': 'LeftForeArm', 'hand_L': 'LeftHand',
    'clavicle_R': 'RightShoulder', 'upperarm_R': 'RightArm', 'forearm_R': 'RightForeArm', 'hand_R': 'RightHand',
    'thigh_L': 'LeftUpLeg', 'shin_L': 'LeftLeg', 'foot_L': 'LeftFoot',
    'thigh_R': 'RightUpLeg', 'shin_R': 'RightLeg', 'foot_R': 'RightFoot',
}
# limb -> (bvh joint, bvh child) for the T-pose direction, and (joint, joint) names in rest-joints.json for ours
LIMBS = {
    'upperarm': (('Arm', 'ForeArm'), ('s', 'e')), 'forearm': (('ForeArm', 'Hand'), ('e', 'w')),
    'hand': (('Hand', 'HandIndex1'), ('w', 'f')), 'thigh': (('UpLeg', 'Leg'), ('h', 'k')),
    'shin': (('Leg', 'Foot'), ('k', 'a')), 'foot': (('Foot', 'ToeBase'), ('a', 't')),
}


def parse_bvh(path):
    toks = open(path).read().split()
    i = 0; joints = []; stack = []
    while toks[i] != 'MOTION':
        t = toks[i]
        if t in ('ROOT', 'JOINT'):
            joints.append({'name': toks[i + 1], 'parent': stack[-1] if stack else -1, 'offset': None, 'channels': []})
            i += 2; continue
        if t == 'End':
            joints.append({'name': joints[stack[-1]]['name'] + '_end', 'parent': stack[-1], 'offset': None, 'channels': [], 'end': True})
            i += 2; continue
        if t == '{': stack.append(len(joints) - 1); i += 1; continue
        if t == '}': stack.pop(); i += 1; continue
        if t == 'OFFSET': joints[stack[-1]]['offset'] = np.array([float(x) for x in toks[i + 1:i + 4]]); i += 4; continue
        if t == 'CHANNELS':
            n = int(toks[i + 1]); joints[stack[-1]]['channels'] = toks[i + 2:i + 2 + n]; i += 2 + n; continue
        i += 1
    nf = int(toks[i + 2]); dt = float(toks[i + 5]); vals = np.array([float(x) for x in toks[i + 6:]]).reshape(nf, -1)
    return joints, vals, dt


def rot(axis, deg):
    a = math.radians(deg); c, s = math.cos(a), math.sin(a)
    if axis == 'X': return np.array([[1, 0, 0], [0, c, -s], [0, s, c]])
    if axis == 'Y': return np.array([[c, 0, s], [0, 1, 0], [-s, 0, c]])
    return np.array([[c, -s, 0], [s, c, 0], [0, 0, 1]])


def fk(joints, vals):
    nf = len(vals); J = len(joints)
    G = np.zeros((nf, J, 3, 3)); P = np.zeros((nf, J, 3))
    for f in range(nf):
        c = 0
        for j, jt in enumerate(joints):
            R = np.eye(3); t = jt['offset'].copy()
            for ch in jt['channels']:
                v = vals[f, c]; c += 1
                if ch.endswith('position'): t['XYZ'.index(ch[0])] = v
                else: R = R @ rot(ch[0], v)
            p = jt['parent']
            if p < 0: G[f, j] = R; P[f, j] = t
            else: G[f, j] = G[f, p] @ R; P[f, j] = P[f, p] + G[f, p] @ t
    return G, P


def mat2quat(m):
    t = m[0, 0] + m[1, 1] + m[2, 2]
    if t > 0:
        s = math.sqrt(t + 1) * 2; return np.array([(m[2, 1] - m[1, 2]) / s, (m[0, 2] - m[2, 0]) / s, (m[1, 0] - m[0, 1]) / s, .25 * s])
    if m[0, 0] > m[1, 1] and m[0, 0] > m[2, 2]:
        s = math.sqrt(1 + m[0, 0] - m[1, 1] - m[2, 2]) * 2; return np.array([.25 * s, (m[0, 1] + m[1, 0]) / s, (m[0, 2] + m[2, 0]) / s, (m[2, 1] - m[1, 2]) / s])
    if m[1, 1] > m[2, 2]:
        s = math.sqrt(1 + m[1, 1] - m[0, 0] - m[2, 2]) * 2; return np.array([(m[0, 1] + m[1, 0]) / s, .25 * s, (m[1, 2] + m[2, 1]) / s, (m[0, 2] - m[2, 0]) / s])
    s = math.sqrt(1 + m[2, 2] - m[0, 0] - m[1, 1]) * 2; return np.array([(m[0, 2] + m[2, 0]) / s, (m[1, 2] + m[2, 1]) / s, .25 * s, (m[1, 0] - m[0, 1]) / s])


def between(a, b):
    a = a / np.linalg.norm(a); b = b / np.linalg.norm(b); v = np.cross(a, b); c = float(np.dot(a, b))
    if c < -0.9999: return rot('Y', 180)
    K = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    return np.eye(3) + K + K @ K / (1 + c)


def retarget(bvh, spec, rest, keep_travel=False):
    joints, vals, dt = parse_bvh(bvh)
    G, P = fk(joints, vals)
    idx = {j['name']: i for i, j in enumerate(joints)}
    T0 = 0  # frame one is the T-pose
    a, b = spec.get('from', 1), spec.get('to', len(vals))
    step = max(1, round((1 / 30) / dt))
    frames = list(range(max(a, 1), min(b, len(vals)), step))
    hipH = P[T0, idx['Hips'], 1] - min(P[T0, idx['LeftToeBase'], 1], P[T0, idx['RightToeBase'], 1])
    footT = min(P[T0, idx['LeftFoot'], 1], P[T0, idx['RightFoot'], 1])
    # heading: along travel when the clip travels, else the mean way the hips face
    hp = P[frames][:, idx['Hips']]
    travel = hp[-1] - hp[0]; travel[1] = 0
    if np.linalg.norm(travel) > hipH * .8 and not spec.get('face'):
        yaw = math.atan2(travel[0], travel[2])
    else:
        fw = np.array([G[f, idx['Hips']] @ np.array([0, 0, 1]) for f in frames]).mean(0)
        yaw = math.atan2(fw[0], fw[2])
    yaw += math.radians(spec.get('yaw', 0))
    Y = rot('Y', -math.degrees(yaw))
    # A2T per limb: our rest direction onto the actor's T-pose direction
    A2T = {}
    for limb, ((bj, bc), (ra, rb)) in LIMBS.items():
        for s, S in (('L', 'Left'), ('R', 'Right')):
            tdir = P[T0, idx[S + bc]] - P[T0, idx[S + bj]]
            ours = np.array(rest[rb + s]) - np.array(rest[ra + s])
            A2T[f'{limb}_{s}'] = between(ours, tdir)
    out = []
    lin = np.zeros(3)  # travel comes out per loop, after the cycle is found
    for n, f in enumerate(frames):
        q = {}
        for ours, theirs in STUDIO_TO_BVH.items():
            j = idx[theirs]
            D = G[f, j] @ G[T0, j].T
            D = Y @ D  # the actor turned to face +Z
            M = D @ A2T.get(ours, np.eye(3))
            q[ours] = [round(float(x), 4) for x in mat2quat(M)]
        r = (P[f, idx['Hips']] - hp[0] - lin * n)
        r = Y @ r
        foot = min(P[f, idx['LeftFoot'], 1], P[f, idx['RightFoot'], 1], P[f, idx['LeftToeBase'], 1] + (footT - P[T0, idx['LeftToeBase'], 1]),
                   P[f, idx['RightToeBase'], 1] + (footT - P[T0, idx['RightToeBase'], 1]))
        lift = max(0.0, (foot - footT) / hipH - .03)
        out.append({'q': q, 'r': [round(float(r[0] / hipH), 3), round(lift, 3), round(float(r[2] / hipH), 3)]})
    speed = float(np.linalg.norm((hp[-1] - hp[0])[[0, 2]]) / hipH / (len(frames) / 30)) if spec.get('loop') else 0
    return out, speed


def angle(q1, q2):
    d = abs(sum(a * b for a, b in zip(q1, q2))); return 2 * math.acos(min(1, d))


def best_loop(frames, lo=24, hi=90):
    """the pair of frames, one cycle apart, whose poses match best (sum of bone angles)"""
    best = (1e9, 0, len(frames))
    keys = ['thigh_L', 'thigh_R', 'shin_L', 'shin_R', 'upperarm_L', 'upperarm_R', 'spine', 'hips']
    for i in range(0, max(1, len(frames) // 2)):
        for j in range(i + lo, min(len(frames), i + hi)):
            d = sum(angle(frames[i]['q'][k], frames[j]['q'][k]) for k in keys)
            if d < best[0]: best = (d, i, j)
    return best


def main():
    spec_path, bvh_dir, out_dir = sys.argv[1:4]
    specs = json.load(open(spec_path))
    rest = json.load(open(os.path.join(os.path.dirname(__file__), '../../../prototypes/ranch-atelier/dist/studies/character-studio/models/rest-joints.json')))
    os.makedirs(out_dir, exist_ok=True)
    index = {}
    for move, spec in specs.items():
        bvh = os.path.join(bvh_dir, spec['file'] + '.bvh')
        if not os.path.exists(bvh): print('missing', bvh); continue
        frames, speed = retarget(bvh, spec, rest, keep_travel=True) if spec.get('loop') else retarget(bvh, spec, rest)
        raw = retarget(bvh, {**spec, 'loop': False}, rest)[0] if spec.get('loop') else frames
        if not spec.get('loop') and len(frames) > spec.get('len', 5) * 30:
            # the busiest window: most bone turning per second
            keys = list(frames[0]['q'])
            e = [sum(angle(frames[k]['q'][b], frames[k + 1]['q'][b]) for b in keys) for k in range(len(frames) - 1)]
            W = int(spec.get('len', 5) * 30); best = max(range(len(e) - W), key=lambda k: sum(e[k:k + W]))
            frames = frames[best:best + W]
            r0 = frames[0]['r']
            for fr in frames: fr['r'] = [round(fr['r'][0] - r0[0], 3), fr['r'][1], round(fr['r'][2] - r0[2], 3)]
        if spec.get('loop'):
            # only where the actor is under way: hip speed above half the clip's typical speed
            hips = [f['r'] for f in raw]
            v = [math.hypot(hips[k + 1][0] - hips[k][0], hips[k + 1][2] - hips[k][2]) for k in range(len(hips) - 1)] + [0]
            med = sorted(v)[len(v) // 2]
            moving = [k for k, x in enumerate(v) if x > med * .6]
            a0, a1 = (moving[0], moving[-1]) if moving else (0, len(frames))
            sub = frames[a0:a1 + 1]
            d, i, j = best_loop(sub, int(spec.get('min', .85) * 30), int(spec.get('max', 3) * 30))
            i += a0; j += a0
            frames = frames[i:j]
            # recompute the travel trend over the cycle so the loop closes
            r0, r1 = frames[0]['r'], frames[-1]['r']
            n = len(frames)
            for k, fr in enumerate(frames):
                fr['r'] = [round(fr['r'][0] - r0[0] - (r1[0] - r0[0]) * k / n, 3), fr['r'][1], round(fr['r'][2] - r0[2] - (r1[2] - r0[2]) * k / n, 3)]
            speed = math.hypot(r1[0] - r0[0], r1[2] - r0[2]) / (n / 30)
            print(f'{move}: {spec["file"]} loop {i}-{j} ({n / 30:.2f}s) error {d:.2f} speed {speed:.2f} hip/s')
        else:
            print(f'{move}: {spec["file"]} {len(frames) / 30:.2f}s')
        clip = {'source': f'CMU mocap {spec["file"]} ({spec.get("what", "")})', 'fps': 30, 'loop': bool(spec.get('loop')),
                'speed': round(speed, 3) if spec.get('travel') else 0, 'frames': [[f['q'][b] for b in STUDIO_TO_BVH] + [f['r']] for f in frames]}
        json.dump(clip, open(os.path.join(out_dir, move + '.json'), 'w'), separators=(',', ':'))
        index[move] = {'file': move + '.json', 'source': spec['file'], 'what': spec.get('what', ''), 'loop': bool(spec.get('loop')), 'seconds': round(len(frames) / 30, 2)}
        if spec.get('lift'): index[move]['lift'] = spec['lift']  # extra height in hip heights (a pantomimed swim floats)
    json.dump({'bones': list(STUDIO_TO_BVH), 'clips': index}, open(os.path.join(out_dir, 'index.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
