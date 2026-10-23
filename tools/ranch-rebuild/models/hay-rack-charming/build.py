"""Hay rack, charming (storybook) style. Replaces the charming twin of simulation-assets/supplies/hay-{full,partial,empty,carried}.
usage: python build.py            (builds hay-rack-charming.glb and every variants/<state>.glb)
       python build.py full       (one state only; full is also written as hay-rack-charming.glb)

Started from models/hay-rack/build.py (same states, origin, orientation, materials and object names) and reshaped to
the charming hero: a chubby toy crib. A fat rounded top rim and a fat lower rim, each made of four log-ended beams
that cross at the corners, joined by corner posts with knobbly caps; the walls flare out towards the top (the
normal rack's V, softened into a tub) and carry chunky slats that lean in "\\ /" pairs. Four stubby splayed legs.
A plump pillow of hay bulges over the rim and between the slats, with a few fat tufts and flat light streaks.
Everything leans a little (the whole crib sways a few degrees, every slat and leg is a touch off true).
Z up, metres, origin at the footprint centre on the ground, long side at the front (-Y).
Objects (one material each): frame + slats (Timber_Pine), hay mound + gold straw (Hay_Gold), light straw (Hay_Light),
carried bundle's twine bands (Rope_Twine, new: only on the carried sheaf).
"""
import os, sys, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
NAME = 'hay-rack-charming'
STATES = ['full', 'partial', 'empty', 'carried']

P = dict(
    top=dict(hx=0.585, hy=0.44, z=0.85, s=(0.15, 0.16), over=0.08),   # top rim: centre-line half sizes, height, section (depth, height), log-end overshoot
    low=dict(hx=0.55, hy=0.405, z=0.34, s=(0.14, 0.14), over=0.075),    # lower rim (smaller: the walls flare out to the top)
    post=0.13, cap=(0.16, 0.07),                                       # corner posts; their knobbly caps (size, height above the rim)
    leg=dict(s=0.14, foot=(0.05, 0.045)),             # stubby legs: section, extra splay at the foot (x, y); taper
    slats=dict(long=6, end=4, w=0.105, t=0.065, lean=9.0, jitter=2.0),  # slats per wall, size, lean (deg, a tilted mix), random wobble (deg)
    floor=dict(n=3, w=0.20, t=0.04),                                     # floor boards resting on the lower rim
    sway=dict(x=0.03, y=-0.015),                                        # the top rim sits this far off the lower one (a gentle lean)
    bevel=0.042, bevel_seg=2,
    hay=dict(
        full=dict(top=1.12, hx=0.57, hy=0.43, bulge=0.035, lump=0.02, tufts=10, streaks=34),
        partial=dict(top=0.84, hx=0.50, hy=0.37, bulge=0.025, lump=0.016, tufts=8, streaks=12),
    ),
    empty_strands=14,
    carried=dict(rx=0.25, ry=0.17, rz=0.15, tufts=22, band_x=0.11, band_r=0.015),
    seed=11,
)
COL = dict(Timber_Pine=(176, 98, 46), Hay_Gold=(226, 152, 58), Hay_Light=(244, 196, 110), Rope_Twine=(150, 92, 52))


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


def mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
    b.inputs['Roughness'].default_value = 0.85
    return m


def box(bm, c, s, X=(1, 0, 0), Y=(0, 1, 0), bevel=0.0, seg=1, log=False):
    """Box of size s centred at c with its local axes X, Y (Z = X x Y), optional rounded bevel.
    log=True rounds only the four edges running along X (a cheap chubby log: rounded sides, flat-cut ends)."""
    tmp = bmesh.new()
    bmesh.ops.create_cube(tmp, size=1.0)
    for v in tmp.verts:
        v.co = Vector((v.co.x * s[0], v.co.y * s[1], v.co.z * s[2]))
    if bevel:
        edges = list(tmp.edges)
        if log:
            edges = [e for e in edges if abs((e.verts[0].co - e.verts[1].co).normalized().x) > 0.9]
        bmesh.ops.bevel(tmp, geom=edges, offset=min(bevel, min(s) * 0.42), segments=seg, affect='EDGES',
                        profile=0.5)
    X = Vector(X).normalized(); Y = Vector(Y); Y = (Y - X * Y.dot(X)).normalized(); Z = X.cross(Y)
    R = Matrix((X, Y, Z)).transposed()
    for v in tmp.verts:
        v.co = (R @ v.co) + Vector(c)
    me = bpy.data.meshes.new('_t'); tmp.to_mesh(me); tmp.free()
    bm.from_mesh(me); bpy.data.meshes.remove(me)


