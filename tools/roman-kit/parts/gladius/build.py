"""Roman short sword (gladius), lying flat, from Evan's Midjourney job 75c42e65 image 1.
python build.py  ->  gladius.glb next to this file. Shape numbers live in P; revisions are parameter edits.
Lies on its flat along +X (point at -X, pommel at +X), the way the concept shows it resting on the floor."""
import os, sys, math, zlib
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, os.path.join(HERE, '..', '..'))
import kit  # noqa: E402

P = dict(
    blade_len=0.5, point_len=0.13, w_guard=0.058, w_mid=0.05, ridge=0.007, edge=0.0015,
    guard_len=0.026, guard_w=0.07, guard_h=0.036,
    grip_len=0.095, grip_r=0.014, grip_rings=4,
    pommel_r=0.027, pommel_len=0.05,
)
STEEL = kit.mat('BladeIvory', (232, 220, 202), 0.55, 0.15)
BONE = kit.mat('Ivory', (226, 212, 192), 0.7)


def blade():
    """Diamond section: a centre ridge and thin edges, widest at the guard, tapering, then a long point."""
    L, pl = P['blade_len'], P['point_len']
    xs = [0.0, 0.02, L * 0.5, L - pl, L - pl * 0.5, L]
    ws = [P['w_guard'], P['w_guard'], (P['w_guard'] + P['w_mid']) / 2 * 0.98, P['w_mid'], P['w_mid'] * 0.55, 0.001]
    rings = []
    for x, w in zip(xs, ws):
        h = w / 2; r = P['ridge'] * min(1.0, w / P['w_mid'] + 0.2)
        # 6-point section: edge, upper fuller shoulder, ridge, edge, lower shoulder, ridge
        rings.append([(-x, -h, 0), (-x, -h * 0.45, r * 0.8), (-x, h * 0.45, r * 0.8), (-x, h, 0), (-x, h * 0.45, -r * 0.8), (-x, -h * 0.45, -r * 0.8)])
    o = kit.loft('blade', rings, STEEL, cap_start=True, cap_end=True)
    kit.jitter(o, 0.0006, 7)
    # a raised spine line down the centre so the fuller reads
    kit.tube('blade_ridge', [(-0.02, 0, P['ridge'] * 0.85), (-(L - pl), 0, P['ridge'] * 0.85)], 0.0018, 4, STEEL)


def hilt():
    gl, gw, gh = P['guard_len'], P['guard_w'], P['guard_h']
    # guard: a half-oval block, rounded towards the blade
    a = np.linspace(-math.pi / 2, math.pi / 2, 9)
    outline = [(math.cos(t) * gw / 2 * 0.25, math.sin(t) * gw / 2) for t in a] + [(-gl * 0.6, gw * 0.42), (-gl * 0.6, -gw * 0.42)]
    rings = [[(x + gl * 0.6, y, z) for x, y in outline] for z in (-gh / 2, gh / 2)]
    o = kit.loft('guard', rings, BONE, cap_start=True, cap_end=True); kit.bevel(o, 0.003)
    # grip with finger ridges
    x0 = gl * 0.6; L = P['grip_len']; pts, rs = [], []
    for k, t in enumerate(np.linspace(0, 1, 2 * P['grip_rings'] + 1)):
        pts.append((x0 + t * L, 0, 0)); rs.append(P['grip_r'] * (1.18 if k % 2 == 0 else 0.92))
    kit.tube('grip', pts, rs, 8, BONE)
    # pommel: a faceted ball with a small cap
    px = x0 + L + P['pommel_r'] * 0.85; r = P['pommel_r']
    rings = [kit.ring(r * s, r * s, 0, 8) for s in (0.5, 0.95, 1.0, 0.85, 0.4)]
    for ring_, dx in zip(rings, (-0.8, -0.35, 0.05, 0.45, 0.8)):
        ring_[:, 2] = ring_[:, 0]; ring_[:, 0] = dx * r
    rings = [np.c_[rr[:, 0] + px, rr[:, 1], rr[:, 2]] for rr in rings]
    kit.loft('pommel', rings, BONE, cap_start=True, cap_end=True)
    kit.tube('pommel_cap', [(px + r * 0.8, 0, 0), (px + r * 1.15, 0, 0)], [r * 0.3, r * 0.15], 6, BONE)


def build(out):
    kit.reset()
    blade(); hilt()
    for o in list(kit.bpy.context.scene.objects):
        if o.type == 'MESH' and o.name != 'blade':
            kit.jitter(o, 0.0005, zlib.crc32(o.name.encode()))
    kit.ground()
    kit.export(out)
    return kit.triangles()


if __name__ == '__main__':
    print('triangles', build(os.path.join(HERE, 'gladius.glb')))
