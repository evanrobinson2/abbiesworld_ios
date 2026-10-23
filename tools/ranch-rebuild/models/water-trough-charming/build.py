"""Water trough, charming (storybook toy) version of models/water-trough. Replaces, in the charming tree,
simulation-assets/supplies/water-trough-{full,partial,empty}.json.
Same object, same structure as the normal build: a long plank trough on four short feet with iron at the corners
and a water surface. What changes is the toy feel: every plank is a plump, pillowy log with a rounded section that
bulges outwards, each wall has two fat planks under a big round rim beam that overhangs the walls on all four sides,
planks sit a little crooked (small random tilts and a sag/hump along their length), the feet are chunky rounded
blocks, and the iron is oversized: a bracket folded over each rim corner with big square bolt heads, and a strap
running down the long face. Z up, metres, origin at the centre of the footprint on the ground, front (long side) -Y.
usage: python build.py            builds every fill state, writes variants/<state>.glb and water-trough-charming.glb (= full)
       python build.py full       one state only"""
import os, sys, math, random
import bpy, bmesh

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'water-trough-charming'
STATES = ['full', 'partial', 'empty']

P = dict(
    L=1.75, W=0.62, H=0.46,     # overall length (X) and width (Y) of the walls' outer faces, height to the rim top
    z0=0.10,                    # underside of the walls (top of the feet)
    planks=2,                   # plump wall planks under the rim, bottom to top
    T=0.085,                    # wall plank thickness
    bulge=0.016,                # how far a plank's face bulges out past its edges (the pillow)
    sq=5.0, rim_sq=4.5,                     # superellipse exponent of the plank section (2 = ellipse, higher = boxier)
    sec=8,                      # points around a plank section
    segs=4,                     # length segments per long plank (sag, hump, wobble)
    belly=0.03,                 # the long walls bow outwards at mid-length by this much (plump, not ruler-straight)
    groove=0.010,               # gap between planks
    tilt=2.2, wobble=0.010, sag=0.012,   # deg of random roll per plank, random +- z per segment, mean hump of the top
    rim_h=0.10, rim_w=0.15, rim_out=0.022,   # rim beam: height, width, how far it overhangs the wall's outer face
    rim_over=0.03,              # the long rim beams run past the ends by this much (chunky corner ends)
    floor_t=0.05,
    foot=0.185, foot_bot=0.165, foot_in=0.035, foot_round=0.025,   # foot size at top / bottom, inset, top rounding
    strap_w=0.11,  strap_t=0.016, strap_back=0.075, strap_drop=0.02,
    cap_t=0.018, cap_len=0.20, cap_w=0.12,    # the bracket over each rim corner: thickness, arm length, arm width
    bolt=0.040, bolt_h=0.016,                 # square bolt heads
    water={'full': 0.40, 'partial': 0.28, 'empty': None},   # water surface z per state
    colours=dict(Plank_Trough=(168, 98, 54), Plank_TroughFloor=(136, 76, 40), Timber_Leg=(120, 64, 30),
                 Metal_Iron=(70, 70, 62), Water=(150, 205, 222)),
    rough=dict(Plank_Trough=0.8, Plank_TroughFloor=0.85, Timber_Leg=0.85, Metal_Iron=0.55, Water=0.15),
    seed=11,
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


def obj(name, verts, faces, m, smooth=False):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], [], faces); me.validate()
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.recalc_face_normals(bm, faces=bm.faces); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    me.materials.append(mat(m))
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
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


rng = random.Random(P['seed'])


def section(hw, hh, bulge, n=None, p=None):
    """a pillowy plank section in local (u across, v up): a superellipse, its outer side (u > 0) pushed out by bulge
    at mid-height, so the plank bulges like a stuffed toy. Returns n (u, v) points, counter-clockwise."""
    n = n or P['sec']; p = p or P['sq']; pts = []
    for i in range(n):
        a = 2 * math.pi * (i + 0.5) / n
        c, s = math.cos(a), math.sin(a)
        u = hw * math.copysign(abs(c) ** (2 / p), c); v = hh * math.copysign(abs(s) ** (2 / p), s)
        if u > 0:
            u += bulge * (1 - (v / hh) ** 2) * (u / hw)
        pts.append((u, v))
    return pts