def beam(bm, a, b, w, t, up=(1, 0, 0), bevel=0.0, over=(0.0, 0.0), seg=1, log=False):
    """Board from point a to point b (extended by over), w wide across `up`'s normal, t thick along `up`."""
    a, b = Vector(a), Vector(b); d = (b - a).normalized()
    a = a - d * over[0]; b = b + d * over[1]
    T = Vector(up); T = (T - d * T.dot(d)).normalized(); W = d.cross(T).normalized()
    box(bm, (a + b) / 2, ((b - a).length, w, t), d, W, bevel, seg, log)


def finish(bm, name, material, smooth=False):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = smooth
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


def wall(z):
    """Half sizes (x, y) and centre offset of the crib's flared wall at height z (between the two rims)."""
    T, L, S = P['top'], P['low'], P['sway']
    f = (z - L['z']) / (T['z'] - L['z'])
    return (L['hx'] + (T['hx'] - L['hx']) * f, L['hy'] + (T['hy'] - L['hy']) * f, Vector((S['x'] * f, S['y'] * f, 0)))


# ---------------------------------------------------------------- rack
def rim(bm, R, off):
    """Four fat beams crossing at the corners with rounded log ends sticking out past each other."""
    d, h = R['s']; hx, hy, z = R['hx'], R['hy'], R['z']
    for sy in (-1, 1):                 # long beams sit a hair higher than the end beams, like notched logs
        box(bm, off + Vector((0, sy * hy, z + 0.008)), (2 * hx + 2 * R['over'], d, h), bevel=P['bevel'], seg=P['bevel_seg'], log=True)
    for sx in (-1, 1):
        box(bm, off + Vector((sx * hx, 0, z - 0.008)), (2 * hy + 2 * R['over'], d * 0.96, h * 0.96), (0, 1, 0), (-1, 0, 0),
            bevel=P['bevel'], seg=P['bevel_seg'], log=True)


def rack():
    rnd = random.Random(P['seed'])
    T, L, S = P['top'], P['low'], P['sway']
    top_off = Vector((S['x'], S['y'], 0)); low_off = Vector((0, 0, 0))
    bm = bmesh.new()
    rim(bm, T, top_off); rim(bm, L, low_off)
    ps = P['post']; cs, ch = P['cap']
    LG = P['leg']
    for sx in (-1, 1):
        for sy in (-1, 1):
            a = low_off + Vector((sx * L['hx'], sy * L['hy'], L['z'] - 0.02))
            b = top_off + Vector((sx * T['hx'], sy * T['hy'], T['z'] + T['s'][1] / 2 + ch * 0.4))
            beam(bm, a, b, ps, ps, (1, 0, 0), P['bevel'], seg=P['bevel_seg'], log=True)
            # knobbly cap on top of each post, a little rotated
            yaw = math.radians(rnd.uniform(-8, 8))
            box(bm, b + (b - a).normalized() * 0.02, (cs, cs * 0.92, ch), (math.cos(yaw), math.sin(yaw), 0),
                (-math.sin(yaw), math.cos(yaw), 0), P['bevel'] * 1.1, 1)
            # stubby splayed leg under the lower rim corner
            top_p = Vector((sx * L['hx'], sy * L['hy'], L['z'] - L['s'][1] / 2 + 0.03))
            foot = Vector((sx * (L['hx'] + LG['foot'][0] + rnd.uniform(-0.01, 0.01)),
                           sy * (L['hy'] + LG['foot'][1] + rnd.uniform(-0.01, 0.01)), 0.022))
            beam(bm, foot, top_p, LG['s'], LG['s'], (1, 0, 0), P['bevel'], (0.0, 0.0), P['bevel_seg'], log=True)
    # floor boards on the lower rim (they hold the hay; seen in the empty crib)
    F = P['floor']
    for k in range(F['n']):
        x = (k - (F['n'] - 1) / 2) * (2 * L['hx'] - 0.05) / F['n']
        box(bm, (x, 0, L['z'] + L['s'][1] / 2 - F['t'] / 2 - 0.01),
            ((2 * L['hx'] - 0.05) / F['n'] - 0.025, 2 * L['hy'] - 0.02, F['t']))
    frame = finish(bm, 'frame', 'Timber_Pine')
    # slats: chunky boards from the lower rim up to the top rim on all four walls, leaning in "\ /" pairs
    bm = bmesh.new()
    SL = P['slats']
    z0, z1 = L['z'] - 0.01, T['z'] + 0.01
    for face in ('front', 'back', 'left', 'right'):
        long_ = face in ('front', 'back')
        n = SL['long'] if long_ else SL['end']
        for k in range(n):
            u = (k + 0.5) / n * 2 - 1                                     # -1..1 along the wall
            lean = math.radians(SL['lean'] * (1, -0.6, 0.15, -1, 0.7)[(k + len(face)) % 5] + rnd.uniform(-SL['jitter'], SL['jitter']))
            pts = []
            for z in (z0, z1):
                hx, hy, off = wall(z)
                span = (hx if long_ else hy) - 0.10
                if long_:
                    sy = -1 if face == 'front' else 1
                    p = off + Vector((u * span, sy * (hy - 0.045), z))
                else:
                    sx = -1 if face == 'left' else 1
                    p = off + Vector((sx * (hx - 0.045), u * span, z))
                pts.append(p)
            a, b = pts
            h = (b - a).length
            along = Vector((1, 0, 0)) if long_ else Vector((0, 1, 0))
            shift = along * (math.tan(lean) * h / 2)
            a, b = a - shift, b + shift
            nrm = Vector((0, 1, 0)) if long_ else Vector((1, 0, 0))
            beam(bm, a, b, SL['w'] * rnd.uniform(0.92, 1.1), SL['t'], nrm)
    slats = finish(bm, 'slats', 'Timber_Pine')
    return [frame, slats]


