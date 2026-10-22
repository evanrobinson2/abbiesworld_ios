"""cedar-whimsical: storybook old cedar (R-03, style B).
python build.py  ->  cedar-whimsical.glb   (Z up, metres, origin at trunk base centre, front = -Y)

Silhouette features, in build order:
 1. plump S-twisting trunk, swept along a spline with taper, twisted flutes and a root flare
 2. wide flat-bottomed crown pad on top (mounded, lighter top)
 3. left mid pad and right mid pad on long bare arms, at offset heights (bonsai tiers)
 4. low pad over a horizontal swing branch on the left (-X)
 5. rope swing hanging from that branch
 6. arched red door between two roots at the front (-Y)
 7. round grass base with bushes, rocks and a stepping-stone path
Animation (frames 1-120, 24 fps, seamless): every pad group sways a few degrees on its own phase,
the swing swings +-22 degrees about its branch.
"""
import bpy, bmesh, math, os, random
from mathutils import Vector, Matrix, Quaternion

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'cedar-whimsical.glb')

P = dict(
    # trunk spline (x, y, z, radius)
    # big S: hard right at the base, back left through the middle, right again into the crown
    trunk=[(0.0, 0.0, -0.1, 2.55), (0.5, 0.0, 1.1, 2.1), (1.8, 0.15, 2.9, 1.55), (2.3, 0.25, 4.5, 1.3),
           (1.3, 0.15, 6.1, 1.12), (-0.7, 0.0, 7.5, 0.98), (-1.2, 0.0, 8.7, 0.82), (-0.3, 0.05, 9.9, 0.66),
           (0.7, 0.1, 11.0, 0.52), (0.9, 0.1, 11.8, 0.42)],
    trunk_sides=14, trunk_rings=30, flutes=5, flute_amp=0.10, twist_turns=1.1,
    root_angles=[15, 140, 218, 322], root_len=1.0, root_r=0.6,
    # pads: name -> (centre, horizontal radius, thickness, puffs, seed, branch path from trunk)
    pads={
        # (centre, radius, puff height, puffs, seed, branch path)
        'crown':  ((0.5, 0.1, 12.5), 5.0, 1.65, 9, 1, [(-0.2, 0.0, 10.0), (0.8, 0.1, 11.0), (0.8, 0.1, 12.0)]),
        'left':   ((-3.7, -0.5, 9.4), 3.0, 1.3, 6, 2, [(-1.1, 0.0, 8.6), (-2.5, -0.3, 8.7), (-3.4, -0.45, 9.0)]),
        'right':  ((3.7, 0.4, 8.3), 3.1, 1.3, 6, 3, [(0.9, 0.1, 6.5), (2.4, 0.3, 7.3), (3.4, 0.4, 7.9)]),
        'back':   ((-0.4, 2.8, 8.9), 2.4, 1.1, 6, 4, [(-0.9, 0.0, 7.9), (-0.6, 1.4, 8.4), (-0.4, 2.6, 8.6)]),
        'swing':  ((-4.7, -0.7, 5.9), 2.0, 1.0, 6, 5, [(1.5, 0.1, 3.8), (-0.3, -0.25, 4.5), (-2.8, -0.55, 4.95),
                                                        (-5.6, -0.8, 5.15)]),
    },
    pad_flat=0.55,          # underside of each puff squashed to a rounded lip
    puff_segs=12, puff_rings=7, light_top=0.5,
    # optional darkening of the palette inputs (1.0 = the GLB holds the true AD palette hex values)
    render_comp=1.0, bark_comp=1.0,
    swing_pivot=(-4.55, -0.72, 5.02), swing_drop=3.7, swing_span=1.05, seat=(1.35, 0.38, 0.08),
    door=(1.05, 1.55), door_y=-2.45,
    ground_r=5.2,
    sway_deg=2.6, crown_sway_deg=1.6, swing_deg=22.0,
)

FR = 120


# ------------------------------------------------------------------ helpers
def lin(c):
    return tuple(x ** 2.2 for x in c)


def mat(name, srgb, rough=0.8, comp=1.0):
    srgb = tuple(x * comp for x in srgb)
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*lin(srgb), 1); b.inputs['Roughness'].default_value = rough
    return m


def obj_from_bm(name, bm, mats, smooth=True, parent=None):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    for m in mats:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = smooth
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    if parent:
        o.parent = parent
    return o


def catmull(pts, n):
    """uniform Catmull-Rom through pts (tuples), n samples total."""
    pts = [Vector(p) for p in pts]
    ext = [pts[0] * 2 - pts[1]] + pts + [pts[-1] * 2 - pts[-2]]
    segs = len(pts) - 1; out = []
    for i in range(n):
        t = i / (n - 1) * segs; k = min(int(t), segs - 1); u = t - k
        p0, p1, p2, p3 = ext[k:k + 4]
        out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return out


