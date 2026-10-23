"""Hay rack (Ranch tile supply, replaces simulation-assets/supplies/hay-{full,partial,empty,carried}).
usage: python build.py            (builds hay-rack.glb and every variants/<state>.glb)
       python build.py full       (one state only; full is also written as hay-rack.glb)

A V-shaped pine feeder: two A-shaped end frames (a V of two angled boards on two straight legs, joined by a low
cross-rail), a top rail along each long edge, a bottom rail in the V, and diagonal slats with gaps on both V faces.
Golden hay heaps over the V with clusters of pointy straw spikes poking out in all directions.
Z up, metres, origin at the footprint centre on the ground, long side at the front (-Y).
Objects (one material each): frame + slats (Timber_Pine), hay mound + gold straw (Hay_Gold), light straw (Hay_Light).
"""
import os, sys, math, random
import bpy, bmesh
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
STATES = ['full', 'partial', 'empty', 'carried']

P = dict(
    end_x=0.575,                  # end frame plane (half the inner length)
    top_z=0.80, top_y=0.43,       # V arm tops (centre line of the boards)
    v_z=0.22,                    # V bottom (sits on the cross-rail)
    arm_w=0.095, arm_t=0.055, arm_over=0.05,   # V boards: width, thickness (x), overhang past the top rail
    leg=0.085, leg_y=0.315,       # legs: square section, y position (they meet the V arms)
    xrail_z=0.18, xrail=(0.05, 0.075),         # low cross-rail on each end (thickness x, height)
    rail=(0.085, 0.07),           # long top rails (depth, height)
    brail=(0.09, 0.05),           # long bottom rail in the V
    slat_w=0.11, slat_t=0.03, slat_step=0.22, slat_ang=42,   # diagonal slats on the V faces
    bevel=0.011,
    # hay: level of the heap rim, mound height over it, lumpiness, grid, spike clusters, spike length range
    hay=dict(
        full=dict(level=0.78, mound=0.24, lump=0.035, half_y=0.40, clusters=128, spill=8, ends=7, length=(0.08, 0.15)),
        partial=dict(level=0.58, mound=0.10, lump=0.025, half_y=None, clusters=40, spill=8, ends=4, length=(0.08, 0.15)),
    ),
    hay_nx=8, hay_ny=6, half_x=0.535,
    empty_strands=16,
    carried=dict(rx=0.23, ry=0.16, rz=0.13, clusters=46, length=(0.06, 0.11)),
    seed=11,
)
COL = dict(Timber_Pine=(192, 126, 68), Hay_Gold=(200, 150, 78), Hay_Light=(232, 202, 138))


def lin(c):
    return tuple(((v / 255) / 12.92) if v / 255 <= 0.04045 else (((v / 255) + 0.055) / 1.055) ** 2.4 for v in c)


def mat(name):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(COL[name]), 1)
    b.inputs['Roughness'].default_value = 0.85
    return m


def box(bm, c, s, X=(1, 0, 0), Y=(0, 1, 0), bevel=0.0):
    """Box of size s centred at c with its local axes X, Y (Z = X x Y), optional 1-segment chamfer."""
    tmp = bmesh.new()
    bmesh.ops.create_cube(tmp, size=1.0)
    for v in tmp.verts:
        v.co = Vector((v.co.x * s[0], v.co.y * s[1], v.co.z * s[2]))
    if bevel:
        bmesh.ops.bevel(tmp, geom=list(tmp.edges), offset=min(bevel, min(s) * 0.3), segments=1, affect='EDGES', profile=0.5)
    X = Vector(X).normalized(); Y = Vector(Y); Y = (Y - X * Y.dot(X)).normalized(); Z = X.cross(Y)
    R = Matrix((X, Y, Z)).transposed()
    for v in tmp.verts:
        v.co = (R @ v.co) + Vector(c)
    me = bpy.data.meshes.new('_t'); tmp.to_mesh(me); tmp.free()
    bm.from_mesh(me); bpy.data.meshes.remove(me)


def beam(bm, a, b, w, t, up=(1, 0, 0), bevel=0.0, over=(0.0, 0.0)):
    """Board from point a to point b (extended by over), w wide across `up`'s normal, t thick along `up`."""
    a, b = Vector(a), Vector(b); d = (b - a).normalized()
    a = a - d * over[0]; b = b + d * over[1]
    T = Vector(up); W = d.cross(T).normalized()
    box(bm, (a + b) / 2, ((b - a).length, w, t), d, W, bevel)


def finish(bm, name, material):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for p in me.polygons:
        p.use_smooth = False
    me.materials.append(mat(material))
    ob = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(ob)
    return ob