# ---------------------------------------------------------------- hay
def spike(bm, p, d, L, w, rnd, flat=None):
    """A straw card: two triangles folded along the spike, base at p, pointing along d (flat: lies on that normal)."""
    d = Vector(d).normalized()
    a = Vector(flat) if flat is not None else Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1)))
    side = d.cross(a).normalized(); up = d.cross(side).normalized()
    if flat is not None and up.dot(Vector(flat)) < 0:
        up = -up
    b1 = bm.verts.new(p + side * w / 2); b2 = bm.verts.new(p - side * w / 2)
    m = bm.verts.new(p + up * w * 0.45 + d * L * 0.2); tip = bm.verts.new(p + d * L)
    bm.faces.new((b1, m, tip)); bm.faces.new((m, b2, tip))


def tuft(bms, p, n_out, rnd, k=None, L=(0.10, 0.16), spread=0.55, w=(0.05, 0.075)):
    """A fat storybook tuft: a few wide, curling-out straw cards from one spot."""
    k = k or rnd.randint(3, 4)
    for _ in range(k):
        d = Vector(n_out).normalized() + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.6, 1))) * spread
        q = Vector(p) + Vector((rnd.uniform(-0.02, 0.02), rnd.uniform(-0.02, 0.02), -0.012))
        spike(bms[rnd.random() < 0.35], q, d, rnd.uniform(*L), rnd.uniform(*w), rnd)


def spow(v, e):
    return math.copysign(abs(v) ** e, v)


