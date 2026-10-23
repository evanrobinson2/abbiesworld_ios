"""Roman caged sandals (caligae), a left and right pair, from Evan's Midjourney job 5756e8ae image 3.
python build.py  ->  sandals.glb next to this file. Shape numbers live in P; revisions are parameter edits.
Toes point to -Y."""
import os, sys, math, zlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..'))
import kit  # noqa: E402

P = dict(
    length=0.28, sole_t=0.03, widths=[(0.0, 0.042), (0.12, 0.05), (0.45, 0.047), (0.75, 0.06), (0.92, 0.052), (1.0, 0.0)],
    arches=[0.8, 0.69, 0.58, 0.47, 0.36], arch_h0=0.035, arch_rise=0.06, strap_r=0.009,
    long_straps=(0.22, 0.5, 0.78), heel_t=0.3, heel_h=0.075,
    gap=0.15, stagger=0.06, toe_out=6,
)
SOLE = kit.mat('LeatherSole', (222, 210, 186), 0.85)
STRAP = kit.mat('Leather', (232, 223, 203), 0.75)


def half_w(t):
    ts, ws = zip(*P['widths'])
    return float(np.interp(t, ts, ws))


def y_of(t):            # t = 0 at the heel, 1 at the toe; toes point to -Y
    return P['length'] * (0.5 - t)


def sole(tag):
    n = 18; ts = 0.5 - 0.5 * np.cos(np.linspace(0, math.pi, n))
    right = [(half_w(t), y_of(t)) for t in ts]
    # round the heel and toe ends
    heel = [(half_w(0.02) * math.cos(a), y_of(0) + 0.018 * math.sin(a)) for a in np.linspace(math.pi - 0.3, 0.3, 5)]
    left = [(-x, y) for x, y in right[::-1]]
    outline = right[1:-1] + left[1:-1] + heel
    o = kit.plate(f'sole_{tag}', outline[::-1], P['sole_t'], SOLE)
    kit.bevel(o, 0.006, 2)
    kit.facet(o, 0.0015, 0.02, levels=0)


def arch_pts(t, k=9):
    w = half_w(t) * 0.92; h = P['arch_h0'] + (0.82 - t) * P['arch_rise']; y = y_of(t); z0 = P['sole_t'] - 0.002
    a = np.linspace(0, math.pi, k)
    return np.c_[w * np.cos(a), np.full(k, y), z0 + h * np.sin(a) ** 0.8]


def cage(tag):
    arches = [arch_pts(t) for t in P['arches']]
    for i, pts in enumerate(arches):
        kit.tube(f'strap_arch_{tag}{i}', pts, P['strap_r'], 4, STRAP)
    k = len(arches[0])
    for j, s in enumerate(P['long_straps']):
        idx = s * (k - 1); lo = int(idx); fr = idx - lo
        pts = [p[lo] * (1 - fr) + p[min(lo + 1, k - 1)] * fr for p in arches]
        toe = arches[0][lo].copy(); toe[1] -= 0.015; toe[2] = P['sole_t']
        kit.tube(f'strap_long_{tag}{j}', [toe] + pts, P['strap_r'] * 0.9, 4, STRAP)
    # the heel loop that rises behind the ankle
    t = P['heel_t']; w = half_w(t) * 0.92; y0 = y_of(t); yb = y_of(0) + 0.004
    a = np.linspace(0, math.pi, 11)
    pts = np.c_[w * np.cos(a), y0 + (yb - y0) * np.sin(a) ** 0.6, P['sole_t'] + P['heel_h'] * np.sin(a) ** 0.7]
    kit.tube(f'strap_heel_{tag}', pts, P['strap_r'], 4, STRAP)


def sandal(side, origin, yaw):
    tag = 'l' if side < 0 else 'r'
    before = set(kit.bpy.context.scene.objects)
    sole(tag); cage(tag)
    piv = kit.bpy.data.objects.new(f'sandal_{tag}', None); kit.bpy.context.scene.collection.objects.link(piv)
    for o in kit.bpy.context.scene.objects:
        if o not in before and o is not piv:
            o.parent = piv
    piv.location = origin; piv.rotation_euler = (0, 0, math.radians(yaw))


def build(out):
    kit.reset()
    sandal(-1, (-P['gap'] / 2, P['stagger'] / 2, 0), -P['toe_out'])
    sandal(1, (P['gap'] / 2, -P['stagger'] / 2, 0), P['toe_out'])
    for o in list(kit.bpy.context.scene.objects):
        if o.type == 'MESH':
            kit.jitter(o, 0.0006, zlib.crc32(o.name.encode()))
    kit.ground()
    kit.export(out)
    return kit.triangles()


if __name__ == '__main__':
    print('triangles', build(os.path.join(HERE, 'sandals.glb')))
