"""Water trough (Ranch supply, replaces simulation-assets/supplies/water-trough-{full,partial,empty}.json).
A long rectangular plank trough on four short square feet: each long wall is three thick bevelled planks with an
uneven, slightly bowed top edge and a small outward flare, the ends are three planks set between them, dark iron
L-straps wrap the four vertical corners with an L cap folded over the rim and rivet nubs, and a blue water surface
sits a little below the rim. Z up, metres, origin at the centre of the footprint on the ground, front (long side) -Y.
usage: python build.py            builds every fill state, writes variants/<state>.glb and water-trough.glb (= full)
       python build.py full       one state only"""
import os, sys, math, random
import bpy, bmesh

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'water-trough'
STATES = ['full', 'partial', 'empty']

P = dict(
    L=1.75, W=0.62, H=0.41,     # overall length (X), width at the base of the walls (Y), height to the rim
    z0=0.10,                    # underside of the walls (top of the feet)
    planks=3,                   # planks per wall, bottom to top
    T=0.075,                    # long wall thickness
    Te=0.07,                     # end wall thickness
    flare=5.0,                  # deg: long walls lean outwards
    groove=0.006,               # gap between planks
    bevel=0.009,
    segs=6,                     # length segments of the top long planks (for the bowed, uneven top edge)
    bow=0.012, jitter=0.010,    # top edge: a gentle hump (+) along its length, plus random unevenness
    floor_t=0.045,
    foot=0.13, foot_bot=0.11, foot_in=0.065,   # foot size at top / bottom, inset of the foot from the wall corner
    strap_w=0.085, strap_t=0.014, strap_drop=0.015, cap_t=0.014, cap_over=0.012, strap_back=0.022,
    rivet_r=0.013, rivet_h=0.010,
    water={'full': 0.36, 'partial': 0.25, 'empty': None},   # water surface z per state
    colours=dict(Plank_Trough=(128, 64, 38), Plank_TroughFloor=(112, 60, 36), Timber_Leg=(104, 52, 28),
                 Metal_Iron=(56, 58, 58), Water=(92, 148, 176)),
    rough=dict(Plank_Trough=0.8, Plank_TroughFloor=0.85, Timber_Leg=0.85, Metal_Iron=0.55, Water=0.15),
    seed=7,
)
import json  # noqa: E402
P.update(json.loads(os.environ.get('TROUGH_P', '{}')))   # parameter sweeps: TROUGH_P='{"L": 1.7}'


def lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


MATS = {}


def mat(name):
    if name not in MATS:
        m = bpy.data.materials.new(name); m.use_nodes = True
        b = m.node_tree.nodes['Principled BSDF']
        b.inputs['Base Color'].default_value = (*[lin(c) for c in P['colours'][name]], 1)
        b.inputs['Roughness'].default_value = P['rough'][name]
        MATS[name] = m
    return MATS[name]


def obj(name, verts, faces, m, bevel=0.0):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], [], faces); me.validate()
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = False
    me.materials.append(mat(m))
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    if bevel:
        b = o.modifiers.new('bevel', 'BEVEL'); b.width = bevel; b.segments = 1
        b.limit_method = 'ANGLE'; b.angle_limit = math.radians(30)
    return o


def loft(rings, closed_caps=True):
    """rings: equal-length closed loops -> verts, faces (sides + end caps)"""
    n = len(rings[0]); V = [v for r in rings for v in r]; F = []
    for k in range(len(rings) - 1):
        for i in range(n):
            j = (i + 1) % n
            F.append((k * n + i, k * n + j, (k + 1) * n + j, (k + 1) * n + i))
    if closed_caps:
        F.append(tuple(range(n))[::-1]); F.append(tuple((len(rings) - 1) * n + i for i in range(n)))
    return V, F


def merge(parts):
    V, F = [], []
    for v, f in parts:
        o = len(V); V += v; F += [tuple(i + o for i in face) for face in f]
    return V, F


def yout(z):
    """outer face of the +Y long wall at height z (flared)"""
    return P['W'] / 2 + (z - P['z0']) * math.tan(math.radians(P['flare']))


rng = random.Random(P['seed'])


def top_edge(n):
    """an uneven, bowed top edge: n+1 z offsets"""
    return [P['bow'] * math.sin(math.pi * i / n) + rng.uniform(-P['jitter'], P['jitter']) for i in range(n + 1)]


def walls():
    L, T, Te, g = P['L'], P['T'], P['Te'], P['groove']
    hp = (P['H'] - P['z0']) / P['planks']; parts = []
    t = math.tan(math.radians(P['flare']))
    for s in (-1, 1):                                       # long walls, planks along X
        for k in range(P['planks']):
            zb = P['z0'] + k * hp + (g / 2 if k else 0); zt = P['z0'] + (k + 1) * hp - g / 2
            top = k == P['planks'] - 1; n = P['segs'] if top else 1
            dz = top_edge(n) if top else [0] * (n + 1)
            if top:
                zt = P['H']
            rings = []
            for i in range(n + 1):
                x = -L / 2 + L * i / n; ztt = zt + dz[i]
                rings.append([(x, s * (yout(zb) - T), zb), (x, s * yout(zb), zb), (x, s * yout(ztt), ztt), (x, s * (yout(ztt) - T), ztt)])
            parts.append(loft(rings))
    for s in (-1, 1):                                       # end walls, planks along Y between the long walls
        for k in range(P['planks']):
            zb = P['z0'] + k * hp + (g / 2 if k else 0); zt = P['z0'] + (k + 1) * hp - g / 2
            top = k == P['planks'] - 1
            dz = top_edge(2) if top else [0, 0, 0]
            if top:
                zt = P['H'] - 0.004
            xo, xi = s * (L / 2 - 0.004), s * (L / 2 - Te)
            rings = []
            for i in range(3):
                f = -1 + i                                  # -1, 0, 1 across Y
                ztt = zt + dz[i] * 0.5
                yb = f * (yout(zb) - T / 2); yt = f * (yout(ztt) - T / 2)
                rings.append([(xi, yb, zb), (xo, yb, zb), (xo, yt, ztt), (xi, yt, ztt)])
            parts.append(loft(rings))
    V, F = merge(parts)
    return obj('walls', V, F, 'Plank_Trough', P['bevel'])