def v_z(y):
    """Height of the V's inner surface at |y|."""
    return P['v_z'] + (P['top_z'] - P['v_z']) * abs(y) / P['top_y']


def v_y(z):
    return P['top_y'] * (z - P['v_z']) / (P['top_z'] - P['v_z'])


# ---------------------------------------------------------------- rack
def rack():
    rnd = random.Random(P['seed'])
    ex, tz, ty, vz = P['end_x'], P['top_z'], P['top_y'], P['v_z']
    bm = bmesh.new()
    for sx in (-1, 1):
        x = sx * ex
        for sy in (-1, 1):            # the V: two angled boards meeting on the cross-rail
            beam(bm, (x, sy * 0.012, vz - 0.01), (x, sy * ty, tz), P['arm_w'], P['arm_t'], (1, 0, 0), P['bevel'],
                 (0.03, P['arm_over']))
            ly = sy * P['leg_y']; lh = v_z(P['leg_y']) - 0.02   # straight legs up to the arm
            box(bm, (x + sx * 0.012, ly, lh / 2), (P['leg'], P['leg'], lh),
                (1, 0, 0), (0, 1, 0), P['bevel'])
        box(bm, (x, 0, vz + 0.01), (P['arm_t'] + 0.012, 0.13, 0.10))   # block where the V boards meet
        t, h = P['xrail']             # low cross-rail joining the legs, outside the V boards
        L = 2 * P['leg_y'] + P['leg']
        box(bm, (x + sx * (0.012 + P['leg'] / 2 + t / 2 - 0.004), 0, P['xrail_z']), (t, L, h))
    Lx = 2 * ex + P['arm_t'] + 0.06   # long top rails, slightly past the end boards
    d, h = P['rail']
    for sy in (-1, 1):
        box(bm, (0, sy * (ty - 0.01), tz - h / 2 + 0.01), (Lx, d, h), bevel=P['bevel'])
    d, h = P['brail']
    box(bm, (0, 0, vz + 0.005), (2 * ex, d, h))
    frame = finish(bm, 'frame', 'Timber_Pine')
    # slats: diagonal boards lying in each V face, clipped to the end frames, with gaps between them
    bm = bmesh.new()
    S = math.hypot(ty, tz - vz); tan = math.tan(math.radians(P['slat_ang']))
    lim = ex - P['arm_t'] / 2 - 0.005
    for sy in (-1, 1):
        s_dir = Vector((0, sy * ty, tz - vz)).normalized()           # up the face
        n_in = Vector((0, -sy * (tz - vz), ty)).normalized()           # into the V
        base = Vector((0, 0, vz)) - n_in * 0.0
        t = tan * sy                                                   # front face leans like "\\" seen from the front
        u0 = -lim - S * abs(t) + P['slat_step'] * (0.3 if sy < 0 else 0.8)
        while u0 < lim + S * abs(t):
            v_a, v_b = 0.04, S - 0.05                                 # from the bottom rail to the top rail
            lo_u, hi_u = (-lim, lim) if t > 0 else (lim, -lim)        # clip u = u0 + v * t to the end frames
            v_a = max(v_a, (lo_u - u0) / t); v_b = min(v_b, (hi_u - u0) / t)
            if v_b - v_a > 0.10:
                pa = base + s_dir * v_a + Vector((u0 + v_a * t, 0, 0))
                pb = base + s_dir * v_b + Vector((u0 + v_b * t, 0, 0))
                off = -n_in * (P['slat_t'] / 2 + 0.004)
                beam(bm, pa + off, pb + off, P['slat_w'], P['slat_t'], n_in)
            u0 += P['slat_step']
    slats = finish(bm, 'slats', 'Timber_Pine')
    return [frame, slats]


# ---------------------------------------------------------------- hay
def spike(bm, p, d, L, w, rnd):
    """A pointy straw card: two triangles folded along the spike, base at p, pointing along d."""
    d = Vector(d).normalized(); a = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1)))
    side = d.cross(a).normalized(); up = d.cross(side).normalized()
    b1 = bm.verts.new(p + side * w / 2); b2 = bm.verts.new(p - side * w / 2)
    m = bm.verts.new(p + up * w * 0.45 + d * L * 0.15); tip = bm.verts.new(p + d * L)
    bm.faces.new((b1, m, tip)); bm.faces.new((m, b2, tip))


def cluster(bms, p, n_out, L, rnd, k=None, spread=0.75):
    k = k or rnd.randint(3, 5)
    for _ in range(k):
        d = Vector(n_out).normalized() + Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * spread
        q = Vector(p) + Vector((rnd.uniform(-0.02, 0.02), rnd.uniform(-0.02, 0.02), rnd.uniform(-0.015, 0.0)))
        spike(bms[rnd.random() < 0.45], q, d, rnd.uniform(*L), rnd.uniform(0.022, 0.034), rnd)