def sweep(bm, pts4, rings, sides, flutes=0, amp=0.0, twist=0.0, cap=True, mat_index=0):
    """sweep a ring along a Catmull-Rom spline of (x,y,z,r) with taper; optional twisted flutes."""
    path = catmull(pts4, rings)
    cs = [Vector(p[:3]) for p in path]; rs = [p[3] for p in path]
    t = [(cs[min(i + 1, rings - 1)] - cs[max(i - 1, 0)]).normalized() for i in range(rings)]
    n = t[0].orthogonal().normalized()
    rows = []
    for i in range(rings):
        if i:
            n = t[i - 1].rotation_difference(t[i]) @ n
            n = (n - t[i] * n.dot(t[i])).normalized()
        b = t[i].cross(n); s = i / (rings - 1); row = []
        for j in range(sides):
            a = 2 * math.pi * j / sides
            r = rs[i] * (1 + amp * math.sin(flutes * a + twist * 2 * math.pi * s)) if flutes else rs[i]
            row.append(bm.verts.new(cs[i] + (n * math.cos(a) + b * math.sin(a)) * r))
        rows.append(row)
    for i in range(rings - 1):
        for j in range(sides):
            f = bm.faces.new((rows[i][j], rows[i][(j + 1) % sides], rows[i + 1][(j + 1) % sides], rows[i + 1][j]))
            f.material_index = mat_index
    if cap:
        f = bm.faces.new(rows[-1]); f.material_index = mat_index
    return rows


def puff(bm, c, rx, ry, rz, flat, segs=10, rings=6, rot=0.0):
    """UV-sphere puff, squashed underside (flat-bottomed cloud)."""
    res = bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)
    cr, sr = math.cos(rot), math.sin(rot)
    for v in res['verts']:
        x, y, z = v.co
        if z < 0:
            z *= flat
        x, y = x * rx, y * ry
        v.co = Vector((c[0] + x * cr - y * sr, c[1] + x * sr + y * cr, c[2] + z * rz))


def pad_mesh(name, c, R, h, n, seed, mats, parent):
    """cloud pad: n overlapping flattened UV-sphere puffs of varied size, domed tops and a rounded bulging underside
    lip (no vertical walls), smooth shaded; up-facing faces get LeafLight."""
    rng = random.Random(seed); bm = bmesh.new()
    cx, cy, cz = c; S, G = P['puff_segs'], P['puff_rings']; lip = P['pad_flat']
    a0 = rng.uniform(0, 6.28)
    # big central dome, slightly raised, so the cluster's top is a soft mound
    puff(bm, (cx, cy, cz + 0.2 * h), 0.55 * R, 0.5 * R, h, lip, segs=S, rings=G, rot=a0)
    m = n - 1
    for i in range(m):
        a = a0 + 2 * math.pi * i / m + rng.uniform(-0.2, 0.2)
        rr = R * rng.uniform(0.33, 0.44); d = R - rr * 1.08
        puff(bm, (cx + d * math.cos(a), cy + d * math.sin(a) * 0.92, cz + rng.uniform(-0.12, 0.12) * h),
             rr * 1.1, rr * 0.95, h * rng.uniform(0.62, 0.82), lip, segs=S, rings=G, rot=a)
    bm.normal_update()
    for f in bm.faces:
        f.material_index = 1 if f.normal.z > P['light_top'] else 0
    return obj_from_bm(name, bm, mats, parent=parent)


def keyframe_cycle(obj, fn):
    """fn(phase 0..1) -> euler tuple; keys every 8 frames from 1 to 121 so frame 121 == frame 1."""
    for f in range(1, FR + 2, 8):
        obj.rotation_euler = fn((f - 1) / FR)
        obj.keyframe_insert('rotation_euler', frame=f)


