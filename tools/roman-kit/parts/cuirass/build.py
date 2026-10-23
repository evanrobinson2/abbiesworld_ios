"""Roman segmented cuirass (lorica segmentata style shell), from Evan's Midjourney job 699aa058 image 1.
python build.py  ->  cuirass.glb next to this file. Shape numbers live in P; revisions are parameter edits."""
import os, sys, math, zlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..'))
import kit  # noqa: E402

P = dict(
    rx=0.19, ry=0.135, n=16, wall=0.008,
    hoops=7, hoop_h=0.058, hoop_step=0.008, hoop_top=0.40,       # girth hoops from the waist up to hoop_top
    chest_top=0.52, shoulder_rx=0.16, shoulder_ry=0.12, neck_rx=0.1, neck_ry=0.08, neck_front=0.05,
    lame_n=3, lame_w=0.06, lame_t=0.012, lame_x0=0.085, lame_drop=0.035, lame_R=0.14, lame_lift=0.03,
    plate_w=0.115, plate_h=0.085,
    facet=0.006, jitter=0.002,
)
IVORY = kit.mat('Ivory', (236, 229, 215), 0.72)


def ell(rx, ry, z, a0=-math.pi / 2):
    return kit.ring(rx, ry, z, P['n'], a0, a0 + math.tau)


def hoops():
    for i in range(P['hoops']):
        z0 = i * (P['hoop_top'] / P['hoops']); z1 = z0 + P['hoop_h']
        taper = 0.94 + 0.06 * (i / P['hoops'])            # slightly narrower at the waist
        rx, ry = P['rx'] * taper, P['ry'] * taper
        o = kit.loft(f'girth_hoop_{i}', [ell(rx + P['hoop_step'], ry + P['hoop_step'], z0), ell(rx, ry, z1)], IVORY)
        kit.solidify(o, P['wall'], -1)


def upper():
    z0 = P['hoop_top']; z1 = P['chest_top']; zt = z1 + 0.05
    rings = [ell(P['rx'] * 0.99, P['ry'], z0), ell(P['rx'] * 0.97, P['ry'] * 1.02, (z0 + z1) / 2),
             ell(P['shoulder_rx'], P['shoulder_ry'], z1)]
    kit.solidify(kit.loft('chest', rings, IVORY), P['wall'], -1)
    # the yoke: from the shoulder ring in to the neck opening, which dips at the front
    nk = ell(P['neck_rx'], P['neck_ry'], zt, -math.pi / 2)
    a = np.linspace(-math.pi / 2, 3 * math.pi / 2, P['n'], endpoint=False)
    nk[:, 2] -= P['neck_front'] * np.clip(-np.sin(a), 0, 1) ** 2
    kit.solidify(kit.loft('yoke', [ell(P['shoulder_rx'], P['shoulder_ry'], z1), nk], IVORY), P['wall'], -1)
    # breast plates either side of the front seam
    for side in (-1, 1):
        w, h = P['plate_w'], P['plate_h']
        y = -P['ry'] * 1.02 - 0.006
        v = [(side * 0.006, y, z0 + 0.005), (side * w, y + 0.025, z0 + 0.005), (side * (w - 0.01), y + 0.03, z0 + h), (side * 0.03, y + 0.012, z0 + h + 0.02)]
        o = kit.mesh(f'breast_plate_{"l" if side > 0 else "r"}', v, [(0, 1, 2, 3) if side > 0 else (3, 2, 1, 0)], IVORY)
        kit.solidify(o, 0.01, 1)
        # the matching back plate
        vb = [(x, -yy, zz) for x, yy, zz in v]
        o = kit.mesh(f'back_plate_{"l" if side > 0 else "r"}', vb, [(3, 2, 1, 0) if side > 0 else (0, 1, 2, 3)], IVORY)
        kit.solidify(o, 0.01, 1)


def shoulder_lames():
    zt = P['chest_top'] + 0.05
    for side in (-1, 1):
        for i in range(P['lame_n']):
            x0 = P['lame_x0'] + i * (P['lame_w'] - 0.006); x1 = x0 + P['lame_w']
            R = P['lame_R'] + i * 0.012; cz = zt + P['lame_lift'] - R - i * P['lame_drop']
            a = np.linspace(math.radians(18), math.radians(162), 9)
            ys, zs = -np.cos(a) * R * 0.95, cz + np.sin(a) * R
            inner = np.c_[np.full(9, side * x0), ys, zs]; outer = np.c_[np.full(9, side * x1), ys * 1.02, zs - 0.012]
            o = kit.loft(f'shoulder_lame_{"l" if side > 0 else "r"}{i}', [inner, outer] if side > 0 else [outer, inner], IVORY, closed=False)
            kit.solidify(o, P['lame_t'], 1)


def seam():
    for side in (-1, 1):
        y = side * (P['ry'] + P['hoop_step'] + 0.004)
        kit.box(f'{"front" if side < 0 else "back"}_seam', (0.008, 0.008, P['hoop_top']), (0, y, P['hoop_top'] / 2), IVORY)


def build(out):
    kit.reset()
    hoops(); upper(); shoulder_lames(); seam()
    for o in list(kit.bpy.context.scene.objects):
        if o.type == 'MESH':
            kit.jitter(o, P['jitter'], zlib.crc32(o.name.encode()))
            kit.facet(o, P['facet'], 0.03)
    kit.ground()
    kit.export(out)
    return kit.triangles()


if __name__ == '__main__':
    print('triangles', build(os.path.join(HERE, 'cuirass.glb')))