def heap(state, rnd):
    """Mound over the V: a lumpy top grid, a skirt down to the V faces, and a V-shaped underside (shows through slats)."""
    H = P['hay'][state]
    hx = P['half_x']
    hy = H['half_y'] or v_y(H['level']) - 0.02
    nx, ny = P['hay_nx'], P['hay_ny']

    def top(x, y):
        u, v = x / hx, y / hy
        prof = max(0.0, 1 - u * u) ** 0.55 * max(0.0, 1 - v * v) ** 0.65
        return H['level'] + H['mound'] * prof

    bm = bmesh.new(); grid = {}
    for j in range(ny + 1):
        for i in range(nx + 1):
            x = -hx + 2 * hx * i / nx; y = -hy + 2 * hy * j / ny
            edge = i in (0, nx) or j in (0, ny)
            if not edge:
                x += rnd.uniform(-0.3, 0.3) * hx / nx; y += rnd.uniform(-0.3, 0.3) * hy / ny
            else:                                       # ragged rim, pushed out a little past the rails
                x *= 1 + rnd.uniform(0, 0.03); y *= 1 + rnd.uniform(0, 0.06)
            z = top(x, y) + rnd.uniform(-1, 1) * H['lump'] * (0.6 if edge else 1.0)
            grid[i, j] = bm.verts.new((x, y, z))
    for j in range(ny):
        for i in range(nx):
            a, b, c, d = grid[i, j], grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]
            if (i + j) % 2:
                bm.faces.new((a, b, c)); bm.faces.new((a, c, d))
            else:
                bm.faces.new((a, b, d)); bm.faces.new((b, c, d))
    # underside: along each column, front-edge -> V bottom -> back-edge, just inside the slats
    lift = 0.035
    fr = [bm.verts.new((grid[i, 0].co.x, grid[i, 0].co.y, v_z(grid[i, 0].co.y) + lift)) for i in range(nx + 1)]
    bk = [bm.verts.new((grid[i, ny].co.x, grid[i, ny].co.y, v_z(grid[i, ny].co.y) + lift)) for i in range(nx + 1)]
    md = [bm.verts.new((grid[i, 0].co.x, 0, P['v_z'] + lift)) for i in range(nx + 1)]
    for i in range(nx):
        bm.faces.new((grid[i, 0], grid[i + 1, 0], fr[i + 1], fr[i]))
        bm.faces.new((grid[i + 1, ny], grid[i, ny], bk[i], bk[i + 1]))
        bm.faces.new((fr[i], fr[i + 1], md[i + 1], md[i]))
        bm.faces.new((md[i], md[i + 1], bk[i + 1], bk[i]))
    for i, sgn in ((0, -1), (nx, 1)):                  # end caps: fan from the V bottom
        ring = [fr[i]] + [grid[i, j] for j in range(ny + 1)] + [bk[i]]
        for a, b in zip(ring, ring[1:]):
            bm.faces.new((md[i], a, b) if sgn > 0 else (md[i], b, a))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    mound = finish(bm, 'hay', 'Hay_Gold')
    # straw: clusters of spikes over the heap (rim ones point outwards), and some poking out through the slats
    bms = [bmesh.new(), bmesh.new()]
    for _ in range(H['clusters']):
        if rnd.random() < 0.4:                          # rim cluster
            t = rnd.uniform(0, 4)
            if t < 1:   x, y = -hx + 2 * hx * t, -hy
            elif t < 2: x, y = hx, -hy + 2 * hy * (t - 1)
            elif t < 3: x, y = hx - 2 * hx * (t - 2), hy
            else:       x, y = -hx, hy - 2 * hy * (t - 3)
            n = Vector((x / hx * 0.9, y / hy, 0.35))
            p = (x * 0.97, y * 0.97, top(x * 0.97, y * 0.97) - 0.03)
            cluster(bms, p, n, H['length'], rnd, spread=0.6)
        else:
            a = rnd.uniform(0, 2 * math.pi); r = math.sqrt(rnd.random()) * 0.92
            x, y = hx * r * math.cos(a), hy * r * math.sin(a)
            n = Vector((x / hx * 1.0, y / hy * 1.1, 0.8))
            cluster(bms, (x, y, top(x, y) - 0.02), n, H['length'], rnd, spread=1.0)
    for _ in range(H['spill']):                         # through the slat gaps, below the rim
        sy = rnd.choice((-1, 1)); x = rnd.uniform(-hx * 0.9, hx * 0.9)
        z = rnd.uniform(P['v_z'] + 0.15, min(H['level'], P['top_z']) - 0.08); y = sy * v_y(z)
        cluster(bms, (x, y * 0.95, z), Vector((0, sy * 1.0, -0.25)), (0.06, 0.12), rnd, k=3, spread=0.6)
    for _ in range(H['ends']):                          # out through the end frames' V
        for sx in (-1, 1):
            y = rnd.uniform(-0.7, 0.7) * hy; z = rnd.uniform(v_z(y) + 0.05, top(hx, y) - 0.03)
            cluster(bms, (sx * hx, y, z), Vector((sx * 1.0, y / hy * 0.5, 0.1)), H['length'], rnd, k=3, spread=0.7)
    return [mound, finish(bms[0], 'straw_gold', 'Hay_Gold'), finish(bms[1], 'straw_light', 'Hay_Light')]