def pillow(H, rnd, floor_z):
    """A plump rounded-box pillow of hay from the floor up to H['top'], bulging between the slats."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=14, v_segments=9, radius=1.0)
    zb, zt = floor_z, H['top']; zc = (zb + zt) / 2; rz = (zt - zb) / 2
    for v in bm.verts:
        x, y, z = v.co
        zz = zc + rz * spow(z, 0.95 if z > 0 else 0.35)            # domed top, flat-ish bottom
        hx, hy, off = wall(min(max(zz, P['low']['z']), P['top']['z']))
        bul = 1 + H['bulge'] / 0.4 * max(0.0, 1 - abs(z) * 1.3) * 0.4  # plump in the middle, just touching the slats
        lump = 1 + rnd.uniform(-1, 1) * H['lump'] / 0.4
        X = (hx - 0.075) * spow(x, 0.55) * bul * lump      # just inside the slats, peeking through the gaps
        Y = (hy - 0.075) * spow(y, 0.55) * bul * lump
        if zz > P['top']['z']:                                    # above the rim: a rounded cushion pushed over the rail
            X, Y = H['hx'] * spow(x, 0.8) * lump, H['hy'] * spow(y, 0.8) * lump
            off = Vector((P['sway']['x'], P['sway']['y'], 0))
        v.co = Vector((X + off.x, Y + off.y, zz + rnd.uniform(-1, 1) * H['lump'] * (1 if z > 0.2 else 0.3)))
    return bm


def heap(state, rnd):
    H = P['hay'][state]
    floor_z = P['low']['z'] + P['low']['s'][1] / 2 - 0.02
    mound = finish(pillow(H, rnd, floor_z), 'hay', 'Hay_Gold')
    bms = [bmesh.new(), bmesh.new()]
    off = Vector((P['sway']['x'], P['sway']['y'], 0))
    rim_z = P['top']['z'] + P['top']['s'][1] / 2
    hx, hy, top = H['hx'], H['hy'], H['top']

    def surf(u, v):                    # top of the pillow at normalised (u, v)
        prof = max(0.0, 1 - abs(u) ** 3) ** 0.4 * max(0.0, 1 - abs(v) ** 3) ** 0.4
        base = min(rim_z, top) if top > rim_z else top - 0.06
        return base + (top - base) * prof
    for i in range(H['tufts']):        # fat tufts: on the crown and around the rim, pointing out
        if i % 3 == 0:
            u, v = rnd.uniform(-0.6, 0.6), rnd.uniform(-0.5, 0.5); n = Vector((u * 1.6, v * 1.6, 0.45))
        else:
            a = rnd.uniform(0, 2 * math.pi); u, v = 0.88 * math.cos(a), 0.86 * math.sin(a)
            n = Vector((math.cos(a), math.sin(a), 0.05))
        p = off + Vector((u * hx, v * hy, surf(u, v) - 0.015))
        tuft(bms, p, n, rnd, spread=0.4, L=(0.09, 0.14))
    for _ in range(H['streaks']):      # flat light streaks lying over the cushion (the hero's combed straw)
        u, v = rnd.uniform(-0.7, 0.7), rnd.uniform(-0.65, 0.65)
        p = off + Vector((u * hx, v * hy, surf(u, v) + 0.004))
        d = Vector((rnd.uniform(-1, 1), rnd.uniform(-0.4, 0.4), 0)) + Vector((u, v, 0)) * 0.8
        n = Vector((u * 0.7, v * 0.7, 1)).normalized()
        d = (d - n * d.dot(n)).normalized()
        spike(bms[1], p, d, rnd.uniform(0.18, 0.28), rnd.uniform(0.026, 0.036), rnd, flat=n)
    if state == 'full':                # a few tufts poking out between the slats
        for _ in range(6):
            sy = rnd.choice((-1, 1)); z = rnd.uniform(0.5, 0.72); w_x, w_y, o = wall(z)
            p = o + Vector((rnd.uniform(-0.8, 0.8) * w_x, sy * (w_y - 0.03), z))
            tuft(bms, p, Vector((0, sy, -0.2)), rnd, k=2, L=(0.07, 0.11))
    return [mound, finish(bms[0], 'straw_gold', 'Hay_Gold'), finish(bms[1], 'straw_light', 'Hay_Light')]


def strands(rnd):
    """Empty: a few fat strands lying on the floor boards, and a couple caught in the slats."""
    bms = [bmesh.new(), bmesh.new()]
    fz = P['low']['z'] + P['low']['s'][1] / 2 - 0.045 + 0.012
    for _ in range(P['empty_strands']):
        x = rnd.uniform(-0.42, 0.42); y = rnd.uniform(-0.26, 0.26)
        a = rnd.uniform(0, 2 * math.pi)
        spike(bms[rnd.random() < 0.4], Vector((x, y, fz)), Vector((math.cos(a), math.sin(a), 0.08)),
              rnd.uniform(0.16, 0.26), 0.05, rnd, flat=(0, 0, 1))
    for _ in range(5):
        sy = rnd.choice((-1, 1)); z = rnd.uniform(0.5, 0.7); w_x, w_y, o = wall(z)
        p = o + Vector((rnd.uniform(-0.7, 0.7) * w_x, sy * (w_y - 0.02), z))
        spike(bms[rnd.random() < 0.4], p, Vector((rnd.uniform(-0.5, 0.5), sy, -0.4)), rnd.uniform(0.10, 0.15), 0.05, rnd)
    return [finish(bms[0], 'straw_gold', 'Hay_Gold'), finish(bms[1], 'straw_light', 'Hay_Light')]


def ring(bm, x, ry, rz, zc, r, n=12, m=4):
    """A twine band around the sheaf: a thin torus in the YZ plane at x."""
    rows = []
    for i in range(n):
        a = 2 * math.pi * i / n
        c = Vector((x, ry * math.cos(a), zc + rz * math.sin(a)))
        nrm = Vector((0, math.cos(a) / ry, math.sin(a) / rz)).normalized()
        rows.append([bm.verts.new(c + (nrm * math.cos(2 * math.pi * j / m) + Vector((1, 0, 0)) * math.sin(2 * math.pi * j / m)) * r)
                     for j in range(m)])
    for i in range(n):
        for j in range(m):
            a, b = rows[i][j], rows[i][(j + 1) % m]; c, d = rows[(i + 1) % n][(j + 1) % m], rows[(i + 1) % n][j]
            bm.faces.new((a, b, c, d))


def bundle(rnd):
    """Carried: a plump armful sheaf (about 0.65 m long) cinched by two twine bands, resting on the ground at the origin."""
    C = P['carried']; rx, ry, rz = C['rx'], C['ry'], C['rz']
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=12, v_segments=7, radius=1.0)
    bx = C['band_x']
    for v in bm.verts:
        k = 1 + rnd.uniform(-0.07, 0.07)
        x = v.co.x
        pinch = 1 - 0.13 * math.exp(-((abs(x * rx) - bx) / 0.05) ** 2)    # waisted where the bands bite
        v.co = Vector((spow(x, 0.8) * rx * k, v.co.y * ry * k * pinch, v.co.z * rz * k * pinch + rz))
        if v.co.z < 0.02:
            v.co.z *= 0.1
    mound = finish(bm, 'hay', 'Hay_Gold')
    bms = [bmesh.new(), bmesh.new()]
    for k in range(C['tufts']):
        if k % 3 < 2:                                  # the two ends burst out
            sx = rnd.choice((-1, 1)); a = rnd.uniform(0, 2 * math.pi); r = math.sqrt(rnd.random()) * 0.75
            p = Vector((sx * rx * 0.85, ry * r * math.cos(a), rz + rz * r * math.sin(a)))
            tuft(bms, p, Vector((sx, p.y / ry * 0.7, (p.z - rz) / rz * 0.7 + 0.1)), rnd, k=3, L=(0.08, 0.13), spread=0.4)
        else:                                          # combed streaks along the top
            x = rnd.uniform(-rx * 0.6, rx * 0.6); a = rnd.uniform(0.3, math.pi - 0.3)
            p = Vector((x, ry * 0.97 * math.cos(a), rz + rz * 0.97 * math.sin(a)))
            n = Vector((0, math.cos(a), math.sin(a)))
            spike(bms[1], p, Vector((rnd.choice((-1, 1)), 0, 0)), rnd.uniform(0.12, 0.2), 0.04, rnd, flat=n)
    out = [mound, finish(bms[0], 'straw_gold', 'Hay_Gold'), finish(bms[1], 'straw_light', 'Hay_Light')]
    bm = bmesh.new()
    for sx in (-1, 1):
        ring(bm, sx * bx, ry * 0.86, rz * 0.86, rz, C['band_r'])
    out.append(finish(bm, 'twine', 'Rope_Twine', smooth=True))
    return out


def build(state):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    rnd = random.Random(P['seed'] + STATES.index(state))
    if state == 'carried':
        return bundle(rnd)
    obs = rack()
    if state in P['hay']:
        obs += heap(state, rnd)
    else:
        obs += strands(rnd)
    return obs


def export(state):
    obs = build(state)
    tris = 0
    for o in obs:
        m = o.data; m.calc_loop_triangles(); tris += len(m.loop_triangles)
    os.makedirs(os.path.join(HERE, 'variants'), exist_ok=True)
    paths = [os.path.join(HERE, 'variants', f'{state}.glb')]
    if state == 'full':
        paths.append(os.path.join(HERE, f'{NAME}.glb'))
    for p in paths:
        bpy.ops.export_scene.gltf(filepath=p, export_format='GLB', export_animations=False, export_apply=True)
    print(state, 'triangles', tris)


if __name__ == '__main__':
    for st in (sys.argv[1:] or STATES):
        export(st)
