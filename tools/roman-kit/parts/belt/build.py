"""Roman military belt (cingulum) with plaques and a sunburst buckle plate, from Evan's Midjourney job 3c090e7c image 1.
python build.py  ->  belt.glb next to this file. Shape numbers live in P; revisions are parameter edits."""
import os, sys, math, zlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..'))
import kit  # noqa: E402

P = dict(
    rx=0.155, ry=0.135, h=0.07, t=0.011, n=40,
    plaques=10, plaque_from=-72, plaque_to=252, plaque_out=0.016, plaque_inset=0.007,
    rib_w=0.016, rib_d=0.014, rib_over=0.003,
    boss_R=0.064, boss_t=0.016, rays=12,
    buckle_a=125, buckle_w=0.06, buckle_h=0.085, buckle_r=0.0055,
)
LEATHER = kit.mat('Leather', (226, 211, 188), 0.75)
BRONZE = kit.mat('Bronze', (196, 160, 118), 0.38, 0.75)


def pt(a, grow=0.0, z=0.0):
    return np.array([(P['rx'] + grow) * math.cos(a), (P['ry'] + grow) * math.sin(a), z])


def band():
    rings = [kit.ring(P['rx'], P['ry'], z, P['n']) for z in (0, P['h'])]
    kit.solidify(kit.loft('belt_strap', rings, LEATHER), P['t'], -1)


def plaques():
    edges = np.radians(np.linspace(P['plaque_from'], P['plaque_to'], P['plaques'] + 1))
    gap = math.radians(2.0)
    for i in range(P['plaques']):
        a0, a1 = edges[i] + gap, edges[i + 1] - gap
        a = np.linspace(a0, a1, 5); g = P['plaque_out']; z0, z1 = P['plaque_inset'], P['h'] - P['plaque_inset']
        rows = [np.array([pt(x, g, z) for x in a]) for z in (z0, z1)]
        o = kit.loft(f'plaque_{i}', rows, BRONZE, closed=False); kit.solidify(o, 0.004, 1)
        # a raised leaf rib down the middle of each plaque, the concept's laurel relief at game size
        mid = (a0 + a1) / 2
        leaf = np.array([pt(mid + d, g + 0.006 * (1 - abs(d) / 0.12), (z0 + z1) / 2 + 0.012 * math.sin(d * 20)) for d in np.linspace(-0.12, 0.12, 6)])
        kit.tube(f'plaque_leaf_{i}', leaf, 0.0035, 4, BRONZE)
    for i, e in enumerate(edges):
        c = pt(e, P['plaque_out'] + 0.003, P['h'] / 2)
        o = kit.box(f'rib_{i}', (P['rib_w'], P['rib_d'], P['h'] + 2 * P['rib_over']), tuple(c), BRONZE)
        o.rotation_euler = (0, 0, math.atan2(P['ry'] * math.cos(e), -P['rx'] * math.sin(e)) + math.pi / 2)
        kit.bevel(o, 0.002)


def boss():
    """The octagonal buckle plate at the front with its sunburst."""
    R, t = P['boss_R'], P['boss_t']; y = -P['ry'] - P['plaque_out'] - 0.004
    cz = P['h'] / 2
    def octagon(r):
        a = np.radians(np.arange(8) * 45 + 22.5)
        return np.c_[r * np.cos(a), r * np.sin(a)]
    def plate(name, r, depth, y0):
        o = kit.plate(name, octagon(r), depth, BRONZE)
        o.rotation_euler = (math.radians(90), 0, 0); o.location = (0, y0, cz)
        kit.bevel(o, 0.003)
        return o
    plate('buckle_plate', R, t, y)
    plate('buckle_plate_inner', R * 0.74, 0.006, y - t)
    # sunburst: a domed centre and rays
    yb = y - t - 0.006
    kit.loft('sun_boss', [kit.ring(0.014, 0.014, 0, 8), kit.ring(0.008, 0.008, 0.01, 8), kit.ring(0.001, 0.001, 0.014, 8)], BRONZE, cap_start=True).rotation_euler = (math.radians(90), 0, 0)
    kit.bpy.context.scene.objects['sun_boss'].location = (0, yb, cz)
    for k in range(P['rays']):
        a = k * math.tau / P['rays']; r0, r1 = 0.016, 0.034 if k % 2 == 0 else 0.026
        c, s = math.cos(a), math.sin(a); w = 0.005
        v = [(c * r0 - s * w, yb, cz + s * r0 + c * w), (c * r0 + s * w, yb, cz + s * r0 - c * w), (c * r1, yb, cz + s * r1), (c * r0, yb - 0.006, cz + s * r0)]
        kit.mesh(f'sun_ray_{k}', v, [(0, 1, 2), (0, 3, 1), (1, 3, 2), (2, 3, 0)], BRONZE)


def buckle():
    a = math.radians(P['buckle_a']); c = pt(a, P['plaque_out'] + 0.01, P['h'] / 2)
    tang = np.array([-P['rx'] * math.sin(a), P['ry'] * math.cos(a), 0]); tang /= np.linalg.norm(tang)
    up = np.array([0, 0, 1.0]); w, h = P['buckle_w'] / 2, P['buckle_h'] / 2
    loop = [c + tang * x + up * z for x, z in ((-w, -h), (w, -h), (w, h), (-w, h), (-w, -h))]
    kit.tube('buckle_frame', loop, P['buckle_r'], 4, BRONZE)
    kit.tube('buckle_prong', [c - tang * w, c + tang * w * 0.7], 0.003, 4, BRONZE)
    # the free strap end that runs through the frame, and its keeper loop
    a1 = np.linspace(a - 0.05, a + 0.45, 6)
    rows = [np.array([pt(x, 0.016, z) for x in a1]) for z in (0.01, P['h'] - 0.01)]
    kit.solidify(kit.loft('strap_end', rows, LEATHER, closed=False), 0.006, 1)
    k = pt(a + 0.55, 0.02, P['h'] / 2)
    kit.box('strap_keeper', (0.018, 0.012, P['h'] + 0.004), tuple(k), LEATHER).rotation_euler = (0, 0, a + 0.55 + math.pi / 2)


def build(out):
    kit.reset()
    band(); plaques(); boss(); buckle()
    for o in list(kit.bpy.context.scene.objects):
        if o.type == 'MESH':
            kit.jitter(o, 0.0006, zlib.crc32(o.name.encode()))
    kit.ground()
    kit.export(out)
    return kit.triangles()


if __name__ == '__main__':
    print('triangles', build(os.path.join(HERE, 'belt.glb')))