def strands(rnd):
    """Empty: a few loose strands lying in the bottom of the V."""
    bms = [bmesh.new(), bmesh.new()]
    for _ in range(P['empty_strands']):
        x = rnd.uniform(-0.48, 0.48); y = rnd.uniform(-0.12, 0.12)
        p = Vector((x, y, v_z(y) + 0.035))
        a = rnd.uniform(-0.6, 0.6) + (math.pi if rnd.random() < 0.5 else 0)
        d = Vector((math.cos(a), math.sin(a) * 0.5, rnd.uniform(0.0, 0.25)))
        spike(bms[rnd.random() < 0.4], p, d, rnd.uniform(0.14, 0.24), 0.035, rnd)
    for _ in range(6):                                  # a few caught in the slats, poking out
        sy = rnd.choice((-1, 1)); x = rnd.uniform(-0.45, 0.45); z = rnd.uniform(P['v_z'] + 0.08, P['v_z'] + 0.3)
        p = Vector((x, sy * v_y(z) * 0.9, z))
        spike(bms[rnd.random() < 0.4], p, Vector((rnd.uniform(-0.5, 0.5), sy, -0.3)), rnd.uniform(0.10, 0.16), 0.035, rnd)
    return [finish(bms[0], 'straw_gold', 'Hay_Gold'), finish(bms[1], 'straw_light', 'Hay_Light')]


def bundle(rnd):
    """Carried: an armful of hay alone, about 0.6 m across, resting on the ground at the origin."""
    C = P['carried']; rx, ry, rz = C['rx'], C['ry'], C['rz']
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=1.0)
    for v in bm.verts:
        k = 1 + rnd.uniform(-0.12, 0.12)
        v.co = Vector((v.co.x * rx * k, v.co.y * ry * k, v.co.z * rz * k + rz))
        if v.co.z < 0.02:
            v.co.z = v.co.z * 0.1                      # flattened underside, resting on the ground
    mound = finish(bm, 'hay', 'Hay_Gold')
    bms = [bmesh.new(), bmesh.new()]
    for k in range(C['clusters']):
        if k % 5 < 3:                                   # the sheaf's two ends fan out along its length
            sx = rnd.choice((-1, 1)); a = rnd.uniform(0, 2 * math.pi); r = math.sqrt(rnd.random()) * 0.8
            p = Vector((sx * rx * 0.8, ry * r * math.cos(a), rz + rz * r * math.sin(a) * 0.8))
            n = Vector((sx * 1.0, p.y / ry * 0.6, max(0.05, (p.z - rz) / rz * 0.6)))
            cluster(bms, p, n, C['length'], rnd, spread=0.45)
        else:                                           # loose straws lying along the top and sides
            x = rnd.uniform(-rx * 0.7, rx * 0.7); a = rnd.uniform(-0.3, math.pi + 0.3)
            p = Vector((x, ry * 0.9 * math.cos(a), rz + rz * 0.9 * math.sin(a)))
            n = Vector((rnd.choice((-1, 1)) * 1.0, math.cos(a) * 0.4, math.sin(a) * 0.4))
            cluster(bms, p, n, C['length'], rnd, k=3, spread=0.35)
    return [mound, finish(bms[0], 'straw_gold', 'Hay_Gold'), finish(bms[1], 'straw_light', 'Hay_Light')]


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
        paths.append(os.path.join(HERE, 'hay-rack.glb'))
    for p in paths:
        bpy.ops.export_scene.gltf(filepath=p, export_format='GLB', export_animations=False, export_apply=True)
    print(state, 'triangles', tris)


if __name__ == '__main__':
    for st in (sys.argv[1:] or STATES):
        export(st)
