"""Lidded reed hamper (BA-0023), style B whimsical. `python build.py` writes hamper-whimsical.glb.
Z up, metres, origin at the footprint centre on the ground, front faces -Y.
A plump round-bellied woven pot: the weave is real geometry (each weft row is its own ring strip of puffy
blocks; blocks are offset half a block on alternate rows and alternate between two straw shades and two puff
depths, over/under). A squat round belly with a tucked-in foot, a small collar, a lid that is one plump lumpy
pillow (a fat rolled edge overhanging the collar with the woven dome rising out of it), a tall fat plait handle
carried by the lid, rope hinge lashings at the back, a big wooden toggle ring with a chunky peg on the front-right
shoulder, and a sprout poking out of the lid. Animation: the lid lifts on its back hinge, holds, drops shut, settles ajar; the sprout bobs."""
import bpy, math, os
from mathutils import Vector, Matrix, Euler

P = dict(
    # round 8 (art director): a squat round pot, belly ~25% wider and ~15% lower than the sheet, widest ~40% up,
    # the bottom tucked in. Body profile (z, r) in metres.
    body=[(0.00, 0.200), (0.025, 0.255), (0.055, 0.310), (0.09, 0.350), (0.125, 0.368), (0.146, 0.372), (0.175, 0.368),
          (0.21, 0.352), (0.25, 0.325), (0.29, 0.295), (0.33, 0.272), (0.365, 0.262)],
    body_z=(0.022, 0.365), body_rows=6, body_blocks=12, puff=0.019, puff_under=0.010, groove=0.010, lip_overlap=0.004,
    foot=((0.215, 0.024), (0.18, 0.004), (0.13, 0.0)),
    collar_z=0.385, collar_R=0.238, collar_r=0.030,
    hinge=(0.0, 0.29, 0.40),                        # lid hinge axis (along X) at the back of the rolled edge
    # lid: one plump, slightly lumpy pillow -- a fat rolled edge that overhangs the collar, the woven dome rising out of it
    roll_z=0.425, roll_R=0.255, roll_r=0.058, lump=0.03,
    dome=[(0.43, 0.262), (0.47, 0.262), (0.51, 0.24), (0.545, 0.198), (0.572, 0.13), (0.596, 0.0)],
    dome_rows=3, dome_blocks=11,
    # fat plait handle, lid-mounted; the top is ~0.47 of the total height above the lid top
    handle=[(0.245, 0.43), (0.242, 0.56), (0.228, 0.70), (0.19, 0.85), (0.12, 0.99), (0.0, 1.07)],
    handle_r=0.043, handle_seg=60, handle_sides=6, plait_bulges=16,
    # big toggle ring (outer diameter ~0.25 m) lying on the front-right shoulder, with a chunky peg through it
    toggle_az=-15, toggle_z=0.275, toggle_R=0.083, toggle_r=0.042,
    sprout=(-0.155, -0.105), sprout_z=0.535, weave_smooth=True,
    ajar_deg=3, open_deg=38,
)
# sRGB picked from the hero (the turnaround is darker brown; the hero's lighter straw wins)
S = dict(Straw=(210, 160, 95), StrawLight=(226, 180, 112), StrawRim=(220, 170, 102), Braid=(206, 164, 100),
         ToggleWood=(150, 84, 36), PegWood=(196, 146, 88), Leaf=(96, 152, 62), Stem=(120, 160, 70), InnerShade=(92, 56, 24))
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'hamper-whimsical.glb')


def lin(c):
    return tuple(((x / 255) / 12.92) if x / 255 <= 0.04045 else (((x / 255) + 0.055) / 1.055) ** 2.4 for x in c)


bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
sc.frame_start, sc.frame_end = 1, 120
sc.render.fps = 24
MATS = {}
for k, c in S.items():
    m = bpy.data.materials.new(k); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (*lin(c), 1)
    b.inputs['Roughness'].default_value = 0.85
    MATS[k] = m