# ------------------------------------------------------------------ build
def build():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.frame_start, sc.frame_end = 1, FR; sc.render.fps = 24

    M = dict(
        bark=mat('Bark', (0x8B / 255, 0x7A / 255, 0x70 / 255), 0.85, P['bark_comp']), bark_dark=mat('BarkDark', (0.42, 0.34, 0.27), 0.9),
        leaf=mat('Leaf', (0x4F / 255, 0x8A / 255, 0x3C / 255), 0.85, P['render_comp']), leaf_light=mat('LeafLight', (0x7D / 255, 0xAF / 255, 0x55 / 255), 0.8, P['render_comp']),
        grass=mat('Grass', (0x5E / 255, 0x9A / 255, 0x3F / 255), 0.9, P['render_comp']), door=mat('RedDoor', (0.52, 0.20, 0.14), 0.75),
        iron=mat('Iron', (0.18, 0.16, 0.15), 0.6), rope=mat('Rope', (0.66, 0.56, 0.36), 0.9),
        seat=mat('SeatWood', (0.50, 0.30, 0.17), 0.8), stone=mat('Stone', (0.62, 0.60, 0.55), 0.9),
    )

    # trunk + roots (static, one mesh)
    bm = bmesh.new()
    sweep(bm, P['trunk'], P['trunk_rings'], P['trunk_sides'], P['flutes'], P['flute_amp'], P['twist_turns'])
    for k, ang in enumerate(P['root_angles']):
        a = math.radians(ang); d = Vector((math.cos(a), math.sin(a), 0))
        L = P['root_len'] * (1.0 + 0.2 * ((k * 7) % 3 - 1))
        p0 = d * 1.5 + Vector((0.4, 0, 1.8)); p1 = d * (2.5 + 0.3 * L) + Vector((0.2, 0, 0.5)); p2 = d * (2.8 + L) + Vector((0, 0, -0.1))
        sweep(bm, [(*p0, P['root_r'] * 1.2), (*p1, P['root_r']), (*p2, 0.12)], 5, 6)
    for v in bm.verts:                       # the leaning base ring dips below ground: flatten it onto the disc bottom
        v.co.z = max(v.co.z, -0.15)
    obj_from_bm('trunk', bm, [M['bark']])

    # door: dark arched recess + red planked door + iron hinges
    w, h = P['door']; y = P['door_y']
    def arch(bm, w, h, y0, depth, mi, segs=8):
        pts = [(-w / 2, 0), (w / 2, 0)] + [((w / 2) * math.cos(math.pi * i / segs), h - w / 2 + (w / 2) * math.sin(math.pi * i / segs)) for i in range(segs + 1)]
        front = [bm.verts.new((x, y0, z)) for x, z in pts]; back = [bm.verts.new((x, y0 + depth, z)) for x, z in pts]
        n = len(pts)
        bm.faces.new(front[::-1]).material_index = mi
        for i in range(n):
            bm.faces.new((front[i], front[(i + 1) % n], back[(i + 1) % n], back[i])).material_index = mi
    bm = bmesh.new()
    arch(bm, w + 0.32, h + 0.22, y - 0.02, 0.6, 0)
    arch(bm, w, h, y - 0.06, 0.12, 1)
    for zz in (0.35, h - 0.55):
        r = bmesh.ops.create_cube(bm, size=1.0)['verts']
        for v in r:
            v.co = Vector((v.co.x * 0.5 - 0.22, v.co.y * 0.03 + y - 0.08, v.co.z * 0.07 + zz))
    knob = bmesh.ops.create_uvsphere(bm, u_segments=6, v_segments=4, radius=0.06)['verts']
    for v in knob:
        v.co += Vector((0.3, y - 0.1, 0.75))
    for f in bm.faces:
        if f.material_index == 0 and len(f.verts) == 8:
            pass
    obj_from_bm('door', bm, [M['bark_dark'], M['door'], M['iron']], smooth=False)
    door = bpy.data.objects['door']
    for p in door.data.polygons:                       # hinges + knob -> Iron
        if abs(p.center.y - (y - 0.08)) < 0.05 and p.center.x < 0.05 and (abs(p.center.z - 0.35) < 0.1 or abs(p.center.z - (h - 0.55)) < 0.1):
            p.material_index = 2
        if (p.center - Vector((0.3, y - 0.1, 0.75))).length < 0.08:
            p.material_index = 2

    # ground disc, bushes, rocks, stepping stones
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=28, radius1=P['ground_r'], radius2=P['ground_r'] - 0.15, depth=0.18)
    for v in bm.verts:
        v.co.z = 0.0 if v.co.z > 0 else -0.18
    obj_from_bm('ground', bm, [M['grass']], smooth=False)
    rng = random.Random(9)
    bm = bmesh.new()
    for ang in (200, 330, 40, 150, 300):
        a = math.radians(ang + rng.uniform(-6, 6)); d = rng.uniform(2.9, 3.4); s = rng.uniform(0.45, 0.7)
        puff(bm, (d * math.cos(a), d * math.sin(a), 0.15), s, s * 0.9, s * 0.85, 0.5, segs=7, rings=4)
    for f in bm.faces:
        f.material_index = 1 if f.normal.z > 0.45 else 0
    obj_from_bm('bushes', bm, [M['leaf'], M['leaf_light']])
    bm = bmesh.new()
    for i, (x, yy, s) in enumerate([(-1.9, -2.6, 0.3), (2.4, -2.2, 0.25), (3.1, 1.4, 0.32), (-2.9, 1.8, 0.22)]):
        r = bmesh.ops.create_icosphere(bm, subdivisions=1, radius=s)['verts']
        for v in r:
            v.co = Vector((v.co.x + x, v.co.y + yy, v.co.z * 0.6 + 0.05))
    for i in range(4):                                  # stepping-stone path from the door
        r = bmesh.ops.create_cone(bm, cap_ends=True, segments=7, radius1=0.32 - 0.02 * i, radius2=0.3 - 0.02 * i, depth=0.06)['verts']
        for v in r:
            v.co += Vector((0.15 * (i % 2) - 0.05, -2.85 - 0.55 * i, 0.03))
    obj_from_bm('rocks_path', bm, [M['stone']], smooth=False)

    # pads, each with its branch, under a sway pivot
    pivots = {}
    for k, (c, R, hh, n, seed, br) in P['pads'].items():
        piv = bpy.data.objects.new(f'sway_{k}', None); sc.collection.objects.link(piv)
        piv.location = br[0]; piv.empty_display_size = 0.5
        pivots[k] = piv
        inv = Vector(br[0])
        bm = bmesh.new()
        rads = [0.5, 0.36, 0.24, 0.16][:len(br)]
        rads[-1] = 0.14
        sweep(bm, [(*(Vector(p) - inv), r) for p, r in zip(br, rads)], 10, 7)
        # two forked twigs into the pad
        end = Vector(br[-1]) - inv; cc = Vector(c) - inv
        for s in (-1, 1):
            tip = cc + Vector((s * R * 0.45, s * 0.25 * R * (1 if k != 'back' else -1), -0.25 * hh))
            mid = (end + tip) / 2 + Vector((0, 0, -0.2))
            sweep(bm, [(*end, 0.14), (*mid, 0.1), (*tip, 0.06)], 5, 5)
        if k == 'swing':
            tip = Vector(br[-1]) - inv
        obj_from_bm(f'branch_{k}', bm, [M['bark']], parent=piv)
        pad = pad_mesh(f'pad_{k}', tuple(Vector(c) - inv), R, hh, n, seed, [M['leaf'], M['leaf_light']], piv)

    # rope swing, hung from the swing branch
    sp = Vector(P['swing_pivot']); spiv = bpy.data.objects.new('swing_pivot', None); sc.collection.objects.link(spiv)
    spiv.location = sp - pivots['swing'].location; spiv.parent = pivots['swing']
    bm = bmesh.new(); half = P['swing_span'] / 2; D = P['swing_drop']
    for x in (-half, half):
        r = bmesh.ops.create_cone(bm, cap_ends=False, segments=6, radius1=0.035, radius2=0.035, depth=D)['verts']
        for v in r:
            v.co += Vector((x, 0, -D / 2))
        k = bmesh.ops.create_uvsphere(bm, u_segments=6, v_segments=4, radius=0.11)['verts']   # knot at branch
        for v in k:
            v.co = Vector((v.co.x + x, v.co.y, v.co.z * 1.4 + 0.02))
    obj_from_bm('swing_ropes', bm, [M['rope']], parent=spiv)
    bm = bmesh.new(); sx, sy, sz = P['seat']
    r = bmesh.ops.create_cube(bm, size=1.0)['verts']
    for v in r:
        v.co = Vector((v.co.x * sx, v.co.y * sy, v.co.z * sz - D))
    bmesh.ops.bevel(bm, geom=[e for e in bm.edges], offset=0.02, segments=1)
    obj_from_bm('swing_seat', bm, [M['seat']], smooth=False, parent=spiv)

    # ---------------------------------------------------------------- animation
    phases = dict(crown=0.0, left=0.23, right=0.51, back=0.71, swing=0.37)
    for k, piv in pivots.items():
        A = math.radians(P['crown_sway_deg'] if k == 'crown' else P['sway_deg']); ph = phases[k]
        keyframe_cycle(piv, lambda t, A=A, ph=ph: (A * math.sin(2 * math.pi * (t + ph)),
                                                   A * 0.7 * math.sin(2 * math.pi * (2 * t + ph)),
                                                   A * 0.4 * math.cos(2 * math.pi * (t + ph))))
    S = math.radians(P['swing_deg'])
    keyframe_cycle(spiv, lambda t: (S * math.sin(2 * math.pi * 2 * t), 0, 0))   # two swings per loop
    for o in bpy.data.objects:
        if o.animation_data and o.animation_data.action:
            for fc in getattr(o.animation_data.action, 'fcurves', []):
                for kp in fc.keyframe_points:
                    kp.interpolation = 'BEZIER'
    sc.frame_set(1)

    bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_animations=True,
                              export_animation_mode='SCENE', export_anim_scene_split_object=False, export_apply=True)
    tris = 0
    dg = bpy.context.evaluated_depsgraph_get()
    for o in sc.objects:
        if o.type == 'MESH':
            m = o.evaluated_get(dg).to_mesh(); m.calc_loop_triangles(); tris += len(m.loop_triangles)
    print('triangles', tris)


if __name__ == '__main__':
    build()