def plank(axis, side, a0, a1, off, zc, hw, hh, bulge, segs, top=False, end_round=0.7, sq=None, belly=0.0):
    """A plump plank running along `axis` ('x' or 'y') from a0 to a1, its centre `off` out from the middle on the
    other axis (side = -1/+1: which way is outwards), centre height zc. Each segment ring gets a small random roll,
    a sag/hump and a wobble; the end rings are shrunk so the plank ends look rounded and soft."""
    roll = math.radians(rng.uniform(-P['tilt'], P['tilt']))
    hump = rng.uniform(0.3, 1.0) * P['sag'] * (1 if top else rng.choice((-1, 1)))
    sec = section(hw, hh, bulge, p=sq)
    stations = [(0.0, end_round)] + [(i / segs, 1.0) for i in range(segs + 1)] + [(1.0, end_round)]
    shift = 0.018                                   # how far the shrunk end rings sit back from the plank end
    rings = []
    for k, (t, sc) in enumerate(stations):
        a = a0 + (a1 - a0) * t
        if k == 1:
            a = a0 + math.copysign(shift, a1 - a0)
        if k == len(stations) - 2:
            a = a1 - math.copysign(shift, a1 - a0)
        dz = hump * math.sin(math.pi * t) + (rng.uniform(-P['wobble'], P['wobble']) if 0 < t < 1 else 0)
        ring = []
        for u, v in sec:
            u, v = u * sc, v * sc
            u, v = u * math.cos(roll) - v * math.sin(roll), u * math.sin(roll) + v * math.cos(roll)
            w = side * (off + u + belly * math.sin(math.pi * t)); z = zc + v + dz
            ring.append((a, w, z) if axis == 'x' else (w, a, z))
        rings.append(ring)
    return loft(rings)


def wall_y():
    """centre line (|y|) of the long wall planks"""
    return P['W'] / 2 - P['T'] / 2


def rim_z():
    return P['H'] - P['rim_h'] / 2


def walls():
    L, T, g = P['L'], P['T'], P['groove']
    zt = P['H'] - P['rim_h']; hp = (zt - P['z0']) / P['planks']; parts = []
    for s in (-1, 1):                                       # long walls, planks along X
        for k in range(P['planks']):
            zc = P['z0'] + (k + 0.5) * hp
            parts.append(plank('x', s, -L / 2 + 0.01, L / 2 - 0.01, wall_y(), zc, T / 2, hp / 2 - g / 2, P['bulge'], P['segs'], belly=P['belly']))
    for s in (-1, 1):                                       # end walls, planks along Y between the long walls
        for k in range(P['planks']):
            zc = P['z0'] + (k + 0.5) * hp; yi = P['W'] / 2 - T * 0.6
            parts.append(plank('y', s, -yi, yi, L / 2 - T / 2, zc, T / 2, hp / 2 - g / 2, P['bulge'], 2))
    return obj('walls', *merge(parts), 'Plank_Trough')


def rim():
    """four big round rim beams overhanging the walls: the long ones run past the ends, the end ones sit between"""
    L, W, hw, hh, out = P['L'], P['W'], P['rim_w'] / 2, P['rim_h'] / 2, P['rim_out']
    yc = W / 2 + out - hw; xc = L / 2 + out - hw; parts = []
    for s in (-1, 1):
        a = L / 2 + P['rim_over']
        parts.append(plank('x', s, -a, a, yc, rim_z(), hw, hh, P['bulge'] * 0.6, P['segs'], top=True, end_round=0.8, sq=P['rim_sq'], belly=P['belly'] * 0.6))
    for s in (-1, 1):
        a = yc - hw * 0.8
        parts.append(plank('y', s, -a, a, xc, rim_z() - 0.004, hw, hh * 0.96, P['bulge'] * 0.6, 3, top=True, end_round=0.9, sq=P['rim_sq']))
    return obj('rim', *merge(parts), 'Plank_Trough')


def box(x0, x1, y0, y1, z0, z1):
    return loft([[(x0, y0, z), (x1, y0, z), (x1, y1, z), (x0, y1, z)] for z in (z0, z1)])


def floor():
    L, T = P['L'], P['T']; yi = P['W'] / 2 - T + 0.01; xi = L / 2 - T + 0.01
    return obj('floor', *box(-xi, xi, -yi, yi, P['z0'], P['z0'] + P['floor_t']), 'Plank_TroughFloor')


def feet():
    """chunky blocks, a little wider at the top, with a rounded shoulder, each turned and leaning a touch"""
    parts = []; a, b, r = P['foot'] / 2, P['foot_bot'] / 2, P['foot_round']
    cx = P['L'] / 2 - P['foot_in'] - a; cy = P['W'] / 2 - P['foot_in'] - a
    for sx in (-1, 1):
        for sy in (-1, 1):
            x, y = sx * cx, sy * cy; tw = math.radians(rng.uniform(-6, 6)); lean = rng.uniform(-0.008, 0.008)
            rings = []
            for half, z in ((b, 0.0), (b * 1.04, 0.02), (a, P['z0'] - r), (a - r * 0.5, P['z0'] + 0.01)):
                ring = []
                for qx, qy in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                    px, py = qx * half, qy * half
                    ring.append((x + px * math.cos(tw) - py * math.sin(tw) + lean * z / P['z0'], y + px * math.sin(tw) + py * math.cos(tw), z))
                rings.append(ring)
            parts.append(loft(rings))
    return obj('feet', *merge(parts), 'Timber_Leg')