def make(name, verts, faces, mats, fmat=None, parent=None, smooth=True):
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], [], faces); me.update()
    for k in mats:
        me.materials.append(MATS[k])
    if fmat:
        for p, i in zip(me.polygons, fmat):
            p.material_index = i
    for p in me.polygons:
        p.use_smooth = smooth
    o = bpy.data.objects.new(name, me); sc.collection.objects.link(o)
    if parent:
        o.parent = parent
    return o


def interp(prof, z):
    for (z0, r0), (z1, r1) in zip(prof, prof[1:]):
        if z0 <= z <= z1:
            t = (z - z0) / (z1 - z0); return r0 + (r1 - r0) * t
    return prof[0][1] if z < prof[0][0] else prof[-1][1]


def pnormal(prof, z):
    dz = 0.004; dr = interp(prof, z + dz) - interp(prof, z - dz)
    l = math.hypot(dr, 2 * dz); return (2 * dz / l, -dr / l)     # (radial, vertical) outward


def lumpf(a):
    return 0.6 * math.sin(3 * a + 0.7) + 0.4 * math.sin(5 * a + 2.1)


def weave(prof, z0, z1, rows, blocks, V, F, M, phase=0, cap=None, lump=0.0):
    """Ring strips of puffy blocks. Each row: 3 vertex rings (lower lip, crest, upper lip); per block 3 columns
    (groove edge, crest, crest). Alternate rows shift half a block; blocks alternate shade and puff depth."""
    h = (z1 - z0) / rows; nc = blocks * 3
    for r in range(rows):
        za, zb = z0 + r * h - P['lip_overlap'], z0 + (r + 1) * h + (P['lip_overlap'] if r < rows - 1 else 0)
        off = (0.5 if (r + phase) % 2 else 0.0) * 2 * math.pi / blocks
        base = len(V)
        for zz, lip in ((za, True), (za + 0.3 * (zb - za), False), (za + 0.7 * (zb - za), False), (zb, True)):
            rr = interp(prof, zz); nr, nz = pnormal(prof, zz)
            for c in range(nc):
                a = off + 2 * math.pi * (c - (0.35 if c % 3 == 1 else 0) + (0.35 if c % 3 == 2 else 0)) / nc
                blk = c // 3; over = (blk + r + phase) % 2 == 0
                pf = P['puff'] if over else P['puff_under']
                d = -P['groove'] if (c % 3 == 0 or lip) else pf
                if lip and c % 3:
                    d = pf * 0.15
                k = 1 + lump * lumpf(a)
                V.append(Vector(((rr * k + nr * d) * math.cos(a), (rr * k + nr * d) * math.sin(a), zz + nz * d + lump * 0.4 * rr * lumpf(a + 1))))
        for k in range(3):
            for c in range(nc):
                i0 = base + k * nc + c; i1 = base + k * nc + (c + 1) % nc
                F.append((i0, i1, i1 + nc, i0 + nc)); M.append(1 if ((c // 3) + r + phase) % 2 else 0)
    if cap is not None:          # puffy top cap fan from the last ring
        zc, rc = cap; ring = len(V); n = 16
        rr = interp(prof, z1);
        for c in range(n):
            a = 2 * math.pi * c / n
            k = 1 + lump * lumpf(a)
            V.append(Vector((rr * 0.98 * k * math.cos(a), rr * 0.98 * k * math.sin(a), z1 - 0.002 + lump * 0.4 * rr * lumpf(a + 1))))
        mid = len(V)
        for c in range(n):
            a = 2 * math.pi * (c + 0.5) / n
            V.append(Vector((rr * 0.55 * math.cos(a), rr * 0.55 * math.sin(a), (z1 + zc) / 2 + 0.004)))
        V.append(Vector((0, 0, zc))); top = len(V) - 1
        for c in range(n):
            F.append((ring + c, ring + (c + 1) % n, mid + c)); M.append(0)
            F.append((mid + c, ring + (c + 1) % n, mid + (c + 1) % n)); M.append(1)
            F.append((mid + c, mid + (c + 1) % n, top)); M.append(0)


def torus(center, R, r, nmaj, nmin, period=3, bulge=0.18, twist=0.0, axis='Z', squash=1.0, lump=0.0):
    V, F = [], []
    for i in range(nmaj):
        u = 2 * math.pi * i / nmaj
        k = 1 + bulge * math.cos(2 * math.pi * i / period)
        for j in range(nmin):
            v = 2 * math.pi * j / nmin + twist * u
            rr = r * k
            RR = R * (1 + lump * lumpf(u))
            x = (RR + rr * math.cos(v)) * math.cos(u); y = (RR + rr * math.cos(v)) * math.sin(u)
            z = rr * math.sin(v) * squash + lump * 0.4 * R * lumpf(u + 1)
            p = Vector((x, y, z)) if axis == 'Z' else Vector((z, x, y))
            V.append(p + Vector(center))
    for i in range(nmaj):
        for j in range(nmin):
            a = i * nmin + j; b = ((i + 1) % nmaj) * nmin + j
            F.append((a, b, ((i + 1) % nmaj) * nmin + (j + 1) % nmin, i * nmin + (j + 1) % nmin))
    return V, F


def catmull(pts, n):
    P_ = [pts[0]] + pts + [pts[-1]]; out = []
    segs = len(pts) - 1
    for s in range(segs):
        p0, p1, p2, p3 = P_[s], P_[s + 1], P_[s + 2], P_[s + 3]
        m = n // segs
        for i in range(m):
            t = i / m
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1]); return out


def tube(path, radius, sides, lobes=3, lobe_amt=0.22, twist=0.0, cap=True, plane_y=True):
    V, F = [], []
    n = len(path)
    for i, p in enumerate(path):
        t = (path[min(i + 1, n - 1)] - path[max(i - 1, 0)]).normalized()
        b = Vector((0, 1, 0)) if plane_y else (t.cross(Vector((0, 0, 1))).normalized() if abs(t.z) < 0.99 else Vector((1, 0, 0)))
        nn = b.cross(t).normalized(); b = t.cross(nn).normalized()
        s = i / (n - 1)
        for j in range(sides):
            a = 2 * math.pi * j / sides
            rr = radius(s) if callable(radius) else radius
            rr *= 1 + lobe_amt * math.cos(lobes * a + twist * s * 2 * math.pi)
            V.append(p + (nn * math.cos(a) + b * math.sin(a)) * rr)
    for i in range(n - 1):
        for j in range(sides):
            F.append((i * sides + j, i * sides + (j + 1) % sides, (i + 1) * sides + (j + 1) % sides, (i + 1) * sides + j))
    if cap:
        F.append(tuple(reversed(range(sides)))); F.append(tuple((n - 1) * sides + j for j in range(sides)))
    return V, F


# ------------------------------------------------------------------ body (static)
V, F, M = [], [], []
weave(P['body'], *P['body_z'], P['body_rows'], P['body_blocks'], V, F, M)
# tucked-in rolled foot and bottom disc
base = len(V); n = 16
for k, (rr, zz) in enumerate(P['foot']):
    for c in range(n):
        a = 2 * math.pi * (c + 0.5 * k) / n; V.append(Vector((rr * math.cos(a), rr * math.sin(a), zz)))
for k in range(2):
    for c in range(n):
        i0 = base + k * n + c; i1 = base + k * n + (c + 1) % n
        F.append((i0, i1, i1 + n, i0 + n)); M.append(0)
F.append(tuple(reversed(range(base + 2 * n, base + 3 * n)))); M.append(0)
body = make('body', V, F, ['Straw', 'StrawLight'], M, smooth=P['weave_smooth'])

v, f = torus((0, 0, P['collar_z']), P['collar_R'], P['collar_r'], 20, 5, period=2, bulge=0.12, twist=1.5, squash=0.85)
collar = make('body_collar', v, f, ['StrawRim'])
# shadowed inside of the basket, seen when the lid lifts
n = 16; v = [Vector((0, 0, P['collar_z'] - 0.04))] + [Vector((0.235 * math.cos(2 * math.pi * c / n), 0.235 * math.sin(2 * math.pi * c / n), P['collar_z'] - 0.008)) for c in range(n)]
inner = make('body_inside', v, [(0, c + 1, (c + 1) % n + 1) for c in range(n)], ['InnerShade'])

# big wooden toggle ring lying on the front-right shoulder, with a chunky peg through its hole (the latch)
az = math.radians(P['toggle_az']); zt = P['toggle_z']
rb = interp(P['body'], zt); nr, nz = pnormal(P['body'], zt)
nrm = Vector((nr * math.cos(az), nr * math.sin(az), nz)).normalized()
tc = Vector((rb * math.cos(az), rb * math.sin(az), zt)) + nrm * (P['puff'] + P['toggle_r'] * 0.8)
rot = Vector((0, 0, 1)).rotation_difference(nrm).to_matrix()
v, f = torus((0, 0, 0), P['toggle_R'], P['toggle_r'], 18, 7, period=6, bulge=0.06, squash=0.8)
toggle = make('toggle_ring', [rot @ x + tc for x in v], f, ['ToggleWood'])
side = nrm.cross(Vector((0, 0, 1))).normalized()
peg_path = [tc - nrm * 0.03 + side * 0.01, tc + nrm * 0.04 - Vector((0, 0, 0.015)), tc + nrm * 0.075 - Vector((0, 0, 0.035)) - side * 0.01]
v, f = tube(peg_path, lambda s: 0.027 * (1 - 0.2 * s), 7, lobe_amt=0.0, plane_y=False)
peg = make('toggle_peg', v, f, ['PegWood'])

# rope lashings at the back that act as the lid's hinge
LV, LF = [], []
for hx in (-0.07, 0.07):
    v, f = torus((hx, P['hinge'][1], P['hinge'][2]), 0.024, 0.011, 6, 4, period=2, bulge=0.0, axis='X')
    o = len(LV); LV += v; LF += [tuple(i + o for i in t) for t in f]
make('hinge_lashing', LV, LF, ['Braid'])

# ------------------------------------------------------------------ lid (moves on its hinge)
hinge = bpy.data.objects.new('lid_hinge', None); sc.collection.objects.link(hinge)
hinge.location = P['hinge']; hinge.empty_display_size = 0.05
HV = Vector(P['hinge'])
V, F, M = [], [], []
weave(P['dome'], P['dome'][0][0], P['dome'][-2][0], P['dome_rows'], P['dome_blocks'], V, F, M, phase=1,
      cap=(P['dome'][-1][0], 0), lump=P['lump'])
# underside of the lid
ring = len(V); n = 16
for c in range(n):
    a = 2 * math.pi * c / n; V.append(Vector((0.26 * math.cos(a), 0.26 * math.sin(a), P['roll_z'] - 0.03)))
V.append(Vector((0, 0, P['roll_z'])))
for c in range(n):
    F.append((ring + (c + 1) % n, ring + c, ring + n)); M.append(2)
lid = make('lid', [x - HV for x in V], F, ['Straw', 'StrawLight', 'InnerShade'], M, parent=hinge, smooth=P['weave_smooth'])
v, f = torus((0, 0, P['roll_z']), P['roll_R'], P['roll_r'], 28, 7, period=4, bulge=0.10, twist=1.0, squash=0.75, lump=P['lump'])
brim = make('lid_roll', [x - HV for x in v], f, ['StrawRim'], parent=hinge)

# fat plait handle, carried by the lid: three twisted lobes that turn a third per segment, with a bulge per segment
pts = [Vector((-x, 0, z)) for x, z in P['handle']] + [Vector((x, 0, z)) for x, z in reversed(P['handle'][:-1])]
path = catmull(pts, P['handle_seg'])
K = P['plait_bulges']
v, f = tube(path, lambda s: P['handle_r'] * (0.8 + 0.32 * math.sin(math.pi * s * K) ** 2), P['handle_sides'], lobes=3,
            lobe_amt=0.2, twist=K / 3)
make('handle_braid', [x - HV for x in v], f, ['Braid'], parent=hinge)
LV, LF = [], []
for sgn in (-1, 1):
    v, f = torus((sgn * 0.248, 0, P['roll_z'] + 0.02), 0.034, 0.024, 6, 5, period=2, bulge=0.0, axis='X')
    o = len(LV); LV += v; LF += [tuple(i + o for i in t) for t in f]
make('handle_lugs', [x - HV for x in LV], LF, ['StrawRim'], parent=hinge)

# sprout: grows out of a gap in the lid weave, bobs on its own origin
sx, sy = P['sprout']; sz = P['sprout_z']
sprout = bpy.data.objects.new('sprout', None); sc.collection.objects.link(sprout)
sprout.parent = hinge; sprout.location = Vector((sx, sy, sz)) - HV
stem_pts = catmull([Vector((0, 0, -0.03)), Vector((0.006, 0, 0.06)), Vector((-0.012, -0.006, 0.14)), Vector((-0.03, -0.01, 0.19))], 9)
v, f = tube(stem_pts, lambda s: 0.009 * (1 - 0.4 * s), 5, lobe_amt=0.0, plane_y=False)
make('sprout_stem', v, f, ['Stem'], parent=sprout)


def leaf(base, direction, length, width, up):
    d = Vector(direction).normalized(); side = d.cross(Vector((0, 0, 1))).normalized()
    b = Vector(base); tip = b + d * length + Vector((0, 0, up))
    m1 = b + d * length * 0.45 + side * width + Vector((0, 0, up * 0.6 + 0.012))
    m2 = b + d * length * 0.45 - side * width + Vector((0, 0, up * 0.6 + 0.012))
    mid = b + d * length * 0.5 + Vector((0, 0, up * 0.5 - 0.004))
    return [b, m1, tip, m2, mid], [(0, 1, 4), (1, 2, 4), (2, 3, 4), (3, 0, 4)]


LV, LF = [], []
for base, dirn, ln, w, up in (((-0.03, -0.01, 0.19), (-1, -0.3, 0), 0.12, 0.052, 0.03),
                              ((-0.024, -0.008, 0.18), (0.45, 1.0, 0), 0.12, 0.05, 0.045),
                              ((-0.002, -0.004, 0.10), (-0.8, -0.4, 0), 0.07, 0.026, 0.012)):
    v, f = leaf(base, dirn, ln, w, up); o = len(LV); LV += v; LF += [tuple(i + o for i in t) for t in f]
make('sprout_leaves', LV, LF, ['Leaf'], parent=sprout)

# ------------------------------------------------------------------ animation, frames 1-120, seamless loop
def key_rot(o, frame, rx=0.0, ry=0.0, rz=0.0):
    o.rotation_euler = (math.radians(rx), math.radians(ry), math.radians(rz)); o.keyframe_insert('rotation_euler', frame=frame)


aj, op = -P['ajar_deg'], -P['open_deg']
for fr, a in ((1, aj), (14, aj), (36, op), (44, op + 2), (70, op), (88, 1.0), (93, -3.0), (98, 0.0), (110, aj), (120, aj)):
    key_rot(hinge, fr, a)
for fr, (rx, ry, s) in ((1, (0, 0, 1.0)), (16, (6, -9, 1.08)), (31, (0, 0, 0.96)), (46, (-5, 10, 1.12)), (61, (0, 0, 0.97)),
                        (76, (6, -8, 1.06)), (91, (0, 0, 0.95)), (106, (-4, 7, 1.05)), (120, (0, 0, 1.0))):
    key_rot(sprout, fr, rx, ry)
    sprout.scale = (1, 1, s); sprout.keyframe_insert('scale', frame=fr)
sc.frame_set(1)

bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True, export_animation_mode='SCENE',
                          export_anim_scene_split_object=False, export_apply=True)
tris = sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in sc.objects if o.type == 'MESH')
print('wrote', OUT, 'tris', tris)
