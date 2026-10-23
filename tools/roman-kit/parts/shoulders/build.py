"""Roman shoulder guards, a left and right pair of hemmed, layered arches, from Evan's Midjourney job b767ad24 image 2.
python build.py  ->  shoulders.glb next to this file. Shape numbers live in P; revisions are parameter edits."""
import os, sys, math, zlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..'))
import kit  # noqa: E402

P = dict(
    # each guard is a stack of hemmed arches over the shoulder; the cap first, then lames stepping down the arm
    plates=[(0.0, 0.14, 0.0, 0.0), (-0.06, 0.04, -0.05, 0.014), (-0.12, -0.02, -0.1, 0.028)],   # (u from, to, drop, grow)
    ry=0.085, rz=0.135, arc=(-35, 215), n=12, t=0.008, tilt=12,
    hem=0.008, gap=0.36, stagger=0.06, toe=8,
    facet=0.003,
)
IVORY = kit.mat('Ivory', (234, 226, 205), 0.6)


def arch(name, u0, u1, ry, rz, cz):
    """A curved plate: a ∩ arc in the YZ plane swept along X from u0 to u1, with a raised hem round its edge."""
    a = np.radians(np.linspace(*P['arc'], P['n']))
    ys, zs = np.cos(a) * ry, cz + np.sin(a) * rz
    rows = [np.c_[np.full_like(ys, u), ys, zs] for u in (u0, u1)]
    o = kit.loft(name, rows, IVORY, closed=False)
    kit.solidify(o, P['t'], 0)
    kit.facet(o, P['facet'], 0.04, levels=1, seed=1)
    e0, e1 = rows[0] * [1, 1.03, 1] + [0, 0, 0], rows[1] * [1, 1.03, 1]
    for k, e in enumerate((e0, e1)):
        kit.tube(f'{name}_hem{k}', e, P['hem'], 5, IVORY)


def pauldron(side, origin, yaw):
    before = set(kit.bpy.context.scene.objects)
    tag = 'l' if side > 0 else 'r'
    for i, (u0, u1, drop, grow) in enumerate(P['plates']):
        arch(f'shoulder_{"cap" if i == 0 else "lame" + str(i)}_{tag}', u0, u1, P['ry'] + grow, P['rz'] + grow, drop)
    new = [o for o in kit.bpy.context.scene.objects if o not in before]
    piv = kit.bpy.data.objects.new(f'shoulder_guard_{tag}', None); kit.bpy.context.scene.collection.objects.link(piv)
    for o in new:
        o.parent = piv
    # lames point outward (down the arm): mirror the left guard so the pair is a true left and right
    piv.scale = (-side, 1, 1)
    piv.location = origin; piv.rotation_euler = (0, math.radians(-P['tilt'] * side), math.radians(yaw))


def build(out):
    kit.reset()
    pauldron(-1, (-P['gap'] / 2, -P['stagger'] / 2, 0), P['toe'])
    pauldron(1, (P['gap'] / 2, P['stagger'] / 2, 0), -P['toe'])
    for o in list(kit.bpy.context.scene.objects):
        if o.type == 'MESH':
            kit.jitter(o, 0.0008, zlib.crc32(o.name.encode()))
    kit.ground()
    kit.export(out)
    return kit.triangles()


if __name__ == '__main__':
    print('triangles', build(os.path.join(HERE, 'shoulders.glb')))