def water(z):
    """the water surface: a flat panel out to the inner faces, its long edges following the walls' belly"""
    T, L, W = P['T'], P['L'], P['W']; y = W / 2 - T + 0.008; x = L / 2 - T + 0.008; b = P['belly']
    if z > P['H'] - P['rim_h']:                 # up in the rim: the rim beams' inner faces sit further in
        y = W / 2 + P['rim_out'] - P['rim_w'] + 0.008; x = L / 2 + P['rim_out'] - P['rim_w'] + 0.008; b *= 0.6
    n = P['segs']; V = []
    for i in range(n + 1):
        t = i / n; xx = -x + 2 * x * t; yy = y + b * math.sin(math.pi * t)
        V += [(xx, -yy, z), (xx, yy, z)]
    F = [(2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1) for i in range(n)]
    return obj('water', V, F, 'Water')


def bolt(c, ax, sgn, s, h):
    """a square bolt head (a small frustum) at c, sticking out along axis ax (0, 1, 2) in direction sgn"""
    u, v = [i for i in range(3) if i != ax]
    def ring(half, d):
        out = []
        for qu, qv in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
            p = list(c); p[u] += qu * half; p[v] += qv * half; p[ax] += sgn * d; out.append(tuple(p))
        return out
    return loft([ring(s / 2, -0.004), ring(s / 2, h * 0.6), ring(s / 2 * 0.7, h)])


def straps():
    """Each corner: a bracket folded over the rim corner (one arm along the long rim, one along the end rim, a lip
    down each outer face) with big bolt heads, and a strap down the long face from the rim to below the walls."""
    L, W = P['L'], P['W']; t, ct = P['strap_t'], P['cap_t']; bs, bh = P['bolt'], P['bolt_h']
    ztop = P['H'] + 0.004; yr = W / 2 + P['rim_out']; xr = L / 2 + P['rim_out']; cl, cw = P['cap_len'], P['cap_w']
    parts = []
    for sx in (-1, 1):
        for sy in (-1, 1):
            # bracket arms on the rim top (an L seen from above), wrapping the corner
            xa0, xa1 = xr + P['rim_over'] - cl, xr + P['rim_over'] + 0.012
            parts.append(box(*sorted((sx * xa0, sx * xa1)), *sorted((sy * (yr + 0.012), sy * (yr - cw))), ztop - 0.01, ztop + ct))
            ya0 = yr - cl * 0.85
            parts.append(box(*sorted((sx * (xr - cw), sx * (xr + 0.012))), *sorted((sy * ya0, sy * (yr - cw))), ztop - 0.01, ztop + ct))
            # lip down the long rim's outer face
            parts.append(box(*sorted((sx * xa0, sx * (xa0 + cw * 0.9))), *sorted((sy * yr, sy * (yr + t))), ztop - P['rim_h'] * 0.75, ztop + ct))
            for bx, by in ((xa0 + cw * 0.35, yr - cw * 0.5), (xr - cw * 0.5, ya0 + cw * 0.3)):
                parts.append(bolt((sx * bx, sy * by, ztop + ct), 2, 1, bs, bh))
            # strap down the long face, from under the rim to below the walls
            xs0, xs1 = L / 2 - P['strap_back'] - P['strap_w'], L / 2 - P['strap_back']
            yw = W / 2 + P['bulge'] * 0.7
            zb, ztp = P['z0'] - P['strap_drop'], P['H'] - P['rim_h'] + 0.01
            parts.append(box(*sorted((sx * xs0, sx * xs1)), *sorted((sy * (yw - 0.03), sy * (yw + t))), zb, ztp))
            for z in (zb + 0.06, ztp - 0.07):
                parts.append(bolt((sx * (xs0 + xs1) / 2, sy * (yw + t), z), 1, sy, bs * 0.85, bh))
            parts.append(bolt((sx * (xs0 + xs1) / 2, sy * (yr + t), rim_z()), 1, sy, bs, bh))
    return obj('straps', *merge(parts), 'Metal_Iron')


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    MATS.clear(); rng.seed(P['seed'])
    walls(); rim(); floor(); feet(); straps()
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