def box(x0, x1, y0, y1, z0, z1):
    return loft([[(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)] for z in (z0, z1)])


def floor():
    L, Te, T = P['L'], P['Te'], P['T']; yi = yout(P['z0']) - T
    return obj('floor', *box(-L / 2 + Te, L / 2 - Te, -yi, yi, P['z0'], P['z0'] + P['floor_t']), 'Plank_TroughFloor')


def feet():
    parts = []; a, b = P['foot'] / 2, P['foot_bot'] / 2
    cx = P['L'] / 2 - P['foot_in'] - a; cy = P['W'] / 2 - P['foot_in'] - a
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * cx, sy * cy
            parts.append(loft([[(x - r, y - r, z), (x + r, y - r, z), (x + r, y + r, z), (x - r, y + r, z)]
                               for r, z in ((b, 0.0), (a, P['z0'] + 0.01))]))
    return obj('feet', *merge(parts), 'Timber_Leg')


def water(z):
    T, Te, L = P['T'], P['Te'], P['L']; y = yout(z) - T - 0.002; x = L / 2 - Te - 0.002
    return obj('water', [(-x, -y, z), (x, -y, z), (x, y, z), (-x, y, z)], [(0, 1, 2, 3)], 'Water')


def rivet(c, nrm, r, h, n=6):
    """a squashed cone nub at point c pointing along unit axis nrm (one of +-X, +-Y, +Z)"""
    ax = [i for i in range(3) if abs(nrm[i]) > 0.5][0]; u, v = [i for i in range(3) if i != ax]
    V = []
    for i in range(n):
        p = list(c); a = 2 * math.pi * (i + 0.5) / n
        p[u] += r * math.cos(a); p[v] += r * math.sin(a); V.append(tuple(p))
    tip = list(c); tip[ax] += nrm[ax] * h; V.append(tuple(tip))
    return V, [(i, (i + 1) % n, n) for i in range(n)]


def straps():
    """Each corner: two flat iron plates, one on the long face and one on the end face, each set back a little from the
    corner so the plank end grain shows between them (as in the hero), each with a tab folded over the rim and rivets."""
    L, a, t, T, Te, back = P['L'], P['strap_w'], P['strap_t'], P['T'], P['Te'], P['strap_back']
    z0, z1, ct = P['z0'] - P['strap_drop'], P['H'], P['cap_t']
    r, h = P['rivet_r'], P['rivet_h']; parts = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            # long-face plate: spans X, lies on the flared outer face of the long wall
            x0, x1 = L / 2 - back - a, L / 2 - back
            ring = lambda z, d: [(sx * x, sy * (yout(z) + d), z) for x in (x0, x1)]
            parts.append(loft([[*ring(z, 0), *ring(z, t)[::-1]] for z in (z0, z1)]))
            Y = yout(z1)
            parts.append(box(*sorted((sx * x0, sx * x1)), *sorted((sy * (Y + t), sy * (Y - T - P['cap_over']))), z1 - 0.01, z1 + ct))
            for z in (z0 + 0.09, z1 - 0.10):
                parts.append(rivet((sx * (x0 + x1) / 2, sy * (yout(z) + t), z), (0, sy, 0), r, h))
            parts.append(rivet((sx * (x0 + x1) / 2, sy * (Y - T / 2), z1 + ct), (0, 0, 1), r, h))
            # end-face plate: spans Y near the corner, on the end wall's outer face
            Yb = yout(P['z0']) - back
            parts.append(box(*sorted((sx * L / 2, sx * (L / 2 + t))), *sorted((sy * Yb, sy * (Yb - a))), z0, z1))
            parts.append(box(*sorted((sx * (L / 2 + t), sx * (L / 2 - Te - P['cap_over']))), *sorted((sy * Yb, sy * (Yb - a))), z1 - 0.01, z1 + ct))
            for z in (z0 + 0.09, z1 - 0.10):
                parts.append(rivet((sx * (L / 2 + t), sy * (Yb - a / 2), z), (sx, 0, 0), r, h))
            parts.append(rivet((sx * (L / 2 - Te / 2), sy * (Yb - a / 2), z1 + ct), (0, 0, 1), r, h))
    return obj('straps', *merge(parts), 'Metal_Iron')


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); rng.seed(P['seed'])
    walls(); floor(); feet(); straps()
    if P['water'][state] is not None:
        water(P['water'][state])
    dg = bpy.context.evaluated_depsgraph_get(); n = 0
    for o in bpy.context.scene.objects:
        m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); n += len(m.loop_triangles); o.evaluated_get(dg).to_mesh_clear()
    print(f'{state}: triangles {n}')


def export(path):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    bpy.ops.export_scene.gltf(filepath=path, export_format='GLB', export_animations=False, export_apply=True)


if __name__ == '__main__':
    for s in [a for a in sys.argv[1:] if a in STATES] or STATES:
        build(s); export(os.path.join(HERE, 'variants', f'{s}.glb'))
        if s == 'full':
            export(os.path.join(HERE, f'{NAME}.glb'))
